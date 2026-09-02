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

WIS.Meta.Achievements = Object.freeze({
  has: (state, key) => state.unlockedAchievements?.[key] === true,
  record: (state, key) => { state.unlockedAchievements[key] = true; }
});
WIS.Meta.Treasures = Object.freeze({
  add: (state, key, amount = 1) => { state.treasureImprints[key] = (state.treasureImprints[key] || 0) + amount; }
});

let state = WIS.Core.State.fresh();
WIS.Core.Runtime.bind({
  state: () => state,
  setState: (nextState) => { state = nextState; },
  save: () => {},
  render: () => {},
  showNotice: () => {},
  achievementStates: () => ({}),
  notifyNewAchievements: () => {},
  cultivationUnlocked: () => true,
  treasuresUnlocked: () => true,
  format: (value) => String(value),
  freshState: () => WIS.Core.State.fresh(),
  updateLifetimeStatistics: () => {},
  checkActiveChallengeCompletion: () => WIS.Meta.Challenges?.checkActiveChallengeCompletion?.(),
  resetTransientAccumulators: () => {},
  resetCultivationPage: () => {},
  applyResourceSoftcapProgressive: (gain) => gain,
  celestialDeclineExponent: () => 1
});
WIS.Core.Resources.bind(() => state);

load("js/cultivation/immortal-logic.js");
load("js/cultivation/immortal.js");
load("js/power/scale-logic.js");
load("js/power/scale.js");
load("js/meta/challenges.js");

const Immortal = WIS.Cultivation.ImmortalLogic;
const ScaleLogic = WIS.Power.ScaleLogic;
const BigNum = WIS.Core.BigNum;
const { ZERO, ONE, add, sub, div, log10, abs, max, eq, lt, gt, gte, isFiniteBN, toNumber } = BigNum;
const strictEqual = assert.equal.bind(assert);
assert.equal = (actual, expected, message) => {
  if (BigNum.isDecimal(actual) || BigNum.isDecimal(expected)) {
    const close = eq(actual, expected) || toNumber(div(abs(sub(actual, expected)), max(ONE, abs(expected))), Infinity) <= 1e-12;
    assert.ok(close, `${message || "Decimal values differ"}: actual=${actual} expected=${expected}`);
    return;
  }
  strictEqual(actual, expected, message);
};
function reset(overrides = {}) {
  state = WIS.Core.State.fresh();
  state.cultivation.active = "immortal";
  Object.assign(state, overrides);
  state.immortalSpiritPowerUnlocked = state.advancedRealmLevel >= WIS.Core.Config.immortalPower.unlockAdvancedRealmLevel;
  return state;
}

const citySoftcapThreshold = WIS.Core.Config.softcaps
  .find((stage) => stage.name === "爆城").threshold;
reset({
  qiRefiningUnlocked: true,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  advancedRealmLevel: 1,
  power: citySoftcapThreshold
});
assert.equal(typeof ScaleLogic.applyResourceSoftcapRate, "function");
assert.equal(typeof ScaleLogic.applyResourceSoftcapOverTime, "function");
assert.equal(typeof ScaleLogic.applyResourceSoftcapProgressive, "function");
assert.equal(ScaleLogic.applyResourceSoftcapOverTime(NaN, state.power, 1), 0);
assert.equal(ScaleLogic.applyResourceSoftcapOverTime(1, Infinity, 1), 0);
assert.equal(ScaleLogic.applyResourceSoftcapOverTime(Infinity, state.power, 1), 0);
const nextCityIntegrationBoundary = ScaleLogic
  .nextResourceSoftcapIntegrationBoundary(citySoftcapThreshold);
const nextCityIntegrationLogStep = Math.log10(
  nextCityIntegrationBoundary / citySoftcapThreshold
);
assert.ok(
  nextCityIntegrationBoundary > citySoftcapThreshold
    && nextCityIntegrationLogStep <= 0.01 + 1e-12,
  "软上限启动后应在固定网格的下一个0.01数量级边界前重新计算指数"
);
const largeDiscreteRawGain = 1e20;
assert.ok(
  lt(ScaleLogic.applyResourceSoftcapProgressive(largeDiscreteRawGain, citySoftcapThreshold),
    ScaleLogic.applyResourceSoftcapRate(largeDiscreteRawGain, citySoftcapThreshold)),
  "离散大收益跨过爆城后必须在量级内部持续增强软上限"
);
function integrateResourceRate(stepCount, rawRate, initialAmount, totalSeconds) {
  let amount = initialAmount;
  let totalGain = 0;
  for (let step = 0; step < stepCount; step += 1) {
    const gain = ScaleLogic.applyResourceSoftcapOverTime(
      rawRate,
      amount,
      totalSeconds / stepCount
    );
    amount = add(amount, gain);
    totalGain = add(totalGain, gain);
  }
  return totalGain;
}
const oneSecondSoftcapGain = integrateResourceRate(1, 1e20, citySoftcapThreshold, 1);
const tenSubstepSoftcapGain = integrateResourceRate(10, 1e20, citySoftcapThreshold, 1);
const resourceSoftcapTickDifference = Math.abs(
  oneSecondSoftcapGain - tenSubstepSoftcapGain
) / tenSubstepSoftcapGain;
assert.ok(
  resourceSoftcapTickDifference < 1e-6,
  "自动资源软上限不应因1秒或10个0.1秒的Tick拆分产生结构性差异"
);
const rateSourceGain = ScaleLogic.preSoftcapPowerGainFromSources([1e12]);
assert.equal(
  ScaleLogic.finalPowerGainFromSources([1e12]),
  ScaleLogic.applyResourceSoftcapEffectiveRate(rateSourceGain, state.power),
  "UI战力/秒必须显示当前资源位置的瞬时软上限速率"
);
state.joules = citySoftcapThreshold;
const jRateSourceGain = ScaleLogic.preSoftcapJGainFromSources([1e12]);
assert.equal(
  ScaleLogic.finalJPerSecondFromSources([1e12]),
  ScaleLogic.applyResourceSoftcapEffectiveRate(jRateSourceGain, state.joules),
  "UI J/秒必须显示当前资源位置的瞬时软上限速率"
);
state.joules = 1e30;
const trainingRawGain = ScaleLogic.preSoftcapPowerGainFromSources([
  ScaleLogic.challengeAdjustedPowerSource(ScaleLogic.trainingPowerSource(), "training")
]);
assert.equal(
  ScaleLogic.conversionGain(),
  ScaleLogic.applyResourceSoftcapProgressive(trainingRawGain, state.power),
  "手动锻炼必须继续使用离散收益渐进软上限"
);
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
assert.doesNotMatch(
  gameSource,
  /function\s+(?:resourceSoftcapExponent|applyResourceSoftcap|applyResourceSoftcapProgressive)/,
  "game.js不应继续定义通用量级软上限"
);

reset({ highestScaleIndex: 3, power: 8e7, ghostBackActive: true });
ScaleLogic.toggleGhostBack();
assert.equal(state.ghostBackActive, true, "未购买爆屋强化时鬼背操作必须不可用");
ScaleLogic.buyGhostBack();
assert.equal(state.ghostBackPurchased, true, "鬼背必须以8e7战力购买爆屋强化后解锁");
assert.equal(state.power, 0, "购买鬼背强化必须扣除8e7战力");
ScaleLogic.toggleGhostBack();
assert.equal(state.ghostBackActive, false, "购买后鬼背开关应可正常操作");
ScaleLogic.toggleGhostBack();
WIS.Core.Effects.beginTick(state);
assert.equal(WIS.Core.Effects.value("ghostBackJ", state), 0.75);
assert.equal(WIS.Core.Effects.value("ghostBackPower", state), 1.75);
const reincarnatedAfterGhostBack = WIS.Core.Reset.apply("reincarnation", state, () => WIS.Core.State.fresh());
assert.equal(reincarnatedAfterGhostBack.ghostBackPurchased, false,
  "鬼背购买应作为普通量级强化随转世重置");
assert.equal(reincarnatedAfterGhostBack.ghostBackActive, false,
  "鬼背开关应随转世重置");

reset({ highestScaleIndex: 3, power: 8e7, scaleUpgradeAutomationEnabled: true });
state.unlockedAchievements.scale6 = true;
state.powerSystem.systems.scale.history.manualUpgrades.ghostBackPurchased = true;
assert.ok(ScaleLogic.autoUpgradeEnhancements() >= 1, "自动强化应可重购历史中购买过的鬼背");
assert.equal(state.ghostBackPurchased, true);

reset({ qiRefiningUnlocked: true, foundationUnlocked: true, goldenCoreUnlocked: true, advancedRealmLevel: 5, mana: 1e30 });
assert.equal(Immortal.immortalPowerUnlocked(), false, "真仙前不得生成仙灵力");
assert.equal(Immortal.immortalPowerPerSecond(), 0, "真仙前仙灵力产量应为0");
assert.equal(state.immortalSpiritPowerUnlocked, false, "真仙前不得保留仙灵力免费能力");
Immortal.unlockAdvancedRealm(5);
assert.equal(state.advancedRealmLevel, 6, "达到真仙条件后应正常突破真仙");
assert.equal(state.immortalSpiritPowerUnlocked, true, "重新抵达真仙时应自动解锁免费仙灵力能力");

reset({
  qiRefiningUnlocked: true,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  advancedRealmLevel: 5,
  mana: 1e30,
  immortalRealmAutomationEnabled: true
});
state.unlockedAchievements.bodyIntegration = true;
state.cultivation.systems.immortal.history.manualRealmLevel = 9;
assert.ok(Immortal.autoBreakthroughImmortalRealms() >= 1, "境界自动突破应能从大乘晋升真仙");
assert.equal(state.advancedRealmLevel, 6);
assert.equal(state.immortalSpiritPowerUnlocked, true,
  "境界自动突破抵达真仙时必须立即解锁仙灵力能力");

reset({ qiRefiningUnlocked: true, foundationUnlocked: true, goldenCoreUnlocked: true, advancedRealmLevel: 6, immortalSpiritPowerUnlocked: true, mana: 4e20 });
assert.equal(state.immortalSpiritPowerUnlocked, true, "抵达真仙后应自动解锁免费仙灵力能力");
assert.equal(Immortal.immortalPowerBasePerSecond(), 2, "仙灵力基础公式应为(mana/1e20)^0.5");
const scatteredAfterTrueImmortal = WIS.Core.Reset.apply(
  "scatter", state, () => WIS.Core.State.fresh(), { context: { nextScatterLevel: 1 } }
);
assert.equal(scatteredAfterTrueImmortal.advancedRealmLevel, 0);
assert.equal(scatteredAfterTrueImmortal.immortalSpiritPowerUnlocked, false,
  "真仙境界重置后必须失去免费仙灵力能力");
assert.equal(Immortal.immortalPowerRealmCost(6), 1e11);
assert.equal(Immortal.immortalPowerRealmCost(7), 1e16);
assert.equal(Immortal.immortalPowerRealmCost(8), 5e20);
assert.equal(Immortal.immortalPowerRealmCost(9), 1e26);
Object.entries({
  undyingPrimordialSpirit: 4e8,
  xuanImmortalBody: 6.67e8,
  law: 1.2e9,
  immortalApertureII: 2e10,
  spiritDomain: 5e10,
  threadsOfLaw: 2e11,
  immortalApertureIII: 8e11,
  spiritCaptureReturn: 2e12,
  indestructibleDharmaBody: 5e12,
  fiveElementsTreasure: 1e13,
  immortalApertureIV: 5e13,
  immortalApertureV: 5e15,
  lawAffinity: 2e16,
  flawlessJadeBody: 5e16,
  spiritDomainWorldTransformation: 1e17,
  immortalApertureVI: 3e17,
  soulQualitativeChange: 1e18,
  immortalApertureVII: 5e18,
  trinity: 5e19,
  unityWithDao: 1.5e20,
  lawOrigin: 5e20,
  lawCrystalFilament: 1.5e21,
  severThreeCorpses: 5e21,
  ultimateImmortalAperture: 1.5e22
}).forEach(([key, expected]) => assert.equal(WIS.Core.Config.immortalPower.abilityCosts[key], expected));
assert.equal(WIS.Core.Config.immortalPower.spiritDomain.immortalPowerScale, 1e11);
assert.equal(WIS.Core.Config.immortalPower.spiritCaptureReturn.immortalPowerScale, 1e11);
assert.equal(WIS.Core.Config.immortalPower.spiritCaptureReturn.targetImmortalPower, 1e16);
assert.equal(WIS.Core.Config.immortalPower.soulQualitativeChange.immortalPowerScale, 1e16);
assert.equal(WIS.Core.Config.immortalPower.immortalAperture.baseCost, 4e6);

