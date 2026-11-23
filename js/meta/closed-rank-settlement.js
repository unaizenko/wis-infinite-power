(function(W){
 'use strict';
 if(!W.Core.RankBudget)return;
 const B=W.Core.BigNum,C=W.Core.ClosedFormBatch,G=W.Meta.ClosedRankCost,R=W.Core.Rank,Q=W.Core.RankBudget.Q,Budget=W.Core.RankBudget.Budget,I=W.Meta.Infinity,M=W.Meta.BigNumbers;
 const enabled=s=>s?.meta?.closedBatchModel===2;
 const rank=x=>B.isDecimal(x)?B.BN(x):R.project(x);
 const packed=x=>R.read(x);
 const maxCount=(n,max)=>max==null?null:B.max(0,rank(max).sub(rank(n)));
 const project=x=>W.Core.Amount?.isAmount(x)?W.Core.Amount.project(x):B.BN(x);
 function downQ(q){let v=Q.project(q);const d=new DataView(new ArrayBuffer(8));for(let j=0;j<=64;j++){if(Q.compare(Q.decimal(String(v)),q)<=0)return B.max(0,v);if(j===64)break;d.setFloat64(0,v.mag);d.setBigUint64(0,d.getBigUint64(0)+(v.mag<0?1n:-1n));v=B.Decimal.fromComponents(v.sign,v.layer,d.getFloat64(0));}throw Error('Cannot safely migrate rank funding');}
 function gRecord(n,s,pricing){const spec={...W.Meta.RankSettlement.rules(s,pricing),award:1,costModel:'anchored-v3',rewardAboveOne:true};spec.treeDelta=String(rank(spec.treeDelta));let r=n.gBatch&&C.read(n.gBatch);
  // Preserve already-published ranks by closing old anchors at their original debit.
  if(!spec.challenge)spec.costModel='anchored-v4';
  const same=r&&['pricing','d6','reward','challenge','costModel','rewardAboveOne'].every(k=>(r.context[k]??null)===(spec[k]??null))&&B.eq(r.context.treeDelta??0,spec.treeDelta);
  if(!same){
   let money=B.BN(n.superProgress||0),acc=r?.acc||B.ZERO;
   if(r){const previousRules={...r.context,costModel:r.context.costModel??'legacy',rewardAboveOne:r.context.rewardAboveOne===true};const paid=['anchored-v2','anchored-v3','anchored-v4'].includes(r.context.costModel)?G.model(r.n0,previousRules).cost(rank(n.gIndex).sub(r.n0)):G.cost(r.n0,rank(n.gIndex).sub(r.n0),previousRules);money=B.max(0,r.funding.sub(paid));if(r.context.pricing==='base')money=money.mul(M.milestoneMultiplier(n.gIndex));}
   if(n.gBudget){money=downQ(Budget.available(n.gBudget));if(n.gBudget.gRules.pricing==='base')money=money.mul(M.milestoneMultiplier(n.gIndex));}
   else if(!r&&n.superResidual?.length){
    const progress=Q.read({terms:[String(n.superProgress),...n.superResidual],denominator:'1'});
    money=downQ(progress);
   }
   if(pricing==='base')money=money.div(M.milestoneMultiplier(n.gIndex));
   if(r&&r.context.pricing!==pricing)acc=pricing==='base'?acc.div(M.milestoneMultiplier(n.gIndex)):acc.mul(M.milestoneMultiplier(n.gIndex));
   r=C.create({n0:rank(n.gIndex),context:spec,funding:money,acc});
  }return r;
 }
 function writeG(n,r,result){n.gBatch=r;n.gIndex=packed(result.count);n.superProgress=result.balance.mul(r.context.pricing==='base'?M.milestoneMultiplier(n.gIndex):1);n.superResidual=[];delete n.gBudget;}
 function advanceG(n,seconds,q,state,options={},maximum=M.maximumG(state)){
  if(rank(n.gIndex).eq(0))return 0;const old=rank(n.gIndex),pricing=options.fixedSources&&!M.gModifiersActive(state)?'raw':'base';let r=gRecord(n,state,pricing);
  if(seconds>0){const A=W.Core.Amount,time=A.from(seconds),qRate=I.fractalGainMultiplier(state,4),exposure=options.fixedSources?A.multiply(A.scale(time,M.BASE_SUPER_SPEED),M.fractalMultiplier(q,n.beyondFractal)):B.eq(qRate,1)?M.exposureQuantity(q,time,n.beyondFractal):A.divide(M.exposureQuantity(q,A.multiply(time,qRate),n.beyondFractal),qRate);let earned=project(A.multiply(exposure,I.gSpeedMultiplier(state)));if(pricing==='raw')earned=earned.mul(M.milestoneMultiplier(n.gIndex));r=C.credit(r,earned).record;}
  const result=C.solve(r,G.model(r.n0,r.context),{previous:old,limit:maxCount(old,maximum)});writeG(n,r,result);return M.MILESTONES.filter(x=>old.lt(x)&&result.count.gte(x)).length;
 }
 function frozenG(n,seconds,profile){if(!profile.active)return;let r=gRecord(n,profile.requirementState,'raw'),earned=profile.quantityRate?project(W.Core.Amount.scale(profile.quantityRate,seconds)):B.mul(profile.rate,seconds);r=C.credit(r,earned).record;writeG(n,r,C.solve(r,G.model(r.n0,r.context),{previous:rank(n.gIndex),limit:maxCount(n.gIndex,profile.maximum)}));}
 function treePrice(n,boosted){const target=n.lt(3)?B.BN(3):n.add(1),raw=B.BN(28800).mul(B.BN(1.4).pow(target.sub(3)));return boosted?raw.div(B.BN(1.2).pow(n)):raw;}
 function treeModel(r){return C.geometric(treePrice(r.n0,r.context.boosted),B.BN(r.context.boosted?7/6:1.4).ln());}
 function treeRecord(t,boosted){
  const current=rank(t.rank);
  let r=t.batch&&C.read(t.batch);
  // Prior manual completions kept the three-rank award on the ledger.
  // Close exactly the batches already published, using their historical prices.
  if(r&&r.n0.lt(3)&&current.gte(3)){
   const paid=C.solve(r,treeModel(r),{previous:current,limit:0});
   r=C.create({n0:current,context:{boosted:r.context.boosted,award:1},funding:paid.balance,acc:r.acc});
  }
  if(r&&r.context.boosted===boosted)return r;
  const price=treePrice(current,boosted);
  let p=B.BN(t.superProgress||0);
  if(t.rankBudget)p=downQ(Budget.view(t.rankBudget).progress);
  if(r){
   const paid=C.solve(r,treeModel(r),{previous:current,limit:0});
   const factor=B.BN(1.2).pow(current);
   const convert=value=>boosted?value.div(factor):value.mul(factor);
   return C.create({n0:current,context:{boosted,award:current.lt(3)?3:1},funding:convert(paid.balance),acc:convert(r.acc)});
  }
  return C.create({n0:current,context:{boosted,award:current.lt(3)?3:1},funding:p.mul(price)});
 }
 function treeIncome(state,seconds){const t=M.get(state).tree,exposure=M.treeTimeExposure(t.superElapsedSeconds,seconds,I.has(state,'D11-1'));return B.mul(t.superEntryMultiplier,B.mul(I.has(state,'D11-2')?M.treeEffect(state,'amplify'):1,exposure));}
 function writeTree(n,r,result,maximum,stop){
  const t=n.tree,old=rank(t.rank);
  if(result.gained.gt(0))t.rank=packed(result.count);
  if(r.n0.lt(3)&&result.gained.gt(0)){
   r=C.reanchor(r,result,{boosted:r.context.boosted,award:1});
  }
  t.batch=r;t.superProgress=result.balance.div(treePrice(result.count,r.context.boosted));
  delete t.rankBudget;delete t.elapsedBudget;
  if(n.rankBasis)n.rankBasis.tree.targetRank=W.Core.RankBasis.target(t.rank);
  if(maximum!=null&&result.count.gte(rank(maximum))){t.phase='complete';t.superProgress=B.ONE;return;}
  if(stop&&result.gained.gt(0)){
   t.phase='explicit';t.superEntryMultiplier=1;t.superElapsedSeconds=B.ZERO;
   if(r.context.boosted){
    // This stopped interval earned the boost of the rank at its start.
    const factor=B.BN(1.2).pow(old),funding=result.balance.mul(factor);
    t.batch=C.create({n0:result.count,context:{boosted:false,award:1},funding,acc:r.acc.mul(factor)});
    t.superProgress=funding.div(treePrice(result.count,false));
   }
  }
 }
 function settleTree(n,r,maximum,stop,batchLimit=null,seconds=0){
  const old=rank(n.tree.rank);
  let limit=maxCount(old,maximum);
  if(batchLimit!=null)limit=limit==null?B.BN(batchLimit):B.min(limit,batchLimit);
  if(stop)limit=limit==null?B.ONE:B.min(limit,1);
  const first=r.n0.lt(3);
  let x=C.solve(r,treeModel(r),{previous:old,limit:first?B.min(limit??1,1):limit});
  if(first&&x.gained.gt(0)&&!stop&&(maximum==null||rank(maximum).gt(3))&&(batchLimit==null||B.gt(batchLimit,1))){
   r=C.reanchor(r,x,{boosted:r.context.boosted,award:1});
   let rest=maxCount(x.count,maximum);
   if(batchLimit!=null){const remaining=B.sub(batchLimit,1);rest=rest==null?remaining:B.min(rest,remaining);}
   x=C.solve(r,treeModel(r),{previous:x.count,limit:rest});
   x={...x,gained:x.count.sub(old)};
  }
  if(seconds>0)n.tree.superElapsedSeconds=B.add(n.tree.superElapsedSeconds,seconds);
  writeTree(n,r,x,maximum,stop);
  return x;
 }
 function advanceTree(state,seconds,maximum,stop=false,boosted=false,frozenIncome=null){
  const n=M.get(state),t=n.tree;
  let r=treeRecord(t,boosted);
  if(seconds>0){
   r=C.credit(r,frozenIncome===null?treeIncome(state,seconds):frozenIncome).record;
  }
  return settleTree(n,r,maximum,stop,null,seconds);
 }
 function advanceTreeSingle(state,seconds,maximum){const n=M.get(state),t=n.tree,r=treeRecord(t,false),old=rank(t.rank);let used=0;
  let x=C.solve(r,treeModel(r),{previous:old,limit:1});
  if(x.gained.eq(0)){
   const full=treeIncome(state,seconds),first=treeModel(r).cost(x.batches.add(1)),need=B.max(0,first.sub(r.funding));
   if(full.lt(need)){const out=advanceTree(state,seconds,maximum,false,false);if(I.has(state,'D8')){const gain=M.treeConstructionQuantityGain(state,seconds);M.addTreeQuantity(t,'construction',gain);M.addTreeQuantity(t,'totalConstruction',gain);}return out;}
   used=full.eq(0)?0:Math.min(seconds,B.toNumber(need.mul(seconds).div(full)));x=advanceTree(state,used,maximum,true,false);
  }else writeTree(n,r,x,maximum,true);
  if(I.has(state,'D8')){const gain=M.treeConstructionQuantityGain(state,used);M.addTreeQuantity(t,'construction',gain);M.addTreeQuantity(t,'totalConstruction',gain);}
  if(t.phase==='explicit'){M.setTreeQuantity(t,'sequenceWork',W.Core.Amount.from(0));if(!I.has(state,'D8'))M.setTreeQuantity(t,'construction',W.Core.Amount.from(0));const gain=M.treeConstructionQuantityGain(state,seconds-used);M.addTreeQuantity(t,'construction',gain);M.addTreeQuantity(t,'totalConstruction',gain);M.addTreeQuantity(t,'sequenceWork',M.treeSequenceQuantityGain(state,gain));}return x;
 }
 function frozenTree(n,state,seconds,profile){
  const branch=W.Core.State.shallowBranch(state);branch.meta={...state.meta,bigNumbers:n};
  const boosted=I.has(state,'D11-3'),stop=!I.has(state,'D10')||!state.treeSuperAutomationEnabled;
  const income=project(profile.quantities?.super??profile.superRate).mul(seconds).mul(treePrice(rank(profile.rank),boosted));
  return advanceTree(branch,seconds,M.maximumTree(state),stop,boosted,income);
 }
 function bankTree(n,amount){const t=n.tree;let r=treeRecord(t,false);r=C.credit(r,project(amount).mul(treePrice(rank(t.rank),false))).record;const x=C.solve(r,treeModel(r),{previous:rank(t.rank),limit:0});t.batch=r;t.superProgress=x.balance.div(treePrice(rank(t.rank),false));delete t.rankBudget;delete t.elapsedBudget;}
 function resetTree(t,discard=false){delete t.elapsedBudget;if(discard){delete t.batch;delete t.rankBudget;return;}if(t.batch)t.batch=C.create({n0:rank(t.rank),context:{boosted:false,award:rank(t.rank).lt(3)?3:1},funding:B.BN(t.superProgress).mul(treePrice(rank(t.rank),false)),acc:t.batch.acc});}
 function prepare(state,operation={}){
  const copy=W.Core.State.cloneForSimulation(state),n=M.get(copy),kind=operation.kind;
  if(!M.isUnlocked(copy))throw Error('Closed rank domain is locked');
  const input=operation.funding===undefined?B.ZERO:project(operation.funding);let r,x,limit;
  if(kind==='g-raw'){
   if(n.fractalLevel!==5||rank(n.gIndex).lte(0))throw Error('G work is not active');
   r=C.credit(gRecord(n,copy,'raw'),input).record;limit=maxCount(n.gIndex,M.maximumG(copy));if(operation.limit!=null)limit=limit==null?B.BN(operation.limit):B.min(limit,operation.limit);
   x=C.solve(r,G.model(r.n0,r.context),{previous:rank(n.gIndex),limit});writeG(n,r,x);
  }else if(kind==='tree-raw'){
   if(n.tree.phase!=='super'||!M.treeUnlocked(copy))throw Error('TREE work is not active');
   r=C.credit(treeRecord(n.tree,false),input.mul(treePrice(rank(n.tree.rank),false))).record;
   x=settleTree(n,r,M.maximumTree(copy),!I.has(copy,'D10')||!copy.treeSuperAutomationEnabled,operation.limit);
  }else throw Error('Unknown closed rank operation');
  return {state:copy,result:x};
 }
 function prepareWork(state,operation,{isCurrent=()=>true}={}){
  const key=JSON.stringify(W.Core.State.toSerializable(state));let value=null,cancelled=false;
  const current=()=>!cancelled&&isCurrent()&&JSON.stringify(W.Core.State.toSerializable(state))===key;
  const check=()=>{if(!current()){cancelled=true;throw Object.assign(Error('Closed rank work cancelled or stale'),{code:'rank-work-stale'});}};
  const inner=W.Core.CertifiedRankMath.createWork(()=>prepare(state,operation),{isCurrent:current});
  return Object.freeze({advance(budget={}){check();const result=inner.advance(typeof budget==='number'?{deadline:budget}:budget);if(result.done)value=inner.result();return result;},cancel(){cancelled=true;inner.cancel();value=null;},result(){check();if(!value)throw Error('Closed rank work not completed');return value;}});
 }
 function validate(n){if(n.gBatch){C.read(n.gBatch);if(n.gBudget||!B.parseFinite(n.superProgress)||B.lt(n.superProgress,0)||n.superResidual?.length)throw Error('Mixed closed G state');}if(n.tree.batch){C.read(n.tree.batch);if(n.tree.rankBudget||!B.parseFinite(n.tree.superProgress)||B.lt(n.tree.superProgress,0))throw Error('Mixed closed TREE state');}return n;}
 function migrate(state){const n=M.get(state);if(rank(n.gIndex).gt(0)&&!n.gBatch){const r=gRecord(n,state,'raw');n.gBatch=r;delete n.gBudget;n.superResidual=[];n.superProgress=r.funding;}if(!n.tree.batch){const boosted=I.has(state,'D11-3')&&n.tree.phase==='super',r=treeRecord(n.tree,boosted);n.tree.batch=r;delete n.tree.rankBudget;delete n.tree.elapsedBudget;}return n;}
 W.Meta.ClosedRankSettlement=Object.freeze({enabled,prepare,prepareWork,advanceG,frozenG,advanceTree,advanceTreeSingle,frozenTree,bankTree,resetTree,validate,migrate,treePrice,treeModel,downQ});
}(window.WIS));
