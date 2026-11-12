'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
test('reported exploration total compacts to a certified final representation',()=>{
const {W}=loadProductionNumericRuntime(),A=W.Core.Amount,P=W.Core.AmountProducts,s=W.Core.Save.prepare(readFixture('exploration-compaction')).state;
const original=A.add(A.field(s.meta.statistics,'explorationTotal'),A.fromParts('7.0874367836587e263255',['1e12345','1e23456','1e34567']));
const before=JSON.stringify(A.serialize(original)),r=A.compact(original);
assert(r.compacted);assert(!P.needsCompaction(r.value.tail));assert(P.termCount(r.value.tail)<=P.tailPolicy.target);
assert(A.compare(r.value,original)<=0);assert(A.compare(A.subtract(original,r.value),r.lossUpper)<=0);
assert.equal(JSON.stringify(A.serialize(original)),before);assert.equal(A.compare(A.read(A.serialize(r.value)),r.value),0);
});
test('reported save resumes real frozen income with progress and debt preserved on reload',async()=>{
const {W}=loadProductionNumericRuntime(),S=W.Core.State,B=W.Core.BigNum,s=W.Core.Save.prepare(readFixture('exploration-compaction')).state;
const sim=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint:()=>true,yield:()=>Promise.resolve()});const before=S.cloneForSimulation(sim.getState());
sim.offline.appendCatchUpTask(60,60,{source:'offline',randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);
const status=sim.offline.getCatchUpStatus();assert.equal(status.phase,'completed',JSON.stringify(status.pauseReason));assert.equal(status.pendingGameSeconds,0);
assert(B.gt(sim.getState().joules,before.joules));assert.equal(sim.getState().core.runtime.randomState,before.core.runtime.randomState);
const wire=JSON.parse(JSON.stringify(W.Core.Save.envelope(sim.getState(),false,{offlineRecoveryOverride:sim.offline.getPersistenceSnapshot()})));
assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(W.Core.Save.prepare(wire).state))),JSON.parse(JSON.stringify(S.toSerializable(sim.getState()))));
});

test('repeated settlement and reload matches uncompressed reference except certified cumulative tail',async()=>{
 let reference;for(const bypass of [true,false]){
  const {W,context}=loadProductionNumericRuntime();require('node:vm').runInContext('Date.now=()=>1800000000000',context);const A=W.Core.Amount,S=W.Core.State;
  if(bypass)W.Core.Amount={...A,compact:value=>({value:A.from(value),lossUpper:A.from(0),compacted:false})};
  let s=W.Core.Save.prepare(readFixture('exploration-compaction')).state;
  for(const seconds of [0.1,1,60,3600]){
   const sim=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint:()=>true,yield:()=>Promise.resolve()});
   sim.offline.appendCatchUpTask(seconds,seconds,{source:'offline',randomMode:'state'});await sim.offline.simulateOfflineProgress(0,0);const status=sim.offline.getCatchUpStatus();assert.equal(status.phase,'completed',JSON.stringify(status.pauseReason));
   const raw=JSON.parse(JSON.stringify(W.Core.Save.envelope(sim.getState(),false,{offlineRecoveryOverride:sim.offline.getPersistenceSnapshot()})));s=W.Core.Save.prepare(raw).state;
  }
  const actual=JSON.parse(JSON.stringify(S.toSerializable(s)));
  if(bypass){reference=actual;continue;}
  const expectedTotal=A.fromParts(reference.meta.statistics.explorationTotal,reference.meta.statistics.explorationTotalResidual),actualTotal=A.fromParts(actual.meta.statistics.explorationTotal,actual.meta.statistics.explorationTotalResidual);
  assert(A.compare(actualTotal,expectedTotal)<=0);assert(A.compare(A.subtract(expectedTotal,actualTotal),A.scale(expectedTotal,'1e-30'))<=0);
  actual.meta.statistics.explorationTotalResidual=reference.meta.statistics.explorationTotalResidual;
  assert.deepEqual(actual,reference,'all resources/rewards/TREE/challenge clocks/RNG must match the uncompressed reference');
 }
});
