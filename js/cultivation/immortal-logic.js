(function defineImmortalLogic(WIS) {
  "use strict";

  const runtime = WIS.Core.Runtime;
  const state = runtime.state;
  const CONFIG = WIS.Core.Config;
  const {
    BN, ZERO, ONE, add, sub, mul, div, pow, pow10, sqrt, log10,
    max: maxBN, min: minBN, gt, gte, lt, lte, eq,
    isFiniteBN, isNaNBN, sum: sumBN, product: productBN, toNumber
  } = WIS.Core.BigNum;
  const { applyGoogolPenalty } = WIS.Core.Penalties;
  const GOOGOL_PENALTY_THRESHOLD = CONFIG.googolPenalty.threshold;
  const IMMORTAL_COSTS = CONFIG.costs.immortal;
  const QI_REFINING_COST = IMMORTAL_COSTS.qiRefining;
  const FOUNDATION_BASE_COST = IMMORTAL_COSTS.foundation;
  const GOLDEN_CORE_BASE_COST = IMMORTAL_COSTS.goldenCore;
  const ADVANCED_REALMS = CONFIG.realms;
  const IMMORTAL_LIFE_COST = IMMORTAL_COSTS.immortalLife;
  const CIRCULATION_COST = IMMORTAL_COSTS.circulation;
  const MINOR_TECHNIQUE_COST = IMMORTAL_COSTS.minorTechnique;
  const FLYING_ESCAPE_COST = IMMORTAL_COSTS.flyingEscape;
  const MATERIAL_CONTROL_COST = IMMORTAL_COSTS.materialControl;
  const DIVINE_SENSE_COST = IMMORTAL_COSTS.divineSense;
  const GREAT_CULTIVATOR_COST = IMMORTAL_COSTS.greatCultivator;
  const SPIRIT_WORLD_ASCENSION_COST = IMMORTAL_COSTS.spiritWorldAscension;
  const AURA_CONTROL_COST = IMMORTAL_COSTS.auraControl;
  const EQUAL_HEAVEN_LONGEVITY_COST = IMMORTAL_COSTS.equalHeavenLongevity;
  const FIVE_ELEMENTS_COST = IMMORTAL_COSTS.fiveElements;
  const HEAVENLY_TREASURE_COSTS = IMMORTAL_COSTS.heavenlyTreasure;
  const BRAHMA_DEMON_ART_COST = IMMORTAL_COSTS.brahmaDemonArt;
  const TRUE_SPIRIT_TRANSFORMATION_COSTS = IMMORTAL_COSTS.trueSpiritTransformation;
  const VOID_REFINING_TO_QI_COST = IMMORTAL_COSTS.voidRefiningToQi;
  const SPIRIT_REFINING_ART_COST = IMMORTAL_COSTS.spiritRefiningArt;
  const SECOND_NASCENT_SOUL_COST = IMMORTAL_COSTS.secondNascentSoul;
  const ABUNDANT_AURA_COST = IMMORTAL_COSTS.abundantAura;
  const SILVER_TADPOLE_SCRIPT_COST = IMMORTAL_COSTS.silverTadpoleScript;
  const IMMORTAL_REALM_DIVINE_ABILITY_COST = IMMORTAL_COSTS.immortalRealmDivineAbility;
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
  const IMMORTAL_POWER_ABILITY_COSTS = IMMORTAL_POWER_CONFIG.abilityCosts;
  const IMMORTAL_APERTURE_CONFIG = IMMORTAL_POWER_CONFIG.immortalAperture;
  const UNDYING_PRIMORDIAL_SPIRIT_COST = IMMORTAL_POWER_ABILITY_COSTS.undyingPrimordialSpirit;
  const IMMORTAL_APERTURE_BASE_COST = IMMORTAL_APERTURE_CONFIG.baseCost;
  const IMMORTAL_APERTURE_GROWTH = IMMORTAL_APERTURE_CONFIG.growth;
  const IMMORTAL_APERTURE_CAP = IMMORTAL_APERTURE_CONFIG.cap;
  const CELESTIAL_FIVE_DECLINES_CONFIG = IMMORTAL_POWER_CONFIG.celestialFiveDeclines;
  const FIVE_ELEMENTS_TREASURE_CONFIG = IMMORTAL_POWER_CONFIG.fiveElementsTreasure;
  const ACHIEVEMENT_EFFECT_CONFIG = CONFIG.achievementEffects;
  const IMMORTAL_CRYSTAL_CONFIG = ACHIEVEMENT_EFFECT_CONFIG.immortalCrystal;
  const XUAN_IMMORTAL_BODY_COST = IMMORTAL_POWER_ABILITY_COSTS.xuanImmortalBody;
  const LAW_COST = IMMORTAL_POWER_ABILITY_COSTS.law;
  const MINOR_TRIBULATION_BASE_TRIGGER_LOAD = CONFIG.minorTribulationBaseTriggerLoad;
  const LONGEVITY_800_COSTS = IMMORTAL_COSTS.longevity800;
  const MANA_LIQUEFACTION_COST = IMMORTAL_COSTS.manaLiquefaction;
  const QI_SPELL_COSTS = IMMORTAL_COSTS.qiSpell;
  const FOUNDATION_SPELL_COSTS = IMMORTAL_COSTS.foundationSpell;
  const LONGEVITY_COSTS = IMMORTAL_COSTS.longevity;
  const GOLDEN_CORE_LONGEVITY_COSTS = IMMORTAL_COSTS.goldenCoreLongevity;
  const MANA_SOLIDIFICATION_COST = IMMORTAL_COSTS.manaSolidification;
  const TECHNIQUE_COST = IMMORTAL_COSTS.technique;
  const MAGIC_TREASURE_COST = IMMORTAL_COSTS.magicTreasure;
  const EXPLORATION_BASE_MANA = CONFIG.exploration.baseMana;
  const EXPLORATION_MANA_CURVE_CONFIG = CONFIG.exploration.manaCurve;
  const EXPLORATION_MINIMUM_POWER_COST = CONFIG.exploration.minimumPowerCost;
  const EXPLORATION_STANDARD_POWER_COST = CONFIG.exploration.standardPowerCost;
  const EXPLORATION_COST_EXPONENT_SCALE = CONFIG.exploration.costExponentScale;
  const AUTOMATIC_EXPLORATION_EFFICIENCY = CONFIG.exploration.automaticEfficiency;
  const MAGIC_TREASURE_MANA_CURVE_CONFIG = CONFIG.magicTreasure.manaCurve;
  const TREASURE_MANA_DIMINISHING_CONFIG = CONFIG.treasureManaDiminishing;
  const MANA_REALM_PROGRESS_STEP = 0.01;
  const IMMORTAL_POWER_REALM_PROGRESS_STEP = IMMORTAL_POWER_CONFIG.realmProgressStep;
  const MANA_PROGRESSIVE_MAX_SEGMENTS = 16;
  const EVENT_TIME_EPSILON = 1e-12;
  const REINCARNATION_ROOTS = CONFIG.reincarnationRoots;
  const BREATHING_REALM_CONFIGS = CONFIG.breathingRealms;
  const SCATTER_RETAINED_UPGRADE_TIERS = CONFIG.scatterRetainedUpgradeTiers;
  const DAO_ANCESTOR_CONFIG = IMMORTAL_POWER_CONFIG.daoAncestor;
  const QI_CHALLENGE_CONFIG = CONFIG.qiRefiningChallenge;

  const calculateSourceGain = (options) => WIS.Core.Formulas.source(options);
  const calculateRegionGain = (sources, options) => WIS.Core.Formulas.region(sources, options);
  const multiplyEffectGroups = (groups) => WIS.Core.Formulas.multiply(Object.values(groups).flat());
  const smoothPowerSoftcap = (...args) => WIS.Core.Formulas.smoothPowerSoftcap(...args);
  const diminishingMultiplierExponent = (...args) => WIS.Core.Formulas.diminishingMultiplierExponent(...args);
  const applyDiminishingMultiplier = (...args) => WIS.Core.Formulas.applyDiminishingMultiplier(...args);
  const saveState = (...args) => runtime.call("save", ...args);
  const render = (...args) => runtime.call("render", ...args);
  const showNotice = (...args) => runtime.call("showNotice", ...args);
  const achievementStates = (...args) => runtime.call("achievementStates", ...args);
  const notifyNewAchievements = (...args) => runtime.call("notifyNewAchievements", ...args);
  const cultivationUnlocked = (...args) => runtime.call("cultivationUnlocked", ...args);
  const treasuresUnlocked = (...args) => runtime.call("treasuresUnlocked", ...args);
  const format = (...args) => runtime.call("format", ...args);
  const freshDefaultState = () => runtime.call("freshState");
  const updateLifetimeStatistics = (...args) => runtime.call("updateLifetimeStatistics", ...args);
  const checkActiveChallengeCompletion = (...args) => runtime.call("checkActiveChallengeCompletion", ...args);
  const applyResourceSoftcapProgressive = (...args) => runtime.call("applyResourceSoftcapProgressive", ...args);
  const hasAchievement = (key) => WIS.Meta.Achievements.has(state, key);
  const canAffordMana = (cost) => WIS.Core.Resources.canAffordSystem("immortal", "mana", cost);
  const canAffordImmortalPower = (cost) => WIS.Core.Resources.canAffordSystem("immortal", "immortalPower", cost);

  function applyGainExponent(value, exponent) {
    return gt(value, ZERO) ? pow(value, exponent) : ZERO;
  }

  function additiveLevelMultiplier(level, perLevelMultiplier) {
    return level > 0 ? level * perLevelMultiplier : 1;
  }

  function immortalCultivationActive() {
    return state.cultivation.active === "immortal";
  }

  function daoAncestorActive() {
    return immortalCultivationActive() && state.advancedRealmLevel >= 10;
  }

  function qiRefiningChallengeActive() {
    return immortalCultivationActive() && state.activeChallenge === "qiRefiningHundredThousandYears";
  }

  function circulationEffective() {
    return state.circulationUnlocked || qiRefiningChallengeActive();
  }

  function daoAncestorRequirement() {
    return IMMORTAL_POWER_CONFIG.realmCosts.daoAncestor;
  }

  function daoTimeLawExponent(elapsedSeconds = state.reincarnationElapsedSeconds) {
    if (!daoAncestorActive() || !state.daoTimeLawUnlocked) return 1;
    const hours = Math.max(0, Number(elapsedSeconds) || 0) / 3600;
    return 1 + DAO_ANCESTOR_CONFIG.timeLawCoefficient * Math.log2(1 + hours);
  }

  function applyDaoTimeLaw(gain, elapsedSeconds = state.reincarnationElapsedSeconds) {
    const value = maxBN(ZERO, gain);
    return gt(value, ZERO) ? pow(value, daoTimeLawExponent(elapsedSeconds)) : ZERO;
  }

  function daoImmortalPowerRatio(currentImmortalPower = state.immortalPower) {
    return div(maxBN(ZERO, currentImmortalPower), daoAncestorRequirement());
  }

  function daoPowerSource(currentImmortalPower = state.immortalPower) {
    if (!daoAncestorActive() || !state.daoPowerUnlocked) return ZERO;
    return mul(DAO_ANCESTOR_CONFIG.powerBase, pow(
      add(ONE, daoImmortalPowerRatio(currentImmortalPower)),
      DAO_ANCESTOR_CONFIG.powerExponent
    ));
  }

  function daoAssimilationQ(currentImmortalPower = state.immortalPower) {
    if (!daoAncestorActive() || !state.daoAssimilationUnlocked) return 1;
    const magnitude = toNumber(log10(add(ONE, daoImmortalPowerRatio(currentImmortalPower))), Infinity);
    if (!Number.isFinite(magnitude)) return 0;
    const compressedMagnitude = Math.log10(1 + magnitude);
    return 1 / (1 + DAO_ANCESTOR_CONFIG.assimilationCoefficient * compressedMagnitude);
  }

  function daoAdjustedSoftcapExponent(exponent, currentImmortalPower = state.immortalPower) {
    const original = Math.max(0, Math.min(1, Number(exponent) || 0));
    return daoAncestorActive() && state.daoAssimilationUnlocked
      ? 1 - (1 - original) * daoAssimilationQ(currentImmortalPower)
      : original;
  }

  function daoDomainExponent(currentImmortalPower = state.immortalPower) {
    if (!daoAncestorActive() || !state.daoDomainUnlocked) return 1;
    const magnitude = toNumber(log10(add(ONE, daoImmortalPowerRatio(currentImmortalPower))), Infinity);
    return DAO_ANCESTOR_CONFIG.domainBaseExponent +
      DAO_ANCESTOR_CONFIG.domainGrowthCoefficient *
        Math.log10(1 + magnitude);
  }

  function qiLayerRequirement(layer) {
    const targetLayer = Math.floor(Number(layer) || 0);
    if (targetLayer < 1) return ZERO;
    const baseLog = toNumber(log10(FOUNDATION_BASE_COST), 0);
    const x = Math.max(0, (targetLayer - 1) / (QI_CHALLENGE_CONFIG.targetLayer - 1));
    const logRequirement = baseLog + (QI_CHALLENGE_CONFIG.targetLogRequirement - baseLog) *
      Math.pow(x, QI_CHALLENGE_CONFIG.requirementCurveExponent);
    return pow10(logRequirement);
  }

  const QI_LAYER_COST_BLOCK_SIZE = 256;
  const qiLayerCostBlockTotals = [];
  const qiLayerCostBlockPrefixes = [ZERO];

  function ensureQiLayerCostBlock(blockIndex) {
    const targetBlock = Math.max(0, Math.floor(Number(blockIndex) || 0));
    while (qiLayerCostBlockTotals.length <= targetBlock) {
      const nextBlock = qiLayerCostBlockTotals.length;
      const firstLayer = nextBlock * QI_LAYER_COST_BLOCK_SIZE + 1;
      const lastLayer = firstLayer + QI_LAYER_COST_BLOCK_SIZE - 1;
      let blockTotal = ZERO;
      for (let layer = firstLayer; layer <= lastLayer; layer += 1) {
        blockTotal = add(blockTotal, qiLayerRequirement(layer));
      }
      qiLayerCostBlockTotals.push(blockTotal);
      qiLayerCostBlockPrefixes.push(add(qiLayerCostBlockPrefixes[nextBlock], blockTotal));
    }
  }

  function qiLayerCumulativeCost(fromLayer, toLayer) {
    const firstLayer = Math.max(1, Math.floor(Number(fromLayer) || 0));
    const lastLayer = Math.max(0, Math.floor(Number(toLayer) || 0));
    if (lastLayer < firstLayer) return ZERO;
    let layer = firstLayer;
    let total = ZERO;
    while (layer <= lastLayer && (layer - 1) % QI_LAYER_COST_BLOCK_SIZE !== 0) {
      total = add(total, qiLayerRequirement(layer));
      layer += 1;
    }
    while (layer + QI_LAYER_COST_BLOCK_SIZE - 1 <= lastLayer) {
      const blockIndex = Math.floor((layer - 1) / QI_LAYER_COST_BLOCK_SIZE);
      ensureQiLayerCostBlock(blockIndex);
      total = add(total, qiLayerCostBlockTotals[blockIndex]);
      layer += QI_LAYER_COST_BLOCK_SIZE;
    }
    while (layer <= lastLayer) {
      total = add(total, qiLayerRequirement(layer));
      layer += 1;
    }
    return total;
  }

  function maxAffordableQiLayer(currentLayer, mana) {
    const startingLayer = Math.max(1, Math.floor(Number(currentLayer) || 1));
    const budget = maxBN(ZERO, mana);
    if (!isFiniteBN(budget) || !gt(budget, ZERO)) return startingLayer;
    let nextLayer = startingLayer + 1;
    let spent = ZERO;
    const canAddCost = (cost) => !gt(add(spent, cost), budget);

    while ((nextLayer - 1) % QI_LAYER_COST_BLOCK_SIZE !== 0) {
      const cost = qiLayerRequirement(nextLayer);
      if (!isFiniteBN(cost) || !canAddCost(cost)) return nextLayer - 1;
      spent = add(spent, cost);
      nextLayer += 1;
    }
    while (nextLayer <= Number.MAX_SAFE_INTEGER - QI_LAYER_COST_BLOCK_SIZE) {
      const blockIndex = Math.floor((nextLayer - 1) / QI_LAYER_COST_BLOCK_SIZE);
      ensureQiLayerCostBlock(blockIndex);
      const blockCost = qiLayerCostBlockTotals[blockIndex];
      if (!isFiniteBN(blockCost) || !canAddCost(blockCost)) break;
      spent = add(spent, blockCost);
      nextLayer += QI_LAYER_COST_BLOCK_SIZE;
    }
    const lastLayerInBlock = Math.min(Number.MAX_SAFE_INTEGER, nextLayer + QI_LAYER_COST_BLOCK_SIZE - 1);
    while (nextLayer <= lastLayerInBlock) {
      const cost = qiLayerRequirement(nextLayer);
      if (!isFiniteBN(cost) || !canAddCost(cost)) return nextLayer - 1;
      spent = add(spent, cost);
      nextLayer += 1;
    }
    return nextLayer - 1;
  }

  function qiLayerProgress() {
    return Math.max(0, (Math.max(1, Number(state.currentQiLayer) || 1) - 1) /
      (QI_CHALLENGE_CONFIG.targetLayer - 1));
  }

  function qiLayerManaMultiplier(layer = state.currentQiLayer) {
    return pow10(QI_CHALLENGE_CONFIG.manaLayerCoefficient *
      Math.max(0, (Number(layer) || 1) - 1));
  }

  function qiLayerManaSourceMultiplier(layer = state.currentQiLayer) {
    return pow10(QI_CHALLENGE_CONFIG.manaSourceCoefficient *
      Math.max(0, (Number(layer) || 1) - 1));
  }

  function qiGlobalSoftcapQ(layer = state.currentQiLayer) {
    const x = Math.max(0, ((Number(layer) || 1) - 1) /
      (QI_CHALLENGE_CONFIG.targetLayer - 1));
    return 1 / (1 + QI_CHALLENGE_CONFIG.globalSoftcapResistanceCoefficient *
      Math.pow(x, QI_CHALLENGE_CONFIG.globalSoftcapCurveExponent));
  }

  function qiManaSoftcapQ(layer = state.currentQiLayer) {
    const x = Math.max(0, ((Number(layer) || 1) - 1) /
      (QI_CHALLENGE_CONFIG.targetLayer - 1));
    return 1 / (1 + QI_CHALLENGE_CONFIG.manaSoftcapResistanceCoefficient *
      Math.pow(x, QI_CHALLENGE_CONFIG.globalSoftcapCurveExponent));
  }

  function qiAdjustedSoftcapExponent(exponent, manaSource = false, layer = state.currentQiLayer) {
    const original = Math.max(0, Math.min(1, Number(exponent) || 0));
    if (!qiRefiningChallengeActive()) return original;
    const globalAdjusted = 1 - (1 - original) * qiGlobalSoftcapQ(layer);
    return manaSource
      ? 1 - (1 - globalAdjusted) * qiManaSoftcapQ(layer)
      : globalAdjusted;
  }

  function qiChallengeReward(layer = state.bestQiLayer) {
    const ratio = Math.max(0, Number(layer) || 0) / QI_CHALLENGE_CONFIG.targetLayer;
    return pow10(QI_CHALLENGE_CONFIG.rewardLog10Maximum *
      Math.pow(ratio, QI_CHALLENGE_CONFIG.rewardCurveExponent));
  }

  function cultivationRealmLevel() {
    if (!immortalCultivationActive()) return 0;
    return WIS.Core.Registries.cultivationSystems.get("immortal").realmLevel(state);
  }

  function cultivationRealmName(level) {
    return WIS.Core.Registries.cultivationSystems.get("immortal").realmName(level);
  }

  function qiSpellPowerMultiplier() {
    return additiveLevelMultiplier(state.qiSpellLevel, 1.08);
  }

  function foundationSpellPowerMultiplier() {
    return additiveLevelMultiplier(state.foundationSpellLevel, 1.5);
  }

  function greatCultivatorJMultiplier() {
    return state.greatCultivatorUnlocked
      ? additiveLevelMultiplier(cultivationRealmLevel(), 1.5)
      : 1;
  }

  function qiRefiningFitnessMultiplier() {
    return immortalCultivationActive() && state.qiRefiningUnlocked ? 5 : 1;
  }

  function immortalFitnessBaseMultiplier() {
    if (!immortalCultivationActive()) return 1;
    return qiRefiningFitnessMultiplier() *
      additiveLevelMultiplier(state.longevityLevel, 2) *
      additiveLevelMultiplier(state.goldenCoreLongevityLevel, 4) *
      additiveLevelMultiplier(state.longevity800Level, 8);
  }

  function equalHeavenLongevityFitnessMultiplier() {
    return immortalCultivationActive() && state.equalHeavenLongevityUnlocked ? 8 : 1;
  }

  function baLingChiCount() {
    return state.treasureImprints?.baLingChi || 0;
  }

  function baLingChiFitnessMultiplier() {
    return immortalCultivationActive() ? 1 + baLingChiCount() * 0.002 : 1;
  }

  function immortalFitnessLevelCapBonus() {
    if (!immortalCultivationActive()) return 0;
    return (state.equalHeavenLongevityUnlocked ? 10 : 0) +
      state.longevityLevel * 10 +
      state.goldenCoreLongevityLevel * 10 +
      state.longevity800Level * 10;
  }

  function manaLiquefactionManaJMultiplier() {
    return state.manaLiquefactionUnlocked ? 1.5 : 1;
  }

  function spiritRefiningArtExponent() {
    return WIS.Core.Effects.value("spiritRefiningArt", state);
  }

  function reincarnationManaJExponent() {
    return [1, 1.05, 1.1, 1.15][state.reincarnationManaJRewardLevel] ?? 1;
  }

  function manaJRawBonus() {
    const exponent = state.advancedRealmLevel >= IMMORTAL_POWER_CONFIG.unlockAdvancedRealmLevel ? 0.83 : 0.8;
    return state.qiRefiningUnlocked ? mul(10, pow(maxBN(ZERO, state.mana), exponent)) : ZERO;
  }

  function manaJBonus() {
    if (!immortalCultivationActive() || !state.qiRefiningUnlocked) return ZERO;
    const source = calculateSourceGain({
      base: manaJRawBonus(),
      multipliers: [manaLiquefactionManaJMultiplier()],
      exponents: [reincarnationManaJExponent(), ...WIS.Core.Effects.values("manaJ", "sourceExponent", state)]
    });
    return qiRefiningChallengeActive() ? mul(source, qiLayerManaSourceMultiplier()) : source;
  }

  function magicTreasurePotentialPowerBonus() {
    return mul(mul(10, magicTreasureManaCurve()),
      WIS.Core.Effects.product("magicTreasure", "sourceMultiplier", state));
  }

  function magicTreasureManaExponent() {
    return state.natalMagicTreasureUnlocked
      ? MAGIC_TREASURE_MANA_CURVE_CONFIG.earlyExponent
      : MAGIC_TREASURE_MANA_CURVE_CONFIG.baseEarlyExponent;
  }

  function magicTreasureManaCurve(mana = state.mana) {
    const currentMana = maxBN(ZERO, mana);
    const earlyExponent = magicTreasureManaExponent();
    return smoothPowerSoftcap(
      currentMana,
      MAGIC_TREASURE_MANA_CURVE_CONFIG.scale,
      earlyExponent,
      Math.min(earlyExponent, MAGIC_TREASURE_MANA_CURVE_CONFIG.lateExponent),
      MAGIC_TREASURE_MANA_CURVE_CONFIG.sharpness
    );
  }

  function materialControlMultiplier() {
    return WIS.Core.Effects.value("materialControl", state);
  }

  function magicTreasurePowerBonus() {
    return immortalCultivationActive() && state.magicTreasureUnlocked ? magicTreasurePotentialPowerBonus() : ZERO;
  }

  function magicTreasurePowerSource() {
    return calculateSourceGain({
      base: magicTreasurePowerBonus(),
      exponents: WIS.Core.Effects.values("magicTreasure", "sourceExponent", state)
    });
  }

  function brahmaDemonArtPowerSource(fitnessSource = ZERO) {
    return immortalCultivationActive() && state.brahmaDemonArtUnlocked
      ? calculateSourceGain({
        base: mul(maxBN(ZERO, fitnessSource), 3),
        multipliers: WIS.Core.Effects.values("brahmaDemonArt", "sourceMultiplier", state),
        exponents: WIS.Core.Effects.values("brahmaDemonArt", "sourceExponent", state)
      })
      : ZERO;
  }

  function trueSpiritTransformationPotentialMultiplier(level = state.trueSpiritTransformationLevel) {
    return 1 + 0.6 * Math.max(0, Math.min(5, Math.floor(Number(level) || 0)));
  }

  function trueSpiritTransformationMultiplier() {
    return WIS.Core.Effects.value("trueSpiritTransformation", state);
  }

  function externalSources(_state, context = {}) {
    if (!immortalCultivationActive()) return [];
    return [
      { id: "manaJ", name: "法力", group: "仙道", target: "joules", value: manaJBonus() },
      { id: "spiritDomain", name: "灵域", group: "金仙", target: "joules", value: spiritDomainJSource() },
      { id: "magicTreasure", name: "法宝", group: "仙道", target: "power", value: magicTreasurePowerSource() },
      { id: "brahmaDemonArt", name: "梵圣真魔功", group: "仙道", target: "power", value: brahmaDemonArtPowerSource(context.fitnessJBonus) },
      { id: "daoPower", name: "道祖威能", group: "道祖", target: "power", value: daoPowerSource() },
      { id: "qiManaPower", name: "炼气十万年·法力战力", group: "仙道挑战", target: "power", value: qiRefiningChallengeActive()
        ? mul(add(ONE, maxBN(ZERO, state.mana)), qiLayerManaSourceMultiplier())
        : ZERO }
    ];
  }

  function rollTianNiPearlAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => treasuresUnlocked() && hasAchievement("daoFoundation"),
      tianNiPearlChance,
      () => { WIS.Meta.Treasures.add(state, "tianNiPearl"); },
      {
        baseChance: 0.01,
        currentCount: tianNiPearlCount,
        decayRatio: 0.99,
        probabilityAtOffset: (offset) => Math.min(1, 0.01 * Math.pow(0.99, tianNiPearlCount() + offset) * immortalTreasureChanceMultiplier()),
        treasureKey: "tianNiPearl",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "tianNiPearl", count)
      }
    );

    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得宝物烙印：仙道·天逆珠 +${gained}`);
    }
    return gained;
  }

  function rollFiveElementsTreasureAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => state.fiveElementsTreasureUnlocked,
      fiveElementsTreasureChance,
      () => { WIS.Meta.Treasures.add(state, "fiveElementsTreasure"); },
      {
        baseChance: FIVE_ELEMENTS_TREASURE_CONFIG.baseChance,
        currentCount: fiveElementsTreasureCount,
        decayRatio: FIVE_ELEMENTS_TREASURE_CONFIG.chanceDecay,
        probabilityAtOffset: (offset) => Math.min(1,
          FIVE_ELEMENTS_TREASURE_CONFIG.baseChance *
          Math.pow(FIVE_ELEMENTS_TREASURE_CONFIG.chanceDecay, fiveElementsTreasureCount() + offset) *
          immortalTreasureChanceMultiplier()
        ),
        treasureKey: "fiveElementsTreasure",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "fiveElementsTreasure", count)
      }
    );
    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得宝物烙印：仙道·五行至宝 +${gained}`);
    }
    return gained;
  }

  function rollImmortalCrystalAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => hasAchievement("ascendImmortal"),
      immortalCrystalChance,
      () => { WIS.Meta.Treasures.add(state, "immortalCrystal"); },
      {
        probabilityAtOffset: (offset) => immortalCrystalChance(immortalCrystalCount() + offset),
        treasureKey: "immortalCrystal",
        awardMany: (count) => WIS.Meta.Treasures.add(state, "immortalCrystal", count)
      }
    );
    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得宝物烙印：仙晶 +${gained}`);
    }
    return gained;
  }

  function minorTribulationPowerExponent() {
    if (!immortalCultivationActive()) return 1;
    if (state.advancedRealmLevel >= 6) return 1;
    if (state.advancedRealmLevel < 2) return 1;
    return state.advancedRealmLevel >= 3 ? 0.99 : 0.995;
  }

  function minorTribulationExplorationBaseExponent(advancedRealmLevel = state.advancedRealmLevel) {
    if (advancedRealmLevel >= 6) return 1;
    return advancedRealmLevel >= 3 ? 0.92 : advancedRealmLevel >= 2 ? 0.95 : 1;
  }

  function minorTribulationExplorationMinimumExponent(advancedRealmLevel = state.advancedRealmLevel) {
    if (advancedRealmLevel >= 6) return 1;
    return advancedRealmLevel >= 3 ? 0.8 : 0.85;
  }

  function minorTribulationExplorationDecayCoefficient(advancedRealmLevel = state.advancedRealmLevel) {
    if (advancedRealmLevel >= 6) return 0;
    return advancedRealmLevel >= 3 ? 0.022 : 0.02;
  }

  function minorTribulationExplorationManaExponent(
    triggered = false,
    triggerExponent = minorTribulationExplorationBaseExponent(),
    advancedRealmLevel = state.advancedRealmLevel
  ) {
    if (advancedRealmLevel < 2 || advancedRealmLevel >= 6) return 1;
    const baseExponent = minorTribulationExplorationBaseExponent(advancedRealmLevel);
    if (!triggered) return baseExponent;
    return Math.min(baseExponent, Math.max(
      minorTribulationExplorationMinimumExponent(advancedRealmLevel),
      Number(triggerExponent) || baseExponent
    ));
  }

  function baLingChiChance() {
    return Math.min(1, 0.002 * Math.pow(0.9, baLingChiCount()) * immortalTreasureChanceMultiplier());
  }

  function immortalTreasureChanceMultiplier() {
    return toNumber(immortalTreasureChanceMultiplierBN(), Infinity);
  }

  function immortalTreasureChanceMultiplierBN() {
    return productBN([
      hasAchievement("humanRealmDominance") ? 2 : 1,
      WIS.Core.Effects.product("immortalTreasureChance", "sourceMultiplier", state),
      WIS.Meta.Treasures?.getTreasureChanceMultiplier?.(state) ?? WIS.Power.ScaleLogic.treasureChanceMultiplier()
    ]);
  }

  function activeRootRequirementMultiplier() {
    if (!state.qiRefiningUnlocked) return 1;
    return permanentRootDefinition().requirementMultiplier;
  }

  function realmRequirementMultiplier(stackCount) {
    return Math.pow(activeRootRequirementMultiplier(), Math.min(3, Math.max(0, stackCount)));
  }

  function activeRootName() {
    return permanentRootDefinition().name;
  }

  function permanentRootDefinition() {
    return REINCARNATION_ROOTS[state.permanentRootLevel]
      ?? (hasAchievement("seizeFoundation")
        ? { name: "中品灵根", manaMultiplier: 1.15, requirementMultiplier: 1.05 }
        : { name: "下品灵根", manaMultiplier: 1.1, requirementMultiplier: 1.1 });
  }

  function effectiveScatterRebuildLevel() {
    return Math.max(state.scatterRebuildLevel, state.reincarnationEffectLevel);
  }

  function nextRealmRequirementStackCount() {
    if (!state.qiRefiningUnlocked) return 0;
    if (!state.foundationUnlocked) return 1;
    if (!state.goldenCoreUnlocked) return 2;
    return ADVANCED_REALMS[state.advancedRealmLevel] &&
      advancedRealmResource(state.advancedRealmLevel) === "mana"
      ? state.advancedRealmLevel + 3
      : 0;
  }

  function foundationCost() {
    if (qiRefiningChallengeActive()) return qiLayerRequirement(state.currentQiLayer + 1);
    return mul(FOUNDATION_BASE_COST, realmRequirementMultiplier(1)).round();
  }

  function goldenCoreCost() {
    return mul(goldenCoreBaseCost(), realmRequirementMultiplier(2)).round();
  }

  function goldenCoreBaseCost() {
    return mul(GOLDEN_CORE_BASE_COST, additiveLevelMultiplier(effectiveScatterRebuildLevel(), 2));
  }

  function advancedRealmResource(index) {
    return index >= IMMORTAL_POWER_CONFIG.unlockAdvancedRealmLevel ? "immortalPower" : "mana";
  }

  function immortalPowerRealmCost(index) {
    const key = ADVANCED_REALMS[index]?.key;
    const cost = BN(IMMORTAL_POWER_CONFIG.realmCosts[key]);
    return isFiniteBN(cost) && gt(cost, ZERO) ? cost : ZERO;
  }

  function advancedRealmManaCost(index) {
    return mul(advancedRealmBaseCost(index), realmRequirementMultiplier(index + 3)).round();
  }

  function advancedRealmCost(index) {
    return advancedRealmResource(index) === "immortalPower"
      ? immortalPowerRealmCost(index)
      : advancedRealmManaCost(index);
  }

  function advancedRealmBaseCost(index) {
    const scatterDiscount = index === 0 ? Math.max(0.1, 1 - 0.2 * effectiveScatterRebuildLevel()) : 1;
    return mul(ADVANCED_REALMS[index].baseCost, scatterDiscount);
  }

  function nextRealmCost() {
    if (!state.qiRefiningUnlocked) return ZERO;
    if (!state.foundationUnlocked) return foundationCost();
    if (!state.goldenCoreUnlocked) return goldenCoreCost();
    return ADVANCED_REALMS[state.advancedRealmLevel]
      ? advancedRealmCost(state.advancedRealmLevel)
      : ZERO;
  }

  function nextRealmResource() {
    if (!state.qiRefiningUnlocked) return "power";
    if (!state.foundationUnlocked || !state.goldenCoreUnlocked) return "mana";
    return ADVANCED_REALMS[state.advancedRealmLevel]
      ? advancedRealmResource(state.advancedRealmLevel)
      : null;
  }

  function manaProgressReferenceCost() {
    if (!state.qiRefiningUnlocked) return ZERO;
    if (!state.foundationUnlocked) return foundationCost();
    if (!state.goldenCoreUnlocked) return goldenCoreCost();
    if (!ADVANCED_REALMS[state.advancedRealmLevel]) return ZERO;
    return advancedRealmManaCost(state.advancedRealmLevel);
  }

  function breathingRealmConfig() {
    return BREATHING_REALM_CONFIGS[cultivationRealmLevel()] ?? BREATHING_REALM_CONFIGS[1];
  }

  function breathingManaDecayMultiplier(currentMana = state.mana) {
    const { manaScale } = breathingRealmConfig();
    return pow(add(ONE, div(maxBN(ZERO, currentMana), manaScale)), -0.25);
  }

  function rawBaseBreathingManaGain(currentMana = state.mana) {
    if (lt(state.joules, 3000)) return ZERO;
    const { base } = breathingRealmConfig();
    const jMagnitude = toNumber(log10(div(state.joules, 3000)), 0);
    const jCurve = pow(1 + jMagnitude, breathingJCurveExponent());
    return mul(mul(base, jCurve), breathingManaDecayMultiplier(currentMana));
  }

  function baseBreathingManaGain(currentMana = state.mana) {
    return rawBaseBreathingManaGain(currentMana).floor();
  }

  function effectiveBaseBreathingManaGain(currentMana = state.mana) {
    const rawBase = rawBaseBreathingManaGain(currentMana);
    const flooredBase = rawBase.floor();
    return gt(flooredBase, ZERO) ? flooredBase : rawBase;
  }

  function breathingJCurveExponent() {
    let exponent = 2.5;
    if (state.manaLiquefactionUnlocked) exponent += 0.3;
    if (state.manaSolidificationUnlocked) exponent += 0.4;
    if (state.abundantAuraUnlocked) {
      exponent += 0.8;
      if (state.manaLiquefactionUnlocked) exponent += 0.4;
      if (state.manaSolidificationUnlocked) exponent += 0.6;
    }
    return exponent + WIS.Core.Effects.values("breathingJCurve", "sourceAdditive", state)
      .reduce((total, value) => total + value, 0);
  }

  function breathingManaGain(currentMana = state.mana) {
    if (!immortalCultivationActive() || !state.qiRefiningUnlocked) return ZERO;
    const breathingSource = breathingManaSource(currentMana);
    return gt(breathingSource, ZERO)
      ? finalManaGainFromSources([breathingSource], currentMana, [scatterRebuildManaMultiplier()])
      : ZERO;
  }

  function breathingManaSource(currentMana = state.mana) {
    if (!immortalCultivationActive() || !state.qiRefiningUnlocked) return ZERO;
    return calculateSourceGain({
      base: effectiveBaseBreathingManaGain(currentMana),
      multipliers: WIS.Core.Effects.values("breathing", "sourceMultiplier", state),
      exponents: WIS.Core.Effects.values("breathing", "sourceExponent", state)
    });
  }

  function voidRefiningToQiExponent() {
    return WIS.Core.Effects.value("voidRefiningToQi", state);
  }

  function auraControlPotentialMultiplier() {
    const currentPower = WIS.Core.Effects.dynamicResourceValue(state, "power");
    return 1 + 1.5 * toNumber(log10(add(ONE, div(maxBN(ZERO, currentPower), "3.033e15"))), 0);
  }

  function auraControlMultiplier() {
    return WIS.Core.Effects.value("auraControl", state);
  }

  function immortalRealmDivineAbilityPotentialMultiplier() {
    const currentJoules = WIS.Core.Effects.dynamicResourceValue(state, "joules");
    return 1 + 0.75 * toNumber(log10(add(ONE, div(maxBN(ZERO, currentJoules), "2.092e20"))), 0);
  }

  function immortalRealmDivineAbilityMultiplier() {
    return WIS.Core.Effects.value("immortalRealmDivine", state);
  }

  function manaMultiplierGroups(currentMana = state.mana) {
    const groups = WIS.Core.Effects.groups("mana", "regionMultiplier", state);
    (groups["境界"] ||= []).push({ name: "当前境界瓶颈", value: cultivationBottleneckManaMultiplier(currentMana) });
    return groups;
  }

  function manaGainMultiplier(currentMana = state.mana) {
    return multiplyEffectGroups(manaMultiplierGroups(currentMana));
  }

  function bottleneckManaMultiplier(requirement, active, currentMana = state.mana) {
    if (!active || !gt(requirement, ZERO)) return 1;
    const ratio = div(maxBN(ZERO, currentMana), requirement);
    return div(ONE, add(ONE, mul(1.5, pow(ratio, 4))));
  }

  function immortalPowerUnlocked() {
    return immortalCultivationActive() &&
      state.advancedRealmLevel >= IMMORTAL_POWER_CONFIG.unlockAdvancedRealmLevel &&
      state.immortalSpiritPowerUnlocked === true;
  }

  function nextImmortalPowerRealmCost() {
    return immortalPowerUnlocked() ? immortalPowerRealmCost(state.advancedRealmLevel) : ZERO;
  }

  function immortalPowerProgressRatio(currentImmortalPower = state.immortalPower) {
    const requirement = nextImmortalPowerRealmCost();
    if (!gt(requirement, ZERO)) return 0;
    return Math.min(1, Math.max(0, toNumber(div(maxBN(ZERO, currentImmortalPower), requirement), 1)));
  }

  function immortalPowerManaSuppressionExponent(currentImmortalPower = state.immortalPower) {
    if (!immortalPowerUnlocked()) return 1;
    if (state.advancedRealmLevel >= 7) {
      return celestialFiveDeclineExponent(currentImmortalPower);
    }
    return Math.max(
      0,
      1 - IMMORTAL_POWER_CONFIG.manaSuppressionStrength *
        Math.sqrt(immortalPowerProgressRatio(currentImmortalPower))
    );
  }

  function applyImmortalPowerManaSuppression(gain, currentImmortalPower = state.immortalPower) {
    return applyGainExponent(gain, immortalPowerManaSuppressionExponent(currentImmortalPower));
  }

  function immortalPowerBasePerSecond(currentMana = state.mana) {
    if (!immortalPowerUnlocked()) return ZERO;
    const scaledMana = div(maxBN(ZERO, currentMana), IMMORTAL_POWER_CONFIG.manaScale);
    return pow(scaledMana, IMMORTAL_POWER_CONFIG.manaExponent);
  }

  function immortalPowerMultiplierGroups() {
    return WIS.Core.Effects.groups("immortalPower", "regionMultiplier", state);
  }

  function immortalPowerMultiplier() {
    return multiplyEffectGroups(immortalPowerMultiplierGroups());
  }

  function logarithmicTimeBonus(elapsedSeconds, coefficient, timeScaleSeconds) {
    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const timeScale = Math.max(1, Number(timeScaleSeconds) || ACHIEVEMENT_EFFECT_CONFIG.timeScaleSeconds);
    return coefficient * Math.log2(1 + elapsed / timeScale);
  }

  function goldenNatureImmortalPowerExponentBonus(elapsedSeconds = state.reincarnationElapsedSeconds) {
    return hasAchievement("goldenNature")
      ? logarithmicTimeBonus(
        elapsedSeconds,
        ACHIEVEMENT_EFFECT_CONFIG.goldenNatureExponentPerDoubling,
        ACHIEVEMENT_EFFECT_CONFIG.goldenNatureTimeScaleSeconds
      )
      : 0;
  }

  function greatLuoManaExponentBonus(elapsedSeconds = state.activeChallengeElapsedSeconds) {
    const inThreeCorpseChallenge = ["severEvilCorpse", "severGoodCorpse", "severSelfCorpse"]
      .includes(state.activeChallenge);
    return hasAchievement("greatLuo") && inThreeCorpseChallenge
      ? logarithmicTimeBonus(
        elapsedSeconds,
        ACHIEVEMENT_EFFECT_CONFIG.greatLuoManaExponentPerDoubling,
        ACHIEVEMENT_EFFECT_CONFIG.greatLuoTimeScaleSeconds
      )
      : 0;
  }

  function selfCorpseImmortalPowerLimitExponent(currentImmortalPower = state.immortalPower) {
    const config = IMMORTAL_POWER_CONFIG.daluo;
    const progress = toNumber(log10(
      add(ONE, div(maxBN(ZERO, currentImmortalPower), config.selfCorpseScale))
    ), Infinity);
    return 1 / (1 + config.selfCorpseCoefficient * progress);
  }

  function immortalPowerRegionExponent() {
    const registeredExponent = toNumber(WIS.Core.Effects.product("immortalPower", "regionExponent", state), 1);
    let challengeAdjustedExponent = registeredExponent;
    if (state.activeChallenge === "severSelfCorpse") {
      challengeAdjustedExponent *= selfCorpseImmortalPowerLimitExponent();
    }
    return challengeAdjustedExponent + goldenNatureImmortalPowerExponentBonus() + greatLuoManaExponentBonus();
  }

  function immortalPowerBeforeGoogolPenaltyPerSecond(currentMana = state.mana) {
    const gain = calculateRegionGain([immortalPowerBasePerSecond(currentMana)], {
      multipliers: [immortalPowerMultiplier()],
      exponents: [immortalPowerRegionExponent()]
    });
    return applyDaoTimeLaw(gain);
  }

  function immortalPowerPerSecond(currentMana = state.mana) {
    return applyGoogolPenalty(
      "immortalPower", state.immortalPower,
      immortalPowerBeforeGoogolPenaltyPerSecond(currentMana), state
    );
  }

  function immortalApertureCap() {
    if (state.ultimateImmortalApertureUnlocked) return IMMORTAL_APERTURE_CAP;
    if (state.immortalApertureVIIUnlocked) return 360;
    if (state.immortalApertureVIUnlocked) return 276;
    if (state.immortalApertureVUnlocked) return 192;
    if (state.immortalApertureIVUnlocked) return 108;
    if (state.immortalApertureIIIUnlocked) return 84;
    if (state.immortalApertureIIUnlocked) return 60;
    return IMMORTAL_APERTURE_CONFIG.baseCap;
  }

  function immortalApertureLevelMultiplier(level = state.immortalApertureLevel) {
    const safeLevel = Math.max(0, Math.min(IMMORTAL_APERTURE_CAP, Math.floor(Number(level) || 0)));
    const earlyLevels = Math.min(safeLevel, IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel);
    const lateLevels = Math.max(0, Math.min(
      safeLevel,
      IMMORTAL_APERTURE_CONFIG.ultimateRuleStartLevel
    ) - IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel);
    const ultimateLevels = Math.max(0, safeLevel - IMMORTAL_APERTURE_CONFIG.ultimateRuleStartLevel);
    return Math.pow(IMMORTAL_APERTURE_CONFIG.perLevelMultiplier, earlyLevels) *
      Math.pow(IMMORTAL_APERTURE_CONFIG.latePerLevelMultiplier, lateLevels) *
      Math.pow(IMMORTAL_APERTURE_CONFIG.ultimatePerLevelMultiplier, ultimateLevels);
  }

  function immortalApertureMilestoneMultiplier(level = state.immortalApertureLevel) {
    const safeLevel = Math.max(0, Math.min(IMMORTAL_APERTURE_CAP, Math.floor(Number(level) || 0)));
    const earlyLevels = Math.min(safeLevel, IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel);
    const lateLevels = Math.max(0, Math.min(
      safeLevel,
      IMMORTAL_APERTURE_CONFIG.ultimateRuleStartLevel
    ) - IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel);
    const ultimateLevels = Math.max(0, safeLevel - IMMORTAL_APERTURE_CONFIG.ultimateRuleStartLevel);
    return Math.pow(
      IMMORTAL_APERTURE_CONFIG.milestoneMultiplier,
      Math.floor(earlyLevels / IMMORTAL_APERTURE_CONFIG.milestoneInterval)
    ) * Math.pow(
      IMMORTAL_APERTURE_CONFIG.lateMilestoneMultiplier,
      Math.floor(lateLevels / IMMORTAL_APERTURE_CONFIG.lateMilestoneInterval)
    ) * Math.pow(
      IMMORTAL_APERTURE_CONFIG.ultimateMilestoneMultiplier,
      Math.floor(ultimateLevels / IMMORTAL_APERTURE_CONFIG.ultimateMilestoneInterval)
    );
  }

  function immortalApertureMultiplier(level = state.immortalApertureLevel) {
    return immortalApertureLevelMultiplier(level) * immortalApertureMilestoneMultiplier(level);
  }

  function lawImmortalPowerExponent() {
    let exponent = IMMORTAL_POWER_CONFIG.law.logExponent;
    if (state.threadsOfLawUnlocked) exponent *= IMMORTAL_POWER_CONFIG.law.upgradeExponentMultiplier;
    if (state.lawAffinityUnlocked) exponent *= IMMORTAL_POWER_CONFIG.law.upgradeExponentMultiplier;
    return exponent;
  }

  function lawImmortalPowerActualExponent(currentMana = state.mana) {
    const config = IMMORTAL_POWER_CONFIG.law;
    const progress = toNumber(log10(add(ONE, div(maxBN(ZERO, currentMana), config.manaScale))), Infinity);
    const decay = Math.pow(progress / config.decayScale, config.decayExponent);
    return config.limitingExponent +
      (lawImmortalPowerExponent() - config.limitingExponent) / (1 + decay);
  }

  function lawImmortalPowerMultiplier(currentMana = state.mana) {
    if (!state.lawUnlocked || state.activeChallenge === "severSelfCorpse") return 1;
    const progress = toNumber(log10(add(ONE, div(maxBN(ZERO, currentMana), IMMORTAL_POWER_CONFIG.law.manaScale))), Infinity);
    const multiplier = 1 + Math.pow(progress, lawImmortalPowerActualExponent(currentMana));
    const finalMultiplier = state.lawOriginUnlocked
      ? Math.pow(multiplier, IMMORTAL_POWER_CONFIG.daluo.lawOriginExponent)
      : multiplier;
    return daoAncestorActive() && state.daoLawUnityUnlocked
      ? Math.pow(finalMultiplier, DAO_ANCESTOR_CONFIG.lawMultiplierExponent)
      : finalMultiplier;
  }

  function trinityImmortalPowerMultiplier(
    currentJoules = WIS.Core.Effects.dynamicResourceValue(state, "joules")
  ) {
    if (!state.trinityUnlocked) return 1;
    const config = IMMORTAL_POWER_CONFIG.daluo;
    const magnitude = toNumber(log10(add(ONE, div(maxBN(ZERO, currentJoules), config.trinityJoulesScale))), Infinity);
    return 1 + Math.pow(magnitude, config.trinityExponent);
  }

  function unityWithDaoExponent(currentImmortalPower = state.immortalPower) {
    if (!state.unityWithDaoUnlocked) return 1;
    const config = IMMORTAL_POWER_CONFIG.daluo;
    const magnitude = toNumber(log10(add(
      ONE, div(maxBN(ZERO, currentImmortalPower), IMMORTAL_POWER_CONFIG.realmCosts.daluo)
    )), Infinity);
    return 1 + config.unityWithDaoMaximumBonus * magnitude / (magnitude + config.unityWithDaoSaturation);
  }

  function lawCrystalFilamentExponentFromMultiplier(lawMultiplier) {
    const config = IMMORTAL_POWER_CONFIG.daluo;
    const magnitude = toNumber(log10(maxBN(ONE, lawMultiplier)), Infinity);
    return 1 + config.lawCrystalMaximumBonus * magnitude / (magnitude + config.lawCrystalSaturation);
  }

  function lawCrystalFilamentDetails(currentMana = state.mana) {
    const lawMultiplier = lawImmortalPowerMultiplier(currentMana);
    const magnitude = toNumber(log10(maxBN(ONE, lawMultiplier)), Infinity);
    return Object.freeze({
      lawMultiplier,
      magnitude,
      exponent: lawCrystalFilamentExponentFromMultiplier(lawMultiplier),
      maximumExponent: 1 + IMMORTAL_POWER_CONFIG.daluo.lawCrystalMaximumBonus
    });
  }

  function lawCrystalFilamentPowerExponent(currentMana = state.mana) {
    return state.lawCrystalFilamentUnlocked ? lawCrystalFilamentDetails(currentMana).exponent : 1;
  }

  function spiritCaptureReturnMultiplier(currentImmortalPower = state.immortalPower) {
    if (!state.spiritCaptureReturnUnlocked) return 1;
    const config = IMMORTAL_POWER_CONFIG.spiritCaptureReturn;
    const numerator = toNumber(log10(add(ONE, div(maxBN(ZERO, currentImmortalPower), config.immortalPowerScale))), 0);
    const denominator = toNumber(log10(add(ONE, div(config.targetImmortalPower, config.immortalPowerScale))), 0);
    const progress = denominator > 0 ? Math.min(1, Math.max(0, numerator / denominator)) : 0;
    return Math.min(config.maximumMultiplier, Math.max(1, 1 + 2 * Math.pow(progress, config.exponent)));
  }

  function spiritDomainJSource(currentImmortalPower = state.immortalPower) {
    if (!immortalCultivationActive() || !state.spiritDomainUnlocked) return ZERO;
    const config = IMMORTAL_POWER_CONFIG.spiritDomain;
    const source = calculateSourceGain({
      base: mul(config.baseJoules, pow(
        add(ONE, div(maxBN(ZERO, currentImmortalPower), config.immortalPowerScale)),
        config.exponent
      )),
      multipliers: WIS.Core.Effects.values("spiritDomain", "sourceMultiplier", state)
    });
    return daoAncestorActive() && state.daoDomainUnlocked
      ? pow(source, daoDomainExponent(currentImmortalPower))
      : source;
  }

  function soulQualitativeChangeMultiplier(currentImmortalPower = state.immortalPower) {
    return state.soulQualitativeChangeUnlocked
      ? add(ONE, pow(
        div(maxBN(ZERO, currentImmortalPower), IMMORTAL_POWER_CONFIG.soulQualitativeChange.immortalPowerScale),
        IMMORTAL_POWER_CONFIG.soulQualitativeChange.exponent
      ))
      : 1;
  }

  function fiveElementsTreasureCount() {
    const count = Number(state.treasureImprints?.fiveElementsTreasure);
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  }

  function fiveElementsTreasureRawMultiplier() {
    return 1 + FIVE_ELEMENTS_TREASURE_CONFIG.perItemAdditive * fiveElementsTreasureCount();
  }

  function fiveElementsTreasureInternalExponent() {
    const count = fiveElementsTreasureCount();
    return FIVE_ELEMENTS_TREASURE_CONFIG.minimumInternalExponent +
      FIVE_ELEMENTS_TREASURE_CONFIG.internalExponentRange /
        (1 + count / FIVE_ELEMENTS_TREASURE_CONFIG.internalExponentScale);
  }

  function fiveElementsTreasureMultiplierBeforeDecline() {
    if (!state.fiveElementsTreasureUnlocked) return 1;
    return Math.pow(fiveElementsTreasureRawMultiplier(), fiveElementsTreasureInternalExponent());
  }

  function fiveElementsTreasureChance() {
    return Math.min(1,
      FIVE_ELEMENTS_TREASURE_CONFIG.baseChance *
      Math.pow(FIVE_ELEMENTS_TREASURE_CONFIG.chanceDecay, fiveElementsTreasureCount()) *
      immortalTreasureChanceMultiplier()
    );
  }

  function immortalCrystalCount() {
    const count = Number(state.treasureImprints?.immortalCrystal);
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  }

  function immortalCrystalChance(count = immortalCrystalCount()) {
    const currentCount = Math.max(0, Math.floor(Number(count) || 0));
    return Math.min(1, IMMORTAL_CRYSTAL_CONFIG.baseChance * Math.pow(
      1 + currentCount / IMMORTAL_CRYSTAL_CONFIG.decayScale,
      IMMORTAL_CRYSTAL_CONFIG.decayExponent
    ) * immortalTreasureChanceMultiplier());
  }

  function immortalCrystalIncrement(count = immortalCrystalCount()) {
    const currentCount = Math.max(0, Math.floor(Number(count) || 0));
    return IMMORTAL_CRYSTAL_CONFIG.perItemAdditive * Math.pow(
      1 + currentCount / IMMORTAL_CRYSTAL_CONFIG.decayScale,
      IMMORTAL_CRYSTAL_CONFIG.decayExponent
    );
  }

  // This prefix has a constant one-time cost; every larger count uses the O(1)
  // Euler-Maclaurin tail below instead of extending a cache one crystal at a time.
  const IMMORTAL_CRYSTAL_EXACT_SUM_LIMIT = 2048;
  let immortalCrystalExactPrefix = null;
  let cachedImmortalCrystalMultiplierCount = -1;
  let cachedImmortalCrystalMultiplierValue = 1;
  function immortalCrystalExactIncrementPrefix() {
    if (immortalCrystalExactPrefix) return immortalCrystalExactPrefix;
    immortalCrystalExactPrefix = [0];
    for (let index = 0; index < IMMORTAL_CRYSTAL_EXACT_SUM_LIMIT; index += 1) {
      immortalCrystalExactPrefix.push(
        immortalCrystalExactPrefix[index] +
        immortalCrystalIncrement(index) / IMMORTAL_CRYSTAL_CONFIG.perItemAdditive
      );
    }
    return immortalCrystalExactPrefix;
  }

  function immortalCrystalIncrementSum(start, end) {
    const lower = Math.max(0, Number(start) || 0);
    const upper = Math.max(lower, Number(end) || 0);
    if (!(upper > lower)) return 0;
    const scale = IMMORTAL_CRYSTAL_CONFIG.decayScale;
    const exponent = IMMORTAL_CRYSTAL_CONFIG.decayExponent;
    const normalized = (value, powerOffset = 0) =>
      Math.pow(1 + value / scale, exponent - powerOffset);
    const integral = exponent === -1
      ? scale * Math.log((scale + upper) / (scale + lower))
      : scale / (exponent + 1) *
        (Math.pow(1 + upper / scale, exponent + 1) - Math.pow(1 + lower / scale, exponent + 1));
    const endpointCorrection = (normalized(lower) - normalized(upper)) * 0.5;
    const firstDerivative = (value) => exponent / scale * normalized(value, 1);
    const thirdDerivative = (value) =>
      exponent * (exponent - 1) * (exponent - 2) /
      Math.pow(scale, 3) * normalized(value, 3);
    return Math.max(0,
      integral + endpointCorrection +
      (firstDerivative(upper) - firstDerivative(lower)) / 12 -
      (thirdDerivative(upper) - thirdDerivative(lower)) / 720
    );
  }

  function immortalCrystalMultiplier(count = immortalCrystalCount()) {
    const targetCount = Math.max(0, Math.floor(Number(count) || 0));
    if (targetCount === cachedImmortalCrystalMultiplierCount) return cachedImmortalCrystalMultiplierValue;
    const exactCount = Math.min(targetCount, IMMORTAL_CRYSTAL_EXACT_SUM_LIMIT);
    let incrementSum = immortalCrystalExactIncrementPrefix()[exactCount];
    if (targetCount > exactCount) {
      incrementSum += immortalCrystalIncrementSum(exactCount, targetCount);
    }
    cachedImmortalCrystalMultiplierCount = targetCount;
    cachedImmortalCrystalMultiplierValue = 1 + IMMORTAL_CRYSTAL_CONFIG.perItemAdditive * incrementSum;
    return cachedImmortalCrystalMultiplierValue;
  }

  function logarithmicRealmProgress(currentValue, startRequirement, endRequirement) {
    const start = BN(startRequirement);
    const end = BN(endRequirement);
    if (!gt(start, ZERO) || !gt(end, start)) return 0;
    const current = maxBN(start, currentValue);
    return Math.min(1, Math.max(0,
      toNumber(div(sub(log10(current), log10(start)), sub(log10(end), log10(start))), 0)
    ));
  }

  function celestialFiveDeclineBaseExponent(currentImmortalPower = state.immortalPower) {
    const level = Math.max(0, Math.floor(Number(state.advancedRealmLevel) || 0));
    const immortalPower = maxBN(ZERO, currentImmortalPower);
    const realmCosts = IMMORTAL_POWER_CONFIG.realmCosts;
    const goldenImmortalEndExponent = 1 - CELESTIAL_FIVE_DECLINES_CONFIG.goldenImmortalLoss;
    if (level === 7) {
      const progress = logarithmicRealmProgress(
        immortalPower,
        realmCosts.goldenImmortal,
        realmCosts.taiyi
      );
      return 1 - CELESTIAL_FIVE_DECLINES_CONFIG.goldenImmortalLoss * Math.sqrt(progress);
    }
    if (level === 8) {
      const progress = logarithmicRealmProgress(
        immortalPower,
        realmCosts.taiyi,
        realmCosts.daluo
      );
      return goldenImmortalEndExponent -
        CELESTIAL_FIVE_DECLINES_CONFIG.taiyiLoss * Math.sqrt(progress);
    }
    if (level === 9) {
      const progress = logarithmicRealmProgress(
        immortalPower,
        realmCosts.daluo,
        realmCosts.daoAncestor
      );
      return goldenImmortalEndExponent - CELESTIAL_FIVE_DECLINES_CONFIG.taiyiLoss -
        CELESTIAL_FIVE_DECLINES_CONFIG.daluoLoss * Math.sqrt(progress);
    }
    return 1;
  }

  function celestialFiveDeclineExponent(currentImmortalPower = state.immortalPower) {
    const base = celestialFiveDeclineBaseExponent(currentImmortalPower);
    return state.flawlessJadeBodyUnlocked
      ? 1 - (1 - base) * CELESTIAL_FIVE_DECLINES_CONFIG.flawlessJadeBodyReduction
      : base;
  }

  function applyCelestialFiveDeclineToMultiplier(multiplier, currentImmortalPower = state.immortalPower) {
    const value = BN(multiplier);
    if (isNaNBN(value) || !gt(value, ZERO)) return ONE;
    return pow(value, celestialFiveDeclineExponent(currentImmortalPower));
  }

  function nextImmortalPowerProgressBoundary(currentImmortalPower = state.immortalPower) {
    const requirement = nextImmortalPowerRealmCost();
    const current = maxBN(ZERO, currentImmortalPower);
    if (!isFiniteBN(requirement) || !gt(requirement, ZERO) || gte(current, requirement)) return null;
    const step = mul(requirement, IMMORTAL_POWER_REALM_PROGRESS_STEP);
    if (!isFiniteBN(step) || !gt(step, ZERO)) return null;
    const completedSteps = div(current, step).floor();
    let boundary = minBN(requirement, mul(add(completedSteps, ONE), step));
    if (!gt(boundary, current)) boundary = minBN(requirement, add(boundary, step));
    return isFiniteBN(boundary) && gt(boundary, current) ? boundary : null;
  }

  function celestialDeclineActive() {
    return immortalPowerUnlocked() && gt(nextImmortalPowerRealmCost(), ZERO);
  }

  function celestialDeclineExponent(currentImmortalPower = state.immortalPower) {
    // 道祖彻底超脱天人五衰；不是缓解，也不再让任何五衰标记效果参与四类资源结算。
    if (daoAncestorActive()) return 1;
    if (!celestialDeclineActive()) return 1;
    if (state.advancedRealmLevel >= 7) {
      return celestialFiveDeclineExponent(currentImmortalPower);
    }
    return 1 - 0.16 * Math.sqrt(immortalPowerProgressRatio(currentImmortalPower));
  }

  function applyCelestialDecline(gain, currentMana = state.mana, pressureGain = 0) {
    return applyImmortalPowerManaSuppression(gain);
  }

  function cultivationBottleneckManaMultiplier(currentMana = state.mana) {
    if (state.advancedRealmLevel >= IMMORTAL_POWER_CONFIG.unlockAdvancedRealmLevel) return 1;
    const requirement = manaProgressReferenceCost();
    return gt(requirement, ZERO) ? bottleneckManaMultiplier(requirement, true, currentMana) : 1;
  }

  function scatterRebuildManaMultiplier() {
    return additiveLevelMultiplier(effectiveScatterRebuildLevel(), 1.5);
  }

  function naturalTreasureRawManaMultiplier() {
    return (1 + state.naturalTreasureLevel * 0.1) * xuTianDingMultiplier();
  }

  function naturalTreasureManaDiminishingExponent() {
    return diminishingMultiplierExponent(
      naturalTreasureRawManaMultiplier(),
      TREASURE_MANA_DIMINISHING_CONFIG.naturalTreasureCoefficient
    );
  }

  function naturalTreasureManaMultiplier() {
    return applyDiminishingMultiplier(
      naturalTreasureRawManaMultiplier(),
      TREASURE_MANA_DIMINISHING_CONFIG.naturalTreasureCoefficient
    );
  }

  function naturalTreasureUpgradeChance() {
    if (state.naturalTreasureLevel >= naturalTreasureLevelCap()) return 0;
    if (state.naturalTreasureLevel >= 10) {
      return Math.min(1, 0.0005 * Math.pow(0.6, state.naturalTreasureLevel - 10));
    }
    return Math.min(1, 0.1 * Math.pow(0.65, state.naturalTreasureLevel));
  }

  function naturalTreasureLevelCap() {
    return (state.spiritWorldAscensionUnlocked ? 20 : 10) + mysticHeavenSacredTreeCount() * 2;
  }

  function xuTianDingCount() {
    return state.treasureImprints?.xuTianDing || 0;
  }

  function xuTianDingMultiplier() {
    return 1 + xuTianDingCount() * 0.005;
  }

  function xuTianDingChance() {
    return Math.min(1, 0.0002 * Math.pow(0.75, xuTianDingCount()) * immortalTreasureChanceMultiplier());
  }

  function wanYaoFanCount() {
    return state.treasureImprints?.wanYaoFan || 0;
  }

  function wanYaoFanMultiplier() {
    return WIS.Core.Effects.value("wanYaoFan", state);
  }

  function wanYaoFanChance() {
    return Math.min(1, 0.0001 * Math.pow(0.75, wanYaoFanCount()) * immortalTreasureChanceMultiplier());
  }

  function phantomHeavenMirrorCount() {
    return state.treasureImprints?.phantomHeavenMirror || 0;
  }

  function phantomHeavenMirrorChance() {
    return Math.min(1, 5e-12 * Math.pow(0.5, phantomHeavenMirrorCount()) * immortalTreasureChanceMultiplier());
  }

  function mysticHeavenSacredTreeCount() {
    return state.treasureImprints?.mysticHeavenSacredTree || 0;
  }

  function mysticHeavenSacredTreeChance() {
    return Math.min(1, 5e-14 * Math.pow(0.5, mysticHeavenSacredTreeCount()) * immortalTreasureChanceMultiplier());
  }

  function mysticHeavenSpiritSlayingSwordCount() {
    return state.treasureImprints?.mysticHeavenSpiritSlayingSword || 0;
  }

  function mysticHeavenSpiritSlayingSwordChance() {
    return Math.min(1, 1e-12 * Math.pow(0.6, mysticHeavenSpiritSlayingSwordCount()) * immortalTreasureChanceMultiplier());
  }

  function mysticHeavenSpiritSlayingSwordExponent() {
    return 1 + 0.23 * Math.log10(1 + mysticHeavenSpiritSlayingSwordCount() / 20);
  }

  function tianNiPearlCount() {
    return state.treasureImprints?.tianNiPearl || 0;
  }

  function tianNiPearlRawManaMultiplier() {
    return 1 + tianNiPearlCount() * 0.005;
  }

  function tianNiPearlManaDiminishingExponent() {
    return diminishingMultiplierExponent(
      tianNiPearlRawManaMultiplier(),
      TREASURE_MANA_DIMINISHING_CONFIG.tianNiPearlCoefficient
    );
  }

  function tianNiPearlManaMultiplier() {
    return applyDiminishingMultiplier(
      tianNiPearlRawManaMultiplier(),
      TREASURE_MANA_DIMINISHING_CONFIG.tianNiPearlCoefficient
    );
  }

  function tianNiPearlChance() {
    return Math.min(1, 0.01 * Math.pow(0.99, tianNiPearlCount()) * immortalTreasureChanceMultiplier());
  }

  function mysteriousGreenBottleCount() {
    return state.treasureImprints?.mysteriousGreenBottle || 0;
  }

  function mysteriousGreenBottleMultiplier() {
    return WIS.Core.Effects.value("mysteriousGreenBottle", state);
  }

  function mysteriousGreenBottleChance() {
    return Math.min(1, 0.02 * Math.pow(0.85, mysteriousGreenBottleCount()) * immortalTreasureChanceMultiplier());
  }

  function fuBaoCount() {
    return state.treasureImprints?.fuBao || 0;
  }

  function fuBaoChance() {
    return Math.min(1, 0.02 * Math.pow(0.7, fuBaoCount()) * immortalTreasureChanceMultiplier());
  }

  function fuBaoManaRatio() {
    return fuBaoCount() * 0.002;
  }

  function fuBaoExplorationManaBonus(powerCost, explorationAmount = explorationAmountForCost(powerCost)) {
    return mul(mul(EXPLORATION_BASE_MANA, explorationManaAmount(explorationAmount)), fuBaoManaRatio());
  }

  function formatProbability(probability) {
    const percent = probability * 100;
    if (percent >= 0.01) return `${percent.toFixed(2)}%`;
    if (percent >= 0.0001) return `${percent.toFixed(4)}%`;
    return `${percent.toExponential(2)}%`;
  }

  function joulesForNextBaseMana() {
    const nextBaseMana = add(baseBreathingManaGain(), ONE);
    const { base } = breathingRealmConfig();
    const curveTarget = pow(div(nextBaseMana, mul(base, breathingManaDecayMultiplier())), 1 / breathingJCurveExponent());
    return maxBN(3000, mul(3000, pow10(sub(curveTarget, ONE)))).ceil();
  }

  function automaticBaseManaSources(currentMana = state.mana) {
    if (!immortalCultivationActive() || !state.qiRefiningUnlocked) return [];
    const sourceGains = [];
    const circulationSource = circulationManaSource(currentMana);
    if (gt(circulationSource, ZERO)) sourceGains.push(circulationSource);
    if (hasAchievement("refineTheVoid")) sourceGains.push(1);
    return sourceGains;
  }

  function automaticBaseManaBeforeSuppressionPerSecond(currentMana = state.mana) {
    const sourceGains = automaticBaseManaSources(currentMana);
    return sourceGains.length > 0
      ? finalManaGainFromSources(sourceGains, currentMana, [], false)
      : ZERO;
  }

  function automaticBaseManaPerSecond(currentMana = state.mana) {
    return applyImmortalPowerManaSuppression(
      automaticBaseManaBeforeSuppressionPerSecond(currentMana)
    );
  }

  function automaticExplorationContext({ cache = true } = {}) {
    const powerCost = explorationPowerCost();
    if (!state.roamSpiritWorldUnlocked || !state.goldenCoreUnlocked || lt(powerCost, EXPLORATION_MINIMUM_POWER_COST)) return null;
    const fullExplorationAmount = explorationAmountForCost(powerCost, { cache });
    const explorationAmountPerSecond = mul(fullExplorationAmount, AUTOMATIC_EXPLORATION_EFFICIENCY);
    return gt(explorationAmountPerSecond, ZERO)
      ? { powerCost, fullExplorationAmount, explorationAmountPerSecond }
      : null;
  }

  function automaticExplorationAmountPerSecond() {
    return automaticExplorationContext()?.explorationAmountPerSecond || ZERO;
  }

  function nextManaProgressBoundary(currentMana = state.mana) {
    const current = maxBN(ZERO, currentMana);
    if (state.advancedRealmLevel >= IMMORTAL_POWER_CONFIG.unlockAdvancedRealmLevel) {
      const reference = maxBN(current, IMMORTAL_POWER_CONFIG.manaScale);
      const boundary = add(current, mul(reference, MANA_REALM_PROGRESS_STEP));
      return isFiniteBN(boundary) && gt(boundary, current) ? boundary : null;
    }
    const requirement = manaProgressReferenceCost();
    if (!isFiniteBN(requirement) || !gt(requirement, ZERO)) return null;
    const step = mul(requirement, MANA_REALM_PROGRESS_STEP);
    if (!isFiniteBN(step) || !gt(step, ZERO)) return null;
    const completedSteps = Math.floor(toNumber(div(current, step), 0) + 1e-10);
    let boundary = mul(completedSteps + 1, step);
    const tolerance = maxBN(mul(maxBN(ONE, current), Number.EPSILON * 8), mul(step, 1e-12));
    if (!gt(boundary, add(current, tolerance))) boundary = add(boundary, step);
    return isFiniteBN(boundary) && gt(boundary, current) ? boundary : null;
  }

  function normalizeManaEvaluation(value) {
    const detail = value && typeof value === "object" && !WIS.Core.BigNum.isDecimal(value) ? value : { mana: value };
    const gain = maxBN(ZERO, detail.mana);
    return {
      detail,
      mana: isNaNBN(gain) || !isFiniteBN(gain) ? ZERO : gain
    };
  }

  function averageLinearManaEvaluations(startEvaluation, endEvaluation) {
    const mana = mul(add(startEvaluation.mana, endEvaluation.mana), 0.5);
    const startDetail = startEvaluation.detail;
    const endDetail = endEvaluation.detail;
    if (!startDetail || !endDetail || WIS.Core.BigNum.isDecimal(startDetail) || WIS.Core.BigNum.isDecimal(endDetail)) {
      return { detail: mana, mana };
    }
    return {
      detail: {
        ...startDetail,
        mana,
        passiveMana: mul(add(
          maxBN(ZERO, startDetail.passiveMana),
          maxBN(ZERO, endDetail.passiveMana)
        ), 0.5),
        explorationMana: mul(add(
          maxBN(ZERO, startDetail.explorationMana),
          maxBN(ZERO, endDetail.explorationMana)
        ), 0.5)
      },
      mana
    };
  }

  function settleManaGainProgressive(
    totalBudget,
    calculateGain,
    commitBudget = () => {},
    applyToState = true,
    linearBudget = false,
    maximumBudgetForSegment = (_currentMana, remainingBudget) => remainingBudget
  ) {
    const budget = Math.max(0, Number(totalBudget) || 0);
    if (!(budget > 0) || typeof calculateGain !== "function") {
      return { mana: ZERO, budgetUsed: 0, segments: 0, capped: false };
    }

    let remainingBudget = budget;
    let totalMana = ZERO;
    let segments = 0;
    let currentMana = maxBN(ZERO, state.mana);
    const budgetTolerance = Math.max(Number.EPSILON * budget * 16, 1e-12);

    const evaluate = (segmentBudget, currentMana) => normalizeManaEvaluation(
      calculateGain(segmentBudget, currentMana)
    );
    const commit = (segmentBudget, appliedMana, evaluation, segmentCurrentMana) => {
      if (applyToState && gt(appliedMana, ZERO)) {
        WIS.Core.Resources.addSystem("immortal", "mana", appliedMana);
      }
      commitBudget(segmentBudget, appliedMana, evaluation.detail, segmentCurrentMana);
      totalMana = add(totalMana, appliedMana);
      currentMana = add(currentMana, appliedMana);
      remainingBudget = Math.max(0, remainingBudget - segmentBudget);
      segments += 1;
    };

    while (remainingBudget > budgetTolerance && segments < MANA_PROGRESSIVE_MAX_SEGMENTS) {
      const segmentCurrentMana = currentMana;
      const remainingSegmentSlots = Math.max(1, MANA_PROGRESSIVE_MAX_SEGMENTS - segments);
      const requestedMaximum = Number(maximumBudgetForSegment(
        segmentCurrentMana,
        remainingBudget,
        remainingSegmentSlots
      ));
      const segmentBudget = requestedMaximum > 0 && Number.isFinite(requestedMaximum)
        ? Math.min(remainingBudget, Math.max(budgetTolerance, requestedMaximum))
        : remainingBudget;
      const fullEvaluation = evaluate(segmentBudget, segmentCurrentMana);
      const segmentEvaluation = linearBudget && gt(fullEvaluation.mana, ZERO)
        ? averageLinearManaEvaluations(
          fullEvaluation,
          evaluate(segmentBudget, add(segmentCurrentMana, fullEvaluation.mana))
        )
        : fullEvaluation;
      let boundary = nextManaProgressBoundary(segmentCurrentMana);
      let neededMana = boundary ? sub(boundary, segmentCurrentMana) : ZERO;
      let gainTolerance = boundary
        ? maxBN(mul(maxBN(ONE, boundary), Number.EPSILON * 16), "1e-12")
        : ZERO;

      if (linearBudget && boundary && gt(segmentEvaluation.mana, add(neededMana, gainTolerance))) {
        const startReference = maxBN(ONE, segmentCurrentMana);
        const projectedMana = add(segmentCurrentMana, segmentEvaluation.mana);
        const startMagnitude = log10(startReference);
        const projectedMagnitude = log10(maxBN(startReference, projectedMana));
        const magnitudeSpan = maxBN(ZERO, sub(projectedMagnitude, startMagnitude));
        const estimatedSegments = toNumber(div(magnitudeSpan, Math.log10(1 + MANA_REALM_PROGRESS_STEP)), Infinity);
        if (!Number.isFinite(estimatedSegments) || estimatedSegments > remainingSegmentSlots) {
          const adaptiveBoundary = pow10(add(
            startMagnitude,
            div(magnitudeSpan, remainingSegmentSlots)
          ));
          const adaptiveNeededMana = sub(adaptiveBoundary, segmentCurrentMana);
          if (gt(adaptiveNeededMana, neededMana)) {
            neededMana = adaptiveNeededMana;
            boundary = add(segmentCurrentMana, neededMana);
            gainTolerance = maxBN(mul(maxBN(ONE, boundary), Number.EPSILON * 16), "1e-12");
          }
        }
      }

      if (!gt(segmentEvaluation.mana, ZERO) || !boundary ||
          lte(segmentEvaluation.mana, add(neededMana, gainTolerance))) {
        commit(segmentBudget, segmentEvaluation.mana, segmentEvaluation, segmentCurrentMana);
        continue;
      }

      let lowerBudget = 0;
      let upperBudget = segmentBudget;
      let upperEvaluation = segmentEvaluation;
      if (linearBudget) {
        upperBudget = segmentBudget * toNumber(div(neededMana, segmentEvaluation.mana), 1);
      } else {
        for (let iteration = 0; iteration < 48; iteration += 1) {
          const middleBudget = (lowerBudget + upperBudget) / 2;
          const middleEvaluation = evaluate(middleBudget, segmentCurrentMana);
          if (gte(middleEvaluation.mana, neededMana)) {
            upperBudget = middleBudget;
            upperEvaluation = middleEvaluation;
          } else {
            lowerBudget = middleBudget;
          }
        }
      }

      if (!(upperBudget > 0) || upperBudget >= segmentBudget) {
        commit(segmentBudget, segmentEvaluation.mana, segmentEvaluation, segmentCurrentMana);
        continue;
      }
      commit(upperBudget, neededMana, upperEvaluation, segmentCurrentMana);
    }

    const capped = remainingBudget > budgetTolerance;
    if (capped) {
      const fallbackEvaluation = evaluate(remainingBudget, currentMana);
      commit(remainingBudget, fallbackEvaluation.mana, fallbackEvaluation, currentMana);
    }
    return { mana: totalMana, budgetUsed: budget - remainingBudget, segments, capped };
  }

  function applyManaGainProgressive(
    totalBudget,
    calculateGain,
    commitBudget = () => {},
    { linearBudget = false, maximumBudgetForSegment } = {}
  ) {
    return settleManaGainProgressive(
      totalBudget,
      calculateGain,
      commitBudget,
      true,
      linearBudget,
      maximumBudgetForSegment
    );
  }

  function previewManaGainProgressive(totalBudget, calculateGain, { linearBudget = false } = {}) {
    return settleManaGainProgressive(totalBudget, calculateGain, () => {}, false, linearBudget);
  }

  function breathingManaGainProgressive() {
    const currentGain = breathingManaGain();
    if (lt(currentGain, ONE)) return currentGain;
    return previewManaGainProgressive(
      1,
      (actionFraction, currentMana) => mul(breathingManaGain(currentMana), actionFraction),
      { linearBudget: true }
    ).mana;
  }

  function explorationManaGainProgressive(
    powerCost = explorationPowerCost(),
    explorationAmount = explorationAmountForCost(powerCost),
    tribulationExponent = minorTribulationPreviewForExploration(explorationAmount).manaExponent
  ) {
    if (!immortalCultivationActive() || !state.goldenCoreUnlocked ||
        lt(powerCost, EXPLORATION_MINIMUM_POWER_COST)) return ZERO;
    return previewManaGainProgressive(
      1,
      (actionFraction, currentMana) => mul(explorationPotentialManaGain(
        powerCost,
        currentMana,
        tribulationExponent,
        explorationAmount,
        true
      ), actionFraction),
      { linearBudget: true }
    ).mana;
  }

  function integratePowerCurve(start, end, exponent) {
    if (!(end > start)) return 0;
    if (Math.abs(exponent - 1) < 1e-10) return Math.log(end / start);
    return (Math.pow(end, 1 - exponent) - Math.pow(start, 1 - exponent)) / (1 - exponent);
  }

  function integrateAutomaticExplorationManaByLoad(preTribulationMana, fullExplorationAmountNumber, startLoad, endLoad) {
    if (!(endLoad > startLoad) || !gt(preTribulationMana, ZERO)) return ZERO;
    const triggerLoad = minorTribulationTriggerLoad();
    const baseExponent = minorTribulationExplorationBaseExponent();
    const minimumExponent = minorTribulationExplorationMinimumExponent();
    const decayCoefficient = minorTribulationExplorationDecayCoefficient();
    const triggerBoundary = Math.max(0, Math.min(triggerLoad, triggerLoad - fullExplorationAmountNumber));
    const minimumBoundary = Math.max(triggerBoundary, Math.min(
      triggerLoad,
      triggerLoad * (Math.pow(10, (baseExponent - minimumExponent) / decayCoefficient) - 1)
        - fullExplorationAmountNumber
    ));
    let integratedMana = ZERO;

    const untriggeredEnd = Math.min(endLoad, triggerBoundary);
    if (untriggeredEnd > startLoad) {
      integratedMana = add(integratedMana, mul(pow(preTribulationMana, baseExponent), untriggeredEnd - startLoad));
    }

    const dynamicStart = Math.max(startLoad, triggerBoundary);
    const dynamicEnd = Math.min(endLoad, minimumBoundary);
    if (dynamicEnd > dynamicStart) {
      const curveExponent = decayCoefficient * toNumber(log10(preTribulationMana), Infinity);
      const curveStart = 1 + (dynamicStart + fullExplorationAmountNumber) / triggerLoad;
      const curveEnd = 1 + (dynamicEnd + fullExplorationAmountNumber) / triggerLoad;
      integratedMana = add(integratedMana, mul(
        mul(pow(preTribulationMana, baseExponent), triggerLoad),
        integratePowerCurve(curveStart, curveEnd, curveExponent)
      ));
    }

    const minimumStart = Math.max(startLoad, minimumBoundary);
    if (endLoad > minimumStart) {
      integratedMana = add(integratedMana, mul(pow(preTribulationMana, minimumExponent), endLoad - minimumStart));
    }
    return integratedMana;
  }

  function integratedAutomaticExplorationMana(
    preTribulationMana,
    fullExplorationAmount,
    elapsedSeconds,
    currentMana = state.mana,
    powerCost = explorationPowerCost(),
    currentExplorationLoad = state.minorTribulationExplorationLoad
  ) {
    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    if (!(elapsed > 0) || !gt(fullExplorationAmount, ZERO) || !gt(preTribulationMana, ZERO)) return ZERO;
    if (state.advancedRealmLevel < 2 || state.advancedRealmLevel >= 6) {
      return mul(preTribulationMana, AUTOMATIC_EXPLORATION_EFFICIENCY * elapsed);
    }

    const triggerLoad = minorTribulationTriggerLoad();
    // 小天劫负荷是 Number 控制量；超出 Number 范围时走下方 Decimal 安全回退，不截断资源。
    const fullExplorationAmountNumber = toNumber(fullExplorationAmount, Infinity);
    const explorationLoad = fullExplorationAmountNumber * AUTOMATIC_EXPLORATION_EFFICIENCY * elapsed;
    if (!Number.isFinite(triggerLoad) || !(triggerLoad > 0) ||
        !Number.isFinite(fullExplorationAmountNumber) || !Number.isFinite(explorationLoad) ||
        !isFiniteBN(preTribulationMana)) {
      const preview = minorTribulationPreviewForExploration(fullExplorationAmount, currentExplorationLoad);
      return mul(explorationPotentialManaGain(
        powerCost,
        currentMana,
        preview.manaExponent,
        fullExplorationAmount
      ), AUTOMATIC_EXPLORATION_EFFICIENCY * elapsed);
    }

    const startLoad = Math.max(0, Number(currentExplorationLoad) || 0) % triggerLoad;
    let remainingLoad = explorationLoad;
    let integratedByLoad = ZERO;
    const firstCycleLoad = Math.min(remainingLoad, triggerLoad - startLoad);
    integratedByLoad = add(integratedByLoad, integrateAutomaticExplorationManaByLoad(
      preTribulationMana,
      fullExplorationAmountNumber,
      startLoad,
      startLoad + firstCycleLoad
    ));
    remainingLoad -= firstCycleLoad;

    if (remainingLoad > 0) {
      const fullCycles = Math.floor(remainingLoad / triggerLoad);
      if (fullCycles > 0) {
        integratedByLoad = add(integratedByLoad, mul(fullCycles, integrateAutomaticExplorationManaByLoad(
          preTribulationMana,
          fullExplorationAmountNumber,
          0,
          triggerLoad
        )));
        remainingLoad -= fullCycles * triggerLoad;
      }
      if (remainingLoad > 0) {
        integratedByLoad = add(integratedByLoad, integrateAutomaticExplorationManaByLoad(
          preTribulationMana,
          fullExplorationAmountNumber,
          0,
          remainingLoad
        ));
      }
    }
    return div(integratedByLoad, fullExplorationAmountNumber);
  }

  function automaticManaComponentsBeforeGoogol(
    elapsedSeconds,
    currentMana = state.mana,
    context = automaticExplorationContext(),
    currentExplorationLoad = state.minorTribulationExplorationLoad
  ) {
    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const passiveMana = mul(automaticBaseManaPerSecond(currentMana), elapsed);
    if (!(elapsed > 0) || !context) {
      return { mana: passiveMana, passiveMana, explorationMana: ZERO };
    }
    const { powerCost, fullExplorationAmount } = context;
    const preTribulationMana = explorationPotentialManaGain(
      powerCost,
      currentMana,
      1,
      fullExplorationAmount
    );
    const explorationMana = integratedAutomaticExplorationMana(
      preTribulationMana,
      fullExplorationAmount,
      elapsed,
      currentMana,
      powerCost,
      currentExplorationLoad
    );
    return { mana: add(passiveMana, explorationMana), passiveMana, explorationMana };
  }

  function automaticManaComponents(
    elapsedSeconds,
    currentMana = state.mana,
    context = automaticExplorationContext(),
    currentExplorationLoad = state.minorTribulationExplorationLoad
  ) {
    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const raw = automaticManaComponentsBeforeGoogol(
      elapsed, currentMana, context, currentExplorationLoad
    );
    if (!(elapsed > 0) || !gt(raw.mana, ZERO)) return raw;
    const integrated = WIS.Core.Integration.integrateGoogolPenalizedRate(
      "mana", currentMana, div(raw.mana, elapsed), elapsed, state
    );
    const scale = div(integrated.gain, raw.mana);
    return {
      mana: integrated.gain,
      passiveMana: mul(raw.passiveMana, scale),
      explorationMana: mul(raw.explorationMana, scale)
    };
  }

  function emptyExplorationRewards() {
    return {
      attempts: ZERO, tianNiPearl: 0, greenBottle: 0, fuBao: 0, naturalTreasure: 0,
      xuTianDing: 0, wanYaoFan: 0, phantomHeavenMirror: 0,
      mysticHeavenSacredTree: 0, mysticHeavenSpiritSlayingSword: 0,
      seizeFoundation: 0
    };
  }

  function withCoupledResourceState(currentMana, currentImmortalPower, callback) {
    const previousMana = state.mana;
    const previousImmortalPower = state.immortalPower;
    state.mana = maxBN(ZERO, currentMana);
    state.immortalPower = maxBN(ZERO, currentImmortalPower);
    try {
      return WIS.Core.Effects.withState(state, callback);
    } finally {
      state.mana = previousMana;
      state.immortalPower = previousImmortalPower;
    }
  }

  function nextAutomaticGainEvent(current, remainingSeconds, rate) {
    if (!(remainingSeconds > 0)) return null;
    let selected = null;
    const considerBoundary = (type, resource, boundary, boundarySeconds) => {
      if (!(boundarySeconds >= 0) || !Number.isFinite(boundarySeconds)) return;
      if (boundarySeconds > remainingSeconds) return;
      const tolerance = Math.max(Number.EPSILON * Math.max(1, remainingSeconds), 1e-15);
      if (selected && boundarySeconds > selected.seconds + tolerance) return;
      selected = {
        type,
        resource,
        boundary,
        seconds: Math.max(0, boundarySeconds),
        instantaneous: boundarySeconds < EVENT_TIME_EPSILON,
        requiresGlobalReplan: true
      };
    };
    const immortalRequirement = nextImmortalPowerRealmCost();
    const declineActive = celestialDeclineActive();
    const immortalBoundary = declineActive
      ? nextImmortalPowerProgressBoundary(current.immortalPower)
      : immortalRequirement;
    if (immortalBoundary && gt(immortalBoundary, current.immortalPower) && gt(rate.immortalPower, ZERO)) {
      const boundarySeconds = toNumber(
        div(sub(immortalBoundary, current.immortalPower), rate.immortalPower),
        Infinity
      );
      const reachesRealm = !declineActive ||
        (gt(immortalRequirement, ZERO) && gte(immortalBoundary, immortalRequirement));
      considerBoundary(
        reachesRealm ? "immortalRealmRequirement" : "celestialDeclineProgress",
        "immortalPower",
        immortalBoundary,
        boundarySeconds
      );
    }
    if (!qiRefiningChallengeActive() &&
        state.advancedRealmLevel < IMMORTAL_POWER_CONFIG.unlockAdvancedRealmLevel) {
      const manaBoundary = manaProgressReferenceCost();
      if (gt(manaBoundary, current.mana) && gt(rate.mana, ZERO)) {
        const boundarySeconds = toNumber(div(sub(manaBoundary, current.mana), rate.mana), Infinity);
        considerBoundary("manaRealmRequirement", "mana", manaBoundary, boundarySeconds);
      }
    }
    if (gt(GOOGOL_PENALTY_THRESHOLD, current.mana) && gt(rate.mana, ZERO)) {
      considerBoundary("googolPenaltyThreshold", "mana", GOOGOL_PENALTY_THRESHOLD,
        toNumber(div(sub(GOOGOL_PENALTY_THRESHOLD, current.mana), rate.mana), Infinity));
    }
    if (gt(GOOGOL_PENALTY_THRESHOLD, current.immortalPower) && gt(rate.immortalPower, ZERO)) {
      considerBoundary("googolPenaltyThreshold", "immortalPower", GOOGOL_PENALTY_THRESHOLD,
        toNumber(div(sub(GOOGOL_PENALTY_THRESHOLD, current.immortalPower), rate.immortalPower), Infinity));
    }
    return selected;
  }

  function planAutomaticManaGain(elapsedSeconds = 1, projectedContext = {}) {
    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const context = projectedContext.explorationContext ?? automaticExplorationContext({ cache: false });
    let passiveMana = ZERO;
    let explorationMana = ZERO;
    let explorationAmount = ZERO;
    let immortalPower = ZERO;
    let immortalPowerActiveSeconds = 0;
    let currentExplorationLoad = state.minorTribulationExplorationLoad;

    let rateEvaluations = 0;
    const evaluate = (currentMana, currentImmortalPower, explorationLoad) => {
      rateEvaluations += 1;
      return withCoupledResourceState(currentMana, currentImmortalPower, () => {
        const manaDetail = automaticManaComponentsBeforeGoogol(1, currentMana, context, explorationLoad);
        const immortalPowerBase = maxBN(ZERO, immortalPowerBeforeGoogolPenaltyPerSecond(currentMana));
        return {
          manaBase: maxBN(ZERO, manaDetail.mana),
          passiveManaBase: maxBN(ZERO, manaDetail.passiveMana),
          explorationManaBase: maxBN(ZERO, manaDetail.explorationMana),
          immortalPowerBase,
          mana: applyGoogolPenalty("mana", currentMana, manaDetail.mana, state),
          immortalPower: applyGoogolPenalty(
            "immortalPower", currentImmortalPower, immortalPowerBase, state
          )
        };
      });
    };
    let current = {
      mana: maxBN(ZERO, state.mana),
      immortalPower: maxBN(ZERO, state.immortalPower),
      explorationLoad: currentExplorationLoad
    };
    const rate = evaluate(current.mana, current.immortalPower, current.explorationLoad);
    const event = nextAutomaticGainEvent(current, elapsed, rate);
    if (event?.instantaneous) {
      return {
        completed: false,
        elapsedSeconds: elapsed,
        processedSeconds: 0,
        remainingSeconds: elapsed,
        finalMana: current.mana,
        finalImmortalPower: current.immortalPower,
        finalExplorationLoad: currentExplorationLoad,
        passiveManaGain: ZERO,
        explorationManaGain: ZERO,
        immortalPowerGain: ZERO,
        explorationAmount: ZERO,
        immortalPowerActiveSeconds: 0,
        rateEvaluations,
        segments: 0,
        event,
        instantEvent: event,
        mana: ZERO,
        passiveMana: ZERO,
        explorationMana: ZERO,
        immortalPower: ZERO
      };
    }

    const step = event ? event.seconds : elapsed;
    if (!(step > 0) || !Number.isFinite(step)) {
      return {
        completed: false,
        elapsedSeconds: elapsed,
        processedSeconds: 0,
        remainingSeconds: elapsed,
        finalMana: current.mana,
        finalImmortalPower: current.immortalPower,
        finalExplorationLoad: currentExplorationLoad,
        passiveManaGain: ZERO,
        explorationManaGain: ZERO,
        immortalPowerGain: ZERO,
        explorationAmount: ZERO,
        immortalPowerActiveSeconds: 0,
        rateEvaluations,
        segments: 0,
        event: null,
        mana: ZERO,
        passiveMana: ZERO,
        explorationMana: ZERO,
        immortalPower: ZERO
      };
    }

    const manaIntegration = WIS.Core.Integration.integrateGoogolPenalizedRate(
      "mana", current.mana, rate.manaBase, step, state
    );
    const immortalPowerIntegration = WIS.Core.Integration.integrateGoogolPenalizedRate(
      "immortalPower", current.immortalPower, rate.immortalPowerBase, step, state
    );
    let finalMana = add(current.mana, manaIntegration.gain);
    let finalImmortalPower = add(current.immortalPower, immortalPowerIntegration.gain);
    if (event?.resource === "mana") finalMana = event.boundary;
    if (event?.resource === "immortalPower") finalImmortalPower = event.boundary;
    if (!isFiniteBN(finalMana) || !isFiniteBN(finalImmortalPower) ||
        isNaNBN(finalMana) || isNaNBN(finalImmortalPower)) {
      return {
        completed: false,
        elapsedSeconds: elapsed,
        processedSeconds: 0,
        remainingSeconds: elapsed,
        finalMana: current.mana,
        finalImmortalPower: current.immortalPower,
        finalExplorationLoad: currentExplorationLoad,
        passiveManaGain: ZERO,
        explorationManaGain: ZERO,
        immortalPowerGain: ZERO,
        explorationAmount: ZERO,
        immortalPowerActiveSeconds: 0,
        rateEvaluations,
        segments: 0,
        event: null,
        mana: ZERO,
        passiveMana: ZERO,
        explorationMana: ZERO,
        immortalPower: ZERO
      };
    }
    const stepExplorationAmount = context ? mul(context.explorationAmountPerSecond, step) : ZERO;
    const finalLoad = context
      ? minorTribulationPreviewForExploration(stepExplorationAmount, current.explorationLoad).remainingLoad
      : current.explorationLoad;
    const manaGain = maxBN(ZERO, manaIntegration.gain);
    const immortalPowerGain = maxBN(ZERO, immortalPowerIntegration.gain);
    const unpenalizedManaGain = mul(rate.manaBase, step);
    const manaPenaltyScale = gt(unpenalizedManaGain, ZERO)
      ? div(manaGain, unpenalizedManaGain)
      : ZERO;
    passiveMana = mul(mul(rate.passiveManaBase, step), manaPenaltyScale);
    explorationMana = mul(mul(rate.explorationManaBase, step), manaPenaltyScale);
    immortalPower = immortalPowerGain;
    immortalPowerActiveSeconds = gt(immortalPowerGain, ZERO) ? step : 0;
    explorationAmount = context ? stepExplorationAmount : ZERO;
    currentExplorationLoad = finalLoad;
    current = { mana: finalMana, immortalPower: finalImmortalPower, explorationLoad: finalLoad };
    const remaining = Math.max(0, elapsed - step);

    const completed = remaining === 0;
    const processedSeconds = Math.max(0, elapsed - remaining);
    return {
      completed,
      elapsedSeconds: elapsed,
      processedSeconds,
      remainingSeconds: remaining,
      finalMana: current.mana,
      finalImmortalPower: current.immortalPower,
      finalExplorationLoad: currentExplorationLoad,
      passiveManaGain: passiveMana,
      explorationManaGain: explorationMana,
      immortalPowerGain: immortalPower,
      explorationAmount,
      immortalPowerActiveSeconds,
      rateEvaluations,
      segments: 1,
      event,
      mana: manaGain,
      passiveMana,
      explorationMana,
      immortalPower
    };
  }

  function commitAutomaticManaGain(plan) {
    const rewards = emptyExplorationRewards();
    if (plan?.instantEvent) {
      const { resource, boundary } = plan.instantEvent;
      const current = state[resource];
      const eventCommitted = resource && boundary && !eq(current, boundary);
      if (eventCommitted) {
        WIS.Core.Resources.setSystem("immortal", resource, boundary);
        WIS.Core.Effects.invalidate();
      }
      return { ...plan, rewards, tribulationTriggered: false, eventCommitted };
    }
    if (!plan?.completed) return { ...plan, rewards, tribulationTriggered: false };
    WIS.Core.Resources.accumulateSystemResourceGain("immortal", "mana", plan.mana);
    WIS.Core.Resources.accumulateSystemResourceGain("immortal", "immortalPower", plan.immortalPower);
    if (plan.event?.resource && plan.event?.boundary) {
      WIS.Core.Resources.setSystem("immortal", plan.event.resource, plan.event.boundary);
    }

    let tribulationTriggered = false;
    if (gt(plan.explorationAmount, ZERO)) {
      const aggregatedRewards = processExplorationJudgements(addExplorationProgress(plan.explorationAmount));
      rewards.attempts = aggregatedRewards.attempts;
      Object.keys(rewards).filter((key) => key !== "attempts")
        .forEach((key) => { rewards[key] = Number(aggregatedRewards[key]) || 0; });
      tribulationTriggered = registerSuccessfulExploration(plan.explorationAmount);
      state.minorTribulationExplorationLoad = plan.finalExplorationLoad;
    }
    return {
      ...plan,
      rewards,
      tribulationTriggered,
      eventCommitted: Boolean(plan.event?.requiresGlobalReplan)
    };
  }

  function automaticManaGainProgressive(elapsedSeconds = 1, options = {}) {
    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const projection = WIS.Core.State.fromFlat(WIS.Core.State.toFlat(runtime.getState()));
    const plan = runtime.withState(projection, () => WIS.Core.Effects.withIsolatedState(
      projection,
      () => ({ ...planAutomaticManaGain(elapsed, options), elapsedSeconds: elapsed })
    ));
    if (plan.instantEvent) return commitAutomaticManaGain(plan);
    if (!(plan.processedSeconds > 0)) {
      return {
        ...plan,
        rewards: emptyExplorationRewards(),
        tribulationTriggered: false
      };
    }
    return commitAutomaticManaGain(plan);
  }

  // 兼容旧调用名；自动收益现按固定快照步结算。
  function automaticExplorationManaGain(elapsedSeconds = 1) {
    return automaticManaGainProgressive(elapsedSeconds);
  }

  function automaticExplorationManaPerSecond() {
    const context = automaticExplorationContext();
    if (!context) return ZERO;
    const { powerCost, fullExplorationAmount } = context;
    const fullExplorationPreview = minorTribulationPreviewForExploration(fullExplorationAmount);
    return mul(explorationPotentialManaGain(
      powerCost,
      state.mana,
      fullExplorationPreview.manaExponent,
      fullExplorationAmount
    ), AUTOMATIC_EXPLORATION_EFFICIENCY);
  }

  function automaticExplorationManaBeforeSuppressionPerSecond() {
    const context = automaticExplorationContext();
    if (!context) return ZERO;
    const { powerCost, fullExplorationAmount } = context;
    const fullExplorationPreview = minorTribulationPreviewForExploration(fullExplorationAmount);
    return mul(explorationPotentialManaGain(
      powerCost,
      state.mana,
      fullExplorationPreview.manaExponent,
      fullExplorationAmount,
      false,
      false
    ), AUTOMATIC_EXPLORATION_EFFICIENCY);
  }

  function automaticManaBeforeSuppressionPerSecond() {
    return add(automaticBaseManaBeforeSuppressionPerSecond(),
      automaticExplorationManaBeforeSuppressionPerSecond());
  }

  function automaticManaBeforeGoogolPenaltyPerSecond() {
    return add(automaticBaseManaPerSecond(), automaticExplorationManaPerSecond());
  }

  function automaticManaPerSecond() {
    return applyGoogolPenalty(
      "mana", state.mana, automaticManaBeforeGoogolPenaltyPerSecond(), state
    );
  }

  function circulationManaSource(currentMana = state.mana) {
    if (!circulationEffective()) return ZERO;
    const source = mul(breathingManaSource(currentMana), circulationPercent());
    return applyGainExponent(source, circulationSourceExponent());
  }

  function circulationSourceExponent() {
    return toNumber(WIS.Core.Effects.product("circulation", "sourceExponent", state), 1);
  }

  function circulationManaPerSecond() {
    const source = circulationManaSource();
    return gt(source, ZERO) ? finalManaGainFromSources([source]) : ZERO;
  }

  function circulationPercent() {
    const basePercent = 0.06 + (state.minorTechniqueUnlocked ? 0.02 : 0) + (state.fiveElementsUnlocked ? 0.05 : 0);
    return basePercent * toNumber(WIS.Core.Effects.product("circulation", "sourceMultiplier", state), 1);
  }

  function explorationManaGain() {
    if (!immortalCultivationActive() || !state.goldenCoreUnlocked || lt(explorationPowerCost(), EXPLORATION_MINIMUM_POWER_COST)) return ZERO;
    const powerCost = explorationPowerCost();
    const explorationAmount = explorationAmountForCost(powerCost);
    const tribulationPreview = minorTribulationPreviewForExploration(explorationAmount);
    return explorationManaGainProgressive(powerCost, explorationAmount, tribulationPreview.manaExponent);
  }

  function explorationPotentialManaGain(
    powerCost = explorationPowerCost(),
    currentMana = state.mana,
    tribulationExponent = minorTribulationExplorationManaExponent(),
    explorationAmount = explorationAmountForCost(powerCost),
    activeExploration = false,
    applyImmortalSuppression = true
  ) {
    if (!immortalCultivationActive() || !state.goldenCoreUnlocked) return ZERO;
    const manaExplorationAmount = explorationManaAmount(explorationAmount);
    const baseExplorationMana = mul(EXPLORATION_BASE_MANA, manaExplorationAmount);
    const explorationSource = calculateSourceGain({
      base: baseExplorationMana,
      multipliers: WIS.Core.Effects.values("exploration", "sourceMultiplier", state)
    });
    const fuBaoSource = calculateSourceGain({ base: mul(baseExplorationMana, fuBaoManaRatio()) });
    const finalGain = mul(
      finalManaGainFromSources([explorationSource, fuBaoSource], currentMana, [], false),
      WIS.Core.Effects.product("exploration", "regionMultiplier", state)
    );
    const silverTadpoleScriptGain = applyGainExponent(finalGain,
      toNumber(WIS.Core.Effects.product("exploration", "sourceExponent", state), 1));
    const tribulationGain = applyGainExponent(silverTadpoleScriptGain, tribulationExponent);
    return applyImmortalSuppression ? applyCelestialDecline(
      tribulationGain,
      currentMana,
      activeExploration ? tribulationGain : 0
    ) : tribulationGain;
  }

  function silverTadpoleScriptExplorationExponent() {
    return WIS.Core.Effects.value("silverTadpole", state);
  }

  function minorTribulationTriggerLoad() {
    const baseLoad = state.spiritTravelVoidUnlocked
      ? 150000
      : MINOR_TRIBULATION_BASE_TRIGGER_LOAD * (state.silverTadpoleScriptUnlocked ? 10 : 1);
    return baseLoad * Math.pow(2, phantomHeavenMirrorCount());
  }

  function spiritWorldAscensionExplorationMultiplier() {
    return WIS.Core.Effects.value("spiritWorldAscension", state);
  }

  function finalManaGainFromSources(sourceGains, currentMana = state.mana, additionalMultipliers = [], applyDecline = true) {
    const gain = calculateRegionGain(sourceGains, {
      multipliers: [manaGainMultiplier(currentMana), ...additionalMultipliers],
      exponents: [toNumber(WIS.Core.Effects.product("mana", "regionExponent", state), 1) + greatLuoManaExponentBonus()]
    });
    const timeAdjustedGain = applyDaoTimeLaw(gain);
    return applyDecline ? applyCelestialDecline(timeAdjustedGain, currentMana) : timeAdjustedGain;
  }

  function flyingEscapeMultiplier() {
    return WIS.Core.Effects.value("flyingEscape", state);
  }

  function explorationPowerCost() {
    return mul(maxBN(ZERO, state.power), 0.1);
  }

  let cachedExplorationPowerCost = null;
  let cachedRawExplorationAmount = ZERO;

  function rawExplorationAmountForCost(powerCost, { cache = true } = {}) {
    const cost = maxBN(ZERO, powerCost);
    if (!gt(cost, ZERO) || !isFiniteBN(cost)) return ZERO;
    if (cache && cachedExplorationPowerCost && eq(cost, cachedExplorationPowerCost)) return cachedRawExplorationAmount;

    const targetLogCost = toNumber(log10(cost), Infinity);
    let lowerLogAmount = -323;
    let upperLogAmount = Math.max(308, targetLogCost);
    for (let iteration = 0; iteration < 64; iteration += 1) {
      const middleLogAmount = (lowerLogAmount + upperLogAmount) / 2;
      const logOnePlusAmount = middleLogAmount > 16
        ? middleLogAmount
        : toNumber(log10(add(ONE, pow10(middleLogAmount))), 0);
      const exponent = 1 + EXPLORATION_COST_EXPONENT_SCALE * Math.sqrt(logOnePlusAmount);
      const middleLogCost = toNumber(log10(EXPLORATION_STANDARD_POWER_COST), 0) + middleLogAmount * exponent;
      if (middleLogCost < targetLogCost) lowerLogAmount = middleLogAmount;
      else upperLogAmount = middleLogAmount;
    }
    const result = pow10((lowerLogAmount + upperLogAmount) / 2);
    if (cache) {
      cachedExplorationPowerCost = cost;
      cachedRawExplorationAmount = result;
    }
    return result;
  }

  function explorationAmountForCost(powerCost, options) {
    return mul(rawExplorationAmountForCost(powerCost, options), WIS.Core.Effects.product("explorationAmount", "sourceMultiplier", state));
  }

  function explorationManaAmount(explorationAmount) {
    const amount = maxBN(ZERO, explorationAmount);
    return smoothPowerSoftcap(
      amount,
      EXPLORATION_MANA_CURVE_CONFIG.scale,
      EXPLORATION_MANA_CURVE_CONFIG.earlyExponent,
      EXPLORATION_MANA_CURVE_CONFIG.lateExponent,
      EXPLORATION_MANA_CURVE_CONFIG.sharpness
    );
  }

  function divineSenseMultiplier() {
    return WIS.Core.Effects.value("divineSense", state);
  }

  function explorationBaseMana(powerCost = explorationPowerCost()) {
    return mul(EXPLORATION_BASE_MANA, explorationManaAmount(explorationAmountForCost(powerCost)));
  }

  function rollMysteriousGreenBottleAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => treasuresUnlocked() && hasAchievement("goldenCore"),
      mysteriousGreenBottleChance,
      () => { WIS.Meta.Treasures.add(state, "mysteriousGreenBottle"); },
      { baseChance: 0.02, currentCount: mysteriousGreenBottleCount, decayRatio: 0.85, treasureKey: "mysteriousGreenBottle", probabilityAtOffset: (offset) => Math.min(1, 0.02 * Math.pow(0.85, mysteriousGreenBottleCount() + offset) * immortalTreasureChanceMultiplier()), awardMany: (count) => WIS.Meta.Treasures.add(state, "mysteriousGreenBottle", count) }
    );
  }

  function rollFuBaoAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => hasAchievement("trueScale3"),
      fuBaoChance,
      () => { WIS.Meta.Treasures.add(state, "fuBao"); },
      { baseChance: 0.02, currentCount: fuBaoCount, decayRatio: 0.7, treasureKey: "fuBao", probabilityAtOffset: (offset) => Math.min(1, 0.02 * Math.pow(0.7, fuBaoCount() + offset) * immortalTreasureChanceMultiplier()), awardMany: (count) => WIS.Meta.Treasures.add(state, "fuBao", count) }
    );
  }

  function rollNaturalTreasureAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => state.goldenCoreUnlocked && state.naturalTreasureLevel < naturalTreasureLevelCap(),
      naturalTreasureUpgradeChance,
      () => { state.naturalTreasureLevel += 1; }
    );
  }

  function rollXuTianDingAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => state.heavenlyTreasureLevel >= 1,
      xuTianDingChance,
      () => { WIS.Meta.Treasures.add(state, "xuTianDing"); },
      { baseChance: 0.0002, currentCount: xuTianDingCount, decayRatio: 0.75, treasureKey: "xuTianDing", probabilityAtOffset: (offset) => Math.min(1, 0.0002 * Math.pow(0.75, xuTianDingCount() + offset) * immortalTreasureChanceMultiplier()), awardMany: (count) => WIS.Meta.Treasures.add(state, "xuTianDing", count) }
    );
  }

  function rollWanYaoFanAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => state.heavenlyTreasureLevel >= 3,
      wanYaoFanChance,
      () => { WIS.Meta.Treasures.add(state, "wanYaoFan"); },
      { baseChance: 0.0001, currentCount: wanYaoFanCount, decayRatio: 0.75, treasureKey: "wanYaoFan", probabilityAtOffset: (offset) => Math.min(1, 0.0001 * Math.pow(0.75, wanYaoFanCount() + offset) * immortalTreasureChanceMultiplier()), awardMany: (count) => WIS.Meta.Treasures.add(state, "wanYaoFan", count) }
    );
  }

  function rollPhantomHeavenMirrorAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => state.mysticHeavenlyTreasureLevel >= 1,
      phantomHeavenMirrorChance,
      () => { WIS.Meta.Treasures.add(state, "phantomHeavenMirror"); },
      { baseChance: 5e-12, currentCount: phantomHeavenMirrorCount, decayRatio: 0.5, treasureKey: "phantomHeavenMirror", probabilityAtOffset: (offset) => Math.min(1, 5e-12 * Math.pow(0.5, phantomHeavenMirrorCount() + offset) * immortalTreasureChanceMultiplier()), awardMany: (count) => WIS.Meta.Treasures.add(state, "phantomHeavenMirror", count) }
    );
  }

  function rollMysticHeavenSacredTreeAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => state.mysticHeavenlyTreasureLevel >= 2,
      mysticHeavenSacredTreeChance,
      () => { WIS.Meta.Treasures.add(state, "mysticHeavenSacredTree"); },
      { baseChance: 5e-14, currentCount: mysticHeavenSacredTreeCount, decayRatio: 0.5, treasureKey: "mysticHeavenSacredTree", probabilityAtOffset: (offset) => Math.min(1, 5e-14 * Math.pow(0.5, mysticHeavenSacredTreeCount() + offset) * immortalTreasureChanceMultiplier()), awardMany: (count) => WIS.Meta.Treasures.add(state, "mysticHeavenSacredTree", count) }
    );
  }

  function rollMysticHeavenSpiritSlayingSwordAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => state.mysticHeavenlyTreasureLevel >= 3,
      mysticHeavenSpiritSlayingSwordChance,
      () => { WIS.Meta.Treasures.add(state, "mysticHeavenSpiritSlayingSword"); },
      { baseChance: 1e-12, currentCount: mysticHeavenSpiritSlayingSwordCount, decayRatio: 0.6, treasureKey: "mysticHeavenSpiritSlayingSword", probabilityAtOffset: (offset) => Math.min(1, 1e-12 * Math.pow(0.6, mysticHeavenSpiritSlayingSwordCount() + offset) * immortalTreasureChanceMultiplier()), awardMany: (count) => WIS.Meta.Treasures.add(state, "mysticHeavenSpiritSlayingSword", count) }
    );
  }

  function rollBaLingChiAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => state.heavenlyTreasureLevel >= 2,
      baLingChiChance,
      () => { WIS.Meta.Treasures.add(state, "baLingChi"); },
      { baseChance: 0.002, currentCount: baLingChiCount, decayRatio: 0.9, treasureKey: "baLingChi", probabilityAtOffset: (offset) => Math.min(1, 0.002 * Math.pow(0.9, baLingChiCount() + offset) * immortalTreasureChanceMultiplier()), awardMany: (count) => WIS.Meta.Treasures.add(state, "baLingChi", count) }
    );
    if (!silent && gained > 0) showNotice(`获得宝物烙印：仙道·八灵尺 +${gained}`);
    return gained;
  }

  function rollSeizeFoundationAttempts(attempts) {
    const count = maxBN(ZERO, BN(attempts)).floor();
    if (!gt(count, ZERO) || hasAchievement("seizeFoundation")) return false;
    const failureChance = toNumber(pow(0.99, count), 0);
    if (WIS.Core.Runtime.random() >= 1 - failureChance) return false;
    WIS.Meta.Achievements.record(state, "seizeFoundation");
    return true;
  }

  function processExplorationJudgements(attempts) {
    const count = maxBN(ZERO, BN(attempts)).floor();
    if (!gt(count, ZERO)) return { attempts: ZERO, tianNiPearl: 0, greenBottle: 0, fuBao: 0, naturalTreasure: 0, xuTianDing: 0, wanYaoFan: 0, phantomHeavenMirror: 0, mysticHeavenSacredTree: 0, mysticHeavenSpiritSlayingSword: 0, seizeFoundation: false };
    if (WIS.Core.Runtime.isProjection() && !WIS.Core.Runtime.isTreasurePrediction()) {
      return { attempts: count, tianNiPearl: 0, greenBottle: 0, fuBao: 0, naturalTreasure: 0, xuTianDing: 0, wanYaoFan: 0, phantomHeavenMirror: 0, mysticHeavenSacredTree: 0, mysticHeavenSpiritSlayingSword: 0, seizeFoundation: false };
    }
    return {
      attempts: count,
      tianNiPearl: rollTianNiPearlAttempts(count, true),
      greenBottle: rollMysteriousGreenBottleAttempts(count),
      fuBao: rollFuBaoAttempts(count),
      naturalTreasure: rollNaturalTreasureAttempts(count),
      xuTianDing: rollXuTianDingAttempts(count),
      wanYaoFan: rollWanYaoFanAttempts(count),
      phantomHeavenMirror: rollPhantomHeavenMirrorAttempts(count),
      mysticHeavenSacredTree: rollMysticHeavenSacredTreeAttempts(count),
      mysticHeavenSpiritSlayingSword: rollMysticHeavenSpiritSlayingSwordAttempts(count),
      seizeFoundation: rollSeizeFoundationAttempts(count)
    };
  }

  function addExplorationProgress(explorationAmount) {
    const total = add(maxBN(ZERO, state.explorationProgress), maxBN(ZERO, explorationAmount));
    const attempts = total.floor();
    state.explorationProgress = maxBN(ZERO, sub(total, attempts));
    return attempts;
  }

  function tryTianNiPearl() {
    if (!treasuresUnlocked() || !hasAchievement("daoFoundation") || WIS.Core.Runtime.random() >= tianNiPearlChance()) return false;
    WIS.Meta.Treasures.add(state, "tianNiPearl");
    saveState();
    showNotice(`获得宝物烙印：仙道·天逆珠 ×${tianNiPearlCount()}`);
    return true;
  }

  function longevityCost() {
    return LONGEVITY_COSTS[state.longevityLevel] ?? ZERO;
  }

  function qiSpellCost() {
    return QI_SPELL_COSTS[state.qiSpellLevel] ?? ZERO;
  }

  function foundationSpellCost() {
    return FOUNDATION_SPELL_COSTS[state.foundationSpellLevel] ?? ZERO;
  }

  function goldenCoreLongevityCost() {
    return GOLDEN_CORE_LONGEVITY_COSTS[state.goldenCoreLongevityLevel] ?? ZERO;
  }

  function longevity800Cost() {
    return LONGEVITY_800_COSTS[state.longevity800Level] ?? ZERO;
  }

  function heavenlyTreasureCost() {
    return HEAVENLY_TREASURE_COSTS[state.heavenlyTreasureLevel] ?? ZERO;
  }

  function trueSpiritTransformationCost() {
    return TRUE_SPIRIT_TRANSFORMATION_COSTS[state.trueSpiritTransformationLevel] ?? ZERO;
  }

  function mysticHeavenlyTreasureCost() {
    return MYSTIC_HEAVENLY_TREASURE_COSTS[state.mysticHeavenlyTreasureLevel] ?? ZERO;
  }

  function immortalApertureCost(level = state.immortalApertureLevel) {
    const safeLevel = Math.max(0, Math.min(IMMORTAL_APERTURE_CAP, Math.floor(Number(level) || 0)));
    return safeLevel >= IMMORTAL_APERTURE_CAP
      ? ZERO
      : safeLevel <= IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel
        ? mul(IMMORTAL_APERTURE_BASE_COST, pow(IMMORTAL_APERTURE_GROWTH, safeLevel))
        : safeLevel <= IMMORTAL_APERTURE_CONFIG.ultimateRuleStartLevel
          ? productBN([
            IMMORTAL_APERTURE_BASE_COST,
            pow(IMMORTAL_APERTURE_GROWTH, IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel),
            pow(IMMORTAL_APERTURE_CONFIG.lateGrowth, safeLevel - IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel)
          ])
          : productBN([
            IMMORTAL_APERTURE_BASE_COST,
            pow(IMMORTAL_APERTURE_GROWTH, IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel),
            pow(
              IMMORTAL_APERTURE_CONFIG.lateGrowth,
              IMMORTAL_APERTURE_CONFIG.ultimateRuleStartLevel - IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel
            ),
            pow(
              IMMORTAL_APERTURE_CONFIG.ultimateGrowth,
              safeLevel - IMMORTAL_APERTURE_CONFIG.ultimateRuleStartLevel
            )
          ]);
  }

  function geometricCostRange(anchor, ratio, startExponent, count) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    if (safeCount <= 0) return ZERO;
    const first = mul(anchor, pow(ratio, startExponent));
    return eq(ratio, 1)
      ? mul(first, safeCount)
      : mul(first, div(sub(pow(ratio, safeCount), ONE), sub(ratio, ONE)));
  }

  function immortalApertureIntervalCost(startLevel, targetLevel) {
    const start = Math.max(0, Math.floor(Number(startLevel) || 0));
    const target = Math.max(start, Math.min(IMMORTAL_APERTURE_CAP, Math.floor(Number(targetLevel) || 0)));
    const lateStart = IMMORTAL_APERTURE_CONFIG.lateRuleStartLevel;
    const ultimateStart = IMMORTAL_APERTURE_CONFIG.ultimateRuleStartLevel;
    let total = ZERO;

    const earlyEnd = Math.min(target, lateStart + 1);
    if (start < earlyEnd) {
      total = add(total, geometricCostRange(
        IMMORTAL_APERTURE_BASE_COST,
        IMMORTAL_APERTURE_GROWTH,
        start,
        earlyEnd - start
      ));
    }

    const lateRangeStart = Math.max(start, lateStart + 1);
    const lateRangeEnd = Math.min(target, ultimateStart + 1);
    const lateAnchor = mul(IMMORTAL_APERTURE_BASE_COST, pow(IMMORTAL_APERTURE_GROWTH, lateStart));
    if (lateRangeStart < lateRangeEnd) {
      total = add(total, geometricCostRange(
        lateAnchor,
        IMMORTAL_APERTURE_CONFIG.lateGrowth,
        lateRangeStart - lateStart,
        lateRangeEnd - lateRangeStart
      ));
    }

    const ultimateRangeStart = Math.max(start, ultimateStart + 1);
    if (ultimateRangeStart < target) {
      const ultimateAnchor = mul(lateAnchor, pow(
        IMMORTAL_APERTURE_CONFIG.lateGrowth,
        ultimateStart - lateStart
      ));
      total = add(total, geometricCostRange(
        ultimateAnchor,
        IMMORTAL_APERTURE_CONFIG.ultimateGrowth,
        ultimateRangeStart - ultimateStart,
        target - ultimateRangeStart
      ));
    }
    return total;
  }

  function buyMaxImmortalAperture(unitCostCeiling = null) {
    const startLevel = Math.max(0, state.immortalApertureLevel);
    const maximumLevel = immortalApertureCap();
    const availablePower = WIS.Core.Resources.getSystem("immortal", "immortalPower");
    let lower = startLevel;
    let upper = maximumLevel + 1;
    while (upper - lower > 1) {
      const target = Math.floor((lower + upper) * 0.5);
      const lastUnitCost = immortalApertureCost(target - 1);
      const respectsPriority = !unitCostCeiling || lte(lastUnitCost, unitCostCeiling);
      const totalCost = respectsPriority ? immortalApertureIntervalCost(startLevel, target) : add(availablePower, ONE);
      if (respectsPriority && lte(totalCost, availablePower)) lower = target;
      else upper = target;
    }
    if (lower <= startLevel) return 0;
    const totalCost = immortalApertureIntervalCost(startLevel, lower);
    if (!WIS.Core.Resources.spendSystem("immortal", "immortalPower", totalCost)) return 0;
    state.immortalApertureLevel = lower;
    WIS.Core.Effects.invalidate();
    return lower - startLevel;
  }

  function manualImmortalAbilityHistory() {
    return state.cultivation.systems.immortal.history.manualAbilities;
  }

  function hasManuallyUpgradedImmortalAbility(key) {
    return manualImmortalAbilityHistory()[key] === true;
  }

  function recordManualProgress(history, key, action) {
    const before = Number(state[key]) || 0;
    action();
    if ((Number(state[key]) || 0) <= before) return;
    history()[key] = true;
    saveState();
  }

  function recordManualRealmBreakthrough(action) {
    const before = cultivationRealmLevel();
    action();
    const after = cultivationRealmLevel();
    if (after <= before) return;
    state.cultivation.systems.immortal.history.manualRealmLevel = Math.max(
      state.cultivation.systems.immortal.history.manualRealmLevel,
      after
    );
    saveState();
  }

  function autoUpgradeImmortalAbilities() {
    if (!state.immortalAbilityAutomationEnabled || !hasAchievement("infantSpirit") || state.cultivation.active !== "immortal") return 0;
    const candidates = [
      { historyKey: "qiSpellLevel", cost: qiSpellCost, available: () => state.qiRefiningUnlocked && state.qiSpellLevel < 3, apply: () => { state.qiSpellLevel += 1; } },
      { historyKey: "immortalLifeUnlocked", cost: () => IMMORTAL_LIFE_COST, available: () => state.qiRefiningUnlocked && !state.immortalLifeUnlocked, apply: () => { state.immortalLifeUnlocked = true; } },
      { historyKey: "longevityLevel", cost: longevityCost, available: () => state.foundationUnlocked && state.longevityLevel < 2, apply: () => { state.longevityLevel += 1; } },
      { historyKey: "foundationSpellLevel", cost: foundationSpellCost, available: () => state.foundationUnlocked && state.foundationSpellLevel < 3, apply: () => { state.foundationSpellLevel += 1; } },
      { historyKey: "circulationUnlocked", cost: () => CIRCULATION_COST, available: () => state.foundationUnlocked && !state.circulationUnlocked, apply: () => { state.circulationUnlocked = true; } },
      { historyKey: "manaLiquefactionUnlocked", cost: () => MANA_LIQUEFACTION_COST, available: () => state.foundationUnlocked && !state.manaLiquefactionUnlocked, apply: () => { state.manaLiquefactionUnlocked = true; } },
      { historyKey: "techniqueUnlocked", cost: () => TECHNIQUE_COST, available: () => state.foundationUnlocked && !state.techniqueUnlocked, apply: () => { state.techniqueUnlocked = true; } },
      { historyKey: "goldenCoreLongevityLevel", cost: goldenCoreLongevityCost, available: () => state.goldenCoreUnlocked && state.goldenCoreLongevityLevel < 2, apply: () => { state.goldenCoreLongevityLevel += 1; } },
      { historyKey: "manaSolidificationUnlocked", cost: () => MANA_SOLIDIFICATION_COST, available: () => state.goldenCoreUnlocked && !state.manaSolidificationUnlocked, apply: () => { state.manaSolidificationUnlocked = true; } },
      { historyKey: "minorTechniqueUnlocked", cost: () => MINOR_TECHNIQUE_COST, available: () => state.goldenCoreUnlocked && !state.minorTechniqueUnlocked, apply: () => { state.minorTechniqueUnlocked = true; } },
      { historyKey: "magicTreasureUnlocked", cost: () => MAGIC_TREASURE_COST, available: () => state.goldenCoreUnlocked && !state.magicTreasureUnlocked, apply: () => { state.magicTreasureUnlocked = true; } },
      { historyKey: "materialControlUnlocked", cost: () => MATERIAL_CONTROL_COST, available: () => state.advancedRealmLevel >= 1 && !state.materialControlUnlocked, apply: () => { state.materialControlUnlocked = true; } },
      { historyKey: "flyingEscapeUnlocked", cost: () => FLYING_ESCAPE_COST, available: () => state.advancedRealmLevel >= 1 && !state.flyingEscapeUnlocked, apply: () => { state.flyingEscapeUnlocked = true; } },
      { historyKey: "longevity800Level", cost: longevity800Cost, available: () => state.advancedRealmLevel >= 1 && state.longevity800Level < 4, apply: () => { state.longevity800Level += 1; } },
      { historyKey: "divineSenseUnlocked", cost: () => DIVINE_SENSE_COST, available: () => state.advancedRealmLevel >= 1 && !state.divineSenseUnlocked, apply: () => { state.divineSenseUnlocked = true; } },
      { historyKey: "greatCultivatorUnlocked", cost: () => GREAT_CULTIVATOR_COST, available: () => state.advancedRealmLevel >= 1 && !state.greatCultivatorUnlocked, apply: () => { state.greatCultivatorUnlocked = true; } },
      { historyKey: "secondNascentSoulUnlocked", cost: () => SECOND_NASCENT_SOUL_COST, available: () => state.advancedRealmLevel >= 1 && !state.secondNascentSoulUnlocked, apply: () => { state.secondNascentSoulUnlocked = true; } },
      { historyKey: "spiritWorldAscensionUnlocked", cost: () => SPIRIT_WORLD_ASCENSION_COST, available: () => state.advancedRealmLevel >= 2 && !state.spiritWorldAscensionUnlocked, apply: () => { state.spiritWorldAscensionUnlocked = true; } },
      { historyKey: "auraControlUnlocked", cost: () => AURA_CONTROL_COST, available: () => state.advancedRealmLevel >= 2 && !state.auraControlUnlocked, apply: () => { state.auraControlUnlocked = true; } },
      { historyKey: "equalHeavenLongevityUnlocked", cost: () => EQUAL_HEAVEN_LONGEVITY_COST, available: () => state.advancedRealmLevel >= 2 && !state.equalHeavenLongevityUnlocked, apply: () => { state.equalHeavenLongevityUnlocked = true; } },
      { historyKey: "fiveElementsUnlocked", cost: () => FIVE_ELEMENTS_COST, available: () => state.advancedRealmLevel >= 2 && !state.fiveElementsUnlocked, apply: () => { state.fiveElementsUnlocked = true; } },
      { historyKey: "abundantAuraUnlocked", cost: () => ABUNDANT_AURA_COST, available: () => state.advancedRealmLevel >= 2 && !state.abundantAuraUnlocked, apply: () => { state.abundantAuraUnlocked = true; } },
      { historyKey: "heavenlyTreasureLevel", cost: heavenlyTreasureCost, available: () => state.advancedRealmLevel >= 2 && state.heavenlyTreasureLevel < 3, apply: () => { state.heavenlyTreasureLevel += 1; } },
      { historyKey: "brahmaDemonArtUnlocked", cost: () => BRAHMA_DEMON_ART_COST, available: () => state.advancedRealmLevel >= 3 && !state.brahmaDemonArtUnlocked, apply: () => { state.brahmaDemonArtUnlocked = true; } },
      { historyKey: "trueSpiritTransformationLevel", cost: trueSpiritTransformationCost, available: () => state.advancedRealmLevel >= 3 && state.trueSpiritTransformationLevel < 5, apply: () => { state.trueSpiritTransformationLevel += 1; } },
      { historyKey: "silverTadpoleScriptUnlocked", cost: () => SILVER_TADPOLE_SCRIPT_COST, available: () => state.advancedRealmLevel >= 3 && !state.silverTadpoleScriptUnlocked, apply: () => { state.silverTadpoleScriptUnlocked = true; } },
      { historyKey: "voidRefiningToQiUnlocked", cost: () => VOID_REFINING_TO_QI_COST, available: () => state.advancedRealmLevel >= 3 && !state.voidRefiningToQiUnlocked, apply: () => { state.voidRefiningToQiUnlocked = true; } },
      { historyKey: "immortalRealmDivineAbilityUnlocked", cost: () => IMMORTAL_REALM_DIVINE_ABILITY_COST, available: () => state.advancedRealmLevel >= 3 && !state.immortalRealmDivineAbilityUnlocked, apply: () => { state.immortalRealmDivineAbilityUnlocked = true; } },
      { historyKey: "spiritRefiningArtUnlocked", cost: () => SPIRIT_REFINING_ART_COST, available: () => state.advancedRealmLevel >= 3 && !state.spiritRefiningArtUnlocked, apply: () => { state.spiritRefiningArtUnlocked = true; } },
      { historyKey: "perfectedTechniqueUnlocked", cost: () => PERFECTED_TECHNIQUE_COST, available: () => state.advancedRealmLevel >= 4 && !state.perfectedTechniqueUnlocked, apply: () => { state.perfectedTechniqueUnlocked = true; } },
      { historyKey: "heavenEarthAuraUnlocked", cost: () => HEAVEN_EARTH_AURA_COST, available: () => state.advancedRealmLevel >= 4 && !state.heavenEarthAuraUnlocked, apply: () => { state.heavenEarthAuraUnlocked = true; } },
      { historyKey: "divineAbilityMasteryUnlocked", cost: () => DIVINE_ABILITY_MASTERY_COST, available: () => state.advancedRealmLevel >= 4 && !state.divineAbilityMasteryUnlocked, apply: () => { state.divineAbilityMasteryUnlocked = true; } },
      { historyKey: "dualInfantUnityUnlocked", cost: () => DUAL_INFANT_UNITY_COST, available: () => state.advancedRealmLevel >= 4 && !state.dualInfantUnityUnlocked, apply: () => { state.dualInfantUnityUnlocked = true; } },
      { historyKey: "auraIntoBodyUnlocked", cost: () => AURA_INTO_BODY_COST, available: () => state.advancedRealmLevel >= 4 && !state.auraIntoBodyUnlocked, apply: () => { state.auraIntoBodyUnlocked = true; } },
      { historyKey: "externalIncarnationUnlocked", cost: () => EXTERNAL_INCARNATION_COST, available: () => state.advancedRealmLevel >= 4 && !state.externalIncarnationUnlocked, apply: () => { state.externalIncarnationUnlocked = true; } },
      { historyKey: "demonRealmJourneyUnlocked", cost: () => DEMON_REALM_JOURNEY_COST, available: () => state.advancedRealmLevel >= 4 && !state.demonRealmJourneyUnlocked, apply: () => { state.demonRealmJourneyUnlocked = true; } },
      { historyKey: "returnToOriginUnlocked", cost: () => RETURN_TO_ORIGIN_COST, available: () => state.advancedRealmLevel >= 4 && !state.returnToOriginUnlocked, apply: () => { state.returnToOriginUnlocked = true; } },
      { historyKey: "natalMagicTreasureUnlocked", cost: () => NATAL_MAGIC_TREASURE_COST, available: () => state.advancedRealmLevel >= 5 && !state.natalMagicTreasureUnlocked, apply: () => { state.natalMagicTreasureUnlocked = true; } },
      { historyKey: "perfectedTechniqueCompletionUnlocked", cost: () => PERFECTED_TECHNIQUE_COMPLETION_COST, available: () => state.advancedRealmLevel >= 5 && !state.perfectedTechniqueCompletionUnlocked, apply: () => { state.perfectedTechniqueCompletionUnlocked = true; } },
      { historyKey: "roamSpiritWorldUnlocked", cost: () => ROAM_SPIRIT_WORLD_COST, available: () => state.advancedRealmLevel >= 5 && !state.roamSpiritWorldUnlocked, apply: () => { state.roamSpiritWorldUnlocked = true; } },
      { historyKey: "descendRealmUnlocked", cost: () => DESCEND_REALM_COST, available: () => state.advancedRealmLevel >= 5 && !state.descendRealmUnlocked, apply: () => { state.descendRealmUnlocked = true; } },
      { historyKey: "mysticHeavenlyTreasureLevel", cost: mysticHeavenlyTreasureCost, available: () => state.advancedRealmLevel >= 5 && state.mysticHeavenlyTreasureLevel < 3, apply: () => { state.mysticHeavenlyTreasureLevel += 1; } },
      { historyKey: "nascentSoulCompletionUnlocked", cost: () => NASCENT_SOUL_COMPLETION_COST, available: () => state.advancedRealmLevel >= 5 && !state.nascentSoulCompletionUnlocked, apply: () => { state.nascentSoulCompletionUnlocked = true; } },
      { historyKey: "spiritTravelVoidUnlocked", cost: () => SPIRIT_TRAVEL_VOID_COST, available: () => state.advancedRealmLevel >= 5 && !state.spiritTravelVoidUnlocked, apply: () => { state.spiritTravelVoidUnlocked = true; } },
      { historyKey: "goldenSealScriptUnlocked", cost: () => GOLDEN_SEAL_SCRIPT_COST, available: () => state.advancedRealmLevel >= 5 && !state.goldenSealScriptUnlocked, apply: () => { state.goldenSealScriptUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "undyingPrimordialSpiritUnlocked", cost: () => UNDYING_PRIMORDIAL_SPIRIT_COST, available: () => state.advancedRealmLevel >= 6 && !state.undyingPrimordialSpiritUnlocked, apply: () => { state.undyingPrimordialSpiritUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "immortalApertureLevel", cost: immortalApertureCost, available: () => state.advancedRealmLevel >= 6 && state.immortalApertureLevel < immortalApertureCap(), apply: () => { state.immortalApertureLevel += 1; }, buyMax: buyMaxImmortalAperture },
      { resourceKey: "immortalPower", historyKey: "xuanImmortalBodyUnlocked", cost: () => XUAN_IMMORTAL_BODY_COST, available: () => state.advancedRealmLevel >= 6 && !state.xuanImmortalBodyUnlocked, apply: () => { state.xuanImmortalBodyUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "lawUnlocked", cost: () => LAW_COST, available: () => state.advancedRealmLevel >= 6 && !state.lawUnlocked, apply: () => { state.lawUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "immortalApertureIIUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.immortalApertureII, available: () => state.advancedRealmLevel >= 7 && !state.immortalApertureIIUnlocked, apply: () => { state.immortalApertureIIUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "spiritDomainUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.spiritDomain, available: () => state.advancedRealmLevel >= 7 && !state.spiritDomainUnlocked, apply: () => { state.spiritDomainUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "threadsOfLawUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.threadsOfLaw, available: () => state.advancedRealmLevel >= 7 && !state.threadsOfLawUnlocked, apply: () => { state.threadsOfLawUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "immortalApertureIIIUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.immortalApertureIII, available: () => state.advancedRealmLevel >= 7 && state.immortalApertureIIUnlocked && !state.immortalApertureIIIUnlocked, apply: () => { state.immortalApertureIIIUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "spiritCaptureReturnUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.spiritCaptureReturn, available: () => state.advancedRealmLevel >= 7 && !state.spiritCaptureReturnUnlocked, apply: () => { state.spiritCaptureReturnUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "indestructibleDharmaBodyUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.indestructibleDharmaBody, available: () => state.advancedRealmLevel >= 7 && !state.indestructibleDharmaBodyUnlocked, apply: () => { state.indestructibleDharmaBodyUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "fiveElementsTreasureUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.fiveElementsTreasure, available: () => state.advancedRealmLevel >= 7 && !state.fiveElementsTreasureUnlocked, apply: () => { state.fiveElementsTreasureUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "immortalApertureIVUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.immortalApertureIV, available: () => state.advancedRealmLevel >= 7 && state.immortalApertureIIIUnlocked && !state.immortalApertureIVUnlocked, apply: () => { state.immortalApertureIVUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "immortalApertureVUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.immortalApertureV, available: () => state.advancedRealmLevel >= 8 && state.immortalApertureIVUnlocked && !state.immortalApertureVUnlocked, apply: () => { state.immortalApertureVUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "lawAffinityUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.lawAffinity, available: () => state.advancedRealmLevel >= 8 && state.threadsOfLawUnlocked && !state.lawAffinityUnlocked, apply: () => { state.lawAffinityUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "flawlessJadeBodyUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.flawlessJadeBody, available: () => state.advancedRealmLevel >= 8 && !state.flawlessJadeBodyUnlocked, apply: () => { state.flawlessJadeBodyUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "spiritDomainWorldTransformationUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.spiritDomainWorldTransformation, available: () => state.advancedRealmLevel >= 8 && state.spiritDomainUnlocked && !state.spiritDomainWorldTransformationUnlocked, apply: () => { state.spiritDomainWorldTransformationUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "immortalApertureVIUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.immortalApertureVI, available: () => state.advancedRealmLevel >= 8 && state.immortalApertureVUnlocked && !state.immortalApertureVIUnlocked, apply: () => { state.immortalApertureVIUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "soulQualitativeChangeUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.soulQualitativeChange, available: () => state.advancedRealmLevel >= 8 && !state.soulQualitativeChangeUnlocked, apply: () => { state.soulQualitativeChangeUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "immortalApertureVIIUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.immortalApertureVII, available: () => state.advancedRealmLevel >= 8 && state.immortalApertureVIUnlocked && !state.immortalApertureVIIUnlocked, apply: () => { state.immortalApertureVIIUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "trinityUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.trinity, available: () => state.advancedRealmLevel >= 9 && !state.trinityUnlocked, apply: () => { state.trinityUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "unityWithDaoUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.unityWithDao, available: () => state.advancedRealmLevel >= 9 && !state.unityWithDaoUnlocked, apply: () => { state.unityWithDaoUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "lawOriginUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.lawOrigin, available: () => state.advancedRealmLevel >= 9 && !state.lawOriginUnlocked, apply: () => { state.lawOriginUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "lawCrystalFilamentUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.lawCrystalFilament, available: () => state.advancedRealmLevel >= 9 && !state.lawCrystalFilamentUnlocked, apply: () => { state.lawCrystalFilamentUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "severThreeCorpsesUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.severThreeCorpses, available: () => state.advancedRealmLevel >= 9 && !state.threeCorpseChallengesUnlocked, apply: () => { state.severThreeCorpsesUnlocked = true; state.threeCorpseChallengesUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "ultimateImmortalApertureUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.ultimateImmortalAperture, available: () => state.advancedRealmLevel >= 9 && ultimateImmortalAperturePrerequisiteMet() && !state.ultimateImmortalApertureUnlocked, apply: () => { state.ultimateImmortalApertureUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "daoLawUnityUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.daoLawUnity, available: () => state.advancedRealmLevel >= 10 && !state.daoLawUnityUnlocked, apply: () => { state.daoLawUnityUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "daoDomainUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.daoDomain, available: () => state.advancedRealmLevel >= 10 && !state.daoDomainUnlocked, apply: () => { state.daoDomainUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "daoPowerUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.daoPower, available: () => state.advancedRealmLevel >= 10 && !state.daoPowerUnlocked, apply: () => { state.daoPowerUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "daoTimeLawUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.daoTimeLaw, available: () => state.advancedRealmLevel >= 10 && !state.daoTimeLawUnlocked, apply: () => { state.daoTimeLawUnlocked = true; } },
      { resourceKey: "immortalPower", historyKey: "daoAssimilationUnlocked", cost: () => IMMORTAL_POWER_ABILITY_COSTS.daoAssimilation, available: () => state.advancedRealmLevel >= 10 && !state.daoAssimilationUnlocked, apply: () => { state.daoAssimilationUnlocked = true; } }
    ];
    candidates.forEach((candidate) => {
      const available = candidate.available;
      candidate.available = () => hasManuallyUpgradedImmortalAbility(candidate.historyKey) && available();
    });
    // 散功重修与转世重修会重置进度并要求确认，永远不进入自动升级候选。
    let purchases = 0;
    let purchaseOperations = 0;
    const maximumPurchaseOperations = 32;
    const manaCandidates = candidates.filter((candidate) => candidate.resourceKey !== "immortalPower");
    const immortalPowerCandidates = candidates.filter((candidate) => candidate.resourceKey === "immortalPower");
    while (purchaseOperations < maximumPurchaseOperations) {
      const purchased = purchaseCheapestAvailable(manaCandidates, "mana") ||
        purchaseCheapestAvailable(immortalPowerCandidates, "immortalPower");
      if (!purchased) break;
      purchases += purchased;
      purchaseOperations += 1;
    }
    return purchases;
  }

  function autoBreakthroughImmortalRealms() {
    if (!state.immortalRealmAutomationEnabled || !hasAchievement("bodyIntegration") || state.cultivation.active !== "immortal") return 0;
    if (qiRefiningChallengeActive()) {
      return advanceQiLayersBatch(false);
    }
    const candidates = [
      { resourceKey: "power", cost: () => QI_REFINING_COST, available: () => !state.qiRefiningUnlocked, apply: () => { state.qiRefiningUnlocked = true; } },
      { resourceKey: "mana", cost: foundationCost, available: () => state.qiRefiningUnlocked && !state.foundationUnlocked, apply: () => { state.foundationUnlocked = true; } },
      { resourceKey: "mana", cost: goldenCoreCost, available: () => state.foundationUnlocked && !state.goldenCoreUnlocked, apply: () => { state.goldenCoreUnlocked = true; } },
      ...ADVANCED_REALMS.map((_realm, index) => ({
        resourceKey: advancedRealmResource(index),
        cost: () => advancedRealmCost(index),
        available: () => state.goldenCoreUnlocked && state.advancedRealmLevel === index &&
          (index !== 9 || (
            WIS.Meta.Challenges.completionCount(state, "severSelfCorpse") >= 1 &&
            state.activeChallenge !== "severEvilCorpse"
          )),
        apply: () => {
          state.advancedRealmLevel = index + 1;
          if (index === 5) state.minorTribulationExplorationLoad = 0;
          if (index === 5) state.immortalSpiritPowerUnlocked = true;
          if (index === 0) {
            state.reincarnationManaJRewardLevel = Math.max(
              state.reincarnationManaJRewardLevel,
              state.reincarnationEffectLevel
            );
          }
        }
      }))
    ];
    const manualRealmLevel = state.cultivation.systems.immortal.history.manualRealmLevel;
    candidates.forEach((candidate, index) => {
      const available = candidate.available;
      candidate.available = () => manualRealmLevel >= index + 1 && available();
    });
    let breakthroughs = 0;
    const maximumBreakthroughs = 3 + ADVANCED_REALMS.length;
    while (breakthroughs < maximumBreakthroughs) {
      const next = candidates.find((candidate) => candidate.available());
      if (!next) break;
      const cost = next.cost();
      if (!gt(cost, ZERO)) break;
      const affordable = next.resourceKey === "power"
        ? WIS.Core.Resources.canAfford("power", cost)
        : WIS.Core.Resources.canAffordSystem("immortal", next.resourceKey, cost);
      if (!affordable) break;
      if (next.resourceKey === "power") WIS.Core.Resources.spend("power", cost);
      else WIS.Core.Resources.spendSystem("immortal", next.resourceKey, cost);
      next.apply();
      breakthroughs += 1;
    }
    return breakthroughs;
  }

  function chooseCultivation(systemName) {
    if (!cultivationUnlocked() || state.cultivation.active || state.activeChallenge === "fiveMisfortunes" || systemName !== "仙道") return;
    state.cultivation.active = "immortal";
    state.immortalSelectionCount += 1;
    const grantedMahayanaReincarnation = grantMahayanaReincarnationEffects();
    WIS.Core.Effects.invalidate();
    runtime.call("resetCultivationPage");
    saveState();
    render();
    showNotice(grantedMahayanaReincarnation
      ? "已选择仙道体系；大乘奖励：自动获得3次转世重修效果"
      : "已选择仙道体系");
  }

  function grantMahayanaReincarnationEffects() {
    if (!hasAchievement("mahayana")) return false;
    state.reincarnationLevel = Math.max(state.reincarnationLevel, 3);
    state.permanentRootLevel = Math.max(state.permanentRootLevel, 3);
    state.reincarnationEffectLevel = Math.max(state.reincarnationEffectLevel, 3);
    state.reincarnationManaJRewardLevel = Math.max(state.reincarnationManaJRewardLevel, 3);
    return true;
  }

  function unlockQiRefining() {
    if (state.cultivation.active !== "immortal" || state.qiRefiningUnlocked || !WIS.Core.Resources.canAfford("power", QI_REFINING_COST)) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spend("power", QI_REFINING_COST);
    state.qiRefiningUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function breathe() {
    if (!state.qiRefiningUnlocked) return;
    if (lt(state.joules, 3000)) return;
    if (!gt(breathingManaGain(), ZERO)) return;
    const { mana: gained } = applyManaGainProgressive(
      1,
      (actionFraction, currentMana) => mul(breathingManaGain(currentMana), actionFraction),
      () => {},
      { linearBudget: true }
    );
    if (!gt(gained, ZERO)) return;
    WIS.Core.Resources.set("joules", 0);
    state.lifetimeTotalMana = add(state.lifetimeTotalMana, gained);
    state.currentRebirthTotalMana = add(state.currentRebirthTotalMana, gained);
    tryTianNiPearl();
    rollBaLingChiAttempts(1);
    saveState();
    render();
  }

  function minorTribulationPreviewForExploration(
    explorationAmount,
    currentExplorationLoad = state.minorTribulationExplorationLoad
  ) {
    const currentManaExponent = minorTribulationExplorationManaExponent();
    if (state.advancedRealmLevel < 2 || state.advancedRealmLevel >= 6) {
      return { triggered: false, nextLoad: 0, remainingLoad: 0, loadFactor: 0, manaExponent: currentManaExponent };
    }
    const nextLoad = add(maxBN(ZERO, currentExplorationLoad), maxBN(ZERO, explorationAmount));
    const triggerLoad = minorTribulationTriggerLoad();
    if (lt(nextLoad, triggerLoad)) {
      const numericLoad = toNumber(nextLoad, 0);
      return { triggered: false, nextLoad, remainingLoad: numericLoad, loadFactor: ZERO, manaExponent: currentManaExponent };
    }
    const loadFactor = div(nextLoad, triggerLoad);
    const loadMagnitude = toNumber(log10(add(ONE, loadFactor)), Infinity);
    const calculatedInitialExponent = Math.max(
      minorTribulationExplorationMinimumExponent(),
      minorTribulationExplorationBaseExponent()
        - minorTribulationExplorationDecayCoefficient() * loadMagnitude
    );
    const rawRemainingLoad = toNumber(nextLoad.mod(triggerLoad), 0);
    const remainingLoad = rawRemainingLoad < triggerLoad * 1e-12 ||
      triggerLoad - rawRemainingLoad < triggerLoad * 1e-12
      ? 0
      : rawRemainingLoad;
    return {
      triggered: true,
      nextLoad,
      remainingLoad,
      loadFactor,
      manaExponent: minorTribulationExplorationManaExponent(true, calculatedInitialExponent)
    };
  }

  function registerSuccessfulExploration(explorationAmount, preview = null) {
    if (state.advancedRealmLevel < 2 || state.advancedRealmLevel >= 6) {
      state.minorTribulationExplorationLoad = 0;
      return false;
    }
    const triggerPreview = preview || minorTribulationPreviewForExploration(explorationAmount);
    state.minorTribulationExplorationLoad = triggerPreview.remainingLoad;
    return triggerPreview.triggered;
  }

  function unlockFoundation() {
    if (qiRefiningChallengeActive()) {
      advanceQiLayersBatch(true);
      return;
    }
    const cost = foundationCost();
    if (!state.qiRefiningUnlocked || state.foundationUnlocked || !canAffordMana(cost)) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.foundationUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function unlockGoldenCore() {
    if (qiRefiningChallengeActive()) return;
    const cost = goldenCoreCost();
    if (!state.foundationUnlocked || state.goldenCoreUnlocked || !canAffordMana(cost)) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.goldenCoreUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function unlockAdvancedRealm(index) {
    if (qiRefiningChallengeActive()) return;
    const cost = advancedRealmCost(index);
    const resourceKey = advancedRealmResource(index);
    if (!state.goldenCoreUnlocked || state.advancedRealmLevel !== index ||
        (index === 9 && (
          WIS.Meta.Challenges.completionCount(state, "severSelfCorpse") < 1 ||
          state.activeChallenge === "severEvilCorpse"
        )) ||
        !WIS.Core.Resources.canAffordSystem("immortal", resourceKey, cost)) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spendSystem("immortal", resourceKey, cost);
    state.advancedRealmLevel = index + 1;
    if (index === 5) state.minorTribulationExplorationLoad = 0;
    if (index === 5) state.immortalSpiritPowerUnlocked = true;
    if (index === 0) {
      state.reincarnationManaJRewardLevel = Math.max(
        state.reincarnationManaJRewardLevel,
        state.reincarnationEffectLevel
      );
    }
    checkActiveChallengeCompletion();
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function commitQiLayerAdvance(targetLayer, totalCost, shouldRender) {
    const currentLayer = Math.max(1, Math.floor(Number(state.currentQiLayer) || 1));
    const safeTargetLayer = Math.max(currentLayer, Math.floor(Number(targetLayer) || currentLayer));
    if (safeTargetLayer <= currentLayer || !isFiniteBN(totalCost) || !gt(totalCost, ZERO) ||
        !canAffordMana(totalCost)) return 0;
    WIS.Core.Resources.spendSystem("immortal", "mana", totalCost);
    state.currentQiLayer = safeTargetLayer;
    if (safeTargetLayer >= QI_CHALLENGE_CONFIG.targetLayer &&
        WIS.Meta.Challenges.completionCount(state, "qiRefiningHundredThousandYears") < 1) {
      state.challengeCompletions.qiRefiningHundredThousandYears = 1;
      showNotice("挑战目标达成：炼气十万层；可继续停留或主动退出");
    }
    if (shouldRender) {
      saveState();
      render();
    }
    return safeTargetLayer - currentLayer;
  }

  function advanceQiLayer(shouldRender = true) {
    if (!qiRefiningChallengeActive()) return false;
    const currentLayer = Math.max(1, Math.floor(Number(state.currentQiLayer) || 1));
    const nextLayer = currentLayer + 1;
    return commitQiLayerAdvance(nextLayer, qiLayerRequirement(nextLayer), shouldRender) === 1;
  }

  function advanceQiLayersBatch(shouldRender = true) {
    if (!qiRefiningChallengeActive()) return 0;
    const currentLayer = Math.max(1, Math.floor(Number(state.currentQiLayer) || 1));
    const targetLayer = maxAffordableQiLayer(currentLayer, state.mana);
    if (targetLayer <= currentLayer) return 0;
    const totalCost = qiLayerCumulativeCost(currentLayer + 1, targetLayer);
    return commitQiLayerAdvance(targetLayer, totalCost, shouldRender);
  }

  function unlockImmortalLife() {
    if (!state.qiRefiningUnlocked || state.immortalLifeUnlocked || !canAffordMana(IMMORTAL_LIFE_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", IMMORTAL_LIFE_COST);
    state.immortalLifeUnlocked = true;
    saveState();
    render();
  }

  function buyQiSpell() {
    const cost = qiSpellCost();
    if (!state.qiRefiningUnlocked || state.qiSpellLevel >= 3 || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.qiSpellLevel += 1;
    saveState();
    render();
  }

  function unlockCirculation() {
    if (!state.foundationUnlocked || state.circulationUnlocked || !canAffordMana(CIRCULATION_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", CIRCULATION_COST);
    state.circulationUnlocked = true;
    saveState();
    render();
  }

  function unlockManaLiquefaction() {
    if (!state.foundationUnlocked || state.manaLiquefactionUnlocked || !canAffordMana(MANA_LIQUEFACTION_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MANA_LIQUEFACTION_COST);
    state.manaLiquefactionUnlocked = true;
    saveState();
    render();
  }

  function unlockTechnique() {
    if (!state.foundationUnlocked || state.techniqueUnlocked || !canAffordMana(TECHNIQUE_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", TECHNIQUE_COST);
    state.techniqueUnlocked = true;
    saveState();
    render();
  }

  function buyFoundationSpell() {
    const cost = foundationSpellCost();
    if (!state.foundationUnlocked || state.foundationSpellLevel >= 3 || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.foundationSpellLevel += 1;
    saveState();
    render();
  }

  function buyLongevity() {
    const cost = longevityCost();
    if (!state.foundationUnlocked || state.longevityLevel >= 2 || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.longevityLevel += 1;
    saveState();
    render();
  }

  function buyGoldenCoreLongevity() {
    const cost = goldenCoreLongevityCost();
    if (!state.goldenCoreUnlocked || state.goldenCoreLongevityLevel >= 2 || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.goldenCoreLongevityLevel += 1;
    saveState();
    render();
  }

  function unlockManaSolidification() {
    if (!state.goldenCoreUnlocked || state.manaSolidificationUnlocked || !canAffordMana(MANA_SOLIDIFICATION_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MANA_SOLIDIFICATION_COST);
    state.manaSolidificationUnlocked = true;
    saveState();
    render();
  }

  function unlockMagicTreasure() {
    if (!state.goldenCoreUnlocked || state.magicTreasureUnlocked || !canAffordMana(MAGIC_TREASURE_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MAGIC_TREASURE_COST);
    state.magicTreasureUnlocked = true;
    saveState();
    render();
  }

  function unlockMinorTechnique() {
    if (!state.goldenCoreUnlocked || state.minorTechniqueUnlocked || !canAffordMana(MINOR_TECHNIQUE_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MINOR_TECHNIQUE_COST);
    state.minorTechniqueUnlocked = true;
    saveState();
    render();
  }

  function unlockFlyingEscape() {
    if (state.advancedRealmLevel < 1 || state.flyingEscapeUnlocked || !canAffordMana(FLYING_ESCAPE_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", FLYING_ESCAPE_COST);
    state.flyingEscapeUnlocked = true;
    saveState();
    render();
  }

  function unlockMaterialControl() {
    if (state.advancedRealmLevel < 1 || state.materialControlUnlocked || !canAffordMana(MATERIAL_CONTROL_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MATERIAL_CONTROL_COST);
    state.materialControlUnlocked = true;
    saveState();
    render();
  }

  function unlockDivineSense() {
    if (state.advancedRealmLevel < 1 || state.divineSenseUnlocked || !canAffordMana(DIVINE_SENSE_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", DIVINE_SENSE_COST);
    state.divineSenseUnlocked = true;
    saveState();
    render();
  }

  function unlockGreatCultivator() {
    if (state.advancedRealmLevel < 1 || state.greatCultivatorUnlocked || !canAffordMana(GREAT_CULTIVATOR_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", GREAT_CULTIVATOR_COST);
    state.greatCultivatorUnlocked = true;
    saveState();
    render();
  }

  function unlockSecondNascentSoul() {
    if (state.advancedRealmLevel < 1 || state.secondNascentSoulUnlocked || !canAffordMana(SECOND_NASCENT_SOUL_COST)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", SECOND_NASCENT_SOUL_COST);
    state.secondNascentSoulUnlocked = true;
    saveState();
    render();
  }

  function buyLongevity800() {
    const cost = longevity800Cost();
    if (state.advancedRealmLevel < 1 || state.longevity800Level >= 4 || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.longevity800Level += 1;
    saveState();
    render();
  }

  function unlockManaAbility(stateKey, cost) {
    if (state.advancedRealmLevel < 2 || state[stateKey] || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function unlockVoidRefinementAbility(stateKey, cost) {
    if (state.advancedRealmLevel < 3 || state[stateKey] || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function unlockBodyIntegrationAbility(stateKey, cost) {
    if (state.advancedRealmLevel < 4 || state[stateKey] || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function unlockMahayanaAbility(stateKey, cost) {
    if (state.advancedRealmLevel < 5 || state[stateKey] || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function unlockTrueImmortalAbility(stateKey, cost) {
    if (state.advancedRealmLevel < 6 || state[stateKey] || !canAffordImmortalPower(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "immortalPower", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function unlockAdvancedImmortalAbility(stateKey, cost, requiredAdvancedRealmLevel, prerequisite = () => true) {
    if (state.advancedRealmLevel < requiredAdvancedRealmLevel || state[stateKey] ||
        !prerequisite() || !canAffordImmortalPower(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "immortalPower", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function ultimateImmortalAperturePrerequisiteMet() {
    return state.immortalApertureVIIUnlocked === true;
  }

  function unlockSeverThreeCorpses() {
    const cost = IMMORTAL_POWER_ABILITY_COSTS.severThreeCorpses;
    if (state.advancedRealmLevel < 9 || state.threeCorpseChallengesUnlocked || !canAffordImmortalPower(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "immortalPower", cost);
    state.severThreeCorpsesUnlocked = true;
    state.threeCorpseChallengesUnlocked = true;
    saveState();
    render();
  }

  function buyImmortalAperture() {
    const cost = immortalApertureCost();
    if (state.advancedRealmLevel < 6 || state.immortalApertureLevel >= immortalApertureCap() || !canAffordImmortalPower(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "immortalPower", cost);
    state.immortalApertureLevel += 1;
    saveState();
    render();
  }

  function buyHeavenlyTreasure() {
    const cost = heavenlyTreasureCost();
    if (state.advancedRealmLevel < 2 || state.heavenlyTreasureLevel >= 3 || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.heavenlyTreasureLevel += 1;
    saveState();
    render();
  }

  function buyTrueSpiritTransformation() {
    const cost = trueSpiritTransformationCost();
    if (state.advancedRealmLevel < 3 || state.trueSpiritTransformationLevel >= 5 || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.trueSpiritTransformationLevel += 1;
    saveState();
    render();
  }

  function buyMysticHeavenlyTreasure() {
    const cost = mysticHeavenlyTreasureCost();
    if (state.advancedRealmLevel < 5 || state.mysticHeavenlyTreasureLevel >= 3 || !canAffordMana(cost)) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.mysticHeavenlyTreasureLevel += 1;
    saveState();
    render();
  }

  function grantThreeDeficienciesResetReward() {
    if (!hasAchievement("threeDeficiencies")) return 0;
    const gained = applyResourceSoftcapProgressive(1000, state.power);
    WIS.Core.Resources.add("power", gained);
    state.totalPower = add(state.totalPower, gained);
    state.lifetimeTotalPower = add(state.lifetimeTotalPower, gained);
    state.currentRebirthTotalPower = add(state.currentRebirthTotalPower, gained);
    runtime.call("updateScaleProgress", false);
    return gained;
  }

  function explore() {
    const powerCost = explorationPowerCost();
    if (!state.goldenCoreUnlocked || lt(powerCost, EXPLORATION_MINIMUM_POWER_COST)) return;
    const explorationAmount = explorationAmountForCost(powerCost);
    const tribulationPreview = minorTribulationPreviewForExploration(explorationAmount);
    const previewGain = explorationPotentialManaGain(powerCost, state.mana, tribulationPreview.manaExponent, explorationAmount, true);
    if (lt(previewGain, ONE)) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spend("power", powerCost);
    const { mana: gained } = applyManaGainProgressive(
      1,
      (actionFraction, currentMana) => mul(explorationPotentialManaGain(
        powerCost,
        currentMana,
        tribulationPreview.manaExponent,
        explorationAmount,
        true
      ), actionFraction),
      () => {},
      { linearBudget: true }
    );
    state.lifetimeTotalMana = add(state.lifetimeTotalMana, gained);
    state.currentRebirthTotalMana = add(state.currentRebirthTotalMana, gained);

    const rewards = processExplorationJudgements(addExplorationProgress(explorationAmount));
    const tribulationTriggered = registerSuccessfulExploration(explorationAmount, tribulationPreview);
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
    const rewardParts = [];
    if (rewards.tianNiPearl > 0) rewardParts.push(`仙道·天逆珠 +${rewards.tianNiPearl}`);
    if (rewards.greenBottle > 0) rewardParts.push(`仙道·神秘绿瓶 +${rewards.greenBottle}`);
    if (rewards.fuBao > 0) rewardParts.push(`仙道·符宝 +${rewards.fuBao}`);
    if (rewards.naturalTreasure > 0) rewardParts.push(`天材地宝 +${rewards.naturalTreasure}级`);
    if (rewards.xuTianDing > 0) rewardParts.push(`仙道·虚天鼎 +${rewards.xuTianDing}`);
    if (rewards.wanYaoFan > 0) rewardParts.push(`仙道·万妖幡 +${rewards.wanYaoFan}`);
    if (rewards.phantomHeavenMirror > 0) rewardParts.push(`仙道·幻天镜 +${rewards.phantomHeavenMirror}`);
    if (rewards.mysticHeavenSacredTree > 0) rewardParts.push(`仙道·玄天圣树 +${rewards.mysticHeavenSacredTree}`);
    if (rewards.mysticHeavenSpiritSlayingSword > 0) rewardParts.push(`仙道·玄天斩灵剑 +${rewards.mysticHeavenSpiritSlayingSword}`);
    if (tribulationTriggered) rewardParts.push("触发小天劫");
    if (rewardParts.length > 0) showNotice(`探寻判定：${rewardParts.join("、")}`, 2800);
  }

  function geometricAttemptsUntilSuccess(probability) {
    if (probability >= 1) return 1;
    if (probability <= 0) return Infinity;
    const denominator = Math.log1p(-probability);
    if (!Number.isFinite(denominator) || denominator === 0) return Infinity;
    return Math.floor(Math.log1p(-WIS.Core.Runtime.random()) / denominator) + 1;
  }

  function normalRandom() {
    const first = Math.max(Number.MIN_VALUE, WIS.Core.Runtime.random());
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * WIS.Core.Runtime.random());
  }

  function expectedAttemptsForBatch(count, probability, options) {
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    if (safeCount <= 0) return ZERO;
    if (options.decayRatio > 0 && options.decayRatio < 1) {
      const inverseRatio = 1 / options.decayRatio;
      return div(sub(pow(inverseRatio, safeCount), ONE), mul(probability, inverseRatio - 1));
    }
    const probabilityAt = (offset) => maxBN(
      BN(Number.MIN_VALUE),
      typeof options.probabilityDecimalAtOffset === "function"
        ? options.probabilityDecimalAtOffset(offset)
        : BN(options.probabilityAtOffset?.(offset) || probability)
    );
    const firstProbability = probabilityAt(0);
    const midpointProbability = probabilityAt(Math.floor(safeCount * 0.5));
    const lastProbability = probabilityAt(Math.max(0, safeCount - 1));
    return mul(safeCount / 6, sumBN([
      div(ONE, firstProbability),
      div(4, midpointProbability),
      div(ONE, lastProbability)
    ]));
  }

  function batchSuccessEstimate(attempts, probability, options) {
    if (options.decayRatio > 0 && options.decayRatio < 1) {
      let certainSuccesses = 0;
      if (gte(probability, ONE) && typeof options.probabilityDecimalAtOffset === "function") {
        let lower = 0;
        let upper = 1;
        while (upper < Number.MAX_SAFE_INTEGER && gte(options.probabilityDecimalAtOffset(upper), ONE)) {
          lower = upper;
          upper = Math.min(Number.MAX_SAFE_INTEGER, upper * 2);
          if (upper === lower) break;
        }
        while (upper - lower > 1) {
          const middle = Math.floor((lower + upper) * 0.5);
          if (gte(options.probabilityDecimalAtOffset(middle), ONE)) lower = middle;
          else upper = middle;
        }
        certainSuccesses = lt(options.probabilityDecimalAtOffset(upper), ONE) ? upper : Number.MAX_SAFE_INTEGER;
        if (lte(attempts, certainSuccesses)) {
          return Math.max(0, Math.floor(toNumber(minBN(attempts, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER)));
        }
      }
      const remainingAttempts = certainSuccesses > 0 ? sub(attempts, certainSuccesses) : attempts;
      const geometricProbability = certainSuccesses > 0
        ? maxBN(BN(Number.MIN_VALUE), options.probabilityDecimalAtOffset(certainSuccesses))
        : probability;
      const inverseRatio = 1 / options.decayRatio;
      const capacity = add(ONE, mul(remainingAttempts, geometricProbability * (inverseRatio - 1)));
      const magnitude = toNumber(log10(capacity), Infinity);
      if (!Number.isFinite(magnitude)) return Number.MAX_SAFE_INTEGER;
      return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER,
        certainSuccesses + Math.floor(magnitude / Math.log10(inverseRatio))));
    }
    let lower = 0;
    let upper = 1;
    while (upper < Number.MAX_SAFE_INTEGER &&
           lte(expectedAttemptsForBatch(upper, probability, options), attempts)) {
      lower = upper;
      upper = Math.min(Number.MAX_SAFE_INTEGER, upper * 2);
      if (upper === lower) break;
    }
    for (let iteration = 0; iteration < 48 && upper - lower > 1; iteration += 1) {
      const middle = Math.floor((lower + upper) * 0.5);
      if (lte(expectedAttemptsForBatch(middle, probability, options), attempts)) lower = middle;
      else upper = middle;
    }
    return lower;
  }

  function rollDynamicAttempts(attempts, available, probability, award, options = {}) {
    let remainingAttempts = maxBN(ZERO, BN(attempts)).floor();
    if (!gt(remainingAttempts, ZERO) || !available()) return 0;
    const awardMultiplier = options.treasureKey
      ? WIS.Meta.Treasures.getTreasureAwardMultiplier(state, options.treasureKey)
      : 1;
    const inventoryOffset = (offset) => Math.max(0, Math.floor(Number(offset) || 0)) * awardMultiplier;
    const probabilityDecimalAtOffset = options.decayRatio > 0 && options.decayRatio < 1 &&
      options.baseChance !== undefined && typeof options.currentCount === "function"
      ? (offset) => minBN(ONE, productBN([
        options.baseChance,
        pow(options.decayRatio, options.currentCount() + inventoryOffset(offset)),
        immortalTreasureChanceMultiplierBN()
      ]))
      : (offset) => BN(options.probabilityAtOffset?.(inventoryOffset(offset)) ?? probability());
    const batchOptions = { ...options, probabilityDecimalAtOffset };
    const initialProbabilityDecimal = maxBN(ZERO, minBN(ONE, probabilityDecimalAtOffset(0)));
    if (!gt(initialProbabilityDecimal, ZERO)) return 0;
    const initialProbability = toNumber(initialProbabilityDecimal, 0);
    const expectedAtStart = toNumber(mul(remainingAttempts, initialProbabilityDecimal), Infinity);
    const canBatch = typeof options.awardMany === "function" &&
      ((options.decayRatio > 0 && options.decayRatio < 1) || typeof options.probabilityAtOffset === "function");

    if (canBatch && (!(initialProbability > 0) || !Number.isFinite(expectedAtStart) || expectedAtStart > 64)) {
      let gained = batchSuccessEstimate(remainingAttempts, initialProbabilityDecimal, batchOptions);
      if (Number.isFinite(expectedAtStart) && expectedAtStart <= 1e6) {
        gained = Math.max(0, Math.floor(gained + normalRandom() * Math.sqrt(Math.max(1, gained)) * 0.35));
      } else if (gained > 0) {
        gained = Math.max(0, gained + (WIS.Core.Runtime.random() < 0.25 ? -1 : WIS.Core.Runtime.random() > 0.75 ? 1 : 0));
      }
      const maximumPossible = Math.max(0,
        Math.floor(toNumber(minBN(remainingAttempts, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER)));
      gained = Math.min(gained, maximumPossible);
      if (gained > 0) {
        options.awardMany(gained);
        WIS.Core.Effects.invalidate();
      }
      return gained * awardMultiplier;
    }

    let gained = 0;
    while (gt(remainingAttempts, ZERO) && available()) {
      const attemptsUntilSuccess = geometricAttemptsUntilSuccess(probability());
      if (!Number.isFinite(attemptsUntilSuccess) || lt(remainingAttempts, attemptsUntilSuccess)) break;
      remainingAttempts = sub(remainingAttempts, attemptsUntilSuccess);
      award();
      gained += awardMultiplier;
    }
    if (gained > 0) WIS.Core.Effects.invalidate();
    return gained;
  }

  function purchaseCheapestAvailable(candidates, resourceKey) {
    const isCultivationResource = resourceKey === "mana" || resourceKey === "immortalPower";
    const affordableCandidates = candidates
      .filter((candidate) => candidate.available())
      .map((candidate, candidateIndex) => ({ ...candidate, candidateIndex, currentCost: candidate.cost() }))
      .filter((candidate) => gt(candidate.currentCost, ZERO) && (isCultivationResource
        ? WIS.Core.Resources.canAffordSystem("immortal", resourceKey, candidate.currentCost)
        : WIS.Core.Resources.canAfford(resourceKey, candidate.currentCost)))
      .sort((left, right) => left.currentCost.cmp(right.currentCost) || left.candidateIndex - right.candidateIndex);
    const affordable = affordableCandidates[0];
    if (!affordable) return false;
    if (typeof affordable.buyMax === "function") {
      const nextCompetingCost = affordableCandidates.find((candidate) => candidate !== affordable)?.currentCost || null;
      return affordable.buyMax(nextCompetingCost);
    }
    if (isCultivationResource) WIS.Core.Resources.spendSystem("immortal", resourceKey, affordable.currentCost);
    else WIS.Core.Resources.spend(resourceKey, affordable.currentCost);
    affordable.apply();
    WIS.Core.Effects.invalidate();
    return 1;
  }


  function scatterAndRebuild() {
    const currentEffectLevel = effectiveScatterRebuildLevel();
    if (!state.goldenCoreUnlocked || currentEffectLevel >= 3) return;
    const nextScatterLevel = currentEffectLevel + 1;
    const retainedTier = SCATTER_RETAINED_UPGRADE_TIERS[nextScatterLevel];
    if (!window.confirm(`第${nextScatterLevel}次散功重修将保留${retainedTier}强化；更高量级强化、J、战力、法力、仙灵力、量级和境界会重置，仙道能力、成就与宝物烙印继续保留。确定继续吗？`)) return;
    updateLifetimeStatistics();
    runtime.setState(WIS.Core.Reset.apply("scatter", state, freshDefaultState, {
      context: { nextScatterLevel },
      overrides: {
        scatterRebuildLevel: nextScatterLevel,
        scatterRetentionLevel: nextScatterLevel
      }
    }));
    runtime.call("resetTransientAccumulators");
    runtime.call("resetCultivationPage");
    const resetReward = grantThreeDeficienciesResetReward();
    saveState();
    render();
    showNotice(`散功重修完成：${state.scatterRebuildLevel} / 3${gt(resetReward, ZERO) ? `；三缺奖励 +${format(resetReward, 0)} 战力` : ""}`);
  }

  function reincarnate() {
    if (state.advancedRealmLevel < 1 || state.reincarnationLevel >= 3) return;
    const nextLevel = state.reincarnationLevel + 1;
    const nextPermanentRootLevel = Math.max(state.permanentRootLevel, nextLevel);
    const nextRoot = REINCARNATION_ROOTS[nextPermanentRootLevel];
    const rootChangeText = nextPermanentRootLevel > state.permanentRootLevel
      ? `获得${nextRoot.name}`
      : `灵根保持${nextRoot.name}`;
    if (!window.confirm(`本轮第${nextLevel}次转世重修将${rootChangeText}，并重置强化、资源、量级、境界与仙道能力。挑战完成次数、永久成就、宝物烙印、灵根和统计记录保留。确定继续吗？`)) return;

    updateLifetimeStatistics();
    runtime.setState(WIS.Core.Reset.apply("reincarnation", state, freshDefaultState, { overrides: {
      "cultivation.active": "immortal",
      reincarnationLevel: nextLevel,
      permanentRootLevel: nextPermanentRootLevel,
      reincarnationEffectLevel: nextLevel,
      scatterRebuildLevel: 0,
      scatterRetentionLevel: 0,
      lastUpdateAt: Date.now()
    } }));
    runtime.call("resetTransientAccumulators");
    runtime.call("resetCultivationPage");
    const resetReward = grantThreeDeficienciesResetReward();
    saveState();
    render();
    showNotice(`转世重修完成：${rootChangeText}，自带${nextLevel}级散功重修效果${resetReward > 0 ? `；三缺奖励 +${format(resetReward, 0)} 战力` : ""}`, 3200);
  }
  const actions = Object.freeze({"choose":"chooseCultivation","breathe":"breathe","explore":"explore","scatter":"scatterAndRebuild","reincarnate":"reincarnate"});
  const abilities = Object.freeze({
    immortalLife: unlockImmortalLife,
    qiSpell: buyQiSpell,
    circulation: unlockCirculation,
    manaLiquefaction: unlockManaLiquefaction,
    technique: unlockTechnique,
    foundationSpell: buyFoundationSpell,
    longevity: buyLongevity,
    goldenCoreLongevity: buyGoldenCoreLongevity,
    manaSolidification: unlockManaSolidification,
    magicTreasure: unlockMagicTreasure,
    minorTechnique: unlockMinorTechnique,
    flyingEscape: unlockFlyingEscape,
    materialControl: unlockMaterialControl,
    divineSense: unlockDivineSense,
    greatCultivator: unlockGreatCultivator,
    secondNascentSoul: unlockSecondNascentSoul,
    longevity800: buyLongevity800,
    spiritWorldAscension: () => unlockManaAbility("spiritWorldAscensionUnlocked", SPIRIT_WORLD_ASCENSION_COST),
    auraControl: () => unlockManaAbility("auraControlUnlocked", AURA_CONTROL_COST),
    equalHeavenLongevity: () => unlockManaAbility("equalHeavenLongevityUnlocked", EQUAL_HEAVEN_LONGEVITY_COST),
    fiveElements: () => unlockManaAbility("fiveElementsUnlocked", FIVE_ELEMENTS_COST),
    heavenlyTreasure: buyHeavenlyTreasure,
    abundantAura: () => unlockManaAbility("abundantAuraUnlocked", ABUNDANT_AURA_COST),
    brahmaDemonArt: () => unlockVoidRefinementAbility("brahmaDemonArtUnlocked", BRAHMA_DEMON_ART_COST),
    trueSpiritTransformation: buyTrueSpiritTransformation,
    silverTadpoleScript: () => unlockVoidRefinementAbility("silverTadpoleScriptUnlocked", SILVER_TADPOLE_SCRIPT_COST),
    voidRefiningToQi: () => unlockVoidRefinementAbility("voidRefiningToQiUnlocked", VOID_REFINING_TO_QI_COST),
    immortalRealmDivineAbility: () => unlockVoidRefinementAbility("immortalRealmDivineAbilityUnlocked", IMMORTAL_REALM_DIVINE_ABILITY_COST),
    spiritRefiningArt: () => unlockVoidRefinementAbility("spiritRefiningArtUnlocked", SPIRIT_REFINING_ART_COST),
    perfectedTechnique: () => unlockBodyIntegrationAbility("perfectedTechniqueUnlocked", PERFECTED_TECHNIQUE_COST),
    heavenEarthAura: () => unlockBodyIntegrationAbility("heavenEarthAuraUnlocked", HEAVEN_EARTH_AURA_COST),
    divineAbilityMastery: () => unlockBodyIntegrationAbility("divineAbilityMasteryUnlocked", DIVINE_ABILITY_MASTERY_COST),
    dualInfantUnity: () => unlockBodyIntegrationAbility("dualInfantUnityUnlocked", DUAL_INFANT_UNITY_COST),
    auraIntoBody: () => unlockBodyIntegrationAbility("auraIntoBodyUnlocked", AURA_INTO_BODY_COST),
    externalIncarnation: () => unlockBodyIntegrationAbility("externalIncarnationUnlocked", EXTERNAL_INCARNATION_COST),
    demonRealmJourney: () => unlockBodyIntegrationAbility("demonRealmJourneyUnlocked", DEMON_REALM_JOURNEY_COST),
    returnToOrigin: () => unlockBodyIntegrationAbility("returnToOriginUnlocked", RETURN_TO_ORIGIN_COST),
    natalMagicTreasure: () => unlockMahayanaAbility("natalMagicTreasureUnlocked", NATAL_MAGIC_TREASURE_COST),
    perfectedTechniqueCompletion: () => unlockMahayanaAbility("perfectedTechniqueCompletionUnlocked", PERFECTED_TECHNIQUE_COMPLETION_COST),
    roamSpiritWorld: () => unlockMahayanaAbility("roamSpiritWorldUnlocked", ROAM_SPIRIT_WORLD_COST),
    descendRealm: () => unlockMahayanaAbility("descendRealmUnlocked", DESCEND_REALM_COST),
    mysticHeavenlyTreasure: buyMysticHeavenlyTreasure,
    nascentSoulCompletion: () => unlockMahayanaAbility("nascentSoulCompletionUnlocked", NASCENT_SOUL_COMPLETION_COST),
    spiritTravelVoid: () => unlockMahayanaAbility("spiritTravelVoidUnlocked", SPIRIT_TRAVEL_VOID_COST),
    goldenSealScript: () => unlockMahayanaAbility("goldenSealScriptUnlocked", GOLDEN_SEAL_SCRIPT_COST),
    undyingPrimordialSpirit: () => unlockTrueImmortalAbility("undyingPrimordialSpiritUnlocked", UNDYING_PRIMORDIAL_SPIRIT_COST),
    immortalAperture: buyImmortalAperture,
    xuanImmortalBody: () => unlockTrueImmortalAbility("xuanImmortalBodyUnlocked", XUAN_IMMORTAL_BODY_COST),
    law: () => unlockTrueImmortalAbility("lawUnlocked", LAW_COST),
    immortalApertureII: () => unlockAdvancedImmortalAbility("immortalApertureIIUnlocked", IMMORTAL_POWER_ABILITY_COSTS.immortalApertureII, 7),
    spiritDomain: () => unlockAdvancedImmortalAbility("spiritDomainUnlocked", IMMORTAL_POWER_ABILITY_COSTS.spiritDomain, 7),
    threadsOfLaw: () => unlockAdvancedImmortalAbility("threadsOfLawUnlocked", IMMORTAL_POWER_ABILITY_COSTS.threadsOfLaw, 7),
    immortalApertureIII: () => unlockAdvancedImmortalAbility("immortalApertureIIIUnlocked", IMMORTAL_POWER_ABILITY_COSTS.immortalApertureIII, 7, () => state.immortalApertureIIUnlocked),
    spiritCaptureReturn: () => unlockAdvancedImmortalAbility("spiritCaptureReturnUnlocked", IMMORTAL_POWER_ABILITY_COSTS.spiritCaptureReturn, 7),
    indestructibleDharmaBody: () => unlockAdvancedImmortalAbility("indestructibleDharmaBodyUnlocked", IMMORTAL_POWER_ABILITY_COSTS.indestructibleDharmaBody, 7),
    immortalApertureIV: () => unlockAdvancedImmortalAbility("immortalApertureIVUnlocked", IMMORTAL_POWER_ABILITY_COSTS.immortalApertureIV, 7, () => state.immortalApertureIIIUnlocked),
    fiveElementsTreasure: () => unlockAdvancedImmortalAbility("fiveElementsTreasureUnlocked", IMMORTAL_POWER_ABILITY_COSTS.fiveElementsTreasure, 7),
    lawAffinity: () => unlockAdvancedImmortalAbility("lawAffinityUnlocked", IMMORTAL_POWER_ABILITY_COSTS.lawAffinity, 8, () => state.threadsOfLawUnlocked),
    flawlessJadeBody: () => unlockAdvancedImmortalAbility("flawlessJadeBodyUnlocked", IMMORTAL_POWER_ABILITY_COSTS.flawlessJadeBody, 8),
    spiritDomainWorldTransformation: () => unlockAdvancedImmortalAbility("spiritDomainWorldTransformationUnlocked", IMMORTAL_POWER_ABILITY_COSTS.spiritDomainWorldTransformation, 8, () => state.spiritDomainUnlocked),
    immortalApertureV: () => unlockAdvancedImmortalAbility("immortalApertureVUnlocked", IMMORTAL_POWER_ABILITY_COSTS.immortalApertureV, 8, () => state.immortalApertureIVUnlocked),
    immortalApertureVI: () => unlockAdvancedImmortalAbility("immortalApertureVIUnlocked", IMMORTAL_POWER_ABILITY_COSTS.immortalApertureVI, 8, () => state.immortalApertureVUnlocked),
    immortalApertureVII: () => unlockAdvancedImmortalAbility("immortalApertureVIIUnlocked", IMMORTAL_POWER_ABILITY_COSTS.immortalApertureVII, 8, () => state.immortalApertureVIUnlocked),
    soulQualitativeChange: () => unlockAdvancedImmortalAbility("soulQualitativeChangeUnlocked", IMMORTAL_POWER_ABILITY_COSTS.soulQualitativeChange, 8),
    trinity: () => unlockAdvancedImmortalAbility("trinityUnlocked", IMMORTAL_POWER_ABILITY_COSTS.trinity, 9),
    unityWithDao: () => unlockAdvancedImmortalAbility("unityWithDaoUnlocked", IMMORTAL_POWER_ABILITY_COSTS.unityWithDao, 9),
    lawOrigin: () => unlockAdvancedImmortalAbility("lawOriginUnlocked", IMMORTAL_POWER_ABILITY_COSTS.lawOrigin, 9),
    lawCrystalFilament: () => unlockAdvancedImmortalAbility("lawCrystalFilamentUnlocked", IMMORTAL_POWER_ABILITY_COSTS.lawCrystalFilament, 9),
    severThreeCorpses: unlockSeverThreeCorpses,
    ultimateImmortalAperture: () => unlockAdvancedImmortalAbility("ultimateImmortalApertureUnlocked", IMMORTAL_POWER_ABILITY_COSTS.ultimateImmortalAperture, 9, ultimateImmortalAperturePrerequisiteMet),
    daoLawUnity: () => unlockAdvancedImmortalAbility("daoLawUnityUnlocked", IMMORTAL_POWER_ABILITY_COSTS.daoLawUnity, 10),
    daoDomain: () => unlockAdvancedImmortalAbility("daoDomainUnlocked", IMMORTAL_POWER_ABILITY_COSTS.daoDomain, 10),
    daoPower: () => unlockAdvancedImmortalAbility("daoPowerUnlocked", IMMORTAL_POWER_ABILITY_COSTS.daoPower, 10),
    daoTimeLaw: () => unlockAdvancedImmortalAbility("daoTimeLawUnlocked", IMMORTAL_POWER_ABILITY_COSTS.daoTimeLaw, 10),
    daoAssimilation: () => unlockAdvancedImmortalAbility("daoAssimilationUnlocked", IMMORTAL_POWER_ABILITY_COSTS.daoAssimilation, 10)
  });
  function performAction(id, ...args) { const name = actions[id]; return name ? api[name](...args) : false; }
  function buyAbility(id, ...args) { const ability = abilities[id]; return ability ? ability(...args) : false; }
  function getActionIds() { return Object.keys(actions).filter((id) => id !== "choose"); }
  function getAbilityIds() { return Object.keys(abilities); }
  const api = Object.freeze({
    nextManaProgressBoundary, applyManaGainProgressive, previewManaGainProgressive,
    breathingManaGainProgressive, explorationManaGainProgressive,
    automaticManaComponents, planAutomaticManaGain, commitAutomaticManaGain, automaticManaGainProgressive,
    automaticBaseManaBeforeSuppressionPerSecond, automaticExplorationManaBeforeSuppressionPerSecond,
    automaticManaBeforeSuppressionPerSecond, automaticManaBeforeGoogolPenaltyPerSecond,
    celestialDeclineActive, celestialDeclineExponent, applyCelestialDecline,
    immortalPowerUnlocked, immortalPowerRealmCost, nextImmortalPowerRealmCost,
    daoAncestorActive, daoAncestorRequirement, daoTimeLawExponent, applyDaoTimeLaw,
    daoImmortalPowerRatio, daoPowerSource, daoAssimilationQ, daoAdjustedSoftcapExponent,
    daoDomainExponent,
    qiRefiningChallengeActive, qiLayerRequirement, qiLayerCumulativeCost, maxAffordableQiLayer,
    qiLayerProgress,
    qiLayerManaMultiplier, qiLayerManaSourceMultiplier, qiGlobalSoftcapQ,
    qiManaSoftcapQ, qiAdjustedSoftcapExponent, qiChallengeReward, advanceQiLayer, advanceQiLayersBatch,
    immortalPowerProgressRatio, immortalPowerManaSuppressionExponent, applyImmortalPowerManaSuppression,
    immortalPowerBasePerSecond, immortalPowerMultiplierGroups, immortalPowerMultiplier,
    immortalPowerBeforeGoogolPenaltyPerSecond, immortalPowerPerSecond,
    immortalApertureCap, immortalApertureLevelMultiplier, immortalApertureMilestoneMultiplier,
    immortalApertureMultiplier, lawImmortalPowerExponent, lawImmortalPowerActualExponent, lawImmortalPowerMultiplier,
    spiritCaptureReturnMultiplier, spiritDomainJSource, soulQualitativeChangeMultiplier,
    immortalPowerRegionExponent, goldenNatureImmortalPowerExponentBonus, greatLuoManaExponentBonus,
    selfCorpseImmortalPowerLimitExponent,
    trinityImmortalPowerMultiplier, unityWithDaoExponent,
    lawCrystalFilamentExponentFromMultiplier, lawCrystalFilamentDetails, lawCrystalFilamentPowerExponent,
    fiveElementsTreasureCount, fiveElementsTreasureRawMultiplier,
    fiveElementsTreasureInternalExponent, fiveElementsTreasureMultiplierBeforeDecline,
    fiveElementsTreasureChance, rollFiveElementsTreasureAttempts,
    immortalCrystalCount, immortalCrystalChance, immortalCrystalIncrement,
    immortalCrystalMultiplier, rollImmortalCrystalAttempts,
    celestialFiveDeclineBaseExponent, celestialFiveDeclineExponent,
    applyCelestialFiveDeclineToMultiplier, nextImmortalPowerProgressBoundary,
    advancedRealmResource, advancedRealmManaCost, nextRealmResource,
    immortalApertureCost, unlockTrueImmortalAbility, unlockAdvancedImmortalAbility,
    ultimateImmortalAperturePrerequisiteMet,
    unlockSeverThreeCorpses, buyImmortalAperture,
    immortalCultivationActive, cultivationRealmLevel, cultivationRealmName, qiSpellPowerMultiplier, foundationSpellPowerMultiplier, greatCultivatorJMultiplier, qiRefiningFitnessMultiplier, immortalFitnessBaseMultiplier, equalHeavenLongevityFitnessMultiplier, baLingChiCount, baLingChiFitnessMultiplier, immortalFitnessLevelCapBonus, manaLiquefactionManaJMultiplier, spiritRefiningArtExponent, reincarnationManaJExponent, manaJRawBonus, manaJBonus, magicTreasurePotentialPowerBonus, magicTreasureManaExponent, magicTreasureManaCurve, materialControlMultiplier, magicTreasurePowerBonus, magicTreasurePowerSource, brahmaDemonArtPowerSource, trueSpiritTransformationPotentialMultiplier, trueSpiritTransformationMultiplier, externalSources, rollTianNiPearlAttempts, minorTribulationPowerExponent, minorTribulationExplorationBaseExponent, minorTribulationExplorationMinimumExponent, minorTribulationExplorationDecayCoefficient, minorTribulationExplorationManaExponent, baLingChiChance, immortalTreasureChanceMultiplier, activeRootRequirementMultiplier, realmRequirementMultiplier, activeRootName, permanentRootDefinition, effectiveScatterRebuildLevel, nextRealmRequirementStackCount, foundationCost, goldenCoreCost, goldenCoreBaseCost, advancedRealmCost, advancedRealmBaseCost, nextRealmCost, breathingRealmConfig, breathingManaDecayMultiplier, rawBaseBreathingManaGain, baseBreathingManaGain, effectiveBaseBreathingManaGain, breathingJCurveExponent, breathingManaGain, breathingManaSource, voidRefiningToQiExponent, auraControlPotentialMultiplier, auraControlMultiplier, immortalRealmDivineAbilityPotentialMultiplier, immortalRealmDivineAbilityMultiplier, manaMultiplierGroups, manaGainMultiplier, bottleneckManaMultiplier, cultivationBottleneckManaMultiplier, scatterRebuildManaMultiplier, naturalTreasureRawManaMultiplier, naturalTreasureManaDiminishingExponent, naturalTreasureManaMultiplier, naturalTreasureUpgradeChance, naturalTreasureLevelCap, xuTianDingCount, xuTianDingMultiplier, xuTianDingChance, wanYaoFanCount, wanYaoFanMultiplier, wanYaoFanChance, phantomHeavenMirrorCount, phantomHeavenMirrorChance, mysticHeavenSacredTreeCount, mysticHeavenSacredTreeChance, mysticHeavenSpiritSlayingSwordCount, mysticHeavenSpiritSlayingSwordChance, mysticHeavenSpiritSlayingSwordExponent, tianNiPearlCount, tianNiPearlRawManaMultiplier, tianNiPearlManaDiminishingExponent, tianNiPearlManaMultiplier, tianNiPearlChance, mysteriousGreenBottleCount, mysteriousGreenBottleMultiplier, mysteriousGreenBottleChance, fuBaoCount, fuBaoChance, fuBaoManaRatio, fuBaoExplorationManaBonus, formatProbability, joulesForNextBaseMana, automaticBaseManaPerSecond, automaticExplorationAmountPerSecond, automaticExplorationManaGain, automaticExplorationManaPerSecond, automaticManaPerSecond, circulationEffective, circulationManaSource, circulationManaPerSecond, circulationPercent, circulationSourceExponent, explorationManaGain, explorationPotentialManaGain, silverTadpoleScriptExplorationExponent, minorTribulationTriggerLoad, spiritWorldAscensionExplorationMultiplier, finalManaGainFromSources, flyingEscapeMultiplier, explorationPowerCost, rawExplorationAmountForCost, explorationAmountForCost, explorationManaAmount, divineSenseMultiplier, explorationBaseMana, rollMysteriousGreenBottleAttempts, rollFuBaoAttempts, rollNaturalTreasureAttempts, rollXuTianDingAttempts, rollWanYaoFanAttempts, rollPhantomHeavenMirrorAttempts, rollMysticHeavenSacredTreeAttempts, rollMysticHeavenSpiritSlayingSwordAttempts, rollBaLingChiAttempts, rollSeizeFoundationAttempts, processExplorationJudgements, addExplorationProgress, tryTianNiPearl, longevityCost, qiSpellCost, foundationSpellCost, goldenCoreLongevityCost, longevity800Cost, heavenlyTreasureCost, trueSpiritTransformationCost, mysticHeavenlyTreasureCost, manualImmortalAbilityHistory, hasManuallyUpgradedImmortalAbility, recordManualProgress, recordManualRealmBreakthrough, autoUpgradeImmortalAbilities, autoBreakthroughImmortalRealms, chooseCultivation, grantMahayanaReincarnationEffects, unlockQiRefining, breathe, minorTribulationPreviewForExploration, registerSuccessfulExploration, unlockFoundation, unlockGoldenCore, unlockAdvancedRealm, unlockImmortalLife, buyQiSpell, unlockCirculation, unlockManaLiquefaction, unlockTechnique, buyFoundationSpell, buyLongevity, buyGoldenCoreLongevity, unlockManaSolidification, unlockMagicTreasure, unlockMinorTechnique, unlockFlyingEscape, unlockMaterialControl, unlockDivineSense, unlockGreatCultivator, unlockSecondNascentSoul, buyLongevity800, unlockManaAbility, unlockVoidRefinementAbility, buyHeavenlyTreasure, buyTrueSpiritTransformation, buyMysticHeavenlyTreasure, grantThreeDeficienciesResetReward, explore,
    unlockBodyIntegrationAbility, unlockMahayanaAbility, scatterAndRebuild, reincarnate,
    getManaPerSecond: automaticManaPerSecond,
    autoUpgrade: autoUpgradeImmortalAbilities,
    autoBreakthrough: autoBreakthroughImmortalRealms,
    performAction, buyAbility, getActionIds, getAbilityIds
  });
  WIS.Cultivation.ImmortalLogic = api;
  WIS.Core.Sources.register("immortal", externalSources);
}(window.WIS));