state.immortalPower = 0;
assert.equal(Immortal.immortalPowerManaSuppressionExponent(), 1);
assert.equal(Immortal.celestialDeclineExponent(), 1);
assert.equal(Immortal.applyImmortalPowerManaSuppression(1e6), 1e6);
state.immortalPower = 2.5e10;
assert.ok(Math.abs(Immortal.immortalPowerManaSuppressionExponent() - 0.85) < 1e-12);
assert.ok(Math.abs(Immortal.celestialDeclineExponent() - 0.92) < 1e-12);
state.immortalPower = 1e11;
assert.ok(Math.abs(Immortal.immortalPowerManaSuppressionExponent() - 0.7) < 1e-12);
assert.ok(Math.abs(Immortal.celestialDeclineExponent() - 0.84) < 1e-12);
assert.ok(Immortal.applyImmortalPowerManaSuppression(1e6) < 1e6, "主动与自动法力均应经过仙灵力压制");

state.immortalApertureLevel = 6;
assert.ok(Math.abs(Immortal.immortalApertureMultiplier() - Math.pow(1.1, 6) * 1.25) < 1e-12);
const immortalApertureTotalCost = Array.from(
  { length: WIS.Core.Config.immortalPower.immortalAperture.baseCap },
  (_, level) => Immortal.immortalApertureCost(level)
).reduce((total, cost) => add(total, cost), ZERO);
assert.ok(
  Math.abs(immortalApertureTotalCost - 3.17e9) / 3.17e9 < 0.002,
  `36级仙窍总成本应约为3.17e9，实际为${immortalApertureTotalCost}`
);
state.lawUnlocked = true;
state.mana = 1e24;
assert.ok(Math.abs(
  Immortal.lawImmortalPowerMultiplier() -
    (1 + Math.pow(Math.log10(2), Immortal.lawImmortalPowerActualExponent()))
) < 1e-12);
assert.equal(WIS.Core.Effects.product("power", "regionExponent", state), 1, "法则不得继续强化战力区域");

reset({ qiRefiningUnlocked: true, foundationUnlocked: true, goldenCoreUnlocked: true, advancedRealmLevel: 6, immortalPower: 4e8 });
Immortal.unlockTrueImmortalAbility("undyingPrimordialSpiritUnlocked", 4e8);
assert.equal(state.undyingPrimordialSpiritUnlocked, true);
assert.equal(state.immortalPower, 0);

reset({ qiRefiningUnlocked: true, foundationUnlocked: true, goldenCoreUnlocked: true, advancedRealmLevel: 6, immortalPower: 4e6 });
Immortal.buyImmortalAperture();
assert.equal(state.immortalApertureLevel, 1);
assert.equal(state.immortalPower, 0);

reset({ qiRefiningUnlocked: true, foundationUnlocked: true, goldenCoreUnlocked: true, advancedRealmLevel: 6, mana: 1e30, immortalPower: 1e11 });
Immortal.unlockAdvancedRealm(6);
assert.equal(state.advancedRealmLevel, 7, "金仙突破应读取仙灵力");
assert.equal(state.immortalPower, 0, "突破应扣除1e11仙灵力");
assert.equal(state.mana, 1e30, "金仙突破不得消耗法力");
assert.equal(Immortal.immortalPowerManaSuppressionExponent(), 1, "突破后应按太乙需求解除当前压制");
assert.equal(Immortal.celestialDeclineExponent(), 1, "突破后J/战力也应按太乙需求重新计算");
assert.equal(Immortal.nextImmortalPowerRealmCost(), 1e16, "突破金仙后应切换至太乙仙灵力需求");
state.immortalPower = 1e13;
assert.ok(Math.abs(
  Immortal.immortalPowerManaSuppressionExponent() - Immortal.celestialFiveDeclineExponent()
) < 1e-12, "金仙后法力应改由天人五衰接管");
assert.ok(Math.abs(
  Immortal.celestialDeclineExponent() - Immortal.celestialFiveDeclineExponent()
) < 1e-12, "金仙后J/战力应改由同一天人五衰指数接管");
state.immortalPower = 0;
Immortal.unlockAdvancedRealm(7);
assert.equal(state.advancedRealmLevel, 7, "巨量法力不得绕过1e16仙灵力需求连续突破太乙");

const migrated = WIS.Core.State.migrate(40, {
  cultivationSystem: "仙道",
  mana: 1e40,
  qiRefiningUnlocked: true,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  advancedRealmLevel: 6
});
assert.equal(migrated.immortalPower, 0, "旧存档不得追补仙灵力");
assert.equal(migrated.mana, 1e40, "旧存档法力应保留");

const progressedLegacySave = WIS.Core.State.migrate(40, {
  cultivationSystem: "仙道",
  qiRefiningUnlocked: true,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  advancedRealmLevel: 8,
  undyingPrimordialSpiritUnlocked: true,
  immortalApertureLevel: 12,
  immortalPower: 0
});
assert.equal(progressedLegacySave.advancedRealmLevel, 8, "旧存档已经突破的境界不得回退");
assert.equal(progressedLegacySave.undyingPrimordialSpiritUnlocked, true, "旧存档已购买能力不得回退");
assert.equal(progressedLegacySave.immortalApertureLevel, 12, "旧存档仙窍等级不得回退");

function simulateAutomatic(stepCount, totalSeconds) {
  reset({
    qiRefiningUnlocked: true,
    foundationUnlocked: true,
    goldenCoreUnlocked: true,
    advancedRealmLevel: 6,
    circulationUnlocked: true,
    roamSpiritWorldUnlocked: true,
    immortalApertureLevel: 36,
    mana: 1e20,
    joules: 1e80,
    power: 1e60,
    immortalPower: 9.9e7
  });
  let finalSettlement = null;
  for (let step = 0; step < stepCount; step += 1) {
    finalSettlement = Immortal.automaticManaGainProgressive(totalSeconds / stepCount);
  }
  return { mana: state.mana, immortalPower: state.immortalPower, settlement: finalSettlement };
}

const oneLargeStep = simulateAutomatic(1, 10000);
const offlineMaximumSteps = simulateAutomatic(600, 10000);
const manySmallSteps = simulateAutomatic(1000, 10000);
const manaDifference = Math.abs(oneLargeStep.mana - manySmallSteps.mana) / manySmallSteps.mana;
const immortalPowerDifference = Math.abs(oneLargeStep.immortalPower - manySmallSteps.immortalPower) /
  manySmallSteps.immortalPower;
const offlineManaDifference = Math.abs(offlineMaximumSteps.mana - manySmallSteps.mana) / manySmallSteps.mana;
const offlineImmortalPowerDifference = Math.abs(offlineMaximumSteps.immortalPower - manySmallSteps.immortalPower) /
  manySmallSteps.immortalPower;
assert.ok(oneLargeStep.settlement.segments <= 16 && !oneLargeStep.settlement.capped,
  "单次极端大步必须在16个自适应分段内完整结算");
assert.ok(manaDifference < 0.35,
  `聚合探寻判定后的单次极端大步法力差异过大：${manaDifference}`);
assert.ok(immortalPowerDifference < 0.01, `单次极端大步仙灵力误差过大：${immortalPowerDifference}`);
assert.ok(offlineManaDifference < 0.001, `离线600步法力误差过大：${offlineManaDifference}`);
assert.ok(offlineImmortalPowerDifference < 0.001, `离线600步仙灵力误差过大：${offlineImmortalPowerDifference}`);
assert.ok(isFiniteBN(oneLargeStep.mana) && isFiniteBN(oneLargeStep.immortalPower), "大Tick结算不得产生NaN或Infinity");

reset({
  highestPower: 1e40,
  power: 1e40,
  ghostBrainPurchased: true,
  mentalDomainPurchased: true,
  skySplitPurchased: true,
  energyCyclePurchased: true,
  brainDomainDevelopmentPurchased: true
});
const ghostBrainAttenuation = Math.pow(1 + 1e40 / 1e30, 0.17);
const expectedGhostBrainBase = Math.pow(1e40, 0.6) / (250 * ghostBrainAttenuation);
assert.ok(
  Math.abs(ScaleLogic.ghostBrainPotentialPowerBonus() - expectedGhostBrainBase) / expectedGhostBrainBase < 1e-12,
  "鬼脑基础应使用连续高战力衰减公式"
);
const adjustedGhostBrainSource = ScaleLogic.ghostBrainPowerSource();
assert.ok(
  adjustedGhostBrainSource >= 1e27 && adjustedGhostBrainSource <= 1e28,
  `1e40最高战力下的完整鬼脑来源应落在1e27～1e28，实际为${adjustedGhostBrainSource}`
);

reset({
  qiRefiningUnlocked: true,
  foundationUnlocked: true,
  goldenCoreUnlocked: true,
  advancedRealmLevel: 5,
  roamSpiritWorldUnlocked: true,
  mana: 1e20,
  power: 1e40
});
const fullExplorationAmount = Immortal.explorationAmountForCost(Immortal.explorationPowerCost());
assert.equal(WIS.Core.Config.exploration.automaticEfficiency, 0.0002);
assert.ok(
  Math.abs(Immortal.automaticExplorationAmountPerSecond() / fullExplorationAmount - 0.0002) < 1e-15,
  "纵横灵界的法力、探寻量、负荷与判定应统一使用0.02%/秒"
);

const { smoothPowerSoftcap } = WIS.Core.Formulas;
assert.equal(smoothPowerSoftcap(0, 1e14, 1, 0.15, 12), 0);
assert.equal(smoothPowerSoftcap(-1, 1e14, 1, 0.15, 12), 0);
assert.equal(smoothPowerSoftcap(NaN, 1e14, 1, 0.15, 12), 0);
assert.equal(smoothPowerSoftcap(Infinity, 1e14, 1, 0.15, 12), 0);
const explorationScaleValue = smoothPowerSoftcap(1e14, 1e14, 1, 0.15, 12);
const expectedExplorationScaleValue = 1e14 / Math.pow(2, (1 - 0.15) / 12);
assert.ok(
  Math.abs(explorationScaleValue - expectedExplorationScaleValue) / expectedExplorationScaleValue < 1e-12,
  "公共平滑幂软上限应符合统一公式"
);
const justBelowExplorationScale = smoothPowerSoftcap(1e14 * (1 - 1e-9), 1e14, 1, 0.15, 12);
const justAboveExplorationScale = smoothPowerSoftcap(1e14 * (1 + 1e-9), 1e14, 1, 0.15, 12);
assert.ok(
  Math.abs(justAboveExplorationScale - justBelowExplorationScale) / explorationScaleValue < 3e-9,
  "公共平滑幂软上限在衰减尺度处必须连续"
);

