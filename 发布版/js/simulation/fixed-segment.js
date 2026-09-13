(function defineFixedSegment(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, R = WIS.Core.Runtime, E = WIS.Core.Effects, S = WIS.Core.State;
  const clock = () => performance.now();
  let collecting = null;
  let statistics = { segments:0, onlineTicks:0, offlineGameSeconds:0, onlineGameSeconds:0, operations:0, sourceMs:0, rewardMs:0, automationMs:0, maxUnitMs:0, maxWorkMs:0 };
  // Opt-in, bounded summaries only; attempts (including rolled-back work) count
  // as cost, while confirmed game-time counters retain transaction semantics.
  let profiling=false, costRows=Object.create(null), onlineDebt=null;
  function recordCost(name,elapsed) {
    if(!profiling)return;
    if(!costRows[name]&&Object.keys(costRows).length>=64)return;
    const row=costRows[name] ||= {calls:0,totalMs:0,maxMs:0};
    row.calls++;row.totalMs+=elapsed;row.maxMs=Math.max(row.maxMs,elapsed);
  }
  const diagnostics=Object.freeze({
    enable(value=true){profiling=value===true;}, enabled:()=>profiling,
    record:recordCost,
    measure(name,fn){if(!profiling)return fn();const began=clock();try{return fn();}finally{recordCost(name,clock()-began);}},
    debt(seconds){if(!profiling)return;const now=clock();
      if(!onlineDebt)onlineDebt={first:seconds,last:seconds,max:seconds,samples:0,firstAt:now,lastAt:now};
      onlineDebt.last=seconds;onlineDebt.max=Math.max(onlineDebt.max,seconds);onlineDebt.samples++;onlineDebt.lastAt=now;},
    summary:()=>({enabled:profiling,costs:Object.fromEntries(Object.entries(costRows).map(([k,v])=>[k,{...v}])),onlineDebt:onlineDebt&&{...onlineDebt}}),
    reset(){costRows=Object.create(null);onlineDebt=null;}
  });
  const prepared = new WeakMap();
  function collectCandidates(kind, candidates, defaultResource, operationsPerTick) {
    if (!collecting) return false;
    // Fixed category/list order is the published end-segment priority. Capture
    // eligibility BEFORE income/rewards; no newly unlocked chain in this unit.
    collecting.push({kind, defaultResource, operationsPerTick,
      candidates:candidates.filter(c => c.available())});
    return true;
  }
  function prepare(state, seconds, options = {}) {
    const started = clock();
    WIS.Meta.TreasureProgress.ensure(state);
    WIS.Cultivation.ExplorationProgress.ensure(state);
    const snapshot = options.borrowSources ? state : S.cloneForSimulation(state);
    const sources = WIS.Simulation.FixedSources.query(snapshot), groups = [];
    const plan = WIS.Simulation.FixedSources.calculate(snapshot, sources.rates, seconds, sources.processes, sources.caps);
    R.withState(snapshot, () => E.withIsolatedState(snapshot, () => {
      const previous=collecting; collecting=groups;
      try {options.runAchievementAutomations?.();} finally {collecting=previous;}
    }));
    const cultivation = {...sources.cultivation};
    for (const key of ["passiveMana","explorationMana","explorationAmount"]) cultivation[key]=B.mul(cultivation[key],seconds);
    Object.assign(cultivation, { mana:plan.gains.mana, immortalPower:plan.gains.immortalPower,
      completed:true, processedSeconds:seconds, elapsedSeconds:seconds, remainingSeconds:0,
      immortalPowerActiveSeconds:B.gt(plan.gains.immortalPower,0)?seconds:0,
      xiuzhen:{xianForce:plan.gains.xianForce,yuanForce:plan.gains.yuanForce},
      finalExplorationLoad:B.add(snapshot.minorTribulationExplorationLoad,cultivation.explorationAmount) });
    // Use the public tribulation preview for its actual load law (including
    // realm restrictions); its changed exponent is only used next segment.
    if (B.gt(cultivation.explorationAmount,0)) R.withState(snapshot,()=>E.withIsolatedState(snapshot,()=> {
      const preview=WIS.Cultivation.ImmortalLogic.minorTribulationPreviewForExploration(cultivation.explorationAmount);
      cultivation.finalExplorationLoad=preview.nextLoad;
    }));
    const bigNumbers = R.withState(snapshot,()=>E.withIsolatedState(snapshot,()=>
      WIS.Meta.BigNumbers?.syncUnlock(snapshot) ? WIS.Meta.BigNumbers.prepare(snapshot,seconds,{fixedSources:true,
        powerAt:offset=>B.add(snapshot.power,B.mul(sources.rates.power,offset))}) : null));
    const sourceMs=clock()-started;statistics.sourceMs+=sourceMs;recordCost("sourcePreparation",sourceMs);
    return { snapshot, seconds, sources, groups, plan, cultivation, bigNumbers, options, started };
  }
  // Apply only the fields changed by a real public purchase in its isolated
  // cost/qualification domain. Unrelated rewards, clocks and other purchases
  // on the candidate state survive; resource debits include their signed tails.
  function installChanges(target, before, after) {
    for (const key of Object.keys(after)) {
      const a=before?.[key], b=after[key];
      if (a===b || B.isDecimal(a)&&B.isDecimal(b)&&B.eq(a,b)) continue;
      if (b && typeof b === "object" && !B.isDecimal(b) && !Array.isArray(b) && a && typeof a === "object") {
        installChanges(target[key],a,b);
      } else if (JSON.stringify(a)!==JSON.stringify(b)) target[key]=b;
    }
  }
  function copySpendable(from,to) {
    // Copy end-unit available assets, while all discounts, qualifications and
    // caps are still the start snapshot. Each candidate changes its OWN levels.
    to.core.resources = {...from.core.resources};
    to.cultivation.systems.immortal.resources = {...from.cultivation.systems.immortal.resources};
    const x=from.cultivation.systems.immortal.xiuzhen;
    if(x) {
      const n=to.cultivation.systems.immortal.xiuzhen;
      n.resources=Object.fromEntries(Object.entries(x.resources).map(([key,value])=>[key,
        Object.fromEntries(Object.entries(value).map(([field,item])=>[field,Array.isArray(item)?item.slice():item]))]));
      for(const k of ["manaSpent","manaSpentResidual","manaDebitResidual"]) n[k]=Array.isArray(x[k])?x[k].slice():x[k];
    }
  }
  function* runAutomations(state, unit) {
    const frames=unit.options.automationOpportunities ?? Math.max(1,Math.ceil(unit.seconds/WIS.Core.Config.fixedSettlement.discreteCadenceSeconds-1e-9));
    let count=0;
    for (const group of unit.groups) {
      let opportunities=frames*group.operationsPerTick;
      for (const candidate of group.candidates) {
        const began=clock();
        if (opportunities<=0) break;
        const base=unit.options.borrowSources ? S.shallowBranch(unit.snapshot) : S.cloneForSimulation(unit.snapshot);
        if(unit.options.borrowSources){base.core={...base.core};base.cultivation={...base.cultivation,systems:{...base.cultivation.systems,immortal:{...base.cultivation.systems.immortal,xiuzhen:{...base.cultivation.systems.immortal.xiuzhen}}}};}
        copySpendable(state,base);
        const draft=unit.options.borrowSources ? S.createDraft(base) : null;
        const shadow=draft?draft.state:base;
        const before=draft?base:S.toSerializable(shadow);
        let operations=0, purchased=0;
        R.withState(shadow,()=>E.withIsolatedState(shadow,()=> {
          if (candidate.runOn) { purchased=Number(candidate.runOn(shadow))||0;operations=purchased?1:0; }
          else if (candidate.run) {purchased=Number(candidate.run())||0;operations=purchased?1:0;}
          else if (candidate.buyMax) {purchased=Number(candidate.buyMax())||0;operations=purchased?1:0;}
          else while (operations<opportunities && candidate.available()) {
            const key=candidate.resourceKey || group.defaultResource, cost=B.BN(candidate.cost());
            if(!cost.isFinite() || !cost.gt(0)) throw Error("自动购买成本无效；本段未提交");
            const paid=["joules","power"].includes(key) ? WIS.Core.Resources.spend(key,cost)
              : WIS.Core.Resources.spendSystem("immortal",key,cost);
            if(!paid) break;
            candidate.apply(); operations++; purchased++;
          }
        }));
        if(operations) {installChanges(state,before,draft?draft.finish():S.toSerializable(shadow));opportunities-=operations;count+=purchased;}
        const automationMs=clock()-began;statistics.automationMs+=automationMs;recordCost("automation",automationMs);
        yield;
      }
    }
    return count;
  }
  function* commitParts(state, unit, options = {}) {
    const {seconds,sources,plan,cultivation}=unit;
    const power=WIS.Core.Registries.getActivePower(state), immortal=WIS.Core.Registries.getActiveCultivation(state);
    power?.commitAutomaticGains?.(state,{joules:plan.gains.joules,power:plan.gains.power,
      rates:{joulesPerSecond:sources.rates.joules,powerPerSecond:sources.rates.power}},{writeRates:!options.projection});
    immortal?.commitAutomaticGain?.(state,cultivation,{writeRates:!options.projection,skipTreasureRolls:true});
    for(const [key,debit] of Object.entries(plan.debits)) if(B.gt(debit,0)) {
      const paid=["joules","power"].includes(key)?WIS.Core.Resources.spend(key,debit):WIS.Core.Resources.spendSystem("immortal",key,debit);
      if(!paid) throw Error("固定持续消耗无法提交；本段未提交");
    }
    yield;
    let gainedPearls=B.ZERO;
    if(!unit.options.skipTreasureRolls) {
      for(const reward of sources.rewards) if(reward.eligible&&(B.gt(reward.units,0)||WIS.Meta.TreasureProgress.hasUnsettled(state,reward.key))) {
        const began=clock();
        const gained=WIS.Meta.TreasureProgress.advanceFixed(state,reward.key,B.mul(reward.units,seconds),reward);
        if(reward.key==="tianNiPearl") gainedPearls=gained;
        const rewardMs=clock()-began;statistics.rewardMs+=rewardMs;recordCost("treasure:"+reward.key,rewardMs);
        yield;
      }
      const progress=state.explorationRewards, incoming=B.gt(cultivation.explorationAmount,0);
      if(sources.natural.eligible && (incoming||progress?.natural?.length)) {
        const began=clock();
        diagnostics.measure("naturalTreasure",()=>WIS.Cultivation.ExplorationProgress.natural(state,cultivation.explorationAmount,sources.natural));
        statistics.rewardMs+=clock()-began;
        yield;
      }
      if(sources.seizeEligible && !state.unlockedAchievements?.seizeFoundation && (incoming||progress?.seize?.length)) {
        const began=clock();
        diagnostics.measure("seizeFoundation",()=>WIS.Cultivation.ExplorationProgress.seize(state,cultivation.explorationAmount));
        statistics.rewardMs+=clock()-began;
        yield;
      }
    }
    const operations=yield* runAutomations(state,unit);
    if(unit.bigNumbers) state.meta.bigNumbers=unit.bigNumbers;
    E.invalidate();
    for(const key of WIS.Simulation.FixedSources.keys) WIS.tmp.rates[key+"PerSecond"]=sources.rates[key];
    return {gainedPearls,resourceGains:plan.gains,operations};
  }
  function confirm(unit,result,workMs) {
    if(unit.options.offline) {statistics.segments++;statistics.offlineGameSeconds+=unit.seconds;}
    else {statistics.onlineTicks++;statistics.onlineGameSeconds+=unit.seconds;}
    statistics.operations+=result.operations;
    statistics.maxUnitMs=Math.max(statistics.maxUnitMs,workMs);
  }
  function commit(state,unit,options={}) {
    const iterator=commitParts(state,unit,options);
    let next;
    do {next=iterator.next();} while(!next.done);
    confirm(unit,next.value,clock()-unit.started);
    return next.value;
  }
  function createWork(state,seconds,options) {
    const candidate=S.cloneForSimulation(state), roots=[state.core,state.powerSystem,state.cultivation,state.meta];
    let unit, parts, closed=false, workMs=0;
    return {
      advance(deadline) {
        if(closed) throw Error("固定段候选已失效");
        let next;
        do {
          const began=clock(),rates={...WIS.tmp.rates};
          try {next=R.withState(candidate,()=>R.withProjection(()=>R.withOfflineExecution(()=>
            E.withIsolatedState(candidate,()=> {
              if(!unit) {unit=prepare(candidate,seconds,options);parts=commitParts(candidate,unit,{projection:true});return {done:false};}
              return parts.next();
            }))));}
          finally {
            for(const key of Object.keys(WIS.tmp.rates))if(!Object.hasOwn(rates,key))delete WIS.tmp.rates[key];
            Object.assign(WIS.tmp.rates,rates);
          }
          const cost=clock()-began;workMs+=cost;statistics.maxWorkMs=Math.max(statistics.maxWorkMs,cost);
          if(next.done) {
            closed=true;
            const token=Object.freeze({kind:"fixed-segment-v1",seconds});
            prepared.set(token,{candidate,roots,unit,result:next.value,workMs});
            return {done:true,token};
          }
        } while(clock()<deadline);
        return {done:false};
      },
      close(){closed=true;}
    };
  }
  function takePrepared(token,state) {
    const value=prepared.get(token);
    if(!value || value.roots.some((root,i)=>root!==[state.core,state.powerSystem,state.cultivation,state.meta][i]))
      throw Error("固定段的起始状态已改变；重新准备后才能提交");
    prepared.delete(token);
    return value;
  }
  function installPrepared(state,value) {
    // Time registration may happen while candidate work yields. It is neither
    // candidate income nor a formula effect: preserve the live watermark/quota.
    const runtime=state.core.runtime;
    Object.assign(state,S.toSerializable(value.candidate));
    state.core.runtime=runtime;
    confirm(value.unit,value.result,value.workMs);
    return value.result;
  }
  WIS.Simulation.FixedSegment=Object.freeze({diagnostics,collectCandidates,prepare,commit,commitParts,confirm,createWork,
    confirmOnlineSegment(seconds,result,workMs){statistics.onlineTicks+=result.compatibilitySubsteps||Math.ceil(seconds/WIS.Core.Config.fixedSettlement.discreteCadenceSeconds-1e-9);
      statistics.onlineGameSeconds+=seconds;statistics.operations+=result.operations;statistics.maxUnitMs=Math.max(statistics.maxUnitMs,workMs);},takePrepared,installPrepared,
    confirmed:()=>({segments:statistics.segments,onlineTicks:statistics.onlineTicks,offlineGameSeconds:statistics.offlineGameSeconds,onlineGameSeconds:statistics.onlineGameSeconds,operations:statistics.operations}),
    restoreConfirmed:point=>{if(point)Object.assign(statistics,point);},
    metrics:()=>({...statistics,sourceEvaluations:WIS.Simulation.FixedSources.evaluations()}),
    resetMetrics:()=>{for(const k of Object.keys(statistics))statistics[k]=0;WIS.Simulation.FixedSources.resetMetrics();} });
}(window.WIS));
