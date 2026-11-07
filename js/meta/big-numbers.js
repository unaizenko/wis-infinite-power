(function defineSymbolicBigNumbers(WIS) {
  "use strict";
  // Symbolic values are never expanded; coefficients and oversized rank indices use BigNum.
  const B = WIS.Core.BigNum, I=WIS.Meta.Infinity, IC=WIS.Meta.InfinityConfig;
  const maximumG = state => I.has(state,'D1-1') ? null : 64;
  const maximumTree = state => I.has(state,'D1-2') ? null : 3;
  const BASE_SUPER_SPEED = "0.008"; // percent per game second
  const MAX_TREE_RANK = 3;
  const TREE_WORK_BASE = "1e9", TREE_INDEX_BASE = "1e6";
  const TREE_UPGRADES = Object.freeze({
    node: Object.freeze({ name: "节点构造", description: "提升有限根树的构造效率。", cost: 10, growth: 3, effect: 2 }),
    branch: Object.freeze({ name: "分枝构造", description: "扩大不同树形结构的搜索范围。", cost: 100, growth: 6, effect: 1.5 }),
    label: Object.freeze({ name: "标签构造", description: "提高高阶坏序列中标记结构的搜索效率。", cost: 300, growth: 8, effect: 1.6 }),
    amplify: Object.freeze({ name: "超构造增幅", description: "树构造强化4：提升超构造倍率，费用倍率逐级增加。", cost: 1000, growth: 10, growthStep: 1.1, effect: 1.2, unlock: "D11-2" })
  });

  // Preserve legacy Number arithmetic below the old boundary. Oversized exact
  // integers use strings (as high-multiverse orders do); extreme e/ee ranks use
  // the same Decimal backend as resource coefficients, never a JS Number cap.
  const SAFE_RANK = Number.MAX_SAFE_INTEGER;
  function exactRank(v) {
    if(typeof v==='number'&&Number.isSafeInteger(v))return BigInt(v);
    const text=String(v??0);
    if(/^-?\d+$/.test(text)&&text.length<=4096)return BigInt(text);
    const m=/^(-?)(\d+)(?:\.(\d+))?e\+?(\d+)$/.exec(text);
    if(m&&Number(m[4])<=4090){const shift=Number(m[4])-(m[3]?.length||0);if(shift>=0)return BigInt(m[1]+m[2]+(m[3]||'')+'0'.repeat(shift));}
    return null;
  }
  function packRank(n){if(n>=0n&&n<=BigInt(SAFE_RANK))return Number(n);const text=n.toString();return text.length<=300?text:text[0]+'.'+text.slice(1)+'e'+(text.length-1);}
  let legacyRankDepth=0;
  const rankSchema = () => WIS.Core.Config.saveVersion >= 74 && legacyRankDepth===0;
  function withLegacyRanks(work){legacyRankDepth++;try{return work();}finally{legacyRankDepth--;}}
  function legacyRankValue(value=0){
    const exact=exactRank(value);if(exact!==null){if(exact<0n)throw Error('大数阶位无效');return packRank(exact);}
    const n=B.parseFinite(value);if(!n||B.lt(n,0)||!B.eq(n,n.floor()))throw Error('大数阶位无效');return n;
  }
  function legacyRankInput(value=0){
    const previous=legacyRankValue(value);
    // Preserve the old exact integer path without expanding its scientific
    // output past the new raw-word quota. Otherwise retain only its Decimal
    // projection: legacy text is not permission to recover discarded digits.
    return exactRank(value)!==null?String(value??0):String(previous);
  }
  function legacyRankProjection(value){
    // Keep the old Number/string fast path and its exact operation order.
    try{return legacyRankValue(value);}catch(error){
      // Rank's lossless sparse exponent spelling can exceed Decimal's native
      // string parser. This explicit projection is only for old rule readers.
      if(WIS.Core.Config.saveVersion>=74&&typeof value==='string'&&!B.parseFinite(value))return WIS.Core.Rank.project(value);
      throw error;
    }
  }
  function legacyTargetRank(value){
    const prior=legacyRankProjection(value);
    return withLegacyRanks(()=>B.lt(prior,3)?3:rankAdd(prior,1));
  }
  const rankValue=(value=0)=>rankSchema()?WIS.Core.Rank.read(value):legacyRankValue(value);
  function rankAdd(a,b){if(rankSchema())return WIS.Core.Rank.add(a,b);const x=exactRank(a),y=exactRank(b);return x!==null&&y!==null?packRank(x+y):rankValue(B.add(a,b).floor());}
  function rankCompare(a,b){if(rankSchema())return WIS.Core.Rank.compare(a,b);const x=exactRank(a),y=exactRank(b);return x!==null&&y!==null?(x>y?1:x<y?-1:0):B.BN(a).cmp(b);}
  const rankProjection=value=>rankSchema()?WIS.Core.Rank.project(value):B.BN(value);
  const rankOffsetValue=(value,offset)=>rankCompare(value,offset)<=0?0:rankSchema()?WIS.Core.Rank.add(value,-offset):safeRank(value)?value-offset:rankValue(B.sub(value,offset));
  function treeRequirementFactor(state,target){
    const basis=get(state).rankBasis?.tree;
    if(!rankSchema()||!basis)return treeSuperRequirement(state,target);
    return {base:IC.treeTimeGrowth,rank:target,origin:WIS.Core.RankBasis.target(basis.originRank),anchor:WIS.Core.RankProjection.value(basis.originRank,basis.projectedTargetRequirement,basis.projection)};
  }
  function treeRankFactor(state,rank=treeState(state).rank){
    const basis=get(state).rankBasis?.tree;
    if(!rankSchema()||!basis)return B.pow(IC.treeRankBoost,rank);
    return {base:IC.treeRankBoost,rank,origin:basis.originRank,anchor:B.pow(IC.treeRankBoost,legacyRankProjection(basis.originRank))};
  }
  const factorValue=factor=>factor&&typeof factor==='object'&&Object.prototype.hasOwnProperty.call(factor,'base')?WIS.Core.RankMath.evaluatePowerRatio([factor],[]):B.BN(factor);
  const rankLimitReached=(rank,maximum)=>maximum!==null&&rankCompare(rank,maximum)>=0;
  const safeRank=rank=>typeof rank==='number'&&Number.isSafeInteger(rank);

  function freshTree() {
    return { rank: 0, phase: "explicit", construction: B.BN(0), totalConstruction: B.BN(0), sequenceWork: B.BN(0),
      upgrades: { node: 0, branch: 0, label: 0, amplify: 0 }, superEntryMultiplier: 1, superProgress: B.ZERO, superElapsedSeconds: B.ZERO };
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
      t.rank = rankValue(raw.rank??0);
      if (rankCompare(t.rank,0)>0 && rankCompare(t.rank,3)<0) throw Error("TREE 阶位未开放");
      for (const key of ["construction", "totalConstruction", "sequenceWork", "superElapsedSeconds"]) {
        const value = B.parseFinite(raw[key] ?? 0);
        if (!value || value.lt(0)) throw Error("TREE 存档包含非法数值");
        t[key] = value;
      }
      if(WIS.Core.Amount?.enabled())for(const key of ['construction','totalConstruction','sequenceWork'])setTreeQuantity(t,key,treeQuantity(raw,key));
      for (const key of Object.keys(TREE_UPGRADES)) t.upgrades[key] = integer(raw.upgrades?.[key]);
      const multiplier=B.parseFinite(raw.superEntryMultiplier ?? 1);
      if (!multiplier || B.lt(multiplier, 1)) throw Error("TREE 超构造倍率无效");
      t.superEntryMultiplier=multiplier;
      const progress=B.parseFinite(raw.superProgress ?? 0);
      if (!progress || B.lt(progress,0) || B.gt(progress,1) && !["super", "explicit"].includes(raw.phase)) throw Error("TREE 超构造进度无效");
      t.superProgress=progress;
      if (![undefined, "explicit", "super", "complete"].includes(raw.phase)) throw Error("TREE 阶段无效");
      t.phase = raw.phase || "explicit";
    }
    // Permanent achievements never restore current-run TREE progress.
    if (rankCompare(t.rank,3)>=0 && t.phase === "complete") {
      t.phase = "complete"; t.superProgress = B.ONE;
    } else if (t.phase === "complete") throw Error("TREE 完成状态缺少阶位");
    // Explicit construction can retain earned work after stopping D10 at a target.
    if (t.phase === "explicit") { t.superEntryMultiplier = 1; t.superElapsedSeconds = B.ZERO; }
    return t;
  }
  function treeQuantity(t,key){const A=WIS.Core.Amount;return key==='construction'?A.fromParts(t.construction??0,[t.constructionGainResidual??0,...(t.constructionGainResidualTail??[])]):A.field(t,key);}
  function setTreeQuantity(t,key,value){if(key==='construction')Object.assign(t,WIS.Core.Resources.prepareTerms({},key,WIS.Core.Amount.words(value)));else Object.assign(t,WIS.Core.Amount.fieldParts(value,key));}
  function addTreeQuantity(t,key,gain){if(WIS.Core.Amount?.enabled())setTreeQuantity(t,key,WIS.Core.Amount.add(treeQuantity(t,key),gain));else t[key]=nonnegative(B.add(t[key],gain));}
  const cloneTree = t => ({ ...t,...(t.batch?{batch:WIS.Core.ClosedFormBatch.read(t.batch)}:{}), upgrades: { ...t.upgrades },...(t.rankBudget?{rankBudget:WIS.Core.RankBudget.Budget.prepare(t.rankBudget)}:{}),...(t.elapsedBudget?{elapsedBudget:WIS.Core.RankBudget.Q.read(t.elapsedBudget)}:{}) });
  const SYMBOLS = Object.freeze(["Y", "Y↑Y", "Y↑↑Y", "Y↑↑↑Y", "Y↑↑↑↑Y"]);
  const COSTS = Object.freeze([1, 300, 600, 1200, 2400]);
  const MILESTONES = Object.freeze([2, 4, 8, 16, 32, 64]);
  const ledger = () => {
    if (!WIS.Meta.TreasureLedger) throw Error("大数系数账本尚未加载");
    return WIS.Core.Amount?.enabled()?WIS.Core.AmountLedger:WIS.Meta.TreasureLedger;
  };
  const entry = () => ({ amount: B.BN(0), residual: [], total: B.BN(0), totalResidual: [],
    spent: B.BN(0), spentResidual: [], peak: B.BN(0) });
  function fresh() {
    const n = { version: 1, unlocked: false, fractalLevel: 0, purchases: [false, false, false, false, false],
      resources: SYMBOLS.map(entry), gIndex: 0, superProgress: B.BN(0), superResidual: [],
      beyondFractal: false, elapsedSeconds: 0, ySample: null, gCapacityModel: 1, tree: freshTree() };
    if(rankSchema())n.rankBasis=WIS.Core.RankBasis.create(n);
    return n;
  }
  const nonnegative = v => {
    const parsed=B.parseFinite(v ?? 0);
    if (!parsed || parsed.lt(0)) throw Error("大数存档包含非法系数");
    return parsed;
  };
  function normalize(raw, legacyTreeComplete = false) {
    const n = fresh();
    if(raw != null)for(const [path,value] of [['',raw],['tree',raw.tree],['tree.upgrades',raw.tree?.upgrades]])
      if(value!==undefined && !(path==="tree"&&value===null) && (!value || typeof value!=="object" || Array.isArray(value) || B.isDecimal(value)))
        throw Object.assign(Error("大数存档容器无效："+path),{code:'SAVE_SHAPE',path:'meta.bigNumbers'+(path?'.'+path:'')});
    if(raw?.resources!==undefined) {
      const invalid=path=>{throw Object.assign(Error("大数存档容器无效："+path),{code:'SAVE_SHAPE',path:'meta.bigNumbers.'+path});};
      if(!Array.isArray(raw.resources))invalid('resources');
      for(let i=0;i<SYMBOLS.length;i++)if(raw.resources[i]!==undefined && (!raw.resources[i] || typeof raw.resources[i]!=="object" || Array.isArray(raw.resources[i]) || B.isDecimal(raw.resources[i])))invalid('resources.'+i);
    }
    n.tree = normalizeTree(raw?.tree, legacyTreeComplete);
    if(raw?.tree?.batch)n.tree.batch=WIS.Core.ClosedFormBatch.read(raw.tree.batch);
    if(raw?.gBatch)n.gBatch=WIS.Core.ClosedFormBatch.read(raw.gBatch);
    if (!raw || typeof raw !== "object") return n;
    const integer = (v, cap) => Math.max(0, Math.min(cap, Math.floor(Number(v) || 0)));
    n.unlocked = raw.unlocked === true;
    n.fractalLevel = integer(raw.fractalLevel, 5);
    n.purchases = SYMBOLS.map((_, i) => i < n.fractalLevel);
    n.gIndex = n.fractalLevel === 5 ? (rankCompare(rankValue(raw.gIndex??1),1)<0?1:rankValue(raw.gIndex??1)) : 0;
    n.beyondFractal = raw.beyondFractal === true || n.fractalLevel === 5;
    n.elapsedSeconds = Number.isFinite(raw.elapsedSeconds) ? Math.max(0, raw.elapsedSeconds) : 0;
    if(raw.ySample!=null){
      const remaining=Number(raw.ySample.remaining);
      if(!Number.isFinite(remaining)||remaining<0||remaining>1)throw Error('大数 Y 秒内进度无效');
      n.ySample={remaining,rate:nonnegative(raw.ySample.rate),baseRate:raw.ySample.baseRate==null?null:nonnegative(raw.ySample.baseRate)};
      if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount;Object.assign(n.ySample,A.fieldParts(A.field(raw.ySample,'rate'),'rate'));if(raw.ySample.baseRate!=null)Object.assign(n.ySample,A.fieldParts(A.field(raw.ySample,'baseRate'),'baseRate'));}
    }
    const tails = v => Array.isArray(v) ? v.map(String) : [];
    const merge=(main,rest)=>{nonnegative(main);return nonnegative(ledger().value(ledger().normalize([main??0,...tails(rest)])));};
    n.resources = SYMBOLS.map((_, i) => {
      const e = raw.resources?.[i] || {};
      // Economic coefficients and statistics merge legacy words once, then
      // retain their represented Decimal value. Rank strings retain exact units.
      if(WIS.Core.Amount?.enabled()){const record={};for(const field of ['amount','total','spent','peak'])Object.assign(record,WIS.Core.Amount[field==='spent'?'fieldParts':'boundedFieldParts'](WIS.Core.Amount.field(e,field),field));return record;}
      return { amount: merge(e.amount,e.residual), residual: [],
        total: merge(e.total,e.totalResidual), totalResidual: [],
        spent: merge(e.spent,e.spentResidual), spentResidual: [],
        peak: nonnegative(e.peak) };
    });
    nonnegative(raw.superProgress);
    // An exact budget owns this view. Preserve its serialized input for strict
    // validation; legacy ledger reprojection can round tiny values a second time.
    if(rankSchema()&&Object.prototype.hasOwnProperty.call(raw,'gBudget')){n.superProgress=raw.superProgress??0;n.superResidual=tails(raw.superResidual);}
    else writeGProgress(n,[raw.superProgress??0,...tails(raw.superResidual)]);
    n.gCapacityModel=raw.gCapacityModel===1?1:0;
    if(rankSchema()){
      n.rankBasis=Object.prototype.hasOwnProperty.call(raw,'rankBasis')?WIS.Core.RankBasis.read(raw.rankBasis,n):WIS.Core.RankBasis.create(n);
      if(Object.prototype.hasOwnProperty.call(raw,'gBudget'))n.gBudget=WIS.Core.RankBudget.Budget.read(raw.gBudget);
      if(Object.prototype.hasOwnProperty.call(raw.tree||{},'elapsedBudget'))n.tree.elapsedBudget=WIS.Core.RankBudget.Q.read(raw.tree.elapsedBudget);
      if(Object.prototype.hasOwnProperty.call(raw.tree||{},'rankBudget'))n.tree.rankBudget=WIS.Core.RankBudget.Budget.read(raw.tree.rankBudget);
      WIS.Meta.RankSettlement.validate(n);
    }
    return n;
  }
  function reconcileGCapacity(state) {
    const n=get(state);
    if(n.gCapacityModel===1)return;
    if(B.gte(n.gIndex,IC.gCapacityStart+1)){
      const oldRequirement=I.gBaseRequirement(state,n.gIndex);
      n.superProgress=B.mul(B.div(n.superProgress,oldRequirement),I.gRequirement(state,n.gIndex));
      if(n.superResidual.length)writeGProgress(n,[n.superProgress,...ledger().scale(n.superResidual,B.div(I.gRequirement(state,n.gIndex),oldRequirement))]);
    }
    n.gCapacityModel=1;
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
    if (rankCompare(get(state).tree?.rank??0,3)>=0) {
      state.symbolicPowerMilestones.tree3 = true;
      WIS.Meta.Achievements.record(state, "tree3");
    }
    if (rankCompare(get(state).gIndex,64)<0) return;
    state.symbolicPowerMilestones.graham64 = true;
    WIS.Meta.Achievements.record(state, "graham64");
  }
  function syncUnlock(state) {
    if (!state.meta.bigNumbers?.resources || !state.meta.bigNumbers.tree) state.meta.bigNumbers = normalize(state.meta.bigNumbers);
    reconcileGCapacity(state);
    continueUnlockedTree(state);
    syncMilestones(state);
    const n = get(state), r = requirements(state);
    if (r.power) n.unlocked = true;
    if (n.beyondFractal && !state.unlockedAchievements.beyondFractal) {
      WIS.Meta.Achievements.record(state, "beyondFractal");
    }
    return n.unlocked;
  }
  function terms(e, field = "amount") {
    if(WIS.Core.Amount?.enabled())return WIS.Core.Amount.words(WIS.Core.Amount.field(e,field));
    return [String(B.BN(e[field]))];
  }
  function write(e, words, field = "amount") {
    if(WIS.Core.Amount?.enabled()){Object.assign(e,WIS.Core.Amount[field==='spent'?'fieldParts':'boundedFieldParts'](WIS.Core.Amount.fromParts(0,words),field));return;}
    const L = ledger(), normalized = L.normalize(words);
    if (L.sign(normalized) < 0) throw Error("大数系数余额不足，未提交");
    const main = L.value(normalized);
    e[field] = main;
    e[field === "amount" ? "residual" : `${field}Residual`] = [];
  }
  const amount = (state, order) => ledger().value(terms(get(state).resources[order]));
  const quantity=(state,order)=>WIS.Core.Amount.field(get(state).resources[order]);
  function credit(e, gain) {
    if(WIS.Core.Amount?.enabled()){const A=WIS.Core.Amount,value=A.from(gain);if(A.compare(value,0)===0)return;Object.assign(e,A.boundedFieldParts(A.add(A.field(e),value)),A.boundedFieldParts(A.add(A.field(e,'total'),value),'total'));if(A.compare(A.field(e),A.field(e,'peak'))>0)Object.assign(e,A.boundedFieldParts(A.field(e),'peak'));return;}
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
    if(rankSchema())WIS.Meta.RankSettlement.detach(copy);
    state.meta.bigNumbers = copy;
    try { return work(copy); } catch (error) { state.meta.bigNumbers = before; throw error; }
  }
  function baseYRate(power) {if(WIS.Core.Amount?.isAmount(power))return WIS.Core.Amount.project(baseYQuantityRate(power));return B.div(B.log10(B.max(1, power)), "1e8");}
  const powerQuantity=state=>WIS.Core.Resources.readExact('core.power',state);
  function baseYQuantityRate(power){const A=WIS.Core.Amount,p=A.from(power);return A.compare(p,1)<=0?A.from(0):A.divide(WIS.Core.AmountFormulas.log10(p),'1e8');}
  function baseQuantityRate(state,n,i){const A=WIS.Core.Amount;return !n.unlocked?A.from(0):i===0?n.ySample?.remaining>1e-10?A.field(n.ySample,'rate'):A.add(baseYQuantityRate(powerQuantity(state)),n.fractalLevel>=1?1:0):A.from(n.fractalLevel>=i+1?1:0);}
  function quantityRates(state){const A=WIS.Core.Amount,n=get(state);return SYMBOLS.map((_,i)=>baseQuantityRate(state,n,i)).map((rate,i)=>A.multiply(rate,I.fractalGainMultiplier(state,i)));}
  function sampledYQuantityGain(n,state,seconds,options={}){
    const A=WIS.Core.Amount;let remaining=seconds,offset=0,gain=A.from(0),sample=n.ySample?{...n.ySample}:null;
    const makeSample=(duration,power)=>{const base=baseYQuantityRate(power);return {remaining:duration,...A.fieldParts(base,'baseRate'),...A.fieldParts(A.add(base,n.fractalLevel>=1?1:0),'rate')};};
    while(remaining>1e-10){if(!sample||sample.remaining<=1e-10){const fraction=sample?0:Math.max(0,n.elapsedSeconds-Math.floor(n.elapsedSeconds));sample=makeSample(fraction>1e-10?1-fraction:1,options.powerAt?options.powerAt(offset):powerQuantity(state));}
      const dt=Math.min(remaining,sample.remaining);gain=A.add(gain,A.scale(A.field(sample,'rate'),dt));remaining=Math.max(0,Number((remaining-dt).toPrecision(14)));offset+=dt;sample.remaining=Math.max(0,Number((sample.remaining-dt).toPrecision(14)));
      if(sample.remaining<=1e-10&&remaining>=1&&!options.powerAt){const whole=Math.floor(remaining);sample=makeSample(0,powerQuantity(state));gain=A.add(gain,A.scale(A.field(sample,'rate'),whole));offset+=whole;remaining-=whole;}
    }
    if(sample&&sample.remaining<1e-10)sample.remaining=0;n.ySample=sample;return gain;
  }
  // Official rule: the Y rate is sampled at the START of each second and
  // remains fixed for that second, independently of caller dt or UI cadence.
  // A legacy save has no recoverable historical sample: seed the current
  // partial second from its current state, preserving all previously earned Y.
  function sampledYGain(n,state,seconds,options={}) {
    if(WIS.Core.Amount?.enabled())return sampledYQuantityGain(n,state,seconds,options);
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
  function baseRate(state,n,i) {
    return !n.unlocked ? B.ZERO : i === 0
      ? n.ySample?.remaining>1e-10?n.ySample.rate:B.add(baseYRate(state.power), n.fractalLevel >= 1 ? 1 : 0)
      : B.BN(n.fractalLevel >= i + 1 ? 1 : 0);
  }
  function rates(state) {
    if(WIS.Core.Amount?.enabled())return quantityRates(state).map(WIS.Core.Amount.project);
    const n = get(state);
    return SYMBOLS.map((_, i) => baseRate(state,n,i)).map((rate,i)=>B.mul(rate,I.fractalGainMultiplier(state,i)));
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
    return 2 ** MILESTONES.slice(0, -1).filter(g => rankCompare(gIndex,g)>=0).length;
  }
  function fractalMultiplier(q, enabled = true) {
    return enabled ? B.add(1, B.div(WIS.Core.Amount?.isAmount(q)?WIS.Core.AmountFormulas.logOnePlusRatio(q):B.log10(B.add(1,q)),10)) : B.BN(1);
  }
  // Integral of M_F(Q+t), Q grows by exactly one coefficient per game second.
  // Stable mean log: log(a) + ((1+x)log1p(x)-x)/x, x=t/a, a=1+Q.
  // Avoid subtracting two huge primitives when t is tiny relative to Q.
  function exposure(q, seconds, enabled = true) {
    if (!(seconds > 0)) return B.ZERO;
    if (!enabled) return B.mul(seconds, BASE_SUPER_SPEED);
    const A=WIS.Core.Amount,whole=A?.isAmount(q),a=whole?A.add(q,1):B.add(1,q),ratio=whole?WIS.Core.AmountFormulas.productQuotient([seconds],[a]):B.div(seconds,a),x=B.toNumber(ratio,Infinity),logA=()=>whole?WIS.Core.AmountFormulas.log10(a):B.log10(a);
    let meanLog;
    if (x < 1e-4) {
      const phi = x / 2 - x*x / 6 + x*x*x / 12;
      meanLog = B.add(logA(), phi / Math.LN10);
    } else if (Number.isFinite(x)) {
      meanLog = B.add(logA(), ((1 + 1/x) * Math.log1p(x) - 1) / Math.LN10);
    } else {
      meanLog = B.sub(whole?WIS.Core.AmountFormulas.log10(A.add(a,seconds)):B.log10(B.add(a,seconds)),1/Math.LN10);
    }
    return B.mul(B.mul(seconds, BASE_SUPER_SPEED), B.add(1, B.div(meanLog, 10)));
  }
  function exposureQuantity(q,duration,enabled=true){
    const A=WIS.Core.Amount,F=WIS.Core.AmountFormulas,time=A.from(duration);
    if(A.compare(time,0)===0)return A.from(0);
    if(!enabled)return A.scale(time,BASE_SUPER_SPEED);
    const a=A.add(q,1),x=B.toNumber(F.productQuotient([time],[a]),Infinity),logA=()=>F.log10(a);let meanLog;
    if(x<1e-4){const phi=x/2-x*x/6+x*x*x/12;meanLog=B.add(logA(),phi/Math.LN10);}
    else if(Number.isFinite(x))meanLog=B.add(logA(),((1+1/x)*Math.log1p(x)-1)/Math.LN10);
    else meanLog=B.sub(F.log10(A.add(a,time)),1/Math.LN10);
    return A.multiply(A.scale(time,BASE_SUPER_SPEED),B.add(1,B.div(meanLog,10)));
  }
  const treeState = state => get(state).tree || freshTree();
  const treeUnlocked = state => I.has(state, 'D5') && rankCompare(get(state).gIndex,1)>=0
    || WIS.Meta.Achievements.has(state, "googol") && rankCompare(get(state).gIndex,64)>=0;
  const targetTreeRank = state => rankCompare(treeState(state).rank,3)<0 ? 3 : rankAdd(treeState(state).rank,1);
  const treeSuperThresholdWork = (state, _target) => B.pow(IC.treeWork,state.activeChallenge==='trueTree3'?IC.treeChallengeExponent:1);
  const treeDecayThresholdWork = (state, _target) => B.mul(IC.treeDecayWork, treeEffect(state, "label"));
  const treeSuperRequirement = (state,target) => rankSchema()&&state?.meta?.bigNumbers?.rankBasis
    ? factorValue(treeRequirementFactor(state,target)) : B.mul(IC.treeSeconds,B.pow(IC.treeTimeGrowth,safeRank(target)?target-3:B.sub(target,3)));
  const treeSuperSeconds = target => {
    if(rankSchema()&&(typeof WIS.Core.Rank.read(target)==='object'||!B.parseFinite(target)))throw Object.assign(Error('精确TREE需求需要原工作单位上下文'),{code:'rank-cost-unresolved'});
    return B.toNumber(B.mul(IC.treeSeconds,B.pow(IC.treeTimeGrowth,safeRank(target)?target-3:B.sub(target,3))),Infinity);
  };
  const treeEffect = (state, key) => B.pow(TREE_UPGRADES[key].effect, treeState(state).upgrades[key]);
  const treeUpgradeCost = (state, key) => {
    const rule = TREE_UPGRADES[key];
    if (!rule) throw Error("未知 TREE 强化");
    const level=treeState(state).upgrades[key];
    const base=B.mul(rule.cost, B.pow(rule.growth, level));
    return rule.growthStep ? B.mul(base,B.pow(rule.growthStep,B.div(B.mul(level,B.sub(level,1)),2))) : base;
  };
  const treeConstructionRate = state => B.mul(B.mul(B.div(rankSchema()?rankProjection(get(state).gIndex):get(state).gIndex, 64), treeEffect(state, "node")), I.treeGainMultiplier(state));
  const treeConstructionGain = (state, seconds) => B.mul(treeConstructionRate(state), seconds);
  const rankQuantity=value=>WIS.Core.Amount.fromParts(0,WIS.Core.Rank.difference(value,0));
  function treeConstructionQuantityRate(state){const A=WIS.Core.Amount;return A.multiply(A.multiply(A.divide(rankQuantity(get(state).gIndex),64),treeEffect(state,'node')),I.treeGainMultiplier(state));}
  function treeConstructionQuantityGain(state,duration){const A=WIS.Core.Amount,Q=WIS.Core.RankBudget.Q;
    if(typeof duration==='number'||typeof duration==='string'||B.isDecimal(duration)||A.isAmount(duration))return A.multiply(treeConstructionQuantityRate(state),A.from(duration));
    const value=Q.multiply(WIS.Core.AmountLedger.toQ(A.words(treeConstructionQuantityRate(state))),duration);
    return WIS.Core.RankExact.is(value)?A.from(Q.project(value)):A.fromParts(0,WIS.Core.AmountLedger.fromQ(value));
  }
  const treeSequenceQuantityGain=(state,gain)=>WIS.Core.Amount.multiply(gain,treeEffect(state,'branch'));
  function treeSequenceGain(state, constructionGain) {
    return B.mul(constructionGain, treeEffect(state, "branch"));
  }
  function treeSequenceIndex(work, decayWork = IC.treeDecayWork) {
    if(WIS.Core.Amount?.isAmount(work)){const A=WIS.Core.Amount,F=WIS.Core.AmountFormulas;if(A.compare(work,decayWork)<=0)return B.max(1,B.mul(TREE_INDEX_BASE,F.powerRatio(work,TREE_WORK_BASE,.8)));const atDecay=B.mul(TREE_INDEX_BASE,B.pow(B.div(decayWork,TREE_WORK_BASE),.8));return B.max(1,B.mul(atDecay,F.powerRatio(work,decayWork,.5)));}
    const before = B.mul(TREE_INDEX_BASE, B.pow(B.div(work, TREE_WORK_BASE), 0.8));
    if (B.lte(work, decayWork)) return B.max(1, before);
    const atDecay = B.mul(TREE_INDEX_BASE, B.pow(B.div(decayWork, TREE_WORK_BASE), 0.8));
    return B.max(1, B.mul(atDecay, B.pow(B.div(work, decayWork), 0.5)));
  }
  function treeSuperMultiplier(state) {
    const i = treeSequenceIndex(WIS.Core.Amount?.enabled()?treeQuantity(treeState(state),'sequenceWork'):treeState(state).sequenceWork, treeDecayThresholdWork(state, targetTreeRank(state)));
    if (B.lte(i, TREE_INDEX_BASE)) return B.ONE;
    const raw = B.add(1, B.mul(0.5, B.log10(B.div(i, TREE_INDEX_BASE))));
    return B.lte(raw, 5) ? raw : B.mul(5, B.pow(B.div(raw, 5), 0.75));
  }
  function treeSuperSources(state) {
    const t=treeState(state),sources=[{name:t.phase==="explicit"?"进入基础":"进入时锁定基础",multiplier:B.BN(t.phase==="explicit"?treeSuperMultiplier(state):t.superEntryMultiplier)}];
    if(I.has(state,'D11-1')){
      const A=WIS.Core.Amount,whole=A?.enabled(),elapsed=whole?Object.prototype.hasOwnProperty.call(t,'elapsedBudget')?A.fromParts(0,WIS.Core.AmountLedger.fromQ(WIS.Core.RankBudget.Q.read(t.elapsedBudget))):A.from(t.superElapsedSeconds):null;
      sources.push({name:'超构造停留时间',multiplier:B.add(1,whole?WIS.Core.AmountFormulas.powerRatio(elapsed,IC.treeTimeBoostSeconds,.5):B.pow(B.div(t.superElapsedSeconds,IC.treeTimeBoostSeconds),.5))});
    }
    if(I.has(state,'D11-2'))sources.push({name:"超构造增幅",multiplier:treeEffect(state,"amplify")});
    if(I.has(state,'D11-3')){const factor=treeRankFactor(state);sources.push({name:"TREE阶位",multiplier:factorValue(factor),...(rankSchema()?{factor}:{})});}
    return sources;
  }
  const treeEffectiveSuperMultiplier = state => treeSuperSources(state).reduce((value,source)=>B.mul(value,source.multiplier),B.ONE);
  function normalizedTreeQuotient(factors,requirement,ordinary) {
    return WIS.Core.StableProductQuotient.requiresNormalization(factors,[requirement])
      ? WIS.Core.StableProductQuotient.evaluate(factors,[requirement]) : ordinary();
  }
  function treeSuperSpeed(state) {
    if(rankSchema())return WIS.Core.RankMath.evaluatePowerRatio(treeSuperSources(state).map(source=>source.factor??source.multiplier),[treeRequirementFactor(state,targetTreeRank(state))]);
    const factors=treeSuperSources(state).map(source=>source.multiplier),requirement=treeSuperRequirement(state,targetTreeRank(state));
    return normalizedTreeQuotient(factors,requirement,()=>B.div(factors.reduce((value,factor)=>B.mul(value,factor),B.ONE),requirement));
  }
  // Exact integral of 1+sqrt(t/600), using a stable difference of powers.
  function treeTimeExposure(elapsed,seconds,enabled) {
    if(!enabled || seconds===0)return B.BN(seconds);
    const a=B.pow(B.div(elapsed,IC.treeTimeBoostSeconds),.5),b=B.pow(B.div(B.add(elapsed,seconds),IC.treeTimeBoostSeconds),.5);
    const mean=B.mul(2/3,B.div(B.add(B.add(B.mul(a,a),B.mul(a,b)),B.mul(b,b)),B.add(a,b)));
    return B.mul(seconds,B.add(1,mean));
  }
  const treeActive = state => treeUnlocked(state) && (maximumTree(state)===null || rankCompare(targetTreeRank(state),maximumTree(state))<=0);
  function canPurchaseTreeUpgrade(state, key) {
    return Object.prototype.hasOwnProperty.call(TREE_UPGRADES, key) && (!TREE_UPGRADES[key].unlock || I.has(state,TREE_UPGRADES[key].unlock)) && treeActive(state) && (treeState(state).phase === "explicit" || treeState(state).phase === "super" && I.has(state,"D9"))
      && (key !== "label" || (WIS.Core.Amount?.enabled()?WIS.Core.Amount.compare(treeQuantity(treeState(state),'sequenceWork'),treeDecayThresholdWork(state,targetTreeRank(state)))>=0:B.gte(treeState(state).sequenceWork,treeDecayThresholdWork(state,targetTreeRank(state)))))
      && treeState(state).upgrades[key] < Number.MAX_SAFE_INTEGER && (WIS.Core.Amount?.enabled()?WIS.Core.Amount.compare(treeQuantity(treeState(state),'construction'),treeUpgradeCost(state,key))>=0:B.gte(treeState(state).construction,treeUpgradeCost(state,key)));
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
    && (WIS.Core.Amount?.enabled()?WIS.Core.Amount.compare(treeQuantity(treeState(state),'sequenceWork'),treeSuperThresholdWork(state,targetTreeRank(state)))>=0:B.gte(treeState(state).sequenceWork,treeSuperThresholdWork(state,targetTreeRank(state))));
  function enterTreeSuper(state) {
    if (!canEnterTreeSuper(state)) return false;
    WIS.Core.Runtime.assertMutable();
    transaction(state, n => { n.tree.superEntryMultiplier = treeSuperMultiplier(state); if (!I.has(state,"D10")){if(rankSchema()&&n.tree.rankBudget)WIS.Meta.RankSettlement.resetTree(n.tree);else n.tree.superProgress = B.ZERO;} n.tree.superElapsedSeconds = B.ZERO;if(rankSchema())delete n.tree.elapsedBudget; n.tree.phase = "super"; });
    return true;
  }
  // One bounded pass per committed online frame. Reuse all manual gates and
  // payments; entry is last so the current construction multiplier is locked.
  function automate(state) {
    const fractal=I.has(state,'D7-1') && state.fractalAutomationEnabled,
      upgrades=I.has(state,'D7-2') && state.treeUpgradeAutomationEnabled,
      enter=I.has(state,'D7-3') && state.treeSuperAutomationEnabled;
    if(!fractal && !upgrades && !enter)return 0;
    WIS.Core.Runtime.assertMutable();
    let count=0;
    if(fractal && purchase(state,get(state).fractalLevel+1))count++;
    if(upgrades)for(const key of Object.keys(TREE_UPGRADES))if(purchaseTreeUpgrade(state,key))count++;
    if(enter && canEnterTreeSuper(state) && B.gte(treeEffectiveSuperMultiplier(state),state.treeSuperAutomationMultiplier))
      if(enterTreeSuper(state))count++;
    return count;
  }
  function resetRankProgress(t, retainConstruction = false) {
    // D8 points are spendable inventory, including income earned in super mode.
    if (!retainConstruction) {if(WIS.Core.Amount?.enabled())setTreeQuantity(t,'construction',WIS.Core.Amount.from(0));else t.construction=B.ZERO;}
    t.phase="explicit";if(WIS.Core.Amount?.enabled())setTreeQuantity(t,'sequenceWork',WIS.Core.Amount.from(0));else t.sequenceWork=B.ZERO;t.superProgress=B.ZERO;t.superEntryMultiplier=1;t.superElapsedSeconds=B.ZERO;
    if(rankSchema())WIS.Meta.RankSettlement.resetTree(t);
  }
  function continueUnlockedTree(state) {
    const t=treeState(state);
    if(t.phase==="complete" && rankCompare(t.rank,3)>=0 && !rankLimitReached(t.rank,maximumTree(state)) && I.has(state,"D1-2"))resetRankProgress(t,I.has(state,"D8"));
  }
  function startNextTree(state) {
    if (!treeActive(state) || treeState(state).phase !== "complete") return false;
    WIS.Core.Runtime.assertMutable();
    transaction(state, n => { resetRankProgress(n.tree,I.has(state,"D8")); });
    return true;
  }
  // Stored progress uses the current target's requirement as one unit. Offline
  // may bank more than one unit; online consumes geometric rank costs with
  // the native integer solver or a bounded BigNum search above its range.
  function advanceContinuousTree(t, seconds, speed, maximum, stopAtTarget = false, state = null) {
    if(rankSchema()){if(!state)throw Object.assign(Error('精确TREE需要候选上下文'),{code:'rank-cost-unresolved'});return WIS.Meta.RankSettlement.advanceTreeRaw(state,seconds,maximum,stopAtTarget);}
    const target=B.lt(t.rank,3)?3:rankAdd(t.rank,1), limit=stopAtTarget?1:maximum===null?SAFE_RANK:maximum-Number(target)+1;
    const available=nonnegative(B.add(t.superProgress,B.mul(speed,seconds)));
    if(B.lt(available,1)){t.superProgress=available;return;}
    const cost=count=>count===0?B.ZERO:count===1?B.ONE:
      B.div(B.sub(B.pow(IC.treeTimeGrowth,count),1),B.sub(IC.treeTimeGrowth,1));
    let lo=0,hi=limit;
    while(lo<hi){const mid=lo+Math.ceil((hi-lo)/2);if(B.lte(cost(mid),available))lo=mid;else hi=mid-1;}
    if(maximum===null&&!stopAtTarget&&lo===SAFE_RANK)lo=affordableLarge(cost,value=>B.lte(value,available),B.div(B.log10(B.add(1,B.mul(available,B.sub(IC.treeTimeGrowth,1)))),Math.log10(IC.treeTimeGrowth)));
    if(lo===0){t.superProgress=available;return;}
    const next=rankAdd(target,rankAdd(lo,-1));if(rankCompare(next,t.rank)<=0){t.superProgress=available;return;}t.rank=next;
    if(rankLimitReached(t.rank,maximum)){t.phase="complete";t.superProgress=B.ONE;return;}
    t.superProgress=nonnegative(B.div(B.max(0,B.sub(available,cost(lo))),B.pow(IC.treeTimeGrowth,lo)));
    if(stopAtTarget)stopTreeAtTarget(t);
  }
  function stopTreeAtTarget(t) {
    // Retain construction, upgrades and raw earned progress for the next target.
    t.phase="explicit";t.superEntryMultiplier=1;t.superElapsedSeconds=B.ZERO;
  }
  function advanceBoostedTree(state,seconds,stopAtTarget = false) {
    if(rankSchema())return WIS.Meta.RankSettlement.advanceTreeBoosted(state,seconds,maximumTree(state),stopAtTarget);
    const t=treeState(state),maximum=maximumTree(state);
    // Previously earned work (including frozen offline income) pays raw TREE
    // requirements first. Never multiply it again by newly acquired boosts.
    advanceContinuousTree(t,0,B.ZERO,maximum,stopAtTarget);
    if(t.phase!=="super")return;
    const target=targetTreeRank(state),limit=stopAtTarget?1:maximum===null?SAFE_RANK:maximum-Number(target)+1;
    const rankGrowth=I.has(state,'D11-3')?IC.treeRankBoost:1;
    const exposure=treeTimeExposure(t.superElapsedSeconds,seconds,I.has(state,'D11-1'));
    const factors=[t.superEntryMultiplier,I.has(state,'D11-2')?treeEffect(state,'amplify'):B.ONE,B.pow(rankGrowth,t.rank)];
    const requirement=treeSuperRequirement(state,target);
    const available=nonnegative(normalizedTreeQuotient([exposure,...factors],requirement,()=>{
      const multiplier=B.mul(B.mul(factors[0],factors[1]),factors[2]);
      return B.div(B.mul(exposure,multiplier),requirement);
    }));
    t.superElapsedSeconds=nonnegative(B.add(t.superElapsedSeconds,seconds));
    const first=B.sub(1,t.superProgress);
    if(B.lt(available,first)){t.superProgress=nonnegative(B.add(t.superProgress,available));return;}
    // Rank 0 -> 3 is a three-rank boost; all later jumps are one rank.
    const nextRatio=B.div(IC.treeTimeGrowth,B.pow(rankGrowth,B.lt(t.rank,3)?3:1)),ratio=B.div(IC.treeTimeGrowth,rankGrowth);
    const cost=count=>B.eq(count,0)?B.ZERO:B.eq(count,1)?first:B.add(first,B.mul(nextRatio,B.div(B.sub(B.pow(ratio,safeRank(count)?count-1:B.sub(count,1)),1),B.sub(ratio,1))));
    let lo=1,hi=limit;
    while(lo<hi){const mid=lo+Math.ceil((hi-lo)/2);if(B.lte(cost(mid),available))lo=mid;else hi=mid-1;}
    if(maximum===null&&!stopAtTarget&&lo===SAFE_RANK)lo=affordableLarge(cost,value=>B.lte(value,available),B.add(1,B.div(B.log10(B.add(1,B.div(B.mul(B.max(0,B.sub(available,first)),B.sub(ratio,1)),nextRatio))),B.log10(ratio))));
    const next=rankAdd(target,rankAdd(lo,-1));if(rankCompare(next,t.rank)<=0){t.superProgress=nonnegative(B.add(t.superProgress,available));return;}t.rank=next;
    if(rankLimitReached(t.rank,maximum)){t.phase="complete";t.superProgress=B.ONE;return;}
    // A stopped interval earns work at the completed rank; do not apply a
    // future rank boost to work banked while the player is out of super mode.
    t.superProgress=nonnegative(B.div(B.max(0,B.sub(available,cost(lo))),stopAtTarget?IC.treeTimeGrowth:B.mul(nextRatio,B.pow(ratio,safeRank(lo)?lo-1:B.sub(lo,1)))));
    if(stopAtTarget)stopTreeAtTarget(t);
  }
  function advanceTree(state, seconds) {
    if (!treeActive(state)) return;
    const t = treeState(state);
    if (t.phase === "explicit") {
      const gain = WIS.Core.Amount?.enabled()?treeConstructionQuantityGain(state,seconds):treeConstructionGain(state,seconds);
      addTreeQuantity(t,'construction',gain);
      addTreeQuantity(t,'totalConstruction',gain);
      addTreeQuantity(t,'sequenceWork',WIS.Core.Amount?.enabled()?treeSequenceQuantityGain(state,gain):treeSequenceGain(state,gain));
    } else if (t.phase === "super") {
      if(rankSchema()&&!I.has(state,'D10'))return WIS.Meta.RankSettlement.advanceTreeSingle(state,seconds,maximumTree(state));
      const remaining=B.toNumber(B.div(B.mul(B.max(0,B.sub(1,t.superProgress)),treeSuperRequirement(state,targetTreeRank(state))),t.superEntryMultiplier),Infinity);
      if(I.has(state,"D8")){
        const duration=I.has(state,'D10')?seconds:Math.min(seconds,remaining),gain=WIS.Core.Amount?.enabled()?treeConstructionQuantityGain(state,duration):treeConstructionGain(state,duration);
        addTreeQuantity(t,'construction',gain);
        addTreeQuantity(t,'totalConstruction',gain);
      }
      if(I.has(state,"D10")){
        const stopAtTarget = !state.treeSuperAutomationEnabled;
        if(stopAtTarget && B.gte(t.superProgress,1)){
          advanceContinuousTree(t,0,B.ZERO,maximumTree(state),true,state);
          return;
        }
        if(['D11-1','D11-2','D11-3'].some(id=>I.has(state,id)))advanceBoostedTree(state,seconds,stopAtTarget);
        else {advanceContinuousTree(t,seconds,treeSuperSpeed(state),maximumTree(state),stopAtTarget,state);if(!rankSchema()&&(!stopAtTarget||t.phase==="super"))t.superElapsedSeconds=nonnegative(B.add(t.superElapsedSeconds,seconds));}
        return;
      }
      t.superElapsedSeconds=nonnegative(B.add(t.superElapsedSeconds,Math.min(seconds,remaining)));
      t.superProgress=nonnegative(B.add(t.superProgress,B.mul(seconds,treeSuperSpeed(state))));
      if (B.gte(t.superProgress,1)) {
        const next=targetTreeRank(state);if(rankCompare(next,t.rank)<=0)return;t.rank=next;if(rankSchema())get(state).rankBasis.tree.targetRank=targetTreeRank(state);t.phase="complete";t.superProgress=B.ONE;
        if(I.has(state,"D1-2") && !rankLimitReached(t.rank,maximumTree(state))){
          resetRankProgress(t,I.has(state,"D8"));
          if(seconds>remaining)advanceTree(state,seconds-remaining);
        }
      }
    }
  }
  function treeView(state) {
    const t = treeState(state), target = targetTreeRank(state), unlocked = treeUnlocked(state);
    const decayWork = treeDecayThresholdWork(state, target);
    const sequenceIndex = treeSequenceIndex(t.sequenceWork, decayWork), currentIndex = sequenceIndex.floor();
    const thresholdIndex = treeSequenceIndex(treeSuperThresholdWork(state, target), decayWork);
    const decayIndex = treeSequenceIndex(decayWork, decayWork);
    const nextDecayWork = B.mul(decayWork, TREE_UPGRADES.label.effect);
    const nextDecayIndex = treeSequenceIndex(nextDecayWork, nextDecayWork);
    const labelActive = B.gte(t.sequenceWork, decayWork);
    const requirement=treeSuperRequirement(state,target);
    return { ...t, upgrades:{...t.upgrades}, unlocked, target, labels: target, available: maximumTree(state)===null || rankCompare(target,maximumTree(state))<=0,
      sequenceIndex, currentIndex, nextIndex: B.add(currentIndex, 1), sequenceProgress: B.toNumber(B.sub(sequenceIndex, currentIndex), 0),
      thresholdIndex, decayIndex, nextDecayIndex, unlockProgress: B.toNumber(B.min(1, B.max(0, B.div(sequenceIndex, thresholdIndex))), 0),
      constructionRate: unlocked && (t.phase === "explicit" || t.phase === "super" && I.has(state,"D8")) && (maximumTree(state)===null || rankCompare(target,maximumTree(state))<=0) ? treeConstructionRate(state) : B.ZERO,
      superMultiplier: treeEffectiveSuperMultiplier(state),
      superRequirement: requirement, superCompleted: B.mul(t.superProgress,requirement),
      superProgressFraction: B.toNumber(B.min(1,t.superProgress),0),
      superPointIncome: I.has(state,"D8"), superUpgrades: I.has(state,"D9"), continuousSuper: I.has(state,"D10"),
      superSources: treeSuperSources(state),
      remainingSeconds: t.phase === "super" ? B.toNumber(B.div(B.mul(B.max(0,B.sub(1,t.superProgress)),requirement),treeEffectiveSuperMultiplier(state)),Infinity) : 0,
      canEnter: canEnterTreeSuper(state), upgrades: Object.fromEntries(Object.entries(TREE_UPGRADES).map(([key, rule]) =>
        [key, { ...rule, unlocked: !rule.unlock || I.has(state,rule.unlock), level: t.upgrades[key], multiplier: treeEffect(state, key), active: key !== "label" || labelActive,
          cost: treeUpgradeCost(state, key), canPurchase: canPurchaseTreeUpgrade(state, key) }])) };
  }
  // Only structural TREE changes invalidate predictors. Work/progress remains a fresh interval input.
  const treeSignature = state => { const t = treeState(state); return [treeUnlocked(state), t.rank, t.phase, t.upgrades.node, t.upgrades.branch, t.upgrades.label, t.upgrades.amplify, t.superEntryMultiplier, I.has(state,"D10")?state.treeSuperAutomationEnabled:null, I.has(state,"D11-1")?String(t.superElapsedSeconds):null]; };

  // Monotone Decimal search. Exponent bracketing handles e/ee counts in bounded
  // work; native-count callers keep the existing solver and payment ordering.
  function affordableLarge(cost,canPay,estimate=1){
    if(!canPay(cost(1)))return 0;
    let lo=B.ONE,hi=B.max(2,B.add(B.mul(estimate,2),1)).floor();
    const larger=value=>{const doubled=B.mul(value,2);if(B.gt(doubled,value))return doubled;
      return B.BN(value).constructor.fromComponents(1,value.layer,value.mag+Math.max(Math.abs(value.mag)*1e-14,1e-14));};
    let bracket=false;
    for(let i=0;i<128;i++){
      if(!B.isFiniteBN(hi))break;
      if(!canPay(cost(rankValue(hi)))){bracket=true;break;}
      lo=hi;hi=larger(hi);
    }
    if(!bracket)throw Error('阶位批量超出大数可表示范围，进度未扣除');
    for(let i=0;i<128;i++){
      let lower=B.div(hi,2).floor();if(B.eq(lower,hi))lower=B.BN(hi).constructor.fromComponents(1,hi.layer,hi.mag-Math.max(Math.abs(hi.mag)*1e-14,1e-14));
      if(B.lte(lower,lo))break;if(canPay(cost(rankValue(lower)))){lo=lower;break;}hi=lower;
    }
    for(let i=0;i<192;i++){
      const mid=B.div(B.add(lo,hi),2).floor();
      if(B.lte(mid,lo)||B.gte(mid,hi))break;
      if(canPay(cost(rankValue(mid))))lo=mid;else hi=mid;
    }
    return rankValue(lo);
  }
  const logOnePlus=x=>B.lt(B.abs(x),'1e-5')?B.mul(x,B.add(B.sub(1,B.div(x,2)),B.div(B.mul(x,x),3))):B.BN(B.add(1,x)).ln();
  const expMinusOne=x=>B.lt(B.abs(x),'1e-5')?B.mul(x,B.add(B.add(1,B.div(x,2)),B.div(B.mul(x,x),6))):B.sub(B.BN(x).exp(),1);
  function largePowerSum(x,count,p){
    const n=B.BN(count);if(B.eq(n,0))return B.ZERO;if(B.eq(n,1))return B.pow(x,p);
    const log=logOnePlus(B.div(B.sub(n,1),x));
    const difference=e=>B.mul(B.pow(x,e),expMinusOne(B.mul(e,log)));
    let sum=B.add(B.div(difference(p+1),p+1),B.mul(B.add(B.pow(x,p),B.pow(B.add(x,B.sub(n,1)),p)),.5));
    for(const [order,coefficient] of [[1,1/12],[3,-1/720],[5,1/30240],[7,-1/1209600],[9,1/47900160],[11,-691/1307674368000],[13,1/74724249600],[15,-3617/10670622842880000]]){
      let derivative=coefficient;for(let j=0;j<order;j++)derivative*=p-j;sum=B.add(sum,B.mul(difference(p-order),derivative));
    }return sum;
  }
  function largeGCost(state,start,count){
    if(B.eq(count,0))return B.ZERO;
    if(B.lte(count,32)){let sum=B.ZERO;for(let j=0;j<Number(count);j++)sum=B.add(sum,I.gRequirement(state,rankAdd(start,j)));return sum;}
    const reward=I.rewardUnlocked(state,'trueGraham'),rank=I.has(state,'D6'),n=B.BN(count),g=B.BN(start),divisor=I.gRequirementDivisor(state);
    if(state.activeChallenge==='trueGraham'){
      // The increasing quadratic factor makes the omitted geometric prefix
      // smaller than lastOmitted/(1-1/ratio); 2048 terms are beyond precision.
      const kept=B.lt(n,2048)?Number(n):2048,first=rankAdd(start,rankAdd(count,-kept));let sum=B.ZERO;
      for(let j=0;j<kept;j++)sum=B.add(sum,I.gRequirement(state,rankAdd(first,j)));
      return sum;
    }
    const a=IC.gRequirement/(IC.gCapacityDivisor**2),h=IC.gCapacityStart-IC.gCapacityDivisor;
    if(reward){const p=IC.gRewardExponent,shift=h+(rank?1/(2*a):0),offset=rank?h/a+1/(4*a*a):0,x=B.sub(g,shift);let sum=B.ZERO,coefficient=1;
      for(let j=0;j<(rank?12:1);j++){sum=B.add(sum,B.mul(coefficient,largePowerSum(x,n,2*p-2*j)));coefficient*=((p-j)/(j+1))*(-offset);}
      return B.mul(B.pow(B.div(a,divisor),p),sum);
    }
    const x=B.sub(g,h),pairs=B.mul(n,B.sub(n,1)),sumJ=B.div(pairs,2),sumJ2=B.div(B.mul(pairs,B.sub(B.mul(2,n),1)),6);
    let sum=B.mul(a,B.add(B.add(B.mul(n,B.mul(x,x)),B.mul(B.mul(2,x),sumJ)),sumJ2));
    if(rank)sum=B.sub(sum,B.add(B.mul(n,g),sumJ));return B.div(sum,divisor);
  }
  function settleLargeG(n,state,income){
    const L=ledger(),available=L.add([n.superProgress,...n.superResidual],[income]);
    const cost=count=>largeGCost(state,n.gIndex,count),budget=B.max(0,L.value(available)),firstCost=cost(1);
    const p=I.rewardUnlocked(state,'trueGraham')?IC.gRewardExponent:1,a=IC.gRequirement/(IC.gCapacityDivisor**2),divisor=I.gRequirementDivisor(state);
    const estimate=state.activeChallenge==='trueGraham'
      ? B.add(1,B.div(B.max(0,B.sub(B.log10(B.max(1,budget)),B.log10(firstCost))),Math.log10(IC.gRequirement)*IC.gChallengeCoefficient*p))
      : B.min(B.div(budget,firstCost),B.pow(B.mul(B.mul(budget,2*p+1),B.pow(B.div(divisor,a),p)),1/(2*p+1)));
    // A paid batch below the rank's own Decimal resolution cannot advance it.
    // Keep every income/debit word until a representable rank movement exists.
    if(rankCompare(rankAdd(n.gIndex,rankValue(B.max(1,B.BN(estimate).floor()))),n.gIndex)<=0){writeGProgress(n,available);return;}
    const levels=affordableLarge(cost,value=>L.compare([value],available)<=0,estimate);
    if(B.eq(levels,0)){writeGProgress(n,available);return;}
    const next=rankAdd(n.gIndex,levels);
    if(rankCompare(next,n.gIndex)<=0){writeGProgress(n,available);return;}
    const remainder=L.subtract(available,[cost(levels)]);if(L.sign(remainder)<0)throw Error('大数阶位批量余额不足，未提交');
    n.gIndex=next;writeGProgress(n,remainder);
  }
  function advanceLargeG(n,seconds,q,state,options){
    const qRate=I.fractalGainMultiplier(state,4),work=options.fixedSources?B.mul(seconds,B.mul(BASE_SUPER_SPEED,fractalMultiplier(q,n.beyondFractal))):B.eq(qRate,1)?exposure(q,seconds,n.beyondFractal):B.div(exposure(q,B.mul(seconds,qRate),n.beyondFractal),qRate);
    if(!B.isFiniteBN(work))throw Error('无限超分形时间无法表示');
    settleLargeG(n,state,B.mul(B.mul(work,I.gSpeedMultiplier(state)),milestoneMultiplier(n.gIndex)));return 0;
  }

  function affordableGCount(limit,cost,canPay){
    if(limit<=0||!canPay(cost(1)))return 0;
    let lo=1,hi=Math.min(2,limit);
    while(hi<limit&&canPay(cost(hi))){lo=hi;hi=Math.min(limit,hi*2);}
    while(lo<hi){const mid=lo+Math.ceil((hi-lo)/2);if(canPay(cost(mid)))lo=mid;else hi=mid-1;}
    return lo;
  }
  function writeGProgress(n,words) {
    const L=ledger(),normalized=L.normalize(words);
    if(L.sign(normalized)<0)throw Error('超分形进度余额不足，未提交');
    n.superProgress=nonnegative(L.value(normalized));
    n.superResidual=L.subtract(normalized,[n.superProgress]);
  }
  // Only states that already carry signed progress use this path. Empty-tail
  // online states retain every operation in the original algorithms below.
  // Stay in progress points: dividing a high-layer atom by k and multiplying
  // it back cannot preserve that atom. Milestone ratios are exact integers.
  function advanceGrahamLedger(n,seconds,q,state=null,options={},cap=64) {
    const unlimited=cap===null;if(unlimited&&(!safeRank(n.gIndex)||n.gIndex===SAFE_RANK))return advanceLargeG(n,seconds,q,state,options);cap=cap??SAFE_RANK;
    if(!n.gIndex)return 0;
    const L=ledger(),modified=state!==null,fixedOnly=!modified&&options.fixedSources===true;
    let progress=L.normalize([n.superProgress,...n.superResidual]);
    const affordable=(words,cost,limit)=>affordableGCount(limit,cost,value=>L.compare(words,[value])>=0);
    // The original plain solver settles carried whole ranks before applying
    // this interval's source; retain that order, including its milestone base.
    if(!modified&&!fixedOnly&&n.gIndex<cap) {
      const levels=affordable(progress,count=>count*100,cap-n.gIndex);
      progress=L.subtract(progress,[levels*100]);n.gIndex+=levels;
    }
    const firstIndex=n.gIndex,initialK=milestoneMultiplier(n.gIndex);
    const qRate=modified?I.fractalGainMultiplier(state,4):B.ONE,speed=modified?I.gSpeedMultiplier(state):B.ONE;
    const work=options.fixedSources?B.mul(seconds,B.mul(BASE_SUPER_SPEED,fractalMultiplier(q,n.beyondFractal))):
      B.eq(qRate,1)?exposure(q,seconds,n.beyondFractal):B.div(exposure(q,B.mul(seconds,qRate),n.beyondFractal),qRate);
    if(!B.isFiniteBN(work))throw Error('超分形时间无法表示');
    const income=fixedOnly?B.mul(B.mul(BASE_SUPER_SPEED,B.mul(initialK,fractalMultiplier(q,n.beyondFractal))),seconds):B.mul(B.mul(work,speed),initialK);
    progress=L.add(progress,[income]);
    if(fixedOnly) {
      const levels=affordable(progress,count=>count*100,Math.max(0,cap-n.gIndex));
      progress=L.subtract(progress,[levels*100]);n.gIndex+=levels;
    } else {
      let ratio=modified&&state.activeChallenge==='trueGraham'?B.pow(IC.gRequirement,IC.gChallengeCoefficient):B.ONE;
      if(modified&&state.activeChallenge==='trueGraham'&&I.rewardUnlocked(state,'trueGraham'))ratio=B.pow(ratio,IC.gRewardExponent);
      for(const end of [...MILESTONES.filter(g=>g>n.gIndex&&g<cap),cap]) {
        const start=n.gIndex,limit=end-start;if(limit<=0)continue;
        const k=milestoneMultiplier(start),req=modified?I.gRequirement(state,start):B.BN(100);
        const rankCost=modified&&(I.has(state,'D6')||I.rewardUnlocked(state,'trueGraham'))?gRankCost(state,start,limit,ratio):null;
        const cost=count=>{
          if(count===0)return B.ZERO;
          if(rankCost)return rankCost(count);
          if(modified&&start>=IC.gCapacityStart&&count<=32){let sum=B.ZERO;for(let j=0;j<count;j++)sum=B.add(sum,I.gRequirement(state,start+j));return sum;}
          return B.mul(req,modified&&start>=IC.gCapacityStart?gCapacitySum(start,count,ratio):
            B.eq(ratio,1)?count:B.div(B.sub(B.pow(ratio,count),1),B.sub(ratio,1)));
        };
        const levels=affordable(progress,cost,limit);
        progress=L.subtract(progress,[cost(levels)]);n.gIndex+=levels;
        const nextK=milestoneMultiplier(n.gIndex);if(!B.eq(nextK,k))progress=L.scale(progress,B.div(nextK,k));
        if(n.gIndex<end)break;
      }
    }
    writeGProgress(n,progress);
    if(unlimited&&n.gIndex===SAFE_RANK)settleLargeG(n,state,B.ZERO);
    return MILESTONES.filter(g=>g>firstIndex&&B.lte(g,n.gIndex)).length;
  }
  function advanceGraham(n, seconds, q) {
    if(n.superResidual?.length)return advanceGrahamLedger(n,seconds,q);
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
  function gModifiersActive(state) { return I.has(state,'D1-1') || I.has(state,'D2-1') || I.has(state,'D4') || I.has(state,'D6') || I.rewardUnlocked(state,'trueG1') || I.rewardUnlocked(state,'trueGraham') || ['trueG1','trueGraham'].includes(state.activeChallenge); }
  function drainStages(iterator){let step=iterator.next();while(!step.done)step=iterator.next(typeof step.value==='function'?step.value():undefined);return step.value;}
  function* advanceStages(state,seconds,options,n,atomic=fn=>fn()) {
      const q = WIS.Core.Amount?.enabled()?quantity(state,4):amount(state,4);
      const oldIndex = n.gIndex;
      const startingRates = options.fixedSources && !WIS.Core.Amount?.enabled() ? rates(state) : null;
      const modified = gModifiersActive(state);
      const earlyTree=I.has(state,'D5') && rankCompare(oldIndex,1)>=0;
      let crossingSeconds=seconds;
      if(modified && !earlyTree && rankCompare(oldIndex,0)>0 && rankCompare(oldIndex,64)<0){
        const probe={...n};yield ()=>{if(rankSchema())WIS.Meta.RankSettlement.advanceG(probe,seconds,q,state,options,64);else advanceGrahamInfinity(probe,seconds,q,state,options,64);};
        if(probe.gIndex>=64){let lo=0,hi=seconds;for(let j=0;j<52;j++){const mid=(lo+hi)/2,p={...n};yield ()=>{if(rankSchema())WIS.Meta.RankSettlement.advanceG(p,mid,q,state,options,64);else advanceGrahamInfinity(p,mid,q,state,options,64);};if(p.gIndex>=64)hi=mid;else lo=mid;}crossingSeconds=hi;}
      }
      // The rank adapter prepares all fields privately and assigns them only after
      // its proof completes. It needs no second meta transaction on each retry.
      const milestoneCrossings = yield ()=>rankSchema()?WIS.Meta.RankSettlement.advanceG(get(state),seconds,q,state,options):atomic(()=>modified ? advanceGrahamInfinity(get(state),seconds,q,state,options) : options.fixedSources
        ? advanceGrahamFixed(get(state), seconds, q) : advanceGraham(get(state), seconds, q));
      n=get(state);
      let treeSeconds = 0;
      if (earlyTree) treeSeconds = seconds;
      else if (rankCompare(n.gIndex,64)>=0 && treeUnlocked(state)) {
        if (rankCompare(oldIndex,64)>=0) treeSeconds = seconds;
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
      if(WIS.Core.Amount?.enabled()&&treeActive(state)&&treeState(state).phase==='explicit'){
        // This work already owns a detached TREE. Retain each completed pure
        // field preparation instead of replaying the whole meta transaction.
        const gain=yield ()=>treeConstructionQuantityGain(state,treeSeconds);
        for(const key of ['construction','totalConstruction','sequenceWork']){
          const income=key==='sequenceWork'?yield ()=>treeSequenceQuantityGain(state,gain):gain;
          const next=yield ()=>{const copy={...treeState(state)};addTreeQuantity(copy,key,income);return copy;};
          get(state).tree=next;
        }
      }else yield ()=>atomic(()=>advanceTree(state, treeSeconds));
      n=get(state);
      const A=WIS.Core.Amount;
      if(A?.enabled()){
        // Retain completed pure stages across a later proof suspension. The
        // sample and credits are prepared on detached records; install once.
        const fullRates=yield ()=>quantityRates(state);
        const sampled=yield ()=>{
          const current=get(state),sampleOwner={...current,ySample:current.ySample?{...current.ySample}:null};
          const gain=options.offlineSnapshot?A.scale(fullRates[0],seconds):A.multiply(sampledYGain(sampleOwner,state,seconds,options),I.fractalGainMultiplier(state,0));
          return {gain,ySample:options.offlineSnapshot?null:sampleOwner.ySample};
        };
        const resources=[];
        for(let i=0;i<5;i++)resources.push(yield ()=>{
          const entry={...get(state).resources[i]};credit(entry,i===0?sampled.gain:A.scale(fullRates[i],seconds));return entry;
        });
        return yield ()=>{n=get(state);n.ySample=sampled.ySample;n.resources=resources;n.elapsedSeconds+=seconds;return {milestoneCrossings};};
      }
      return yield ()=>atomic(()=>{n=get(state);
        const currentRates=startingRates||rates(state);
        if(options.endPower!==undefined)currentRates[0]=B.mul(B.add(baseYRate(options.endPower),n.fractalLevel>=1?1:0),I.fractalGainMultiplier(state,0));
        const yGain=options.offlineSnapshot?B.mul(currentRates[0],seconds):B.mul(sampledYGain(n,state,seconds,options),I.fractalGainMultiplier(state,0));
        if(options.offlineSnapshot)n.ySample=null;
        for(let i=0;i<5;i++)credit(n.resources[i],i===0?yGain:B.mul(currentRates[i],seconds));
        n.elapsedSeconds+=seconds;return {milestoneCrossings};
      });
  }
  function advanceBody(state,seconds,options={}) {
    if(!Number.isFinite(seconds)||seconds<0)throw Error('大数结算时间无效');
    if(!syncUnlock(state))return {milestoneCrossings:0};
    const result=transaction(state,n=>drainStages(advanceStages(state,seconds,options,n)));
    syncMilestones(state);return result;
  }
  function advanceGrahamInfinity(n,seconds,q,state,options={},cap=maximumG(state)) {
    const unlimited=cap===null;if(unlimited&&(!safeRank(n.gIndex)||n.gIndex===SAFE_RANK))return advanceLargeG(n,seconds,q,state,options);cap=cap??SAFE_RANK;
    if(n.superResidual?.length)return advanceGrahamLedger(n,seconds,q,state,options,unlimited?null:cap);
    if(!n.gIndex)return 0;
    const old=n.gIndex, qRate=I.fractalGainMultiplier(state,4), speed=I.gSpeedMultiplier(state);
    const work=options.fixedSources?B.mul(seconds,B.mul(BASE_SUPER_SPEED,fractalMultiplier(q,n.beyondFractal))):
      B.eq(qRate,1)?exposure(q,seconds,n.beyondFractal):B.div(exposure(q,B.mul(seconds,qRate),n.beyondFractal),qRate);
    if(!B.isFiniteBN(work))throw Error('无限超分形时间无法表示');
    let available=B.add(B.div(n.superProgress,milestoneMultiplier(n.gIndex)),B.mul(work,speed));
    let ratio=state.activeChallenge==='trueGraham'?B.pow(IC.gRequirement,IC.gChallengeCoefficient):B.ONE;
    if(state.activeChallenge==='trueGraham'&&I.rewardUnlocked(state,'trueGraham'))ratio=B.pow(ratio,IC.gRewardExponent);
    for(const end of [...MILESTONES.filter(x=>x>n.gIndex&&x<cap),cap]){
      if(n.gIndex>=end)continue;
      const k=milestoneMultiplier(n.gIndex),req=I.gRequirement(state,n.gIndex),maxLevels=end-n.gIndex;
      const capacity=n.gIndex>=IC.gCapacityStart;
      const rankCost=(I.has(state,'D6')||I.rewardUnlocked(state,'trueGraham'))?gRankCost(state,n.gIndex,maxLevels,ratio):null;
      const cost=count=>{
        if(rankCost)return B.div(rankCost(count),k);
        if(capacity&&count<=32){let exact=B.ZERO;for(let j=0;j<count;j++)exact=B.add(exact,I.gRequirement(state,n.gIndex+j));return B.div(exact,k);}
        return B.div(B.mul(req,capacity?gCapacitySum(n.gIndex,count,ratio):
          B.eq(ratio,1)?count:B.div(B.sub(B.pow(ratio,count),1),B.sub(ratio,1))),k);
      };
      let levels;
      if(capacity||rankCost){
        levels=affordableGCount(maxLevels,cost,value=>B.lte(value,available));
      }else{
        const estimate=B.eq(ratio,1)?B.div(B.mul(available,k),req):B.div(B.log10(B.add(1,B.div(B.mul(B.mul(available,k),B.sub(ratio,1)),req))),B.log10(ratio));
        levels=Math.min(maxLevels,Math.max(0,Math.floor(B.toNumber(B.min(estimate,maxLevels),0))));
        if(levels>0&&B.gt(cost(levels),available))levels--;
        if(levels<maxLevels&&B.lte(cost(levels+1),available))levels++;
      }
      available=B.sub(available,cost(levels));n.gIndex+=levels;
      if(n.gIndex<end)break;
    }
    n.superProgress=B.mul(available,milestoneMultiplier(n.gIndex));n.superResidual=[];
    if(unlimited&&n.gIndex===SAFE_RANK)settleLargeG(n,state,B.ZERO);
    return MILESTONES.filter(g=>g>old&&B.lte(g,n.gIndex)).length;
  }
  // On each side of G64 the raw requirement is convex (geometric times
  // quadratic). Subtracting G preserves convexity, so its floor is one interval.
  // Find that interval lazily only for large batches; sum its two outer pieces
  // analytically and its middle as 42 per rank, then apply D4 division.
  function gRankCost(state,start,limit,ratio){
    if(I.rewardUnlocked(state,'trueGraham'))return poweredGCost(state,start);
    let floorRange=null;
    const raw=g=>I.gRequirementBeforeRank(state,g);
    const belowFloor=i=>{const polynomial=I.gRankPolynomial(state,start+i);return polynomial
      ?B.lte(polynomial.constant,IC.gRankMinimum):B.lte(raw(start+i),B.add(start+i,IC.gRankMinimum));};
    const ascending=i=>{
      const g=start+i,polynomial=I.gRankPolynomial(state,g);
      if(polynomial)return B.gte(B.add(polynomial.linear,polynomial.quadratic),0);
      const delta=g>=IC.gCapacityStart
        ?B.add(B.div(2,g-IC.gCapacityStart+IC.gCapacityDivisor),B.pow(B.div(1,g-IC.gCapacityStart+IC.gCapacityDivisor),2)):B.ZERO;
      return B.gte(B.mul(raw(g),B.add(B.sub(ratio,1),B.mul(ratio,delta))),1);
    };
    const rawSum=(offset,count)=>{
      if(count<=0)return B.ZERO;
      const g=start+offset,polynomial=I.gRankPolynomial(state,g);
      if(polynomial){
        const pairs=B.mul(count,B.sub(count,1)),sumJ=B.div(pairs,2),sumJ2=B.div(B.mul(pairs,B.sub(B.mul(2,count),1)),6);
        return B.add(B.add(B.mul(count,polynomial.constant),B.mul(sumJ,polynomial.linear)),B.mul(sumJ2,polynomial.quadratic));
      }
      const factor=g>=IC.gCapacityStart?gCapacitySum(g,count,ratio):
        B.eq(ratio,1)?B.BN(count):B.div(B.sub(B.pow(ratio,count),1),B.sub(ratio,1));
      const ranks=B.div(B.mul(count,B.add(B.mul(2,g),count-1)),2);
      return B.sub(B.mul(raw(g),factor),ranks);
    };
    return count=>{
      if(count<=32){let sum=B.ZERO;for(let j=0;j<count;j++)sum=B.add(sum,I.gRequirement(state,start+j));return sum;}
      if(!floorRange){
        let lo=0,hi=limit-1;
        while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(ascending(mid))hi=mid;else lo=mid+1;}
        const minimum=lo;
        if(!belowFloor(minimum))floorRange=[limit,limit];
        else{
          lo=0;hi=minimum;
          while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(belowFloor(mid))hi=mid;else lo=mid+1;}
          const first=lo;lo=minimum;hi=limit;
          while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(belowFloor(mid))lo=mid+1;else hi=mid;}
          floorRange=[first,lo];
        }
      }
      const first=Math.min(count,floorRange[0]),end=Math.min(count,floorRange[1]);
      return I.gRequirementAfterRank(state,B.add(B.add(rawSum(0,first),B.mul(end-first,IC.gRankMinimum)),rawSum(end,count-end)));
    };
  }
  // Power sums use the same represented-number accuracy as the geometric
  // batches. The small ranks are explicit; the smooth tail uses eight
  // Euler--Maclaurin corrections with stable endpoint differences.
  function gPowerSum(x,count,p){
    if(count===0)return B.ZERO;
    if(count===1)return B.pow(x,p);
    const logRatio=Math.log1p((count-1)/x);
    const difference=exponent=>B.mul(B.pow(x,exponent),Math.expm1(exponent*logRatio));
    let sum=B.add(B.div(difference(p+1),p+1),B.mul(B.add(B.pow(x,p),B.pow(x+count-1,p)),.5));
    for(const [order,coefficient] of [[1,1/12],[3,-1/720],[5,1/30240],[7,-1/1209600],
      [9,1/47900160],[11,-691/1307674368000],[13,1/74724249600],[15,-3617/10670622842880000]]){
      let derivative=coefficient;for(let j=0;j<order;j++)derivative*=p-j;
      sum=B.add(sum,B.mul(difference(p-order),derivative));
    }
    return sum;
  }
  function poweredGCost(state,start){
    const p=IC.gRewardExponent,divisor=I.gRequirementDivisor(state),rank=I.has(state,'D6');
    const prefixSums=[B.ZERO];
    const explicit=(first,count)=>{
      if(first===start&&count<=4096){
        while(prefixSums.length<=count){const j=prefixSums.length-1;prefixSums.push(B.add(prefixSums[j],I.gRequirement(state,start+j)));}
        return prefixSums[count];
      }
      let sum=B.ZERO;for(let j=0;j<count;j++)sum=B.add(sum,I.gRequirement(state,first+j));return sum;
    };
    return count=>{
      if(count<=4096)return explicit(start,count);
      if(state.activeChallenge==='trueGraham'){
        // At most MAX_SAFE_INTEGER terms. Beyond this suffix, even the
        // conservative omitted-count * largest-omitted-demand bound is below
        // represented precision (challenge growth is 100^(0.01*0.95) per G).
        const kept=Math.min(count,2048),first=start+count-kept,sum=explicit(first,kept);
        if(count>kept&&B.gt(B.mul(I.gRequirement(state,first-1),count-kept),B.mul(sum,1e-17)))
          throw Error('G挑战累计需求尾项无法安全省略');
        return sum;
      }
      const prefix=Math.min(count,Math.max(0,128-start)),first=start+prefix,n=count-prefix;
      if(!n)return explicit(start,count);
      if(IC.gCapacityPower!==2)throw Error('G次方批量需要二次容量曲线');
      const a=IC.gRequirement/(IC.gCapacityDivisor**2),h=IC.gCapacityStart-IC.gCapacityDivisor;
      // a*(G-h)^2-G = a*((G-h-1/(2a))^2 - h/a-1/(4a^2)).
      const shift=h+(rank?1/(2*a):0),offset=rank?h/a+1/(4*a*a):0,x=first-shift;
      let sum=B.ZERO,coefficient=1;
      // x >= 71.68; offset/x^2 < .007. Twelve binomial terms leave <1e-25
      // relative tail. No growing per-rank loop at high G or high TREE.
      for(let j=0;j<(rank?12:1);j++){
        sum=B.add(sum,B.mul(coefficient,gPowerSum(x,n,2*p-2*j)));
        coefficient*=((p-j)/(j+1))*(-offset);
      }
      return B.add(explicit(start,prefix),B.mul(B.pow(B.div(a,divisor),p),sum));
    };
  }
  function gCapacitySum(g,count,ratio){
    if(count===0)return B.ZERO;
    const power=IC.gCapacityPower;
    if(!Number.isInteger(power)||power<0)throw Error('G需求容量指数必须为非负整数');
    const a=B.add(1,B.div(g-IC.gCapacityStart,IC.gCapacityDivisor)),b=B.div(1,IC.gCapacityDivisor),m=B.BN(count);
    if(power===2&&B.eq(ratio,1)){
      const sum=B.add(B.add(B.mul(m,B.pow(a,2)),B.mul(B.mul(a,b),B.mul(m,B.sub(m,1)))),
        B.div(B.mul(B.pow(b,2),B.mul(B.mul(m,B.sub(m,1)),B.sub(B.mul(2,m),1))),6));
      return B.div(sum,B.pow(a,2));
    }
    const choose=(n,k)=>{let value=1;for(let i=1;i<=k;i++)value=value*(n-i+1)/i;return value;};
    const join=(left,right)=>({length:left.length+right.length,p:B.mul(left.p,right.p),
      moments:left.moments.map((value,k)=>{
        let shifted=B.ZERO;
        for(let i=0;i<=k;i++)shifted=B.add(shifted,B.mul(B.mul(choose(k,i),B.pow(left.length,k-i)),right.moments[i]));
        return B.add(value,B.mul(left.p,shifted));
      })});
    let sum={length:0,p:B.ONE,moments:Array.from({length:power+1},()=>B.ZERO)};
    let block={length:1,p:ratio,moments:[B.ONE,...Array.from({length:power},()=>B.ZERO)]};
    for(let remaining=count;remaining>0;remaining=Math.floor(remaining/2)){
      if(remaining%2)sum=join(sum,block);
      if(remaining>1)block=join(block,block);
    }
    let weighted=B.ZERO;
    for(let i=0;i<=power;i++)weighted=B.add(weighted,B.mul(B.mul(choose(power,i),B.mul(B.pow(a,power-i),B.pow(b,i))),sum.moments[i]));
    return B.div(weighted,B.pow(a,power));
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
    if(n.superResidual?.length)return advanceGrahamLedger(n,seconds,q,null,{fixedSources:true});
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
  function advanceWithRanks(state,seconds,options={}){
    if(!rankSchema())return advanceBody(state,seconds,options);
    const before=get(state),achievements=state.meta.achievements,milestones=state.meta.milestones,infinity=state.meta.infinity;
    const copy={...before,purchases:before.purchases.slice(),resources:before.resources.map(e=>({...e})),superResidual:before.superResidual.slice(),tree:cloneTree(before.tree)};
    WIS.Meta.RankSettlement.detach(copy);state.meta.bigNumbers=copy;state.meta.achievements={...achievements};state.meta.milestones={...milestones};
    state.meta.infinity={...infinity,upgrades:{...infinity.upgrades},challengeRewards:{...infinity.challengeRewards},purchaseLedger:infinity.purchaseLedger.slice()};
    try{return advanceBody(state,seconds,options);}catch(error){state.meta.bigNumbers=before;state.meta.achievements=achievements;state.meta.milestones=milestones;state.meta.infinity=infinity;throw error;}
  }
  function advance(state,seconds,options={}){return rankSchema()?WIS.Core.RankExact.withWork(()=>advanceWithRanks(state,seconds,options)):advanceBody(state,seconds,options);}
  // Validate the new ledger before any old-resource commit. The caller installs
  // this plan only after the original step succeeds; errors cannot replay J gains.
  function prepareLegacy(state, seconds, options) {
    const before = get(state), achievements = state.meta.achievements, milestones = state.meta.milestones, infinity = state.meta.infinity;
    state.meta.bigNumbers = { ...before, purchases: before.purchases.slice(),
      resources: before.resources.map(e => ({ ...e })), superResidual: before.superResidual.slice(), tree: cloneTree(before.tree || freshTree()) };
    if(rankSchema())WIS.Meta.RankSettlement.detach(state.meta.bigNumbers);
    state.meta.achievements = { ...achievements };
    state.meta.milestones = { ...milestones };
    try { advance(state, seconds, options); return get(state); }
    finally { state.meta.bigNumbers = before; state.meta.achievements = achievements; state.meta.milestones = milestones; state.meta.infinity = infinity; }
  }
  const copyCoefficientWords = words => WIS.Core.Amount?.enabled()&&WIS.Core.Amount.isCanonicalTail(words)?words:words.slice();
  const copyDomain = n => ({...n,purchases:n.purchases.slice(),resources:n.resources.map(e=>({...e,residual:copyCoefficientWords(e.residual),totalResidual:copyCoefficientWords(e.totalResidual),spentResidual:copyCoefficientWords(e.spentResidual)})),superResidual:n.superResidual.slice(),tree:{...n.tree,upgrades:{...n.tree.upgrades}},ySample:n.ySample?{...n.ySample}:null});
  function createPreparationWork(state,seconds,options,profile,control={}){
    if(!Number.isFinite(seconds)||seconds<0)throw Error('大数结算时间无效');
    const key=()=>JSON.stringify(WIS.Core.State.toSerializable(state),(k,v)=>k==='timeLedger'||k==='lastUpdateAt'?undefined:v),initial=control.isCurrent?null:key();
    let closed=false,value=null,working=null,math=null,session=null,ownsSession=false;
    const current=()=>!closed&&(control.isCurrent?control.isCurrent():key()===initial);
    const check=()=>{if(!current()){closed=true;throw Object.assign(Error('big number work owner changed'),{code:'rank-work-stale'});}};
    const scoped=fn=>WIS.Core.Runtime.withState(working,()=>WIS.Core.Effects.withFrozenState(working,fn));
    const budgetScope=fn=>session?WIS.Core.RankBudget.Budget.withSession(session,fn):fn();
    function atomic(fn){const before=working.meta;working.meta={...before,bigNumbers:copyDomain(before.bigNumbers),achievements:{...before.achievements},milestones:{...before.milestones},infinity:{...before.infinity,upgrades:{...before.infinity.upgrades},challengeRewards:{...before.infinity.challengeRewards},purchaseLedger:before.infinity.purchaseLedger.slice()}};
      try{return fn();}catch(e){working.meta=before;throw e;}}
    function* stages(){
      if(rankSchema())yield* WIS.Meta.RankSettlement.detachSteps(working.meta.bigNumbers);
      if(profile)return yield ()=>atomic(()=>prepareFrozenBody(working,seconds,profile,true));
      if(!syncUnlock(working))return get(working);
      yield* advanceStages(working,seconds,options,get(working),atomic);
      yield ()=>syncMilestones(working);return get(working);
    }
    return Object.freeze({advance({deadline=Infinity,maximumOperations=256}={}){check();if(value)return {done:true,phase:'done',operations:0};
      if(!working){working=WIS.Core.State.shallowBranch(state);working.meta={...state.meta,bigNumbers:copyDomain(get(state)),achievements:{...state.meta.achievements},milestones:{...state.meta.milestones},infinity:{...state.meta.infinity,upgrades:{...state.meta.infinity.upgrades},challengeRewards:{...state.meta.infinity.challengeRewards},purchaseLedger:state.meta.infinity.purchaseLedger.slice()}};
        if(rankSchema()){session=WIS.Core.RankBudget.Budget.activeSession();if(!session){session=WIS.Core.RankBudget.Budget.createSession({isCurrent:current});ownsSession=true;}}
        if(rankSchema())math=WIS.Core.RankExact.createWork(()=>budgetScope(()=>scoped(()=>WIS.Core.CertifiedRankMath.task('big-numbers-stages',stages))),{isCurrent:current});
        else math={advance(){value=scoped(()=>drainStages(stages()));return {done:true,operations:1};},result:()=>value,cancel(){}};
        return {done:false,phase:'initialized',operations:1};
      }
      const next=math.advance({deadline,maximumOperations});if(next.done)value=math.result();return {...next,phase:next.done?'done':'math'};
    },result(){check();return value;},valid(){try{check();return true;}catch(e){return false;}},cancel(){closed=true;value=null;math?.cancel();if(ownsSession)session?.close();}});
  }
  function prepareWork(state,seconds,options={},control={}){return createPreparationWork(state,seconds,options,null,control);}
  function prepareFrozenWork(state,seconds,profile=captureFrozen(state),control={}){return createPreparationWork(state,seconds,{},quantityFrozenProfile(profile),control);}
  function prepare(state,seconds,options={}){if(!rankSchema())return prepareLegacy(state,seconds,options);const work=prepareWork(state,seconds,options);while(!work.advance({maximumOperations:65536}).done){}return work.result();}
  // True offline freezes income in its published units. Graham's stored
  // progress and requirement are both progress points; the normalized work
  // coordinate used by advanceGrahamInfinity must not amplify them at new G
  // milestones. Only the cost of each next rank continues to escalate.
  function captureFrozen(state) {
    const n=get(state),unlocked=isUnlocked(state),t=n.tree||freshTree();
    const rateState={core:state.core,power:state.power,activeChallenge:state.activeChallenge,cultivation:state.cultivation,
      meta:{...state.meta,bigNumbers:{...n,unlocked}}};
    // This detached, minimal read domain feeds the official requirement APIs.
    // In particular a TREE rank earned below cannot reduce this batch's costs.
    const requirementState={activeChallenge:state.activeChallenge,meta:{
      closedBatchModel:state.meta.closedBatchModel,
      infinity:{upgrades:{...I.get(state)?.upgrades},challengeRewards:{...I.get(state)?.challengeRewards}},
      achievements:{...state.meta.achievements},bigNumbers:{resources:[],tree:{rank:rankSchema()?WIS.Core.Rank.serialize(t.rank):t.rank}}}};
    const activeTree=unlocked&&treeActive(state),A=WIS.Core.Amount,whole=A?.enabled();
    const gQuantity=whole?unlocked&&rankCompare(n.gIndex,0)>0?A.multiply(A.scale(A.from(I.gSpeedMultiplier(state)),BASE_SUPER_SPEED*milestoneMultiplier(n.gIndex)),fractalMultiplier(quantity(state,4),n.beyondFractal)):A.from(0):null;
    const treeQuantities=whole?{construction:activeTree&&(t.phase==='explicit'||t.phase==='super'&&I.has(state,'D8'))?treeConstructionQuantityRate(state):A.from(0),super:A.from(activeTree&&t.phase==='super'?treeSuperSpeed(state):B.ZERO)}:null;
    if(treeQuantities)treeQuantities.sequence=activeTree&&t.phase==='explicit'?treeSequenceQuantityGain(state,treeQuantities.construction):A.from(0);
    const fullRates=whole?quantityRates(rateState):null;
    return {kind:'FrozenBigNumbersProfile',unlocked,rates:whole?fullRates.map(A.project):rates(rateState),...(whole?{numericModelVersion:1,quantities:fullRates}:{}),
      g:{active:unlocked&&rankCompare(n.gIndex,0)>0,maximum:maximumG(state),requirementState,...(whole?{quantityRate:gQuantity}:{}),
        rate:whole?A.project(gQuantity):unlocked&&rankCompare(n.gIndex,0)>0?B.mul(I.gSpeedMultiplier(state),B.mul(BASE_SUPER_SPEED,
          B.mul(milestoneMultiplier(n.gIndex),fractalMultiplier(WIS.Core.Amount?.enabled()?quantity(state,4):amount(state,4),n.beyondFractal)))):B.ZERO},
      tree:{active:activeTree,phase:t.phase,rank:rankSchema()?WIS.Core.Rank.serialize(t.rank):t.rank,target:targetTreeRank(state),...(whole?{quantities:treeQuantities}:{}),
        constructionRate:whole?A.project(treeQuantities.construction):activeTree&&(t.phase==='explicit'||t.phase==='super'&&I.has(state,'D8'))?treeConstructionRate(state):B.ZERO,
        sequenceRate:whole?A.project(treeQuantities.sequence):activeTree&&t.phase==='explicit'?treeSequenceGain(state,treeConstructionRate(state)):B.ZERO,
        superRate:whole?A.project(treeQuantities.super):activeTree&&t.phase==='super'?treeSuperSpeed(state):B.ZERO}};
  }
  function quantityFrozenProfile(profile){
    const A=WIS.Core.Amount;if(!A?.enabled())return profile;
    const invalid=()=>{throw Object.assign(Error('完整大数冻结来源无效'),{code:'amount-frozen-profile'});};
    if(profile?.kind!=='FrozenBigNumbersProfile'||profile.numericModelVersion!==1||!Array.isArray(profile.quantities)||profile.quantities.length!==5||!Array.isArray(profile.rates)||profile.rates.length!==5||!profile.g||!profile.tree?.quantities)invalid();
    const read=(value,shadow)=>{if(!A.isAmount(value)&&value?.kind!=='wis-amount')invalid();let full;try{full=A.from(value);}catch(error){if(WIS.Core.CertifiedRankMath.isSuspension(error))throw error;invalid();}const projected=B.parseFinite(shadow);if(!projected||!B.eq(projected,A.project(full)))invalid();return full;};
    return {...profile,quantities:profile.quantities.map((value,i)=>read(value,profile.rates[i])),g:{...profile.g,quantityRate:read(profile.g.quantityRate,profile.g.rate)},tree:{...profile.tree,quantities:{construction:read(profile.tree.quantities.construction,profile.tree.constructionRate),sequence:read(profile.tree.quantities.sequence,profile.tree.sequenceRate),super:read(profile.tree.quantities.super,profile.tree.superRate)}}};
  }
  function advanceFrozenGraham(n,seconds,profile) {
    if(rankSchema())return WIS.Meta.RankSettlement.frozenG(n,seconds,profile);
    if(!profile.active)return;
    const state=profile.requirementState,L=ledger(),startingIndex=n.gIndex;
    const income=nonnegative(B.mul(nonnegative(profile.rate),seconds));
    if(profile.maximum===null&&(!safeRank(n.gIndex)||n.gIndex===SAFE_RANK)){settleLargeG(n,state,income);return;}
    const maximum=profile.maximum??SAFE_RANK;
    let available=L.add([n.superProgress,...n.superResidual],[income]);
    if(L.sign(available)<0)throw Error('大数冻结进度余额无效');
    let ratio=state.activeChallenge==='trueGraham'?B.pow(IC.gRequirement,IC.gChallengeCoefficient):B.ONE;
    if(state.activeChallenge==='trueGraham'&&I.rewardUnlocked(state,'trueGraham'))ratio=B.pow(ratio,IC.gRewardExponent);
    // Capacity begins at G64. These are the only two formula regions; each
    // search takes at most 53 iterations even at Number.MAX_SAFE_INTEGER.
    for(const end of [Math.min(IC.gCapacityStart,maximum),maximum]) {
      const start=n.gIndex,limit=end-start;
      if(limit<=0)continue;
      const rankCost=(I.has(state,'D6')||I.rewardUnlocked(state,'trueGraham'))?gRankCost(state,start,limit,ratio):null;
      const first=I.gRequirement(state,start);
      const cost=count=>{
        if(count<=0)return B.ZERO;
        if(rankCost)return rankCost(count);
        if(count<=32){let sum=B.ZERO;for(let j=0;j<count;j++)sum=B.add(sum,I.gRequirement(state,start+j));return sum;}
        return B.mul(first,start>=IC.gCapacityStart?gCapacitySum(start,count,ratio):
          B.eq(ratio,1)?count:B.div(B.sub(B.pow(ratio,count),1),B.sub(ratio,1)));
      };
      const lo=affordableGCount(limit,cost,value=>L.compare([value],available)<=0);
      available=L.subtract(available,[cost(lo)]);n.gIndex+=lo;
      if(n.gIndex<end)break;
    }
    // Keep represented income and payment debt below the Decimal main. A
    // no-op retains the original words instead of needlessly rebasing them.
    if(B.eq(income,0)&&n.gIndex===startingIndex)return;
    if(L.sign(available)<0)throw Error('大数冻结进度余额不足');
    n.superProgress=nonnegative(L.value(available));
    n.superResidual=L.subtract(available,[n.superProgress]);
    if(profile.maximum===null&&n.gIndex===SAFE_RANK)settleLargeG(n,state,B.ZERO);
  }
  function prepareFrozenBody(state,seconds,profile=captureFrozen(state),alreadyPrepared=false) {
    if(!Number.isFinite(seconds)||seconds<0)throw Error('大数冻结结算时间无效');
    if(profile?.kind!=='FrozenBigNumbersProfile')throw Error('大数冻结来源无效');
    profile=quantityFrozenProfile(profile);
    const before=get(state),n=alreadyPrepared?before:{...before,purchases:before.purchases.slice(),
      resources:before.resources.map(e=>({...e,residual:copyCoefficientWords(e.residual),totalResidual:copyCoefficientWords(e.totalResidual),spentResidual:copyCoefficientWords(e.spentResidual)})),
      superResidual:before.superResidual.slice(),tree:cloneTree(before.tree||freshTree()),ySample:before.ySample?{...before.ySample}:null};
    if(rankSchema()&&!alreadyPrepared)WIS.Meta.RankSettlement.detach(n);
    if(!profile.unlocked)return n;
    n.unlocked=true;
    for(let i=0;i<5;i++)credit(n.resources[i],WIS.Core.Amount?.enabled()?WIS.Core.Amount.scale(profile.quantities[i],seconds):B.mul(nonnegative(profile.rates[i]),seconds));
    advanceFrozenGraham(n,seconds,profile.g);
    const t=n.tree,frozen=profile.tree;
    if(frozen.active&&rankCompare(t.rank,frozen.rank)===0&&t.phase===frozen.phase) {
      const gain=WIS.Core.Amount?.enabled()?WIS.Core.Amount.scale(frozen.quantities.construction,seconds):B.mul(nonnegative(frozen.constructionRate),seconds);
      addTreeQuantity(t,'construction',gain);
      addTreeQuantity(t,'totalConstruction',gain);
      if(frozen.phase==='explicit') {
        addTreeQuantity(t,'sequenceWork',WIS.Core.Amount?.enabled()?WIS.Core.Amount.scale(frozen.quantities.sequence,seconds):B.mul(nonnegative(frozen.sequenceRate),seconds));
      } else if(frozen.phase==='super'&&WIS.Meta.ClosedRankSettlement?.enabled(state)) {
        WIS.Meta.ClosedRankSettlement.frozenTree(n,state,seconds,frozen);
      } else if(frozen.phase==='super') {
        // Bank all work; newly accrued time changes the multiplier only online.
        if(rankSchema())WIS.Meta.RankSettlement.advanceElapsed(t,seconds,I.has(state,'D11-1')||Object.prototype.hasOwnProperty.call(t,'elapsedBudget'));else t.superElapsedSeconds=nonnegative(B.add(t.superElapsedSeconds,seconds));
        if(rankSchema())WIS.Meta.RankSettlement.bankTree(n,WIS.Core.Amount?.enabled()?WIS.Core.Amount.scale(frozen.quantities.super,seconds):B.mul(nonnegative(frozen.superRate),seconds));
        else t.superProgress=nonnegative(B.add(t.superProgress,B.mul(nonnegative(frozen.superRate),seconds)));
      }
    }
    // Online will seed its next official one-second sample from the new state.
    n.ySample=null;n.elapsedSeconds+=seconds;
    if(!Number.isFinite(n.elapsedSeconds))throw Error('大数冻结结算累计时间无法表示');
    return n;
  }
  function prepareFrozen(state,seconds,profile=captureFrozen(state)){if(!rankSchema())return prepareFrozenBody(state,seconds,profile);const work=prepareFrozenWork(state,seconds,profile);while(!work.advance({maximumOperations:65536}).done){}return work.result();}
  // The global header consumes one display branch, never TREE controls/costs.
  function headerSummary(state) {
    const n=get(state),treeRank=(n.tree||freshTree()).rank;
    if(rankCompare(treeRank,3)>=0)return {phase:'tree',treeRank};
    if(rankCompare(n.gIndex,0)>0){
      const q=amount(state,4);
      return {phase:'g',gIndex:n.gIndex,
        progress:ledger().value(ledger().normalize([n.superProgress,...n.superResidual])),
        speed:B.mul(I.gSpeedMultiplier(state),B.mul(BASE_SUPER_SPEED,B.mul(milestoneMultiplier(n.gIndex),fractalMultiplier(q,n.beyondFractal))))};
    }
    const order=Math.max(0,n.fractalLevel-1),A=WIS.Core.Amount;
    const rate=A?.enabled()?A.project(A.multiply(baseQuantityRate(state,n,order),I.fractalGainMultiplier(state,order)))
      :B.mul(baseRate(state,n,order),I.fractalGainMultiplier(state,order));
    return {phase:'ordinary',dominantOrder:order,symbol:SYMBOLS[order],amount:amount(state,order),rate};
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
        if (rankCompare(rankValue(v.treeRank),3)<0) throw Error("未知 TREE 阶位");
      } else if (v.order === 5) {
        if (rankCompare(rankValue(v.gIndex),1)<0) throw Error("未知 Graham 阶位");
      } else nonnegative(v.coefficient);
    }
    const ca = a.order >= 5 ? B.BN(1) : B.BN(a.coefficient), cb = b.order >= 5 ? B.BN(1) : B.BN(b.coefficient);
    if (B.eq(ca, 0) || B.eq(cb, 0)) return ca.cmp(cb);
    return a.order !== b.order ? Math.sign(a.order - b.order) : a.order === 6 ? rankCompare(a.treeRank,b.treeRank) : a.order === 5 ? rankCompare(a.gIndex,b.gIndex) : ca.cmp(cb);
  }
  WIS.Meta.BigNumbers = Object.freeze({ exactRanksEnabled:rankSchema,rankProjection,rankOffsetValue,treeRequirementFactor,treeRankFactor,factorValue, withLegacyRanks, legacyTargetRank, legacyRankValue, legacyRankInput, legacyRankProjection, rankValue, rankAdd, rankCompare, BASE_SUPER_SPEED, SYMBOLS, COSTS, MILESTONES, fresh, normalize, get, reconcileGCapacity, continueUnlockedTree, requirements, isUnlocked,
    syncUnlock, syncMilestones, rankQuantity,treeConstructionQuantityRate,treeQuantity,setTreeQuantity,addTreeQuantity,quantity,quantityRates,baseYRate, currentBaseYRate, sampledYGain, rates, amount, canPurchase, purchase, milestoneMultiplier, fractalMultiplier,
    exposure,exposureQuantity, gModifiersActive, advance, prepare, prepareWork, captureFrozen, prepareFrozen, prepareFrozenWork, headerSummary, view, compareSymbolic, maximumGIndex: 64, maximumG, maximumTree,
    MAX_TREE_RANK, TREE_UPGRADES, freshTree, normalizeTree, treeUnlocked, targetTreeRank, treeSuperThresholdWork, treeDecayThresholdWork, treeSuperRequirement, treeSuperSeconds,
    treeEffect, treeUpgradeCost, treeConstructionQuantityGain,treeSequenceQuantityGain,treeConstructionRate, treeConstructionGain, treeSequenceGain, treeSequenceIndex, treeSuperMultiplier, treeEffectiveSuperMultiplier, treeSuperSources, treeTimeExposure, treeSuperSpeed,
    automate, canPurchaseTreeUpgrade, purchaseTreeUpgrade, canEnterTreeSuper, enterTreeSuper, startNextTree, treeView, treeSignature });
}(window.WIS));
