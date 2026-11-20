 'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{setupAmount}=require('./amount-fixture.cjs');
function setup(){const {W}=setupAmount({model:75}),host=W.Simulation.OfflineHeadless.create({domain:W.Core.State.fresh()},{checkpoint(){},yield:()=>Promise.resolve()}),s=host.getState();s.cultivation.active='martial';return {W,A:W.Core.Amount,Q:W.Core.Resources,M:W.Cultivation.Martial,s};}
test('martial whole-core conversion prices and clears both quantity parts',()=>{const {W,A,Q,M,s}=setup();Q.replaceExact('core.joules',A.fromParts('1e100',[37]),s);const preview=M.preview(s,'qi');assert(preview.costQuantities);assert.equal(A.compare(preview.costQuantities.joules,A.fromParts('1e100',[37])),0);assert(M.convert(s,'qi'));assert.equal(A.compare(Q.readExact('core.joules',s),0),0);assert.equal(A.compare(Q.readExact('cultivation.martial.qi',s),preview.gainQuantity),0);});
test('martial conversion preserves a positive increment below the existing stock ULP',()=>{const {W,A,Q,M,s}=setup();Q.replaceExact('cultivation.martial.qi',A.fromParts('1e100',[37]),s);Q.replaceExact('core.joules',1,s);const prior=Q.readExact('cultivation.martial.qi',s),preview=M.preview(s,'qi');assert(preview.allowed);assert(A.compare(preview.gainQuantity,0)>0);assert(M.convert(s,'qi'));assert.equal(A.compare(A.subtract(Q.readExact('cultivation.martial.qi',s),prior),preview.gainQuantity),0);assert.equal(A.compare(Q.readExact('core.joules',s),0),0);});
test('martial prerequisites and payment use complete deficient quantities',()=>{const {W,A,Q,M,s}=setup();Q.replaceExact('cultivation.martial.body',A.fromParts(3,['-1e-120']),s);Q.replaceExact('cultivation.martial.soul',1,s);const before=JSON.stringify(W.Core.State.toSerializable(s));assert.equal(M.canBuy(s,'mingJin'),false);assert.equal(M.buy(s,'mingJin'),false);assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);});
test('heart spending passes the full actual payment into the natural reward integral',()=>{const {W,A,Q,M,s}=setup();M.get(s).abilities.tianMo=1;Q.replaceExact('cultivation.martial.heart',A.fromParts('1e100',[37]),s);const helper=W.Cultivation.MartialAmount;assert(helper);const natural=helper.naturalGain,seen=[];W.Cultivation.MartialAmount={...helper,naturalGain(profile,...args){seen.push(profile.base);return natural(profile,...args);}};assert(Q.debitExact('cultivation.martial.heart',A.fromParts('1e100',[37]),s));assert(seen.some(v=>A.compare(v,A.fromParts('1e101',[370]))===0));assert(A.compare(Q.readExact('cultivation.martial.qi',s),0)>0);});
test('martial internal additive balances normalize without losing their tails',()=>{const {W,A,M,s}=setup(),n=M.get(s);for(const key of ['longxiangProgress','automationTime','heartPotential','heartInvestment'])Object.assign(n,A.fieldParts(A.fromParts(key==='automationTime'?.01:'1e100',['1e-120']),key));const copy=M.normalize(n);for(const key of ['longxiangProgress','automationTime','heartPotential','heartInvestment'])assert.equal(A.compare(A.field(copy,key),A.field(n,key)),0,key);});


