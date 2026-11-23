'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.WIS_GAME_ROOT||path.resolve(__dirname,'..');
function setup(){const boot={window:{WIS:{Simulation:{}}}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/simulation/offline-worker-bundle.js'),'utf8'),boot);const c={console,performance,setTimeout,clearTimeout,setInterval:(...a)=>setInterval(...a).unref(),clearInterval,postMessage(){}};c.self=c;vm.createContext(c);vm.runInContext('self.window=self;self.document={hidden:false}',c);for(const f of boot.window.WIS.Simulation.OfflineWorkerBundle.scripts)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});return c.WIS;}
const W=setup(),B=W.Core.BigNum,S=W.Core.State,M=W.Meta.BigNumbers,I=W.Meta.Infinity;
const eq=(a,b)=>assert(B.eq(a,b),`${a} != ${b}`),serial=s=>JSON.stringify(S.toSerializable(s));
function ready(ids=['D7-1','D7-2','D7-3']){const s=S.fresh();Object.assign(s.meta.infinity,{unlocked:true,upgradesUnlocked:true,points:B.BN(1000),totalPointsEarned:B.BN(1000)});for(const id of ['D1-1','D1-2','D2-1','D2-2','D3','D4','D5','D6',...ids])assert(I.purchase(s,id),id);s.meta.bigNumbers.unlocked=true;return s;}
function tree(s){const n=M.get(s);n.fractalLevel=5;n.purchases.fill(true);n.gIndex=64;n.tree.construction=B.BN('1e10');n.tree.sequenceWork=B.BN('1e9');return n.tree;}
async function main(){
 for(const id of ['D7-1','D7-2','D7-3']){assert(W.Meta.InfinityConfig.nodes[id],`missing ${id}`);eq(W.Meta.InfinityConfig.nodes[id].price,24);assert.deepEqual(Array.from(W.Meta.InfinityConfig.nodes[id].prerequisites),['D6']);const s=S.fresh();s.meta.infinity.upgradesUnlocked=true;s.meta.infinity.points=B.BN(100);assert.equal(I.purchase(s,id),false);}
 let s=ready();assert.equal(s.fractalAutomationEnabled,true);assert.equal(s.treeUpgradeAutomationEnabled,true);assert.equal(s.treeSuperAutomationEnabled,false);eq(s.treeSuperAutomationMultiplier,2);
 const locked=ready([]);locked.meta.bigNumbers.resources[0].amount=B.BN(1000);assert.equal(M.automate(locked),0);eq(M.get(locked).fractalLevel,0);
 s.meta.bigNumbers.resources[0].amount=B.BN(301);assert.equal(M.automate(s),1);eq(M.amount(s,0),300);assert.equal(M.get(s).fractalLevel,1);M.automate(s);assert.equal(M.get(s).fractalLevel,2);eq(M.amount(s,0),0);
 s.fractalAutomationEnabled=false;M.get(s).resources[1].amount=B.BN(1000);M.automate(s);assert.equal(M.get(s).fractalLevel,2);
 s=ready();tree(s);const initial=B.BN(M.get(s).tree.construction);assert.equal(M.automate(s),3);eq(M.get(s).tree.construction,initial.sub(410));assert.deepEqual({...M.get(s).tree.upgrades},{node:1,branch:1,label:1,amplify:0});assert.equal(M.get(s).tree.phase,'explicit');
 s.treeUpgradeAutomationEnabled=false;s.treeSuperAutomationEnabled=true;M.get(s).tree.sequenceWork=B.BN('1e12');const threshold=M.treeSuperMultiplier(s);s.treeSuperAutomationMultiplier=threshold.add(.0001);M.automate(s);assert.equal(M.get(s).tree.phase,'explicit');s.treeSuperAutomationMultiplier=threshold;assert.equal(M.automate(s),1);assert.equal(M.get(s).tree.phase,'super');eq(M.get(s).tree.superEntryMultiplier,threshold);
 const points=B.BN(M.get(s).tree.construction),sequence=B.BN(M.get(s).tree.sequenceWork);M.advance(s,1);eq(M.get(s).tree.construction,points);eq(M.get(s).tree.sequenceWork,sequence);eq(M.treeView(s).constructionRate,0);const frozen=M.prepareFrozen(s,60);eq(frozen.tree.construction,points);
 s=ready();tree(s);M.get(s).tree.sequenceWork=B.ZERO;M.get(s).tree.construction=B.BN(110);M.automate(s);assert.equal(M.get(s).tree.upgrades.node,1);assert.equal(M.get(s).tree.upgrades.branch,1);assert.equal(M.get(s).tree.upgrades.label,0);eq(M.get(s).tree.construction,0);
 s=ready();s.fractalAutomationEnabled=false;s.treeUpgradeAutomationEnabled=false;s.treeSuperAutomationEnabled=true;s.treeSuperAutomationMultiplier=B.BN('1e400');const round=W.Core.Save.prepare(W.Core.Save.envelope(s)).state;assert.equal(round.fractalAutomationEnabled,false);assert.equal(round.treeUpgradeAutomationEnabled,false);assert.equal(round.treeSuperAutomationEnabled,true);eq(round.treeSuperAutomationMultiplier,'1e400');const reset=I.prepareRebirth(round,{respec:true});eq(reset.treeSuperAutomationMultiplier,'1e400');assert.equal(reset.treeSuperAutomationEnabled,true);assert.equal(M.automate(reset),0);
 for(const bad of ['NaN','Infinity','-1','0','0.99']){const raw=S.toSerializable(s);raw.core.preferences.treeSuperAutomationMultiplier=bad;assert.throws(()=>S.normalizeDomain(raw));}
 // Formal fixed step: spend this frame's earned construction once, not stale snapshot points.
 s=ready(['D7-2']);tree(s);s.treeSuperAutomationEnabled=false;M.get(s).tree.construction=B.BN(9);M.get(s).tree.sequenceWork=B.ZERO;const sim=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});sim.step.advanceGameStep(.1);assert.equal(M.get(sim.getState()).tree.upgrades.node,1);eq(M.get(sim.getState()).tree.construction,B.sub(B.add(9,B.mul(81,.1)),10));
 // Foreground candidate and direct recovery paths produce the same purchases.
 for(const foreground of [false,true]){
  const input=ready(['D7-1']);input.meta.bigNumbers.resources[0].amount=B.BN(301);
  const host=W.Simulation.OfflineHeadless.create({domain:input},{checkpoint(){},yield:()=>Promise.resolve()});
  host.step.advanceGameStep(.1,true,{foreground,timeSegment:{source:'online',clockRatio:1}});assert.equal(M.get(host.getState()).fractalLevel,1);
  host.step.advanceGameStep(.1,true,{foreground,timeSegment:{source:'online',clockRatio:1}});assert.equal(M.get(host.getState()).fractalLevel,2);
 }
 s=ready();tree(s);s.treeSuperAutomationEnabled=true;s.treeSuperAutomationMultiplier=B.ONE;
 const enterHost=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});
 enterHost.step.advanceGameStep(.1,true,{foreground:true,timeSegment:{source:'online',clockRatio:1}});assert.equal(M.get(enterHost.getState()).tree.phase,'super');const held=B.BN(M.get(enterHost.getState()).tree.construction);enterHost.step.advanceGameStep(.1);eq(M.get(enterHost.getState()).tree.construction,held);
 // A true offline interval never buys or enters, even when every option is enabled.
 s=ready();tree(s);s.treeSuperAutomationEnabled=true;s.treeSuperAutomationMultiplier=B.ONE;const off=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});off.offline.appendCatchUpTask(60,60,{source:'offline',speed:1,sealed:true,randomMode:'state'});await off.offline.simulateOfflineProgress(0,0);assert.equal(off.offline.getCatchUpStatus().pendingGameSeconds,0);assert.deepEqual({...M.get(off.getState()).tree.upgrades},{node:0,branch:0,label:0,amplify:0});assert.equal(M.get(off.getState()).tree.phase,'explicit');
 // Purchase failure rolls the complete formal frame back.
 s=ready(['D7-2']);tree(s);const fail=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()}),before=serial(fail.getState()),original=W.Core.Resources.spend;W.Core.Resources={...W.Core.Resources,spend(id,...rest){if(id==='meta.bigNumbers.construction')throw Error('injected construction failure');return original(id,...rest);}};assert.throws(()=>fail.step.advanceGameStep(.1),/injected construction failure/);assert.equal(serial(fail.getState()),before);
 console.log('PASS D7 prices/gates, formal payments/toggles/threshold, save/reset, fixed online frame, offline freeze and rollback; super construction income remains zero');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});module.exports={setup};
