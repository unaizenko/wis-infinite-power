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
  function bigNumberOptions(state,sources,options) {
    if(options.offline)return {fixedSources:true,offlineSnapshot:true};
    const A=WIS.Core.Amount;
    if(!A?.enabled())return {fixedSources:false,powerAt:offset=>B.add(state.power,B.mul(sources.rates.power,offset))};
    const power=WIS.Core.Resources.readExact('core.power',state);
    if(!sources.quantities||!Object.prototype.hasOwnProperty.call(sources.quantities,'power'))throw Object.assign(Error('完整战力来源缺失'),{code:'formula-representation'});
    const rate=A.from(sources.quantities.power);
    return {fixedSources:false,powerAt:offset=>A.add(power,A.scale(rate,offset))};
  }
  function prepareProfile(state, seconds, options = {}) {
    const iterator=prepareProfileStages(state,seconds,options);
    try {
      let next=iterator.next();
      while(!next.done)next=iterator.next(next.value());
      return next.value;
    } finally {iterator.return();}
  }
  // Both public paths use these business stages. Only their scope drivers
  // differ: sync keeps prepare's outer state; quantity work retains one frozen
  // snapshot owner across slices. Child arithmetic runs in yielded thunks.
  function* prepareProfileStages(state,seconds,options,scopes=null) {
    if(options.evolutionPlan||options.mapPlan||options.compiledResources)return WIS.Simulation.LegacySettlementCheckpoints.retired();
    const started=clock();
    const retained=()=>{options.onPhase?.('retained-progress');WIS.Meta.TreasureProgress.ensure(state);if(!options.frozenOffline)WIS.Cultivation.ExplorationProgress.settleRetained(state);};
    yield ()=>scopes?R.withState(state,()=>E.withFrozenState(state,retained)):retained();
    const snapshot=yield ()=>{options.onPhase?.('snapshot');return options.borrowSources?state:S.cloneForSimulation(state);};
    const scope=scopes?E.createFrozenScope(snapshot):null;if(scope)scopes.push(scope);
    const read=scope?callback=>R.withState(snapshot,()=>scope.run(callback)):callback=>callback();
    const snapshotRead=scope?read:callback=>R.withState(snapshot,()=>E.withFrozenState(snapshot,callback));
    const sources=yield ()=>read(()=>{options.onPhase?.('rates');return options.sourceProfile||WIS.Simulation.FixedSources.query(snapshot);}),groups=[];
    const plan=yield ()=>read(()=>{options.onPhase?.('gains');return WIS.Simulation.FixedSources.calculate(snapshot,sources.rates,seconds,sources.processes,sources.caps,sources.quantities);});
    yield ()=>snapshotRead(()=>{const previous=collecting;collecting=groups;try{if(!options.offline)options.runAchievementAutomations?.();}finally{collecting=previous;}});
    const cultivation=yield ()=>read(()=>{
      const cultivation = {...sources.cultivation};
    for (const key of ["passiveMana","explorationMana","explorationAmount"]) cultivation[key]=B.mul(cultivation[key],seconds);

    Object.assign(cultivation, { mana:plan.gains.mana, immortalPower:plan.gains.immortalPower,
      ...(plan.quantities?{quantities:{...plan.quantities,...Object.fromEntries(['passiveMana','explorationMana','explorationAmount'].map(k=>[k,WIS.Core.Amount.scale(sources.cultivation.quantities?.[k]??sources.cultivation[k],seconds)]))}}:{}),completed:true, processedSeconds:seconds, elapsedSeconds:seconds, remainingSeconds:0,
      immortalPowerActiveSeconds:B.gt(plan.gains.immortalPower,0)?seconds:0,
      xiuzhen:{...Object.fromEntries(WIS.Cultivation.Xiuzhen.resourceKeys.map(k=>[k,plan.gains[k]])),...(plan.quantities?{quantities:Object.fromEntries(WIS.Cultivation.Xiuzhen.resourceKeys.map(k=>[k,plan.quantities[k]]))}:{})},
      finalExplorationLoad:B.add(snapshot.minorTribulationExplorationLoad,cultivation.explorationAmount) });
    // Use the public tribulation preview for its actual load law (including
    // realm restrictions); its changed exponent is only used next segment.
    if (B.gt(cultivation.explorationAmount,0)) R.withState(snapshot,()=>E.withFrozenState(snapshot,()=> {
      const preview=WIS.Cultivation.ImmortalLogic.minorTribulationPreviewForExploration(cultivation.explorationAmount);
      cultivation.finalExplorationLoad=preview.nextLoad;
    }));
      return cultivation;
    });
    const bigNumbersUnlocked=yield ()=>options.frozenOffline?read(()=>WIS.Meta.BigNumbers.get(snapshot).unlocked):snapshotRead(()=>WIS.Meta.BigNumbers?.syncUnlock(snapshot));
    // BigNumbers' private transaction both assigns a replacement and writes to
    // that plain replacement. Materialize a foreground draft before preparing
    // it so intervening tree reads cannot hide those writes behind a COW child.
    const bigNumbersState=bigNumbersUnlocked&&options.foregroundSource?options.foregroundSource():snapshot;
    const bigOptions=yield ()=>bigNumberOptions(bigNumbersState,sources,options);
    const createMathWork=()=>options.frozenOffline?WIS.Meta.BigNumbers.prepareFrozenWork(snapshot,seconds,WIS.Meta.BigNumbers.captureFrozen(snapshot),{isCurrent:()=>true}):bigNumbersUnlocked?WIS.Meta.BigNumbers.prepareWork(bigNumbersState,seconds,bigOptions,{isCurrent:()=>true}):null;
    const finish=bigNumbers=>{
    const changShengGain = WIS.Cultivation.Martial.changShengGain(sources.changSheng,seconds,{frozen:options.frozenOffline===true});
    const martialPassiveGains=WIS.Cultivation.Martial.passiveGains(sources.martialPassive,seconds,{frozen:options.frozenOffline===true});
    const sourceMs=clock()-started;statistics.sourceMs+=sourceMs;recordCost("sourcePreparation",sourceMs);
    return { snapshot, seconds, sources, groups, plan, cultivation, bigNumbers, changShengGain, martialPassiveGains, options, started,
      frozenStart:options.frozenOffline ? {activeChallenge:snapshot.activeChallenge,
        activeChallengeElapsedSeconds:snapshot.activeChallengeElapsedSeconds,discardedElapsedSeconds:snapshot.meta.challenges.discardedElapsedSeconds||0,power:B.BN(snapshot.power)} : null };
    };
    if(scopes||options.deferRankMath===true)return {finish,createMathWork};
    const bigNumbers=yield ()=>options.frozenOffline?WIS.Meta.BigNumbers.prepareFrozen(snapshot,seconds,WIS.Meta.BigNumbers.captureFrozen(snapshot)):bigNumbersUnlocked?R.withState(bigNumbersState,()=>E.withFrozenState(bigNumbersState,()=>WIS.Meta.BigNumbers.prepare(bigNumbersState,seconds,bigOptions))):null;
    return yield ()=>finish(bigNumbers);
  }
  function prepareWork(state,seconds,options={}) {
    let preparation=null,work=null,value=null,closed=false,sourceWork=null,finishWork=null;const scopes=[],whole=WIS.Core.Amount?.enabled(),math=WIS.Core.CertifiedRankMath;
    const release=()=>{for(const scope of scopes)scope.cancel();scopes.length=0;};
    const cancel=()=>{closed=true;work?.cancel();sourceWork?.cancel();finishWork?.cancel();release();preparation=null;value=null;};
    return {advance(deadline=Infinity){if(closed)throw Error('preparation work closed');try{
      if(!preparation){
        if(whole){sourceWork ||= math.createWork(()=>math.task('quantity-source-preparation',()=>prepareProfileStages(state,seconds,options,scopes)));const next=sourceWork.advance({deadline,minimumOperations:1,maximumOperations:65536});if(!next.done)return next;preparation=sourceWork.result();release();}
        else preparation=WIS.Simulation.FixedSegment.prepare(state,seconds,{...options,deferRankMath:true});
        return {done:false};
      }
      if(!work){work=preparation.createMathWork();if(!work){if(whole){finishWork ||= math.createWork(()=>preparation.finish(null));const next=finishWork.advance({deadline,maximumOperations:256});if(next.done)value=finishWork.result();return next;}value=preparation.finish(null);return {done:true};}}
      const next=work.advance({deadline,maximumOperations:256});if(next.done){if(whole){finishWork ||= math.createWork(()=>preparation.finish(work.result()));const finished=finishWork.advance({deadline,maximumOperations:256});if(finished.done)value=finishWork.result();return finished;}value=preparation.finish(work.result());}return next;
    }catch(error){cancel();throw error;}},result:()=>value,cancel};
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
    const A=WIS.Core.Amount,copyWords=item=>Array.isArray(item)?A?.enabled()&&A.isCanonicalTail(item)?item:item.slice():item;
    // Copy end-unit available assets, while all discounts, qualifications and
    // caps are still the start snapshot. Each candidate changes its OWN levels.
    to.core.resources = {...from.core.resources};
    to.cultivation.systems.immortal.resources = {...from.cultivation.systems.immortal.resources};
    const x=from.cultivation.systems.immortal.xiuzhen;
    if(x) {
      const n=to.cultivation.systems.immortal.xiuzhen;
      n.resources=Object.fromEntries(Object.entries(x.resources).map(([key,value])=>[key,
        Object.fromEntries(Object.entries(value).map(([field,item])=>[field,copyWords(item)]))]));
      for(const k of ["manaSpent","manaSpentResidual","manaDebitResidual"]) n[k]=copyWords(x[k]);
    }
  }
  function* runQiCooperatively(callback){return callback();}
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
        if (candidate.currentTreasureProgress) {
          // Mie settles progress accumulated BEFORE this purchase, including
          // this frame's natural and Sheng rewards. Other eligibility remains
          // the frozen start snapshot used by every automatic purchase.
          const keys=["treasureBatch","treasures","treasureStockResidual","treasureProgress","treasureProgressResidual",
            "treasureProgressResidualTail","treasureProgressFinite","treasureProgressPending","treasureProgressStatus","treasureQualifications","treasureCredits"];
          // State.toSerializable is a structural clone, not normalization. Its
          // partial domain still inherits Credit ownership exactly as the full
          // clone, without traversing unrelated resource/statistic histories.
          const input=WIS.Core.Amount?.enabled()?{meta:Object.fromEntries(keys.filter(key=>state.meta[key]!==undefined).map(key=>[key,state.meta[key]]))}:state;
          const current = S.toSerializable(input).meta;
          base.meta = {...base.meta};
          for (const key of keys)if (current[key] !== undefined) base.meta[key] = current[key];
        }
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
  // A private online reward may suspend only mathematical work. Create its
  // COW trial once. Suspension resets private writes before reusing the trial;
  // only a completed result replaces parent roots.
  function createFixedRewardWork(state,key,units,input) {
    const C=WIS.Core.CertifiedRankMath,A=WIS.Core.Amount,T=WIS.Meta.TreasureProgress,keys=['core','powerSystem','cultivation','meta'],roots=keys.map(k=>state[k]);
    const copy=value=>{const n=B.BN(value);return B.Decimal.fromComponents_noNormalize(n.sign,n.layer,n.mag);};
    const amount=A.from(units),quote=Object.freeze({eligible:input.eligible,gain:copy(input.gain),award:copy(input.award)});
    const randomUnsupported=Object.assign(Error('Reward requires its formal state RNG'),{code:'fixed-reward-rng-unsupported'}),rejectRandom=()=>{throw randomUnsupported;};
    let installed=false;
    const draft=S.createDraft(state,{replayable:true}),trial=draft.state;
    const work=C.createWork(function prepareFixedReward(){
      try{const gained=R.withState(trial,()=>R.withRandomSource(rejectRandom,()=>E.withIsolatedState(trial,()=>T.advanceFixed(trial,key,amount,quote))));
        return {next:draft.finish(),gained};
      }catch(error){draft.reset();throw error;}
    },{isCurrent:()=>!installed&&R.getState()===state&&keys.every((k,i)=>state[k]===roots[i])});
    return {advance:deadline=>work.advance({deadline,minimumOperations:1,maximumOperations:65536}),
      install(){const result=work.result();if(!result)throw Error('Reward work incomplete');for(const key of keys)if(result.next[key]!==state[key])state[key]=result.next[key];installed=true;return result.gained;},
      needsFormalRandom:error=>error===randomUnsupported,runFormal:()=>T.advanceFixed(state,key,amount,quote),cancel:()=>work.cancel()};
  }
  function* commitParts(state, unit, options = {}) {
    const {seconds,sources,plan,cultivation}=unit,credit=options.privateResources||((callback)=>callback());
    const policy=R.getMathPolicy(),schema=WIS.Core.Config.saveVersion;
    const numericScope=WIS.Core.Amount?.enabled()&&options.projection&&typeof options.rewardDeadline==='function'?WIS.Core.CertifiedRankMath.createNumericScope({isCurrent:()=>R.getState()===state&&R.isProjection()&&R.getMathPolicy()===policy&&WIS.Core.Config.saveVersion===schema}):null;
    try{
    const power=WIS.Core.Registries.getActivePower(state), immortal=WIS.Core.Registries.getActiveCultivation(state);
    function* commitNumeric(callback){
      const work=options.projection&&typeof options.rewardDeadline==='function'?WIS.Core.Resources.createPrivateOperationWork(callback,state,{numericScope}):null;
      if(!work)return credit(callback);
      try{for(;;){const next=work.advance(options.rewardDeadline());if(next.done)break;yield;}return credit(()=>work.install());}
      finally{work.cancel();}
    }
    unit.options.onPhase?.("continuous-commit");
    if(WIS.Core.Amount?.enabled()&&typeof power?.commitAutomaticGainsParts==='function'){
      const parts=power.commitAutomaticGainsParts(state,{joules:plan.gains.joules,power:plan.gains.power,quantities:plan.quantities,rates:{joulesPerSecond:sources.rates.joules,powerPerSecond:sources.rates.power}},{writeRates:!options.projection,powerPeak:options.powerPeak});
      let next=parts.next();while(!next.done){const value=yield* commitNumeric(next.value);yield;next=parts.next(value);}
    }else{credit(()=>power?.commitAutomaticGains?.(state,{joules:plan.gains.joules,power:plan.gains.power,quantities:plan.quantities,rates:{joulesPerSecond:sources.rates.joules,powerPerSecond:sources.rates.power}},{writeRates:!options.projection,powerPeak:options.powerPeak}));if(WIS.Core.Amount?.enabled())yield;}
    if(WIS.Core.Amount?.enabled()&&typeof immortal?.commitAutomaticGainParts==='function'){
      const parts=immortal.commitAutomaticGainParts(state,cultivation,{writeRates:!options.projection,skipTreasureRolls:true});
      let next=parts.next();while(!next.done){const value=yield* commitNumeric(next.value);yield;next=parts.next(value);}
    }else{credit(()=>immortal?.commitAutomaticGain?.(state,cultivation,{writeRates:!options.projection,skipTreasureRolls:true}));if(WIS.Core.Amount?.enabled())yield;}
    credit(()=>WIS.Simulation.ResourceGroups.commitAdditional(state,plan.gains,plan.quantities));
    WIS.Meta.Infinity.awardSilverSea(state,seconds,sources.silverSeaQuantityRate??sources.silverSeaRate??B.ZERO);
    for(const [key,debit] of Object.entries(plan.debits)) if(WIS.Core.Amount?.enabled()&&plan.debitQuantities?WIS.Core.Amount.compare(plan.debitQuantities[key],0)>0:B.gt(debit,0)) {
      const paid=WIS.Core.Amount?.enabled()&&plan.debitQuantities?WIS.Core.Resources.debitExact(WIS.Simulation.ResourceGroups.resourceIdFor(key),plan.debitQuantities[key],state):["joules","power"].includes(key)?WIS.Core.Resources.spend(key,debit):WIS.Core.Resources.spendSystem("immortal",key,debit);
      if(!paid) throw Error("固定持续消耗无法提交；本段未提交");
    }
    yield;
    unit.options.onPhase?.("progress-settlement");
    let gainedPearls=B.ZERO;
    if(!unit.options.skipTreasureRolls) {
      for(const reward of sources.rewards) if(reward.eligible&&(B.gt(reward.key==="originImprint" ? plan.gains.nieForce||0 : reward.units,0)||WIS.Meta.TreasureProgress.hasUnsettled(state,reward.key))) {
        const began=clock();
        const A=WIS.Core.Amount,whole=A?.enabled();
        const progress=unit.options.frozenOffline ? undefined : reward.key==="originImprint" ? whole?A.scale(plan.quantities.nieForce,reward.gain):B.mul(plan.gains.nieForce||0,reward.gain) : undefined;
        const units=progress??(whole?A.scale(reward.quantityUnits??reward.units,seconds):B.mul(reward.units,seconds)),input=progress===undefined?reward:{...reward,gain:B.ONE};
        let gained;
        if(whole&&reward.key==='originImprint'&&R.isProjection()&&typeof options.rewardDeadline==='function'){
          let work=null,cpuMs=clock()-began;
          try{
            let t=clock();try{work=createFixedRewardWork(state,reward.key,units,input);}finally{cpuMs+=clock()-t;}
            try{
              for(;;){let next;t=clock();try{next=work.advance(options.rewardDeadline());}finally{cpuMs+=clock()-t;}if(next.done)break;yield;}
              t=clock();try{gained=work.install();}finally{cpuMs+=clock()-t;}
            }catch(error){if(!work.needsFormalRandom(error))throw error;t=clock();try{gained=work.runFormal();}finally{cpuMs+=clock()-t;}}
          }finally{
            const t=clock();try{work?.cancel();}finally{cpuMs+=clock()-t;}
            // Count every attempted CPU interval, including cancellation, but
            // never charge time spent yielded to the browser as calculation.
            statistics.rewardMs+=cpuMs;recordCost('treasure:'+reward.key,cpuMs);WIS.Simulation.Profiler.record('treasure.'+reward.key,cpuMs);
          }
        }else{
          gained=WIS.Simulation.Profiler.measure('treasure.'+reward.key,()=>WIS.Meta.TreasureProgress.advanceFixed(state,reward.key,units,input));
          const rewardMs=clock()-began;statistics.rewardMs+=rewardMs;recordCost('treasure:'+reward.key,rewardMs);
        }
        if(reward.key==='tianNiPearl') gainedPearls=gained;
        yield;
      }
      const progress=state.explorationRewards, incoming=B.gt(cultivation.explorationAmount,0);
      const naturalEligible=sources.natural.eligible;
      if(naturalEligible && (incoming||progress?.natural?.length||
          progress?.version===2&&B.gte(progress.natural.carry,progress.natural.remaining))) {
        const began=clock();
        diagnostics.measure("naturalTreasure",()=>WIS.Cultivation.ExplorationProgress.natural(state,cultivation.quantities?.explorationAmount??cultivation.explorationAmount,sources.natural));
        statistics.rewardMs+=clock()-began;
        yield;
      }
      if(sources.seizeEligible && !state.unlockedAchievements?.seizeFoundation && (incoming||progress?.seize?.length)) {
        const began=clock();
        diagnostics.measure("seizeFoundation",()=>WIS.Cultivation.ExplorationProgress.seize(state,cultivation.quantities?.explorationAmount??cultivation.explorationAmount));
        statistics.rewardMs+=clock()-began;
        yield;
      }
    }
    if (!unit.options.skipTreasureRolls && sources.sheng?.keys.length) {
      WIS.Cultivation.Xiuzhen.awardSheng(state,seconds,sources.sheng);
      yield;
    }
    unit.options.onPhase?.("end-events");
    if(unit.options.offline) {
      if(unit.bigNumbers)state.meta.bigNumbers=unit.bigNumbers;
      WIS.Meta.BigNumbers?.syncMilestones(state);
      unit.options.beforeEndEvents?.(state,seconds,unit);
    }
    // Martial progression belongs to the private fixed-step candidate.
    // Its conversions get at most one real 0.1s opportunity, never an offline purchase loop.
    if (WIS.Cultivation.Martial?.active(state)) {
      const A=WIS.Core.Amount,automationTime=A?.enabled()?A.field(WIS.Cultivation.Martial.get(state),'automationTime'):WIS.Cultivation.Martial.get(state).automationTime;
      WIS.Cultivation.Martial.advance(state, seconds);
      if(unit.options.frozenOffline){if(A?.enabled())Object.assign(WIS.Cultivation.Martial.get(state),A.fieldParts(automationTime,'automationTime'));else WIS.Cultivation.Martial.get(state).automationTime=automationTime;}
      else WIS.Cultivation.Martial.automate(state);
    }
    let operations=unit.options.frozenOffline ? 0 : yield* runAutomations(state,unit);
    if(!unit.options.offline&&unit.bigNumbers) state.meta.bigNumbers=unit.bigNumbers;
    // Big-number purchases use this frame's committed coefficients/construction.
    // Running earlier would let the prepared domain overwrite the purchase.
    if(!unit.options.offline && typeof unit.options.runAchievementAutomations==='function')
      operations+=R.withState(state,()=>WIS.Meta.BigNumbers.automate(state));
    // Natural qi is awarded after all same-frame conversions and purchases.
    WIS.Cultivation.Martial.awardChangSheng(state,unit.changShengGain);
    WIS.Cultivation.Martial.awardPassive(state,unit.martialPassiveGains);
    E.invalidate();
    for(const key of WIS.Simulation.FixedSources.keys) WIS.tmp.rates[key+"PerSecond"]=sources.rates[key];
    unit.options.onPhase?.("next-state");
    return {gainedPearls,resourceGains:plan.gains,operations};
    }finally{numericScope?.close();}
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
    if(options?.frozenOffline!==true||options.evolutionPlan||options.mapPlan||options.compiledResources)return WIS.Simulation.LegacySettlementCheckpoints.retired();
    function failed(error){return error;}
    try {
    const candidate=S.cloneForSimulation(state), roots=[state.core,state.powerSystem,state.cultivation,state.meta];
    const mathPolicy=options.offline===true ? R.MathPolicy.OFFLINE_APPROX : R.MathPolicy.ONLINE_EXACT;
    if(!options.frozenOffline)R.withMathPolicy(mathPolicy,()=>R.withState(candidate,()=>R.withOfflineExecution(()=>E.withIsolatedState(candidate,()=>WIS.Cultivation.ExplorationProgress.settleRetained(candidate)))));
    let unit, preparation, parts, closed=false, workMs=0,revision=0,phase='prepare';
    const notifyPhase=options.onPhase;options={...options,onPhase(next){if(phase!==next){phase=next;revision++;}notifyPhase?.(next);}};

    return {
      progress(){return {phase,revision};},
      advance(deadline) {
        const proofStart=WIS.Core.CertifiedRankMath.progressVersion();
        try {
        if(closed) throw Error("固定段候选已失效");
        let next;
        do {
          const began=clock(),rates={...WIS.tmp.rates};
          try {next=R.withMathPolicy(mathPolicy,()=>R.withState(candidate,()=>R.withProjection(()=>R.withOfflineExecution(()=>
            E.withIsolatedState(candidate,()=> {
              
              const settlementStarted=clock();
              try {if(!unit) {
                if(!preparation)preparation=prepareWork(candidate,seconds,{...options,borrowSources:true});
                if(!preparation.advance(deadline).done)return {done:false};
                unit=preparation.result();parts=commitParts(candidate,unit,{projection:true});return {done:false};
              }
              return parts.next();
              } finally {WIS.Simulation.Profiler.withScope('offline',()=>WIS.Simulation.Profiler.record("settlementWallMs",clock()-settlementStarted));}
            })))));}
          finally {
            for(const key of Object.keys(WIS.tmp.rates))if(!Object.prototype.hasOwnProperty.call(rates,key))delete WIS.tmp.rates[key];
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
         } catch(error) {closed=true;preparation?.cancel();parts?.return?.();throw failed(error);}
        finally {revision+=WIS.Core.CertifiedRankMath.progressVersion()-proofStart;}
      },
      close(){closed=true;preparation?.cancel();parts?.return?.();}
    };
    } catch(error) {throw failed(error);}
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

  WIS.Simulation.FixedSegment=Object.freeze({settlementOrder:Object.freeze(["retained-progress","snapshot","rates","gains","continuous-commit","progress-settlement","end-events","next-state"]),resourceCoordinate,compareResourceCoordinates,planOffline,validateBudget,diagnostics,collectCandidates,prepare,prepareWork,commit,commitParts,confirm,createWork,
    confirmOnlineSegment(seconds,result,workMs){statistics.onlineTicks+=result.compatibilitySubsteps||Math.ceil(seconds/WIS.Core.Config.fixedSettlement.discreteCadenceSeconds-1e-9);
      statistics.onlineGameSeconds+=seconds;statistics.operations+=result.operations;statistics.maxUnitMs=Math.max(statistics.maxUnitMs,workMs);},takePrepared,installPrepared,
    confirmed:()=>({segments:statistics.segments,onlineTicks:statistics.onlineTicks,offlineGameSeconds:statistics.offlineGameSeconds,onlineGameSeconds:statistics.onlineGameSeconds,operations:statistics.operations}),
    restoreConfirmed:point=>{if(point)Object.assign(statistics,point);},
    metrics:()=>({...statistics,sourceEvaluations:WIS.Simulation.FixedSources.evaluations()}),
    resetMetrics:()=>{for(const k of Object.keys(statistics))statistics[k]=0;WIS.Simulation.FixedSources.resetMetrics();} });
}(window.WIS));
