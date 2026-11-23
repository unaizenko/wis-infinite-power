'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),{setup}=require('./d7-automation.test.cjs');
const W=setup(),B=W.Core.BigNum,S=W.Core.State,I=W.Meta.Infinity,X=W.Cultivation.Xiuzhen,H=W.Meta.HighMultiverse;
function ready(){const s=S.fresh();s.cultivation.active='immortal';Object.assign(X.get(s),{entered:true,realm:12,highestRealm:12});Object.assign(I.get(s),{points:B.BN(100000),unlocked:true,upgradesUnlocked:true});for(const id of ['C1','C2','C3','C4','C5'])assert(I.purchase(s,id));return s;}
const serial=s=>JSON.stringify(S.toSerializable(s)),eq=(a,b)=>assert(B.eq(a,b),a+' != '+b);
test('C6 costs 1500, requires C5, persists and is refundable once',()=>{assert(W.Meta.InfinityConfig.nodes.C6);const s=ready();assert.equal(I.status(s,'C6'),'available');const before=I.get(s).points;assert(I.purchase(s,'C6'));eq(I.get(s).points,B.sub(before,1500));assert(!I.purchase(s,'C6'));assert(I.has(W.Core.Save.prepare(W.Core.Save.envelope(s)).state,'C6'));const blank=S.fresh();Object.assign(I.get(blank),{upgradesUnlocked:true,points:B.BN(1e6)});assert(!I.purchase(blank,'C6'));});
test('first and later promotions preserve N/N2, gate coefficient and pay escalating integers',()=>{assert(H);const s=ready();assert(I.purchase(s,'C6'));X.get(s).resources.universeCoefficient.amount=B.BN(123);X.get(s).resources.multiverseCoefficient.amount=B.BN(1000);const before=serial(s),v=H.preview(s);assert(v.allowed);eq(v.cost,500);assert.equal(v.nextOrder,'3');assert.equal(serial(s),before);assert(H.promote(s));assert.equal(H.get(s).order,'3');assert(B.abs(B.sub(H.amount(s),10)).lt(1e-12));eq(X.amount(s,'universeCoefficient'),123);eq(X.amount(s,'multiverseCoefficient'),1000);eq(H.preview(s).cost,550);assert(H.preview(s).allowed,'exact cube root 1000 must still meet coefficient 10');H.get(s).amount=B.BN(10000);assert(H.promote(s));assert.equal(H.get(s).order,'4');assert(B.abs(B.sub(H.amount(s),10)).lt(1e-12));eq(H.preview(s).cost,605);const paid=I.get(s).points;H.get(s).amount=B.BN(9.99);const locked=serial(s);assert(!H.promote(s));assert.equal(serial(s),locked);eq(I.get(s).points,paid);});
test('missing C6, no points or sealed system cannot mutate anything',()=>{assert(H);const s=ready();X.get(s).resources.multiverseCoefficient.amount=B.BN(10);let before=serial(s);assert(!H.promote(s));assert.equal(serial(s),before);I.purchase(s,'C6');I.get(s).points=B.BN(499);before=serial(s);assert(!H.promote(s));assert.equal(serial(s),before);I.get(s).points=B.BN(500);assert(H.promote(s));assert(!H.preview(s).allowed);});
test('growth is weakened per second before elapsed time, keeps old stock and N/N2',()=>{assert(H);eq(H.weaken(0,'3'),0);assert(Math.abs(B.toNumber(H.weaken(7,'3'))-3)<1e-12);assert(Math.abs(B.toNumber(H.weaken(15,'4'))-3)<1e-12);assert(B.gt(H.weaken('1e-100','1000000'),0));assert(B.isFiniteBN(H.weaken('ee100','9007199254740993')));const s=ready();I.purchase(s,'C6');X.get(s).resources.multiverseCoefficient.amount=B.BN(1000);H.promote(s);const amount=H.amount(s);H.credit(s,B.mul(H.weaken(7,'3'),2));assert(B.abs(B.sub(H.amount(s),B.add(amount,6))).lt(1e-12));eq(X.amount(s,'multiverseCoefficient'),1000);eq(H.rate(s),0);});
test('old saves default locked, reload preserves order/stock, invalid values rejected',()=>{assert(H);const s=ready();I.purchase(s,'C6');X.get(s).resources.multiverseCoefficient.amount=B.BN('ee20');H.promote(s);const copy=W.Core.Save.prepare(W.Core.Save.envelope(s)).state;assert.equal(H.get(copy).order,'3');eq(H.amount(copy),H.amount(s));const raw=S.toSerializable(s);delete raw.meta.highMultiverse;assert.equal(H.get(S.normalizeDomain(raw)).order,'0');for(const order of ['2','3.5','-3','03'])assert.throws(()=>H.normalize({version:1,order,owner:'immortal',amount:0}));assert.throws(()=>H.normalize({version:1,order:'3',owner:'immortal',amount:-1}));});
test('order increments beyond Number safe integers without an artificial cap',()=>{assert(H);const s=ready();I.purchase(s,'C6');s.meta.highMultiverse=H.normalize({version:1,order:'9007199254740993',owner:'immortal',amount:'ee100'});I.get(s).points=B.BN('ee100');const v=H.preview(s);assert.equal(v.nextOrder,'9007199254740994');assert(v.allowed);assert(H.promote(s));assert.equal(H.get(s).order,v.nextOrder);});
test('top resource selects unlocked visible order, including zero balances',()=>{assert(H);const s=S.fresh();assert.equal(H.highestVisible(s),null);s.cultivation.active='immortal';Object.assign(X.get(s),{entered:true,realm:7,highestRealm:7});assert.equal(H.highestVisible(s),'universeCoefficient');X.get(s).realm=11;assert.equal(H.highestVisible(s),'multiverseCoefficient');X.get(s).realm=12;s.meta.highMultiverse=H.normalize({version:1,order:'3',owner:'immortal',amount:0});assert.equal(H.highestVisible(s),'highMultiverseCoefficient');s.cultivation.active='martial';assert.equal(H.highestVisible(s),null);});
test('reset clears current inventory while paid order and C6 remain',()=>{assert(H);const s=ready();I.purchase(s,'C6');X.get(s).resources.multiverseCoefficient.amount=B.BN(1000);H.promote(s);assert.equal(H.get(W.Core.Reset.apply('scatter',s,S.fresh)).order,'3');for(const kind of ['reincarnation','challenge','infinity']){const n=W.Core.Reset.apply(kind,s,S.fresh);assert.equal(H.get(n).order,'3');eq(H.amount(n),0);assert(I.has(n,'C6'));}const n=I.prepareRebirth(s,{challengeKey:'infinityRing'});assert.equal(H.get(n).order,'3');});

