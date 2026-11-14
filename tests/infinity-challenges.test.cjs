'use strict';const assert=require('node:assert/strict'),path=require('node:path');process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
const {WIS:W,h,setRank,legacyData}=require('./helpers/challenge-runtime.cjs');const S=W.Core.State,I=W.Meta.Infinity,B=W.Core.BigNum,N=W.Meta.BigNumbers,C=W.Meta.Challenges,R=W.Core.Runtime;
assert(C.get('trueG1'),'new challenges must use formal catalog');
for(const [key,target] of [['trueG1',1],['trueGraham',64],['trueTree3',3]]){
 let s=S.fresh();Object.assign(I.get(s),{points:B.BN(1000),upgradesUnlocked:true,unlocked:true});for(const id of ['D1-1','D1-2','D2-1','D2-2','D3'])I.purchase(s,id);
 Object.assign(N.get(s),{unlocked:true,fractalLevel:5,gIndex:70});N.get(s).tree={...N.freshTree(),rank:4,phase:'complete',superProgress:1};setRank(s,{g:70,tree:4});
 h.createSimulation(S.toSerializable(s));C.resetForChallenge(key);s=R.getState();assert.equal(N.get(s).gIndex,0);assert.equal(N.get(s).tree.rank,0);assert(I.has(s,'D3'));assert.equal(C.checkActiveChallengeCompletion(),false);
 setRank(s,key==='trueTree3'?{tree:target}:{g:target});
 assert(C.checkActiveChallengeCompletion());assert.equal(s.challengeCompletions[key],1);
}
assert.equal(C.get('infinityFast').resetLevel,'infinity','explicit infinite challenge');
let s=S.fresh();let sim=h.createSimulation(S.toSerializable(s));sim.advanceGameStep(.1,true,{foreground:true,timeSegment:{source:'online',clockRatio:1}});assert.equal(I.get(R.getState()).runElapsed,.1);
console.log('PASS existing challenge entry/reset/target/rewards, infinite speed catalog and game clock');
