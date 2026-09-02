"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
window.confirm = () => true;
global.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

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
  "js/core/save.js",
  "js/core/resources.js",
  "js/core/effects.js",
  "js/core/sources.js",
  "js/core/reset.js"
].forEach(load);

const B = WIS.Core.BigNum;
const { ZERO, ONE, BN, add, mul, pow, log10, gt, eq, isFiniteBN, isNaNBN, toNumber } = B;
const closeLog = (value, expected, tolerance = 1e-10) => {
  assert.ok(isFiniteBN(value) && !isNaNBN(value) && gt(value, ZERO), `非法大数：${value}`);
  assert.ok(Math.abs(toNumber(log10(value), Infinity) - expected) <= tolerance,
    `log10(${value}) 应为 ${expected}`);
};

closeLog(mul("1e308", "1e60"), 368);
closeLog(mul("1e500", "1e500"), 1000);
closeLog(pow("1e1000", 1.5), 1500);
assert.ok(Math.abs(toNumber(log10("1e1000"), Infinity) - 1000) < 1e-12);
assert.ok(gt("1e1000", "1e999"));
assert.equal(isFiniteBN(Infinity), false);
assert.equal(isFiniteBN(NaN), false);

let state = WIS.Core.State.fresh();
WIS.Core.Runtime.bind({
  state: () => state,
  setState: (nextState) => { state = nextState; },
  save: () => {}, render: () => {}, showNotice: () => {}, switchPage: () => {},
  achievementStates: () => ({}), notifyNewAchievements: () => {},
  cultivationUnlocked: () => true, treasuresUnlocked: () => true,
  format: String, freshState: () => WIS.Core.State.fresh(),
  updateLifetimeStatistics: () => {}, checkActiveChallengeCompletion: () => false,
  resetTransientAccumulators: () => {}, resetCultivationPage: () => {},
  applyResourceSoftcapProgressive: (gain) => gain,
  celestialDeclineExponent: () => WIS.Cultivation.ImmortalLogic?.celestialDeclineExponent?.() ?? 1
});
WIS.Core.Resources.bind(() => state);
WIS.Meta.Achievements = Object.freeze({
  has: (current, key) => current.unlockedAchievements?.[key] === true,
  record: (current, key) => { current.unlockedAchievements[key] = true; }
});
WIS.Meta.Treasures = Object.freeze({ add() {} });

state.cultivation.active = "immortal";
state.qiRefiningUnlocked = true;
state.foundationUnlocked = true;
state.goldenCoreUnlocked = true;
state.advancedRealmLevel = 10;
state.immortalSpiritPowerUnlocked = true;
WIS.Core.Resources.set("joules", "1e400");
WIS.Core.Resources.set("power", "1e1000");
WIS.Core.Resources.setSystem("immortal", "mana", "1e10000");
WIS.Core.Resources.setSystem("immortal", "immortalPower", "1e500");
assert.ok(eq(state.joules, "1e400"));
assert.ok(eq(state.power, "1e1000"));
assert.ok(eq(state.mana, "1e10000"));
assert.ok(eq(state.immortalPower, "1e500"));

assert.ok(WIS.Core.Resources.canAfford("power", "1e999"));
assert.ok(WIS.Core.Resources.spend("power", "1e999"));
assert.ok(gt(state.power, "1e999"), "大数购买必须使用 Decimal 比较和扣除");
WIS.Core.Resources.set("power", "1e1000");

state.lifetimeHighestPower = BN("1e1000000");
state.meta.infinity.currency = BN("1e5000");
const challengeReset = WIS.Core.Reset.apply(
  "challenge",
  state,
  () => WIS.Core.State.fresh()
);
assert.ok(eq(challengeReset.power, ZERO), "挑战重置应清空当前战力");
assert.ok(eq(challengeReset.lifetimeHighestPower, "1e1000000"), "重置必须无损保留 Decimal 统计");
assert.ok(eq(challengeReset.meta.infinity.currency, "1e5000"), "重置必须无损保留 Decimal Meta 资源");

const serializable = WIS.Core.State.toSerializable(state);
serializable.meta.infinity.currency = BN("1e1000000");
const json = JSON.stringify(WIS.Core.Save.envelope(WIS.Core.State.normalizeDomain(serializable)));
assert.match(json, /"joules":"1e400"/);
assert.match(json, /"power":"1e1000"/);
assert.match(json, /"mana":"e10000"|"mana":"1e10000"/);
assert.match(json, /"currency":"e1000000"|"currency":"1e1000000"/);
const restored = WIS.Core.State.migrate(47, JSON.parse(json).data);
assert.ok(eq(restored.joules, "1e400"));
assert.ok(eq(restored.power, "1e1000"));
assert.ok(eq(restored.mana, "1e10000"));
assert.ok(eq(restored.meta.infinity.currency, "1e1000000"));
const oldNumberSave = WIS.Core.State.migrate(46, { joules: 123, power: 456 });
assert.ok(eq(oldNumberSave.joules, 123) && eq(oldNumberSave.power, 456));

load("js/cultivation/immortal-logic.js");
load("js/cultivation/immortal.js");
load("js/power/scale-logic.js");
load("js/power/scale.js");
load("js/meta/challenges.js");

state = WIS.Core.State.fresh();
assert.ok(eq(state.meta.infinity.currency, ZERO), "预留无限资源的默认值必须为 Decimal 零值");
state.cultivation.active = "immortal";
state.activeChallenge = "qiRefiningHundredThousandYears";
state.qiRefiningUnlocked = true;
const Immortal = WIS.Cultivation.ImmortalLogic;
for (const layer of [100000, 110000, 150000]) {
  const requirement = Immortal.qiLayerRequirement(layer);
  assert.ok(isFiniteBN(requirement) && !isNaNBN(requirement));
  assert.ok(toNumber(log10(requirement), 0) >= (layer === 100000 ? 308 : 308));
}
state.currentQiLayer = 100000;
state.mana = Immortal.qiLayerRequirement(100000);
const manaPower = Immortal.externalSources().find((source) => source.id === "qiManaPower").value;
closeLog(manaPower, 367.9994, 2e-9);
assert.ok(isFiniteBN(manaPower) && gt(manaPower, "1e308"));

state.advancedRealmLevel = 10;
state.immortalPower = WIS.Core.Config.immortalPower.realmCosts.daoAncestor;
for (const amount of ["1e400", "1e1000", "1e10000"]) {
  const stages = WIS.Power.ScaleLogic.resourceSoftcapStageExponents(amount);
  assert.ok(stages.length >= 2, `${amount} 应触发多层正常量级软上限`);
  stages.forEach((stage) => assert.ok(stage.exponent > 0 && stage.exponent < 1));
  const settled = WIS.Power.ScaleLogic.applyResourceSoftcap("1e1000", amount);
  assert.ok(isFiniteBN(settled) && !isNaNBN(settled));
}

load("js/ui/cards.js");
for (const value of [1, "1e6", "1e100", "1e308", "1e368", "1e1000", "1e1000000"]) {
  const shown = WIS.UI.Format.number(value);
  assert.doesNotMatch(shown, /Infinity|NaN|\[object Object\]/);
}

console.log(JSON.stringify({
  passed: true,
  manaPower: manaPower.toString(),
  manaPowerLog10: toNumber(log10(manaPower), Infinity),
  formats: ["1e368", "1e1000", "1e1000000"].map(WIS.UI.Format.number)
}, null, 2));
