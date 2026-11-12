"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const {readFixture}=require('./helpers/current-fixtures.cjs'),{loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
for(const j of [0,3000,50000,1000000])test(`player breathing full result and save roundtrip, J=${j}`,()=>{
 const {W}=loadProductionNumericRuntime(),raw=readFixture('breathing-mobile'),untouched=JSON.stringify(raw),s=W.Core.Save.prepare(raw).state;
 W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});
 const R=W.Core.Runtime,S=W.Core.State,I=W.Cultivation.ImmortalLogic,A=W.Core.Amount,Q=W.Core.Resources,serial=()=>JSON.stringify(S.toSerializable(R.getState())),complete=()=>{W.Meta.Achievements.recordCurrent();S.updateLifetimeStatistics(R.getState(),I.cultivationRealmLevel());W.Meta.BigNumbers.syncUnlock(R.getState());};
 Q.replaceExact('core.joules',A.from(j),R.getState());const initial=S.cloneForSimulation(R.getState()),before=serial();I.breathe();complete();const expected=serial();
 R.setState(initial);const job=I.createBreathingActionWork(initial);let done=false;
 try{for(let n=0;n<20000&&!done;n++)done=job.advance(performance.now()+3,{maximumOperations:32}).done;assert(done);assert.equal(serial(),before,'private work changed gameplay');job.commit();complete();assert.equal(serial(),expected,'full resource, treasure, TREE, RNG, challenge and time state differs from formal reference');assert.equal(A.compare(Q.readExact('core.joules',R.getState()),0),0);if(j)assert(W.Core.BigNum.gt(R.getState().mana,s.mana));
 const saved=W.Core.Save.envelope(R.getState(),true),loaded=W.Core.Save.prepare(JSON.parse(JSON.stringify(saved))).state;
 assert.equal(JSON.stringify(S.toSerializable(loaded)),expected);assert.equal(JSON.stringify(raw),untouched);assert.throws(()=>job.commit());
 }finally{job.cancel();}
});
