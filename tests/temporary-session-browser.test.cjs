'use strict';
const assert=require('node:assert/strict'),{host,launch,key}=require('./startup-browser-helpers.cjs');

function probeOwnership(){
 const urls=new Map(),create=URL.createObjectURL.bind(URL),WorkerClass=window.Worker;
 window.testWorkerSources=[];window.testDurableWorkers=0;window.testUnknownWorkers=0;window.testPersistentWrites=0;
 URL.createObjectURL=blob=>{const url=create(blob);urls.set(url,blob);return url;};
 window.Worker=class extends WorkerClass{constructor(url,...args){super(url,...args);const blob=urls.get(String(url));if(!blob){testUnknownWorkers++;return;}testWorkerSources.push(blob.text().then(source=>{if(source.includes('// js/simulation/session-worker-entry.js')||source.includes('// js/simulation/offline-worker-entry.js'))testDurableWorkers++;else if(!source.includes('// js/simulation/online-candidate-worker-entry.js')&&!source.includes('// js/simulation/math-worker-entry.js'))testUnknownWorkers++;}));}};
 const set=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){if(this===localStorage)testPersistentWrites++;return set.apply(this,args);};
}
async function assertNoDurableOwner(page){await page.evaluate(()=>Promise.all(testWorkerSources));const result=await page.evaluate(()=>({durable:testDurableWorkers,unknown:testUnknownWorkers,writes:testPersistentWrites}));assert.deepEqual(result,{durable:0,unknown:0,writes:0},'temporary mode must have no durable owner or persistent writes');}

(async()=>{const browser=await launch();try{
 const raw='{bad json for temporary mode',h=await host(browser,{raw});
 try{await h.page.addInitScript(probeOwnership);await h.page.goto(h.url);await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready&&Number(String(WIS.Game.getState().joules))>=1);await assertNoDurableOwner(h.page);
  const s=await h.page.evaluate(key=>({joules:String(WIS.Game.getState().joules),workers:testWorkers,raw:localStorage.getItem(key),locked:WIS.Game.simulation.getCatchUpStatus().locked,policy:WIS.Core.Save.sessionPolicy?.()}),key);
  assert(Number(s.joules)>=1,'temporary fallback continues formal foreground production');assert.equal(s.raw,raw);assert.equal(s.locked,false);assert.equal(s.policy.mode,'temporary');
  await h.page.locator('#open-settings').click();
  await h.page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad import')});
  await h.page.waitForFunction(()=>WIS.Core.Save.diagnostics().some(x=>String(x.stage||x.kind||'').startsWith('import-'))).catch(async()=>{throw Error('failed import completion not observed: '+JSON.stringify(await h.page.evaluate(()=>WIS.Core.Save.diagnostics())));});await assertNoDurableOwner(h.page);
  assert.equal(await h.page.evaluate(()=>WIS.Core.Save.sessionPolicy().mode),'temporary');
  assert.equal(await h.page.evaluate(key=>localStorage.getItem(key),key),raw);
  const valid=await h.page.evaluate(()=>{const s=WIS.Core.State.fresh();s.joules=WIS.Core.BigNum.BN(1000);return JSON.stringify(WIS.Core.Save.envelope(s,false,{offlineRecoveryOverride:null}));});
  await h.page.locator('#import-file').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(valid)});
  await h.page.waitForFunction(()=>WIS.Core.Save.sessionPolicy().mode==='normal'&&WIS_BOOT.diagnostics().mode==='normal');
  assert.equal(await h.page.evaluate(()=>WIS.Core.Save.sessionPolicy().mode),'normal');
  assert.equal(await h.page.evaluate(()=>WIS_BOOT.diagnostics().mode),'normal','successful import clears temporary presentation only after commit');

 }finally{await h.close();}
 const hidden=await host(browser,{raw,before:()=>{
  window.testClock=Date.now();Date.now=()=>testClock;window.testHidden=false;
  Object.defineProperty(document,'hidden',{get:()=>testHidden});
  File.prototype.text=function(){return new Promise((resolve,reject)=>{window.testRejectFile=reject;});};
 }});
 try{await hidden.page.addInitScript(probeOwnership);await hidden.page.goto(hidden.url);await hidden.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
  await hidden.page.locator('#open-settings').click();await hidden.page.locator('#import-file').setInputFiles({name:'delayed.json',mimeType:'application/json',buffer:Buffer.from('{delayed')});
  await hidden.page.waitForFunction(()=>typeof testRejectFile==='function');
  await hidden.page.evaluate(()=>{testHidden=true;document.dispatchEvent(new Event('visibilitychange'));testRejectFile(new Error('hidden import failure'));});await hidden.page.waitForFunction(()=>WIS.Core.Save.diagnostics().some(x=>x.stage==='import-parse'));
  assert.notEqual(await hidden.page.evaluate(()=>WIS.Game.getState().core.runtime.timeLedger.awaySince),null,'hidden rollback restores temporary away boundary');
  await hidden.page.evaluate(()=>{testClock+=3600000;testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await hidden.page.waitForFunction(()=>WIS.Game.getState().core.runtime.timeLedger.awaySince===null);
  const result=await hidden.page.evaluate(key=>({pending:WIS.Game.getState().core.runtime.timeLedger.pendingContinuousTime.reduce((sum,p)=>sum+p.clock,0),workers:testWorkers,raw:localStorage.getItem(key)}),key);
  assert(result.pending<1,'one hour hidden cannot become exact-online backlog');await assertNoDurableOwner(hidden.page);assert.equal(result.raw,raw);
 }finally{await hidden.close();}
 console.log('PASS real-clock bad-save temporary foreground production without durable debt/write');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
