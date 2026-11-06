(function definePenalties(WIS) {
  "use strict";

  const CONFIG = WIS.Core.Config.googolPenalty;
  const { BN, ZERO, ONE, add, sub, mul, div, pow, pow10, log10, max, gt } = WIS.Core.BigNum;
  const RESOURCE_ALIASES = Object.freeze({ j: "joules", joules: "joules" });
  const thresholdLog10 = log10(CONFIG.threshold);

  function resourceKey(resource) {
    const key = String(resource || "");
    return RESOURCE_ALIASES[key] || key;
  }

  let preparedStrength=null;
  function prepareImmutableScope(currentState){
    const R=WIS.Core.Runtime;if(currentState===R.state)currentState=R.getState();if(!WIS.Core.Amount?.enabled()||!R.isEvaluating()||R.getState()!==currentState)throw Object.assign(Error('Penalty preparation needs its immutable evaluation owner'),{code:'amount-work-stale'});
    const policy=R.getMathPolicy(),strength=Object.freeze(BN(String(getGoogolPenaltyStrength(currentState))));
    return Object.freeze({run(callback){
      if(!R.isEvaluating()||R.getState()!==currentState||R.getMathPolicy()!==policy)throw Object.assign(Error('Prepared penalty owner changed'),{code:'amount-work-stale'});
      const previous=preparedStrength;preparedStrength={state:currentState,policy,strength};try{return callback();}finally{preparedStrength=previous;}
    }});
  }
  function getGoogolPenaltyStrength(currentState = WIS.Core.Runtime?.getState?.()) {
    if(currentState===WIS.Core.Runtime?.state)currentState=WIS.Core.Runtime.getState();
    if(preparedStrength?.state===currentState&&preparedStrength.policy===WIS.Core.Runtime.getMathPolicy())return preparedStrength.strength;
    const registeredMultiplier = typeof WIS.Core.Effects?.product === "function"
      ? WIS.Core.Effects.product("googolPenalty", "strengthMultiplier", currentState)
      : ONE;
    return max(ZERO, mul(CONFIG.defaultStrength, registeredMultiplier));
  }

  let leftBoundary=null;
  function withGoogolPenaltyLeftLimit(resource,amount,callback){
    const previous=leftBoundary;leftBoundary={resource:resourceKey(resource),amount:WIS.Core.Amount?.isAmount(amount)?WIS.Core.Amount.from(amount):BN(amount)};
    try{return callback();}finally{leftBoundary=previous;}
  }

  function googolPenaltyDetails(resource, currentAmount, currentState = WIS.Core.Runtime?.getState?.()) {
    const key = resourceKey(resource);
    const baseQ = CONFIG.resources[key];
    const strength = getGoogolPenaltyStrength(currentState);
    if (!baseQ) {
      return Object.freeze({ resource: key, baseQ: ONE, excess: ZERO, strength, highScaleStrength: ONE, multiplier: ONE, active: false });
    }
    const A=WIS.Core.Amount,whole=A?.isAmount(currentAmount)?A.from(currentAmount):null;
    const amount = whole?A.project(whole):max(ZERO, BN(currentAmount));
    const aboveThreshold = whole?A.compare(whole,CONFIG.threshold)>0:gt(amount, CONFIG.threshold);
    const amountLog10 = aboveThreshold ? whole?WIS.Core.AmountFormulas.log10(whole):log10(amount) : thresholdLog10;
    const excess = aboveThreshold ? whole?WIS.Core.AmountFormulas.logRatio(whole,CONFIG.threshold):max(ZERO, sub(amountLog10, thresholdLog10)) : ZERO;
    const delayed=WIS.Meta.Infinity?.has(currentState,'B6')===true;
    let penaltySteps=delayed?div(excess,10).floor():excess;
    let penaltyCount=null;
    if(delayed&&whole){
      const origin=thresholdLog10.toNumber();
      penaltyCount=WIS.Core.AmountFormulas.logarithmBucket(whole,origin,10);
      let count=BigInt(penaltyCount);
      if(leftBoundary?.resource===key&&A.compare(whole,leftBoundary.amount)===0&&
        A.compare(whole,'1e'+String(BigInt(origin)+10n*count))===0&&count>0n)count--;
      penaltySteps=BN(String(count));
    }else if(delayed && leftBoundary?.resource===key && (A?.isAmount(leftBoundary.amount)?A.compare(amount,leftBoundary.amount)===0:amount.eq(leftBoundary.amount)) &&
       div(excess,10).eq(penaltySteps))penaltySteps=max(ZERO,sub(penaltySteps,1));
    const evaluatedLog=delayed?add(thresholdLog10,mul(penaltySteps,10)):amountLog10;
    // B6 holds both the penalty count and high-scale strength until the next
    // full ten-order boundary. Other players retain the continuous formula.
    const highScaleStrength = aboveThreshold
      ? pow(CONFIG.highScaleBase, log10(div(evaluatedLog, thresholdLog10))) : ONE;
    const active = gt(penaltySteps, ZERO) && gt(strength, ZERO);
    const multiplier = active ? pow(baseQ, mul(mul(penaltySteps, strength), highScaleStrength)) : ONE;
    return Object.freeze({ resource: key, baseQ, excess, penaltySteps, ...(penaltyCount===null?{}:{penaltyCount}), strength, highScaleStrength, multiplier, active });
  }

  function nextGoogolPenaltyBoundary(resource,currentAmount,currentState) {
    if(!CONFIG.resources[resourceKey(resource)] || !WIS.Meta.Infinity?.has(currentState,'B6'))return null;
    const A=WIS.Core.Amount;
    if(A?.isAmount(currentAmount)){
      const amount=A.from(currentAmount),details=googolPenaltyDetails(resource,amount,currentState),origin=thresholdLog10.toNumber();
      return A.from('1e'+String(BigInt(origin)+10n*(BigInt(details.penaltyCount)+1n)));
    }
    const exponent=log10(max(CONFIG.threshold,currentAmount));
    const steps=div(max(ZERO,sub(exponent,thresholdLog10)),10).floor();
    const boundary=pow10(add(thresholdLog10,mul(add(steps,1),10)));
    return gt(boundary,currentAmount)?boundary:null;
  }

  function googolPenaltyMultiplier(resource, currentAmount, currentState) {
    return googolPenaltyDetails(resource, currentAmount, currentState).multiplier;
  }

  function applyGoogolPenalty(resource, currentAmount, automaticRate, currentState) {
    const A=WIS.Core.Amount;if(A?.isAmount(automaticRate)){
      const key=resourceKey(resource),rate=A.from(automaticRate),same=!A.isAmount(currentAmount)&&currentState&&WIS.Core.BigNum.eq(currentAmount,currentState[key]),stock=A.isAmount(currentAmount)?A.from(currentAmount):same?WIS.Simulation.ResourceGroups.readExact(currentState,key):A.from(currentAmount),factor=googolPenaltyMultiplier(resource,stock,currentState);
      return factor.eq(1)?rate:A.from(WIS.Core.AmountFormulas.productQuotient([rate,factor],[]));
    }
    return mul(max(ZERO, BN(automaticRate)), googolPenaltyMultiplier(resource, currentAmount, currentState));
  }

  WIS.Core.Penalties = Object.freeze({
    GOOGOL_PENALTY: "googolPenalty",
    withGoogolPenaltyLeftLimit,prepareImmutableScope,
    getGoogolPenaltyStrength,
    googolPenaltyDetails,
    nextGoogolPenaltyBoundary,
    googolPenaltyMultiplier,
    applyGoogolPenalty
  });
}(window.WIS));
