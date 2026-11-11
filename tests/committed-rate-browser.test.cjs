"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {load}=require('./ui-state-boundary.test.cjs'),{launch,root}=require('./startup-browser-helpers.cjs');
const before=process.env.WIS_RATE_BEFORE;
(async()=>{const browser=await launch();try{
 const {page,errors}=await load(browser,root,null,(file,source)=>{
  if(before&&['game.js','js/simulation/loop.js','js/ui/app.js'].includes(file))source=fs.readFileSync(path.join(before,file),'utf8');
  if(file==='game.js')source=`(()=>{const create=WIS.Simulation.Loop.create;WIS.Simulation.Loop={...WIS.Simulation.Loop,create(c){const advance=c.advanceGameStep;return window.rateLoop=create({...c,prepareOnlineWork:undefined,advanceGameStep(...a){const r=advance(...a);window.rateResult=r;return r;}});}};})();`+source;
  return source;
 });
 const result=await page.evaluate(()=>{
  const W=WIS,s=W.Game.getState();s.fitnessLevel=2;s.rockLevel=1;s.qiRefiningUnlocked=true;s.cultivation.active='immortal';testContext.completePlayerAction();
  testUI.render({forceGlobal:true,forcePage:true});const pending=document.getElementById('joules-rate').textContent;
  const original=Date.now;let clock=original();Date.now=()=>clock;const initial=W.Core.Resources.readExact('core.joules',s);
  for(let i=0;i<5;i++){clock+=100;rateLoop.runMainTick();}
  const actualGain=W.Core.Amount.compare(W.Core.Resources.readExact('core.joules',W.Game.getState()),initial)>0;
  const expected=W.Core.BigNum.div(rateResult.resourceGains.joules,rateResult.processedSeconds);
  W.Core.Effects.invalidate();testUI.render({forceGlobal:true,forcePage:true});
  const afterClear=document.getElementById('joules-rate').textContent;
  const zero=document.getElementById('mana-rate'),zeroVisible=!zero.hidden,zeroText=zero.textContent;
  const stateBefore=JSON.stringify(W.Core.State.toSerializable(W.Game.getState()));testUI.render({forceGlobal:true,forcePage:true});
  const readOnly=stateBefore===JSON.stringify(W.Core.State.toSerializable(W.Game.getState()));
  testContext.completePlayerAction();testUI.render({forceGlobal:true,forcePage:true});const invalidated=document.getElementById('joules-rate').textContent;
  clock+=100;rateLoop.runMainTick();testUI.render({forceGlobal:true,forcePage:true});const resumed=document.getElementById('joules-rate').textContent;
  W.Core.Runtime.setState(W.Core.State.fresh());testUI.render({forceGlobal:true,forcePage:true});const replaced=document.getElementById('joules-rate').textContent;
  return {pending,actualGain,expected: testContext.format(expected),afterClear,zeroVisible,zeroText,readOnly,invalidated,resumed,replaced};
 });
 assert(result.actualGain,'real settlement did not credit resources');
 assert.equal(result.afterClear,'（+'+result.expected+'/秒）','effects invalidation erased a committed rate');
 assert.equal(result.pending,'（收益更新中…）');assert(result.zeroVisible);assert.equal(result.zeroText,'（+0/秒）');assert(result.readOnly);
 assert.equal(result.invalidated,'（收益更新中…）');assert.match(result.resumed,/\+/);assert.equal(result.replaced,'（收益更新中…）');assert.deepEqual(errors,[]);
 const tiny=await page.evaluate(()=>{testContext.getCommittedRates=()=>({rates:{joulesPerSecond:WIS.Core.BigNum.BN('1e-20')}});testUI.render({forceGlobal:true,forcePage:true});return document.getElementById('joules-rate').textContent;});assert.match(tiny,/1e-20/);assert(!tiny.includes('+0/秒'));
 console.log(JSON.stringify({...result,tiny}));await page.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
