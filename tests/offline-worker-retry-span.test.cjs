'use strict';
// Rule2 retries restart the confirmed frozen candidate; obsolete 30/3s planner caps must not return.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.WIS_GAME_ROOT||path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'js/simulation/offline-worker-entry.js'),'utf8');
for(const retries of [0,1,2]){
 let host=null;
 const W={Core:{Build:{buildId:'test'},Config:{}},Simulation:{WorkerProtocol:{decode:x=>x},OfflineHeadless:{create(initial,h){host=h;throw Error('stop after host capture');}}}},self={WIS:W,postMessage(){}};
 vm.runInNewContext(source,{self,setInterval(){},setTimeout,Date,console});self.onmessage({data:{type:'start',protocol:1,build:'test',retries,payload:{snapshot:{},recovery:{tasks:[]}}}});
 assert(host,'entry starts without the legacy offlineHierarchy config at retry '+retries);
 assert.equal(Object.hasOwn(host,'maxOfflineSegmentSeconds'),false);
 assert.equal(typeof host.checkpoint,'function');assert.equal(typeof host.yield,'function');
}
console.log('PASS initial/retried Worker uses frozen host without legacy planner span options');
const boot={window:{WIS:{Simulation:{}}}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/simulation/offline-worker-bundle.js'),'utf8'),boot);
const c={console,performance,setTimeout,clearTimeout,setInterval:(...a)=>setInterval(...a).unref(),clearInterval,postMessage(){}};c.self=c;vm.createContext(c);vm.runInContext('self.window=self;self.document=Object.freeze({hidden:false});',c);
for(const file of boot.window.WIS.Simulation.OfflineWorkerBundle.scripts)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
const W=c.WIS,Q=W.Simulation.CheckpointStrategy;let calls=0;
W.Simulation.CheckpointStrategy={...Q,plan(){calls++;throw Error('rule2 must not enter the old planner');}};
(async()=>{
 const sim=W.Simulation.OfflineHeadless.create({domain:W.Core.State.fresh()},{checkpoint(){},yield:()=>Promise.resolve()});
 sim.offline.appendCatchUpTask(600,600,{source:'offline',randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);
 const result=sim.offline.getCatchUpStatus();assert.equal(result.phase,'completed');assert.equal(result.pendingGameSeconds,0);assert.equal(result.segmentBudget.committedSegments,1);assert.equal(result.segmentBudget.lastExecutorKind,'frozen-offline');assert.equal(calls,0);assert.equal(sim.getState().totalElapsedSeconds,600);
 console.log('PASS actual headless recovery commits one complete frozen interval without old planner');
})().catch(e=>{console.error(e);process.exitCode=1;});
