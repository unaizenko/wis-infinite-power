const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
const {W,context}=require('./amount-fixture.cjs').setup75({targetSchema:76});
const file=path.join(process.env.AUDIT_GAME_ROOT,'js/simulation/discard-effects.js');if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),context);
const S=W.Core.State,B=W.Core.BigNum;
assert(W.Simulation.DiscardEffects,'discard API required');
const drop=(s,t)=>W.Simulation.DiscardEffects.apply(s,[{source:'online',clock:t,speed:1,compensationEligible:false}],'test');
for(const time of [4.9,5,5.1]){const s=S.fresh();s.activeChallenge='infinityFast';s.activeChallengeElapsedSeconds=0;drop(s,time);assert.equal(s.activeChallenge,time<5?'infinityFast':null);assert.equal(W.Meta.Infinity.rewardUnlocked(s,'infinityFast'),false);}
const s=S.fresh();s.activeChallenge='longevity';s.activeChallengeElapsedSeconds=10;s.meta.infinity.runElapsed=10;const before=S.toSerializable(s);drop(s,700);assert.equal(s.activeChallengeElapsedSeconds,10);assert.equal(s.meta.challenges.discardedElapsedSeconds,590);assert.equal(s.meta.infinity.runElapsed,10);assert.equal(s.meta.infinity.discardedRunElapsed,700);assert.equal(String(s.power),String(before.core.resources.power));assert.equal(s.randomState,before.core.runtime.randomState);
for(const key of ['severEvilCorpse','qiRefiningHundredThousandYears','infinityRing',null]){const x=S.fresh();x.activeChallenge=key==='infinityRing'?null:key;x.meta.infinity.ringChallengeActive=true;const challenge=x.activeChallenge;drop(x,10);assert.equal(x.activeChallenge,challenge);assert(x.meta.infinity.ringChallengeActive);assert.equal(x.activeChallengeElapsedSeconds,0);assert.equal(x.bestQiLayer,0);}
console.log('PASS discard rule clocks, no growth/reward/RNG, independent ring');

for(const route of [1,3]){const x=S.fresh(),I=W.Meta.Infinity;x.meta.infinity.upgrades['E2-'+route]=true;x.meta.infinity.upgrades['E3-'+route]=true;const a=I.tempoMultiplier(x),b=I.softcapWeakening(x,'鍩庡競');drop(x,3600);if(route===1){assert(B.lt(I.tempoMultiplier(x),a));assert(I.softcapWeakening(x,'鍩庡競')<b);}else {assert(B.eq(I.tempoMultiplier(x),a));assert.equal(I.softcapWeakening(x,'鍩庡競'),b);}}
const x=S.fresh();x.cultivation.active='immortal';x.activeChallenge='severEvilCorpse';x.activeChallengeElapsedSeconds=30;x.unlockedAchievements.greatLuo=true;const host=W.Simulation.OfflineHeadless.create({domain:x});const initial=W.Cultivation.ImmortalLogic.greatLuoManaExponentBonus();assert(initial>0);drop(host.getState(),90);assert.equal(String(W.Cultivation.ImmortalLogic.greatLuoManaExponentBonus()),String(initial));
const reset=S.fresh();reset.activeChallenge='longevity';reset.meta.challenges.discardedElapsedSeconds=20;assert.equal(W.Core.Reset.apply('reincarnation',reset,()=>S.fresh()).meta.challenges.discardedElapsedSeconds,20);
console.log('PASS E2/E3 decay versus growth and real headless great-Luo clock');

const active=S.fresh();active.activeChallenge='longevity';active.meta.challenges.discardedElapsedSeconds=10;const live=W.Simulation.OfflineHeadless.create({domain:active});live.step.advanceGameStep(.1,true,{timeSegment:{source:'online',clockRatio:1,compensationEligible:false}});assert.equal(live.getState().activeChallengeElapsedSeconds,.1);assert.equal(live.getState().meta.challenges.discardedElapsedSeconds,10);assert.equal(live.getState().meta.infinity.runElapsed,.1);
const unknown=S.fresh();unknown.activeChallenge='future-unknown';const snapshot=JSON.stringify(S.toSerializable(unknown));assert.throws(()=>drop(unknown,1),/未知挑战/);assert.equal(JSON.stringify(S.toSerializable(unknown)),snapshot);

const capped=W.Simulation.OfflineHeadless.create({domain:s});capped.step.advanceGameStep(.1,true,{timeSegment:{source:'online',clockRatio:1,compensationEligible:false}});assert.equal(capped.getState().activeChallengeElapsedSeconds+capped.getState().meta.challenges.discardedElapsedSeconds,600);
