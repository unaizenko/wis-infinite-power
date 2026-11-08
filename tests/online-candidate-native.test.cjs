'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.env.WIS_CANDIDATE_ROOT||path.join(__dirname,'..')),out=process.env.WIS_CANDIDATE_EVIDENCE||path.resolve(__dirname,'../../WIS-项目资源/online-candidate-worker-20261108');fs.mkdirSync(out,{recursive:true});process.env.TEMP=process.env.TMP=out;
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),scope={window:{WIS:{Simulation:{}}}};vm.runInNewContext(read('js/simulation/offline-worker-bundle.js'),scope);const base=scope.window.WIS.Simulation.OfflineWorkerBundle;
const engine=base.source.slice(base.source.indexOf('\n')+1,base.source.lastIndexOf('\n// js/simulation/offline-worker-entry.js\n'));
const fixture='E:/download/WIS-存档-2026-11-07T12-18-28-780Z.json',raw=fs.existsSync(fixture)?JSON.parse(fs.readFileSync(fixture,'utf8')):null;
test('native generated candidate Worker matches 100 local exact installations and presentation state', {timeout:240000,skip:raw?false:'external player fixture unavailable'},async()=>{
 const {chromium}=require(process.env.WIS_PLAYWRIGHT||'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
 try{const page=await browser.newPage();await page.addScriptTag({content:engine});for(const f of ['js/simulation/offline-worker-bundle.js','js/simulation/online-candidate-worker-bundle.js','js/simulation/online-candidate-worker.js'])await page.addScriptTag({content:read(f)});
 const result=await page.evaluate(async raw=>{
  const W=WIS,S=W.Core.State,P=W.Simulation.WorkerProtocol,initial=W.Core.Save.prepare(raw).state,reference=[],rows=[];
  const pause=()=>new Promise(r=>setTimeout(r,0));
  for(const variant of ['local','worker']){
   const h=W.Simulation.OfflineHeadless.create({domain:initial},{checkpoint(){throw Error('unexpected persistence');},yield:pause});W.tmp.tick=0;W.tmp.rates={};
   const client=variant==='worker'?W.Simulation.OnlineCandidateWorker.create({step:h.step}):null,t=performance.now();let maxAdvance=0,advanceMs=0,prepareMs=0;
   try{for(let i=0;i<100;i++){
    const before=P.encode(S.toSerializable(h.getState())),t0=performance.now(),job=(client||h.step).prepareOnlineWork(.1,{source:'online',clockRatio:1,compensationEligible:false,atomicCadence:true});prepareMs+=performance.now()-t0;
    let r;do{if(job.waiting?.())await new Promise(resolve=>job.onReady(resolve));const began=performance.now();r=job.advance(performance.now()+12);const dt=performance.now()-began;advanceMs+=dt;maxAdvance=Math.max(maxAdvance,dt);if(!r.done)await pause();}while(!r.done);
    if(P.encode(S.toSerializable(h.getState()))!==before)throw Error('prepared mutated live '+variant+' '+i);
    const committed=h.step.advanceGameStep(.1,true,{foreground:true,preparedOnlineSegment:r.token});if(committed.processedSeconds!==.1)throw Error('unexpected processed time');
    const pack=P.encode({state:S.toSerializable(h.getState()),result:committed,tick:W.tmp.tick,rates:W.tmp.rates,transient:[W.Power.Scale.snapshotTreasureTransient(),W.Cultivation.Immortal.snapshotTreasureTransient()]});
    if(variant==='local')reference.push(pack);else if(pack!==reference[i]){const a=JSON.parse(reference[i]),b=JSON.parse(pack);function mismatch(x,y,p=''){if(typeof x!==typeof y||x===null||y===null||typeof x!=='object')return JSON.stringify(x)===JSON.stringify(y)?null:p+': '+JSON.stringify(x)+' != '+JSON.stringify(y);for(const k of new Set([...Object.keys(x),...Object.keys(y)])){const r=mismatch(x[k],y[k],p+'.'+k);if(r)return r;}return null;}throw Error('state mismatch at '+i+' '+mismatch(a,b));}
    job.close?.();
   }rows.push({variant,steps:100,wallMs:performance.now()-t,prepareMs,advanceMs,maxAdvance,diagnostics:client?.diagnostics(),online:h.step.onlineMetrics()});}finally{client?.close();}
  }return {rows,equal:true};
 },raw);fs.writeFileSync(path.join(out,'NATIVE-EQUIVALENCE.json'),JSON.stringify(result,null,2));assert.equal(result.equal,true);assert.equal(result.rows[1].diagnostics.received,100);assert.equal(result.rows[1].diagnostics.fallbacks,0);
 }finally{await browser.close();}
});
