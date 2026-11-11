'use strict';
// Regression for the public offline queue: one frozen start profile, real treasure
// redemption, no intra-session feedback. Load current sources in Worker order so
// a stale generated bundle cannot conceal a production-source regression.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.WIS_GAME_ROOT || path.resolve(__dirname, '..');
const outputDirectory = process.env.WIS_FROZEN_TREASURE_RESULTS || process.env.FIXED_RESULTS;
const output = outputDirectory ? path.join(outputDirectory, 'frozen-offline-treasure.json') : null;
const results = [];
function load() {
  const metadata = { window: { WIS: { Simulation: {} } } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/simulation/offline-worker-bundle.js'), 'utf8'), metadata);
  const scripts = metadata.window.WIS.Simulation.OfflineWorkerBundle.scripts;
  const box = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval };
  box.self = box; box.window = box; box.document = Object.freeze({ hidden: false });
  vm.createContext(box);
  for (const file of scripts) if (file !== 'js/simulation/offline-worker-entry.js')
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), box, { filename: file });
  return box.WIS;
}
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(W, kind) {
  const s = W.Core.State.fresh(), B = W.Core.BigNum, P = W.Meta.TreasureProgress;
  s.core.runtime.randomState = 0x19283746;
  s.runningLevel = 10; s.rockLevel = 10;
  s.joules = B.ZERO; s.power = B.ZERO;
  Object.assign(s.unlockedAchievements, { powerOne: true, scale2: true, scale3: true, scale5: true, scale8: true, scale9: true });
  s.scaleUpgradeAutomationEnabled = true; s.scaleActionAutomationEnabled = true;
  s.scaleFitnessAutomationEnabled = true; s.scaleRockAutomationEnabled = true;
  P.ensure(s);
  if (kind === 'ordinary') {
    // Both treasures cross their first boundary and change next-session income.
    W.Meta.TreasureLedger.write(s, 'fitnessMembershipCard', ['199']);
    W.Meta.TreasureLedger.write(s, 'skyCrystal', ['199']);
  }
  if (kind === 'origin') {
    s.cultivation.active = 'immortal';
    const x = W.Cultivation.Xiuzhen.get(s);
    Object.assign(x, { entered: true, realm: 10, highestRealm: 10 });
    Object.assign(x.abilities, { emptyGate: true, virtualOrigin: true, originBody: true, mergeHeaven: true });
    x.resources.yuanForce.amount = B.BN('1e48');
    x.resources.nieForce.amount = B.BN('1e8');
    x.resources.universeCoefficient.amount = B.BN('1e4');
  }
  if (kind === 'high-pending') {
    // Existing high-layer credit and a known tiny carry must survive redemption.
    W.Meta.TreasureLedger.write(s,'skyCrystal',['ee100']);
    s.meta.treasureProgressPending.skyCrystal = [
      { units: ['1'], gain: '0.125', award: '2' },
      { units: ['0.125'], gain: '0.001', award: '3' }
    ];
    W.Meta.TreasureLedger.write(s,'superLollipop',['1e-500']);
  }
  return s;
}
function expectedTreasure(W, start, profile, seconds) {
  const next = W.Core.State.cloneForSimulation(start), B = W.Core.BigNum, P = W.Meta.TreasureProgress;
  W.Core.Runtime.withState(next, () => W.Core.Effects.withIsolatedState(next, () => {
    for (const row of profile.rewards) if (row.eligible && (B.gt(row.units, 0) || P.hasUnsettled(next, row.key)))
      P.advanceFixed(next, row.key, B.mul(row.units, seconds), row);
  }));
  return next;
}
function checkTreasure(W, actual, expected) {
  const L = W.Meta.TreasureLedger;
  // Save deliberately strips diagnostic-only receipt fields. Compare the same
  // public persistence representation while retaining exact raw ledger checks.
  const status = state => W.Core.Save.envelope(state, false, { offlineRecoveryOverride: null }).data.meta.treasureProgressStatus || {};
  const actualStatus = status(actual), expectedStatus = status(expected);
  for (const key of W.Meta.Treasures.keys) {
    assert.equal(L.compare(L.stock(actual, key), L.stock(expected, key)), 0, key + ': frozen inventory');
    assert.equal(L.compare(L.progress(actual, key), L.progress(expected, key)), 0, key + ': frozen progress, including low carry');
    assert.deepEqual(plain(actual.meta.treasureProgressPending[key] || []), plain(expected.meta.treasureProgressPending[key] || []), key + ': pending contexts');
    assert.deepEqual(plain(actualStatus[key] || null), plain(expectedStatus[key] || null), key + ': persisted precision receipt');
  }
}
async function integration(kind, seconds) {
  const W = load(), { State: S, BigNum: B, Runtime: R } = W.Core;
  let automationCalls = 0;
  const automation = W.Simulation.Automation;
  W.Simulation.Automation = { ...automation, create(...args) {
    const instance = automation.create(...args);
    return { ...instance, runAchievementAutomations(...values) {
      automationCalls++; return instance.runAchievementAutomations(...values);
    } };
  } };
  const input = fixture(W, kind);
  let checkpoints = 0;
  const engine = W.Simulation.OfflineHeadless.create({ domain: S.toSerializable(input) }, {
    checkpoint() { checkpoints++; }, async yield() { await new Promise(resolve => setTimeout(resolve, 0)); }
  });
  const start = S.cloneForSimulation(engine.getState());
  const profile = W.Simulation.FixedSources.query(start);
  const expected = expectedTreasure(W, start, profile, seconds);
  const changedKey = kind === 'origin' ? 'originImprint' : kind === 'high-pending' ? 'skyCrystal' : 'fitnessMembershipCard';
  assert(B.gt(expected.meta.treasures[changedKey], start.meta.treasures[changedKey]), 'fixture must actually award ' + changedKey);
  const probe = S.cloneForSimulation(start);
  probe.meta.treasures = { ...expected.meta.treasures };
  const nextProfile = W.Simulation.FixedSources.query(probe);
  const affected = kind === 'origin' ? 'universeCoefficient' : kind === 'high-pending' ? 'power' : 'joules';
  assert(B.gt(nextProfile.rates[affected], profile.rates[affected]), 'new treasure must affect a future ' + affected + ' rate');
  const original = W.Simulation.FixedSources;
  let queries = 0, enteredQueries = 0, completionQueries = 0;
  W.Simulation.FixedSources = { ...original, query(...args) {
    const offlinePending = engine.offline.getPendingCatchUpSeconds() > 1e-10;
    enteredQueries++;
    const profile = original.query(...args);
    if (offlinePending) {
      queries++;
      // Fail quickly on the old path instead of replaying 86400 seconds.
      assert.equal(queries, 1, 'offline must query one start profile; a second query feeds new effects into this session');
    } else completionQueries++; // The completed state may publish the next online rate.
    return profile;
  } };
  const began = performance.now();
  engine.offline.appendCatchUpTask(seconds, seconds, { source: 'offline', randomMode: 'state', speed: 1, sealed: true, presentation: 'blocking' });
  await engine.offline.simulateOfflineProgress(0, 0);
  const elapsedMs = performance.now() - began;
  assert.equal(queries, 1, 'exactly one production FixedSources.query for ' + seconds + ' seconds');
  assert.equal(engine.offline.getPendingCatchUpSeconds(), 0, 'entire offline task commits; pause=' + JSON.stringify(engine.offline.getCatchUpPauseReason()));
  assert.equal(automationCalls, 0, 'offline must not invoke achievement/purchase automation');
  assert.equal(completionQueries, 1, 'completed state republishes online rates once');
  const actual = engine.getState();
  for (const key of W.Simulation.ResourceGroups.keys) {
    const wanted = B.add(W.Simulation.ResourceGroups.read(start, key), B.mul(profile.rates[key], seconds));
    assert(B.eq(W.Simulation.ResourceGroups.read(actual, key), wanted), key + ': resource gain is start rate * seconds');
  }
  checkTreasure(W, actual, expected);
  assert.equal(actual.core.runtime.randomState, start.core.runtime.randomState, 'treasure redemption does not consume RNG');
  assert.equal(actual.totalElapsedSeconds, start.totalElapsedSeconds + seconds, 'exact committed game time');
  if (kind === 'high-pending') {
    assert.equal(actual.meta.treasureProgressStatus.skyCrystal.code, 'closed-form-batch');
    assert(B.eq(actual.meta.treasureProgressResidual.skyCrystal,0));assert.equal(Object.hasOwn(actual.meta.treasureProgressResidualTail,'skyCrystal'),false);assert.equal(Object.hasOwn(actual.meta.treasureStockResidual,'skyCrystal'),false);
    assert.equal(actual.meta.treasureProgressPending.skyCrystal.length, 0);
    assert(B.gt(W.Meta.TreasureLedger.value(W.Meta.TreasureLedger.progress(actual, 'skyCrystal')), 0), 'known residual progress remains after high batch');
    assert(actual.meta.treasureBatch.superLollipop, 'ordinary Decimal remainder retained');
  }
  const envelope = W.Core.Save.envelope(actual, false), restored = W.Core.Save.prepare(plain(envelope)).state;
  checkTreasure(W, restored, actual);
  assert.equal(restored.core.runtime.randomState, actual.core.runtime.randomState, 'save roundtrip preserves RNG');
  assert.equal(restored.totalElapsedSeconds, actual.totalElapsedSeconds, 'save roundtrip preserves time');
  assert.equal(engine.offline.getPersistenceSnapshot(), null, 'no recovery debt after commit');
  return { queries, enteredQueries, completionQueries, automationCalls, checkpoints, elapsedMs, awarded: String(B.sub(actual.meta.treasures[changedKey], start.meta.treasures[changedKey])) };
}
function directBoundaries() {
  const W = load(), { State: S, Runtime: R, Effects: E, BigNum: B } = W.Core;
  const P = W.Meta.TreasureProgress, L = W.Meta.TreasureLedger;
  const s = S.fresh(); P.ensure(s);
  const originalRng = s.core.runtime.randomState;
  // Frozen source cap: starting demand 200 must remain the gain even as cost rises.
  const input = { eligible: true, gain: B.BN(200), award: B.ONE };
  const units = B.BN('1e6'), expectedBatches = P.affordable('fitnessMembershipCard', 0, units.mul(200), 1);
  R.withState(s, () => E.withIsolatedState(s, () => P.advanceFixed(s, 'fitnessMembershipCard', units, input)));
  assert(B.eq(s.meta.treasures.fitnessMembershipCard, expectedBatches));
  assert.equal(s.core.runtime.randomState, originalRng);
  const high = S.fresh(); P.ensure(high);
  L.write(high,'skyCrystal',['ee100']);
  R.withState(high, () => E.withIsolatedState(high, () => P.advanceFixed(high, 'skyCrystal', 0, { eligible: true, gain: 0, award: 1 })));
  assert(B.gt(high.meta.treasures.skyCrystal, 0));
  assert(L.sign(L.progress(high,'skyCrystal'))>=0,'closed high batch has nonnegative Decimal remainder');
  const before = JSON.stringify(S.toSerializable(high));
  R.withState(high, () => E.withIsolatedState(high, () => P.advanceFixed(high, 'skyCrystal', 0, { eligible: true, gain: 0, award: 1 })));
  assert.equal(JSON.stringify(S.toSerializable(high)), before, 'settling twice does not double-pay');
  return { frozenCapBatches: String(expectedBatches), highStatus: high.meta.treasureProgressStatus.skyCrystal.code };
}
(async () => {
  const cases = [ ['direct frozen-cap and high-layer carry', directBoundaries],
    ...[['ordinary', 60], ['ordinary', 86400], ['origin', 60], ['high-pending', 60]].map(([kind, seconds]) => [kind + ' offline ' + seconds + 's', () => integration(kind, seconds)]) ];
  for (const [name, run] of cases) {
    try { const details = await run(); results.push({ name, passed: true, ...details }); console.log('PASS ' + name, JSON.stringify(details)); }
    catch (error) { results.push({ name, passed: false, message: error.message, stack: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
  }
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ at: new Date().toISOString(), root, results }, null, 2) + '\n');
  }
  if (results.some(row => !row.passed)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
