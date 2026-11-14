'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {host,launch}=require('./startup-browser-helpers.cjs'),{fixture,hash}=require('./helpers/resource-performance-runner.cjs'),{loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
function transform(file,source){
 if(file==='js/simulation/loop.js')source=source.replace('const monotonicNow=()=>window.performance?.now?window.performance.now():Date.now();','const monotonicNow=()=>window.admissionTime??(window.performance?.now?window.performance.now():Date.now());');
 if(file==='game.js')source=`const oldAdmissionLoop=WIS.Simulation.Loop;WIS.Simulation.Loop={...oldAdmissionLoop,create(c){const prepared=(...a)=>{const job=c.prepareOnlineWork(...a),record={job,closed:0};window.onlineRecord=record;return {...job,onReady(fn){record.readyNotification=fn;return job.onReady?.(fn);},waiting:()=>window.holdOnline===true||job.waiting?.()===true,close(){record.closed++;return job.close?.();},abort(){record.closed++;return job.abort?.();}};};const loop=oldAdmissionLoop.create({...c,prepareOnlineWork:prepared});window.admissionLoop=loop;return {...loop,requestDeferredAction(factory){return loop.requestDeferredAction(state=>{window.admissionStarts=(window.admissionStarts||0)+1;window.factoryInput=WIS.Simulation.WorkerProtocol.encode(state);const job=factory(state);return {...job,commit(){const result=job.commit();window.admissionCommits=(window.admissionCommits||0)+1;window.actionOutput=WIS.Simulation.WorkerProtocol.encode(WIS.Core.Runtime.getState());return result;}};});}};}};`+source;
 return source;
}
for(const [action,id]of [['train','train-button'],['breathe','breathing-button'],['explore','exploration-button']])test(action+' real touch preserves online owner, publishes busy, then matches formal action and Save',async()=>{
 const b=await launch();let h;try{
 h=await host(b,{raw:JSON.stringify(fixture(action,'high')),touch:true,transform,before:()=>{const key='wis-infinite-power-save-v2',raw=JSON.parse(localStorage.getItem(key)),now=Date.now(),r=raw.data.core.runtime;r.lastUpdateAt=now;Object.assign(r.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[],pendingDiscard:null});localStorage.setItem(key,JSON.stringify(raw));}});
 await h.page.goto(h.url);await h.page.waitForFunction(()=>WIS_BOOT?.diagnostics().ready&&!WIS.Game.simulation.getCatchUpStatus().locked,null,{timeout:90000});
 await h.page.locator('#'+id).scrollIntoViewIfNeeded();
 await h.page.evaluate(()=>{window.holdOnline=true;window.admissionTime=performance.now();});
 await h.page.waitForFunction(()=>window.onlineRecord&&onlineRecord.closed===0&&onlineRecord.job.waiting?.()===false,null,{timeout:15000});
 await h.page.evaluate(()=>window.reservedRecord=onlineRecord);
 await h.page.locator('#'+id).tap();
 const queued=await h.page.evaluate(id=>({pending:admissionLoop.isDeferredActionPending(),closed:reservedRecord.closed,factory:!!window.factoryInput,busy:document.getElementById(id).getAttribute('aria-busy')}),id);
 assert.equal(queued.pending,true);assert.equal(queued.closed,0);assert.equal(queued.factory,false);assert.equal(queued.busy,'true');
 await h.page.evaluate(()=>{window.holdOnline=false;window.admissionTime=undefined;reservedRecord.readyNotification();});
 await h.page.waitForFunction(()=>!!window.actionOutput,null,{timeout:30000});
 const wire=await h.page.evaluate(()=>({input:factoryInput,output:actionOutput,closed:reservedRecord.closed}));assert.equal(wire.closed,0,'online result should be accepted, not cancelled');
 const reference=await h.page.evaluate(({input,action})=>new Promise((resolve,reject)=>{
   const source='self.window=self;self.document={hidden:false};'+WIS.Simulation.OfflineWorkerBundle.source+`
self.onmessage=({data})=>{try{const W=WIS;W.Simulation.OfflineHeadless.create({domain:W.Simulation.WorkerProtocol.decode(data.input)},{checkpoint(){},yield:()=>Promise.resolve()});if(data.action==='train')W.Power.ScaleLogic.train(true);else if(data.action==='breathe')W.Cultivation.ImmortalLogic.breathe();else W.Cultivation.ImmortalLogic.explore();self.postMessage({output:W.Simulation.WorkerProtocol.encode(W.Core.Runtime.getState())});}catch(e){self.postMessage({error:e.stack});}};`;
   const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'})),worker=new Worker(url);const close=()=>{worker.terminate();URL.revokeObjectURL(url);};worker.onmessage=({data})=>{close();data.error?reject(Error(data.error)):resolve(data.output);};worker.onerror=e=>{close();reject(Error(e.message));};worker.postMessage({input,action});
 }),{input:wire.input,action});
 const {W}=loadProductionNumericRuntime(),P=W.Simulation.WorkerProtocol,S=W.Core.State;
 const expected=P.decode(reference),actual=P.decode(wire.output);
 // Only metadata allowed to drift while the manual candidate owns gameplay.
 expected.core.runtime.timeLedger=actual.core.runtime.timeLedger;expected.core.preferences=actual.core.preferences;
 const a=JSON.parse(P.encode(expected)),z=JSON.parse(wire.output),differences=[];function walk(a,b,p=''){if(JSON.stringify(a)===JSON.stringify(b))return;if(!a||!b||typeof a!=='object'||typeof b!=='object'){differences.push({path:p,reference:String(a).slice(0,80),actual:String(b).slice(0,80)});return;}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],p+'.'+k);}walk(a,z);assert.equal(differences.length,0,JSON.stringify(differences.slice(0,12)));
 const saveA=JSON.parse(JSON.stringify(W.Core.Save.envelope(expected,false))),saveB=JSON.parse(JSON.stringify(W.Core.Save.envelope(S.cloneForSimulation(actual),false)));
 assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(W.Core.Save.prepare(saveA).state))),JSON.parse(JSON.stringify(S.toSerializable(W.Core.Save.prepare(saveB).state))));
 assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await b.close();}
});



