(function defineOfflineStrategy(WIS){
  'use strict';
  const B=WIS.Core.BigNum,cfg=()=>WIS.Core.Config.offlineHierarchy,map=()=>WIS.Simulation.DiscreteMap,groups=()=>WIS.Simulation.ResourceGroups;
  function createBudget(totalSeconds){return {version:2,totalSeconds,committedSegments:0,directWork:0,mapBlocks:0,virtualSteps:0,rejections:0,invalidations:0,maxDepth:0,fallbackWork:0,frames:[],history:[],model:null,nextBlock:cfg().initialMapSteps,consecutiveFailures:0};}
  function snapshot(budget,{runtime=false}={}){if(!budget)return null;const {history,model,lastSignature,learnDt,...saved}=budget;return runtime?{...saved,history:history?.map(p=>({...p})),model,lastSignature,learnDt}:saved;}
  function validateBudget(value){
    if(value==null)return null;
    if(value.version===1){if(!Number.isFinite(value.totalSeconds)||value.totalSeconds<=0||!Number.isInteger(value.committedSegments)||value.committedSegments<0||value.committedSegments>512)throw Error('旧分段预算无效');return {...createBudget(value.totalSeconds),directWork:value.committedSegments,committedSegments:value.committedSegments};}
    if(value.version!==2||!Number.isFinite(value.totalSeconds)||value.totalSeconds<=0||!Array.isArray(value.frames)||value.frames.length>cfg().splitFactor*(cfg().maxDepth+1))throw Error('分层离线预算无效');
    for(const k of ['committedSegments','directWork','mapBlocks','virtualSteps','rejections','invalidations','maxDepth','fallbackWork'])if(!Number.isSafeInteger(value[k])||value[k]<0)throw Error('分层离线计数无效');
    if(value.frames.some(f=>!Number.isFinite(f.seconds)||f.seconds<=0||!Number.isInteger(f.depth)||f.depth<0||f.depth>cfg().maxDepth))throw Error('离线分层栈无效');
    return {...createBudget(value.totalSeconds),...value,history:[],model:null,lastSignature:null};
  }
  function movement(state,profile,seconds){let maximum=0;
    for(const key of groups().keys){const a=map().coordinate(groups().read(state,key)),b=map().coordinate(B.add(groups().read(state,key),B.mul(profile.rates[key],seconds)));
      const av=a.layer===0?Math.log10(1+a.value):a.value,bv=b.layer===0?Math.log10(1+b.value):b.value;
      const score=a.layer!==b.layer?Number.MAX_VALUE:Math.max(Math.abs(bv-av)/Math.max(1,Math.abs(av)),Math.abs(bv-av));maximum=Math.max(maximum,score);}
    return maximum;
  }
  function plan(state,remaining,{budget,hardBoundary=remaining}={}){
    const c=cfg(),F=WIS.Simulation.FixedSources,profile=F.query(state),point={...map().coordinates(state),$progress:map().progressCoordinates(profile)},signature=map().signature(state);
    budget=budget||createBudget(remaining);let frames=budget.frames.map(f=>({...f}));
    if(!frames.length){const preferred=Math.min(c.macroMaxSeconds,budget.totalSeconds/c.baseSegments);const aligned=Math.ceil(preferred/c.microSeconds-1e-9)*c.microSeconds;frames.push({seconds:Math.min(remaining,Math.max(c.microSeconds,aligned)),depth:0});}
    const exhausted=budget.directWork>=c.maxDirectWork;let head=frames[0],strength=movement(state,profile,Math.min(head.seconds,hardBoundary));
    while(strength>c.splitThreshold&&!exhausted&&head.depth<c.maxDepth&&head.seconds>c.microSeconds*2-1e-9){
      const units=Math.floor(head.seconds/c.microSeconds+1e-8),parts=Math.min(c.splitFactor,units);
      if(parts<2)break;
      let used=0;const children=[];for(let i=0;i<parts;i++){const count=Math.floor(units/parts)+(i<units%parts?1:0);const seconds=i===parts-1?head.seconds-used:count*c.microSeconds;children.push({seconds,depth:head.depth+1});used+=seconds;}
      frames.splice(0,1,...children);head=frames[0];strength=movement(state,profile,Math.min(head.seconds,hardBoundary));
    }
    const available=Math.min(head.seconds,remaining,hardBoundary),strong=strength>c.splitThreshold;
    const useMap=strong&&(head.depth>=c.maxDepth||exhausted||head.seconds<=c.microSeconds*2+1e-9);
    const microDt=Math.min(c.microSeconds,available),unchanged=budget.lastSignature===signature&&Math.abs((budget.learnDt||microDt)-microDt)<1e-9;
    const observations=(budget.history||[]).map((p,i,a)=>i===a.length-1?{...p,$progress:point.$progress}:p);
    let model=unchanged?(budget.model||map().fit(observations,microDt)):null;
    const base={frames,depth:head.depth,strength,sourceProfile:profile,before:point,signature,progressSignature:map().progressSignature(state),microDt,hardBoundary:available===hardBoundary&&hardBoundary<remaining,model};
    const mapAvailable=Math.min(frames.reduce((sum,f)=>sum+f.seconds,0),remaining,hardBoundary);
    if(useMap&&c.mapEnabled&&model&&mapAvailable>=c.minimumMapSteps*microDt){
      const steps=Math.min(budget.nextBlock||c.initialMapSteps,c.maxMapSteps,Math.floor((mapAvailable+1e-9)/microDt));
      if(steps>=c.minimumMapSteps){const prediction=map().forecast(state,profile,model,steps);if(prediction)return {...base,kind:'map',seconds:prediction.seconds,mapPlan:prediction};}
    }
    if(exhausted&&!c.allowFallbackBeyondBudget){const error=Error('真实固定段预算耗尽且映射尚未通过校验；剩余时间保留');error.code='direct-work-budget';throw error;}
    return {...base,model,kind:useMap&&c.mapEnabled?(exhausted?'fallback':'learn'):'direct',seconds:useMap&&c.mapEnabled?microDt:available};
  }
  function accept(budget,plan,seconds,state,result){
    const c=cfg(),frames=plan.frames.map(f=>({...f}));let left=seconds;
    while(left>1e-8&&frames.length){const used=Math.min(left,frames[0].seconds);frames[0].seconds-=used;left-=used;if(frames[0].seconds<1e-8)frames.shift();}
    const signature=map().signature(state),changed=signature!==plan.signature||result.operations>0,progressChanged=map().progressSignature(state)!==plan.progressSignature;
    // A progress change discards the predictor. Real observations of F remain
    // usable during learning; an accepted predicted gap always clears that
    // window, so a new model needs eight further real transitions. Structural
    // events discard both. A new fit may try a previously validated block SIZE,
    // but never inherits the discarded rates/ratios.
    const actual=map().coordinates(state),sameDt=Math.abs((budget.learnDt||plan.microDt)-plan.microDt)<1e-9;
    let history=changed||!sameDt?[]:[...(budget.lastSignature===plan.signature?budget.history||[]:[])];
    const isMicro=plan.kind==='learn'||plan.kind==='fallback';
    if(isMicro&&!changed){if(!history.length)history.push(plan.before);else history[history.length-1]={...history.at(-1),$progress:plan.before.$progress};history.push(actual);history=history.slice(-(c.learnSteps+1));}
    else if(plan.kind!=='map'||progressChanged)history=[];
    return {...budget,frames,committedSegments:budget.committedSegments+1,directWork:budget.directWork+(plan.kind==='map'?0:1),
      mapBlocks:budget.mapBlocks+(plan.kind==='map'?1:0),virtualSteps:budget.virtualSteps+(plan.kind==='map'?plan.mapPlan.steps:0),
      fallbackWork:budget.fallbackWork+(plan.kind==='fallback'?1:0),invalidations:budget.invalidations+(changed||progressChanged?1:0),maxDepth:Math.max(budget.maxDepth,plan.depth),
      history,model:changed||progressChanged?null:plan.kind==='map'?plan.mapPlan.nextModel:null,lastSignature:signature,learnDt:plan.microDt,consecutiveFailures:0,
      nextBlock:changed?c.initialMapSteps:plan.kind==='map'?Math.min(c.maxMapSteps,plan.mapPlan.steps*2):budget.nextBlock};
  }
  function reject(budget,plan){const failures=budget.consecutiveFailures+1,relearn=failures>=cfg().maxValidationFailures||plan.mapPlan.steps<=cfg().minimumMapSteps;
    return {...budget,rejections:budget.rejections+1,consecutiveFailures:failures,nextBlock:Math.max(cfg().minimumMapSteps,Math.floor(plan.mapPlan.steps/2)),model:relearn?null:plan.model,history:relearn?[]:budget.history};}
  WIS.Simulation.OfflineStrategy=Object.freeze({createBudget,snapshot,validateBudget,movement,plan,accept,reject});
}(window.WIS));
