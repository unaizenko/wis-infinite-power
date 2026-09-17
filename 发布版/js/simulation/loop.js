(function defineSimulationLoop(WIS) {
  'use strict';
  WIS.Simulation.Loop=Object.freeze({create(context){
    const {getState,offline,requestRender,flushRender,saveState,effectiveDevSpeed,isInitialLoadComplete}=context;
    const epsilon=context.epsilon;
    let lastTickAt=Date.now(),started=false,preparingSave=false;
    let onlineAccumulator=0,stepping=false;
    let importHold=null,importHoldSequence=0;
    const onlineIntervals=(getState().core.runtime.timeLedger.pendingContinuousTime||[]).map(p=>({...p}));
    onlineAccumulator=onlineIntervals.reduce((n,p)=>n+(p.source==='offline'?0:p.clock),0);
    const stepSeconds=context.simulationStepSeconds||0.1;
    const maxSteps=context.maxOnlineStepsPerFrame||8;
    let tickRemaining=0;
    const ledger=()=>getState().core.runtime.timeLedger;
    function writeLedger(fields){getState().core.runtime.timeLedger={...ledger(),...fields};}
    const ready=()=>context.isStateReady?context.isStateReady():isInitialLoadComplete();
    function setLastTickAt(value){lastTickAt=Number.isFinite(Number(value))?Math.max(0,Number(value)):Date.now();}
    function resetAccumulators(){lastTickAt=Date.now();onlineAccumulator=0;onlineIntervals.length=0;tickRemaining=0;writeLedger({pendingContinuousTime:[]});}
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
    function processOnline(flush=false){
      const status=offline.getCatchUpStatus();
      if(stepping||status.clockSuspended||status.phase==='running'||status.phase==='paused'||
          status.pendingGameSeconds>epsilon||status.treasureRecovery?.active)return;
      const previousAchievements=context.achievementStates?.();
      stepping=true;context.beginTransaction?.();
      try {
        for(let steps=0;steps<maxSteps&&onlineIntervals.length;steps++){
          const head=onlineIntervals[0];
          if(head.source==='offline'){
            offline.appendCatchUpTask(head.clock*head.speed,head.clock,{source:'offline',compensationEligible:false,
              randomMode:'state',speed:head.speed,sealed:true,presentation:'blocking',external:true});
            onlineIntervals.shift();writeLedger({pendingContinuousTime:onlineIntervals.map(p=>({...p}))});
            offline.returnFromAway(true);break;
          }
          const offlineIndex=onlineIntervals.findIndex(p=>p.source==='offline');
          const prefix=offlineIndex<0?onlineIntervals:onlineIntervals.slice(0,offlineIndex);
          const availableGame=prefix.reduce((sum,part)=>sum+part.clock*part.speed,0);
          const cadence=tickRemaining>epsilon?tickRemaining:
            (getState().core.runtime.onlineCadenceRemaining>epsilon?getState().core.runtime.onlineCadenceRemaining:stepSeconds);
          if(availableGame+epsilon<cadence&&!flush&&offlineIndex<0)break;
          const part=onlineIntervals[0],seconds=Math.min(cadence,part.clock*part.speed);
          const result=context.advanceGameStep(seconds,true,{
            foreground:true,
            timeSegment:{source:'online',compensationEligible:part.compensationEligible,clockRatio:1/part.speed},
            deferAutomation:seconds+epsilon<cadence
          });
          const processed=Math.max(0,Math.min(seconds,Number(result?.processedSeconds)||0));
          if(!(processed>0)){
            if(result?.treasureRecoveryRequired)offline.queueCatchUpNotice(0,0);
            break;
          }
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
        }
        if(previousAchievements)context.notifyNewAchievements?.(previousAchievements);
      } finally {
        // A deferred save must see time already debited from the accumulator.
        // prepareSave may record elapsed time, but cannot reenter this step loop.
        const rates={...WIS.tmp.rates};
        try{context.endTransaction?.();}finally{Object.assign(WIS.tmp.rates,rates);stepping=false;}
      }
    }
    function markAway(now){
      if(!ready()||ledger().awaySince!==null)return false;
      enqueueForegroundAt(now,{leaving:true});
      processOnline();
      writeLedger({awaySince:now,registeredUntil:now,boundaryAt:now});
      offline.suspendForAway();return true;
    }
    function registerReturn(now,{start=true,presentation='quiet',fallbackClosedAt=null}={}){
      const p=ledger(),left=p.awaySince??fallbackClosedAt;
      if(left==null){lastTickAt=now;offline.returnFromAway(false);return 0;}
      const from=Math.max(left,p.registeredUntil||0),seconds=Math.max(0,now-from)/1000;
      offline.invalidateSourceModels();
      if(seconds>0){const speed=effectiveDevSpeed();
        if(onlineIntervals.length)onlineIntervals.push({source:'offline',clock:seconds,speed,compensationEligible:false});
        else offline.appendCatchUpTask(seconds*speed,seconds,{source:'offline',compensationEligible:false,
          randomMode:'state',speed,sealed:true,presentation,external:true});}
      writeLedger({awaySince:null,registeredUntil:Math.max(from,now),boundaryAt:now});lastTickAt=now;
      if(document.hidden){writeLedger({awaySince:now});offline.suspendForAway();}
      else offline.returnFromAway(start);
      return seconds;
    }
    function beginImportHold() {
      if(importHold)return null;
      const now=Date.now();
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
      importHold=null;
      const elapsed=Math.max(0,now-hold.startedAt)/1000;
      lastTickAt=now;
      if(accountElapsed&&elapsed>epsilon){
        // Failed/cancelled imports return the picker/read time to the old save.
        // It is registered as blocking debt so a high-value old save cannot
        // immediately saturate the host as soon as the transaction is released.
        offline.holdCatchUpUntilUserStart?.(reason);
        offline.appendCatchUpTask(elapsed*hold.speed,elapsed,{source:'offline',compensationEligible:false,
          randomMode:'state',speed:hold.speed,sealed:true,presentation:'blocking',external:true});
        writeLedger({awaySince:null,registeredUntil:Math.max(Number(ledger().registeredUntil)||0,now),boundaryAt:now});
      }
      return {released:true,elapsedSeconds:elapsed};
    }
    function runMainTick(){
      const now=Date.now();
      if(!isInitialLoadComplete()){lastTickAt=now;return;}
      if(importHold){lastTickAt=now;return;}
      if(document.hidden)return;
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
        }else processOnline();
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
        else {enqueueForegroundAt(Date.now());processOnline();}
      }finally{writeLedger({pendingContinuousTime:onlineIntervals.map(p=>({...p}))});preparingSave=false;}
      return true;
    }
    function restoreClosedTime(snapshot){
      const pending=ledger().pendingContinuousTime||[];
      onlineIntervals.splice(0,onlineIntervals.length,...pending.map(p=>({...p})));
      onlineAccumulator=onlineIntervals.reduce((n,p)=>n+(p.source==='offline'?0:p.clock),0);
      tickRemaining=0;
      // An explicit leave/normal-close is evidence of new offline time.
      // A checkpoint while blocking with neither marker is recovery waiting.
      const fallback=snapshot?.closedAt>0?snapshot.closedAt:
        onlineIntervals.length?getState().lastUpdateAt:null;
      return registerReturn(Date.now(),{start:false,presentation:'blocking',fallbackClosedAt:fallback});
    }
    function start(){if(started)return;started=true;
      document.addEventListener('visibilitychange',handleVisibilityChange);
      window.setInterval(runMainTick,context.logicIntervalMs);
    }
    return Object.freeze({start,runMainTick,setLastTickAt,resetAccumulators,handleVisibilityChange,
      prepareSave,restoreClosedTime,enqueueForegroundAt,beginImportHold,finishImportHold,
      isImportHoldActive:()=>!!importHold,
      snapshot:()=>({lastTickAt,onlineAccumulator,tickRemaining,onlineIntervals:onlineIntervals.map(part=>({...part}))}),
      restore:snapshot=>{lastTickAt=snapshot.lastTickAt;onlineAccumulator=snapshot.onlineAccumulator||0;
        tickRemaining=snapshot.tickRemaining||0;onlineIntervals.splice(0,onlineIntervals.length,...(snapshot.onlineIntervals||[]).map(part=>({...part})));},
      getUnprocessedOnlineClockSeconds:()=>onlineAccumulator,
      getSimulationClockAccumulator:()=>onlineAccumulator});
  }});
}(window.WIS));
