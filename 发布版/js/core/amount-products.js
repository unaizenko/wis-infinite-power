(function defineAmountProducts(W){
 'use strict';
 // A shorter directed enclosure may certify the same scalar/sign result.
 // Ambiguous bounds refine through the unchanged80..512 ladder; stored
 // tail coefficients keep their separate80-place minimum and policy.
 // Exact monomials of already-confirmed atoms. Pages contain numeric data only:
 // rational coefficient * 10^exponent * product(atom^integer multiplicity).
 const L=W.Core.SignedLedger,B=W.Core.BigNum,Q=W.Core.RankBudget.Q,C=W.Core.CertifiedRankMath,PREFIX='@product:1:';
 const fail=(m,code='amount-invalid')=>{throw Object.assign(Error(m),{code});},abs=n=>n<0n?-n:n;
 const isProduct=v=>typeof v==='string'&&/^-?@product:/.test(v),hasProduct=v=>{const kinds=wordKinds(v);return kinds===null?[...L.expand(v)].some(isProduct):!!(kinds&1);};
 // Stamp all private cache slots onto newly owned objects before freezing.
 // The base constructor returns the supplied object, preserving prototypes,
 // own descriptors and serialization. Frozen owners may update existing slots;
 // external objects are never stamped and cannot forge a brand by reflection.
 class CanonicalRow extends class {constructor(value){return value;}} {
  #brand;
  #rowKeys;#packedRows;#coefficientKeys;#rowProjections;#rowLogCertificates;#roughRows;#negativeRows;
  static has(value){return value!==null&&(typeof value==='object'||typeof value==='function')&&#brand in value;}
  static rowKeys=Object.freeze({has:value=>CanonicalRow.has(value)&&value.#rowKeys!==undefined,get:value=>CanonicalRow.has(value)?value.#rowKeys:undefined,set:(value,entry)=>{if(CanonicalRow.has(value))value.#rowKeys=entry;}});
  static packedRows=Object.freeze({has:value=>CanonicalRow.has(value)&&value.#packedRows!==undefined,get:value=>CanonicalRow.has(value)?value.#packedRows:undefined,set:(value,entry)=>{if(CanonicalRow.has(value))value.#packedRows=entry;}});
  static coefficientKeys=Object.freeze({has:value=>CanonicalRow.has(value)&&value.#coefficientKeys!==undefined,get:value=>CanonicalRow.has(value)?value.#coefficientKeys:undefined,set:(value,entry)=>{if(CanonicalRow.has(value))value.#coefficientKeys=entry;}});
  static rowProjections=Object.freeze({has:value=>CanonicalRow.has(value)&&value.#rowProjections!==undefined,get:value=>CanonicalRow.has(value)?value.#rowProjections:undefined,set:(value,entry)=>{if(CanonicalRow.has(value))value.#rowProjections=entry;}});
  static rowLogCertificates=Object.freeze({has:value=>CanonicalRow.has(value)&&value.#rowLogCertificates!==undefined,get:value=>CanonicalRow.has(value)?value.#rowLogCertificates:undefined,set:(value,entry)=>{if(CanonicalRow.has(value))value.#rowLogCertificates=entry;}});
  static roughRows=Object.freeze({has:value=>CanonicalRow.has(value)&&value.#roughRows!==undefined,get:value=>CanonicalRow.has(value)?value.#roughRows:undefined,set:(value,entry)=>{if(CanonicalRow.has(value))value.#roughRows=entry;}});
  static negativeRows=Object.freeze({has:value=>CanonicalRow.has(value)&&value.#negativeRows!==undefined,get:value=>CanonicalRow.has(value)?value.#negativeRows:undefined,set:(value,entry)=>{if(CanonicalRow.has(value))value.#negativeRows=entry;}});
 }
 class CanonicalFactors extends class {constructor(value){return value;}} {
  #brand;
  #factorKeys;#roughFactors;
  static has(value){return value!==null&&(typeof value==='object'||typeof value==='function')&&#brand in value;}
  static factorKeys=Object.freeze({has:value=>CanonicalFactors.has(value)&&value.#factorKeys!==undefined,get:value=>CanonicalFactors.has(value)?value.#factorKeys:undefined,set:(value,entry)=>{if(CanonicalFactors.has(value))value.#factorKeys=entry;}});
  static roughFactors=Object.freeze({has:value=>CanonicalFactors.has(value)&&value.#roughFactors!==undefined,get:value=>CanonicalFactors.has(value)?value.#roughFactors:undefined,set:(value,entry)=>{if(CanonicalFactors.has(value))value.#roughFactors=entry;}});
 }
 class FinalizedRows extends class {constructor(value){return value;}} {
  #brand;
  #preparedWords;#rowKinds;#rowSigns;#extendedRows;
  static has(value){return value!==null&&(typeof value==='object'||typeof value==='function')&&#brand in value;}
  static preparedWords=Object.freeze({has:value=>FinalizedRows.has(value)&&value.#preparedWords!==undefined,get:value=>FinalizedRows.has(value)?value.#preparedWords:undefined,set:(value,entry)=>{if(FinalizedRows.has(value))value.#preparedWords=entry;}});
  static rowKinds=Object.freeze({has:value=>FinalizedRows.has(value)&&value.#rowKinds!==undefined,get:value=>FinalizedRows.has(value)?value.#rowKinds:undefined,set:(value,entry)=>{if(FinalizedRows.has(value))value.#rowKinds=entry;}});
  static rowSigns=Object.freeze({has:value=>FinalizedRows.has(value)&&value.#rowSigns!==undefined,get:value=>FinalizedRows.has(value)?value.#rowSigns:undefined,set:(value,entry)=>{if(FinalizedRows.has(value))value.#rowSigns=entry;}});
  static extendedRows=Object.freeze({has:value=>FinalizedRows.has(value)&&value.#extendedRows!==undefined,get:value=>FinalizedRows.has(value)?value.#extendedRows:undefined,set:(value,entry)=>{if(FinalizedRows.has(value))value.#extendedRows=entry;}});
 }
 const { rowKeys,packedRows,coefficientKeys,rowProjections,rowLogCertificates,roughRows,negativeRows }=CanonicalRow,{ factorKeys,roughFactors }=CanonicalFactors,{ preparedWords,rowKinds,rowSigns,extendedRows }=FinalizedRows;
 const emptyFactors=new CanonicalFactors(new Map());
 const sumRanges=new WeakMap(),wordRanges=new WeakMap(),normalizedInputs=new WeakMap(),encodedInputs=new WeakMap(),tokenCache=new Map(),atomCache=new Map();let tokenBytes=0,atomBytes=0;
 const gcd=(a,b)=>{a=abs(a);while(b){const t=a%b;a=b;b=t;}return a||1n;};
 const digits=(n,limit=2048)=>{if(abs(n).toString().length>limit)fail('Quantity product digit capacity','amount-unresolved');return n;};
 function canonical(row){if(CanonicalRow.has(row))return row;let {n,d,e}=row;if(d<=0n)fail('Quantity product denominator');const g=gcd(n,d);n/=g;d/=g;
  while(d%10n===0n){d/=10n;e--;}
  let twos=0,fives=0;while(d%2n===0n){d/=2n;twos++;}while(d%5n===0n){d/=5n;fives++;}const shift=Math.max(twos,fives);if(shift){n*=2n**BigInt(shift-twos)*5n**BigInt(shift-fives);e-=BigInt(shift);}
  if(n)while(n%10n===0n){n/=10n;e++;}
  digits(n);digits(d);digits(e,4096);let f=row.f;
  // These maps never escape the private canonical row decoder. Arithmetic
  // that changes factors first creates another map; scalar work borrows them.
  if(!CanonicalFactors.has(f)){f=f.size?new Map([...f].filter(([,v])=>v!==0n).sort(([a],[b])=>a<b?-1:a>b?1:0)):emptyFactors;if(f.size>128)fail('Quantity product factor capacity','amount-unresolved');for(const count of f.values())digits(count);if(f!==emptyFactors)new CanonicalFactors(f);}
  return Object.freeze(new CanonicalRow({n,d,e,f}));
 }
 // Private canonical negation preserves denominator/exponent/factor ordering.
 function negateRow(row){if(negativeRows.has(row))return negativeRows.get(row);const value=Object.freeze(new CanonicalRow({...row,n:-row.n}));negativeRows.set(row,value);negativeRows.set(value,row);return value;}
 function token(raw){if(tokenCache.has(raw))return tokenCache.get(raw);if(typeof raw!=='string'||raw.length>1048576)fail('Quantity product page capacity','amount-unresolved');const m=/^(-?)(@product:.*?)(?:\*([1-9]\d*))?$/.exec(raw);if(!m||!m[2].startsWith(PREFIX)||m[3]?.length>2048)fail('Quantity product page version/format');let v;try{v=JSON.parse(m[2].slice(PREFIX.length));}catch(e){fail('Quantity product JSON');}
  if(!v||Array.isArray(v)||Object.keys(v).sort().join(',')!=='d,e,f,n'||typeof v.n!=='string'||! /^-?(0|[1-9]\d*)$/.test(v.n)||typeof v.d!=='string'||! /^[1-9]\d*$/.test(v.d)||typeof v.e!=='string'||! /^-?(0|[1-9]\d*)$/.test(v.e)||!Array.isArray(v.f)||v.f.length>128)fail('Quantity product shape');
  if(v.n.length>2049||v.d.length>2048||v.e.length>4097)fail('Quantity product input capacity','amount-unresolved');const f=new Map();
  for(const pair of v.f){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||pair[0].length>8192||!B.isNumericText(pair[0])||!B.parseFinite(pair[0])||B.lte(pair[0],0)||typeof pair[1]!=='string'||! /^-?[1-9]\d*$/.test(pair[1])||pair[1].length>2049)fail('Quantity product factor');const count=BigInt(pair[1]);digits(count);f.set(pair[0],(f.get(pair[0])||0n)+count);}
  const result=canonical({n:BigInt(v.n)*(m[1]?-1n:1n)*BigInt(m[3]||1),d:BigInt(v.d),e:BigInt(v.e),f});if(raw.length<=65536){while(tokenCache.size>=1024||tokenBytes+raw.length>1048576){const first=tokenCache.keys().next().value;tokenBytes-=first.length;tokenCache.delete(first);}tokenCache.set(raw,result);tokenBytes+=raw.length;}return result;
 }
 function atom(text){
  if(atomCache.has(text)){const old=atomCache.get(text);atomCache.delete(text);atomCache.set(text,old);return old.value;}
  const value=parseAtom(text),bytes=text.length+String(value.n).length+String(value.d).length+String(value.e).length+[...value.f].reduce((n,[k,v])=>n+k.length+String(v).length,0);
  if(bytes<=65536){while(atomCache.size>=4096||atomBytes+bytes>2097152){const key=atomCache.keys().next().value;atomBytes-=atomCache.get(key).bytes;atomCache.delete(key);}atomCache.set(text,{value,bytes});atomBytes+=bytes;}return value;
 }
 function parseAtom(text){const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);if(m){if(m[2].length+(m[3]?.length||0)>2048||String(m[4]||0).length>4097)fail('Quantity decimal product capacity','amount-unresolved');return canonical({n:BigInt(m[1]+m[2]+(m[3]||'')),d:1n,e:BigInt(m[4]||0)-BigInt((m[3]||'').length),f:new Map()});}
  if(!B.isNumericText(text)||!B.parseFinite(text))fail('Quantity product numeric atom');const normalized=[...L.expand(L.safeNormalize([text]))];if(normalized.length!==1)fail('Quantity product atom normalization');const word=normalized[0],match=/^(.*?)(?:\*([1-9]\d*))?$/.exec(word);if(/^-?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/i.test(match[1])){const v=atom(match[1]),count=BigInt(match[2]||1);return count===1n?v:canonical({...v,n:v.n*count});}
  const negative=match[1].startsWith('-'),factor=negative?match[1].slice(1):match[1];return canonical({n:(negative?-1n:1n)*BigInt(match[2]||1),d:1n,e:0n,f:new Map([[factor,1n]])});
 }
 const ratioRowCache=new Map();let ratioRowCharacters=0;
 function ratioRows(text){
  if(W.Core.Amount?.enabled()&&ratioRowCache.has(text)){const entry=ratioRowCache.get(text);ratioRowCache.delete(text);ratioRowCache.set(text,entry);return entry.rows;}
  let r;
  if(W.Core.AmountLedger?.ratioValue)r=W.Core.AmountLedger.ratioValue(text);
  else {const m=/^(-?)(.*?)(?:\*([1-9]\d*))?$/.exec(text),body=m[2];if(!body.startsWith('@ratio:1:'))fail('Quantity rational page version');let v;try{v=JSON.parse(body.slice(9));}catch(e){fail('Quantity rational JSON');}r=Q.read(v);if(m[1])r=Q.negate(r);if(m[3])r=Q.multiply(r,Q.decimal(m[3]));}
  if(W.Core.RankExact.is(r))fail('Quantity rational expression unsupported','amount-unresolved');
  const result=Object.freeze(rows(r.terms).map(t=>canonical({...t,d:t.d*BigInt(r.denominator)})));
  const characters=text.length+result.reduce((n,row)=>n+String(row.n).length+String(row.d).length+String(row.e).length+[...row.f].reduce((s,[key,count])=>s+key.length+String(count).length,0),0);
  if(W.Core.Amount?.enabled()&&characters<=65536){while(ratioRowCache.size>=4096||ratioRowCharacters+characters>2097152){const key=ratioRowCache.keys().next().value;ratioRowCharacters-=ratioRowCache.get(key).characters;ratioRowCache.delete(key);}ratioRowCache.set(text,{rows:result,characters});ratioRowCharacters+=characters;}return result;
 }
 // SignedLedger may legally merge ordinary decimal coefficients up to 8192
 // digits. Keep the product row's 2048-digit bound by decomposing the exact
 // integer coefficient in base 10^2048; this introduces no rounding or tail loss.
 function splitDecimalRows(text,count){
  if(text.length<=2048)return null;
  const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
  if(!m||m[2].length+(m[3]?.length||0)<=2048)return null;
  if(m[2].length+(m[3]?.length||0)>8192||String(m[4]||0).length>4097)fail('Quantity decimal product capacity','amount-unresolved');
  const coefficient=BigInt(m[2]+(m[3]||''))*count,digits=String(coefficient),exponent=BigInt(m[4]||0)-BigInt((m[3]||'').length),out=[];
  for(let end=digits.length;end>0;end-=2048){
   const chunk=BigInt(digits.slice(Math.max(0,end-2048),end));
   if(chunk)out.push(canonical({n:m[1]?-chunk:chunk,d:1n,e:exponent+BigInt(digits.length-end),f:emptyFactors}));
  }
  return out;
 }
 function rows(values){const result=[];for(const raw of L.expand(values)){const text=String(raw),m=/^(.*?)(?:\*([1-9]\d*))?$/.exec(text);if(m[2]?.length>2048)fail('Quantity product repetition capacity','amount-unresolved');const count=BigInt(m[2]||1);let parsed;
   if(isProduct(text))parsed=[token(text)];
   else if(/^-?@ratio:/.test(text))parsed=ratioRows(text);
   else {parsed=splitDecimalRows(m[1],count);if(!parsed){const value=atom(m[1]);parsed=[count===1n?value:canonical({...value,n:value.n*count})];}}
   result.push(...parsed);if(result.length>4096)fail('Quantity product term capacity','amount-unresolved');
  }return result;
 }
 const factorKey=row=>{const f=row.f;if(factorKeys.has(f))return factorKeys.get(f);const key=JSON.stringify([...f].map(([k,v])=>[k,String(v)]));if(CanonicalFactors.has(f))factorKeys.set(f,key);return key;};
 const rowKey=r=>{if(rowKeys.has(r))return rowKeys.get(r);const key='['+JSON.stringify(String(r.e))+','+factorKey(r)+']';if(CanonicalRow.has(r))rowKeys.set(r,key);return key;};
 const coefficientKey=row=>{if(coefficientKeys.has(row))return coefficientKeys.get(row);const key=row.n+'/'+row.d+'e'+row.e;coefficientKeys.set(row,key);return key;};
 // Exact capacity checks avoid constructing 2048-digit strings per row.
 const coefficientLimit=10n**2048n;
 function compactGroup(group){const iterator=compactGroupSteps(group);let next;do{next=iterator.next();}while(!next.done);return next.value;}
 function* compactGroupSteps(group){
  let denominator=1n,index=0;
  for(const row of group){if(denominator%row.d)denominator=denominator/gcd(denominator,row.d)*row.d;if(denominator>=coefficientLimit)return null;if(++index%8===0)yield;}
  const words=[];index=0;for(const row of group){const n=row.n*(denominator/row.d);if(abs(n)>=coefficientLimit)return null;words.push({c:n,e:row.e});if(++index%8===0)yield;}
  // Stable ordering and signed string length retain the original carry policy.
  words.sort((a,b)=>a.e<b.e?-1:a.e>b.e?1:0);yield;
  const merged=[];index=0;
  for(const word of words){const last=merged[merged.length-1],gap=last?word.e-last.e:0n;
   if(last&&gap<=2048n&&BigInt(String(word.c).length)+gap<=4096n){last.c+=word.c*10n**gap;if(!last.c)merged.pop();}
   else merged.push(word);
   if(++index%8===0)yield;
  }
  if(merged.length>=group.length)return null;
  const result=[];index=0;try{for(const word of merged){const r=canonical({n:word.c,d:denominator,e:word.e,f:emptyFactors});result.push(Object.freeze({n:r.n,d:r.d,e:r.e}));if(++index%8===0)yield;}}
  catch(error){if(error.code!=='amount-unresolved')throw error;return null;}return Object.freeze(result);
 }
 function compactCoefficients(rows){
  const groups=new Map();for(const row of rows){const key=factorKey(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  const result=[];
  for(const group of groups.values()){
   if(group.length<2){result.push(...group);continue;}
   let key='';for(const row of group)key+=coefficientKey(row)+';';
   const memo=key.length>1048576?null:workMemo('amount-coefficient-groups');let compact;
   // Player groups of 2..21 rows regressed when every small group suspended.
   // Keep that bounded prefix synchronous; larger groups retain their cursor.
   if(memo?.has(key))compact=memo.get(key);else{compact=C.isWorkActive()&&group.length>=32?C.task('amount-coefficients|'+key,()=>compactGroupSteps(group)):compactGroup(group);if(memo)memo.set(key,compact);}
   if(compact===null)result.push(...group);else{const original=new Map();for(const row of group)original.set(coefficientKey(row),row);for(const row of compact)result.push(original.get(coefficientKey(row))||canonical({...row,f:group[0].f}));}
  }return result;
 }
 function collect(input){
  if(input.length===1){const row=canonical(input[0]);return row.n?[row]:[];}
  const table=new Map();for(const raw of input){const r=canonical(raw);if(!r.n)continue;const key=rowKey(r),old=table.get(key);
   if(old){let n=old.d===r.d?old.n+r.n:old.n*r.d+r.n*old.d,d=old.d===r.d?old.d:old.d*r.d;const g=gcd(n,d);n/=g;d/=g;const merged={...old,n,d};
    // A coefficient can cross its digit quota and then carry into the exact
    // decimal exponent. Prove the canonical form before rejecting that carry.
    if(String(abs(n)).length>2048||String(d).length>2048){digits(n,8192);digits(d,8192);canonical(merged);}table.set(key,merged);
   }else table.set(key,r); // validated rows and their private factor maps are immutable
  }
  // A carry can create another existing exponent (e.g. 9*x+x). Re-key until
  // no structural carry remains; every pass reduces or canonicalizes a term.
  let result=[...table.values()].filter(r=>r.n).map(canonical);const compacted=compactCoefficients(result);if(compacted.length<result.length)return collect(compacted);if(result.some(r=>table.get(rowKey(r))!==undefined&&table.get(rowKey(r)).e!==r.e)||new Set(result.map(rowKey)).size!==result.length)return collect(result);return result.sort((a,b)=>rowKey(a)<rowKey(b)?-1:rowKey(a)>rowKey(b)?1:0);
 }
 function pack(r){r=canonical(r);if(packedRows.has(r))return packedRows.get(r);const result=packRow(r);packedRows.set(r,result);return result;}
 function packRow(r){r=canonical(r);if(!r.n)return null;const sign=r.n<0n?'-':'',n=abs(r.n);
  if(!r.f.size)return r.d===1n?String(r.n)+'e'+String(r.e):sign+'@ratio:1:'+JSON.stringify({terms:[String(n)+'e'+String(r.e)],denominator:String(r.d)});
  if(r.f.size===1&&[...r.f.values()][0]===1n){
    let numerator=n,denominator=r.d;
    if(r.e>=0n&&BigInt(String(n).length)+r.e<=2048n)numerator*=10n**r.e;
    else if(r.e<0n&&BigInt(String(r.d).length)-r.e<=2048n)denominator*=10n**(-r.e);
    else return sign+PREFIX+JSON.stringify({n:String(n),d:String(r.d),e:String(r.e),f:[...r.f].map(([k,v])=>[k,String(v)])});
    const factor=[...r.f.keys()][0],term=factor+(numerator===1n?'':'*'+numerator);if(denominator===1n)return sign+term;return sign+'@ratio:1:'+JSON.stringify({terms:[term],denominator:String(denominator)});
  }
  return sign+PREFIX+JSON.stringify({n:String(n),d:String(r.d),e:String(r.e),f:[...r.f].map(([k,v])=>[k,String(v)])});
 }

 // Work-private complete-input caches are bounded by total key text, not
 // by a128-word cliff inside the supported4096-word numerical domain.
 const numericMemoKey=Symbol('numeric input memo');
 class NumericInputMemo extends Map {
  constructor(){super();this.characters=0;}
  get(key){if(!super.has(key))return undefined;const value=super.get(key);super.delete(key);super.set(key,value);return value;}
  delete(key){if(!super.has(key))return false;this.characters-=key.length;return super.delete(key);}
  clear(){super.clear();this.characters=0;}
  set(key,value){if(typeof key!=='string'||key.length>1048576)return this;if(super.has(key))this.delete(key);while(this.size>=512||this.characters+key.length>8388608)this.delete(super.keys().next().value);super.set(key,value);this.characters+=key.length;return this;}
 }
 function numericMemo(owner){if(!owner)return null;let memo=owner.get(numericMemoKey);if(!memo){memo=new NumericInputMemo();owner.set(numericMemoKey,memo);}return memo;}
 function workMemo(name){return numericMemo(W.Core.RankExact?.memo(name));}
 function mathWorkMemo(name){return numericMemo(C.memo(name));}
 function releaseWorkMemo(owner){owner?.get(numericMemoKey)?.clear();}
 function inputKey(values){if(!Array.isArray(values)||values.length>4096)return null;const frozen=Object.isFrozen(values);if(frozen&&encodedInputs.has(values))return encodedInputs.get(values);const copy=[];let characters=0,cacheable=frozen;for(let i=0;i<values.length;i++){const value=values[i];if(typeof value!=='string'||(characters+=value.length)>1048576)return null;if(cacheable){const descriptor=Object.getOwnPropertyDescriptor(values,String(i));if(!descriptor||!('value' in descriptor)||descriptor.value!==value)cacheable=false;}copy.push(value);}const key=JSON.stringify(copy);if(key.length>1048576)return null;if(cacheable)encodedInputs.set(values,key);return key;}
 function preparedInput(values){const entry=normalizedInputs.get(values);return entry&&(values===entry.words||values.length===entry.words.length&&entry.words.every((word,i)=>values[i]===word))?entry.rows:null;}
 function wordKinds(values){const rows=preparedInput(values);return rows?rowKinds.get(rows):null;}
 function finalizedRows(rows){const result=Object.freeze(new FinalizedRows(rows));let signs=0,kinds=0;const words=Object.freeze(result.map(row=>{signs|=row.n>0n?1:2;const word=pack(row);if(isProduct(word))kinds|=1;else if(/^-?@ratio:/.test(word))kinds|=2;return word;}).filter(Boolean));preparedWords.set(result,words);rowSigns.set(result,signs);rowKinds.set(result,kinds);extendedRows.set(result,kinds!==0);normalizedInputs.set(words,{rows:result,words});return result;}
 function prepare(values){
  const prepared=preparedInput(values);if(prepared)return prepared;
  const key=inputKey(values),scope=key===null?null:workMemo('amount-product-nodes');
  if(scope?.has(key))return scope.get(key);
  const result=finalizedRows(collect(rows(values))),words=preparedWords.get(result);
  if(scope){scope.set(key,result);const alias=inputKey(words);if(alias!==null)scope.set(alias,result);}
  return result;
 }
 function copyPrepared(values){const copy=values.slice(),rows=preparedInput(values);if(rows)normalizedInputs.set(copy,{rows,words:preparedWords.get(rows)});return copy;}
 const normalize=values=>{const result=prepare(values),words=preparedWords.get(result),copy=words.slice();normalizedInputs.set(copy,{rows:result,words});return copy;};
 // Canonical carry and coefficient compaction cannot cross a factor group.
 // Retain untouched, already sorted rows; run the original collector on every
 // changed group, then merge the two canonical ordered sequences.
 function collectAddition(left,right){
  const touched=new Set(right.map(factorKey)),unchanged=[],changed=[];
  for(const row of left)(touched.has(factorKey(row))?changed:unchanged).push(row);
  const updates=collect([...changed,...right]);if(!unchanged.length)return updates;
  const result=[];let i=0,j=0;while(i<unchanged.length&&j<updates.length){if(rowKey(unchanged[i])<rowKey(updates[j]))result.push(unchanged[i++]);else result.push(updates[j++]);}
  return result.concat(unchanged.slice(i),updates.slice(j));
 }
 function sumView(a,b,inverse=false){const left=prepare(a),right=prepare(b);if(left.length+right.length>4096)fail('Quantity sum term capacity','amount-unresolved');const memo=mathWorkMemo('amount-product-sum-views'),key=inverse+'|'+proofIdentity(left)+'|'+proofIdentity(right);if(memo?.has(key))return memo.get(key);const result=finalizedRows(collectAddition(left,inverse?right.map(negateRow):right)),words=preparedWords.get(result);if(memo)memo.set(key,words);return words;}
 function combine(a,b,inverse=false){const f=!b.f.size?a.f:!a.f.size&&!inverse?b.f:new Map(a.f);if(f!==a.f&&f!==b.f)for(const [k,v]of b.f)f.set(k,(f.get(k)||0n)+(inverse?-v:v));return canonical({n:a.n*(inverse?b.d:b.n),d:a.d*(inverse?abs(b.n):b.d),e:a.e+(inverse?-b.e:b.e),f});}
 function multiply(a,b){const left=prepare(a),right=prepare(b);if(left.length*right.length>4096)fail('Quantity product expansion capacity','amount-unresolved');return copyPrepared(preparedWords.get(finalizedRows(collect(left.flatMap(x=>right.map(y=>combine(x,y)))))));}
 function divide(a,b){const denominator=prepare(b);if(denominator.length!==1||!denominator[0].n)fail('Quantity quotient requires a single confirmed monomial','amount-unresolved');if(denominator[0].n<0n)fail('Quantity quotient denominator negative');return copyPrepared(preparedWords.get(finalizedRows(collect(prepare(a).map(x=>combine(x,denominator[0],true))))));}
 // Completed proofs of numeric atoms contain only immutable integer bounds.
 // They have no state, source, policy, callback or candidate owner in the key.
 const logCertificates=new Map();let logCertificateBytes=0;
 function numericLog(c,key,factory){
  if(c!==C.context(c.places))fail('Numeric logarithm context invalid');
  const id=c.places+'|'+key;
  if(logCertificates.has(id)){const old=logCertificates.get(id);logCertificates.delete(id);logCertificates.set(id,old);return old.value;}
  const result=C.task('amount-numeric-log|'+id,factory);if(result==null)return result;
  const interval=result.log||result;if(typeof interval.lo!=='bigint'||typeof interval.hi!=='bigint'||interval.lo>interval.hi)fail('Numeric logarithm certificate invalid');
  const bounds=Object.freeze({lo:interval.lo,hi:interval.hi}),value=result.log?Object.freeze({log:bounds,negative:result.negative}):bounds;
  const bytes=id.length+String(bounds.lo).length+String(bounds.hi).length;
  if(bytes<=65536){while(logCertificates.size>=4096||logCertificateBytes+bytes>2097152){const oldest=logCertificates.keys().next().value;logCertificateBytes-=logCertificates.get(oldest).bytes;logCertificates.delete(oldest);}logCertificates.set(id,{value,bytes});logCertificateBytes+=bytes;}
  return value;
 }
 // Split a decimal exponent into an exact integer power and a bounded
 // fractional power. Keep the established transcendental kernel unchanged.
 function coordinatePower10(c,a){return C.task('amount-coordinate-pow10|'+c.places+'|'+a.lo+'/'+a.hi,function*(){
  const k=a.lo>=0n?a.lo/c.scale:-((-a.lo+c.scale-1n)/c.scale);
  if(k< -2048n||k>2048n||a.hi-a.lo>c.scale)fail('Product exponent coordinate capacity','amount-unresolved');
  const fraction=c.sub(a,c.fraction(k)),residual=yield ()=>c.pow10(fraction),factor=10n**abs(k);
  return k>=0n?c.times(residual,factor):c.div(residual,c.fraction(factor));
 });}
 function atomLog(text,c){return numericLog(c,'atom|'+text,()=>atomLogSteps(text,c));}
 function* atomLogSteps(text,c){
  const v=B.BN(text),literal=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.test(text);
  if(literal||v.layer===0){const row=atom(literal?text:String(v.mag));if(row.f.size)fail('Product scalar logarithm unresolved','amount-unresolved');const log=yield ()=>c.logFraction(row.n,row.d),ln10=yield ()=>c.logFraction(10n,1n);return c.add(c.fraction(row.e),c.div(log,ln10));}
  if(v.layer!==1&&(v.layer!==2||Math.abs(v.mag)>2048))throw Object.assign(Error('Product logarithm outside certified coordinate capacity'),{code:'amount-unresolved',capacity:true,factor:text,layer:v.layer,magnitude:v.mag});
  const coordinate=atom(String(Math.abs(v.mag)));if(coordinate.f.size)fail('Product coordinate unresolved','amount-unresolved');
  const q=coordinate.e<0n?{n:coordinate.n,d:coordinate.d*10n**(-coordinate.e)}:{n:coordinate.n*10n**coordinate.e,d:coordinate.d};
  let log=v.layer===1?c.fraction(q.n,q.d):yield ()=>coordinatePower10(c,c.fraction(q.n,q.d));if(v.mag<0)log={lo:-log.hi,hi:-log.lo};return log;
 }

 function numericIdentity(namespace,value,encode,ownerMemo){
  const memo=ownerMemo||C.memo('numeric-identities|'+namespace);let data=memo.get('ids');if(!data){data={values:new WeakMap(),keys:new Map(),characters:0,next:ownerMemo?0n:0};memo.set('ids',data);}
  if(!data.values.has(value)){
   const key=encode();let id=data.keys.get(key);
   if(id===undefined){
    // Optional result identities may evict text keys: a fresh monotonic ID
    // only misses a result cache. Proof-task identities must never evict,
    // because recreating an equal input after suspension must find its task.
    if(!ownerMemo&&(data.keys.size>=131072||data.characters+key.length>67108864))fail('Private numeric identity capacity','amount-unresolved');
    id=++data.next;
    if(!ownerMemo||key.length<=1048576){
     if(ownerMemo)while(data.keys.size>=512||data.characters+key.length>8388608){const oldest=data.keys.keys().next().value;data.characters-=oldest.length;data.keys.delete(oldest);}
     data.keys.set(key,id);data.characters+=key.length;
    }
   }else if(ownerMemo){data.keys.delete(key);data.keys.set(key,id);}
   data.values.set(value,id);
  }return data.values.get(value);
 }
 function proofIdentity(value){return numericIdentity('product-inputs',value,()=>{if(!Array.isArray(value))return 'row|'+pack(value);const words=preparedWords.get(value)||value.map(pack);return 'sum|'+(inputKey(words)??JSON.stringify(words));});}
 function rowLog(row,c){const old=W.Core.Amount?.enabled()?rowLogCertificates.get(row):null;if(old?.context===c)return old.value;const value=numericLog(c,'monomial|'+pack(row),function*(){let out=c.fraction(row.e);const coefficient=yield ()=>c.logFraction(abs(row.n),row.d),ln10=yield ()=>c.logFraction(10n,1n);out=c.add(out,c.div(coefficient,ln10));for(const [text,count]of row.f){const part=yield ()=>atomLog(text,c);out=c.add(out,c.times(part,count));}return out;});if(W.Core.Amount?.enabled()){const floor=n=>n>=0n?n/c.scale:-((-n+c.scale-1n)/c.scale),ceil=n=>-floor(-n);rowLogCertificates.set(row,Object.freeze({context:c,value,bounds:Object.freeze({lo:floor(value.lo),hi:ceil(value.hi)})}));}return value;}
 // Certified constants enclosing10^(j/16), with integer six-decimal
 // numerators. Binary search and exact sixteenth powers prove every endpoint;
 // no floating transcendental estimate enters these discard bounds.
 const roughTowerScale=1000000n,roughTowerGrid=Object.freeze(Array.from({length:17},(_,j)=>{
  const target=10n**BigInt(j)*roughTowerScale**16n;let lo=roughTowerScale,hi=10n*roughTowerScale+1n;
  while(hi-lo>1n){const mid=(lo+hi)/2n;if(mid**16n<=target)lo=mid;else hi=mid;}
  return Object.freeze({lo,hi:lo**16n===target?lo:lo+1n});
 }));
 function roughTowerLog(value){
  const m=/^(\d+)(?:\.(\d*))?$/.exec(String(Math.abs(value.mag)));if(!m)return null;
  const denominator=10n**BigInt((m[2]||'').length),n=BigInt(m[1]+(m[2]||'')),k=n/denominator,remaining=n-k*denominator,factor=10n**k;
  let lo,hi;if(!remaining)lo=hi=factor;else{const bin=Number(remaining*16n/denominator),lower=roughTowerGrid[bin],upper=roughTowerGrid[bin+1];lo=factor*lower.lo/roughTowerScale;hi=(factor*upper.hi+roughTowerScale-1n)/roughTowerScale;}
  return value.mag<0?{lo:-hi,hi:-lo}:{lo,hi};
 }
 function roughAtomLog(text){const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);if(m){const n=BigInt(m[2]+(m[3]||''));if(!n)return null;const e=BigInt(m[4]||0)-BigInt((m[3]||'').length),digits=String(n).length;return {lo:e+BigInt(digits-1),hi:e+BigInt(digits)};}
  // Coarse integer bounds need at most4097 digits here; even the512-place
  // cutoff product stays below the8192-digit proof capacity. Fine logarithms
  // retain their existing2048 coordinate limit.
  const value=B.BN(text);if(value.layer!==2||Math.abs(value.mag)>4096)return null;return roughTowerLog(value);
 }
 function roughFactorLog(factors){if(roughFactors.has(factors))return roughFactors.get(factors);let lo=0n,hi=0n;for(const [text,count]of factors){const b=roughAtomLog(text);if(!b){roughFactors.set(factors,null);return null;}lo+=count>=0n?count*b.lo:count*b.hi;hi+=count>=0n?count*b.hi:count*b.lo;}const result=Object.freeze({lo,hi});roughFactors.set(factors,result);return result;}
 function roughRowLog(row){if(roughRows.has(row))return roughRows.get(row);const factors=roughFactorLog(row.f);if(!factors)return null;const digits=String(abs(row.n)).length-String(row.d).length,result=Object.freeze({lo:row.e+BigInt(digits-1)+factors.lo,hi:row.e+BigInt(digits+1)+factors.hi});roughRows.set(row,result);return result;}
 // Exact coarse powers-of-ten enclosures of complete signed sums. A
 // separated positive anchor can dominate all negative rows; overlapping
 // ranges deliberately provide no comparison result.
 function positiveRange(values){
  if(wordRanges.has(values))return wordRanges.get(values);const r=prepare(values);let out;
  if(sumRanges.has(r))out=sumRanges.get(r);else{
   let lo=null,hi=null,negative=null,positives=0,negatives=0,unknown=false;
   for(const row of r){const b=roughRowLog(row);if(!b){unknown=true;break;}if(row.n>0n){positives++;lo=lo===null||b.lo>lo?b.lo:lo;hi=hi===null||b.hi>hi?b.hi:hi;}else{negatives++;negative=negative===null||b.hi>negative?b.hi:negative;}}
   out=null;
   if(!unknown&&positives&&(negative===null||lo>negative+BigInt(String(negatives).length)))out=Object.freeze({lo:lo-(negative===null?0n:1n),hi:hi+BigInt(String(positives).length)});
   sumRanges.set(r,out);
  }
  // Encoded inputs are immutable own string data, validated before reaching
  // here. Frozen accessors and detached mutable copies never inherit trust.
  if(encodedInputs.has(values)||values===preparedWords.get(r))wordRanges.set(values,out);return out;
 }
 // Directed significand intervals for exact rational rows. Comparing an
 // inverse probe must not first construct a thousands-digit difference.
 // No stored value is rounded: overlap always returns to the exact comparator.
 const rationalRanges=new WeakMap();
 function rationalRange(values){
  const rows=prepare(values);if(rationalRanges.has(rows))return rationalRanges.get(rows);
  const remember=value=>{const result=value&&Object.freeze(value);rationalRanges.set(rows,result);return result;};
  if(!rows.length||rows.some(row=>row.f.size))return remember(null);
  const orders=rows.map(row=>row.e+BigInt(String(abs(row.n)).length-String(row.d).length));
  const order=orders.reduce((a,b)=>a>b?a:b),places=24n;let lo=0n,hi=0n;
  for(let i=0;i<rows.length;i++){
   const row=rows[i];
   // |row| < 10^(orders[i]+1). Remote terms remain enclosed,
   // including their signs; they are never deleted from the balance.
   if(orders[i]+1n+places<=order){if(row.n<0n)lo--;else hi++;continue;}
   const shift=row.e-order+places;if(shift>4096n||shift< -4096n)return remember(null);
   const numerator=shift>=0n?row.n*10n**shift:row.n,denominator=shift>=0n?row.d:row.d*10n**(-shift);
   const q=numerator/denominator,r=numerator-q*denominator;
   lo+=q-(r<0n?1n:0n);hi+=q+(r>0n?1n:0n);
  }
  return remember(lo>0n?{order,lo,hi}:null);
 }
 function compareRanges(a,b){
  const left=positiveRange(a),right=positiveRange(b);
  if(left&&right){if(left.lo>right.hi)return 1;if(right.lo>left.hi)return -1;}
  if(!W.Core.Amount?.enabled())return null;
  const x=rationalRange(a),y=rationalRange(b);if(!x||!y)return null;
  const delta=x.order-y.order;if(delta>128n||delta< -128n)return null;
  const sx=delta>=0n?10n**delta:1n,sy=delta<0n?10n**(-delta):1n;
  return x.lo*sx>y.hi*sy?1:x.hi*sx<y.lo*sy?-1:null;
 }
 // Conservative guard for a transient nonlinear product. Positive terms
 // cannot cancel; this spread exceeds every supported coefficient/carry span.
 function separatedPositiveProduct(groups){
  if(!Array.isArray(groups)||groups.length<2||groups.length>64)return false;let separated=false;
  try{for(const words of groups){const r=prepare(words);if(!r.length||r.some(row=>row.n<=0n))return false;let maximum=null,minimum=null;
   for(const row of r){const bounds=roughRowLog(row);if(!bounds)return false;maximum=maximum===null||bounds.lo>maximum?bounds.lo:maximum;minimum=minimum===null||bounds.hi<minimum?bounds.hi:minimum;}
   if(maximum-minimum>65536n)separated=true;
  }}catch(error){if(error.code==='amount-unresolved')return false;throw error;}return separated;
 }
 function proof(prepared,c,withLog){return C.task('product-proof|'+c.places+'|'+withLog+'|'+proofIdentity(prepared),function*(){let remotePositive=0n,remoteNegative=0n;const entries=[],bounds=prepared.map(row=>{const known=rowLogCertificates.get(row);return known?.context===c?known.bounds:roughRowLog(row);});let anchor=0;
  for(let i=1;i<bounds.length;i++)if(bounds[i]&&(!bounds[anchor]||bounds[i].lo>bounds[anchor].lo))anchor=i;
  const anchorLog=prepared.length?yield ()=>rowLog(prepared[anchor],c):null;
  for(let i=0;i<prepared.length;i++){const row=prepared[i],rough=bounds[i];
   if(rough&&anchorLog&&(rough.hi+BigInt(c.places+4))*c.scale<anchorLog.lo){if(row.n<0n)remoteNegative++;else remotePositive++;continue;}
   const log=i===anchor?anchorLog:yield ()=>rowLog(row,c);entries.push({log,negative:row.n<0n});} 
  if(!entries.length)return {sign:0,log:null};
  const anchorValue=entries.reduce((best,row)=>!best||row.log.lo>best.log.lo?row:best,null),origin=anchorValue.log,cutoff=-BigInt(c.places+2)*c.scale;
  // Directed interval addition is exact integer arithmetic. All remote
  // positive [0,1] and negative [-1,0] bounds combine without rounding.
  let sum={lo:-remoteNegative,hi:remotePositive};
  for(const row of entries){const delta=c.sub(row.log,origin),part=row===anchorValue?c.fraction(1n):delta.hi<cutoff?{lo:0n,hi:1n}:yield ()=>c.pow10(delta);sum=row.negative?c.sub(sum,part):c.add(sum,part);}
  const sign=sum.lo>0n?1:sum.hi<0n?-1:0;if(!sign)fail('Product comparison needs further refinement','rank-cost-unresolved');if(!withLog)return {sign};if(sign<0)sum={lo:-sum.hi,hi:-sum.lo};const log=yield ()=>c.log10(sum);return {sign,log:c.add(origin,log)};
 });}
 // An out-of-capacity tower can still be ordered against a small threshold
 // without evaluating its logarithm. These are one-sided INTEGER enclosures,
 // not projected comparisons; null means an unbounded endpoint. Opposing
 // unbounded factors deliberately remain unresolved.
 const remoteLogFloor=10n**4096n;
 function remoteRowBounds(row){
  const digits=String(abs(row.n)).length-String(row.d).length;let lo=row.e+BigInt(digits-1),hi=row.e+BigInt(digits+1),remote=false;
  for(const [text,count]of row.f){
   let b=roughAtomLog(text);
   if(!b){const v=B.BN(text);if(v.sign<=0||v.layer<2)return null;
    if(v.layer===2&&Math.abs(v.mag)<=4096)return null;
    b=v.mag>0?{lo:remoteLogFloor,hi:null}:{lo:null,hi:-remoteLogFloor};remote=true;
   }
   const low=count>=0n?b.lo:b.hi,high=count>=0n?b.hi:b.lo;
   lo=lo===null||low===null?null:lo+count*low;hi=hi===null||high===null?null:hi+count*high;
  }return {lo,hi,remote};
 }
 function remoteSeparatedSign(rows){
  const bounds=rows.map(remoteRowBounds);if(bounds.some(x=>!x)||!bounds.some(x=>x.remote))return null;
  for(const sign of [1,-1]){let lower=null,upper=null,count=0,unbounded=false;
   for(let i=0;i<rows.length;i++){const b=bounds[i];if((rows[i].n>0n?1:-1)===sign){if(b.lo!==null&&(lower===null||b.lo>lower))lower=b.lo;}
    else {count++;if(b.hi===null)unbounded=true;else if(upper===null||b.hi>upper)upper=b.hi;}}
   if(!unbounded&&lower!==null&&upper!==null&&lower>upper+BigInt(String(count).length))return sign;
  }return null;
 }
 function sign(values){const r=prepare(values);if(!r.length)return 0;const signs=rowSigns.get(r);if(signs===1)return 1;if(signs===2)return -1;
  const bounds=r.map(roughRowLog);if(bounds.every(Boolean)){
   const positive=bounds.filter((_,i)=>r[i].n>0n),negative=bounds.filter((_,i)=>r[i].n<0n),maximum=(values,key)=>values.reduce((v,b)=>v===null||b[key]>v?b[key]:v,null);
   if(maximum(positive,'lo')>maximum(negative,'hi')+BigInt(String(negative.length).length))return 1;
   if(maximum(negative,'lo')>maximum(positive,'hi')+BigInt(String(positive.length).length))return -1;
  }
  if(bounds.some(b=>!b)){const remote=remoteSeparatedSign(r);if(remote!==null)return remote;}
  if(r.every(t=>!t.f.size)){let denominator=1n;for(const row of r){denominator=denominator/gcd(denominator,row.d)*row.d;digits(denominator);}return L.strict.sign(r.map(row=>String(row.n*(denominator/row.d))+'e'+String(row.e)));}for(const p of (W.Core.Amount?.enabled()?[32,80,160,320,512]:[80,160,320,512]))try{return proof(r,C.context(p),false).sign;}catch(e){if(e.code!=='rank-cost-unresolved')throw e;}fail('Product comparison unresolved','amount-unresolved');
 }
 const logarithm=(values,c)=>{const result=proof(prepare(values),c,true);if(result.sign!==1)fail('Product logarithm requires a positive quantity','amount-formula-domain');return result.log;};
 // A decoded monomial is immutable numeric data. Retain only its vendor
 // display components; every caller receives a fresh Decimal and every sum
 // still executes in the original order. No quantity/source/owner cache.
 function projectionParts(row){let parts=rowProjections.get(row);if(!parts){const value=projectedRow(row);parts=Object.freeze({sign:value.sign,layer:value.layer,mag:value.mag});rowProjections.set(row,parts);}return parts;}
 function projectRow(row){if(!W.Core.Amount?.enabled())return projectedRow(row);const parts=projectionParts(row);return B.Decimal.fromComponents_noNormalize(parts.sign,parts.layer,parts.mag);}
 function projectedRow(row){let value=B.div(L.project(String(abs(row.n))),L.project(String(row.d)));if(row.e)value=B.mul(value,B.pow10(L.project(String(row.e))));for(const [factor,count]of row.f)value=B.mul(value,B.pow(factor,L.project(String(count))));return row.n<0n?value.neg():value;}
 // The original vendor fold chooses maxabs as soon as an operand has
 // layer>=2. One huge term with |others|<=1 dominates any <=4095-term
 // prefix. For same-sign rows, a largest layer2 magnitude>=16 (or higher
 // layer) also dominates every ordinary prefix: that prefix is below
 // 10^(9e15+5), while the selected term is at least10^(1e16).
 // Mixed signs/multiple cancelling huge terms keep the original fold.
 function dominantProjection(rows){
  if(!W.Core.Amount?.enabled()||rows.length<2)return null;
  let dominant=null,huge=0,bounded=true,sign=0,mixed=false;
  for(const row of rows){const p=projectionParts(row);if(!Number.isFinite(p.layer)||!Number.isFinite(p.mag))return null;
   if(p.sign){if(sign&&sign!==p.sign)mixed=true;else if(!sign)sign=p.sign;}
   if(p.layer>=2&&p.mag>0&&p.sign){huge++;if(!dominant||p.layer>dominant.layer||p.layer===dominant.layer&&p.mag>dominant.mag)dominant=p;}
   else if(p.sign&&!(p.layer===0&&p.mag<=1||p.layer>0&&p.mag<0))bounded=false;
  }
  return dominant&&(huge===1&&bounded||!mixed&&(dominant.layer>2||dominant.mag>=16))?B.Decimal.fromComponents_noNormalize(dominant.sign,dominant.layer,dominant.mag):null;
 }
 function value(values){const r=prepare(values);if(!r.length)return B.ZERO;let out=dominantProjection(r);if(!out){out=B.ZERO;for(const row of r)out=B.add(out,projectRow(row));}const s=sign(values);if(B.isFiniteBN(out)&&out.sign===s)return out;
  for(const p of (W.Core.Amount?.enabled()?[32,80,160,320,512]:[80,160,320,512])){const c=C.context(p);try{const result=proof(r,c,true),log=result.log,magnitude=c.roundLayerOneExponent(log);if(Number.isFinite(magnitude)&&Math.abs(magnitude)<9e15)return B.Decimal.fromComponents(result.sign,1,magnitude);const negative=log.hi<0n,positive=negative?{lo:-log.hi,hi:-log.lo}:log,coordinate=c.round(c.log10(positive));return B.Decimal.fromComponents(result.sign,2,negative?-coordinate:coordinate);}catch(e){if(e.code!=='rank-cost-unresolved')throw e;}}
  fail('Product quantity projection unresolved','amount-unresolved');
 }

 // Bounded storage is an explicit owner policy. Generic exact arithmetic and
 // integer/paid-price ledgers do not call this function.
 const tailPolicy=Object.freeze({id:'directed-tail-32-8-24-v2',version:2,coefficientPlaces:32,capacity:24,target:8,retainedFullRows:5,coefficientDigits:512});
 function rationalOrder(n,d){n=abs(n);let k=String(n).length-String(d).length;if(k>=0?n<d*10n**BigInt(k):n*10n**BigInt(-k)<d)k--;return BigInt(k);}
 function compactGroupDirected(group,negative,signed=false){
  if(group.length===1){const row=group[0];if(!oversizedCoefficient(row))return Object.freeze({row,error:canonical({n:0n,d:1n,e:0n,f:emptyFactors})});
   // Exact integer division gives a directed32-place coefficient certificate;
   // no logarithm, scalar projection or dense power-of-ten resource is needed.
   const order=rationalOrder(row.n,row.d),shift=BigInt(tailPolicy.coefficientPlaces)-order;
   const n=abs(row.n)*(shift>0n?10n**shift:1n),d=row.d*(shift<0n?10n**(-shift):1n),rest=n%d;
   const coefficient=n/d+(negative&&rest?1n:0n),e=row.e-shift;
   return Object.freeze({row:canonical({n:negative?-coefficient:coefficient,d:1n,e,f:row.f}),error:canonical({n:rest?1n:0n,d:1n,e,f:row.f})});
  }
  const key='tail-cap-group|'+negative+'|'+signed+'|'+proofIdentity(group);
  return C.task(key,function*(){
   for(const places of [80,160,320,512]){
    try{return yield ()=>C.task(key+'|'+places,function*(){
     const c=C.context(places),logs=[];let unit=10n**BigInt(places-tailPolicy.coefficientPlaces);
     for(const row of group)logs.push(yield ()=>rowLog(row,c));
     let best=0;for(let i=1;i<logs.length;i++)if(logs[i].lo>logs[best].lo)best=i;
     const chosen=group[best],basis=canonical({n:1n,d:1n,e:chosen.e+rationalOrder(chosen.n,chosen.d),f:chosen.f}),origin=yield ()=>rowLog(basis,c);
     let lo=0n,hi=0n;
     for(let i=0;i<group.length;i++){
      const delta=c.sub(logs[i],origin);let interval;
      if(delta.hi < -BigInt(places+4)*c.scale)interval={lo:0n,hi:1n};
      else {if(delta.hi>c.scale)throw Object.assign(Error('Tail anchor needs refinement'),{code:'rank-cost-unresolved'});interval=yield ()=>coordinatePower10(c,delta);}
      if(signed&&group[i].n<0n){lo-=interval.hi;hi-=interval.lo;}else{lo+=interval.lo;hi+=interval.hi;}
     }
     if(lo<=0n)throw Object.assign(Error('Tail coefficient needs refinement'),{code:'rank-cost-unresolved'});
     // Cancellation can make the net balance much smaller than the anchor.
     // Quantize that NET interval to32 decimal places, refining the proof if
     // it does not yet resolve that many digits. Never round a tiny net to0.
     if(signed){const shift=String(lo).length-1-tailPolicy.coefficientPlaces;
      if(shift<0)throw Object.assign(Error('Tail net coefficient needs refinement'),{code:'rank-cost-unresolved'});
      unit=10n**BigInt(shift);
     }
     if(hi-lo>unit)throw Object.assign(Error('Tail coefficient needs refinement'),{code:'rank-cost-unresolved'});
     const coefficient=negative?(hi+unit-1n)/unit:lo/unit,denominator=signed?c.scale/unit:10n**BigInt(tailPolicy.coefficientPlaces),error=negative?coefficient*unit-lo:hi-coefficient*unit;
     if(coefficient<=0n)throw Object.assign(Error('Tail positive coefficient needs refinement'),{code:'rank-cost-unresolved'});
     if(error<0n||error>2n*unit)fail('Tail coefficient error certificate invalid');
     return Object.freeze({row:canonical({...basis,n:negative?-coefficient:coefficient,d:denominator}),error:canonical({...basis,n:error,d:c.scale})});
    });}catch(error){if(error.code!=='rank-cost-unresolved')throw error;}
   }
   fail('Tail compaction coefficient unresolved','amount-compaction-unresolved');
  });
 }
 // A single exact fraction can grow without increasing the row count. Owner
 // compaction must run before its next multiplication reaches the2048-digit
 // arithmetic boundary. The existing32-place directed certificate is unchanged.
 const oversizedCoefficient=row=>String(abs(row.n)).length>tailPolicy.coefficientDigits||String(row.d).length>tailPolicy.coefficientDigits;
 const needsCompaction=values=>{const rows=prepare(values);return rows.length>tailPolicy.capacity||rows.some(oversizedCoefficient);};
 function compact(values,{force=false,collapse=false}={}){
  const input=prepare(values),original=preparedWords.get(input);
  if(!W.Core.Amount?.enabled()||!force&&input.length<=tailPolicy.capacity&&!input.some(oversizedCoefficient))return Object.freeze({words:original,errorWords:Object.freeze([]),sourceTerms:input.length,resultTerms:input.length,compacted:false,policyId:tailPolicy.id});
  return C.task('tail-cap|'+tailPolicy.id+'|'+collapse+'|'+proofIdentity(input),function*(){
   // Final-form fallback: one directed signed coefficient prevents the exact
   // collector from recreating long gap-filled coefficients between retained rows.
   // Re-evaluate the ORIGINAL input so this bound includes the entire loss.
   if(collapse){
    const packed=yield ()=>compactGroupDirected(input,false,true);
    const result=finalizedRows(collect([packed.row])),loss=finalizedRows(collect([packed.error]));
    return Object.freeze({words:preparedWords.get(result),errorWords:preparedWords.get(loss),sourceTerms:input.length,resultTerms:result.length,compacted:true,policyId:tailPolicy.id});
   }
   // Projection chooses only the packing candidate/order. Directed intervals
   // below independently establish every rounding bound.
   const ordered=input.map(row=>({row,estimate:projectRow(row).abs()})).sort((a,b)=>(B.gt(b.estimate,a.estimate)?1:B.lt(b.estimate,a.estimate)?-1:0)|| (rowKey(a.row)<rowKey(b.row)?-1:rowKey(a.row)>rowKey(b.row)?1:0));
   const retained=[],rest=[];for(const {row}of ordered)(retained.length<tailPolicy.retainedFullRows&&!oversizedCoefficient(row)?retained:rest).push(row);
    const positive=Object.freeze(rest.filter(r=>r.n>0n)),negative=Object.freeze(rest.filter(r=>r.n<0n)),errors=[];
   for(const [group,isNegative]of [[positive,false],[negative,true]])if(group.length){const result=yield ()=>compactGroupDirected(group,isNegative);retained.push(result.row);if(result.error.n)errors.push(result.error);}
   const result=finalizedRows(collect(retained)),loss=finalizedRows(collect(errors));
   return Object.freeze({words:preparedWords.get(result),errorWords:preparedWords.get(loss),sourceTerms:input.length,resultTerms:result.length,compacted:true,policyId:tailPolicy.id});
  });
 }

 W.Core.AmountProducts=Object.freeze({compact,tailPolicy,needsCompaction,termCount:values=>prepare(values).length,wordKinds,compareRanges,numericIdentity,preparedView:values=>{const rows=preparedInput(values);return rows?preparedWords.get(rows):null;},extended:values=>{const rows=preparedInput(values);return rows?extendedRows.get(rows):null;},wordView:values=>preparedWords.get(prepare(values)),copyPrepared,sumView,isPrepared:values=>preparedInput(values)!==null,separatedPositiveProduct,mathWorkMemo,workMemo,inputKey,releaseWorkMemo,numericLog,coordinatePower10,isProduct,hasProduct,validate:raw=>{token(raw);return String(raw);},normalize,multiply,divide,sign,value,logarithm});
}(window.WIS));
