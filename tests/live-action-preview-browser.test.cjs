"use strict";
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {launch,root}=require('./startup-browser-helpers.cjs');
const ceiling=require('./current-regression.json').performanceContract.firstAllFourValuesMs;
const file=process.env.WIS_PREVIEW_SAVE||require('./helpers/current-fixtures.cjs').fixturePath('live-training');
(async()=>{const browser=await launch(),rows=[];try{
 for(const options of [{name:'real-desktop-file',width:1440,rate:1},{name:'screenshot-values-file',width:1440,rate:1,simulated:true},{name:'real-mobile-4x-file',width:390,rate:4}]){
  if(process.env.WIS_PREVIEW_CASE && options.name!==process.env.WIS_PREVIEW_CASE)continue;
  const page=await browser.newPage({viewport:{width:options.width,height:900},isMobile:options.width<400,hasTouch:options.width<400}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{if(options.rate>1){const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:options.rate});}
   await page.addInitScript(({raw,simulated})=>{
    const now=Date.now();raw.data.core.runtime.lastUpdateAt=now;Object.assign(raw.data.core.runtime.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]});
    if(simulated){Object.assign(raw.data.core.resources,{joules:'5.23e11',power:'1.96e10',joulesGainResidualTail:[],powerGainResidualTail:[]});Object.assign(raw.data.cultivation.systems.immortal.resources,{mana:'14560',manaGainResidualTail:[]});}
    localStorage.clear();localStorage.setItem('wis-infinite-power-save-v2',JSON.stringify(raw));
    window.previewTimes={};const seenPending=new Set();const selectors=['conversion-preview','next-power-j','breathing-preview','next-mana-j'];
    new MutationObserver(()=>{for(const id of selectors){const text=document.getElementById(id)?.textContent;if(/计算中|正在计算/.test(text))seenPending.add(id);if(window.WIS?.Game&&seenPending.has(id)&&text&&!/计算|暂无法/.test(text)&&!previewTimes[id])previewTimes[id]={ms:performance.now(),text};}}).observe(document,{childList:true,subtree:true,characterData:true});
   },{raw:JSON.parse(fs.readFileSync(file,'utf8')),simulated:options.simulated});
   await page.goto(pathToFileURL(path.join(root,'index.html')).href);
   await page.waitForFunction(()=>Object.keys(window.previewTimes||{}).length===4,null,{timeout:30000});
   const first=await page.evaluate(()=>({times:previewTimes,elapsed:WIS.Game.getState().totalElapsedSeconds,j:String(WIS.Game.getState().joules)}));
   for(const [id,row] of Object.entries(first.times))assert(Number.isFinite(row.ms)&&row.ms<=ceiling,id+' first value exceeded '+ceiling+'ms: '+row.ms);
   await page.waitForTimeout(3500);
   const later=await page.evaluate(()=>({elapsed:WIS.Game.getState().totalElapsedSeconds,j:String(WIS.Game.getState().joules),training:document.getElementById('conversion-preview').textContent,breathing:document.getElementById('breathing-preview').textContent,build:WIS_BUILD.id}));
   assert(later.elapsed>first.elapsed,'normal online clock must remain running');assert(!/计算|暂无法/.test(later.training+later.breathing));assert.deepEqual(errors,[]);
   let action=null;
   if(options.name==='real-desktop-file'){
    if(process.env.WIS_PREVIEW_SCREENSHOT)await page.screenshot({path:process.env.WIS_PREVIEW_SCREENSHOT,fullPage:true});
    const before=await page.evaluate(()=>({j:Number(WIS.Game.getState().joules),power:Number(WIS.Game.getState().power)}));
    await page.locator('#train-button').click();await page.waitForFunction(before=>Number(WIS.Game.getState().joules)<before.j*.25&&Number(WIS.Game.getState().power)>before.power,before,{timeout:30000});
    action=await page.evaluate(()=>({j:String(WIS.Game.getState().joules),power:String(WIS.Game.getState().power)}));
   }
   assert.deepEqual(errors,[]);rows.push({options,first,later,action});console.log(JSON.stringify(rows[rows.length-1]));
  }catch(error){console.log(JSON.stringify({options,failed:await page.evaluate(()=>({times:window.previewTimes,ready:window.WIS_BOOT?.diagnostics(),texts:['conversion-preview','next-power-j','breathing-preview','next-mana-j'].map(id=>document.getElementById(id)?.textContent)})),errors}));throw error;}finally{await page.close();}
 }
 console.log(JSON.stringify({rows},null,2));
}finally{if(process.env.WIS_PREVIEW_REPORT)fs.writeFileSync(process.env.WIS_PREVIEW_REPORT,JSON.stringify({rows},null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
