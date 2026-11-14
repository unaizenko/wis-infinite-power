'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
process.env.FIXED_RESULTS=path.join(require('node:os').tmpdir(),'wis-graham-qi');
const {h,WIS:W,setRank,legacyData}=require('./helpers/challenge-runtime.cjs');
const S=W.Core.State,B=W.Core.BigNum,R=W.Core.Runtime,E=W.Core.Effects,N=W.Meta.BigNumbers,X=W.Cultivation.Xiuzhen,I=W.Cultivation.ImmortalLogic,C=W.Meta.Challenges;
function graham(index){const s=S.fresh();Object.assign(N.get(s),{unlocked:true,fractalLevel:5,purchases:[true,true,true,true,true],gIndex:index,beyondFractal:true,superProgress:B.BN('99.999')});setRank(s,{g:index});return s;}
for(const fixedSources of [false,true]){
 const s=graham(63);h.createSimulation(S.toSerializable(s));const live=R.getState();
 const trial=N.prepare(live,.1,{fixedSources});assert.equal(trial.gIndex,64);
 assert.equal(N.get(live).gIndex,63);assert.equal(live.symbolicPowerMilestones.graham64,false);assert(!live.unlockedAchievements.graham64,'trial must not grant live achievement');
 N.advance(live,.1,{fixedSources});assert.equal(N.get(live).gIndex,64);assert.equal(live.symbolicPowerMilestones.graham64,true);assert.equal(live.unlockedAchievements.graham64,true);
}
const simulation=h.createSimulation(S.toSerializable(graham(63)));const tick=simulation.advanceGameStep(.1,true,{foreground:true,timeSegment:{source:'online',clockRatio:1}});assert.equal(tick.processedSeconds,.1);assert.equal(R.getState().symbolicPowerMilestones.graham64,true);assert.equal(R.getState().unlockedAchievements.graham64,true);
const legacy=graham(64);legacy.symbolicPowerMilestones.graham64=false;delete legacy.unlockedAchievements.graham64;
const repaired=W.Core.Save.prepare({schemaVersion:60,data:legacyData(legacy)}).state;
assert.equal(repaired.symbolicPowerMilestones.graham64,true);assert.equal(repaired.unlockedAchievements.graham64,true);
const encoded=JSON.stringify(W.Core.Save.envelope(repaired));assert.equal(JSON.stringify(W.Core.Save.envelope(W.Core.Save.prepare(JSON.parse(encoded)).state).data),JSON.stringify(JSON.parse(encoded).data));
console.log('PASS G63 crossing: fixed/legacy advance, pure preview, G64 old-save flag + achievement repair');
const s=S.fresh();s.cultivation.active='immortal';s.challengeCompletions.mortalTransformation=1;s.challengeCompletions.yinVoidYangReal=1;
Object.assign(s.unlockedAchievements,{qiPathComplete:true,bodyIntegration:true,infantSpirit:true});
Object.assign(X.get(s),{entered:true,realm:6,highestRealm:6,abilities:Object.fromEntries(X.abilities.map(a=>[a.key,true])),history:{realm:6,abilities:Object.fromEntries(X.abilities.map(a=>[a.key,true]))}});
h.createSimulation(S.toSerializable(s));
C.resetForChallenge('qiRefiningHundredThousandYears');let live=R.getState();
assert.equal(live.activeChallenge,'qiRefiningHundredThousandYears');assert.equal(X.get(live).highestRealm,6);assert(X.available(live));assert(X.sealed(live));
W.Core.Resources.setSystem('immortal','mana',B.BN('1e100'),live);assert.equal(X.canBreakthrough(live),false);assert.equal(X.breakthrough(live),false);
for(const name of ['星系','超星系团','宇宙结构'])assert.equal(X.softcapRemoved(live,{name}),false);
// Old challenge saves may retain purchased capabilities: all effect/action gates must still hold.
const x=X.get(live);x.entered=true;x.realm=6;x.abilities=Object.fromEntries(X.abilities.map(a=>[a.key,true]));
for(const key of X.resourceKeys)x.resources[key].amount=B.BN('1e100');
for(const a of X.abilities){assert.equal(X.has(live,a.key),false);x.abilities[a.key]=false;assert.equal(X.canBuy(live,a.key),false);assert.equal(X.buy(live,a.key),false);x.abilities[a.key]=true;}
live.immortalRealmAutomationEnabled=true;live.immortalAbilityAutomationEnabled=true;assert.equal(X.automation(live,'realm'),0);assert.equal(X.automation(live,'ability'),0);
assert.deepEqual(Array.from(X.effects(live)),[]);for(const v of Object.values(X.rates(live)))assert(B.eq(v,0));
live.qiSpellLevel=3;assert.equal(X.abilityView(live).qiSpellLevel,3,'keep lower-path Qi abilities');assert.equal(X.qiPathSealed(live),false);
live.qiSpellLevel=0;I.buyQiSpell();assert.equal(live.qiSpellLevel,1,'Qi manual abilities remain buyable');E.invalidate();assert(B.gt(I.qiSpellPowerMultiplier(),1));
// Actual single and batched purchase paths, including the 100,000 goal boundary.
live.currentQiLayer=99998;W.Core.Resources.setSystem('immortal','mana',I.qiLayerRequirement(99999),live);E.invalidate();
assert.equal(I.advanceQiLayer(false),true);assert.equal(live.currentQiLayer,99999);
assert(B.eq(live.mana,I.qiLayerRequirement(99999)));
W.Core.Resources.setSystem('immortal','mana',I.qiLayerRequirement(100000),live);
assert(I.advanceQiLayersBatch(false)>=1);assert.equal(live.currentQiLayer,100000);
assert(B.eq(live.mana,I.qiLayerRequirement(100000)));
assert.equal(live.challengeCompletions.qiRefiningHundredThousandYears,1);
C.exitChallenge();assert.equal(live.activeChallenge,null);assert.equal(X.sealed(live),false);assert(X.available(live)&&X.unlocked(live));
Object.assign(X.get(live),{realm:0,entered:false});W.Core.Resources.setSystem('immortal','mana',B.BN('1e100'),live);assert.equal(X.canBreakthrough(live),true);assert.equal(X.breakthrough(live,false),true);
for(const name of ['星系','超星系团','宇宙结构'])assert.equal(X.softcapRemoved(live,{name}),true);
console.log('PASS Qi challenge: real reset, historical realm sealed, manual/auto actions and effects sealed, 100,000 Qi reached, eligibility restored on exit');
