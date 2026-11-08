'use strict';
process.env.WIS_TEST_PRODUCTION_ASSEMBLY='1';
// Real production UI.App + Simulation.Offline + Simulation.Loop. Only the host
// DOM, timers, file API and localStorage are stubs. No settlement math, growth
// formula, RNG or offline numeric path is replaced or relaxed anywhere here.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.WIS_TEST_ROOT||path.resolve(__dirname,'..');
process.env.AUDIT_GAME_ROOT=root;
const productionContext=require('./helpers/import-production-context.cjs');
const {h,WIS:W}=require(root+'/tests/offline-fixed-20260912-r9/load.cjs');
const S=W.Core.State,R=W.Core.Runtime;

const store=new Map();
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};

function makeHost(){
 let id=0;const timers=new Map(),frames=new Map(),nodes=new Map();
 const node=key=>{
  if(!nodes.has(key))nodes.set(key,{id:key,open:false,hidden:false,disabled:false,textContent:'',value:0,title:'',
   dataset:{},style:{},files:[],children:[],firstChild:null,listeners:{},
   classList:{toggle(){},add(){},remove(){},contains:()=>false},
   toggleAttribute(){},setAttribute(){},removeAttribute(){},getAttribute:()=>null,
   addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);},
   // Enough of a tree for the real bindEvents to run. '.page' stays null so
   // byId's page-scoped render filter behaves exactly as before.
   querySelector:sel=>node(key+'>'+sel),querySelectorAll:()=>[],
   closest:sel=>sel==='.page'?null:node(key+'^'+sel),prepend(){},after(){},insertBefore(){},
   append(){},appendChild(){},replaceChildren(){},removeChild(){},remove(){},
   insertAdjacentElement(){},cloneNode(){return node(key+'#clone');},
   focus(){},blur(){},scrollIntoView(){},
   click(){for(const handler of this.listeners.click||[])handler({target:this,preventDefault(){}});},
   showModal(){this.open=true;},close(){this.open=false;}});
  return nodes.get(key);
 };
 class Blob{constructor(parts){this.parts=parts||[];}}
 class FileReader{
  readAsText(source,encoding){
   FileReader.calls.push(encoding);
   const text=typeof source?.__text==='string'?source.__text:String(source?.parts?.join('')??'');
   timers.set(++id,{f:()=>{this.result=text;this.onload?.();},at:-Infinity});
  }
 }
 FileReader.calls=[];
 const host={WIS:W,Blob,FileReader,
  get performance(){return global.performance;},
  clearTimeout:k=>timers.delete(k),setTimeout:(f,t)=>{timers.set(++id,{f,at:Date.now()+(Number(t)||0)});return id;},
  setInterval:()=>0,clearInterval(){},
  cancelAnimationFrame:k=>frames.delete(k),requestAnimationFrame:f=>{frames.set(++id,f);return id;},
  addEventListener(){},removeEventListener(){},confirm:()=>true,MessageChannel:undefined};
 const document={hidden:false,documentElement:node('html'),querySelector:()=>node('app'),
  getElementById:node,querySelectorAll:()=>[],createElement:()=>node('created-'+(++id)),
  createDocumentFragment:()=>node('fragment-'+(++id)),addEventListener(){},removeEventListener(){}};
 return {host,document,node,FileReader,Blob,
  frame(){const jobs=[...frames.values()];frames.clear();jobs.forEach(f=>f());},
  takeFrames(){const jobs=[...frames.values()];frames.clear();return jobs;},
  takeTimers(){const jobs=[...timers.values()].map(job=>job.f);timers.clear();return jobs;},
  drain(){let n=0;while(timers.size&&n<10000){const [k,t]=timers.entries().next().value;timers.delete(k);t.f();n++;}return n;},
  get pendingTimers(){return timers.size;}};
}

