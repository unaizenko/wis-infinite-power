'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {setup75}=require('./amount-fixture.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
function setup(){const {W,context}=setup75({targetSchema:76,transformSource(file,s){if(file.endsWith('/immortal-logic.js'))s=s.replace('WIS.Cultivation.ImmortalLogic = api;',`rollTianNiPearlAttempts=((fn)=>function(...args){if(globalThis.forbidReward)throw Error('reward failure');if(globalThis.probeRng)WIS.Core.Runtime.random();const value=fn(...args);globalThis.rewardCalls++;if(globalThis.changeAfterFirstReward)WIS.Core.Runtime.getState().meta.rewardGainProbeBoost=true;return value;})(rollTianNiPearlAttempts);rollMysteriousGreenBottleAttempts=((fn)=>function(...args){if(globalThis.failLaterReward)throw Error('later reward failure');return fn(...args);})(rollMysteriousGreenBottleAttempts);WIS.Cultivation.ImmortalLogic = api;`);if(file.endsWith('/effects.js'))s=s.replaceAll('effects = provider(state) || [];','effects = provider(state) || [];if(globalThis.countRewardGains&&globalThis.readingRewardGain)globalThis.rewardProviderCalls++;');if(file.endsWith('/treasures.js'))s=s.replace('const Recovery=Object.freeze', `unitGain=((fn)=>function(...args){const previous=globalThis.readingRewardGain;globalThis.readingRewardGain=true;globalThis.rewardGainEntries=(globalThis.rewardGainEntries||0)+1;try{if(globalThis.failInsideGain)throw Error('inside reward gain failure');const value=fn(...args);if(globalThis.countRewardGains)globalThis.rewardGainCalls.push(args[1]);return value;}finally{globalThis.readingRewardGain=previous;}})(unitGain);const Recovery=Object.freeze`);if(file.endsWith('/runtime.js'))s=s.replace('function call(name, ...args) {',`function call(name, ...args) {if(/^(save|render|show|notify)/.test(name))globalThis.externalCalls++;`);return s;}});context.rewardCalls=0;context.forbidReward=false;context.externalCalls=0;W.Simulation.OfflineHeadless.create({domain:W.Core.Save.prepare(readFixture('exploration-compaction')).state},{checkpoint(){},yield:()=>Promise.resolve()});context.externalCalls=0;return {W,context,R:W.Core.Runtime,I:W.Cultivation.ImmortalLogic,S:W.Core.State};}
const wire=x=>x.W.Simulation.WorkerProtocol.encode(x.R.getState());
function finish(job){for(let i=0;i<20000;i++)if(job.advance(Infinity,{maximumOperations:32}).done)return;throw Error('completion work limit');}
test('exploration prepares rewards privately and commit performs no reward mathematics',()=>{const x=setup(),start=x.S.cloneForSimulation(x.R.getState());x.I.explore();const expected=wire(x);x.R.setState(start);x.context.rewardCalls=0;x.context.externalCalls=0;const before=wire(x),job=x.I.createExplorationActionWork(start);try{finish(job);assert(x.context.rewardCalls>0,'rewards still deferred to synchronous commit');assert.equal(wire(x),before);assert.equal(x.context.externalCalls,0);x.context.forbidReward=true;job.commit();assert.equal(wire(x),expected);assert(x.context.externalCalls>0);const calls=x.context.externalCalls;assert.throws(()=>job.commit());assert.equal(x.context.externalCalls,calls);}finally{job.cancel();}});
test('reward preparation failure leaves all formal domains and RNG unchanged',()=>{const x=setup(),before=wire(x),job=x.I.createExplorationActionWork(x.R.getState());x.context.forbidReward=true;try{assert.throws(()=>finish(job),/reward failure/);assert.equal(wire(x),before);assert.equal(x.context.externalCalls,0);assert.throws(()=>job.commit());}finally{job.cancel();}});
test('cancel and stale input after prepared rewards cannot install a candidate',()=>{for(const mode of ['cancel','stale']){const x=setup(),job=x.I.createExplorationActionWork(x.R.getState());try{finish(job);if(mode==='cancel')job.cancel();else x.R.getState().meta.probeChanged=true;const before=wire(x);assert.throws(()=>job.commit());assert.equal(wire(x),before);assert.equal(x.context.externalCalls,0);}finally{job.cancel();}}});

