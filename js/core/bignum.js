(function defineBigNumberAdapter(WIS, Decimal) {
  "use strict";

  if (typeof Decimal !== "function") throw new Error("break_eternity.js 未加载");

  const ZERO = Object.freeze(new Decimal(0));
  const ONE = Object.freeze(new Decimal(1));
  const TEN = Object.freeze(new Decimal(10));

  function BN(value = 0) {
    if (value instanceof Decimal) return value;
    if (value === null || value === undefined || value === "") return new Decimal(0);
    try {
      const result = new Decimal(value);
      return result.isFinite() && !result.isNan() ? result : new Decimal(0);
    } catch {
      return new Decimal(0);
    }
  }

  function isDecimal(value) { return value instanceof Decimal; }
  function add(a, b) { return BN(a).add(b); }
  function sub(a, b) { return BN(a).sub(b); }
  function mul(a, b) { return BN(a).mul(b); }
  function div(a, b) { return BN(a).div(b); }
  function pow(a, b) { return BN(a).pow(b); }
  function pow10(exponent) { return TEN.pow(exponent); }
  function sqrt(value) { return BN(value).sqrt(); }
  function log10(value) { return BN(value).log10(); }
  function max(a, b) { return BN(a).max(b); }
  function min(a, b) { return BN(a).min(b); }
  function abs(value) { return BN(value).abs(); }
  function gt(a, b) { return BN(a).gt(b); }
  function gte(a, b) { return BN(a).gte(b); }
  function lt(a, b) { return BN(a).lt(b); }
  function lte(a, b) { return BN(a).lte(b); }
  function eq(a, b) { return BN(a).eq(b); }
  function isFiniteBN(value) {
    try {
      const result = value instanceof Decimal ? value : new Decimal(value);
      return result.isFinite() && !result.isNan();
    } catch {
      return false;
    }
  }
  function isNaNBN(value) {
    if (value instanceof Decimal) return value.isNan();
    try { return new Decimal(value).isNan(); } catch { return true; }
  }
  function clamp(value, lower = ZERO, upper = null) {
    const bounded = max(value, lower);
    return upper === null || upper === undefined ? bounded : min(bounded, upper);
  }
  function clampMin(value, lower = ZERO) { return max(value, lower); }
  function clampMax(value, upper = ONE) { return min(value, upper); }
  function sum(values, initial = ZERO) { return values.reduce((total, value) => add(total, value), BN(initial)); }
  function product(values, initial = ONE) { return values.reduce((total, value) => mul(total, value), BN(initial)); }
  function toNumber(value, fallback = 0) {
    const result = BN(value).toNumber();
    return Number.isFinite(result) ? result : fallback;
  }
  function toString(value) { return BN(value).toString(); }
  function serialize(value) { return BN(value).toString(); }

  WIS.Core.BigNum = Object.freeze({
    Decimal, ZERO, ONE, TEN,
    BN, isDecimal, add, sub, mul, div, pow, pow10, sqrt, log10,
    max, min, abs, gt, gte, lt, lte, eq,
    isFiniteBN, isNaNBN, clamp, clampMin, clampMax, sum, product,
    toNumber, toString, serialize
  });
}(window.WIS, window.Decimal));
