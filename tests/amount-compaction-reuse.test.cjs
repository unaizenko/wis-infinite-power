'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
test('successful full-value compaction is reused only inside its numeric owner',()=>{
 const {W}=loadProductionNumericRuntime(),A=W.Core.Amount,P=W.Core.AmountProducts,B=W.Core.RankBudget.Budget;
 const value=A.fromParts('ee100',Array.from({length:30},(_,i)=>'ee'+(20+i/100))),before=JSON.stringify(A.serialize(value));let calls=0;
 W.Core.AmountProducts={...P,compact(...args){calls++;return P.compact(...args);}};
 const session=B.createSession();let first,second;try{B.withSession(session,()=>{first=A.compact(value);second=A.compact(value);});}finally{session.close();}
 assert.equal(calls,1,'same confirmed input repeated its compaction');assert(first.compacted&&second.compacted);assert.equal(A.compare(first.value,second.value),0);assert.equal(A.compare(first.lossUpper,second.lossUpper),0);assert.equal(JSON.stringify(A.serialize(value)),before);
 const other=B.createSession();try{B.withSession(other,()=>A.compact(value));}finally{other.close();}assert.equal(calls,2,'new owner reused the previous candidate cache');
});
