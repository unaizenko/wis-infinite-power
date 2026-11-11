'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setupFuture}=require('./rank-schema-fixture.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
function setup(){return setupFuture({targetSchema:76}).W;}
function largeG(W,funding='.0008'){
 const B=W.Core.BigNum,rules={mode:'g-polynomial',pricing:'base',d6:false,treeDelta:'1e40',challenge:null,reward:false,award:1,costModel:'anchored-v3',rewardAboveOne:true};
 return {record:W.Core.ClosedFormBatch.create({n0:'1e20',funding,context:rules}),model:W.Meta.ClosedRankCost.model(B.BN('1e20'),rules)};
}
function nextCell(B,x){const bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,x.mag);bits.setBigUint64(0,bits.getBigUint64(0)+1n);return B.Decimal.fromComponents(x.sign,x.layer,bits.getFloat64(0)).floor();}
function paidMax(W,input,x){const C=W.Core.ClosedFormBatch,B=W.Core.BigNum;assert(x.count.gte('ee35'),'positive funding must settle the known affordable ee35 prefix');assert(x.spent.gt(0));assert(x.balance.gte(0));assert(C.compareFunds(input.record,input.model.cost(x.batches))>=0,'published batch must be paid');const next=nextCell(B,x.count).sub(input.record.n0).floor();assert(C.compareFunds(input.record,input.model.cost(next))<0,'next represented count must be unaffordable');}
function player(W){const B=W.Core.BigNum,S=W.Core.State,N=W.Meta.BigNumbers,I=W.Meta.Infinity,s=S.fresh();Object.assign(I.get(s),{points:B.BN(1e8),unlocked:true,upgradesUnlocked:true});for(const id of ['D1-1','D1-2','D2-1','D2-2','D3','D4'])assert(I.purchase(s,id));Object.assign(N.get(s),{unlocked:true,fractalLevel:5,purchases:Array(5).fill(true),gIndex:'100000000000000000000',beyondFractal:true});N.get(s).tree.rank='10000000000000000000000000000000000000000';W.Meta.Achievements.record(s,'googol');N.get(s).rankBasis=W.Core.RankBasis.create(N.get(s));s.core.runtime.randomState=0x12345678;const normalized=S.normalizeDomain(S.toSerializable(s));return W.Core.Save.prepare(plain(W.Core.Save.envelope(normalized,false,{offlineRecoveryOverride:null}))).state;}

test('layered G Newton cannot call a full-size correction convergence and publish zero paid progress',()=>{
 const W=setup(),C=W.Core.ClosedFormBatch,input=largeG(W),before=plain(input.record);
 // Independent coarse bound: for m=10^(10^35), cubic cumulative cost divided by 10^(10^40) is far below 0.0008.
 assert(input.model.cost(W.Core.BigNum.BN('ee35')).lt('.0008'));
 const x=C.solve(input.record,input.model);paidMax(W,input,x);assert.equal(x.diagnostics.fallback,true);assert(x.diagnostics.binary>0&&x.diagnostics.binary<=64);assert(x.diagnostics.costCalls<=80);assert.deepEqual(plain(input.record),before);
});

test('formal high TREE divisor G settlement publishes funded growth and preserves Save RNG resources and debt',()=>{
 const W=setup(),S=W.Core.State,N=W.Meta.BigNumbers,s=player(W),before=plain(S.toSerializable(s));N.advance(s,.1);
 assert(W.Core.Rank.compare(N.get(s).gIndex,'ee35')>0,'formal G entry must advance the funded count');
 assert(N.get(s).gBatch.funding.gt(0));assert(N.get(s).superProgress.gte(0));const after=plain(S.toSerializable(s));assert.deepEqual(after.core,before.core);assert.deepEqual(after.cultivation,before.cultivation);assert.deepEqual(after.powerSystem,before.powerSystem);
 const reloaded=W.Core.Save.prepare(plain(W.Core.Save.envelope(s,false,{offlineRecoveryOverride:null}))).state;assert.deepEqual(plain(S.toSerializable(reloaded)),after);
});

test('layered funded search resumes one operation at a time with equal paid result and terminal cancellation',()=>{
 const W=setup(),C=W.Core.ClosedFormBatch,M=W.Core.CertifiedRankMath,input=largeG(W),expected=C.solve(input.record,input.model),before=plain(input.record),job=M.createWork(()=>C.solve(input.record,input.model));let turns=0;
 try{while(!job.advance({maximumOperations:1}).done)assert(++turns<2000,'bounded fallback must finish');assert(turns>2);const actual=job.result();paidMax(W,input,actual);assert.deepEqual(plain(actual),plain(expected));assert.equal(job.advance({maximumOperations:1}).operations,0);assert.deepEqual(plain(input.record),before);}finally{job.cancel();}
 const cancelled=M.createWork(()=>C.solve(input.record,input.model));assert.equal(cancelled.advance({maximumOperations:1}).done,false);cancelled.cancel();assert.throws(()=>cancelled.advance(),{code:'rank-work-cancelled'});assert.deepEqual(plain(input.record),before);
});

