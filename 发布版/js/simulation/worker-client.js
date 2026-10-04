(function defineWorkerClient(WIS) {
  'use strict';
  let nextJob=0;
  function create(options) {
    const clock=options.clock||(()=>performance.now()),hidden=options.hidden||(()=>document.hidden);
    const timeout=options.heartbeatTimeoutMs||5000,progressTimeout=options.progressTimeoutMs||30000,maxRetries=options.maxRetries??2;
    let worker=null,timer=null,request=null,jobId=null,generation=0,sequence=0,version=0,retries=0;
    let lastBeat=0,lastProgress=0,lastCheck=0,wasHidden=false,running=false;
    const stop=()=>{worker?.terminate();worker=null;if(timer!==null)clearInterval(timer);timer=null;running=false;};
    function fail(error) {stop();options.onFailure?.(error);}
    function launch() {
      generation++;lastBeat=lastProgress=lastCheck=clock();wasHidden=hidden();running=true;
      try {
        worker=options.factory();const owner=worker,active=generation;
        worker.onmessage=event=>{
          const m=event.data;
          if(!running||worker!==owner||active!==generation||!m||m.jobId!==jobId||m.generation!==generation)return;
          lastBeat=clock();
          if(m.type==='heartbeat'){options.onHeartbeat?.(m);return;}
          if(m.type==='error'){fail(Object.assign(Error(m.message||'离线线程出错'),{code:m.code}));return;}
          if(m.type==='checkpoint') {
            // A duplicate can be ACKed again after a lost ACK, but never installed.
            if(m.sequence===sequence){owner.postMessage({type:'ack',jobId,generation,sequence,baseStateVersion:version});return;}
            if(m.sequence!==sequence+1||m.baseStateVersion!==version){fail(Error('离线检查点顺序无效'));return;}
            try {
              const next=options.commit(m.payload,{jobId,generation,sequence:m.sequence,baseStateVersion:version+1});
              if(next&&typeof next.then==='function')throw Error('持久检查点必须同步确认');
              if(next)request={...request,...next};
              sequence=m.sequence;version++;
              // Re-emitting the starting checkpoint is not mathematical progress.
              // Otherwise a crash immediately after startup could retry forever.
              if(next?.progressed===true){retries=0;lastProgress=clock();}
              owner.postMessage({type:'ack',jobId,generation,sequence,baseStateVersion:version});
              options.onCommit?.();
            }catch(error){fail(error);}
          } else if(m.type==='done') {
            if(m.sequence!==sequence||m.baseStateVersion!==version){fail(Error('离线完成检查点尚未确认'));return;}
            stop();options.onDone?.(m);
          }
        };
        worker.onerror=event=>{event.preventDefault?.();if(worker===owner)recover(Error(event.message||'离线线程异常'));};
        worker.onmessageerror=()=>{if(worker===owner)recover(Error('离线线程消息无法读取'));};
        worker.postMessage({...request,type:'start',protocol:1,jobId,generation,sequence,baseStateVersion:version,retries});
        if(options.schedule!==false)timer=setInterval(checkHealth,250);
      }catch(error){fail(error);}
    }
    function recover(error) {
      stop();
      if(retries>=maxRetries){fail(error);return;}
      retries++;
      try{options.onRetry?.({retries,sequence});launch();}catch(error){fail(error);}
    }
    function checkHealth() {
      if(!running)return;
      const now=clock(),isHidden=hidden(),gap=now-lastCheck;lastCheck=now;
      // Suspended tabs/system sleep are not evidence of a wedged calculation.
      if(isHidden||wasHidden||gap>timeout*2){lastBeat=lastProgress=now;wasHidden=isHidden;return;}
      wasHidden=false;
      if(now-lastBeat>timeout)recover(Error('离线计算线程响应超时；未确认进度已丢弃，剩余时间保留'));
      else if(now-lastProgress>progressTimeout)recover(Error('离线计算长时间未提交进度；未确认候选已丢弃，剩余时间保留'));
    }
    return Object.freeze({start(value){stop();request=value;jobId=Date.now().toString(36)+'-'+(++nextJob);sequence=0;version=0;retries=value.retries||0;launch();},
      cancel(){generation++;stop();},checkHealth,status:()=>({running,jobId,generation,sequence,baseStateVersion:version,retries})});
  }
  WIS.Simulation.WorkerClient=Object.freeze({create});
}(window.WIS));
