(function defineSimulationLoop(WIS) {
  'use strict';
  WIS.Simulation.Loop=Object.freeze({create(context){
    const {getState,offline,requestRender,flushRender,saveState,effectiveDevSpeed,isInitialLoadComplete}=context;
    const epsilon=context.epsilon;
    let lastTickAt=Date.now(),started=false,preparingSave=false;
    const ledger=()=>getState().core.runtime.timeLedger;
    function writeLedger(fields){getState().core.runtime.timeLedger={...ledger(),...fields};}
    const ready=()=>context.isStateReady?context.isStateReady():isInitialLoadComplete();
    function setLastTickAt(value){lastTickAt=Number.isFinite(Number(value))?Math.max(0,Number(value)):Date.now();}
    function resetAccumulators(){lastTickAt=Date.now();}
    function eligible(){return WIS.Simulation.Compensation?.eligibleAtEnqueue?.(getState())===true;}
    function enqueueForegroundAt(now,{leaving=false}={}){
      const previous=lastTickAt;lastTickAt=now;
      if(!isInitialLoadComplete()||ledger().awaySince!==null||(!leaving&&document.hidden))return 0;
      const status=offline.getCatchUpStatus();
      if(status.clockSuspended||status.treasureRecovery?.active||status.phase==='paused'||((status.phase==='running'||status.pendingGameSeconds>epsilon)&&status.presentation==='blocking'))return 0;
      const seconds=Math.max(0,now-previous)/1000;
      if(!(seconds>0))return 0;
      const speed=effectiveDevSpeed();
      // Reserve eligibility without spending credit. Earlier queued online
      // time keeps its original qualification even if a new grant is added.
      const available=eligible()?Math.min(seconds,offline.availableCompensationClockSeconds()):0;
      // Sub-resolution quota stays in the compensation ledger for a later grant.
      // Never manufacture an unexecutable tiny task before every ordinary tick:
      // it repeatedly seals the following source and defeats segment coalescing.
      const covered=available>epsilon?available:0;
      for(const [clock,compensationEligible] of [[covered,true],[seconds-covered,false]])if(clock>0)
        offline.appendCatchUpTask(clock*speed,clock,{source:'online',compensationEligible,
          randomMode:'state',speed,sealed:false,presentation:'quiet',mergeWithTail:true,external:true});
      writeLedger({boundaryAt:now});return seconds;
    }
    function markAway(now){
      if(!ready()||ledger().awaySince!==null)return false;
      enqueueForegroundAt(now,{leaving:true});
      offline.sealOnlineTail();
      writeLedger({awaySince:now,registeredUntil:now,boundaryAt:now});
      offline.suspendForAway();return true;
    }
    function registerReturn(now,{start=true,presentation='quiet',fallbackClosedAt=null}={}){
      const p=ledger(),left=p.awaySince??fallbackClosedAt;
      if(left==null){lastTickAt=now;offline.returnFromAway(false);return 0;}
      const from=Math.max(left,p.registeredUntil||0),seconds=Math.max(0,now-from)/1000;
      offline.invalidateSourceModels();
      if(seconds>0){const speed=effectiveDevSpeed();
        offline.appendCatchUpTask(seconds*speed,seconds,{source:'offline',compensationEligible:false,
          randomMode:'state',speed,sealed:true,presentation,external:true});}
      writeLedger({awaySince:null,registeredUntil:Math.max(from,now),boundaryAt:now});lastTickAt=now;
      if(document.hidden){writeLedger({awaySince:now});offline.suspendForAway();}
      else offline.returnFromAway(start);
      return seconds;
    }
    function runMainTick(){
      const now=Date.now();
      if(!isInitialLoadComplete()){lastTickAt=now;return;}
      if(document.hidden)return;
      // Recovery publishes its own small progress view. Re-rendering every
      // ability/ledger here repeatedly traverses the still-uncommitted backlog.
      if(offline.getCatchUpStatus().treasureRecovery?.active){lastTickAt=now;return;}
      // The visibility event normally handles this. Recover a missed event
      // through the SAME watermark, without inferring offline from duration.
      if(ledger().awaySince!==null)registerReturn(now);
      else {
        enqueueForegroundAt(now);
        if(!offline.isCatchUpPaused())offline.queueCatchUpNotice(0,0);
      }
      requestRender();flushRender(now);
    }
    function handleVisibilityChange(){
      if(!ready())return;
      const now=Date.now();
      if(document.hidden){if(markAway(now))saveState();}
      else if(ledger().awaySince!==null){registerReturn(now);saveState();}
      requestRender();flushRender(now,{force:true});
    }
    function prepareSave(options={}){
      if(preparingSave||offline.isInternalWork?.()||!ready())return;
      preparingSave=true;
      try{
        if(options.closing===true||document.hidden)markAway(Date.now());
        else enqueueForegroundAt(Date.now());
      }finally{preparingSave=false;}
    }
    function restoreClosedTime(snapshot){
      // An explicit leave/normal-close is evidence of new offline time.
      // A checkpoint while blocking with neither marker is recovery waiting.
      const fallback=snapshot?.closedAt>0?snapshot.closedAt:null;
      return registerReturn(Date.now(),{start:false,presentation:'blocking',fallbackClosedAt:fallback});
    }
    function start(){if(started)return;started=true;
      document.addEventListener('visibilitychange',handleVisibilityChange);
      window.setInterval(runMainTick,context.logicIntervalMs);
    }
    return Object.freeze({start,runMainTick,setLastTickAt,resetAccumulators,handleVisibilityChange,
      prepareSave,restoreClosedTime,enqueueForegroundAt,
      snapshot:()=>({lastTickAt}),restore:snapshot=>{lastTickAt=snapshot.lastTickAt;},
      // Every accepted wall interval is already in the persisted source queue;
      // backdating lastUpdateAt would record the same time a second time.
      getUnprocessedOnlineClockSeconds:()=>0,
      getSimulationClockAccumulator:()=>0});
  }});
}(window.WIS));
