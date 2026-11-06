(function(W){
 'use strict';
 const B=W.Core.BigNum,C=W.Core.ClosedFormBatch,P=W.Cultivation.ExplorationProgress,F=W.Core.FiniteProgress;
 const decimal=x=>W.Core.Amount?.isAmount(x)?W.Core.Amount.project(x):Array.isArray(x)?W.Core.AmountLedger.value(x):B.BN(x);
 const demand=n=>n.lt(10)?B.BN(10).mul(B.ONE.div(.65).pow(n)):B.BN(2000).mul(B.ONE.div(.6).pow(n.sub(10)));
 const curve=r=>C.geometric(demand(r.n0),B.ONE.div(r.context.region===0?.65:.6).ln());
 function point(level,balance){const req=demand(level);return {version:1,requirement:String(req),remaining:String(B.max(0,req.sub(balance))),carry:String(B.max(0,balance.sub(req))),residual:[]};}
 function natural(s,amount,frozen){const before=s.explorationRewards,oldLevel=s.naturalTreasureLevel;try{
  const p=P.ensure(s),cap=decimal(frozen?.cap||P.capWords(s)),start=decimal(s.naturalTreasureLevel);
  if(!(frozen?.eligible??s.goldenCoreUnlocked)||start.gte(cap))return B.ZERO;
  let r=p.naturalBatch?C.read(p.naturalBatch):C.create({n0:start,context:{region:start.lt(10)?0:1,award:1},funding:W.Meta.ClosedTreasures.down(W.Core.Amount.words(F.quantity(p.natural)))});
  r=C.credit(r,decimal(amount)).record;let level=start,balance=r.funding;
  for(let region=0;region<2;region++){
   const end=r.context.region===0?B.min(cap,10):cap,x=C.solve(r,curve(r),{previous:level,limit:B.max(0,end.sub(level))});level=x.count;balance=x.balance;
   if(level.gte(10)&&r.context.region===0&&cap.gt(10)){r=C.reanchor(r,x,{region:1,award:1});continue;}break;
  }
  s.naturalTreasureLevel=level;s.explorationRewards={...p,naturalBatch:r,natural:point(level,balance),levelResidual:[],approximation:{code:'closed-form-batch',exactRemainder:false}};
  const gain=level.sub(start);if(gain.gt(0))W.Core.Effects?.invalidate?.();return gain;
 }catch(e){s.explorationRewards=before;s.naturalTreasureLevel=oldLevel;W.Core.Effects?.invalidate?.();throw e;}}
 function balance(p,level){if(!p.naturalBatch)return F.value(p.natural);const r=C.read(p.naturalBatch);return B.max(0,r.funding.sub(curve(r).cost(decimal(level).sub(r.n0))));}
 W.Cultivation.ClosedNatural=Object.freeze({natural,balance,demand,curve,point});
}(window.WIS));
