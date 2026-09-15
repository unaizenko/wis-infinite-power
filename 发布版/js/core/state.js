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

  function savedTreasureProgress(source, keys) {
    const progress = {}, residual = {}, tails = clone(source.treasureProgressResidualTail || {});
    const ledger = WIS.Meta.TreasureLedger;
    const word = (value, nonnegative) => {
      value ??= ZERO;
      if (!(typeof value === "string" || typeof value === "number" || isDecimal(value)) ||
          (typeof value === "string" && !value.trim()) || !WIS.Core.BigNum.isFiniteBN(value) ||
          (nonnegative && BN(value).lt(ZERO))) throw Error("宝物进度账本含非法数值");
      // Preserve original ledger words before a Decimal parser can move the
      // final digit of a saved scientific string. This is not a display value.
      return clone(value);
    };
    for (const key of keys) {
      progress[key] = word(source.treasureProgress?.[key], true);
      residual[key] = word(source.treasureProgressResidual?.[key], false);
      const tail = tails[key] ?? [];
      if (!Array.isArray(tail)) throw Error("宝物进度残差格式无效");
      if (ledger && ledger.sign(ledger.normalize([progress[key], residual[key], ...tail])) < 0)
        throw Error("宝物进度完整余额为负");
    }
    return { treasureProgress: progress, treasureProgressResidual: residual, treasureProgressResidualTail: tails };
  }

  function normalizeTimeLedger(raw) {
    if(raw==null)return {version:1,nextId:1,boundaryAt:0,awaySince:null,registeredUntil:0,pendingContinuousTime:[]};
    if(!isRecord(raw)||raw.version!==1)throw Error("时间账本版本无效");
    const stamp=(value,nullable=false)=>{if(nullable&&value==null)return null;
      if(!Number.isFinite(value)||value<0)throw Error("时间账本水位无效");return value;};
    if(!Number.isSafeInteger(raw.nextId)||raw.nextId<1)throw Error("时间片段序号无效");
    if(raw.pendingContinuousTime!=null&&!Array.isArray(raw.pendingContinuousTime))throw Error("未结算连续时间格式无效");
    const pendingContinuousTime=(raw.pendingContinuousTime||[]).map(part=>{
      if(!part || !['online','offline'].includes(part.source||'online') || !Number.isFinite(part.clock)||part.clock<0 || !Number.isFinite(part.speed)||part.speed<=0)throw Error("未结算连续时间无效");
      return {source:part.source||'online',clock:part.clock,speed:part.speed,compensationEligible:part.source!=='offline'&&part.compensationEligible===true};
    });
    return {version:1,nextId:raw.nextId,boundaryAt:stamp(raw.boundaryAt),awaySince:stamp(raw.awaySince,true),registeredUntil:stamp(raw.registeredUntil),pendingContinuousTime};
  }
  const defaults = Object.freeze({
    compensation: WIS.Simulation.Compensation.fresh(),
    timeLedger: {version:1,nextId:1,boundaryAt:0,awaySince:null,registeredUntil:0,pendingContinuousTime:[]},
    joules: ZERO, joulesGainResidual: ZERO, joulesGainResidualTail: [], power: ZERO, powerGainResidual: ZERO, powerGainResidualTail: [],
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
    cultivationSystem: null, mana: ZERO, manaGainResidual: ZERO, manaGainResidualTail: [],
    immortalPower: ZERO, immortalPowerGainResidual: ZERO, immortalPowerGainResidualTail: [],
    qiRefiningUnlocked: false, immortalLifeUnlocked: false,
    qiSpellLevel: 0, foundationUnlocked: false, goldenCoreUnlocked: false, advancedRealmLevel: 0,
    circulationUnlocked: false, minorTechniqueUnlocked: false, flyingEscapeUnlocked: false,
    longevity800Level: 0, explorationProgress: ZERO, explorationProgressResidual: [], explorationAttemptResidual: [], explorationRewards: {version:1,natural:[],seize:[],levelResidual:[]}, manaLiquefactionUnlocked: false,
    longevityLevel: 0, goldenCoreLongevityLevel: 0, manaSolidificationUnlocked: false,
    techniqueUnlocked: false, foundationSpellLevel: 0, magicTreasureUnlocked: false,
    scatterRebuildLevel: 0, scatterRetentionLevel: 0, reincarnationLevel: 0,
    permanentRootLevel: 0, reincarnationEffectLevel: 0, reincarnationManaJRewardLevel: 0,
    materialControlUnlocked: false, divineSenseUnlocked: false, greatCultivatorUnlocked: false,
    secondNascentSoulUnlocked: false, naturalTreasureLevel: ZERO, spiritWorldAscensionUnlocked: false,
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
    hideUnlockedAchievements: false, offlineFastForwardEnabled: true, autoCloseOfflineDialogEnabled: true,
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
      treasureProgressFinite: {}, treasureCredits: {}, treasureStockResidual: {}, treasureProgressResidualTail: {}, treasureProgressPending: {}, treasureProgressStatus: {},
      treasureDiagnostics: { version: 1, sequence: 0, counts: {}, recent: [] },
      treasureImprints: {
        tianNiPearl: ZERO, mysteriousGreenBottle: ZERO, fuBao: ZERO, fitnessMembershipCard: ZERO,
        superLollipop: ZERO, skyCrystal: ZERO, xuTianDing: ZERO, baLingChi: ZERO, wanYaoFan: ZERO,
        phantomHeavenMirror: ZERO, mysticHeavenSacredTree: ZERO, mysticHeavenSpiritSlayingSword: ZERO,
        fiveElementsTreasure: ZERO, immortalCrystal: ZERO, fiveSpiritStone: ZERO,
        cosmicFiber: ZERO, cosmicWill: ZERO
      },
      randomState: (Math.floor(Math.random() * 0x100000000) >>> 0) || 0x6d2b79f5,
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

  function normalizeTreasureDiagnostics(input) {
    // Diagnostic subversion 1 is optional for older saves. It never reconstructs
    // rewards from historical stock and cannot change a resource balance.
    const value=input&&input.version===1?input:{};
    const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
    const counts=Object.fromEntries(Object.entries(value.counts||{}).slice(0,32)
      .filter(([key])=>/^[a-zA-Z]{1,64}$/.test(key)).map(([key,n])=>[key,integer(n)]));
    const recent=(Array.isArray(value.recent)?value.recent:[]).slice(-32).map(row=>{
      const out={};
      for(const key of ['key','input','gain','before','demand','after','awarded','batches','reason'])
        out[key]=row?.[key]===null?null:String(row?.[key]??'').slice(0,512);
      for(const key of ['sequence','pendingBefore','pendingAfter'])out[key]=integer(row?.[key]);
      out.logicalTime=Number.isFinite(row?.logicalTime)?row.logicalTime:0;
      for(const key of ['progressBefore','progressAfter']){
        const detail=row?.[key];
        out[key]=Array.isArray(detail)?WIS.Meta.TreasureProgress.ledgerSummary(detail):{
          termCount:integer(detail?.termCount),characters:integer(detail?.characters),hash:String(detail?.hash||'').slice(0,16)};
      }
      return out;
    });
    return {version:1,sequence:integer(value.sequence),counts,recent};
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
      joulesGainResidual: BN(source.joulesGainResidual),
      joulesGainResidualTail: clone(source.joulesGainResidualTail || []),
      power,
      powerGainResidual: BN(source.powerGainResidual),
      powerGainResidualTail: clone(source.powerGainResidualTail || []),
      manaGainResidualTail: clone(source.manaGainResidualTail || []),
      manaGainResidual: qiRefiningUnlocked
        ? BN(source.manaGainResidual)
        : ZERO,
      immortalPowerGainResidualTail: clone(source.immortalPowerGainResidualTail || []),
      immortalPowerGainResidual: advancedRealmLevel >= config.immortalPower.unlockAdvancedRealmLevel
        ? BN(source.immortalPowerGainResidual)
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
      explorationRewards: normalizeExplorationRewards(source),
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
      naturalTreasureLevel: maxBN(ZERO, BN(source.naturalTreasureLevel ?? ZERO)).floor(),
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
      ...savedTreasureProgress(source, Object.keys(treasureImprints)),
      treasureStockResidual: clone(source.treasureStockResidual || {}),
      treasureProgressFinite: clone(source.treasureProgressFinite || {}),
      treasureCredits: clone(source.treasureCredits || {}),
      treasureProgressPending: clone(source.treasureProgressPending || {}),
      treasureProgressStatus: clone(source.treasureProgressStatus || {}),
      treasureDiagnostics: normalizeTreasureDiagnostics(source.treasureDiagnostics),
      treasureQualifications: source.treasureQualifications && typeof source.treasureQualifications === "object" ? clone(source.treasureQualifications) : {},
      treasureProgressVersion: source.treasureProgressVersion === 1 ? 1 : 0,
      hideUnlockedAchievements: source.hideUnlockedAchievements === true,
      // The retired player toggle no longer disables the standard settlement path.
      offlineFastForwardEnabled: true,
      autoCloseOfflineDialogEnabled: source.autoCloseOfflineDialogEnabled !== false,
      immortalAbilityAutomationEnabled: source.immortalAbilityAutomationEnabled !== false,
      immortalRealmAutomationEnabled: source.immortalRealmAutomationEnabled !== false,
      scaleUpgradeAutomationEnabled: source.scaleUpgradeAutomationEnabled !== false,
      scaleActionAutomationEnabled: source.scaleActionAutomationEnabled !== false,
      theme: source.theme === "dark" ? "dark" : "light",
      timeLedger: normalizeTimeLedger(source.timeLedger),
      compensation: WIS.Simulation.Compensation.normalize(source.compensation),
      randomState: (Number(source.randomState ?? source.lastUpdateAt) >>> 0) || 0x6d2b79f5,
      lastUpdateAt: Number.isFinite(Number(source.lastUpdateAt)) && Number(source.lastUpdateAt) > 0
        ? Number(source.lastUpdateAt)
        : Date.now()
    };
  }

  const fieldGroups = Object.freeze({
    "core.resources": ["joules", "joulesGainResidual", "joulesGainResidualTail", "power", "powerGainResidual", "powerGainResidualTail"],
    "core.runtime": ["totalElapsedSeconds", "reincarnationElapsedSeconds", "currentScaleElapsedSeconds", "lastUpdateAt", "randomState", "timeLedger", "compensation"],
    "core.preferences": [
      "hideUnlockedAchievements", "immortalAbilityAutomationEnabled", "immortalRealmAutomationEnabled",
      "scaleUpgradeAutomationEnabled", "scaleActionAutomationEnabled", "theme", "offlineFastForwardEnabled", "autoCloseOfflineDialogEnabled"
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
      "mana", "manaGainResidual", "manaGainResidualTail", "immortalPower", "immortalPowerGainResidual", "immortalPowerGainResidualTail"
    ],
    "cultivation.systems.immortal.progress": [
      "qiRefiningUnlocked", "foundationUnlocked", "goldenCoreUnlocked", "advancedRealmLevel", "currentQiLayer", "explorationProgress",
      "explorationProgressResidual", "explorationAttemptResidual", "explorationRewards",
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
    "meta": ["unlockedAchievements", "treasureImprints", "symbolicPowerMilestones", "treasureProgress", "treasureProgressResidual", "treasureStockResidual", "treasureProgressResidualTail", "treasureCredits", "treasureProgressFinite", "treasureProgressPending", "treasureProgressStatus", "treasureDiagnostics", "treasureQualifications", "treasureProgressVersion"]
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
    if (value === null || typeof value !== "object") return value;
    if (isDecimal(value)) return BN(value);
    if (Array.isArray(value)) return value.map(clone);
    const result = {};
    for (const key of Object.keys(value)) {
      const entry = clone(value[key]);
      // Preserve Object.fromEntries' own-data-property behavior for this name.
      if (key === "__proto__") Object.defineProperty(result,key,{value:entry,writable:true,enumerable:true,configurable:true});
      else result[key] = entry;
    }
    return result;
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

  // Shared descriptors have no captured state. Each receiver resolves its
  // current branches, so restored/reset domains cannot alias another world.
  const legacyDescriptors = Object.fromEntries([...legacyPaths].filter(([key]) => key !== "treasureImprints")
    .map(([key,{read,write}]) => [key,{configurable:true,enumerable:false,
      get(){return read(this);},set(value){write(this,value);}}]));
  for (const key of ["xianForce", "yuanForce"]) legacyDescriptors[key] = {
    configurable:true,enumerable:false,get(){return WIS.Cultivation.Xiuzhen?.amount(this,key) ?? ZERO;}
  };

  function attachLegacyAliases(domain) {
    Object.defineProperties(domain, legacyDescriptors);
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
    const result=clone({ core: state.core, powerSystem: state.powerSystem, cultivation: state.cultivation, meta: state.meta });
    const credits=state.meta?.treasureCredits, inherit=WIS.Meta?.TreasureLedger?.Credit.inherit;
    if(credits&&inherit)for(const key of Object.keys(credits))inherit(credits[key],result.meta.treasureCredits[key]);
    return result;
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

  function preserveResourceWords(raw, container, keys) {
    if (!isRecord(raw)) return;
    for (const key of keys) {
      const principal=raw[key]??ZERO, compensation=raw[`${key}GainResidual`]??ZERO;
      // Preserve lexical ledger words BEFORE a Decimal string parser can move
      // their last bit. Keep intentional legacy principal/ownership clamps.
      if (!BN(principal).eq(container[key]) || !BN(compensation).eq(container[`${key}GainResidual`])) continue;
      const tail=raw[`${key}GainResidualTail`]??[];
      if(!Array.isArray(tail))throw Error("资源残差账本格式无效");
      const A=WIS.Core.Resources;
      Object.assign(container,A.prepareTerms({},key,[principal,compensation,...tail]));
    }
  }
  function normalizeExplorationRewards(source) {
    const raw=source.explorationRewards;
    if(raw!=null&&(!isRecord(raw)||![0,1,2].includes(raw.version)))throw Error("探寻进度版本无效");
    if(raw?.version===2)return clone(raw);
    const value=source.naturalTreasureLevel??ZERO, main=maxBN(ZERO,BN(value)).floor();
    if(!WIS.Core.BigNum.isFiniteBN(value)||WIS.Core.BigNum.lt(value,0)||!BN(value).floor().eq(BN(value)))throw Error("天材地宝等级无效");
    const L=WIS.Meta.TreasureLedger;
    // Preserve the lexical integer BEFORE Decimal rounds it, including one
    // level above its current resolution. Existing signed tails remain exact.
    const residual=L?L.subtract([String(value),...(raw?.levelResidual||[])],[main]):clone(raw?.levelResidual||[]);
    return {version:raw?.version??0,natural:clone(raw?.natural||[]),seize:clone(raw?.seize||[]),levelResidual:residual,
      ...(raw?.approximation ? {approximation:clone(raw.approximation)} : {})};
  }
  function normalizeLegacy(input) {
    const domain=fromFlat(normalizeFlat(input));
    preserveResourceWords(input,domain.core.resources,["joules","power"]);
    preserveResourceWords(input,domain.cultivation.systems.immortal.resources,["mana","immortalPower"]);
    return domain;
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
    preserveResourceWords(source.core?.resources,domain.core.resources,["joules","power"]);
    preserveResourceWords(source.cultivation?.systems?.immortal?.resources,domain.cultivation.systems.immortal.resources,["mana","immortalPower"]);
    for (const [container, keys] of [[domain.core.resources, ["joules", "power"]],
      [domain.cultivation.systems.immortal.resources, ["mana", "immortalPower"]]]) {
      for (const key of keys) {
        const tail = container[`${key}GainResidualTail`];
        if (!Array.isArray(tail)) throw Error("资源残差账本格式无效");
      }
    }
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
    const version = Number(schemaVersion ?? 36);
    if (!Number.isInteger(version) || version < 36 || version > config.saveVersion)
      throw Error("不支持的存档版本");
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        !(data.core?.resources && Object.hasOwn(data.core.resources, "joules") && Object.hasOwn(data.core.resources, "power") && data.powerSystem && data.cultivation && data.meta) &&
        !(Object.hasOwn(data, "joules") && Object.hasOwn(data, "power") &&
          ["lastUpdateAt", "highestPower", "cultivationSystem"].some(key => Object.hasOwn(data, key))))
      throw Error("不是有效的WIS存档");
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
    const result = migration(data);
    WIS.Core.Resources.validateState(result);
    // This field is a display-only lifetime statistic. Merge legacy words once;
    // fractional attempts and all treasure ledgers are deliberately untouched.
    const statistics = result.meta.statistics, L = WIS.Core.SignedLedger;
    if (statistics.explorationTotalResidual?.length) {
      const words = L.normalize([statistics.explorationTotal, ...statistics.explorationTotalResidual]);
      statistics.explorationTotal = L.value(words);
      statistics.explorationTotalApproximate ||= L.subtract(words, [statistics.explorationTotal]).length > 0;
    }
    statistics.explorationTotalResidual = [];
    WIS.Cultivation.Xiuzhen?.validate?.(result);
    WIS.Cultivation.ExplorationProgress?.validate?.(result);
    WIS.Meta.BigNumbers?.syncMilestones?.(result);
    return result;
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

  // The caller must copy each writable domain before mutation. This preserves
  // receiver-bound aliases without serializing untouched domains.
  // A branch copies containers only when written. Decimal leaves are immutable.
  // finish() removes every proxy; committed domains and save formats stay plain.
  function createDraft(source) {
    const nodes=new WeakMap();
    const mutable=v=>v && typeof v==='object' && !WIS.Core.BigNum.isDecimal(v);
    // Spread-built replacement objects can contain proxies several levels
    // below the assigned value. Resolve those on commit; otherwise each tick
    // retains another old draft and resource reads grow progressively slower.
    function finishAssigned(value, seen = new WeakMap()) {
      if (!mutable(value)) return value;
      if (nodes.has(value)) return nodes.get(value).finish();
      if (seen.has(value)) return seen.get(value);
      let result = value;
      seen.set(value, value);
      for (const key of Object.keys(value)) {
        const next = finishAssigned(value[key], seen);
        if (next !== value[key]) {
          if (result === value) result = Array.isArray(value) ? value.slice() : { ...value };
          result[key] = next;
        }
      }
      seen.set(value, result);
      return result;
    }
    function wrap(base,parent,key,assigned=false) {
      let copy=null;const children=new Map();
      const current=()=>copy||base;
      function changed(){if(!copy){copy=Array.isArray(base)?base.slice():{...base};if(parent)parent();}}
      const proxy=new Proxy(Array.isArray(base)?[]:{},{
        get(_,k){const value=current()[k];if(!mutable(value))return value;
          if(nodes.has(value))return value;
          const cached=children.get(k);if(cached?.base===value)return cached.proxy;
          const child=wrap(value,changed,k,current()[k]!==base[k]);children.set(k,child);return child.proxy;},
        set(_,k,v){if(current()[k]===v)return true;changed();copy[k]=v;children.delete(k);return true;},
        deleteProperty(_,k){if(k in current()){changed();delete copy[k];children.delete(k);}return true;},
        has:(_,k)=>k in current(),ownKeys:()=>Reflect.ownKeys(current()),
        getOwnPropertyDescriptor(_,k){const d=Object.getOwnPropertyDescriptor(current(),k);return d&&{...d,configurable:k==='length'&&Array.isArray(base)?false:true};}
      });
      const node={base,proxy,finish(){if(!copy)return assigned?finishAssigned(base):base;
        for(const k of Object.keys(copy)){const child=children.get(k);if(child&&copy[k]===child.base)copy[k]=child.finish();
          else if(copy[k]!==base[k])copy[k]=finishAssigned(copy[k]);}
        return copy;}};
      nodes.set(proxy,node);return node;
    }
    const roots=Object.fromEntries(['core','powerSystem','cultivation','meta'].map(k=>[k,wrap(source[k])]));
    const state=attachLegacyAliases(Object.fromEntries(Object.entries(roots).map(([k,n])=>[k,n.proxy])));
    return {state,finishValue:finishAssigned,finish:()=>attachLegacyAliases(Object.fromEntries(Object.entries(roots).map(([k,n])=>[k,state[k]===n.proxy?n.finish():finishAssigned(state[k])])))};
  }

  // Explicit state keeps end-segment candidate statistics private until commit.
  function updateLifetimeStatistics(state, realmLevel) {
    state.lifetimeHighestJ = WIS.Core.BigNum.max(state.lifetimeHighestJ, state.joules);
    state.lifetimeHighestPower = WIS.Core.BigNum.max(WIS.Core.BigNum.max(state.lifetimeHighestPower, state.power), state.highestPower);
    state.lifetimeHighestScaleIndex = Math.max(state.lifetimeHighestScaleIndex, state.highestScaleIndex);
    state.lifetimeHighestMana = WIS.Core.BigNum.max(state.lifetimeHighestMana, state.mana);
    state.lifetimeHighestImmortalPower = WIS.Core.BigNum.max(state.lifetimeHighestImmortalPower, state.immortalPower);
    state.lifetimeHighestCultivationRealmLevel = Math.max(state.lifetimeHighestCultivationRealmLevel, realmLevel);
    state.currentRebirthHighestJ = WIS.Core.BigNum.max(state.currentRebirthHighestJ, state.joules);
    state.currentRebirthHighestPower = WIS.Core.BigNum.max(state.currentRebirthHighestPower, state.power);
    state.currentRebirthHighestScaleIndex = Math.max(state.currentRebirthHighestScaleIndex, state.highestScaleIndex);
    state.currentRebirthHighestMana = WIS.Core.BigNum.max(state.currentRebirthHighestMana, state.mana);
    state.currentRebirthHighestImmortalPower = WIS.Core.BigNum.max(state.currentRebirthHighestImmortalPower, state.immortalPower);
    state.currentRebirthHighestCultivationRealmLevel = Math.max(
      state.currentRebirthHighestCultivationRealmLevel,
      realmLevel
    );
  }

  const shallowBranch = state => attachLegacyAliases({...state});
  WIS.Core.State = Object.freeze({ updateLifetimeStatistics, createDraft, shallowBranch, defaults, fieldGroups, fresh, normalize, normalizeDomain, migrate, fromFlat, toFlat, toSerializable, cloneForSimulation, domainView });
}(window.WIS));
