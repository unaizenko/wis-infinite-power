'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {setup75} = require('./amount-fixture.cjs');
const {readFixture} = require('./helpers/current-fixtures.cjs');

function createSession() {
  const {W, context} = setup75({targetSchema: 76});
  const timers = new Map(), receipts = new Map();
  let timerId = 0, now = 1794897990731, onChange = () => {};
  context.performance = {now: () => 0};
  context.__testNow = () => now;
  vm.runInContext('Date.now = () => __testNow()', context);
  context.setTimeout = fn => {timers.set(++timerId, fn); return timerId;};
  context.clearTimeout = id => timers.delete(id);
  for (const name of ['loop', 'session-actions', 'session-engine']) {
    const file = path.resolve(__dirname, '../js/simulation', name + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
  }
  const state = W.Core.Save.prepare(readFixture('exploration-compaction')).state;
  state.lastUpdateAt = now;
  Object.assign(state.core.runtime.timeLedger, {
    boundaryAt: now, registeredUntil: now, awaySince: null, pendingContinuousTime: [], pendingDiscard: null
  });
  const engine = W.Simulation.SessionEngine.create({snapshot: {domain: state}, now}, {
    now: () => now, setNow: value => {now = value;},
    changed: () => onChange(),
    completed(id, status, value) {receipts.set(id, {status, value});},
    yield: () => Promise.resolve()
  });
  const wire = value => W.Simulation.WorkerProtocol.encode(value);

  async function explore(id) {
    assert.equal(engine.command({type: 'action', group: 'immortal', method: 'explore'}, id).status, 'pending');
    for (let i = 0; !receipts.has(id) && i < 2048; i++) {
      if (timers.size) {
        const [timer, work] = timers.entries().next().value;
        timers.delete(timer);
        work();
      }
      await Promise.resolve();
    }
    assert(receipts.has(id), 'the session must publish a completed action receipt');
    return receipts.get(id);
  }
  return {W, engine, wire, explore, observe(callback) {onChange = callback;}};
}

test('a failed cooperative completion rolls back the real exploration, before retry and save', async () => {
  const failed = createSession();
  const {W, engine, wire} = failed;
  const {Amount: A, Resources: Q} = W.Core;
  const live = engine.getState();
  const before = engine.checkpoint();
  const power = Q.readExact('core.power', live);
  const mana = Q.readExact('cultivation.immortal.mana', live);
  const bigNumbers = W.Meta.BigNumbers;
  let completionReached = false, prematurePublication = false;
  failed.observe(() => {if (engine.getState() !== live) prematurePublication = true;});
  W.Meta.BigNumbers = {...bigNumbers, syncUnlock(candidate) {
    assert.equal(candidate, W.Core.Runtime.getState());
    assert(A.compare(Q.readExact('core.power', candidate), power) < 0);
    assert(A.compare(Q.readExact('cultivation.immortal.mana', candidate), mana) > 0);
    candidate.meta.bigNumbers.unlocked = !candidate.meta.bigNumbers.unlocked;
    completionReached = true;
    throw Error('forced completion failure');
  }};
  const receipt = await failed.explore(1);
  assert.equal(completionReached, true);
  assert.deepEqual(receipt, {status: 'failed', value: 'forced completion failure'});
  assert(wire(engine.checkpoint().snapshot) === wire(before.snapshot), 'failed receipt must keep the full confirmed state, including RNG');
  assert.equal(engine.getState(), live);
  assert.equal(prematurePublication, false);
  assert.equal(engine.checkpoint().presentationVersion, before.presentationVersion);

  W.Meta.BigNumbers = bigNumbers;
  failed.observe(() => {});
  const control = createSession();
  assert.equal((await control.explore(1)).status, 'done');
  assert.equal((await failed.explore(2)).status, 'done');
  assert(wire(engine.checkpoint().snapshot) === control.wire(control.engine.checkpoint().snapshot), 'retry must match a single clean action');
  assert.equal(engine.command({type: 'save', at: before.now}, 3).status, 'done');
  const saved = W.Core.Save.prepare(JSON.parse(engine.checkpoint().saveText)).state;
  assert.equal(A.compare(Q.readExact('core.power', saved), Q.readExact('core.power', engine.getState())), 0);
  assert.equal(A.compare(Q.readExact('cultivation.immortal.mana', saved), Q.readExact('cultivation.immortal.mana', engine.getState())), 0);
});
