(function defineScaleLogic(WIS) {
  "use strict";

  const runtime = WIS.Core.Runtime;
  let state = runtime.state;
  function withScaleState(current,work){const previous=state;state=current;try{return work();}finally{state=previous;}}
  const measure=(name,fn)=>WIS.Simulation?.Profiler?WIS.Simulation.Profiler.measure('scale.'+name,fn):fn();
  const snapshotMemo=(name,fn)=>WIS.Core.Effects.memoFrozen('scale.'+name,()=>measure(name,fn),state);

  const CONFIG = WIS.Core.Config;
  const TREASURE_RULES = WIS.Meta.TreasureRules;
  const {
    BN, ZERO, ONE, add, sub, mul, div, pow: rawPow, pow10, sqrt, log10: rawLog10, abs,
    max: maxBN, min: minBN, gt, gte, lt, lte, eq,
    isFiniteBN, isNaNBN, sum: sumBN, product: productBN, toNumber
  } = WIS.Core.BigNum;
  const pow=(a,b)=>WIS.Simulation?.Profiler?.enabled()?measure('BigNum.pow',()=>rawPow(a,b)):rawPow(a,b);
  const log10=a=>WIS.Simulation?.Profiler?.enabled()?measure('BigNum.log10',()=>rawLog10(a)):rawLog10(a);
  const {
    decayingChance, multipliedChance,
    rollDynamicAttempts: rollProbabilityAttempts
  } = WIS.Core.Probability;
  const POWER_COSTS = CONFIG.costs.power;
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
  const TRAINING_J_DECAY_SCALE = CONFIG.training.decayScale, TRAINING_J_DECAY_LOG_DIVISOR = CONFIG.training.decayLogDivisor, TRAINING_J_DECAY_POWER = CONFIG.training.decayPower;
  const SCATTER_RETAINED_UPGRADE_TIERS = CONFIG.scatterRetainedUpgradeTiers;
  const SCALE_THRESHOLDS = CONFIG.scales;
  const RESOURCE_SOFTCAP_STAGES = CONFIG.softcaps;
  const RESOURCE_SOFTCAP_INTEGRATION_LOG_STEP = 0.01;
  // Progressive settlement gets a fixed continuous-integration budget. Stage crossings
  // may use one additional segment per configured stage, so cost never follows magnitude.
  const RESOURCE_SOFTCAP_PROGRESSIVE_MAX_SEGMENTS = 60;
  const RESOURCE_SOFTCAP_DYNAMIC_MAX_EVALUATIONS = 32;
  const RESOURCE_SOFTCAP_DYNAMIC_LOG_STEP = 0.05;
  const RESOURCE_SOFTCAP_CHALLENGE_LOG_STEP = 0.5;
  const RESOURCE_SOFTCAP_TAIL_MAX_SEGMENTS = 48;
  const CHALLENGE_DEFINITIONS = CONFIG.challenges;
  const GHOST_BRAIN_CONFIG = CONFIG.ghostBrain;
  const FOCUS_SOURCE_CURVE_CONFIG = CONFIG.focus.sourceCurve;
  const STAR_ENHANCEMENT_CONFIG = CONFIG.starEnhancements;
  const STAR_SOFTCAP_ACHIEVEMENT_CONFIG = CONFIG.starSoftcapAchievement;
  const SCALE_TREASURE_CONFIG = CONFIG.scaleTreasures;
  const CONTINENT_REFERENCE_POWER = 8.368e22;

  const calculateSourceGain = (options) => WIS.Core.Formulas.source(options);
  const calculateRegionGain = (sources, options) => WIS.Core.Formulas.region(sources, options);
  const multiplyEffectGroups = (groups) => WIS.Core.Formulas.multiply(Object.values(groups).flat());
  const updateLifetimeStatistics = (...args) => runtime.call("updateLifetimeStatistics", ...args);
  const showScaleNotice = (...args) => runtime.call("showScaleNotice", ...args);
  const checkActiveChallengeCompletion = (...args) => runtime.call("checkActiveChallengeCompletion", ...args);
  const showNotice = (...args) => runtime.call("showNotice", ...args);
  const saveState = (...args) => runtime.call("save", ...args);
  const render = (...args) => runtime.call("render", ...args);
  const achievementStates = (...args) => runtime.call("achievementStates", ...args);
  const notifyNewAchievements = (...args) => runtime.call("notifyNewAchievements", ...args);
  
  const celestialDeclineExponent = (...args) => runtime.call("celestialDeclineExponent", ...args);
  const hasAchievement = (key) => WIS.Meta.Achievements.has(state, key);
  const upgradesUnlocked = () => hasAchievement("powerOne");

  function resourceMagnitude(value, scale = ONE) {
    return log10(add(ONE, div(maxBN(ZERO, value), scale)));
  }

  function dynamicResource(source, resourceKey) {
    return WIS.Core.Effects.dynamicResourceValue(source, resourceKey);
  }

  function treasureCount(key, source = state) {
    return maxBN(ZERO, BN(source?.treasureImprints?.[key] ?? ZERO)).floor();
  }

  function resourceSoftcapRealmLevel() {
    const getRealmLevel = WIS.Cultivation?.ImmortalLogic?.cultivationRealmLevel;
    return typeof getRealmLevel === "function"
      ? Math.max(0, Number(getRealmLevel()) || 0)
      : 0;
  }

  function compatibleSoftcapExponent(value) {
    const decimal = minBN(ONE, maxBN(ZERO, value));
    const numeric = decimal.toNumber();
    // Keep the public API numeric throughout its historical range, but never
    // collapse a valid positive Decimal exponent to native zero on conversion.
    return Number.isFinite(numeric) && (numeric > 0 || !gt(decimal, ZERO))
      ? numeric
      : decimal;
  }

  // Immutable configuration only; dynamic pressure is still recomputed per snapshot.
  const softcapStageConstants = new Map(RESOURCE_SOFTCAP_STAGES.map(stage =>
    [stage, { strength: BN(stage.strength), growth: BN(stage.growth) }]));

  function baseSoftcapStageExponent(amount, stage) {
    const decimalAmount = maxBN(ZERO, amount);
    const memo = WIS.Core.Effects.scopeMemo(state);
    if (!memo) return computeBaseSoftcapStageExponent(decimalAmount, stage);
    const key = `scale.softcapBase:${stage.name}:${decimalAmount.sign}:${decimalAmount.layer}:${decimalAmount.mag}`;
    if (!memo.has(key)) memo.set(key, computeBaseSoftcapStageExponent(decimalAmount, stage));
    return memo.get(key);
  }

  function computeBaseSoftcapStageExponent(decimalAmount, stage) {
    if (lte(decimalAmount, stage.threshold)) return 1;
    const overflowOrders = log10(div(decimalAmount, stage.threshold));
    const constants = softcapStageConstants.get(stage) || stage;
    const pressure = add(
      mul(constants.strength, overflowOrders),
      mul(constants.growth, pow(overflowOrders, 1.5))
    );
    return compatibleSoftcapExponent(div(ONE, add(ONE, pressure)));
  }

  function softcapStageExponent(amount, stage) {
    const exponent = baseSoftcapStageExponent(amount, stage);
    if (stage.name !== "爆星" || !state.spaceQuakePurchased) return exponent;
    return compatibleSoftcapExponent(sub(
      ONE,
      mul(
        sub(ONE, exponent),
        STAR_ENHANCEMENT_CONFIG.spaceQuake.remainingPressureMultiplier
      )
    ));
  }

  function resourceSoftcapStageActive(stage, realmLevel = resourceSoftcapRealmLevel(), normalLayer = true) {
    if (normalLayer && WIS.Cultivation.Xiuzhen?.softcapRemoved(state, stage)) return false;
    return stage.removedAtRealm === null || realmLevel < stage.removedAtRealm;
  }

  function adjustedNormalStageExponent(currentAmount, stage, applySpaceQuake, sourceKind = "normal") {
    const base = applySpaceQuake
      ? softcapStageExponent(currentAmount, stage)
      : baseSoftcapStageExponent(currentAmount, stage);
    const immortal = WIS.Cultivation?.ImmortalLogic;
    const daoAdjusted = typeof immortal?.daoAdjustedSoftcapExponent === "function"
      ? immortal.daoAdjustedSoftcapExponent(base)
      : base;
    return typeof immortal?.qiAdjustedSoftcapExponent === "function"
      ? immortal.qiAdjustedSoftcapExponent(daoAdjusted, sourceKind === "mana")
      : daoAdjusted;
  }

  function resourceSoftcapStageExponents(currentAmount, sourceKind = "normal", applySpaceQuake = true, applyRealmAdjustments = true) {
    const amount = maxBN(ZERO, currentAmount);
    const realmLevel = resourceSoftcapRealmLevel();
    return RESOURCE_SOFTCAP_STAGES
      .filter((stage) => resourceSoftcapStageActive(stage, realmLevel, applyRealmAdjustments) && gt(amount, stage.threshold))
      .map((stage) => ({
        name: stage.name,
        exponent: applyRealmAdjustments
          ? adjustedNormalStageExponent(amount, stage, applySpaceQuake, sourceKind)
          : applySpaceQuake ? softcapStageExponent(amount, stage) : baseSoftcapStageExponent(amount, stage)
      }));
  }

  function normalResourceSoftcapExponent(currentAmount, applySpaceQuake, sourceKind = "normal", applyRealmAdjustments = true, omit = null) {
    const amount = maxBN(ZERO, currentAmount);
    const baseExponent = resourceSoftcapStageExponents(amount, sourceKind, applySpaceQuake, applyRealmAdjustments)
      .filter(stage => !omit || !omit(stage.name))
      .reduce((exponent, stage) => mul(exponent, stage.exponent), ONE);
    const achievementAdjustedExponent = hasAchievement("scale10")
      ? sub(
        ONE,
        mul(
          sub(ONE, baseExponent),
          STAR_SOFTCAP_ACHIEVEMENT_CONFIG.remainingPressureMultiplier
        )
      )
      : baseExponent;
    return utmostPuritySoftcapExponent(achievementAdjustedExponent);
  }

  function resourceSoftcapExponent(currentAmount, sourceKind = "normal") {
    return normalResourceSoftcapExponent(currentAmount, true, sourceKind);
  }

  function resourceSoftcapBaseExponent(currentAmount) {
    return normalResourceSoftcapExponent(currentAmount, false);
  }

  function specialResourceSoftcapExponent(currentAmount) {
    return normalResourceSoftcapExponent(currentAmount, true, "normal", false);
  }

  function utmostPuritySoftcapExponent(exponent, elapsedSeconds = state.currentScaleElapsedSeconds) {
    const originalExponent = minBN(ONE, maxBN(ZERO, exponent));
    const selectedCultivation = state.cultivation?.active ?? state.cultivationSystem;
    const immortalCultivationSelected = selectedCultivation === "immortal" || selectedCultivation === "仙道";
    if (!hasAchievement("utmostPurity") || (selectedCultivation && !immortalCultivationSelected)) {
      return compatibleSoftcapExponent(originalExponent);
    }
    const config = CONFIG.achievementEffects;
    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const weakening = 1 + config.utmostPuritySoftcapLossCoefficient *
      Math.log2(1 + elapsed / config.timeScaleSeconds);
    return compatibleSoftcapExponent(sub(
      ONE,
      div(sub(ONE, originalExponent), weakening)
    ));
  }

  function planetSuppressionRewardExponent(currentAmount) {
    if (challengeCompletionCount("planetSuppression") < 1) return 1;
    const softcapExponent = Math.max(0, Math.min(1, resourceSoftcapExponent(currentAmount)));
    return 1 + STAR_SOFTCAP_ACHIEVEMENT_CONFIG.challengeRewardLossConversion
      * (1 - softcapExponent);
  }

  function planetSuppressionSoftcapExponent(currentAmount) {
    if (state.activeChallenge !== "planetSuppression") return 1;
    const challenge = CHALLENGE_DEFINITIONS.planetSuppression;
    const threshold = SCALE_THRESHOLDS[challenge.requiredScaleIndex]?.power;
    const starStage = RESOURCE_SOFTCAP_STAGES.find((stage) => stage.name === "爆星");
    if (!gt(threshold, ZERO) || !starStage) return 1;
    const amount = maxBN(ZERO, currentAmount);
    const progress = Math.max(0, Math.min(1,
      toNumber(div(log10(add(ONE, amount)), log10(add(ONE, threshold))), 0)
    ));
    const virtualAmount = mul(threshold, pow10(1 + 4 * progress));
    const baseExponent = baseSoftcapStageExponent(virtualAmount, starStage);
    let remainingPressure = 1 - baseExponent;
    if (state.spaceQuakePurchased) {
      remainingPressure *= STAR_ENHANCEMENT_CONFIG.spaceQuake.remainingPressureMultiplier;
    }
    if (hasAchievement("scale10")) {
      remainingPressure *= STAR_SOFTCAP_ACHIEVEMENT_CONFIG.remainingPressureMultiplier;
    }
    return 1 - remainingPressure;
  }

  function resourceSoftcapSettlementExponent(currentAmount) {
    return compatibleSoftcapExponent(mul(
      resourceSoftcapExponent(currentAmount),
      planetSuppressionSoftcapExponent(currentAmount)
    ));
  }

  function applySoftcapExponent(rawGain, exponent) {
    const gain = maxBN(ZERO, rawGain);
    if (!gt(gain, ZERO)) return ZERO;
    const decimalExponent = minBN(ONE, maxBN(ZERO, exponent));
    if (gte(decimalExponent, ONE)) return gain;
    if (!gt(decimalExponent, ZERO)) return ZERO;
    const poweredLog = mul(log10(add(ONE, gain)), decimalExponent);
    if (!gt(poweredLog, ZERO)) return ZERO;
    // Decimal can represent the tiny result even when subtracting 1 from 10^x
    // cannot. Use the expm1 limit for that precision-only edge case.
    return lt(poweredLog, "1e-8")
      ? mul(poweredLog, Math.LN10)
      : sub(pow10(poweredLog), ONE);
  }

  function applyResourceSoftcap(rawGain, currentAmount) {
    const gain = maxBN(ZERO, rawGain);
    if (!gt(gain, ZERO)) return ZERO;
    return infinitySoftcapGain(gain, currentAmount);
  }

  function infinitySoftcapGain(gain, amount, kind="normal", special=false) {
    const I=WIS.Meta.Infinity,C=WIS.Meta.InfinityConfig;
    const early=I.softcapWeakening(state,C.earlyLastStage),late=I.softcapWeakening(state,"宇宙结构");
    const base=applySoftcapExponent(gain,normalResourceSoftcapExponent(amount,true,kind,!special));
    if((!early&&!late)||!gt(gain,ZERO))return base;
    const cutoff=CONFIG.scales.findIndex(x=>x.name===C.earlyLastStage);
    const isEarly=name=>CONFIG.scales.findIndex(x=>x.name===name)<=cutoff;
    const without=(a,b)=>applySoftcapExponent(gain,normalResourceSoftcapExponent(amount,true,kind,!special,name=>isEarly(name)?a:b));
      // Shared weakening interpolates the whole scale result. Only the excess
      // weakening belongs to one group; tensor interpolation would cross-mix it.
      const shared=Math.min(early,late),strongest=Math.max(early,late);
      const scoped=strongest>shared?without(early>late,late>early):base;
      const partial=I.interpolate(base,scoped,shared<1?(strongest-shared)/(1-shared):0);
      return I.interpolate(partial,gain,shared);
  }
  function infinitySoftcapInverse(actual, amount) {
    const I=WIS.Meta.Infinity;
    if(!I.softcapWeakening(state,"恒星")&&!I.softcapWeakening(state,"宇宙结构"))return rawGainForSoftcappedActualGain(actual,resourceSoftcapExponent(amount));
    if(!gt(actual,ZERO))return ZERO;
    let lo=log10(actual),hi=log10(rawGainForSoftcappedActualGain(actual,resourceSoftcapExponent(amount)));
    // The weakened result is bounded by the old result and the unsoftcapped input.
    for(let i=0;i<80;i++){const mid=div(add(lo,hi),2);if(eq(mid,lo)||eq(mid,hi))break;
      if(lt(infinitySoftcapGain(pow10(mid),amount),actual))lo=mid;else hi=mid;}
    return pow10(hi);
  }

  function resourceSoftcapEquivalentRawForComponents(normalRawGain, manaRawGain, currentAmount) {
    const normalRaw = maxBN(ZERO, normalRawGain);
    const manaRaw = maxBN(ZERO, manaRawGain);
    if (!WIS.Cultivation?.ImmortalLogic?.qiRefiningChallengeActive?.()) {
      return add(normalRaw, manaRaw);
    }
    if (!gt(manaRaw, ZERO)) return normalRaw;
    const normalExponent = resourceSoftcapExponent(currentAmount, "normal");
    const settled = add(
      infinitySoftcapGain(normalRaw, currentAmount),
      infinitySoftcapGain(manaRaw, currentAmount, "mana")
    );
    return infinitySoftcapInverse(settled, currentAmount);
  }

  function getResourceSoftcapBreakdown(normalRawGain, manaRawGain, currentAmount) {
    const normalRaw = maxBN(ZERO, normalRawGain);
    const manaRaw = maxBN(ZERO, manaRawGain);
    if (!WIS.Cultivation?.ImmortalLogic?.qiRefiningChallengeActive?.()) {
      const combinedRaw = add(normalRaw, manaRaw);
      const normalExponent = resourceSoftcapExponent(currentAmount, "normal");
      const normalPostSoftcap = infinitySoftcapGain(combinedRaw, currentAmount);
      return {
        normalPreSoftcap: combinedRaw,
        manaPreSoftcap: ZERO,
        normalExponent,
        manaExponent: normalExponent,
        normalPostSoftcap,
        manaPostSoftcap: ZERO,
        finalTotal: applySoftcapExponent(
          normalPostSoftcap,
          planetSuppressionSoftcapExponent(currentAmount)
        )
      };
    }
    const normalExponent = resourceSoftcapExponent(currentAmount, "normal");
    const manaExponent = resourceSoftcapExponent(currentAmount, "mana");
    const normalPostSoftcap = infinitySoftcapGain(normalRaw, currentAmount);
    const manaPostSoftcap = infinitySoftcapGain(manaRaw, currentAmount, "mana");
    return {
      normalPreSoftcap: normalRaw,
      manaPreSoftcap: manaRaw,
      normalExponent,
      manaExponent,
      normalPostSoftcap,
      manaPostSoftcap,
      finalTotal: applySoftcapExponent(
        add(normalPostSoftcap, manaPostSoftcap),
        planetSuppressionSoftcapExponent(currentAmount)
      )
    };
  }

  function resourceSoftcapSettlementForComponents(normalRawGain,manaRawGain,currentAmount){
    return measure('softcap',()=>uncachedResourceSoftcapSettlementForComponents(normalRawGain,manaRawGain,currentAmount));
  }
  function uncachedResourceSoftcapSettlementForComponents(normalRawGain, manaRawGain, currentAmount) {
    return getResourceSoftcapBreakdown(normalRawGain, manaRawGain, currentAmount).finalTotal;
  }

  function applyResourceSoftcapSettlement(rawGain, currentAmount) {
    const normalSettledGain = applyResourceSoftcap(rawGain, currentAmount);
    return applySoftcapExponent(
      normalSettledGain,
      planetSuppressionSoftcapExponent(currentAmount)
    );
  }

  function applyResourceSoftcapRate(rawRate, currentAmount) {
    return applyResourceSoftcap(rawRate, currentAmount);
  }

  function applySpecialResourceSoftcapRate(rawRate, currentAmount) {
    return infinitySoftcapGain(rawRate, currentAmount, "normal", true);
  }

  function nextResourceSoftcapThreshold(currentAmount) {
    const amount = maxBN(ZERO, currentAmount);
    const realmLevel = resourceSoftcapRealmLevel();
    const nextStage = RESOURCE_SOFTCAP_STAGES.find((stage) =>
      gt(stage.threshold, amount)
      && resourceSoftcapStageActive(stage, realmLevel)
    );
    return nextStage?.threshold ?? null;
  }

  function hasStartedUnremovedResourceSoftcap(currentAmount) {
    if (state.activeChallenge === "planetSuppression") return true;
    const amount = maxBN(ZERO, currentAmount);
    const realmLevel = resourceSoftcapRealmLevel();
    return RESOURCE_SOFTCAP_STAGES.some((stage) =>
      lte(stage.threshold, amount)
      && resourceSoftcapStageActive(stage, realmLevel)
    );
  }

  function resourceSoftcapIntegrationLogIndex(currentAmount) {
    const amount = maxBN(ZERO, currentAmount);
    if (!gt(amount, ZERO) || !isFiniteBN(amount)) return 0;
    const logarithm = toNumber(log10(amount), NaN);
    if (!Number.isFinite(logarithm)) return null;
    const scaledLog = logarithm / RESOURCE_SOFTCAP_INTEGRATION_LOG_STEP;
    const nearestInteger = Math.round(scaledLog);
    const tolerance = Math.max(1, Math.abs(scaledLog)) * Number.EPSILON * 32;
    return Math.abs(scaledLog - nearestInteger) <= tolerance
      ? nearestInteger
      : Math.floor(scaledLog);
  }

  function resourceSoftcapLogBoundary(index) {
    return pow10(index * RESOURCE_SOFTCAP_INTEGRATION_LOG_STEP);
  }

  function latestStartedResourceSoftcapThreshold(currentAmount) {
    const amount = maxBN(ZERO, currentAmount);
    const realmLevel = resourceSoftcapRealmLevel();
    return RESOURCE_SOFTCAP_STAGES.reduce((latestThreshold, stage) => {
      if (gt(stage.threshold, amount)) return latestThreshold;
      if (!resourceSoftcapStageActive(stage, realmLevel)) return latestThreshold;
      return maxBN(latestThreshold, stage.threshold);
    }, ZERO);
  }

  function resourceSoftcapIntegrationEvaluationAmount(currentAmount) {
    const amount = maxBN(ZERO, currentAmount);
    if (!gt(amount, ZERO) || !hasStartedUnremovedResourceSoftcap(amount)) return amount;
    const logIndex = resourceSoftcapIntegrationLogIndex(amount);
    if (logIndex === null) return amount;
    const cellStart = resourceSoftcapLogBoundary(logIndex);
    return maxBN(
      minBN(amount, cellStart),
      latestStartedResourceSoftcapThreshold(amount)
    );
  }

  function applyResourceSoftcapEffectiveRate(rawRate, currentAmount) {
    return applyResourceSoftcapSettlement(
      rawRate,
      resourceSoftcapIntegrationEvaluationAmount(currentAmount)
    );
  }

  function nextResourceSoftcapIntegrationBoundary(currentAmount) {
    const amount = maxBN(ZERO, currentAmount);
    const nextThreshold = nextResourceSoftcapThreshold(amount);
    if (state.activeChallenge === "planetSuppression" && !gt(amount, ZERO)) {
      return nextThreshold ? minBN(nextThreshold, ONE) : ONE;
    }
    if (!gt(amount, ZERO) || !hasStartedUnremovedResourceSoftcap(amount)) return nextThreshold;
    const currentLogIndex = resourceSoftcapIntegrationLogIndex(amount);
    if (currentLogIndex === null) return nextThreshold;
    let nextLogIndex = currentLogIndex + 1;
    let nextLogBoundary = resourceSoftcapLogBoundary(nextLogIndex);
    while (!gt(nextLogBoundary, amount) && nextLogIndex < Number.MAX_SAFE_INTEGER) {
      nextLogIndex += 1;
      nextLogBoundary = resourceSoftcapLogBoundary(nextLogIndex);
    }
    return nextThreshold ? minBN(nextThreshold, nextLogBoundary) : nextLogBoundary;
  }

  function rawGainForSoftcappedActualGain(actualGain, exponent) {
    const gain = maxBN(ZERO, actualGain);
    if (!gt(gain, ZERO)) return ZERO;
    const decimalExponent = minBN(ONE, maxBN(ZERO, exponent));
    if (!gt(decimalExponent, ZERO)) return null;
    if (gte(decimalExponent, ONE)) return gain;
    return sub(pow(add(ONE, gain), div(ONE, decimalExponent)), ONE);
  }

  function logarithmicAmountSpan(startAmount, endAmount) {
    const start = maxBN(ONE, startAmount);
    const end = maxBN(start, endAmount);
    return Math.max(0, toNumber(sub(log10(end), log10(start)), 0));
  }

  function logarithmicAmountInterpolation(startAmount, endAmount, position = 0.5) {
    const start = maxBN(ZERO, startAmount);
    const end = maxBN(start, endAmount);
    if (!gt(end, start)) return start;
    if (!gt(start, ZERO)) return mul(end, Math.max(0, Math.min(1, position)));
    return mul(start, pow(div(end, start), Math.max(0, Math.min(1, position))));
  }

  function refinedProgressiveSettlement(rawGain, currentAmount, settle = applyResourceSoftcapSettlement) {
    let estimate = settle(rawGain, currentAmount);
    for (let iteration = 0; iteration < 2; iteration += 1) {
      const projectedEnd = add(currentAmount, maxBN(ZERO, estimate));
      const evaluationAmount = logarithmicAmountInterpolation(currentAmount, projectedEnd, 0.5);
      estimate = settle(rawGain, evaluationAmount);
    }
    return maxBN(ZERO, estimate);
  }

  function applyResourceSoftcapProgressive(rawGain, currentAmount, { googolResource = null } = {}) {
    // Manual training opts in. Other progressive callers keep their original law.
    const penaltyAt = amount => googolResource
      ? WIS.Core.Penalties.googolPenaltyMultiplier(googolResource, amount, state) : ONE;
    const settle = (gain, amount) => mul(applyResourceSoftcapSettlement(gain, amount), penaltyAt(amount));
    const googol = WIS.Core.Config.googolPenalty.threshold;
    const nextStage = amount => {
      const normal = nextResourceSoftcapThreshold(amount);
      return googolResource && lt(amount, googol) ? (normal ? minBN(normal, googol) : googol) : normal;
    };
    const varying = amount => hasStartedUnremovedResourceSoftcap(amount) || (googolResource && gte(amount, googol));
    const integrationBoundary = amount => {
      const normal = nextResourceSoftcapIntegrationBoundary(amount), stage = nextStage(amount);
      let boundary = normal && stage ? minBN(normal, stage) : normal || stage;
      // Keep sampling the penalty even when all resource softcaps were removed.
      if (googolResource && gte(amount, googol)) {
        const index = resourceSoftcapIntegrationLogIndex(amount);
        if (index !== null) {
          const logarithmic = resourceSoftcapLogBoundary(index + 1);
          if (gt(logarithmic, amount)) boundary = boundary ? minBN(boundary, logarithmic) : logarithmic;
        }
      }
      return boundary;
    };
    let remainingRawGain = maxBN(ZERO, rawGain);
    const initialAmount = maxBN(ZERO, currentAmount);
    if (!gt(remainingRawGain, ZERO) || !isFiniteBN(initialAmount) || !isFiniteBN(remainingRawGain)) return ZERO;

    let settledAmount = initialAmount;
    let settledGain = ZERO;
    let continuousSegments = 0;
    let exactStageSegments = 0;
    const stageCount = RESOURCE_SOFTCAP_STAGES.length + (googolResource ? 1 : 0);
    const maximumSegments = RESOURCE_SOFTCAP_PROGRESSIVE_MAX_SEGMENTS + stageCount;
    for (let segment = 0; segment < maximumSegments && gt(remainingRawGain, ZERO); segment += 1) {
      const projectedGain = settle(remainingRawGain, settledAmount);
      const projectedEnd = add(settledAmount, maxBN(ZERO, projectedGain));
      const nextStageBoundary = nextStage(settledAmount);
      const canCrossStage = nextStageBoundary && gt(projectedEnd, nextStageBoundary);
      if (continuousSegments >= RESOURCE_SOFTCAP_PROGRESSIVE_MAX_SEGMENTS &&
          !(canCrossStage && exactStageSegments < stageCount)) {
        // The fixed-point logarithmic midpoint settles every last unit of raw gain.
        // It is deliberately not a final left-end exponent extrapolation.
        settledGain = add(settledGain, refinedProgressiveSettlement(remainingRawGain, settledAmount, settle));
        remainingRawGain = ZERO;
        break;
      }

      const remainingBudget = Math.max(1,
        RESOURCE_SOFTCAP_PROGRESSIVE_MAX_SEGMENTS - continuousSegments);
      const projectedLogSpan = logarithmicAmountSpan(settledAmount, projectedEnd);
      const highPrecision = projectedLogSpan <= remainingBudget * RESOURCE_SOFTCAP_INTEGRATION_LOG_STEP;
      let nextBoundary;
      let evaluationAmount = settledAmount;
      if (canCrossStage && (!highPrecision || remainingBudget <= 1)) {
        nextBoundary = nextStageBoundary;
        evaluationAmount = logarithmicAmountInterpolation(settledAmount, nextBoundary, 0.5);
      } else if (highPrecision || !gt(settledAmount, ZERO) || !varying(settledAmount)) {
        nextBoundary = integrationBoundary(settledAmount);
      } else {
        // Large spans divide their remaining logarithmic distance over the remaining
        // fixed budget. There is intentionally no maximum log-step clamp.
        const adaptiveLogStep = Math.max(
          RESOURCE_SOFTCAP_INTEGRATION_LOG_STEP,
          projectedLogSpan / remainingBudget
        );
        const adaptiveBoundary = mul(settledAmount, pow10(adaptiveLogStep));
        nextBoundary = nextStageBoundary ? minBN(nextStageBoundary, adaptiveBoundary) : adaptiveBoundary;
        evaluationAmount = logarithmicAmountInterpolation(settledAmount, nextBoundary, 0.5);
      }
      if (!nextBoundary || !gt(nextBoundary, settledAmount) || !gt(projectedEnd, nextBoundary)) {
        settledGain = add(settledGain, refinedProgressiveSettlement(remainingRawGain, settledAmount, settle));
        remainingRawGain = ZERO;
        break;
      }

      const exponent = resourceSoftcapSettlementExponent(evaluationAmount);
      if (!gt(exponent, ZERO)) {
        remainingRawGain = ZERO;
        break;
      }
      const neededActualGain = maxBN(ZERO, sub(nextBoundary, settledAmount));
      if (!gt(neededActualGain, ZERO)) {
        settledGain = add(settledGain, refinedProgressiveSettlement(remainingRawGain, settledAmount, settle));
        remainingRawGain = ZERO;
        break;
      }
      const neededRawGain = WIS.Meta.Infinity.softcapWeakening(state,"恒星") || WIS.Meta.Infinity.softcapWeakening(state,"宇宙结构")
        ? infinitySoftcapInverse(rawGainForSoftcappedActualGain(div(neededActualGain,penaltyAt(evaluationAmount)),planetSuppressionSoftcapExponent(evaluationAmount)),evaluationAmount)
        : rawGainForSoftcappedActualGain(div(neededActualGain, penaltyAt(evaluationAmount)), exponent);
      const tolerance = neededRawGain ? mul(maxBN(ONE, neededRawGain), Number.EPSILON * 16) : ZERO;
      if (!neededRawGain || !isFiniteBN(neededRawGain) || lt(add(remainingRawGain, tolerance), neededRawGain)) {
        settledGain = add(settledGain, refinedProgressiveSettlement(remainingRawGain, settledAmount, settle));
        remainingRawGain = ZERO;
        break;
      }

      settledAmount = nextBoundary;
      settledGain = add(settledGain, neededActualGain);
      remainingRawGain = maxBN(ZERO, sub(remainingRawGain, neededRawGain));
      if (lte(remainingRawGain, tolerance)) remainingRawGain = ZERO;
      continuousSegments += 1;
      if (nextStageBoundary && eq(nextBoundary, nextStageBoundary)) exactStageSegments += 1;
    }
    if (gt(remainingRawGain, ZERO)) {
      settledGain = add(settledGain, refinedProgressiveSettlement(remainingRawGain, settledAmount, settle));
    }
    return maxBN(ZERO, settledGain);
  }

  // Integrate a raw rate with an explicit settlement callback. Callers whose
  // provider already applies penalties must pass the identity callback. Every
  // sample, including after normal caps are removed, uses this same contract.
  function applyResourceSoftcapDynamicRateOverTime(
    rawRateAtAmount, currentAmount, elapsedSeconds,
    settleRateAtAmount = applyResourceSoftcapSettlement,
    { foreground = false, memoizeSamples = false } = {}
  ) {
    const seconds=Number(elapsedSeconds), initial=maxBN(ZERO,currentAmount);
    if(typeof rawRateAtAmount!=="function" || !Number.isFinite(seconds) || seconds<0 || !isFiniteBN(initial))
      throw Error("动态积分输入无效，结算未提交");
    // Opt-in only for an audited autonomous callback in an immutable work scope.
    // Number.toString round-trips each Decimal component exactly; no rounding.
    // The callback has no local-time input. The formal clock is fixed by caller.
    const samples = memoizeSamples ? new Map() : null;
    const evaluationState=memoizeSamples && runtime.isEvaluating()?runtime.getState():null;
    const work=WIS.Core.Integration.createAdaptiveWork({amount:initial},seconds,values=>{
      const amount = values.amount;
      const key = samples ? [amount.sign, amount.layer, amount.mag].join(":") : null;
      if (samples?.has(key)) return {amount:samples.get(key)};
      const raw=rawRateAtAmount(values.amount), rate=settleRateAtAmount(raw,values.amount);
      if(!isFiniteBN(raw)||!isFiniteBN(rate)||lt(rate,0))throw Error("动态积分速率无效");
      if (samples) {
        if (samples.size >= 256) samples.delete(samples.keys().next().value);
        samples.set(key, rate);
      }
      return {amount:rate};
    },{logTolerance:foreground?1e-4:1e-6,
      autonomous:!!evaluationState,
      cycleContextCurrent:()=>runtime.isEvaluating() && runtime.getState()===evaluationState});
    try { for(;;){
      const result=work.advance({maximumEvaluations:256});
      if(result.done)return result.gains.amount;
        if(result.status==="finite-time-singularity"){
          const error=Error("动态积分具有有限时间发散证明；未处理时间和数值检查点保留");
        error.code=result.status;error.continuation=work;error.diagnostics=result.diagnostics;throw error;
      }
    } } finally { samples?.clear(); }
  }

  function applyResourceSoftcapOverTime(rawRate, currentAmount, elapsedSeconds) {
    const rate = maxBN(ZERO, rawRate);
    if (!gt(rate, ZERO) || !isFiniteBN(rate)) return ZERO;
    return applyResourceSoftcapDynamicRateOverTime(
      () => rate,
      currentAmount,
      elapsedSeconds
    );
  }

  function formatSoftcapExponent(exponent, formatValue = value => value.toString()) {
    const value = BN(exponent);
    if (eq(value, ONE)) return "1.000";
    if (eq(value, ZERO)) return "0.000";
    if (lt(value, "0.001")) return formatValue(value);
    const numeric = toNumber(value, NaN);
    for (const digits of [3, 6, 9, 12, 15]) {
      const text = numeric.toFixed(digits);
      if (Number(text) !== 1) return text;
    }
    return `1 − ${formatValue(sub(ONE, value))}`;
  }

  function activeSoftcapStages(currentAmount) {
    const amount = maxBN(ZERO, currentAmount);
    const realmLevel = resourceSoftcapRealmLevel();
    const names = RESOURCE_SOFTCAP_STAGES
      .filter((stage) => gt(amount, stage.threshold)
        && resourceSoftcapStageActive(stage, realmLevel))
      .map((stage) => stage.name);
    return names.length > 0 ? names.join("、") : "未触发";
  }

  function removedSoftcapStages() {
    const realmLevel = resourceSoftcapRealmLevel();
    const names = RESOURCE_SOFTCAP_STAGES
      .filter((stage) => !resourceSoftcapStageActive(stage, realmLevel))
      .map((stage) => stage.name);
    return names.length > 0 ? names.join("、") : "无";
  }

  function gymPotentialMultiplier(source = state) {
    const currentPower = dynamicResource(source, "power");
    return mul(
      add("1.25", mul("0.5", resourceMagnitude(currentPower))),
      breathingMethodGymMultiplier(source)
    );
  }

  function gymMultiplier(source = state) {
    return source.gymPurchased
      ? mul(gymPotentialMultiplier(source), sonicMovementMultiplier(source))
      : ONE;
  }

  function sonicMovementMultiplierForExponent(exponent) {
    return pow("3.8", exponent);
  }

  function sonicMovementPotentialMultiplier(source = state) {
    return sonicMovementMultiplierForExponent(godspeedExponent(source));
  }

  function sonicMovementMultiplier(source = state) {
    return source.sonicMovementPurchased ? sonicMovementPotentialMultiplier(source) : ONE;
  }

  function godspeedExponent(source = state) {
    return source.godspeedPurchased ? godspeedPotentialExponent(source) : ONE;
  }

  function godspeedPotentialExponent(source = state) {
    const currentPower = dynamicResource(source, "power");
    const d = resourceMagnitude(currentPower, "3.033e15");
    const dEff = WIS.Core.Formulas.smoothPowerSoftcap(d, 300, 1, 0.35, 6);
    return add(ONE, mul("0.05", dEff));
  }

  function breathingMethodGymMultiplier(source = state) {
    return source.breathingMethodPurchased ? BN("1.5") : ONE;
  }

  function scaleIndexForPower(power) {
    return WIS.Core.Registries.powerSystems.get("scale").tierIndexForPower(power);
  }

  function scaleRequirementDetails(scaleIndex, source = state) {
    const scale = SCALE_THRESHOLDS[scaleIndex];
    if (!scale) return null;
    const baseRequirement = BN(scale.power);
    const Challenges = WIS.Meta.Challenges;
    const rewardRequirement = Challenges?.blackHoleRewardRequirement
      ? Challenges.blackHoleRewardRequirement(source, scaleIndex, baseRequirement)
      : baseRequirement;
    const lossDetails = source.activeChallenge === "blackHole"
      ? blackHoleGainLossDetails()
      : {
          joulesBefore: ZERO, joulesAfter: ZERO, powerBefore: ZERO, powerAfter: ZERO,
          joulesLossOrders: ZERO, powerLossOrders: ZERO, lossOrders: ZERO,
          requirementMultiplier: ONE
        };
    const blackHoleMultiplier = source.activeChallenge === "blackHole"
      ? lossDetails.requirementMultiplier
      : ONE;
    return {
      scaleIndex,
      baseRequirement,
      rewardRequirement,
      rewardMultiplier: div(rewardRequirement, baseRequirement),
      blackHoleMultiplier,
      actualRequirement: mul(rewardRequirement, blackHoleMultiplier),
      lossDetails
    };
  }

  function scaleRequirement(scaleIndex, source = state) {
    return scaleRequirementDetails(scaleIndex, source)?.actualRequirement ?? ZERO;
  }

  function updateScaleProgress(notify = true, powerPeak) {
    const previousScaleIndex = state.highestScaleIndex;
    // Reset profiles replace this progress domain. An old unit's observation
    // must not revive the previous lifecycle's peak after that replacement.
    const peak = powerPeak?.owner === state.powerSystem.systems.scale.progress
      ? maxBN(state.power, powerPeak.value) : state.power;
    state.highestPower = maxBN(state.highestPower, peak);
    state.highestScaleIndex = Math.max(state.highestScaleIndex, scaleIndexForPower(state.power));
    if (state.highestScaleIndex > previousScaleIndex) state.currentScaleElapsedSeconds = 0;
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

  function rollFitnessMembershipCardAttempts(attempts, silent = false, { availabilityConfirmed = false } = {}) {
    const gained = rollDynamicAttempts(
      attempts,
      () => availabilityConfirmed || (hasAchievement("scale5") && gt(fitnessJBonus(), ZERO)),
      fitnessMembershipCardChance,
      () => { WIS.Meta.Treasures.add(state, "fitnessMembershipCard"); },
      {
        probabilityAtOffset: (offset) => fitnessMembershipCardChance(add(fitnessMembershipCardCount(), offset)),
        decayRatio: TREASURE_RULES.fitnessMembershipCard.q,
        treasureKey: "fitnessMembershipCard",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "fitnessMembershipCard", count)
      }
    );

    if (!silent && gt(gained, ZERO)) {
      saveState();
      showNotice(`获得宝物烙印：健身房会员卡 +${gained}`);
    }
    return gained;
  }

  function superLollipopCount() {
    return treasureCount("superLollipop");
  }

  function superLollipopChance(count = superLollipopCount()) {
    const config = SCALE_TREASURE_CONFIG.superLollipop;
    return decayingChance(config.baseChance, config.chanceDecay, count, treasureChanceMultiplier());
  }

  function superLollipopTrainingMultiplier() {
    return add(ONE, mul(
      superLollipopCount(),
      SCALE_TREASURE_CONFIG.superLollipop.perItemMultiplier
    ));
  }

  function rollSuperLollipopAttempts(attempts, silent = false, { availabilityConfirmed = false } = {}) {
    const gained = rollDynamicAttempts(
      attempts,
      () => hasAchievement("scale8") && (availabilityConfirmed || gt(fitnessJBonus(), ZERO)),
      superLollipopChance,
      () => { WIS.Meta.Treasures.add(state, "superLollipop"); },
      {
        probabilityAtOffset: (offset) => superLollipopChance(add(superLollipopCount(), offset)),
        decayRatio: SCALE_TREASURE_CONFIG.superLollipop.chanceDecay,
        treasureKey: "superLollipop",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "superLollipop", count)
      }
    );
    if (!silent && gt(gained, ZERO)) showNotice(`获得永久宝物：超级棒棒糖 +${gained}`);
    return gained;
  }

  function skyCrystalCount() {
    return treasureCount("skyCrystal");
  }

  function treasureQuantityDecay(count, scale, exponent) {
    return pow(add(ONE, div(maxBN(ZERO, count), scale)), -exponent);
  }

  function skyCrystalChance(count = skyCrystalCount()) {
    const rockFactor = add(ONE, log10(add(ONE, div(Math.max(0, effectiveRockLevel()), 1000))));
    const inventoryPenalty = sqrt(add(ONE, div(maxBN(ZERO, count), TREASURE_RULES.skyCrystal.scale)));
    return multipliedChance([TREASURE_RULES.skyCrystal.baseChance, rockFactor, div(ONE, inventoryPenalty), treasureChanceMultiplier()]);
  }

  function skyCrystalRockMultiplier() {
    return add(ONE, mul(skyCrystalCount(), 0.05));
  }

  function rollSkyCrystalAttempts(attempts, silent = false, { availabilityConfirmed = false } = {}) {
    const gained = rollDynamicAttempts(
      attempts,
      () => availabilityConfirmed || (hasAchievement("scale9") && gt(rockPowerPerSecond(), ZERO)),
      skyCrystalChance,
      () => { WIS.Meta.Treasures.add(state, "skyCrystal"); },
      {
        probabilityAtOffset: (offset) => skyCrystalChance(add(skyCrystalCount(), offset)),
        treasureKey: "skyCrystal",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "skyCrystal", count)
      }
    );
    if (!silent && gt(gained, ZERO)) {
      saveState();
      showNotice(`获得永久宝物：天晶 +${gained}`);
    }
    return gained;
  }

  function cosmicFiberCount() {
    return treasureCount("cosmicFiber");
  }

  function cosmicFiberAvailable(source = state) {
    return source.highestScaleIndex >= 13 && source.unlockedAchievements?.scale13 === true;
  }

  function cosmicFiberDecayedChance(count = cosmicFiberCount()) {
    const config = SCALE_TREASURE_CONFIG.cosmicFiber;
    return mul(config.baseChance, treasureQuantityDecay(count, config.chanceDecayScale, config.chanceDecayExponent));
  }

  function cosmicFiberChance(count = cosmicFiberCount()) {
    return multipliedChance([cosmicFiberDecayedChance(count), treasureChanceMultiplier()]);
  }

  function rollCosmicFiberAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => cosmicFiberAvailable(),
      cosmicFiberChance,
      () => { WIS.Meta.Treasures.add(state, "cosmicFiber"); },
      {
        probabilityAtOffset: (offset) => cosmicFiberChance(add(cosmicFiberCount(), offset)),
        treasureKey: "cosmicFiber",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "cosmicFiber", count)
      }
    );
    if (!silent && gt(gained, ZERO)) {
      saveState();
      showNotice(`获得永久宝物：宇宙纤维 +${gained}`);
    }
    return gained;
  }

  function cosmicWillCount() {
    return treasureCount("cosmicWill");
  }

  function cosmicWillAvailable(source = state) {
    return source.highestScaleIndex >= 14 && source.unlockedAchievements?.scale14 === true;
  }

  function cosmicWillDecayedChance(count = cosmicWillCount()) {
    const config = SCALE_TREASURE_CONFIG.cosmicWill;
    return mul(config.baseChance, treasureQuantityDecay(count, config.chanceDecayScale, config.chanceDecayExponent));
  }

  function cosmicWillChance(count = cosmicWillCount()) {
    return multipliedChance([cosmicWillDecayedChance(count), treasureChanceMultiplier()]);
  }

  function rollCosmicWillAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => cosmicWillAvailable(),
      cosmicWillChance,
      () => { WIS.Meta.Treasures.add(state, "cosmicWill"); },
      {
        probabilityAtOffset: (offset) => cosmicWillChance(add(cosmicWillCount(), offset)),
        treasureKey: "cosmicWill",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "cosmicWill", count)
      }
    );
    if (!silent && gt(gained, ZERO)) {
      saveState();
      showNotice(`获得永久宝物：宇宙意志 +${gained}`);
    }
    return gained;
  }

  function galaxyEffectiveExponent(source = state) {
    return WIS.Core.Effects.galaxyDynamicResourceExponent(source);
  }

  function exercisePotentialMultiplier(source = state) {
    const currentJoules = dynamicResource(source, "joules");
    return add("1.1", mul("0.1", resourceMagnitude(currentJoules)));
  }

  function exerciseMultiplier(source = state) {
    return source.exercisePurchased
      ? mul(exercisePotentialMultiplier(source), extremeExerciseEffectMultiplier(source))
      : ONE;
  }

  function transcendentPotentialMultiplier(source = state) {
    const currentPower = dynamicResource(source, "power");
    return add(ONE, mul("0.15", resourceMagnitude(currentPower)));
  }

  function transcendentMultiplier(source = state) {
    return source.transcendentPurchased ? transcendentPotentialMultiplier(source) : ONE;
  }

  function extremeExerciseEffectMultiplier(source = state) {
    return source.extremeExercisePurchased ? BN("1.5") : ONE;
  }

  function naturalStrengthPotentialMultiplier(source = state) {
    const currentJoules = dynamicResource(source, "joules");
    return add(ONE, mul("0.15", resourceMagnitude(currentJoules)));
  }

  function powerMultiplierGroups() {
    return WIS.Core.Effects.groups("power", "regionMultiplier", state);
  }

  function powerMultiplier(){return snapshotMemo("powerMultiplier",powerMultiplierUncached);}
  function powerMultiplierUncached() {
    return multiplyEffectGroups(powerMultiplierGroups());
  }

  function challengeCompletionCount(key) {
    return WIS.Meta.Challenges.completionCount(state, key);
  }

  function declineChallengeReward(multiplier) {
    const adjust = WIS.Cultivation?.ImmortalLogic?.applyCelestialFiveDeclineToMultiplier;
    return typeof adjust === "function" ? adjust(multiplier) : multiplier;
  }

  function challengeRewardExponent(key) {
    const challenge = CHALLENGE_DEFINITIONS[key];
    const completions = challengeCompletionCount(key);
    const reward = completions > 0 && challenge.rewardExponents ? challenge.rewardExponents[completions - 1] : 1;
    return declineChallengeReward(reward);
  }

  function challengeRewardMultiplier(key) {
    const challenge = CHALLENGE_DEFINITIONS[key];
    const completions = challengeCompletionCount(key);
    const reward = completions > 0 && challenge.rewardMultipliers ? challenge.rewardMultipliers[completions - 1] : 1;
    return declineChallengeReward(reward);
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

  function jGainExponent(){return snapshotMemo("jGainExponent",jGainExponentUncached);}
  function jGainExponentUncached() {
    return WIS.Core.Effects.product("joules", "regionExponent", state);
  }

  function selfSuppressionJExponentFromBase(baseSoftcapExponent) {
    const softcapExponent = Math.max(0, Math.min(1, Number(baseSoftcapExponent) || 0));
    if (softcapExponent >= 1) return 1;
    return 1 + STAR_ENHANCEMENT_CONFIG.selfSuppression.softcapLossConversion
      * (1 - softcapExponent);
  }

  function selfSuppressionJExponent(
    currentJoules = WIS.Core.Effects.dynamicResourceValue(state, "joules")
  ) {
    if (!state.selfSuppressionPurchased) return 1;
    return selfSuppressionJExponentFromBase(resourceSoftcapBaseExponent(currentJoules));
  }

  function powerGainExponent(){return snapshotMemo("powerGainExponent",powerGainExponentUncached);}
  function powerGainExponentUncached() {
    return WIS.Core.Effects.product("power", "regionExponent", state);
  }

  function currentPowerMilestone() {
    if (state.meta.bigNumbers?.tree?.rank >= 3) return "tree3";
    if (state.symbolicPowerMilestones?.graham64) return "graham64";
    if (gte(snapshotMemo("lifetimeHighestPower",()=>state.lifetimeHighestPower), "1e100")) return "googol";
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
    return gt(value, ZERO) ? pow(value, exponent) : ZERO;
  }

  function additiveLevelMultiplier(level, perLevelMultiplier) {
    return level > 0 ? level * perLevelMultiplier : 1;
  }

  function jMultiplierGroups() {
    return WIS.Core.Effects.groups("joules", "regionMultiplier", state);
  }

  function jMultiplier(){return snapshotMemo("jMultiplier",jMultiplierUncached);}
  function jMultiplierUncached() {
    return multiplyEffectGroups(jMultiplierGroups());
  }

  function automaticJPerSecond() {
    const evaluationAmount = resourceSoftcapIntegrationEvaluationAmount(state.joules);
    return automaticJSettledPerSecondAt(evaluationAmount);
  }

  function automaticJRawPerSecond() {
    return createAutomaticJRateProfile().rawRate();
  }

  function createAutomaticJRateProfile({interval=false}={}) {
    const fixedSources = {
      achievement: achievementJBonus(),
      registered: WIS.Core.Sources.collect("joules", state)
    };
    const normalDescriptors=fixedSources.registered.filter(source=>source.id!=="manaJ");
    const manaDescriptors=fixedSources.registered.filter(source=>source.id==="manaJ");
    const sourceValue=source=>interval&&source.dynamicResources.length?source.valueAt(state):source.value;
    const componentRates = () => {
        const normalRegistered=normalDescriptors.map(sourceValue);
        const manaSources=manaDescriptors.map(sourceValue);
        const normalSources = [
          1,
          fitnessJBonus(),
          fixedSources.achievement,
          killingIntentJBonus(),
          elementalizationJSource(),
          ...normalRegistered
        ];
        const totalRaw = preSoftcapJGainFromSources([...normalSources, ...manaSources]);
        const normalRaw = manaSources.some(value=>!eq(value,ZERO)) ? preSoftcapJGainFromSources(normalSources) : totalRaw;
        return { normalRaw, manaRaw: maxBN(ZERO, sub(totalRaw, normalRaw)) };
    };
    return {
      rawRate() {
        const components = componentRates();
        return add(components.normalRaw, components.manaRaw);
      },
      settledRate() {
        const components = componentRates();
        return resourceSoftcapSettlementForComponents(
          components.normalRaw,
          components.manaRaw,
          state.joules
        );
      }
    };
  }

  function automaticJRawPerSecondAt(joulesAmount, profile = null) {
    const evaluationJoules = maxBN(ZERO, joulesAmount);
    if (!isFiniteBN(evaluationJoules)) return automaticJRawPerSecond();
    const rateProfile = profile || createAutomaticJRateProfile();
    // Same-coordinate read: preserve the read-only evaluation contract.
    if (eq(evaluationJoules, state.joules)) return WIS.Core.Effects.withState(state, () => rateProfile.rawRate());
    if (runtime.isEvaluating()) {
      const candidate = WIS.Core.State.createDraft(runtime.getState()).state;
      candidate.joules = evaluationJoules;
      return runtime.withEvaluationState(candidate, () => automaticJRawPerSecondAt(evaluationJoules, rateProfile));
    }
    const previousJoules = state.joules;
    state.joules = evaluationJoules;
    try {
      return WIS.Core.Effects.withState(state, () => rateProfile.rawRate());
    } finally {
      state.joules = previousJoules;
    }
  }

  function automaticJSettledPerSecondAt(joulesAmount, profile = null) {
    const evaluationJoules = maxBN(ZERO, joulesAmount);
    if (!isFiniteBN(evaluationJoules)) return automaticJPerSecond();
    const rateProfile = profile || createAutomaticJRateProfile();
    // Same-coordinate read: preserve the read-only evaluation contract.
    if (eq(evaluationJoules, state.joules)) return WIS.Core.Effects.withState(state, () => {
      const settled=measure("sourceAndSoftcap.joules",()=>rateProfile.settledRate());
      return measure("googol.joules",()=>WIS.Core.Penalties.applyGoogolPenalty("joules",evaluationJoules,settled,state));
    });
    if (runtime.isEvaluating()) {
      const candidate = WIS.Core.State.createDraft(runtime.getState()).state;
      candidate.joules = evaluationJoules;
      return runtime.withEvaluationState(candidate, () => automaticJSettledPerSecondAt(evaluationJoules, rateProfile));
    }
    const previousJoules = state.joules;
    state.joules = evaluationJoules;
    try {
      return WIS.Core.Effects.withState(state, () => {
        const settled=measure("sourceAndSoftcap.joules",()=>rateProfile.settledRate());
        return measure("googol.joules",()=>WIS.Core.Penalties.applyGoogolPenalty("joules",evaluationJoules,settled,state));
      });
    } finally {
      state.joules = previousJoules;
    }
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

  function continentPowerMagnitude(source = state) {
    return resourceMagnitude(dynamicResource(source, "power"), CONTINENT_REFERENCE_POWER);
  }

  function elementalizationJSource(){return snapshotMemo("elementalizationJSource",elementalizationJSourceUncached);}
  function elementalizationJSourceUncached() {
    if (!state.elementalizationPurchased) return ZERO;
    const base = mul("1e12", pow(div(maxBN(ZERO, fitnessJBonus()), "1e12"), 1.4));
    return calculateSourceGain({
      base,
      multipliers: WIS.Core.Effects.values("elementalization", "sourceMultiplier", state),
      exponents: WIS.Core.Effects.values("elementalization", "sourceExponent", state)
    });
  }

  function planetWillElementalizationMultiplier(
    currentJoules = WIS.Core.Effects.dynamicResourceValue(state, "joules")
  ) {
    if (!state.planetWillPurchased) return 1;
    const config = STAR_ENHANCEMENT_CONFIG.planetWill;
    return minBN(
      config.maximumMultiplier,
      pow(add(ONE, div(maxBN(ZERO, currentJoules), config.joulesScale)), config.exponent)
    );
  }

  function preSoftcapJGainFromSources(sourceGains) {
    const regionGain = calculateRegionGain(sourceGains, {
      multipliers: [jMultiplier()],
      exponents: [jGainExponent()]
    });
    const declined = applyGainExponent(regionGain, celestialDeclineExponent());
    const applyTimeLaw = WIS.Cultivation?.ImmortalLogic?.applyDaoTimeLaw;
    return typeof applyTimeLaw === "function" ? applyTimeLaw(declined) : declined;
  }

  function finalJPerSecondFromSources(sourceGains) {
    return applyResourceSoftcapEffectiveRate(
      preSoftcapJGainFromSources(sourceGains),
      state.joules
    );
  }

  function longevityFitnessMultiplier() {
    return productBN([
      lifePowerFitnessMultiplier(),
      myStyleFitnessMultiplier(),
      enduranceEnhancementFitnessMultiplier(),
      regenerationFitnessMultiplier()
    ]);
  }

  function lifePowerFitnessMultiplier() {
    return state.lifePowerPurchased ? 1.5 : 1;
  }

  function myStylePotentialFitnessMultiplier(source = state) {
    const jMagnitude = resourceMagnitude(dynamicResource(source, "joules"));
    return add(ONE, mul("0.18", pow(jMagnitude, "0.85")));
  }

  function myStyleFitnessMultiplier(source = state) {
    return source.myStylePurchased ? myStylePotentialFitnessMultiplier(source) : ONE;
  }

  function carbonLimitPotentialFitnessBonus(source = state) {
    const jMagnitude = resourceMagnitude(dynamicResource(source, "joules"));
    return mul("0.8", pow(jMagnitude, "1.2"));
  }

  function carbonLimitFitnessBonus(source = state) {
    return source.carbonLimitPurchased ? carbonLimitPotentialFitnessBonus(source) : ZERO;
  }

  function regenerationFitnessMultiplier() {
    if (!state.regenerationPurchased) return 1;
    return state.hyperRegenerationPurchased ? 15 : 5;
  }

  function enduranceEnhancementFitnessMultiplier() {
    return state.enduranceEnhancementPurchased ? 2 : 1;
  }

  function fitnessMembershipCardCount() {
    return treasureCount("fitnessMembershipCard");
  }

  function fitnessMembershipCardFitnessBonus() {
    return mul(fitnessMembershipCardCount(), 0.002);
  }

  function fitnessMembershipCardChance(count = fitnessMembershipCardCount()) {
    return decayingChance(TREASURE_RULES.fitnessMembershipCard.baseChance, TREASURE_RULES.fitnessMembershipCard.q, count, treasureChanceMultiplier());
  }

  function fitnessJBonus(){return snapshotMemo("fitnessJBonus",fitnessJBonusUncached);}
  function fitnessJBonusUncached() {
    return calculateSourceGain({
      base: effectiveFitnessLevel() * 2,
      multipliers: [
        add(
          mul(longevityFitnessMultiplier(), WIS.Core.Effects.product("fitness", "baseMultiplier", state)),
          add(carbonLimitFitnessBonus(), fitnessMembershipCardFitnessBonus())
        ),
        WIS.Core.Effects.product("fitness", "sourceMultiplier", state)
      ],
      exponents: [fitnessSourceExponent()]
    });
  }

  function effectiveFitnessLevel() {
    return state.runningLevel + (state.humanGhostTransformationPurchased ? state.rockLevel : 0);
  }

  function waterPotentialJMultiplier(source = state) {
    return add(ONE, mul("0.14", resourceMagnitude(runtime.evaluationResource("highestPower", source))));
  }

  function runningCost(level = state.runningLevel) {
    const nextLevel = Math.max(0, Math.floor(Number(level) || 0)) + 1;
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

  function baseConversionGain(){return snapshotMemo("baseConversionGain",baseConversionGainUncached);}
  function baseConversionGainUncached() {
    if (lt(state.joules, 10)) return ZERO;
    return pow(div(state.joules, 10), 0.75).floor();
  }

  function trainingPowerDecayMultiplier() {
    if (lte(baseConversionGain(), ONE)) return ONE;
    const jDecades = resourceMagnitude(state.joules, TRAINING_J_DECAY_SCALE);
    return pow(
      add(ONE, div(jDecades, TRAINING_J_DECAY_LOG_DIVISOR)),
      -TRAINING_J_DECAY_POWER
    );
  }

  function trainingPowerSource() {
    const baseGain = baseConversionGain();
    if (lt(baseGain, ONE)) return ZERO;
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
    // Preview and train share the formula, never a mutable cross-candidate cache.
    // Reuse only an existing immutable evaluation. Outside it, recompute using
    // the ordinary live Effects lifecycle rather than retaining an action cache.
    return snapshotMemo("conversionGain", conversionGainUncached);
  }

  function conversionGainUncached() {
    return applyResourceSoftcapProgressive(
      preSoftcapPowerGainFromSources([
        challengeAdjustedPowerSource(trainingPowerSource(), "training")
      ]),
      state.power,
      { googolResource: "power" }
    );
  }

  function ghostBrainPotentialPowerBonus() {
    const highestPower = maxBN(ZERO, state.highestPower);
    const attenuation = pow(
      add(ONE, div(highestPower, GHOST_BRAIN_CONFIG.attenuationScale)),
      GHOST_BRAIN_CONFIG.attenuationExponent
    );
    return div(
      pow(highestPower, GHOST_BRAIN_CONFIG.highestPowerExponent),
      mul(GHOST_BRAIN_CONFIG.divisor, attenuation)
    );
  }

  function ghostBrainPowerBonus() {
    return state.ghostBrainPurchased
      ? mul(ghostBrainPotentialPowerBonus(), WIS.Core.Effects.product("ghostBrain", "sourceMultiplier", state))
      : ZERO;
  }

  function mentalDomainMultiplier() {
    return WIS.Core.Effects.value("mentalDomain", state);
  }

  function skySplitPotentialMultiplier(source = state) {
    return add(ONE, mul("0.5", resourceMagnitude(
      dynamicResource(source, "power"),
      "3.033e15"
    )));
  }

  function skySplitMultiplier() {
    return WIS.Core.Effects.value("skySplit", state);
  }

  function ghostBrainPowerSource(){return snapshotMemo("ghostBrainPowerSource",ghostBrainPowerSourceUncached);}
  function ghostBrainPowerSourceUncached() {
    return calculateSourceGain({
      base: ghostBrainPowerBonus(),
      exponents: [brainDomainDevelopmentExponent()]
    });
  }

  function brainDomainDevelopmentPotentialExponent(source = state) {
    return minBN("1.2", add(ONE, mul("0.1", continentPowerMagnitude(source))));
  }

  function brainDomainDevelopmentExponent(){return snapshotMemo("brainDomainDevelopmentExponent",brainDomainDevelopmentExponentUncached);}
  function brainDomainDevelopmentExponentUncached() {
    return state.brainDomainDevelopmentPurchased
      ? brainDomainDevelopmentPotentialExponent()
      : ONE;
  }

  function continentCollapsePotentialExponent(source = state) {
    return minBN("1.5", add(ONE, mul("0.18", continentPowerMagnitude(source))));
  }

  function ghostBrainActualPowerPerSecond() {
    return finalPowerGainFromSources([ghostBrainPowerSource()]);
  }

  function joulesForNextBasePower() {
    const nextBasePower = add(baseConversionGain(), ONE);
    return mul(10, pow(nextBasePower, 1 / 0.75)).ceil();
  }

  function focusPowerPerSecond(){return snapshotMemo("focusPowerPerSecond",focusPowerPerSecondUncached);}
  function focusPowerPerSecondUncached() {
    return calculateSourceGain({
      base: rawFocusPowerPerSecond(),
      exponents: WIS.Core.Effects.values("focus", "sourceExponent", state),
      softcaps: [applyFocusSmoothSoftcap, (gain) => applySpecialResourceSoftcapRate(gain, state.power)]
    });
  }

  function subtleFocusExponent() {
    return WIS.Core.Effects.value("subtle", state);
  }

  function rawFocusPowerPerSecond() {
    if (!state.focusPurchased || lt(baseConversionGain(), ONE)) return ZERO;
    return calculateSourceGain({
      base: baseConversionGain(),
      multipliers: [trainingPowerDecayMultiplier(), ...WIS.Core.Effects.values("focus", "sourceMultiplier", state)]
    });
  }

  function applyFocusSmoothSoftcap(gain) {
    return WIS.Core.Formulas.smoothPowerSoftcap(
      gain,
      FOCUS_SOURCE_CURVE_CONFIG.scale,
      FOCUS_SOURCE_CURVE_CONFIG.earlyExponent,
      FOCUS_SOURCE_CURVE_CONFIG.lateExponent,
      FOCUS_SOURCE_CURVE_CONFIG.sharpness
    );
  }

  function dynamicFocusMultiplier() {
    return WIS.Core.Effects.value("dynamicFocus", state);
  }

  function focusSoftcapExponent() {
    return specialResourceSoftcapExponent(state.power);
  }

  function actualFocusPowerPerSecond() {
    return focusPowerGainStages().afterGoogolPenalty;
  }

  function killingIntentJBonus(){return snapshotMemo("killingIntentJBonus",killingIntentJBonusUncached);}
  function killingIntentJBonusUncached() {
    return state.killingIntentPurchased ? killingIntentPotentialJBonus() : 0;
  }

  function rawKillingIntentPotentialJBonus() {
    return state.focusPurchased
      ? mul(mul(actualFocusPowerPerSecond(), killingIntentExtractionRatio()), WIS.Core.Effects.product("killingIntent", "sourceMultiplier", state))
      : ZERO;
  }

  function killingIntentExtractionRatio() {
    return state.killingIntentPerceptionPurchased ? 5e-4 : 5e-7;
  }

  function killingIntentWavePotentialExponent(source = state) {
    return minBN("1.1", add(ONE, mul("0.01", continentPowerMagnitude(source))));
  }

  function killingIntentWaveExponent() {
    return state.killingIntentWavePurchased ? killingIntentWavePotentialExponent() : ONE;
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

  function intuitionPotentialFocusMultiplier(source = state) {
    const dynamicBonus = mul("0.1", resourceMagnitude(dynamicResource(source, "power")));
    return add(ONE, mul(dynamicBonus, source.superPerceptionPurchased ? "1.5" : ONE));
  }

  function intuitionFocusMultiplier() {
    return WIS.Core.Effects.value("intuition", state);
  }

  function rockCost(level = state.rockLevel) {
    return add(ROCK_BASE_COST,
      1500 * level + 500 * Math.pow(level, 2)
    ).ceil();
  }

  const repeatedCostWords = new Map();
  function repeatedLevelIntervalCost(startLevel, targetLevel, costAtLevel) {
    // Reuse each actual rounded unit price. Prefix words retain all small
    // costs and avoid re-enumerating the range at every binary-search probe.
    let prefix = repeatedCostWords.get(costAtLevel);
    if (!prefix) { prefix = [[]]; repeatedCostWords.set(costAtLevel, prefix); }
    const L = WIS.Core.Resources.ledger();
    while (prefix.length <= targetLevel) {
      const cost = BN(costAtLevel(prefix.length - 1));
      if (!cost.isFinite() || !cost.gt(0)) throw Error("批量强化成本无效，未提交");
      prefix.push(L.add(prefix.at(-1), [cost]));
    }
    return L.subtract(prefix[targetLevel], prefix[startLevel]);
  }

  function buyMaxPowerLevels(stateKey, levelCap, costAtLevel, unitCostCeiling = null) {
    const startLevel = Math.max(0, Math.floor(Number(state[stateKey]) || 0));
    const maximumLevel = Math.max(startLevel, Math.floor(Number(levelCap) || 0));
    const availablePower = WIS.Core.Resources.get("power");
    let lower = startLevel;
    let upper = maximumLevel + 1;
    while (upper - lower > 1) {
      const target = Math.floor((lower + upper) * 0.5);
      const lastUnitCost = BN(costAtLevel(target - 1));
      const respectsPriority = !unitCostCeiling || lte(lastUnitCost, unitCostCeiling);
      const totalCost = respectsPriority
        ? repeatedLevelIntervalCost(startLevel, target, costAtLevel)
        : add(availablePower, ONE);
      if (respectsPriority && WIS.Core.Resources.canAffordTerms("power", totalCost)) lower = target;
      else upper = target;
    }
    if (lower <= startLevel) return 0;
    const totalCost = repeatedLevelIntervalCost(startLevel, lower, costAtLevel);
    if (!WIS.Core.Resources.spendTerms("power", totalCost)) return 0;
    state[stateKey] = lower;
    WIS.Core.Effects.invalidate();
    return lower - startLevel;
  }

  function rockPowerPerSecond(){return snapshotMemo("rockPowerPerSecond",rockPowerPerSecondUncached);}
  function rockPowerPerSecondUncached() {
    if (state.rockLevel <= 0) return ZERO;
    return calculateSourceGain({
      base: mul(16, pow(effectiveRockLevel(), 1.2)),
      multipliers: WIS.Core.Effects.values("rock", "sourceMultiplier", state),
      exponents: WIS.Core.Effects.values("rock", "sourceExponent", state)
    });
  }

  function effectiveRockLevel() {
    const originalEffectiveLevel = hasAchievement("scale7") ? Math.floor(state.rockLevel * 1.2) : state.rockLevel;
    const continentSplitBonus = state.continentSplitPurchased ? Math.pow(state.rockLevel, 1.8) : 0;
    return originalEffectiveLevel + (state.ghostManTransformationPurchased ? state.runningLevel : 0) + continentSplitBonus;
  }

  function starShatterRockMultiplier() {
    if (!state.starShatterPurchased) return 1;
    const level = Math.max(0, Number(effectiveRockLevel()) || 0);
    const config = STAR_ENHANCEMENT_CONFIG.starShatter;
    return Math.pow(10, config.maximumOrders * level / (level + config.levelScale));
  }

  function rockStrikeMultiplier() {
    return WIS.Core.Effects.value("rockStrike", state);
  }

  function mountainCollapseExponent() {
    return WIS.Core.Effects.value("mountainCollapse", state);
  }

  function automaticPowerPerSecond() {
    const evaluationAmount = resourceSoftcapIntegrationEvaluationAmount(state.power);
    return automaticPowerSettledPerSecondAt(evaluationAmount);
  }

  function automaticPowerRawPerSecond() {
    return createAutomaticPowerRateProfile().rawRate();
  }

  function currentAutomaticPowerSourceGains() {
    const fitnessSource = fitnessJBonus();
    const dynamicSources = [
      [focusPowerPerSecond(), "focus"],
      [rockPowerPerSecond(), "rock"],
      [ghostBrainPowerSource(), "ghostBrain"],
      [ultimateIntentPowerSource(), "ultimateIntent"]
    ].map(([value, id]) => challengeAdjustedPowerSource(value, id));
    const registeredSources = WIS.Core.Sources.collect("power", state, { fitnessJBonus: fitnessSource })
      .map((source) => challengeAdjustedPowerSource(source.value, source.id));
    return [...dynamicSources, ...registeredSources];
  }

  function createAutomaticPowerRateProfile({interval=false,fast=false,policy="STRICT",prunedSources=[]}={}) {
    const fitnessSource = fitnessJBonus();
    let registeredSources = WIS.Core.Sources.collect("power", state, { fitnessJBonus: fitnessSource });
    if(fast&&!state.activeChallenge&&WIS.Core.Config.coupledFastProfile.policies[policy].additive){
      // daoPower is monotone in IP. A resource-only interval has no spending;
      // fixed addends invisible at this lower bound stay invisible as IP grows.
      const anchor=registeredSources.find(s=>s.id==='daoPower');
      const candidates=registeredSources.filter(s=>s.operationType==='additive'&&!s.dynamicResources.length&&!s.requiresProviderRefresh&&gte(s.value,ZERO));
      const tiny=sumBN(candidates.map(s=>s.value),ZERO);
      if(anchor&&gt(anchor.value,ZERO)&&eq(add(anchor.value,tiny),anchor.value)){
        const removed=new Set(candidates.map(s=>s.id));
        for(const source of candidates)prunedSources.push({id:source.id,target:'power',operationType:'additive',value:String(source.value),reason:'fixed sum invisible beside monotone daoPower lower bound',bound:String(anchor.value)});
        registeredSources=registeredSources.filter(s=>!removed.has(s.id));
      }
    }
    registeredSources=registeredSources.map(source=>({...source,valueAt:interval&&source.dynamicResources.length?source.valueAt:null}));
    const normalDescriptors=registeredSources.filter(source=>source.id!=="qiManaPower");
    const manaDescriptors=registeredSources.filter(source=>source.id==="qiManaPower");
    const componentRates = () => {
        const dynamicSources = [
          [focusPowerPerSecond(), "focus"],
          [rockPowerPerSecond(), "rock"],
          [ghostBrainPowerSource(), "ghostBrain"],
          [ultimateIntentPowerSource(), "ultimateIntent"]
        ].map(([value, id]) => challengeAdjustedPowerSource(value, id));
        const sourceContext=interval?{fitnessJBonus:fitnessJBonus()}:null;
        const sourceValue=source=>challengeAdjustedPowerSource(source.valueAt?source.valueAt(state,sourceContext):source.value,source.id);
        const normalRegistered=normalDescriptors.map(sourceValue);
        const manaSources=manaDescriptors.map(sourceValue);
        const normalSources = [...dynamicSources, ...normalRegistered];
        const totalRaw = preSoftcapPowerGainFromSources([...normalSources, ...manaSources]);
        const normalRaw = manaSources.some(value=>!eq(value,ZERO)) ? preSoftcapPowerGainFromSources(normalSources) : totalRaw;
        return { normalRaw, manaRaw: maxBN(ZERO, sub(totalRaw, normalRaw)) };
    };
    return {
      rawRate() {
        const components = componentRates();
        return add(components.normalRaw, components.manaRaw);
      },
      settledRate() {
        const components = componentRates();
        return resourceSoftcapSettlementForComponents(
          components.normalRaw,
          components.manaRaw,
          state.power
        );
      }
    };
  }

  function automaticPowerRawPerSecondAt(powerAmount, profile = null) {
    const evaluationPower = maxBN(ZERO, powerAmount);
    if (!isFiniteBN(evaluationPower)) return automaticPowerRawPerSecond();
    const rateProfile = profile || createAutomaticPowerRateProfile();
    // Same-coordinate read: preserve the read-only evaluation contract.
    if (eq(evaluationPower, state.power) && gte(state.highestPower, evaluationPower)) return WIS.Core.Effects.withState(state, () => rateProfile.rawRate());
    if (runtime.isEvaluating() && eq(evaluationPower, state.power) &&
        WIS.Core.Effects.supportsHighestPowerEvaluation() && WIS.Core.Sources.supportsHighestPowerEvaluation()) {
      return runtime.withHighestPowerEvaluation(evaluationPower, () => rateProfile.rawRate());
    }
    if (runtime.isEvaluating()) {
      const candidate = WIS.Core.State.createDraft(runtime.getState()).state;
      candidate.power = evaluationPower;
      candidate.highestPower = maxBN(gt(state.highestPower, state.power) ? maxBN(ZERO, state.highestPower) : ZERO, evaluationPower);
      return runtime.withEvaluationState(candidate, () => automaticPowerRawPerSecondAt(evaluationPower, rateProfile));
    }
    const previousPower = state.power;
    const previousHighestPower = state.highestPower;
    const historicalHighestPower = gt(previousHighestPower, previousPower)
      ? maxBN(ZERO, previousHighestPower)
      : ZERO;
    state.power = evaluationPower;
    state.highestPower = maxBN(historicalHighestPower, evaluationPower);
    try {
      return WIS.Core.Effects.withState(state, () => rateProfile.rawRate());
    } finally {
      state.power = previousPower;
      state.highestPower = previousHighestPower;
    }
  }

  function automaticPowerSettledPerSecondAt(powerAmount, profile = null) {
    const evaluationPower = maxBN(ZERO, powerAmount);
    if (!isFiniteBN(evaluationPower)) return automaticPowerPerSecond();
    const rateProfile = profile || createAutomaticPowerRateProfile();
    // Same-coordinate read: preserve the read-only evaluation contract.
    if (eq(evaluationPower, state.power) && gte(state.highestPower, evaluationPower)) return WIS.Core.Effects.withState(state, () => {
      const settled=measure("sourceAndSoftcap.power",()=>rateProfile.settledRate());
      return measure("googol.power",()=>WIS.Core.Penalties.applyGoogolPenalty("power",evaluationPower,settled,state));
    });
    if (runtime.isEvaluating() && eq(evaluationPower, state.power) &&
        WIS.Core.Effects.supportsHighestPowerEvaluation() && WIS.Core.Sources.supportsHighestPowerEvaluation()) {
      return runtime.withHighestPowerEvaluation(evaluationPower, () => {
        const settled=measure("sourceAndSoftcap.power",()=>rateProfile.settledRate());
        return measure("googol.power",()=>WIS.Core.Penalties.applyGoogolPenalty("power",evaluationPower,settled,state));
      });
    }
    if (runtime.isEvaluating()) {
      const candidate = WIS.Core.State.createDraft(runtime.getState()).state;
      candidate.power = evaluationPower;
      candidate.highestPower = maxBN(gt(state.highestPower, state.power) ? maxBN(ZERO, state.highestPower) : ZERO, evaluationPower);
      return runtime.withEvaluationState(candidate, () => automaticPowerSettledPerSecondAt(evaluationPower, rateProfile));
    }
    const previousPower = state.power;
    const previousHighestPower = state.highestPower;
    const historicalHighestPower = gt(previousHighestPower, previousPower)
      ? maxBN(ZERO, previousHighestPower)
      : ZERO;
    state.power = evaluationPower;
    state.highestPower = maxBN(historicalHighestPower, evaluationPower);
    try {
      return WIS.Core.Effects.withState(state, () => {
        const settled=measure("sourceAndSoftcap.power",()=>rateProfile.settledRate());
        return measure("googol.power",()=>WIS.Core.Penalties.applyGoogolPenalty("power",evaluationPower,settled,state));
      });
    } finally {
      state.power = previousPower;
      state.highestPower = previousHighestPower;
    }
  }

  

  function flowUltimateIntentMultiplierFromFocusSource(focusSource) {
    const magnitude = resourceMagnitude(focusSource, "1e12");
    return minBN("1e7", pow(add(ONE, magnitude), 14));
  }

  function flowUltimateIntentMultiplier() {
    return flowUltimateIntentMultiplierFromFocusSource(focusPowerPerSecond());
  }

  function supernaturalFireMultiplierFromFocusSource(focusSource) {
    const actualSource = maxBN(ZERO, focusSource);
    return pow(add(ONE, actualSource), STAR_ENHANCEMENT_CONFIG.supernaturalFire.exponent);
  }

  function powerMultiplierWithoutSupernaturalFire(){return snapshotMemo("powerMultiplierWithoutSupernaturalFire",powerMultiplierWithoutSupernaturalFireUncached);}
  function powerMultiplierWithoutSupernaturalFireUncached() {
    return WIS.Core.Formulas.multiply(
      WIS.Core.Effects.collect("power", "regionMultiplier", state, {
        excludeIds: ["supernaturalFire"]
      })
    );
  }

  function focusPowerGainStages(regionMultiplier = powerMultiplier()) {
    const sourceLayer = challengeAdjustedPowerSource(focusPowerPerSecond(), "focus");
    const afterRegion = preSoftcapPowerGainFromSources([sourceLayer], regionMultiplier);
    const evaluationPower = resourceSoftcapIntegrationEvaluationAmount(state.power);
    const afterNormalSoftcap = applyResourceSoftcapSettlement(afterRegion, evaluationPower);
    const afterGoogolPenalty = WIS.Core.Penalties.applyGoogolPenalty(
      "power",
      evaluationPower,
      afterNormalSoftcap,
      state
    );
    return Object.freeze({
      sourceLayer,
      afterRegion,
      afterNormalSoftcap,
      afterGoogolPenalty,
      evaluationPower
    });
  }

  function focusPowerGainStagesWithoutSupernaturalFire() {
    return focusPowerGainStages(powerMultiplierWithoutSupernaturalFire());
  }

  function supernaturalFirePowerMultiplier() {
    if (!state.supernaturalFirePurchased) return 1;
    const focusBaseGain = focusPowerGainStagesWithoutSupernaturalFire().afterGoogolPenalty;
    return supernaturalFireMultiplierFromFocusSource(focusBaseGain);
  }

  function completedChallengeLayers() {
    return WIS.Meta.Challenges?.totalCompletionCount?.(state) || 0;
  }

  function upgradePreview(id, current = runtime.getState()) {
    if (current === runtime.state) current = runtime.getState();
    const flags = { planetWill: "planetWillPurchased", starShatter: "starShatterPurchased",
      starSpirit: "starSpiritPurchased", stellarTreasureSeeking: "stellarTreasureSeekingPurchased",
      supernaturalFire: "supernaturalFirePurchased" };
    const flag = flags[id];
    if (!flag) throw Error(`未知强化预览：${id}`);
    const purchased = current[flag] === true;
    let candidate = current;
    if (!purchased) {
      candidate = WIS.Core.State.shallowBranch(current);
      const system = current.powerSystem;
      candidate.powerSystem = { ...system, systems: { ...system.systems, scale: {
        ...system.systems.scale, upgrades: { ...system.systems.scale.upgrades, [flag]: true }
      } } };
    }
    return runtime.withEvaluationState(candidate, () => {
      const layers = completedChallengeLayers();
      const values = {
        planetWill: planetWillElementalizationMultiplier,
        starShatter: starShatterRockMultiplier,
        starSpirit: () => pow(STAR_ENHANCEMENT_CONFIG.starSpirit.perChallengeMultiplier, layers),
        stellarTreasureSeeking: () => BN(STAR_ENHANCEMENT_CONFIG.stellarTreasureSeeking.progressMultiplier),
        supernaturalFire: supernaturalFirePowerMultiplier
      };
      return { purchased, layers, value: candidate.powerSystem.active === "scale" ? BN(values[id]()) : ONE };
    });
  }

  function treasureChanceMultiplier(source = state) {
    const starSpiritMultiplier = source.starSpiritPurchased
      ? pow(STAR_ENHANCEMENT_CONFIG.starSpirit.perChallengeMultiplier, completedChallengeLayers())
      : ONE;
    return mul(starSpiritMultiplier, source.stellarTreasureSeekingPurchased ? STAR_ENHANCEMENT_CONFIG.stellarTreasureSeeking.progressMultiplier : 1);
  }

  function treasureAwardMultiplier(source = state) {
    return source.stellarSeaGiftPurchased ? 2 : 1;
  }

  function fiveSpiritStoneCount() {
    return treasureCount("fiveSpiritStone");
  }

  function fiveSpiritStoneChance(count = fiveSpiritStoneCount()) {
    const config = SCALE_TREASURE_CONFIG.fiveSpiritStone;
    return decayingChance(config.baseChance, config.chanceDecay, count, treasureChanceMultiplier());
  }

  function fiveSpiritStoneJSource() {
    const config = SCALE_TREASURE_CONFIG.fiveSpiritStone;
    return mul(config.joulesBase, sub(pow(add(fiveSpiritStoneCount(), ONE), config.joulesExponent), ONE));
  }

  function fiveSpiritStonePowerSource() {
    const config = SCALE_TREASURE_CONFIG.fiveSpiritStone;
    return mul(config.powerBase, sub(pow(add(fiveSpiritStoneCount(), ONE), config.powerExponent), ONE));
  }

  function rollFiveSpiritStoneAttempts(attempts, silent = false, { availabilityConfirmed = false } = {}) {
    const gained = rollDynamicAttempts(
      attempts,
      () => availabilityConfirmed || (state.fiveSpiritStonePurchased && gt(ultimateIntentPowerSource(), ZERO)),
      fiveSpiritStoneChance,
      () => { WIS.Meta.Treasures.add(state, "fiveSpiritStone"); },
      {
        probabilityAtOffset: (offset) => fiveSpiritStoneChance(add(fiveSpiritStoneCount(), offset)),
        decayRatio: SCALE_TREASURE_CONFIG.fiveSpiritStone.chanceDecay,
        treasureKey: "fiveSpiritStone",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "fiveSpiritStone", count)
      }
    );
    if (!silent && gt(gained, ZERO)) showNotice(`获得永久宝物：五灵石 +${gained}`);
    return gained;
  }

  function ultimateIntentPowerSource(){return snapshotMemo("ultimateIntentPowerSource",ultimateIntentPowerSourceUncached);}
  function ultimateIntentPowerSourceUncached() {
    if (!state.ultimateIntentPurchased) return ZERO;
    const base = mul("1e12", pow(div(maxBN(ZERO, focusPowerPerSecond()), "1e12"), 1.4));
    return calculateSourceGain({
      base,
      multipliers: WIS.Core.Effects.values("ultimateIntent", "sourceMultiplier", state),
      exponents: WIS.Core.Effects.values("ultimateIntent", "sourceExponent", state)
    });
  }

  function activePowerSourceChallengeExponent(sourceId) {
    const challengeKey = state.activeChallenge;
    if (challengeKey !== "completeRealm" && challengeKey !== "moonless") return 1;
    if (challengeKey === "completeRealm" && sourceId === "ultimateIntent") return 1;
    if (challengeKey === "moonless" && sourceId === "rock") return 1;
    const challenge = CHALLENGE_DEFINITIONS[challengeKey];
    return challenge.sourceExponents?.[
      Math.min(challengeCompletionCount(challengeKey), challenge.sourceExponents.length - 1)
    ] ?? 1;
  }

  function challengeAdjustedPowerSource(source, sourceId) {
    const safeSource = maxBN(ZERO, source);
    const exponent = activePowerSourceChallengeExponent(sourceId);
    return exponent >= 1
      ? safeSource
      : sub(pow(add(ONE, safeSource), exponent), ONE);
  }

  function preSoftcapPowerGainFromSources(sourceGains, regionMultiplier = powerMultiplier()) {
    const regionGain = calculateRegionGain(sourceGains, {
      multipliers: [regionMultiplier],
      exponents: [powerGainExponent()]
    });
    const declined = applyGainExponent(regionGain, celestialDeclineExponent());
    const applyTimeLaw = WIS.Cultivation?.ImmortalLogic?.applyDaoTimeLaw;
    return typeof applyTimeLaw === "function" ? applyTimeLaw(declined) : declined;
  }

  function finalPowerGainFromSources(sourceGains, regionMultiplier = powerMultiplier()) {
    return applyResourceSoftcapEffectiveRate(
      preSoftcapPowerGainFromSources(sourceGains, regionMultiplier),
      state.power
    );
  }

  function blackHoleGainLossDetails() {
    const Challenges = WIS.Meta.Challenges;
    if (state.activeChallenge !== "blackHole" || !Challenges?.blackHoleLimitExponent) {
      return {
        joulesBefore: ZERO, joulesAfter: ZERO, powerBefore: ZERO, powerAfter: ZERO,
        joulesLossOrders: ZERO, powerLossOrders: ZERO, lossOrders: ZERO,
        requirementMultiplier: ONE
      };
    }
    const jLimit = Challenges.blackHoleLimitExponent(state, "joules");
    const powerLimit = Challenges.blackHoleLimitExponent(state, "power");
    const jExponent = WIS.Core.Effects.product("joules", "regionExponent", state);
    const powerExponent = WIS.Core.Effects.product("power", "regionExponent", state);
    const jExponentBefore = gt(jLimit, ZERO) ? div(jExponent, jLimit) : jExponent;
    const powerExponentBefore = gt(powerLimit, ZERO) ? div(powerExponent, powerLimit) : powerExponent;
    const jSources = jSourceGains();
    const powerSources = currentAutomaticPowerSourceGains();
    const joulesBefore = calculateRegionGain(jSources, {
      multipliers: [jMultiplier()], exponents: [jExponentBefore]
    });
    const joulesAfter = calculateRegionGain(jSources, {
      multipliers: [jMultiplier()], exponents: [jExponent]
    });
    const currentPowerMultiplier = powerMultiplier();
    const powerBefore = calculateRegionGain(powerSources, {
      multipliers: [currentPowerMultiplier], exponents: [powerExponentBefore]
    });
    const powerAfter = calculateRegionGain(powerSources, {
      multipliers: [currentPowerMultiplier], exponents: [powerExponent]
    });
    const joulesLossOrders = Challenges.blackHoleLossOrders(joulesBefore, joulesAfter);
    const powerLossOrders = Challenges.blackHoleLossOrders(powerBefore, powerAfter);
    const lossOrders = maxBN(joulesLossOrders, powerLossOrders);
    return {
      joulesBefore, joulesAfter, powerBefore, powerAfter,
      joulesLossOrders, powerLossOrders, lossOrders,
      requirementMultiplier: Challenges.blackHoleRequirementMultiplierFromLoss(lossOrders)
    };
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
    const fitnessAutomationActive = state.scaleFitnessAutomationEnabled && hasAchievement("trueScale7");
    const rockAutomationActive = state.scaleRockAutomationEnabled && hasAchievement("trueScale7");
    if (!upgradeAutomationActive && !fitnessAutomationActive && !rockAutomationActive) return 0;
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
      { historyKey: "ghostBackPurchased", cost: () => GHOST_BACK_COST, available: () => state.highestScaleIndex >= 3 && !state.ghostBackPurchased, apply: () => { state.ghostBackPurchased = true; } },
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
      { cost: runningCost, available: () => fitnessAutomationActive && upgradesUnlocked() && state.runningLevel < fitnessLevelCap(), apply: () => { state.runningLevel += 1; }, buyMax: (ceiling) => buyMaxPowerLevels("runningLevel", fitnessLevelCap(), runningCost, ceiling) },
      { cost: rockCost, available: () => rockAutomationActive && state.wallUnlocked && state.rockLevel < rockLevelCap(), apply: () => { state.rockLevel += 1; }, buyMax: (ceiling) => buyMaxPowerLevels("rockLevel", rockLevelCap(), rockCost, ceiling) }
    ];
    const starEnhancementCandidates = [
      { historyKey: "planetWillPurchased", cost: () => PLANET_WILL_COST, available: () => state.highestScaleIndex >= 10 && !state.planetWillPurchased, apply: () => { state.planetWillPurchased = true; } },
      { historyKey: "starSpiritPurchased", cost: () => STAR_SPIRIT_COST, available: () => state.highestScaleIndex >= 10 && !state.starSpiritPurchased, apply: () => { state.starSpiritPurchased = true; } },
      { historyKey: "starShatterPurchased", cost: () => STAR_SHATTER_COST, available: () => state.highestScaleIndex >= 10 && !state.starShatterPurchased, apply: () => { state.starShatterPurchased = true; } },
      { historyKey: "spaceQuakePurchased", cost: () => SPACE_QUAKE_COST, available: () => state.highestScaleIndex >= 10 && !state.spaceQuakePurchased, apply: () => { state.spaceQuakePurchased = true; } },
      { historyKey: "selflessPurchased", cost: () => SELFLESS_COST, available: () => state.highestScaleIndex >= 10 && !state.selflessPurchased, apply: () => { state.selflessPurchased = true; } },
      { historyKey: "supernaturalFirePurchased", cost: () => SUPERNATURAL_FIRE_COST, available: () => state.highestScaleIndex >= 10 && !state.supernaturalFirePurchased, apply: () => { state.supernaturalFirePurchased = true; } },
      { historyKey: "fiveSpiritStonePurchased", cost: () => FIVE_SPIRIT_STONE_COST, available: () => state.highestScaleIndex >= 10 && !state.fiveSpiritStonePurchased, apply: () => { state.fiveSpiritStonePurchased = true; } }
      ,{ historyKey: "selfSuppressionPurchased", cost: () => SELF_SUPPRESSION_COST, available: () => state.highestScaleIndex >= 10 && !state.selfSuppressionPurchased, apply: () => { state.selfSuppressionPurchased = true; } }
      ,{ historyKey: "stellarFurnacePurchased", cost: () => STELLAR_FURNACE_COST, available: () => state.highestScaleIndex >= 11 && !state.stellarFurnacePurchased, apply: () => { state.stellarFurnacePurchased = true; } }
      ,{ historyKey: "stellarTreasureSeekingPurchased", cost: () => STELLAR_TREASURE_SEEKING_COST, available: () => state.highestScaleIndex >= 11 && !state.stellarTreasureSeekingPurchased, apply: () => { state.stellarTreasureSeekingPurchased = true; } }
      ,{ historyKey: "gravitationalCollapsePurchased", cost: () => GRAVITATIONAL_COLLAPSE_COST, available: () => state.highestScaleIndex >= 11 && !state.gravitationalCollapsePurchased, apply: () => { state.gravitationalCollapsePurchased = true; } }
      ,{ historyKey: "galacticReturnPurchased", cost: () => GALACTIC_RETURN_COST, available: () => state.highestScaleIndex >= 12 && !state.galacticReturnPurchased, apply: () => { state.galacticReturnPurchased = true; } }
      ,{ historyKey: "stellarSeaGiftPurchased", cost: () => STELLAR_SEA_GIFT_COST, available: () => state.highestScaleIndex >= 12 && !state.stellarSeaGiftPurchased, apply: () => { state.stellarSeaGiftPurchased = true; } }
      ,{ historyKey: "stellarResonancePurchased", cost: () => STELLAR_RESONANCE_COST, available: () => state.highestScaleIndex >= 12 && !state.stellarResonancePurchased, apply: () => { state.stellarResonancePurchased = true; } }
      ,{ historyKey: "greatAttractorPurchased", cost: () => GREAT_ATTRACTOR_COST, available: () => state.highestScaleIndex >= 13 && !state.greatAttractorPurchased, apply: () => { state.greatAttractorPurchased = true; } }
      ,{ historyKey: "largeScaleAdaptationPurchased", cost: () => LARGE_SCALE_ADAPTATION_COST, available: () => state.highestScaleIndex >= 13 && !state.largeScaleAdaptationPurchased, apply: () => { state.largeScaleAdaptationPurchased = true; } }
      ,{ historyKey: "superclusterCollapsePurchased", cost: () => SUPERCLUSTER_COLLAPSE_COST, available: () => state.highestScaleIndex >= 13 && !state.superclusterCollapsePurchased, apply: () => { state.superclusterCollapsePurchased = true; } }
      ,{ historyKey: "cosmicWebPurchased", cost: () => COSMIC_WEB_COST, available: () => state.highestScaleIndex >= 14 && !state.cosmicWebPurchased, apply: () => { state.cosmicWebPurchased = true; } }
      ,{ historyKey: "scaleUnificationPurchased", cost: () => SCALE_UNIFICATION_COST, available: () => state.highestScaleIndex >= 14 && !state.scaleUnificationPurchased, apply: () => { state.scaleUnificationPurchased = true; } }
      ,{ historyKey: "spacetimeFrameworkPurchased", cost: () => SPACETIME_FRAMEWORK_COST, available: () => state.highestScaleIndex >= 14 && !state.spacetimeFrameworkPurchased, apply: () => { state.spacetimeFrameworkPurchased = true; } }
    ];
    [...candidates, ...starEnhancementCandidates].forEach((candidate) => {
      if (!candidate.historyKey) return;
      const available = candidate.available;
      candidate.available = () => upgradeAutomationActive && hasManuallyUpgradedScale(candidate.historyKey) && available();
    });
    if (WIS.Simulation.FixedSegment?.collectCandidates?.("scale",
      [...candidates, ...starEnhancementCandidates], "power", 32)) return 0;
    const audit = WIS.Simulation?.FastForward?.auditCandidates;
    if (audit) { audit.push(...[...candidates,...starEnhancementCandidates].map((c, index) => {
      const available = c.available();
      return {kind: 'scale', id: c.historyKey || `action-${index}`, available,
        resourceKey: 'power', cost: available ? c.cost() : null};
    })); return 0; }
    let purchases = 0;
    let purchaseOperations = 0;
    const maximumPurchaseOperations = 32;
    while (purchaseOperations < maximumPurchaseOperations) {
      const purchased = purchaseCheapestAvailable(candidates) || purchaseCheapestAvailable(starEnhancementCandidates, "power");
      if (!purchased) break;
      purchases += purchased;
      purchaseOperations += 1;
    }
    return purchases;
  }

  function achievementJBonus() {
    const achievements = achievementStates();
    if (!achievements.brick) return 0;
    return Object.values(achievements).filter(Boolean).length * 0.1;
  }

  function train(manualClick = false) {
    const gained = conversionGain();
    if (lt(gained, ONE)) return;

    const previousAchievements = achievementStates();
    if (manualClick) WIS.Meta.Achievements.registerTrainingClick();
    WIS.Core.Resources.set("joules", 0);
    WIS.Core.Resources.add("power", gained);
    state.totalPower = add(state.totalPower, gained);
    state.lifetimeTotalPower = add(state.lifetimeTotalPower, gained);
    state.currentRebirthTotalPower = add(state.currentRebirthTotalPower, gained);
    state.maxSinglePowerGain = maxBN(state.maxSinglePowerGain, gained);
    updateScaleProgress();
    WIS.Meta.Achievements.recordCurrent();
    saveState();
    render();

    notifyNewAchievements(previousAchievements);
  }

  function buyRunning() {
    const cost = runningCost();
    if (!upgradesUnlocked() || state.runningLevel >= fitnessLevelCap() || !WIS.Core.Resources.canAfford("power", cost)) return;
    if (!WIS.Core.Resources.spend("power", cost)) return false;
    state.runningLevel += 1;
    saveState();
    render();
  }

  function buyGym() {
    if (!upgradesUnlocked() || state.gymPurchased || !WIS.Core.Resources.canAfford("power", GYM_COST)) return;
    if (!WIS.Core.Resources.spend("power", GYM_COST)) return false;
    state.gymPurchased = true;
    saveState();
    render();
  }

  function buyExercise() {
    if (!upgradesUnlocked() || state.exercisePurchased || !WIS.Core.Resources.canAfford("power", EXERCISE_COST)) return;
    if (!WIS.Core.Resources.spend("power", EXERCISE_COST)) return false;
    state.exercisePurchased = true;
    saveState();
    render();
  }

  function buyTranscendent() {
    if (!state.brickUnlocked || state.transcendentPurchased || !WIS.Core.Resources.canAfford("power", TRANSCENDENT_COST)) return;
    if (!WIS.Core.Resources.spend("power", TRANSCENDENT_COST)) return false;
    state.transcendentPurchased = true;
    saveState();
    render();
  }

  function buyFocus() {
    if (!state.brickUnlocked || state.focusPurchased || !WIS.Core.Resources.canAfford("power", FOCUS_COST)) return;
    if (!WIS.Core.Resources.spend("power", FOCUS_COST)) return false;
    state.focusPurchased = true;
    saveState();
    render();
  }

  function buyBreathingMethod() {
    if (!state.brickUnlocked || state.breathingMethodPurchased || !WIS.Core.Resources.canAfford("power", BREATHING_METHOD_COST)) return;
    if (!WIS.Core.Resources.spend("power", BREATHING_METHOD_COST)) return false;
    state.breathingMethodPurchased = true;
    saveState();
    render();
  }

  function buyExtremeExercise() {
    if (!state.brickUnlocked || state.extremeExercisePurchased || !WIS.Core.Resources.canAfford("power", EXTREME_EXERCISE_COST)) return;
    if (!WIS.Core.Resources.spend("power", EXTREME_EXERCISE_COST)) return false;
    state.extremeExercisePurchased = true;
    saveState();
    render();
  }

  function buyRock() {
    const cost = rockCost();
    if (!state.wallUnlocked || state.rockLevel >= rockLevelCap() || !WIS.Core.Resources.canAfford("power", cost)) return;
    if (!WIS.Core.Resources.spend("power", cost)) return false;
    state.rockLevel += 1;
    saveState();
    render();
  }

  function buyWater() {
    if (!state.wallUnlocked || state.waterPurchased || !WIS.Core.Resources.canAfford("power", WATER_COST)) return;
    if (!WIS.Core.Resources.spend("power", WATER_COST)) return false;
    state.waterPurchased = true;
    saveState();
    render();
  }

  function buyGhostBrain() {
    if (!state.wallUnlocked || state.ghostBrainPurchased || !WIS.Core.Resources.canAfford("power", GHOST_BRAIN_COST)) return;
    if (!WIS.Core.Resources.spend("power", GHOST_BRAIN_COST)) return false;
    state.ghostBrainPurchased = true;
    saveState();
    render();
  }

  function buyNaturalStrength() {
    if (!state.wallUnlocked || state.naturalStrengthPurchased || !WIS.Core.Resources.canAfford("power", NATURAL_STRENGTH_COST)) return;
    if (!WIS.Core.Resources.spend("power", NATURAL_STRENGTH_COST)) return false;
    state.naturalStrengthPurchased = true;
    saveState();
    render();
  }

  function buyMentalPower() {
    if (!state.wallUnlocked || state.mentalPowerPurchased || !WIS.Core.Resources.canAfford("power", MENTAL_POWER_COST)) return;
    if (!WIS.Core.Resources.spend("power", MENTAL_POWER_COST)) return false;
    state.mentalPowerPurchased = true;
    saveState();
    render();
  }

  function buyLifePower() {
    if (!state.wallUnlocked || state.lifePowerPurchased || !WIS.Core.Resources.canAfford("power", LIFE_POWER_COST)) return;
    if (!WIS.Core.Resources.spend("power", LIFE_POWER_COST)) return false;
    state.lifePowerPurchased = true;
    saveState();
    render();
  }

  function buyMyStyle() {
    if (state.highestScaleIndex < 3 || state.myStylePurchased || !WIS.Core.Resources.canAfford("power", MY_STYLE_COST)) return;
    if (!WIS.Core.Resources.spend("power", MY_STYLE_COST)) return false;
    state.myStylePurchased = true;
    saveState();
    render();
  }

  function buyIntuition() {
    if (state.highestScaleIndex < 3 || state.intuitionPurchased || !WIS.Core.Resources.canAfford("power", INTUITION_COST)) return;
    if (!WIS.Core.Resources.spend("power", INTUITION_COST)) return false;
    state.intuitionPurchased = true;
    saveState();
    render();
  }

  function buySonicMovement() {
    if (state.highestScaleIndex < 3 || state.sonicMovementPurchased || !WIS.Core.Resources.canAfford("power", SONIC_MOVEMENT_COST)) return;
    if (!WIS.Core.Resources.spend("power", SONIC_MOVEMENT_COST)) return false;
    state.sonicMovementPurchased = true;
    saveState();
    render();
  }

  function buyCarbonLimit() {
    if (state.highestScaleIndex < 3 || state.carbonLimitPurchased || !WIS.Core.Resources.canAfford("power", CARBON_LIMIT_COST)) return;
    if (!WIS.Core.Resources.spend("power", CARBON_LIMIT_COST)) return false;
    state.carbonLimitPurchased = true;
    saveState();
    render();
  }

  function buyKillingIntent() {
    if (state.highestScaleIndex < 3 || state.killingIntentPurchased || !WIS.Core.Resources.canAfford("power", KILLING_INTENT_COST)) return;
    if (!WIS.Core.Resources.spend("power", KILLING_INTENT_COST)) return false;
    state.killingIntentPurchased = true;
    saveState();
    render();
  }

  function buyRockStrike() {
    if (state.highestScaleIndex < 4 || state.rockStrikePurchased || !WIS.Core.Resources.canAfford("power", ROCK_STRIKE_COST)) return;
    if (!WIS.Core.Resources.spend("power", ROCK_STRIKE_COST)) return false;
    state.rockStrikePurchased = true;
    saveState();
    render();
  }

  function buyHighSpeedMetabolism() {
    if (state.highestScaleIndex < 4 || state.highSpeedMetabolismPurchased || !WIS.Core.Resources.canAfford("power", HIGH_SPEED_METABOLISM_COST)) return;
    if (!WIS.Core.Resources.spend("power", HIGH_SPEED_METABOLISM_COST)) return false;
    state.highSpeedMetabolismPurchased = true;
    saveState();
    render();
  }

  function buyEnduranceEnhancement() {
    if (state.highestScaleIndex < 4 || state.enduranceEnhancementPurchased || !WIS.Core.Resources.canAfford("power", ENDURANCE_ENHANCEMENT_COST)) return;
    if (!WIS.Core.Resources.spend("power", ENDURANCE_ENHANCEMENT_COST)) return false;
    state.enduranceEnhancementPurchased = true;
    saveState();
    render();
  }

  function buyBulletTime() {
    if (state.highestScaleIndex < 4 || state.bulletTimePurchased || !WIS.Core.Resources.canAfford("power", BULLET_TIME_COST)) return;
    if (!WIS.Core.Resources.spend("power", BULLET_TIME_COST)) return false;
    state.bulletTimePurchased = true;
    saveState();
    render();
  }

  function buyDynamicFocus() {
    if (state.highestScaleIndex < 4 || state.dynamicFocusPurchased || !WIS.Core.Resources.canAfford("power", DYNAMIC_FOCUS_COST)) return;
    if (!WIS.Core.Resources.spend("power", DYNAMIC_FOCUS_COST)) return false;
    state.dynamicFocusPurchased = true;
    saveState();
    render();
  }

  function buySuperPerception() {
    if (state.highestScaleIndex < 5 || state.superPerceptionPurchased || !WIS.Core.Resources.canAfford("power", SUPER_PERCEPTION_COST)) return;
    if (!WIS.Core.Resources.spend("power", SUPER_PERCEPTION_COST)) return false;
    state.superPerceptionPurchased = true;
    saveState();
    render();
  }

  function buyInvulnerable() {
    if (state.highestScaleIndex < 5 || state.invulnerablePurchased || !WIS.Core.Resources.canAfford("power", INVULNERABLE_COST)) return;
    if (!WIS.Core.Resources.spend("power", INVULNERABLE_COST)) return false;
    state.invulnerablePurchased = true;
    saveState();
    render();
  }

  function buyRegeneration() {
    if (state.highestScaleIndex < 5 || state.regenerationPurchased || !WIS.Core.Resources.canAfford("power", REGENERATION_COST)) return;
    if (!WIS.Core.Resources.spend("power", REGENERATION_COST)) return false;
    state.regenerationPurchased = true;
    saveState();
    render();
  }

  function buySuperpower() {
    if (state.highestScaleIndex < 5 || state.superpowerPurchased || !WIS.Core.Resources.canAfford("power", SUPERPOWER_COST)) return;
    if (!WIS.Core.Resources.spend("power", SUPERPOWER_COST)) return false;
    state.superpowerPurchased = true;
    saveState();
    render();
  }

  function buySuperSpeedThinking() {
    if (state.highestScaleIndex < 5 || state.superSpeedThinkingPurchased || !WIS.Core.Resources.canAfford("power", SUPER_SPEED_THINKING_COST)) return;
    if (!WIS.Core.Resources.spend("power", SUPER_SPEED_THINKING_COST)) return false;
    state.superSpeedThinkingPurchased = true;
    saveState();
    render();
  }

  function buyMountainCollapse() {
    if (state.highestScaleIndex < 5 || state.mountainCollapsePurchased || !WIS.Core.Resources.canAfford("power", MOUNTAIN_COLLAPSE_COST)) return;
    if (!WIS.Core.Resources.spend("power", MOUNTAIN_COLLAPSE_COST)) return false;
    state.mountainCollapsePurchased = true;
    saveState();
    render();
  }

  function buyMindDivision() {
    const cost = mindDivisionCost();
    if (state.highestScaleIndex < 6 || !state.focusPurchased || state.mindDivisionLevel >= 3 || !WIS.Core.Resources.canAfford("power", cost)) return;
    if (!WIS.Core.Resources.spend("power", cost)) return false;
    state.mindDivisionLevel += 1;
    saveState();
    render();
  }

  function buyPowerOneTime(stateKey, cost, prerequisiteMet = true, requiredScaleIndex = 6) {
    if (state.highestScaleIndex < requiredScaleIndex || !prerequisiteMet || state[stateKey] || !WIS.Core.Resources.canAfford("power", cost)) return;
    if (!WIS.Core.Resources.spend("power", cost)) return false;
    state[stateKey] = true;
    saveState();
    render();
  }

  function buyStarPowerOneTime(stateKey, cost, requiredScaleIndex = 10) {
    if (state.highestScaleIndex < requiredScaleIndex || state[stateKey] || !WIS.Core.Resources.canAfford("power", cost)) return;
    if (!WIS.Core.Resources.spend("power", cost)) return false;
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
  function buyPlanetWill() { return buyStarPowerOneTime("planetWillPurchased", PLANET_WILL_COST); }
  function buyStarSpirit() { return buyStarPowerOneTime("starSpiritPurchased", STAR_SPIRIT_COST); }
  function buyStarShatter() { return buyStarPowerOneTime("starShatterPurchased", STAR_SHATTER_COST); }
  function buySpaceQuake() { return buyStarPowerOneTime("spaceQuakePurchased", SPACE_QUAKE_COST); }
  function buySelfless() { return buyStarPowerOneTime("selflessPurchased", SELFLESS_COST); }
  function buySupernaturalFire() { return buyStarPowerOneTime("supernaturalFirePurchased", SUPERNATURAL_FIRE_COST); }
  function buyFiveSpiritStone() { return buyStarPowerOneTime("fiveSpiritStonePurchased", FIVE_SPIRIT_STONE_COST); }
  function buySelfSuppression() { return buyStarPowerOneTime("selfSuppressionPurchased", SELF_SUPPRESSION_COST); }
  function buyStellarFurnace() { return buyStarPowerOneTime("stellarFurnacePurchased", STELLAR_FURNACE_COST, 11); }
  function buyStellarTreasureSeeking() { return buyStarPowerOneTime("stellarTreasureSeekingPurchased", STELLAR_TREASURE_SEEKING_COST, 11); }
  function buyGravitationalCollapse() { return buyStarPowerOneTime("gravitationalCollapsePurchased", GRAVITATIONAL_COLLAPSE_COST, 11); }
  function buyGalacticReturn() { return buyStarPowerOneTime("galacticReturnPurchased", GALACTIC_RETURN_COST, 12); }
  function buyStellarSeaGift() { return buyStarPowerOneTime("stellarSeaGiftPurchased", STELLAR_SEA_GIFT_COST, 12); }
  function buyStellarResonance() { return buyStarPowerOneTime("stellarResonancePurchased", STELLAR_RESONANCE_COST, 12); }
  function buyGreatAttractor() { return buyStarPowerOneTime("greatAttractorPurchased", GREAT_ATTRACTOR_COST, 13); }
  function buyLargeScaleAdaptation() { return buyStarPowerOneTime("largeScaleAdaptationPurchased", LARGE_SCALE_ADAPTATION_COST, 13); }
  function buySuperclusterCollapse() { return buyStarPowerOneTime("superclusterCollapsePurchased", SUPERCLUSTER_COLLAPSE_COST, 13); }
  function buyCosmicWeb() { return buyStarPowerOneTime("cosmicWebPurchased", COSMIC_WEB_COST, 14); }
  function buyScaleUnification() { return buyStarPowerOneTime("scaleUnificationPurchased", SCALE_UNIFICATION_COST, 14); }
  function buySpacetimeFramework() { return buyStarPowerOneTime("spacetimeFrameworkPurchased", SPACETIME_FRAMEWORK_COST, 14); }

  function buyGhostBack() {
    return buyPowerOneTime("ghostBackPurchased", GHOST_BACK_COST, true, 3);
  }

  function toggleGhostBack() {
    if (!state.ghostBackPurchased) return;
    state.ghostBackActive = !state.ghostBackActive;
    WIS.Core.Effects.invalidate();
    saveState();
    render();
  }

  function rollDynamicAttempts(attempts, available, probability, award, options = {}) {
    if (options.treasureKey) {
      const gained = WIS.Meta.TreasureProgress.advance(state, options.treasureKey, attempts, { available: available() });
      return gained.lte(Number.MAX_SAFE_INTEGER) ? gained.toNumber() : gained;
    }
    const awardMultiplier = options.treasureKey
      ? WIS.Meta.Treasures?.getTreasureAwardMultiplier?.(state, options.treasureKey) ?? 1
      : 1;
    const gained = rollProbabilityAttempts(attempts, available, probability, award, {
      ...options,
      awardMultiplier
    });
    if (gt(gained, ZERO)) WIS.Core.Effects.invalidate();
    return gained;
  }

  function purchaseCheapestAvailable(candidates, resourceKey = "power") {
    const affordableCandidates = candidates
      .filter((candidate) => candidate.available())
      .map((candidate, candidateIndex) => ({ ...candidate, candidateIndex, currentCost: candidate.cost() }))
      .filter((candidate) => gt(candidate.currentCost, ZERO) && WIS.Core.Resources.canAfford(resourceKey, candidate.currentCost))
      .sort((left, right) => BN(left.currentCost).cmp(right.currentCost) || left.candidateIndex - right.candidateIndex);
    const affordable = affordableCandidates[0];
    if (!affordable) return false;
    if (typeof affordable.buyMax === "function") {
      const nextCompetingCost = affordableCandidates.find((candidate) => candidate !== affordable)?.currentCost || null;
      return affordable.buyMax(nextCompetingCost);
    }
    if (!WIS.Core.Resources.spend(resourceKey, affordable.currentCost)) return false;
    affordable.apply();
    WIS.Core.Effects.invalidate();
    return 1;
  }

  const actions = Object.freeze({
    train: "train", running: "buyRunning", focus: "buyFocus", rock: "buyRock", ghostBack: "toggleGhostBack"
  });
  const upgrades = Object.freeze({
    running: "buyRunning", gym: "buyGym", exercise: "buyExercise", transcendent: "buyTranscendent",
    focus: "buyFocus", breathingMethod: "buyBreathingMethod", extremeExercise: "buyExtremeExercise",
    rock: "buyRock", water: "buyWater", ghostBrain: "buyGhostBrain", naturalStrength: "buyNaturalStrength",
    mentalPower: "buyMentalPower", lifePower: "buyLifePower", myStyle: "buyMyStyle", intuition: "buyIntuition",
    ghostBack: "buyGhostBack",
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
    chicxulubMeteorite: "buyChicxulubMeteorite", planetWill: "buyPlanetWill",
    starSpirit: "buyStarSpirit", starShatter: "buyStarShatter", spaceQuake: "buySpaceQuake",
    selfless: "buySelfless", supernaturalFire: "buySupernaturalFire", fiveSpiritStone: "buyFiveSpiritStone",
    selfSuppression: "buySelfSuppression", stellarFurnace: "buyStellarFurnace",
    stellarTreasureSeeking: "buyStellarTreasureSeeking", gravitationalCollapse: "buyGravitationalCollapse",
    galacticReturn: "buyGalacticReturn", stellarSeaGift: "buyStellarSeaGift", stellarResonance: "buyStellarResonance",
    greatAttractor: "buyGreatAttractor", largeScaleAdaptation: "buyLargeScaleAdaptation",
    superclusterCollapse: "buySuperclusterCollapse", cosmicWeb: "buyCosmicWeb",
    scaleUnification: "buyScaleUnification", spacetimeFramework: "buySpacetimeFramework"
  });
  function performAction(id, ...args) { runtime.assertMutable(); const name = actions[id]; return name ? api[name](...args) : false; }
  function buyUpgrade(id, ...args) { runtime.assertMutable(); const name = upgrades[id]; return name ? api[name](...args) : false; }
  function getActionIds() { return Object.keys(actions); }
  function getUpgradeIds() { return Object.keys(upgrades); }
  function evaluateScaleRates(factor=ONE,profiles=null){
    return {joules:mul(automaticJSettledPerSecondAt(state.joules,profiles?.joules),factor),
      power:mul(automaticPowerSettledPerSecondAt(state.power,profiles?.power),factor)};
  }
  const api = Object.freeze({
    upgradePreview, withScaleState, isScaleState: current => state === current, evaluateScaleRates,
    brainDomainDevelopmentPotentialExponent, killingIntentWavePotentialExponent,
    resourceSoftcapExponent, resourceSoftcapBaseExponent, specialResourceSoftcapExponent,
    resourceSoftcapStageExponents,
    adjustedNormalStageExponent, resourceSoftcapEquivalentRawForComponents,
    resourceSoftcapSettlementForComponents, getResourceSoftcapBreakdown,
    planetSuppressionSoftcapExponent,
    resourceSoftcapSettlementExponent,
    applyResourceSoftcap, applyResourceSoftcapSettlement, applyResourceSoftcapRate,
    applySpecialResourceSoftcapRate,
    applyResourceSoftcapEffectiveRate,
    applyResourceSoftcapOverTime, applyResourceSoftcapDynamicRateOverTime,
    applyResourceSoftcapProgressive,
    nextResourceSoftcapIntegrationBoundary, resourceSoftcapIntegrationEvaluationAmount,
    formatSoftcapExponent,
    activeSoftcapStages, removedSoftcapStages,
    scaleRequirement, scaleRequirementDetails, blackHoleGainLossDetails,
    superLollipopCount, superLollipopChance, superLollipopTrainingMultiplier, rollSuperLollipopAttempts,
    skyCrystalCount, skyCrystalChance, skyCrystalRockMultiplier, rollSkyCrystalAttempts,
    cosmicFiberCount, cosmicFiberAvailable, cosmicFiberDecayedChance, cosmicFiberChance, rollCosmicFiberAttempts,
    cosmicWillCount, cosmicWillAvailable, cosmicWillDecayedChance, cosmicWillChance, rollCosmicWillAttempts,
    galaxyEffectiveExponent,
    completedChallengeLayers, treasureChanceMultiplier, treasureAwardMultiplier,
    fiveSpiritStoneCount, fiveSpiritStoneChance, fiveSpiritStoneJSource, fiveSpiritStonePowerSource,
    rollFiveSpiritStoneAttempts,
    automaticJRawPerSecond, automaticJRawPerSecondAt, automaticJSettledPerSecondAt,
    createAutomaticJRateProfile, preSoftcapJGainFromSources,
    automaticPowerRawPerSecond, automaticPowerRawPerSecondAt, automaticPowerSettledPerSecondAt,
    continuousSourceDescriptors:()=>[
      ['baseJ','joules',[],()=>ONE],['achievementJ','joules',[],achievementJBonus],
      ['fitness','joules',['joules','power','immortalPower'],fitnessJBonus],
      ['killingIntent','joules',['joules','power','mana','immortalPower'],killingIntentJBonus],
      ['elementalization','joules',['joules','power','immortalPower'],elementalizationJSource],
      ['focus','power',['joules','power','mana','immortalPower'],focusPowerPerSecond],
      ['rock','power',['joules','power','immortalPower'],rockPowerPerSecond],
      ['ghostBrain','power',['joules','power','immortalPower'],ghostBrainPowerSource],
      ['ultimateIntent','power',['joules','power','mana','immortalPower'],ultimateIntentPowerSource]
    ].map(([id,target,dynamicResources,valueAt])=>({id,target,dynamicResources,operationType:'additive',valueAt})),
    createAutomaticPowerRateProfile,
    preSoftcapPowerGainFromSources,
    flowUltimateIntentMultiplierFromFocusSource, flowUltimateIntentMultiplier,
    focusPowerGainStages, focusPowerGainStagesWithoutSupernaturalFire,
    supernaturalFireMultiplierFromFocusSource, supernaturalFirePowerMultiplier,
    activePowerSourceChallengeExponent, challengeAdjustedPowerSource,
    buyWaveEye, buyElementalAwakening, buyMoonfall, buyFlowState, buySelfhood, buyFreedom, buyChicxulubMeteorite,
    buyPlanetWill, buyStarSpirit, buyStarShatter, buySpaceQuake, buySelfless, buySupernaturalFire, buyFiveSpiritStone, buySelfSuppression,
    buyStellarFurnace, buyStellarTreasureSeeking, buyGravitationalCollapse,
    buyGalacticReturn, buyStellarSeaGift, buyStellarResonance,
    buyGreatAttractor, buyLargeScaleAdaptation, buySuperclusterCollapse,
    buyCosmicWeb, buyScaleUnification, buySpacetimeFramework,
    planetWillElementalizationMultiplier, starShatterRockMultiplier,
    selfSuppressionJExponentFromBase, selfSuppressionJExponent,
    planetSuppressionRewardExponent, utmostPuritySoftcapExponent,
    gymPotentialMultiplier, gymMultiplier, sonicMovementMultiplierForExponent,
    sonicMovementPotentialMultiplier, sonicMovementMultiplier, godspeedExponent,
    godspeedPotentialExponent, breathingMethodGymMultiplier, scaleIndexForPower, updateScaleProgress, rollFitnessMembershipCardAttempts, exercisePotentialMultiplier, exerciseMultiplier, transcendentPotentialMultiplier, transcendentMultiplier, extremeExerciseEffectMultiplier, naturalStrengthPotentialMultiplier, powerMultiplierGroups, powerMultiplier, challengeCompletionCount, challengeRewardExponent, challengeRewardMultiplier, longevityChallengeRewardMultiplier, fiveMisfortunesRewardExponent, activeChallengeLimitExponent, jGainExponent, powerGainExponent, currentPowerMilestone, reachedPowerMilestone, superpowerExponent, fitnessSourceExponent, trainingSourceExponent, applyGainExponent, additiveLevelMultiplier, jMultiplierGroups, jMultiplier, automaticJPerSecond, jSourceGains, finalJPerSecondFromSources, continentPowerMagnitude, elementalizationJSource, longevityFitnessMultiplier, lifePowerFitnessMultiplier, myStylePotentialFitnessMultiplier, myStyleFitnessMultiplier, carbonLimitPotentialFitnessBonus, carbonLimitFitnessBonus, regenerationFitnessMultiplier, enduranceEnhancementFitnessMultiplier, fitnessMembershipCardCount, fitnessMembershipCardFitnessBonus, fitnessMembershipCardChance, fitnessJBonus, effectiveFitnessLevel, waterPotentialJMultiplier, runningCost, fitnessLevelCap, rockLevelCap, baseConversionGain, trainingPowerDecayMultiplier, trainingPowerSource, highSpeedMetabolismMultiplier, conversionGain, ghostBrainPotentialPowerBonus, ghostBrainPowerBonus, mentalDomainMultiplier, skySplitPotentialMultiplier, skySplitMultiplier, ghostBrainPowerSource, brainDomainDevelopmentExponent, continentCollapsePotentialExponent, ghostBrainActualPowerPerSecond, joulesForNextBasePower, focusPowerPerSecond, subtleFocusExponent, rawFocusPowerPerSecond, applyFocusSmoothSoftcap, dynamicFocusMultiplier, focusSoftcapExponent, actualFocusPowerPerSecond, killingIntentJBonus, rawKillingIntentPotentialJBonus, killingIntentExtractionRatio, killingIntentWaveExponent, superSpeedThinkingMultiplier, killingIntentPotentialJBonus, focusPercent, intuitionPotentialFocusMultiplier, intuitionFocusMultiplier, rockCost, rockPowerPerSecond, effectiveRockLevel, rockStrikeMultiplier, mountainCollapseExponent, automaticPowerPerSecond, ultimateIntentPowerSource, finalPowerGainFromSources, mindDivisionCost, manualScaleUpgradeHistory, hasManuallyUpgradedScale, autoUpgradeEnhancements, achievementJBonus, train, buyRunning, buyGym, buyExercise, buyTranscendent, buyFocus, buyBreathingMethod, buyExtremeExercise, buyRock, buyWater, buyGhostBrain, buyNaturalStrength, buyMentalPower, buyLifePower, buyMyStyle, buyIntuition, buyGhostBack, buySonicMovement, buyCarbonLimit, buyKillingIntent, buyRockStrike, buyHighSpeedMetabolism, buyEnduranceEnhancement, buyBulletTime, buyDynamicFocus, buySuperPerception, buyInvulnerable, buyRegeneration, buySuperpower, buySuperSpeedThinking, buyMountainCollapse, buyMindDivision, buyPowerOneTime, buyHyperRegeneration, buyMentalDomain, buyEarthSplit, buyGodspeed, buySuperpowerEvolution, buySubtle, buySkySplit, buyBiologicalQuantification, buyGhostManTransformation, buyDestroyCountry, buyHumanGhostTransformation, buyKillingIntentSubstance, buyEnergyCycle, buyMountainShatter, buyBioenergy, buyElementalization, buyKillingIntentPerception, buyKillingIntentWave, buyUltimateIntent, buyBrainDomainDevelopment, buyContinentSplit, buyContinentCollapse, toggleGhostBack,
    getJPerSecond: automaticJPerSecond,
    getPowerPerSecond: automaticPowerPerSecond,
    updateProgress: updateScaleProgress,
    autoUpgrade: autoUpgradeEnhancements,
    performAction, buyUpgrade, getActionIds, getUpgradeIds
  });
  WIS.Power.ScaleLogic = api;
}(window.WIS));

