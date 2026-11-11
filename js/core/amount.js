(function defineAmount(WIS) {
  'use strict';
  // Confirmed represented quantities, not an unbounded real-number evaluator.
  // This module is not assembled until every economic consumer is admitted.
  const B=WIS.Core.BigNum,L=WIS.Core.AmountLedger,R=WIS.Core.Rank;
  if(!B||!L||!R)throw Object.assign(Error('Amount requires BigNum, AmountLedger and Rank'),{code:'amount-dependency'});
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),known=new WeakSet(),canonicalWords=new WeakMap(),storedPairs=new WeakMap();
  let zeroAmount=null,oneAmount=null;
  const fail=(message,code='amount-invalid')=>{throw Object.assign(Error(message),{code});};
  // Bounded, immutable literal parser data only. Quantities, balances and
  // candidate results never enter this cache; the native parser is unchanged.
  const scalarTokens=new Map();let scalarTokenCharacters=0;
  function numericScalar(text){
    if(scalarTokens.has(text)){const entry=scalarTokens.get(text);scalarTokens.delete(text);scalarTokens.set(text,entry);return entry.value;}
    if(!B.isNumericText(text))return null;const parsed=B.parseFinite(text)||L.project(text);if(!B.isFiniteBN(parsed))return null;
    const value=Object.freeze(B.Decimal.fromComponents_noNormalize(parsed.sign,parsed.layer,parsed.mag)),characters=text.length+48;
    if(characters<=8192){while(scalarTokens.size>=4096||scalarTokenCharacters+characters>2097152){const key=scalarTokens.keys().next().value;scalarTokenCharacters-=scalarTokens.get(key).characters;scalarTokens.delete(key);}scalarTokens.set(text,{value,characters});}return value;
  }
  // Pure literal text only; no quantity or candidate result is retained.
  // Decimal components are mutable, and custom conversion remains dynamic.
  const decimalLiterals=new WeakMap(),decimalPrototype=B.Decimal.prototype,decimalToString=decimalPrototype.toString;
  function decimalLiteral(value){
    const sign=Object.getOwnPropertyDescriptor(value,'sign'),layer=Object.getOwnPropertyDescriptor(value,'layer'),mag=Object.getOwnPropertyDescriptor(value,'mag');
    const standard=Object.getPrototypeOf(value)===decimalPrototype&&decimalPrototype.toString===decimalToString&&!own(value,'toString')&&value[Symbol.toPrimitive]===undefined&&sign&&'value'in sign&&layer&&'value'in layer&&mag&&'value'in mag;
    const previous=standard?decimalLiterals.get(value):null;
    if(previous&&Object.is(previous.sign,sign.value)&&Object.is(previous.layer,layer.value)&&Object.is(previous.mag,mag.value))return previous.text;
    const source=value;value=String(value);
    if(standard)decimalLiterals.set(source,{sign:sign.value,layer:layer.value,mag:mag.value,text:value});
    return value;
  }
  function atom(value){
    if(B.isDecimal(value))value=decimalLiteral(value);
    else if(typeof value==='number'){if(!Number.isFinite(value))fail('quantity must be finite');value=String(value);}
    if(L.isProduct?.(value)){L.validate(value);return value;}
    if(L.isRatio?.(value)){L.validate(value);return value;}
    if(typeof value!=='string'||!value.trim()||value.length>8192)fail('quantity atom invalid');
    const text=value.trim(),match=/^(.*?)(?:\*([1-9]\d*))?$/.exec(text),body=match[1];
    if(match[2]&&match[2].length>2048)fail('quantity repetition exceeds capacity','amount-unresolved');
    if(!numericScalar(body))fail('quantity atom invalid');
    return text;
  }
  function normalized(values,knownKey){
    if(!Array.isArray(values)||values.length>4096)fail('quantity words exceed capacity','amount-unresolved');
    const prepared=WIS.Core.AmountProducts.preparedView(values);if(prepared)return prepared;
    const key=knownKey===undefined?WIS.Core.AmountProducts.inputKey(values):knownKey,memo=key===null?null:WIS.Core.AmountProducts.workMemo('amount-normalized-words');
    if(memo?.has(key))return memo.get(key);
    let paged=false;const text=values.map(v=>{if(typeof v==='string'&&/^-?@sum:/.test(v)){paged=true;if(v.length>1048576)fail('quantity page exceeds capacity','amount-unresolved');return v;}return atom(v);});
    let count=0;if(paged)for(const leaf of L.expand(text)){if(++count>65536)fail('quantity leaves exceed capacity','amount-unresolved');atom(leaf);}
    const normalized=L.safeNormalize(text),result=WIS.Core.AmountProducts.preparedView(normalized)||Object.freeze(normalized);if(memo)memo.set(key,result);return result;
  }
  const full=a=>[a.main,...a.tail];
  function make(values,knownKey){return WIS.Core.CertifiedRankMath.withWork(()=>makeInWork(values,knownKey));}
  function makeInWork(values,knownKey){
    const words=normalized(values,knownKey),key=WIS.Core.AmountProducts.inputKey(words),memo=key===null?null:WIS.Core.AmountProducts.workMemo('amount-canonical-nodes');
    if(memo?.has(key))return memo.get(key);
    const sign=L.strict.sign(words);if(sign<0)fail('quantity balance is negative','amount-negative');
    if(sign===0&&words.length){const value=zeroAmount||make([]);if(memo)memo.set(key,value);return value;}
    let parts=null;
    const projection=()=>WIS.Core.CertifiedRankMath.withWork(()=>{
      if(parts)return parts;
      let main=L.value(words);
      if(sign>0&&B.lte(main,0))main=WIS.Core.AmountProducts.value(words);
      if(!B.isFiniteBN(main)||B.lt(main,0)||sign>0&&!B.gt(main,0))fail('quantity projection unresolved','amount-unresolved');
      const tail=normalized(combineWords(words,[String(main)],true));
      parts=Object.freeze({main:String(main),tail:Object.freeze(tail)});return parts;
    });
    const value=Object.freeze({kind:'wis-amount',version:1,get main(){return projection().main;},get tail(){return projection().tail;}});
    known.add(value);canonicalWords.set(value,words);if(memo)memo.set(key,value);return value;
  }
  function read(value){
    if(!value||typeof value!=='object'||Array.isArray(value)||B.isDecimal(value)||value.kind!=='wis-amount'||value.version!==1||
       !['kind','version','main','tail'].every(k=>own(value,k))||Object.keys(value).some(k=>!['kind','version','main','tail'].includes(k))||typeof value.main!=='string'||!Array.isArray(value.tail)||value.tail.some(v=>typeof v!=='string'))fail('quantity record invalid');
    const main=numericScalar(value.main);if(!main||main.lt(0))fail('quantity main invalid');return make([atom(value.main),...value.tail]);
  }
  const from=value=>{if(zeroAmount&&(value===0||value==='0'))return zeroAmount;if(oneAmount&&(value===1||value==='1'))return oneAmount;if(known.has(value))return value;if(value&&typeof value==='object'&&!B.isDecimal(value))return read(value);const text=atom(value);if(text==='0')return zeroAmount||(zeroAmount=make([text]));if(text==='1')return oneAmount||(oneAmount=make([text]));const cache=WIS.Core.RankExact?.memo('amount-atoms');if(cache?.has(text))return cache.get(text);const created=make([text]);if(cache){if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(text,created);}return created;};
  const fromParts=(main,tail=[])=>{const m=atom(main),n=numericScalar(m);if(!n||n.lt(0)||!Array.isArray(tail))fail('quantity parts invalid');
    const pair=storedPairs.get(tail);if(pair&&pair.main===m)return pair.value;
    if(n.eq(0)&&WIS.Core.AmountProducts.extended(tail)===true)return make(WIS.Core.AmountProducts.wordView(tail));
    if(!tail.length)return from(m);if(n.eq(0)&&tail.length===1&&typeof tail[0]==='string'&&B.isNumericText(tail[0]))return from(tail[0]);
    const input=[m,...tail],key=WIS.Core.AmountProducts.inputKey(input),memo=key===null?null:WIS.Core.AmountProducts.workMemo('amount-parts');
    if(memo?.has(key))return memo.get(key);const value=make(input,key);
    if(memo)memo.set(key,value);return value;};
  const wordView=value=>canonicalWords.get(from(value));
  const words=value=>WIS.Core.AmountProducts.copyPrepared(wordView(value));
  // Both operands were strictly decoded already. Identical signed words
  // cancel exactly; only the changed middle needs another arithmetic proof.
  function differentWords(x,y){let begin=0,endX=x.length,endY=y.length;while(begin<endX&&begin<endY&&x[begin]===y[begin])begin++;while(endX>begin&&endY>begin&&x[endX-1]===y[endY-1]){endX--;endY--;}return begin||endX!==x.length||endY!==y.length?[x.slice(begin,endX),y.slice(begin,endY)]:[x,y];}
  // Compare single positive decimal words in scientific coordinates. Equal
  // orders need only zero-padding the significands, never 10^exponentGap or
  // a dense subtraction. This is an exact payment-safe comparison.
  function compareSingleWords(x,y){
    if(x.length!==1||y.length!==1)return null;
    const a=/^([1-9]\d*)e([+-]?\d+)$/.exec(x[0]),b=/^([1-9]\d*)e([+-]?\d+)$/.exec(y[0]);
    if(!a||!b)return null;
    const ao=BigInt(a[2])+BigInt(a[1].length),bo=BigInt(b[2])+BigInt(b[1].length);
    if(ao!==bo)return ao<bo?-1:1;
    const length=Math.max(a[1].length,b[1].length),ac=a[1].padEnd(length,'0'),bc=b[1].padEnd(length,'0');
    return ac===bc?0:ac<bc?-1:1;
  }
  const compare=(a,b)=>{a=from(a);b=from(b);if(a===b)return 0;const originalX=canonicalWords.get(a),originalY=canonicalWords.get(b);if(!originalX.length)return originalY.length?-1:0;if(!originalY.length)return 1;const [x,y]=differentWords(originalX,originalY);if(!x.length)return y.length?-L.strict.sign(y):0;if(!y.length)return L.strict.sign(x);const single=compareSingleWords(x,y);if(single!==null)return single;const P=WIS.Core.AmountProducts;if(x.length+y.length>2||x.some(word=>word.length>256)||y.some(word=>word.length>256)||P.extended(x)===true||P.extended(y)===true){const order=P.compareRanges(x,y);if(order!==null)return order;}return L.strict.compare(x,y);};
  function combineWords(x,y,inverse=false){return WIS.Core.AmountProducts.extended(x)===true||WIS.Core.AmountProducts.extended(y)===true?WIS.Core.AmountProducts.sumView(x,y,inverse):[...x,...(inverse?L.negate(y):y)];}
  const add=(a,b)=>{a=from(a);b=from(b);if(!canonicalWords.get(a).length)return b;if(!canonicalWords.get(b).length)return a;return make(combineWords(canonicalWords.get(a),canonicalWords.get(b)));};
  const addWords=(value,change)=>{value=from(value);const incoming=normalized(change);return incoming.length?make(canonicalWords.get(value).length?combineWords(canonicalWords.get(value),incoming):incoming):value;};
  const subtract=(a,b)=>{a=from(a);b=from(b);if(a===b)return from(0);if(!canonicalWords.get(b).length)return a;const [x,y]=differentWords(canonicalWords.get(a),canonicalWords.get(b));return make([...x,...L.negate(y)]);};
  const normalize=value=>from(value);
  const project=value=>{const v=from(value);return B.BN(v.main);};
  const serialize=value=>{const v=from(value);return {kind:v.kind,version:v.version,main:v.main,tail:WIS.Core.AmountProducts.copyPrepared(v.tail)};};
  function scale(value,factor){
    value=from(value);
    const f=normalized([atom(factor)]);if(L.strict.sign(f)<0)fail('quantity scale negative');if(!f.length)return from(0);if(f.length===1&&f[0]==='1e0')return value;
    const decimal=/^(-?\d+)e([+-]?\d+)$/.test(f[0]);if(!decimal)fail('opaque scale requires certified formula adapter','amount-unresolved');
    try{return make(L.scale(words(value),f[0]));}catch(error){if(error.code==='rank-cost-unresolved'||error instanceof L.LedgerError)fail('quantity scale exceeds exact factor capacity','amount-unresolved');throw error;}
  }
  function multiply(a,b){a=from(a);b=from(b);const x=canonicalWords.get(a),y=canonicalWords.get(b),scalar=words=>words.length===1&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(words[0]);if(!x.length||!y.length)return from(0);if(scalar(y))return scale(a,y[0]);if(scalar(x))return scale(b,x[0]);if(!L.multiply)fail('quantity product needs rational adapter','amount-unresolved');return make(L.multiply(x,y));}
  function divide(a,b){a=from(a);b=from(b);if(compare(b,0)===0)fail('quantity division by zero');if(!L.divide)fail('quantity quotient needs rational adapter','amount-unresolved');return make(L.divide(words(a),words(b)));}
  function floor(value){
    const values=wordView(value);
    if(L.hasProduct?.(values))fail('Product integer quotient needs a separate proof','amount-unresolved');
    if(L.hasRatio?.(values)){try{const pair=WIS.Core.RankBudget.Q.fractionPair(L.toQ(values)),n=BigInt(pair.n),d=BigInt(pair.d);return R.read(String(n/d));}catch(e){if(e.code!=='rank-cost-unresolved')throw e;fail('opaque rational quotient needs an integer proof','amount-unresolved');}}
    const integers=[],fractions=[];
    for(const raw of L.expand(values)){const repeated=/^(.*?)(?:\*([1-9]\d*))?$/.exec(raw),body=repeated[1],times=BigInt(repeated[2]||1),m=/^(-?\d+)(?:e([+-]?\d+))?$/i.exec(body);
      if(m){const c=BigInt(m[1])*times,e=BigInt(m[2]||0);if(e>=0n){integers.push(String(c)+'e'+String(e));continue;}const digits=String(c<0n?-c:c).length;
        if(-e>=BigInt(digits)){fractions.push(String(c)+'e'+String(e));continue;}const d=10n**(-e),q=c/d,r=c%d;if(q)integers.push(String(q));if(r)fractions.push(String(r)+'e'+String(e));
      }else{try{L.integer(body);integers.push(raw);}catch(error){if(!(error instanceof L.LedgerError))throw error;fractions.push(raw);}}
    }
    // Each remaining summand lies strictly between -1 and 1.
    let lo=-fractions.length,hi=fractions.length+1;while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(L.strict.compare(fractions,[String(mid)])>=0)lo=mid;else hi=mid;}
    return R.read({kind:'wis-rank',version:1,terms:normalized([...integers,String(lo)])});
  }
  const fieldTail=key=>key==='amount'?'residual':key+'Residual';
  const inputStamp=value=>({value,...(B.isDecimal(value)?{decimal:true,sign:value.sign,layer:value.layer,mag:value.mag}:{decimal:false})});
  const matchesInput=(stamp,value)=>stamp?.value===value&&(!stamp.decimal||B.isDecimal(value)&&stamp.sign===value.sign&&stamp.layer===value.layer&&Object.is(stamp.mag,value.mag));
  function field(record,key='amount',tailKey=fieldTail(key),scalarTailKey=null){
    if(!record||typeof record!=='object'||Array.isArray(record))fail('quantity owner record invalid');
    const head=record[key]??0,tail=record[tailKey]??[],leading=scalarTailKey?record[scalarTailKey]??0:null;
    if(!Array.isArray(tail))fail('quantity owner tail invalid');
    const pair=storedPairs.get(tail);
    if(pair&&(leading===null||atom(leading)==='0')&&(matchesInput(pair.head,head)&&head.toString===pair.conversion&&head[Symbol.toPrimitive]===pair.primitive||pair.main===atom(head)))return pair.value;
    const memo=WIS.Core.RankExact?.memo('amount-owner-fields'),id=key+'\0'+tailKey+'\0'+scalarTailKey;
    let owners=memo?.get('records');if(memo&&!owners){owners=new WeakMap();memo.set('records',owners);}
    let rows=owners?.get(record);const previous=rows?.get(id);
    if(previous&&matchesInput(previous.head,head)&&matchesInput(previous.leading,leading)&&previous.tail.length===tail.length&&previous.tail.every((v,i)=>v===tail[i]))return previous.value;
    const headText=atom(head),leadingText=leading===null?null:atom(leading),value=fromParts(headText,leadingText===null||leadingText==='0'?tail:[leadingText,...tail]);
    if(owners){if(!rows){rows=new Map();owners.set(record,rows);}rows.set(id,{head:inputStamp(head),leading:inputStamp(leading),tail:tail.slice(),value});}return value;
  }
  function fieldParts(value,key='amount',tailKey=fieldTail(key)){
    value=from(value);const main=value.main,tail=Object.freeze(WIS.Core.AmountProducts.copyPrepared(value.tail));
    const head=B.BN(main);storedPairs.set(tail,{main,value,head:inputStamp(head),conversion:head.toString,primitive:head[Symbol.toPrimitive]});return {[key]:head,[tailKey]:tail};
  }

  function compact(value){return WIS.Core.CertifiedRankMath.withWork(()=>compactInWork(value));}
  function compactInWork(value){
    value=from(value);const P=WIS.Core.AmountProducts,tail=value.tail;
    if(!enabled()||!tail.length||tail.length<=P.tailPolicy.capacity&&!tail.some(w=>/^-?@(?:sum|ratio|product):/.test(w)))return Object.freeze({value,lossUpper:from(0),compacted:false,policyId:P.tailPolicy.id});
    if(!P.needsCompaction(tail))return Object.freeze({value,lossUpper:from(0),compacted:false,policyId:P.tailPolicy.id});
    // Complete immutable amounts may recur in stock/peak/total owners within
    // one candidate. Never retain partial proofs or cross-candidate results.
    const memo=WIS.Core.RankExact.memo('amount-compaction|'+P.tailPolicy.id);
    let results=memo.get('values');if(!results){results=new WeakMap();memo.set('values',results);}
    if(results.has(value))return results.get(value);
    const tailOnly=P.termCount(tail)<=P.tailPolicy.capacity;
    const result=P.compact(tailOnly?tail:wordView(value),{force:true});let next;
    try{next=make(tailOnly?[value.main,...result.words]:result.words);}catch(error){if(error.code==='amount-negative')fail('Tail compression cannot preserve a nonnegative balance','amount-compaction-unresolved');throw error;}
    if(P.termCount(next.tail)>P.tailPolicy.target||P.needsCompaction(next.tail))fail('Tail compression capacity certificate failed','amount-compaction-unresolved');
    const completed=Object.freeze({value:next,lossUpper:make(result.errorWords),compacted:result.compacted,sourceTerms:result.sourceTerms,resultTerms:result.resultTerms,policyId:result.policyId});
    results.set(value,completed);return completed;
  }
  function boundedFieldParts(value,key='amount',tailKey=fieldTail(key)){return fieldParts(compact(value).value,key,tailKey);}

  let legacyDepth=0;
  const enabled=()=>WIS.Core.Config?.saveVersion>=75&&legacyDepth===0;
  function withLegacy(work){legacyDepth++;try{return work();}finally{legacyDepth--;}}
  WIS.Core.Amount=Object.freeze({compact,boundedFieldParts,isCanonicalTail:tail=>storedPairs.has(tail),isCanonicalAmount:value=>known.has(value),enabled,withLegacy,field,fieldParts,from:(value=0)=>from(value),fromParts,read,serialize,wordView,words,add,addWords,subtract,compare,project,normalize,floor,scale,multiply,divide,isAmount:v=>known.has(v)||!!v&&typeof v==='object'&&v.kind==='wis-amount'});
}(window.WIS));
