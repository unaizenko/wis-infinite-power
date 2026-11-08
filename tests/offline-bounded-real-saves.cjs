'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
const out=path.resolve('../WIS-项目资源/bounded-settlement-implementation-20261108');
const rows=require('./stability-corpus.json').rows,results=[];
(async()=>{for(const row of rows){const bytes=fs.readFileSync(row.path),sha=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(sha,row.sha256);let raw=JSON.parse(bytes);if(row.select)raw=raw[row.select];if(typeof raw==='string')raw=JSON.parse(raw);
const {W}=loadProductionNumericRuntime(),prepared=W.Core.Save.prepare(raw),before=W.Core.State.toSerializable(prepared.state);let sim,saved=null,saves=0;
sim=W.Simulation.OfflineHeadless.create({domain:prepared.state},{yield:()=>new Promise(r=>setTimeout(r,0)),checkpoint(){W.Core.Save.write(sim.getState(),{offlineRecoveryOverride:sim.offline.getPersistenceSnapshot()});saved=W.Core.Save.read();saves++;}});
const debt=prepared.offlineRecovery?.tasks?.reduce((n,t)=>n+t.clockSeconds,0)||0;
if(prepared.offlineRecovery){sim.offline.restorePersistenceSnapshot({...prepared.offlineRecovery,paused:false,pauseReason:null,awaitingStart:false,awaySuspended:false},0,{checkpoint:false});}
const start=performance.now();await sim.offline.simulateOfflineProgress(0,0);const elapsed=performance.now()-start;
W.Core.Save.write(sim.getState(),{offlineRecoveryOverride:sim.offline.getPersistenceSnapshot()});
// Read the actual localStorage bytes through the production API, then migrate/validate.
const again=W.Core.Save.read();
assert.deepEqual(JSON.parse(JSON.stringify(W.Core.State.toSerializable(again.state))),JSON.parse(JSON.stringify(W.Core.State.toSerializable(sim.getState()))));
assert.equal(typeof before.core.runtime.randomState,'number');
const after=W.Core.State.toSerializable(sim.getState()),ledger=sim.getState().core.runtime.timeLedger;
const result={id:row.id,sha256:sha,originalDebtClock:debt,settledClock:sim.getState().totalElapsedSeconds-(before.core.runtime.totalElapsedSeconds||0),discardedClock:ledger.discardedClock||0,pendingClock:sim.offline.getPendingCatchUpClockSeconds(),phase:sim.offline.getCatchUpStatus().phase,wallMs:elapsed,saves,strictRoundtrip:true,rngUnchanged:after.core.runtime.randomState===before.core.runtime.randomState};results.push(result);assert.equal(result.rngUnchanged,true);assert.equal(result.pendingClock,0);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(row.path)).digest('hex'),sha);}
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'offline-real-save-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
