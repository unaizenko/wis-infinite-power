"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');const {setupFuture}=require('./rank-schema-fixture.cjs');
const file='E:/download/WIS-存档-2026-11-11T01-17-11-990Z.json';
test('training retains prepared source and region prefix across small slices',{skip:!fs.existsSync(file)},()=>{
 const W=setupFuture({targetSchema:76,transformSource(file,s){return file==='js/power/scale-logic.js'?s.replace('function quantityPreSoftcap(values,kind){','function quantityPreSoftcap(...args){WIS.__prefix=(WIS.__prefix||0)+1;return testPreSoftcap(...args);}function testPreSoftcap(values,kind){'):s;}}).W;
 const s=W.Core.Save.prepare(JSON.parse(fs.readFileSync(file,'utf8'))).state;W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(s);
 const before=JSON.stringify(W.Core.State.toSerializable(s)),work=W.Power.ScaleLogic.createTrainingActionWork(s);let slices=0;
 try{while(!work.advance(Infinity,{maximumOperations:8}).done)assert(++slices<10000);assert(slices>100);assert(W.__prefix<20,`region prefix replayed ${W.__prefix} times`);assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);}finally{work.cancel();}
});

test('martial Sever Dao final stage resumes without closing the training generator',{skip:!fs.existsSync(file)},()=>{
 const W=setupFuture({targetSchema:76}).W,s=W.Core.Save.prepare(JSON.parse(fs.readFileSync(file,'utf8'))).state;s.cultivation.active='martial';s.activeChallenge='martialSeverDao';W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(s);
 const R=W.Core.Runtime,C=W.Core.CertifiedRankMath,S=W.Power.ScaleLogic,expected=R.withEvaluationState(s,()=>S.conversionGain()),effects=W.Core.Effects.createFrozenScope(s),before=JSON.stringify(W.Core.State.toSerializable(s)),work=C.createWork(()=>effects.run(()=>R.withEvaluationState(s,()=>S.conversionGain())));
 try{let n=0;while(!work.advance({maximumOperations:8}).done)assert(++n<10000);assert.equal(String(work.result()),String(expected));assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);}finally{work.cancel();effects.cancel();}
});
