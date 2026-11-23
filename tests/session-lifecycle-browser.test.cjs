 'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {host,launch}=require('./startup-browser-helpers.cjs');
const {setup75}=require('./amount-fixture.cjs');
const {W}=setup75({targetSchema:76});
function raw(){const s=W.Core.State.fresh();s.joules=W.Core.BigNum.BN(1000);s.power=W.Core.BigNum.BN(10);s.lastUpdateAt=Date.now();Object.assign(s.core.runtime.timeLedger,{boundaryAt:s.lastUpdateAt,registeredUntil:s.lastUpdateAt,awaySince:null,pendingContinuousTime:[],pendingDiscard:null});return JSON.stringify(W.Core.Save.envelope(s,false,{offlineRecoveryOverride:null}));}
function transform(p,s){if(p!=='game.js')return s;assert(s.includes('  session=WIS.Simulation.SessionClient.create('),'session creation anchor');return s.replace('  session=WIS.Simulation.SessionClient.create(',`  window.__commands=[];const originalSessionControllerCreate=AsyncSessionController.create;AsyncSessionController.create=options=>{const c=originalSessionControllerCreate(options),send=c.command;c.command=body=>{const row={type:body.type};window.__commands.push(row);return send(body).then(value=>{row.done=true;return value;},error=>{row.error=error.message;throw error;});};return c;};
  session=WIS.Simulation.SessionClient.create(`).replace('const UI = WIS.UI.App.create({','window.__session=session;const UI = WIS.UI.App.create({');}
async function fixture(t){const b=await launch(),h=await host(b,{raw:raw(),width:1280,transform});t.after(async()=>{await h.close();await b.close();});await h.page.goto(h.url);await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready&&WIS.Game.getState().totalElapsedSeconds>1&&!__session.status().locked&&!__session.busy(),null,{timeout:20000});await h.page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__hidden===true});window.__commands.length=0;});return h;}

test('session update check, debug speed, exit failure and picker retry follow durable state',async t=>{
 const browser=await launch();t.after(()=>browser.close());
 const h=await host(browser,{before:()=>{
   window.alert=()=>{};window.nativeEvents={};window.versionChecks=0;
   window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{
     addListener:async(name,fn)=>{nativeEvents[name]=fn;},exitApp:async()=>{throw Error('test exit failure');},
     getState:async()=>({isActive:true}),getInfo:async()=>{window.versionChecks++;return {build:'30000'};}
   }}};
 },transform:(file,src)=>file==='game.js'?src.replace('  session=WIS.Simulation.SessionClient.create(',`
  const originalOpen=SessionStore.open;
  SessionStore.open=async options=>{
    const store=await originalOpen(options),append=store.append;
    store.append=async message=>{
      if(window.failRelease&&message.body.type==='importRelease'){window.failRelease=false;throw Error('temporary storage failure');}
      return append(message);
    };
    return store;
  };
  window.auditSession=session=WIS.Simulation.SessionClient.create(`):src});
 t.after(h.close);
 const page=h.page;
 const manifest={...require('../latest.json'),version:'0.3.0.1',versionCode:30001};
 await page.route('**/latest.json',route=>route.fulfill({json:manifest}));
 await page.goto(h.url);
 await page.waitForFunction(()=>window.WIS_BOOT?.diagnostics().ready&&window.auditSession?.view()?.onlineSettled&&versionChecks===1);
 await page.waitForSelector('#app-download-dialog[open]');
 assert.match(await page.locator('#app-download-title').innerText(),/0\.3\.0\.1/);
 await page.locator('#app-update-later').click();
 await page.evaluate(()=>document.getElementById('debug-speed-button').click());
 await page.waitForFunction(()=>auditSession.view().devSpeed===5&&document.getElementById('debug-speed-button').dataset.multiplier==='5');
 await page.evaluate(async()=>{await nativeEvents.backButton();await nativeEvents.backButton();});
 await page.waitForFunction(()=>!auditSession.view().frozen&&!auditSession.status().locked);
 const before=await page.evaluate(()=>WIS.Game.getState().totalElapsedSeconds);
 await page.waitForFunction(before=>WIS.Game.getState().totalElapsedSeconds>before,before);
 await page.evaluate(()=>{document.getElementById('import-file').click=()=>{};document.getElementById('import-save').click();});
 await page.waitForFunction(()=>auditSession.view().importHeld);
 await page.evaluate(()=>{window.failRelease=true;document.getElementById('import-file').dispatchEvent(new Event('cancel'));});
 await page.waitForFunction(()=>!window.failRelease&&document.getElementById('save-failure-message').textContent.includes('尚未解除'));
 assert(await page.evaluate(()=>auditSession.view().importHeld&&auditSession.busy()));
 await page.evaluate(()=>document.getElementById('retry-failed-save').click());
 await page.waitForFunction(()=>!auditSession.view().importHeld&&!auditSession.busy());
 assert.equal(await page.evaluate(()=>auditSession.preference('theme','dark')),'dark');
 assert.equal(await page.evaluate(()=>versionChecks),1);
 assert.deepEqual(h.errors,[]);
});

