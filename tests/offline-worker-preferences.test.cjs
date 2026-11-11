'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function fixture(){
 const {W,context,root}=require('./helpers/production-numeric-runtime.cjs').loadProductionNumericRuntime();
 for(const f of ['worker-client.js','offline-worker.js'])vm.runInContext(fs.readFileSync(path.join(root,'js/simulation',f),'utf8'),context,{filename:f});
 let captured;const Offline=W.Simulation.Offline;W.Simulation.Offline={...Offline,create(c){captured=c;return Offline.create(c);}};
 const host=W.Simulation.OfflineHeadless.create({domain:W.Core.State.fresh()},{checkpoint(){},yield:()=>Promise.resolve()});W.Simulation.Offline=Offline;
 const workers=[],values=new Map();let fault=false;
 context.localStorage={getItem:k=>values.get(k)??null,setItem(k,v){if(fault)throw Error('quota');values.set(k,String(v));},removeItem:k=>values.delete(k)};
 const controller=W.Simulation.OfflineWorker.create({...captured,workerFactory(){const worker={sent:[],postMessage(m){this.sent.push(m);},terminate(){this.terminated=true;},emit(m){this.onmessage({data:m});}};workers.push(worker);return worker;},workerSchedule:false,checkpoint(){W.Core.Save.write(host.getState(),{offlineRecoveryOverride:controller.getPersistenceSnapshot()});},installWorkerSnapshot:captured.restoreState});
 W.Core.Save.bindOfflineRecovery(()=>controller.getPersistenceSnapshot());controller.appendCatchUpTask(10,10,{source:'offline',randomMode:'state'});void controller.simulateOfflineProgress(0,0);
 function publish(worker=workers.at(-1),joules=123){const start=worker.sent[0],packet=W.Simulation.WorkerProtocol.decode(start.payload);packet.snapshot.domain.core.resources.joules=W.Core.BigNum.BN(joules);packet.recovery.tasks=packet.recovery.tasks.map(t=>({...t,gameSeconds:9,clockSeconds:9,clockCursor:1}));packet.status={...packet.status,pendingGameSeconds:9,pendingClockSeconds:9,phase:'running'};packet.saveText=JSON.stringify(W.Core.Save.envelope(W.Core.State.cloneForSimulation(packet.snapshot.domain),false,{offlineRecoveryOverride:packet.recovery}));worker.emit({type:'checkpoint',jobId:start.jobId,generation:start.generation,sequence:1,baseStateVersion:0,payload:W.Simulation.WorkerProtocol.encode(packet)});return packet;}
 return {W,host,controller,workers,publish,fault(v){fault=v;},saved:()=>W.Core.Save.prepare(JSON.parse(values.get(W.Core.Config.saveKey)))};
}
test('Worker preference merge changes only permitted presentation fields and keeps confirmed debt/RNG durable',()=>{
 const f=fixture(),{W,host,controller}=f;try{const rng=host.getState().core.runtime.randomState;host.getState().theme='dark';host.getState().autoCloseOfflineDialogEnabled=false;const packet=f.publish(),read=f.saved();
 assert.equal(host.getState().theme,'dark');assert.equal(host.getState().autoCloseOfflineDialogEnabled,false);assert.equal(read.state.theme,'dark');assert.equal(read.state.autoCloseOfflineDialogEnabled,false);
 assert.equal(String(host.getState().joules),'123');assert.equal(String(read.state.joules),'123');assert.equal(host.getState().core.runtime.randomState,rng);assert.equal(read.state.core.runtime.randomState,rng);assert.equal(controller.getPendingCatchUpSeconds(),9);assert.equal(read.offlineRecovery.tasks[0].gameSeconds,9);
 const actual=JSON.parse(JSON.stringify(W.Core.State.toSerializable(host.getState()))),expected=JSON.parse(JSON.stringify(W.Core.State.toSerializable(packet.snapshot.domain)));expected.core.preferences.theme='dark';expected.core.preferences.autoCloseOfflineDialogEnabled=false;assert.deepEqual(actual,expected,'no gameplay fields may change during preference merge');
 }finally{controller.cancelCatchUp();}
});
test('failed merged checkpoint preserves live preferences/assets/debt and retry keeps them',()=>{
 const f=fixture(),{W,host,controller}=f;try{host.getState().theme='dark';host.getState().autoCloseOfflineDialogEnabled=false;W.Core.Save.write(host.getState(),{offlineRecoveryOverride:controller.getPersistenceSnapshot()});const before=JSON.stringify(W.Core.State.toSerializable(host.getState()));f.fault(true);f.publish();
 assert.equal(controller.isCatchUpPaused(),true);assert.equal(controller.getPendingCatchUpSeconds(),10);assert.equal(JSON.stringify(W.Core.State.toSerializable(host.getState())),before);assert.equal(f.saved().state.theme,'dark');assert.equal(f.saved().offlineRecovery.tasks[0].gameSeconds,10);assert(!f.workers[0].sent.some(m=>m.type==='ack'));
 f.fault(false);void controller.retryCatchUp();f.publish();assert.equal(controller.getPendingCatchUpSeconds(),9);assert.equal(String(host.getState().joules),'123');assert.equal(host.getState().theme,'dark');assert.equal(f.saved().state.theme,'dark');assert.equal(f.saved().state.autoCloseOfflineDialogEnabled,false);controller.pauseCatchUpByPlayer();assert.equal(f.saved().offlineRecovery.tasks[0].gameSeconds,9);assert.equal(f.saved().state.theme,'dark');
 }finally{f.fault(false);controller.cancelCatchUp();}
});
