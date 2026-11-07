'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{setup75}=require('./amount-fixture.cjs'),audit=require('./draft-proxy-audit.cjs');
function setup(){const f=setup75({transformSource:audit.transformSource});audit.bind(f.context);return f.W;}
const wire=(W,s)=>JSON.stringify(W.Core.State.toSerializable(s));
test('nested unchanged roots and spread replacements materialize all owners, including unread children',()=>{
 const W=setup(),S=W.Core.State,s=S.fresh(),before=wire(W,s),outer=S.createDraft(s),inner=S.createDraft(outer.state);
 inner.state.meta.probe={nested:{history:outer.state.cultivation.systems.immortal.xiuzhen.history}};
 const result=inner.finish();audit.assertNoDraftProxies(result);assert.equal(wire(W,s),before);
 outer.state.meta.probe=result.meta.probe;const out=outer.finish();audit.assertNoDraftProxies(out);
});
test('three draft levels isolate writes, materialize unchanged siblings and survive replay reset',()=>{
 const W=setup(),S=W.Core.State,s=S.fresh(),before=wire(W,s),a=S.createDraft(s,{replayable:true}),b=S.createDraft(a.state),c=S.createDraft(b.state);
 c.state.cultivation.systems.immortal.xiuzhen.shengProgress.test={value:3};
 b.state.cultivation.systems.immortal.xiuzhen=c.finishValue(c.state.cultivation.systems.immortal.xiuzhen);
 a.state.cultivation.systems.immortal.xiuzhen=b.finishValue(b.state.cultivation.systems.immortal.xiuzhen);
 const out=a.finish();audit.assertNoDraftProxies(out);assert.equal(out.cultivation.systems.immortal.xiuzhen.shengProgress.test.value,3);a.reset();assert.equal(wire(W,s),before);assert.equal(wire(W,a.state),before);audit.assertNoDraftProxies(out);
});
test('Xiuzhen nested Sheng transaction and preparation do not publish foreign proxies',()=>{
 const W=setup(),S=W.Core.State,s=S.fresh(),a=S.createDraft(s),X=W.Cultivation.Xiuzhen;
 X.awardSheng(a.state,.1,{rate:W.Core.BigNum.BN(1),keys:['tianNiPearl']});
 a.state.cultivation.systems.immortal.xiuzhen=X.prepare(a.state,{xianForce:W.Core.BigNum.BN(2)});
 const out=a.finish();audit.assertNoDraftProxies(out);assert.equal(String(X.get(out).resources.xianForce.amount),'2');
});
test('nested Sheng exception restores resources, treasures, progress and history atomically',()=>{
 const W=setup(),S=W.Core.State,s=S.fresh(),a=S.createDraft(s),before=wire(W,a.state);
 assert.throws(()=>W.Cultivation.Xiuzhen.awardSheng(a.state,2,{rate:W.Core.BigNum.BN(1),keys:['tianNiPearl','invalid']}),/Unknown Sheng/);
 const out=a.finish();audit.assertNoDraftProxies(out);assert.equal(wire(W,out),before);
});

test('automatic realm purchase interleaves with Sheng and failed nested rewards without losing the purchase',()=>{
 const W=setup(),S=W.Core.State,X=W.Cultivation.Xiuzhen,s=S.fresh();s.cultivation.active='immortal';s.challengeCompletions.mortalTransformation=1;s.mana=W.Core.BigNum.BN('1e60');
 const a=S.createDraft(s);assert(X.breakthrough(a.state,false));X.awardSheng(a.state,.1,{rate:W.Core.BigNum.BN(1),keys:['tianNiPearl']});
 const checkpoint=wire(W,a.state);assert.throws(()=>X.awardSheng(a.state,2,{rate:W.Core.BigNum.BN(1),keys:['tianNiPearl','invalid']}),/Unknown Sheng/);
 assert.equal(wire(W,a.state),checkpoint);const out=a.finish();assert.equal(X.get(out).realm,1);assert.equal(X.get(s).realm,0);audit.assertNoDraftProxies(out);
});

test('unchanged spread-built draft roots cannot retain foreign proxies in unread fields',()=>{
 const W=setup(),S=W.Core.State,s=S.fresh(),a=S.createDraft(s);
 const base={...a.state,cultivation:{...a.state.cultivation}};
 const b=S.createDraft(base);audit.assertNoDraftProxies(b.finish());assert.equal(wire(W,b.finish()),wire(W,s));
});

test('installing a finished nested draft re-wraps unchanged roots before subsequent writes or rollback',()=>{
 const W=setup(),S=W.Core.State,s=S.fresh(),before=wire(W,s),a=S.createDraft(s),b=S.createDraft(a.state);
 b.state.joules=W.Core.BigNum.BN(9);Object.assign(a.state,b.finish());
 a.state.cultivation.systems.immortal.xiuzhen.history.realm=7;
 assert.equal(wire(W,s),before);const out=a.finish();audit.assertNoDraftProxies(out);assert.equal(out.cultivation.systems.immortal.xiuzhen.history.realm,7);
});
