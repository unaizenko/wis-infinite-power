(function defineScaleLogic(WIS) {
  "use strict";

  const runtime = WIS.Core.Runtime;
  const state = runtime.state;
  const CONFIG = WIS.Core.Config;
  const POWER_COSTS = CONFIG.costs.power;
  const GYM_COST = POWER_COSTS.gym, EXERCISE_COST = POWER_COSTS.exercise, TRANSCENDENT_COST = POWER_COSTS.transcendent;
  const FOCUS_COST = POWER_COSTS.focus, BREATHING_METHOD_COST = POWER_COSTS.breathingMethod, EXTREME_EXERCISE_COST = POWER_COSTS.extremeExercise;
  const WATER_COST = POWER_COSTS.water, GHOST_BRAIN_COST = POWER_COSTS.ghostBrain, NATURAL_STRENGTH_COST = POWER_COSTS.naturalStrength;
  const MENTAL_POWER_COST = POWER_COSTS.mentalPower, LIFE_POWER_COST = POWER_COSTS.lifePower, MY_STYLE_COST = POWER_COSTS.myStyle;
  const INTUITION_COST = POWER_COSTS.intuition, SONIC_MOVEMENT_COST = POWER_COSTS.sonicMovement, CARBON_LIMIT_COST = POWER_COSTS.carbonLimit;
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
  const ROCK_BASE_LEVEL_CAP = CONFIG.rockBaseLevelCap;
  const TRAINING_J_DECAY_SCALE = CONFIG.training.decayScale, TRAINING_J_DECAY_LOG_DIVISOR = CONFIG.training.decayLogDivisor, TRAINING_J_DECAY_POWER = CONFIG.training.decayPower;
  const SCATTER_RETAINED_UPGRADE_TIERS = CONFIG.scatterRetainedUpgradeTiers;
  const SCALE_THRESHOLDS = CONFIG.scales;
  const CHALLENGE_DEFINITIONS = CONFIG.challenges;
  const FOCUS_LATE_SOFTCAP_START = 5e13;
  const FOCUS_LATE_SOFTCAP_EXPONENT = 0.75;
  const CONTINENT_REFERENCE_POWER = 8.368e22;

  const calculateSourceGain = (options) => WIS.Core.Formulas.source(options);
  const calculateRegionGain = (sources, options) => WIS.Core.Formulas.region(sources, options);
  const multiplyEffectGroups = (groups) => WIS.Core.Formulas.multiply(Object.values(groups).flat());
  const applyResourceSoftcap = (...args) => runtime.call("applyResourceSoftcap", ...args);
  const resourceSoftcapExponent = (...args) => runtime.call("resourceSoftcapExponent", ...args);
  const updateLifetimeStatistics = (...args) => runtime.call("updateLifetimeStatistics", ...args);
  const showScaleNotice = (...args) => runtime.call("showScaleNotice", ...args);
  const checkActiveChallengeCompletion = (...args) => runtime.call("checkActiveChallengeCompletion", ...args);
  const showNotice = (...args) => runtime.call("showNotice", ...args);
  const saveState = (...args) => runtime.call("save", ...args);
  const render = (...args) => runtime.call("render", ...args);
  const achievementStates = (...args) => runtime.call("achievementStates", ...args);
  const notifyNewAchievements = (...args) => runtime.call("notifyNewAchievements", ...args);
  const minorTribulationPowerExponent = (...args) => runtime.call("minorTribulationPowerExponent", ...args);
  const celestialDeclineExponent = (...args) => runtime.call("celestialDeclineExponent", ...args);
  const hasAchievement = (key) => WIS.Meta.Achievements.has(state, key);
  const upgradesUnlocked = () => hasAchievement("powerOne");

  function gymPotentialMultiplier() {
    return (1.25 + Math.log10(1 + Math.max(0, state.power)) * 0.5) * breathingMethodGymMultiplier();
  }

  function gymMultiplier() {
    return state.gymPurchased ? gymPotentialMultiplier() * sonicMovementMultiplier() : 1;
  }

  function sonicMovementMultiplier() {
    return state.sonicMovementPurchased ? Math.pow(3.8, godspeedExponent()) : 1;
  }

  function godspeedExponent() {
    return state.godspeedPurchased ? godspeedPotentialExponent() : 1;
  }

  function godspeedPotentialExponent() {
    return 1 + 0.05 * Math.log10(1 + Math.max(0, state.power) / 3.033e15);
  }

  function breathingMethodGymMultiplier() {
    return state.breathingMethodPurchased ? 1.5 : 1;
  }

  function scaleIndexForPower(power) {
    return WIS.Core.Registries.powerSystems.get("scale").tierIndexForPower(power);
  }

  function updateScaleProgress(notify = true) {
    const previousScaleIndex = state.highestScaleIndex;
    state.highestPower = Math.max(state.highestPower, state.power);
    state.highestScaleIndex = Math.max(state.highestScaleIndex, scaleIndexForPower(state.power));
    state.brickUnlocked = state.highestScaleIndex >= 1;
    state.wallUnlocked = state.highestScaleIndex >= 2;
    updateLifetimeStatistics();
    if (notify && state.highestScaleIndex > previousScaleIndex) {
      const enteredScales = SCALE_THRESHOLDS
        .slice(previousScaleIndex + 1, state.highestScaleIndex + 1)
        .map((scale) => scale.name);
      showScaleNotice(enteredScales);
    }
    checkActiveChallengeCompletion();
  }

  function rollFitnessMembershipCardAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => hasAchievement("scale5") && fitnessJBonus() > 0,
      fitnessMembershipCardChance,
      () => { WIS.Meta.Treasures.add(state, "fitnessMembershipCard"); }
    );

    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得宝物烙印：健身房会员卡 +${gained}`);
    }
    return gained;
  }

  function superLollipopCount() {
    return state.treasureImprints?.superLollipop || 0;
  }

  function superLollipopChance() {
    return 0.01 / Math.sqrt(1 + superLollipopCount() / 10);
  }

  function superLollipopTrainingMultiplier() {
    return 1 + superLollipopCount() * 0.05;
  }

  function rollSuperLollipopAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => hasAchievement("scale8"),
      superLollipopChance,
      () => { WIS.Meta.Treasures.add(state, "superLollipop"); }
    );
    if (!silent && gained > 0) showNotice(`获得永久宝物：超级棒棒糖 +${gained}`);
    return gained;
  }

  function skyCrystalCount() {
    return state.treasureImprints?.skyCrystal || 0;
  }

  function skyCrystalChance() {
    return Math.min(1,
      0.005 * (1 + Math.log10(1 + effectiveRockLevel() / 1000)) /
        Math.sqrt(1 + skyCrystalCount() / 10)
    );
  }

  function skyCrystalRockMultiplier() {
    return 1 + skyCrystalCount() * 0.05;
  }

  function rollSkyCrystalAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => hasAchievement("scale9") && rockPowerPerSecond() > 0,
      skyCrystalChance,
      () => { WIS.Meta.Treasures.add(state, "skyCrystal"); }
    );
    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得永久宝物：天晶 +${gained}`);
    }
    return gained;
  }

  function exercisePotentialMultiplier() {
    return 1.1 + Math.log10(1 + Math.max(0, state.joules)) * 0.1;
  }

  function exerciseMultiplier() {
    return state.exercisePurchased ? exercisePotentialMultiplier() * extremeExerciseEffectMultiplier() : 1;
  }

  function transcendentPotentialMultiplier() {
    return 1 + Math.log10(1 + Math.max(0, state.power)) * 0.15;
  }

  function transcendentMultiplier() {
    return state.transcendentPurchased ? transcendentPotentialMultiplier() : 1;
  }

  function extremeExerciseEffectMultiplier() {
    return state.extremeExercisePurchased ? 1.5 : 1;
  }

  function naturalStrengthPotentialMultiplier() {
    return 1 + Math.log10(1 + Math.max(0, state.joules)) * 0.15;
  }

  function powerMultiplierGroups() {
    return WIS.Core.Effects.groups("power", "regionMultiplier", state);
  }

  function powerMultiplier() {
    return multiplyEffectGroups(powerMultiplierGroups());
  }

  function challengeCompletionCount(key) {
    return WIS.Meta.Challenges.completionCount(state, key);
  }

  function challengeRewardExponent(key) {
    const challenge = CHALLENGE_DEFINITIONS[key];
    const completions = challengeCompletionCount(key);
    return completions > 0 && challenge.rewardExponents ? challenge.rewardExponents[completions - 1] : 1;
  }

  function challengeRewardMultiplier(key) {
    const challenge = CHALLENGE_DEFINITIONS[key];
    const completions = challengeCompletionCount(key);
    return completions > 0 && challenge.rewardMultipliers ? challenge.rewardMultipliers[completions - 1] : 1;
  }

  function longevityChallengeRewardMultiplier() {
    return challengeRewardMultiplier("longevity");
  }

  function fiveMisfortunesRewardExponent() {
    return state.cultivation.active ? 1 : challengeRewardExponent("fiveMisfortunes");
  }

  function activeChallengeLimitExponent(key) {
    if (state.activeChallenge !== key) return 1;
    const challenge = CHALLENGE_DEFINITIONS[key];
    const limitExponent = challenge.limitExponents[challengeCompletionCount(key)] ?? 1;
    if (!challenge.timeToLimitSeconds) return limitExponent;
    const progress = Math.max(0, Math.min(1, state.activeChallengeElapsedSeconds / challenge.timeToLimitSeconds));
    return 1 - (1 - limitExponent) * progress;
  }

  function jGainExponent() {
    return WIS.Core.Effects.product("joules", "regionExponent", state);
  }

  function powerGainExponent() {
    return WIS.Core.Effects.product("power", "regionExponent", state);
  }

  function currentPowerMilestone() {
    if (state.symbolicPowerMilestones?.tree3) return "tree3";
    if (state.symbolicPowerMilestones?.graham64) return "graham64";
    if (state.lifetimeHighestPower >= 1e100) return "googol";
    return "number";
  }

  function reachedPowerMilestone(target) {
    const order = { number: 0, googol: 1, graham64: 2, tree3: 3 };
    return order[currentPowerMilestone()] >= order[target];
  }

  function superpowerExponent() {
    if (!state.superpowerPurchased) return 1;
    return state.superpowerEvolutionPurchased ? 1.06 : 1.05;
  }

  function fitnessSourceExponent() {
    return WIS.Core.Effects.product("fitness", "sourceExponent", state);
  }

  function trainingSourceExponent() {
    return WIS.Core.Effects.product("training", "sourceExponent", state);
  }

  function applyGainExponent(value, exponent) {
    return value > 0 ? Math.pow(value, exponent) : 0;
  }

  function additiveLevelMultiplier(level, perLevelMultiplier) {
    return level > 0 ? level * perLevelMultiplier : 1;
  }

  function jMultiplierGroups() {
    return WIS.Core.Effects.groups("joules", "regionMultiplier", state);
  }

  function jMultiplier() {
    return multiplyEffectGroups(jMultiplierGroups());
  }

  function automaticJPerSecond() {
    return finalJPerSecondFromSources(jSourceGains());
  }

  function jSourceGains({ includeFitness = true } = {}) {
    return [
      1,
      includeFitness ? fitnessJBonus() : 0,
      achievementJBonus(),
      killingIntentJBonus(),
      elementalizationJSource(),
      ...WIS.Core.Sources.values("joules", state)
    ];
  }

  function continentPowerMagnitude() {
    return Math.log10(1 + Math.max(0, state.power) / CONTINENT_REFERENCE_POWER);
  }

  function elementalizationJSource() {
    if (!state.elementalizationPurchased) return 0;
    const base = 1e12 * Math.pow(Math.max(0, fitnessJBonus()) / 1e12, 1.4);
    return calculateSourceGain({
      base,
      exponents: WIS.Core.Effects.values("elementalization", "sourceExponent", state)
    });
  }

  function finalJPerSecondFromSources(sourceGains) {
    const regionGain = calculateRegionGain(sourceGains, {
      multipliers: [jMultiplier()],
      exponents: [jGainExponent()]
    });
    return applyResourceSoftcap(applyGainExponent(regionGain, celestialDeclineExponent()), state.joules);
  }

  function longevityFitnessMultiplier() {
    return lifePowerFitnessMultiplier() *
      myStyleFitnessMultiplier() *
      enduranceEnhancementFitnessMultiplier() *
      regenerationFitnessMultiplier();
  }

  function lifePowerFitnessMultiplier() {
    return state.lifePowerPurchased ? 1.5 : 1;
  }

  function myStylePotentialFitnessMultiplier() {
    const jMagnitude = Math.log10(1 + Math.max(0, state.joules));
    return 1 + 0.18 * Math.pow(jMagnitude, 0.85);
  }

  function myStyleFitnessMultiplier() {
    return state.myStylePurchased ? myStylePotentialFitnessMultiplier() : 1;
  }

  function carbonLimitPotentialFitnessBonus() {
    const jMagnitude = Math.log10(1 + Math.max(0, state.joules));
    return 0.8 * Math.pow(jMagnitude, 1.2);
  }

  function carbonLimitFitnessBonus() {
    return state.carbonLimitPurchased ? carbonLimitPotentialFitnessBonus() : 0;
  }

  function regenerationFitnessMultiplier() {
    if (!state.regenerationPurchased) return 1;
    return state.hyperRegenerationPurchased ? 15 : 5;
  }

  function enduranceEnhancementFitnessMultiplier() {
    return state.enduranceEnhancementPurchased ? 2 : 1;
  }

  function fitnessMembershipCardCount() {
    return state.treasureImprints?.fitnessMembershipCard || 0;
  }

  function fitnessMembershipCardFitnessBonus() {
    return fitnessMembershipCardCount() * 0.002;
  }

  function fitnessMembershipCardChance() {
    return 0.005 * Math.pow(0.97, fitnessMembershipCardCount());
  }

  function fitnessJBonus() {
    return calculateSourceGain({
      base: effectiveFitnessLevel() * 2,
      multipliers: [
        longevityFitnessMultiplier() * WIS.Core.Effects.product("fitness", "baseMultiplier", state) +
          carbonLimitFitnessBonus() + fitnessMembershipCardFitnessBonus(),
        WIS.Core.Effects.product("fitness", "sourceMultiplier", state)
      ],
      exponents: [fitnessSourceExponent()]
    });
  }

  function effectiveFitnessLevel() {
    return state.runningLevel + (state.humanGhostTransformationPurchased ? state.rockLevel : 0);
  }

  function waterPotentialJMultiplier() {
    return 1 + Math.log10(1 + Math.max(0, state.highestPower)) * 0.14;
  }

  function runningCost() {
    const nextLevel = state.runningLevel + 1;
    if (nextLevel <= 10) {
      return Math.ceil(4 + (nextLevel - 1) * (12 / 9));
    }
    return Math.ceil(16 * Math.pow(1.25, nextLevel - 10));
  }

  function fitnessLevelCap() {
    const trueBrickBonus = hasAchievement("trueBrick") ? 20 : 0;
    return 10 + trueBrickBonus +
      (state.enduranceEnhancementPurchased ? 20 : 0) +
      (state.hyperRegenerationPurchased ? 20 : 0) +
      WIS.Core.Effects.values("fitnessLevelCap", "sourceAdditive", state)
        .reduce((total, value) => total + value, 0);
  }

  function rockLevelCap() {
    return ROCK_BASE_LEVEL_CAP +
      (hasAchievement("trueScale2") ? 20 : 0) +
      (state.rockStrikePurchased ? 20 : 0) +
      (state.mountainCollapsePurchased ? 20 : 0) +
      (state.earthSplitPurchased ? 20 : 0) +
      WIS.Core.Effects.values("rockLevelCap", "sourceAdditive", state)
        .reduce((total, value) => total + value, 0);
  }

  function baseConversionGain() {
    if (state.joules < 10) return 0;
    return Math.floor(Math.pow(state.joules / 10, 0.75));
  }

  function trainingPowerDecayMultiplier() {
    if (baseConversionGain() <= 1) return 1;
    const jDecades = Math.log10(1 + Math.max(0, state.joules) / TRAINING_J_DECAY_SCALE);
    return Math.pow(1 + jDecades / TRAINING_J_DECAY_LOG_DIVISOR, -TRAINING_J_DECAY_POWER);
  }

  function trainingPowerSource() {
    const baseGain = baseConversionGain();
    if (baseGain < 1) return 0;
    return calculateSourceGain({
      base: baseGain,
      multipliers: [trainingPowerDecayMultiplier(), ...WIS.Core.Effects.values("training", "sourceMultiplier", state)],
      exponents: [trainingSourceExponent()]
    });
  }

  function highSpeedMetabolismMultiplier() {
    return WIS.Core.Effects.value("highSpeedMetabolism", state);
  }

  function conversionGain() {
    return finalPowerGainFromSources([challengeAdjustedPowerSource(trainingPowerSource(), "training")]);
  }

  function ghostBrainPotentialPowerBonus() {
    return Math.pow(Math.max(0, state.highestPower), 0.6) / 250;
  }

  function ghostBrainPowerBonus() {
    return state.ghostBrainPurchased
      ? ghostBrainPotentialPowerBonus() * WIS.Core.Effects.product("ghostBrain", "sourceMultiplier", state)
      : 0;
  }

  function mentalDomainMultiplier() {
    return WIS.Core.Effects.value("mentalDomain", state);
  }

  function skySplitPotentialMultiplier() {
    return 1 + 0.5 * Math.log10(1 + Math.max(0, state.power) / 3.033e15);
  }

  function skySplitMultiplier() {
    return WIS.Core.Effects.value("skySplit", state);
  }

  function ghostBrainPowerSource() {
    return calculateSourceGain({
      base: ghostBrainPowerBonus(),
      exponents: [brainDomainDevelopmentExponent()]
    });
  }

  function brainDomainDevelopmentExponent() {
    return state.brainDomainDevelopmentPurchased
      ? Math.min(1.3, 1 + 0.1 * continentPowerMagnitude())
      : 1;
  }

  function ghostBrainActualPowerPerSecond() {
    return finalPowerGainFromSources([ghostBrainPowerSource()]);
  }

  function joulesForNextBasePower() {
    const nextBasePower = baseConversionGain() + 1;
    return Math.ceil(10 * Math.pow(nextBasePower, 1 / 0.75));
  }

  function focusPowerPerSecond() {
    return calculateSourceGain({
      base: rawFocusPowerPerSecond(),
      exponents: WIS.Core.Effects.values("focus", "sourceExponent", state),
      softcaps: [applyFocusLateSoftcap, (gain) => applyResourceSoftcap(gain, state.power)]
    });
  }

  function subtleFocusExponent() {
    return WIS.Core.Effects.value("subtle", state);
  }

  function rawFocusPowerPerSecond() {
    if (!state.focusPurchased || baseConversionGain() < 1) return 0;
    return calculateSourceGain({
      base: baseConversionGain(),
      multipliers: [trainingPowerDecayMultiplier(), ...WIS.Core.Effects.values("focus", "sourceMultiplier", state)]
    });
  }

  function applyFocusLateSoftcap(gain) {
    const safeGain = Math.max(0, Number(gain) || 0);
    if (safeGain <= FOCUS_LATE_SOFTCAP_START) return safeGain;
    return FOCUS_LATE_SOFTCAP_START * Math.pow(
      safeGain / FOCUS_LATE_SOFTCAP_START,
      FOCUS_LATE_SOFTCAP_EXPONENT
    );
  }

  function dynamicFocusMultiplier() {
    return WIS.Core.Effects.value("dynamicFocus", state);
  }

  function focusSoftcapExponent() {
    return resourceSoftcapExponent(state.power);
  }

  function actualFocusPowerPerSecond() {
    return finalPowerGainFromSources([challengeAdjustedPowerSource(focusPowerPerSecond(), "focus")]);
  }

  function killingIntentJBonus() {
    return state.killingIntentPurchased ? killingIntentPotentialJBonus() : 0;
  }

  function rawKillingIntentPotentialJBonus() {
    return state.focusPurchased
      ? actualFocusPowerPerSecond() * killingIntentExtractionRatio() * WIS.Core.Effects.product("killingIntent", "sourceMultiplier", state)
      : 0;
  }

  function killingIntentExtractionRatio() {
    return state.killingIntentPerceptionPurchased ? 5e-4 : 5e-7;
  }

  function killingIntentWaveExponent() {
    return state.killingIntentWavePurchased
      ? Math.min(1.1, 1 + 0.01 * continentPowerMagnitude())
      : 1;
  }

  function superSpeedThinkingMultiplier() {
    return WIS.Core.Effects.value("superSpeedThinking", state);
  }

  function killingIntentPotentialJBonus() {
    return calculateSourceGain({
      base: rawKillingIntentPotentialJBonus(),
      exponents: [killingIntentWaveExponent(), ...WIS.Core.Effects.values("killingIntent", "sourceExponent", state)]
    });
  }

  function focusPercent() {
    return WIS.Core.Effects.value("focusRatio", state);
  }

  function intuitionPotentialFocusMultiplier() {
    const dynamicBonus = Math.log10(1 + Math.max(0, state.power)) * 0.1;
    return 1 + dynamicBonus * (state.superPerceptionPurchased ? 1.5 : 1);
  }

  function intuitionFocusMultiplier() {
    return WIS.Core.Effects.value("intuition", state);
  }

  function rockCost() {
    return Math.ceil(
      ROCK_BASE_COST +
      1500 * state.rockLevel +
      500 * Math.pow(state.rockLevel, 2)
    );
  }

  function rockPowerPerSecond() {
    if (state.rockLevel <= 0) return 0;
    return calculateSourceGain({
      base: 16 * Math.pow(effectiveRockLevel(), 1.2),
      multipliers: WIS.Core.Effects.values("rock", "sourceMultiplier", state),
      exponents: WIS.Core.Effects.values("rock", "sourceExponent", state)
    });
  }

  function effectiveRockLevel() {
    const originalEffectiveLevel = hasAchievement("scale7") ? Math.floor(state.rockLevel * 1.2) : state.rockLevel;
    const continentSplitBonus = state.continentSplitPurchased ? Math.pow(state.rockLevel, 1.8) : 0;
    return originalEffectiveLevel + (state.ghostManTransformationPurchased ? state.runningLevel : 0) + continentSplitBonus;
  }

  function rockStrikeMultiplier() {
    return WIS.Core.Effects.value("rockStrike", state);
  }

  function mountainCollapseExponent() {
    return WIS.Core.Effects.value("mountainCollapse", state);
  }

  function automaticPowerPerSecond() {
    const registeredSources = WIS.Core.Sources.collect("power", state, { fitnessJBonus: fitnessJBonus() })
      .map((source) => challengeAdjustedPowerSource(source.value, source.id));
    return finalPowerGainFromSources([
      challengeAdjustedPowerSource(focusPowerPerSecond(), "focus"),
      challengeAdjustedPowerSource(rockPowerPerSecond(), "rock"),
      challengeAdjustedPowerSource(ghostBrainPowerSource(), "ghostBrain"),
      challengeAdjustedPowerSource(ultimateIntentPowerSource(), "ultimateIntent"),
      ...registeredSources
    ]);
  }

  function flowUltimateIntentMultiplier() {
    const focusSource = Math.max(0, focusPowerPerSecond());
    return Math.min(1e7, Math.pow(1 + Math.log10(1 + focusSource / 1e12), 14));
  }

  function ultimateIntentPowerSource() {
    if (!state.ultimateIntentPurchased) return 0;
    const base = 1e12 * Math.pow(Math.max(0, focusPowerPerSecond()) / 1e12, 1.4);
    return calculateSourceGain({
      base,
      multipliers: WIS.Core.Effects.values("ultimateIntent", "sourceMultiplier", state),
      exponents: WIS.Core.Effects.values("ultimateIntent", "sourceExponent", state)
    });
  }

  function activePowerSourceChallengeMultiplier(sourceId) {
    const challengeKey = state.activeChallenge;
    if (challengeKey !== "completeRealm" && challengeKey !== "moonless") return 1;
    if (challengeKey === "completeRealm" && sourceId === "ultimateIntent") return 1;
    if (challengeKey === "moonless" && sourceId === "rock") return 1;
    const challenge = CHALLENGE_DEFINITIONS[challengeKey];
    return challenge.sourceMultipliers?.[
      Math.min(challengeCompletionCount(challengeKey), challenge.sourceMultipliers.length - 1)
    ] ?? 1;
  }

  function challengeAdjustedPowerSource(source, sourceId) {
    return Math.max(0, Number(source) || 0) * activePowerSourceChallengeMultiplier(sourceId);
  }

  function finalPowerGainFromSources(sourceGains) {
    const regionGain = calculateRegionGain(sourceGains, {
      multipliers: [powerMultiplier()],
      exponents: [powerGainExponent()]
    });
    return applyResourceSoftcap(applyGainExponent(regionGain, celestialDeclineExponent()), state.power);
  }

  function mindDivisionCost() {
    return MIND_DIVISION_COSTS[state.mindDivisionLevel] ?? 0;
  }

  function manualScaleUpgradeHistory() {
    return state.powerSystem.systems.scale.history.manualUpgrades;
  }

  function hasManuallyUpgradedScale(key) {
    return manualScaleUpgradeHistory()[key] === true;
  }

  function autoUpgradeEnhancements() {
    if (state.powerSystem.active !== "scale") return 0;
    const upgradeAutomationActive = state.scaleUpgradeAutomationEnabled && hasAchievement("scale6");
    const actionAutomationActive = state.scaleActionAutomationEnabled && hasAchievement("trueScale7");
    if (!upgradeAutomationActive && !actionAutomationActive) return 0;
    const candidates = [
      { historyKey: "gymPurchased", cost: () => GYM_COST, available: () => upgradesUnlocked() && !state.gymPurchased, apply: () => { state.gymPurchased = true; } },
      { historyKey: "exercisePurchased", cost: () => EXERCISE_COST, available: () => upgradesUnlocked() && !state.exercisePurchased, apply: () => { state.exercisePurchased = true; } },
      { historyKey: "focusPurchased", cost: () => FOCUS_COST, available: () => state.brickUnlocked && !state.focusPurchased, apply: () => { state.focusPurchased = true; } },
      { historyKey: "transcendentPurchased", cost: () => TRANSCENDENT_COST, available: () => state.brickUnlocked && !state.transcendentPurchased, apply: () => { state.transcendentPurchased = true; } },
      { historyKey: "breathingMethodPurchased", cost: () => BREATHING_METHOD_COST, available: () => state.brickUnlocked && !state.breathingMethodPurchased, apply: () => { state.breathingMethodPurchased = true; } },
      { historyKey: "extremeExercisePurchased", cost: () => EXTREME_EXERCISE_COST, available: () => state.brickUnlocked && !state.extremeExercisePurchased, apply: () => { state.extremeExercisePurchased = true; } },
      { historyKey: "naturalStrengthPurchased", cost: () => NATURAL_STRENGTH_COST, available: () => state.wallUnlocked && !state.naturalStrengthPurchased, apply: () => { state.naturalStrengthPurchased = true; } },
      { historyKey: "waterPurchased", cost: () => WATER_COST, available: () => state.wallUnlocked && !state.waterPurchased, apply: () => { state.waterPurchased = true; } },
      { historyKey: "ghostBrainPurchased", cost: () => GHOST_BRAIN_COST, available: () => state.wallUnlocked && !state.ghostBrainPurchased, apply: () => { state.ghostBrainPurchased = true; } },
      { historyKey: "mentalPowerPurchased", cost: () => MENTAL_POWER_COST, available: () => state.wallUnlocked && !state.mentalPowerPurchased, apply: () => { state.mentalPowerPurchased = true; } },
      { historyKey: "lifePowerPurchased", cost: () => LIFE_POWER_COST, available: () => state.wallUnlocked && !state.lifePowerPurchased, apply: () => { state.lifePowerPurchased = true; } },
      { historyKey: "myStylePurchased", cost: () => MY_STYLE_COST, available: () => state.highestScaleIndex >= 3 && !state.myStylePurchased, apply: () => { state.myStylePurchased = true; } },
      { historyKey: "intuitionPurchased", cost: () => INTUITION_COST, available: () => state.highestScaleIndex >= 3 && !state.intuitionPurchased, apply: () => { state.intuitionPurchased = true; } },
      { historyKey: "sonicMovementPurchased", cost: () => SONIC_MOVEMENT_COST, available: () => state.highestScaleIndex >= 3 && !state.sonicMovementPurchased, apply: () => { state.sonicMovementPurchased = true; } },
      { historyKey: "carbonLimitPurchased", cost: () => CARBON_LIMIT_COST, available: () => state.highestScaleIndex >= 3 && !state.carbonLimitPurchased, apply: () => { state.carbonLimitPurchased = true; } },
      { historyKey: "killingIntentPurchased", cost: () => KILLING_INTENT_COST, available: () => state.highestScaleIndex >= 3 && !state.killingIntentPurchased, apply: () => { state.killingIntentPurchased = true; } },
      { historyKey: "rockStrikePurchased", cost: () => ROCK_STRIKE_COST, available: () => state.highestScaleIndex >= 4 && !state.rockStrikePurchased, apply: () => { state.rockStrikePurchased = true; } },
      { historyKey: "highSpeedMetabolismPurchased", cost: () => HIGH_SPEED_METABOLISM_COST, available: () => state.highestScaleIndex >= 4 && !state.highSpeedMetabolismPurchased, apply: () => { state.highSpeedMetabolismPurchased = true; } },
      { historyKey: "enduranceEnhancementPurchased", cost: () => ENDURANCE_ENHANCEMENT_COST, available: () => state.highestScaleIndex >= 4 && !state.enduranceEnhancementPurchased, apply: () => { state.enduranceEnhancementPurchased = true; } },
      { historyKey: "bulletTimePurchased", cost: () => BULLET_TIME_COST, available: () => state.highestScaleIndex >= 4 && !state.bulletTimePurchased, apply: () => { state.bulletTimePurchased = true; } },
      { historyKey: "dynamicFocusPurchased", cost: () => DYNAMIC_FOCUS_COST, available: () => state.highestScaleIndex >= 4 && !state.dynamicFocusPurchased, apply: () => { state.dynamicFocusPurchased = true; } },
      { historyKey: "superPerceptionPurchased", cost: () => SUPER_PERCEPTION_COST, available: () => state.highestScaleIndex >= 5 && !state.superPerceptionPurchased, apply: () => { state.superPerceptionPurchased = true; } },
      { historyKey: "invulnerablePurchased", cost: () => INVULNERABLE_COST, available: () => state.highestScaleIndex >= 5 && !state.invulnerablePurchased, apply: () => { state.invulnerablePurchased = true; } },
      { historyKey: "regenerationPurchased", cost: () => REGENERATION_COST, available: () => state.highestScaleIndex >= 5 && !state.regenerationPurchased, apply: () => { state.regenerationPurchased = true; } },
      { historyKey: "superpowerPurchased", cost: () => SUPERPOWER_COST, available: () => state.highestScaleIndex >= 5 && !state.superpowerPurchased, apply: () => { state.superpowerPurchased = true; } },
      { historyKey: "superSpeedThinkingPurchased", cost: () => SUPER_SPEED_THINKING_COST, available: () => state.highestScaleIndex >= 5 && !state.superSpeedThinkingPurchased, apply: () => { state.superSpeedThinkingPurchased = true; } },
      { historyKey: "mountainCollapsePurchased", cost: () => MOUNTAIN_COLLAPSE_COST, available: () => state.highestScaleIndex >= 5 && !state.mountainCollapsePurchased, apply: () => { state.mountainCollapsePurchased = true; } },
      { historyKey: "mindDivisionLevel", cost: mindDivisionCost, available: () => state.highestScaleIndex >= 6 && state.focusPurchased && state.mindDivisionLevel < 3, apply: () => { state.mindDivisionLevel += 1; } },
      { historyKey: "hyperRegenerationPurchased", cost: () => HYPER_REGENERATION_COST, available: () => state.highestScaleIndex >= 6 && state.regenerationPurchased && !state.hyperRegenerationPurchased, apply: () => { state.hyperRegenerationPurchased = true; } },
      { historyKey: "mentalDomainPurchased", cost: () => MENTAL_DOMAIN_COST, available: () => state.highestScaleIndex >= 6 && state.ghostBrainPurchased && !state.mentalDomainPurchased, apply: () => { state.mentalDomainPurchased = true; } },
      { historyKey: "earthSplitPurchased", cost: () => EARTH_SPLIT_COST, available: () => state.highestScaleIndex >= 6 && state.mountainCollapsePurchased && !state.earthSplitPurchased, apply: () => { state.earthSplitPurchased = true; } },
      { historyKey: "godspeedPurchased", cost: () => GODSPEED_COST, available: () => state.highestScaleIndex >= 6 && state.sonicMovementPurchased && !state.godspeedPurchased, apply: () => { state.godspeedPurchased = true; } },
      { historyKey: "superpowerEvolutionPurchased", cost: () => SUPERPOWER_EVOLUTION_COST, available: () => state.highestScaleIndex >= 6 && state.superpowerPurchased && !state.superpowerEvolutionPurchased, apply: () => { state.superpowerEvolutionPurchased = true; } },
      { historyKey: "subtlePurchased", cost: () => SUBTLE_COST, available: () => state.highestScaleIndex >= 6 && state.focusPurchased && !state.subtlePurchased, apply: () => { state.subtlePurchased = true; } },
      { historyKey: "skySplitPurchased", cost: () => SKY_SPLIT_COST, available: () => state.highestScaleIndex >= 6 && state.mentalDomainPurchased && !state.skySplitPurchased, apply: () => { state.skySplitPurchased = true; } },
      { historyKey: "biologicalQuantificationPurchased", cost: () => BIOLOGICAL_QUANTIFICATION_COST, available: () => state.highestScaleIndex >= 7 && !state.biologicalQuantificationPurchased, apply: () => { state.biologicalQuantificationPurchased = true; } },
      { historyKey: "ghostManTransformationPurchased", cost: () => GHOST_MAN_TRANSFORMATION_COST, available: () => state.highestScaleIndex >= 7 && !state.ghostManTransformationPurchased, apply: () => { state.ghostManTransformationPurchased = true; } },
      { historyKey: "destroyCountryPurchased", cost: () => DESTROY_COUNTRY_COST, available: () => state.highestScaleIndex >= 7 && !state.destroyCountryPurchased, apply: () => { state.destroyCountryPurchased = true; } },
      { historyKey: "humanGhostTransformationPurchased", cost: () => HUMAN_GHOST_TRANSFORMATION_COST, available: () => state.highestScaleIndex >= 7 && !state.humanGhostTransformationPurchased, apply: () => { state.humanGhostTransformationPurchased = true; } },
      { historyKey: "killingIntentSubstancePurchased", cost: () => KILLING_INTENT_SUBSTANCE_COST, available: () => state.highestScaleIndex >= 7 && !state.killingIntentSubstancePurchased, apply: () => { state.killingIntentSubstancePurchased = true; } },
      { historyKey: "energyCyclePurchased", cost: () => ENERGY_CYCLE_COST, available: () => state.highestScaleIndex >= 7 && !state.energyCyclePurchased, apply: () => { state.energyCyclePurchased = true; } },
      { historyKey: "mountainShatterPurchased", cost: () => MOUNTAIN_SHATTER_COST, available: () => state.highestScaleIndex >= 7 && !state.mountainShatterPurchased, apply: () => { state.mountainShatterPurchased = true; } },
      { historyKey: "bioenergyPurchased", cost: () => BIOENERGY_COST, available: () => state.highestScaleIndex >= 7 && !state.bioenergyPurchased, apply: () => { state.bioenergyPurchased = true; } },
      { historyKey: "elementalizationPurchased", cost: () => ELEMENTALIZATION_COST, available: () => state.highestScaleIndex >= 8 && !state.elementalizationPurchased, apply: () => { state.elementalizationPurchased = true; } },
      { historyKey: "killingIntentPerceptionPurchased", cost: () => KILLING_INTENT_PERCEPTION_COST, available: () => state.highestScaleIndex >= 8 && !state.killingIntentPerceptionPurchased, apply: () => { state.killingIntentPerceptionPurchased = true; } },
      { historyKey: "killingIntentWavePurchased", cost: () => KILLING_INTENT_WAVE_COST, available: () => state.highestScaleIndex >= 8 && !state.killingIntentWavePurchased, apply: () => { state.killingIntentWavePurchased = true; } },
      { historyKey: "ultimateIntentPurchased", cost: () => ULTIMATE_INTENT_COST, available: () => state.highestScaleIndex >= 8 && !state.ultimateIntentPurchased, apply: () => { state.ultimateIntentPurchased = true; } },
      { historyKey: "brainDomainDevelopmentPurchased", cost: () => BRAIN_DOMAIN_DEVELOPMENT_COST, available: () => state.highestScaleIndex >= 8 && !state.brainDomainDevelopmentPurchased, apply: () => { state.brainDomainDevelopmentPurchased = true; } },
      { historyKey: "continentSplitPurchased", cost: () => CONTINENT_SPLIT_COST, available: () => state.highestScaleIndex >= 8 && !state.continentSplitPurchased, apply: () => { state.continentSplitPurchased = true; } },
      { historyKey: "continentCollapsePurchased", cost: () => CONTINENT_COLLAPSE_COST, available: () => state.highestScaleIndex >= 8 && !state.continentCollapsePurchased, apply: () => { state.continentCollapsePurchased = true; } },
      { historyKey: "waveEyePurchased", cost: () => WAVE_EYE_COST, available: () => state.highestScaleIndex >= 9 && !state.waveEyePurchased, apply: () => { state.waveEyePurchased = true; } },
      { historyKey: "elementalAwakeningPurchased", cost: () => ELEMENTAL_AWAKENING_COST, available: () => state.highestScaleIndex >= 9 && !state.elementalAwakeningPurchased, apply: () => { state.elementalAwakeningPurchased = true; } },
      { historyKey: "moonfallPurchased", cost: () => MOONFALL_COST, available: () => state.highestScaleIndex >= 9 && !state.moonfallPurchased, apply: () => { state.moonfallPurchased = true; } },
      { historyKey: "flowStatePurchased", cost: () => FLOW_STATE_COST, available: () => state.highestScaleIndex >= 9 && !state.flowStatePurchased, apply: () => { state.flowStatePurchased = true; } },
      { historyKey: "selfhoodPurchased", cost: () => SELFHOOD_COST, available: () => state.highestScaleIndex >= 9 && !state.selfhoodPurchased, apply: () => { state.selfhoodPurchased = true; } },
      { historyKey: "freedomPurchased", cost: () => FREEDOM_COST, available: () => state.highestScaleIndex >= 9 && !state.freedomPurchased, apply: () => { state.freedomPurchased = true; } },
      { historyKey: "chicxulubMeteoritePurchased", cost: () => CHICXULUB_METEORITE_COST, available: () => state.highestScaleIndex >= 9 && !state.chicxulubMeteoritePurchased, apply: () => { state.chicxulubMeteoritePurchased = true; } },
      // 行动候选放在强化候选之后；稳定排序保证相同消耗时强化优先。
      { cost: runningCost, available: () => actionAutomationActive && upgradesUnlocked() && state.runningLevel < fitnessLevelCap(), apply: () => { state.runningLevel += 1; rollSuperLollipopAttempts(1, true); } },
      { cost: rockCost, available: () => actionAutomationActive && state.wallUnlocked && state.rockLevel < rockLevelCap(), apply: () => { state.rockLevel += 1; } }
    ];
    candidates.forEach((candidate) => {
      if (!candidate.historyKey) return;
      const available = candidate.available;
      candidate.available = () => upgradeAutomationActive && hasManuallyUpgradedScale(candidate.historyKey) && available();
    });
    let purchases = 0;
    const maximumPurchases = candidates.length + MIND_DIVISION_COSTS.length + fitnessLevelCap() + rockLevelCap();
    while (purchases < maximumPurchases && purchaseCheapestAvailable(candidates)) purchases += 1;
    return purchases;
  }

  function achievementJBonus() {
    const achievements = achievementStates();
    if (!achievements.brick) return 0;
    return Object.values(achievements).filter(Boolean).length * 0.1;
  }

  function train(manualClick = false) {
    const gained = conversionGain();
    if (gained < 1) return;

    const previousAchievements = achievementStates();
    if (manualClick) WIS.Meta.Achievements.registerTrainingClick();
    WIS.Core.Resources.set("joules", 0);
    WIS.Core.Resources.add("power", gained);
    state.totalPower += gained;
    state.lifetimeTotalPower += gained;
    state.maxSinglePowerGain = Math.max(state.maxSinglePowerGain, gained);
    updateScaleProgress();
    saveState();
    render();

    notifyNewAchievements(previousAchievements);
  }

  function buyRunning() {
    const cost = runningCost();
    if (!upgradesUnlocked() || state.runningLevel >= fitnessLevelCap() || state.power < cost) return;
    WIS.Core.Resources.spend("power", cost);
    state.runningLevel += 1;
    rollSuperLollipopAttempts(1);
    saveState();
    render();
  }

  function buyGym() {
    if (!upgradesUnlocked() || state.gymPurchased || state.power < GYM_COST) return;
    WIS.Core.Resources.spend("power", GYM_COST);
    state.gymPurchased = true;
    saveState();
    render();
  }

  function buyExercise() {
    if (!upgradesUnlocked() || state.exercisePurchased || state.power < EXERCISE_COST) return;
    WIS.Core.Resources.spend("power", EXERCISE_COST);
    state.exercisePurchased = true;
    saveState();
    render();
  }

  function buyTranscendent() {
    if (!state.brickUnlocked || state.transcendentPurchased || state.power < TRANSCENDENT_COST) return;
    WIS.Core.Resources.spend("power", TRANSCENDENT_COST);
    state.transcendentPurchased = true;
    saveState();
    render();
  }

  function buyFocus() {
    if (!state.brickUnlocked || state.focusPurchased || state.power < FOCUS_COST) return;
    WIS.Core.Resources.spend("power", FOCUS_COST);
    state.focusPurchased = true;
    saveState();
    render();
  }

  function buyBreathingMethod() {
    if (!state.brickUnlocked || state.breathingMethodPurchased || state.power < BREATHING_METHOD_COST) return;
    WIS.Core.Resources.spend("power", BREATHING_METHOD_COST);
    state.breathingMethodPurchased = true;
    saveState();
    render();
  }

  function buyExtremeExercise() {
    if (!state.brickUnlocked || state.extremeExercisePurchased || state.power < EXTREME_EXERCISE_COST) return;
    WIS.Core.Resources.spend("power", EXTREME_EXERCISE_COST);
    state.extremeExercisePurchased = true;
    saveState();
    render();
  }

  function buyRock() {
    const cost = rockCost();
    if (!state.wallUnlocked || state.rockLevel >= rockLevelCap() || state.power < cost) return;
    WIS.Core.Resources.spend("power", cost);
    state.rockLevel += 1;
    saveState();
    render();
  }

  function buyWater() {
    if (!state.wallUnlocked || state.waterPurchased || state.power < WATER_COST) return;
    WIS.Core.Resources.spend("power", WATER_COST);
    state.waterPurchased = true;
    saveState();
    render();
  }

  function buyGhostBrain() {
    if (!state.wallUnlocked || state.ghostBrainPurchased || state.power < GHOST_BRAIN_COST) return;
    WIS.Core.Resources.spend("power", GHOST_BRAIN_COST);
    state.ghostBrainPurchased = true;
    saveState();
    render();
  }

  function buyNaturalStrength() {
    if (!state.wallUnlocked || state.naturalStrengthPurchased || state.power < NATURAL_STRENGTH_COST) return;
    WIS.Core.Resources.spend("power", NATURAL_STRENGTH_COST);
    state.naturalStrengthPurchased = true;
    saveState();
    render();
  }

  function buyMentalPower() {
    if (!state.wallUnlocked || state.mentalPowerPurchased || state.power < MENTAL_POWER_COST) return;
    WIS.Core.Resources.spend("power", MENTAL_POWER_COST);
    state.mentalPowerPurchased = true;
    saveState();
    render();
  }

  function buyLifePower() {
    if (!state.wallUnlocked || state.lifePowerPurchased || state.power < LIFE_POWER_COST) return;
    WIS.Core.Resources.spend("power", LIFE_POWER_COST);
    state.lifePowerPurchased = true;
    saveState();
    render();
  }

  function buyMyStyle() {
    if (state.highestScaleIndex < 3 || state.myStylePurchased || state.power < MY_STYLE_COST) return;
    WIS.Core.Resources.spend("power", MY_STYLE_COST);
    state.myStylePurchased = true;
    saveState();
    render();
  }

  function buyIntuition() {
    if (state.highestScaleIndex < 3 || state.intuitionPurchased || state.power < INTUITION_COST) return;
    WIS.Core.Resources.spend("power", INTUITION_COST);
    state.intuitionPurchased = true;
    saveState();
    render();
  }

  function buySonicMovement() {
    if (state.highestScaleIndex < 3 || state.sonicMovementPurchased || state.power < SONIC_MOVEMENT_COST) return;
    WIS.Core.Resources.spend("power", SONIC_MOVEMENT_COST);
    state.sonicMovementPurchased = true;
    saveState();
    render();
  }

  function buyCarbonLimit() {
    if (state.highestScaleIndex < 3 || state.carbonLimitPurchased || state.power < CARBON_LIMIT_COST) return;
    WIS.Core.Resources.spend("power", CARBON_LIMIT_COST);
    state.carbonLimitPurchased = true;
    saveState();
    render();
  }

  function buyKillingIntent() {
    if (state.highestScaleIndex < 3 || state.killingIntentPurchased || state.power < KILLING_INTENT_COST) return;
    WIS.Core.Resources.spend("power", KILLING_INTENT_COST);
    state.killingIntentPurchased = true;
    saveState();
    render();
  }

  function buyRockStrike() {
    if (state.highestScaleIndex < 4 || state.rockStrikePurchased || state.power < ROCK_STRIKE_COST) return;
    WIS.Core.Resources.spend("power", ROCK_STRIKE_COST);
    state.rockStrikePurchased = true;
    saveState();
    render();
  }

  function buyHighSpeedMetabolism() {
    if (state.highestScaleIndex < 4 || state.highSpeedMetabolismPurchased || state.power < HIGH_SPEED_METABOLISM_COST) return;
    WIS.Core.Resources.spend("power", HIGH_SPEED_METABOLISM_COST);
    state.highSpeedMetabolismPurchased = true;
    saveState();
    render();
  }

  function buyEnduranceEnhancement() {
    if (state.highestScaleIndex < 4 || state.enduranceEnhancementPurchased || state.power < ENDURANCE_ENHANCEMENT_COST) return;
    WIS.Core.Resources.spend("power", ENDURANCE_ENHANCEMENT_COST);
    state.enduranceEnhancementPurchased = true;
    saveState();
    render();
  }

  function buyBulletTime() {
    if (state.highestScaleIndex < 4 || state.bulletTimePurchased || state.power < BULLET_TIME_COST) return;
    WIS.Core.Resources.spend("power", BULLET_TIME_COST);
    state.bulletTimePurchased = true;
    saveState();
    render();
  }

  function buyDynamicFocus() {
    if (state.highestScaleIndex < 4 || state.dynamicFocusPurchased || state.power < DYNAMIC_FOCUS_COST) return;
    WIS.Core.Resources.spend("power", DYNAMIC_FOCUS_COST);
    state.dynamicFocusPurchased = true;
    saveState();
    render();
  }

  function buySuperPerception() {
    if (state.highestScaleIndex < 5 || state.superPerceptionPurchased || state.power < SUPER_PERCEPTION_COST) return;
    WIS.Core.Resources.spend("power", SUPER_PERCEPTION_COST);
    state.superPerceptionPurchased = true;
    saveState();
    render();
  }

  function buyInvulnerable() {
    if (state.highestScaleIndex < 5 || state.invulnerablePurchased || state.power < INVULNERABLE_COST) return;
    WIS.Core.Resources.spend("power", INVULNERABLE_COST);
    state.invulnerablePurchased = true;
    saveState();
    render();
  }

  function buyRegeneration() {
    if (state.highestScaleIndex < 5 || state.regenerationPurchased || state.power < REGENERATION_COST) return;
    WIS.Core.Resources.spend("power", REGENERATION_COST);
    state.regenerationPurchased = true;
    saveState();
    render();
  }

  function buySuperpower() {
    if (state.highestScaleIndex < 5 || state.superpowerPurchased || state.power < SUPERPOWER_COST) return;
    WIS.Core.Resources.spend("power", SUPERPOWER_COST);
    state.superpowerPurchased = true;
    saveState();
    render();
  }

  function buySuperSpeedThinking() {
    if (state.highestScaleIndex < 5 || state.superSpeedThinkingPurchased || state.power < SUPER_SPEED_THINKING_COST) return;
    WIS.Core.Resources.spend("power", SUPER_SPEED_THINKING_COST);
    state.superSpeedThinkingPurchased = true;
    saveState();
    render();
  }

  function buyMountainCollapse() {
    if (state.highestScaleIndex < 5 || state.mountainCollapsePurchased || state.power < MOUNTAIN_COLLAPSE_COST) return;
    WIS.Core.Resources.spend("power", MOUNTAIN_COLLAPSE_COST);
    state.mountainCollapsePurchased = true;
    saveState();
    render();
  }

  function buyMindDivision() {
    const cost = mindDivisionCost();
    if (state.highestScaleIndex < 6 || !state.focusPurchased || state.mindDivisionLevel >= 3 || state.power < cost) return;
    WIS.Core.Resources.spend("power", cost);
    state.mindDivisionLevel += 1;
    saveState();
    render();
  }

  function buyPowerOneTime(stateKey, cost, prerequisiteMet = true, requiredScaleIndex = 6) {
    if (state.highestScaleIndex < requiredScaleIndex || !prerequisiteMet || state[stateKey] || state.power < cost) return;
    WIS.Core.Resources.spend("power", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function buyHyperRegeneration() {
    return buyPowerOneTime("hyperRegenerationPurchased", HYPER_REGENERATION_COST, state.regenerationPurchased);
  }

  function buyMentalDomain() {
    return buyPowerOneTime("mentalDomainPurchased", MENTAL_DOMAIN_COST, state.ghostBrainPurchased);
  }

  function buyEarthSplit() {
    return buyPowerOneTime("earthSplitPurchased", EARTH_SPLIT_COST, state.mountainCollapsePurchased);
  }

  function buyGodspeed() {
    return buyPowerOneTime("godspeedPurchased", GODSPEED_COST, state.sonicMovementPurchased);
  }

  function buySuperpowerEvolution() {
    return buyPowerOneTime("superpowerEvolutionPurchased", SUPERPOWER_EVOLUTION_COST, state.superpowerPurchased);
  }

  function buySubtle() {
    return buyPowerOneTime("subtlePurchased", SUBTLE_COST, state.focusPurchased);
  }

  function buySkySplit() {
    return buyPowerOneTime("skySplitPurchased", SKY_SPLIT_COST, state.mentalDomainPurchased);
  }

  function buyBiologicalQuantification() { return buyPowerOneTime("biologicalQuantificationPurchased", BIOLOGICAL_QUANTIFICATION_COST, true, 7); }
  function buyGhostManTransformation() { return buyPowerOneTime("ghostManTransformationPurchased", GHOST_MAN_TRANSFORMATION_COST, true, 7); }
  function buyDestroyCountry() { return buyPowerOneTime("destroyCountryPurchased", DESTROY_COUNTRY_COST, true, 7); }
  function buyHumanGhostTransformation() { return buyPowerOneTime("humanGhostTransformationPurchased", HUMAN_GHOST_TRANSFORMATION_COST, true, 7); }
  function buyKillingIntentSubstance() { return buyPowerOneTime("killingIntentSubstancePurchased", KILLING_INTENT_SUBSTANCE_COST, true, 7); }
  function buyEnergyCycle() { return buyPowerOneTime("energyCyclePurchased", ENERGY_CYCLE_COST, true, 7); }
  function buyMountainShatter() { return buyPowerOneTime("mountainShatterPurchased", MOUNTAIN_SHATTER_COST, true, 7); }
  function buyBioenergy() { return buyPowerOneTime("bioenergyPurchased", BIOENERGY_COST, true, 7); }
  function buyElementalization() { return buyPowerOneTime("elementalizationPurchased", ELEMENTALIZATION_COST, true, 8); }
  function buyKillingIntentPerception() { return buyPowerOneTime("killingIntentPerceptionPurchased", KILLING_INTENT_PERCEPTION_COST, true, 8); }
  function buyKillingIntentWave() { return buyPowerOneTime("killingIntentWavePurchased", KILLING_INTENT_WAVE_COST, true, 8); }
  function buyUltimateIntent() { return buyPowerOneTime("ultimateIntentPurchased", ULTIMATE_INTENT_COST, true, 8); }
  function buyBrainDomainDevelopment() { return buyPowerOneTime("brainDomainDevelopmentPurchased", BRAIN_DOMAIN_DEVELOPMENT_COST, true, 8); }
  function buyContinentSplit() { return buyPowerOneTime("continentSplitPurchased", CONTINENT_SPLIT_COST, true, 8); }
  function buyContinentCollapse() { return buyPowerOneTime("continentCollapsePurchased", CONTINENT_COLLAPSE_COST, true, 8); }
  function buyWaveEye() { return buyPowerOneTime("waveEyePurchased", WAVE_EYE_COST, true, 9); }
  function buyElementalAwakening() { return buyPowerOneTime("elementalAwakeningPurchased", ELEMENTAL_AWAKENING_COST, true, 9); }
  function buyMoonfall() { return buyPowerOneTime("moonfallPurchased", MOONFALL_COST, true, 9); }
  function buyFlowState() { return buyPowerOneTime("flowStatePurchased", FLOW_STATE_COST, true, 9); }
  function buySelfhood() { return buyPowerOneTime("selfhoodPurchased", SELFHOOD_COST, true, 9); }
  function buyFreedom() { return buyPowerOneTime("freedomPurchased", FREEDOM_COST, true, 9); }
  function buyChicxulubMeteorite() { return buyPowerOneTime("chicxulubMeteoritePurchased", CHICXULUB_METEORITE_COST, true, 9); }

  function toggleGhostBack() {
    if (state.highestScaleIndex < 3) return;
    state.ghostBackActive = !state.ghostBackActive;
    saveState();
    render();
  }

  function geometricAttemptsUntilSuccess(probability) {
    if (probability >= 1) return 1;
    if (probability <= 0) return Infinity;
    const denominator = Math.log1p(-probability);
    if (!Number.isFinite(denominator) || denominator === 0) return Infinity;
    return Math.floor(Math.log1p(-Math.random()) / denominator) + 1;
  }

  function rollDynamicAttempts(attempts, available, probability, award) {
    let remainingAttempts = Math.max(0, Math.floor(Number(attempts) || 0));
    if (remainingAttempts <= 0 || !available()) return 0;
    let gained = 0;
    while (remainingAttempts > 0 && available()) {
      const attemptsUntilSuccess = geometricAttemptsUntilSuccess(probability());
      if (!Number.isFinite(attemptsUntilSuccess) || attemptsUntilSuccess > remainingAttempts) break;
      remainingAttempts -= attemptsUntilSuccess;
      award();
      gained += 1;
    }
    return gained;
  }

  function purchaseCheapestAvailable(candidates) {
    const affordable = candidates
      .filter((candidate) => candidate.available())
      .map((candidate, candidateIndex) => ({ ...candidate, candidateIndex, currentCost: candidate.cost() }))
      .filter((candidate) => candidate.currentCost > 0 && WIS.Core.Resources.canAfford("power", candidate.currentCost))
      .sort((left, right) => left.currentCost - right.currentCost || left.candidateIndex - right.candidateIndex)[0];
    if (!affordable) return false;
    WIS.Core.Resources.spend("power", affordable.currentCost);
    affordable.apply();
    return true;
  }

  const actions = Object.freeze({
    train: "train", running: "buyRunning", focus: "buyFocus", rock: "buyRock", ghostBack: "toggleGhostBack"
  });
  const upgrades = Object.freeze({
    running: "buyRunning", gym: "buyGym", exercise: "buyExercise", transcendent: "buyTranscendent",
    focus: "buyFocus", breathingMethod: "buyBreathingMethod", extremeExercise: "buyExtremeExercise",
    rock: "buyRock", water: "buyWater", ghostBrain: "buyGhostBrain", naturalStrength: "buyNaturalStrength",
    mentalPower: "buyMentalPower", lifePower: "buyLifePower", myStyle: "buyMyStyle", intuition: "buyIntuition",
    sonicMovement: "buySonicMovement", carbonLimit: "buyCarbonLimit", killingIntent: "buyKillingIntent",
    rockStrike: "buyRockStrike", highSpeedMetabolism: "buyHighSpeedMetabolism",
    enduranceEnhancement: "buyEnduranceEnhancement", bulletTime: "buyBulletTime", dynamicFocus: "buyDynamicFocus",
    superPerception: "buySuperPerception", invulnerable: "buyInvulnerable", regeneration: "buyRegeneration",
    superpower: "buySuperpower", superSpeedThinking: "buySuperSpeedThinking", mountainCollapse: "buyMountainCollapse",
    mindDivision: "buyMindDivision", hyperRegeneration: "buyHyperRegeneration", mentalDomain: "buyMentalDomain",
    earthSplit: "buyEarthSplit", godspeed: "buyGodspeed", superpowerEvolution: "buySuperpowerEvolution",
    subtle: "buySubtle", skySplit: "buySkySplit", biologicalQuantification: "buyBiologicalQuantification",
    ghostManTransformation: "buyGhostManTransformation", destroyCountry: "buyDestroyCountry",
    humanGhostTransformation: "buyHumanGhostTransformation", killingIntentSubstance: "buyKillingIntentSubstance",
    energyCycle: "buyEnergyCycle", mountainShatter: "buyMountainShatter", bioenergy: "buyBioenergy",
    elementalization: "buyElementalization", killingIntentPerception: "buyKillingIntentPerception",
    killingIntentWave: "buyKillingIntentWave", ultimateIntent: "buyUltimateIntent",
    brainDomainDevelopment: "buyBrainDomainDevelopment", continentSplit: "buyContinentSplit",
    continentCollapse: "buyContinentCollapse", waveEye: "buyWaveEye", elementalAwakening: "buyElementalAwakening",
    moonfall: "buyMoonfall", flowState: "buyFlowState", selfhood: "buySelfhood", freedom: "buyFreedom",
    chicxulubMeteorite: "buyChicxulubMeteorite"
  });
  function performAction(id, ...args) { const name = actions[id]; return name ? api[name](...args) : false; }
  function buyUpgrade(id, ...args) { const name = upgrades[id]; return name ? api[name](...args) : false; }
  function getActionIds() { return Object.keys(actions); }
  function getUpgradeIds() { return Object.keys(upgrades); }
  const api = Object.freeze({
    superLollipopCount, superLollipopChance, superLollipopTrainingMultiplier, rollSuperLollipopAttempts,
    skyCrystalCount, skyCrystalChance, skyCrystalRockMultiplier, rollSkyCrystalAttempts,
    flowUltimateIntentMultiplier, activePowerSourceChallengeMultiplier, challengeAdjustedPowerSource,
    buyWaveEye, buyElementalAwakening, buyMoonfall, buyFlowState, buySelfhood, buyFreedom, buyChicxulubMeteorite,
    gymPotentialMultiplier, gymMultiplier, sonicMovementMultiplier, godspeedExponent, godspeedPotentialExponent, breathingMethodGymMultiplier, scaleIndexForPower, updateScaleProgress, rollFitnessMembershipCardAttempts, exercisePotentialMultiplier, exerciseMultiplier, transcendentPotentialMultiplier, transcendentMultiplier, extremeExerciseEffectMultiplier, naturalStrengthPotentialMultiplier, powerMultiplierGroups, powerMultiplier, challengeCompletionCount, challengeRewardExponent, challengeRewardMultiplier, longevityChallengeRewardMultiplier, fiveMisfortunesRewardExponent, activeChallengeLimitExponent, jGainExponent, powerGainExponent, currentPowerMilestone, reachedPowerMilestone, superpowerExponent, fitnessSourceExponent, trainingSourceExponent, applyGainExponent, additiveLevelMultiplier, jMultiplierGroups, jMultiplier, automaticJPerSecond, jSourceGains, finalJPerSecondFromSources, continentPowerMagnitude, elementalizationJSource, longevityFitnessMultiplier, lifePowerFitnessMultiplier, myStylePotentialFitnessMultiplier, myStyleFitnessMultiplier, carbonLimitPotentialFitnessBonus, carbonLimitFitnessBonus, regenerationFitnessMultiplier, enduranceEnhancementFitnessMultiplier, fitnessMembershipCardCount, fitnessMembershipCardFitnessBonus, fitnessMembershipCardChance, fitnessJBonus, effectiveFitnessLevel, waterPotentialJMultiplier, runningCost, fitnessLevelCap, rockLevelCap, baseConversionGain, trainingPowerDecayMultiplier, trainingPowerSource, highSpeedMetabolismMultiplier, conversionGain, ghostBrainPotentialPowerBonus, ghostBrainPowerBonus, mentalDomainMultiplier, skySplitPotentialMultiplier, skySplitMultiplier, ghostBrainPowerSource, brainDomainDevelopmentExponent, ghostBrainActualPowerPerSecond, joulesForNextBasePower, focusPowerPerSecond, subtleFocusExponent, rawFocusPowerPerSecond, applyFocusLateSoftcap, dynamicFocusMultiplier, focusSoftcapExponent, actualFocusPowerPerSecond, killingIntentJBonus, rawKillingIntentPotentialJBonus, killingIntentExtractionRatio, killingIntentWaveExponent, superSpeedThinkingMultiplier, killingIntentPotentialJBonus, focusPercent, intuitionPotentialFocusMultiplier, intuitionFocusMultiplier, rockCost, rockPowerPerSecond, effectiveRockLevel, rockStrikeMultiplier, mountainCollapseExponent, automaticPowerPerSecond, ultimateIntentPowerSource, finalPowerGainFromSources, mindDivisionCost, manualScaleUpgradeHistory, hasManuallyUpgradedScale, autoUpgradeEnhancements, achievementJBonus, train, buyRunning, buyGym, buyExercise, buyTranscendent, buyFocus, buyBreathingMethod, buyExtremeExercise, buyRock, buyWater, buyGhostBrain, buyNaturalStrength, buyMentalPower, buyLifePower, buyMyStyle, buyIntuition, buySonicMovement, buyCarbonLimit, buyKillingIntent, buyRockStrike, buyHighSpeedMetabolism, buyEnduranceEnhancement, buyBulletTime, buyDynamicFocus, buySuperPerception, buyInvulnerable, buyRegeneration, buySuperpower, buySuperSpeedThinking, buyMountainCollapse, buyMindDivision, buyPowerOneTime, buyHyperRegeneration, buyMentalDomain, buyEarthSplit, buyGodspeed, buySuperpowerEvolution, buySubtle, buySkySplit, buyBiologicalQuantification, buyGhostManTransformation, buyDestroyCountry, buyHumanGhostTransformation, buyKillingIntentSubstance, buyEnergyCycle, buyMountainShatter, buyBioenergy, buyElementalization, buyKillingIntentPerception, buyKillingIntentWave, buyUltimateIntent, buyBrainDomainDevelopment, buyContinentSplit, buyContinentCollapse, toggleGhostBack,
    getJPerSecond: automaticJPerSecond,
    getPowerPerSecond: automaticPowerPerSecond,
    updateProgress: updateScaleProgress,
    autoUpgrade: autoUpgradeEnhancements,
    performAction, buyUpgrade, getActionIds, getUpgradeIds
  });
  WIS.Power.ScaleLogic = api;
}(window.WIS));
