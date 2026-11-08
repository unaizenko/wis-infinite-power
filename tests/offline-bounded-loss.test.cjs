'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const W={Simulation:{}};vm.runInNewContext(fs.readFileSync('js/simulation/worker-client.js','utf8'),{window:{WIS:W},Date,performance,document:{hidden:false},setInterval,clearInterval});
test('bounded candidate expires despite heartbeats, never retries and ignores late checkpoint',()=>{
 let now=0,fail=[],commits=0,workers=[];
 const c=W.Simulation.WorkerClient.create({clock:()=>now,hidden:()=>false,schedule:false,candidateTimeoutMs:2000,maxRetries:0,factory(){const w={postMessage(m){this.start=m;},terminate(){this.dead=true;}};workers.push(w);return w;},commit(){commits++;},onFailure:e=>fail.push(e)});
 c.start({});const w=workers[0],m=w.start;now=1999;w.onmessage({data:{...m,type:'heartbeat'}});c.checkHealth();assert.equal(fail.length,0);now=2001;c.checkHealth();assert.equal(fail.length,1);assert.equal(fail[0].code,'candidate-timeout');assert.equal(w.dead,true);assert.equal(workers.length,1);w.onmessage({data:{...m,type:'checkpoint',sequence:1,baseStateVersion:0,payload:{}}});assert.equal(commits,0);
});
test('hidden wall time does not spend foreground candidate budget',()=>{
 let now=0,hidden=false,failed=0;const c=W.Simulation.WorkerClient.create({clock:()=>now,hidden:()=>hidden,schedule:false,candidateTimeoutMs:2000,maxRetries:0,factory:()=>({postMessage(){},terminate(){}}),commit(){},onFailure(){failed++;}});c.start({});now=1000;c.checkHealth();hidden=true;now=10000;c.checkHealth();hidden=false;now=11000;c.checkHealth();now=12001;c.checkHealth();assert.equal(failed,1);
});
const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
function engine(host={},performanceObject=performance){const runtime=loadProductionNumericRuntime({performanceObject}),W=runtime.W;for(const file of ['discard-effects','offline'])vm.runInContext(fs.readFileSync('js/simulation/'+file+'.js','utf8'),runtime.context);const sim=W.Simulation.OfflineHeadless.create({domain:W.Core.State.fresh()},{checkpoint(){},yield:()=>Promise.resolve(),...host});return{W,sim};}
test('discard mixed FIFO queue is durable and does not grant compensation or RNG',()=>{
 let saved;const {W,sim}=engine({checkpoint(){saved=JSON.stringify(W.Core.Save.envelope(sim.getState(),false,{offlineRecoveryOverride:sim.offline.getPersistenceSnapshot()}));}});
 sim.offline.appendCatchUpTask(4,2,{source:'online',speed:2,compensationEligible:true,randomMode:'state'});sim.offline.appendCatchUpTask(8,8,{source:'offline',randomMode:'state'});
 assert.equal(typeof sim.getState().core.runtime.randomState,'number');
 const before=JSON.stringify([sim.getState().meta.treasures,sim.getState().core.runtime.randomState,sim.getState().core.runtime.compensation]);
 const result=sim.offline.discardCatchUp('recovery-budget');assert.equal(result.abandoned,true);assert.equal(sim.offline.getPendingCatchUpSeconds(),0);assert.equal(JSON.stringify([sim.getState().meta.treasures,sim.getState().core.runtime.randomState,sim.getState().core.runtime.compensation]),before);assert.equal(JSON.parse(saved).offlineRecovery??null,null);assert.equal(sim.getState().core.runtime.timeLedger.discardedClock,10);
});
test('discard save failure rolls back state and preserves exportable debt',()=>{
 const {W,sim}=engine({checkpoint(){throw Error('quota');}});sim.offline.appendCatchUpTask(10,10,{source:'offline'});const before=JSON.stringify(W.Core.State.toSerializable(sim.getState()));const r=sim.offline.discardCatchUp('candidate-timeout');assert.equal(r.abandoned,false);assert.equal(JSON.stringify(W.Core.State.toSerializable(sim.getState())),before);assert.equal(sim.offline.getPendingCatchUpSeconds(),10);assert.equal(sim.offline.isCatchUpPaused(),true);assert.doesNotThrow(()=>JSON.stringify(W.Core.Save.envelope(sim.getState(),false,{offlineRecoveryOverride:sim.offline.getPersistenceSnapshot()})));
});

test('stalled first complete unit cancels with zero earned time and durable discard',async()=>{
 let now=0,advances=0,closed=0,saves=0;const {W,sim}=engine({checkpoint(){saves++;},yield:()=>Promise.resolve()},{now:()=>now});
 const Fixed=W.Simulation.FixedSegment;W.Simulation.FixedSegment={...Fixed,createWork(){return{advance(){advances++;now+=700;return{done:false};},close(){closed++;}};}};
 sim.offline.appendCatchUpTask(1,1,{source:'offline',randomMode:'state'});const earned=sim.getState().totalElapsedSeconds;
 await sim.offline.simulateOfflineProgress(0,0);assert.equal(sim.offline.getPendingCatchUpSeconds(),0);assert.equal(sim.getState().totalElapsedSeconds,earned);assert.equal(sim.getState().core.runtime.timeLedger.discardedClock,1);assert.equal(advances,3);assert.ok(closed>0);assert.ok(saves>0);
});
test('confirmed whole task survives budget expiry and next FIFO task is discarded',async()=>{
 let now=0;const {W,sim}=engine({yield:()=>Promise.resolve()},{now:()=>now});const Fixed=W.Simulation.FixedSegment;let units=0;
 W.Simulation.FixedSegment={...Fixed,createWork(...args){const work=Fixed.createWork(...args);return{...work,advance(deadline){const r=work.advance(deadline);if(r.done){units++;now=101;}return r;}};}};
 sim.offline.appendCatchUpTask(.2,.2,{source:'offline',randomMode:'state'});sim.offline.appendCatchUpTask(.6,.3,{source:'offline',speed:2,randomMode:'state'});
 await sim.offline.simulateOfflineProgress(0,0);assert.equal(units,1);assert.equal(sim.offline.getPendingCatchUpSeconds(),0);assert.ok(Math.abs(sim.getState().totalElapsedSeconds-.2)<1e-9,JSON.stringify({elapsed:sim.getState().totalElapsedSeconds,status:sim.offline.getCatchUpStatus()}));assert.ok(Math.abs(sim.getState().core.runtime.timeLedger.discardedClock-.3)<1e-9);
});

