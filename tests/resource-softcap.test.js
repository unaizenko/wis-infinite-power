"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;

const root = path.resolve(__dirname, "..");
function load(relativePath) {
  const filename = path.join(root, relativePath);
  vm.runInThisContext(fs.readFileSync(filename, "utf8"), { filename });
}

[
  "js/vendor/break_eternity.min.js",
  "js/core/namespace.js",
  "js/core/bignum.js",
  "js/core/config.js",
  "js/core/registry.js",
  "js/core/formulas.js",
  "js/core/runtime.js",
  "js/core/state.js",
  "js/core/resources.js",
  "js/core/effects.js",
  "js/core/sources.js"
].forEach(load);

let state = WIS.Core.State.fresh();
let realmLevel = 0;
WIS.Cultivation.ImmortalLogic = Object.freeze({
  cultivationRealmLevel: () => realmLevel
});
WIS.Meta.Achievements = Object.freeze({
  has: (currentState, key) => currentState.unlockedAchievements?.[key] === true
});
WIS.Core.Runtime.bind({
  state: () => state,
  setState: (nextState) => { state = nextState; },
  achievementStates: () => ({}),
  celestialDeclineExponent: () => 1
});
WIS.Core.Resources.bind(() => state);
load("js/power/scale-logic.js");
load("js/power/scale.js");

const Scale = WIS.Power.ScaleLogic;
const SOFTCAPS = WIS.Core.Config.softcaps;
const city = SOFTCAPS.find((stage) => stage.name === "爆城");
const { ZERO, ONE, add, sub, mul, div, pow, log10, gt, gte, lt, isFiniteBN, toNumber } = WIS.Core.BigNum;

function setRealm(level) {
  realmLevel = Math.max(0, Math.floor(Number(level) || 0));
}

function relativeError(a, b) {
  const scale = WIS.Core.BigNum.max(ONE, WIS.Core.BigNum.max(WIS.Core.BigNum.abs(a), WIS.Core.BigNum.abs(b)));
  return toNumber(div(WIS.Core.BigNum.abs(sub(a, b)), scale), Infinity);
}

function assertRelativeClose(actual, expected, tolerance = 1e-9, message = "") {
  const error = relativeError(actual, expected);
  assert.ok(
    error <= tolerance,
    `${message}\nactual=${actual}\nexpected=${expected}\nrelativeError=${error}\ntolerance=${tolerance}`
  );
}

function simulateRate({ initialAmount, rate, totalSeconds, step }) {
  let amount = initialAmount;
  let remaining = totalSeconds;
  while (remaining > 1e-12) {
    const elapsed = Math.min(step, remaining);
    amount = add(amount, Scale.applyResourceSoftcapOverTime(rate, amount, elapsed));
    remaining -= elapsed;
  }
  return amount;
}

function simulateFineDynamicRate(rawRateAtAmount, initialAmount, totalSeconds) {
  let amount = initialAmount;
  let remaining = totalSeconds;
  for (let iteration = 0; iteration < 100000 && remaining > 0; iteration += 1) {
    const evaluationAmount = Scale.resourceSoftcapIntegrationEvaluationAmount(amount);
    const rate = Scale.applyResourceSoftcapRate(rawRateAtAmount(evaluationAmount), evaluationAmount);
    if (!gt(rate, ZERO) || !isFiniteBN(rate)) return amount;
    const boundary = Scale.nextResourceSoftcapIntegrationBoundary(amount);
    if (!boundary) return add(amount, mul(rate, remaining));
    const timeToBoundary = toNumber(div(sub(boundary, amount), rate), Infinity);
    if (!(timeToBoundary > 0) || !Number.isFinite(timeToBoundary) || timeToBoundary >= remaining) {
      return add(amount, mul(rate, remaining));
    }
    amount = boundary;
    remaining -= timeToBoundary;
  }
  assert.equal(remaining, 0, "高精度软上限参考积分未在迭代预算内收敛");
  return amount;
}

function pass(index, name) {
  console.log(`PASS ${index}  ${name}`);
}

setRealm(4);
assertRelativeClose(Scale.resourceSoftcapExponent(3e15), 1, 1e-12);
assertRelativeClose(Scale.applyResourceSoftcapRate(1e20, 3e15), 1e20, 1e-12);
pass(1, "阈值以下不触发软上限");

const aboveCity = mul(city.threshold, 10);
const aboveCityExponent = Scale.resourceSoftcapExponent(aboveCity);
assert.ok(aboveCityExponent > 0 && aboveCityExponent < 1);
assert.ok(lt(Scale.applyResourceSoftcapRate(1e20, aboveCity), 1e20));
pass(2, "超过阈值后启动软上限");