function createApp(sim,overrides={},observe=()=>{}){
 const box=makeHost();
 W.UI.Format ||= {smallMultiplier:String};
 W.UI.byId=box.node;
 const scope={window:box.host,document:box.document,console,Date,performance};
 vm.createContext(scope);
 for(const file of ['source-preview.js','format.js','cards.js','big-numbers.js','infinity.js','xiuzhen.js','treasures.js','martial.js','dialog.js','app.js'])
  vm.runInContext(fs.readFileSync(path.join(root,'js/ui',file),'utf8'),scope,{filename:'js/ui/'+file});
 const calls={save:0,playerAction:0,recoveryStarts:0,starts:0};
 // Mirrors game.js: same offline entry points, same order, no second system.
 const loopBox={loop:null};
 const context={
  formatElapsedTime:String,format:String,formatCompact:String,formatCost:String,formatGameCalendar:String,
  formatSoftcapExponent:String,formatMultiplierGroups:()=>'',
  multiplyEffects:()=>W.Core.BigNum.ONE,multiplierEffectValue:()=>W.Core.BigNum.ONE,multiplyEffectGroups:()=>[],
  calculateSourceGain:()=>W.Core.BigNum.ZERO,calculateRegionGain:()=>W.Core.BigNum.ZERO,
  resourceSoftcapExponent:()=>1,planetSuppressionSoftcapExponent:()=>1,
  activeSoftcapStages:()=>[],removedSoftcapStages:()=>[],
  achievementDefinitions:[],hasAchievement:()=>false,achievementStates:()=>({}),notifyNewAchievements(){},
  achievementsUnlocked:()=>false,upgradesUnlocked:()=>false,cultivationUnlocked:()=>false,
  treasuresUnlocked:()=>false,challengesUnlocked:()=>false,statisticsUnlocked:()=>false,
  freshDefaultState:S.fresh,
  saveState(options){calls.save++;return W.Core.Save.persistLive(R.getState(),loopBox.loop,sim.offline,options);},setLastTickAt:value=>loopBox.loop?.setLastTickAt(value),
  completePlayerAction(){calls.playerAction++;},
  getCatchUpStatus:()=>sim.offline.getCatchUpStatus(),
  subscribeCatchUpStatus:listener=>sim.offline.subscribeCatchUpStatus(listener),
  claimPauseNotice:status=>sim.offline.claimPauseNotice(status),
  cancelCatchUp:()=>sim.offline.cancelCatchUp(),
  abandonCatchUp:()=>sim.offline.abandonCatchUp(),
  retryCatchUp:()=>sim.offline.retryCatchUp(),
  startCatchUp:()=>{calls.starts++;return sim.offline.startCatchUp();},
  pauseCatchUpByPlayer:()=>sim.offline.pauseCatchUpByPlayer(),
  acknowledgeCatchUp:()=>sim.offline.acknowledgeCatchUp(),
  convertOfflineToCompensation:()=>{
   // Same wrapper order as game.js, so the gate is exercised end to end.
   loopBox.loop.prepareSave();sim.offline.sealOnlineTail();
   return sim.offline.convertOfflineToCompensation();
  },
  simulateOfflineProgress:(...a)=>sim.offline.simulateOfflineProgress(...a),
  queueCatchUpNotice:(...a)=>{calls.recoveryStarts++;return sim.offline.queueCatchUpNotice(...a);},
  ...overrides
 };
 const bindings={WIS:W,Date,console,SIMULATION_EPSILON:1e-10,
  get state(){return R.getState();},get simulationLoop(){return loopBox.loop;},offlineSimulation:sim.offline,
  invalidateOnlineScheduler:()=>loopBox.loop.invalidateOnlineScheduler(),
  cancelCatchUp:()=>sim.offline.cancelCatchUp(),setStateDirect:next=>R.setState(next)};
 const callbacks=productionContext(root,bindings);
 for(const [name,callback] of Object.entries(callbacks))callbacks[name]=(...args)=>{
  observe(name,'before');const result=callback(...args);observe(name,'after');return result;
 };
 Object.assign(context,callbacks,{captureImportState:callbacks.captureImportStateSnapshot,
  restoreImportState:callbacks.restoreImportStateSnapshot},overrides);
 const ui=W.UI.App.create(context);
 const loopAPI=W.Simulation.Loop;
 vm.runInContext(fs.readFileSync(path.join(root,'js/simulation/loop.js'),'utf8'),scope,{filename:'js/simulation/loop.js'});
 loopBox.loop=W.Simulation.Loop.create({getState:()=>R.getState(),offline:sim.offline,
  requestRender(){},flushRender(){},saveState(){},effectiveDevSpeed:()=>1,
  // The real online step, so "the game resumes normally" is actually verified.
  advanceGameStep:(...a)=>sim.advanceGameStep(...a),
  isInitialLoadComplete:()=>true,epsilon:1e-10,simulationStepSeconds:0.1,logicIntervalMs:100});
 W.Simulation.Loop=loopAPI;
 // Bind the real handlers so the dialog buttons are exercised, not simulated.
 let bound=true;
 try { ui.bindEvents(); } catch (error) { bound=false; boundFailure=error; }
 W.Core.Save.bindOfflineRecovery(options=>sim.offline.getPersistenceSnapshot(options));
 return {ui,api:ui.__test,box,calls,loop:loopBox.loop,context,bound,
  click:id=>box.node(id).click()};
}
let boundFailure=null;

function envelope(seconds,mutate){
 const fresh=S.fresh();
 fresh.joules=W.Core.BigNum.BN('1e40');
 fresh.power=W.Core.BigNum.BN('1e40');
 fresh.highestPower=W.Core.BigNum.BN('1e40');
 mutate?.(fresh);
 const payload=W.Core.Save.envelope(fresh,true,{offlineRecoveryOverride:null});
 // Only the save's own lastUpdateAt decides the unsettled interval.
 payload.data.core.runtime.lastUpdateAt=Date.now()-seconds*1000;
 return payload;
}
const fileOf=(box,payload)=>{
 const text=typeof payload==='string'?payload:JSON.stringify(payload);
 const blob=new box.Blob([text]);blob.__text=text;
 blob.text=async()=>text;
 return blob;
};
const digest=()=>JSON.stringify(S.toSerializable(R.getState()));
// Nothing may be planned or executed before the committed UI has painted: not one frame
// slice, not one compiled-micro/FixedSegment segment, not one game second.
function assertNoSettlementWork(sim,app,label){
 const status=sim.offline.getCatchUpStatus();
 assert.equal(status.awaitingStart,true,label+': awaitingStart');
 assert.equal(sim.offline.isCatchUpAwaitingStart(),true,label+': isCatchUpAwaitingStart()');
 assert.equal(status.phase,'idle',label+': must not be reported as running/paused');
 assert.equal(sim.offline.isCatchUpInProgress(),false,label+': inProgress');
 assert.equal(status.processedClockSeconds,0,label+': processed');
 assert.equal(status.settlementCosts.slices,0,label+': no runner frame ran');
 assert.equal(status.clockSuspended,true,label+': income gate held');
 if(app)assert.equal(app.calls.recoveryStarts,0,label+': runner entry point never called');
 return status;
}

