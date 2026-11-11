'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {launch,host}=require('./startup-browser-helpers.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
test('real worker exact action, responsive settings, invalidation and stale-owner invalidation',async()=>{
 const browser=await launch();let h;
 try{
  const raw=readFixture('high-training'),now=1794402000000;raw.data.core.runtime.lastUpdateAt=now;Object.assign(raw.data.core.runtime.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]});
  h=await host(browser,{raw:JSON.stringify(raw),before:()=>{Date.now=()=>1794402000000;},transform:(p,s)=>p==='game.js'?`const _app=WIS.UI.App;WIS.UI.App={..._app,create(c){window.mathContext=c;return _app.create(c);}};
  const _math=WIS.Simulation.MathWorker;window.mathRuns={started:0,local:0};WIS.Simulation.MathWorker={createWork(k,s,r,o){mathRuns.started++;return _math.createWork(k,s,r,{...o,local(){mathRuns.local++;return o.local();}});}};`+s:s});
  await h.page.goto(h.url);await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
  await h.page.locator('#open-settings').click();assert(await h.page.locator('#settings-dialog').isVisible());await h.page.locator('#close-settings').click();
  await h.page.waitForFunction(()=>['conversion-preview','breathing-preview'].every(id=>document.getElementById(id).textContent.includes('最终获取')),null,{timeout:20000});
  assert((await h.page.evaluate(()=>mathRuns.started))>=2);assert.equal(await h.page.evaluate(()=>mathRuns.local),0,'unexpected local fallback');
  const result=await h.page.evaluate(async()=>{
   const W=WIS,R=W.Core.Runtime,S=W.Core.State,serial=s=>JSON.stringify(S.toSerializable(s)),baseline=S.cloneForSimulation(R.getState());
   mathContext.cancelDeferredAction?.();
   // Direct exact reference; restore the same domain before the real Loop request.
   const local=W.Power.ScaleLogic.createTrainingActionWork(R.getState(),true);while(!local.advance(Infinity,{maximumOperations:65536}).done){}local.commit();const expected=serial(R.getState());local.cancel();R.setState(S.cloneForSimulation(baseline));
   const answer=await mathContext.requestDeferredAction(s=>W.Power.ScaleLogic.createTrainingActionWork(s,true,{worker:true}));
   const actual=serial(R.getState());
   // Discard no domain fields in the equality check: RNG, treasure, TREE and clock included.
   const same=actual===expected;
   return {same,local:mathRuns.local};
  });assert(result.same,'formal Worker action differs from exact local action');assert.equal(result.local,0);
  const cancelled=await h.page.evaluate(async()=>{
   const W=WIS,R=W.Core.Runtime,S=W.Core.State,serial=()=>JSON.stringify(S.toSerializable(R.getState()));
   const state=R.getState();W.Core.Resources.replaceExact('core.joules','1e1365',state);
   const job=W.Power.ScaleLogic.createTrainingActionWork(state,false,{worker:true});job.advance(performance.now()+3);const before=serial();job.cancel();await new Promise(r=>setTimeout(r,100));if(serial()!==before)throw Error('cancel changed state');
   const stale=W.Power.ScaleLogic.createTrainingActionWork(state,false,{worker:true});stale.advance(performance.now()+3);R.setState(S.cloneForSimulation(state));let rejected=false;try{stale.advance(Infinity);}catch(_){rejected=true;}stale.cancel();
   return rejected;
  });assert(cancelled);
  assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await browser.close();}
});