async function visibility(h,hidden){await h.page.evaluate(hidden=>{window.__hidden=hidden;document.dispatchEvent(new Event('visibilitychange'));},hidden);}
async function frozen(h){await h.page.waitForFunction(()=>__session.view().frozen&&__session.view().snapshot.domain.core.runtime.timeLedger.awaySince!==null);}
async function returned(h){await h.page.waitForFunction(()=>!__session.view().frozen&&!__session.status().locked&&__session.view().snapshot.domain.core.runtime.timeLedger.awaySince===null);await h.page.evaluate(()=>WIS.Game.actions.save());}
async function clean(h){const result=await h.page.evaluate(()=>({failed:__commands.filter(x=>x.error),save:WIS.Core.Save.status(),diagnostics:WIS.Core.Save.diagnostics()}));assert.deepEqual(result.failed,[]);assert.deepEqual(h.errors,[]);assert.equal(result.save.unsaved,false);assert.deepEqual(result.diagnostics,[]);}
test('browser repeated hidden events preserve away boundary without rejected cancellation',async t=>{const h=await fixture(t);await visibility(h,true);await frozen(h);const away=await h.page.evaluate(()=>__session.view().snapshot.domain.core.runtime.timeLedger.awaySince);await visibility(h,true);await h.page.waitForTimeout(200);assert.equal(await h.page.evaluate(()=>__session.view().snapshot.domain.core.runtime.timeLedger.awaySince),away);await visibility(h,false);await returned(h);await clean(h);});
test('native inactivity preceding web visibility stops periodic clocks and resumes once visible',async t=>{const h=await fixture(t);await h.page.evaluate(()=>__session.nativeActive(false));await frozen(h);await h.page.waitForTimeout(350);await visibility(h,true);await visibility(h,false);await h.page.waitForTimeout(150);assert.equal(await h.page.evaluate(()=>__session.view().frozen),true);await h.page.evaluate(()=>__session.nativeActive(true));await returned(h);await clean(h);});
test('rapid hide-return-hide retires stale recovery continuation',async t=>{const h=await fixture(t);await visibility(h,true);await frozen(h);await h.page.evaluate(()=>{window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));});await h.page.waitForTimeout(300);await frozen(h);await visibility(h,false);await returned(h);await clean(h);});

async function auditPage(t, {hidden=false,seed}={}) {
 const browser=await launch();
 const h=await host(browser,{raw:seed,width:1280, before:hidden?()=>{
   window.__hidden=true;
   Object.defineProperty(document,'hidden',{get:()=>window.__hidden});
 }:undefined, transform(file,source){
   return transform(file,source).replace('  } = UI);','  } = UI); window.testUI = UI.__test;');
 }});
 t.after(async()=>{await h.close();await browser.close();});
 await h.page.goto(h.url);
 await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
 return h;
}

