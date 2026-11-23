'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {setup75} = require('./amount-fixture.cjs');
const {host,launch} = require('./startup-browser-helpers.cjs');

for (const [input, qi, limited, factor] of [
  ['ee2050',0,false], ['eee20',0,false], ['eee20','eee20',true], ['eeee16',0,true],
  ['eee20',0,true,'eee19']
]) {
  const label = input + (factor ? ' * ' + factor : '') + ' J and ' + qi + ' qi';
  test('qi conversion confirms or protects the complete balance at ' + label, async t => {
    const {W} = setup75({targetSchema:76});
    const s = W.Core.State.fresh();
    s.cultivation.active = 'martial';
    W.Core.Resources.replaceExact('cultivation.martial.qi', qi, s);
    W.Core.Resources.replaceExact('core.joules', factor ? W.Core.Amount.multiply(input,factor) : input, s);
    W.Core.Resources.replaceExact('core.power', 1000, s);
    s.lastUpdateAt = 1800000000000;
    Object.assign(s.core.runtime.timeLedger, {boundaryAt:s.lastUpdateAt, registeredUntil:s.lastUpdateAt});
    const raw = JSON.stringify(W.Core.Save.envelope(s,false,{offlineRecoveryOverride:null}));
    const browser = await launch();
    t.after(() => browser.close());
    const h = await host(browser, {raw, width:1280, before:() => { Date.now = () => 1800000000000; }});
    t.after(h.close);
    const p = h.page;
    await p.goto(h.url);
    await p.waitForFunction(() => WIS_BOOT.diagnostics().ready);
    const button = p.locator('#martial-convert-qi');
    if (limited) {
      const preview = p.locator('#martial-action-qi .martial-action-preview');
      await preview.filter({hasText:'精度不足'}).waitFor();
      assert.equal(await button.isDisabled(), true);
      assert.doesNotMatch(await preview.innerText(), /预计 \+0/);
      await p.locator('#martial-convert-body').click();
      await p.waitForFunction(() => WIS.Cultivation.Martial.amount(WIS.Game.getState(),'body').gte(1));
      const unchanged = await p.evaluate(([input, qi, factor]) => {
        const {Amount:A, Resources:Q} = WIS.Core, s = WIS.Game.getState();
        const balance = factor ? A.multiply(input,factor) : input;
        return A.compare(Q.readExact('core.joules',s), balance) === 0 &&
          A.compare(Q.readExact('cultivation.martial.qi',s),qi) === 0;
      },[input,qi,factor]);
      assert(unchanged, 'unavailable qi action changed a balance');
    } else {
      await p.evaluate(() => {
        window.quotedGain = WIS.Cultivation.Martial.preview(WIS.Game.getState(),'qi').gainQuantity;
      });
      await button.click();
      await p.waitForFunction(() => {
        const {Amount:A, Resources:Q} = WIS.Core, s = WIS.Game.getState();
        return A.compare(Q.readExact('core.joules',s),0) === 0 &&
          A.compare(window.quotedGain,0) > 0 &&
          A.compare(Q.readExact('cultivation.martial.qi',s),window.quotedGain) === 0;
      });
    }
    assert.deepEqual(h.errors, []);
  });
}

test('tower-valued heart pays mindPlanet across consecutive session clock boundaries', async t => {
  const {W} = setup75({targetSchema:76});
  const s = W.Core.State.fresh();
  s.cultivation.active = 'martial';
  W.Core.Resources.replaceExact('cultivation.martial.heart', 'ee2050', s);
  Object.assign(W.Cultivation.Martial.get(s).abilities, {crystalMeditation:1, mindPlanet:1});
  s.lastUpdateAt = 1800000000000;
  Object.assign(s.core.runtime.timeLedger, {boundaryAt:s.lastUpdateAt, registeredUntil:s.lastUpdateAt});
  const raw = JSON.stringify(W.Core.Save.envelope(s, false, {offlineRecoveryOverride:null}));
  const browser = await launch();
  t.after(() => browser.close());
  const h = await host(browser, {raw, before:() => {
    window.martialClock = 1800000000000;
    Date.now = () => window.martialClock;
  }});
  t.after(h.close);
  const p = h.page;
  await p.goto(h.url);
  await p.waitForFunction(() => WIS_BOOT.diagnostics().ready);
  for (const tick of [1, 2, 3]) {
    await p.evaluate(() => { window.martialClock += 100; });
    await p.waitForFunction(tick => {
      const s = WIS.Game.getState();
      return s.totalElapsedSeconds >= tick / 10 - 1e-9 &&
        ['qi', 'body'].every(key => WIS.Core.Amount.compare(
          WIS.Core.Resources.readExact('cultivation.martial.' + key, s), 0) > 0);
    }, tick, {timeout:7000});
  }
  await p.evaluate(() => WIS.Core.Runtime.call('save'));
  assert.equal(await p.evaluate(() => {
    const saved = WIS.Core.Save.prepare(JSON.parse(localStorage.getItem(WIS.Core.Config.saveKey))).state;
    return ['heart','qi','body'].every(key => {
      const id = 'cultivation.martial.' + key;
      return WIS.Core.Amount.compare(WIS.Core.Resources.readExact(id, saved),
        WIS.Core.Resources.readExact(id, WIS.Game.getState())) === 0;
    });
  }), true);
  assert.deepEqual(h.errors, []);
});

test('Chang Sheng card quotes the current qi rate during Emperor Tribulation', async t => {
  const {W} = setup75({targetSchema:76});
  const s = W.Core.State.fresh();
  s.cultivation.active = 'martial';
  s.unlockedAchievements.scale2 = true;
  s.activeChallenge = 'martialEmperor';
  s.meta.martialQualifications.emperorTribulation = true;
  Object.assign(W.Cultivation.Martial.get(s).abilities, {changSheng:1, jiuYang:1, jiuYin:1});
  s.lastUpdateAt = 1800000000000;
  Object.assign(s.core.runtime.timeLedger, {boundaryAt:s.lastUpdateAt, registeredUntil:s.lastUpdateAt});
  const raw = JSON.stringify(W.Core.Save.envelope(s,false,{offlineRecoveryOverride:null}));
  const browser = await launch();
  t.after(() => browser.close());
  const h = await host(browser, {raw, width:1280, before:() => { Date.now = () => 1800000000000; }});
  t.after(h.close);
  const p = h.page;
  await p.goto(h.url);
  await p.waitForFunction(() => WIS_BOOT.diagnostics().ready);
  await p.locator('[data-page="cultivation"]').click();
  const effect = p.locator('#martial-ability-changSheng .martial-ability-effect');
  await p.waitForFunction(() => document.querySelector('#martial-ability-changSheng .martial-ability-effect')?.textContent.includes('自然气'));
  assert.match(await effect.textContent(), /自然气 \+2\.828.*\/秒/);
  assert.deepEqual(h.errors, []);
});
