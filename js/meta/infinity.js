(function defineInfinity(WIS) {
  'use strict';
  const B=WIS.Core.BigNum,C=WIS.Meta.InfinityConfig;
  const amountModel=()=>WIS.Core.Amount?.enabled()===true;
  const amount=()=>WIS.Core.Amount;
  const countQuantity=value=>{const A=amount(),v=A.from(value),integer=A.integerPart(v);if(A.compare(v,integer)!==0)throw Error('无限点数/支付记录必须为非负整数');return v;};
  const quantity=(state,key='points')=>amountModel()?countQuantity(amount().field(get(state),key)):amount().from(get(state)[key]||0);
  const paidQuantity=row=>countQuantity(amount().field(row,'pricePaid'));
  const investedQuantity=state=>(get(state)?.purchaseLedger||[]).reduce((v,row)=>amount().add(v,paidQuantity(row)),amount().from(0));
  function fractionRecord(value){const A=amount(),v=A.from(value);if(A.compare(v,1)>=0)throw Error('银海小数进度越界');const parts=A.serialize(v);return {version:2,amount:parts.main,residual:parts.tail.slice()};}
  function fractionValue(raw){
    const A=amount();
    if(raw?.version===2){if(Object.keys(raw).some(k=>!['version','amount','residual'].includes(k))||!Object.prototype.hasOwnProperty.call(raw,'amount')||!Array.isArray(raw.residual))throw Error('银海小数进度无效');const value=A.field(raw);if(A.compare(value,1)>=0)throw Error('银海小数进度越界');return value;}
    const p=normalizeSilverSeaProgressLegacy(raw);return A.fromParts(0,[1,B.BN(p.remaining).neg(),p.carry]);
  }
  const fresh=()=>({version:1,points:B.BN(0),totalPointsEarned:B.BN(0),rebirthCount:0,unlocked:false,upgradesUnlocked:false,upgrades:{},purchaseLedger:[],runElapsed:0,discardedRunElapsed:0,challengeRewards:{},ringChallengeActive:false,silverSeaProgress:amountModel()?{version:2,amount:"0",residual:[]}:{version:1,requirement:"1",remaining:"1",carry:"0"}});
  function money(v) {const x=B.parseFinite(v??0);if(!x||x.lt(0)||!x.eq(x.floor()))throw Error('无限点数/支付记录必须为非负整数');return x;}
  function normalizeSilverSeaProgress(raw){return amountModel()?fractionRecord(fractionValue(raw)):normalizeSilverSeaProgressLegacy(raw);}
  function normalizeSilverSeaProgressLegacy(raw) {
    if(raw==null)return {version:1,requirement:"1",remaining:"1",carry:"0"};
    const L=WIS.Meta.TreasureLedger;
    WIS.Core.FiniteProgress.validate(raw);
    if(raw.version!==1||!B.eq(raw.requirement,1)||!B.isFiniteBN(raw.remaining)||B.lt(raw.remaining,0)||B.gt(raw.remaining,1)||!B.isFiniteBN(raw.carry))
      throw Error('银海小数进度无效');
    const fraction=L.normalize([1,B.BN(raw.remaining).neg(),raw.carry]);
    if(L.sign(fraction)<0||L.compare(fraction,[1])>=0)throw Error('银海小数进度越界');
    return {version:1,requirement:"1",remaining:String(raw.remaining),carry:String(raw.carry)};
  }
  function normalize(raw,achievement=false,legacyFastReward=false) {
    const n=fresh();if(raw!=null&&(typeof raw!=='object'||Array.isArray(raw)))throw Error('无限状态无效');
    if(raw?.version!=null&&raw.version!==1)throw Error('无限状态版本无效');
    if(raw?.version===1){
      if(raw.ringChallengeActive!=null&&typeof raw.ringChallengeActive!=='boolean')throw Error('圆环之理挑战状态无效');
      n.ringChallengeActive=raw.ringChallengeActive===true;
      n.points=money(raw.points);n.totalPointsEarned=money(raw.totalPointsEarned);
      if(amountModel())for(const key of ['points','totalPointsEarned'])Object.assign(n,amount().fieldParts(countQuantity(amount().field(raw,key)),key));
      n.silverSeaProgress=normalizeSilverSeaProgress(raw.silverSeaProgress);
      if(!Number.isSafeInteger(raw.rebirthCount)||raw.rebirthCount<0)throw Error('无限转生次数无效');
      if(!Number.isFinite(raw.runElapsed)||raw.runElapsed<0)throw Error('无限周目时间无效');
      n.rebirthCount=raw.rebirthCount;n.runElapsed=raw.runElapsed;
      if(raw.discardedRunElapsed!=null&&(!Number.isFinite(raw.discardedRunElapsed)||raw.discardedRunElapsed<0))throw Error("无限舍弃时间无效");
      n.discardedRunElapsed=raw.discardedRunElapsed??0;
      if(raw.challengeRewards!=null&&(typeof raw.challengeRewards!=='object'||Array.isArray(raw.challengeRewards)))throw Error('无限挑战奖励记录无效');
      for(const [id,value] of Object.entries(raw.challengeRewards||{})){
        if(C.challenges[id]?.resetLevel!=='infinity'||value!==true)throw Error('未知无限挑战奖励');n.challengeRewards[id]=true;
      }
      if(!raw.upgrades||typeof raw.upgrades!=='object'||Array.isArray(raw.upgrades)||!Array.isArray(raw.purchaseLedger))throw Error('无限强化记录无效');
      for(const [id,v] of Object.entries(raw.upgrades)){if(!C.nodes[id]||v!==true)throw Error('未知无限强化');n.upgrades[id]=true;}
      const paid=new Set();n.purchaseLedger=raw.purchaseLedger.map(e=>{
        if(!e||!n.upgrades[e.nodeId]||paid.has(e.nodeId))throw Error('无限付款记录不匹配');paid.add(e.nodeId);return amountModel()?{nodeId:e.nodeId,...amount().fieldParts(paidQuantity(e),'pricePaid')}:{nodeId:e.nodeId,pricePaid:money(e.pricePaid)};
      });
      if(paid.size!==Object.keys(n.upgrades).length)throw Error('无限强化缺少实际付款记录');
      for(const id of paid){const node=C.nodes[id];if(!prerequisites(n,node))throw Error('无限强化前置不满足');
        if(node.exclusiveGroup&&Object.values(C.nodes).some(o=>o.id!==id&&o.exclusiveGroup===node.exclusiveGroup&&n.upgrades[o.id]))throw Error('无限强化路线互斥');}
    }
    if(legacyFastReward)n.challengeRewards.infinityFast=true;
    n.unlocked=achievement||raw?.unlocked===true||n.rebirthCount>0;
    n.upgradesUnlocked=raw?.version===1&&(raw.upgradesUnlocked===true||n.rebirthCount>0);
    return n;
  }
  const get=s=>s.meta.infinity;
  const has=(s,id)=>get(s)?.upgrades?.[id]===true;
  function prerequisites(n,node){return node.prerequisiteMode==='any'?node.prerequisites.some(id=>n.upgrades[id]):node.prerequisites.every(id=>n.upgrades[id]);}
  function status(s,id){const node=C.nodes[id],n=get(s);if(!node||!n?.upgradesUnlocked)return 'prerequisite';if(node.implemented===false)return 'unimplemented';if(has(s,id))return 'purchased';
    if(node.exclusiveGroup&&Object.values(C.nodes).some(o=>o.id!==id&&o.exclusiveGroup===node.exclusiveGroup&&has(s,o.id)))return 'exclusive';
    if(!prerequisites(n,node))return 'prerequisite';return (amountModel()?amount().compare(quantity(s),node.price)>=0:B.gte(n.points,node.price))?'available':'unaffordable';}
  function purchase(s,id){WIS.Core.Runtime.assertMutable();if(status(s,id)!=='available')return false;const n=get(s),price=money(C.nodes[id].price);
    // Settlement candidates validate domain root identity before publishing.
    s.meta={...s.meta,infinity:{...n,...(amountModel()?amount().fieldParts(amount().subtract(quantity(s),price),'points'):{points:B.sub(n.points,price)}),upgrades:{...n.upgrades,[id]:true},purchaseLedger:[...n.purchaseLedger,{nodeId:id,pricePaid:price}]}};
    if(id==='D1-2')WIS.Meta.BigNumbers.continueUnlockedTree(s);
    WIS.Core.Effects?.invalidate();return true;}
  function cultivationActionStatus(s,target=null){
    const current=s.cultivation?.active;
    if(!['immortal','martial'].includes(current))return 'unselected';
    if(s.activeChallenge||get(s)?.ringChallengeActive)return 'challenge';
    if(target!==null&&!['immortal','martial'].includes(target))return 'invalid-target';
    if(target===current)return 'same-system';
    return has(s,target===null?'C7-1':'C7-2')?'ready':'locked';
  }
  function prepareCultivationAction(s,target=null){
    if(cultivationActionStatus(s,target)!=='ready')return null;
    const S=WIS.Core.State,copy=S.cloneForSimulation(s),fresh=S.normalizeDomain(S.toSerializable(S.fresh())),current=s.cultivation.active;
    WIS.Cultivation.ExplorationProgress.ensure(fresh);
    // Copy historical fields verbatim, including their complete Amount tails.
    const retainResourceHistory=(next,old)=>{for(const [key,entry] of Object.entries(next||{}))for(const [field,value] of Object.entries(old?.[key]||{}))if(/^(total|spent|peak)(Residual|$)/.test(field))entry[field]=value;};
    for(const id of new Set([current,...(target===null?[]:[target])])){
      const old=copy.cultivation.systems[id],next=fresh.cultivation.systems[id];
      if(old.history)next.history=old.history;
      if(old.persistent)next.persistent=old.persistent;
      retainResourceHistory(next.resources,old.resources);
      if(id==='immortal'){
        const x=old.xiuzhen,n=next.xiuzhen;
        n.history=x.history;n.lifetimeHighestRealm=Math.max(x.lifetimeHighestRealm||0,x.highestRealm||0,x.realm||0,x.history?.realm||0);
        n.manaSpent=x.manaSpent;n.manaSpentResidual=x.manaSpentResidual;
        retainResourceHistory(n.resources,x.resources);
        copy.core.preferences.immortalAbilityAutomationEnabled=false;
        copy.core.preferences.immortalRealmAutomationEnabled=false;
      }
      copy.cultivation.systems[id]=next;
    }
    copy.cultivation.active=target??current;
    if(target==='immortal')WIS.Cultivation.ImmortalLogic.grantMahayanaReincarnationEffects(copy);
    // Retained treasures confer permanent qualifications; match load immediately.
    const cultivation=S.normalizeDomain(S.toSerializable(copy)).cultivation;
    const meta=target==='immortal'?{...s.meta,statistics:{...s.meta.statistics,immortalSelectionCount:s.immortalSelectionCount+1}}:s.meta;
    return {cultivation,preferences:copy.core.preferences,meta};
  }
  function changeCultivation(s,target=null){
    WIS.Core.Runtime.assertMutable();
    const prepared=prepareCultivationAction(s,target);if(!prepared)return false;
    // All potentially failing work finishes before either domain root is installed.
    s.cultivation=prepared.cultivation;s.core={...s.core,preferences:prepared.preferences};s.meta=prepared.meta;
    WIS.Core.Effects.invalidate();return true;
  }
  const ledgerTotal=n=>(n?.purchaseLedger||[]).reduce((v,e)=>B.add(v,e.pricePaid),B.BN(0));
  const invested=s=>amountModel()?amount().project(investedQuantity(s)):ledgerTotal(get(s));
  const completed=(s,id)=>(s.challengeCompletions?.[id]||0)>0;
  const rewardUnlocked=(s,id)=>C.challenges[id]?.rewardKey?get(s).challengeRewards?.[C.challenges[id].rewardKey]===true:WIS.Meta.Achievements.has(s,C.challenges[id]?.achievementKey);
  function tempoValue(s,table,prefix){const t=get(s)?.runElapsed||0;
    if(has(s,prefix+'1'))return table.online.floor+table.online.amplitude*Math.pow(2,-(t+(get(s)?.discardedRunElapsed||0))/table.online.halfLife);
    if(has(s,prefix+'2'))return table.steady;
    if(has(s,prefix+'3'))return table.offline.floor+table.offline.amplitude*(-Math.expm1(-Math.LN2*t/table.offline.halfLife));
    return prefix==='E2-'?1:0;}
  const tempoMultiplier=s=>B.BN((has(s,'E1')?C.quickMultiplier:1)*tempoValue(s,C.tempo,'E2-'));
  const dynamicTempo=s=>['E2-1','E2-3','E3-1','E3-3'].some(id=>has(s,id));
  function softcapWeakening(s,stage){const stages=WIS.Core.Config.scales,early=stages.findIndex(x=>x.name===stage)<=stages.findIndex(x=>x.name===C.earlyLastStage);
    const b=has(s,early?'B3-1':'B3-2')?C.softcapWeakening:0,e=tempoValue(s,C.softcapTempo,'E3-');return 1-(1-b)*(1-e);}
  function interpolate(softened,raw,w){if(w<=0)return softened;if(w>=1)return raw;if(B.lte(raw,0))return B.BN(0);if(B.lte(softened,0))return B.BN(0);
    return B.pow10(B.add(B.mul(B.log10(softened),1-w),B.mul(B.log10(raw),w)));}
  function fractalGainMultiplier(s,order){const N=WIS.Meta.BigNumbers;
    const A=WIS.Core.Amount,F=WIS.Core.AmountFormulas,whole=A?.enabled();
    const factor=i=>B.add(1,B.pow(whole?F.logOnePlusRatio(N.quantity(s,i)):B.log10(B.add(N.amount(s,i),C.fractalLogOffset)),C.fractalPower));
    let m=B.BN(rewardUnlocked(s,'trueG1')?C.fractalReward:1);
    if(order===0&&has(s,'C3'))m=B.mul(m,whole?F.power(A.add(1,WIS.Cultivation.Xiuzhen.quantity(s,'universeCoefficient')),4):B.pow(B.add(1,WIS.Cultivation.Xiuzhen.amount(s,'universeCoefficient')),4));
    if(order>0&&has(s,'D2-1'))m=B.mul(m,factor(order-1));
    if(s.activeChallenge==='trueG1')for(let i=0;i<order;i++)m=B.div(m,factor(i));return m;}
  const safeRank = value => typeof value==='number' && Number.isSafeInteger(value);
  const ranks=()=>WIS.Meta.BigNumbers, exact=()=>ranks().exactRanksEnabled();
  const projected=value=>exact()?ranks().rankProjection(value):B.BN(value);
  const rankOffset = (value,offset) => safeRank(value) ? Math.max(0,value-offset) : exact()?projected(ranks().rankOffsetValue(value,offset)):B.max(0,B.sub(value,offset));
  const challengeGExponent = g => safeRank(g) ? 1+C.gChallengeCoefficient*g : B.add(1,B.mul(C.gChallengeCoefficient,exact()?projected(g):g));
  // Historical pre-capacity save migration basis; current costs use gRequirement.
  function gBaseRequirement(s,g){
    const base=B.pow(C.gRequirement,s.activeChallenge==='trueGraham'?challengeGExponent(g):1);
    return rewardUnlocked(s,'trueGraham')?B.pow(base,C.gRewardExponent):base;
  }
  // Raw baseline includes challenge difficulty and the G64 capacity curve.
  // Modifiers then run in order: D6 subtraction/floor, D4 division, reward power.
  function gRequirementBeforeRank(s,g){
    const base=B.pow(C.gRequirement,s.activeChallenge==='trueGraham'?challengeGExponent(g):1);
    const capacity=B.pow(B.add(1,B.div(rankOffset(g,C.gCapacityStart),C.gCapacityDivisor)),C.gCapacityPower);
    return B.mul(base,capacity);
  }
  function gDivisorFactor(s){
    if(!has(s,'D4'))return B.ONE;const n=ranks().get(s),basis=n.rankBasis?.tree;
    if(!exact()||!basis)return B.pow(C.treeGBase,rankOffset(n.tree.rank,C.treeGStart));
    return {base:C.treeGBase,rank:ranks().rankOffsetValue(n.tree.rank,C.treeGStart),origin:ranks().rankOffsetValue(basis.originRank,C.treeGStart),anchor:B.pow(C.treeGBase,rankOffset(ranks().legacyRankProjection(basis.originRank),C.treeGStart))};
  }
  const gRequirementDivisor=s=>exact()?ranks().factorValue(gDivisorFactor(s)):has(s,'D4')?B.pow(C.treeGBase,rankOffset(ranks().get(s).tree.rank,C.treeGStart)):B.ONE;
  function gRequirementAfterRank(s,value){
    const divided=exact()?WIS.Core.RankMath.evaluatePowerRatio([value],[gDivisorFactor(s)]):B.div(value,gRequirementDivisor(s));
    return rewardUnlocked(s,'trueGraham')&&B.gt(divided,1)?B.pow(divided,C.gRewardExponent):divided;
  }
  function gRankPolynomial(s,g){
    if(B.lt(g,C.gCapacityStart)||s.activeChallenge==='trueGraham'||C.gCapacityPower!==2)return null;
    const h=C.gCapacityStart-C.gCapacityDivisor,a=B.sub(g,h);
    const length=B.div(B.mul(C.gCapacityDivisor,C.gCapacityDivisor),C.gRequirement);
    const offset=B.div(B.sub(a,length),length);
    return {constant:B.sub(B.mul(a,offset),h),linear:B.add(1,B.mul(2,offset)),quadratic:B.div(1,length)};
  }
  function gRequirement(s,g){
    const raw=gRequirementBeforeRank(s,g);
    const afterRank=has(s,'D6')?B.max(C.gRankMinimum,B.sub(raw,exact()?projected(g):g)):raw;
    return gRequirementAfterRank(s,afterRank);
  }
  function gSpeedMultiplier(s){
    if(!has(s,'D12'))return B.ONE;
    const N=WIS.Meta.BigNumbers,A=WIS.Core.Amount,F=WIS.Core.AmountFormulas,whole=A?.enabled();
    // The four lower stocks are sampled at the online step's start. Offline
    // captures this factor in the existing frozen G income, exactly once.
    // The fourth-arrow exposure integral stays in BigNumbers unchanged.
    return C.superFractalWeights.reduce((total,weight,order)=>{
      const log=whole?F.logOnePlusRatio(N.quantity(s,order)):B.log10(B.add(1,N.amount(s,order)));
      return B.add(total,B.mul(weight,log));
    },B.ONE);
  }
  const treeGainMultiplier=s=>B.mul(has(s,'D2-2')?WIS.Core.Amount?.enabled()?WIS.Core.AmountFormulas.power(WIS.Core.Amount.add(1,WIS.Core.Amount.divide(ranks().rankQuantity(ranks().get(s).gIndex),C.gTreeDivisor)),C.gTreePower):B.pow(B.add(1,B.div(exact()?projected(ranks().get(s).gIndex):ranks().get(s).gIndex,C.gTreeDivisor)),C.gTreePower):1,rewardUnlocked(s,'trueTree3')?C.treeReward:1);
  function effects(s){return [
    {id:'infinityJ',name:'无限节奏',group:'无限',target:'joules',layer:'regionMultiplier',value:tempoMultiplier(s)},
    {id:'infinityPower',name:'无限节奏',group:'无限',target:'power',layer:'regionMultiplier',value:tempoMultiplier(s)},
    {id:'infinityGoogol',name:'古戈尔适应',group:'无限',target:'googolPenalty',layer:'strengthMultiplier',value:has(s,'B4')?1-C.googolWeakening:1}
  ];}
  const isInfinityChallenge=id=>C.challenges[id]?.resetLevel==='infinity';
  const isChallengeActive=(s,id)=>id==='infinityRing'?get(s).ringChallengeActive===true:s.activeChallenge===id;
  function challengeEntryAllowed(s,id){const def=C.challenges[id],n=get(s);return isInfinityChallenge(id)&&n.unlocked&&n.upgradesUnlocked&&has(s,def.infinityUpgrade)&&!s.activeChallenge&&(id!=='infinityRing'||!isChallengeActive(s,id));}
  function recordChallengeReward(s,id){
    WIS.Core.Runtime.assertMutable();if(!isInfinityChallenge(id))throw Error('不是无限挑战');
    if(rewardUnlocked(s,id))return false;const n=get(s);s.meta.infinity={...n,challengeRewards:{...n.challengeRewards,[id]:true}};WIS.Core.Effects.invalidate();return true;
  }
  function rapidChallengeStepSeconds(s,seconds) {
    const remaining=C.fastSeconds-(s.activeChallengeElapsedSeconds+(s.meta.challenges.discardedElapsedSeconds||0)),cadence=WIS.Core.Config.fixedSettlement.discreteCadenceSeconds;
    return Math.min(seconds,cadence,remaining>1e-9?remaining:cadence);
  }
  function rapidPointMultiplier(s) {
    if(!rewardUnlocked(s,'infinityFast'))return B.ONE;
    if(amountModel()){
      const A=amount(),F=WIS.Core.AmountFormulas,stock=WIS.Meta.Treasures.quantity(s,'cosmicWill');
      return B.add(1,F.log10(A.add(C.fastLogOffset,F.log10(A.add(stock,C.fastStockOffset)))));
    }
    const stock=WIS.Meta.Treasures.count(s,'cosmicWill');
    return B.add(1,B.log10(B.add(C.fastLogOffset,B.log10(B.add(stock,C.fastStockOffset)))));
  }
  function previewRebirth(s,{respec=false,challengeKey=null}={},n=get(s)) {
    const rank=WIS.Meta.BigNumbers.get(s).tree.rank;
    let multiplier=B.BN(has(s,'B2')?C.pointMultiplier:1);
    multiplier=B.mul(B.mul(multiplier,rapidPointMultiplier(s)),WIS.Meta.Achievements.multiverseAchievementMultiplier(s,"infiniteMultiverse"));
    // The permanent curve uses this run's TREE rank. Infinity Power stays additive before multipliers.
    if(amountModel()){
      const A=amount(),Q=WIS.Core.RankBudget.Q,L=WIS.Core.AmountLedger,value=Q.fromRank(rank),base=WIS.Meta.Achievements.has(s,'seventhTree')?Q.add(Q.decimal(3),Q.divide(Q.multiply(Q.subtract(value,Q.decimal(3)),Q.subtract(value,Q.decimal(2))),Q.decimal(2))):value;
      const fullBase=A.fromParts(0,L.fromQ(base)),points=challengeKey==='infinityRing'||ranks().rankCompare(rank,C.minimumTree)<0?A.from(0):A.integerPart(A.multiply(A.add(fullBase,WIS.Meta.Achievements.has(s,'infinityPower')?3:0),multiplier));
      const earned=A.add(countQuantity(A.field(n,'totalPointsEarned')),points),candidateCap=has(s,'B1-1')?A.scale(earned,C.treasureCap):A.from(C.treasureCap),cap=A.compare(candidateCap,C.treasureCap)>=0?candidateCap:A.from(C.treasureCap),refund=respec?(n.purchaseLedger||[]).reduce((v,row)=>A.add(v,paidQuantity(row)),A.from(0)):A.from(0);
      return {allowed:challengeKey!=null?(!respec&&challengeEntryAllowed(s,challengeKey)):n.unlocked&&(respec?n.upgradesUnlocked:ranks().rankCompare(rank,C.minimumTree)>=0),points:A.project(points),cap:A.project(cap),refund:A.project(refund),quantities:{points,cap,refund},rebirthCount:n.rebirthCount};
    }
    let base;
    if(exact()&&!safeRank(rank)){
      const Q=WIS.Core.RankBudget.Q;const value=Q.fromRank(rank);
      base=Q.project(WIS.Meta.Achievements.has(s,'seventhTree')?Q.add(Q.decimal(3),Q.divide(Q.multiply(Q.subtract(value,Q.decimal(3)),Q.subtract(value,Q.decimal(2))),Q.decimal(2))):value);
    }else base=WIS.Meta.Achievements.has(s,'seventhTree')?B.add(3,B.div(B.mul(B.sub(rank,3),B.sub(rank,2)),2)):B.BN(rank);
    const points=challengeKey==='infinityRing'||ranks().rankCompare(rank,C.minimumTree)<0?B.BN(0):B.mul(B.add(base,WIS.Meta.Achievements.has(s,'infinityPower')?3:0),multiplier).floor();
    const earned=B.add(n.totalPointsEarned,points),cap=has(s,'B1-1')?B.max(C.treasureCap,B.mul(C.treasureCap,earned)):B.BN(C.treasureCap);
    return {allowed:challengeKey!=null?(!respec&&challengeEntryAllowed(s,challengeKey)):n.unlocked&&(respec?n.upgradesUnlocked:ranks().rankCompare(rank,C.minimumTree)>=0),points,cap,refund:respec?ledgerTotal(n):B.BN(0),rebirthCount:n.rebirthCount};
  }
  function silverSeaQuantityRate(s){const A=amount();if(!WIS.Meta.Achievements.has(s,'silverSea')||WIS.Meta.HighMultiverse.currentOrder(s)==='0')return A.from(0);const value=previewRebirth(s);return value.allowed?A.divide(value.quantities.points,100):A.from(0);}
  function silverSeaRate(s) {
    if(amountModel())return amount().project(silverSeaQuantityRate(s));
    if(!WIS.Meta.Achievements.has(s,'silverSea')||WIS.Meta.HighMultiverse.currentOrder(s)==='0')return B.ZERO;
    const v=previewRebirth(s);
    return v.allowed?B.div(v.points,100):B.ZERO;
  }
  function awardSilverSea(s,seconds,rate) {
    WIS.Core.Runtime.assertMutable();
    if(amountModel()){
      const A=amount(),time=A.from(seconds),source=A.from(rate),gain=A.multiply(time,source);if(A.compare(gain,0)===0)return B.ZERO;
      const n=get(s),total=A.add(fractionValue(n.silverSeaProgress),gain),whole=A.integerPart(total),rest=A.subtract(total,whole),next={...n,...A.fieldParts(countQuantity(A.add(quantity(s),whole)),'points'),...A.fieldParts(countQuantity(A.add(quantity(s,'totalPointsEarned'),whole)),'totalPointsEarned'),silverSeaProgress:fractionRecord(rest)};
      s.meta={...s.meta,infinity:next};return A.project(whole);
    }
    const dt=B.parseFinite(seconds),r=B.parseFinite(rate);
    if(!dt||!r||B.lt(dt,0)||B.lt(r,0))throw Error('银海收益参数无效');
    const gain=B.mul(r,dt);if(!B.isFiniteBN(gain))throw Error('银海收益无法表示');
    if(B.eq(gain,0))return B.ZERO;
    const n=get(s),L=WIS.Meta.TreasureLedger,p=normalizeSilverSeaProgress(n.silverSeaProgress);
    // Separate the integer gain before accumulating sub-point progress. Huge
    // income must not erase a saved fraction or require a huge-minus-one sum.
    let whole=gain.floor();
    const fraction=L.add([1,B.BN(p.remaining).neg(),p.carry],L.subtract([gain],[whole]));
    const crosses=L.compare(fraction,[1])>=0;
    const rest=crosses?L.subtract(fraction,[1]):fraction;
    if(L.sign(rest)<0||L.compare(rest,[1])>=0)throw Error('银海小数边界无法表示');
    if(crosses)whole=B.add(whole,1);
    const remaining=L.value(L.subtract([1],rest));
    const carry=L.value(L.subtract(rest,L.subtract([1],[remaining])));
    const next={...n,points:money(B.add(n.points,whole)),totalPointsEarned:money(B.add(n.totalPointsEarned,whole)),
      silverSeaProgress:{version:1,requirement:"1",remaining:String(remaining),carry:String(carry)}};
    s.meta={...s.meta,infinity:next};return whole;
  }
  function prepareRebirth(s,options={}) {
    WIS.Core.Runtime.assertMutable();const old=normalize(get(s),s.unlockedAchievements.tree3===true),v=previewRebirth(s,options,old);
    if(!v.allowed)throw Error('当前不能无限转生');
    if(options.expectedRebirthCount!=null&&options.expectedRebirthCount!==old.rebirthCount)throw Error('无限周目已改变');
    if(old.rebirthCount>=Number.MAX_SAFE_INTEGER)throw Error('无限转生次数超出安全范围');
    if(options.challengeKey==='infinityRing') {
      // An outer challenge must allow the inner system challenges needed for realm 7.
      const next=WIS.Core.State.fresh();
      next.unlockedAchievements={...s.unlockedAchievements};
      next.totalElapsedSeconds=s.totalElapsedSeconds;
      next.meta.highMultiverse=WIS.Meta.HighMultiverse.rebirthState(s);
      next.core.preferences={...s.core.preferences};
      next.core.runtime.randomState=s.core.runtime.randomState;
      // Keep the infinity economy together so retained upgrades remain valid and refundable.
      next.meta.infinity={...next.meta.infinity,unlocked:old.unlocked,upgradesUnlocked:old.upgradesUnlocked,
        points:old.points,totalPointsEarned:old.totalPointsEarned,...(amountModel()?{pointsResidual:old.pointsResidual.slice(),totalPointsEarnedResidual:old.totalPointsEarnedResidual.slice()}:{}),silverSeaProgress:old.silverSeaProgress,upgrades:old.upgrades,
        purchaseLedger:old.purchaseLedger,ringChallengeActive:true};
      return WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(next));
    }
    const challengeEntry=options.challengeKey!=null;
    const next=WIS.Core.Reset.apply('infinity',s,()=>WIS.Core.State.fresh(),{context:{infinityChallenge:challengeEntry}});
    const retained=!challengeEntry&&WIS.Core.Reset.preservesContent('infinity',s);
    if(!retained)for(const key of WIS.Meta.Treasures.keys){
      if(amountModel()){const A=amount(),stock=A.fromParts(0,WIS.Meta.TreasureLedger.stock(s,key)),kept=A.compare(stock,v.quantities.cap)<=0?stock:v.quantities.cap;WIS.Meta.TreasureLedger.write(next,key,A.words(kept),true);}
      else {const kept=B.min(WIS.Meta.Treasures.count(s,key),v.cap);WIS.Meta.TreasureLedger.write(next,key,[kept],true);}
    }
    if(has(s,'B1-2'))for(const key of C.retainedChallenges)next.challengeCompletions[key]=s.challengeCompletions[key]||0;
    for(const [id,keys] of Object.entries(C.retainedChallengeGroups))if(has(s,id))
      for(const key of keys)next.challengeCompletions[key]=s.challengeCompletions[key]||0;
    next.meta.infinity={...old,...(amountModel()?{...amount().fieldParts(amount().add(amount().field(old,'points'),v.quantities.points),'points'),...amount().fieldParts(amount().add(amount().field(old,'totalPointsEarned'),v.quantities.points),'totalPointsEarned')}:{points:B.add(old.points,v.points),totalPointsEarned:B.add(old.totalPointsEarned,v.points)}),rebirthCount:old.rebirthCount+1,unlocked:true,upgradesUnlocked:true,runElapsed:retained?old.runElapsed:0,discardedRunElapsed:retained?old.discardedRunElapsed:0};
    if(challengeEntry){next.activeChallenge=options.challengeKey;next.activeChallengeElapsedSeconds=0;next.meta.challenges.discardedElapsedSeconds=0;}
    if(options.respec){if(amountModel())Object.assign(next.meta.infinity,amount().fieldParts(amount().add(amount().field(next.meta.infinity,'points'),v.quantities.refund),'points'));else next.meta.infinity.points=B.add(next.meta.infinity.points,v.refund);next.meta.infinity.upgrades={};next.meta.infinity.purchaseLedger=[];}
    if(has(next,'C2') && next.cultivationAutomationTarget)
      WIS.Cultivation.ImmortalLogic.applyCultivationSelection(next,next.cultivationAutomationTarget==='immortal'?'仙道':'武道');
    // Old time and pending work belong to the old run. Runtime cancels their generations on install.
    if(!retained){const ledger=s.core.runtime.timeLedger;next.core.runtime.timeLedger={...WIS.Core.State.fresh().core.runtime.timeLedger,discardedClock:ledger.discardedClock,discardedGame:ledger.discardedGame,lastDiscard:ledger.lastDiscard};}
    if(!retained)next.core.runtime.compensation=WIS.Core.State.fresh().core.runtime.compensation;
    return WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(next));
  }
  function commitRebirth(options,host) {
    const original=host.getState(),next=prepareRebirth(original,options),snapshot=host.capture();
    if(host.getState()!==original)throw Error('无限转生起始状态已改变');
    try {host.cancel();host.install(next);host.save();}
    catch(error){host.restore(snapshot);throw error;}
    return next;
  }
  WIS.Meta.Infinity=Object.freeze({cultivationActionStatus,prepareCultivationAction,changeCultivation,fresh,normalize,get,quantity,investedQuantity,silverSeaQuantityRate,has,hasInfinityUpgrade:has,status,purchase,invested,previewRebirth,silverSeaRate,awardSilverSea,prepareRebirth,
    commitRebirth,completed,rewardUnlocked,isInfinityChallenge,isChallengeActive,challengeEntryAllowed,recordChallengeReward,rapidChallengeStepSeconds,rapidPointMultiplier,tempoMultiplier,dynamicTempo,softcapWeakening,interpolate,fractalGainMultiplier,gDivisorFactor,gBaseRequirement,gRequirementBeforeRank,gRequirementDivisor,gRequirementAfterRank,gRankPolynomial,gRequirement,gSpeedMultiplier,treeGainMultiplier,effects});
}(window.WIS));