test('hidden boot defers recovery until visible',async t=>{
 const h=await auditPage(t,{hidden:true});
 await frozen(h);
 await h.page.evaluate(()=>WIS.Game.actions.save());
 assert.equal(await h.page.evaluate(()=>__commands.filter(c=>c.type==='recovery').length),0);
 await visibility(h,false);
 await returned(h);
 assert.equal(await h.page.evaluate(()=>__commands.filter(c=>c.type==='recovery').length),1);
 await clean(h);
});

test('imports revalidate the statistics page and three-deficiencies rewards survive both resets',async t=>{
 const {page,errors}=await auditPage(t);
 await page.evaluate(()=>{
  const now=Date.now();
  Date.now=()=>now;
  window.confirm=()=>true;
  window.importFixture=async unlocked=>{
   const s=WIS.Core.State.fresh();
   s.lastUpdateAt=Date.now();
   s.cultivation.active='immortal';
   s.qiRefiningUnlocked=true;
   s.foundationUnlocked=true;
   s.goldenCoreUnlocked=true;
   s.advancedRealmLevel=1;
   s.unlockedAchievements.threeDeficiencies=true;
   if(unlocked)s.unlockedAchievements.trainingUp=true;
   const text=JSON.stringify(WIS.Core.Save.envelope(s,false,{offlineRecoveryOverride:null}));
   await testUI.importSave({text:async()=>text});
  };
 });
 for(const [method,level] of [['scatterAndRebuild','scatterRebuildLevel'],['reincarnate','reincarnationLevel']]){
  await page.evaluate(()=>importFixture(true));
  const reward=await page.evaluate(async({method,level})=>{
   const ok=await __session.dispatch({type:'action',group:'immortal',method});
   const saved=WIS.Core.Save.prepare(JSON.parse(await __session.exportSave())).state;
   return {ok,level:saved[level],power:String(saved.power),highest:String(saved.highestPower),scale:saved.highestScaleIndex,
     expectedScale:WIS.Power.ScaleLogic.scaleIndexForPower(saved.power),total:String(saved.totalPower)};
  },{method,level});
  assert.deepEqual(reward,{ok:true,level:1,power:'1000',highest:'1000',scale:reward.expectedScale,expectedScale:reward.expectedScale,total:'1000'});
 }
 await page.locator('[data-page="statistics"]').click();
 await page.evaluate(()=>importFixture(true));
 assert(await page.locator('#statistics-page').evaluate(node=>node.classList.contains('active')));
 await page.evaluate(()=>importFixture(false));
 assert(await page.locator('#actions-page').evaluate(node=>node.classList.contains('active')));
 assert.deepEqual(errors,[]);
});

test('compensation shows the confirmed seconds and converts a paused queue once',async t=>{
 const {page,errors}=await auditPage(t);
 await page.evaluate(async()=>{
  const now=Date.now();Date.now=()=>now;
  const s=WIS.Core.State.fresh();s.lastUpdateAt=now;
  const debt={version:2,numericModelVersion:2,settlementRule:4,offlineSegmentSeconds:60,paused:true,pauseReason:{reason:'player-paused'},
   tasks:[{id:'segment-1',source:'offline',compensationEligible:false,randomMode:'state',speed:1,sealed:true,clockCursor:0,gameSeconds:60,clockSeconds:60,logicalTickRemaining:0}]};
  const text=JSON.stringify(WIS.Core.Save.envelope(s,false,{offlineRecoveryOverride:debt}));
  await testUI.importSave({text:async()=>text});
  const button=document.getElementById('convert-offline-progress');button.click();button.click();
 });
 await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('两倍在线收益额度'));
 const result=await page.evaluate(()=>({pending:__session.status().pendingGameSeconds,balance:__session.view().snapshot.domain.core.runtime.compensation.balance}));
 assert.deepEqual(result,{pending:0,balance:60});
 assert.deepEqual(errors,[]);
});

