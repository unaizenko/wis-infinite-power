"use strict";

// Production-chain acceptance/benchmark. No gain function or probability
// function is replaced. Treasure rolls can be disabled for the deterministic
// resource comparison so inventory randomness does not mask integration error.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { performance } = require("node:perf_hooks");

const root = path.resolve(process.env.WIS_BENCH_ROOT || path.join(__dirname, "../../../WIS-无限战力系统"));
global.window = global;
window.confirm = () => true;
global.document = { hidden: false, addEventListener() {} };
const load = (relative) => {
  const filename = path.join(root, relative);
  // Explicit historical benchmark roots predate the optional batch module.
  // Do not alter the frozen baseline or mask missing current production files.
  if (relative === "js/simulation/discrete-batch.js" && process.env.WIS_BENCH_ROOT && !fs.existsSync(filename)) return;
  if (relative === "js/simulation/compensation.js" && !fs.existsSync(filename)) return;
  if (relative === "js/cultivation/exploration-progress.js" && !fs.existsSync(filename)) return;
  if (relative === "js/vendor/break_eternity.min.js") {
    global.Decimal = require(filename);
    return;
  }
  vm.runInThisContext(fs.readFileSync(filename, "utf8"), { filename });
};
(process.env.WIS_TEST_PRODUCTION_ASSEMBLY === "1" ? (()=>{const c={window:{WIS:{Simulation:{}}}};vm.runInNewContext(fs.readFileSync(path.join(root,"js/simulation/offline-worker-bundle.js"),"utf8"),c);return c.window.WIS.Simulation.OfflineWorkerBundle.scripts.filter(f=>!f.endsWith("offline-worker-entry.js"));})() : [
  "js/vendor/break_eternity.min.js", "js/core/namespace.js", "js/core/bignum.js",
  "js/core/config.js", "js/core/registry.js", "js/core/formulas.js", "js/core/penalties.js",
  "js/core/integration.js", "js/core/runtime.js", "js/core/probability.js", "js/simulation/compensation.js", "js/core/state.js",
  "js/core/resources.js", "js/core/effects.js", "js/core/sources.js", "js/core/reset.js",
  "js/meta/treasures.js", "js/cultivation/exploration-progress.js", "js/cultivation/immortal-logic.js", "js/cultivation/immortal.js",
  "js/power/scale-logic.js", "js/power/scale.js", "js/meta/challenges.js", "js/meta/achievements.js",
  "js/simulation/automation.js", "js/simulation/step.js",
    "js/simulation/offline.js"
]).forEach(load);

const B = WIS.Core.BigNum;
const Scale = WIS.Power.ScaleLogic;
const Immortal = WIS.Cultivation.ImmortalLogic;
const Achievements = WIS.Meta.Achievements;
const resources = ["joules", "power", "mana", "immortalPower"];
const earnedFields = ["lifetimeTotalJ", "lifetimeTotalPower", "lifetimeTotalMana", "lifetimeTotalImmortalPower"];
let state;
const noop = () => {};
// Call the public production helper; never extract executable function text.
function updateLifetimeStatistics() {
  return WIS.Core.State.updateLifetimeStatistics(WIS.Core.Runtime.getState(), Immortal.cultivationRealmLevel());
}
const lifetimeStatisticsMetadata = {source:'Core.State.updateLifetimeStatistics', exactProductionFunction:true};
const setStateDirect = (next) => { state = next; WIS.Core.Effects.invalidate(); };
WIS.Core.Runtime.bind({
  state: () => state, setState: setStateDirect,
  save: noop, render: noop, switchPage: noop, showNotice: noop, showAchievementNotice: noop,
  achievementStates: Achievements.states, notifyNewAchievements: noop,
  cultivationUnlocked: Achievements.cultivationUnlocked, treasuresUnlocked: Achievements.treasuresUnlocked,
  upgradesUnlocked: Achievements.upgradesUnlocked, format: String,
  freshState: WIS.Core.State.fresh, updateLifetimeStatistics,
  checkActiveChallengeCompletion: WIS.Meta.Challenges.checkActiveChallengeCompletion,
  resetTransientAccumulators: noop, resetCultivationPage: noop,
  celestialDeclineExponent: Immortal.celestialDeclineExponent,
  applyResourceSoftcapProgressive: Scale.applyResourceSoftcapProgressive
});
WIS.Core.Resources.bind(() => state);

