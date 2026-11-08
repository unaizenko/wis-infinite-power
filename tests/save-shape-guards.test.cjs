"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
const setup=()=>loadProductionNumericRuntime().W;
const W=setup(),S=W.Core.State,Save=W.Core.Save;
const paths=['core.resources','powerSystem.systems.scale','cultivation.systems.immortal.resources','cultivation.systems.immortal.xiuzhen','cultivation.systems.martial','meta.bigNumbers','meta.treasures','meta.infinity','meta.highMultiverse','meta.treasureProgress','meta.treasureStockResidual','meta.treasureProgressPending','powerSystem.systems.scale.history.manualUpgrades','cultivation.systems.immortal.history.manualAbilities'];
const set=(root,path,value)=>{const parts=path.split('.');for(const k of parts.slice(0,-1))root=root[k]||=( {} );root[parts.at(-1)]=value;};
test('provided corrupt domain containers are rejected before defaults, with immutable input/live state',()=>{
 const live=S.fresh();W.Simulation.OfflineHeadless.create({domain:live},{checkpoint(){},yield:()=>Promise.resolve()});
 const before=JSON.stringify(S.toSerializable(W.Core.Runtime.getState()));
 for(const path of paths)for(const value of ['bad',false,[],123,null]){
  const raw=Save.envelope(live);set(raw.data,path,value);const input=JSON.stringify(raw);
  assert.throws(()=>Save.prepare(raw),e=>e.code==='SAVE_SHAPE'&&e.path===path,`${path}: ${JSON.stringify(value)}`);
  assert.equal(JSON.stringify(raw),input);assert.equal(JSON.stringify(S.toSerializable(W.Core.Runtime.getState())),before);
 }
});
test('legal omissions and nonexecuting extensions retain compatibility and idempotence',()=>{
 const raw=Save.envelope(S.fresh());raw.data.meta.extension={text:'unchanged',list:[1,2]};
 const first=Save.prepare(raw).state,second=Save.prepare(Save.envelope(first)).state;
 assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(first))),JSON.parse(JSON.stringify(S.toSerializable(second))));
 assert.equal(JSON.stringify(first.meta.extension),JSON.stringify(raw.data.meta.extension));
 assert(Save.prepare({version:36,data:{joules:'3',power:'0',highestPower:'0'}}).state);
});
test('direct normalizers reject corrupt containers too',()=>{
 for(const bad of ['bad',[],false,3]){
  assert.throws(()=>S.normalizeDomain({meta:{bigNumbers:bad}}));
  assert.throws(()=>W.Cultivation.Xiuzhen.normalize(bad));assert.throws(()=>W.Meta.BigNumbers.normalize(bad));
 }
 assert.throws(()=>W.Cultivation.Xiuzhen.normalize({resources:{nieForce:[]}}));
 assert.throws(()=>W.Meta.BigNumbers.normalize({tree:{upgrades:[]}}));
});

test('BigNumbers resources array and each known slot cannot silently erase a balance',()=>{
 for(const path of ['meta.bigNumbers.resources','meta.bigNumbers.resources.0'])for(const value of [false,0,'bad',null]){
  const state=S.fresh();state.meta.bigNumbers.resources[0].amount=W.Core.BigNum.BN(12345);
  const raw=Save.envelope(state);set(raw.data,path,value);const before=JSON.stringify(raw);
  assert.throws(()=>Save.prepare(raw),e=>e.code==='SAVE_SHAPE'&&e.path===path,path);assert.equal(JSON.stringify(raw),before);
 }
 for(const resources of [false,[false],[null]])assert.throws(()=>W.Meta.BigNumbers.normalize({resources}));
});

test('explicit nullable legacy subrecords keep their existing defaults',()=>{
 const W=require('./rank-schema-fixture.cjs').setupGuarded73(),S=W.Core.State,Save=W.Core.Save;
 for(const path of ['core.runtime.timeLedger','core.runtime.timeLedger.pendingContinuousTime','core.runtime.compensation','cultivation.systems.immortal.progress.explorationRewards','cultivation.systems.immortal.xiuzhen.shengProgress','meta.infinity.silverSeaProgress','meta.highMultiverse.highest','meta.bigNumbers.tree']){
  const state=S.fresh();state.meta.bigNumbers.resources[0].amount=W.Core.BigNum.BN(12345);const raw=Save.envelope(state);set(raw.data,path,null);
  const before=JSON.stringify(raw),loaded=Save.prepare(raw).state;assert(W.Core.BigNum.eq(loaded.meta.bigNumbers.resources[0].amount,12345),path);assert.equal(JSON.stringify(raw),before);
 }
});
test('known resource balance text is strict at save and independent normalizer boundaries',()=>{
 for(const path of ['core.resources.joules','core.resources.power','cultivation.systems.immortal.resources.mana','cultivation.systems.immortal.resources.immortalPower','cultivation.systems.immortal.xiuzhen.resources.nieForce.amount','meta.bigNumbers.resources.0.amount'])for(const value of ['bad','NaN','Infinity','',false,{},[]]){
  const raw=Save.envelope(S.fresh());set(raw.data,path,value);const before=JSON.stringify(raw);
  assert.throws(()=>Save.prepare(raw),path+': '+JSON.stringify(value));assert.throws(()=>S.normalizeDomain(raw.data),path);assert.equal(JSON.stringify(raw),before);
 }
 assert.throws(()=>W.Cultivation.Xiuzhen.normalize({resources:{nieForce:{amount:'bad'}}}));assert.throws(()=>W.Meta.BigNumbers.normalize({resources:[{amount:'bad'}]}));
});

test('model metadata remains strict independently of domain shape validation',()=>{const raw=Save.envelope(S.fresh());assert.equal(raw.schemaVersion,W.Core.Config.saveVersion);assert.equal(raw.numericModelVersion,2);for(const version of [undefined,0,3]){const bad={...raw,numericModelVersion:version},before=JSON.stringify(bad);assert.throws(()=>Save.prepare(bad),e=>e.code==='amount-model-version');assert.equal(JSON.stringify(bad),before);}});