test('store isolates corrupt inactive commands, retains their row, and rejects corrupt active commands',async t=>{
 const {page}=await auditPage(t);
 const result=await page.evaluate(async()=>{
  const name='audit-slots',store=await SessionStore.open({name});
  const slot=()=>({initial:'{}',revision:0,nextSeq:1,journal:[]});
  await store.load();
  await store.write({active:'current',epoch:1,slots:{old:slot(),current:slot()}});
  const db=await new Promise(resolve=>{const r=indexedDB.open(name);r.onsuccess=()=>resolve(r.result);});
  async function corrupt(id){
   const tx=db.transaction('kv','readwrite'),kv=tx.objectStore('kv'),key='slot/'+id+'/commands',r=kv.get(key);
   r.onsuccess=()=>kv.put({...r.result,hash:'invalid'},key);
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=reject;});
  }
  await corrupt('old');
  const loaded=await store.load();
  await store.write(loaded);
  const row=await new Promise(resolve=>{const r=db.transaction('kv').objectStore('kv').get('slot/old/commands');r.onsuccess=()=>resolve(r.result);});
  await corrupt('current');
  let reason;try{await store.load();}catch(e){reason=e.message;}
  db.close();store.close();
  return {active:loaded.active,slots:Object.keys(loaded.slots),oldHash:row.hash,reason};
 });
 assert.deepEqual(result,{active:'current',slots:['current'],oldHash:'invalid',reason:'command integrity'});
});

test('hidden startup preserves queued offline time and settles it after returning',async t=>{
 const s=W.Core.State.fresh(),now=Date.now();
 s.lastUpdateAt=now;
 Object.assign(s.core.runtime.timeLedger,{registeredUntil:now,boundaryAt:now,awaySince:null});
 const recovery={version:2,numericModelVersion:2,settlementRule:4,offlineSegmentSeconds:60,
  tasks:[{id:'segment-1',source:'offline',compensationEligible:false,randomMode:'state',speed:1,sealed:true,clockCursor:0,gameSeconds:60,clockSeconds:60,logicalTickRemaining:0}]};
 const seed=JSON.stringify(W.Core.Save.envelope(s,false,{offlineRecoveryOverride:recovery}));
 const h=await auditPage(t,{hidden:true,seed});
 await frozen(h);
 assert((await h.page.evaluate(()=>__session.status().pendingGameSeconds))>=60);
 assert.equal(await h.page.evaluate(()=>__commands.filter(c=>c.type==='recovery').length),0);
 await visibility(h,false);
 await h.page.waitForFunction(()=>!__session.view().frozen && __session.status().pendingGameSeconds===0 && WIS.Game.getState().totalElapsedSeconds>=60);
 await returned(h);
 assert((await h.page.evaluate(()=>WIS.Game.getState().totalElapsedSeconds))>=60);
 await clean(h);
});

