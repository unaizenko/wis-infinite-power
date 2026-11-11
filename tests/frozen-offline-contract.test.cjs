'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.WIS_GAME_ROOT||path.resolve(__dirname,'..');
const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
const setup=()=>loadProductionNumericRuntime().W;
function fixture(W,martial=false){
 const S=W.Core.State,B=W.Core.BigNum,s=S.fresh();
 s.joules=B.BN(1000);s.power=B.BN(100);s.runningLevel=3;s.rockLevel=2;
 if(martial){s.cultivation.active='martial';s.highestScaleIndex=3;s.lifetimeHighestScaleIndex=3;
 s.joules=B.BN('1e1000');s.power=B.BN('1e1000');s.highestPower=s.power;
 const m=W.Cultivation.Martial.get(s);
 for(const k of ['qi','body','heart','soul'])Object.assign(m.resources[k],{amount:B.BN('1e500'),total:B.BN('1e500'),peak:B.BN('1e500')});
 m.heartPotential=W.Cultivation.Martial.F(m.resources.heart.amount);m.automation.qi=true;m.automation.body=true;
 }
 return s;
}
function simulation(W,s,host={}){return W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve(),...host});}
function game(W,s){const d=W.Core.State.toSerializable(s);delete d.core.runtime.lastUpdateAt;delete d.core.runtime.timeLedger;return JSON.stringify(d);}
const cases=[];
for(const martial of [false,true])for(const seconds of [.05,60,86400,604800])cases.push([`fixed ${martial?'martial':'base'} ${seconds}s`,async()=>{
 const W=setup(),B=W.Core.BigNum,S=W.Core.State,sim=simulation(W,fixture(W,martial)),start=S.cloneForSimulation(sim.getState());
 const sources=W.Simulation.FixedSources,profile=sources.query(start);let queries=0,completedQueries=0,automations=0;
 W.Simulation.FixedSources={...sources,query(...args){queries++;const profile=sources.query(...args);completedQueries++;return profile;}};
 const strategy=W.Simulation.CheckpointStrategy; W.Simulation.CheckpointStrategy={...strategy,plan(){throw Error('legacy replay planner must not run for fixed offline income');}};
 const M=W.Cultivation.Martial;W.Cultivation.Martial={...M,automate(...args){automations++;return M.automate(...args);}};
 sim.offline.appendCatchUpTask(seconds,seconds,{source:'offline',randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);
 const status=sim.offline.getCatchUpStatus(),end=sim.getState();
 assert.equal(status.phase,'completed','fixed income completes without micro fallback: '+status.pauseReason?.reason);
 assert.equal(status.pendingGameSeconds,0);assert.equal(status.segmentBudget.lastExecutorKind,'frozen-offline');assert.equal(status.segmentBudget.committedSegments,1);assert.equal(status.segmentBudget.rateQueries,1);assert.equal(completedQueries,2,'one completed offline snapshot plus one online rates refresh');assert(queries>=completedQueries);
 for(const key of ['joules','power'])assert(B.eq(end[key],B.add(start[key],B.mul(profile.rates[key],seconds))),key+' start rate * time');
 assert.equal(automations,0,'offline never calls martial automation');
 if(martial){const a=M.get(start),b=M.get(end);for(const k of M.resourceKeys)assert(B.eq(a.resources[k].amount,b.resources[k].amount),'no offline conversion '+k);assert(B.eq(a.automationTime,b.automationTime));assert.equal(a.automationCursor,b.automationCursor);}
 assert.equal(end.core.runtime.randomState,start.core.runtime.randomState,'progress rewards do not consume RNG');
 assert(Math.abs(end.totalElapsedSeconds-start.totalElapsedSeconds-seconds)<1e-7);
 assert(Math.abs(end.meta.infinity.runElapsed-start.meta.infinity.runElapsed-seconds)<1e-7);
 assert.equal(W.Core.Save.prepare(JSON.parse(JSON.stringify(W.Core.Save.envelope(end)))).offlineRecovery,null);
}]);
for(const [time,earned] of [[4.95,true],[4.99,false],[5.01,false]])cases.push(['deadline observes frozen income at 5s from '+time,async()=>{
 const W=setup(),B=W.Core.BigNum,s=W.Core.State.fresh();
 s.power=B.BN('2.95e68');s.highestPower=s.power;s.rockLevel=100;
 Object.assign(s.meta.infinity,{rebirthCount:1,runElapsed:time});s.activeChallenge='infinityFast';s.activeChallengeElapsedSeconds=time;
 W.Meta.TreasureLedger.write(s,'skyCrystal',['1e1360'],true);
 const sources=W.Simulation.FixedSources;
 W.Simulation.FixedSources={...sources,query(...args){const q=sources.query(...args);return {...q,rates:{...q.rates,power:B.BN('2e68')},quantities:{...q.quantities,power:W.Core.Amount.from('2e68')}};}};
 const sim=simulation(W,s);sim.offline.appendCatchUpTask(60,60,{source:'offline',randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);
 assert.equal(sim.offline.getCatchUpStatus().phase,'completed');
 assert.equal(W.Meta.Infinity.rewardUnlocked(sim.getState(),'infinityFast'),earned);
 assert.equal(sim.getState().activeChallenge,null);
}]);
cases.push(['missing frozen adapter pauses without replay',async()=>{
 const W=setup(),Step=W.Simulation.Step;
 W.Simulation.Step={...Step,create(...args){const step=Step.create(...args);return {...step,prepareFixedWork:undefined};}};
 const sim=simulation(W,fixture(W));const before=game(W,sim.getState());
 sim.offline.appendCatchUpTask(60,60,{source:'offline',randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);
 assert.equal(sim.offline.getCatchUpStatus().phase,'paused');assert.equal(sim.offline.getCatchUpStatus().pendingGameSeconds,60);assert.equal(game(W,sim.getState()),before);
}]);
cases.push(['failed checkpoint keeps confirmed assets and debt',async()=>{
 const W=setup(),s=fixture(W,true);let fail=false;
 const sim=simulation(W,s,{checkpoint(){if(fail)throw Error('injected durable-write failure');}}),before=game(W,sim.getState());
 sim.offline.appendCatchUpTask(60,60,{source:'offline',randomMode:'state'});fail=true;await sim.offline.simulateOfflineProgress(0,0);
 assert.equal(game(W,sim.getState()),before);assert.equal(sim.offline.getCatchUpStatus().pendingGameSeconds,60);
 fail=false;await sim.offline.retryCatchUp();assert.equal(sim.offline.getCatchUpStatus().pendingGameSeconds,0);
}]);
cases.push(['inconsistent projected and complete rates pause atomically',async()=>{
 const W=setup(),s=fixture(W),sources=W.Simulation.FixedSources,sim=simulation(W,s),before=game(W,sim.getState());
 W.Simulation.FixedSources={...sources,query(...args){const q=sources.query(...args);return {...q,rates:{...q.rates,power:W.Core.BigNum.add(q.rates.power,1)}};}};
 sim.offline.appendCatchUpTask(1,1,{source:'offline',randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);const status=sim.offline.getCatchUpStatus();
 assert.equal(status.phase,'paused');assert.equal(status.pauseReason.error.code,'formula-representation');assert.equal(status.pendingGameSeconds,1);assert.equal(game(W,sim.getState()),before);
}]);
(async()=>{let failed=0;for(const [name,run] of cases){try{await run();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.message);}}console.log(JSON.stringify({cases:cases.length,failed}));if(failed)process.exitCode=1;})().catch(e=>{console.error(e);process.exitCode=1;});
