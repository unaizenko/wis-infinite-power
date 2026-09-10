(function defineStateFactory(WIS) {
  "use strict";

  const { BN, ZERO, add, mul, isDecimal, max: maxBN, gt, gte, toNumber } = WIS.Core.BigNum;
  const greatest = (...values) => values.reduce((result, value) => maxBN(result, value), ZERO);
  const MAX_SAFE_INTEGER_BN = BN(Number.MAX_SAFE_INTEGER);

  function treasureCount(value) {
    return maxBN(ZERO, WIS.Meta.TreasureLedger?.project(value ?? ZERO) ?? BN(value)).floor();
  }

  function compatibleTreasureCount(value) {
    const count = treasureCount(value);
    return gte(MAX_SAFE_INTEGER_BN, count) ? toNumber(count, 0) : count;
  }

  const defaults = Object.freeze({
    joules: ZERO, joulesGainResidual: ZERO, power: ZERO, powerGainResidual: ZERO,
    highestPower: ZERO, lifetimeHighestJ: ZERO, lifetimeHighestPower: ZERO,
    lifetimeHighestScaleIndex: 0, lifetimeTotalJ: ZERO, lifetimeTotalPower: ZERO,
    lifetimeHighestMana: ZERO, lifetimeTotalMana: ZERO, lifetimeHighestImmortalPower: ZERO,
    lifetimeTotalImmortalPower: ZERO, lifetimeHighestCultivationRealmLevel: 0,
    explorationTotal: ZERO, explorationTotalResidual: [], explorationTotalIncomplete: false, explorationTotalApproximate: false,
    currentRebirthHighestJ: ZERO, currentRebirthTotalJ: ZERO,
    currentRebirthHighestPower: ZERO, currentRebirthTotalPower: ZERO,
    currentRebirthHighestScaleIndex: 0, currentRebirthHighestMana: ZERO, currentRebirthTotalMana: ZERO,
    currentRebirthHighestImmortalPower: ZERO, currentRebirthTotalImmortalPower: ZERO,
    currentRebirthHighestCultivationRealmLevel: 0,
    immortalSelectionCount: 0, totalElapsedSeconds: 0, reincarnationElapsedSeconds: 0,
    currentScaleElapsedSeconds: 0, totalPower: ZERO, maxSinglePowerGain: ZERO,
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
    mentalDomainPurchased: false, skySplitPurchased: false, ghostBackPurchased: false, ghostBackActive: false,
    biologicalQuantificationPurchased: false, ghostManTransformationPurchased: false,
    destroyCountryPurchased: false, humanGhostTransformationPurchased: false,
    killingIntentSubstancePurchased: false, energyCyclePurchased: false,
    mountainShatterPurchased: false, bioenergyPurchased: false,
    elementalizationPurchased: false, killingIntentPerceptionPurchased: false,
    killingIntentWavePurchased: false, ultimateIntentPurchased: false,
    brainDomainDevelopmentPurchased: false, continentSplitPurchased: false,
    continentCollapsePurchased: false, waveEyePurchased: false,
    elementalAwakeningPurchased: false, moonfallPurchased: false,
    flowStatePurchased: false, selfhoodPurchased: false, freedomPurchased: false,
    chicxulubMeteoritePurchased: false, planetWillPurchased: false, starSpiritPurchased: false,
    starShatterPurchased: false, spaceQuakePurchased: false, selflessPurchased: false,
    supernaturalFirePurchased: false, fiveSpiritStonePurchased: false, selfSuppressionPurchased: false,
    stellarFurnacePurchased: false, stellarTreasureSeekingPurchased: false,
    gravitationalCollapsePurchased: false, galacticReturnPurchased: false,
    stellarSeaGiftPurchased: false, stellarResonancePurchased: false,
    greatAttractorPurchased: false, largeScaleAdaptationPurchased: false,
    superclusterCollapsePurchased: false, cosmicWebPurchased: false,
    scaleUnificationPurchased: false, spacetimeFrameworkPurchased: false,
    superLollipopRollProgress: 0, fiveSpiritStoneRollProgress: 0,
    cultivationSystem: null, mana: ZERO, manaGainResidual: ZERO,
    immortalPower: ZERO, immortalPowerGainResidual: ZERO,
    qiRefiningUnlocked: false, immortalLifeUnlocked: false,
    qiSpellLevel: 0, foundationUnlocked: false, goldenCoreUnlocked: false, advancedRealmLevel: 0,
    circulationUnlocked: false, minorTechniqueUnlocked: false, flyingEscapeUnlocked: false,
    longevity800Level: 0, explorationProgress: ZERO, explorationProgressResidual: [], explorationAttemptResidual: [], manaLiquefactionUnlocked: false,
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
    immortalSpiritPowerUnlocked: false, undyingPrimordialSpiritUnlocked: false,
    immortalApertureLevel: 0, xuanImmortalBodyUnlocked: false, lawUnlocked: false,
    immortalApertureIIUnlocked: false, spiritDomainUnlocked: false, threadsOfLawUnlocked: false,
    immortalApertureIIIUnlocked: false, spiritCaptureReturnUnlocked: false,
    indestructibleDharmaBodyUnlocked: false, immortalApertureIVUnlocked: false,
    fiveElementsTreasureUnlocked: false, lawAffinityUnlocked: false,
    flawlessJadeBodyUnlocked: false, spiritDomainWorldTransformationUnlocked: false,
    immortalApertureVUnlocked: false, immortalApertureVIUnlocked: false,
    immortalApertureVIIUnlocked: false, soulQualitativeChangeUnlocked: false,
    trinityUnlocked: false, unityWithDaoUnlocked: false, lawOriginUnlocked: false,
    lawCrystalFilamentUnlocked: false, severThreeCorpsesUnlocked: false,
    ultimateImmortalApertureUnlocked: false,
    daoLawUnityUnlocked: false, daoDomainUnlocked: false, daoPowerUnlocked: false,
    daoTimeLawUnlocked: false, daoAssimilationUnlocked: false,
    fiveElementsTreasureRollProgress: 0, immortalCrystalRollProgress: 0, minorTribulationExplorationLoad: ZERO,
    activeChallenge: null, activeChallengeElapsedSeconds: 0, threeCorpseChallengesUnlocked: false,
    currentQiLayer: 1, bestQiLayer: 0,
    hideUnlockedAchievements: false, offlineFastForwardEnabled: true,
    immortalAbilityAutomationEnabled: true, immortalRealmAutomationEnabled: true,
    scaleUpgradeAutomationEnabled: true, scaleActionAutomationEnabled: true,
    theme: "light"
  });

  function freshFlat() {
    return {
      ...defaults,
      symbolicPowerMilestones: { graham64: false, tree3: false },
      challengeCompletions: Object.fromEntries(Object.keys(WIS.Core.Config.challenges).map((key) => [key, 0])),
      unlockedAchievements: {},
      treasureProgress: {}, treasureProgressResidual: {}, treasureQualifications: {}, treasureProgressVersion: 1,
      treasureCredits: {}, treasureStockResidual: {}, treasureProgressResidualTail: {}, treasureProgressPending: {}, treasureProgressStatus: {},
      treasureImprints: {
        tianNiPearl: ZERO, mysteriousGreenBottle: ZERO, fuBao: ZERO, fitnessMembershipCard: ZERO,
        superLollipop: ZERO, skyCrystal: ZERO, xuTianDing: ZERO, baLingChi: ZERO, wanYaoFan: ZERO,
        phantomHeavenMirror: ZERO, mysticHeavenSacredTree: ZERO, mysticHeavenSpiritSlayingSword: ZERO,
        fiveElementsTreasure: ZERO, immortalCrystal: ZERO, fiveSpiritStone: ZERO,
        cosmicFiber: ZERO, cosmicWill: ZERO
      },
      lastUpdateAt: Date.now()
    };
  }

  const config = WIS.Core.Config;

  function scaleIndexForPower(power) {
    let index = 0;
    config.scales.forEach((scale, candidate) => {
      if (gte(power, scale.power)) index = candidate;
    });
    return index;
  }

  function normalizeFlat(input) {
    const source = input && typeof input === "object" ? input : {};
    const migratedRunningLevel = Number.isFinite(Number(source.runningLevel))
      ? Number(source.runningLevel)
      : source.runningPurchased ? 1 : 0;
    const power = maxBN(ZERO, BN(source.power));
    const savedScaleIndex = Number.isFinite(Number(source.highestScaleIndex))
      ? Math.floor(Number(source.highestScaleIndex))
      : source.wallUnlocked ? 2 : source.brickUnlocked ? 1 : 0;
    const highestScaleIndex = Math.max(0, Math.min(
      config.scales.length - 1,
      source.activeChallenge === "blackHole"
        ? savedScaleIndex
        : Math.max(savedScaleIndex, scaleIndexForPower(power))
    ));
    const cultivationSystem = source.cultivationSystem === "仙道" ? "仙道" : null;
    const qiRefiningUnlocked = cultivationSystem === "仙道" && source.qiRefiningUnlocked === true;
    const foundationUnlocked = qiRefiningUnlocked && source.foundationUnlocked === true;
    const goldenCoreUnlocked = foundationUnlocked && source.goldenCoreUnlocked === true;
    const advancedRealmLevel = goldenCoreUnlocked
      ? Math.max(0, Math.min(config.realms.length, Math.floor(Number(source.advancedRealmLevel) || 0)))
      : 0;
    const savedMinorTribulationExplorationLoad = maxBN(ZERO, BN(
      source.minorTribulationExplorationLoad ?? source.minorTribulationExplorationAmountSum
    ));
    const mana = qiRefiningUnlocked ? maxBN(ZERO, BN(source.mana)) : ZERO;
    const immortalPower =
      advancedRealmLevel >= config.immortalPower.unlockAdvancedRealmLevel
        ? maxBN(ZERO, BN(source.immortalPower))
        : ZERO;
    const currentCultivationRealmLevel = goldenCoreUnlocked
      ? 3 + advancedRealmLevel
      : foundationUnlocked ? 2 : qiRefiningUnlocked ? 1 : 0;
    const maxSinglePowerGain = maxBN(ZERO, BN(source.maxSinglePowerGain)).floor();
    const totalPower = maxBN(power, BN(source.totalPower));
    const totalElapsedSeconds = Math.max(0, Number(source.totalElapsedSeconds) || 0);
    const unlockedAchievements = {};
    if (source.unlockedAchievements && typeof source.unlockedAchievements === "object") {
      Object.entries(source.unlockedAchievements).forEach(([key, unlocked]) => {
        if (unlocked === true) unlockedAchievements[key] = true;
      });
    }
    if (gte(totalPower, 1)) unlockedAchievements.powerOne = true;
    if (gte(totalPower, 5)) unlockedAchievements.five = true;
    if (highestScaleIndex >= 1) unlockedAchievements.brick = true;
    if (gte(maxSinglePowerGain, 200)) unlockedAchievements.trueBrick = true;
    if (qiRefiningUnlocked) unlockedAchievements.aspireImmortality = true;
    if (foundationUnlocked) unlockedAchievements.daoFoundation = true;
    if (goldenCoreUnlocked) unlockedAchievements.goldenCore = true;
    if (advancedRealmLevel >= 2 || Number(source.lifetimeHighestCultivationRealmLevel) >= 5) unlockedAchievements.humanRealmDominance = true;
    if (advancedRealmLevel >= 3 || Number(source.lifetimeHighestCultivationRealmLevel) >= 6) unlockedAchievements.refineTheVoid = true;
    if (advancedRealmLevel >= 6 || Number(source.lifetimeHighestCultivationRealmLevel) >= 9) unlockedAchievements.ascendImmortal = true;
    if (advancedRealmLevel >= 7 || Number(source.lifetimeHighestCultivationRealmLevel) >= 10) unlockedAchievements.goldenNature = true;
    if (advancedRealmLevel >= 8 || Number(source.lifetimeHighestCultivationRealmLevel) >= 11) unlockedAchievements.utmostPurity = true;
    if (advancedRealmLevel >= 9 || Number(source.lifetimeHighestCultivationRealmLevel) >= 12) unlockedAchievements.greatLuo = true;
    if (advancedRealmLevel >= 10 || Number(source.lifetimeHighestCultivationRealmLevel) >= 13) unlockedAchievements.selfSeveringSlash = true;
    if (advancedRealmLevel >= 10 || Number(source.lifetimeHighestCultivationRealmLevel) >= 13 || unlockedAchievements.selfSeveringSlash) unlockedAchievements.qiPathComplete = true;
    if (totalElapsedSeconds >= 600) unlockedAchievements.trainingUp = true;
    if (gte(greatest(power, source.highestPower, source.lifetimeHighestPower), "1e100")) unlockedAchievements.googol = true;
    config.scales.slice(2).forEach((scale, offset) => {
      const scaleIndex = offset + 2;
      if (highestScaleIndex >= scaleIndex) unlockedAchievements[`scale${scaleIndex}`] = true;
      if (gte(maxSinglePowerGain, scale.power)) unlockedAchievements[`trueScale${scaleIndex}`] = true;
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
    const joules = maxBN(ZERO, BN(source.joules));
    const treasureImprints = {
      tianNiPearl: treasureCount(source.treasureImprints?.tianNiPearl),
      mysteriousGreenBottle: treasureCount(source.treasureImprints?.mysteriousGreenBottle),
      fuBao: treasureCount(source.treasureImprints?.fuBao),
      fitnessMembershipCard: treasureCount(source.treasureImprints?.fitnessMembershipCard),
      xuTianDing: treasureCount(source.treasureImprints?.xuTianDing),
      baLingChi: treasureCount(source.treasureImprints?.baLingChi),
      wanYaoFan: treasureCount(source.treasureImprints?.wanYaoFan),
      phantomHeavenMirror: treasureCount(source.treasureImprints?.phantomHeavenMirror),
      mysticHeavenSacredTree: treasureCount(source.treasureImprints?.mysticHeavenSacredTree),
      mysticHeavenSpiritSlayingSword: treasureCount(source.treasureImprints?.mysticHeavenSpiritSlayingSword),
      fiveElementsTreasure: treasureCount(source.treasureImprints?.fiveElementsTreasure),
      immortalCrystal: treasureCount(source.treasureImprints?.immortalCrystal),
      superLollipop: treasureCount(source.treasureImprints?.superLollipop),
      skyCrystal: treasureCount(source.treasureImprints?.skyCrystal),
      fiveSpiritStone: treasureCount(source.treasureImprints?.fiveSpiritStone),
      cosmicFiber: treasureCount(source.treasureImprints?.cosmicFiber),
      cosmicWill: treasureCount(source.treasureImprints?.cosmicWill)
    };
    // Keep serialized principals separate from tails, but use complete balances
    // for qualification and natural-treasure limits (including v49 bad principals).
    const inventoryForRules=WIS.Meta.TreasureLedger ? Object.fromEntries(Object.keys(treasureImprints).map(key=>[
      key,WIS.Meta.TreasureLedger.value(WIS.Meta.TreasureLedger.stock({meta:{treasures:treasureImprints,
        treasureStockResidual:source.treasureStockResidual}},key))])) : treasureImprints;
    const imprintedHeavenlyTreasureLevel = gt(inventoryForRules.wanYaoFan, ZERO)
      ? 3
      : gt(inventoryForRules.baLingChi, ZERO) ? 2 : gt(inventoryForRules.xuTianDing, ZERO) ? 1 : 0;
    const imprintedMysticHeavenlyTreasureLevel = gt(inventoryForRules.mysticHeavenSpiritSlayingSword, ZERO)
      ? 3
      : gt(inventoryForRules.mysticHeavenSacredTree, ZERO) ? 2 : gt(inventoryForRules.phantomHeavenMirror, ZERO) ? 1 : 0;
    const lifetimeHighestScaleIndex = Math.max(
      highestScaleIndex,
      Math.min(config.scales.length - 1, Math.floor(Number(source.lifetimeHighestScaleIndex) || 0))
    );
    const lifetimeHighestPower = greatest(
      power, source.highestPower, source.lifetimeHighestPower,
      config.scales[achievementScaleIndex].power
    );
    const ghostBackPurchased = source.ghostBackPurchased === true;
    return {
      joules,
      joulesGainResidual: maxBN(ZERO, BN(source.joulesGainResidual)),
      power,
      powerGainResidual: maxBN(ZERO, BN(source.powerGainResidual)),
      manaGainResidual: qiRefiningUnlocked
        ? maxBN(ZERO, BN(source.manaGainResidual))
        : ZERO,
      immortalPowerGainResidual: advancedRealmLevel >= config.immortalPower.unlockAdvancedRealmLevel
        ? maxBN(ZERO, BN(source.immortalPowerGainResidual))
        : ZERO,
      highestPower: maxBN(power, BN(source.highestPower)),
      lifetimeHighestJ: maxBN(joules, BN(source.lifetimeHighestJ)),
      lifetimeHighestPower,
      lifetimeHighestScaleIndex: Math.max(lifetimeHighestScaleIndex, achievementScaleIndex),
      lifetimeTotalJ: greatest(joules, source.lifetimeHighestJ, source.lifetimeTotalJ),
      lifetimeTotalPower: greatest(totalPower, lifetimeHighestPower, source.lifetimeTotalPower),
      lifetimeHighestMana: maxBN(mana, BN(source.lifetimeHighestMana)),
      lifetimeTotalMana: greatest(mana, source.lifetimeHighestMana, source.lifetimeTotalMana),
      lifetimeHighestImmortalPower: maxBN(immortalPower, BN(source.lifetimeHighestImmortalPower)),
      lifetimeTotalImmortalPower: greatest(
        immortalPower,
        source.lifetimeHighestImmortalPower,
        source.lifetimeTotalImmortalPower
      ),
      lifetimeHighestCultivationRealmLevel: Math.min(
        3 + config.realms.length,
        Math.max(currentCultivationRealmLevel, Math.floor(Number(source.lifetimeHighestCultivationRealmLevel) || 0))
      ),
      currentRebirthHighestJ: maxBN(joules, BN(source.currentRebirthHighestJ)),
      currentRebirthTotalJ: greatest(joules, source.currentRebirthHighestJ, source.currentRebirthTotalJ),
      currentRebirthHighestPower: greatest(power, source.highestPower, source.currentRebirthHighestPower),
      currentRebirthTotalPower: greatest(
        totalPower,
        source.currentRebirthHighestPower,
        source.currentRebirthTotalPower
      ),
      currentRebirthHighestScaleIndex: Math.max(
        highestScaleIndex,
        Math.min(config.scales.length - 1, Math.floor(Number(source.currentRebirthHighestScaleIndex) || 0))
      ),
      currentRebirthHighestMana: maxBN(mana, BN(source.currentRebirthHighestMana)),
      currentRebirthTotalMana: greatest(mana, source.currentRebirthHighestMana, source.currentRebirthTotalMana),
      currentRebirthHighestImmortalPower: maxBN(
        immortalPower,
        BN(source.currentRebirthHighestImmortalPower)
      ),
      currentRebirthTotalImmortalPower: greatest(
        immortalPower,
        source.currentRebirthHighestImmortalPower,
        source.currentRebirthTotalImmortalPower
      ),
      currentRebirthHighestCultivationRealmLevel: Math.min(
        3 + config.realms.length,
        Math.max(
          currentCultivationRealmLevel,
          Math.floor(Number(source.currentRebirthHighestCultivationRealmLevel) || 0)
        )
      ),
      immortalSelectionCount: Math.max(cultivationSystem === "仙道" ? 1 : 0, Math.floor(Number(source.immortalSelectionCount) || 0)),
      totalElapsedSeconds,
      reincarnationElapsedSeconds: Math.max(0, Number(source.reincarnationElapsedSeconds) || 0),
      currentScaleElapsedSeconds: Math.max(0, Number(source.currentScaleElapsedSeconds) || 0),
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
      waveEyePurchased: source.waveEyePurchased === true,
      elementalAwakeningPurchased: source.elementalAwakeningPurchased === true,
      moonfallPurchased: source.moonfallPurchased === true,
      flowStatePurchased: source.flowStatePurchased === true,
      selfhoodPurchased: source.selfhoodPurchased === true,
      freedomPurchased: source.freedomPurchased === true,
      chicxulubMeteoritePurchased: source.chicxulubMeteoritePurchased === true,
      planetWillPurchased: source.planetWillPurchased === true,
      starSpiritPurchased: source.starSpiritPurchased === true,
      starShatterPurchased: source.starShatterPurchased === true,
      spaceQuakePurchased: source.spaceQuakePurchased === true,
      selflessPurchased: source.selflessPurchased === true,
      supernaturalFirePurchased: source.supernaturalFirePurchased === true,
      fiveSpiritStonePurchased: source.fiveSpiritStonePurchased === true || source.treasureQualifications?.fiveSpiritStone === true || gt(inventoryForRules.fiveSpiritStone, ZERO),
      selfSuppressionPurchased: source.selfSuppressionPurchased === true,
      stellarFurnacePurchased: source.stellarFurnacePurchased === true,
      stellarTreasureSeekingPurchased: source.stellarTreasureSeekingPurchased === true,
      gravitationalCollapsePurchased: source.gravitationalCollapsePurchased === true,
      galacticReturnPurchased: source.galacticReturnPurchased === true,
      stellarSeaGiftPurchased: source.stellarSeaGiftPurchased === true,
      stellarResonancePurchased: source.stellarResonancePurchased === true,
      greatAttractorPurchased: source.greatAttractorPurchased === true,
      largeScaleAdaptationPurchased: source.largeScaleAdaptationPurchased === true,
      superclusterCollapsePurchased: source.superclusterCollapsePurchased === true,
      cosmicWebPurchased: source.cosmicWebPurchased === true,
      scaleUnificationPurchased: source.scaleUnificationPurchased === true,
      spacetimeFrameworkPurchased: source.spacetimeFrameworkPurchased === true,
      ghostBackPurchased,
      superLollipopRollProgress: Number.isFinite(Number(source.superLollipopRollProgress))
        ? Math.max(0, Number(source.superLollipopRollProgress)) % 1
        : 0,
      fiveSpiritStoneRollProgress: Number.isFinite(Number(source.fiveSpiritStoneRollProgress))
        ? Math.max(0, Number(source.fiveSpiritStoneRollProgress)) % 1
        : 0,
      ghostBackActive: ghostBackPurchased && source.ghostBackActive === true,
      cultivationSystem,
      mana,
      immortalPower,
      qiRefiningUnlocked,
      immortalLifeUnlocked: source.immortalLifeUnlocked === true,
      qiSpellLevel: Math.max(0, Math.min(3, Math.floor(Number(source.qiSpellLevel) || 0))),
      foundationUnlocked,
      goldenCoreUnlocked,
      advancedRealmLevel,
      currentQiLayer: Math.max(1, Math.floor(Number(source.currentQiLayer) || 1)),
      circulationUnlocked: source.circulationUnlocked === true,
      minorTechniqueUnlocked: source.minorTechniqueUnlocked === true,
      flyingEscapeUnlocked: source.flyingEscapeUnlocked === true,
      longevity800Level: Math.max(0, Math.min(4, Math.floor(Number(source.longevity800Level) || 0))),
      explorationProgress: maxBN(ZERO, BN(source.explorationProgress)),
      explorationProgressResidual: clone(source.explorationProgressResidual || []),
      explorationAttemptResidual: clone(source.explorationAttemptResidual || []),
      explorationTotal: maxBN(ZERO, BN(source.explorationTotal ?? ZERO)),
      explorationTotalResidual: clone(source.explorationTotalResidual || []),
      explorationTotalIncomplete: source.explorationTotalIncomplete === true || source.explorationTotal === undefined,
      explorationTotalApproximate: source.explorationTotalApproximate === true,
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
        toNumber(add(
          source.spiritWorldAscensionUnlocked === true ? 20 : 10,
          mul(inventoryForRules.mysticHeavenSacredTree, 2)
        ), Number.MAX_SAFE_INTEGER),
        Math.floor(Number(source.naturalTreasureLevel) || 0)
      )),
      spiritWorldAscensionUnlocked: source.spiritWorldAscensionUnlocked === true,
      auraControlUnlocked: source.auraControlUnlocked === true,
      equalHeavenLongevityUnlocked: source.equalHeavenLongevityUnlocked === true,
      fiveElementsUnlocked: source.fiveElementsUnlocked === true,
      heavenlyTreasureLevel: Math.max(
        Math.max(0, Math.min(3, Number(source.treasureQualifications?.heavenlyTreasureLevel) || 0)),
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
      mysticHeavenlyTreasureLevel: Math.max(
        Math.max(0, Math.min(3, Number(source.treasureQualifications?.mysticHeavenlyTreasureLevel) || 0)),
        imprintedMysticHeavenlyTreasureLevel,
        Math.max(0, Math.min(3, Math.floor(Number(source.mysticHeavenlyTreasureLevel) || 0)))
      ),
      nascentSoulCompletionUnlocked: source.nascentSoulCompletionUnlocked === true,
      spiritTravelVoidUnlocked: source.spiritTravelVoidUnlocked === true,
      goldenSealScriptUnlocked: source.goldenSealScriptUnlocked === true,
      immortalSpiritPowerUnlocked: advancedRealmLevel >= config.immortalPower.unlockAdvancedRealmLevel,
      undyingPrimordialSpiritUnlocked: source.undyingPrimordialSpiritUnlocked === true,
      immortalApertureLevel: Math.max(0, Math.min(
        source.ultimateImmortalApertureUnlocked === true
          ? config.immortalPower.immortalAperture.cap
          : config.immortalPower.immortalAperture.ultimateRuleStartLevel,
        Math.floor(Number(source.immortalApertureLevel) || 0)
      )),
      xuanImmortalBodyUnlocked: source.xuanImmortalBodyUnlocked === true,
      lawUnlocked: source.lawUnlocked === true,
      immortalApertureIIUnlocked: source.immortalApertureIIUnlocked === true,
      spiritDomainUnlocked: source.spiritDomainUnlocked === true,
      threadsOfLawUnlocked: source.threadsOfLawUnlocked === true,
      immortalApertureIIIUnlocked: source.immortalApertureIIIUnlocked === true,
      spiritCaptureReturnUnlocked: source.spiritCaptureReturnUnlocked === true,
      indestructibleDharmaBodyUnlocked: source.indestructibleDharmaBodyUnlocked === true,
      immortalApertureIVUnlocked: source.immortalApertureIVUnlocked === true,
      fiveElementsTreasureUnlocked: source.fiveElementsTreasureUnlocked === true || source.treasureQualifications?.fiveElementsTreasure === true || gt(inventoryForRules.fiveElementsTreasure, ZERO),
      lawAffinityUnlocked: source.lawAffinityUnlocked === true,
      flawlessJadeBodyUnlocked: source.flawlessJadeBodyUnlocked === true,
      spiritDomainWorldTransformationUnlocked: source.spiritDomainWorldTransformationUnlocked === true,
      immortalApertureVUnlocked: source.immortalApertureVUnlocked === true,
      immortalApertureVIUnlocked: source.immortalApertureVIUnlocked === true,
      immortalApertureVIIUnlocked: source.immortalApertureVIIUnlocked === true,
      soulQualitativeChangeUnlocked: source.soulQualitativeChangeUnlocked === true,
      trinityUnlocked: source.trinityUnlocked === true,
      unityWithDaoUnlocked: source.unityWithDaoUnlocked === true,
      lawOriginUnlocked: source.lawOriginUnlocked === true,
      lawCrystalFilamentUnlocked: source.lawCrystalFilamentUnlocked === true,
      severThreeCorpsesUnlocked: source.severThreeCorpsesUnlocked === true,
      ultimateImmortalApertureUnlocked: source.ultimateImmortalApertureUnlocked === true,
      daoLawUnityUnlocked: source.daoLawUnityUnlocked === true,
      daoDomainUnlocked: source.daoDomainUnlocked === true,
      daoPowerUnlocked: source.daoPowerUnlocked === true,
      daoTimeLawUnlocked: source.daoTimeLawUnlocked === true,
      daoAssimilationUnlocked: source.daoAssimilationUnlocked === true,
      fiveElementsTreasureRollProgress: Number.isFinite(Number(source.fiveElementsTreasureRollProgress))
        ? Math.max(0, Number(source.fiveElementsTreasureRollProgress)) % 1
        : 0,
      immortalCrystalRollProgress: Number.isFinite(Number(source.immortalCrystalRollProgress))
        ? Math.max(0, Number(source.immortalCrystalRollProgress)) % 1
        : 0,
      minorTribulationExplorationLoad: advancedRealmLevel >= 6
        ? ZERO
        : savedMinorTribulationExplorationLoad,
      symbolicPowerMilestones: {
        graham64: source.symbolicPowerMilestones?.graham64 === true,
        tree3: source.symbolicPowerMilestones?.tree3 === true
      },
      activeChallenge,
      activeChallengeElapsedSeconds: activeChallenge
        ? Math.max(0, activeChallenge === "longevity"
          ? Math.min(config.challenges.longevity.timeToLimitSeconds, Number(source.activeChallengeElapsedSeconds) || 0)
          : Number(source.activeChallengeElapsedSeconds) || 0)
        : 0,
      challengeCompletions: Object.fromEntries(Object.entries(config.challenges).map(([key, challenge]) => [
        key,
        Math.max(0, Math.min(challenge.maxCompletions, Math.floor(Number(source.challengeCompletions?.[key]) || 0)))
      ])),
      bestQiLayer: Math.max(0, Math.floor(Number(source.bestQiLayer) || 0)),
      threeCorpseChallengesUnlocked: source.threeCorpseChallengesUnlocked === true ||
        ["severEvilCorpse", "severGoodCorpse", "severSelfCorpse"].some((key) =>
          (Number(source.challengeCompletions?.[key]) || 0) > 0
        ),
      unlockedAchievements,
      treasureImprints,
      treasureProgress: Object.fromEntries(Object.keys(treasureImprints).map(key => [key, maxBN(ZERO, BN(source.treasureProgress?.[key]))])),
      treasureProgressResidual: Object.fromEntries(Object.keys(treasureImprints).map(key => [key, BN(source.treasureProgressResidual?.[key])])),
      treasureStockResidual: clone(source.treasureStockResidual || {}),
      treasureProgressResidualTail: clone(source.treasureProgressResidualTail || {}),
      treasureCredits: clone(source.treasureCredits || {}),
      treasureProgressPending: clone(source.treasureProgressPending || {}),
      treasureProgressStatus: clone(source.treasureProgressStatus || {}),
      treasureQualifications: source.treasureQualifications && typeof source.treasureQualifications === "object" ? clone(source.treasureQualifications) : {},
      treasureProgressVersion: source.treasureProgressVersion === 1 ? 1 : 0,
      hideUnlockedAchievements: source.hideUnlockedAchievements === true,
      offlineFastForwardEnabled: source.offlineFastForwardEnabled !== false,
      immortalAbilityAutomationEnabled: source.immortalAbilityAutomationEnabled !== false,
      immortalRealmAutomationEnabled: source.immortalRealmAutomationEnabled !== false,
      scaleUpgradeAutomationEnabled: source.scaleUpgradeAutomationEnabled !== false,
      scaleActionAutomationEnabled: source.scaleActionAutomationEnabled !== false,
      theme: source.theme === "dark" ? "dark" : "light",
      lastUpdateAt: Number.isFinite(Number(source.lastUpdateAt)) && Number(source.lastUpdateAt) > 0
        ? Number(source.lastUpdateAt)
        : Date.now()
    };
  }

  const fieldGroups = Object.freeze({
    "core.resources": ["joules", "joulesGainResidual", "power", "powerGainResidual"],
    "core.runtime": ["totalElapsedSeconds", "reincarnationElapsedSeconds", "currentScaleElapsedSeconds", "lastUpdateAt"],
    "core.preferences": [
      "hideUnlockedAchievements", "immortalAbilityAutomationEnabled", "immortalRealmAutomationEnabled",
      "scaleUpgradeAutomationEnabled", "scaleActionAutomationEnabled", "theme", "offlineFastForwardEnabled"
    ],
    "powerSystem.systems.scale.progress": ["highestPower", "totalPower", "maxSinglePowerGain", "brickUnlocked", "wallUnlocked", "highestScaleIndex", "superLollipopRollProgress", "fiveSpiritStoneRollProgress"],
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
      "brainDomainDevelopmentPurchased", "continentSplitPurchased", "continentCollapsePurchased",
      "waveEyePurchased", "elementalAwakeningPurchased", "moonfallPurchased", "flowStatePurchased",
      "selfhoodPurchased", "freedomPurchased", "chicxulubMeteoritePurchased",
      "planetWillPurchased", "starSpiritPurchased", "starShatterPurchased", "spaceQuakePurchased",
      "selflessPurchased", "supernaturalFirePurchased", "fiveSpiritStonePurchased", "selfSuppressionPurchased",
      "stellarFurnacePurchased", "stellarTreasureSeekingPurchased", "gravitationalCollapsePurchased",
      "galacticReturnPurchased", "stellarSeaGiftPurchased", "stellarResonancePurchased",
      "greatAttractorPurchased", "largeScaleAdaptationPurchased", "superclusterCollapsePurchased",
      "cosmicWebPurchased", "scaleUnificationPurchased", "spacetimeFrameworkPurchased",
      "ghostBackPurchased"
    ],
    "cultivation.systems.immortal.resources": [
      "mana", "manaGainResidual", "immortalPower", "immortalPowerGainResidual"
    ],
    "cultivation.systems.immortal.progress": [
      "qiRefiningUnlocked", "foundationUnlocked", "goldenCoreUnlocked", "advancedRealmLevel", "currentQiLayer", "explorationProgress",
      "explorationProgressResidual", "explorationAttemptResidual",
      "minorTribulationExplorationLoad", "fiveElementsTreasureRollProgress", "immortalCrystalRollProgress"
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
      "spiritTravelVoidUnlocked", "goldenSealScriptUnlocked", "immortalSpiritPowerUnlocked",
      "undyingPrimordialSpiritUnlocked", "immortalApertureLevel", "xuanImmortalBodyUnlocked", "lawUnlocked",
      "immortalApertureIIUnlocked", "spiritDomainUnlocked", "threadsOfLawUnlocked",
      "immortalApertureIIIUnlocked", "spiritCaptureReturnUnlocked", "indestructibleDharmaBodyUnlocked",
      "immortalApertureIVUnlocked", "fiveElementsTreasureUnlocked", "lawAffinityUnlocked",
      "flawlessJadeBodyUnlocked", "spiritDomainWorldTransformationUnlocked", "immortalApertureVUnlocked",
      "immortalApertureVIUnlocked", "immortalApertureVIIUnlocked", "soulQualitativeChangeUnlocked",
      "trinityUnlocked", "unityWithDaoUnlocked", "lawOriginUnlocked", "lawCrystalFilamentUnlocked",
      "severThreeCorpsesUnlocked", "ultimateImmortalApertureUnlocked",
      "daoLawUnityUnlocked", "daoDomainUnlocked", "daoPowerUnlocked",
      "daoTimeLawUnlocked", "daoAssimilationUnlocked"
    ],
    "cultivation.systems.immortal.persistent": [
      "scatterRebuildLevel", "scatterRetentionLevel", "reincarnationLevel", "permanentRootLevel",
      "reincarnationEffectLevel", "reincarnationManaJRewardLevel"
    ],
    "meta.statistics": [
      "explorationTotal", "explorationTotalResidual", "explorationTotalIncomplete", "explorationTotalApproximate",
      "lifetimeHighestJ", "lifetimeHighestPower", "lifetimeHighestScaleIndex", "lifetimeTotalJ",
      "lifetimeTotalPower", "lifetimeHighestMana", "lifetimeTotalMana", "lifetimeHighestImmortalPower",
      "lifetimeTotalImmortalPower", "lifetimeHighestCultivationRealmLevel", "immortalSelectionCount",
      "currentRebirthHighestJ", "currentRebirthTotalJ", "currentRebirthHighestPower",
      "currentRebirthTotalPower", "currentRebirthHighestScaleIndex", "currentRebirthHighestMana",
      "currentRebirthTotalMana", "currentRebirthHighestImmortalPower",
      "currentRebirthTotalImmortalPower", "currentRebirthHighestCultivationRealmLevel"
    ],
    "meta.challenges": ["activeChallenge", "activeChallengeElapsedSeconds", "challengeCompletions", "threeCorpseChallengesUnlocked", "bestQiLayer"],
    "meta": ["unlockedAchievements", "treasureImprints", "symbolicPowerMilestones", "treasureProgress", "treasureProgressResidual", "treasureStockResidual", "treasureProgressResidualTail", "treasureCredits", "treasureProgressPending", "treasureProgressStatus", "treasureQualifications", "treasureProgressVersion"]
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
    "brainDomainDevelopmentPurchased", "continentSplitPurchased", "continentCollapsePurchased",
    "waveEyePurchased", "elementalAwakeningPurchased", "moonfallPurchased", "flowStatePurchased",
    "selfhoodPurchased", "freedomPurchased", "chicxulubMeteoritePurchased",
    "planetWillPurchased", "starSpiritPurchased", "starShatterPurchased", "spaceQuakePurchased",
    "selflessPurchased", "supernaturalFirePurchased", "fiveSpiritStonePurchased", "selfSuppressionPurchased",
    "stellarFurnacePurchased", "stellarTreasureSeekingPurchased", "gravitationalCollapsePurchased",
    "galacticReturnPurchased", "stellarSeaGiftPurchased", "stellarResonancePurchased",
    "greatAttractorPurchased", "largeScaleAdaptationPurchased", "superclusterCollapsePurchased",
    "cosmicWebPurchased", "scaleUnificationPurchased", "spacetimeFrameworkPurchased",
    "ghostBackPurchased"
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
    "spiritTravelVoidUnlocked", "goldenSealScriptUnlocked", "immortalSpiritPowerUnlocked",
    "undyingPrimordialSpiritUnlocked", "immortalApertureLevel", "xuanImmortalBodyUnlocked", "lawUnlocked",
    "immortalApertureIIUnlocked", "spiritDomainUnlocked", "threadsOfLawUnlocked",
    "immortalApertureIIIUnlocked", "spiritCaptureReturnUnlocked", "indestructibleDharmaBodyUnlocked",
    "immortalApertureIVUnlocked", "fiveElementsTreasureUnlocked", "lawAffinityUnlocked",
    "flawlessJadeBodyUnlocked", "spiritDomainWorldTransformationUnlocked", "immortalApertureVUnlocked",
    "immortalApertureVIUnlocked", "immortalApertureVIIUnlocked", "soulQualitativeChangeUnlocked",
    "trinityUnlocked", "unityWithDaoUnlocked", "lawOriginUnlocked", "lawCrystalFilamentUnlocked",
    "severThreeCorpsesUnlocked", "ultimateImmortalApertureUnlocked"
  ]);

  function clone(value) {
    if (isDecimal(value)) return BN(value);
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
    return value;
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) && !isDecimal(value);
  }

  function mergeKnown(target, source) {
    if (!isRecord(source)) return clone(source);
    const result = isRecord(target) ? clone(target) : {};
    Object.entries(source).forEach(([key, value]) => {
      result[key] = isRecord(value) ? mergeKnown(result[key], value) : clone(value);
    });
    return result;
  }

  // Compile the immutable compatibility paths once. Read the current domain
  // branches on every access: resets may replace any of these objects.
  const legacyPaths = new Map([...fieldPaths].map(([key, path]) => {
    const keys = path.split(".");
    const [a, b, c, d, e, f] = keys;
    const readers = {
      2: (root) => root?.[a]?.[b],
      3: (root) => root?.[a]?.[b]?.[c],
      4: (root) => root?.[a]?.[b]?.[c]?.[d],
      5: (root) => root?.[a]?.[b]?.[c]?.[d]?.[e],
      6: (root) => root?.[a]?.[b]?.[c]?.[d]?.[e]?.[f]
    };
    const read = readers[keys.length] || ((root) => {
      for (const part of keys) root = root?.[part];
      return root;
    });
    const write = (root, value) => {
      for (let index = 0; index < keys.length - 1; index += 1) root = (root[keys[index]] ||= {});
      root[keys[keys.length - 1]] = value;
    };
    return [key, { read, write }];
  }));

  function emptyDomain() {
    return {
      core: { resources: {}, runtime: {}, preferences: {} },
      powerSystem: { active: "scale", systems: { scale: { progress: {}, actions: {}, upgrades: {}, history: { manualUpgrades: {} } } } },
      cultivation: { active: null, systems: { immortal: { resources: {}, progress: {}, abilities: {}, persistent: {}, history: { manualAbilities: {}, manualRealmLevel: 0 } } } },
      meta: { achievements: {}, treasures: {}, milestones: {}, statistics: {}, challenges: {}, infinity: { currency: ZERO, upgrades: {} } }
    };
  }

  function attachLegacyAliases(domain) {
    for (const key of ["xianForce", "yuanForce"]) Object.defineProperty(domain, key, {
      configurable: true, enumerable: false,
      get: () => WIS.Cultivation.Xiuzhen?.amount(domain, key) ?? ZERO
    });
    legacyPaths.forEach(({ read, write }, key) => {
      if (key === "treasureImprints") return;
      Object.defineProperty(domain, key, {
        configurable: true,
        enumerable: false,
        get: () => read(domain),
        set: (value) => write(domain, value)
      });
    });
    let treasureView = null;
    let treasureViewTarget = null;
    Object.defineProperty(domain, "treasureImprints", {
      configurable: true,
      enumerable: false,
      get: () => {
        const target = domain.meta.treasures;
        if (treasureView && treasureViewTarget === target) return treasureView;
        treasureViewTarget = target;
        treasureView = new Proxy(target, {
          get: (treasures, key, receiver) => typeof key === "string" &&
            Object.prototype.hasOwnProperty.call(treasures, key)
            ? WIS.Meta.Treasures?.count?.(domain,key) ?? compatibleTreasureCount(Reflect.get(treasures, key, receiver))
            : Reflect.get(treasures, key, receiver),
          set: (treasures, key, value, receiver) => {
            if(domain.meta.treasureStockResidual) delete domain.meta.treasureStockResidual[key];
            return Reflect.set(treasures,key,treasureCount(value),receiver);
          }
        });
        return treasureView;
      },
      set: (value) => {
        const source = value && typeof value === "object" ? value : {};
        domain.meta.treasures = Object.fromEntries(
          Object.entries(source).map(([key, count]) => [key, treasureCount(count)])
        );
        domain.meta.treasureStockResidual = {};
        treasureView = null;
        treasureViewTarget = null;
      }
    });
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
    domain.meta.bigNumbers = WIS.Meta.BigNumbers?.normalize(flatInput?.bigNumbers) ?? {};
    domain.cultivation.systems.immortal.xiuzhen = WIS.Cultivation.Xiuzhen?.normalize(flatInput?.xiuzhen) ?? {};
    legacyPaths.forEach(({ write }, key) => write(domain, clone(flat[key])));
    domain.cultivation.active = flat.cultivationSystem === "仙道" || flat.cultivationSystem === "immortal" ? "immortal" : null;
    domain.meta.achievements = clone(flat.unlockedAchievements || {});
    domain.meta.treasures = clone(flat.treasureImprints || {});
    domain.meta.milestones = clone(flat.symbolicPowerMilestones || {});
    domain.meta.challenges.activeChallenge = flat.activeChallenge ?? null;
    domain.meta.challenges.activeChallengeElapsedSeconds = flat.activeChallengeElapsedSeconds || 0;
    domain.meta.challenges.challengeCompletions = clone(flat.challengeCompletions || {});
    domain.meta.challenges.bestQiLayer = Math.max(0, Math.floor(Number(flat.bestQiLayer) || 0));
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
    Object.keys(freshFlat()).forEach((key) => { flat[key] = clone(key === "treasureImprints" ? state.meta.treasures : state[key]); });
    return flat;
  }

  function toSerializable(state) {
    return clone({ core: state.core, powerSystem: state.powerSystem, cultivation: state.cultivation, meta: state.meta });
  }

  function cloneForSimulation(state) {
    // This is a domain clone, not an import: do not normalize fields, rebuild
    // manual histories, or construct defaults that would immediately be replaced.
    return attachLegacyAliases(toSerializable(state));
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
    if (source.meta?.statistics?.explorationTotal === undefined) knownFlat.explorationTotalIncomplete = true;
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
    infinity.currency = maxBN(ZERO, BN(infinity.currency));
    if (!isRecord(infinity.upgrades)) infinity.upgrades = {};
    domain.meta.infinity = infinity;
    domain.meta.bigNumbers = WIS.Meta.BigNumbers?.normalize(source.meta?.bigNumbers) ?? source.meta?.bigNumbers ?? {};
    domain.cultivation.systems.immortal.xiuzhen = WIS.Cultivation.Xiuzhen?.normalize(source.cultivation?.systems?.immortal?.xiuzhen)
      ?? source.cultivation?.systems?.immortal?.xiuzhen ?? {};
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
      : normalizeLegacy(data),
    40: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    41: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    42: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    43: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    44: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    45: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    46: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    47: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    48: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    49: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    50: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    51: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    52: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    54: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data),
    53: (data) => data?.core && data?.powerSystem && data?.cultivation && data?.meta
      ? normalizeDomain(data)
      : normalizeLegacy(data)
  });

  function migrate(schemaVersion, data) {
    const version = Number(schemaVersion) || 36;
    const migration = migrations[version] || migrations[Math.min(version, 54)] || migrations[36];
    // v53 separates lifetime exploration input from fractional/integer carry;
    // unknown historical totals are flagged, never inferred from loot or replayed.
    // v52 adds the independent Xiuzhen subdomain; existing resource meanings stay intact.
    // v51 adds a separate symbolic coefficient/Graham domain; no old field is repurposed.
    // v50 preserves precision-blocked source inputs and their status. v49 signed
    // words are kept intact; missing historical information is not reconstructed.
    // v49 adds signed stock residuals and extra progress words. Old v48 ledgers
    // default to empty tails; never replay the v48 source-remainder migration.
    // v48 adds independent progress ledgers. Normalization preserves them;
    // source-remainder conversion is lazy, after runtime/effects are bound.
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

  WIS.Core.State = Object.freeze({ defaults, fieldGroups, fresh, normalize, normalizeDomain, migrate, fromFlat, toFlat, toSerializable, cloneForSimulation, domainView });
}(window.WIS));
