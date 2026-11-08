'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.WIS_PLAYWRIGHT||'playwright'),{load}=require('./ui-state-boundary.test.cjs');
const root=path.resolve(__dirname,'..'),release=process.env.WIS_RELEASE_ROOT||path.join(root,'发布版');
const configText=fs.readFileSync(path.join(root,'js/core/config.js'),'utf8');
const version=configText.match(/gameVersion:\s*"([^"]+)"/)[1],schemaVersion=Number(configText.match(/saveVersion:\s*(\d+)/)[1]);
const devManifest=JSON.parse(fs.readFileSync(path.join(root,'js/script-manifest.json'))),releaseManifest=JSON.parse(fs.readFileSync(path.join(release,'js/script-manifest.json')));
assert.deepEqual(releaseManifest.scripts,devManifest.scripts);const differences=new Set(['js/core/build-config.js','js/ui/app.js','js/simulation/offline-worker-bundle.js','js/simulation/online-candidate-worker-bundle.js']);
for(const file of releaseManifest.scripts){const body=fs.readFileSync(path.join(release,file));new vm.Script(String(body),{filename:file});if(!differences.has(file))assert(body.equals(fs.readFileSync(path.join(root,file))),file+' gameplay mismatch');}
for(const file of ['index.html','styles.css','js/ui/app.js'])assert(!/debug-speed-button|resource-debug|formula-details|window\.renderResourceDebug|__test\s*:/.test(fs.readFileSync(path.join(release,file),'utf8')),file+' debug content');
const unexpected=fs.readdirSync(release).filter(n=>!['js','index.html','styles.css','game.js','README.md','数值公式.md','latest.json'].includes(n));assert.deepEqual(unexpected,[]);
console.log(`PASS ${releaseManifest.scripts.length} release scripts; ${releaseManifest.scripts.length-differences.size} shared scripts byte-identical; no debug UI/test facade or test assets`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const {page,errors}=await load(browser,release);await page.addStyleTag({content:fs.readFileSync(path.join(release,'styles.css'),'utf8')});
 for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:900});
  const result=await page.evaluate(()=>{const W=window.WIS,ui=window.testUI;const before=JSON.stringify(W.Core.State.toSerializable(W.Core.Runtime.getState()));
   for(const p of ['actions','upgrades','cultivation','treasures','challenges','achievements','statistics']){ui.switchPage(p);ui.render({forceGlobal:true,forcePage:true});}
   ui.switchPage('actions');ui.render({forceGlobal:true,forcePage:true});
   for(let i=0;i<5;i++)document.dispatchEvent(new KeyboardEvent('keydown',{key:'s',altKey:true,bubbles:true}));
   return {version:document.getElementById('game-version').textContent,build:W.Core.Build,debug:!!document.querySelector('[id^="debug-"],#formula-details-toggle'),testFacade:typeof ui.__test,globalDebug:typeof window.renderResourceDebug,speed:ui.effectiveDevSpeed(),profiler:W.Simulation.Profiler.enabled(),readonly:before===JSON.stringify(W.Core.State.toSerializable(W.Core.Runtime.getState())),overflow:document.documentElement.scrollWidth>innerWidth,nodes:Object.keys(W.Meta.InfinityConfig.nodes).length};});
  assert.equal(result.version,'v'+version);assert.equal(result.build.mode,'release');assert.equal(result.build.enableSpeedControls,false);assert.equal(result.build.enableFormulaDetails,false);assert.equal(result.debug,false);assert.equal(result.testFacade,'undefined');assert.equal(result.globalDebug,'undefined');assert.equal(result.speed,1);assert.equal(result.profiler,false);assert(result.readonly);assert.equal(result.overflow,false);assert.equal(result.nodes,43);
  console.log('PASS release '+width+'px: navigation, version, readonly, no debug, Alt+S cannot change x1');
 }
 // Old release save, martial test save and schema70 development save migrate unchanged on reexport.
 for(const file of ['martial-player-20261003.json','infinity-real-high.json']){
  const input=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures',file),'utf8'));
  const result=await page.evaluate(input=>{const W=window.WIS,loaded=W.Core.Save.prepare(input),env=W.Core.Save.envelope(loaded.state,false,{offlineRecoveryOverride:loaded.offlineRecovery}),roundtrip=W.Core.Save.prepare(JSON.parse(JSON.stringify(env)));// Compare the actual JSON wire representation, preserving every state field.
   const canonical=state=>{const data=JSON.parse(JSON.stringify(W.Core.State.toSerializable(state)));const ordered=x=>Array.isArray(x)?x.map(ordered):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,ordered(x[k])])):x;return JSON.stringify(ordered(data));};
   const diffs=[];function diff(a,b,p=''){if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],p+'.'+k);}else diffs.push({path:p,before:a,after:b});}diff(JSON.parse(canonical(loaded.state)),JSON.parse(canonical(roundtrip.state)));return {schema:env.schemaVersion,same:diffs.length===0,diffs,tasks:JSON.stringify(loaded.offlineRecovery?.tasks)===JSON.stringify(roundtrip.offlineRecovery?.tasks)};},input);
  assert.equal(result.schema,schemaVersion);assert(result.same&&result.tasks,JSON.stringify({file,...result}));console.log('PASS release legacy save/reexport: '+file);
 }
 assert.deepEqual(errors,[]);await page.close();
 const actual=await browser.newPage({viewport:{width:390,height:844}}),runtimeErrors=[];actual.on('pageerror',e=>runtimeErrors.push(e.message));
 await actual.goto(pathToFileURL(path.join(release,'index.html')).href);await actual.waitForFunction(()=>window.WIS?.Game?.canPerformSavedAction?.()&&window.WIS_BOOT?.diagnostics().ready&&document.getElementById('game-version').textContent==='v'+window.WIS.Core.Config.gameVersion);
 await actual.keyboard.press('Alt+s');assert.equal(await actual.locator('#debug-speed-button,#formula-details-toggle').count(),0);assert.deepEqual(runtimeErrors,[]);console.log('PASS actual file:// release bootstrap');await actual.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
