(function(W){
 "use strict";
 // Exact supported rank costs for the admitted Schema74 runtime.
 const R=W.Core.Rank;
 const B=W.Core.BigNum,L=W.Core.SignedLedger,MAX_DIGITS=2048;
 const fail=message=>{throw Object.assign(Error(message),{code:'rank-cost-unresolved'});};

 // Runtime-only owner identities; no marker is serialized or trusted from JSON.
 const sessions=new WeakMap(),handles=new WeakMap();let activeSession=null;
 function freezeData(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freezeData(item);Object.freeze(value);}return value;}
 function assertSession(c){if(c.closed)throw Object.assign(Error('rank session closed'),{code:'rank-work-stale'});let current=false;try{current=c.isCurrent();}catch(e){}if(!current){c.closed=true;throw Object.assign(Error('rank session owner changed'),{code:'rank-work-stale'});}}
 function adopt(record,c=activeSession){if(!c)return record;if(!c.records.has(record)){freezeData(record);const handle=Object.freeze({});handles.set(handle,c);c.records.set(record,handle);c.values.set(handle,record);}return record;}
 function prepared(record){if(!activeSession)return read(record);assertSession(activeSession);if(activeSession.records.has(record))return record;return adopt(read(record));}
 function withSession(session,fn){const c=sessions.get(session);if(!c)fail('unknown budget session');assertSession(c);const previous=activeSession;activeSession=c;try{return W.Core.RankExact.withWork(fn,c.memo);}finally{activeSession=previous;}}
 function createSession({isCurrent=()=>true}={}){
  if(typeof isCurrent!=='function')fail('invalid session owner');const c={isCurrent,closed:false,records:new WeakMap(),values:new WeakMap(),views:new WeakMap(),costs:new WeakMap(),memo:new Map()};let session;
  const run=fn=>withSession(session,fn),value=handle=>{assertSession(c);if(handles.get(handle)!==c)fail('foreign budget handle');return c.values.get(handle);};
  const admit=record=>{if(handles.has(record)){value(record);return record;}const r=prepared(record);return c.records.get(r);};
  session=Object.freeze({admit:record=>run(()=>admit(record)),credit:(handle,income)=>run(()=>admit(credit(value(handle),income))),view:handle=>run(()=>viewBudget(value(handle))),settle:(handle,options={limit:null})=>run(()=>settle(value(handle),options)),close(){c.closed=true;c.costs=new WeakMap();for(const memo of c.memo.values())if(memo instanceof Map){W.Core.AmountProducts?.releaseWorkMemo?.(memo);memo.clear();}c.memo.clear();}});c.session=session;sessions.set(session,c);return session;
 }
 function viewBudget(record){const r=prepared(record),c=activeSession,h=c?.records.get(r);if(h&&c.views.has(h))return c.views.get(h);
  const rank=rankAt(r.originRank,BigInt(r.cursor),r.mode),remainder=subtract(r.funding,cumulative(r,r.cursor)),next=r.mode==='g-polynomial'?subtract(cumulative(r,String(BigInt(r.cursor)+1n)),cumulative(r,r.cursor)):nextPrice(r,r.cursor);
  let progress=r.mode==='g-polynomial'?remainder:divide(remainder,next);if(r.mode!=='g-polynomial'&&r.cursor==='0')progress=add(progress,r.initialFraction);
  const view=freezeData({rank,remainder,nextPrice:next,progress});if(h)c.views.set(h,view);return view;
 }
 function finishResult(result){return activeSession?{...result,record:adopt(result.record)}:result;}
 function qIdentities(){const memo=W.Core.RankExact?.memo('q-canonical');if(!memo)return new WeakSet();if(!memo.has('identities'))memo.set('identities',new WeakSet());return memo.get('identities');}
 function canonicalQ(value){freezeData(value);qIdentities().add(value);return value;}
 function shape(value,required,optional=[]){if(!value||typeof value!=='object'||Array.isArray(value)||required.some(k=>!Object.prototype.hasOwnProperty.call(value,k))||Object.keys(value).some(k=>!required.includes(k)&&!optional.includes(k)))fail('record fields invalid');}
 const abs=n=>n<0n?-n:n,gcd=(a,b)=>{a=abs(a);b=abs(b);while(b){const t=a%b;a=b;b=t;}return a;};
 function integer(v,positive=false){if(!['string','number','bigint'].includes(typeof v))fail('integer input type');if(typeof v==='number'&&!Number.isSafeInteger(v))fail('unsafe integer input');const s=String(v);if(!/^-?\d+$/.test(s)||s.replace('-','').length>MAX_DIGITS)fail('integer capacity/format');const n=BigInt(s);if(positive&&n<=0n)fail('positive denominator required');return n;}
 const integerCapacity=10n**BigInt(MAX_DIGITS),negativeIntegerCapacity=-integerCapacity;const check=n=>{if(n>=integerCapacity||n<=negativeIntegerCapacity)fail('exact rational digit capacity');return n;};
 function canonicalWord(text){
  const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);if(!m)return text;
  let n=BigInt(m[1]+m[2]+(m[3]||'')),e=BigInt(m[4]||0)-BigInt((m[3]||'').length);if(!n)return '0';while(n%10n===0n){n/=10n;e++;}return String(n)+'e'+String(e);
 }
 function normalizeWords(inputs){
  let words=inputs.map(validWord);for(let pass=0;pass<=L.MAX_TERMS+1;pass++){
   const next=L.strict.normalize(words).map(canonicalWord);if(JSON.stringify(next)===JSON.stringify(words))return next;words=next;
  }fail('sparse canonicalization capacity');
 }
 function validWord(raw){
  if(typeof raw!=='string'||raw.length>4096)fail('word capacity/format');
  const m=/^(.*?)(?:\*([1-9]\d*))?$/.exec(raw),text=m[1].trim().replace(/^\+/, '').replace(/^(-?)\./, '$10.');
  if(!B.isNumericText(text)||(m[2]&&m[2].length>MAX_DIGITS))fail('invalid numeric word');
  // Validate via the ledger's bounded sparse projection. Native Decimal parsing
  // cannot read the very long exponent strings that its normalizer emits.
  try{L.project(text);}catch(error){if(error instanceof L.LedgerError)fail('invalid numeric word');throw error;}
  return canonicalWord(text)+(m[2]?'*'+m[2]:'');
 }
 function denseWords(terms){
  const rows=[];for(const raw of terms){const c=/^(.*?)(?:\*([1-9]\d*))?$/.exec(raw),m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(c[1]);if(!m)return null;
   const n=BigInt(m[1]+m[2]+(m[3]||''))*BigInt(c[2]||1),e=BigInt(m[4]||0)-BigInt((m[3]||'').length);if(abs(e)>BigInt(MAX_DIGITS))return null;rows.push({n,e:Number(e)});
  }
  if(!rows.length)return {n:0n,d:1n};const e=Math.min(0,...rows.map(r=>r.e));
  if(rows.some(r=>abs(r.n).toString().length+r.e-e>MAX_DIGITS))return null;
  return {n:rows.reduce((v,r)=>v+r.n*10n**BigInt(r.e-e),0n),d:10n**BigInt(-e)};
 }
 function reduceSparse(words,d){
  const rows=words.map(word=>{const m=/^(-?\d+)e([+-]?\d+)$/.exec(word);if(m)return {n:BigInt(m[1]),e:BigInt(m[2])};const c=/^(-?)(.*?)(?:\*([1-9]\d*))?$/.exec(word);return {n:(c[1]?-1n:1n)*BigInt(c[3]||1),atom:c[2]};});
  let common=d;for(const row of rows)common=gcd(common,row.n);if(common>1n){for(const row of rows)row.n/=common;d/=common;}
  if(rows.every(row=>row.atom===undefined)){
   let twos=0n,fives=0n;while(d%2n===0n){d/=2n;twos++;}while(d%5n===0n){d/=5n;fives++;}
   const shift=twos>fives?twos:fives,multiplier=2n**(shift-twos)*5n**(shift-fives);
   for(const row of rows){row.n=check(row.n*multiplier);row.e-=shift;}
  }
  const reduced=rows.map(row=>{check(row.n);if(row.atom===undefined)return String(row.n)+'e'+String(row.e);return (row.n<0n?'-':'')+row.atom+(abs(row.n)===1n?'':'*'+String(abs(row.n)));});
  return {words:normalizeWords(reduced),d:check(d)};
 }
 function makePair(n,d){const g=gcd(n,d);n=check(n/g);d=check(d/g);return canonicalQ({terms:n===0n?[]:[canonicalWord(String(n))],denominator:String(d)});}
 function make(terms,denominator=1n){
  let d=integer(denominator,true),words=normalizeWords(terms);
  const dense=denseWords(words);
  if(dense)return makePair(dense.n,d*dense.d);
  else {const reduced=reduceSparse(words,d);words=reduced.words;d=reduced.d;}
  for(const word of words)if(word.length>4096)fail('word capacity/format');return canonicalQ({terms:words,denominator:String(d)});
 }
 const exact=v=>W.Core.RankExact?.is(v);
 function readQ(v){if(qIdentities().has(v))return v;if(exact(v))return W.Core.RankExact.read(v);shape(v,['terms','denominator']);if(!Array.isArray(v.terms)||v.terms.length>L.MAX_TERMS)fail('rational ledger shape');return make(v.terms,integer(v.denominator,true));}
 function decimal(value){if(typeof value!=='number'&&typeof value!=='string'&&!B.isDecimal(value))fail('invalid decimal');const text=String(value),cache=W.Core.RankExact?.memo('q-decimal');if(cache?.has(text))return cache.get(text);const result=make([text]);if(cache){if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(text,result);}return result;}
 const fraction=(n,d)=>makePair(integer(n),integer(d,true));
 function scale(v,n,d=1n){if(exact(v))return W.Core.RankExact.multiply(v,fraction(n,d));v=readQ(v);n=integer(n);d=integer(d,true);return make(L.scale(v.terms,String(n)),BigInt(v.denominator)*d);}
 function add(a,b){if(exact(a)||exact(b))return W.Core.RankExact.add(a,b);a=readQ(a);b=readQ(b);const x=BigInt(a.denominator),y=BigInt(b.denominator),g=gcd(x,y);return make(L.strict.add(L.scale(a.terms,String(y/g)),L.scale(b.terms,String(x/g))),x*(y/g));}
 const negate=a=>{if(exact(a))return W.Core.RankExact.negate(a);a=readQ(a);return make(L.negate(a.terms),BigInt(a.denominator));};
 const subtract=(a,b)=>add(a,negate(b));
 function compare(a,b){if(exact(a)||exact(b))return W.Core.RankExact.compare(a,b);a=readQ(a);b=readQ(b);const x=BigInt(a.denominator),y=BigInt(b.denominator),g=gcd(x,y);return L.strict.compare(L.scale(a.terms,String(y/g)),L.scale(b.terms,String(x/g)));}
 function pair(v){v=readQ(v);const p=denseWords(v.terms);if(!p)fail('rational expansion capacity');let n=p.n,d=p.d*BigInt(v.denominator),g=gcd(n,d);n/=g;d/=g;return {n:check(n),d:check(d)};}
 function sparseProduct(a,b){a=readQ(a);b=readQ(b);const parse=word=>{const m=/^(-?)(\d+)e([+-]?\d+)$/.exec(word);if(!m)fail('non-decimal product needs a factor proof');return {n:BigInt(m[1]+m[2]),e:BigInt(m[3])};},terms=[];
  for(const aw of a.terms)for(const bw of b.terms){const x=parse(aw),y=parse(bw);let n=x.n*y.n,e=x.e+y.e;while(n&&n%10n===0n){n/=10n;e++;}check(n);if(abs(e).toString().length>MAX_DIGITS)fail('sparse product exponent capacity');terms.push(String(n)+'e'+String(e));}
  return make(terms,BigInt(a.denominator)*BigInt(b.denominator));
 }
 function multiply(a,b){if(exact(a)||exact(b))return W.Core.RankExact.multiply(a,b);let p;try{p=pair(b);}catch(error){if(error.code!=='rank-cost-unresolved')throw error;try{p=pair(a);return scale(b,p.n,p.d);}catch(next){if(next.code!=='rank-cost-unresolved')throw next;return sparseProduct(a,b);}}return scale(a,p.n,p.d);}
 function dividePlain(a,b){const p=pair(b);if(!p.n)fail('division by zero');return scale(a,p.n<0n?-p.d:p.d,abs(p.n));}
 function divide(a,b){if(exact(a)||exact(b))return W.Core.RankExact.divide(a,b);try{return dividePlain(a,b);}catch(e){if(e.code!=='rank-cost-unresolved'||!W.Core.RankExact)throw e;return W.Core.RankExact.divide(a,b);}}
 function power(value,exponent){let k;try{k=exponent&&typeof exponent==='object'&&exponent.kind==='wis-rank'?cursor(exponent):integer(exponent);}catch(error){if(error.code!=='rank-cost-unresolved'||!W.Core.RankExact)throw error;const rank=rankCount(exponent);return W.Core.RankExact.rankPower(value,R.difference(rank,0));}let {n,d}=pair(value);if(k<0n){if(!n)fail('zero inverse');[n,d]=[d,n];k=-k;}if(n<0n||d<=0n)fail('power base must be nonnegative');
  if(k===0n||n===d)return one();if(n===0n)return zero();
  const bits=Math.max(abs(n).toString(2).length,d.toString(2).length);
  // An allocation guard, never a rank limit. Work depends on bounded input
  // digits and logarithmic exponentiation, not a loop over promoted ranks.
  if(k>0n&&bits>1&&k>BigInt(MAX_DIGITS*4)/BigInt(bits)){if(W.Core.RankExact)return W.Core.RankExact.power(fraction(n,d),String(k));fail('power proof exceeds exact local capacity');}
  return fraction(check(n**k),check(d**k));
 }
 const project=v=>{if(exact(v))return W.Core.RankExact.project(v);v=readQ(v);return B.div(L.value(v.terms),L.project(v.denominator));};
 const zero=()=>decimal(0),one=()=>decimal(1);
 const Q=Object.freeze({dividePlain,fractionPair:v=>{const p=pair(v);return {n:String(p.n),d:String(p.d)};},fromRank:v=>make(R.difference(v,0)),decimal,fraction,read:readQ,add,subtract,multiply,divide,compare,power,project,negate,limits:Object.freeze({digits:MAX_DIGITS,terms:L.MAX_TERMS})});
 function rankCount(value){try{return R.read(typeof value==='bigint'?String(value):value);}catch(error){fail('rank count invalid');}}
 function storedRank(value){const rank=rankCount(value);return typeof rank==='number'?String(rank):rank;}
 function cursor(value){return BigInt(W.Core.RankMath.integerDifference(0,rankCount(value)));}
 function rankAt(origin,count,mode){return count===0n?R.read(origin):R.add(origin,String(count+(mode!=='g-polynomial'&&R.compare(origin,3)<0?2n:0n)));}
 const target=(rank,mode)=>mode!=='g-polynomial'&&R.compare(rank,3)<0?R.read(3):R.add(rank,1);
 function create({rank=0,funding='0',mode='raw',initialFraction,d6=false,pricing='raw',treeDelta='0',challenge=null,reward=false}){
  const S=W.Core.State,args=[rank,funding,mode,initialFraction,d6,pricing,treeDelta,challenge,reward],steps=()=>createSteps(...args);
  // Identity keys are valid only when EVERY object input belongs to this
  // immutable private load; a mixed mutable argument always takes fresh work.
  const sealed=value=>S?.isSealedLoadInput(value)===true,retained=args.some(sealed)&&args.every(value=>value===null||typeof value!=='object'&&typeof value!=='function'||sealed(value));
  return retained?S.normalizationTask('load-budget-create',args,function*(){return freezeData(yield* steps());}):drainReadSteps(steps);
 }
 function* createSteps(rank,funding,mode,initialFraction,d6,pricing,treeDelta,challenge,reward){
  if(initialFraction===undefined)initialFraction=zero();
  const originRank=R.serialize(rank);if(mode==='g-polynomial'?R.compare(originRank,1)<0:R.compare(originRank,0)>0&&R.compare(originRank,3)<0)fail('rank is not open');if(!['raw','boosted','g-polynomial'].includes(mode))fail('unknown price curve');
  const initial=yield ()=>readQ(initialFraction);if((yield ()=>compare(initial,zero()))<0||(yield ()=>compare(initial,one()))>=0||mode!=='boosted'&&(yield ()=>compare(initial,zero()))!==0)fail('invalid initial partial target');
  const funds=yield ()=>funding&&Array.isArray(funding.terms)?readQ(funding):decimal(funding);if((yield ()=>compare(funds,zero()))<0)fail('negative funding');
  const record={kind:'wis-fixed-rank-budget',version:1,originRank,mode,initialFraction:initial,funding:funds,cursor:'0',targetRank:R.serialize(target(originRank,mode))};
  if(mode==='g-polynomial'){if(![null,'trueGraham'].includes(challenge)||typeof reward!=='boolean')fail('G challenge/reward curve invalid');if(typeof d6!=='boolean'||!['raw','base'].includes(pricing))fail('G rules invalid');const delta=storedRank(treeDelta),extended=typeof delta==='object';record.gRules={version:extended?3:challenge||reward?2:1,d6,pricing,treeDelta:delta,...(extended||challenge||reward?{challenge,reward}:{})};}
  return adopt(record);
 }
 function curve(record){const boosted=record.mode==='boosted',ratio=boosted?fraction(7,6):fraction(7,5);
  return {first:subtract(one(),record.initialFraction),next:boosted&&R.compare(record.originRank,3)<0?fraction(175,216):ratio,ratio};
 }
 function gCumulative(record,count){
  if(record.gRules.challenge||record.gRules.reward)return W.Core.RankGCost.cost(record,count);
  // Prepared records are detached/frozen by the budget boundary. Funding and
  // cursor do not affect a fee; all actual fee inputs participate in this key.
  const key=JSON.stringify([record.originRank,record.gRules,String(count)]);
  return W.Core.CertifiedRankMath.task('g-fee|'+key,()=>gCumulativeSteps(record,count));
 }
 function gRawRange(start,count,d6){if(count===0n)return zero();let left=count,total=zero(),g=start;
  if(R.compare(start,64)<0){let at=BigInt(String(R.project(start))),n=left<64n-at?left:64n-at;
   if(d6){const regular=at<58n?(n<58n-at?n:58n-at):0n;
    total=add(total,fraction(regular*(200n-2n*at-regular+1n),2n));total=add(total,decimal(String((n-regular)*42n)));
   }else total=decimal(String(100n*n));left-=n;at+=n;g=R.read(String(at));
  }
  if(left&&d6&&R.compare(g,64)===0){total=add(total,decimal(42));g=R.add(g,1);left--;}
  if(!left)return total;
  const rank=make(R.difference(g,0)),x=subtract(rank,decimal(56)),n=decimal(String(left)),pairs=multiply(n,decimal(String(left-1n))),sum1=divide(pairs,decimal(2)),sum2=divide(multiply(pairs,decimal(String(2n*left-1n))),decimal(6));
  let polynomial=multiply(fraction(25,16),add(add(multiply(n,multiply(x,x)),multiply(x,pairs)),sum2));
  if(d6)polynomial=subtract(polynomial,add(multiply(n,rank),sum1));return add(total,polynomial);
 }
 function gNumerator(record,count){let left=count,g=record.originRank,total=zero();const {d6,pricing}=record.gRules;
  if(pricing==='base'&&R.compare(g,64)<0){let at=BigInt(String(R.project(g)));for(const end of [2n,4n,8n,16n,32n,64n]){if(at>=end||!left)continue;const n=left<end-at?left:end-at,k=2n**BigInt([2n,4n,8n,16n,32n].filter(v=>v<=at).length);
    total=add(total,divide(gRawRange(R.read(String(at)),n,d6),decimal(String(k))));at+=n;left-=n;}g=R.read(String(at));
  }
  if(left)total=add(total,divide(gRawRange(g,left,d6),decimal(pricing==='base'?32:1)));
  return total;
 }
 function* gCumulativeSteps(record,count){
  // The bounded polynomial prefix has no proof loop. Retain it across the
  // potentially suspending exponent and final division, without per-op yields.
  const total=yield ()=>gNumerator(record,count);
  const divisor=yield ()=>power(decimal(10),record.gRules.treeDelta);
  return yield ()=>divide(total,divisor);
 }
 // Cost inputs are unchanged by funding/cursor updates. Only admitted records
 // and their private working copies can inherit this session-local memo.
 function inheritCosts(source,target){if(!activeSession||!activeSession.records.has(source)&&!activeSession.costs.has(source))return;
  let memo=activeSession.costs.get(source);if(!memo){memo=new Map();activeSession.costs.set(source,memo);}activeSession.costs.set(target,memo);}
 function cumulative(record,count){
  count=cursor(count);let memo=null;
  if(activeSession&&(activeSession.records.has(record)||activeSession.costs.has(record))){assertSession(activeSession);memo=activeSession.costs.get(record);if(!memo){memo=new Map();activeSession.costs.set(record,memo);}}
  const key=String(count);if(memo?.has(key))return memo.get(key);
  const value=cumulativeBody(record,count);if(memo){if(memo.size>=256)memo.delete(memo.keys().next().value);memo.set(key,freezeData(value));}return value;
 }
 function cumulativeBody(record,count){if(count===0n)return zero();if(record.mode==='g-polynomial')return gCumulative(record,count);const {first,next,ratio}=curve(record);if(count===1n)return first;
  return add(first,multiply(next,divide(subtract(power(ratio,String(count-1n)),one()),subtract(ratio,one()))));
 }
 function nextPrice(record,count){count=cursor(count);if(count===0n)return one();const {next,ratio}=curve(record);return multiply(next,power(ratio,String(count-1n)));}
 function readHeader(record){
  shape(record,['kind','version','originRank','mode','initialFraction','funding','cursor','targetRank'],['gRules','legacy']);
  if(record.mode==='g-polynomial')shape(record.gRules,[2,3].includes(record.gRules?.version)?['version','d6','pricing','treeDelta','challenge','reward']:['version','d6','pricing','treeDelta']);else if(Object.prototype.hasOwnProperty.call(record,'gRules'))fail('G rules on TREE budget');
  if(!record||record.kind!=='wis-fixed-rank-budget'||record.version!==1)fail('budget version/shape');
  if(record.mode==='g-polynomial'&&(!record.gRules||![1,2,3].includes(record.gRules.version)||typeof record.gRules.d6!=='boolean'||record.gRules.pricing==null||record.gRules.treeDelta==null))fail('G rules version/shape');
  const out={...create({rank:record.originRank,funding:record.funding,mode:record.mode,initialFraction:record.initialFraction,...(record.gRules||{})})};out.cursor=String(cursor(record.cursor));
  const actualTarget=target(rankAt(out.originRank,BigInt(out.cursor),out.mode),out.mode);if(R.compare(record.targetRank,actualTarget)!==0)fail('target/cursor mismatch');out.targetRank=R.serialize(actualTarget);
  return out;
 }
 function readLegacy(record,out){
  if(Object.prototype.hasOwnProperty.call(record,'legacy')){if(out.mode!=='raw')fail('legacy TREE unit on another price model');const a=record.legacy;shape(a,['version','rule','requirement','entry']);if(a.version!==1||a.rule!=='schema73')fail('legacy basis version');const requirement=B.parseFinite(a.requirement),entry=B.parseFinite(a.entry);if(!requirement||!requirement.gt(0)||!entry||entry.lt(1))fail('legacy unit invalid');
   if(W.Core.RankProjection)W.Core.RankProjection.read(out.originRank,a.requirement);else {const originTarget=target(out.originRank),oldReq=W.Meta.BigNumbers.treeSuperRequirement({},R.project(originTarget));if(!B.eq(oldReq,requirement))fail('legacy target unit mismatch');}
   out.legacy={version:1,rule:'schema73',requirement:String(a.requirement),entry:String(a.entry)};
  }
  return out;
 }
 function drainReadSteps(steps){const iterator=steps();let next=iterator.next();while(!next.done)next=iterator.next(typeof next.value==='function'?next.value():undefined);return next.value;}
 function read(record){const S=W.Core.State,steps=()=>readSteps(record);return S?.isSealedLoadInput(record)?S.normalizationTask('load-budget-read',[record],steps):drainReadSteps(steps);}
 function* readSteps(record){const out=yield ()=>readHeader(record);
  if((yield ()=>compare(out.funding,cumulative(out,out.cursor)))<0)fail('paid work exceeds funding');
  yield ()=>readLegacy(record,out);return W.Core.State?.isSealedLoadInput(record)?freezeData(out):out;
 }
 function* prepareSteps(record){
  if(activeSession){assertSession(activeSession);if(activeSession.records.has(record))return record;}
  const out=yield ()=>readHeader(record),paid=yield ()=>compare(out.funding,cumulative(out,out.cursor));
  if(paid<0)fail('paid work exceeds funding');yield ()=>readLegacy(record,out);return adopt(out);
 }
 function fromLegacy({rank,progress,entry,requirement}){const record={...create({rank,funding:progress,mode:'raw'})};record.legacy={version:1,rule:'schema73',requirement:String(requirement),entry:String(entry)};return read(record);}
 function credit(record,value){const source=prepared(record),out={...source};inheritCosts(source,out);const income=value&&Array.isArray(value.terms)?readQ(value):decimal(value);if(compare(income,zero())<0)fail('negative income');out.funding=add(out.funding,income);return adopt(out);}
 function creditExposure(record,{exposure,entry,requirement}){
  const out=prepared(record);if(!out.legacy||!B.eq(entry,out.legacy.entry)||!B.eq(requirement,out.legacy.requirement))fail('exposure unit mismatch');
  const e=B.parseFinite(exposure);if(!e||e.lt(0))fail('negative/invalid exposure');
  // Already represented legacy anchors retain authority; small relative powers
  // are kept rational separately, never reconstructed from huge log subtraction.
  const ratio=W.Core.StableProductQuotient.evaluate([entry],[requirement]);return credit(out,multiply(decimal(exposure),decimal(String(ratio))));
 }
 function available(record){const out=prepared(record);return subtract(out.funding,cumulative(out,out.cursor));}
 function requirementScale(record,delta){prepared(record);return power(fraction(7,5),delta);}
 function modelRules(){const c=W.Meta.InfinityConfig;if(c.treeGBase!==10||c.treeGStart!==3||c.treeTimeGrowth!==1.4||c.treeRankBoost!==1.2||c.gRequirement!==100||c.gCapacityStart!==64||c.gCapacityDivisor!==8||c.gCapacityPower!==2||c.gRankMinimum!==42||c.gRewardExponent!==.95||c.gChallengeCoefficient!==.01)fail('rank curve differs from current rule');}
 const estimate=v=>exact(v)?W.Core.RankExact.estimate(v):project(v);
 function gHint(record){
  if(record.mode!=='g-polynomial')return null;
  try{const r=record.gRules;
   // Remove the huge common rank-square before projecting an ordinary local count.
   // Projecting F and price separately loses a million-rank coefficient at ee20.
   if(!r.reward&&!r.challenge&&R.compare(record.originRank,'1e12')>0){const origin=make(R.difference(record.originRank,0)),basis=multiply(origin,origin),money=estimate(divide(record.funding,basis)),fee=estimate(divide(cumulative(record,'1'),basis)),local=B.div(money,fee);
    if(B.lt(B.div(local,R.project(record.originRank)),'1e-8')){const candidate=R.read(local.floor());return R.compare(candidate,0)>0?BigInt(W.Core.RankMath.integerDifference(0,candidate)):null;}}
   const alpha=r.reward?.95:1,g=R.project(record.originRank),gross=B.mul(estimate(record.funding),B.mul(r.pricing==='base'?32:1,B.pow10(B.mul(R.project(r.treeDelta),alpha))));let count;
   if(r.challenge==='trueGraham'){let end=B.max(g,B.div(B.log10(gross),.02*alpha));for(let j=0;j<5;j++){const capacity=B.pow(B.add(1,B.div(B.max(0,B.sub(end,64)),8)),2),coefficient=B.pow(B.mul(100,capacity),alpha);end=B.div(B.sub(B.log10(B.mul(gross,1-Math.pow(10,-.02*alpha))),B.log10(coefficient)),.02*alpha);}count=B.add(B.sub(end,g),1);}
   else {const x=B.max(0,B.sub(g,56)),p=2*alpha+1,A=B.pow(25/16,alpha);const relative=B.eq(x,0)?B.ONE:B.div(B.mul(gross,p),B.mul(A,B.pow(x,p)));count=B.gt(x,0)&&B.lt(B.abs(relative),'1e-8')?B.div(gross,B.mul(A,B.pow(x,p-1))):B.sub(B.pow(B.add(B.pow(x,p),B.div(B.mul(gross,p),A)),1/p),x);}
   const candidate=R.read(count.floor());return R.compare(candidate,0)>0?BigInt(W.Core.RankMath.integerDifference(0,candidate)):null;
  }catch(error){if(W.Core.CertifiedRankMath?.isSuspension(error))throw error;return null;}
 }
 function affordableHint(record){
  if(record.mode==='g-polynomial')return gHint(record);
  try{const {first,next,ratio}=curve(record),remaining=estimate(subtract(record.funding,first)),r=estimate(ratio),scaled=B.div(B.mul(remaining,B.sub(r,1)),estimate(next));
   const count=B.add(1,B.div(B.log10(B.add(1,scaled)),B.log10(r))).floor(),rank=R.read(count);return R.compare(rank,0)>0?BigInt(W.Core.RankMath.integerDifference(0,rank)):null;
  }catch(e){if(W.Core.CertifiedRankMath?.isSuspension(e))throw e;return null;}
 }
 function* solveSteps(record,{limit=null}={}){
  modelRules();const source=yield ()=>prepared(record),out={...source};inheritCosts(source,out);const start=BigInt(out.cursor),cap=limit===null?null:start+cursor(limit),funds=out.funding,spentBefore=yield ()=>cumulative(out,String(start));let lo=start,hi=start+1n,hiCost,hiUnresolved=false,operations=0,exact=false;
  // Every configured next price is strictly positive. Equality to the already
  // paid prefix proves no further target can be afforded, even if its exact
  // expression exceeds local arithmetic capacity.
  if((yield ()=>compare(funds,spentBefore))===0){return {record:out,count:'0',rank:rankAt(out.originRank,start,out.mode),spent:zero(),remainder:zero(),progress:start===0n?out.initialFraction:zero(),certificate:{kind:'exact-rational-cumulative',limited:cap===start,positiveNextPrice:true,lower:String(start),upper:String(start+1n),operations:0}};}
  // Keep every earned unit; ordinary no-promotion frames need no inverse search.
  const belowNext=cap===start||((yield ()=>compare(funds,cumulative(out,String(start+1n))))<0);
  if(belowNext){const remainder=subtract(funds,spentBefore);let progress=out.mode==='g-polynomial'?remainder:divide(remainder,nextPrice(out,start));if(out.mode!=='g-polynomial'&&start===0n)progress=add(progress,out.initialFraction);
   return {record:out,count:'0',rank:rankAt(out.originRank,start,out.mode),spent:zero(),remainder,progress,certificate:{kind:'exact-rational-cumulative',limited:cap===start,positiveNextPrice:true,lower:String(start),upper:cap===start?null:String(start+1n),operations:0}};
  }
  function* at(n){operations++;const value=yield ()=>cumulative(out,String(n));yield {phase:'cost',cursor:String(n)};return value;}
  // Floating estimates choose query locations only. Every resulting bound is
  // established by the same exact/interval fee comparison as the fallback.
  let suggested=yield ()=>affordableHint(out);
  if(suggested!==null){let upper=null,lower=start,k=suggested;
   for(let j=0;j<4;j++){
    k=k<=lower?lower+1n:k;if(cap!==null&&k>cap)k=cap;if(k<=start)break;
    let value,compared;try{value=yield* at(k);compared=yield ()=>compare(value,funds);}catch(error){if(error.code!=='rank-cost-unresolved')throw error;break;}
    if(compared<=0)lower=k;else upper=k;
    if(compared===0){exact=true;break;}if(cap!==null&&lower===cap||upper!==null&&upper-lower<=1n)break;
    let next=null;try{const adjacent=yield* at(k+1n);next=yield ()=>{const fee=subtract(adjacent,value),delta=B.div(estimate(subtract(funds,value)),estimate(fee)),rounded=delta.floor(),rank=R.read(rounded.lt(0)?rounded.neg():rounded),text=W.Core.RankMath.integerDifference(0,rank),step=BigInt(text)*(rounded.lt(0)?-1n:1n);return k+step;};}catch(error){if(W.Core.CertifiedRankMath?.isSuspension(error))throw error;next=null;}
    if(next!==null&&(next===k||next<=lower))next=lower+1n;
    if(next===null||upper!==null&&next>=upper)next=upper===null?lower+1n:(lower+upper)/2n;k=next;
   }
   lo=lower;hi=upper===null?lo+1n:upper;
  }
  if(cap!==null&&hi>cap)hi=cap;
  if(hi>lo&&!exact){for(;;){try{hiCost=yield* at(hi);hiUnresolved=false;const compared=yield ()=>compare(hiCost,funds);if(compared>0)break;lo=hi;if(compared===0){exact=true;break;}if(cap!==null&&lo===cap)break;hi=cap===null?start+2n*(hi-start):start+2n*(hi-start)>cap?cap:start+2n*(hi-start);}catch(error){if(error.code!=='rank-cost-unresolved'&&!(error instanceof L.LedgerError))throw error;hiUnresolved=true;break;}}
   while(!exact&&hi-lo>1n){const mid=(hi+lo)/2n;try{const c=yield* at(mid),compared=yield ()=>compare(c,funds);if(compared<=0){lo=mid;if(compared===0){exact=true;break;}}else{hi=mid;hiCost=c;hiUnresolved=false;}}catch(error){if(error.code!=='rank-cost-unresolved'&&!(error instanceof L.LedgerError))throw error;hi=mid;hiUnresolved=true;}}
  }
  const limited=cap!==null&&lo===cap;
  if(!limited&&!exact&&(hi===lo||hiUnresolved))fail('adjacent cost cannot be certified within capacity');
  const spentTotal=yield* at(lo),remainder=subtract(funds,spentTotal);
  if((yield ()=>compare(remainder,zero()))<0||!limited&&!exact&&(yield ()=>compare(funds,hiCost))>=0)fail('adjacent boundary unresolved');
  const rank=rankAt(out.originRank,lo,out.mode);out.cursor=String(lo);out.targetRank=R.serialize(target(rank,out.mode));
  let progress=yield ()=>compare(remainder,zero())===0?zero():out.mode==='g-polynomial'?remainder:divide(remainder,nextPrice(out,lo));if(out.mode!=='g-polynomial'&&lo===0n)progress=add(progress,out.initialFraction);
  return {record:out,count:String(lo-start),rank,spent:subtract(spentTotal,spentBefore),remainder,progress,certificate:{kind:'exact-rational-cumulative',limited,positiveNextPrice:exact,lower:String(lo),upper:limited?null:String(lo+1n),operations}};
 }
 function guardError(error){if(error instanceof L.LedgerError){const e=Object.assign(Error(error.message),{code:'rank-cost-unresolved',causeCode:error.code||'signed-ledger'});return e;}return error;}
 function settleBody(record,options){try{return finishResult(W.Core.CertifiedRankMath.task('budget|'+JSON.stringify([record,options||{}]),()=>solveSteps(record,options)));}catch(error){throw guardError(error);}}
 function settle(record,options){return W.Core.RankExact?W.Core.RankExact.withWork(()=>settleBody(record,options)):settleBody(record,options);}
 function createWork(record,{isCurrent=()=>true,...options}={}){
  const key=JSON.stringify(record),work=W.Core.RankExact.createWork(()=>settle(record,options),{isCurrent:()=>isCurrent()&&JSON.stringify(record)===key});
  return Object.freeze({advance({maximumQueries=8,maximumOperations=maximumQueries*128,deadline=Infinity}={}){if(!Number.isSafeInteger(maximumQueries)||maximumQueries<1||maximumQueries>65536)fail('invalid work slice');const result=work.advance({maximumOperations:Math.min(65536,maximumOperations),deadline});return {...result,queries:0};},result:()=>work.result(),cancel:()=>work.cancel()});
 }
 W.Core.RankBudget=Object.freeze({Q,Budget:Object.freeze({createSession,withSession,activeSession:()=>activeSession?.session||null,prepareSteps,prepare:prepared,view:viewBudget,currentRank:record=>{const r=prepared(record);return rankAt(r.originRank,BigInt(r.cursor),r.mode);},create,read,fromLegacy,credit,creditExposure,available,requirementScale,settle,createWork,cost:(record,count)=>cumulative(prepared(record),count)})});
}(window.WIS));
