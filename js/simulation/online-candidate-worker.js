(function defineOnlineCandidateWorker(WIS){
  'use strict';
  // A Worker owns only a disposable candidate. The main thread remains the
  // authority for state, time registration, player actions and final install.
  let requestSequence=0;
  function nativeFactory(){
    const bundle=WIS.Simulation.OnlineCandidateWorkerBundle;
    if(!bundle||bundle.build!==WIS.Core.Build.buildId)throw Error('在线线程构建不匹配');
    const url=URL.createObjectURL(new Blob([bundle.source],{type:'text/javascript'}));
    try{return new Worker(url);}finally{URL.revokeObjectURL(url);}
  }
  function create({step,factory=null,timeoutMs=30000,enabled=true}={}){
    const P=WIS.Simulation.WorkerProtocol,build=WIS.Core.Build.buildId;
    let worker=null,active=null,delivered=null,disabled=!enabled,closed=false;
    const counts={dispatched:0,received:0,fallbacks:0,cancelled:0,requestCharacters:0,responseCharacters:0};
    const stopWorker=()=>{const old=worker;worker=null;old?.terminate?.();};
    function infrastructureFailure(error){
      disabled=true;stopWorker();
      if(active&&(active.status==='waiting'||active.status==='ready')){
        counts.fallbacks++;active.failure=error;active.status='fallback';active.clearTimer();active.notify();
      }
    }
    function ensureWorker(){
      if(worker)return worker;
      const owner=(factory||nativeFactory)();worker=owner;
      owner.onmessage=({data:m})=>{
        const job=active;
        if(worker!==owner||!job||job.status!=='waiting'||!m||m.requestId!==job.id)return;
        if(m.protocol!==1||m.build!==build){infrastructureFailure(Error('在线线程响应版本不匹配'));return;}
        if(m.type==='result'){
          if(typeof m.payload!=='string'){infrastructureFailure(Error('在线线程结果编码无效'));return;}
          counts.received++;counts.responseCharacters+=m.payload.length;job.payload=m.payload;job.status='ready';job.clearTimer();job.notify();
        }else if(m.type==='error'){
          job.failure=Object.assign(Error(m.message||'在线候选计算失败'),{code:m.code||'online-candidate-failed'});
          job.status='failed';job.clearTimer();job.notify();
        }
      };
      owner.onerror=event=>{event.preventDefault?.();if(worker===owner)infrastructureFailure(Error(event.message||'在线线程异常'));};
      owner.onmessageerror=()=>{if(worker===owner)infrastructureFailure(Error('在线线程消息无法读取'));};
      return owner;
    }
    function prepareOnlineWork(seconds,timeSegment={}){
      if(closed)throw Error('online candidate client closed');
      delivered?.cancel();
      if(disabled||!WIS.Core.Amount?.enabled()||!step.createOnlineCandidateReceiver||(!factory&&typeof Worker!=='function'))return step.prepareOnlineWork(seconds,timeSegment);
      if(active)throw Error('online candidate already active');
      const receiver=step.createOnlineCandidateReceiver(seconds,timeSegment);
      let timer=null,listener=null,local=null;
      const job={id:++requestSequence,status:'waiting',payload:null,failure:null,
        clearTimer(){if(timer!==null){clearTimeout(timer);timer=null;}},
        notify(){listener?.();}};
      active=job;
      const retire=()=>{job.clearTimer();listener=null;if(active===job)active=null;if(delivered===job)delivered=null;};
      const api=Object.freeze({checksInputOnAdvance:true,waiting:()=>job.status==='waiting',
        onReady(callback){listener=callback;if(job.status!=='waiting'&&job.status!=='closed'&&job.status!=='consumed')callback();return ()=>{if(listener===callback)listener=null;};},
        valid:()=>job.status!=='closed'&&job.status!=='consumed'&&(local?.valid?local.valid():receiver.valid()),
        advance(deadline){
          if(job.status==='waiting')return {done:false,waiting:true};
          if(job.status==='closed'||job.status==='consumed')throw Error('online candidate consumed or closed');
          if(job.status==='failed')throw job.failure;
          if(job.status==='fallback'){
            if(!receiver.valid())throw Object.assign(Error('online candidate input changed'),{code:'rank-work-stale'});
            receiver.close();local=step.prepareOnlineWork(seconds,timeSegment);job.status='local';
          }
          if(job.status==='local'){const result=local.advance(deadline);if(result.done){job.status='consumed';retire();}return result;}
          let packet;try{packet=P.decode(job.payload);}catch(error){infrastructureFailure(error);return api.advance(deadline);}
          try{const token=receiver.accept(packet);job.payload=null;job.status='consumed';retire();delivered=job;return {done:true,token};}
          catch(error){job.failure=error;job.status='failed';throw error;}
        },
        close(){if(job.status==='closed')return;const handedOff=job.status==='consumed',wasWaiting=job.status==='waiting';job.status='closed';job.payload=null;retire();receiver.close();local?.close?.();if(!handedOff)counts.cancelled++;
          if(wasWaiting)try{worker?.postMessage({type:'cancel',protocol:1,build,requestId:job.id});}catch{stopWorker();disabled=true;}
        }});
      try{
        const owner=ensureWorker(),payload=receiver.encodedRequest||P.encode(receiver.request);counts.dispatched++;counts.requestCharacters+=payload.length;
        owner.postMessage({type:'compute',protocol:1,build,requestId:job.id,payload});
        if(job.status==='waiting')timer=setTimeout(()=>{if(active===job&&job.status==='waiting')infrastructureFailure(Error('在线线程响应超时；待结算时间保留'));},timeoutMs);
      }catch(error){infrastructureFailure(error);}
      // close() remains private to the adapter's lifetime, not a public commit.
      job.cancel=api.close;
      return api;
    }
    return Object.freeze({prepareOnlineWork,close(){active?.cancel();delivered?.cancel();closed=true;stopWorker();},diagnostics:()=>({...counts,disabled,waiting:active?.status==='waiting'})});
  }
  WIS.Simulation.OnlineCandidateWorker=Object.freeze({create});
}(window.WIS));
