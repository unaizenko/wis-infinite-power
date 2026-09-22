(function defineInfinity(WIS) {
  'use strict';
  const B=WIS.Core.BigNum,C=WIS.Meta.InfinityConfig;
  const fresh=()=>({version:1,points:B.BN(0),totalPointsEarned:B.BN(0),rebirthCount:0,unlocked:false,upgradesUnlocked:false,upgrades:{},purchaseLedger:[],runElapsed:0});
  function money(v) {const x=B.parseFinite(v??0);if(!x||x.lt(0)||!x.eq(x.floor()))throw Error('无限点数/支付记录必须为非负整数');return x;}
  function normalize(raw,achievement=false) {
    const n=fresh();if(raw!=null&&(typeof raw!=='object'||Array.isArray(raw)))throw Error('无限状态无效');
    if(raw?.version!=null&&raw.version!==1)throw Error('无限状态版本无效');
    if(raw?.version===1){
      n.points=money(raw.points);n.totalPointsEarned=money(raw.totalPointsEarned);
      if(!Number.isSafeInteger(raw.rebirthCount)||raw.rebirthCount<0)throw Error('无限转生次数无效');
      if(!Number.isFinite(raw.runElapsed)||raw.runElapsed<0)throw Error('无限周目时间无效');
      n.rebirthCount=raw.rebirthCount;n.runElapsed=raw.runElapsed;
      if(!raw.upgrades||typeof raw.upgrades!=='object'||Array.isArray(raw.upgrades)||!Array.isArray(raw.purchaseLedger))throw Error('无限强化记录无效');
      for(const [id,v] of Object.entries(raw.upgrades)){if(!C.nodes[id]||v!==true)throw Error('未知无限强化');n.upgrades[id]=true;}
      const paid=new Set();n.purchaseLedger=raw.purchaseLedger.map(e=>{
        if(!e||!n.upgrades[e.nodeId]||paid.has(e.nodeId))throw Error('无限付款记录不匹配');paid.add(e.nodeId);return {nodeId:e.nodeId,pricePaid:money(e.pricePaid)};
      });
      if(paid.size!==Object.keys(n.upgrades).length)throw Error('无限强化缺少实际付款记录');
      for(const id of paid){const node=C.nodes[id];if(!prerequisites(n,node))throw Error('无限强化前置不满足');
        if(node.exclusiveGroup&&Object.values(C.nodes).some(o=>o.id!==id&&o.exclusiveGroup===node.exclusiveGroup&&n.upgrades[o.id]))throw Error('无限强化路线互斥');}
    }
    n.unlocked=achievement||raw?.unlocked===true||n.rebirthCount>0;
    n.upgradesUnlocked=raw?.version===1&&(raw.upgradesUnlocked===true||n.rebirthCount>0);
    return n;
  }
  const get=s=>s.meta.infinity;
  const has=(s,id)=>get(s)?.upgrades?.[id]===true;
  function prerequisites(n,node){return node.prerequisiteMode==='any'?node.prerequisites.some(id=>n.upgrades[id]):node.prerequisites.every(id=>n.upgrades[id]);}
  function status(s,id){const node=C.nodes[id],n=get(s);if(!node||!n?.upgradesUnlocked)return 'prerequisite';if(has(s,id))return 'purchased';
    if(node.exclusiveGroup&&Object.values(C.nodes).some(o=>o.id!==id&&o.exclusiveGroup===node.exclusiveGroup&&has(s,o.id)))return 'exclusive';
    if(!prerequisites(n,node))return 'prerequisite';return B.gte(n.points,node.price)?'available':'unaffordable';}
  function purchase(s,id){WIS.Core.Runtime.assertMutable();if(status(s,id)!=='available')return false;const n=get(s),price=money(C.nodes[id].price);
    // Settlement candidates validate domain root identity before publishing.
    s.meta={...s.meta,infinity:{...n,points:B.sub(n.points,price),upgrades:{...n.upgrades,[id]:true},purchaseLedger:[...n.purchaseLedger,{nodeId:id,pricePaid:price}]}};WIS.Core.Effects?.invalidate();return true;}
  const invested=s=>(get(s)?.purchaseLedger||[]).reduce((v,e)=>B.add(v,e.pricePaid),B.BN(0));
  const completed=(s,id)=>(s.challengeCompletions?.[id]||0)>0;
  function tempoValue(s,table,prefix){const t=get(s)?.runElapsed||0;
    if(has(s,prefix+'1'))return table.online.floor+table.online.amplitude*Math.pow(2,-t/table.online.halfLife);
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
    const factor=i=>B.add(1,B.pow(B.log10(B.add(N.amount(s,i),C.fractalLogOffset)),C.fractalPower));
    let m=B.BN(completed(s,'trueG1')?C.fractalReward:1);
    if(order>0&&has(s,'D2-1'))m=B.mul(m,factor(order-1));
    if(s.activeChallenge==='trueG1')for(let i=0;i<order;i++)m=B.div(m,factor(i));return m;}
  function gRequirement(s,g){return B.pow(C.gRequirement,s.activeChallenge==='trueGraham'?1+C.gChallengeCoefficient*g:(!s.activeChallenge&&completed(s,'trueGraham')?C.gRewardExponent:1));}
  const gSpeedMultiplier=s=>has(s,'D4')?B.pow(C.treeGBase,Math.max(0,WIS.Meta.BigNumbers.get(s).tree.rank-C.treeGStart)):B.BN(1);
  const treeGainMultiplier=s=>B.mul(has(s,'D2-2')?B.pow(B.add(1,B.div(WIS.Meta.BigNumbers.get(s).gIndex,C.gTreeDivisor)),C.gTreePower):1,completed(s,'trueTree3')?C.treeReward:1);
  function effects(s){return [
    {id:'infinityJ',name:'无限节奏',group:'无限',target:'joules',layer:'regionMultiplier',value:tempoMultiplier(s)},
    {id:'infinityPower',name:'无限节奏',group:'无限',target:'power',layer:'regionMultiplier',value:tempoMultiplier(s)},
    {id:'infinityGoogol',name:'古戈尔适应',group:'无限',target:'googolPenalty',layer:'strengthMultiplier',value:has(s,'B4')?1-C.googolWeakening:1}
  ];}
  function previewRebirth(s,{respec=false}={}) {
    const n=get(s),rank=WIS.Meta.BigNumbers.get(s).tree.rank;
    let multiplier=B.BN(has(s,'B2')?C.pointMultiplier:1);
    if((s.challengeCompletions.infinityFast||0)>0){const stock=WIS.Meta.Treasures.count(s,'cosmicWill');
      multiplier=B.mul(multiplier,B.add(1,B.log10(B.add(C.fastLogOffset,B.log10(B.add(stock,C.fastStockOffset))))));}
    const points=rank<C.minimumTree?B.BN(0):B.mul(rank,multiplier).floor();
    const earned=B.add(n.totalPointsEarned,points),cap=has(s,'B1-1')?B.max(C.treasureCap,B.mul(C.treasureCap,earned)):B.BN(C.treasureCap);
    return {allowed:n.unlocked&&(respec?n.upgradesUnlocked:rank>=C.minimumTree),points,cap,refund:respec?invested(s):B.BN(0),rebirthCount:n.rebirthCount};
  }
  function prepareRebirth(s,options={}) {
    WIS.Core.Runtime.assertMutable();const old=normalize(get(s),s.unlockedAchievements.tree3===true),v=previewRebirth(s,options);
    if(!v.allowed)throw Error('当前不能无限转生');
    if(options.expectedRebirthCount!=null&&options.expectedRebirthCount!==old.rebirthCount)throw Error('无限周目已改变');
    if(old.rebirthCount>=Number.MAX_SAFE_INTEGER)throw Error('无限转生次数超出安全范围');
    const next=WIS.Core.Reset.apply('infinity',s,()=>WIS.Core.State.fresh());
    for(const key of WIS.Meta.Treasures.keys){const amount=B.min(WIS.Meta.Treasures.count(s,key),v.cap);WIS.Meta.TreasureLedger.write(next,key,[amount],true);}
    if(has(s,'B1-2'))for(const key of C.retainedChallenges)next.challengeCompletions[key]=s.challengeCompletions[key]||0;
    next.meta.infinity={...old,points:B.add(old.points,v.points),totalPointsEarned:B.add(old.totalPointsEarned,v.points),rebirthCount:old.rebirthCount+1,unlocked:true,upgradesUnlocked:true,runElapsed:0};
    if(options.respec){next.meta.infinity.points=B.add(next.meta.infinity.points,v.refund);next.meta.infinity.upgrades={};next.meta.infinity.purchaseLedger=[];}
    // Old time and pending work belong to the old run. Runtime cancels their generations on install.
    next.core.runtime.timeLedger=WIS.Core.State.fresh().core.runtime.timeLedger;
    next.core.runtime.compensation=WIS.Core.State.fresh().core.runtime.compensation;
    return WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(next));
  }
  function commitRebirth(options,host) {
    const original=host.getState(),next=prepareRebirth(original,options),snapshot=host.capture();
    if(host.getState()!==original)throw Error('无限转生起始状态已改变');
    try {host.cancel();host.install(next);host.save();}
    catch(error){host.restore(snapshot);throw error;}
    return next;
  }
  WIS.Meta.Infinity=Object.freeze({fresh,normalize,get,has,hasInfinityUpgrade:has,status,purchase,invested,previewRebirth,prepareRebirth,
    commitRebirth,completed,tempoMultiplier,dynamicTempo,softcapWeakening,interpolate,fractalGainMultiplier,gRequirement,gSpeedMultiplier,treeGainMultiplier,effects});
}(window.WIS));
