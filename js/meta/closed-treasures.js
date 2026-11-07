(function(W){
 'use strict';
 const B=W.Core.BigNum,C=W.Core.ClosedFormBatch,T=W.Meta.Treasures,P=W.Meta.TreasureProgress,L=W.Meta.TreasureLedger;
 const enabled=state=>state?.meta?.closedBatchModel===2;
 const finite=(v,label)=>{const n=B.parseFinite(v);if(!n||n.lt(0))throw Object.assign(Error('Invalid closed treasure '+label),{code:'closed-treasure-input'});return B.BN(n);};
 function rule(state,key){const r=W.Meta.TreasureRules[key];if(!r)throw Error('Unknown treasure');return r.immortal&&W.Cultivation.Xiuzhen.has(state,'kongJieMie')?{...r,base:B.BN(r.base).sqrt(),...(r.type==='exponential'?{q:B.BN(r.q).sqrt()}:{exponent:r.exponent/2})}:r;}
 function model(state,key,n0,award,anchor=null){const r=anchor||rule(state,key),requirement=n=>r.type==='exponential'?B.BN(r.base).mul(B.ONE.div(r.q).pow(n)):B.BN(r.base).mul(n.div(r.scale).add(1).pow(r.exponent)),first=requirement(n0);if(r.type==='exponential')return C.geometric(first,B.ONE.div(r.q).ln().mul(award));
  const scale=B.BN(r.scale),x=n0.add(scale).div(award),factor=B.BN(r.base).mul(award.div(scale).pow(r.exponent));
  const xn=x.toNumber(),native=Number.isFinite(xn)&&xn>=64;
  return {key:JSON.stringify(['treasure-power',r,String(n0),String(award)]),scale:first,normalized:native?{scale:first,cost:n=>W.Meta.RankSettlement.powerSumRatio(xn,n,r.exponent)}:null,cost:m=>m.eq(0)?B.ZERO:m.eq(1)?first:factor.mul(W.Meta.ClosedRankCost.powerSum(x,m,r.exponent)),seed:f=>P.affordableEstimateForRule(r,key,n0,f,award),fee:m=>requirement(n0.add(award.mul(m)))};
 }
 const context=(state,key,award)=>{const r=rule(state,key);return {key,type:r.type,base:String(r.base),q:r.q==null?null:String(r.q),scale:r.scale??null,exponent:r.exponent??null,award:String(award)};};
 function down(words){const A=W.Core.Amount;let x=L.value(words);if(A?.enabled()&&A.compare(A.from(x),A.fromParts(0,words))>0){const d=new DataView(new ArrayBuffer(8));d.setFloat64(0,x.mag);d.setBigUint64(0,d.getBigUint64(0)+(x.mag<0?1n:-1n));x=B.Decimal.fromComponents(x.sign,x.layer,d.getFloat64(0));if(A.compare(A.from(x),A.fromParts(0,words))>0)throw Error('Closed treasure migration cannot round down');}return B.max(0,x);}
 function adopt(state,key,award){const n=down(L.stock(state,key)).floor(),p=down(L.progress(state,key));return C.create({n0:n,context:context(state,key,award),funding:p});}
 function publish(state,key,record,count,balance){const own=v=>{const n=B.BN(v);return B.Decimal.fromComponents(n.sign,n.layer,n.mag);};const m=state.meta;(m.treasureBatch||={})[key]=record;m.treasures[key]=own(count);if(m.treasureStockResidual)delete m.treasureStockResidual[key];(m.treasureProgress||={})[key]=own(balance);(m.treasureProgressResidual||={})[key]=own(B.ZERO);if(m.treasureProgressResidualTail)delete m.treasureProgressResidualTail[key];if(m.treasureProgressFinite)delete m.treasureProgressFinite[key];if(m.treasureCredits)delete m.treasureCredits[key];}
 function atomic(state,run){const original=state.meta,next={...original};for(const k of ['treasures','treasureBatch','treasureStockResidual','treasureProgress','treasureProgressResidual','treasureProgressResidualTail','treasureProgressFinite','treasureCredits','treasureProgressPending','treasureProgressStatus','treasureQualifications'])next[k]={...(original[k]||{})};state.meta=next;try{return run();}catch(e){state.meta=original;W.Core.Effects?.invalidate?.();throw e;}}
 function ensure(state){if(!enabled(state))return;state.meta.treasureBatch||={};for(const key of T.keys)if(!state.meta.treasureBatch[key]){const award=finite(T.getTreasureAwardMultiplier(state,key),'award'),r=adopt(state,key,award);publish(state,key,r,r.n0,r.funding);}}
 function advance(state,key,units,gain,award){
  const u=finite(W.Core.Amount?.isAmount(units)?W.Core.Amount.project(units):units,'units'),g=finite(gain,'gain'),a=finite(award,'award');if(!a.gt(0)||!a.floor().eq(a))throw Error('Invalid treasure award');
  return atomic(state,()=>{
   ensure(state);const start=B.BN(state.meta.treasures[key]||0);let n=start,r=C.read(state.meta.treasureBatch[key]),balance=finite(state.meta.treasureProgress[key]||0,'balance'),discarded=B.ZERO,discardedCount=0,unabsorbedSignificant=0;
   const settle=()=>{const x=C.solve(r,model(state,key,r.n0,B.BN(r.context.award),r.context),{previous:n});n=x.count;balance=x.balance;return x;};
   const rows=[];for(const row of P.Pending.inputs(state.meta.treasureProgressPending[key]||[]))rows.push({units:down(row.units),gain:finite(row.gain,'pending gain'),award:finite(row.award??a,'pending award')});if(u.gt(0)&&g.gt(0))rows.push({units:u,gain:g,award:a});
   settle();
   for(const row of rows){
    const spec=context(state,key,row.award);
    if(Object.keys(spec).some(k=>String(spec[k])!==String(r.context[k]))){r=C.create({n0:n,context:spec,funding:balance,acc:r.acc});}
    const demand=P.requirement(key,n,state);let income;
    if(row.gain.lt(demand)){income=row.gain.mul(row.units);const x=C.credit(r,income);r=x.record;discarded=discarded.add(x.discardedCoordinate);discardedCount+=x.discardedCount;unabsorbedSignificant+=x.unabsorbedSignificant;settle();continue;}
    // Integrate source units across a capped interval in reward-credit units.
    // Each consumed unit pays the requirement at that interval's count.
    const cr=rule(state,key),capN=cr.type==='exponential'?row.gain.div(cr.base).ln().div(B.ONE.div(cr.q).ln()):row.gain.div(cr.base).pow(1/cr.exponent).sub(1).mul(cr.scale);
    const cap=B.max(0,capN.sub(n).div(row.award).floor().add(1)),credits=balance.div(demand).add(row.units),m=B.min(credits.floor(),cap),next=n.add(row.award.mul(m));
    if(m.gt(0)&&next.eq(n)){const x=C.credit(r,row.units.mul(demand));r=x.record;discarded=discarded.add(x.discardedCoordinate);discardedCount+=x.discardedCount;unabsorbedSignificant+=x.unabsorbedSignificant;settle();continue;}
    const rest=credits.sub(m).mul(B.min(row.gain,P.requirement(key,next,state))),curve=model(state,key,r.n0,row.award,r.context),total=next.sub(r.n0).div(row.award).ceil(),target=curve.cost(total).add(rest);
    income=B.max(0,target.sub(r.funding));const x=C.credit(r,income);r=x.record;discarded=discarded.add(x.discardedCoordinate);discardedCount+=x.discardedCount;unabsorbedSignificant+=x.unabsorbedSignificant;settle();
   }
   publish(state,key,r,n,balance);state.meta.treasureProgressPending[key]=[];state.meta.treasureProgressStatus[key]={state:'limited',code:'closed-form-batch',discardedCoordinate:String(discarded),discardedCount,unabsorbedSignificant};
   const gained=n.sub(start);if(gained.gt(0)){W.Core.Effects?.invalidate?.();P.rememberQualifications(state);}return gained;
  });
 }
 function write(state,key,words,isStock=false){const main=down(words),r=C.read(state.meta.treasureBatch[key]);if(isStock){if(!main.floor().eq(main))throw Error('Noninteger closed stock');publish(state,key,C.create({n0:main,context:r.context,funding:state.meta.treasureProgress[key]||0,acc:r.acc}),main,B.BN(state.meta.treasureProgress[key]||0));}else publish(state,key,C.create({n0:B.BN(state.meta.treasures[key]),context:r.context,funding:main,acc:0}),B.BN(state.meta.treasures[key]),main);}
 function external(state,key,amount,award,spend){W.Core.Runtime.assertMutable();if(!T.isTreasure(key))throw Error('Unknown treasure');const a=finite(W.Core.Amount?.isAmount(amount)?W.Core.Amount.project(amount):amount,'external amount');if(!a.floor().eq(a))throw Error('Noninteger external treasure amount');return atomic(state,()=>{ensure(state);const r=C.read(state.meta.treasureBatch[key]),old=B.BN(state.meta.treasures[key]),delta=a.mul(award),next=spend?old.sub(delta):old.add(delta);if(spend&&(delta.eq(0)||next.lt(0)||next.eq(old)))return false;const balance=B.BN(state.meta.treasureProgress[key]||0);publish(state,key,C.create({n0:next,context:r.context,funding:balance,acc:r.acc}),next,balance);W.Core.Effects?.invalidate?.();P.rememberQualifications(state);return spend?true:next.sub(old);});}
 function validate(state){for(const key of T.keys){const stored=state.meta.treasureBatch?.[key];if(!stored)continue;const r=C.read(stored);const n=B.BN(state.meta.treasures[key]),award=B.BN(r.context.award);if(n.lt(r.n0)||!n.floor().eq(n)||!award.gt(0)||state.meta.treasureStockResidual?.[key]?.length||state.meta.treasureProgressFinite?.[key])throw Error('Invalid closed treasure ownership');const cost=model(state,key,r.n0,award,r.context).cost(n.sub(r.n0).div(award).ceil());if(C.compareFunds(r,cost)<0)throw Error('Closed treasure unpaid inventory');}}
 W.Meta.ClosedTreasures=Object.freeze({enabled,model,advance,ensure,adopt,down,external,write,validate});
}(window.WIS));
