'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {launch,host,key}=require('./startup-browser-helpers.cjs');

async function fixture(t){
 const browser=await launch();
 t.after(()=>browser.close());
 const h=await host(browser,{
  transform(p,source){return p==='game.js'?source.replace('const UI = WIS.UI.App.create({','window.testSession = session; const UI = WIS.UI.App.create({'):source;},
  before:()=>{
   window.testNow=+(sessionStorage.getItem('test-now')||1795000000000);
   Date.now=()=>testNow;
   const interval=window.setInterval;
   window.setInterval=(fn,ms,...args)=>{
    if(ms===100){window.testTick=fn;return -1;}
    return ms===5000?-1:interval(fn,ms,...args);
   };
  }
 });
 t.after(()=>h.close());
 await h.page.goto(h.url);
 assert.equal((await boot(h)).ready,true);
 return h;
}
async function boot(h){
 await h.page.waitForFunction(()=>WIS_BOOT.diagnostics().ready||WIS_BOOT.diagnostics().failed,null,{timeout:30000});
 return h.page.evaluate(()=>WIS_BOOT.diagnostics());
}

test('an authoritative checkpoint starts after a backwards clock correction and resumes new elapsed time',async t=>{
 const h=await fixture(t);
 await h.page.evaluate(async()=>{
  await testSession.preference('theme','dark');
  await testSession.save({closing:true});
  testSession.close();
  sessionStorage.setItem('test-now',String(testNow-60000));
 });
 await h.page.reload();
 const status=await boot(h);
 assert.equal(status.ready,true,JSON.stringify(status.firstError));
 const result=await h.page.evaluate(async()=>{
  const before=testSession.view();
  testNow+=30;
  await testSession.save();
  const after=testSession.view();
  return {theme:after.snapshot.domain.core.preferences.theme,closed:after.frozen,
   recovery:after.status.pendingGameSeconds,pending:after.loop.onlineIntervals.reduce((s,p)=>s+p.clock,0),
   priorPending:before.loop.onlineIntervals.reduce((s,p)=>s+p.clock,0)};
 });
 assert.deepEqual(result,{theme:'dark',closed:false,recovery:0,pending:.03,priorPending:0});
 assert.deepEqual(h.errors,[]);
});

test('a backwards clock jump during play admits no elapsed time until the new clock advances',async t=>{
 const h=await fixture(t);
 const result=await h.page.evaluate(async()=>{
  testNow+=20;
  await testSession.save();
  const pending=()=>testSession.view().loop.onlineIntervals.reduce((s,p)=>s+p.clock,0);
  const before=pending();
  testNow-=60000;
  await testSession.save();
  const reset=pending();
  testNow+=30;
  await testSession.save();
  const after=testSession.view();
  return {pending:[before,reset,pending()],boundary:after.snapshot.domain.core.runtime.timeLedger.boundaryAt,now:testNow};
 });
 assert.deepEqual(result.pending,[.02,.02,.05]);
 assert.equal(result.boundary,result.now);
 const displayed=await h.page.locator('#joules').textContent();
 await h.page.evaluate(async()=>{testNow+=300;await testTick();});
 await h.page.waitForFunction(()=>Number(String(WIS.Game.getState().joules))>=0.1);
 // Let the normal render interval elapse after the separately committed tick.
 await h.page.evaluate(async()=>{testNow+=300;await testSession.save();});
 await h.page.waitForFunction(prior=>document.getElementById('joules').textContent!==prior,displayed,{timeout:5000});
 assert.deepEqual(h.errors,[]);
});

test('a corrupt compatibility mirror cannot displace the authoritative checkpoint',async t=>{
 const h=await fixture(t);
 const broken='{damaged compatibility mirror';
 await h.page.evaluate(async({key,broken})=>{
  await testSession.preference('theme','dark');
  await testSession.save();
  testSession.close();
  localStorage.setItem(key,broken);
 },{key,broken});
 await h.page.reload();
 assert.equal((await boot(h)).mode,'normal');
 const result=await h.page.evaluate(async key=>{
  await testSession.save();
  return {theme:WIS.Game.getState().core.preferences.theme,paintedTheme:document.documentElement.dataset.theme,
   mirror:WIS.Core.Save.prepare(JSON.parse(localStorage.getItem(key))).state.theme,unsaved:WIS.Core.Save.status().unsaved};
 },key);
 assert.deepEqual(result,{theme:'dark',paintedTheme:'dark',mirror:'dark',unsaved:false});
 assert.deepEqual(h.errors,[]);
});
