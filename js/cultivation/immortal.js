(function defineImmortalSystem(WIS) {
  "use strict";

  const realms = WIS.Core.Config.realms;

  function realmLevel(state) {
    if (state.goldenCoreUnlocked) return 3 + state.advancedRealmLevel;
    if (state.foundationUnlocked) return 2;
    if (state.qiRefiningUnlocked) return 1;
    return 0;
  }

  function realmName(level) {
    const safeLevel = Math.max(0, Math.floor(Number(level) || 0));
    if (safeLevel === 0) return "未踏入仙道";
    if (safeLevel === 1) return "炼气";
    if (safeLevel === 2) return "筑基";
    if (safeLevel === 3) return "结丹";
    return realms[Math.min(realms.length - 1, safeLevel - 4)]?.name ?? "未踏入仙道";
  }

  function levelMultiplier(level, perLevelMultiplier) {
    return level > 0 ? level * perLevelMultiplier : 1;
  }

  function rootDefinition(state) {
    return WIS.Core.Config.reincarnationRoots[state.permanentRootLevel]
      ?? (state.unlockedAchievements?.seizeFoundation
        ? { name: "中品灵根", manaMultiplier: 1.15 }
        : { name: "下品灵根", manaMultiplier: 1.1 });
  }

  function effects(state) {
    if (state.cultivation?.active !== "immortal") return [];
    return [
      { id: "immortalLife", name: "仙道贵生", group: "仙道", target: "power", layer: "regionMultiplier", value: state.immortalLifeUnlocked ? 0.95 : 1 },
      { id: "techniqueJoules", name: "功法", group: "仙道", target: "joules", layer: "regionMultiplier", value: state.techniqueUnlocked ? 1.5 : 1 },
      { id: "qiSpell", name: "炼气法术", group: "仙道", target: "power", layer: "regionMultiplier", value: levelMultiplier(state.qiSpellLevel, 1.08) },
      { id: "foundationSpell", name: "筑基法术", group: "仙道", target: "power", layer: "regionMultiplier", value: levelMultiplier(state.foundationSpellLevel, 1.5) },
      { id: "manaSolidification", name: "法力固化", group: "仙道", target: "power", layer: "regionMultiplier", value: state.manaSolidificationUnlocked ? 1.15 : 1 },
      { id: "greatCultivator", name: "大修士", group: "仙道", target: "joules", layer: "regionMultiplier", value: state.greatCultivatorUnlocked ? levelMultiplier(realmLevel(state), 1.5) : 1 },
      { id: "immortalFitnessBase", name: "仙道健身能力", group: "仙道", target: "fitness", layer: "baseMultiplier", value: WIS.Cultivation.ImmortalLogic.immortalFitnessBaseMultiplier() },
      { id: "equalHeavenFitness", name: "寿与天齐", group: "仙道", target: "fitness", layer: "sourceMultiplier", value: WIS.Cultivation.ImmortalLogic.equalHeavenLongevityFitnessMultiplier() },
      { id: "baLingChiFitness", name: "仙道·八灵尺", group: "宝物", target: "fitness", layer: "sourceMultiplier", value: WIS.Cultivation.ImmortalLogic.baLingChiFitnessMultiplier() },
      { id: "immortalFitnessLevelCap", name: "仙道健身上限", group: "仙道", target: "fitnessLevelCap", layer: "sourceAdditive", value: WIS.Cultivation.ImmortalLogic.immortalFitnessLevelCapBonus() },
      { id: "minorTribulationPower", name: "小天劫", group: "仙道", target: "power", layer: "regionExponent", value: WIS.Cultivation.ImmortalLogic.minorTribulationPowerExponent() },
      { id: "materialControl", name: "御物", group: "仙道", target: "magicTreasure", layer: "sourceMultiplier", value: state.materialControlUnlocked ? 5 : 1 },
      { id: "wanYaoFan", name: "仙道·万妖幡", group: "宝物", target: "magicTreasure", layer: "sourceMultiplier", value: 1 + (state.meta.treasures.wanYaoFan || 0) * 0.003 },
      { id: "trueSpiritTransformation", name: "真灵变", group: "仙道", target: "mana", layer: "regionMultiplier", value: 1 + 0.6 * state.trueSpiritTransformationLevel },
      { id: "auraControl", name: "操控灵气", group: "仙道", target: "breathing", layer: "sourceMultiplier", value: state.auraControlUnlocked ? 1 + 1.5 * Math.log10(1 + Math.max(0, state.power) / 3.033e15) : 1 },
      { id: "immortalRealmDivine", name: "仙界神通", group: "仙道", target: "breathing", layer: "sourceMultiplier", value: state.immortalRealmDivineAbilityUnlocked ? 1 + 0.75 * Math.log10(1 + Math.max(0, state.joules) / 2.092e20) : 1 },
      { id: "voidRefiningToQi", name: "炼虚为气", group: "仙道", target: "breathing", layer: "sourceExponent", value: state.voidRefiningToQiUnlocked ? 1.06 : 1 },
      { id: "secondNascentSoul", name: "第二元婴", group: "仙道", target: "circulation", layer: "sourceMultiplier", value: state.secondNascentSoulUnlocked ? 1.8 : 1 },
      { id: "silverTadpole", name: "银蝌文", group: "仙道", target: "exploration", layer: "sourceExponent", value: state.silverTadpoleScriptUnlocked ? 1.06 : 1 },
      { id: "spiritWorldAscension", name: "飞升灵界", group: "仙道", target: "exploration", layer: "regionMultiplier", value: state.spiritWorldAscensionUnlocked ? 10 : 1 },
      { id: "flyingEscape", name: "飞遁", group: "仙道", target: "exploration", layer: "sourceMultiplier", value: state.flyingEscapeUnlocked ? 10 : 1 },
      { id: "mysteriousGreenBottle", name: "仙道·神秘绿瓶", group: "宝物", target: "exploration", layer: "sourceMultiplier", value: 1 + (state.meta.treasures.mysteriousGreenBottle || 0) * 0.02 },
      { id: "divineSense", name: "神识", group: "仙道", target: "explorationAmount", layer: "sourceMultiplier", value: state.divineSenseUnlocked ? 1.25 : 1 },
      { id: "spiritRefiningArt", name: "炼神术", group: "仙道", target: "manaJ", layer: "sourceExponent", value: state.spiritRefiningArtUnlocked ? 1.06 : 1 },
      { id: "realmMana", name: "境界奖励", group: "境界", target: "mana", layer: "regionMultiplier", value: state.qiRefiningUnlocked ? Math.pow(1.2, realmLevel(state)) : 1 },
      { id: "rootMana", name: state.qiRefiningUnlocked ? rootDefinition(state).name : "下品灵根", group: "灵根", target: "mana", layer: "regionMultiplier", value: state.qiRefiningUnlocked ? rootDefinition(state).manaMultiplier : 1 },
      { id: "immortalLifeMana", name: "仙道贵生", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.immortalLifeUnlocked ? 1.1 : 1 },
      { id: "manaLiquefactionMana", name: "法力液化", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.manaLiquefactionUnlocked ? 0.8 : 1 },
      { id: "manaSolidificationMana", name: "法力固化", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.manaSolidificationUnlocked ? 0.9 : 1 },
      { id: "techniqueMana", name: "功法", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.techniqueUnlocked ? 1.5 : 1 },
      { id: "naturalTreasureMana", name: "天材地宝", group: "宝物", target: "mana", layer: "regionMultiplier", value: (1 + state.naturalTreasureLevel * 0.1) * (1 + (state.meta.treasures.xuTianDing || 0) * 0.005) },
      { id: "tianNiPearlMana", name: "仙道·天逆珠", group: "宝物", target: "mana", layer: "regionMultiplier", value: 1 + (state.meta.treasures.tianNiPearl || 0) * 0.005 },
      { id: "perfectedTechnique", name: "功法大成", group: "仙道", target: "circulation", layer: "sourceMultiplier", value: state.perfectedTechniqueUnlocked ? 1.5 : 1 },
      { id: "dualInfantUnity", name: "双婴合一", group: "仙道", target: "circulation", layer: "sourceExponent", value: state.dualInfantUnityUnlocked ? 1.08 : 1 },
      { id: "heavenEarthAura", name: "天地元气", group: "仙道", target: "breathingJCurve", layer: "sourceAdditive", value: state.heavenEarthAuraUnlocked ? 0.25 : 0 },
      { id: "divineAbilityMastery", name: "神通通神", group: "仙道", target: "mana", layer: "regionMultiplier", value: state.divineAbilityMasteryUnlocked ? 2.5 : 1 },
      { id: "auraIntoBody", name: "元气入体", group: "仙道", target: "fitness", layer: "sourceMultiplier", value: state.auraIntoBodyUnlocked ? 20 : 1 },
      { id: "auraIntoBodyCap", name: "元气入体", group: "仙道", target: "fitnessLevelCap", layer: "sourceAdditive", value: state.auraIntoBodyUnlocked ? 40 : 0 },
      { id: "externalIncarnation", name: "身外化身", group: "仙道", target: "brahmaDemonArt", layer: "sourceMultiplier", value: state.externalIncarnationUnlocked ? 5 : 1 },
      { id: "demonRealmJourneyExploration", name: "魔界之游", group: "仙道", target: "exploration", layer: "sourceMultiplier", value: state.demonRealmJourneyUnlocked ? 5 : 1 },
      { id: "demonRealmJourneyTreasure", name: "魔界之游", group: "仙道", target: "immortalTreasureChance", layer: "sourceMultiplier", value: state.demonRealmJourneyUnlocked ? 3 : 1 },
      { id: "returnToOrigin", name: "返本归元", group: "仙道", target: "joules", layer: "regionExponent", value: state.returnToOriginUnlocked ? 1.02 : 1 },
      { id: "perfectedTechniqueCompletion", name: "功法圆满", group: "仙道", target: "circulation", layer: "sourceMultiplier", value: state.perfectedTechniqueCompletionUnlocked ? 1.5 : 1 },
      { id: "descendRealm", name: "降界", group: "仙道", target: "immortalTreasureChance", layer: "sourceMultiplier", value: state.descendRealmUnlocked ? Math.min(10, 1 + 0.75 * Math.log10(1 + Math.max(0, state.power) / 8.368e22)) : 1 },
      { id: "nascentSoulCompletion", name: "元婴大成", group: "仙道", target: "circulation", layer: "sourceExponent", value: state.nascentSoulCompletionUnlocked ? 1.08 : 1 },
      { id: "goldenSealScript", name: "金篆文", group: "仙道", target: "mana", layer: "regionMultiplier", value: state.goldenSealScriptUnlocked ? 8 : 1 },
      { id: "mysticHeavenSpiritSlayingSword", name: "仙道·玄天斩灵剑", group: "宝物", target: "magicTreasure", layer: "sourceExponent", value: WIS.Cultivation.ImmortalLogic.mysticHeavenSpiritSlayingSwordExponent() },
      { id: "ascendImmortalWorldTreasure", name: "飞升仙界", group: "真仙", target: "immortalTreasureChance", layer: "sourceMultiplier", value: state.advancedRealmLevel >= 6 ? 3 : 1 },
      { id: "undyingPrimordialSpirit", name: "不灭元神", group: "真仙", target: "circulation", layer: "sourceExponent", value: state.undyingPrimordialSpiritUnlocked ? 1.03 : 1 },
      { id: "immortalApertureBreathing", name: "仙窍", group: "真仙", target: "breathing", layer: "sourceMultiplier", value: Math.pow(1.2, state.immortalApertureLevel) },
      { id: "immortalApertureCirculation", name: "仙窍里程碑", group: "真仙", target: "circulation", layer: "sourceMultiplier", value: Math.pow(2, Math.floor(state.immortalApertureLevel / 6)) },
      { id: "xuanImmortalBody", name: "玄仙之躯", group: "真仙", target: "brahmaDemonArt", layer: "sourceExponent", value: state.xuanImmortalBodyUnlocked ? 1.4 : 1 },
      { id: "law", name: "法则", group: "真仙", target: "power", layer: "regionExponent", value: state.lawUnlocked ? 1.02 : 1 }
    ];
  }

  WIS.Core.Effects.register("immortal", effects);

  let passiveManaRollAccumulator = 0;
  let baLingChiRollAccumulator = 0;

  function update(state, elapsedSeconds) {
    const passiveTreasureManaPerSecond = WIS.Cultivation.ImmortalLogic.automaticBaseManaPerSecond();
    const automaticExploration = WIS.Cultivation.ImmortalLogic.automaticExplorationManaGain(elapsedSeconds);
    const mana = Math.max(0, Number(passiveTreasureManaPerSecond) || 0) * elapsedSeconds + automaticExploration.mana;
    const rates = {
      manaPerSecond: elapsedSeconds > 0 ? mana / elapsedSeconds : 0,
      passiveTreasureManaPerSecond,
      automaticExplorationManaPerSecond: elapsedSeconds > 0 ? automaticExploration.mana / elapsedSeconds : 0
    };
    WIS.Core.Resources.addSystem("immortal", "mana", mana);
    state.lifetimeTotalMana += mana;
    return { mana, rates };
  }

  function rollPassiveManaTreasure(elapsedSeconds, passiveManaRate, silentTreasureRolls = false) {
    if (!(passiveManaRate > 0)) {
      passiveManaRollAccumulator = 0;
      return 0;
    }
    passiveManaRollAccumulator += elapsedSeconds;
    const attempts = Math.floor(passiveManaRollAccumulator);
    passiveManaRollAccumulator -= attempts;
    return WIS.Cultivation.ImmortalLogic.rollTianNiPearlAttempts(attempts, silentTreasureRolls);
  }

  function rollCirculationTreasure(state, elapsedSeconds, silentTreasureRolls = false) {
    if (WIS.Cultivation.ImmortalLogic.circulationManaPerSecond() <= 0 || state.heavenlyTreasureLevel < 2) {
      baLingChiRollAccumulator = 0;
      return 0;
    }
    baLingChiRollAccumulator += elapsedSeconds;
    const attempts = Math.floor(baLingChiRollAccumulator);
    baLingChiRollAccumulator -= attempts;
    return WIS.Cultivation.ImmortalLogic.rollBaLingChiAttempts(attempts, silentTreasureRolls);
  }

  function resetTransient() {
    passiveManaRollAccumulator = 0;
    baLingChiRollAccumulator = 0;
  }

  const system = WIS.Core.Registries.cultivationSystems.register({
    id: "immortal", name: "仙道", resource: "mana", realms, realmLevel, realmName,
    getResources: (state) => ({ mana: state.mana }),
    getActions: WIS.Cultivation.ImmortalLogic.getActionIds,
    getAbilities: WIS.Cultivation.ImmortalLogic.getAbilityIds,
    getEffects: effects,
    getState: (state) => WIS.Core.State.domainView(state).cultivation.systems.immortal,
    reset: (type) => WIS.Core.Reset.describe(type),
    rollPassiveManaTreasure, rollCirculationTreasure, resetTransient,
    getManaPerSecond: WIS.Cultivation.ImmortalLogic.getManaPerSecond,
    performAction: WIS.Cultivation.ImmortalLogic.performAction,
    buyAbility: WIS.Cultivation.ImmortalLogic.buyAbility,
    autoUpgrade: WIS.Cultivation.ImmortalLogic.autoUpgrade,
    autoBreakthrough: WIS.Cultivation.ImmortalLogic.autoBreakthrough,
    update
  });
  WIS.Cultivation.Immortal = system;
}(window.WIS));
