'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),fs=require('node:fs');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');process.env.FIXED_RESULTS=path.join(require('node:os').tmpdir(),'wis-save-conflict');
const {W,context}=require('./helpers/production-numeric-runtime.cjs').loadProductionNumericRuntime();
const stored=new Map();context.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v)),removeItem:k=>stored.delete(k)};
const S=W.Core.State,B=W.Core.BigNum,key=W.Core.Config.saveKey,source=fs.readFileSync(path.join(__dirname,'../js/core/save.js'),'utf8');
const localStorage=context.localStorage;
function tab(){vm.runInContext(source,context);return W.Core.Save;}
function state(points){const s=S.fresh();s.meta.infinity.points=B.BN(points);return s;}
function readPoints(){return JSON.parse(localStorage.getItem(key)).data.meta.infinity?.points||'0';}
function conflict(fn){assert.throws(fn,e=>e.code==='SAVE_CONFLICT');}
localStorage.removeItem(key);const a=tab();assert.equal(a.read(),null);a.write(state(0));const b=tab();const old=b.read().state;a.write(state(73));
const newer=localStorage.getItem(key);conflict(()=>b.write(old));assert.equal(localStorage.getItem(key),newer);assert(b.status().unsaved);assert.match(b.status().message,/另一.*页面|其他.*页面/);
conflict(()=>b.writePrepared(JSON.stringify(b.envelope(old))));assert.equal(localStorage.getItem(key),newer);
const before=b.storageSnapshot();conflict(()=>b.restoreStorage({...before,text:JSON.stringify(b.envelope(old))}));assert.equal(localStorage.getItem(key),newer);
// A genuinely reloaded page adopts the current save and may advance it.
const c=tab();assert.equal(String(c.read().state.meta.infinity.points),'73');c.write(state(74));c.write(state(75));assert.equal(readPoints(),'75');
// Failed storage does not advance the acknowledged snapshot; retry still works.
const original=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota');};assert.throws(()=>c.write(state(76)),/quota/);localStorage.setItem=original;c.write(state(76));assert.equal(readPoints(),'76');
// Import accepts an explicitly chosen save; rollback reclaims its prior snapshot.
const snapshot=c.storageSnapshot();c.acceptLoaded();c.write(state(90));c.restoreStorage(snapshot);assert.equal(readPoints(),'76');c.write(state(77));assert.equal(readPoints(),'77');
// Clearing browser storage is also a conflict for a still-running older page.
localStorage.removeItem(key);conflict(()=>c.write(state(77)));assert.equal(localStorage.getItem(key),null);
// Explicit player reset creates a new authority, rather than recovering an old tab.
c.remove();c.write(state(0));assert.equal(readPoints(),'0');
localStorage.setItem(key,'{broken');const d=tab();assert.throws(()=>d.read());assert.throws(()=>d.write(state(0)));assert.equal(localStorage.getItem(key),'{broken');
console.log('PASS stale tab/live/Worker/rollback writes protected, current owner retries/import/reset, invalid-load preservation');