reset({ mana: 1e30, natalMagicTreasureUnlocked: true });
const magicCurveConfig = WIS.Core.Config.magicTreasure.manaCurve;
assert.ok(
  Math.abs(
    Immortal.magicTreasureManaCurve() -
    smoothPowerSoftcap(1e30, magicCurveConfig.scale, 0.8, 0.76, magicCurveConfig.sharpness)
  ) / Immortal.magicTreasureManaCurve() < 1e-12,
  "法宝应调用公共平滑幂软上限"
);
state.natalMagicTreasureUnlocked = false;
assert.ok(
  Math.abs(Immortal.magicTreasureManaCurve() - Math.pow(1e30, 0.65)) / Math.pow(1e30, 0.65) < 1e-12,
  "未解锁本命法宝时原有0.65指数应保持不变"
);

const explorationCurveConfig = WIS.Core.Config.exploration.manaCurve;
assert.equal(
  Immortal.explorationManaAmount(1e16),
  smoothPowerSoftcap(1e16, explorationCurveConfig.scale, 1, 0.15, explorationCurveConfig.sharpness),
  "有效探寻量转法力应调用公共平滑幂软上限"
);
const focusCurveConfig = WIS.Core.Config.focus.sourceCurve;
assert.equal(
  ScaleLogic.applyFocusSmoothSoftcap(1e16),
  smoothPowerSoftcap(1e16, focusCurveConfig.scale, 1, 0.75, focusCurveConfig.sharpness),
  "集中来源应调用公共平滑幂软上限"
);

reset();
state.treasureImprints.tianNiPearl = 8666;
const tianNiPearlEffectiveMultiplier = Immortal.tianNiPearlManaMultiplier();
assert.ok(Math.abs(Immortal.tianNiPearlRawManaMultiplier() - 44.33) < 1e-12);
assert.ok(
  tianNiPearlEffectiveMultiplier > 24 && tianNiPearlEffectiveMultiplier < 26,
  `天逆珠原始×44.33时实际倍率应约为×25，实际为${tianNiPearlEffectiveMultiplier}`
);
assert.equal(WIS.Core.Effects.value("tianNiPearlMana", state), tianNiPearlEffectiveMultiplier);

state.treasureImprints.xuTianDing = 5372;
const naturalTreasureEffectiveMultiplier = Immortal.naturalTreasureManaMultiplier();
assert.ok(Math.abs(Immortal.naturalTreasureRawManaMultiplier() - 27.86) < 1e-12);
assert.ok(
  naturalTreasureEffectiveMultiplier > 18.5 && naturalTreasureEffectiveMultiplier < 19.5,
  `天材地宝原始×27.86时实际倍率应约为×19，实际为${naturalTreasureEffectiveMultiplier}`
);
assert.equal(WIS.Core.Effects.value("naturalTreasureMana", state), naturalTreasureEffectiveMultiplier);

state.spiritWorldAscensionUnlocked = true;
assert.equal(WIS.Core.Effects.value("spiritWorldAscension", state), 8, "飞升灵界探寻法力倍率应为×8");
assert.equal(WIS.Core.Config.exploration.automaticEfficiency, 0.0002, "纵横灵界比例不得改动");
Object.entries({
  highestPowerExponent: 0.6,
  divisor: 250,
  attenuationScale: 1e30,
  attenuationExponent: 0.17
}).forEach(([key, expected]) => assert.equal(WIS.Core.Config.ghostBrain[key], expected, "鬼脑连续衰减参数不得改动"));

reset({ advancedRealmLevel: 6, mana: 1e30, immortalPower: 2.5e10, lawUnlocked: true });
assert.ok(Math.abs(Immortal.immortalPowerManaSuppressionExponent() - 0.85) < 1e-12, "真仙法力应继续使用原天人三衰");
assert.ok(Math.abs(Immortal.celestialDeclineExponent() - 0.92) < 1e-12, "真仙J/战力应继续使用原天人三衰");
assert.equal(Immortal.celestialFiveDeclineExponent(), 1, "真仙阶段不得提前启用天人五衰");

reset({ advancedRealmLevel: 7, mana: 1e30, immortalPower: 1e11, lawUnlocked: true });
assert.equal(Immortal.celestialFiveDeclineExponent(), 1, "金仙入口五衰应为^1.00");
state.immortalPower = Math.sqrt(1e11 * 1e16);
const middleGoldenFiveDeclineExponent = Immortal.celestialFiveDeclineExponent();
assert.ok(Math.abs(middleGoldenFiveDeclineExponent - (1 - 0.2 * Math.sqrt(0.5))) < 1e-12, "金仙五衰应直接按新境界需求的对数区间推进");
assert.ok(Math.abs(Immortal.immortalPowerManaSuppressionExponent() - middleGoldenFiveDeclineExponent) < 1e-12, "金仙法力压制应由五衰接管");
assert.ok(Math.abs(Immortal.celestialDeclineExponent() - middleGoldenFiveDeclineExponent) < 1e-12, "金仙J/战力压制应由同一五衰指数接管");
assert.ok(Math.abs(
  Immortal.applyImmortalPowerManaSuppression(1e12) - Math.pow(1e12, middleGoldenFiveDeclineExponent)
) / Math.pow(1e12, middleGoldenFiveDeclineExponent) < 1e-12, "金仙资源不得叠乘三衰与五衰");
state.immortalPower = 1e16;
assert.ok(Math.abs(Immortal.celestialFiveDeclineExponent() - 0.8) < 1e-12, "太乙前五衰应为^0.80");
state.advancedRealmLevel = 8;
assert.ok(Math.abs(Immortal.celestialFiveDeclineExponent() - 0.8) < 1e-12, "金仙→太乙边界的五衰指数必须连续");
state.threadsOfLawUnlocked = true;
assert.ok(Math.abs(Immortal.lawImmortalPowerExponent() - 2.2) < 1e-12, "法则之丝应把内部指数2提高至2.2");
state.lawAffinityUnlocked = true;
assert.ok(Math.abs(Immortal.lawImmortalPowerExponent() - 2.42) < 1e-12, "法则亲和叠加后内部指数应为2.42");
state.mana = 1e29;
const lawProgressAt1e29 = toNumber(log10(add(ONE, div(state.mana, 1e24))), Infinity);
const expectedLawExponentAt1e29 = 0.8 + (2.42 - 0.8) / (1 + Math.pow(lawProgressAt1e29 / 10, 0.75));
assert.ok(
  Math.abs(Immortal.lawImmortalPowerActualExponent() - expectedLawExponentAt1e29) < 1e-12,
  "法则实际指数应按法力动态衰减"
);
assert.ok(
  Math.abs(Immortal.lawImmortalPowerMultiplier() - (1 + Math.pow(lawProgressAt1e29, expectedLawExponentAt1e29))) < 1e-12,
  "法则倍率必须使用动态衰减后的实际指数"
);
state.mana = 1e200;
assert.ok(
  Immortal.lawImmortalPowerActualExponent() > 0.8 && Immortal.lawImmortalPowerActualExponent() < expectedLawExponentAt1e29,
  "法力提高时法则实际指数应继续平滑趋近0.80"
);
state.immortalPower = 5e20;
assert.ok(Math.abs(Immortal.celestialFiveDeclineExponent() - 0.65) < 1e-12, "大罗前五衰应为^0.65");
state.advancedRealmLevel = 9;
assert.ok(Math.abs(Immortal.celestialFiveDeclineExponent() - 0.65) < 1e-12, "太乙→大罗边界的五衰指数必须连续");
state.advancedRealmLevel = 8;
state.flawlessJadeBodyUnlocked = true;
assert.ok(Math.abs(Immortal.celestialFiveDeclineExponent() - 0.825) < 1e-12, "无瑕玉体应将五衰损失减半");

state.advancedRealmLevel = 9;
state.immortalPower = 0;
state.flawlessJadeBodyUnlocked = false;
assert.ok(Math.abs(Immortal.celestialFiveDeclineExponent() - 0.65) < 1e-12, "大罗阶段应延续^0.65天人五衰");
assert.ok(Math.abs(Immortal.immortalPowerManaSuppressionExponent() - 0.65) < 1e-12);
assert.ok(Math.abs(Immortal.celestialDeclineExponent() - 0.65) < 1e-12);
state.immortalPower = Math.sqrt(5e20 * 1e26);
assert.ok(Math.abs(
  Immortal.celestialFiveDeclineExponent() - (0.65 - 0.1 * Math.sqrt(0.5))
) < 1e-12, "大罗五衰应直接按5e20→1e26的新境界需求区间推进");
state.flawlessJadeBodyUnlocked = true;
const expectedReducedDaluoDecline = 1 -
  (1 - (0.65 - 0.1 * Math.sqrt(0.5))) * 0.5;
assert.ok(Math.abs(Immortal.celestialFiveDeclineExponent() - expectedReducedDaluoDecline) < 1e-12,
  "无瑕玉体在大罗阶段仍应生效");

state.advancedRealmLevel = 10;
assert.equal(Immortal.celestialFiveDeclineExponent(), 1, "道祖应取消天人五衰");
assert.equal(Immortal.immortalPowerManaSuppressionExponent(), 1, "道祖应取消法力衰劫");
assert.equal(Immortal.celestialDeclineExponent(), 1, "道祖应取消J/战力衰劫");

reset();
assert.equal(
  WIS.Meta.Challenges.systemRequirementSatisfied(state, { system: "仙道" }),
  false,
  "未进入仙道时仙道挑战不得生效"
);
state.cultivation.active = "仙道";
assert.equal(
  WIS.Meta.Challenges.systemRequirementSatisfied(state, { system: "仙道" }),
  true,
  "进入仙道后仙道挑战才能生效"
);
assert.equal(
  WIS.Meta.Challenges.systemRequirementSatisfied(state, {}),
  true,
  "普通挑战不应受体系选择限制"
);

reset({ advancedRealmLevel: 7, indestructibleDharmaBodyUnlocked: true });
assert.equal(WIS.Core.Effects.value("indestructibleDharmaBody", state), 1.55, "法体不灭应调整为^1.55");
reset({ advancedRealmLevel: 7, immortalPower: 1e11, spiritDomainUnlocked: true });
assert.ok(
  Math.abs(Immortal.spiritDomainJSource() - 1e28 * Math.pow(2, 0.6)) /
    (1e28 * Math.pow(2, 0.6)) < 1e-12,
  "灵域应以新金仙需求1e11为仙灵力基准"
);
reset({ advancedRealmLevel: 7, immortalPower: 1e16, spiritCaptureReturnUnlocked: true });
assert.ok(Math.abs(Immortal.spiritCaptureReturnMultiplier() - 3) < 1e-12, "摄灵返源应在新太乙入口1e16达到约×3");
reset({ advancedRealmLevel: 8, soulQualitativeChangeUnlocked: true });
[
  [1e16, 2],
  [1e18, 1 + Math.pow(1e2, 0.4)],
  [1e21, 101],
  [1e29, 1 + Math.pow(1e13, 0.4)]
].forEach(([immortalPower, expected]) => {
  assert.ok(Math.abs(
    Immortal.soulQualitativeChangeMultiplier(immortalPower) - expected
  ) / expected < 1e-12, `神魂质变在仙灵力${immortalPower}时应使用^0.40曲线`);
});

reset({ advancedRealmLevel: 9, immortalPower: 0, flawlessJadeBodyUnlocked: true });

const aperture108Multiplier = Immortal.immortalApertureMultiplier(108);
const aperture109Multiplier = Immortal.immortalApertureMultiplier(109);
assert.ok(Math.abs(aperture109Multiplier / aperture108Multiplier - 1.03) < 1e-12, "仙窍108→109收益必须连续切换为×1.03");
const aperture108Cost = Immortal.immortalApertureCost(108);
assert.ok(Math.abs(aperture108Cost - 4e6 * Math.pow(1.14, 108)) / aperture108Cost < 1e-12, "108→109费用必须取旧曲线真实价格");
assert.ok(Math.abs(Immortal.immortalApertureCost(109) / aperture108Cost - 1.04) < 1e-12, "109级以后费用应按×1.04增长");
const lateApertureTotalCost = Array.from({ length: 252 }, (_, offset) => Immortal.immortalApertureCost(108 + offset))
  .reduce((sum, cost) => add(sum, cost), ZERO);
