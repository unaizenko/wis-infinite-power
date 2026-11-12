'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{setup75,setupAmount}=require('./amount-fixture.cjs');
const tiny=(n=48,negative=false)=>Array.from({length:n},(_,i)=>(negative&&i%3===0?'-':'')+'ee-'+(20+i/1000).toFixed(3));
function q(n,d=1n){const gcd=(a,b)=>{a=a<0n?-a:a;while(b){const r=a%b;a=b;b=r;}return a||1n;},g=gcd(n,d);return {n:n/g,d:d/g};}
const add=(a,b)=>q(a.n*b.d+b.n*a.d,a.d*b.d),mul=(a,b)=>q(a.n*b.n,a.d*b.d),sub=(a,b)=>add(a,{n:-b.n,d:b.d}),cmp=(a,b)=>{const n=a.n*b.d-b.n*a.d;return n<0n?-1:n>0n?1:0;};
function scalar(text){const m=/^(-?\d+)(?:e([+-]?\d+))?$/.exec(text);assert(m,'oracle unexpected atom '+text);const e=BigInt(m[2]||0);return e>=0?q(BigInt(m[1])*10n**e):q(BigInt(m[1]),10n**(-e));}
function word(text){let sign=1n;if(text.startsWith('-')){sign=-1n;text=text.slice(1);}let r;if(text.startsWith('@product:1:')){const v=JSON.parse(text.slice(11));let e=BigInt(v.e);for(const [f,k]of v.f){assert.equal(f,'10');e+=BigInt(k);}r=mul(q(BigInt(v.n),BigInt(v.d)),scalar('1e'+e));}else if(text.startsWith('@ratio:1:')){const v=JSON.parse(text.slice(9));r=mul(v.terms.reduce((a,w)=>add(a,word(w)),q(0n)),q(1n,BigInt(v.denominator)));}else r=scalar(text);return mul(r,q(sign));}
const fraction=(A,value)=>A.wordView(value).reduce((a,w)=>add(a,word(w)),q(0n));

test('bounded storage has a24-row trigger and an8-tail target while ordinary Amount serialization remains exact',()=>{const {W}=setup75(),A=W.Core.Amount;assert.equal(typeof A.compact,'function','bounded compactor is missing');const small=A.fromParts(100,tiny(20)),same=A.compact(small);assert.equal(same.value,small);assert.equal(same.compacted,false);const original=A.fromParts(100,tiny()),report=A.compact(original);assert(report.compacted);assert(report.value.tail.length<=8);assert(W.Core.AmountProducts.termCount(A.wordView(report.value))<=8);assert(A.compare(report.value,original)<=0);assert(A.compare(A.subtract(original,report.value),report.lossUpper)<=0);const exact=A.fieldParts(original);assert.equal(A.compare(A.field(exact),original),0);assert(original.tail.length>8,'source was unexpectedly changed');});

test('positive and negative compactions have independently checked directed rational loss bounds',()=>{const {W}=setup75(),A=W.Core.Amount;for(const mixed of [false,true]){const terms=Array.from({length:40},(_,i)=>'@product:1:'+JSON.stringify({n:mixed&&i%3===0?'-1':'1',d:'1',e:'0',f:[['10',String(-i-1)]]})),original=A.fromParts(100,terms),before=fraction(A,original),report=A.compact(original),after=fraction(A,report.value),loss=sub(before,after),bound=fraction(A,report.lossUpper);assert(report.compacted);assert(cmp(loss,q(0n))>=0,'compaction created money');assert(cmp(loss,bound)<=0,'declared error is too small');assert(cmp(loss,q(1n,10n**32n))<0,'candidate precision is too coarse');assert(report.value.tail.length<=8);}});

test('an opaque anchor retains its rational coefficient and a deficient payment never rounds up to affordable',()=>{const {W}=setup75(),A=W.Core.Amount,base=A.scale(A.from('ee30.12345'),.1),original=A.add(base,A.fromParts(0,tiny())),report=A.compact(original);assert(report.compacted);assert(A.compare(report.value,base)>=0);assert(A.compare(report.value,'ee30.12345')<0,'one tenth of the anchor disappeared');const deficient=A.fromParts(100,[...tiny(48,true),'-1e-120']),r=A.compact(deficient);assert(A.compare(r.value,100)<0);assert(A.compare(r.value,deficient)<=0);});

