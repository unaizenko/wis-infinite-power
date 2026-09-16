(function defineUIApp(WIS) {
  "use strict";

  function advancedRealmAbilityIndexesForLevel(level, realmCount) {
    const safeRealmCount = Math.max(0, Math.floor(Number(realmCount) || 0));
    const end = Math.min(safeRealmCount - 1, Math.max(2, Math.floor(Number(level) || 0)));
    return Array.from({ length: Math.max(0, end - 2) }, (_, offset) => offset + 2);
  }

  function globalRateText(value,status,format) {
    return status?.clockSuspended ? "（离线结算中）" : `（+${format(value)}/秒）`;
  }

  function setTextIfChanged(element, value) {
    if (!element) return;
    const text = value == null ? "" : String(value);
    if (element.textContent !== text) element.textContent = text;
  }
  function setHiddenIfChanged(element, value) {
    if (element && element.hidden !== Boolean(value)) element.hidden = Boolean(value);
  }
  function setDisabledIfChanged(element, value) {
    if (element && element.disabled !== Boolean(value)) element.disabled = Boolean(value);
  }
  function toggleClassIfChanged(element, name, value) {
    if (element && element.classList.contains(name) !== Boolean(value)) element.classList.toggle(name, Boolean(value));
  }

  function scaleUpgradePreviewText(id, state, format) {
    const preview = WIS.Power.ScaleLogic.upgradePreview(id, state);
    const prefix = preview.purchased ? "当前：" : "解锁后：";
    const details = {
      planetWill: () => `元素化来源 ×${WIS.UI.Format.scientificMultiplier(preview.value)}`,
      starShatter: () => `打岩来源 ×${format(preview.value, 3)}`,
      stellarTreasureSeeking: () => `宝物进度获取 ×${format(preview.value, 3)}`,
      starSpirit: () => `宝物进度获取 ×${WIS.Core.Config.starEnhancements.starSpirit.perChallengeMultiplier} ^ ${preview.layers}`,
      supernaturalFire: () => `战力区域 ×${format(preview.value, 3)}（按排除自身后的集中最终实际收益）`
    };
    return prefix + details[id]();
  }

  function create(context) {
    const runtime = WIS.Core.Runtime;
    const state = runtime.state;
    const {
      BN, ZERO, ONE, add: addBN, sub: subBN, mul: mulBN, div: divBN, pow: powBN, log10: log10BN,
      max: maxBN, abs: absBN, sum: sumBN, gt: gtBN, gte: gteBN, lt: ltBN, eq: eqBN,
      isFiniteBN, isNaNBN, toNumber: bnToNumber
    } = WIS.Core.BigNum;
    const canAffordPower = (cost) => WIS.Core.Resources.canAfford("power", cost);
    const canAffordMana = (cost) => WIS.Core.Resources.canAffordSystem("immortal", "mana", cost);
    const canAffordImmortalPower = (cost) => WIS.Core.Resources.canAffordSystem("immortal", "immortalPower", cost);
    
    const { saveState, simulateOfflineProgress, cancelCatchUp, retryCatchUp, acknowledgeCatchUp, getCatchUpStatus, subscribeCatchUpStatus, achievementStates, notifyNewAchievements, freshDefaultState, formatCompact, format, formatCost, multiplyEffects, multiplierEffectValue, multiplyEffectGroups, calculateSourceGain, calculateRegionGain, formatMultiplierGroups, formatElapsedTime, formatGameCalendar, resourceSoftcapExponent, planetSuppressionSoftcapExponent, formatSoftcapExponent, activeSoftcapStages, removedSoftcapStages, achievementDefinitions, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked, treasuresUnlocked, challengesUnlocked, statisticsUnlocked, hasAchievement, startChallenge, exitChallenge, setLastTickAt } = context;
  const CONFIG = WIS.Core.Config;
  const BUILD = WIS.Core.Build;
  const formatSmallMultiplier = WIS.UI.Format.smallMultiplier;
  const googolPenaltySuffix = (resource, amount) => {
    const details = WIS.Core.Penalties.googolPenaltyDetails(resource, amount, state);
    if (!details.active) return "";
    if (eqBN(details.strength, CONFIG.googolPenalty.defaultStrength)) {
      return `；古戈尔惩罚 ×${formatSmallMultiplier(details.multiplier)}`;
    }
    const strengthSources = [
      state.largeScaleAdaptationPurchased ? "大尺度适应 ×0.95" : "",
      state.scaleUnificationPurchased ? "尺度统一 ×0.85" : ""
    ].filter(Boolean);
    return `；古戈尔惩罚：基础强度100%，修正后强度${(bnToNumber(details.strength, 0) * 100).toFixed(2)}%${strengthSources.length ? `（${strengthSources.join("；")}）` : ""}，最终 ×${formatSmallMultiplier(details.multiplier)}`;
  };
  const POWER_COSTS = CONFIG.costs.power;
  const IMMORTAL_COSTS = CONFIG.costs.immortal;
  const GAME_VERSION = CONFIG.gameVersion;
  const GYM_COST = POWER_COSTS.gym, EXERCISE_COST = POWER_COSTS.exercise, TRANSCENDENT_COST = POWER_COSTS.transcendent;
  const FOCUS_COST = POWER_COSTS.focus, BREATHING_METHOD_COST = POWER_COSTS.breathingMethod, EXTREME_EXERCISE_COST = POWER_COSTS.extremeExercise;
  const WATER_COST = POWER_COSTS.water, GHOST_BRAIN_COST = POWER_COSTS.ghostBrain, NATURAL_STRENGTH_COST = POWER_COSTS.naturalStrength;
  const MENTAL_POWER_COST = POWER_COSTS.mentalPower, LIFE_POWER_COST = POWER_COSTS.lifePower, MY_STYLE_COST = POWER_COSTS.myStyle;
  const INTUITION_COST = POWER_COSTS.intuition, GHOST_BACK_COST = POWER_COSTS.ghostBack;
  const SONIC_MOVEMENT_COST = POWER_COSTS.sonicMovement, CARBON_LIMIT_COST = POWER_COSTS.carbonLimit;
  const KILLING_INTENT_COST = POWER_COSTS.killingIntent, ROCK_STRIKE_COST = POWER_COSTS.rockStrike, HIGH_SPEED_METABOLISM_COST = POWER_COSTS.highSpeedMetabolism;
  const ENDURANCE_ENHANCEMENT_COST = POWER_COSTS.enduranceEnhancement, BULLET_TIME_COST = POWER_COSTS.bulletTime, DYNAMIC_FOCUS_COST = POWER_COSTS.dynamicFocus;
  const SUPER_PERCEPTION_COST = POWER_COSTS.superPerception, INVULNERABLE_COST = POWER_COSTS.invulnerable, REGENERATION_COST = POWER_COSTS.regeneration;
  const SUPERPOWER_COST = POWER_COSTS.superpower, SUPER_SPEED_THINKING_COST = POWER_COSTS.superSpeedThinking, MOUNTAIN_COLLAPSE_COST = POWER_COSTS.mountainCollapse;
  const MIND_DIVISION_COSTS = POWER_COSTS.mindDivision, HYPER_REGENERATION_COST = POWER_COSTS.hyperRegeneration, MENTAL_DOMAIN_COST = POWER_COSTS.mentalDomain;
  const EARTH_SPLIT_COST = POWER_COSTS.earthSplit, GODSPEED_COST = POWER_COSTS.godspeed, SUPERPOWER_EVOLUTION_COST = POWER_COSTS.superpowerEvolution;
  const SUBTLE_COST = POWER_COSTS.subtle, SKY_SPLIT_COST = POWER_COSTS.skySplit, ROCK_BASE_COST = POWER_COSTS.rockBase;
  const BIOLOGICAL_QUANTIFICATION_COST = POWER_COSTS.biologicalQuantification, GHOST_MAN_TRANSFORMATION_COST = POWER_COSTS.ghostManTransformation;
  const DESTROY_COUNTRY_COST = POWER_COSTS.destroyCountry, HUMAN_GHOST_TRANSFORMATION_COST = POWER_COSTS.humanGhostTransformation;
  const KILLING_INTENT_SUBSTANCE_COST = POWER_COSTS.killingIntentSubstance, ENERGY_CYCLE_COST = POWER_COSTS.energyCycle;
  const MOUNTAIN_SHATTER_COST = POWER_COSTS.mountainShatter, BIOENERGY_COST = POWER_COSTS.bioenergy;
  const ELEMENTALIZATION_COST = POWER_COSTS.elementalization, KILLING_INTENT_PERCEPTION_COST = POWER_COSTS.killingIntentPerception;
  const KILLING_INTENT_WAVE_COST = POWER_COSTS.killingIntentWave, ULTIMATE_INTENT_COST = POWER_COSTS.ultimateIntent;
  const BRAIN_DOMAIN_DEVELOPMENT_COST = POWER_COSTS.brainDomainDevelopment, CONTINENT_SPLIT_COST = POWER_COSTS.continentSplit;
  const CONTINENT_COLLAPSE_COST = POWER_COSTS.continentCollapse;
  const WAVE_EYE_COST = POWER_COSTS.waveEye, ELEMENTAL_AWAKENING_COST = POWER_COSTS.elementalAwakening;
  const MOONFALL_COST = POWER_COSTS.moonfall, FLOW_STATE_COST = POWER_COSTS.flowState;
  const SELFHOOD_COST = POWER_COSTS.selfhood, FREEDOM_COST = POWER_COSTS.freedom;
  const CHICXULUB_METEORITE_COST = POWER_COSTS.chicxulubMeteorite;
  const PLANET_WILL_COST = POWER_COSTS.planetWill, STAR_SPIRIT_COST = POWER_COSTS.starSpirit;
  const STAR_SHATTER_COST = POWER_COSTS.starShatter, SPACE_QUAKE_COST = POWER_COSTS.spaceQuake;
  const SELFLESS_COST = POWER_COSTS.selfless, SUPERNATURAL_FIRE_COST = POWER_COSTS.supernaturalFire;
  const FIVE_SPIRIT_STONE_COST = POWER_COSTS.fiveSpiritStone, SELF_SUPPRESSION_COST = POWER_COSTS.selfSuppression;
  const STELLAR_FURNACE_COST = POWER_COSTS.stellarFurnace, STELLAR_TREASURE_SEEKING_COST = POWER_COSTS.stellarTreasureSeeking;
  const GRAVITATIONAL_COLLAPSE_COST = POWER_COSTS.gravitationalCollapse, GALACTIC_RETURN_COST = POWER_COSTS.galacticReturn;
  const STELLAR_SEA_GIFT_COST = POWER_COSTS.stellarSeaGift, STELLAR_RESONANCE_COST = POWER_COSTS.stellarResonance;
  const GREAT_ATTRACTOR_COST = POWER_COSTS.greatAttractor, LARGE_SCALE_ADAPTATION_COST = POWER_COSTS.largeScaleAdaptation;
  const SUPERCLUSTER_COLLAPSE_COST = POWER_COSTS.superclusterCollapse, COSMIC_WEB_COST = POWER_COSTS.cosmicWeb;
  const SCALE_UNIFICATION_COST = POWER_COSTS.scaleUnification, SPACETIME_FRAMEWORK_COST = POWER_COSTS.spacetimeFramework;
  const ROCK_BASE_LEVEL_CAP = CONFIG.rockBaseLevelCap;
  const QI_REFINING_COST = IMMORTAL_COSTS.qiRefining, FOUNDATION_BASE_COST = IMMORTAL_COSTS.foundation, GOLDEN_CORE_BASE_COST = IMMORTAL_COSTS.goldenCore;
  const ADVANCED_REALMS = CONFIG.realms;
  const IMMORTAL_LIFE_COST = IMMORTAL_COSTS.immortalLife, CIRCULATION_COST = IMMORTAL_COSTS.circulation, MINOR_TECHNIQUE_COST = IMMORTAL_COSTS.minorTechnique;
  const FLYING_ESCAPE_COST = IMMORTAL_COSTS.flyingEscape, MATERIAL_CONTROL_COST = IMMORTAL_COSTS.materialControl, DIVINE_SENSE_COST = IMMORTAL_COSTS.divineSense;
  const GREAT_CULTIVATOR_COST = IMMORTAL_COSTS.greatCultivator, SPIRIT_WORLD_ASCENSION_COST = IMMORTAL_COSTS.spiritWorldAscension, AURA_CONTROL_COST = IMMORTAL_COSTS.auraControl;
  const EQUAL_HEAVEN_LONGEVITY_COST = IMMORTAL_COSTS.equalHeavenLongevity, FIVE_ELEMENTS_COST = IMMORTAL_COSTS.fiveElements, HEAVENLY_TREASURE_COSTS = IMMORTAL_COSTS.heavenlyTreasure;
  const BRAHMA_DEMON_ART_COST = IMMORTAL_COSTS.brahmaDemonArt;
  const VOID_REFINING_TO_QI_COST = IMMORTAL_COSTS.voidRefiningToQi, SPIRIT_REFINING_ART_COST = IMMORTAL_COSTS.spiritRefiningArt;
  const SECOND_NASCENT_SOUL_COST = IMMORTAL_COSTS.secondNascentSoul, ABUNDANT_AURA_COST = IMMORTAL_COSTS.abundantAura;
  const SILVER_TADPOLE_SCRIPT_COST = IMMORTAL_COSTS.silverTadpoleScript, IMMORTAL_REALM_DIVINE_ABILITY_COST = IMMORTAL_COSTS.immortalRealmDivineAbility;
  const PERFECTED_TECHNIQUE_COST = IMMORTAL_COSTS.perfectedTechnique, HEAVEN_EARTH_AURA_COST = IMMORTAL_COSTS.heavenEarthAura;
  const DIVINE_ABILITY_MASTERY_COST = IMMORTAL_COSTS.divineAbilityMastery, DUAL_INFANT_UNITY_COST = IMMORTAL_COSTS.dualInfantUnity;
  const AURA_INTO_BODY_COST = IMMORTAL_COSTS.auraIntoBody;
  const EXTERNAL_INCARNATION_COST = IMMORTAL_COSTS.externalIncarnation, DEMON_REALM_JOURNEY_COST = IMMORTAL_COSTS.demonRealmJourney;
  const RETURN_TO_ORIGIN_COST = IMMORTAL_COSTS.returnToOrigin;
  const NATAL_MAGIC_TREASURE_COST = IMMORTAL_COSTS.natalMagicTreasure;
  const PERFECTED_TECHNIQUE_COMPLETION_COST = IMMORTAL_COSTS.perfectedTechniqueCompletion;
  const ROAM_SPIRIT_WORLD_COST = IMMORTAL_COSTS.roamSpiritWorld, DESCEND_REALM_COST = IMMORTAL_COSTS.descendRealm;
  const MYSTIC_HEAVENLY_TREASURE_COSTS = IMMORTAL_COSTS.mysticHeavenlyTreasure;
  const NASCENT_SOUL_COMPLETION_COST = IMMORTAL_COSTS.nascentSoulCompletion;
  const SPIRIT_TRAVEL_VOID_COST = IMMORTAL_COSTS.spiritTravelVoid, GOLDEN_SEAL_SCRIPT_COST = IMMORTAL_COSTS.goldenSealScript;
  const IMMORTAL_POWER_CONFIG = CONFIG.immortalPower;
  const ADVANCED_IMMORTAL_ABILITY_COSTS = IMMORTAL_POWER_CONFIG.abilityCosts;
  const UNDYING_PRIMORDIAL_SPIRIT_COST = IMMORTAL_POWER_CONFIG.abilityCosts.undyingPrimordialSpirit;
  const XUAN_IMMORTAL_BODY_COST = IMMORTAL_POWER_CONFIG.abilityCosts.xuanImmortalBody;
  const LAW_COST = IMMORTAL_POWER_CONFIG.abilityCosts.law;
  const MINOR_TRIBULATION_BASE_TRIGGER_LOAD = CONFIG.minorTribulationBaseTriggerLoad;
  const LONGEVITY_800_COSTS = IMMORTAL_COSTS.longevity800, MANA_LIQUEFACTION_COST = IMMORTAL_COSTS.manaLiquefaction;
  const QI_SPELL_COSTS = IMMORTAL_COSTS.qiSpell, FOUNDATION_SPELL_COSTS = IMMORTAL_COSTS.foundationSpell, LONGEVITY_COSTS = IMMORTAL_COSTS.longevity;
  const GOLDEN_CORE_LONGEVITY_COSTS = IMMORTAL_COSTS.goldenCoreLongevity, MANA_SOLIDIFICATION_COST = IMMORTAL_COSTS.manaSolidification;
  const TECHNIQUE_COST = IMMORTAL_COSTS.technique, MAGIC_TREASURE_COST = IMMORTAL_COSTS.magicTreasure;
  const EXPLORATION_BASE_MANA = CONFIG.exploration.baseMana, EXPLORATION_MINIMUM_POWER_COST = CONFIG.exploration.minimumPowerCost;
  const EXPLORATION_STANDARD_POWER_COST = CONFIG.exploration.standardPowerCost, EXPLORATION_COST_EXPONENT_SCALE = CONFIG.exploration.costExponentScale;
  const AUTOMATIC_EXPLORATION_EFFICIENCY = CONFIG.exploration.automaticEfficiency;
  const EXPLORATION_MANA_CURVE_CONFIG = CONFIG.exploration.manaCurve;
  const MAGIC_TREASURE_MANA_CURVE_CONFIG = CONFIG.magicTreasure.manaCurve;
  const FOCUS_SOURCE_CURVE_CONFIG = CONFIG.focus.sourceCurve;
  const TRAINING_J_DECAY_SCALE = CONFIG.training.decayScale, TRAINING_J_DECAY_LOG_DIVISOR = CONFIG.training.decayLogDivisor, TRAINING_J_DECAY_POWER = CONFIG.training.decayPower;
  const SCATTER_RETAINED_UPGRADE_TIERS = CONFIG.scatterRetainedUpgradeTiers;
  const REINCARNATION_ROOTS = CONFIG.reincarnationRoots;
  const CHALLENGE_DEFINITIONS = CONFIG.challenges;
  const SCALE_THRESHOLDS = CONFIG.scales;
  const rawById = WIS.UI.byId;
  const skippedRenderElement = {
    classList: Object.freeze({ add() {}, remove() {}, contains() { return false; }, toggle() { return false; } }),
    dataset: {}, style: {},
    addEventListener() {}, setAttribute() {}, removeAttribute() {},
    querySelector() { return skippedRenderElement; },
    querySelectorAll() { return []; }
  };
  let renderCurrentPageOnly = false;
  const byId = (id) => {
    const element = rawById(id);
    if (!element) return renderCurrentPageOnly ? skippedRenderElement : null;
    if (!renderCurrentPageOnly) return element;
    const ownerPage = element.closest?.(".page");
    return ownerPage && ownerPage.id !== `${activePage}-page`
      ? skippedRenderElement
      : element;
  };
  const Scale = WIS.Power.ScaleLogic;
  const {
    gymPotentialMultiplier, gymMultiplier, sonicMovementMultiplier, godspeedExponent,
    godspeedPotentialExponent, breathingMethodGymMultiplier, scaleIndexForPower, updateScaleProgress,
    rollFitnessMembershipCardAttempts, exercisePotentialMultiplier, exerciseMultiplier,
    transcendentPotentialMultiplier, transcendentMultiplier, extremeExerciseEffectMultiplier,
    naturalStrengthPotentialMultiplier, powerMultiplierGroups, powerMultiplier, challengeCompletionCount,
    challengeRewardExponent, challengeRewardMultiplier, longevityChallengeRewardMultiplier,
    fiveMisfortunesRewardExponent, activeChallengeLimitExponent, jGainExponent, powerGainExponent,
    currentPowerMilestone, reachedPowerMilestone, superpowerExponent, fitnessSourceExponent,
    trainingSourceExponent, applyGainExponent, additiveLevelMultiplier, jMultiplierGroups, jMultiplier,
    automaticJPerSecond, jSourceGains, finalJPerSecondFromSources, preSoftcapJGainFromSources,
    resourceSoftcapIntegrationEvaluationAmount, getResourceSoftcapBreakdown,
    continentPowerMagnitude, elementalizationJSource, longevityFitnessMultiplier,
    lifePowerFitnessMultiplier, myStylePotentialFitnessMultiplier,
    myStyleFitnessMultiplier, carbonLimitPotentialFitnessBonus, carbonLimitFitnessBonus,
    regenerationFitnessMultiplier, enduranceEnhancementFitnessMultiplier, fitnessMembershipCardCount,
    fitnessMembershipCardFitnessBonus, fitnessMembershipCardChance, fitnessJBonus, effectiveFitnessLevel,
    waterPotentialJMultiplier, runningCost, fitnessLevelCap, rockLevelCap,
    baseConversionGain, trainingPowerDecayMultiplier, trainingPowerSource, highSpeedMetabolismMultiplier,
    conversionGain, ghostBrainPotentialPowerBonus, ghostBrainPowerBonus, mentalDomainMultiplier,
    skySplitPotentialMultiplier, skySplitMultiplier, ghostBrainPowerSource, brainDomainDevelopmentExponent,
    ghostBrainActualPowerPerSecond, joulesForNextBasePower,
    focusPowerPerSecond, subtleFocusExponent, rawFocusPowerPerSecond, dynamicFocusMultiplier,
    focusSoftcapExponent, actualFocusPowerPerSecond, focusPowerGainStages, killingIntentJBonus,
    rawKillingIntentPotentialJBonus, killingIntentExtractionRatio, killingIntentWaveExponent, superSpeedThinkingMultiplier, killingIntentPotentialJBonus,
    focusPercent, intuitionPotentialFocusMultiplier, intuitionFocusMultiplier, rockCost,
    rockPowerPerSecond, effectiveRockLevel, rockStrikeMultiplier, mountainCollapseExponent,
    automaticPowerPerSecond, flowUltimateIntentMultiplier, challengeAdjustedPowerSource, ultimateIntentPowerSource,
    finalPowerGainFromSources, preSoftcapPowerGainFromSources, mindDivisionCost,
    superLollipopCount, superLollipopChance, superLollipopTrainingMultiplier,
    skyCrystalCount, skyCrystalChance, skyCrystalRockMultiplier,
    cosmicFiberCount, cosmicFiberDecayedChance, cosmicFiberChance,
    cosmicWillCount, cosmicWillDecayedChance, cosmicWillChance, galaxyEffectiveExponent,
    scaleRequirementDetails, blackHoleGainLossDetails,
    completedChallengeLayers, treasureChanceMultiplier,
    planetWillElementalizationMultiplier, starShatterRockMultiplier,
    supernaturalFirePowerMultiplier, resourceSoftcapBaseExponent,
    selfSuppressionJExponentFromBase, selfSuppressionJExponent,
    fiveSpiritStoneCount, fiveSpiritStoneChance, fiveSpiritStoneJSource, fiveSpiritStonePowerSource,
    manualScaleUpgradeHistory, hasManuallyUpgradedScale, autoUpgradeEnhancements, achievementJBonus,
    train, buyRunning, buyGym, buyExercise, buyTranscendent, buyFocus, buyBreathingMethod,
    buyExtremeExercise, buyRock, buyWater, buyGhostBrain, buyNaturalStrength, buyMentalPower,
    buyLifePower, buyMyStyle, buyIntuition, buyGhostBack, buySonicMovement, buyCarbonLimit, buyKillingIntent,
    buyRockStrike, buyHighSpeedMetabolism, buyEnduranceEnhancement, buyBulletTime, buyDynamicFocus,
    buySuperPerception, buyInvulnerable, buyRegeneration, buySuperpower, buySuperSpeedThinking,
    buyMountainCollapse, buyMindDivision, toggleGhostBack
  } = Scale;
  const {
    sonicMovementMultiplierForExponent, sonicMovementPotentialMultiplier,
    brainDomainDevelopmentPotentialExponent, killingIntentWavePotentialExponent,
    continentCollapsePotentialExponent
  } = Scale;
  const Immortal = WIS.Cultivation.ImmortalLogic;
  const {
    celestialDeclineActive, celestialDeclineExponent, immortalApertureCost, immortalApertureCap,
    immortalPowerUnlocked, nextImmortalPowerRealmCost, immortalPowerProgressRatio, immortalPowerManaSuppressionExponent,
    immortalPowerBasePerSecond, immortalPowerMultiplierGroups, immortalPowerMultiplier,
    immortalPowerBeforeGoogolPenaltyPerSecond, immortalPowerPerSecond,
    immortalApertureLevelMultiplier, immortalApertureMilestoneMultiplier,
    immortalApertureMultiplier, lawImmortalPowerExponent, lawImmortalPowerActualExponent, lawImmortalPowerMultiplier,
    spiritCaptureReturnMultiplier, spiritDomainJSource, soulQualitativeChangeMultiplier,
    immortalPowerRegionExponent, selfCorpseImmortalPowerLimitExponent,
    daoAncestorActive, daoAncestorRequirement, daoImmortalPowerRatio, daoTimeLawExponent, applyDaoTimeLaw,
    daoPowerSource, daoAssimilationQ, daoDomainExponent,
    qiRefiningChallengeActive, circulationEffective, qiLayerRequirement, qiLayerManaMultiplier,
    qiLayerManaSourceMultiplier, qiGlobalSoftcapQ, qiManaSoftcapQ, qiChallengeReward,
    trinityImmortalPowerMultiplier, unityWithDaoExponent, lawCrystalFilamentDetails,
    celestialFiveDeclineBaseExponent, celestialFiveDeclineExponent,
    fiveElementsTreasureCount, fiveElementsTreasureRawMultiplier,
    fiveElementsTreasureInternalExponent, fiveElementsTreasureMultiplierBeforeDecline,
    fiveElementsTreasureChance, applyCelestialFiveDeclineToMultiplier,
    immortalCrystalCount, immortalCrystalChance, immortalCrystalIncrement, immortalCrystalMultiplier,
    automaticManaBeforeSuppressionPerSecond, automaticManaBeforeGoogolPenaltyPerSecond,
    advancedRealmResource, nextRealmResource,
    immortalCultivationActive, cultivationRealmLevel, cultivationRealmName, qiSpellPowerMultiplier, foundationSpellPowerMultiplier, greatCultivatorJMultiplier, immortalFitnessBaseMultiplier, equalHeavenLongevityFitnessMultiplier, baLingChiCount, baLingChiFitnessMultiplier, manaLiquefactionManaJMultiplier, manaJBonus, spiritRefiningArtExponent, reincarnationManaJExponent, manaJRawBonus, magicTreasurePotentialPowerBonus, magicTreasureManaExponent, magicTreasureManaCurve, materialControlMultiplier, magicTreasurePowerBonus, magicTreasurePowerSource, brahmaDemonArtPowerSource, trueSpiritTransformationMultiplier, rollTianNiPearlAttempts, minorTribulationPowerExponent, minorTribulationExplorationBaseExponent, minorTribulationExplorationMinimumExponent, minorTribulationExplorationDecayCoefficient, minorTribulationExplorationManaExponent, baLingChiChance, immortalTreasureChanceMultiplier, activeRootRequirementMultiplier, realmRequirementMultiplier, activeRootName, permanentRootDefinition, effectiveScatterRebuildLevel, nextRealmRequirementStackCount, foundationCost, goldenCoreCost, goldenCoreBaseCost, advancedRealmCost, advancedRealmBaseCost, nextRealmCost, breathingRealmConfig, breathingManaDecayMultiplier, baseBreathingManaGain, breathingJCurveExponent, breathingManaGain, breathingManaSource, voidRefiningToQiExponent, auraControlPotentialMultiplier, auraControlMultiplier, immortalRealmDivineAbilityPotentialMultiplier, immortalRealmDivineAbilityMultiplier, manaMultiplierGroups, manaGainMultiplier, bottleneckManaMultiplier, cultivationBottleneckManaMultiplier, scatterRebuildManaMultiplier, naturalTreasureManaMultiplier, naturalTreasureUpgradeChance, naturalTreasureLevelCap, xuTianDingCount, xuTianDingMultiplier, xuTianDingChance, wanYaoFanCount, wanYaoFanMultiplier, wanYaoFanChance, phantomHeavenMirrorCount, phantomHeavenMirrorChance, phantomHeavenMirrorLoadMultiplier, mysticHeavenSacredTreeCount, mysticHeavenSacredTreeChance, mysticHeavenSpiritSlayingSwordCount, mysticHeavenSpiritSlayingSwordChance, mysticHeavenSpiritSlayingSwordExponent, tianNiPearlCount, tianNiPearlManaMultiplier, tianNiPearlChance, mysteriousGreenBottleCount, mysteriousGreenBottleMultiplier, mysteriousGreenBottleChance, fuBaoCount, fuBaoChance, fuBaoManaRatio, fuBaoExplorationManaBonus, formatProbability, joulesForNextBaseMana, automaticManaPerSecond, automaticExplorationAmountPerSecond, automaticExplorationManaPerSecond, circulationManaSource, circulationManaPerSecond, circulationPercent, explorationManaGain, explorationPotentialManaGain, silverTadpoleScriptExplorationExponent, minorTribulationTriggerLoad, spiritWorldAscensionExplorationMultiplier, finalManaGainFromSources, flyingEscapeMultiplier, explorationPowerCost, rawExplorationAmountForCost, explorationAmountForCost, explorationManaAmount, divineSenseMultiplier, explorationBaseMana, rollMysteriousGreenBottleAttempts, rollFuBaoAttempts, rollNaturalTreasureAttempts, rollXuTianDingAttempts, rollWanYaoFanAttempts, rollBaLingChiAttempts, rollSeizeFoundationAttempts, processExplorationJudgements, addExplorationProgress, tryTianNiPearl, longevityCost, qiSpellCost, foundationSpellCost, goldenCoreLongevityCost, longevity800Cost, heavenlyTreasureCost, trueSpiritTransformationCost, mysticHeavenlyTreasureCost, manualImmortalAbilityHistory, hasManuallyUpgradedImmortalAbility, recordManualProgress, recordManualRealmBreakthrough, autoUpgradeImmortalAbilities, autoBreakthroughImmortalRealms, chooseCultivation, grantMahayanaReincarnationEffects, unlockQiRefining, breathe, minorTribulationPreviewForExploration, registerSuccessfulExploration, unlockFoundation, unlockGoldenCore, unlockAdvancedRealm, unlockImmortalLife, buyQiSpell, unlockCirculation, unlockManaLiquefaction, unlockTechnique, buyFoundationSpell, buyLongevity, buyGoldenCoreLongevity, unlockManaSolidification, unlockMagicTreasure, unlockMinorTechnique, unlockFlyingEscape, unlockMaterialControl, unlockDivineSense, unlockGreatCultivator, unlockSecondNascentSoul, buyLongevity800, unlockManaAbility, unlockVoidRefinementAbility, buyHeavenlyTreasure, buyTrueSpiritTransformation, buyMysticHeavenlyTreasure, unlockMahayanaAbility, grantThreeDeficienciesResetReward, explore, scatterAndRebuild, reincarnate
  } = Immortal;
  const {
    lawImmortalPowerPotentialMultiplier,
    descendRealmPotentialTreasureMultiplier
  } = Immortal;
  const {
    naturalTreasureRawManaMultiplier, naturalTreasureManaDiminishingExponent,
    tianNiPearlRawManaMultiplier, tianNiPearlManaDiminishingExponent
  } = Immortal;

    const PAGE_NAMES = ["actions", "upgrades", "cultivation", "treasures", "challenges", "achievements", "statistics"];
    let activePage = "actions";
    let activeCultivationPage = "realms";
    let globalDirty = true;
    const dirtyPages = new Set(PAGE_NAMES);
    const structuralPages = new Set(PAGE_NAMES);
    let structureKey = "", structureRevision = 0, renderingStructure = false;
    const heavyPreviewCache = new WeakMap();
    const HEAVY_PREVIEW_REFRESH_MS = 1000;
    const dirtyCostGroupPages = new Set(["upgrades", "cultivation"]);
    let achievementsDirty = true;
    const achievementPresentation = WIS.Meta.Achievements.createPresentation(markAchievementsDirty);
    let achievementCardsCreated = false;
    let noticeTimer;
    const achievementNoticeQueue = [];
    let achievementNoticeActive = false;
    let scaleNoticeTimer;
    const debugSpeedOptions = Object.freeze([1, 5, 20, 100]);
    let formulaDetailsExpanded = false;
    let automationRenderSignature = "";
    let offlineCatchUpStatus = Object.freeze({ phase: "idle", locked: false });
    let offlineDialogDelayTimer = null;
    // Presentation survives the next online task; it never blocks simulation.
    let offlineCompletedSummary = null;
    let offlineAbandonPending = false;

    const AUTOMATION_GROUPS = Object.freeze([
      Object.freeze({ key: "general", label: "通用" }),
      Object.freeze({ key: "scale", label: "量级" }),
      Object.freeze({ key: "immortal", label: "仙道" }),
      Object.freeze({ key: "challenge", label: "挑战" }),
      Object.freeze({ key: "other", label: "其他" })
    ]);

    const createStoredAutomation = ({ id, name, group, description, unlockAchievement, stateKey }) =>
      Object.freeze({
        id,
        name,
        group: AUTOMATION_GROUPS.some((knownGroup) => knownGroup.key === group) ? group : "other",
        description,
        isUnlocked: () => hasAchievement(unlockAchievement),
        isEnabled: () => state[stateKey] !== false,
        toggle: () => {
          state[stateKey] = state[stateKey] === false;
          return state[stateKey];
        }
      });

    const AUTOMATION_DEFINITIONS = Object.freeze([
      createStoredAutomation({
        id: "scale-upgrades",
        name: "强化自动升级",
        group: "scale",
        description: "自动升级曾手动升级过的强化。",
        unlockAchievement: "scale6",
        stateKey: "scaleUpgradeAutomationEnabled"
      }),
      createStoredAutomation({
        id: "scale-actions",
        name: "健身与打岩自动升级",
        group: "scale",
        description: "自动升级健身与打岩；同消耗时强化优先。",
        unlockAchievement: "trueScale7",
        stateKey: "scaleActionAutomationEnabled"
      }),
      createStoredAutomation({
        id: "immortal-abilities",
        name: "仙道能力自动升级",
        group: "immortal",
        description: "自动升级曾手动升级过的炼气道、修真道能力。",
        unlockAchievement: "infantSpirit",
        stateKey: "immortalAbilityAutomationEnabled"
      }),
      createStoredAutomation({
        id: "immortal-realms",
        name: "仙道境界自动突破",
        group: "immortal",
        description: "自动突破曾手动突破过的炼气道、修真道境界，包含已手动完成的修真道入门。",
        unlockAchievement: "bodyIntegration",
        stateKey: "immortalRealmAutomationEnabled"
      })
    ]);
    const AUTOMATION_BY_ID = new Map(AUTOMATION_DEFINITIONS.map((definition) => [definition.id, definition]));

  function configureBuildControlledUI() {
    const debugSpeedButton = rawById("debug-speed-button");
    if (debugSpeedButton) {
      debugSpeedButton.hidden = !BUILD.enableSpeedControls;
      if (!BUILD.enableSpeedControls) {
        debugSpeedButton.dataset.multiplier = "1";
        debugSpeedButton.textContent = "速度 ×1";
      }
    }
    const formulaToggle = rawById("formula-details-toggle");
    const formulaRefresh = rawById("formula-details-refresh");
    const formulaTools = document.querySelector(".resource-debug-tools");
    const formulaPanel = document.querySelector(".resource-debug-breakdown");
    if (!BUILD.enableFormulaDetails) formulaDetailsExpanded = false;
    if (formulaTools) formulaTools.hidden = !BUILD.enableFormulaDetails;
    if (formulaToggle) {
      formulaToggle.hidden = !BUILD.enableFormulaDetails;
      formulaToggle.setAttribute("aria-expanded", String(
        BUILD.enableFormulaDetails && formulaDetailsExpanded
      ));
    }
    if (formulaPanel) {
      formulaPanel.hidden = !BUILD.enableFormulaDetails || !formulaDetailsExpanded;
    }
    if (formulaRefresh) formulaRefresh.hidden = !BUILD.enableFormulaDetails || !formulaDetailsExpanded;
  }

  function renderAutomationManager(force = false) {
    const groupsRoot = rawById("automation-groups");
    const emptyState = rawById("automation-empty");
    if (!groupsRoot || !emptyState) return;

    const signature = AUTOMATION_DEFINITIONS
      .map((definition) => `${definition.id}:${definition.isUnlocked() ? 1 : 0}:${definition.isEnabled() ? 1 : 0}`)
      .join("|");
    if (!force && signature === automationRenderSignature) return;
    automationRenderSignature = signature;

    const unlockedDefinitions = AUTOMATION_DEFINITIONS.filter((definition) => definition.isUnlocked());
    groupsRoot.replaceChildren();
    AUTOMATION_GROUPS.forEach((group) => {
      const definitions = unlockedDefinitions.filter((definition) => definition.group === group.key);
      if (definitions.length === 0) return;

      const section = document.createElement("section");
      section.className = "automation-group";
      section.dataset.automationGroup = group.key;

      const header = document.createElement("div");
      header.className = "automation-group-header";
      const heading = document.createElement("h3");
      heading.textContent = group.label;
      const count = document.createElement("small");
      count.textContent = `${definitions.length}项`;
      header.append(heading, count);

      const items = document.createElement("div");
      items.className = "automation-items";
      definitions.forEach((definition) => {
        const row = document.createElement("article");
        row.className = "automation-row";

        const copy = document.createElement("div");
        const name = document.createElement("h4");
        name.textContent = definition.name;
        const description = document.createElement("p");
        description.textContent = definition.description;
        copy.append(name, description);

        const enabled = definition.isEnabled();
        const toggle = document.createElement("button");
        toggle.className = "automation-toggle";
        toggle.type = "button";
        toggle.dataset.automationId = definition.id;
        toggle.setAttribute("aria-pressed", String(enabled));
        toggle.setAttribute("aria-label", `${definition.name}：${enabled ? "已开启" : "已关闭"}`);
        toggle.textContent = enabled ? "已开启" : "已关闭";

        row.append(copy, toggle);
        items.appendChild(row);
      });

      section.append(header, items);
      groupsRoot.appendChild(section);
    });
    emptyState.hidden = unlockedDefinitions.length > 0;
  }

  function offlinePauseDescription(diagnostic, origin, source) {
    const activity=source==='online'?"在线追赶":source==='offline'?"离线结算":"进度恢复";
    if(diagnostic?.reason==="player-paused")return "你已手动暂停结算，剩余时间已保留，点击重试结算可继续。";
    if(origin==="history")return `存档保留了上次结算失败记录，可点击重试。尚未使用当前版本重新结算。发生构建：${diagnostic?.occurredBuild??"未知"}；规则版本：${diagnostic?.occurredRule??"未知"}。${diagnostic?.error?.message?"历史错误："+diagnostic.error.message:""}`;
    const errorMessage = diagnostic?.error?.message;
    if (diagnostic?.reason === "fast-forward-unavailable") return "剩余时间已保留。点击重试，由当前版本继续处理。";
    if (errorMessage) return `${activity}中发生异常：${errorMessage}。剩余时间已保留，可手动重试。`;
    if (diagnostic?.reason === "player-paused") return "已暂停并保留剩余时间，点击重试结算可继续。";
    if (diagnostic?.reason === "zero-progress") {
      return "当前状态无法继续推进。剩余时间已完整保留，可在状态恢复后重试结算。";
    }
    return `${activity}暂时无法继续。剩余时间已完整保留，可手动重试。`;
  }

  function openOfflineProgressDialog() {
    const dialog = rawById("offline-progress-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  function closeOfflineProgressDialog() {
    const dialog = rawById("offline-progress-dialog");
    if (dialog?.open) dialog.close();
  }

  async function abandonOfflineProgress() {
    const current = getCatchUpStatus();
    if (offlineAbandonPending || !["running", "paused"].includes(current?.phase) ||
        typeof context.abandonCatchUp !== "function") return;
    const remaining = formatElapsedTime(Math.max(0, Number(current.pendingClockSeconds) || 0));
    if (!window.confirm(`确定要放弃剩余 ${remaining} 的离线结算吗？\n已结算的资源与宝物会保留，剩余时间及其收益将永久舍弃，无法恢复。`)) return;
    offlineAbandonPending = true;
    renderOfflineCatchUpStatus(getCatchUpStatus());
    try {
      const result = await context.abandonCatchUp();
      const latest = getCatchUpStatus();
      handleOfflineCatchUpStatus(latest);
      if (result?.abandoned === false || latest.locked === true) {
        showNotice("未能放弃剩余结算，原有待结算时间已保留。请检查存档状态后重试。", 6000);
        return;
      }
      offlineCompletedSummary = null;
      if (latest.phase === "completed") acknowledgeCatchUp();
      closeOfflineProgressDialog();
      showNotice("已保留已结算收益并放弃剩余离线时间，可在设置中导出存档。", 6000);
    } catch (error) {
      handleOfflineCatchUpStatus(getCatchUpStatus());
      showNotice(`放弃结算失败，待结算时间仍保留：${error?.message || error}`, 6000);
    } finally {
      offlineAbandonPending = false;
      renderOfflineCatchUpStatus(getCatchUpStatus());
    }
  }

  function renderOnlineCompensation() {
    const credit = rawById("online-compensation-balance");
    const balance = Number(WIS.Simulation.Compensation.get(state).balance) || 0;
    if (credit) {
      credit.hidden = !(balance > 0);
      credit.textContent = `两倍在线收益 · 剩余 ${formatElapsedTime(balance)}`;
      credit.title = "仅确认推进合格在线时间时扣额；离线及暂停等待保留额度。";
    }
  }

  function renderOfflineCatchUpStatus(status) {
    renderOnlineCompensation();
    const source=status?.sessionSource||'unknown';
    const online=source==='online',offline=source==='offline',mixed=source==='mixed';
    const activity=online?'在线进度追赶':offline?'离线收益结算':'游戏进度恢复';
    const setText=(id,text)=>{const el=rawById(id);if(el)el.textContent=text;};
    setText('offline-progress-total-label',online?'本次追赶时间':offline?'本次离线时间':'本次恢复时间');
    setText('offline-progress-pending-label',online?'待追赶':offline?'待结算':'待恢复');
    setText('offline-pause-title',activity+'已暂停');
    setText('offline-complete-title',mixed?'混合恢复结果':offline?'离线收益汇总':'游戏进度恢复结果');
    setText('retry-offline-progress',online?'重试追赶':'重试结算');
    setText('offline-progress-intro',online?'这是前台在线计算积压，不是离开游戏产生的离线时间。阻塞追赶期间暂不产生新增在线收益。':
      offline?'结算实际离开游戏期间的收益，自动操作沿用已保存的开关。阻塞结算期间暂不产生新增在线收益。':
      mixed?'本次包含在线积压和实际离线时间，各自按原规则处理。阻塞恢复期间暂不产生新增在线收益。':
      '部分历史时间来源无法完整确认，按存档原任务恢复。阻塞恢复期间暂不产生新增在线收益。');
    const pendingTime = seconds => seconds > 0 && seconds < 1
      ? `${Number(seconds).toPrecision(3)}秒` : formatElapsedTime(seconds);
    for (const id of ["convert-offline-progress", "convert-quiet-catch-up"]) {
      const button = rawById(id);
      if (button) {
        button.disabled = offlineAbandonPending || !(status?.convertibleClockSeconds > 0);
        button.hidden = !(status?.convertibleClockSeconds > 0);
      }
    }
    const conversionHelp=rawById('offline-conversion-help');
    if(conversionHelp)conversionHelp.hidden=!(status?.convertibleClockSeconds>0);
    const progress = Math.max(0, Math.min(1, Number(status?.progress) || 0));
    const wallTime = rawById("offline-progress-wall-time");
    if (wallTime) {
      const throughput=Number(status?.actualThroughput), wait=status?.estimatedWaitSeconds;
      wallTime.textContent = "本次恢复耗时 " + Math.max(0, Number(status?.recoveryElapsedSeconds) || 0).toFixed(1) + " 秒" +
        (status?.phase==="running" ? (throughput>0 ? ` · 最近结算速度 ×${throughput.toFixed(1)}` : " · 正在测量速度") +
          (Number.isFinite(wait)&&wait>=0 ? ` · 预计等待 ${formatElapsedTime(wait)}` : " · 等待时间估算中") +
          (status?.recentFastForward?.noEffectiveMerge ? " · 近期无有效合并，正在按原帧结算" : "") : "");
    }
    const pauseButton = rawById("pause-offline-progress");
    if (pauseButton) pauseButton.hidden = status?.phase !== "running";
    const remainingSeconds = Math.max(0, Number(status?.pendingClockSeconds) || 0);
    const title = rawById("offline-progress-title");
    const detail = rawById("offline-progress-detail");
    const pausePanel = rawById("offline-pause-panel");
    const completePanel = rawById("offline-complete-panel");
    const abandonActions = rawById("offline-abandon-actions");
    const abandonButton = rawById("abandon-offline-progress");
    const progressBar = rawById("offline-progress-bar");
    const percent = rawById("offline-progress-percent");
    const remaining = rawById("offline-progress-remaining");
    const originalTotal = rawById("offline-progress-original-total");
    const originalProcessed = rawById("offline-progress-original-processed");
    const originalPending = rawById("offline-progress-original-pending");
    if (!title || !detail || !pausePanel || !completePanel || !progressBar || !percent ||
        !remaining || !originalTotal || !originalProcessed || !originalPending) return;

    progressBar.setAttribute("aria-label",activity+"进度");
    progressBar.value = status?.phase === "completed" ? 1 : progress;
    percent.textContent = status?.phase === "completed" ? "100%" : `${Math.min(99.9,progress*100).toFixed(1)}%`;
    remaining.textContent = status?.phase === "completed"
      ? (online?"在线积压已追赶完成":offline?"全部离线时间已结算":"本次游戏进度已恢复")
      : (mixed ? `在线待追赶 ${pendingTime(status?.onlinePendingGameSeconds||0)} · 离线待结算 ${pendingTime(status?.offlinePendingGameSeconds||0)}` : source==='unknown' ? `待恢复时间 ${pendingTime(status?.pendingGameSeconds||0)}（部分历史来源未知）`
        : `${online?'待追赶时间':'待结算游戏时间'} ${pendingTime(Math.max(0, Number(status?.pendingGameSeconds) || 0))}`);
    originalTotal.textContent = formatElapsedTime(Math.max(0, Number(status?.originalClockSeconds) || 0));
    originalProcessed.textContent = formatElapsedTime(
      Math.max(0, Number(status?.originalProcessedClockSeconds) || 0)
    );
    originalPending.textContent = pendingTime(
      Math.max(0, Number(status?.originalPendingClockSeconds) || 0)
    );
    pausePanel.hidden = status?.phase !== "paused";
    if(status?.phase!=="paused")rawById("offline-pause-reason").textContent="";
    completePanel.hidden = status?.phase !== "completed";
    if (abandonActions) abandonActions.hidden = !["running", "paused"].includes(status?.phase);
    if (abandonButton) {
      abandonButton.disabled = offlineAbandonPending || typeof context.abandonCatchUp !== "function";
      abandonButton.textContent = "无补偿直接放弃剩余时间";
    }

    if(status?.treasureRecovery?.active){
      const recovery=status.treasureRecovery;
      title.textContent='正在整理宝物进度';
      const compacting=recovery.phase==='compact';
      const done=compacting?recovery.processed:recovery.blocks-recovery.remainingBlocks;
      const total=compacting?recovery.total:recovery.blocks;
      progressBar.setAttribute('aria-label','宝物进度整理');progressBar.value=total?done/total:0;
      percent.textContent=`${compacting?'整理':'结算'} ${done} / ${total}`;
      setText('offline-progress-intro','正在恢复历史宝物来源。游戏时间、补偿额度和原有收益均保留，整理完成后自动继续。');
      detail.textContent=compacting?'正在按原始获取和奖励倍率整理连续来源。':`剩余 ${recovery.remainingBlocks} 个结算段。`;
      if(wallTime)wallTime.textContent='整理期间暂不产生新增在线收益。';
      if(abandonActions)abandonActions.hidden=true;
      if(pauseButton)pauseButton.hidden=true;
      for(const id of ['convert-offline-progress','offline-conversion-help']){const element=rawById(id);if(element)element.hidden=true;}
    } else if (status?.phase === "paused") {
      title.textContent = activity+"已暂停";
      detail.textContent = "剩余时间已保留，可手动继续。"+(status?.convertibleClockSeconds>0?"仅尚未处理的实际离线时间可以转换为两倍在线收益。":"")+"暂停等待不产生新收益。";
      rawById("offline-pause-reason").textContent = offlinePauseDescription(status.pauseReason,status.pauseOrigin,source);
    } else if (status?.phase === "completed") {
      title.textContent = activity+"完成";
      detail.textContent = "游戏已恢复正常在线推进，可阅读本次"+(mixed?"在线和离线混合恢复结果":offline?"离线收益报告":"进度恢复结果")+"，点击继续游戏关闭。";
      rawById("offline-progress-summary").textContent = status.report || "本次进度恢复完成，当前没有可自动获取的资源。";
    } else {
      title.textContent = online?"正在追赶在线进度":offline?"正在结算离线收益":"正在恢复游戏进度";
      detail.textContent = online?"在线积压按当前可安全结算区间追赶；系统会在境界、自动化、宝物等状态变化点自动切段。在线时间不可转换为离线补偿。":
        "离线每段最多60游戏秒，在线积压按可安全结算区间推进；状态变化时重新计算后续来源。此阻塞窗口期间暂不产生新增在线收益。";
    }
  }

  function offlineDialogWaitMs(status) {
    // Presentation only: short foreground/back-tab debt still settles in full.
    // Keep a visible escape/retry path when even a short recovery is slow.
    return Number(status?.originalClockSeconds) >= CONFIG.offlineNoticeMinSeconds ? 300 : 2000;
  }

  const offlineSummarySeen = new Set();
  let offlineSummaryTimer = null, offlineSummaryFrame = null;
  const offlineSessionId = status => `${status?.sessionSource}|${status?.startedAt}|${status?.originalClockSeconds}`;
  function shouldShowOfflineResult(status) {
    return status?.sessionSource === 'offline' && Number(status.originalClockSeconds) >= CONFIG.offlineNoticeMinSeconds;
  }
  function shouldShowOfflineProgress(status) {
    return status?.phase === 'running' && status.presentation === 'blocking' &&
      Date.now() - (Number(status.startedAt) || Date.now()) >= offlineDialogWaitMs(status);
  }
  function clearOfflineSummaryPresentation() {
    window.clearTimeout(offlineSummaryTimer); offlineSummaryTimer = null;
    window.cancelAnimationFrame(offlineSummaryFrame); offlineSummaryFrame = null;
  }
  function dismissOfflineSummary() {
    clearOfflineSummaryPresentation();
    const summary = offlineCompletedSummary;
    if (summary) offlineSummarySeen.add(offlineSessionId(summary));
    offlineCompletedSummary = null;
    const latest = getCatchUpStatus();
    if (latest.phase === 'completed' && (!summary || offlineSessionId(latest) === offlineSessionId(summary) || latest.sessionSource === 'online'))
      acknowledgeCatchUp();
    handleOfflineCatchUpStatus(getCatchUpStatus());
  }
  function presentOfflineSummary() {
    openOfflineProgressDialog();
    if (offlineSummaryFrame !== null || offlineSummaryTimer !== null) return;
    const summary = offlineCompletedSummary, id = offlineSessionId(summary);
    // Let the completed panel paint before starting any auto-close countdown.
    // This delays presentation only; simulation and online income keep running.
    offlineSummaryFrame = window.requestAnimationFrame(() => {
      offlineSummaryFrame = window.requestAnimationFrame(() => {
        offlineSummaryFrame = null;
        if (offlineCompletedSummary !== summary || getCatchUpStatus().locked || document.hidden ||
            !rawById('offline-progress-dialog')?.open || rawById('offline-complete-panel')?.hidden) return;
        offlineSummarySeen.add(id);
        if (offlineSummarySeen.size > 32) offlineSummarySeen.delete(offlineSummarySeen.values().next().value);
        if (state.autoCloseOfflineDialogEnabled !== false) offlineSummaryTimer = window.setTimeout(() => {
          offlineSummaryTimer = null;
          if (offlineCompletedSummary !== summary || getCatchUpStatus().locked || document.hidden || state.autoCloseOfflineDialogEnabled === false) return;
          dismissOfflineSummary();
        }, 1500);
      });
    });
  }

  let offlineProgressRenderedAt=-Infinity, offlineProgressRenderKey=null;
  function handleOfflineCatchUpStatus(status, force=true) {
    offlineCatchUpStatus = status || Object.freeze({ phase: "idle", locked: false });
    // Only presentation is throttled. The latest status and player actions remain
    // immediate, and every phase/lock/recovery/session transition renders at once.
    const key=[status?.phase,status?.locked,status?.presentation,status?.sessionSource,status?.startedAt,status?.originalClockSeconds,status?.treasureRecovery?.active].join('|');
    const now=typeof performance!=="undefined"?performance.now():Date.now();
    if(!force&&status?.phase==='running'&&key===offlineProgressRenderKey&&now-offlineProgressRenderedAt<100)return;
    offlineProgressRenderedAt=now;offlineProgressRenderKey=key;
    window.clearTimeout(offlineDialogDelayTimer);
    offlineDialogDelayTimer = null;
    const settlementLocked = offlineCatchUpStatus.locked === true;
    document.documentElement.classList.toggle("offline-settlement-locked", settlementLocked);
    const appShell = document.querySelector(".app");
    if (appShell) {
      appShell.toggleAttribute("inert", settlementLocked);
      if (settlementLocked) appShell.setAttribute("aria-busy", "true");
      else appShell.removeAttribute("aria-busy");
    }
    const completedOnline=offlineCatchUpStatus.phase==='completed'&&offlineCatchUpStatus.sessionSource==='online';
    const autoCloseCompleted=state.autoCloseOfflineDialogEnabled!==false;
    // Source is session provenance, never inferred from duration or presentation.
    // A newer non-online report replaces the previous report. Online-only work
    // may temporarily cover it but cannot replace it, even when blocking.
    if(offlineCatchUpStatus.phase==='completed'&&!completedOnline&&
        (shouldShowOfflineResult(offlineCatchUpStatus)||!autoCloseCompleted)&&
        !offlineSummarySeen.has(offlineSessionId(offlineCatchUpStatus))&&
        offlineSessionId(offlineCompletedSummary)!==offlineSessionId(offlineCatchUpStatus)) {
      clearOfflineSummaryPresentation();
      offlineCompletedSummary=Object.freeze({...offlineCatchUpStatus});
    }
    renderOfflineCatchUpStatus(offlineCompletedSummary && !settlementLocked
      ? offlineCompletedSummary : offlineCatchUpStatus);

    if(offlineCatchUpStatus.treasureRecovery?.active){openOfflineProgressDialog();return;}
    const quiet = offlineCatchUpStatus.presentation !== "blocking" && offlineCatchUpStatus.phase !== "paused";
    const catchUpNotice = rawById("catch-up-notice");
    if (catchUpNotice) {
      const delayed = Number(offlineCatchUpStatus.recoveryElapsedSeconds) >= 1;
      const paused = offlineCatchUpStatus.phase === 'paused';
      const smallOnline=offlineCatchUpStatus.sessionSource==='online'&&!offlineCatchUpStatus.clockSuspended&&offlineCatchUpStatus.pendingClockSeconds<1;
      catchUpNotice.hidden = !paused && (!quiet || !delayed || smallOnline || !(offlineCatchUpStatus.pendingGameSeconds > 0) || offlineCatchUpStatus.waitingForFrame);
      rawById('show-paused-catch-up').hidden = !paused;
      rawById('convert-quiet-catch-up').hidden = paused;
      const text = rawById("catch-up-notice-text");
      if (text) text.textContent = `${offlineCatchUpStatus.sessionSource==='online'?'正在追赶在线进度':offlineCatchUpStatus.sessionSource==='offline'?'正在结算离线收益':'正在恢复游戏进度'} · 待处理 ${formatElapsedTime(offlineCatchUpStatus.pendingGameSeconds || 0)}`;
      if (text && !paused && offlineCatchUpStatus.sessionSource==='online' && offlineCatchUpStatus.clockSuspended) text.textContent += ' · 处理期间暂不新增在线时间';
      if (text && paused) text.textContent = '追赶已暂停，剩余时间已保留。';
    }
    if (offlineCompletedSummary && !settlementLocked) {
      presentOfflineSummary();
      // Small online steps still finish/acknowledge normally beneath the report.
      if (completedOnline) acknowledgeCatchUp();
      return;
    }
    if (quiet || completedOnline || (autoCloseCompleted && offlineCatchUpStatus.phase==='completed')) {
      closeOfflineProgressDialog();
      if (offlineCatchUpStatus.phase === "completed") acknowledgeCatchUp();
      return;
    }

    if (offlineCatchUpStatus.phase === "paused") {
      if (context.claimPauseNotice(offlineCatchUpStatus)) openOfflineProgressDialog();
      return;
    }
    if (offlineCatchUpStatus.phase !== "running") {
      closeOfflineProgressDialog();
      return;
    }

    const elapsedMs = Math.max(0, Date.now() - (Number(offlineCatchUpStatus.startedAt) || Date.now()));
    const delayMs = Math.max(0, offlineDialogWaitMs(offlineCatchUpStatus) - elapsedMs);
    if (shouldShowOfflineProgress(offlineCatchUpStatus)) {
      openOfflineProgressDialog();
      return;
    }
    offlineDialogDelayTimer = window.setTimeout(() => {
      offlineDialogDelayTimer = null;
      const latest = getCatchUpStatus();
      // Re-evaluate the current session: an old timer must not open a new task early.
      if (latest.phase === "running" || latest.phase === "paused") handleOfflineCatchUpStatus(latest);
    }, delayMs);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.checked = input.value === state.theme;
    });
  }

  function safeOperationNotice(message) {
    try { showNotice(message,6000); } catch(error) { WIS.Core.Save.diagnose("notice",error); }
  }

  function performSavedAction(action, update, afterCommit) {
    const storage=WIS.Core.Save;
    let before=null;
    try {before=JSON.stringify(WIS.Core.State.toSerializable(state));} catch(error) {storage.diagnose("operation-snapshot",error);}
    let committed;
    try {committed=action();} catch(error) {
      storage.diagnose("operation",error);
      let unchanged=false;
      try {unchanged=before!==null && before===JSON.stringify(WIS.Core.State.toSerializable(state));} catch(_) {}
      if (!unchanged) storage.noteFailure(error,"操作异常，无法确认是否完整提交；请勿重复购买或刷新，请先导出当前进度。");
      safeOperationNotice(unchanged ? "购买失败，资源未扣除。" : "操作异常，状态可能已变化，不能确认购买未生效。请勿重复操作。");
      return false;
    }
    if (!committed) return false;
    storage.markPending();
    let updateError=null;
    try {afterCommit?.();context.completePlayerAction();} catch(error) {updateError=error;storage.diagnose("post-commit",error);}
    const revision=storage.status().revision;
    try {saveState();} catch(error) {
      storage.noteFailure(error,"购买已生效，但保存失败。请勿刷新或关闭页面。");
    }
    const saved=storage.status().revision>revision;
    try {update();render({forceGlobal:true,forcePage:true});} catch(error) {updateError=error;storage.diagnose("operation-ui",error);}
    if (updateError) safeOperationNotice(saved ? "进度已保存，界面更新失败。" : "购买已生效，界面更新失败；保存尚未确认，请勿刷新或关闭页面。");
    return true;
  }

  function renderSaveStatus(status=WIS.Core.Save.status()) {
    byId("save-failure-panel").hidden=!status.unsaved;
    byId("save-failure-message").textContent=status.message;
  }

  function exportSave() {
    const payload = WIS.Core.Save.envelope(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    anchor.href = url;
    anchor.download = `WIS-存档-${timestamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    safeOperationNotice("已生成当前进度备份并请求下载，请确认浏览器下载结果；这不会恢复浏览器自动保存。");
  }

  async function importSave(file) {
    if (importSave.pending) { showNotice("正在导入，请等待当前操作完成。"); return; }
    importSave.pending = true;
    let previous = null, switched = false;
    const previousSummary = offlineCompletedSummary;
    try {
      const parsed = JSON.parse(await file.text());
      const prepared = WIS.Core.Save.prepare(parsed);
      // Validation and migration have no access to the current task queue.
      // Backup must succeed before switching either progress or offline debt.
      previous = context.captureImportState();
      WIS.Core.Save.backup(state);
      switched = true;
      offlineCompletedSummary = null;
      cancelCatchUp();
      runtime.setState(prepared.state);
      WIS.Meta.TreasureProgress.ensure(runtime.getState());
      achievementPresentation.reset();
      WIS.Core.Save.acceptLoaded();
      configureBuildControlledUI();
      runtime.call("resetTransientAccumulators");
      markCostGroupsDirty();
      markAchievementsDirty();
      markGlobalDirty();
      markPagesDirty();
      const previousAchievements = achievementStates();
      const restoredRecovery = context.restoreOfflineRecovery?.(prepared.offlineRecovery);
      const offlineReport = await simulateOfflineProgress(
        restoredRecovery ? 0 : Math.max(0, Date.now() - state.lastUpdateAt) / 1000
      );
      setLastTickAt(Date.now());
      context.completePlayerAction();
      saveState();
      applyTheme();
      if ((activePage === "upgrades" && !upgradesUnlocked()) ||
          (activePage === "achievements" && !achievementsUnlocked()) ||
          (activePage === "cultivation" && !cultivationUnlocked()) ||
          (activePage === "treasures" && !treasuresUnlocked()) ||
          (activePage === "challenges" && !challengesUnlocked()) ||
          (activePage === "statistics" && !statisticsUnlocked())) {
        switchPage("actions");
      }
      render({ forceGlobal: true, forcePage: true });
      byId("settings-dialog").close();
      showNotice("存档已导入");
      if (context.getCatchUpStatus?.()?.phase !== "paused") notifyNewAchievements(previousAchievements);
      if (offlineReport) window.setTimeout(() => showNotice(offlineReport, 6000), 1500);
    } catch (error) {
      if (switched) {
        offlineCompletedSummary = previousSummary;
        context.restoreImportState(previous);
        achievementPresentation.reset();
      }
      showNotice(`导入失败，原进度和待结算时间已保留：${error.message || error}`);
    } finally { importSave.pending = false; }
  }

  function resetGame() {
    if (!window.confirm("确定要清空全部游戏进度和个性化设置吗？")) return;
    offlineCompletedSummary = null;
    cancelCatchUp();
    runtime.setState(freshDefaultState());
    WIS.Meta.TreasureProgress.ensure(runtime.getState());
    context.completePlayerAction();
    achievementPresentation.reset();
    runtime.call("resetTransientAccumulators");
    markCostGroupsDirty();
    markAchievementsDirty();
    markGlobalDirty();
    markPagesDirty();
    setLastTickAt(Date.now());
    activePage = "actions";
    activeCultivationPage = "realms";
    WIS.Core.Save.remove();
    applyTheme();
    switchPage("actions");
    render({ forceGlobal: true, forcePage: true });
    saveState();
    byId("settings-dialog").close();
    showNotice("游戏已重置");
  }

  function showNotice(message, duration = 1400) {
    if (WIS.Core.Runtime.isProjection()) return;
    const notice = byId("notice");
    notice.textContent = message;
    notice.classList.add("show");
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => notice.classList.remove("show"), duration);
  }

  function showAchievementNotice(names) {
    if (WIS.Core.Runtime.isProjection()) return;
    const batch = [...new Set(names.filter(Boolean))];
    if (batch.length === 0) return;
    achievementNoticeQueue.push(batch);
    if (achievementNoticeActive) return;

    const showNextAchievementNotice = () => {
      const nextBatch = achievementNoticeQueue.shift();
      if (!nextBatch) {
        achievementNoticeActive = false;
        return;
      }
      achievementNoticeActive = true;
      const notice = rawById("achievement-notice");
      rawById("achievement-notice-name").textContent = nextBatch.join("、");
      notice.classList.add("show");
      window.setTimeout(() => {
        notice.classList.remove("show");
        window.setTimeout(showNextAchievementNotice, 120);
      }, 2800);
    };
    showNextAchievementNotice();
  }

  function showScaleNotice(names) {
    if (WIS.Core.Runtime.isProjection()) return;
    const notice = byId("scale-notice");
    byId("scale-notice-name").textContent = names.join(" → ");
    notice.classList.add("show");
    window.clearTimeout(scaleNoticeTimer);
    scaleNoticeTimer = window.setTimeout(() => notice.classList.remove("show"), 2800);
  }

  function switchCultivationPage(pageName) {
    if (state.cultivation.active !== "immortal" || !["realms", "abilities"].includes(pageName)) return;
    activeCultivationPage = pageName;
    renderCultivationPage();
    structuralPages.add("cultivation");
    dirtyCostGroupPages.add("cultivation");
    runtime.call("renderImmediately", "cultivation");
  }

  function renderCultivationPage() {
    document.querySelectorAll("[data-cultivation-page]").forEach((button) => {
      const active = button.dataset.cultivationPage === activeCultivationPage;
      toggleClassIfChanged(button, "active", active);
      button.setAttribute("aria-selected", String(active));
    });
    toggleClassIfChanged(byId("immortal-realms-panel"), "active", activeCultivationPage === "realms");
    toggleClassIfChanged(byId("immortal-abilities-panel"), "active", activeCultivationPage === "abilities");
  }

  function switchPage(pageName) {
    if (pageName === "upgrades" && !upgradesUnlocked()) {
      showNotice("达成「战力 1」后解锁强化");
      return;
    }
    if (pageName === "achievements" && !achievementsUnlocked()) {
      showNotice("获得战力后解锁成就");
      return;
    }
    if (pageName === "cultivation" && !cultivationUnlocked()) {
      showNotice("达成「爆墙」后解锁体系");
      return;
    }
    if (pageName === "treasures" && !treasuresUnlocked()) {
      showNotice("达成「爆屋」后解锁宝物");
      return;
    }
    if (pageName === "challenges" && !challengesUnlocked()) {
      showNotice("达成「爆楼」后解锁挑战");
      return;
    }
    if (pageName === "statistics" && !statisticsUnlocked()) {
      showNotice("游戏时间达到10 分钟后解锁统计");
      return;
    }

    activePage = pageName;
    structuralPages.add(pageName);
    if (pageName === "achievements") ensureAchievementCards();
    if (pageName === "cultivation") ensureAdvancedRealmAbilityGroups();
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === pageName);
    });
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === `${pageName}-page`);
    });
    runtime.call("renderImmediately", pageName);
  }

  function updateNavigation() {
    const entries = [
      [document.querySelector('[data-page="upgrades"]'), upgradesUnlocked()],
      [document.querySelector('[data-page="cultivation"]'), cultivationUnlocked()],
      [document.querySelector('[data-page="treasures"]'), treasuresUnlocked()],
      [document.querySelector('[data-page="challenges"]'), challengesUnlocked()],
      [document.querySelector('[data-page="achievements"]'), achievementsUnlocked()],
      [document.querySelector('[data-page="statistics"]'), statisticsUnlocked()]
    ];

    entries.forEach(([button, unlocked]) => {
      setHiddenIfChanged(button, !unlocked);
    });
  }

  function updateOneTimeUpgrade(rowId, buttonId, purchased, affordable) {
    const row = byId(rowId);
    const button = byId(buttonId);
    toggleClassIfChanged(row, "purchased", purchased);
    setTextIfChanged(button, purchased ? "已升级" : "升级");
    setDisabledIfChanged(button, purchased || !affordable);
  }

  function updateOneTimeUnlock(rowId, buttonId, unlocked, affordable) {
    const row = byId(rowId);
    const button = byId(buttonId);
    toggleClassIfChanged(row, "purchased", unlocked);
    setTextIfChanged(button, unlocked ? "已解锁" : "解锁");
    setDisabledIfChanged(button, unlocked || !affordable);
  }

  function updateSortCost(rowId, cost, completed = false) {
    const row = byId(rowId);
    if (!row) return;
    row.dataset.sortCost = String(completed ? Number.MAX_SAFE_INTEGER : cost);
  }

  function markPagesDirty(pageNames = PAGE_NAMES) {
    if (WIS.Core.Runtime.isProjection()) return;
    const names = Array.isArray(pageNames) ? pageNames : [pageNames];
    names.forEach((pageName) => { dirtyPages.add(pageName); structuralPages.add(pageName); });
  }

  function markGlobalDirty() {
    if (WIS.Core.Runtime.isProjection()) return;
    globalDirty = true;
  }

  function markCurrentPageDirty() {
    if (WIS.Core.Runtime.isProjection()) return;
    dirtyPages.add(activePage);
  }

  function markCostGroupsDirty(pageNames = ["upgrades", "cultivation"]) {
    if (WIS.Core.Runtime.isProjection()) return;
    const names = Array.isArray(pageNames) ? pageNames : [pageNames];
    names.forEach((pageName) => {
      dirtyCostGroupPages.add(pageName);
      structuralPages.add(pageName);
      dirtyPages.add(pageName);
    });
  }

  function sortCostGroups() {
    if (!dirtyCostGroupPages.has(activePage)) return;
    WIS.UI.Cards.sortByCost(rawById(`${activePage}-page`));
    dirtyCostGroupPages.delete(activePage);
  }

  function markAchievementsDirty() {
    if (WIS.Core.Runtime.isProjection()) return;
    achievementsDirty = true;
    dirtyPages.add("achievements");
  }

  function ensureAchievementCards() {
    const container = rawById("achievement-list");
    if (achievementCardsCreated || container.children.length > 0) {
      achievementCardsCreated = true;
      return;
    }
    WIS.UI.Cards.renderAchievementCards(container, achievementDefinitions());
    achievementCardsCreated = true;
  }

  const advancedAbilityBindings = [];

  function registerAdvancedAbilityBinding(id, key, action) {
    advancedAbilityBindings.push({ id, key, action });
  }

  function bindCreatedAdvancedAbilityButtons() {
    advancedAbilityBindings.forEach(({ id, key, action }) => {
      const button = rawById(id);
      if (!button || button.dataset.lazyBound === "true") return;
      button.dataset.lazyBound = "true";
      bindHoldButton(id, () => recordManualProgress(manualImmortalAbilityHistory, key, action));
    });
  }

  function ensureAdvancedRealmAbilityGroups() {
    const container = rawById("advanced-realm-ability-groups");
    if (!container) return false;
    const requiredRealms = advancedRealmAbilityIndexesForLevel(state.advancedRealmLevel, ADVANCED_REALMS.length)
      .map((index) => ADVANCED_REALMS[index])
      .filter((realm) => !rawById(`${realm.slug}-abilities`));
    if (requiredRealms.length === 0) {
      bindCreatedAdvancedAbilityButtons();
      return false;
    }
    const markup = requiredRealms.map((realm) => {
      const index = ADVANCED_REALMS.indexOf(realm);
      const nextRealm = ADVANCED_REALMS[index + 1];
      const voidRefinementAbilities = realm.key === "voidRefinement" ? `
            <article class="item-row purchased" id="enhanced-minor-tribulation-ability" data-sort-cost="0">
              <div class="item-content"><h2>强化小天劫</h2><p>炼虚自带。沿用当前小天劫负荷门槛；探寻法力基础指数降至0.92，战力区域常驻指数降至0.99。触发时仅削弱本次探寻，最低指数为0.80。</p></div>
              <div class="purchase-control"><span id="enhanced-minor-tribulation-preview">等待炼虚</span><button class="primary-button" type="button" disabled>炼虚自带</button></div>
            </article>
            <article class="item-row" id="brahma-demon-art-ability" data-sort-cost="100000000000000">
              <div class="item-content"><h2>梵圣真魔功</h2><p>每秒获得健身最终来源300%的独立战力来源。</p></div>
              <div class="purchase-control"><span id="brahma-demon-art-preview">解锁后：基础来源 +0 战力/秒；当前实际：+0 战力/秒</span><small>消耗 1e14 法力</small><button id="unlock-brahma-demon-art" class="primary-button" type="button">解锁</button></div>
            </article>
            <article class="item-row" id="true-spirit-transformation-ability" data-sort-cost="50000000000000">
              <div class="item-content"><h2>真灵变</h2><p>可升5级，每级使全部法力获取倍率增加0.6，本能力内部加算。</p></div>
              <div class="purchase-control"><span id="true-spirit-transformation-preview">当前：0/5级；法力获取倍率 ×1.00</span><small id="true-spirit-transformation-cost">消耗 5e13 法力</small><button id="unlock-true-spirit-transformation" class="primary-button" type="button">升级</button></div>
            </article>
            <article class="item-row" id="silver-tadpole-script-ability" data-sort-cost="500000000000000">
              <div class="item-content"><h2>银蝌文</h2><p>使小天劫负荷门槛由150提高至1500，并使探寻法力在小天劫结算前 ^1.06。</p></div>
              <div class="purchase-control"><span id="silver-tadpole-script-preview">解锁后：小天劫门槛 150 → 1500；探寻法力 ^1.06</span><small>消耗 5e14 法力</small><button id="unlock-silver-tadpole-script" class="primary-button" type="button">解锁</button></div>
            </article>
            <article class="item-row" id="void-refining-to-qi-ability" data-sort-cost="800000000000000">
              <div class="item-content"><h2>炼虚为气</h2><p>使完整吐纳来源^1.06。</p></div>
              <div class="purchase-control"><span id="void-refining-to-qi-preview">解锁后：吐纳来源 ^1.06</span><small>消耗 8e14 法力</small><button id="unlock-void-refining-to-qi" class="primary-button" type="button">解锁</button></div>
            </article>
            <article class="item-row" id="immortal-realm-divine-ability" data-sort-cost="1200000000000000">
              <div class="item-content"><h2>仙界神通</h2><p>根据当前 J提供独立吐纳来源倍率。</p></div>
              <div class="purchase-control"><span id="immortal-realm-divine-preview">解锁后：吐纳法力获取倍率 ×1</span><small>消耗 1.2e15 法力</small><button id="unlock-immortal-realm-divine" class="primary-button" type="button">解锁</button></div>
            </article>
            <article class="item-row" id="spirit-refining-art-ability" data-sort-cost="2000000000000000">
              <div class="item-content"><h2>炼神术</h2><p>使当前法力提供的 J 来源额外 ^1.06。</p></div>
              <div class="purchase-control"><span id="spirit-refining-art-preview">解锁后：法力 J 来源 ^1.06</span><small>消耗 2e15 法力</small><button id="unlock-spirit-refining-art" class="primary-button" type="button">解锁</button></div>
            </article>` : "";
      const bodyIntegrationAbilities = realm.key === "bodyIntegration" ? `
            <article class="item-row" id="perfected-technique-ability" data-sort-cost="${PERFECTED_TECHNIQUE_COST}"><div class="item-content"><h2>功法大成</h2><p>使周天最终比例 ×1.5。</p></div><div class="purchase-control"><span id="perfected-technique-preview">解锁后：周天比例 ×1.5</span><small>消耗 ${formatCost(PERFECTED_TECHNIQUE_COST)} 法力</small><button id="unlock-perfected-technique" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="heaven-earth-aura-ability" data-sort-cost="${HEAVEN_EARTH_AURA_COST}"><div class="item-content"><h2>天地元气</h2><p>使吐纳 J 曲线指数 +0.25。</p></div><div class="purchase-control"><span id="heaven-earth-aura-preview">解锁后：吐纳 J 曲线指数 +0.25</span><small>消耗 ${formatCost(HEAVEN_EARTH_AURA_COST)} 法力</small><button id="unlock-heaven-earth-aura" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="divine-ability-mastery-ability" data-sort-cost="${DIVINE_ABILITY_MASTERY_COST}"><div class="item-content"><h2>神通通神</h2><p>使全部法力获取倍率 ×2.5。</p></div><div class="purchase-control"><span id="divine-ability-mastery-preview">解锁后：全部法力 ×2.5</span><small>消耗 ${formatCost(DIVINE_ABILITY_MASTERY_COST)} 法力</small><button id="unlock-divine-ability-mastery" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="dual-infant-unity-ability" data-sort-cost="${DUAL_INFANT_UNITY_COST}"><div class="item-content"><h2>双婴合一</h2><p>使周天法力来源 ^1.08。</p></div><div class="purchase-control"><span id="dual-infant-unity-preview">解锁后：周天法力来源 ^1.08</span><small>消耗 ${formatCost(DUAL_INFANT_UNITY_COST)} 法力</small><button id="unlock-dual-infant-unity" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="aura-into-body-ability" data-sort-cost="${AURA_INTO_BODY_COST}"><div class="item-content"><h2>元气入体</h2><p>使健身 J 来源 ×20，并提高40级健身上限。</p></div><div class="purchase-control"><span id="aura-into-body-preview">解锁后：健身 J ×20；健身上限 +40</span><small>消耗 ${formatCost(AURA_INTO_BODY_COST)} 法力</small><button id="unlock-aura-into-body" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="external-incarnation-ability" data-sort-cost="${EXTERNAL_INCARNATION_COST}"><div class="item-content"><h2>身外化身</h2><p>使梵圣真魔功的独立战力来源 ×5。</p></div><div class="purchase-control"><span id="external-incarnation-preview">解锁后：梵圣真魔功 ×5</span><small>消耗 ${formatCost(EXTERNAL_INCARNATION_COST)} 法力</small><button id="unlock-external-incarnation" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="demon-realm-journey-ability" data-sort-cost="${DEMON_REALM_JOURNEY_COST}"><div class="item-content"><h2>魔界之游</h2><p>使普通探寻法力来源 ×5，并使仙道宝物进度获取倍率 ×3。</p></div><div class="purchase-control"><span id="demon-realm-journey-preview">解锁后：普通探寻 ×5；仙道宝物进度获取 ×3</span><small>消耗 ${formatCost(DEMON_REALM_JOURNEY_COST)} 法力</small><button id="unlock-demon-realm-journey" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="return-to-origin-ability" data-sort-cost="${RETURN_TO_ORIGIN_COST}"><div class="item-content"><h2>返本归元</h2><p>使 J 区域结果 ^1.02。</p></div><div class="purchase-control"><span id="return-to-origin-preview">解锁后：J 区域 ^1.02</span><small>消耗 ${formatCost(RETURN_TO_ORIGIN_COST)} 法力</small><button id="unlock-return-to-origin" class="primary-button" type="button">解锁</button></div></article>` : "";
      const mahayanaAbilities = realm.key === "mahayana" ? `
            <article class="item-row" id="natal-magic-treasure-ability" data-sort-cost="${NATAL_MAGIC_TREASURE_COST}"><div class="item-content"><h2>本命法宝</h2><p>将法宝法力曲线的前期边际由0.65提高至0.80，并随法力提高平滑衰减至后期边际0.76。</p></div><div class="purchase-control"><span id="natal-magic-treasure-preview">解锁后：前期边际 ^0.80，平滑衰减至 ^0.76</span><small>消耗 ${formatCost(NATAL_MAGIC_TREASURE_COST)} 法力</small><button id="unlock-natal-magic-treasure" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="perfected-technique-completion-ability" data-sort-cost="${PERFECTED_TECHNIQUE_COMPLETION_COST}"><div class="item-content"><h2>功法圆满</h2><p>使周天最终比例 ×1.5。</p></div><div class="purchase-control"><span id="perfected-technique-completion-preview">解锁后：周天比例 ×1.5</span><small>消耗 ${formatCost(PERFECTED_TECHNIQUE_COMPLETION_COST)} 法力</small><button id="unlock-perfected-technique-completion" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="roam-spirit-world-ability" data-sort-cost="${ROAM_SPIRIT_WORLD_COST}"><div class="item-content"><h2>纵横灵界</h2><p>每秒获得当前一次完整探寻收益的0.02%，包括法力、有效探寻量与宝物判定，不消耗战力。</p></div><div class="purchase-control"><span id="roam-spirit-world-preview">解锁后：每5000秒等效完成1次当前探寻</span><small>消耗 ${formatCost(ROAM_SPIRIT_WORLD_COST)} 法力</small><button id="unlock-roam-spirit-world" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="descend-realm-ability" data-sort-cost="${DESCEND_REALM_COST}"><div class="item-content"><h2>降界</h2><p>根据当前战力提高仙道宝物进度获取倍率，最高 ×10。</p></div><div class="purchase-control"><span id="descend-realm-preview">解锁后：仙道宝物进度获取随战力提高</span><small>消耗 ${formatCost(DESCEND_REALM_COST)} 法力</small><button id="unlock-descend-realm" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="mystic-heavenly-treasure-ability" data-sort-cost="${MYSTIC_HEAVENLY_TREASURE_COSTS[0]}"><div class="item-content"><h2>玄天灵宝</h2><p>可升3级，依次解锁永久烙印：仙道·幻天镜、仙道·玄天圣树、仙道·玄天斩灵剑。</p></div><div class="purchase-control"><span id="mystic-heavenly-treasure-level">当前：0/3级</span><small id="mystic-heavenly-treasure-cost">消耗 ${formatCost(MYSTIC_HEAVENLY_TREASURE_COSTS[0])} 法力</small><button id="buy-mystic-heavenly-treasure" class="primary-button" type="button">升级</button></div></article>
            <article class="item-row" id="nascent-soul-completion-ability" data-sort-cost="${NASCENT_SOUL_COMPLETION_COST}"><div class="item-content"><h2>元婴大成</h2><p>使周天法力来源额外 ^1.08。</p></div><div class="purchase-control"><span id="nascent-soul-completion-preview">解锁后：周天法力来源 ^1.08</span><small>消耗 ${formatCost(NASCENT_SOUL_COMPLETION_COST)} 法力</small><button id="unlock-nascent-soul-completion" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="spirit-travel-void-ability" data-sort-cost="${SPIRIT_TRAVEL_VOID_COST}"><div class="item-content"><h2>神游太虚</h2><p>将强化小天劫负荷门槛由1500提高至150000。</p></div><div class="purchase-control"><span id="spirit-travel-void-preview">解锁后：强化小天劫门槛 1500 → 150000</span><small>消耗 ${formatCost(SPIRIT_TRAVEL_VOID_COST)} 法力</small><button id="unlock-spirit-travel-void" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="golden-seal-script-ability" data-sort-cost="${GOLDEN_SEAL_SCRIPT_COST}"><div class="item-content"><h2>金篆文</h2><p>使法力区域获取倍率 ×8。</p></div><div class="purchase-control"><span id="golden-seal-script-preview">解锁后：法力区域 ×8</span><small>消耗 ${formatCost(GOLDEN_SEAL_SCRIPT_COST)} 法力</small><button id="unlock-golden-seal-script" class="primary-button" type="button">解锁</button></div></article>` : "";
      const trueImmortalAbilities = realm.key === "trueImmortal" ? `
            <article class="item-row purchased" id="ascend-immortal-world-ability" data-sort-cost="0"><div class="item-content"><h2>飞升仙界</h2><p>真仙自带。小天劫完全失效并清空负荷；仙道宝物进度获取倍率 ×3。</p></div><div class="purchase-control"><span id="ascend-immortal-world-preview">等待真仙</span><button class="primary-button" type="button" disabled>真仙自带</button></div></article>
            <article class="item-row" id="immortal-spirit-power-ability" data-sort-cost="0"><div class="item-content"><h2>仙灵力</h2><p>根据当前法力自动获得仙灵力，不消耗法力。</p></div><div class="purchase-control"><span id="immortal-spirit-power-preview">等待真仙</span><small>费用：免费</small><button id="immortal-spirit-power-state" class="primary-button" type="button" disabled>等待真仙</button></div></article>
            <article class="item-row" id="undying-primordial-spirit-ability" data-sort-cost="${UNDYING_PRIMORDIAL_SPIRIT_COST}"><div class="item-content"><h2>不灭元神</h2><p>使周天法力来源额外 ^1.03。</p></div><div class="purchase-control"><span id="undying-primordial-spirit-preview">解锁后：周天法力来源 ^1.03</span><small>消耗 ${formatCost(UNDYING_PRIMORDIAL_SPIRIT_COST)} 仙灵力</small><button id="unlock-undying-primordial-spirit" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="immortal-aperture-ability" data-sort-cost="${IMMORTAL_POWER_CONFIG.immortalAperture.baseCost}"><div class="item-content"><h2>仙窍</h2><p>可升36级；每级使仙灵力 ×1.10，每6级额外 ×1.25。</p></div><div class="purchase-control"><span id="immortal-aperture-level">当前：0/36级</span><small id="immortal-aperture-cost">消耗 ${formatCost(IMMORTAL_POWER_CONFIG.immortalAperture.baseCost)} 仙灵力</small><button id="buy-immortal-aperture" class="primary-button" type="button">升级</button></div></article>
            <article class="item-row" id="xuan-immortal-body-ability" data-sort-cost="${XUAN_IMMORTAL_BODY_COST}"><div class="item-content"><h2>玄仙之躯</h2><p>使梵圣真魔功最终独立来源 ^1.40。</p></div><div class="purchase-control"><span id="xuan-immortal-body-preview">解锁后：梵圣真魔功 ^1.40</span><small>消耗 ${formatCost(XUAN_IMMORTAL_BODY_COST)} 仙灵力</small><button id="unlock-xuan-immortal-body" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="law-ability" data-sort-cost="${LAW_COST}"><div class="item-content"><h2>法则</h2><p>原始指数由法则之丝、法则亲和强化；随法力提高平滑衰减，极高法力时趋近 ^0.80。</p></div><div class="purchase-control"><span id="law-preview">解锁后：根据法力提高仙灵力</span><small>消耗 ${formatCost(LAW_COST)} 仙灵力</small><button id="unlock-law" class="primary-button" type="button">解锁</button></div></article>` : "";
      const goldenImmortalAbilities = realm.key === "goldenImmortal" ? `
            <article class="item-row" id="immortal-aperture-ii-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureII}"><div class="item-content"><h2>仙窍Ⅱ</h2><p>将仙窍等级上限由36提高至60。</p></div><div class="purchase-control"><span>仙窍上限 36 → 60</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureII)} 仙灵力</small><button id="unlock-immortal-aperture-ii" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="spirit-domain-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.spiritDomain}"><div class="item-content"><h2>灵域</h2><p>根据当前仙灵力形成独立J来源，正常经过J区域结算。</p></div><div class="purchase-control"><span id="spirit-domain-preview">解锁后：独立来源 +0 J/秒</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.spiritDomain)} 仙灵力</small><button id="unlock-spirit-domain" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="threads-of-law-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.threadsOfLaw}"><div class="item-content"><h2>法则之丝</h2><p>使法则原始指数 ×1.10（2.00 → 2.20），实际指数仍按法力动态衰减。</p></div><div class="purchase-control"><span>法则原始指数 ×1.10</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.threadsOfLaw)} 仙灵力</small><button id="unlock-threads-of-law" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="immortal-aperture-iii-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureIII}"><div class="item-content"><h2>仙窍Ⅲ</h2><p>拥有仙窍Ⅱ后，将仙窍等级上限由60提高至84。</p></div><div class="purchase-control"><span>仙窍上限 60 → 84</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureIII)} 仙灵力</small><button id="unlock-immortal-aperture-iii" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="spirit-capture-return-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.spiritCaptureReturn}"><div class="item-content"><h2>摄灵返源</h2><p>根据当前仙灵力提供×1～×3仙灵力倍率。</p></div><div class="purchase-control"><span id="spirit-capture-return-preview">解锁后：仙灵力 ×1.000</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.spiritCaptureReturn)} 仙灵力</small><button id="unlock-spirit-capture-return" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="indestructible-dharma-body-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.indestructibleDharmaBody}"><div class="item-content"><h2>法体不灭</h2><p>仅使梵圣真魔功独立来源 ^1.55。</p></div><div class="purchase-control"><span>梵圣真魔功来源 ^1.55</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.indestructibleDharmaBody)} 仙灵力</small><button id="unlock-indestructible-dharma-body" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="five-elements-treasure-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.fiveElementsTreasure}"><div class="item-content"><h2>五行至宝</h2><p>解锁对应能力后，实际获取仙灵力期间积累进度，达到需求获得宝物。</p></div><div class="purchase-control"><span>基础进度 1/有效秒；初始需求 50</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.fiveElementsTreasure)} 仙灵力</small><button id="unlock-five-elements-treasure" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="immortal-aperture-iv-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureIV}"><div class="item-content"><h2>仙窍Ⅳ</h2><p>拥有仙窍Ⅲ后，将仙窍等级上限由84提高至108。</p></div><div class="purchase-control"><span>仙窍上限 84 → 108</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureIV)} 仙灵力</small><button id="unlock-immortal-aperture-iv" class="primary-button" type="button">解锁</button></div></article>` : "";
      const taiyiAbilities = realm.key === "taiyi" ? `
            <article class="item-row" id="immortal-aperture-v-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureV}"><div class="item-content"><h2>仙窍Ⅴ</h2><p>拥有仙窍Ⅳ后，将仙窍等级上限由108提高至192，并启用109级后的新收益与费用曲线。</p></div><div class="purchase-control"><span>仙窍上限 108 → 192</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureV)} 仙灵力</small><button id="unlock-immortal-aperture-v" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="law-affinity-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.lawAffinity}"><div class="item-content"><h2>法则亲和</h2><p>拥有法则之丝后，再使法则原始指数 ×1.10；合计为2.42，实际指数仍动态衰减。</p></div><div class="purchase-control"><span>法则原始指数再次 ×1.10</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.lawAffinity)} 仙灵力</small><button id="unlock-law-affinity" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="flawless-jade-body-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.flawlessJadeBody}"><div class="item-content"><h2>无瑕玉体</h2><p>削弱天人五衰50%。</p></div><div class="purchase-control"><span id="flawless-jade-body-preview">五衰损失减半</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.flawlessJadeBody)} 仙灵力</small><button id="unlock-flawless-jade-body" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="spirit-domain-world-transformation-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.spiritDomainWorldTransformation}"><div class="item-content"><h2>灵域化界</h2><p>拥有灵域后，使灵域独立J来源 ×100。</p></div><div class="purchase-control"><span>灵域来源 ×100</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.spiritDomainWorldTransformation)} 仙灵力</small><button id="unlock-spirit-domain-world-transformation" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="immortal-aperture-vi-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureVI}"><div class="item-content"><h2>仙窍Ⅵ</h2><p>拥有仙窍Ⅴ后，将仙窍等级上限由192提高至276。</p></div><div class="purchase-control"><span>仙窍上限 192 → 276</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureVI)} 仙灵力</small><button id="unlock-immortal-aperture-vi" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="soul-qualitative-change-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.soulQualitativeChange}"><div class="item-content"><h2>神魂质变</h2><p>吐纳来源倍率 ×[1+(当前仙灵力/1e16)^0.40]；周天仅通过吐纳来源继承一次。</p></div><div class="purchase-control"><span id="soul-qualitative-change-preview">吐纳来源 ×1.000</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.soulQualitativeChange)} 仙灵力</small><button id="unlock-soul-qualitative-change" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="immortal-aperture-vii-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureVII}"><div class="item-content"><h2>仙窍Ⅶ</h2><p>拥有仙窍Ⅵ后，将仙窍等级上限由276提高至360。</p></div><div class="purchase-control"><span>仙窍上限 276 → 360</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureVII)} 仙灵力</small><button id="unlock-immortal-aperture-vii" class="primary-button" type="button">解锁</button></div></article>` : "";
      const daluoAbilities = realm.key === "daluo" ? `
            <article class="item-row" id="trinity-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.trinity}"><div class="item-content"><h2>三位一体</h2><p>根据当前 J 提高仙灵力获取倍率。</p></div><div class="purchase-control"><span id="trinity-preview">解锁后：仙灵力 ×1.000</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.trinity)} 仙灵力</small><button id="unlock-trinity" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="unity-with-dao-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.unityWithDao}"><div class="item-content"><h2>与道合真</h2><p>根据当前仙灵力提供渐近 ^1.025 的仙灵力区域指数。</p></div><div class="purchase-control"><span id="unity-with-dao-preview">解锁后：仙灵力区域 ^1.000</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.unityWithDao)} 仙灵力</small><button id="unlock-unity-with-dao" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="law-origin-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.lawOrigin}"><div class="item-content"><h2>法则本源</h2><p>不改变法则动态指数；使最终法则倍率 ^1.20。</p></div><div class="purchase-control"><span id="law-origin-preview">解锁后：最终法则倍率 ^1.20</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.lawOrigin)} 仙灵力</small><button id="unlock-law-origin" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="law-crystal-filament-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.lawCrystalFilament}"><div class="item-content"><h2>法则晶丝</h2><p>根据当前实际法则倍率提高战力区域指数，渐近 ^1.20。</p></div><div class="purchase-control"><span id="law-crystal-filament-preview">当前法则倍率 ×1；y=0.00000；解锁后战力区域 ^1.00000；渐近上限 ^1.20</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.lawCrystalFilament)} 仙灵力</small><button id="unlock-law-crystal-filament" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="sever-three-corpses-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.severThreeCorpses}"><div class="item-content"><h2>斩三尸</h2><p>首次购买永久解锁斩恶尸、斩善尸、斩自我尸挑战。</p></div><div class="purchase-control"><span>永久开放斩三尸挑战链</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.severThreeCorpses)} 仙灵力</small><button id="unlock-sever-three-corpses" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="ultimate-immortal-aperture-ability" data-sort-cost="${ADVANCED_IMMORTAL_ABILITY_COSTS.ultimateImmortalAperture}"><div class="item-content"><h2>终极仙窍</h2><p>拥有仙窍Ⅶ后，将仙窍上限由360提高至1800；361级后启用新收益和费用曲线。</p></div><div class="purchase-control"><span>仙窍上限 360 → 1800</span><small>消耗 ${formatCost(ADVANCED_IMMORTAL_ABILITY_COSTS.ultimateImmortalAperture)} 仙灵力</small><button id="unlock-ultimate-immortal-aperture" class="primary-button" type="button">解锁</button></div></article>` : "";
      return `
        <details class="upgrade-group" id="${realm.slug}-abilities" hidden>
          <summary>
            <span><b>${realm.name}</b><small>${realm.key === "voidRefinement" ? `${nextRealm.name}瓶颈、强化小天劫、梵圣真魔功、真灵变、银蝌文、炼虚为气、仙界神通、炼神术` : realm.key === "bodyIntegration" ? `${nextRealm.name}瓶颈、功法大成、天地元气、神通通神、双婴合一、元气入体、身外化身、魔界之游、返本归元` : realm.key === "mahayana" ? `${nextRealm.name}瓶颈、本命法宝、功法圆满、纵横灵界、降界、玄天灵宝、元婴大成、神游太虚、金篆文` : realm.key === "trueImmortal" ? `天人三衰、飞升仙界、仙灵力、不灭元神、仙窍、玄仙之躯、法则` : realm.key === "goldenImmortal" ? `天人五衰、仙窍Ⅱ～Ⅳ、灵域、法则之丝、摄灵返源、法体不灭、五行至宝` : realm.key === "taiyi" ? `天人五衰、仙窍Ⅴ～Ⅶ、法则亲和、无瑕玉体、灵域化界、神魂质变` : realm.key === "daluo" ? `天人五衰、三位一体、与道合真、法则本源、法则晶丝、斩三尸、终极仙窍` : `${nextRealm.name}瓶颈`}</small></span>
          </summary>
          <div class="item-list" data-sort-by-cost>
            <article class="item-row purchased" id="${realm.slug}-bottleneck-ability" data-sort-cost="0">
              <div class="item-content">
                <h2>${realm.key === "trueImmortal" ? "天人三衰" : ["goldenImmortal", "taiyi", "daluo"].includes(realm.key) ? "天人五衰" : `${nextRealm.name}瓶颈`}</h2>
                <p>${realm.key === "trueImmortal" ? `根据当前仙灵力与${nextRealm.name}需求的进度，以不同动态指数压制法力、J与战力。突破金仙后由天人五衰接管。` : ["goldenImmortal", "taiyi"].includes(realm.key) ? `境界自动生效、无价格；已取代天人三衰，以统一指数压制法力、J、战力、宝物收益倍率与挑战奖励倍率。` : realm.key === "daluo" ? `境界自动生效、无价格；延续太乙终点指数 ^0.65，统一压制相关资源与倍率，突破道祖后完全取消。` : `法力越接近当前${nextRealm.name}实际需求，法力获取倍率下降越快；突破${nextRealm.name}后解除。`}</p>
              </div>
              <div class="purchase-control">
                <span id="${realm.slug}-bottleneck-preview">当前法力获取倍率 ×1.00</span>
                <small id="${nextRealm.slug}-bottleneck-point">拐点：当前${nextRealm.name}实际需求</small>
                <button id="${realm.slug}-bottleneck-state" class="primary-button" type="button" disabled>已生效</button>
              </div>
            </article>
            ${voidRefinementAbilities}
            ${bodyIntegrationAbilities}
            ${mahayanaAbilities}
            ${trueImmortalAbilities}
            ${goldenImmortalAbilities}
            ${taiyiAbilities}
            ${daluoAbilities}
          </div>
        </details>
      `;
    }).join("");
    const template = document.createElement("template");
    template.innerHTML = markup;
    container.appendChild(template.content);
    const spiritTransformationGroup = rawById("spirit-transformation-abilities");
    if (spiritTransformationGroup?.nextElementSibling !== container) {
      container.parentElement.insertBefore(spiritTransformationGroup, container);
    }
    markCostGroupsDirty("cultivation");
    bindCreatedAdvancedAbilityButtons();
    return true;
  }

  function renderAchievements() {
    if (!achievementsDirty) return;
    ensureAchievementCards();
    const achievements = achievementDefinitions();
    const unlockedCount = achievements.filter((achievement) => achievement.completed).length;
    achievements.forEach((achievement) => {
      const card = byId(`achievement-${achievement.key}`);
      card.classList.toggle("completed", achievement.completed);
      card.querySelector(".achievement-state").textContent = achievement.completed ? "已达成" : "未达成";
      card.hidden = state.hideUnlockedAchievements && achievement.completed;
    });
    byId("achievement-unlocked-count").textContent = String(unlockedCount);
    byId("achievement-total-count").textContent = String(achievements.length);
    const filterButton = byId("toggle-achievement-filter");
    filterButton.textContent = state.hideUnlockedAchievements ? "显示全部成就" : "隐藏已解锁成就";
    filterButton.setAttribute("aria-pressed", String(state.hideUnlockedAchievements));
    achievementsDirty = false;
  }

  function renderChallenge(challengeKey, idPrefix) {
    const challenge = CHALLENGE_DEFINITIONS[challengeKey];
    const completed = challengeCompletionCount(challengeKey);
    const finished = completed >= challenge.maxCompletions;
    const active = state.activeChallenge === challengeKey;
    const nextLimit = challenge.limitExponents?.[Math.min(completed, (challenge.limitExponents?.length ?? 1) - 1)];
    const nextSourceExponent = challenge.sourceExponents?.[Math.min(completed, (challenge.sourceExponents?.length ?? 1) - 1)];
    const rewardExponent = challengeRewardExponent(challengeKey);
    const button = byId(`toggle-${idPrefix}`);
    const card = byId(`${idPrefix}-challenge`);

    card.hidden = !challengeUnlocked(challengeKey);
    if (card.hidden) return;

    if (challengeKey === "qiRefiningHundredThousandYears") {
      const currentLayer = Math.max(1, state.currentQiLayer);
      const bestLayer = Math.max(state.bestQiLayer, active ? currentLayer : 0);
      byId(`${idPrefix}-progress`).textContent = `最高：炼气${format(bestLayer, 0)}层${finished ? "（目标已达成）" : ""}`;
      byId(`${idPrefix}-limit`).textContent = active
        ? `本轮炼气${format(currentLayer, 0)}层；下层需求 ${format(qiLayerRequirement(currentLayer + 1))} 法力`
        : `历史最高奖励只取一次；重复挑战不会叠加完成奖励`;
      byId(`${idPrefix}-reward`).textContent = `永久吐纳法力倍率 ×${format(qiChallengeReward(bestLayer))}`;
      button.textContent = active ? "退出挑战" : finished ? "重复挑战（无完成奖励）" : "开启挑战";
      button.disabled = state.activeChallenge !== null && !active;
      return;
    }

    const completedDisplay = finished && !active;

    byId(`${idPrefix}-progress`).textContent = `完成：${completed}/${challenge.maxCompletions}次`;
    const target = byId(`${idPrefix}-target`);
    if (target) {
      const targetScale = challenge.targetAdvancedRealmLevel
        ? ADVANCED_REALMS[challenge.targetAdvancedRealmLevel - 1]?.name || "指定境界"
        : SCALE_THRESHOLDS[challengeRequiredScaleIndex(challengeKey)].name;
      target.textContent = completedDisplay
        ? "全部目标已完成，可重复挑战"
        : challenge.requiresJAndPower
          ? `${active ? "本次" : "下次"}目标：J与战力均达到${targetScale}`
          : `${active ? "本次" : "下次"}目标：达到${targetScale}`;
    }
    if (challengeKey === "fiveMisfortunes") {
      const targetScale = SCALE_THRESHOLDS[challengeRequiredScaleIndex(challengeKey)].name;
      byId(`${idPrefix}-limit`).textContent = completedDisplay
        ? "全部挑战已完成"
        : `本次无法选择体系；要求达到${targetScale}`;
    } else if (challengeKey === "severEvilCorpse") {
      const minimumExponent = challenge.minimumDynamicExponent;
      const resourceExponents = [
        ["J", "joules"],
        ["战力", "power"],
        ["法力", "mana"],
        ["仙灵力", "immortalPower"]
      ].map(([name, resourceKey]) => {
        const rawExponent = WIS.Meta.Challenges.evilCorpseRawLimitExponent(state, resourceKey);
        const actualExponent = WIS.Meta.Challenges.evilCorpseAdjustedLimitExponent(state, resourceKey);
        return `${name}：原始 ^${rawExponent.toFixed(5)} → 后期下限 ^${minimumExponent.toFixed(5)} → 实际 ^${actualExponent.toFixed(5)}`;
      });
      byId(`${idPrefix}-limit`).textContent = `${active ? "当前" : "按当前资源预览"}：${resourceExponents.join("；")}`;
    } else if (challengeKey === "solarPower") {
      const jExponent = WIS.Meta.Challenges.solarPowerLimitExponent(state, "joules");
      const powerExponent = WIS.Meta.Challenges.solarPowerLimitExponent(state, "power");
      byId(`${idPrefix}-limit`).textContent = active
        ? `当前：J获取 ^${jExponent.toFixed(5)}；战力获取 ^${powerExponent.toFixed(5)}；同时受到福、禄、寿初级挑战限制`
        : "限制：对方资源越高，自身最终获取指数越低；该限制全局生效，并在对方达到恒星时降至 ^0.72。同时受到福、禄、寿初级挑战限制。";
    } else if (challengeKey === "galaxy") {
      byId(`${idPrefix}-limit`).textContent = completedDisplay
        ? "限制已克服；重复挑战时限制仍优先于完成奖励；同时受到福、禄、寿中级挑战限制"
        : "限制：根据当前J、当前战力获得收益的强化无效；固定效果不受影响；同时受到福、禄、寿中级挑战限制";
    } else if (challengeKey === "blackHole") {
      if (active) {
        const loss = blackHoleGainLossDetails();
        const jExponent = WIS.Meta.Challenges.blackHoleLimitExponent(state, "joules");
        const powerExponent = WIS.Meta.Challenges.blackHoleLimitExponent(state, "power");
        byId(`${idPrefix}-limit`).textContent = `当前：J获取 ^${jExponent.toFixed(5)}；战力获取 ^${powerExponent.toFixed(5)}；黑洞吞噬：J损失 ${format(loss.joulesLossOrders, 3)} 数量级，战力损失 ${format(loss.powerLossOrders, 3)} 数量级，L=${format(loss.lossOrders, 3)}，下一量级需求 ×${format(loss.requirementMultiplier, 3)}`;
      } else {
        byId(`${idPrefix}-limit`).textContent = "限制：J与战力从挑战开始便随自身数值提高而降低获取效率；黑洞吞噬的收益会提高当前下一量级需求";
      }
    } else if (challenge.timeToLimitSeconds) {
      const currentExponent = activeChallengeLimitExponent(challengeKey);
      byId(`${idPrefix}-limit`).textContent = completedDisplay
        ? "全部挑战已完成"
        : active
          ? `当前限制：${challenge.resourceName}获取 ^${currentExponent.toFixed(3)}（${formatElapsedTime(state.activeChallengeElapsedSeconds)} / ${formatElapsedTime(challenge.timeToLimitSeconds)}）`
          : `下次限制：${challenge.resourceName}获取指数在${formatElapsedTime(challenge.timeToLimitSeconds)}内降至 ^${nextLimit.toFixed(2)}`;
    } else if (challenge.sourceExponents) {
      byId(`${idPrefix}-limit`).textContent = completedDisplay
        ? "全部限制已克服"
        : `${active ? "当前" : "下次"}限制：${challenge.resourceName} ^${nextSourceExponent.toFixed(2)}`;
    } else if (challengeKey === "planetSuppression") {
      byId(`${idPrefix}-limit`).textContent = completedDisplay
        ? "限制已克服"
        : "限制：正常软上限结算后，追加独立的星球压制软上限";
    } else if (challengeKey === "severSelfCorpse") {
      byId(`${idPrefix}-limit`).textContent = completedDisplay
        ? "全部限制已克服"
        : `法则与法则本源失效；仙灵力额外 ^${selfCorpseImmortalPowerLimitExponent().toFixed(3)}；E=1/[1+${IMMORTAL_POWER_CONFIG.daluo.selfCorpseCoefficient.toFixed(2)}×log10(1+I/1e16)]`;
    } else {
      byId(`${idPrefix}-limit`).textContent = completedDisplay
        ? "全部限制已克服"
        : `${active ? "当前" : "下次"}限制：${challenge.resourceName}获取 ^${nextLimit.toFixed(2)}`;
    }
    const reward = byId(`${idPrefix}-reward`);
    if (reward) {
      reward.textContent = challengeKey === "solarPower"
        ? completed > 0
          ? `当前奖励：J区域 ^${WIS.Core.Effects.value("solarPowerJReward", state).toFixed(5)}；战力区域 ^${WIS.Core.Effects.value("solarPowerPowerReward", state).toFixed(5)}（对方达到恒星时 ^1.12，之后缓慢趋近 ^1.20）`
          : "奖励·阴阳相生：根据对方当前资源永久提高获取指数，从 ^1.04 起步，对方达到恒星时为 ^1.12，之后缓慢趋近 ^1.20"
        : challengeKey === "galaxy"
          ? "奖励：所有接入动态读取的当前J、战力分别视为 J^1.10、战力^1.10"
        : challengeKey === "blackHole"
          ? completed > 0
            ? "奖励已生效：超星系团之后的量级需求按相对跨度 ^0.95 压缩"
            : "奖励：降低超星系团之后的量级突破需求"
        : challengeKey === "severEvilCorpse"
        ? `当前奖励：仙灵力 ×${WIS.Core.Effects.value("severEvilReward", state).toFixed(3)}`
        : challengeKey === "severGoodCorpse"
          ? `当前奖励：仙灵力区域 ^${completed > 0 ? Number(challenge.rewardExponents[0]).toFixed(3) : "1.000"}`
          : challengeKey === "severSelfCorpse"
            ? "奖励：永久取得突破道祖资格"
            : challengeKey === "planetSuppression"
              ? completed > 0
                ? `当前奖励：J区域 ^${WIS.Core.Effects.value("planetSuppressionJReward", state).toFixed(5)}；战力区域 ^${WIS.Core.Effects.value("planetSuppressionPowerReward", state).toFixed(5)}`
                : "奖励：受到软上限时，按损失的10%强化J与战力区域指数"
            : challengeKey === "longevity"
        ? `当前奖励：J与战力获取 ×${format(longevityChallengeRewardMultiplier(), 0)}`
        : challengeKey === "fiveMisfortunes"
          ? `当前奖励：选择体系前J与战力获取 ^${rewardExponent.toFixed(2)}`
          : `当前奖励：${challenge.rewardSourceName}来源 ^${rewardExponent.toFixed(2)}`;
    }
    button.textContent = active ? "退出挑战" : finished ? "重复挑战（无奖励）" : "开启挑战";
    button.disabled = !active && !WIS.Meta.Challenges.challengeStartable(challengeKey);
  }

  function challengeUnlocked(challengeKey) {
    return WIS.Meta.Challenges.challengeUnlocked(challengeKey);
  }

  

  function challengeRequiredScaleIndex(challengeKey) {
    return WIS.Meta.Challenges.challengeRequiredScaleIndex(challengeKey);
  }

  function advancedRealmAbilityGroupVisible(index) {
    const currentlyReached = state.goldenCoreUnlocked && state.advancedRealmLevel > index;
    const retainedAfterScatter = state.scatterRetentionLevel > 0 &&
      state.lifetimeHighestCultivationRealmLevel >= index + 4;
    return currentlyReached || retainedAfterScatter;
  }

  function renderChallenges() {
    xiuzhenPage.renderChallenges();
    byId("challenge-active-state").textContent = state.activeChallenge
      ? `当前挑战：${CHALLENGE_DEFINITIONS[state.activeChallenge].name}`
      : "当前未进行挑战";
    renderChallenge("innateDeficiency", "innate-deficiency");
    renderChallenge("powerless", "powerless");
    renderChallenge("longevity", "longevity");
    renderChallenge("fiveMisfortunes", "five-misfortunes");
    renderChallenge("completeRealm", "complete-realm");
    renderChallenge("moonless", "moonless");
    renderChallenge("planetSuppression", "planet-suppression");
    renderChallenge("severEvilCorpse", "sever-evil-corpse");
    renderChallenge("severGoodCorpse", "sever-good-corpse");
    renderChallenge("severSelfCorpse", "sever-self-corpse");
    renderChallenge("solarPower", "solar-power");
    renderChallenge("galaxy", "galaxy");
    renderChallenge("blackHole", "black-hole");
    renderChallenge("qiRefiningHundredThousandYears", "qi-refining-hundred-thousand-years");
    WIS.UI.Cards.updateCatalogGroupCounts(byId("challenge-list"), "挑战");
  }

  function renderResourceDebugPanel() { return false; }

  function renderAdditionalResources() {
    const M = WIS.Meta.BigNumbers, X = WIS.Cultivation.Xiuzhen;
    const big = M.get(state), requirements = M.requirements(state);
    const bigVisible = big.unlocked || (requirements.cosmic && requirements.achievement);
    setHiddenIfChanged(byId("big-number-resource"), !bigVisible);
    if (bigVisible) {
      const v = M.view(state), order = v.dominantOrder;
      const f = value => gtBN(value, ZERO) && !gteBN(value, 0.001)
        ? BN(value).toExponential(3) : format(value, 4);
      setTextIfChanged(byId("big-number-dominant"), v.gIndex > 0
        ? `G${v.gIndex}` : `${f(v.amounts[order])} ${v.symbols[order]}`);
      setTextIfChanged(byId("big-number-rate"), v.gIndex > 0
        ? `超分形 ${f(v.progress)}% · +${f(v.speed)}%/秒`
        : `（+${f(v.rates[order])}/秒）`);
    }
    const n = X.get(state), active = immortalCultivationActive() && X.available(state);
    const status=getCatchUpStatus();
    // Ordinary short online work is not a recovery session. Completed reports
    // may retain blocking presentation, so remaining debt is also required.
    const recovering=status.pendingGameSeconds>0 && (status.presentation==="blocking" || status.offlinePendingGameSeconds>0);
    const paused = status.phase === "paused";
    const settlement = state.core.runtime.lastSettlement;
    for (const key of X.resourceKeys) {
      const visible = active && (n.abilities[key] || n.realm >= (key === "xianForce" ? 2 : 3));
      setHiddenIfChanged(byId(key + "-resource"), !visible);
      if (visible) {
        setTextIfChanged(byId(key), format(X.amount(state, key)));
        // All registered resource rates are published by the existing committed
        // step. Presentation must not run another Xiuzhen/Effects evaluation.
        const rate = WIS.tmp.rates[key + "PerSecond"] ??
          (settlement?.seconds > 0 && settlement.gains?.[key] != null
            ? divBN(settlement.gains[key], settlement.seconds) : null);
        setTextIfChanged(byId(key + "-rate"), paused ? "结算暂停"
          : status.clockSuspended || recovering ? "（离线结算中）"
          : document.hidden ? "当前产出暂不展示"
          : rate == null ? "尚无结算速率" : `（+${format(rate)}/秒）`);
      }
    }
    setHiddenIfChanged(byId("special-resources"), ["mana", "immortal-power", ...X.resourceKeys]
      .every(key => byId(key + "-resource").hidden));
  }

  function renderGlobal() {
    renderOnlineCompensation();
    const rateStatus=getCatchUpStatus();
    const gain = WIS.tmp.rates.joulesPerSecond;
    const passivePowerGain = WIS.tmp.rates.powerPerSecond;
    const passiveManaGain = WIS.tmp.rates.manaPerSecond;
    const passiveImmortalPowerGain = WIS.tmp.rates.immortalPowerPerSecond;
    setTextIfChanged(byId("game-version"), `v${GAME_VERSION}`);
    setTextIfChanged(byId("joules"), format(state.joules));
    setTextIfChanged(byId("power"), format(state.power));
    setTextIfChanged(byId("current-scale"), SCALE_THRESHOLDS[state.highestScaleIndex].name);
    const nextScale = SCALE_THRESHOLDS[state.highestScaleIndex + 1];
    const nextScaleDetails = nextScale ? scaleRequirementDetails(state.highestScaleIndex + 1, state) : null;
    setTextIfChanged(byId("next-scale-progress"), nextScaleDetails
      ? `下一量级：${nextScale.name}（基础 ${format(nextScaleDetails.baseRequirement, 0)}${!eqBN(nextScaleDetails.rewardMultiplier, ONE) ? `；黑洞挑战奖励 ×${format(nextScaleDetails.rewardMultiplier, 5)}` : ""}${!eqBN(nextScaleDetails.blackHoleMultiplier, ONE) ? `；黑洞倍率 ×${format(nextScaleDetails.blackHoleMultiplier, 3)}` : ""}；实际需求 ${format(nextScaleDetails.actualRequirement, 0)} 战力）`
      : "已达到当前量级系统上限");
    setTextIfChanged(byId("joules-rate"), globalRateText(gain,rateStatus,format));
    setTextIfChanged(byId("power-rate"), globalRateText(passivePowerGain,rateStatus,format));
    setHiddenIfChanged(byId("power-rate"), !rateStatus.clockSuspended && !gtBN(passivePowerGain, ZERO));
    setHiddenIfChanged(byId("mana-resource"), !immortalCultivationActive() || !state.qiRefiningUnlocked);
    setTextIfChanged(byId("mana"), format(state.mana));
    setTextIfChanged(byId("mana-rate"), globalRateText(passiveManaGain,rateStatus,format));
    setHiddenIfChanged(byId("mana-rate"), !rateStatus.clockSuspended && !gtBN(passiveManaGain, ZERO));
    setHiddenIfChanged(byId("immortal-power-resource"), !immortalPowerUnlocked());
    setTextIfChanged(byId("immortal-power"), format(state.immortalPower));
    setTextIfChanged(byId("immortal-power-rate"), globalRateText(passiveImmortalPowerGain,rateStatus,format));
    setHiddenIfChanged(byId("immortal-power-rate"), !rateStatus.clockSuspended && !gtBN(passiveImmortalPowerGain, ZERO));
    renderAdditionalResources();
    updateNavigation();
  }

  // Local presentation snapshots only. Never used by explore()/settlement.
  const explorationPreviews = new Map();
  let explorationPreviewRefreshPending = false;
  const explorationStructureFields = [
    "qiRefiningUnlocked", "foundationUnlocked", "goldenCoreUnlocked", "advancedRealmLevel",
    "activeChallenge", "permanentRootLevel", "scatterRetentionLevel", "reincarnationCount",
    "scatterRebuildLevel", "reincarnationEffectLevel", "currentQiLayer",
    "largeScaleAdaptationPurchased", "scaleUnificationPurchased",
    "trueSpiritTransformationLevel", "immortalLifeUnlocked", "manaLiquefactionUnlocked",
    "manaSolidificationUnlocked", "techniqueUnlocked", "divineAbilityMasteryUnlocked",
    "goldenSealScriptUnlocked", "silverTadpoleScriptUnlocked", "spiritWorldAscensionUnlocked",
    "flyingEscapeUnlocked", "divineSenseUnlocked", "demonRealmJourneyUnlocked",
    "spiritTravelVoidUnlocked", "daoTimeLawUnlocked", "daoLawUnityUnlocked",
    "daoAssimilationUnlocked", "daoDomainUnlocked", "immortalApertureLevel", "lawUnlocked"
  ];
  let explorationStructureState = null, explorationStructureKey = null;
  function markExplorationPreviewDirty() {
    for (const snapshot of explorationPreviews.values()) snapshot.dirty = true;
  }
  function syncExplorationPreviewStructure() {
    const current = runtime.getState();
    // Discrete UI event detection also covers automation and load replacement.
    // No resource balances, elapsed time, treasure amounts or Effect revision.
    const key = [current.cultivation.active, current.powerSystem.active,
      current.cultivation.systems.immortal?.xiuzhen?.realm,
      ...explorationStructureFields.map(field => current[field]),
      current.unlockedAchievements.seizeFoundation, current.unlockedAchievements.greatLuo,
      ...Object.values(current.challengeCompletions || {})].join("|");
    if (current !== explorationStructureState || key !== explorationStructureKey) {
      explorationStructureState = current; explorationStructureKey = key;
      markExplorationPreviewDirty();
    }
  }
  function explorationPreviewSnapshot(key, element) {
    if (document.hidden || !previewVisible(element)) return null;
    syncExplorationPreviewStructure();
    let snapshot = explorationPreviews.get(key);
    if (explorationPreviewRefreshPending) return snapshot || null;
    if (!snapshot || snapshot.dirty) {
      const value = explorationPreviewValues({ includeFinal: key === "action" });
      // Source text and final action gain come from the same synchronous state.
      const records = key === "action" ? WIS.UI.SourcePreview.query(["exploration"], runtime.getState(),
        { actionFinals: { exploration: value.mana } }) : null;
      snapshot = { value, records, calculatedAt: Date.now(), dirty: false };
      explorationPreviews.set(key, snapshot);
    }
    return snapshot;
  }
  function requestExplorationPreviewRefresh(button) {
    markExplorationPreviewDirty();
    if (document.hidden || !previewVisible(button) || button.disabled || explorationPreviewRefreshPending) return;
    explorationPreviewRefreshPending = true;
    button.disabled = true;
    setTextIfChanged(button, "正在刷新…");
    // Allow the pending label to paint. The unchanged exact calculation itself
    // is synchronous; no Evaluation frame is held across this host yield.
    window.requestAnimationFrame(() => window.setTimeout(() => {
      explorationPreviewRefreshPending = false;
      try {
        if (!document.hidden && previewVisible(button)) runtime.call("renderImmediately", activePage);
      } finally {
        button.disabled = false;
        setTextIfChanged(button, "刷新预览");
      }
    }, 0));
  }
  function ensureExplorationPreviewRefresh(element) {
    const id = "refresh-tribulation-exploration-preview";
    if (!element || rawById(id)) return;
    const button = document.createElement("button");
    button.id = id; button.type = "button"; button.textContent = "刷新预览";
    button.addEventListener("click", () => requestExplorationPreviewRefresh(button));
    element.parentElement.append(button);
  }

  function explorationPreviewValues({ includeFinal = true } = {}) {
    const powerCost = explorationPowerCost();
    const available = Immortal.explorationEnabled() && gteBN(powerCost, EXPLORATION_MINIMUM_POWER_COST);
    const rawAmount = available ? rawExplorationAmountForCost(powerCost) : ZERO;
    const amount = mulBN(rawAmount, divineSenseMultiplier());
    const tribulationPreview = minorTribulationPreviewForExploration(amount);
    const mana = includeFinal && available
      ? Immortal.explorationManaGainProgressive(powerCost, amount, tribulationPreview.manaExponent)
      : ZERO;
    return { powerCost, available, rawAmount, amount, tribulationPreview, mana, canExplore: available && gteBN(mana, ONE) };
  }

  const BREATHING_NEXT_BASE_MANA_MAX_LOG_GAP = 6;

  function breathingNextBaseManaRequirementText(nextJ, currentJ) {
    const next = BN(nextJ);
    const current = BN(currentJ);
    const limitedText = "吐纳基础受当前法力衰减限制";
    if (!isFiniteBN(next) || isNaNBN(next) || !gtBN(next, ZERO)) return limitedText;
    if (!isFiniteBN(current) || isNaNBN(current)) return limitedText;
    if (!gtBN(current, ZERO)) return `下一档基础法力所需：${format(next, 0)} J`;
    const magnitudeGap = subBN(log10BN(next), log10BN(current));
    if (!isFiniteBN(magnitudeGap) || isNaNBN(magnitudeGap) ||
        gtBN(magnitudeGap, BREATHING_NEXT_BASE_MANA_MAX_LOG_GAP)) {
      return limitedText;
    }
    return `下一档基础法力所需：${format(next, 0)} J`;
  }

  function previewVisible(element) {
    if (!element || element === skippedRenderElement) return false;
    for (let node = element; node; node = node.parentElement) {
      if (node.hidden || node.tagName === "DETAILS" && !node.open) return false;
      if ((node.classList?.contains("page") || node.classList?.contains("cultivation-subpage")) && !node.classList.contains("active")) return false;
    }
    return true;
  }
  function heavyPreviewDue(element) {
    const previous = heavyPreviewCache.get(element), current = runtime.getState();
    return renderingStructure || !previous || previous.state !== current ||
      previous.revision !== structureRevision || Date.now() - previous.at >= HEAVY_PREVIEW_REFRESH_MS;
  }
  function rememberPreview(element, records) {
    heavyPreviewCache.set(element, { state:runtime.getState(), revision:structureRevision, at:Date.now(), records });
  }
  function setPreviewText(element, compute) {
    if (!previewVisible(element) || !heavyPreviewDue(element)) return;
    setTextIfChanged(element, compute());
    rememberPreview(element);
  }
  function writeSourcePreview(elementId, sourceIds, assumeUnlocked = false, actionFinals = null) {
    const element = byId(elementId);
    if (!previewVisible(element)) return [];
    // Presentation only: never feeds settlement or candidate evaluation.
    // Actions independently recompute their exact result when invoked.
    if (!heavyPreviewDue(element)) return heavyPreviewCache.get(element).records;
    const records = WIS.UI.SourcePreview.write(element, sourceIds, format,
      runtime.getState(), { assumeUnlocked, actionFinals });
    rememberPreview(element, records);
    return records;
  }

  function renderPageContent(pageName) {
    const renderActions = pageName === "actions";
    const renderUpgrades = pageName === "upgrades";
    const renderCultivation = pageName === "cultivation";
    const renderRealms = renderCultivation && activeCultivationPage === "realms";
    const renderAbilities = renderCultivation && activeCultivationPage === "abilities";
    const renderTreasures = pageName === "treasures";
    const renderStatistics = pageName === "statistics";
    let nextFoundationCost;
    let nextGoldenCoreCost;
    let nextQiSpellCost;
    let nextLongevityCost;
    let nextFoundationSpellCost;
    let nextGoldenCoreLongevityCost;
    let nextLongevity800Cost;
    let nextHeavenlyTreasureCost;
    let nextMysticHeavenlyTreasureCost;
    let nextImmortalApertureCost;
    let nextTrueSpiritTransformationCost;
    let immortalSelected;

    if (renderActions) {
      // The latest hypothetical action preview drives its display eligibility.
      // Purchases/actions force a refresh; settlement never reads this cache.
      const conversion = writeSourcePreview("conversion-preview", "training", false)[0].final;
      const nextPowerJ = joulesForNextBasePower();
    setTextIfChanged(byId("next-power-j"), `下一战力所需：${format(nextPowerJ, 0)} J`);
    setDisabledIfChanged(byId("train-button"), ltBN(conversion, ONE));
    }
    if (renderUpgrades) {
      const gym = gymMultiplier();
      const exercise = exerciseMultiplier();
      const transcendent = transcendentMultiplier();
      const gymPotential = mulBN(gymPotentialMultiplier(), sonicMovementMultiplier());
      const exercisePotential = mulBN(exercisePotentialMultiplier(), extremeExerciseEffectMultiplier());
      const transcendentPotential = transcendentPotentialMultiplier();
    setPreviewText(byId("gym-preview"), () => `${state.gymPurchased ? "当前：" : "解锁后："}J 获取倍率 ×${format(state.gymPurchased ? gym : gymPotential, 2)}`);
    setPreviewText(byId("exercise-preview"), () => `${state.exercisePurchased ? "当前：" : "解锁后："}J 获取倍率 ×${format(state.exercisePurchased ? exercise : exercisePotential, 2)}`);
    setPreviewText(byId("transcendent-preview"), () => `${state.transcendentPurchased ? "当前：" : "解锁后："}战力获取倍率 ×${format(state.transcendentPurchased ? transcendent : transcendentPotential, 2)}`);
    writeSourcePreview("focus-preview", "focus", true);
    setPreviewText(byId("breathing-method-preview"), () => `${state.breathingMethodPurchased ? "当前：" : "解锁后："}跑步倍率 ×1.5`);
    setPreviewText(byId("extreme-exercise-preview"), () => `${state.extremeExercisePurchased ? "当前：" : "解锁后："}运动倍率 ×1.5`);
    }
    if (renderActions) {
      const fitnessCap = fitnessLevelCap();
      const nextRunningCost = runningCost();
    setTextIfChanged(byId("running-level"), effectiveFitnessLevel() !== state.runningLevel
      ? `当前：实际 ${state.runningLevel}/${fitnessCap}级；生效 ${effectiveFitnessLevel()}级`
      : `当前：${state.runningLevel}/${fitnessCap}级`);
    writeSourcePreview("running-rate", "fitness", false);
    setTextIfChanged(byId("running-cost"), `消耗 ${formatCost(nextRunningCost)} 战力`);
    setTextIfChanged(byId("buy-running"), state.runningLevel >= fitnessCap ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-running"), state.runningLevel >= fitnessCap || !canAffordPower(nextRunningCost));
    setHiddenIfChanged(byId("running-action"), ltBN(state.totalPower, 1));
    }
    if (renderUpgrades) {
    setHiddenIfChanged(byId("brick-upgrades"), !state.brickUnlocked && state.scatterRetentionLevel < 2);
    setHiddenIfChanged(byId("wall-upgrades"), !state.wallUnlocked && state.scatterRetentionLevel < 3);
    setHiddenIfChanged(byId("house-upgrades"), state.highestScaleIndex < 3);
    setHiddenIfChanged(byId("building-upgrades"), state.highestScaleIndex < 4);
    setHiddenIfChanged(byId("street-upgrades"), state.highestScaleIndex < 5);
    setHiddenIfChanged(byId("city-upgrades"), state.highestScaleIndex < 6);
    setHiddenIfChanged(byId("country-upgrades"), state.highestScaleIndex < 7);
    setHiddenIfChanged(byId("continent-upgrades"), state.highestScaleIndex < 8);
    setHiddenIfChanged(byId("surface-upgrades"), state.highestScaleIndex < 9);
    setHiddenIfChanged(byId("star-upgrades"), state.highestScaleIndex < 10);
    setHiddenIfChanged(byId("stellar-upgrades"), state.highestScaleIndex < 11);
    setHiddenIfChanged(byId("galaxy-upgrades"), state.highestScaleIndex < 12);
    setHiddenIfChanged(byId("supercluster-upgrades"), state.highestScaleIndex < 13);
    setHiddenIfChanged(byId("cosmic-upgrades"), state.highestScaleIndex < 14);
    }
    if (renderActions) {
      const nextRockCost = rockCost();
      const rockCap = rockLevelCap();
    setHiddenIfChanged(byId("rock-action"), !state.wallUnlocked);
    setHiddenIfChanged(byId("ghost-back-action"), !state.ghostBackPurchased);
    toggleClassIfChanged(byId("ghost-back-action"), "purchased", state.ghostBackActive);
    setTextIfChanged(byId("ghost-back-state"), state.ghostBackActive ? "当前已激活" : "当前未激活");
    setTextIfChanged(byId("toggle-ghost-back"), state.ghostBackActive ? "关闭" : "激活");
    setDisabledIfChanged(byId("toggle-ghost-back"), !state.ghostBackPurchased);
    setTextIfChanged(byId("rock-level"), effectiveRockLevel() !== state.rockLevel
      ? `当前：实际 ${state.rockLevel}/${rockCap}级；生效 ${effectiveRockLevel()}级`
      : `当前：${state.rockLevel}/${rockCap}级`);
    writeSourcePreview("rock-rate", "rock", false);
    setTextIfChanged(byId("rock-cost"), `消耗 ${formatCost(nextRockCost)} 战力`);
    setTextIfChanged(byId("buy-rock"), state.rockLevel >= rockCap ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-rock"), state.rockLevel >= rockCap || !canAffordPower(nextRockCost));
    }
    if (renderUpgrades) {
      const waterPotential = waterPotentialJMultiplier();
      const naturalStrengthPotential = naturalStrengthPotentialMultiplier();
      const myStylePotential = myStylePotentialFitnessMultiplier();
      const intuitionPotential = intuitionPotentialFocusMultiplier();
      const carbonLimitPotential = carbonLimitPotentialFitnessBonus();
      const nextMindDivisionCost = mindDivisionCost();
    setPreviewText(byId("water-preview"), () => `${state.waterPurchased ? "当前：" : "解锁后："}J 获取倍率 ×${format(waterPotential, 2)}`);
    writeSourcePreview("ghost-brain-preview", "ghostBrain", true);
    setPreviewText(byId("natural-strength-preview"), () => `${state.naturalStrengthPurchased ? "当前：" : "解锁后："}战力获取倍率 ×${format(naturalStrengthPotential, 2)}`);
    setPreviewText(byId("mental-power-preview"), () => `${state.mentalPowerPurchased ? "当前：集中比例" : "解锁后：集中比例"} ${state.mentalPowerPurchased ? `${(focusPercent() * 100).toFixed(1)}%` : "+1个百分点"}`);
    setPreviewText(byId("life-power-preview"), () => `${state.lifePowerPurchased ? "当前：" : "解锁后："}健身倍率 ×1.50`);
    setPreviewText(byId("my-style-preview"), () => `${state.myStylePurchased ? "当前：" : "解锁后："}健身倍率 ×${format(myStylePotential, 2)}`);
    setPreviewText(byId("intuition-preview"), () => `${state.intuitionPurchased ? "当前：" : "解锁后："}集中倍率 ×${format(intuitionPotential, 2)}`);
    setPreviewText(byId("sonic-movement-preview"), () => `${state.sonicMovementPurchased ? "当前：" : "解锁后："}跑步倍率 ×${format(state.sonicMovementPurchased ? sonicMovementMultiplier() : sonicMovementPotentialMultiplier(), 2)}`);
    setPreviewText(byId("carbon-limit-preview"), () => `${state.carbonLimitPurchased ? "当前：" : "解锁后："}健身倍率加法 +${format(carbonLimitPotential, 2)}`);
    writeSourcePreview("killing-intent-preview", "killingIntent", true);
    setPreviewText(byId("biological-quantification-preview"), () => `${state.biologicalQuantificationPurchased ? "当前：" : "解锁后："}健身 J ×12；健身上限 +30`);
    setPreviewText(byId("ghost-man-transformation-preview"), () => `${state.ghostManTransformationPurchased ? "当前：" : "解锁后："}打岩生效等级 ${state.ghostManTransformationPurchased ? effectiveRockLevel() : `${effectiveRockLevel()} + 健身实际 ${state.runningLevel}`}`);
    setPreviewText(byId("destroy-country-preview"), () => `${state.destroyCountryPurchased ? "当前：" : "解锁后："}打岩 ×1e4；打岩上限 +50`);
    setPreviewText(byId("human-ghost-transformation-preview"), () => `${state.humanGhostTransformationPurchased ? "当前：" : "解锁后："}健身生效等级 ${state.humanGhostTransformationPurchased ? effectiveFitnessLevel() : `${state.runningLevel} + 打岩实际 ${state.rockLevel}`}`);
    setPreviewText(byId("killing-intent-substance-preview"), () => `${state.killingIntentSubstancePurchased ? "当前：" : "解锁后："}杀气提取比例 ×5`);
    setPreviewText(byId("energy-cycle-preview"), () => `${state.energyCyclePurchased ? "当前：" : "解锁后："}鬼脑来源 ×12`);
    setPreviewText(byId("mountain-shatter-preview"), () => `${state.mountainShatterPurchased ? "当前：" : "解锁后："}战力区域 ^1.015`);
    setPreviewText(byId("bioenergy-preview"), () => `${state.bioenergyPurchased ? "当前：" : "解锁后："}J 区域 ×3`);
    writeSourcePreview("elementalization-preview", "elementalization", true);
    setPreviewText(byId("killing-intent-perception-preview"), () => `${state.killingIntentPerceptionPurchased ? "当前：" : "解锁后："}杀气提取比例 ${(state.killingIntentPerceptionPurchased ? killingIntentExtractionRatio() : 5e-4) * 100}%`);
    setPreviewText(byId("killing-intent-wave-preview"), () => `${state.killingIntentWavePurchased ? "当前：" : "解锁后："}杀气来源 ^${format(killingIntentWavePotentialExponent(), 3)}`);
    writeSourcePreview("ultimate-intent-preview", "ultimateIntent", true);
    setPreviewText(byId("brain-domain-development-preview"), () => `${state.brainDomainDevelopmentPurchased ? "当前：" : "解锁后："}鬼脑来源 ^${format(brainDomainDevelopmentPotentialExponent(), 3)}`);
    setPreviewText(byId("continent-split-preview"), () => `${state.continentSplitPurchased ? "当前：" : "解锁后："}打岩生效等级 +${format(Math.pow(state.rockLevel, 1.8))}`);
    setPreviewText(byId("continent-collapse-preview"), () => `${state.continentCollapsePurchased ? "当前：" : "解锁后："}打岩来源 ^${format(continentCollapsePotentialExponent(), 3)}`);
    setPreviewText(byId("wave-eye-preview"), () => `${state.waveEyePurchased ? "当前：" : "解锁后："}杀气来源 ^1.75`);
    setPreviewText(byId("elemental-awakening-preview"), () => `${state.elementalAwakeningPurchased ? "当前：" : "解锁后："}元素化来源 ^1.52`);
    setPreviewText(byId("moonfall-preview"), () => `${state.moonfallPurchased ? "当前：" : "解锁后："}打岩来源 ×50`);
    setPreviewText(byId("flow-state-preview"), () => `${state.flowStatePurchased ? "当前：" : "解锁后："}极意来源 ×${format(flowUltimateIntentMultiplier(), 3)}`);
    setPreviewText(byId("selfhood-preview"), () => `${state.selfhoodPurchased ? "当前：" : "解锁后："}极意来源 ^1.04`);
    setPreviewText(byId("freedom-preview"), () => `${state.freedomPurchased ? "当前：" : "解锁后："}极意来源 ^1.03`);
    setPreviewText(byId("chicxulub-meteorite-preview"), () => `${state.chicxulubMeteoritePurchased ? "当前：" : "解锁后："}战力区域 ×10`);
    setPreviewText(byId("planet-will-preview"), () => scaleUpgradePreviewText("planetWill", state, format));
    byId("planet-will-preview").title = "按当前资源估算，未预扣购买费用。";
    setPreviewText(byId("star-spirit-preview"), () => scaleUpgradePreviewText("starSpirit", state, format));
    byId("star-spirit-preview").title = "按当前资源估算，未预扣购买费用。";
    setPreviewText(byId("star-shatter-preview"), () => scaleUpgradePreviewText("starShatter", state, format));
    byId("star-shatter-preview").title = "按当前资源估算，未预扣购买费用。";
    setPreviewText(byId("space-quake-preview"), () => `${state.spaceQuakePurchased ? "当前：" : "解锁后："}爆星软上限损失 ×0.97`);
    setPreviewText(byId("selfless-preview"), () => `${state.selflessPurchased ? "当前：" : "解锁后："}极意来源 ×${format(CONFIG.starEnhancements.selfless.ultimateIntentMultiplier)}`);
    setPreviewText(byId("supernatural-fire-preview"), () => scaleUpgradePreviewText("supernaturalFire", state, format));
    byId("supernatural-fire-preview").title = "按当前资源估算，未预扣购买费用。";
    setPreviewText(byId("five-spirit-stone-preview"), () => state.fiveSpiritStonePurchased ? "当前：已解锁五灵石获取资格" : "解锁后：极意有效时每秒判定五灵石");
    const currentJBaseSoftcapExponent = resourceSoftcapBaseExponent(state.joules);
    const potentialSelfSuppressionExponent = selfSuppressionJExponentFromBase(currentJBaseSoftcapExponent);
    setPreviewText(byId("self-suppression-preview"), () => `${state.selfSuppressionPurchased ? "当前：" : "解锁后："}J区域 ^${(state.selfSuppressionPurchased ? selfSuppressionJExponent() : potentialSelfSuppressionExponent).toFixed(5)}（空间震前基础软上限 ^${formatSoftcapExponent(currentJBaseSoftcapExponent)}）`);
    setPreviewText(byId("stellar-furnace-preview"), () => `${state.stellarFurnacePurchased ? "当前：" : "解锁后："}J 区域 ×1e12`);
    setPreviewText(byId("stellar-treasure-seeking-preview"), () => scaleUpgradePreviewText("stellarTreasureSeeking", state, format));
    byId("stellar-treasure-seeking-preview").title = "按当前资源估算，未预扣购买费用。";
    setPreviewText(byId("gravitational-collapse-preview"), () => `${state.gravitationalCollapsePurchased ? "当前：" : "解锁后："}战力区域 ×1e12`);
    setPreviewText(byId("galactic-return-preview"), () => `${state.galacticReturnPurchased ? "当前：" : "解锁后："}J 区域 ×1e12`);
    setPreviewText(byId("stellar-sea-gift-preview"), () => `${state.stellarSeaGiftPurchased ? "当前：" : "解锁后："}可堆叠宝物获得数量 ×2`);
    setPreviewText(byId("stellar-resonance-preview"), () => `${state.stellarResonancePurchased ? "当前：" : "解锁后："}战力区域 ×1e4`);
    setPreviewText(byId("great-attractor-preview"), () => `${state.greatAttractorPurchased ? "当前：" : "解锁后："}J 区域 ^1.02`);
    setPreviewText(byId("large-scale-adaptation-preview"), () => `${state.largeScaleAdaptationPurchased ? "当前：" : "解锁后："}古戈尔惩罚强度 ×0.95`);
    setPreviewText(byId("supercluster-collapse-preview"), () => `${state.superclusterCollapsePurchased ? "当前：" : "解锁后："}战力区域 ^1.02`);
    setPreviewText(byId("cosmic-web-preview"), () => `${state.cosmicWebPurchased ? "当前：" : "解锁后："}J 区域 ^1.03`);
    setPreviewText(byId("scale-unification-preview"), () => `${state.scaleUnificationPurchased ? "当前：" : "解锁后："}古戈尔惩罚强度 ×0.85`);
    setPreviewText(byId("spacetime-framework-preview"), () => `${state.spacetimeFrameworkPurchased ? "当前：" : "解锁后："}战力区域 ^1.03`);
    setPreviewText(byId("rock-strike-preview"), () => `${state.rockStrikePurchased ? "当前：" : "解锁后："}打岩来源 ×2；等级上限 +20`);
    setPreviewText(byId("high-speed-metabolism-preview"), () => `${state.highSpeedMetabolismPurchased ? "当前：" : "解锁后："}锻炼来源 ×1.75`);
    setPreviewText(byId("endurance-enhancement-preview"), () => `${state.enduranceEnhancementPurchased ? "当前：" : "解锁后："}健身倍率 ×2；等级上限 +20`);
    setPreviewText(byId("bullet-time-preview"), () => `${state.bulletTimePurchased ? "当前：" : "解锁后："}战力获取倍率 ×1.5`);
    setPreviewText(byId("dynamic-focus-preview"), () => `${state.dynamicFocusPurchased ? "当前：" : "解锁后："}集中倍率 ×1.5`);
    setPreviewText(byId("super-perception-preview"), () => `${state.superPerceptionPurchased ? "当前：" : "解锁后："}直感倍率 ×1.50`);
    setPreviewText(byId("invulnerable-preview"), () => `${state.invulnerablePurchased ? "当前：" : "解锁后："}健身来源 ^1.15`);
    setPreviewText(byId("regeneration-preview"), () => `${state.regenerationPurchased ? "当前：" : "解锁后："}健身倍率 ×${regenerationFitnessMultiplier().toFixed(2)}`);
    setPreviewText(byId("superpower-preview"), () => `${state.superpowerPurchased ? "当前：" : "解锁后："}战力区域 ^${superpowerExponent().toFixed(2)}`);
    setPreviewText(byId("super-speed-thinking-preview"), () => `${state.superSpeedThinkingPurchased ? "当前：" : "解锁后："}杀气倍率 ×5.00`);
    setPreviewText(byId("mountain-collapse-preview"), () => `${state.mountainCollapsePurchased ? "当前：" : "解锁后："}打岩来源 ^${mountainCollapseExponent().toFixed(3)}；等级上限 +20`);
    setPreviewText(byId("mind-division-preview"), () => `当前：${state.mindDivisionLevel}/3级；集中比例 ${(focusPercent() * 100).toFixed(1)}%`);
    setTextIfChanged(byId("mind-division-cost"), state.mindDivisionLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextMindDivisionCost)} 战力`);
    setTextIfChanged(byId("buy-mind-division"), state.mindDivisionLevel >= 3 ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-mind-division"), !state.focusPurchased || state.mindDivisionLevel >= 3 || !canAffordPower(nextMindDivisionCost));
    toggleClassIfChanged(byId("mind-division-upgrade"), "purchased", state.mindDivisionLevel >= 3);
    setPreviewText(byId("hyper-regeneration-preview"), () => `${state.hyperRegenerationPurchased ? "当前：" : "解锁后："}再生 ×15；健身上限 +20`);
    setPreviewText(byId("superpower-evolution-preview"), () => `${state.superpowerEvolutionPurchased ? "当前：" : "解锁后："}异能指数 1.06`);
    setPreviewText(byId("earth-split-preview"), () => `${state.earthSplitPurchased ? "当前：" : "解锁后："}崩山指数 ${(1.1 + 0.02 * Math.log10(1 + state.rockLevel / 10)).toFixed(3)}；打岩上限 +20`);
    setPreviewText(byId("mental-domain-preview"), () => `${state.mentalDomainPurchased ? "当前：" : "解锁后："}鬼脑来源倍率 ×5`);
    setPreviewText(byId("godspeed-preview"), () => `${state.godspeedPurchased ? "当前：" : "解锁后："}音速移动指数 ${format(godspeedPotentialExponent(), 3)}；音速移动倍率 ×${format(sonicMovementMultiplierForExponent(godspeedPotentialExponent()), 2)}`);
    setPreviewText(byId("subtle-preview"), () => `${state.subtlePurchased ? "当前：" : "解锁后："}集中来源 ^1.05`);
    setPreviewText(byId("sky-split-preview"), () => `${state.skySplitPurchased ? "当前：" : "解锁后："}鬼脑来源倍率 ×${format(skySplitPotentialMultiplier(), 2)}`);
    }
    if (renderActions) {
    setHiddenIfChanged(byId("breathing-action"), !immortalCultivationActive() || !state.qiRefiningUnlocked);
    setHiddenIfChanged(byId("exploration-action"), !immortalCultivationActive() || !state.goldenCoreUnlocked);
    if (immortalCultivationActive() && state.qiRefiningUnlocked && previewVisible(byId("breathing-preview"))) {
      const breathingElement = byId("breathing-preview");
      if (heavyPreviewDue(breathingElement)) {
        const manaGain = Immortal.breathingManaGainProgressive();
        writeSourcePreview("breathing-preview", "breathing", false, { breathing: manaGain });
      }
      const manaGain = heavyPreviewCache.get(breathingElement).records[0].final;
      const nextManaJ = joulesForNextBaseMana();
      const breathingJAvailable = gteBN(state.joules, 3000);
      const breathingGainAvailable = gtBN(manaGain, ZERO);
    setTextIfChanged(byId("next-mana-j"), breathingNextBaseManaRequirementText(nextManaJ, state.joules));
    setDisabledIfChanged(byId("breathing-button"), !breathingJAvailable || !breathingGainAvailable);
    }
    if (immortalCultivationActive() && state.goldenCoreUnlocked) {
    const snapshot = explorationPreviewSnapshot("action", byId("exploration-preview"));
    if (snapshot) {
      setTextIfChanged(byId("exploration-preview"), WIS.UI.SourcePreview.text(snapshot.records, format));
      toggleClassIfChanged(byId("exploration-preview"), "source-gain-preview", true);
      setTextIfChanged(byId("exploration-preview-status"), "上次精确预览；实际收益以点击探寻时为准");
    }
    setTextIfChanged(byId("exploration-cost"), "消耗当前 10% 战力，至少消耗 1M");
    // A stale low-yield preview must never prevent a newly valid live action.
    // The formal action is the authority for gain and payment eligibility.
    setDisabledIfChanged(byId("exploration-button"), !Immortal.explorationEnabled() ||
      ltBN(explorationPowerCost(), EXPLORATION_MINIMUM_POWER_COST));
    }
    }

    if (renderCultivation) {
    if (renderingStructure) ensureAdvancedRealmAbilityGroups();
    nextFoundationCost = foundationCost();
    nextGoldenCoreCost = goldenCoreCost();
    const cultivationSelected = Boolean(state.cultivation.active);
    immortalSelected = immortalCultivationActive();
    const cultivationBlocked = state.activeChallenge === "fiveMisfortunes";
    if (activePage === "cultivation") {
      const cultivationCard = document.querySelector('[data-cultivation-card="仙道"]');
      const cultivationButton = document.querySelector('[data-cultivation="仙道"]');
      toggleClassIfChanged(cultivationCard, "selected", immortalSelected);
      setTextIfChanged(cultivationButton, immortalSelected ? "已选择" : cultivationSelected ? "已选择其他体系" : cultivationBlocked ? "五弊挑战中不可选择" : "选择仙道");
      setDisabledIfChanged(cultivationButton, cultivationSelected || cultivationBlocked);
    }
    setHiddenIfChanged(byId("cultivation-choices"), cultivationSelected);
    setTextIfChanged(byId("cultivation-status"), immortalSelected
      ? "已选择：仙道（转世重修不会重置体系）"
      : cultivationSelected ? `已选择：${state.cultivation.active}`
        : cultivationBlocked ? "五弊挑战中无法选择体系" : "尚未选择体系");
    setHiddenIfChanged(byId("immortal-progress"), !immortalSelected);
    if (renderRealms) {
    setHiddenIfChanged(byId("foundation-stage"), !state.qiRefiningUnlocked);
    setTextIfChanged(byId("foundation-cost"), `消耗 ${formatCost(nextFoundationCost)} 法力`);
    const qiChallengeActive = qiRefiningChallengeActive();
    const foundationStage = byId("foundation-stage");
    setTextIfChanged(foundationStage.querySelector("h2"), qiChallengeActive
      ? `炼气${format(state.currentQiLayer + 1, 0)}层`
      : "筑基");
    setTextIfChanged(foundationStage.querySelector(".item-content p"), qiChallengeActive
      ? "消耗法力提升炼气层数"
      : "百日筑基，吐纳更难获得法力，解除爆屋软上限。");
    setTextIfChanged(foundationStage.querySelector(".purchase-control span"), qiChallengeActive
      ? `当前炼气${format(state.currentQiLayer, 0)}层`
      : "进入筑基境界");
    setHiddenIfChanged(byId("golden-core-stage"), !state.foundationUnlocked);
    setTextIfChanged(byId("golden-core-cost"), `消耗 ${formatCost(nextGoldenCoreCost)} 法力`);
    ADVANCED_REALMS.forEach((realm, index) => {
      const unlocked = state.advancedRealmLevel > index;
      const isNextRealm = state.goldenCoreUnlocked && state.advancedRealmLevel === index;
      const resourceKey = advancedRealmResource(index);
      const resourceName = resourceKey === "immortalPower" ? "仙灵力" : "法力";
      const resourceAmount = resourceKey === "immortalPower" ? state.immortalPower : state.mana;
      setHiddenIfChanged(byId(`${realm.slug}-stage`), !state.goldenCoreUnlocked || index > state.advancedRealmLevel);
      setTextIfChanged(byId(`${realm.slug}-cost`), `消耗 ${formatCost(advancedRealmCost(index))} ${resourceName}`);
      updateOneTimeUnlock(`${realm.slug}-stage`, `unlock-${realm.slug}`, unlocked, isNextRealm && gteBN(resourceAmount, advancedRealmCost(index)));
      if (index === 9 && !unlocked && challengeCompletionCount("severSelfCorpse") < 1) {
        setTextIfChanged(byId(`${realm.slug}-cost`), `消耗 ${formatCost(advancedRealmCost(index))} 仙灵力；需先完成斩自我尸`);
        setDisabledIfChanged(byId(`unlock-${realm.slug}`), true);
      }
    });
    }
    if (renderAbilities) {
    nextQiSpellCost = qiSpellCost();
    nextLongevityCost = longevityCost();
    nextFoundationSpellCost = foundationSpellCost();
    nextGoldenCoreLongevityCost = goldenCoreLongevityCost();
    nextLongevity800Cost = longevity800Cost();
    nextHeavenlyTreasureCost = heavenlyTreasureCost();
    nextMysticHeavenlyTreasureCost = mysticHeavenlyTreasureCost();
    nextImmortalApertureCost = Immortal.immortalApertureCost();
    updateSortCost("qi-spell-ability", nextQiSpellCost, state.qiSpellLevel >= 3);
    updateSortCost("longevity-ability", nextLongevityCost, state.longevityLevel >= 2);
    updateSortCost("foundation-spell-ability", nextFoundationSpellCost, state.foundationSpellLevel >= 3);
    updateSortCost("golden-core-longevity-ability", nextGoldenCoreLongevityCost, state.goldenCoreLongevityLevel >= 2);
    updateSortCost("longevity-800-ability", nextLongevity800Cost, state.longevity800Level >= 4);
    updateSortCost("heavenly-treasure-ability", nextHeavenlyTreasureCost, state.heavenlyTreasureLevel >= 3);
    updateSortCost("mystic-heavenly-treasure-ability", nextMysticHeavenlyTreasureCost, state.mysticHeavenlyTreasureLevel >= 3);
    const retainedAbilitiesVisible = state.scatterRetentionLevel > 0;
    const rootDefinition = permanentRootDefinition();
    const rootIds = {
      "下品灵根": "low-grade-root",
      "中品灵根": "medium-grade-root",
      "上品灵根": "high-grade-root",
      "地灵根": "earth-root",
      "天灵根": "heaven-root"
    };
    const activeRootId = rootIds[rootDefinition.name];
    const nextRootStackCount = nextRealmRequirementStackCount();
    const rootStackCount = Math.min(3, Math.max(0, nextRootStackCount));
    const nextRootRequirementMultiplier = Math.pow(rootDefinition.requirementMultiplier, rootStackCount);
    setHiddenIfChanged(byId("root-abilities"), !immortalSelected);
    Object.values(rootIds).forEach((rootId) => {
      setHiddenIfChanged(byId(`${rootId}-ability`), rootId !== activeRootId);
    });
    setTextIfChanged(byId(`${activeRootId}-preview`), state.qiRefiningUnlocked
      ? `法力获取倍率 ×${rootDefinition.manaMultiplier.toFixed(2)}`
      : `法力获取倍率 ×${rootDefinition.manaMultiplier.toFixed(2)}（重新炼气后生效）`);
    setTextIfChanged(byId(`${activeRootId}-requirement`), state.qiRefiningUnlocked
      ? nextRealmResource() === "immortalPower"
        ? "后续仙灵力境界需求固定，不受灵根倍率影响"
        : `下次突破累计 ×${nextRootRequirementMultiplier.toFixed(3)}（最多叠加3层）`
      : `前三层境界要求每层 ×${rootDefinition.requirementMultiplier.toFixed(2)}，灵根永久保留`);
    setTextIfChanged(byId(`${activeRootId}-state`), state.qiRefiningUnlocked ? "已生效" : "等待炼气");
    setHiddenIfChanged(byId("qi-abilities"), !state.qiRefiningUnlocked && !retainedAbilitiesVisible);
    setPreviewText(byId("qi-bottleneck-preview"), () => !state.qiRefiningUnlocked
      ? "等待重新炼气，当前不生效"
      : state.foundationUnlocked
        ? "已失效，法力获取倍率 ×1.00"
        : `当前法力获取倍率 ×${bottleneckManaMultiplier(nextFoundationCost, true).toFixed(2)}`);
    setTextIfChanged(byId("qi-bottleneck-state"), !state.qiRefiningUnlocked ? "等待炼气" : state.foundationUnlocked ? "已失效" : "已生效");
    setTextIfChanged(byId("foundation-bottleneck-point"), `拐点：${format(nextFoundationCost, 0)} 法力`);
    setPreviewText(byId("immortal-life-preview"), () => state.immortalLifeUnlocked
      ? "当前：战力 ×0.95；法力 ×1.10"
      : "解锁后：战力 ×0.95；法力 ×1.10");
    setTextIfChanged(byId("immortal-life-cost"), `消耗 ${formatCost(IMMORTAL_LIFE_COST)} 法力`);
    setHiddenIfChanged(byId("foundation-abilities"), !state.foundationUnlocked && !retainedAbilitiesVisible && !circulationEffective());
    setPreviewText(byId("foundation-bottleneck-preview"), () => !state.foundationUnlocked
      ? "等待重新筑基，当前不生效"
      : state.goldenCoreUnlocked
        ? "已失效，法力获取倍率 ×1.00"
        : `当前法力获取倍率 ×${bottleneckManaMultiplier(nextGoldenCoreCost, true).toFixed(2)}`);
    setTextIfChanged(byId("foundation-bottleneck-state"), !state.foundationUnlocked ? "等待筑基" : state.goldenCoreUnlocked ? "已失效" : "已生效");
    setTextIfChanged(byId("golden-core-bottleneck-point"), `拐点：${format(nextGoldenCoreCost, 0)} 法力`);
    toggleClassIfChanged(byId("qi-spell-ability"), "purchased", state.qiSpellLevel >= 3);
    setTextIfChanged(byId("qi-spell-level"), `当前：${state.qiSpellLevel}/3级；本能力战力获取倍率 ×${qiSpellPowerMultiplier().toFixed(2)}`);
    setTextIfChanged(byId("qi-spell-cost"), state.qiSpellLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextQiSpellCost)} 法力`);
    setTextIfChanged(byId("buy-qi-spell"), state.qiSpellLevel >= 3 ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-qi-spell"), !state.qiRefiningUnlocked || state.qiSpellLevel >= 3 || !canAffordMana(nextQiSpellCost));
    setPreviewText(byId("technique-preview"), () => `${state.techniqueUnlocked ? "当前：" : "解锁后："}法力 ×1.50；J ×1.50`);
    writeSourcePreview("circulation-preview", "circulation", true);
    setPreviewText(byId("mana-liquefaction-preview"), () => state.manaLiquefactionUnlocked
      ? "当前：法力 ×0.80；法力 J 来源 ×1.50；吐纳 J 曲线指数 +0.3"
      : "解锁后：法力 ×0.80；法力 J 来源 ×1.50；吐纳 J 曲线指数 +0.3");
    setTextIfChanged(byId("mana-liquefaction-cost"), `消耗 ${formatCost(MANA_LIQUEFACTION_COST)} 法力`);
    setHiddenIfChanged(byId("longevity-ability"), !state.foundationUnlocked && !retainedAbilitiesVisible);
    toggleClassIfChanged(byId("longevity-ability"), "purchased", state.longevityLevel >= 2);
    setTextIfChanged(byId("longevity-level"), `当前：${state.longevityLevel}/2级；健身上限 +${state.longevityLevel * 10}；本能力健身倍率 ×${additiveLevelMultiplier(state.longevityLevel, 2).toFixed(2)}`);
    setTextIfChanged(byId("longevity-cost"), state.longevityLevel >= 2 ? "已达到等级上限" : `消耗 ${formatCost(nextLongevityCost)} 法力`);
    setTextIfChanged(byId("buy-longevity"), state.longevityLevel >= 2 ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-longevity"), !state.foundationUnlocked || state.longevityLevel >= 2 || !canAffordMana(nextLongevityCost));
    toggleClassIfChanged(byId("foundation-spell-ability"), "purchased", state.foundationSpellLevel >= 3);
    setTextIfChanged(byId("foundation-spell-level"), `当前：${state.foundationSpellLevel}/3级；本能力战力获取倍率 ×${foundationSpellPowerMultiplier().toFixed(2)}`);
    setTextIfChanged(byId("foundation-spell-cost"), state.foundationSpellLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextFoundationSpellCost)} 法力`);
    setTextIfChanged(byId("buy-foundation-spell"), state.foundationSpellLevel >= 3 ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-foundation-spell"), !state.foundationUnlocked || state.foundationSpellLevel >= 3 || !canAffordMana(nextFoundationSpellCost));
    setHiddenIfChanged(byId("golden-core-abilities"), !state.goldenCoreUnlocked && !retainedAbilitiesVisible);
    const nascentSoulRequirement = advancedRealmCost(0);
    const nascentSoulUnlocked = state.advancedRealmLevel >= 1;
    setPreviewText(byId("golden-core-bottleneck-preview"), () => !state.goldenCoreUnlocked
      ? "等待重新结丹，当前不生效"
      : nascentSoulUnlocked
        ? "已失效，法力获取倍率 ×1.00"
        : `当前法力获取倍率 ×${bottleneckManaMultiplier(nascentSoulRequirement, true).toFixed(2)}`);
    setTextIfChanged(byId("golden-core-bottleneck-state"), !state.goldenCoreUnlocked ? "等待结丹" : nascentSoulUnlocked ? "已失效" : "已生效");
    setTextIfChanged(byId("nascent-soul-bottleneck-point"), `拐点：${format(nascentSoulRequirement, 0)} 法力`);
    ADVANCED_REALMS.slice(0, -1).forEach((realm, index) => {
      const nextRealm = ADVANCED_REALMS[index + 1];
      const currentRealmUnlocked = state.goldenCoreUnlocked && state.advancedRealmLevel > index;
      const nextRealmUnlocked = state.advancedRealmLevel > index + 1;
      const requirement = advancedRealmCost(index + 1);
      const usesImmortalPower = advancedRealmResource(index + 1) === "immortalPower";
      setHiddenIfChanged(byId(`${realm.slug}-abilities`), !advancedRealmAbilityGroupVisible(index));
      setTextIfChanged(byId(`${realm.slug}-bottleneck-preview`), !currentRealmUnlocked
        ? `等待重新${realm.name}，当前不生效`
        : nextRealmUnlocked
          ? usesImmortalPower
            ? realm.key === "daluo" ? "突破道祖，天人五衰已取消" : "本境界进度已完成"
            : "已失效，法力获取倍率 ×1.00"
          : usesImmortalPower
            ? realm.key === "trueImmortal"
              ? `仙灵力进度 ${(immortalPowerProgressRatio() * 100).toFixed(2)}%；法力天人三衰 ^${immortalPowerManaSuppressionExponent().toFixed(3)}；J/战力天人三衰 ^${Immortal.celestialDeclineExponent().toFixed(3)}`
              : `仙灵力进度 ${(immortalPowerProgressRatio() * 100).toFixed(2)}%；天人五衰 ^${celestialFiveDeclineExponent().toFixed(3)}（已取代天人三衰）`
            : `当前法力获取倍率 ×${bottleneckManaMultiplier(requirement, true).toFixed(2)}`);
      setTextIfChanged(byId(`${realm.slug}-bottleneck-state`), !currentRealmUnlocked
        ? `等待${realm.name}`
        : nextRealmUnlocked ? realm.key === "daluo" ? "已取消" : "已失效" : "境界自带");
      setTextIfChanged(byId(`${nextRealm.slug}-bottleneck-point`), `需求：${format(requirement, 0)} ${usesImmortalPower ? "仙灵力" : "法力"}`);
    });
    setPreviewText(byId("flying-escape-preview"), () => state.flyingEscapeUnlocked
      ? "当前普通探寻来源 ×10"
      : "解锁后：普通探寻来源 ×10");
    toggleClassIfChanged(byId("longevity-800-ability"), "purchased", state.longevity800Level >= 4);
    setTextIfChanged(byId("longevity-800-level"), `当前：${state.longevity800Level}/4级；健身上限 +${state.longevity800Level * 10}；本能力健身倍率 ×${additiveLevelMultiplier(state.longevity800Level, 8).toFixed(2)}`);
    setTextIfChanged(byId("longevity-800-cost"), state.longevity800Level >= 4 ? "已达到等级上限" : `消耗 ${formatCost(nextLongevity800Cost)} 法力`);
    setTextIfChanged(byId("buy-longevity-800"), state.longevity800Level >= 4 ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-longevity-800"), state.advancedRealmLevel < 1 || state.longevity800Level >= 4 || !canAffordMana(nextLongevity800Cost));
    const naturalProgress = WIS.Cultivation.ExplorationProgress.view(state);
    const naturalTreasureCap = naturalProgress.cap;
    toggleClassIfChanged(byId("natural-treasure-ability"), "purchased", naturalProgress.atCap);
    setTextIfChanged(byId("natural-treasure-level"), `当前：${format(state.naturalTreasureLevel, 0)}/${format(naturalTreasureCap, 0)}级；原始倍率 ×${format(naturalTreasureRawManaMultiplier(), 3)}；动态指数 ^${format(naturalTreasureManaDiminishingExponent(), 3)}；实际倍率 ×${format(naturalTreasureManaMultiplier(), 3)}`);
    if(naturalProgress.levelResidual.length)byId("natural-treasure-level").textContent+=`；另记等级余量 ${naturalProgress.levelResidual.map(w=>format(WIS.Meta.TreasureLedger.project(w),6)).join(" + ")}`;
    setTextIfChanged(byId("natural-treasure-chance"), naturalProgress.atCap
      ? "已达到等级上限"
      : `独立进度 ${format(naturalProgress.progress,6)} / ${naturalProgress.demand?format(naturalProgress.demand,6):"暂无法表示"} 有效探寻量；保留小数${naturalProgress.reason?"；"+naturalProgress.reason:""}`);
    setTextIfChanged(byId("natural-treasure-state"), !state.goldenCoreUnlocked
      ? "等待重新结丹"
      : naturalProgress.atCap ? "已达上限" : "仅可通过探寻升级");
    toggleClassIfChanged(byId("golden-core-longevity-ability"), "purchased", state.goldenCoreLongevityLevel >= 2);
    setTextIfChanged(byId("golden-core-longevity-level"), `当前：${state.goldenCoreLongevityLevel}/2级；健身上限 +${state.goldenCoreLongevityLevel * 10}；本能力健身倍率 ×${additiveLevelMultiplier(state.goldenCoreLongevityLevel, 4).toFixed(2)}`);
    setTextIfChanged(byId("golden-core-longevity-cost"), state.goldenCoreLongevityLevel >= 2 ? "已达到等级上限" : `消耗 ${formatCost(nextGoldenCoreLongevityCost)} 法力`);
    setTextIfChanged(byId("buy-golden-core-longevity"), state.goldenCoreLongevityLevel >= 2 ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-golden-core-longevity"), !state.goldenCoreUnlocked || state.goldenCoreLongevityLevel >= 2 || !canAffordMana(nextGoldenCoreLongevityCost));
    setPreviewText(byId("mana-solidification-preview"), () => state.manaSolidificationUnlocked
      ? "当前：法力 ×0.90；战力 ×1.15；吐纳 J 曲线指数 +0.4"
      : "解锁后：法力 ×0.90；战力 ×1.15；吐纳 J 曲线指数 +0.4");
    setTextIfChanged(byId("mana-solidification-cost"), `消耗 ${formatCost(MANA_SOLIDIFICATION_COST)} 法力`);
    setPreviewText(byId("minor-technique-preview"), () => state.minorTechniqueUnlocked
      ? `已提供 +2个百分点；当前周天比例 ${format(mulBN(circulationPercent(), 100), 1)}%`
      : "解锁后：周天比例 6% → 8%");
    writeSourcePreview("magic-treasure-preview", "magicTreasure", true);
    setPreviewText(byId("material-control-preview"), () => `${state.materialControlUnlocked ? "当前：" : "解锁后："}法宝来源倍率 ×5.00`);
    setPreviewText(byId("divine-sense-preview"), () => `${state.divineSenseUnlocked ? "当前：" : "解锁后："}有效探寻量 ×1.25`);
    const greatCultivatorPreviewMultiplier = state.greatCultivatorUnlocked
      ? greatCultivatorJMultiplier()
      : additiveLevelMultiplier(cultivationRealmLevel(), 1.5);
    setPreviewText(byId("great-cultivator-preview"), () => `${state.greatCultivatorUnlocked ? "当前：" : "解锁后："}J 获取倍率 ×${greatCultivatorPreviewMultiplier.toFixed(2)}（${cultivationRealmLevel()}个境界，内部加算）`);
    setPreviewText(byId("second-nascent-soul-preview"), () => state.secondNascentSoulUnlocked
      ? `当前周天最终比例 ${format(mulBN(circulationPercent(), 100), 1)}%（基础合计 ×1.8）`
      : "解锁后：周天最终比例 ×1.8");
    setHiddenIfChanged(byId("spirit-transformation-abilities"), !advancedRealmAbilityGroupVisible(1));
    const spiritWorldAscensionTreasureCap = addBN(naturalTreasureCap, state.spiritWorldAscensionUnlocked ? 0 : 10);
    setPreviewText(byId("spirit-world-ascension-preview"), () => `${state.spiritWorldAscensionUnlocked ? "当前：" : "解锁后："}探寻法力 ×${CONFIG.exploration.spiritWorldAscensionMultiplier}；天材地宝上限 ${spiritWorldAscensionTreasureCap}`);
    setPreviewText(byId("aura-control-preview"), () => `${state.auraControlUnlocked ? "当前：" : "解锁后："}吐纳法力获取倍率 ×${format(auraControlPotentialMultiplier(), 2)}`);
    setPreviewText(byId("equal-heaven-longevity-preview"), () => `${state.equalHeavenLongevityUnlocked ? "当前：" : "解锁后："}健身 ×8；等级上限 +10`);
    setPreviewText(byId("five-elements-preview"), () => state.fiveElementsUnlocked
      ? `当前周天比例 ${format(mulBN(circulationPercent(), 100), 1)}%`
      : "解锁后：周天比例 +5个百分点");
    const abundantAuraPotentialExponent = breathingJCurveExponent() + (state.abundantAuraUnlocked
      ? 0
      : 0.8 + (state.manaLiquefactionUnlocked ? 0.4 : 0) + (state.manaSolidificationUnlocked ? 0.6 : 0));
    setPreviewText(byId("abundant-aura-preview"), () => `${state.abundantAuraUnlocked ? "当前：" : "解锁后："}吐纳 J 曲线指数 ${abundantAuraPotentialExponent.toFixed(1)}`);
    const currentTribulationManaExponent = minorTribulationExplorationManaExponent();
    const tribulationElement = byId("minor-tribulation-preview");
    const explorationSnapshot = explorationPreviewSnapshot("tribulation", tribulationElement);
    if (explorationSnapshot) {
    ensureExplorationPreviewRefresh(tribulationElement);
    const currentExplorationAmount = explorationSnapshot.value.amount;
    const nextTribulationPreview = explorationSnapshot.value.tribulationPreview;
    setPreviewText(byId("minor-tribulation-preview"), () => state.advancedRealmLevel >= 6
      ? "飞升仙界已使小天劫完全失效；负荷固定为0"
      : `小天劫负荷 ${format(state.minorTribulationExplorationLoad)}/${format(minorTribulationTriggerLoad())}；下次探寻约 +${format(currentExplorationAmount)}`);
    setTextIfChanged(byId("minor-tribulation-recovery"), state.advancedRealmLevel >= 6
      ? "战力与探寻均不再受小天劫影响"
      : `战力 ^${minorTribulationPowerExponent().toFixed(3)}；下次探寻法力 ^${nextTribulationPreview.manaExponent.toFixed(3)}（${nextTribulationPreview.triggered ? `本次触发，负荷强度 ${format(nextTribulationPreview.loadFactor)}` : `未触发，基础指数 ^${currentTribulationManaExponent.toFixed(3)}`}）`);
    }
    setPreviewText(byId("enhanced-minor-tribulation-preview"), () => state.advancedRealmLevel >= 3
      ? `当前：战力区域 ^${minorTribulationPowerExponent().toFixed(3)}；探寻基础指数 ${currentTribulationManaExponent.toFixed(3)}，触发区间 0.800～0.920，仅作用于本次探寻`
      : "等待炼虚");
    writeSourcePreview("brahma-demon-art-preview", "brahmaDemonArt", true);
    nextTrueSpiritTransformationCost = trueSpiritTransformationCost();
    setPreviewText(byId("true-spirit-transformation-preview"), () => `当前：${state.trueSpiritTransformationLevel}/5级；法力获取倍率 ×${trueSpiritTransformationMultiplier().toFixed(2)}`);
    setTextIfChanged(byId("true-spirit-transformation-cost"), state.trueSpiritTransformationLevel >= 5
      ? "已达到等级上限"
      : `消耗 ${formatCost(nextTrueSpiritTransformationCost)} 法力`);
    setPreviewText(byId("silver-tadpole-script-preview"), () => state.silverTadpoleScriptUnlocked
      ? `当前小天劫门槛 ${format(minorTribulationTriggerLoad())}；探寻法力 ^${silverTadpoleScriptExplorationExponent().toFixed(2)}`
      : "解锁后：小天劫门槛 150 → 1500；探寻法力 ^1.06");
    setPreviewText(byId("void-refining-to-qi-preview"), () => `${state.voidRefiningToQiUnlocked ? "当前：" : "解锁后："}吐纳来源 ^1.06`);
    setPreviewText(byId("immortal-realm-divine-preview"), () => `${state.immortalRealmDivineAbilityUnlocked ? "当前：" : "解锁后："}吐纳法力获取倍率 ×${format(immortalRealmDivineAbilityPotentialMultiplier(), 2)}`);
    setPreviewText(byId("spirit-refining-art-preview"), () => `${state.spiritRefiningArtUnlocked ? "当前：" : "解锁后："}法力 J 来源 ^1.06`);
    setPreviewText(byId("perfected-technique-preview"), () => `${state.perfectedTechniqueUnlocked ? "当前：" : "解锁后："}周天比例 ×1.5`);
    const heavenEarthAuraPreviewExponent = breathingJCurveExponent() + (state.heavenEarthAuraUnlocked ? 0 : 0.25);
    setPreviewText(byId("heaven-earth-aura-preview"), () => `${state.heavenEarthAuraUnlocked ? "当前：" : "解锁后："}吐纳 J 曲线指数 ${heavenEarthAuraPreviewExponent.toFixed(2)}`);
    setPreviewText(byId("divine-ability-mastery-preview"), () => `${state.divineAbilityMasteryUnlocked ? "当前：" : "解锁后："}全部法力 ×2.5`);
    setPreviewText(byId("dual-infant-unity-preview"), () => `${state.dualInfantUnityUnlocked ? "当前：" : "解锁后："}周天法力来源 ^1.08`);
    setPreviewText(byId("aura-into-body-preview"), () => `${state.auraIntoBodyUnlocked ? "当前：" : "解锁后："}健身 J ×20；健身上限 +40`);
    setPreviewText(byId("external-incarnation-preview"), () => `${state.externalIncarnationUnlocked ? "当前：" : "解锁后："}梵圣真魔功 ×5`);
    setPreviewText(byId("demon-realm-journey-preview"), () => `${state.demonRealmJourneyUnlocked ? "当前：" : "解锁后："}普通探寻 ×5；仙道宝物进度获取 ×3`);
    setPreviewText(byId("return-to-origin-preview"), () => `${state.returnToOriginUnlocked ? "当前：" : "解锁后："}J 区域 ^1.02`);
    setPreviewText(byId("natal-magic-treasure-preview"), () => `${state.natalMagicTreasureUnlocked ? "当前：" : "解锁后："}前期边际 ^${(state.natalMagicTreasureUnlocked ? magicTreasureManaExponent() : MAGIC_TREASURE_MANA_CURVE_CONFIG.earlyExponent).toFixed(2)}，平滑衰减至后期边际 ^${MAGIC_TREASURE_MANA_CURVE_CONFIG.lateExponent.toFixed(2)}`);
    setPreviewText(byId("perfected-technique-completion-preview"), () => `${state.perfectedTechniqueCompletionUnlocked ? "当前：" : "解锁后："}周天比例 ×1.5`);
    writeSourcePreview("roam-spirit-world-preview", "automaticExploration", true);
    setPreviewText(byId("descend-realm-preview"), () => `${state.descendRealmUnlocked ? "当前：" : "解锁后："}仙道宝物进度获取 ×${format(descendRealmPotentialTreasureMultiplier(), 3)}`);
    setPreviewText(byId("nascent-soul-completion-preview"), () => `${state.nascentSoulCompletionUnlocked ? "当前：" : "解锁后："}周天法力来源 ^1.08${state.dualInfantUnityUnlocked || state.nascentSoulCompletionUnlocked ? `（${state.nascentSoulCompletionUnlocked ? "当前合计" : "解锁后合计"} ^${(1.08 * (state.dualInfantUnityUnlocked ? 1.08 : 1)).toFixed(4)}）` : ""}`);
    setPreviewText(byId("spirit-travel-void-preview"), () => `${state.spiritTravelVoidUnlocked ? "当前：" : "解锁后："}强化小天劫门槛 ${format(state.spiritTravelVoidUnlocked ? minorTribulationTriggerLoad() : 150000)}`);
    setPreviewText(byId("golden-seal-script-preview"), () => `${state.goldenSealScriptUnlocked ? "当前：" : "解锁后："}法力区域 ×8`);
    setPreviewText(byId("ascend-immortal-world-preview"), () => state.advancedRealmLevel >= 6
      ? "已生效：小天劫失效；仙道宝物进度获取 ×3"
      : "等待真仙");
    toggleClassIfChanged(byId("immortal-spirit-power-ability"), "purchased", state.immortalSpiritPowerUnlocked);
    writeSourcePreview("immortal-spirit-power-preview", "immortalPower");
    setTextIfChanged(byId("immortal-spirit-power-state"), state.immortalSpiritPowerUnlocked ? "已自动解锁" : "等待真仙");
    setPreviewText(byId("undying-primordial-spirit-preview"), () => `${state.undyingPrimordialSpiritUnlocked ? "当前：" : "解锁后："}周天法力来源 ^1.03`);
    const currentImmortalApertureCap = immortalApertureCap();
    toggleClassIfChanged(byId("immortal-aperture-ability"), "purchased", state.immortalApertureLevel >= currentImmortalApertureCap);
    byId("immortal-aperture-ability").dataset.sortCost = String(state.immortalApertureLevel >= currentImmortalApertureCap ? Number.MAX_SAFE_INTEGER : nextImmortalApertureCost);
    setTextIfChanged(byId("immortal-aperture-level"), `当前：${state.immortalApertureLevel}/${currentImmortalApertureCap}级；仙灵力 ×${immortalApertureMultiplier().toFixed(3)}`);
    setTextIfChanged(byId("immortal-aperture-cost"), state.immortalApertureLevel >= currentImmortalApertureCap ? "已达到当前等级上限" : `消耗 ${formatCost(nextImmortalApertureCost)} 仙灵力`);
    setTextIfChanged(byId("buy-immortal-aperture"), state.immortalApertureLevel >= currentImmortalApertureCap ? "已达当前上限" : "升级");
    setDisabledIfChanged(byId("buy-immortal-aperture"), state.advancedRealmLevel < 6 || state.immortalApertureLevel >= currentImmortalApertureCap || !canAffordImmortalPower(nextImmortalApertureCost));
    setPreviewText(byId("xuan-immortal-body-preview"), () => `${state.xuanImmortalBodyUnlocked ? "当前：" : "解锁后："}梵圣真魔功 ^1.40`);
    const lawPreviewMultiplier = state.lawUnlocked
      ? lawImmortalPowerMultiplier()
      : lawImmortalPowerPotentialMultiplier();
    setPreviewText(byId("law-preview"), () => `${state.lawUnlocked ? "当前" : "解锁后"}：原始 ^${lawImmortalPowerExponent().toFixed(2)}；衰减后 ^${format(lawImmortalPowerActualExponent(), 3)}；实际 ×${format(lawPreviewMultiplier, 3)}`);
    writeSourcePreview("spirit-domain-preview", "spiritDomain", true);
    setPreviewText(byId("spirit-capture-return-preview"), () => `${state.spiritCaptureReturnUnlocked ? "当前" : "解锁后"}：仙灵力 ×${format(spiritCaptureReturnMultiplier(), 3)}`);
    setPreviewText(byId("flawless-jade-body-preview"), () => `五衰基础 ^${celestialFiveDeclineBaseExponent().toFixed(3)} → 实际 ^${celestialFiveDeclineExponent().toFixed(3)}`);
    setPreviewText(byId("soul-qualitative-change-preview"), () => `${state.soulQualitativeChangeUnlocked ? "当前" : "解锁后"}：吐纳来源 ×${format(soulQualitativeChangeMultiplier(), 3)}`);
    const advancedAbilityAvailability = (cost, requiredLevel, prerequisite = true) =>
      state.advancedRealmLevel >= requiredLevel && prerequisite && canAffordImmortalPower(cost);
    updateOneTimeUnlock("immortal-aperture-ii-ability", "unlock-immortal-aperture-ii", state.immortalApertureIIUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureII, 7));
    updateOneTimeUnlock("spirit-domain-ability", "unlock-spirit-domain", state.spiritDomainUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.spiritDomain, 7));
    updateOneTimeUnlock("threads-of-law-ability", "unlock-threads-of-law", state.threadsOfLawUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.threadsOfLaw, 7));
    updateOneTimeUnlock("immortal-aperture-iii-ability", "unlock-immortal-aperture-iii", state.immortalApertureIIIUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureIII, 7, state.immortalApertureIIUnlocked));
    updateOneTimeUnlock("spirit-capture-return-ability", "unlock-spirit-capture-return", state.spiritCaptureReturnUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.spiritCaptureReturn, 7));
    updateOneTimeUnlock("indestructible-dharma-body-ability", "unlock-indestructible-dharma-body", state.indestructibleDharmaBodyUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.indestructibleDharmaBody, 7));
    updateOneTimeUnlock("five-elements-treasure-ability", "unlock-five-elements-treasure", state.fiveElementsTreasureUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.fiveElementsTreasure, 7));
    updateOneTimeUnlock("immortal-aperture-iv-ability", "unlock-immortal-aperture-iv", state.immortalApertureIVUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureIV, 7, state.immortalApertureIIIUnlocked));
    updateOneTimeUnlock("immortal-aperture-v-ability", "unlock-immortal-aperture-v", state.immortalApertureVUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureV, 8, state.immortalApertureIVUnlocked));
    updateOneTimeUnlock("law-affinity-ability", "unlock-law-affinity", state.lawAffinityUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.lawAffinity, 8, state.threadsOfLawUnlocked));
    updateOneTimeUnlock("flawless-jade-body-ability", "unlock-flawless-jade-body", state.flawlessJadeBodyUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.flawlessJadeBody, 8));
    updateOneTimeUnlock("spirit-domain-world-transformation-ability", "unlock-spirit-domain-world-transformation", state.spiritDomainWorldTransformationUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.spiritDomainWorldTransformation, 8, state.spiritDomainUnlocked));
    updateOneTimeUnlock("immortal-aperture-vi-ability", "unlock-immortal-aperture-vi", state.immortalApertureVIUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureVI, 8, state.immortalApertureVUnlocked));
    updateOneTimeUnlock("soul-qualitative-change-ability", "unlock-soul-qualitative-change", state.soulQualitativeChangeUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.soulQualitativeChange, 8));
    updateOneTimeUnlock("immortal-aperture-vii-ability", "unlock-immortal-aperture-vii", state.immortalApertureVIIUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.immortalApertureVII, 8, state.immortalApertureVIUnlocked));
    setPreviewText(byId("trinity-preview"), () => `${state.trinityUnlocked ? "当前：" : "解锁后："}仙灵力 ×${format(trinityImmortalPowerMultiplier(), 3)}`);
    setPreviewText(byId("unity-with-dao-preview"), () => `${state.unityWithDaoUnlocked ? "当前：" : "解锁后："}仙灵力区域 ^${format(unityWithDaoExponent(), 4)}`);
    setPreviewText(byId("law-origin-preview"), () => `${state.lawOriginUnlocked ? "当前：" : "解锁后："}最终法则倍率 ^1.20`);
    const lawCrystalDetails = lawCrystalFilamentDetails();
    setPreviewText(byId("law-crystal-filament-preview"), () => `当前法则倍率 ×${format(lawCrystalDetails.lawMultiplier)}；y=${format(lawCrystalDetails.magnitude, 5)}；${state.lawCrystalFilamentUnlocked ? "当前" : "解锁后"}战力区域 ^${format(lawCrystalDetails.exponent, 5)}；渐近上限 ^${format(lawCrystalDetails.maximumExponent, 2)}`);
    setHiddenIfChanged(byId("dao-ancestor-abilities"), !daoAncestorActive());
    if (daoAncestorActive()) {
      setPreviewText(byId("dao-time-law-preview"), () => state.daoTimeLawUnlocked
        ? `当前：四类资源获取 ^${daoTimeLawExponent().toFixed(4)}（本次转生 ${formatElapsedTime(state.reincarnationElapsedSeconds)}）`
        : "解锁后：按本次转生时间提升四类资源");
      setPreviewText(byId("dao-law-unity-preview"), () => state.daoLawUnityUnlocked
        ? `当前：最终法则倍率 ^${CONFIG.immortalPower.daoAncestor.lawMultiplierExponent.toFixed(2)}；实际 ×${format(lawImmortalPowerMultiplier())}`
        : `解锁后：最终法则倍率 ^${CONFIG.immortalPower.daoAncestor.lawMultiplierExponent.toFixed(2)}`);
    writeSourcePreview("dao-power-preview", "daoPower", true);
      setPreviewText(byId("dao-assimilation-preview"), () => state.daoAssimilationUnlocked
        ? `当前：每层正常软上限损失保留 ×${daoAssimilationQ().toFixed(4)}`
        : "解锁后：逐层弱化正常量级软上限");
      setPreviewText(byId("dao-domain-preview"), () => state.daoDomainUnlocked
        ? `当前：灵域来源 ^${daoDomainExponent().toFixed(4)}`
        : "解锁后：灵域来源获得无上限指数");
    }
    updateOneTimeUnlock("dao-law-unity-ability", "unlock-dao-law-unity", state.daoLawUnityUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.daoLawUnity, 10));
    updateOneTimeUnlock("dao-domain-ability", "unlock-dao-domain", state.daoDomainUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.daoDomain, 10));
    updateOneTimeUnlock("dao-power-ability", "unlock-dao-power", state.daoPowerUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.daoPower, 10));
    updateOneTimeUnlock("dao-time-law-ability", "unlock-dao-time-law", state.daoTimeLawUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.daoTimeLaw, 10));
    updateOneTimeUnlock("dao-assimilation-ability", "unlock-dao-assimilation", state.daoAssimilationUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.daoAssimilation, 10));
    updateOneTimeUnlock("trinity-ability", "unlock-trinity", state.trinityUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.trinity, 9));
    updateOneTimeUnlock("unity-with-dao-ability", "unlock-unity-with-dao", state.unityWithDaoUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.unityWithDao, 9));
    updateOneTimeUnlock("law-origin-ability", "unlock-law-origin", state.lawOriginUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.lawOrigin, 9));
    updateOneTimeUnlock("law-crystal-filament-ability", "unlock-law-crystal-filament", state.lawCrystalFilamentUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.lawCrystalFilament, 9));
    updateOneTimeUnlock("sever-three-corpses-ability", "unlock-sever-three-corpses", state.threeCorpseChallengesUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.severThreeCorpses, 9));
    updateOneTimeUnlock("ultimate-immortal-aperture-ability", "unlock-ultimate-immortal-aperture", state.ultimateImmortalApertureUnlocked, advancedAbilityAvailability(ADVANCED_IMMORTAL_ABILITY_COSTS.ultimateImmortalAperture, 9, Immortal.ultimateImmortalAperturePrerequisiteMet()));
    toggleClassIfChanged(byId("mystic-heavenly-treasure-ability"), "purchased", state.mysticHeavenlyTreasureLevel >= 3);
    setTextIfChanged(byId("mystic-heavenly-treasure-level"), `当前：${state.mysticHeavenlyTreasureLevel}/3级；已解锁：${["无", "仙道·幻天镜", "仙道·幻天镜、仙道·玄天圣树", "仙道·幻天镜、仙道·玄天圣树、仙道·玄天斩灵剑"][state.mysticHeavenlyTreasureLevel]}`);
    setTextIfChanged(byId("mystic-heavenly-treasure-cost"), state.mysticHeavenlyTreasureLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextMysticHeavenlyTreasureCost)} 法力`);
    setTextIfChanged(byId("buy-mystic-heavenly-treasure"), state.mysticHeavenlyTreasureLevel >= 3 ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-mystic-heavenly-treasure"), state.mysticHeavenlyTreasureLevel >= 3 || state.advancedRealmLevel < 5 || !canAffordMana(nextMysticHeavenlyTreasureCost));
    toggleClassIfChanged(byId("heavenly-treasure-ability"), "purchased", state.heavenlyTreasureLevel >= 3);
    setTextIfChanged(byId("heavenly-treasure-level"), `当前：${state.heavenlyTreasureLevel}/3级；已解锁：${["无", "仙道·虚天鼎", "仙道·虚天鼎、仙道·八灵尺", "仙道·虚天鼎、仙道·八灵尺、仙道·万妖幡"][state.heavenlyTreasureLevel]}`);
    setTextIfChanged(byId("heavenly-treasure-cost"), state.heavenlyTreasureLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextHeavenlyTreasureCost)} 法力`);
    setTextIfChanged(byId("buy-heavenly-treasure"), state.heavenlyTreasureLevel >= 3 ? "已达上限" : "升级");
    setDisabledIfChanged(byId("buy-heavenly-treasure"), state.heavenlyTreasureLevel >= 3 || !canAffordMana(nextHeavenlyTreasureCost));
    const currentScatterEffectLevel = effectiveScatterRebuildLevel();
    const reachedMahayanaThisRun = Immortal.hasReachedMahayanaThisRun();
    const scatterRebuildAvailable = Immortal.canScatterAndRebuild();
    toggleClassIfChanged(byId("scatter-rebuild-ability"), "purchased", currentScatterEffectLevel >= 3);
    setTextIfChanged(byId("scatter-rebuild-level"), `当前：散功效果 ${currentScatterEffectLevel}/3级；强化保留 ${state.scatterRetentionLevel}/3级`);
    const nextScatterLevel = currentScatterEffectLevel + 1;
    setTextIfChanged(byId("scatter-rebuild-description"), reachedMahayanaThisRun
      ? "本轮已达大乘，不可再散功重修；大乘奖励已补齐三次转世重修效果。"
      : currentScatterEffectLevel >= 3
        ? `散功效果已达上限；当前强化保留至${SCATTER_RETAINED_UPGRADE_TIERS[state.scatterRetentionLevel] ?? "无"}。转世自带的散功效果不会提供强化保留。`
        : `第${nextScatterLevel}次将保留${SCATTER_RETAINED_UPGRADE_TIERS[nextScatterLevel]}强化；更高量级强化、资源、量级与境界重置，仙道能力继续保留。`);
    setPreviewText(byId("scatter-rebuild-preview"), () => `结丹需求 ×${format(additiveLevelMultiplier(currentScatterEffectLevel, 2), 0)}；元婴需求 ×${Math.max(0.1, 1 - 0.2 * currentScatterEffectLevel).toFixed(2)}；吐纳法力 ×${scatterRebuildManaMultiplier().toFixed(2)}`);
    setTextIfChanged(byId("scatter-rebuild"), reachedMahayanaThisRun
      ? "大乘后不可重修"
      : currentScatterEffectLevel >= 3 ? "已达上限" : "散功重修");
    setDisabledIfChanged(byId("scatter-rebuild"), !scatterRebuildAvailable);
    const nextReincarnationLevel = state.reincarnationLevel + 1;
    const nextReincarnationRoot = REINCARNATION_ROOTS[nextReincarnationLevel];
    toggleClassIfChanged(byId("reincarnation-ability"), "purchased", state.reincarnationLevel >= 3);
    const reincarnationAvailable = Immortal.canReincarnate();
    setTextIfChanged(byId("reincarnation-description"), reachedMahayanaThisRun
      ? "本轮已达大乘，不可再转世重修；大乘奖励已补齐三次转世重修效果。"
      : state.reincarnationLevel >= 3
        ? "本轮三次转世均已完成；挑战会把本轮转世与散功次数重置为0，但不会降低永久灵根。"
        : "提升永久灵根并重置本轮进度；挑战完成次数保留。挑战会重置本轮转世与散功次数，但不会降低灵根。");
    setTextIfChanged(byId("reincarnation-level"), `当前：永久灵根 ${state.permanentRootLevel}/3级（${activeRootName()}）；本轮转世 ${state.reincarnationLevel}/3次；法力 J 来源 ^${reincarnationManaJExponent().toFixed(2)}`);
    const nextPermanentRootLevel = Math.max(state.permanentRootLevel, nextReincarnationLevel);
    const nextPermanentRoot = REINCARNATION_ROOTS[nextPermanentRootLevel];
    setPreviewText(byId("reincarnation-preview"), () => nextReincarnationRoot
      ? `下一次：${nextPermanentRootLevel > state.permanentRootLevel ? `获得${nextPermanentRoot.name}` : `保持${nextPermanentRoot.name}`}；转世效果升至${nextReincarnationLevel}级，重返元婴后法力 J 来源 ^${[1, 1.05, 1.1, 1.15][nextReincarnationLevel].toFixed(2)}`
      : "本轮转世已达上限；开启挑战后可重新进行转世，永久灵根不会降低");
    setTextIfChanged(byId("reincarnate"), reachedMahayanaThisRun
      ? "大乘后不可重修"
      : state.reincarnationLevel >= 3 ? "已达上限" : "转世重修");
    setDisabledIfChanged(byId("reincarnate"), !reincarnationAvailable);
    }
    }
    if (renderTreasures) {
    const pearlCount = tianNiPearlCount();
    const greenBottleCount = mysteriousGreenBottleCount();
    const currentFuBaoCount = fuBaoCount();
    const membershipCardCount = fitnessMembershipCardCount();
    const currentSuperLollipopCount = superLollipopCount();
    const currentSkyCrystalCount = skyCrystalCount();
    const currentCosmicFiberCount = cosmicFiberCount();
    const currentCosmicWillCount = cosmicWillCount();
    const currentXuTianDingCount = xuTianDingCount();
    const currentBaLingChiCount = baLingChiCount();
    const currentWanYaoFanCount = wanYaoFanCount();
    const currentPhantomHeavenMirrorCount = phantomHeavenMirrorCount();
    const currentMysticHeavenSacredTreeCount = mysticHeavenSacredTreeCount();
    const currentMysticHeavenSpiritSlayingSwordCount = mysticHeavenSpiritSlayingSwordCount();
    const currentFiveElementsTreasureCount = fiveElementsTreasureCount();
    const currentImmortalCrystalCount = immortalCrystalCount();
    const currentFiveSpiritStoneCount = fiveSpiritStoneCount();
    setHiddenIfChanged(byId("tian-ni-pearl-treasure"), !hasAchievement("daoFoundation"));
    setTextIfChanged(byId("tian-ni-pearl-count"), `×${format(pearlCount, 0)}`);
    setTextIfChanged(byId("tian-ni-pearl-chance"), treasureProgressText("tianNiPearl"));
    setTextIfChanged(byId("tian-ni-pearl-effect"), `法力获取 ×${format(WIS.Core.Effects.value("tianNiPearlMana", state), 2)}`);
    setHiddenIfChanged(byId("mysterious-green-bottle-treasure"), !hasAchievement("goldenCore"));
    setTextIfChanged(byId("mysterious-green-bottle-count"), `×${format(greenBottleCount, 0)}`);
    setTextIfChanged(byId("mysterious-green-bottle-chance"), treasureProgressText("mysteriousGreenBottle"));
    setTextIfChanged(byId("mysterious-green-bottle-effect"), `探寻法力获取 ×${format(mysteriousGreenBottleMultiplier(), 2)}`);
    setHiddenIfChanged(byId("fu-bao-treasure"), !hasAchievement("trueScale3"));
    setTextIfChanged(byId("fu-bao-count"), `×${format(currentFuBaoCount, 0)}`);
    setTextIfChanged(byId("fu-bao-chance"), treasureProgressText("fuBao"));
    setTextIfChanged(byId("fu-bao-effect"), `额外法力为探寻基础法力的 ${format(mulBN(fuBaoManaRatio(), 100), 2)}%`);
    setHiddenIfChanged(byId("fitness-membership-card-treasure"), !hasAchievement("scale5"));
    setTextIfChanged(byId("fitness-membership-card-count"), `×${format(membershipCardCount, 0)}`);
    setTextIfChanged(byId("fitness-membership-card-chance"), treasureProgressText("fitnessMembershipCard"));
    setTextIfChanged(byId("fitness-membership-card-effect"), `健身倍率加法 +${format(fitnessMembershipCardFitnessBonus(), 3)}`);
    setHiddenIfChanged(byId("super-lollipop-treasure"), !hasAchievement("scale8") && !gtBN(currentSuperLollipopCount, ZERO));
    setTextIfChanged(byId("super-lollipop-count"), `×${format(currentSuperLollipopCount, 0)}`);
    setTextIfChanged(byId("super-lollipop-chance"), treasureProgressText("superLollipop"));
    setTextIfChanged(byId("super-lollipop-effect"), `锻炼来源倍率 ×${format(WIS.Core.Effects.value("superLollipop", state), 2)}`);
    setHiddenIfChanged(byId("sky-crystal-treasure"), !hasAchievement("scale9") && !gtBN(currentSkyCrystalCount, ZERO));
    setTextIfChanged(byId("sky-crystal-count"), `×${format(currentSkyCrystalCount, 0)}`);
    setTextIfChanged(byId("sky-crystal-chance"), treasureProgressText("skyCrystal"));
    setTextIfChanged(byId("sky-crystal-effect"), `打岩来源倍率 ×${format(skyCrystalRockMultiplier(), 2)}`);
    setHiddenIfChanged(byId("cosmic-fiber-treasure"), !hasAchievement("scale13") && !gtBN(currentCosmicFiberCount, ZERO));
    setTextIfChanged(byId("cosmic-fiber-count"), `×${format(currentCosmicFiberCount, 0)}`);
    setTextIfChanged(byId("cosmic-fiber-base-chance"), "");
    setTextIfChanged(byId("cosmic-fiber-decayed-chance"), "");
    setTextIfChanged(byId("cosmic-fiber-final-chance"), treasureProgressText("cosmicFiber"));
    setTextIfChanged(byId("cosmic-fiber-effect"), `当前银河视为指数 ^${format(galaxyEffectiveExponent(), 6)}`);
    setHiddenIfChanged(byId("cosmic-will-treasure"), !hasAchievement("scale14") && !gtBN(currentCosmicWillCount, ZERO));
    setTextIfChanged(byId("cosmic-will-count"), `×${format(currentCosmicWillCount, 0)}`);
    setTextIfChanged(byId("cosmic-will-decayed-chance"), "");
    setTextIfChanged(byId("cosmic-will-final-chance"), treasureProgressText("cosmicWill"));
    setTextIfChanged(byId("cosmic-will-effect"), "当前暂无效果");
    setHiddenIfChanged(byId("xu-tian-ding-treasure"), state.heavenlyTreasureLevel < 1 && !gtBN(currentXuTianDingCount, ZERO));
    setTextIfChanged(byId("xu-tian-ding-count"), `×${format(currentXuTianDingCount, 0)}`);
    setTextIfChanged(byId("xu-tian-ding-chance"), treasureProgressText("xuTianDing"));
    setTextIfChanged(byId("xu-tian-ding-effect"), `天材地宝倍率 ×${format(WIS.Core.Effects.value("naturalTreasureMana", state), 3)}`);
    setHiddenIfChanged(byId("ba-ling-chi-treasure"), state.heavenlyTreasureLevel < 2 && !gtBN(currentBaLingChiCount, ZERO));
    setTextIfChanged(byId("ba-ling-chi-count"), `×${format(currentBaLingChiCount, 0)}`);
    setTextIfChanged(byId("ba-ling-chi-chance"), treasureProgressText("baLingChi"));
    setTextIfChanged(byId("ba-ling-chi-effect"), `健身倍率 ×${format(WIS.Core.Effects.value("baLingChiFitness", state), 3)}`);
    setHiddenIfChanged(byId("wan-yao-fan-treasure"), state.heavenlyTreasureLevel < 3 && !gtBN(currentWanYaoFanCount, ZERO));
    setTextIfChanged(byId("wan-yao-fan-count"), `×${format(currentWanYaoFanCount, 0)}`);
    setTextIfChanged(byId("wan-yao-fan-chance"), treasureProgressText("wanYaoFan"));
    setTextIfChanged(byId("wan-yao-fan-effect"), `法宝来源倍率 ×${format(wanYaoFanMultiplier(), 3)}`);
    setHiddenIfChanged(byId("phantom-heaven-mirror-treasure"), state.mysticHeavenlyTreasureLevel < 1 && !gtBN(currentPhantomHeavenMirrorCount, ZERO));
    setTextIfChanged(byId("phantom-heaven-mirror-count"), `×${format(currentPhantomHeavenMirrorCount, 0)}`);
    setTextIfChanged(byId("phantom-heaven-mirror-chance"), treasureProgressText("phantomHeavenMirror"));
    setTextIfChanged(byId("phantom-heaven-mirror-effect"), `天劫负荷门槛 ×${format(phantomHeavenMirrorLoadMultiplier(), 0)}`);
    setHiddenIfChanged(byId("mystic-heaven-sacred-tree-treasure"), state.mysticHeavenlyTreasureLevel < 2 && !gtBN(currentMysticHeavenSacredTreeCount, ZERO));
    setTextIfChanged(byId("mystic-heaven-sacred-tree-count"), `×${format(currentMysticHeavenSacredTreeCount, 0)}`);
    setTextIfChanged(byId("mystic-heaven-sacred-tree-chance"), treasureProgressText("mysticHeavenSacredTree"));
    setTextIfChanged(byId("mystic-heaven-sacred-tree-effect"), `天材地宝上限 +${format(mulBN(currentMysticHeavenSacredTreeCount, 2), 0)}`);
    setHiddenIfChanged(byId("mystic-heaven-spirit-slaying-sword-treasure"), state.mysticHeavenlyTreasureLevel < 3 && !gtBN(currentMysticHeavenSpiritSlayingSwordCount, ZERO));
    setTextIfChanged(byId("mystic-heaven-spirit-slaying-sword-count"), `×${format(currentMysticHeavenSpiritSlayingSwordCount, 0)}`);
    setTextIfChanged(byId("mystic-heaven-spirit-slaying-sword-chance"), treasureProgressText("mysticHeavenSpiritSlayingSword"));
    setTextIfChanged(byId("mystic-heaven-spirit-slaying-sword-effect"), `法宝来源 ^${format(mysticHeavenSpiritSlayingSwordExponent(), 3)}`);
    setHiddenIfChanged(byId("five-elements-treasure"), !state.fiveElementsTreasureUnlocked && !gtBN(currentFiveElementsTreasureCount, ZERO));
    setTextIfChanged(byId("five-elements-treasure-count"), `×${format(currentFiveElementsTreasureCount, 0)}`);
    setTextIfChanged(byId("five-elements-treasure-chance"), treasureProgressText("fiveElementsTreasure"));
    setTextIfChanged(byId("five-elements-treasure-effect"), `仙灵力获取 ×${format(applyCelestialFiveDeclineToMultiplier(fiveElementsTreasureMultiplierBeforeDecline()), 3)}`);
    setHiddenIfChanged(byId("immortal-crystal-treasure"), !hasAchievement("ascendImmortal") && !gtBN(currentImmortalCrystalCount, ZERO));
    setTextIfChanged(byId("immortal-crystal-count"), `×${format(currentImmortalCrystalCount, 0)}`);
    setTextIfChanged(byId("immortal-crystal-chance"), treasureProgressText("immortalCrystal"));
    setTextIfChanged(byId("immortal-crystal-effect"), `仙灵力倍率 ×${format(immortalCrystalMultiplier(), 6)}`);
    setHiddenIfChanged(byId("five-spirit-stone-treasure"), !state.fiveSpiritStonePurchased && !gtBN(currentFiveSpiritStoneCount, ZERO));
    setTextIfChanged(byId("five-spirit-stone-count"), `×${format(currentFiveSpiritStoneCount, 0)}`);
    setTextIfChanged(byId("five-spirit-stone-chance"), treasureProgressText("fiveSpiritStone"));
    writeSourcePreview("five-spirit-stone-effect", ["fiveSpiritStoneJ", "fiveSpiritStonePower"], false);
    WIS.UI.Cards.updateCatalogGroupCounts(byId("treasure-list"), "宝物");
    }
    if (renderStatistics) {
    setTextIfChanged(byId("statistics-highest-j"), format(state.lifetimeHighestJ));
    setTextIfChanged(byId("statistics-highest-power"), format(state.lifetimeHighestPower));
    setTextIfChanged(byId("statistics-highest-scale"), SCALE_THRESHOLDS[state.lifetimeHighestScaleIndex].name);
    setTextIfChanged(byId("statistics-total-j"), format(state.lifetimeTotalJ));
    setTextIfChanged(byId("statistics-total-power"), format(state.lifetimeTotalPower));
    setTextIfChanged(byId("statistics-highest-realm"), cultivationRealmName(state.lifetimeHighestCultivationRealmLevel));
    setTextIfChanged(byId("statistics-highest-mana"), format(state.lifetimeHighestMana));
    setTextIfChanged(byId("statistics-total-mana"), format(state.lifetimeTotalMana));
    setTextIfChanged(byId("statistics-highest-immortal-power"), format(state.lifetimeHighestImmortalPower));
    setTextIfChanged(byId("statistics-total-immortal-power"), format(state.lifetimeTotalImmortalPower));
    setTextIfChanged(byId("statistics-immortal-selections"), format(state.immortalSelectionCount, 0));
    setTextIfChanged(byId("statistics-real-time"), formatElapsedTime(state.totalElapsedSeconds));
    setTextIfChanged(byId("statistics-game-time"), formatGameCalendar(state.totalElapsedSeconds));
    setTextIfChanged(byId("statistics-current-highest-j"), format(state.currentRebirthHighestJ));
    setTextIfChanged(byId("statistics-current-total-j"), format(state.currentRebirthTotalJ));
    setTextIfChanged(byId("statistics-current-highest-power"), format(state.currentRebirthHighestPower));
    setTextIfChanged(byId("statistics-current-total-power"), format(state.currentRebirthTotalPower));
    setTextIfChanged(byId("statistics-current-highest-scale"), SCALE_THRESHOLDS[state.currentRebirthHighestScaleIndex].name);
    setTextIfChanged(byId("statistics-current-highest-realm"), cultivationRealmName(state.currentRebirthHighestCultivationRealmLevel));
    setTextIfChanged(byId("statistics-current-highest-mana"), format(state.currentRebirthHighestMana));
    setTextIfChanged(byId("statistics-current-total-mana"), format(state.currentRebirthTotalMana));
    setTextIfChanged(byId("statistics-current-highest-immortal-power"), format(state.currentRebirthHighestImmortalPower));
    setTextIfChanged(byId("statistics-current-total-immortal-power"), format(state.currentRebirthTotalImmortalPower));
    setTextIfChanged(byId("statistics-current-elapsed-time"), formatElapsedTime(state.reincarnationElapsedSeconds));
    }
    if (renderCultivation && renderingStructure) renderCultivationPage();
    if (renderUpgrades) {
    updateOneTimeUpgrade("exercise-upgrade", "buy-exercise", state.exercisePurchased, canAffordPower(EXERCISE_COST));
    updateOneTimeUpgrade("gym-upgrade", "buy-gym", state.gymPurchased, canAffordPower(GYM_COST));
    updateOneTimeUpgrade("transcendent-upgrade", "buy-transcendent", state.transcendentPurchased, state.brickUnlocked && canAffordPower(TRANSCENDENT_COST));
    updateOneTimeUpgrade("focus-upgrade", "buy-focus", state.focusPurchased, state.brickUnlocked && canAffordPower(FOCUS_COST));
    updateOneTimeUpgrade("breathing-method-upgrade", "buy-breathing-method", state.breathingMethodPurchased, state.brickUnlocked && canAffordPower(BREATHING_METHOD_COST));
    updateOneTimeUpgrade("extreme-exercise-upgrade", "buy-extreme-exercise", state.extremeExercisePurchased, state.brickUnlocked && canAffordPower(EXTREME_EXERCISE_COST));
    updateOneTimeUpgrade("water-upgrade", "buy-water", state.waterPurchased, state.wallUnlocked && canAffordPower(WATER_COST));
    updateOneTimeUpgrade("ghost-brain-upgrade", "buy-ghost-brain", state.ghostBrainPurchased, state.wallUnlocked && canAffordPower(GHOST_BRAIN_COST));
    updateOneTimeUpgrade("natural-strength-upgrade", "buy-natural-strength", state.naturalStrengthPurchased, state.wallUnlocked && canAffordPower(NATURAL_STRENGTH_COST));
    updateOneTimeUpgrade("mental-power-upgrade", "buy-mental-power", state.mentalPowerPurchased, state.wallUnlocked && canAffordPower(MENTAL_POWER_COST));
    updateOneTimeUpgrade("life-power-upgrade", "buy-life-power", state.lifePowerPurchased, state.wallUnlocked && canAffordPower(LIFE_POWER_COST));
    updateOneTimeUpgrade("my-style-upgrade", "buy-my-style", state.myStylePurchased, canAffordPower(MY_STYLE_COST));
    updateOneTimeUpgrade("intuition-upgrade", "buy-intuition", state.intuitionPurchased, canAffordPower(INTUITION_COST));
    updateOneTimeUpgrade("ghost-back-upgrade", "buy-ghost-back", state.ghostBackPurchased, state.highestScaleIndex >= 3 && canAffordPower(GHOST_BACK_COST));
    updateOneTimeUpgrade("sonic-movement-upgrade", "buy-sonic-movement", state.sonicMovementPurchased, canAffordPower(SONIC_MOVEMENT_COST));
    updateOneTimeUpgrade("carbon-limit-upgrade", "buy-carbon-limit", state.carbonLimitPurchased, state.highestScaleIndex >= 3 && canAffordPower(CARBON_LIMIT_COST));
    updateOneTimeUpgrade("killing-intent-upgrade", "buy-killing-intent", state.killingIntentPurchased, state.highestScaleIndex >= 3 && canAffordPower(KILLING_INTENT_COST));
    updateOneTimeUpgrade("rock-strike-upgrade", "buy-rock-strike", state.rockStrikePurchased, state.highestScaleIndex >= 4 && canAffordPower(ROCK_STRIKE_COST));
    updateOneTimeUpgrade("high-speed-metabolism-upgrade", "buy-high-speed-metabolism", state.highSpeedMetabolismPurchased, state.highestScaleIndex >= 4 && canAffordPower(HIGH_SPEED_METABOLISM_COST));
    updateOneTimeUpgrade("endurance-enhancement-upgrade", "buy-endurance-enhancement", state.enduranceEnhancementPurchased, state.highestScaleIndex >= 4 && canAffordPower(ENDURANCE_ENHANCEMENT_COST));
    updateOneTimeUpgrade("bullet-time-upgrade", "buy-bullet-time", state.bulletTimePurchased, state.highestScaleIndex >= 4 && canAffordPower(BULLET_TIME_COST));
    updateOneTimeUpgrade("dynamic-focus-upgrade", "buy-dynamic-focus", state.dynamicFocusPurchased, state.highestScaleIndex >= 4 && canAffordPower(DYNAMIC_FOCUS_COST));
    updateOneTimeUpgrade("super-perception-upgrade", "buy-super-perception", state.superPerceptionPurchased, state.highestScaleIndex >= 5 && canAffordPower(SUPER_PERCEPTION_COST));
    updateOneTimeUpgrade("invulnerable-upgrade", "buy-invulnerable", state.invulnerablePurchased, state.highestScaleIndex >= 5 && canAffordPower(INVULNERABLE_COST));
    updateOneTimeUpgrade("regeneration-upgrade", "buy-regeneration", state.regenerationPurchased, state.highestScaleIndex >= 5 && canAffordPower(REGENERATION_COST));
    updateOneTimeUpgrade("superpower-upgrade", "buy-superpower", state.superpowerPurchased, state.highestScaleIndex >= 5 && canAffordPower(SUPERPOWER_COST));
    updateOneTimeUpgrade("super-speed-thinking-upgrade", "buy-super-speed-thinking", state.superSpeedThinkingPurchased, state.highestScaleIndex >= 5 && canAffordPower(SUPER_SPEED_THINKING_COST));
    updateOneTimeUpgrade("mountain-collapse-upgrade", "buy-mountain-collapse", state.mountainCollapsePurchased, state.highestScaleIndex >= 5 && canAffordPower(MOUNTAIN_COLLAPSE_COST));
    updateOneTimeUpgrade("hyper-regeneration-upgrade", "buy-hyper-regeneration", state.hyperRegenerationPurchased, state.highestScaleIndex >= 6 && state.regenerationPurchased && canAffordPower(HYPER_REGENERATION_COST));
    updateOneTimeUpgrade("superpower-evolution-upgrade", "buy-superpower-evolution", state.superpowerEvolutionPurchased, state.highestScaleIndex >= 6 && state.superpowerPurchased && canAffordPower(SUPERPOWER_EVOLUTION_COST));
    updateOneTimeUpgrade("earth-split-upgrade", "buy-earth-split", state.earthSplitPurchased, state.highestScaleIndex >= 6 && state.mountainCollapsePurchased && canAffordPower(EARTH_SPLIT_COST));
    updateOneTimeUpgrade("mental-domain-upgrade", "buy-mental-domain", state.mentalDomainPurchased, state.highestScaleIndex >= 6 && state.ghostBrainPurchased && canAffordPower(MENTAL_DOMAIN_COST));
    updateOneTimeUpgrade("godspeed-upgrade", "buy-godspeed", state.godspeedPurchased, state.highestScaleIndex >= 6 && state.sonicMovementPurchased && canAffordPower(GODSPEED_COST));
    updateOneTimeUpgrade("subtle-upgrade", "buy-subtle", state.subtlePurchased, state.highestScaleIndex >= 6 && state.focusPurchased && canAffordPower(SUBTLE_COST));
    updateOneTimeUpgrade("sky-split-upgrade", "buy-sky-split", state.skySplitPurchased, state.highestScaleIndex >= 6 && state.mentalDomainPurchased && canAffordPower(SKY_SPLIT_COST));
    updateOneTimeUpgrade("biological-quantification-upgrade", "buy-biological-quantification", state.biologicalQuantificationPurchased, state.highestScaleIndex >= 7 && canAffordPower(BIOLOGICAL_QUANTIFICATION_COST));
    updateOneTimeUpgrade("ghost-man-transformation-upgrade", "buy-ghost-man-transformation", state.ghostManTransformationPurchased, state.highestScaleIndex >= 7 && canAffordPower(GHOST_MAN_TRANSFORMATION_COST));
    updateOneTimeUpgrade("destroy-country-upgrade", "buy-destroy-country", state.destroyCountryPurchased, state.highestScaleIndex >= 7 && canAffordPower(DESTROY_COUNTRY_COST));
    updateOneTimeUpgrade("human-ghost-transformation-upgrade", "buy-human-ghost-transformation", state.humanGhostTransformationPurchased, state.highestScaleIndex >= 7 && canAffordPower(HUMAN_GHOST_TRANSFORMATION_COST));
    updateOneTimeUpgrade("killing-intent-substance-upgrade", "buy-killing-intent-substance", state.killingIntentSubstancePurchased, state.highestScaleIndex >= 7 && canAffordPower(KILLING_INTENT_SUBSTANCE_COST));
    updateOneTimeUpgrade("energy-cycle-upgrade", "buy-energy-cycle", state.energyCyclePurchased, state.highestScaleIndex >= 7 && canAffordPower(ENERGY_CYCLE_COST));
    updateOneTimeUpgrade("mountain-shatter-upgrade", "buy-mountain-shatter", state.mountainShatterPurchased, state.highestScaleIndex >= 7 && canAffordPower(MOUNTAIN_SHATTER_COST));
    updateOneTimeUpgrade("bioenergy-upgrade", "buy-bioenergy", state.bioenergyPurchased, state.highestScaleIndex >= 7 && canAffordPower(BIOENERGY_COST));
    updateOneTimeUpgrade("elementalization-upgrade", "buy-elementalization", state.elementalizationPurchased, state.highestScaleIndex >= 8 && canAffordPower(ELEMENTALIZATION_COST));
    updateOneTimeUpgrade("killing-intent-perception-upgrade", "buy-killing-intent-perception", state.killingIntentPerceptionPurchased, state.highestScaleIndex >= 8 && canAffordPower(KILLING_INTENT_PERCEPTION_COST));
    updateOneTimeUpgrade("killing-intent-wave-upgrade", "buy-killing-intent-wave", state.killingIntentWavePurchased, state.highestScaleIndex >= 8 && canAffordPower(KILLING_INTENT_WAVE_COST));
    updateOneTimeUpgrade("ultimate-intent-upgrade", "buy-ultimate-intent", state.ultimateIntentPurchased, state.highestScaleIndex >= 8 && canAffordPower(ULTIMATE_INTENT_COST));
    updateOneTimeUpgrade("brain-domain-development-upgrade", "buy-brain-domain-development", state.brainDomainDevelopmentPurchased, state.highestScaleIndex >= 8 && canAffordPower(BRAIN_DOMAIN_DEVELOPMENT_COST));
    updateOneTimeUpgrade("continent-split-upgrade", "buy-continent-split", state.continentSplitPurchased, state.highestScaleIndex >= 8 && canAffordPower(CONTINENT_SPLIT_COST));
    updateOneTimeUpgrade("continent-collapse-upgrade", "buy-continent-collapse", state.continentCollapsePurchased, state.highestScaleIndex >= 8 && canAffordPower(CONTINENT_COLLAPSE_COST));
    updateOneTimeUpgrade("wave-eye-upgrade", "buy-wave-eye", state.waveEyePurchased, state.highestScaleIndex >= 9 && canAffordPower(WAVE_EYE_COST));
    updateOneTimeUpgrade("elemental-awakening-upgrade", "buy-elemental-awakening", state.elementalAwakeningPurchased, state.highestScaleIndex >= 9 && canAffordPower(ELEMENTAL_AWAKENING_COST));
    updateOneTimeUpgrade("moonfall-upgrade", "buy-moonfall", state.moonfallPurchased, state.highestScaleIndex >= 9 && canAffordPower(MOONFALL_COST));
    updateOneTimeUpgrade("flow-state-upgrade", "buy-flow-state", state.flowStatePurchased, state.highestScaleIndex >= 9 && canAffordPower(FLOW_STATE_COST));
    updateOneTimeUpgrade("selfhood-upgrade", "buy-selfhood", state.selfhoodPurchased, state.highestScaleIndex >= 9 && canAffordPower(SELFHOOD_COST));
    updateOneTimeUpgrade("freedom-upgrade", "buy-freedom", state.freedomPurchased, state.highestScaleIndex >= 9 && canAffordPower(FREEDOM_COST));
    updateOneTimeUpgrade("chicxulub-meteorite-upgrade", "buy-chicxulub-meteorite", state.chicxulubMeteoritePurchased, state.highestScaleIndex >= 9 && canAffordPower(CHICXULUB_METEORITE_COST));
    updateOneTimeUpgrade("planet-will-upgrade", "buy-planet-will", state.planetWillPurchased, state.highestScaleIndex >= 10 && canAffordPower(PLANET_WILL_COST));
    updateOneTimeUpgrade("star-spirit-upgrade", "buy-star-spirit", state.starSpiritPurchased, state.highestScaleIndex >= 10 && canAffordPower(STAR_SPIRIT_COST));
    updateOneTimeUpgrade("star-shatter-upgrade", "buy-star-shatter", state.starShatterPurchased, state.highestScaleIndex >= 10 && canAffordPower(STAR_SHATTER_COST));
    updateOneTimeUpgrade("space-quake-upgrade", "buy-space-quake", state.spaceQuakePurchased, state.highestScaleIndex >= 10 && canAffordPower(SPACE_QUAKE_COST));
    updateOneTimeUpgrade("selfless-upgrade", "buy-selfless", state.selflessPurchased, state.highestScaleIndex >= 10 && canAffordPower(SELFLESS_COST));
    updateOneTimeUpgrade("supernatural-fire-upgrade", "buy-supernatural-fire", state.supernaturalFirePurchased, state.highestScaleIndex >= 10 && canAffordPower(SUPERNATURAL_FIRE_COST));
    updateOneTimeUpgrade("five-spirit-stone-upgrade", "buy-five-spirit-stone", state.fiveSpiritStonePurchased, state.highestScaleIndex >= 10 && canAffordPower(FIVE_SPIRIT_STONE_COST));
    updateOneTimeUpgrade("self-suppression-upgrade", "buy-self-suppression", state.selfSuppressionPurchased, state.highestScaleIndex >= 10 && canAffordPower(SELF_SUPPRESSION_COST));
    updateOneTimeUpgrade("stellar-furnace-upgrade", "buy-stellar-furnace", state.stellarFurnacePurchased, state.highestScaleIndex >= 11 && canAffordPower(STELLAR_FURNACE_COST));
    updateOneTimeUpgrade("stellar-treasure-seeking-upgrade", "buy-stellar-treasure-seeking", state.stellarTreasureSeekingPurchased, state.highestScaleIndex >= 11 && canAffordPower(STELLAR_TREASURE_SEEKING_COST));
    updateOneTimeUpgrade("gravitational-collapse-upgrade", "buy-gravitational-collapse", state.gravitationalCollapsePurchased, state.highestScaleIndex >= 11 && canAffordPower(GRAVITATIONAL_COLLAPSE_COST));
    updateOneTimeUpgrade("galactic-return-upgrade", "buy-galactic-return", state.galacticReturnPurchased, state.highestScaleIndex >= 12 && canAffordPower(GALACTIC_RETURN_COST));
    updateOneTimeUpgrade("stellar-sea-gift-upgrade", "buy-stellar-sea-gift", state.stellarSeaGiftPurchased, state.highestScaleIndex >= 12 && canAffordPower(STELLAR_SEA_GIFT_COST));
    updateOneTimeUpgrade("stellar-resonance-upgrade", "buy-stellar-resonance", state.stellarResonancePurchased, state.highestScaleIndex >= 12 && canAffordPower(STELLAR_RESONANCE_COST));
    updateOneTimeUpgrade("great-attractor-upgrade", "buy-great-attractor", state.greatAttractorPurchased, state.highestScaleIndex >= 13 && canAffordPower(GREAT_ATTRACTOR_COST));
    updateOneTimeUpgrade("large-scale-adaptation-upgrade", "buy-large-scale-adaptation", state.largeScaleAdaptationPurchased, state.highestScaleIndex >= 13 && canAffordPower(LARGE_SCALE_ADAPTATION_COST));
    updateOneTimeUpgrade("supercluster-collapse-upgrade", "buy-supercluster-collapse", state.superclusterCollapsePurchased, state.highestScaleIndex >= 13 && canAffordPower(SUPERCLUSTER_COLLAPSE_COST));
    updateOneTimeUpgrade("cosmic-web-upgrade", "buy-cosmic-web", state.cosmicWebPurchased, state.highestScaleIndex >= 14 && canAffordPower(COSMIC_WEB_COST));
    updateOneTimeUpgrade("scale-unification-upgrade", "buy-scale-unification", state.scaleUnificationPurchased, state.highestScaleIndex >= 14 && canAffordPower(SCALE_UNIFICATION_COST));
    updateOneTimeUpgrade("spacetime-framework-upgrade", "buy-spacetime-framework", state.spacetimeFrameworkPurchased, state.highestScaleIndex >= 14 && canAffordPower(SPACETIME_FRAMEWORK_COST));
    }
    if (renderRealms) {
    updateOneTimeUnlock("qi-refining-stage", "unlock-qi-refining", state.qiRefiningUnlocked, immortalSelected && canAffordPower(QI_REFINING_COST));
    updateOneTimeUnlock("foundation-stage", "unlock-foundation", state.foundationUnlocked, state.qiRefiningUnlocked && canAffordMana(nextFoundationCost));
    if (qiRefiningChallengeActive()) {
      setTextIfChanged(byId("unlock-foundation"), "提升炼气层数");
      setDisabledIfChanged(byId("unlock-foundation"), !canAffordMana(nextFoundationCost));
    }
    updateOneTimeUnlock("golden-core-stage", "unlock-golden-core", state.goldenCoreUnlocked, state.foundationUnlocked && canAffordMana(nextGoldenCoreCost));
    }
    if (renderAbilities) {
    updateOneTimeUnlock("immortal-life-ability", "unlock-immortal-life", state.immortalLifeUnlocked, state.qiRefiningUnlocked && canAffordMana(IMMORTAL_LIFE_COST));
    updateOneTimeUnlock(
      "circulation-stage",
      "unlock-circulation",
      circulationEffective(),
      state.foundationUnlocked && !qiRefiningChallengeActive() && canAffordMana(CIRCULATION_COST)
    );
    if (qiRefiningChallengeActive() && !state.circulationUnlocked) {
      setTextIfChanged(byId("unlock-circulation"), "炼气十万年：临时解锁");
    }
    updateOneTimeUnlock("mana-liquefaction-ability", "unlock-mana-liquefaction", state.manaLiquefactionUnlocked, state.foundationUnlocked && canAffordMana(MANA_LIQUEFACTION_COST));
    updateOneTimeUnlock("technique-ability", "unlock-technique", state.techniqueUnlocked, state.foundationUnlocked && canAffordMana(TECHNIQUE_COST));
    updateOneTimeUnlock("mana-solidification-ability", "unlock-mana-solidification", state.manaSolidificationUnlocked, state.goldenCoreUnlocked && canAffordMana(MANA_SOLIDIFICATION_COST));
    updateOneTimeUnlock("minor-technique-ability", "unlock-minor-technique", state.minorTechniqueUnlocked, state.goldenCoreUnlocked && canAffordMana(MINOR_TECHNIQUE_COST));
    updateOneTimeUnlock("magic-treasure-ability", "unlock-magic-treasure", state.magicTreasureUnlocked, state.goldenCoreUnlocked && canAffordMana(MAGIC_TREASURE_COST));
    updateOneTimeUnlock("material-control-ability", "unlock-material-control", state.materialControlUnlocked, state.advancedRealmLevel >= 1 && canAffordMana(MATERIAL_CONTROL_COST));
    updateOneTimeUnlock("flying-escape-ability", "unlock-flying-escape", state.flyingEscapeUnlocked, state.advancedRealmLevel >= 1 && canAffordMana(FLYING_ESCAPE_COST));
    updateOneTimeUnlock("divine-sense-ability", "unlock-divine-sense", state.divineSenseUnlocked, state.advancedRealmLevel >= 1 && canAffordMana(DIVINE_SENSE_COST));
    updateOneTimeUnlock("great-cultivator-ability", "unlock-great-cultivator", state.greatCultivatorUnlocked, state.advancedRealmLevel >= 1 && canAffordMana(GREAT_CULTIVATOR_COST));
    updateOneTimeUnlock("second-nascent-soul-ability", "unlock-second-nascent-soul", state.secondNascentSoulUnlocked, state.advancedRealmLevel >= 1 && canAffordMana(SECOND_NASCENT_SOUL_COST));
    updateOneTimeUnlock("undying-primordial-spirit-ability", "unlock-undying-primordial-spirit", state.undyingPrimordialSpiritUnlocked, state.advancedRealmLevel >= 6 && canAffordImmortalPower(UNDYING_PRIMORDIAL_SPIRIT_COST));
    updateOneTimeUnlock("xuan-immortal-body-ability", "unlock-xuan-immortal-body", state.xuanImmortalBodyUnlocked, state.advancedRealmLevel >= 6 && canAffordImmortalPower(XUAN_IMMORTAL_BODY_COST));
    updateOneTimeUnlock("law-ability", "unlock-law", state.lawUnlocked, state.advancedRealmLevel >= 6 && canAffordImmortalPower(LAW_COST));
    updateOneTimeUnlock("spirit-world-ascension-ability", "unlock-spirit-world-ascension", state.spiritWorldAscensionUnlocked, state.advancedRealmLevel >= 2 && canAffordMana(SPIRIT_WORLD_ASCENSION_COST));
    updateOneTimeUnlock("aura-control-ability", "unlock-aura-control", state.auraControlUnlocked, state.advancedRealmLevel >= 2 && canAffordMana(AURA_CONTROL_COST));
    updateOneTimeUnlock("equal-heaven-longevity-ability", "unlock-equal-heaven-longevity", state.equalHeavenLongevityUnlocked, state.advancedRealmLevel >= 2 && canAffordMana(EQUAL_HEAVEN_LONGEVITY_COST));
    updateOneTimeUnlock("five-elements-ability", "unlock-five-elements", state.fiveElementsUnlocked, state.advancedRealmLevel >= 2 && canAffordMana(FIVE_ELEMENTS_COST));
    updateOneTimeUnlock("abundant-aura-ability", "unlock-abundant-aura", state.abundantAuraUnlocked, state.advancedRealmLevel >= 2 && canAffordMana(ABUNDANT_AURA_COST));
    updateOneTimeUnlock("brahma-demon-art-ability", "unlock-brahma-demon-art", state.brahmaDemonArtUnlocked, state.advancedRealmLevel >= 3 && canAffordMana(BRAHMA_DEMON_ART_COST));
    const trueSpiritTransformationMaxed = state.trueSpiritTransformationLevel >= 5;
    const trueSpiritTransformationRow = byId("true-spirit-transformation-ability");
    const trueSpiritTransformationButton = byId("unlock-true-spirit-transformation");
    toggleClassIfChanged(trueSpiritTransformationRow, "purchased", trueSpiritTransformationMaxed);
    trueSpiritTransformationRow.dataset.sortCost = String(trueSpiritTransformationMaxed
      ? Number.MAX_SAFE_INTEGER
      : nextTrueSpiritTransformationCost);
    setTextIfChanged(trueSpiritTransformationButton, trueSpiritTransformationMaxed ? "已达上限" : "升级");
    setDisabledIfChanged(trueSpiritTransformationButton, trueSpiritTransformationMaxed ||
      state.advancedRealmLevel < 3 || !canAffordMana(nextTrueSpiritTransformationCost));
    updateOneTimeUnlock("silver-tadpole-script-ability", "unlock-silver-tadpole-script", state.silverTadpoleScriptUnlocked, state.advancedRealmLevel >= 3 && canAffordMana(SILVER_TADPOLE_SCRIPT_COST));
    updateOneTimeUnlock("void-refining-to-qi-ability", "unlock-void-refining-to-qi", state.voidRefiningToQiUnlocked, state.advancedRealmLevel >= 3 && canAffordMana(VOID_REFINING_TO_QI_COST));
    updateOneTimeUnlock("immortal-realm-divine-ability", "unlock-immortal-realm-divine", state.immortalRealmDivineAbilityUnlocked, state.advancedRealmLevel >= 3 && canAffordMana(IMMORTAL_REALM_DIVINE_ABILITY_COST));
    updateOneTimeUnlock("spirit-refining-art-ability", "unlock-spirit-refining-art", state.spiritRefiningArtUnlocked, state.advancedRealmLevel >= 3 && canAffordMana(SPIRIT_REFINING_ART_COST));
    updateOneTimeUnlock("perfected-technique-ability", "unlock-perfected-technique", state.perfectedTechniqueUnlocked, state.advancedRealmLevel >= 4 && canAffordMana(PERFECTED_TECHNIQUE_COST));
    updateOneTimeUnlock("heaven-earth-aura-ability", "unlock-heaven-earth-aura", state.heavenEarthAuraUnlocked, state.advancedRealmLevel >= 4 && canAffordMana(HEAVEN_EARTH_AURA_COST));
    updateOneTimeUnlock("divine-ability-mastery-ability", "unlock-divine-ability-mastery", state.divineAbilityMasteryUnlocked, state.advancedRealmLevel >= 4 && canAffordMana(DIVINE_ABILITY_MASTERY_COST));
    updateOneTimeUnlock("dual-infant-unity-ability", "unlock-dual-infant-unity", state.dualInfantUnityUnlocked, state.advancedRealmLevel >= 4 && canAffordMana(DUAL_INFANT_UNITY_COST));
    updateOneTimeUnlock("aura-into-body-ability", "unlock-aura-into-body", state.auraIntoBodyUnlocked, state.advancedRealmLevel >= 4 && canAffordMana(AURA_INTO_BODY_COST));
    updateOneTimeUnlock("external-incarnation-ability", "unlock-external-incarnation", state.externalIncarnationUnlocked, state.advancedRealmLevel >= 4 && canAffordMana(EXTERNAL_INCARNATION_COST));
    updateOneTimeUnlock("demon-realm-journey-ability", "unlock-demon-realm-journey", state.demonRealmJourneyUnlocked, state.advancedRealmLevel >= 4 && canAffordMana(DEMON_REALM_JOURNEY_COST));
    updateOneTimeUnlock("return-to-origin-ability", "unlock-return-to-origin", state.returnToOriginUnlocked, state.advancedRealmLevel >= 4 && canAffordMana(RETURN_TO_ORIGIN_COST));
    updateOneTimeUnlock("natal-magic-treasure-ability", "unlock-natal-magic-treasure", state.natalMagicTreasureUnlocked, state.advancedRealmLevel >= 5 && canAffordMana(NATAL_MAGIC_TREASURE_COST));
    updateOneTimeUnlock("perfected-technique-completion-ability", "unlock-perfected-technique-completion", state.perfectedTechniqueCompletionUnlocked, state.advancedRealmLevel >= 5 && canAffordMana(PERFECTED_TECHNIQUE_COMPLETION_COST));
    updateOneTimeUnlock("roam-spirit-world-ability", "unlock-roam-spirit-world", state.roamSpiritWorldUnlocked, state.advancedRealmLevel >= 5 && canAffordMana(ROAM_SPIRIT_WORLD_COST));
    updateOneTimeUnlock("descend-realm-ability", "unlock-descend-realm", state.descendRealmUnlocked, state.advancedRealmLevel >= 5 && canAffordMana(DESCEND_REALM_COST));
    updateOneTimeUnlock("nascent-soul-completion-ability", "unlock-nascent-soul-completion", state.nascentSoulCompletionUnlocked, state.advancedRealmLevel >= 5 && canAffordMana(NASCENT_SOUL_COMPLETION_COST));
    updateOneTimeUnlock("spirit-travel-void-ability", "unlock-spirit-travel-void", state.spiritTravelVoidUnlocked, state.advancedRealmLevel >= 5 && canAffordMana(SPIRIT_TRAVEL_VOID_COST));
    updateOneTimeUnlock("golden-seal-script-ability", "unlock-golden-seal-script", state.goldenSealScriptUnlocked, state.advancedRealmLevel >= 5 && canAffordMana(GOLDEN_SEAL_SCRIPT_COST));
    }
    sortCostGroups();
  }

  const bigNumberPage = WIS.UI.BigNumbers.create({ ...context, performSavedAction });
  const xiuzhenPage = WIS.UI.Xiuzhen.create({ ...context, performSavedAction });
  function renderActionsPage() {
    bigNumberPage.render();
    if (!bigNumberPage.isSelected()) renderPageContent("actions");
  }
  function renderUpgradesPage() { renderPageContent("upgrades"); }
  function renderCultivationContentPage() {
    renderPageContent("cultivation");
    xiuzhenPage.render({ page: activeCultivationPage, writePreview: writeSourcePreview });
  }
  function treasureProgressText(key) {
    return WIS.UI.Treasures.acquisition(key, WIS.Meta.TreasureProgress.view(state, key), format);
  }

  function renderTreasuresPage() { renderPageContent("treasures"); }
  function renderAchievementsPage() { renderAchievements(); }
  function switchStatisticsView(view) {
    const showCurrent = view === "current";
    byId("statistics-total-panel").hidden = showCurrent;
    byId("statistics-current-panel").hidden = !showCurrent;
    byId("statistics-total-tab").setAttribute("aria-selected", String(!showCurrent));
    byId("statistics-current-tab").setAttribute("aria-selected", String(showCurrent));
  }

  function renderStatisticsPage() { renderPageContent("statistics"); }

  const pageRenderers = Object.freeze({
    actions: renderActionsPage,
    upgrades: renderUpgradesPage,
    cultivation: renderCultivationContentPage,
    treasures: renderTreasuresPage,
    challenges: renderChallenges,
    achievements: renderAchievementsPage,
    statistics: renderStatisticsPage
  });

  function renderPage(pageName) {
    pageRenderers[pageName]?.();
  }

  function render(options) {
    const diag=WIS.Simulation?.FixedSegment?.diagnostics;
    return diag ? diag.measure("render",()=>renderNow(options)) : renderNow(options);
  }
  function renderNow({ forceGlobal = false, forcePage = false } = {}) {
    if (!WIS.Core.Runtime.canPresentState()) return;
    syncExplorationPreviewStructure();
    const nextStructureKey = [state.cultivation.active, state.powerSystem.active, state.advancedRealmLevel,
      state.highestScaleIndex, state.activeChallenge, state.permanentRootLevel, state.scatterRetentionLevel].join("|");
    if (nextStructureKey !== structureKey) {
      structureKey = nextStructureKey;
      for (const page of PAGE_NAMES) structuralPages.add(page);
    }
    renderingStructure = forcePage || structuralPages.has(activePage);
    if (renderingStructure) structureRevision++;
    achievementPresentation.sync();
    renderCurrentPageOnly = true;
    try {
      if (forceGlobal || globalDirty) {
        renderGlobal();
        globalDirty = false;
      }
      if (forcePage || dirtyPages.has(activePage)) {
        renderPage(activePage);
        dirtyPages.delete(activePage);
        structuralPages.delete(activePage);
      }
    } finally {
      renderCurrentPageOnly = false;
      renderingStructure = false;
    }
    if (activePage === "achievements") {
      const reward = rawById("achievement-beyondFractal")?.querySelector(".achievement-reward strong");
      const current = WIS.Meta.Achievements.beyondFractalReward();
      if (reward && reward.textContent !== current) reward.textContent = current;
    }
    if (rawById("automation-dialog")?.open) renderAutomationManager();
  }

  function bindHoldButton(id, action, { repeatAction = action, canRepeat = () => true } = {}) {
    const commit = work => () => {
      const result = work();
      context.completePlayerAction();
      runtime.call("renderImmediately", activePage);
      return result;
    };
    action = commit(action);
    repeatAction = commit(repeatAction);
    const button = byId(id);
    let delayTimer = null;
    let repeatTimer = null;
    let suppressNextClick = false;
    let isHolding = false;
    let activePointerId = null;

    const clearTimers = () => {
      window.clearTimeout(delayTimer);
      window.clearTimeout(repeatTimer);
      delayTimer = null;
      repeatTimer = null;
    };

    const stopRepeat = () => {
      isHolding = false;
      clearTimers();
      activePointerId = null;
    };

    const cancelRepeat = () => {
      stopRepeat();
      suppressNextClick = false;
    };

    const runRepeat = () => {
      if (offlineCatchUpStatus.locked === true) {
        cancelRepeat();
        return;
      }
      if (!isHolding || button.disabled || !canRepeat()) {
        stopRepeat();
        return;
      }
      repeatAction();
      if (offlineCatchUpStatus.locked === true || !isHolding || button.disabled || !canRepeat()) {
        if (offlineCatchUpStatus.locked === true) suppressNextClick = false;
        stopRepeat();
        return;
      }
      repeatTimer = window.setTimeout(runRepeat, 110);
    };

    button.addEventListener("pointerdown", (event) => {
      if (offlineCatchUpStatus.locked === true) {
        event.preventDefault();
        cancelRepeat();
        return;
      }
      if (button.disabled || isHolding || (event.pointerType === "mouse" && event.button !== 0)) return;
      isHolding = true;
      activePointerId = event.pointerId;
      suppressNextClick = true;

      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // 不支持 Pointer Capture 的环境继续依赖取消、失焦与页面隐藏兜底。
      }

      action();
      delayTimer = window.setTimeout(() => {
        delayTimer = null;
        runRepeat();
      }, 420);
    });

    button.addEventListener("pointerup", (event) => {
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      stopRepeat();

      try {
        if (button.hasPointerCapture(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
      } catch {
        // 指针可能已由浏览器释放。
      }
    });

    button.addEventListener("pointercancel", cancelRepeat);
    button.addEventListener("lostpointercapture", () => {
      if (isHolding) cancelRepeat();
    });
    window.addEventListener("pointerup", (event) => {
      if (!isHolding || (activePointerId !== null && event.pointerId !== activePointerId)) return;
      stopRepeat();
    });
    window.addEventListener("pointercancel", (event) => {
      if (!isHolding || (activePointerId !== null && event.pointerId !== activePointerId)) return;
      cancelRepeat();
    });
    window.addEventListener("blur", cancelRepeat);
    document.addEventListener("visibilitychange", cancelRepeat);

    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      if (offlineCatchUpStatus.locked === true) {
        event.preventDefault();
        cancelRepeat();
        return;
      }
      if (suppressNextClick) {
        event.preventDefault();
        suppressNextClick = false;
        return;
      }
      action();
    });
  }

  function bindManualScaleUpgrade(id, key, action) {
    bindHoldButton(id, () => recordManualProgress(manualScaleUpgradeHistory, key, action));
  }

  function bindManualImmortalAbility(id, key, action) {
    if (!rawById(id)) {
      registerAdvancedAbilityBinding(id, key, action);
      return;
    }
    bindHoldButton(id, () => recordManualProgress(manualImmortalAbilityHistory, key, action));
  }

  function bindManualRealmBreakthrough(id, action) {
    bindHoldButton(id, () => recordManualRealmBreakthrough(action));
  }

  // 高级境界能力首次达到对应境界时创建，事件绑定在节点创建后补齐。

    function bindEvents() {
      document.addEventListener("toggle", event => {
        const details = event.target;
        if (details.tagName !== "DETAILS" || !details.open || !details.closest(".page") || !previewVisible(details)) return;
        structuralPages.add(activePage);
        dirtyPages.add(activePage);
        runtime.call("renderImmediately", activePage);
      }, true);
    configureBuildControlledUI();
    bigNumberPage.bind();
    xiuzhenPage.bind();
    const blockInteractionDuringCatchUp = (event) => {
      if (offlineCatchUpStatus.locked !== true) return;
      if (event.target?.closest?.("#offline-progress-dialog")) return;
      if (offlineCatchUpStatus.phase === "paused" &&
          event.target?.closest?.("#settings-dialog, #automation-dialog, #catch-up-notice")) return;
      if (event.type === "keydown" || event.type === "submit") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const control = event.target?.closest?.("button, input, select, textarea, [role='button']");
      if (!control) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    ["pointerdown", "click", "keydown", "input", "change", "submit"].forEach((eventName) => {
      document.addEventListener(eventName, blockInteractionDuringCatchUp, true);
    });
    subscribeCatchUpStatus(status=>handleOfflineCatchUpStatus(status,false));
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", () => switchPage(button.dataset.page));
    });
    bindHoldButton("train-button", () => train(true), {
      repeatAction: () => train(false),
      canRepeat: () => hasAchievement("lightningFiveWhip")
    });
    bindHoldButton("buy-running", buyRunning);
    bindManualScaleUpgrade("buy-exercise", "exercisePurchased", buyExercise);
    bindManualScaleUpgrade("buy-gym", "gymPurchased", buyGym);
    bindManualScaleUpgrade("buy-transcendent", "transcendentPurchased", buyTranscendent);
    bindManualScaleUpgrade("buy-focus", "focusPurchased", buyFocus);
    bindManualScaleUpgrade("buy-breathing-method", "breathingMethodPurchased", buyBreathingMethod);
    bindManualScaleUpgrade("buy-extreme-exercise", "extremeExercisePurchased", buyExtremeExercise);
    bindHoldButton("buy-rock", buyRock);
    bindManualScaleUpgrade("buy-water", "waterPurchased", buyWater);
    bindManualScaleUpgrade("buy-ghost-brain", "ghostBrainPurchased", buyGhostBrain);
    bindManualScaleUpgrade("buy-natural-strength", "naturalStrengthPurchased", buyNaturalStrength);
    bindManualScaleUpgrade("buy-mental-power", "mentalPowerPurchased", buyMentalPower);
    bindManualScaleUpgrade("buy-life-power", "lifePowerPurchased", buyLifePower);
    bindManualScaleUpgrade("buy-my-style", "myStylePurchased", buyMyStyle);
    bindManualScaleUpgrade("buy-intuition", "intuitionPurchased", buyIntuition);
    bindManualScaleUpgrade("buy-ghost-back", "ghostBackPurchased", buyGhostBack);
    bindManualScaleUpgrade("buy-sonic-movement", "sonicMovementPurchased", buySonicMovement);
    bindManualScaleUpgrade("buy-carbon-limit", "carbonLimitPurchased", buyCarbonLimit);
    bindManualScaleUpgrade("buy-killing-intent", "killingIntentPurchased", buyKillingIntent);
    bindManualScaleUpgrade("buy-rock-strike", "rockStrikePurchased", buyRockStrike);
    bindManualScaleUpgrade("buy-high-speed-metabolism", "highSpeedMetabolismPurchased", buyHighSpeedMetabolism);
    bindManualScaleUpgrade("buy-endurance-enhancement", "enduranceEnhancementPurchased", buyEnduranceEnhancement);
    bindManualScaleUpgrade("buy-bullet-time", "bulletTimePurchased", buyBulletTime);
    bindManualScaleUpgrade("buy-dynamic-focus", "dynamicFocusPurchased", buyDynamicFocus);
    bindManualScaleUpgrade("buy-super-perception", "superPerceptionPurchased", buySuperPerception);
    bindManualScaleUpgrade("buy-invulnerable", "invulnerablePurchased", buyInvulnerable);
    bindManualScaleUpgrade("buy-regeneration", "regenerationPurchased", buyRegeneration);
    bindManualScaleUpgrade("buy-superpower", "superpowerPurchased", buySuperpower);
    bindManualScaleUpgrade("buy-super-speed-thinking", "superSpeedThinkingPurchased", buySuperSpeedThinking);
    bindManualScaleUpgrade("buy-mountain-collapse", "mountainCollapsePurchased", buyMountainCollapse);
    bindManualScaleUpgrade("buy-mind-division", "mindDivisionLevel", buyMindDivision);
    bindManualScaleUpgrade("buy-hyper-regeneration", "hyperRegenerationPurchased", () => WIS.Power.Scale.buyUpgrade("hyperRegeneration"));
    bindManualScaleUpgrade("buy-superpower-evolution", "superpowerEvolutionPurchased", () => WIS.Power.Scale.buyUpgrade("superpowerEvolution"));
    bindManualScaleUpgrade("buy-earth-split", "earthSplitPurchased", () => WIS.Power.Scale.buyUpgrade("earthSplit"));
    bindManualScaleUpgrade("buy-mental-domain", "mentalDomainPurchased", () => WIS.Power.Scale.buyUpgrade("mentalDomain"));
    bindManualScaleUpgrade("buy-godspeed", "godspeedPurchased", () => WIS.Power.Scale.buyUpgrade("godspeed"));
    bindManualScaleUpgrade("buy-subtle", "subtlePurchased", () => WIS.Power.Scale.buyUpgrade("subtle"));
    bindManualScaleUpgrade("buy-sky-split", "skySplitPurchased", () => WIS.Power.Scale.buyUpgrade("skySplit"));
    bindManualScaleUpgrade("buy-biological-quantification", "biologicalQuantificationPurchased", () => WIS.Power.Scale.buyUpgrade("biologicalQuantification"));
    bindManualScaleUpgrade("buy-ghost-man-transformation", "ghostManTransformationPurchased", () => WIS.Power.Scale.buyUpgrade("ghostManTransformation"));
    bindManualScaleUpgrade("buy-destroy-country", "destroyCountryPurchased", () => WIS.Power.Scale.buyUpgrade("destroyCountry"));
    bindManualScaleUpgrade("buy-human-ghost-transformation", "humanGhostTransformationPurchased", () => WIS.Power.Scale.buyUpgrade("humanGhostTransformation"));
    bindManualScaleUpgrade("buy-killing-intent-substance", "killingIntentSubstancePurchased", () => WIS.Power.Scale.buyUpgrade("killingIntentSubstance"));
    bindManualScaleUpgrade("buy-energy-cycle", "energyCyclePurchased", () => WIS.Power.Scale.buyUpgrade("energyCycle"));
    bindManualScaleUpgrade("buy-mountain-shatter", "mountainShatterPurchased", () => WIS.Power.Scale.buyUpgrade("mountainShatter"));
    bindManualScaleUpgrade("buy-bioenergy", "bioenergyPurchased", () => WIS.Power.Scale.buyUpgrade("bioenergy"));
    bindManualScaleUpgrade("buy-elementalization", "elementalizationPurchased", () => WIS.Power.Scale.buyUpgrade("elementalization"));
    bindManualScaleUpgrade("buy-killing-intent-perception", "killingIntentPerceptionPurchased", () => WIS.Power.Scale.buyUpgrade("killingIntentPerception"));
    bindManualScaleUpgrade("buy-killing-intent-wave", "killingIntentWavePurchased", () => WIS.Power.Scale.buyUpgrade("killingIntentWave"));
    bindManualScaleUpgrade("buy-ultimate-intent", "ultimateIntentPurchased", () => WIS.Power.Scale.buyUpgrade("ultimateIntent"));
    bindManualScaleUpgrade("buy-brain-domain-development", "brainDomainDevelopmentPurchased", () => WIS.Power.Scale.buyUpgrade("brainDomainDevelopment"));
    bindManualScaleUpgrade("buy-continent-split", "continentSplitPurchased", () => WIS.Power.Scale.buyUpgrade("continentSplit"));
    bindManualScaleUpgrade("buy-continent-collapse", "continentCollapsePurchased", () => WIS.Power.Scale.buyUpgrade("continentCollapse"));
    bindManualScaleUpgrade("buy-wave-eye", "waveEyePurchased", () => WIS.Power.Scale.buyUpgrade("waveEye"));
    bindManualScaleUpgrade("buy-elemental-awakening", "elementalAwakeningPurchased", () => WIS.Power.Scale.buyUpgrade("elementalAwakening"));
    bindManualScaleUpgrade("buy-moonfall", "moonfallPurchased", () => WIS.Power.Scale.buyUpgrade("moonfall"));
    bindManualScaleUpgrade("buy-flow-state", "flowStatePurchased", () => WIS.Power.Scale.buyUpgrade("flowState"));
    bindManualScaleUpgrade("buy-selfhood", "selfhoodPurchased", () => WIS.Power.Scale.buyUpgrade("selfhood"));
    bindManualScaleUpgrade("buy-freedom", "freedomPurchased", () => WIS.Power.Scale.buyUpgrade("freedom"));
    bindManualScaleUpgrade("buy-chicxulub-meteorite", "chicxulubMeteoritePurchased", () => WIS.Power.Scale.buyUpgrade("chicxulubMeteorite"));
    bindManualScaleUpgrade("buy-planet-will", "planetWillPurchased", () => WIS.Power.Scale.buyUpgrade("planetWill"));
    bindManualScaleUpgrade("buy-star-spirit", "starSpiritPurchased", () => WIS.Power.Scale.buyUpgrade("starSpirit"));
    bindManualScaleUpgrade("buy-star-shatter", "starShatterPurchased", () => WIS.Power.Scale.buyUpgrade("starShatter"));
    bindManualScaleUpgrade("buy-space-quake", "spaceQuakePurchased", () => WIS.Power.Scale.buyUpgrade("spaceQuake"));
    bindManualScaleUpgrade("buy-selfless", "selflessPurchased", () => WIS.Power.Scale.buyUpgrade("selfless"));
    bindManualScaleUpgrade("buy-supernatural-fire", "supernaturalFirePurchased", () => WIS.Power.Scale.buyUpgrade("supernaturalFire"));
    bindManualScaleUpgrade("buy-five-spirit-stone", "fiveSpiritStonePurchased", () => WIS.Power.Scale.buyUpgrade("fiveSpiritStone"));
    bindManualScaleUpgrade("buy-self-suppression", "selfSuppressionPurchased", () => WIS.Power.Scale.buyUpgrade("selfSuppression"));
    bindManualScaleUpgrade("buy-stellar-furnace", "stellarFurnacePurchased", () => WIS.Power.Scale.buyUpgrade("stellarFurnace"));
    bindManualScaleUpgrade("buy-stellar-treasure-seeking", "stellarTreasureSeekingPurchased", () => WIS.Power.Scale.buyUpgrade("stellarTreasureSeeking"));
    bindManualScaleUpgrade("buy-gravitational-collapse", "gravitationalCollapsePurchased", () => WIS.Power.Scale.buyUpgrade("gravitationalCollapse"));
    bindManualScaleUpgrade("buy-galactic-return", "galacticReturnPurchased", () => WIS.Power.Scale.buyUpgrade("galacticReturn"));
    bindManualScaleUpgrade("buy-stellar-sea-gift", "stellarSeaGiftPurchased", () => WIS.Power.Scale.buyUpgrade("stellarSeaGift"));
    bindManualScaleUpgrade("buy-stellar-resonance", "stellarResonancePurchased", () => WIS.Power.Scale.buyUpgrade("stellarResonance"));
    bindManualScaleUpgrade("buy-great-attractor", "greatAttractorPurchased", () => WIS.Power.Scale.buyUpgrade("greatAttractor"));
    bindManualScaleUpgrade("buy-large-scale-adaptation", "largeScaleAdaptationPurchased", () => WIS.Power.Scale.buyUpgrade("largeScaleAdaptation"));
    bindManualScaleUpgrade("buy-supercluster-collapse", "superclusterCollapsePurchased", () => WIS.Power.Scale.buyUpgrade("superclusterCollapse"));
    bindManualScaleUpgrade("buy-cosmic-web", "cosmicWebPurchased", () => WIS.Power.Scale.buyUpgrade("cosmicWeb"));
    bindManualScaleUpgrade("buy-scale-unification", "scaleUnificationPurchased", () => WIS.Power.Scale.buyUpgrade("scaleUnification"));
    bindManualScaleUpgrade("buy-spacetime-framework", "spacetimeFrameworkPurchased", () => WIS.Power.Scale.buyUpgrade("spacetimeFramework"));
    byId("toggle-ghost-back").addEventListener("click", toggleGhostBack);
    bindManualRealmBreakthrough("unlock-qi-refining", unlockQiRefining);
    bindHoldButton("breathing-button", breathe);
    bindHoldButton("exploration-button", () => {
      const powerBefore = state.power;
      const result = explore();
      if (state.power !== powerBefore) markExplorationPreviewDirty();
      return result;
    });
    rawById("refresh-exploration-preview").addEventListener("click", event => requestExplorationPreviewRefresh(event.currentTarget));
    bindManualImmortalAbility("unlock-immortal-life", "immortalLifeUnlocked", unlockImmortalLife);
    bindManualImmortalAbility("buy-qi-spell", "qiSpellLevel", buyQiSpell);
    bindManualRealmBreakthrough("unlock-foundation", unlockFoundation);
    bindManualRealmBreakthrough("unlock-golden-core", unlockGoldenCore);
    ADVANCED_REALMS.forEach((realm, index) => {
      bindManualRealmBreakthrough(`unlock-${realm.slug}`, () => unlockAdvancedRealm(index));
    });
    bindManualImmortalAbility("unlock-circulation", "circulationUnlocked", unlockCirculation);
    bindManualImmortalAbility("unlock-mana-liquefaction", "manaLiquefactionUnlocked", unlockManaLiquefaction);
    bindManualImmortalAbility("unlock-technique", "techniqueUnlocked", unlockTechnique);
    bindManualImmortalAbility("buy-foundation-spell", "foundationSpellLevel", buyFoundationSpell);
    bindManualImmortalAbility("buy-longevity", "longevityLevel", buyLongevity);
    bindManualImmortalAbility("buy-golden-core-longevity", "goldenCoreLongevityLevel", buyGoldenCoreLongevity);
    bindManualImmortalAbility("unlock-mana-solidification", "manaSolidificationUnlocked", unlockManaSolidification);
    bindManualImmortalAbility("unlock-minor-technique", "minorTechniqueUnlocked", unlockMinorTechnique);
    bindManualImmortalAbility("unlock-magic-treasure", "magicTreasureUnlocked", unlockMagicTreasure);
    bindManualImmortalAbility("unlock-material-control", "materialControlUnlocked", unlockMaterialControl);
    bindManualImmortalAbility("unlock-flying-escape", "flyingEscapeUnlocked", unlockFlyingEscape);
    bindManualImmortalAbility("buy-longevity-800", "longevity800Level", buyLongevity800);
    bindManualImmortalAbility("unlock-divine-sense", "divineSenseUnlocked", unlockDivineSense);
    bindManualImmortalAbility("unlock-great-cultivator", "greatCultivatorUnlocked", unlockGreatCultivator);
    bindManualImmortalAbility("unlock-second-nascent-soul", "secondNascentSoulUnlocked", unlockSecondNascentSoul);
    bindManualImmortalAbility("unlock-spirit-world-ascension", "spiritWorldAscensionUnlocked", () => unlockManaAbility("spiritWorldAscensionUnlocked", SPIRIT_WORLD_ASCENSION_COST));
    bindManualImmortalAbility("unlock-aura-control", "auraControlUnlocked", () => unlockManaAbility("auraControlUnlocked", AURA_CONTROL_COST));
    bindManualImmortalAbility("unlock-equal-heaven-longevity", "equalHeavenLongevityUnlocked", () => unlockManaAbility("equalHeavenLongevityUnlocked", EQUAL_HEAVEN_LONGEVITY_COST));
    bindManualImmortalAbility("unlock-five-elements", "fiveElementsUnlocked", () => unlockManaAbility("fiveElementsUnlocked", FIVE_ELEMENTS_COST));
    bindManualImmortalAbility("unlock-abundant-aura", "abundantAuraUnlocked", () => unlockManaAbility("abundantAuraUnlocked", ABUNDANT_AURA_COST));
    bindManualImmortalAbility("buy-heavenly-treasure", "heavenlyTreasureLevel", buyHeavenlyTreasure);
    bindManualImmortalAbility("unlock-brahma-demon-art", "brahmaDemonArtUnlocked", () => unlockVoidRefinementAbility("brahmaDemonArtUnlocked", BRAHMA_DEMON_ART_COST));
    bindManualImmortalAbility("unlock-true-spirit-transformation", "trueSpiritTransformationLevel", buyTrueSpiritTransformation);
    bindManualImmortalAbility("unlock-silver-tadpole-script", "silverTadpoleScriptUnlocked", () => unlockVoidRefinementAbility("silverTadpoleScriptUnlocked", SILVER_TADPOLE_SCRIPT_COST));
    bindManualImmortalAbility("unlock-void-refining-to-qi", "voidRefiningToQiUnlocked", () => unlockVoidRefinementAbility("voidRefiningToQiUnlocked", VOID_REFINING_TO_QI_COST));
    bindManualImmortalAbility("unlock-immortal-realm-divine", "immortalRealmDivineAbilityUnlocked", () => unlockVoidRefinementAbility("immortalRealmDivineAbilityUnlocked", IMMORTAL_REALM_DIVINE_ABILITY_COST));
    bindManualImmortalAbility("unlock-spirit-refining-art", "spiritRefiningArtUnlocked", () => unlockVoidRefinementAbility("spiritRefiningArtUnlocked", SPIRIT_REFINING_ART_COST));
    bindManualImmortalAbility("unlock-perfected-technique", "perfectedTechniqueUnlocked", () => WIS.Cultivation.Immortal.buyAbility("perfectedTechnique"));
    bindManualImmortalAbility("unlock-heaven-earth-aura", "heavenEarthAuraUnlocked", () => WIS.Cultivation.Immortal.buyAbility("heavenEarthAura"));
    bindManualImmortalAbility("unlock-divine-ability-mastery", "divineAbilityMasteryUnlocked", () => WIS.Cultivation.Immortal.buyAbility("divineAbilityMastery"));
    bindManualImmortalAbility("unlock-dual-infant-unity", "dualInfantUnityUnlocked", () => WIS.Cultivation.Immortal.buyAbility("dualInfantUnity"));
    bindManualImmortalAbility("unlock-aura-into-body", "auraIntoBodyUnlocked", () => WIS.Cultivation.Immortal.buyAbility("auraIntoBody"));
    bindManualImmortalAbility("unlock-external-incarnation", "externalIncarnationUnlocked", () => WIS.Cultivation.Immortal.buyAbility("externalIncarnation"));
    bindManualImmortalAbility("unlock-demon-realm-journey", "demonRealmJourneyUnlocked", () => WIS.Cultivation.Immortal.buyAbility("demonRealmJourney"));
    bindManualImmortalAbility("unlock-return-to-origin", "returnToOriginUnlocked", () => WIS.Cultivation.Immortal.buyAbility("returnToOrigin"));
    bindManualImmortalAbility("unlock-natal-magic-treasure", "natalMagicTreasureUnlocked", () => WIS.Cultivation.Immortal.buyAbility("natalMagicTreasure"));
    bindManualImmortalAbility("unlock-perfected-technique-completion", "perfectedTechniqueCompletionUnlocked", () => WIS.Cultivation.Immortal.buyAbility("perfectedTechniqueCompletion"));
    bindManualImmortalAbility("unlock-roam-spirit-world", "roamSpiritWorldUnlocked", () => WIS.Cultivation.Immortal.buyAbility("roamSpiritWorld"));
    bindManualImmortalAbility("unlock-descend-realm", "descendRealmUnlocked", () => WIS.Cultivation.Immortal.buyAbility("descendRealm"));
    bindManualImmortalAbility("buy-mystic-heavenly-treasure", "mysticHeavenlyTreasureLevel", () => WIS.Cultivation.Immortal.buyAbility("mysticHeavenlyTreasure"));
    bindManualImmortalAbility("unlock-nascent-soul-completion", "nascentSoulCompletionUnlocked", () => WIS.Cultivation.Immortal.buyAbility("nascentSoulCompletion"));
    bindManualImmortalAbility("unlock-spirit-travel-void", "spiritTravelVoidUnlocked", () => WIS.Cultivation.Immortal.buyAbility("spiritTravelVoid"));
    bindManualImmortalAbility("unlock-golden-seal-script", "goldenSealScriptUnlocked", () => WIS.Cultivation.Immortal.buyAbility("goldenSealScript"));
    bindManualImmortalAbility("unlock-undying-primordial-spirit", "undyingPrimordialSpiritUnlocked", () => WIS.Cultivation.Immortal.buyAbility("undyingPrimordialSpirit"));
    bindManualImmortalAbility("buy-immortal-aperture", "immortalApertureLevel", () => WIS.Cultivation.Immortal.buyAbility("immortalAperture"));
    bindManualImmortalAbility("unlock-xuan-immortal-body", "xuanImmortalBodyUnlocked", () => WIS.Cultivation.Immortal.buyAbility("xuanImmortalBody"));
    bindManualImmortalAbility("unlock-law", "lawUnlocked", () => WIS.Cultivation.Immortal.buyAbility("law"));
    bindManualImmortalAbility("unlock-immortal-aperture-ii", "immortalApertureIIUnlocked", () => WIS.Cultivation.Immortal.buyAbility("immortalApertureII"));
    bindManualImmortalAbility("unlock-spirit-domain", "spiritDomainUnlocked", () => WIS.Cultivation.Immortal.buyAbility("spiritDomain"));
    bindManualImmortalAbility("unlock-threads-of-law", "threadsOfLawUnlocked", () => WIS.Cultivation.Immortal.buyAbility("threadsOfLaw"));
    bindManualImmortalAbility("unlock-immortal-aperture-iii", "immortalApertureIIIUnlocked", () => WIS.Cultivation.Immortal.buyAbility("immortalApertureIII"));
    bindManualImmortalAbility("unlock-spirit-capture-return", "spiritCaptureReturnUnlocked", () => WIS.Cultivation.Immortal.buyAbility("spiritCaptureReturn"));
    bindManualImmortalAbility("unlock-indestructible-dharma-body", "indestructibleDharmaBodyUnlocked", () => WIS.Cultivation.Immortal.buyAbility("indestructibleDharmaBody"));
    bindManualImmortalAbility("unlock-five-elements-treasure", "fiveElementsTreasureUnlocked", () => WIS.Cultivation.Immortal.buyAbility("fiveElementsTreasure"));
    bindManualImmortalAbility("unlock-immortal-aperture-iv", "immortalApertureIVUnlocked", () => WIS.Cultivation.Immortal.buyAbility("immortalApertureIV"));
    bindManualImmortalAbility("unlock-immortal-aperture-v", "immortalApertureVUnlocked", () => WIS.Cultivation.Immortal.buyAbility("immortalApertureV"));
    bindManualImmortalAbility("unlock-law-affinity", "lawAffinityUnlocked", () => WIS.Cultivation.Immortal.buyAbility("lawAffinity"));
    bindManualImmortalAbility("unlock-flawless-jade-body", "flawlessJadeBodyUnlocked", () => WIS.Cultivation.Immortal.buyAbility("flawlessJadeBody"));
    bindManualImmortalAbility("unlock-spirit-domain-world-transformation", "spiritDomainWorldTransformationUnlocked", () => WIS.Cultivation.Immortal.buyAbility("spiritDomainWorldTransformation"));
    bindManualImmortalAbility("unlock-immortal-aperture-vi", "immortalApertureVIUnlocked", () => WIS.Cultivation.Immortal.buyAbility("immortalApertureVI"));
    bindManualImmortalAbility("unlock-soul-qualitative-change", "soulQualitativeChangeUnlocked", () => WIS.Cultivation.Immortal.buyAbility("soulQualitativeChange"));
    bindManualImmortalAbility("unlock-immortal-aperture-vii", "immortalApertureVIIUnlocked", () => WIS.Cultivation.Immortal.buyAbility("immortalApertureVII"));
    bindManualImmortalAbility("unlock-trinity", "trinityUnlocked", () => WIS.Cultivation.Immortal.buyAbility("trinity"));
    bindManualImmortalAbility("unlock-unity-with-dao", "unityWithDaoUnlocked", () => WIS.Cultivation.Immortal.buyAbility("unityWithDao"));
    bindManualImmortalAbility("unlock-law-origin", "lawOriginUnlocked", () => WIS.Cultivation.Immortal.buyAbility("lawOrigin"));
    bindManualImmortalAbility("unlock-law-crystal-filament", "lawCrystalFilamentUnlocked", () => WIS.Cultivation.Immortal.buyAbility("lawCrystalFilament"));
    bindManualImmortalAbility("unlock-sever-three-corpses", "severThreeCorpsesUnlocked", () => WIS.Cultivation.Immortal.buyAbility("severThreeCorpses"));
    bindManualImmortalAbility("unlock-ultimate-immortal-aperture", "ultimateImmortalApertureUnlocked", () => WIS.Cultivation.Immortal.buyAbility("ultimateImmortalAperture"));
    bindManualImmortalAbility("unlock-dao-law-unity", "daoLawUnityUnlocked", () => WIS.Cultivation.Immortal.buyAbility("daoLawUnity"));
    bindManualImmortalAbility("unlock-dao-domain", "daoDomainUnlocked", () => WIS.Cultivation.Immortal.buyAbility("daoDomain"));
    bindManualImmortalAbility("unlock-dao-power", "daoPowerUnlocked", () => WIS.Cultivation.Immortal.buyAbility("daoPower"));
    bindManualImmortalAbility("unlock-dao-time-law", "daoTimeLawUnlocked", () => WIS.Cultivation.Immortal.buyAbility("daoTimeLaw"));
    bindManualImmortalAbility("unlock-dao-assimilation", "daoAssimilationUnlocked", () => WIS.Cultivation.Immortal.buyAbility("daoAssimilation"));
    byId("statistics-total-tab").addEventListener("click", () => switchStatisticsView("total"));
    byId("statistics-current-tab").addEventListener("click", () => switchStatisticsView("current"));
    byId("scatter-rebuild").addEventListener("click", scatterAndRebuild);
    byId("reincarnate").addEventListener("click", reincarnate);
    byId("toggle-innate-deficiency").addEventListener("click", () => {
      if (state.activeChallenge === "innateDeficiency") exitChallenge();
      else startChallenge("innateDeficiency");
    });
    byId("toggle-powerless").addEventListener("click", () => {
      if (state.activeChallenge === "powerless") exitChallenge();
      else startChallenge("powerless");
    });
    byId("toggle-longevity").addEventListener("click", () => {
      if (state.activeChallenge === "longevity") exitChallenge();
      else startChallenge("longevity");
    });
    byId("toggle-five-misfortunes").addEventListener("click", () => {
      if (state.activeChallenge === "fiveMisfortunes") exitChallenge();
      else startChallenge("fiveMisfortunes");
    });
    byId("toggle-complete-realm").addEventListener("click", () => {
      if (state.activeChallenge === "completeRealm") exitChallenge();
      else startChallenge("completeRealm");
    });
    byId("toggle-moonless").addEventListener("click", () => {
      if (state.activeChallenge === "moonless") exitChallenge();
      else startChallenge("moonless");
    });
    byId("toggle-planet-suppression").addEventListener("click", () => {
      if (state.activeChallenge === "planetSuppression") exitChallenge();
      else startChallenge("planetSuppression");
    });
    ["severEvilCorpse", "severGoodCorpse", "severSelfCorpse"].forEach((challengeKey) => {
      const idPrefix = challengeKey === "severEvilCorpse" ? "sever-evil-corpse" : challengeKey === "severGoodCorpse" ? "sever-good-corpse" : "sever-self-corpse";
      byId(`toggle-${idPrefix}`).addEventListener("click", () => {
        if (state.activeChallenge === challengeKey) exitChallenge();
        else startChallenge(challengeKey);
      });
    });
    byId("toggle-qi-refining-hundred-thousand-years").addEventListener("click", () => {
      if (state.activeChallenge === "qiRefiningHundredThousandYears") exitChallenge();
      else startChallenge("qiRefiningHundredThousandYears");
    });
    byId("toggle-solar-power").addEventListener("click", () => {
      if (state.activeChallenge === "solarPower") exitChallenge();
      else startChallenge("solarPower");
    });
    byId("toggle-galaxy").addEventListener("click", () => {
      if (state.activeChallenge === "galaxy") exitChallenge();
      else startChallenge("galaxy");
    });
    byId("toggle-black-hole").addEventListener("click", () => {
      if (state.activeChallenge === "blackHole") exitChallenge();
      else startChallenge("blackHole");
    });
    document.querySelectorAll("[data-cultivation]").forEach((button) => {
      button.addEventListener("click", () => { chooseCultivation(button.dataset.cultivation); context.completePlayerAction(); });
    });
    document.querySelectorAll("[data-cultivation-page]").forEach((button) => {
      button.addEventListener("click", () => switchCultivationPage(button.dataset.cultivationPage));
    });
    byId("toggle-achievement-filter").addEventListener("click", () => {
      state.hideUnlockedAchievements = !state.hideUnlockedAchievements;
      saveState();
      markAchievementsDirty();
      renderAchievements();
    });
    window.addEventListener("beforeunload", () => saveState({ closing: true }));
    window.addEventListener("pagehide", () => saveState({ closing: true }));

    const settingsDialog = byId("settings-dialog");
    const automationDialog = byId("automation-dialog");
    const offlineProgressDialog = byId("offline-progress-dialog");
    const importInput = byId("import-file");
    const renderAutoCloseSetting = () => {
      const enabled=state.autoCloseOfflineDialogEnabled!==false;
      const button=byId("auto-close-offline-toggle");
      button.setAttribute("aria-checked",String(enabled));
      button.textContent=enabled?"已开启":"已关闭";
    };
    const openSettings = () => {
      renderAutoCloseSetting();
      settingsDialog.showModal();
    };
    byId("toggle-resource-panel").addEventListener("click", () => {
      const button=byId("toggle-resource-panel");
      const collapsed=button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded",String(!collapsed));
      button.closest(".resource-panel").classList.toggle("resources-collapsed",collapsed);
      byId("resource-panel-toggle-label").textContent=collapsed ? "展开 ▾" : "收起 ▴";
    });
    byId("open-settings").addEventListener("click", openSettings);
    byId("offline-open-settings").addEventListener("click", openSettings);
    byId("auto-close-offline-toggle").addEventListener("click", () => {
      const previous = state.autoCloseOfflineDialogEnabled;
      state.autoCloseOfflineDialogEnabled = previous === false;
      try { saveState(); } catch (error) {
        state.autoCloseOfflineDialogEnabled = previous;
        showNotice("设置保存失败：" + (error?.message || error), 6000);
      }
      renderAutoCloseSetting();
      handleOfflineCatchUpStatus(getCatchUpStatus());
    });
    byId("pause-offline-progress").addEventListener("click", () => context.pauseCatchUpByPlayer());
    for (const id of ["convert-offline-progress", "convert-quiet-catch-up"]) byId(id).addEventListener("click", () => {
      if (offlineAbandonPending) return;
      offlineAbandonPending = true;
      try {
        const result = context.convertOfflineToCompensation();
        if (result.converted) {
          offlineCompletedSummary = null;
          closeOfflineProgressDialog();
          showNotice(`已保留已结算收益，新增 ${formatElapsedTime(result.clockSeconds)} 两倍在线收益额度。`, 6000);
        } else if (result.error) showNotice(`转换失败，原时间与额度已保留：${result.error}`, 6000);
      } catch (error) {
        showNotice(`转换失败：${error?.message || error}`, 6000);
      } finally {
        offlineAbandonPending = false;
        handleOfflineCatchUpStatus(getCatchUpStatus());
      }
    });
    byId("close-settings").addEventListener("click", () => settingsDialog.close());
    settingsDialog.addEventListener("click", (event) => {
      if (event.target === settingsDialog) settingsDialog.close();
    });
    byId("open-automation-manager").addEventListener("click", () => {
      settingsDialog.close();
      renderAutomationManager(true);
      automationDialog.showModal();
    });
    byId("close-automation-manager").addEventListener("click", () => automationDialog.close());
    automationDialog.addEventListener("click", (event) => {
      if (event.target === automationDialog) automationDialog.close();
    });
    offlineProgressDialog.addEventListener("cancel", (event) => {
      if (getCatchUpStatus().phase !== 'paused') event.preventDefault();
    });
    byId('dismiss-paused-catch-up').addEventListener('click', () => closeOfflineProgressDialog());
    byId('show-paused-catch-up').addEventListener('click', () => openOfflineProgressDialog());
    byId("retry-offline-progress").addEventListener("click", () => {
      void retryCatchUp();
    });
    byId("abandon-offline-progress").addEventListener("click", () => {
      void abandonOfflineProgress();
    });
    byId("continue-after-offline").addEventListener("click", () => {
      dismissOfflineSummary();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && offlineCompletedSummary) handleOfflineCatchUpStatus(getCatchUpStatus());
    });
    byId("automation-groups").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-automation-id]");
      const definition = button ? AUTOMATION_BY_ID.get(button.dataset.automationId) : null;
      if (!definition || !definition.isUnlocked()) return;
      const enabled = definition.toggle();
      saveState();
      renderAutomationManager(true);
      showNotice(`${definition.name}已${enabled ? "开启" : "关闭"}`);
    });
    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.addEventListener("change", () => {
        state.theme = input.value === "dark" ? "dark" : "light";
        applyTheme();
        saveState();
      });
    });
    byId("export-save").addEventListener("click", exportSave);
    WIS.Core.Save.subscribeStatus(renderSaveStatus);
    renderSaveStatus();
    byId("retry-failed-save").addEventListener("click", () => {
      try {saveState();} catch(error) {WIS.Core.Save.noteFailure(error);}
    });
    byId("export-unsaved-progress").addEventListener("click", () => {
      try {exportSave();} catch(error) {WIS.Core.Save.diagnose("export",error);safeOperationNotice("当前进度备份生成失败，请保留页面。");}
    });
    byId("restore-save-backup").addEventListener("click", () => {
      const text=localStorage.getItem(WIS.Core.Save.backupKey());
      if (!text) { showNotice("还没有导入前备份。"); return; }
      void importSave({ text: async () => text });
    });
    byId("export-protected-save").addEventListener("click", () => {
      const text=WIS.Core.Save.storageSnapshot().text;
      if (!text) { showNotice("没有本地存档文件。"); return; }
      const url=URL.createObjectURL(new Blob([text],{type:"application/json"}));
      const anchor=document.createElement("a");anchor.href=url;anchor.download="WIS-本地原始存档.json";anchor.click();URL.revokeObjectURL(url);
    });
    byId("import-save").addEventListener("click", () => importInput.click());
    importInput.addEventListener("change", () => {
      const [file] = importInput.files;
      if (file) importSave(file);
      importInput.value = "";
    });
    byId("reset-game").addEventListener("click", resetGame);



    }

    function resetCultivationPage() {
      markExplorationPreviewDirty();
      activeCultivationPage = "realms";
      dirtyPages.add("cultivation");
    }
    function effectiveDevSpeed() {
      if (!BUILD.enableSpeedControls) return 1;
      const savedSpeed = Number(rawById("debug-speed-button")?.dataset.multiplier) || 1;
      return debugSpeedOptions.includes(savedSpeed) ? savedSpeed : 1;
    }

    return Object.freeze({
      __test: Object.freeze({markExplorationPreviewDirty, explorationPreviewState: () => [...explorationPreviews].map(([key, s]) => ({ key, calculatedAt:s.calculatedAt, dirty:s.dirty })), renderOnlineCompensation,handleOfflineCatchUpStatus,dismissOfflineSummary,
        closeOfflineProgressDialog,status:()=>offlineCatchUpStatus}),
      render, renderResourceDebugPanel, renderAchievements, renderChallenges, renderCultivationPage,
      ensureAchievementCards, applyTheme, switchPage, switchCultivationPage,
      showNotice, showAchievementNotice, showScaleNotice, bindEvents,
      resetCultivationPage, effectiveDevSpeed, getDebugSpeedMultiplier: effectiveDevSpeed,
      ensureAdvancedRealmAbilityGroups,
      markGlobalDirty, markCurrentPageDirty, markPagesDirty,
      markCostGroupsDirty, markAchievementsDirty
    });
  }

  WIS.UI.App = Object.freeze({ scaleUpgradePreviewText, create, advancedRealmAbilityIndexesForLevel, globalRateText });
}(window.WIS));
