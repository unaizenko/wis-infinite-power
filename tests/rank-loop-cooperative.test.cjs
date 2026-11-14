"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{setupFuture}=require('./rank-schema-fixture.cjs');
function setup(sync=false,overrides={}){const {W,context}=setupFuture({targetSchema:75});vm.runInContext(require('node:fs').readFileSync('js/simulation/loop.js','utf8'),context);vm.runInContext('Date.now=()=>100000',context);const queue=[];context.setTimeout=fn=>{queue.push(fn);return queue.length;};context.clearTimeout=()=>{};
 const host=W.Simulation.OfflineHeadless.create({domain:W.Core.State.fresh()},{checkpoint(){},yield:()=>Promise.resolve()}),step=host.step;let failures=0,preparations=0;
 const loop=W.Simulation.Loop.create({getState:host.getState,offline:host.offline,prepareOnlineWork:(...a)=>{preparations++;return step.prepareOnlineWork(...a);},onlineStateKey:step.onlineStateKey,advanceGameStep:step.advanceGameStep,beginTransaction:step.beginTransaction,endTransaction:step.endTransaction,
 requestRender(){},flushRender(){},saveState(){},effectiveDevSpeed:()=>1,isInitialLoadComplete:()=>true,epsilon:1e-9,simulationStepSeconds:.1,onOnlineSettlementError(){failures++;},...(sync?{prepareOnlineWork:undefined}:{}),...overrides});
 function debt(seconds){loop.restore({lastTickAt:100000,onlineAccumulator:seconds,tickRemaining:0,onlineIntervals:[{source:'online',clock:seconds,speed:1,compensationEligible:false}]});}
 return {W,context,host,loop,queue,debt,counts:()=>({failures,preparations})};}
test('foreground uses private continuation and commits clock/debt once while saving pending work',()=>{
 const {W,host,loop,queue,debt,counts}=setup();debt(.2);const initial=host.getState().totalElapsedSeconds;
 loop.runMainTick();assert(counts().preparations>0,'foreground did not acquire candidate');assert.equal(host.getState().totalElapsedSeconds,initial);assert.equal(loop.getUnprocessedOnlineClockSeconds(),.2);
 loop.prepareSave();assert.equal(host.getState().totalElapsedSeconds,initial,'save drained unfinished candidate');assert.equal(host.getState().core.runtime.timeLedger.pendingContinuousTime[0].clock,.2);
 let turns=0;while(queue.length){queue.shift()();assert(++turns<1000);}assert.equal(loop.getUnprocessedOnlineClockSeconds(),0);assert(Math.abs(host.getState().totalElapsedSeconds-initial-.2)<1e-12);assert.equal(String(host.getState().joules),'.2'.replace(/^\./,'0.'));
});
test('unchanged arithmetic failure is reported once without retrying or spending its clock',()=>{
 const x=setup(),{W,host,loop,queue,debt}=x;const old=W.Simulation.FixedSegment;W.Simulation.FixedSegment={...old,prepareWork(){return {advance(){throw Object.assign(Error('cannot certify'),{code:'rank-cost-unresolved'});},cancel(){}};}};
 debt(.1);loop.runMainTick();for(let i=0;i<5;i++){while(queue.length)queue.shift()();loop.runMainTick();}
 assert.equal(x.counts().failures,1);assert.equal(x.counts().preparations,1);assert.equal(loop.getUnprocessedOnlineClockSeconds(),.1);assert.equal(String(host.getState().joules),'0');
 host.getState().joules=W.Core.BigNum.BN(1);loop.runMainTick();while(queue.length)queue.shift()();assert.equal(x.counts().failures,2);
});

test('compensation splits retain cadence and never double-charge elapsed time or credit',()=>{
 const {W,host,loop,queue,debt}=setup(),C=W.Simulation.Compensation,s=host.getState();C.grant(s,.05);debt(.2);
 const snapshot=loop.snapshot();snapshot.onlineIntervals[0].compensationEligible=true;loop.restore(snapshot);
 loop.runMainTick();let turns=0;while(queue.length){queue.shift()();assert(++turns<1000);}
 assert(Math.abs(s.totalElapsedSeconds-.2)<1e-12);assert.equal(C.get(host.getState()).balance,0);assert(Math.abs(Number(String(host.getState().joules))-.25)<1e-12);assert.equal(host.getState().core.runtime.onlineCadenceRemaining,.1);
});
test('cancelled callbacks cannot commit a candidate after an input action or scheduler replacement',()=>{
 const {W,host,loop,queue,debt}=setup();debt(.1);loop.runMainTick();host.getState().joules=W.Core.BigNum.BN(10);
 let turns=0;while(queue.length){queue.shift()();assert(++turns<1000);}assert.equal(String(host.getState().joules),'10.1');assert.equal(loop.getUnprocessedOnlineClockSeconds(),0);
 debt(.1);loop.runMainTick();loop.invalidateOnlineScheduler();while(queue.length)queue.shift()();assert.equal(String(host.getState().joules),'10.1');assert.equal(loop.getUnprocessedOnlineClockSeconds(),.1);
});

