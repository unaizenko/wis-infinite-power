'use strict';
// Test-only analysis. Input clocks are monotonic milliseconds; counters are
// cumulative COMMITTED game seconds (never requested/registered seconds).
// Windows end at `to`; exact endpoint samples are required. No interpolation.
// backloggedSincePrevious must come from continuous queue/event observation,
// not inference from two positive pending samples. Unknown => no capacity claim.
function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
function quantile(values, fraction) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}
// Fixed absolute seconds tolerance; never scale it with balances/counter sizes.
const LEDGER_EPSILON_SECONDS = 1e-7;
const IDENTITY_KEYS = ['build', 'saveSha256', 'device', 'slowdown', 'workload'];
function identityFieldValid(key, value) {
  if (key === 'slowdown') return finite(value) && value > 0;
  if (key === 'saveSha256') return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
  return typeof value === 'string' && value.trim().length > 0;
}
function inspectLedger(samples, diagnostics, failures) {
  const valid = s => finite(s.registeredGameSeconds) && s.registeredGameSeconds >= 0 && Number.isSafeInteger(s.externalDebtChangeCount) && s.externalDebtChangeCount >= 0 && ((typeof s.generation === 'string' && s.generation.length > 0) || (Number.isSafeInteger(s.generation) && s.generation >= 0));
  for (const s of samples) {
    if ([s.pendingGameSeconds, s.completedGameSeconds, s.registeredGameSeconds].some(v => finite(v) && Math.abs(v) * Number.EPSILON > LEDGER_EPSILON_SECONDS / 8)) diagnostics.push('ledger-number-resolution-insufficient');
    if (['registeredGameSeconds', 'externalDebtChangeCount', 'generation'].some(k => s[k] === undefined)) diagnostics.push('missing-ledger-evidence');
    else if (!valid(s)) failures.push('invalid-ledger-evidence');
  }
  const anchor = samples[0];
  const check = (start, end) => {
    if (!valid(start) || !valid(end)) return;
    if (end.registeredGameSeconds < start.registeredGameSeconds) failures.push('registered-counter-decreased');
    if (end.externalDebtChangeCount !== start.externalDebtChangeCount) failures.push('external-debt-change');
    if (end.generation !== start.generation) failures.push('generation-changed');
    const residual = (end.pendingGameSeconds - start.pendingGameSeconds) - (end.registeredGameSeconds - start.registeredGameSeconds) + (end.completedGameSeconds - start.completedGameSeconds);
    if (Math.abs(residual) > LEDGER_EPSILON_SECONDS) failures.push('ledger-conservation-violation');
  };
  for (let n = 1; n < samples.length; n++) {
    check(samples[n - 1], samples[n]);
    // Also bound cumulative drift: per-interval epsilon cannot accumulate debt loss.
    check(anchor, samples[n]);
  }
}
function inspectRun(input) {
  const diagnostics = [], failures = [];
  if (!finite(input.from) || !finite(input.to) || input.to <= input.from) throw Error('invalid measurement window');
  if (!Array.isArray(input.samples)) throw Error('missing samples');
  let previous;
  for (const sample of input.samples) {
    if (!finite(sample.at) || !finite(sample.completedGameSeconds) || sample.completedGameSeconds < 0 || !finite(sample.pendingGameSeconds) || sample.pendingGameSeconds < 0 || (previous && (sample.at <= previous.at || sample.completedGameSeconds < previous.completedGameSeconds))) throw Error('invalid sample or committed counter');
    previous = sample;
  }
  const samples = input.samples.filter(s => s.at >= input.from && s.at <= input.to);
  inspectLedger(samples, diagnostics, failures);
  for (const key of IDENTITY_KEYS) if (!identityFieldValid(key, input.identity?.[key])) diagnostics.push('missing-or-invalid-identity:' + key);
  if (input.complete !== true || (input.droppedHosts ?? 0) !== 0 || (input.droppedAttempts ?? 0) !== 0) diagnostics.push('incomplete-measurement');
  const windows = [5, 30, 60].map(wallSeconds => {
    const from = input.to - wallSeconds * 1000, to = input.to;
    const rows = samples.filter(s => s.at >= from && s.at <= to);
    if (!rows.length || rows[0].at !== from || rows.at(-1).at !== to) {
      diagnostics.push('missing-exact-' + wallSeconds + 's-window');
      return {wallSeconds, from, to, available: false, serviceRate: null, saturatedCapacity: null};
    }
    const start = rows[0], end = rows.at(-1);
    const gameSeconds = end.completedGameSeconds - start.completedGameSeconds;
    const saturated = rows.slice(1).every(s => s.backloggedSincePrevious === true) && rows.every(s => s.pendingGameSeconds > 0);
    return {wallSeconds, from, to, available: true, gameSeconds, serviceRate: gameSeconds / wallSeconds,
      saturatedCapacity: saturated ? gameSeconds / wallSeconds : null,
      classification: saturated ? 'saturated' : (rows.some(s => s.pendingGameSeconds === 0) ? 'demand-limited-or-mixed' : 'saturation-unproven'),
      pendingSlope: (end.pendingGameSeconds - start.pendingGameSeconds) / wallSeconds,
      observedPeakDebtSeconds: Math.max(...rows.map(s => s.pendingGameSeconds)),
      maxSampleGapMs: Math.max(...rows.slice(1).map((s, i) => s.at - rows[i].at)), sampleCount: rows.length};
  });
  const durations = [];
  if (!Array.isArray(input.hosts)) diagnostics.push('missing-hosts');
  for (const host of input.hosts || []) {
    if (host.parent === undefined) diagnostics.push('missing-host-parent');
    if (host.parent !== null) continue; // nested hosts must never inflate statistics
    if (!finite(host.startedAt) || (host.finishedAt != null && (!finite(host.finishedAt) || host.finishedAt < host.startedAt))) throw Error('invalid host');
    if (host.startedAt >= input.to || (host.finishedAt != null && host.finishedAt <= input.from)) continue;
    if (host.finishedAt == null) { diagnostics.push('open-host'); continue; }
    if (host.startedAt < input.from || host.finishedAt > input.to) diagnostics.push('cross-window-host');
    // Entire host duration, including crossing hosts: do not clip long tasks.
    durations.push(host.finishedAt - host.startedAt);
  }
  const hosts = {count: durations.length, p99Ms: quantile(durations, 0.99), maxMs: durations.length ? Math.max(...durations) : null};
  if (!durations.length) diagnostics.push('missing-top-level-hosts');
  if (hosts.p99Ms > 16) failures.push('host-p99-over-16ms');
  if (hosts.maxMs > 50) failures.push('host-max-over-50ms');
  const pre = input.environment?.preflight, aa = input.environment?.aaRelativeDifference;
  if (!pre || !finite(pre.from) || !finite(pre.to) || pre.to - pre.from !== 60000 || pre.to !== input.from || !finite(pre.cpuMean) || pre.cpuMean < 0 || pre.cpuMean > 10 || !finite(pre.cpuP95) || pre.cpuP95 < 0 || pre.cpuP95 > 15) diagnostics.push('cpu-preflight-not-qualified');
  if (!finite(aa) || aa < 0 || aa > 0.05) diagnostics.push('aa-not-qualified');
  return {windows, hosts, diagnostics, failures, samples};
}
function inspectRecovery(input, samples, diagnostics, failures) {
  const settings = input.recovery;
  if (!settings) { diagnostics.push('missing-recovery'); return null; }
  if (!finite(settings.disturbanceEndAt) || settings.disturbanceEndAt < input.from || settings.disturbanceEndAt >= input.to || !finite(settings.clearThresholdSeconds) || settings.clearThresholdSeconds < 0) throw Error('invalid recovery window');
  const rows = samples.filter(s => s.at >= settings.disturbanceEndAt);
    const clock = input.clockEvidence;
  const clockValid = clock && finite(clock.resolutionMs) && clock.resolutionMs >= 0 && clock.resolutionMs <= 2 && finite(clock.maxUnregisteredAgeMs) && clock.maxUnregisteredAgeMs >= 0 && clock.maxUnregisteredAgeMs <= 250;
  if (!clock || clock.resolutionMs === undefined || clock.maxUnregisteredAgeMs === undefined) diagnostics.push('missing-recovery-clock-evidence');
  else if (!clockValid) failures.push('invalid-recovery-clock-evidence');
  for (const s of rows) {
    if (s.registeredThroughAt === undefined) diagnostics.push('missing-recovery-clock-evidence');
    else if (!finite(s.registeredThroughAt)) failures.push('invalid-recovery-clock-evidence');
    else {
      if (s.registeredThroughAt > s.at) failures.push('recovery-clock-coverage-future');
      if (clockValid && s.at - s.registeredThroughAt > clock.maxUnregisteredAgeMs) failures.push('recovery-clock-coverage-stale');
    }
  }
  for (let n = 1; n < rows.length; n++) {
    for (const start of [rows[n - 1], rows[0]]) {
      const end = rows[n];
      if (!finite(start.registeredThroughAt) || !finite(end.registeredThroughAt)) continue;
      if (end.registeredThroughAt < start.registeredThroughAt) failures.push('recovery-clock-coverage-reversed');
      // Coverage is the actual timestamp captured by the registration event,
      // mapped once into this monotonic clock, not the observer's later timestamp.
      // Bound both interval and total drift; clock resolution never changes ledger epsilon.
      if (clockValid && finite(start.registeredGameSeconds) && finite(end.registeredGameSeconds) && Math.abs((end.registeredGameSeconds - start.registeredGameSeconds) - (end.registeredThroughAt - start.registeredThroughAt) / 1000) > clock.resolutionMs / 1000 + LEDGER_EPSILON_SECONDS) failures.push('recovery-clock-not-1x');
    }
  }
  const observedPeakDebtSeconds = samples.length ? Math.max(...samples.map(s => s.pendingGameSeconds)) : null;
  const result = {observedPeakDebtSeconds, peakIsSampledLowerBound: true, clearAfterSeconds: null, clearingTimeMeaning: 'first observed crossing bracket; unobserved clears/rebounds are unknown', pendingSlope: null};
  if (!rows.length || rows[0].at !== settings.disturbanceEndAt) { diagnostics.push('missing-recovery-start-sample'); return result; }
  if (rows[0].pendingGameSeconds <= settings.clearThresholdSeconds) { diagnostics.push('no-post-disturbance-debt'); return result; }
  const index = rows.findIndex(s => s.pendingGameSeconds <= settings.clearThresholdSeconds);
  const last = index < 0 ? rows.at(-1) : rows[index];
  if (last.at > rows[0].at) result.pendingSlope = (last.pendingGameSeconds - rows[0].pendingGameSeconds) / ((last.at - rows[0].at) / 1000);
  if (index < 0) failures.push('recovery-not-cleared');
  else {
    result.clearAfterSeconds = {lowerExclusive: (rows[index - 1].at - settings.disturbanceEndAt) / 1000, upperInclusive: (last.at - settings.disturbanceEndAt) / 1000};
    if (rows.slice(index + 1).some(s => s.pendingGameSeconds > settings.clearThresholdSeconds)) failures.push('recovery-rebounded');
  }
  return result;
}
/**
 * analyzeOnlineThroughput({from,to,complete,samples,hosts,environment,recovery,capacityRun?})
 * environment: {preflight:{from,to,cpuMean,cpuP95},aaRelativeDifference}.
 * CPU values are percent; A/A is relative fraction. Preflight ends at run start.
 * capacityRun is an independently qualified run with continuously queued work;
 * it uses the same input schema except recovery/capacityRun. No idle-rate inference.
 * A formal pass needs both runs' coverage/CPU/A-A/host evidence, 1.5x capacity
 * in all three windows, and observed recovery. 2x is reported as a stretch target.
 * Recovery additionally requires clockEvidence:{resolutionMs,maxUnregisteredAgeMs}
 * and registeredThroughAt on each sample. Translate each actual registration
 * timestamp to the same monotonic clock as `at` using a stable clock-origin mapping;
 * never substitute the observation timestamp or derive coverage from counter totals.
 * resolutionMs is explicit (0..2); maxUnregisteredAgeMs is explicit (0..250).
 * Coverage must not reverse or exceed observation time; age may not exceed that
 * bound. Compare registered deltas to covered deltas (including cumulative drift),
 * allowing clock resolution ONLY here, never in debt conservation. This accepts
 * normal ~100ms registration batches while rejecting stopped/accelerated clocks.
 * Each sample also requires registeredGameSeconds, externalDebtChangeCount,
 * generation. Counters are local cumulative committed/registered event totals;
 * record registration events independently of observer callbacks. Count EVERY external debt edit (even offsetting edits) and change
 * generation on import/reset/session replacement; never infer these from pending.
 * Seed capacity debt before the first sample. Counter totals must stay small enough
 * to resolve 1e-7 seconds: a fixed absolute conservation tolerance, not relative.
 * Both runs require identity:{build,saveSha256,device,slowdown,workload}; use actual
 * build/source fingerprint, original save SHA256, device/browser config, slowdown
 * factor and workload scenario fingerprint. Independent capacity must match all.
 * Explicit contradictions fail even when other evidence is missing; missing-only
 * evidence is diagnostic. Caller must collect event evidence, not fabricate it.
 * This does not certify numerical equivalence, whole-page longtasks, or devices.
 */
