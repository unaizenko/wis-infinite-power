const fs = require("fs");
const path = require("path");
const vm = require("vm");

global.window = global;

function load(relativePath) {
  const filename = path.join(__dirname, "..", relativePath);
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
  "js/simulation/step.js"
].forEach(load);

const BN = WIS.Core.BigNum.BN;
const add = WIS.Core.BigNum.add;
const { ZERO, div, gte, mul, sub } = WIS.Core.BigNum;
let state = WIS.Core.State.fresh();

WIS.Core.Runtime.bind({
  state: () => state,
  setState: (next) => { state = next; },
  saveState: () => {},
  requestRender: () => {},
  showNotice: () => {},
  markCostGroupsDirty: () => {},
  markAchievementsDirty: () => {}
});
WIS.Core.Resources.bind(() => state);

let invalidateDuringTreasure = false;
let invalidateDuringAutomation = true;
let boundaryTestMode = false;
let boundaryPowerRate = ZERO;
let automaticGainCalculations = 0;
const expectedRates = {
  joulesPerSecond: BN(11),
  powerPerSecond: BN(22),
  manaPerSecond: BN(33),
  immortalPowerPerSecond: BN(44),
  passiveTreasureManaPerSecond: BN(55)
};

WIS.Core.Registries.powerSystems.register({
  id: "rateTestPower",
  name: "Rate Test Power",
  calculateAutomaticGains(_projection, seconds) {
    automaticGainCalculations += 1;
    return {
      joules: BN(seconds),
      power: boundaryTestMode ? mul(boundaryPowerRate, seconds) : BN(seconds * 2),
      rates: {
        joulesPerSecond: expectedRates.joulesPerSecond,
        powerPerSecond: expectedRates.powerPerSecond
      }
    };
  },
  commitAutomaticGains(current, plan, { writeRates = true } = {}) {
    current.joules = add(current.joules, plan.joules);
    current.power = add(current.power, plan.power);
    if (writeRates) Object.assign(WIS.tmp.rates, plan.rates);
    return plan;
  },
  rollPassiveTreasure() {
    if (invalidateDuringTreasure) WIS.Core.Effects.invalidate();
    return 0;
  },
  afterStep(current) {
    if (!boundaryTestMode) return;
    let reachedScale = current.highestScaleIndex;
    WIS.Core.Config.scales.forEach((scale, index) => {
      if (gte(current.power, scale.power)) reachedScale = Math.max(reachedScale, index);
    });
    current.highestScaleIndex = reachedScale;
  }
});

WIS.Core.Registries.cultivationSystems.register({
  id: "rateTestCultivation",
  name: "Rate Test Cultivation",
  planAutomaticGain(_projection, seconds) {
    return {
      mana: BN(seconds * 3),
      immortalPower: BN(seconds * 4),
      elapsedSeconds: seconds,
      processedSeconds: seconds,
      completed: true,
      rates: {
        manaPerSecond: expectedRates.manaPerSecond,
        immortalPowerPerSecond: expectedRates.immortalPowerPerSecond,
        passiveTreasureManaPerSecond: expectedRates.passiveTreasureManaPerSecond
      }
    };
  },
  commitAutomaticGain(current, plan, { writeRates = true } = {}) {
    current.mana = add(current.mana, plan.mana);
    current.immortalPower = add(current.immortalPower, plan.immortalPower);
    if (writeRates) Object.assign(WIS.tmp.rates, plan.rates);
    return plan;
  },
  rollPassiveManaTreasure() { return 0; },
  rollCirculationTreasure() { return 0; },
  rollImmortalPowerTreasure() { return 0; }
});

state.powerSystem.active = "rateTestPower";
state.cultivation.active = "rateTestCultivation";

