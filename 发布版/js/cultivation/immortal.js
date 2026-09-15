(function defineImmortalSystem(WIS) {
  "use strict";

  const realms = WIS.Core.Config.realms;
  const { ZERO, ONE, add, mul, div, gt } = WIS.Core.BigNum;

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

  let effectDescriptors = null;
  const effectCacheCounts = { builds: 0, hits: 0, crystalRefreshes: 0 };
  function effects(state) {
    // Only descriptor/static coefficients are reused. Resource-dependent
    // functions and celestial-decline transforms still resolve against the
    // current projected resources in Effects; clocks/exponents remain in the
    // original source formulas. A crystal affects this provider's one base
    // multiplier, BEFORE those exponents and the downstream mana suppression.
    if (!WIS.Core.Runtime.isOfflineExecution()) return buildEffects(state);
    const immortal=state.cultivation.systems.immortal;
    const withoutCrystal=box=>Object.fromEntries(Object.entries(box||{}).filter(([k])=>k!=='immortalCrystal'));
    const signature=JSON.stringify([state.cultivation.active,immortal.abilities,immortal.persistent,state.explorationRewards?.levelResidual,
      state.qiRefiningUnlocked,state.foundationUnlocked,state.goldenCoreUnlocked,state.advancedRealmLevel,
      state.currentQiLayer,state.bestQiLayer,state.activeChallenge,state.challengeCompletions,
      state.unlockedAchievements,state.highestScaleIndex,immortal.xiuzhen?.realm,immortal.xiuzhen?.entered,
      withoutCrystal(state.meta.treasures),withoutCrystal(state.meta.treasureStockResidual)]);
    const crystal=String(WIS.Meta.Treasures.count(state,'immortalCrystal'));
    const logic=WIS.Cultivation.ImmortalLogic;
    if(effectDescriptors?.signature===signature&&effectDescriptors.logic===logic){
      effectCacheCounts.hits++;
      if(effectDescriptors.crystal!==crystal){
        effectCacheCounts.crystalRefreshes++;
        effectDescriptors={...effectDescriptors,crystal,list:effectDescriptors.list.map(effect=>
          effect.id==='immortalCrystalPower'?{...effect,value:logic.immortalCrystalMultiplier()}:effect)};
      }
      return effectDescriptors.list;
    }
    effectCacheCounts.builds++;
    const list=buildEffects(state);effectDescriptors={signature,crystal,logic,list};return list;
  }
  function buildEffects(state) {
    if (state.cultivation?.active !== "immortal") return [];
    if (WIS.Cultivation.Xiuzhen?.qiPathSealed(state)) state = WIS.Cultivation.Xiuzhen.abilityView(state);
    const list = [
      { id: "immortalLife", name: "仙道贵生", group: "仙道", target: "power", layer: "regionMultiplier", value: state.immortalLifeUnlocked ? 0.95 : 1 },
      { id: "techniqueJoules", name: "功法", group: "仙道", target: "joules", layer: "regionMultiplier", value: state.techniqueUnlocked ? 1.5 : 1 },
      { id: "qiSpell", name: "炼气法术", group: "仙道", target: "power", layer: "regionMultiplier", value: levelMultiplier(state.qiSpellLevel, 1.08) },
      { id: "foundationSpell", name: "筑基法术", group: "仙道", target: "power", layer: "regionMultiplier", value: levelMultiplier(state.foundationSpellLevel, 1.5) },
      { id: "manaSolidification", name: "法力固化", group: "仙道", target: "power", layer: "regionMultiplier", value: state.manaSolidificationUnlocked ? 1.15 : 1 },
      { id: "greatCultivator", name: "大修士", group: "仙道", target: "joules", layer: "regionMultiplier", value: state.greatCultivatorUnlocked ? levelMultiplier(realmLevel(state), 1.5) : 1 },
      { id: "immortalFitnessBase", name: "仙道健身能力", group: "仙道", target: "fitness", layer: "baseMultiplier", value: WIS.Cultivation.ImmortalLogic.immortalFitnessBaseMultiplier() },
      { id: "equalHeavenFitness", name: "寿与天齐", group: "仙道", target: "fitness", layer: "sourceMultiplier", value: WIS.Cultivation.ImmortalLogic.equalHeavenLongevityFitnessMultiplier() },
      { id: "baLingChiFitness", name: "仙道·八灵尺", group: "宝物", target: "fitness", layer: "sourceMultiplier", celestialFiveDecline: true, value: WIS.Cultivation.ImmortalLogic.baLingChiFitnessMultiplier() },
      { id: "immortalFitnessLevelCap", name: "仙道健身上限", group: "仙道", target: "fitnessLevelCap", layer: "sourceAdditive", value: WIS.Cultivation.ImmortalLogic.immortalFitnessLevelCapBonus() },
      { id: "minorTribulationPower", name: "小天劫", group: "仙道", target: "power", layer: "regionExponent", value: WIS.Cultivation.ImmortalLogic.minorTribulationPowerExponent() },
      { id: "materialControl", name: "御物", group: "仙道", target: "magicTreasure", layer: "sourceMultiplier", value: state.materialControlUnlocked ? 5 : 1 },
      { id: "wanYaoFan", name: "仙道·万妖幡", group: "宝物", target: "magicTreasure", layer: "sourceMultiplier", celestialFiveDecline: true, value: add(ONE, mul(state.treasureImprints.wanYaoFan, 0.003)) },
      { id: "trueSpiritTransformation", name: "真灵变", group: "仙道", target: "mana", layer: "regionMultiplier", value: 1 + 0.6 * state.trueSpiritTransformationLevel },
      { id: "qiChallengeMana", name: "炼气层数", group: "炼气十万年", target: "mana", layer: "regionMultiplier", value: state.activeChallenge === "qiRefiningHundredThousandYears" ? WIS.Cultivation.ImmortalLogic.qiLayerManaMultiplier() : 1 },
      { id: "qiChallengeReward", name: "炼气十万年奖励", group: "仙道挑战", target: "breathing", layer: "sourceMultiplier", value: WIS.Cultivation.ImmortalLogic.qiChallengeReward() },
      { id: "auraControl", name: "操控灵气", group: "仙道", target: "breathing", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["power"], value: (current) => current.auraControlUnlocked ? WIS.Cultivation.ImmortalLogic.auraControlPotentialMultiplier(current.power) : 1 },
      { id: "immortalRealmDivine", name: "仙界神通", group: "仙道", target: "breathing", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["joules"], value: (current) => current.immortalRealmDivineAbilityUnlocked ? WIS.Cultivation.ImmortalLogic.immortalRealmDivineAbilityPotentialMultiplier(current.joules) : 1 },
      { id: "voidRefiningToQi", name: "炼虚为气", group: "仙道", target: "breathing", layer: "sourceExponent", value: state.voidRefiningToQiUnlocked ? 1.06 : 1 },
      { id: "secondNascentSoul", name: "第二元婴", group: "仙道", target: "circulation", layer: "sourceMultiplier", value: state.secondNascentSoulUnlocked ? 1.8 : 1 },
      { id: "silverTadpole", name: "银蝌文", group: "仙道", target: "exploration", layer: "sourceExponent", value: state.silverTadpoleScriptUnlocked ? 1.06 : 1 },
      { id: "spiritWorldAscension", name: "飞升灵界", group: "仙道", target: "exploration", layer: "regionMultiplier", value: state.spiritWorldAscensionUnlocked ? WIS.Core.Config.exploration.spiritWorldAscensionMultiplier : 1 },
      { id: "flyingEscape", name: "飞遁", group: "仙道", target: "exploration", layer: "sourceMultiplier", value: state.flyingEscapeUnlocked ? 10 : 1 },
      { id: "mysteriousGreenBottle", name: "仙道·神秘绿瓶", group: "宝物", target: "exploration", layer: "sourceMultiplier", celestialFiveDecline: true, value: add(ONE, mul(state.treasureImprints.mysteriousGreenBottle, 0.02)) },
      { id: "divineSense", name: "神识", group: "仙道", target: "explorationAmount", layer: "sourceMultiplier", value: state.divineSenseUnlocked ? 1.25 : 1 },
      { id: "spiritRefiningArt", name: "炼神术", group: "仙道", target: "manaJ", layer: "sourceExponent", value: state.spiritRefiningArtUnlocked ? 1.06 : 1 },
      { id: "realmMana", name: "境界奖励", group: "境界", target: "mana", layer: "regionMultiplier", value: state.qiRefiningUnlocked ? Math.pow(1.2, realmLevel(state)) : 1 },
      { id: "rootMana", name: state.qiRefiningUnlocked ? rootDefinition(state).name : "下品灵根", group: "灵根", target: "mana", layer: "regionMultiplier", value: state.qiRefiningUnlocked ? rootDefinition(state).manaMultiplier : 1 },
      { id: "immortalLifeMana", name: "仙道贵生", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.immortalLifeUnlocked ? 1.1 : 1 },
      { id: "manaLiquefactionMana", name: "法力液化", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.manaLiquefactionUnlocked ? 0.8 : 1 },
      { id: "manaSolidificationMana", name: "法力固化", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.manaSolidificationUnlocked ? 0.9 : 1 },
      { id: "techniqueMana", name: "功法", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.techniqueUnlocked ? 1.5 : 1 },
      { id: "naturalTreasureMana", name: "天材地宝", group: "宝物", target: "mana", layer: "regionMultiplier", celestialFiveDecline: true, value: WIS.Cultivation.ImmortalLogic.naturalTreasureManaMultiplier() },
      { id: "tianNiPearlMana", name: "仙道·天逆珠", group: "宝物", target: "mana", layer: "regionMultiplier", celestialFiveDecline: true, value: WIS.Cultivation.ImmortalLogic.tianNiPearlManaMultiplier() },
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
      { id: "descendRealm", name: "降界", group: "仙道", target: "immortalTreasureChance", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["power"], value: (current) => current.descendRealmUnlocked ? WIS.Cultivation.ImmortalLogic.descendRealmPotentialTreasureMultiplier(current.power) : 1 },
      { id: "nascentSoulCompletion", name: "元婴大成", group: "仙道", target: "circulation", layer: "sourceExponent", value: state.nascentSoulCompletionUnlocked ? 1.08 : 1 },
      { id: "goldenSealScript", name: "金篆文", group: "仙道", target: "mana", layer: "regionMultiplier", value: state.goldenSealScriptUnlocked ? 8 : 1 },
      { id: "mysticHeavenSpiritSlayingSword", name: "仙道·玄天斩灵剑", group: "宝物", target: "magicTreasure", layer: "sourceExponent", celestialFiveDecline: true, value: WIS.Cultivation.ImmortalLogic.mysticHeavenSpiritSlayingSwordExponent() },
      { id: "ascendImmortalWorldTreasure", name: "飞升仙界", group: "真仙", target: "immortalTreasureChance", layer: "sourceMultiplier", value: state.advancedRealmLevel >= 6 ? 3 : 1 },
      { id: "undyingPrimordialSpirit", name: "不灭元神", group: "真仙", target: "circulation", layer: "sourceExponent", value: state.undyingPrimordialSpiritUnlocked ? 1.03 : 1 },
      { id: "immortalAperturePower", name: "仙窍", group: "真仙", target: "immortalPower", layer: "regionMultiplier", value: WIS.Cultivation.ImmortalLogic.immortalApertureLevelMultiplier() },
      { id: "immortalApertureMilestonePower", name: "仙窍里程碑", group: "真仙", target: "immortalPower", layer: "regionMultiplier", value: WIS.Cultivation.ImmortalLogic.immortalApertureMilestoneMultiplier() },
      { id: "xuanImmortalBody", name: "玄仙之躯", group: "真仙", target: "brahmaDemonArt", layer: "sourceExponent", value: state.xuanImmortalBodyUnlocked ? 1.4 : 1 },
      { id: "lawImmortalPower", name: "法则", group: "真仙", target: "immortalPower", layer: "regionMultiplier", dynamic: true, dynamicResources: ['mana'], value: (current) => WIS.Cultivation.ImmortalLogic.lawImmortalPowerMultiplier(current.mana) },
      { id: "spiritCaptureReturn", name: "摄灵返源", group: "金仙", target: "immortalPower", layer: "regionMultiplier", dynamic: true, dynamicResources: ['immortalPower'], value: (current) => WIS.Cultivation.ImmortalLogic.spiritCaptureReturnMultiplier(current.immortalPower) },
      { id: "fiveElementsTreasurePower", name: "仙道·五行至宝", group: "宝物", target: "immortalPower", layer: "regionMultiplier", celestialFiveDecline: true, value: WIS.Cultivation.ImmortalLogic.fiveElementsTreasureMultiplierBeforeDecline() },
      { id: "immortalCrystalPower", name: "仙晶", group: "宝物", target: "immortalPower", layer: "regionMultiplier", value: WIS.Cultivation.ImmortalLogic.immortalCrystalMultiplier() },
      { id: "indestructibleDharmaBody", name: "法体不灭", group: "金仙", target: "brahmaDemonArt", layer: "sourceExponent", value: state.indestructibleDharmaBodyUnlocked ? 1.55 : 1 },
      { id: "spiritDomainWorldTransformation", name: "灵域化界", group: "太乙", target: "spiritDomain", layer: "sourceMultiplier", value: state.spiritDomainWorldTransformationUnlocked ? WIS.Core.Config.immortalPower.spiritDomain.worldMultiplier : 1 },
      { id: "soulQualitativeChange", name: "神魂质变", group: "太乙", target: "breathing", layer: "sourceMultiplier", dynamic: true, dynamicResources: ['immortalPower'], value: (current) => WIS.Cultivation.ImmortalLogic.soulQualitativeChangeMultiplier(current.immortalPower) }
      ,{ id: "trinity", name: "三位一体", group: "大罗", target: "immortalPower", layer: "regionMultiplier", dynamic: true, dynamicResources: ["joules"], value: (current) => WIS.Cultivation.ImmortalLogic.trinityImmortalPowerMultiplier(current.joules) }
      ,{ id: "unityWithDao", name: "与道合真", group: "大罗", target: "immortalPower", layer: "regionExponent", dynamic: true, dynamicResources: ['immortalPower'], value: (current) => WIS.Cultivation.ImmortalLogic.unityWithDaoExponent(current.immortalPower) }
      ,{ id: "lawCrystalFilament", name: "法则晶丝", group: "大罗", target: "power", layer: "regionExponent", dynamic: true, dynamicResources: ['mana'], value: (current) => WIS.Cultivation.ImmortalLogic.lawCrystalFilamentPowerExponent(current.mana) }
    ];
    return WIS.Cultivation.Xiuzhen?.qiPathSealed(state)
      ? list.filter(e => ["宝物", "灵根", "境界", "炼气十万年", "仙道挑战"].includes(e.group) || e.id === "minorTribulationPower")
      : list;
  }

  WIS.Core.Effects.register("immortal", effects, { highestPowerEffects: [] });
  WIS.Core.Effects.register("xiuzhen", state => WIS.Cultivation.Xiuzhen?.effects(state) ?? [], { highestPowerEffects: [] });

  let passiveManaRollAccumulator = 0;
  let baLingChiRollAccumulator = 0;

  function resultFromSettlement(state, automaticMana, { writeRates = true } = {}) {
    const mana = automaticMana.mana;
    const immortalPower = automaticMana.immortalPower;
    const processedSeconds = Math.max(0, Number(automaticMana.processedSeconds) || 0);
    const rates = {
      manaPerSecond: processedSeconds > 0 ? div(mana, processedSeconds) : ZERO,
      immortalPowerPerSecond: processedSeconds > 0 ? div(immortalPower, processedSeconds) : ZERO,
      passiveTreasureManaPerSecond: processedSeconds > 0 ? div(automaticMana.passiveMana, processedSeconds) : ZERO,
      automaticExplorationManaPerSecond: processedSeconds > 0 ? div(automaticMana.explorationMana, processedSeconds) : ZERO
    };
    if (writeRates) Object.assign(WIS.tmp.rates, rates);
    state.lifetimeTotalMana = add(state.lifetimeTotalMana, mana);
    state.currentRebirthTotalMana = add(state.currentRebirthTotalMana, mana);
    state.lifetimeTotalImmortalPower = add(state.lifetimeTotalImmortalPower, immortalPower);
    state.currentRebirthTotalImmortalPower = add(state.currentRebirthTotalImmortalPower, immortalPower);
    return {
      mana,
      immortalPower,
      immortalPowerActiveSeconds: automaticMana.immortalPowerActiveSeconds,
      processedSeconds,
      remainingSeconds: automaticMana.remainingSeconds,
      eventCommitted: automaticMana.eventCommitted === true,
      discreteEvent: automaticMana.event ?? automaticMana.instantEvent ?? null,
      rates
    };
  }

  function planAutomaticGain(_state, elapsedSeconds, projectedContext = {}) {
    const result = WIS.Cultivation.ImmortalLogic.planAutomaticManaGain(elapsedSeconds, projectedContext);
    // All Xiuzhen sources sample the same pre-commit state. Feedback starts on the next logical frame.
    if (WIS.Cultivation.Xiuzhen && !result.instantEvent)
      result.xiuzhen = WIS.Cultivation.Xiuzhen.plan(_state, result.processedSeconds || 0);
    return result;
  }

  function commitAutomaticGain(state, plan, options = {}) {
    const xiuzhen = WIS.Cultivation.Xiuzhen?.prepare(state, plan.xiuzhen);
    const result = resultFromSettlement(
      state,
      WIS.Cultivation.ImmortalLogic.commitAutomaticManaGain(plan, options),
      plan?.instantEvent ? { ...options, writeRates: false } : options
    );
    if (xiuzhen && xiuzhen !== state.cultivation.systems.immortal.xiuzhen) {
      state.cultivation.systems.immortal.xiuzhen = xiuzhen; WIS.Core.Effects.invalidate();
    }
    return { ...result, xiuzhen: plan.xiuzhen };
  }

  function update(state, elapsedSeconds, options = {}) {
    return resultFromSettlement(
      state,
      WIS.Cultivation.ImmortalLogic.automaticManaGainProgressive(elapsedSeconds, options)
    );
  }

  function rollPassiveManaTreasure(elapsedSeconds, _passiveManaRate, silentTreasureRolls = false) {
    if (!gt(WIS.Cultivation.ImmortalLogic.circulationManaPerSecond(), ZERO)) return ZERO;
    return WIS.Cultivation.ImmortalLogic.rollTianNiPearlAttempts(elapsedSeconds, silentTreasureRolls);
  }

  function rollCirculationTreasure(state, elapsedSeconds, silentTreasureRolls = false) {
    if (!gt(WIS.Cultivation.ImmortalLogic.circulationManaPerSecond(), ZERO) || state.heavenlyTreasureLevel < 2) return ZERO;
    return WIS.Cultivation.ImmortalLogic.rollBaLingChiAttempts(elapsedSeconds, silentTreasureRolls);
  }

  function rollImmortalPowerTreasure(state, activeSeconds, silentTreasureRolls = false) {
    WIS.Meta.TreasureProgress.ensure(state);
    const elapsed = Math.max(0, Number(activeSeconds) || 0);
    if (!(elapsed > 0)) return ZERO;
    return add(
      WIS.Cultivation.ImmortalLogic.rollImmortalCrystalAttempts(elapsed, silentTreasureRolls),
      WIS.Cultivation.ImmortalLogic.rollFiveElementsTreasureAttempts(elapsed, silentTreasureRolls)
    );
  }

  function resetTransient() {
    passiveManaRollAccumulator = 0;
    baLingChiRollAccumulator = 0;
  }

  function snapshotTreasureTransient() {
    return { passiveManaRollAccumulator, baLingChiRollAccumulator };
  }

  function restoreTreasureTransient(snapshot = {}) {
    passiveManaRollAccumulator = Math.max(0, Number(snapshot.passiveManaRollAccumulator) || 0);
    baLingChiRollAccumulator = Math.max(0, Number(snapshot.baLingChiRollAccumulator) || 0);
  }

  const system = WIS.Core.Registries.cultivationSystems.register({
    id: "immortal", name: "仙道", resource: "mana", realms, realmLevel, realmName,
    getResources: (state) => ({ mana: state.mana, immortalPower: state.immortalPower }),
    getActions: WIS.Cultivation.ImmortalLogic.getActionIds,
    getAbilities: WIS.Cultivation.ImmortalLogic.getAbilityIds,
    getEffects: effects, planAutomaticGain, commitAutomaticGain,
    effectCacheStatistics: () => ({...effectCacheCounts}),
    getState: (state) => WIS.Core.State.domainView(state).cultivation.systems.immortal,
    reset: (type) => WIS.Core.Reset.describe(type),
    rollPassiveManaTreasure, rollCirculationTreasure, rollImmortalPowerTreasure,
    snapshotTreasureTransient, restoreTreasureTransient, resetTransient,
    getManaPerSecond: WIS.Cultivation.ImmortalLogic.getManaPerSecond,
    performAction: WIS.Cultivation.ImmortalLogic.performAction,
    buyAbility: WIS.Cultivation.ImmortalLogic.buyAbility,
    autoUpgrade: WIS.Cultivation.ImmortalLogic.autoUpgrade,
    autoBreakthrough: WIS.Cultivation.ImmortalLogic.autoBreakthrough,
    update
  });
  WIS.Cultivation.Immortal = system;
}(window.WIS));
