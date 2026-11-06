(function(W){
 "use strict";
 // Bounded sum of rational coefficients times exact positive rational powers.
 // These are data-only factors, never callbacks or a general executable AST.
 const C=W.Core.CertifiedRankMath,L=W.Core.SignedLedger,kind='wis-rank-exact-value',LIMIT=128;
 const Q=()=>W.Core.RankBudget.Q,fail=m=>{throw Object.assign(Error(m),{code:'rank-cost-unresolved'});};
 let activeMemo=null;
 function withWork(fn,memo){if(activeMemo)return fn();const previous=activeMemo;activeMemo=memo||new Map();try{return C.withWork(fn);}finally{activeMemo=previous;}}
 function createWork(fn,options){const cache=new Map(),inner=C.createWork(()=>withWork(fn,cache),options);const release=()=>{for(const memo of cache.values())if(memo instanceof Map){W.Core.AmountProducts?.releaseWorkMemo?.(memo);memo.clear();}cache.clear();};
  const work=Object.freeze({...inner,advance(options){try{const next=inner.advance(options);if(next.done)release();return next;}catch(error){release();throw error;}},result(){try{return inner.result();}catch(error){release();throw error;}},cancel(){release();inner.cancel();},runSync(){while(!work.advance({maximumOperations:65536}).done){}return work.result();}});return work;
 }
 function memo(name){if(!activeMemo)return W.Core.Amount?.enabled()?C.memo(name):new Map();if(!activeMemo.has(name))activeMemo.set(name,new Map());return activeMemo.get(name);}
 const abs=x=>x<0n?-x:x,gcd=(a,b)=>{a=abs(a);while(b){const t=a%b;a=b;b=t;}return a;};
 const integer=x=>{if(!['string','number','bigint'].includes(typeof x)||typeof x==='number'&&!Number.isSafeInteger(x)||!/^[-+]?\d+$/.test(String(x))||String(x).length>2049)fail('factor integer capacity');return BigInt(x);};
 function shape(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.slice().sort().join(','))fail('factor record shape');}
 function rational(n,d=1n){n=integer(n);d=integer(d);if(d<=0n)fail('factor denominator');const g=gcd(n,d);return {n:String(n/g),d:String(d/g)};}
 function exponentValue(e){
  if(e&&Object.prototype.hasOwnProperty.call(e,'terms')){shape(e,['terms','denominator']);if(!Array.isArray(e.terms)||e.terms.length>W.Core.Rank.limits.terms)fail('rank exponent terms');
   for(const raw of e.terms){if(typeof raw!=='string')fail('rank exponent word');const m=/^(-?)(.*?)(?:\*([1-9]\d*))?$/.exec(raw);try{L.integer(m[2]);}catch(error){fail('rank exponent must be an integer numerator');}}
   return Q().read(e);
  }
  shape(e,['n','d']);return Q().fraction(e.n,e.d);
 }
 function packExponent(value){value=Q().read(value);try{const p=Q().fractionPair(value);return rational(p.n,p.d);}catch(error){if(error.code!=='rank-cost-unresolved')throw error;}
  // Q may absorb a finite denominator into decimal-word exponents. Persisted
  // rank exponents keep an INTEGER numerator, including its small residual.
  let shift=0n;const rows=value.terms.map(word=>{const m=/^(-?\d+)e([+-]?\d+)$/.exec(word);if(m){const e=BigInt(m[2]);if(e< -shift)shift=-e;return {n:BigInt(m[1]),e};}return {word};});
  if(shift>2048n)fail('rank exponent denominator capacity');const scale=10n**shift,denominator=String(integer(BigInt(value.denominator)*scale)),words=rows.map(row=>{if(row.word===undefined)return String(row.n)+'e'+String(row.e+shift);if(!shift)return row.word;
   const m=/^(-?)(.*?)(?:\*([1-9]\d*))?$/.exec(row.word),count=integer(BigInt(m[3]||1)*scale);return m[1]+m[2]+'*'+count;});
  const R=W.Core.Rank,positive=R.add(0,words.filter(w=>!w.startsWith('-'))),negative=R.add(0,words.filter(w=>w.startsWith('-')).map(w=>w.slice(1)));return {terms:R.difference(positive,negative),denominator};
 }
 function denseExponent(e){if(e.n!==undefined)return {n:BigInt(e.n),d:BigInt(e.d)};const p=Q().fractionPair(exponentValue(e));return {n:BigInt(p.n),d:BigInt(p.d)};}
 function factor(base,exponent){const memoMap=memo('factor-identities');if(!memoMap.has('identities'))memoMap.set('identities',new WeakMap());const identities=memoMap.get('identities'),known=identities.get(base)?.get(exponent);if(known)return {...known};
  shape(base,['n','d']);const b=rational(base.n,base.d),e=exponent?.n!==undefined?(shape(exponent,['n','d']),rational(exponent.n,exponent.d)):packExponent(exponentValue(exponent));if(BigInt(b.n)<=0n)fail('positive factor base');const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const child of Object.values(v))freeze(child);Object.freeze(v);}};freeze(b);freeze(e);const value={base:b,exponent:e},byExponent=new WeakMap();byExponent.set(e,value);identities.set(b,byExponent);return {...value};}
 function plain(v){if(v?.kind)fail('coefficient must be a rational ledger');return Q().read(v);}
 function canonicalIdentities(){const cache=memo('exact-canonical');if(!cache.has('identities'))cache.set('identities',new WeakSet());return cache.get('identities');}
 function normalize(input){const value=normalizeBody(input);const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const child of Object.values(v))freeze(child);Object.freeze(v);}};freeze(value);canonicalIdentities().add(value);return value;}
 function normalizeBody(input){
  if(!Array.isArray(input)||input.length>LIMIT)fail('exact factor term capacity');const rows=new Map();
  for(const term of input){shape(term,['coefficient','factors']);let coefficient=plain(term.coefficient);if(!Array.isArray(term.factors)||term.factors.length>16)fail('factor count capacity');const powers=new Map(),atoms=[];
   for(const raw of term.factors){if(raw?.kind==='g-prefix'){shape(raw,['kind','spec']);atoms.push({kind:'g-prefix',spec:W.Core.RankGCost.read(raw.spec)});continue;}shape(raw,['base','exponent']);const f=factor(raw.base,raw.exponent),key=f.base.n+'/'+f.base.d,old=powers.get(key);if(old){f.exponent=old.exponent.n!==undefined&&f.exponent.n!==undefined?rational(BigInt(old.exponent.n)*BigInt(f.exponent.d)+BigInt(f.exponent.n)*BigInt(old.exponent.d),BigInt(old.exponent.d)*BigInt(f.exponent.d)):packExponent(Q().add(exponentValue(old.exponent),exponentValue(f.exponent)));}powers.set(key,f);}
   for(const [key,f] of powers){if(f.exponent.d!=='1')continue;const n=BigInt(f.exponent.n),size=BigInt(Math.max(BigInt(f.base.n).toString(2).length,BigInt(f.base.d).toString(2).length));if(abs(n)>64n||abs(n)*size>6000n)continue;
    try{const folded=Q().multiply(coefficient,Q().power(Q().fraction(f.base.n,f.base.d),String(n)));coefficient=folded;powers.delete(key);}catch(error){if(error.code!=='rank-cost-unresolved')throw error;}
   }
   const factors=[...powers.values()].filter(f=>f.base.n!==f.base.d&&(f.exponent.n!==undefined?f.exponent.n!=='0':Q().compare(exponentValue(f.exponent),Q().decimal(0))!==0)).concat(atoms).sort((a,b)=>{const x=JSON.stringify(a),y=JSON.stringify(b);return x<y?-1:x>y?1:0;}),key=JSON.stringify(factors),old=rows.get(key);rows.set(key,{coefficient:old?Q().add(old.coefficient,coefficient):coefficient,factors});
  }
  const terms=[...rows.entries()].filter(([,t])=>Q().compare(t.coefficient,Q().decimal(0))!==0).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,t])=>t);
  if(!terms.some(t=>t.factors.some(f=>f.kind==='g-prefix')))return {kind,version:1,terms};
  // Exact prefix differences reduce to the intervening interval before numeric
  // bounds are evaluated. An arbitrarily tiny underpayment cannot disappear.
  for(let i=0;i<terms.length;i++)for(let j=i+1;j<terms.length;j++){
   const a=terms[i],b=terms[j],af=a.factors.filter(f=>f.kind==='g-prefix'),bf=b.factors.filter(f=>f.kind==='g-prefix');if(af.length!==1||bf.length!==1)continue;
   const x=af[0].spec,y=bf[0].spec,restA=a.factors.filter(f=>f.kind!=='g-prefix'),restB=b.factors.filter(f=>f.kind!=='g-prefix');if(JSON.stringify(restA)!==JSON.stringify(restB)||x.d6!==y.d6||x.challenge!==y.challenge||x.reward!==y.reward)continue;
   // Integer half-open ranges concatenate exactly; no numeric sum is used.
   const R=W.Core.Rank;
   if(Q().compare(a.coefficient,b.coefficient)===0&&(R.compare(R.add(x.start,x.count),y.start)===0||R.compare(R.add(y.start,y.count),x.start)===0)){
    const spec={...x,start:R.compare(x.start,y.start)<0?x.start:y.start,count:R.add(x.count,y.count)},remaining=terms.filter((_,k)=>k!==i&&k!==j);remaining.push({coefficient:a.coefficient,factors:[...restA,{kind:'g-prefix',spec}]});return normalize(remaining);
   }
   if(Q().compare(a.coefficient,Q().negate(b.coefficient))!==0||R.compare(x.start,y.start)!==0)continue;
   const cmp=W.Core.Rank.compare(x.count,y.count);if(!cmp)continue;const large=cmp>0?x:y,small=cmp>0?y:x,count=W.Core.Rank.add(large.count,W.Core.Rank.difference(0,small.count)),spec={...large,start:W.Core.Rank.add(large.start,small.count),count},remaining=terms.filter((_,k)=>k!==i&&k!==j);remaining.push({coefficient:cmp>0?a.coefficient:b.coefficient,factors:[...restA,{kind:'g-prefix',spec}]});return normalize(remaining);
  }
  return {kind,version:1,terms};
 }
 function read(v){if(canonicalIdentities().has(v))return v;shape(v,['kind','version','terms']);if(v.kind!==kind||v.version!==1)fail('exact factor version');return normalize(v.terms);}
 const is=v=>v?.kind===kind,terms=v=>is(v)?read(v).terms:[{coefficient:plain(v),factors:[]}];
 // read already validates foreign values and recognizes current-owner canonical nodes.
 function prepareExact(v){return is(v)?read(v):normalize(terms(v));}
 const add=(a,b)=>normalize([...terms(a),...terms(b)]),negate=a=>normalize(terms(a).map(t=>({...t,coefficient:Q().negate(t.coefficient)}))),subtract=(a,b)=>add(a,negate(b));
 function multiply(a,b){const out=[];for(const x of terms(a))for(const y of terms(b))out.push({coefficient:Q().multiply(x.coefficient,y.coefficient),factors:[...x.factors,...y.factors]});return normalize(out);}
 function inverseCoefficient(v){try{return Q().dividePlain(Q().decimal(1),v);}catch(e){if(e.code!=='rank-cost-unresolved')throw e;const a=plain(v);if(a.terms.length!==1)fail('inverse of sparse coefficient not certified');const m=/^(-?\d+)e([+-]?\d+)$/.exec(a.terms[0]);if(!m||BigInt(m[1])<=0n)fail('inverse coefficient domain');return Q().read({terms:[a.denominator+'e'+String(-BigInt(m[2]))],denominator:m[1]});}}
 function divide(a,b){const t=terms(b);if(t.length!==1)fail('factor quotient denominator requires a monomial');const x=t[0],inverse={coefficient:inverseCoefficient(x.coefficient),factors:x.factors.map(f=>({base:f.base,exponent:packExponent(Q().negate(exponentValue(f.exponent)))}))};return multiply(a,normalize([inverse]));}
 function power(base,n,d=1n){const b=Q().fractionPair(base),exponent=rational(n,d);return normalize([{coefficient:Q().decimal(1),factors:[factor({n:b.n,d:b.d},exponent)]}]);}
 function rankPower(base,words,denominator=1){
  if(!Array.isArray(words))fail('signed rank exponent requires words');const exponent={terms:words,denominator:String(denominator)};exponentValue(exponent);const b=Q().fractionPair(base);return normalize([{coefficient:Q().decimal(1),factors:[factor(b,exponent)]}]);
 }
 function cancelComparisonFactors(v){
  if(v.terms.length<2)return v;let rows=v.terms;
  for(const common of rows[0].factors){
   if(common.kind==='g-prefix'){
    const key=JSON.stringify(common);if(rows.every(t=>t.factors.some(f=>JSON.stringify(f)===key)))rows=rows.map(t=>{const factors=t.factors.slice(),index=factors.findIndex(f=>JSON.stringify(f)===key);factors.splice(index,1);return {...t,factors};});
   }else if(rows.every(t=>t.factors.some(f=>f.kind!=='g-prefix'&&f.base.n===common.base.n&&f.base.d===common.base.d))){
    rows=rows.map(t=>({...t,factors:t.factors.map(f=>f.kind!=='g-prefix'&&f.base.n===common.base.n&&f.base.d===common.base.d?{base:f.base,exponent:packExponent(Q().subtract(exponentValue(f.exponent),exponentValue(common.exponent)))}:f)}));
   }
  }
  return normalize(rows);
 }
 function coefficientLog(c,ctx){return C.task('coefficient|'+ctx.places+'|'+JSON.stringify(c),()=>coefficientLogSteps(c,ctx));}
 function* coefficientLogSteps(c,ctx){
  const negative=Q().compare(c,Q().decimal(0))<0,v=negative?Q().negate(c):c,rows=v.terms.map(raw=>{const m=/^(-?\d+)e([+-]?\d+)$/.exec(raw);if(!m)fail('coefficient logarithm requires decimal words');return {n:BigInt(m[1]),e:BigInt(m[2]),digits:BigInt(m[1].replace('-','').length)};});
  if(!rows.length)fail('zero coefficient');let E=rows[0].e+rows[0].digits-1n;for(const r of rows)if(r.e+r.digits-1n>E)E=r.e+r.digits-1n;
  let sum=ctx.fraction(0n);for(const r of rows){const shift=r.e-E;const term=shift < -BigInt(ctx.places)-r.digits-2n?(r.n<0n?{lo:-1n,hi:0n}:{lo:0n,hi:1n}):shift<=0n?ctx.fraction(r.n,10n**(-shift)):ctx.fraction(r.n*10n**shift);sum=ctx.add(sum,term);}
  // Signed sparse coefficients may contain cancellation. Normalize exact words
  // first, then retain each sign rather than taking logarithms of negatives.
  const ls=yield ()=>ctx.ln(sum),ln10=yield ()=>ctx.logFraction(10n,1n),ld=yield ()=>ctx.logFraction(BigInt(v.denominator),1n),log=ctx.sub(ctx.add(ls,ctx.times(ln10,E)),ld);return {negative,log};
 }
 function normalizedInterval(v,ctx){const key=ctx.places+'|'+JSON.stringify(v),cache=memo('interval');if(cache.has(key))return cache.get(key);const result=normalizedIntervalBody(v,ctx,key);Object.freeze(result.value);Object.freeze(result);if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,result);return result;}
 function* dyadicIntervalSteps(v,ctx){
  // A direct outward-rounded algebraic enclosure avoids ln/exp for TREE's
  // half-integer powers. Unsupported scales/exponents retain the log kernel.
  if(v.terms.some(t=>t.factors.some(f=>f.kind==='g-prefix')))return null;
  const rows=[];try{for(const t of v.terms){const coefficient=Q().fractionPair(t.coefficient),factors=[];for(const f of t.factors){const e=Q().fractionPair(exponentValue(f.exponent)),n=BigInt(e.n),d=BigInt(e.d);if((d!==1n&&d!==2n)||abs(n)>64n)return null;factors.push({f,n,d});}rows.push({coefficient,factors});}}catch(e){if(e.code==='rank-cost-unresolved')return null;throw e;}
  try{let sum=ctx.fraction(0n);for(const row of rows){let value=ctx.fraction(BigInt(row.coefficient.n),BigInt(row.coefficient.d));for(const {f,n,d} of row.factors){let base=ctx.fraction(BigInt(f.base.n),BigInt(f.base.d));if(d===2n)base=yield ()=>ctx.sqrt(base);let power=ctx.fraction(1n),k=abs(n);while(k){if(k%2n)power=ctx.mul(power,base);k/=2n;if(k)base=ctx.mul(base,base);yield;}if(n<0n)power=ctx.div(ctx.fraction(1n),power);value=ctx.mul(value,power);}sum=ctx.add(sum,value);yield;}
   return sum.lo>0n||sum.hi<0n?{value:sum,exponent:0n}:null;
  }catch(e){if(e.code==='rank-cost-unresolved')return null;throw e;}
 }
 function normalizedIntervalBody(v,ctx,key){return C.task('interval|'+key,()=>normalizedIntervalSteps(v,ctx));}
 function* normalizedIntervalSteps(v,ctx){const direct=yield* dyadicIntervalSteps(v,ctx);if(direct)return direct;const rows=[];for(const t of read(v).terms){let {negative,log}=yield ()=>coefficientLog(t.coefficient,ctx);for(const f of t.factors){const value=yield ()=>{if(f.kind==='g-prefix')return W.Core.RankGCost.log(f.spec,ctx);const log=ctx.logFraction(BigInt(f.base.n),BigInt(f.base.d)),exponent=denseExponent(f.exponent);return ctx.times(log,exponent.n,exponent.d);};log=ctx.add(log,value);}rows.push({negative,log});}
  if(!rows.length)return {value:ctx.fraction(0n),exponent:0n};const ln10=yield ()=>ctx.logFraction(10n,1n);let E=null;
  for(const r of rows){const h=ctx.div(r.log,ln10).hi,e=h>=0n?h/ctx.scale:-((-h+ctx.scale-1n)/ctx.scale);if(E===null||e>E)E=e;}
  let value=ctx.fraction(0n);const origin=ctx.times(ln10,E),cutoff=ctx.times(ln10,-BigInt(ctx.places+2));
  for(const r of rows){const delta=ctx.sub(r.log,origin),m=delta.hi<cutoff.lo?{lo:0n,hi:1n}:yield ()=>ctx.exp(delta);value=r.negative?ctx.sub(value,m):ctx.add(value,m);}
  return {value,exponent:E};
 }
 function compareBody(a,b){return C.task('compare|'+JSON.stringify([a,b]),()=>compareSteps(a,b));}
 function* compareSteps(a,b){const v=cancelComparisonFactors(subtract(a,b));if(!v.terms.length)return 0;if(v.terms.length===1)return Q().compare(v.terms[0].coefficient,Q().decimal(0));
  for(const places of [80,160,320,512]){try{const {value}=yield ()=>normalizedInterval(v,C.context(places));if(value.lo>0n)return 1;if(value.hi<0n)return -1;}catch(e){if(e.code!=='rank-cost-unresolved')throw e;}}fail('exact factor comparison boundary unresolved');
 }
 function projectBody(v){return C.task('project|'+JSON.stringify(v),()=>projectSteps(v));}
 function* projectSteps(v){v=prepareExact(v);if(!v.terms.length)return W.Core.BigNum.ZERO;
  for(const places of [80,160,320,512]){try{const c=C.context(places),n=yield ()=>normalizedInterval(v,c);let m=n.value,sign=1;if(m.hi<0n){sign=-1;m={lo:-m.hi,hi:-m.lo};}if(m.lo<=0n)continue;
   const ln10=yield ()=>c.logFraction(10n,1n),lm=yield ()=>c.ln(m),log10=c.add(c.fraction(n.exponent),c.div(lm,ln10));
   if(log10.lo>=-17n*c.scale&&log10.hi<=17n*c.scale){const exp=yield ()=>c.exp(c.mul(log10,ln10)),number=c.roundScalarComponent(exp);if(number>=1/9e15&&number<9e15)return W.Core.BigNum.Decimal.fromComponents_noNormalize(sign,0,number);}
   const magnitude=c.roundLayerOneExponent(log10);if(Number.isFinite(magnitude)&&Math.abs(magnitude)<9e15)return W.Core.BigNum.Decimal.fromComponents_noNormalize(sign,1,magnitude);
   const negative=log10.hi<0n,positive=negative?{lo:-log10.hi,hi:-log10.lo}:log10,l=yield ()=>c.ln(positive),upper=c.round(c.div(l,ln10));return W.Core.BigNum.Decimal.fromComponents_noNormalize(sign,2,negative?-upper:upper);
  }catch(e){if(e.code!=='rank-cost-unresolved')throw e;}}fail('exact factor projection boundary unresolved');
 }
 W.Core.RankExact=Object.freeze({is,read,withWork,createWork,memo,estimate:v=>withWork(()=>{const c=C.context(80),a=normalizedInterval(prepareExact(v),c),mid=(a.value.lo+a.value.hi)/2n;return W.Core.BigNum.BN(String(mid)+'e'+String(a.exponent-80n));}),gPrefix:spec=>normalize([{coefficient:Q().decimal(1),factors:[{kind:'g-prefix',spec}]}]),log:(v,c)=>{const a=normalizedInterval(prepareExact(v),c);if(a.value.lo<=0n)fail('log value not positive');return c.add(c.ln(a.value),c.times(c.logFraction(10n,1n),a.exponent));},add,negate,subtract,multiply,divide,power,rankPower,compare:(a,b)=>withWork(()=>compareBody(a,b)),project:v=>withWork(()=>projectBody(v))});
}(window.WIS));
