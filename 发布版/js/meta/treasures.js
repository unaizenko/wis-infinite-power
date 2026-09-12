(function defineTreasureLedger(WIS) {
  "use strict";
  const { BN, Decimal, ZERO } = WIS.Core.BigNum;
  const MAX_TERMS = 128, MAX_DIGITS = 2048;
  class LedgerError extends Error {}
  // The bundled Decimal parser first tries Number on integer coefficients.
  // A 309+ digit coefficient can therefore become Infinity and be misparsed.
  // Move the decimal point BEFORE entering that parser. Only the bounded
  // significand is rounded by Decimal; the exact word remains in the ledger.
  function project(raw) {
    const cache = WIS.Simulation?.FastForward?.ledgerCache;
    return cache ? cache.get('project', raw, prepared => uncached_project(prepared)) : uncached_project(raw);
  }
  function counted(raw) {
    const match = /^(.*?)\*([1-9]\d*)$/.exec(String(raw));
    if (!match) return { term: String(raw), count: 1n };
    if (match[2].length > MAX_DIGITS) throw new LedgerError("账本重复次数超过安全容量，输入保留");
    return { term: match[1], count: BigInt(match[2]) };
  }
  function uncached_project(raw) {
    const countedTerm = counted(raw);
    if (countedTerm.count !== 1n) return project(countedTerm.term).mul(project(String(countedTerm.count)));
    const text=String(raw).trim().replace(/^\+/, "");
    const m=/^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
    let safe=text;
    if(m) {
      const digits=(m[2]+(m[3]||"")).replace(/^0+/, "");
      if(!digits) return ZERO;
      const exponent=BigInt(m[4]||0)-BigInt((m[3]||"").length)+BigInt(digits.length-1);
      // The complete significand is < 10, regardless of the coefficient length.
      safe=`${m[1]}${digits[0]}.${digits.slice(1)||"0"}e${exponent}`;
    }
    const result=new Decimal(safe);
    if(!result.isFinite() || result.isNan()) throw new LedgerError("宝物账本词项无法安全投影");
    return result;
  }
  // Local additive accounting, NOT a replacement for the game's number library.
  // Decimal words use BigInt only for aligning nearby decimal places. Widely
  // separated / higher-layer words stay separate instead of being rounded away.
  function decimalWord(text) {
    const cache = WIS.Simulation?.FastForward?.ledgerCache;
    return cache ? cache.get('decimalWord', text, prepared => uncached_decimalWord(prepared)) : uncached_decimalWord(text);
  }
  function uncached_decimalWord(text) {
    const m = /^(-?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
    if (!m) return null;
    const digits = m[2] + (m[3] || ""), e = Number(m[4] || 0) - (m[3] || "").length;
    if (!Number.isSafeInteger(e) || digits.length > MAX_DIGITS * 2) return null;
    let c = BigInt((m[1] || "") + digits), exponent = e;
    while (c !== 0n && c % 10n === 0n) { c /= 10n; exponent++; }
    return { c, e: exponent };
  }
  const wordText = w => WIS.Simulation?.FastForward?.ledgerCache?.wordText(w) ?? `${w.c}e${w.e}`;
  function normalize(values, limit = MAX_TERMS) {
    if (limit !== MAX_TERMS) return uncached_normalize(values, limit);
    const cache = WIS.Simulation?.FastForward?.ledgerCache;
    return cache ? cache.get('normalize', values, prepared => uncached_normalize(prepared)) : uncached_normalize(values);
  }
  function uncached_normalize(values, limit = MAX_TERMS) {
    const words = [], opaque = new Map();
    for (const raw of values) {
      const item = counted(raw), text = item.term, parsedWord = decimalWord(text), word = parsedWord ? { ...parsedWord } : null;
      if (word) word.c *= item.count;
      if (word) { if (word.c !== 0n) words.push(word); }
      else {
        // Do not round away exact decimal words that exceed our local capacity.
        if (/^-?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/i.test(text))
          throw new LedgerError("宝物账本十进制词项超过安全容量，操作未提交");
        const value = project(text);
        if (!value.isFinite() || value.isNan()) throw new LedgerError("宝物账本包含非法数值");
        if (!value.eq(0)) {
          const key = String(value.abs());
          opaque.set(key, (opaque.get(key) || 0n) + BigInt(value.sign) * item.count);
        }
      }
    }
    words.sort((a,b) => a.e-b.e);
    const merged = [];
    for (const word of words) {
      const last = merged[merged.length-1];
      if (last && word.e-last.e <= MAX_DIGITS &&
          (WIS.Simulation?.FastForward?.ledgerCache?.coefficientLength(word) ?? word.c.toString().length) + word.e-last.e <= MAX_DIGITS * 2) {
        last.c += word.c * (WIS.Simulation?.FastForward?.ledgerCache?.pow10(word.e-last.e) ?? 10n ** BigInt(word.e-last.e));
        if (last.c === 0n) merged.pop();
      } else merged.push({ ...word });
    }
    const result = [...merged.filter(w=>w.c!==0n).map(wordText), ...Array.from(opaque, ([term, count]) => {
      if (count === 0n) return null;
      const magnitude = count < 0n ? -count : count;
      if (String(magnitude).length > MAX_DIGITS) throw new LedgerError("账本重复次数超过安全容量，输入保留");
      return `${count < 0n ? "-" : ""}${term}${magnitude === 1n ? "" : "*" + magnitude}`;
    }).filter(Boolean)];
    if (result.length > limit) throw new LedgerError("宝物账本残差层数超过安全容量，操作未提交");
    // One projection per word, not two parses on every sort comparison.
    return result.map(text=>({text,magnitude:project(text).abs()}))
      .sort((a,b)=>b.magnitude.cmp(a.magnitude)).map(item=>item.text);
  }
  function value(terms) { return terms.reduceRight((sum,t)=>sum.add(project(t)), ZERO); }
  function sign(terms, limit = MAX_TERMS) {
    terms = normalize(terms, limit);
    if (!terms.length) return 0;
    if (terms.length === 1) return terms[0].startsWith("-") ? -1 : 1;
    const positive = terms.filter(t=>!t.startsWith("-")).map(project), negative = terms.filter(t=>t.startsWith("-")).map(t=>project(t).abs());
    if (!positive.length) return -1;
    if (!negative.length) return 1;
    const p = positive.reduce((a,b)=>a.add(b),ZERO), n = negative.reduce((a,b)=>a.add(b),ZERO);
    if (p.eq(n)) throw new LedgerError("宝物余额符号超出现有表示精度，操作未提交");
    return p.gt(n) ? 1 : -1;
  }
  const negate = terms => terms.map(t=>String(t).startsWith("-") ? String(t).slice(1) : "-"+t);
  const add = (terms, amount, limit = MAX_TERMS) => normalize([...terms, ...amount], limit);
  const subtract = (terms, amount, limit = MAX_TERMS) => add(terms, negate(amount), limit);
  const compare = (terms, amount, limit = MAX_TERMS) => sign(subtract(terms,amount,limit),limit);
  const bounded = limit => Object.freeze({ project, value, normalize: t => normalize(t,limit), sign: t => sign(t,limit), add: (a,b) => add(a,b,limit), subtract: (a,b) => subtract(a,b,limit), compare: (a,b) => compare(a,b,limit) });
  function scale(terms, factor) {
    const f = decimalWord(String(factor));
    return normalize(terms.map(t=>{
      const w = decimalWord(String(t));
      if (w && f) {
        const c=w.c*f.c,e=w.e+f.e;
        if(c.toString().replace(/^-/,"").length>MAX_DIGITS*2 || !Number.isSafeInteger(e))
          throw new LedgerError("宝物账本精确乘积超过安全容量，操作未提交");
        return wordText({c,e});
      }
      const termValue=project(t), factorValue=project(factor), product=termValue.mul(factorValue);
      if (!product.isFinite() || product.isNan() || (!termValue.eq(0) && !factorValue.eq(0) && product.eq(0)))
        throw new LedgerError("宝物账本乘积无法表示，操作未提交");
      return String(product);
    }));
  }
  function stock(state,key) { return normalize([state.meta.treasures[key] || ZERO, ...(state.meta.treasureStockResidual?.[key] || [])]); }
  function progress(state,key) {
    const credit=state.meta.treasureCredits?.[key];
    if(credit) return [String(Credit.value(Credit.actual(credit)))]; // UI/legacy projection only, never a settlement input.
    return normalize([state.meta.treasureProgress?.[key] || ZERO,
    state.meta.treasureProgressResidual?.[key] || ZERO, ...(state.meta.treasureProgressResidualTail?.[key] || [])]); }
  // Exact reduced fractions of represented decimal inputs. No reciprocal expansion,
  // expression chain or per-award denominator accumulation. The separate bound
  // accommodates an existing 4096-digit word plus its decimal place alignment.
  const FRACTION_DIGITS=8192;
  const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const r=a%b;a=b;b=r;}return a;};
  function fraction(n,d=1n,reduced=false) {
    if(d===0n) throw new LedgerError("奖励进度分母为零");
    if(d<0n){n=-n;d=-d;}
    if(!reduced){const g=gcd(n,d);n/=g;d/=g;}
    if(n.toString().length>FRACTION_DIGITS || d.toString().length>FRACTION_DIGITS)
      throw new LedgerError("奖励进度分式超过安全容量，输入保留");
    return {n,d};
  }
  function fromDecimal(raw) {
    const w=decimalWord(String(raw));
    if(!w || Math.abs(w.e)>FRACTION_DIGITS) throw new LedgerError("奖励进度分式无法精确表示此数值");
    return w.e>=0 ? fraction(w.c*10n**BigInt(w.e)) : fraction(w.c,10n**BigInt(-w.e));
  }
  const plus=(a,b)=>{const g=gcd(a.d,b.d),n=a.n*(b.d/g)+b.n*(a.d/g),h=gcd(n,g);
    return fraction(n/h,(a.d/g)*(b.d/h),true);};
  const times=(a,b)=>{const g=gcd(a.n,b.d),h=gcd(b.n,a.d);return fraction((a.n/g)*(b.n/h),(a.d/h)*(b.d/g),true);};
  const minus=(a,b)=>plus(a,{n:-b.n,d:b.d});
  const quotient=(a,b)=>times(a,fraction(b.d,b.n,true));
  const fromWords=words=>words.reduce((a,w)=>plus(a,fromDecimal(w)),fraction(0n));
  const creditCache=new WeakMap();
  // A validated fraction may follow an exact in-memory domain copy. The
  // source words are checked every time: edits and imported JSON must validate.
  const cachedCredit=c=>{const v=creditCache.get(c);return v&&v.n===c.n&&v.d===c.d?v:null;};
  const cacheCredit=(c,value)=>{const entry={n:c.n,d:c.d,value:Object.freeze(value)};creditCache.set(c,entry);return entry.value;};
  const readCredit=c=>cachedCredit(c)?.value || cacheCredit(c,fraction(BigInt(c.n),BigInt(c.d)));
  function inheritCredit(source,target) {
    if(!source||!target)return;
    const entry=cachedCredit(source);
    if(entry&&source.n===target.n&&source.d===target.d)creditCache.set(target,entry);
  }
  const Credit=Object.freeze({fraction,fromDecimal,fromWords,plus,minus,times,quotient,
    compare:(a,b)=>{const v=a.n*b.d-b.n*a.d;return v>0n?1:v<0n?-1:0;},
    floor:a=>a.n>=0n?a.n/a.d:(a.n-a.d+1n)/a.d,
    read:readCredit,inherit:inheritCredit,actual:c=>times(readCredit(c),fromDecimal(c.unit)),
    value:a=>project(String(a.n)).div(project(String(a.d))),
    store:(a,unit)=>{const c={version:1,n:String(a.n),d:String(a.d),unit:String(unit)};cacheCredit(c,a);return c;},
    limit:FRACTION_DIGITS});
  function write(state,key,terms,isStock=false) {
    terms=normalize(terms);
    if(sign(terms)<0) throw new LedgerError("宝物账本余额不足，操作未提交");
    const main=value(terms), rest=subtract(terms,[main]);
    if(isStock) {
      state.meta.treasures[key]=main;
      (state.meta.treasureStockResidual ||= {})[key]=rest;
    } else {
      if(state.meta.treasureCredits?.[key]) throw new LedgerError("奖励进度账本不可被投影覆盖");
      const residual=rest.length ? project(rest[0]) : ZERO;
      state.meta.treasureProgress[key]=main;
      state.meta.treasureProgressResidual[key]=residual;
      (state.meta.treasureProgressResidualTail ||= {})[key]=subtract(rest,[residual]);
    }
  }
  function transaction(state, run) {
    const previous=state.meta, next={...previous};
    for(const key of ["treasures","treasureStockResidual","treasureProgress","treasureProgressResidual",
      "treasureProgressResidualTail","treasureProgressPending","treasureProgressStatus","treasureQualifications","treasureCredits"]) next[key]={...(previous[key]||{})};
    state.meta=next;
    try { return run(); } catch(error) { state.meta=previous; WIS.Core.Effects?.invalidate?.(); throw error; }
  }
  function integer(amount) {
    if (!(typeof amount === "number" || typeof amount === "string" || amount instanceof Decimal) ||
        (typeof amount === "string" && !amount.trim())) throw new LedgerError("宝物数量必须是有效非负整数");
    if(typeof amount === "string" && (amount.length>MAX_DIGITS*2 ||
        !/^(?:\+?\d+(?:\.\d*)?(?:e[+-]?\d+)?|e{2,}\+?\d+(?:\.\d+)?)$/i.test(amount.trim())))
      throw new LedgerError("宝物数量格式无效");
    const parsed = project(amount);
    if (!parsed.isFinite() || parsed.isNan() || parsed.lt(0) || !parsed.floor().eq(parsed))
      throw new LedgerError("宝物数量必须是有效非负整数");
    // Inspect decimal input BEFORE Decimal can round a fractional huge value.
    const word=decimalWord(typeof amount === "string" ? amount.trim().replace(/^\+/,"") : String(amount));
    if(word && word.c!==0n && word.e<0) throw new LedgerError("宝物数量不能包含小数");
    return parsed;
  }
  WIS.Meta.TreasureLedger=Object.freeze({LedgerError,Credit,bounded,project,normalize,value,sign,add,subtract,compare,scale,stock,progress,write,transaction,integer,MAX_TERMS});
}(window.WIS));