test('cancelling the picker while hidden preserves the same convertible time as hiding after release',async t=>{
 const browser=await launch();t.after(()=>browser.close());
 const state=W.Core.State.fresh(),start=1800000000000;
 state.lastUpdateAt=start;
 Object.assign(state.core.runtime.timeLedger,{registeredUntil:start,boundaryAt:start,awaySince:null});
 const debt={version:2,numericModelVersion:2,settlementRule:4,offlineSegmentSeconds:60,paused:true,pauseReason:{reason:'player-paused'},
  tasks:[{id:'segment-1',source:'offline',compensationEligible:false,randomMode:'state',speed:1,sealed:true,clockCursor:0,gameSeconds:10,clockSeconds:10,logicalTickRemaining:0}]};
 const seed=JSON.stringify(W.Core.Save.envelope(state,false,{offlineRecoveryOverride:debt}));
 for(const hideDuringPicker of [false,true]){
  const h=await host(browser,{raw:seed,transform,before:()=>{
   window.testTime=1800000000000;Date.now=()=>testTime;
   Object.defineProperty(document,'hidden',{get:()=>window.__hidden===true});
  }});
  try{
   const p=h.page;await p.goto(h.url);await p.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
   await p.evaluate(()=>__session.save());
   await p.evaluate(()=>{document.querySelector('#import-file').click=()=>{};document.querySelector('#import-save').click();});
   await p.waitForFunction(()=>__session.view().importHeld);
   if(hideDuringPicker)await visibility(h,true);
   await p.evaluate(()=>{testTime+=1000;document.querySelector('#import-file').dispatchEvent(new Event('cancel'));});
   await p.waitForFunction(()=>!__session.busy()&&!__session.view().importHeld);
   if(!hideDuringPicker)await visibility(h,true);
   await frozen(h);
   await p.evaluate(()=>testTime+=60000);await visibility(h,false);
   await p.waitForFunction(()=>!__session.view().frozen&&__session.status().pendingClockSeconds===71);
   const balance=await p.evaluate(async()=>{
    await WIS.Game.simulation.convertOfflineToCompensation();
    return WIS.Core.Save.prepare(JSON.parse(await __session.exportSave())).state.core.runtime.compensation.balance;
   });
   assert.equal(balance,71);assert.deepEqual(h.errors,[]);
  }finally{await h.close();}
 }
});

test('initial native inactivity freezes a visible document before the first online clock',async t=>{
 const browser=await launch();t.after(()=>browser.close());
 const h=await host(browser,{transform,before:()=>{
  window.alert=()=>{};window.nativeEvents={};
  window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{
   addListener:async(name,fn)=>{nativeEvents[name]=fn;},exitApp:async()=>{},
   getInfo:async()=>({build:'30000'}),getState:async()=>({isActive:false})
  }}};
 }});
 t.after(h.close);await h.page.route('**/latest.json',route=>route.abort());await h.page.goto(h.url);
 await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
 assert(await h.page.evaluate(()=>!document.hidden&&__session.view().frozen));
 assert.equal(await h.page.evaluate(()=>__commands.filter(c=>c.type==='clock'||c.type==='recovery').length),0);
 await h.page.evaluate(()=>nativeEvents.appStateChange({isActive:true}));await returned(h);
 await h.page.waitForFunction(()=>__session.view().onlineSettled);await clean(h);
});