test('synchronous Loop compatibility debits the same clock that produced its income',()=>{
 const {host,loop,queue,debt}=setup(true);debt(.2);loop.runMainTick();while(queue.length)queue.shift()();assert.equal(String(host.getState().joules),'0.2');assert.equal(host.getState().totalElapsedSeconds,.2);assert.equal(loop.getUnprocessedOnlineClockSeconds(),0);
});
test('a failed automatic settlement cannot strand an independent manual Qi owner',async()=>{
 const x=setup(),{W,host,loop,queue,debt}=x;const old=W.Simulation.FixedSegment;W.Simulation.FixedSegment={...old,prepareWork(){return {advance(){throw Object.assign(Error('cannot certify'),{code:'rank-cost-unresolved'});},cancel(){}};}};
 debt(.1);loop.runMainTick();while(queue.length)queue.shift()();let calls=0;W.Cultivation.ImmortalLogic={...W.Cultivation.ImmortalLogic,qiBatchStateKey:()=>1,advanceQiLayersBatch(){calls++;return 1;}};
 loop.requestQiBatch();while(queue.length)queue.shift()();assert.equal(calls,1);const result=loop.requestDeferredAction({advance:()=>({done:true}),commit:()=>true});while(queue.length)queue.shift()();assert.equal(await result,true);assert.equal(loop.getUnprocessedOnlineClockSeconds(),.1);
});

test('unfinished_private_math_yields_to_next_host_task_after_one_advance',()=>{let clock=0,advances=0;const x=setup(false,{prepareOnlineWork:()=>({valid:()=>true,close(){},advance(){clock+=2;advances++;return {done:false};}})});x.context.performance={now:()=>clock};x.debt(.1);x.loop.runMainTick();assert.equal(advances,0);x.queue.shift()();assert.equal(advances,1,'same candidate advanced twice in one host task');assert.equal(clock,2);assert.equal(x.loop.getUnprocessedOnlineClockSeconds(),.1);x.loop.invalidateOnlineScheduler();while(x.queue.length)x.queue.shift()();});

test('unchanged_private_candidate_does_not_redirty_the_confirmed_page',()=>{let clock=0,done=false,renders=0,statusRenders=0,flushes=0;const x=setup(false,{requestRender(){renders++;},requestGlobalRender(){statusRenders++;},flushRender(){flushes++;},prepareOnlineWork:()=>({valid:()=>true,close(){},advance(){clock+=2;return done?{done:true,token:{}}:{done:false};}}),advanceGameStep:()=>({processedSeconds:.1})});x.context.performance={now:()=>clock};x.debt(.1);x.loop.runMainTick();x.queue.shift()();x.loop.runMainTick();assert.equal(renders,0,'private math dirtied unchanged committed UI');assert.equal(statusRenders,1,'initial pending status is shown once, repeated private work does not refresh it');assert(flushes>=2,'pending external presentation must still flush');done=true;x.queue.shift()();assert.equal(renders,1);assert.equal(x.loop.getUnprocessedOnlineClockSeconds(),0);});


test('self-validating quantity work receives host deadline without duplicate outer owner checks',()=>{let clock=0,checks=0;const deadlines=[],x=setup(false,{prepareOnlineWork:()=>({checksInputOnAdvance:true,valid(){checks++;return true;},close(){},advance(deadline){deadlines.push(deadline-clock);clock+=8;return {done:false};}})});x.W.Core.Config={...x.W.Core.Config,saveVersion:75};x.context.performance={now:()=>clock};x.debt(.1);x.loop.runMainTick();x.queue.shift()();assert.deepEqual(deadlines,[12]);assert.equal(checks,0);assert.equal(x.loop.getUnprocessedOnlineClockSeconds(),.1);x.loop.invalidateOnlineScheduler();while(x.queue.length)x.queue.shift()();});

test('first online settlement notification runs once after transaction and cannot break committed time',()=>{let calls=0,ended=false;const x=setup(false,{beginTransaction(){ended=false;x.host.step.beginTransaction();},endTransaction(){x.host.step.endTransaction();ended=true;},onFirstOnlineSettlement(){assert(ended);calls++;throw Error('presentation failed');}});x.debt(.2);x.loop.runMainTick();assert.equal(calls,0,'private preparation is not a completed step');let turns=0;while(x.queue.length){x.queue.shift()();assert(++turns<1000);}assert.equal(calls,1);assert.equal(x.loop.getUnprocessedOnlineClockSeconds(),0);x.debt(.1);x.loop.runMainTick();while(x.queue.length)x.queue.shift()();assert.equal(calls,1);});
test('zero-time online result never announces a first settlement',()=>{let calls=0;const x=setup(true,{advanceGameStep:()=>({processedSeconds:0}),onFirstOnlineSettlement(){calls++;}});x.debt(.1);x.loop.runMainTick();assert.equal(calls,0);});

for(const kind of ['preferences','player-action'])test('cross-host '+kind+' write invalidates real quantity work',async()=>{const x=setup();const s=x.host.getState(),job=x.host.step.prepareOnlineWork(.1,{source:'online',clockRatio:1});assert.equal(job.advance(-Infinity).done,false);await new Promise(resolve=>setImmediate(resolve));if(kind==='preferences')s.core.preferences.hideUnlockedAchievements=!s.core.preferences.hideUnlockedAchievements;else x.W.Core.Resources.creditExact('core.joules',1,s);await new Promise(resolve=>setImmediate(resolve));assert.throws(()=>job.advance(Infinity),e=>e.code==='rank-work-stale');assert.equal(s.core.runtime.totalElapsedSeconds,0);});

for(const boundary of ['leave','import'])test(boundary+' invalidates queued online work without consuming clock',()=>{
 const x=setup();x.debt(.1);x.loop.runMainTick();assert(x.queue.length);const callback=x.queue.shift();
 if(boundary==='leave')x.loop.prepareSave({closing:true});else x.loop.beginImportHold();
 callback();while(x.queue.length)x.queue.shift()();assert.equal(x.host.getState().totalElapsedSeconds,0);assert.equal(x.loop.getUnprocessedOnlineClockSeconds(),.1);
});
