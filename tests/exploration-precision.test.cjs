'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{setup75}=require('./amount-fixture.cjs');


test('a repeated scalar trial with an unchanged finite tail estimate preserves the uncompressed endpoint',()=>{
 const {W}=setup75({targetSchema:76}),{Amount:A,Integration:I,Runtime:R,Penalties:P,State:S}=W.Core;
 const state=S.fresh();
 W.Core.Effects.register('test-googol-penalty',()=>[{id:'test-googol-strength',target:'googolPenalty',layer:'strengthMultiplier',group:'test',value:0.8075}]);
 const mana=A.fromParts('3.260775677241196e27957911330',['13067710162689705e27957856461']);
 const raw=A.from('8.29585951905454e30303743435');
 const solve=autonomous=>R.withEvaluationState(state,()=>{
  const work=I.createAmountWork({amount:mana},.175,({amount})=>({amount:P.applyGoogolPenalty('mana',amount,raw,state)}),
   {logTolerance:1e-6,autonomous,cycleContextCurrent:()=>R.isEvaluating()&&R.getState()===state});
  try{
   let result,slices=0;
   do{result=work.advance({maximumOperations:512});assert(++slices<1024,JSON.stringify(result.diagnostics));}while(!result.done&&result.status==='pending');
   return result;
  }finally{work.cancel();}
 });
 const reference=solve(false),compressed=solve(true);
 assert(reference.done&&compressed.done);
 assert(compressed.diagnostics.cycleFastForwardLogicalCycles>0);
 assert(compressed.diagnostics.actualEvaluations<reference.diagnostics.actualEvaluations);
 for(const key of ['logicalAccepted','logicalRejected','logicalEvaluations','arc','diagnosis'])assert.equal(compressed.diagnostics[key],reference.diagnostics[key]);
 assert.deepEqual(compressed.remainingQuantity,reference.remainingQuantity);
 for(const key of ['gains','final'])assert.deepEqual(A.serialize(compressed.quantities[key].amount),A.serialize(reference.quantities[key].amount));
});

test('consecutive high-mana explorations finish within the cooperative work budget',()=>{
 const {W}=setup75({targetSchema:76});
 const {Amount:A,Resources:Q,Runtime:R,Save,State:S}=W.Core,I=W.Cultivation.ImmortalLogic;
 const initial=Save.prepare(require('./helpers/current-fixtures.cjs').readFixture('exploration-compaction')).state;
 const host=W.Simulation.OfflineHeadless.create({domain:initial},{checkpoint(){},yield:()=>Promise.resolve()});
 R.setState(host.getState());
 for(let i=1;i<=3;i++){
  const state=R.getState(),before=JSON.stringify(S.toSerializable(state));
  const power=Q.readExact('core.power',state),mana=Q.readExact('cultivation.immortal.mana',state);
  const work=I.createExplorationActionWork(state);
  try{
   let slices=0;
   while(!work.advance(Infinity,{maximumOperations:1024}).done)assert(++slices<128,'exploration '+i+' exhausted the cooperative work budget');
   assert.equal(JSON.stringify(S.toSerializable(R.getState())),before);
   assert.notEqual(work.commit(),false);
   const next=R.getState();
   assert.equal(A.compare(Q.readExact('core.power',next),A.scale(power,.9)),0);
   assert(A.compare(Q.readExact('cultivation.immortal.mana',next),mana)>0);
   const reloaded=Save.prepare(JSON.parse(JSON.stringify(Save.envelope(next,false,{offlineRecoveryOverride:null})))).state;
   for(const key of ['core.power','cultivation.immortal.mana'])assert.equal(A.compare(Q.readExact(key,reloaded),Q.readExact(key,next)),0);
  }finally{work.cancel();}
 }
});
