(function defineHighMultiverse(WIS) {
  'use strict';
  const B=WIS.Core.BigNum, key='highMultiverseCoefficient';
  const fresh=()=>({version:1,order:'0',owner:null,amount:B.ZERO,total:B.ZERO,peak:B.ZERO,highest:{order:'0',coefficient:B.ZERO}});
  function integerOrder(value){
    if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('高阶多元阶数须以精确整数字符串保存');
    const text=String(value??'0');
    if(!/^(0|[1-9][0-9]*)$/.test(text)||(text!=='0'&&BigInt(text)<3n))throw Error('高阶多元阶数无效');
    return text;
  }
  const orderValue=order=>WIS.Core.SignedLedger.project(order);
  function nonnegative(value){const n=B.parseFinite(value??0);if(!n||B.lt(n,0))throw Error('高阶多元数值无效');return n;}
  function bestRecord(a,b){
    if(!a)return b;
    const ak=BigInt(a.order),bk=BigInt(b.order);
    return bk>ak || bk===ak&&(WIS.Core.Amount?.enabled()?WIS.Core.Amount.compare(WIS.Core.Amount.field(b,"coefficient"),WIS.Core.Amount.field(a,"coefficient"))>0:B.gt(b.coefficient,a.coefficient)) ? b : a;
  }
  function record(n){if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount,a=A.field(n),p=A.field(n,'peak'),value=A.compare(a,p)>0?a:p;return bestRecord(n.highest,{order:n.order,...A.boundedFieldParts(value,'coefficient')});}return bestRecord(n.highest,{order:n.order,coefficient:B.max(n.amount,n.peak)});}
  const highest=s=>record(get(s));
  function normalize(raw){
    if(raw==null)return fresh();
    if(typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)throw Error('高阶多元存档无效');
    const n={version:1,order:integerOrder(raw.order),owner:raw.owner??null,
      amount:nonnegative(raw.amount),total:nonnegative(raw.total),peak:nonnegative(raw.peak)};
    if(WIS.Core.Amount?.enabled())for(const field of ['amount','total','peak','spent'])Object.assign(n,WIS.Core.Amount[field==='spent'?'fieldParts':'boundedFieldParts'](WIS.Core.Amount.field(raw,field),field));
    if(n.order==='0'?(n.owner!==null||B.gt(n.amount,0)||B.gt(n.total,0)||B.gt(n.peak,0)):
      (typeof n.owner!=='string'||!WIS.Core.Registries.cultivationSystems.get(n.owner)))throw Error('高阶多元所属体系无效');
    if(raw.highest!=null){
      if(typeof raw.highest!=='object'||Array.isArray(raw.highest))throw Error('高阶多元最高记录无效');
      n.highest={order:integerOrder(raw.highest.order),coefficient:nonnegative(raw.highest.coefficient)};
      if(WIS.Core.Amount?.enabled())Object.assign(n.highest,WIS.Core.Amount.boundedFieldParts(WIS.Core.Amount.field(raw.highest,'coefficient'),'coefficient'));
      if(n.highest.order==='0'&&B.gt(n.highest.coefficient,0))throw Error('未解锁的高阶多元最高记录无效');
    }
    n.highest=record(n);
    return n;
  }
  const get=s=>s.meta.highMultiverse||fresh(), amount=s=>get(s).amount;
  // Purchased orders and the ranked lifetime maximum are permanent. A new
  // run starts with no stock, income total or current-order peak.
  function rebirthState(s){
    const n=normalize(get(s));
    return normalize({...fresh(),order:n.order,owner:n.owner,highest:n.highest});
  }
  const unlocked=s=>get(s).order!=='0';
  const symbol=order=>order==='1'?'N':order==='2'?'N²':order==='3'?'N³':'N^'+order;
  const eligible=s=>WIS.Core.Registries.getActiveCultivation(s)?.highMultiverseEligible?.(s)===true;
  function visible(s){
    const n=get(s);if(!unlocked(s))return false;
    return WIS.Core.Registries.getActiveCultivation(s)?.highMultiverseVisible?.(s)===true;
  }
  function active(s){return visible(s)&&eligible(s);}
  function highestVisible(s){
    if(visible(s))return key;
    const X=WIS.Cultivation.Xiuzhen;
    if(s.cultivation.active!=='immortal'||!X.available(s)){
      if(WIS.Cultivation.Martial?.level(s,'fiveRealms'))return 'universeCoefficient';
      return null;
    }
    const realm=X.get(s).realm;return realm>=11?'multiverseCoefficient':realm>=7?'universeCoefficient':null;
  }
  function currentOrder(s){
    const resource=highestVisible(s);
    return resource===key?get(s).order:resource==='multiverseCoefficient'?'2':resource==='universeCoefficient'?'1':'0';
  }
  // One immutable literal from the configured price schedule. A large exact
  // quotient need only be calculated once while a player stays at that order.
  let lastPriceLiteral=null;
  function priceLiteral(order){
    const config=WIS.Meta.InfinityConfig.highMultiverse;
    if(lastPriceLiteral?.order===order&&lastPriceLiteral.config===config)return lastPriceLiteral.value;
    const exponent=order==='0'?0n:BigInt(order)-2n;
    let value;
    // Up to this exponent the configured ceiling fits 8188 digits, leaving
    // space in an 8192-character Amount atom for a sign and the e0 suffix.
    if(exponent<=197747n){
      const d=BigInt(config.costDenominator)**exponent;
      const n=BigInt(config.firstCost)*BigInt(config.costNumerator)**exponent;
      value=((n+d-1n)/d).toString();
    }else{
      value=String(nonnegative(B.mul(config.firstCost,B.pow(B.div(config.costNumerator,config.costDenominator),orderValue(exponent.toString())))).ceil());
    }
    lastPriceLiteral={order,config,value};
    return value;
  }
  const price=order=>WIS.Core.SignedLedger.project(priceLiteral(order));
  // When 10^order exceeds a ledger atom, use the representable tower as
  // an anchor. Its exponent minus the exact order is still recoverable.
  function towerOrderOffset(anchor,order){
    const top=Math.floor(anchor.mag),unit=10n**BigInt(top),target=BigInt(order);
    if(Number.isInteger(anchor.mag))return orderValue(String(unit-target));
    const fraction=String(anchor.mag).split('.')[1];
    const C=WIS.Core.CertifiedRankMath;
    for(const places of [48,96,192,384,512]){
      const c=C.context(places);
      const mantissa=c.pow10(c.fraction(BigInt(fraction),10n**BigInt(fraction.length)));
      const diff=c.sub(mantissa,c.fraction(target,unit));
      const lower=orderValue(diff.lo+'e'+(top-places)),upper=orderValue(diff.hi+'e'+(top-places));
      if(B.eq(lower,upper))return lower;
    }
    throw Object.assign(Error('高阶多元开根差额超出可确认精度'),{code:'amount-formula-unresolved'});
  }
  function promotionRoot(full,coefficient,nextOrder){
    const A=WIS.Core.Amount,F=WIS.Core.AmountFormulas,k=orderValue(nextOrder);
    if(B.eq(coefficient,0))return full?A.from(0):B.ZERO;
    const log=full?.tail.length?F.log10(full):B.log10(coefficient),coordinate=B.div(log,k);
    const threshold=WIS.Meta.InfinityConfig.highMultiverse.minimumCoefficient;
    // At the next eligibility boundary a rounded root loses both the sign and
    // the purchasing power of the remainder. Evaluate root(x) - 10 around
    // the exact input 10^k. log1p and expm1 retain even sub-ULP differences.
    if(full&&threshold===10&&B.lt(B.abs(B.sub(coordinate,1)),'1e-12')){
      const anchor=nextOrder.length>8190?B.pow10(k):null;
      const boundary=anchor?A.from(anchor):A.from('1e'+nextOrder);
      const side=A.compare(full,boundary);
      let logRatio=anchor?towerOrderOffset(anchor,nextOrder):B.ZERO;
      if(side){
        const lower=side>0?boundary:full,higher=side>0?full:boundary;
        const delta=A.subtract(higher,lower);
        logRatio=B.add(logRatio,B.mul(side,F.logOnePlusRatio(delta,lower)));
      }
      if(B.eq(logRatio,0))return A.from(threshold);
      const exponent=B.mul(B.div(logRatio,k),Math.LN10);
      const difference=B.mul(threshold,WIS.Core.ClosedFormBatch.expm1(exponent));
      return A.fromParts(threshold,[difference]);
    }
    const projected=full?.tail.length&&nextOrder.length<=2048
      ?F.power(full,B.div(1,k)):nonnegative(B.pow10(coordinate));
    return full?A.from(projected):projected;
  }
  function preview(s){
    const n=get(s),first=n.order==='0',nextOrder=first?'3':(BigInt(n.order)+1n).toString();
    const provider=WIS.Core.Registries.getActiveCultivation(s);
    const qualified=first?eligible(s):active(s);
    const coefficient=first?nonnegative(provider?.highMultiverseInitialCoefficient?.(s)??0):amount(s);
    const threshold=WIS.Meta.InfinityConfig.highMultiverse.minimumCoefficient,A=WIS.Core.Amount;
    const literal=priceLiteral(n.order),cost=WIS.Core.SignedLedger.project(literal),costQuantity=A?.enabled()?A.from(literal):null;
    const full=A?.enabled()?(first?A.from(provider?.highMultiverseInitialQuantity?.(s)??coefficient):A.field(n)):null;
    const enoughCoefficient=full?A.compare(full,threshold)>=0:B.gte(coefficient,threshold),enoughPoints=A?.enabled()?A.compare(WIS.Meta.Infinity.quantity(s),costQuantity)>=0:B.gte(WIS.Meta.Infinity.get(s).points,cost);
    const prerequisite=WIS.Meta.Infinity.has(s,'C6');
    const root=promotionRoot(full,coefficient,nextOrder),nextAmount=full?A.project(root):root;
    return {first,nextOrder,fromSymbol:first?'N²':symbol(n.order),toSymbol:symbol(nextOrder),coefficient,cost,costQuantity,threshold,
      nextAmount,...(full?{quantity:full,nextQuantity:root}:{}),prerequisite,eligible:qualified,enoughCoefficient,enoughPoints,
      allowed:prerequisite&&qualified&&enoughCoefficient&&enoughPoints};
  }
  function promote(s){
    WIS.Core.Runtime.assertMutable();const v=preview(s);if(!v.allowed)return false;
    const n={version:1,order:v.nextOrder,owner:v.first?s.cultivation.active:get(s).owner,
      amount:v.nextAmount,total:v.nextAmount,peak:v.nextAmount,
      highest:highest(s)};
    const A=WIS.Core.Amount;
    if(v.nextQuantity)for(const field of ['amount','total','peak'])Object.assign(n,A.boundedFieldParts(v.nextQuantity,field));
    n.highest=record(n);
    const infinity={...WIS.Meta.Infinity.get(s),...(A?.enabled()?A.fieldParts(A.subtract(WIS.Meta.Infinity.quantity(s),v.costQuantity),'points'):{points:nonnegative(B.sub(WIS.Meta.Infinity.get(s).points,v.cost))})};
    // One publication: do not debit N/N2 or put consumable promotion costs in the upgrade refund ledger.
    s.meta={...s.meta,infinity,highMultiverse:n};WIS.Core.Effects.invalidate();return true;
  }
  function weaken(raw,order){
    const digits=integerOrder(order);if(digits==='0')return B.ZERO;

    if(WIS.Core.Amount?.enabled()){
      const A=WIS.Core.Amount,F=WIS.Core.AmountFormulas;
      if(digits.length<=15)return F.powerOnePlusMinusOne(A.from(raw),B.div(2,orderValue(digits)));
      return F.powerOnePlusMinusOneFraction(raw,2,digits);
    }
    const g=nonnegative(raw);if(B.eq(g,0))return B.ZERO;
    // log1p/expm1 series protect tiny rates and huge orders from cancellation.
    const log=B.lt(g,'1e-5')?B.mul(g,B.add(B.sub(1,B.div(g,2)),B.div(B.mul(g,g),3))):B.BN(B.add(1,g)).ln();
    const x=B.mul(B.div(2,orderValue(digits)),log);
    const result=B.lt(x,'1e-5')?B.mul(x,B.add(B.add(1,B.div(x,2)),B.div(B.mul(x,x),6))):B.sub(B.BN(x).exp(),1);
    return nonnegative(result);
  }
  function rate(s){
    if(!active(s))return B.ZERO;
    // Owner base is weakened exactly once. Its optional final multiplier is
    // applied afterwards so higher orders do not erase the ability's benefit.
    const system=WIS.Core.Registries.getActiveCultivation(s);
    const gain=weaken(system?.highMultiverseRate?.(s)??B.ZERO,get(s).order);
    const multiplier=nonnegative(system?.highMultiverseMultiplier?.(s)??B.ONE);
    const decay=WIS.Core.Amount?.enabled()?WIS.Core.AmountFormulas.powerRatio(WIS.Core.Amount.add(WIS.Core.Amount.field(get(s)),10),10,.5):B.pow(B.add(1,B.div(amount(s),10)),.5);
    const rate=WIS.Core.StableProductQuotient.evaluate([gain,multiplier],[decay]);
    const achievements=WIS.Meta.Achievements;
    return achievements.applyInfiniteBoxReward(rate,achievements.infiniteBoxExponent(s));
  }
  function adjust(s,delta,terms){
    WIS.Core.Runtime.assertMutable();
    if(WIS.Core.Amount?.enabled()){
      const A=WIS.Core.Amount,L=WIS.Core.AmountLedger,income=L.safeNormalize(terms||[delta]),sign=L.strict.sign(income);if(!sign)return amount(s);if(!unlocked(s))throw Error('未解锁高阶多元库存');
      const n=normalize(get(s)),change=A.fromParts(0,sign>0?income:L.negate(income)),value=A.fromParts(0,[...A.words(A.field(n)),...income]);
      Object.assign(n,A.boundedFieldParts(value),A[sign>0?'boundedFieldParts':'fieldParts'](A.add(A.field(n,sign>0?'total':'spent'),change),sign>0?'total':'spent'));
      if(A.compare(value,A.field(n,'peak'))>0)Object.assign(n,A.boundedFieldParts(value,'peak'));n.highest=record(n);s.meta={...s.meta,highMultiverse:n};return n.amount;
    }
    const d=terms?WIS.Meta.TreasureLedger.value(WIS.Meta.TreasureLedger.normalize(terms)):B.parseFinite(delta);
    if(!d||!B.isFiniteBN(d))throw Error('高阶多元库存变化无效');
    if(B.eq(d,0))return amount(s);
    if(!unlocked(s))throw Error('未解锁高阶多元库存');
    const n=get(s),next=WIS.Core.Resources.prepareTerms({amount:n.amount},'amount',terms||[d]).amount;
    s.meta={...s.meta,highMultiverse:{...n,amount:next,total:nonnegative(B.add(n.total,B.max(0,d))),peak:B.max(n.peak,next),highest:bestRecord(highest(s),{order:n.order,coefficient:next})}};
    return next;
  }
  function credit(s,gain){return adjust(s,nonnegative(gain));}
  function registerResource(){
    WIS.Core.Registries.resources.register({id:'meta.multiverse.'+key,kind:'meta',owner:'multiverse',shortName:key,snapshot:false,
      get:amount,getExact:s=>WIS.Core.Amount.field(get(s)),
      setExact(s,value){const A=WIS.Core.Amount,v=A.from(value);if(!unlocked(s)&&A.compare(v,0)>0)throw Error('未解锁高阶多元库存');const n=normalize(get(s));Object.assign(n,A.boundedFieldParts(v));if(A.compare(v,A.field(n,'peak'))>0)Object.assign(n,A.boundedFieldParts(v,'peak'));n.highest=record(n);s.meta={...s.meta,highMultiverse:n};return v;},
      set(s,value){const next=nonnegative(value);if(!unlocked(s)&&B.gt(next,0))throw Error('未解锁高阶多元库存');s.meta={...s.meta,highMultiverse:{...get(s),amount:next,highest:bestRecord(highest(s),{order:get(s).order,coefficient:next})}};return next;},
      add:adjust});
  }
  WIS.Meta.HighMultiverse=Object.freeze({key,fresh,rebirthState,normalize,get,highest,amount,unlocked,symbol,visible,eligible,active,highestVisible,currentOrder,orderValue,price,preview,promote,weaken,rate,credit,registerResource});
}(window.WIS));

