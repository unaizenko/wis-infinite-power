(function defineScaleSystem(WIS) {
  "use strict";

  const thresholds = WIS.Core.Config.scales;
  const { applyResourceSoftcapDynamicRateOverTime } = WIS.Power.ScaleLogic;

  function tierIndexForPower(power) {
    let index = 0;
    thresholds.forEach((threshold, candidate) => {
      if (power >= threshold.power) index = candidate;
    });
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
    return next ? Math.max(0, Math.min(1, state.power / next.power)) : 1;
  }

  function effects(state) {
    if (state.powerSystem?.active !== "scale") return [];
    const godspeedExponent = state.godspeedPurchased
      ? 1 + 0.05 * Math.log10(1 + Math.max(0, state.power) / 3.033e15)
      : 1;
    const gym = state.gymPurchased
      ? (1.25 + Math.log10(1 + Math.max(0, state.power)) * 0.5)
        * (state.breathingMethodPurchased ? 1.5 : 1)
        * (state.sonicMovementPurchased ? Math.pow(3.8, godspeedExponent) : 1)
      : 1;
    const exercise = state.exercisePurchased
      ? (1.1 + Math.log10(1 + Math.max(0, state.joules)) * 0.1) * (state.extremeExercisePurchased ? 1.5 : 1)
      : 1;
    return [
      { id: "gym", name: "跑步", group: "强化", target: "joules", layer: "regionMultiplier", value: gym },
      { id: "exercise", name: "运动", group: "强化", target: "joules", layer: "regionMultiplier", value: exercise },
      { id: "water", name: "击水", group: "强化", target: "joules", layer: "regionMultiplier", value: state.waterPurchased ? 1 + Math.log10(1 + Math.max(0, state.highestPower)) * 0.14 : 1 },
      { id: "ghostBackJ", name: "鬼背", group: "行动", target: "joules", layer: "regionMultiplier", value: state.ghostBackActive ? 0.75 : 1 },
      { id: "five", name: "战五渣", group: "量级论", target: "power", layer: "regionMultiplier", value: state.unlockedAchievements?.five ? 1.05 : 1 },
      { id: "transcendent", name: "超凡之力", group: "量级论", target: "power", layer: "regionMultiplier", value: state.transcendentPurchased ? 1 + Math.log10(1 + Math.max(0, state.power)) * 0.15 : 1 },
      { id: "naturalStrength", name: "天生神力", group: "量级论", target: "power", layer: "regionMultiplier", value: state.naturalStrengthPurchased ? 1 + Math.log10(1 + Math.max(0, state.joules)) * 0.15 : 1 },
      { id: "ghostBackPower", name: "鬼背", group: "量级论", target: "power", layer: "regionMultiplier", value: state.ghostBackActive ? 1.75 : 1 },
      { id: "bulletTime", name: "子弹时间", group: "量级论", target: "power", layer: "regionMultiplier", value: state.bulletTimePurchased ? 1.5 : 1 },
      { id: "superpower", name: "异能", group: "量级论", target: "power", layer: "regionExponent", value: state.superpowerPurchased ? (state.superpowerEvolutionPurchased ? 1.06 : 1.05) : 1 },
      { id: "invulnerable", name: "金刚不坏", group: "量级论", target: "fitness", layer: "sourceExponent", value: state.invulnerablePurchased ? 1.15 : 1 },
      { id: "highSpeedMetabolism", name: "高速代谢", group: "量级论", target: "training", layer: "sourceMultiplier", value: state.highSpeedMetabolismPurchased ? 1.75 : 1 },
      { id: "superLollipop", name: "超级棒棒糖", group: "宝物", target: "training", layer: "sourceMultiplier", celestialFiveDecline: true, value: WIS.Power.ScaleLogic.superLollipopTrainingMultiplier() },
      { id: "focusRatio", name: "集中比例", group: "量级论", target: "focus", layer: "sourceMultiplier", value: 0.02 + (state.mentalPowerPurchased ? 0.01 : 0) + state.mindDivisionLevel * 0.005 },
      { id: "intuition", name: "直感", group: "量级论", target: "focus", layer: "sourceMultiplier", value: state.intuitionPurchased ? 1 + Math.log10(1 + Math.max(0, state.power)) * 0.1 * (state.superPerceptionPurchased ? 1.5 : 1) : 1 },
      { id: "dynamicFocus", name: "动态专注", group: "量级论", target: "focus", layer: "sourceMultiplier", value: state.dynamicFocusPurchased ? 1.5 : 1 },
      { id: "subtle", name: "入微", group: "量级论", target: "focus", layer: "sourceExponent", value: state.subtlePurchased ? 1.05 : 1 },
      { id: "rockStrike", name: "岩击", group: "量级论", target: "rock", layer: "sourceMultiplier", value: state.rockStrikePurchased ? 2 : 1 },
      { id: "mountainCollapse", name: "崩山/裂地", group: "量级论", target: "rock", layer: "sourceExponent", value: state.mountainCollapsePurchased ? (state.earthSplitPurchased ? 1.1 + 0.02 * Math.log10(1 + (state.unlockedAchievements?.scale7 ? Math.floor(state.rockLevel * 1.2) : state.rockLevel) / 10) : 1.1) : 1 },
      { id: "trueCity", name: "真爆城", group: "成就", target: "rock", layer: "sourceExponent", value: state.unlockedAchievements?.trueScale6 ? 1.06 : 1 },
      { id: "mentalDomain", name: "精神领域", group: "量级论", target: "ghostBrain", layer: "sourceMultiplier", value: state.mentalDomainPurchased ? 5 : 1 },
      { id: "skySplit", name: "裂天", group: "量级论", target: "ghostBrain", layer: "sourceMultiplier", value: state.skySplitPurchased ? 1 + 0.5 * Math.log10(1 + Math.max(0, state.power) / 3.033e15) : 1 },
      { id: "superSpeedThinking", name: "超速思维", group: "量级论", target: "killingIntent", layer: "sourceMultiplier", value: state.superSpeedThinkingPurchased ? 5 : 1 },
      { id: "biologicalQuantification", name: "生体量化", group: "量级论", target: "fitness", layer: "sourceMultiplier", value: state.biologicalQuantificationPurchased ? 12 : 1 },
      { id: "biologicalQuantificationCap", name: "生体量化", group: "量级论", target: "fitnessLevelCap", layer: "sourceAdditive", value: state.biologicalQuantificationPurchased ? 30 : 0 },
      { id: "destroyCountry", name: "灭国", group: "量级论", target: "rock", layer: "sourceMultiplier", value: state.destroyCountryPurchased ? 1e4 : 1 },
      { id: "destroyCountryCap", name: "灭国", group: "量级论", target: "rockLevelCap", layer: "sourceAdditive", value: state.destroyCountryPurchased ? 50 : 0 },
      { id: "killingIntentSubstance", name: "杀意实质", group: "量级论", target: "killingIntent", layer: "sourceMultiplier", value: state.killingIntentSubstancePurchased ? 5 : 1 },
      { id: "energyCycle", name: "能量循环", group: "量级论", target: "ghostBrain", layer: "sourceMultiplier", value: state.energyCyclePurchased ? 12 : 1 },
      { id: "mountainShatter", name: "崩岳", group: "量级论", target: "power", layer: "regionExponent", value: state.mountainShatterPurchased ? 1.015 : 1 },
      { id: "bioenergy", name: "生物能源", group: "量级论", target: "joules", layer: "regionMultiplier", value: state.bioenergyPurchased ? 3 : 1 },
      { id: "continentCollapse", name: "大陆崩溃", group: "量级论", target: "rock", layer: "sourceExponent", value: state.continentCollapsePurchased ? Math.min(1.5, 1 + 0.18 * Math.log10(1 + Math.max(0, state.power) / 8.368e22)) : 1 },
      { id: "skyCrystal", name: "天晶", group: "宝物", target: "rock", layer: "sourceMultiplier", celestialFiveDecline: true, value: 1 + (state.meta.treasures.skyCrystal || 0) * 0.05 },
      { id: "waveEye", name: "波动眼", group: "量级论", target: "killingIntent", layer: "sourceExponent", value: state.waveEyePurchased ? 1.75 : 1 },
      { id: "elementalAwakening", name: "元素觉醒", group: "量级论", target: "elementalization", layer: "sourceExponent", value: state.elementalAwakeningPurchased ? 1.52 : 1 },
      { id: "moonfall", name: "月落", group: "量级论", target: "rock", layer: "sourceMultiplier", value: state.moonfallPurchased ? 50 : 1 },
      { id: "flowState", name: "心流", group: "量级论", target: "ultimateIntent", layer: "sourceMultiplier", value: () => state.flowStatePurchased ? WIS.Power.ScaleLogic.flowUltimateIntentMultiplier() : 1 },
      { id: "selfhood", name: "自我", group: "量级论", target: "ultimateIntent", layer: "sourceExponent", value: state.selfhoodPurchased ? 1.04 : 1 },
      { id: "freedom", name: "自在", group: "量级论", target: "ultimateIntent", layer: "sourceExponent", value: state.freedomPurchased ? 1.03 : 1 },
      { id: "chicxulubMeteorite", name: "希克苏鲁伯陨石", group: "量级论", target: "power", layer: "regionMultiplier", value: state.chicxulubMeteoritePurchased ? 10 : 1 }
      ,{ id: "planetWill", name: "星球意志", group: "爆星", target: "elementalization", layer: "sourceMultiplier", value: WIS.Power.ScaleLogic.planetWillElementalizationMultiplier() }
      ,{ id: "starShatter", name: "碎星", group: "爆星", target: "rock", layer: "sourceMultiplier", value: WIS.Power.ScaleLogic.starShatterRockMultiplier() }
      ,{ id: "selfless", name: "无我", group: "爆星", target: "ultimateIntent", layer: "sourceMultiplier", value: state.selflessPurchased ? WIS.Core.Config.starEnhancements.selfless.ultimateIntentMultiplier : 1 }
      ,{ id: "supernaturalFire", name: "超自然发火", group: "爆星", target: "power", layer: "regionMultiplier", value: WIS.Power.ScaleLogic.supernaturalFirePowerMultiplier() }
      ,{ id: "selfSuppression", name: "自我抑制", group: "爆星", target: "joules", layer: "regionExponent", value: WIS.Power.ScaleLogic.selfSuppressionJExponent() }
    ];
  }

  WIS.Core.Effects.register("scale", effects);

  let fitnessCardRollAccumulator = 0;
  let skyCrystalRollAccumulator = 0;

  function update(state, elapsedSeconds) {
    const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const passiveJ = applyResourceSoftcapDynamicRateOverTime(
      (evaluationJoules) =>
        WIS.Power.ScaleLogic.automaticJRawPerSecondAt(evaluationJoules),
      state.joules,
      safeElapsed
    );
    const passivePower = applyResourceSoftcapDynamicRateOverTime(
      (evaluationPower) =>
        WIS.Power.ScaleLogic.automaticPowerRawPerSecondAt(evaluationPower),
      state.power,
      safeElapsed
    );
    const rates = {
      joulesPerSecond: safeElapsed > 0 ? passiveJ / safeElapsed : 0,
      powerPerSecond: safeElapsed > 0 ? passivePower / safeElapsed : 0
    };
    WIS.Core.Resources.add("joules", passiveJ);
    WIS.Core.Resources.add("power", passivePower);
    state.lifetimeTotalJ += passiveJ;
    state.totalPower += passivePower;
    state.lifetimeTotalPower += passivePower;
    return { joules: passiveJ, power: passivePower, rates };
  }

  function rollPassiveTreasure(state, elapsedSeconds, silentTreasureRolls = false) {
    let gained = 0;
    if (WIS.Power.ScaleLogic.fitnessJBonus() <= 0 || !WIS.Meta.Achievements.has(state, "scale5")) {
      fitnessCardRollAccumulator = 0;
    } else {
      fitnessCardRollAccumulator += elapsedSeconds;
      const attempts = Math.floor(fitnessCardRollAccumulator);
      fitnessCardRollAccumulator -= attempts;
      gained += WIS.Power.ScaleLogic.rollFitnessMembershipCardAttempts(attempts, silentTreasureRolls);
    }
    if (WIS.Power.ScaleLogic.fitnessJBonus() <= 0 || !WIS.Meta.Achievements.has(state, "scale8")) {
      state.superLollipopRollProgress = 0;
    } else {
      const total = Math.max(0, Number(state.superLollipopRollProgress) || 0) + elapsedSeconds;
      const attempts = Math.floor(total + 1e-10);
      state.superLollipopRollProgress = Math.max(0, total - attempts);
      gained += WIS.Power.ScaleLogic.rollSuperLollipopAttempts(attempts, silentTreasureRolls);
    }
    if (WIS.Power.ScaleLogic.rockPowerPerSecond() <= 0 || !WIS.Meta.Achievements.has(state, "scale9")) {
      skyCrystalRollAccumulator = 0;
    } else {
      skyCrystalRollAccumulator += elapsedSeconds;
      const attempts = Math.floor(skyCrystalRollAccumulator);
      skyCrystalRollAccumulator -= attempts;
      gained += WIS.Power.ScaleLogic.rollSkyCrystalAttempts(attempts, silentTreasureRolls);
    }
    if (!state.fiveSpiritStonePurchased || WIS.Power.ScaleLogic.ultimateIntentPowerSource() <= 0) {
      state.fiveSpiritStoneRollProgress = 0;
    } else {
      const total = Math.max(0, Number(state.fiveSpiritStoneRollProgress) || 0) + elapsedSeconds;
      const attempts = Math.floor(total + 1e-10);
      state.fiveSpiritStoneRollProgress = Math.max(0, total - attempts);
      gained += WIS.Power.ScaleLogic.rollFiveSpiritStoneAttempts(attempts, silentTreasureRolls);
    }
    return gained;
  }

  function resetTransient() { fitnessCardRollAccumulator = 0; skyCrystalRollAccumulator = 0; }

  function afterStep() {
    WIS.Power.ScaleLogic.updateProgress(false);
  }

  const system = WIS.Core.Registries.powerSystems.register({
    id: "scale", name: "量级论", thresholds, tierIndexForPower, currentTier, nextTier, progress,
    getAvailableActions: WIS.Power.ScaleLogic.getActionIds,
    getAvailableUpgrades: WIS.Power.ScaleLogic.getUpgradeIds,
    getEffects: effects, update, afterStep, rollPassiveTreasure, resetTransient,
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
  ]);
}(window.WIS));
