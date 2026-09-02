"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
window.confirm = () => true;
const root = path.resolve(__dirname, "..");
const load = (relativePath) => vm.runInThisContext(
  fs.readFileSync(path.join(root, relativePath), "utf8"),
  { filename: path.join(root, relativePath) }
);

[
  "js/vendor/break_eternity.min.js", "js/core/namespace.js", "js/core/bignum.js",
  "js/core/config.js", "js/core/registry.js",
  "js/core/formulas.js", "js/core/runtime.js", "js/core/state.js",
  "js/core/resources.js", "js/core/effects.js", "js/core/sources.js",
  "js/core/reset.js"
].forEach(load);

WIS.Meta.Achievements = Object.freeze({
  has: (state, key) => state.unlockedAchievements?.[key] === true,
  record: () => {}
});
WIS.Meta.Treasures = Object.freeze({
  keys: Object.freeze([]),
  add: () => 0
});
let state = WIS.Core.State.fresh();
WIS.Core.Runtime.bind({
  state: () => state,
  setState: (nextState) => { state = nextState; },
  save: () => {}, render: () => {}, showNotice: () => {},
  achievementStates: () => ({}), notifyNewAchievements: () => {},
  cultivationUnlocked: () => true, treasuresUnlocked: () => true,
  format: String, freshState: () => WIS.Core.State.fresh(),
  updateLifetimeStatistics: () => {}, checkActiveChallengeCompletion: () => false,
  resetTransientAccumulators: () => {}, resetCultivationPage: () => {},
  celestialDeclineExponent: () => 1
});
WIS.Core.Resources.bind(() => state);

load("js/cultivation/immortal-logic.js");
load("js/cultivation/immortal.js");
load("js/power/scale-logic.js");
load("js/power/scale.js");
load("js/meta/challenges.js");

let probeProviderCalls = 0;
let probeValueCalls = 0;
WIS.Core.Effects.register("performanceProbe", () => {
  probeProviderCalls += 1;
  return [{
    id: "performanceProbeValue", target: "joules", layer: "regionMultiplier",
    value: () => { probeValueCalls += 1; return 2; }
  }];
});

WIS.Core.Effects.beginTick(state);
for (let index = 0; index < 20; index += 1) {
  WIS.Core.Effects.value("performanceProbeValue", state);
  WIS.Core.Effects.values("joules", "regionMultiplier", state);
  WIS.Core.Effects.product("joules", "regionMultiplier", state);
  WIS.Core.Effects.groups("joules", "regionMultiplier", state);
}
assert.equal(probeProviderCalls, 1, "同 tick 每个 Effects provider 只能执行一次");
assert.equal(probeValueCalls, 1, "同 tick 普通 Effect 值只能解析一次");

Object.assign(state, {
  joules: 1e10,
  power: 1e10,
  highestPower: 1e10,
  mana: 1e10,
  immortalPower: 1e10,
  exercisePurchased: true,
  transcendentPurchased: true,
  lawUnlocked: true,
  spiritCaptureReturnUnlocked: true
});
state.powerSystem.active = "scale";
state.cultivation.active = "immortal";
WIS.Core.Effects.beginTick(state);
WIS.Core.Effects.resetStatistics();
const liveEffectBefore = {
  joules: WIS.Core.Effects.value("exercise", state),
  power: WIS.Core.Effects.value("transcendent", state),
  mana: WIS.Core.Effects.value("lawImmortalPower", state),
  immortalPower: WIS.Core.Effects.value("spiritCaptureReturn", state)
};
const liveProviderCalls = WIS.Core.Effects.getStatistics().providerCalls;
Object.assign(state, {
  joules: 1e100,
  power: 1e100,
  highestPower: 1e100,
  mana: 1e100,
  immortalPower: 1e100
});
const liveEffectAfter = {
  joules: WIS.Core.Effects.value("exercise", state),
  power: WIS.Core.Effects.value("transcendent", state),
  mana: WIS.Core.Effects.value("lawImmortalPower", state),
  immortalPower: WIS.Core.Effects.value("spiritCaptureReturn", state)
};
Object.keys(liveEffectBefore).forEach((resource) => {
  assert.ok(liveEffectAfter[resource] > liveEffectBefore[resource],
    `同 tick ${resource} 实时 Effect 未随当前资源刷新`);
});
assert.equal(WIS.Core.Effects.getStatistics().providerCalls, liveProviderCalls,
  "同 tick 实时 Effect 刷新不得重建 provider 快照");

