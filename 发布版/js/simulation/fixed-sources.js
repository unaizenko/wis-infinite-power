(function defineFixedSources(WIS) {
  "use strict";
  // ACTIVE: query/calculate serve fixed execution. continuousWork is a DIAGNOSTIC reference
  // used by regression tests, not the production fixed executor.
  const B = WIS.Core.BigNum, R = WIS.Core.Runtime, E = WIS.Core.Effects;
  const keys = () => WIS.Simulation.ResourceGroups.keys;
  let evaluations = 0;
  // Progress uses cultivation source descriptors, never the final scale rate.
  const progressDependencies=Object.freeze(["immortal"]);
  function finite(value, label) {
    const n = B.BN(value);
    if (!B.isFiniteBN(value) || !n.isFinite() || n.lt(0)) { const error=Error(`固定来源 ${label} 不是有限非负数；本段未提交`); error.code="formula-representation"; throw error; }
    return n;
  }
  // Shared final X/Y source query: no treasure enumeration, income or clocks.
  function xiuzhenRates(snapshot, factor = WIS.Simulation.Compensation.factor()) {
    if (snapshot === R.state) snapshot = R.getState();
    if (snapshot.cultivation.active !== "immortal" || !snapshot.cultivation.systems.immortal.xiuzhen)
      return { xianForce:B.ZERO, yuanForce:B.ZERO };
    return R.withState(snapshot, () => E.withFrozenState(snapshot, () => {
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
  function query(snapshot, {resourcesOnly=false,resourceProfile=null}={}) {
    evaluations++;
    return R.withState(snapshot, () => E.withFrozenState(snapshot, () => {
      const S = WIS.Power.ScaleLogic, I = WIS.Cultivation.ImmortalLogic;
      const X = WIS.Cultivation.Xiuzhen, T = WIS.Meta.Treasures, P = WIS.Meta.TreasureProgress;
      const factor = WIS.Simulation.Compensation.factor();
      const scale = snapshot.powerSystem.active === "scale", immortal = snapshot.cultivation.active === "immortal";
      if (snapshot.powerSystem.active && !scale || snapshot.cultivation.active && !immortal)
        throw Error("当前体系尚无固定来源适配；资产和剩余时间保留");
      // Resource-only offline evolution already validated these rates at this
      // exact snapshot. Reuse that profile while sampling progress sources.
      const evaluated=resourceProfile||WIS.Simulation.ResourceGroups.evaluate(snapshot,{factor});
      const {rates,cultivation}=evaluated;
      const profile={kind:"ContinuousRateProfile",rates,cultivation,groups:evaluated.groups.map(g=>g.keys)};
      if(resourcesOnly)return profile;
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
      return { ...profile, rewards,
        natural: { eligible: immortal && snapshot.goldenCoreUnlocked, cap },
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
    const gains = Object.fromEntries(keys().map(k => [k, finite(B.mul(rates[k] || 0,seconds),k)]));
    const debits = Object.fromEntries(keys().map(k => [k,B.ZERO]));
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
  function continuousWork(state, seconds, options={}) {
    if(keys().length!==6)throw Error("旧 ODE 诊断只支持原六资源；ResourceGroup 不扩充高维求解");
    const base=options.foregroundSource?options.foregroundSource():state;
    const evaluation=WIS.Core.State.shallowBranch(base);
    evaluation.core={...base.core,resources:{...base.core.resources}};
    evaluation.powerSystem={...base.powerSystem,systems:{...base.powerSystem.systems,
      scale:{...base.powerSystem.systems.scale,progress:{...base.powerSystem.systems.scale.progress}}}};
    evaluation.meta={...base.meta,statistics:{...base.meta.statistics}};
    const immortal=base.cultivation.systems.immortal;
    evaluation.cultivation={...base.cultivation,systems:{...base.cultivation.systems,
      immortal:{...immortal,resources:{...immortal.resources},xiuzhen:{...immortal.xiuzhen,
        resources:Object.fromEntries(Object.entries(immortal.xiuzhen.resources).map(([k,v])=>[k,{...v}]))}}}};
    const initial=Object.fromEntries(keys().map(k=>[k,['xianForce','yuanForce'].includes(k)?WIS.Cultivation.Xiuzhen.amount(state,k):state[k]]));
    const factor=WIS.Simulation.Compensation.factor();
    const rateAt=values=>{
      for(const k of ['joules','power','mana','immortalPower'])evaluation[k]=values[k];
      for(const k of ['xianForce','yuanForce'])evaluation.cultivation.systems.immortal.xiuzhen.resources[k].amount=values[k];
      evaluation.highestPower=B.max(base.highestPower,values.power);
      return R.withState(evaluation,()=>E.withIsolatedState(evaluation,()=>{
        const P=WIS.Power.ScaleLogic,I=WIS.Cultivation.ImmortalLogic,X=WIS.Cultivation.Xiuzhen;
        const scale=evaluation.powerSystem.active==='scale',imm=evaluation.cultivation.active==='immortal';
        const cultivation=imm?I.fixedAutomaticSources(factor):{},xiuzhen=imm?X.rates(evaluation):{};
        return {
          joules:scale?B.mul(P.automaticJSettledPerSecondAt(values.joules),factor):B.ZERO,
          power:scale?B.mul(P.automaticPowerSettledPerSecondAt(values.power),factor):B.ZERO,
          mana:cultivation.mana||B.ZERO,immortalPower:cultivation.immortalPower||B.ZERO,
          xianForce:B.mul(xiuzhen.xianForce||0,factor),yuanForce:B.mul(xiuzhen.yuanForce||0,factor)
        };
      }));
    };
    // Y samples power once per game second. Locate only those sample times;
    // numerical subdivisions never create new samples or discrete opportunities.
    const boundaries=[];
    const numbers=base.meta.bigNumbers;
    const requirement=WIS.Meta.BigNumbers.requirements(base);
    if(numbers?.unlocked||(requirement.cosmic&&requirement.achievement)){
      let boundary=numbers.ySample?.remaining;
      if(!(boundary>1e-10)){
        const fraction=numbers.ySample?0:numbers.elapsedSeconds-Math.floor(numbers.elapsedSeconds);
        boundary=fraction>1e-10?1-fraction:1;
      }
      for(;boundary<seconds-1e-10;boundary+=1)boundaries.push(boundary);
    }
    boundaries.push(seconds);
    const samples=[{time:0,power:initial.power}];
    const gains=Object.fromEntries(keys().map(k=>[k,B.ZERO]));
    let index=0,elapsed=0,values=initial,work=null,result=null,evaluations=0;
    function powerAt(offset){
      const point=samples.find(p=>Math.abs(p.time-offset)<1e-8);
      if(!point)throw Error('Y 秒采样时间缺少连续积分检查点');
      return point.power;
    }
    function snapshot(){
      return result&&{...result,done:index===boundaries.length,
        status:index===boundaries.length?'completed':result.done?'pending':result.status,
        remainingSeconds:String(result.done?seconds-elapsed:B.add(result.remainingSeconds,seconds-boundaries[index])),
        gains:{...gains},
        diagnostics:{...result.diagnostics,evaluations},powerAt};
    }
    return {advance({maximumEvaluations=48,deadline=Infinity}={}){
      const begin=evaluations;
      while(index<boundaries.length&&evaluations-begin<maximumEvaluations&&performance.now()<deadline){
        work ||= WIS.Core.Integration.createAdaptiveWork(values,boundaries[index]-elapsed,rateAt,options);
        const previous=work.snapshot().diagnostics.evaluations;
        result=work.advance({maximumEvaluations:maximumEvaluations-(evaluations-begin),deadline});
        evaluations+=result.diagnostics.evaluations-previous;
        if(!result.done)break;
        for(const k of keys())gains[k]=B.add(gains[k],result.gains[k]);
        values=result.final;elapsed=boundaries[index++];samples.push({time:elapsed,power:values.power});work=null;
      }
      return snapshot()||{done:false,diagnostics:{evaluations:0}};
    },snapshot,sampleRates:current=>rateAt({...initial,...current})};
  }
  WIS.Simulation.FixedSources = Object.freeze({progressDependencies, get keys(){return keys();}, query, calculate, continuousWork, xiuzhenRates, previewXiuzhen,
    evaluations: () => evaluations, resetMetrics: () => {evaluations=0;} });
}(window.WIS));
