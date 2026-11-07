(function defineMartialAmounts(W){
 'use strict';
 const A=W.Core.Amount,B=W.Core.BigNum,F=W.Core.AmountFormulas,C=W.Core.CertifiedRankMath,config=W.Cultivation.MartialConfig;
 if(!A||!F)throw Object.assign(Error('MartialAmount requires full quantities and formula proofs'),{code:'amount-dependency'});
 const M=()=>W.Cultivation.Martial,q=A.from,zero=()=>q(0),min=(a,b)=>A.compare(a,b)<=0?q(a):q(b),max=(a,b)=>A.compare(a,b)>=0?q(a):q(b),positive=v=>A.compare(v,0)>0;
 const product=(n,d=[])=>q(F.productQuotient(n,d)),power=(v,p)=>B.eq(p,1)?q(v):q(F.power(v,p));
 const stock=(s,key)=>A.field(M().get(s).resources[key]),core=(s,key)=>W.Core.Resources.readExact('core.'+key,s);
 const potential=value=>A.add(A.scale(power(value,2),.25),A.scale(value,.75));
 const increment=(s,d,p)=>B.eq(p,1)?q(d):q(F.powerIncrement(s,d,p));
 function segment(start,exponent,attenuation,coefficient,natural=false){
  // Preserve the pre-existing operation order for every original ability.
  if(natural||B.lte(exponent,1.15)){const e=B.BN(exponent).toNumber(),p=natural?attenuation+1:2/e+attenuation,r=natural?p:1/e+attenuation;
   const a=A.scale(coefficient,natural?1/(2*p):.5/e/p),b=A.scale(coefficient,natural?1/(2*p):.75/e/r);
   return {start:q(start),p,r,a,b,cost:d=>A.add(product([a,increment(start,d,p)]),product([b,increment(start,d,r)])),slope:v=>A.add(p>=1?product([A.scale(a,p),power(v,p-1)]):product([A.scale(a,p)],[power(v,1-p)]),r>=1?product([A.scale(b,r),power(v,r-1)]):product([A.scale(b,r)],[power(v,1-r)]))};
  }
  const p=natural?B.BN(attenuation+1):B.add(B.div(2,exponent),attenuation), r=natural?p:B.add(B.div(1,exponent),attenuation);
  const a=A.scale(coefficient,natural?B.div(.5,p):B.div(.5,B.add(2,B.mul(exponent,attenuation)))),b=A.scale(coefficient,natural?B.div(.5,p):B.div(.75,B.add(1,B.mul(exponent,attenuation))));
  const derivative=(v,c,e)=>B.gte(e,1)?product([A.scale(c,e),power(v,B.sub(e,1))]):product([A.scale(c,e)],[power(v,B.sub(1,e))]);
  return {start:q(start),p,r,a,b,cost:d=>A.add(product([a,increment(start,d,p)]),product([b,increment(start,d,r)])),
   slope:v=>A.add(derivative(v,a,p),derivative(v,b,r))};
 }
 function previous(value){const v=A.project(value),buffer=new DataView(new ArrayBuffer(8));buffer.setFloat64(0,v.mag);buffer.setBigUint64(0,buffer.getBigUint64(0)+(v.mag>0?-1n:1n));return q(B.Decimal.fromComponents(v.sign,v.layer,buffer.getFloat64(0)));}
 function publish(value){let out=q(A.project(value));if(A.compare(out,value)>0)out=previous(value);if(!positive(out)&&positive(value))throw Object.assign(Error('Positive martial gain has no confirmed representation'),{code:'amount-formula-unresolved'});return out;}
 function solve(s,budget,limit=null){return C.task('martial-root|'+JSON.stringify([s.start,s.p,s.r,s.a,s.b,budget,limit]),function*(){
  // Inverse each positive monomial separately. Concave powers need the shifted
  // inverse; the old unshifted bound/tangent is valid only for convex powers.
  const upper=(c,p)=>B.gte(p,1)||!positive(s.start)?power(product([budget],[c]),typeof p==='number'?1/p:B.div(1,p)):product([s.start,q(F.powerOnePlusMinusOne(product([budget],[c,power(s.start,p)]),B.div(1,p)))]);
  let high=yield ()=>min(upper(s.a,s.p),upper(s.b,s.r));
  if(B.gte(s.p,1)&&B.gte(s.r,1)){const tangent=yield ()=>s.slope(s.start);if(yield ()=>positive(tangent))high=yield ()=>min(high,product([budget],[tangent]));}if(limit)high=yield ()=>min(high,limit);
  let low=zero();for(let i=0;i<80;i++){
   const cost=yield ()=>s.cost(high);if(yield ()=>A.compare(cost,budget)<=0)return yield ()=>publish(high);
   const slope=yield ()=>s.slope(A.add(s.start,high)),step=yield ()=>product([A.subtract(cost,budget)],[slope]);
   let next=yield ()=>A.compare(high,step)>=0?A.subtract(high,step):zero();
   // The root is published at Decimal precision. An exact Newton correction
   // below that coordinate must step to its predecessor instead of repeating
   // the same represented high point with increasingly long invisible tails.
   next=yield ()=>{let value=positive(next)?publish(next):next;return B.eq(A.project(value),A.project(high))?previous(high):value;};
   if(yield ()=>A.compare(next,low)<=0||A.compare(next,high)>=0)next=yield ()=>publish(A.scale(A.add(low,high),.5));
   if(yield ()=>A.compare(next,low)<=0||A.compare(next,high)>=0){const below=yield ()=>previous(high);if(yield ()=>A.compare(below,low)<=0)return yield ()=>publish(low);const price=yield ()=>s.cost(below);if(yield ()=>A.compare(price,budget)<=0)return yield ()=>publish(below);high=below;continue;}
   const price=yield ()=>s.cost(next);if(yield ()=>A.compare(price,budget)<=0)low=next;else high=next;
   if(yield ()=>B.eq(A.project(low),A.project(high))){const out=yield ()=>publish(low);if(yield ()=>positive(out))return out;}
  }
  if(yield ()=>!positive(low)&&positive(budget))throw Object.assign(Error('Martial root did not certify a positive increment'),{code:'amount-formula-unresolved'});return yield ()=>publish(low);
 });}
 function absoluteInvestment(key,value){const c=config.balance.absolute[key],threshold=q(c.threshold);if(A.compare(value,threshold)<=0)return potential(value);
  return A.add(potential(threshold),segment(threshold,1,c.power,q(B.pow(c.threshold,-c.power))).cost(A.subtract(value,threshold)));
 }
 function thresholds(s,key){const absolute=config.balance.absolute[key],relative=config.balance.relative[key],rows=[{value:q(absolute.threshold),power:absolute.power*M().attenuationFactor(s)}];
  if(relative)rows.push({value:A.add(relative.floor,A.scale(absoluteInvestment(relative.support,stock(s,relative.support)),relative.factor)),power:relative.power*M().attenuationFactor(s)});return rows.sort((a,b)=>A.compare(a.value,b.value));
 }
 function unattenuated(current,investment,exponent){
  if(!positive(investment))return zero();const unpowered=power(current,B.div(1,exponent)),anchor=A.add(unpowered,1.5),scaled=A.scale(investment,4),root=power(A.add(power(anchor,2),scaled),.5),delta=product([scaled],[A.add(root,anchor)]);
  if(B.eq(exponent,1))return delta;
  return increment(unpowered,delta,exponent);
 }
 function balanced(s,key,current,investment,exponent,preparedRows=null){const rows=preparedRows||thresholds(s,key);
  return C.task('martial-balanced|'+JSON.stringify([rows,current,investment,exponent]),function*(){
   const legacy=yield ()=>unattenuated(current,investment,exponent);if(yield ()=>A.compare(A.add(current,legacy),rows[0].value)<=0)return legacy;
   let value=q(current),remaining=q(investment),gained=zero(),attenuation=0,coefficient=q(1);const e=B.BN(exponent);
   for(const t of rows){if(yield ()=>A.compare(value,t.value)<0){const delta=yield ()=>A.subtract(t.value,value),part=yield ()=>segment(value,e,attenuation,coefficient),cost=yield ()=>part.cost(delta);
     if(yield ()=>A.compare(remaining,cost)<0){if(!attenuation)return legacy;const gain=yield ()=>solve(part,remaining,delta);return yield ()=>A.add(gained,gain);}
     const next=yield ()=>({remaining:A.subtract(remaining,cost),gained:A.add(gained,delta)});remaining=next.remaining;gained=next.gained;value=t.value;
    }attenuation+=t.power;coefficient=yield ()=>product([coefficient],[power(t.value,t.power)]);
   }
   if(yield ()=>!positive(remaining))return gained;const gain=yield ()=>solve(segment(value,e,attenuation,coefficient),remaining);return yield ()=>A.add(gained,gain);
  });
 }
 const stateIds=new WeakMap();let nextStateId=0;
 function emptyPreview(key){const result={key,gain:B.ZERO,gainQuantity:zero(),costs:{},costQuantities:{},allowed:false,reason:'当前未选择武道',efficiency:B.ONE,heartExponent:B.ONE};result.consumed=result.costs;return result;}
 function preview(s,key){if(!M().active(s)||!M().resourceKeys.includes(key))return emptyPreview(key);return C.withWork(()=>{if(!stateIds.has(s))stateIds.set(s,++nextStateId);const signature=stateIds.get(s)+'|'+JSON.stringify(W.Core.State.toSerializable(s));
  return C.task('martial-preview|'+key+'|'+signature,()=>previewSteps(s,key));
 });}
 function* previewSteps(s,key){
  const m=M(),initial=()=>{const result=emptyPreview(key);
   if(!m.active(s)||!m.resourceKeys.includes(key))return {result};const costs=result.costQuantities;let input=zero();
   if(['qi','body'].includes(key)){const k=key==='qi'?'joules':'power';costs[k]=core(s,k);input=A.divide(costs[k],key==='qi'?10000:1000);}
   else if(key==='heart'){for(const k of ['qi','body']){const value=stock(s,k);costs[k]=m.harmony(s)?A.subtract(value,min(value,stock(s,'heart'))):value;}input=A.divide(min(costs.qi,costs.body),5);}
   else {for(const k of ['qi','body','heart'])costs[k]=stock(s,k);input=min(A.divide(costs.qi,10),min(A.divide(costs.body,10),costs.heart));}
   const exponent=['qi','body'].includes(key)?m.conversionExponent(s):key==='soul'?m.soulExponent(s):B.ONE,efficiency=m.efficiency(s,key),investment=A.multiply(input,efficiency),current=stock(s,key);
   return {result,input,exponent,efficiency,investment,current};
  };
  const prepared=yield initial,{result,input,exponent,efficiency,investment,current}=prepared;if(input===undefined)return result;
  result.efficiency=efficiency;result.heartExponent=exponent;result.investmentQuantity=investment;result.investment=yield ()=>A.project(investment);result.potentialQuantity=yield ()=>A.add(potential(power(current,B.div(1,exponent))),investment);result.potential=yield ()=>A.project(result.potentialQuantity);
  result.gainQuantity=(yield ()=>positive(input))?yield ()=>balanced(s,key,current,investment,exponent):zero();return yield ()=>{result.gain=A.project(result.gainQuantity);result.costs=Object.fromEntries(Object.entries(result.costQuantities).map(([k,v])=>[k,A.project(v)]));result.consumed=result.costs;
  result.allowed=positive(input)&&positive(result.gainQuantity);result.reason=result.allowed?'':'投入不足或没有可表示的收益';result.heartRewards={qi:B.ZERO,body:B.ZERO};return result;};
 }
 function naturalGain(profile,seconds,{frozen=false}={}){
  if(!profile||!profile.kinds||!positive(seconds))return zero();const full=profile.quantities||profile;
  if(frozen)return A.multiply(full.rate,seconds);
  let budget=A.multiply(full.base,seconds),value=q(full.current),gained=zero(),attenuation=0,coefficient=q(1);
  for(const t of full.thresholds){if(A.compare(value,t.value)<0){const delta=A.subtract(t.value,value),part=segment(value,1,attenuation,coefficient,true),cost=part.cost(delta);
    if(A.compare(budget,cost)<0)return A.add(gained,attenuation?solve(part,budget,delta):min(delta,budget));budget=A.subtract(budget,cost);gained=A.add(gained,delta);value=q(t.value);
   }attenuation+=t.power;coefficient=product([coefficient],[power(t.value,t.power)]);
  }
  return positive(budget)?A.add(gained,solve(segment(value,1,attenuation,coefficient,true),budget)):gained;
 }
 function capture(s){const m=M(),kinds=m.level(s,'changSheng')?m.innerCount(s):0;if(!kinds)return {kinds:0,base:B.ZERO,rate:B.ZERO,current:B.ZERO,thresholds:[]};
  const base=A.scale(m.acquisitionMultiplier(s,'qi'),kinds*kinds),current=stock(s,'qi'),rows=thresholds(s,'qi');let attenuation=q(1);
  for(const t of rows)if(A.compare(current,t.value)>0)attenuation=product([attenuation,power(product([current],[t.value]),t.power)]);
  const rate=product([base],[attenuation]);return {kinds,base:A.project(base),rate:A.project(rate),current:A.project(current),thresholds:rows.map(t=>({...t,value:A.project(t.value)})),quantities:{base,rate,current,thresholds:rows}};
 }
 function heartRewards(s,n,spent){const rewards={qi:zero(),body:zero()},m=M();if(!m.active(s)||!positive(spent??0))return rewards;const candidate={...s,cultivation:{...s.cultivation,systems:{...s.cultivation.systems,martial:n}}};
  for(const [key,ability]of [['qi','tianMo'],['body','ciHang']])if(m.level(candidate,ability)){const base=A.multiply(A.scale(spent,10),m.acquisitionMultiplier(candidate,key));rewards[key]=W.Cultivation.MartialAmount.naturalGain({kinds:1,base,current:stock(candidate,key),thresholds:thresholds(candidate,key)},1);}return rewards;
 }
 function capturePassive(s){
  const m=M(),owned={mindPlanet:m.level(s,'mindPlanet'),innerWorld:m.level(s,'innerWorld')};if(!m.active(s)||(!owned.mindPlanet&&!owned.innerWorld))return {};
  const inputs={};if(owned.mindPlanet){const base=A.scale(power(A.add(1,stock(s,'heart')),.5),2*owned.mindPlanet);inputs.qi=base;inputs.body=base;}
  if(owned.innerWorld){const least=min(stock(s,'qi'),stock(s,'body'));inputs.heart=A.scale(least,.5);inputs.soul=A.scale(least,.05);}
  const result={};for(const [key,input]of Object.entries(inputs)){
   const base=A.multiply(input,m.acquisitionMultiplier(s,key)),current=stock(s,key),exponent=['qi','body'].includes(key)?m.conversionExponent(s):key==='soul'?m.soulExponent(s):B.ONE,rows=thresholds(s,key);
   let attenuation=0,coefficient=q(1);for(const t of rows)if(A.compare(current,t.value)>0){attenuation+=t.power;coefficient=product([coefficient],[power(t.value,t.power)]);}
   const rate=!positive(current)&&B.gt(exponent,1)?zero():product([base],[segment(current,exponent,attenuation,coefficient).slope(current)]);
   result[key]={base,current,exponent,thresholds:rows,rate};
  }return result;
 }
 function passiveGains(profile,seconds,{frozen=false}={}){
  const result={};for(const key of M().resourceKeys){const p=profile?.[key];result[key]=!p?zero():frozen?A.multiply(p.rate,seconds):balanced(null,key,p.current,A.multiply(p.base,seconds),p.exponent,p.thresholds);}return result;
 }
 W.Cultivation.MartialAmount=Object.freeze({capturePassive,passiveGains,stock,core,potential,thresholds,preview,naturalGain,capture,heartRewards});
}(window.WIS));
