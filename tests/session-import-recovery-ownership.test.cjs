'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const {setup75} = require('./amount-fixture.cjs');

function createSession({mixed = false, holdFirstSlice = false} = {}) {
  const {W, context} = setup75({targetSchema: 76});
  const yields = [], timers = new Map(), receipts = new Map();
  let now = 1795136223814, timerId = 0, yieldedOnlineWork = false;
  context.performance = {now: () => 0};
  context.testNow = () => now;
  vm.runInContext('Date.now = () => testNow()', context);
  context.setTimeout = fn => {timers.set(++timerId, fn); return timerId;};
  context.clearTimeout = id => timers.delete(id);
  for (const name of ['loop', 'session-actions', 'session-engine']) {
    const file = path.resolve(__dirname, '../js/simulation', name + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
  }
  if (holdFirstSlice) {
    const original = W.Simulation.Step;
    W.Simulation.Step = {...original, create(options) {
      const step = original.create(options);
      return {...step, prepareOnlineWork(...args) {
        const work = step.prepareOnlineWork(...args);
        return {...work, advance(...args) {
          if (!yieldedOnlineWork) {
            yieldedOnlineWork = true;
            return {done: false};
          }
          return work.advance(...args);
        }};
      }};
    }};
  }
  const state = mixed ? W.Core.Save.prepare(JSON.parse(fs.readFileSync(
    process.env.WIS_MIXED_RECOVERY_FIXTURE || path.join(__dirname, 'fixtures/martial-player-20261003.json'),
    'utf8'
  ))).state : W.Core.State.fresh();
  const initialElapsed = state.totalElapsedSeconds;
  state.lastUpdateAt = now;
  Object.assign(state.core.runtime.timeLedger, {
    boundaryAt: now, registeredUntil: now, awaySince: null,
    pendingContinuousTime: mixed ? [{source: 'online', clock: .1, speed: 1, compensationEligible: false}] : [],
    pendingDiscard: mixed ? {clock: .029, game: .029, reason: 'online-overload'} : null
  });
  const engine = W.Simulation.SessionEngine.create({
    snapshot: {domain: state},
    now: now + (mixed ? 800 : 0),
    fromSave: mixed
  }, {
    now: () => now,
    setNow: value => {now = value;},
    changed() {},
    completed(id, status, value) {receipts.set(id, {status, value});},
    yield: () => new Promise(resolve => yields.push(resolve))
  });
  async function receipt(id) {
    for (let i = 0; !receipts.has(id) && i < 1000; i++) {
      if (yields.length) yields.shift()();
      if (timers.size) {
        const [timer, work] = timers.entries().next().value;
        timers.delete(timer);
        work();
      }
      await Promise.resolve();
    }
    assert.equal(receipts.get(id)?.status, 'done');
  }
  return {engine, context, initialElapsed, receipt,
    get now() {return now;},
    get yieldedOnlineWork() {return yieldedOnlineWork;}};
}

test('foreground import rollback releases suspension while preserving the recovery start gate', async () => {
  const {engine, now, receipt} = createSession();
  assert.equal(engine.command({type: 'importHold', at: now}, 1).status, 'done');
  assert.equal(engine.checkpoint().status.awaySuspended, true);
  assert.equal(engine.command({type: 'importRelease', at: now + 800}, 2).status, 'done');
  const waiting = engine.checkpoint().status;
  assert.equal(waiting.awaySuspended, false);
  assert.equal(waiting.awaitingStart, true);
  assert.equal(waiting.pendingClockSeconds, .8);
  assert.equal(engine.getState().totalElapsedSeconds, 0);
  assert.equal(engine.command({type: 'recovery', method: 'startCatchUp'}, 3).status, 'pending');
  await receipt(3);
  assert.equal(engine.checkpoint().status.pendingClockSeconds, 0);
  assert.equal(engine.getState().totalElapsedSeconds, .8);
});

test('hidden import rollback keeps the away watermark until visibility returns', () => {
  const {engine, context, now} = createSession();
  engine.command({type: 'importHold', at: now}, 1);
  context.document.hidden = true;
  engine.command({type: 'importRelease', at: now + 800}, 2);
  assert.equal(engine.checkpoint().status.awaySuspended, true);
  assert.equal(engine.getState().core.runtime.timeLedger.awaySince, now + 800);
  assert.equal(engine.checkpoint().status.pendingClockSeconds, .8);
  context.document.hidden = false;
  assert.equal(engine.command({type: 'return', at: now + 1200}, 3).seconds, .4);
  assert.equal(engine.checkpoint().status.awaySuspended, false);
  assert.equal(engine.checkpoint().status.awaitingStart, true);
  assert.ok(Math.abs(engine.checkpoint().status.pendingClockSeconds - 1.2) < 1e-10);
});

test('clock interleaved with mixed recovery preserves the exact online prefix before discarding overload', async () => {
  const session = createSession({mixed: true, holdFirstSlice: true});
  const {engine, receipt, initialElapsed} = session;
  const before = engine.getState().core.runtime.timeLedger;
  assert.equal(before.pendingDiscard.clock, .029);
  assert.equal(engine.checkpoint().status.currentSource.source, 'online');
  const recovery = engine.command({type: 'recovery', method: 'simulateOfflineProgress', args: [0]}, 1);
  assert.equal(recovery.status, 'pending');
  // The host may yield once for the blocking presentation before doing work.
  await Promise.resolve();
  assert.equal(session.yieldedOnlineWork, true);
  engine.command({type: 'clock', at: session.now + 1}, 2);
  assert.equal(engine.getState().core.runtime.timeLedger.pendingDiscard?.clock, .029);
  await receipt(1);
  assert.ok(Math.abs(engine.getState().totalElapsedSeconds - initialElapsed - .9) < 1e-6);
  const after = engine.getState().core.runtime.timeLedger;
  assert.equal(after.pendingDiscard, null);
  assert.ok(Math.abs(after.discardedClock - before.discardedClock - .029) < 1e-6);
  assert.ok(Math.abs(after.discardedGame - before.discardedGame - .029) < 1e-6);
  assert.equal(engine.checkpoint().status.pendingClockSeconds, 0);
});
