"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
const root = path.resolve(__dirname, "..");
const load = (relativePath) => vm.runInThisContext(
  fs.readFileSync(path.join(root, relativePath), "utf8"), { filename: relativePath }
);

[
  "js/vendor/break_eternity.min.js", "js/core/namespace.js", "js/core/bignum.js",
  "js/core/config.js", "js/core/registry.js", "js/core/formulas.js", "js/core/penalties.js",
  "js/core/integration.js", "js/core/runtime.js", "js/core/state.js", "js/core/resources.js",
  "js/core/effects.js", "js/core/sources.js", "js/core/reset.js"
].forEach(load);

WIS.Meta.Achievements = Object.freeze({
  has: (current, key) => current.unlockedAchievements?.[key] === true
});
let state = WIS.Core.State.fresh();
WIS.Core.Runtime.bind({
  state: () => state, setState: (next) => { state = next; },
  save: () => {}, render: () => {}, showNotice: () => {},
  achievementStates: () => ({}), notifyNewAchievements: () => {},
  updateLifetimeStatistics: () => {}, celestialDeclineExponent: () => 1
});
WIS.Core.Resources.bind(() => state);
load("js/power/scale-logic.js");
load("js/meta/treasures.js");
load("js/power/scale.js");

const Scale = WIS.Power.ScaleLogic;
const Effects = WIS.Core.Effects;
const B = WIS.Core.BigNum;

assert.equal(WIS.Meta.Treasures.isTreasure("cosmicFiber"), true);
assert.equal(WIS.Meta.Treasures.isTreasure("cosmicWill"), true);
assert.equal(WIS.Meta.Treasures.isStackable("cosmicFiber"), true);

assert.equal(Scale.cosmicFiberAvailable(), false, "未到超星系团不得判定宇宙纤维");
state.highestScaleIndex = 13;
state.unlockedAchievements.scale13 = true;
assert.equal(Scale.cosmicFiberAvailable(), true);
assert.ok(Math.abs(Scale.cosmicFiberDecayedChance(0) - 0.003) < 1e-15);
assert.ok(Math.abs(Scale.cosmicFiberDecayedChance(20) - 0.003 * Math.pow(2, -0.65)) < 1e-15);
assert.ok(Scale.cosmicFiberDecayedChance(1000) < Scale.cosmicFiberDecayedChance(100));

state.stellarTreasureSeekingPurchased = true;
assert.ok(Math.abs(Scale.cosmicFiberChance(20) / Scale.cosmicFiberDecayedChance(20) - 1.5) < 1e-12,
  "星核寻珍必须作用于宇宙纤维");
state.stellarSeaGiftPurchased = true;
const awarded = WIS.Meta.Treasures.add(state, "cosmicFiber", 3);
assert.equal(awarded, 6, "星海馈赠必须把批量宝物N直接变为2N");
assert.equal(Scale.cosmicFiberCount(), 6);

state.challengeCompletions.galaxy = 1;
const expectedExponent = B.add("1.10", B.div(B.mul("0.005", 6), B.pow(B.add(1, B.div(6, 20)), "0.55")));
assert.equal(Scale.galaxyEffectiveExponent().eq(expectedExponent), true);
state.joules = "1e100";
assert.equal(Effects.dynamicResourceValue(state, "joules").eq(B.pow(state.joules, expectedExponent)), true,
  "银河必须先把J转换为J^E，再供动态公式读取");
state.activeChallenge = "galaxy";
assert.equal(Effects.dynamicResourceValue(state, "joules").eq(0), true,
  "银河挑战内动态资源失效必须优先于宇宙纤维奖励");
state.activeChallenge = null;

assert.equal(Scale.cosmicWillAvailable(), false, "未到宇宙结构不得判定宇宙意志");
state.highestScaleIndex = 14;
state.unlockedAchievements.scale14 = true;
assert.equal(Scale.cosmicWillAvailable(), true);
assert.ok(Math.abs(Scale.cosmicWillDecayedChance(0) - 0.005) < 1e-15);
assert.ok(Math.abs(Scale.cosmicWillDecayedChance(10) - 0.005 / Math.sqrt(2)) < 1e-15,
  "宇宙意志应沿用天晶数量衰减结构");
assert.ok(Number.isFinite(Scale.cosmicWillDecayedChance(Number.MAX_SAFE_INTEGER)));

const restored = WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(state));
assert.equal(restored.treasureImprints.cosmicFiber, 6);
assert.equal(restored.treasureImprints.cosmicWill, 0);
const legacy = WIS.Core.State.normalize({ unlockedAchievements: { scale13: true, scale14: true } });
assert.equal(legacy.treasureImprints.cosmicFiber, 0);
assert.equal(legacy.treasureImprints.cosmicWill, 0);

const scaleSource = fs.readFileSync(path.join(root, "js/power/scale.js"), "utf8");
const eventSource = fs.readFileSync(path.join(root, "js/simulation/treasure-events.js"), "utf8");
assert.match(scaleSource, /cosmicFiberRollAccumulator[\s\S]*rollCosmicFiberAttempts/);
assert.match(scaleSource, /cosmicWillRollAccumulator[\s\S]*rollCosmicWillAttempts/);
assert.match(eventSource, /cosmicFiber:[^\n]*treasureChanceDriver/);
assert.match(eventSource, /cosmicWill:[^\n]*treasureChanceDriver/);

console.log("cosmic treasure tests passed");