const Step = WIS.Simulation.Step.create({
  getState: () => state,
  persistStateNow: () => {},
  updateLifetimeStatistics: () => {},
  recordCurrentAchievements: () => false,
  markAchievementsDirty: () => {},
  markCostGroupsDirty: () => {},
  checkActiveChallengeCompletion: () => false,
  autoBreakthroughImmortalRealms: () => 0,
  runAchievementAutomations: () => {
    if (!invalidateDuringAutomation) return 0;
    WIS.Core.Effects.invalidate();
    return 1;
  },
  showScaleNotice: () => {},
  simulationStepSeconds: 0.1,
  epsilon: 1e-10,
  boundaryBisections: 16
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertRate(key, expected) {
  assert(
    WIS.Core.BigNum.eq(WIS.tmp.rates[key], expected),
    `${key} was not preserved: actual=${WIS.tmp.rates[key]} expected=${expected}`
  );
}

function assertCommittedRates() {
  Object.entries(expectedRates).forEach(([key, value]) => assertRate(key, value));
}

Step.advanceGameStep(0.1, false);
assertCommittedRates();

for (let tick = 0; tick < 5; tick += 1) {
  Step.advanceGameStep(0.1, false);
  assertCommittedRates();
}

invalidateDuringAutomation = false;
invalidateDuringTreasure = true;
Step.advanceGameStep(0.1, false);
assertCommittedRates();

const liveRates = {
  joulesPerSecond: BN(101),
  powerPerSecond: BN(102),
  manaPerSecond: BN(103),
  immortalPowerPerSecond: BN(104),
  passiveTreasureManaPerSecond: BN(105)
};
Object.assign(WIS.tmp.rates, liveRates);
Step.advanceGameStep(0.1, false, { projection: true, skipTreasureRolls: true });
Object.entries(liveRates).forEach(([key, value]) => assertRate(key, value));

assert(state.joules.gt(0), "actual joules gain was not committed");
assert(state.power.gt(0), "actual power gain was not committed");
assert(state.mana.gt(0), "actual mana gain was not committed");
assert(state.immortalPower.gt(0), "actual immortal power gain was not committed");

invalidateDuringTreasure = false;
boundaryTestMode = true;
state = WIS.Core.State.fresh();
state.powerSystem.active = "rateTestPower";
state.cultivation.active = "rateTestCultivation";
const firstBoundary = WIS.Core.Config.scales[1].power;
boundaryPowerRate = div(firstBoundary, 0.5);
automaticGainCalculations = 0;
const offlineBoundaryResult = Step.advanceGameStep(10, true, {
  offline: true,
  skipTreasureRolls: true
});
const offlineBoundaryCalculations = automaticGainCalculations;
assert(offlineBoundaryResult.processedSeconds > 0, "offline boundary made no progress");
assert(offlineBoundaryResult.remainingSeconds > 0, "offline boundary consumed the full segment");
assert(state.highestScaleIndex === 1, "offline step crossed more than one scale boundary");
assert(offlineBoundaryCalculations <= 10,
  `offline boundary used more than one 8-pass search: ${offlineBoundaryCalculations}`);

state = WIS.Core.State.fresh();
state.powerSystem.active = "rateTestPower";
state.cultivation.active = "rateTestCultivation";
automaticGainCalculations = 0;
Step.advanceGameStep(10, false, { skipTreasureRolls: true });
assert(automaticGainCalculations > offlineBoundaryCalculations,
  "online boundary no longer uses the existing higher precision search");

boundaryTestMode = false;
state = WIS.Core.State.fresh();
state.powerSystem.active = "rateTestPower";
state.cultivation.active = "rateTestCultivation";
state.highestScaleIndex = WIS.Core.Config.scales.length - 1;
const beforeDay = {
  joules: state.joules,
  power: state.power,
  mana: state.mana,
  immortalPower: state.immortalPower
};
const dayResult = Step.advanceGameStep(86400, true, {
  offline: true,
  skipTreasureRolls: true
});
assert(dayResult.processedSeconds === 86400 && dayResult.remainingSeconds === 0,
  "boundary-free offline day was not fully committed");
assert(WIS.Core.BigNum.eq(sub(state.joules, beforeDay.joules), BN(86400)),
  "offline day joules gain was incorrect");
assert(WIS.Core.BigNum.eq(sub(state.power, beforeDay.power), BN(172800)),
  "offline day power gain was incorrect");
assert(WIS.Core.BigNum.eq(sub(state.mana, beforeDay.mana), BN(259200)),
  "offline day mana gain was incorrect");
assert(WIS.Core.BigNum.eq(sub(state.immortalPower, beforeDay.immortalPower), BN(345600)),
  "offline day immortal power gain was incorrect");

const offlineSource = fs.readFileSync(path.join(__dirname, "..", "js/simulation/offline.js"), "utf8");
assert(/advanceGameStep\(requestedSeconds, true, \{ offline: true \}\)/.test(offlineSource),
  "offline scheduler does not pass offline:true");

console.log("tick rate lifecycle tests passed");