function initialState(kind = "high") {
  state = WIS.Core.State.fresh();
  state.powerSystem.active = "scale";
  state.cultivation.active = "immortal";
  Object.assign(state, {
    joules: B.BN("1e120"), power: B.BN("1e120"), highestPower: B.BN("1e120"),
    mana: B.BN("1e30"), immortalPower: B.BN("1e20"),
    highestScaleIndex: 14, lifetimeHighestScaleIndex: 14,
    qiRefiningUnlocked: true, foundationUnlocked: true, goldenCoreUnlocked: true,
    advancedRealmLevel: 9, immortalSpiritPowerUnlocked: true,
    runningLevel: 100, rockLevel: 100, focusPurchased: true,
    killingIntentPurchased: true, supernaturalFirePurchased: true,
    exercisePurchased: true, transcendentPurchased: true, intuitionPurchased: true,
    waterPurchased: true, carbonLimitPurchased: true, naturalStrengthPurchased: true,
    circulationUnlocked: true, auraControlUnlocked: true,
    immortalRealmDivineAbilityUnlocked: true, lawUnlocked: true,
    spiritCaptureReturnUnlocked: true, trinityUnlocked: true,
    scaleUpgradeAutomationEnabled: false, scaleActionAutomationEnabled: false,
    scaleFitnessAutomationEnabled: false, scaleRockAutomationEnabled: false,
    immortalAbilityAutomationEnabled: false, immortalRealmAutomationEnabled: false
  });
  state.challengeCompletions.solarPower = 1;
  // This is an already-unlocked save, avoiding a first-tick achievement reward
  // transition while retaining the actual production achievement multipliers.
  Achievements.recordCurrent();
  if (kind === "dense") {
    Object.assign(state, {
      advancedRealmLevel: 4, roamSpiritWorldUnlocked: true,
      power: B.BN("1e65"), highestPower: B.BN("1e65"), joules: B.BN("1e65"),
      mana: B.BN("1e20"), immortalPower: B.ZERO, immortalSpiritPowerUnlocked: false,
      descendRealmUnlocked: true, heavenlyTreasureLevel: 3, mysticHeavenlyTreasureLevel: 3,
      naturalTreasureLevel: 100, demonRealmJourneyUnlocked: true
    });
    state.treasureImprints.phantomHeavenMirror = B.BN(1100);
    state.unlockedAchievements.seizeFoundation = true;
  }
  if (kind === "extreme") {
    state.joules = B.BN("1e10000");
    state.power = B.BN("1e10000");
    state.highestPower = state.power;
    state.mana = B.BN("1e10000");
    state.immortalPower = B.BN("1e10000");
  }
  if (kind === "coupled") {
    state.joules = B.BN("1e70");
    state.power = B.BN("1e30");
    state.highestPower = state.power;
    state.mana = B.BN("1e22");
    state.immortalPower = B.BN("1e3");
  }
  earnedFields.forEach((key) => { state[key] = B.ZERO; });
  return WIS.Core.State.toSerializable(state);
}

const automationFlagKeys = ["scaleUpgradeAutomationEnabled", "scaleFitnessAutomationEnabled", "scaleRockAutomationEnabled",
  "immortalAbilityAutomationEnabled", "immortalRealmAutomationEnabled"];

function automationSnapshot(source = state) {
  return {
    flags: Object.fromEntries(automationFlagKeys.map((key) => [key, source[key]])),
    levels: { runningLevel: source.runningLevel, rockLevel: source.rockLevel,
      gymPurchased: source.gymPurchased, qiSpellLevel: source.qiSpellLevel,
      advancedRealmLevel: source.advancedRealmLevel, currentQiLayer: source.currentQiLayer },
    histories: JSON.parse(JSON.stringify({ scale: source.powerSystem.systems.scale.history,
      immortal: source.cultivation.systems.immortal.history }))
  };
}

