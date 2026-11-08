'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup(options = {}) {
  let now = 100000, installs = 0, renders = 0, saves = 0, nextTimer = 0;
  const timers = new Map(), jobs = [];
  const state = {totalElapsedSeconds: 0, unlockedAchievements: {}, core: {runtime: {onlineCadenceRemaining: .1, timeLedger: {awaySince: null, boundaryAt: now, registeredUntil: now, pendingContinuousTime: []}}}};
  const status = {phase: 'idle', pendingGameSeconds: 0};
  const offline = {getCatchUpStatus: () => status, getPendingCatchUpSeconds: () => 0, availableCompensationClockSeconds: () => 0, suspendForAway(){}, returnFromAway(){}, invalidateSourceModels(){}};
  const W = {Simulation: {}, Core: {Save: {sessionPolicy: () => ({})}}, tmp: {rates: {}}, Meta: {Achievements: {recordCurrent(){}}}, Cultivation: {ImmortalLogic: {qiBatchStateKey: () => 1, advanceQiLayersBatch: () => 1}}};
  const sandbox = {WIS: W, Date: {now: () => now}, performance: {now: () => now}, document: {hidden: false, addEventListener(){}}, setTimeout(fn){const id = ++nextTimer; timers.set(id, fn); return id;}, clearTimeout(id){timers.delete(id);}};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/simulation/loop.js'), 'utf8'), sandbox);
  const loop = W.Simulation.Loop.create({getState: () => state, offline, epsilon: 1e-9, simulationStepSeconds: .1,
    requestRender(){}, flushRender(){renders++;}, saveState(){saves++;}, effectiveDevSpeed: () => 1, isInitialLoadComplete: () => true,
    prepareOnlineWork(seconds){
      let waiting = true, callback, retiredCallback;
      const record = {seconds, advances: 0, validations: 0, closes: 0, unsubscribed: 0, valid: true,
        notify(){callback?.();}, ready(){waiting = false; callback?.();}, lateReady(){waiting = false; retiredCallback?.();}};
      const job = {valid(){record.validations++; return record.valid;}, advance(){record.advances++; if(options.staleOnAdvance) throw Object.assign(Error('remote stale'), {code:'rank-work-stale'}); if(waiting) throw Error('advanced waiting remote'); return {done: true, token: record};}, close(){record.closes++;},
        waiting: () => waiting, onReady(fn){callback = retiredCallback = fn; if(options.synchronousReady) waiting = false; if(!waiting) fn(); return () => {record.unsubscribed++; callback = null; if(options.cleanupThrows) throw Error('listener cleanup');};}};
      if(options.local) {waiting = false; delete job.waiting; delete job.onReady;}
      jobs.push(record); return job;
    }, advanceGameStep(seconds, normal, args){installs++; assert.equal(args.preparedOnlineSegment, jobs.find(j => j === args.preparedOnlineSegment)); return {processedSeconds: options.partial ?? seconds};}});
  loop.restore({lastTickAt: now, onlineAccumulator: .1, tickRemaining: 0, onlineIntervals: [{source: 'online', clock: .1, speed: 1, compensationEligible: false}]});
  return {loop, jobs, state, sandbox, timers, counts: () => ({installs, renders, saves}), tick(ms = 0){now += ms; loop.runMainTick();}, runOne(){const [id, fn] = timers.entries().next().value || []; assert(fn, 'no queued continuation'); timers.delete(id); fn();}, flush(limit = 20){let n = 0; while(timers.size){assert(++n <= limit, 'continuation busy loop'); this.runOne();}}};
}
test('waiting remote owns one candidate without advance, expensive validation or timer polling', () => {
  const x = setup(); x.tick();
  assert.equal(x.jobs.length, 1); assert.equal(x.timers.size, 0);
  for(let n = 0; n < 3; n++) {x.jobs[0].notify(); x.tick(100);}
  assert.equal(x.jobs.length, 1); assert.equal(x.jobs[0].advances, 0); assert.equal(x.jobs[0].validations, 0); assert.equal(x.timers.size, 0);
  assert.ok(Math.abs(x.loop.getUnprocessedOnlineClockSeconds() - .4) < 1e-12);
  assert.equal(x.counts().renders, 4);
  assert.equal(x.loop.prepareSave(), true); assert.equal(x.state.core.runtime.timeLedger.pendingContinuousTime[0].clock, .4);
  assert.equal(x.counts().installs, 0); x.loop.invalidateOnlineScheduler();
});
test('ready schedules one ordinary continuation and never installs from notification', () => {
  const x = setup(); x.tick(); const job = x.jobs[0]; job.ready(); job.ready();
  assert.equal(x.counts().installs, 0); assert.equal(x.timers.size, 1);
  x.runOne(); assert.equal(x.counts().installs, 1); assert.equal(job.advances, 1); assert.equal(job.unsubscribed, 1);
  assert.equal(x.loop.getUnprocessedOnlineClockSeconds(), 0); assert.equal(x.state.totalElapsedSeconds, .1);
  job.lateReady(); assert.equal(x.timers.size, 0);
});
test('synchronous onReady registration sees the published owner but still yields', () => {
  const x = setup({synchronousReady: true}); x.tick();
  assert.equal(x.counts().installs, 0); assert.equal(x.timers.size, 1);
  x.runOne(); assert.equal(x.counts().installs, 1); assert.equal(x.loop.getUnprocessedOnlineClockSeconds(), 0);
});
test('partial prepared result debits actual processed time and retains next remote owner', () => {
  const x = setup({partial: .04}); x.tick(); x.jobs[0].ready(); x.runOne();
  assert.ok(Math.abs(x.loop.getUnprocessedOnlineClockSeconds() - .06) < 1e-12);
  assert.equal(x.state.totalElapsedSeconds, .04); assert.equal(x.jobs.length, 2); assert.equal(x.timers.size, 0);
  assert.equal(x.jobs[1].advances, 0); x.loop.invalidateOnlineScheduler();
});
for(const boundary of ['cancel', 'import', 'hide', 'action', 'qi']) test(boundary + ' retires waiting owner and rejects its late ready notification', async () => {
  const x = setup(); x.tick(); const job = x.jobs[0]; let action;
  if(boundary === 'cancel') x.loop.invalidateOnlineScheduler();
  if(boundary === 'import') x.loop.beginImportHold();
  if(boundary === 'hide') {x.sandbox.document.hidden = true; x.loop.handleVisibilityChange();}
  if(boundary === 'action') action = x.loop.requestDeferredAction({advance: () => ({done:true}), commit: () => true});
  if(boundary === 'qi') x.loop.requestQiBatch();
  const queued = x.timers.size, prepared = x.jobs.length;
  job.lateReady(); assert.equal(x.timers.size, queued); assert.equal(x.jobs.length, prepared);
  assert.equal(job.closes, 1); assert.equal(job.unsubscribed, 1); assert.equal(x.counts().installs, 0);
  assert.equal(x.loop.getUnprocessedOnlineClockSeconds(), .1);
  x.loop.invalidateOnlineScheduler(); if(action) assert.equal(await action, false);
});
test('old owner ready cannot wake or cancel a replacement waiting owner in the same generation', async () => {
  const x = setup(); x.tick(); const old = x.jobs[0];
  const action = x.loop.requestDeferredAction({advance: () => ({done:true}), commit: () => true}); x.runOne(); assert.equal(await action, true);
  x.runOne(); assert.equal(x.jobs.length, 2); assert.equal(x.timers.size, 0);
  old.lateReady(); assert.equal(x.timers.size, 0); assert.equal(x.jobs[1].closes, 0);
  x.jobs[1].ready(); x.runOne(); assert.equal(x.counts().installs, 1);
});
test('stale candidate detected after ready consumes no pending time', () => {
  const x = setup(); x.tick(); const old = x.jobs[0]; old.valid = false; old.ready(); x.runOne();
  assert.equal(x.counts().installs, 0); assert.equal(x.loop.getUnprocessedOnlineClockSeconds(), .1); assert.equal(old.closes, 1);
  x.runOne(); assert.equal(x.jobs.length, 2); old.lateReady(); assert.equal(x.timers.size, 0); x.loop.invalidateOnlineScheduler();
});
test('jobs without waiting retain existing local preparation and continuation behavior', () => {
  const x = setup({local:true}); x.tick(); assert.equal(x.timers.size, 1); assert.equal(x.counts().installs, 0);
  x.runOne(); assert.equal(x.counts().installs, 1); assert.equal(x.loop.getUnprocessedOnlineClockSeconds(), 0);
});

