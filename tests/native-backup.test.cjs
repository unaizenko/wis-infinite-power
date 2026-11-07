'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
function fixture(opts={}) {
 let now=100000000, ready=true, active=true, fail=false, release;
 let settings={enabled:true,hours:6,directory:'content://tree/test',directoryName:'WIS',lastSuccess:now};
 const writes=[],changes=[];
 const bridge={getSettings:async()=>({...settings}),configure:async o=>(settings={...settings,...o}),chooseDirectory:async()=>({...settings}),
 writeBackup:async o=>{writes.push(o);if(fail)throw Error('permission revoked');if(opts.hold)await new Promise(r=>release=r);settings.lastSuccess=now;return {...settings};}};
 const win={WIS:{UI:{}}};vm.runInNewContext(fs.readFileSync(require.resolve('../js/ui/native-platform.js'),'utf8'),{window:win,Date,console});
 assert.equal(typeof win.WIS.UI.NativePlatform.createBackupController,'function');
 const api=win.WIS.UI.NativePlatform.createBackupController({bridge,now:()=>now,ready:()=>ready,active:()=>active,capture:()=> '{"save":"原样"}',onChange:s=>changes.push(s)});
 return {api,writes,changes,settings,bridge,time:n=>now+=n,setTime:n=>now=n,ready:v=>ready=v,active:v=>active=v,fail:v=>fail=v,release:()=>release()};
}
test('6h due only; 12h/24h persist; exact snapshot text',async()=>{const x=fixture();await x.api.refresh();await x.api.check();assert.equal(x.writes.length,0);x.time(6*3600000);await x.api.check();assert.equal(x.writes.length,1);assert.equal(x.writes[0].text,'{"save":"原样"}');await x.api.configure({hours:12});x.time(6*3600000);await x.api.check();assert.equal(x.writes.length,1);await x.api.configure({hours:24});assert.equal(x.api.status().hours,24);await assert.rejects(x.api.configure({hours:1}),/间隔/);});
test('startup catches up once, next startup respects native success timestamp',async()=>{const x=fixture();x.time(8*86400000);await x.api.check();await x.api.check();assert.equal(x.writes.length,1);await x.api.refresh();await x.api.check();assert.equal(x.writes.length,1);});
test('disabled/hidden/unready skip; manual still guards readiness',async()=>{const x=fixture();x.time(7*3600000);x.ready(false);await x.api.check(true);assert.equal(x.writes.length,0);x.ready(true);x.active(false);await x.api.check();assert.equal(x.writes.length,0);x.active(true);await x.api.configure({enabled:false});await x.api.check();assert.equal(x.writes.length,0);await x.api.check(true);assert.equal(x.writes.length,1);});
test('failure retains lastSuccess and retries no more than every5min',async()=>{const x=fixture();const old=x.settings.lastSuccess;x.time(7*3600000);x.fail(true);await x.api.check();assert.equal(x.api.status().lastSuccess,old);assert.match(x.api.status().error,/permission/);await x.api.check();assert.equal(x.writes.length,1);x.time(300000);x.fail(false);await x.api.check();assert.equal(x.writes.length,2);assert.equal(x.api.status().error,'');});
test('concurrent triggers write one file and settings mutation is rejected while writing',async()=>{const x=fixture({hold:true});x.time(7*3600000);const a=x.api.check(),b=x.api.check();await new Promise(r=>setImmediate(r));assert.equal(x.writes.length,1);await assert.rejects(x.api.configure({hours:12}),/进行/);x.release();await Promise.all([a,b]);});
test('clock rollback backs up once rather than waiting for future timestamp',async()=>{const x=fixture();x.setTime(1000);await x.api.check();await x.api.check();assert.equal(x.writes.length,1);});
test('missing directory does not capture or write',async()=>{const x=fixture();x.settings.directory='';x.time(7*3600000);await x.api.check(true);assert.equal(x.writes.length,0);});
