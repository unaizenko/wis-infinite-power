'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
function host({duration=50,saveAtEnd=false}={}){
 let now=100000,id=0,committed=0,discarded=0,discardGame=0,speed=1,saving=false;const tasks=new Map(),jobs=[],events=[];
 const state={core:{runtime:{timeLedger:{awaySince:null,boundaryAt:now,registeredUntil:now,pendingContinuousTime:[],pendingDiscard:null}}},totalElapsedSeconds:0,unlockedAchievements:{}};
 const W={Simulation:{},Core:{Config:{saveVersion:76},Save:{sessionPolicy:()=>({})}},Meta:{Achievements:{recordCurrent(){}}},tmp:{rates:{}}};
 const box={WIS:W,window:null,Date:{now:()=>now},performance:{now:()=>now},document:{hidden:false,addEventListener(){}},setTimeout:f=>{tasks.set(++id,f);return id;},clearTimeout:i=>tasks.delete(i)};box.window=box;
 for(const f of ['settlement-limit','loop'])vm.runInNewContext(fs.readFileSync('js/simulation/'+f+'.js','utf8'),box);
 const offline={getCatchUpStatus:()=>({phase:'idle',pendingGameSeconds:0}),getPendingCatchUpSeconds:()=>0,availableCompensationClockSeconds:()=>0};let loop;
 loop=W.Simulation.Loop.create({getState:()=>state,offline,epsilon:1e-10,simulationStepSeconds:.1,isInitialLoadComplete:()=>true,effectiveDevSpeed:()=>speed,requestRender(){},flushRender(){},saveState(){return true;},onlineStateKey:()=>1,
 prepareOnlineWork(seconds){const job={began:now,seconds,callback:null,waiting:()=>now-job.began<duration,onReady(f){job.callback=f;return ()=>{job.callback=null;};},advance(){events.push('ready');return {done:true,token:job};},close(){job.closed=true;}};jobs.push(job);return job;},
 advanceGameStep(seconds){events.push('settle');committed+=seconds;return {processedSeconds:seconds};},
 commitDiscard(parts){events.push('discard');for(const p of parts){discarded+=p.clock;discardGame+=p.clock*p.speed;}return true;},
 endTransaction(){if(saveAtEnd&&!saving){saving=true;now+=1;loop.prepareSave({captureOnly:true});saving=false;}}
 });
 function pump(){let n=0;while(tasks.size){assert(++n<100);const [key,fn]=tasks.entries().next().value;tasks.delete(key);fn();}}
 return {state,loop,events,jobs,pump,counts:()=>({committed,discarded,discardGame}),tick(ms=101){now+=ms;loop.runMainTick();pump();},ready(ms){now+=ms;for(const j of jobs)if(!j.closed&&!j.waiting())j.callback?.();pump();},speed(v){speed=v;},clock:()=>now};
}
test('ready boundary commits earlier time and discard before later settlement',()=>{
 const x=host();x.tick();x.tick();x.tick();assert.deepEqual(x.events.slice(0,6),['ready','settle','discard','ready','settle','discard']);assert.equal(x.jobs.length,3);assert(Math.abs(x.counts().committed-.2)<1e-9);assert(Math.abs(x.counts().discarded-.002)<1e-9);
});
test('worker completion notification drains without waiting for a main tick',()=>{
 const x=host();x.tick();x.ready(50);assert.deepEqual(x.events,['ready','settle','discard']);assert.equal(x.jobs.length,1);assert.equal(x.loop.getUnprocessedOnlineClockSeconds(),0);x.tick(51);assert.equal(x.jobs.length,2);assert(Math.abs(x.counts().discarded-.001)<1e-9);
});
test('cancelled worker callback cannot install an old candidate',()=>{
 const x=host();x.tick();const stale=x.jobs[0].callback;x.loop.invalidateOnlineScheduler();stale();x.ready(60);assert.equal(x.counts().committed,0);
});
test('discard retains the speed of its original interval',()=>{
 const x=host();x.tick();x.speed(2);x.ready(50);assert(Math.abs(x.counts().discardGame-.001)<1e-9);
});
test('transaction-close capture cannot double count time during ready admission',()=>{
 const x=host({saveAtEnd:true});for(let i=0;i<20;i++)x.tick();const c=x.counts(),p=x.state.core.runtime.timeLedger;
 assert(Math.abs((x.clock()-100000)/1000-c.committed-c.discarded-x.loop.getUnprocessedOnlineClockSeconds()-(p.pendingDiscard?.clock||0))<1e-8);
});
