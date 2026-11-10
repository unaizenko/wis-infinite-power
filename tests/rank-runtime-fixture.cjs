"use strict";
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {setupFuture,root}=require('./rank-schema-fixture.cjs'),original='E:/download/WIS-original-save-1793284232246.json';
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function ready(W,skip=[]){const s=W.Core.State.fresh(),B=W.Core.BigNum;Object.assign(s.meta.infinity,{unlocked:true,upgradesUnlocked:true,points:B.BN(10000),totalPointsEarned:B.BN(10000)});for(const id of ['D1-1','D1-2','D2-1','D2-2','D3','D4','D5','D6','D7-1','D7-2','D7-3','D8','D9','D10'])if(!skip.includes(id)&&!W.Meta.Infinity.purchase(s,id))throw Error(id);const n=s.meta.bigNumbers;W.Meta.Achievements.record(s,'googol');Object.assign(n,{unlocked:true,fractalLevel:5,beyondFractal:true,gIndex:64});n.purchases.fill(true);n.tree.rank=3;n.rankBasis=W.Core.RankBasis.create(n);s.core.runtime.lastUpdateAt=1700000000000;return s;}
function contractInputs(W){return ['ordinary','g64','tree','single','boosted','y-sample','frozen'].map(name=>{const s=ready(W,name==='g64'?['D5','D6','D7-1','D7-2','D7-3','D8','D9','D10']:name==='single'?['D10']:[]),n=s.meta.bigNumbers;let seconds=.1;
 if(name==='g64'){n.gIndex=63;n.superProgress=W.Core.BigNum.BN(100);seconds=1;}
 if(['tree','single','boosted'].includes(name)){n.tree.phase='super';n.tree.superProgress=W.Core.BigNum.BN(name==='boosted'?0:5);n.tree.superEntryMultiplier=W.Core.BigNum.BN(40320);s.treeSuperAutomationEnabled=true;seconds=name==='boosted'?5:.25;}
 if(name==='boosted'){for(const id of ['D11-1','D11-3'])if(!W.Meta.Infinity.purchase(s,id))throw Error(id);}
 if(name==='y-sample'){n.elapsedSeconds=.95;seconds=.2;}
 n.rankBasis=W.Core.RankBasis.create(n);return {name,s,seconds};});}
async function profileOnline({steps=3,warmup=0,instrument=false,sliceMs=3}={}){
 const counters={budgetReads:0,normalizations:0,validWords:0,preparations:0,cacheHits:0,budgetPreparations:0,maxGQueries:0},seen=new Set();let frame=0;
 const transformSource=(file,source)=>{if(!instrument)return source;
 if(file.endsWith('rank-budget.js'))source=source.replace('function finishResult(result){',"function finishResult(result){if(result.record.mode==='g-polynomial')globalThis.__rankCounter.maxGQueries=Math.max(globalThis.__rankCounter.maxGQueries,result.certificate.operations);").replace(source.includes('function readHeader(record){')?'function readHeader(record){':'function read(record){',(source.includes('function readHeader(record){')?'function readHeader(record){':'function read(record){')+'globalThis.__rankCounter.read(record);').replace('function normalizeWords(inputs){','function normalizeWords(inputs){globalThis.__rankCounter.normalizations++;').replace('function validWord(raw){','function validWord(raw){globalThis.__rankCounter.validWords++;');
 if(file.endsWith('rank-budget.js'))source=source.replace('function prepared(record){','function prepared(record){globalThis.__rankCounter.budgetPreparations++;').replace('function* prepareSteps(record){','function* prepareSteps(record){globalThis.__rankCounter.budgetPreparations++;').replaceAll('if(activeSession.records.has(record))return record;','if(activeSession.records.has(record)){globalThis.__rankCounter.cacheHits++;return record;}');
 if(file.endsWith('big-numbers.js'))source=source.replace('function prepare(state, seconds, options) {','function prepare(state, seconds, options) {globalThis.__rankCounter.preparations++;').replace('if(!working){working=', 'if(!working){globalThis.__rankCounter.preparations++;working=');
 return source;
 };
 const {W,context}=setupFuture({transformSource});context.__rankCounter=counters;counters.read=r=>{counters.budgetReads++;seen.add(frame+'|'+JSON.stringify(r));};
 const raw=JSON.parse(fs.readFileSync(original,'utf8'));context.__rankAt=raw.data.core.runtime.lastUpdateAt;vm.runInContext('Date.now=()=>__rankAt',context);
 const s=W.Core.Save.prepare(raw).state,h=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()}),rows=[],initial=h.getState().totalElapsedSeconds;
 for(frame=0;frame<steps+warmup;frame++){const began=performance.now(),job=h.step.prepareOnlineWork(.1,{source:'online',clockRatio:1,atomicCadence:true});let r,slices=0,maxSliceMs=0;
 do{const t=performance.now();r=job.advance(t+sliceMs);maxSliceMs=Math.max(maxSliceMs,performance.now()-t);if(++slices>100000)throw Error('work capacity');if(!r.done)await new Promise(setImmediate);}while(!r.done);
 h.step.advanceGameStep(.1,true,{preparedOnlineSegment:r.token});if(frame>=warmup)rows.push({step:frame-warmup+1,gameSeconds:.1,wallMs:performance.now()-began,slices,maxSliceMs});}
 delete counters.read;counters.distinctBudgetInputs=seen.size;return {rows,counters,stateHash:hash(JSON.stringify(W.Core.State.toSerializable(h.getState()))),confirmedClock:h.getState().totalElapsedSeconds-initial};
}
function releaseRuntime(){
 const release=path.join(root,'发布版'),meta={window:{WIS:{Simulation:{}}}};vm.runInNewContext(fs.readFileSync(path.join(release,'js/simulation/offline-worker-bundle.js'),'utf8'),meta);
 const storage=new Map(),c={console,performance,setTimeout,clearTimeout,setInterval:(...a)=>setInterval(...a).unref(),clearInterval,postMessage(){},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)}};c.self=c;vm.createContext(c);vm.runInContext('self.window=self;self.document={hidden:false}',c);
 for(const file of meta.window.WIS.Simulation.OfflineWorkerBundle.scripts)vm.runInContext(fs.readFileSync(path.join(release,file),'utf8'),c,{filename:'release/'+file});
 const W=c.WIS;if(W.Core.Config.saveVersion!==73)throw Error('expected actual release73');return c;
}
function produceRelease73({kind}={}){if(!['fresh','original-player'].includes(kind))throw Error('unknown release input');const c=releaseRuntime(),W=c.WIS;const state=kind==='fresh'?W.Core.State.fresh():W.Core.Save.prepare(JSON.parse(fs.readFileSync(original,'utf8'))).state;
 const raw=JSON.stringify(W.Core.Save.envelope(state,false,{offlineRecoveryOverride:null})),interpreted=W.Core.Save.prepare(JSON.parse(raw)).state;return {raw,producerBuild:c.WIS_BUILD.id,state:JSON.parse(JSON.stringify(W.Core.State.toSerializable(interpreted)))};
}
module.exports={profileOnline,ready,contractInputs,hash,root,original,produceRelease73};
