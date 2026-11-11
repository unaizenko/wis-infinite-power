"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {setupFuture}=require('./rank-schema-fixture.cjs');
function fixture(reference=false){return setupFuture({targetSchema:76,transformSource(file,s){if(file!=='js/power/scale-logic.js')return s;
 s=s.replace('function createQuantityInverseComparator(amount,prepared){','WIS.__comparator=createQuantityInverseComparator;WIS.__gain=infinitySoftcapGain;function createQuantityInverseComparator(amount,prepared){');
 s=s.replace('function infinitySoftcapInverse(actual, amount) {','WIS.__inverse=infinitySoftcapInverse;function infinitySoftcapInverse(actual, amount) {');
 if(reference)s=s.replace('const quick=compare(gain,actual);','const quick=null;').replace('const narrowed=yield* narrowQuantityInverseBounds(lo,hi,amount,prepared,below);','const narrowed=null;');
 const marker='function infinitySoftcapGain(gain,amount,kind="normal",special=false,prepared=null) {';assert(s.includes(marker));
 return s.replace(marker,'function infinitySoftcapGain(...args){const v=probe(...args);WIS.__full=(WIS.__full||0)+1;return v;} function probe(gain,amount,kind="normal",special=false,prepared=null) {');}}).W;}
function ready(W,s=W.Core.State.fresh()){W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(s);return s;}
test('local power bounds contain original rounded results and refuse unsupported inputs',()=>{
 const W=fixture();ready(W);const A=W.Core.Amount,F=W.Core.AmountFormulas;
 assert.equal(typeof F.createPowerOnePlusMinusOneCandidates,'function');
 for(const e of ['0.01','0.5','0.9906913574428657']){const bound=F.createPowerOnePlusMinusOneCandidates(W.Core.BigNum.BN(e));
  for(const x of ['10000000','10100000','10010000','10000000.000000002','9999999.999999998']){const choices=bound(A.from(x));assert(choices&&choices.length>0&&choices.length<=4);const exact=F.powerOnePlusMinusOne(A.from(x),W.Core.BigNum.BN(e));assert(choices.some(v=>W.Core.BigNum.eq(v,exact)),`${x} ^ ${e}`);}
  for(const x of ['1e100','1e-30',A.fromParts(100,['1e-90'])])assert.equal(bound(A.from(x)),null);
 }
});
const path=require('./helpers/current-fixtures.cjs').fixturePath('live-training');
test('real training preserves full domain while eliminating most full inverse probes',()=>{
 const raw=JSON.parse(fs.readFileSync(path,'utf8')),results=[];
 for(const reference of [true,false]){const W=fixture(reference),s=ready(W,W.Core.Save.prepare(raw).state),job=W.Power.ScaleLogic.createTrainingActionWork(s,true);let n=0;try{while(!job.advance(Infinity,{maximumOperations:256}).done)assert(++n<10000);job.commit();results.push({full:W.__full,state:JSON.parse(JSON.stringify(W.Core.State.toSerializable(W.Core.Runtime.getState())))});}finally{job.cancel();}}
 assert(results[0].full>=2000,'reference counter must execute');assert.deepEqual(results[1].state,results[0].state);assert(results[1].full<results[0].full/4,`full probes ${results[0].full} -> ${results[1].full}`);
});
module.exports={fixture,ready};

test('identity exponent keeps asymmetric weakening on the bounded path',()=>{const W=fixture();ready(W);const F=W.Core.AmountFormulas,A=W.Core.Amount;
 const bound=F.createPowerOnePlusMinusOneCandidates(W.Core.BigNum.BN(1));const values=bound(A.from('12345678.1234567'));assert(values);assert.equal(String(values[0]),String(F.powerOnePlusMinusOne(A.from('12345678.1234567'),1)));});

