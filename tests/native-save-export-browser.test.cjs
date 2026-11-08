'use strict';
const assert=require('node:assert/strict'),{host,launch}=require('./startup-browser-helpers.cjs');
(async()=>{const browser=await launch();try{
 const h=await host(browser,{before:()=>{
  Date.now=()=>1800000000000; window.exportCalls=[]; window.exportMode='saved'; window.nativeListeners={};
  window.alert=()=>{};
  window.Capacitor={isNativePlatform:()=>true,Plugins:{
   WisSaveExport:{saveText:async data=>{exportCalls.push({kind:'save',...data});if(exportMode==='pending')return await new Promise(resolve=>window.finishExport=resolve);if(exportMode==='fail')throw Error('disk full');if(exportMode==='old')throw Object.assign(Error('unsupported'),{code:'UNIMPLEMENTED'});return exportMode==='cancelled'?{status:'cancelled'}:{status:'saved',bytes:new TextEncoder().encode(data.text).length,sha256:'a'.repeat(64)};}},
   Filesystem:{writeFile:async data=>{exportCalls.push({kind:'write',...data});return {uri:'content://test/cache'};}},
   Share:{share:async()=>exportCalls.push({kind:'share'})},
   App:{addListener:async(k,fn)=>{nativeListeners[k]=fn;return {remove(){}};},getState:async()=>({isActive:true}),exitApp:async()=>{}}
  }};
 }});
 try{const p=h.page;await p.goto(h.url);await p.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
  await p.locator('#open-settings').click();await p.locator('#export-save').click();
  await p.evaluate(()=>{window.actionChecks=0;WIS.Game={...WIS.Game,beforePlayerAction:()=>{actionChecks++;return false;},getSettlementStatus:()=>({bounded:true,stopped:true,reason:'test',pendingDiscard:true})};});
  await p.locator('#save-export-close').click();await p.locator('#close-settings').click();
  await p.locator('#train-button').dispatchEvent('click');assert((await p.evaluate(()=>actionChecks))>0);
  await p.locator('#open-settings').click();assert.match(await p.locator('#settlement-limit-status').textContent(),/自动结算已停止/);
  const checks=await p.evaluate(()=>actionChecks);await p.locator('#export-save').click();assert.equal(await p.evaluate(()=>actionChecks),checks);
  await p.locator('#save-export-view').click();const text=await p.locator('#save-export-text').inputValue();assert(text.length>100);
  await p.locator('#save-export-file').click();await p.waitForFunction(()=>document.getElementById('save-export-status').textContent.includes('校验通过'));
  assert.equal(await p.evaluate(()=>exportCalls[0].text),text);
  await p.evaluate(()=>exportMode='cancelled');await p.locator('#save-export-file').click();await p.waitForFunction(()=>document.getElementById('save-export-status').textContent.includes('已取消'));assert.equal(await p.evaluate(()=>exportCalls.some(x=>x.kind==='share')),false);
  for(const mode of ['fail','old']){await p.evaluate(m=>exportMode=m,mode);await p.locator('#save-export-file').click();await p.waitForFunction(()=>document.getElementById('save-export-status').textContent.includes('未完成'));assert.equal(await p.locator('#save-export-text').inputValue(),text);}
  await p.evaluate(()=>delete Capacitor.Plugins.WisSaveExport);await p.locator('#save-export-file').click();await p.waitForFunction(()=>document.getElementById('save-export-status').textContent.includes('升级 APK'));
  await p.locator('#save-export-share').click();await p.waitForFunction(()=>exportCalls.some(x=>x.kind==='share'));assert.equal(await p.evaluate(()=>exportCalls.find(x=>x.kind==='write').data),text);
  await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));await p.locator('#save-export-copy').click();await p.waitForFunction(()=>document.getElementById('save-export-status').textContent.includes('自动复制不可用'));assert.equal(await p.evaluate(()=>{const a=document.getElementById('save-export-text');return a.selectionEnd-a.selectionStart;}),text.length);
  await p.locator('#save-export-close').click();
  const raw=' {"巨大":"eee100","数字":1e9999,"精确":123456789012345678901234567890,"中文":"原始"}\r\n';
  await p.evaluate(raw=>{WIS.Core.Save={...WIS.Core.Save,storageSnapshot:()=>({text:raw})};document.getElementById('export-protected-save').click();},raw);
  await p.locator('#save-export-view').click();assert.equal(await p.locator('#save-export-text').inputValue(),raw.replace(/\r\n/g,'\n'));
  // Textareas normalize CRLF; copying must use the fixed original string, not the DOM value.
  await p.evaluate(()=>{window.copied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{copied=t;}}});});
  await p.locator('#save-export-copy').click();assert.equal(await p.evaluate(()=>copied),raw);
  await p.evaluate(()=>{Capacitor.Plugins.WisSaveExport={saveText:async data=>{exportCalls.push({kind:'raw',...data});return new Promise(resolve=>window.finishExport=resolve);}};});
  await p.locator('#save-export-file').click();await p.locator('#save-export-file').click();assert.equal(await p.evaluate(()=>exportCalls.filter(x=>x.kind==='raw').length),1);assert.equal(await p.evaluate(()=>exportCalls.find(x=>x.kind==='raw').text),raw);
  await p.evaluate(()=>nativeListeners.appStateChange({isActive:false}));await p.evaluate(()=>nativeListeners.appStateChange({isActive:true}));assert.equal(await p.evaluate(()=>exportCalls.find(x=>x.kind==='raw').text),raw);
  await p.evaluate(()=>finishExport({status:'cancelled'}));await p.waitForFunction(()=>document.getElementById('save-export-status').textContent.includes('已取消'));
  for(const width of [320,390,430,1280]){await p.setViewportSize({width,height:850});assert(await p.locator('#save-export-close').isVisible());assert(await p.evaluate(()=>document.getElementById('save-export-dialog').getBoundingClientRect().width<=innerWidth));}
  await p.evaluate(()=>nativeListeners.backButton());assert.equal(await p.locator('#save-export-dialog').isVisible(),false);
  assert.deepEqual(h.errors,[]);console.log('PASS native save UI, exact raw/copy bytes, cancellation, failure, missing/old bridges, independent share, concurrency, lifecycle, 4 widths and back');
 }finally{await h.close();}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