for(const funding of ['0','999','1e100','ee20'])test('linear closed batches retain paid layer boundaries '+funding,()=>{
 const W=setup(),B=W.Core.BigNum,C=W.Core.ClosedFormBatch,record=C.create({funding}),model=C.geometric(B.ONE,B.ZERO),x=C.solve(record,model);assert(x.count.eq(funding));assert(C.compareFunds(record,x.spent)>=0);assert(x.balance.eq(0));assert(x.diagnostics.costCalls<=20);
});
test('zero funding cannot create layered G rewards and an unchanged huge anchor does not spend',()=>{
 const W=setup(),C=W.Core.ClosedFormBatch,B=W.Core.BigNum,input=largeG(W,0),x=C.solve(input.record,input.model);assert(x.count.eq('1e20'));assert(x.spent.eq(0));const r=C.create({n0:'ee20',funding:200}),y=C.solve(r,C.geometric(B.BN(200),B.BN(2).ln()));assert(y.count.eq('ee20'));assert(y.spent.eq(0));assert(y.balance.eq(200));
});
test('ordinary treasure price boundary and compensation remain paid and exact',()=>{
 const W=setup(),C=W.Core.ClosedFormBatch,B=W.Core.BigNum,model=C.geometric(B.BN(200),B.BN(2).ln());for(const [funding,count,balance]of [[199,0,199],[200,1,0],[1399,2,799],[1400,3,0]]){const r=C.create({funding}),x=C.solve(r,model);assert(x.count.eq(count));assert(x.balance.eq(balance));assert(C.compareFunds(r,x.spent)>=0);}
 let r=C.create({funding:'199.99999999999997'});for(let k=0;k<28;k++)r=C.credit(r,'1e-15').record;assert(C.solve(r,model).count.eq(0));r=C.credit(r,'1e-15').record;assert(C.solve(r,model).count.eq(1));
});

test('frozen G preparation resumes the layered fallback without mutating its source and remains saveable',()=>{
 const W=setup(),N=W.Meta.BigNumbers,S=W.Core.State,s=player(W),before=plain(S.toSerializable(s)),profile=N.captureFrozen(s),direct=N.prepareFrozen(s,.1,profile),job=N.prepareFrozenWork(s,.1,profile);let turns=0;
 try{while(!job.advance({maximumOperations:1}).done)assert(++turns<20000);const result=job.result();assert(W.Core.Rank.compare(result.gIndex,'ee35')>0);assert.deepEqual(plain(result),plain(direct));assert.deepEqual(plain(S.toSerializable(s)),before);s.meta.bigNumbers=result;const expected=plain(S.toSerializable(s)),loaded=W.Core.Save.prepare(plain(W.Core.Save.envelope(s,false,{offlineRecoveryOverride:null}))).state;assert.deepEqual(plain(S.toSerializable(loaded)),expected);}finally{job.cancel();}
});

test('layered G fallback honors an explicit paid cap below its root',()=>{
 const W=setup(),C=W.Core.ClosedFormBatch,input=largeG(W),x=C.solve(input.record,input.model,{limit:'ee35'});assert(x.count.eq('ee35'));assert(x.batches.lte('ee35'));assert(x.spent.gt(0));assert(C.compareFunds(input.record,x.spent)>=0);
});