function automationState(serialized) {
  setStateDirect(WIS.Core.State.normalizeDomain(serialized));
  for (const key of automationFlagKeys) state[key] = true;
  Object.assign(state, { runningLevel: 1, rockLevel: 1, gymPurchased: false, qiSpellLevel: 0 });
  Object.assign(state.unlockedAchievements, { scale6: true, trueScale7: true, infantSpirit: true, bodyIntegration: true });
  state.powerSystem.systems.scale.history.manualUpgrades.gymPurchased = true;
  state.cultivation.systems.immortal.history.manualAbilities.qiSpellLevel = true;
  state.cultivation.systems.immortal.history.manualRealmLevel = Math.max(8,
    state.cultivation.systems.immortal.history.manualRealmLevel);
  return WIS.Core.State.toSerializable(state);
}

function createSimulation(serialized, { treasures = false, seed = 0.123456789, seedSequence = false, checkpoint, yieldToHost, setLastTickAt } = {}) {
  setStateDirect(WIS.Core.State.normalizeDomain(serialized));
  WIS.Power.Scale.resetTransient();
  WIS.Cultivation.Immortal.resetTransient();
  const metrics = { realSteps: 0, projectedSteps: 0, treasureProjectedSteps: 0,
    knownCalls: 0, eventCalls: 0, adaptiveCalls: 0, planningTimeouts: 0, yields: 0,
    automationCalls: { scale: 0, immortalAbility: 0, immortalRealm: 0 },
    automationChanges: { scale: 0, immortalAbility: 0, immortalRealm: 0 } };
  const trackedAutomation = (key, operation) => () => {
    const result = operation();
    if (!WIS.Core.Runtime.isProjection()) {
      metrics.automationCalls[key] += 1;
      metrics.automationChanges[key] += Math.max(0, Number(result) || 0);
    }
    return result;
  };
  const autoBreakthroughImmortalRealms = trackedAutomation("immortalRealm", Immortal.autoBreakthroughImmortalRealms);
  const autoUpgradeImmortalAbilities = trackedAutomation("immortalAbility", Immortal.autoUpgradeImmortalAbilities);
  const autoUpgradeEnhancements = trackedAutomation("scale", Scale.autoUpgradeEnhancements);
  const gains = [B.ZERO, B.ZERO, B.ZERO, B.ZERO];
  const common = { getState: () => state, setStateDirect, epsilon: 1e-10,
    simulationStepSeconds: 0.1, boundaryBisections: 16, maxDiscreteEventsPerStep: 128 };
  const automation = WIS.Simulation.Automation.create({
    autoBreakthroughImmortalRealms, autoUpgradeImmortalAbilities, autoUpgradeEnhancements
  });
  const step = WIS.Simulation.Step.create({
    ...common, persistStateNow: noop, updateLifetimeStatistics,
    recordCurrentAchievements: Achievements.recordCurrent, markAchievementsDirty: noop,
    markCostGroupsDirty: noop, checkActiveChallengeCompletion: WIS.Meta.Challenges.checkActiveChallengeCompletion,
    autoBreakthroughImmortalRealms,
    runAchievementAutomations: automation.runAchievementAutomations,
    showScaleNotice: noop, scaleRequirement: Scale.scaleRequirement
  });
  function advanceGameStep(seconds, silent, options = {}) {
    if (WIS.Core.Runtime.isTreasurePrediction()) metrics.treasureProjectedSteps += 1;
    else if (options.projection || WIS.Core.Runtime.isProjection()) metrics.projectedSteps += 1;
    else metrics.realSteps += 1;
    const result = step.advanceGameStep(seconds, silent, { ...options, skipTreasureRolls: !treasures || options.skipTreasureRolls });
    if (!options.projection && !WIS.Core.Runtime.isProjection() &&
        (result.resourceGains || result.processedSeconds > 0)) {
      ["joulesPerSecond", "powerPerSecond", "manaPerSecond", "immortalPowerPerSecond"].forEach((key, index) => {
        gains[index] = B.add(gains[index], result.resourceGains?.[resources[index]] ??
          B.mul(WIS.tmp.rates[key], result.processedSeconds));
      });
    }
    return result;
  }
  const recordSignature = (record, keys) => keys.map((key) => record?.[key] ?? 0).join("|");
  const stateFlagSignature = (keys, source) => keys.map((key) => source[key]).join("|");
  const treasureContext = { ...common, advanceGameStep, recordSignature,
    treasuresUnlocked: Achievements.treasuresUnlocked, hasAchievement: Achievements.hasCurrent };
  for (const key of ["fitnessMembershipCardChance", "superLollipopChance", "skyCrystalChance", "fiveSpiritStoneChance",
    "cosmicFiberAvailable", "cosmicFiberChance", "cosmicWillAvailable", "cosmicWillChance", "fitnessJBonus",
    "rockPowerPerSecond", "ultimateIntentPowerSource"]) treasureContext[key] = Scale[key];
  for (const key of ["tianNiPearlChance", "mysteriousGreenBottleChance", "fuBaoChance", "naturalTreasureUpgradeChance",
    "naturalTreasureLevelCap", "xuTianDingChance", "baLingChiChance", "wanYaoFanChance", "phantomHeavenMirrorChance",
    "mysticHeavenSacredTreeChance", "mysticHeavenSpiritSlayingSwordChance", "immortalCrystalChance",
    "fiveElementsTreasureChance", "immortalTreasureChanceMultiplier", "automaticExplorationAmountPerSecond",
    "circulationManaPerSecond", "immortalPowerPerSecond"]) treasureContext[key] = Immortal[key];
  // Historical numeric/event planners are retired. Current Offline owns
  // deterministic progress and its RNG/task record; this harness exposes no model.
  const events = {};
  const countPlanning = (key,fn)=>(...args)=>{metrics[key]++;return fn(...args);};
  function snapshotState({borrow = false} = {}) {
    return { domain: borrow ? {core:state.core,powerSystem:state.powerSystem,cultivation:state.cultivation,meta:state.meta} : WIS.Core.State.toSerializable(state),
      powerTransient: WIS.Power.Scale.snapshotTreasureTransient(),
      cultivationTransient: WIS.Cultivation.Immortal.snapshotTreasureTransient() };
  }
  function restoreState(snapshot) {
    // Current production rolls back a domain checkpoint without save-import
    // normalization. The frozen historical code root has no lightweight clone.
    const restoreDomain = WIS.Core.State.cloneForSimulation || WIS.Core.State.normalizeDomain;
    setStateDirect(restoreDomain(snapshot.domain));
    WIS.Power.Scale.restoreTreasureTransient(snapshot.powerTransient);
    WIS.Cultivation.Immortal.restoreTreasureTransient(snapshot.cultivationTransient);
  }
  const offlineContext = {
    planOfflineMacro:step.planOfflineMacro,
    prepareFixedWork:step.prepareFixedWork,
    prepareOnlineWork:step.prepareOnlineWork,
    onlineMetrics:step.onlineMetrics,
    restoreOnlineMetrics:step.restoreOnlineMetrics,
    ...common, advanceGameStep,
    calculateAutomaticStepPlan: step.calculateAutomaticStepPlan,
    projectStepTimes: step.projectStepTimes,
    nextKnownSimulationBoundarySeconds: countPlanning("knownCalls", step.nextKnownSimulationBoundarySeconds),
    beginTransaction: step.beginTransaction, endTransaction: step.endTransaction,
    achievementStates: Achievements.states, recordCurrentAchievements: Achievements.recordCurrent,
    notifyNewAchievements: noop, markAchievementsDirty: noop, showNotice: noop,
    requestRender: noop, formatElapsedTime: String, format: String,
    setLastTickAt: noop, resetOnlineAccumulators: noop, snapshotState, restoreState
  };
  for (const key of ["fitnessMembershipCardCount", "superLollipopCount", "skyCrystalCount", "fiveSpiritStoneCount",
    "cosmicFiberCount", "cosmicWillCount"]) offlineContext[key] = Scale[key];
  for (const key of ["tianNiPearlCount", "baLingChiCount", "phantomHeavenMirrorCount",
    "mysticHeavenSacredTreeCount", "mysticHeavenSpiritSlayingSwordCount"]) offlineContext[key] = Immortal[key];
  if(checkpoint) offlineContext.checkpoint=checkpoint;
  if(setLastTickAt) offlineContext.setLastTickAt=setLastTickAt;
  if(yieldToHost) offlineContext.yieldToHost=yieldToHost;
  const offline = WIS.Simulation.Offline.create(offlineContext);
  return { metrics, gains, advanceGameStep, step, events, offline, snapshotState, restoreState,
    automationSnapshot: () => automationSnapshot(state) };
}

