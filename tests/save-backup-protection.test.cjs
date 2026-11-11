'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup75}=require('./amount-fixture.cjs');
function load({broken=true}={}) {
 const {W,context,storage}=setup75({targetSchema:76}),Save=W.Core.Save,S=W.Core.State,key=W.Core.Config.saveKey,backupKey=Save.backupKey();
 const state=points=>{const s=S.fresh();s.meta.infinity.points=W.Core.BigNum.BN(points);return s;};
 const text=points=>JSON.stringify(Save.envelope(state(points),false));
 const source=text(73),main=broken?'{broken':text(7);storage.set(key,main);storage.set(backupKey,source);
 if(broken)assert.throws(()=>Save.read());else Save.read();
 let fail=false;context.localStorage.setItem=(k,v)=>{if(fail&&k===key)throw Error('storage unavailable');storage.set(k,String(v));};
 return {W,Save,context,storage,key,backupKey,state,text,source,main,fail:v=>fail=v};
}
for(const broken of [true,false])test(`recovery source survives failed import and successful retry (${broken?'protected':'valid'} main)`,()=>{
 const a=load({broken}),tx=a.Save.storageSnapshot({transaction:true}),candidate=a.Save.prepare(JSON.parse(a.source)).state;
 a.Save.backup(a.state(broken?0:7),{preserveExisting:true});a.Save.acceptLoaded(tx);a.fail(true);
 assert.throws(()=>a.Save.write(candidate,{storageTransaction:tx}),/storage unavailable/);a.Save.restoreStorage(tx);
 assert.equal(a.storage.get(a.key),a.main);assert.equal(a.storage.get(a.backupKey),a.source,'failed recovery overwrote its only source');
 a.fail(false);const retry=a.Save.storageSnapshot({transaction:true}),reloaded=a.Save.prepare(JSON.parse(a.storage.get(a.backupKey))).state;
 a.Save.backup(a.state(broken?0:7),{preserveExisting:true});a.Save.acceptLoaded(retry);a.Save.write(reloaded,{storageTransaction:retry});a.Save.finishStorageTransaction(retry);
 assert.equal(String(a.Save.read().state.meta.infinity.points),'73');assert.equal(a.storage.get(a.backupKey),a.source);
});
test('protected session preserves an existing backup even during a regular import',()=>{const a=load();a.Save.backup(a.state(0));assert.equal(a.storage.get(a.backupKey),a.source);});
test('regular import still backs up the current valid state',()=>{const a=load({broken:false});a.Save.backup(a.state(7));assert.equal(String(a.Save.prepare(JSON.parse(a.storage.get(a.backupKey))).state.meta.infinity.points),'7');});
test('another page changing the main save prevents any backup side effect',()=>{const a=load({broken:false});a.storage.set(a.key,a.text(91));assert.throws(()=>a.Save.backup(a.state(7)),e=>e.code==='SAVE_CONFLICT');assert.equal(a.storage.get(a.backupKey),a.source);assert.equal(String(a.Save.prepare(JSON.parse(a.storage.get(a.key))).state.meta.infinity.points),'91');});
test('preserved backup is not rewritten when storage rejects all writes',()=>{const a=load();const original=a.storage.get(a.backupKey);const {Save}=a;a.context.localStorage.setItem=()=>{throw Error("all writes rejected");};assert.equal(Save.backup(a.state(0),{preserveExisting:true}),a.backupKey);assert.equal(a.storage.get(a.backupKey),original);});
