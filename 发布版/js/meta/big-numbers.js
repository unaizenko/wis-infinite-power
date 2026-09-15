(function defineSymbolicBigNumbers(WIS) {
  "use strict";
  // Only coefficients enter BigNum. Symbols and Graham numbers are never expanded.
  const B = WIS.Core.BigNum;
  const BASE_SUPER_SPEED = "0.008"; // percent per game second
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
      beyondFractal: false, elapsedSeconds: 0, ySample: null };
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
    if(raw.ySample!=null){
      const remaining=Number(raw.ySample.remaining);
      if(!Number.isFinite(remaining)||remaining<0||remaining>1)throw Error('大数 Y 秒内进度无效');
      n.ySample={remaining,rate:nonnegative(raw.ySample.rate),baseRate:raw.ySample.baseRate==null?null:nonnegative(raw.ySample.baseRate)};
    }
    const tails = v => Array.isArray(v) ? v.map(String) : [];
    const merge=(main,rest)=>{nonnegative(main);return nonnegative(ledger().value(ledger().normalize([main??0,...tails(rest)])));};
    n.resources = SYMBOLS.map((_, i) => {
      const e = raw.resources?.[i] || {};
      // Economic coefficients and statistics merge legacy words once, then
      // retain only their represented Decimal value. Discrete G stays exact.
      return { amount: merge(e.amount,e.residual), residual: [],
        total: merge(e.total,e.totalResidual), totalResidual: [],
        spent: merge(e.spent,e.spentResidual), spentResidual: [],
        peak: nonnegative(e.peak) };
    });
    n.superProgress = merge(raw.superProgress,raw.superResidual);
    n.superResidual = [];
    return n;
  }
  function get(state) {
    // Load/normalize owns persistent initialization; queries only return a view.
    return state.meta.bigNumbers?.resources ? state.meta.bigNumbers : normalize(state.meta.bigNumbers);
  }
  function requirements(state) {
    return { cosmic: COSMIC >= 0 && Math.max(state.highestScaleIndex || 0, state.lifetimeHighestScaleIndex || 0) >= COSMIC,
      achievement: state.unlockedAchievements?.[`trueScale${COSMIC}`] === true };
  }
  function isUnlocked(state) {
    const r = requirements(state);
    return get(state).unlocked || (r.cosmic && r.achievement);
  }
  function syncMilestones(state) {
    if (get(state).gIndex < 64) return;
    state.symbolicPowerMilestones.graham64 = true;
    WIS.Meta.Achievements.record(state, "graham64");
  }
  function syncUnlock(state) {
    if (!state.meta.bigNumbers?.resources) state.meta.bigNumbers = normalize(state.meta.bigNumbers);
    syncMilestones(state);
    const n = get(state), r = requirements(state);
    if (r.cosmic && r.achievement) n.unlocked = true;
    if (n.beyondFractal && !state.unlockedAchievements.beyondFractal) {
      WIS.Meta.Achievements.record(state, "beyondFractal");
    }
    return n.unlocked;
  }
  function terms(e, field = "amount") {
    return [String(B.BN(e[field]))];
  }
  function write(e, words, field = "amount") {
    const L = ledger(), normalized = L.normalize(words);
    if (L.sign(normalized) < 0) throw Error("大数系数余额不足，未提交");
    const main = L.value(normalized);
    e[field] = main;
    e[field === "amount" ? "residual" : `${field}Residual`] = [];
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
  // Official rule: the Y rate is sampled at the START of each second and
  // remains fixed for that second, independently of caller dt or UI cadence.
  // A legacy save has no recoverable historical sample: seed the current
  // partial second from its current state, preserving all previously earned Y.
  function sampledYGain(n,state,seconds,options={}) {
    let remaining=seconds,offset=0,gain=B.ZERO;
    let sample=n.ySample?{...n.ySample}:null;
    while(remaining>1e-10){
      if(!sample||sample.remaining<=1e-10){
        const fraction=sample?0:Math.max(0,n.elapsedSeconds-Math.floor(n.elapsedSeconds));
        const power=options.powerAt?options.powerAt(offset):state.power;
        sample={remaining:fraction>1e-10?1-fraction:1,
          baseRate:baseYRate(power),rate:B.add(baseYRate(power),n.fractalLevel>=1?1:0)};
      }
      const dt=Math.min(remaining,sample.remaining);
      gain=B.add(gain,B.mul(sample.rate,dt));
      remaining=Math.max(0,Number((remaining-dt).toPrecision(14)));
      offset+=dt;sample.remaining=Math.max(0,Number((sample.remaining-dt).toPrecision(14)));
      // Long fixed-source spans with no power trajectory need no per-second loop.
      if(sample.remaining<=1e-10&&remaining>=1&&!options.powerAt){
        const whole=Math.floor(remaining),baseRate=baseYRate(state.power);
        sample={remaining:0,baseRate,rate:B.add(baseRate,n.fractalLevel>=1?1:0)};
        gain=B.add(gain,B.mul(sample.rate,whole));offset+=whole;remaining-=whole;
      }
    }
    if(sample&&sample.remaining<1e-10)sample.remaining=0;
    n.ySample=sample;return gain;
  }
  function currentBaseYRate(state) {
    const sample=get(state).ySample;
    return sample?.remaining>1e-10&&sample.baseRate!=null?sample.baseRate:baseYRate(state.power);
  }
  function rates(state) {
    const n = get(state);
    return SYMBOLS.map((_, i) => !n.unlocked ? B.ZERO : i === 0
      ? n.ySample?.remaining>1e-10?n.ySample.rate:B.add(baseYRate(state.power), n.fractalLevel >= 1 ? 1 : 0)
      : B.BN(n.fractalLevel >= i + 1 ? 1 : 0));
  }
  function canPurchase(state, level) {
    if (!Number.isInteger(level) || level < 1 || level > 5 || !isUnlocked(state)) return false;
    if (get(state).fractalLevel !== level - 1) return false;
    return ledger().compare(terms(get(state).resources[Math.max(0, level - 2)]), [COSTS[level - 1]]) >= 0;
  }
  function purchase(state, level) {
    if (!Number.isInteger(level) || level < 1 || level > 5) return false;
    syncUnlock(state);
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
    if (!enabled) return B.mul(seconds, BASE_SUPER_SPEED);
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
    return B.mul(B.mul(seconds, BASE_SUPER_SPEED), B.add(1, B.div(meanLog, 10)));
  }
  function advanceGraham(n, seconds, q) {
    if (!n.gIndex) return 0;
    let carried=B.BN(n.superProgress);
    if(n.gIndex<64&&carried.gte(100)) {
      const levels=Math.min(64-n.gIndex,Math.floor(B.toNumber(carried,6400)/100));
      carried=B.sub(carried,levels*100);n.gIndex+=levels;
    }
    // Same analytic Q exposure and milestone prices; represented progress,
    // never a growing exact decimal history. The discrete rank stays integral.
    let k=milestoneMultiplier(n.gIndex),crossings=0;
    let available=B.add(B.div(carried,k),exposure(q,seconds,n.beyondFractal));
    for(const target of MILESTONES) {
      if(target<=n.gIndex)continue;
      const cost=(target-n.gIndex)*100/k;
      if(available.lt(cost))break;
      available=B.sub(available,cost);n.gIndex=target;k=milestoneMultiplier(target);crossings++;
    }
    let progress=B.mul(available,k);
    if(n.gIndex<64) {
      const levels=Math.min(64-n.gIndex,Math.max(0,Math.floor(B.toNumber(progress,0)/100)));
      n.gIndex+=levels;progress=B.sub(progress,levels*100);
    }
    if(!progress.isFinite()||progress.lt(0))throw Error('超分形进度无法表示，未提交');
    n.superProgress=progress;n.superResidual=[];return crossings;
  }
  function advance(state, seconds, options = {}) {
    if (!Number.isFinite(seconds) || seconds < 0) throw Error("大数结算时间无效");
    if (!syncUnlock(state)) return { milestoneCrossings: 0 };
    const result = transaction(state, n => {
      const q = amount(state, 4);
      const startingRates = options.fixedSources ? rates(state) : null;
      const milestoneCrossings = options.fixedSources
        ? advanceGrahamFixed(n, seconds, q) : advanceGraham(n, seconds, q);
      const currentRates = startingRates || rates(state);
      if (options.endPower !== undefined) currentRates[0] = B.add(baseYRate(options.endPower), n.fractalLevel >= 1 ? 1 : 0);
      const yGain=options.offlineSnapshot ? B.mul(currentRates[0],seconds) : sampledYGain(n,state,seconds,options);
      if(options.offlineSnapshot)n.ySample=null;
      for (let i = 0; i < 5; i++) credit(n.resources[i], i === 0 ? yGain : B.mul(currentRates[i], seconds));
      n.elapsedSeconds += seconds;
      return { milestoneCrossings };
    });
    syncMilestones(state);
    return result;
  }
  function advanceGrahamFixed(n, seconds, q) {
    if (!n.gIndex) return 0;
    const oldIndex=n.gIndex, L=ledger();
    const rate=B.mul(BASE_SUPER_SPEED,B.mul(milestoneMultiplier(oldIndex),fractalMultiplier(q,n.beyondFractal)));
    let progress=[B.add(n.superProgress,B.mul(rate,seconds))];
    if(oldIndex<64) {
      let levels=Math.min(64-oldIndex,Math.max(0,Math.floor(B.toNumber(L.value(progress),6400)/100)));
      if(levels>0&&L.compare(progress,[levels*100])<0) levels--;
      progress=L.subtract(progress,[levels*100]);n.gIndex+=levels;
    }
    n.superProgress=L.value(progress);n.superResidual=[];
    return MILESTONES.filter(value=>value>oldIndex&&value<=n.gIndex).length;
  }
  // Validate the new ledger before any old-resource commit. The caller installs
  // this plan only after the original step succeeds; errors cannot replay J gains.
  function prepare(state, seconds, options) {
    const before = get(state), achievements = state.meta.achievements, milestones = state.meta.milestones;
    state.meta.bigNumbers = { ...before, purchases: before.purchases.slice(),
      resources: before.resources.map(e => ({ ...e })), superResidual: before.superResidual.slice() };
    state.meta.achievements = { ...achievements };
    state.meta.milestones = { ...milestones };
    try { advance(state, seconds, options); return get(state); }
    finally { state.meta.bigNumbers = before; state.meta.achievements = achievements; state.meta.milestones = milestones; }
  }
  function view(state) {
    const n = get(state), currentRates = rates(state), q = amount(state, 4);
    return { ...n, symbols: SYMBOLS, rates: currentRates,
      amounts: SYMBOLS.map((_, i) => amount(state, i)),
      dominantOrder: Math.max(0, n.fractalLevel - 1),
      progress: ledger().value(ledger().normalize([n.superProgress, ...n.superResidual])),
      milestoneMultiplier: milestoneMultiplier(n.gIndex), fractalMultiplier: fractalMultiplier(q, n.beyondFractal),
      baseSpeed: n.gIndex ? B.BN(BASE_SUPER_SPEED) : B.ZERO,
      speed: n.gIndex ? B.mul(BASE_SUPER_SPEED, B.mul(milestoneMultiplier(n.gIndex), fractalMultiplier(q, n.beyondFractal))) : B.ZERO };
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
  WIS.Meta.BigNumbers = Object.freeze({ BASE_SUPER_SPEED, SYMBOLS, COSTS, MILESTONES, fresh, normalize, get, requirements, isUnlocked,
    syncUnlock, syncMilestones, baseYRate, currentBaseYRate, sampledYGain, rates, amount, canPurchase, purchase, milestoneMultiplier, fractalMultiplier,
    exposure, advance, prepare, view, compareSymbolic, maximumGIndex: 64 });
}(window.WIS));
