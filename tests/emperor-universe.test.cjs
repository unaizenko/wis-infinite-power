'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {W}=require('./helpers/challenge-runtime.cjs');
const {State:S,Resources:Q,Amount:A,Runtime:R,BigNum:B}=W.Core;
const M=W.Cultivation.Martial,X=W.Cultivation.Xiuzhen,U=W.Meta.UniverseCoefficients;
const exact=(a,b)=>assert.equal(A.compare(a,b),0);
const ready=()=>{const s=S.fresh();s.cultivation.active='martial';return s;};
test('emperor purchase grants lasting entry, applies the gain exponent, then unlocks five realms',()=>{
  const s=ready(),H=W.Meta.Challenges;
  Q.replaceExact('cultivation.martial.soul','1e10',s);
  assert(!M.canBuy(s,'fiveRealms'));M.get(s).abilities.immortalPlatform=1;
  assert(M.buy(s,'emperorTribulation'));
  assert(R.withState(s,()=>H.challengeUnlocked('martialEmperor')));
  const n=W.Core.Reset.apply('challenge',s,()=>S.fresh(),{overrides:{activeChallenge:'martialEmperor'}});
  W.Simulation.OfflineHeadless.create({domain:n},{checkpoint(){},yield:()=>Promise.resolve()});
  n.cultivation.active='martial'; // The challenge entry controller reselects its required system.
  assert(n.meta.martialQualifications.emperorTribulation);
  Q.replaceExact('core.joules',10000000,n);
  const reference=S.cloneForSimulation(n);reference.activeChallenge=null;
  const normal=M.preview(reference,'qi'),limited=M.preview(n,'qi');
  exact(limited.gainQuantity,M.emperorGain(normal.gainQuantity));
  assert(M.convert(n,'qi'));exact(M.quantity(n,'qi'),limited.gainQuantity);
  Q.creditExact('cultivation.martial.body',16,n);assert(B.lt(B.abs(B.sub(M.amount(n,'body'),8)),1e-12));
  Q.replaceExact('core.power',A.fromParts('3e68',['-1']),n);
  assert(!R.withState(n,()=>H.checkActiveChallengeCompletion()));
  Q.replaceExact('core.power','3e68',n);
  assert(R.withState(n,()=>H.checkActiveChallengeCompletion()));
  Q.replaceExact('cultivation.martial.soul','5e8',n);assert(M.buy(n,'fiveRealms'));
});
test('shared coefficients migrate once, keep their exact history, survive a local reset and respect rebirth',()=>{
  const s=ready();const raw=S.toSerializable(s),old=raw.cultivation.systems.immortal.xiuzhen.resources;
  for(const k of U.keys)old[k]={...raw.meta.universeCoefficients[k],...A.fieldParts(A.fromParts(100,['1e-35'])),...A.fieldParts(200,'total'),...A.fieldParts(5,'spent'),...A.fieldParts(150,'peak')};
  delete raw.meta.universeCoefficients;
  const n=S.normalizeDomain(raw);
  for(const k of U.keys){exact(Q.readExact('meta.universe.'+k,n),A.fromParts(100,['1e-35']));exact(A.field(U.entry(n,k),'spent'),5);}
  const I=W.Meta.Infinity;Object.assign(I.get(n),{points:B.BN(10000),totalPointsEarned:B.BN(10000),unlocked:true,upgradesUnlocked:true});
  for(const id of ['C1','C2','C3','C4','C5','C6','C7-1','C7-2'])assert(I.purchase(n,id));
  for(const target of [null,'immortal','martial']){
    assert(I.changeCultivation(n,target));
    for(const k of U.keys)exact(X.quantity(n,k),A.fromParts(100,['1e-35']));
  }
  const loaded=W.Core.Save.prepare(W.Core.Save.envelope(n)).state,serial=S.toSerializable(loaded);
  for(const k of U.keys){
    assert(!Object.hasOwn(serial.cultivation.systems.immortal.xiuzhen.resources,k));
    exact(X.quantity(loaded,k),A.fromParts(100,['1e-35']));
  }
  const after=W.Core.Reset.apply('challenge',loaded,()=>S.fresh());
  for(const k of U.keys){exact(X.quantity(after,k),0);exact(A.field(U.entry(after,k),'total'),200);}
});
test('five realms pays existing N each second online and offline without consuming its inputs',async()=>{
  const s=ready();for(const k of M.resourceKeys)Q.replaceExact('cultivation.martial.'+k,9999,s);
  M.get(s).abilities.fiveRealms=1;
  s.unlockedAchievements.infiniteBox=true;
  Q.replaceExact('meta.universe.infiniteBoxCoefficient',99,s);
  const expected=W.Meta.Achievements.applyInfiniteBoxReward(B.BN(.0256),B.BN(1.5));
  for(const offline of [false,true]){
    const h=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});
    if(offline){h.offline.appendCatchUpTask(1,1,{source:'offline',speed:1,sealed:true,randomMode:'state'});await h.offline.simulateOfflineProgress(0,0);}
    else h.step.advanceGameStep(.1);
    const end=h.getState();
    exact(X.quantity(end,'universeCoefficient'),A.multiply(expected,offline?1:.1));
    for(const k of M.resourceKeys)exact(M.quantity(end,k),9999);
  }
});

test('r18 sparse export retains all shared coefficient fields across two loads', () => {
  const envelope = require('./fixtures/martial-r18-coefficients.json');
  const legacy = envelope.data.cultivation.systems.immortal.xiuzhen.resources;
  const imported = W.Core.Save.prepare(envelope).state;
  const reloaded = W.Core.Save.prepare(W.Core.Save.envelope(imported)).state;
  for (const s of [imported, reloaded]) {
    for (const key of U.keys) {
      for (const field of ['amount', 'total', 'peak', 'spent']) {
        exact(A.field(U.entry(s,key),field), A.field(legacy[key],field));
      }
    }
    assert(s.unlockedAchievements.martialHeart);
    assert(!s.unlockedAchievements.martialSoul, 'r18 direct soul income is not a conversion');
  }
});

test('r16 sparse export backfills recorded conversions only once', () => {
  const imported = W.Core.Save.prepare(require('./fixtures/martial-r16-conversions.json')).state;
  for (const s of [imported, W.Core.Save.prepare(W.Core.Save.envelope(imported)).state]) {
    assert(s.unlockedAchievements.martialHeart);
    assert(s.unlockedAchievements.martialSoul);
    exact(W.Meta.Treasures.count(s, 'willImprint'), 0);
  }
});

test('a new sparse export explicitly marks conversion history even with only passive income', () => {
  const s = ready();
  for (const k of ['heart','soul']) Q.creditExact('cultivation.martial.'+k, 3, s);
  const save = W.Core.Save.envelope(s);
  assert.equal(save.data.meta.statistics?.martialConversionAchievementsVersion, 1);
  const loaded = W.Core.Save.prepare(save).state;
  assert(!loaded.unlockedAchievements.martialHeart && !loaded.unlockedAchievements.martialSoul);
});

test('unmarked r19 sparse balances alone do not prove a martial conversion', () => {
  const s = ready();
  for (const key of ['heart','soul']) Q.creditExact('cultivation.martial.'+key,3,s);
  const envelope = JSON.parse(JSON.stringify(W.Core.Save.envelope(s)));
  delete envelope.data.meta.statistics.martialConversionAchievementsVersion;
  const loaded = W.Core.Save.prepare(envelope).state;
  assert(!loaded.unlockedAchievements.martialHeart && !loaded.unlockedAchievements.martialSoul);
});