[
  ["爆城", 4, 5],
  ["爆国", 6, 7],
  ["爆大陆", 7, 8],
  ["地表", 8, 9]
].forEach(([name, beforeRealm, removedAtRealm]) => {
  const stage = SOFTCAPS.find((candidate) => candidate.name === name);
  const amount = mul(stage.threshold, 10);
  setRealm(beforeRealm);
  assert.ok(Scale.resourceSoftcapExponent(amount) < 1, `${name}解除前应生效`);
  setRealm(removedAtRealm);
  assertRelativeClose(Scale.resourceSoftcapExponent(amount), 1, 1e-12, `${name}应被境界解除`);
});
pass(3, "对应境界解除旧软上限");

setRealm(4);
const initialBeforeCity = mul(city.threshold, 0.99);
const largeRawGain = 1e20;
const progressive = Scale.applyResourceSoftcapProgressive(largeRawGain, initialBeforeCity);
assert.ok(lt(progressive, mul(largeRawGain, 0.1)), "跨爆城后的剩余收益疑似穿透软上限");
assert.ok(gt(progressive, sub(city.threshold, initialBeforeCity)), "大收益应能实际跨过爆城阈值");
pass(4, "大额一次收益跨阈值不能穿透");

const shortSimulation = { initialAmount: 3e15, rate: 1e20, totalSeconds: 1 };
const oneSecond = simulateRate({ ...shortSimulation, step: 1 });
const tenTenths = simulateRate({ ...shortSimulation, step: 0.1 });
const hundredHundredths = simulateRate({ ...shortSimulation, step: 0.01 });
assertRelativeClose(oneSecond, tenTenths, 1e-6, "1秒与10个0.1秒Tick应一致");
assertRelativeClose(oneSecond, hundredHundredths, 1e-6, "1秒与100个0.01秒Tick应一致");
pass(5, "自动收益 1s / 0.1s / 0.01s Tick一致");

const longSimulation = { initialAmount: 3e15, rate: 1e20, totalSeconds: 100 };
const oneSecondSteps = simulateRate({ ...longSimulation, step: 1 });
const quarterSecondSteps = simulateRate({ ...longSimulation, step: 0.25 });
const tenthSecondSteps = simulateRate({ ...longSimulation, step: 0.1 });
assertRelativeClose(oneSecondSteps, quarterSecondSteps, 1e-6, "100秒的1秒与0.25秒分步应一致");
assertRelativeClose(oneSecondSteps, tenthSecondSteps, 1e-6, "100秒的1秒与0.1秒分步应一致");
pass(6, "长时间在线/离线分步一致");

const instantaneousRate = 1e20;
const instantaneousAmount = mul(city.threshold, 1.01);
const differentialSeconds = 1e-9;
const runtimeEffectiveRate = div(Scale.applyResourceSoftcapOverTime(
  instantaneousRate,
  instantaneousAmount,
  differentialSeconds
), differentialSeconds);
const legacyGridEffectiveRate = Scale.applyResourceSoftcapEffectiveRate(
  instantaneousRate,
  instantaneousAmount
);
const exactMathematicalRate = Scale.applyResourceSoftcapRate(
  instantaneousRate,
  instantaneousAmount
);
assert.ok(
  relativeError(runtimeEffectiveRate, exactMathematicalRate) < 0.1,
  "有限采样积分的瞬时近似不得显著偏离精确数学速率"
);
assert.ok(isFiniteBN(legacyGridEffectiveRate));
pass(7, "有限采样积分保持瞬时速率近似");

// Progressive：一次性离散奖励。OverTime：持续产生的每秒速率。两者不得互换。
const discrete = Scale.applyResourceSoftcapProgressive(1e20, 1e17);
const continuous = Scale.applyResourceSoftcapOverTime(1e20, 1e17, 1);
assert.ok(isFiniteBN(discrete) && gte(discrete, ZERO));
assert.ok(isFiniteBN(continuous) && gte(continuous, ZERO));
pass(8, "Progressive / OverTime合法且职责分离");

setRealm(4);
const monotonicAmounts = [
  city.threshold,
  mul(city.threshold, 10),
  mul(city.threshold, 100),
  mul(city.threshold, 1000),
  mul(city.threshold, 10000)
];
const exponents = monotonicAmounts.map(Scale.resourceSoftcapExponent);
for (let index = 1; index < exponents.length; index += 1) {
  assert.ok(exponents[index] <= exponents[index - 1], "资源增加时软上限指数不得上升");
}
pass(9, "软上限指数随资源增加单调不增");

function resetAutomaticPowerFlow(joules) {
  state = WIS.Core.State.fresh();
  state.joules = joules;
  state.power = mul(city.threshold, 1.01);
  state.highestPower = state.power;
  state.focusPurchased = true;
  state.brickUnlocked = true;
  setRealm(4);
}

