'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const helper = require('node:path').join(__dirname, 'helpers/online-throughput-metrics.cjs');
test('throughput analyzer exists', () => assert.ok(fs.existsSync(helper), 'missing throughput analyzer'));
const analyze = input => require(helper).analyzeOnlineThroughput(input);
function fixture(saturated = false) {
  return {from: 60000, to: 120000, complete: true, clockEvidence: {resolutionMs: 1, maxUnregisteredAgeMs: 150}, identity: {build: 'test-build', saveSha256: 'a'.repeat(64), device: 'test-device', slowdown: 4, workload: 'online-exact'},
    samples: Array.from({length: 61}, (_, i) => ({at: 60000 + i * 1000, registeredThroughAt: 60000 + i * 1000, registeredGameSeconds: i, externalDebtChangeCount: 0, generation: 'test-session', completedGameSeconds: i * (saturated ? 2 : 1), pendingGameSeconds: saturated ? 200 - i : 0, backloggedSincePrevious: saturated})),
    hosts: [{parent: null, startedAt: 70000, finishedAt: 70008, ms: 8}, {parent: 1, startedAt: 70001, finishedAt: 70007, ms: 6}],
    environment: {preflight: {from: 0, to: 60000, cpuMean: 10, cpuP95: 15}, aaRelativeDifference: 0.05}};
}
test('empty queue reports observed service, never saturated capacity', () => {
  const r = analyze(fixture());
  assert.deepEqual(r.windows.map(w => w.serviceRate), [1, 1, 1]);
  assert.deepEqual(r.windows.map(w => w.saturatedCapacity), [null, null, null]);
  assert.equal(r.status, 'diagnostic');
});
test('saturated counters provide actual 5/30/60 second work and pending slope', () => {
  const r = analyze(fixture(true));
  assert.deepEqual(r.windows.map(w => [w.gameSeconds, w.wallSeconds, w.saturatedCapacity, w.pendingSlope]), [[10, 5, 2, -1], [60, 30, 2, -1], [120, 60, 2, -1]]);
  assert.equal(r.hosts.count, 1);
  assert.equal(r.hosts.p99Ms, 8);
  assert.equal(r.hosts.maxMs, 8);
});
test('missing exact window endpoints cannot be interpolated or accepted', () => {
  const input = fixture(true); input.samples[55].at += 40;
  const r = analyze(input);
  assert.equal(r.windows[0].available, false);
  assert.equal(r.status, 'diagnostic');
});
test('positive sampled debt alone is not continuous saturation evidence', () => {
  const input = fixture(true); delete input.samples[20].backloggedSincePrevious;
  assert.equal(analyze(input).windows[2].saturatedCapacity, null);
});
test('recovery gives observed peak and interval-censored clearing time', () => {
  const input = fixture();
  for (const s of input.samples) { const t = (s.at - 60000) / 1000; s.pendingGameSeconds = t < 10 ? t * 0.8 : Math.max(0, 8 - (t - 10)); s.completedGameSeconds = t - s.pendingGameSeconds; }
  input.recovery = {disturbanceEndAt: 71000, clearThresholdSeconds: 0};
  const r = analyze(input);
  assert.equal(r.recovery.observedPeakDebtSeconds, 8);
  assert.deepEqual(r.recovery.clearAfterSeconds, {lowerExclusive: 6, upperInclusive: 7});
  assert.equal(r.recovery.pendingSlope, -1);
});
test('complete recovery plus independent saturated run permits formal pass', () => {
  const input = fixture();
  for (const s of input.samples) { const t = (s.at - 60000) / 1000; s.pendingGameSeconds = Math.max(0, 10 - t); s.completedGameSeconds = t + Math.min(t, 10); }
  input.recovery = {disturbanceEndAt: 60000, clearThresholdSeconds: 0};
  input.capacityRun = fixture(true);
  assert.equal(analyze(input).status, 'pass');
});
test('CPU, A/A, recovery or complete measurement omissions force diagnostic', () => {
  for (const mutate of [i => delete i.environment, i => i.environment.preflight.from = 1, i => i.environment.preflight.to = 60001, i => i.environment.preflight.cpuMean = 10.01, i => i.environment.preflight.cpuP95 = 15.01, i => i.environment.aaRelativeDifference = 0.051, i => i.complete = false, i => i.hosts = [], i => delete i.recovery]) {
    const i = fixture(); i.capacityRun = fixture(true); i.recovery = {disturbanceEndAt: 60000, clearThresholdSeconds: 0};
    for (const s of i.samples) { const t = (s.at - 60000) / 1000; s.pendingGameSeconds = Math.max(0, 10 - t); s.completedGameSeconds = t + Math.min(t, 10); }
    assert.equal(analyze(i).status, 'pass'); mutate(i);
    assert.equal(analyze(i).status, 'diagnostic');
  }
});
test('top-level host p99 16ms and max 50ms limits cannot be relaxed', () => {
  for (const duration of [16.01, 50.01]) {
    const i = fixture(true); i.hosts[0].finishedAt = i.hosts[0].startedAt + duration; i.hosts[0].ms = duration;
    assert.ok(analyze(i).failures.some(x => x.startsWith('host-')));
  }
});
test('crossing/open hosts, dropped data and invalid counters cannot create pass', () => {
  const i = fixture(true); i.hosts.push({parent: null, startedAt: 59900, finishedAt: 60100, ms: 200});
  assert.ok(analyze(i).diagnostics.includes('cross-window-host'));
  assert.ok(analyze(i).failures.includes('host-max-over-50ms'));
  const bad = fixture(); bad.samples[3].completedGameSeconds = -1;
  assert.throws(() => analyze(bad), /counter|sample/);
  bad.samples[3].completedGameSeconds = 3; bad.samples[3].at = bad.samples[2].at;
  assert.throws(() => analyze(bad), /sample/);
});
test('unrecovered debt and insufficient saturated capacity are explicit failures', () => {
  const i = fixture(true); i.recovery = {disturbanceEndAt: 60000, clearThresholdSeconds: 0};
  for (const s of i.samples) s.completedGameSeconds /= 2;
  const r = analyze(i);
  assert.ok(r.failures.includes('capacity-below-1.5'));
  assert.ok(r.failures.includes('recovery-not-cleared'));
});

