'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setupFuture}=require('./rank-schema-fixture.cjs');
function setup(reference=false){const {W}=setupFuture({targetSchema:76,transformSource(file,s){
 if(file==='js/core/rank-certified-math.js')s=s.replace('function logFraction(n,d){','function logFraction(n,d){W.__largestLogDigits=Math.max(W.__largestLogDigits||0,String(n).length,String(d).length);');
 if(reference&&file==='js/core/amount-formulas.js')s=s.replace('const sparse=yield* sparseOnePlusPower(input,c);','const sparse=null;');
 return s;}});const state=W.Core.State.fresh();W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);return W;}
test('large sparse powers preserve results without magnitude-sized logarithm operands',()=>{
 const W=setup(),F=W.Core.AmountFormulas;W.__largestLogDigits=0;
 for(const [input,e,want] of [['1e2000',.5,'1e1000'],['1e4000',.25,'1e1000'],['1e8000',.125,'1e1000']]){
  const actual=F.powerOnePlusMinusOne(input,e);assert.equal(String(actual),want);
 }
 assert((W.__largestLogDigits||0)<=80,'logarithm expanded a sparse exponent into '+W.__largestLogDigits+' digits');
});
test('sparse high-power path matches original full formula across signs of the final logarithm and boundaries',()=>{
 const rows=[['8811411416139446e2063','.63'],['1e100','0.5'],['9.999999999999998e80','.9999999999999999'],['1e34','0.9999999999999999'],['1e35','.5'],['1e2000','.001'],['1e-100','.5'],['1.0000000000000002','.5']];
 const values=[];
 for(const reference of [true,false]){const W=setup(reference),F=W.Core.AmountFormulas;values.push(rows.map(([x,p])=>{const n=F.powerOnePlusMinusOne(x,W.Core.BigNum.BN(p));return {sign:n.sign,layer:n.layer,mag:n.mag};}));}
 assert.deepEqual(values[1],values[0]);
});
test('sparse power is resumable at one operation and retains remote signed tails',()=>{
 function run(maximumOperations){const W=setup(),A=W.Core.Amount,F=W.Core.AmountFormulas,C=W.Core.CertifiedRankMath,values=['1e2000',A.fromParts('1e2000',['1e-100']),A.fromParts('1e2000',['-1e-100'])],job=C.createWork(()=>C.task('three-sparse-powers',function*(){const result=[];for(const v of values)result.push(String(yield ()=>F.powerOnePlusMinusOne(v,.5)));return result;}));
  try{let slices=0;while(!job.advance({maximumOperations}).done)assert(++slices<10000);return JSON.parse(JSON.stringify(job.result()));}finally{job.cancel();}}
 assert.deepEqual(run(1),run(65536));
});

test('inverse comparison of a large rational does not construct its dense difference for separated bounds',()=>{
 const {W}=setupFuture({targetSchema:76,transformSource(f,s){return f==='js/core/signed-ledger.js'?s.replace('function exactWord(text) {','function exactWord(text) {if(window.WIS.__measureDense&&String(text).length>500)window.WIS.__dense=(window.WIS.__dense||0)+1;'):s;}});
 const state=W.Core.State.fresh();W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);
 const A=W.Core.Amount,target=A.divide(A.subtract('1e2000','1e1000'),3),rows=[['3.2e1999',-1],['3.333333333333332e1999',-1],['3.333333333333334e1999',1],['3.4e1999',1]].map(([s,sign])=>[A.from(s),sign]);
 W.__measureDense=true;W.__dense=0;
 for(const [value,sign]of rows){assert.equal(A.compare(value,target),sign);assert.equal(A.compare(target,value),-sign);}
 assert.equal(W.__dense,0,'separated comparison expanded a huge exact difference');
});
test('rational comparison keeps exact equalities and remote signed remainders',()=>{
 const W=setup(),A=W.Core.Amount,third=A.divide('1e2000',3);
 assert.equal(A.compare(third,A.divide('2e2000',6)),0);
 for(const sign of [1,-1]){const shifted=sign>0?A.add(third,'1e-100'):A.subtract(third,'1e-100');assert.equal(A.compare(shifted,third),sign);assert.equal(A.compare(third,shifted),-sign);}
});

