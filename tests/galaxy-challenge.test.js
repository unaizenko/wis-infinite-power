"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
window.confirm = () => true;

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
  "js/core/penalties.js",
  "js/core/integration.js",
  "js/core/runtime.js",
  "js/core/state.js",
  "js/core/resources.js",
  "js/core/effects.js",
  "js/core/sources.js",
  "js/core/reset.js"
].forEach(load);

WIS.Meta.Achievements = Object.freeze({
  has: (current, key) => current.unlockedAchievements?.[key] === true
});
WIS.Meta.Treasures = Object.freeze({ add() {} });

let state = WIS.Core.State.fresh();
WIS.Core.Runtime.bind({
  state: () => state,
  setState: (next) => { state = next; },
  save: () => {}, render: () => {}, showNotice: () => {}, switchPage: () => {},
  achievementStates: () => ({}), notifyNewAchievements: () => {},
  cultivationUnlocked: () => true, treasuresUnlocked: () => true,
  format: (value) => String(value), freshState: () => WIS.Core.State.fresh(),
  updateLifetimeStatistics: () => {}, resetTransientAccumulators: () => {},
  resetCultivationPage: () => {}, applyResourceSoftcapProgressive: (gain) => gain,
  celestialDeclineExponent: () => 1
});
WIS.Core.Resources.bind(() => state);

load("js/cultivation/immortal-logic.js");
load("js/cultivation/immortal.js");
load("js/power/scale-logic.js");
load("js/power/scale.js");
load("js/meta/challenges.js");

const B = WIS.Core.BigNum;
const { ZERO, ONE, add, sub, mul, div, pow, log10, abs, max, eq, isFiniteBN, isNaNBN, toNumber } = B;
const Challenges = WIS.Meta.Challenges;
const Scale = WIS.Power.ScaleLogic;
const Effects = WIS.Core.Effects;
const galaxy = WIS.Core.Config.challenges.galaxy;
const galaxyThreshold = WIS.Core.Config.scales[galaxy.requiredScaleIndex].power;
const explosiveStarThreshold = WIS.Core.Config.scales[10].power;

Effects.register("galaxy-single-transform-test", () => [{
  id: "galaxySingleTransformTest",
  target: "galaxyTest",
  layer: "sourceMultiplier",
  dynamicResources: ["joules"],
  value: (current) => Effects.dynamicResourceValue(current, "joules")
}]);

function close(actual, expected, tolerance = 1e-12, message = "") {
  const error = toNumber(div(abs(sub(actual, expected)), max(ONE, abs(expected))), Infinity);
  assert.ok(error <= tolerance, `${message}: actual=${actual} expected=${expected}`);
}

function refreshEffects() {
  Effects.invalidate();
}

function assertGalaxyInheritedLimits(message) {
  refreshEffects();
  close(Effects.value("fortuneJLimit", state), "0.70", 1e-12, `${message}·福`);
  close(Effects.value("powerlessLimit", state), "0.72", 1e-12, `${message}·禄`);
  close(Effects.value("longevityJLimit", state), "0.75", 1e-12, `${message}·寿J`);
  close(Effects.value("longevityPowerLimit", state), "0.75", 1e-12, `${message}·寿战力`);
}

function expectedSolarReward(opposingAmount) {
  const firstLog = log10(add(ONE, div(max(ZERO, opposingAmount), explosiveStarThreshold)));
  const secondLog = log10(add(ONE, firstLog));
  return add("1.04", mul("0.02", pow(secondLog, "0.8")));
}

// 旧存档只要永久记录了“真星系”，无需重新获得即可解锁银河。
const legacy = WIS.Core.State.toFlat(WIS.Core.State.fresh());
legacy.unlockedAchievements = { scale4: true, trueScale12: true };
state = WIS.Core.State.normalize(legacy);
assert.equal(state.unlockedAchievements.trueScale12, true);
assert.equal(Challenges.challengeUnlocked("galaxy"), true,
  "真星系旧存档应直接解锁银河，且不要求当前选择仙道");

Challenges.startChallenge("galaxy");
assert.equal(state.activeChallenge, "galaxy");
assert.equal(galaxy.system, undefined, "银河必须属于普通挑战");
assert.equal(galaxy.catalogSystem, undefined, "银河必须显示在普通挑战分类");
assert.equal(state.cultivation.active, null, "启动普通挑战不得强制切换仙道");
assertGalaxyInheritedLimits("银河继承中级难度");
close(mul(Effects.value("fortuneJLimit", state), Effects.value("longevityJLimit", state)),
  "0.525", 1e-12, "银河J的福寿基础叠加");
close(mul(Effects.value("powerlessLimit", state), Effects.value("longevityPowerLimit", state)),
  "0.54", 1e-12, "银河战力的禄寿基础叠加");
state.activeChallenge = null;
refreshEffects();
["fortuneJLimit", "powerlessLimit", "longevityJLimit", "longevityPowerLimit"].forEach((id) =>
  close(Effects.value(id, state), ONE, 1e-12, `退出银河后${id}必须消失`));
state.activeChallenge = "galaxy";

// 银河中动态资源统一视为0；同一复合公式中的固定倍率仍保留。
Object.assign(state, {
  joules: "1e30",
  power: "1e30",
  exercisePurchased: true,
  extremeExercisePurchased: true,
  transcendentPurchased: true,
  bioenergyPurchased: true,
  bulletTimePurchased: true,
  myStylePurchased: true,
  carbonLimitPurchased: true,
  auraControlUnlocked: true,
  immortalRealmDivineAbilityUnlocked: true
});
state.challengeCompletions.solarPower = 1;
refreshEffects();
close(Effects.dynamicResourceValue(state, "joules"), ZERO, 1e-12,
  "银河中动态J读取必须归零");