test('registered resource supports signed payments without lowering lifetime counters',()=>{const s=ready();I.purchase(s,'C6');X.get(s).resources.multiverseCoefficient.amount=B.BN('1e6');H.promote(s);const id='meta.multiverse.'+H.key,R=W.Core.Resources,total=H.get(s).total,peak=H.get(s).peak;assert(R.canAfford(id,10,s));assert(R.spend(id,10,s));eq(H.amount(s),90);eq(H.get(s).total,total);eq(H.get(s).peak,peak);const before=serial(s);assert(!R.spend(id,91,s));assert(!R.spend(id,-1,s));assert.equal(serial(s),before);assert(R.spendTerms(id,[5,5],s));eq(H.amount(s),80);});
test('sealed promotion rejected and refunds exclude consumed promotion points',()=>{const s=ready();I.purchase(s,'C6');X.get(s).resources.multiverseCoefficient.amount=B.BN(1000);s.activeChallenge='mortalTransformation';const before=serial(s);assert(!H.promote(s));assert.equal(serial(s),before);s.activeChallenge=null;assert(H.promote(s));const points=I.get(s).points,refund=I.invested(s),n=I.prepareRebirth(s,{respec:true});eq(I.get(n).points,B.add(points,refund));assert(!I.has(n,'C6'));assert.equal(H.get(n).order,'3');});
test('promotion quotes and charges the integer ceiling through the exact Amount range',()=>{
  const A=W.Core.Amount, Save=W.Core.Save;
  const reload=s=>Save.prepare(JSON.parse(JSON.stringify(Save.envelope(s,false)))).state;
  // Test oracle uses division and remainder independently of the game's ceiling.
  const ceiling=exponent=>{
    const n=500n*11n**BigInt(exponent),d=10n**BigInt(exponent);
    return n/d+(n%d===0n?0n:1n);
  };
  for(let exponent=0;exponent<=320;exponent++){
    const order=exponent===0?'0':String(exponent+2);
    assert.equal(String(H.price(order)),String(ceiling(exponent)),order);
  }
  for(const order of [260,272,322,323,1000,10000,197749]){
    const cost=ceiling(order-2),s=ready();assert(I.purchase(s,'C6'));
    s.meta.highMultiverse=H.normalize({version:1,owner:'immortal',order:String(order),amount:10});
    for(const difference of [-1n,0n,1n]){
      Object.assign(I.get(s),A.fieldParts(A.from(String(cost+difference)),'points'));
      const loaded=reload(s),before=serial(loaded),quote=H.preview(loaded);
      assert.equal(A.compare(quote.costQuantity,String(cost)),0);
      if(cost<=BigInt(Number.MAX_SAFE_INTEGER))assert.equal(String(quote.cost),String(cost));
      assert.equal(quote.allowed,difference>=0n);
      assert.equal(H.promote(loaded),difference>=0n);
      if(difference<0n){assert.equal(serial(loaded),before);continue;}
      const after=reload(loaded);
      assert.equal(H.get(after).order,String(order+1));
      assert.equal(A.compare(I.quantity(after),String(difference)),0);
      assert.equal(A.compare(I.investedQuantity(after),I.investedQuantity(s)),0);
    }
  }
});
test('load requires an explicit ledger payment and respec refunds the historical amount once',()=>{
  const Save=W.Core.Save,A=W.Core.Amount,s=S.fresh();
  Object.assign(I.get(s),{unlocked:true,upgradesUnlocked:true,points:B.BN(100)});
  assert(I.purchase(s,'B1-1'));assert.equal(A.compare(I.quantity(s),99),0);
  const envelope=()=>JSON.parse(JSON.stringify(Save.envelope(s,false)));
  for(const damage of ['missing','null','absent row']){
    const raw=envelope(),ledger=raw.data.meta.infinity.purchaseLedger;
    if(damage==='missing')delete ledger[0].pricePaid;
    if(damage==='null')ledger[0].pricePaid=null;
    if(damage==='absent row')ledger.splice(0,1);
    assert.throws(()=>Save.prepare(raw),/付款|实付/,damage);
  }
  for(const paid of [0,1,7]){
    const raw=envelope();raw.data.meta.infinity.purchaseLedger[0].pricePaid=String(paid);
    const loaded=Save.prepare(raw).state,refunded=I.prepareRebirth(loaded,{respec:true});
    const after=Save.prepare(JSON.parse(JSON.stringify(Save.envelope(refunded,false)))).state;
    assert.equal(A.compare(I.quantity(after),99+paid),0);
    assert.equal(A.compare(I.investedQuantity(after),0),0);
    assert.equal(I.get(after).purchaseLedger.length,0);
  }
});

