"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
window.confirm = () => true;
const root = path.resolve(__dirname, "..");
function load(relativePath) {
  vm.runInThisContext(fs.readFileSync(path.join(root, relativePath), "utf8"), { filename: relativePath });
}

[
  "js/vendor/break_eternity.min.js", "js/core/namespace.js", "js/core/bignum.js",
  "js/core/config.js", "js/core/registry.js", "js/core/formulas.js", "js/core/penalties.js",
  "js/core/integration.js", "js/core/runtime.js", "js/core/state.js", "js/core/resources.js",
  "js/core/effects.js", "js/core/sources.js", "js/core/reset.js"
].forEach(load);

WIS.Meta.Achievements = Object.freeze({
  has: (current, key) => current.unlockedAchievements?.[key] === true
});
WIS.Meta.Treasures = Object.freeze({ add() {} });

let state = WIS.Core.State.fresh();
WIS.Core.Runtime.bind({
  state: () => state, setState: (next) => { state = next; },
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
const supercluster = WIS.Core.Config.scales[13].power;
const cosmicStructure = WIS.Core.Config.scales[14].power;

function close(actual, expected, tolerance = 1e-12, message = "") {
  const error = toNumber(div(abs(sub(actual, expected)), max(ONE, abs(expected))), Infinity);
  assert.ok(error <= tolerance, `${message}: actual=${actual} expected=${expected}`);
}
function amountAtProgress(progress) {
  return sub(pow(10, mul(progress, log10(add(ONE, cosmicStructure)))), ONE);
}

state.unlockedAchievements.scale4 = true;
state.unlockedAchievements.trueScale13 = true;
assert.equal(Challenges.challengeUnlocked("blackHole"), true,
  "真超星系团旧存档必须直接解锁黑洞");
Challenges.startChallenge("blackHole");
assert.equal(state.activeChallenge, "blackHole");
assert.equal(WIS.Core.Config.challenges.blackHole.system, undefined, "黑洞必须属于普通挑战");
assert.equal(WIS.Core.Config.challenges.blackHole.catalogSystem, undefined, "黑洞必须显示在普通挑战分类");
assert.equal(state.cultivation.active, null, "启动黑洞不得自动选择或切换修行体系");

Effects.invalidate();
for (const id of ["fortuneJLimit", "powerlessLimit", "longevityJLimit", "longevityPowerLimit"]) {
  close(Effects.value(id, state), ONE, 1e-12, `黑洞不得继承${id}`);
}

state.joules = ZERO;
state.power = ZERO;
close(Challenges.blackHoleLimitExponent(state, "joules"), ONE, 1e-12, "挑战起点J指数");
close(Challenges.blackHoleLimitExponent(state, "power"), ONE, 1e-12, "挑战起点战力指数");
state.joules = 1;
state.power = 1;
assert.ok(Challenges.blackHoleLimitExponent(state, "joules").lt(ONE), "正J时黑洞压制必须已经生效");
assert.ok(Challenges.blackHoleLimitExponent(state, "power").lt(ONE), "正战力时黑洞压制必须已经生效");
for (const progress of [0.25, 0.5, 0.75]) {
  state.joules = amountAtProgress(progress);
  state.power = amountAtProgress(1 - progress);
  close(Challenges.blackHoleLimitExponent(state, "joules"),
    sub(ONE, mul("0.28", pow(progress, "1.25"))), 1e-12, `J自身进度${progress}`);
  close(Challenges.blackHoleLimitExponent(state, "power"),
    sub(ONE, mul("0.28", pow(1 - progress, "1.25"))), 1e-12, `战力自身进度${1 - progress}`);
}
state.joules = cosmicStructure;
state.power = cosmicStructure;
close(Challenges.blackHoleLimitExponent(state, "joules"), "0.72", 1e-12, "宇宙结构处J最低指数");
close(Challenges.blackHoleLimitExponent(state, "power"), "0.72", 1e-12, "宇宙结构处战力最低指数");

close(Challenges.blackHoleLossOrders("1e10", "1e7"), 3, 1e-12, "损失数量级");
close(Challenges.blackHoleRequirementMultiplierFromLoss(10), pow(10, "0.8"), 1e-12,
  "需求倍率必须使用10^(0.08L)");

state.joules = amountAtProgress(0.5);
state.power = amountAtProgress(0.75);
Object.assign(state, {
  gymPurchased: true, exercisePurchased: true, transcendentPurchased: true,
  focusPurchased: true, rockLevel: 20, ultimateIntentPurchased: true
});
Effects.invalidate();
const loss = Scale.blackHoleGainLossDetails();
close(loss.lossOrders, max(loss.joulesLossOrders, loss.powerLossOrders), 1e-12,
  "统一L必须取J和战力损失数量级较大者");
close(loss.requirementMultiplier,
  Challenges.blackHoleRequirementMultiplierFromLoss(loss.lossOrders), 1e-12,
  "实际量级需求必须读取同一L");
const activeRequirement = Scale.scaleRequirementDetails(14, state);
close(activeRequirement.blackHoleMultiplier, loss.requirementMultiplier, 1e-12,
  "当前下一量级需求必须乘黑洞动态倍率");
assert.ok(activeRequirement.blackHoleMultiplier.gt(ONE), "需求反噬必须在达到超星系团前即可生效");
const repeatedRequirement = Scale.scaleRequirementDetails(14, state);
close(repeatedRequirement.actualRequirement, activeRequirement.actualRequirement, 1e-12,
  "同一状态重复计算不得累计黑洞需求倍率");

Challenges.exitChallenge();
close(Scale.scaleRequirementDetails(14, state).blackHoleMultiplier, ONE, 1e-12,
  "退出黑洞后动态需求倍率必须立即消失");

state.challengeCompletions.blackHole = 1;
const base13 = WIS.Core.Config.scales[13].power;
const base14 = WIS.Core.Config.scales[14].power;
close(Scale.scaleRequirement(13, state), base13, 1e-12, "超星系团需求不得被奖励修改");
const rewarded14 = mul(base13, pow(div(base14, base13), "0.95"));
close(Scale.scaleRequirement(14, state), rewarded14, 1e-12,
  "宇宙结构需求必须按相对超星系团跨度^0.95压缩");

state.activeChallenge = "blackHole";
state.challengeCompletions.blackHole = 0;
state.highestScaleIndex = 13;
state.joules = cosmicStructure;
state.power = cosmicStructure;
Effects.invalidate();
assert.ok(Scale.scaleRequirement(14, state).gt(cosmicStructure),
  "黑洞动态倍率生效时，达到基础门槛仍不得提前跨量级");
const activeRestored = WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(state));
assert.equal(activeRestored.highestScaleIndex, 13,
  "读取黑洞挑战中的存档不得按未修正基础门槛提前晋升量级");
state.joules = "1e10000";
state.power = "1e10000";
Effects.invalidate();
const hugeLoss = Scale.blackHoleGainLossDetails();
const hugeRequirement = Scale.scaleRequirementDetails(14, state);
[
  Challenges.blackHoleLimitExponent(state, "joules"),
  Challenges.blackHoleLimitExponent(state, "power"),
  hugeLoss.lossOrders, hugeLoss.requirementMultiplier, hugeRequirement.actualRequirement
].forEach((value) => assert.ok(isFiniteBN(value) && !isNaNBN(value), `极端大数必须保持有限：${value}`));

state.highestScaleIndex = 14;
assert.equal(Challenges.checkActiveChallengeCompletion(), true, "抵达宇宙结构必须完成黑洞");
assert.equal(state.challengeCompletions.blackHole, 1);
assert.equal(state.activeChallenge, null);
const restored = WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(state));
assert.equal(restored.challengeCompletions.blackHole, 1, "存档必须保留黑洞完成次数");
const reincarnated = WIS.Core.Reset.apply("reincarnation", state, () => WIS.Core.State.fresh());
assert.equal(reincarnated.challengeCompletions.blackHole, 1, "转生必须保留黑洞完成次数");

const stepSource = fs.readFileSync(path.join(root, "js/simulation/step.js"), "utf8");
assert.match(stepSource, /actualScaleRequirement\(nextScaleIndex, projection\)/,
  "在线和离线量级边界必须读取投影状态下的实际需求");
assert.doesNotMatch(stepSource, /gte\(projectedPower, nextScale\.power\)/,
  "边界判断不得继续绕过动态实际需求");

console.log("black hole challenge tests passed");
