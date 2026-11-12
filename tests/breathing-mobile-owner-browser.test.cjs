"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const {host,launch}=require('./startup-browser-helpers.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
function rawSave(){const raw=readFixture('breathing-mobile'),now=Date.now();raw.data.core.runtime.lastUpdateAt=now;Object.assign(raw.data.core.runtime.timeLedger,{awaySince:null,boundaryAt:now,registeredUntil:now});raw.data.core.resources.joules='1000000';return JSON.stringify(raw);}
const probe=(p,s)=>p==='game.js'?`const app=WIS.UI.App;WIS.UI.App={...app,create(c){window.testContext=c;return window.testUI=app.create(c);}};`+s:s;
test('repeated touch while breathing owns a real player candidate preserves inputs and commits once',async()=>{
 const browser=await launch();let h;
 try{h=await host(browser,{raw:rawSave(),touch:true,transform:(p,s)=>{
  if(p==='js/cultivation/immortal-logic.js')s=s.replace('return createManualManaActionWork(original, performBreathing, "吐纳");',`const job=createManualManaActionWork(original,performBreathing,"吐纳");window.actionStarts=(window.actionStarts||0)+1;return {...job,waiting:()=>window.holdBreathing===true,advance(...args){return window.holdBreathing?{done:false}:job.advance(...args)},commit(){window.actionCommits=(window.actionCommits||0)+1;return job.commit();}};`);
  return probe(p,s);
 }});await h.page.goto(h.url);await h.page.waitForFunction(()=>window.WIS_BOOT?.diagnostics().ready);
 await h.page.locator('#breathing-button').scrollIntoViewIfNeeded();await h.page.evaluate(()=>window.holdBreathing=true);await h.page.locator('#breathing-button').tap();
 await h.page.waitForFunction(()=>testContext.isDeferredActionPending()&&WIS.Game.getState().core.runtime.timeLedger.pendingDiscard?.clock>0);
 const before=await h.page.evaluate(()=>{window.actionOwner=WIS.Game.getState();return {mana:String(actionOwner.mana),j:String(actionOwner.joules)};});
 await h.page.locator('#breathing-button').tap();
 const after=await h.page.evaluate(()=>({pending:testContext.isDeferredActionPending(),same:actionOwner===WIS.Game.getState(),j:String(WIS.Game.getState().joules),m:String(WIS.Game.getState().mana),busy:document.getElementById('breathing-button').getAttribute('aria-busy'),text:document.getElementById('breathing-button').textContent}));
 assert(after.pending&&after.same,'rejected second tap must not replace the pending action input');assert.equal(after.j,before.j);assert.equal(after.m,before.mana);assert.equal(after.busy,'true');assert.match(after.text,/计算/);
 await h.page.evaluate(()=>window.holdBreathing=false);await h.page.waitForFunction(()=>!testContext.isDeferredActionPending(),null,{timeout:15000});
 const result=await h.page.evaluate(()=>{const W=WIS,s=W.Game.getState(),mana=String(s.mana);W.Game.actions.save();const loaded=W.Core.Save.prepare(JSON.parse(localStorage.getItem('wis-infinite-power-save-v2'))).state;return {starts:actionStarts,commits:actionCommits,mana,saved:String(loaded.mana),stopped:W.Game.getSettlementStatus().stopped};});
 assert.equal(result.starts,1);assert.equal(result.commits,1);assert(Number(result.mana)>Number(before.mana));assert.equal(result.saved,result.mana);assert.equal(result.stopped,false);assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await browser.close();}
});
for(const cpu of [1,8])test(`real mobile taps with live main loop and CPU ${cpu}`,async()=>{
 const browser=await launch();let h;const timings=[];
 try{h=await host(browser,{raw:rawSave(),touch:true,transform:probe});const cdp=await h.page.context().newCDPSession(h.page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});await h.page.goto(h.url);await h.page.waitForFunction(()=>window.WIS_BOOT?.diagnostics().ready);await h.page.locator('#breathing-button').scrollIntoViewIfNeeded();
 for(let i=0;i<3;i++){
 await h.page.waitForFunction(()=>!testContext.isDeferredActionPending()&&WIS.Core.BigNum.gte(WIS.Game.getState().joules,10000),null,{timeout:20000});const before=await h.page.evaluate(()=>String(WIS.Game.getState().mana)),start=performance.now();await h.page.locator('#breathing-button').tap();
 if(i===0){await h.page.waitForTimeout(160);await h.page.locator('#breathing-button').tap();}
 try{await h.page.waitForFunction(m=>!testContext.isDeferredActionPending()&&WIS.Core.BigNum.gt(WIS.Game.getState().mana,m),before,{timeout:20000});}
 catch(error){console.log(JSON.stringify({cpu,iteration:i,before,elapsedMs:Math.round(performance.now()-start),failure:await h.page.evaluate(()=>({pending:testContext.isDeferredActionPending(),mana:String(WIS.Game.getState().mana),j:String(WIS.Game.getState().joules),status:WIS.Game.getSettlementStatus(),button:document.getElementById('breathing-button').textContent,notice:document.getElementById('notice')?.textContent})),errors:h.errors}));throw error;}
 timings.push(Math.round(performance.now()-start));
 }assert.deepEqual(h.errors,[]);console.log(JSON.stringify({cpu,tapCompletionMs:timings}));
 }finally{await h?.close();await browser.close();}
});
