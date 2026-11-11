'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setupFuture}=require('./rank-schema-fixture.cjs');
function fixture(){const {W}=setupFuture({targetSchema:76,transformSource(file,source){return file==='js/power/scale-logic.js'?source.replace('function quantitySoftcapExponent(value,exponent){','WIS.__softcap=quantitySoftcapExponent;\n function quantitySoftcapExponent(value,exponent){').replace('function originalNormalResourceSoftcapExponent(', 'function originalNormalResourceSoftcapExponent(...args){const v=originalNormalResourceSoftcapExponentProbe(...args);WIS.__exponentCalls=(WIS.__exponentCalls||0)+1;return v;}\n function originalNormalResourceSoftcapExponentProbe(').replace('if(yield ()=>below(mid))lo=mid;else hi=mid;','const direction=yield ()=>below(mid);WIS.__probeCalls=(WIS.__probeCalls||0)+1;if(direction)lo=mid;else hi=mid;').replace('function infinitySoftcapInverse(actual, amount) {','WIS.__inverse=infinitySoftcapInverse;\n  function infinitySoftcapInverse(actual, amount) {'):source;}}),s=W.Core.State.fresh();s.meta.infinity.upgrades={'E1':true,'E2-2':true,'E3-2':true};W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});return W;}
function inverse(W,operations,actual='1e6',stock='1e5'){const C=W.Core.CertifiedRankMath,A=W.Core.Amount,s=W.Core.Runtime.getState(),scope=W.Core.Effects.createFrozenScope(s);const job=C.createWork(()=>scope.run(()=>W.__inverse(A.from(actual),A.from(stock))));try{for(let n=0;n<4000;n++){if(job.advance({maximumOperations:operations}).done)return {value:JSON.stringify(A.serialize(job.result())),calls:W.__probeCalls||0,slices:n+1};}assert.fail('inverse did not complete within bounded operations');}finally{job.cancel();scope.cancel();}}
test('infinity inverse small slices preserve search progress and exact result',()=>{const full=inverse(fixture(),65536),sliced=inverse(fixture(),16);assert(full.calls>0&&sliced.calls>0,"probe instrumentation must execute");assert.deepEqual(sliced.value,full.value);assert.equal(JSON.parse(full.value).main,'2024351.904828329');assert(sliced.calls===full.calls,`completed probes replayed: sliced ${sliced.calls}, full ${full.calls}`);});


for(const [actual,stock,upgrades] of [['0','1e5',true],['1','0',true],['1e12','1e8',true],['1e6','1e5',false]])test('inverse boundary '+actual+'/'+stock+'/'+upgrades,()=>{
 const a=fixture(),b=fixture();if(!upgrades){a.Core.Runtime.getState().meta.infinity.upgrades={};b.Core.Runtime.getState().meta.infinity.upgrades={};}
 assert.equal(inverse(a,65536,actual,stock).value,inverse(b,16,actual,stock).value);
});
test('separate effect scopes in one arithmetic work never share inverse results',()=>{
 const W=fixture(),C=W.Core.CertifiedRankMath,A=W.Core.Amount,R=W.Core.Runtime,S=W.Core.State,a=R.getState(),b=S.cloneForSimulation(a);b.meta.infinity.upgrades={};
 const scopes=[W.Core.Effects.createFrozenScope(a),W.Core.Effects.createFrozenScope(b)];
 const invoke=(s,i)=>R.withState(s,()=>scopes[i].run(()=>W.__inverse(A.from('1e6'),A.from('1e5'))));
 const reference=[invoke(a,0),invoke(b,1)].map(v=>JSON.stringify(A.serialize(v)));assert.notEqual(reference[0],reference[1]);
 const job=C.createWork(()=>C.task('scope-sequence',function*(){const x=yield ()=>invoke(a,0),y=yield ()=>invoke(b,1),z=yield ()=>invoke(a,0);return [x,y,z].map(v=>JSON.stringify(A.serialize(v)));}));
 try{while(!job.advance({maximumOperations:16}).done){}assert.deepEqual(Array.from(job.result()),[reference[0],reference[1],reference[0]]);}finally{job.cancel();scopes.forEach(s=>s.cancel());}
});
const fs=require('node:fs');
const playerPath=require('./helpers/current-fixtures.cjs').fixturePath('ring-training');
function player(path=playerPath){const W=fixture(),raw=JSON.parse(fs.readFileSync(path,'utf8')),s=W.Core.Save.prepare(raw).state;W.Core.Runtime.setState(s);return {W,raw,s,serial:()=>JSON.stringify(W.Core.State.toSerializable(W.Core.Runtime.getState()))};}
function finishTraining(job){let slices=0;const started=performance.now();while(!job.advance(performance.now()+3).done){assert(++slices<20000,'bounded work');assert(performance.now()-started<10000,'small slices must finish');}}
test('real ring save training agrees with synchronous whole domain and save reload',()=>{
 const a=player(),b=player(),before=a.serial(),S=a.W.Core.State,R=a.W.Core.Runtime;
 b.W.Power.ScaleLogic.train(true);assert.equal(String(b.W.Core.Runtime.getState().power),'584957794.7584203');
 const job=a.W.Power.ScaleLogic.createTrainingActionWork(a.s,true);try{finishTraining(job);assert.equal(a.serial(),before);job.commit();assert.deepEqual(JSON.parse(a.serial()),JSON.parse(b.serial()));assert.throws(()=>job.commit());
 const round=a.W.Core.Save.prepare({...a.raw,data:S.toSerializable(R.getState())}).state;assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(round))),JSON.parse(a.serial()));
 }finally{job.cancel();}
});
test('real training cancellation, changed input and late failure preserve resources',()=>{
 for(const mode of ['cancel','changed','failure']){const f=player(),{W,s,serial}=f,before=serial(),job=W.Power.ScaleLogic.createTrainingActionWork(s,true);
 try{if(mode==='cancel'){job.advance(performance.now()+1);job.cancel();assert.throws(()=>job.commit());assert.equal(serial(),before);}
 else{finishTraining(job);if(mode==='changed'){s.power=W.Core.BigNum.BN(1);const changed=serial();assert.throws(()=>job.commit(),e=>e.code==='rank-work-stale');assert.equal(serial(),changed);}
 else{const S=W.Core.State;W.Core.State={...S,addStatistic(){throw Error('late-statistic-failure')}};assert.throws(()=>job.commit(),/late-statistic-failure/);assert.equal(serial(),before);}}
 }finally{job.cancel();}}
});
test('same displayed input with different exact tails owns separate inverse work',()=>{
 const W=fixture(),A=W.Core.Amount,C=W.Core.CertifiedRankMath,s=W.Core.Runtime.getState(),scope=W.Core.Effects.createFrozenScope(s),values=[A.fromParts('1e6',['-1e-12']),A.fromParts('1e6',['1e-12'])];
 assert.equal(String(A.project(values[0])),String(A.project(values[1])));
 const run=i=>scope.run(()=>W.__inverse(values[i],A.from('1e5')));
 W.__probeCalls=0;const expected=values.map((_,i)=>JSON.stringify(A.serialize(run(i)))),probes=W.__probeCalls;assert(probes>0,"tail probe instrumentation must execute");
 W.__probeCalls=0;const job=C.createWork(()=>C.task('tail-sequence',function*(){const a=yield ()=>run(0),b=yield ()=>run(1);return [a,b].map(v=>JSON.stringify(A.serialize(v)));}));
 try{while(!job.advance({maximumOperations:16}).done){}assert.deepEqual(Array.from(job.result()),expected);assert.equal(W.__probeCalls,probes);}finally{job.cancel();scope.cancel();}
});