test('high-coordinate comparison candidates enclose full rounded formula without expanding the coordinate',()=>{
 const W=setup(),F=W.Core.AmountFormulas,A=W.Core.Amount,B=W.Core.BigNum;
 assert.equal(typeof F.createPowerOnePlusMinusOneLogCandidates,'function');
 for(const exponent of [.1,.5,B.BN('.9999999999999999')]){
  const candidates=F.createPowerOnePlusMinusOneLogCandidates(exponent);
  for(const input of ['1e1000','1.001e1000','9.99e1001','2.512345678901234e4000','2.512345678901235e4000','2.512345679e4000']){
   const value=A.from(B.BN(input)),values=candidates(value);assert(values&&values.length<=4,input);const exact=F.powerOnePlusMinusOne(value,exponent);assert(values.some(v=>B.eq(v,exact)),input+' '+String(exponent));
  }
  for(const input of ['1','1e-2000','ee3000','1e10000000000000000',A.fromParts('1e1000',['1e-100'])])assert.equal(candidates(A.from(input)),null);
 }
});
test('rational interval comparison agrees with independent integer cross products',()=>{
 const W=setup(),A=W.Core.Amount;let seed=20261111;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)%100000+1);
 for(let i=0;i<160;i++){const n=BigInt(rand()),d=BigInt(rand()),m=BigInt(rand()),k=BigInt(rand()),e=BigInt(rand()%9),f=BigInt(rand()%9);
  const left=A.divide(n+'e'+(2000n+e),String(d)),right=A.divide(m+'e'+(2000n+f),String(k)),diff=n*10n**e*k-m*10n**f*d;
  assert.equal(A.compare(left,right),diff>0n?1:diff<0n?-1:0);
 }
});

test('high inverse probes operate on complete sparse words without constructing display tails',()=>{
 const {W}=setupFuture({targetSchema:76,transformSource(f,s){return f==='js/core/amount.js'?s.replace('const projection=()=>WIS.Core.CertifiedRankMath.withWork(()=>{','const projection=()=>WIS.Core.CertifiedRankMath.withWork(()=>{if(WIS.__countProjection)WIS.__projections++;'):s;}});
 const state=W.Core.State.fresh();W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);
 const A=W.Core.Amount,F=W.Core.AmountFormulas,value=A.from('1.001e1000'),bounds=F.createPowerOnePlusMinusOneLogCandidates(.5);
 W.__projections=0;W.__countProjection=true;const candidates=bounds(value);W.__countProjection=false;
 assert.equal(W.__projections,0,'comparison eagerly constructed main/tail display parts');assert(candidates);
 assert(candidates.some(v=>W.Core.BigNum.eq(v,F.powerOnePlusMinusOne(value,.5))));
});


test('single sparse decimal comparison never expands the gap between exponents',()=>{
 const {W}=setupFuture({targetSchema:76,transformSource(file,source){return file==='js/core/signed-ledger.js'?source.replace('function exactWord(text) {','function exactWord(text) { if(String(text).length>500)window.WIS.__dense=(window.WIS.__dense||0)+1;'):source;}});
 const A=W.Core.Amount;const state=W.Core.State.fresh();W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});W.Core.Runtime.setState(state);
 const hi=A.from('1e2000'),lo=A.from('1e1000');W.__dense=0;assert.equal(A.compare(hi,lo),1);assert.equal(A.compare(lo,hi),-1);assert.equal(W.__dense,0);
 for(const [a,b,expected] of [['123e1000','1230e999',0],['10000000000000001e1000','1e1016',1],['9999999999999999e1000','1e1016',-1],['1e-2000','1e-1000',-1]])assert.equal(A.compare(a,b),expected);
});
