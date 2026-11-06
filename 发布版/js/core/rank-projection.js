(function(W){
 "use strict";
 // Versioned, local replay of the bundled Decimal projection. No tolerance,
 // global Math mutation or alternative resource backend is used.
 const B=W.Core.BigNum,C=W.Core.CertifiedRankMath,profiles=Object.freeze({'schema73-log14-a':.14612803567823798,'schema73-log14-b':.146128035678238}),backends=new Map(),cache=new Map();
 const fail=m=>{throw Object.assign(Error(m),{code:'rank-basis-invalid'});};
 function backend(id){if(!Object.prototype.hasOwnProperty.call(profiles,id))fail('unknown rank projection producer');if(backends.has(id))return backends.get(id);const math=Object.create(Math);math.log10=x=>x===1.4?profiles[id]:C.log10Number(x);math.pow=(x,y)=>{if(x!==10)fail('unregistered projection power');return C.pow10Number(y);};const D=B.Decimal.withMath(math);backends.set(id,D);return D;}
 function valueOf(D,value){if(B.isDecimal(value))return D.fromComponents_noNormalize(value.sign,value.layer,value.mag);const parsed=new D(value);if(parsed.isFinite())return parsed;const b=W.Core.Rank.project(value);return D.fromComponents_noNormalize(b.sign,b.layer,b.mag);}
 function replay(origin,id){
  const key=id+'|'+JSON.stringify(origin);if(cache.has(key))return cache.get(key);
  const M=W.Meta.BigNumbers,D=backend(id),target=M.legacyTargetRank(origin),x=typeof target==='number'&&Number.isSafeInteger(target)?target-3:valueOf(D,target).sub(3),v=new D(1.4).pow(x).mul(28800);
  if(!v.isFinite()||v.lte(0))fail('projection not finite');const result=Object.freeze({sign:v.sign,layer:v.layer,mag:v.mag});if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function equal(origin,text,id){if(typeof text!=='string'||text.length>4096||!B.isNumericText(text))return false;try{const D=backend(id),p=replay(origin,id),v=new D(text);return v.sign===p.sign&&v.layer===p.layer&&v.mag===p.mag;}catch(e){if(e.code==='rank-cost-unresolved')return false;throw e;}}
 function read(origin,text,descriptor){
  if(descriptor!==undefined){if(!descriptor||typeof descriptor!=='object'||Array.isArray(descriptor)||descriptor.version!==1||Object.keys(descriptor).sort().join(',')!=='producer,version'||!Object.prototype.hasOwnProperty.call(profiles,descriptor.producer)||!equal(origin,text,descriptor.producer))fail('rank projection producer/unit mismatch');return {version:1,producer:descriptor.producer};}
  for(const id of Object.keys(profiles))if(equal(origin,text,id))return {version:1,producer:id};fail('legacy unit has no certified replay producer');
 }
 function value(origin,text,descriptor){const d=read(origin,text,descriptor),p=replay(origin,d.producer);return B.Decimal.fromComponents_noNormalize(p.sign,p.layer,p.mag);}
 W.Core.RankProjection=Object.freeze({read,value,profiles:Object.freeze(Object.keys(profiles))});
}(window.WIS));
