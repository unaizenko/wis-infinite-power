(function defineSimulationLoop(WIS) {
  'use strict';
  WIS.Simulation.Loop=Object.freeze({create(context){
    const {getState,offline,requestRender,flushRender,saveState,effectiveDevSpeed,isInitialLoadComplete}=context;
    const epsilon=context.epsilon;
    let nativeHidden=false;
    const isHidden=()=>document.hidden||nativeHidden;
    function setNativeAppActive(active){nativeHidden=!active;handleVisibilityChange();}
    let lastTickAt=Date.now(),started=false,preparingSave=false;
    let onlineAccumulator=0,stepping=false,firstOnlineSettlementNotified=false;
    let importHold=null,importHoldSequence=0;
    let continuationHandle=null,schedulerGeneration=0;
    let manualQi=null;
    let deferredAction=null;
    let onlineWork=null,onlineFailure=null,publishedSinceRender=false;
    let discardFailure=null,timeoutFailures=0;
    const limit=WIS.Simulation.SettlementLimit;
    const bounded=!!limit&&WIS.Core.Config?.saveVersion>=76&&typeof context.commitDiscard==='function';
    const onlineIntervals=(getState().core.runtime.timeLedger.pendingContinuousTime||[]).map(p=>({...p}));
    onlineAccumulator=onlineIntervals.reduce((n,p)=>n+(p.source==='offline'?0:p.clock),0);
    const stepSeconds=context.simulationStepSeconds||0.1;
    const maxSteps=context.maxOnlineStepsPerFrame||8;
    const requestedBudget=Number(context.onlineSliceBudgetMs);
    const onlineSliceBudgetMs=Number.isFinite(requestedBudget)&&requestedBudget>0?requestedBudget:12;
    let tickRemaining=0;
    const ledger=()=>getState().core.runtime.timeLedger;
    const monotonicNow=()=>window.performance?.now?window.performance.now():Date.now();
    // Nonpersistent presentation data, published only after a successful online
    // commit. Effects scratch rates may be cleared by discard/save/action work.
    let committedRates=null,lastRatePresentation=null;
    const rateIdentity=()=>context.rateIdentity?.()||[getState()];
    const sameRateIdentity=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
    function publishCommittedRates(result,identity) {
      if(!sameRateIdentity(identity,rateIdentity())){committedRates=null;return;}
      if(!(result?.processedSeconds>0)||!result.resourceGains)return;
      const B=WIS.Core.BigNum,rates={};
      // Presentation failure must never interrupt accounting of committed time.
      for(const [key,gain] of Object.entries(result.resourceGains))try{
        const value=B.div(gain,result.processedSeconds);
        if(B.isFiniteBN(value)&&B.gte(value,0))rates[key+'PerSecond']=value;
      }catch(_){}
      committedRates={identity,rates:Object.freeze(rates),at:monotonicNow()};
    }
    function getCommittedRates() {
      const current=committedRates&&sameRateIdentity(committedRates.identity,rateIdentity());
      return {rates:current?committedRates.rates:null,
        stale:!!current&&monotonicNow()-committedRates.at>2000,
        stopped:!!onlineFailure||!!discardFailure};
    }
    let continuationChannel=null,channelTask=null,channelSequence=0n,channelDisabled=false,lastTimerTaskAt=monotonicNow();
    function closeContinuationChannel(){const channel=continuationChannel;continuationChannel=null;channelTask=null;channel?.port1.close?.();channel?.port2.close?.();}
    function queueOnlineTask(callback){
      if(!WIS.Core.Amount?.enabled()||typeof window.MessageChannel!=='function'||channelDisabled)return window.setTimeout(callback,0);
      const now=monotonicNow();if(now-lastTimerTaskAt>=100){lastTimerTaskAt=now;return window.setTimeout(callback,0);}
      try{
        if(!continuationChannel){const channel=new window.MessageChannel();continuationChannel=channel;channel.port1.onmessage=({data})=>{
          if(continuationChannel!==channel||channelTask?.id!==data)return;
          const run=channelTask.callback;channelTask=null;channel.port1.unref?.();channel.port2.unref?.();run();
        };channel.port1.unref?.();channel.port2.unref?.();}
        const id=String(++channelSequence);channelTask={id,callback};continuationChannel.port1.ref?.();continuationChannel.port2.ref?.();continuationChannel.port2.postMessage(id);return {kind:'quantity-message-task',id};
      }catch(error){closeContinuationChannel();channelDisabled=true;lastTimerTaskAt=now;return window.setTimeout(callback,0);}
    }

    function writeLedger(fields){getState().core.runtime.timeLedger={...ledger(),...fields};}
    function syncPendingLedger(){writeLedger({pendingContinuousTime:onlineIntervals.map(p=>({...p}))});}
    const backgroundAllowed=()=>WIS.Core.Save.sessionPolicy?.().backgroundAccrualAllowed !== false;
    const ready=()=>context.isStateReady?context.isStateReady():isInitialLoadComplete();
    function cancelOnlineContinuation(){
      if(continuationHandle!==null){if(continuationHandle?.kind!=='quantity-message-task')window.clearTimeout(continuationHandle);continuationHandle=null;}closeContinuationChannel();
    }
    function cancelQiWork(){manualQi=null;context.invalidateDeferredQi?.();}
    function cancelDeferredAction(reason='cancelled'){
      const owner=deferredAction;if(!owner)return false;
      deferredAction=null;detachOnlineReady(owner);
      try{owner.job.cancel?.(reason);}finally{owner.resolve(false);}
      return true;
    }
    function detachOnlineReady(owner){
      const unsubscribe=owner?.unsubscribe;if(owner)owner.unsubscribe=null;
      // Listener cleanup must not turn an already installed settlement into an
      // apparent failure before its confirmed time is debited below.
      try{unsubscribe?.();}catch(_){}
    }
    function cancelOnlineWork(abort=false){const owner=onlineWork;onlineWork=null;detachOnlineReady(owner);if(abort&&owner?.job.abort)owner.job.abort();else owner?.job.close?.();}
    function watchOnlineReady(owner){
      if(typeof owner.job.onReady!=='function')return;
      const unsubscribe=owner.job.onReady(()=>{
        if(onlineWork!==owner||owner.generation!==schedulerGeneration||owner.job.waiting?.()===true)return;
        // Remote messages only wake the ordinary host scheduler. Installation
        // still belongs to a later drain, with all existing guards and debit rules.
        scheduleOnlineContinuation();
      });
      if(typeof unsubscribe==='function')owner.unsubscribe=unsubscribe;
    }
    function onlineInputKey(){return (context.onlineFailureKey||context.onlineStateKey)?.(getState());}
    function failureStillCurrent(){if(!onlineFailure)return false;if(onlineFailure.key!==onlineInputKey()){onlineFailure=null;timeoutFailures=0;return false;}if(onlineFailure.retryAt!==undefined&&monotonicNow()>=onlineFailure.retryAt){onlineFailure=null;return false;}return true;}
    function accumulateDiscard(clock,game,reason='online-overload'){
      if(!(clock>0))return;
      const old=ledger().pendingDiscard;
      const pending={clock:(old?.clock||0)+clock,game:(old?.game||0)+game,reason:old?.reason||reason};
      if(!Number.isFinite(pending.clock)||!Number.isFinite(pending.game))throw Error('舍弃时间累计溢出');
      writeLedger({pendingDiscard:pending});
    }
    function limitOnlineQueue(waiting=limit?.waitingClock||0.1,reason='online-overload'){
      if(!bounded||onlineIntervals.some(p=>p.source==='offline'))return;
      const plan=limit.planDiscard(onlineIntervals,{reservedClock:onlineWork?onlineWork.seconds/onlineWork.part.speed:0,maxWaitingClock:waiting});
      if(!(plan.discardedClock>epsilon))return;
      // Preserve the identity reserved by the in-flight candidate.
      for(let i=0;i<plan.keep.length;i++)onlineIntervals[i].clock=plan.keep[i].clock;
      onlineIntervals.length=plan.keep.length;
      onlineAccumulator=plan.keep.reduce((sum,p)=>sum+p.clock,0);
      accumulateDiscard(plan.discardedClock,plan.discardedGame,reason);syncPendingLedger();
    }
    function flushDiscardEffects(){
      // A manual candidate owns gameplay inputs; keep only ledger metadata pending.
      if(!bounded||deferredAction||onlineWork||onlineIntervals.length||discardFailure)return !discardFailure;
      const pending=ledger().pendingDiscard;if(!pending)return true;
      try{
        if(context.commitDiscard([{source:'online',clock:pending.clock,speed:pending.game/pending.clock,compensationEligible:false}],pending.reason)===false)throw Error('舍弃时间未提交');
        writeLedger({pendingDiscard:null});publishedSinceRender=true;return true;
      }catch(error){discardFailure=error;context.onOnlineSettlementError?.(error);return false;}
    }
    function stopFailedWork(error){
      cancelOnlineWork(true);
      if(bounded){limitOnlineQueue(0,error?.code||'online-settlement-failed');flushDiscardEffects();}
      onlineFailure={key:onlineInputKey(),code:error?.code||'online-settlement-failed'};
      if(error?.code==='online-candidate-timeout')onlineFailure.retryAt=monotonicNow()+Math.min(30000,1000*2**Math.min(timeoutFailures++,5));
      context.onOnlineSettlementError?.(error);
    }
    function inspectOnlineTimeout(){
      if(!bounded||!onlineWork)return;
      // Only persisted arithmetic cursors/phases count. A queued timer or empty
      // poll cannot extend this deadline. Remote workers own their silence watchdog.
      const owner=onlineWork,now=monotonicNow(),progress=owner.job.progress?.();
      if(Number.isSafeInteger(progress)&&progress>(owner.progress||0)){owner.progress=progress;owner.lastProgressAt=now;}
      if(owner.job.isReady?.()||owner.job.ownsTimeout?.())return;
      if(now-(owner.lastProgressAt??owner.startedAt)>=limit.candidateTimeoutMs)
        stopFailedWork(Object.assign(Error('在线计算暂时无进展，将自动重试'),{code:'online-candidate-timeout'}));
    }
    function beforePlayerAction(){
      // Rejected repeated input must not commit discard effects into this owner.
      if(deferredAction)return false;
      if(!bounded||!ledger().pendingDiscard)return !discardFailure;
      if(onlineBlocked())return false;
      cancelOnlineWork(true);limitOnlineQueue(0,'action-boundary');return flushDiscardEffects();
    }
    function invalidateOnlineScheduler(){cancelOnlineWork();if(!bounded)onlineFailure=null;schedulerGeneration++;cancelOnlineContinuation();cancelQiWork();cancelDeferredAction('scheduler-invalidated');}
    function deferredActionBlocked(status=offline.getCatchUpStatus()){
      return onlineBlocked(status)||importHold||isHidden()||!ready()||ledger().awaySince!==null||
        status.awaitingStart===true&&status.presentation==='blocking';
    }
    function requestDeferredAction(factory){
      if(deferredAction||manualQi||context.hasDeferredQi?.()||deferredActionBlocked())return Promise.resolve(false);
      if(!beforePlayerAction())return Promise.resolve(false);
      cancelOnlineWork();
      const original=getState(),generation=schedulerGeneration;
      let job;
      try{job=typeof factory==='function'?factory(original):factory;
        if(!job||typeof job.advance!=='function'||typeof job.commit!=='function')throw Error('动作工作接口无效');
      }catch(error){return Promise.reject(error);}
      return new Promise((resolve,reject)=>{
        const owner=deferredAction={job,original,generation,resolve,reject};
        owner.unsubscribe=job.onReady?.(()=>{if(deferredAction===owner&&owner.generation===schedulerGeneration)scheduleOnlineContinuation();});
        // The first slice also belongs to a later host task. The requesting UI
        // can show its pending state before any expensive candidate work starts.
        scheduleOnlineContinuation();
      });
    }
    function advanceDeferredAction(){
      const owner=deferredAction;
      if(!owner)return false;
      try{
        if(owner.original!==getState()||owner.generation!==schedulerGeneration||owner.job.valid?.()===false){cancelDeferredAction('stale-action');return false;}
        if(!owner.job.advance(monotonicNow()+3).done)return false;
        if(owner.original!==getState()||owner.job.valid?.()===false){cancelDeferredAction('stale-action');return false;}
        // Resolve only after an atomic candidate commit. No registered clock is
        // consumed by the action owner; the ordinary ledger drain follows later.
        const value=owner.job.commit();deferredAction=null;detachOnlineReady(owner);owner.resolve(value);
        return true;
      }catch(error){
        deferredAction=null;detachOnlineReady(owner);
        try{owner.job.cancel?.('action-failed');}finally{owner.reject(error);}
        return false;
      }
    }
    
    function advanceManualQi(){const job=manualQi,I=WIS.Cultivation.ImmortalLogic;if(job.original!==getState()||job.generation!==schedulerGeneration||job.key!==I.qiBatchStateKey(getState())){manualQi=null;return false;}try{job.value=I.advanceQiLayersBatch(job.shouldRender);manualQi=null;return true;}catch(error){manualQi=null;throw error;}}
    function requestQiBatch(shouldRender=true){
      // Manual and automatic work share the same owner; repeated clicks do not
      // queue purchases or steal another slice from a pending automatic step.
      if(deferredAction||manualQi||context.hasDeferredQi?.()||importHold||isHidden()||!isInitialLoadComplete()||onlineBlocked())return 0;
      const job={original:getState(),generation:schedulerGeneration,
        key:WIS.Cultivation.ImmortalLogic.qiBatchStateKey(getState()),shouldRender,value:0};
      cancelOnlineWork();manualQi=job;processOnline();return job.value;
    }
    function setLastTickAt(value){
      lastTickAt=Number.isFinite(Number(value))?Math.max(0,Number(value)):Date.now();
      // Explicitly ending a frozen interval must persist the same new online
      // origin. Otherwise a completed recovery checkpoint replays that wait.
      // A hidden interval still belongs to registerReturn and stays untouched.
      if(ledger().awaySince===null)writeLedger({boundaryAt:Math.max(ledger().boundaryAt||0,lastTickAt)});
    }
    function resetAccumulators({preservePending=false}={}){
      committedRates=null;
      invalidateOnlineScheduler();discardFailure=null;
      const pending=preservePending ? (ledger().pendingContinuousTime||[]).map(p=>({...p})) : [];
      lastTickAt=Date.now();onlineIntervals.splice(0,onlineIntervals.length,...pending);
      onlineAccumulator=onlineIntervals.reduce((n,p)=>n+(p.source==='offline'?0:p.clock),0);tickRemaining=0;
      writeLedger({pendingContinuousTime:pending});
    }
    function eligible(){return WIS.Simulation.Compensation?.eligibleAtEnqueue?.(getState())===true;}
    function enqueueForegroundAt(now,{leaving=false}={}){
      const previous=lastTickAt;lastTickAt=now;
      if(!isInitialLoadComplete()||ledger().awaySince!==null||(!leaving&&isHidden()))return 0;
      const status=offline.getCatchUpStatus();
      if(status.clockSuspended||status.treasureRecovery?.active||status.phase==='paused'||((status.phase==='running'||status.pendingGameSeconds>epsilon)&&status.presentation==='blocking'))return 0;
      const seconds=Math.max(0,now-previous)/1000;
      if(!(seconds>0))return 0;
      const speed=effectiveDevSpeed();
      if(bounded&&ledger().pendingDiscard&&!onlineIntervals.some(p=>p.source==='offline')){
        accumulateDiscard(seconds,seconds*speed);writeLedger({boundaryAt:now});return seconds;
      }
      // Runtime intervals retain speed and original compensation qualification.
      // They are never recovery tasks or prepared work, and do not lock the UI.
      const reserved=onlineIntervals.reduce((sum,part)=>sum+(part.compensationEligible?part.clock:0),0);
      const available=eligible()?Math.min(seconds,Math.max(0,offline.availableCompensationClockSeconds()-reserved)):0;
      const covered=available>epsilon?available:0;
      for(const [clock,compensationEligible] of [[covered,true],[seconds-covered,false]])if(clock>0)
      {
        const tail=onlineIntervals[onlineIntervals.length-1];
        if(tail&&tail.source!=='offline'&&tail.speed===speed&&tail.compensationEligible===compensationEligible)tail.clock+=clock;
        else onlineIntervals.push({source:'online',clock,speed,compensationEligible});
        onlineAccumulator+=clock;
      }
      writeLedger({boundaryAt:now});limitOnlineQueue(failureStillCurrent()?0:limit?.waitingClock);return seconds;
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
      if(importHold||isHidden()||!isInitialLoadComplete())return false;
      if(onlineBlocked())return false;
      if(deferredAction)return deferredAction.job.waiting?.()!==true;
      if(manualQi)return true;
      if(discardFailure||failureStillCurrent())return false;
      if(onlineWork)return onlineWork.job.waiting?.()!==true;
      dropEmptyOnlineHeads();
      if(!onlineIntervals.length)return false;
      if(onlineIntervals[0].source==='offline')return true;
      const offlineIndex=onlineIntervals.findIndex(p=>p.source==='offline');
      const prefix=offlineIndex<0?onlineIntervals:onlineIntervals.slice(0,offlineIndex);
      const availableGame=prefix.reduce((sum,part)=>sum+part.clock*part.speed,0);
      if(availableGame+epsilon>=currentCadence())return true;
      if(offlineIndex>=0&&availableGame>epsilon)return true;
      return (flush||(bounded&&ledger().pendingDiscard))&&availableGame>epsilon;
    }
    function drainOnlineSlice(flush=false){
      limitOnlineQueue(failureStillCurrent()?0:limit?.waitingClock);inspectOnlineTimeout();flushDiscardEffects();
      const status=offline.getCatchUpStatus();
      if(deferredAction&&deferredActionBlocked(status))cancelDeferredAction('action-blocked');
      if(onlineBlocked(status)){cancelOnlineWork();cancelDeferredAction('online-blocked');return {progressed:false,blocked:true,needsContinuation:false,hitOfflineBarrier:false,steps:0};}
      if(deferredAction){
        let progressed=false;
        stepping=true;context.beginTransaction?.();
        try{progressed=advanceDeferredAction();}
        finally{try{context.endTransaction?.();}finally{stepping=false;}}
        // Keep action resolution/render and the next formal online step in
        // separate host tasks, even when this candidate finished very quickly.
        return {progressed,blocked:false,needsContinuation:hasRunnableOnlineWork(flush),hitOfflineBarrier:false,steps:0};
      }
      if((discardFailure||failureStillCurrent())&&!manualQi)return {progressed:false,blocked:true,needsContinuation:false,steps:0};
      const sliceStartedAt=monotonicNow();
      let progressed=false,hitOfflineBarrier=false,blocked=false,treasureRecoveryRequired=false,steps=0;
      stepping=true;context.beginTransaction?.();
      try {
        if(manualQi)progressed=advanceManualQi();
        while(!manualQi&&!failureStillCurrent()&&steps<maxSteps&&onlineIntervals.length){
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
          if(availableGame+epsilon<cadence&&!flush&&offlineIndex<0&&!(bounded&&ledger().pendingDiscard))break;
          const part=onlineIntervals[0],seconds=Math.min(cadence,part.clock*part.speed);
          const committedIdentity=rateIdentity();
          let result;
          if(typeof context.prepareOnlineWork==='function'){
            if(onlineWork&&(onlineWork.part!==part||onlineWork.generation!==schedulerGeneration)){cancelOnlineWork();break;}
            // A remote owner is dormant until notified. Main ticks continue to
            // capture time and flush presentation, without validating its heavy
            // snapshot, advancing it, or acquiring another candidate.
            if(onlineWork?.job.waiting?.()===true)break;
            if(onlineWork&&!onlineWork.job.checksInputOnAdvance&&onlineWork.job.valid?.()===false){cancelOnlineWork();break;}
            try {
              if(!onlineWork){onlineWork={part,generation:schedulerGeneration,seconds,startedAt:monotonicNow(),job:context.prepareOnlineWork(seconds,{source:'online',compensationEligible:part.compensationEligible,clockRatio:1/part.speed,logicalTickRemaining:cadence,atomicCadence:true})};watchOnlineReady(onlineWork);break;}
              // One resume per candidate and host task; give the browser a turn before retrying.
              const owner=onlineWork,next=owner.job.advance(sliceStartedAt+onlineSliceBudgetMs);
              if(!next.done)break;
              result=context.advanceGameStep(owner.seconds,true,{foreground:true,preparedOnlineSegment:next.token});onlineWork=null;detachOnlineReady(owner);
            } catch(error){
              cancelOnlineWork();
              if(error?.code==='rank-work-stale')break;
              stopFailedWork(error);blocked=true;break;
            }
          }else {
          result=context.advanceGameStep(seconds,true,{
            foreground:true,
            timeSegment:{source:'online',compensationEligible:part.compensationEligible,clockRatio:1/part.speed},
            deferAutomation:seconds+epsilon<cadence
          });
          }
          const processed=Math.max(0,Math.min(seconds,Number(result?.processedSeconds)||0));
          if(!(processed>0)){
            treasureRecoveryRequired=result?.treasureRecoveryRequired===true;
            if(bounded&&!treasureRecoveryRequired)stopFailedWork(Object.assign(Error('结算未产生完整进展'),{code:'online-no-progress'}));
            blocked=true;break;
          }
          publishCommittedRates(result,committedIdentity);
          progressed=true;steps++;publishedSinceRender=true;timeoutFailures=0;
          const clock=processed/part.speed;
          part.clock=Math.max(0,part.clock-clock);
          onlineAccumulator=Math.max(0,onlineAccumulator-clock);
          if(part.clock<=epsilon)onlineIntervals.shift();
          tickRemaining=result?.clockCommitted===true?Math.max(0,Number(result.logicalTickRemaining)||0):Math.max(0,cadence-processed);
          getState().core.runtime.onlineCadenceRemaining=tickRemaining||stepSeconds;
          if(result?.clockCommitted!==true)getState().totalElapsedSeconds+=clock;
          syncPendingLedger();
          if(!onlineIntervals.length)flushDiscardEffects();
          // Match the old end-unit play-time achievement check.
          const rates={...WIS.tmp.rates};
          if(!getState().unlockedAchievements?.trainingUp&&getState().totalElapsedSeconds>=600)
            WIS.Meta.Achievements.recordCurrent();
          Object.assign(WIS.tmp.rates,rates);
          if(monotonicNow()-sliceStartedAt>=onlineSliceBudgetMs)break;
        }
        // Only confirmed work can change the presented achievement set.
        // A pending proof must not dirty the page through the legacy notifier.
        if(progressed)context.notifyNewAchievements?.();
      } finally {
        // A deferred save must see time already debited from the accumulator.
        // prepareSave may record elapsed time, but cannot reenter this step loop.
        const rates={...WIS.tmp.rates};
        try{context.endTransaction?.();}finally{Object.assign(WIS.tmp.rates,rates);stepping=false;}
      }
      if(steps>0&&!firstOnlineSettlementNotified){
        firstOnlineSettlementNotified=true;
        // Presentation callback only, outside the committed transaction.
        try{context.onFirstOnlineSettlement?.();}catch(_){}
      }
      // Recovery needs an actual FIFO task. A zero-time notice alone cannot
      // own the pending online clock. Hand off only after the atomic step and
      // deferred-save transaction have returned; preserve source and precision.
      if(treasureRecoveryRequired){
        handoffPendingRecovery();
        offline.queueCatchUpNotice(0,0);
      }
      flushDiscardEffects();
      const needsContinuation=!hitOfflineBarrier&&!blocked&&hasRunnableOnlineWork(flush);
      return {progressed,blocked,needsContinuation,hitOfflineBarrier,steps};
    }
    function flushOnlineRender(now){
      // A private proof changes no confirmed display values. Still flush any
      // presentation requested independently by input/status handlers.
      const view=getCommittedRates();
      const presentation=view.stopped?'stopped':!view.rates?'pending':view.stale?'stale':'ready';
      // One refresh at a status transition, even if the next candidate is still
      // pending. Repeated stale polls must not dirty costly page previews.
      if((!onlineWork&&!deferredAction)||publishedSinceRender){requestRender();publishedSinceRender=false;}
      else if(presentation!==lastRatePresentation)(context.requestGlobalRender||requestRender)();
      lastRatePresentation=presentation;
      (context.scheduleRender || flushRender)(now);
    }
    function scheduleOnlineContinuation(){
      if(continuationHandle!==null)return false;if(!hasRunnableOnlineWork(false)){closeContinuationChannel();return false;}
      const generation=schedulerGeneration;
      continuationHandle=queueOnlineTask(()=>{
        // A cancelled callback may already be queued. It must not clear the
        // current generation's handle or cancel a newly acquired action owner.
        if(generation!==schedulerGeneration)return;
        continuationHandle=null;
        if(importHold||isHidden()){cancelOnlineWork();cancelDeferredAction('inactive-host');closeContinuationChannel();return;}
        const result=drainOnlineSlice(false);
        flushOnlineRender(Date.now());
        if(result.needsContinuation&&generation===schedulerGeneration)scheduleOnlineContinuation();else closeContinuationChannel();
      });
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
      if(!backgroundAllowed()) {
        // Only temporary watermarks move. Foreground intervals remain queued.
        writeLedger({awaySince:isHidden()?now:null,registeredUntil:now,boundaryAt:now});
        lastTickAt=now;offline.returnFromAway(false);return 0;
      }
      if(left==null){
        if(onlineIntervals.some(part=>part.source==='offline'))handoffPendingRecovery();
        lastTickAt=now;offline.returnFromAway(false);return 0;
      }
      const from=Math.max(left,p.registeredUntil||0),seconds=Math.max(0,now-from)/1000;
      offline.invalidateSourceModels();
      if(seconds>0){const speed=effectiveDevSpeed();
        if(onlineIntervals.length){onlineIntervals.push({source:'offline',clock:seconds,speed,compensationEligible:false});syncPendingLedger();}
        else offline.appendCatchUpTask(seconds*speed,seconds,{source:'offline',compensationEligible:false,
          randomMode:'state',speed,sealed:true,presentation,external:true});}
      // A saved online prefix must not hide the offline barrier behind it.
      // Recovery owns the entire FIFO; online entries retain ONLINE_EXACT.
      if(onlineIntervals.some(part=>part.source==='offline'))handoffPendingRecovery();
      writeLedger({awaySince:null,registeredUntil:Math.max(from,now),boundaryAt:now});lastTickAt=now;
      if(isHidden()){writeLedger({awaySince:now});offline.suspendForAway();}
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
      if(accountElapsed&&elapsed>epsilon&&backgroundAllowed()){
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
      if(!backgroundAllowed()&&isHidden()){
        // visibilitychange was held during file IO, and temporary saves never
        // call prepareSave. Keep the remaining hidden interval out of ONLINE_EXACT.
        const p=ledger();
        writeLedger({awaySince:p.awaySince??now,registeredUntil:Math.max(p.registeredUntil||0,now),boundaryAt:now});
      }
      importHold=null;
      return {released:true,elapsedSeconds:elapsed};
    }
    function runMainTick(){
      const now=Date.now();
      if(!isInitialLoadComplete()){lastTickAt=now;return;}
      if(importHold){lastTickAt=now;return;}
      if(isHidden())return;
      inspectOnlineTimeout();
      if(deferredAction&&deferredActionBlocked())cancelDeferredAction('action-blocked');
      if(onlineBlocked()&&(manualQi||context.hasDeferredQi?.()))invalidateOnlineScheduler();
      // Recovery publishes its own small progress view. Re-rendering every
      // ability/ledger here repeatedly traverses the still-uncommitted backlog.
      const ownedStatus=offline.getCatchUpStatus();
      if(ownedStatus.treasureRecovery?.active||ownedStatus.worker?.running){lastTickAt=now;return;}
      // The visibility event normally handles this. Recover a missed event
      // through the SAME watermark, without inferring offline from duration.
      if(ledger().awaySince!==null)registerReturn(now);
      else {
        enqueueForegroundAt(now);flushDiscardEffects();
        if(offline.getPendingCatchUpSeconds()>epsilon){
          // A freshly imported blocking debt waits for the player. The live
          // loop must not be the entry point that starts it instead.
          if(!offline.isCatchUpPaused()&&!offline.isCatchUpAwaitingStart?.())offline.queueCatchUpNotice(0,0);
        }else if(continuationHandle===null)processOnline();
      }
      const finalStatus=offline.getCatchUpStatus();
      if(finalStatus.worker?.running){lastTickAt=now;return;}
      // A blocking wait owns a modal status view and the game state is frozen.
      // Do not repeatedly rebuild the full high-number page while nothing changes.
      if((finalStatus.awaitingStart===true||finalStatus.phase==='paused')&&finalStatus.presentation==='blocking'){
        lastTickAt=now;return;
      }
      flushOnlineRender(now);
    }
    function handleVisibilityChange(){
      if(!ready()||importHold)return;
      const now=Date.now();
      if(isHidden()){if(markAway(now))saveState();}
      else if(ledger().awaySince!==null){registerReturn(now);saveState();}
      requestRender();flushRender(now,{force:true});
    }
    function prepareSave(options={}){
      if(importHold&&options.importCommit!==true)return false;
      if(preparingSave||offline.isInternalWork?.()||!ready())return false;
      preparingSave=true;
      try{
        if(options.closing===true||isHidden())markAway(Date.now());
        else if(!importHold) {
          enqueueForegroundAt(Date.now());
          if(options.captureOnly!==true&&!deferredAction&&!onlineWork&&!onlineFailure)processOnline();
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
      if(!importHold)return {complete:false};
      return handoffPendingRecovery();
    }
    function handoffPendingRecovery(){
      if(stepping||preparingSave)return {complete:false};
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
    return Object.freeze({start,runMainTick,setLastTickAt,resetAccumulators,getCommittedRates,handleVisibilityChange,setNativeAppActive,
      prepareSave,restoreClosedTime,handoffImportRecovery,enqueueForegroundAt,captureForegroundTime,beginImportHold,finishImportHold,
      invalidateOnlineScheduler,requestQiBatch,requestDeferredAction,cancelDeferredAction,beforePlayerAction,flushDiscardEffects,
      settlementStatus:()=>({bounded,stopped:!!onlineFailure||!!discardFailure,reason:discardFailure?.message||onlineFailure?.code||null,pendingDiscard:ledger().pendingDiscard||null}),
      isDeferredActionPending:()=>!!deferredAction,
      isImportHoldActive:()=>!!importHold,
      snapshot:()=>({lastTickAt,onlineAccumulator,tickRemaining,onlineIntervals:onlineIntervals.map(part=>({...part}))}),
      restore:snapshot=>{
        committedRates=null;
        invalidateOnlineScheduler();
        lastTickAt=snapshot.lastTickAt;onlineAccumulator=snapshot.onlineAccumulator||0;
        tickRemaining=snapshot.tickRemaining||0;onlineIntervals.splice(0,onlineIntervals.length,...(snapshot.onlineIntervals||[]).map(part=>({...part})));
        syncPendingLedger();
      },
      getUnprocessedOnlineClockSeconds:()=>onlineAccumulator,
      getSimulationClockAccumulator:()=>onlineAccumulator});
  }});
}(window.WIS));