assert.ok(lateApertureTotalCost > 2e18 && lateApertureTotalCost < 3e18, `108→360总成本应约2e18～3e18，实际为${lateApertureTotalCost}`);

state.fiveElementsTreasureUnlocked = true;
state.treasureImprints.fiveElementsTreasure = 1000;
assert.equal(Immortal.fiveElementsTreasureRawMultiplier(), 2);
assert.equal(Immortal.fiveElementsTreasureInternalExponent(), 0.875);
assert.ok(Math.abs(Immortal.fiveElementsTreasureMultiplierBeforeDecline() - Math.pow(2, 0.875)) < 1e-12);
assert.ok(Math.abs(
  WIS.Core.Effects.value("fiveElementsTreasurePower", state) - Math.pow(Math.pow(2, 0.875), 0.825)
) < 1e-12, "五行至宝应先内部衰减，再由天人五衰外部压制一次");

reset({ advancedRealmLevel: 7, immortalPower: 1e13, fiveElementsTreasureUnlocked: true });
const crystalOriginalRandom = Math.random;
Math.random = () => 0;
for (let index = 0; index < 10; index += 1) {
  WIS.Cultivation.Immortal.rollImmortalPowerTreasure(state, 0.1, true);
}
Math.random = crystalOriginalRandom;
assert.equal(state.treasureImprints.fiveElementsTreasure, 1, "10×0.1秒实际仙灵力时间只能产生1次五行至宝判定");
assert.ok(state.fiveElementsTreasureRollProgress < 1e-9);

const restoredTreasureSave = WIS.Core.State.normalize({
  cultivationSystem: "仙道", qiRefiningUnlocked: true, foundationUnlocked: true,
  goldenCoreUnlocked: true, advancedRealmLevel: 6,
  treasureImprints: { fiveElementsTreasure: 3 }
});
assert.equal(restoredTreasureSave.fiveElementsTreasureUnlocked, true, "已有五行至宝的转生存档应自动恢复能力解锁");
assert.equal(restoredTreasureSave.fiveElementsTreasureRollProgress, 0);

reset({ advancedRealmLevel: 7, fiveElementsTreasureUnlocked: true, immortalPower: 1 });
const reincarnatedWithoutTreasure = WIS.Core.Reset.apply(
  "reincarnation",
  state,
  () => WIS.Core.State.fresh()
);
assert.equal(
  reincarnatedWithoutTreasure.fiveElementsTreasureUnlocked,
  false,
  "五行至宝数量为0时，单纯购买过能力不得在转生后永久保留"
);

reset({ advancedRealmLevel: 7, fiveElementsTreasureUnlocked: true });
state.treasureImprints.fiveElementsTreasure = 1;
const reincarnatedWithFiveElementsTreasure = WIS.Core.Reset.apply(
  "reincarnation",
  state,
  () => WIS.Core.State.fresh()
);
assert.equal(
  reincarnatedWithFiveElementsTreasure.fiveElementsTreasureUnlocked,
  true,
  "已有永久五行至宝时，转生后应自动恢复获取资格"
);

const mysticTreasureRestorationCases = [
  [{ phantomHeavenMirror: 1 }, 1],
  [{ mysticHeavenSacredTree: 1 }, 2],
  [{ mysticHeavenSpiritSlayingSword: 1 }, 3]
];
mysticTreasureRestorationCases.forEach(([treasureImprints, expectedLevel]) => {
  const restored = WIS.Core.State.normalize({ treasureImprints });
  assert.equal(
    restored.mysticHeavenlyTreasureLevel,
    expectedLevel,
    `永久玄天宝物应自动恢复玄天灵宝至少${expectedLevel}级`
  );
});

reset({ advancedRealmLevel: 5, mysticHeavenlyTreasureLevel: 3 });
const reincarnatedWithoutMysticTreasure = WIS.Core.Reset.apply(
  "reincarnation",
  state,
  () => WIS.Core.State.fresh()
);
assert.equal(
  reincarnatedWithoutMysticTreasure.mysticHeavenlyTreasureLevel,
  0,
  "没有永久玄天宝物时，买过的玄天灵宝等级应随转生重置"
);

reset({ advancedRealmLevel: 5, mysticHeavenlyTreasureLevel: 3 });
state.treasureImprints.mysticHeavenSacredTree = 1;
const reincarnatedWithMysticTreasure = WIS.Core.Reset.apply(
  "reincarnation",
  state,
  () => WIS.Core.State.fresh()
);
assert.equal(
  reincarnatedWithMysticTreasure.mysticHeavenlyTreasureLevel,
  2,
  "永久玄天圣树应在转生后恢复玄天灵宝至少2级"
);

reset({ spiritWorldAscensionUnlocked: false });
state.treasureImprints.mysticHeavenSacredTree = 3;
assert.equal(Immortal.naturalTreasureLevelCap(), 16, "每枚玄天圣树应使天材地宝等级上限增加2级");
const normalizedNaturalTreasure = WIS.Core.State.normalize({
  spiritWorldAscensionUnlocked: true,
  naturalTreasureLevel: 999,
  treasureImprints: { mysticHeavenSacredTree: 3 }
});
assert.equal(normalizedNaturalTreasure.naturalTreasureLevel, 26, "读档归一化必须使用相同的玄天圣树上限增量");

reset();
assert.equal(Immortal.mysticHeavenSpiritSlayingSwordExponent(), 1);
state.treasureImprints.mysticHeavenSpiritSlayingSword = 20;
assert.ok(
  Math.abs(Immortal.mysticHeavenSpiritSlayingSwordExponent() - (1 + 0.23 * Math.log10(2))) < 1e-12,
  "玄天斩灵剑应按1 + 0.23 × log10(1 + N/20)计算来源指数"
);
state.treasureImprints.mysticHeavenSpiritSlayingSword = 1000;
assert.ok(Immortal.mysticHeavenSpiritSlayingSwordExponent() > 1.2, "玄天斩灵剑新公式不应保留旧^1.20硬上限");

reset({ advancedRealmLevel: 7, immortalPower: 1e15 });
WIS.Cultivation.Immortal.buyAbility("immortalApertureIII");
assert.equal(state.immortalApertureIIIUnlocked, false, "仙窍Ⅲ不得绕过仙窍Ⅱ前置");
const beforeApertureIIPurchase = state.immortalPower;
WIS.Cultivation.Immortal.buyAbility("immortalApertureII");
assert.equal(state.immortalApertureIIUnlocked, true);
assert.equal(state.immortalPower, beforeApertureIIPurchase - 2e10, "能力必须扣除当前仙灵力配置价格");
WIS.Cultivation.Immortal.buyAbility("immortalApertureIII");
assert.equal(state.immortalApertureIIIUnlocked, true);

reset({ advancedRealmLevel: 8, immortalPower: 1e18 });
WIS.Cultivation.Immortal.buyAbility("lawAffinity");
WIS.Cultivation.Immortal.buyAbility("spiritDomainWorldTransformation");
WIS.Cultivation.Immortal.buyAbility("immortalApertureV");
assert.equal(state.lawAffinityUnlocked, false, "法则亲和必须要求法则之丝");
assert.equal(state.spiritDomainWorldTransformationUnlocked, false, "灵域化界必须要求灵域");
assert.equal(state.immortalApertureVUnlocked, false, "仙窍Ⅴ必须要求仙窍Ⅳ");

const starEnhancementPurchases = [
  ["buyPlanetWill", "planetWillPurchased", "planetWill"],
  ["buyStarSpirit", "starSpiritPurchased", "starSpirit"],
  ["buyStarShatter", "starShatterPurchased", "starShatter"],
  ["buySpaceQuake", "spaceQuakePurchased", "spaceQuake"],
  ["buySelfless", "selflessPurchased", "selfless"],
  ["buySupernaturalFire", "supernaturalFirePurchased", "supernaturalFire"],
  ["buyFiveSpiritStone", "fiveSpiritStonePurchased", "fiveSpiritStone"],
  ["buySelfSuppression", "selfSuppressionPurchased", "selfSuppression"]
];
for (const [buyMethod, purchasedKey, costKey] of starEnhancementPurchases) {
  const cost = WIS.Core.Config.costs.power[costKey];
  const insufficientPower = cost * 0.9;
  reset({ highestScaleIndex: 10, joules: cost * 10, power: insufficientPower });
  ScaleLogic[buyMethod]();
  assert.equal(state[purchasedKey], false, `${costKey}不得用J代替战力购买`);
  assert.equal(state.joules, cost * 10, `${costKey}购买失败时不得扣除J`);
  assert.equal(state.power, insufficientPower, `${costKey}购买失败时不得扣除战力`);

  state.power = cost;
  const joulesBeforePurchase = state.joules;
  ScaleLogic[buyMethod]();
  assert.equal(state[purchasedKey], true, `${costKey}应能用足额战力购买`);
  assert.equal(state.power, 0, `${costKey}应扣除对应战力价格`);
  assert.equal(state.joules, joulesBeforePurchase, `${costKey}购买不得消耗J`);
}

const planetWillCost = WIS.Core.Config.costs.power.planetWill;
reset({ highestScaleIndex: 10, joules: planetWillCost * 10, power: 0, scaleUpgradeAutomationEnabled: true });
state.unlockedAchievements.scale6 = true;
state.powerSystem.systems.scale.history.manualUpgrades.planetWillPurchased = true;
ScaleLogic.autoUpgradeEnhancements();
assert.equal(state.planetWillPurchased, false, "自动强化不得用J购买爆星强化");
assert.equal(state.joules, planetWillCost * 10, "自动强化失败时不得扣除J");

state.power = planetWillCost;
ScaleLogic.autoUpgradeEnhancements();
assert.equal(state.planetWillPurchased, true, "自动强化应使用战力重购爆星强化");
assert.equal(state.power, 0, "自动强化应扣除爆星强化的战力价格");
assert.equal(state.joules, planetWillCost * 10, "自动强化爆星强化不得扣除J");

reset({ highestScaleIndex: 10, joules: 1e29, planetWillPurchased: true, gymPurchased: true, runningLevel: 10 });
assert.ok(Math.abs(
  ScaleLogic.planetWillElementalizationMultiplier() - Math.pow(2, 0.75)
) < 1e-12, "星球意志应按当前J计算元素化倍率");
state.elementalizationPurchased = true;
state.planetWillPurchased = false;
const elementalizationBeforePlanetWill = ScaleLogic.elementalizationJSource();
state.planetWillPurchased = true;
assert.ok(elementalizationBeforePlanetWill > 0 && Math.abs(
  ScaleLogic.elementalizationJSource() / elementalizationBeforePlanetWill - Math.pow(2, 0.75)
) < 1e-12, "元素化实际J来源必须应用星球意志sourceMultiplier");
state.joules = 1e100;
assert.equal(ScaleLogic.planetWillElementalizationMultiplier(), 1e8, "星球意志倍率应封顶×1e8");

reset({ highestScaleIndex: 10, starSpiritPurchased: true });
state.challengeCompletions.innateDeficiency = 2;
state.challengeCompletions.powerless = 1;
assert.equal(ScaleLogic.completedChallengeLayers(), 3);
assert.ok(Math.abs(ScaleLogic.treasureChanceMultiplier() - Math.pow(1.06, 3)) < 1e-12,
  "星灵应按已完成挑战总层数统一提高宝物概率");

reset({ highestScaleIndex: 10, rockLevel: 5000, starShatterPurchased: true });
assert.ok(Math.abs(ScaleLogic.starShatterRockMultiplier() - Math.pow(10, 2.5)) / Math.pow(10, 2.5) < 1e-12,
  "碎星应使用10^(5L/(L+5000))");
