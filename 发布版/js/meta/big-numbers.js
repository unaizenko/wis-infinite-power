(function defineSymbolicBigNumbers(WIS) {
  "use strict";
  // Only coefficients enter BigNum. Symbols and Graham numbers are never expanded.
  const B = WIS.Core.BigNum;
  const SYMBOLS = Object.freeze(["Y", "Y↑Y", "Y↑↑Y", "Y↑↑↑Y", "Y↑↑↑↑Y"]);
  const COSTS = Object.freeze([1, 300, 600, 1200, 2400]);
  const MILESTONES = Object.freeze([2, 4, 8, 16, 32, 64]);
  const COSMIC = WIS.Core.Config.scales.findIndex(s => s.name === "宇宙结构");
  const ledger = () => {
    if (!WIS.Meta.TreasureLedger) throw Error("大数系数账本尚未加载");
    return WIS.Meta.TreasureLedger;
  };
  const entry = () => ({ amount: B.BN(0), residual: [], total: B.BN(0), totalResidual: [],
    spent: B.BN(0), spentResidual: [], peak: B.BN(0) });
  function fresh() {
    return { version: 1, unlocked: false, fractalLevel: 0, purchases: [false, false, false, false, false],
      resources: SYMBOLS.map(entry), gIndex: 0, superProgress: B.BN(0), superResidual: [],
      beyondFractal: false, elapsedSeconds: 0 };
  }
  const nonnegative = v => {
    if (!B.isFiniteBN(v ?? 0) || B.lt(v ?? 0, 0)) throw Error("大数存档包含非法系数");
    return B.BN(v ?? 0);
  };
  function normalize(raw) {
    const n = fresh();
    if (!raw || typeof raw !== "object") return n;
    const integer = (v, cap) => Math.max(0, Math.min(cap, Math.floor(Number(v) || 0)));
    n.unlocked = raw.unlocked === true;
    n.fractalLevel = integer(raw.fractalLevel, 5);
    n.purchases = SYMBOLS.map((_, i) => i < n.fractalLevel);
    n.gIndex = n.fractalLevel === 5 ? Math.max(1, integer(raw.gIndex, 64)) : 0;
    n.beyondFractal = raw.beyondFractal === true || n.fractalLevel === 5;
    n.elapsedSeconds = Number.isFinite(raw.elapsedSeconds) ? Math.max(0, raw.elapsedSeconds) : 0;
    const tails = v => Array.isArray(v) ? v.map(String) : [];
    n.resources = SYMBOLS.map((_, i) => {
      const e = raw.resources?.[i] || {};
      return { amount: nonnegative(e.amount), residual: tails(e.residual), total: nonnegative(e.total),
        totalResidual: tails(e.totalResidual), spent: nonnegative(e.spent), spentResidual: tails(e.spentResidual),
        peak: nonnegative(e.peak) };
    });
    n.superProgress = nonnegative(raw.superProgress);
    n.superResidual = tails(raw.superResidual);
    return n;
  }
  function get(state) {
    if (!state.meta.bigNumbers?.resources) state.meta.bigNumbers = normalize(state.meta.bigNumbers);
    return state.meta.bigNumbers;
  }
  function requirements(state) {
    return { cosmic: COSMIC >= 0 && Math.max(state.highestScaleIndex || 0, state.lifetimeHighestScaleIndex || 0) >= COSMIC,
      achievement: state.unlockedAchievements?.[`trueScale${COSMIC}`] === true };
  }
  function syncUnlock(state) {
    const n = get(state), r = requirements(state);
    if (r.cosmic && r.achievement) n.unlocked = true;
    if (n.beyondFractal && !state.unlockedAchievements.beyondFractal) {
      if (WIS.Meta.Achievements?.record) WIS.Meta.Achievements.record(state, "beyondFractal");
      else state.unlockedAchievements.beyondFractal = true;
    }
    return n.unlocked;
  }
  function terms(e, field = "amount") {
    const tail = field === "amount" ? "residual" : `${field}Residual`;
    return ledger().normalize([e[field], ...(e[tail] || [])]);
  }
  function write(e, words, field = "amount") {
    const L = ledger(), normalized = L.normalize(words);
    if (L.sign(normalized) < 0) throw Error("大数系数余额不足，未提交");
    const main = L.value(normalized);
    e[field] = main;
    e[field === "amount" ? "residual" : `${field}Residual`] = L.subtract(normalized, [main]);
  }
  const amount = (state, order) => ledger().value(terms(get(state).resources[order]));
  function credit(e, gain) {
    if (!B.isFiniteBN(gain) || B.lt(gain, 0)) throw Error("大数新增收益无效，未提交");
    if (B.eq(gain, 0)) return;
    write(e, ledger().add(terms(e), [gain]));
    write(e, ledger().add(terms(e, "total"), [gain]), "total");
    e.peak = B.max(e.peak, e.amount);
  }
  // Copy only this independent domain. Rejecting a purchase/update leaves it intact.
  function transaction(state, work) {
    const before = get(state), copy = { ...before, purchases: before.purchases.slice(),
      resources: before.resources.map(e => ({ ...e })), superResidual: before.superResidual.slice() };
    state.meta.bigNumbers = copy;
    try { return work(copy); } catch (error) { state.meta.bigNumbers = before; throw error; }
  }
  function baseYRate(power) { return B.div(B.log10(B.max(1, power)), "1e8"); }
  function intervalYGain(startPower, endPower, seconds, stepSeconds = 0.1) {
    const a = baseYRate(startPower), b = baseYRate(endPower), frames = seconds / stepSeconds;
    if (!(frames > 1)) return B.mul(b, seconds);
    if (B.eq(a, b)) return B.mul(b, seconds);
    if (!B.gt(a, 0) || !B.gt(b, 0)) {
      // Linear endpoint model for crossing zero; sum its discrete samples.
      return B.mul(B.add(B.div(B.add(a, b), 2), B.div(B.sub(b, a), 2 * frames)), seconds);
    }
    const delta = B.sub(B.log10(b), B.log10(a));
    const logStep = B.div(delta, frames), rising = B.gt(delta, 0);
    const x = B.toNumber(B.mul(B.abs(logStep), Math.LN10), Infinity);
    if (x < 1e-12) return B.mul(B.div(B.add(a, b), 2), seconds);
    // r + ... + r^N, anchored to the larger endpoint. expm1 avoids
    // cancellation near r=1; never enumerate N original logic frames.
    const ratio = Number.isFinite(x) ? -Math.expm1(-x * frames) / -Math.expm1(-x) : 1;
    const anchor = rising ? b : B.mul(a, B.pow10(logStep));
    return B.mul(B.mul(anchor, ratio), stepSeconds);
  }
  function rates(state) {
    const n = get(state);
    return SYMBOLS.map((_, i) => !n.unlocked ? B.ZERO : i === 0
      ? B.add(baseYRate(state.power), n.fractalLevel >= 1 ? 1 : 0)
      : B.BN(n.fractalLevel >= i + 1 ? 1 : 0));
  }
  function canPurchase(state, level) {
    if (!Number.isInteger(level) || level < 1 || level > 5 || !syncUnlock(state)) return false;
    if (get(state).fractalLevel !== level - 1) return false;
    return ledger().compare(terms(get(state).resources[Math.max(0, level - 2)]), [COSTS[level - 1]]) >= 0;
  }
  function purchase(state, level) {
    if (!canPurchase(state, level)) return false;
    transaction(state, n => {
      const e = n.resources[Math.max(0, level - 2)], cost = COSTS[level - 1];
      write(e, ledger().subtract(terms(e), [cost]));
      write(e, ledger().add(terms(e, "spent"), [cost]), "spent");
      n.fractalLevel = level; n.purchases[level - 1] = true;
      if (level === 5) { n.gIndex = 1; n.beyondFractal = true; }
    });
    syncUnlock(state);
    return true;
  }
  function milestoneMultiplier(gIndex) {
    return 2 ** MILESTONES.slice(0, -1).filter(g => gIndex >= g).length;
  }
  function fractalMultiplier(q, enabled = true) {
    return enabled ? B.add(1, B.div(B.log10(B.add(1, q)), 10)) : B.BN(1);
  }
  // Integral of M_F(Q+t), Q grows by exactly one coefficient per game second.
  // Stable mean log: log(a) + ((1+x)log1p(x)-x)/x, x=t/a, a=1+Q.
  // Avoid subtracting two huge primitives when t is tiny relative to Q.
  function exposure(q, seconds, enabled = true) {
    if (!(seconds > 0)) return B.ZERO;
    if (!enabled) return B.mul(seconds, "0.008");
    const a = B.add(1, q), ratio = B.div(seconds, a), x = B.toNumber(ratio, Infinity);
    let meanLog;
    if (x < 1e-4) {
      const phi = x / 2 - x*x / 6 + x*x*x / 12;
      meanLog = B.add(B.log10(a), phi / Math.LN10);
    } else if (Number.isFinite(x)) {
      meanLog = B.add(B.log10(a), ((1 + 1/x) * Math.log1p(x) - 1) / Math.LN10);
    } else {
      meanLog = B.sub(B.log10(B.add(a, seconds)), 1 / Math.LN10);
    }
    return B.mul(B.mul(seconds, "0.008"), B.add(1, B.div(meanLog, 10)));
  }
  function advanceGraham(n, seconds, q) {
    if (!n.gIndex) return 0;
    const L = ledger();
    let carried = L.normalize([n.superProgress, ...n.superResidual]);
    // Already-earned overflow is percent, not elapsed exposure: preserve it
    // unchanged when loading a ready boundary (150% => next rank + 50%).
    if (n.gIndex < 64 && L.compare(carried, [100]) >= 0) {
      let levels = Math.min(64 - n.gIndex, Math.max(1, Math.floor(B.toNumber(L.value(carried), 6400) / 100)));
      if (L.compare(carried, [levels * 100]) < 0) levels--;
      carried = L.subtract(carried, [levels * 100]); n.gIndex += levels;
    }
    // Exposure is independent of Graham rank: spend it at rank-dependent prices.
    // At most six milestones, not seconds, frames, individual rewards or G values.
    let k = milestoneMultiplier(n.gIndex), crossings = 0;
    let available = L.add(L.scale(carried, 1/k),
      [exposure(q, seconds, n.beyondFractal)]);
    for (const target of MILESTONES) {
      if (target <= n.gIndex) continue;
      const cost = (target - n.gIndex) * 100 / k;
      if (L.compare(available, [cost]) < 0) break;
      available = L.subtract(available, [cost]);
      n.gIndex = target; k = milestoneMultiplier(target); crossings++;
    }
    let progress = L.scale(available, k);
    if (n.gIndex < 64) {
      let levels = Math.min(64 - n.gIndex, Math.max(0, Math.floor(B.toNumber(L.value(progress), 0) / 100)));
      if (levels > 0 && L.compare(progress, [levels * 100]) < 0) levels--;
      n.gIndex += levels;
      progress = L.subtract(progress, [levels * 100]);
    }
    if (L.sign(progress) < 0) throw Error("超分形进度不能为负，未提交");
    n.superProgress = L.value(progress);
    n.superResidual = L.subtract(progress, [n.superProgress]);
    return crossings;
  }
  function advance(state, seconds, options = {}) {
    if (!Number.isFinite(seconds) || seconds < 0) throw Error("大数结算时间无效");
    if (!syncUnlock(state)) return { milestoneCrossings: 0 };
    return transaction(state, n => {
      const q = amount(state, 4);
      const milestoneCrossings = advanceGraham(n, seconds, q);
      const currentRates = rates(state);
      if (options.endPower !== undefined) currentRates[0] = B.add(baseYRate(options.endPower), n.fractalLevel >= 1 ? 1 : 0);
      let yGain = B.mul(currentRates[0], seconds);
      // Preserve discrete 0.1-second sampling; a continuous log mean would
      // severely undercount rapidly growing Y even with correct endpoints.
      if (options.startPower !== undefined && options.interval === true) {
        yGain = B.add(intervalYGain(options.startPower, options.endPower ?? state.power, seconds, options.stepSeconds),
          n.fractalLevel >= 1 ? seconds : 0);
      }
      for (let i = 0; i < 5; i++) credit(n.resources[i], i === 0 ? yGain : B.mul(currentRates[i], seconds));
      n.elapsedSeconds += seconds;
      return { milestoneCrossings };
    });
  }
  // Validate the new ledger before any old-resource commit. The caller installs
  // this plan only after the original step succeeds; errors cannot replay J gains.
  function prepare(state, seconds, options) {
    const before = get(state), achievements = state.meta.achievements;
    state.meta.bigNumbers = { ...before, purchases: before.purchases.slice(),
      resources: before.resources.map(e => ({ ...e })), superResidual: before.superResidual.slice() };
    state.meta.achievements = { ...achievements };
    try { advance(state, seconds, options); return get(state); }
    finally { state.meta.bigNumbers = before; state.meta.achievements = achievements; }
  }
  function view(state) {
    const n = get(state), currentRates = rates(state), q = amount(state, 4);
    return { ...n, symbols: SYMBOLS, rates: currentRates,
      amounts: SYMBOLS.map((_, i) => amount(state, i)),
      dominantOrder: Math.max(0, n.fractalLevel - 1),
      progress: ledger().value(ledger().normalize([n.superProgress, ...n.superResidual])),
      milestoneMultiplier: milestoneMultiplier(n.gIndex), fractalMultiplier: fractalMultiplier(q, n.beyondFractal),
      speed: n.gIndex ? B.mul("0.008", B.mul(milestoneMultiplier(n.gIndex), fractalMultiplier(q, n.beyondFractal))) : B.ZERO };
  }
  function compareSymbolic(a, b) {
    if (!Number.isInteger(a.order) || !Number.isInteger(b.order) || a.order < 0 || a.order > 5 || b.order < 0 || b.order > 5)
      throw Error("未知大数符号层级");
    for (const v of [a, b]) {
      if (v.order === 5) {
        if (!Number.isInteger(v.gIndex) || v.gIndex < 1 || v.gIndex > 64) throw Error("未知 Graham 阶位");
      } else nonnegative(v.coefficient);
    }
    const ca = a.order === 5 ? B.BN(1) : B.BN(a.coefficient), cb = b.order === 5 ? B.BN(1) : B.BN(b.coefficient);
    if (B.eq(ca, 0) || B.eq(cb, 0)) return ca.cmp(cb);
    return a.order !== b.order ? Math.sign(a.order - b.order) : a.order === 5 ? Math.sign(a.gIndex - b.gIndex) : ca.cmp(cb);
  }
  WIS.Meta.BigNumbers = Object.freeze({ SYMBOLS, COSTS, MILESTONES, fresh, normalize, get, requirements,
    syncUnlock, baseYRate, intervalYGain, rates, amount, canPurchase, purchase, milestoneMultiplier, fractalMultiplier,
    exposure, advance, prepare, view, compareSymbolic, maximumGIndex: 64 });
}(window.WIS));
