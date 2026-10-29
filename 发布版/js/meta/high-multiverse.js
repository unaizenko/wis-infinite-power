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
  function nonnegative(value){const n=B.parseFinite(value??0);if(!n||B.lt(n,0))throw Error('高阶多元数值无效');return n;}
  function bestRecord(a,b){
    if(!a)return b;
    const ak=BigInt(a.order),bk=BigInt(b.order);
    return bk>ak || bk===ak&&B.gt(b.coefficient,a.coefficient) ? b : a;
  }
  function record(n){return bestRecord(n.highest,{order:n.order,coefficient:B.max(n.amount,n.peak)});}
  const highest=s=>record(get(s));
  function normalize(raw){
    if(raw==null)return fresh();
    if(typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)throw Error('高阶多元存档无效');
    const n={version:1,order:integerOrder(raw.order),owner:raw.owner??null,
      amount:nonnegative(raw.amount),total:nonnegative(raw.total),peak:nonnegative(raw.peak)};
    if(n.order==='0'?(n.owner!==null||B.gt(n.amount,0)||B.gt(n.total,0)||B.gt(n.peak,0)):
      (typeof n.owner!=='string'||!WIS.Core.Registries.cultivationSystems.get(n.owner)))throw Error('高阶多元所属体系无效');
    if(raw.highest!=null){
      if(typeof raw.highest!=='object'||Array.isArray(raw.highest))throw Error('高阶多元最高记录无效');
      n.highest={order:integerOrder(raw.highest.order),coefficient:nonnegative(raw.highest.coefficient)};
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
    const n=get(s);if(!unlocked(s)||s.cultivation.active!==n.owner)return false;
    return WIS.Core.Registries.getActiveCultivation(s)?.highMultiverseVisible?.(s)===true;
  }
  function active(s){return visible(s)&&eligible(s);}
  function highestVisible(s){
    if(visible(s))return key;
    const X=WIS.Cultivation.Xiuzhen;
    if(s.cultivation.active!=='immortal'||!X.available(s))return null;
    const realm=X.get(s).realm;return realm>=11?'multiverseCoefficient':realm>=7?'universeCoefficient':null;
  }
  function currentOrder(s){
    const resource=highestVisible(s);
    return resource===key?get(s).order:resource==='multiverseCoefficient'?'2':resource==='universeCoefficient'?'1':'0';
  }
  function price(order){
    const config=WIS.Meta.InfinityConfig.highMultiverse, exponent=order==='0'?0n:BigInt(order)-2n;
    // Exact bounded rational arithmetic avoids ceil(550.0000000000001) at early tiers.
    if(exponent<=256n){const d=BigInt(config.costDenominator)**exponent;
      const n=BigInt(config.firstCost)*BigInt(config.costNumerator)**exponent;return B.BN(((n+d-1n)/d).toString());}
    return nonnegative(B.mul(config.firstCost,B.pow(B.div(config.costNumerator,config.costDenominator),exponent.toString()))).ceil();
  }
  function preview(s){
    const n=get(s),first=n.order==='0',nextOrder=first?'3':(BigInt(n.order)+1n).toString();
    const provider=WIS.Core.Registries.getActiveCultivation(s);
    const qualified=first?eligible(s):active(s);
    const coefficient=first?nonnegative(provider?.highMultiverseInitialCoefficient?.(s)??0):amount(s),cost=price(n.order);
    const threshold=WIS.Meta.InfinityConfig.highMultiverse.minimumCoefficient;
    const enoughCoefficient=B.gte(coefficient,threshold),enoughPoints=B.gte(WIS.Meta.Infinity.get(s).points,cost);
    const prerequisite=WIS.Meta.Infinity.has(s,'C6');
    return {first,nextOrder,fromSymbol:first?'N²':symbol(n.order),toSymbol:symbol(nextOrder),coefficient,cost,threshold,
      nextAmount:B.eq(coefficient,0)?B.ZERO:nonnegative(B.pow10(B.div(B.log10(coefficient),nextOrder))),prerequisite,eligible:qualified,enoughCoefficient,enoughPoints,
      allowed:prerequisite&&qualified&&enoughCoefficient&&enoughPoints};
  }
  function promote(s){
    WIS.Core.Runtime.assertMutable();const v=preview(s);if(!v.allowed)return false;
    const n={version:1,order:v.nextOrder,owner:v.first?s.cultivation.active:get(s).owner,
      amount:v.nextAmount,total:v.nextAmount,peak:v.nextAmount,
      highest:bestRecord(highest(s),{order:v.nextOrder,coefficient:v.nextAmount})};
    const infinity={...WIS.Meta.Infinity.get(s),points:nonnegative(B.sub(WIS.Meta.Infinity.get(s).points,v.cost))};
    // One publication: do not debit N/N2 or put consumable promotion costs in the upgrade refund ledger.
    s.meta={...s.meta,infinity,highMultiverse:n};WIS.Core.Effects.invalidate();return true;
  }
  function weaken(raw,order){
    const g=nonnegative(raw),k=integerOrder(order);if(k==='0')return B.ZERO;if(B.eq(g,0))return B.ZERO;
    // log1p/expm1 series protect tiny rates and huge orders from cancellation.
    const log=B.lt(g,'1e-5')?B.mul(g,B.add(B.sub(1,B.div(g,2)),B.div(B.mul(g,g),3))):B.BN(B.add(1,g)).ln();
    const x=B.mul(B.div(2,k),log);
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
    return B.div(B.mul(gain,multiplier),B.pow(B.add(1,B.div(amount(s),10)),.5));
  }
  function adjust(s,delta,terms){
    WIS.Core.Runtime.assertMutable();
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
      get:amount,set(s,value){const next=nonnegative(value);if(!unlocked(s)&&B.gt(next,0))throw Error('未解锁高阶多元库存');s.meta={...s.meta,highMultiverse:{...get(s),amount:next,highest:bestRecord(highest(s),{order:get(s).order,coefficient:next})}};return next;},
      add:adjust});
  }
  WIS.Meta.HighMultiverse=Object.freeze({key,fresh,rebirthState,normalize,get,highest,amount,unlocked,symbol,visible,eligible,active,highestVisible,currentOrder,price,preview,promote,weaken,rate,credit,registerResource});
}(window.WIS));