state.selflessPurchased = true;
assert.equal(WIS.Core.Effects.value("selfless", state), 1e5,
  "无我应使极意来源×1e5");
const starThreshold = WIS.Core.Config.scales[10].power;
state.power = starThreshold * 10;
state.spaceQuakePurchased = false;
const oldStarSoftcapExponent = ScaleLogic.resourceSoftcapExponent(state.power);
state.spaceQuakePurchased = true;
assert.ok(ScaleLogic.resourceSoftcapExponent(state.power) > oldStarSoftcapExponent,
  "空间震只能减轻爆星软上限损失");

state.spaceQuakePurchased = false;
const starSoftcapBeforeAchievement = ScaleLogic.resourceSoftcapExponent(state.power);
state.unlockedAchievements.scale10 = true;
assert.ok(Math.abs(
  ScaleLogic.resourceSoftcapExponent(state.power)
    - (1 - (1 - starSoftcapBeforeAchievement) * 0.95)
) < 1e-12, "爆星成就应使J、战力量级软上限损失×0.95");

reset({
  goldenCoreUnlocked: true,
  advancedRealmLevel: 9,
  power: 0.1,
  joules: starThreshold * 0.9,
  activeChallenge: "planetSuppression"
});
assert.equal(ScaleLogic.resourceSoftcapExponent(state.power), 1,
  "大罗境界通常应解除爆星软上限");
const lowResourcePlanetExponent = ScaleLogic.planetSuppressionSoftcapExponent(state.power);
const nearStarPlanetExponent = ScaleLogic.planetSuppressionSoftcapExponent(state.joules);
assert.ok(lowResourcePlanetExponent < 1,
  "星球压制必须从低资源开始提供独立专属压制");
assert.ok(nearStarPlanetExponent < lowResourcePlanetExponent,
  "资源越接近爆星，星球压制专属指数必须越低");
assert.equal(ScaleLogic.resourceSoftcapExponent(state.joules), 1,
  "正常爆星软上限被境界解除时，正常指数应保持1");
assert.ok(ScaleLogic.planetSuppressionSoftcapExponent(state.joules) < 1,
  "正常爆星软上限被境界解除后，挑战专属层仍须生效");
assert.equal(ScaleLogic.applyResourceSoftcapRate(1e8, state.power), 1e8,
  "来源内部调用普通软上限时不得提前重复结算挑战专属层");
assert.ok(ScaleLogic.applyResourceSoftcapEffectiveRate(1e8, state.power) < 1e8,
  "最终资源速率必须在正常层后追加挑战专属层");

reset({
  goldenCoreUnlocked: true,
  advancedRealmLevel: 8,
  power: starThreshold * 10,
  activeChallenge: "planetSuppression"
});
const simultaneousNormalExponent = ScaleLogic.resourceSoftcapExponent(state.power);
const simultaneousPlanetExponent = ScaleLogic.planetSuppressionSoftcapExponent(state.power);
assert.ok(simultaneousNormalExponent < 1 && simultaneousPlanetExponent < 1,
  "正常爆星软上限未解除时，正常层与挑战层必须同时生效");
const simultaneousRawGain = 1e12;
const afterNormalLayer = Math.expm1(
  simultaneousNormalExponent * Math.log1p(simultaneousRawGain)
);
const expectedAfterBothLayers = Math.expm1(
  simultaneousPlanetExponent * Math.log1p(afterNormalLayer)
);
assert.ok(Math.abs(
  ScaleLogic.applyResourceSoftcapSettlement(simultaneousRawGain, state.power)
    - expectedAfterBothLayers
) / expectedAfterBothLayers < 1e-12,
"星球压制必须在正常软上限结算后追加独立第二层");

reset({ power: 0.1, activeChallenge: "planetSuppression" });
const basePlanetExponent = ScaleLogic.planetSuppressionSoftcapExponent(state.power);
state.spaceQuakePurchased = true;
const spaceQuakePlanetExponent = ScaleLogic.planetSuppressionSoftcapExponent(state.power);
assert.ok(Math.abs(spaceQuakePlanetExponent
  - (1 - (1 - basePlanetExponent) * 0.97)) < 1e-12,
"空间震应使星球压制专属软上限损失×0.97");
state.spaceQuakePurchased = false;
state.unlockedAchievements.scale10 = true;
const achievementPlanetExponent = ScaleLogic.planetSuppressionSoftcapExponent(state.power);
assert.ok(Math.abs(achievementPlanetExponent
  - (1 - (1 - basePlanetExponent) * 0.95)) < 1e-12,
"爆星成就应使星球压制专属软上限损失×0.95");
state.spaceQuakePurchased = true;
assert.ok(Math.abs(ScaleLogic.planetSuppressionSoftcapExponent(state.power)
  - (1 - (1 - basePlanetExponent) * 0.97 * 0.95)) < 1e-12,
"空间震与爆星成就应共同弱化、但不能解除挑战专属层");

function simulatePlanetSuppression(totalSeconds, stepSeconds) {
  reset({
    goldenCoreUnlocked: true,
    advancedRealmLevel: 9,
    power: 0.1,
    activeChallenge: "planetSuppression"
  });
  let remaining = totalSeconds;
  while (remaining > 1e-12) {
    const elapsed = Math.min(stepSeconds, remaining);
    state.power = add(state.power, ScaleLogic.applyResourceSoftcapOverTime(
      1e12,
      state.power,
      elapsed
    ));
    remaining -= elapsed;
  }
  return state.power;
}
const planetSuppressionOneTick = simulatePlanetSuppression(1, 1);
const planetSuppressionTenTicks = simulatePlanetSuppression(1, 0.1);
assert.ok(Math.abs(planetSuppressionOneTick - planetSuppressionTenTicks)
  / planetSuppressionTenTicks < 1e-12,
"星球压制专属指数随资源变化时，大Tick与拆分Tick必须一致");

reset({
  goldenCoreUnlocked: true,
  advancedRealmLevel: 9,
  power: 0.1,
  activeChallenge: "planetSuppression"
});
state.challengeCompletions.planetSuppression = 1;
const planetRewardPower = ScaleLogic.planetSuppressionRewardExponent(state.power);
assert.ok(ScaleLogic.planetSuppressionSoftcapExponent(state.power) < 1,
  "奖励测试中挑战专属软上限应处于生效状态");
assert.equal(planetRewardPower, 1,
  "星球压制奖励不得读取挑战专属指数，正常软上限未生效时必须为1");
state.advancedRealmLevel = 8;
state.power = starThreshold * 10;
const normalRewardPower = ScaleLogic.planetSuppressionRewardExponent(state.power);
assert.ok(normalRewardPower > 1 && Math.abs(normalRewardPower
  - (1 + 0.1 * (1 - ScaleLogic.resourceSoftcapExponent(state.power)))) < 1e-12,
"星球压制奖励必须只读取正常量级软上限指数");

reset({ highestScaleIndex: 4 });
state.unlockedAchievements.scale4 = true;
state.unlockedAchievements.trueScale10 = true;
assert.equal(WIS.Meta.Challenges.challengeUnlocked("planetSuppression"), true,
  "真爆星成就应永久解锁星球压制挑战");
const reincarnatedAfterTrueStar = WIS.Core.Reset.apply("reincarnation", state, () => WIS.Core.State.fresh());
assert.equal(reincarnatedAfterTrueStar.unlockedAchievements.trueScale10, true,
  "真爆星成就及星球压制解锁资格应在转世后保留");

reset({ activeChallenge: "completeRealm" });
assert.equal(ScaleLogic.challengeAdjustedPowerSource(1e8, "training"), Math.expm1(0.85 * Math.log1p(1e8)),
  "完全境界第1层应使非极意来源^0.85");
assert.ok(lt(ScaleLogic.challengeAdjustedPowerSource(0.1, "training"), 0.1),
  "完全境界对0<x<1的非极意来源仍必须是削弱");
assert.equal(ScaleLogic.challengeAdjustedPowerSource(1e8, "ultimateIntent"), 1e8,
  "完全境界不得削弱极意来源");
state.challengeCompletions.completeRealm = 1;
assert.equal(ScaleLogic.challengeAdjustedPowerSource(1e8, "training"), Math.expm1(0.75 * Math.log1p(1e8)), "完全境界第2层应使非极意来源^0.75");
state.challengeCompletions.completeRealm = 2;
assert.equal(ScaleLogic.challengeAdjustedPowerSource(1e8, "training"), Math.expm1(0.65 * Math.log1p(1e8)), "完全境界第3层应使非极意来源^0.65");

reset({ activeChallenge: "moonless" });
assert.equal(ScaleLogic.challengeAdjustedPowerSource(1e8, "focus"), Math.expm1(0.85 * Math.log1p(1e8)), "无月第1层应使非打岩来源^0.85");
assert.ok(lt(ScaleLogic.challengeAdjustedPowerSource(0.1, "focus"), 0.1),
  "无月对0<x<1的非打岩来源仍必须是削弱");
assert.equal(ScaleLogic.challengeAdjustedPowerSource(1e8, "rock"), 1e8,
  "无月不得削弱打岩来源");
state.challengeCompletions.moonless = 1;
assert.equal(ScaleLogic.challengeAdjustedPowerSource(1e8, "focus"), Math.expm1(0.75 * Math.log1p(1e8)), "无月第2层应使非打岩来源^0.75");
state.challengeCompletions.moonless = 2;
assert.equal(ScaleLogic.challengeAdjustedPowerSource(1e8, "focus"), Math.expm1(0.65 * Math.log1p(1e8)), "无月第3层应使非打岩来源^0.65");

reset({ highestScaleIndex: 10, joules: 2e33, power: 2e33 });
assert.equal(WIS.Core.Config.costs.power.selfSuppression, 1e33,
  "自我抑制价格应为1e33战力");
WIS.Power.Scale.buyUpgrade("selfSuppression");
assert.equal(state.selfSuppressionPurchased, true,
  "达到爆星并支付战力价格后应能购买自我抑制");
assert.equal(state.power, 1e33, "自我抑制应消耗1e33战力");
assert.equal(state.joules, 2e33, "自我抑制不应消耗J");
const currentJBaseSoftcapExponent = ScaleLogic.resourceSoftcapBaseExponent(state.joules);
const expectedSelfSuppressionExponent = 1 + 0.30 * (1 - currentJBaseSoftcapExponent);
assert.ok(currentJBaseSoftcapExponent < 1 && Math.abs(
  ScaleLogic.selfSuppressionJExponent() - expectedSelfSuppressionExponent
) < 1e-12, "自我抑制必须读取空间震修正前的当前J基础软上限指数");
assert.ok(Math.abs(ScaleLogic.selfSuppressionJExponentFromBase(0.6) - 1.12) < 1e-12,
  "Ebase=0.6时自我抑制应提供约^1.12");
state.returnToOriginUnlocked = true;
assert.ok(Math.abs(
  ScaleLogic.jGainExponent() - 1.02 * expectedSelfSuppressionExponent
) < 1e-12, "自我抑制必须作为J区域指数与返本归元相乘");
state.joules = 0;
assert.equal(ScaleLogic.selfSuppressionJExponent(), 1,
  "J未触发量级软上限时自我抑制必须无收益");
state.joules = 1e33;
state.spaceQuakePurchased = false;
const selfSuppressionBeforeSpaceQuake = ScaleLogic.selfSuppressionJExponent();
const normalSoftcapBeforeSpaceQuake = ScaleLogic.resourceSoftcapExponent(state.joules);
state.spaceQuakePurchased = true;
const selfSuppressionAfterSpaceQuake = ScaleLogic.selfSuppressionJExponent();
const normalSoftcapAfterSpaceQuake = ScaleLogic.resourceSoftcapExponent(state.joules);
assert.ok(normalSoftcapAfterSpaceQuake > normalSoftcapBeforeSpaceQuake,
  "空间震应继续独立弱化爆星软上限");
