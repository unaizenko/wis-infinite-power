'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
const {readFixture}=require('./helpers/current-fixtures.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
for(const id of ['qi-offline','ring-training','live-training','high-training','exploration-compaction'])test('retained real '+id+' earns frozen income and preserves results after save reload',async()=>{
 const {W}=loadProductionNumericRuntime(),S=W.Core.State,B=W.Core.BigNum,raw=readFixture(id),start=W.Core.Save.prepare(raw).state;
 const sim=W.Simulation.OfflineHeadless.create({domain:start},{checkpoint:()=>true,yield:()=>Promise.resolve()});
 const before=S.cloneForSimulation(sim.getState()),reference=S.cloneForSimulation(before),seconds=60;
 W.Core.Runtime.withMathPolicy(W.Core.Runtime.MathPolicy.OFFLINE_APPROX,()=>W.Core.Runtime.withState(reference,()=>W.Core.Runtime.withOfflineExecution(()=>{
  const profile=W.Simulation.FixedSources.query(reference);
  const expected=W.Simulation.FixedSegment.prepare(reference,seconds,{sourceProfile:profile,offline:true,frozenOffline:true});
  W.Simulation.FixedSegment.commit(reference,expected);
 })));
 sim.offline.appendCatchUpTask(seconds,seconds,{source:'offline',randomMode:'state'});
 await sim.offline.simulateOfflineProgress(0,0);
 const after=sim.getState(),status=sim.offline.getCatchUpStatus();
 assert.equal(status.pendingGameSeconds,0);assert.equal(status.phase,'completed');
 for(const section of ['resources'])assert.deepEqual(plain(S.toSerializable(after).core[section]),plain(S.toSerializable(reference).core[section]),id+' resource result');
 assert.deepEqual(plain(after.meta.treasures),plain(reference.meta.treasures),id+' treasure inventory');
 assert.deepEqual(plain(after.meta.treasureBatch),plain(reference.meta.treasureBatch),id+' retained treasure funding/carry');
 assert.deepEqual(plain(after.meta.bigNumbers),plain(reference.meta.bigNumbers),id+' G/TREE progress');
 assert.equal(after.core.runtime.randomState,before.core.runtime.randomState,'frozen deterministic rewards preserve RNG');
 assert(Math.abs(after.totalElapsedSeconds-before.totalElapsedSeconds-seconds)<1e-7,'full offline clock');
 assert.equal(after.core.runtime.timeLedger.discardedClock||0,(before.core.runtime.timeLedger.discardedClock||0)+(before.core.runtime.timeLedger.pendingDiscard?.clock||0),'only the already registered online discard is confirmed; offline time never discarded');
 assert(B.gt(after.joules,before.joules)||B.gt(after.power,before.power),'real positive resource income');
 const wire=plain(W.Core.Save.envelope(after,false,{offlineRecoveryOverride:sim.offline.getPersistenceSnapshot()}));
 assert.deepEqual(plain(S.toSerializable(W.Core.Save.prepare(wire).state)),plain(S.toSerializable(after)),'whole-domain save roundtrip');
});
