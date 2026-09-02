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
  has: (current, key) => current.unlockedAchievements?.[key] === true,
  record: (current, key) => { current.unlockedAchievements[key] = true; }
});
WIS.Meta.Treasures = Object.freeze({ add() {} });
WIS.Meta.Challenges = Object.freeze({
  completionCount: (current, key) => Math.max(0, Number(current.challengeCompletions?.[key]) || 0)
});

let state = WIS.Core.State.fresh();
let noticeCount = 0;
WIS.Core.Runtime.bind({
  state: () => state,
  setState: (nextState) => { state = nextState; },
  save: () => {},
  render: () => {},
  showNotice: () => { noticeCount += 1; },
  achievementStates: () => ({}),
  notifyNewAchievements: () => {},
  cultivationUnlocked: () => true,
  treasuresUnlocked: () => true,
  applyResourceSoftcapProgressive: (gain) => gain,
  updateLifetimeStatistics: () => {},
  checkActiveChallengeCompletion: () => false,
  celestialDeclineExponent: () => 1
});
WIS.Core.Resources.bind(() => state);
load("js/cultivation/immortal-logic.js");
load("js/cultivation/immortal.js");

const Immortal = WIS.Cultivation.ImmortalLogic;
const B = WIS.Core.BigNum;
const { ZERO, ONE, add, sub, mul, div, abs, max, eq, toNumber } = B;

function close(actual, expected, tolerance = 2e-12, message = "") {
  const scale = max(ONE, abs(expected));
  const relativeError = toNumber(div(abs(sub(actual, expected)), scale), Infinity);
  assert.ok(relativeError <= tolerance,
    message + " actual=" + actual + " expected=" + expected);
}

function resetQi(currentLayer, mana) {
  state = WIS.Core.State.fresh();
  state.cultivation.active = "immortal";
  state.activeChallenge = "qiRefiningHundredThousandYears";
  state.qiRefiningUnlocked = true;
  state.currentQiLayer = currentLayer;
  state.mana = B.BN(mana);
  noticeCount = 0;
}

function sequentialCost(fromLayer, toLayer) {
  let total = ZERO;
  for (let layer = fromLayer; layer <= toLayer; layer += 1) {
    total = add(total, Immortal.qiLayerRequirement(layer));
  }
  return total;
}

let seed = 0x5f3759df;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 0x100000000;
}

for (let sample = 0; sample < 80; sample += 1) {
  const fromLayer = 2 + Math.floor(random() * 120000);
  const toLayer = fromLayer + Math.floor(random() * 700);
  close(Immortal.qiLayerCumulativeCost(fromLayer, toLayer),
    sequentialCost(fromLayer, toLayer), 2e-12,
    "随机累计费用 " + fromLayer + "-" + toLayer);
}

resetQi(1, Immortal.qiLayerRequirement(2));
assert.equal(Immortal.advanceQiLayersBatch(false), 1);
assert.equal(state.currentQiLayer, 2);
assert.ok(eq(state.mana, ZERO));

const multiCost = Immortal.qiLayerCumulativeCost(11, 25);
const halfNextCost = mul(Immortal.qiLayerRequirement(26), 0.5);
resetQi(10, add(multiCost, halfNextCost));
assert.equal(Immortal.maxAffordableQiLayer(10, state.mana), 25);
assert.equal(Immortal.advanceQiLayersBatch(false), 15);
assert.equal(state.currentQiLayer, 25);
close(state.mana, halfNextCost);

resetQi(250, mul(Immortal.qiLayerRequirement(251), 0.999));
const insufficientMana = state.mana.toString();
assert.equal(Immortal.advanceQiLayersBatch(false), 0);
assert.equal(state.currentQiLayer, 250);
assert.equal(state.mana.toString(), insufficientMana);

const manyLayerCost = Immortal.qiLayerCumulativeCost(2, 50000);
resetQi(1, manyLayerCost);
const challengePlan = Immortal.planAutomaticManaGain(0.1);
assert.notEqual(challengePlan.event?.type, "manaRealmRequirement");
assert.equal(Immortal.advanceQiLayersBatch(false), 49999);
assert.equal(state.currentQiLayer, 50000);

const completionCost = Immortal.qiLayerCumulativeCost(99991, 100000);
resetQi(99990, completionCost);
assert.equal(Immortal.advanceQiLayersBatch(false), 10);
assert.equal(state.currentQiLayer, 100000);
assert.equal(state.challengeCompletions.qiRefiningHundredThousandYears, 1);
assert.equal(noticeCount, 1);
assert.equal(Immortal.advanceQiLayersBatch(false), 0);
assert.equal(noticeCount, 1);

resetQi(100000, Immortal.qiLayerRequirement(100001));
assert.equal(Immortal.advanceQiLayersBatch(false), 1);
assert.equal(state.currentQiLayer, 100001);

state = WIS.Core.State.fresh();
state.cultivation.active = "immortal";
state.qiRefiningUnlocked = true;
state.circulationUnlocked = true;
state.joules = B.BN("1e20");
state.mana = sub(Immortal.qiLayerRequirement(2), ONE);
assert.equal(Immortal.planAutomaticManaGain(1).event?.type, "manaRealmRequirement");

const immortalSource = fs.readFileSync(path.join(root, "js/cultivation/immortal-logic.js"), "utf8");
assert.doesNotMatch(immortalSource, /while\s*\(layers\s*<\s*64/);
assert.match(immortalSource, /return advanceQiLayersBatch\(false\)/);
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
assert.match(gameSource, /key === "currentQiLayer"/);

console.log("qi-layer-batch tests passed");
