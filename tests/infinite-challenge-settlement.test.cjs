'use strict';
const assert=require('node:assert/strict'),path=require('node:path');process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
const {h,WIS:W,setRank,legacyData}=require('./helpers/challenge-runtime.cjs'),S=W.Core.State,I=W.Meta.Infinity,A=W.Meta.Achievements,R=W.Core.Runtime,B=W.Core.BigNum;
let step;const original=W.Simulation.Step;W.Simulation.Step={...original,create(c){return step=original.create(c);}};
const finish=w=>{let r;do{r=w.advance(performance.now()+20)}while(!r.done);return r;};
function fixture(time,power){const s=S.fresh();s.meta.infinity.rebirthCount=1;s.meta.infinity.runElapsed=time;s.activeChallenge='infinityFast';s.activeChallengeElapsedSeconds=time;s.power=B.BN(power);s.highestPower=s.power;s.immortalAbilityAutomationEnabled=s.immortalRealmAutomationEnabled=s.scaleUpgradeAutomationEnabled=s.scaleActionAutomationEnabled=false;return s;}
(async()=>{
 for(const source of ['online','recovery','offline'])for(const [time,power,success] of [[4.9,'3e68',true],[4.95,'3e68',true],[5.1,'3e68',false],[4.9,0,false]]){
  const sim=h.createSimulation(S.toSerializable(fixture(time,power)),{yieldToHost:()=>Promise.resolve()});
  if(source==='offline'){await sim.offline.simulateOfflineProgress(6,6);assert.equal(sim.offline.getPendingCatchUpSeconds(),0);}
  else if(source==='recovery'){const done=finish(step.prepareOnlineWork(.2,{source:'online',clockRatio:1}));sim.advanceGameStep(.2,true,{preparedOnlineSegment:done.token});}
  else for(let n=0;n<2;n++){
    const done=finish(step.prepareOnlineWork(.1,{source:'online',clockRatio:1}));
    sim.advanceGameStep(.1,true,{preparedOnlineSegment:done.token});
  }
  assert.equal(I.rewardUnlocked(R.getState(),'infinityFast'),success,JSON.stringify({source,time,power}));
  assert.equal(R.getState().activeChallenge,null);assert(Math.abs(I.get(R.getState()).runElapsed-time-(source==='offline'?6:.2))<1e-8);
 }
 const s=fixture(5.1,0),sim=h.createSimulation(S.toSerializable(s));R.getState().power=B.BN('3e68');sim.advanceGameStep(.1,true,{foreground:true,timeSegment:{source:'online',clockRatio:1}});assert(!I.rewardUnlocked(R.getState(),'infinityFast'),'late arrival is not awarded');
 // Actual rock production crosses 3e68; the target is absent at the start.
 for(const source of ['online','recovery','offline'])for(const [time,expected] of [[4.9,true],[4.95,true],[4.99,false],[5,false],[5.01,false]]){
  const crossing=fixture(time,'2.95e68');crossing.rockLevel=100;W.Meta.TreasureLedger.write(crossing,'skyCrystal',['1e1360'],true);
  const run=h.createSimulation(S.toSerializable(crossing),{yieldToHost:()=>Promise.resolve()});assert(B.lt(R.getState().power,'3e68'));
  if(source==='offline'){await run.offline.simulateOfflineProgress(.2,.2);assert.equal(run.offline.getPendingCatchUpSeconds(),0);}
  else {const done=finish(step.prepareOnlineWork(.2,{source:'online',clockRatio:1}));run.advanceGameStep(.2,true,{preparedOnlineSegment:done.token});}
  assert(B.gte(R.getState().power,'3e68'),'rock must actually cross target');assert.equal(I.rewardUnlocked(R.getState(),'infinityFast'),expected,JSON.stringify({source,time,actualPower:String(R.getState().power)}));
 }
 const active=fixture(4.9,0);h.createSimulation(S.toSerializable(active));const loaded=W.Core.Save.prepare(W.Core.Save.envelope(R.getState()));assert.equal(loaded.state.activeChallenge,'infinityFast');assert.equal(loaded.state.activeChallengeElapsedSeconds,4.9);
 const resumed=h.createSimulation(S.toSerializable(loaded.state),{yieldToHost:()=>Promise.resolve()});await resumed.offline.simulateOfflineProgress(.2,.2);assert.equal(R.getState().activeChallenge,null);assert(!I.rewardUnlocked(R.getState(),'infinityFast'));
 const ordinary=fixture(1,'3e68');ordinary.activeChallenge=null;const regular=h.createSimulation(S.toSerializable(ordinary));regular.advanceGameStep(.1,true,{foreground:true,timeSegment:{source:'online',clockRatio:1}});assert(!I.rewardUnlocked(R.getState(),'infinityFast'),'ordinary rebirth run never grants challenge reward');
 console.log('PASS online/recovery/offline challenge deadline, real production crossing, active save replay and no automatic reward');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
