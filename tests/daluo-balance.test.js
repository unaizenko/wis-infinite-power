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
  "js/core/runtime.js",
  "js/core/state.js",
  "js/core/resources.js",
  "js/core/effects.js",
  "js/core/sources.js",
  "js/core/reset.js"
].forEach(load);

WIS.Meta.Achievements = Object.freeze({ has: () => false, record() {} });
WIS.Meta.Treasures = Object.freeze({ add() {} });

let state = WIS.Core.State.fresh();
state.cultivation.active = "immortal";
WIS.Core.Runtime.bind({
  state: () => state,
  setState: (nextState) => { state = nextState; },
  save: () => {}, render: () => {}, showNotice: () => {}, switchPage: () => {},
  achievementStates: () => ({}), notifyNewAchievements: () => {},
  cultivationUnlocked: () => true, treasuresUnlocked: () => true,
  format: (value) => String(value), freshState: () => WIS.Core.State.fresh(),
  updateLifetimeStatistics: () => {}, checkActiveChallengeCompletion: () => {},
  resetTransientAccumulators: () => {}, resetCultivationPage: () => {},
  applyResourceSoftcapProgressive: (gain) => gain, celestialDeclineExponent: () => 1
});
WIS.Core.Resources.bind(() => state);

load("js/cultivation/immortal-logic.js");
load("js/cultivation/immortal.js");
load("js/power/scale-logic.js");
load("js/power/scale.js");
load("js/meta/challenges.js");

const Immortal = WIS.Cultivation.ImmortalLogic;
const Challenges = WIS.Meta.Challenges;
const Scale = WIS.Power.ScaleLogic;
const { BN, pow, sub, div, toNumber } = WIS.Core.BigNum;

const originalNearbyExponent = 1.0099;
const originalMaximumBonus = 0.02;
const nearbyY = (originalNearbyExponent - 1) /
  (originalMaximumBonus - (originalNearbyExponent - 1));
const nearbyLawMultiplier = Math.pow(10, nearbyY);
const newLawExponent = Immortal.lawCrystalFilamentExponentFromMultiplier(nearbyLawMultiplier);
assert.ok(Math.abs(newLawExponent - 1.099) < 1e-12);

Object.assign(state, {
  activeChallenge: "severEvilCorpse",
  qiRefiningUnlocked: true,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  advancedRealmLevel: 9,
  immortalSpiritPowerUnlocked: true,
  flawlessJadeBodyUnlocked: true,
  joules: BN("1e29"),
  power: BN("7.98e32"),
  mana: BN("1e29"),
  immortalPower: WIS.Core.Config.immortalPower.realmCosts.daluo
});

const resourceKeys = ["joules", "power", "mana", "immortalPower"];
const rawExponents = Object.fromEntries(resourceKeys.map((resourceKey) => [
  resourceKey,
  Challenges.evilCorpseRawLimitExponent(state, resourceKey)
]));
const finalExponents = Object.fromEntries(resourceKeys.map((resourceKey) => [
  resourceKey,
  Challenges.evilCorpseAdjustedLimitExponent(state, resourceKey)
]));

assert.ok(Math.abs(rawExponents.power - 0.6531751906574134) < 1e-15);
resourceKeys.forEach((resourceKey) => assert.equal(finalExponents[resourceKey], 0.80));

const oldPowerRegionExponent = originalNearbyExponent * rawExponents.power;
const newPowerRegionExponent = newLawExponent * finalExponents.power;
assert.ok(newPowerRegionExponent > oldPowerRegionExponent);

// 静态平衡探针：固定“进入战力区域指数前”的自动战力为1e49，之后照常结算现有五衰与量级软上限；不模拟来源继续成长。
const preExponentAutomaticPower = BN("1e49");
const celestialDeclineExponent = Immortal.celestialDeclineExponent();
const settleAutomaticPower = (regionExponent) => Scale.applyResourceSoftcapEffectiveRate(
  pow(pow(preExponentAutomaticPower, regionExponent), celestialDeclineExponent),
  state.power
);
const oldAutomaticPowerPerSecond = settleAutomaticPower(oldPowerRegionExponent);
const newAutomaticPowerPerSecond = settleAutomaticPower(newPowerRegionExponent);
const automaticPowerSpeedup = div(newAutomaticPowerPerSecond, oldAutomaticPowerPerSecond);
const stellarRequirement = WIS.Core.Config.scales.find((scale) => scale.name === "恒星").power;
const remainingPower = sub(stellarRequirement, state.power);
const oldStaticSeconds = toNumber(div(remainingPower, oldAutomaticPowerPerSecond), Infinity);
const newStaticSeconds = toNumber(div(remainingPower, newAutomaticPowerPerSecond), Infinity);

assert.ok(newStaticSeconds > 3600 && newStaticSeconds < 72 * 3600,
  `1e49静态探针下应恢复到小时级，实际${newStaticSeconds / 3600}小时`);
assert.equal(WIS.Core.Config.challenges.severEvilCorpse.requiredScaleIndex, 11,
  "斩恶尸完成条件必须保持恒星量级");

console.log(JSON.stringify({
  passed: true,
  referenceState: {
    joules: state.joules.toString(),
    power: state.power.toString(),
    mana: state.mana.toString(),
    immortalPower: state.immortalPower.toString(),
    preExponentAutomaticPower: preExponentAutomaticPower.toString(),
    celestialDeclineExponent
  },
  lawCrystal: {
    lawMultiplier: nearbyLawMultiplier,
    y: nearbyY,
    oldExponent: originalNearbyExponent,
    newExponent: newLawExponent
  },
  evilCorpse: { rawExponents, finalExponents },
  powerRegionExponent: { old: oldPowerRegionExponent, new: newPowerRegionExponent },
  automaticPowerPerSecond: {
    old: oldAutomaticPowerPerSecond.toString(),
    new: newAutomaticPowerPerSecond.toString(),
    speedup: automaticPowerSpeedup.toString()
  },
  staticEstimate: {
    target: stellarRequirement.toString(),
    oldSeconds: oldStaticSeconds,
    oldHours: oldStaticSeconds / 3600,
    newSeconds: newStaticSeconds,
    newHours: newStaticSeconds / 3600
  }
}, null, 2));
