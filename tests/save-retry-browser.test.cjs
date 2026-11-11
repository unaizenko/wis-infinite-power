'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.WIS_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..'),key='wis-infinite-power-save-v2';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});try{
 await context.route('https://wis-retry.test/**',async route=>{const name=decodeURIComponent(new URL(route.request().url()).pathname).slice(1)||'index.html',file=path.resolve(root,name);assert(file.startsWith(root+path.sep));await route.fulfill({body:fs.readFileSync(file),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html'});});
 await context.addInitScript(()=>{Date.now=()=>1800000000000;window.auditFailSave=true;window.auditTimers=[];const interval=window.setInterval;window.setInterval=function(fn,ms,...args){auditTimers.push({fn,ms});return interval.call(this,fn,ms,...args);};const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(auditFailSave&&k==='wis-infinite-power-save-v2')throw new DOMException('temporary storage failure','QuotaExceededError');return original.call(this,k,v);};});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://wis-retry.test/index.html');await page.waitForFunction(()=>WIS?.Core?.Save.status().unsaved);
 assert(await page.locator('#save-failure-panel').isVisible());
 const warning=await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});
 const retryRegistered=await page.evaluate(()=>auditTimers.some(t=>t.ms===5000));assert.deepEqual({warning,retryRegistered},{warning:true,retryRegistered:true},'failed startup must preserve retry cadence and request refresh confirmation');
 await page.evaluate(()=>{auditFailSave=false;WIS.Game.getState().meta.infinity.points=WIS.Core.BigNum.BN(73);auditTimers.find(t=>t.ms===5000).fn();});
 assert.equal(await page.evaluate(key=>WIS.Core.Save.prepare(JSON.parse(localStorage.getItem(key))).state.meta.infinity.points.toString(),key),'73');assert(!(await page.locator('#save-failure-panel').isVisible()));
 const clean=await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented;});assert.equal(clean,false,'successful save must allow normal refresh');
 await page.reload();await page.waitForFunction(()=>WIS?.Game?.getState());assert.equal(await page.evaluate(()=>String(WIS.Game.getState().meta.infinity.points)),'73');
 assert.deepEqual(errors,[]);console.log('PASS initial storage failure keeps retry cadence; failed refresh is protected; retry clears warning; refresh retains saved progress');
 }finally{await context.close();await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