assert.equal(selfSuppressionAfterSpaceQuake, selfSuppressionBeforeSpaceQuake,
  "空间震开启前后自我抑制数值必须不变");

function simulateSelfSuppressionJ(totalSeconds, stepSeconds) {
  reset({
    highestScaleIndex: 10,
    joules: 1e33,
    mana: 1e40,
    qiRefiningUnlocked: true,
    selfSuppressionPurchased: true
  });
  let remaining = totalSeconds;
  while (remaining > 1e-12) {
    const elapsed = Math.min(stepSeconds, remaining);
    state.joules = add(state.joules, ScaleLogic.applyResourceSoftcapDynamicRateOverTime(
      (evaluationJoules) => ScaleLogic.automaticJRawPerSecondAt(evaluationJoules),
      state.joules,
      elapsed
    ));
    remaining -= elapsed;
  }
  return state.joules;
}
const selfSuppressionOneTick = simulateSelfSuppressionJ(1, 1);
const selfSuppressionTenTicks = simulateSelfSuppressionJ(1, 0.1);
assert.ok(Math.abs(selfSuppressionOneTick - selfSuppressionTenTicks) /
  Math.max(selfSuppressionOneTick, selfSuppressionTenTicks) < 1e-12,
"自我抑制依赖当前J时，大Tick与拆分Tick必须一致");

const supernaturalFireLow = ScaleLogic.supernaturalFireMultiplierFromFocusSource(1e2);
const supernaturalFireHigh = ScaleLogic.supernaturalFireMultiplierFromFocusSource(1e20);
const supernaturalFireExtreme = ScaleLogic.supernaturalFireMultiplierFromFocusSource(1e100);
assert.ok(lt(supernaturalFireLow, supernaturalFireHigh) && lt(supernaturalFireHigh, supernaturalFireExtreme),
  "超自然发火倍率必须随集中实际自动来源单调增长");
assert.ok(gt(supernaturalFireHigh, 3) && gt(supernaturalFireExtreme, supernaturalFireHigh),
  "超自然发火必须删除×3硬上限并保持无硬上限增长");
assert.ok(Math.abs(supernaturalFireHigh - Math.pow(1 + 1e20, 0.15)) / supernaturalFireHigh < 1e-12,
  "超自然发火必须使用(1+集中实际自动来源)^0.15");

reset({ supernaturalFirePurchased: true, focusPurchased: true, joules: 1e30, power: 1e20 });
const supernaturalMultiplier = ScaleLogic.supernaturalFirePowerMultiplier();
const supernaturalActualFocus = ScaleLogic.actualFocusPowerPerSecond();
const expectedSupernaturalMultiplier = BigNum.pow(add(ONE, supernaturalActualFocus), 0.15);
assert.equal(supernaturalMultiplier, expectedSupernaturalMultiplier,
"超自然发火必须读取集中最终实际自动战力来源，且固定点结算不得读取错误阶段");
WIS.Core.Effects.beginTick(state);
WIS.Core.Effects.product("power", "regionMultiplier", state);
const supernaturalMultiplierAfterEffectCache = ScaleLogic.supernaturalFirePowerMultiplier();
assert.equal(supernaturalMultiplierAfterEffectCache, supernaturalMultiplier,
"同tick Effect已缓存后，超自然发火不得重复计入自身战力区域倍率");

reset({ fiveSpiritStonePurchased: true });
state.treasureImprints.fiveSpiritStone = 3;
assert.equal(ScaleLogic.fiveSpiritStoneJSource(), 10 * (Math.pow(4, 1.2) - 1));
assert.equal(ScaleLogic.fiveSpiritStonePowerSource(), 5 * (Math.pow(4, 1.25) - 1));
const reincarnatedWithFiveSpiritStone = WIS.Core.Reset.apply("reincarnation", state, () => WIS.Core.State.fresh());
assert.equal(reincarnatedWithFiveSpiritStone.fiveSpiritStonePurchased, true,
  "永久五灵石应在转生后恢复获取资格");
assert.equal(reincarnatedWithFiveSpiritStone.treasureImprints.fiveSpiritStone, 3);

reset({ runningLevel: 1 });
state.unlockedAchievements.scale8 = true;
state.treasureImprints.superLollipop = 5;
assert.equal(ScaleLogic.superLollipopTrainingMultiplier(), 1.1,
  "超级棒棒糖应改为每个锻炼来源+2%");
const originalTreasureRandom = Math.random;
Math.random = () => 0;
for (let index = 0; index < 10; index += 1) WIS.Power.Scale.rollPassiveTreasure(state, 0.1, true);
Math.random = originalTreasureRandom;
assert.equal(state.treasureImprints.superLollipop, 6,
  "超级棒棒糖10×0.1秒只能产生一次判定");
assert.ok(state.superLollipopRollProgress < 1e-9,
  "超级棒棒糖10×0.1秒应恰好累计为一次判定，不依赖Tick");

reset({
  fiveSpiritStonePurchased: true, ultimateIntentPurchased: true,
  focusPurchased: true, joules: 1e30, power: 1e20
});
Math.random = () => 0;
for (let index = 0; index < 4; index += 1) WIS.Power.Scale.rollPassiveTreasure(state, 0.25, true);
Math.random = originalTreasureRandom;
assert.equal(state.treasureImprints.fiveSpiritStone, 1,
  "五灵石4×0.25秒只能产生一次判定");
assert.ok(state.fiveSpiritStoneRollProgress < 1e-9,
  "五灵石4×0.25秒应恰好累计为一次判定，不依赖Tick");

reset({ advancedRealmLevel: 9, joules: 1e29, immortalPower: 5e20, mana: 1e29 });
state.trinityUnlocked = true;
const trinityMagnitude = Math.log10(2);
assert.ok(Math.abs(Immortal.trinityImmortalPowerMultiplier() - (1 + Math.pow(trinityMagnitude, 0.75))) < 1e-12);
state.unityWithDaoUnlocked = true;
assert.ok(Math.abs(Immortal.unityWithDaoExponent() - (1 + 0.025 * trinityMagnitude / (trinityMagnitude + 5))) < 1e-12);
state.lawUnlocked = true;
const lawBeforeOrigin = Immortal.lawImmortalPowerMultiplier();
state.lawOriginUnlocked = true;
assert.ok(Math.abs(Immortal.lawImmortalPowerMultiplier() - Math.pow(lawBeforeOrigin, 1.2)) /
  Immortal.lawImmortalPowerMultiplier() < 1e-12, "法则本源只应使最终法则倍率^1.20");
state.lawCrystalFilamentUnlocked = true;
const lawMagnitude = Math.log10(Math.max(1, Immortal.lawImmortalPowerMultiplier()));
const lawCrystalTestStateExponent = Immortal.lawCrystalFilamentPowerExponent();
assert.ok(Math.abs(lawCrystalTestStateExponent -
  (1 + 0.20 * lawMagnitude / (lawMagnitude + 1))) < 1e-12);
const nearbyLawMagnitude = 0.0099 / (0.02 - 0.0099);
const nearbyLawMultiplier = Math.pow(10, nearbyLawMagnitude);
const nearbyLawCrystalExponent = Immortal.lawCrystalFilamentExponentFromMultiplier(nearbyLawMultiplier);
assert.ok(Math.abs(nearbyLawCrystalExponent - 1.099) < 1e-12,
  `原^1.0099对应法则水平的新法则晶丝应为^1.099，实际为^${nearbyLawCrystalExponent}`);
assert.equal(Immortal.lawCrystalFilamentExponentFromMultiplier(1), 1,
  "法则倍率为1时法则晶丝指数必须为1");
const lawCrystalProgression = [1, 10, 1e6, "1e1000"]
  .map((multiplier) => Immortal.lawCrystalFilamentExponentFromMultiplier(multiplier));
assert.ok(lawCrystalProgression.every((exponent, index) => index === 0 || exponent > lawCrystalProgression[index - 1]),
  "法则晶丝指数必须随法则倍率持续提高");
assert.ok(lawCrystalProgression.every((exponent) => exponent <= 1.20),
  "法则晶丝指数不得超过^1.20");
assert.ok(lawCrystalProgression.at(-1) > 1.199 && lawCrystalProgression.at(-1) < 1.20,
  "高法则倍率时必须从下方渐近^1.20");
state.activeChallenge = "severSelfCorpse";
assert.equal(Immortal.lawImmortalPowerMultiplier(), 1, "斩自我尸中法则与法则本源必须同时失效");

const aperture360Multiplier = Immortal.immortalApertureMultiplier(360);
const aperture1800Multiplier = Immortal.immortalApertureMultiplier(1800);
assert.ok(Math.abs(aperture1800Multiplier / aperture360Multiplier -
  Math.pow(1.0045, 1440) * Math.pow(1.12, 24)) < 1e-10,
  "终极仙窍360→1800收益应按每级×1.0045、每60级×1.12");
assert.ok(Math.abs(Immortal.immortalApertureCost(361) / Immortal.immortalApertureCost(360) - 1.008) < 1e-12,
  "仙窍361级后费用应以360→361实际费用为锚点并按×1.008增长");
const ultimateApertureTotalCost = Array.from({ length: 1440 }, (_, offset) =>
  Immortal.immortalApertureCost(360 + offset)
).reduce((sum, cost) => add(sum, cost), ZERO);
assert.ok(ultimateApertureTotalCost > 1.2e24 && ultimateApertureTotalCost < 1.5e24,
  `360→1800总成本应约1.32e24，实际为${ultimateApertureTotalCost}`);

reset({ advancedRealmLevel: 9, immortalPower: 1e30 });
assert.equal(Immortal.ultimateImmortalAperturePrerequisiteMet(), false,
  "未解锁仙窍Ⅶ时终极仙窍前置不应满足");
WIS.Cultivation.Immortal.buyAbility("ultimateImmortalAperture");
assert.equal(state.ultimateImmortalApertureUnlocked, false,
  "手动购买终极仙窍必须要求仙窍Ⅶ");
state.immortalApertureVIIUnlocked = true;
assert.equal(Immortal.ultimateImmortalAperturePrerequisiteMet(), true,
  "解锁仙窍Ⅶ后终极仙窍前置应满足");
WIS.Cultivation.Immortal.buyAbility("ultimateImmortalAperture");
assert.equal(state.ultimateImmortalApertureUnlocked, true,
  "满足仙窍Ⅶ前置后应能购买终极仙窍");

reset({ advancedRealmLevel: 9, immortalPower: 1e30, immortalAbilityAutomationEnabled: true });
state.unlockedAchievements.infantSpirit = true;
state.cultivation.systems.immortal.history.manualAbilities.ultimateImmortalApertureUnlocked = true;
Immortal.autoUpgradeImmortalAbilities();
assert.equal(state.ultimateImmortalApertureUnlocked, false,
  "自动购买终极仙窍必须要求仙窍Ⅶ");
state.immortalApertureVIIUnlocked = true;
Immortal.autoUpgradeImmortalAbilities();
assert.equal(state.ultimateImmortalApertureUnlocked, true,
  "自动购买在满足仙窍Ⅶ前置后应能解锁终极仙窍");

reset({ advancedRealmLevel: 9, immortalPower: 1e30 });
WIS.Cultivation.Immortal.buyAbility("severThreeCorpses");
assert.equal(state.threeCorpseChallengesUnlocked, true, "购买斩三尸必须永久开启挑战链");
const reincarnatedAfterSeverUnlock = WIS.Core.Reset.apply("reincarnation", state, () => WIS.Core.State.fresh());
assert.equal(reincarnatedAfterSeverUnlock.threeCorpseChallengesUnlocked, true,
  "斩三尸挑战资格应在转世后保留");