test('the same compaction resumes one proof operation at a time without changing input or leaking scopes',()=>{const {W}=setup75(),A=W.Core.Amount,C=W.Core.CertifiedRankMath,original=A.fromParts(100,tiny()),before=JSON.stringify(A.serialize(original)),expected=A.compact(original),work=C.createWork(()=>A.compact(original));let next,n=0;do{next=work.advance({maximumOperations:1});assert(++n<200000);assert.equal(C.isWorkActive(),false);}while(!next.done);const actual=work.result();assert.deepEqual(A.serialize(actual.value),A.serialize(expected.value));assert.deepEqual(A.serialize(actual.lossUpper),A.serialize(expected.lossUpper));assert.equal(JSON.stringify(A.serialize(original)),before);const pending=C.createWork(()=>A.compact(A.fromParts(100,tiny(49))));pending.advance({maximumOperations:1});pending.cancel();assert.throws(()=>pending.result(),e=>e.code==='rank-work-cancelled');assert.equal(C.isWorkActive(),false);});

test('boundedFieldParts is opt-in and model74 never changes a complete input',()=>{const {W}=setupAmount({model:74}),A=W.Core.Amount,original=A.fromParts(100,tiny());assert.equal(typeof A.boundedFieldParts,'function');const parts=A.boundedFieldParts(original);assert.equal(A.compare(A.field(parts),original),0);});

test('an already representable singleton debit is kept exact during larger positive-tail packing',()=>{const {W}=setup75(),A=W.Core.Amount,original=A.fromParts(100,[...tiny(),'-ee-80.12345']),report=A.compact(original);assert(report.compacted);assert(A.wordView(original).filter(w=>w.startsWith('-')).every(w=>A.wordView(report.value).includes(w)),'a lone exact debit was unnecessarily quantized');});

test('24 ordinary virtual tail rows remain exact and25 trigger storage packing',()=>{const {W}=setup75(),A=W.Core.Amount;const a=A.fromParts(100,tiny(24)),b=A.fromParts(100,tiny(25));assert.equal(A.compact(a).compacted,false);assert(A.compact(b).compacted);});

test('final-form signed collapse has an independent rational error certificate',()=>{
 const {W}=setup75(),A=W.Core.Amount,P=W.Core.AmountProducts;
 for(const mixed of [false,true])for(const offset of [0,800,-800]){
  const terms=Array.from({length:40},(_,i)=>(mixed&&i%3===0?'-':'')+'1e'+(offset-i-1)),original=A.fromParts('1e'+(offset+2),terms),before=fraction(A,original);
  const packed=P.compact(A.wordView(original),{force:true,collapse:true}),value=A.fromParts(0,packed.words),after=fraction(A,value),loss=sub(before,after),bound=fraction(A,A.fromParts(0,packed.errorWords));
  assert(cmp(loss,q(0n))>=0);assert(cmp(loss,bound)<=0);assert(cmp(loss,mul(before,q(1n,10n**30n)))<0);
  assert(!P.needsCompaction(value.tail));assert.equal(A.compare(A.read(A.serialize(value)),value),0);
 }
});

test('signed final-form collapse measures precision against the net balance after strong cancellation',()=>{
 const {W}=setup75(),A=W.Core.Amount,P=W.Core.AmountProducts;
 const words=['1e100','-@product:1:'+JSON.stringify({n:String((10n**100n-21n*10n**67n)/2n),d:'1',e:'0',f:[['2','1']]})];
 const packed=P.compact(words,{force:true,collapse:true}),actual=A.fromParts(0,packed.words),expected=A.from('2.1e68');
 assert(A.compare(actual,expected)<=0);assert(A.compare(A.subtract(expected,actual),A.scale(expected,'1e-30'))<=0,'net balance lost precision through cancellation');
 assert(A.compare(A.fromParts(0,packed.errorWords),A.scale(expected,'1e-30'))<=0,'error certificate must use net balance scale');
});