function simulateAutomaticPowerFlow({ joules, totalSeconds, step }) {
  resetAutomaticPowerFlow(joules);

  let remaining = totalSeconds;
  while (remaining > 1e-12) {
    const elapsed = Math.min(step, remaining);
    const gained = Scale.applyResourceSoftcapDynamicRateOverTime(
      (evaluationPower) => Scale.automaticPowerRawPerSecondAt(evaluationPower),
      state.power,
      elapsed
    );
    state.power = add(state.power, gained);
    state.highestPower = WIS.Core.BigNum.max(state.highestPower, state.power);
    remaining -= elapsed;
  }
  return state.power;
}

const completePowerFlow = { joules: 1e26, totalSeconds: 1 };
const completePowerOneStep = simulateAutomaticPowerFlow({ ...completePowerFlow, step: 1 });
const completePowerQuarterSteps = simulateAutomaticPowerFlow({ ...completePowerFlow, step: 0.25 });
const completePowerHundredthSteps = simulateAutomaticPowerFlow({ ...completePowerFlow, step: 0.01 });
resetAutomaticPowerFlow(completePowerFlow.joules);
const completePowerInstantRate = Scale.automaticPowerPerSecond();
const completePowerRuntimeRate = div(Scale.applyResourceSoftcapDynamicRateOverTime(
  (evaluationPower) => Scale.automaticPowerRawPerSecondAt(evaluationPower),
  state.power,
  differentialSeconds
), differentialSeconds);
assert.ok(isFiniteBN(completePowerInstantRate) && isFiniteBN(completePowerRuntimeRate));
assertRelativeClose(
  completePowerOneStep,
  completePowerQuarterSteps,
  1e-6,
  "完整自动战力流程的1秒与4个0.25秒Tick应一致"
);
assertRelativeClose(
  completePowerOneStep,
  completePowerHundredthSteps,
  1e-6,
  "完整自动战力流程的1秒与100个0.01秒Tick应一致"
);
WIS.Core.Effects.beginTick(state);
const snapshotUpdate = WIS.Power.Scale.update(state, 0.01);
assert.equal(WIS.tmp.rates.powerPerSecond, snapshotUpdate.rates.powerPerSecond,
  "UI收益快照必须保存本 tick 实际战力/秒");
pass(10, "完整自动战力流程在线/离线Tick一致");

setRealm(4);
state.activeChallenge = null;
const extremeInitialAmount = city.threshold;
const extremeRawRate = (amount) => mul("1e280", pow(add(ONE, log10(add(ONE, amount))), 2));
let extremeEvaluations = 0;
const extremeBoundedAmount = add(extremeInitialAmount, Scale.applyResourceSoftcapDynamicRateOverTime(
  (amount) => { extremeEvaluations += 1; return extremeRawRate(amount); },
  extremeInitialAmount,
  1
));
const extremeReferenceAmount = simulateFineDynamicRate(
  extremeRawRate,
  extremeInitialAmount,
  1
);
const extremeOrderError = Math.abs(toNumber(sub(log10(extremeBoundedAmount), log10(extremeReferenceAmount)), Infinity));
assert.ok(extremeEvaluations <= 32,
  `极高速积分完整收益公式求值超限：${extremeEvaluations}`);
assert.ok(gt(log10(div(extremeReferenceAmount, extremeInitialAmount)), 10),
  "极高速用例必须实际跨越多个数量级");
assert.ok(extremeOrderError < 0.25,
  `极高速封顶尾段出现数量级误差：${extremeOrderError}`);
pass(11, "极高速跨数量级积分在32次完整采样后稳定续算");

console.log(JSON.stringify({
  passed: true,
  effectiveRateCheck: {
    currentAmount: instantaneousAmount,
    legacyGridEffectiveRate,
    runtimeEffectiveRate,
    exactMathematicalRate,
    adaptiveExactRelativeError: relativeError(runtimeEffectiveRate, exactMathematicalRate)
  },
  shortTickRelativeErrors: {
    oneVsTenth: relativeError(oneSecond, tenTenths),
    oneVsHundredth: relativeError(oneSecond, hundredHundredths)
  },
  longTickRelativeErrors: {
    oneVsQuarter: relativeError(oneSecondSteps, quarterSecondSteps),
    oneVsTenth: relativeError(oneSecondSteps, tenthSecondSteps)
  },
  completePowerFlowRelativeErrors: {
    oneVsQuarter: relativeError(completePowerOneStep, completePowerQuarterSteps),
    oneVsHundredth: relativeError(completePowerOneStep, completePowerHundredthSteps),
    instantRuntime: relativeError(completePowerInstantRate, completePowerRuntimeRate)
  },
  extremeDynamicIntegration: {
    evaluations: extremeEvaluations,
    boundedAmount: extremeBoundedAmount,
    referenceAmount: extremeReferenceAmount,
    orderError: extremeOrderError
  }
}, null, 2));
