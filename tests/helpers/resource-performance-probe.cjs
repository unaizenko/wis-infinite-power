'use strict';
// Test-only response instrumentation: never loaded by the production manifest.
function createRecorder(now=()=>performance.now()){
 let stats={},stack=[],rootMs=0,events=[],dropped=0;
 function measure(name,fn){const start=now(),frame={child:0};stack.push(frame);try{return fn();}finally{const ms=now()-start;stack.pop();if(stack.length)stack.at(-1).child+=ms;else rootMs+=ms;const r=stats[name]??={calls:0,total:0,self:0,max:0};r.calls++;r.total+=ms;r.self+=ms-frame.child;r.max=Math.max(r.max,ms);if(ms>=20){if(events.length<2000)events.push({name,at:start,ms});else dropped++;}}}
 function iterator(name,it){return {next(v){return measure(name,()=>it.next(v));},return(v){return measure(name,()=>it.return(v));},throw(v){return measure(name,()=>it.throw(v));},[Symbol.iterator](){return this;}};}
 return {measure,iterator,snapshot(){return {stats:JSON.parse(JSON.stringify(stats)),rootMs,events:events.slice(),dropped,open:stack.length};},reset(){if(stack.length)throw Error('active measurement');stats={};events=[];rootMs=0;dropped=0;}};
}
const sites={
 'js/ui/app.js':{render:['render','renderNow','renderGlobal','renderPageContent'],action:['performSavedAction'],preview:['scheduleSourcePreview','explorationPreviewSnapshot','syncTrainingPreviewBoundary','writeSourcePreview']},
 'js/ui/martial.js':{render:['renderActions','renderSummary','renderCultivation'],action:['perform']},
 'js/simulation/online-candidate-worker.js':{prepare:['prepareOnlineWork']},
 'js/simulation/step.js':{prepare:['createOnlineCandidateReceiver']},
 'js/core/save.js':{save:['persistLive','write','writeSnapshot','persistText'],load:['prepare','prepareWork']},
 'js/simulation/loop.js':{online:['runMainTick','drainOnlineSlice','flushDiscardEffects','enqueueForegroundAt'],queue:['requestDeferredAction'],action:['advanceDeferredAction']},
 'js/cultivation/immortal-logic.js':{prepare:['createQuantityManualManaActionWork','manualInputCheck','manualPreparationTask','prepareBreathingManaRate','prepareExplorationManaRate'],compute:['applyManaGainProgressive'],reward:['processExplorationJudgements','commitExplorationProgress','registerSuccessfulExploration','rollTianNiPearlAttempts','rollBaLingChiAttempts','explorationJudgementSteps']},
 'js/cultivation/martial.js':{compute:['preview','convert','automate'],reward:['applyHeartSpendRewards','prepareGainRewards','prepareCoreGainRewards'],commit:['commit']},
 'js/simulation/fixed-sources.js':{prepare:['query'],compute:['calculateExact']},
 'js/simulation/fixed-segment.js':{prepare:['prepareProfileStages'],commit:['commitParts']},
 'js/meta/treasures.js':{reward:['advanceFixedInWork']}
};
function instrument(file,source){
 function replace(a,b){if(source.split(a).length!==2)throw Error('probe anchor '+file+': '+a);source=source.replace(a,b);}
 for(const [phase,names]of Object.entries(sites[file]||{}))for(const name of names){const re=new RegExp('function(\\s*\\*)?\\s+'+name+'\\s*\\(','g'),hits=[...source.matchAll(re)];if(hits.length!==1)throw Error('probe anchor '+file+': '+name+' '+hits.length);const m=hits[0],label=JSON.stringify(phase+':'+file.split('/').at(-1)+':'+name),wrapper=`function ${name}(...__rpArgs){const run=()=>__rpOriginal_${name}.apply(this,__rpArgs);return globalThis.__rp?__rp.${m[1]?'iterator':'measure'}(${label},${m[1]?'run()':'run'}):run();} function${m[1]?'*':''} __rpOriginal_${name}(`;source=source.slice(0,m.index)+wrapper+source.slice(m.index+m[0].length);}
  if(file==='js/simulation/loop.js'){replace('const seconds=Math.max(0,now-previous)/1000;',"const seconds=Math.max(0,now-previous)/1000;if(window.__rpData){const a=__rpData.admissions??=[];if(a.length<2000)a.push({at:performance.now(),seconds,pending:onlineAccumulator,work:!!onlineWork,action:!!deferredAction,discard:!!ledger().pendingDiscard});}");}
 if(file==='js/simulation/loop.js')replace('const owner=deferredAction={job,original,generation,resolve,reject};','job=window.__rpWork(job);const owner=deferredAction={job,original,generation,resolve,reject};');
 if(file==='js/cultivation/immortal-logic.js'){
  replace('const next=math.advance({deadline,maximumOperations:256,minimumOperations:Math.min(16,options.maximumOperations??256),...options});',"const next=__rp.measure('compute:manual-math-advance',()=>math.advance({deadline,maximumOperations:256,minimumOperations:Math.min(16,options.maximumOperations??256),...options}));");
  replace('const next=completion.advance(deadline,options);',"const next=__rp.measure('reward:manual-completion-advance',()=>completion.advance(deadline,options));");
 }
 if(file==='js/simulation/online-candidate-worker-bundle.js')source+='\n('+patchOnlineBundle.toString()+')();';
 if(file==='js/simulation/math-worker-bundle.js')source+='\n('+patchMathBundle.toString()+')();';
 if(file==='game.js')source='('+bridge.toString()+')();\n'+source;
 return source;
}
function patchOnlineBundle(){
 const old=WIS.Simulation.OnlineCandidateWorkerBundle;let source=old.source.replaceAll('\r\n','\n');
 const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('worker timing anchor '+a);source=source.replace(a,b);};
 replace('const owner={id:m.requestId,timer:null,job:null,engine:null,progress:0};','const owner={id:m.requestId,timer:null,job:null,engine:null,progress:0,started:performance.now(),advanceMs:0,slices:0,prepareMs:0};');
 replace('const result=owner.job.advance(performance.now()+12);','const sliceAt=performance.now();const result=owner.job.advance(performance.now()+12);owner.advanceMs+=performance.now()-sliceAt;owner.slices++;');
 replace('owner.timer=setTimeout(()=>advance(owner),0);\n    }catch(error)', 'owner.prepareMs=performance.now()-owner.started;owner.timer=setTimeout(()=>advance(owner),0);\n    }catch(error)');
 replace("post(owner,'result',{payload});", "post(owner,'result',{payload,diagnostic:{wallMs:performance.now()-owner.started,advanceMs:owner.advanceMs,slices:owner.slices,prepareMs:owner.prepareMs}});");
 WIS.Simulation.OnlineCandidateWorkerBundle=Object.freeze({...old,source});
}
function patchMathBundle(){
 const old=WIS.Simulation.MathWorkerBundle;let source=old.source.replaceAll('\r\n','\n');
 const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('math timing anchor '+a);source=source.replace(a,b);};
 replace('const owner={id:m.requestId,timer:null,work:null,progress:0};','const owner={id:m.requestId,timer:null,work:null,progress:0,started:performance.now(),advanceMs:0,slices:0,prepareMs:0};');
 replace('const next=owner.work.advance({deadline:performance.now()+12,maximumOperations:1024});','const at=performance.now();const next=owner.work.advance({deadline:performance.now()+12,maximumOperations:1024});owner.advanceMs+=performance.now()-at;owner.slices++;');
 replace('owner.work=WIS.Simulation.PureMathWork.create(input.kind,engine.getState(),input.request);','owner.work=WIS.Simulation.PureMathWork.create(input.kind,engine.getState(),input.request);owner.prepareMs=performance.now()-owner.started;owner.kind=input.kind;');
 replace("post(owner,'result',{payload});", "post(owner,'result',{payload,diagnostic:{wallMs:performance.now()-owner.started,advanceMs:owner.advanceMs,slices:owner.slices,prepareMs:owner.prepareMs,kind:owner.kind}});");
 WIS.Simulation.MathWorkerBundle=Object.freeze({...old,source});
}
function install(){
 const raw=JSON.parse(localStorage.getItem('wis-infinite-power-save-v2')||'null'),now=Date.now();if(raw){const r=raw.data.core.runtime;r.lastUpdateAt=now;Object.assign(r.timeLedger??={},{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]});localStorage.setItem('wis-infinite-power-save-v2',JSON.stringify(raw));}
 window.__rp=createRecorder();window.__rpData={long:[],workers:[],actions:[],first:{}};
 const d=__rpData;new PerformanceObserver(l=>{for(const e of l.getEntries()){if(d.long.length<5000)d.long.push({at:e.startTime,ms:e.duration});}}).observe({entryTypes:['longtask']});
 const ids=['conversion-preview','next-power-j','breathing-preview','next-mana-j'];
 new MutationObserver(()=>{for(const id of ids){const t=document.getElementById(id)?.textContent||'';if(t&&!/计算|capacity|暂无法|不可用/.test(t)&&(id.endsWith('-preview')?/最终获取/.test(t):/所需：/.test(t)))d.first[id]??=performance.now();}const a=d.actions.at(-1);if(a&&!a.feedbackScheduled&&document.getElementById(a.id)?.getAttribute('aria-busy')==='true'){a.busy=performance.now();a.feedbackScheduled=true;requestAnimationFrame(()=>requestAnimationFrame(()=>a.feedbackPaint=performance.now()));}}).observe(document,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-busy']});
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,e=>{const button=e.target.closest?.('button');if(!button||!button.id||event==='keydown'&&!['Enter',' '].includes(e.key))return;d.actions.push({id:button.id,event,at:performance.now()});requestAnimationFrame(()=>requestAnimationFrame(()=>{const a=d.actions.at(-1);if(a&&a.id===button.id)a.nextPaint=performance.now();}));},true);
 const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){const start=performance.now();super(...args);const row={name:args[1]?.name,start,constructed:performance.now(),messages:[]};d.workers.push(row);const post=this.postMessage.bind(this);this.postMessage=(message,...rest)=>{row.requests??=[];if(row.requests.length<2000)row.requests.push({at:performance.now(),type:message?.type,requestId:message?.requestId});return post(message,...rest);};this.addEventListener('message',e=>{if(row.messages.length<100)row.messages.push({at:performance.now(),type:e.data?.type,requestId:e.data?.requestId,diagnostic:e.data?.diagnostic});});const terminate=this.terminate.bind(this);this.terminate=()=>{row.end=performance.now();return terminate();};}};
 window.__rpWork=job=>{const requested=performance.now(),row={requested,first:null,done:null,slices:0,activeMs:0,maxSlice:0,lastEnd:null,gapMs:0};d.work??=[];d.work.push(row);return {...job,advance(...args){const t=performance.now();row.first??=t;if(row.lastEnd!==null)row.gapMs+=t-row.lastEnd;let v;try{return v=__rp.measure('compute:action-advance',()=>job.advance.apply(job,args));}finally{const ms=performance.now()-t;row.slices++;row.activeMs+=ms;row.maxSlice=Math.max(row.maxSlice,ms);row.lastEnd=performance.now();if(v?.done)row.ready=row.lastEnd;}},commit(...args){try{return __rp.measure('commit:action',()=>job.commit.apply(job,args));}finally{row.done=performance.now();}},cancel(...args){row.cancel=performance.now();return job.cancel?.apply(job,args);}};};
}
function bridge(){
 const W=WIS,app=W.UI.App,loop=W.Simulation.Loop;
 W.UI.App={...app,create(c){window.__rpContext=c;return window.__rpUI=app.create(c);}};
 W.Simulation.Loop={...loop,create(c){return window.__rpLoop=loop.create(c);}};
}
function initSource(){return '('+function(recorderSource,installerSource){(0,eval)('window.createRecorder='+recorderSource);(0,eval)('('+installerSource+')()');}.toString()+')('+JSON.stringify(createRecorder.toString())+','+JSON.stringify(install.toString())+');';}
module.exports={createRecorder,sites,instrument,initSource};