test('settings and reset feedback reflect the confirmed session and any mirror error',async t=>{
 const browser=await launch();t.after(()=>browser.close());
 const s=W.Core.State.fresh();s.lastUpdateAt=Date.now();s.autoCloseOfflineDialogEnabled=false;
 Object.assign(s.meta.infinity,{points:W.Core.BigNum.BN(1000),totalPointsEarned:W.Core.BigNum.BN(1000),unlocked:true,upgradesUnlocked:true});
 s.unlockedAchievements={scale2:true,mahayana:true,tree3:true};
 for(const id of ['B1-1','B1-2','B2','B3-1','B3-2','B4','B5-1','B5-2','B6','C1','C2'])W.Meta.Infinity.purchase(s,id);
 const h=await host(browser,{width:1280,raw:JSON.stringify(W.Core.Save.envelope(s,false,{offlineRecoveryOverride:null})),transform(file,source){
  if(file!=='game.js')return source;
  return transform(file,source).replace('  session=WIS.Simulation.SessionClient.create(',`
   const openStore=SessionStore.open;
   SessionStore.open=async options=>{
    const store=await openStore(options),append=store.append;
    store.append=message=>{
     if(window.rejectSetting&&message.body.type==='preference'){window.rejectSetting=false;throw Error('test preference rejected');}
     return append(message);
    };
    return store;
   };
   session=WIS.Simulation.SessionClient.create(`);
 }});
 t.after(h.close);const p=h.page;await p.goto(h.url);await p.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
 await p.waitForFunction(()=>__commands.some(c=>c.type==='save'&&c.done));
 assert.doesNotMatch(await p.locator('#notice').textContent(),/\[object Object\]/);
 await p.locator('#open-settings').click();await p.locator('#open-automation-manager').click();
 await p.evaluate(()=>window.rejectSetting=true);
 const select=p.locator('#cultivation-automation-target');await select.selectOption('immortal');
 await p.waitForFunction(()=>document.querySelector('#notice').textContent.includes('test preference rejected'));
 assert.equal(await select.inputValue(),'');
 await select.selectOption('immortal');
 await p.waitForFunction(()=>document.querySelector('#notice').textContent.includes('自动选择体系已保存'));
 assert.equal(await p.evaluate(()=>WIS.Game.getState().cultivationAutomationTarget),'immortal');
 await p.evaluate(()=>{for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();});
 await p.locator('#open-settings').click();
 await p.evaluate(()=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,text){if(window.failMirror&&key===WIS.Core.Config.saveKey)throw Error('test mirror unavailable');return original.call(this,key,text);};
  window.failMirror=true;
 });
 await p.locator('#auto-close-offline-toggle').click();
 await p.waitForFunction(()=>document.querySelector('#notice').textContent.includes('存档副本尚未确认'));
 assert(await p.evaluate(()=>WIS.Game.getState().autoCloseOfflineDialogEnabled&&WIS.Core.Save.status().unsaved));
 await p.evaluate(async()=>{window.failMirror=false;await __session.save();window.confirm=()=>true;});
 await p.locator('#reset-game').click();
 await p.waitForFunction(()=>!document.querySelector('#settings-dialog').open&&document.querySelector('#notice').textContent==='游戏已重置');
 assert.equal(await p.evaluate(()=>WIS.Game.getState().cultivationAutomationTarget),'');
 assert.deepEqual(h.errors,[]);
});

function fourthAuditSave({seconds=0,paused=false,theme='light'}={}){
 const state=W.Core.State.fresh(),now=1800000000000;
 state.lastUpdateAt=now;state.theme=theme;state.autoCloseOfflineDialogEnabled=false;
 Object.assign(state.core.runtime.timeLedger,{registeredUntil:now,boundaryAt:now,awaySince:null});
 const recovery=seconds?{version:2,numericModelVersion:2,settlementRule:4,offlineSegmentSeconds:60,
  paused,pauseReason:paused?{reason:'player-paused'}:null,
  tasks:[{id:'segment-1',source:'offline',compensationEligible:false,randomMode:'state',speed:1,sealed:true,clockCursor:0,gameSeconds:seconds,clockSeconds:seconds,logicalTickRemaining:0}]}:null;
 return JSON.stringify(W.Core.Save.envelope(state,false,{offlineRecoveryOverride:recovery}));
}

async function fourthAuditPage(t,seed,native=false,instrument=transform){
 const b=await launch();
 const h=await host(b,{raw:seed,width:1280,transform:instrument,before:()=>{
  window.testTime=1800000000000;Date.now=()=>testTime;
  const put=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(window.rejectMirror&&key===WIS.Core.Config.saveKey)throw Error('test mirror unavailable');
   return put.call(this,key,value);
  };
 }});
 t.after(async()=>{await h.close();await b.close();});
 if(native){
  await h.page.addInitScript(()=>{
   window.alert=()=>{};window.appEvents={};
   window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{
    addListener:async(k,fn)=>{appEvents[k]=fn;},getState:async()=>({isActive:true}),
    getInfo:async()=>({build:'30000'}),exitApp:async()=>{}
   }}};
  });
  await h.page.route('**/latest.json',r=>r.abort());
 }
 await h.page.goto(h.url);await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready);
 await h.page.evaluate(()=>__session.save());
 return h;
}

