(function(W){
 'use strict';
 const B=W.Core.BigNum,C=W.Core.ClosedFormBatch,CHALLENGE=W.Meta.InfinityConfig.gChallengeCoefficient;
 const EM=[[1,1/12],[3,-1/720],[5,1/30240],[7,-1/1209600],[9,1/47900160],[11,-691/1307674368000],[13,1/74724249600],[15,-3617/10670622842880000]];
 const FACT=[1];for(let k=1;k<=16;k++)FACT[k]=FACT[k-1]*k;
 const gauss=[];for(let i=0;i<16;i++){let z=Math.cos(Math.PI*(i+.75)/16.5),derivative=0;for(let j=0;j<16;j++){let p0=1,p1=z;for(let k=2;k<=16;k++){const p=((2*k-1)*z*p1-(k-1)*p0)/k;p0=p1;p1=p;}derivative=16*(z*p1-p0)/(z*z-1);const next=z-p1/derivative;if(Math.abs(next-z)<1e-16){z=next;break;}z=next;}gauss.push([z,2/((1-z*z)*derivative*derivative)]);}
 function powerSumCore(x,n,p){if(n.eq(0))return B.ZERO;if(n.eq(1))return x.pow(p);const log=C.log1p(n.sub(1).div(x)),diff=e=>x.pow(e).mul(C.expm1(log.mul(e)));let sum=diff(p+1).div(p+1).add(x.pow(p).add(x.add(n.sub(1)).pow(p)).div(2));for(const [order,coefficient] of EM){let d=coefficient;for(let k=0;k<order;k++)d*=p-k;sum=sum.add(diff(p-order).mul(d));}return sum;}
 function powerSum(x,n,p){
  if(p>=0||x.gte(64)||n.lte(1))return powerSumCore(x,n,p);
  // Fixed-shift Euler-Maclaurin: 16 boundary differences, independent of
  // count. Moving the expansion away from its singularity bounds the high
  // negative-power terms in the D6 binomial series.
  let boundary=B.ZERO;for(let k=0;k<16;k++){const z=x.add(k);boundary=boundary.sub(z.pow(p).mul(C.expm1(C.log1p(n.div(z)).mul(p))));}
  return powerSumCore(x.add(16),n,p).add(boundary);
 }
 function rawFee(g,rules){const challenge=rules.challenge==='trueGraham',base=challenge?B.BN(100).pow(B.ONE.add(g.mul(CHALLENGE))):B.BN(100),capacity=g.lt(64)?B.ONE:g.sub(56).div(8).pow(2);let v=base.mul(capacity);if(rules.d6)v=B.max(42,v.sub(g));return v;}
 function legacyFee(g,rules){g=B.BN(g);const p=rules.reward?.95:1,divisor=B.pow10(rules.treeDelta??0),raw=rawFee(g,rules).div(divisor).pow(p);return rules.pricing==='base'?raw.div(multiplier(g)):raw;}
 function multiplier(g){let k=1;for(const cut of [2,4,8,16,32])if(g.gte(cut))k*=2;return B.BN(k);}
 function ordinary(g,n,rules){if(n.eq(0))return B.ZERO;const p=rules.reward?.95:1;
  if(g.lt(64)){if(!rules.d6)return B.BN(100).pow(p).mul(n);if(g.gte(58))return B.BN(42).pow(p).mul(n);return powerSum(B.BN(101).sub(g).sub(n),n,p);}
  if(g.eq(64)&&rules.d6)return B.BN(42).pow(p).add(n.gt(1)?ordinary(B.BN(65),n.sub(1),rules):0);
  const a=25/16,x=g.sub(56);
  if(p===1){const pairs=n.mul(n.sub(1)),sum1=pairs.div(2),sum2=pairs.mul(n.mul(2).sub(1)).div(6);let v=n.mul(x.pow(2)).add(x.mul(pairs)).add(sum2).mul(a);if(rules.d6)v=v.sub(n.mul(g).add(sum1));return v;}
  const shift=rules.d6?1/(2*a):0,offset=rules.d6?56/a+1/(4*a*a):0,z=x.sub(shift);let sum=B.ZERO,coefficient=1;
  for(let j=0;j<(rules.d6?32:1);j++){sum=sum.add(powerSum(z,n,2*p-2*j).mul(coefficient));coefficient*=((p-j)/(j+1))*(-offset);}
  return sum.mul(Math.pow(a,p));
 }
 // Taylor jets contain derivative/k!. Fixed degree, never one operation per
 // awarded rank. The challenge curve is analytic inside each capacity block.
 function challengeJet(g,rules){const lambda=Math.log(100)*CHALLENGE,p=rules.reward?.95:1,base=B.BN(100).pow(B.ONE.add(g.mul(CHALLENGE))),a=[];
  const cap=g.lt(64)?[B.ONE,B.ZERO,B.ZERO]:[g.sub(56).pow(2).div(64),g.sub(56).div(32),B.BN(1/64)];
  for(let k=0;k<=16;k++){let v=B.ZERO;for(let j=0;j<=Math.min(2,k);j++)v=v.add(cap[j].mul(base).mul(Math.pow(lambda,k-j)/FACT[k-j]));if(rules.d6){if(k===0)v=v.sub(g);if(k===1)v=v.sub(1);}a[k]=v;}
  const y=[a[0].pow(p)];for(let k=1;k<=16;k++){let sum=B.ZERO;for(let j=1;j<=k;j++)sum=sum.add(a[j].mul(y[k-j]).mul((p+1)*j-k));y[k]=sum.div(a[0].mul(k));}return y;
 }
 function challenge(g,n,rules){if(n.eq(0))return B.ZERO;if(n.eq(1))return rawFee(g,rules).pow(rules.reward?.95:1);
  const last=g.add(n.sub(1)),p=rules.reward?.95:1,lambda=Math.log(100)*CHALLENGE*p;
  // Drop only the exponentially negligible remote integral prefix. Its ratio
  // is below exp(-160), well below the Decimal contract; no per-rank suffix.
  const length=B.min(n.sub(1),160/lambda),left=last.sub(length),width=length.div(16);let integral=B.ZERO;
  for(let panel=0;panel<16;panel++){const mid=left.add(width.mul(panel+.5)),half=width.div(2);for(const [z,w] of gauss)integral=integral.add(rawFee(mid.add(half.mul(z)),rules).pow(p).mul(w).mul(half));}
  const lo=challengeJet(left,rules),hi=challengeJet(last,rules);let sum=integral.add(lo[0].add(hi[0]).div(2));for(const [order,c] of EM)sum=sum.add(hi[order].sub(lo[order]).mul(c*FACT[order]));return sum;
 }
 function legacyCost(origin,count,rules){let g=B.BN(origin),n=B.BN(count).floor(),total=B.ZERO;if(n.eq(0))return total;
  const cuts=[2,4,8,16,32,58,64,65];
  const add=(start,length)=>{let v=rules.challenge==='trueGraham'?challenge(start,length,rules):ordinary(start,length,rules);v=v.div(B.pow10(B.BN(rules.treeDelta??0).mul(rules.reward?.95:1)));if(rules.pricing==='base')v=v.div(multiplier(start));return v;};
  for(const end of cuts){if(g.gte(end)||n.eq(0))continue;const size=B.min(n,B.BN(end).sub(g));total=total.add(add(g,size));g=g.add(size);n=n.sub(size);}
  if(n.gt(0))total=total.add(add(g,n));return B.max(0,total);
 }
 function legacyModel(origin,rules){origin=B.BN(origin);const p=rules.reward?.95:1,first=legacyFee(origin,rules),minimum=B.BN(rules.d6?42:100).pow(p).div(B.pow10(B.BN(rules.treeDelta??0).mul(p))).div(rules.pricing==='base'?32:1),limits={maximumNewtonIterations:2,maximumNormalCosts:6,upperBound:f=>f.div(minimum).floor().add(1)};
  // Reuse the validated rank approximation's normalized EM polynomial.
  // Small singular regions retain the original segmented Decimal cost.
  if(!rules.challenge&&origin.gt(Number.MAX_SAFE_INTEGER)&&origin.lt('1e300')){
   const norm=W.Meta.RankSettlement.normalizedGModel(rules,origin),fallback=n=>legacyCost(origin,n,rules);
   const anchoredCost=n=>{const v=norm.cost(n.toNumber());return Number.isFinite(v)&&v>=0?norm.scale.mul(v):fallback(n);};
   return {...limits,key:JSON.stringify(['g-normalized-v2',String(origin),rules]),scale:norm.scale,normalized:norm,cost:anchoredCost,fee:n=>{const v=norm.fee(n.toNumber());return Number.isFinite(v)&&v>0?norm.scale.mul(v):legacyFee(origin.add(n),rules);},seed:f=>{const v=norm.seed(f.div(norm.scale).toNumber());return Number.isFinite(v)&&v>=0?B.BN(v).floor():B.max(1,origin.mul(C.expm1(C.log1p(f.div(first).mul(2*p+1).div(origin)).div(2*p+1))).floor());}};
  }
  return {...limits,key:JSON.stringify(['g-segmented',String(origin),rules]),scale:first,cost:n=>legacyCost(origin,n,rules),fee:n=>legacyFee(origin.add(n),rules),seed:f=>{
  if(f.lt(first))return B.ZERO;if(rules.challenge==='trueGraham')return B.max(1,f.div(first).ln().div(Math.log(100)*CHALLENGE*p).add(1).floor());
  const x=B.max(1,origin.sub(56));return B.max(1,x.mul(C.expm1(C.log1p(f.div(first).mul(2*p+1).div(x)).div(2*p+1))).floor());
 }};}
 // The reward is applied to each rank's D6/D4-adjusted demand, before
 // milestone pricing. Legacy contexts are retained solely to settle old anchors.
 const gated=rules=>rules.reward&&rules.rewardAboveOne!==false;
 function fee(g,rules){g=B.BN(g);const active=!gated(rules)||rawFee(g,rules).gt(B.pow10(rules.treeDelta??0));return legacyFee(g,active?rules:{...rules,reward:false});}
 function rewardCuts(rules){
  if(!gated(rules))return [];const d=B.pow10(rules.treeDelta??0),cuts=[];let root;
  if(rules.challenge==='trueGraham'){
   if(d.lt(100))return [];const lambda=Math.log(100)*CHALLENGE;
   root=B.max(0,d.ln().sub(Math.log(100)).div(lambda));let lo=B.ZERO,hi=root.add(2);
   for(let i=0;i<16;i++){
    const v=rawFee(root,rules),slope=(rules.d6?v.add(root):v).mul(B.BN(lambda).add(root.lt(64)?0:B.BN(2).div(root.sub(56)))).sub(rules.d6?1:0).div(v);
    if(v.gt(d))hi=root;else lo=root;let next=B.max(0,root.sub(v.ln().sub(d.ln()).div(slope)));if(next.eq(root))break;if(next.lte(lo)||next.gte(hi))next=lo.add(hi).div(2);root=next;
   }
  }else{
   // D6 makes G<64 non-increasing, then the capacity polynomial increases.
   if(rules.d6&&d.gte(42)&&d.lt(100))cuts.push(B.BN(100).sub(d).ceil());
   const a=25/16;
   root=rules.d6?B.BN(56+1/(2*a)).add(d.add(56+1/(4*a)).div(a).sqrt()):B.BN(56).add(d.div(a).sqrt());
   root=B.max(64,root);
  }
  let first=root.floor().add(1);
  // Decimal adjacent ranks may coincide at high magnitudes. No unbounded scan.
  for(let i=0;i<2;i++){const prev=first.sub(1);if(prev.eq(first)||prev.lt(rules.challenge?0:64)||!rawFee(prev,rules).gt(d))break;first=prev;}
  for(let i=0;i<2&&!rawFee(first,rules).gt(d);i++){const next=first.add(1);if(next.eq(first))break;first=next;}
  cuts.push(first);return cuts.filter(x=>x.gt(0)).sort((a,b)=>a.cmp(b));
 }
 function parts(origin,rules){const d=B.pow10(rules.treeDelta??0),starts=[origin,...rewardCuts(rules).filter(x=>x.gt(origin))],out=[];for(const start of starts){const active=!gated(rules)||rawFee(start,rules).gt(d),spec=active?rules:{...rules,reward:false};if(out.length&&out.at(-1).rules.reward===spec.reward)continue;if(out.length)out.at(-1).end=start;out.push({start,end:null,rules:spec});}return out;}
 function cost(origin,count,rules){origin=B.BN(origin);count=B.BN(count).floor();if(!gated(rules))return legacyCost(origin,count,rules);let total=B.ZERO,left=count;for(const part of parts(origin,rules)){if(left.lte(0))break;const size=part.end?B.min(left,part.end.sub(part.start)):left;total=total.add(legacyCost(part.start,size,part.rules));left=left.sub(size);}return total;}
 function model(origin,rules){
  origin=B.BN(origin);if(!gated(rules))return legacyModel(origin,rules);
  const pieces=parts(origin,rules).map(p=>({...p,curve:legacyModel(p.start,p.rules)}));
  if(pieces.length===1)return pieces[0].curve;
  // Prepare boundary costs once; Newton keeps the original normalized curves
  // on either side and never approximates across the reward's derivative kink.
  const spans=pieces.map(p=>p.end?p.end.sub(p.start):null),prices=pieces.map((p,i)=>spans[i]?p.curve.cost(spans[i]):null);
  const first=pieces[0].curve;
  return {...first,key:JSON.stringify(['g-reward-above-one',String(origin),rules]),
   upperBound:f=>pieces.reduce((max,p)=>B.max(max,p.curve.upperBound(f)),B.ZERO).add(pieces.at(-1).start.sub(origin)),
   cost:n=>{let left=B.BN(n),total=B.ZERO;for(let i=0;i<pieces.length&&left.gt(0);i++){const take=spans[i]?B.min(left,spans[i]):left;total=total.add(spans[i]&&take.eq(spans[i])?prices[i]:pieces[i].curve.cost(take));left=left.sub(take);}return total;},
   fee:n=>{const rank=origin.add(n),p=pieces.find(p=>!p.end||rank.lt(p.end));return p.curve.fee(rank.sub(p.start));},
   seed:f=>{let money=f,offset=B.ZERO;for(let i=0;i<pieces.length;i++){if(prices[i]&&money.gte(prices[i])){money=money.sub(prices[i]);offset=offset.add(spans[i]);}else return offset.add(pieces[i].curve.seed(money));}return offset;}
  };
 }
 W.Meta.ClosedRankCost=Object.freeze({model,cost,fee,powerSum});
}(window.WIS));
