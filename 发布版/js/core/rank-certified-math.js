(function(W){
 "use strict";
 // Local outward-rounded arithmetic. No global Decimal backend replacement.
 const fail=m=>{throw Object.assign(Error(m),{code:'rank-cost-unresolved'});};
 // Binary conversions contain no callback or yield. Their8-byte scratch
 // never escapes, while decoded bits are retained as independent primitives.
 const binaryView=new DataView(new ArrayBuffer(8));
 const abs=n=>n<0n?-n:n;
 const floor=(n,d)=>{if(d<=0n)fail('positive denominator required');return n>=0n?n/d:-((-n+d-1n)/d);};
 const ceil=(n,d)=>{if(d<=0n)fail('positive denominator required');const q=n/d;return n>0n&&q*d!==n?q+1n:q;};
 // One quotient serves both directed endpoints of an exact rational point.
 // This preserves integer bounds while avoiding duplicate large temporaries.
 function quotientBounds(n,d){const q=n/d,r=n-q*d;return r===0n?{lo:q,hi:q}:r>0n?{lo:q,hi:q+1n}:{lo:q-1n,hi:q};}
 function binaryFraction(x){
  if(typeof x!=='number'||!Number.isFinite(x))fail('finite binary64 required');
  const v=binaryView;v.setFloat64(0,x,false);const bits=v.getBigUint64(0,false),sign=bits>>63n?-1n:1n,e=Number((bits>>52n)&2047n),f=bits&((1n<<52n)-1n);
  if(!e&&!f)return {n:0n,d:1n};let n=(e?f+(1n<<52n):f)*sign,d=1n,k=(e?e-1023:-1022)-52;
  if(k>=0)n<<=BigInt(k);else d<<=BigInt(-k);return {n,d};
 }
 function roundFraction(n,d){
  if(typeof n!=='bigint'||typeof d!=='bigint'||d<=0n)fail('rational rounding input');if(!n)return 0;
  const negative=n<0n;n=abs(n);let e=n.toString(2).length-d.toString(2).length;
  if(e>=0?n<(d<<BigInt(e)):(n<<BigInt(-e))<d)e--;
  if(e>1023)return negative?-Infinity:Infinity;
  const shift=e>=-1022?52-e:1074,a=shift>=0?n<<BigInt(shift):n,b=shift>=0?d:d<<BigInt(-shift);
  let q=a/b;const rem=a%b;if(rem*2n>b||rem*2n===b&&q%2n)q++;
  let bits;if(e < -1022)bits=q;else {if(q>=1n<<53n){q>>=1n;e++;}if(e>1023)return negative?-Infinity:Infinity;bits=(BigInt(e+1023)<<52n)+(q-(1n<<52n));}
  if(negative)bits|=1n<<63n;const v=binaryView;v.setBigUint64(0,bits,false);return v.getFloat64(0,false);
 }
 // An open endpoint at an EXACT binary midpoint selects its interior
 // neighbour. Every comparison here is rational; no tolerance is introduced.
 function interiorRound(n,d,direction){
  const value=roundFraction(n,d);if(!Number.isFinite(value))return value;
  let next;if(value===0)next=direction>0?Number.MIN_VALUE:-Number.MIN_VALUE;
  else {const view=binaryView;view.setFloat64(0,value,false);let bits=view.getBigUint64(0,false);bits+=(value>0)===(direction>0)?1n:-1n;view.setBigUint64(0,bits,false);next=view.getFloat64(0,false);}
  if(!Number.isFinite(next))return value;
  const a=binaryFraction(value),b=binaryFraction(next);
  return n*(2n*a.d*b.d)===d*(a.n*b.d+b.n*a.d)?next:value;
 }
 // Tasks contain only private arithmetic. A yielded thunk executes outside its
 // parent generator so a suspended child never closes the parent's iterator.
 const suspended=Object.freeze({code:'rank-work-suspended'});let activeWork=null;
 let progressVersion=0;
 function task(key,factory){
  if(!activeWork)return cached('task|'+key,()=>{const iterator=factory();let next=iterator.next();while(!next.done){let input;try{input=typeof next.value==='function'?next.value():undefined;}catch(error){next=iterator.throw(error);continue;}next=iterator.next(input);}return next.value;});
  let job=activeWork.tasks.get(key);if(!job){if(activeWork.tasks.size>=131072)fail('private proof task capacity');job={iterator:factory(),next:null,done:false,value:undefined};activeWork.tasks.set(key,job);}
  if(job.error)throw job.error;if(job.done)return job.value;
  try{for(;;){
   if(activeWork.operations>=activeWork.maximumOperations||activeWork.operations>=activeWork.minimumOperations&&performance.now()>=activeWork.deadline)throw suspended;
   if(!job.next){activeWork.operations++;job.next=job.iterator.next();progressVersion++;}
   if(job.next.done){job.done=true;job.value=job.next.value;job.iterator=null;job.next=null;return job.value;}
   let value;if(job.ready)value=job.input;else try{value=typeof job.next.value==='function'?job.next.value():undefined;}catch(error){if(error===suspended)throw error;value=error;job.throwing=true;}job.ready=false;job.input=undefined;
   if(activeWork.operations>=activeWork.maximumOperations||activeWork.operations>=activeWork.minimumOperations&&performance.now()>=activeWork.deadline){job.input=value;job.ready=true;throw suspended;}
   activeWork.operations++;const throwing=job.throwing;job.throwing=false;job.next=throwing?job.iterator.throw(value):job.iterator.next(value);progressVersion++;
  }}catch(error){if(error!==suspended){job.error=error;job.iterator=null;}throw error;}
 }
 // Sibling pure calculations may share immutable preparation inside ONE
 // candidate commit. Task iterators/results remain private to each work.
 const numericScopes=new WeakMap();
 function numericScopeCurrent(scope){const data=numericScopes.get(scope);return !!data&&!data.closed&&data.isCurrent();}
 function createNumericScope({isCurrent=()=>true}={}){
  if(typeof isCurrent!=='function')fail('numeric owner predicate');const data={closed:false,isCurrent};
  const scope=Object.freeze({close(){if(data.closed)return;data.closed=true;data.isCurrent=null;const spaces=runtimeMemos.get(scope);if(spaces){for(const memo of spaces.values()){W.Core.AmountProducts?.releaseWorkMemo?.(memo);memo.clear();}spaces.clear();}runtimeMemos.delete(scope);}});
  numericScopes.set(scope,data);return scope;
 }
 function createWork(evaluate,{isCurrent=()=>true,numericScope=null}={}){
  if(numericScope!==null&&!numericScopes.has(numericScope))fail('numeric owner invalid');
  const owner={numericScope,tasks:new Map(),memo:new Map(),operations:0,maximumOperations:0,minimumOperations:1,deadline:0};let status='pending',value=null,error=null,totalOperations=0,finished=null,released=false;
  function release(){if(released)return;released=true;owner.tasks.clear();owner.memo.clear();const spaces=runtimeMemos.get(owner);if(spaces){for(const memo of spaces.values()){W.Core.AmountProducts?.releaseWorkMemo?.(memo);memo.clear();}spaces.clear();}runtimeMemos.delete(owner);evaluate=null;}
  const check=()=>{if(status==='cancelled')throw Object.assign(Error('proof work cancelled'),{code:'rank-work-cancelled'});if(error)throw error;
   let current=false;try{current=isCurrent()&&(!numericScope||numericScopeCurrent(numericScope));}catch(e){current=false;}if(!current){status='failed';value=null;error=Object.assign(Error('proof work owner changed'),{code:'rank-work-stale'});release();throw error;}};
  const work={advance({maximumOperations=256,minimumOperations=1,deadline=Infinity}={}){check();if(!Number.isSafeInteger(minimumOperations)||minimumOperations<1||minimumOperations>maximumOperations||!Number.isSafeInteger(maximumOperations)||maximumOperations<1||maximumOperations>65536||typeof deadline!=='number'||Number.isNaN(deadline))fail('proof slice budget');if(status==='done')return {done:true,operations:0};
   const previous=activeWork;owner.operations=0;owner.maximumOperations=maximumOperations;owner.minimumOperations=minimumOperations;owner.deadline=deadline;activeWork=owner;
   try{value=withWork(evaluate,owner.memo);status='done';finished={tasks:owner.tasks.size,completed:[...owner.tasks.values()].filter(j=>j.done).length};release();return {done:true,operations:owner.operations};}
   catch(e){if(e===suspended)return {done:false,operations:owner.operations};status='failed';value=null;error=e;release();throw e;}
   finally{totalOperations+=owner.operations;activeWork=previous;}},diagnostics(){return {status,totalOperations,tasks:finished?.tasks??owner.tasks.size,completed:finished?.completed??[...owner.tasks.values()].filter(j=>j.done).length,pending:[...owner.tasks.entries()].filter(([,j])=>!j.done).map(([key])=>key.slice(0,90)).slice(0,8)};},result(){check();return status==='done'?value:null;},cancel(){status='cancelled';value=null;finished=null;release();},runSync(){while(!work.advance({maximumOperations:65536}).done){}return work.result();}};return Object.freeze(work);
 }
 let workMemo=null;
 const runtimeMemos=new WeakMap();
 function memo(name){const owner=activeWork?.numericScope||activeWork||workMemo;if(!owner)return new Map();let spaces=runtimeMemos.get(owner);if(!spaces){spaces=new Map();runtimeMemos.set(owner,spaces);}if(!spaces.has(name))spaces.set(name,new Map());return spaces.get(name);}
 function withWork(fn,memo){if(workMemo)return fn();const previous=workMemo;workMemo=memo||activeWork?.memo||new Map();try{return fn();}finally{workMemo=previous;}}
 function cached(key,fn){if(!workMemo)return fn();if(workMemo.has(key))return workMemo.get(key);const result=Object.freeze(fn());if(workMemo.size>=2048)workMemo.delete(workMemo.keys().next().value);workMemo.set(key,result);return result;}
 // Pure fixed-point kernel certificates, with no state or formula outputs.
 // The key is the COMPLETE directed input consumed by the existing series.
 const numericCertificates=new Map();let numericCertificateBytes=0;
 function numericCertificate(key,compute){
  if(!W.Core.Amount?.enabled())return compute();
  if(numericCertificates.has(key)){const entry=numericCertificates.get(key);numericCertificates.delete(key);numericCertificates.set(key,entry);return entry.value;}
  const result=compute(); // A suspended/failed/partial job never reaches storage.
  if(typeof result.lo!=='bigint'||typeof result.hi!=='bigint'||result.lo>result.hi)fail('numeric certificate bounds');
  const value=Object.freeze({lo:result.lo,hi:result.hi}),bytes=key.length+String(value.lo).length+String(value.hi).length;
  if(bytes<=65536){while(numericCertificates.size>=4096||numericCertificateBytes+bytes>2097152){const first=numericCertificates.keys().next().value;numericCertificateBytes-=numericCertificates.get(first).bytes;numericCertificates.delete(first);}numericCertificates.set(key,{value,bytes});numericCertificateBytes+=bytes;}return value;
 }
 const contexts=new Map();
 function context(places=80){
  if(!Number.isSafeInteger(places)||places<32||places>512)fail('precision capacity');if(contexts.has(places))return contexts.get(places);const S=10n**BigInt(places),one={lo:S,hi:S};
  const capacity=10n**8192n,negativeCapacity=-capacity;const bound=v=>{if(v>=capacity||v<=negativeCapacity)fail('interval allocation capacity');return v;};
  const fraction=(n,d=1n)=>{if(typeof n!=='bigint'||typeof d!=='bigint'||d<=0n)fail('rational interval input');const value=quotientBounds(n*S,d);return {lo:bound(value.lo),hi:bound(value.hi)};};
  const add=(a,b)=>({lo:bound(a.lo+b.lo),hi:bound(a.hi+b.hi)}),sub=(a,b)=>({lo:bound(a.lo-b.hi),hi:bound(a.hi-b.lo)});
  function mul(a,b){if(a.lo===a.hi&&b.lo===b.hi){const value=quotientBounds(a.lo*b.lo,S);return {lo:bound(value.lo),hi:bound(value.hi)};}let lo,hi;
   if(a.lo>=0n&&b.lo>=0n){lo=a.lo*b.lo;hi=a.hi*b.hi;}
   else if(a.hi<=0n&&b.hi<=0n){lo=a.hi*b.hi;hi=a.lo*b.lo;}
   else if(a.lo>=0n&&b.hi<=0n){lo=a.hi*b.lo;hi=a.lo*b.hi;}
   else if(a.hi<=0n&&b.lo>=0n){lo=a.lo*b.hi;hi=a.hi*b.lo;}
   else{const p=a.lo*b.lo,q=a.lo*b.hi,r=a.hi*b.lo,t=a.hi*b.hi;lo=p<q?p:q;if(r<lo)lo=r;if(t<lo)lo=t;hi=p>q?p:q;if(r>hi)hi=r;if(t>hi)hi=t;}
   return {lo:bound(floor(lo,S)),hi:bound(ceil(hi,S))};
  }
  function div(a,b){if(b.lo<=0n)fail('interval denominator not positive');if(a.lo===a.hi&&b.lo===b.hi){const value=quotientBounds(a.lo*S,b.lo);return {lo:bound(value.lo),hi:bound(value.hi)};}const lower=a.lo>=0n?b.hi:b.lo,upper=a.hi<=0n?b.hi:b.lo;return {lo:bound(floor(a.lo*S,lower)),hi:bound(ceil(a.hi*S,upper))};}
  const reciprocalConstants=new Map(),integerCapacity=10n**BigInt(8192-places);
  function scale(a,n,d=1n){
   if(typeof n!=='bigint'||typeof d!=='bigint'||d<=0n)fail('rational interval input');
   if(d===1n){if(n>=integerCapacity||n<=-integerCapacity)fail('interval allocation capacity');if(a.lo===a.hi){const value=bound(a.lo*n);return {lo:value,hi:value};}return n>=0n?{lo:bound(a.lo*n),hi:bound(a.hi*n)}:{lo:bound(a.hi*n),hi:bound(a.lo*n)};}
   let factor;if(n===1n&&d<=4096n){factor=reciprocalConstants.get(d);if(!factor){factor=Object.freeze(fraction(n,d));reciprocalConstants.set(d,factor);}}else factor=fraction(n,d);return mul(a,factor);
  }
  function logMantissa(n,d){
   if(!W.Core.Amount?.enabled())return task(places+'|mantissa|'+n+'/'+d,()=>logMantissaSteps(n,d));
   const y=fraction(n-d,n+d),yy=mul(y,y),key=places+'|mantissa-interval|'+y.lo+'/'+y.hi;
   if(y.lo<0n||yy.hi>=S)fail('log normalization');
   return numericCertificate(key,()=>task(key,()=>logMantissaSteps(n,d,{y,yy})));
  }
  function* logMantissaSteps(n,d,prepared=null){
   const y=prepared?prepared.y:fraction(n-d,n+d),yy=prepared?prepared.yy:mul(y,y);if(y.lo<0n||yy.hi>=S)fail('log normalization');let term=y,sum=fraction(0n),tail;
   // One cooperative resume performs at most four unchanged series terms.
   // Integer operations, rounding, termination and precision are identical.
   const batch=W.Core.Amount?.enabled()?4:1;
   if(batch>1){
    // yy.hi<S and y.lo>=0 imply 0<=term<=S throughout. Each positive
    // reciprocal is <=S; at most1088 sums are <=1088*S (<10^516).
    // All intermediate results therefore satisfy the original10^8192 bound.
    // These are the SAME positive-interval floors/ceils, without per-term
    // wrapper allocation or repeated sign/capacity classification.
    let termLo=y.lo,termHi=y.hi,sumLo=0n,sumHi=0n;
    for(let j=0;j<places*2+64;j++){
     if(j===0){sumLo+=termLo;sumHi+=termHi;}
     else {const denominator=BigInt(2*j+1);let reciprocal=reciprocalConstants.get(denominator);if(!reciprocal){reciprocal=Object.freeze(fraction(1n,denominator));reciprocalConstants.set(denominator,reciprocal);}
      sumLo+=termLo*reciprocal.lo/S;sumHi+=(termHi*reciprocal.hi+S-1n)/S;}
     termLo=termLo*yy.lo/S;termHi=(termHi*yy.hi+S-1n)/S;
     if(termHi<=4n){tail=div(scale({lo:termLo,hi:termHi},1n,BigInt(2*j+3)),sub(one,yy));return {lo:2n*sumLo,hi:2n*(sumHi+tail.hi)};}
     if((j+1)%batch===0)yield;
    }fail('log series operation capacity');
   }
   for(let j=0;j<places*2+64;j++){
    sum=add(sum,scale(term,1n,BigInt(2*j+1)));term=mul(term,yy);
    if(term.hi<=4n){tail=div(scale(term,1n,BigInt(2*j+3)),sub(one,yy));return {lo:2n*sum.lo,hi:2n*(sum.hi+tail.hi)};}
    if((j+1)%batch===0)yield;
   }fail('log series operation capacity');
  }

  let lnTwoConstant=null,lnTenConstant=null;
  function logTwo(){if(lnTwoConstant)return lnTwoConstant;const result=logMantissa(2n,1n);lnTwoConstant=Object.freeze(result);return result;}
  function logFraction(n,d){if(d===1n&&n===2n&&lnTwoConstant)return lnTwoConstant;if(d===1n&&n===10n&&lnTenConstant)return lnTenConstant;const result=task(places+'|ln|'+n+'/'+d,()=>logFractionBody(n,d));if(d===1n&&n===10n)lnTenConstant=Object.freeze(result);return result;}
  function* logFractionBody(n,d){
   if(n<=0n||d<=0n)fail('log input not positive');
   // For x>0, 1-1/x <= ln(x) <= x-1. Within half the
   // current decimal precision of1 this enclosure is already <=two ulps wide.
   // Preserve the full signed offset without reducing precision or subtracting
   // two unrelated mantissa certificates. Legacy arithmetic is unchanged.
   const delta=n-d;
   if(W.Core.Amount?.enabled()&&abs(delta)*(10n**BigInt(Math.ceil(places/2)))<d)return {lo:bound(floor(delta*S,n)),hi:bound(ceil(delta*S,d))};
   let e=n.toString(2).length-d.toString(2).length;
   if(e>=0?n<(d<<BigInt(e)):(n<<BigInt(-e))<d)e--;
   if(e>=0)d<<=BigInt(e);else n<<=BigInt(-e);
   const mantissa=yield ()=>logMantissa(n,d),ln2=yield ()=>logTwo();return add(mantissa,scale(ln2,BigInt(e)));
  }
  const ln=a=>numericCertificate(places+'|ln-interval|'+a.lo+'/'+a.hi,()=>task(places+'|ln-interval|'+a.lo+'/'+a.hi,function*(){if(a.lo<=0n)fail('log interval not positive');const lo=yield ()=>logFraction(a.lo,S),hi=yield ()=>logFraction(a.hi,S);return {lo:lo.lo,hi:hi.hi};}));
  function expPoint(x){const key=places+'|exp|'+x;return numericCertificate(key,()=>task(key,()=>expPointBody(x)));}
  function* expPointBody(x){
   if(x<0n){const value=yield ()=>expPoint(-x);return div(one,value);}if(x>2048n*S)fail('exponential magnitude capacity');
   const y=fraction(x,8192n*S);let term=one,sum=one,answer;
   if(W.Core.Amount?.enabled()){
    // x/8192<=1/4. All positive Taylor intermediates are below2*S;
    // retain the SAME two rounded products (including reciprocal enclosure),
    // not a replacement division by n. No per-term interval wrappers escape.
    let termLo=S,termHi=S,sumLo=S,sumHi=S;
    for(let n=1;n<places*3+64;n++){
     const denominator=BigInt(n);let reciprocal=reciprocalConstants.get(denominator);
     if(!reciprocal){reciprocal=Object.freeze(fraction(1n,denominator));reciprocalConstants.set(denominator,reciprocal);}
     const lo=termLo*y.lo/S,hi=(termHi*y.hi+S-1n)/S;
     termLo=lo*reciprocal.lo/S;termHi=(hi*reciprocal.hi+S-1n)/S;sumLo+=termLo;sumHi+=termHi;
     if(termHi<=4n){
      const nextDenominator=BigInt(n+1);let nextReciprocal=reciprocalConstants.get(nextDenominator);
      if(!nextReciprocal){nextReciprocal=Object.freeze(fraction(1n,nextDenominator));reciprocalConstants.set(nextDenominator,nextReciprocal);}
      const nextHi=(((termHi*y.hi+S-1n)/S)*nextReciprocal.hi+S-1n)/S;
      answer={lo:sumLo,hi:sumHi+2n*nextHi};break;
     }
     yield;
    }
   }else for(let n=1;n<places*3+64;n++){
    term=scale(mul(term,y),1n,BigInt(n));sum=add(sum,term);
    if(term.hi<=4n){const next=scale(mul(term,y),1n,BigInt(n+1));answer={lo:sum.lo,hi:sum.hi+2n*next.hi};break;}
    yield;
   }
   if(!answer)fail('exp series operation capacity');for(let j=0;j<13;j++){answer=mul(answer,answer);yield;}return answer;
  }
  const exp=a=>numericCertificate(places+'|exp-interval|'+a.lo+'/'+a.hi,()=>task(places+'|exp-interval|'+a.lo+'/'+a.hi,function*(){const lo=yield ()=>expPoint(a.lo),hi=yield ()=>expPoint(a.hi);return {lo:lo.lo,hi:hi.hi};}));
  function* isqrt(n){if(n<0n)fail('negative square root');if(n<2n)return n;let x=1n<<BigInt(Math.ceil(n.toString(2).length/2));for(;;){const y=(x+n/x)/2n;if(y>=x)return x;x=y;yield;}}
  const sqrt=a=>numericCertificate(places+'|sqrt|'+a.lo+'/'+a.hi,()=>task(places+'|sqrt|'+a.lo+'/'+a.hi,function*(){if(a.lo<0n)fail('negative square root');const lo=yield* isqrt(a.lo*S),v=a.hi*S,hi=yield* isqrt(v);return {lo,hi:hi*hi===v?hi:hi+1n};}));
  const number=x=>{const q=binaryFraction(x);return fraction(q.n,q.d);};
  const round=a=>{const lo=roundFraction(a.lo,S),hi=roundFraction(a.hi,S);if(!Object.is(lo,hi))throw Object.assign(Error('rounding boundary unresolved'),{code:'rank-cost-unresolved',places,interval:{lo:String(a.lo),hi:String(a.hi),scale:String(S)},rounded:{lo:String(lo),hi:String(hi)}});return lo;};
  const roundOpen=a=>{const lo=a.openLo?interiorRound(a.lo,S,1):roundFraction(a.lo,S),hi=a.openHi?interiorRound(a.hi,S,-1):roundFraction(a.hi,S);if(!Object.is(lo,hi))return round(a);return lo;};
  const roundLayerOneExponent=a=>a.lo>=9000000000000000n*S||a.hi<=-9000000000000000n*S?null:roundOpen(a);
  const roundScalarComponent=a=>a.lo>0n&&a.hi*100000000000000000n<S||a.hi<0n&&-a.lo*100000000000000000n<S?null:roundLayerOneExponent(a);
  const result=Object.freeze({scale:S,places,fraction,number,add,sub,mul,div,times:scale,ln,logFraction,exp,sqrt,round,roundOpen,roundLayerOneExponent,roundScalarComponent,log10:a=>div(ln(a),logFraction(10n,1n)),pow10:a=>exp(mul(a,logFraction(10n,1n))),power:(a,n,d=1n)=>exp(scale(ln(a),n,d))});contexts.set(places,result);return result;
 }
 function certify(op,x){if(typeof x!=='number'||!Number.isFinite(x)||op==='log10'&&x<=0)fail('transcendental input');if(op==='pow10'&&x>309)return Infinity;if(op==='pow10'&&x< -325)return 0;
  for(const p of [80,160,320,512]){const c=context(p);try{return c.round(c[op](c.number(x)));}catch(e){if(e.code!=='rank-cost-unresolved')throw e;}}fail('binary64 rounding not certified');
 }
 W.Core.CertifiedRankMath=Object.freeze({progressVersion:()=>progressVersion,memo,withWork,task,createNumericScope,createWork,isWorkActive:()=>activeWork!==null,isSuspension:e=>e===suspended,context,binaryFraction,roundFraction,log10Number:x=>certify('log10',x),pow10Number:x=>certify('pow10',x)});
}(window.WIS));
