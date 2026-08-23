(function defineFormulaEngine(WIS) {
  "use strict";

  function effectValue(effect) {
    return typeof effect === "object" && effect !== null
      ? Number(effect.value) || 0
      : Number(effect) || 0;
  }

  function multiply(effects = []) {
    return effects.reduce((product, effect) => product * effectValue(effect), 1);
  }

  function applyExponent(value, exponent) {
    if (value <= 0) return 0;
    return Math.pow(value, exponent);
  }

  function applySoftcaps(value, softcaps = []) {
    return softcaps.reduce((current, softcap) => softcap(current), value);
  }

  function smoothPowerSoftcap(value, scale, earlyExponent, lateExponent, sharpness) {
    const numericValue = Number(value);
    const numericScale = Number(scale);
    const numericEarlyExponent = Number(earlyExponent);
    const numericLateExponent = Number(lateExponent);
    const numericSharpness = Number(sharpness);
    if (Number.isNaN(numericValue) || numericValue <= 0) return 0;
    if (!Number.isFinite(numericScale) || numericScale <= 0 ||
        !Number.isFinite(numericEarlyExponent) || numericEarlyExponent < 0 ||
        !Number.isFinite(numericLateExponent) || numericLateExponent < 0 ||
        !Number.isFinite(numericSharpness) || numericSharpness <= 0) return 0;
    if (numericValue === Infinity) {
      if (numericLateExponent > 0) return Infinity;
      return Math.pow(numericScale, numericEarlyExponent - numericLateExponent);
    }

    const logValue = Math.log(numericValue);
    const transitionLog = numericSharpness * (logValue - Math.log(numericScale));
    const smoothTransition = transitionLog > 50
      ? transitionLog
      : Math.log1p(Math.exp(transitionLog));
    const resultLog = numericEarlyExponent * logValue -
      ((numericEarlyExponent - numericLateExponent) / numericSharpness) * smoothTransition;
    if (resultLog >= Math.log(Number.MAX_VALUE)) return Infinity;
    if (resultLog <= Math.log(Number.MIN_VALUE)) return 0;
    return Math.exp(resultLog);
  }

  function diminishingMultiplierExponent(multiplier, coefficient) {
    const numericMultiplier = Number(multiplier);
    const numericCoefficient = Number(coefficient);
    if (Number.isNaN(numericMultiplier) || numericMultiplier <= 1) return 1;
    if (!Number.isFinite(numericCoefficient) || numericCoefficient <= 0) return 1;
    if (numericMultiplier === Infinity) return 0;
    return 1 / Math.sqrt(1 + numericCoefficient * Math.log10(1 + numericMultiplier));
  }

  function applyDiminishingMultiplier(multiplier, coefficient) {
    const numericMultiplier = Number(multiplier);
    if (Number.isNaN(numericMultiplier) || numericMultiplier <= 1) return 1;
    if (numericMultiplier === Infinity) return Infinity;
    return 1 + Math.pow(
      numericMultiplier - 1,
      diminishingMultiplierExponent(numericMultiplier, coefficient)
    );
  }

  function source({ base = 0, additive = 0, multipliers = [], exponents = [], softcaps = [] } = {}) {
    const multiplied = Math.max(0, base + additive) * multiply(multipliers);
    return applySoftcaps(applyExponent(multiplied, multiply(exponents)), softcaps);
  }

  function region(sourceGains, { multipliers = [], exponents = [], softcaps = [] } = {}) {
    const sourceSum = sourceGains.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const multiplied = sourceSum * multiply(multipliers);
    return applySoftcaps(applyExponent(multiplied, multiply(exponents)), softcaps);
  }

  WIS.Core.Formulas = Object.freeze({
    effectValue, multiply, applyExponent, applySoftcaps,
    smoothPowerSoftcap, diminishingMultiplierExponent, applyDiminishingMultiplier,
    source, region
  });
}(window.WIS));
