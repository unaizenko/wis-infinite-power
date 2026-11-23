'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {W}=require('./amount-fixture.cjs').setup75();
const {State:S, Resources:Q, Amount:A, BigNum:B}=W.Core;
const M=W.Cultivation.Martial;
const key='martialGrandHarmony';
const put=(s,k,v)=>Q.replaceExact('cultivation.martial.'+k,A.from(v),s);
function ready(){
  const s=S.fresh();
  s.cultivation.active='martial';
  for(const [k,v] of Object.entries({qi:10000,body:10000,heart:1000,soul:99}))put(s,k,v);
  return s;
}
test('simultaneous current quantities qualify, including signed tails and old saves',()=>{
  const s=ready();
  put(s,'qi',A.fromParts(10000,['-1e-30']));
  put(s,'soul',100);
  assert(!s.unlockedAchievements[key]);
  const old=S.toSerializable(s);
  assert(!S.normalizeDomain(old).unlockedAchievements[key]);
  M.awardPassive(s,{qi:A.from('1e-30')});
  assert(s.unlockedAchievements[key]);
  const qualified=S.toSerializable(s);
  delete qualified.meta.achievements[key];
  assert(S.normalizeDomain(qualified).unlockedAchievements[key]);
  const reset=W.Core.Reset.apply('challenge',s,()=>S.fresh());
  assert(reset.unlockedAchievements[key]);
  assert.equal(A.compare(M.quantity(reset,'qi'),0),0);
});
test('all four conversions retain their inputs and heart uses the entire smaller stock',()=>{
  const s=ready();
  s.unlockedAchievements.martialHarmony=s.unlockedAchievements.martialSoul=true;
  M.get(s).abilities.tianMo=M.get(s).abilities.ciHang=1;
  put(s,'soul',100);
  Q.replaceExact('core.joules',A.fromParts(10000,['1e-30']),s);
  Q.replaceExact('core.power',A.fromParts(1000,['1e-30']),s);
  const initialJ=Q.readExact('core.joules',s), initialPower=Q.readExact('core.power',s);
  for(const k of M.resourceKeys){
    const before=Object.fromEntries(M.resourceKeys.map(r=>[r,M.quantity(s,r)]));
    const p=M.preview(s,k);
    assert(p.allowed,k);
    assert.equal(Object.keys(p.costs).length,0,k);
    if(k==='heart'){
      const least=A.compare(before.qi,before.body)<0?before.qi:before.body;
      assert.equal(A.compare(p.investmentQuantity,A.multiply(A.divide(least,5),p.efficiency)),0);
    }
    const willBefore=JSON.stringify(W.Meta.TreasureLedger.progress(s,'willImprint'));
    assert(M.convert(s,k));
    for(const r of M.resourceKeys)assert.equal(A.compare(M.quantity(s,r),r===k?A.add(before[r],p.gainQuantity):before[r]),0,k+' / '+r);
    if(k==='soul')assert.equal(JSON.stringify(W.Meta.TreasureLedger.progress(s,'willImprint')),willBefore);
    assert.equal(A.compare(Q.readExact('core.joules',s),initialJ),0);
    assert.equal(A.compare(Q.readExact('core.power',s),initialPower),0);
  }
  assert(B.eq(M.get(s).resources.heart.spent,0));
  const soul=M.quantity(s,'soul');
  assert(M.buy(s,'ganDong'));
  assert.equal(A.compare(M.quantity(s,'soul'),A.subtract(soul,2)),0);
});
test('automatic free conversions still need positive inputs and a cadence opportunity',()=>{
  const s=ready();put(s,'soul',100);
  s.unlockedAchievements.martialHarmony=true;
  assert(M.setAutomation(s,'soul',true));
  const before=M.quantity(s,'heart');
  assert(!M.automate(s));
  M.advance(s,.1);
  assert(M.automate(s));
  assert.equal(A.compare(M.quantity(s,'heart'),before),0);
  put(s,'body',0);
  assert(!M.preview(s,'soul').allowed);
  M.advance(s,.1);
  assert(!M.automate(s));
});
