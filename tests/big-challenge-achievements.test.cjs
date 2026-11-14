'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
const {WIS:W,h,setRank,legacyData}=require('./helpers/challenge-runtime.cjs');
const S=W.Core.State,B=W.Core.BigNum,I=W.Meta.Infinity,N=W.Meta.BigNumbers,C=W.Meta.Challenges,A=W.Meta.Achievements,R=W.Core.Runtime,Save=W.Core.Save;
const keys=['trueG1','trueGraham','trueTree3'];
const install=s=>(h.createSimulation(S.toSerializable(s)),R.getState());
function effect(s,key){
 if(key==='trueG1')return I.fractalGainMultiplier(s,0);
 if(key==='trueGraham')return I.gBaseRequirement(s,0);
 return I.treeGainMultiplier(s);
}
function expectReward(s,key,enabled){
 const actual=effect(s,key),base=key==='trueGraham'?B.BN(W.Meta.InfinityConfig.gRequirement):B.ONE;
 const rewarded=key==='trueG1'?B.BN(10):key==='trueGraham'?B.pow(base,.95):B.BN(3);
 assert(B.eq(actual,enabled?rewarded:base),`${key}: reward authority must be achievement`);
}
for(const key of keys){
 let s=install(S.fresh());
 assert.equal(A.definitions().find(a=>a.key===key)?.completed,false);
 s.challengeCompletions[key]=1;
 assert.equal(A.definitions().find(a=>a.key===key).completed,false,`${key}: count alone is not achievement completion`);
 expectReward(s,key,false);
 s.challengeCompletions[key]=0;s.unlockedAchievements[key]=true;
 expectReward(s,key,true);
 const definition=A.definitions().find(a=>a.key===key);
 assert(definition?.completed,`${key}: permanent achievement exists`);
 assert.equal(definition.name,C.get(key).name,`${key}: challenge and achievement names match`);
 s.hideCompletedChallenges=true;s.unlockedAchievements.scale4=true;
 Object.assign(I.get(s),{unlocked:true,upgradesUnlocked:true,points:B.BN(1000)});
 s=install(s);
 for(const id of ['D1-1','D1-2','D2-1','D2-2','D3'])I.purchase(s,id);
 assert.equal(C.challengeVisible(key),false,`${key}: hide by permanent achievement`);
 s.activeChallenge=key;assert.equal(C.challengeVisible(key),true);
 s.activeChallenge=null;
}
for(const [key,target] of [['trueG1',1],['trueGraham',64],['trueTree3',3]]){
 let s=install(S.fresh());s.activeChallenge=key;
 s=install(s);
 setRank(s,key==='trueTree3'?{tree:target}:{g:target});
 assert(C.checkActiveChallengeCompletion(),`${key}: completion`);
 assert.equal(s.challengeCompletions[key],1);
 assert.equal(A.has(s,key),true,`${key}: immediate achievement`);
 expectReward(s,key,true);
 const saved=Save.envelope(s);
 let reloaded=Save.prepare(saved).state;
 assert.equal(A.has(reloaded,key),true);
 assert.equal(reloaded.challengeCompletions[key],1);
 reloaded=Save.prepare(Save.envelope(reloaded)).state;
 assert.equal(A.has(reloaded,key),true);
 assert.equal(reloaded.challengeCompletions[key],1);
}
let separate=install(S.fresh());A.record(separate,'tree3');assert.equal(A.has(separate,'trueTree3'),false);expectReward(separate,'trueTree3',false);delete separate.unlockedAchievements.tree3;A.record(separate,'trueTree3');assert.equal(A.has(separate,'tree3'),false);expectReward(separate,'trueTree3',true);
let historical=S.fresh();for(const key of keys)historical.challengeCompletions[key]=1;
 const originalCounts={...historical.challengeCompletions};
 historical=Save.prepare(Save.envelope(historical)).state;
 for(const key of keys){assert.equal(A.has(historical,key),true);assert.equal(historical.challengeCompletions[key],originalCounts[key]);}
 const migrated=S.toSerializable(historical);
 historical=Save.prepare(Save.envelope(historical)).state;
 assert.deepEqual(S.toSerializable(historical),migrated,'migration idempotent');
 for(const key of keys)expectReward(historical,key,true);
 let reset=S.fresh();for(const key of keys){reset.challengeCompletions[key]=1;reset.unlockedAchievements[key]=true;}
 reset.unlockedAchievements.tree3=true;setRank(reset,{tree:3});I.get(reset).unlocked=true;
 reset=install(reset);const next=I.prepareRebirth(reset);
 for(const key of keys){assert.equal(next.challengeCompletions[key],0);assert.equal(A.has(next,key),true);expectReward(next,key,true);}
 assert.equal(A.has(next,'tree3'),true);assert.equal(A.has(next,'trueTree3'),true);
 const repeated=install(next);repeated.activeChallenge='trueG1';setRank(repeated,{g:1});const recordBefore=Object.keys(repeated.unlockedAchievements).sort();
 assert(C.checkActiveChallengeCompletion());assert.equal(repeated.challengeCompletions.trueG1,1);assert.deepEqual(Object.keys(repeated.unlockedAchievements).sort(),recordBefore,'repeat must not regrant achievement');
 let bonus=install(S.fresh());A.record(bonus,'brick');const jBefore=W.Power.ScaleLogic.achievementJBonus();
 bonus.challengeCompletions.trueG1=1;assert.equal(W.Power.ScaleLogic.achievementJBonus(),jBefore,'challenge count alone cannot increase achievement J');
 A.record(bonus,'trueG1');assert(Math.abs(W.Power.ScaleLogic.achievementJBonus()-jBefore-.1)<1e-9,'earned achievement enters standard Brick count');
 console.log('PASS permanent big-challenge achievements, reward authority, migration, reset, filter');