test('declared drops and missing parent metadata prevent false complete measurements', () => {
  for (const mutate of [i => i.droppedHosts = 1, i => i.droppedAttempts = 1, i => i.hosts.push({startedAt: 70000, finishedAt: 70200})]) {
    const i = fixture(true); mutate(i);
    assert.ok(analyze(i).diagnostics.some(s => /incomplete|parent/.test(s)));
  }
});
test('preflight aggregates must cover precisely the immediately preceding 60 seconds', () => {
  const i = fixture(true); i.environment.preflight.from = -60000;
  assert.ok(analyze(i).diagnostics.includes('cpu-preflight-not-qualified'));
});


function genuineRecovery() {
  const input = fixture();
  for (const s of input.samples) { const t = (s.at - 60000) / 1000; s.pendingGameSeconds = Math.max(0, 10 - t); s.completedGameSeconds = t + Math.min(t, 10); }
  input.recovery = {disturbanceEndAt: 60000, clearThresholdSeconds: 0};
  input.capacityRun = fixture(true);
  return input;
}
test('clearing pending with zero committed work is an explicit ledger failure', () => {
  const i = genuineRecovery(); for (const s of i.samples) s.completedGameSeconds = 0;
  const r = analyze(i);
  assert.equal(r.status, 'fail'); assert.ok(r.failures.includes('ledger-conservation-violation'));
});
test('honest ledger with paused clock is not real-time recovery', () => {
  const i = genuineRecovery();
  for (const s of i.samples) { s.registeredGameSeconds = 0; s.completedGameSeconds = Math.min((s.at - 60000) / 1000, 10); }
  const r = analyze(i); assert.equal(r.status, 'fail'); assert.ok(r.failures.includes('recovery-clock-not-1x'));
});
test('missing ledger or generation evidence cannot pass', () => {
  for (const key of ['registeredGameSeconds', 'externalDebtChangeCount', 'generation']) {
    const i = genuineRecovery(); delete i.samples[4][key];
    const r = analyze(i); assert.equal(r.status, 'diagnostic'); assert.ok(r.diagnostics.includes('missing-ledger-evidence'));
  }
});
test('external debt edits and lifecycle replacement are explicit failures', () => {
  for (const [key, value, code] of [['externalDebtChangeCount', 1, 'external-debt-change'], ['generation', 'new-session', 'generation-changed']]) {
    const i = genuineRecovery(); for (const s of i.samples.slice(4)) s[key] = value;
    const r = analyze(i); assert.equal(r.status, 'fail'); assert.ok(r.failures.includes(code));
  }
});
test('independent capacity run must bind all workload identity dimensions', () => {
  for (const key of ['build', 'saveSha256', 'device', 'slowdown', 'workload']) {
    const missing = genuineRecovery(); delete missing.capacityRun.identity[key];
    assert.equal(analyze(missing).status, 'diagnostic');
    const other = genuineRecovery(); other.capacityRun.identity[key] = key === 'slowdown' ? 1 : 'b'.repeat(64);
    const r = analyze(other); assert.equal(r.status, 'fail'); assert.ok(r.failures.includes('capacity-identity-mismatch:' + key));
  }
});
test('fixed small tolerance accepts floating arithmetic but rejects accumulating lost debt', () => {
  const normal = genuineRecovery(); normal.samples[5].pendingGameSeconds += 1e-10;
  assert.equal(analyze(normal).status, 'pass');
  const bad = genuineRecovery();
  for (let n = 0; n < bad.samples.length; n++) bad.samples[n].completedGameSeconds += n * 5e-8;
  assert.ok(analyze(bad).failures.includes('ledger-conservation-violation'));
});
test('capacity counters must conserve the same measured ledger', () => {
  const i = genuineRecovery(); for (const s of i.capacityRun.samples) s.registeredGameSeconds = 0;
  const r = analyze(i); assert.equal(r.status, 'fail'); assert.ok(r.failures.includes('capacity:ledger-conservation-violation'));
});