(function defineTreasureMeta(WIS) {
  "use strict";

  const {
    BN, ZERO, add: addBN, mul, max: maxBN, lte, toNumber
  } = WIS.Core.BigNum;
  const MAX_SAFE_INTEGER_BN = BN(Number.MAX_SAFE_INTEGER);
  const L = WIS.Meta.TreasureLedger;
  let lastFailure = null;

  function decimalCount(value) {
    return maxBN(ZERO, BN(value)).floor();
  }

  function compatibleCount(value) {
    const count = decimalCount(value);
    return lte(count, MAX_SAFE_INTEGER_BN)
      ? Math.max(0, Math.floor(toNumber(count, 0)))
      : count;
  }

  const definitions = Object.freeze(Object.fromEntries([
    ["tianNiPearl", "天逆珠"], ["mysteriousGreenBottle", "神秘绿瓶"], ["fuBao", "符宝"],
    ["fitnessMembershipCard", "健身房会员卡"], ["superLollipop", "超级棒棒糖"],
    ["skyCrystal", "天晶"], ["fiveSpiritStone", "五灵石"], ["xuTianDing", "虚天鼎"],
    ["baLingChi", "八灵尺"], ["wanYaoFan", "万妖幡"], ["phantomHeavenMirror", "幻天镜"],
    ["mysticHeavenSacredTree", "玄天圣树"], ["mysticHeavenSpiritSlayingSword", "玄天斩灵剑"],
    ["fiveElementsTreasure", "五行至宝"], ["immortalCrystal", "仙晶"],
    ["cosmicFiber", "宇宙纤维"], ["cosmicWill", "宇宙意志"]
  ].map(([key, name]) => [key, Object.freeze({ key, name, stackable: true })])));

  WIS.Meta.Treasures = Object.freeze({
    definitions,
    keys: Object.freeze(Object.keys(definitions)),
    isTreasure(key) { return Object.prototype.hasOwnProperty.call(definitions, key); },
    isStackable(key) { return definitions[key]?.stackable === true; },
    getTreasureChanceMultiplier(state) {
      return WIS.Power.ScaleLogic?.treasureChanceMultiplier?.(state) ?? 1;
    },
    getTreasureAwardMultiplier(state, key = null) {
      if (key !== null && !this.isStackable(key)) return 1;
      return WIS.Power.ScaleLogic?.treasureAwardMultiplier?.(state) ?? 1;
    },
    count(state, key) {
      return compatibleCount(L.value(L.stock(state, key)));
    },
    balance(state,key) { return L.stock(state,key); },
    lastFailure() { return lastFailure; },
    add(state, key, amount = 1, { applyAwardMultiplier = true } = {}) {
      if (!this.isTreasure(key) || !Object.prototype.hasOwnProperty.call(state.meta.treasures, key)) throw new Error(`未知宝物：${key}`);
      L.integer(amount);
      const awarded=L.scale(L.normalize([typeof amount === "string" ? amount.trim().replace(/^\+/,"") : amount]),
        applyAwardMultiplier ? this.getTreasureAwardMultiplier(state,key) : 1);
      return L.transaction(state,()=>{
        L.write(state,key,L.add(L.stock(state,key),awarded),true);
        WIS.Core.Effects?.invalidate?.();
        WIS.Meta.TreasureProgress?.rememberQualifications(state);
        return compatibleCount(L.value(awarded));
      });
    },
    spend(state, key, amount) {
      if (!this.isTreasure(key)) throw new Error(`未知宝物：${key}`);
      lastFailure=null;
      try {
        const cost=L.integer(amount);
        if(cost.eq(0)) throw new L.LedgerError("消费数量必须大于零");
        const debit=L.normalize([typeof amount === "string" ? amount.trim().replace(/^\+/,"") : amount]);
        return L.transaction(state,()=>{
          if(L.compare(L.stock(state,key),debit)<0) throw new L.LedgerError("宝物余额不足");
          WIS.Meta.TreasureProgress.ensure(state);
          WIS.Meta.TreasureProgress.rememberQualifications(state);
          L.write(state,key,L.subtract(L.stock(state,key),debit),true);
          WIS.Core.Effects?.invalidate?.();
          WIS.Meta.TreasureProgress.settle(state, key);
          return true;
        });
      } catch(error) { lastFailure=String(error.message||error); return false; }
    }
  });
}(window.WIS));