test('stale rejection from remote advance is cancellation, not a charged failure', () => {
  const x = setup({staleOnAdvance:true}); x.tick(); x.jobs[0].ready(); x.runOne();
  assert.equal(x.counts().installs, 0); assert.equal(x.state.totalElapsedSeconds, 0);
  assert.equal(x.loop.getUnprocessedOnlineClockSeconds(), .1); assert.equal(x.jobs[0].closes, 1);
  x.runOne(); assert.equal(x.jobs.length, 2); assert.equal(x.timers.size, 0); x.loop.invalidateOnlineScheduler();
});
test('cancelled already-queued ready callback cannot clear a new generation callback', () => {
  const x = setup(); x.tick(); x.jobs[0].ready(); const oldCallback = [...x.timers.values()][0];
  x.loop.invalidateOnlineScheduler(); x.tick(); x.jobs[1].ready(); assert.equal(x.timers.size, 1);
  oldCallback(); assert.equal(x.counts().installs, 0); assert.equal(x.timers.size, 1); assert.equal(x.jobs[1].closes, 0);
  x.runOne(); assert.equal(x.counts().installs, 1);
});
test('listener cleanup exception cannot lose the debit for an installed settlement', () => {
  const x = setup({cleanupThrows:true}); x.tick(); x.jobs[0].ready(); x.runOne();
  assert.equal(x.counts().installs, 1); assert.equal(x.loop.getUnprocessedOnlineClockSeconds(), 0); assert.equal(x.state.totalElapsedSeconds, .1);
});
