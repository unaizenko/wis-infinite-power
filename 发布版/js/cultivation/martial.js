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
      for (const f of ["amount","total","spent","peak"]) {if(WIS.Core.Amount?.enabled())Object.assign(n.resources[key],WIS.Core.Amount[f==='spent'?'fieldParts':'boundedFieldParts'](WIS.Core.Amount.field(e||{},f),f));else n.resources[key][f] = nonnegative(e?.[f]);}
      const toggle = raw.automation?.[key]; if (toggle !== undefined && typeof toggle !== "boolean") throw Error("武道自动化格式非法");
      n.automation[key] = toggle === true;
    }
    for (const [key,value] of Object.entries(raw.abilities || {})) {
      const a = byKey.get(key);
      if (!a || !Number.isInteger(value) || value < 0 || value > a.maxLevel) throw Error("武道能力等级非法");
      if (value) n.abilities[key] = value;
    }
    for (const f of ["longxiangProgress","automationTime","heartPotential","heartInvestment"]) {if(WIS.Core.Amount?.enabled())Object.assign(n,WIS.Core.Amount.fieldParts(WIS.Core.Amount.field(raw,f),f));else n[f] = nonnegative(raw[f]);}
    n.heartLedgerExponent = nonnegative(raw.heartLedgerExponent,1);
    if(WIS.Core.Amount?.enabled()&&WIS.Core.Amount.compare(WIS.Core.Amount.field(n,'automationTime'),.1)>0)throw Error('武道自动化时间越界');
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
  const abilityEnabled=(s,key)=>active(s)&&(challenge(s)!=='martialDragon'||byKey.get(key)?.branch==='shroud');
  const lv = (s,key) => abilityEnabled(s,key) ? get(s).abilities[key] || 0 : 0;
  const coreAmount = (s,key) => nonnegative(s?.core?.resources?.[key] ?? s?.[key]);
  const quantity=(s,key)=>WIS.Core.Amount.field(get(s).resources[key]);
  const complete=(s,key)=>WIS.Core.Amount?.enabled()?quantity(s,key):amount(s,key);
  const completeCore=(s,key)=>WIS.Core.Amount?.enabled()?WIS.Core.Resources.readExact('core.'+key,s):coreAmount(s,key);
  const logOnePlus=value=>WIS.Core.Amount?.isAmount(value)?WIS.Core.AmountFormulas.logOnePlusRatio(value):B.log10(B.add(value,1));
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

  // Integrate the marginal price over the incoming increment. Keeping delta
  // separate prevents cancellation of two enormous cumulative potentials.
  function powerIncrement(start,delta,power) {
    if (B.eq(start,0)) return B.pow(delta,power);
    const ratio = B.div(delta,start);
    if (B.lte(ratio,1)) {
      // A positive nonzero-layer ratio <= 1 is below the Number envelope;
      // all higher terms are below Decimal representation at this stock.
      if (ratio.layer !== 0) return B.mul(B.mul(delta,power),B.pow(start,power-1));
      return B.mul(B.pow(start,power),Math.expm1(power*Math.log1p(ratio.toNumber())));
    }
    return B.sub(B.pow(B.add(start,delta),power),B.pow(start,power));
  }
  function priceSegment(start,exponent,power,coefficient) {
    const p = 2/exponent+power, q = 1/exponent+power;
    const a = B.mul(coefficient,.5/exponent/p), b = B.mul(coefficient,.75/exponent/q);
    const cost = delta => B.add(B.mul(a,powerIncrement(start,delta,p)),B.mul(b,powerIncrement(start,delta,q)));
    const slope = value => B.add(B.mul(B.mul(a,p),B.pow(value,p-1)),B.mul(B.mul(b,q),B.pow(value,q-1)));
    return {cost,slope,p,q,a,b};
  }
  function absoluteInvestment(key,value) {
    const config = C.balance.absolute[key], threshold = B.BN(config.threshold);
    if (B.lte(value,threshold)) return F(value);
    const segment = priceSegment(threshold,1,config.power,B.pow(threshold,-config.power));
    return B.add(F(threshold),segment.cost(B.sub(value,threshold)));
  }
  function conversionThresholds(s,key) {
    const absolute = C.balance.absolute[key], relative = C.balance.relative[key];
    const thresholds = [{value:B.BN(absolute.threshold),power:absolute.power*attenuationFactor(s)}];
    if (relative) thresholds.push({value:B.add(relative.floor,B.mul(relative.factor,absoluteInvestment(relative.support,amount(s,relative.support)))),power:relative.power*attenuationFactor(s)});
    return thresholds.sort((a,b) => a.value.cmp(b.value));
  }
  function previousPositive(value) {
    // Used only when an arithmetic midpoint collapses onto a large endpoint.
    // Step exactly one binary coordinate ULP; never invent an invisible grant.
    const data = new DataView(new ArrayBuffer(8)); data.setFloat64(0,value.mag);
    data.setBigUint64(0,data.getBigUint64(0)+(value.mag>0?-1n:1n));
    return B.Decimal.fromComponents(value.sign,value.layer,data.getFloat64(0));
  }
  function solveSegment(segment,start,investment,limit) {
    // Active segments have p,q > 1. Each monomial and the starting tangent
    // gives an upper bound, so this bracket does not span the input magnitude.
    let high = B.min(B.pow(B.div(investment,segment.a),1/segment.p),B.pow(B.div(investment,segment.b),1/segment.q));
    high = B.min(high,B.div(investment,segment.slope(start)));
    if (limit) high = B.min(high,limit);
    let low = B.ZERO;
    for (let i=0;i<80;i++) {
      const cost = segment.cost(high);
      if (B.lte(cost,investment)) return high;
      // Convexity keeps the Newton candidate above the actual root.
      let next = B.sub(high,B.div(B.sub(cost,investment),segment.slope(B.add(start,high))));
      if (!B.gt(next,low) || !B.lt(next,high)) next = B.add(low,B.div(B.sub(high,low),2));
      if (!B.gt(next,low) || !B.lt(next,high)) {
        const below = previousPositive(high);
        if (!B.gt(below,low) || !B.lt(below,high)) return low;
        if (B.lte(segment.cost(below),investment)) return below;
        high = below; continue;
      }
      if (B.lte(segment.cost(next),investment)) low = next; else high = next;
      if (B.eq(B.add(low,B.div(B.sub(high,low),2)),low)) return low;
    }
    return low;
  }
  function balancedGain(s,key,current,investment,exponent,legacyGain) {
    if (!B.gt(investment,0)) return B.ZERO;
    const thresholds = conversionThresholds(s,key);
    if (B.lte(B.add(current,legacyGain),thresholds[0].value)) return legacyGain;
    // conversionExponent is bounded to [1,1.15]; no resource is cast to Number.
    const e = exponent.toNumber();
    let stock = current, remaining = investment, gained = B.ZERO, power = 0, coefficient = B.ONE;
    for (const threshold of thresholds) {
      if (B.lt(stock,threshold.value)) {
        const delta = B.sub(threshold.value,stock), segment = priceSegment(stock,e,power,coefficient), cost = segment.cost(delta);
        if (B.lt(remaining,cost)) {
          if (!power) return legacyGain;
          return B.add(gained,solveSegment(segment,stock,remaining,delta));
        }
        remaining = B.max(0,B.sub(remaining,cost)); gained = B.add(gained,delta); stock = threshold.value;
      }
      power += threshold.power; coefficient = B.mul(coefficient,B.pow(threshold.value,-threshold.power));
    }
    return B.add(gained,solveSegment(priceSegment(stock,e,power,coefficient),stock,remaining));
  }
  const innerCount = s => C.abilities.filter(a => a.branch === "inner" && lv(s,a.key) > 0).length;
  function captureChangSheng(s) {
    if(WIS.Core.Amount?.enabled())return WIS.Cultivation.MartialAmount.capture(s);
    const kinds = lv(s,"changSheng") ? innerCount(s) : 0;
    if (!kinds) return {kinds:0,base:B.ZERO,rate:B.ZERO,current:B.ZERO,thresholds:[]};
    const base = B.mul(kinds*kinds,acquisitionMultiplier(s,"qi")), current = amount(s,"qi"), thresholds = conversionThresholds(s,"qi");
    let attenuation = B.ONE;
    for (const t of thresholds) attenuation = B.mul(attenuation,B.pow(B.max(1,B.div(current,t.value)),t.power));
    return {kinds,base,rate:B.div(base,attenuation),current,thresholds};
  }
  function naturalSegment(start,power,coefficient) {
    const p = power+1, a = B.div(coefficient,2*p);
    return {p,q:p,a,b:a,cost:delta => B.mul(B.mul(a,2),powerIncrement(start,delta,p)),
      slope:value => B.mul(coefficient,B.pow(value,power))};
  }
  function changShengGain(profile,seconds,{frozen=false}={}) {
    if(WIS.Core.Amount?.enabled())return WIS.Cultivation.MartialAmount.naturalGain(profile,seconds,{frozen});
    const dt = nonnegative(seconds);
    if (!profile || !profile.kinds || !B.gt(dt,0)) return B.ZERO;
    if (frozen) return B.mul(profile.rate,dt);
    let budget = B.mul(profile.base,dt), stock = profile.current, gained = B.ZERO, power = 0, coefficient = B.ONE;
    // The passive budget buys only attenuation, never the quadratic conversion
    // potential. Integrate each threshold-crossing increment without subtracting
    // large cumulative values or rounding the existing balance down.
    for (const t of profile.thresholds) {
      if (B.lt(stock,t.value)) {
        const delta = B.sub(t.value,stock), segment = naturalSegment(stock,power,coefficient);
        const cost = segment.cost(delta);
        if (B.lt(budget,cost)) return B.add(gained,power ? solveSegment(segment,stock,budget,delta) : B.min(delta,budget));
        budget = B.max(0,B.sub(budget,cost)); gained = B.add(gained,delta); stock = t.value;
      }
      power += t.power; coefficient = B.mul(coefficient,B.pow(t.value,-t.power));
    }
    return B.add(gained,solveSegment(naturalSegment(stock,power,coefficient),stock,budget));
  }
  function awardChangSheng(s,gain) {
    WIS.Core.Runtime?.assertMutable?.();
    if(WIS.Core.Amount?.enabled()){gain=WIS.Core.Amount.from(gain);if(WIS.Core.Amount.compare(gain,0)<=0)return false;}
    else {gain = nonnegative(gain);if (!B.gt(gain,0)) return false;}
    const n = normalize(get(s)); grant(n,"qi",gain); commit(s,n); return true;
  }
  function attenuationFactor(s) { return lv(s,'warGod') ? .5 : 1; }
  // Receipts belong to a private action candidate, never to historical totals.
  // Bounded total may compact downward and cannot reconstruct a fresh credit.
  const gainReceipts=new WeakMap();
  const clearGainReceipts=n=>gainReceipts.delete(n);
  function rememberGain(n,key,gain){
    if(!['qi','body'].includes(key))return;const A=WIS.Core.Amount;
    if(A?.enabled()?A.compare(gain,0)<=0:!B.gt(gain,0))return;
    const rows=gainReceipts.get(n)||{};rows[key]=A?.enabled()?A.add(rows[key]||0,gain):B.add(rows[key]||0,gain);gainReceipts.set(n,rows);
  }
  function prepareTreasureCredits(s,credits) {
    const P=WIS.Meta.TreasureProgress,A=WIS.Core.Amount;if(!active(s)||!P)return null;
    let candidate=null;for(const [key,gain]of Object.entries(credits)){
      if(P.qualification(s,key)!==null||(A?.enabled()?A.compare(gain,0)<=0:!B.gt(gain,0)))continue;
      candidate ||= {...s,meta:{...s.meta}};
      P.advanceFixed(candidate,key,gain,{eligible:true,gain:B.ONE,award:WIS.Meta.Treasures.getTreasureAwardMultiplier(s,key)});
    }return candidate?.meta||null;
  }
  function prepareGainRewards(s,n,credit=null) {
    const A=WIS.Core.Amount,plus=(a,b)=>A?.enabled()?A.add(a,b):B.add(a,b),rows={...gainReceipts.get(n)};
    if(credit&&['qi','body'].includes(credit.key))rows[credit.key]=plus(rows[credit.key]||0,credit.value);
    return prepareTreasureCredits(s,{lawImprint:plus(rows.qi||0,rows.body||0),sacredBodyImprint:rows.body||0,godBodyImprint:rows.body||0});
  }
  function hasCoreGainRewards(s){return active(s)&&achievement(s,'martialFourPoles');}
  function prepareCoreGainRewards(s,key,gain){return hasCoreGainRewards(s)?prepareTreasureCredits(s,{[key==='power'?'emperorImprint':'sourceStoneImprint']:gain}):null;}
  function imprintMultiplier(s,key,power){return WIS.Core.Amount?.enabled()?WIS.Core.AmountFormulas.power(WIS.Meta.Treasures.affineQuantity(s,key,1,1),power):B.pow(B.add(1,WIS.Meta.Treasures?.count(s,key)??s.meta?.treasures?.[key]??s.treasureImprints?.[key]??0),power);}
  function soulExponent(s,level=lv(s,'immortalPlatform')){return level?B.add(1,B.mul(completed(s,'martialSeverDao')?.04:.025,logOnePlus(complete(s,'heart')))):B.ONE;}
  function limitPositiveRate(s,value){if(!active(s)||challenge(s)!=='martialSeverDao')return value;const A=WIS.Core.Amount;if(A?.isAmount(value))return A.from(WIS.Core.AmountFormulas.powerOnePlusMinusOne(value,.5));const v=B.BN(value),root=B.sqrt(B.add(1,v));return B.gt(v,1)&&B.eq(root,v)?B.sub(root,1):B.div(v,B.add(1,root));}
  const capturePassive=s=>WIS.Cultivation.MartialAmount.capturePassive(s);
  const passiveGains=(profile,seconds,options)=>WIS.Cultivation.MartialAmount.passiveGains(profile,seconds,options);
  function awardPassive(s,gains) {
    WIS.Core.Runtime.assertMutable();if(!gains)return false;const n=normalize(get(s));let changed=false;
    for(const key of resourceKeys){const value=gains[key];if(value!=null&&(WIS.Core.Amount?.enabled()?WIS.Core.Amount.compare(value,0)>0:B.gt(value,0))){grant(n,key,value);changed=true;}}
    if(changed)commit(s,n);return changed;
  }
  function commit(s,n,core=null) {
    const validated = normalize(n),rewardMeta=prepareGainRewards(s,n);
    s.cultivation = {...s.cultivation,systems:{...s.cultivation?.systems,martial:validated}};
    if(rewardMeta)s.meta=rewardMeta;
    if (core) {
      if (s.core?.resources) s.core = {...s.core,resources:{...s.core.resources,...core}};
      else for (const [key,value] of Object.entries(core)) s[key] = value;
    }
    clearGainReceipts(n);
    WIS.Core.Effects?.invalidate?.();
  }
  function grant(n,key,gain) {
    const e = n.resources[key]; gain = WIS.Core.Amount?.enabled()?WIS.Core.Amount.from(gain):nonnegative(gain);
    if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount,value=A.add(A.field(e),gain);Object.assign(e,A.boundedFieldParts(value),A.boundedFieldParts(A.add(A.field(e,'total'),gain),'total'));if(A.compare(value,A.field(e,'peak'))>0)Object.assign(e,A.boundedFieldParts(value,'peak'));}
    else {e.amount = B.add(e.amount,gain); e.total = B.add(e.total,gain); e.peak = B.max(e.peak,e.amount);}
    rememberGain(n,key,gain);
    if (key === "heart") {
      if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount,v=B.eq(n.heartLedgerExponent,1)?A.field(e):A.from(WIS.Core.AmountFormulas.power(A.field(e),B.div(1,n.heartLedgerExponent)));Object.assign(n,A.fieldParts(WIS.Cultivation.MartialAmount.potential(v),'heartPotential'));}
      else n.heartPotential = F(B.pow(e.amount,B.div(1,n.heartLedgerExponent)));
    }
  }
  function debit(n,key,cost) {
    const e = n.resources[key]; cost = WIS.Core.Amount?.enabled()?WIS.Core.Amount.from(cost):nonnegative(cost);
    if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount;if(A.compare(A.field(e),cost)<0)throw Error('武道候选余额不足');Object.assign(e,A.boundedFieldParts(A.subtract(A.field(e),cost)),A.fieldParts(A.add(A.field(e,'spent'),cost),'spent'));}
    else {if (B.lt(e.amount,cost)) throw Error("武道候选余额不足");e.amount = B.sub(e.amount,cost); e.spent = B.add(e.spent,cost);}
    if (key === "heart") {
      if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount,v=B.eq(n.heartLedgerExponent,1)?A.field(e):A.from(WIS.Core.AmountFormulas.power(A.field(e),B.div(1,n.heartLedgerExponent)));Object.assign(n,A.fieldParts(WIS.Cultivation.MartialAmount.potential(v),'heartPotential'));}
      else n.heartPotential = F(B.pow(e.amount,B.div(1,n.heartLedgerExponent)));
    }
  }
  const harmony = s => ["martialIntentQi","martialHeartIntent","martialQiPower"].every(k => completed(s,k)) || achievement(s,"martialHarmony");
  function conversionExponent(s) {
    if (!completed(s,"martialStealHeaven")) return B.ONE;
    const h = logOnePlus(complete(s,'heart'));
    return B.add(1,B.mul(.15,B.div(h,B.add(h,10))));
  }
  // Shared by production formulas and read-only ability cards.
  function abilityMultiplier(s,key,level=lv(s,key)) {
    if(!level)return B.ONE;
    switch(key){
      case 'dragonTransform': return B.pow(B.BN(5**level),completed(s,'martialDragon')?B.add(1,B.mul(.03,logOnePlus(complete(s,'body')))):1);
      case 'immortalPlatform': return soulExponent(s,level);
      case 'lifeCore': case 'otherShore': return B.pow(B.add(1,logOnePlus(complete(s,'body'))),2);
      case 'daoPalace': return B.add(1,B.mul(.5,B.pow(logOnePlus(complete(s,'qi')),2)));
      case 'fourPoles': {const h=logOnePlus(complete(s,'body'));return B.add(1,B.mul(.08,B.div(h,B.add(10,h))));}
      case 'divineKingdom': {const sum=resourceKeys.reduce((v,k)=>B.add(v,logOnePlus(complete(s,k))),B.ZERO);return B.add(1,B.mul(.01,logOnePlus(sum)));}
      case "mingJin": return B.add(1,B.mul(.02,logOnePlus(completeCore(s,"joules"))));
      case "yiJin": return B.BN(1.2);
      case "anJin": case "taiJi": return B.BN(1.3);
      case "yiGu": return B.add(1,B.mul(.04,logOnePlus(completeCore(s,"power"))));
      case "huaJin": return B.add(1,B.mul(.05,logOnePlus(complete(s,"qi"))));
      case "geneEnergy": return B.mul(B.BN(2 ** level),lawMultiplier(s)); // Bounded integer level 0–9, exact powers of two.
      case "crystalMeditation": return B.BN(5);
      case "tianMo": case "ciHang": return B.BN(10);
      case "kuHai": case "mingQuan": case "shenQiao": return B.add(1,B.pow(logOnePlus(complete(s,{kuHai:"qi",mingQuan:"body",shenQiao:"heart"}[key])),2));
      case "gangJin": return B.BN(10);
      case "danJin": return B.add(1,B.sqrt(s.runningLevel || 0));
      case "yiSui": return B.add(1,B.mul(.1,logOnePlus(complete(s,"body"))));
      case "ganDong": return B.BN(1.1);
      case "sanTi": return B.BN(1.2);
      case "baGua": case "taiXuan": case "duGu": case "yueNv": return B.BN(1.5);
      case "xingYi": case "duoMing": return B.pow(1.1,level);
      case "jiuYang": return B.pow(2,level);
      case "jiuYin": case "liuMai": return B.add(1,B.mul(logOnePlus(complete(s,"qi")),level*.1));
      case "beiMing": return B.add(1,B.div(logOnePlus(completeCore(s,"joules")),10));
      case "longXiang": return B.pow(1.2,level);
      case "jiaYi": return B.BN(4);
      case "xiangLong": return B.mul(B.pow(1.3,level),abilityMultiplier(s,"liuMai"));
      case "xiaoLi": return B.add(1,B.mul(.1,logOnePlus(complete(s,"heart"))));
      case "lingXi": return s.intuitionPurchased?B.add(1,B.mul(.1,logOnePlus(complete(s,"heart")))):B.ONE;
      case "shenDao": return B.BN(2);
      default: return B.ONE;
    }
  }
  function lawMultiplier(s) { return WIS.Core.Amount?.enabled()?WIS.Core.AmountFormulas.power(WIS.Meta.Treasures.affineQuantity(s,'lawImprint',1,1),.5):B.sqrt(B.add(1,WIS.Meta.Treasures.count(s,'lawImprint'))); }
  function acquisitionMultiplier(s,key) {
    return ["qi","body"].includes(key) ? B.mul(B.mul(abilityMultiplier(s,"danJin"),abilityMultiplier(s,"geneEnergy")),imprintMultiplier(s,key==="body"?"sacredBodyImprint":"godBodyImprint",.25)) : B.mul(abilityMultiplier(s,"crystalMeditation"),key==='heart'&&completed(s,'martialAutumn')?50:1);
  }
  // Only mutate the caller's private candidate, after all payment terms.
  // The same incoming-stock integral used by Changsheng handles a zero heart.
  function applyHeartSpendRewards(s,n,spent) {
    if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount,rewards=WIS.Cultivation.MartialAmount.heartRewards(s,n,spent);for(const key of ['qi','body'])if(A.compare(rewards[key],0)>0)grant(n,key,rewards[key]);return Object.fromEntries(Object.entries(rewards).map(([k,v])=>[k,A.project(v)]));}
    const rewards={qi:B.ZERO,body:B.ZERO};
    if (!active(s) || !B.gt(spent || 0,0)) return rewards;
    const candidate={...s,cultivation:{...s.cultivation,systems:{...s.cultivation.systems,martial:n}}};
    for (const [key,ability] of [["qi","tianMo"],["body","ciHang"]]) if (lv(candidate,ability)) {
      const base=B.mul(B.mul(spent,10),acquisitionMultiplier(candidate,key));
      const gain=changShengGain({kinds:1,base,current:amount(candidate,key),thresholds:conversionThresholds(candidate,key)},1);
      grant(n,key,gain); rewards[key]=gain;
    }
    return rewards;
  }
  function efficiency(s,key) {
    let e = acquisitionMultiplier(s,key);
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
      const d = B.sub((WIS.Core.Amount?.enabled()?WIS.Core.AmountFormulas.logOnePlusRatio(completeCore(s,'joules'),10):B.log10(B.add(B.div(coreAmount(s,'joules'),10),1))),logOnePlus(completeCore(s,"power")));
      const lead = key === "qi" ? d : B.mul(d,-1);
      if (B.gt(lead,.5)) e = B.mul(e,B.max(.1,B.div(1,B.add(1,B.sub(lead,.5)))));
    }
    return e;
  }
  function preview(s,key) {
    if(WIS.Core.Amount?.enabled()||key==='soul'&&lv(s,'immortalPlatform')){
      const p={...WIS.Cultivation.MartialAmount.preview(s,key)},A=WIS.Core.Amount;
      if(p.allowed&&A.compare(p.costQuantities.heart??0,0)>0&&(lv(s,'tianMo')||lv(s,'ciHang'))){const n=normalize(get(s));for(const [k,cost]of Object.entries(p.costQuantities))if(resourceKeys.includes(k))debit(n,k,cost);grant(n,key,p.gainQuantity);p.heartRewards=applyHeartSpendRewards(s,n,p.costQuantities.heart);}return p;
    }
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
    const exponent = ["qi","body"].includes(key) ? conversionExponent(s) : key==='soul'?soulExponent(s):B.ONE;
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
    result.gain = balancedGain(s,key,current,result.investment,exponent,result.gain);
    if (!B.gt(B.add(current,result.gain),current)) result.gain = B.ZERO;
    result.allowed = B.gt(input,0) && B.gt(result.gain,0);
    result.reason = result.allowed ? "" : "投入不足或没有可表示的收益";
    result.heartRewards={qi:B.ZERO,body:B.ZERO};
    if (result.allowed && B.gt(costs.heart || 0,0) && (lv(s,"tianMo") || lv(s,"ciHang"))) {
      const candidate=normalize(n);
      for (const [k,cost] of Object.entries(costs)) if (resourceKeys.includes(k)) debit(candidate,k,cost);
      grant(candidate,key,result.gain);
      result.heartRewards=applyHeartSpendRewards(s,candidate,costs.heart);
    }
    return result;
  }
  function applyConversion(s,n,key,p){
    const A=WIS.Core.Amount,core={};
    for(const [k,cost]of Object.entries(p.costQuantities)){if(resourceKeys.includes(k))debit(n,k,cost);else Object.assign(core,WIS.Core.Resources.prepareTerms({},k,A.words(A.subtract(WIS.Core.Resources.readExact('core.'+k,s),cost))));}
    grant(n,key,p.gainQuantity);applyHeartSpendRewards(s,n,p.costQuantities.heart);
    if(key==='heart'){Object.assign(n,A.fieldParts(p.potentialQuantity,'heartPotential'),A.fieldParts(A.add(A.field(n,'heartInvestment'),p.investmentQuantity),'heartInvestment'));n.heartLedgerExponent=p.heartExponent;}
    return Object.keys(core).length?core:null;
  }
  function convert(s,key) {
    WIS.Core.Runtime?.assertMutable?.();
    const p = preview(s,key); if (!p.allowed) return false;
    if(WIS.Core.Amount?.enabled()){const n=normalize(get(s)),core=applyConversion(s,n,key,p);commit(s,n,core);return true;}
    const n = normalize(get(s)), core = {};
    for (const [k,cost] of Object.entries(p.costs)) {
      if (resourceKeys.includes(k)) debit(n,k,cost);
      else { core[k] = B.sub(coreAmount(s,k),cost); core[k+"GainResidual"] = B.ZERO; core[k+"GainResidualTail"] = []; }
    }
    grant(n,key,p.gain);
    applyHeartSpendRewards(s,n,p.costs.heart);
    if (key === "heart") { n.heartPotential = p.potential; n.heartInvestment = B.add(n.heartInvestment,p.investment); n.heartLedgerExponent = p.heartExponent; }
    commit(s,n,Object.keys(core).length ? core : null); return true;
  }
  function slots(s) { return challenge(s) === "martialMeridians" ? 1 : 1 + (lv(s,"reverseArt") ? 1 : 0) + (completed(s,"martialMeridians") ? 2 : 0); }
  const slotUsed = s => C.abilities.filter(a => a.slot && lv(s,a.key)).length;
  function abilityView(s,key) {
    const a = byKey.get(key), level = a ? get(s).abilities[key] || 0 : 0;
    if (!a) return {key,level:0,maxLevel:0,cost:B.ZERO,requirements:{qi:B.ZERO,body:B.ZERO,heart:B.ZERO},allowed:false,reason:"未知能力",effectText:""};
    const next = level+1, requirements = {qi:B.ZERO,body:B.ZERO,heart:B.ZERO};
    if (key !== "geneEnergy" || level === 0) for (const [k,v] of Object.entries(a.requirements)) requirements[k] = B.BN(v);
    if (key === 'mindPlanet') requirements.heart=B.BN([500,1000,2500][Math.min(level,2)]);
    if(key==='dragonTransform')requirements.body=B.BN(2e6*2**level);
    if (key === "xingYi") requirements.heart = B.mul(15,B.pow(1.25,level));
    if (["qianKun","liuMai"].includes(key)) requirements.qi = B.mul(20,B.pow(2,level));
    let cost = Array.isArray(a.price) ? B.BN(a.price[Math.min(level,a.price.length-1)]) : B.BN(a.price);
    if(key==='dragonTransform')cost=B.BN(2e5*2**level);
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
    if (a.branch === "inner" && lv(s,"changSheng")) cost = B.mul(cost,10*(innerCount(s)+1));
    let reason = !active(s) ? "当前未选择武道" : level >= a.maxLevel ? "已达上限" : key === "longXiang" && level ? "龙象通过修炼进度升级" : "";
    if(!reason&&!abilityEnabled(s,key))reason='化龙挑战仅允许秘境流能力';
    if(!reason&&key==='immortalPlatform'&&lv(s,'dragonTransform')<9)reason='需化龙九变9级';
    if(!reason&&key==='shenJin'&&!harmony(s))reason='需内三合成就';
    if(!reason&&key==='lifeCore'&&lv(s,'geneEnergy')<3)reason='需基因源能3级';
    if(!reason&&key==='innerWorld'&&lv(s,'mindPlanet')<3)reason='需识海星球3级';
    if (!reason && a.prerequisites.some(k => !lv(s,k))) reason = "前置能力未解锁";
    if (!reason && a.slot && !level && slotUsed(s) >= slots(s)) reason = "内功槽位已满";
    if (!reason && Object.entries(requirements).some(([k,v]) => WIS.Core.Amount?.enabled()?WIS.Core.Amount.compare(quantity(s,k),v)<0:B.lt(amount(s,k),v))) reason = "当前资源未达到要求";
    const costResource = level > 0 ? a.upgradeResource : "soul";
    if (!reason && (WIS.Core.Amount?.enabled()?WIS.Core.Amount.compare(quantity(s,costResource),cost)<0:B.lt(amount(s,costResource),cost))) reason = ({soul:"神魂",body:"体",qi:"气"}[costResource]) + "不足";
    return {...a,level,maxLevel:a.maxLevel,cost,costResource,requirements,allowed:!reason,reason,effectText:a.description};
  }
  const canBuy = (s,key) => abilityView(s,key).allowed;
  function buy(s,key) {
    WIS.Core.Runtime?.assertMutable?.(); const view = abilityView(s,key); if (!view.allowed) return false;
    const n = normalize(get(s)); debit(n,view.costResource,view.cost); n.abilities[key] = view.level+1;
    if (key === "changSheng") {
      for (const a of C.abilities) if (a.branch === "inner") delete n.abilities[a.key];
      n.longxiangProgress = B.ZERO;if(WIS.Core.Amount?.enabled())n.longxiangProgressResidual=[];
    }
    commit(s,n);
    if (["stealHeaven","innerHarmony","innate"].includes(key)) s.meta = {...s.meta,martialQualifications:{...s.meta?.martialQualifications,[key]:true}};
    return true;
  }
  const curve = (value,coefficient,exponent=1.25) => WIS.Core.Amount?.isAmount(value)?B.mul(coefficient,B.div(WIS.Core.AmountFormulas.powerOnePlusMinusOne(value,exponent),B.sub(B.pow(2,exponent),1))):B.mul(coefficient,B.div(B.sub(B.pow(B.add(value,1),exponent),1),B.sub(B.pow(2,exponent),1)));
  function qiPowerSource(s,level=lv(s,"qianKun")) {
    return level ? B.mul(B.mul(curve(complete(s,"qi"),2),level),abilityMultiplier(s,"liuMai")) : B.ZERO;
  }
  function sources(s) {
    if (!active(s)) return {joules:B.ZERO,power:B.ZERO,qiPower:B.ZERO};
    let q = curve(complete(s,"qi"),20), body = curve(complete(s,"body"),2,lv(s,"shenJin")?1.5:1.25);
    if (lv(s,"mingJin")) body = B.mul(body,abilityMultiplier(s,"mingJin"));
    if (lv(s,"anJin")) body = B.mul(body,abilityMultiplier(s,"anJin"));
    if (lv(s,"huaJin")) body = B.mul(body,abilityMultiplier(s,"huaJin"));
    body=B.mul(body,abilityMultiplier(s,'lifeCore'));
    q = B.mul(q,abilityMultiplier(s,"jiuYang"));
    q = B.mul(q,abilityMultiplier(s,"longXiang"));
    const qiPower = qiPowerSource(s);
    if (lv(s,"jiaYi")) {q = B.mul(q,.5); body = B.mul(body,.5);}
    if (challenge(s) === "martialIntentQi") q = B.ZERO;
    else if (completed(s,"martialIntentQi")) q = B.mul(q,3);
    return {joules:B.mul(q,imprintMultiplier(s,'sourceStoneImprint',.4)),power:B.mul(body,imprintMultiplier(s,'emperorImprint',.4)),qiPower:B.mul(qiPower,imprintMultiplier(s,'emperorImprint',.4))};
  }
  function effects(s) {
    if (!active(s)) return [];
    const result = [], effect = (id,target,value,layer="regionMultiplier",dependencies=[]) => ({id:"martial-"+id+"-"+target,name:byKey.get(id)?.name || "武道",group:"武道",target,layer,value:typeof value === "function" ? value(s) : value,valueAt:typeof value === "function" ? value : null,dynamicResources:dependencies});
    if(lv(s,'dragonTransform'))result.push(effect('dragonTransform','rock',current=>abilityMultiplier(current,'dragonTransform'),'sourceMultiplier',['martialBody']));
    if(lv(s,'divineKingdom'))for(const target of ['joules','power'])result.push(effect('divineKingdom',target,current=>abilityMultiplier(current,'divineKingdom'),'regionExponent',['martialQi','martialBody','martialHeart','martialSoul']));
    if(lv(s,'daoPalace'))for(const [owned,target]of [['killingIntentSubstancePurchased','killingIntent'],['energyCyclePurchased','ghostBrain']])if(s[owned])result.push(effect('daoPalace',target,current=>abilityMultiplier(current,'daoPalace'),'sourceMultiplier',['martialQi']));
    if(lv(s,'fourPoles'))for(const [owned,target]of [['elementalizationPurchased','elementalization'],['ultimateIntentPurchased','ultimateIntent']])if(s[owned])result.push(effect('fourPoles',target,current=>abilityMultiplier(current,'fourPoles'),'sourceExponent',['martialBody']));
    if (lv(s,"gangJin")) result.push(effect("gangJin","power",abilityMultiplier(s,"gangJin")));
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
  function computeHeartRequirement(stage) {
    const name = typeof stage === "string" ? stage : stage?.name || "";
    for (const [label,value] of Object.entries(C.heartThresholds)) if (name.includes(label)) return B.BN(value);
    let threshold = typeof stage === "number" || B.isDecimal(stage) ? stage : stage?.power ?? stage?.threshold ?? stage?.requirement ?? stage?.start ?? stage?.startPower;
    if (threshold == null && WIS.Core.Config?.softcaps) threshold = WIS.Core.Config.softcaps.find(x => x.name === name)?.power;
    return threshold == null ? B.BN(1000) : B.mul(1000,B.pow(B.div(nonnegative(threshold),"3.033e15"),.25));
  }
  // Only immutable configuration inputs are shared across states. Custom
  // stages and the coordinate arithmetic backend retain their original path.
  const configuredHeartRequirements = new Map((WIS.Core.Config?.softcaps || []).map(stage =>
    [stage,Object.freeze(computeHeartRequirement(stage))]));
  function heartRequirement(stage) {
    const constant = !B.coordinateArithmetic.active() && configuredHeartRequirements.get(stage);
    return constant ? new B.Decimal(constant) : computeHeartRequirement(stage);
  }
  function heartWeight(s,stage) {
    const calculate = () => { const req = heartRequirement(stage);
      const heart = complete(s,"heart");
      if(WIS.Core.Amount?.enabled())return B.eq(req,0)||WIS.Core.Amount.compare(heart,req)>=0?B.ONE:B.mul(C.balance.heartReliefCap,WIS.Core.AmountFormulas.powerRatio(heart,req,C.balance.heartReliefPower));
      return B.eq(req,0) || B.gte(heart,req) ? B.ONE : B.mul(C.balance.heartReliefCap,B.pow(B.div(heart,req),C.balance.heartReliefPower)); };
    const memo = configuredHeartRequirements.has(stage) && WIS.Core.Effects?.scopeMemo(s);
    if (!memo) return calculate();
    // Weight depends on this frozen candidate's heart amount, not on the
    // resource being softened or its base exponent. Never retain it past scope.
    const key = B.coordinateArithmetic.active() ? "martial.heartWeights.coordinate" : "martial.heartWeights";
    if (!memo.has(key)) memo.set(key,new Map());
    const weights = memo.get(key);
    if (!weights.has(stage)) weights.set(stage,calculate());
    return weights.get(stage);
  }
  function heartExponent(s,stage,exponent) {
    const e = nonnegative(exponent,1);
    if (!active(s) || ["martialStealHeaven","martialAutumn"].includes(challenge(s))) return e;
    const w = heartWeight(s,stage);
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
    const n = normalize(get(s)),A=WIS.Core.Amount;
    if(A?.enabled()){let clock=A.add(A.field(n,'automationTime'),dt);if(A.compare(clock,.1)>0)clock=A.from(.1);Object.assign(n,A.fieldParts(clock,'automationTime'));
      let level=lv(s,'longXiang');
      if(level&&level<13){const factor=B.add(1,WIS.Core.AmountFormulas.logOnePlusRatio(A.field(n.resources.body))),gain=A.multiply(dt,factor);let progress=A.add(A.field(n,'longxiangProgress'),gain);
        while(level<13){const need=B.mul(60,B.pow(1.4,level-1));if(A.compare(progress,need)<0)break;progress=A.subtract(progress,need);n.abilities.longXiang=++level;}Object.assign(n,A.fieldParts(progress,'longxiangProgress'));}
      commit(s,n);return true;
    }
    n.automationTime = B.min(.1,B.add(n.automationTime,dt));
    let l = lv(s,'longXiang');
    if (l && l < 13) {
      n.longxiangProgress = B.add(n.longxiangProgress,B.mul(dt,B.add(1,B.log10(B.add(n.resources.body.amount,1)))));
      while (l < 13) { const need = B.mul(60,B.pow(1.4,l-1)); if (B.lt(n.longxiangProgress,need)) break; n.longxiangProgress = B.sub(n.longxiangProgress,need); n.abilities.longXiang = ++l; }
    }
    commit(s,n); return true;
  }
  function automate(s) {
    WIS.Core.Runtime?.assertMutable?.(); if (!active(s) || (WIS.Core.Amount?.enabled()?WIS.Core.Amount.compare(WIS.Core.Amount.field(get(s),'automationTime'),.1)<0:B.lt(get(s).automationTime,.1))) return false;
    const start = get(s).automationCursor;
    // Consume one real cadence opportunity, even when no conversion is ready.
    const n = normalize(get(s)); n.automationTime = B.ZERO;if(WIS.Core.Amount?.enabled())n.automationTimeResidual=[]; n.automationCursor = (start+1)%4;
    for (let i=0;i<4;i++) { const key = resourceKeys[(start+i)%4]; if (n.automation[key] && automaticUnlocked(s,key) && preview(s,key).allowed) {
      const p = preview(s,key);if(WIS.Core.Amount?.enabled()){const core=applyConversion(s,n,key,p);n.automationCursor=((start+i)%4+1)%4;commit(s,n,core);return true;}
      const core = {};
      for (const [k,cost] of Object.entries(p.costs)) if (resourceKeys.includes(k)) debit(n,k,cost); else {core[k] = B.sub(coreAmount(s,k),cost); core[k+"GainResidual"] = B.ZERO; core[k+"GainResidualTail"] = [];}
      grant(n,key,p.gain); applyHeartSpendRewards(s,n,p.costs.heart); if (key === "heart") {n.heartPotential=p.potential;n.heartInvestment=B.add(n.heartInvestment,p.investment);n.heartLedgerExponent=p.heartExponent;}
      n.automationCursor=((start+i)%4+1)%4; commit(s,n,Object.keys(core).length?core:null); return true;
    }}
    commit(s,n); return false;
  }
  WIS.Cultivation.Martial = Object.freeze({abilityEnabled,level:lv,soulExponent,limitPositiveRate,imprintMultiplier,hasCoreGainRewards,prepareCoreGainRewards,clearGainReceipts,attenuationFactor,prepareGainRewards,capturePassive,passiveGains,awardPassive,lawMultiplier,quantity,harmony,acquisitionMultiplier,applyHeartSpendRewards,innerCount,captureChangSheng,changShengGain,awardChangSheng,resourceKeys,fresh,normalize,get,amount,active,F,abilityMultiplier,qiPowerSource,preview,convert,abilityView,canBuy,buy,slots,slotUsed,sources,effects,heartRequirement,heartExponent,advance,automate,automaticUnlocked,setAutomation,conversionExponent,efficiency});
}(window.WIS));
