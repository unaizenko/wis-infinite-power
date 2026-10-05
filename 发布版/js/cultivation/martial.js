(function defineMartial(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, C = WIS.Cultivation.MartialConfig;
  const resourceKeys = Object.freeze(["qi","body","heart","soul"]);
  const byKey = new Map(C.abilities.map(a => [a.key,a]));
  const entry = () => ({amount:B.ZERO,total:B.ZERO,spent:B.ZERO,peak:B.ZERO});
  const fresh = () => ({version:1,resources:Object.fromEntries(resourceKeys.map(k => [k,entry()])),abilities:{},automation:Object.fromEntries(resourceKeys.map(k => [k,false])),longxiangProgress:B.ZERO,automationTime:B.ZERO,automationCursor:0,heartPotential:B.ZERO,heartInvestment:B.ZERO,heartLedgerExponent:B.ONE});
  const record = x => x && typeof x === "object" && !Array.isArray(x);
  function nonnegative(value, fallback=0) {
    const n = B.parseFinite(value === undefined ? fallback : value);
    if (!n || B.lt(n,0)) throw Error("武道数值非法");
    return n;
  }
  function normalize(raw) {
    if (raw == null) return fresh();
    if (!record(raw) || raw.version !== undefined && raw.version !== 1) throw Error("武道存档版本或格式非法");
    const n = fresh();
    for (const box of ["resources","abilities","automation"]) if (raw[box] !== undefined && !record(raw[box])) throw Error("武道存档分支格式非法");
    for (const key of resourceKeys) {
      const e = raw.resources?.[key]; if (e !== undefined && !record(e)) throw Error("武道资源格式非法");
      for (const f of ["amount","total","spent","peak"]) n.resources[key][f] = nonnegative(e?.[f]);
      const toggle = raw.automation?.[key]; if (toggle !== undefined && typeof toggle !== "boolean") throw Error("武道自动化格式非法");
      n.automation[key] = toggle === true;
    }
    for (const [key,value] of Object.entries(raw.abilities || {})) {
      const a = byKey.get(key);
      if (!a || !Number.isInteger(value) || value < 0 || value > a.maxLevel) throw Error("武道能力等级非法");
      if (value) n.abilities[key] = value;
    }
    for (const f of ["longxiangProgress","automationTime","heartPotential","heartInvestment"]) n[f] = nonnegative(raw[f]);
    n.heartLedgerExponent = nonnegative(raw.heartLedgerExponent,1);
    if (B.lt(n.heartLedgerExponent,1) || B.gt(n.heartLedgerExponent,1.15) || B.gt(n.automationTime,.1)) throw Error("武道累积状态非法");
    if (raw.automationCursor !== undefined && (!Number.isInteger(raw.automationCursor) || raw.automationCursor < 0 || raw.automationCursor > 3)) throw Error("武道自动化游标非法");
    n.automationCursor = raw.automationCursor || 0;
    return n;
  }
  const get = s => s?.cultivation?.systems?.martial || fresh();
  const amount = (s,key) => resourceKeys.includes(key) ? B.BN(get(s).resources[key].amount) : B.ZERO;
  const active = s => s?.cultivation?.active === "martial";
  const challenge = s => s?.meta?.challenges?.activeChallenge ?? s?.activeChallenge;
  const completed = (s,key) => B.gt(s?.meta?.challenges?.challengeCompletions?.[key] ?? s?.challengeCompletions?.[key] ?? 0,0);
  const achievement = (s,key) => s?.meta?.achievements?.unlockedAchievements?.[key] === true || s?.unlockedAchievements?.[key] === true;
  const lv = (s,key) => active(s) ? get(s).abilities[key] || 0 : 0;
  const coreAmount = (s,key) => nonnegative(s?.core?.resources?.[key] ?? s?.[key]);
  const F = n => B.add(B.mul(B.pow(nonnegative(n),2),.25),B.mul(n,.75));
  function inverseF(p) {
    const scaled = B.mul(p,4), root = B.sqrt(B.add(scaled,2.25));
    // At extreme layers sqrt(4p) and 4p share one representable value;
    // rationalizing then divides that value by itself and incorrectly yields 1.
    // The equivalent quadratic root has no small-number cancellation here.
    if (B.gt(p,1) && B.eq(root,scaled)) return B.sub(root,1.5);
    return B.div(scaled,B.add(root,1.5));
  }
  function incrementalGain(current,unpowered,investment,exponent) {
    // F(x+d)-F(x)=d*(2x+3+d)/4. Solve for d directly, so a rounded
    // inverseF(F(x)) can never be mistaken for newly invested potential.
    const anchor = B.add(unpowered,1.5), scaled = B.mul(investment,4);
    const delta = B.div(scaled,B.add(B.sqrt(B.add(B.pow(anchor,2),scaled)),anchor));
    if (B.eq(exponent,1)) return delta;
    const ratio = B.div(delta,unpowered);
    // Rounded F(x) and x can disagree near a layer boundary: investment <=
    // F(x) alone does not prove the COMPUTED ratio is <= 1. Return null for
    // the historical formula unless both actual Number inputs are bounded.
    if (!B.gte(ratio,0) || !B.lte(ratio,1) || !B.gte(exponent,1) || !B.lte(exponent,1.15)) return null;
    // A bounded nonzero-layer ratio is necessarily infinitesimal. Even the
    // reward exponent cannot make it move this logarithmic current balance.
    if (ratio.layer !== 0) return B.ZERO;
    return B.mul(current,Math.expm1(exponent.toNumber()*Math.log1p(ratio.toNumber())));
  }
  function commit(s,n,core=null) {
    const validated = normalize(n);
    s.cultivation = {...s.cultivation,systems:{...s.cultivation?.systems,martial:validated}};
    if (core) {
      if (s.core?.resources) s.core = {...s.core,resources:{...s.core.resources,...core}};
      else for (const [key,value] of Object.entries(core)) s[key] = value;
    }
    WIS.Core.Effects?.invalidate?.();
  }
  function grant(n,key,gain) {
    const e = n.resources[key]; gain = nonnegative(gain);
    e.amount = B.add(e.amount,gain); e.total = B.add(e.total,gain); e.peak = B.max(e.peak,e.amount);
    if (key === "heart") n.heartPotential = F(B.pow(e.amount,B.div(1,n.heartLedgerExponent)));
  }
  function debit(n,key,cost) {
    const e = n.resources[key]; cost = nonnegative(cost);
    if (B.lt(e.amount,cost)) throw Error("武道候选余额不足");
    e.amount = B.sub(e.amount,cost); e.spent = B.add(e.spent,cost);
    if (key === "heart") n.heartPotential = F(B.pow(e.amount,B.div(1,n.heartLedgerExponent)));
  }
  const harmony = s => ["martialIntentQi","martialHeartIntent","martialQiPower"].every(k => completed(s,k)) || achievement(s,"martialHarmony");
  function conversionExponent(s) {
    if (!completed(s,"martialStealHeaven")) return B.ONE;
    const h = B.log10(B.add(amount(s,"heart"),1));
    return B.add(1,B.mul(.15,B.div(h,B.add(h,10))));
  }
  // Shared by production formulas and read-only ability cards.
  function abilityMultiplier(s,key,level=lv(s,key)) {
    if(!level)return B.ONE;
    switch(key){
      case "mingJin": return B.add(1,B.mul(.02,B.log10(B.add(coreAmount(s,"joules"),1))));
      case "yiJin": return B.BN(1.2);
      case "anJin": case "taiJi": return B.BN(1.3);
      case "yiGu": return B.add(1,B.mul(.04,B.log10(B.add(coreAmount(s,"power"),1))));
      case "huaJin": return B.add(1,B.mul(.05,B.log10(B.add(amount(s,"qi"),1))));
      case "yiSui": return B.add(1,B.mul(.1,B.log10(B.add(amount(s,"body"),1))));
      case "ganDong": return B.BN(1.1);
      case "sanTi": return B.BN(1.2);
      case "baGua": case "taiXuan": case "duGu": case "yueNv": return B.BN(1.5);
      case "xingYi": case "duoMing": return B.pow(1.1,level);
      case "jiuYang": return B.pow(2,level);
      case "jiuYin": case "liuMai": return B.add(1,B.mul(B.log10(B.add(amount(s,"qi"),1)),level*.1));
      case "beiMing": return B.add(1,B.div(B.log10(B.add(coreAmount(s,"joules"),1)),10));
      case "longXiang": return B.pow(1.2,level);
      case "jiaYi": return B.BN(4);
      case "xiangLong": return B.mul(B.pow(1.3,level),abilityMultiplier(s,"liuMai"));
      case "xiaoLi": return B.add(1,B.mul(.1,B.log10(B.add(amount(s,"heart"),1))));
      case "lingXi": return s.intuitionPurchased?B.add(1,B.mul(.1,B.log10(B.add(amount(s,"heart"),1)))):B.ONE;
      case "shenDao": return B.BN(2);
      default: return B.ONE;
    }
  }
  function efficiency(s,key) {
    let e = B.ONE;
    if (lv(s,"jiaYi") && ["qi","body"].includes(key)) e = B.mul(e,abilityMultiplier(s,"jiaYi"));
    if (key === "qi" && lv(s,"taiXuan")) e = B.mul(e,abilityMultiplier(s,"taiXuan"));
    if (key === "qi" && achievement(s,"martialInnate")) e = B.mul(e,2);
    if (key === "body") {
      if (lv(s,"yiJin")) e = B.mul(e,abilityMultiplier(s,"yiJin"));
      if (lv(s,"yiGu")) e = B.mul(e,abilityMultiplier(s,"yiGu"));
      if (lv(s,"yiSui")) e = B.mul(e,abilityMultiplier(s,"yiSui"));
    }
    if (key === "qi" && lv(s,"beiMing")) e = B.mul(e,abilityMultiplier(s,"beiMing"));
    if (key === "heart") {
      for (const [id,m] of [["ganDong",1.1],["duGu",1.5]]) if (lv(s,id)) e = B.mul(e,abilityMultiplier(s,id));
    }
    if (key === "soul" && lv(s,"yueNv")) e = B.mul(e,abilityMultiplier(s,"yueNv"));
    if (key === "heart") {
      if (challenge(s) === "martialHeartIntent") e = B.mul(e,.5);
      else if (completed(s,"martialHeartIntent")) e = B.mul(e,2);
    }
    if (challenge(s) === "martialQiPower" && ["qi","body"].includes(key)) {
      const d = B.sub(B.log10(B.add(B.div(coreAmount(s,"joules"),10),1)),B.log10(B.add(coreAmount(s,"power"),1)));
      const lead = key === "qi" ? d : B.mul(d,-1);
      if (B.gt(lead,.5)) e = B.mul(e,B.max(.1,B.div(1,B.add(1,B.sub(lead,.5)))));
    }
    return e;
  }
  function preview(s,key) {
    const result = {key,gain:B.ZERO,costs:{},allowed:false,reason:"当前未选择武道",efficiency:B.ONE,heartExponent:B.ONE};
    result.consumed = result.costs;
    if (!active(s) || !resourceKeys.includes(key)) return result;
    const n = get(s), costs = result.costs;
    let input = B.ZERO;
    if (key === "qi" || key === "body") {
      const coreKey = key === "qi" ? "joules" : "power";
      costs[coreKey] = coreAmount(s,coreKey); input = B.div(costs[coreKey],key === "qi" ? 10000 : 1000);
    } else if (key === "heart") {
      for (const k of ["qi","body"]) costs[k] = harmony(s) ? B.sub(amount(s,k),B.min(amount(s,k),amount(s,"heart"))) : amount(s,k);
      input = B.div(B.min(costs.qi,costs.body),5);
    } else {
      for (const k of ["qi","body","heart"]) costs[k] = amount(s,k);
      input = B.min(B.div(costs.qi,10),B.min(B.div(costs.body,10),costs.heart));
    }
    result.efficiency = efficiency(s,key);
    const exponent = ["qi","body"].includes(key) ? conversionExponent(s) : B.ONE;
    result.heartExponent = exponent;
    // Rebase cumulative potential at the current exponent before accepting new
    // input: changing the reward exponent never reissues already earned heart.
    const current = n.resources[key].amount, unpowered = B.pow(current,B.div(1,exponent)), base = F(unpowered);
    const potential = B.add(base,B.mul(input,result.efficiency));
    result.potential = potential; result.investment = B.mul(input,result.efficiency);
    // Keep the historical operation order for ordinary balances and inputs
    // that dominate existing potential (including extreme-layer conversions).
    // Only logarithmic balances with stock-dominated input need cancellation-
    // free evaluation of the increment instead of subtracting two huge roots.
    result.gain = B.eq(input,0) ? B.ZERO : current.layer > 0 && B.gt(current,1) && B.lte(result.investment,base)
      ? incrementalGain(current,unpowered,result.investment,exponent)
      : null;
    if (result.gain === null) result.gain = B.max(0,B.sub(B.pow(inverseF(potential),exponent),current));
    if (!B.gt(B.add(current,result.gain),current)) result.gain = B.ZERO;
    result.allowed = B.gt(input,0) && B.gt(result.gain,0);
    result.reason = result.allowed ? "" : "投入不足或没有可表示的收益";
    return result;
  }
  function convert(s,key) {
    WIS.Core.Runtime?.assertMutable?.();
    const p = preview(s,key); if (!p.allowed) return false;
    const n = normalize(get(s)), core = {};
    for (const [k,cost] of Object.entries(p.costs)) {
      if (resourceKeys.includes(k)) debit(n,k,cost);
      else { core[k] = B.sub(coreAmount(s,k),cost); core[k+"GainResidual"] = B.ZERO; core[k+"GainResidualTail"] = []; }
    }
    grant(n,key,p.gain);
    if (key === "heart") { n.heartPotential = p.potential; n.heartInvestment = B.add(n.heartInvestment,p.investment); n.heartLedgerExponent = p.heartExponent; }
    commit(s,n,Object.keys(core).length ? core : null); return true;
  }
  function slots(s) { return challenge(s) === "martialMeridians" ? 1 : 1 + (lv(s,"reverseArt") ? 1 : 0) + (completed(s,"martialMeridians") ? 2 : 0); }
  const slotUsed = s => C.abilities.filter(a => a.slot && lv(s,a.key)).length;
  function abilityView(s,key) {
    const a = byKey.get(key), level = a ? get(s).abilities[key] || 0 : 0;
    if (!a) return {key,level:0,maxLevel:0,cost:B.ZERO,requirements:{qi:B.ZERO,body:B.ZERO,heart:B.ZERO},allowed:false,reason:"未知能力",effectText:""};
    const next = level+1, requirements = {qi:B.ZERO,body:B.ZERO,heart:B.ZERO};
    for (const [k,v] of Object.entries(a.requirements)) requirements[k] = B.BN(v);
    if (key === "xingYi") requirements.heart = B.mul(15,B.pow(1.25,level));
    if (["qianKun","liuMai"].includes(key)) requirements.qi = B.mul(20,B.pow(2,level));
    let cost = Array.isArray(a.price) ? B.BN(a.price[Math.min(level,a.price.length-1)]) : B.BN(a.price);
    if (key === "xingYi") cost = B.BN(2+Math.floor(level/2));
    if (key === "xiangLong") cost = B.BN(1+Math.floor(level/3));
    if (key === "liuMai") cost = B.BN(next);
    if (key === "duoMing") cost = B.BN(2+Math.floor(level/2));
    if (a.group && !level) {
      const count = C.abilities.filter(x => x.group === a.group && (get(s).abilities[x.key] || 0)>0).length;
      const factor = B.pow(a.group === "guoshu" ? 1.5 : 2,count);
      requirements.heart = B.mul(requirements.heart,factor);
      if (a.group === "jueji") cost = B.mul(cost,factor);
    }
    let reason = !active(s) ? "当前未选择武道" : level >= a.maxLevel ? "已达上限" : key === "longXiang" && level ? "龙象通过修炼进度升级" : "";
    if (!reason && a.prerequisites.some(k => !lv(s,k))) reason = "前置能力未解锁";
    if (!reason && a.slot && !level && slotUsed(s) >= slots(s)) reason = "内功槽位已满";
    if (!reason && Object.entries(requirements).some(([k,v]) => B.lt(amount(s,k),v))) reason = "当前资源未达到要求";
    const costResource = level > 0 ? a.upgradeResource : "soul";
    if (!reason && B.lt(amount(s,costResource),cost)) reason = ({soul:"神魂",body:"体",qi:"气"}[costResource]) + "不足";
    return {...a,level,maxLevel:a.maxLevel,cost,costResource,requirements,allowed:!reason,reason,effectText:a.description};
  }
  const canBuy = (s,key) => abilityView(s,key).allowed;
  function buy(s,key) {
    WIS.Core.Runtime?.assertMutable?.(); const view = abilityView(s,key); if (!view.allowed) return false;
    const n = normalize(get(s)); debit(n,view.costResource,view.cost); n.abilities[key] = view.level+1; commit(s,n);
    if (["stealHeaven","innerHarmony","innate"].includes(key)) s.meta = {...s.meta,martialQualifications:{...s.meta?.martialQualifications,[key]:true}};
    return true;
  }
  const curve = (value,coefficient) => B.mul(coefficient,B.div(B.sub(B.pow(B.add(value,1),1.25),1),B.sub(B.pow(2,1.25),1)));
  function qiPowerSource(s,level=lv(s,"qianKun")) {
    return level ? B.mul(B.mul(curve(amount(s,"qi"),2),level),abilityMultiplier(s,"liuMai")) : B.ZERO;
  }
  function sources(s) {
    if (!active(s)) return {joules:B.ZERO,power:B.ZERO,qiPower:B.ZERO};
    let q = curve(amount(s,"qi"),20), body = curve(amount(s,"body"),2);
    if (lv(s,"mingJin")) body = B.mul(body,abilityMultiplier(s,"mingJin"));
    if (lv(s,"anJin")) body = B.mul(body,abilityMultiplier(s,"anJin"));
    if (lv(s,"huaJin")) body = B.mul(body,abilityMultiplier(s,"huaJin"));
    q = B.mul(q,abilityMultiplier(s,"jiuYang"));
    q = B.mul(q,abilityMultiplier(s,"longXiang"));
    const qiPower = qiPowerSource(s);
    if (lv(s,"jiaYi")) {q = B.mul(q,.5); body = B.mul(body,.5);}
    if (challenge(s) === "martialIntentQi") q = B.ZERO;
    else if (completed(s,"martialIntentQi")) q = B.mul(q,3);
    return {joules:q,power:body,qiPower};
  }
  function effects(s) {
    if (!active(s)) return [];
    const result = [], effect = (id,target,value,layer="regionMultiplier",dependencies=[]) => ({id:"martial-"+id+"-"+target,name:byKey.get(id)?.name || "武道",group:"武道",target,layer,value:typeof value === "function" ? value(s) : value,valueAt:typeof value === "function" ? value : null,dynamicResources:dependencies});
    if (lv(s,"sanTi")) result.push(effect("sanTi","joules",abilityMultiplier(s,"sanTi")));
    for (const [id,m] of [["taiJi",1.3],["baGua",1.5]]) if (lv(s,id)) for (const target of ["joules","power"]) result.push(effect(id,target,abilityMultiplier(s,id)));
    if (lv(s,"xingYi")) for (const target of ["joules","power"]) result.push(effect("xingYi",target,abilityMultiplier(s,"xingYi")));
    if (lv(s,"jiuYin")) result.push(effect("jiuYin","power",current=>abilityMultiplier(current,"jiuYin"),"regionMultiplier",["martialQi"]));
    if (lv(s,"xiangLong")) result.push(effect("xiangLong","rock",current=>abilityMultiplier(current,"xiangLong"),"sourceMultiplier",["martialQi"]));
    if (lv(s,"xiaoLi")) result.push(effect("xiaoLi","focus",current=>abilityMultiplier(current,"xiaoLi"),"sourceMultiplier",["martialHeart"]));
    if (lv(s,"lingXi")) result.push(effect("lingXi","focus",current=>abilityMultiplier(current,"lingXi"),"sourceMultiplier",["martialHeart"]));
    if (lv(s,"duoMing")) result.push(effect("duoMing","killingIntent",abilityMultiplier(s,"duoMing"),"sourceMultiplier"));
    if (lv(s,"shenDao")) result.push(effect("shenDao","ghostBrain",abilityMultiplier(s,"shenDao"),"sourceMultiplier"));
    return result;
  }
  function heartRequirement(stage) {
    const name = typeof stage === "string" ? stage : stage?.name || "";
    for (const [label,value] of Object.entries(C.heartThresholds)) if (name.includes(label)) return B.BN(value);
    let threshold = typeof stage === "number" || B.isDecimal(stage) ? stage : stage?.power ?? stage?.threshold ?? stage?.requirement ?? stage?.start ?? stage?.startPower;
    if (threshold == null && WIS.Core.Config?.softcaps) threshold = WIS.Core.Config.softcaps.find(x => x.name === name)?.power;
    return threshold == null ? B.BN(1000) : B.mul(1000,B.pow(B.div(nonnegative(threshold),"3.033e15"),.25));
  }
  function heartExponent(s,stage,exponent) {
    const e = nonnegative(exponent,1);
    if (!active(s) || challenge(s) === "martialStealHeaven") return e;
    const req = heartRequirement(stage), w = B.eq(req,0) ? B.ONE : B.min(1,B.sqrt(B.div(amount(s,"heart"),req)));
    return B.add(e,B.mul(B.sub(1,e),w));
  }
  function automaticUnlocked(s,key) {
    if (!resourceKeys.includes(key) || !active(s)) return false;
    if (["qi","body"].includes(key)) return Math.max(s?.lifetimeHighestScaleIndex || 0,s?.highestScaleIndex || 0,s?.powerSystem?.systems?.scale?.progress?.highestScaleIndex || 0) >= 3;
    return key === "heart" ? completed(s,"martialStealHeaven") : harmony(s);
  }
  function setAutomation(s,key,enabled) {
    WIS.Core.Runtime?.assertMutable?.();
    if (!resourceKeys.includes(key) || typeof enabled !== "boolean" || !active(s) || enabled && !automaticUnlocked(s,key)) return false;
    if (get(s).automation[key] === enabled) return false;
    const n = normalize(get(s)); n.automation[key] = enabled; commit(s,n); return true;
  }
  function advance(s,seconds) {
    WIS.Core.Runtime?.assertMutable?.(); const dt = nonnegative(seconds); if (!active(s) || B.eq(dt,0)) return false;
    const n = normalize(get(s)); n.automationTime = B.min(.1,B.add(n.automationTime,dt));
    let l = n.abilities.longXiang || 0;
    if (l && l < 13) {
      n.longxiangProgress = B.add(n.longxiangProgress,B.mul(dt,B.add(1,B.log10(B.add(n.resources.body.amount,1)))));
      while (l < 13) { const need = B.mul(60,B.pow(1.4,l-1)); if (B.lt(n.longxiangProgress,need)) break; n.longxiangProgress = B.sub(n.longxiangProgress,need); n.abilities.longXiang = ++l; }
    }
    commit(s,n); return true;
  }
  function automate(s) {
    WIS.Core.Runtime?.assertMutable?.(); if (!active(s) || B.lt(get(s).automationTime,.1)) return false;
    const start = get(s).automationCursor;
    // Consume one real cadence opportunity, even when no conversion is ready.
    const n = normalize(get(s)); n.automationTime = B.ZERO; n.automationCursor = (start+1)%4;
    for (let i=0;i<4;i++) { const key = resourceKeys[(start+i)%4]; if (n.automation[key] && automaticUnlocked(s,key) && preview(s,key).allowed) {
      const p = preview(s,key), core = {};
      for (const [k,cost] of Object.entries(p.costs)) if (resourceKeys.includes(k)) debit(n,k,cost); else {core[k] = B.sub(coreAmount(s,k),cost); core[k+"GainResidual"] = B.ZERO; core[k+"GainResidualTail"] = [];}
      grant(n,key,p.gain); if (key === "heart") {n.heartPotential=p.potential;n.heartInvestment=B.add(n.heartInvestment,p.investment);n.heartLedgerExponent=p.heartExponent;}
      n.automationCursor=((start+i)%4+1)%4; commit(s,n,Object.keys(core).length?core:null); return true;
    }}
    commit(s,n); return false;
  }
  WIS.Cultivation.Martial = Object.freeze({resourceKeys,fresh,normalize,get,amount,active,F,abilityMultiplier,qiPowerSource,preview,convert,abilityView,canBuy,buy,slots,slotUsed,sources,effects,heartRequirement,heartExponent,advance,automate,automaticUnlocked,setAutomation,conversionExponent,efficiency});
}(window.WIS));
