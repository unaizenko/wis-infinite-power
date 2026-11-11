'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {launch,host}=require('./startup-browser-helpers.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
const {setupFuture}=require('./rank-schema-fixture.cjs');
function clock(raw){const now=1794402000000;raw.data.core.runtime.lastUpdateAt=now;if(raw.data.core.runtime.timeLedger)Object.assign(raw.data.core.runtime.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]});delete raw.offlineRecovery;return raw;}
async function page(browser,raw){const h=await host(browser,{raw:JSON.stringify(clock(raw)),touch:true,before:()=>{Date.now=()=>1794402000000;window.setInterval=()=>0;},transform:(p,s)=>p==='styles.css'&&process.env.WIS_LAYOUT_REFERENCE_CSS?require('node:fs').readFileSync(process.env.WIS_LAYOUT_REFERENCE_CSS,'utf8'):p==='game.js'?`const prior=WIS.UI.App;WIS.UI.App={...prior,create(c){return window.upgradeUI=prior.create(c);}};`+s:s});await h.page.goto(h.url);await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready);await h.page.evaluate(()=>{upgradeUI.switchPage('upgrades');upgradeUI.render({forceGlobal:true,forcePage:true});});return h;}
test('early ordinary upgrades stretch to phone width, expanded cards and filters remain usable',async()=>{
 const {W}=setupFuture({targetSchema:76}),s=W.Core.State.fresh();s.power=s.highestPower=s.totalPower=W.Core.BigNum.BN(810980);s.highestScaleIndex=s.lifetimeHighestScaleIndex=2;s.brickUnlocked=s.wallUnlocked=true;W.Meta.Achievements.record(s,'scale2');
 const raw=W.Core.Save.envelope(s,false),browser=await launch();let h;try{h=await page(browser,raw);
  for(const width of [320,390,430,844]){await h.page.setViewportSize({width,height:width===844?390:844});
   for(const open of [false,true]){const result=await h.page.evaluate(open=>{document.querySelectorAll('#ordinary-upgrades-panel details').forEach(e=>e.open=open);const main=document.querySelector('.main-panel'),panel=document.getElementById('ordinary-upgrades-panel'),r=panel.getBoundingClientRect();return {main:main.getBoundingClientRect().width,panel:r.width,inner:innerWidth,overflow:panel.scrollWidth-panel.clientWidth};},open);assert(result.main>=width-1,JSON.stringify(result));assert(result.panel>=width-34,JSON.stringify(result));assert(result.overflow<=1);}
  }
  await h.page.locator('#toggle-upgrade-filter').click();assert.equal(await h.page.locator('#toggle-upgrade-filter').getAttribute('aria-pressed'),'true');await h.page.locator('#toggle-upgrade-filter').click();assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await browser.close();}
});
test('infinity detail follows selected row on phones, survives filters and resize, pays original cost once',async()=>{
 const raw=readFixture('high-training');Object.assign(raw.data.core.preferences,{hideUnlockedUpgrades:false,hideUnlockedInfinityUpgrades:false});raw.data.meta.infinity.points='32';const browser=await launch();let h;
 try{h=await page(browser,raw);await h.page.setViewportSize({width:320,height:568});await h.page.locator('#infinity-upgrades-tab').click();
  const before=await h.page.evaluate(()=>JSON.stringify(WIS.Core.State.toSerializable(WIS.Game.getState())));
  for(const branch of ['regular','systems','numbers','tempo']){
   await h.page.locator(`[data-branch="${branch}"]`).click();const nodes=await h.page.locator('.infinity-node:visible').all();
   for(const button of [nodes[0],nodes[Math.floor(nodes.length/2)],nodes.at(-1)]){
    await button.click();
    const layout=await h.page.evaluate(()=>{const node=document.querySelector('.infinity-node[aria-pressed="true"]'),details=document.getElementById('infinity-details'),tree=document.getElementById('infinity-tree'),row=getComputedStyle(node).gridRowStart;
     const siblings=[...tree.querySelectorAll('.infinity-node:not([hidden])')].filter(e=>getComputedStyle(e).gridRowStart===row),bottom=Math.max(...siblings.map(e=>e.getBoundingClientRect().bottom)),r=details.getBoundingClientRect();
     return {inline:details.parentElement===tree,gap:r.top-bottom,width:r.width,treeWidth:tree.getBoundingClientRect().width,overflow:details.scrollWidth-details.clientWidth,detailsCount:document.querySelectorAll('#infinity-details').length,selected:node.dataset.node,title:document.getElementById('infinity-node-name').textContent};});
    assert(layout.inline&&layout.gap>=0&&layout.gap<40,JSON.stringify(layout));assert(layout.width>=layout.treeWidth-1);assert(layout.overflow<=1);assert.equal(layout.detailsCount,1);assert(layout.title.startsWith(layout.selected));
   }
  }
  assert.match(await h.page.locator('#upgrades-page .page-header').textContent(),/无限点数/);
  await h.page.setViewportSize({width:1280,height:800});await h.page.waitForFunction(()=>document.getElementById('infinity-details').parentElement.id==='infinity-upgrades-panel');assert.deepEqual(await h.page.locator('#infinity-details').evaluate(e=>[e.style.gridRow,e.style.gridColumn]),['','']);
  await h.page.setViewportSize({width:390,height:844});await h.page.waitForFunction(()=>document.getElementById('infinity-details').parentElement.id==='infinity-tree');
  assert.equal(await h.page.evaluate(()=>JSON.stringify(WIS.Core.State.toSerializable(WIS.Game.getState()))),before,'selection/layout changed game state');
  await h.page.locator('[data-branch="regular"]').click();await h.page.locator('[data-node="B6"]').click();
  const count=await h.page.evaluate(()=>WIS.Game.getState().meta.infinity.purchaseLedger.length);assert(await h.page.locator('#infinity-buy').isEnabled());await h.page.locator('#infinity-buy').click();
  const paid=await h.page.evaluate(()=>{const n=WIS.Game.getState().meta.infinity;return {points:String(n.points),owned:!!n.upgrades.B6,count:n.purchaseLedger.length};});assert.deepEqual(paid,{points:'0',owned:true,count:count+1});
  await h.page.locator('#toggle-infinity-upgrade-filter').click();assert(await h.page.locator('#infinity-filter-empty').isVisible());assert(await h.page.locator('#infinity-details').isHidden());
  await h.page.locator('[data-branch="systems"]').click();assert(await h.page.locator('#infinity-details').isVisible());assert.equal(await h.page.locator('.infinity-node[aria-pressed="true"]:visible').count(),1);
  await h.page.locator('#ordinary-upgrades-tab').click();assert.match(await h.page.locator('#upgrades-page .page-header').textContent(),/消耗战力/);assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await browser.close();}
});
