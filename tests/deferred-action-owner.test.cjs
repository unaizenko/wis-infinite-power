'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
process.env.FIXED_RESULTS=path.join(require('node:os').tmpdir(),'wis-action-owner');
const {h,WIS:W}=require('./offline-fixed-20260912-r9/load.cjs');
const R=W.Core.Runtime,S=W.Core.State;
(async()=>{
 h.createSimulation(S.toSerializable(S.fresh()),{treasures:true});
 const state=R.getState(),callbacks=[],oldTimer=window.setTimeout,oldClear=window.clearTimeout;
 window.setTimeout=fn=>{callbacks.push(fn);return callbacks.length;};window.clearTimeout=()=>{callbacks.length=0;};
 let steps=0,commits=0,cancels=0,slices=0,status={phase:'idle',pendingGameSeconds:0};
 const offline={getCatchUpStatus:()=>status,availableCompensationClockSeconds:()=>0,getPendingCatchUpSeconds:()=>0};
 const loop=W.Simulation.Loop.create({getState:()=>R.getState(),offline,isInitialLoadComplete:()=>true,
  effectiveDevSpeed:()=>1,epsilon:1e-10,requestRender(){},flushRender(){},advanceGameStep(t){steps++;return {processedSeconds:t};}});
 try{
  assert.equal(typeof loop.requestDeferredAction,'function','Loop must own resumable heavy actions');
  loop.setLastTickAt(Date.now());
  const promise=loop.requestDeferredAction(current=>{assert.equal(current,state);return {advance(){slices++;return {done:slices===3};},commit(){commits++;return 7;},cancel(){cancels++;}};});
  assert(loop.isDeferredActionPending());
  assert.equal(await loop.requestDeferredAction(()=>{throw Error('second owner must not start');}),false);
  loop.enqueueForegroundAt(loop.snapshot().lastTickAt+1000);loop.runMainTick();
  assert.equal(steps,0,'uncommitted action must park online mutation');
  while(loop.isDeferredActionPending()){assert(callbacks.length);callbacks.shift()();}
  assert.equal(await promise,7);assert.equal(commits,1);assert.equal(slices,3);
  const cancelPromise=loop.requestDeferredAction(()=>({advance:()=>({done:false}),commit(){throw Error('stale commit');},cancel(){cancels++;}}));
  const debt=loop.getUnprocessedOnlineClockSeconds();loop.cancelDeferredAction('test');
  assert.equal(await cancelPromise,false);assert.equal(loop.getUnprocessedOnlineClockSeconds(),debt);
  while(callbacks.length)callbacks.shift()();
  assert.equal(commits,1);assert.equal(cancels,1);
  const blockedPromise=loop.requestDeferredAction(()=>({advance:()=>({done:false}),commit(){throw Error('blocked commit');},cancel(){cancels++;}}));
  status={phase:'running',pendingGameSeconds:1};loop.runMainTick();assert.equal(await blockedPromise,false);assert.equal(cancels,2);
  status={phase:'idle',pendingGameSeconds:0,awaitingStart:true,presentation:'blocking'};
  assert.equal(await loop.requestDeferredAction(()=>{throw Error('blocking wait must reject owner acquisition');}),false);
  status={phase:'idle',pendingGameSeconds:0};
  const stale=loop.requestDeferredAction(()=>({valid:()=>false,advance(){throw Error('stale work');},commit(){throw Error('stale commit');},cancel(){cancels++;}}));
  callbacks.shift()();assert.equal(await stale,false);
  const failed=loop.requestDeferredAction(()=>({valid(){throw Error('validation failed');},advance(){throw Error('invalid work');},commit(){throw Error('invalid commit');},cancel(){cancels++;}}));
  const rejection=assert.rejects(failed,/validation failed/);callbacks.shift()();await rejection;
  assert.equal(loop.isDeferredActionPending(),false);
  loop.invalidateOnlineScheduler();
  const old=loop.requestDeferredAction(()=>({advance:()=>({done:false}),commit:()=>9,cancel(){}}));
  const oldCallback=callbacks[0];loop.invalidateOnlineScheduler();assert.equal(await old,false);
  const newer=loop.requestDeferredAction(()=>({advance:()=>({done:true}),commit:()=>11,cancel(){throw Error('old callback cancelled new owner');}}));
  oldCallback();assert(loop.isDeferredActionPending(),'stale continuation must leave the current owner intact');
  callbacks.shift()();assert.equal(await newer,11);
  loop.invalidateOnlineScheduler();
  let waiting=false,wake,remoteSlices=0,unsubscribed=0;
  const remote=loop.requestDeferredAction(()=>({waiting:()=>waiting,onReady(fn){wake=fn;return ()=>unsubscribed++;},advance(){remoteSlices++;if(remoteSlices===1){waiting=true;return {done:false};}return {done:true};},commit:()=>17,cancel(){}}));
  callbacks.shift()();assert.equal(callbacks.length,0,'waiting worker must not spin host callbacks');assert.equal(remoteSlices,1);
  waiting=false;wake();assert.equal(callbacks.length,1);callbacks.shift()();assert.equal(await remote,17);assert.equal(unsubscribed,1);
  loop.invalidateOnlineScheduler();wake();assert.equal(callbacks.length,0,'retired result must not wake scheduler');

 }finally{window.setTimeout=oldTimer;window.clearTimeout=oldClear;}
 console.log('PASS unique deferred owner, three real host turns, one commit, parked online debt, cancel and offline invalidation');
})().catch(e=>{console.error(e);process.exitCode=1;});
