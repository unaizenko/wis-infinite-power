(function defineAmountFormulas(W){
 'use strict';
 // A shorter directed enclosure may certify the same scalar/sign result.
 // Ambiguous bounds refine through the unchanged80..512 ladder; stored
 // tail coefficients keep their separate80-place minimum and policy.
 // Nonlinear results are confirmed at the existing Decimal precision. Complete
 // balances enter the proof; projection is never an implicit input conversion.
 const A=W.Core.Amount,B=W.Core.BigNum,L=W.Core.AmountLedger,C=W.Core.CertifiedRankMath;
 if(!A||!L||!C)throw Object.assign(Error('AmountFormulas requires Amount, AmountLedger and CertifiedRankMath'),{code:'amount-dependency'});
 const fail=(message,code='amount-formula-unresolved')=>{throw Object.assign(Error(message),{code});};
 const abs=n=>n<0n?-n:n,neg=a=>({lo:-a.hi,hi:-a.lo,openLo:!!a.openHi,openHi:!!a.openLo});
 const addLog=(a,b,c)=>({...c.add(a,b),openLo:!!(a.openLo||b.openLo),openHi:!!(a.openHi||b.openHi)});
 const subtractLog=(a,b,c)=>({...c.sub(a,b),openLo:!!(a.openLo||b.openHi),openHi:!!(a.openHi||b.openLo)});
 const scaleLog=(a,n,d,c)=>({...c.times(a,n,d),openLo:!!(n>0n&&a.openLo||n<0n&&a.openHi),openHi:!!(n>0n&&a.openHi||n<0n&&a.openLo)});
 function decimal(text){const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);if(!m)return null;return {n:BigInt(m[1]+m[2]+(m[3]||'')),e:BigInt(m[4]||0)-BigInt((m[3]||'').length)};}
 function rational(text){const a=decimal(String(text));if(!a||abs(a.e)>2048n)fail('formula coordinate capacity');return a.e<0n?{n:a.n,d:10n**(-a.e)}:{n:a.n*10n**a.e,d:1n};}
 function wordLog(raw,c){return W.Core.AmountProducts.numericLog(c,'word|'+raw,()=>wordLogSteps(raw,c));}
 function* wordLogSteps(raw,c){const m=/^(.*?)(?:\*([1-9]\d*))?$/.exec(raw),d=decimal(m[1]),count=BigInt(m[2]||1);let log,negative;
  if(d){if(!d.n)return null;negative=d.n<0n;const coefficient=String(abs(d.n)*count);if(/^10*$/.test(coefficient))return {log:c.fraction(d.e+BigInt(coefficient.length-1)),negative};const ln=yield ()=>c.logFraction(abs(d.n)*count,1n),ln10=yield ()=>c.logFraction(10n,1n);log=c.add(c.fraction(d.e),c.div(ln,ln10));}
  else {const value=B.BN(m[1]);if(value.layer!==2||Math.abs(value.mag)>2048)throw Object.assign(Error('tower logarithm outside certified coordinate capacity'),{code:'amount-formula-unresolved',capacity:true});const coordinate=rational(Math.abs(value.mag));log=yield ()=>W.Core.AmountProducts.coordinatePower10(c,c.fraction(coordinate.n,coordinate.d));if(value.mag<0)log=neg(log);negative=value.sign<0;
   if(count!==1n){const ln=yield ()=>c.logFraction(count,1n),ln10=yield ()=>c.logFraction(10n,1n);log=c.add(log,c.div(ln,ln10));}}
  return {log,negative};
 }
 // Integer enclosures are sufficient to dismiss a remote term from a
 // fixed-precision nonlinear proof. The stored quantity itself is untouched.
 function roughWordLog(raw){
  const m=/^(.*?)(?:\*([1-9]\d*))?$/.exec(raw),d=decimal(m[1]),count=BigInt(m[2]||1);
  if(d){if(!d.n)return null;const digits=String(abs(d.n)*count).length;return {lo:d.e+BigInt(digits-1),hi:d.e+BigInt(digits),negative:d.n<0n};}
  const value=B.BN(m[1]);if(value.layer!==2||Math.abs(value.mag)>2048)return null;
  const k=Math.floor(Math.abs(value.mag)),low=10n**BigInt(k),high=10n**BigInt(k+1),digits=String(count).length;
  return {lo:(value.mag<0?-high:low)+BigInt(digits-1),hi:(value.mag<0?-low:high)+BigInt(digits),negative:value.sign<0};
 }
 function logarithm(value,c){return C.task('amount-log|'+c.places+'|'+formulaIdentity(value),()=>logSteps(value,c));}
 function* logSteps(value,c){
  if(L.hasProduct?.(A.wordView(value))||L.hasRatio?.(A.wordView(value)))return yield ()=>L.productLogarithm(A.wordView(value),c);

  const rawWords=[...L.expand(A.wordView(value))],bounds=rawWords.map(roughWordLog);let anchor=0;
  for(let i=1;i<bounds.length;i++)if(bounds[i]&&(!bounds[anchor]||bounds[i].lo>bounds[anchor].lo))anchor=i;
  const anchorRow=rawWords.length?yield ()=>wordLog(rawWords[anchor],c):null,rows=[];
  for(let i=0;i<rawWords.length;i++){
   const rough=bounds[i];let row;
   if(rough&&anchorRow&&(rough.hi+BigInt(c.places+4))*c.scale<anchorRow.log.lo)row={negative:rough.negative,skipped:true};
   else row=i===anchor?anchorRow:yield ()=>wordLog(rawWords[i],c);
   if(row)rows.push({...row,raw:rawWords[i]});yield;
  }if(!rows.length)fail('logarithm of zero','amount-formula-domain');
  // Normalize against an actual term, whose relative contribution is exactly
  // one. No integer rounding of a gigantic absolute logarithm is required.
  const anchorValue=rows.filter(row=>!row.skipped).reduce((best,row)=>!best||row.log.lo>best.log.lo?row:best,null),origin=anchorValue.log,cutoff=c.fraction(-BigInt(c.places+2));
  let sum=c.fraction(0n);
  for(const row of rows){const delta=row.skipped?null:c.sub(row.log,origin),part=row===anchorValue?c.fraction(1n):row.skipped||delta.hi<cutoff.lo?{lo:0n,hi:1n}:yield ()=>c.pow10(delta);sum=row.negative?c.sub(sum,part):c.add(sum,part);yield;}
  if(sum.lo<=0n)fail('formula sum needs further refinement');const ln=yield ()=>c.ln(sum),ln10=yield ()=>c.logFraction(10n,1n),out=c.add(origin,c.div(ln,ln10));
  if(!anchorValue.negative&&(out.lo===origin.lo||out.hi===origin.hi)){const rest=rows.filter(row=>row!==anchorValue).map(row=>row.raw);const direction=yield ()=>L.sign(rest);if(direction>0&&out.lo===origin.lo)out.openLo=true;if(direction<0&&out.hi===origin.hi)out.openHi=true;}return out;
 }
 function* fromLog(log,c,sign=1){
  if(log.lo>=-17n*c.scale&&log.hi<=17n*c.scale){const v=yield ()=>c.pow10(log),number=c.roundScalarComponent(v);if(number>0&&number>=1/9e15&&number<9e15)return B.Decimal.fromComponents_noNormalize(sign,0,number);}
  const magnitude=c.roundLayerOneExponent(log);if(Number.isFinite(magnitude)&&Math.abs(magnitude)<9e15)return B.Decimal.fromComponents(sign,1,magnitude);
  if(log.lo<=0n&&log.hi>=0n)fail('formula exponent sign unresolved');const negative=log.hi<0n,positive=negative?neg(log):log,ln=yield ()=>c.ln(positive),ln10=yield ()=>c.logFraction(10n,1n),upper=c.round(c.div(ln,ln10));return B.Decimal.fromComponents(sign,2,negative?-upper:upper);
 }
 function* fromInterval(value,c){if(value.lo===0n&&value.hi===0n)return B.ZERO;if(value.lo<=0n&&value.hi>=0n)fail('formula result sign unresolved');const negative=value.hi<0n,positive=negative?neg(value):value;
  const number=c.roundScalarComponent(value);if(Number.isFinite(number)&&number!==0&&Math.abs(number)>=1/9e15&&Math.abs(number)<9e15)return B.BN(number);
  const ln=yield ()=>c.ln(positive),ln10=yield ()=>c.logFraction(10n,1n);return yield* fromLog(c.div(ln,ln10),c,negative?-1:1);
 }
 // Canonical words collect equal monomials and exact finite carries. A
 // Decimal atom normalizes to at most one word; a reduced multiword value
 // cannot have an empty compensating tail. Do not project it to ask that.
 const hasTail=value=>A.wordView(value).length>1||value.tail.length>0;
 function capturedExponent(value){if(typeof value==='number'||typeof value==='string')return value;if(B.isDecimal(value))return Object.freeze(B.Decimal.fromComponents_noNormalize(value.sign,value.layer,value.mag));fail('formula exponent must be numeric','amount-formula-domain');}
 function capture(operation,args){
  if(operation==='productPower'){const exponent=capturedExponent(args[1]),q=typeof exponent==='number'?C.binaryFraction(exponent):rational(String(exponent));if(q.n<0n)fail('negative power unsupported','amount-formula-domain');return {operation,numerators:args[0].map(A.from),denominators:[],exponent,q};}
  if(operation==='power'||operation==='powerRatio'||operation==='powerOnePlusRatio'||operation==='powerOnePlusMinusOne'){const exponent=capturedExponent(args[1]),q=typeof exponent==='number'?C.binaryFraction(exponent):rational(String(exponent));let a=abs(q.n),b=q.d;while(b){const t=a%b;a=b;b=t;}q.n/=a||1n;q.d/=a||1n;if(q.n<0n)fail('negative power unsupported','amount-formula-domain');return {operation,value:A.from(args[0]),exponent,q,divisor:operation==='powerRatio'||operation==='powerOnePlusRatio'?A.from(args[2]):A.from(1)};}
  if(operation==='powerIncrement'){const exponent=capturedExponent(args[2]),q=typeof exponent==='number'?C.binaryFraction(exponent):rational(String(exponent));return {operation,value:A.from(args[0]),delta:A.from(args[1]),exponent,q};}
  if(operation==='powerWithExponent')return {operation,value:A.from(args[0]),exponentValue:A.from(args[1])};
  if(operation==='log10')return {operation,value:A.from(args[0])};
  if(operation==='logOnePlusRatio'||operation==='logRatio')return {operation,value:A.from(args[0]),divisor:A.from(args[1])};
  if(operation==='productQuotient')return {operation,numerators:args[0].map(A.from),denominators:(args[1]||[]).map(A.from)};
  fail('unknown formula operation','amount-formula-domain');
 }
 function formulaIdentity(value,ownerMemo){return W.Core.AmountProducts.numericIdentity('amount-inputs',value,()=>W.Core.AmountProducts.inputKey(A.wordView(value))??JSON.stringify(A.wordView(value)),ownerMemo);}
 function evaluate(input){return C.withWork(()=>evaluateInWork(input));}
 function evaluateInWork(input){
  // Formula results are pure immutable components. A rank owner spans the
  // candidate's source and later proof works; every full input has a strict
  // owner-local identity. Task keys keep their separate proof-owner identity,
  // so independent nested rank owners cannot alias inside one suspended work.
  const identities=W.Core.RankExact.memo('amount-formula-input-identities'),encode=owner=>JSON.stringify([W.Core.Runtime?.getMathPolicy?.(),B.coordinateArithmetic.active(),A.enabled(),input],(_,v)=>typeof v==='bigint'?String(v):A.isAmount(v)?{quantityIdentity:formulaIdentity(v,owner)}:v);
  const resultKey=encode(identities),memo=W.Core.AmountProducts.workMemo('amount-formula-results');
  if(memo?.has(resultKey)){const v=memo.get(resultKey);return Object.freeze(B.Decimal.fromComponents_noNormalize(v.sign,v.layer,v.mag));}
  const key=encode(),value=C.withWork(()=>C.task('amount-formula|'+key,()=>steps(input)));
  if(memo)memo.set(resultKey,Object.freeze({sign:value.sign,layer:value.layer,mag:value.mag}));
  return value;
 }
 function prepareSteps(input){
  let numerators,denominators;
  if(input.operation==='powerOnePlusRatio'){if(A.compare(input.divisor,0)===0)fail('division by zero','amount-formula-domain');if(input.q.n===0n||A.compare(input.value,0)===0)return {done:true,value:B.ONE};if(!hasTail(input.value)&&!hasTail(input.divisor))return {done:true,value:B.pow(B.add(1,B.div(A.project(input.value),A.project(input.divisor))),input.exponent)};const sum=A.add(input.value,input.divisor);if(!hasTail(sum)&&!hasTail(input.divisor))return {done:true,value:B.pow(B.div(A.project(sum),A.project(input.divisor)),input.exponent)};return {done:false,sum};}
  if(input.operation==='productPower'){if(!W.Core.AmountProducts.separatedPositiveProduct(input.numerators.map(A.wordView))){let value=A.from(1);for(const factor of input.numerators)value=A.multiply(value,factor);return {done:true,value:evaluate(capture('power',[value,input.exponent]))};}if(!input.q.n)return {done:true,value:B.ONE};return {done:false,numerators:input.numerators,denominators:[]};}
  if(input.operation==='powerIncrement'){
    if(input.q.n===0n||A.compare(input.delta,0)===0)return {done:true,value:B.ZERO};
    if(input.q.n===input.q.d)return {done:true,value:A.project(input.delta)};
    if(A.compare(input.value,0)===0){if(input.q.n<0n)fail('negative power at zero','amount-formula-domain');return {done:true,value:evaluate(capture('power',[input.delta,input.exponent]))};}
  }
  else if(input.operation==='powerWithExponent'){if(A.compare(input.exponentValue,0)===0||A.compare(input.value,1)===0)return {done:true,value:B.ONE};if(A.compare(input.value,0)===0)return {done:true,value:B.ZERO};if(!hasTail(input.value)&&!hasTail(input.exponentValue))return {done:true,value:B.pow(A.project(input.value),A.project(input.exponentValue))};}
  else if(input.operation==='powerOnePlusMinusOne'){if(input.q.n===0n||A.compare(input.value,0)===0)return {done:true,value:B.ZERO};if(input.q.n===input.q.d)return {done:true,value:A.project(input.value)};}
  else if(input.operation==='power'||input.operation==='powerRatio'){if(A.compare(input.divisor,0)===0)fail('division by zero','amount-formula-domain');if(input.q.n===input.q.d&&A.compare(input.divisor,1)===0)return {done:true,value:A.project(input.value)};if(input.q.n===0n)return {done:true,value:B.ONE};if(A.compare(input.value,0)===0)return {done:true,value:B.ZERO};if(!hasTail(input.value)&&!hasTail(input.divisor))return {done:true,value:B.pow(B.div(A.project(input.value),A.project(input.divisor)),input.exponent)};}
  else if(input.operation==='logRatio'){if(A.compare(input.value,0)===0||A.compare(input.divisor,0)===0)fail('log ratio requires positive operands','amount-formula-domain');if(A.compare(input.value,input.divisor)===0)return {done:true,value:B.ZERO};if(!hasTail(input.value)&&!hasTail(input.divisor))return {done:true,value:B.log10(B.div(A.project(input.value),A.project(input.divisor)))};}
  else if(input.operation==='logOnePlusRatio'){if(A.compare(input.divisor,0)===0)fail('division by zero','amount-formula-domain');if(A.compare(input.value,0)===0)return {done:true,value:B.ZERO};if(!hasTail(input.value)&&!hasTail(input.divisor)&&!B.add(1,B.div(A.project(input.value),A.project(input.divisor))).eq(1))return {done:true,value:B.log10(B.add(1,B.div(A.project(input.value),A.project(input.divisor))))};}
  else if(input.operation==='log10'){if(A.compare(input.value,0)===0)fail('logarithm of zero','amount-formula-domain');if(!hasTail(input.value))return {done:true,value:B.log10(A.project(input.value))};}
  else {numerators=input.numerators.slice();denominators=input.denominators.slice();if(denominators.some(v=>A.compare(v,0)===0))fail('division by zero','amount-formula-domain');if(numerators.some(v=>A.compare(v,0)===0))return {done:true,value:B.ZERO};
   if([...numerators,...denominators].every(v=>!hasTail(v))){let out=B.ONE;for(const v of numerators)out=B.mul(out,A.project(v));for(const v of denominators)out=B.div(out,A.project(v));return {done:true,value:out};}
   for(let i=numerators.length-1;i>=0;i--){const j=denominators.findIndex(v=>A.compare(v,numerators[i])===0);if(j>=0){numerators.splice(i,1);denominators.splice(j,1);}}
   // Exact monomial cancellation does not need a tower coordinate expansion.
   if(numerators.length===1&&denominators.length===1&&W.Core.AmountProducts.termCount(A.wordView(denominators[0]))===1){
    try{const quotient=A.divide(numerators[0],denominators[0]);if(!hasTail(quotient))return {done:true,value:A.project(quotient)};return {done:false,numerators:[quotient],denominators:[]};}catch(error){if(!['amount-unresolved','amount-formula-unresolved','rank-cost-unresolved'].includes(error.code))throw error;}
   }
   if(!denominators.length&&numerators.length===1&&!hasTail(numerators[0]))return {done:true,value:A.project(numerators[0])};if(!denominators.length&&!numerators.length)return {done:true,value:B.ONE};
  }
  return {done:false,numerators,denominators};
 }
 // For L=log10(x/d)>17, 0<log10(1+10^-L)<10^-L.
 // Enclose that correction at the existing precision, without expanding x/d
 // or x+d. If a boundary remains unresolved, the caller uses the exact sum.
 function* largeOnePlusLog(input,c){const base=yield ()=>logarithm(input.value,c),divisor=yield ()=>A.compare(input.divisor,1)===0?c.fraction(0n):logarithm(input.divisor,c),ratio=subtractLog(base,divisor,c);if(ratio.lo<=17n*c.scale)return null;const upper=ratio.lo>BigInt(c.places+2)*c.scale?1n:(yield ()=>c.pow10(neg(ratio))).hi;return {lo:ratio.lo,hi:ratio.hi+upper,openLo:true,openHi:true};}
 // Explicit high-coordinate precision policy (2026-11-07). Only a tagged
 // capacity refusal reaches here; ordinary uncertified boundaries still fail.
 const capacityCounts={calls:0,operations:{}};
 function capacityFormula(input){
  const read=v=>{const n=A.isAmount(v)?A.project(v):B.parseFinite(v);if(!n||!n.isFinite())fail('nonfinite capacity input','amount-formula-domain');return n;};
  const nonnegative=v=>{const n=read(v);if(n.lt(0))fail('negative capacity input','amount-formula-domain');return n;};
  const divide=(v,d)=>{v=nonnegative(v);d=nonnegative(d);if(d.eq(0))fail('division by zero','amount-formula-domain');return v.div(d);};
  const log1p=x=>{if(x.lte(-1))fail('log1p domain','amount-formula-domain');if(x.abs().lt('1e-20'))return x;if(x.abs().gte('1e-5'))return x.add(1).ln();let term=x,sum=x;for(let k=2;k<=12;k++){term=term.mul(x);sum=k%2?sum.add(term.div(k)):sum.sub(term.div(k));}return sum;};
  const expm1=x=>{if(x.abs().lt('1e-20'))return x;if(x.abs().gte('1e-5'))return x.exp().sub(1);let term=x,sum=x;for(let k=2;k<=12;k++){term=term.mul(x).div(k);sum=sum.add(term);}return sum;};
  const product=xs=>xs.reduce((v,x)=>v.mul(nonnegative(x)),B.ONE);
  const v=input.value==null?null:nonnegative(input.value),p=input.exponent==null?null:read(input.exponent);let result;
  switch(input.operation){
   case 'power':case 'powerRatio':result=divide(v,input.divisor).pow(p);break;
   case 'powerOnePlusRatio':result=log1p(divide(v,input.divisor)).mul(p).exp();break;
   case 'powerOnePlusMinusOne':result=expm1(log1p(v).mul(p));break;
   case 'powerIncrement':{const d=nonnegative(input.delta);
    if(p.eq(0)||d.eq(0))result=B.ZERO;else if(v.eq(0))result=d.pow(p);else{
     const ratio=d.div(v);
     // Combine the first-order increment in log space: enormous x^p and
     // tiny d/x can otherwise cancel to zero in layered Decimal arithmetic.
     if(ratio.mul(p.abs().add(1)).lt('1e-20'))result=B.pow10(v.log10().mul(p.sub(1)).add(d.log10()).add(p.abs().log10())).mul(p.sign);
     else result=v.pow(p).mul(expm1(log1p(ratio).mul(p)));
    }break;}
   case 'powerWithExponent':result=v.pow(nonnegative(input.exponentValue));break;
   case 'log10':if(v.eq(0))fail('logarithm of zero','amount-formula-domain');result=v.log10();break;
   case 'logRatio':{const x=divide(v,input.divisor);if(x.eq(0))fail('logarithm of zero','amount-formula-domain');result=x.log10();break;}
   case 'logOnePlusRatio':result=log1p(divide(v,input.divisor)).div(Math.LN10);break;
   case 'productPower':result=product(input.numerators).pow(p);break;
   case 'productQuotient':result=divide(product(input.numerators),product(input.denominators));break;
   default:fail('unsupported capacity formula','amount-formula-domain');
  }
  if(!result.isFinite()||result.isNan())fail('nonfinite capacity result','amount-formula-domain');
  capacityCounts.calls++;capacityCounts.operations[input.operation]=(capacityCounts.operations[input.operation]||0)+1;
  return B.Decimal.fromComponents_noNormalize(result.sign,result.layer,result.mag);
 }
 function* steps(input){
  // Projection and comparison can themselves suspend. Keep them in an ordinary
  // thunk so a child proof never throws through (and closes) this iterator.
  const prepared=yield ()=>prepareSteps(input);if(prepared.done)return prepared.value;
  const {numerators,denominators,sum}=prepared;let lastFailure=null;
  for(const places of (W.Core.Amount?.enabled()?[32,80,160,320,512]:[80,160,320,512])){const c=C.context(places);try{let log;
    if(input.operation==='powerWithExponent'){
      const sign=yield ()=>A.compare(input.value,1)>0?1:-1;const baseLog=yield ()=>logarithm(input.value,c),positive=sign>0?baseLog:neg(baseLog);
      if(positive.lo<=0n)fail('variable base requires further refinement');
      const logExponent=yield ()=>logarithm(input.exponentValue,c),logBaseMagnitude=yield ()=>c.log10(positive),coordinate=c.add(logExponent,logBaseMagnitude);
      // |log10(result)|<1e-20 lies strictly within the same Decimal cell at1.
      if(coordinate.hi< -20n*c.scale)return B.ONE;
      if(coordinate.hi<=17n*c.scale){const logValue=yield ()=>c.pow10(coordinate);return yield* fromLog(sign>0?logValue:neg(logValue),c);}
      const logValue=yield* fromLog(coordinate,c);return B.pow10(sign>0?logValue:logValue.neg());
    }
    if(input.operation==='powerIncrement'){
      const sign=input.q.n<0n?-1:1;
      const startLog=yield ()=>logarithm(input.value,c),deltaLog=yield ()=>logarithm(input.delta,c),ratioLog=c.sub(deltaLog,startLog),p=c.fraction(input.q.n,input.q.d),pm=c.fraction(input.q.n-input.q.d,input.q.d);
      if(ratioLog.hi< -BigInt(Math.floor(places/2))*c.scale){
        // Integral mean: Delta/(p*d*s^(p-1)) lies between 1 and
        // (1+d/s)^(p-1). Its log correction is bounded by |p-1|*d/s.
        const ratio=ratioLog.hi< -BigInt(places+2)*c.scale?{lo:0n,hi:1n}:yield ()=>c.pow10(ratioLog),bound=c.mul(pm,{lo:0n,hi:ratio.hi});
        const logP=yield ()=>c.log10(sign>0?p:neg(p));return yield* fromLog(c.add(c.add(deltaLog,c.mul(pm,startLog)),c.add(logP,bound)),c,sign);
      }
      const endLog=yield ()=>logarithm(A.add(input.value,input.delta),c),signedDifference=c.mul(p,c.sub(endLog,startLog)),difference=sign>0?signedDifference:neg(signedDifference);
      if(difference.lo<=0n)fail('power increment needs further refinement');
      if(difference.lo>17n*c.scale){const correction=difference.lo>BigInt(places+2)*c.scale?{lo:0n,hi:1n}:yield ()=>c.pow10(neg(difference)),end=c.mul(p,sign>0?endLog:startLog);return yield* fromLog({lo:end.lo-2n*correction.hi,hi:end.hi},c,sign);}
      const v=yield ()=>c.pow10(difference),incrementLog=yield ()=>c.log10(c.sub(v,c.fraction(1n)));return yield* fromLog(c.add(c.mul(p,sign>0?startLog:endLog),incrementLog),c,sign);
    }
    if(input.operation==='powerOnePlusMinusOne'){
      log=yield ()=>logarithm(A.add(input.value,1),c);log=c.times(log,input.q.n,input.q.d);
      if(log.lo>17n*c.scale){
        // log10(1-10^-L) is in [-2*10^-L,0] for L>17. Enclose
        // the subtraction before Decimal rounding; do not expand 10^L.
        const correction=log.lo>BigInt(places+2)*c.scale?{lo:0n,hi:1n}:yield ()=>c.pow10(neg(log));
        return yield* fromLog({lo:log.lo-2n*correction.hi,hi:log.hi},c);
      }
      const powered=yield ()=>c.pow10(log);return yield* fromInterval(c.sub(powered,c.fraction(1n)),c);
    }
    if(input.operation==='logRatio'){log=yield ()=>logarithm(input.value,c);const divisor=yield ()=>logarithm(input.divisor,c);return yield* fromInterval(subtractLog(log,divisor,c),c);}
    if(input.operation==='power'||input.operation==='powerRatio'){log=yield ()=>logarithm(input.value,c);if(yield ()=>A.compare(input.divisor,1)!==0){const divisorLog=yield ()=>logarithm(input.divisor,c);log=subtractLog(log,divisorLog,c);}log=scaleLog(log,input.q.n,input.q.d,c);return yield* fromLog(log,c);}
    if(input.operation==='logOnePlusRatio'||input.operation==='powerOnePlusRatio'){try{const candidate=yield* largeOnePlusLog(input,c);if(candidate)return input.operation==='powerOnePlusRatio'?yield* fromLog(scaleLog(candidate,input.q.n,input.q.d,c),c):yield* fromInterval(candidate,c);}catch(error){if(!['rank-cost-unresolved','amount-formula-unresolved','amount-unresolved'].includes(error.code))throw error;}log=yield ()=>logarithm(sum||A.add(input.value,input.divisor),c);const d=yield ()=>logarithm(input.divisor,c),result=subtractLog(log,d,c);return input.operation==='powerOnePlusRatio'?yield* fromLog(scaleLog(result,input.q.n,input.q.d,c),c):yield* fromInterval(result,c);}
    if(input.operation==='log10'){log=yield ()=>logarithm(input.value,c);return yield* fromInterval(log,c);}
    log=c.fraction(0n);for(const v of numerators){const part=yield ()=>logarithm(v,c);log=input.operation==='productPower'?addLog(log,part,c):c.add(log,part);}for(const v of denominators){const part=yield ()=>logarithm(v,c);log=c.sub(log,part);}if(input.operation==='productPower')log=scaleLog(log,input.q.n,input.q.d,c);return yield* fromLog(log,c);
   }catch(e){if(e.capacity===true)return yield ()=>capacityFormula(input);if(e.code!=='rank-cost-unresolved'&&e.code!=='amount-formula-unresolved')throw e;lastFailure={code:e.code,message:e.message,places,interval:e.interval,rounded:e.rounded};}}
  const words=value=>value===undefined?undefined:A.words(value);
  throw Object.assign(Error('complete-input formula could not be certified'),{code:'amount-formula-unresolved',operation:input.operation,lastFailure,formulaInput:{operation:input.operation,numerators:input.numerators?.map(A.words),denominators:input.denominators?.map(A.words),value:words(input.value),divisor:words(input.divisor),delta:words(input.delta),exponent:typeof input.exponent==='number'||typeof input.exponent==='string'?input.exponent:input.exponent===undefined?undefined:String(input.exponent),exponentValue:words(input.exponentValue),q:input.q?{n:String(input.q.n),d:String(input.q.d)}:undefined,lastFailure}});

 }
 // Exact integer bucket of a confirmed full stock logarithm. If an interval
 // straddles an integer, decide it against the original stock boundary rather
 // than rounding the logarithm into an invented discrete qualification.
 function logarithmBucket(value,origin,width){
  value=A.from(value);if(!Number.isSafeInteger(origin)||!Number.isSafeInteger(width)||width<=0)fail('log bucket unit invalid','amount-formula-domain');
  return C.withWork(()=>C.task('amount-log-bucket|'+origin+'|'+width+'|'+formulaIdentity(value),function*(){
   if(yield ()=>A.compare(value,'1e'+origin)<=0)return '0';
   const floor=(n,d)=>n>=0n?n/d:-((-n+d-1n)/d);
   for(const places of (W.Core.Amount?.enabled()?[32,80,160,320,512]:[80,160,320,512])){const c=C.context(places);try{
    const log=yield ()=>logarithm(value,c),bucket=c.div(c.sub(log,c.fraction(BigInt(origin))),c.fraction(BigInt(width))),lo=floor(bucket.lo,c.scale),hi=floor(bucket.hi,c.scale);
    if(hi-lo>1n)continue;
    let count=hi;
    if(hi!==lo&&(yield ()=>A.compare(value,'1e'+String(BigInt(origin)+BigInt(width)*hi))<0))count=lo;
    return String(count<0n?0n:count);
   }catch(e){if(e.code!=='rank-cost-unresolved'&&e.code!=='amount-formula-unresolved')throw e;}}
   fail('full logarithm bucket unresolved');
  }));
 }
 function floorPowerRatio(value,divisor,exponent){return C.withWork(()=>{
  const input=capture('powerRatio',[value,exponent,divisor]),result=evaluate(input);
  // At large magnitudes the nonlinear output remains the established confirmed
  // Decimal. Within exact integer output capacity, prove the original input
  // boundary before flooring; rounding to 1 must not manufacture a unit.
  if(result.gte('1e15'))return result.floor();
  if(input.q.n>64n||input.q.d>64n)fail('discrete exponent capacity');
  const Q=W.Core.RankBudget.Q,x=L.toQ?L.toQ(A.words(input.value)):Q.read({terms:A.words(input.value),denominator:'1'}),d=L.toQ?L.toQ(A.words(input.divisor)):Q.read({terms:A.words(input.divisor),denominator:'1'}),left=Q.power(Q.divide(x,d),String(input.q.n));
  let n=BigInt(Math.max(0,Math.floor(result.toNumber()))),steps=0;
  const compare=k=>Q.compare(left,Q.power(Q.decimal(String(k)),String(input.q.d)));
  while(n>0n&&compare(n)<0){if(++steps>4)fail('integer estimate outside proof neighborhood');n--;}
  while(compare(n+1n)>=0){if(++steps>4)fail('integer estimate outside proof neighborhood');n++;}
  return B.BN(String(n));
 });}
 W.Core.AmountFormulas=Object.freeze({capacityDiagnostics:()=>({calls:capacityCounts.calls,operations:{...capacityCounts.operations}}),powerOnePlusRatio:(v,d,e)=>evaluate(capture('powerOnePlusRatio',[v,e,d])),productPower:(factors,e)=>evaluate(capture('productPower',[factors,e])),logarithmBucket,powerWithExponent:(v,e)=>evaluate(capture('powerWithExponent',[v,e])),powerIncrement:(s,d,p)=>evaluate(capture('powerIncrement',[s,d,p])),floorPowerRatio,logRatio:(v,d=1)=>evaluate(capture("logRatio",[v,d])),powerOnePlusMinusOne:(v,e)=>evaluate(capture("powerOnePlusMinusOne",[v,e])),logOnePlusRatio:(v,d=1)=>evaluate(capture("logOnePlusRatio",[v,d])),powerRatio:(v,d,e)=>evaluate(capture('powerRatio',[v,e,d])),power:(v,e)=>evaluate(capture('power',[v,e])),log10:v=>evaluate(capture('log10',[v])),productQuotient:(n,d=[])=>evaluate(capture('productQuotient',[n,d])),prepareWork:(operation,args,options)=>{const input=capture(operation,args);return C.createWork(()=>evaluate(input),options);}});
}(window.WIS));
