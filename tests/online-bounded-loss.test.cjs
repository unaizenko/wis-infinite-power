'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup({duration=500,fail=false,speed=1,zero=false}={}){
 let now=100000,committed=0,discarded=0,key=1,next=0;const tasks=new Map(),jobs=[];
 const state={core:{runtime:{onlineCadenceRemaining:.1,timeLedger:{awaySince:null,boundaryAt:now,registeredUntil:now,pendingContinuousTime:[],pendingDiscard:null}}},totalElapsedSeconds:0,unlockedAchievements:{}};
 const W={Simulation:{},Core:{Config:{saveVersion:76},Save:{sessionPolicy:()=>({})}},tmp:{rates:{}},Meta:{Achievements:{recordCurrent(){}}}};
 const box={window:null,performance:{now:()=>now},Date:{now:()=>now},document:{hidden:false,addEventListener(){}},setTimeout:f=>{tasks.set(++next,f);return next;},clearTimeout:id=>tasks.delete(id)};box.window=box;box.WIS=W;
 for(const p of ['settlement-limit','loop'])vm.runInNewContext(fs.readFileSync('js/simulation/'+p+'.js','utf8'),box);
 const offline={getCatchUpStatus:()=>({phase:'idle',pendingGameSeconds:0}),getPendingCatchUpSeconds:()=>0,availableCompensationClockSeconds:()=>0,suspendForAway(){},returnFromAway(){},invalidateSourceModels(){}};
 const loop=W.Simulation.Loop.create({getState:()=>state,offline,epsilon:1e-10,simulationStepSeconds:.1,requestRender(){},flushRender(){},saveState(){return true;},effectiveDevSpeed:()=>speed,isInitialLoadComplete:()=>true,
 onlineStateKey:()=>key,onlineFailureKey:()=>key,
 commitDiscard(parts){const seconds=parts.reduce((a,p)=>a+p.clock,0);discarded+=seconds;state.core.runtime.timeLedger.pendingDiscard=null;return true;},
 prepareOnlineWork(seconds){const began=now,record={closed:false};jobs.push(record);return {checksInputOnAdvance:true,waiting:()=>now-began<duration,advance(){if(fail)throw Object.assign(Error('bad number'),{code:'digit-capacity'});return {done:true,token:record};},close(){record.closed=true;}};},
 advanceGameStep(seconds){committed+=seconds;return {processedSeconds:zero?0:seconds};}});
 return {state,loop,jobs,clock:()=>now,counts:()=>({committed,discarded}),input(){key++;},tick(ms=100){now+=ms;loop.runMainTick();let safety=0;while(tasks.size&&++safety<100){const [id,f]=tasks.entries().next().value;tasks.delete(id);f();}assert(safety<100,'busy loop');}};
}
for(const duration of [125,500])test('sustained slower settlement stays bounded and accounts committed/pending/discarded: '+duration,()=>{const x=setup({duration});for(let i=0;i<300;i++){x.tick();assert(x.loop.getUnprocessedOnlineClockSeconds()<=.200000001,'unbounded online queue');}const c=x.counts(),p=x.state.core.runtime.timeLedger;assert(c.committed>0);assert(c.discarded>0);assert(Math.abs(30-c.committed-c.discarded-x.loop.getUnprocessedOnlineClockSeconds()-(p.pendingDiscard?.clock||0))<1e-8);});
test('nonreturning candidate times out, is cancelled, and never automatically retries unchanged input',()=>{const x=setup({duration:1e9});for(let i=0;i<70;i++)x.tick();assert.equal(x.jobs.length,1);assert(x.jobs[0].closed);assert.equal(x.counts().committed,0);assert(x.counts().discarded>6);x.input();x.tick();assert.equal(x.jobs.length,2);});
test('numeric failure discards debt once and stays operable without repeating failing work',()=>{const x=setup({duration:0,fail:true});for(let i=0;i<20;i++)x.tick();assert.equal(x.jobs.length,1);assert.equal(x.counts().committed,0);assert(x.counts().discarded>1.8);assert.equal(x.loop.prepareSave({captureOnly:true}),true);});
test('action boundary cancels pending candidate before applying elapsed discard',()=>{const x=setup();x.tick();x.tick();x.tick();assert.equal(typeof x.loop.beforePlayerAction,'function');x.loop.beforePlayerAction();assert(x.jobs[0].closed);assert.equal(x.loop.getUnprocessedOnlineClockSeconds(),0);assert(Math.abs(x.counts().discarded-.3)<1e-10);});

test('slow developer speed drains short preserved prefix before discarded interval',()=>{const x=setup({speed:.2,duration:0});for(let i=0;i<20;i++)x.tick();assert(x.counts().committed>0,'short cadence never completes');assert(x.counts().discarded>0,'discard rules never applied');assert(x.loop.getUnprocessedOnlineClockSeconds()<=.10000001);});
test('no-op deferred action does not clear same-input numeric failure',async()=>{const x=setup({duration:0,fail:true});x.tick();x.tick();const first=x.jobs.length;const p=x.loop.requestDeferredAction({advance:()=>({done:true}),commit:()=>false});x.tick();await p;for(let i=0;i<5;i++)x.tick();assert.equal(x.jobs.length,first);});
test('completed zero-time result stops repeated no-progress work',()=>{const x=setup({duration:0,zero:true});for(let i=0;i<20;i++)x.tick();assert.equal(x.jobs.length,1);assert(x.counts().discarded>1.8);});

test('native file picker foreground transition cannot retry unchanged failing input',()=>{const x=setup({duration:0,fail:true});x.tick();x.tick();assert.equal(x.jobs.length,1);x.loop.setNativeAppActive(false);x.loop.setNativeAppActive(true);x.tick();assert.equal(x.jobs.length,1);});
