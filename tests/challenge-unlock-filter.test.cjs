'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
const {WIS:W,h,setRank,legacyData}=require('./helpers/challenge-runtime.cjs');
const S=W.Core.State,R=W.Core.Runtime,C=W.Meta.Challenges,I=W.Meta.Infinity,B=W.Core.BigNum;
const keys=['trueG1','trueGraham','trueTree3','infinityFast'];
const install=s=>(h.createSimulation(S.toSerializable(s)),R.getState());
const serial=()=>JSON.stringify(S.toSerializable(R.getState()));
let s=S.fresh();s.unlockedAchievements.scale4=true;s=install(s);
for(const key of keys){
 assert.equal(C.challengeUnlocked(key),false,key+' requires its purchased upgrade');
 const before=serial();C.startChallenge(key);assert.equal(serial(),before,key+' locked API start is a no-op');
}
function unlock(node){Object.assign(I.get(R.getState()),{unlocked:true,upgradesUnlocked:true,points:B.BN(10000)});
 for(const id of node==='D3'?['D1-1','D1-2','D2-1','D2-2','D3']:['E1','E2-1','E3-1','E4'])assert(I.has(R.getState(),id)||I.purchase(R.getState(),id),id);
}
unlock('D3');for(const key of keys.slice(0,3))assert(C.challengeUnlocked(key));assert(!C.challengeUnlocked('infinityFast'));
unlock('E4');assert(C.challengeUnlocked('infinityFast'));
for(const key of keys){C.startChallenge(key);assert.equal(R.getState().activeChallenge,key);C.exitChallenge();assert.equal(R.getState().activeChallenge,null);}
C.startChallenge('innateDeficiency');assert.equal(R.getState().activeChallenge,'innateDeficiency');
R.getState().highestScaleIndex=C.challengeRequiredScaleIndex('innateDeficiency');
assert(C.checkActiveChallengeCompletion());assert.equal(R.getState().challengeCompletions.innateDeficiency,1);
assert.equal(R.getState().activeChallenge,null);
assert.equal(S.fresh().hideCompletedChallenges,false);
const limited=C.isCompletionLimitReached;
for(const [def,count,want] of [[{maxCompletions:1},1,true],[{maxCompletions:5},5,true],[{maxCompletions:5},3,false],
 [{maxCompletions:Infinity},100,false],[{},100,false],[{maxCompletions:1,unlimited:true},100,false],
 [C.get('qiRefiningHundredThousandYears'),100,false]])assert.equal(limited(def,count),want);
s=R.getState();s.hideCompletedChallenges=true;s.challengeCompletions.trueG1=1;
assert(C.challengeVisible('trueG1'),'challenge count alone is not permanent conquest');W.Meta.Achievements.record(s,'trueG1');assert(!C.challengeVisible('trueG1'));assert(C.challengeVisible('trueGraham'));
C.startChallenge('trueG1');assert.equal(R.getState().activeChallenge,'trueG1');assert(C.challengeVisible('trueG1'),'active repeat retains its exit control');C.exitChallenge();
s=R.getState();const loaded=W.Core.Save.prepare(W.Core.Save.envelope(s)).state;assert.equal(loaded.hideCompletedChallenges,true);
for(const profile of ['challenge','infinity'])assert.equal(W.Core.Reset.apply(profile,loaded,S.fresh).hideCompletedChallenges,true);
const legacy=legacyData(loaded);delete legacy.core.preferences.hideCompletedChallenges;
assert.equal(W.Core.Save.prepare({schemaVersion:64,data:legacy}).state.hideCompletedChallenges,false);
assert.equal(W.Core.Config.saveVersion,76);assert.equal(W.Core.Config.gameVersion,'0.2.3.0');
console.log('PASS purchase gates, locked API atomicity, entry/exit, finite/repeatable filter, active exit and preference save/reset compatibility');