test('explicit false checkpoint refuses discard without hiding debt',()=>{const {sim}=engine({checkpoint:()=>false});sim.offline.appendCatchUpTask(2,2,{source:'offline'});assert.equal(sim.offline.discardCatchUp('recovery-budget').abandoned,false);assert.equal(sim.offline.getPendingCatchUpSeconds(),2);});
test('real closed-G player save can terminate a never-completing candidate without replay debt',async()=>{
 let now=0,saved=null;const runtime=loadProductionNumericRuntime({performanceObject:{now:()=>now}}),W=runtime.W;
 for(const file of ['discard-effects','offline'])vm.runInContext(fs.readFileSync('js/simulation/'+file+'.js','utf8'),runtime.context);
 const path='E:/download/WIS-original-save-1794046107463.json';assert.ok(fs.existsSync(path),'required real player fixture exists');const prepared=W.Core.Save.prepare(JSON.parse(fs.readFileSync(path,'utf8')));
 let sim;sim=W.Simulation.OfflineHeadless.create({domain:prepared.state},{yield:()=>Promise.resolve(),checkpoint(){saved=JSON.stringify(W.Core.Save.envelope(sim.getState(),false,{offlineRecoveryOverride:sim.offline.getPersistenceSnapshot()}));}});
 const Fixed=W.Simulation.FixedSegment;W.Simulation.FixedSegment={...Fixed,createWork(...args){const work=Fixed.createWork(...args);let first=true;return{advance(deadline){if(first){first=false;work.advance(deadline);}now+=700;return{done:false};},close(){work.close();}};}};
 const before=JSON.stringify([sim.getState().powerSystem,sim.getState().cultivation,sim.getState().meta.treasures]);sim.offline.appendCatchUpTask(34.068,34.068,{source:'offline',randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);
 assert.equal(sim.offline.getPendingCatchUpSeconds(),0);assert.equal(JSON.stringify([sim.getState().powerSystem,sim.getState().cultivation,sim.getState().meta.treasures]),before);assert.equal(JSON.parse(saved).offlineRecovery??null,null);assert.ok(sim.getState().core.runtime.timeLedger.discardedClock>=34.068);
});
test('native worker with endless heartbeat is forcibly terminated at the independent deadline',async()=>{
 const {Worker}=require('node:worker_threads');let native,heartbeats=0;const began=performance.now();
 const result=await new Promise(resolve=>{const client=W.Simulation.WorkerClient.create({clock:()=>performance.now(),hidden:()=>false,candidateTimeoutMs:2000,maxRetries:0,factory(){native=new Worker(`const {parentPort}=require('node:worker_threads');parentPort.on('message',m=>{setInterval(()=>parentPort.postMessage({...m,type:'heartbeat'}),20);});`,{eval:true});const adapter={postMessage:m=>native.postMessage(m),terminate:()=>native.terminate()};native.on('message',data=>adapter.onmessage?.({data}));return adapter;},commit(){throw Error('must not install partial state');},onHeartbeat(){heartbeats++;},onFailure:resolve});client.start({});});
 assert.equal(result.code,'candidate-timeout');assert.ok(heartbeats>0);assert.ok(performance.now()-began<4000,'deadline plus host scheduling tolerance');await native.terminate();
});
test('online-only recovery also obeys budget and leaves no paused residual queue',async()=>{
 let now=0;const {sim}=engine({checkpoint(){now=101;}},{now:()=>now});sim.offline.appendCatchUpTask(1,1,{source:'online',sealed:true,randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);assert.equal(sim.offline.getPendingCatchUpSeconds(),0);assert.equal(sim.offline.isCatchUpPaused(),false);assert.equal(sim.getState().core.runtime.timeLedger.discardedClock,1);
});
const _deadlineW={Simulation:{}},_deadlineBox={window:{WIS:_deadlineW},performance:{now:()=>0},document:{hidden:false},setInterval(){},clearInterval(){},Date};
vm.runInNewContext(fs.readFileSync('js/simulation/worker-client.js','utf8'),_deadlineBox);
test('late checkpoint cannot outrun watchdog timer and install after candidate deadline',()=>{let now=0,worker,installed=0,failed=null;const c=_deadlineW.Simulation.WorkerClient.create({clock:()=>now,hidden:()=>false,schedule:false,candidateTimeoutMs:2000,maxRetries:0,factory:()=>worker={postMessage(m){this.start=m;},terminate(){}},commit(){installed++;return{progressed:true};},onFailure(e){failed=e.code;}});c.start({});now=1750;c.checkHealth();now=2100;const m=worker.start;worker.onmessage({data:{...m,type:'checkpoint',sequence:1,baseStateVersion:0,payload:{}}});assert.equal(installed,0);assert.equal(failed,'candidate-timeout');});
