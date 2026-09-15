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
      return compatibleCount(state.meta.treasureStockResidual?.[key]?.length ? L.value(L.stock(state,key)) : state.meta.treasures[key] || ZERO);
    },
    balance(state,key) { return L.stock(state,key); },
    lastFailure() { return lastFailure; },
    add(state, key, amount = 1, { applyAwardMultiplier = true } = {}) {
      WIS.Core.Runtime.assertMutable();
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
      WIS.Core.Runtime.assertMutable();
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
  const rules = WIS.Meta.TreasureRules;
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
  const ensured = new WeakSet();
  function ensure(state) {
    const meta = state.meta;
    if(ensured.has(meta))return;
    meta.treasureProgress ||= {};
    meta.treasureProgressResidual ||= {};
    rememberQualifications(state);
    // Merge legacy progress/credit once. pendingInputs keep their original
    // gain, award, order and units and are processed by the existing dispatcher.
    if (!meta.treasureProgressFinite) meta.treasureProgressFinite={};
    for(const key of T.keys) if(!meta.treasureProgressFinite[key]) {
      const old=meta.treasureCredits?.[key];
      const words=old?[L.Credit.value(L.Credit.actual(old))]:L.progress(state,key);
      L.write(state,key,words);
    }
    for(const key of T.keys)if(meta.treasureStockResidual?.[key]?.length)L.write(state,key,L.stock(state,key),true);
    ensured.add(meta);
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
  // Pending blocks preserve consecutive, identical fixed-start contexts. Text
  // identity is deliberate: Decimal projection is not context equivalence.
  const pendingKnown=new WeakSet();
  const pendingContext=e=>JSON.stringify(Object.keys(e).filter(k=>!['units','unitsLedger','unitChunks','_endBlock'].includes(k)).sort().map(k=>[k,e[k]]));
  const pendingPage=words=>'@sum:'+words.map(w=>String(w).length+':'+w).join('');
  function* compactPendingSteps(entries,currentAward){
    if(pendingKnown.has(entries))return entries;
    const result=[];let context=null,template=null,words=[],pages=[];
    function* flush(){
      if(!template)return;
      if(words.length)pages.push(L.normalize(words));
      // A context block retains the old exact-capacity execution boundaries.
      // Combining these high inverses would change rounding/award history.
      if(pages.length<=1)result.push({...template,units:pages[0]||[]});
      else{const units=[];for(const chunk of pages){
        const children=[];for(let i=0;i<chunk.length;i+=64)children.push(pendingPage(chunk.slice(i,i+64)));
        units.push(children.length===1?children[0]:pendingPage(children));yield {phase:'compact'};
      }result.push({...template,units,unitChunks:true});}
      words=[];pages=[];
    }
    for(const entry of entries){
      const row={...entry,gain:String(entry.gain),award:String(entry.award??currentAward)};
      delete row.unitsLedger;delete row.units;delete row.unitChunks;
      const id=pendingContext(row);
      if(id!==context){yield* flush();template=row;context=id;}
      const g=L.project(row.gain),a=L.project(row.award);
      if(!g.gte(0)||!a.gt(0)||!a.floor().eq(a)||L.sign(entry.units??entry.unitsLedger)<0)
        throw new L.LedgerError('宝物来源上下文无效');
      if(entry.unitChunks){
        if(words.length){pages.push(L.normalize(words));words=[];}
        for(const chunk of entry.units){pages.push([...WIS.Core.SignedLedger.expand([chunk])]);yield {phase:'compact'};}
      }else for(const word of entry.units??entry.unitsLedger){words.push(String(word));
        if(words.length===L.MAX_TERMS){words=L.normalize(words);if(words.length===L.MAX_TERMS){pages.push(words);words=[];}}}
      yield {phase:'compact',input:true};
    }
    yield* flush();pendingKnown.add(result);return result;
  }
  function compactPending(entries,award){const it=compactPendingSteps(entries,award);let item;do{item=it.next();}while(!item.done);return item.value;}
  function appendPending(entries,units,gain,award){
    const result=entries.slice(),row={units:[String(units)],gain:String(gain),award:String(award)},last=result.at(-1);
    if(last&&pendingContext(last)===pendingContext(row)){
      if(last.unitChunks){const parts=last.units.slice(),tail=[...WIS.Core.SignedLedger.expand([parts.at(-1)])];
        let merged;try{merged=L.add(tail,row.units);}catch(error){if(!(error instanceof L.LedgerError))throw error;}
        if(merged&&merged.length<=64)parts[parts.length-1]=pendingPage(merged);else parts.push(pendingPage(row.units));
        result[result.length-1]={...last,units:parts};
      }else result[result.length-1]={...last,units:WIS.Core.SignedLedger.add(last.units,row.units)};
    }
    else result.push(row);
    if(pendingKnown.has(entries)||!entries.length)pendingKnown.add(result);return result;
  }
  function* pendingInputs(entries){for(const entry of entries){
    if(!entry.unitChunks){yield {...entry,_endBlock:true};continue;}
    for(let i=0;i<entry.units.length;i++){const row={...entry,units:[...WIS.Core.SignedLedger.expand([entry.units[i]])],_endBlock:i===entry.units.length-1};delete row.unitChunks;yield row;}
  }}
  const Pending=Object.freeze({inputs:pendingInputs,compactSteps:compactPendingSteps,compact:compactPending,append:appendPending});
  function ledgerSummary(words){let hash=2166136261,size=0;for(const word of words||[]){const text=String(word);size+=text.length;
    for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);}
    return {termCount:words?.length||0,characters:size,hash:(hash>>>0).toString(16)};}
  function receipt(row){const out={...row};for(const key of ['closedLedger','progressBefore','progressAfter','progress','stock'])
    if(Array.isArray(out[key]))out[key]=ledgerSummary(out[key]);return out;}
  const evaluatedEvents=Object.create(null);
  function diagnosticBefore(state,key,units,gain,meta=state.meta) {
    const original={meta};
    return {key,logicalTime:state.totalElapsedSeconds,input:String(units),gain:String(gain),
      before:String(T.count(original,key)),demand:String(requirement(key,held(original,key))),
      progressBefore:ledgerSummary(L.progress(original,key)),pendingBefore:(meta.treasureProgressPending?.[key]||[]).length};
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
        progressAfter:ledgerSummary(L.progress(state,key)),pendingAfter:(state.meta.treasureProgressPending?.[key]||[]).length,
        reason:status?.code||null};
      // Copy-on-write: the outer frame/checkpoint owns commit identity. Trial
      // restoration discards both counts and receipts, including accepted
      // endpoints later replaced by independent validation.
      state.meta.treasureDiagnostics={version:1,sequence,counts,recent:[...prior.recent.slice(-31),row]};
    }
    return reward;
  }
  function applyInput(state, key, units, gain, fixedAward) {
    ensure(state);
    const point=state.meta.treasureProgressFinite[key];
    if(point && !(state.meta.treasureProgressPending?.[key]?.length) && BN(units).gte(0) && BN(gain).gte(0)) {
      const totalGain=B.mul(units,B.min(gain,point.requirement));
      const next=WIS.Core.FiniteProgress.bulk(point,totalGain);
      if(!next.crossed) {
        state.meta.treasureProgressFinite[key]=next.point;
        // Legacy projection is read-only compatibility; no historical ledger.
        state.meta.treasureProgress[key]=WIS.Core.FiniteProgress.value(next.point);
        return ZERO;
      }
    }
    const award=BN(fixedAward ?? T.getTreasureAwardMultiplier(state,key));
    const ordinary=()=>applyOrdinary(state,key,units,gain,award);
    // Keep the existing high-geometric-batch dispatcher and formulas. Both
    // branches finish through Ledger.write's fixed-size progress representation.
    return WIS.Simulation?.FastForward?.applyTreasure(state,key,units,gain,ordinary,award) ?? ordinary();
  }

  function applyOrdinary(state, key, units, gain, fixedAward) {
    return L.transaction(state,()=>{
      const S=WIS.Core.SignedLedger;
      const currentAward=BN(fixedAward ?? T.getTreasureAwardMultiplier(state,key));
      let award=currentAward;
      let stock=L.stock(state,key), p=L.progress(state,key), rewards=[], n=L.value(stock).floor();
      let precision=state.meta.treasureProgressStatus?.[key]?.state==="limited"
        ? state.meta.treasureProgressStatus[key] : null;
      // Pending source units retain their original unit gain. In particular a
      // cap transition cannot be replaced with "units * today's multiplier".
      const oldPending=state.meta.treasureProgressPending?.[key]||[];
      const u=nonnegative(units),g=BN(gain);
      const pending=u.gt(0)&&g.gt(0)?Pending.append(oldPending,u,g,currentAward):oldPending.slice();
      const blocked=error=>{
        if(!(error instanceof L.LedgerError)) throw error;
        precision={state:"blocked",code:error.code||"ledger-resolution",message:error.message+"；未处理来源保留在存档中"};
      };
      const grant=m=>{
        const delta=L.scale([m],award);
        const nextStock=S.add(stock,delta),nextRewards=S.add(rewards,delta),nextN=L.value(nextStock).floor();
        stock=nextStock;rewards=nextRewards;n=nextN;
      };
      const settleProgress=()=>{
        const checkpoint={stock,p,rewards,n,precision};
        try {
          const m=affordableLedger(key,n,p,award);
          if(m.gt(0)) {
            const cost=cumulative(key,n,m,award);
            const rest=S.subtract(p,[cost]);
            // These are additive balances relative to the represented demand,
            // not an arbitrary-precision evaluation of the nonlinear formula.
            if(m.gt(32)) precision={state:"limited",code:"rounded-bulk",
              message:"批量需求按当前大数精度计算；余量显示不代表数学上的精确耗尽"};
            p=rest;grant(m);
          }
          return true;
        } catch(error) {
          ({stock,p,rewards,n,precision}=checkpoint);
          if(['batch-cost','batch-resolution'].includes(error.code)&&n.add(award).eq(n)){
            precision={...precision,state:'limited',code:'precision-limited',
              message:'相邻奖励边界小于当前层级精度；原进度完整保留，后续来源继续累计并重试批处理',
              tailBoundary:{stock:String(n),award:String(award),progress:ledgerSummary(p),code:error.code}};
            return true;
          }
          blocked(error);return false;
        }
      };
      // All reward branches debit the ledger; never merge then clear a residual.
      let resolved=settleProgress();
      while(pending.length) {
        const input=pending[0], gain=L.project(input.gain), demand=requirement(key,n);
        award=L.project(input.award??currentAward);
        if(gain.lt(demand)) {
          // Even if an inverse is unresolved, uncapped input is safe to bank.
          try {p=S.add(p,L.scale(input.units,gain));pending.shift();}
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
    const point=state.meta.treasureProgressFinite?.[key];
    return credit ? BigInt(credit.n)!==0n : point ? B.gt(WIS.Core.FiniteProgress.value(point),0) : L.sign(L.progress(state,key))>0;
  }
  function advanceFixed(state, key, units, input) {
    if (!input?.eligible) return ZERO;
    // The shared dispatcher must preserve the segment-start gain and award.
    const gain = BN(input.gain), award = BN(input.award);
    return applyInput(state,key,units,gain,award);
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
      L.write(state,key,L.add(L.progress(state,key),[gained]));
    }
  }
  function remainderCertainty(precision) {
    if (precision?.state === 'blocked') return 'blocked';
    const audit = precision?.approximation;
    // Receipts survive later exact postings. An empty pending queue cannot
    // resolve the unrepresented, nonnegative phase left by a closed batch.
    if (precision?.exactRemainder === false || audit?.exactRemainder === false ||
        audit?.last?.exactRemainder === false ||
        (audit?.unresolvedRemainderUpper != null && B.gt(BN(audit.unresolvedRemainderUpper), ZERO)) ||
        (audit?.last?.remainderUpper != null && audit.last.exactRemainder !== true && B.gt(BN(audit.last.remainderUpper), ZERO)))
      return 'known-lower-bound';
    return 'exact';
  }
  function view(state, key) {
    // Fresh/load and settlement own migration; the view reads legacy words too.
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
    let certainty=remainderCertainty(precision), remainingAvailable=false;
    const pending=state.meta.treasureProgressPending?.[key]||[];
    let remainingSign=0,remainingValue=ZERO;
    if(precision?.state!=="blocked") {
      try {
        const credit=state.meta.treasureCredits?.[key];
        if(credit) {
          const C=L.Credit,remaining=C.minus(C.fromDecimal(demand),C.actual(credit));
          remainingSign=remaining.n>0n?1:remaining.n<0n?-1:0;remainingValue=C.value(remaining);
        } else {const remaining=L.subtract([demand],L.progress(state,key));
          remainingSign=L.sign(remaining);remainingValue=L.value(remaining);}
        remainingAvailable=B.isFiniteBN(demand)&&B.gt(demand,ZERO)&&B.isFiniteBN(remainingValue);}
      catch(error) {if(!(error instanceof L.LedgerError)) throw error;
        if(certainty==='exact') {
          precision={...precision,state:"blocked",code:"remaining-resolution",message:"剩余需求暂无法可靠分辨；保留原账本，未据此清零"};
          certainty='blocked';
        }}
    }
    let displayRemainingSeconds=certainty==='blocked'||!remainingAvailable||!B.isFiniteBN(rate)||!rate.gt(0) ? null
      : remainingSign<=0 ? ZERO : remainingValue.div(rate);
    if(displayRemainingSeconds!==null&&!B.isFiniteBN(displayRemainingSeconds))displayRemainingSeconds=null;
    const remainingSeconds=certainty==='exact'?displayRemainingSeconds:null;
    return { progress, demand, rate, sources, precision, pendingInputs:pending.length,
      remainingPositive:remainingSign>0, award: T.getTreasureAwardMultiplier(state, key),
      remainderCertainty:certainty, remainingSeconds, displayRemainingSeconds,
      displayEtaMode:displayRemainingSeconds===null?'unavailable':certainty==='exact'?'exact':'conservative',
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
      if(remainderCertainty(state.meta.treasureProgressStatus?.[key])!=='exact')
        return {key,pausedReason:'uncertain-or-blocked-remainder',remainingSeconds:null};
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
  function needsRecovery(state){
    for(const list of Object.values(state.meta.treasureProgressPending||{})){
      if(list.length>=32)return true;
      for(const entry of list)if(entry.unitChunks||(entry.units||[]).length>=64||
        (entry.units||[]).some(w=>String(w).length>8192))return true;
    }
    for(const [key,list] of Object.entries(state.meta.treasureProgressPending||{}))
      if(list.length&&state.meta.treasureProgressStatus?.[key]?.state==='blocked')return true;
    return false;
  }
  function createRecovery(state){
    const originalMeta=state.meta,work=WIS.Core.State.shallowBranch(state);
    // Only treasure maps are writable. All nested entries remain immutable;
    // one final root swap commits the complete job, or discards it on failure.
    L.transaction(work,()=>{});
    const keys=Object.keys(originalMeta.treasureProgressPending||{}).filter(k=>originalMeta.treasureProgressPending[k].length);
    const stats={active:true,phase:'compact',processed:0,total:keys.reduce((n,k)=>n+originalMeta.treasureProgressPending[k].length,0),
      blocks:0,remainingBlocks:0,slices:0,maxSliceMs:0,maxOperationMs:0,compressionMs:0,settlementMs:0,stocks:{}};
    let finished=false,cancelled=false;
    function* run(){
      const compactStarted=performance.now();
      for(const key of keys){
        const award=T.getTreasureAwardMultiplier(work,key),entries=work.meta.treasureProgressPending[key];
        const iterator=Pending.compactSteps(entries,award);let item;
        do{item=iterator.next();if(item.value?.input)stats.processed++;if(!item.done)yield item.value;}while(!item.done);
        work.meta.treasureProgressPending[key]=item.value;stats.blocks+=item.value.length;
      }
      stats.compressionMs=performance.now()-compactStarted;stats.remainingBlocks=stats.blocks;
      stats.phase='settle';yield;
      const settlementStarted=performance.now();
      for(const key of keys){
        stats.stocks[key]={before:String(T.count(work,key))};
        const award=L.project(work.meta.treasureProgressPending[key][0]?.award??T.getTreasureAwardMultiplier(work,key));
        const iterator=WIS.Simulation.FastForward.treasureRecoverySteps(work,key,award);let item;
        do{item=iterator.next();if(item.value?.block)stats.remainingBlocks--;if(!item.done)yield item.value;}while(!item.done);
        if(work.meta.treasureProgressPending[key]?.length)throw new L.LedgerError('宝物积压尚未安全结算；全部原始输入保留，可重试');
        stats.stocks[key].after=String(T.count(work,key));stats.stocks[key].code=work.meta.treasureProgressStatus[key]?.code;
        yield;
      }
      // Old diagnostic payloads cannot remain a hidden second large ledger.
      if(work.meta.treasureDiagnostics)work.meta.treasureDiagnostics={...work.meta.treasureDiagnostics,
        recent:(work.meta.treasureDiagnostics.recent||[]).slice(-32).map(receipt)};
      for(const [key,status] of Object.entries(work.meta.treasureProgressStatus||{})){
        if(!status)continue;const next={...status};
        if(next.tailBoundary)next.tailBoundary=receipt(next.tailBoundary);
        if(next.approximation?.last)next.approximation={...next.approximation,last:receipt(next.approximation.last)};
        work.meta.treasureProgressStatus[key]=next;yield;
      }
      stats.settlementMs=performance.now()-settlementStarted;
    }
    const iterator=run();
    return {status:()=>({...stats,stocks:undefined}),cancel(){cancelled=true;iterator.return();},
      advance(deadline){
        if(cancelled)throw new L.LedgerError('宝物整理已取消；原始输入保留');
        if(finished)return {done:true,stats};
        const start=performance.now();let item;
        const previousRates={...WIS.tmp.rates};
        try{WIS.Core.Runtime.withState(work,()=>WIS.Core.Effects.withIsolatedState(work,()=>{
          do{const op=performance.now();item=iterator.next();const ms=performance.now()-op;
            if(ms>stats.maxOperationMs){stats.maxOperationMs=ms;stats.slowestPhase=item.value?.phase||stats.phase;stats.slowestKey=item.value?.key||null;}
          }while(!item.done&&performance.now()<deadline);
        }));}finally{for(const key of Object.keys(WIS.tmp.rates))delete WIS.tmp.rates[key];Object.assign(WIS.tmp.rates,previousRates);}
        stats.slices++;stats.maxSliceMs=Math.max(stats.maxSliceMs,performance.now()-start);
        if(item.done){
          if(state.meta!==originalMeta)throw new L.LedgerError('宝物整理期间状态已变化；原始输入保留，请重试');
          state.meta=work.meta;WIS.Core.Effects.invalidate();finished=true;stats.active=false;stats.remainingBlocks=0;
        }
        return {done:finished,stats};
      }};
  }
  const Recovery=Object.freeze({needed:needsRecovery,create:createRecovery});
  WIS.Meta.TreasureProgress = Object.freeze({ rules, explorationKeys, requirement, cumulative, affordable, unitGain,
    Recovery, Pending, receipt, ledgerSummary, ensure, advance, advanceFixed, hasUnsettled, settle, qualification, rememberQualifications, importLegacyTransient, view, boundarySnapshot,
    diagnostics:state=>({evaluations:{...evaluatedEvents},committed:state.meta.treasureDiagnostics||null}) });
}(window.WIS));
