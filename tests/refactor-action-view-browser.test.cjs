'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launch,root}=require('./startup-browser-helpers.cjs'),{load}=require('./ui-state-boundary.test.cjs');
const out=path.resolve(process.env.WIS_REFACTOR_RESULTS||path.join(root,'../WIS-项目资源/refactor-implementation-20261111/acceptance'));fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await launch();try{
 const {page,errors}=await load(browser,root,undefined,(file,s)=>file==='js/ui/source-preview.js'?s+String.raw`
 const math=WIS.Simulation.MathWorker;window.failTrainingPreview=true;WIS.Simulation.MathWorker={...math,createWork(kind,snapshot,request,options){if(window.failTrainingPreview&&kind==='source-preview'&&request.ids.includes('training'))return {advance(){throw Object.assign(Error('Quantity product digit capacity'),{code:'amount-unresolved'});},cancel(){},onReady(){}};return math.createWork(kind,snapshot,request,options);}};
 `:s);
 await page.addStyleTag({content:fs.readFileSync(path.join(root,'styles.css'),'utf8')});
 await page.waitForFunction(()=>document.getElementById('conversion-preview').textContent==='暂时无法计算收益。');
 await page.evaluate(()=>{const W=WIS;W.Core.Resources.replaceExact('core.joules',W.Core.Amount.from(100),W.Core.Runtime.getState());W.Core.Effects.invalidate();testUI.markCurrentPageDirty();testUI.render({forceGlobal:true});});
 assert.equal(await page.locator('#train-button').isEnabled(),true);
 await page.waitForFunction(()=>document.getElementById('conversion-preview').textContent==='暂时无法计算收益。');
 assert.equal(await page.locator('#conversion-preview').textContent(),'暂时无法计算收益。');
 const detail=page.locator('#conversion-preview + details');assert.equal(await detail.getAttribute('open'),null);assert.match(await detail.textContent(),/amount-unresolved/);
 for(const width of [320,390,1366]){await page.setViewportSize({width,height:900});await page.screenshot({path:path.join(out,'actions-error-'+width+'.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow at '+width);if(width<900)assert(await page.evaluate(()=>document.querySelector('.main-panel').getBoundingClientRect().width>=innerWidth-1),'mobile main panel must use full width');}
 // A failed presentation must not block the actual candidate or alter payment.
 const previous=await page.evaluate(()=>String(WIS.Game.getState().power));await page.locator('#train-button').click();
 await page.waitForFunction(before=>WIS.Core.Amount.compare(WIS.Core.Resources.readExact('core.joules',WIS.Game.getState()),0)===0&&WIS.Core.BigNum.gt(WIS.Game.getState().power,before),previous,{timeout:10000});
 await page.evaluate(()=>{failTrainingPreview=false;WIS.Core.Resources.replaceExact('core.joules',WIS.Core.Amount.from(100),WIS.Core.Runtime.getState());WIS.Core.Effects.invalidate();testUI.markCurrentPageDirty();testUI.render({forceGlobal:true});});
 await page.waitForFunction(()=>document.getElementById('conversion-preview').textContent.includes('最终获取'),null,{timeout:5000});
 assert.equal(await detail.isHidden(),true);
 const saved=await page.evaluate(()=>{WIS.Game.actions.save();const next=WIS.Core.Save.prepare(JSON.parse(localStorage.getItem('wis-infinite-power-save-v2'))).state;return String(next.power)===String(WIS.Game.getState().power);});assert(saved);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({failureNotZero:true,technicalDetailCollapsed:true,liveActionCommitted:true,roundtrip:true,widths:[320,390,1366],errors}));
 await page.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
