(function defineAmountLedger(W){
 'use strict';
 // Bounded data-only rational pages extend NEW quantities. Legacy SignedLedger
 // and Rank keep their existing wire format and mathematical contracts.
 const P=W.Core.AmountProducts;if(!P)throw Object.assign(Error('AmountLedger requires exact product data'),{code:'amount-dependency'});
 const L=W.Core.SignedLedger,B=W.Core.BigNum,Q=W.Core.RankBudget.Q,PREFIX='@ratio:1:';
 const fail=(message,code='amount-invalid')=>{throw Object.assign(Error(message),{code});};
 const isRatio=raw=>typeof raw==='string'&&/^-?@ratio:/.test(raw);
 // Strict numeric page decoding only. Values contain frozen strings and
 // denominators; rank-session trust is never inherited by another owner.
 const parsedRatios=new Map();let parsedRatioCharacters=0;
 function rememberRatio(raw,value){
  if(!W.Core.Amount?.enabled()||raw.length>65536)return;
  if(W.Core.RankExact.is(value)||!Object.isFrozen(value)||!Object.isFrozen(value.terms))fail('rational numeric decoder result invalid');
  const characters=raw.length+value.denominator.length+value.terms.reduce((n,word)=>n+word.length,0);if(characters>65536)return;
  while(parsedRatios.size>=4096||parsedRatioCharacters+characters>2097152){const key=parsedRatios.keys().next().value;parsedRatioCharacters-=parsedRatios.get(key).characters;parsedRatios.delete(key);}
  parsedRatios.set(raw,{value,characters});parsedRatioCharacters+=characters;
 }
 function readRatio(raw){
  if(typeof raw!=='string'||raw.length>1048576)fail('rational quantity page capacity','amount-unresolved');
  if(W.Core.Amount?.enabled()&&parsedRatios.has(raw)){const entry=parsedRatios.get(raw);parsedRatios.delete(raw);parsedRatios.set(raw,entry);return entry.value;}
  const cache=raw.length<=1048576?P.workMemo('amount-ratio-reads'):null;if(cache?.has(raw))return cache.get(raw);
  const m=/^(-?)(@ratio:.*?)(?:\*([1-9]\d*))?$/.exec(raw);if(!m||!m[2].startsWith(PREFIX)||m[3]?.length>2048)fail('rational quantity page version/format');
  let data;try{data=JSON.parse(m[2].slice(PREFIX.length));}catch(e){fail('rational quantity page JSON');}
  if(!data||Array.isArray(data)||Object.keys(data).sort().join(',')!=='denominator,terms'||typeof data.denominator!=='string'||!Array.isArray(data.terms)||data.terms.some(v=>typeof v!=='string'||isRatio(v)))fail('rational quantity page shape');
  let value=Q.read(data);if(m[1])value=Q.negate(value);if(m[3])value=Q.multiply(value,Q.decimal(m[3]));if(cache)cache.set(raw,value);rememberRatio(raw,value);return value;
 }
 function validate(raw){if(P.isProduct(raw)){P.validate(raw);return String(raw);}if(isRatio(raw)){readRatio(raw);return String(raw);}for(const word of L.expand([raw])){if(isRatio(word)){readRatio(word);continue;}const m=/^(.*?)(?:\*([1-9]\d*))?$/.exec(String(word));if(!m||m[2]?.length>2048||!B.isNumericText(m[1])||!(B.parseFinite(m[1])||B.isFiniteBN(L.project(m[1]))))fail('quantity numeric word invalid');}return String(raw);}
 const hasRatio=values=>{const kinds=P.wordKinds(values);return kinds===null?[...L.expand(values)].some(isRatio):!!(kinds&2);};
 function toQ(values){
  if(P.hasProduct(values))fail('Product quantity cannot be read as a plain rational','amount-unresolved');
  const key=P.inputKey(values),cache=key===null?null:P.workMemo('amount-to-q');
  if(cache?.has(key))return cache.get(key);
  const ordinary=[];let result=Q.decimal(0),empty=true;
  for(const raw of L.expand(values)){validate(raw);if(isRatio(raw)){const value=readRatio(raw);result=empty?value:Q.add(result,value);empty=false;}else ordinary.push(String(raw));}
  if(ordinary.length){const terms=[...L.expand(L.safeNormalize(ordinary))],value=Q.read({terms,denominator:'1'});result=empty?value:Q.add(result,value);}
  if(cache)cache.set(key,result);return result;
 }
 function packed(value){value=Q.read(value);if(W.Core.RankExact.is(value)||!Array.isArray(value.terms)||typeof value.denominator!=='string')fail('Quantity rational expression requires a certified nonlinear projection','amount-unresolved');return value.denominator==='1'?value.terms.slice():[PREFIX+JSON.stringify(value)];}
 const normalize=values=>P.extended(values)===true?P.copyPrepared(values):P.hasProduct(values)||hasRatio(values)?P.normalize(values):L.safeNormalize(values);
 const negate=values=>P.extended(values)===true?P.copyPrepared(P.sumView([],values,true)):L.negate(values);
 const add=(a,b)=>P.extended(a)===true||P.extended(b)===true?P.copyPrepared(P.sumView(a,b)):normalize([...a,...b]);
 const subtract=(a,b)=>P.extended(a)===true||P.extended(b)===true?P.copyPrepared(P.sumView(a,b,true)):add(a,negate(b));
 const sign=values=>P.isPrepared(values)||P.hasProduct(values)||hasRatio(values)?P.sign(values):L.strict.sign(values);
 const compare=(a,b)=>sign(subtract(a,b));
 const value=values=>{const kind=P.extended(values);return (kind===null?P.hasProduct(values)||hasRatio(values):kind)?P.value(values):L.value(values);};
 function scale(values,factor){
  if(P.hasProduct(values)||hasRatio(values))return P.multiply(values,[factor]);
  const normalizedFactor=L.safeNormalize([factor]);if(!normalizedFactor.length)return [];
  const f=normalizedFactor[0],m=/^(-?\d+)e([+-]?\d+)$/.exec(f),opaque=[...L.expand(values)].some(v=>!/^(-?\d+)e([+-]?\d+)(?:\*[1-9]\d*)?$/.test(v));
  if(!hasRatio(values)&&(!opaque||m&&BigInt(m[2])>=0n&&BigInt(m[2])+BigInt(m[1].replace('-','').length)<=2048n)){try{return L.scale(values,f);}catch(e){if(!(e instanceof L.LedgerError))throw e;return P.multiply(values,[f]);}}
  return P.multiply(values,[f]);
 }
 const multiply=(a,b)=>P.multiply(a,b);
 const divide=(a,b)=>{if(P.hasProduct(a)||P.hasProduct(b))return P.divide(a,b);const denominator=[...L.expand(b)];if(denominator.length===1&&!isRatio(denominator[0])&&!String(denominator[0]).startsWith('-'))return P.divide(a,b);try{return packed(Q.dividePlain(toQ(a),toQ(b)));}catch(e){if(e.code!=='rank-cost-unresolved'&&e.code!=='amount-unresolved'&&!(e instanceof L.LedgerError))throw e;return P.divide(a,b);}};
 const api={...L,ratioValue:readRatio,isProduct:P.isProduct,hasProduct:P.hasProduct,productLogarithm:P.logarithm,multiply,divide,isRatio,hasRatio,validate,toQ,fromQ:packed,normalize,safeNormalize:normalize,sign,compare,add,subtract,negate,value,scale,project:raw=>isRatio(String(raw))||P.isProduct(String(raw))?value([String(raw)]):L.project(raw)};
 api.strict=Object.freeze({normalize,sign,compare,add,subtract});api.bounded=()=>api;W.Core.AmountLedger=Object.freeze(api);
}(window.WIS));
