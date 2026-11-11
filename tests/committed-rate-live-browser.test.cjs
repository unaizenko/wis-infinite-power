"use strict";
const assert=require('node:assert/strict'),{host,launch}=require('./startup-browser-helpers.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
function initialize(){const k='wis-infinite-power-save-v2',raw=JSON.parse(localStorage.getItem(k)),now=Date.now();raw.data.core.runtime.lastUpdateAt=now;Object.assign(raw.data.core.runtime.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]});localStorage.setItem(k,JSON.stringify(raw));}
(async()=>{const browser=await launch();try{for(const cfg of [{id:'qi-offline',cpu:1},{id:'high-training',cpu:4},{id:'ring-training',cpu:8}]){
 const h=await host(browser,{raw:JSON.stringify(readFixture(cfg.id)),before:initialize,width:390,touch:true,transform:(p,s)=>p==='game.js'?`(()=>{const L=WIS.Simulation.Loop.create;WIS.Simulation.Loop={...WIS.Simulation.Loop,create(c){return window.rateLoop=L(c);}};const U=WIS.UI.App.create;WIS.UI.App={...WIS.UI.App,create(c){return window.rateUI=U(c);}};})();`+s:s});
 try{const cdp=await h.page.context().newCDPSession(h.page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cfg.cpu});const started=performance.now();await h.page.goto(h.url);
  await h.page.waitForFunction(()=>window.WIS?.Game,null,{timeout:30000});
  // This original save intentionally contains a paused historical failure.
  // Exercise its real retry and retain the entire offline remainder.
  if(readFixture(cfg.id).offlineRecovery?.pauseReason)
   await h.page.waitForFunction(()=>WIS.Game.simulation.getCatchUpStatus().phase==='paused',null,{timeout:30000});
  const recovery=await h.page.evaluate(()=>WIS.Game.simulation.getCatchUpStatus());
  if(recovery.phase==='paused'){
   assert.match(await h.page.locator('#joules-rate').textContent(),/结算暂停/);
   await h.page.evaluate(()=>{void WIS.Game.simulation.retryCatchUp();});
   await h.page.waitForFunction(()=>WIS.Game.simulation.getCatchUpStatus().pendingGameSeconds===0,null,{timeout:60000});
   await h.page.evaluate(()=>WIS.Game.simulation.acknowledgeCatchUp());
  }
  await h.page.waitForFunction(()=>window.rateLoop?.getCommittedRates().rates&&WIS.Game.getState().totalElapsedSeconds>0,null,{timeout:60000});
  const snapshots=[];
  for(let i=0;i<6;i++){
   snapshots.push(await h.page.evaluate(()=>{const W=WIS,s=W.Game.getState(),before=JSON.stringify(W.Core.State.toSerializable(s)),v=rateLoop.getCommittedRates();W.Core.Effects.invalidate();rateUI.render({forceGlobal:true});return {elapsed:s.totalElapsedSeconds,published:v.rates?String(v.rates.joulesPerSecond):null,stale:v.stale,stopped:v.stopped,text:document.getElementById('joules-rate').textContent,readOnly:before===JSON.stringify(W.Core.State.toSerializable(s)),discarded:s.core.runtime.timeLedger.discardedClock||0};}));
   await h.page.waitForTimeout(250);
  }
  assert(snapshots.some(r=>r.published!==null&&r.published!=='0'),'fixture must exercise positive committed income');
  for(const r of snapshots){assert(r.readOnly);assert(!r.stopped);if(r.published!==null&&r.published!=='0')assert(!/收益更新|\+0\/秒/.test(r.text),'positive committed income disappeared');}
  const saved=await h.page.evaluate(()=>{WIS.Game.actions.save();const loaded=WIS.Core.Save.prepare(JSON.parse(localStorage.getItem('wis-infinite-power-save-v2'))).state;return String(loaded.joules)===String(WIS.Game.getState().joules);});assert(saved);assert.deepEqual(h.errors,[]);
  console.log(JSON.stringify({cfg,wallMs:Math.round(performance.now()-started),initialOfflineSeconds:recovery.pendingGameSeconds,snapshots,roundtrip:true}));
 }catch(e){console.log(JSON.stringify({cfg,diagnostic:await h.page.evaluate(()=>({status:window.WIS?.Game?.simulation.getCatchUpStatus(),published:window.rateLoop?.getCommittedRates(),elapsed:window.WIS?.Game?.getState().totalElapsedSeconds,text:document.body.innerText.slice(-1200)}))}));throw e;}finally{await h.close();}
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
