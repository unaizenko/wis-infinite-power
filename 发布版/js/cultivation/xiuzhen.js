(function defineXiuzhen(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, L = () => WIS.Meta.TreasureLedger;
  const realms = Object.freeze([
    ["第一步·化神", "mana", "1e50"], ["第一步·婴变", "mana", "1e60"],
    ["第一步·问鼎", "xianForce", "1e8"], ["第二步·窥涅", "yuanForce", "1e5"],
    ["第二步·净涅", "yuanForce", "1e8"], ["第二步·碎涅", "yuanForce", "1e12"]
  ].map(([name, resource, cost], i) => Object.freeze({ name, resource, cost: B.BN(cost), level: i + 1 })));
  const abilities = Object.freeze([
    ["intent", "意境", 1, "mana", "2e50", "战力获取 ^1.05"],
    ["spirit", "元神", 1, "mana", "5e50", "法力获取 ^1.05"],
    ["xianForce", "仙力", 2, "mana", "2e60", "依据当前仙灵力获得仙力"],
    ["body", "仙体", 2, "xianForce", "1e5", "J获取 ×(1 + 当前仙力)^0.25"],
    ["materialSpirit", "元神实质", 2, "xianForce", "1e6", "仙力获取 ×(1 + 当前仙力)^0.08"],
    ["yuanForce", "元力", 3, "xianForce", "2e8", "依据当前仙力获得元力"],
    ["crystal", "问鼎之晶", 3, "yuanForce", "1e4", "元力获取 ×(1 + 当前元力)^0.15"],
    ["worldAura", "天地元气", 4, "yuanForce", "3e5", "元力获取 ×(1 + 当前元力)^0.25；不新增元气资源"],
    ["rules", "规则掌控", 5, "yuanForce", "3e8", "仙灵力、仙力获取 ×(1 + 当前元力)^0.18"],
    ["divineArt", "自创神通", 6, "yuanForce", "3e12", "战力获取 ×(1 + 当前元力)^0.25"]
  ].map(([key, name, realm, resource, cost, description]) => Object.freeze({ key, name, realm, resource, cost: B.BN(cost), description })));
  const resourceKeys = Object.freeze(["xianForce", "yuanForce"]);
  const labels = Object.freeze({ mana: "法力", xianForce: "仙力", yuanForce: "元力" });
  const entry = () => ({ amount: B.ZERO, residual: [], total: B.ZERO, totalResidual: [],
    spent: B.ZERO, spentResidual: [], peak: B.ZERO });
  const fresh = () => ({ version: 1, entered: false, realm: 0, highestRealm: 0,
    abilities: {}, history: { entry: false, realm: 0, abilities: {} },
    resources: Object.fromEntries(resourceKeys.map(k => [k, entry()])), manaDebitResidual: [],
    manaSpent: B.ZERO, manaSpentResidual: [] });
  const nonnegative = value => {
    if (!B.isFiniteBN(value ?? 0) || B.lt(value ?? 0, 0)) throw Error("修真道存档含非法余额");
    return B.BN(value ?? 0);
  };
  const tails = values => {
    if (values == null) return [];
    if (!Array.isArray(values)) throw Error("修真道残差账本格式无效");
    return values.map(String);
  };
  const rank = value => Math.min(6, Math.max(0, Math.floor(Number(value) || 0)));
  function normalize(raw) {
    const n = fresh();
    if (!raw || typeof raw !== "object") return n;
    n.entered = raw.entered === true; n.realm = n.entered ? rank(raw.realm) : 0;
    n.highestRealm = Math.max(n.realm, rank(raw.highestRealm));
    n.history = { entry: raw.history?.entry === true, realm: rank(raw.history?.realm),
      abilities: Object.fromEntries(abilities.filter(a => raw.history?.abilities?.[a.key] === true).map(a => [a.key, true])) };
    n.abilities = Object.fromEntries(abilities.filter(a => raw.abilities?.[a.key] === true).map(a => [a.key, true]));
    for (const key of resourceKeys) {
      const from = raw.resources?.[key] || {}, to = n.resources[key];
      for (const k of ["amount", "total", "spent", "peak"]) to[k] = nonnegative(from[k]);
      for (const k of ["residual", "totalResidual", "spentResidual"]) to[k] = tails(from[k]);
      for (const field of ["amount","total","spent"]) if(typeof from[field]==="string") {
        const tail=field==="amount"?"residual":field+"Residual";
        to[tail]=L().subtract([from[field],...to[tail]],[to[field]]);
      }
      // All economic quantities use finite Decimal precision after legacy merging.
      for (const field of ["amount", "total", "spent"]) {
        const tail = field === "amount" ? "residual" : field + "Residual";
        to[field] = L().value(L().normalize([to[field], ...to[tail]]));
        to[tail] = [];
      }
    }
    n.manaDebitResidual = tails(raw.manaDebitResidual);
    n.manaSpent = nonnegative(raw.manaSpent); n.manaSpentResidual = tails(raw.manaSpentResidual);
    if(typeof raw.manaSpent==="string")n.manaSpentResidual=L().subtract([raw.manaSpent,...n.manaSpentResidual],[n.manaSpent]);
    n.manaSpent = L().value(L().normalize([n.manaSpent,...n.manaSpentResidual]));
    n.manaSpentResidual = [];
    return n;
  }
  // A missing legacy branch is a detached default view, never a query write.
  const get = state => state.cultivation.systems.immortal.xiuzhen || fresh();
  const unlocked = state => (state.challengeCompletions?.mortalTransformation || 0) > 0;
  // Existing Xiuzhen progress remains accessible when loading a pre-achievement save.
  const available = state => state.unlockedAchievements?.qiPathComplete === true || unlocked(state) || get(state).highestRealm > 0;
  const active = state => state.cultivation.active === "immortal";
  const qiPathSealed = state => state.activeChallenge === "mortalTransformation";
  const sealed = state => ["mortalTransformation", "qiRefiningHundredThousandYears"].includes(state.activeChallenge);
  const yinYang = state => state.activeChallenge === "yinVoidYangReal";
  const has = (state, key) => active(state) && !sealed(state) && get(state).abilities[key] === true;
  const tailKey = field => field === "amount" ? "residual" : field + "Residual";
  const words = (e, field = "amount") => [String(B.BN(e[field]))];
  function write(e, terms, field = "amount", accounting = L()) {
    const normalized = accounting.normalize(terms);
    if (accounting.sign(normalized) < 0) throw Error("修真道账本余额不足，未提交");
    const value = accounting.value(normalized);
    if (!B.isFiniteBN(value)) throw Error("修真道账本无法投影，未提交");
    const rest = [];
    e[field] = value; e[tailKey(field)] = rest;
  }
  function validate(state) {
    const n = state.cultivation.systems.immortal.xiuzhen ||= fresh();
    for (const key of resourceKeys) for (const field of ["amount", "total", "spent"])
      write(n.resources[key], L().normalize([n.resources[key][field],...(n.resources[key][tailKey(field)]||[])]), field);
    const mana = WIS.Core.Resources.prepare(state.cultivation.systems.immortal.resources, "mana", B.ZERO);
    const resources = state.cultivation.systems.immortal.resources;
    const combined = WIS.Core.Resources.ledger().normalize([...WIS.Core.Resources.balance(mana, "mana"), ...n.manaDebitResidual]);
    if (WIS.Core.Resources.ledger().sign(combined) < 0) throw Error("法力借记余额无效");
    const e = { amount: B.ZERO }; write(e, combined, "amount", WIS.Core.Resources.ledger());
    Object.assign(resources, WIS.Core.Resources.prepareTerms({}, "mana", [e.amount, ...e.residual]));
    n.manaDebitResidual = [];
    return state;
  }
  function amount(state, key) { return B.BN(get(state).resources[key].amount); }
  function availableWords(state, key) {
    return key === "mana" ? WIS.Core.Resources.balance(state.cultivation.systems.immortal.resources, "mana")
      : words(get(state).resources[key]);
  }
  function canSpend(state, key, cost) {
    try {
      return !!labels[key] && B.isFiniteBN(cost) && B.gt(cost, 0) && (key === "mana" ? WIS.Core.Resources.ledger() : L()).compare(availableWords(state, key), [cost]) >= 0;
    } catch (error) {
      // Eligibility queries also run during initial rendering. A debit that
      // cannot be represented is unavailable; it must not prevent recovery UI.
      if (error instanceof L().LedgerError) return false;
      throw error;
    }
  }
  function debit(state, key, cost) {
    if (!canSpend(state, key, cost)) return false;
    const n = get(state), remaining = (key === "mana" ? WIS.Core.Resources.ledger() : L()).subtract(availableWords(state, key), [cost]);
    if (key === "mana") {
      const e = { amount: state.mana }, spent = { amount: n.manaSpent, residual: n.manaSpentResidual };
      write(e, remaining, "amount", WIS.Core.Resources.ledger()); write(spent, L().add(words(spent), [cost]));
      Object.assign(state.cultivation.systems.immortal.resources,
        WIS.Core.Resources.prepareTerms({}, "mana", [e.amount, ...e.residual]));
      n.manaDebitResidual = [];
      n.manaSpent = spent.amount; n.manaSpentResidual = spent.residual;
    } else {
      const e = n.resources[key]; write(e, remaining); write(e, L().add(words(e, "spent"), [cost]), "spent");
    }
    return true;
  }
  function transaction(state, work) {
    WIS.Core.Runtime.assertMutable();
    const old = get(state), mana = state.mana, residual = state.manaGainResidual,
      tail = state.cultivation.systems.immortal.resources.manaGainResidualTail;
    state.cultivation.systems.immortal.xiuzhen = normalize(old);
    try { const result = work(get(state)); WIS.Core.Effects?.invalidate(); return result; }
    catch (error) { state.cultivation.systems.immortal.xiuzhen = old; state.mana = mana; state.manaGainResidual = residual; state.cultivation.systems.immortal.resources.manaGainResidualTail = tail; throw error; }
  }
  function canBreakthrough(state) {
    const n = get(state), next = realms[n.realm];
    return active(state) && unlocked(state) && !sealed(state) && !!next &&
      (next.level < 4 || (state.challengeCompletions?.yinVoidYangReal || 0) > 0) && canSpend(state, next.resource, next.cost);
  }
  function breakthrough(state, manual = true) {
    if (!canBreakthrough(state)) return false;
    return transaction(state, n => { const next = realms[n.realm]; if (!debit(state, next.resource, next.cost)) return false;
      // Retain the legacy flag for existing saves/fast-forward eligibility, not as a paid gate.
      n.entered = true; n.realm++; n.highestRealm = Math.max(n.highestRealm, n.realm);
      if (manual) n.history.realm = Math.max(n.history.realm, n.realm); return true; });
  }
  function canBuy(state, key) {
    const a = abilities.find(a => a.key === key), n = get(state);
    return active(state) && !sealed(state) && !!a && n.entered && n.realm >= a.realm && !n.abilities[key] && canSpend(state, a.resource, a.cost);
  }
  function buy(state, key, manual = true) {
    if (!canBuy(state, key)) return false;
    return transaction(state, n => { const a = abilities.find(a => a.key === key); if (!debit(state, a.resource, a.cost)) return false;
      n.abilities[key] = true; if (manual) n.history.abilities[key] = true; return true; });
  }
  const yuanFromXian = x => B.pow(B.add(1, B.div(x, "1e8")), .75);
  function rates(state) {
    let xianForce = B.ZERO, yuanForce = B.ZERO;
    if (!has(state, "xianForce") && !has(state, "yuanForce")) return { xianForce, yuanForce };
    const x = amount(state, "xianForce"), y = amount(state, "yuanForce");
    if (has(state, "xianForce")) {
      xianForce = B.mul("2e4", B.add(1, B.log10(B.add(1, B.div(state.immortalPower, "1e40")))));
      if (has(state, "materialSpirit")) xianForce = B.mul(xianForce, B.pow(B.add(1, x), .08));
      if (has(state, "rules")) xianForce = B.mul(xianForce, B.pow(B.add(1, y), .18));
    }
    if (has(state, "yuanForce")) {
      yuanForce = yuanFromXian(x);
      if (has(state, "crystal")) yuanForce = B.mul(yuanForce, B.pow(B.add(1, y), .15));
      if (has(state, "worldAura")) yuanForce = B.mul(yuanForce, B.pow(B.add(1, y), .25));
    }
    return { xianForce, yuanForce };
  }
  function intervalSupport(state) {
    if (!has(state, "xianForce") && !has(state, "yuanForce")) return { supported: true, code: "no-xiuzhen-source" };
    const feedback = ["materialSpirit", "crystal", "worldAura", "rules", "divineArt"].filter(k => has(state,k));
    if (feedback.length) return { supported: false, code: "xiuzhen-feedback", feedback };
    // The source chain reads IP, X and Y only. With IP production disabled,
    // X has no continuous dependency; its original .1s word can be counted.
    // The interval planner still guards every purchase, realm and reward.
    const stableXian = !WIS.Cultivation.ImmortalLogic.immortalPowerUnlocked();
    const x=amount(state,"xianForce"), bounded=B.isFiniteBN(x)&&B.gte(x,0)&&B.lte(x,"1e12");
    // Body is admitted only with a proved constant X word. J, power and mana
    // remain coupled model columns, checked at the middle and endpoint.
    if(has(state,"body")&&(!stableXian||!bounded))return {supported:false,code:"xiuzhen-body-domain",stableXian};
    const discreteYuan=stableXian&&bounded&&has(state,"yuanForce");
    return { supported: true, stableXian, discreteYuan, maxFrames:65536,
      code:has(state,"body")?"xiuzhen-stable-xian-body":discreteYuan?"xiuzhen-discrete-yuan":has(state,"yuanForce")?"xiuzhen-one-way":stableXian?"xiuzhen-stable-xian":"xiuzhen-ip-to-xian" };
  }
  function discreteYuanModel(state, term) {
    const support=intervalSupport(state), maxFrames=65536;
    if(!support.discreteYuan)return null;
    if(!B.isFiniteBN(term)||B.lt(term,0))throw Error("invalid-xian-repeat");
    const initial=words(get(state).resources.xianForce), cache=new Map(), sums=new Map();
    const diagnostics={evaluations:0,blocks:0,maxRelativeBound:0};
    function at(n) {
      if(!Number.isSafeInteger(n)||n<1||n>maxFrames+1)throw Error("discrete-yuan-index");
      if(cache.has(n))return cache.get(n);
      // n=1 reads the confirmed start balance. Income from that frame is
      // visible only to n=2. Count ledger words, including signed residuals.
      const x=L().value(n===1?initial:L().add(initial,[`${term}*${n-1}`]));
      if(!B.isFiniteBN(x)||B.lt(x,0)||B.gt(x,"1e12"))throw Error("discrete-yuan-domain");
      const value=B.mul(yuanFromXian(x),.1);diagnostics.evaluations++;cache.set(n,value);return value;
    }
    function bounds(a,b) {
      const count=b-a+1;
      if(count<=2){const value=count===1?at(a):B.add(at(a),at(b));return [value,value];}
      // For this concave sequence, the chord bounds the discrete sum below;
      // its middle point (or middle pair) bounds it above. No continuous-time
      // integral or final-stock rate substitutes for the original recurrence.
      const lo=B.mul(B.add(at(a),at(b)),count/2),mid=Math.floor((a+b)/2);
      const hi=count%2?B.mul(at(mid),count):B.mul(B.add(at(mid),at(mid+1)),count/2);
      if(B.gt(lo,B.mul(hi,1+1e-12)))throw Error("discrete-yuan-concavity");
      const gap=B.toNumber(B.div(B.abs(B.sub(hi,lo)),B.max(lo,"1e-300")),Infinity);
      if(gap>2e-5){const left=bounds(a,mid),right=bounds(mid+1,b);return [B.add(left[0],right[0]),B.add(left[1],right[1])];}
      diagnostics.blocks++;return [B.mul(lo,1-1e-12),B.mul(hi,1+1e-12)];
    }
    function sum(n) {
      if(!Number.isSafeInteger(n)||n<0||n>maxFrames)throw Error("discrete-yuan-span");
      if(!n)return B.ZERO;if(sums.has(n))return sums.get(n);
      const [lo,hi]=bounds(1,n),value=B.div(B.add(lo,hi),2);
      diagnostics.maxRelativeBound=Math.max(diagnostics.maxRelativeBound,B.toNumber(B.div(B.sub(hi,lo),value),Infinity));
      sums.set(n,value);return value;
    }
    return {kind:"discrete-yuan",at,sum,diagnostics,maxFrames};
  }
  function plan(state, seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) throw Error("修真道结算时长无效");
    const r = rates(state);
    return Object.fromEntries(resourceKeys.map(k => [k, B.mul(r[k], seconds * WIS.Simulation.Compensation.factor())]));
  }
  function prepare(state, gains) {
    if (gains && resourceKeys.some(k => !B.isFiniteBN(gains[k] ?? 0) || B.lt(gains[k] ?? 0, 0)))
      throw Error("修真道新增收益无效，未提交");
    if (!gains || resourceKeys.every(k => B.eq(gains[k] ?? 0, 0))) return get(state);
    const n = normalize(get(state));
      for (const k of resourceKeys) {
        const gain = gains[k] ?? B.ZERO;
        if (!B.isFiniteBN(gain) || B.lt(gain, 0)) throw Error("修真道新增收益无效，未提交");
        let income = [gain];
        const repeat = gains.repeat?.[k];
        if (repeat) {
          if (!Number.isSafeInteger(repeat.count) || repeat.count < 1 || !B.isFiniteBN(repeat.term) || B.lt(repeat.term,0) ||
              !B.eq(B.mul(repeat.term,repeat.count),gain)) throw Error("修真道重复收益计划无效，未提交");
          income = [`${repeat.term}*${repeat.count}`];
        }
        const e = n.resources[k]; write(e, L().add(words(e), income));
        write(e, L().add(words(e, "total"), income), "total"); e.peak = B.max(e.peak, e.amount);
      }
    return n;
  }
  function commit(state, gains) {
    const n = prepare(state, gains);
    if (n !== get(state)) { state.cultivation.systems.immortal.xiuzhen = n; WIS.Core.Effects?.invalidate(); }
  }
  function effects(state) {
    if (!active(state) || sealed(state) || (!get(state).entered && !yinYang(state))) return [];
    const effect = (id, target, layer, value) => ({ id: "xiuzhen-" + id, name: abilities.find(a => a.key === id)?.name || "阴虚阳实",
      group: "修真道", target, layer, value:typeof value==="function"?value(state):value, valueAt:typeof value==="function"?value:null, dynamicResources:({body:["xianForce"],rules:["yuanForce"],divineArt:["yuanForce"]})[id]||[] });
    const result = [effect("intent", "power", "regionExponent", has(state, "intent") ? 1.05 : 1),
      effect("spirit", "mana", "regionExponent", has(state, "spirit") ? 1.05 : 1),
      effect("body", "joules", "regionMultiplier", current=>has(current, "body") ? B.pow(B.add(1, amount(current, "xianForce")), .25) : 1),
      effect("rules", "immortalPower", "regionMultiplier", current=>has(current, "rules") ? B.pow(B.add(1, amount(current, "yuanForce")), .18) : 1),
      effect("divineArt", "power", "regionMultiplier", current=>has(current, "divineArt") ? B.pow(B.add(1, amount(current, "yuanForce")), .25) : 1)];
    if (yinYang(state)) for (const key of ["joules", "power"])
      result.push(effect("yinYang-" + key, key, "regionExponent", .85));
    return result;
  }
  const views = new WeakMap();
  function abilityView(state) {
    // Read-only evaluation view: stored ownership and save serialization never change.
    if (views.has(state)) return views.get(state);
    const view = new Proxy(state, { get(target, key) {
      const value = Reflect.get(target, key);
      // Only 化凡 seals lower-path abilities; infinite Qi keeps its own progression.
      if (qiPathSealed(target) && key !== "naturalTreasureLevel" &&
          Object.prototype.hasOwnProperty.call(target.cultivation?.systems?.immortal?.abilities || {}, key))
        return typeof value === "boolean" ? false : 0;
      return value;
    } });
    views.set(state, view); return view;
  }
  function softcapRemoved(state, stage) {
    if (sealed(state)) return false;
    const level = { "星系": 4, "超星系团": 5, "宇宙结构": 6 }[stage.name];
    if (WIS.Core.Config.challenges[state.activeChallenge]?.reapplySoftcaps?.includes(stage.name)) return false;
    return !!level && get(state).highestRealm >= level;
  }
  function reset(state, previous, profile, challengeKey) {
    if (profile === "scatter") return; // same lower-tier retention as other retained abilities
    const old = get(previous), n = fresh();
    n.history = normalize(old).history; n.highestRealm = old.highestRealm;
    for (const key of resourceKeys) for (const field of ["total", "totalResidual", "spent", "spentResidual", "peak"])
      n.resources[key][field] = Array.isArray(old.resources[key][field]) ? old.resources[key][field].slice() : old.resources[key][field];
    n.manaSpent = old.manaSpent; n.manaSpentResidual = old.manaSpentResidual.slice();
    if (challengeKey === "yinVoidYangReal" && old.abilities.yuanForce) n.abilities.yuanForce = true;
    state.cultivation.systems.immortal.xiuzhen = n;
  }
  function automation(state, kind) {
    const n = get(state), isRealm = kind === "realm";
    if (!active(state) || sealed(state) || !(isRealm ? state.immortalRealmAutomationEnabled && state.unlockedAchievements?.bodyIntegration
      : state.immortalAbilityAutomationEnabled && state.unlockedAchievements?.infantSpirit)) return 0;
    const candidates = isRealm ? realms.map(r => ({ id: "realm-" + r.level, resourceKey: r.resource, cost: r.cost,
        available: unlocked(state) && n.realm === r.level - 1 && n.history.realm >= r.level &&
          (r.level < 4 || (state.challengeCompletions?.yinVoidYangReal || 0) > 0), run: () => breakthrough(state, false) }))
    : abilities.map(a => ({ id: a.key, resourceKey: a.resource, cost: a.cost,
      available: n.entered && n.realm >= a.realm && !n.abilities[a.key] && !!n.history.abilities[a.key], run: () => buy(state, a.key, false) }));
    if (WIS.Simulation.FixedSegment?.collectCandidates?.("xiuzhen-" + kind,
      candidates.map(c => ({ available: () => c.available,
        runOn: current => isRealm ? breakthrough(current, false) : buy(current, c.id, false)
      })), "mana", candidates.length)) return 0;
    const audit = WIS.Simulation?.FastForward?.auditCandidates;
    if (audit) { audit.push(...candidates.map(c => ({ ...c, id: "xiuzhen-" + c.id, kind, run: undefined }))); return 0; }
    let changes = 0;
    // Re-enter after a purchase to recompute live qualification and balances.
    const next = candidates.filter(c => c.available && canSpend(state, c.resourceKey, c.cost))
      .sort((a, b) => a.resourceKey.localeCompare(b.resourceKey) || B.BN(a.cost).cmp(b.cost))[0];
    if (next?.run()) changes = 1 + automation(state, kind);
    return changes;
  }
  WIS.Cultivation.Xiuzhen = Object.freeze({ validate, realms, abilities, resourceKeys, labels, fresh, normalize, get, unlocked, available, active,
    sealed, qiPathSealed, yinYang, has, amount, words, availableWords, canSpend, canBreakthrough, breakthrough,
    canBuy, buy, rates, intervalSupport, discreteYuanModel, plan, prepare, commit, effects, abilityView, softcapRemoved, reset, automation,
    spendMana(state, cost) { return transaction(state, () => debit(state, "mana", cost)); },
    spendResource(state, key, cost) { return transaction(state, () => debit(state, key, cost)); } });
}(window.WIS));
