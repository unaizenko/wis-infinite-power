'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setupFuture}=require('./rank-schema-fixture.cjs');
const {readFixture}=require('./helpers/current-fixtures.cjs');
function setup(id='high-training'){
 const {W}=setupFuture({targetSchema:76,transformSource(file,s){
  if(file==='js/power/scale-logic.js'){
   if(process.env.WIS_CONTINUATION_BASELINE)s=require('node:fs').readFileSync(process.env.WIS_CONTINUATION_BASELINE,'utf8');
   const text='div(neededActualGain,penaltyAt(evaluationAmount))';assert(s.includes(text));
   s=s.replaceAll(text,"(()=>{const value="+text+";WIS.__preparations=(WIS.__preparations||0)+1;return value;})()");
   const refine='logarithmicAmountInterpolation(amount,A.add(amount,estimate),.5)';assert(s.includes(refine));s=s.replaceAll(refine,"(()=>{const value="+refine+";WIS.__refinePreparations=(WIS.__refinePreparations||0)+1;return value;})()");
   const comparison='quantityInterpolate(A.from(b),A.from(s),shared<1?(strongest-shared)/(1-shared):0)';assert(s.includes(comparison));s=s.replace(comparison,"(()=>{const value="+comparison+";WIS.__comparisonPreparations=(WIS.__comparisonPreparations||0)+1;return value;})()");
  }return s;
 }}),raw=readFixture(id),state=W.Core.Save.prepare(raw).state;
 W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);
 return {W,raw,state,serial:()=>JSON.parse(JSON.stringify(W.Core.State.toSerializable(W.Core.Runtime.getState())))};
}
function finish(job,budget){let slices=0;while(!job.advance(Infinity,{maximumOperations:budget}).done)assert(++slices<20000,'work did not finish');return slices;}
test('cross-segment preparation is retained across small slices with identical full state',()=>{
 const runs=[];for(const budget of [65536,8]){const f=setup(),before=f.serial(),job=f.W.Power.ScaleLogic.createTrainingActionWork(f.state,true);
  try{const slices=finish(job,budget);assert.deepEqual(f.serial(),before,'pending proof changed live state');job.commit();const state=f.serial();assert.equal(String(f.W.Core.Runtime.getState().power),'1.7261370619147398e1207');const loaded=f.W.Core.Save.prepare({...f.raw,data:state}).state;assert.deepEqual(JSON.parse(JSON.stringify(f.W.Core.State.toSerializable(loaded))),state);runs.push({state,preparations:f.W.__preparations,refine:f.W.__refinePreparations,comparison:f.W.__comparisonPreparations,slices});}finally{job.cancel();}}
 assert(runs[1].slices>runs[0].slices*10);assert(runs[0].preparations>0);assert.deepEqual(runs[1].state,runs[0].state);assert.equal(runs[1].preparations,runs[0].preparations,'completed preparation was replayed on suspension');assert(runs[0].refine>0);assert(runs[0].comparison>0);assert.equal(runs[1].refine,runs[0].refine,'refine interpolation replayed');assert.equal(runs[1].comparison,runs[0].comparison,'inverse comparison preparation replayed');
});
test('cancel and replaced owner cannot publish retained preparation',()=>{
 for(const reason of ['cancel','replace']){const f=setup(),job=f.W.Power.ScaleLogic.createTrainingActionWork(f.state,true);let n=0;while(!f.W.__preparations){assert(!job.advance(Infinity,{maximumOperations:8}).done);assert(++n<5000);}const before=f.serial();
  if(reason==='cancel')job.cancel();else f.W.Core.Runtime.setState(f.W.Core.State.cloneForSimulation(f.state));
  assert.equal(job.valid(),false);if(reason==='replace')assert.throws(()=>job.advance(Infinity,{maximumOperations:8}));assert.throws(()=>job.commit());assert.deepEqual(f.serial(),before);job.cancel();}
});
module.exports={setup,finish};

function inverseProbe(reference=false){
 const {W}=setupFuture({targetSchema:76,transformSource(file,s){if(file!=='js/power/scale-logic.js')return s;
  s=s.replace('function infinitySoftcapInverse(actual, amount) {','WIS.__inverse=infinitySoftcapInverse;function infinitySoftcapInverse(actual, amount) {');
  s=s.replace('const quick=compare(gain,actual);','const quick=compare(gain,actual);WIS.__completedProbes=(WIS.__completedProbes||0)+1;');
  if(reference)s=s.replace('const narrowed=yield* narrowQuantityInverseBounds(lo,hi,amount,prepared,below);','const narrowed=null;');return s;
 }}),state=W.Core.State.fresh();state.meta.infinity.upgrades={'E3-2':true};W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);
 const scope=W.Core.Effects.createFrozenScope(state);try{const value=scope.run(()=>W.__inverse(W.Core.Amount.from('1e1000'),W.Core.Amount.from('1e5')));return {value:JSON.stringify(W.Core.Amount.serialize(value)),probes:W.__completedProbes};}finally{scope.cancel();}
}
test('well-conditioned high inverse validates a few-ULP bracket before broad search',()=>{
 const original=inverseProbe(true),current=inverseProbe();assert.equal(current.value,original.value);assert(current.probes<=12,`still used ${current.probes} forward probes for a local root`);
});

test('tight inverse bounds retain wide and full-search fallbacks at one operation',()=>{
 const {W}=setupFuture({targetSchema:76,transformSource(file,s){return file==='js/power/scale-logic.js'?s.replace('function* narrowQuantityInverseBounds(', 'WIS.__narrow=narrowQuantityInverseBounds;function* narrowQuantityInverseBounds('):s;}});
 const state=W.Core.State.fresh();W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);
 const B=W.Core.BigNum,A=W.Core.Amount,C=W.Core.CertifiedRankMath;
 for(const [root,want,callsExpected] of [[200,'tight',2],[200+1e-11,'wide',4],[300,'none',4]]){
  let calls=0;const below=x=>{calls++;return B.lt(x,root);},work=C.createWork(()=>C.task('narrow',()=>W.__narrow(B.BN(100),B.BN(400),A.from('1e5'),new Map([['baseExponent',B.BN(.5)]]),below)));
  try{let n=0;while(!work.advance({maximumOperations:1}).done)assert(++n<100);const bounds=work.result();assert.equal(calls,callsExpected);
   if(want==='none')assert.equal(bounds,null);else{assert(B.lt(bounds.lo,root));assert(B.gte(bounds.hi,root));if(want==='tight')assert(B.lt(B.sub(bounds.hi,bounds.lo),'1e-10'));else assert(B.gt(B.sub(bounds.hi,bounds.lo),'1e-10'));}
  }finally{work.cancel();}
 }
});

test('input mutation after proof completion rejects commit without changing resources',()=>{
 const f=setup(),job=f.W.Power.ScaleLogic.createTrainingActionWork(f.state,true);try{finish(job,256);f.state.runningLevel++;const changed=f.serial();assert.throws(()=>job.commit(),/输入改变/);assert.deepEqual(f.serial(),changed);}finally{job.cancel();}
});
