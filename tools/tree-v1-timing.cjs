'use strict';
// Diagnostic event-driven buying policy. Root finding here is for the timing
// experiment only; no search or per-second TREE loop exists in production.
const fs=require('node:fs'),path=require('node:path');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
const {WIS:W}=require('../tests/offline-fixed-20260912-r9/load.cjs'),B=W.Core.BigNum,N=W.Meta.BigNumbers,S=W.Core.State;
function until(gain,amount){if(B.lte(amount,0))return 0;let hi=1;while(B.lt(gain(hi),amount))hi*=2;let lo=0;for(let j=0;j<60;j++){const mid=(hi+lo)/2;if(B.lt(gain(mid),amount))lo=mid;else hi=mid;}return hi;}
function seed(q){const s=S.fresh();Object.assign(N.get(s),{unlocked:true,fractalLevel:5,purchases:Array(5).fill(true),gIndex:64,beyondFractal:true});N.get(s).resources[4].amount=B.BN(q);W.Meta.Achievements.record(s,'googol');return s;}
function scenario(q,indexMultiplier){const s=seed(q),targetWork=B.BN(1e9*indexMultiplier*indexMultiplier);let seconds=0,purchases=0;
 while(B.lt(N.get(s).tree.sequenceWork,targetWork)){
  const t=N.get(s).tree;
  const keys=Object.keys(N.TREE_UPGRADES).sort((a,b)=>B.div(N.treeUpgradeCost(s,a),Math.log(N.TREE_UPGRADES[a].effect)).cmp(B.div(N.treeUpgradeCost(s,b),Math.log(N.TREE_UPGRADES[b].effect))));
  const key=keys[0],cost=N.treeUpgradeCost(s,key);
  if(N.canPurchaseTreeUpgrade(s,key)){N.purchaseTreeUpgrade(s,key);purchases++;continue;}
  const gain=dt=>N.treeConstructionGain(s,dt);
  const buyTime=until(gain,B.sub(cost,t.construction));
  const finishTime=until(dt=>N.treeSequenceGain(s,gain(dt)),B.sub(targetWork,t.sequenceWork));
  const dt=Math.min(buyTime,finishTime);N.advance(s,dt);seconds+=dt;
  if(purchases>1000)throw Error('unexpected policy length');
 }
 const multiplier=N.treeSuperMultiplier(s),superSeconds=28800/multiplier;
 return {index:'T'+indexMultiplier+'e6',explicitSeconds:seconds,multiplier,superSeconds,totalSeconds:seconds+superSeconds,upgrades:N.get(s).tree.upgrades,purchases};
}
const inheritedQ=until(dt=>N.exposure(0,dt),600);
const report={policy:'Buy minimum cost / ln(sequence efficiency factor), immediately when affordable; stop at selected entry index. No automated TREE purchases are added to gameplay.',inheritedQ,scenarios:[0,inheritedQ].map(q=>({initialQ:q,entries:[1,2,3,5].map(i=>scenario(q,i))}))};
const target=path.resolve(__dirname,'../docs/tree-v1-evidence/timing.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
