(function defineSourcePreview(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, R = WIS.Core.Runtime, E = WIS.Core.Effects;
  const S = WIS.Power.ScaleLogic, I = WIS.Cultivation.ImmortalLogic;
  const labels = { joules: "J", power: "战力", mana: "法力", immortalPower: "仙灵力", xianForce: "仙力", yuanForce: "元力" };
  const unlocks = {
    focus: "focusPurchased", ghostBrain: "ghostBrainPurchased", killingIntent: "killingIntentPurchased",
    elementalization: "elementalizationPurchased", ultimateIntent: "ultimateIntentPurchased",
    magicTreasure: "magicTreasureUnlocked", brahmaDemonArt: "brahmaDemonArtUnlocked",
    spiritDomain: "spiritDomainUnlocked", daoPower: "daoPowerUnlocked", circulation: "circulationUnlocked",
    automaticExploration: "roamSpiritWorldUnlocked"
  };
  const names = {
    baseJ: "基础 J", fitness: "健身", achievement: "成就", killingIntent: "杀气", elementalization: "元素化",
    training: "锻炼", focus: "集中", rock: "打岩", ghostBrain: "鬼脑", ultimateIntent: "极意",
    breathing: "吐纳", circulation: "周天", refineTheVoid: "炼化虚空", exploration: "探寻（合计）",
    explorationNormal: "普通探寻", explorationFuBao: "符宝探寻", automaticExploration: "纵横灵界",
    immortalPower: "仙灵力", xianForce: "仙力", yuanForce: "元力"
  };
  const primary = Object.keys(names);
  const penalty = (resource, gain, state) => WIS.Core.Penalties.applyGoogolPenalty(resource, state[resource], gain, state);
  function query(ids, currentState = R.getState(), { assumeUnlocked = false } = {}) {
    if (currentState === R.state) currentState = R.getState();
    const needsUnlock = assumeUnlocked && (ids || []).some(id =>
      (unlocks[id] && !currentState[unlocks[id]]) ||
      (["xianForce", "yuanForce"].includes(id) && !WIS.Cultivation.Xiuzhen.get(currentState).abilities[id]));
    const state = needsUnlock ? WIS.Core.State.cloneForSimulation(currentState) : currentState;
    if (needsUnlock) for (const id of ids) {
      if (unlocks[id]) state[unlocks[id]] = true;
      if (["xianForce", "yuanForce"].includes(id)) WIS.Cultivation.Xiuzhen.get(state).abilities[id] = true;
    }
    return R.withProjection(() => R.withState(state, () => E.withIsolatedState(state, () => {
      let external, exploration;
      const externalSources = () => external ||= [
        ...WIS.Core.Sources.collect("joules", state),
        ...WIS.Core.Sources.collect("power", state, { fitnessJBonus: S.fitnessJBonus() })
      ];
      const explorationSources = () => {
        if (exploration) return exploration;
        const cost = I.explorationPowerCost(), enabled = I.explorationEnabled() && B.gte(cost, "1e6");
        const amount = enabled ? I.explorationAmountForCost(cost, { cache: false }) : B.ZERO;
        const sources = enabled ? I.explorationManaSources(amount) : [B.ZERO, B.ZERO];
        return exploration = { cost, amount, sources, rawAmount: enabled ? I.rawExplorationAmountForCost(cost) : B.ZERO,
          exponent: I.minorTribulationPreviewForExploration(amount).manaExponent };
      };
      function resourceFinal(resource, raw, id) {
        if (!B.gt(raw, 0)) return B.ZERO;
        if (resource === "joules" || resource === "power") {
          const adjusted = resource === "power" ? S.challengeAdjustedPowerSource(raw, id) : raw;
          const region = resource === "power" ? S.preSoftcapPowerGainFromSources([adjusted]) : S.preSoftcapJGainFromSources([adjusted]);
          const manaSource = id === "manaJ" || id === "qiManaPower";
          return penalty(resource, S.resourceSoftcapSettlementForComponents(
            manaSource ? B.ZERO : region, manaSource ? region : B.ZERO, state[resource]
          ), state);
        }
        return penalty(resource, I.finalManaGainFromSources([raw]), state);
      }
      function one(id) {
        let raw = B.ZERO, final, resource = "power", unit = "秒", extra = [];
        switch (id) {
          case "baseJ": raw = state.powerSystem.active === "scale" ? B.ONE : B.ZERO; resource = "joules"; break;
          case "fitness": raw = S.fitnessJBonus(); resource = "joules"; break;
          case "achievement": raw = S.achievementJBonus(); resource = "joules"; break;
          case "killingIntent": raw = S.killingIntentJBonus(); resource = "joules"; break;
          case "elementalization": raw = S.elementalizationJSource(); resource = "joules"; break;
          case "training": raw = S.trainingPowerSource(); final = S.conversionGain(); unit = "次"; break;
          case "focus": raw = S.focusPowerPerSecond(); break;
          case "rock": raw = S.rockPowerPerSecond(); break;
          case "ghostBrain": raw = S.ghostBrainPowerSource(); break;
          case "ultimateIntent": raw = S.ultimateIntentPowerSource(); break;
          case "breathing": raw = I.breathingManaSource(); final = I.breathingManaGainProgressive(); resource = "mana"; unit = "次"; break;
          case "circulation": raw = I.circulationManaSource(); resource = "mana"; break;
          case "refineTheVoid": raw = I.immortalCultivationActive() && state.qiRefiningUnlocked && state.unlockedAchievements.refineTheVoid ? B.ONE : B.ZERO; resource = "mana"; break;
          case "exploration":
          case "explorationNormal":
          case "explorationFuBao":
          case "automaticExploration": {
            const d = explorationSources(); resource = "mana";
            const automatic = id === "automaticExploration";
            const active = !automatic || state.roamSpiritWorldUnlocked;
            const sources = id === "explorationNormal" ? [d.sources[0]] : id === "explorationFuBao" ? [d.sources[1]] : d.sources;
            raw = active ? B.sum(sources) : B.ZERO; unit = automatic ? "秒" : "次";
            if (automatic) {
              const efficiency = WIS.Core.Config.exploration.automaticEfficiency;
              raw = B.mul(raw, efficiency);
              final = I.getAutomaticExplorationManaRate(state);
              extra = [{ raw: active ? B.mul(d.rawAmount, efficiency) : B.ZERO,
                final: active ? B.mul(d.amount, efficiency) : B.ZERO, rawLabel: "原始探寻量", label: "有效探寻量", unit }];
            } else {
              final = id === "exploration" ? I.explorationManaGainProgressive(d.cost, d.amount, d.exponent)
                : I.previewManaGainProgressive(1, (fraction, mana) => B.mul(
                    I.explorationManaGainFromSources(sources, mana, d.exponent, true), fraction
                  ), { linearBudget: true }).mana;
              if (id === "exploration") extra = [{ raw: d.rawAmount, final: d.amount, rawLabel: "原始探寻量", label: "有效探寻量", unit }];
            }
            break;
          }
          case "immortalPower": raw = I.immortalPowerBasePerSecond(); final = I.immortalPowerPerSecond(); resource = id; break;
          case "xianForce":
          case "yuanForce": {
            resource = id;
            const X = WIS.Cultivation.Xiuzhen;
            final = X.rates(state)[id]; raw = final;
            if (id === "xianForce" && state.activeChallenge === "yinVoidYangReal") {
              const unpenalized = WIS.Core.State.cloneForSimulation(state); unpenalized.activeChallenge = null;
              raw = X.rates(unpenalized)[id];
            }
            break;
          }
          default: {
            const source = externalSources().find(s => s.id === id);
            if (!source) throw Error(`未注册的来源预览：${id}`);
            raw = source.value; resource = source.target;
          }
        }
        if (["power", "joules"].includes(resource) && state.powerSystem.active !== "scale") raw = final = B.ZERO;
        return { id, name: names[id] || externalSources().find(s => s.id === id)?.name || id,
          resource, raw: B.BN(raw), final: B.BN(final ?? resourceFinal(resource, raw, id)), unit, extra };
      }
      return (ids || [...primary, ...externalSources().map(s => s.id)]).map(one);
    })));
  }
  function text(records, format) {
    if (!Array.isArray(records)) records = [records];
    const parts = records.flatMap(r => [{ ...r, label: r.label || labels[r.resource] }, ...(r.extra || [])]);
    const amount = value => B.gt(value, 0) && B.lt(value, "0.001")
      ? B.BN(value).toExponential(3) : format(value);
    const line = key => parts.map(r => `${amount(r[key])} ${key === "raw" ? r.rawLabel || r.label : r.label}/${r.unit}`).join("；");
    return `原始获取：${line("raw")}\n最终获取：${line("final")}`;
  }
  function write(element, ids, format, state, options) {
    if (!element) return;
    element.classList.add("source-gain-preview");
    element.textContent = text(query(Array.isArray(ids) ? ids : [ids], state, options), format);
    element.title = options?.assumeUnlocked ? "未解锁的来源按解锁后预览；最终获取按该来源单独结算。" : "按当前状态单独结算该来源。";
  }
  WIS.UI.SourcePreview = Object.freeze({ query, text, write, names });
}(window.WIS));
