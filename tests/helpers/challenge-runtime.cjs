"use strict";
// Current production assembly and real headless host, scoped to challenge tests.
const {setup75}=require('../amount-fixture.cjs');
const {W,context}=setup75({targetSchema:76});context.confirm=()=>true;
const S=W.Core.State,R=W.Core.Runtime,N=W.Meta.BigNumbers;
let current;
const h={createSimulation(serialized,options={}){
 const bind=R.bind;
 W.Core.Runtime={...R,bind:hooks=>bind({...hooks,infinityRebirth:opts=>W.Meta.Infinity.commitRebirth(opts,{
  getState:()=>R.getState(),capture:()=>S.cloneForSimulation(R.getState()),cancel(){},
  install:next=>R.setState(next),save:()=>true,restore:previous=>R.setState(previous)
 })})};
 try{current=W.Simulation.OfflineHeadless.create({domain:S.normalizeDomain(serialized)},
  {checkpoint:options.checkpoint||(()=>{}),yield:options.yieldToHost||(()=>Promise.resolve())});}
 finally{W.Core.Runtime=R;}
 return {...current.step,offline:current.offline,getState:current.getState};
}};
function setRank(s,{g,tree}={}){const n=N.get(s);
 if(g!==undefined)Object.assign(n,{unlocked:true,fractalLevel:5,purchases:[true,true,true,true,true],beyondFractal:true,gIndex:g});
 if(tree!==undefined)n.tree={...N.freshTree(),rank:tree,phase:tree>=3?'complete':'explicit',superProgress:tree>=3?1:0};
 n.rankBasis=W.Core.RankBasis.create(n);return s;
}
function legacyData(s){
 const data=S.toSerializable(s);delete data.meta.bigNumbers.rankBasis;
 // These historical fixtures have no Silver Sea progress. Do not label the
 // current v2 quantity record as an old v1 finite-progress save.
 const progress=data.meta.infinity.silverSeaProgress;
 if(W.Core.Amount.compare(W.Core.Amount.field(progress),0)!==0)throw Error('legacy fixture requires zero Silver Sea progress');
 data.meta.infinity.silverSeaProgress={version:1,requirement:'1',remaining:'1',carry:'0'};
 return data;
}
module.exports={WIS:W,W,h,setRank,legacyData};
