(function defineFiniteProgress(WIS) {
  'use strict';
  const B=WIS.Core.BigNum;
  const finite=(v,label)=>{v=B.BN(v);if(!v.isFinite())throw Error('有限进度 '+label+' 无法表示');return v;};
  function validate(p) {
    if(p?.version!==1||!finite(p.requirement,'需求').gt(0)||finite(p.remaining,'余量').lt(0))throw Error('有限进度格式无效');
    finite(p.carry,'累计');return p;
  }
  const record=(requirement,remaining,carry)=>({version:1,requirement:String(requirement),remaining:String(remaining),carry:String(carry)});
  function create(requirement,progress=0) {
    const req=finite(requirement,'需求'),gain=finite(progress,'收入');
    if(!req.gt(0)||gain.lt(0))throw Error('有限进度需求/收入无效');
    const remaining=B.max(0,B.sub(req,gain));
    return record(req,remaining,B.sub(gain,B.sub(req,remaining)));
  }
  function advance(point,gain) {
    const req=B.BN(point.requirement),left=B.BN(point.remaining);
    gain=finite(gain,'收入');if(gain.lt(0))throw Error('有限进度收入为负');
    const pending=finite(B.add(point.carry,gain),'累计');
    if(pending.gte(left))return {crossed:true,excess:B.sub(pending,left)};
    const remaining=finite(B.sub(left,pending),'余量');
    // One compensation value retains sub-ULP inputs and rounding in either
    // direction. It is never a list of historical terms. No per-input epsilon
    // is forgiven, avoiding a bias proportional to input count.
    const carry=B.sub(pending,B.sub(left,remaining));
    return {crossed:false,point:record(req,remaining,carry)};
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
  const value=p=>B.max(0,B.add(B.sub(p.requirement,p.remaining),p.carry));
  const remaining=p=>B.max(0,B.sub(p.remaining,p.carry));
  WIS.Core.FiniteProgress=Object.freeze({create,advance,accumulate,bulk,validate,value,remaining,record});
}(window.WIS));

