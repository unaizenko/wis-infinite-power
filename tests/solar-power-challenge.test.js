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
  "js/vendor/break_eternity.min.js", "js/core/namespace.js", "js/core/bignum.js",
  "js/core/config.js", "js/core/registry.js", "js/core/formulas.js",
  "js/core/penalties.js", "js/core/integration.js",
  "js/core/runtime.js", "js/core/state.js", "js/core/resources.js",
  "js/core/effects.js", "js/core/sources.js", "js/core/reset.js"
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

const Challenges = WIS.Meta.Challenges;
const B = WIS.Core.BigNum;
const { ZERO, ONE, add, sub, mul, div, pow, sqrt, abs, max, gte, eq, isFiniteBN, isNaNBN, toNumber } = B;
const explosive = WIS.Core.Config.scales[10].power;
const stellar = WIS.Core.Config.scales[11].power;

function close(actual, expected, tolerance = 1e-12, message = "") {
  const error = toNumber(div(abs(sub(actual, expected)), max(ONE, abs(expected))), Infinity);
  assert.ok(error <= tolerance, `${message}: actual=${actual} expected=${expected}`);
}

function assertSolarInheritedLimits(message) {
  WIS.Core.Effects.invalidate();
  close(WIS.Core.Effects.value("fortuneJLimit", state), "0.85", 1e-12, `${message}·福`);
  close(WIS.Core.Effects.value("powerlessLimit", state), "0.85", 1e-12, `${message}·禄`);
  close(WIS.Core.Effects.value("longevityJLimit", state), "0.80", 1e-12, `${message}·寿J`);
  close(WIS.Core.Effects.value("longevityPowerLimit", state), "0.80", 1e-12, `${message}·寿战力`);
}

state.unlockedAchievements.scale4 = true;
state.unlockedAchievements.trueScale11 = true;
state.cultivation.active = null;
assert.equal(Challenges.challengeUnlocked("solarPower"), true,
  "真恒星旧存档应直接解锁挑战，且不要求当前选择仙道");
assert.ok(eq(Challenges.solarPowerRewardExponent(state, "joules"), ONE),
  "完成前不得获得阴阳相生");

Challenges.startChallenge("solarPower");
assert.equal(state.activeChallenge, "solarPower");
assert.equal(WIS.Core.Config.challenges.solarPower.system, undefined,
  "太阳之力必须属于普通挑战");
assert.equal(WIS.Core.Config.challenges.solarPower.catalogSystem, undefined,
  "太阳之力必须显示在普通挑战分类");
assert.equal(state.cultivation.active, null, "启动普通挑战不得强制切换仙道");
const fortuneCompletionSnapshot = {
  innateDeficiency: state.challengeCompletions.innateDeficiency || 0,
  powerless: state.challengeCompletions.powerless || 0,
  longevity: state.challengeCompletions.longevity || 0
};
assertSolarInheritedLimits("太阳之力继承初级难度");
close(mul(WIS.Core.Effects.value("fortuneJLimit", state), WIS.Core.Effects.value("longevityJLimit", state)),
  "0.68", 1e-12, "太阳之力J的福寿基础叠加");
close(mul(WIS.Core.Effects.value("powerlessLimit", state), WIS.Core.Effects.value("longevityPowerLimit", state)),
  "0.68", 1e-12, "太阳之力战力的禄寿基础叠加");
assert.deepEqual({
  innateDeficiency: state.challengeCompletions.innateDeficiency || 0,
  powerless: state.challengeCompletions.powerless || 0,
  longevity: state.challengeCompletions.longevity || 0
}, fortuneCompletionSnapshot, "继承限制不得改变福禄寿完成次数");
state.activeChallenge = null;
WIS.Core.Effects.invalidate();
["fortuneJLimit", "powerlessLimit", "longevityJLimit", "longevityPowerLimit"].forEach((id) =>
  close(WIS.Core.Effects.value(id, state), ONE, 1e-12, `退出太阳之力后${id}必须消失`));
state.activeChallenge = "planetSuppression";
WIS.Core.Effects.invalidate();
["fortuneJLimit", "powerlessLimit", "longevityJLimit", "longevityPowerLimit"].forEach((id) =>
  close(WIS.Core.Effects.value(id, state), ONE, 1e-12, `其他挑战不得继承${id}`));
state.activeChallenge = "solarPower";

