(function defineImmortalLogic(WIS) {
  "use strict";

  const runtime = WIS.Core.Runtime;
  const state = runtime.state;
  const CONFIG = WIS.Core.Config;
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
  const DIVINE_ABILITY_MASTERY_COST = IMMORTAL_COSTS.divineAbilityMastery, AURA_INTO_BODY_COST = IMMORTAL_COSTS.auraIntoBody;
  const EXTERNAL_INCARNATION_COST = IMMORTAL_COSTS.externalIncarnation, DEMON_REALM_JOURNEY_COST = IMMORTAL_COSTS.demonRealmJourney;
  const RETURN_TO_ORIGIN_COST = IMMORTAL_COSTS.returnToOrigin;
  const MINOR_TRIBULATION_BASE_TRIGGER_LOAD = CONFIG.minorTribulationBaseTriggerLoad;
  const MINOR_TRIBULATION_RECOVERY_SECONDS = CONFIG.minorTribulationRecoverySeconds;
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
  const EXPLORATION_MINIMUM_POWER_COST = CONFIG.exploration.minimumPowerCost;
  const EXPLORATION_STANDARD_POWER_COST = CONFIG.exploration.standardPowerCost;
  const EXPLORATION_COST_EXPONENT_SCALE = CONFIG.exploration.costExponentScale;
  const REINCARNATION_ROOTS = CONFIG.reincarnationRoots;
  const BREATHING_REALM_CONFIGS = CONFIG.breathingRealms;
  const SCATTER_RETAINED_UPGRADE_TIERS = CONFIG.scatterRetainedUpgradeTiers;

  const calculateSourceGain = (options) => WIS.Core.Formulas.source(options);
  const calculateRegionGain = (sources, options) => WIS.Core.Formulas.region(sources, options);
  const multiplyEffectGroups = (groups) => WIS.Core.Formulas.multiply(Object.values(groups).flat());
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
  const hasAchievement = (key) => WIS.Meta.Achievements.has(state, key);

  function applyGainExponent(value, exponent) {
    return value > 0 ? Math.pow(value, exponent) : 0;
  }

  function additiveLevelMultiplier(level, perLevelMultiplier) {
    return level > 0 ? level * perLevelMultiplier : 1;
  }

  function immortalCultivationActive() {
    return state.cultivation.active === "immortal";
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
    return state.qiRefiningUnlocked ? 10 * Math.pow(Math.max(0, state.mana), 0.8) : 0;
  }

  function manaJBonus() {
    if (!immortalCultivationActive() || !state.qiRefiningUnlocked) return 0;
    return calculateSourceGain({
      base: manaJRawBonus(),
      multipliers: [manaLiquefactionManaJMultiplier()],
      exponents: [reincarnationManaJExponent(), ...WIS.Core.Effects.values("manaJ", "sourceExponent", state)]
    });
  }

  function magicTreasurePotentialPowerBonus() {
    return 10 * Math.pow(Math.max(0, state.mana), 0.65) *
      WIS.Core.Effects.product("magicTreasure", "sourceMultiplier", state);
  }

  function materialControlMultiplier() {
    return WIS.Core.Effects.value("materialControl", state);
  }

  function magicTreasurePowerBonus() {
    return immortalCultivationActive() && state.magicTreasureUnlocked ? magicTreasurePotentialPowerBonus() : 0;
  }

  function magicTreasurePowerSource() {
    return calculateSourceGain({ base: magicTreasurePowerBonus() });
  }

  function brahmaDemonArtPowerSource(fitnessSource = 0) {
    return immortalCultivationActive() && state.brahmaDemonArtUnlocked
      ? calculateSourceGain({
        base: Math.max(0, Number(fitnessSource) || 0) * 3,
        multipliers: WIS.Core.Effects.values("brahmaDemonArt", "sourceMultiplier", state)
      })
      : 0;
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
      { id: "magicTreasure", name: "法宝", group: "仙道", target: "power", value: magicTreasurePowerSource() },
      { id: "brahmaDemonArt", name: "梵圣真魔功", group: "仙道", target: "power", value: brahmaDemonArtPowerSource(context.fitnessJBonus) }
    ];
  }

  function rollTianNiPearlAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => treasuresUnlocked() && hasAchievement("daoFoundation"),
      tianNiPearlChance,
      () => { WIS.Meta.Treasures.add(state, "tianNiPearl"); }
    );

    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得宝物烙印：仙道·天逆珠 +${gained}`);
    }
    return gained;
  }

  function minorTribulationPowerExponent() {
    if (!immortalCultivationActive()) return 1;
    if (state.advancedRealmLevel < 2) return 1;
    return state.advancedRealmLevel >= 3 ? 0.99 : 0.995;
  }

  function minorTribulationExplorationBaseExponent(advancedRealmLevel = state.advancedRealmLevel) {
    return advancedRealmLevel >= 3 ? 0.92 : advancedRealmLevel >= 2 ? 0.95 : 1;
  }

  function minorTribulationExplorationMinimumExponent(advancedRealmLevel = state.advancedRealmLevel) {
    return advancedRealmLevel >= 3 ? 0.75 : 0.8;
  }

  function minorTribulationExplorationDecayCoefficient(advancedRealmLevel = state.advancedRealmLevel) {
    return advancedRealmLevel >= 3 ? 0.022 : 0.02;
  }

  function minorTribulationExplorationManaExponent(
    triggered = state.minorTribulationTriggered,
    initialExponent = state.minorTribulationInitialManaExponent,
    recoveryRemaining = state.minorTribulationRecoveryRemaining,
    advancedRealmLevel = state.advancedRealmLevel
  ) {
    if (advancedRealmLevel < 2) return 1;
    const baseExponent = minorTribulationExplorationBaseExponent(advancedRealmLevel);
    if (!triggered || recoveryRemaining <= 0) return baseExponent;
    const recoveredRatio = 1 - recoveryRemaining / MINOR_TRIBULATION_RECOVERY_SECONDS;
    const normalizedInitialExponent = Math.min(baseExponent, Math.max(
      minorTribulationExplorationMinimumExponent(advancedRealmLevel),
      initialExponent
    ));
    return normalizedInitialExponent + (baseExponent - normalizedInitialExponent) * Math.max(0, Math.min(1, recoveredRatio));
  }

  function baLingChiChance() {
    return Math.min(1, 0.002 * Math.pow(0.9, baLingChiCount()) * immortalTreasureChanceMultiplier());
  }

  function immortalTreasureChanceMultiplier() {
    return (hasAchievement("humanRealmDominance") ? 2 : 1) *
      WIS.Core.Effects.product("immortalTreasureChance", "sourceMultiplier", state);
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
    return ADVANCED_REALMS[state.advancedRealmLevel] ? state.advancedRealmLevel + 3 : 0;
  }

  function foundationCost() {
    return Math.round(FOUNDATION_BASE_COST * realmRequirementMultiplier(1));
  }

  function goldenCoreCost() {
    return Math.round(goldenCoreBaseCost() * realmRequirementMultiplier(2));
  }

  function goldenCoreBaseCost() {
    return GOLDEN_CORE_BASE_COST * additiveLevelMultiplier(effectiveScatterRebuildLevel(), 2);
  }

  function advancedRealmCost(index) {
    return Math.round(advancedRealmBaseCost(index) * realmRequirementMultiplier(index + 3));
  }

  function advancedRealmBaseCost(index) {
    const scatterDiscount = index === 0 ? Math.max(0.1, 1 - 0.2 * effectiveScatterRebuildLevel()) : 1;
    return ADVANCED_REALMS[index].baseCost * scatterDiscount;
  }

  function nextRealmCost() {
    if (!state.qiRefiningUnlocked) return 0;
    if (!state.foundationUnlocked) return foundationCost();
    if (!state.goldenCoreUnlocked) return goldenCoreCost();
    return ADVANCED_REALMS[state.advancedRealmLevel]
      ? advancedRealmCost(state.advancedRealmLevel)
      : 0;
  }

  function breathingRealmConfig() {
    return BREATHING_REALM_CONFIGS[cultivationRealmLevel()] ?? BREATHING_REALM_CONFIGS[1];
  }

  function breathingManaDecayMultiplier() {
    const { manaScale } = breathingRealmConfig();
    return Math.pow(1 + Math.max(0, state.mana) / manaScale, -0.25);
  }

  function baseBreathingManaGain() {
    if (state.joules < 3000) return 0;
    const { base } = breathingRealmConfig();
    const jCurve = Math.pow(1 + Math.log10(state.joules / 3000), breathingJCurveExponent());
    return Math.floor(base * jCurve * breathingManaDecayMultiplier());
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

  function breathingManaGain() {
    if (!immortalCultivationActive() || !state.qiRefiningUnlocked) return 0;
    const breathingSource = breathingManaSource();
    return breathingSource >= 1
      ? finalManaGainFromSources([breathingSource], state.mana, [scatterRebuildManaMultiplier()])
      : 0;
  }

  function breathingManaSource() {
    if (!immortalCultivationActive() || !state.qiRefiningUnlocked) return 0;
    return calculateSourceGain({
      base: baseBreathingManaGain(),
      multipliers: WIS.Core.Effects.values("breathing", "sourceMultiplier", state),
      exponents: WIS.Core.Effects.values("breathing", "sourceExponent", state)
    });
  }

  function voidRefiningToQiExponent() {
    return WIS.Core.Effects.value("voidRefiningToQi", state);
  }

  function auraControlPotentialMultiplier() {
    return 1 + 1.5 * Math.log10(1 + Math.max(0, state.power) / 3.033e15);
  }

  function auraControlMultiplier() {
    return WIS.Core.Effects.value("auraControl", state);
  }

  function immortalRealmDivineAbilityPotentialMultiplier() {
    return 1 + 0.75 * Math.log10(1 + Math.max(0, state.joules) / 2.092e20);
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
    if (!active || requirement <= 0) return 1;
    const ratio = Math.max(0, Number(currentMana) || 0) / requirement;
    return 1 / (1 + 1.5 * Math.pow(ratio, 4));
  }

  function cultivationBottleneckManaMultiplier(currentMana = state.mana) {
    const requirement = nextRealmCost();
    return requirement > 0 ? bottleneckManaMultiplier(requirement, true, currentMana) : 1;
  }

  function scatterRebuildManaMultiplier() {
    return additiveLevelMultiplier(effectiveScatterRebuildLevel(), 1.5);
  }

  function naturalTreasureManaMultiplier() {
    return WIS.Core.Effects.value("naturalTreasureMana", state);
  }

  function naturalTreasureUpgradeChance() {
    if (state.naturalTreasureLevel >= naturalTreasureLevelCap()) return 0;
    if (state.naturalTreasureLevel >= 10) {
      return 0.0005 * Math.pow(0.6, state.naturalTreasureLevel - 10);
    }
    return 0.1 * Math.pow(0.65, state.naturalTreasureLevel);
  }

  function naturalTreasureLevelCap() {
    return state.spiritWorldAscensionUnlocked ? 20 : 10;
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

  function tianNiPearlCount() {
    return state.treasureImprints?.tianNiPearl || 0;
  }

  function tianNiPearlManaMultiplier() {
    return WIS.Core.Effects.value("tianNiPearlMana", state);
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

  function fuBaoExplorationManaBonus(powerCost) {
    return explorationBaseMana(powerCost) * fuBaoManaRatio();
  }

  function formatProbability(probability) {
    const percent = probability * 100;
    if (percent >= 0.01) return `${percent.toFixed(2)}%`;
    if (percent >= 0.0001) return `${percent.toFixed(4)}%`;
    return `${percent.toExponential(2)}%`;
  }

  function joulesForNextBaseMana() {
    const nextBaseMana = baseBreathingManaGain() + 1;
    const { base } = breathingRealmConfig();
    const curveTarget = Math.pow(nextBaseMana / (base * breathingManaDecayMultiplier()), 1 / breathingJCurveExponent());
    return Math.ceil(Math.max(3000, 3000 * Math.pow(10, curveTarget - 1)));
  }

  function automaticManaPerSecond() {
    if (!immortalCultivationActive() || !state.qiRefiningUnlocked) return 0;
    const sourceGains = [];
    const circulationSource = circulationManaSource();
    if (circulationSource > 0) sourceGains.push(circulationSource);
    if (hasAchievement("refineTheVoid")) sourceGains.push(1);
    return sourceGains.length > 0 ? finalManaGainFromSources(sourceGains) : 0;
  }

  function circulationManaSource() {
    return state.circulationUnlocked ? breathingManaSource() * circulationPercent() : 0;
  }

  function circulationManaPerSecond() {
    const source = circulationManaSource();
    return source > 0 ? finalManaGainFromSources([source]) : 0;
  }

  function circulationPercent() {
    const basePercent = 0.06 + (state.minorTechniqueUnlocked ? 0.02 : 0) + (state.fiveElementsUnlocked ? 0.05 : 0);
    return basePercent * WIS.Core.Effects.product("circulation", "sourceMultiplier", state);
  }

  function explorationManaGain() {
    if (!immortalCultivationActive() || !state.goldenCoreUnlocked || explorationPowerCost() < EXPLORATION_MINIMUM_POWER_COST) return 0;
    const powerCost = explorationPowerCost();
    const explorationAmount = explorationAmountForCost(powerCost);
    const tribulationPreview = minorTribulationPreviewForExploration(explorationAmount);
    return explorationPotentialManaGain(powerCost, state.mana, tribulationPreview.manaExponent);
  }

  function explorationPotentialManaGain(
    powerCost = explorationPowerCost(),
    currentMana = state.mana,
    tribulationExponent = minorTribulationExplorationManaExponent()
  ) {
    if (!immortalCultivationActive() || !state.goldenCoreUnlocked) return 0;
    const explorationSource = calculateSourceGain({
      base: explorationBaseMana(powerCost),
      multipliers: WIS.Core.Effects.values("exploration", "sourceMultiplier", state)
    });
    const fuBaoSource = calculateSourceGain({ base: fuBaoExplorationManaBonus(powerCost) });
    const finalGain = finalManaGainFromSources([explorationSource, fuBaoSource], currentMana)
      * WIS.Core.Effects.product("exploration", "regionMultiplier", state);
    const silverTadpoleScriptGain = applyGainExponent(finalGain, WIS.Core.Effects.product("exploration", "sourceExponent", state));
    return applyGainExponent(silverTadpoleScriptGain, tribulationExponent);
  }

  function silverTadpoleScriptExplorationExponent() {
    return WIS.Core.Effects.value("silverTadpole", state);
  }

  function minorTribulationTriggerLoad() {
    return MINOR_TRIBULATION_BASE_TRIGGER_LOAD * (state.silverTadpoleScriptUnlocked ? 10 : 1);
  }

  function spiritWorldAscensionExplorationMultiplier() {
    return WIS.Core.Effects.value("spiritWorldAscension", state);
  }

  function finalManaGainFromSources(sourceGains, currentMana = state.mana, additionalMultipliers = []) {
    return calculateRegionGain(sourceGains, {
      multipliers: [manaGainMultiplier(currentMana), ...additionalMultipliers]
    });
  }

  function flyingEscapeMultiplier() {
    return WIS.Core.Effects.value("flyingEscape", state);
  }

  function explorationPowerCost() {
    return Math.max(0, state.power) * 0.1;
  }

  function rawExplorationAmountForCost(powerCost) {
    const cost = Math.max(0, Number(powerCost) || 0);
    if (cost <= 0) return 0;
    if (!Number.isFinite(cost)) return Infinity;

    const targetLogCost = Math.log10(cost);
    let lowerLogAmount = -323;
    let upperLogAmount = 308;
    for (let iteration = 0; iteration < 80; iteration += 1) {
      const middleLogAmount = (lowerLogAmount + upperLogAmount) / 2;
      const amount = Math.pow(10, middleLogAmount);
      const logOnePlusAmount = middleLogAmount > 16
        ? middleLogAmount
        : Math.log10(1 + amount);
      const exponent = 1 + EXPLORATION_COST_EXPONENT_SCALE * Math.sqrt(logOnePlusAmount);
      const middleLogCost = Math.log10(EXPLORATION_STANDARD_POWER_COST) + middleLogAmount * exponent;
      if (middleLogCost < targetLogCost) lowerLogAmount = middleLogAmount;
      else upperLogAmount = middleLogAmount;
    }
    return Math.pow(10, (lowerLogAmount + upperLogAmount) / 2);
  }

  function explorationAmountForCost(powerCost) {
    return rawExplorationAmountForCost(powerCost) * WIS.Core.Effects.product("explorationAmount", "sourceMultiplier", state);
  }

  function divineSenseMultiplier() {
    return WIS.Core.Effects.value("divineSense", state);
  }

  function explorationBaseMana(powerCost = explorationPowerCost()) {
    return EXPLORATION_BASE_MANA * explorationAmountForCost(powerCost);
  }

  function rollMysteriousGreenBottleAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => treasuresUnlocked() && hasAchievement("goldenCore"),
      mysteriousGreenBottleChance,
      () => { WIS.Meta.Treasures.add(state, "mysteriousGreenBottle"); }
    );
  }

  function rollFuBaoAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => hasAchievement("trueScale3"),
      fuBaoChance,
      () => { WIS.Meta.Treasures.add(state, "fuBao"); }
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
      () => { WIS.Meta.Treasures.add(state, "xuTianDing"); }
    );
  }

  function rollWanYaoFanAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => state.heavenlyTreasureLevel >= 3,
      wanYaoFanChance,
      () => { WIS.Meta.Treasures.add(state, "wanYaoFan"); }
    );
  }

  function rollBaLingChiAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => state.heavenlyTreasureLevel >= 2,
      baLingChiChance,
      () => { WIS.Meta.Treasures.add(state, "baLingChi"); }
    );
    if (!silent && gained > 0) showNotice(`获得宝物烙印：仙道·八灵尺 +${gained}`);
    return gained;
  }

  function rollSeizeFoundationAttempts(attempts) {
    const count = Math.max(0, Math.floor(Number(attempts) || 0));
    if (count <= 0 || hasAchievement("seizeFoundation")) return false;
    if (Math.random() >= 1 - Math.pow(0.99, count)) return false;
    WIS.Meta.Achievements.record(state, "seizeFoundation");
    return true;
  }

  function processExplorationJudgements(attempts) {
    const count = Math.max(0, Math.floor(Number(attempts) || 0));
    if (count <= 0) return { attempts: 0, tianNiPearl: 0, greenBottle: 0, fuBao: 0, naturalTreasure: 0, xuTianDing: 0, wanYaoFan: 0, seizeFoundation: false };
    return {
      attempts: count,
      tianNiPearl: rollTianNiPearlAttempts(count, true),
      greenBottle: rollMysteriousGreenBottleAttempts(count),
      fuBao: rollFuBaoAttempts(count),
      naturalTreasure: rollNaturalTreasureAttempts(count),
      xuTianDing: rollXuTianDingAttempts(count),
      wanYaoFan: rollWanYaoFanAttempts(count),
      seizeFoundation: rollSeizeFoundationAttempts(count)
    };
  }

  function addExplorationProgress(explorationAmount) {
    const total = Math.max(0, state.explorationProgress) + Math.max(0, Number(explorationAmount) || 0);
    const attempts = Math.floor(total);
    state.explorationProgress = Math.max(0, total - attempts);
    return attempts;
  }

  function tryTianNiPearl() {
    if (!treasuresUnlocked() || !hasAchievement("daoFoundation") || Math.random() >= tianNiPearlChance()) return false;
    WIS.Meta.Treasures.add(state, "tianNiPearl");
    saveState();
    showNotice(`获得宝物烙印：仙道·天逆珠 ×${tianNiPearlCount()}`);
    return true;
  }

  function longevityCost() {
    return LONGEVITY_COSTS[state.longevityLevel] ?? 0;
  }

  function qiSpellCost() {
    return QI_SPELL_COSTS[state.qiSpellLevel] ?? 0;
  }

  function foundationSpellCost() {
    return FOUNDATION_SPELL_COSTS[state.foundationSpellLevel] ?? 0;
  }

  function goldenCoreLongevityCost() {
    return GOLDEN_CORE_LONGEVITY_COSTS[state.goldenCoreLongevityLevel] ?? 0;
  }

  function longevity800Cost() {
    return LONGEVITY_800_COSTS[state.longevity800Level] ?? 0;
  }

  function heavenlyTreasureCost() {
    return HEAVENLY_TREASURE_COSTS[state.heavenlyTreasureLevel] ?? 0;
  }

  function trueSpiritTransformationCost() {
    return TRUE_SPIRIT_TRANSFORMATION_COSTS[state.trueSpiritTransformationLevel] ?? 0;
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
    if (!hasAchievement("infantSpirit") || state.cultivation.active !== "immortal") return 0;
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
      { historyKey: "auraIntoBodyUnlocked", cost: () => AURA_INTO_BODY_COST, available: () => state.advancedRealmLevel >= 4 && !state.auraIntoBodyUnlocked, apply: () => { state.auraIntoBodyUnlocked = true; } },
      { historyKey: "externalIncarnationUnlocked", cost: () => EXTERNAL_INCARNATION_COST, available: () => state.advancedRealmLevel >= 4 && !state.externalIncarnationUnlocked, apply: () => { state.externalIncarnationUnlocked = true; } },
      { historyKey: "demonRealmJourneyUnlocked", cost: () => DEMON_REALM_JOURNEY_COST, available: () => state.advancedRealmLevel >= 4 && !state.demonRealmJourneyUnlocked, apply: () => { state.demonRealmJourneyUnlocked = true; } },
      { historyKey: "returnToOriginUnlocked", cost: () => RETURN_TO_ORIGIN_COST, available: () => state.advancedRealmLevel >= 4 && !state.returnToOriginUnlocked, apply: () => { state.returnToOriginUnlocked = true; } }
    ];
    candidates.forEach((candidate) => {
      const available = candidate.available;
      candidate.available = () => hasManuallyUpgradedImmortalAbility(candidate.historyKey) && available();
    });
    // 散功重修与转世重修会重置进度并要求确认，永远不进入自动升级候选。
    let purchases = 0;
    const maximumPurchases = candidates.length + QI_SPELL_COSTS.length + FOUNDATION_SPELL_COSTS.length + LONGEVITY_COSTS.length + GOLDEN_CORE_LONGEVITY_COSTS.length + LONGEVITY_800_COSTS.length + HEAVENLY_TREASURE_COSTS.length + TRUE_SPIRIT_TRANSFORMATION_COSTS.length;
    while (purchases < maximumPurchases && purchaseCheapestAvailable(candidates, "mana")) purchases += 1;
    return purchases;
  }

  function autoBreakthroughImmortalRealms() {
    if (!hasAchievement("bodyIntegration") || state.cultivation.active !== "immortal") return 0;
    const candidates = [
      { resourceKey: "power", cost: () => QI_REFINING_COST, available: () => !state.qiRefiningUnlocked, apply: () => { state.qiRefiningUnlocked = true; } },
      { resourceKey: "mana", cost: foundationCost, available: () => state.qiRefiningUnlocked && !state.foundationUnlocked, apply: () => { state.foundationUnlocked = true; } },
      { resourceKey: "mana", cost: goldenCoreCost, available: () => state.foundationUnlocked && !state.goldenCoreUnlocked, apply: () => { state.goldenCoreUnlocked = true; } },
      ...ADVANCED_REALMS.map((_realm, index) => ({
        resourceKey: "mana",
        cost: () => advancedRealmCost(index),
        available: () => state.goldenCoreUnlocked && state.advancedRealmLevel === index,
        apply: () => {
          state.advancedRealmLevel = index + 1;
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
      if (!(cost > 0)) break;
      const affordable = next.resourceKey === "power"
        ? WIS.Core.Resources.canAfford("power", cost)
        : WIS.Core.Resources.canAffordSystem("immortal", "mana", cost);
      if (!affordable) break;
      if (next.resourceKey === "power") WIS.Core.Resources.spend("power", cost);
      else WIS.Core.Resources.spendSystem("immortal", "mana", cost);
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
    if (state.cultivation.active !== "immortal" || state.qiRefiningUnlocked || state.power < QI_REFINING_COST) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spend("power", QI_REFINING_COST);
    state.qiRefiningUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function breathe() {
    if (!state.qiRefiningUnlocked) return;
    const gained = breathingManaGain();
    if (gained < 1) return;
    WIS.Core.Resources.set("joules", 0);
    WIS.Core.Resources.addSystem("immortal", "mana", gained);
    state.lifetimeTotalMana += gained;
    tryTianNiPearl();
    rollBaLingChiAttempts(1);
    saveState();
    render();
  }

  function minorTribulationPreviewForExploration(explorationAmount) {
    const currentManaExponent = minorTribulationExplorationManaExponent();
    if (state.advancedRealmLevel < 2) {
      return { triggered: false, nextLoad: 0, remainingLoad: 0, loadFactor: 0, manaExponent: currentManaExponent };
    }
    const nextLoad = state.minorTribulationExplorationLoad + Math.max(0, Number(explorationAmount) || 0);
    const triggerLoad = minorTribulationTriggerLoad();
    if (nextLoad < triggerLoad) {
      return { triggered: false, nextLoad, remainingLoad: nextLoad, loadFactor: 0, manaExponent: currentManaExponent };
    }
    const loadFactor = nextLoad / triggerLoad;
    const calculatedInitialExponent = Math.max(
      minorTribulationExplorationMinimumExponent(),
      minorTribulationExplorationBaseExponent()
        - minorTribulationExplorationDecayCoefficient() * Math.log10(1 + loadFactor)
    );
    return {
      triggered: true,
      nextLoad,
      remainingLoad: nextLoad % triggerLoad,
      loadFactor,
      manaExponent: Math.min(currentManaExponent, calculatedInitialExponent)
    };
  }

  function registerSuccessfulExploration(explorationAmount, preview = null) {
    if (state.advancedRealmLevel < 2) return false;
    const triggerPreview = preview || minorTribulationPreviewForExploration(explorationAmount);
    state.minorTribulationExplorationLoad = triggerPreview.remainingLoad;
    if (!triggerPreview.triggered) return false;
    const currentExplorationManaExponent = minorTribulationExplorationManaExponent();
    state.minorTribulationRecoveryRemaining = MINOR_TRIBULATION_RECOVERY_SECONDS;
    state.minorTribulationTriggered = true;
    state.minorTribulationLastLoadFactor = triggerPreview.loadFactor;
    state.minorTribulationInitialManaExponent = Math.min(
      currentExplorationManaExponent,
      triggerPreview.manaExponent
    );
    return true;
  }

  function unlockFoundation() {
    const cost = foundationCost();
    if (!state.qiRefiningUnlocked || state.foundationUnlocked || state.mana < cost) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.foundationUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function unlockGoldenCore() {
    const cost = goldenCoreCost();
    if (!state.foundationUnlocked || state.goldenCoreUnlocked || state.mana < cost) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.goldenCoreUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function unlockAdvancedRealm(index) {
    const cost = advancedRealmCost(index);
    if (!state.goldenCoreUnlocked || state.advancedRealmLevel !== index || state.mana < cost) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.advancedRealmLevel = index + 1;
    if (index === 0) {
      state.reincarnationManaJRewardLevel = Math.max(
        state.reincarnationManaJRewardLevel,
        state.reincarnationEffectLevel
      );
    }
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function unlockImmortalLife() {
    if (!state.qiRefiningUnlocked || state.immortalLifeUnlocked || state.mana < IMMORTAL_LIFE_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", IMMORTAL_LIFE_COST);
    state.immortalLifeUnlocked = true;
    saveState();
    render();
  }

  function buyQiSpell() {
    const cost = qiSpellCost();
    if (!state.qiRefiningUnlocked || state.qiSpellLevel >= 3 || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.qiSpellLevel += 1;
    saveState();
    render();
  }

  function unlockCirculation() {
    if (!state.foundationUnlocked || state.circulationUnlocked || state.mana < CIRCULATION_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", CIRCULATION_COST);
    state.circulationUnlocked = true;
    saveState();
    render();
  }

  function unlockManaLiquefaction() {
    if (!state.foundationUnlocked || state.manaLiquefactionUnlocked || state.mana < MANA_LIQUEFACTION_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MANA_LIQUEFACTION_COST);
    state.manaLiquefactionUnlocked = true;
    saveState();
    render();
  }

  function unlockTechnique() {
    if (!state.foundationUnlocked || state.techniqueUnlocked || state.mana < TECHNIQUE_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", TECHNIQUE_COST);
    state.techniqueUnlocked = true;
    saveState();
    render();
  }

  function buyFoundationSpell() {
    const cost = foundationSpellCost();
    if (!state.foundationUnlocked || state.foundationSpellLevel >= 3 || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.foundationSpellLevel += 1;
    saveState();
    render();
  }

  function buyLongevity() {
    const cost = longevityCost();
    if (!state.foundationUnlocked || state.longevityLevel >= 2 || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.longevityLevel += 1;
    saveState();
    render();
  }

  function buyGoldenCoreLongevity() {
    const cost = goldenCoreLongevityCost();
    if (!state.goldenCoreUnlocked || state.goldenCoreLongevityLevel >= 2 || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.goldenCoreLongevityLevel += 1;
    saveState();
    render();
  }

  function unlockManaSolidification() {
    if (!state.goldenCoreUnlocked || state.manaSolidificationUnlocked || state.mana < MANA_SOLIDIFICATION_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MANA_SOLIDIFICATION_COST);
    state.manaSolidificationUnlocked = true;
    saveState();
    render();
  }

  function unlockMagicTreasure() {
    if (!state.goldenCoreUnlocked || state.magicTreasureUnlocked || state.mana < MAGIC_TREASURE_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MAGIC_TREASURE_COST);
    state.magicTreasureUnlocked = true;
    saveState();
    render();
  }

  function unlockMinorTechnique() {
    if (!state.goldenCoreUnlocked || state.minorTechniqueUnlocked || state.mana < MINOR_TECHNIQUE_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MINOR_TECHNIQUE_COST);
    state.minorTechniqueUnlocked = true;
    saveState();
    render();
  }

  function unlockFlyingEscape() {
    if (state.advancedRealmLevel < 1 || state.flyingEscapeUnlocked || state.mana < FLYING_ESCAPE_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", FLYING_ESCAPE_COST);
    state.flyingEscapeUnlocked = true;
    saveState();
    render();
  }

  function unlockMaterialControl() {
    if (state.advancedRealmLevel < 1 || state.materialControlUnlocked || state.mana < MATERIAL_CONTROL_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", MATERIAL_CONTROL_COST);
    state.materialControlUnlocked = true;
    saveState();
    render();
  }

  function unlockDivineSense() {
    if (state.advancedRealmLevel < 1 || state.divineSenseUnlocked || state.mana < DIVINE_SENSE_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", DIVINE_SENSE_COST);
    state.divineSenseUnlocked = true;
    saveState();
    render();
  }

  function unlockGreatCultivator() {
    if (state.advancedRealmLevel < 1 || state.greatCultivatorUnlocked || state.mana < GREAT_CULTIVATOR_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", GREAT_CULTIVATOR_COST);
    state.greatCultivatorUnlocked = true;
    saveState();
    render();
  }

  function unlockSecondNascentSoul() {
    if (state.advancedRealmLevel < 1 || state.secondNascentSoulUnlocked || state.mana < SECOND_NASCENT_SOUL_COST) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", SECOND_NASCENT_SOUL_COST);
    state.secondNascentSoulUnlocked = true;
    saveState();
    render();
  }

  function buyLongevity800() {
    const cost = longevity800Cost();
    if (state.advancedRealmLevel < 1 || state.longevity800Level >= 4 || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.longevity800Level += 1;
    saveState();
    render();
  }

  function unlockManaAbility(stateKey, cost) {
    if (state.advancedRealmLevel < 2 || state[stateKey] || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function unlockVoidRefinementAbility(stateKey, cost) {
    if (state.advancedRealmLevel < 3 || state[stateKey] || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function unlockBodyIntegrationAbility(stateKey, cost) {
    if (state.advancedRealmLevel < 4 || state[stateKey] || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state[stateKey] = true;
    saveState();
    render();
  }

  function buyHeavenlyTreasure() {
    const cost = heavenlyTreasureCost();
    if (state.advancedRealmLevel < 2 || state.heavenlyTreasureLevel >= 3 || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.heavenlyTreasureLevel += 1;
    saveState();
    render();
  }

  function buyTrueSpiritTransformation() {
    const cost = trueSpiritTransformationCost();
    if (state.advancedRealmLevel < 3 || state.trueSpiritTransformationLevel >= 5 || state.mana < cost) return;
    WIS.Core.Resources.spendSystem("immortal", "mana", cost);
    state.trueSpiritTransformationLevel += 1;
    saveState();
    render();
  }

  function grantThreeDeficienciesResetReward() {
    if (!hasAchievement("threeDeficiencies")) return 0;
    const reward = 1000;
    WIS.Core.Resources.add("power", reward);
    state.totalPower += reward;
    state.lifetimeTotalPower += reward;
    runtime.call("updateScaleProgress", false);
    return reward;
  }

  function explore() {
    const powerCost = explorationPowerCost();
    if (!state.goldenCoreUnlocked || powerCost < EXPLORATION_MINIMUM_POWER_COST) return;
    const explorationAmount = explorationAmountForCost(powerCost);
    const tribulationPreview = minorTribulationPreviewForExploration(explorationAmount);
    const gained = explorationPotentialManaGain(powerCost, state.mana, tribulationPreview.manaExponent);
    if (gained < 1) return;
    const previousAchievements = achievementStates();
    WIS.Core.Resources.spend("power", powerCost);
    WIS.Core.Resources.addSystem("immortal", "mana", gained);
    state.lifetimeTotalMana += gained;

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
    if (tribulationTriggered) rewardParts.push("触发小天劫");
    if (rewardParts.length > 0) showNotice(`探寻判定：${rewardParts.join("、")}`, 2800);
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

  function purchaseCheapestAvailable(candidates, resourceKey) {
    const commonResource = resourceKey === "mana" ? null : resourceKey;
    const affordable = candidates
      .filter((candidate) => candidate.available())
      .map((candidate, candidateIndex) => ({ ...candidate, candidateIndex, currentCost: candidate.cost() }))
      .filter((candidate) => candidate.currentCost > 0 && (commonResource
        ? WIS.Core.Resources.canAfford(commonResource, candidate.currentCost)
        : WIS.Core.Resources.canAffordSystem("immortal", "mana", candidate.currentCost)))
      .sort((left, right) => left.currentCost - right.currentCost || left.candidateIndex - right.candidateIndex)[0];
    if (!affordable) return false;
    if (commonResource) WIS.Core.Resources.spend(commonResource, affordable.currentCost);
    else WIS.Core.Resources.spendSystem("immortal", "mana", affordable.currentCost);
    affordable.apply();
    return true;
  }


  function scatterAndRebuild() {
    const currentEffectLevel = effectiveScatterRebuildLevel();
    if (!state.goldenCoreUnlocked || currentEffectLevel >= 3) return;
    const nextScatterLevel = currentEffectLevel + 1;
    const retainedTier = SCATTER_RETAINED_UPGRADE_TIERS[nextScatterLevel];
    if (!window.confirm(`第${nextScatterLevel}次散功重修将保留${retainedTier}强化；更高量级强化、J、战力、法力、量级和境界会重置，仙道能力、成就与宝物烙印继续保留。确定继续吗？`)) return;
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
    showNotice(`散功重修完成：${state.scatterRebuildLevel} / 3${resetReward > 0 ? `；三缺奖励 +${format(resetReward, 0)} 战力` : ""}`);
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
    auraIntoBody: () => unlockBodyIntegrationAbility("auraIntoBodyUnlocked", AURA_INTO_BODY_COST),
    externalIncarnation: () => unlockBodyIntegrationAbility("externalIncarnationUnlocked", EXTERNAL_INCARNATION_COST),
    demonRealmJourney: () => unlockBodyIntegrationAbility("demonRealmJourneyUnlocked", DEMON_REALM_JOURNEY_COST),
    returnToOrigin: () => unlockBodyIntegrationAbility("returnToOriginUnlocked", RETURN_TO_ORIGIN_COST)
  });
  function performAction(id, ...args) { const name = actions[id]; return name ? api[name](...args) : false; }
  function buyAbility(id, ...args) { const ability = abilities[id]; return ability ? ability(...args) : false; }
  function getActionIds() { return Object.keys(actions).filter((id) => id !== "choose"); }
  function getAbilityIds() { return Object.keys(abilities); }
  const api = Object.freeze({
    immortalCultivationActive, cultivationRealmLevel, cultivationRealmName, qiSpellPowerMultiplier, foundationSpellPowerMultiplier, greatCultivatorJMultiplier, qiRefiningFitnessMultiplier, immortalFitnessBaseMultiplier, equalHeavenLongevityFitnessMultiplier, baLingChiCount, baLingChiFitnessMultiplier, immortalFitnessLevelCapBonus, manaLiquefactionManaJMultiplier, spiritRefiningArtExponent, reincarnationManaJExponent, manaJRawBonus, manaJBonus, magicTreasurePotentialPowerBonus, materialControlMultiplier, magicTreasurePowerBonus, magicTreasurePowerSource, brahmaDemonArtPowerSource, trueSpiritTransformationPotentialMultiplier, trueSpiritTransformationMultiplier, externalSources, rollTianNiPearlAttempts, minorTribulationPowerExponent, minorTribulationExplorationBaseExponent, minorTribulationExplorationMinimumExponent, minorTribulationExplorationDecayCoefficient, minorTribulationExplorationManaExponent, baLingChiChance, immortalTreasureChanceMultiplier, activeRootRequirementMultiplier, realmRequirementMultiplier, activeRootName, permanentRootDefinition, effectiveScatterRebuildLevel, nextRealmRequirementStackCount, foundationCost, goldenCoreCost, goldenCoreBaseCost, advancedRealmCost, advancedRealmBaseCost, nextRealmCost, breathingRealmConfig, breathingManaDecayMultiplier, baseBreathingManaGain, breathingJCurveExponent, breathingManaGain, breathingManaSource, voidRefiningToQiExponent, auraControlPotentialMultiplier, auraControlMultiplier, immortalRealmDivineAbilityPotentialMultiplier, immortalRealmDivineAbilityMultiplier, manaMultiplierGroups, manaGainMultiplier, bottleneckManaMultiplier, cultivationBottleneckManaMultiplier, scatterRebuildManaMultiplier, naturalTreasureManaMultiplier, naturalTreasureUpgradeChance, naturalTreasureLevelCap, xuTianDingCount, xuTianDingMultiplier, xuTianDingChance, wanYaoFanCount, wanYaoFanMultiplier, wanYaoFanChance, tianNiPearlCount, tianNiPearlManaMultiplier, tianNiPearlChance, mysteriousGreenBottleCount, mysteriousGreenBottleMultiplier, mysteriousGreenBottleChance, fuBaoCount, fuBaoChance, fuBaoManaRatio, fuBaoExplorationManaBonus, formatProbability, joulesForNextBaseMana, automaticManaPerSecond, circulationManaSource, circulationManaPerSecond, circulationPercent, explorationManaGain, explorationPotentialManaGain, silverTadpoleScriptExplorationExponent, minorTribulationTriggerLoad, spiritWorldAscensionExplorationMultiplier, finalManaGainFromSources, flyingEscapeMultiplier, explorationPowerCost, rawExplorationAmountForCost, explorationAmountForCost, divineSenseMultiplier, explorationBaseMana, rollMysteriousGreenBottleAttempts, rollFuBaoAttempts, rollNaturalTreasureAttempts, rollXuTianDingAttempts, rollWanYaoFanAttempts, rollBaLingChiAttempts, rollSeizeFoundationAttempts, processExplorationJudgements, addExplorationProgress, tryTianNiPearl, longevityCost, qiSpellCost, foundationSpellCost, goldenCoreLongevityCost, longevity800Cost, heavenlyTreasureCost, trueSpiritTransformationCost, manualImmortalAbilityHistory, hasManuallyUpgradedImmortalAbility, recordManualProgress, recordManualRealmBreakthrough, autoUpgradeImmortalAbilities, autoBreakthroughImmortalRealms, chooseCultivation, grantMahayanaReincarnationEffects, unlockQiRefining, breathe, minorTribulationPreviewForExploration, registerSuccessfulExploration, unlockFoundation, unlockGoldenCore, unlockAdvancedRealm, unlockImmortalLife, buyQiSpell, unlockCirculation, unlockManaLiquefaction, unlockTechnique, buyFoundationSpell, buyLongevity, buyGoldenCoreLongevity, unlockManaSolidification, unlockMagicTreasure, unlockMinorTechnique, unlockFlyingEscape, unlockMaterialControl, unlockDivineSense, unlockGreatCultivator, unlockSecondNascentSoul, buyLongevity800, unlockManaAbility, unlockVoidRefinementAbility, buyHeavenlyTreasure, buyTrueSpiritTransformation, grantThreeDeficienciesResetReward, explore,
    unlockBodyIntegrationAbility, scatterAndRebuild, reincarnate,
    getManaPerSecond: automaticManaPerSecond,
    autoUpgrade: autoUpgradeImmortalAbilities,
    autoBreakthrough: autoBreakthroughImmortalRealms,
    performAction, buyAbility, getActionIds, getAbilityIds
  });
  WIS.Cultivation.ImmortalLogic = api;
  WIS.Core.Sources.register("immortal", externalSources);
}(window.WIS));