test('bounded candidates cover decimal and binary exponents over local moves and range edges',()=>{
 const W=fixture();ready(W);const A=W.Core.Amount,F=W.Core.AmountFormulas,B=W.Core.BigNum;let checked=0;
 let seed=1327;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const exponent of [1e-7,B.BN('1e-7'),.01,B.BN('.01'),.125,.5,.9999999999999999]){
  const bounds=F.createPowerOnePlusMinusOneCandidates(exponent);
  for(let j=0;j<45;j++){const base=10**(1+rand()*12);for(const ratio of [0,-.125,.125,-1e-9,1e-9]){const x=A.from(base*(1+ratio)),values=bounds(x);if(exponent===1e-7){assert.equal(values,null);continue;}assert(values,'supported interval must produce candidates');checked++;const expected=F.powerOnePlusMinusOne(x,exponent);assert(values.some(v=>B.eq(v,expected)),`${String(A.project(x))}, ${exponent}`);}}
 }
 // Number(1e-7) is strictly below decimal 1e-7; its 225 cases deliberately decline.
 assert.equal(checked,1350);
});
test('candidate preparation and continuation agree at one operation per slice',()=>{
 function run(maximumOperations){const W=fixture();ready(W);const C=W.Core.CertifiedRankMath,F=W.Core.AmountFormulas,A=W.Core.Amount,bounds=F.createPowerOnePlusMinusOneCandidates(.63),inputs=['1e7','1.001e7','9.99e6','3e10','2.999e10'];
  const job=C.createWork(()=>C.task('bounds-list',function*(){const rows=[];for(const input of inputs)rows.push((yield ()=>bounds(A.from(input)))?.map(String));return rows;}));
  try{let count=0;while(!job.advance({maximumOperations}).done)assert(++count<20000);return JSON.parse(JSON.stringify(job.result()));}finally{job.cancel();}}
 assert.deepEqual(run(1),run(65536));
});
test('candidate directions match the original rounded pipeline including target tails',()=>{
 let decided=0;
 for(const upgrades of [{'E3-2':true},{'B3-1':true},{'B3-2':true},{'E3-2':true,'B3-1':true}]){
  const W=fixture(),s=ready(W);s.meta.infinity.upgrades=upgrades;const A=W.Core.Amount,C=W.Core.CertifiedRankMath,scope=W.Core.Effects.createFrozenScope(s);
  try{C.withWork(()=>scope.run(()=>{const prepared=new Map(),cmp=W.__comparator(A.from('1e5'),prepared);
   for(const raw of [1,100,1e6,1e7,1.001e7,9.99e6,1e12]){const gain=A.from(raw),actual=W.__gain(gain,A.from('1e5'));
    for(const target of [actual,A.add(actual,'1e-30'),A.compare(actual,'1e-30')>0?A.subtract(actual,'1e-30'):actual,A.scale(actual,.99),A.scale(actual,1.01)]){const quick=cmp(gain,target);if(quick!==null){decided++;assert.equal(quick,A.compare(actual,target)<0,JSON.stringify({upgrades,raw,actual:A.serialize(actual),target:A.serialize(target)}));}}}
  }));}finally{scope.cancel();}
 }
 assert(decided>80,`only ${decided} certified directions`);
});
for(const [actual,stock] of [['1e6','1e5'],['1e7','1e8'],['1e6','1e80'],['1e-12','1e5']])test(`inverse matches original with asymmetric weakening ${actual}/${stock}`,()=>{
 for(const upgrades of [{'B3-1':true},{'B3-2':true},{'E3-2':true,'B3-1':true}]){const result=[];
  for(const reference of [true,false]){const W=fixture(reference),s=ready(W);s.meta.infinity.upgrades=upgrades;const A=W.Core.Amount,C=W.Core.CertifiedRankMath,scope=W.Core.Effects.createFrozenScope(s),job=C.createWork(()=>scope.run(()=>W.__inverse(A.from(actual),A.from(stock))));
   try{let n=0;while(!job.advance({maximumOperations:16}).done)assert(++n<20000);result.push(JSON.stringify(A.serialize(job.result())));}finally{job.cancel();scope.cancel();}}
  assert.equal(result[0],result[1],JSON.stringify(upgrades));
 }
});