const reloadThreshold = s => W.Core.Save.prepare(JSON.parse(JSON.stringify(W.Core.Save.envelope(s,false)))).state;
test('successive promotions retain the signed root difference in stock and the lifetime record',()=>{
  const A=W.Core.Amount;
  for(const order of ['0','3'])for(const side of [-1,0,1]){
    const s=ready();assert(I.purchase(s,'C6'));
    const full=A.fromParts(order==='0'?1000:10000,side?[side+'e-60']:[]);
    if(order==='0')Object.assign(X.get(s).resources.multiverseCoefficient,A.fieldParts(full));
    else s.meta.highMultiverse=H.normalize({version:1,order,owner:'immortal',...A.fieldParts(full)});
    const loaded=reloadThreshold(s),before=serial(loaded),v=H.preview(loaded);
    assert.equal(serial(loaded),before);
    assert.equal(A.compare(v.nextQuantity,10),side,'preview '+order+' / '+side);
    assert(H.promote(loaded));
    const after=reloadThreshold(loaded),n=H.get(after);
    for(const field of ['amount','peak','total'])assert.equal(A.compare(A.field(n,field),10),side,field);
    assert.equal(A.compare(A.field(H.highest(after),'coefficient'),10),side);
    const balance=I.quantity(after);
    assert.equal(H.promote(after),side>=0);
    if(side<0)assert.equal(A.compare(I.quantity(after),balance),0);
  }
});
test('decimal integer orders above native overflow keep their price, growth and paid successor',()=>{
  const A=W.Core.Amount;
  for(const order of ['17'+'0'.repeat(307),'18'+'0'.repeat(307),'1'+'0'.repeat(2100)]){
    const s=ready();assert(I.purchase(s,'C6'));
    s.meta.highMultiverse=H.normalize({version:1,order,owner:'immortal',amount:12});
    const loaded=reloadThreshold(s),v=H.preview(loaded);
    assert(B.gt(H.price(order),'ee300'));
    assert(!v.enoughPoints);assert(!H.promote(loaded));
    assert(B.gt(H.weaken(7,order),0));assert(B.lt(H.weaken(7,order),'1e-300'));
    Object.assign(I.get(loaded),A.fieldParts(v.costQuantity,'points'));
    assert(H.promote(loaded));
    const after=reloadThreshold(loaded);
    assert.equal(H.get(after).order,(BigInt(order)+1n).toString());
    assert.equal(A.compare(I.quantity(after),0),0);
    assert(!H.preview(after).enoughCoefficient);
  }
});
test('googol unlock, sample and persistence agree on the complete power balance',()=>{
  const {W:current,h}=require('./helpers/challenge-runtime.cjs');
  const {State,Save,Amount,Resources}=current.Core,N=current.Meta.BigNumbers;
  for(const side of [-1,0,1]){
    const state=State.fresh();
    Resources.replaceExact('core.power',Amount.fromParts('1e100',[String(side)]),state);
    const sim=h.createSimulation(State.toSerializable(state)),s=sim.getState();
    assert.equal(N.requirements(s).power,side>=0);assert.equal(N.isUnlocked(s),side>=0);
    assert.equal(N.get(s).unlocked,false);
    sim.advanceGame(.1);
    const after=Save.prepare(JSON.parse(JSON.stringify(Save.envelope(sim.getState(),false)))).state;
    assert.equal(N.get(after).unlocked,side>=0);
    assert.equal(Amount.compare(N.quantity(after,0),0)>0,side>=0);
    if(side>=0){Resources.replaceExact('core.power',0,after);assert(N.isUnlocked(after));}
  }
});

