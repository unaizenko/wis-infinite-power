(function (WIS) {
  "use strict";
  // Exact integer rank foundation for the admitted Schema74 runtime.
  const B = WIS.Core.BigNum, L = WIS.Core.SignedLedger;
  const MAX_TERMS = 128, MAX_WORD = 4096, MAX_COUNT = 2048;
  const KIND = "wis-rank", VERSION = 1;
  class RankError extends Error {
    constructor(message, code = "rank-invalid") { super(message); this.name = "RankError"; this.code = code; }
  }
  const fail = message => { throw new RankError(message); };
  function guarded(fn) {
    try { return fn(); } catch (error) {
      if (error instanceof RankError) throw error;
      if (!(error instanceof L.LedgerError)) throw error;
      throw new RankError(error.message, "rank-unresolved");
    }
  }
  function word(raw) {
    if (typeof raw === "number") {
      if (!Number.isSafeInteger(raw)) fail("阶位的原生数值必须是安全整数");
      raw = String(raw);
    } else if (B.isDecimal(raw)) raw = String(raw);
    if (typeof raw !== "string" || !raw.trim() || raw.length > MAX_WORD) fail("阶位整数项无效或超过容量");
    const text = raw.trim().replace(/^\+/, "").replace(/^(-?)\./, "$10.");
    const match = /^(.*?)(?:\*([1-9]\d*))?$/.exec(text);
    if (!match || (match[2] && match[2].length > MAX_COUNT)) fail("阶位计数无效或超过容量");
    const signed = match[1], absolute = signed.startsWith("-") ? signed.slice(1) : signed;
    L.integer(absolute); // inspect the exact decimal spelling before projection
    return signed + (match[2] ? "*" + match[2] : "");
  }
  function terms(input, signed = false) {
    let values;
    if (Array.isArray(input)) {
      if (!signed) fail("阶位不能使用未标记的数组");
      values = input;
    } else if (input && typeof input === "object" && !B.isDecimal(input)) {
      if (input.kind !== KIND || input.version !== VERSION || !Array.isArray(input.terms) ||
          Object.keys(input).some(key => !["kind", "version", "terms"].includes(key))) fail("阶位记录格式或版本无效");
      values = input.terms;
    } else values = [input];
    if (values.length > MAX_TERMS) fail("阶位整数项超过容量");
    return values.map(word);
  }
  function normalized(input, signed = false) {
    const result = L.strict.normalize(terms(input, signed));
    if (!signed && L.strict.sign(result) < 0) fail("阶位不能为负");
    return result;
  }
  function pack(values) {
    // Normalization can lengthen a coefficient or append e0. Canonical output
    // must itself pass the persisted quota before it is returned to callers.
    values = values.map(value => {
      const match=/^(-?\d+)e([+-]?\d+)$/.exec(value);
      if(match){const coefficient=match[1].replace(/0+$/, "");value=coefficient+"e"+String(BigInt(match[2])+BigInt(match[1].length-coefficient.length));}
      const compact = value.replace(/^(-?\d+)e0$/, "$1");
      if (compact.length > MAX_WORD) throw new RankError("阶位规范结果超过容量", "rank-unresolved");
      return word(compact);
    });
    if (!values.length) return 0;
    if (values.length === 1) {
      // Only dense exact integers enter the scalar fast path. Never use a
      // Decimal projection to decide whether a rank has a residual term.
      const m = /^(\d+)(?:e([+-]?\d+))?$/i.exec(values[0]);
      if (m) {
        const exponent = BigInt(m[2] || 0);
        if (exponent >= 0n && exponent + BigInt(m[1].length) <= BigInt(MAX_WORD)) {
          const integer = BigInt(m[1]) * 10n ** exponent;
          if (integer <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(integer);
          const digits = String(integer);
          if (digits.length <= 300) return digits;
          return values[0];
        }
        return values[0];
      }
    }
    return { kind: KIND, version: VERSION, terms: values.slice() };
  }
  const read = input => guarded(() => pack(normalized(input)));
  const add = (rank, delta) => guarded(() => {
    const sum = L.strict.add(normalized(rank), normalized(delta, true));
    if (L.strict.sign(sum) < 0) fail("阶位不能为负");
    return pack(sum);
  });
  const compare = (a, b) => guarded(() => L.strict.compare(normalized(a), normalized(b)));
  const difference = (a, b) => guarded(() => L.strict.subtract(normalized(a), normalized(b)));
  const project = rank => guarded(() => L.value(normalized(rank)));
  const serialize = rank => read(rank);
  WIS.Core.Rank = Object.freeze({ read, add, compare, difference, project, serialize,
    RankError, limits: Object.freeze({ terms: MAX_TERMS, wordCharacters: MAX_WORD, countDigits: MAX_COUNT }) });
}(window.WIS));
