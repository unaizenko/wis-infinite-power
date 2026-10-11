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

  function getGoogolPenaltyStrength(currentState = WIS.Core.Runtime?.getState?.()) {
    const registeredMultiplier = typeof WIS.Core.Effects?.product === "function"
      ? WIS.Core.Effects.product("googolPenalty", "strengthMultiplier", currentState)
      : ONE;
    return max(ZERO, mul(CONFIG.defaultStrength, registeredMultiplier));
  }

  let leftBoundary=null;
  function withGoogolPenaltyLeftLimit(resource,amount,callback){
    const previous=leftBoundary;leftBoundary={resource:resourceKey(resource),amount:BN(amount)};
    try{return callback();}finally{leftBoundary=previous;}
  }

  function googolPenaltyDetails(resource, currentAmount, currentState = WIS.Core.Runtime?.getState?.()) {
    const key = resourceKey(resource);
    const baseQ = CONFIG.resources[key];
    const strength = getGoogolPenaltyStrength(currentState);
    if (!baseQ) {
      return Object.freeze({ resource: key, baseQ: ONE, excess: ZERO, strength, highScaleStrength: ONE, multiplier: ONE, active: false });
    }
    const amount = max(ZERO, BN(currentAmount));
    const aboveThreshold = gt(amount, CONFIG.threshold);
    const amountLog10 = aboveThreshold ? log10(amount) : thresholdLog10;
    const excess = aboveThreshold ? max(ZERO, sub(amountLog10, thresholdLog10)) : ZERO;
    const delayed=WIS.Meta.Infinity?.has(currentState,'B6')===true;
    let penaltySteps=delayed?div(excess,10).floor():excess;
    if(delayed && leftBoundary?.resource===key && amount.eq(leftBoundary.amount) &&
       div(excess,10).eq(penaltySteps))penaltySteps=max(ZERO,sub(penaltySteps,1));
    const evaluatedLog=delayed?add(thresholdLog10,mul(penaltySteps,10)):amountLog10;
    // B6 holds both the penalty count and high-scale strength until the next
    // full ten-order boundary. Other players retain the continuous formula.
    const highScaleStrength = aboveThreshold
      ? pow(CONFIG.highScaleBase, log10(div(evaluatedLog, thresholdLog10))) : ONE;
    const active = gt(penaltySteps, ZERO) && gt(strength, ZERO);
    const multiplier = active ? pow(baseQ, mul(mul(penaltySteps, strength), highScaleStrength)) : ONE;
    return Object.freeze({ resource: key, baseQ, excess, penaltySteps, strength, highScaleStrength, multiplier, active });
  }

  function nextGoogolPenaltyBoundary(resource,currentAmount,currentState) {
    if(!CONFIG.resources[resourceKey(resource)] || !WIS.Meta.Infinity?.has(currentState,'B6'))return null;
    const exponent=log10(max(CONFIG.threshold,currentAmount));
    const steps=div(max(ZERO,sub(exponent,thresholdLog10)),10).floor();
    const boundary=pow10(add(thresholdLog10,mul(add(steps,1),10)));
    return gt(boundary,currentAmount)?boundary:null;
  }

  function googolPenaltyMultiplier(resource, currentAmount, currentState) {
    return googolPenaltyDetails(resource, currentAmount, currentState).multiplier;
  }

  function applyGoogolPenalty(resource, currentAmount, automaticRate, currentState) {
    return mul(max(ZERO, BN(automaticRate)), googolPenaltyMultiplier(resource, currentAmount, currentState));
  }

  WIS.Core.Penalties = Object.freeze({
    GOOGOL_PENALTY: "googolPenalty",
    withGoogolPenaltyLeftLimit,
    getGoogolPenaltyStrength,
    googolPenaltyDetails,
    nextGoogolPenaltyBoundary,
    googolPenaltyMultiplier,
    applyGoogolPenalty
  });
}(window.WIS));
