(function defineMathWorker(WIS) {
  'use strict';
  const P=WIS.Simulation.WorkerProtocol;
  let serial=0;
  function spawn(){
    if(typeof Worker!=='function'||!WIS.Simulation.MathWorkerBundle)throw Error('Worker unavailable');
    const url=URL.createObjectURL(new Blob([WIS.Simulation.MathWorkerBundle.source],{type:'text/javascript'}));
    try{return new Worker(url,{name:'wis-pure-math'});}finally{URL.revokeObjectURL(url);}
  }
  // Each job owns its worker and immutable input. No cross-candidate result cache.
  function createWork(kind,snapshot,request={}, {local,isCurrent=()=>true,factory=spawn}={}){
    const id=++serial,build=WIS.Core.Build.buildId,listeners=new Set();
    let phase='new',worker=null,timer=null,packet=null,value,localWork=null,progress=0,error=null;
    const valid=()=>phase!=='cancelled'&&isCurrent();
    const check=()=>{if(!valid())throw Object.assign(Error('计算输入已失效'),{code:'rank-work-stale'});};
    const stop=()=>{if(timer!==null)clearTimeout(timer);timer=null;worker?.terminate();worker=null;};
    const wake=()=>{if(valid())for(const listener of [...listeners])listener();};
    const fallback=()=>{stop();phase='local';packet=null;wake();};
    const arm=()=>{if(timer!==null)clearTimeout(timer);const token=setTimeout(()=>{if(timer!==token||phase!=='waiting')return;stop();phase='error';error=Object.assign(Error('计算暂时无进展，请重试'),{code:'math-worker-timeout'});wake();},30000);timer=token;};
    function validResult(result){
      if(!result||typeof result!=='object')return false;
      const A=WIS.Core.Amount,B=WIS.Core.BigNum,numeric=value=>A.isAmount(value)||B.isDecimal(value);
      const records=(rows,ids)=>Array.isArray(rows)&&rows.length===ids.length&&rows.every((row,i)=>row&&row.id===ids[i]&&
        typeof row.name==='string'&&typeof row.resource==='string'&&typeof row.unit==='string'&&B.isDecimal(row.raw)&&B.isDecimal(row.final)&&Array.isArray(row.extra));
      if(kind==='training-gain')return A.isAmount(result.gain);
      if(kind==='source-preview')return records(result.records,request.ids)&&(!request.ids.includes('training')||numeric(result.nextPowerJ));
      if(kind==='breathing-preview')return numeric(result.value?.mana)&&numeric(result.value?.nextManaJ)&&records(result.records,['breathing']);
      return false;
    }
    function start(){
      try{
        worker=factory();phase='waiting';arm();
        worker.onerror=e=>{e.preventDefault?.();if(phase==='waiting'&&valid())fallback();};
        worker.onmessageerror=()=>{if(phase==='waiting'&&valid())fallback();};
        worker.onmessage=({data:m})=>{
          if(phase!=='waiting'||!valid()||m?.requestId!==id)return;
          if(m.protocol!==1||m.build!==build){fallback();return;}
          if(m.type==='progress'){if(Number.isSafeInteger(m.progress)&&m.progress>progress){progress=m.progress;arm();}return;}
          if(m.type==='result'){packet=m.payload;phase='received';stop();wake();}
          else if(m.type==='error'){error=Object.assign(Error(m.message||'计算失败'),{code:m.code||'math-worker-failed'});phase='error';stop();wake();}
        };
        worker.postMessage({type:'compute',protocol:1,build,requestId:id,payload:P.encode({kind,snapshot:{domain:snapshot},request})});
      }catch(_){fallback();}
    }
    return Object.freeze({
      advance(options={}){
        check();if(phase==='new')start();
        if(phase==='received'){
          try{value=P.decode(packet);if(!validResult(value))throw Error('Invalid math result');phase='done';packet=null;}
          catch(_){fallback();}
        }
        if(phase==='error')throw error;
        if(phase==='local'){localWork||=local();const next=localWork.advance(options);if(next.done){value=localWork.result();phase='done';}return next;}
        return {done:phase==='done'};
      },
      result(){check();if(phase!=='done')throw Error('计算尚未完成');return value;},
      waiting:()=>phase==='waiting',
      onReady(fn){listeners.add(fn);if(['received','error','local'].includes(phase)&&valid())fn();return ()=>listeners.delete(fn);},
      cancel(){phase='cancelled';stop();localWork?.cancel();value=packet=null;listeners.clear();},valid
    });
  }
  WIS.Simulation.MathWorker=Object.freeze({createWork});
}(window.WIS));