test('three-deficiencies reward shares the optimized curve without changing exact credits',()=>{
 const results=[];for(const reference of [true,false]){const W=fixture(reference),s=ready(W);s.lastUpdateAt=1794358800000;s.randomState=1327;s.unlockedAchievements.threeDeficiencies=true;s.meta.infinity.upgrades={'E3-2':true};const A=W.Core.Amount,S=W.Core.State,Q=W.Core.Resources;
 Q.creditExact('core.power',A.from('99999.9'),s);for(const key of ['totalPower','lifetimeTotalPower','currentRebirthTotalPower'])S.setStatistic(s,key,A.fromParts('1e100',[37]));
 W.Core.Runtime.bind({state:()=>s,updateScaleProgress:W.Power.ScaleLogic.updateScaleProgress,applyResourceSoftcapProgressive:W.Power.ScaleLogic.applyResourceSoftcapProgressive});
 W.Cultivation.ImmortalLogic.grantThreeDeficienciesResetReward();assert(A.compare(Q.readExact('core.power',s),'99999.9')>0);results.push(JSON.parse(JSON.stringify(S.toSerializable(s))));}
 assert.deepEqual(results[0],results[1]);
});


test('optional inverse fast path rejects sparse coordinates before dense expansion',()=>{
 const W=fixture();ready(W);const A=W.Core.Amount,F=W.Core.AmountFormulas,bound=F.createPowerOnePlusMinusOneCandidates(.5);
 for(const value of ['8811411416139446e2063','1e2048','1e2049','1e-2049','1e100000','1e-100000','ee3000','eee20','100000000000001','0.9999999999999999',A.fromParts(1,['1e-120'])])assert.equal(bound(A.from(value)),null,String(value));
 for(const value of [1,'1e14']){const candidates=bound(A.from(value));if(candidates)assert(candidates.some(v=>W.Core.BigNum.eq(v,F.powerOnePlusMinusOne(A.from(value),.5))));}
 for(const e of ['1e-2049','1e2049','ee3000',0,-1,1.01])assert.equal(F.createPowerOnePlusMinusOneCandidates(W.Core.BigNum.BN(e))(A.from(10)),null,String(e));
});

test('new high player save formal training matches full fallback and saves all state',()=>{
 const raw=require('./helpers/current-fixtures.cjs').readFixture('high-training'),results=[];
 for(const reference of [true,false]){const W=fixture(reference),s=ready(W,W.Core.Save.prepare(raw).state),S=W.Core.State,A=W.Core.Amount,Q=W.Core.Resources,before=JSON.parse(JSON.stringify(S.toSerializable(s))),work=W.Power.ScaleLogic.createTrainingActionWork(s,true),started=performance.now();
  try{let slices=0;while(!work.advance(performance.now()+3).done){assert(++slices<20000);assert(performance.now()-started<30000);}
   assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(W.Core.Runtime.getState()))),before,'candidate changed live state');work.commit();
   const after=W.Core.Runtime.getState();assert.equal(A.compare(Q.readExact('core.joules',after),0),0);assert(A.compare(Q.readExact('core.power',after),Q.readExact('core.power',s))>0);assert.equal(String(after.power),'1.7261370619147398e1207');
   const actual=JSON.parse(JSON.stringify(S.toSerializable(after)));results.push(actual);assert.deepEqual(actual.meta.treasures,before.meta.treasures);assert.deepEqual(actual.meta.bigNumbers,before.meta.bigNumbers);assert.equal(actual.core.runtime.randomState,before.core.runtime.randomState);assert.equal(after.totalElapsedSeconds,s.totalElapsedSeconds);
   const loaded=W.Core.Save.prepare(JSON.parse(JSON.stringify(W.Core.Save.envelope(after)))).state;assert.deepEqual(JSON.parse(JSON.stringify(S.toSerializable(loaded))),actual,'roundtrip');
  }finally{work.cancel();}
 }
 assert.deepEqual(results[0],results[1],'optimized vs full fallback');
});