const realNow=Date.now;let fixtureNow=realNow();Date.now=()=>fixtureNow;
(async()=>{
 // Observe actual game callbacks on both sides of the handoff and commit.
 // Even re-entrant host callbacks cannot start a runner inside the transaction.
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const seen=[];let app;
  app=createApp(sim,{},(name,edge)=>{
   if(!['prepareImportRecovery','commitImportTransaction'].includes(name))return;
   seen.push(name+':'+edge);
   app.box.frame();app.box.frame();app.box.drain();
   assert.equal(app.calls.starts,0,name+': no deferred entry before import completes');
   assert.equal(sim.offline.isCatchUpInProgress(),false,name+': no runner');
   if(name==='commitImportTransaction'){
    assert.equal(app.loop.snapshot().onlineIntervals.length,0,'complete metadata ownership before commit');
    assert.equal(sim.offline.isCatchUpAwaitingStart(),true,'gate stays held across commit');
   }
  });
  await app.api.importSave(fileOf(app.box,envelope(600)));
  assert.equal(seen.join(','),'prepareImportRecovery:before,prepareImportRecovery:after,commitImportTransaction:before,commitImportTransaction:after');
  assertNoSettlementWork(sim,app,'after fully observed transaction');
  app.box.frame();app.box.drain();assertNoSettlementWork(sim,app,'first postcommit paint');
  sim.offline.cancelCatchUp();
  console.log('PASS actual game handoff and commit callbacks keep the gate through first postcommit paint');
 }
 // A synthetic .055-second online prefix precedes .2 seconds offline.
 // Capture must hand both segments to recovery in FIFO order without running
 // even one online step (which would exceed the 12ms budget in this fixture).
 {
  const perf=Object.getOwnPropertyDescriptor(global,'performance');let wall=0,steps=0;
  Object.defineProperty(global,'performance',{configurable:true,value:{now:()=>wall}});
  try{
   const payload=envelope(.2,s=>{s.core.runtime.timeLedger.pendingContinuousTime=[
    {source:'online',clock:.055,speed:1,compensationEligible:false}];});
   const make=()=>{const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
    const advance=sim.advanceGameStep;sim.advanceGameStep=(...args)=>{const result=advance(...args);steps++;wall+=13;return result;};
    return {sim,app:createApp(sim)};};
   // Current prepareSave transfers the entire blocking FIFO without settlement.
   const probe=make();R.setState(W.Core.Save.prepare(payload).state);
   probe.app.context.restoreOfflineRecovery(null);
   assert.equal(probe.app.loop.prepareSave({importCommit:true}),true);
   assert.equal(steps,0,'blocking FIFO handoff never settles the online prefix');
   assert.equal(probe.app.loop.snapshot().onlineIntervals.length,0,'loop no longer owns handed-off intervals');
   assert.deepEqual(probe.sim.offline.getPersistenceSnapshot().tasks.map(t=>[t.source,t.clockSeconds,t.gameSeconds]),
    [['online',.055,.055],['offline',.2,.2]],'the complete ordered debt is retained by recovery');
   assert.equal(probe.sim.offline.getPendingCatchUpSeconds(),.255,'no debt lost or duplicated');
   probe.app.loop.invalidateOnlineScheduler();probe.sim.offline.cancelCatchUp();
   const {sim,app}=make();steps=0;
   await app.api.importSave(fileOf(app.box,payload));
   assertNoSettlementWork(sim,app,'budget-truncated import must retain recovery gate');
   assert.equal(steps,0,'import only transfers metadata, never evaluates the online prefix');
   assert.equal(app.loop.snapshot().onlineIntervals.length,0,'all interval ownership is handed off');
   const tasks=sim.offline.getPersistenceSnapshot().tasks;
   assert.equal(tasks.map(t=>t.source).join(','),'online,offline','source order retained');
   const before=R.getState().totalElapsedSeconds;
   await sim.offline.startCatchUp();
   assert.equal(sim.offline.getPendingCatchUpSeconds(),0);
   assert(Math.abs(R.getState().totalElapsedSeconds-before-.255)<1e-8,'clock debited exactly once');
   console.log('PASS blocking FIFO: metadata-only handoff, explicit start, exact clock');
  }finally{Object.defineProperty(global,'performance',perf);}
 }
 // Metadata ownership, failure rollback and old candidates are separate from
 // numeric approximation. Artificial mixed intervals exercise these boundaries.
 {
  const payload=envelope(-1,s=>{s.core.runtime.timeLedger.pendingContinuousTime=[
   {source:'online',clock:.025,speed:2,compensationEligible:true},
   {source:'offline',clock:.05,speed:3,compensationEligible:false},
   {source:'online',clock:.01,speed:4,compensationEligible:false}];});
  const stepAPI=W.Simulation.Step;let step;
  W.Simulation.Step={...stepAPI,create(c){return step=stepAPI.create(c);}};
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  W.Simulation.Step=stepAPI;
  const app=createApp(sim),rng=W.Core.Save.prepare(payload).state.core.runtime.randomState;
  const finish=work=>{let result;do{result=work.advance(performance.now()+20);}while(!result.done);return result.token;};
  const online=finish(step.prepareOnlineWork(.1,{source:'online',clockRatio:1}));
  const fixed=finish(step.prepareFixedWork(.1,{clockRatio:1,frozenOffline:true}));
  await app.api.importSave(fileOf(app.box,payload));
  assertNoSettlementWork(sim,app,'ordered mixed metadata');
  assert.equal(R.getState().core.runtime.randomState,rng,'metadata handoff consumes no RNG');
  const tasks=sim.offline.getPersistenceSnapshot().tasks;
  assert.deepEqual(tasks.map(t=>[t.source,t.speed,t.compensationEligible,t.clockSeconds]),
   [['online',2,true,.025],['offline',3,false,.05],['online',4,false,.01]]);
  assert(tasks.every(t=>t.randomMode==='state'&&t.sealed));
  const installed=digest(),debt=sim.offline.getPendingCatchUpSeconds();
  for(const options of [{preparedOnlineSegment:online},{preparedFixedSegment:fixed,timeSegment:{source:'offline',clockRatio:1}}]){
   assert.throws(()=>step.advanceGameStep(.1,true,options));
   assert.equal(digest(),installed,'old token cannot install');assert.equal(sim.offline.getPendingCatchUpSeconds(),debt);
  }
  // Fail after the online prefix has been enqueued. The real transaction must
  // restore both ownership ledgers, RNG, storage and the prior wait state.
  const before=digest(),recovery=JSON.stringify(sim.offline.getPersistenceSnapshot()),storage=W.Core.Save.storageSnapshot().text;
  const append=sim.offline.appendCatchUpTask;
  sim.offline={...sim.offline,appendCatchUpTask(...args){if(args[2]?.source==='offline')throw Error('fixture handoff failure');return append(...args);}};
  const failed=createApp(sim);
  await failed.api.importSave(fileOf(failed.box,payload));
  assert.match(failed.box.node('notice').textContent,/未完成安装/);
  assert.equal(digest(),before,'partial metadata handoff rolls back state and RNG');
  assert.equal(JSON.stringify(sim.offline.getPersistenceSnapshot()),recovery,'partial handoff rolls back queue ownership');
  assert.equal(W.Core.Save.storageSnapshot().text,storage,'storage rolled back');
  assert.equal(failed.loop.isImportHoldActive(),false,'failed transaction releases its picker hold');
  sim.offline.cancelCatchUp();
  console.log('PASS mixed metadata: order, speed, compensation, RNG, stale tokens and rollback');
 }
 // ---------- 1. long offline debt: import registers debt and waits ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  assert.equal(app.bound,true,'real dialog handlers must bind: '+(boundFailure?.stack||''));
  app.box.node('settings-dialog').showModal();
  const started=Date.now();
  await app.api.importSave(fileOf(app.box,envelope(600)));
  const importMs=Date.now()-started;
  const status=assertNoSettlementWork(sim,app,'after import');
  assert(status.pendingGameSeconds>599&&status.pendingGameSeconds<601,'full debt registered at install: '+status.pendingGameSeconds);
  assert.equal(status.startReason,'import');
  assert.equal(app.box.node('settings-dialog').open,false,'settings dialog must close');
  assert.equal(app.box.node('offline-progress-dialog').open,true,'recovery window must show before settlement');
  assert.equal(app.box.node('start-offline-progress').hidden,true,'no manual start is demanded');
  assert.match(app.box.node('offline-progress-title').textContent,/正在/,'running UI precedes the runner');
  assert.equal(app.box.node('offline-progress-percent').textContent,'0.0%','no processed work is invented');
  assert.match(app.box.node('notice').textContent,/正在恢复/);
  // Gate: repeated live main ticks may neither start the runner nor credit time.
  app.loop.setLastTickAt(Date.now()-5000);
  assert.equal(app.loop.enqueueForegroundAt(Date.now()),0,'gated foreground time must not be enqueued');
  const elapsedBefore=Number(R.getState().totalElapsedSeconds)||0;
  for(let i=0;i<25;i++){app.loop.runMainTick();await Promise.resolve();}
  assertNoSettlementWork(sim,app,'after 25 main ticks');
  assert.equal(sim.offline.getCatchUpStatus().pendingGameSeconds,status.pendingGameSeconds,'debt unchanged by the gated ticks');
  assert.equal(Number(R.getState().totalElapsedSeconds)||0,elapsedBefore,'no game time advanced while waiting');
  assert.equal(app.loop.getUnprocessedOnlineClockSeconds(),0);
  console.log('PASS long-debt import: handler returned in '+importMs+'ms, debt registered, window shown, runner never started across 25 main ticks');
 }

 // Pausing during the first painted frame must own the pending queue, persist
 // as a normal paused recovery, and retire even already-dispatched callbacks.
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  await app.api.importSave(fileOf(app.box,envelope(600)));
  app.box.frame();
  const staleFrames=app.box.takeFrames();
  assert.equal(app.box.node('pause-offline-progress').hidden,false,'pause available before settlement');
  app.click('pause-offline-progress');
  const paused=sim.offline.getCatchUpStatus();
  assert.equal(paused.phase,'paused','prepaint pause is a real pause');
  assert.equal(paused.awaitingStart,false,'pause owns its gate');
  assert.equal(sim.offline.getPersistenceSnapshot().paused,true,'prepaint pause survives persistence');
  const before=digest();
  staleFrames.forEach(f=>f());app.box.frame();app.box.drain();await Promise.resolve();
  assert.equal(app.calls.starts,0,'retired prepaint callback cannot resume a pause');
  assert.equal(digest(),before,'prepaint pause consumes no clock, RNG or resources');
  assert.equal(sim.offline.getPendingCatchUpSeconds(),600);
  sim.offline.cancelCatchUp();
  console.log('PASS pause before auto start: retained debt, persistent pause, retired callback');
 }

 // ---------- 2. awaitingStart -> abandon ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  await app.api.importSave(fileOf(app.box,envelope(7200)));
  assertNoSettlementWork(sim,app,'awaiting before abandon');
  const before=Number(R.getState().totalElapsedSeconds)||0;
  const beforeMetrics=W.Simulation.FixedSegment.metrics().offlineGameSeconds||0;
  app.box.frame();app.box.frame();
  const staleStarts=app.box.takeTimers();
  app.click('abandon-offline-progress');
  await Promise.resolve();await Promise.resolve();
  staleStarts.forEach(f=>f());
  app.box.drain();
  const after=sim.offline.getCatchUpStatus();
  assert.equal(sim.offline.getPendingCatchUpSeconds(),0,'debt cleared');
  assert.equal(after.awaitingStart,false,'awaitingStart released');
  assert.equal(after.clockSuspended,false,'clock gate released');
  assert.equal(after.settlementCosts.slices,0,'abandon ran no offline step');
  assert.equal(app.calls.starts,0,'abandoned callback cannot enter the runner');
  assert.equal(Number(R.getState().totalElapsedSeconds)||0,before,'abandon advanced no game time');
  assert.equal((W.Simulation.FixedSegment.metrics().offlineGameSeconds||0)-beforeMetrics,0,'abandon performed no fixed-segment work');
  assert.equal(app.box.node('offline-progress-dialog').open,false,'recovery window closed');
  // Normal online progression resumes.
  app.loop.setLastTickAt(Date.now()-1000);
  assert(app.loop.enqueueForegroundAt(Date.now())>0.9,'online time is credited again after abandoning');
  app.loop.runMainTick();
  assert(Number(R.getState().totalElapsedSeconds)>before,'game advances online after abandoning');
  console.log('PASS awaitingStart -> abandon: no offline step, debt zeroed, gate released, online play resumes');
 }

 // ---------- 3. awaitingStart -> start settlement ----------
 {
  const perf=Object.getOwnPropertyDescriptor(global,'performance');let wall=0;
  Object.defineProperty(global,'performance',{configurable:true,value:{now:()=>wall+=5}});
  try{
  let release=null;
  const sim=h.createSimulation(S.toSerializable(S.fresh()),
   {yieldToHost:()=>new Promise(resolve=>{release=resolve;}),checkpoint:()=>{}});
  const app=createApp(sim);
  let completed=null;
  const unsubscribe=sim.offline.subscribeCatchUpStatus(status=>{if(status.phase==='completed')completed=status;});
  await app.api.importSave(fileOf(app.box,envelope(600)));
  const debt=sim.offline.getPendingCatchUpSeconds();
  assertNoSettlementWork(sim,app,'awaiting before start');
  const elapsedBefore=Number(R.getState().totalElapsedSeconds)||0;
  app.box.frame();app.box.drain();
  assertNoSettlementWork(sim,app,'first frame must paint before startup');
  app.box.frame();
  assertNoSettlementWork(sim,app,'second animation frame only queues a task');
  app.box.drain();
  await Promise.resolve();
  assert.equal(sim.offline.getCatchUpStatus().awaitingStart,false,'awaitingStart cleared after paint');
  assert.equal(sim.offline.isCatchUpInProgress(),true,'the existing runner is now active: '+JSON.stringify(sim.offline.getCatchUpStatus()));
  assert.equal(app.calls.starts,1,'one deferred auto start');
  const session=sim.offline.getCatchUpStatus().startedAt;
  // A repeated start and a concurrent main tick must not create a second
  // runner: both reuse the one session promise the runner already owns.
  app.box.frame();app.box.drain();
  assert.equal(app.calls.starts,1,'later frames cannot start another runner');
  void sim.offline.startCatchUp();
  app.loop.runMainTick();
  assert.equal(sim.offline.getCatchUpStatus().startedAt,session,'still the same single recovery session');
  assert.equal(sim.offline.isCatchUpInProgress(),true,'still exactly one active runner');
  let guard=0;
  while(sim.offline.getPendingCatchUpSeconds()>1e-9&&guard++<200000){
   const resume=release;release=null;if(resume)resume();
   await Promise.resolve();await Promise.resolve();app.box.drain();
  }
  assert.equal(sim.offline.getPendingCatchUpSeconds(),0,'all imported offline time settled');
  // Automatic summary close acknowledges completion and resets public status
  // to idle. Verify the actual completed event and final state, not stale UI.
  unsubscribe();
  assert(completed,'the runner published completion before UI acknowledgement');
  const done=completed;
  assert(done.processedClockSeconds>0,'processed grew');
  assert(Math.abs(done.processedClockSeconds-done.originalClockSeconds)<1e-6,'processed == original clock');
  assert(Math.abs((Number(R.getState().totalElapsedSeconds)||0)-elapsedBefore-debt)<1e-6,
   'exactly the registered debt advanced, settled once: '+((Number(R.getState().totalElapsedSeconds)||0)-elapsedBefore)+' vs '+debt);
  console.log('PASS committed import -> running UI -> paint -> auto start: one runner, exact debt');
  }finally{Object.defineProperty(global,'performance',perf);}
 }

 // ---------- 4. awaitingStart -> convert to online compensation ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  await app.api.importSave(fileOf(app.box,envelope(3600)));
  assertNoSettlementWork(sim,app,'awaiting before conversion');
  const before=Number(R.getState().totalElapsedSeconds)||0;
  app.click('convert-offline-progress');
  const after=sim.offline.getCatchUpStatus();
  assert(Number(R.getState().core.runtime.compensation.balance)>3599,'compensation credited: '+R.getState().core.runtime.compensation.balance);
  assert.equal(sim.offline.getPendingCatchUpSeconds(),0,'converted debt removed');
  assert.equal(after.awaitingStart,false,'awaitingStart released by conversion');
  assert.equal(after.clockSuspended,false,'gate released');
  assert.equal(after.settlementCosts.slices,0,'conversion ran no offline step');
  assert.equal(Number(R.getState().totalElapsedSeconds)||0,before,'conversion advanced no game time');
  console.log('PASS awaitingStart -> 转为两倍在线收益: no offline step first, gate released');
 }

 // ---------- 5. save2 -> save1 -> abandon -> save2 (cross-save sessions) ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  await app.api.importSave(fileOf(app.box,envelope(7200)));
  const first=assertNoSettlementWork(sim,app,'first import of save 2');
  const firstSession=first.startedAt;
  // save 1 (a different save with its own debt)
  await app.api.importSave(fileOf(app.box,envelope(1800)));
  const second=assertNoSettlementWork(sim,app,'import of save 1');
  assert(second.pendingGameSeconds>1799&&second.pendingGameSeconds<1801,
   'only the new save\'s debt is registered, the old one is not inherited: '+second.pendingGameSeconds);
  assert.equal(second.queuedTaskCount,1,'exactly one queued task, no duplicate registration');
  // abandon save 1's offline income, then import save 2 again
  app.click('abandon-offline-progress');
  await Promise.resolve();app.box.drain();
  assert.equal(sim.offline.getPendingCatchUpSeconds(),0);
  assert.equal(sim.offline.isCatchUpAwaitingStart(),false);
  await app.api.importSave(fileOf(app.box,envelope(7200)));
  const third=assertNoSettlementWork(sim,app,'second import of save 2');
  assert(third.pendingGameSeconds>7199&&third.pendingGameSeconds<7201,'fresh debt only: '+third.pendingGameSeconds);
  assert.equal(third.queuedTaskCount,1,'one task, no leftover from the earlier sessions');
  assert.equal(third.processedClockSeconds,0,'replacement session has no previously processed clock');
  assert.equal(app.box.node('offline-progress-dialog').open,true,'recovery window shown again');
  for(let i=0;i<10;i++){app.loop.runMainTick();await Promise.resolve();}
  assertNoSettlementWork(sim,app,'second import of save 2 after main ticks');
  console.log('PASS 2 -> 1 -> 放弃 -> 2: each import starts a new session, no old runner before paint');
 }

 // ---------- 6. handoff gate survives persistence / refresh ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  await app.api.importSave(fileOf(app.box,envelope(7200)));
  assertNoSettlementWork(sim,app,'awaiting before persistence');
  const saved=JSON.parse(JSON.stringify(sim.offline.getPersistenceSnapshot({closing:true})));
  assert.equal(saved.awaitingStart,true,'awaitingStart is persisted');
  assert.equal(saved.startReason,'import');
  // The save layer passes the extra fields through unchanged and still accepts
  // the payload, so the safety gate survives a real write/read cycle.
  assert.equal(W.Core.Save.validateRecovery(saved)?.awaitingStart,true,'the persisted snapshot is still a valid recovery payload');
  // Full save-layer round trip: a save written while waiting still says so.
  const roundTrip=envelope(-1);roundTrip.offlineRecovery=saved;
  assert.equal(W.Core.Save.prepare(JSON.parse(JSON.stringify(roundTrip))).offlineRecovery.awaitingStart,true,
   'Save.prepare preserves awaitingStart through a written save');
  // Reload: a fresh simulation restores the snapshot, exactly like bootstrap.
  const reloaded=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app2=createApp(reloaded);
  assert.equal(app2.context.restoreOfflineRecovery(saved),true,'snapshot restored');
  const restored=assertNoSettlementWork(reloaded,app2,'after refresh');
  assert(restored.pendingGameSeconds>7199,'pending time survived the refresh: '+restored.pendingGameSeconds);
  assert.equal(restored.startReason,'import');
  app2.api.handleOfflineCatchUpStatus(reloaded.offline.getCatchUpStatus());
  assert.equal(app2.box.node('offline-progress-dialog').open,true,'running recovery is presented after refresh');
  for(let i=0;i<10;i++){app2.loop.runMainTick();await Promise.resolve();}
  assertNoSettlementWork(reloaded,app2,'after refresh + main ticks');
  app2.box.frame();app2.box.drain();assertNoSettlementWork(reloaded,app2,'refresh first paint');
  app2.box.frame();app2.box.drain();
  assert.equal(app2.calls.starts,1,'restored handoff automatically resumes after paint');
  reloaded.offline.cancelCatchUp();
  // Backward compatibility: an old snapshot without the field settles normally.
  const legacy=JSON.parse(JSON.stringify(saved));delete legacy.awaitingStart;delete legacy.startReason;
  const old=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app3=createApp(old);
  assert.equal(app3.context.restoreOfflineRecovery(legacy),true);
  assert.equal(old.offline.isCatchUpAwaitingStart(),false,'a save without the field keeps the old behaviour');
  assert.equal(old.offline.getCatchUpStatus().awaitingStart,false);
  app3.loop.runMainTick();
  // The gate did not block the hand-over: the runner was entered. (Several
  // fixtures share one process, so its first segment may immediately pause on
  // another fixture's prepared segment; leaving 'idle' is the signal here.)
  assert(old.offline.getCatchUpStatus().phase!=='idle',
   'legacy snapshots are still auto-continued by the main loop');
  old.offline.cancelCatchUp();
  console.log('PASS handoff gate persists across refresh and auto resumes after paint; legacy snapshots stay compatible');
 }

 // ---------- 7. no debt: no waiting state at all ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  app.box.node('settings-dialog').showModal();
  await app.api.importSave(fileOf(app.box,envelope(-1)));
  assert.equal(sim.offline.getPendingCatchUpSeconds(),0);
  assert.equal(sim.offline.isCatchUpAwaitingStart(),false,'no debt means no waiting state');
  assert.equal(sim.offline.getCatchUpStatus().awaitingStart,false);
  assert.equal(app.box.node('notice').textContent,'存档已导入');
  assert.equal(app.box.node('settings-dialog').open,false);
  assert.equal(app.box.node('offline-progress-dialog').open,false,'no recovery window without debt');
  assert.equal(app.calls.recoveryStarts,0);
  const before=digest();
  app.box.frame();app.box.drain();
  assert.equal(digest(),before,'a debt-free import performs no settlement');
  // Online play works immediately.
  app.loop.setLastTickAt(Date.now()-1000);
  assert(app.loop.enqueueForegroundAt(Date.now())>0.9,'no gate is held after a debt-free import');
  console.log('PASS debt-free import: no awaitingStart, no window, normal online play');
 }

 // ---------- 8. restored pause keeps pause semantics (not awaitingStart) ----------
 {
  const source=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  source.offline.appendCatchUpTask(600,600,{source:'offline',compensationEligible:false,randomMode:'state',speed:1,sealed:true,presentation:'blocking'});
  const recovery=JSON.parse(JSON.stringify({...source.offline.getPersistenceSnapshot(),
   paused:true,pauseReason:{reason:'player-paused',pendingGameSeconds:600}}));
  assert.equal(recovery.paused,true);
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  const payload=envelope(-1);payload.offlineRecovery=recovery;
  app.box.node('settings-dialog').showModal();
  await app.api.importSave(fileOf(app.box,payload));
  const status=sim.offline.getCatchUpStatus();
  assert.equal(status.phase,'paused','restored pause is preserved, not auto-resumed');
  assert.equal(status.awaitingStart,false,'paused owns the wait; the two states are not stacked');
  assert.equal(app.calls.recoveryStarts,0,'a paused queue is not handed to the runner');
  assert.match(app.box.node('notice').textContent,/暂停/);
  assert.equal(app.box.node('offline-progress-dialog').open,true,'paused recovery is visible');
  assert.equal(app.box.node('settings-dialog').open,false);
  app.loop.runMainTick();
  app.box.frame();app.box.frame();app.box.drain();
  assert.equal(app.calls.starts,0,'paused import never arms a deferred auto start');
  assert.equal(sim.offline.isCatchUpInProgress(),false,'the main loop respects a restored pause');
  await sim.offline.retryCatchUp();
  let guard=0;
  while(sim.offline.getPendingCatchUpSeconds()>1e-9&&guard++<200000){await Promise.resolve();app.box.drain();}
  assert.equal(sim.offline.getPendingCatchUpSeconds(),0,'existing retry finishes the restored queue');
  console.log('PASS imported paused recovery keeps pause/retry behaviour and does not become awaitingStart');
 }

 // ---------- 8b. a quiet online-only backlog is not gated ----------
 {
  const source=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  source.offline.appendCatchUpTask(2,2,{source:'online',compensationEligible:false,randomMode:'state',speed:1,sealed:true,presentation:'quiet'});
  const recovery=JSON.parse(JSON.stringify(source.offline.getPersistenceSnapshot()));
  assert.equal(recovery.presentation,'quiet','fixture is a quiet online backlog');
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  const payload=envelope(-1);payload.offlineRecovery=recovery;
  await app.api.importSave(fileOf(app.box,payload));
  const status=sim.offline.getCatchUpStatus();
  // Inline online work reports itself as 'notice'; either way it is not blocking.
  assert.notEqual(status.presentation,'blocking');
  assert.equal(status.awaitingStart,false,'a quiet online backlog keeps settling inline, no modal question');
  assert.equal(app.box.node('offline-progress-dialog').open,false,'no blocking window for quiet online work');
  sim.offline.cancelCatchUp();
  console.log('PASS a quiet online-only backlog is not gated behind 开始结算');
 }

 // ---------- 9. error semantics are separated ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  const before=digest();
  await app.api.importSave({text:async()=>{throw Error('读取中断');}});
  assert.match(app.box.node('notice').textContent,/无法读取存档文件/);
  assert.equal(digest(),before,'read failure leaves the current save untouched');
  await app.api.importSave(fileOf(app.box,'{ not json'));
  const jsonNotice=app.box.node('notice').textContent;
  assert.match(jsonNotice,/存档格式或内容无效/);
  assert(!/无法读取存档文件/.test(jsonNotice),'JSON failure must not be reported as a read failure');
  assert.equal(digest(),before);
  await app.api.importSave(fileOf(app.box,{game:'其他游戏',data:{}}));
  assert.match(app.box.node('notice').textContent,/存档格式或内容无效/);
  assert.equal(digest(),before);
  assert.equal(sim.offline.getPendingCatchUpSeconds(),0,'no debt from a rejected import');
  assert.equal(sim.offline.isCatchUpAwaitingStart(),false,'a rejected import creates no waiting state');
  console.log('PASS read / format / prepare failures stay distinct and non-destructive');
 }

 // ---------- 10. mobile text fallback ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  const settle=async promise=>{
   let done=false,value,failure=null;
   promise.then(v=>{value=v;done=true;},e=>{failure=e;done=true;});
   for(let i=0;i<200&&!done;i++){await Promise.resolve();app.box.frame();app.box.drain();}
   if(failure)throw failure;
   assert(done,'pending host read never completed');
   return value;
  };
  const payload=envelope(-1),text=JSON.stringify(payload);
  const blob=new app.box.Blob([text]);blob.__text=text;
  blob.text=async()=>{throw Error('blob.text unsupported');};
  assert.equal(await settle(app.api.readSaveFileText(blob)),text,'FileReader fallback returns the same UTF-8 text');
  assert.deepEqual(app.box.FileReader.calls,['UTF-8']);
  const big=new app.box.Blob([]);big.__text='{"v":"1e4000"}';
  big.text=async()=>{throw Error('unsupported');};
  assert.equal(JSON.parse(await settle(app.api.readSaveFileText(big))).v,'1e4000','high-magnitude strings are not converted to Number');
  const legacy=new app.box.Blob([]);legacy.__text=text;
  assert.equal(await settle(app.api.readSaveFileText(legacy)),text);
  const viaFallback=new app.box.Blob([]);viaFallback.__text=JSON.stringify(envelope(-1));
  await settle(app.api.importSave(viaFallback));
  assert.equal(app.box.node('notice').textContent,'存档已导入');
  console.log('PASS mobile file.text()/FileReader fallback reads UTF-8 saves without numeric conversion');
 }

 // ---------- 11. current real high save, repeated import and save/read ----------
 {
  const payload=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/infinity-real-high.json'),'utf8'));
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  let retired=[];
  for(let i=0;i<4;i++){
   await app.api.importSave(fileOf(app.box,payload));
   const before=digest(),debt=sim.offline.getPendingCatchUpSeconds();
   retired.forEach(f=>f());app.box.drain();
   assert.equal(app.calls.starts,0,'retired high-save startup cannot start replacement '+i);
   assert.equal(digest(),before,'retired callback cannot write high-value replacement '+i);
   assert.equal(sim.offline.getPendingCatchUpSeconds(),debt,'retired callback cannot change debt '+i);
   assertNoSettlementWork(sim,app,'same real high save import '+i);
   const power=String(R.getState().power);
   const saved=W.Core.Save.read();
   assert.equal(String(saved.state.power),power,'formal save/read preserves high value');
   assert.equal(saved.offlineRecovery.awaitingStart,true,'formal save/read preserves the gate');
   app.box.frame();
   if(i%2){app.box.frame();retired=app.box.takeTimers();}
   else retired=app.box.takeFrames();
  }
  const replacement=S.cloneForSimulation(R.getState());R.setState(replacement);
  retired.forEach(f=>f());app.box.frame();app.box.drain();
  assert.equal(app.calls.starts,0,'state identity replacement invalidates deferred startup');
  sim.offline.cancelCatchUp();
  console.log('PASS same real high save repeated import and persistence');
 }

 // ---------- 13. structure: one gate, one runner, no second system ----------
 {
  const ui=fs.readFileSync(path.join(root,'js/ui/app.js'),'utf8');
  const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
  const loop=fs.readFileSync(path.join(root,'js/simulation/loop.js'),'utf8');
  const offline=fs.readFileSync(path.join(root,'js/simulation/offline.js'),'utf8');
  const importer=ui.slice(ui.indexOf('async function importSave'));
  assert(!/simulateOfflineProgress\s*\(/.test(importer),'import must not call the settlement entry point directly');
  assert(!/queueCatchUpNotice\s*\(/.test(importer),'import must not hand the debt to the runner itself');
  assert(/holdCatchUpUntilUserStart/.test(game),'import registers the gate through the offline module');
  assert(/isCatchUpAwaitingStart/.test(loop),'the main loop honours the gate');
  assert(/if \(catchUpAwaitingStart\) \{ publishCatchUpStatus\(\); return catchUpPromise/.test(offline),
   'the execution layer has its own hard gate');
  assert(!/catchUpAwaitingStart\s*=\s*catchUpPaused|paused.*awaitingStart/i.test(
   offline.slice(offline.indexOf('function holdCatchUpUntilUserStart'),offline.indexOf('function retryCatchUp'))
   .replace(/\/\/[^\n]*/g,'')),'awaitingStart is not derived from paused');
  assert(/import-slow-/.test(ui)&&/IMPORT_SLOW_PHASE_MS = 500/.test(ui),'import phase diagnostics warn above 500ms');
  assert(!/offline-progress-|notice/.test(ui.slice(ui.indexOf('function createImportTimer'),ui.indexOf('async function importSave'))),
   'the phase diagnostics are console/diagnose only, never rendered for players');
  console.log('PASS no second offline/recovery system; awaitingStart is an independent state');
 }

 // ---------- 14. import phase diagnostics ----------
 {
  const sim=h.createSimulation(S.toSerializable(S.fresh()),{yieldToHost:()=>Promise.resolve(),checkpoint:()=>{}});
  const app=createApp(sim);
  await app.api.importSave(fileOf(app.box,envelope(600)));
  // Compared as text: the arrays come from the app's vm context, so a
  // deepStrictEqual would fail on the Array prototype, not the contents.
  const phases=app.api.importPhases().map(p=>p.phase).join(',');
  assert.equal(phases,'read,parse,prepare,backup,install,prepareRecovery,save,render,present,total',
   'every import phase is timed');
  assert(app.api.importPhases().every(p=>Number.isFinite(p.ms)&&p.ms>=0));
  // A failure still reports where it stopped.
  await app.api.importSave(fileOf(app.box,'{ not json'));
  assert.equal(app.api.importPhases().map(p=>p.phase).join(','),'read,parse,total',
   'a failed import is attributed to its phase');
  // Player-facing notices never carry the diagnostics.
  assert(!/ms/.test(app.box.node('notice').textContent),'players are not shown phase timings');
  console.log('PASS import phase diagnostics cover read/parse/prepare/backup/install/prepareRecovery/save/render/present/total');
 }
})().then(()=>console.log('PASS import recovery lifecycle suite'))
 .catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{Date.now=realNow;});
