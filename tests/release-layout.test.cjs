'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.WIS_PLAYWRIGHT||'playwright'),{load}=require('./ui-state-boundary.test.cjs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const root=path.resolve(__dirname,'../发布版'),{page,errors}=await load(browser,root);await page.addStyleTag({content:fs.readFileSync(path.join(root,'styles.css'),'utf8')});
 await page.evaluate(()=>{const W=window.WIS,s=W.Core.State.fresh();s.joules=W.Core.BigNum.BN(42.79);s.power=s.highestPower=s.totalPower=W.Core.BigNum.BN(3);W.Meta.Achievements.record(s,'powerOne');W.Core.Runtime.setState(s);window.testUI.render({forceGlobal:true,forcePage:true});});
 for(const [width,height,zoom] of [[1015,864,1],[1015,864,.75],[1280,1440,1],[390,844,1],[320,740,1]]){
  await page.setViewportSize({width,height});await page.evaluate(zoom=>{document.body.style.zoom=zoom;},zoom);
  const r=await page.evaluate(()=>{const W=window.WIS,before=JSON.stringify(W.Core.State.toSerializable(W.Core.Runtime.getState()));window.testUI.render({forceGlobal:true,forcePage:true});const body=document.querySelector('.app-body'),side=document.querySelector('.sidebar'),main=document.querySelector('.main-panel');return {bodyBottom:body.getBoundingClientRect().bottom,sideBottom:side.getBoundingClientRect().bottom,layout:getComputedStyle(body).display,rows:getComputedStyle(body).gridTemplateRows,areas:getComputedStyle(body).gridTemplateAreas,nav:[...document.querySelectorAll('.nav-item')].filter(x=>!x.hidden).map(x=>x.textContent.trim()),rockHidden:document.getElementById('rock-action').hidden,overflow:document.documentElement.scrollWidth>innerWidth,readonly:before===JSON.stringify(W.Core.State.toSerializable(W.Core.Runtime.getState())),mainVisible:main.getBoundingClientRect().width>0};});
  console.log(JSON.stringify({width,height,zoom,...r}));assert.deepEqual(r.nav,['行动','强化','成就']);assert(r.rockHidden&&r.readonly&&r.mainVisible);assert.equal(r.overflow,false);
  if(r.layout==='grid')assert(Math.abs(r.bodyBottom-r.sideBottom)<1,'release sidebar must span body; unintended blank grid row: '+JSON.stringify(r));
 }
 // Higher progression still reveals the next action and cultivation navigation.
 const unlocked=await page.evaluate(()=>{const W=window.WIS,s=W.Core.Runtime.getState();s.highestScaleIndex=2;s.brickUnlocked=s.wallUnlocked=true;W.Meta.Achievements.record(s,'scale2');window.testUI.render({forceGlobal:true,forcePage:true});return {rock:!document.getElementById('rock-action').hidden,cultivation:!document.querySelector('[data-page="cultivation"]').hidden};});assert(unlocked.rock&&unlocked.cultivation);assert.deepEqual(errors,[]);
 console.log('PASS release low-progress layout, zoom, tall viewport, mobile and progression visibility');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
