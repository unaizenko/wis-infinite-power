(function(W){
 'use strict';
 const P=()=>W.Simulation.WorkerProtocol;
 function create({install,render,notice}){
  let controller=null,store=null,view=null,active=false,busy=0,held=false,timer=null,clockBusy=false,closed=false,mirrorError=null;
  let manual=null,releaseLock=null,watchdog=null,inflight=0,resumeAfterFailedClose=false;
  const failures=new Set(),subscribers=new Set(),slotPrefix='main-';
  let previewKey=null,previewOwner=null;
  let displayKey=null,displayOwner=null;
  let boundaryTimer=null,boundaryGeneration=0,wakePaused=false,nativeInactive=false,lifecycleGeneration=0;
  function cancelBoundary(){boundaryGeneration++;if(boundaryTimer!==null)window.clearTimeout(boundaryTimer);boundaryTimer=null;}
  function scheduleBoundary(){
   cancelBoundary();
   if(!controller||!active||closed||held||busy||inflight||clockBusy||wakePaused||nativeInactive||document.hidden||controller.error()||displayKey===null)return;
   const v=view,t=v?.loop,status=v?.status,settlement=v?.settlement,ledger=v?.snapshot.domain.core.runtime.timeLedger;
   if(!t||!status||!settlement||v.reservation||v.pendingAction||v.frozen||v.importHeld||settlement.stopped||settlement.pendingDiscard||ledger?.pendingDiscard)return;
   if(status.clockSuspended||status.treasureRecovery?.active||status.worker?.running||status.phase==='running'||status.phase==='paused'||status.pendingGameSeconds>1e-10)return;
   const parts=t.onlineIntervals;if(!Array.isArray(parts)||!parts.length||parts.some(p=>p.source!=='online'||!Number.isFinite(p.clock)||p.clock<0||!Number.isFinite(p.speed)||p.speed<=0))return;
   const available=parts.reduce((n,p)=>n+p.clock*p.speed,0),cadence=t.tickRemaining||v.snapshot.domain.core.runtime.onlineCadenceRemaining||0.1,missing=cadence-available;
   if(!Number.isFinite(t.lastTickAt)||!Number.isFinite(missing)||!(available>1e-10&&missing>1e-10))return;
   // SessionEngine admits new foreground time at speed 1. Read only a durable
   // prefix; the new command registers real time and still uses the existing cap.
   const due=t.lastTickAt+Math.ceil((missing-1e-10)*1000),generation=boundaryGeneration,owner=displayOwner;
   boundaryTimer=window.setTimeout(()=>{if(generation!==boundaryGeneration||owner!==displayOwner||v!==view)return;boundaryTimer=null;void tick();},Math.max(1,due-Date.now()));
  }
  function error(e){cancelBoundary();for(const fail of failures)fail(e);W.Core.Save.noteFailure(e,'进度尚未确认保存，请保留页面并重试。');notice?.(e.message||String(e));}
  function changed(frame,packed){
   const engine=(packed?P().decodeValue(packed):P().decode(frame.payload)).engine;view=engine;
   // Synchronous level-control presentation has explicit value dependencies.
   // Its lifecycle is the durable slot/epoch, not every rate/preview revision.
   const nextDisplayKey=typeof frame.slot==='string'&&Number.isSafeInteger(frame.epoch)?JSON.stringify([frame.slot,frame.epoch]):null;
   if(nextDisplayKey===null||nextDisplayKey!==displayKey){displayKey=nextDisplayKey;displayOwner={};}
   // Snapshot allocation is not a new preview lifecycle. Owner epochs and discrete
   // commits are; old checkpoints without a version conservatively retire work.
   const s=engine.snapshot.domain,key=typeof engine.presentationVersion==='string'?JSON.stringify([frame.slot,frame.epoch,engine.presentationVersion,s.powerSystem.active,s.cultivation.active,s.activeChallenge]):null;
   if(key===null||key!==previewKey){previewKey=key;previewOwner={};}
   install(engine.snapshot,engine.tick,engine.rates,previewOwner);if(!mirrorError)W.Core.Save.confirmExternal();
   for(const listener of subscribers)try{listener(engine.status);}catch(e){W.Core.Save.diagnose('session-status',e);}
   render();active=true;scheduleBoundary();
  }
  async function command(body){
   if(!controller||closed)throw Error('会话尚未就绪');
   const generation=lifecycleGeneration;cancelBoundary();inflight++;try{const result=await controller.command(body);if(body.type==='return'&&generation===lifecycleGeneration&&!nativeInactive&&!document.hidden)wakePaused=false;return result;}catch(e){error(e);throw e;}finally{inflight--;scheduleBoundary();}
  }
  async function resumeForeground(){
   if(closed||held||!active||nativeInactive||document.hidden)return;
   const generation=++lifecycleGeneration,owner=displayOwner;
   wakePaused=true;cancelBoundary();
   await command({type:'return',at:Date.now()});
   // A later departure or owner replacement retires this continuation. It must
   // not enqueue recovery behind the newer freeze/import command.
   if(generation!==lifecycleGeneration||owner!==displayOwner||closed||held||nativeInactive||document.hidden)return;
   return recoveryCommand('simulateOfflineProgress',[0]);
  }
  function cancel(reason){
   // Freeze already invalidates the deferred action. Repeated UI cancellation
   // while away must not submit an illegal command to that frozen owner.
   if(closed||held||wakePaused||view?.frozen)return Promise.resolve(false);
   const result=command({type:'cancel',reason});result.catch(()=>{});return result;
  }
  async function perform(body){
   if(!active||held||controller.error())throw Error('当前会话暂不能执行操作，请先重试保存');
   if(busy)return false;
   cancelBoundary();busy++;const metadata=manual;
   try{
    const request={...body,...(metadata?{manual:metadata}:{})};
    for(let tries=0;tries<3;tries++){
     try{const receipt=await controller.command(request);return receipt.status==='done'?receipt.value===undefined?true:receipt.value:false;}
     catch(e){if(!e.message.startsWith('SESSION_CONFIRM:'))throw e;const text=e.message.slice(16);if(!window.confirm(text))return false;request.confirmation=text;}
    }
    throw Error('操作条件已变化，请重新操作');
   }catch(e){error(e);throw e;}finally{busy--;render();scheduleBoundary();}
  }
  function dispatch(body){const result=perform(body);result.catch(()=>{});return result;}
  function readonly(state){
   const cache=new WeakMap();
   const wrap=value=>{
    if(!value||typeof value!=='object'||value instanceof Decimal)return value;
    if(cache.has(value))return cache.get(value);
    const proxy=new Proxy(value,{get:(o,k)=>wrap(Reflect.get(o,k,o)),set(){throw Error('正式状态只能由会话命令提交');},deleteProperty(){throw Error('正式状态只能由会话命令提交');},defineProperty(){throw Error('正式状态只能由会话命令提交');}});
    cache.set(value,proxy);return proxy;
   };return wrap(state);
  }
  function initial(state,recovery,imported=false){
   return P().encode({snapshot:{domain:W.Core.State.toSerializable(state)},now:Date.now(),recovery,fromSave:true,imported,tick:0,rates:{}});
  }
  async function start(state,recovery){
   if(!window.indexedDB||!crypto.subtle||!navigator.locks)throw Error('当前浏览器不支持可靠会话存储，请使用受支持的浏览器');
   await new Promise((resolve,reject)=>{
    navigator.locks.request(W.Core.Config.saveKey+'-session-owner',{ifAvailable:true},async lock=>{
     if(!lock){reject(Error('另一页面正在运行此存档，请先关闭另一页面'));return;}
     await new Promise(release=>{releaseLock=release;resolve();});
    }).catch(reject);
   });
   store=await window.SessionStore.open({name:W.Core.Config.saveKey+'-session-v2'});
   controller=window.AsyncSessionController.create({
    store,build:W.Core.Build.buildId,onView:changed,onError:error,
    factory(){
     const bundle=W.Simulation.SessionWorkerBundle;
     if(!bundle||bundle.build!==W.Core.Build.buildId)throw Error('会话线程版本不一致');
     const url=URL.createObjectURL(new Blob([bundle.source],{type:'text/javascript'}));
     try{return new Worker(url);}finally{URL.revokeObjectURL(url);}
    }
   });
   await controller.ready();const record=controller.record(),slot=record.active||slotPrefix+'0';
   await controller.start(slot,record.active?undefined:initial(state,recovery));
   if(record.active){
    if(view.importHeld)await command({type:'importRelease',at:Date.now(),reason:'reload'});
    await command({type:'return',at:Date.now()});
   }
   timer=window.setInterval(tick,100);scheduleBoundary();
   watchdog=window.setInterval(()=>{if(!closed&&!controller.error()&&(inflight||busy))controller.query();},1000);
   document.addEventListener('visibilitychange',()=>{
    if(closed||held||!active)return;
    if(document.hidden)void save({closing:true}).catch(()=>{});
    else void resumeForeground().catch(()=>{});
   });
   return view;
  }
  async function tick(){
   cancelBoundary();
   if(!active||held||closed||wakePaused||nativeInactive||view?.frozen||document.hidden||clockBusy||controller.error())return;
   clockBusy=true;
   try{await command({type:'clock',at:Date.now()});}catch{}finally{clockBusy=false;scheduleBoundary();}
  }
  async function save(options={}){
   if(!active)return false;
   if(options.closing){lifecycleGeneration++;wakePaused=true;cancelBoundary();}
   const generation=lifecycleGeneration;
   if(controller.error()){await retry();return false;}
   if(resumeAfterFailedClose){await command({type:'return',at:Date.now()});resumeAfterFailedClose=false;}
   if(held&&!options.allowHeld)return false;
   let rejectFailure;const failure=new Promise((_,reject)=>{rejectFailure=reject;failures.add(reject);});
   try{await Promise.race([command({type:options.closing?'freeze':'save',at:Date.now()}),failure]);}
   catch(e){if(options.closing&&e.sessionPhase!=='admission')resumeAfterFailedClose=true;throw e;}
   finally{failures.delete(rejectFailure);}
   const text=await controller.exportSave();
   // Compatibility export remains readable by the previous version. The session
   // checkpoint is authoritative; failure here is surfaced, never called success.
   try{W.Core.Save.writePrepared(text);mirrorError=null;}catch(e){mirrorError=e;if(options.closing)resumeAfterFailedClose=true;throw e;}
   // An admission failure never froze the owner. A successful explicit retry
   // may release its local pause, unless a newer departure now owns the gate.
   if(!options.closing&&generation===lifecycleGeneration&&!closed&&!held&&!nativeInactive&&!document.hidden&&!view?.frozen){wakePaused=false;scheduleBoundary();}
   return true;
  }
  async function exportSave(){await command({type:'save',at:Date.now()});return controller.exportSave();}
  async function beginImport(){
   if(held)throw Error('导入事务尚未结束');held=true;lifecycleGeneration++;cancelBoundary();
   try{await command({type:'importHold',at:Date.now()});return {state:W.Core.State.cloneForSimulation(view.snapshot.domain),recovery:view.recovery};}
   catch(e){held=false;scheduleBoundary();throw e;}
  }
  async function rollbackImport(reason){if(!held)return;try{await command({type:'importRelease',at:Date.now(),reason});}finally{held=false;scheduleBoundary();}return true;}
  async function importPrepared(prepared){
   if(!held)throw Error('缺少导入冻结');
   const old=controller.view().slot,next=old===slotPrefix+'0'?slotPrefix+'1':slotPrefix+'0';
   try{
    await controller.start(next,initial(prepared.state,prepared.offlineRecovery,true),{replace:true});
    held=false;try{await save();}catch(e){error(e);}return true;
   }catch(e){
    try{await controller.start(old);await command({type:'importRelease',at:Date.now(),reason:'import-failed'});}catch(restoreError){error(restoreError);}finally{held=false;scheduleBoundary();}throw e;
   }
  }
  async function retry(){if(controller?.failed()){await controller.restart();if(view.importHeld)await command({type:'importRelease',at:Date.now(),reason:'restore-failed-import'});await command({type:'return',at:Date.now()});resumeAfterFailedClose=false;return;}controller?.query();if(resumeAfterFailedClose){await command({type:'return',at:Date.now()});resumeAfterFailedClose=false;}}
  function recoveryCommand(method,args=[]){return command({type:'recovery',method,args});}
  return Object.freeze({
   displayOwner:()=>displayOwner,
   start,active:()=>active,readonly,dispatch,
   nativeActive(value){nativeInactive=!value;if(!active||held||closed)return;void (value?resumeForeground():save({closing:true})).catch(error);},facade:(group,original)=>W.Simulation.SessionActions.facade(group,original,dispatch),
   withManual(meta,fn){const old=manual;manual=meta;try{return fn();}finally{manual=old;}},
   busy:()=>busy>0||held,view:()=>view,save,exportSave,beginImport,rollbackImport,importPrepared,
   preference:(key,value)=>command({type:'preference',key,value}).then(()=>value),
   rebirth:options=>dispatch({type:'rebirth',options}),cancel,
   recovery:recoveryCommand,status:()=>view?.status||{phase:'idle',locked:false},
   subscribe(fn){subscribers.add(fn);return ()=>subscribers.delete(fn);},
   retry,
   close(){closed=true;lifecycleGeneration++;cancelBoundary();window.clearInterval(timer);window.clearInterval(watchdog);controller?.close();store?.close();releaseLock?.();}
  });
 }
 W.Simulation.SessionClient=Object.freeze({create});
}(window.WIS));
