const assert=require('node:assert/strict'),path=require('node:path');process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');const {W}=require('./amount-fixture.cjs').setup75({targetSchema:76});const S=W.Core.State;
assert.equal(W.Core.Config.saveVersion,76);assert.equal(W.Core.Config.fixedSettlement.version,4);
let s=S.fresh();s.meta.infinity.runElapsed=42;const e=W.Core.Save.envelope(s);e.schemaVersion=75;e.settlementRule=3;const migrated=W.Core.Save.prepare(e).state;assert.equal(migrated.meta.infinity.runElapsed,42);assert.equal(migrated.meta.infinity.discardedRunElapsed,0);assert.equal(migrated.core.runtime.timeLedger.discardedClock,0);
s.core.runtime.timeLedger.pendingDiscard={clock:2,game:3,reason:'timeout'};s.meta.challenges.discardedElapsedSeconds=1;s.meta.infinity.discardedRunElapsed=4;const n=W.Core.Save.prepare(W.Core.Save.envelope(s)).state;assert.deepEqual(JSON.parse(JSON.stringify(n.core.runtime.timeLedger.pendingDiscard)),{clock:2,game:3,reason:'timeout'});assert.equal(n.meta.infinity.discardedRunElapsed,4);
const bad=W.Core.Save.envelope(s);bad.data.core.runtime.timeLedger.pendingDiscard.clock=-1;assert.throws(()=>W.Core.Save.prepare(bad));console.log('PASS schema76 rule4 migration and pending discard persistence');

const fs=require('node:fs'),crypto=require('node:crypto');let count=0;for(const row of require('./stability-corpus.json').rows){if(!fs.existsSync(row.path))continue;const bytes=fs.readFileSync(row.path);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256);const raw=JSON.parse(bytes),input=row.select?raw[row.select]:raw;const p=W.Core.Save.prepare(input),again=W.Core.Save.prepare(JSON.parse(JSON.stringify(W.Core.Save.envelope(p.state,false,{offlineRecoveryOverride:p.offlineRecovery}))));assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(again.state))),JSON.parse(JSON.stringify(S.toSerializable(p.state))));assert.equal(again.state.meta.infinity.discardedRunElapsed,0);count++;}assert(count>0);console.log('PASS actual save strict reload: '+count);

const debt=S.fresh();debt.core.runtime.timeLedger.pendingContinuousTime=[{source:'online',clock:4,speed:2,compensationEligible:false}];
const current=W.Core.Save.envelope(debt),plain=v=>JSON.parse(JSON.stringify(v));
for(const schemaVersion of [76,77])for(const numericModelVersion of [undefined,0,1,2,3])for(const settlementRule of [undefined,3,4,5]){
  const input={...plain(current),schemaVersion,numericModelVersion,settlementRule},before=plain(input);
  if(schemaVersion===76&&numericModelVersion===2&&settlementRule===4){const result=W.Core.Save.prepare(input);assert.deepEqual(plain(result.state.core.runtime.timeLedger.pendingContinuousTime),plain(debt.core.runtime.timeLedger.pendingContinuousTime));assert.equal(result.legacyBacklogDiscarded,undefined);}
  else assert.throws(()=>W.Core.Save.prepare(input),'invalid envelope '+JSON.stringify({schemaVersion,numericModelVersion,settlementRule}));
  assert.deepEqual(plain(input),before,'failed validation must never change input debt');
}
const oldCurrent={...plain(current),schemaVersion:75,settlementRule:3};assert.equal(W.Core.Save.prepare(oldCurrent).state.core.runtime.timeLedger.pendingContinuousTime[0].clock,4);
const legacy={...plain(current),schemaVersion:75,numericModelVersion:1,settlementRule:undefined};const legacyResult=W.Core.Save.prepare(legacy);assert.equal(legacyResult.state.core.runtime.timeLedger.pendingContinuousTime.length,0);assert(legacyResult.legacyBacklogDiscarded,'only legacy75 model1 may use explicit old load policy');
console.log('PASS schema/model/rule negative matrix and debt-retention controls');

assert.throws(()=>W.Core.AmountMigration.assertEnvelope({numericModelVersion:1},76),e=>e.code==='amount-model-version');assert.doesNotThrow(()=>W.Core.AmountMigration.assertEnvelope({numericModelVersion:1},75));
