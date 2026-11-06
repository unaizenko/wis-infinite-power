(function(W){
  'use strict';
  const B=W.Core.BigNum,C=()=>W.Simulation.LegacySettlementCheckpoints.predictor,H=()=>W.Core.Config.legacySettlementLimits.hierarchy,P=()=>W.Simulation.Profiler;
  const fallbackLimits=Object.freeze({consecutiveMicro:256,microUsed:4096,calibrationUsed:64});
  function validateFallback(value){const v=value||{version:1,microUsed:0,consecutiveMicro:0};if(v.version!==1||!Number.isSafeInteger(v.microUsed)||v.microUsed<0||!Number.isSafeInteger(v.consecutiveMicro)||v.consecutiveMicro<0||v.consecutiveMicro>v.microUsed)throw Error('离线降级预算无效');if(v.calibrationUsed!=null&&(!Number.isSafeInteger(v.calibrationUsed)||v.calibrationUsed<0))throw Error('离线校准预算无效');return {...v};}
  function requireFallback(value,additional=1){const v=validateFallback(value);if(v.microUsed+additional>fallbackLimits.microUsed||v.consecutiveMicro+additional>fallbackLimits.consecutiveMicro){const e=Error('离线降级微步预算已耗尽；当前区域没有已验证宏步，剩余债务保留');e.code='offline-fallback-budget-exhausted';e.fallbackBudget=v;throw e;}return v;}
  // Calibration work is bounded per planning attempt. Its lifetime total is
  // accounting, not eligibility: productive macro settlements can change the
  // formula signature indefinitely. Failed probes still pause without commit.
  function requireCalibration(value,additional=1){const v=validateFallback(value),used=v.calibrationUsed||0;if(!Number.isSafeInteger(additional)||additional<=0||additional>fallbackLimits.calibrationUsed||!Number.isSafeInteger(used+additional)){const e=Error('离线宏步单次校准工作量无效或超限；剩余债务保留');e.code='offline-calibration-budget-exhausted';throw e;}return v;}
  function accountFallback(value,count,macro=false,calibration=0){const v=validateFallback(value);return {version:1,microUsed:v.microUsed+count,consecutiveMicro:macro?0:v.consecutiveMicro+count,...((v.calibrationUsed||calibration)?{calibrationUsed:(v.calibrationUsed||0)+calibration}:{})};}
  W.Simulation.FallbackWorkBudget=Object.freeze({limits:fallbackLimits,validate:validateFallback,require:requireFallback,requireCalibration,account:accountFallback});
  function createBudget(totalSeconds){return {version:3,solverVersion:2,fallbackBudget:{version:1,microUsed:0,consecutiveMicro:0},strongFeedback:null,localDiscrete:null,martialInterval:null,totalSeconds,lastExecutorKind:null,committedSegments:0,directWork:0,mapBlocks:0,virtualSteps:0,rejections:0,invalidations:0,maxDepth:0,fallbackWork:0,frames:[],predictor:null,coldModelBuilds:0,hardInvalidations:0,hardReasons:{},softRebases:0,settlementCheckpoints:0,endpointValidations:0,sentinelValidations:0,blockHistogram:{},maximumBlockSteps:0,mapEligible:0,mapConsidered:0,shockRebases:0,dualDisagreements:0,fixedFallbacks:0,validationSkipped:0,cadenceMicroSteps:0,frozenDirectSteps:0,mapCooldowns:0,shockAnchors:0,progressQueries:0,scaleKernelSteps:0,scaleIntervals:0,coupledKernelSteps:0,coupledIntervals:0,formulaFramesEvaluated:0,rateQueries:0};}
  function snapshot(budget){return budget?C().copy(budget):null;}
  function validateBudget(value){if(value==null)return null;
    if(![1,2,3].includes(value.version)||!Number.isFinite(value.totalSeconds)||value.totalSeconds<=0)throw Error('离线预算版本无效');
    if(value.lastExecutorKind!=null&&!['large-fixed','fixed-20s','opportunistic-map','coupled-kernel','coupled-advance','strong-feedback','local-discrete-macro','compiled-micro','production-replay','frozen-offline','paused'].includes(value.lastExecutorKind))throw Error('离线 Executor 类型无效');
    const defaults=createBudget(value.totalSeconds),out=Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,value[k]??v]));out.version=3;out.fallbackBudget=validateFallback(value.fallbackBudget);out.strongFeedback=W.Simulation.LegacyStrongFeedback.validateCheckpoint(value.strongFeedback);if(value.solverVersion!=null&&value.solverVersion!==2)throw Error('离线求解器版本无效');out.solverVersion=2;out.localDiscrete=W.Simulation.LegacySettlementCheckpoints.localDiscrete.validateCheckpoint(value.localDiscrete)||null;out.martialInterval=W.Simulation.LegacySettlementCheckpoints.martial.validateCheckpoint(value.martialInterval)||null;
    if(value.version===1)out.directWork=value.committedSegments||0;
    for(const k of ['committedSegments','directWork','mapBlocks','virtualSteps','rejections','invalidations','maxDepth','coldModelBuilds','hardInvalidations','softRebases','settlementCheckpoints','endpointValidations','sentinelValidations','maximumBlockSteps','mapEligible','mapConsidered','shockRebases','dualDisagreements','fixedFallbacks','validationSkipped','cadenceMicroSteps','frozenDirectSteps','mapCooldowns','shockAnchors','progressQueries','scaleKernelSteps','scaleIntervals','coupledKernelSteps','coupledIntervals','formulaFramesEvaluated','rateQueries'])if(!Number.isSafeInteger(out[k])||out[k]<0)throw Error('离线预算计数无效');
    if(!Array.isArray(out.frames)||out.frames.length>16||out.frames.some(f=>!Number.isFinite(f.seconds)||f.seconds<=0||!Number.isInteger(f.depth)||f.depth<0||f.depth>H().maxDepth))throw Error('离线分层栈无效');
    for(const key of ['blockHistogram','hardReasons']){if(!out[key]||typeof out[key]!=='object'||Array.isArray(out[key])||Object.keys(out[key]).length>32||Object.entries(out[key]).some(([k,v])=>k.length>64||!Number.isSafeInteger(v)||v<0))throw Error('离线统计容量无效');}
    out.predictor=value.version===3&&value.solverVersion===2?C().checkpoint(value.predictor):null;delete out.history;delete out.model;return out;
  }
  function movement(){return W.Simulation.LegacySettlementCheckpoints.retired();}
  function strengthAt(){return W.Simulation.LegacySettlementCheckpoints.retired();}
  function microPlan(){return W.Simulation.LegacySettlementCheckpoints.retired();}
  function plan(){return W.Simulation.LegacySettlementCheckpoints.retired();}
  function accept(budget,plan,seconds,state,result){
    if(plan.frozenOffline)return {...budget,frames:[],predictor:null,strongFeedback:null,localDiscrete:null,martialInterval:null,
      lastExecutorKind:'frozen-offline',committedSegments:budget.committedSegments+1,directWork:budget.directWork+1,
      frozenDirectSteps:(budget.frozenDirectSteps||0)+1,rateQueries:(budget.rateQueries||0)+1,
      settlementCheckpoints:(budget.settlementCheckpoints||0)+1};
    return W.Simulation.LegacySettlementCheckpoints.retired();
  }
  function fail(budget,error){
    const stats=error.evolutionStats;if(!stats)return budget;
    // Count attempted work, including a rolled-back checkpoint, without moving
    // its committed time, frames, observations or predictor forward.
    const out={...budget,fallbackBudget:accountFallback(budget.fallbackBudget,stats.fallbackMicroSteps||0,false,stats.calibrationMicroSteps||0)},aliases={realMicroSteps:'directWork',mapAccepted:'mapBlocks',mapRejected:'rejections'};
    for(const key of ['realMicroSteps','mapAccepted','mapRejected','virtualSteps','coldModelBuilds','hardInvalidations','softRebases','endpointValidations','sentinelValidations','mapEligible','mapConsidered','shockRebases','dualDisagreements','fixedFallbacks','validationSkipped','cadenceMicroSteps','frozenDirectSteps','mapCooldowns','shockAnchors','progressQueries','scaleKernelSteps','scaleIntervals','coupledKernelSteps','coupledIntervals','formulaFramesEvaluated','rateQueries']){const target=aliases[key]||key;out[target]=(budget[target]||0)+(stats[key]||0);}
    out.maximumBlockSteps=Math.max(budget.maximumBlockSteps,stats.maximumBlockSteps||0);
    for(const key of ['hardReasons','blockHistogram']){out[key]={...budget[key]};for(const [id,count] of Object.entries(stats[key]||{}))out[key][id]=(out[key][id]||0)+count;}
    return out;
  }
  W.Simulation.CheckpointStrategy=Object.freeze({createBudget,snapshot,validateBudget,movement,strengthAt,microPlan,plan,accept,fail});
})(window.WIS);







