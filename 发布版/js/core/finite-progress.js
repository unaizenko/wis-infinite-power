(function defineFiniteProgress(WIS) {
  'use strict';
  const B=WIS.Core.BigNum;
  const finite=(v,label)=>{v=B.BN(v);if(!v.isFinite())throw Error('有限进度 '+label+' 无法表示');return v;};
  function validate(p) {
    if(p?.version!==1||!finite(p.requirement,'需求').gt(0)||finite(p.remaining,'余量').lt(0))throw Error('有限进度格式无效');
    finite(p.carry,'累计');return p;
  }
  const record=(requirement,remaining,carry)=>({version:1,requirement:String(requirement),remaining:String(remaining),carry:String(carry)});
  // Cancel represented decimal words before projecting a balance. Repeating
  // Decimal subtraction to measure its own rounding error is unstable when
  // demand is huge but the stored absolute progress is small.
  function fromRemaining(requirement, words) {
    const L=WIS.Core.SignedLedger;
    const remaining=B.max(0,finite(L.value(words),'余量'));
    const carry=finite(L.value(L.strict.subtract([String(remaining)],words)),'累计');
    return record(requirement,remaining,carry);
  }
  function create(requirement,progress=0) {
    const req=finite(requirement,'需求'),gain=finite(progress,'收入');
    if(!req.gt(0)||gain.lt(0))throw Error('有限进度需求/收入无效');
    return fromRemaining(req,WIS.Core.SignedLedger.strict.subtract([String(req)],[String(gain)]));
  }
  function advance(point,gain) {
    gain=finite(gain,'收入');if(gain.lt(0))throw Error('有限进度收入为负');
    const L=WIS.Core.SignedLedger;
    const deficit=L.strict.subtract([point.remaining],[point.carry,String(gain)]);
    // Compare the signed balance before projection so a sub-ULP deficit cannot
    // turn into a free reward, and a positive excess is not rounded to zero.
    if(L.strict.sign(deficit)<=0)return {crossed:true,excess:finite(L.value(L.negate(deficit)),'累计')};
    return {crossed:false,point:fromRemaining(point.requirement,deficit)};
  }
  function accumulate(point,gain) {
    const next=advance(point,gain);
    return next.crossed?record(point.requirement,0,next.excess):next.point;
  }
  function bulk(point,gain,{level=0,cap=Infinity,settle}={}) {
    if(cap!==Infinity&&B.gte(level,cap))return {crossed:false,capped:true,point:accumulate(point,gain)};
    const next=advance(point,gain);
    return next.crossed&&settle?settle(next):next;
  }
  const value=p=>B.max(0,WIS.Core.SignedLedger.value(WIS.Core.SignedLedger.strict.normalize(
    [p.requirement,...WIS.Core.SignedLedger.negate([p.remaining]),p.carry])));
  const remaining=p=>B.max(0,WIS.Core.SignedLedger.value(WIS.Core.SignedLedger.strict.subtract([p.remaining],[p.carry])));
  // Represented batch rules shared by treasures and cultivation rewards.
  const batchError=(code,message)=>Object.assign(new Error(message),{code});
  const unresolvable=m=>m.gt(0)&&(m.add(1).eq(m)||m.sub(1).eq(m));
  function batchBoundary(m,costAt,error=batchError) {
    const next=m.add(1);
    if(unresolvable(m))throw error('batch-unit','奖励批数已无法区分相邻整数；输入保留');
    const cost=costAt(m),nextCost=costAt(next);
    if(!cost.isFinite()||!nextCost.isFinite()||!nextCost.gt(cost))throw error('batch-cost','相邻批次需求无法可靠区分；输入保留');
    return {cost,next,nextCost};
  }
  function batchCount(progress,estimate,costAt,error=batchError) {
    const p=B.BN(progress);let m=B.BN(estimate);
    if(!m.gt(0))return B.ZERO;
    for(let i=0;i<12;i++){
      const {cost,next,nextCost}=batchBoundary(m,costAt,error);
      if(cost.gt(p)){const lower=m.sub(1);if(lower.eq(m))break;m=lower;}
      else if(nextCost.lte(p))m=next;else return m;
    }
    let lo=B.ZERO,hi=m.mul(2).add(2);
    for(let i=0;i<96;i++){const mid=lo.add(hi).div(2).floor();if(mid.eq(lo)||mid.eq(hi))break;
      if(costAt(mid).lte(p))lo=mid;else hi=mid;}
    return lo;
  }
  function expm1(x) {
    x=B.BN(x);
    if(x.abs().lt('1e-5'))return x.mul(B.ONE.add(x.div(2)).add(x.pow(2).div(6)).add(x.pow(3).div(24)));
    return x.exp().sub(1);
  }
  function geometricCumulative(first,logStep,m) {
    m=B.BN(m);if(m.eq(0))return B.ZERO;if(m.eq(1))return B.BN(first);
    return B.BN(first).mul(expm1(B.mul(logStep,m))).div(expm1(logStep));
  }
  function geometricInverse(logD,logP,step,logDen) {
    if(logP.lt(logD))return B.ZERO;
    const x=logP.sub(logD).add(logDen);
    const log=x.gt(40)?x.add(x.neg().exp().add(1).ln()):x.exp().add(1).ln();
    return log.div(step).floor();
  }
  const geometric=Object.freeze({cumulative:geometricCumulative,inverse:geometricInverse,unresolvable});
  WIS.Core.FiniteProgress=Object.freeze({batchCount,batchBoundary,geometric,create,advance,accumulate,bulk,validate,value,remaining,record});
}(window.WIS));

