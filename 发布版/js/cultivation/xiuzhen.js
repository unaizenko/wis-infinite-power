(function defineXiuzhen(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, L = () => WIS.Meta.TreasureLedger;
  const realms = Object.freeze([
    ["第一步·化神", "mana", "1e50"], ["第一步·婴变", "mana", "1e60"],
    ["第一步·问鼎", "xianForce", "1e8"], ["第二步·窥涅", "yuanForce", "1e5"],
    ["第二步·净涅", "yuanForce", "1e8"], ["第二步·碎涅", "yuanForce", "1e12"],
    ["第三步·空涅", "yuanForce", "1e24"], ["第三步·空灵", "nieForce", "1e6"],
    ["第三步·空玄", "nieForce", "1e7"], ["第三步·空劫", "nieForce", "1e11"],
    ["第四步·踏天", "nieForce", "1e9"],
    ["第五步", "nieForce", "1e14"], ["第六步", "nieForce", "1e16"],
    ["第七步", "nieForce", "1e18"], ["第八步", "nieForce", "1e21"], ["第九步", "nieForce", "1e24"]
  ].map(([name, resource, cost], i) => Object.freeze({ name, resource, cost: B.BN(cost), level: i + 1 })));
  const abilities = Object.freeze([
    ["intent", "意境", 1, "mana", "2e50", "战力获取 ^1.05"],
    ["spirit", "元神", 1, "mana", "5e50", "法力获取 ^1.05"],
    ["xianForce", "仙力", 2, "mana", "2e60", "依据当前仙灵力获得仙力"],
    ["body", "仙体", 2, "xianForce", "1e5", "根据当前仙力提升J获取。"],
    ["materialSpirit", "元神实质", 2, "xianForce", "1e6", "根据当前仙力提升仙力获取。"],
    ["yuanForce", "元力", 3, "xianForce", "2e8", "依据当前仙力获得元力"],
    ["crystal", "问鼎之晶", 3, "yuanForce", "1e4", "根据当前元力提升元力获取。"],
    ["worldAura", "天地元气", 4, "yuanForce", "3e5", "根据当前元力提升元力获取。"],
    ["rules", "规则掌控", 5, "yuanForce", "3e8", "根据当前元力提升仙灵力、仙力获取。"],
    ["divineArt", "自创神通", 6, "yuanForce", "3e12", "根据当前元力提升战力获取。"],
    ["emptyGate", "空门之力", 7, "nieForce", "1e4", "依据当前涅力增长单体宇宙系数N；N仅通过能力产生效果。"],
    ["kongNieZhang", "空涅·掌", 7, "nieForce", "1e5", "仙道宝物自然获取进度×10，包含烙印·本源。"],
    ["innerWorld", "内天地", 8, "nieForce", "2e5", "根据当前涅力提升N获取。"],
    ["spiritualGod", "灵神", 8, "nieForce", "3e5", "涅力获取×5。"],
    ["kongLingYuan", "空灵·缘", 8, "nieForce", "1e6", "纵横灵界的自动探寻量与对应自动探寻法力×100。"],
    ["virtualOrigin", "虚本源", 9, "nieForce", "1e8", "基础规则：每实际获得1e5涅力积累1点烙印·本源进度；基础需求100×3^持有数，提升N获取。"],
    ["spokenLaw", "言出法随", 9, "nieForce", "3e8", "根据当前涅力提升J与战力获取倍率。"],
    ["kongXuanSheng", "空玄·生", 9, "nieForce", "1e9", "每种已解锁的其他仙道宝物，每秒直接增加当前本源数量；不包含本源，不受宝物进度或奖励倍率影响。"],
    ["mergeHeaven", "神融天地", 10, "nieForce", "1e12", "根据当前N提升涅力获取。"],
    ["followLaw", "法随身动", 10, "nieForce", "2e12", "根据当前N提升J与战力获取指数，最高^1.2。"],
    ["zunYang", "尊阳", 10, "nieForce", "2e12", "根据当前N提升N获取。"],
    ["originBody", "本源真身", 10, "nieForce", "3e12", "烙印·本源进度获取×3。"],
    ["kongJieMie", "空劫·灭", 10, "nieForce", "1e13", "仙道宝物最终进度需求开平方，包含烙印·本源；保留已有进度。"],
    ["daoWuYa", "道无涯", 11, "multiverseCoefficient", "1000", "按当前多元宇宙系数N²提升法力、仙灵力、仙力、元力、涅力的最终获取指数，最高^1.5；原有惩罚随后生效。"],
    ["daoYuan", "道源", 11, "multiverseCoefficient", "10000", "烙印·本源每次自然奖励数量×2；进度获取不变，后续需求按实际持有数量增长。"],
    ["originMultiverse", "第六步·本源增幅", 13, "nieForce", "5e16", "高阶多元原始获取×√(1+本源数量)，随后统一接受2/k指数削弱。"],
    ["eternalMultiverse", "第七步·多元证道", 14, "nieForce", "5e18", "依据本轮历史最高高阶多元提升涅力获取：×10^(h−3+L/(1+L))；h为最高阶数，L=log10(1+该阶最高系数)。升阶、消耗不降低记录。"],
    ["tierNie", "第八步·阶数增幅", 15, "nieForce", "5e21", "涅力获取×(k−1)²；k为当前高阶多元阶数。"],
    ["tierTranscendence", "第九步·超越", 16, "nieForce", "5e24", "J与战力获取指数×[1+min(0.5,0.025×(k−2))]；与已有指数共同生效，最高新增^1.5。"]
  ].map(([key, name, realm, resource, cost, description]) => Object.freeze({ key, name, realm, resource, cost: B.BN(cost), description })));
  const resourceKeys = Object.freeze(["xianForce", "yuanForce", "nieForce", "universeCoefficient", "multiverseCoefficient"]);
  const labels = Object.freeze({ mana: "法力", xianForce: "仙力", yuanForce: "元力", nieForce: "涅力", universeCoefficient: "单体宇宙系数N", multiverseCoefficient: "多元宇宙系数N²" });
  const entry = () => ({ amount: B.ZERO, residual: [], total: B.ZERO, totalResidual: [],
    spent: B.ZERO, spentResidual: [], peak: B.ZERO });
  const fresh = () => ({ version: 1, entered: false, realm: 0, highestRealm: 0, lifetimeHighestRealm: 0,
    abilities: {}, history: { entry: false, realm: 0, abilities: {} },
    resources: Object.fromEntries(resourceKeys.map(k => [k, entry()])), manaDebitResidual: [],
    manaSpent: B.ZERO, manaSpentResidual: [], shengProgress: {} });
  const nonnegative = value => {
    if (!B.isFiniteBN(value ?? 0) || B.lt(value ?? 0, 0)) throw Error("修真道存档含非法余额");
    return B.BN(value ?? 0);
  };
  const tails = values => {
    if (values == null) return [];
    if (!Array.isArray(values)) throw Error("修真道残差账本格式无效");
    return values.map(String);
  };
  const rank = value => Math.min(realms.length, Math.max(0, Math.floor(Number(value) || 0)));
  // Statistics are independent of current-run unlock/achievement qualification.
  const lifetimeRealmLevel = n => Math.max(rank(n.lifetimeHighestRealm), rank(n.highestRealm), rank(n.realm), rank(n.history?.realm));
  function statisticsRealmName(state, lifetime = false) {
    const n = get(state), level = lifetime ? lifetimeRealmLevel(n) : rank(n.realm);
    // Current Xiuzhen realm only rises within a run; resets clear it (scatter retains it).
    return level > 0 ? "修真道·" + realms[level - 1].name : null;
  }
  const shengKeys = Object.freeze(Object.keys(WIS.Meta.TreasureRules).filter(key => key !== "originImprint" && WIS.Meta.TreasureRules[key].immortal));
  function normalizeSheng(raw) {
    if (raw == null) return {};
    if (typeof raw !== "object" || Array.isArray(raw)) throw Error("空玄·生余量格式无效");
    const result = {};
    for (const [key, point] of Object.entries(raw)) {
      if (!shengKeys.includes(key) || !point || point.version !== 1 || !B.eq(point.requirement,1) ||
          !B.isFiniteBN(point.remaining) || B.lt(point.remaining,0) || B.gt(point.remaining,1) || !B.isFiniteBN(point.carry))
        throw Error("空玄·生余量无效");
      const words = L().normalize([1,B.BN(point.remaining).neg(),point.carry]);
      if (L().sign(words) < 0 || L().compare(words,[1]) >= 0) throw Error("空玄·生余量越界");
      result[key] = {version:1,requirement:"1",remaining:String(point.remaining),carry:String(point.carry)};
    }
    return result;
  }
  function normalize(raw) {
    const n = fresh();
    if (!raw || typeof raw !== "object") return n;
    n.entered = raw.entered === true; n.realm = n.entered ? rank(raw.realm) : 0;
    n.highestRealm = Math.max(n.realm, rank(raw.highestRealm));
    n.history = { entry: raw.history?.entry === true, realm: rank(raw.history?.realm),
      abilities: Object.fromEntries(abilities.filter(a => raw.history?.abilities?.[a.key] === true).map(a => [a.key, true])) };
    n.lifetimeHighestRealm = lifetimeRealmLevel({ ...n, lifetimeHighestRealm: raw.lifetimeHighestRealm });
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
    n.shengProgress = normalizeSheng(raw.shengProgress);
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
      (next.level < 4 || (state.challengeCompletions?.yinVoidYangReal || 0) > 0) &&
      (next.level < 7 || (state.challengeCompletions?.heavenlyFiveDeclines || 0) > 0) &&
      (next.level !== 7 || WIS.Meta.Infinity.has(state, "C1")) &&
      (next.level !== 11 || WIS.Meta.Infinity.has(state, "C5")) &&
      (next.level !== 12 || WIS.Meta.Infinity.has(state, "C6")) && canSpend(state, next.resource, next.cost);
  }
  function breakthrough(state, manual = true) {
    if (!canBreakthrough(state)) return false;
    return transaction(state, n => { const next = realms[n.realm]; if (!debit(state, next.resource, next.cost)) return false;
      // Retain the legacy flag for existing saves/fast-forward eligibility, not as a paid gate.
      n.entered = true; n.realm++; n.highestRealm = Math.max(n.highestRealm, n.realm); n.lifetimeHighestRealm = lifetimeRealmLevel(n);
      if (manual) n.history.realm = Math.max(n.history.realm, n.realm); return true; });
  }
  function canBuy(state, key) {
    const a = abilities.find(a => a.key === key), n = get(state);
    return active(state) && !sealed(state) && !!a && n.entered && n.realm >= a.realm && !n.abilities[key] && canSpend(state, a.resource, a.cost);
  }
  function buy(state, key, manual = true) {
    if (!canBuy(state, key)) return false;
    const purchase = () => transaction(state, n => {
      const a = abilities.find(a => a.key === key); if (!debit(state, a.resource, a.cost)) return false;
      n.abilities[key] = true; if (manual) n.history.abilities[key] = true;
      if (key === "kongJieMie") {
        WIS.Core.Effects?.invalidate();
        WIS.Meta.TreasureProgress.reconcileRequirements(state);
      }
      return true;
    });
    // Mie can award retained progress. Its payment, ownership and every treasure
    // ledger must roll back together if even one recalculation fails.
    return key === "kongJieMie" ? L().transaction(state,purchase) : purchase();
  }
  // Shared by production sources/effects and the current-effect UI preview.
  const abilityMultiplierRules = Object.freeze({
    body: ["xianForce", .25], materialSpirit: ["xianForce", .08],
    crystal: ["yuanForce", .15], worldAura: ["yuanForce", .25],
    rules: ["yuanForce", .18], divineArt: ["yuanForce", .25]
  });
  function abilityMultiplier(state, key) {
    if (!has(state, key)) return 1;
    const pLog = () => B.add(1, B.log10(B.add(1, B.div(amount(state,"nieForce"),"1e4"))));
    const nLog = () => B.log10(B.add(1, amount(state,"universeCoefficient")));
    if (key === "innerWorld") return B.pow(pLog(),1.2);
    if (key === "spiritualGod") return 5;
    if (key === "spokenLaw") return B.pow(pLog(),1.5);
    if (key === "mergeHeaven") return B.pow(B.add(1,nLog()),.5);
    if (key === "followLaw") return B.add(1,B.min(.2,B.mul(.015,nLog())));
    if (key === "zunYang") return B.pow(B.add(1,nLog()),.35);
    if (key === "daoWuYa") return daoWuYaExponent(state);
    if (key === "daoYuan") return 2;
    if (key === "originMultiverse") return B.pow(B.add(1,WIS.Meta.Treasures.count(state,"originImprint")),.5);
    if (["eternalMultiverse","tierNie","tierTranscendence"].includes(key)) {
      const H=WIS.Meta.HighMultiverse;
      if (!H.active(state)) return B.ONE;
      if (key === "eternalMultiverse") {
        const best=H.highest(state), l=B.log10(B.add(1,best.coefficient));
        // Bounded coefficient term makes every higher tier at least as strong,
        // even when promotion roots an enormous coefficient down near one.
        return B.pow10(B.add(B.sub(best.order,3),B.div(l,B.add(1,l))));
      }
      const k=H.get(state).order;
      return key === "tierNie" ? B.pow(B.sub(k,1),2) : B.add(1,B.min(.5,B.mul(.025,B.sub(k,2))));
    }
    if (key === "originBody") return 3;
    if (key === "kongNieZhang") return 10;
    if (key === "kongLingYuan") return 100;
    const rule = abilityMultiplierRules[key];
    if (!rule || !has(state, key)) return 1;
    return B.pow(B.add(1, amount(state, rule[0])), rule[1]);
  }
  const yuanCrystalMultiplier = state => B.add(1,B.mul(WIS.Meta.Treasures.count(state,"yuanCrystal"),.002));
  const immortalAchievementMultiplier = state => WIS.Meta.Achievements?.greatHeavenlyVenerableMultiplier(state) ?? B.ONE;
  const yuanFromXian = x => B.pow(B.add(1, B.div(x, "1e8")), .75);
  const thirdStepActive = state => active(state) && !sealed(state) && get(state).realm >= 7;
  const fourthStepActive = state => active(state) && !sealed(state) && get(state).realm >= 11;
  const fifthStepActive = state => active(state) && !sealed(state) && get(state).realm >= 12;
  const highMultiverseRawRate = state => fifthStepActive(state)
    ? B.mul(B.pow(B.div(amount(state,"nieForce"),"1e12"),.25),abilityMultiplier(state,"originMultiverse")) : B.ZERO;
  const daoWuYaExponent = state => fourthStepActive(state) && has(state,"daoWuYa")
    ? B.add(1,B.min(.5,B.mul(.05,B.log10(B.add(1,amount(state,"multiverseCoefficient")))))) : B.ONE;
  const applyDaoWuYa = (state,gain) => B.gt(gain,1) ? B.pow(gain,daoWuYaExponent(state)) : gain;
  const multiverseRate = state => fourthStepActive(state) ? B.pow(B.div(amount(state,"universeCoefficient"),1000),.5) : B.ZERO;
  function thirdStepRates(state) {
    let nieForce = B.ZERO, universeCoefficient = B.ZERO;
    if (!thirdStepActive(state)) return { nieForce, universeCoefficient, multiverseCoefficient:multiverseRate(state) };
    nieForce = B.mul(B.pow(B.div(amount(state,"yuanForce"),"1e16"),.25),
      B.mul(abilityMultiplier(state,"spiritualGod"),abilityMultiplier(state,"mergeHeaven")));
    nieForce = B.mul(nieForce,B.mul(abilityMultiplier(state,"eternalMultiverse"),abilityMultiplier(state,"tierNie")));
    if (has(state,"emptyGate")) universeCoefficient = B.mul(B.div(B.pow(B.div(amount(state,"nieForce"),"1e4"),.25),300),
      B.mul(B.mul(abilityMultiplier(state,"innerWorld"),abilityMultiplier(state,"zunYang")),
        has(state,"virtualOrigin") ? B.pow(B.add(1,WIS.Meta.Treasures.count(state,"originImprint")),.25) : 1));
    return { nieForce:applyDaoWuYa(state,B.mul(nieForce,immortalAchievementMultiplier(state))), universeCoefficient, multiverseCoefficient:multiverseRate(state) };
  }
  function originProgressGain(state) { return B.mul(B.mul("1e-5",abilityMultiplier(state,"originBody")),abilityMultiplier(state,"kongNieZhang")); }
  function awardOrigin(state, gains) {
    if (!has(state,"virtualOrigin") || !B.gt(gains?.nieForce ?? 0,0)) return;
    WIS.Meta.TreasureProgress.advanceFixed(state,"originImprint",gains.nieForce,
      { eligible:true, gain:originProgressGain(state), award:WIS.Meta.Treasures.getTreasureAwardMultiplier(state,"originImprint") });
  }
  function captureSheng(state) {
    if (!has(state,"kongXuanSheng")) return {rate:B.ZERO,keys:[]};
    const rate = B.BN(WIS.Meta.Treasures.count(state,"originImprint"));
    return {rate,keys:B.gt(rate,0) ? WIS.Core.Runtime.withState(state,()=>shengKeys.filter(key => WIS.Meta.TreasureProgress.qualification(state,key) === null)) : []};
  }
  function awardSheng(state, seconds, frozen = captureSheng(state)) {
    WIS.Core.Runtime.assertMutable();
    if (!Number.isFinite(seconds) || seconds < 0 || !B.isFiniteBN(frozen.rate) || B.lt(frozen.rate,0)) throw Error("空玄·生结算无效");
    if (!(seconds > 0) || !B.gt(frozen.rate,0) || !frozen.keys.length) return;
    const gain = B.mul(frozen.rate,seconds), F = WIS.Core.FiniteProgress, ledger = L();
    if (!B.isFiniteBN(gain)) throw Error("空玄·生收益无法表示");
    // Frozen source eligibility is deliberately not read again after natural
    // loot. Each treasure owns its fractional remainder, including across saves.
    return L().transaction(state,()=>transaction(state,n=>{
      for (const key of frozen.keys) {
        if (!shengKeys.includes(key)) throw Error("空玄·生宝物来源无效");
        const point = n.shengProgress[key] || F.create(1);
        const total = ledger.add([1,B.BN(point.remaining).neg(),point.carry],[gain]);
        let amount = ledger.value(total).floor();
        // Projected flooring may land on an adjacent integer. Compare the
        // bounded exact words before paying; never forgive a per-frame epsilon.
        if (ledger.compare(total,[amount]) < 0) amount = B.sub(amount,1);
        const adjacent = B.add(amount,1);
        if (B.gt(adjacent,amount) && ledger.compare(total,[adjacent]) >= 0) amount = adjacent;
        const fraction = ledger.subtract(total,[amount]);
        if (ledger.sign(fraction) < 0 || ledger.compare(fraction,[1]) >= 0) throw Error("空玄·生整数边界无法表示");
        const remaining = ledger.value(ledger.subtract([1],fraction));
        const carry = ledger.value(ledger.subtract(fraction,ledger.subtract([1],[remaining])));
        if (B.gt(amount,0)) WIS.Meta.Treasures.add(state,key,amount,{applyAwardMultiplier:false});
        n.shengProgress[key] = F.record(1,remaining,carry);
      }
    }));
  }
  function rawRates(state) {
    let xianForce = B.ZERO, yuanForce = B.ZERO;
    if (!has(state, "xianForce") && !has(state, "yuanForce")) return { xianForce, yuanForce, ...thirdStepRates(state) };
    const x = amount(state, "xianForce");
    if (has(state, "xianForce")) {
      xianForce = B.mul("2e4", B.add(1, B.log10(B.add(1, B.div(state.immortalPower, "1e40")))));
      if (has(state, "materialSpirit")) xianForce = B.mul(xianForce, abilityMultiplier(state, "materialSpirit"));
      if (has(state, "rules")) xianForce = B.mul(xianForce, abilityMultiplier(state, "rules"));
    }
    if (has(state, "yuanForce")) {
      yuanForce = yuanFromXian(x);
      if (has(state, "crystal")) yuanForce = B.mul(yuanForce, abilityMultiplier(state, "crystal"));
      if (has(state, "worldAura")) yuanForce = B.mul(yuanForce, abilityMultiplier(state, "worldAura"));
    }
    const achievement=immortalAchievementMultiplier(state);
    return { xianForce:applyDaoWuYa(state,B.mul(xianForce,achievement)), yuanForce:applyDaoWuYa(state,B.mul(B.mul(yuanForce,achievement),yuanCrystalMultiplier(state))), ...thirdStepRates(state) };
  }
  function rates(state) {
    const raw = rawRates(state);
    return {
      xianForce: WIS.Core.Penalties.applyGoogolPenalty("xianForce", amount(state, "xianForce"), raw.xianForce, state),
      yuanForce: WIS.Core.Penalties.applyGoogolPenalty("yuanForce", amount(state, "yuanForce"), raw.yuanForce, state),
      nieForce:raw.nieForce, universeCoefficient:raw.universeCoefficient, multiverseCoefficient:raw.multiverseCoefficient
    };
  }
  function intervalSupport(state) {
    if (thirdStepActive(state)) return { supported:false, code:"third-step-coupled-sources" };
    if (!has(state, "xianForce") && !has(state, "yuanForce")) return { supported: true, code: "no-xiuzhen-source" };
    // Existing one-way interval models do not represent stock-dependent Googol feedback.
    if (resourceKeys.some(key => has(state, key) && B.gte(amount(state, key), WIS.Core.Config.googolPenalty.threshold)))
      return { supported: false, code: "xiuzhen-googol-feedback" };
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
    const multiplier=B.mul(yuanCrystalMultiplier(state),immortalAchievementMultiplier(state));
    const diagnostics={evaluations:0,blocks:0,maxRelativeBound:0};
    function at(n) {
      if(!Number.isSafeInteger(n)||n<1||n>maxFrames+1)throw Error("discrete-yuan-index");
      if(cache.has(n))return cache.get(n);
      // n=1 reads the confirmed start balance. Income from that frame is
      // visible only to n=2. Count ledger words, including signed residuals.
      const x=L().value(n===1?initial:L().add(initial,[`${term}*${n-1}`]));
      if(!B.isFiniteBN(x)||B.lt(x,0)||B.gt(x,"1e12"))throw Error("discrete-yuan-domain");
      const value=B.mul(B.mul(yuanFromXian(x),multiplier),.1);diagnostics.evaluations++;cache.set(n,value);return value;
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
    awardOrigin(state,gains);
    if (n !== get(state)) { state.cultivation.systems.immortal.xiuzhen = n; WIS.Core.Effects?.invalidate(); }
  }
  function effects(state) {
    if (!active(state) || sealed(state) || (!get(state).entered && !yinYang(state))) return [];
    const effect = (id, target, layer, value) => ({ id: "xiuzhen-" + id, name: abilities.find(a => a.key === id)?.name || "阴虚阳实",
      group: "修真道", target, layer, value:typeof value==="function"?value(state):value, valueAt:typeof value==="function"?value:null, dynamicResources:({body:["xianForce"],rules:["yuanForce"],divineArt:["yuanForce"],spokenLaw:["nieForce"],followLaw:["universeCoefficient"],tierTranscendence:["highMultiverseCoefficient"]})[id]||[] });
    const result = [effect("intent", "power", "regionExponent", has(state, "intent") ? 1.05 : 1),
      effect("spirit", "mana", "regionExponent", has(state, "spirit") ? 1.05 : 1),
      effect("body", "joules", "regionMultiplier", current=>abilityMultiplier(current, "body")),
      effect("rules", "immortalPower", "regionMultiplier", current=>abilityMultiplier(current, "rules")),
      effect("divineArt", "power", "regionMultiplier", current=>abilityMultiplier(current, "divineArt"))];
    for (const target of ["joules","power"]) {
      result.push(effect("spokenLaw",target,"regionMultiplier",current=>abilityMultiplier(current,"spokenLaw")));
      result.push(effect("followLaw",target,"regionExponent",current=>abilityMultiplier(current,"followLaw")));
      result.push(effect("tierTranscendence",target,"regionExponent",current=>abilityMultiplier(current,"tierTranscendence")));
    }
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
    if (profile === "infinity") {
      const n = fresh();
      const old = normalize(get(previous));
      n.history = old.history; n.lifetimeHighestRealm = old.lifetimeHighestRealm;
      state.cultivation.systems.immortal.xiuzhen = n;
      return;
    }
    if (profile === "scatter") return; // same lower-tier retention as other retained abilities
    const old = get(previous), n = fresh();
    n.history = normalize(old).history; n.highestRealm = old.highestRealm; n.lifetimeHighestRealm = lifetimeRealmLevel(old);
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
          (r.level < 4 || (state.challengeCompletions?.yinVoidYangReal || 0) > 0) &&
          (r.level < 7 || (state.challengeCompletions?.heavenlyFiveDeclines || 0) > 0) &&
          (r.level !== 7 || WIS.Meta.Infinity.has(state, "C1")) &&
          (r.level !== 11 || WIS.Meta.Infinity.has(state, "C5")) &&
          (r.level !== 12 || WIS.Meta.Infinity.has(state, "C6")), run: () => breakthrough(state, false) }))
    : abilities.map(a => ({ id: a.key, resourceKey: a.resource, cost: a.cost,
      available: n.entered && n.realm >= a.realm && !n.abilities[a.key] && !!n.history.abilities[a.key], run: () => buy(state, a.key, false) }));
    if (WIS.Simulation.FixedSegment?.collectCandidates?.("xiuzhen-" + kind,
      candidates.map(c => ({ available: () => c.available, currentTreasureProgress:c.id === "kongJieMie",
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
  WIS.Cultivation.Xiuzhen = Object.freeze({ validate, realms, abilities, resourceKeys, labels, fresh, normalize, get, statisticsRealmName, unlocked, available, active,
    sealed, qiPathSealed, yinYang, has, amount, words, availableWords, canSpend, canBreakthrough, breakthrough,
    canBuy, buy, fifthStepActive, highMultiverseRawRate, fourthStepActive, daoWuYaExponent, applyDaoWuYa, multiverseRate, abilityMultiplier, yuanCrystalMultiplier, thirdStepActive, thirdStepRates, originProgressGain, awardOrigin, captureSheng, awardSheng, rawRates, rates, intervalSupport, discreteYuanModel, plan, prepare, commit, effects, abilityView, softcapRemoved, reset, automation,
    spendMana(state, cost) { return transaction(state, () => debit(state, "mana", cost)); },
    spendResource(state, key, cost) { return transaction(state, () => debit(state, key, cost)); } });
}(window.WIS));