function resultSnapshot(sim, wallMs, extra = {}) {
  return { wallMs: Number(wallMs.toFixed(3)), ...sim.metrics, ...extra,
    gains: sim.gains.map(String),
    resources: resources.map((key) => state[key].toString()),
    treasureCounts: Object.fromEntries(WIS.Meta.Treasures.keys.map((key) => [key, String(state.treasureImprints[key])])) };
}
async function offlineRun(initial, seconds, options) {
  const sim = createSimulation(initial, options);
  const initialClock = Number(state.totalElapsedSeconds) || 0;
  const start = performance.now();
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = (...args) => { sim.metrics.yields += 1; return originalSetTimeout(...args); };
  try {
    await sim.offline.simulateOfflineProgress(seconds, seconds);
  } finally {
    window.setTimeout = originalSetTimeout;
  }
  assert.equal(sim.offline.getCatchUpStatus().phase, "completed");
  assert.equal(sim.offline.getPendingCatchUpSeconds(), 0);
  assert.ok(Math.abs(state.totalElapsedSeconds - initialClock - seconds) <= 1e-7, "原始离线时间必须完整结算");
  const status = sim.offline.getCatchUpStatus();
  return { ...resultSnapshot(sim, performance.now() - start, { status }),
    gains: status.cumulativeResourceGains.map(String) };
}
function onlineTimeline(initial, endpoints, stepSeconds, options) {
  const sim = createSimulation(initial, options);
  const start = performance.now();
  const output = {};
  let elapsed = 0;
  let tickRemaining = stepSeconds;
  for (const endpoint of endpoints) {
    while (endpoint - elapsed > 1e-9) {
      const remaining = endpoint - elapsed;
      const requested = remaining + 1e-10 >= tickRemaining ? tickRemaining : remaining;
      const result = options?.offlineExecution
        ? WIS.Core.Runtime.withOfflineExecution(() => sim.advanceGameStep(requested, true))
        : sim.advanceGameStep(requested, true);
      const processed = Math.max(0, Math.min(requested, Number(result.processedSeconds) || 0));
      assert.ok(processed > 0 || result.eventCommitted, "线上参考计算不得停滞");
      elapsed += processed;
      tickRemaining -= processed;
      if (tickRemaining <= 1e-10) tickRemaining = stepSeconds;
      state.totalElapsedSeconds += processed;
      Achievements.recordCurrent();
    }
    output[endpoint] = resultSnapshot(sim, performance.now() - start);
  }
  return output;
}
function gainErrors(actual, expected) {
  return actual.gains.map((value, index) => B.eq(expected.gains[index], B.ZERO)
    ? (B.eq(value, B.ZERO) ? 0 : Infinity)
    : B.toNumber(B.div(B.abs(B.sub(value, expected.gains[index])), B.abs(expected.gains[index])), Infinity));
}

