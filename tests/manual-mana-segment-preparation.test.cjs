'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup75}=require('./amount-fixture.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
function setup(){
 const {W,context}=setup75({targetSchema:76,transformSource(file,source){
  if(file.endsWith('/immortal-logic.js'))source=source.replace('WIS.Cultivation.ImmortalLogic = api;',`nextManaProgressBoundary=((fn)=>function(...args){const value=fn(...args);globalThis.boundaryDone++;if(globalThis.failBoundary)throw Error('boundary preparation failure');return value;})(nextManaProgressBoundary);WIS.Cultivation.ImmortalLogic = api;`);
  return source;
 }});
 context.boundaryDone=0;context.failBoundary=false;
 const raw=readFixture('breathing-mobile');raw.data.core.resources.joules='1000000';
 W.Simulation.OfflineHeadless.create({domain:W.Core.Save.prepare(raw).state},{checkpoint(){},yield:()=>Promise.resolve()});
 return {W,context,I:W.Cultivation.ImmortalLogic,R:W.Core.Runtime,S:W.Core.State};
}
const wire=x=>x.W.Simulation.WorkerProtocol.encode(x.R.getState());
function finish(work,maximumOperations){for(let i=0;i<30000;i++)if(work.advance(Infinity,{maximumOperations}).done)return;throw Error('work limit');}
for(const budget of [1,32])test('breathing retains each completed segment boundary across budget '+budget+' suspension',()=>{
 const x=setup(),start=x.S.cloneForSimulation(x.R.getState());x.I.breathe();const expected=wire(x),completed=x.context.boundaryDone;
 assert.equal(completed,16,'fixture must exercise multiple realm segments');
 x.R.setState(start);x.context.boundaryDone=0;const before=wire(x),work=x.I.createBreathingActionWork(start);
 try{finish(work,budget);assert.equal(wire(x),before);assert.equal(x.context.boundaryDone,completed,'completed segment boundary replayed');work.commit();assert.equal(wire(x),expected);}finally{work.cancel();}
});
for(const mode of ['cancel','failure'])test('segment preparation '+mode+' preserves live state and permits a fresh action',()=>{
 const x=setup(),start=x.S.cloneForSimulation(x.R.getState());x.I.breathe();const expected=wire(x);
 x.R.setState(start);x.context.boundaryDone=0;const before=wire(x),work=x.I.createBreathingActionWork(start);
 try{
  if(mode==='failure'){x.context.failBoundary=true;assert.throws(()=>finish(work,1),/boundary preparation failure/);}
  else{for(let i=0;i<30000&&!x.context.boundaryDone;i++)assert.equal(work.advance(Infinity,{maximumOperations:1}).done,false);assert(x.context.boundaryDone>0);work.cancel();}
  assert.equal(wire(x),before);assert.equal(x.R.isEvaluating(),false);assert.throws(()=>work.commit());
  x.context.failBoundary=false;const fresh=x.I.createBreathingActionWork(x.R.getState());try{finish(fresh,32);fresh.commit();assert.equal(wire(x),expected);}finally{fresh.cancel();}
 }finally{x.context.failBoundary=false;work.cancel();}
});
test('later breathing actions recompute preparation from their own accepted state',()=>{
 const x=setup(),start=x.S.cloneForSimulation(x.R.getState()),refill=()=>x.W.Core.Resources.replaceExact('core.joules',2000000,x.R.getState());
 x.I.breathe();refill();x.I.breathe();const expected=wire(x);
 x.R.setState(start);for(let i=0;i<2;i++){if(i)refill();const work=x.I.createBreathingActionWork(x.R.getState());try{finish(work,32);work.commit();}finally{work.cancel();}}
 assert.equal(wire(x),expected);
});

test('preparation reuse adds no yield steps to the existing one-operation schedule',()=>{
 const x=setup(),start=x.S.cloneForSimulation(x.R.getState());x.I.breathe();x.R.setState(start);
 const work=x.I.createBreathingActionWork(start);let calls=0;
 try{while(!work.advance(Infinity,{maximumOperations:1}).done){if(++calls>30000)throw Error('work limit');}
  // The retained unoptimized fixture completes in 872 advances. Reusing pure
  // results must not insert new yields merely to remember those results.
  assert(calls+1<=872,'preparation reuse added scheduling steps: '+(calls+1));
 }finally{work.cancel();}
});

