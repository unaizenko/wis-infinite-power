(function defineSimulationLoop(WIS) {
  'use strict';
  WIS.Simulation.Loop=Object.freeze({create(context){
    const {getState,offline,requestRender,flushRender,saveState,effectiveDevSpeed,isInitialLoadComplete}=context;
    const epsilon=context.epsilon;
    let lastTickAt=Date.now(),started=false,preparingSave=false;
    let onlineAccumulator=0,stepping=false;
    let importHold=null,importHoldSequence=0;
    let continuationHandle=null,schedulerGeneration=0;
    let manualQi=null;
    const onlineIntervals=(getState().core.runtime.timeLedger.pendingContinuousTime||[]).map(p=>({...p}));
    onlineAccumulator=onlineIntervals.reduce((n,p)=>n+(p.source==='offline'?0:p.clock),0);
    const stepSeconds=context.simulationStepSeconds||0.1;
    const maxSteps=context.maxOnlineStepsPerFrame||8;
    const requestedBudget=Number(context.onlineSliceBudgetMs);
    const onlineSliceBudgetMs=Number.isFinite(requestedBudget)&&requestedBudget>0?requestedBudget:12;
    let tickRemaining=0;
    const ledger=()=>getState().core.runtime.timeLedger;
    const monotonicNow=()=>window.performance?.now?window.performance.now():Date.now();
    function writeLedger(fields){getState().core.runtime.timeLedger={...ledger(),...fields};}
    function syncPendingLedger(){writeLedger({pendingContinuousTime:onlineIntervals.map(p=>({...p}))});}
    const ready=()=>context.isStateReady?context.isStateReady():isInitialLoadComplete();
    function cancelOnlineContinuation(){
      if(continuationHandle!==null){window.clearTimeout(continuationHandle);continuationHandle=null;}
    }
    function cancelQiWork(){manualQi?.scope.work?.cancel();manualQi=null;context.invalidateDeferredQi?.();}
    function invalidateOnlineScheduler(){schedulerGeneration++;cancelOnlineContinuation();cancelQiWork();}
    function reportQiFailure(){
      if(WIS.Core.Runtime.has('showNotice'))WIS.Core.Runtime.call('showNotice','炼气计算未完成，本次购买未提交；进度时间已保留。');
    }
    function advanceManualQi(){
      const job=manualQi,I=WIS.Cultivation.ImmortalLogic;
      if(job.original!==getState()||job.generation!==schedulerGeneration||job.key!==I.qiBatchStateKey(getState())){
        job.scope.work?.cancel();manualQi=null;return false;
      }
      try{
        // Resume only pure math. A completed result re-enters the original
        // one-shot payment under this slice's existing transaction.
        if(job.scope.work&&!job.scope.work.result()){
          try{if(!job.scope.work.advance().done)return false;}
          catch(error){job.scope.work.cancel();manualQi=null;reportQiFailure();return false;}
        }
        job.value=I.withQiBatchScope(job.scope,()=>I.advanceQiLayersBatch(job.shouldRender));
        manualQi=null;return job.value>0;
      }catch(error){
        if(I.qiDeferredWork(error))return false;
        job.scope.work?.cancel();manualQi=null;
        if(I.qiWorkFailure(error)){reportQiFailure();return false;}
        throw error;
      }
    }
    function requestQiBatch(shouldRender=true){
      // Manual and automatic work share the same owner; repeated clicks do not
      // queue purchases or steal another slice from a pending automatic step.
      if(manualQi||context.hasDeferredQi?.()||importHold||document.hidden||!isInitialLoadComplete()||onlineBlocked())return 0;
      const job={original:getState(),generation:schedulerGeneration,
        key:WIS.Cultivation.ImmortalLogic.qiBatchStateKey(getState()),scope:{},shouldRender,value:0};
      manualQi=job;processOnline();return job.value;
    }
    function setLastTickAt(value){
      lastTickAt=Number.isFinite(Number(value))?Math.max(0,Number(value)):Date.now();
      // Explicitly ending a frozen interval must persist the same new online
      // origin. Otherwise a completed recovery checkpoint replays that wait.
      // A hidden interval still belongs to registerReturn and stays untouched.
      if(ledger().awaySince===null)writeLedger({boundaryAt:Math.max(ledger().boundaryAt||0,lastTickAt)});
    }
    function resetAccumulators(){
      invalidateOnlineScheduler();
      lastTickAt=Date.now();onlineAccumulator=0;onlineIntervals.length=0;tickRemaining=0;writeLedger({pendingContinuousTime:[]});
    }
    function eligible(){return WIS.Simulation.Compensation?.eligibleAtEnqueue?.(getState())===true;}
    function enqueueForegroundAt(now,{leaving=false}={}){
      const previous=lastTickAt;lastTickAt=now;
      if(!isInitialLoadComplete()||ledger().awaySince!==null||(!leaving&&document.hidden))return 0;
      const status=offline.getCatchUpStatus();
      if(status.clockSuspended||status.treasureRecovery?.active||status.phase==='paused'||((status.phase==='running'||status.pendingGameSeconds>epsilon)&&status.presentation==='blocking'))return 0;
      const seconds=Math.max(0,now-previous)/1000;
      if(!(seconds>0))return 0;
      const speed=effectiveDevSpeed();
      // Runtime intervals retain speed and original compensation qualification.
      // They are never recovery tasks or prepared work, and do not lock the UI.
      const reserved=onlineIntervals.reduce((sum,part)=>sum+(part.compensationEligible?part.clock:0),0);
      const available=eligible()?Math.min(seconds,Math.max(0,offline.availableCompensationClockSeconds()-reserved)):0;
      const covered=available>epsilon?available:0;
      for(const [clock,compensationEligible] of [[covered,true],[seconds-covered,false]])if(clock>0)
      {
        const tail=onlineIntervals.at(-1);
        if(tail&&tail.source!=='offline'&&tail.speed===speed&&tail.compensationEligible===compensationEligible)tail.clock+=clock;
        else onlineIntervals.push({source:'online',clock,speed,compensationEligible});
        onlineAccumulator+=clock;
      }
      writeLedger({boundaryAt:now});return seconds;
    }
    function captureForegroundTime(now=Date.now(),options={}){
      if(importHold)return 0;
      const seconds=enqueueForegroundAt(now,options);
      syncPendingLedger();
      return seconds;
    }
    function onlineBlocked(status=offline.getCatchUpStatus()){
      return stepping||status.clockSuspended||status.phase==='running'||status.phase==='paused'||
        status.pendingGameSeconds>epsilon||status.treasureRecovery?.active;
    }
    function dropEmptyOnlineHeads(){
      while(onlineIntervals.length&&onlineIntervals[0].source!=='offline'&&!(onlineIntervals[0].clock>epsilon)){
        onlineAccumulator=Math.max(0,onlineAccumulator-Math.max(0,Number(onlineIntervals[0].clock)||0));
        onlineIntervals.shift();
      }
    }
    function currentCadence(){
      return tickRemaining>epsilon?tickRemaining:
        (getState().core.runtime.onlineCadenceRemaining>epsilon?getState().core.runtime.onlineCadenceRemaining:stepSeconds);
    }
    function hasRunnableOnlineWork(flush=false){
      if(importHold||document.hidden||!isInitialLoadComplete())return false;
      if(onlineBlocked())return false;
      if(manualQi)return true;
      dropEmptyOnlineHeads();
      if(!onlineIntervals.length)return false;
      if(onlineIntervals[0].source==='offline')return true;
      const offlineIndex=onlineIntervals.findIndex(p=>p.source==='offline');
      const prefix=offlineIndex<0?onlineIntervals:onlineIntervals.slice(0,offlineIndex);
      const availableGame=prefix.reduce((sum,part)=>sum+part.clock*part.speed,0);
      if(availableGame+epsilon>=currentCadence())return true;
      if(offlineIndex>=0&&availableGame>epsilon)return true;
      return flush&&availableGame>epsilon;
    }
    function drainOnlineSlice(flush=false){
      const status=offline.getCatchUpStatus();
      if(onlineBlocked(status))return {progressed:false,blocked:true,needsContinuation:false,hitOfflineBarrier:false,steps:0};
      const previousAchievements=context.achievementStates?.();
      const sliceStartedAt=monotonicNow();
      let progressed=false,hitOfflineBarrier=false,blocked=false,steps=0;
      stepping=true;context.beginTransaction?.();
      try {
        if(manualQi)progressed=advanceManualQi();
        while(!manualQi&&steps<maxSteps&&onlineIntervals.length){
          dropEmptyOnlineHeads();
          if(!onlineIntervals.length)break;
          // Budget is checked only between complete atomic settlements. The first
          // settlement is always allowed to finish even if it exceeds the soft budget.
          if((steps>0||progressed)&&monotonicNow()-sliceStartedAt>=onlineSliceBudgetMs)break;
          const head=onlineIntervals[0];
          if(head.source==='offline'){
            offline.appendCatchUpTask(head.clock*head.speed,head.clock,{source:'offline',compensationEligible:false,
              randomMode:'state',speed:head.speed,sealed:true,presentation:'blocking',external:true});
            onlineIntervals.shift();syncPendingLedger();
            // The offline worker now owns the foreground. Any queued online callback
            // belongs to the old scheduling generation and must not survive it.
            invalidateOnlineScheduler();
            offline.returnFromAway(true);hitOfflineBarrier=true;break;
          }
          const offlineIndex=onlineIntervals.findIndex(p=>p.source==='offline');
          const prefix=offlineIndex<0?onlineIntervals:onlineIntervals.slice(0,offlineIndex);
          const availableGame=prefix.reduce((sum,part)=>sum+part.clock*part.speed,0);
          const cadence=currentCadence();
          if(availableGame+epsilon<cadence&&!flush&&offlineIndex<0)break;
          const part=onlineIntervals[0],seconds=Math.min(cadence,part.clock*part.speed);
          const result=context.advanceGameStep(seconds,true,{
            foreground:true,
            timeSegment:{source:'online',compensationEligible:part.compensationEligible,clockRatio:1/part.speed},
            deferAutomation:seconds+epsilon<cadence
          });
          const processed=Math.max(0,Math.min(seconds,Number(result?.processedSeconds)||0));
          // An unfinished Qi calculation has committed no part of this step.
          // Keep its complete debt and let the existing single owner resume it.
          if(result?.qiDeferred)break;
          if(result?.qiWorkFailed){
            reportQiFailure();
            blocked=true;break;
          }
          if(!(processed>0)){
            if(result?.treasureRecoveryRequired)offline.queueCatchUpNotice(0,0);
            blocked=true;break;
          }
          progressed=true;steps++;
          const clock=processed/part.speed;
          part.clock=Math.max(0,part.clock-clock);
          onlineAccumulator=Math.max(0,onlineAccumulator-clock);
          if(part.clock<=epsilon)onlineIntervals.shift();
          tickRemaining=Math.max(0,cadence-processed);
          getState().core.runtime.onlineCadenceRemaining=tickRemaining||stepSeconds;
          getState().totalElapsedSeconds+=clock;
          // Match the old end-unit play-time achievement check.
          const rates={...WIS.tmp.rates};
          if(!getState().unlockedAchievements?.trainingUp&&getState().totalElapsedSeconds>=600)
            WIS.Meta.Achievements.recordCurrent();
          Object.assign(WIS.tmp.rates,rates);
          if(monotonicNow()-sliceStartedAt>=onlineSliceBudgetMs)break;
        }
        if(previousAchievements)context.notifyNewAchievements?.(previousAchievements);
      } finally {
        // A deferred save must see time already debited from the accumulator.
        // prepareSave may record elapsed time, but cannot reenter this step loop.
        const rates={...WIS.tmp.rates};
        try{context.endTransaction?.();}finally{Object.assign(WIS.tmp.rates,rates);stepping=false;}
      }
      const needsContinuation=!hitOfflineBarrier&&!blocked&&hasRunnableOnlineWork(flush);
      return {progressed,blocked,needsContinuation,hitOfflineBarrier,steps};
    }
    function scheduleOnlineContinuation(){
      if(continuationHandle!==null||!hasRunnableOnlineWork(false))return false;
      const generation=schedulerGeneration;
      continuationHandle=window.setTimeout(()=>{
        continuationHandle=null;
        if(generation!==schedulerGeneration||importHold||document.hidden)return;
        const result=drainOnlineSlice(false);
        requestRender();flushRender(Date.now());
        if(result.needsContinuation&&generation===schedulerGeneration)scheduleOnlineContinuation();
      },0);
      return true;
    }
    function processOnline(flush=false){
      const result=drainOnlineSlice(flush);
      if(result.needsContinuation)scheduleOnlineContinuation();
      return result;
    }
    function markAway(now){
      if(!ready()||ledger().awaySince!==null)return false;
      invalidateOnlineScheduler();
      // Leaving records the final foreground interval but never forces a heavy
      // settlement. The committed state and its ordered time debt are persisted.
      enqueueForegroundAt(now,{leaving:true});syncPendingLedger();
      writeLedger({awaySince:now,registeredUntil:now,boundaryAt:now});
      offline.suspendForAway();return true;
    }
    function registerReturn(now,{start=true,presentation='quiet',fallbackClosedAt=null}={}){
      const p=ledger(),left=p.awaySince??fallbackClosedAt;
      if(left==null){lastTickAt=now;offline.returnFromAway(false);return 0;}
      const from=Math.max(left,p.registeredUntil||0),seconds=Math.max(0,now-from)/1000;
      offline.invalidateSourceModels();
      if(seconds>0){const speed=effectiveDevSpeed();
        if(onlineIntervals.length){onlineIntervals.push({source:'offline',clock:seconds,speed,compensationEligible:false});syncPendingLedger();}
        else offline.appendCatchUpTask(seconds*speed,seconds,{source:'offline',compensationEligible:false,
          randomMode:'state',speed,sealed:true,presentation,external:true});}
      writeLedger({awaySince:null,registeredUntil:Math.max(from,now),boundaryAt:now});lastTickAt=now;
      if(document.hidden){writeLedger({awaySince:now});offline.suspendForAway();}
      else offline.returnFromAway(start);
      return seconds;
    }
    function beginImportHold(now=Date.now()) {
      if(importHold)return null;
      captureForegroundTime(now);
      invalidateOnlineScheduler();
      importHold={token:`import-${++importHoldSequence}`,startedAt:now,speed:effectiveDevSpeed()};
      // Retire any already scheduled recovery slice without discarding debt.
      // The picker/read/install transaction owns the foreground until commit or rollback.
      offline.suspendForAway();
      lastTickAt=now;
      return {...importHold};
    }
    function finishImportHold(token,{accountElapsed=false,reason='import-cancel'}={}) {
      if(!importHold||token!==importHold.token)return {released:false,elapsedSeconds:0};
      const hold=importHold,now=Date.now();
      const elapsed=Math.max(0,now-hold.startedAt)/1000;
      lastTickAt=now;
      if(accountElapsed&&elapsed>epsilon){
        // Failed/cancelled imports return the picker/read time to the old save.
        // It is registered as blocking debt so a high-value old save cannot
        // immediately saturate the host as soon as the transaction is released.
        offline.holdCatchUpUntilUserStart?.(reason);
        // Keep the original order: recovery, parked online prefix, picker time.
        // Transfer metadata only; online portions still use ONLINE_EXACT.
        onlineIntervals.push({source:'offline',clock:elapsed,speed:hold.speed,compensationEligible:false});
        syncPendingLedger();
        handoffImportRecovery();
        writeLedger({awaySince:null,registeredUntil:Math.max(Number(ledger().registeredUntil)||0,now),boundaryAt:now});
      }
      importHold=null;
      return {released:true,elapsedSeconds:elapsed};
    }
    function runMainTick(){
      const now=Date.now();
      if(!isInitialLoadComplete()){lastTickAt=now;return;}
      if(importHold){lastTickAt=now;return;}
      if(document.hidden)return;
      if(onlineBlocked()&&(manualQi||context.hasDeferredQi?.()))invalidateOnlineScheduler();
      // Recovery publishes its own small progress view. Re-rendering every
      // ability/ledger here repeatedly traverses the still-uncommitted backlog.
      if(offline.getCatchUpStatus().treasureRecovery?.active){lastTickAt=now;return;}
      // The visibility event normally handles this. Recover a missed event
      // through the SAME watermark, without inferring offline from duration.
      if(ledger().awaySince!==null)registerReturn(now);
      else {
        enqueueForegroundAt(now);
        if(offline.getPendingCatchUpSeconds()>epsilon){
          // A freshly imported blocking debt waits for the player. The live
          // loop must not be the entry point that starts it instead.
          if(!offline.isCatchUpPaused()&&!offline.isCatchUpAwaitingStart?.())offline.queueCatchUpNotice(0,0);
        }else if(continuationHandle===null)processOnline();
      }
      const finalStatus=offline.getCatchUpStatus();
      // A blocking wait owns a modal status view and the game state is frozen.
      // Do not repeatedly rebuild the full high-number page while nothing changes.
      if((finalStatus.awaitingStart===true||finalStatus.phase==='paused')&&finalStatus.presentation==='blocking'){
        lastTickAt=now;return;
      }
      requestRender();flushRender(now);
    }
    function handleVisibilityChange(){
      if(!ready()||importHold)return;
      const now=Date.now();
      if(document.hidden){if(markAway(now))saveState();}
      else if(ledger().awaySince!==null){registerReturn(now);saveState();}
      requestRender();flushRender(now,{force:true});
    }
    function prepareSave(options={}){
      if(importHold&&options.importCommit!==true)return false;
      if(preparingSave||offline.isInternalWork?.()||!ready())return false;
      preparingSave=true;
      try{
        if(options.closing===true||document.hidden)markAway(Date.now());
        else if(!importHold) {
          enqueueForegroundAt(Date.now());
          if(options.captureOnly!==true)processOnline();
        }
      }finally{syncPendingLedger();preparingSave=false;}
      return true;
    }
    function restoreClosedTime(snapshot){
      invalidateOnlineScheduler();
      const pending=ledger().pendingContinuousTime||[];
      onlineIntervals.splice(0,onlineIntervals.length,...pending.map(p=>({...p})));
      onlineAccumulator=onlineIntervals.reduce((n,p)=>n+(p.source==='offline'?0:p.clock),0);
      tickRemaining=0;
      // One authority for committed state + registered pending. Only a legacy
      // save without a ledger watermark uses lastUpdateAt. Zero new time is final.
      // An open recovery checkpoint without a close/away marker is frozen waiting.
      const p=ledger(),watermark=Math.max(p.boundaryAt||0,p.registeredUntil||0);
      const fallback=snapshot?.closedAt>0?Math.max(snapshot.closedAt,watermark):
        snapshot?null:watermark>0?watermark:getState().lastUpdateAt;
      return registerReturn(Date.now(),{start:false,presentation:'blocking',fallbackClosedAt:fallback});
    }
    function handoffImportRecovery(){
      // Installation owns the hold and the caller has established the recovery
      // gate. Transfer ordered metadata only; a save slice is not a drain proof.
      if(!importHold||stepping||preparingSave)return {complete:false};
      invalidateOnlineScheduler();
      while(onlineIntervals.length){
        const part=onlineIntervals[0];
        if(part.clock>epsilon){
          const source=part.source==='offline'?'offline':'online';
          offline.appendCatchUpTask(part.clock*part.speed,part.clock,{source,
            compensationEligible:source==='online'&&part.compensationEligible===true,
            randomMode:'state',speed:part.speed,sealed:true,
            presentation:source==='offline'?'blocking':'quiet',external:true});
        }
        onlineIntervals.shift();
        onlineAccumulator=onlineIntervals.reduce((sum,p)=>sum+(p.source==='offline'?0:p.clock),0);
        syncPendingLedger();
      }
      return {complete:true};
    }
    function start(){if(started)return;started=true;
      document.addEventListener('visibilitychange',handleVisibilityChange);
      window.setInterval(runMainTick,context.logicIntervalMs);
    }
    return Object.freeze({start,runMainTick,setLastTickAt,resetAccumulators,handleVisibilityChange,
      prepareSave,restoreClosedTime,handoffImportRecovery,enqueueForegroundAt,captureForegroundTime,beginImportHold,finishImportHold,
      invalidateOnlineScheduler,requestQiBatch,
      isImportHoldActive:()=>!!importHold,
      snapshot:()=>({lastTickAt,onlineAccumulator,tickRemaining,onlineIntervals:onlineIntervals.map(part=>({...part}))}),
      restore:snapshot=>{
        invalidateOnlineScheduler();
        lastTickAt=snapshot.lastTickAt;onlineAccumulator=snapshot.onlineAccumulator||0;
        tickRemaining=snapshot.tickRemaining||0;onlineIntervals.splice(0,onlineIntervals.length,...(snapshot.onlineIntervals||[]).map(part=>({...part})));
        syncPendingLedger();
      },
      getUnprocessedOnlineClockSeconds:()=>onlineAccumulator,
      getSimulationClockAccumulator:()=>onlineAccumulator});
  }});
}(window.WIS));
