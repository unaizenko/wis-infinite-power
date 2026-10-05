(function startOfflineWorker(WIS) {
  'use strict';
  const P=WIS.Simulation.WorkerProtocol;
  let running=false,stamp=null,engine=null,dirty=false,ack=null,lastStatus=null,retryCount=0,startingDebt=0;
  const post=(type,extra={})=>self.postMessage({type,...stamp,...extra});
  const hostYield=()=>new Promise(resolve=>setTimeout(resolve,0));
  async function flush() {
    if(!dirty)return;
    dirty=false;
    const snapshot=engine.snapshot(),recovery=engine.offline.getPersistenceSnapshot();
    const state=WIS.Core.State.cloneForSimulation(snapshot.domain);state.lastUpdateAt=Date.now();
    const status=engine.offline.getCatchUpStatus();lastStatus=status;
    const checkpoint={protocol:1,snapshot,recovery,status,rates:{...WIS.tmp.rates},tick:WIS.tmp.tick,
      confirmed:WIS.Simulation.FixedSegment.confirmed(),onlineConfirmed:engine.step.onlineMetrics()};
    if(status.pendingGameSeconds<startingDebt-1e-10)retryCount=0;
    if(recovery)recovery.workerRecovery={version:1,retries:retryCount,sequence:stamp.sequence+1};
    checkpoint.saveText=JSON.stringify(WIS.Core.Save.envelope(state,false,{offlineRecoveryOverride:recovery}));
    const payload=P.encode(checkpoint);
    await new Promise(resolve=>{ack=resolve;post('checkpoint',{sequence:stamp.sequence+1,payload});});
  }
  setInterval(()=>{if(running)post('heartbeat');},250);
  self.onmessage=event=>{
    const message=event.data;
    if(message?.type==='ack') {
      if(stamp&&message.jobId===stamp.jobId&&message.generation===stamp.generation&&
        message.sequence===stamp.sequence+1&&message.baseStateVersion===stamp.baseStateVersion+1&&ack){
        stamp.sequence++;stamp.baseStateVersion++;const done=ack;ack=null;done();
      }
      return;
    }
    if(message?.type!=='start'||running)return;
    stamp={jobId:message.jobId,generation:message.generation,sequence:message.sequence,baseStateVersion:message.baseStateVersion};
    void(async()=>{
      if(message.protocol!==1||message.build!==WIS.Core.Build.buildId)throw Error('离线线程版本不匹配');
      const initial=P.decode(message.payload);
      // A healthy but slow candidate may exceed the no-commit watchdog. Retry
      // the same confirmed state with smaller atomic spans, not the same work.
      // Keep this cap for this Worker lifetime even after retries reset on commit.
      const retrySpan=message.retries>0?WIS.Core.Config.offlineHierarchy.macroMaxSeconds/Math.pow(10,Math.min(2,message.retries)):null;
      engine=WIS.Simulation.OfflineHeadless.create(initial.snapshot,{maxOfflineSegmentSeconds:retrySpan,checkpoint(){dirty=true;},async yield(){await flush();await hostYield();}});
      if(initial.confirmed)WIS.Simulation.FixedSegment.restoreConfirmed(initial.confirmed);
      if(initial.onlineConfirmed)engine.step.restoreOnlineMetrics(initial.onlineConfirmed);
      if(initial.tick!=null)WIS.tmp.tick=initial.tick;
      const recovery=initial.recovery;
      if(!recovery)throw Error('离线线程缺少剩余时间');
      retryCount=message.retries||0;startingDebt=recovery.tasks.reduce((sum,t)=>sum+t.gameSeconds,0);
      if(!engine.offline.restorePersistenceSnapshot({...recovery,paused:false,pauseReason:null,awaitingStart:false,awaySuspended:false},0,{checkpoint:false}))throw Error('离线线程恢复失败');
      running=true;post('heartbeat');
      await engine.offline.simulateOfflineProgress(0,0);
      dirty=true;await flush();
      running=false;post('done',{report:lastStatus?.report||''});
    })().catch(error=>{running=false;post('error',{message:String(error.message||error),code:error.code||null});});
  };
}(self.WIS));
