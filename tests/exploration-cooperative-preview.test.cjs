'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/ui/app.js'),'utf8');
const section=source.slice(source.indexOf('  // Local presentation snapshots only.'),source.indexOf('  const BREATHING_NEXT_BASE_MANA_MAX_LOG_GAP'));
function fixture(){
 const tasks=[];let live={core:{marker:1},cultivation:{active:'immortal',systems:{immortal:{xiuzhen:{realm:0}}}},powerSystem:{active:'scale'},unlockedAchievements:{}},renders=0,steps=0,scopes=0;
 const element={},context={document:{hidden:false},window:{requestAnimationFrame(f){tasks.push(f);},setTimeout(f){tasks.push(f);}},performance:{now:()=>0},Date,previewVisible:()=>true,explorationHoldActive:false,importTransaction:null,activePage:'actions',ZERO:0,ONE:1,byId:()=>element,cancelSourcePreviewWorks(){}};
 const R={getState:()=>live,withState(s,f){const old=live;live=s;try{return f();}finally{live=old;}},call(name){if(name==='renderImmediately'||name==='render'){renders++;context.explorationPreviewSnapshot('action',element);}}};
 const W={Core:{State:{cloneForSimulation:s=>JSON.parse(JSON.stringify(s))}},Power:{ScaleLogic:{createDeferredDynamicRateScope(){scopes++;let advanced=0;return {attempt(f){return advanced>=3?{done:true,value:f()}:{done:false};},advance(){advanced++;steps++;return {done:advanced>=3};},cancel(){}};}}},UI:{SourcePreview:{query(_keys,s){return [s.core.marker];}}}};
 Object.assign(context,{runtime:R,WIS:W,context:{}});vm.createContext(context);
 vm.runInContext(section+'\nexplorationPreviewValues=()=>({mana:runtime.getState().core.marker});this.read=()=>explorationPreviewSnapshot("action",{});',context);
 return {context,read:context.read,tasks,next(){const f=tasks.shift();if(f)f();return !!f;},change(){live.core.marker++;},replace(){live=JSON.parse(JSON.stringify(live));},stats:()=>({renders,steps,scopes}),snap:()=>context.explorationPreviews?.get('action')};
}
let f=fixture();assert.equal(f.read(),null);f.next();f.next();
assert.equal(f.stats().scopes,1,'first exact preview must create a cooperative private scope');
assert.equal(f.stats().steps,0,'first rendered task cannot drain the entire preview');
for(let i=0;i<3;i++){f.change();f.next();}
const snapshot=f.read();assert.equal(snapshot.value.mana,1,'normal online changes cannot restart and starve preview');assert.equal(snapshot.records[0],1,'source breakdown and integral use the same private snapshot');
f=fixture();f.read();f.next();f.next();f.context.document.hidden=true;f.next();assert.equal(f.read(),null);
f=fixture();f.read();f.next();f.next();f.replace();while(f.next()){};assert.equal(f.read(),null,'old candidate cannot publish after state replacement');
console.log('PASS bounded preview scheduling, snapshot consistency, continuous changes and hidden/replaced cancellation');

// Model75: a slow completed preview needs a refresh cooldown, otherwise its
// start timestamp immediately schedules the same expensive chain again.
{
 const tasks=[];let clock=0,scopes=0,active=0;let live={core:{marker:1},cultivation:{active:'immortal',systems:{immortal:{xiuzhen:{realm:0}}}},powerSystem:{active:'scale'},unlockedAchievements:{}};const element={};
 const R={getState:()=>live,withState(s,f){const old=live;live=s;try{return f();}finally{live=old;}},withEvaluationState(s,f){return R.withState(s,f);},call(){c.read();}};
 const C={isWorkActive:()=>active>0,task(_key,factory){const it=factory();let next=it.next();while(!next.done)next=it.next(typeof next.value==='function'?next.value():undefined);return next.value;},createWork(evaluate,{isCurrent=()=>true}={}){let ticks=0,done=false,value,closed=false;return {advance(){if(closed||!isCurrent())throw Error('fixture work stale');if(done)return {done:true};if(++ticks<2)return {done:false};active++;try{value=evaluate();done=true;return {done:true};}finally{active--;}},result:()=>value,cancel(){closed=true;}};}};
 const W={Core:{Amount:{enabled:()=>true},CertifiedRankMath:C,State:{cloneForSimulation:s=>JSON.parse(JSON.stringify(s))},Effects:{createFrozenScope(){return {run:f=>f(),cancel(){}};}}},Power:{ScaleLogic:{createDeferredDynamicRateScope(){scopes++;return {attempt:f=>({done:true,value:f()}),advance:()=>({done:true}),cancel(){}};}}},UI:{SourcePreview:{query:()=>[]}}};
 const c={runtime:R,WIS:W,context:{},document:{hidden:false},window:{requestAnimationFrame:f=>tasks.push(f),setTimeout:f=>tasks.push(f)},performance:{now:()=>0},Date:{now:()=>clock},previewVisible:()=>true,explorationHoldActive:false,importTransaction:null,activePage:'actions',ZERO:0,ONE:1,byId:()=>element,cancelSourcePreviewWorks(){},Immortal:{breathingManaGainProgressive:()=>7},joulesForNextBaseMana:()=>100};vm.createContext(c);vm.runInContext(section+'\nthis.read=()=>explorationPreviewSnapshot("breathing",{});',c);
 assert.equal(c.read(),null);tasks.shift()();tasks.shift()();assert.equal(scopes,1);clock=2000;for(let i=0;tasks.length&&i<30;i++)tasks.shift()();assert.equal(scopes,1,'slow completed preview immediately restarted using its old start time');assert.equal(c.read().value.mana,7);console.log('PASS75 completion-based preview cooldown');
}

