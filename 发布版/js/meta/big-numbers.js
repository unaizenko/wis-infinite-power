(function defineSymbolicBigNumbers(WIS) {
  "use strict";
  // Only coefficients enter BigNum. Symbols and Graham numbers are never expanded.
  const B = WIS.Core.BigNum, I=WIS.Meta.Infinity, IC=WIS.Meta.InfinityConfig;
  const maximumG = state => I.has(state,'D1-1') ? Number.MAX_SAFE_INTEGER : 64;
  const maximumTree = state => I.has(state,'D1-2') ? Number.MAX_SAFE_INTEGER : 3;
  const BASE_SUPER_SPEED = "0.008"; // percent per game second
  const MAX_TREE_RANK = 3;
  const TREE_WORK_BASE = "1e9", TREE_INDEX_BASE = "1e6";
  const TREE_UPGRADES = Object.freeze({
    node: Object.freeze({ name: "节点构造", description: "提升有限根树的构造效率。", cost: 10, growth: 3, effect: 2 }),
    branch: Object.freeze({ name: "分枝构造", description: "扩大不同树形结构的搜索范围。", cost: 100, growth: 6, effect: 1.5 }),
    label: Object.freeze({ name: "标签构造", description: "提高高阶坏序列中标记结构的搜索效率。", cost: 300, growth: 8, effect: 1.6 })
  });
  function freshTree() {
    return { rank: 0, phase: "explicit", construction: B.BN(0), totalConstruction: B.BN(0), sequenceWork: B.BN(0),
      upgrades: { node: 0, branch: 0, label: 0 }, superEntryMultiplier: 1, superProgress: 0 };
  }
  function normalizeTree(raw, legacyComplete = false) {
    const t = freshTree();
    if (raw != null && (typeof raw !== "object" || Array.isArray(raw))) throw Error("TREE 存档无效");
    const integer = v => {
      const x = Number(v ?? 0);
      if (!Number.isSafeInteger(x) || x < 0) throw Error("TREE 等级无效");
      return x;
    };
    if (raw) {
      t.rank = integer(raw.rank);
      if (t.rank > Number.MAX_SAFE_INTEGER || (t.rank > 0 && t.rank < 3)) throw Error("TREE 阶位未开放");
      for (const key of ["construction", "totalConstruction", "sequenceWork"]) {
        const value = B.parseFinite(raw[key] ?? 0);
        if (!value || value.lt(0)) throw Error("TREE 存档包含非法数值");
        t[key] = value;
      }
      for (const key of Object.keys(TREE_UPGRADES)) t.upgrades[key] = integer(raw.upgrades?.[key]);
      for (const key of ["superEntryMultiplier", "superProgress"]) {
        const value = Number(raw[key] ?? t[key]);
        if (!Number.isFinite(value)) throw Error("TREE 超构造数值无效");
        t[key] = Math.max(key === "superProgress" ? 0 : 1, Math.min(key === "superProgress" ? 1 : 2.5, value));
      }
      if (![undefined, "explicit", "super", "complete"].includes(raw.phase)) throw Error("TREE 阶段无效");
      t.phase = raw.phase || "explicit";
    }
    // Permanent achievements never restore current-run TREE progress.
    if (t.rank >= 3 && t.phase === "complete") {
      t.phase = "complete"; t.superProgress = 1;
    } else if (t.phase === "complete") throw Error("TREE 完成状态缺少阶位");
    if (t.phase === "explicit") { t.superEntryMultiplier = 1; t.superProgress = 0; }
    return t;
  }
  const cloneTree = t => ({ ...t, upgrades: { ...t.upgrades } });
  const SYMBOLS = Object.freeze(["Y", "Y↑Y", "Y↑↑Y", "Y↑↑↑Y", "Y↑↑↑↑Y"]);
  const COSTS = Object.freeze([1, 300, 600, 1200, 2400]);
  const MILESTONES = Object.freeze([2, 4, 8, 16, 32, 64]);
  const ledger = () => {
    if (!WIS.Meta.TreasureLedger) throw Error("大数系数账本尚未加载");
    return WIS.Meta.TreasureLedger;
  };
  const entry = () => ({ amount: B.BN(0), residual: [], total: B.BN(0), totalResidual: [],
    spent: B.BN(0), spentResidual: [], peak: B.BN(0) });
  function fresh() {
    return { version: 1, unlocked: false, fractalLevel: 0, purchases: [false, false, false, false, false],
      resources: SYMBOLS.map(entry), gIndex: 0, superProgress: B.BN(0), superResidual: [],
      beyondFractal: false, elapsedSeconds: 0, ySample: null, tree: freshTree() };
  }
  const nonnegative = v => {
    if (!B.isFiniteBN(v ?? 0) || B.lt(v ?? 0, 0)) throw Error("大数存档包含非法系数");
    return B.BN(v ?? 0);
  };
  function normalize(raw, legacyTreeComplete = false) {
    const n = fresh();
    n.tree = normalizeTree(raw?.tree, legacyTreeComplete);
    if (!raw || typeof raw !== "object") return n;
    const integer = (v, cap) => Math.max(0, Math.min(cap, Math.floor(Number(v) || 0)));
    n.unlocked = raw.unlocked === true;
    n.fractalLevel = integer(raw.fractalLevel, 5);
    n.purchases = SYMBOLS.map((_, i) => i < n.fractalLevel);
    n.gIndex = n.fractalLevel === 5 ? Math.max(1, integer(raw.gIndex, Number.MAX_SAFE_INTEGER)) : 0;
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
    return { power: B.gte(state.power, "1e100") };
  }
  function isUnlocked(state) {
    const r = requirements(state);
    return get(state).unlocked || r.power;
  }
  function syncMilestones(state) {
    if (get(state).tree?.rank >= 3) {
      state.symbolicPowerMilestones.tree3 = true;
      WIS.Meta.Achievements.record(state, "tree3");
    }
    if (get(state).gIndex < 64) return;
    state.symbolicPowerMilestones.graham64 = true;
    WIS.Meta.Achievements.record(state, "graham64");
  }
  function syncUnlock(state) {
    if (!state.meta.bigNumbers?.resources || !state.meta.bigNumbers.tree) state.meta.bigNumbers = normalize(state.meta.bigNumbers);
    syncMilestones(state);
    const n = get(state), r = requirements(state);
    if (r.power) n.unlocked = true;
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
      resources: before.resources.map(e => ({ ...e })), superResidual: before.superResidual.slice(), tree: cloneTree(before.tree || freshTree()) };
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
      : B.BN(n.fractalLevel >= i + 1 ? 1 : 0)).map((rate,i)=>B.mul(rate,I.fractalGainMultiplier(state,i)));
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
  const treeState = state => get(state).tree || freshTree();
  const treeUnlocked = state => WIS.Meta.Achievements.has(state, "googol") && get(state).gIndex >= 64;
  const targetTreeRank = state => treeState(state).rank < 3 ? 3 : treeState(state).rank + 1;
  const treeSuperThresholdWork = (state, _target) => B.pow(IC.treeWork,state.activeChallenge==='trueTree3'?IC.treeChallengeExponent:1);
  const treeSuperSeconds = target => IC.treeSeconds * Math.pow(IC.treeTimeGrowth, target - 3);
  const treeEffect = (state, key) => B.pow(TREE_UPGRADES[key].effect, treeState(state).upgrades[key]);
  const treeUpgradeCost = (state, key) => {
    const rule = TREE_UPGRADES[key];
    if (!rule) throw Error("未知 TREE 强化");
    return B.mul(rule.cost, B.pow(rule.growth, treeState(state).upgrades[key]));
  };
  const treeConstructionRate = state => B.mul(B.mul(B.div(get(state).gIndex, 64), treeEffect(state, "node")), I.treeGainMultiplier(state));
  const treeConstructionGain = (state, seconds) => B.mul(treeConstructionRate(state), seconds);
  function treeSequenceGain(state, constructionGain) {
    const baseWork = B.mul(constructionGain, treeEffect(state, "branch"));
    const remaining = B.max(0, B.sub(treeSuperThresholdWork(state, targetTreeRank(state)), treeState(state).sequenceWork));
    const before = B.min(baseWork, remaining);
    return B.add(before, B.mul(B.sub(baseWork, before), treeEffect(state, "label")));
  }
  function treeSequenceIndex(work) {
    return B.max(1, B.mul(TREE_INDEX_BASE, B.pow(B.div(work, TREE_WORK_BASE), B.lte(work, TREE_WORK_BASE) ? 0.8 : 0.5)));
  }
  function treeSuperMultiplier(state) {
    const i = treeSequenceIndex(treeState(state).sequenceWork);
    return B.toNumber(B.min(2.5, B.max(1, B.add(1, B.mul(0.35, B.log10(B.div(i, TREE_INDEX_BASE)))))), 1);
  }
  const treeSuperSpeed = state => treeState(state).superEntryMultiplier / treeSuperSeconds(targetTreeRank(state));
  const treeActive = state => treeUnlocked(state) && targetTreeRank(state) <= maximumTree(state);
  function canPurchaseTreeUpgrade(state, key) {
    return Object.hasOwn(TREE_UPGRADES, key) && treeActive(state) && treeState(state).phase === "explicit"
      && (key !== "label" || B.gte(treeState(state).sequenceWork, treeSuperThresholdWork(state, targetTreeRank(state))))
      && treeState(state).upgrades[key] < Number.MAX_SAFE_INTEGER && B.gte(treeState(state).construction, treeUpgradeCost(state, key));
  }
  function purchaseTreeUpgrade(state, key) {
    if (!canPurchaseTreeUpgrade(state, key)) return false;
    WIS.Core.Runtime.assertMutable();
    transaction(state, n => {
      if (!WIS.Core.Resources.spend("meta.bigNumbers.construction", treeUpgradeCost(state, key), state)) throw Error("树构造点支付失败");
      n.tree.upgrades[key]++;
    });
    return true;
  }
  const canEnterTreeSuper = state => treeActive(state) && treeState(state).phase === "explicit"
    && B.gte(treeState(state).sequenceWork, treeSuperThresholdWork(state, targetTreeRank(state)));
  function enterTreeSuper(state) {
    if (!canEnterTreeSuper(state)) return false;
    WIS.Core.Runtime.assertMutable();
    transaction(state, n => { n.tree.superEntryMultiplier = treeSuperMultiplier(state); n.tree.superProgress = 0; n.tree.phase = "super"; });
    return true;
  }
  function startNextTree(state) {
    if (!treeActive(state) || treeState(state).phase !== "complete") return false;
    WIS.Core.Runtime.assertMutable();
    transaction(state, n => { n.tree = { ...freshTree(), rank: n.tree.rank, upgrades: { ...n.tree.upgrades } }; });
    return true;
  }
  function advanceTree(state, seconds) {
    if (!treeActive(state)) return;
    const t = treeState(state);
    if (t.phase === "explicit") {
      const gain = treeConstructionGain(state, seconds);
      t.construction = nonnegative(B.add(t.construction, gain));
      t.totalConstruction = nonnegative(B.add(t.totalConstruction, gain));
      t.sequenceWork = nonnegative(B.add(t.sequenceWork, treeSequenceGain(state, gain)));
    } else if (t.phase === "super") {
      const remaining = (1 - t.superProgress) / treeSuperSpeed(state);
      t.superProgress = seconds >= remaining ? 1 : Math.min(1, t.superProgress + seconds * treeSuperSpeed(state));
      if (t.superProgress >= 1) { t.rank = targetTreeRank(state); t.phase = "complete"; }
    }
  }
  function treeView(state) {
    const t = treeState(state), target = targetTreeRank(state), unlocked = treeUnlocked(state);
    const sequenceIndex = treeSequenceIndex(t.sequenceWork), currentIndex = sequenceIndex.floor();
    const thresholdIndex = treeSequenceIndex(treeSuperThresholdWork(state, target));
    const labelActive = B.gte(t.sequenceWork, treeSuperThresholdWork(state, target));
    return { ...cloneTree(t), unlocked, target, labels: target, available: target <= maximumTree(state),
      sequenceIndex, currentIndex, nextIndex: B.add(currentIndex, 1), sequenceProgress: B.toNumber(B.sub(sequenceIndex, currentIndex), 0),
      thresholdIndex, unlockProgress: B.toNumber(B.min(1, B.max(0, B.div(sequenceIndex, thresholdIndex))), 0),
      constructionRate: unlocked && t.phase === "explicit" && target <= maximumTree(state) ? treeConstructionRate(state) : B.ZERO,
      superMultiplier: t.phase === "explicit" ? treeSuperMultiplier(state) : t.superEntryMultiplier,
      remainingSeconds: t.phase === "super" ? (1 - t.superProgress) / treeSuperSpeed(state) : 0,
      canEnter: canEnterTreeSuper(state), upgrades: Object.fromEntries(Object.entries(TREE_UPGRADES).map(([key, rule]) =>
        [key, { ...rule, level: t.upgrades[key], multiplier: treeEffect(state, key), active: key !== "label" || labelActive,
          cost: treeUpgradeCost(state, key), canPurchase: canPurchaseTreeUpgrade(state, key) }])) };
  }
  // Only structural TREE changes invalidate predictors. Work/progress remains a fresh interval input.
  const treeSignature = state => { const t = treeState(state); return [treeUnlocked(state), t.rank, t.phase, t.upgrades.node, t.upgrades.branch, t.upgrades.label, t.superEntryMultiplier]; };
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
      const oldIndex = n.gIndex;
      const startingRates = options.fixedSources ? rates(state) : null;
      const modified = I.has(state,'D1-1') || I.has(state,'D2-1') || I.has(state,'D4') || I.completed(state,'trueG1') || I.completed(state,'trueGraham') || ['trueG1','trueGraham'].includes(state.activeChallenge);
      let crossingSeconds=seconds;
      if(modified && oldIndex>0 && oldIndex<64){
        const probe={...n};advanceGrahamInfinity(probe,seconds,q,state,options,64);
        if(probe.gIndex>=64){let lo=0,hi=seconds;for(let j=0;j<52;j++){const mid=(lo+hi)/2,p={...n};advanceGrahamInfinity(p,mid,q,state,options,64);if(p.gIndex>=64)hi=mid;else lo=mid;}crossingSeconds=hi;}
      }
      const milestoneCrossings = modified ? advanceGrahamInfinity(n,seconds,q,state,options) : options.fixedSources
        ? advanceGrahamFixed(n, seconds, q) : advanceGraham(n, seconds, q);
      let treeSeconds = 0;
      if (n.gIndex >= 64 && treeUnlocked(state)) {
        if (oldIndex >= 64) treeSeconds = seconds;
        else if (modified) treeSeconds=Math.max(0,seconds-crossingSeconds);
        else if (options.fixedSources) {
          // Graham's existing fixed rate determines the crossing time directly.
          const oldRate = B.mul(BASE_SUPER_SPEED, B.mul(milestoneMultiplier(oldIndex), fractalMultiplier(q, n.beyondFractal)));
          const remaining = Math.max(0, Math.min(seconds, B.toNumber(B.div(n.superProgress, oldRate), seconds)));
          treeSeconds = remaining;
        } else {
          // Q belongs only to the unchanged Graham gate. Convert its consumed
          // work to elapsed time once; TREE income itself depends only on G.
          const consumed = B.max(0, B.sub(exposure(q, seconds), B.div(n.superProgress, milestoneMultiplier(64))));
          treeSeconds = seconds - grahamExposureSeconds(q, consumed, seconds);
        }
      }
      advanceTree(state, treeSeconds);
      const currentRates = startingRates || rates(state);
      if (options.endPower !== undefined) currentRates[0] = B.add(baseYRate(options.endPower), n.fractalLevel >= 1 ? 1 : 0);
      const yGain=options.offlineSnapshot ? B.mul(currentRates[0],seconds) : B.mul(sampledYGain(n,state,seconds,options),I.fractalGainMultiplier(state,0));
      if(options.offlineSnapshot)n.ySample=null;
      for (let i = 0; i < 5; i++) credit(n.resources[i], i === 0 ? yGain : B.mul(currentRates[i], seconds));
      n.elapsedSeconds += seconds;
      return { milestoneCrossings };
    });
    syncMilestones(state);
    return result;
  }
  function advanceGrahamInfinity(n,seconds,q,state,options={},cap=maximumG(state)) {
    if(!n.gIndex)return 0;
    const old=n.gIndex, qRate=I.fractalGainMultiplier(state,4), speed=I.gSpeedMultiplier(state);
    const work=options.fixedSources?B.mul(seconds,B.mul(BASE_SUPER_SPEED,fractalMultiplier(q,n.beyondFractal))):
      B.eq(qRate,1)?exposure(q,seconds,n.beyondFractal):B.div(exposure(q,B.mul(seconds,qRate),n.beyondFractal),qRate);
    if(!B.isFiniteBN(work))throw Error('无限超分形时间无法表示');
    let available=B.add(B.div(n.superProgress,milestoneMultiplier(n.gIndex)),B.mul(work,speed));
    const ratio=state.activeChallenge==='trueGraham'?B.pow(IC.gRequirement,IC.gChallengeCoefficient):B.BN(1);
    for(const end of [...MILESTONES.filter(x=>x>n.gIndex&&x<cap),cap]){
      if(n.gIndex>=end)continue;
      const k=milestoneMultiplier(n.gIndex),req=I.gRequirement(state,n.gIndex),maxLevels=end-n.gIndex;
      const estimate=B.eq(ratio,1)?B.div(B.mul(available,k),req):B.div(B.log10(B.add(1,B.div(B.mul(B.mul(available,k),B.sub(ratio,1)),req))),B.log10(ratio));
      let levels=Math.min(maxLevels,Math.max(0,Math.floor(B.toNumber(B.min(estimate,maxLevels),0))));
      const cost=count=>B.div(B.mul(req,B.eq(ratio,1)?count:B.div(B.sub(B.pow(ratio,count),1),B.sub(ratio,1))),k);
      if(levels>0&&B.gt(cost(levels),available))levels--;
      if(levels<maxLevels&&B.lte(cost(levels+1),available))levels++;
      available=B.sub(available,cost(levels));n.gIndex+=levels;
      if(n.gIndex<end)break;
    }
    n.superProgress=B.mul(available,milestoneMultiplier(n.gIndex));n.superResidual=[];
    return MILESTONES.filter(g=>g>old&&g<=n.gIndex).length;
  }
  function grahamExposureSeconds(q, work, limit) {
    // Invert the existing monotone convex Graham integral at a G64 crossing.
    // Starting from an upper bound, Newton converges from above. A fixed bound
    // on iterations keeps cost independent of seconds, rank and TREE position.
    let elapsed = Math.min(limit, B.toNumber(B.div(work, B.mul(BASE_SUPER_SPEED, fractalMultiplier(q))), limit));
    for (let iteration = 0; iteration < 8 && elapsed > 0; iteration++) {
      const derivative = B.mul(BASE_SUPER_SPEED, fractalMultiplier(B.add(q, elapsed)));
      const correction = B.toNumber(B.div(B.sub(exposure(q, elapsed), work), derivative), 0);
      const next = Math.max(0, Math.min(limit, elapsed - correction));
      if (next === elapsed) break;
      elapsed = next;
    }
    return elapsed;
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
    const before = get(state), achievements = state.meta.achievements, milestones = state.meta.milestones, infinity = state.meta.infinity;
    state.meta.bigNumbers = { ...before, purchases: before.purchases.slice(),
      resources: before.resources.map(e => ({ ...e })), superResidual: before.superResidual.slice(), tree: cloneTree(before.tree || freshTree()) };
    state.meta.achievements = { ...achievements };
    state.meta.milestones = { ...milestones };
    try { advance(state, seconds, options); return get(state); }
    finally { state.meta.bigNumbers = before; state.meta.achievements = achievements; state.meta.milestones = milestones; state.meta.infinity = infinity; }
  }
  function view(state) {
    const n = get(state), currentRates = rates(state), q = amount(state, 4);
    return { ...n, tree: treeView(state), symbols: SYMBOLS, rates: currentRates,
      amounts: SYMBOLS.map((_, i) => amount(state, i)),
      dominantOrder: Math.max(0, n.fractalLevel - 1),
      progress: ledger().value(ledger().normalize([n.superProgress, ...n.superResidual])),
      milestoneMultiplier: milestoneMultiplier(n.gIndex), fractalMultiplier: fractalMultiplier(q, n.beyondFractal),
      baseSpeed: n.gIndex ? B.BN(BASE_SUPER_SPEED) : B.ZERO,
      requirement: I.gRequirement(state,n.gIndex),
      speed: n.gIndex ? B.mul(I.gSpeedMultiplier(state),B.mul(BASE_SUPER_SPEED, B.mul(milestoneMultiplier(n.gIndex), fractalMultiplier(q, n.beyondFractal)))) : B.ZERO };
  }
  function compareSymbolic(a, b) {
    if (!Number.isInteger(a.order) || !Number.isInteger(b.order) || a.order < 0 || a.order > 6 || b.order < 0 || b.order > 6)
      throw Error("未知大数符号层级");
    for (const v of [a, b]) {
      if (v.order === 6) {
        if (!Number.isInteger(v.treeRank) || v.treeRank < 3 || v.treeRank > Number.MAX_SAFE_INTEGER) throw Error("未知 TREE 阶位");
      } else if (v.order === 5) {
        if (!Number.isInteger(v.gIndex) || v.gIndex < 1 || v.gIndex > Number.MAX_SAFE_INTEGER) throw Error("未知 Graham 阶位");
      } else nonnegative(v.coefficient);
    }
    const ca = a.order >= 5 ? B.BN(1) : B.BN(a.coefficient), cb = b.order >= 5 ? B.BN(1) : B.BN(b.coefficient);
    if (B.eq(ca, 0) || B.eq(cb, 0)) return ca.cmp(cb);
    return a.order !== b.order ? Math.sign(a.order - b.order) : a.order === 6 ? Math.sign(a.treeRank - b.treeRank) : a.order === 5 ? Math.sign(a.gIndex - b.gIndex) : ca.cmp(cb);
  }
  WIS.Meta.BigNumbers = Object.freeze({ BASE_SUPER_SPEED, SYMBOLS, COSTS, MILESTONES, fresh, normalize, get, requirements, isUnlocked,
    syncUnlock, syncMilestones, baseYRate, currentBaseYRate, sampledYGain, rates, amount, canPurchase, purchase, milestoneMultiplier, fractalMultiplier,
    exposure, advance, prepare, view, compareSymbolic, maximumGIndex: 64, maximumG, maximumTree,
    MAX_TREE_RANK, TREE_UPGRADES, freshTree, normalizeTree, treeUnlocked, targetTreeRank, treeSuperThresholdWork, treeSuperSeconds,
    treeUpgradeCost, treeConstructionRate, treeConstructionGain, treeSequenceGain, treeSequenceIndex, treeSuperMultiplier, treeSuperSpeed,
    canPurchaseTreeUpgrade, purchaseTreeUpgrade, canEnterTreeSuper, enterTreeSuper, startNextTree, treeView, treeSignature });
}(window.WIS));
