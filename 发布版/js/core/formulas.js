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

  function source({ base = 0, additive = 0, multipliers = [], exponents = [], softcaps = [] } = {}) {
    const multiplied = Math.max(0, base + additive) * multiply(multipliers);
    return applySoftcaps(applyExponent(multiplied, multiply(exponents)), softcaps);
  }

  function region(sourceGains, { multipliers = [], exponents = [], softcaps = [] } = {}) {
    const sourceSum = sourceGains.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const multiplied = sourceSum * multiply(multipliers);
    return applySoftcaps(applyExponent(multiplied, multiply(exponents)), softcaps);
  }

  WIS.Core.Formulas = Object.freeze({ effectValue, multiply, applyExponent, applySoftcaps, source, region });
}(window.WIS));
