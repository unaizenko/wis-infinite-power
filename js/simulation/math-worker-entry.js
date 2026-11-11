(function startMathWorker(WIS){
  'use strict';
  const P=WIS.Simulation.WorkerProtocol,build=WIS.Core.Build.buildId;
  let active=null;
  function close(){const owner=active;active=null;if(!owner)return;if(owner.timer!==null)clearTimeout(owner.timer);owner.work?.cancel();}
  const post=(owner,type,fields)=>self.postMessage({type,protocol:1,build,requestId:owner.id,...fields});
  function advance(owner){
    if(active!==owner)return;owner.timer=null;
    try{
      const next=owner.work.advance({deadline:performance.now()+12,maximumOperations:1024});
      if(next.done){const payload=P.encode(owner.work.result());close();post(owner,'result',{payload});}
      else{const progress=WIS.Core.CertifiedRankMath.progressVersion();if(progress>owner.progress){owner.progress=progress;post(owner,'progress',{progress});}owner.timer=setTimeout(()=>advance(owner),0);}
    }catch(error){close();post(owner,'error',{message:String(error.message||error),code:error.code||'math-worker-failed'});}
  }
  self.onmessage=({data:m})=>{
    if(m?.type==='cancel'){if(active?.id===m.requestId)close();return;}
    if(m?.type!=='compute')return;
    close();const owner={id:m.requestId,timer:null,work:null,progress:0};active=owner;
    try{
      if(m.protocol!==1||m.build!==build||!Number.isSafeInteger(m.requestId)||m.requestId<=0||typeof m.payload!=='string')throw Error('计算请求版本或身份无效');
      const input=P.decode(m.payload);
      if(!input?.snapshot?.domain||!['training-gain','source-preview','breathing-preview'].includes(input.kind))throw Error('计算请求字段无效');
      const engine=WIS.Simulation.OfflineHeadless.create(input.snapshot,{checkpoint(){throw Error('纯计算不能保存');},yield:()=>Promise.resolve()});
      owner.work=WIS.Simulation.PureMathWork.create(input.kind,engine.getState(),input.request);
      owner.timer=setTimeout(()=>advance(owner),0);
    }catch(error){close();post(owner,'error',{message:String(error.message||error),code:error.code||'math-worker-failed'});}
  };
}(self.WIS));