test('failed mirror on native departure preserves the away interval across periodic and explicit saves',async t=>{
 const h=await fourthAuditPage(t,fourthAuditSave({seconds:10,paused:true}),true),p=h.page;
 await p.evaluate(()=>{window.rejectMirror=true;appEvents.appStateChange({isActive:false});});
 await p.waitForFunction(()=>__session.view().frozen&&WIS.Core.Save.status().unsaved);
 await p.evaluate(()=>{window.rejectMirror=false;testTime+=5000;});
 await p.waitForTimeout(5100);
 await p.evaluate(()=>__session.save());
 const snapshot=await p.evaluate(()=>{
  const saved=WIS.Core.Save.prepare(JSON.parse(__session.exportConfirmedSave()));
  return {away:saved.state.core.runtime.timeLedger.awaySince,debt:saved.offlineRecovery.tasks[0].clockSeconds,frozen:__session.view().frozen};
 });
 assert.deepEqual(snapshot,{away:1800000000000,debt:10,frozen:true});
 await p.evaluate(()=>{testTime+=55000;appEvents.appStateChange({isActive:true});});
 await p.waitForFunction(()=>!__session.view().frozen&&__session.status().pendingClockSeconds===70);
 const balance=await p.evaluate(async()=>{
  await WIS.Game.simulation.convertOfflineToCompensation();
  return WIS.Core.Save.prepare(JSON.parse(await __session.exportSave())).state.core.runtime.compensation.balance;
 });
 assert.equal(balance,70);assert.deepEqual(h.errors,[]);
});

test('rescue export uses the latest confirmed checkpoint without a write or a new time watermark',async t=>{
 const h=await fourthAuditPage(t,fourthAuditSave({theme:'dark'})),p=h.page;
 await p.evaluate(async()=>{
  window.testTime+=30;
  await __session.save();
  await __session.preference('theme','light');
  const write=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(stores,mode,...args){
   if(mode==='readwrite')throw Error('test storage is read-only');
   return write.call(this,stores,mode,...args);
  };
  window.testTime+=60000;
  try{await __session.save();}catch{}
 });
 await p.locator('#export-unsaved-progress').click();
 assert.equal(await p.locator('#save-export-title').textContent(),'导出最近已确认进度');
 const result=await p.evaluate(()=>{
  const raw=JSON.parse(document.querySelector('#save-export-text').value),saved=WIS.Core.Save.prepare(raw).state;
  const ledger=__session.view().snapshot.domain.core.runtime.timeLedger;
  return {theme:saved.theme,oldTheme:WIS.Core.Save.prepare(JSON.parse(localStorage.getItem(WIS.Core.Config.saveKey))).state.theme,
   time:saved.lastUpdateAt,checkpoint:__session.view().now,intervals:saved.core.runtime.timeLedger.pendingContinuousTime,confirmedIntervals:ledger.pendingContinuousTime};
 });
 assert.equal(result.theme,'light');assert.equal(result.oldTheme,'dark');assert.equal(result.time,result.checkpoint);
 assert.equal(result.intervals[0].clock,.03);assert.deepEqual(result.intervals,result.confirmedIntervals);
 assert.deepEqual(h.errors,[]);
});

