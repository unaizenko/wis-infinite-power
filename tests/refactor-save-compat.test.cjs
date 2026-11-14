'use strict';
const fs=require('node:fs'),test=require('node:test'),assert=require('node:assert/strict');
const {setupFuture}=require('./rank-schema-fixture.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
for(const id of ['schema72','qi-offline','ring-training','live-training','high-training'])test('old save remains immutable and whole domain survives current save roundtrip: '+id,()=>{
 const {W}=setupFuture({targetSchema:76}),raw=id==='schema72'?JSON.parse(fs.readFileSync('tests/fixtures/breathing-stall-player.json','utf8')):readFixture(id),original=JSON.stringify(raw);
 const prepared=W.Core.Save.prepare(raw),state=prepared.state,S=W.Core.State,A=W.Core.Amount,Q=W.Core.Resources;
 assert.equal(JSON.stringify(raw),original,'migration changed original');assert(A.compare(Q.readExact('core.joules',state),0)>0);assert(A.compare(Q.readExact('core.power',state),0)>=0);for(const key of ['joules','power']){const old=raw.data.core.resources;assert.equal(A.compare(Q.readExact('core.'+key,state),A.fromParts(old[key],old[key+'GainResidualTail']||[])),0,'original complete '+key+' changed');}
 const before=plain(S.toSerializable(state)),envelope=plain(W.Core.Save.envelope(state,true,{offlineRecoveryOverride:prepared.offlineRecovery||null})),loaded=W.Core.Save.prepare(envelope);
 assert.equal(envelope.schemaVersion,76);assert.equal(envelope.numericModelVersion,2);assert.equal(envelope.numericTailPolicyVersion,3);
 assert.deepEqual(plain(S.toSerializable(loaded.state)),before,'resources, treasures, TREE, RNG, challenge clocks or ledger changed on roundtrip');
 if(prepared.offlineRecovery)assert.deepEqual(plain(loaded.offlineRecovery),plain(prepared.offlineRecovery),'offline remainder changed');
 assert.equal(JSON.stringify(raw),original);
});
