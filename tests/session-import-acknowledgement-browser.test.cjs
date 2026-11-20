'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {host, launch} = require('./startup-browser-helpers.cjs');

function transform(file, source) {
  if (file !== 'game.js') return source;
  return source.replace('  const UI = WIS.UI.App.create({session,', `
  window.testSession = session;
  window.acknowledgements = [];
  const UI = WIS.UI.App.create({session,`)
    .replace(/acknowledgeCatchUp,\r?\n    captureImportState:/, `
    acknowledgeCatchUp() {
      acknowledgements.push(session.displayOwner());
      if (window.testCompletion) return Promise.reject(new Error('test acknowledgement rejected'));
      return acknowledgeCatchUp();
    },
    captureImportState:`)
    .replace('getCatchUpStatus, subscribeCatchUpStatus, claimPauseNotice, restoreOfflineRecovery, prepareImportRecovery,', `
    getCatchUpStatus: () => window.testCompletion || getCatchUpStatus(),
    subscribeCatchUpStatus: listener => subscribeCatchUpStatus(status => listener(window.testCompletion || status)),
    claimPauseNotice, restoreOfflineRecovery, prepareImportRecovery,`)
    .replace('  } = UI);', '  } = UI); window.testUI = UI.__test;');
}

test('completion acknowledgement waits for picker release and handles one rejected request per completion', async t => {
  const browser = await launch();
  t.after(() => browser.close());
  const {page, errors, url, close} = await host(browser, {transform});
  t.after(close);
  await page.goto(url);
  await page.waitForFunction(() => WIS_BOOT.diagnostics().ready && testSession.active() && !testSession.busy());
  const duringHold = await page.evaluate(async () => {
    document.querySelector('#import-file').click = () => {};
    document.querySelector('#import-save').click();
    while (!testSession.view().importHeld) await new Promise(resolve => setTimeout(resolve, 10));
    window.testCompletion = {...testSession.status(), phase: 'completed', locked: false, presentation: 'notice',
      awaySuspended: false, sessionSource: 'online', startedAt: Date.now(), originalClockSeconds: .1};
    testUI.handleOfflineCatchUpStatus(testCompletion);
    testUI.handleOfflineCatchUpStatus(testCompletion);
    return acknowledgements.length;
  });
  assert.equal(duringHold, 0);
  await page.evaluate(() => document.querySelector('#import-file').dispatchEvent(new Event('cancel')));
  await page.waitForFunction(() => !testSession.busy() && !testSession.view().importHeld && acknowledgements.length >= 1, null, {timeout: 10000});
  const duplicateCount = await page.evaluate(async () => {
    testUI.handleOfflineCatchUpStatus(testCompletion);
    testUI.handleOfflineCatchUpStatus(testCompletion);
    await new Promise(resolve => requestAnimationFrame(resolve));
    return acknowledgements.length;
  });
  assert.equal(duplicateCount, 1);
  const ownerChanged = await page.evaluate(async () => {
    const firstOwner = testSession.displayOwner();
    const {State, Save} = WIS.Core;
    const state = State.fresh();
    state.lastUpdateAt = Date.now();
    const text = JSON.stringify(Save.envelope(state, false, {offlineRecoveryOverride: null}));
    await testUI.importSave({text: async () => text});
    return {
      differentOwner: firstOwner !== testSession.displayOwner(),
      onePerOwner: acknowledgements.length === 2 && acknowledgements[0] === firstOwner &&
        acknowledgements[1] === testSession.displayOwner()
    };
  });
  assert.deepEqual(ownerChanged, {differentOwner: true, onePerOwner: true});
  assert.deepEqual(errors, []);
});