test('orders exceeding one ledger atom distinguish exact tower roots on either side',()=>{
  const A=W.Core.Amount,base=10n**8191n;
  for(const side of [-1,0,1]){
    const s=S.fresh(),order=String(base-1n+BigInt(side));
    s.meta.highMultiverse=H.normalize({version:1,order,owner:'immortal',amount:'ee8191'});
    assert.equal(A.compare(H.preview(s).nextQuantity,10),side===0?0:-side);
  }
});

test('wide fractional towers resolve the order on either side of sqrt(10)',()=>{
  const A=W.Core.Amount;
  for(const [prefix,side] of [['31622776601683792',1],['31622776601683794',-1]]){
    const s=S.fresh(),order=String(BigInt(prefix+'0'.repeat(8175))-1n);
    s.meta.highMultiverse=H.normalize({version:1,order,owner:'immortal',amount:'ee8191.5'});
    assert.equal(A.compare(H.preview(s).nextQuantity,10),side);
  }
});

test('tiny high-multiverse exponents yield positive income for ordinary base production',()=>{
  for(const digits of [500,2047,2049]){
    const order='1'+'0'.repeat(digits-1);
    const result=H.weaken(1,order);
    assert(result.gt(0));
    assert(Math.abs(result.mag-(Math.log10(2*Math.LN2)-(digits-1)))<1e-12);
    assert(H.weaken(0,order).eq(0));
  }
  for(const digits of [499,8191])assert.equal(H.weaken('ee'+digits,'1'+'0'.repeat(digits)).toNumber(),99);
  const s=ready(),order='1'+'0'.repeat(499);
  X.get(s).resources.nieForce.amount=B.BN('1e12');
  s.meta.highMultiverse=H.normalize({version:1,order,owner:'immortal',amount:0});
  assert(H.rate(s).gt(0));
  eq(H.rate(s),H.weaken(X.highMultiverseRawRate(s),order));
});