test('martial progress cannot borrow a rounded-up threshold or cadence',()=>{const {W,A,M,s}=setup(),n=M.get(s);n.abilities.longXiang=1;Object.assign(n,A.fieldParts(A.fromParts(60,['-1e-120']),'longxiangProgress'));M.advance(s,'1e-130');assert.equal(M.get(s).abilities.longXiang,1);Object.assign(M.get(s),A.fieldParts(A.fromParts(.1,['-1e-120']),'automationTime'));const before=JSON.stringify(W.Core.State.toSerializable(s));assert.equal(M.automate(s),false);assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);});
test('frozen martial progress restores the complete original automation opportunity',()=>{const {W,A,M,s}=setup();Object.assign(M.get(s),A.fieldParts(A.fromParts(.01,['1e-120']),'automationTime'));s.powerSystem.active=null;const before=A.field(M.get(s),'automationTime'),unit=W.Simulation.FixedSegment.prepare(s,.1,{frozenOffline:true});W.Simulation.FixedSegment.commit(s,unit);assert.equal(A.compare(A.field(M.get(s),'automationTime'),before),0);});
test('martial quantity roots retain proof work across tiny operation slices',()=>{const {W,A,Q,M,s}=setup();Q.replaceExact('core.joules',A.fromParts('1e100',[37]),s);const before=JSON.stringify(W.Core.State.toSerializable(s)),expected=M.preview(s,'qi'),work=W.Core.CertifiedRankMath.createWork(()=>M.preview(s,'qi'));let slices=0;while(!work.advance({maximumOperations:1}).done)assert(++slices<100000);assert(slices>1);assert.equal(A.compare(work.result().gainQuantity,expected.gainQuantity),0);assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);});


test('martial cooperative preparation evaluates unchanged input multipliers once',()=>{const {W,A,Q,M,s}=setup();Q.replaceExact('core.joules',A.fromParts('1e100',[37]),s);let calls=0;W.Cultivation.Martial={...M,efficiency(...args){calls++;return M.efficiency(...args);}};const work=W.Core.CertifiedRankMath.createWork(()=>M.preview(s,'qi'));let slices=0;while(!work.advance({maximumOperations:128}).done)assert(++slices<10000);assert(slices>1);assert.equal(calls,1,'unchanged multipliers recomputed '+calls+' times');});


test('inactive martial previews do not traverse unrelated economic state',()=>{const {W,A,s,M}=setup();s.cultivation.active='immortal';const S=W.Core.State;W.Core.State={...S,toSerializable(){throw Error('unrelated economy traversal');}};const preview=M.preview(s,'qi');assert.equal(preview.allowed,false);assert.equal(A.compare(preview.gainQuantity,0),0);assert.equal(Object.keys(preview.costs).length,0);});

test('martial conversion finds an affordable gain on a coarse exponent grid',()=>{
  const cases=[
    {
      joules:'ee16.008439846800563',qi:'1e6470102952599032',
      qiTail:['5e4666176583237603','158113883008418975e2592320324020874','1849999999999998625e-14'],
      heart:'5.623413251903491e2073856259216712',
      heartTail:['53348382301167684e1587350095122315','4000564296489972e849047725297976','773500e-2'],
      efficiency:'17312.58762876525',exponent:'1.1499999999999992',gain:'3.1622776601683795e2894496312637935',
    },
    {
      joules:'ee16.296130279084586',qi:'ee16.098601623537082',qiTail:[1000],
      heart:0,heartTail:[],efficiency:'21031.733162072247',exponent:'1',gain:'3.1622776601683795e-2184743190683554',
    },
  ];
  for(const row of cases){
    const {W,A,Q,M,s}=setup(),B=W.Core.BigNum;
    W.Cultivation.Martial={...M,efficiency:()=>B.BN(row.efficiency),conversionExponent:()=>B.BN(row.exponent)};
    Q.replaceExact('core.joules',A.divide(A.from(row.joules),10),s);
    Q.replaceExact('cultivation.martial.qi',A.fromParts(row.qi,row.qiTail),s);
    Q.replaceExact('cultivation.martial.heart',A.fromParts(row.heart,row.heartTail),s);
    const before=JSON.stringify(W.Core.State.toSerializable(s)),prior=Q.readExact('cultivation.martial.qi',s);
    const quote=M.preview(s,'qi');
    assert(quote.allowed);
    assert.equal(String(quote.gain),row.gain);
    assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);
    assert(M.convert(s,'qi'));
    assert.equal(A.compare(Q.readExact('core.joules',s),0),0);
    assert.equal(A.compare(Q.readExact('cultivation.martial.qi',s),A.add(prior,quote.gainQuantity)),0);
  }
});