test('touch hold releases its repetition and keyboard action commits once with live admission',async()=>{
 const b=await launch();let h;try{
 h=await host(b,{raw:JSON.stringify(fixture('explore','high')),touch:true,transform,before:()=>{const key='wis-infinite-power-save-v2',raw=JSON.parse(localStorage.getItem(key)),r=raw.data.core.runtime,now=Date.now();r.lastUpdateAt=now;Object.assign(r.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[],pendingDiscard:null});localStorage.setItem(key,JSON.stringify(raw));}});
 await h.page.goto(h.url);await h.page.waitForFunction(()=>WIS_BOOT?.diagnostics().ready&&!WIS.Game.simulation.getCatchUpStatus().locked,null,{timeout:90000});const button=h.page.locator('#exploration-button');await button.scrollIntoViewIfNeeded();const bounds=await button.boundingBox(),cdp=await h.page.context().newCDPSession(h.page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}]});
 try{await h.page.waitForFunction(()=>window.admissionCommits>=2,null,{timeout:15000});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 await h.page.waitForFunction(()=>!admissionLoop.isDeferredActionPending(),null,{timeout:15000});const count=await h.page.evaluate(()=>admissionCommits);await h.page.waitForTimeout(650);assert.equal(await h.page.evaluate(()=>admissionCommits),count,'repeat continued after touch release');
 await button.press('Enter');await h.page.waitForFunction(n=>admissionCommits>n&&!admissionLoop.isDeferredActionPending(),count,{timeout:15000});assert.equal(await h.page.evaluate(()=>admissionCommits),count+1);assert.deepEqual(h.errors,[]);
 }finally{await h?.close();await b.close();}
});
