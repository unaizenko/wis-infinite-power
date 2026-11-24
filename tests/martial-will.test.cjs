'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {W} = require('./amount-fixture.cjs').setup75();
const {State:S, Resources:Q, Amount:A, BigNum:B} = W.Core;
const M = W.Cultivation.Martial;
function ready() {
  const s = S.fresh();
  s.cultivation.active = 'martial';
  return s;
}
const put = (s,k,v) => Q.replaceExact('cultivation.martial.'+k,A.from(v),s);
const stock = s => W.Meta.Treasures.count(s,'willImprint');
const progress = s => W.Meta.TreasureProgress.view(s,'willImprint').progress;
const eq = (v,n) => assert(B.eq(v,n),String(v)+' != '+String(n));
function inputs(s,heart) {
  put(s,'qi',100);
  put(s,'body',100);
  if(heart !== undefined)put(s,'heart',heart);
}

test('first successful conversions and their permanent rewards', () => {
  const s=ready();
  assert.equal(M.convert(s,'heart'),false);
  inputs(s);
  assert(M.preview(s,'heart').allowed);
  assert(!s.unlockedAchievements.martialHeart);
  assert(M.convert(s,'heart'));
  assert(s.unlockedAchievements.martialHeart);
  for(const k of ['qi','body'])eq(M.efficiency(s,k),1.25);
  eq(progress(s),0);
  inputs(s,10);
  assert(M.preview(s,'soul').allowed);
  assert(!s.unlockedAchievements.martialSoul);
  assert(M.convert(s,'soul'));
  assert(s.unlockedAchievements.martialSoul);
  eq(stock(s),1);
  eq(progress(s),0);
  for(const k of ['heart','soul'])eq(M.efficiency(s,k),B.pow(2,.25));
  const after=W.Core.Reset.apply('challenge',s,()=>S.fresh());
  assert(after.unlockedAchievements.martialHeart && after.unlockedAchievements.martialSoul);
  eq(stock(after),1);
});

test('automatic conversion uses the same unlock and heart spending transaction', () => {
  const s=ready();
  s.challengeCompletions.martialStealHeaven=1;
  inputs(s);
  assert(M.setAutomation(s,'heart',true));
  M.get(s).automationTime=B.BN(.1);
  assert(M.automate(s));
  assert(s.unlockedAchievements.martialHeart);
  M.setAutomation(s,'heart',false);
  s.unlockedAchievements.martialHarmony=true;
  inputs(s,10);
  assert(M.setAutomation(s,'soul',true));
  M.get(s).automationTime=B.BN(.1);
  assert(M.automate(s));
  assert(s.unlockedAchievements.martialSoul);
  eq(stock(s),1);
});

test('heart gains, spends and cleared balances are credited once, including across load', () => {
  const s=ready();
  M.awardPassive(s,{heart:2,soul:1});
  assert(!s.unlockedAchievements.martialHeart && !s.unlockedAchievements.martialSoul);
  eq(progress(s),0);
  s.unlockedAchievements.martialSoul=true;
  M.awardPassive(s,{heart:3});
  eq(progress(s),3);
  Q.add('cultivation.martial.heart',2,s);
  assert(Q.spend('cultivation.martial.heart',1,s));
  eq(progress(s),6);
  const loaded=S.normalizeDomain(S.toSerializable(s));
  eq(progress(loaded),6);
  assert(!loaded.unlockedAchievements.martialHeart);
  const reset=W.Core.Reset.apply('challenge',loaded,()=>S.fresh());
  eq(stock(reset),1);
  eq(progress(reset),2);
  eq(progress(loaded),6);
});

test('old recorded resource history grants milestones once without retroactive imprints', () => {
  const s=ready();
  const raw=S.toSerializable(s);
  delete raw.meta.statistics.martialConversionAchievementsVersion;
  raw.meta.statistics.martialHistory={heart:{peak:100,total:100},soul:{peak:1,total:1}};
  const loaded=S.normalizeDomain(raw);
  assert(loaded.unlockedAchievements.martialHeart && loaded.unlockedAchievements.martialSoul);
  eq(stock(loaded),0);
  eq(progress(loaded),0);
});

test('legacy martial achievement migration resumes inside exact lifetime totals', () => {
  const {Core:{Save,State,Amount}, Cultivation:{Martial}} = require('./helpers/production-numeric-runtime.cjs').loadProductionNumericRuntime().W;
  const original = Save.envelope(State.fresh());
  const data = original.data;
  data.cultivation.active = 'martial';
  data.cultivation.systems ||= {};
  data.cultivation.systems.martial = {resources:{}};
  // Adjacent tower coordinates with a rational remainder require a resumable comparison.
  const term = '@ratio:1:{"terms":["ee25.23478531338756*1257"],"denominator":"1000"}';
  const smaller = 'ee25.23478531338755*130';
  data.cultivation.systems.martial.resources.heart = {
    amount:'ee25.853164903270084', residual:[term,smaller,'12e1'],
    peak:'ee25.901587451001465', peakResidual:['120e0'],
    total:'ee25.901587451001465', totalResidual:[term,'ee25.853164903270084',smaller,'24e1'],
    spent:'ee25.901587451001465', spentResidual:['120e0']
  };
  data.cultivation.systems.martial.resources.soul = {amount:1,total:1,peak:1};
  delete data.meta.statistics.martialConversionAchievementsVersion;
  const before = JSON.stringify(original);
  const reference = Save.prepare(original).state;
  for (const maximumOperations of [1,16,256]) {
    const work = Save.prepareWork(original);
    let slices = 0;
    while (!work.advance({maximumOperations}).done) assert(++slices < 100000);
    const loaded = work.result().state;
    for (const key of ['heart','soul']) {
      assert.equal(Amount.compare(Martial.quantity(loaded,key), Martial.quantity(reference,key)),0);
    }
    assert(loaded.unlockedAchievements.martialHeart && loaded.unlockedAchievements.martialSoul);
    assert.equal(loaded.meta.statistics.martialConversionAchievementsVersion,1);
  }
  assert.equal(JSON.stringify(original),before);
});
