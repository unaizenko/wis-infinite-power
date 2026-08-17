(function defineStateFactory(WIS) {
  "use strict";

  const defaults = Object.freeze({
    joules: 0, power: 0, highestPower: 0, lifetimeHighestJ: 0, lifetimeHighestPower: 0,
    lifetimeHighestScaleIndex: 0, lifetimeTotalJ: 0, lifetimeTotalPower: 0,
    lifetimeHighestMana: 0, lifetimeTotalMana: 0, lifetimeHighestCultivationRealmLevel: 0,
    immortalSelectionCount: 0, totalElapsedSeconds: 0, totalPower: 0, maxSinglePowerGain: 0,
    brickUnlocked: false, wallUnlocked: false, highestScaleIndex: 0, runningLevel: 0,
    gymPurchased: false, exercisePurchased: false, transcendentPurchased: false,
    focusPurchased: false, breathingMethodPurchased: false, extremeExercisePurchased: false,
    rockLevel: 0, waterPurchased: false, ghostBrainPurchased: false, naturalStrengthPurchased: false,
    mentalPowerPurchased: false, lifePowerPurchased: false, myStylePurchased: false,
    intuitionPurchased: false, sonicMovementPurchased: false, carbonLimitPurchased: false,
    killingIntentPurchased: false, rockStrikePurchased: false, highSpeedMetabolismPurchased: false,
    enduranceEnhancementPurchased: false, bulletTimePurchased: false, dynamicFocusPurchased: false,
    superPerceptionPurchased: false, invulnerablePurchased: false, regenerationPurchased: false,
    superpowerPurchased: false, superSpeedThinkingPurchased: false, mountainCollapsePurchased: false,
    mindDivisionLevel: 0, hyperRegenerationPurchased: false, superpowerEvolutionPurchased: false,
    earthSplitPurchased: false, godspeedPurchased: false, subtlePurchased: false,
    mentalDomainPurchased: false, skySplitPurchased: false, ghostBackActive: false,
    biologicalQuantificationPurchased: false, ghostManTransformationPurchased: false,
    destroyCountryPurchased: false, humanGhostTransformationPurchased: false,
    killingIntentSubstancePurchased: false, energyCyclePurchased: false,
    mountainShatterPurchased: false, bioenergyPurchased: false,
    elementalizationPurchased: false, killingIntentPerceptionPurchased: false,
    killingIntentWavePurchased: false, ultimateIntentPurchased: false,
    brainDomainDevelopmentPurchased: false, continentSplitPurchased: false,
    continentCollapsePurchased: false,
    cultivationSystem: null, mana: 0, qiRefiningUnlocked: false, immortalLifeUnlocked: false,
    qiSpellLevel: 0, foundationUnlocked: false, goldenCoreUnlocked: false, advancedRealmLevel: 0,
    circulationUnlocked: false, minorTechniqueUnlocked: false, flyingEscapeUnlocked: false,
    longevity800Level: 0, explorationProgress: 0, manaLiquefactionUnlocked: false,
    longevityLevel: 0, goldenCoreLongevityLevel: 0, manaSolidificationUnlocked: false,
    techniqueUnlocked: false, foundationSpellLevel: 0, magicTreasureUnlocked: false,
    scatterRebuildLevel: 0, scatterRetentionLevel: 0, reincarnationLevel: 0,
    permanentRootLevel: 0, reincarnationEffectLevel: 0, reincarnationManaJRewardLevel: 0,
    materialControlUnlocked: false, divineSenseUnlocked: false, greatCultivatorUnlocked: false,
    secondNascentSoulUnlocked: false, naturalTreasureLevel: 0, spiritWorldAscensionUnlocked: false,
    auraControlUnlocked: false, equalHeavenLongevityUnlocked: false, fiveElementsUnlocked: false,
    heavenlyTreasureLevel: 0, abundantAuraUnlocked: false, brahmaDemonArtUnlocked: false,
    trueSpiritTransformationLevel: 0, silverTadpoleScriptUnlocked: false,
    voidRefiningToQiUnlocked: false, immortalRealmDivineAbilityUnlocked: false,
    spiritRefiningArtUnlocked: false, perfectedTechniqueUnlocked: false,
    heavenEarthAuraUnlocked: false, divineAbilityMasteryUnlocked: false, dualInfantUnityUnlocked: false,
    auraIntoBodyUnlocked: false, externalIncarnationUnlocked: false,
    demonRealmJourneyUnlocked: false, returnToOriginUnlocked: false,
    natalMagicTreasureUnlocked: false, perfectedTechniqueCompletionUnlocked: false,
    roamSpiritWorldUnlocked: false, descendRealmUnlocked: false,
    mysticHeavenlyTreasureLevel: 0, nascentSoulCompletionUnlocked: false,
    spiritTravelVoidUnlocked: false, goldenSealScriptUnlocked: false,
    minorTribulationExplorationLoad: 0,
    minorTribulationRecoveryRemaining: 0, minorTribulationTriggered: false,
    minorTribulationInitialManaExponent: 0.95, minorTribulationLastLoadFactor: 0,
    activeChallenge: null, activeChallengeElapsedSeconds: 0, hideUnlockedAchievements: false,
    theme: "light"
  });

  function freshFlat() {
    return {
      ...defaults,
      symbolicPowerMilestones: { graham64: false, tree3: false },
      challengeCompletions: { innateDeficiency: 0, powerless: 0, longevity: 0, fiveMisfortunes: 0 },
      unlockedAchievements: {},
      treasureImprints: { tianNiPearl: 0, mysteriousGreenBottle: 0, fuBao: 0, fitnessMembershipCard: 0, xuTianDing: 0, baLingChi: 0, wanYaoFan: 0, phantomHeavenMirror: 0, mysticHeavenSacredTree: 0, mysticHeavenSpiritSlayingSword: 0 },
      lastUpdateAt: Date.now()
    };
  }

  const config = WIS.Core.Config;

  function scaleIndexForPower(power) {
    let index = 0;
    config.scales.forEach((scale, candidate) => {
      if (power >= scale.power) index = candidate;
    });
    return index;
  }

  function normalizeFlat(input) {
    const source = input && typeof input === "object" ? input : {};
    const migratedRunningLevel = Number.isFinite(Number(source.runningLevel))
      ? Number(source.runningLevel)
      : source.runningPurchased ? 1 : 0;
    const power = Math.max(0, Number(source.power) || 0);
    const savedScaleIndex = Number.isFinite(Number(source.highestScaleIndex))
      ? Math.floor(Number(source.highestScaleIndex))
      : source.wallUnlocked ? 2 : source.brickUnlocked ? 1 : 0;
    const highestScaleIndex = Math.max(0, Math.min(
      config.scales.length - 1,
      Math.max(savedScaleIndex, scaleIndexForPower(power))
    ));
    const cultivationSystem = source.cultivationSystem === "仙道" ? "仙道" : null;
    const qiRefiningUnlocked = cultivationSystem === "仙道" && source.qiRefiningUnlocked === true;
    const foundationUnlocked = qiRefiningUnlocked && source.foundationUnlocked === true;
    const goldenCoreUnlocked = foundationUnlocked && source.goldenCoreUnlocked === true;
    const advancedRealmLevel = goldenCoreUnlocked
      ? Math.max(0, Math.min(config.realms.length, Math.floor(Number(source.advancedRealmLevel) || 0)))
      : 0;
    const savedMinorTribulationExplorationLoad = Number.isFinite(Number(source.minorTribulationExplorationLoad))
      ? Number(source.minorTribulationExplorationLoad)
      : Number(source.minorTribulationExplorationAmountSum);
    const mana = qiRefiningUnlocked ? Math.max(0, Number(source.mana) || 0) : 0;
    const currentCultivationRealmLevel = goldenCoreUnlocked
      ? 3 + advancedRealmLevel
      : foundationUnlocked ? 2 : qiRefiningUnlocked ? 1 : 0;
    const maxSinglePowerGain = Math.max(0, Math.floor(Number(source.maxSinglePowerGain) || 0));
    const totalPower = Math.max(power, Number(source.totalPower) || 0);
    const totalElapsedSeconds = Math.max(0, Number(source.totalElapsedSeconds) || 0);
    const unlockedAchievements = {};
    if (source.unlockedAchievements && typeof source.unlockedAchievements === "object") {
      Object.entries(source.unlockedAchievements).forEach(([key, unlocked]) => {
        if (unlocked === true) unlockedAchievements[key] = true;
      });
    }
    if (totalPower >= 1) unlockedAchievements.powerOne = true;
    if (totalPower >= 5) unlockedAchievements.five = true;
    if (highestScaleIndex >= 1) unlockedAchievements.brick = true;
    if (maxSinglePowerGain >= 200) unlockedAchievements.trueBrick = true;
    if (qiRefiningUnlocked) unlockedAchievements.aspireImmortality = true;
    if (foundationUnlocked) unlockedAchievements.daoFoundation = true;
    if (goldenCoreUnlocked) unlockedAchievements.goldenCore = true;
    if (advancedRealmLevel >= 2 || Number(source.lifetimeHighestCultivationRealmLevel) >= 5) unlockedAchievements.humanRealmDominance = true;
    if (advancedRealmLevel >= 3 || Number(source.lifetimeHighestCultivationRealmLevel) >= 6) unlockedAchievements.refineTheVoid = true;
    if (totalElapsedSeconds >= 600) unlockedAchievements.trainingUp = true;
    if (Math.max(power, Number(source.highestPower) || 0, Number(source.lifetimeHighestPower) || 0) >= 1e100) unlockedAchievements.googol = true;
    config.scales.slice(2).forEach((scale, offset) => {
      const scaleIndex = offset + 2;
      if (highestScaleIndex >= scaleIndex) unlockedAchievements[`scale${scaleIndex}`] = true;
      if (maxSinglePowerGain >= scale.power) unlockedAchievements[`trueScale${scaleIndex}`] = true;
    });
    const achievementScaleIndex = config.scales.reduce((maximum, _scale, index) => (
      index >= 2 && unlockedAchievements[`scale${index}`] ? index : maximum
    ), unlockedAchievements.brick ? 1 : 0);
    const savedRockLevelCap = config.rockBaseLevelCap +
      (unlockedAchievements.trueScale2 ? 20 : 0) +
      (source.rockStrikePurchased === true ? 20 : 0) +
      (source.mountainCollapsePurchased === true ? 20 : 0) +
      (source.earthSplitPurchased === true ? 20 : 0) +
      (source.destroyCountryPurchased === true ? 50 : 0);
    const activeChallenge = Object.prototype.hasOwnProperty.call(config.challenges, source.activeChallenge)
      ? source.activeChallenge
      : null;
    const migratedPermanentRootLevel = Math.max(0, Math.min(3, Math.floor(Number(
      source.permanentRootLevel ?? source.reincarnationLevel
    ) || 0)));
    const legacyChallengeClearedReincarnation = source.permanentRootLevel == null &&
      source.reincarnationEffectLevel === 0 &&
      (Number(source.reincarnationLevel) || 0) > 0;
    const migratedReincarnationLevel = legacyChallengeClearedReincarnation
      ? 0
      : Math.max(0, Math.min(3, Math.floor(Number(source.reincarnationLevel) || 0)));
    const joules = Math.max(0, Number(source.joules) || 0);
    const treasureImprints = {
      tianNiPearl: Math.max(0, Math.floor(Number(source.treasureImprints?.tianNiPearl) || 0)),
      mysteriousGreenBottle: Math.max(0, Math.floor(Number(source.treasureImprints?.mysteriousGreenBottle) || 0)),
      fuBao: Math.max(0, Math.floor(Number(source.treasureImprints?.fuBao) || 0)),
      fitnessMembershipCard: Math.max(0, Math.floor(Number(source.treasureImprints?.fitnessMembershipCard) || 0)),
      xuTianDing: Math.max(0, Math.floor(Number(source.treasureImprints?.xuTianDing) || 0)),
      baLingChi: Math.max(0, Math.floor(Number(source.treasureImprints?.baLingChi) || 0)),
      wanYaoFan: Math.max(0, Math.floor(Number(source.treasureImprints?.wanYaoFan) || 0)),
      phantomHeavenMirror: Math.max(0, Math.floor(Number(source.treasureImprints?.phantomHeavenMirror) || 0)),
      mysticHeavenSacredTree: Math.max(0, Math.floor(Number(source.treasureImprints?.mysticHeavenSacredTree) || 0)),
      mysticHeavenSpiritSlayingSword: Math.max(0, Math.floor(Number(source.treasureImprints?.mysticHeavenSpiritSlayingSword) || 0))
    };
    const imprintedHeavenlyTreasureLevel = treasureImprints.wanYaoFan > 0
      ? 3
      : treasureImprints.baLingChi > 0 ? 2 : treasureImprints.xuTianDing > 0 ? 1 : 0;
    const lifetimeHighestScaleIndex = Math.max(
      highestScaleIndex,
      Math.min(config.scales.length - 1, Math.floor(Number(source.lifetimeHighestScaleIndex) || 0))
    );
    const lifetimeHighestPower = Math.max(
      power,
      Number(source.highestPower) || 0,
      Number(source.lifetimeHighestPower) || 0,
      config.scales[achievementScaleIndex].power
    );
    return {
      joules,
      power,
      highestPower: Math.max(power, Number(source.highestPower) || 0),
      lifetimeHighestJ: Math.max(joules, Number(source.lifetimeHighestJ) || 0),
      lifetimeHighestPower,
      lifetimeHighestScaleIndex: Math.max(lifetimeHighestScaleIndex, achievementScaleIndex),
      lifetimeTotalJ: Math.max(joules, Number(source.lifetimeHighestJ) || 0, Number(source.lifetimeTotalJ) || 0),
      lifetimeTotalPower: Math.max(totalPower, lifetimeHighestPower, Number(source.lifetimeTotalPower) || 0),
      lifetimeHighestMana: Math.max(mana, Number(source.lifetimeHighestMana) || 0),
      lifetimeTotalMana: Math.max(mana, Number(source.lifetimeHighestMana) || 0, Number(source.lifetimeTotalMana) || 0),
      lifetimeHighestCultivationRealmLevel: Math.min(
        3 + config.realms.length,
        Math.max(currentCultivationRealmLevel, Math.floor(Number(source.lifetimeHighestCultivationRealmLevel) || 0))
      ),
      immortalSelectionCount: Math.max(cultivationSystem === "仙道" ? 1 : 0, Math.floor(Number(source.immortalSelectionCount) || 0)),
      totalElapsedSeconds,
      totalPower,
      maxSinglePowerGain,
      brickUnlocked: highestScaleIndex >= 1,
      wallUnlocked: highestScaleIndex >= 2,
      highestScaleIndex,
      runningLevel: Math.max(0, Math.floor(migratedRunningLevel)),
      gymPurchased: source.gymPurchased === true,
      exercisePurchased: source.exercisePurchased === true,
      transcendentPurchased: source.transcendentPurchased === true,
      focusPurchased: source.focusPurchased === true,
      breathingMethodPurchased: source.breathingMethodPurchased === true,
      extremeExercisePurchased: source.extremeExercisePurchased === true,
      rockLevel: Math.max(0, Math.min(savedRockLevelCap, Math.floor(Number(source.rockLevel) || 0))),
      waterPurchased: source.waterPurchased === true,
      ghostBrainPurchased: source.ghostBrainPurchased === true,
      naturalStrengthPurchased: source.naturalStrengthPurchased === true,
      mentalPowerPurchased: source.mentalPowerPurchased === true,
      lifePowerPurchased: source.lifePowerPurchased === true,
      myStylePurchased: source.myStylePurchased === true,
      intuitionPurchased: source.intuitionPurchased === true,
      sonicMovementPurchased: source.sonicMovementPurchased === true,
      carbonLimitPurchased: source.carbonLimitPurchased === true,
      killingIntentPurchased: source.killingIntentPurchased === true,
      rockStrikePurchased: source.rockStrikePurchased === true,
      highSpeedMetabolismPurchased: source.highSpeedMetabolismPurchased === true,
      enduranceEnhancementPurchased: source.enduranceEnhancementPurchased === true,
      bulletTimePurchased: source.bulletTimePurchased === true,
      dynamicFocusPurchased: source.dynamicFocusPurchased === true,
      superPerceptionPurchased: source.superPerceptionPurchased === true,
      invulnerablePurchased: source.invulnerablePurchased === true,
      regenerationPurchased: source.regenerationPurchased === true,
      superpowerPurchased: source.superpowerPurchased === true,
      superSpeedThinkingPurchased: source.superSpeedThinkingPurchased === true,
      mountainCollapsePurchased: source.mountainCollapsePurchased === true,
      mindDivisionLevel: Math.max(0, Math.min(3, Math.floor(Number(source.mindDivisionLevel) || 0))),
      hyperRegenerationPurchased: source.hyperRegenerationPurchased === true,
      superpowerEvolutionPurchased: source.superpowerEvolutionPurchased === true,
      earthSplitPurchased: source.earthSplitPurchased === true,
      godspeedPurchased: source.godspeedPurchased === true,
      subtlePurchased: source.subtlePurchased === true,
      mentalDomainPurchased: source.mentalDomainPurchased === true,
      skySplitPurchased: source.skySplitPurchased === true,
      biologicalQuantificationPurchased: source.biologicalQuantificationPurchased === true,
      ghostManTransformationPurchased: source.ghostManTransformationPurchased === true,
      destroyCountryPurchased: source.destroyCountryPurchased === true,
      humanGhostTransformationPurchased: source.humanGhostTransformationPurchased === true,
      killingIntentSubstancePurchased: source.killingIntentSubstancePurchased === true,
      energyCyclePurchased: source.energyCyclePurchased === true,
      mountainShatterPurchased: source.mountainShatterPurchased === true,
      bioenergyPurchased: source.bioenergyPurchased === true,
      elementalizationPurchased: source.elementalizationPurchased === true,
      killingIntentPerceptionPurchased: source.killingIntentPerceptionPurchased === true,
      killingIntentWavePurchased: source.killingIntentWavePurchased === true,
      ultimateIntentPurchased: source.ultimateIntentPurchased === true,
      brainDomainDevelopmentPurchased: source.brainDomainDevelopmentPurchased === true,
      continentSplitPurchased: source.continentSplitPurchased === true,
      continentCollapsePurchased: source.continentCollapsePurchased === true,
      ghostBackActive: highestScaleIndex >= 3 && source.ghostBackActive === true,
      cultivationSystem,
      mana,
      qiRefiningUnlocked,
      immortalLifeUnlocked: source.immortalLifeUnlocked === true,
      qiSpellLevel: Math.max(0, Math.min(3, Math.floor(Number(source.qiSpellLevel) || 0))),
      foundationUnlocked,
      goldenCoreUnlocked,
      advancedRealmLevel,
      circulationUnlocked: source.circulationUnlocked === true,
      minorTechniqueUnlocked: source.minorTechniqueUnlocked === true,
      flyingEscapeUnlocked: source.flyingEscapeUnlocked === true,
      longevity800Level: Math.max(0, Math.min(4, Math.floor(Number(source.longevity800Level) || 0))),
      explorationProgress: Math.max(0, Number(source.explorationProgress) || 0),
      manaLiquefactionUnlocked: source.manaLiquefactionUnlocked === true,
      longevityLevel: Math.max(0, Math.min(2, Math.floor(Number(source.longevityLevel) || 0))),
      goldenCoreLongevityLevel: Math.max(0, Math.min(2, Math.floor(Number(source.goldenCoreLongevityLevel) || 0))),
      manaSolidificationUnlocked: source.manaSolidificationUnlocked === true,
      techniqueUnlocked: source.techniqueUnlocked === true,
      foundationSpellLevel: Math.max(0, Math.min(3, Math.floor(Number(source.foundationSpellLevel) || 0))),
      magicTreasureUnlocked: source.magicTreasureUnlocked === true,
      scatterRebuildLevel: Math.max(0, Math.min(3, Math.floor(Number(source.scatterRebuildLevel) || 0))),
      scatterRetentionLevel: Math.max(0, Math.min(3, Math.floor(Number(
        source.scatterRetentionLevel ?? source.scatterRebuildLevel
      ) || 0))),
      reincarnationLevel: migratedReincarnationLevel,
      permanentRootLevel: migratedPermanentRootLevel,
      reincarnationEffectLevel: Math.max(0, Math.min(3, Math.floor(Number(
        source.reincarnationEffectLevel ?? migratedReincarnationLevel
      ) || 0))),
      reincarnationManaJRewardLevel: Math.max(0, Math.min(3, Math.floor(Number(
        source.reincarnationManaJRewardLevel
        ?? ((Number(source.advancedRealmLevel) || 0) >= 1 ? migratedReincarnationLevel : 0)
      ) || 0))),
      materialControlUnlocked: source.materialControlUnlocked === true,
      divineSenseUnlocked: source.divineSenseUnlocked === true,
      greatCultivatorUnlocked: source.greatCultivatorUnlocked === true,
      secondNascentSoulUnlocked: source.secondNascentSoulUnlocked === true,
      naturalTreasureLevel: Math.max(0, Math.min(
        (source.spiritWorldAscensionUnlocked === true ? 20 : 10) + treasureImprints.mysticHeavenSacredTree * 5,
        Math.floor(Number(source.naturalTreasureLevel) || 0)
      )),
      spiritWorldAscensionUnlocked: source.spiritWorldAscensionUnlocked === true,
      auraControlUnlocked: source.auraControlUnlocked === true,
      equalHeavenLongevityUnlocked: source.equalHeavenLongevityUnlocked === true,
      fiveElementsUnlocked: source.fiveElementsUnlocked === true,
      heavenlyTreasureLevel: Math.max(
        imprintedHeavenlyTreasureLevel,
        Math.max(0, Math.min(3, Math.floor(Number(source.heavenlyTreasureLevel) || 0)))
      ),
      abundantAuraUnlocked: source.abundantAuraUnlocked === true,
      brahmaDemonArtUnlocked: source.brahmaDemonArtUnlocked === true,
      trueSpiritTransformationLevel: Math.max(0, Math.min(5, Math.floor(
        Number(source.trueSpiritTransformationLevel) || (source.trueSpiritTransformationUnlocked === true ? 1 : 0)
      ))),
      silverTadpoleScriptUnlocked: source.silverTadpoleScriptUnlocked === true,
      voidRefiningToQiUnlocked: source.voidRefiningToQiUnlocked === true,
      immortalRealmDivineAbilityUnlocked: source.immortalRealmDivineAbilityUnlocked === true,
      spiritRefiningArtUnlocked: source.spiritRefiningArtUnlocked === true,
      perfectedTechniqueUnlocked: source.perfectedTechniqueUnlocked === true,
      heavenEarthAuraUnlocked: source.heavenEarthAuraUnlocked === true,
      divineAbilityMasteryUnlocked: source.divineAbilityMasteryUnlocked === true,
      dualInfantUnityUnlocked: source.dualInfantUnityUnlocked === true,
      auraIntoBodyUnlocked: source.auraIntoBodyUnlocked === true,
      externalIncarnationUnlocked: source.externalIncarnationUnlocked === true,
      demonRealmJourneyUnlocked: source.demonRealmJourneyUnlocked === true,
      returnToOriginUnlocked: source.returnToOriginUnlocked === true,
      natalMagicTreasureUnlocked: source.natalMagicTreasureUnlocked === true,
      perfectedTechniqueCompletionUnlocked: source.perfectedTechniqueCompletionUnlocked === true,
      roamSpiritWorldUnlocked: source.roamSpiritWorldUnlocked === true,
      descendRealmUnlocked: source.descendRealmUnlocked === true,
      mysticHeavenlyTreasureLevel: Math.max(0, Math.min(3, Math.floor(Number(source.mysticHeavenlyTreasureLevel) || 0))),
      nascentSoulCompletionUnlocked: source.nascentSoulCompletionUnlocked === true,
      spiritTravelVoidUnlocked: source.spiritTravelVoidUnlocked === true,
      goldenSealScriptUnlocked: source.goldenSealScriptUnlocked === true,
      minorTribulationExplorationLoad: Math.max(0, savedMinorTribulationExplorationLoad || 0),
      minorTribulationRecoveryRemaining: 0,
      minorTribulationTriggered: false,
      minorTribulationInitialManaExponent: Math.max(0.8, Math.min(
        0.95,
        Number(source.minorTribulationInitialManaExponent) || 0.95
      )),
      minorTribulationLastLoadFactor: Math.max(
        0,
        Number(source.minorTribulationLastLoadFactor)
          || Number(source.minorTribulationLastTriggerExplorationAmount)
          || Number(source.minorTribulationLastAverageExplorationAmount)
          || 0
      ),
      symbolicPowerMilestones: {
        graham64: source.symbolicPowerMilestones?.graham64 === true,
        tree3: source.symbolicPowerMilestones?.tree3 === true
      },
      activeChallenge,
      activeChallengeElapsedSeconds: activeChallenge === "longevity"
        ? Math.max(0, Math.min(
          config.challenges.longevity.timeToLimitSeconds,
          Number(source.activeChallengeElapsedSeconds) || 0
        ))
        : 0,
      challengeCompletions: Object.fromEntries(Object.entries(config.challenges).map(([key, challenge]) => [
        key,
        Math.max(0, Math.min(challenge.maxCompletions, Math.floor(Number(source.challengeCompletions?.[key]) || 0)))
      ])),
      unlockedAchievements,
      treasureImprints,
      hideUnlockedAchievements: source.hideUnlockedAchievements === true,
      theme: source.theme === "dark" ? "dark" : "light",
      lastUpdateAt: Number.isFinite(Number(source.lastUpdateAt)) && Number(source.lastUpdateAt) > 0
        ? Number(source.lastUpdateAt)
        : Date.now()
    };
  }

  const fieldGroups = Object.freeze({
    "core.resources": ["joules", "power"],
    "core.runtime": ["totalElapsedSeconds", "lastUpdateAt"],
    "core.preferences": ["hideUnlockedAchievements", "theme"],
    "powerSystem.systems.scale.progress": ["highestPower", "totalPower", "maxSinglePowerGain", "brickUnlocked", "wallUnlocked", "highestScaleIndex"],
    "powerSystem.systems.scale.actions": ["runningLevel", "rockLevel", "ghostBackActive"],
    "powerSystem.systems.scale.upgrades": [
      "gymPurchased", "exercisePurchased", "transcendentPurchased", "focusPurchased", "breathingMethodPurchased",
      "extremeExercisePurchased", "waterPurchased", "ghostBrainPurchased", "naturalStrengthPurchased",
      "mentalPowerPurchased", "lifePowerPurchased", "myStylePurchased", "intuitionPurchased",
      "sonicMovementPurchased", "carbonLimitPurchased", "killingIntentPurchased", "rockStrikePurchased",
      "highSpeedMetabolismPurchased", "enduranceEnhancementPurchased", "bulletTimePurchased",
      "dynamicFocusPurchased", "superPerceptionPurchased", "invulnerablePurchased", "regenerationPurchased",
      "superpowerPurchased", "superSpeedThinkingPurchased", "mountainCollapsePurchased", "mindDivisionLevel",
      "hyperRegenerationPurchased", "superpowerEvolutionPurchased", "earthSplitPurchased", "godspeedPurchased",
      "subtlePurchased", "mentalDomainPurchased", "skySplitPurchased", "biologicalQuantificationPurchased",
      "ghostManTransformationPurchased", "destroyCountryPurchased", "humanGhostTransformationPurchased",
      "killingIntentSubstancePurchased", "energyCyclePurchased",
      "mountainShatterPurchased", "bioenergyPurchased", "elementalizationPurchased",
      "killingIntentPerceptionPurchased", "killingIntentWavePurchased", "ultimateIntentPurchased",
      "brainDomainDevelopmentPurchased", "continentSplitPurchased", "continentCollapsePurchased"
    ],
    "cultivation.systems.immortal.resources": ["mana"],
    "cultivation.systems.immortal.progress": [
      "qiRefiningUnlocked", "foundationUnlocked", "goldenCoreUnlocked", "advancedRealmLevel", "explorationProgress",
      "minorTribulationExplorationLoad", "minorTribulationRecoveryRemaining", "minorTribulationTriggered",
      "minorTribulationInitialManaExponent", "minorTribulationLastLoadFactor"
    ],
    "cultivation.systems.immortal.abilities": [
      "immortalLifeUnlocked", "qiSpellLevel", "circulationUnlocked", "minorTechniqueUnlocked", "flyingEscapeUnlocked",
      "longevity800Level", "manaLiquefactionUnlocked", "longevityLevel", "goldenCoreLongevityLevel",
      "manaSolidificationUnlocked", "techniqueUnlocked", "foundationSpellLevel", "magicTreasureUnlocked",
      "materialControlUnlocked", "divineSenseUnlocked", "greatCultivatorUnlocked", "secondNascentSoulUnlocked",
      "naturalTreasureLevel", "spiritWorldAscensionUnlocked", "auraControlUnlocked", "equalHeavenLongevityUnlocked",
      "fiveElementsUnlocked", "heavenlyTreasureLevel", "abundantAuraUnlocked", "brahmaDemonArtUnlocked",
      "trueSpiritTransformationLevel", "silverTadpoleScriptUnlocked", "voidRefiningToQiUnlocked",
      "immortalRealmDivineAbilityUnlocked", "spiritRefiningArtUnlocked", "perfectedTechniqueUnlocked",
      "heavenEarthAuraUnlocked", "divineAbilityMasteryUnlocked", "dualInfantUnityUnlocked", "auraIntoBodyUnlocked",
      "externalIncarnationUnlocked", "demonRealmJourneyUnlocked", "returnToOriginUnlocked",
      "natalMagicTreasureUnlocked", "perfectedTechniqueCompletionUnlocked", "roamSpiritWorldUnlocked",
      "descendRealmUnlocked", "mysticHeavenlyTreasureLevel", "nascentSoulCompletionUnlocked",
      "spiritTravelVoidUnlocked", "goldenSealScriptUnlocked"
    ],
    "cultivation.systems.immortal.persistent": [
      "scatterRebuildLevel", "scatterRetentionLevel", "reincarnationLevel", "permanentRootLevel",
      "reincarnationEffectLevel", "reincarnationManaJRewardLevel"
    ],
    "meta.statistics": [
      "lifetimeHighestJ", "lifetimeHighestPower", "lifetimeHighestScaleIndex", "lifetimeTotalJ",
      "lifetimeTotalPower", "lifetimeHighestMana", "lifetimeTotalMana",
      "lifetimeHighestCultivationRealmLevel", "immortalSelectionCount"
    ],
    "meta.challenges": ["activeChallenge", "activeChallengeElapsedSeconds", "challengeCompletions"],
    "meta": ["unlockedAchievements", "treasureImprints", "symbolicPowerMilestones"]
  });

  const fieldPaths = new Map();
  Object.entries(fieldGroups).forEach(([path, keys]) => keys.forEach((key) => fieldPaths.set(key, `${path}.${key}`)));
  fieldPaths.set("unlockedAchievements", "meta.achievements");
  fieldPaths.set("treasureImprints", "meta.treasures");
  fieldPaths.set("symbolicPowerMilestones", "meta.milestones");

  const trackedScaleUpgradeKeys = Object.freeze([
    "gymPurchased", "exercisePurchased", "focusPurchased", "transcendentPurchased", "breathingMethodPurchased",
    "extremeExercisePurchased", "naturalStrengthPurchased", "waterPurchased", "ghostBrainPurchased",
    "mentalPowerPurchased", "lifePowerPurchased", "myStylePurchased", "intuitionPurchased",
    "sonicMovementPurchased", "carbonLimitPurchased", "killingIntentPurchased", "rockStrikePurchased",
    "highSpeedMetabolismPurchased", "enduranceEnhancementPurchased", "bulletTimePurchased",
    "dynamicFocusPurchased", "superPerceptionPurchased", "invulnerablePurchased", "regenerationPurchased",
    "superpowerPurchased", "superSpeedThinkingPurchased", "mountainCollapsePurchased", "mindDivisionLevel",
    "hyperRegenerationPurchased", "mentalDomainPurchased", "earthSplitPurchased", "godspeedPurchased",
    "superpowerEvolutionPurchased", "subtlePurchased", "skySplitPurchased", "biologicalQuantificationPurchased",
    "ghostManTransformationPurchased", "destroyCountryPurchased", "humanGhostTransformationPurchased",
    "killingIntentSubstancePurchased", "energyCyclePurchased",
    "mountainShatterPurchased", "bioenergyPurchased", "elementalizationPurchased",
    "killingIntentPerceptionPurchased", "killingIntentWavePurchased", "ultimateIntentPurchased",
    "brainDomainDevelopmentPurchased", "continentSplitPurchased", "continentCollapsePurchased"
  ]);
  const trackedImmortalAbilityKeys = Object.freeze([
    "qiSpellLevel", "immortalLifeUnlocked", "longevityLevel", "foundationSpellLevel", "circulationUnlocked",
    "manaLiquefactionUnlocked", "techniqueUnlocked", "goldenCoreLongevityLevel", "manaSolidificationUnlocked",
    "minorTechniqueUnlocked", "magicTreasureUnlocked", "materialControlUnlocked", "flyingEscapeUnlocked",
    "longevity800Level", "divineSenseUnlocked", "greatCultivatorUnlocked", "secondNascentSoulUnlocked",
    "spiritWorldAscensionUnlocked", "auraControlUnlocked", "equalHeavenLongevityUnlocked", "fiveElementsUnlocked",
    "abundantAuraUnlocked", "heavenlyTreasureLevel", "brahmaDemonArtUnlocked",
    "trueSpiritTransformationLevel", "silverTadpoleScriptUnlocked", "voidRefiningToQiUnlocked",
    "immortalRealmDivineAbilityUnlocked", "spiritRefiningArtUnlocked", "perfectedTechniqueUnlocked",
    "heavenEarthAuraUnlocked", "divineAbilityMasteryUnlocked", "dualInfantUnityUnlocked", "auraIntoBodyUnlocked",
    "externalIncarnationUnlocked", "demonRealmJourneyUnlocked", "returnToOriginUnlocked",
    "natalMagicTreasureUnlocked", "perfectedTechniqueCompletionUnlocked", "roamSpiritWorldUnlocked",
    "descendRealmUnlocked", "mysticHeavenlyTreasureLevel", "nascentSoulCompletionUnlocked",
    "spiritTravelVoidUnlocked", "goldenSealScriptUnlocked"
  ]);

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
    return value;
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function mergeKnown(target, source) {
    if (!isRecord(source)) return clone(source);
    const result = isRecord(target) ? clone(target) : {};
    Object.entries(source).forEach(([key, value]) => {
      result[key] = isRecord(value) ? mergeKnown(result[key], value) : clone(value);
    });
    return result;
  }

  function getPath(root, path) {
    return path.split(".").reduce((value, key) => value?.[key], root);
  }

  function setPath(root, path, value) {
    const keys = path.split(".");
    const finalKey = keys.pop();
    const parent = keys.reduce((target, key) => (target[key] ||= {}), root);
    parent[finalKey] = value;
  }

  function emptyDomain() {
    return {
      core: { resources: {}, runtime: {}, preferences: {} },
      powerSystem: { active: "scale", systems: { scale: { progress: {}, actions: {}, upgrades: {}, history: { manualUpgrades: {} } } } },
      cultivation: { active: null, systems: { immortal: { resources: {}, progress: {}, abilities: {}, persistent: {}, history: { manualAbilities: {}, manualRealmLevel: 0 } } } },
      meta: { achievements: {}, treasures: {}, milestones: {}, statistics: {}, challenges: {}, infinity: { currency: 0, upgrades: {} } }
    };
  }

  function attachLegacyAliases(domain) {
    fieldPaths.forEach((path, key) => Object.defineProperty(domain, key, {
      configurable: true,
      enumerable: false,
      get: () => getPath(domain, path),
      set: (value) => setPath(domain, path, value)
    }));
    Object.defineProperty(domain, "cultivationSystem", {
      configurable: true, enumerable: false,
      get: () => domain.cultivation.active === "immortal" ? "仙道" : null,
      set: (value) => { domain.cultivation.active = value === "仙道" || value === "immortal" ? "immortal" : null; }
    });
    return domain;
  }

  function fromFlat(flatInput) {
    const flat = { ...freshFlat(), ...flatInput };
    const domain = emptyDomain();
    fieldPaths.forEach((path, key) => setPath(domain, path, clone(flat[key])));
    domain.cultivation.active = flat.cultivationSystem === "仙道" || flat.cultivationSystem === "immortal" ? "immortal" : null;
    domain.meta.achievements = clone(flat.unlockedAchievements || {});
    domain.meta.treasures = clone(flat.treasureImprints || {});
    domain.meta.milestones = clone(flat.symbolicPowerMilestones || {});
    domain.meta.challenges.activeChallenge = flat.activeChallenge ?? null;
    domain.meta.challenges.activeChallengeElapsedSeconds = flat.activeChallengeElapsedSeconds || 0;
    domain.meta.challenges.challengeCompletions = clone(flat.challengeCompletions || {});
    domain.powerSystem.systems.scale.history.manualUpgrades = Object.fromEntries(
      trackedScaleUpgradeKeys.filter((key) => Number(flat[key]) > 0 || flat[key] === true).map((key) => [key, true])
    );
    domain.cultivation.systems.immortal.history.manualAbilities = Object.fromEntries(
      trackedImmortalAbilityKeys.filter((key) => Number(flat[key]) > 0 || flat[key] === true).map((key) => [key, true])
    );
    const currentRealmLevel = flat.goldenCoreUnlocked
      ? 3 + flat.advancedRealmLevel
      : flat.foundationUnlocked ? 2 : flat.qiRefiningUnlocked ? 1 : 0;
    domain.cultivation.systems.immortal.history.manualRealmLevel = Math.max(
      currentRealmLevel,
      Math.floor(Number(flat.lifetimeHighestCultivationRealmLevel) || 0)
    );
    return attachLegacyAliases(domain);
  }

  function toFlat(state) {
    const flat = {};
    Object.keys(freshFlat()).forEach((key) => { flat[key] = clone(state[key]); });
    return flat;
  }

  function toSerializable(state) {
    return clone({ core: state.core, powerSystem: state.powerSystem, cultivation: state.cultivation, meta: state.meta });
  }

  function flatFromDomain(domain) {
    return toFlat(attachLegacyAliases(clone(domain)));
  }

  function fresh() {
    return fromFlat(freshFlat());
  }

  function normalizeLegacy(input) {
    return fromFlat(normalizeFlat(input));
  }

  function normalizeDomain(input) {
    const source = isRecord(input) ? clone(input) : {};
    const knownFlat = flatFromDomain(source);
    const immortalAbilities = source.cultivation?.systems?.immortal?.abilities;
    if (isRecord(immortalAbilities)) {
      knownFlat.trueSpiritTransformationLevel = immortalAbilities.trueSpiritTransformationLevel
        ?? (immortalAbilities.trueSpiritTransformationUnlocked === true ? 1 : 0);
    }
    // 仙道子树可能在武道等其他体系激活时仍保留；归一化子树不能依赖当前 active。
    if (isRecord(source.cultivation?.systems?.immortal)) knownFlat.cultivationSystem = "仙道";
    const normalizedKnown = toSerializable(fromFlat(normalizeFlat(knownFlat)));
    normalizedKnown.meta.statistics.immortalSelectionCount = Math.max(
      source.cultivation?.active === "immortal" ? 1 : 0,
      Math.floor(Number(knownFlat.immortalSelectionCount) || 0)
    );
    const domain = mergeKnown(source, normalizedKnown);
    delete domain.cultivation.systems.immortal.abilities.trueSpiritTransformationUnlocked;

    if (isRecord(source.powerSystem?.systems?.scale?.history)) {
      domain.powerSystem.systems.scale.history = clone(source.powerSystem.systems.scale.history);
    }
    if (isRecord(source.cultivation?.systems?.immortal?.history)) {
      domain.cultivation.systems.immortal.history = clone(source.cultivation.systems.immortal.history);
    }
    domain.powerSystem.systems.scale.history.manualUpgrades = isRecord(domain.powerSystem.systems.scale.history.manualUpgrades)
      ? domain.powerSystem.systems.scale.history.manualUpgrades : {};
    domain.cultivation.systems.immortal.history.manualAbilities = isRecord(domain.cultivation.systems.immortal.history.manualAbilities)
      ? domain.cultivation.systems.immortal.history.manualAbilities : {};
    if (domain.cultivation.systems.immortal.history.manualAbilities.trueSpiritTransformationUnlocked === true) {
      domain.cultivation.systems.immortal.history.manualAbilities.trueSpiritTransformationLevel = true;
      delete domain.cultivation.systems.immortal.history.manualAbilities.trueSpiritTransformationUnlocked;
    }
    domain.cultivation.systems.immortal.history.manualRealmLevel = Math.max(
      0,
      Math.min(3 + config.realms.length, Math.floor(Number(domain.cultivation.systems.immortal.history.manualRealmLevel) || 0))
    );

    domain.powerSystem.active = typeof source.powerSystem?.active === "string" && source.powerSystem.active
      ? source.powerSystem.active
      : "scale";
    domain.cultivation.active = source.cultivation?.active === null
      ? null
      : typeof source.cultivation?.active === "string" && source.cultivation.active
        ? source.cultivation.active
        : normalizedKnown.cultivation.active;

    const infinity = isRecord(source.meta?.infinity) ? clone(source.meta.infinity) : {};
    infinity.currency = Math.max(0, Number(infinity.currency) || 0);
    if (!isRecord(infinity.upgrades)) infinity.upgrades = {};
    domain.meta.infinity = infinity;
    return attachLegacyAliases(domain);
  }

  function normalize(input) {
    return input?.core && input?.powerSystem && input?.cultivation && input?.meta
      ? normalizeDomain(input)
      : normalizeLegacy(input);
  }

  const migrations = Object.freeze({
    36: (data) => normalizeLegacy(data),
    37: (data) => normalizeLegacy(data),
    38: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    39: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data)
  });

  function migrate(schemaVersion, data) {
    const version = Number(schemaVersion) || 36;
    const migration = migrations[version] || migrations[Math.min(version, 39)] || migrations[36];
    return migration(data);
  }

  function domainView(state) {
    const view = toSerializable(state);
    const progress = view.cultivation.systems.immortal.progress;
    progress.realmLevel = state.goldenCoreUnlocked
      ? 3 + state.advancedRealmLevel
      : state.foundationUnlocked ? 2 : state.qiRefiningUnlocked ? 1 : 0;
    const freezeTree = (value) => {
      if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
      Object.values(value).forEach(freezeTree);
      return Object.freeze(value);
    };
    return freezeTree(view);
  }

  WIS.Core.State = Object.freeze({ defaults, fieldGroups, fresh, normalize, normalizeDomain, migrate, fromFlat, toFlat, toSerializable, domainView });
}(window.WIS));