test('one inverse prepares stock-dependent exponents only once',()=>{const W=fixture();inverse(W,16);assert(W.__exponentCalls>0&&W.__exponentCalls<=3,`unchanged exponent evaluated ${W.__exponentCalls} times`);});

test('ordinary positive softcap does not prove a tiny-log branch that cannot apply',()=>{
 const W=fixture(),A=W.Core.Amount,F=W.Core.AmountFormulas,B=W.Core.BigNum;let calls=0;
 W.Core.AmountFormulas={...F,logOnePlusRatio(...a){calls++;return F.logOnePlusRatio(...a)}};
 for(const value of [1,10,'1e200'])for(const e of [1e-7,.001,.5,.999999]){const expected=A.from(F.powerOnePlusMinusOne(A.from(value),B.BN(e)));assert.equal(JSON.stringify(A.serialize(W.__softcap(A.from(value),e))),JSON.stringify(A.serialize(expected)));}
 assert.equal(calls,0);
});
test('softcap branch guard preserves tiny inputs, exponents and exact tails',()=>{
 const W=fixture(),A=W.Core.Amount,F=W.Core.AmountFormulas,B=W.Core.BigNum;
 const reference=(value,exponent)=>{const gain=A.from(value),e=B.min(B.ONE,B.max(B.ZERO,exponent));if(A.compare(gain,0)===0||!B.gt(e,0))return A.from(0);if(B.gte(e,1))return gain;const log=B.mul(F.logOnePlusRatio(gain,1),e);return A.from(B.lt(log,'1e-8')?B.mul(log,Math.LN10):F.powerOnePlusMinusOne(gain,e));};
 const values=[0,'1e-30',A.fromParts(1,['-1e-120']),1,A.fromParts(1,['1e-120']),'1e100'];
 for(const gain of values)for(const e of [0,1e-9,9.999999999999999e-8,1e-7,1.0000000000000001e-7,.5,1])assert.equal(JSON.stringify(A.serialize(W.__softcap(gain,e))),JSON.stringify(A.serialize(reference(gain,e))));
});

const latestPlayerPath=require('./helpers/current-fixtures.cjs').fixturePath('live-training');
test('later real save training completes with exact full state and reload',()=>{
 const a=player(latestPlayerPath),b=player(latestPlayerPath),before=a.serial(),S=a.W.Core.State,R=a.W.Core.Runtime;
 b.W.Power.ScaleLogic.train(true);assert.equal(String(b.W.Core.Runtime.getState().power),'1533287349.2910054');
 const job=a.W.Power.ScaleLogic.createTrainingActionWork(a.s,true);try{finishTraining(job);assert.equal(a.serial(),before);job.commit();assert.deepEqual(JSON.parse(a.serial()),JSON.parse(b.serial()));assert.equal(String(R.getState().joules),'0');
 const round=a.W.Core.Save.prepare({...a.raw,data:S.toSerializable(R.getState())}).state;assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(round))),JSON.parse(a.serial()));
 }finally{job.cancel();}
});
