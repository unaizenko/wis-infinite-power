'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
test('Save preserves closed-batch binary coordinates after private load normalization',()=>{
 const {W}=loadProductionNumericRuntime(),S=W.Core.State,B=W.Core.BigNum;
 for(const value of [-3.420007332888275e-15,3.0808688933348094e-15,1.9782352839170514e-15]){
  let state=W.Core.Save.prepare(readFixture('exploration-compaction')).state;
  // Exercise the real private load-copy boundary before persistence.
  const scope=S.createLoadNormalizationScope(),record=W.Core.ClosedFormBatch.create({...state.meta.bigNumbers.gBatch,acc:value});try{state.meta.bigNumbers.gBatch=scope.seal(record);}finally{scope.close();}
  const original=state.meta.bigNumbers.gBatch.acc,random=state.core.runtime.randomState,funding=String(state.meta.bigNumbers.gBatch.funding);
  assert.equal(Object.hasOwn(original,'toJSON'),true);
  for(let pass=0;pass<3;pass++){
   const wire=JSON.parse(JSON.stringify(W.Core.Save.envelope(state,false,{offlineRecoveryOverride:null}))),loaded=W.Core.Save.prepare(wire).state;
   assert.equal(loaded.meta.bigNumbers.gBatch.acc.mag,Math.abs(value));assert.equal(loaded.meta.bigNumbers.gBatch.acc.sign,Math.sign(value));assert.equal(loaded.meta.bigNumbers.gBatch.acc.layer,0);
   assert.equal(loaded.core.runtime.randomState,random);assert.equal(String(loaded.meta.bigNumbers.gBatch.funding),funding);state=loaded;
  }
  assert.equal(original.mag,Math.abs(value));assert.equal(Object.hasOwn(original,'toJSON'),true,'saving must not alter the input Decimal');
 }
});

test('load normalization sealing preserves closed-record JSON without freezing its source',()=>{
 const {W}=loadProductionNumericRuntime(),record=W.Core.ClosedFormBatch.create({acc:-3.420007332888275e-15}),scope=W.Core.State.createLoadNormalizationScope();
 try{const sealed=scope.seal(record);assert.notEqual(sealed.acc,record.acc);assert.equal(sealed.acc.mag,record.acc.mag);assert.equal(JSON.stringify(sealed),JSON.stringify(record));assert(Object.isFrozen(sealed.acc));assert.equal(Object.isFrozen(record.acc),false);}finally{scope.close();}
});
