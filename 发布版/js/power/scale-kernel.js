(function(W){
  'use strict';
  const B=W.Core.BigNum,R=W.Core.Runtime,E=W.Core.Effects,L=W.Power.ScaleLogic;
  const dynamicKeys=Object.freeze(['joules','power','highestPower','lifetimeHighestPower','reincarnationElapsedSeconds','totalElapsedSeconds','activeChallengeElapsedSeconds']);
  const roots=new Set(['core','powerSystem','cultivation','meta']);
  const privateProfiles=new WeakMap();
  function signature(snapshot){
    return JSON.stringify(Object.fromEntries(Object.getOwnPropertyNames(snapshot).filter(k=>!roots.has(k)&&!dynamicKeys.includes(k)).map(k=>[k,snapshot[k]])));
  }
  function supported(s){return s.powerSystem.active==='scale'&&!s.activeChallenge&&W.Core.Sources.providerIds().every(id=>['scaleTreasures','immortal'].includes(id));}
  function supportsOffline(s,profile){
    // A shared evaluator is exact with fixed external inputs. It is NOT a
    // proof that freezing a growing B/C or reward feedback loop is accurate.
    return supported(s)&&W.Simulation.ResourceGroups.keys.every(k=>['joules','power'].includes(k)||B.eq(profile.rates[k]||0,0))&&
      B.eq(profile.cultivation.explorationAmount,0)&&profile.rewards.every(row=>!row.eligible||B.eq(B.mul(row.units,row.gain),0));
  }
  function read(s){return Object.fromEntries(dynamicKeys.map(k=>[k,s[k]]));}
  function compileScaleFastProfile(snapshot,{factor=1}={}){
    if(!supported(snapshot))return null;
    // Flatten legacy accessors once. Nested external domains are read-only for
    // this interval; no full-state serialization/clone or discrete events.
    const state=Object.fromEntries(Object.getOwnPropertyNames(snapshot).map(k=>[k,snapshot[k]]));
    state.core={...snapshot.core,resources:{...snapshot.core.resources},runtime:{...snapshot.core.runtime}};
    const profile=Object.freeze({version:1,signature:signature(snapshot),config:W.Core.Config,factor,
      dynamicKeys,externalResources:Object.freeze(['mana','immortalPower','xianForce','yuanForce'])});
    R.withState(state,()=>L.withScaleState(state,()=>{
      const effects=E.compileInterval(state);
      const rates=effects.run(()=>({joules:L.createAutomaticJRateProfile(),power:L.createAutomaticPowerRateProfile({interval:true})}));
      privateProfiles.set(profile,{state,effects,rates});
    }));return profile;
  }
  function scaleKernelStep(dynamicState,profile,dt=.1){
    const entry=privateProfiles.get(profile);if(!entry)throw Error('ScaleFastProfile 无效');
    if(!(dt>0&&dt<=.1+1e-12))throw Error('ScaleKernel 只支持真实 0.1s 固定步');
    Object.assign(entry.state,dynamicState);
    return R.withState(entry.state,()=>L.withScaleState(entry.state,()=>entry.effects.run(()=>{
      const rates=L.evaluateScaleRates(profile.factor,entry.rates),next={...dynamicState};
      for(const key of ['joules','power']){next[key]=B.add(dynamicState[key],B.mul(rates[key],dt));if(!B.isFiniteBN(next[key])||B.lt(next[key],0)){const error=Error('ScaleKernel 公式无法表示');error.code='formula-representation';throw error;}}
      next.highestPower=B.max(dynamicState.highestPower,next.power);
      next.lifetimeHighestPower=B.max(dynamicState.lifetimeHighestPower,next.highestPower);
      for(const key of ['reincarnationElapsedSeconds','totalElapsedSeconds'])next[key]=(Number(dynamicState[key])||0)+dt;
      return {state:next,rates};
    })));
  }
  function inspect(dynamicState,profile){const entry=privateProfiles.get(profile);Object.assign(entry.state,dynamicState);
    return R.withState(entry.state,()=>L.withScaleState(entry.state,()=>entry.effects.run(()=>({fitness:L.fitnessJBonus(),ghostBrain:L.ghostBrainPowerSource(),brainDomain:L.brainDomainDevelopmentExponent(),jExponent:L.jGainExponent(),powerExponent:L.powerGainExponent(),timeLaw:W.Cultivation.ImmortalLogic.daoTimeLawExponent()}))));}
  function matches(snapshot,profile){return supported(snapshot)&&profile.config===W.Core.Config&&profile.signature===signature(snapshot);}
  W.Power.ScaleKernel=Object.freeze({compileScaleFastProfile,scaleKernelStep,read,signature,supported,supportsOffline,matches,dynamicKeys,inspect});
})(window.WIS);
