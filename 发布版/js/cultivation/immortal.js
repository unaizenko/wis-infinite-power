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
  const fullDynamic=(current,key)=>WIS.Core.Amount?.enabled()?WIS.Core.Effects.dynamicResourceQuantity(current,key):current[key];
  function effects(state) {
    // Only descriptor/static coefficients are reused. Resource-dependent
    // functions and celestial-decline transforms still resolve against the
    // current projected resources in Effects; clocks/exponents remain in the
    // original source formulas. A crystal affects this provider's one base
    // multiplier, BEFORE those exponents and the downstream mana suppression.
    if (!WIS.Core.Runtime.isOfflineExecution()) return buildEffects(state);
    const immortal=state.cultivation.systems.immortal;
    const withoutCrystal=box=>Object.fromEntries(Object.entries(box||{}).filter(([k])=>k!=='immortalCrystal'));
    const signature=JSON.stringify([WIS.Core.Amount?.enabled()===true,WIS.Core.Runtime.getMathPolicy(),state.cultivation.active,immortal.abilities,immortal.persistent,state.explorationRewards?.levelResidual,
      state.qiRefiningUnlocked,state.foundationUnlocked,state.goldenCoreUnlocked,state.advancedRealmLevel,
      state.currentQiLayer,state.bestQiLayer,state.activeChallenge,state.challengeCompletions,
      state.unlockedAchievements,state.highestScaleIndex,immortal.xiuzhen?.realm,immortal.xiuzhen?.entered,
      withoutCrystal(state.meta.treasures),withoutCrystal(state.meta.treasureStockResidual)]);
    const crystal=WIS.Core.Amount?.enabled()?JSON.stringify(WIS.Core.Amount.serialize(WIS.Meta.Treasures.quantity(state,'immortalCrystal'))):String(WIS.Meta.Treasures.count(state,'immortalCrystal'));
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
  const immortalEffectsSteps=Symbol('immortal effects');
  function buildEffects(state) {
    return WIS.Core.Effects.runFrozenSteps(state,immortalEffectsSteps,()=>buildEffectSteps(state));
  }
  // Resolve treasure coefficients only when their target is queried. The existing
  // Effects snapshot owns reuse; preserve the requested candidate and challenge mask.
  function deferredTreasureMultiplier(current, name) {
    const view = WIS.Cultivation.Xiuzhen?.qiPathSealed(current) ? WIS.Cultivation.Xiuzhen.abilityView(current) : current;
    return WIS.Cultivation.ImmortalLogic.withImmortalState(view, WIS.Cultivation.ImmortalLogic[name]);
  }
  function* buildEffectSteps(state) {
    if (state.cultivation?.active !== "immortal") return [];
    state=yield ()=>WIS.Cultivation.Xiuzhen?.qiPathSealed(state)?WIS.Cultivation.Xiuzhen.abilityView(state):state;
    const achievement=yield ()=>WIS.Meta.Achievements?.greatHeavenlyVenerableMultiplier(state) ?? ONE;
    const list=[];
    list.push(yield ()=>({ id:"greatHeavenlyVenerableMana", name:"大天尊", group:"仙道成就", target:"mana", layer:"regionMultiplier", value:achievement }));
    list.push(yield ()=>({ id:"greatHeavenlyVenerablePower", name:"大天尊", group:"仙道成就", target:"immortalPower", layer:"regionMultiplier", value:achievement }));
    list.push(yield ()=>({ id: "immortalLife", name: "仙道贵生", group: "仙道", target: "power", layer: "regionMultiplier", value: state.immortalLifeUnlocked ? 0.95 : 1 }));
    list.push(yield ()=>({ id: "techniqueJoules", name: "功法", group: "仙道", target: "joules", layer: "regionMultiplier", value: state.techniqueUnlocked ? 1.5 : 1 }));
    list.push(yield ()=>({ id: "qiSpell", name: "炼气法术", group: "仙道", target: "power", layer: "regionMultiplier", value: levelMultiplier(state.qiSpellLevel, 1.08) }));
    list.push(yield ()=>({ id: "foundationSpell", name: "筑基法术", group: "仙道", target: "power", layer: "regionMultiplier", value: levelMultiplier(state.foundationSpellLevel, 1.5) }));
    list.push(yield ()=>({ id: "manaSolidification", name: "法力固化", group: "仙道", target: "power", layer: "regionMultiplier", value: state.manaSolidificationUnlocked ? 1.15 : 1 }));
    list.push(yield ()=>({ id: "greatCultivator", name: "大修士", group: "仙道", target: "joules", layer: "regionMultiplier", value: state.greatCultivatorUnlocked ? levelMultiplier(realmLevel(state), 1.5) : 1 }));
    list.push(yield ()=>({ id: "immortalFitnessBase", name: "仙道健身能力", group: "仙道", target: "fitness", layer: "baseMultiplier", value: WIS.Cultivation.ImmortalLogic.immortalFitnessBaseMultiplier() }));
    list.push(yield ()=>({ id: "equalHeavenFitness", name: "寿与天齐", group: "仙道", target: "fitness", layer: "sourceMultiplier", value: WIS.Cultivation.ImmortalLogic.equalHeavenLongevityFitnessMultiplier() }));
    list.push(yield ()=>({ id: "baLingChiFitness", name: "仙道·八灵尺", group: "宝物", target: "fitness", layer: "sourceMultiplier", celestialFiveDecline: true, value: current => deferredTreasureMultiplier(current, "baLingChiFitnessMultiplier") }));
    list.push(yield ()=>({ id: "immortalFitnessLevelCap", name: "仙道健身上限", group: "仙道", target: "fitnessLevelCap", layer: "sourceAdditive", value: WIS.Cultivation.ImmortalLogic.immortalFitnessLevelCapBonus() }));
    list.push(yield ()=>({ id: "minorTribulationPower", name: "小天劫", group: "仙道", target: "power", layer: "regionExponent", value: WIS.Cultivation.ImmortalLogic.minorTribulationPowerExponent() }));
    list.push(yield ()=>({ id: "materialControl", name: "御物", group: "仙道", target: "magicTreasure", layer: "sourceMultiplier", value: state.materialControlUnlocked ? 5 : 1 }));
    list.push(yield ()=>({ id: "wanYaoFan", name: "仙道·万妖幡", group: "宝物", target: "magicTreasure", layer: "sourceMultiplier", celestialFiveDecline: true, value:WIS.Core.Amount?.enabled()?WIS.Meta.Treasures.affineValue(state,'wanYaoFan',.003,1):add(ONE,mul(state.treasureImprints.wanYaoFan,.003)) }));
    list.push(yield ()=>({ id: "trueSpiritTransformation", name: "真灵变", group: "仙道", target: "mana", layer: "regionMultiplier", value: 1 + 0.6 * state.trueSpiritTransformationLevel }));
    list.push(yield ()=>({ id: "qiChallengeMana", name: "炼气层数", group: "炼气十万年", target: "mana", layer: "regionMultiplier", value: state.activeChallenge === "qiRefiningHundredThousandYears" ? WIS.Cultivation.ImmortalLogic.qiLayerManaMultiplier() : 1 }));
    list.push(yield ()=>({ id: "qiChallengeReward", name: "炼气十万年奖励", group: "仙道挑战", target: "breathing", layer: "sourceMultiplier", value: WIS.Cultivation.ImmortalLogic.qiChallengeReward() }));
    list.push(yield ()=>({ id: "auraControl", name: "操控灵气", group: "仙道", target: "breathing", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["power"], value: (current) => current.auraControlUnlocked ? WIS.Cultivation.ImmortalLogic.auraControlPotentialMultiplier(fullDynamic(current,'power')) : 1 }));
    list.push(yield ()=>({ id: "immortalRealmDivine", name: "仙界神通", group: "仙道", target: "breathing", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["joules"], value: (current) => current.immortalRealmDivineAbilityUnlocked ? WIS.Cultivation.ImmortalLogic.immortalRealmDivineAbilityPotentialMultiplier(fullDynamic(current,'joules')) : 1 }));
    list.push(yield ()=>({ id: "voidRefiningToQi", name: "炼虚为气", group: "仙道", target: "breathing", layer: "sourceExponent", value: state.voidRefiningToQiUnlocked ? 1.06 : 1 }));
    list.push(yield ()=>({ id: "secondNascentSoul", name: "第二元婴", group: "仙道", target: "circulation", layer: "sourceMultiplier", value: state.secondNascentSoulUnlocked ? 1.8 : 1 }));
    list.push(yield ()=>({ id: "silverTadpole", name: "银蝌文", group: "仙道", target: "exploration", layer: "sourceExponent", value: state.silverTadpoleScriptUnlocked ? 1.06 : 1 }));
    list.push(yield ()=>({ id: "spiritWorldAscension", name: "飞升灵界", group: "仙道", target: "exploration", layer: "regionMultiplier", value: state.spiritWorldAscensionUnlocked ? WIS.Core.Config.exploration.spiritWorldAscensionMultiplier : 1 }));
    list.push(yield ()=>({ id: "flyingEscape", name: "飞遁", group: "仙道", target: "exploration", layer: "sourceMultiplier", value: state.flyingEscapeUnlocked ? 10 : 1 }));
    list.push(yield ()=>({ id: "mysteriousGreenBottle", name: "仙道·神秘绿瓶", group: "宝物", target: "exploration", layer: "sourceMultiplier", celestialFiveDecline: true, value:WIS.Core.Amount?.enabled()?WIS.Meta.Treasures.affineValue(state,'mysteriousGreenBottle',.02,1):add(ONE,mul(state.treasureImprints.mysteriousGreenBottle,.02)) }));
    list.push(yield ()=>({ id: "divineSense", name: "神识", group: "仙道", target: "explorationAmount", layer: "sourceMultiplier", value: state.divineSenseUnlocked ? 1.25 : 1 }));
    list.push(yield ()=>({ id: "spiritRefiningArt", name: "炼神术", group: "仙道", target: "manaJ", layer: "sourceExponent", value: state.spiritRefiningArtUnlocked ? 1.06 : 1 }));
    list.push(yield ()=>({ id: "realmMana", name: "境界奖励", group: "境界", target: "mana", layer: "regionMultiplier", value: state.qiRefiningUnlocked ? Math.pow(1.2, realmLevel(state)) : 1 }));
    list.push(yield ()=>({ id: "rootMana", name: state.qiRefiningUnlocked ? rootDefinition(state).name : "下品灵根", group: "灵根", target: "mana", layer: "regionMultiplier", value: state.qiRefiningUnlocked ? rootDefinition(state).manaMultiplier : 1 }));
    list.push(yield ()=>({ id: "immortalLifeMana", name: "仙道贵生", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.immortalLifeUnlocked ? 1.1 : 1 }));
    list.push(yield ()=>({ id: "manaLiquefactionMana", name: "法力液化", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.manaLiquefactionUnlocked ? 0.8 : 1 }));
    list.push(yield ()=>({ id: "manaSolidificationMana", name: "法力固化", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.manaSolidificationUnlocked ? 0.9 : 1 }));
    list.push(yield ()=>({ id: "techniqueMana", name: "功法", group: "仙道能力", target: "mana", layer: "regionMultiplier", value: state.techniqueUnlocked ? 1.5 : 1 }));
    list.push(yield ()=>({ id: "naturalTreasureMana", name: "天材地宝", group: "宝物", target: "mana", layer: "regionMultiplier", celestialFiveDecline: true, value: current => deferredTreasureMultiplier(current, "naturalTreasureManaMultiplier") }));
    list.push(yield ()=>({ id: "tianNiPearlMana", name: "仙道·天逆珠", group: "宝物", target: "mana", layer: "regionMultiplier", celestialFiveDecline: true, value: current => deferredTreasureMultiplier(current, "tianNiPearlManaMultiplier") }));
    list.push(yield ()=>({ id: "perfectedTechnique", name: "功法大成", group: "仙道", target: "circulation", layer: "sourceMultiplier", value: state.perfectedTechniqueUnlocked ? 1.5 : 1 }));
    list.push(yield ()=>({ id: "dualInfantUnity", name: "双婴合一", group: "仙道", target: "circulation", layer: "sourceExponent", value: state.dualInfantUnityUnlocked ? 1.08 : 1 }));
    list.push(yield ()=>({ id: "heavenEarthAura", name: "天地元气", group: "仙道", target: "breathingJCurve", layer: "sourceAdditive", value: state.heavenEarthAuraUnlocked ? 0.25 : 0 }));
    list.push(yield ()=>({ id: "divineAbilityMastery", name: "神通通神", group: "仙道", target: "mana", layer: "regionMultiplier", value: state.divineAbilityMasteryUnlocked ? 2.5 : 1 }));
    list.push(yield ()=>({ id: "auraIntoBody", name: "元气入体", group: "仙道", target: "fitness", layer: "sourceMultiplier", value: state.auraIntoBodyUnlocked ? 20 : 1 }));
    list.push(yield ()=>({ id: "auraIntoBodyCap", name: "元气入体", group: "仙道", target: "fitnessLevelCap", layer: "sourceAdditive", value: state.auraIntoBodyUnlocked ? 40 : 0 }));
    list.push(yield ()=>({ id: "externalIncarnation", name: "身外化身", group: "仙道", target: "brahmaDemonArt", layer: "sourceMultiplier", value: state.externalIncarnationUnlocked ? 5 : 1 }));
    list.push(yield ()=>({ id: "demonRealmJourneyExploration", name: "魔界之游", group: "仙道", target: "exploration", layer: "sourceMultiplier", value: state.demonRealmJourneyUnlocked ? 5 : 1 }));
    list.push(yield ()=>({ id: "demonRealmJourneyTreasure", name: "魔界之游", group: "仙道", target: "immortalTreasureChance", layer: "sourceMultiplier", value: state.demonRealmJourneyUnlocked ? 3 : 1 }));
    list.push(yield ()=>({ id: "returnToOrigin", name: "返本归元", group: "仙道", target: "joules", layer: "regionExponent", value: state.returnToOriginUnlocked ? 1.02 : 1 }));
    list.push(yield ()=>({ id: "perfectedTechniqueCompletion", name: "功法圆满", group: "仙道", target: "circulation", layer: "sourceMultiplier", value: state.perfectedTechniqueCompletionUnlocked ? 1.5 : 1 }));
    list.push(yield ()=>({ id: "descendRealm", name: "降界", group: "仙道", target: "immortalTreasureChance", layer: "sourceMultiplier", dynamic: true, dynamicResources: ["power"], value: (current) => current.descendRealmUnlocked ? WIS.Cultivation.ImmortalLogic.descendRealmPotentialTreasureMultiplier(fullDynamic(current,'power')) : 1 }));
    list.push(yield ()=>({ id: "nascentSoulCompletion", name: "元婴大成", group: "仙道", target: "circulation", layer: "sourceExponent", value: state.nascentSoulCompletionUnlocked ? 1.08 : 1 }));
    list.push(yield ()=>({ id: "goldenSealScript", name: "金篆文", group: "仙道", target: "mana", layer: "regionMultiplier", value: state.goldenSealScriptUnlocked ? 8 : 1 }));
    list.push(yield ()=>({ id: "mysticHeavenSpiritSlayingSword", name: "仙道·玄天斩灵剑", group: "宝物", target: "magicTreasure", layer: "sourceExponent", celestialFiveDecline: true, value: WIS.Cultivation.ImmortalLogic.mysticHeavenSpiritSlayingSwordExponent() }));
    list.push(yield ()=>({ id: "ascendImmortalWorldTreasure", name: "飞升仙界", group: "真仙", target: "immortalTreasureChance", layer: "sourceMultiplier", value: state.advancedRealmLevel >= 6 ? 3 : 1 }));
    list.push(yield ()=>({ id: "undyingPrimordialSpirit", name: "不灭元神", group: "真仙", target: "circulation", layer: "sourceExponent", value: state.undyingPrimordialSpiritUnlocked ? 1.03 : 1 }));
    list.push(yield ()=>({ id: "immortalAperturePower", name: "仙窍", group: "真仙", target: "immortalPower", layer: "regionMultiplier", value: WIS.Cultivation.ImmortalLogic.immortalApertureLevelMultiplier() }));
    list.push(yield ()=>({ id: "immortalApertureMilestonePower", name: "仙窍里程碑", group: "真仙", target: "immortalPower", layer: "regionMultiplier", value: WIS.Cultivation.ImmortalLogic.immortalApertureMilestoneMultiplier() }));
    list.push(yield ()=>({ id: "xuanImmortalBody", name: "玄仙之躯", group: "真仙", target: "brahmaDemonArt", layer: "sourceExponent", value: state.xuanImmortalBodyUnlocked ? 1.4 : 1 }));
    list.push(yield ()=>({ id: "lawImmortalPower", name: "法则", group: "真仙", target: "immortalPower", layer: "regionMultiplier", dynamic: true, dynamicResources: ['mana'], value: (current) => WIS.Cultivation.ImmortalLogic.lawImmortalPowerMultiplier(fullDynamic(current,'mana')) }));
    list.push(yield ()=>({ id: "spiritCaptureReturn", name: "摄灵返源", group: "金仙", target: "immortalPower", layer: "regionMultiplier", dynamic: true, dynamicResources: ['immortalPower'], value: (current) => WIS.Cultivation.ImmortalLogic.spiritCaptureReturnMultiplier(fullDynamic(current,'immortalPower')) }));
    list.push(yield ()=>({ id: "fiveElementsTreasurePower", name: "仙道·五行至宝", group: "宝物", target: "immortalPower", layer: "regionMultiplier", celestialFiveDecline: true, value: current => deferredTreasureMultiplier(current, "fiveElementsTreasureMultiplierBeforeDecline") }));
    list.push(yield ()=>({ id: "immortalCrystalPower", name: "仙晶", group: "宝物", target: "immortalPower", layer: "regionMultiplier", value: current => deferredTreasureMultiplier(current, "immortalCrystalMultiplier") }));
    list.push(yield ()=>({ id: "indestructibleDharmaBody", name: "法体不灭", group: "金仙", target: "brahmaDemonArt", layer: "sourceExponent", value: state.indestructibleDharmaBodyUnlocked ? 1.55 : 1 }));
    list.push(yield ()=>({ id: "spiritDomainWorldTransformation", name: "灵域化界", group: "太乙", target: "spiritDomain", layer: "sourceMultiplier", value: state.spiritDomainWorldTransformationUnlocked ? WIS.Core.Config.immortalPower.spiritDomain.worldMultiplier : 1 }));
    list.push(yield ()=>({ id: "soulQualitativeChange", name: "神魂质变", group: "太乙", target: "breathing", layer: "sourceMultiplier", dynamic: true, dynamicResources: ['immortalPower'], value: (current) => WIS.Cultivation.ImmortalLogic.soulQualitativeChangeMultiplier(fullDynamic(current,'immortalPower')) }));
    list.push(yield ()=>({ id: "trinity", name: "三位一体", group: "大罗", target: "immortalPower", layer: "regionMultiplier", dynamic: true, dynamicResources: ["joules"], value: (current) => WIS.Cultivation.ImmortalLogic.trinityImmortalPowerMultiplier(fullDynamic(current,'joules')) }));
    list.push(yield ()=>({ id: "unityWithDao", name: "与道合真", group: "大罗", target: "immortalPower", layer: "regionExponent", dynamic: true, dynamicResources: ['immortalPower'], value: (current) => WIS.Cultivation.ImmortalLogic.unityWithDaoExponent(fullDynamic(current,'immortalPower')) }));
    list.push(yield ()=>({ id: "lawCrystalFilament", name: "法则晶丝", group: "大罗", target: "power", layer: "regionExponent", dynamic: true, dynamicResources: ['mana'], value: (current) => WIS.Cultivation.ImmortalLogic.lawCrystalFilamentPowerExponent(fullDynamic(current,'mana')) }));
    return yield ()=>WIS.Cultivation.Xiuzhen?.qiPathSealed(state)
      ? list.filter(e => ["宝物", "灵根", "境界", "炼气十万年", "仙道挑战", "仙道成就"].includes(e.group) || e.id === "minorTribulationPower")
      : list;
  }

  WIS.Core.Effects.register("immortal", effects, { highestPowerEffects: [] });
  WIS.Core.Effects.register("xiuzhen", state => WIS.Cultivation.Xiuzhen?.effects(state, { deferValues: true }) ?? [], { highestPowerEffects: [] });

  let passiveManaRollAccumulator = 0;
  let baLingChiRollAccumulator = 0;

  function drainGainParts(steps){let next=steps.next();while(!next.done)next=steps.next(next.value());return next.value;}
  function resultFromSettlement(state,automaticMana,options={}){return drainGainParts(resultFromSettlementParts(state,automaticMana,options));}
  function* resultFromSettlementParts(state, automaticMana, { writeRates = true } = {}) {
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
    yield WIS.Core.State.addStatisticOperation(state,"lifetimeTotalMana",WIS.Core.Amount?.enabled()&&automaticMana.quantities?automaticMana.quantities.mana:mana);
    yield WIS.Core.State.addStatisticOperation(state,"currentRebirthTotalMana",WIS.Core.Amount?.enabled()&&automaticMana.quantities?automaticMana.quantities.mana:mana);
    yield WIS.Core.State.addStatisticOperation(state,"lifetimeTotalImmortalPower",WIS.Core.Amount?.enabled()&&automaticMana.quantities?automaticMana.quantities.immortalPower:immortalPower);
    yield WIS.Core.State.addStatisticOperation(state,"currentRebirthTotalImmortalPower",WIS.Core.Amount?.enabled()&&automaticMana.quantities?automaticMana.quantities.immortalPower:immortalPower);
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
    if (WIS.Cultivation.Xiuzhen && !result.instantEvent)
      result.sheng = WIS.Cultivation.Xiuzhen.captureSheng(_state);
    return result;
  }

  function commitAutomaticGain(state,plan,options={}){return drainGainParts(commitAutomaticGainParts(state,plan,options));}
  function* commitAutomaticGainParts(state, plan, options = {}) {
    const xiuzhen = yield WIS.Cultivation.Xiuzhen.prepareOperation(state, plan.xiuzhen);
    const mana=yield* WIS.Cultivation.ImmortalLogic.commitAutomaticManaGainParts(plan,options);
    const result = yield* resultFromSettlementParts(
      state,
      mana,
      plan?.instantEvent ? { ...options, writeRates: false } : options
    );
    if (!options.skipTreasureRolls) yield ()=>WIS.Cultivation.Xiuzhen?.awardOrigin(state,plan.xiuzhen);
    if (xiuzhen && xiuzhen !== state.cultivation.systems.immortal.xiuzhen) {
      state.cultivation.systems.immortal.xiuzhen = xiuzhen; WIS.Core.Effects.invalidate();
    }
    if (!options.skipTreasureRolls && plan.sheng)
      yield ()=>WIS.Cultivation.Xiuzhen.awardSheng(state,result.processedSeconds,plan.sheng);
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
    getEffects: effects, planAutomaticGain, commitAutomaticGain, commitAutomaticGainParts,
    highMultiverseEligible: state => WIS.Cultivation.Xiuzhen.fifthStepActive(state),
    highMultiverseVisible: state => WIS.Cultivation.Xiuzhen.available(state) && WIS.Cultivation.Xiuzhen.get(state).realm >= 12,
    highMultiverseInitialQuantity:state=>WIS.Cultivation.Xiuzhen.quantity(state,'multiverseCoefficient'),
    highMultiverseInitialCoefficient: state => WIS.Cultivation.Xiuzhen.amount(state,"multiverseCoefficient"),
    highMultiverseRate: state => WIS.Cultivation.Xiuzhen.highMultiverseRawRate(state),
    highMultiverseMultiplier: state => WIS.Cultivation.Xiuzhen.abilityMultiplier(state,"originMultiverse"),
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

