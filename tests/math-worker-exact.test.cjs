'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {setupFuture}=require('./rank-schema-fixture.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
const root=path.resolve(__dirname,'..');
function meta(){const c={window:{WIS:{Simulation:{}}}};for(const file of ['offline-worker-bundle','math-worker-bundle'])vm.runInNewContext(fs.readFileSync(path.join(root,'js/simulation/'+file+'.js'),'utf8'),c);return c.window.WIS.Simulation.MathWorkerBundle;}
function setup(id,remote=false){const f=setupFuture({targetSchema:76,...(remote?{scripts:meta().scripts}:{})});const {W,context}=f;
 if(!remote)for(const file of ['js/ui/source-preview.js','js/simulation/pure-math-work.js','js/simulation/math-worker.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 if(remote){const pure=W.Simulation.PureMathWork;W.Simulation.PureMathWork={create(kind,snapshot,...args){
  context.mathSnapshot=snapshot;context.mathBefore=W.Simulation.WorkerProtocol.encode(snapshot);
  const work=pure.create(kind,snapshot,...args);return {...work,result(){if(context.injectMutation)snapshot.core.runtime.lastUpdateAt++;return work.result();}};
 }};}
 const raw=readFixture(id),state=W.Core.Save.prepare(raw).state;W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);
 return {...f,state,raw,serial:()=>JSON.parse(JSON.stringify(W.Core.State.toSerializable(W.Core.Runtime.getState())))};
}
async function remoteResult(f,kind,snapshot,request={}){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{f.context.onmessage({data:{type:'cancel',requestId:1}});reject(Error('worker deadline'));},20000);f.context.postMessage=m=>{if(m.type==='progress')return;clearTimeout(timeout);if(m.type==='error')reject(Object.assign(Error(m.message),{code:m.code}));else {try{assert.equal(f.W.Simulation.WorkerProtocol.encode(f.context.mathSnapshot),f.context.mathBefore,'worker computation mutated private snapshot');resolve(m.payload);}catch(e){reject(e);}};};f.context.onmessage({data:{type:'compute',protocol:1,build:f.W.Core.Build.buildId,requestId:1,payload:f.W.Simulation.WorkerProtocol.encode({kind,snapshot:{domain:snapshot},request})}});});}
function finish(w){let n=0;while(!w.advance({maximumOperations:1024}).done)assert(++n<20000);return w.result();}
for(const id of ['high-training','live-training','ring-training','qi-offline'])test('worker training full result and save roundtrip: '+id,async()=>{
 const local=setup(id),remote=setup(id,true),a=local.W.Core.State.cloneForSimulation(local.state),b=local.serial();
 const localWork=local.W.Power.ScaleLogic.createTrainingActionWork(local.state,true);let n=0;while(!localWork.advance(Infinity,{maximumOperations:1024}).done)assert(++n<20000);localWork.commit();const expected=local.serial();
 const packet=await remoteResult(remote,'training-gain',remote.state);assert.deepEqual(JSON.parse(JSON.stringify(remote.W.Core.State.toSerializable(remote.state))),b,'pure worker mutated input');
 remote.W.Simulation.OfflineHeadless.create({domain:remote.state},{checkpoint(){},yield:()=>Promise.resolve()});remote.W.Core.Runtime.setState(remote.state);
 // Feed the real entry packet through the production client and main-thread commit.
 let worker;const factory=()=>worker={postMessage(){},terminate(){}};
 vm.runInContext(fs.readFileSync(path.join(root,'js/simulation/math-worker.js'),'utf8'),remote.context);
 const original=remote.W.Simulation.MathWorker.createWork;remote.W.Simulation.MathWorker={createWork:(k,s,r,o)=>original(k,s,r,{...o,factory})};
 const job=remote.W.Power.ScaleLogic.createTrainingActionWork(remote.W.Core.Runtime.getState(),true,{worker:true});assert(!job.advance(Infinity).done);
 worker.onmessage({data:{type:'result',protocol:1,build:remote.W.Core.Build.buildId,requestId:1,payload:packet}});assert(job.advance(Infinity).done);job.commit();
 assert.deepEqual(remote.serial(),expected,'main-thread atomic action differs');const saved=remote.W.Core.Save.prepare({...remote.raw,data:remote.serial()}).state;assert.deepEqual(JSON.parse(JSON.stringify(remote.W.Core.State.toSerializable(saved))),expected);
 job.cancel();localWork.cancel();
});
test('heavy previews retain exact records and marginal requirements',async()=>{
 for(const kind of ['source-preview','breathing-preview']){
  const a=setup('high-training'),b=setup('high-training',true),request={ids:['training'],options:{}},before=a.serial(),C=a.W.Core.CertifiedRankMath,R=a.W.Core.Runtime,I=a.W.Cultivation.ImmortalLogic;
  const effects=a.W.Core.Effects.createFrozenScope(a.state),scope=I.createManaPreviewScope(a.state);
  // Independent pre-migration evaluator, including the separate breathing detail stage.
  let expected;
  if(kind==='source-preview'){const w=C.createWork(()=>R.withState(a.state,()=>effects.run(()=>{const records=C.task('source-preview-records',function*(){return yield ()=>a.W.UI.SourcePreview.query(['training'],a.state,{});});const nextPowerJ=C.task('training-next-power-cost',function*(){return yield ()=>a.W.Power.ScaleLogic.joulesForNextBasePower();});return {records,nextPowerJ};})));expected=finish(w);w.cancel();}
  else{const d=C.createWork(()=>R.withState(a.state,()=>effects.run(()=>I.joulesForNextBaseMana())));const nextManaJ=finish(d);const w=C.createWork(()=>effects.run(()=>R.withEvaluationState(a.state,()=>{const value=C.task('action-preview-value',function*(){return yield ()=>scope.run(()=>({mana:I.breathingManaGainProgressive(),nextManaJ}));});const records=C.task('action-preview-records',function*(){return yield ()=>a.W.UI.SourcePreview.query(['breathing'],a.state,{actionFinals:{breathing:value.mana}});});return {value,records};})));expected=finish(w);w.cancel();d.cancel();}
  const encoded=a.W.Simulation.WorkerProtocol.encode(expected),packet=await remoteResult(b,kind,b.state,request);assert.equal(packet,encoded,kind+' exact component result mismatch');assert.deepEqual(a.serial(),before);assert.deepEqual(JSON.parse(JSON.stringify(b.W.Core.State.toSerializable(b.state))),before);effects.cancel();scope.cancel();
 }
});


test('worker purity guard detects mutation of actual cloned computation state',async()=>{
 const f=setup('ring-training',true);f.context.injectMutation=true;
 await assert.rejects(remoteResult(f,'training-gain',f.state),/worker computation mutated private snapshot/);
});
test('all named source previews and formula details keep the same exact components',async()=>{
 const a=setup('high-training'),b=setup('high-training',true),request={ids:Object.keys(a.W.UI.SourcePreview.names),options:{includeProcess:true}},before=a.serial();
 const effects=a.W.Core.Effects.createFrozenScope(a.state),work=a.W.Core.CertifiedRankMath.createWork(()=>a.W.Core.Runtime.withState(a.state,()=>effects.run(()=>({records:a.W.UI.SourcePreview.query(request.ids,a.state,request.options),nextPowerJ:a.W.Power.ScaleLogic.joulesForNextBasePower()}))));
 try{while(!work.advance({maximumOperations:65536}).done){}const expected=a.W.Simulation.WorkerProtocol.encode(work.result()),actual=await remoteResult(b,'source-preview',b.state,request);assert.equal(actual,expected);assert.deepEqual(a.serial(),before);}finally{work.cancel();effects.cancel();}
});
