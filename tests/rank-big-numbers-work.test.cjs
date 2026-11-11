"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),{setupFuture}=require('./rank-schema-fixture.cjs'),{ready,contractInputs}=require('./rank-runtime-fixture.cjs');
const contracts=require('./fixtures/rank-runtime-contracts.json'),plain=x=>JSON.parse(JSON.stringify(x));
function drain(job,maximumOperations=256){let r,slices=0;do{r=job.advance({maximumOperations,deadline:Infinity});assert(++slices<100000);}while(!r.done);return job.result();}
test('prepare_initializes_once_across_many_slices and g64_and_tree_phase_partition_match_sync',()=>{
 for(const operations of [1,32,256]){const metrics={detach:0},transformSource=(f,s)=>f.endsWith('rank-settlement.js')?s.replace('function* detachSteps(n){','function* detachSteps(n){globalThis.__init.detach++;'):s;
 const {W,context}=setupFuture({transformSource});context.__init=metrics;assert.equal(typeof W.Meta.BigNumbers.prepareWork,'function');
 for(const item of contracts.cases){const s=contractInputs(W).find(c=>c.name===item.name).s;s.core.runtime.randomState=item.input.core.runtime.randomState;assert.deepEqual(plain(W.Core.State.toSerializable(s)),item.input);metrics.detach=0;const before=JSON.stringify(W.Core.State.toSerializable(s)),job=item.name==='frozen'?W.Meta.BigNumbers.prepareFrozenWork(s,item.seconds,W.Meta.BigNumbers.captureFrozen(s)):W.Meta.BigNumbers.prepareWork(s,item.seconds);
 const n=drain(job,operations);assert.equal(metrics.detach,1,item.name+' repeats initialization');assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);const copy=W.Core.State.cloneForSimulation(s);copy.meta.bigNumbers=n;assert.deepEqual(plain(W.Core.State.toSerializable(copy)),item.expected,item.name);}
 }
});
test('pending_work_invalidates_on_in_place_change and cancel is terminal',()=>{
 const {W}=setupFuture(),s=ready(W),M=W.Meta.BigNumbers;assert.equal(typeof M.prepareWork,'function');const job=M.prepareWork(s,.1);job.advance({maximumOperations:1});s.joules=W.Core.BigNum.BN(99);assert.throws(()=>job.advance(),e=>e.code==='rank-work-stale');s.joules=W.Core.BigNum.ZERO;assert.throws(()=>job.result());const next=M.prepareWork(s,.1);next.cancel();assert.throws(()=>next.advance());
});
test('save_replace_hide_preserve_live_clock and restore Runtime after every slice',()=>{
 const {W}=setupFuture(),s=ready(W),M=W.Meta.BigNumbers;assert.equal(typeof M.prepareWork,'function');const bound=ready(W);W.Core.Runtime.bind({state:()=>bound});const job=M.prepareWork(s,.1);job.advance({maximumOperations:1});s.core.runtime.lastUpdateAt+=1000;s.core.runtime.timeLedger={...s.core.runtime.timeLedger,registeredUntil:123};const before=JSON.stringify(W.Core.State.toSerializable(s));drain(job,32);assert.equal(W.Core.Runtime.getState(),bound);assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);
});

for(const legacy of [true,false])test('TREE '+(legacy?'legacy cached income':'current closed income')+' fixture resumes atomically and survives save reload',()=>{
 const fs=require('node:fs'),path=require('node:path'),metrics={income:0},transformSource=(f,s)=>legacy?(f.endsWith('/rank-settlement.js')?s.replace('function income(state,record,seconds){','function income(state,record,seconds){globalThis.__income.income++;'):s):(f.endsWith('/closed-rank-settlement.js')?s.replace('function treeIncome(state,seconds){','function treeIncome(state,seconds){globalThis.__income.income++;'):s);
 const {W,context}=setupFuture({targetSchema:legacy?74:76,transformSource});context.__income=metrics;
 const raw=require('./helpers/current-fixtures.cjs').readFixture(legacy?'tree-legacy':'tree-current'),state=W.Core.Save.prepare(raw).state,M=W.Meta.BigNumbers,B=W.Core.BigNum;
 assert.equal(W.Meta.ClosedRankSettlement.enabled(state),!legacy);assert.equal(state.meta.bigNumbers.tree.phase,'super');assert(M.treeUnlocked(state));
 const before=plain(W.Core.State.toSerializable(state)),startFunding=B.BN(state.meta.bigNumbers.tree.batch?.funding||0);metrics.income=0;const job=M.prepareWork(state,.1);
 assert.equal(job.advance({maximumOperations:1}).done,false);const result=drain(job,1);assert(metrics.income>0,'fixture did not reach income');if(legacy)assert.equal(metrics.income,1,'legacy cached income replayed');assert.deepEqual(plain(W.Core.State.toSerializable(state)),before);
 if(!legacy)assert.equal(String(B.sub(result.tree.batch.funding,startFunding)),'4032','independent 40320 * 0.1 income');assert.equal(String(W.Core.Rank.project(result.tree.rank)),'3');
 const synchronous=M.prepare(state,.1);assert.deepEqual(plain(result),plain(synchronous));const copy=W.Core.State.cloneForSimulation(state);copy.meta.bigNumbers=result;
 const loaded=W.Core.Save.prepare(plain(W.Core.Save.envelope(copy,false,{offlineRecoveryOverride:null}))).state;assert.deepEqual(plain(W.Core.State.toSerializable(loaded)),plain(W.Core.State.toSerializable(copy)));
});

test('work_initial_slice_does_not_run_budget_proofs_synchronously',()=>{const metrics={reads:0},transformSource=(f,s)=>f.endsWith('rank-budget.js')?s.replace(s.includes('function readHeader(record){')?'function readHeader(record){':'function read(record){',(s.includes('function readHeader(record){')?'function readHeader(record){':'function read(record){')+'globalThis.__initReads.reads++;'):s;const {W,context}=setupFuture({transformSource});context.__initReads=metrics;const s=ready(W);s.meta.bigNumbers.tree.phase='super';s.meta.bigNumbers.tree.superProgress=W.Core.BigNum.BN(5);s.treeSuperAutomationEnabled=true;W.Meta.BigNumbers.advance(s,0);metrics.reads=0;const job=W.Meta.BigNumbers.prepareWork(s,.1);assert.equal(job.advance({maximumOperations:1}).done,false);assert.equal(metrics.reads,0,'initial slice ran a complete saved-budget proof');drain(job,32);});
