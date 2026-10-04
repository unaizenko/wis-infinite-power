(function defineOfflineWorker(WIS) {
  'use strict';
  function browserWorker() {
    const bundle=WIS.Simulation.OfflineWorkerBundle;
    if(typeof Worker!=='function'||!bundle||bundle.build!==WIS.Core.Build.buildId)throw Error('当前浏览器无法启动离线计算线程；剩余时间已保留');
    const url=URL.createObjectURL(new Blob([bundle.source],{type:'text/javascript'}));
    try{return new Worker(url,{name:'WIS offline settlement'});}finally{URL.revokeObjectURL(url);}
  }
  function create(context) {
    const P=WIS.Simulation.WorkerProtocol,S=WIS.Core.State;
    let local,unsubscribe,client=null,active=false,latest=null,completed=null,baseRoots=null;
    let activePromise=null,resolveActive=null,internal=false,rebinding=false;
    const listeners=new Set(),notices=WIS.Simulation.Offline.createPauseNotices();
    const roots=()=>{const s=context.getState();return [s.core,s.powerSystem,s.cultivation,s.meta];};
    const publish=()=>{const view=status();for(const fn of listeners)try{fn(view);}catch(error){console.error('WIS Worker status listener',error);}};
    function makeLocal(recovery) {
      rebinding=true;
      try{
        unsubscribe?.();local=WIS.Simulation.Offline.create({...context,useWorker:false});
        if(recovery&&!local.restorePersistenceSnapshot(recovery,0,{checkpoint:false}))throw Error('无法恢复已确认离线检查点');
        unsubscribe=local.subscribeCatchUpStatus(()=>{if(!active&&!rebinding)publish();});
      }finally{rebinding=false;}
    }
    function status() {
      if(active)return {...latest.status,locked:true,clockSuspended:true,presentation:'blocking',awaitingStart:false,
        worker:{...client?.status(),enabled:true},phase:latest.status.phase==='paused'?'paused':'running'};
      return completed?{...completed,worker:{enabled:true,running:false}}:local.getCatchUpStatus();
    }
    function snapshot(options={}) {
      if(!active)return local.getPersistenceSnapshot(options);
      return latest.recovery?{...latest.recovery,closedAt:options.closing?Date.now():null}:null;
    }
    function retire({pause=null}={}) {
      if(!active)return;
      client.cancel();active=false;
      let recovery=latest.recovery;
      if(pause&&recovery)recovery={...recovery,paused:true,awaitingStart:false,pauseReason:pause,awaySuspended:false};
      makeLocal(recovery);
      completed=!recovery?{...latest.status,phase:'completed',locked:false,clockSuspended:false,pendingGameSeconds:0,pendingClockSeconds:0}:null;
      const resolve=resolveActive;resolveActive=null;activePromise=null;
      resolve?.(completed?.report||'');publish();context.requestRender?.();
    }
    function persist() {
      internal=true;try{context.checkpoint?.();}finally{internal=false;}
    }
    function failed(error) {
      retire({pause:{reason:'offline-worker-failed',error:{name:error.name||'Error',code:error.code||null,message:String(error.message||error)},
        pendingGameSeconds:latest?.status.pendingGameSeconds||0}});
      try{persist();}catch(saveError){WIS.Core.Save.noteFailure(saveError);}
    }
    function start() {
      const view=local.getCatchUpStatus();
      if(active)return activePromise;
      if(view.awaitingStart||view.phase==='paused'||view.awaySuspended||!(view.pendingGameSeconds>0))return Promise.resolve('');
      const recovery=local.getPersistenceSnapshot();
      // Ordinary online collection keeps its precise foreground runner. A
      // mixed queue with offline debt is wholly owned by this one Worker.
      if(!recovery?.tasks.some(t=>t.source==='offline'))return local.simulateOfflineProgress(0,0);
      completed=null;notices.reset();
      latest={protocol:1,snapshot:context.snapshotState(),recovery,status:{...view,phase:'running',awaySuspended:false},
        confirmed:WIS.Simulation.FixedSegment.confirmed(),onlineConfirmed:context.onlineMetrics?.(),tick:WIS.tmp.tick};
      local.suspendForAway();active=true;baseRoots=roots();
      activePromise=new Promise(resolve=>{resolveActive=resolve;});const result=activePromise;
      client=WIS.Simulation.WorkerClient.create({factory:context.workerFactory||browserWorker,schedule:context.workerSchedule,
        commit(payload,stamp) {
          if(baseRoots.some((root,i)=>root!==roots()[i]))throw Error('离线计算起点已改变；候选未安装');
          const next=P.decode(payload);
          if(next.protocol!==1||!next.snapshot?.domain?.core||!next.status||typeof next.saveText!=='string')throw Error('离线检查点内容无效');
          WIS.Core.Save.validateRecovery(next.recovery);
          const prepared={...next.snapshot,domain:S.cloneForSimulation(next.snapshot.domain)};
          const progressed=next.status.pendingGameSeconds<latest.status.pendingGameSeconds-1e-10;
          // Prepare everything that can fail before the durable write. The
          // same payload carries assets, RNG, clocks, remaining debt and budget.
          internal=true;
          try{
            WIS.Core.Save.writePrepared(next.saveText);
            (context.installWorkerSnapshot||context.restoreState)(prepared);
            if(next.rates)Object.assign(WIS.tmp.rates,next.rates);
            if(next.tick!=null)WIS.tmp.tick=next.tick;
            WIS.Simulation.FixedSegment.restoreConfirmed(next.confirmed);
            context.restoreOnlineMetrics?.(next.onlineConfirmed);
            latest=next;baseRoots=roots();
          }finally{internal=false;}
          // Only this successfully installed and durable checkpoint is a restart
          // source. A lost ACK never replays the previous asset/debt pair.
          return {payload,progressed};
        },onCommit(){publish();},
        onRetry(info){
          if(latest.recovery)latest.recovery={...latest.recovery,workerRecovery:{version:1,...info}};
          persist();publish();
        },onFailure:failed,onDone(){
          const report=latest.status.report;
          retire();context.setLastTickAt?.(Date.now());
          if(completed&&report)context.showNotice?.(report,6000);
        }});
      try{persist();client.start({build:WIS.Core.Build.buildId,retries:recovery.workerRecovery?.retries||0,payload:P.encode(latest)});}
      catch(error){failed(error);}
      publish();return result;
    }
    makeLocal(null);
    const delegate=(name,...args)=>{retire();completed=null;return local[name](...args);};
    const controller={
      simulateOfflineProgress(seconds,clock=seconds){if(seconds>0)delegate('appendCatchUpTask',seconds,clock);return start();},
      queueCatchUpNotice(seconds,clock=seconds){void controller.simulateOfflineProgress(seconds,clock);},
      appendCatchUpTask:(...args)=>delegate('appendCatchUpTask',...args),
      cancelCatchUp:(...args)=>delegate('cancelCatchUp',...args),abandonCatchUp:(...args)=>delegate('abandonCatchUp',...args),
      convertOfflineToCompensation:(...args)=>delegate('convertOfflineToCompensation',...args),
      retryCatchUp(){
        if(active)return activePromise;
        const recovery=local.getPersistenceSnapshot();if(!recovery)return Promise.resolve('');
        makeLocal({...recovery,paused:false,pauseReason:null,awaitingStart:false,awaySuspended:false});return start();
      },
      holdCatchUpUntilUserStart:(...args)=>delegate('holdCatchUpUntilUserStart',...args),
      releaseCatchUpUserStart:(...args)=>local.releaseCatchUpUserStart(...args),
      startCatchUp(){local.releaseCatchUpUserStart();return start();},
      pauseCatchUpByPlayer(){
        if(!active)return local.pauseCatchUpByPlayer();
        retire({pause:{reason:'player-paused',pendingGameSeconds:latest.status.pendingGameSeconds}});persist();return true;
      },
      pauseAfterOnlineError:(...args)=>delegate('pauseAfterOnlineError',...args),
      acknowledgeCatchUp(){if(active)return false;completed=null;return local.acknowledgeCatchUp();},
      sealOnlineTail:(...args)=>delegate('sealOnlineTail',...args),
      suspendForAway:(...args)=>delegate('suspendForAway',...args),
      returnFromAway(run=true){local.returnFromAway(false);return run?start():Promise.resolve('');},
      invalidateSourceModels(){if(internal)return;retire();local.invalidateSourceModels();},
      availableCompensationClockSeconds:()=>active?0:local.availableCompensationClockSeconds(),
      isInternalWork:()=>internal||active||local.isInternalWork(),getPersistenceSnapshot:snapshot,
      claimPauseNotice:view=>notices.claim(view),
      restorePersistenceSnapshot:(...args)=>delegate('restorePersistenceSnapshot',...args),getCatchUpStatus:status,
      subscribeCatchUpStatus(fn){listeners.add(fn);fn(status());return ()=>listeners.delete(fn);},
      isCatchUpInProgress:()=>active||local.isCatchUpInProgress(),getPendingCatchUpSeconds:()=>active?latest.status.pendingGameSeconds:local.getPendingCatchUpSeconds(),
      getPendingCatchUpClockSeconds:()=>active?latest.status.pendingClockSeconds:local.getPendingCatchUpClockSeconds(),
      isCatchUpPaused:()=>status().phase==='paused',isCatchUpAwaitingStart:()=>!active&&local.isCatchUpAwaitingStart(),
      getCatchUpStartReason:()=>active?null:local.getCatchUpStartReason(),getCatchUpPauseReason:()=>status().pauseReason
    };
    return Object.freeze(controller);
  }
  WIS.Simulation.OfflineWorker=Object.freeze({create});
}(window.WIS));
