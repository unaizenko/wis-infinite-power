'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {host,launch,key}=require('./startup-browser-helpers.cjs');
const out=path.resolve('../WIS-项目资源/bounded-settlement-implementation-20261108'),row=require('./stability-corpus.json').rows[0];
(async()=>{const browser=await launch();try{const h=await host(browser,{width:390,before:()=>{window.setInterval=(original=>function(fn,ms,...args){if(ms===100)return 0;return original(fn,ms,...args);})(window.setInterval.bind(window));}});try{
 await h.page.addInitScript(({raw,key})=>{if(!sessionStorage.getItem('test-installed')){localStorage.setItem(key,raw);sessionStorage.setItem('test-installed','1');}},{raw:fs.readFileSync(row.path,'utf8'),key});
 const p=h.page;await p.goto(h.url);await p.waitForFunction(()=>window.WIS_BOOT?.diagnostics().ready,{timeout:20000});
 const result=await p.evaluate(async()=>{const g=WIS.Game,s0=g.getState(),before={elapsed:s0.totalElapsedSeconds,discard:s0.core.runtime.timeLedger.discardedClock||0},start=performance.now();await g.simulation.startCatchUp();const status=g.simulation.getCatchUpStatus();g.actions.save({closing:true});const saved=localStorage.getItem(WIS.Core.Config.saveKey),prepared=WIS.Core.Save.prepare(JSON.parse(saved));return{wallMs:performance.now()-start,status:{phase:status.phase,pending:status.pendingGameSeconds,locked:status.locked},before,after:{elapsed:g.getState().totalElapsedSeconds,discard:g.getState().core.runtime.timeLedger.discardedClock},saved:JSON.stringify(WIS.Core.State.toSerializable(prepared.state)),text:saved,workers:testWorkers};});
 assert.equal(result.status.pending,0);assert.equal(result.status.locked,false);assert(result.after.discard>0);assert(result.workers>0);assert.equal(JSON.parse(result.text).schemaVersion,76);
 await p.locator('#open-settings').click();await p.locator('#export-save').click();assert(await p.locator('#save-export-dialog').isVisible());await p.locator('#save-export-view').click();assert((await p.locator('#save-export-text').inputValue()).length>100);
 // Reload the actual persisted bytes; init script must not replace them with the fixture.
 await p.reload();await p.waitForFunction(()=>window.WIS_BOOT?.diagnostics().ready,{timeout:20000});
 const reloaded=await p.evaluate(()=>({discard:WIS.Game.getState().core.runtime.timeLedger.discardedClock,status:WIS.Game.simulation.getCatchUpStatus(),loadError:WIS.Core.Save.getLoadError()?.message||null}));
 assert.equal(reloaded.loadError,null);assert(reloaded.discard>=result.after.discard);assert.deepEqual(h.errors,[]);
 delete result.text;delete result.saved;result.reloaded={discard:reloaded.discard,pending:reloaded.status.pendingGameSeconds};fs.writeFileSync(path.join(out,'browser-recovery.json'),JSON.stringify(result,null,2));console.log('PASS real save, native offline Worker, durable discard, export and browser reload',JSON.stringify(result));
 }finally{await h.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
