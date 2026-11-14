'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup75}=require('./amount-fixture.cjs');
function fixture(reference=false){const {W}=setup75({targetSchema:76,transformSource(file,s){
 if(file==='js/core/amount.js'&&reference)s=s.replace(/const sign=words\.length===0\?0:words\.every\(w=>\/\^\[1-9\]\\d\*e-\?\\d\+\$\/\.test\(w\)\)\?1:L\.strict\.sign\(words\);/,'const sign=L.strict.sign(words);');
 if(file==='js/core/signed-ledger.js')s=s.replace('function uncached_normalize(values, limit = MAX_TERMS) {','function uncached_normalize(values, limit = MAX_TERMS) { WIS.__normalizations=(WIS.__normalizations||0)+1;');return s;}});return W;}
test('validated positive decimal quantity does not normalize the same words again to determine sign',()=>{
 const W=fixture(),A=W.Core.Amount;W.__normalizations=0;const value=A.from('1234567.891234');assert.equal(W.__normalizations,1);assert.equal(A.compare(value,0),1);assert.equal(String(A.project(value)),'1234567.891234');
});
test('normalized-sign shortcut preserves full words, projections, negative rejection and mixed-tail fallback',()=>{
 const states=[];for(const reference of [true,false]){const W=fixture(reference),A=W.Core.Amount,C=W.Core.CertifiedRankMath,rows=[];
 C.withWork(()=>{for(const main of ['0','1','1.23456789123456789','1e-200','1e5000','ee3000'])for(const tail of [[],['1e-210'],['-1e-210']]){try{const a=A.fromParts(main,tail);rows.push({main,tail,words:Array.from(A.words(a)),serialized:JSON.parse(JSON.stringify(A.serialize(a)))});}catch(e){rows.push({main,tail,error:e.code||e.message});}}
 for(const x of [-1,'NaN','Infinity','bad','-1e400']){assert.throws(()=>A.from(x));}const product=A.multiply(A.from('1e5000'),A.from('1.23456789123456789'));rows.push({product:A.serialize(product)});});states.push(JSON.parse(JSON.stringify(rows)));}assert.deepEqual(states[1],states[0]);
});