async function discreteQuick(initial, kind) {
  const started = performance.now();
  const check = async (source, seconds) => {
    const reference = onlineTimeline(source, [seconds], 0.1, { offlineExecution: true })[seconds];
    const actual = await offlineRun(source, seconds);
    assert.equal(actual.status.executionReference, "online-fixed-tick");
    const exactReplay = actual.status.discreteMetrics.batches === 0;
    const comparisons = reference.gains.map((expected, index) => WIS.Simulation.Accuracy.compare(
      actual.gains[index], expected, { relativeTolerance: 0.05, absoluteTolerance: "1e-8", exactReplay }));
    assert.ok(comparisons.every(result => result.pass && result.verified),
      `固定0.1秒离散参考的整段原资源误差不能认证或超过5%: ${JSON.stringify(comparisons)}`);
    if (exactReplay) {
      assert.ok(actual.gains.every((value, index) => B.eq(value, reference.gains[index])),
        "无认证批量近似时应逐项精确匹配固定逻辑tick的累计收益，不以5%容限遮蔽差异");
      assert.ok(actual.resources.every((value, index) => B.eq(value, reference.resources[index])),
        "固定逻辑tick必须精确匹配实际库存");
      assert.deepEqual(actual.treasureCounts, reference.treasureCounts);
    }
    assert.ok(performance.now() - started < 15000, "快速实际链验收超过15秒上限");
    return { reference, actual, exactReplay, comparisons };
  };
  const checks = {};
  for (const seconds of [1, 5]) checks[seconds] = await check(initial, seconds);
  const extreme = await check(initialState("extreme"), 1);
  assert.ok(extreme.reference.gains.every(gain => B.gt(gain, B.ZERO)),
    "极高资源下的微小正累计收益必须保留");
  const denseSim = createSimulation(initialState("dense"), { treasures: true });
  const before = JSON.stringify(denseSim.snapshotState());
  const task = { random: denseSim.events.createOfflineTaskRandom(0.123456789) };
  const beforeRandom = task.random.snapshot();
  const event = denseSim.events.nextEffectiveTreasureEventSeconds(task, 10, 0.1, { deadlineMs: Infinity });
  assert.equal(event?.dense, true, "真实密集宝物必须可被识别");
  assert.equal(JSON.stringify(denseSim.snapshotState()), before, "预测不得改变资源、宝物或瞬态累加器");
  assert.equal(task.random.snapshot(), beforeRandom, "预测不得消耗任务RNG");
  console.log(JSON.stringify({ referenceRule: "online-fixed-0.1-second-endpoint-with-player-automation-settings",
    sampleSource: "unchanged-synthetic-fixtures", kind, wallMs: performance.now() - started,
    checks, extreme, predictionIsolation: true }, null, 2));
}

