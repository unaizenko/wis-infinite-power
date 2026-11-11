'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
const raw=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/breathing-fraction-capacity-20261111.json'),'utf8'));
function finish(work){for(let n=0;n<20000;n++)if(work.advance(performance.now()+3,{maximumOperations:32,maximumEvaluations:8}).done)return;throw Error('action did not finish');}
test('single oversized fractional tail uses the authorized directed32-place certificate',()=>{
 const {W}=loadProductionNumericRuntime(),A=W.Core.Amount,p=raw().data.cultivation.systems.immortal.resources;
 const original=A.fromParts(p.mana,p.manaGainResidualTail),before=JSON.stringify(A.serialize(original)),result=A.compact(original);
 assert(result.compacted,'one long fraction bypassed owner compaction');assert(A.compare(result.value,original)<=0);assert(A.compare(A.add(result.value,result.lossUpper),original)>=0);
 assert(A.compare(result.lossUpper,'1e-30')<0,'local tail certificate too coarse');assert.equal(JSON.stringify(A.serialize(original)),before);
 assert.equal(A.compact(result.value).compacted,false,'compaction must stabilize');assert.equal(A.compare(A.read(A.serialize(result.value)),result.value),0);
});
test('retained failed breathing save loads, commits and survives policy2 roundtrip',()=>{
 const {W}=loadProductionNumericRuntime(),S=W.Core.State,R=W.Core.Runtime;const h=W.Simulation.OfflineHeadless.create({domain:W.Core.Save.prepare(raw()).state},{checkpoint(){},yield:()=>Promise.resolve()});
 const s=h.getState(),mana=W.Core.Resources.readExact('cultivation.immortal.mana',s),work=W.Cultivation.ImmortalLogic.createBreathingActionWork(s);
 try{finish(work);work.commit();}finally{work.cancel();}
 assert.equal(String(R.getState().joules),'0');assert(W.Core.Amount.compare(W.Core.Resources.readExact('cultivation.immortal.mana',R.getState()),mana)>0);
 S.updateLifetimeStatistics(R.getState(),W.Cultivation.ImmortalLogic.cultivationRealmLevel());
 const save=W.Core.Save.envelope(R.getState());assert.equal(save.numericTailPolicyVersion,2);const loaded=W.Core.Save.prepare(save).state;
 assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(loaded))),JSON.parse(JSON.stringify(S.toSerializable(R.getState()))));
 const future={...save,numericTailPolicyVersion:3};assert.throws(()=>W.Core.Save.prepare(future));
});

test('repeated breathing/spending keeps coefficient complexity bounded across reloads',()=>{
 const {W}=loadProductionNumericRuntime(),A=W.Core.Amount,P=W.Core.AmountProducts,S=W.Core.State,R=W.Core.Runtime,Q=W.Core.Resources,I=W.Cultivation.ImmortalLogic;
 let h=W.Simulation.OfflineHeadless.create({domain:W.Core.Save.prepare(raw()).state},{checkpoint(){},yield:()=>Promise.resolve()}),compactions=0;
 W.Core.AmountProducts={...P,compact(...args){const result=P.compact(...args);if(result.compacted)compactions++;return result;}};
 for(let i=0;i<300;i++){
  Q.replaceExact('core.joules',i%2?31840:1000000,R.getState());const before=Q.readExact('cultivation.immortal.mana',R.getState()),clock=R.getState().totalElapsedSeconds,rng=R.getState().core.runtime.randomState;
  const work=I.createBreathingActionWork(R.getState());try{finish(work);work.commit();}finally{work.cancel();}
  assert(A.compare(Q.readExact('cultivation.immortal.mana',R.getState()),before)>0,'income vanished at '+i);assert.equal(String(R.getState().joules),'0');
  assert.equal(R.getState().totalElapsedSeconds,clock);assert.equal(R.getState().core.runtime.randomState,rng);
  if(A.compare(Q.readExact('cultivation.immortal.mana',R.getState()),100)>=0)Q.debitExact('cultivation.immortal.mana',80,R.getState());
  const amount=Q.readExact('cultivation.immortal.mana',R.getState());assert(!P.needsCompaction(amount.tail),'unbounded stored coefficient at '+i);
  if(i%25===0){S.updateLifetimeStatistics(R.getState(),I.cultivationRealmLevel());const expected=JSON.stringify(S.toSerializable(R.getState())),save=W.Core.Save.envelope(R.getState()),loaded=W.Core.Save.prepare(JSON.parse(JSON.stringify(save))).state;assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(loaded))),JSON.parse(expected));h=W.Simulation.OfflineHeadless.create({domain:loaded},{checkpoint(){},yield:()=>Promise.resolve()});}
 }
 assert(compactions>=3,'long test did not exercise repeated compression');
});
test('exact paid quantities stay exact while positive/negative complex tails get directed bounds',()=>{
 const {W}=loadProductionNumericRuntime(),A=W.Core.Amount,den='7'.repeat(600),ratio='@ratio:1:'+JSON.stringify({terms:['1e-100'],denominator:den});
 for(const sign of ['', '-']){const value=A.fromParts(1,[sign+ratio]),original=JSON.stringify(A.serialize(value)),paid=A.fieldParts(value,'pricePaid'),c=A.compact(value);assert(c.compacted);assert(A.compare(c.value,value)<=0);assert(A.compare(A.add(c.value,c.lossUpper),value)>=0);assert.equal(JSON.stringify(A.serialize(A.field(paid,'pricePaid'))),original);assert.equal(JSON.stringify(A.serialize(value)),original);}
 const tiny=A.fromParts(0,[ratio]),c=A.compact(tiny);assert(c.compacted);assert(A.compare(c.value,0)>0,'small positive income was zeroed');assert(A.compare(c.value,tiny)<=0);assert(A.compare(A.add(c.value,c.lossUpper),tiny)>=0);
});