(function defineUniverseCoefficients(WIS) {
  const keys=Object.freeze(['universeCoefficient','multiverseCoefficient','infiniteBoxCoefficient']);
  const shared=key=>keys.includes(key);
  const entry=(s,key)=>s.meta.universeCoefficients[key];
  // Install a prepared economy as one transaction. Legacy saves carry
  // these three rows alongside the producer's private cultivation resources.
  function install(s,model) {
    const resources={...model.resources}, ledger={};
    for(const key of keys) {
      ledger[key]=model.resources[key] ?? s.meta.universeCoefficients?.[key];
      delete resources[key];
    }
    s.meta.universeCoefficients=ledger;
    s.cultivation.systems.immortal.xiuzhen={...model,resources};
  }
  function bindLegacyView(s) {
    const rows=s.cultivation?.systems?.immortal?.xiuzhen?.resources;
    if(!rows || !s.meta.universeCoefficients)return s;
    for(const key of keys)Object.defineProperty(rows,key,{configurable:true,enumerable:false,
      get:()=>entry(s,key),set:value=>{s.meta.universeCoefficients[key]=value;}});
    return s;
  }
  const quantity=(s,key)=>WIS.Core.Amount.field(key===WIS.Meta.HighMultiverse.key?WIS.Meta.HighMultiverse.get(s):entry(s,key));
  const amount=(s,key)=>key===WIS.Meta.HighMultiverse.key?WIS.Meta.HighMultiverse.amount(s):WIS.Core.BigNum.BN(entry(s,key).amount);
  function rates(s) {
    const X=WIS.Cultivation.Xiuzhen;
    if(s.cultivation.active==='immortal')return X.rates(s);
    const result=Object.fromEntries(X.resourceKeys.map(k=>[k,WIS.Core.BigNum.ZERO]));
    result.universeCoefficient=WIS.Cultivation.Martial.fiveRealmsRate(s);
    return result;
  }
  WIS.Meta.UniverseCoefficients=Object.freeze({keys,shared,entry,quantity,amount,install,bindLegacyView,rates});
}(window.WIS));