let dynamicRateEvaluations = 0;
state.activeChallenge = "planetSuppression";
const { ZERO, ONE, add, mul, log10, gte, isFiniteBN } = WIS.Core.BigNum;
const boundedGain = WIS.Power.ScaleLogic.applyResourceSoftcapDynamicRateOverTime(
  (amount) => { dynamicRateEvaluations += 1; return mul("1e120", add(ONE, log10(add(ONE, amount)))); },
  0.1,
  1
);
assert.ok(isFiniteBN(boundedGain) && gte(boundedGain, ZERO));
assert.ok(dynamicRateEvaluations <= 32,
  `动态软上限单 tick 求值次数超限：${dynamicRateEvaluations}`);

Object.assign(state, {
  joules: 1e120,
  power: 1e120,
  highestPower: 1e120,
  goldenCoreUnlocked: true,
  advancedRealmLevel: 9,
  focusPurchased: true,
  rockLevel: 100,
  transcendentPurchased: true,
  intuitionPurchased: true,
  continentCollapsePurchased: true,
  spaceQuakePurchased: true,
  selfSuppressionPurchased: true
});
state.powerSystem.active = "scale";
state.cultivation.active = "immortal";
WIS.Core.Effects.beginTick(state);
WIS.Core.Effects.resetStatistics();
const update = WIS.Power.Scale.update(state, 0.1);
const effectStatsAfterUpdate = WIS.Core.Effects.getStatistics();
const providerCallsAfterUpdate = probeProviderCalls;
for (let index = 0; index < 50; index += 1) {
  void WIS.tmp.rates.joulesPerSecond;
  void WIS.tmp.rates.powerPerSecond;
  WIS.Core.Effects.product("power", "regionMultiplier", state);
}
assert.equal(probeProviderCalls, providerCallsAfterUpdate,
  "收益/UI读取不得重新执行 Effects provider");
assert.equal(WIS.tmp.rates.joulesPerSecond, update.rates.joulesPerSecond);
assert.equal(WIS.tmp.rates.powerPerSecond, update.rates.powerPerSecond);
assert.ok(effectStatsAfterUpdate.tickProviderCalls <= 4,
  `完整高资源 tick provider 调用异常：${effectStatsAfterUpdate.tickProviderCalls}`);

const explorationSource = fs.readFileSync(
  path.join(root, "js/cultivation/immortal-logic.js"), "utf8"
);
assert.doesNotMatch(explorationSource, /iteration\s*<\s*80/,
  "自动探寻不得保留固定 80 次二分");
assert.match(explorationSource, /cachedExplorationPowerCost/,
  "自动探寻反解结果必须缓存");

const uiSource = fs.readFileSync(path.join(root, "js/ui/app.js"), "utf8");
const renderGlobalSource = uiSource.slice(
  uiSource.indexOf("function renderGlobal()"),
  uiSource.indexOf("function explorationPreviewValues()")
);
assert.match(renderGlobalSource, /WIS\.tmp\.rates/);
assert.doesNotMatch(renderGlobalSource,
  /automaticJPerSecond\(|automaticPowerPerSecond\(|automaticManaPerSecond\(|immortalPowerPerSecond\(/,
  "全局 UI 不得重新执行完整收益公式");

console.log(JSON.stringify({
  passed: true,
  dynamicRateEvaluations,
  tickProviderCalls: effectStatsAfterUpdate.tickProviderCalls,
  rates: WIS.tmp.rates
}, null, 2));
