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
  // actionFinals may reuse only exact action results computed synchronously by
  // this caller for currentState. It is ignored for an unlock candidate.
  function query(ids, currentState = R.getState(), { assumeUnlocked = false, includeProcess = false, actionFinals = null } = {}) {
    if (currentState === R.state) currentState = R.getState();
    const needsUnlock = assumeUnlocked && (ids || []).some(id =>
      (unlocks[id] && !currentState[unlocks[id]]) ||
      (["xianForce", "yuanForce"].includes(id) && !WIS.Cultivation.Xiuzhen.get(currentState).abilities[id]));
    const state = needsUnlock ? WIS.Core.State.cloneForSimulation(currentState) : currentState;
    if (needsUnlock) for (const id of ids) {
      if (unlocks[id]) state[unlocks[id]] = true;
      if (["xianForce", "yuanForce"].includes(id)) {
        const domain = state.cultivation.systems.immortal;
        (domain.xiuzhen ||= WIS.Cultivation.Xiuzhen.fresh()).abilities[id] = true;
      }
    }
    return R.withProjection(() => R.withEvaluationState(state, () => {
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
      // Detail-only metadata: use the settlement's current helpers, never final/raw.
      // Source multipliers are already included in raw and must not be applied twice.
      function processFor(id, resource) {
        const steps = [];
        const add = (label, op, value, groups) => steps.push({ label, op, value: B.BN(value), groups });
        const note = label => steps.push({ label, op: "note" });
        const product = values => values.reduce((total, value) => B.mul(total, value), B.ONE);
        const grouped = (label, op, groups, total, bonus = B.ZERO) => {
          const factors = Object.entries(groups).map(([name, effects]) => ({
            name, value: product(effects.map(effect => effect.value))
          })).filter(group => !B.eq(group.value, 1));
          add(label, op, total ?? product(factors.map(group => group.value)), factors);
          if (!B.eq(bonus, 0)) steps[steps.length - 1].bonus = B.BN(bonus);
        };
        const exponent = (label, value) => { if (!B.eq(value, 1)) add(label, "power", value); };
        const time = () => exponent("时间法则", I.daoTimeLawExponent());
        const googol = () => {
          const amount = ["xianForce", "yuanForce"].includes(resource) ? WIS.Cultivation.Xiuzhen.amount(state, resource) : state[resource];
          const value = WIS.Core.Penalties.googolPenaltyMultiplier(resource, amount, state);
          if (!B.eq(value, 1)) add("古戈尔惩罚", "multiply", value);
        };
        if (["joules", "power"].includes(resource)) {
          if (resource === "power") {
            const limit = S.activePowerSourceChallengeExponent(id);
            if (B.lt(limit, 1)) add("来源挑战限制", "shiftedPower", limit);
          }
          grouped("区域倍率", "multiply", resource === "joules" ? S.jMultiplierGroups() : S.powerMultiplierGroups());
          grouped("区域指数", "power", E.groups(resource, "regionExponent", state),
            resource === "joules" ? S.jGainExponent() : S.powerGainExponent());
          exponent("天人衰劫", I.celestialDeclineExponent());
          time();
          const manaSource = id === "manaJ" || id === "qiManaPower";
          const progressive = id === "training";
          add((manaSource && I.qiRefiningChallengeActive() ? "法力来源软上限" : "资源软上限") +
            (progressive ? "（起始指数）" : ""), "softcap",
            S.resourceSoftcapExponent(state[resource], manaSource ? "mana" : "normal"));
          const planet = S.planetSuppressionSoftcapExponent(state[resource]);
          if (!B.eq(planet, 1)) add("星球压制" + (progressive ? "（起始指数）" : ""), "softcap", planet);
          if (progressive) note("单次锻炼按库存变化分段结算软上限，以上为起始参数");
          else googol();
        } else if (resource === "mana") {
          const exploration = ["exploration", "explorationNormal", "explorationFuBao", "automaticExploration"].includes(id);
          const automatic = id === "automaticExploration";
          const progressive = id === "breathing" || (exploration && !automatic);
          if (automatic) add("还原单次探寻来源", "divide", WIS.Core.Config.exploration.automaticEfficiency);
          grouped(progressive ? "法力区域倍率（起始值）" : "法力区域倍率", "multiply", I.manaMultiplierGroups());
          if (id === "breathing") add("主动吐纳重修", "multiply", I.scatterRebuildManaMultiplier());
          grouped("法力区域指数", "power", E.groups("mana", "regionExponent", state),
            B.add(E.product("mana", "regionExponent", state), I.greatLuoManaExponentBonus()), I.greatLuoManaExponentBonus());
          time();
          if (exploration) {
            grouped("探寻区域倍率", "multiply", E.groups("exploration", "regionMultiplier", state));
            grouped("探寻指数", "power", E.groups("exploration", "sourceExponent", state));
            exponent("小天劫", automatic ? I.minorTribulationExplorationManaExponent() : explorationSources().exponent);
          }
          exponent("天人衰劫", I.immortalPowerManaSuppressionExponent());
          if (automatic) add("自动探寻效率", "multiply", WIS.Core.Config.exploration.automaticEfficiency);
          if (!progressive) googol();
          if (progressive) note(`按本次行动的法力变化分段结算，${id === "breathing" ? "吐纳来源衰减与" : ""}境界瓶颈随库存更新；以上为起始参数`);
        } else if (resource === "immortalPower") {
          grouped("仙灵力区域倍率", "multiply", I.immortalPowerMultiplierGroups());
          const groups = { ...E.groups(resource, "regionExponent", state) };
          if (state.activeChallenge === "severSelfCorpse") groups["斩自我尸额外限制"] = [{ value: I.selfCorpseImmortalPowerLimitExponent() }];
          grouped("仙灵力区域指数", "power", groups, I.immortalPowerRegionExponent(),
            B.add(I.goldenNatureImmortalPowerExponentBonus(), I.greatLuoManaExponentBonus()));
          time(); googol();
        } else {
          // Xiuzhen raw includes ability multipliers; the common penalty is final-only.
          googol();
          if (!steps.length) add("来源层之后无额外乘区", "multiply", 1);
        }
        return steps;
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
          case "breathing": raw = I.breathingManaSource(); final = !needsUnlock && actionFinals?.breathing != null ? actionFinals.breathing : I.breathingManaGainProgressive(); resource = "mana"; unit = "次"; break;
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
              final = id === "exploration" ? (!needsUnlock && actionFinals?.exploration != null ? actionFinals.exploration : I.explorationManaGainProgressive(d.cost, d.amount, d.exponent))
                : I.previewManaGainProgressive(1, (fraction, mana) => B.mul(
                    I.explorationManaGainFromSources(sources, mana, d.exponent, true), fraction
                  ), { linearBudget: true, googolPenalty: true }).mana;
              if (id === "exploration") extra = [{ raw: d.rawAmount, final: d.amount, rawLabel: "原始探寻量", label: "有效探寻量", unit }];
            }
            break;
          }
          case "immortalPower": raw = I.immortalPowerBasePerSecond(); final = I.immortalPowerPerSecond(); resource = id; break;
          case "xianForce":
          case "yuanForce": {
            resource = id;
            const X = WIS.Cultivation.Xiuzhen;
            raw = X.rawRates(state)[id]; final = X.rates(state)[id];
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
          resource, raw: B.BN(raw), final: B.BN(final ?? resourceFinal(resource, raw, id)), unit, extra,
          ...(includeProcess ? { process: processFor(id, resource),
            extraProcess: extra.length ? [{ label: "探寻量：神识", op: "multiply", value: B.BN(I.divineSenseMultiplier()) }] : [] } : {}) };
      }
      return (ids || [...primary, ...externalSources().map(s => s.id)]).map(one);
    }));
  }
  function processText(steps, format) {
    const amount = value => B.gt(value, 0) && B.lt(value, "0.001")
      ? WIS.UI.Format.scientificMultiplier(value) : format(value, 5);
    return steps.map(step => {
      if (step.op === "note") return step.label;
      const value = amount(step.value);
      const expression = step.op === "power" ? `^${value}`
        : step.op === "divide" ? `÷${value}`
        : ["softcap", "shiftedPower"].includes(step.op) ? `(1 + x)^${value} − 1` : `×${value}`;
      const factors = (step.groups || []).map(group =>
        `${group.name}${step.op === "power" ? "^" : "×"}${amount(group.value)}`);
      if (step.bonus) factors.push(`指数乘积后加成 +${amount(step.bonus)}`);
      const groups = factors.length ? `〔${factors.join("，")}〕` : "";
      return `${step.label} ${expression}${groups}`;
    }).join(" → ");
  }
  function text(records, format, { includeProcess = false } = {}) {
    if (!Array.isArray(records)) records = [records];
    const parts = records.flatMap(r => [{ ...r, label: r.label || labels[r.resource] }, ...(r.extra || [])]);
    const amount = value => B.gt(value, 0) && B.lt(value, "0.001")
      ? WIS.UI.Format.scientificMultiplier(value) : format(value);
    const line = key => parts.map(r => `${amount(r[key])} ${key === "raw" ? r.rawLabel || r.label : r.label}/${r.unit}`).join("；");
    const process = includeProcess ? `\n乘区：${records.map(r => processText(r.process || [], format) +
      (r.extraProcess?.length ? `；${processText(r.extraProcess, format)}` : "")).join("；")}` : "";
    return `原始获取：${line("raw")}${process}\n最终获取：${line("final")}`;
  }
  function write(element, ids, format, state, options) {
    if (!element) return;
    if (!element.classList.contains("source-gain-preview")) element.classList.add("source-gain-preview");
    const records = query(Array.isArray(ids) ? ids : [ids], state, options);
    const value = text(records, format);
    if (element.textContent !== value) element.textContent = value;
    const title = options?.assumeUnlocked ? "未解锁的来源按解锁后预览；最终获取按该来源单独结算。" : "按当前状态单独结算该来源。";
    if (element.title !== title) element.title = title;
    return records;
  }
  WIS.UI.SourcePreview = Object.freeze({ query, text, write, names });
}(window.WIS));