assert.equal(reincarnatedAfterSeverUnlock.severThreeCorpsesUnlocked, false,
  "普通斩三尸能力购买字段仍应正常重置");

reset({ qiRefiningUnlocked: true, foundationUnlocked: true, goldenCoreUnlocked: true,
  advancedRealmLevel: 9, immortalPower: 1e26, activeChallenge: "severEvilCorpse" });
Immortal.unlockAdvancedRealm(9);
assert.equal(state.advancedRealmLevel, 9, "斩恶尸中即使仙灵力足够，未完成斩自我尸也不得突破道祖");
assert.equal(Immortal.daoAncestorActive(), false, "不得借道祖能力完成斩恶尸");
state.challengeCompletions.severSelfCorpse = 1;
Immortal.unlockAdvancedRealm(9);
assert.equal(state.advancedRealmLevel, 9, "即使已完成斩自我尸，斩恶尸挑战中也不得突破道祖");
state.activeChallenge = null;
Immortal.unlockAdvancedRealm(9);
assert.equal(state.advancedRealmLevel, 10, "完成斩自我尸后应允许突破道祖");
assert.equal(state.immortalPower, 0, "刚突破道祖时应正常消耗突破仙灵力");
assert.equal(Immortal.daoPowerSource(), 0, "刚突破道祖但未购买时不得自动获得道祖威能");
assert.equal(state.daoLawUnityUnlocked, false);
assert.equal(state.daoDomainUnlocked, false);
assert.equal(state.daoPowerUnlocked, false);
assert.equal(state.daoTimeLawUnlocked, false);
assert.equal(state.daoAssimilationUnlocked, false);
assert.equal(Immortal.celestialDeclineExponent(), 1, "突破道祖本身仍须立即取消天人五衰");

reset({ qiRefiningUnlocked: true, foundationUnlocked: true, goldenCoreUnlocked: true,
  advancedRealmLevel: 9, immortalPower: 1e26, activeChallenge: "severEvilCorpse",
  immortalRealmAutomationEnabled: true });
state.unlockedAchievements.bodyIntegration = true;
state.challengeCompletions.severSelfCorpse = 1;
Immortal.autoBreakthroughImmortalRealms();
assert.equal(state.advancedRealmLevel, 9, "自动突破也不得在斩恶尸挑战中进入道祖");

reset({ advancedRealmLevel: 9 });
state.challengeCompletions.severEvilCorpse = 1;
state.joules = 9e29;
state.power = 9 * 2.24e31;
state.mana = 9e29;
state.immortalPower = 4.5e21;
assert.ok(Math.abs(WIS.Meta.Challenges.evilCorpseRewardMultiplier(state) - 2) < 1e-12,
  "斩恶尸四项评价各为1时仙灵力奖励应为×2");

reset({ activeChallenge: "severEvilCorpse", advancedRealmLevel: 9 });
const evilScales = {
  joules: 1e29,
  power: 2.24e31,
  mana: 1e29,
  immortalPower: Immortal.immortalPowerRealmCost(8)
};
const evilEffectIds = {
  joules: "severEvilJLimit",
  power: "severEvilPowerLimit",
  mana: "severEvilManaLimit",
  immortalPower: "severEvilImmortalPowerLimit"
};
const expectedRawEvilExponent = (amount, scale) =>
  1 / (1 + 0.501 * Math.pow(toNumber(log10(add(ONE, div(amount, scale))), Infinity), 0.13));
const expectedEvilExponent = (amount, scale) => Math.max(0.80, expectedRawEvilExponent(amount, scale));
WIS.Core.Effects.beginTick(state);
Object.entries(evilScales).forEach(([resourceKey, scale]) => {
  assert.equal(WIS.Core.Effects.value(evilEffectIds[resourceKey], state), 1,
    `斩恶尸${resourceKey}在0资源时必须为^1`);
  state[resourceKey] = BigNum.mul(scale, 1e-6);
  const lowRawExponent = WIS.Meta.Challenges.evilCorpseRawLimitExponent(state, resourceKey);
  assert.ok(lowRawExponent > 0.80, `斩恶尸${resourceKey}低资源原指数应高于^0.80`);
  assert.ok(Math.abs(WIS.Core.Effects.value(evilEffectIds[resourceKey], state) - lowRawExponent) < 1e-15,
    `斩恶尸${resourceKey}原指数高于下限时必须保持原值`);
  state[resourceKey] = scale;
  assert.ok(Math.abs(
    WIS.Core.Effects.value(evilEffectIds[resourceKey], state) - expectedEvilExponent(scale, scale)
  ) < 1e-15, `斩恶尸${resourceKey}必须在同tick读取当前资源`);
  assert.equal(WIS.Core.Effects.value(evilEffectIds[resourceKey], state), 0.80,
    `斩恶尸${resourceKey}在X=S时原始约^0.70，最终必须截断为^0.80`);
  Object.entries(evilEffectIds).filter(([key]) => key !== resourceKey).forEach(([otherKey, effectId]) => {
    assert.equal(WIS.Core.Effects.value(effectId, state), expectedEvilExponent(state[otherKey], evilScales[otherKey]),
      "斩恶尸四种资源指数不得共用当前值");
  });
});
const evilBoundaryMagnitude = Math.pow((1 / 0.80 - 1) / 0.501, 1 / 0.13);
const evilBoundaryRatio = Math.pow(10, evilBoundaryMagnitude) - 1;
state.power = BigNum.mul(evilScales.power, evilBoundaryRatio);
const boundaryRawExponent = WIS.Meta.Challenges.evilCorpseRawLimitExponent(state, "power");
assert.ok(Math.abs(boundaryRawExponent - 0.80) < 1e-12,
  "斩恶尸原指数在0.80边界必须准确连续");
state.power = BigNum.mul(evilScales.power, evilBoundaryRatio * 0.999);
const boundaryBelowFinal = WIS.Meta.Challenges.evilCorpseAdjustedLimitExponent(state, "power");
state.power = BigNum.mul(evilScales.power, evilBoundaryRatio * 1.001);
const boundaryAboveFinal = WIS.Meta.Challenges.evilCorpseAdjustedLimitExponent(state, "power");
assert.ok(boundaryBelowFinal >= 0.80 && boundaryAboveFinal === 0.80 &&
  Math.abs(boundaryBelowFinal - boundaryAboveFinal) < 1e-4,
"斩恶尸0.80截断点附近不得出现跳变错误");
const independentRatios = { joules: 1e-6, power: 1e-3, mana: 1, immortalPower: 1e3 };
Object.entries(independentRatios).forEach(([resourceKey, ratio]) => {
  state[resourceKey] = BigNum.mul(evilScales[resourceKey], ratio);
});
Object.entries(independentRatios).forEach(([resourceKey]) => {
  const expectedRaw = expectedRawEvilExponent(state[resourceKey], evilScales[resourceKey]);
  assert.ok(Math.abs(WIS.Meta.Challenges.evilCorpseRawLimitExponent(state, resourceKey) - expectedRaw) < 1e-15,
    `斩恶尸${resourceKey}必须使用自己的资源与尺度计算原始指数`);
  assert.ok(Math.abs(WIS.Meta.Challenges.evilCorpseAdjustedLimitExponent(state, resourceKey) - Math.max(0.80, expectedRaw)) < 1e-15,
    `斩恶尸${resourceKey}必须独立应用^0.80下限`);
});
const stellarPowerRequirement = WIS.Core.Config.scales.find((scale) => scale.name === "恒星").power;
state.power = stellarPowerRequirement;
const stellarRawEvilPowerExponent = WIS.Meta.Challenges.evilCorpseRawLimitExponent(state, "power");
const stellarEvilPowerExponent = WIS.Core.Effects.value("severEvilPowerLimit", state);
assert.ok(Math.abs(stellarRawEvilPowerExponent - 0.6) < 0.005,
  `斩恶尸战力在恒星需求附近的原始指数应约为^0.60，实际为^${stellarRawEvilPowerExponent}`);
assert.equal(stellarEvilPowerExponent, 0.80,
  "斩恶尸战力在恒星需求附近最终必须使用^0.80下限");
const evilChallengeConfig = WIS.Core.Config.challenges.severEvilCorpse;
assert.equal(Object.hasOwn(evilChallengeConfig, "limitExponents"), false,
  "斩恶尸旧固定limitExponents逻辑必须停用");
const evilDynamicEffects = WIS.Meta.Challenges.getEffects(state)
  .filter((effect) => Object.values(evilEffectIds).includes(effect.id));
assert.equal(evilDynamicEffects.length, 4);
assert.ok(evilDynamicEffects.every((effect) => effect.dynamic === true && typeof effect.value === "function"),
  "斩恶尸四个Effect必须分别标记为动态值");
state.activeChallenge = "severGoodCorpse";
WIS.Core.Effects.beginTick(state);
[
  "severGoodJLimit", "severGoodPowerLimit", "severGoodManaLimit", "severGoodImmortalPowerLimit"
].forEach((effectId) => assert.equal(WIS.Core.Effects.value(effectId, state), 0.77,
  "斩恶尸下限调整不得改变斩善尸四资源^0.77限制"));

reset({ activeChallenge: "severSelfCorpse", advancedRealmLevel: 9, immortalPower: 0 });
WIS.Core.Effects.beginTick(state);
const expectedSelfCorpseExponent = (amount) =>
  1 / (1 + 0.12 * toNumber(log10(add(ONE, div(amount, 1e16))), Infinity));
assert.equal(Immortal.selfCorpseImmortalPowerLimitExponent(), 1,
  "斩自我尸仙灵力为0时额外指数必须为^1");
[
  [1e16, 0.965],
  [1e18, 0.806],
  [1e19, 0.735],
  [1e20, 0.676],
  [Immortal.immortalPowerRealmCost(8), 0.639]
].forEach(([amount, approximate]) => {
  state.immortalPower = amount;
  const currentExponent = Immortal.selfCorpseImmortalPowerLimitExponent();
  assert.ok(Math.abs(currentExponent - expectedSelfCorpseExponent(amount)) < 1e-15,
    "斩自我尸必须按当前仙灵力实时计算新动态指数");
  assert.ok(Math.abs(currentExponent - approximate) < 0.002,
    `斩自我尸在${amount}仙灵力时应约为^${approximate}`);
  assert.ok(Math.abs(Immortal.immortalPowerRegionExponent() - currentExponent) < 1e-15,
    "斩自我尸动态指数必须在同tick进入仙灵力区域指数");
});
assert.equal(WIS.Core.Config.immortalPower.daluo.selfCorpseCoefficient, 0.12,
  "斩自我尸额外压制系数必须为0.12");

reset({ activeChallenge: "innateDeficiency" });
state.unlockedAchievements.scale11 = true;
WIS.Core.Effects.beginTick(state);
assert.equal(WIS.Core.Effects.value("stellarChallengePower", state), 15,
  "恒星成就应仅在挑战中提供战力×15");
state.activeChallenge = null;
WIS.Core.Effects.beginTick(state);
assert.equal(WIS.Core.Effects.value("stellarChallengePower", state), 1,
  "恒星成就在非挑战状态不得生效");

reset();
state.unlockedAchievements.ascendImmortal = true;
state.treasureImprints.immortalCrystal = 2;
const expectedCrystalMultiplier = 1 + 0.001 + 0.001 / Math.sqrt(1.01);
assert.ok(Math.abs(Immortal.immortalCrystalMultiplier() - expectedCrystalMultiplier) < 1e-15,
  "仙晶必须逐枚按获得时数量衰减后加算");
assert.ok(Math.abs(Immortal.immortalCrystalChance(100) - 0.05 / Math.sqrt(2)) < 1e-15);
assert.ok(Math.abs(Immortal.immortalCrystalIncrement(100) - 0.001 / Math.sqrt(2)) < 1e-15);
const originalRandom = Math.random;
Math.random = () => 0;
assert.equal(Immortal.rollImmortalCrystalAttempts(3, true), 3,
  "仙晶批量判定必须在每次成功后读取新数量的概率");
