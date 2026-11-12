'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){let now=0,hidden=false,error=null,worker;const W={Simulation:{}};vm.runInNewContext(fs.readFileSync('js/simulation/worker-client.js','utf8'),{window:{WIS:W},Date,performance,setInterval,clearInterval,document:{hidden:false}});const client=W.Simulation.WorkerClient.create({clock:()=>now,hidden:()=>hidden,schedule:false,maxRetries:0,progressTimeoutMs:Infinity,calculationTimeoutMs:60000,factory:()=>worker={postMessage(m){this.start=m;},terminate(){this.stopped=true;}},onFailure:e=>error=e});client.start({build:'test'});return{client,get error(){return error;},tick(progress,seconds=1){now+=seconds*1000;worker.onmessage({data:{...worker.start,type:'heartbeat',calculation:progress}});client.checkHealth();},hide(v){hidden=v;}};}
test('heartbeat without computation progress pauses instead of running forever',()=>{const h=setup();for(let n=0;n<62;n++)h.tick({taskId:'a',phase:'gains',revision:1});assert.equal(h.error?.code,'offline-stalled');assert.equal(h.client.status().running,false);});
test('healthy computation can run for minutes without committing a result',()=>{const h=setup();for(let n=0;n<180;n++)h.tick({taskId:'a',phase:'gains',revision:n});assert.equal(h.error,null);assert(h.client.status().running);h.client.cancel();});
test('hidden time is not charged to calculation stagnation',()=>{const h=setup();h.hide(true);for(let n=0;n<180;n++)h.tick({taskId:'a',phase:'gains',revision:1});h.hide(false);for(let n=0;n<30;n++)h.tick({taskId:'a',phase:'gains',revision:1});assert.equal(h.error,null);h.client.cancel();});
test('malformed and backwards progress cannot keep stalled computation alive',()=>{const h=setup();h.tick({taskId:'a',phase:'gains',revision:100});for(let n=0;n<62;n++)h.tick(n%2?{taskId:'a',phase:'gains',revision:99}:{taskId:'a',phase:'gains',revision:NaN});assert.equal(h.error?.code,'offline-stalled');});

test('real frozen candidate reports monotone calculation progress across small slices',()=>{
 const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs'),{W}=loadProductionNumericRuntime();
 const s=W.Core.Save.prepare(readFixture('exploration-compaction')).state;W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});
 const before=JSON.stringify(W.Core.State.toSerializable(s)),work=W.Simulation.FixedSegment.createWork(s,60,{frozenOffline:true,offline:true});let previous=0,advances=0,done=false;
 for(let i=0;i<20000&&!done;i++){done=work.advance(performance.now()+0.05).done;const p=work.progress();assert(p.revision>=previous);if(p.revision>previous)advances++;previous=p.revision;assert.equal(typeof p.phase,'string');}
 assert(done);assert(advances>2);assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);work.close();
});
