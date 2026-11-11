'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {launch,host,key}=require('./startup-browser-helpers.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
test('live queued publication follows current owner; failed explicit save remains synchronous and retryable',async()=>{
 const browser=await launch();let h;
 try{
  const raw=readFixture('high-training'),now=1794402000000;raw.data.core.runtime.lastUpdateAt=now;Object.assign(raw.data.core.runtime.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]});
  h=await host(browser,{raw:JSON.stringify(raw),before:()=>{Date.now=()=>1794402000000;},transform:(p,s)=>p==='game.js'?`window.renderProbe=[];const _ui=WIS.UI.App;WIS.UI.App={..._ui,create(c){const ui=_ui.create(c);return {...ui,render(...args){renderProbe.push(String(WIS.Core.Runtime.getState().power));return ui.render(...args);}};}};`+s:s});
  await h.page.goto(h.url);await h.page.waitForFunction(()=>window.WIS_BOOT?.diagnostics().ready);
  await h.page.waitForFunction(()=>['conversion-preview','breathing-preview'].every(id=>document.getElementById(id).textContent.includes('最终获取')),null,{timeout:20000});
  const result=await h.page.evaluate(async key=>{
   const W=WIS,R=W.Core.Runtime,S=W.Core.State,serial=()=>JSON.stringify(S.toSerializable(R.getState()));
   const count=renderProbe.length;
   R.call('renderAfterAction','actions');R.call('renderAfterAction','actions');
   const immediate=renderProbe.length-count;
   const next=S.cloneForSimulation(R.getState());W.Core.Resources.replaceExact('core.power','12345',next);R.setState(next);
   const stateBefore=serial(),storedBefore=localStorage.getItem(key),original=Storage.prototype.setItem;
   let synchronousFailure=false;
   Storage.prototype.setItem=function(k,v){if(k===key)throw Error('injected main write failure');return original.call(this,k,v);};
   try{W.Game.actions.save();}catch(e){synchronousFailure=/injected/.test(e.message);}finally{Storage.prototype.setItem=original;}
   const failedPreserved=localStorage.getItem(key)===storedBefore&&serial()===stateBefore&&W.Core.Save.status().unsaved;
   await new Promise(resolve=>setTimeout(resolve,30));
   const draws=renderProbe.slice(count),afterDraw=serial()===stateBefore;
   W.Game.actions.save();const loaded=W.Core.Save.prepare(JSON.parse(localStorage.getItem(key))).state;
   return {immediate,synchronousFailure,failedPreserved,draws,afterDraw,saved:String(loaded.power),unsaved:W.Core.Save.status().unsaved};
  },key);
  assert.equal(result.immediate,0);assert(result.synchronousFailure);assert(result.failedPreserved);assert(result.afterDraw);assert.deepEqual(result.draws,['12345']);assert.equal(result.saved,'12345');assert.equal(result.unsaved,false);assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await browser.close();}
});