test('failure after an accepted earlier reward stage leaves formal state and RNG intact',()=>{const x=setup(),before=wire(x),job=x.I.createExplorationActionWork(x.R.getState());x.context.probeRng=true;x.context.failLaterReward=true;try{assert.throws(()=>finish(job),/later reward failure/);assert(x.context.rewardCalls>0,'earlier reward never completed');assert.equal(wire(x),before);assert.equal(x.context.externalCalls,0);assert.throws(()=>job.commit());}finally{job.cancel();}});
test('candidate RNG resumes with the same final sequence as synchronous rewards',()=>{const x=setup(),start=x.S.cloneForSimulation(x.R.getState());x.context.probeRng=true;x.I.explore();const expected=wire(x);x.R.setState(start);x.context.externalCalls=0;const before=wire(x),job=x.I.createExplorationActionWork(start);try{finish(job);assert.equal(wire(x),before);assert.equal(x.context.externalCalls,0);job.commit();assert.equal(wire(x),expected);}finally{job.cancel();}});


test('reward gain provider work stays bounded across tiny-budget suspensions',()=>{
  const x=setup(),start=x.S.cloneForSimulation(x.R.getState());
  x.context.countRewardGains=true;x.context.rewardGainCalls=[];x.context.rewardProviderCalls=0;x.I.explore();
  const expected=wire(x),reference=Array.from(x.context.rewardGainCalls),providerReference=x.context.rewardProviderCalls;
  assert(reference.length>0);x.R.setState(start);x.context.rewardGainCalls=[];x.context.rewardProviderCalls=0;
  const job=x.I.createExplorationActionWork(start);try{
    finish(job);assert.deepEqual(Array.from(x.context.rewardGainCalls),reference,'completed gain preparation repeated during resume');
    assert(x.context.rewardProviderCalls<=providerReference,`reward providers repeated: ${x.context.rewardProviderCalls} vs ${providerReference}`);
    job.commit();assert.equal(wire(x),expected);
  }finally{job.cancel();}
});


test('later rewards read earlier accepted reward changes without cross-action cache reuse',()=>{
  const x=setup();x.context.changeAfterFirstReward=true;
  x.W.Core.Effects.register('reward-stage-probe',state=>[{id:'reward-stage-probe',target:'immortalTreasureChance',layer:'sourceMultiplier',value:state.meta.rewardGainProbeBoost?2:1}]);
  const start=x.S.cloneForSimulation(x.R.getState());x.I.explore();x.I.explore();const expected=wire(x);
  x.R.setState(start);
  for(let i=0;i<2;i++){const job=x.I.createExplorationActionWork(x.R.getState());try{finish(job);job.commit();}finally{job.cancel();}}
  assert.equal(wire(x),expected);
});


test('cancel or failure inside gain preparation restores evaluation context and formal state',()=>{
  for(const mode of ['cancel','fail']){
    const x=setup(),start=x.S.cloneForSimulation(x.R.getState());x.I.explore();const expected=wire(x);
    x.R.setState(start);x.context.rewardGainEntries=0;const before=wire(x),job=x.I.createExplorationActionWork(start);
    try{
      if(mode==='fail'){x.context.failInsideGain=true;assert.throws(()=>finish(job),/inside reward gain failure/);}
      else{let entered=false;for(let i=0;i<20000;i++){const step=job.advance(Infinity,{maximumOperations:1});if(x.context.rewardGainEntries){assert.equal(step.done,false);entered=true;break;}}assert(entered,'gain scope was not entered');job.cancel();}
      assert.equal(wire(x),before);assert.equal(x.R.isEvaluating(),false);assert.throws(()=>job.commit());
      x.context.failInsideGain=false;x.I.explore();assert.equal(wire(x),expected);
    }finally{job.cancel();}
  }
});
