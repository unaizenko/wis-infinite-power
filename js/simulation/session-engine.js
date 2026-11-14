// Session authority. Main-thread consumers receive only durable published snapshots.
(function(W){
 'use strict';
 function create(initial,host){
  const P=W.Simulation.WorkerProtocol,S=W.Core.State,R=W.Core.Runtime,A=W.Simulation.SessionActions,copy=x=>P.decode(P.encode(x));
  let loop,reservation=null,activeAction=null,frozen=initial.frozen===true,saveText=initial.saveText||null;
  let importHold=null;
  // Display identity survives clock-only clones, but never a different owner/domain.
  const rateOwners=new WeakMap();let ownerSerial=0,previewActionRevision=0;
  function rateOwner(state){if(!rateOwners.has(state))rateOwners.set(state,{id:++ownerSerial});return rateOwners.get(state);}
  let committed={tick:initial.tick||0,rates:copy(initial.rates||{})};
  host.setNow(initial.now);
  const h=W.Simulation.OfflineHeadless.create(initial.snapshot,{
   checkpoint(){host.changed();return true;},
   yield(){publish();return host.yield();}
  });
  W.tmp.tick=committed.tick;W.tmp.rates=copy(committed.rates);
  if(initial.recovery&&!h.offline.restorePersistenceSnapshot(initial.recovery,0,{checkpoint:false}))throw Error('unsupported recovery snapshot');
  function publish(){committed={tick:W.tmp.tick,rates:copy(W.tmp.rates)};host.changed();}
  function restore(snapshot){
   R.setState(S.cloneForSimulation(snapshot.domain));
   W.Power.Scale.restoreTreasureTransient(snapshot.powerTransient);
   W.Cultivation.Immortal.restoreTreasureTransient(snapshot.cultivationTransient);
  }
  const prepare=(seconds,segment)=>{
   const saved={index:0,seconds,segment:copy(segment)},job=h.step.prepareOnlineWork(seconds,segment);reservation=saved;
   return {...job,close(){job.close();if(reservation===saved)reservation=null;W.tmp.tick=committed.tick;W.tmp.rates=copy(committed.rates);}};
  };
  loop=W.Simulation.Loop.create({
   getState:h.getState,rateIdentity:()=>{const state=h.getState();return [rateOwner(state),state.powerSystem.active,state.cultivation.active,state.activeChallenge];},offline:h.offline,epsilon:1e-10,simulationStepSeconds:.1,onlineSliceBudgetMs:12,maxOnlineStepsPerFrame:8,
   effectiveDevSpeed:()=>1,isInitialLoadComplete:()=>true,isStateReady:()=>true,
   requestRender(){host.changed();},flushRender(){},scheduleRender(){},saveState(){host.changed();},
   prepareOnlineWork:prepare,advanceGameStep(...args){const result=h.step.advanceGameStep(...args);reservation=null;publish();return result;},
   onlineStateKey:h.step.onlineStateKey,
   commitDiscard(parts,reason){const before=h.getState(),state=S.cloneForSimulation(before),result=W.Simulation.DiscardEffects.apply(state,parts,reason);state.core.runtime.timeLedger.pendingDiscard=null;if(result.events.length===0)rateOwners.set(state,rateOwner(before));R.setState(state);host.changed();return true;},
   onOnlineSettlementError(error){throw error;}
  });
  if(initial.loop)loop.restore(initial.loop);else if(initial.fromSave){loop.setLastTickAt(h.getState().lastUpdateAt);loop.restoreClosedTime(initial.recovery);if(initial.imported)h.offline.holdCatchUpUntilUserStart('import');}else loop.setLastTickAt(initial.now);
  if(initial.importHeld)importHold=loop.beginImportHold(initial.now);
  if(initial.reservation)loop.restoreSessionReservation(initial.reservation);
  function completeAction(){
   previewActionRevision++;
   W.Meta.Achievements.recordCurrent();
   S.updateLifetimeStatistics(h.getState(),W.Cultivation.ImmortalLogic.cultivationRealmLevel());
   W.Meta.BigNumbers.syncUnlock(h.getState());publish();
  }
  function rebirth(options){
   const before=h.snapshot(),recovery=h.offline.getPersistenceSnapshot(),online=loop.snapshot();
   return W.Meta.Infinity.commitRebirth(options,{
    getState:h.getState,capture:()=>({before,recovery,online}),
    cancel(){h.offline.cancelCatchUp();loop.resetAccumulators();},
    install(next){R.setState(next);loop.resetAccumulators({preservePending:W.Core.Reset.preservesContent('infinity',next)&&!W.Meta.Infinity.isInfinityChallenge(next.activeChallenge)});W.Power.Scale.resetTransient();W.Cultivation.Immortal.resetTransient();},
    save(){host.changed();},
    restore(saved){restore(saved.before);h.offline.restorePersistenceSnapshot(saved.recovery,0,{checkpoint:false});loop.restore(saved.online);}
   });
  }
  R.bind({
   state:h.getState,setState:h.installState,
   infinityRebirth:rebirth,
   requestQiBatch:render=>loop.requestQiBatch(render),
   beforePlayerAction:options=>loop.beforePlayerAction(options),
   requestDeferredAction:factory=>loop.requestDeferredAction(factory),
   isDeferredActionPending:()=>loop.isDeferredActionPending(),
   cancelDeferredAction:reason=>loop.cancelDeferredAction(reason)
  });
  function at(value){if(!Number.isSafeInteger(value)||value<host.now())throw Error('non-monotonic clock');host.setNow(value);}
  function exportSave(){
   h.offline.invalidateSourceModels();const state=S.cloneForSimulation(h.getState());state.lastUpdateAt=host.now();
   saveText=JSON.stringify(W.Core.Save.envelope(state,false,{offlineRecoveryOverride:h.offline.getPersistenceSnapshot()}));return saveText;
  }
  function finish(id,status,value){if(activeAction===id)activeAction=null;host.completed(id,status,value);publish();}
  function action(m,id){
   if(!A.accepts(m.group,m.method))throw Error('unsupported resource command');
   if(activeAction!==null||loop.isDeferredActionPending()||h.offline.getCatchUpStatus().locked)throw Error('action already pending');
   const cooperative=m.group==='scale'&&m.method==='train'||m.group==='immortal'&&['breathe','explore'].includes(m.method);
   if(!cooperative){
    if(loop.beforePlayerAction()===false)return {status:'cancelled',value:false};
    loop.invalidateOnlineScheduler();
    const before=h.snapshot(),online=loop.snapshot(),recovery=h.offline.getPersistenceSnapshot(),previousConfirm=window.confirm;
    try{window.confirm=text=>{if(m.confirmation===String(text))return true;throw Error('SESSION_CONFIRM:'+String(text));};
     const result=A.invoke(m);if(m.group==='xiuzhen')W.Meta.Challenges.checkActiveChallengeCompletion();completeAction();return {status:'done',value:result===false?false:true};
    }catch(error){restore(before);h.offline.restorePersistenceSnapshot(recovery,0,{checkpoint:false});loop.restore(online);throw error;}
    finally{window.confirm=previousConfirm;}
   }
   activeAction=id;
   const promise=loop.requestDeferredAction(state=>{
    const I=W.Cultivation.ImmortalLogic;
    const raw=m.group==='scale'&&m.method==='train'?W.Power.ScaleLogic.createTrainingActionWork(state,m.args?.[0]!==false,{worker:false})
     :m.group==='immortal'&&m.method==='breathe'?I.createBreathingActionWork(state)
     :m.group==='immortal'&&m.method==='explore'?I.createExplorationActionWork(state):null;
    if(raw)return {...raw,commit(){const result=raw.commit();completeAction();return result;},cancel(reason){raw.cancel(reason);W.tmp.tick=committed.tick;W.tmp.rates=copy(committed.rates);}};
    throw Error('missing cooperative action');
   });
   promise.then(value=>finish(id,value===false?'cancelled':'done',value),error=>finish(id,'failed',String(error.message||error)));
   host.changed();return {status:'pending'};
  }
  function command(m,id){
   if(!m||typeof m.type!=='string')throw Error('unsupported command');
   if(importHold&&!['importRelease','save'].includes(m.type))throw Error('import session held');
   if(frozen&&!['return','save','freeze'].includes(m.type))throw Error('session frozen');
   if(m.type==='clock'){at(m.at);loop.runMainTick();host.changed();return {status:'done'};}
   if(m.type==='save'){at(m.at);loop.prepareSave({captureOnly:true});exportSave();host.changed();return {status:'done'};}
   if(m.type==='freeze'){at(m.at);loop.prepareSave({closing:true,captureOnly:true});frozen=true;exportSave();host.changed();return {status:'done'};}
   if(m.type==='return'){at(m.at);frozen=false;const seconds=loop.restoreClosedTime(h.offline.getPersistenceSnapshot());host.changed();return {status:'done',seconds};}
   if(m.type==='importHold'){at(m.at);loop.captureForegroundTime(m.at);importHold=loop.beginImportHold(m.at);if(!importHold)throw Error('import already held');publish();return {status:'done'};}
   if(m.type==='importRelease'){at(m.at);if(importHold)loop.finishImportHold(importHold.token,{accountElapsed:true,reason:m.reason||'import-cancel'});importHold=null;publish();return {status:'done'};}
   if(m.type==='cancel'){loop.cancelDeferredAction(m.reason||'cancelled');publish();return {status:'done'};}
   if(m.type==='action')return action(m,id);
   if(m.type==='preference'){
    if(activeAction!==null||loop.beforePlayerAction()===false)throw Error('请等待当前操作完成');
    const preferences=h.getState().core.preferences;
    if(m.key==='treeSuperAutomationMultiplier'){const value=W.Core.BigNum.parseFinite(m.value);if(!value||value.lt(1))throw Error('invalid automation multiplier');preferences[m.key]=value;publish();return {status:'done',value:String(value)};}
    if(!Object.hasOwn(preferences,m.key)||!['boolean','string'].includes(typeof preferences[m.key])||typeof m.value!==typeof preferences[m.key])throw Error('invalid preference');
    preferences[m.key]=m.value;host.changed();return {status:'done',value:m.value};
   }
   if(m.type==='rebirth'){
    if(activeAction!==null||h.offline.getCatchUpStatus().locked)throw Error('settlement pending');
    if(loop.beforePlayerAction()===false)throw Error('settlement pending');rebirth(m.options||{});completeAction();return {status:'done',value:true};
   }
   if(m.type==='recovery'){
    const allowed=['simulateOfflineProgress','retryCatchUp','startCatchUp','pauseCatchUpByPlayer','acknowledgeCatchUp','abandonCatchUp','convertOfflineToCompensation'];
    if(!allowed.includes(m.method))throw Error('unsupported recovery command');
    loop.invalidateOnlineScheduler();
    if(m.method==='convertOfflineToCompensation'){loop.prepareSave();h.offline.sealOnlineTail();}
    const result=h.offline[m.method](...(m.args||[]));
    if(result&&typeof result.then==='function'){result.then(value=>{host.completed(id,'done',typeof value==='string'?value:true);publish();},error=>{host.completed(id,'failed',String(error.message||error));publish();});publish();return {status:'pending'};}
    publish();return {status:'done',value:typeof result==='boolean'?result:true};
   }
   throw Error('unsupported command');
  }
  return Object.freeze({
   command,pending:()=>loop.isDeferredActionPending(),
   checkpoint:()=>{
    // The Loop owns registered pending time while an online candidate is in flight.
    // Align detached display/recovery data without changing that candidate's inputs.
    const timing=loop.snapshot(),snapshot=h.snapshot();
    snapshot.domain.core.runtime.timeLedger.pendingContinuousTime=copy(timing.onlineIntervals);
    return {presentationVersion:rateOwner(h.getState()).id+':'+previewActionRevision,snapshot,tick:committed.tick,rates:copy(committed.rates),publishedRates:copy(loop.getCommittedRates()),loop:timing,reservation:copy(reservation),
     recovery:h.offline.getPersistenceSnapshot(),status:h.offline.getCatchUpStatus(),settlement:loop.settlementStatus(),
     now:host.now(),saveText,frozen,importHeld:!!importHold,pendingAction:activeAction};
   },
   getState:h.getState,loop
  });
 }
 W.Simulation.SessionEngine=Object.freeze({create});
}(window.WIS));
