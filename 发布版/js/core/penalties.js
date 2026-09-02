(function definePenalties(WIS) {
  "use strict";

  const CONFIG = WIS.Core.Config.googolPenalty;
  const { BN, ZERO, ONE, sub, mul, pow, log10, max, gt } = WIS.Core.BigNum;
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

  function googolPenaltyDetails(resource, currentAmount, currentState = WIS.Core.Runtime?.getState?.()) {
    const key = resourceKey(resource);
    const baseQ = CONFIG.resources[key];
    const strength = getGoogolPenaltyStrength(currentState);
    if (!baseQ) {
      return Object.freeze({ resource: key, baseQ: ONE, excess: ZERO, strength, multiplier: ONE, active: false });
    }
    const amount = max(ZERO, BN(currentAmount));
    const excess = gt(amount, CONFIG.threshold)
      ? max(ZERO, sub(log10(amount), thresholdLog10))
      : ZERO;
    const active = gt(excess, ZERO) && gt(strength, ZERO);
    const multiplier = active ? pow(baseQ, mul(excess, strength)) : ONE;
    return Object.freeze({ resource: key, baseQ, excess, strength, multiplier, active });
  }

  function googolPenaltyMultiplier(resource, currentAmount, currentState) {
    return googolPenaltyDetails(resource, currentAmount, currentState).multiplier;
  }

  function applyGoogolPenalty(resource, currentAmount, automaticRate, currentState) {
    return mul(max(ZERO, BN(automaticRate)), googolPenaltyMultiplier(resource, currentAmount, currentState));
  }

  WIS.Core.Penalties = Object.freeze({
    GOOGOL_PENALTY: "googolPenalty",
    getGoogolPenaltyStrength,
    googolPenaltyDetails,
    googolPenaltyMultiplier,
    applyGoogolPenalty
  });
}(window.WIS));