(function defineTreasureProgress(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, { BN, ZERO, ONE } = B;
  const T = WIS.Meta.Treasures;
  const L = WIS.Meta.TreasureLedger;
  class PrecisionError extends L.LedgerError {
    constructor(code,message) { super(message); this.code=code; }
  }
  const exponential = (base, q, coefficient = 1, immortal = false) =>
    Object.freeze({ base, q, coefficient, immortal, type: "exponential" });
  const power = (base, scale, exponent, immortal = false) =>
    Object.freeze({ base, scale, exponent, coefficient: 1, immortal, type: "power" });
  const rules = Object.freeze({
    fitnessMembershipCard: exponential(200, .97), superLollipop: exponential(2000, .98),
    skyCrystal: power(200, 10, .5), fiveSpiritStone: exponential(2000, .99),
    baLingChi: exponential(500, .9, 1, true), fiveElementsTreasure: exponential(50, .99, 1, true),
    immortalCrystal: power(20, 100, .5, true), cosmicFiber: power(BN(1000).div(3), 20, .65),
    cosmicWill: power(1000, 10, .85),
    tianNiPearl: exponential(1, .99, .01, true), mysteriousGreenBottle: exponential(1, .85, .02, true),
    fuBao: exponential(1, .7, .02, true), xuTianDing: exponential(1, .75, .0002, true),
    wanYaoFan: exponential(1, .75, .0001, true), phantomHeavenMirror: exponential(1, .5, "5e-12", true),
    mysticHeavenSacredTree: exponential(1, .5, "5e-14", true),
    mysticHeavenSpiritSlayingSword: exponential(1, .6, "1e-12", true)
  });
  const explorationKeys = Object.freeze(["tianNiPearl", "mysteriousGreenBottle", "fuBao", "xuTianDing", "wanYaoFan",
    "phantomHeavenMirror", "mysticHeavenSacredTree", "mysticHeavenSpiritSlayingSword"]);
  const nonnegative = v => B.max(0, v);
  const held = (s, k) => nonnegative(T.count(s,k)).floor();
  function requirement(key, count) {
    const r = rules[key], n = nonnegative(count);
    if (!r) throw new Error(`未知宝物进度：${key}`);
    return r.type === "exponential" ? BN(r.base).mul(ONE.div(r.q).pow(n))
      : BN(r.base).mul(n.div(r.scale).add(1).pow(r.exponent));
  }
  // Stable expm1/log1p: preserve sub-Number progress and avoid subtracting two
  // nearly equal enormous powers in the cumulative power-law demand.
  function log1p(x) {
    x = BN(x);
    if (x.abs().lt("1e-5")) return x.mul(ONE.sub(x.div(2)).add(x.pow(2).div(3)).sub(x.pow(3).div(4)));
    return x.add(1).ln();
  }
  function expm1(x) {
    x = BN(x);
    if (x.abs().lt("1e-5")) return x.mul(ONE.add(x.div(2)).add(x.pow(2).div(6)).add(x.pow(3).div(24)));
    return x.exp().sub(1);
  }
  function powerDifference(start, delta, p) {
    return start.pow(p).mul(expm1(log1p(delta.div(start)).mul(p)));
  }
  function cumulative(key, n, batches, award = 1) {
    const r = rules[key], m = nonnegative(batches).floor(), a = BN(award);
    if (m.eq(0)) return ZERO;
    if (m.eq(1)) return requirement(key, n);
    if (r.type === "exponential") {
      const logRatio = ONE.div(r.q).ln().mul(a);
      return requirement(key, n).mul(expm1(logRatio.mul(m))).div(expm1(logRatio));
    }
    // A fixed small prefix uses the original represented demands. Large counts use Euler--Maclaurin (four
    // derivative corrections), not a per-item loop or an expected item count.
    if (m.lte(32)) {
      let sum = ZERO;
      for (let i = 0; i < m.toNumber(); i++) sum = sum.add(requirement(key, BN(n).add(a.mul(i))));
      return sum;
    }
    const z = BN(n).add(r.scale), d = a.mul(m), p = r.exponent;
    const factor = BN(r.base).div(BN(r.scale).pow(p));
    let sum = powerDifference(z, d, p + 1).div(a.mul(p + 1))
      .sub(powerDifference(z, d, p).div(2));
    const corrections = [[1, 1 / 12], [3, -1 / 720], [5, 1 / 30240], [7, -1 / 1209600]];
    for (const [order, coefficient] of corrections) {
      let derivative = coefficient;
      for (let j = 0; j < order; j++) derivative *= p - j;
      sum = sum.add(powerDifference(z, d, p - order).mul(a.pow(order)).mul(derivative));
    }
    return B.max(ZERO, sum.mul(factor));
  }
  function affordable(key, n, progress, award) {
    const p = nonnegative(progress), r = rules[key], a = BN(award), first = requirement(key, n);
    if (p.lt(first)) return ZERO;
    let estimate;
    if (r.type === "exponential") {
      const l = ONE.div(r.q).ln().mul(a);
      estimate = log1p(p.div(first).mul(expm1(l))).div(l).floor();
    } else {
      const z = BN(n).add(r.scale), e = r.exponent + 1;
      const v = p.mul(a).mul(e).div(BN(r.base).div(BN(r.scale).pow(r.exponent))).div(z.pow(e));
      estimate = z.mul(expm1(log1p(v).div(e))).div(a).floor();
    }
    estimate = B.max(1, estimate);
    for (let i = 0; i < 12; i++) {
      const {cost,next,nextCost} = rewardBoundary(key,n,estimate,a);
      if (cost.gt(p)) {
        const lower = estimate.sub(1);
        if (lower.eq(estimate)) break; // single-item resolution is exhausted
        estimate = lower;
      } else if (nextCost.lte(p)) estimate = next;
      else return estimate;
    }
    // Resolve a bad inverse estimate with bounded logarithmic search. No silent
    // loop over all rewards. Unresolvable units remain in the progress ledger.
    let lo = ZERO, hi = estimate.mul(2).add(2);
    for (let i = 0; i < 96; i++) {
      const mid = lo.add(hi).div(2).floor();
      if (mid.eq(lo) || mid.eq(hi)) break;
      if (cumulative(key, n, mid, a).lte(p)) lo = mid; else hi = mid;
    }
    return lo;
  }
  // A rounded cost equal to the available balance is NOT a certificate for
  // either an integer reward count or an exact zero remainder. Check that both
  // the batch unit and the adjacent cost can still be resolved before debit.
  function rewardBoundary(key,n,m,award) {
    const next=m.add(1);
    if(next.eq(m) || (m.gt(0) && m.sub(1).eq(m)))
      throw new PrecisionError("batch-unit", "奖励批数已无法区分相邻整数；未确认奖励暂停，输入已保留");
    const cost=cumulative(key,n,m,award), nextCost=cumulative(key,n,next,award);
    if(!cost.isFinite() || !nextCost.isFinite() || !nextCost.gt(cost))
      throw new PrecisionError("batch-cost", "相邻批次的累计需求无法可靠区分；未确认奖励暂停，输入已保留");
    return {cost,next,nextCost};
  }
  function unitGain(state, key) {
    const r = rules[key];
    let multiplier = r.immortal ? WIS.Cultivation.ImmortalLogic.immortalTreasureChanceMultiplier()
      : T.getTreasureChanceMultiplier(state);
    if (key === "skyCrystal") multiplier = BN(multiplier).mul(ONE.add(
      ONE.add(BN(WIS.Power.ScaleLogic.effectiveRockLevel()).div(1000)).log10()));
    return BN(multiplier).mul(r.coefficient);
  }
  function rememberQualifications(state) {
    const q = state.meta.treasureQualifications ||= {};
    if (state.fiveSpiritStonePurchased || held(state, "fiveSpiritStone").gt(0)) q.fiveSpiritStone = true;
    if (state.fiveElementsTreasureUnlocked || held(state, "fiveElementsTreasure").gt(0)) q.fiveElementsTreasure = true;
    if (state.heavenlyTreasureLevel > (q.heavenlyTreasureLevel || 0)) q.heavenlyTreasureLevel = state.heavenlyTreasureLevel;
    if (state.mysticHeavenlyTreasureLevel > (q.mysticHeavenlyTreasureLevel || 0)) q.mysticHeavenlyTreasureLevel = state.mysticHeavenlyTreasureLevel;
  }
  function ensure(state) {
    const meta = state.meta;
    meta.treasureProgress ||= {};
    meta.treasureProgressResidual ||= {};
    rememberQualifications(state);
    if (meta.treasureProgressVersion === 1) return;
    // Migrate ONLY stored, unsettled old source fractions. Transient counters
    // that were never saved cannot be reconstructed. No historical reward roll.
    meta.treasureProgressVersion = 1;
    const addOld = (key, units) => {
      const u = nonnegative(units);
      if (u.gt(0)) L.write(state,key,L.add(L.progress(state,key),
        L.scale([u],B.min(unitGain(state,key),requirement(key,held(state,key))))));
    };
    for (const [field, key] of [["superLollipopRollProgress", "superLollipop"], ["fiveSpiritStoneRollProgress", "fiveSpiritStone"],
      ["immortalCrystalRollProgress", "immortalCrystal"], ["fiveElementsTreasureRollProgress", "fiveElementsTreasure"]]) {
      addOld(key, state[field]); state[field] = 0;
    }
    // Keep explorationProgress for natural treasure/seize-foundation's old
    // whole-attempt rules, while transferring its fraction to the 8 ledgers ONCE.
    for (const key of explorationKeys) if (qualification(state, key) === null) addOld(key, state.explorationProgress);
  }
  function qualification(state, key) {
    const has = k => state.unlockedAchievements?.[k] === true;
    if (rules[key].immortal && state.cultivation?.active !== "immortal") return "当前未选择仙道";
    const achievements = { fitnessMembershipCard: "scale5", superLollipop: "scale8", skyCrystal: "scale9",
      cosmicFiber: "scale13", cosmicWill: "scale14", tianNiPearl: "daoFoundation", mysteriousGreenBottle: "goldenCore",
      fuBao: "trueScale3", immortalCrystal: "ascendImmortal" };
    if (achievements[key] && !has(achievements[key])) return "尚未取得对应成就";
    if (["tianNiPearl", "mysteriousGreenBottle"].includes(key) && WIS.Meta.Achievements.treasuresUnlocked &&
      !WIS.Meta.Achievements.treasuresUnlocked()) return "宝物界面尚未解锁";
    if (key === "fiveSpiritStone" && !state.fiveSpiritStonePurchased) return "尚未取得五灵石获取资格";
    if (key === "fiveElementsTreasure" && !state.fiveElementsTreasureUnlocked) return "尚未解锁五行至宝";
    const h = { xuTianDing: 1, baLingChi: 2, wanYaoFan: 3 };
    const m = { phantomHeavenMirror: 1, mysticHeavenSacredTree: 2, mysticHeavenSpiritSlayingSword: 3 };
    if (h[key] && state.heavenlyTreasureLevel < h[key]) return `尚未解锁通天灵宝${h[key]}`;
    if (m[key] && state.mysticHeavenlyTreasureLevel < m[key]) return `尚未解锁玄天灵宝${m[key]}`;
    if (key === "cosmicFiber" && state.highestScaleIndex < 13) return "尚未达到超星系团量级";
    if (key === "cosmicWill" && state.highestScaleIndex < 14) return "尚未达到宇宙结构量级";
    return null;
  }
  function affordableLedger(key, n, ledger, award) {
    let m = affordable(key, n, L.value(ledger), award);
    for (let i=0;i<12;i++) {
      const {cost,next,nextCost}=rewardBoundary(key,n,m,award);
      if (L.compare(ledger,[cost])<0) {
        const lower=m.sub(1);
        if(lower.eq(m)) throw new PrecisionError("batch-unit","奖励批数无法安全缩减；输入已保留");
        m=lower; continue;
      }
      if(L.compare(ledger,[nextCost])>=0) {m=next;continue;}
      return m;
    }
    throw new PrecisionError("batch-boundary","宝物奖励边界无法可靠定位；输入已保留");
  }
  const evaluatedEvents=Object.create(null);
  function diagnosticBefore(state,key,units,gain,meta=state.meta) {
    const original={meta};
    return {key,logicalTime:state.totalElapsedSeconds,input:String(units),gain:String(gain),
      before:String(T.count(original,key)),demand:String(requirement(key,held(original,key))),
      progressBefore:L.progress(original,key).map(String),pendingBefore:(meta.treasureProgressPending?.[key]||[]).length};
  }
  function apply(state,key,units,gain) {
    evaluatedEvents[key]=(evaluatedEvents[key]||0)+1;
    const before=state.meta,oldStatus=before.treasureProgressStatus?.[key];
    let reward;
    try {reward=applyInput(state,key,units,gain);}
    catch(error) {
      // Error context is attached to the exception; failed awards never enter
      // the persisted commit journal. The enclosing frame restores all domains.
      try {error.treasureContext=diagnosticBefore(state,key,units,gain,before);}
      catch {error.treasureContext={key,input:String(units),gain:String(gain),reason:'unreadable-input-ledger'};}
      throw error;
    }
    const status=state.meta.treasureProgressStatus?.[key];
    if(reward.gt(0)||(status?.state==='blocked'&&status?.code!==oldStatus?.code)) {
      const prior=before.treasureDiagnostics||{version:1,sequence:0,counts:{},recent:[]};
      const sequence=prior.sequence+1,counts={...prior.counts};
      if(reward.gt(0))counts[key]=(counts[key]||0)+1;
      const row={...diagnosticBefore(state,key,units,gain,before),sequence,
        after:String(T.count(state,key)),awarded:String(reward),
        batches:String(reward.div(T.getTreasureAwardMultiplier(state,key))),
        progressAfter:L.progress(state,key).map(String),pendingAfter:(state.meta.treasureProgressPending?.[key]||[]).length,
        reason:status?.code||null};
      // Copy-on-write: the outer frame/checkpoint owns commit identity. Trial
      // restoration discards both counts and receipts, including accepted
      // endpoints later replaced by independent validation.
      state.meta.treasureDiagnostics={version:1,sequence,counts,recent:[...prior.recent.slice(-31),row]};
    }
    return reward;
  }
  function applyInput(state, key, units, gain) {
    const saved=state.meta.treasureCredits?.[key];
    const entries=state.meta.treasureProgressPending?.[key]||[];
    const demand=requirement(key,held(state,key));
    // The existing high-geometric approximation remains the path for unresolvable
    // huge batches. Finite capped batches all share this exact credit ledger.
    const capped=[...entries,...BN(units).gt(0)?[{units:[units],gain}]:[]].some(e=>
      L.project(e.gain).gte(demand) && L.value(e.units).lt(Number.MAX_SAFE_INTEGER));
    if(saved || capped) return applyCredit(state,key,units,gain);
    const ordinary = () => applyOrdinary(state, key, units, gain);
    return WIS.Simulation?.FastForward?.applyTreasure(state, key, units, gain, ordinary) ?? ordinary();
  }
  function applyCredit(state,key,units,gain,fixedAward) {
    const C=L.Credit;
    return L.transaction(state,()=>{
      const currentAward=BN(fixedAward ?? T.getTreasureAwardMultiplier(state,key));
      let stock=L.stock(state,key),n=L.value(stock).floor(),rewards=[];
      let record=state.meta.treasureCredits?.[key] || C.store(C.fromWords(L.progress(state,key)),ONE);
      let credit=C.read(record),unit=BN(record.unit),award=currentAward;
      const oldStatus=state.meta.treasureProgressStatus?.[key];
      let status=oldStatus?.approximation || oldStatus?.state==='limited' ? oldStatus : null;
      const pending=[...(state.meta.treasureProgressPending?.[key]||[])];
      if(BN(units).gt(0) && BN(gain).gt(0)) {
        const last=pending.at(-1);
        if(last && L.project(last.gain).eq(gain) && L.project(last.award??currentAward).eq(currentAward))
          pending[pending.length-1]={...last,units:L.add(last.units,[units])};
        else pending.push({units:L.normalize([units]),gain:String(gain),award:String(currentAward)});
      }
      const actual=()=>C.times(credit,C.fromDecimal(unit));
      const align=()=>{const d=requirement(key,n);if(!unit.eq(d)){credit=C.quotient(actual(),C.fromDecimal(d));unit=d;}};
      const grant=m=>{const delta=L.scale([m],award);stock=L.add(stock,delta);rewards=L.add(rewards,delta);n=L.value(stock).floor();};
      const settle=()=>{
        align();if(C.floor(credit)<1n)return;
        const p=actual();let m=affordable(key,n,C.value(p),award);
        for(let i=0;i<12;i++) {
          const {cost,next,nextCost}=rewardBoundary(key,n,m,award);
          if(C.compare(p,C.fromDecimal(cost))<0){m=m.sub(1);continue;}
          if(C.compare(p,C.fromDecimal(nextCost))>=0){m=next;continue;}
          const rest=C.minus(p,C.fromDecimal(cost));grant(m);unit=requirement(key,n);
          if(m.gt(32))status={...status,state:'limited',code:'rounded-bulk',
            message:'批量需求按当前大数精度计算；分式账本保留该表示需求以外的余量'};
          credit=C.quotient(rest,C.fromDecimal(unit));return;
        }
        throw new PrecisionError('batch-boundary','奖励边界无法可靠定位，输入保留');
      };
      const checkpoint=()=>({credit,unit,stock,n,rewards});
      const restore=x=>({credit,unit,stock,n,rewards}=x);
      const blocked=e=>{if(!(e instanceof L.LedgerError))throw e;status={state:'blocked',code:e.code||'ledger-resolution',message:e.message+'；未处理来源保留在存档中'};};
      let ready=true,base=checkpoint();
      try{settle();}catch(e){restore(base);blocked(e);ready=false;}
      while(ready && pending.length) {
        const input=pending[0],g=L.project(input.gain);award=L.project(input.award??currentAward);
        base=checkpoint();
        try {
          if(!g.gt(0)||!award.gt(0)||!award.floor().eq(award)||L.sign(input.units)<0)
            throw new L.LedgerError('宝物来源上下文无效');
          align();let u=C.fromWords(input.units);
          if(g.gte(unit)) {
            const credits=C.plus(credit,u),r=rules[key];
            const capN=r.type==='exponential'?g.div(r.base).ln().div(ONE.div(r.q).ln())
              :g.div(r.base).pow(1/r.exponent).sub(1).mul(r.scale);
            let limit=B.max(0,capN.sub(n).div(award).floor().add(1));
            // Verify the closed-form cap endpoint against the original demand.
            let located=false;
            for(let i=0;i<12;i++) {
              if(limit.gt(0)&&requirement(key,n.add(limit.sub(1).mul(award))).gt(g)){limit=limit.sub(1);continue;}
              if(requirement(key,n.add(limit.mul(award))).lte(g)){limit=limit.add(1);continue;}
              located=true;break;
            }
            if(!located)throw new PrecisionError('cap-boundary','封顶结束边界无法可靠定位，输入保留');
            const whole=C.floor(credits),max=C.floor(C.fromDecimal(limit)),batches=whole<max?whole:max;
            const m=L.project(String(batches));
            if(m.add(1).eq(m))throw new PrecisionError('cap-unit','封顶奖励批数无法分辨，输入保留');
            const rest=C.minus(credits,C.fraction(batches));
            grant(m);const nextDemand=requirement(key,n);
            if(g.gte(nextDemand)) {credit=rest;unit=nextDemand;u=C.fraction(0n);}
            else {
              // Once the cap ends, only unused source units use the uncapped
              // gain. Fractional credit at the transition keeps its actual units.
              credit=C.quotient(C.times(rest,C.fromDecimal(g)),C.fromDecimal(nextDemand));
              unit=nextDemand;u=C.fraction(0n);
            }
          } else credit=C.plus(credit,C.quotient(C.times(u,C.fromDecimal(g)),C.fromDecimal(unit)));
          settle();C.fromDecimal(unit);pending.shift();
        }catch(e){restore(base);blocked(e);break;}
      }
      if(credit.n<0n)throw new L.LedgerError('宝物进度余额不足');
      // Legacy main/tail words remain an immutable migration anchor. Once this
      // field exists they are NOT added again. UI projection is never written back.
      (state.meta.treasureCredits ||= {})[key]=C.store(credit,unit);
      L.write(state,key,stock,true);
      (state.meta.treasureProgressPending ||= {})[key]=pending;
      (state.meta.treasureProgressStatus ||= {})[key]=status;
      if(L.sign(rewards)>0){WIS.Core.Effects?.invalidate?.();rememberQualifications(state);}
      return L.value(rewards);
    });
  }
  function applyOrdinary(state, key, units, gain, fixedAward) {
    return L.transaction(state,()=>{
      const currentAward=BN(fixedAward ?? T.getTreasureAwardMultiplier(state,key));
      let award=currentAward;
      let stock=L.stock(state,key), p=L.progress(state,key), rewards=[], n=L.value(stock).floor();
      let precision=state.meta.treasureProgressStatus?.[key]?.state==="limited"
        ? state.meta.treasureProgressStatus[key] : null;
      // Pending source units retain their original unit gain. In particular a
      // cap transition cannot be replaced with "units * today's multiplier".
      const pending=[...(state.meta.treasureProgressPending?.[key]||[])];
      const u=nonnegative(units), g=BN(gain);
      if(u.gt(0) && g.gt(0)) {
        const last=pending[pending.length-1];
        let merged=false;
        if(last && L.project(last.gain).eq(g) && L.project(last.award??currentAward).eq(currentAward)) {
          try {pending[pending.length-1]={...last,units:L.add(last.units,[u])};merged=true;}
          catch(error) {if(!(error instanceof L.LedgerError)) throw error;}
        }
        // A full additive ledger does not authorize dropping an incoming source.
        // Keep a separate unprocessed chunk; do not enlarge MAX_TERMS or round it.
        if(!merged) pending.push({units:L.normalize([u]),gain:String(g),award:String(currentAward)});
      }
      const blocked=error=>{
        if(!(error instanceof L.LedgerError)) throw error;
        precision={state:"blocked",code:error.code||"ledger-resolution",message:error.message+"；未处理来源保留在存档中"};
      };
      const grant=m=>{
        const delta=L.scale([m],award);
        const nextStock=L.add(stock,delta),nextRewards=L.add(rewards,delta),nextN=L.value(nextStock).floor();
        stock=nextStock;rewards=nextRewards;n=nextN;
      };
      const settleProgress=()=>{
        const checkpoint={stock,p,rewards,n,precision};
        try {
          const m=affordableLedger(key,n,p,award);
          if(m.gt(0)) {
            const cost=cumulative(key,n,m,award);
            const rest=L.subtract(p,[cost]);
            // These are additive balances relative to the represented demand,
            // not an arbitrary-precision evaluation of the nonlinear formula.
            if(m.gt(32)) precision={state:"limited",code:"rounded-bulk",
              message:"批量需求按当前大数精度计算；余量显示不代表数学上的精确耗尽"};
            p=rest;grant(m);
          }
          return true;
        } catch(error) { ({stock,p,rewards,n,precision}=checkpoint);blocked(error);return false; }
      };
      // All reward branches debit the ledger; never merge then clear a residual.
      let resolved=settleProgress();
      while(pending.length) {
        const input=pending[0], gain=L.project(input.gain), demand=requirement(key,n);
        award=L.project(input.award??currentAward);
        if(gain.lt(demand)) {
          // Even if an inverse is unresolved, uncapped input is safe to bank.
          try {p=L.add(p,L.scale(input.units,gain));pending.shift();}
          catch(error) {blocked(error);break;}
          resolved=settleProgress();continue;
        }
        if(!resolved) break;
        const checkpoint={stock,p,rewards,n,precision};
        try {
          // In the capped stages, progress / current demand is a fractional
          // reward-event credit. Keep its low words while changing stage rates.
          const atCurrentRate=L.add(p,L.scale(input.units,demand));
          if(L.compare(atCurrentRate,[demand])<0) p=atCurrentRate;
          else {
            let credits=L.add(L.scale(p,ONE.div(demand)),input.units);
            const r=rules[key], capN=r.type==="exponential"
              ? BN(gain).div(r.base).ln().div(ONE.div(r.q).ln())
              : BN(gain).div(r.base).pow(1/r.exponent).sub(1).mul(r.scale);
            let m=B.min(L.value(credits).floor(),B.max(0,capN.sub(n).div(award).floor().add(1)));
            if(m.add(1).eq(m) || (m.gt(0) && m.sub(1).eq(m)))
              throw new PrecisionError("cap-unit","来源封顶批数无法区分相邻整数；来源输入已保留");
            for(let i=0;i<12;i++) {
              if(L.compare(credits,[m])>=0 && (m.eq(0) || requirement(key,n.add(m.sub(1).mul(award))).lte(gain))) break;
              const lower=m.sub(1);
              if(lower.eq(m) || i===11) throw new PrecisionError("cap-boundary","宝物封顶边界无法可靠定位；来源输入已保留");
              m=lower;
            }
            credits=L.subtract(credits,[m]);grant(m);
            p=L.scale(credits,B.min(gain,requirement(key,n)));
          }
          pending.shift();resolved=settleProgress();
        } catch(error) {
          ({stock,p,rewards,n,precision}=checkpoint);blocked(error);break;
        }
      }
      L.write(state,key,stock,true); L.write(state,key,p);
      (state.meta.treasureProgressPending ||= {})[key]=pending;
      (state.meta.treasureProgressStatus ||= {})[key]=precision;
      if(L.sign(rewards)>0) { WIS.Core.Effects?.invalidate?.(); rememberQualifications(state); }
      return L.value(rewards);
    });
  }
  function hasUnsettled(state,key) {
    if(state.meta.treasureProgressPending?.[key]?.length)return true;
    const credit=state.meta.treasureCredits?.[key];
    return credit ? BigInt(credit.n)!==0n : L.sign(L.progress(state,key))>0;
  }
  function advanceFixed(state, key, units, input) {
    if (!input?.eligible) return ZERO;
    // No model hook or later-in-segment multiplier/qualification resampling.
    const gain = BN(input.gain), award = BN(input.award);
    const saved = state.meta.treasureCredits?.[key];
    return saved || gain.gte(requirement(key, held(state,key)))
      ? applyCredit(state,key,units,gain,award)
      : applyOrdinary(state,key,units,gain,award);
  }
  function advance(state, key, units, { available = true } = {}) {
    ensure(state);
    if (!available || qualification(state, key) !== null) return ZERO;
    return apply(state, key, units, unitGain(state, key));
  }
  function settle(state, key) { ensure(state); return apply(state, key, ZERO, ZERO); }
  function importLegacyTransient(state, transient) {
    ensure(state);
    if (!transient || state.meta.treasureQualifications.legacyTransientConverted) return;
    state.meta.treasureQualifications.legacyTransientConverted = true;
    for (const [group, field, key] of [
      ["power", "fitnessCardRollAccumulator", "fitnessMembershipCard"], ["power", "skyCrystalRollAccumulator", "skyCrystal"],
      ["power", "cosmicFiberRollAccumulator", "cosmicFiber"], ["power", "cosmicWillRollAccumulator", "cosmicWill"],
      ["cultivation", "passiveManaRollAccumulator", "tianNiPearl"], ["cultivation", "baLingChiRollAccumulator", "baLingChi"]]) {
      const units = B.min(1, nonnegative(transient[group]?.[field]));
      const gained = units.mul(B.min(unitGain(state, key), requirement(key, held(state, key))));
      const saved=state.meta.treasureCredits?.[key];
      if(saved){const C=L.Credit,p=C.plus(C.actual(saved),C.fromDecimal(gained));
        state.meta.treasureCredits[key]=C.store(p,ONE);}
      else L.write(state,key,L.add(L.progress(state,key),[gained]));
    }
  }
  function view(state, key) {
    ensure(state);
    const S = WIS.Power.ScaleLogic, I = WIS.Cultivation.ImmortalLogic;
    const reason = qualification(state, key), sources = [];
    let rate = ZERO;
    const addSource = (name, units) => {
      sources.push(name); rate = rate.add(nonnegative(units).mul(B.min(unitGain(state, key), requirement(key, held(state, key)))));
    };
    if (!reason) {
      if (explorationKeys.includes(key)) addSource("有效探寻量", I.automaticExplorationAmountPerSecond());
      if (["tianNiPearl", "baLingChi"].includes(key)) addSource("周天；成功吐纳另计", I.circulationManaPerSecond().gt(0) ? 1 : 0);
      if (["fitnessMembershipCard", "superLollipop"].includes(key)) addSource("健身实际产生 J", S.fitnessJBonus().gt(0) ? 1 : 0);
      if (key === "skyCrystal") addSource("打岩实际产生战力", S.rockPowerPerSecond().gt(0) ? 1 : 0);
      if (key === "fiveSpiritStone") addSource("极意实际产生战力", S.ultimateIntentPowerSource().gt(0) ? 1 : 0);
      if (["immortalCrystal", "fiveElementsTreasure"].includes(key)) addSource("实际产生仙灵力", I.immortalPowerPerSecond().gt(0) ? 1 : 0);
      if (["cosmicFiber", "cosmicWill"].includes(key)) addSource("当前量级有效时间", 1);
    }
    const progress = L.value(L.progress(state,key));
    const demand = requirement(key, held(state, key));
    let precision=state.meta.treasureProgressStatus?.[key]||null;
    const pending=state.meta.treasureProgressPending?.[key]||[];
    let remainingSign=0,remainingValue=ZERO;
    if(precision?.state!=="blocked") {
      try {
        const credit=state.meta.treasureCredits?.[key];
        if(credit) {
          const C=L.Credit,remaining=C.minus(C.fromDecimal(demand),C.actual(credit));
          remainingSign=remaining.n>0n?1:remaining.n<0n?-1:0;remainingValue=C.value(remaining);
        } else {const remaining=L.subtract([demand],L.progress(state,key));
          remainingSign=L.sign(remaining);remainingValue=L.value(remaining);}}
      catch(error) {if(!(error instanceof L.LedgerError)) throw error;
        precision={state:"blocked",code:"remaining-resolution",message:"剩余需求暂无法可靠分辨；保留原账本，未据此清零"};}
    }
    const remainingSeconds=precision?.state==="blocked" || !rate.gt(0) ? null
      : remainingSign<=0 ? ZERO : remainingValue.div(rate);
    return { progress, demand, rate, sources, precision, pendingInputs:pending.length,
      remainingPositive:remainingSign>0, award: T.getTreasureAwardMultiplier(state, key),
      remainingSeconds,
      pausedReason: reason || (rate.gt(0) ? null : `来源暂无实际产出${sources.length ? `（${sources.join("、")}）` : ""}`) };
  }
  function boundarySnapshot(state) {
    // One explicitly qualified/migrated confirmed state. The caller owns this
    // snapshot only until that state advances or is restored; no global ETA
    // cache survives inventory, progress, rate or eligibility changes.
    ensure(state);
    const S=WIS.Power.ScaleLogic,I=WIS.Cultivation.ImmortalLogic,cache=new Map();
    const once=(name,calculate)=>{if(!cache.has(name))cache.set(name,calculate());return cache.get(name);};
    const rows=T.keys.map(key=>{
      const reason=qualification(state,key);
      if(reason)return {key,pausedReason:reason,remainingSeconds:null};
      let units=ZERO;
      if(explorationKeys.includes(key))units=once('exploration',()=>I.automaticExplorationAmountPerSecond());
      const produced=(name,fn)=>once(name,()=>fn().gt(0)?ONE:ZERO);
      if(['tianNiPearl','baLingChi'].includes(key))units=units.add(produced('circulation',()=>I.circulationManaPerSecond()));
      if(['fitnessMembershipCard','superLollipop'].includes(key))units=units.add(produced('fitness',()=>S.fitnessJBonus()));
      if(key==='skyCrystal')units=units.add(produced('rock',()=>S.rockPowerPerSecond()));
      if(key==='fiveSpiritStone')units=units.add(produced('intent',()=>S.ultimateIntentPowerSource()));
      if(['immortalCrystal','fiveElementsTreasure'].includes(key))units=units.add(produced('immortalPower',()=>I.immortalPowerPerSecond()));
      if(['cosmicFiber','cosmicWill'].includes(key))units=units.add(ONE);
      if(!units.gt(0)||state.meta.treasureProgressStatus?.[key]?.state==='blocked')
        return {key,pausedReason:'inactive-or-protected',remainingSeconds:null};
      const r=rules[key],demand=requirement(key,held(state,key));
      let gain=once(r.immortal?'immortalMultiplier':'ordinaryMultiplier',()=>BN(r.immortal?
        I.immortalTreasureChanceMultiplier():T.getTreasureChanceMultiplier(state))).mul(r.coefficient);
      if(key==='skyCrystal')gain=gain.mul(ONE.add(ONE.add(BN(S.effectiveRockLevel()).div(1000)).log10()));
      const rate=nonnegative(units).mul(B.min(gain,demand));
      let remaining;
      try {
        const credit=state.meta.treasureCredits?.[key];
        remaining=credit?L.Credit.value(L.Credit.minus(L.Credit.fromDecimal(demand),L.Credit.actual(credit)))
          :L.value(L.subtract([demand],L.progress(state,key)));
      } catch(error) {
        if(!(error instanceof L.LedgerError))throw error;
        return {key,pausedReason:'remaining-resolution',remainingSeconds:null};
      }
      return {key,pausedReason:rate.gt(0)?null:'inactive',remainingSeconds:rate.gt(0)?B.max(ZERO,remaining).div(rate):null};
    });
    // The two independent exploration systems have their own real boundaries;
    // ordinary treasure multipliers must not be applied to either rate.
    if(state.cultivation.active==='immortal'&&WIS.Cultivation.ExplorationProgress)
      rows.push(...WIS.Cultivation.ExplorationProgress.boundaries(state,once('exploration',()=>I.automaticExplorationAmountPerSecond())));
    return rows;
  }
  WIS.Meta.TreasureProgress = Object.freeze({ rules, explorationKeys, requirement, cumulative, affordable, unitGain,
    ensure, advance, advanceFixed, hasUnsettled, settle, qualification, rememberQualifications, importLegacyTransient, view, boundarySnapshot,
    diagnostics:state=>({evaluations:{...evaluatedEvents},committed:state.meta.treasureDiagnostics||null}) });
}(window.WIS));
