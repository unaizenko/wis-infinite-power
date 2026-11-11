'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setupFuture}=require('./rank-schema-fixture.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
function setup(reference=false){return setupFuture({targetSchema:76,transformSource(file,source){if(file==='js/core/save.js'&&reference){source=source.replace('persistenceDefaults ||= S.fresh();','persistenceDefaults ||= S.toSerializable(S.fresh());').replace('const data={core:state.core,powerSystem:state.powerSystem,cultivation:state.cultivation,meta:state.meta};','const data=S.toSerializable(state);');}return source;}});}
for(const id of ['high-training','live-training','ring-training','qi-offline'])test('sparse private snapshot encoding and roundtrip match original: '+id,()=>{
 const outputs=[];for(const reference of [true,false]){const {W}=setup(reference),loaded=W.Core.Save.prepare(readFixture(id)),state=loaded.state,before=JSON.stringify(W.Core.State.toSerializable(state));const envelope=W.Core.Save.envelope(state,false,{offlineRecoveryOverride:loaded.offlineRecovery}),text=JSON.stringify(envelope);assert.equal(JSON.stringify(W.Core.State.toSerializable(state)),before);const again=W.Core.Save.prepare(JSON.parse(text)).state;assert.equal(JSON.stringify(W.Core.State.toSerializable(again)),before);outputs.push(text);}assert.equal(outputs[0],outputs[1]);
});
test('encoding does not clone the already-private domain a second time',()=>{const {W}=setup(),state=W.Core.Save.prepare(readFixture('high-training')).state;W.Core.Save.envelope(state,false);const S=W.Core.State;let copies=0;W.Core.State={...S,toSerializable(...args){copies++;return S.toSerializable(...args);}};W.Core.Save.envelope(state,false);assert.equal(copies,0,'private snapshot copied again in sparse encoding');});

test('extended records and exact numerical encodings retain original wire representation',()=>{
 const outputs=[];
 for(const reference of [true,false]){
  const {W}=setup(reference),S=W.Core.State,state=S.fresh(),B=W.Core.BigNum;
  state.core.runtime.lastUpdateAt=1794402000000;state.core.runtime.randomState=12345;
  state.meta.extension={small:B.BN('1e-50'),high:B.BN('ee100'),signed:[{n:'-13',d:'17'}],batch:W.Core.ClosedFormBatch.create({funding:'100000.00000000003',acc:'0.3333333333333333'}),unknown:{nested:['kept',null,17]}};
  const before=JSON.stringify(S.toSerializable(state)),wire=JSON.stringify(W.Core.Save.envelope(state,false));
  assert.equal(JSON.stringify(S.toSerializable(state)),before);outputs.push(wire);
 }
 assert.equal(outputs[0],outputs[1]);
});