close(Effects.dynamicResourceValue(state, "power"), ZERO, 1e-12,
  "银河中动态战力读取必须归零");
close(Effects.value("exercise", state), 1.1 * 1.5, 1e-12,
  "运动的J动态部分应失效，极限运动固定倍率应保留");
close(Effects.value("transcendent", state), ONE, 1e-12,
  "纯动态战力强化应失效");
close(Effects.value("bioenergy", state), 3, 1e-12,
  "固定J倍率不应受银河影响");
close(Effects.value("bulletTime", state), 1.5, 1e-12,
  "固定战力倍率不应受银河影响");
close(Scale.myStyleFitnessMultiplier(), ONE, 1e-12,
  "未经过效果注册表的当前J动态强化也必须接入统一读取");
close(Scale.carbonLimitFitnessBonus(), ZERO, 1e-12,
  "当前J动态加法应在银河中归零");
close(Effects.value("solarPowerJReward", state), ONE, 1e-12,
  "银河中太阳之力J奖励必须整项失效");
close(Effects.value("solarPowerPowerReward", state), ONE, 1e-12,
  "银河中太阳之力战力奖励必须整项失效");

// 抵达星系后完成，限制解除并启用统一的X^1.10视为值。
state.highestScaleIndex = galaxy.requiredScaleIndex;
assert.equal(Challenges.checkActiveChallengeCompletion(), true, "抵达星系必须完成银河");
assert.equal(state.challengeCompletions.galaxy, 1);
assert.equal(state.activeChallenge, null);

state.joules = "1e30";
state.power = "1e40";
refreshEffects();
const effectiveJ = pow(state.joules, galaxy.dynamicResourceExponent);
const effectivePower = pow(state.power, galaxy.dynamicResourceExponent);
close(Effects.dynamicResourceValue(state, "joules"), effectiveJ, 1e-12,
  "完成后J应只转换一次");
close(Effects.dynamicResourceValue(state, "power"), effectivePower, 1e-12,
  "完成后战力应只转换一次");
close(Effects.value("galaxySingleTransformTest", state), effectiveJ, 1e-12,
  "已经过统一代理的J不得被再次转换");

const expectedExercise = (1.1 + 0.1 * toNumber(log10(add(ONE, effectiveJ)), 0)) * 1.5;
const actualExercise = Effects.value("exercise", state);
close(actualExercise, expectedExercise, 1e-12, "运动必须按f(J^1.10)计算");
const rawExercise = (1.1 + 0.1 * toNumber(log10(add(ONE, state.joules)), 0)) * 1.5;
assert.ok(Math.abs(toNumber(actualExercise, 0) - Math.pow(rawExercise, galaxy.dynamicResourceExponent)) > 1e-4,
  "运动不得错误计算为f(J)^1.10");

const expectedTranscendent = 1 + 0.15 * toNumber(log10(add(ONE, effectivePower)), 0);
close(Effects.value("transcendent", state), expectedTranscendent, 1e-12,
  "超凡之力必须按f(Power^1.10)计算");

// 太阳之力奖励读取对方的视为值，而不是对原奖励结果乘方。
const actualSolarJ = Effects.value("solarPowerJReward", state);
const actualSolarPower = Effects.value("solarPowerPowerReward", state);
close(actualSolarJ, expectedSolarReward(effectivePower), 1e-12,
  "太阳之力J奖励必须读取Power^1.10");
close(actualSolarPower, expectedSolarReward(effectiveJ), 1e-12,
  "太阳之力战力奖励必须读取J^1.10");
const rawSolarJ = Challenges.solarPowerRewardExponent(state, "joules");
assert.ok(Math.abs(toNumber(actualSolarJ, 0) - Math.pow(toNumber(rawSolarJ, 0), galaxy.dynamicResourceExponent)) > 1e-8,
  "太阳之力奖励不得错误计算为f(Power)^1.10");

// 已完成后重复进入银河时，限制仍优先于奖励。
state.activeChallenge = "galaxy";
refreshEffects();
close(Effects.dynamicResourceValue(state, "joules"), ZERO, 1e-12,
  "银河限制必须优先于完成奖励");
close(Effects.value("solarPowerJReward", state), ONE, 1e-12,
  "重复银河中太阳之力奖励仍必须失效");
state.activeChallenge = null;

// 存档、转生和离线投影使用相同完成次数及动态读取结果。
const restored = WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(state));
assert.equal(restored.challengeCompletions.galaxy, 1, "存档归一化必须保留银河完成次数");
assert.equal(restored.unlockedAchievements.trueScale12, true, "存档归一化必须保留真星系");
const reincarnated = WIS.Core.Reset.apply("reincarnation", state, () => WIS.Core.State.fresh());
assert.equal(reincarnated.challengeCompletions.galaxy, 1, "转生必须保留银河完成次数");

const projection = WIS.Core.State.fromFlat(WIS.Core.State.toFlat(state));
const projectedEffectiveJ = WIS.Core.Runtime.withState(projection, () =>
  Effects.withIsolatedState(projection, () => Effects.dynamicResourceValue(projection, "joules"))
);
close(projectedEffectiveJ, pow(projection.joules, galaxy.dynamicResourceExponent), 1e-12,
  "离线/预测状态必须使用相同视为值");

state.joules = "1e1000000";
state.power = "1e1000000";
refreshEffects();
[
  Effects.dynamicResourceValue(state, "joules"),
  Effects.dynamicResourceValue(state, "power"),
  Effects.value("solarPowerJReward", state),
  Effects.value("solarPowerPowerReward", state)
].forEach((value) => {
  assert.ok(isFiniteBN(value) && !isNaNBN(value), `银河高数值计算必须保持有限：${value}`);
});

console.log("galaxy challenge tests passed");