state.challengeCompletions.innateDeficiency = 3;
state.challengeCompletions.powerless = 3;
state.challengeCompletions.longevity = 3;
WIS.Core.Effects.invalidate();
close(WIS.Core.Effects.value("fortuneFitnessReward", state), "1.15", 1e-12,
  "福永久奖励仍应正常生效");
close(WIS.Core.Effects.value("powerlessTrainingReward", state), "1.12", 1e-12,
  "禄永久奖励仍应正常生效");
close(WIS.Core.Effects.value("longevityJReward", state), 100, 1e-12,
  "寿永久奖励仍应正常生效");
Object.assign(state.challengeCompletions, fortuneCompletionSnapshot);

state.joules = explosive;
state.power = explosive;
close(Challenges.solarPowerLimitExponent(state, "joules"), ONE, 1e-12,
  "爆星起点J指数");
close(Challenges.solarPowerLimitExponent(state, "power"), ONE, 1e-12,
  "爆星起点战力指数");

function amountAtSolarProgress(progress) {
  return mul(pow(explosive, 1 - progress), pow(stellar, progress));
}
function expectedSolarLimit(progress) {
  return sub(ONE, mul("0.28", pow(progress, "1.3")));
}
for (const progress of [0.25, 0.5, 0.75]) {
  state.power = amountAtSolarProgress(progress);
  close(Challenges.solarPowerLimitExponent(state, "joules"),
    expectedSolarLimit(progress), 1e-12, `战力进度${progress}对应的J压制`);
  state.joules = amountAtSolarProgress(progress);
  close(Challenges.solarPowerLimitExponent(state, "power"),
    expectedSolarLimit(progress), 1e-12, `J进度${progress}对应的战力压制`);
}
state.joules = stellar;
state.power = stellar;
close(Challenges.solarPowerLimitExponent(state, "joules"), "0.72", 1e-12,
  "J最低压制");
close(Challenges.solarPowerLimitExponent(state, "power"), "0.72", 1e-12,
  "战力最低压制");
state.activeChallenge = null;
close(Challenges.solarPowerLimitExponent(state, "joules"), ONE, 1e-12,
  "退出太阳之力后J压制必须立即失效");
close(Challenges.solarPowerLimitExponent(state, "power"), ONE, 1e-12,
  "退出太阳之力后战力压制必须立即失效");
state.activeChallenge = "solarPower";

state.power = div(stellar, 2);
state.highestScaleIndex = 11;
assert.equal(Challenges.checkActiveChallengeCompletion(), false,
  "只有J达到恒星时不得完成");
state.power = stellar;
assert.equal(Challenges.checkActiveChallengeCompletion(), true,
  "J与战力同时达到恒星时必须完成");
assert.equal(state.challengeCompletions.solarPower, 1);
assert.equal(state.activeChallenge, null);

const rewardJ = Challenges.solarPowerRewardExponent(state, "joules");
const rewardPower = Challenges.solarPowerRewardExponent(state, "power");
assert.ok(gte(rewardJ, "1.04") && gte(rewardPower, "1.04"),
  "完成后阴阳相生必须生效");

state.unlockedAchievements.scale12 = true;
WIS.Core.Effects.invalidate();
close(WIS.Core.Effects.value("galaxyChallengeJ", state), ONE, 1e-12,
  "非挑战状态不得获得星系倍率");
state.activeChallenge = "solarPower";
WIS.Core.Effects.invalidate();
close(WIS.Core.Effects.value("galaxyChallengeJ", state), 75, 1e-12,
  "任意挑战中应获得星系J倍率");

state.joules = "1e10000";
state.power = "1e10000";
const hugeRewardJ = Challenges.solarPowerRewardExponent(state, "joules");
const hugeRewardPower = Challenges.solarPowerRewardExponent(state, "power");
[hugeRewardJ, hugeRewardPower].forEach((value) => {
  assert.ok(isFiniteBN(value) && !isNaNBN(value), `极端大数奖励指数必须有限：${value}`);
});

const restored = WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(state));
assert.equal(restored.challengeCompletions.solarPower, 1,
  "新挑战完成次数必须复用现有存档映射");
assert.equal(restored.unlockedAchievements.trueScale11, true);
assert.equal(restored.unlockedAchievements.scale12, true);

console.log("solar power challenge tests passed");
