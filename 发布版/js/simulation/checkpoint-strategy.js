(function(W){
  'use strict';
  const B=W.Core.BigNum,C=()=>W.Simulation.ContinuousPredictor,H=()=>W.Core.Config.offlineHierarchy,Q=()=>W.Core.Config.offlinePredictor,P=()=>W.Simulation.Profiler;
  function createBudget(totalSeconds){return {version:3,totalSeconds,lastExecutorKind:null,committedSegments:0,directWork:0,mapBlocks:0,virtualSteps:0,rejections:0,invalidations:0,maxDepth:0,fallbackWork:0,frames:[],predictor:null,coldModelBuilds:0,hardInvalidations:0,hardReasons:{},softRebases:0,settlementCheckpoints:0,endpointValidations:0,sentinelValidations:0,blockHistogram:{},maximumBlockSteps:0,mapEligible:0,mapConsidered:0,shockRebases:0,dualDisagreements:0,fixedFallbacks:0,validationSkipped:0,cadenceMicroSteps:0,frozenDirectSteps:0,mapCooldowns:0,shockAnchors:0,progressQueries:0,scaleKernelSteps:0,scaleIntervals:0,coupledKernelSteps:0,coupledIntervals:0};}
  function snapshot(budget){return budget?C().copy(budget):null;}
  function validateBudget(value){if(value==null)return null;
    if(![1,2,3].includes(value.version)||!Number.isFinite(value.totalSeconds)||value.totalSeconds<=0)throw Error('离线预算版本无效');
    if(value.lastExecutorKind!=null&&!['large-fixed','fixed-20s','opportunistic-map','coupled-kernel','coupled-advance','paused'].includes(value.lastExecutorKind))throw Error('离线 Executor 类型无效');
    const defaults=createBudget(value.totalSeconds),out=Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,value[k]??v]));out.version=3;
    if(value.version===1)out.directWork=value.committedSegments||0;
    for(const k of ['committedSegments','directWork','mapBlocks','virtualSteps','rejections','invalidations','maxDepth','coldModelBuilds','hardInvalidations','softRebases','settlementCheckpoints','endpointValidations','sentinelValidations','maximumBlockSteps','mapEligible','mapConsidered','shockRebases','dualDisagreements','fixedFallbacks','validationSkipped','cadenceMicroSteps','frozenDirectSteps','mapCooldowns','shockAnchors','progressQueries','scaleKernelSteps','scaleIntervals','coupledKernelSteps','coupledIntervals'])if(!Number.isSafeInteger(out[k])||out[k]<0)throw Error('离线预算计数无效');
    if(!Array.isArray(out.frames)||out.frames.length>16||out.frames.some(f=>!Number.isFinite(f.seconds)||f.seconds<=0||!Number.isInteger(f.depth)||f.depth<0||f.depth>H().maxDepth))throw Error('离线分层栈无效');
    for(const key of ['blockHistogram','hardReasons']){if(!out[key]||typeof out[key]!=='object'||Array.isArray(out[key])||Object.keys(out[key]).length>32||Object.entries(out[key]).some(([k,v])=>k.length>64||!Number.isSafeInteger(v)||v<0))throw Error('离线统计容量无效');}
    out.predictor=value.version===3?C().checkpoint(value.predictor):null;delete out.history;delete out.model;return out;
  }
  function movement(s,profile,dt,normalized=false){let change=0;for(const k of W.Simulation.ResourceGroups.keys){const a=C().coordinate(W.Simulation.ResourceGroups.read(s,k)),b=C().coordinate(B.add(W.Simulation.ResourceGroups.read(s,k),B.mul(profile.rates[k],dt)));const x=a.layer===0?Math.log10(1+a.value):a.value,y=b.layer===0?Math.log10(1+b.value):b.value;change=Math.max(change,a.layer===b.layer?Math.abs(y-x)/(normalized?Math.max(1,Math.abs(x)):1):Number.MAX_VALUE);}return change;}
  function strengthAt(s,profile,seconds){
    const value=movement(s,profile,seconds,true),G=W.Simulation.ResourceGroups;
    // Multiplication by dt is almost invisible in ee and higher coordinates.
    // A growing layered stock must never look like a weak 300-second segment
    // merely because its one-step coordinate increment is relatively small.
    const layered=G.keys.some(k=>{const current=G.read(s,k),next=B.add(current,B.mul(profile.rates[k],seconds));return next.layer>=2&&B.gt(next,current);});
    return layered?Math.max(value,1):value;
  }
  function plan(s,remaining,{budget,hardBoundary=remaining}={}){return P().withScope('offline',()=>{
    const draft=W.Core.State.createDraft(s).state;
    W.Core.Runtime.withState(draft,()=>W.Core.Runtime.withOfflineExecution(()=>W.Core.Effects.withIsolatedState(draft,()=>W.Cultivation.ExplorationProgress.settleRetained(draft))));s=draft;
    budget=budget||createBudget(remaining);const h=H(),q=Q(),profile=W.Simulation.FixedSources.query(s);let frames=budget.frames.map(f=>({...f}));
    if(!frames.length){const dt=Math.min(h.macroMaxSeconds,remaining);frames=[{seconds:dt,depth:0}];}
    let head=frames[0],strength=strengthAt(s,profile,Math.min(head.seconds,hardBoundary));
    while(strength>h.splitThreshold&&head.depth<h.maxDepth&&head.seconds>2*h.microSeconds&&budget.directWork<h.maxDirectWork){
      const units=Math.floor(head.seconds/h.microSeconds+1e-8),parts=Math.min(h.splitFactor,units),children=[];let spent=0;
      for(let i=0;i<parts;i++){const duration=i===parts-1?head.seconds-spent:(Math.floor(units/parts)+(i<units%parts?1:0))*h.microSeconds;children.push({seconds:duration,depth:head.depth+1});spent+=duration;}
      frames.splice(0,1,...children);head=frames[0];strength=strengthAt(s,profile,Math.min(head.seconds,hardBoundary));
    }
    const strong=strength>h.splitThreshold,macroRemaining=frames.reduce((a,f)=>a+f.seconds,0),speed=movement(s,profile,h.microSeconds,true)/h.microSeconds;
    const layered=Object.values(C().coordinates(s)).some(c=>c.layer>=2)||movement(s,profile,h.microSeconds,true)>q.fallbackCoordinateTravel;
    const cooling=Object.values(budget.predictor?.policy?.groups||{}).some(g=>g.cooldown>0&&!g.anchors);
    const extreme=movement(s,profile,h.microSeconds,true)>q.fallbackMaxMicroCoordinateTravel||W.Simulation.ResourceGroups.keys.some(k=>{const current=W.Simulation.ResourceGroups.read(s,k),next=B.add(current,B.mul(profile.rates[k],q.fallbackSeconds));return B.gt(next,current)&&(current.layer>=2||next.layer>=2);});
    const selectionCache=W.Simulation.StrategySelector.cache(s,profile,{strong,extreme,predictor:budget.predictor,previousKind:budget.lastExecutorKind});
    const selection=W.Simulation.StrategySelector.select(selectionCache);
    const preferred=['coupled-kernel','coupled-advance'].includes(selection.kind)?q.fallbackSeconds:strong&&cooling?q.fallbackSeconds:strong&&layered?Math.max(q.checkpointMinSeconds,q.checkpointCoordinateTravel/Math.max(1e-15,speed)):q.checkpointMaxSeconds;
    const aligned=Math.max(h.microSeconds,Math.floor(Math.min(q.checkpointMaxSeconds,preferred)/h.microSeconds)*h.microSeconds);
    const seconds=Math.min(remaining,hardBoundary,strong?macroRemaining:head.seconds,aligned);
    if(budget.directWork>=h.maxDirectWork&&!budget.predictor?.model){const error=Error('真实资源微步预算耗尽；离线债务保留');error.code='direct-work-budget';throw error;}
    return {kind:'checkpoint',seconds,frames,depth:head.depth,strength,sourceProfile:profile,signature:C().signature(s),hardBoundary:seconds===hardBoundary&&hardBoundary<remaining,
      evolutionPlan:{selection,selectionCache,strong,directWork:budget.directWork,predictor:budget.predictor,sourceProfile:profile}};
  });}
  function accept(budget,plan,seconds,state,result){const frames=plan.frames.map(f=>({...f}));let left=seconds;while(left>1e-8&&frames.length){const used=Math.min(left,frames[0].seconds);frames[0].seconds-=used;left-=used;if(frames[0].seconds<1e-8)frames.shift();}
    const data=result.evolution,stats=data?.stats||{realMicroSteps:1},predictor=data?.predictor?C().copy(data.predictor):null,signature=C().signature(state);let hard=0,soft=0;
    const reasons={...budget.hardReasons};
    if(predictor){if(predictor.mapSignature!==signature||!data.rebasedPoint?.delta){predictor.model=null;predictor.observations=[];delete predictor.policy;delete predictor.validation;predictor.blockSize=Q().initialMapSteps;hard=1;reasons.settlementBranch=(reasons.settlementBranch||0)+1;}
      else {predictor.model=C().rebase(predictor.model,data.endpoint,data.rebasedPoint,0);if(predictor.observations.at(-1)?.position===data.rebasedPoint.position)predictor.observations[predictor.observations.length-1]=data.rebasedPoint;else predictor.observations.push(data.rebasedPoint);predictor.observations=predictor.observations.slice(-Q().observationLimit);predictor.trustRegionOrigin=data.rebasedPoint.coordinates;soft=1;}
      predictor.mapSignature=signature;predictor.needsCalibration=false;}
    for(const [key,count] of Object.entries(stats.hardReasons||{}))reasons[key]=(reasons[key]||0)+count;
    const histogram={...budget.blockHistogram};for(const [key,count] of Object.entries(stats.blockHistogram||{}))histogram[key]=(histogram[key]||0)+count;
    return {...budget,lastExecutorKind:data?.execution?.kind||budget.lastExecutorKind,...Object.fromEntries(['mapEligible','mapConsidered','shockRebases','dualDisagreements','fixedFallbacks','validationSkipped','cadenceMicroSteps','frozenDirectSteps','mapCooldowns','shockAnchors','progressQueries','scaleKernelSteps','scaleIntervals','coupledKernelSteps','coupledIntervals'].map(k=>[k,(budget[k]||0)+(stats[k]||0)])),frames,predictor,committedSegments:budget.committedSegments+1,directWork:budget.directWork+stats.realMicroSteps,mapBlocks:budget.mapBlocks+(stats.mapAccepted||0),virtualSteps:budget.virtualSteps+(stats.virtualSteps||0),maximumBlockSteps:Math.max(budget.maximumBlockSteps||0,stats.maximumBlockSteps||0),rejections:budget.rejections+(stats.mapRejected||0),invalidations:budget.invalidations+(stats.hardInvalidations||0)+hard,
      maxDepth:Math.max(budget.maxDepth,plan.depth),coldModelBuilds:budget.coldModelBuilds+(stats.coldModelBuilds||0),hardInvalidations:budget.hardInvalidations+(stats.hardInvalidations||0)+hard,hardReasons:reasons,
      softRebases:budget.softRebases+(stats.softRebases||0)+soft,settlementCheckpoints:budget.settlementCheckpoints+1,endpointValidations:budget.endpointValidations+(stats.endpointValidations||0),sentinelValidations:budget.sentinelValidations+(stats.sentinelValidations||0),blockHistogram:histogram};
  }
  function fail(budget,error){
    const stats=error.evolutionStats;if(!stats)return budget;
    // Count attempted work, including a rolled-back checkpoint, without moving
    // its committed time, frames, observations or predictor forward.
    const out={...budget},aliases={realMicroSteps:'directWork',mapAccepted:'mapBlocks',mapRejected:'rejections'};
    for(const key of ['realMicroSteps','mapAccepted','mapRejected','virtualSteps','coldModelBuilds','hardInvalidations','softRebases','endpointValidations','sentinelValidations','mapEligible','mapConsidered','shockRebases','dualDisagreements','fixedFallbacks','validationSkipped','cadenceMicroSteps','frozenDirectSteps','mapCooldowns','shockAnchors','progressQueries','scaleKernelSteps','scaleIntervals','coupledKernelSteps','coupledIntervals']){const target=aliases[key]||key;out[target]=(budget[target]||0)+(stats[key]||0);}
    out.maximumBlockSteps=Math.max(budget.maximumBlockSteps,stats.maximumBlockSteps||0);
    for(const key of ['hardReasons','blockHistogram']){out[key]={...budget[key]};for(const [id,count] of Object.entries(stats[key]||{}))out[key][id]=(out[key][id]||0)+count;}
    return out;
  }
  W.Simulation.CheckpointStrategy=Object.freeze({createBudget,snapshot,validateBudget,movement,strengthAt,plan,accept,fail});
})(window.WIS);
