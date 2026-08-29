(function defineFormulaEngine(WIS) {
  "use strict";

  const {
    BN, ZERO, ONE, isDecimal, add, sub, mul, div, pow, sqrt, log10,
    max, gt, lte, isFiniteBN, isNaNBN, sum, product, toNumber
  } = WIS.Core.BigNum;

  function effectValue(effect) {
    const value = BN(!isDecimal(effect) && typeof effect === "object" && effect !== null ? effect.value : effect);
    return isFiniteBN(value) && !isNaNBN(value) ? value : ZERO;
  }

  function multiply(effects = []) {
    return product(effects.map(effectValue), ONE);
  }

  function applyExponent(value, exponent) {
    if (lte(value, ZERO)) return ZERO;
    return pow(value, toNumber(exponent, 0));
  }

  function applySoftcaps(value, softcaps = []) {
    return softcaps.reduce((current, softcap) => softcap(current), value);
  }

  function smoothPowerSoftcap(value, scale, earlyExponent, lateExponent, sharpness) {
    const decimalValue = BN(value);
    const decimalScale = BN(scale);
    const numericEarlyExponent = Number(earlyExponent);
    const numericLateExponent = Number(lateExponent);
    const numericSharpness = Number(sharpness);
    if (isNaNBN(decimalValue) || lte(decimalValue, ZERO)) return ZERO;
    if (!isFiniteBN(decimalScale) || lte(decimalScale, ZERO) ||
        !Number.isFinite(numericEarlyExponent) || numericEarlyExponent < 0 ||
        !Number.isFinite(numericLateExponent) || numericLateExponent < 0 ||
        !Number.isFinite(numericSharpness) || numericSharpness <= 0) return ZERO;

    const transition = add(ONE, pow(div(decimalValue, decimalScale), numericSharpness));
    return div(
      pow(decimalValue, numericEarlyExponent),
      pow(transition, (numericEarlyExponent - numericLateExponent) / numericSharpness)
    );
  }

  function diminishingMultiplierExponent(multiplier, coefficient) {
    const decimalMultiplier = BN(multiplier);
    const numericCoefficient = Number(coefficient);
    if (isNaNBN(decimalMultiplier) || lte(decimalMultiplier, ONE)) return 1;
    if (!Number.isFinite(numericCoefficient) || numericCoefficient <= 0) return 1;
    const logarithm = toNumber(log10(add(ONE, decimalMultiplier)), Infinity);
    if (!Number.isFinite(logarithm)) return 0;
    return 1 / Math.sqrt(1 + numericCoefficient * logarithm);
  }

  function applyDiminishingMultiplier(multiplier, coefficient) {
    const decimalMultiplier = BN(multiplier);
    if (isNaNBN(decimalMultiplier) || lte(decimalMultiplier, ONE)) return ONE;
    return add(ONE, pow(
      sub(decimalMultiplier, ONE),
      diminishingMultiplierExponent(decimalMultiplier, coefficient)
    ));
  }

  function source({ base = 0, additive = 0, multipliers = [], exponents = [], softcaps = [] } = {}) {
    const multiplied = mul(max(ZERO, add(base, additive)), multiply(multipliers));
    return applySoftcaps(applyExponent(multiplied, multiply(exponents)), softcaps);
  }

  function region(sourceGains, { multipliers = [], exponents = [], softcaps = [] } = {}) {
    const sourceSum = sum(sourceGains.map((value) => max(ZERO, value)), ZERO);
    const multiplied = mul(sourceSum, multiply(multipliers));
    return applySoftcaps(applyExponent(multiplied, multiply(exponents)), softcaps);
  }

  WIS.Core.Formulas = Object.freeze({
    effectValue, multiply, applyExponent, applySoftcaps,
    smoothPowerSoftcap, diminishingMultiplierExponent, applyDiminishingMultiplier,
    source, region
  });
}(window.WIS));
