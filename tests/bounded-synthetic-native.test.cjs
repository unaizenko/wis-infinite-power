'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const out=path.resolve('../WIS-项目资源/bounded-settlement-implementation-20261108');
process.env.TEMP=process.env.TMP=out;
test('simulated high-number states complete or abort atomically in native Worker',{timeout:30000},async()=>{
 const {chromium}=require(process.env.WIS_PLAYWRIGHT||'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
 try{const p=await browser.newPage(),scope={window:{WIS:{Simulation:{}}}};vm.runInNewContext(fs.readFileSync('js/simulation/offline-worker-bundle.js','utf8'),scope);
 const b=scope.window.WIS.Simulation.OfflineWorkerBundle;await p.addScriptTag({content:b.source.slice(b.source.indexOf('\n')+1,b.source.lastIndexOf('\n// js/simulation/offline-worker-entry.js\n'))});
 for(const file of ['offline-worker-bundle','online-candidate-worker-bundle','online-candidate-worker'])await p.addScriptTag({content:fs.readFileSync('js/simulation/'+file+'.js','utf8')});
 const fixture=JSON.parse(fs.readFileSync('E:/download/WIS-存档-2026-11-07T12-18-28-780Z.json','utf8'));
 const rows=await p.evaluate(async raw=>{const W=WIS,S=W.Core.State,P=W.Simulation.WorkerProtocol,rows=[];
 for(const value of ['1e24','ee12','eee6']){const s=W.Core.Save.prepare(raw).state;W.Core.Resources.set('core.joules',value,s);W.Core.Resources.set('core.power',value,s);W.Core.Resources.setSystem('immortal','mana',value,s);
 const h=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()}),before=P.encode(S.toSerializable(h.getState())),client=W.Simulation.OnlineCandidateWorker.create({step:h.step,timeoutMs:10000}),began=performance.now();let job,timer,outcome='pending',error=null;
 try{job=client.prepareOnlineWork(.1,{source:'online',clockRatio:1,compensationEligible:false,atomicCadence:true});const ready=await Promise.race([new Promise(r=>job.onReady(()=>r('ready'))),new Promise(r=>{timer=setTimeout(()=>{job.abort();r('timeout');},2000);})]);
 if(ready==='timeout')outcome='timeout';else {clearTimeout(timer);const result=job.advance(performance.now()+12);if(!result.done)throw Error('unexpected local fallback');if(P.encode(S.toSerializable(h.getState()))!==before)throw Error('candidate mutated live');const committed=h.step.advanceGameStep(.1,true,{preparedOnlineSegment:result.token});if(committed.processedSeconds!==.1)throw Error('partial commit');outcome='committed';}
 }catch(e){error=e.code||e.message;outcome='rejected';}finally{clearTimeout(timer);client.close();}
 if(outcome!=='committed'&&P.encode(S.toSerializable(h.getState()))!==before)throw Error('failed candidate changed state');
 const envelope=W.Core.Save.envelope(h.getState(),false,{offlineRecoveryOverride:null}),read=W.Core.Save.prepare(JSON.parse(JSON.stringify(envelope))).state;
 rows.push({value,outcome,error,wallMs:performance.now()-began,exportable:!!read.core,diagnostics:client.diagnostics()});}
 return rows;},fixture);
 assert.equal(rows.length,3);assert(rows.every(r=>r.exportable&&r.outcome!=='pending'));assert(rows.every(r=>r.diagnostics.dispatched===1&&r.diagnostics.fallbacks===0),'not genuine Worker execution '+JSON.stringify(rows));fs.writeFileSync(path.join(out,'synthetic-values.json'),JSON.stringify(rows,null,2));console.log(rows);
 }finally{await browser.close();}});