const test=require('node:test');
// Model75 stale work must remain cancelled, but normal commits must not create
// a fresh unfinishable preview on every repaint. Explicit dirty bypasses retry.
test('75 stale action preview backs off without weakening invalidation',()=>{
 const tasks=[];let clock=0,created=0,closed=0,live={core:{marker:1},cultivation:{active:'immortal',systems:{immortal:{xiuzhen:{realm:0}}}},powerSystem:{active:'scale'},unlockedAchievements:{}};
 const C={createWork(){created++;return {advance:()=>({done:false}),cancel(){closed++;}};}},c={Immortal:{},runtime:{getState:()=>live,call(){}},WIS:{Core:{Amount:{enabled:()=>true},CertifiedRankMath:C,State:{cloneForSimulation:s=>structuredClone(s)},Effects:{createFrozenScope:()=>({cancel(){}})}},Power:{ScaleLogic:{createDeferredDynamicRateScope:()=>({cancel(){}})}}},context:{},document:{hidden:false},window:{requestAnimationFrame:f=>tasks.push(f),setTimeout:f=>tasks.push(f)},performance:{now:()=>clock},Date:{now:()=>clock},previewVisible:()=>true,explorationHoldActive:false,importTransaction:null,activePage:'actions',ZERO:0,ONE:1,cancelSourcePreviewWorks(){}};
 vm.createContext(c);vm.runInContext(section+'\nthis.read=()=>explorationPreviewSnapshot("breathing",{});',c);c.runtime.call=()=>c.read();
 c.read();tasks.shift()();tasks.shift()();assert.equal(created,2);live=structuredClone(live);tasks.shift()();assert.equal(closed,2,'stale math work must close');assert(tasks.length>0,'stale cancellation must schedule a retry even without a further render');
 for(let i=0;i<5;i++){clock+=20;c.read();live=structuredClone(live);for(let n=0;n<10&&tasks.length;n++){live=structuredClone(live);tasks.shift()();}}
 assert.equal(created,2,'ordinary committed states repeatedly restarted cancelled heavy previews');clock=1001;c.read();for(let n=0;n<10&&created<4&&tasks.length;n++)tasks.shift()();assert.equal(created,4,'retry did not resume after its bounded interval');
 c.markExplorationPreviewDirty();c.read();for(let n=0;n<10&&created<6&&tasks.length;n++)tasks.shift()();assert.equal(created,6,'explicit action/structure dirty was delayed by the retry interval');console.log('PASS75 stale preview cancellation retry and explicit dirty bypass');
});
test('75 stale training preview backs off and explicit invalidation bypasses retry',()=>{
 const policy=source.slice(source.indexOf('  function previewBacklogActive('),source.indexOf('  let previewBacklogSeen'));const training='const currentPreviewOwner=()=>runtime.getState();'+policy+source.slice(source.indexOf('  function cancelSourcePreviewWorks('),source.indexOf('  function renderPageContent('));const tasks=[];let clock=0,created=0,closed=0,live={marker:1};const element={};
 const c={explorationPreviewGeneration:0,explorationHoldActive:false,importTransaction:null,context:{},explicitPreviewRequests:new Set(),sourcePreviewWorks:new Map(),sourcePreviewAttempts:new WeakMap(),heavyPreviewCache:new WeakMap(),structureRevision:0,document:{hidden:false},importTransaction:null,previewVisible:()=>true,runtime:{getState:()=>live},Date:{now:()=>clock},performance:{now:()=>clock},window:{setTimeout:f=>tasks.push(f)},afterExplorationPreviewPaint:f=>tasks.push(f),setTextIfChanged(){},publishPreview(){},WIS:{Core:{Amount:{enabled:()=>true},State:{cloneForSimulation:s=>structuredClone(s)},Effects:{createFrozenScope:()=>({cancel(){}})},CertifiedRankMath:{createWork(){created++;return {advance:()=>({done:false}),cancel(){closed++;}};}}}}};vm.createContext(c);vm.runInContext(training,c);
 c.scheduleSourcePreview(element,'training',{});tasks.shift()();assert.equal(created,1);live={marker:2};tasks.shift()();assert.equal(closed,1);for(let i=0;i<5;i++){clock+=20;c.scheduleSourcePreview(element,'training',{});tasks.shift()?.();live={marker:i+3};tasks.shift()?.();}assert.equal(created,1,'training preview rebuilt on every committed state');clock=1001;c.scheduleSourcePreview(element,'training',{});tasks.shift()();assert.equal(created,2);c.cancelSourcePreviewWorks();c.scheduleSourcePreview(element,'training',{});for(let n=0;n<10&&created<3&&tasks.length;n++)tasks.shift()();assert.equal(created,3,'explicit invalidation must clear training retry');c.cancelSourcePreviewWorks();console.log('PASS75 training stale retry and explicit invalidation');
});
