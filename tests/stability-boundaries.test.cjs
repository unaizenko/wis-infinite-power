'use strict';
// Cross-module boundary entrypoint: retain the original strict assertions.
require('./amount-power-identity.test.cjs');
require('./draft-nested-commit.test.cjs');
require('./preview-backlog-scheduling.test.cjs');
require('./source-preview-cooperative.test.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),{setup75}=require('./amount-fixture.cjs');
test('ledger/product capacity interop at 2048 and 8192 digits remains exact',()=>{const {W}=setup75(),P=W.Core.AmountProducts;for(const d of [2048,2049,2320,4096,8192]){const n='1'+'0'.repeat(d-2)+'7',rows=P.normalize([n+'e0']);let sum=0n;for(const row of rows){const m=/^(-?\d+)e([+-]?\d+)$/.exec(row);assert(m);sum+=BigInt(m[1])*10n**BigInt(m[2]);}assert.equal(sum,BigInt(n));assert.equal(P.sign([n+'e0','-'+n+'e0']),0);}assert.throws(()=>P.normalize(['1'+'0'.repeat(8191)+'7e0']));assert.throws(()=>P.normalize(['@product:1:'+JSON.stringify({n:'1'+'0'.repeat(2047)+'7',d:'1',e:'0',f:[]})]));});
