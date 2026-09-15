(function(W){
  'use strict';
  const B=W.Core.BigNum,K=W.Simulation.CoupledResourceKernel,G=W.Simulation.ResourceGroups;
  const groups=Object.freeze(['scale','immortal']),keys=Object.freeze(['joules','power','mana','immortalPower']);
  // Validated high-scale Dao-ancestor interval only. External signatures and
  // region recompilation stay owned by the formal CoupledFastProfile.
  function supported(s){return !s.activeChallenge&&s.powerSystem?.active==='scale'&&s.cultivation?.active==='immortal'&&s.advancedRealmLevel===10&&keys.every(k=>{
    const n=G.read(s,k);return n.sign>0&&B.isFiniteBN(n)&&(n.layer>=2||n.layer===1&&n.mag>=100);
  });}
  function create(){
    const formal=K.create(groups);
    function capture(profile){
      const started=performance.now(),s=profile.state,c=B.coordinateArithmetic.capture;
      profile.coordinates={CJ:c(s.joules),CP:c(s.power),CM:c(s.mana),CI:c(s.immortalPower),highestPower:c(s.highestPower),lifetimeHighestPower:c(s.lifetimeHighestPower)};
      W.Simulation.Profiler.record('coordinateConversions',0,6);W.Simulation.Profiler.record('coordinateConversionWallMs',performance.now()-started);
    }
    function compileFastProfile(s,options={fast:true,policy:W.Core.Config.coupledFastProfile.policy}){
      if(!supported(s)){const e=Error('CoordinateKernel signature 尚未验证');e.code='coordinate-signature-unsupported';throw e;}
      const p=formal.compileFastProfile(s,options);capture(p);return p;
    }
    function step(profile,dt=.1,options){
      if(!supported(profile.state)){const e=Error('CoordinateKernel 已退出高层 signature');e.code='coordinate-signature-unsupported';throw e;}
      const result=B.coordinateArithmetic.run(()=>formal.step(profile,dt,options));capture(profile);return result;
    }
    return Object.freeze({groups,outputs:formal.outputs,compileFastProfile,compileCoupledFastProfile:compileFastProfile,step,matches:formal.matches});
  }
  W.Simulation.CoordinateCoupledKernel=Object.freeze({create,supported});
})(window.WIS);
