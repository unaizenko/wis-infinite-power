(function(W){
 "use strict";
 const R=W.Core.Rank,Q=()=>W.Core.RankBudget.Q,E=()=>W.Core.RankExact,C=W.Core.CertifiedRankMath;
 const fail=m=>{throw Object.assign(Error(m),{code:'rank-cost-unresolved'});};
 function read(s){const cache=E().memo('g-canonical');if(!cache.has('identities'))cache.set('identities',new WeakSet());const identities=cache.get('identities');if(identities.has(s))return s;if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join(',')!=='challenge,count,d6,reward,start,version'||s.version!==1||typeof s.d6!=='boolean'||typeof s.challenge!=='boolean'||typeof s.reward!=='boolean')fail('G prefix shape/rule');const start=R.read(s.start),count=R.read(s.count);if(R.compare(start,1)<0||R.compare(count,0)<=0)fail('G prefix range');const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const child of Object.values(v))freeze(child);Object.freeze(v);}};const value={version:1,start,count,d6:s.d6,challenge:s.challenge,reward:s.reward};freeze(value);identities.add(value);return value;}
 function atom(s){return E().gPrefix(read(s));}
 function single(g,s){const q=Q(),rank=q.fromRank(g),offset=R.compare(g,64)<0?q.decimal(0):q.subtract(rank,q.decimal(64)),capacity=q.power(q.add(q.decimal(1),q.divide(offset,q.decimal(8))),2);let raw=q.multiply(q.decimal(100),capacity);
  if(s.challenge){const dense=W.Core.RankMath.integerDifference(0,g);raw=q.multiply(raw,E().power(q.decimal(10),dense,50n));}
  if(s.d6){raw=q.subtract(raw,rank);if(q.compare(raw,q.decimal(42))<0)raw=q.decimal(42);}
  return raw;
 }
 function pointLog(g,s,c){const cache=E().memo('g-points');const key=JSON.stringify([c.places,g,s.d6,s.challenge,s.reward]);if(cache.has(key))return cache.get(key);let v=C.task('g-point|'+key,function*(){const input=yield ()=>single(g,s),raw=yield ()=>E().log(input,c);return s.reward?c.times(raw,19n,20n):raw;});if(cache.size>=1024)cache.delete(cache.keys().next().value);cache.set(key,v);return v;}
 function* logSumSteps(logs,c,tail){if(logs.length===1&&!tail)return logs[0];const top=logs.reduce((a,b)=>a.hi>b.hi?a:b),cut=c.times(yield ()=>c.logFraction(10n,1n),-BigInt(c.places+2));let sum=c.fraction(0n);
  for(const log of logs){const d=c.sub(log,top),value=d.hi<cut.lo?{lo:0n,hi:1n}:yield ()=>c.exp(d);sum=c.add(sum,value);}
  if(tail){const d=c.sub(tail.log,top),v=d.hi<cut.lo?{lo:0n,hi:1n}:yield ()=>c.exp(d),extra=c.div(v,tail.divisor);sum={lo:sum.lo,hi:sum.hi+extra.hi};}
  return c.add(top,yield ()=>c.ln(sum));
 }
 const absolute=a=>a.lo>=0n?a:a.hi<=0n?{lo:-a.hi,hi:-a.lo}:{lo:0n,hi:-a.lo>a.hi?-a.lo:a.hi};
 const signedDivide=(a,n,c)=>n>0n?c.times(a,1n,n):c.times(a,-1n,-n);
 // Euler–Maclaurin with the integral remainder, never the asymptotic value
 // alone. |B_2m - periodic B_2m| <= 2|B_2m| (DLMF2.10.1).
 function bernoulli(count){const a=[],out=[],gcd=(x,y)=>{x=x<0n?-x:x;while(y){const t=x%y;x=y;y=t;}return x;},f=(n,d)=>{const g=gcd(n,d);return {n:n/g,d:d/g};};for(let m=0;m<=count;m++){a[m]=f(1n,BigInt(m+1));for(let j=m;j>=1;j--)a[j-1]=f(BigInt(j)*(a[j-1].n*a[j].d-a[j].n*a[j-1].d),a[j-1].d*a[j].d);out.push(a[0]);}return out;}
 const bern=bernoulli(48),facts=[1n];for(let n=1;n<=48;n++)facts[n]=facts[n-1]*BigInt(n);
 function* rewardRange(a,count,s,c){
  if(count===1n){const value=yield ()=>pointLog(R.read(String(a)),s,c);return yield ()=>c.exp(value);}const b=a+count-1n,maxJ=Math.min(256,Math.max(40,Math.floor(c.places/2))),m=c.places<=80?4:c.places<=160?8:c.places<=320?16:24;
  let J=maxJ,aPower=a*a*a,power128=128n**3n;const precision=10n**BigInt(c.places);
  // Existing Cauchy remainder times (25/16)^(19/20) is at most
  // 12*a^2*(128/a)^(j+1)*(1+10*a/(10*j-19)), since a>=256.
  // Shorten only when this EXACT rational upper bound is <=10^-places.
  for(let j=2;j<maxJ;j++){const d=10n*BigInt(j)-19n;if(12n*a*a*power128*(d+10n*a)*precision<=aPower*d){J=j;break;}aPower*=a;power128*=128n;yield;}

  const ap=yield ()=>c.power(c.fraction(a),19n,10n),ratio=c.fraction(b,a),rp=yield ()=>c.power(ratio,19n,10n),powers=[rp];for(let j=1;j<=J+2*m+1;j++){powers.push(c.div(powers[j-1],ratio));yield;}
  const B=c.fraction(s.d6?-2816n:-112n,s.d6?25n:1n),beta=c.div(B,c.fraction(a)),gamma=c.fraction(3136n,a*a);let prev=c.fraction(0n),coef=c.fraction(1n),sum=c.fraction(0n);
  for(let j=0;j<=J;j++){
   const p=19n-10n*BigInt(j),integral=signedDivide(c.times(c.sub(c.mul(ratio,powers[j]),c.fraction(1n)),10n*a),p+10n,c);let series=c.add(integral,c.times(c.add(c.fraction(1n),powers[j]),1n,2n)),fall=c.fraction(1n),error;
   for(let d=1;d<=2*m-1;d++){
    fall=c.mul(fall,c.fraction(p-10n*BigInt(d-1),10n*a));if(d%2===0)continue;const derivative=c.mul(fall,c.sub(powers[j+d],c.fraction(1n))),r=(d+1)/2,br=bern[2*r];
    if(r<m)series=c.add(series,c.times(derivative,br.n,br.d*facts[2*r]));else error=c.times(absolute(derivative),2n*(br.n<0n?-br.n:br.n),br.d*facts[2*r]);
    yield;
   }
   const enclosed={lo:series.lo-error.hi,hi:series.hi+error.hi};sum=c.add(sum,c.mul(coef,enclosed));
   const next=c.times(c.add(c.mul(beta,c.times(coef,19n-20n*BigInt(j),20n)),c.mul(gamma,c.times(prev,38n-20n*BigInt(j-1),20n))),1n,BigInt(j+1));prev=coef;coef=next;yield;
  }
  // Analytic Cauchy tail: both polynomial roots are <64. At a>=256,
  // |d_j|<=3*128^j and the omitted positive power sum has an integral bound.
  const tailPower=yield ()=>c.power(c.fraction(128n,a),BigInt(J+1)),tail=c.mul(c.times(c.mul(ap,tailPower),6n),c.add(c.fraction(1n),c.fraction(10n*a,10n*BigInt(J)-19n))),value=c.mul(ap,sum),wide={lo:value.lo-tail.hi,hi:value.hi+tail.hi};return c.mul(yield ()=>c.power(c.fraction(25n,16n),19n,20n),wide);
 }
 function* logSteps(s,c){s=read(s);const n=BigInt(W.Core.RankMath.integerDifference(0,s.count));if(n<=16n){const logs=[];for(let j=0n;j<n;j++)logs.push(yield ()=>pointLog(R.add(s.start,String(j)),s,c));return yield* logSumSteps(logs,c);}
  const a=BigInt(W.Core.RankMath.integerDifference(0,s.start));
  if(s.challenge){if(a<64n){const low=n<64n-a?n:64n-a,logs=[];for(let j=0n;j<low;j++)logs.push(yield ()=>pointLog(R.read(String(a+j)),s,c));if(n>low)logs.push(yield ()=>log({...s,start:64,count:R.read(String(n-low))},c));return yield* logSumSteps(logs,c);}const end=a+n-1n,limit=BigInt(Math.min(2048,c.places*4)),take=n<limit?n:limit,logs=[];for(let j=0n;j<take;j++)logs.push(yield ()=>pointLog(R.read(String(end-j)),s,c));let tail;
   if(n>take){const cut=end-take;if(cut<64n)fail('G exponential tail domain');const rho=yield ()=>c.power(c.fraction(10n),s.reward?-19n:-1n,s.reward?1000n:50n);tail={log:yield ()=>pointLog(R.read(String(cut)),s,c),divisor:c.sub(c.fraction(1n),rho)};}
   return yield* logSumSteps(logs,c,tail);
  }
  if(!s.reward)fail('ordinary polynomial must use exact cumulative model');let lowCount=a<256n?(n<256n-a?n:256n-a):0n,logs=[];for(let j=0n;j<lowCount;j++)logs.push(yield ()=>pointLog(R.read(String(a+j)),s,c));if(n>lowCount){const high=yield* rewardRange(a+lowCount,n-lowCount,s,c);if(high.lo<=0n)fail('reward sum interval not positive');logs.push(yield ()=>c.ln(high));}return yield* logSumSteps(logs,c);
 }
 function log(s,c){return C.task('g-log|'+c.places+'|'+JSON.stringify(read(s)),()=>logSteps(s,c));}
 function cost(record,count){return C.task('g-special-fee|'+JSON.stringify([record.originRank,record.gRules,String(count)]),()=>costSteps(record,count));}
 function* costSteps(record,count){const q=Q(),rules=record.gRules;let n=BigInt(count),g=record.originRank,total=q.decimal(0);
  const add=(start,k,divisor)=>{const expr=atom({version:1,start,count:R.read(String(k)),d6:rules.d6,challenge:rules.challenge==='trueGraham',reward:rules.reward===true});total=q.add(total,q.divide(expr,q.decimal(divisor)));};
  if(rules.pricing==='base'&&R.compare(g,64)<0){let at=BigInt(String(R.project(g)));for(const end of [2n,4n,8n,16n,32n,64n]){if(at>=end||!n)continue;const k=n<end-at?n:end-at,K=2n**BigInt([2n,4n,8n,16n,32n].filter(v=>v<=at).length);yield ()=>add(R.read(String(at)),k,String(K));at+=k;n-=k;}g=R.read(String(at));}
  if(n)yield ()=>add(g,n,rules.pricing==='base'?32:1);
  const exponent=yield ()=>q.multiply(q.fromRank(rules.treeDelta),q.decimal(rules.reward?-19:-1));
  const divisor=yield ()=>E().rankPower(q.decimal(10),exponent.terms,rules.reward?20:1);return yield ()=>q.multiply(total,divisor);
 }
 function certifiedLog(s,c){return E().withWork(()=>{
  s=read(s);const key=c.places+'|'+JSON.stringify(s),cache=E().memo('g-sum');if(cache.has(key))return cache.get(key);
  const value=Object.freeze(log(s,c));if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,value);return value;
 });}
 W.Core.RankGCost=Object.freeze({read,log:certifiedLog,cost});
}(window.WIS));