Math.random = originalRandom;
assert.equal(state.treasureImprints.immortalCrystal, 5);

reset();
state.unlockedAchievements.ascendImmortal = true;
const crystalProgressOriginalRandom = Math.random;
Math.random = () => 1;
WIS.Cultivation.Immortal.rollImmortalPowerTreasure(state, 0.6, true);
assert.ok(Math.abs(state.immortalCrystalRollProgress - 0.6) < 1e-12,
  "仙晶判定必须累计实际获得仙灵力的有效秒数");
WIS.Cultivation.Immortal.rollImmortalPowerTreasure(state, 0.6, true);
Math.random = crystalProgressOriginalRandom;
assert.ok(Math.abs(state.immortalCrystalRollProgress - 0.2) < 1e-12,
  "仙晶每累计满1秒只能消费一次判定进度");
assert.equal(state.treasureImprints.immortalCrystal, 0,
  "未命中时不得错误增加仙晶");

assert.equal(WIS.Core.Config.achievementEffects.goldenNatureTimeScaleSeconds, 600);
assert.equal(WIS.Core.Config.achievementEffects.greatLuoTimeScaleSeconds, 600);
assert.equal(WIS.Core.Config.achievementEffects.timeScaleSeconds, 1200,
  "至净仍应保持20分钟时间尺度");
reset({ reincarnationElapsedSeconds: 600 });
state.unlockedAchievements.goldenNature = true;
WIS.Core.Effects.beginTick(state);
assert.ok(Math.abs(Immortal.goldenNatureImmortalPowerExponentBonus() - 0.025) < 1e-15,
  "金性10分钟时应提供仙灵力指数+0.025");
assert.ok(Math.abs(Immortal.immortalPowerRegionExponent() - 1.025) < 1e-15,
  "金性加成必须进入最终仙灵力区域指数");

reset({ currentScaleElapsedSeconds: 1200, highestScaleIndex: 6 });
state.unlockedAchievements.utmostPurity = true;
const purifiedExponent = ScaleLogic.utmostPuritySoftcapExponent(0.5);
assert.ok(Math.abs(purifiedExponent - (1 - 0.5 / 1.08)) < 1e-15,
  "至净20分钟软上限弱化公式错误");
state.cultivation.active = "martial";
assert.equal(ScaleLogic.utmostPuritySoftcapExponent(0.5), 0.5,
  "至净在选择其他体系时不得生效");
state.cultivation.active = "immortal";
assert.ok(Math.abs(ScaleLogic.utmostPuritySoftcapExponent(0.5) - purifiedExponent) < 1e-15,
  "至净在选择仙道体系时必须生效");
state.cultivation.active = null;
state.power = WIS.Core.Config.scales[7].power;
ScaleLogic.updateScaleProgress(false);
assert.equal(state.currentScaleElapsedSeconds, 0, "跨量级必须重置当前量级停留时间");

reset({ activeChallenge: "severEvilCorpse", activeChallengeElapsedSeconds: 600 });
state.unlockedAchievements.greatLuo = true;
WIS.Core.Effects.beginTick(state);
assert.ok(Math.abs(Immortal.greatLuoManaExponentBonus() - 0.035) < 1e-15,
  "大罗成就在斩三尸挑战10分钟时应提供法力指数+0.035");
assert.ok(Math.abs(Immortal.immortalPowerRegionExponent() - 1.035) < 1e-15,
  "大罗成就必须同时进入仙灵力区域指数");
state.activeChallenge = "severGoodCorpse";
WIS.Core.Effects.beginTick(state);
assert.ok(Math.abs(Immortal.immortalPowerRegionExponent() - 0.805) < 1e-15,
  "大罗仙灵力指数应在斩善尸中与^0.77挑战指数正常叠加");
state.activeChallenge = "severSelfCorpse";
WIS.Core.Effects.beginTick(state);
assert.ok(Math.abs(Immortal.immortalPowerRegionExponent() - 1.035) < 1e-15,
  "大罗仙灵力指数应在斩自我尸中生效");
state.activeChallenge = "planetSuppression";
WIS.Core.Effects.beginTick(state);
assert.equal(Immortal.greatLuoManaExponentBonus(), 0,
  "大罗成就不得在非斩三尸挑战生效");
assert.equal(Immortal.immortalPowerRegionExponent(), 1,
  "大罗成就不得在非斩三尸挑战提高仙灵力指数");

state.reincarnationElapsedSeconds = 999;
state.currentScaleElapsedSeconds = 888;
state.unlockedAchievements.ascendImmortal = true;
state.treasureImprints.immortalCrystal = 7;
WIS.Meta.Challenges.resetForChallenge("severEvilCorpse");
assert.equal(state.reincarnationElapsedSeconds, 0, "进入挑战必须视为新转生并重置本次转生时间");
assert.equal(state.currentScaleElapsedSeconds, 0, "进入挑战必须重置量级停留时间");
assert.equal(state.treasureImprints.immortalCrystal, 7, "进入挑战不得清除永久仙晶");

const migratedNewState = WIS.Core.State.migrate(42, {
  treasureImprints: { fiveSpiritStone: 2 },
  challengeCompletions: { severEvilCorpse: 1 }
});
assert.equal(migratedNewState.fiveSpiritStonePurchased, true);
assert.equal(migratedNewState.threeCorpseChallengesUnlocked, true);
const migratedSelfSuppressionState = WIS.Core.State.migrate(43, {
  selfSuppressionPurchased: true
});
assert.equal(migratedSelfSuppressionState.selfSuppressionPurchased, true,
  "当前Schema存档必须保留已购买的自我抑制");
const migratedGhostBackState = WIS.Core.State.migrate(44, {
  highestScaleIndex: 3,
  ghostBackActive: true
});
assert.equal(migratedGhostBackState.ghostBackPurchased, false,
  "旧存档不得因曾经开启鬼背而免费获得新版付费强化");
assert.equal(migratedGhostBackState.ghostBackActive, false,
  "未购买鬼背强化时开关必须归为不可用");
const migratedAchievementState = WIS.Core.State.migrate(43, {
  lifetimeHighestCultivationRealmLevel: 12,
  activeChallenge: "severEvilCorpse",
  activeChallengeElapsedSeconds: 321
});
assert.equal(migratedAchievementState.reincarnationElapsedSeconds, 0);
assert.equal(migratedAchievementState.currentScaleElapsedSeconds, 0);
assert.equal(migratedAchievementState.immortalCrystalRollProgress, 0);
assert.equal(migratedAchievementState.treasureImprints.immortalCrystal, 0);
assert.equal(migratedAchievementState.activeChallengeElapsedSeconds, 321,
  "斩三尸挑战时间必须在读取存档时保留");
["ascendImmortal", "goldenNature", "utmostPurity", "greatLuo"].forEach((key) => {
  assert.equal(migratedAchievementState.unlockedAchievements[key], true,
    `旧存档历史境界应补记成就：${key}`);
});
const migratedDaoAncestorState = WIS.Core.State.migrate(45, {
  lifetimeHighestCultivationRealmLevel: 13
});
assert.equal(migratedDaoAncestorState.unlockedAchievements.selfSeveringSlash, true,
  "旧存档曾抵达道祖时必须补记自斩一刀");
assert.equal(migratedDaoAncestorState.currentQiLayer, 1);
assert.equal(migratedDaoAncestorState.bestQiLayer, 0);
const achievementGameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
assert.match(achievementGameSource, /state\.reincarnationElapsedSeconds \+= elapsedSeconds/);
assert.match(achievementGameSource, /state\.currentScaleElapsedSeconds \+= elapsedSeconds/);
assert.match(achievementGameSource, /state\.activeChallengeElapsedSeconds \+ elapsedSeconds/,
  "所有挑战都必须持续累计本次挑战时间");
load("js/meta/achievements.js");
const achievementDefinitions = WIS.Meta.Achievements.definitions();
assert.equal(achievementDefinitions.find((entry) => entry.key === "scale11").reward,
  "挑战中战力获取倍率 ×15");
assert.equal(achievementDefinitions.find((entry) => entry.key === "aspireImmortality").system, "仙道");
assert.equal(achievementDefinitions.find((entry) => entry.key === "seizeFoundation").system, "仙道");
assert.equal(achievementDefinitions.find((entry) => entry.key === "goldenNature").reward,
  "本次转生中，随时间提升仙灵力指数");
assert.equal(achievementDefinitions.find((entry) => entry.key === "greatLuo").reward,
  "斩三尸挑战中（斩恶尸、斩善尸、斩自我尸），随时间提升法力、仙灵力指数");
assert.equal(achievementDefinitions.find((entry) => entry.key === "selfSeveringSlash").reward,
  "解锁仙道挑战·炼气十万年");
const trueUniverseAchievementIndex = achievementDefinitions.findIndex((entry) => entry.key === "trueScale14");
["googol", "graham64", "tree3"].forEach((key) => {
  assert.ok(achievementDefinitions.findIndex((entry) => entry.key === key) > trueUniverseAchievementIndex,
    `${key}必须移动到真宇宙结构下方`);
});
["ascendImmortal", "goldenNature", "utmostPurity", "greatLuo", "selfSeveringSlash"].forEach((key) => {
  assert.ok(achievementDefinitions.some((entry) => entry.key === key), `缺少成就定义：${key}`);
});
const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const mobileStyles = stylesSource.slice(stylesSource.indexOf("@media (max-width: 420px)"));
assert.doesNotMatch(mobileStyles, /\.scale-progress small\s*\{[^}]*display:\s*none/,
  "手机版不得隐藏下一量级信息");
assert.match(mobileStyles, /\.scale-progress small\s*\{[^}]*display:\s*block[^}]*font-size:\s*9px[^}]*white-space:\s*normal[^}]*line-height:\s*1\.3/s,
  "手机版下一量级信息应允许小字号换行显示");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(indexSource, /根据当前法力自动获得，不消耗法力/);
assert.match(indexSource, /消耗当前\s+10%\s+战力获得一定探寻量、探寻量提供法力与宝物判定。/);
const cardsSource = fs.readFileSync(path.join(root, "js/ui/cards.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "js/ui/app.js"), "utf8");
assert.match(cardsSource, /id:\s*"ghost-back"[^\n]+cost:\s*powerCosts\.ghostBack/,
  "鬼背应列入爆屋强化并按费用排序");
assert.match(cardsSource, /filter\(\(item\) => !item\.hidden\)\.length/,
  "挑战与宝物折叠栏数量必须只统计已解锁项目");
assert.match(appSource, /evilCorpseRawLimitExponent/);
assert.match(appSource, /evilCorpseAdjustedLimitExponent/);
assert.match(appSource, /原始 \^.*后期下限 \^.*实际 \^/s,
  "斩恶尸详情必须同时显示原始指数、后期下限与实际指数");
assert.match(appSource, /当前法则倍率.*y=.*渐近上限/s,
  "法则晶丝详情必须显示当前法则倍率、y、当前指数与渐近上限");
assert.equal(WIS.Core.Config.gameVersion, "0.1.4.5-dev");
assert.equal(WIS.Core.Config.saveVersion, 47);

console.log(JSON.stringify({
  passed: true,
  tianNiPearlEffectiveMultiplier,
  naturalTreasureEffectiveMultiplier,
  adjustedGhostBrainSource,
  ghostBrainAttenuation,
  oneSecondSoftcapGain,
  tenSubstepSoftcapGain,
  resourceSoftcapTickDifference,
  oneLargeStep,
  offlineMaximumSteps,
  manySmallSteps,
  manaDifference,
  immortalPowerDifference,
  offlineManaDifference,
  offlineImmortalPowerDifference
}, null, 2));