function analyzeOnlineThroughput(input) {
  const run = inspectRun(input), {diagnostics, failures} = run;
  const recovery = inspectRecovery(input, run.samples, diagnostics, failures);
  const capacity = input.capacityRun ? inspectRun(input.capacityRun) : run;
  if (capacity !== run) {
    for (const key of IDENTITY_KEYS) {
      const a = input.identity?.[key], b = input.capacityRun.identity?.[key];
      if (identityFieldValid(key, a) && identityFieldValid(key, b) && a !== b) failures.push('capacity-identity-mismatch:' + key);
    }
    diagnostics.push(...capacity.diagnostics.map(s => 'capacity:' + s));
    failures.push(...capacity.failures.map(s => 'capacity:' + s));
  }
  const rates = capacity.windows.map(w => w.saturatedCapacity);
  if (rates.some(r => r === null)) diagnostics.push('saturated-capacity-unproven');
  if (rates.some(r => r !== null && r < 1.5)) failures.push('capacity-below-1.5');
  return {status: failures.length ? 'fail' : diagnostics.length ? 'diagnostic' : 'pass',
    diagnostics: [...new Set(diagnostics)], failures: [...new Set(failures)],
    windows: run.windows, hosts: run.hosts, recovery,
    capacity: {windows: capacity.windows, hosts: capacity.hosts, minimumTarget: 1.5, stretchTarget: 2,
      minimumObservedRate: rates.every(finite) ? Math.min(...rates) : null,
      stretchTargetMet: rates.every(r => finite(r) && r >= 2)}};
}
module.exports = {analyzeOnlineThroughput};




