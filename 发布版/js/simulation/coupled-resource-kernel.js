(function(W){
  'use strict';
  const B=W.Core.BigNum,R=W.Core.Runtime,E=W.Core.Effects,S=W.Core.State,G=()=>W.Simulation.ResourceGroups;
  const statisticKeys=Object.freeze(['highestPower','lifetimeHighestPower','totalPower','lifetimeTotalPower','currentRebirthTotalPower','lifetimeTotalJ','currentRebirthTotalJ','reincarnationElapsedSeconds','totalElapsedSeconds','currentScaleElapsedSeconds']);
  const roots=new Set(['core','powerSystem','cultivation','meta']);
  function signature(state,outputs){
    const dynamic=new Set([...outputs,...statisticKeys]);
    const xiuzhen=state.cultivation?.systems?.immortal?.xiuzhen;
    const externalResources=Object.fromEntries(G().keys.filter(k=>!outputs.includes(k)).map(k=>[k,G().read(state,k)]));
    const xiuzhenFixed=xiuzhen&&{...xiuzhen,resources:Object.fromEntries(Object.entries(xiuzhen.resources||{}).map(([key,value])=>[key,outputs.includes(key)?{...value,amount:undefined}:value]))};
    return JSON.stringify({aliases:Object.fromEntries(Object.getOwnPropertyNames(state).filter(k=>!roots.has(k)&&!dynamic.has(k)).map(k=>[k,state[k]])),powerSystem:state.powerSystem?.active,cultivation:state.cultivation?.active,externalResources,xiuzhenFixed});
  }
  function create(groupIds){
    if(!Array.isArray(groupIds)||!groupIds.length||new Set(groupIds).size!==groupIds.length)throw Error('CoupledResourceKernel groups 无效');
    const groups=groupIds.map(id=>{const group=G().groups.find(g=>g.id===id);if(!group)throw Error('未注册 Group '+id);return group;});
    const outputs=Object.freeze(groups.flatMap(g=>g.outputs));
    function compileFastProfile(snapshot,{fast=false,policy="STRICT"}={}){
      const compileStarted=performance.now();W.Simulation.Profiler.record('profileCompiles');
      if(!["STRICT","NORMAL","AGGRESSIVE"].includes(policy))throw Error("未知快进精度策略");
      const state=Object.fromEntries(Object.getOwnPropertyNames(snapshot).map(k=>[k,snapshot[k]]));
      // Copy hot write paths only, using the official alias metadata. Keep
      // canonical domains AND legacy aliases coherent for future Groups.
      const written=new Set([...outputs,...statisticKeys]),copied=new Set();
      function copyPath(path){let target=state,source=snapshot,prefix='';for(const key of path.split('.')){prefix+='.'+key;if(!copied.has(prefix)){target[key]={...source?.[key]};copied.add(prefix);}target=target[key];source=source?.[key];}}
      for(const [path,keys] of Object.entries(S.fieldGroups))if(keys.some(k=>written.has(k)))copyPath(path);
      for(const group of groups)for(const path of group.kernelWritePaths||[])copyPath(path);
      const setters=[...written].map(k=>[k,Object.getOwnPropertyDescriptor(snapshot,k)?.set]).filter(([,set])=>set);
      const profile={state,setters,fast,policy,prunedSources:[],signature:signature(snapshot,outputs),configuration:W.Core.Config,registry:G().groups};
      R.withState(state,()=>W.Power.ScaleLogic.withScaleState(state,()=>W.Cultivation.ImmortalLogic.withImmortalState(state,()=>{
        profile.effects=E.compileInterval(state,{dynamicResources:outputs,fast});
        profile.groups=profile.effects.run(()=>Object.fromEntries(groups.map(group=>[group.id,group.compileFastProfile?.(state,{fast,policy,prunedSources:profile.prunedSources})||null])));
      })));
      profile.region=region(state);profile.pruningFloor=state.immortalPower;
      const descriptors=profile.effects.descriptors||[];
      const sources=R.withState(state,()=>W.Core.Sources.collect('joules',state).concat(W.Core.Sources.collect('power',state),W.Power.ScaleLogic.continuousSourceDescriptors(),W.Cultivation.ImmortalLogic.continuousSourceDescriptors()));
      profile.activeFixedSources=sources.filter(s=>!s.dynamicResources.length&&!profile.prunedSources.some(p=>p.id===s.id)).map(s=>s.id);
      profile.activeDynamicSources=sources.filter(s=>s.dynamicResources.length).map(s=>s.id);
      profile.sharedExpressions=['scale.fitnessJBonus','scale.focusPowerPerSecond','scale.ghostBrainPowerSource','scale.brainDomainDevelopmentExponent','scale.powerMultiplier','scale.jMultiplier','immortal.celestialFiveDeclineExponent','immortal.daoImmortalPowerRatio','daoTimeLaw'];
      profile.nonPrunableTransforms=descriptors.concat([{id:'resource-softcap',operationType:'softcap'},{id:'googol',operationType:'exponent'},{id:'formula-region',operationType:'branch'},{id:'resource-threshold',operationType:'threshold'}]);
      profile.fixedEffects=descriptors.filter(s=>s.classification==='fixed');
      profile.dynamicEffects=descriptors.filter(s=>s.classification!=='fixed');
      W.Simulation.Profiler.record('profileCompileWallMs',performance.now()-compileStarted);return profile;
    }
    const region=state=>outputs.map(k=>{const n=G().read(state,k);return n.layer+':'+(n.layer>1||n.layer===1&&n.mag>100?1:0);}).join('|');
    function step(profile,dt=.1,{factor=1}={}){
      if(!(dt>0&&dt<=.1+1e-12))throw Error('Coupled Kernel 必须是 <=0.1 秒固定快照');
      if(profile.fast&&(region(profile.state)!==profile.region||profile.prunedSources.length&&B.lt(profile.state.immortalPower,profile.pruningFloor))){
        const next=compileFastProfile(profile.state,{fast:true,policy:profile.policy});next.setters=profile.setters;Object.assign(profile,next);W.Simulation.Profiler.record('fastProfileRecompiles');
      }
      const state=profile.state,evaluated=G().evaluate(state,{groupIds,factor,fastProfile:profile});
      // All rate calls finish before any output is installed.
      const next=Object.fromEntries(outputs.map(k=>[k,B.add(G().read(state,k),B.mul(evaluated.rates[k],dt))]));
      for(const k of outputs)if(!B.isFiniteBN(next[k])||B.lt(next[k],0)){const e=Error('Coupled Kernel 公式无法表示 '+k);e.code='formula-representation';throw e;}
      const gain=key=>B.mul(evaluated.rates[key]||0,dt);
      if(outputs.includes('power')){state.totalPower=B.add(state.totalPower,gain('power'));state.lifetimeTotalPower=B.add(state.lifetimeTotalPower,gain('power'));state.currentRebirthTotalPower=B.add(state.currentRebirthTotalPower,gain('power'));}
      if(outputs.includes('joules')){state.lifetimeTotalJ=B.add(state.lifetimeTotalJ,gain('joules'));state.currentRebirthTotalJ=B.add(state.currentRebirthTotalJ,gain('joules'));}
      for(const k of outputs)G().write(state,k,next[k]);
      for(const k of outputs)state[k]=next[k];
      if(outputs.includes('power')){state.highestPower=B.max(state.highestPower,state.power);state.lifetimeHighestPower=B.max(state.lifetimeHighestPower,state.highestPower);}
      for(const key of ['reincarnationElapsedSeconds','totalElapsedSeconds','currentScaleElapsedSeconds'])state[key]+=dt;
      for(const [key,set] of profile.setters)set.call(state,state[key]);
      return {state,rates:evaluated.rates,cultivation:evaluated.cultivation};
    }
    const matches=(snapshot,profile)=>profile.configuration===W.Core.Config&&profile.registry.length===G().groups.length&&profile.signature===signature(snapshot,outputs);
    return Object.freeze({groups:Object.freeze([...groupIds]),outputs,compileFastProfile,compileCoupledFastProfile:s=>compileFastProfile(s,{fast:true,policy:W.Core.Config.coupledFastProfile.policy}),step,matches});
  }
  function select(snapshot,profile){
    const config=W.Core.Config.coupledKernel;
    if(!config?.enabled||snapshot.activeChallenge)return null;
    // v14 freezes the validated A+B set. A newly active C in a high-risk
    // region requires its own validation instead of silently enlarging it.
    if(G().groups.some(g=>!['scale','immortal'].includes(g.id)&&g.outputs.some(k=>B.gt(profile.rates[k]||0,0))))return null;
    return create(['scale','immortal']);
  }
  // Development comparison only. Production pruning requires an exact
  // invisibility certificate and never spends an exponent/branch error budget.
  function compareFastValues(reference,actual,policy='NORMAL'){
    const settings=W.Core.Config.coupledFastProfile.policies[policy];if(!settings)throw Error('未知快进精度策略');
    const rows=Object.fromEntries(Object.keys(reference).map(key=>{
      if(actual[key]==null||!B.isFiniteBN(actual[key])||B.lt(actual[key],0))return [key,{accepted:false,reason:'representation'}];
      const a=B.BN(reference[key]),b=B.BN(actual[key]),layerChanged=a.layer!==b.layer;
      const coordinate=n=>n.layer===0?Math.log10(1+n.mag):n.mag;
      const drift=layerChanged?null:Math.abs(coordinate(a)-coordinate(b));
      return [key,{accepted:!layerChanged&&drift<=settings.maxCoordinateDrift,layerChanged,drift}];
    }));return {accepted:Object.values(rows).every(row=>row.accepted),policy,rows};
  }
  W.Simulation.CoupledResourceKernel=Object.freeze({create,select,statisticKeys,signature,compareFastValues});
})(window.WIS);
