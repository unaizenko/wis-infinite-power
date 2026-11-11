(function startOnlineCandidateWorker(WIS){
  'use strict';
  const P=WIS.Simulation.WorkerProtocol,build=WIS.Core.Build.buildId;
  let active=null;
  function close(){const owner=active;active=null;if(!owner)return;if(owner.timer!==null)clearTimeout(owner.timer);owner.job?.close?.();}
  const post=(owner,type,fields)=>self.postMessage({type,protocol:1,build,requestId:owner.id,...fields});
  function failed(owner,error){if(active!==owner)return;close();post(owner,'error',{message:String(error.message||error),code:error.code||'online-candidate-failed'});}
  function advance(owner){
    if(active!==owner)return;owner.timer=null;
    try{
      const result=owner.job.advance(performance.now()+12);
      if(result.done){const packet=owner.engine.step.exportOnlineCandidate(result.token),payload=P.encode(packet);active=null;post(owner,'result',{payload});}
      else {const progress=owner.job.progress?.();if(Number.isSafeInteger(progress)&&progress>owner.progress){owner.progress=progress;post(owner,'progress',{progress});}owner.timer=setTimeout(()=>advance(owner),0);}
    }catch(error){failed(owner,error);}
  }
  self.onmessage=({data:m})=>{
    if(m?.type==='cancel'){if(active?.id===m.requestId)close();return;}
    if(m?.type!=='compute')return;
    close();const owner={id:m.requestId,timer:null,job:null,engine:null,progress:0};active=owner;
    try{
      if(m.protocol!==1||m.build!==build||!Number.isSafeInteger(m.requestId)||m.requestId<=0||typeof m.payload!=='string')throw Error('在线候选请求版本或身份无效');
      const request=P.decode(m.payload);
      if(!request?.snapshot?.domain||!Number.isFinite(request.seconds)||request.seconds<=0||!request.timeSegment||request.timeSegment.source!=='online'||!Number.isFinite(request.tick)||!request.rates||typeof request.rates!=='object')throw Error('在线候选请求字段无效');
      owner.engine=WIS.Simulation.OfflineHeadless.create(request.snapshot,{checkpoint(){throw Error('在线候选不能保存');},yield:()=>Promise.resolve()});
      WIS.tmp.tick=request.tick;WIS.tmp.rates={...request.rates};
      owner.job=owner.engine.step.prepareOnlineWork(request.seconds,request.timeSegment);
      owner.timer=setTimeout(()=>advance(owner),0);
    }catch(error){failed(owner,error);}
  };
}(self.WIS));
