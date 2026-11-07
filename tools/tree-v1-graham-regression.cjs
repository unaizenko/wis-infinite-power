'use strict';
// Compare direct BigNumbers results to the untouched development baseline.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
const {WIS:W}=require('../tests/offline-fixed-20260912-r9/load.cjs'),N=W.Meta.BigNumbers,S=W.Core.State,B=W.Core.BigNum;
const baseline=process.env.WIS_TREE_BASELINE;if(!baseline)throw Error('Set WIS_TREE_BASELINE to original meta/big-numbers.js');
vm.runInThisContext(fs.readFileSync(baseline,'utf8'),{filename:baseline});const old=W.Meta.BigNumbers;W.Meta.BigNumbers=N;
const clean=s=>{const value=S.toSerializable(s).meta.bigNumbers;delete value.tree;return value;};
let count=0;
for(const fixedSources of [false,true])for(const g of [0,1,2,3,4,7,8,15,16,31,32,63,64])for(const seconds of [.1,123,86400,604800]){
 const a=S.fresh();Object.assign(a.meta.bigNumbers,{unlocked:true,fractalLevel:g?5:0,purchases:Array(5).fill(!!g),gIndex:g,beyondFractal:!!g});a.meta.bigNumbers.superProgress=B.BN(g?99.99:0);
 a.meta.bigNumbers.resources[4].amount=B.BN(3000);const b=S.normalizeDomain(S.toSerializable(a));
 old.advance(a,seconds,{fixedSources,offlineSnapshot:true});N.advance(b,seconds,{fixedSources,offlineSnapshot:true});assert.deepEqual(clean(b),clean(a));count++;
}
for(const api of [old,N]){const s=S.fresh();s.meta.bigNumbers.unlocked=true;for(let level=1;level<=5;level++){const entry=s.meta.bigNumbers.resources[Math.max(0,level-2)];entry.amount=B.BN(api.COSTS[level-1]);assert(api.purchase(s,level));assert.equal(s.meta.bigNumbers.fractalLevel,level);assert.equal(api.purchase(s,level),false);}assert.equal(s.meta.bigNumbers.gIndex,1);}
console.log('PASS unchanged fractal purchases 1–5 and '+count+' exact/fixed Graham baseline comparisons');