async function main() {
  const mode = process.env.WIS_BENCH_MODE || "quick";
  const kind = process.env.WIS_BENCH_STATE || "coupled";
  const initial = initialState(kind);
  if (mode === "quick") {
    await discreteQuick(initial, kind);
    return;
  }
  if (mode === "probe") {
    const sim = createSimulation(initial, { treasures: process.env.WIS_BENCH_TREASURES === "1" });
    const start = performance.now();
    sim.advanceGameStep(0.1, true);
    console.log(JSON.stringify(resultSnapshot(sim, performance.now() - start), null, 2));
    return;
  }
  // Retained historical benchmark only. Its refined continuous-time reference
  // describes the old integration experiment, not acceptance of the current
  // explicit 0.1-second game rule. It is never run by the default quick suite.
  process.stderr.write("LEGACY CONTINUOUS-REFERENCE DIAGNOSTIC: not current discrete-rule acceptance\n");
  const endpoints = mode === "full" ? [59.9, 60, 60.1, 600] : [5];
  const offlineGainTolerance = 0.01;
  const directStepGainTolerance = 0.006;
  const online = onlineTimeline(initial, endpoints, 0.1);
  const acceptance = require("./offline-adaptive-acceptance.test.js");
  const report = { root, productionChains: ["Scale.calculateAutomaticGains", "Immortal.planAutomaticGain", "Simulation.Step"], online, references: {}, offline: {}, stepComparison: {} };
  for (const seconds of endpoints) {
    const reference = acceptance.convergedReference({
      kind: process.env.WIS_BENCH_STATE || "coupled", seconds, wallLimitMs: 20000
    }, root);
    assert.ok(reference.converged, `${seconds}s的整段参考必须经步长收敛，0.1秒不是绝对真值`);
    report.references[seconds] = reference;
    const result = await offlineRun(initial, seconds);
    result.relativeGainErrors = gainErrors(result, reference.reference);
    result.mixedGainChecks = result.gains.map((gain, index) => B.lte(
      B.abs(B.sub(gain, reference.reference.gains[index])),
      B.add(B.mul(B.abs(reference.reference.gains[index]), offlineGainTolerance), B.BN("1e-8"))));
    report.offline[seconds] = result;
    if (mode === "full") process.stderr.write(`offline ${seconds}s: ${result.wallMs}ms, ${result.realSteps} steps, error ${Math.max(...result.relativeGainErrors)}\n`);
  }
  for (const step of [0.25, 1]) {
    const endpoint = endpoints[Math.min(1, endpoints.length - 1)];
    const result = onlineTimeline(initial, [endpoint], step)[endpoint];
    result.relativeGainErrors = gainErrors(result, online[endpoint]);
    report.stepComparison[step] = result;
  }
  const denseSim = createSimulation(initialState("dense"), { treasures: true });
  const beforePrediction = JSON.stringify(denseSim.snapshotState());
  const task = { random: denseSim.events.createOfflineTaskRandom(0.123456789) };
  const beforeRandom = task.random.snapshot();
  const denseEvent = denseSim.events.nextEffectiveTreasureEventSeconds(task, 10, 0.1, { deadlineMs: Infinity });
  assert.equal(denseEvent?.dense, true, "实际自动探寻高密度掉宝必须识别为批量事件");
  assert.equal(JSON.stringify(denseSim.snapshotState()), beforePrediction,
    "真实预测必须恢复所有资源、库存及瞬态累积器");
  assert.equal(task.random.snapshot(), beforeRandom, "预测不得消费结算任务随机状态");
  report.predictionIsolation = { passed: true, dense: true, predictedSteps: denseSim.metrics.treasureProjectedSteps };
  const extremeInitial = initialState("extreme");
  const extremeConvergence = acceptance.convergedReference({ kind: "extreme", seconds: 1, wallLimitMs: 15000 }, root);
  assert.ok(extremeConvergence.converged, "极高资源参考必须通过独立求积细化检查");
  const extremeReference = extremeConvergence.reference;
  const extremeOffline = await offlineRun(extremeInitial, 1);
  extremeOffline.relativeGainErrors = gainErrors(extremeOffline, extremeReference);
  assert.ok(extremeReference.gains.every((gain) => B.gt(gain, B.ZERO)),
    "1e10000资源状态下，各实际来源的正收益必须保留，包括Number下限以下的增量");
  assert.ok(extremeOffline.gains.every((gain, index) => B.lte(B.abs(B.sub(gain, extremeReference.gains[index])),
    B.add(B.mul(B.abs(extremeReference.gains[index]), offlineGainTolerance), B.BN("1e-8")))),
    `高资源1秒离线新增收益误差超限: ${extremeOffline.relativeGainErrors}`);
  report.extremeResourceCheck = extremeOffline;
  report.tolerances = { offlineNewResourceGain: offlineGainTolerance, directStepNewResourceGain: directStepGainTolerance };
  console.log(JSON.stringify(report, null, 2));
  for (const [seconds, result] of Object.entries(report.offline)) {
    assert.ok(result.mixedGainChecks.every(Boolean),
      `${seconds}s 离线整段新增收益超出1%与1e-8绝对误差结合的容限: ${result.relativeGainErrors}`);
  }
  for (const [step, result] of Object.entries(report.stepComparison)) {
    assert.ok(result.relativeGainErrors.every((error) => error <= directStepGainTolerance),
      `${step}s 直接步长新增收益超出0.6%强反馈容限: ${result.relativeGainErrors}`);
  }
}
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { initialState, automationState, automationSnapshot, automationFlagKeys, lifetimeStatisticsMetadata,
  createSimulation, offlineRun, onlineTimeline, gainErrors };
