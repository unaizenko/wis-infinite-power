"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {setupFuture}=require('./rank-schema-fixture.cjs');
const file=require('./helpers/current-fixtures.cjs').fixturePath('live-training');
test('real breathing preview resumes completed segments and stays readonly',()=>{
 const W=setupFuture({targetSchema:76}).W,s=W.Core.Save.prepare(JSON.parse(fs.readFileSync(file,'utf8'))).state;
 W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(s);
 const R=W.Core.Runtime,C=W.Core.CertifiedRankMath,I=W.Cultivation.ImmortalLogic,serial=()=>JSON.stringify(W.Core.State.toSerializable(s)),before=serial();
 const expected=R.withEvaluationState(s,()=>I.breathingManaGainProgressive());
 const snapshot=W.Core.State.cloneForSimulation(s),scope=I.createManaPreviewScope(snapshot),effects=W.Core.Effects.createFrozenScope(snapshot);
 const work=C.createWork(()=>effects.run(()=>R.withEvaluationState(snapshot,()=>scope.run(()=>I.breathingManaGainProgressive()))));
 try{let slices=0;while(!work.advance({maximumOperations:8}).done)assert(++slices<1500,'preview must retain its completed segment prefix');assert(slices>1);assert.equal(String(work.result()),String(expected));assert.equal(serial(),before);}
 finally{work.cancel();scope.cancel();effects.cancel();}
 assert.throws(()=>scope.run(()=>0),/cancelled/);
});

test('interleaved mana preview scopes stay isolated when one is cancelled',()=>{
 const W=setupFuture({targetSchema:76}).W,s=W.Core.Save.prepare(JSON.parse(fs.readFileSync(file,'utf8'))).state;
 W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(s);
 const R=W.Core.Runtime,S=W.Core.State,C=W.Core.CertifiedRankMath,I=W.Cultivation.ImmortalLogic,before=JSON.stringify(S.toSerializable(s));
 const snapshots=[S.cloneForSimulation(s),S.cloneForSimulation(s)];W.Core.Resources.replaceExact('cultivation.immortal.mana',20000,snapshots[1]);
 const original=snapshots.map(x=>JSON.stringify(S.toSerializable(x))),expected=R.withEvaluationState(snapshots[1],()=>I.breathingManaGainProgressive());
 const entries=snapshots.map(snapshot=>{const scope=I.createManaPreviewScope(snapshot),effects=W.Core.Effects.createFrozenScope(snapshot),work=C.createWork(()=>effects.run(()=>R.withEvaluationState(snapshot,()=>scope.run(()=>I.breathingManaGainProgressive()))));return {scope,effects,work};});
 try{for(let n=0;n<10;n++)for(const e of entries)e.work.advance({maximumOperations:8});entries[0].work.cancel();entries[0].scope.cancel();let n=0;while(!entries[1].work.advance({maximumOperations:8}).done)assert(++n<1500);assert.equal(String(entries[1].work.result()),String(expected));assert.equal(JSON.stringify(S.toSerializable(s)),before);assert.deepEqual(snapshots.map(x=>JSON.stringify(S.toSerializable(x))),original);}finally{for(const e of entries){e.work.cancel();e.scope.cancel();e.effects.cancel();}}
});
