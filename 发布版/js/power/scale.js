(function defineScaleSystem(WIS) {
  "use strict";

  const thresholds = WIS.Core.Config.scales;
  const { ZERO, ONE, add, mul, div, gte, gt, toNumber } = WIS.Core.BigNum;
  const { applyResourceSoftcapDynamicRateOverTime } = WIS.Power.ScaleLogic;

  function tierIndexForPower(power) {
    const state = WIS.Core.Runtime.getState();
    let index = Math.max(0, Math.min(thresholds.length - 1, Number(state.highestScaleIndex) || 0));
    while (index + 1 < thresholds.length &&
      gte(power, WIS.Power.ScaleLogic.scaleRequirement(index + 1, state))) index += 1;
    return index;
  }

  function currentTier(state) {
    return thresholds[Math.max(0, Math.min(thresholds.length - 1, state.highestScaleIndex))];
  }

  function nextTier(state) {
    return thresholds[state.highestScaleIndex + 1] || null;
  }

  function progress(state) {
    const next = nextTier(state);
    const requirement = next
      ? WIS.Power.ScaleLogic.scaleRequirement(state.highestScaleIndex + 1, state)
      : ONE;
    return next ? Math.max(0, Math.min(1, toNumber(div(state.power, requirement), 1))) : 1;
  }

  function effects(state) {
    if (state.powerSystem?.active !== "scale") return [];
    return [
      { id: "gym", name: "跑步", group: "强化", target: "joules", layer: "regionMultiplier", dynamic: true, dynamicResources: ["power"], value: (current) => WIS.Power.ScaleLogic.gymMultiplier(current) },
      { id: "exercise", name: "运动", group: "强化", target: "joules", layer: "regionMultiplier", dynamic: true, dynamicResources: ["joules"], value: (current) => WIS.Power.ScaleLogic.exerciseMultiplier(current) },
      { id: "water", name: "击水", group: "强化", target: "joules", layer: "regionMultiplier", dynamic: true, value: (current) => current.waterPurchased ? WIS.Power.ScaleLogic.waterPotentialJMultiplier(current) : 1 },
      { id: "ghostBackJ", name: "鬼背", group: "行动", target: "joules", layer: "regionMultiplier", value: state.ghostBackPurchased && state.ghostBackActive ? 0.75 : 1 },
      { id: "five", name: "战五渣", group: "量级论", target: "power", layer: "regionMultiplier", value: state.unlockedAchievements?.five ? 1.05 : 1 },
      { id: "transcendent", name: "超凡之力", group: "量级论", target: "power", layer: "regionMultiplier", dynamic: true, dynamicResources: ["power"], value: (current) => WIS.Power.ScaleLogic.transcendentMultiplier(current) },
      { id: "naturalStrength", name: "天生神力", group: "量级论", target: "power", layer: "regionMultiplier", dynamic: true, dynamicResources: ["joules"], value: (current) => current.naturalStrengthPurchased ? WIS.Power.ScaleLogic.naturalStrengthPotentialMultiplier(current) : 1 },
      { id: "ghostBackPower", name: "鬼背", group: "量级论", target: "power", layer: "regionMultiplier", value: state.ghostBackPurchased && state.ghostBackActive ? 1.75 : 1 },
      { id: "bulletTime", name: "子弹时间", group: "量级论", target: "power", layer: "regionMultiplier", value: state.bulletTimePurchased ? 1.5 : 1 },
      { id: "superpower", name: "异能", group: "量级论", target: "power", layer: "regionExponent", value: state.superpowerPurchased ? (state.superpowerEvolutionPurchased ? 1.06 : 1.05) : 1 },
      { id: "invulnerable", name: "金刚不坏", group: "量级论", target: "fitness", layer: "sourceExponent", value: state.invulnerablePurchased ? 1.15 : 1 },
      { id: "highSpeedMetabolism", name: "高速代谢", group: "量级论", target: "training", layer: "sourceMultiplier", value: state.highSpeedMetabolismPurchased ? 1.75 : 1 },
      { id: "superLollipop", name: "超级棒棒糖", group: "宝物", target: "training", layer: "sourceMultiplier", celestialFiveDecline: true, value: WIS.Power.ScaleLogic.superLollipopTrainingMultiplier() },
      { id: "focusRatio", name: "集中比例", group: "量级论", target: "focus", layer: "sourceMultiplier", value: 0.02 + (state.mentalPowerPurchased ? 0.01 : 0) + state.mindDivisionLevel * 0.005 },
      { id: "intuition", name: "直感", group: "量级论", target: "focus", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["power"], value: (current) => current.intuitionPurchased ? WIS.Power.ScaleLogic.intuitionPotentialFocusMultiplier(current) : 1 },
      { id: "dynamicFocus", name: "动态专注", group: "量级论", target: "focus", layer: "sourceMultiplier", value: state.dynamicFocusPurchased ? 1.5 : 1 },
      { id: "subtle", name: "入微", group: "量级论", target: "focus", layer: "sourceExponent", value: state.subtlePurchased ? 1.05 : 1 },
      { id: "rockStrike", name: "岩击", group: "量级论", target: "rock", layer: "sourceMultiplier", value: state.rockStrikePurchased ? 2 : 1 },
      { id: "mountainCollapse", name: "崩山/裂地", group: "量级论", target: "rock", layer: "sourceExponent", value: state.mountainCollapsePurchased ? (state.earthSplitPurchased ? 1.1 + 0.02 * Math.log10(1 + (state.unlockedAchievements?.scale7 ? Math.floor(state.rockLevel * 1.2) : state.rockLevel) / 10) : 1.1) : 1 },
      { id: "trueCity", name: "真爆城", group: "成就", target: "rock", layer: "sourceExponent", value: state.unlockedAchievements?.trueScale6 ? 1.06 : 1 },
      { id: "mentalDomain", name: "精神领域", group: "量级论", target: "ghostBrain", layer: "sourceMultiplier", value: state.mentalDomainPurchased ? 5 : 1 },
      { id: "skySplit", name: "裂天", group: "量级论", target: "ghostBrain", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["power"], value: (current) => current.skySplitPurchased ? WIS.Power.ScaleLogic.skySplitPotentialMultiplier(current) : 1 },
      { id: "superSpeedThinking", name: "超速思维", group: "量级论", target: "killingIntent", layer: "sourceMultiplier", value: state.superSpeedThinkingPurchased ? 5 : 1 },
      { id: "biologicalQuantification", name: "生体量化", group: "量级论", target: "fitness", layer: "sourceMultiplier", value: state.biologicalQuantificationPurchased ? 12 : 1 },
      { id: "biologicalQuantificationCap", name: "生体量化", group: "量级论", target: "fitnessLevelCap", layer: "sourceAdditive", value: state.biologicalQuantificationPurchased ? 30 : 0 },
      { id: "destroyCountry", name: "灭国", group: "量级论", target: "rock", layer: "sourceMultiplier", value: state.destroyCountryPurchased ? 1e4 : 1 },
      { id: "destroyCountryCap", name: "灭国", group: "量级论", target: "rockLevelCap", layer: "sourceAdditive", value: state.destroyCountryPurchased ? 50 : 0 },
      { id: "killingIntentSubstance", name: "杀意实质", group: "量级论", target: "killingIntent", layer: "sourceMultiplier", value: state.killingIntentSubstancePurchased ? 5 : 1 },
      { id: "energyCycle", name: "能量循环", group: "量级论", target: "ghostBrain", layer: "sourceMultiplier", value: state.energyCyclePurchased ? 12 : 1 },
      { id: "mountainShatter", name: "崩岳", group: "量级论", target: "power", layer: "regionExponent", value: state.mountainShatterPurchased ? 1.015 : 1 },
      { id: "bioenergy", name: "生物能源", group: "量级论", target: "joules", layer: "regionMultiplier", value: state.bioenergyPurchased ? 3 : 1 },
      { id: "continentCollapse", name: "大陆崩溃", group: "量级论", target: "rock", layer: "sourceExponent", dynamic: true, dynamicResources: ["power"], value: (current) => current.continentCollapsePurchased ? WIS.Power.ScaleLogic.continentCollapsePotentialExponent(current) : 1 },
      { id: "skyCrystal", name: "天晶", group: "宝物", target: "rock", layer: "sourceMultiplier", celestialFiveDecline: true, value: add(ONE, mul(state.treasureImprints.skyCrystal, 0.05)) },
      { id: "waveEye", name: "波动眼", group: "量级论", target: "killingIntent", layer: "sourceExponent", value: state.waveEyePurchased ? 1.75 : 1 },
      { id: "elementalAwakening", name: "元素觉醒", group: "量级论", target: "elementalization", layer: "sourceExponent", value: state.elementalAwakeningPurchased ? 1.52 : 1 },
      { id: "moonfall", name: "月落", group: "量级论", target: "rock", layer: "sourceMultiplier", value: state.moonfallPurchased ? 50 : 1 },
      { id: "flowState", dynamicResources:["joules","power","immortalPower"], name: "心流", group: "量级论", target: "ultimateIntent", layer: "sourceMultiplier", dynamic: true, value: (current) => current.flowStatePurchased ? WIS.Power.ScaleLogic.flowUltimateIntentMultiplier() : 1 },
      { id: "selfhood", name: "自我", group: "量级论", target: "ultimateIntent", layer: "sourceExponent", value: state.selfhoodPurchased ? 1.04 : 1 },
      { id: "freedom", name: "自在", group: "量级论", target: "ultimateIntent", layer: "sourceExponent", value: state.freedomPurchased ? 1.03 : 1 },
      { id: "chicxulubMeteorite", name: "希克苏鲁伯陨石", group: "量级论", target: "power", layer: "regionMultiplier", value: state.chicxulubMeteoritePurchased ? 10 : 1 }
      ,{ id: "planetWill", name: "星球意志", group: "爆星", target: "elementalization", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["joules"], value: (current) => WIS.Power.ScaleLogic.planetWillElementalizationMultiplier(current.joules) }
      ,{ id: "starShatter", name: "碎星", group: "爆星", target: "rock", layer: "sourceMultiplier", value: WIS.Power.ScaleLogic.starShatterRockMultiplier() }
      ,{ id: "selfless", name: "无我", group: "爆星", target: "ultimateIntent", layer: "sourceMultiplier", value: state.selflessPurchased ? WIS.Core.Config.starEnhancements.selfless.ultimateIntentMultiplier : 1 }
      ,{ id: "supernaturalFire", dynamicResources:["joules","power","mana","immortalPower","yuanForce"], name: "超自然发火", group: "爆星", target: "power", layer: "regionMultiplier", dynamic: true, value: (current) => current.supernaturalFirePurchased ? WIS.Power.ScaleLogic.supernaturalFirePowerMultiplier() : 1 }
      ,{ id: "selfSuppression", name: "自我抑制", group: "爆星", target: "joules", layer: "regionExponent", dynamic: true, dynamicResources: ["joules"], value: (current) => WIS.Power.ScaleLogic.selfSuppressionJExponent(current.joules) }
      ,{ id: "stellarFurnace", name: "恒星熔炉", group: "恒星", target: "joules", layer: "regionMultiplier", value: state.stellarFurnacePurchased ? 1e12 : 1 }
      ,{ id: "gravitationalCollapse", name: "引力坍缩", group: "恒星", target: "power", layer: "regionMultiplier", value: state.gravitationalCollapsePurchased ? 1e12 : 1 }
      ,{ id: "galacticReturn", name: "银河回流", group: "星系", target: "joules", layer: "regionMultiplier", value: state.galacticReturnPurchased ? 1e12 : 1 }
      ,{ id: "stellarResonance", name: "群星共振", group: "星系", target: "power", layer: "regionMultiplier", value: state.stellarResonancePurchased ? 1e4 : 1 }
      ,{ id: "greatAttractor", name: "巨引源", group: "超星系团", target: "joules", layer: "regionExponent", value: state.greatAttractorPurchased ? 1.02 : 1 }
      ,{ id: "largeScaleAdaptation", name: "大尺度适应", group: "超星系团", target: "googolPenalty", layer: "strengthMultiplier", value: state.largeScaleAdaptationPurchased ? 0.95 : 1 }
      ,{ id: "superclusterCollapse", name: "超团坍缩", group: "超星系团", target: "power", layer: "regionExponent", value: state.superclusterCollapsePurchased ? 1.02 : 1 }
      ,{ id: "cosmicWeb", name: "宇宙网", group: "宇宙结构", target: "joules", layer: "regionExponent", value: state.cosmicWebPurchased ? 1.03 : 1 }
      ,{ id: "scaleUnification", name: "尺度统一", group: "宇宙结构", target: "googolPenalty", layer: "strengthMultiplier", value: state.scaleUnificationPurchased ? 0.85 : 1 }
      ,{ id: "spacetimeFramework", name: "时空骨架", group: "宇宙结构", target: "power", layer: "regionExponent", value: state.spacetimeFrameworkPurchased ? 1.03 : 1 }
    ];
  }

  WIS.Core.Effects.register("scale", effects, { highestPowerEffects: ["water"] });

  let fitnessCardRollAccumulator = 0;
  let skyCrystalRollAccumulator = 0;
  let cosmicFiberRollAccumulator = 0;
  let cosmicWillRollAccumulator = 0;

  function calculateAutomaticGains(state, elapsedSeconds, integrationOptions = {}) {
    const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const incomeFactor = WIS.Simulation.Compensation.factor();
    const jRateProfile = WIS.Power.ScaleLogic.createAutomaticJRateProfile();
    const passiveJ = applyResourceSoftcapDynamicRateOverTime(
      (evaluationJoules) =>
        WIS.Power.ScaleLogic.automaticJSettledPerSecondAt(evaluationJoules, jRateProfile),
      state.joules,
      safeElapsed,
      (settledRate) => mul(settledRate, incomeFactor), integrationOptions
    );
    const powerRateProfile = WIS.Power.ScaleLogic.createAutomaticPowerRateProfile();
    const passivePower = applyResourceSoftcapDynamicRateOverTime(
      (evaluationPower) =>
        WIS.Power.ScaleLogic.automaticPowerSettledPerSecondAt(evaluationPower, powerRateProfile),
      state.power,
      safeElapsed,
      (settledRate) => mul(settledRate, incomeFactor), integrationOptions
    );
    const rates = {
      joulesPerSecond: safeElapsed > 0 ? div(passiveJ, safeElapsed) : ZERO,
      powerPerSecond: safeElapsed > 0 ? div(passivePower, safeElapsed) : ZERO
    };
    return { joules: passiveJ, power: passivePower, rates };
  }

  function commitAutomaticGains(state, result, { writeRates = true } = {}) {
    const plan = result || { joules: ZERO, power: ZERO, rates: {} };
    if (writeRates) Object.assign(WIS.tmp.rates, plan.rates);
    if (plan.repeatJoules) {
      const { term, count } = plan.repeatJoules;
      if (!Number.isSafeInteger(count) || count < 1 || !WIS.Core.BigNum.isFiniteBN(term) ||
          !WIS.Core.BigNum.gte(term,0) || !WIS.Core.BigNum.eq(mul(term,count),plan.joules))
        throw Error("J重复收益计划无效，未提交");
      Object.assign(state.core.resources, WIS.Core.Resources.prepareTerms(state.core.resources,"joules",[`${term}*${count}`]));
    } else WIS.Core.Resources.add("joules", plan.joules);
    WIS.Core.Resources.add("power", plan.power);
    state.lifetimeTotalJ = add(state.lifetimeTotalJ, plan.joules);
    state.currentRebirthTotalJ = add(state.currentRebirthTotalJ, plan.joules);
    state.totalPower = add(state.totalPower, plan.power);
    state.lifetimeTotalPower = add(state.lifetimeTotalPower, plan.power);
    state.currentRebirthTotalPower = add(state.currentRebirthTotalPower, plan.power);
    return plan;
  }

  function update(state, elapsedSeconds) {
    return commitAutomaticGains(state, calculateAutomaticGains(state, elapsedSeconds));
  }

  function rollPassiveTreasure(state, elapsedSeconds, silentTreasureRolls = false) {
    WIS.Meta.TreasureProgress.ensure(state);
    let gained = ZERO;
    const S = WIS.Power.ScaleLogic;
    const fitnessJAvailable = gt(WIS.Power.ScaleLogic.fitnessJBonus(), ZERO);
    if (fitnessJAvailable) {
      gained = add(gained, S.rollFitnessMembershipCardAttempts(elapsedSeconds, silentTreasureRolls, { availabilityConfirmed: true }));
      gained = add(gained, S.rollSuperLollipopAttempts(elapsedSeconds, silentTreasureRolls, { availabilityConfirmed: true }));
    }
    if (gt(S.rockPowerPerSecond(), ZERO)) gained = add(gained, S.rollSkyCrystalAttempts(elapsedSeconds, silentTreasureRolls, { availabilityConfirmed: true }));
    if (state.fiveSpiritStonePurchased && gt(S.ultimateIntentPowerSource(), ZERO))
      gained = add(gained, S.rollFiveSpiritStoneAttempts(elapsedSeconds, silentTreasureRolls, { availabilityConfirmed: true }));
    gained = add(gained, S.rollCosmicFiberAttempts(elapsedSeconds, silentTreasureRolls));
    gained = add(gained, S.rollCosmicWillAttempts(elapsedSeconds, silentTreasureRolls));
    return gained;
  }

  function resetTransient() {
    fitnessCardRollAccumulator = 0;
    skyCrystalRollAccumulator = 0;
    cosmicFiberRollAccumulator = 0;
    cosmicWillRollAccumulator = 0;
  }

  function snapshotTreasureTransient() {
    return { fitnessCardRollAccumulator, skyCrystalRollAccumulator, cosmicFiberRollAccumulator, cosmicWillRollAccumulator };
  }

  function restoreTreasureTransient(snapshot = {}) {
    fitnessCardRollAccumulator = Math.max(0, Number(snapshot.fitnessCardRollAccumulator) || 0);
    skyCrystalRollAccumulator = Math.max(0, Number(snapshot.skyCrystalRollAccumulator) || 0);
    cosmicFiberRollAccumulator = Math.max(0, Number(snapshot.cosmicFiberRollAccumulator) || 0);
    cosmicWillRollAccumulator = Math.max(0, Number(snapshot.cosmicWillRollAccumulator) || 0);
  }

  function afterStep() {
    WIS.Power.ScaleLogic.updateProgress(false);
  }

  const system = WIS.Core.Registries.powerSystems.register({
    id: "scale", name: "量级论", thresholds, tierIndexForPower, currentTier, nextTier, progress,
    getAvailableActions: WIS.Power.ScaleLogic.getActionIds,
    getAvailableUpgrades: WIS.Power.ScaleLogic.getUpgradeIds,
    getEffects: effects, calculateAutomaticGains, commitAutomaticGains, update, afterStep,
    rollPassiveTreasure, snapshotTreasureTransient, restoreTreasureTransient, resetTransient,
    getJPerSecond: WIS.Power.ScaleLogic.getJPerSecond,
    getPowerPerSecond: WIS.Power.ScaleLogic.getPowerPerSecond,
    updateProgress: WIS.Power.ScaleLogic.updateProgress,
    performAction: WIS.Power.ScaleLogic.performAction,
    buyUpgrade: WIS.Power.ScaleLogic.buyUpgrade,
    autoUpgrade: WIS.Power.ScaleLogic.autoUpgrade
  });
  WIS.Power.Scale = system;
  WIS.Core.Sources.register("scaleTreasures", () => [
    { id: "fiveSpiritStoneJ", name: "五灵石", group: "宝物", target: "joules", value: WIS.Power.ScaleLogic.fiveSpiritStoneJSource() },
    { id: "fiveSpiritStonePower", name: "五灵石", group: "宝物", target: "power", value: WIS.Power.ScaleLogic.fiveSpiritStonePowerSource() }
  ], { highestPowerIndependent: true });
}(window.WIS));
