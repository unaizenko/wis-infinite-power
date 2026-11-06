(function (WIS) {
  "use strict";
  // Local exact exponent factors, not a global symbolic resource evaluator.
  // Admitted with rank consumers and immutable Schema74 save bases.
  const B = WIS.Core.BigNum, L = WIS.Core.SignedLedger, R = WIS.Core.Rank;
  const MAX_DIGITS = 2048;
  const abs = n => n < 0n ? -n : n;
  const fail = message => { throw Object.assign(new Error(message), { code: "rank-cost-unresolved" }); };
  const gcd = (a, b) => { a = abs(a); b = abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
  function checked(n) {
    if (abs(n).toString().length > MAX_DIGITS) fail("局部阶位幂超过精确容量");
    return n;
  }
  function fraction(n, d) {
    if (d <= 0n) fail("局部阶位幂分母无效");
    const g = gcd(n, d);
    return { n: checked(n / g), d: checked(d / g) };
  }
  function product(a, b) {
    const g = gcd(a.n, b.d), h = gcd(b.n, a.d);
    return fraction((a.n / g) * (b.n / h), (a.d / h) * (b.d / g));
  }
  function parseBase(base) {
    const parsed = B.parseFinite(base), text = typeof base === "string" ? base.trim() : String(base);
    if (!parsed || parsed.lte(0) || text.length > MAX_DIGITS) fail("局部阶位幂底数必须是有限正十进制数");
    const m = /^\+?(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
    if (!m) fail("局部阶位幂底数格式未认证");
    const n = BigInt(m[1] + (m[2] || "")), e = BigInt(m[3] || 0) - BigInt((m[2] || "").length);
    if (abs(e) > BigInt(MAX_DIGITS)) fail("局部阶位幂底数超过容量");
    return e >= 0n ? fraction(n * 10n ** e, 1n) : fraction(n, 10n ** -e);
  }
  function denseInteger(words) {
    let total = 0n;
    for (const raw of words) {
      const m = /^(-?\d+)e([+-]?\d+)$/.exec(raw);
      if (!m) fail("局部阶位差尚未取得精确整数表达");
      const e = BigInt(m[2]);
      if (e < 0n || e + BigInt(m[1].replace("-", "").length) > BigInt(MAX_DIGITS)) fail("局部阶位差超过容量");
      total = checked(total + BigInt(m[1]) * 10n ** e);
    }
    return total;
  }
  function signedInteger(words) {
    // R.add requires a nonnegative total; validate signed deltas through two
    // nonnegative accumulators, then cancel before any dense expansion.
    if (!Array.isArray(words) || words.length > R.limits.terms) fail("局部阶位差格式无效");
    const positive = [], negative = [];
    for (const word of words) {
      if (typeof word !== "string") fail("局部阶位差整数项无效");
      if (word.startsWith("-")) negative.push(word.slice(1)); else positive.push(word);
    }
    const p = R.add(0, positive), n = R.add(0, negative);
    return denseInteger(R.difference(p, n));
  }
  function power(base, k) {
    let { n, d } = base;
    if (k < 0n) { [n, d] = [d, n]; k = -k; }
    if (k === 0n || n === d) return { n: 1n, d: 1n };
    const bits = Math.max(n.toString(2).length, d.toString(2).length);
    if (k > BigInt(MAX_DIGITS * 4) / BigInt(bits)) fail("局部阶位幂证明超过容量");
    return fraction(checked(n ** k), checked(d ** k));
  }
  function guarded(fn) {
    try { return fn(); } catch (error) {
      if (error.code === "rank-cost-unresolved") throw error;
      if (error instanceof L.LedgerError || error instanceof R.RankError) fail(error.message);
      throw error;
    }
  }
  const view = value => B.div(L.project(String(value.n)), L.project(String(value.d)));
  const exactPower = (base, deltaWords) => guarded(() => {
    const value = power(parseBase(base), signedInteger(deltaWords));
    return { numerator: String(value.n), denominator: String(value.d) };
  });
  const relativePower = (base, from, to) => guarded(() => view(power(parseBase(base), denseInteger(R.difference(to, from)))));
  function evaluatePowerRatio(numerators, denominators) {
    return guarded(() => {
      if (!Array.isArray(numerators) || !Array.isArray(denominators) || numerators.length + denominators.length > R.limits.terms) fail("阶位因子数量或格式无效");
      const constants = [[], []], groups = new Map();
      for (const [side, factors] of [[0, numerators], [1, denominators]]) for (const factor of factors) {
        if (factor && typeof factor === "object" && !B.isDecimal(factor)) {
          const keys = ["base", "rank", "origin", "anchor"];
          if (keys.some(k => !Object.prototype.hasOwnProperty.call(factor, k)) || Object.keys(factor).some(k => !keys.includes(k))) fail("阶位幂因子字段无效");
          const base = parseBase(factor.base), anchor = B.parseFinite(factor.anchor), key = String(base.n) + "/" + String(base.d);
          if (!anchor || anchor.lte(0)) fail("阶位幂原单位必须为有限正数");
          constants[side].push(anchor);
          let delta = R.difference(factor.rank, factor.origin);
          if (side) delta = L.negate(delta);
          const previous = groups.get(key);
          groups.set(key, { base, delta: L.strict.add(previous ? previous.delta : [], delta) });
        } else {
          const value = B.parseFinite(factor);
          if (!value || value.lt(0) || (side && value.eq(0))) fail("阶位比值常数无效");
          constants[side].push(value);
        }
      }
      // Apply the same canonical rational local factor after the authoritative
      // represented anchors have been normalized. Never subtract huge logs.
      let local = { n: 1n, d: 1n };
      for (const key of [...groups.keys()].sort()) {
        const item = groups.get(key);
        local = product(local, power(item.base, denseInteger(item.delta)));
      }
      return B.mul(WIS.Core.StableProductQuotient.evaluate(constants[0], constants[1]), view(local));
    });
  }
  WIS.Core.RankMath = Object.freeze({ integerDifference:(from,to)=>guarded(()=>String(denseInteger(R.difference(to,from)))), exactPower, relativePower, evaluatePowerRatio,
    limits: Object.freeze({ digits: MAX_DIGITS, factors: R.limits.terms }) });
}(window.WIS));
