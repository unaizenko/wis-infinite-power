(function(W){
  'use strict';
  const B=W.Core.BigNum,G=()=>W.Simulation.ResourceGroups,P=()=>W.Simulation.Profiler;
  const groups=Object.freeze(['scale','immortal']);
  // Structure only. Numeric upgrade levels and ordinary treasure/progress
  // values are interval inputs, not new execution algorithms. Every settlement
  // prepares a fresh interval even when this signature remains unchanged.
  function branches(value){
    if(typeof value==='number')return value>0;
    if(Array.isArray(value))return value.map(branches);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>k!=='naturalTreasureLevel').map(([k,v])=>[k,branches(v)]));
    return value;
  }
  function executionSignature(s){
    const i=s.cultivation.systems.immortal,x=i.xiuzhen,n=s.meta.bigNumbers;
    return JSON.stringify({version:1,groups:G().groups.map(g=>[g.id,g.outputs]),coupledGroups:groups,
      systems:[s.powerSystem.active,s.cultivation.active],realm:[s.highestScaleIndex,s.advancedRealmLevel,x?.realm,x?.entered],
      challenge:s.activeChallenge,abilities:[branches(s.powerSystem.systems.scale.upgrades),branches(s.powerSystem.systems.scale.actions),branches(i.abilities),branches(x?.abilities)],
      softcapAchievements:['scale10','utmostPurity'].map(k=>!!s.unlockedAchievements?.[k]),
      g:W.Meta.BigNumbers.MILESTONES.filter(v=>v<=n.gIndex),
      regions:G().keys.map(k=>{const a=G().read(s,k);return [k,a.layer,B.gte(a,'1e100'),W.Core.Config.softcaps.map(t=>B.gt(a,t.threshold))];})});
  }
  // No unproved bulk formula is admitted. In particular, repeating K N times
  // behind this API would conceal rather than reduce actual mathematical work.
  const obstacles=Object.freeze(['state-dependent-dao-domain','state-dependent-dao-assimilation','time-dependent-exponents','source-dominance-and-googol-subtraction']);
  const CoupledAdvance=Object.freeze({groups,validated:false,
    support:()=>Object.freeze({supported:false,reason:'coordinate-recurrence-not-certified',obstacles}),
    advance(){const error=Error('尚无通过验证的坐标批量递推；保留 CoordinateKernel 与离线债务');error.code='coupled-advance-unverified';throw error;}});
  function select(cache){return P().measure('strategySelectionWallMs',()=>{
    P().record('strategySelections');
    let kind;
    if(!cache.strong)kind='large-fixed';
    else if(cache.mediumValidated)kind='fixed-20s';
    else if(cache.advanceValidated)kind='coupled-advance';
    else if(cache.mapEligible&&!cache.mapCooldown)kind='opportunistic-map';
    else if(cache.kernelSupported)kind='coupled-kernel';
    else kind='paused';
    if(cache.previousKind&&cache.previousKind!==kind)P().record('strategySwitches');
    return Object.freeze({kind,kernelBackend:cache.kernelBackend,executionSignature:cache.executionSignature});
  });}
  // The planner has already evaluated the segment-start rates. Consume that
  // cache; strategy selection must never query Effects or ResourceGroup.rate.
  function cache(s,profile,{strong,extreme,predictor,previousKind}={}){
    const started=performance.now();
    const policy=Object.values(predictor?.policy?.groups||{}),windows=policy.flatMap(g=>g.window||[]);
    const profitable=windows.length>0&&windows.some(v=>v[0]>0)&&W.Simulation.ResourceEvolution.profitability(windows)===null;
    const kernelSupported=!!W.Core.Config.coupledKernel?.enabled&&!s.activeChallenge&&
      G().groups.every(g=>groups.includes(g.id)||g.outputs.every(k=>B.lte(profile.rates[k]||0,0)));
    const mediumValidated=!extreme&&G().groups.every(g=>['scale','immortal','xiuzhen'].includes(g.id)||g.executionProfile?.fixedFallback===true);
    const result=Object.freeze({previousKind,executionSignature:executionSignature(s),strong,extreme,mediumValidated,kernelSupported,kernelBackend:W.Simulation.CoordinateCoupledKernel.supported(s)?'coordinate':'formal',advanceValidated:CoupledAdvance.validated&&kernelSupported,
      mapEligible:!!W.Core.Config.offlineHierarchy.mapEnabled&&((!!predictor?.model&&profitable)||G().groups.some(g=>g.executionProfile?.mapEligible===true&&g.outputs.some(k=>B.gt(profile.rates[k]||0,0)))),
      mapCooldown:policy.some(g=>g.cooldown>0)});
    P().record('strategyCacheWallMs',performance.now()-started);return result;
  }
  function create(seconds,options){
    if(!Number.isFinite(seconds)||seconds<=0)throw Error('Executor 区间必须为有限正时长');
    let state,driver,selection,status='new',result,stopReason=null;
    const label=()=>selection.kind==='opportunistic-map'?'map':selection.kind==='coupled-kernel'?'kernel':selection.kind==='coupled-advance'?'advance':'fixed';
    const api={
      prepare(snapshot){
        if(status!=='new')throw Error('Executor 已准备');state=snapshot;
        selection=options.selection||select(options.selectionCache);
        if(selection.kind==='paused'){stopReason='unsupported-execution-signature';status='discarded';const e=Error('当前连续资源结构没有已验证执行器；保留离线债务');e.code=stopReason;throw e;}
        if(selection.kind==='coupled-advance')CoupledAdvance.advance();
        // The verified middle path retains its existing bounded observations
        // and occasional Map blocks. Replacing those by pure 20s gains failed
        // the latest-save regression; do not silently change this baseline.
        driver=W.Simulation.ResourceEvolution.create(state,seconds,{...options,executorKind:selection.kind,kernelBackend:selection.kernelBackend});
        P().withScope('offline',()=>P().record(label()+'Intervals'));status='prepared';return api;
      },
      runInterval(maxSeconds,deadline=performance.now()+8){
        if(status!=='prepared')throw Error('Executor 不可继续执行');
        if(!Number.isFinite(maxSeconds)||maxSeconds<seconds)throw Error('Executor 不得越过 Settlement 边界');
        try {const out=P().withScope('offline',()=>P().measure(label()+'WallMs',()=>driver.advance(deadline)));
          if(out.done){result=out.result;result.execution={kind:selection.kind,compatibilityMiddle:selection.kind==='fixed-20s',signature:selection.executionSignature};status='ready';stopReason='settlement';}
          return out;
        }catch(error){status='discarded';stopReason=error.code||'executor-error';throw error;}
      },
      commit(){if(status!=='ready')throw Error('Executor 尚无可提交结果');status='committed';driver=null;return result;},
      discard(){if(status==='committed')throw Error('已提交 Executor 不能回滚');status='discarded';driver=null;result=null;stopReason='discarded';},
      get stopReason(){return stopReason;},get status(){return status;},get selection(){return selection;}
    };return Object.freeze(api);
  }
  W.Simulation.CoupledAdvance=CoupledAdvance;
  W.Simulation.ExecutionSignature=Object.freeze({read:executionSignature});
  W.Simulation.StrategySelector=Object.freeze({cache,select});
  W.Simulation.ContinuousExecutor=Object.freeze({create});
})(window.WIS);