test('debt magnitudes without sub-epsilon Number resolution cannot certify conservation', () => {
  const i = genuineRecovery();
  for (const s of i.capacityRun.samples) s.pendingGameSeconds += 1e16;
  const r = analyze(i); assert.notEqual(r.status, 'pass');
  assert.ok(r.diagnostics.includes('capacity:ledger-number-resolution-insufficient'));
});

test('normal 100ms batch registration uses covered clock, not observation time', () => {
  const i = genuineRecovery();
  const baseCovered = 59980;
  for (let n = 0; n < i.samples.length; n++) {
    const s = i.samples[n];
    // Sampling tasks observe alternating positions within the normal tick batch.
    s.registeredThroughAt = s.at - (n % 2 ? 80 : 20);
    s.registeredGameSeconds = (s.registeredThroughAt - baseCovered) / 1000;
    s.completedGameSeconds = s.registeredGameSeconds + 10 - s.pendingGameSeconds;
  }
  const r = analyze(i); assert.equal(r.status, 'pass');
});
test('clock coverage evidence is required even with plausible registered deltas', () => {
  for (const mutate of [i => delete i.clockEvidence, i => delete i.samples[5].registeredThroughAt]) {
    const i = genuineRecovery(); mutate(i);
    assert.equal(analyze(i).status, 'diagnostic');
  }
});
test('stopped registration fails when uncovered real time exceeds the bounded age', () => {
  const i = genuineRecovery();
  for (const s of i.samples) { s.registeredThroughAt = 60000; s.registeredGameSeconds = 0; s.completedGameSeconds = 10 - s.pendingGameSeconds; }
  const r = analyze(i); assert.equal(r.status, 'fail'); assert.ok(r.failures.includes('recovery-clock-coverage-stale'));
});
test('coverage cannot go backwards, into the future, or hide faster registration', () => {
  for (const [mutate, reason] of [
    [i => i.samples[5].registeredThroughAt = i.samples[4].registeredThroughAt - 1, 'recovery-clock-coverage-reversed'],
    [i => i.samples[5].registeredThroughAt = i.samples[5].at + 1, 'recovery-clock-coverage-future'],
    [i => { i.samples[5].registeredGameSeconds += 0.01; i.samples[5].completedGameSeconds += 0.01; }, 'recovery-clock-not-1x']
  ]) {
    const i = genuineRecovery(); mutate(i); assert.ok(analyze(i).failures.includes(reason));
  }
});
test('clock evidence tolerances cannot be omitted or widened beyond hard limits', () => {
  for (const mutate of [i => delete i.clockEvidence.resolutionMs, i => i.clockEvidence.resolutionMs = 2.01, i => i.clockEvidence.maxUnregisteredAgeMs = 250.01]) {
    const i = genuineRecovery(); mutate(i); assert.notEqual(analyze(i).status, 'pass');
  }
});
