'use strict';
const assert=require('node:assert/strict'),{host,launch}=require('./startup-browser-helpers.cjs');
(async()=>{const browser=await launch();try{const h=await host(browser,{before:()=>{Date.now=()=>1800000000000;}});try{const p=h.page;await p.goto(h.url);await p.waitForFunction(()=>WIS_BOOT.diagnostics().ready);const result=await p.evaluate(()=>{
 const s=WIS.Game.getState();s.activeChallenge='longevity';s.activeChallengeElapsedSeconds=1;s.meta.challenges.discardedElapsedSeconds=599;s.unlockedAchievements.trueScale4=true;s.unlockedAchievements.scale4=true;
 document.querySelectorAll('#challenge-list details').forEach(d=>d.open=true); WIS.Core.Runtime.call('switchPage','challenges');WIS.Core.Runtime.call('renderImmediately','challenges');const longevity=document.getElementById('longevity-limit').textContent;
 s.meta.infinity.unlocked=true;s.activeChallenge='infinityFast';s.activeChallengeElapsedSeconds=1;s.meta.challenges.discardedElapsedSeconds=3;
 const original=WIS.Meta.Challenges;WIS.Meta.Challenges={...original,challengeVisible:()=>true};WIS.Core.Runtime.call('renderImmediately','challenges');WIS.Meta.Challenges=original;
 return {longevity,fast:document.querySelector('#infinity-challenge-infinityFast .infinity-challenge-status').textContent,settled:s.activeChallengeElapsedSeconds};
 });assert.match(result.longevity,/10分钟.*10分钟/);assert.match(result.fast,/当前 4(?:\.0+)?秒/);assert.equal(result.settled,1);assert.deepEqual(h.errors,[]);console.log('PASS challenge rule clock UI: longevity 1+599=600, fast 1+3=4, settled growth clock unchanged');}finally{await h.close();}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
