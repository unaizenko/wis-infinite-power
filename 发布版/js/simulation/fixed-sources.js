(function defineFixedSources(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, R = WIS.Core.Runtime, E = WIS.Core.Effects;
  const keys = Object.freeze(["joules", "power", "mana", "immortalPower", "xianForce", "yuanForce"]);
  let evaluations = 0;
  function finite(value, label) {
    const n = B.BN(value);
    if (!n.isFinite() || n.lt(0)) throw Error(`固定来源 ${label} 不是有限非负数；本段未提交`);
    return n;
  }
  // Shared final X/Y source query: no treasure enumeration, income or clocks.
  function xiuzhenRates(snapshot, factor = WIS.Simulation.Compensation.factor()) {
    if (snapshot === R.state) snapshot = R.getState();
    if (snapshot.cultivation.active !== "immortal" || !snapshot.cultivation.systems.immortal.xiuzhen)
      return { xianForce:B.ZERO, yuanForce:B.ZERO };
    return R.withState(snapshot, () => E.withIsolatedState(snapshot, () => {
      const raw = WIS.Cultivation.Xiuzhen.rates(snapshot);
      return Object.fromEntries(["xianForce","yuanForce"].map(key => [key,finite(B.mul(raw[key],factor),key)]));
    }));
  }
  function previewXiuzhen(snapshot, execution) {
    if (execution.paused) return { label:"结算暂停", rates:null };
    // During catch-up, show an estimate from current confirmed assets, not a cached segment rate.
    if (!["online","offline"].includes(execution.source)) return { label:"当前产出暂不展示", rates:null };
    const compensated = execution.source === "online" && execution.compensationEligible === true &&
      execution.clockRatio > 0 && snapshot.core.runtime.compensation.balance > 0;
    return { compensated, rates:xiuzhenRates(snapshot,compensated?2:1),
      label:execution.recovering ? "当前状态预计产出／秒" : execution.source === "offline" ? "本段产出／秒" : "最终有效产出／秒" };
  }
  // The supplied domain is a single start snapshot. This entry never advances
  // clocks, buys anything, reads tmp.rates, or integrates through new balances.
  function query(snapshot) {
    evaluations++;
    return R.withState(snapshot, () => E.withIsolatedState(snapshot, () => {
      const S = WIS.Power.ScaleLogic, I = WIS.Cultivation.ImmortalLogic;
      const X = WIS.Cultivation.Xiuzhen, T = WIS.Meta.Treasures, P = WIS.Meta.TreasureProgress;
      const factor = WIS.Simulation.Compensation.factor();
      const scale = snapshot.powerSystem.active === "scale", immortal = snapshot.cultivation.active === "immortal";
      if (snapshot.powerSystem.active && !scale || snapshot.cultivation.active && !immortal)
        throw Error("当前体系尚无固定来源适配；资产和剩余时间保留");
      const cultivation = immortal ? I.fixedAutomaticSources() : {
        mana:B.ZERO, passiveMana:B.ZERO, explorationMana:B.ZERO,
        immortalPower:B.ZERO, explorationAmount:B.ZERO, circulation:false
      };
      const x = xiuzhenRates(snapshot, factor);
      const rates = {
        joules: scale ? B.mul(S.automaticJSettledPerSecondAt(snapshot.joules), factor) : B.ZERO,
        power: scale ? B.mul(S.automaticPowerSettledPerSecondAt(snapshot.power), factor) : B.ZERO,
        mana: cultivation.mana, immortalPower: cultivation.immortalPower,
        xianForce: x.xianForce, yuanForce: x.yuanForce
      };
      for (const key of keys) rates[key] = finite(rates[key], key);
      const drivers = {
        fitness: scale && B.gt(S.fitnessJBonus(), 0), rock: scale && B.gt(S.rockPowerPerSecond(), 0),
        intent: scale && B.gt(S.ultimateIntentPowerSource(), 0), circulation: cultivation.circulation,
        immortalPower: B.gt(cultivation.immortalPower, 0)
      };
      const rewards = T.keys.map(key => {
        const eligible = P.qualification(snapshot, key) === null;
        if (!eligible) return {key, eligible:false};
        let units = P.explorationKeys.includes(key) ? cultivation.explorationAmount : B.ZERO;
        if (["tianNiPearl", "baLingChi"].includes(key) && drivers.circulation) units = B.add(units,1);
        if (["fitnessMembershipCard", "superLollipop"].includes(key) && drivers.fitness) units = B.add(units,1);
        if (key === "skyCrystal" && drivers.rock || key === "fiveSpiritStone" && drivers.intent ||
            ["immortalCrystal", "fiveElementsTreasure"].includes(key) && drivers.immortalPower ||
            ["cosmicFiber", "cosmicWill"].includes(key)) units = B.add(units,1);
        return { key, eligible, units: finite(units,key),
          // A capped source is fixed at the START demand; later stock still
          // pays its escalating cumulative demand through TreasureProgress.
          gain: finite(B.min(P.unitGain(snapshot,key),P.requirement(key,T.count(snapshot,key))),key),
          award: finite(T.getTreasureAwardMultiplier(snapshot,key),key) };
      });
      const XP=WIS.Cultivation.ExplorationProgress, cap=XP.capWords(snapshot);
      return { rates, cultivation, rewards,
        natural: { eligible: immortal && snapshot.goldenCoreUnlocked && WIS.Meta.TreasureLedger.compare(XP.levelWords(snapshot),cap)<0, cap },
        seizeEligible: immortal && !snapshot.unlockedAchievements?.seizeFoundation,
        // Current six automatic sources have no continuous asset debit.
        // Breathing, training and manual exploration are actions/conversions,
        // deliberately excluded from time sources and compensation.
        processes: [], caps: {} };
    }));
  }
  // General fixed-process contract: a resource-limited process cannot run on
  // missing input, even if its nominal output is positive. Duration remains a
  // Decimal until consumption is computed; no positive-underflow -> full-span.
  function calculate(balances, rates, seconds, processes = [], caps = {}) {
    finite(seconds,"seconds");
    const gains = Object.fromEntries(keys.map(k => [k, finite(B.mul(rates[k] || 0,seconds),k)]));
    const debits = Object.fromEntries(keys.map(k => [k,B.ZERO]));
    const active = [];
    for (const process of processes) {
      let duration = B.BN(seconds);
      for (const [key, rate] of Object.entries(process.consume || {})) {
        finite(rate,key);
        if (B.gt(rate,0)) duration = B.min(duration,B.div(B.max(0,B.sub(balances[key] || 0,debits[key])),rate));
      }
      active.push(duration);
      for (const [key,rate] of Object.entries(process.consume || {})) debits[key]=B.add(debits[key],B.mul(rate,duration));
      for (const [key,rate] of Object.entries(process.produce || {})) gains[key]=finite(B.add(gains[key],B.mul(finite(rate,key),duration)),key);
    }
    for (const [key,cap] of Object.entries(caps)) gains[key]=B.min(gains[key],B.max(0,B.sub(finite(cap,key),B.sub(balances[key] || 0,debits[key]))));
    return {gains,debits,active};
  }
  WIS.Simulation.FixedSources = Object.freeze({ keys, query, calculate, xiuzhenRates, previewXiuzhen,
    evaluations: () => evaluations, resetMetrics: () => {evaluations=0;} });
}(window.WIS));
