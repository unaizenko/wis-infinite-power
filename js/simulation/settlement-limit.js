(function defineSettlementLimit(WIS){
  'use strict';
  // Metadata only. Never evaluate sources, change RNG, or mutate input parts.
  function planDiscard(parts,{reservedClock=0,maxWaitingClock=0.1}={}){
    if(!Array.isArray(parts)||![reservedClock,maxWaitingClock].every(n=>Number.isFinite(n)&&n>=0))throw Error('结算时间限额无效');
    let remaining=reservedClock+maxWaitingClock,discardedClock=0,discardedGame=0;
    if(!Number.isFinite(remaining))throw Error('结算时间限额溢出');
    const keep=[],drop=[];
    for(const part of parts){
      if(!part||!['online','offline'].includes(part.source)||!Number.isFinite(part.clock)||part.clock<0||!Number.isFinite(part.speed)||part.speed<=0||!Number.isFinite(part.clock*part.speed))throw Error('待结算时间格式无效');
      const retained=Math.min(remaining,part.clock),lost=part.clock-retained;
      if(retained>0)keep.push({...part,clock:retained});
      if(lost>0){drop.push({...part,clock:lost});discardedClock+=lost;discardedGame+=lost*part.speed;}
      remaining=Math.max(0,remaining-retained);
    }
    if(!Number.isFinite(discardedClock)||!Number.isFinite(discardedGame))throw Error('舍弃时间累计溢出');
    return {keep,drop,discardedClock,discardedGame};
  }
  WIS.Simulation.SettlementLimit=Object.freeze({planDiscard,waitingClock:0.1,candidateTimeoutMs:2000,recoveryBudgetMs:100});
}(window.WIS));
