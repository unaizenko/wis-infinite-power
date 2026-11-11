'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup({duration=500,fail=false,speed=1,zero=false,progress=false}={}){
 let globalRenders=0,renders=0,owner={}, rate=7, now=100000,committed=0,discarded=0,key=1,next=0;const tasks=new Map(),jobs=[];
 const state={core:{runtime:{onlineCadenceRemaining:.1,timeLedger:{awaySince:null,boundaryAt:now,registeredUntil:now,pendingContinuousTime:[],pendingDiscard:null}}},totalElapsedSeconds:0,unlockedAchievements:{}};
 const W={Simulation:{},Core:{BigNum:{div:(a,b)=>a/b,isFiniteBN:Number.isFinite,gte:(a,b)=>a>=b},Config:{saveVersion:76},Save:{sessionPolicy:()=>({})}},tmp:{rates:{}},Meta:{Achievements:{recordCurrent(){}}}};
 const box={window:null,performance:{now:()=>now},Date:{now:()=>now},document:{hidden:false,addEventListener(){}},setTimeout:f=>{tasks.set(++next,f);return next;},clearTimeout:id=>tasks.delete(id)};box.window=box;box.WIS=W;
 for(const p of ['settlement-limit','loop'])vm.runInNewContext(fs.readFileSync('js/simulation/'+p+'.js','utf8'),box);
 const offline={getCatchUpStatus:()=>({phase:'idle',pendingGameSeconds:0}),getPendingCatchUpSeconds:()=>0,availableCompensationClockSeconds:()=>0,suspendForAway(){},returnFromAway(){},invalidateSourceModels(){}};
 const loop=W.Simulation.Loop.create({getState:()=>state,offline,epsilon:1e-10,simulationStepSeconds:.1,requestRender(){renders++;},requestGlobalRender(){globalRenders++;},flushRender(){},saveState(){return true;},effectiveDevSpeed:()=>speed,isInitialLoadComplete:()=>true,
 rateIdentity:()=>[owner],onlineStateKey:()=>key,onlineFailureKey:()=>key,
 commitDiscard(parts){const seconds=parts.reduce((a,p)=>a+p.clock,0);discarded+=seconds;W.tmp.rates.joulesPerSecond=0;state.core.runtime.timeLedger.pendingDiscard=null;return true;},
 prepareOnlineWork(seconds){const began=now,record={closed:false};jobs.push(record);return {checksInputOnAdvance:true,progress:()=>progress?Math.floor((now-began)/100):0,waiting:()=>now-began<duration,advance(){if(fail)throw Object.assign(Error('bad number'),{code:'digit-capacity'});return {done:true,token:record};},close(){record.closed=true;}};},
 advanceGameStep(seconds){committed+=seconds;return {processedSeconds:zero?0:seconds,resourceGains:{joules:seconds*rate,power:0}};}});
 return {state,loop,jobs,W,renders:()=>renders,globalRenders:()=>globalRenders,nextTask(){const item=tasks.entries().next().value;if(item){tasks.delete(item[0]);item[1]();}},slow(ms){duration=ms;},elapsed(ms){now+=ms;},replace(){owner={};},rate(n){rate=n;},failNext(){fail=true;},clock:()=>now,counts:()=>({committed,discarded}),recover(){duration=0;},input(){key++;},tick(ms=100){now+=ms;loop.runMainTick();let safety=0;while(tasks.size&&++safety<100){const [id,f]=tasks.entries().next().value;tasks.delete(id);f();}assert(safety<100,'busy loop');}};
}
// Publication is derived from committed gains, never effects scratch rates.
test('confirmed rate survives discard clearing scratch rates',()=>{const x=setup();assert.equal(x.loop.getCommittedRates().rates,null);for(let i=0;i<20;i++)x.tick();assert(x.counts().discarded>0);assert(x.counts().committed>0);assert.equal(x.W.tmp.rates.joulesPerSecond,0);assert.equal(x.loop.getCommittedRates().rates.joulesPerSecond,7);assert.equal(x.loop.getCommittedRates().rates.powerPerSecond,0);});
test('uncommitted work never publishes a rate; stale, owner and reset are explicit',()=>{const x=setup();x.tick();assert.equal(x.loop.getCommittedRates().rates,null);for(let i=0;i<10;i++)x.tick();x.elapsed(2100);assert.equal(x.loop.getCommittedRates().stale,true);x.replace();assert.equal(x.loop.getCommittedRates().rates,null);for(let i=0;i<15;i++)x.tick();assert(x.loop.getCommittedRates().rates);x.loop.resetAccumulators();assert.equal(x.loop.getCommittedRates().rates,null);});
test('a genuine zero replaces positive output; failure cannot masquerade as zero',()=>{const x=setup({duration:0});for(let i=0;i<8;i++)x.tick();assert.equal(x.loop.getCommittedRates().rates.joulesPerSecond,7);x.rate(0);for(let i=0;i<8;i++)x.tick();assert.equal(x.loop.getCommittedRates().rates.joulesPerSecond,0);x.failNext();for(let i=0;i<8;i++)x.tick();assert.equal(x.loop.getCommittedRates().stopped,true);});

test('stale transition requests rendering while healthy work is still pending',()=>{const x=setup({duration:0,progress:true});for(let i=0;i<6;i++)x.tick();assert(x.loop.getCommittedRates().rates);x.slow(5000);x.tick();const start=x.globalRenders();for(let i=0;i<24;i++)x.tick();assert.equal(x.loop.getCommittedRates().stale,true);assert(x.globalRenders()>start,'stale presentation was never scheduled');const shown=x.globalRenders(),pages=x.renders();for(let i=0;i<5;i++)x.tick();assert.equal(x.globalRenders(),shown,'stale notification repeated');assert.equal(x.renders(),pages,'stale status dirtied expensive previews');});

test('private action slices do not request page renders; commit does',async()=>{
 const x=setup({duration:0});for(let i=0;i<6;i++)x.tick();
 let steps=0;const result=x.loop.requestDeferredAction(()=>({advance(){return {done:++steps===12};},commit(){return 'committed';}}));
 const start=x.renders();for(let i=0;i<10;i++)x.nextTask();
 assert(steps>0&&steps<12);assert.equal(x.renders(),start,'uncommitted action repeatedly dirtied the page');
 for(let i=0;i<3;i++)x.nextTask();assert.equal(await result,'committed');assert(x.renders()>start,'committed action did not render');
});
