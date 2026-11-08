"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {setup75}=require('./amount-fixture.cjs');
const playerFile='E:/download/WIS-存档-2026-11-07T12-18-28-780Z.json';
function setup(player=false){
  const instrumentation={calls:0,forbid:false};
  const {W,context}=setup75({transformSource(file,source){
    if(file.endsWith('/immortal-logic.js'))for(const name of ['performBreathing','performExploration']){
      const marker='function '+name+'(prepareOnly = false) {';
      assert(source.includes(marker));source=source.replace(marker,marker+"globalThis.__manualCommit.calls++;if(globalThis.__manualCommit.forbid)throw Error('manual gain preparation replayed');");
    }return source;
  }});
  context.__manualCommit=instrumentation;
  const initial=player?W.Core.Save.prepare(JSON.parse(fs.readFileSync(playerFile,'utf8'))).state:W.Core.State.fresh();
  const host=W.Simulation.OfflineHeadless.create({domain:initial},{checkpoint(){},yield:()=>Promise.resolve()});
  const s=host.getState();
  if(!player){s.cultivation.active='immortal';s.qiRefiningUnlocked=true;s.foundationUnlocked=true;s.goldenCoreUnlocked=true;s.advancedRealmLevel=6;
    W.Core.Resources.replaceExact('cultivation.immortal.mana','1e101',s);
    W.Core.Resources.replaceExact('core.joules','1e110',s);W.Core.Resources.replaceExact('core.power','1e110',s);}
  return {W,s,I:W.Cultivation.ImmortalLogic,R:W.Core.Runtime,S:W.Core.State,host,instrumentation};
}
const wire=(W,s=W.Core.Runtime.getState())=>W.Simulation.WorkerProtocol.encode({domain:W.Core.State.toSerializable(s),power:W.Power.Scale.snapshotTreasureTransient(),cultivation:W.Cultivation.Immortal.snapshotTreasureTransient()});
function finish(work){let slices=0;for(;slices<20000;slices++)if(work.advance(performance.now()+3,{maximumEvaluations:8,maximumOperations:32}).done)return slices+1;throw Error('manual work did not complete');}
const workFor=(e,kind,s=e.R.getState())=>kind==='breathing'?e.I.createBreathingActionWork(s):e.I.createExplorationActionWork(s);
const sync=(e,kind)=>kind==='breathing'?e.I.breathe():e.I.explore();
for(const kind of ['breathing','exploration'])test('high-stock '+kind+' commits its prepared candidate once without gain replay',()=>{
  const e=setup(),{W,R,S,instrumentation}=e,start=S.cloneForSimulation(e.s),before=wire(W);
  sync(e,kind);const expected=wire(W);assert.notEqual(expected,before,'fixture must execute the action');
  R.setState(start);W.Power.Scale.resetTransient();W.Cultivation.Immortal.resetTransient();
  const work=workFor(e,kind);try{assert(finish(work)>1,'fixture must exercise deferred scalar continuation');assert.equal(wire(W),before);
    const calls=instrumentation.calls;instrumentation.forbid=true;work.commit();assert.equal(instrumentation.calls,calls);assert.equal(wire(W),expected);
    assert.throws(()=>work.commit());W.Core.Resources.creditExact('core.joules',1,R.getState());assert.doesNotThrow(()=>wire(W));
  }finally{instrumentation.forbid=false;work.cancel();}
});
test('current player high-stock breathing retains the exact prepared result',{skip:!fs.existsSync(playerFile)?'external player fixture unavailable':false},t=>{
  const e=setup(true),{W,R,S,instrumentation}=e;if(W.Core.BigNum.lt(e.s.mana,'1e100'))return t.skip('player fixture does not exercise high stock');
  const start=S.cloneForSimulation(e.s),before=wire(W);sync(e,'breathing');const expected=wire(W);assert.notEqual(expected,before);
  R.setState(start);W.Power.Scale.resetTransient();W.Cultivation.Immortal.resetTransient();const work=workFor(e,'breathing');
  try{finish(work);assert.equal(wire(W),before);instrumentation.forbid=true;work.commit();assert.equal(wire(W),expected);}finally{instrumentation.forbid=false;work.cancel();}
});
test('high-stock preparation keeps latest ledger preferences and live transient values',()=>{
  const e=setup(),{W,s}=e,work=workFor(e,'breathing');try{finish(work);s.core.runtime.timeLedger.registeredUntil+=123;s.core.preferences.soundEnabled=true;
    W.Cultivation.Immortal.restoreTreasureTransient({passiveManaRollAccumulator:.25,baLingChiRollAccumulator:.5});
    const ledger=JSON.stringify(s.core.runtime.timeLedger),prefs=JSON.stringify(s.core.preferences),transient=W.Cultivation.Immortal.snapshotTreasureTransient();
    work.commit();assert.equal(JSON.stringify(e.R.getState().core.runtime.timeLedger),ledger);assert.equal(JSON.stringify(e.R.getState().core.preferences),prefs);assert.deepEqual(W.Cultivation.Immortal.snapshotTreasureTransient(),transient);
  }finally{work.cancel();}
});
test('high-stock prepared actions are invalidated by payment or cancelled without publication',()=>{
  for(const mode of ['payment','cancel']){const e=setup(),work=workFor(e,'exploration');finish(work);if(mode==='payment')e.W.Core.Resources.debitExact('core.power','1e109',e.s);else work.cancel();
    const before=wire(e.W);assert.throws(()=>work.commit());assert.equal(wire(e.W),before);work.cancel();}
});
for(const kind of ['breathing','exploration'])test('high-stock '+kind+' late completion failure rolls back every domain and transient',()=>{
  const e=setup(),{W,S}=e,work=workFor(e,kind);try{finish(work);const before=wire(W);let calls=0;
    W.Core.State={...S,addStatistic(...args){const value=S.addStatistic(...args);if(++calls===2){W.Cultivation.Immortal.restoreTreasureTransient({passiveManaRollAccumulator:99,baLingChiRollAccumulator:99});throw Error('late completion failure');}return value;}};
    assert.throws(()=>work.commit(),/late completion failure/);assert.equal(wire(W),before);assert.throws(()=>work.commit());
  }finally{W.Core.State=S;work.cancel();}
});

test('high-stock exploration samples power-dependent effects after its own payment',()=>{
  const e=setup(),{W,R,S}=e;
  W.Core.Effects.register('prepared-commit-power-provider',()=>[{id:'prepared-commit-power-mana',target:'mana',layer:'regionMultiplier',group:'test',dynamic:true,dynamicResources:['power'],value:current=>W.Core.BigNum.div(current.power,'1e110')}]);
  const start=S.cloneForSimulation(e.s);sync(e,'exploration');const expected=wire(W);
  R.setState(start);W.Power.Scale.resetTransient();W.Cultivation.Immortal.resetTransient();const work=workFor(e,'exploration');
  try{finish(work);e.instrumentation.forbid=true;work.commit();assert.equal(wire(W),expected);}finally{e.instrumentation.forbid=false;work.cancel();}
});
test('high-stock input mutation between scalar slices cancels old prepared work',()=>{
  const e=setup(),work=workFor(e,'breathing');assert.equal(work.advance(performance.now(),{maximumEvaluations:1}).done,false);
  e.W.Core.Resources.creditExact('core.joules','1e109',e.s);const before=wire(e.W);
  assert.throws(()=>work.advance(Infinity));assert.equal(wire(e.W),before);assert.equal(work.valid(),false);assert.throws(()=>work.commit());work.cancel();
});
