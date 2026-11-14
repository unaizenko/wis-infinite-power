(function defineXiuzhen(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, L = () => WIS.Core.Amount?.enabled()?WIS.Core.AmountLedger:WIS.Meta.TreasureLedger;
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
    ["virtualOrigin", "虚本源", 9, "nieForce", "1e8", "解锁宝物烙印·虚本源"],
    ["spokenLaw", "言出法随", 9, "nieForce", "3e8", "根据当前涅力提升J与战力获取倍率。"],
    ["kongXuanSheng", "空玄·生", 9, "nieForce", "1e9", "本源以外的每种已解锁仙道宝物，每秒直接增加当前本源数量。"],
    ["mergeHeaven", "神融天地", 10, "nieForce", "1e12", "根据当前N提升涅力获取。"],
    ["followLaw", "法随身动", 10, "nieForce", "2e12", "根据当前N提升J与战力获取指数。"],
    ["zunYang", "尊阳", 10, "nieForce", "2e12", "根据当前N提升N获取。"],
    ["originBody", "本源真身", 10, "nieForce", "3e12", "烙印·本源进度获取×3。"],
    ["kongJieMie", "空劫·灭", 10, "nieForce", "1e13", "仙道宝物最终进度需求开平方。"],
    ["daoWuYa", "道无涯", 11, "multiverseCoefficient", "300", "按当前多元宇宙系数N²提升法力、仙灵力、仙力、元力、涅力的最终获取指数。"],
    ["daoYuan", "道源", 11, "multiverseCoefficient", "3000", "烙印·本源每次自然奖励数量×2。"],
    ["originMultiverse", "六", 13, "nieForce", "5e16", "根据本源数量，提升高阶多元获取。"],
    ["eternalMultiverse", "七", 14, "nieForce", "5e18", "根据最高高阶多元数量，提升涅力获取。"],
    ["tierNie", "八", 15, "nieForce", "5e21", "根据高阶多元阶位，提升涅力获取。"],
    ["tierTranscendence", "九", 16, "nieForce", "5e24", "根据高阶多元阶数，提升J、战力获取。"]
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
    const parsed=B.parseFinite(value ?? 0);
    if (!parsed || parsed.lt(0)) throw Error("修真道存档含非法余额");
    return parsed;
  };
  const tails = values => {
    if (values == null) return [];
    if (!Array.isArray(values)) throw Error("修真道残差账本格式无效");
    return values.map(String);
  };
  const rank = value => Math.min(realms.length, Math.max(0, Math.floor(Number(value) || 0)));
  // Statistics are independent of current-run unlock/achievement qualification.
  const lifetimeRealmLevel = n => Math.max(rank(n.lifetimeHighestRealm), rank(n.highestRealm), rank(n.realm), rank(n.history?.realm));
  // Lifetime scale is a display classification, independent of current-run activity.
  function statisticsScaleName(state) {
    const high = WIS.Meta.HighMultiverse.get(state);
    if (high.order !== '0' || (high.highest?.order ?? '0') !== '0') return '高阶多元';
    const level = lifetimeRealmLevel(get(state));
    return level >= 11 ? '多元宇宙' : level >= 7 ? '单体宇宙' : null;
  }
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
      WIS.Core.FiniteProgress.validate(point);
      if (!shengKeys.includes(key) || !point || point.version !== 1 || !B.eq(point.requirement,1) ||
          !B.isFiniteBN(point.remaining) || B.lt(point.remaining,0) || B.gt(point.remaining,1) || !B.isFiniteBN(point.carry))
        throw Error("空玄·生余量无效");
      const residual=WIS.Core.Amount?.enabled()?(point.residual||[]).map(String):[];
      const words = L().normalize([1,B.BN(point.remaining).neg(),point.carry,...residual]);
      if (L().sign(words) < 0 || L().compare(words,[1]) >= 0) throw Error("空玄·生余量越界");
      result[key] = WIS.Core.Amount?.enabled()?(WIS.Core.FiniteProgress.isCanonical(point)&&point.requirement==="1"?point:WIS.Core.FiniteProgress.record(1,point.remaining,point.carry,residual)):{version:1,requirement:"1",remaining:String(point.remaining),carry:String(point.carry)};
    }
    return result;
  }
  function normalize(raw) {
    const n = fresh();
    if (raw === undefined || raw === null) return n;
    const records=[['',raw],...['resources','abilities','history','history.abilities','shengProgress',...resourceKeys.map(k=>'resources.'+k)].map(path=>[path,path.split('.').reduce((v,k)=>v?.[k],raw)])];
    for(const [path,value] of records)if(value!==undefined && !(path==="shengProgress"&&value===null) && (!value || typeof value!=="object" || Array.isArray(value) || B.isDecimal(value)))
      throw Object.assign(Error("修真道存档容器无效："+path),{code:'SAVE_SHAPE',path:'cultivation.systems.immortal.xiuzhen'+(path?'.'+path:'')});
    n.entered = raw.entered === true; n.realm = n.entered ? rank(raw.realm) : 0;
    n.highestRealm = Math.max(n.realm, rank(raw.highestRealm));
    n.history = { entry: raw.history?.entry === true, realm: rank(raw.history?.realm),
      abilities: Object.fromEntries(abilities.filter(a => raw.history?.abilities?.[a.key] === true).map(a => [a.key, true])) };
    n.lifetimeHighestRealm = lifetimeRealmLevel({ ...n, lifetimeHighestRealm: raw.lifetimeHighestRealm });
    n.abilities = Object.fromEntries(abilities.filter(a => raw.abilities?.[a.key] === true).map(a => [a.key, true]));
    for (const key of resourceKeys) {
      const from = raw.resources?.[key] || {}, to = n.resources[key];
      if(WIS.Core.Amount?.enabled()){for(const field of ["amount","total","spent","peak"])Object.assign(to,WIS.Core.Amount[field==='spent'?'fieldParts':'boundedFieldParts'](WIS.Core.Amount.field(from,field),field));continue;}
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
    if(WIS.Core.Amount?.enabled())Object.assign(n,WIS.Core.Amount.fieldParts(WIS.Core.Amount.field(raw,"manaSpent"),"manaSpent"));
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
  const words = (e, field = "amount") => WIS.Core.Amount?.enabled()?WIS.Core.Amount.words(WIS.Core.Amount.field(e,field)):[String(B.BN(e[field]))];
  function write(e, terms, field = "amount", accounting = L(), exact = false) {
    if(WIS.Core.Amount?.enabled()){Object.assign(e,WIS.Core.Amount[exact||field==='spent'?'fieldParts':'boundedFieldParts'](WIS.Core.Amount.fromParts(0,terms),field));return;}
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
  const quantity=(state,key)=>WIS.Core.Amount.field(get(state).resources[key]);
  const fullAmount=(state,key)=>WIS.Core.Amount?.enabled()?quantity(state,key):amount(state,key);
  const isQuantity=value=>WIS.Core.Amount?.enabled()&&WIS.Core.Amount.isAmount(value);
  const divided=(value,divisor)=>isQuantity(value)?WIS.Core.Amount.divide(value,divisor):B.div(value,divisor);
  const powerRatio=(value,divisor,exponent)=>isQuantity(value)?WIS.Core.AmountFormulas.powerRatio(value,divisor,exponent):B.pow(B.div(value,divisor),exponent);
  const powerOnePlusRatio=(value,divisor,exponent)=>isQuantity(value)?WIS.Core.AmountFormulas.powerOnePlusRatio(value,divisor,exponent):B.pow(B.add(1,B.div(value,divisor)),exponent);
  const logOnePlusRatio=(value,divisor)=>isQuantity(value)?WIS.Core.AmountFormulas.logOnePlusRatio(value,divisor):B.log10(B.add(1,B.div(value,divisor)));

  function availableWords(state, key) {
    return key === "mana" ? WIS.Core.Resources.balance(state.cultivation.systems.immortal.resources, "mana")
      : words(get(state).resources[key]);
  }
  function canSpend(state, key, cost) {
    if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount,price=A.from(cost);return !!labels[key]&&A.compare(price,0)>0&&A.compare(A.fromParts(0,availableWords(state,key)),price)>=0;}
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
    const n = get(state), remaining = (key === "mana" ? WIS.Core.Resources.ledger() : L()).subtract(availableWords(state, key), WIS.Core.Amount?.enabled()?WIS.Core.Amount.words(cost):[cost]);
    if (key === "mana") {
      const e = { amount: state.mana }, spent = { amount: n.manaSpent, residual: n.manaSpentResidual };
      write(e, remaining, "amount", WIS.Core.Resources.ledger()); write(spent, L().add(words(spent), WIS.Core.Amount?.enabled()?WIS.Core.Amount.words(cost):[cost]),"amount",L(),true);
      Object.assign(state.cultivation.systems.immortal.resources,
        WIS.Core.Resources.prepareTerms({}, "mana", [e.amount, ...e.residual]));
      n.manaDebitResidual = [];
      n.manaSpent = spent.amount; n.manaSpentResidual = spent.residual;
    } else {
      const e = n.resources[key]; write(e, remaining); write(e, L().add(words(e, "spent"), WIS.Core.Amount?.enabled()?WIS.Core.Amount.words(cost):[cost]), "spent");
    }
    return true;
  }
  function transaction(state, work) {
    WIS.Core.Runtime.assertMutable();
    const old = get(state), mana = state.mana, residual = state.manaGainResidual,
      tail = state.cultivation.systems.immortal.resources.manaGainResidualTail;
    const draft=WIS.Core.Amount?.enabled()?WIS.Core.State.createDraft(state):null;
    state.cultivation.systems.immortal.xiuzhen = draft?get(draft.state):normalize(old);
    try { const result = work(get(state));if(draft)state.cultivation.systems.immortal.xiuzhen=draft.finishValue(get(state)); WIS.Core.Effects?.invalidate(); return result; }
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
    return key === "kongJieMie" ? WIS.Meta.TreasureLedger.transaction(state,purchase) : purchase();
  }
  // Shared by production sources/effects and the current-effect UI preview.
  const abilityMultiplierRules = Object.freeze({
    body: ["xianForce", .25], materialSpirit: ["xianForce", .08],
    crystal: ["yuanForce", .15], worldAura: ["yuanForce", .25],
    rules: ["yuanForce", .18], divineArt: ["yuanForce", .25]
  });
  // Keep the old slope through the former cap, then continue logarithmically.
  // Value and first derivative match at the knee; Decimal math has no hard cap.
  function uncappedExponent(strength, knee) {
    return B.add(1, B.lte(strength,knee) ? strength
      : B.mul(knee,B.add(1,B.BN(B.div(strength,knee)).ln())));
  }
  // Same ln(1+x) function at every magnitude. The small-x series prevents
  // Decimal's represented 1+x from rounding to 1 and erasing positive income.
  function ln1p(value) {
    if(isQuantity(value))return B.mul(WIS.Core.AmountFormulas.logOnePlusRatio(value),Math.LN10);
    const x=B.BN(value);
    return B.lt(x,"1e-5")
      ? B.mul(x,B.add(B.sub(1,B.div(x,2)),B.sub(B.div(B.mul(x,x),3),B.div(B.pow(x,3),4))))
      : B.BN(B.add(1,x)).ln();
  }
  const log1p10 = value => isQuantity(value)?WIS.Core.AmountFormulas.logOnePlusRatio(value):B.div(ln1p(value),Math.LN10);
  function abilityMultiplier(state, key) {
    if (!has(state, key)) return 1;
    const pLog = () => B.add(1,logOnePlusRatio(fullAmount(state,"nieForce"),"1e4"));
    const nLog = () => log1p10(fullAmount(state,"universeCoefficient"));
    const oLog=()=>log1p10(WIS.Core.Amount?.enabled()?WIS.Meta.Treasures.quantity(state,'originImprint'):WIS.Meta.Treasures.count(state,'originImprint'));
    if (key === "innerWorld") {const stock=fullAmount(state,"nieForce"),inner=isQuantity(stock)&&WIS.Core.Amount.wordView(stock).length>1?logOnePlusRatio(stock,"1e4"):log1p10(divided(stock,"1e4"));return B.pow(B.add(1,log1p10(inner)),.25);}
    if (key === "spiritualGod") return 5;
    if (key === "spokenLaw") return B.pow(pLog(),1.5);
    if (key === "mergeHeaven") return B.pow(B.add(1,B.mul(10,nLog())),.5);
    if (key === "followLaw") return B.add(1,B.mul(.2,ln1p(B.div(nLog(),2))));
    if (key === "zunYang") return B.add(1,B.mul(.35,ln1p(nLog())));
    if (key === "virtualOrigin") return B.add(1,B.mul(.1,ln1p(oLog())));
    if (key === "daoWuYa") return daoWuYaExponent(state);
    if (key === "daoYuan") return 2;
    if (key === "originMultiverse") return B.add(1,B.mul(.5,ln1p(oLog())));
    if (["eternalMultiverse","tierNie","tierTranscendence"].includes(key)) {
      const H=WIS.Meta.HighMultiverse;
      if (!H.active(state)) return B.ONE;
      if (key === "eternalMultiverse") {
        const best=H.highest(state), l=WIS.Core.Amount?.enabled()?log1p10(WIS.Core.Amount.field(best,'coefficient')):B.log10(B.add(1,best.coefficient));
        // Bounded coefficient term makes every higher tier at least as strong,
        // even when promotion roots an enormous coefficient down near one.
        return B.pow10(B.add(B.sub(best.order,3),B.div(l,B.add(1,l))));
      }
      const k=H.get(state).order;
      return key === "tierNie" ? B.pow(B.sub(k,1),2) : uncappedExponent(B.mul(.025,B.sub(k,2)),.5);
    }
    if (key === "originBody") return 3;
    if (key === "kongNieZhang") return 10;
    if (key === "kongLingYuan") return 100;
    const rule = abilityMultiplierRules[key];
    if (!rule || !has(state, key)) return 1;
    return powerOnePlusRatio(fullAmount(state,rule[0]),1,rule[1]);
  }
  const yuanCrystalMultiplier = state => WIS.Meta.Treasures.affineValue(state,"yuanCrystal",.002,1);
  const immortalAchievementMultiplier = state => WIS.Meta.Achievements?.greatHeavenlyVenerableMultiplier(state) ?? B.ONE;
  const yuanFromXian = x => powerOnePlusRatio(x,"1e8",.75);
  const thirdStepActive = state => active(state) && !sealed(state) && get(state).realm >= 7;
  const fourthStepActive = state => active(state) && !sealed(state) && get(state).realm >= 11;
  const fifthStepActive = state => active(state) && !sealed(state) && get(state).realm >= 12;
  // Globally smooth production and stock decay; no gameplay threshold/cap.
  const compressUniverseRate = rate => B.mul(10,ln1p(ln1p(B.div(rate,10))));
  const universeStockDecay = stock => powerOnePlusRatio(stock,1000,.5);
  const universeGainMultiplier = state => B.mul(B.mul(abilityMultiplier(state,"innerWorld"),abilityMultiplier(state,"zunYang")),abilityMultiplier(state,"virtualOrigin"));
  const finalUniverseRate = (rate,stock,multiplier=B.ONE) => WIS.Core.StableProductQuotient.evaluate([compressUniverseRate(rate),multiplier],[universeStockDecay(stock)]);
  const highMultiverseRawRate = state => fifthStepActive(state)
    ? compressUniverseRate(powerRatio(fullAmount(state,"nieForce"),"1e12",.25)) : B.ZERO;
  const daoWuYaExponent = state => fourthStepActive(state) && has(state,"daoWuYa")
    ? B.add(1,B.mul(.5,ln1p(B.div(log1p10(fullAmount(state,"multiverseCoefficient")),2)))) : B.ONE;
  const applyDaoWuYa = (state,gain) => B.gt(gain,1) ? B.pow(gain,daoWuYaExponent(state)) : gain;
  const multiverseRate = state => fourthStepActive(state) ? powerRatio(fullAmount(state,"universeCoefficient"),1000,.5) : B.ZERO;
  function thirdStepRates(state) {
    let nieForce = B.ZERO, universeCoefficient = B.ZERO;
    if (!thirdStepActive(state)) return { nieForce, universeCoefficient, multiverseCoefficient:multiverseRate(state) };
    nieForce = B.mul(powerRatio(fullAmount(state,"yuanForce"),"1e16",.25),
      B.mul(abilityMultiplier(state,"spiritualGod"),abilityMultiplier(state,"mergeHeaven")));
    nieForce = B.mul(nieForce,B.mul(abilityMultiplier(state,"eternalMultiverse"),abilityMultiplier(state,"tierNie")));
    // The three universe abilities multiply after compression in rates().
    if (has(state,"emptyGate")) universeCoefficient = B.div(powerRatio(fullAmount(state,"nieForce"),"1e4",.25),300);
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
    const A=WIS.Core.Amount,full=A?.enabled()?WIS.Meta.Treasures.quantity(state,'originImprint'):null,rate=full?A.project(full):B.BN(WIS.Meta.Treasures.count(state,'originImprint'));
    return {rate,...(full?{quantityRate:full}:{}),keys:B.gt(rate,0) ? WIS.Core.Runtime.withState(state,()=>shengKeys.filter(key => WIS.Meta.TreasureProgress.qualification(state,key) === null)) : []};
  }
  function awardSheng(state, seconds, frozen = captureSheng(state)) {
    WIS.Core.Runtime.assertMutable();
    if (!Number.isFinite(seconds) || seconds < 0 || !B.isFiniteBN(frozen.rate) || B.lt(frozen.rate,0)) throw Error("空玄·生结算无效");
    if (!(seconds > 0) || !B.gt(frozen.rate,0) || !frozen.keys.length) return;
    if(WIS.Core.Amount?.enabled()){
      const A=WIS.Core.Amount,F=WIS.Core.FiniteProgress,rate=A.from(frozen.quantityRate??frozen.rate),gain=A.scale(rate,seconds);
      if(!B.eq(A.project(rate),frozen.rate))throw Error('Sheng frozen rate projection mismatch');
      return WIS.Meta.TreasureLedger.transaction(state,()=>transaction(state,n=>{
        // The gain is fixed for this invocation. Canonical Amount identity
        // includes every prior low word; only equal full inputs share work.
        const completed=new Map();let emptyPoint=null;
        for(const key of frozen.keys){if(!shengKeys.includes(key))throw Error('Unknown Sheng reward');
          const point=n.shengProgress[key]||(emptyPoint ||= F.create(1)),prior=F.quantity(point);
          let result=completed.get(prior);
          if(!result){const total=A.add(prior,gain),whole=A.integerPart(total);result={whole,fraction:A.subtract(total,whole),point:null};}
          if(A.compare(result.whole,0)>0)WIS.Meta.Treasures.add(state,key,result.whole,{applyAwardMultiplier:false});
          const next=result.point||F.create(1,result.fraction);n.shengProgress[key]=next;
          // Only internally confirmed immutable points can be shared. Other
          // representations keep the original per-field construction path.
          if(F.isCanonical?.(next))result.point=next;
          if(completed.size<shengKeys.length)completed.set(prior,result);
        }
      }));
    }
    const gain = B.mul(frozen.rate,seconds), F = WIS.Core.FiniteProgress, ledger = L();
    if (!B.isFiniteBN(gain)) throw Error("空玄·生收益无法表示");
    // Frozen source eligibility is deliberately not read again after natural
    // loot. Each treasure owns its fractional remainder, including across saves.
    return WIS.Meta.TreasureLedger.transaction(state,()=>transaction(state,n=>{
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
    const x = fullAmount(state, "xianForce");
    if (has(state, "xianForce")) {
      xianForce = B.mul("2e4", B.add(1, logOnePlusRatio(WIS.Core.Amount?.enabled()?WIS.Core.Resources.readExact('cultivation.immortal.immortalPower',state):state.immortalPower,"1e40")));
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
    const raw = rawRates(state),A=WIS.Core.Amount,penalized=key=>A?.enabled()?A.project(WIS.Core.Penalties.applyGoogolPenalty(key,fullAmount(state,key),A.from(raw[key]),state)):WIS.Core.Penalties.applyGoogolPenalty(key,amount(state,key),raw[key],state);
    return {
      xianForce:penalized('xianForce'),yuanForce:penalized('yuanForce'),
      nieForce:raw.nieForce, universeCoefficient:finalUniverseRate(raw.universeCoefficient,fullAmount(state,"universeCoefficient"),universeGainMultiplier(state)), multiverseCoefficient:finalUniverseRate(raw.multiverseCoefficient,fullAmount(state,"multiverseCoefficient"))
    };
  }
  function intervalSupport(){return WIS.Simulation.LegacySettlementCheckpoints.retired();}
  function discreteYuanModel(){return WIS.Simulation.LegacySettlementCheckpoints.retired();}
  function plan(state, seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) throw Error("修真道结算时长无效");
    const r = rates(state),factor=WIS.Simulation.Compensation.factor();
    if(WIS.Core.Amount?.enabled()){
      const A=WIS.Core.Amount,duration=A.scale(seconds,factor),quantities=Object.fromEntries(resourceKeys.map(k=>[k,A.multiply(r[k],duration)]));
      return {...Object.fromEntries(resourceKeys.map(k=>[k,A.project(quantities[k])])),quantities};
    }
    return Object.fromEntries(resourceKeys.map(k => [k, B.mul(r[k], seconds * factor)]));
  }
  function prepareResource(e,k,gains){
        const gain = gains[k] ?? B.ZERO;
        if (!B.isFiniteBN(gain) || B.lt(gain, 0)) throw Error("修真道新增收益无效，未提交");
        let income = WIS.Core.Amount?.enabled()&&gains.quantities?.[k]?WIS.Core.Amount.words(gains.quantities[k]):[gain];
        const repeat = gains.repeat?.[k];
        if (repeat) {
          if (!Number.isSafeInteger(repeat.count) || repeat.count < 1 || !B.isFiniteBN(repeat.term) || B.lt(repeat.term,0) ||
              !B.eq(B.mul(repeat.term,repeat.count),gain)) throw Error("修真道重复收益计划无效，未提交");
          income = [`${repeat.term}*${repeat.count}`];
        }
        write(e, L().add(words(e), income));
        write(e, L().add(words(e, "total"), income), "total"); if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount;if(A.compare(A.field(e),A.field(e,"peak"))>0)Object.assign(e,A.boundedFieldParts(A.field(e),"peak"));}else e.peak = B.max(e.peak, e.amount);
    return e;
  }
  function prepare(state, gains) {
    if (gains && resourceKeys.some(k => !B.isFiniteBN(gains[k] ?? 0) || B.lt(gains[k] ?? 0, 0)))
      throw Error("修真道新增收益无效，未提交");
    if (!gains || resourceKeys.every(k => B.eq(gains[k] ?? 0, 0))) return get(state);
    const draft=WIS.Core.Amount?.enabled()?WIS.Core.State.createDraft(state):null,n=draft?get(draft.state):normalize(get(state));
      for (const k of resourceKeys) prepareResource(n.resources[k],k,gains);
    return draft?draft.finishValue(n):n;
  }
  function prepareOperation(state,gains){
    const perform=()=>prepare(state,gains);if(!WIS.Core.Amount?.enabled()||!gains)return perform;
    const Q=WIS.Core.Resources,C=WIS.Core.CertifiedRankMath,original=get(state),owner=state.cultivation.systems.immortal,source=owner.xiuzhen,resourceOwner=original.resources,quantityOwner=gains.quantities,repeatOwner=gains.repeat;
    const gainCurrent=Q.numericInputCurrent(gains,resourceKeys),quantities=resourceKeys.map(k=>quantityOwner?.[k]),quantityChecks=quantities.map(value=>Q.quantityInputCurrent(value)),entries=resourceKeys.map(k=>original.resources[k]),entryChecks=entries.map(e=>Q.numericInputCurrent(e,['amount','residual','total','totalResidual','peak','peakResidual'])),repeats=resourceKeys.map(k=>repeatOwner?.[k]),repeatChecks=repeats.map(row=>row?Q.numericInputCurrent(row,['term','count']):()=>true);
    const current=()=>state.cultivation.systems.immortal===owner&&owner.xiuzhen===source&&original.resources===resourceOwner&&gains.quantities===quantityOwner&&gains.repeat===repeatOwner&&gainCurrent()&&resourceKeys.every((k,i)=>original.resources[k]===entries[i]&&entryChecks[i]()&&quantityOwner?.[k]===quantities[i]&&quantityChecks[i]()&&repeatOwner?.[k]===repeats[i]&&repeatChecks[i]());
    return Q.privateOperation(state,perform,()=>C.task('xiuzhen-resource-preparation',function*(){
      if(resourceKeys.some(k=>!B.isFiniteBN(gains[k]??0)||B.lt(gains[k]??0,0)))throw Error('修真道新增收益无效，未提交');
      if(resourceKeys.every(k=>B.eq(gains[k]??0,0)))return original;
      const resources={...original.resources};
      for(const k of resourceKeys)resources[k]=yield ()=>prepareResource({...original.resources[k]},k,gains);
      return {...original,resources};
    }),result=>result,current);
  }
  function commit(state, gains) {
    const n = prepare(state, gains);
    awardOrigin(state,gains);
    if (n !== get(state)) { state.cultivation.systems.immortal.xiuzhen = n; WIS.Core.Effects?.invalidate(); }
  }
  // The registry requests deferred values; direct callers retain numeric descriptors.
  function effects(state, { deferValues = false } = {}) {
    if (!active(state) || sealed(state) || (!get(state).entered && !yinYang(state))) return [];
    const effect = (id, target, layer, value) => ({ id: "xiuzhen-" + id, name: abilities.find(a => a.key === id)?.name || "阴虚阳实",
      group: "修真道", target, layer, value:deferValues?value:(typeof value==="function"?value(state):value), valueAt:typeof value==="function"?value:null, dynamicResources:({body:["xianForce"],rules:["yuanForce"],divineArt:["yuanForce"],spokenLaw:["nieForce"],followLaw:["universeCoefficient"],tierTranscendence:["highMultiverseCoefficient"]})[id]||[] });
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
    for (const key of resourceKeys) for (const field of ["total", "totalResidual", "spent", "spentResidual", "peak",...(WIS.Core.Amount?.enabled()?["peakResidual"]:[])])
      n.resources[key][field] = Array.isArray(old.resources[key][field]) ? old.resources[key][field].slice() : old.resources[key][field]??(field==='peakResidual'?[]:B.ZERO);
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
  WIS.Cultivation.Xiuzhen = Object.freeze({ validate, realms, abilities, resourceKeys, labels, fresh, normalize, get, statisticsRealmName, statisticsScaleName, unlocked, available, active,
    sealed, qiPathSealed, yinYang, has, amount, quantity,words, availableWords, canSpend, canBreakthrough, breakthrough,
    canBuy, buy, fifthStepActive, highMultiverseRawRate, fourthStepActive, daoWuYaExponent, applyDaoWuYa, multiverseRate, abilityMultiplier, yuanCrystalMultiplier, thirdStepActive, thirdStepRates, originProgressGain, awardOrigin, captureSheng, awardSheng, rawRates, rates, intervalSupport, discreteYuanModel, plan, prepare, prepareOperation, commit, effects, abilityView, softcapRemoved, reset, automation,
    universeGainMultiplier,
    universeStockMultiplier(state,key) { return B.div(1,universeStockDecay(fullAmount(state,key))); },
    spendMana(state, cost) { return transaction(state, () => debit(state, "mana", cost)); },
    spendResource(state, key, cost) { return transaction(state, () => debit(state, key, cost)); } });
}(window.WIS));
