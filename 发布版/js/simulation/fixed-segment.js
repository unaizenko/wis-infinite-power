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
    WIS.Simulation.Profiler?.record(name,elapsed);
    if(!profiling)return;
    if(!costRows[name]&&Object.keys(costRows).length>=64)return;
    const row=costRows[name] ||= {calls:0,totalMs:0,maxMs:0};
    row.calls++;row.totalMs+=elapsed;row.maxMs=Math.max(row.maxMs,elapsed);
  }
  const diagnostics=Object.freeze({
    enable(value=true){profiling=value===true;}, enabled:()=>profiling,
    record:recordCost,
    measure(name,fn){if(!profiling&&!WIS.Simulation.Profiler.enabled())return fn();const began=clock();try{return fn();}finally{recordCost(name,clock()-began);}},
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
    return R.withState(state,()=>E.withFrozenState(state,()=>prepareProfile(state,seconds,options)));
  }
  function prepareProfile(state, seconds, options = {}) {
    const started = clock();
    options.onPhase?.("retained-progress");
    WIS.Meta.TreasureProgress.ensure(state);
    WIS.Cultivation.ExplorationProgress.settleRetained(state);
    options.onPhase?.("snapshot");
    const snapshot = options.borrowSources ? state : S.cloneForSimulation(state);
    options.onPhase?.("rates");
    const sources = options.sourceProfile || WIS.Simulation.FixedSources.query(snapshot,options.compiledResources ? {resourceProfile:options.compiledResources(snapshot)} : {}), groups = [];
    options.onPhase?.("gains");
    const plan = WIS.Simulation.FixedSources.calculate(snapshot, sources.rates, seconds, sources.processes, sources.caps);
    if(options.mapPlan)plan.gains=options.mapPlan.gains;
    R.withState(snapshot, () => E.withFrozenState(snapshot, () => {
      const previous=collecting; collecting=groups;
      try {if(!options.offline)options.runAchievementAutomations?.();} finally {collecting=previous;}
    }));
    const cultivation = {...sources.cultivation};
    for (const key of ["passiveMana","explorationMana","explorationAmount"]) cultivation[key]=B.mul(cultivation[key],seconds);
    if(options.mapPlan?.progressTotals) cultivation.explorationAmount=options.mapPlan.progressTotals.$exploration;
    Object.assign(cultivation, { mana:plan.gains.mana, immortalPower:plan.gains.immortalPower,
      completed:true, processedSeconds:seconds, elapsedSeconds:seconds, remainingSeconds:0,
      immortalPowerActiveSeconds:B.gt(plan.gains.immortalPower,0)?seconds:0,
      xiuzhen:{xianForce:plan.gains.xianForce,yuanForce:plan.gains.yuanForce},
      finalExplorationLoad:B.add(snapshot.minorTribulationExplorationLoad,cultivation.explorationAmount) });
    // Use the public tribulation preview for its actual load law (including
    // realm restrictions); its changed exponent is only used next segment.
    if (B.gt(cultivation.explorationAmount,0)) R.withState(snapshot,()=>E.withFrozenState(snapshot,()=> {
      const preview=WIS.Cultivation.ImmortalLogic.minorTribulationPreviewForExploration(cultivation.explorationAmount);
      cultivation.finalExplorationLoad=preview.nextLoad;
    }));
    const bigNumbers = R.withState(snapshot,()=>E.withFrozenState(snapshot,()=>
      WIS.Meta.BigNumbers?.syncUnlock(snapshot) ? WIS.Meta.BigNumbers.prepare(snapshot,seconds,options.offline ? {fixedSources:true,offlineSnapshot:true} : {fixedSources:false,
        powerAt:((offset)=>B.add(snapshot.power,B.mul(sources.rates.power,offset)))}) : null));
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
  function* runQiCooperatively(callback) {
    const I=WIS.Cultivation.ImmortalLogic;
    // Foreground's atomic owner catches the signal and rolls back the entire
    // step. Recovery already owns a private generator: yield within that owner.
    if(I.hasQiBatchScope() || !R.isProjection())return callback();
    const scope={};
    for(;;) {
      try {return I.withQiBatchScope(scope,callback);}
      catch(error) {
        const work=I.qiDeferredWork(error);
        if(!work)throw error;
        do {yield;if(!work.result())work.advance();}while(!work.result());
      }
    }
  }
  function* runAutomations(state, unit) {
    if(unit.options.offline) {
      let count=0;
      // End-state purchases may enable each other, but never recompute this
      // segment's income. Yield between passes while the candidate stays private.
      while(true) {
        const began=clock();
        E.invalidate();
        // Qi is the first realm operation, before any other automation mutates
        // this pass. Its deferred signal therefore permits retrying this pass;
        // arbitrary automation failures are never caught/retried here.
        const changes=yield* runQiCooperatively(()=>R.withState(state,()=>Number(unit.options.runAchievementAutomations?.())||0));
        const unlocked=unit.options.afterAutomation?.(state)===true;
        statistics.automationMs+=clock()-began;
        if(!(changes>0)&&!unlocked)break;
        count+=changes;yield;
      }
      return count;
    }
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
        yield* runQiCooperatively(()=>R.withState(shadow,()=>E.withIsolatedState(shadow,()=> {
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
        })));
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
    unit.options.onPhase?.("continuous-commit");
    power?.commitAutomaticGains?.(state,{joules:plan.gains.joules,power:plan.gains.power,
      rates:{joulesPerSecond:sources.rates.joules,powerPerSecond:sources.rates.power}},{writeRates:!options.projection,powerPeak:options.powerPeak});
    immortal?.commitAutomaticGain?.(state,cultivation,{writeRates:!options.projection,skipTreasureRolls:true});
    WIS.Simulation.ResourceGroups.commitAdditional(state,plan.gains);
    for(const [key,debit] of Object.entries(plan.debits)) if(B.gt(debit,0)) {
      const paid=["joules","power"].includes(key)?WIS.Core.Resources.spend(key,debit):WIS.Core.Resources.spendSystem("immortal",key,debit);
      if(!paid) throw Error("固定持续消耗无法提交；本段未提交");
    }
    yield;
    unit.options.onPhase?.("progress-settlement");
    let gainedPearls=B.ZERO;
    if(!unit.options.skipTreasureRolls) {
      for(const reward of sources.rewards) if(reward.eligible&&(B.gt(reward.units,0)||WIS.Meta.TreasureProgress.hasUnsettled(state,reward.key))) {
        const began=clock();
        const progress=unit.options.mapPlan?.progressTotals?.[reward.key];
        const gained=WIS.Simulation.Profiler.measure('treasure.'+reward.key,()=>WIS.Meta.TreasureProgress.advanceFixed(state,reward.key,progress??B.mul(reward.units,seconds),progress===undefined?reward:{...reward,gain:B.ONE}));
        if(reward.key==="tianNiPearl") gainedPearls=gained;
        const rewardMs=clock()-began;statistics.rewardMs+=rewardMs;recordCost("treasure:"+reward.key,rewardMs);
        yield;
      }
      const progress=state.explorationRewards, incoming=B.gt(cultivation.explorationAmount,0);
      const mappedNaturalCap=unit.options.mapPlan?.naturalCap;
      const naturalEligible=sources.natural.eligible||(mappedNaturalCap!=null&&unit.snapshot.goldenCoreUnlocked&&
        B.gt(mappedNaturalCap,unit.snapshot.naturalTreasureLevel));
      if(naturalEligible && (incoming||progress?.natural?.length||
          progress?.version===2&&B.gte(progress.natural.carry,progress.natural.remaining))) {
        const began=clock();
        diagnostics.measure("naturalTreasure",()=>WIS.Cultivation.ExplorationProgress.natural(state,cultivation.explorationAmount,mappedNaturalCap==null?sources.natural:{...sources.natural,eligible:naturalEligible,cap:[mappedNaturalCap]}));
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
    unit.options.onPhase?.("end-events");
    if(unit.options.offline) {
      if(unit.bigNumbers)state.meta.bigNumbers=unit.bigNumbers;
      WIS.Meta.BigNumbers?.syncMilestones(state);
      unit.options.beforeEndEvents?.(state,seconds);
    }
    const operations=yield* runAutomations(state,unit);
    if(!unit.options.offline&&unit.bigNumbers) state.meta.bigNumbers=unit.bigNumbers;
    E.invalidate();
    for(const key of WIS.Simulation.FixedSources.keys) WIS.tmp.rates[key+"PerSecond"]=sources.rates[key];
    unit.options.onPhase?.("next-state");
    return {gainedPearls,resourceGains:plan.gains,operations};
  }
  function confirm(unit,result,workMs) {
    if(unit.options.offline) {statistics.segments++;statistics.offlineGameSeconds+=unit.seconds;}
    else {statistics.onlineTicks++;statistics.onlineGameSeconds+=unit.seconds;}
    statistics.operations+=result.operations;
    statistics.maxUnitMs=Math.max(statistics.maxUnitMs,workMs);
  }
  function commit(state,unit,options={}) {
    const started=clock();
    const iterator=commitParts(state,unit,options);
    let next;
    do {next=iterator.next();} while(!next.done);
    confirm(unit,next.value,clock()-unit.started);WIS.Simulation.Profiler.record('settlementBody',clock()-started);
    return next.value;
  }
  function createWork(state,seconds,options) {
    const candidate=S.cloneForSimulation(state), roots=[state.core,state.powerSystem,state.cultivation,state.meta];
    const mathPolicy=options.offline===true ? R.MathPolicy.OFFLINE_APPROX : R.MathPolicy.ONLINE_EXACT;
    R.withMathPolicy(mathPolicy,()=>R.withState(candidate,()=>R.withOfflineExecution(()=>E.withIsolatedState(candidate,()=>WIS.Cultivation.ExplorationProgress.settleRetained(candidate)))));
    let unit, parts, closed=false, workMs=0;
    const evolution=options.evolutionPlan?WIS.Simulation.ContinuousExecutor.create(seconds,options.evolutionPlan).prepare(candidate):null;let evolved=null;
    return {
      advance(deadline) {
        if(closed) throw Error("固定段候选已失效");
        let next;
        do {
          const began=clock(),rates={...WIS.tmp.rates};
          try {next=R.withMathPolicy(mathPolicy,()=>R.withState(candidate,()=>R.withProjection(()=>R.withOfflineExecution(()=>
            E.withIsolatedState(candidate,()=> {
              if(evolution&&!evolved){const outcome=evolution.runInterval(seconds,deadline);if(!outcome.done)return {done:false};evolved=outcome.result;
                options={...options,mapPlan:{gains:evolved.gains,progressTotals:evolved.progressTotals,resourceOnly:true}};}
              const settlementStarted=clock();
              try {if(!unit) {
                unit=prepare(candidate,seconds,{...options,borrowSources:true});
                parts=commitParts(candidate,unit,{projection:true});return {done:false};
              }
              return parts.next();
              } finally {WIS.Simulation.Profiler.withScope('offline',()=>WIS.Simulation.Profiler.record("settlementWallMs",clock()-settlementStarted));}
            })))));}
          finally {
            for(const key of Object.keys(WIS.tmp.rates))if(!Object.hasOwn(rates,key))delete WIS.tmp.rates[key];
            Object.assign(WIS.tmp.rates,rates);
          }
          const cost=clock()-began;workMs+=cost;statistics.maxWorkMs=Math.max(statistics.maxWorkMs,cost);
          if(next.done) {
            if(options.mapPlan&&!options.mapPlan.resourceOnly)next.value.mapValidation=WIS.Simulation.DiscreteMap.validate(candidate,options.mapPlan);
            if(evolved){const c=WIS.Simulation.ContinuousPredictor;if(evolved.predictor)evolved.rebasedPoint={...c.observation(candidate,c.query(candidate),evolved.endpoint.position),origin:"settlement"};next.value.evolution=evolved;WIS.Simulation.Profiler.record('settlementCheckpoints');}
            closed=true;
            const token=Object.freeze({kind:"fixed-segment-v1",seconds});
            prepared.set(token,{candidate,roots,unit,result:next.value,workMs,evolution});
            return {done:true,token};
          }
        } while(clock()<deadline);
        return {done:false};
      },
      close(){if(!closed)evolution?.discard();closed=true;}
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
    value.evolution?.commit();
    // Time registration may happen while candidate work yields. It is neither
    // candidate income nor a formula effect: preserve the live watermark/quota.
    const runtime=state.core.runtime, candidateRuntime=value.candidate.core.runtime;
    for(const key of ["core","powerSystem","cultivation","meta"])state[key]=value.candidate[key];
    state.core={...state.core};
    state.core.runtime=value.unit.options.beforeEndEvents ? {...runtime,
      reincarnationElapsedSeconds:candidateRuntime.reincarnationElapsedSeconds,
      currentScaleElapsedSeconds:candidateRuntime.currentScaleElapsedSeconds} : runtime;
    confirm(value.unit,value.result,value.workMs);
    return value.result;
  }

  // Decimal's normalized mag is log10 iterated `layer` times for large
  // positive values. Compare in that finite coordinate, never one fixed log.
  function resourceCoordinate(value) {
    if(!B.isFiniteBN(value)||B.lt(value,0))throw Error('资源坐标必须有限且非负');
    const n=B.BN(value);
    return {layer:n.layer,coordinate:n.sign===0?0:n.mag};
  }
  function compareResourceCoordinates(reference,value) {
    const a=resourceCoordinate(reference),b=resourceCoordinate(value);
    const layerChanged=a.layer!==b.layer;
    return {reference:a,value:b,layerChanged,majorDeviation:layerChanged?true:null,classification:layerChanged?"major-layer-change":"review-coordinate-difference",
      coordinateDelta:layerChanged?null:b.coordinate-a.coordinate,
      normalizedCoordinateDelta:layerChanged?null:(b.coordinate-a.coordinate)/Math.max(1,Math.abs(a.coordinate)),
      // Raw ratios are supplemental only for layer 0/1; never a pass criterion.
      relativeDiagnostic:Math.max(a.layer,b.layer)<=1?String(B.div(B.sub(value,reference),B.max(1,reference))):null};
  }

  function planOffline(state,remaining,options) {return WIS.Simulation.CheckpointStrategy.plan(state,remaining,options);}
  function validateBudget(value) {return WIS.Simulation.CheckpointStrategy.validateBudget(value);}

  WIS.Simulation.FixedSegment=Object.freeze({settlementOrder:Object.freeze(["retained-progress","snapshot","rates","gains","continuous-commit","progress-settlement","end-events","next-state"]),resourceCoordinate,compareResourceCoordinates,planOffline,validateBudget,diagnostics,collectCandidates,prepare,commit,commitParts,confirm,createWork,
    confirmOnlineSegment(seconds,result,workMs){statistics.onlineTicks+=result.compatibilitySubsteps||Math.ceil(seconds/WIS.Core.Config.fixedSettlement.discreteCadenceSeconds-1e-9);
      statistics.onlineGameSeconds+=seconds;statistics.operations+=result.operations;statistics.maxUnitMs=Math.max(statistics.maxUnitMs,workMs);},takePrepared,installPrepared,
    confirmed:()=>({segments:statistics.segments,onlineTicks:statistics.onlineTicks,offlineGameSeconds:statistics.offlineGameSeconds,onlineGameSeconds:statistics.onlineGameSeconds,operations:statistics.operations}),
    restoreConfirmed:point=>{if(point)Object.assign(statistics,point);},
    metrics:()=>({...statistics,sourceEvaluations:WIS.Simulation.FixedSources.evaluations()}),
    resetMetrics:()=>{for(const k of Object.keys(statistics))statistics[k]=0;WIS.Simulation.FixedSources.resetMetrics();} });
}(window.WIS));
