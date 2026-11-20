'use strict';
const assert=require('node:assert/strict'),{host,launch,key}=require('./startup-browser-helpers.cjs');
(async()=>{const browser=await launch();try{
 const raw=JSON.stringify({joules:100,power:0,lastUpdateAt:Date.now()-3600000,highestPower:0,cultivationSystem:'none'});
 const h=await host(browser,{raw,transform:(p,s)=>p==='game.js'?s.replace('await paintOpportunity(); // first-view','await new Promise(resolve => { window.testReleaseBoot=resolve; }); // first-view'):s});
 try{await h.page.goto(h.url);await h.page.waitForFunction(()=>window.WIS?.Game||window.WIS_BOOT?.diagnostics().failed);
  const held=await h.page.evaluate(key=>{
   const W=window.WIS,before=String(W.Game.getState().joules);
   W.Game.actions.train();W.Game.actions.save({closing:true});window.dispatchEvent(new Event('pagehide'));
   return {held:typeof testReleaseBoot==='function',allowed:W.Game.canPerformSavedAction?.(),before,after:String(W.Game.getState().joules),raw:localStorage.getItem(key)};
  },key);
  assert(held.held,'bootstrap yields between first stock view and recovery registration');
  assert.equal(held.allowed,false);assert.equal(held.after,held.before);assert.equal(held.raw,raw,'startup pagehide must not save an advanced watermark');
  await h.page.evaluate(()=>testReleaseBoot());await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
  const d=await h.page.evaluate(()=>WIS_BOOT.diagnostics());assert.deepEqual(d.events.filter(e=>e.type==='stage').map(e=>e.stage),['read-save','initialize','first-view','register-recovery']);assert.equal(d.ready,true);
 }finally{await h.close();}
 for(const stage of ['initialize','register-recovery']){
  const h=await host(browser,{raw,transform:(p,s)=>p==='game.js'?s.replace('BOOT.enter("'+stage+'");','BOOT.enter("'+stage+'"); throw new Error("injected-'+stage+'");'):s});
  try{await h.page.goto(h.url);await h.page.waitForTimeout(600);
   const d=await h.page.evaluate(key=>({boot:WIS_BOOT.diagnostics(),raw:localStorage.getItem(key),workers:testWorkers}),key);
   assert.equal(d.boot.failed,true);assert.equal(d.boot.firstError.stage,stage);assert.equal(d.raw,raw);assert.equal(d.workers,0);
   await h.page.locator('#open-settings').click();assert(await h.page.locator('#boot-export').isVisible());
  }finally{await h.close();}
 }
 const external=await host(browser,{raw,transform:(p,s)=>p==='game.js'?s.replace('await paintOpportunity(); // first-view','await new Promise(resolve => { window.testReleaseBoot=resolve; }); // first-view'):s});
 try{await external.page.goto(external.url);await external.page.waitForFunction(()=>typeof testReleaseBoot==='function');
  await external.page.evaluate(()=>{window.dispatchEvent(new ErrorEvent('error',{message:'injected asynchronous boot failure'}));testReleaseBoot();});await external.page.waitForTimeout(500);
  const result=await external.page.evaluate(key=>({raw:localStorage.getItem(key),allowed:WIS.Game.canPerformSavedAction(),workers:testWorkers}),key);
  assert.equal(result.allowed,false,'asynchronous failure cannot release the startup gate');assert.equal(result.raw,raw);assert.equal(result.workers,0);
 }finally{await external.close();}
 const committed=await host(browser,{raw,transform:(p,s)=>p==='game.js'?s.replace('  if(!initialLoadComplete)return;','  if(!initialLoadComplete)return; window.testConfirmedJ=String(state.joules); throw new Error("post-checkpoint UI failure");'):s});
 try{await committed.page.goto(committed.url);await committed.page.waitForFunction(()=>window.testConfirmedJ!==undefined&&WIS_BOOT.diagnostics().failed);
  const result=await committed.page.evaluate(async key=>{
   const store=await SessionStore.open({name:key+'-session-v2'});
   try{
    const data=await store.load(),checkpoint=data.slots[data.active].checkpoint;
    const durable=WIS.Simulation.WorkerProtocol.decode(checkpoint).engine.snapshot.domain;
    return {actual:String(WIS.Game.getState().joules),confirmed:testConfirmedJ,disk:String(durable.core.resources.joules),allowed:WIS.Game.canPerformSavedAction()};
   }finally{store.close();}
  },key);
  assert.equal(result.actual,result.confirmed,'a presentation failure preserves the last confirmed live assets');assert.equal(result.disk,result.confirmed);assert.equal(result.allowed,false);
 }finally{await committed.close();}
 console.log('PASS staged startup, saved-action/pagehide gate, single registration and stage failure protection');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
