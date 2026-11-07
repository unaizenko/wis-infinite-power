(function(W){
 'use strict';
 const B=W.Core.BigNum, EPS2=Math.pow(2,-104),EPS=Number.EPSILON;
 const solveDiagnostics={calls:0,costCalls:0,maxCostCalls:0,newton:0,binary:0,correction:0,budgetExhausted:0};
 const creditDiagnostics={calls:0,discardedCount:0,discardedCoordinate:B.ZERO,unabsorbedSignificant:0};
 const error=message=>{throw Object.assign(Error(message),{code:'closed-form-batch'});};
 const decimal=(value,label='value')=>{const n=B.parseFinite(value);if(!n)error('Invalid '+label);return B.Decimal.fromComponents(n.sign,n.layer,n.mag);};
 const positive=(value,label)=>{const n=decimal(value,label);if(n.lt(0))error('Negative '+label);return n;};
 function copy(value){if(B.isDecimal(value))return decimal(value);if(Array.isArray(value))return value.map(copy);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copy(v)]));return value;}
 function create({n0=0,context={},funding=0,acc=0}={}){const n=positive(n0,'anchor');if(!n.floor().eq(n))error('Noninteger anchor');return {kind:'wis-closed-batch',version:1,n0:n,context:copy(context),funding:positive(funding,'funding'),acc:decimal(acc,'acc')};}
 function read(record){if(record?.kind!=='wis-closed-batch'||record.version!==1)error('Unknown closed batch record');return create(record);}
 // Exact floating expansion for comparison of finite layer-zero operands.
 // It compares the stored binary values, not their original decimal text.
 function twoSum(a,b){const s=a+b,v=s-a;return [s,(a-(s-v))+(b-v)];}
 function expansionSign(values){let expansion=[];for(const value of values){let carry=value,next=[];for(const term of expansion){const [s,e]=twoSum(carry,term);if(e!==0)next.push(e);carry=s;}if(carry!==0)next.push(carry);expansion=next;}return expansion.length?Math.sign(expansion[expansion.length-1]):0;}
 function compareFunds(record,cost){const c=positive(cost,'cost');if(record.funding.layer===0&&record.acc.layer===0&&c.layer===0)return expansionSign([record.funding.toNumber(),record.acc.toNumber(),-c.toNumber()]);return record.funding.cmp(c);}
 // Significance is measured in the stored coordinate, before rounded F+i.
 function coordinateSignificance(income,funding){const i=positive(income,'income'),f=positive(funding,'funding');if(i.eq(0))return B.ZERO;if(f.eq(0))return B.ONE;
  if(f.layer===0)return i.div(f);
  let coordinate=f.log10(),delta=log1p(i.div(f)).div(Math.LN10);
  for(let layer=1;layer<f.layer;layer++){
   if(coordinate.eq(0)||coordinate.lt(0)&&delta.gte(coordinate.abs()))return B.ONE;
   delta=log1p(delta.div(coordinate)).div(Math.LN10);coordinate=coordinate.abs().log10();
  }
  return coordinate.eq(0)?B.ONE:delta.abs().div(coordinate.abs());
 }
 function belowThreshold(income,funding){return !positive(funding,'funding').eq(0)&&coordinateSignificance(income,funding).lt(B.BN(funding).layer>=2?EPS:EPS2);}
 function credit(record,income){const r=read(record),i=positive(income,'income');
  creditDiagnostics.calls++;
  const receipt=(merged=false,discardedCount=0,discardedCoordinate=B.ZERO,unabsorbedSignificant=0)=>{creditDiagnostics.discardedCount+=discardedCount;creditDiagnostics.discardedCoordinate=creditDiagnostics.discardedCoordinate.add(discardedCoordinate);creditDiagnostics.unabsorbedSignificant+=unabsorbedSignificant;return {record:r,merged,discardedCount,discardedCoordinate,unabsorbedSignificant};};
  if(i.eq(0))return receipt();
  const acc=r.acc.add(i);
  if(acc.eq(r.acc)){
   const delta=coordinateSignificance(i,r.funding),allowed=delta.lt(r.funding.layer>=2?EPS:EPS2);
   // A representational plateau is diagnostic, never a settlement exception.
   // Keep the existing anchor and funding; diagnostics never credit money.
   return receipt(false,allowed?1:0,allowed?delta:B.ZERO,allowed?0:1);
  }
  const next=r.funding.add(acc);if(!next.isFinite())error('Funding overflow');
  if(!next.eq(r.funding)){r.acc=r.funding.sub(next).add(acc);r.funding=next;return receipt(true);}
  r.acc=acc;return receipt();
 }
 function log1p(x){x=decimal(x);if(x.lte(-1))error('log1p domain');if(x.abs().lt('1e-5'))return x.mul(B.ONE.sub(x.div(2)).add(x.pow(2).div(3)).sub(x.pow(3).div(4)).add(x.pow(4).div(5)));return x.add(1).ln();}
 function expm1(x){x=decimal(x);if(x.abs().lt('1e-5'))return x.mul(B.ONE.add(x.div(2)).add(x.pow(2).div(6)).add(x.pow(3).div(24)).add(x.pow(4).div(120)));return x.exp().sub(1);}
 function geometric(first,logStep){first=positive(first,'first cost');logStep=positive(logStep,'log ratio');const ratio=logStep.exp(),den=logStep.lt('1e-5')?expm1(logStep):ratio.sub(1);
  return {key:JSON.stringify(['geometric',String(first),String(logStep)]),scale:first,logStep,cost(m){m=positive(m,'batches');if(m.eq(0))return B.ZERO;if(m.eq(1))return first;if(logStep.eq(0))return first.mul(m);const nativePower=ratio.layer===0&&m.layer===0&&m.lte(32)?Math.pow(ratio.toNumber(),m.toNumber()):NaN;const power=Number.isFinite(nativePower)?B.BN(nativePower):ratio.pow(m);return first.mul(logStep.lt('1e-5')?expm1(logStep.mul(m)):power.sub(1)).div(den);},
   seed(f){if(first.eq(0)||f.lt(first))return B.ZERO;if(logStep.eq(0))return f.div(first).floor();const x=f.ln().sub(first.ln()).add(den.ln());const l=x.gt(40)?x.add(log1p(x.neg().exp())):log1p(x.exp());return l.div(logStep).floor();},
   fee(m){return first.mul(logStep.mul(m).exp());}};
 }
 function solve(record,model,options={}){
  const r=read(record),previous=options.previous??r.n0,limit=options.limit??null;
  const key=JSON.stringify([r,String(previous),limit==null?null:String(limit),model.key??null]);
  // Only private arithmetic is suspended. Domain adapters publish after this
  // task returns; candidate cancellation owns the task and all memo entries.
  if(model.key)return W.Core.CertifiedRankMath.task('closed-solve|'+key,()=>solveSteps(r,model,{previous,limit}));
  const it=solveSteps(r,model,{previous,limit});let n=it.next();while(!n.done)n=it.next(typeof n.value==='function'?n.value():undefined);return n.value;
 }
 function* solveSteps(r,model,{previous,limit}){
  const a=positive(r.context.award??1,'award'),prev=positive(previous,'previous count');if(!a.gt(0))error('Zero award');
  const origin=r.n0,old=B.max(0,prev.sub(origin).div(a).ceil());if(prev.lt(origin))error('External count change requires reanchor');
  const cap=limit==null?null:old.add(positive(limit,'limit').floor()),funds=r.funding,memo=new Map();let calls=0,newton=0,binary=0,correction=0,fallback=false;
  function* cost(m){const key=String(m);if(memo.has(key))return memo.get(key);calls++;const c=yield ()=>positive(model.cost(m),'cost');memo.set(key,c);return c;}
  const paid=yield* cost(old);if(compareFunds(r,paid)<0)error('Published count exceeds funding');
  const adjacent=(v,up)=>{if(v.layer===0&&v.lt(1e12))return v.add(up?1:-1).floor();const bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,v.mag);bits.setBigUint64(0,bits.getBigUint64(0)+((v.mag>=0)===up?1n:-1n));return B.Decimal.fromComponents(v.sign,v.layer,bits.getFloat64(0)).floor();};
  const representation=m=>{const count=m.lte(old)?prev:B.max(prev,origin.add(a.mul(m))).floor(),batches=count.eq(prev)?old:B.max(old,count.sub(origin).div(a).ceil());return {count:batches.lte(old)?prev:count,m:batches};};
  function output(candidate,spent){solveDiagnostics.calls++;solveDiagnostics.costCalls+=calls;solveDiagnostics.maxCostCalls=Math.max(solveDiagnostics.maxCostCalls,calls);solveDiagnostics.newton+=newton;solveDiagnostics.binary+=binary;solveDiagnostics.correction+=correction;if(fallback)solveDiagnostics.fallbacks=(solveDiagnostics.fallbacks||0)+1;
   return {record:r,batches:candidate.m,count:candidate.count,gained:candidate.count.sub(prev),spent,balance:B.max(0,funds.sub(spent)),acc:r.acc,diagnostics:{costCalls:calls,newton,binary,correction,fallback}};
  }
  const original={count:prev,m:old};if(cap!==null&&cap.lte(old))return output(original,paid);
  const first=yield* cost(old.add(1));if(first.eq(0)||compareFunds(r,first)<0)return output(original,paid);
  const scale=positive(model.scale??first,'scale');let m=B.max(old,positive(model.seed(funds),'estimate').floor());if(cap!==null)m=B.min(m,cap);
  let lo=old,hi=null,converged=false;
  // The Newton evaluations and the final payment check call the SAME Decimal
  // function, bound to the SAME scale and origin. No second fee convention.
  for(let j=0;j<(model.maximumNewtonIterations??16);j++){
   newton++;const c=yield* cost(m),cmp=compareFunds(r,c);if(cmp>=0)lo=B.max(lo,m);else hi=hi===null?m:B.min(hi,m);
   if(cmp===0){converged=true;break;}
   const slope=model.fee?yield ()=>positive(model.fee(m),'slope'):null;if(!slope?.gt(0))break;
   let step;const cn=c.div(scale).toNumber(),fn=funds.div(scale).toNumber(),sn=slope.div(scale).toNumber();
   if(Number.isFinite(cn)&&Number.isFinite(fn)&&Number.isFinite(sn)&&sn>0)step=B.BN((cn-fn)/sn);
   else if(model.logStep?.gt(0))step=c.ln().sub(funds.ln()).div(model.logStep);
   else step=c.ln().sub(funds.ln()).mul(c.div(slope));
   if(!step.isFinite())break;let next=B.max(old,m.sub(step).floor());if(cap!==null)next=B.min(next,cap);
   if(next.eq(m)||step.abs().lte(B.max(1,m.abs().mul(1e-15)))){m=next;converged=true;break;}
   m=next;
  }
  // Correct representable published counts, not unobservable batch ULPs at a
  // huge anchor. Two steps in either direction; no bisection after convergence.
  fallback=!converged;
  const remaining=()=>fallback||calls<(model.maximumNormalCosts??Infinity);
  let candidate=representation(m),spent=yield* cost(candidate.m);
  for(let j=0;j<2&&remaining()&&(compareFunds(r,spent)<0||cap!==null&&candidate.m.gt(cap));j++){
   correction++;candidate=representation(B.max(old,adjacent(candidate.count,false).sub(origin).div(a).floor()));spent=yield* cost(candidate.m);
  }
  if(compareFunds(r,spent)>=0&&(cap===null||candidate.m.lte(cap))){
   for(let j=0;j<2&&remaining();j++){
    const next=candidate.m.add(1);if(next.eq(candidate.m)||cap!==null&&next.gt(cap))break;
    const proposed=representation(next);if(proposed.count.eq(candidate.count)||cap!==null&&proposed.m.gt(cap))break;
    const nc=yield* cost(proposed.m);if(nc.eq(spent)||compareFunds(r,nc)<0)break;
    correction++;candidate=proposed;spent=nc;
   }
   if(converged)return output(candidate,spent);
   lo=B.max(lo,candidate.m);
  }else if(converged)return output(original,paid);
  fallback=true;
  // Newton nonconvergence only. Never expand an upper bound; use its observed
  // bracket or an explicit cap. A fallback is always counted and reported.
  if(hi===null&&model.upperBound){const upper=B.max(lo,positive(model.upperBound(funds),'upper bound'));if(upper.gt(lo)){const c=yield* cost(upper);if(compareFunds(r,c)<0)hi=upper;}}
  if(hi===null&&cap!==null&&cap.gt(lo)){const c=yield* cost(cap);if(compareFunds(r,c)>=0){candidate=representation(cap);spent=yield* cost(candidate.m);if(compareFunds(r,spent)>=0&&candidate.m.lte(cap))return output(candidate,spent);}hi=cap;}
  if(hi!==null)for(let j=0;j<64;j++){const mid=lo.add(hi).div(2).floor();if(mid.eq(lo)||mid.eq(hi))break;binary++;if(compareFunds(r,yield* cost(mid))>=0)lo=mid;else hi=mid;}
  candidate=representation(lo);spent=yield* cost(candidate.m);
  for(let j=0;j<2&&(compareFunds(r,spent)<0||cap!==null&&candidate.m.gt(cap));j++){candidate=representation(B.max(old,adjacent(candidate.count,false).sub(origin).div(a).floor()));spent=yield* cost(candidate.m);}
  return compareFunds(r,spent)>=0&&(cap===null||candidate.m.lte(cap))?output(candidate,spent):output(original,paid);
 }
 function reanchor(record,result,context=record.context){const r=read(record);if(result.batches.eq(0))return r;if(!result.gained.gte(0)||compareFunds(r,result.spent)<0)error('Invalid reanchor');return create({n0:result.count,context,funding:B.max(0,r.funding.sub(result.spent)),acc:r.acc});}
 W.Core.ClosedFormBatch=Object.freeze({diagnostics:()=>({...creditDiagnostics,discardedCoordinate:String(creditDiagnostics.discardedCoordinate),solve:{...solveDiagnostics}}),create,read,credit,solve,reanchor,compareFunds,belowThreshold,coordinateSignificance,twoSum,log1p,expm1,geometric});
}(window.WIS));