test('closed compensation retains binary64 scientific text and its exact funding comparison',()=>{
 const W=setup(),B=W.Core.BigNum,C=W.Core.ClosedFormBatch;
 for(const value of [-3.5527136788005005e-15,3.5527136788005005e-15,-1.2345678901234567e-8,1.2345678901234567e-8,0]){
  const native=B.BN(value),raw=C.create({funding:1,acc:native});raw.acc=String(value);const loaded=C.read(raw);assert.equal(loaded.acc.layer,native.layer);assert.equal(loaded.acc.mag,native.mag,'binary64 compensation changed on read');assert(B.eq(loaded.acc,native));const twice=C.read({...loaded,acc:String(value)});assert(B.eq(twice.acc,native));
 }
 const value=3.5527136788005005e-15,original=C.create({funding:value,acc:-value}),wire={...original,acc:String(-value)},loaded=C.read(wire);assert.equal(C.compareFunds(original,0),0);assert.equal(C.compareFunds(loaded,0),0,'stored funding plus compensation must not become positive');
});
test('closed G compensation survives an actual complete Save roundtrip bit for bit',()=>{
 const W=setup(),S=W.Core.State,C=W.Core.ClosedFormBatch;
 for(const native of [-3.5527136788005005e-15,3.5527136788005005e-15,-1.2345678901234567e-8,1.2345678901234567e-8,0]){
  const s=S.fresh(),n=s.meta.bigNumbers;
  n.gBatch=C.create({n0:0,funding:Math.abs(native),acc:native,context:{...W.Meta.RankSettlement.rules(s,'base'),award:1,costModel:'anchored-v3',rewardAboveOne:true}});
  const before=plain(S.toSerializable(s)),wire=plain(W.Core.Save.envelope(s,false,{offlineRecoveryOverride:null})),loaded=W.Core.Save.prepare(wire).state,r=loaded.meta.bigNumbers.gBatch;
  assert.equal(r.acc.mag,Math.abs(native));assert.equal(r.funding.mag,Math.abs(native));assert.equal(C.compareFunds(r,0),C.compareFunds(n.gBatch,0),'signed funding expansion changed across Save');assert.deepEqual(plain(S.toSerializable(loaded)),before);
  const twice=W.Core.Save.prepare(plain(W.Core.Save.envelope(loaded,false,{offlineRecoveryOverride:null}))).state;assert.deepEqual(plain(S.toSerializable(twice)),before);
 }
});
test('closed numeric text validation stays strict and keeps layer transition parsing',()=>{
 const W=setup(),B=W.Core.BigNum,C=W.Core.ClosedFormBatch;
 for(const text of ['', ' ', '0x10', 'Infinity', '-Infinity', 'NaN', '--1', '1_000', '1e', null])assert.throws(()=>C.create({acc:text}),{code:'closed-form-batch'});
 for(const text of ['0','-0','0e9999','1.25','-1.25','1e3','-1e-10','1e-16','-1e-100','1e100','ee20','1e2e3']){const n=B.parseFinite(text),r=C.create({acc:text}),native=Number(text);assert(n);const expected=n.layer===0&&Number.isFinite(native)?B.BN(native):n;assert(B.eq(r.acc,expected),text);assert.equal(r.acc.layer,expected.layer,text);}
 assert.throws(()=>C.create({funding:'-1'}),{code:'closed-form-batch'});
});

test('credit keeps merged and unmerged layer-zero compensation lossless in JSON',()=>{
 const W=setup(),C=W.Core.ClosedFormBatch;let merged=0,unmerged=0;
 for(const funding of [1,16,32,1e12])for(const income of [1e-14,3.5527136788005005e-15,1e-6]){
  const x=C.credit(C.create({funding}),income),r=x.record,loaded=C.read(plain(r));x.merged?merged++:unmerged++;
  assert.equal(loaded.funding.mag,r.funding.mag);assert.equal(loaded.acc.mag,r.acc.mag);assert.equal(loaded.acc.sign,r.acc.sign);
  assert.equal(C.compareFunds(loaded,r.funding),C.compareFunds(r,r.funding));
 }
 assert(merged>0&&unmerged>0);
});
test('Worker transfer and simulation cloning retain closed funding compensation through Save',()=>{
 const {W,context}=setupFuture({targetSchema:76}),fs=require('node:fs'),vm=require('node:vm');vm.runInContext(fs.readFileSync(require.resolve('../js/simulation/worker-protocol.js'),'utf8'),context);
 const S=W.Core.State,C=W.Core.ClosedFormBatch,P=W.Simulation.WorkerProtocol;
 for(const native of [-3.5527136788005005e-15,3.5527136788005005e-15,0]){
  const s=S.fresh();s.meta.bigNumbers.gBatch=C.create({funding:Math.abs(native),acc:native,context:{...W.Meta.RankSettlement.rules(s,'base'),award:1,costModel:'anchored-v3',rewardAboveOne:true}});
  const nested={rows:[{batch:s.meta.bigNumbers.gBatch}]},restored=P.decode(P.encode(nested));assert.deepEqual(plain(restored),plain(nested));assert.equal(C.compareFunds(restored.rows[0].batch,0),C.compareFunds(nested.rows[0].batch,0));
  const expected=plain(S.toSerializable(s)),decoded=P.decode(P.encode(s)),snapshot=S.cloneForSimulation(decoded),loaded=W.Core.Save.prepare(plain(W.Core.Save.envelope(snapshot,false,{offlineRecoveryOverride:null}))).state;
  assert.equal(loaded.meta.bigNumbers.gBatch.acc.mag,Math.abs(native));assert.equal(loaded.meta.bigNumbers.gBatch.funding.mag,Math.abs(native));assert.equal(C.compareFunds(loaded.meta.bigNumbers.gBatch,0),C.compareFunds(s.meta.bigNumbers.gBatch,0));assert.deepEqual(plain(S.toSerializable(loaded)),expected);
 }
});