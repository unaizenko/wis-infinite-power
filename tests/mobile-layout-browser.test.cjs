'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {launch,host}=require('./startup-browser-helpers.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
for(const native of [false,true])test(`mobile layout and touch targets (${native?'native bridge':'web'})`,async()=>{
 const browser=await launch();let h;const failures=[],rows=[];
 try{
  const raw=readFixture('high-training'),now=1794402000000;raw.data.core.runtime.lastUpdateAt=now;Object.assign(raw.data.core.runtime.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]});delete raw.offlineRecovery;
  h=await host(browser,{raw:JSON.stringify(raw),touch:true,before:()=>{Date.now=()=>1794402000000;window.setInterval=()=>0;},transform:(p,s)=>p==='game.js'?`const _ui=WIS.UI.App;WIS.UI.App={..._ui,create(c){return window.mobileUI=_ui.create(c);}};`+s:s});
  if(native)await h.page.addInitScript(()=>{window.alert=()=>{};window.nativeListeners={};window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{addListener:async(k,fn)=>{nativeListeners[k]=fn;return {remove(){}};},getState:async()=>({isActive:true}),exitApp:async()=>{}},WisSaveExport:{saveText:async()=>({status:'cancelled'})}}};});
  await h.page.goto(h.url);await h.page.waitForFunction(()=>window.WIS_BOOT?.diagnostics().ready);await h.page.evaluate(()=>mobileUI.render({forceGlobal:true,forcePage:true}));
  if(native)await h.page.evaluate(()=>{const speed=document.getElementById('debug-speed-button'),debug=document.querySelector('.resource-debug-tools');if(speed)speed.hidden=true;if(debug)debug.hidden=true;});
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[360,300],[768,1024],[1280,800]]){
   await h.page.setViewportSize({width,height});
   for(const theme of ['light','dark']){
    const result=await h.page.evaluate(theme=>{
     document.documentElement.dataset.theme=theme;mobileUI.switchPage('actions');window.scrollTo(0,0);
     const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
     const panel=document.querySelector('.resource-panel'),nav=document.querySelector('.navigation'),settings=document.getElementById('open-settings'),scale=document.querySelector('.scale-progress');
     const buttons=[...nav.querySelectorAll('button')].filter(e=>!e.hidden);
     return {bodyWidth:document.documentElement.scrollWidth,resources:rect(panel),position:getComputedStyle(panel).position,navRows:new Set(buttons.map(e=>Math.round(e.getBoundingClientRect().y))).size,clipped:buttons.filter(e=>{const b=e.getBoundingClientRect(),n=nav.getBoundingClientRect();return b.left<n.left-1||b.right>n.right+1;}).map(e=>e.dataset.page),settings:rect(settings),scale:rect(scale),mainY:document.querySelector('.main-panel').getBoundingClientRect().y};
    },theme);rows.push({native,width,height,theme,...result});
    const tag=`${width}x${height}/${theme}`;
    if(result.bodyWidth>width+1)failures.push(tag+' page overflow');
    if(width<=900){
     if(result.navRows>2)failures.push(tag+' navigation too tall');
     if(result.clipped.length)failures.push(tag+' hidden navigation entries: '+result.clipped.join(','));
     if(result.settings.height<44||result.settings.width<44)failures.push(tag+' settings touch area');
     if(result.settings.y>result.scale.bottom||result.settings.bottom<result.scale.y)failures.push(tag+' settings displaced by compensation');
     if(height<=500&&result.position==='sticky')failures.push(tag+' short viewport blocked by sticky resources');
     if(width<=600&&height>500&&result.resources.height>height*.4+1)failures.push(tag+' resource panel too tall');
     if(width<=600&&height>500&&result.mainY>height*.85)failures.push(tag+' main content pushed below first screen');
    }
    await h.page.locator('#open-settings').click();
    const dialog=await h.page.evaluate(()=>{const d=document.getElementById('settings-dialog'),r=d.getBoundingClientRect(),b=d.querySelector('.settings-header button');return {top:r.top,bottom:r.bottom,overflow:d.scrollWidth-d.clientWidth,close:b.getBoundingClientRect().height};});
    if(dialog.top<0||dialog.bottom>height+1||dialog.overflow>1)failures.push(tag+' settings bounds');if(width<=900&&dialog.close<44)failures.push(tag+' close touch area');await h.page.locator('#close-settings').click();
   }
  }
  await h.page.setViewportSize({width:320,height:568});
  await h.page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('.navigation').scrollLeft=0;});
  assert.deepEqual(failures,[],'all unlocked navigation must be visible without horizontal swiping');
  const before=await h.page.evaluate(()=>JSON.stringify(WIS.Core.State.toSerializable(WIS.Game.getState())));
  await h.page.locator('[data-page="achievements"]').tap();assert(await h.page.locator('#achievements-page').isVisible());assert(Number(await h.page.locator('#achievement-total-count').textContent())>0);
  await h.page.locator('[data-page="statistics"]').click();assert(await h.page.locator('#statistics-page').isVisible());await h.page.locator('[data-page="actions"]').click();
  await h.page.locator('#toggle-resource-panel').click();assert.equal(await h.page.locator('#toggle-resource-panel').getAttribute('aria-expanded'),'false');assert(await h.page.locator('#primary-resources').isHidden());await h.page.locator('#toggle-resource-panel').click();
  const stress=await h.page.evaluate(()=>{
   const panel=document.querySelector('.resource-panel'),items=document.getElementById('primary-resources'),sample=items.querySelector('.resource-row'),clones=[];
   for(let i=0;i<12;i++){const e=sample.cloneNode(true);e.removeAttribute('id');e.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));e.querySelector('strong').textContent='1.234567890123456789e123456789';items.appendChild(e);clones.push(e);}
   const cap=panel.getBoundingClientRect().height,overflow=panel.scrollWidth-panel.clientWidth;panel.scrollTop=panel.scrollHeight;const last=clones.at(-1).getBoundingClientRect(),pr=panel.getBoundingClientRect(),toggle=document.getElementById('toggle-resource-panel'),tr=toggle.getBoundingClientRect();
   const reachable=last.bottom<=pr.bottom+1&&last.top>=pr.top,controlReachable=tr.top>=pr.top&&tr.bottom<=pr.bottom;
   clones.forEach(e=>e.remove());panel.scrollTop=0;return {cap,overflow,reachable,controlReachable};
  });if(stress.cap>568*.4+1||stress.overflow>1||!stress.reachable||!stress.controlReachable)failures.push('many resource rows cannot scroll safely: '+JSON.stringify(stress));
  const after=await h.page.evaluate(()=>JSON.stringify(WIS.Core.State.toSerializable(WIS.Game.getState())));assert.equal(after,before,'layout/navigation changes domain');
  if(native){
   await h.page.locator('#open-settings').click();await h.page.locator('#export-save').click();await h.page.locator('#save-export-view').click();
   assert((await h.page.locator('#save-export-text').inputValue()).length>100);
   await h.page.setViewportSize({width:360,height:300});
   const exportBox=await h.page.locator('#save-export-dialog').boundingBox();assert(exportBox.y>=0&&exportBox.y+exportBox.height<=301);
   assert(await h.page.locator('#save-export-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   await h.page.locator('#save-export-close').click();await h.page.locator('#close-settings').click();
   await h.page.locator('#open-settings').click();await h.page.evaluate(()=>nativeListeners.backButton());assert(!(await h.page.locator('#settings-dialog').isVisible()));}
  assert.deepEqual(h.errors,[]);console.log(JSON.stringify({native,rows,stress,failures}));assert.deepEqual(failures,[]);
 }finally{await h?.close();await browser.close();}
});
