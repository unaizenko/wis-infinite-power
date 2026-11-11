"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const {setupFuture}=require('./rank-schema-fixture.cjs');
function evaluate(reference, actual, stock, upgrades, maximumOperations=256){
 const {W}=setupFuture({targetSchema:76,transformSource(file,s){if(file!=='js/power/scale-logic.js')return s;s=s.replace('function infinitySoftcapInverse(actual, amount) {','WIS.__inverse=infinitySoftcapInverse;function infinitySoftcapInverse(actual, amount) {');if(reference)s=s.replace('const narrowed=yield* narrowQuantityInverseBounds(lo,hi,amount,prepared,below);','const narrowed=null;');return s.replace('const quick=compare(gain,actual);','WIS.__probes=(WIS.__probes||0)+1;const quick=compare(gain,actual);');}});
 const state=W.Core.State.fresh();state.meta.infinity.upgrades=upgrades;W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);
 const A=W.Core.Amount,C=W.Core.CertifiedRankMath,scope=W.Core.Effects.createFrozenScope(state),work=C.createWork(()=>scope.run(()=>W.__inverse(A.from(actual),A.from(stock))));
 try{let n=0;while(!work.advance({maximumOperations}).done)assert(++n<20000);return {value:JSON.stringify(A.serialize(work.result())),probes:W.__probes};}finally{work.cancel();scope.cancel();}
}
test('large softened inverse certifies a local bracket instead of sweeping the full exponent range',()=>{
 for(const upgrades of [{'E3-2':true},{'B3-1':true},{'B3-2':true},{'E3-2':true,'B3-1':true}]){
  const original=evaluate(true,'1e1000','1e5',upgrades),fast=evaluate(false,'1e1000','1e5',upgrades);
  assert.equal(fast.value,original.value);assert(fast.probes<original.probes*.6,JSON.stringify({original:original.probes,fast:fast.probes,upgrades}));
 }
});
test('local inverse bracket continues at one operation and declines small or layered coordinates',()=>{
 for(const [actual,stock] of [['1e1000','1e5'],['1e1000','1e1082'],['1e6','1e5'],['1e-12','1e5']]){
  const expected=evaluate(true,actual,stock,{'B3-1':true});assert.equal(evaluate(false,actual,stock,{'B3-1':true},1).value,expected.value);
 }
});