test('import scopes completion reports to the save and surfaces mirror failures for imports and theme changes',async t=>{
 const h=await fourthAuditPage(t,fourthAuditSave({seconds:60,theme:'dark'})),p=h.page;
 await p.waitForFunction(()=>document.querySelector('#offline-progress-dialog').open&&!document.querySelector('#offline-complete-panel').hidden);
 const oldReport=await p.locator('#offline-progress-summary').textContent();
 await p.locator('#open-settings').click();
 const cancelled=p.waitForEvent('filechooser');await p.locator('#import-save').click();await cancelled;
 await p.evaluate(()=>document.querySelector('#import-file').dispatchEvent(new Event('cancel')));
 await p.waitForFunction(()=>!__session.busy()&&document.querySelector('#offline-progress-dialog').open);
 assert.equal(await p.locator('#offline-progress-summary').textContent(),oldReport);
 await p.evaluate(()=>{window.rejectMirror=true;});
 const picker=p.waitForEvent('filechooser');await p.locator('#import-save').click();
 await(await picker).setFiles({name:'fresh.json',mimeType:'application/json',buffer:Buffer.from(fourthAuditSave())});
 await p.waitForFunction(()=>document.querySelector('#notice').textContent.includes('存档已导入，兼容副本尚未确认'));
 assert(await p.evaluate(()=>!document.querySelector('#offline-progress-dialog').open&&WIS.Game.getState().totalElapsedSeconds===0));
 await p.evaluate(async()=>{window.rejectMirror=false;await __session.save();window.rejectMirror=true;});
 await p.locator('#open-settings').click();await p.locator('.theme-options label').filter({hasText:'黑'}).click();
 await p.waitForFunction(()=>document.querySelector('#notice').textContent.includes('设置已生效，但存档副本尚未确认'));
 assert.equal(await p.evaluate(()=>WIS.Game.getState().theme),'dark');
 await p.evaluate(async()=>{window.rejectMirror=false;await __session.save();});
 assert.equal(await p.evaluate(()=>WIS.Core.Save.prepare(JSON.parse(localStorage.getItem(WIS.Core.Config.saveKey))).state.theme),'dark');
 assert.deepEqual(h.errors,[]);
});

for(const periodic of [false,true])test('replays rejected departure before '+(periodic?'periodic save and duplicate foreground returns':'foreground return and later distinct away intervals'),async t=>{
 const h=await fourthAuditPage(t,fourthAuditSave({seconds:10,paused:true}),true,(file,src)=>{
  const code=transform(file,src);
  if(file!=='game.js')return code;
  return code.replace('  session=WIS.Simulation.SessionClient.create(',`
   const realOpen=SessionStore.open;
   SessionStore.open=async options=>{
    const store=await realOpen(options),append=store.append;
    store.append=async row=>{
     if(row.body.type===window.rejectEdge){window.rejectEdge=null;throw Error('rejected lifecycle '+row.body.type);}
     return append(row);
    };
    return store;
   };
   session=WIS.Simulation.SessionClient.create(`);
 });
 const p=h.page;
 await p.evaluate(()=>{window.rejectEdge='freeze';appEvents.appStateChange({isActive:false});});
 await p.waitForFunction(()=>__commands.some(c=>c.type==='freeze'&&c.error));
 await p.evaluate(async periodic=>{
  testTime+=5000;
  if(periodic){
   await __session.save();
   appEvents.appStateChange({isActive:false});
  }
 },periodic);
 if(periodic)assert.equal(await p.evaluate(()=>__session.view().snapshot.domain.core.runtime.timeLedger.awaySince),1800000000000);
 await p.evaluate(()=>{testTime+=55000;appEvents.appStateChange({isActive:true});appEvents.appStateChange({isActive:true});});
 await p.waitForFunction(()=>__commands.some(c=>c.type==='return'&&c.done));
 await p.evaluate(()=>__session.save());
 assert.equal(await p.evaluate(()=>__session.status().pendingClockSeconds),70);
 if(!periodic){
  await p.evaluate(()=>{testTime+=20000;appEvents.appStateChange({isActive:false});});
  await frozen(h);
  await p.evaluate(()=>{testTime+=3000;window.rejectEdge='return';appEvents.appStateChange({isActive:true});});
  await p.waitForFunction(()=>__commands.some(c=>c.type==='return'&&c.error));
  // Another departure arrives before the previous failed return was retried.
  await p.evaluate(()=>{testTime+=4000;appEvents.appStateChange({isActive:false});testTime+=2000;appEvents.appStateChange({isActive:true});});
  await p.evaluate(()=>__session.save());
 }
 const balance=await p.evaluate(async()=>{
  await WIS.Game.simulation.convertOfflineToCompensation();
  return WIS.Core.Save.prepare(JSON.parse(await __session.exportSave())).state.core.runtime.compensation.balance;
 });
 assert.equal(balance,periodic?70:75);assert.deepEqual(h.errors,[]);
});
