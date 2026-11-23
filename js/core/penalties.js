(function definePenalties(WIS) {
  "use strict";

  const CONFIG = WIS.Core.Config.googolPenalty;
  const { BN, ZERO, ONE, add, sub, mul, div, pow, pow10, log10, max, gt } = WIS.Core.BigNum;
  const RESOURCE_ALIASES = Object.freeze({ j: "joules", joules: "joules" });
  const thresholdLog10 = log10(CONFIG.threshold);

  function resourceKey(resource) {
    const key = String(resource || "");
    return RESOURCE_ALIASES[key] || key;
  }

  let preparedStrength=null;
  function prepareImmutableScope(currentState){
    const R=WIS.Core.Runtime;if(currentState===R.state)currentState=R.getState();if(!WIS.Core.Amount?.enabled()||!R.isEvaluating()||R.getState()!==currentState)throw Object.assign(Error('Penalty preparation needs its immutable evaluation owner'),{code:'amount-work-stale'});
    const policy=R.getMathPolicy(),strength=Object.freeze(BN(String(getGoogolPenaltyStrength(currentState))));
    return Object.freeze({run(callback){
      if(!R.isEvaluating()||R.getState()!==currentState||R.getMathPolicy()!==policy)throw Object.assign(Error('Prepared penalty owner changed'),{code:'amount-work-stale'});
      const previous=preparedStrength;preparedStrength={state:currentState,policy,strength};try{return callback();}finally{preparedStrength=previous;}
    }});
  }
  function getGoogolPenaltyStrength(currentState = WIS.Core.Runtime?.getState?.()) {
    if(currentState===WIS.Core.Runtime?.state)currentState=WIS.Core.Runtime.getState();
    if(preparedStrength?.state===currentState&&preparedStrength.policy===WIS.Core.Runtime.getMathPolicy())return preparedStrength.strength;
    const registeredMultiplier = typeof WIS.Core.Effects?.product === "function"
      ? WIS.Core.Effects.product("googolPenalty", "strengthMultiplier", currentState)
      : ONE;
    return max(ZERO, mul(CONFIG.defaultStrength, registeredMultiplier));
  }

  let leftBoundary=null;
  function withGoogolPenaltyLeftLimit(resource,amount,callback){
    const previous=leftBoundary;leftBoundary={resource:resourceKey(resource),amount:WIS.Core.Amount?.isAmount(amount)?WIS.Core.Amount.from(amount):BN(amount)};
    try{return callback();}finally{leftBoundary=previous;}
  }

  // At this scale the integer part of log10(stock) can itself contain
  // thousands of digits. Retain the fraction needed to locate the next decade.
  // Newton from above gives floor(n^(1/10)) by integer arithmetic.
  function* tenthRoot(n) {
    let x = 1n << BigInt(Math.ceil(n.toString(2).length / 10));
    for (;;) {
      const next = (9n * x + n / x**9n) / 10n;
      if (next >= x) return x;
      x = next;
      yield;
    }
  }

  const towerCoordinates = new Map();
  function* towerDecade(magnitude, places) {
    const key = magnitude + '|' + places;
    if (towerCoordinates.has(key)) return towerCoordinates.get(key);
    const [orderText, decimals = ''] = String(magnitude).split('.');
    const order = BigInt(orderText), guard = 10n**BigInt(places);
    const unit = guard * 10n**order, weight = unit**9n;
    let lo = unit, hi = unit;
    // Read 0.d1...dn from right to left: each digit contributes a tenth root.
    for (const digit of [...decimals].reverse()) {
      const scale = weight * 10n**BigInt(digit);
      lo = yield* tenthRoot(lo * scale);
      const n = hi * scale, root = yield* tenthRoot(n);
      hi = root**10n === n ? root : root + 1n;
    }
    const base = lo / (10n * guard) * 10n;
    const result = {base, lo:lo-base*guard, hi:hi-base*guard};
    if (towerCoordinates.size >= 8) towerCoordinates.delete(towerCoordinates.keys().next().value);
    towerCoordinates.set(key,result);
    return result;
  }

  function* largeDecade(stock, projected, origin) {
    const A = WIS.Core.Amount, C = WIS.Core.CertifiedRankMath;
    const anchor = A.from(projected), relative = yield ()=>A.divide(stock,anchor);
    // An integral tower is an exact power of 10^10, even when its exponent
    // cannot be expanded into an Amount literal. Compare the whole remainder
    // against decimal factors of that anchor to retain both sides of a boundary.
    const symbolic = projected.layer > 2 || projected.mag >= 4096;
    if (symbolic && !Number.isInteger(projected.mag)) return null;
    const relativeLog = log10(A.project(relative)).toNumber();
    if (!Number.isSafeInteger(Math.floor(relativeLog))) return null;
    for (const places of [32,80,160,320,512]) {
      const c = C.context(places);
      const coordinate = symbolic ? {base:0n,lo:0n,hi:0n} : yield* towerDecade(projected.mag,places);
      const factor = coordinate.lo===0n && coordinate.hi===0n ? c.fraction(1n) : yield ()=>c.pow10({lo:coordinate.lo,hi:coordinate.hi});
      const lower = yield ()=>A.multiply(relative,factor.lo+'e-'+places);
      const upper = yield ()=>A.multiply(relative,factor.hi+'e-'+places);
      let offset = BigInt(Math.floor(relativeLog / 10))*10n;
      // The estimate omits the anchor's last decade. Certify both endpoints
      // against the full stock before accepting the bucket or its left limit.
      for (let attempt=0;attempt<4;attempt++) {
        const threshold='1e'+offset, next='1e'+(offset+10n);
        const lowSide=yield ()=>A.compare(lower,threshold);
        if(lowSide<0 && (yield ()=>A.compare(upper,threshold))<0){offset-=10n;continue;}
        if((yield ()=>A.compare(lower,next))>=0){offset+=10n;continue;}
        if(lowSide<0 || (yield ()=>A.compare(upper,next))>=0)break;
        const lowerExact=lowSide===0 && (yield ()=>A.compare(upper,threshold))===0;
        const exponent=coordinate.base+offset;
        if(symbolic)return {steps:div(log10(projected),10),atBoundary:lowerExact,
          next:yield ()=>A.multiply(anchor,next)};
        const count=(exponent-BigInt(origin))/10n;
        return {count:String(count),steps:BN(String(count)),atBoundary:lowerExact,
          nextExponent:exponent+10n};
      }
    }
    return null;
  }

  function googolDecade(stock,projected,origin) {
    const A=WIS.Core.Amount,C=WIS.Core.CertifiedRankMath;
    const wide = projected.layer>2 && projected.mag>0 || projected.layer===2 && projected.mag>=512;
    // Literal decimal exponents already encode their full integer part. Keep
    // using that exact coordinate, in particular for a computed boundary ±1.
    if (wide && A.wordView(stock).some(word=>!/^[-+]?\d/.test(word))) {
      const result=C.withWork(()=>C.task('googol-tower-decade|'+JSON.stringify(A.wordView(stock)),()=>largeDecade(stock,projected,origin)));
      if(result)return result;
    }
    const count=WIS.Core.AmountFormulas.logarithmBucket(stock,origin,10);
    const exponent=BigInt(origin)+10n*BigInt(count);
    return {count,steps:BN(count),atBoundary:leftBoundary!==null && A.compare(stock,'1e'+exponent)===0,
      nextExponent:exponent+10n};
  }

  function googolPenaltyDetails(resource, currentAmount, currentState = WIS.Core.Runtime?.getState?.()) {
    const key = resourceKey(resource);
    const baseQ = CONFIG.resources[key];
    const strength = getGoogolPenaltyStrength(currentState);
    if (!baseQ) {
      return Object.freeze({ resource: key, baseQ: ONE, excess: ZERO, strength, highScaleStrength: ONE, multiplier: ONE, active: false });
    }
    const A=WIS.Core.Amount,whole=A?.isAmount(currentAmount)?A.from(currentAmount):null;
    const amount = whole?A.project(whole):max(ZERO, BN(currentAmount));
    const aboveThreshold = whole?A.compare(whole,CONFIG.threshold)>0:gt(amount, CONFIG.threshold);
    const amountLog10 = aboveThreshold ? whole?WIS.Core.AmountFormulas.log10(whole):log10(amount) : thresholdLog10;
    const excess = aboveThreshold ? whole?WIS.Core.AmountFormulas.logRatio(whole,CONFIG.threshold):max(ZERO, sub(amountLog10, thresholdLog10)) : ZERO;
    const delayed=WIS.Meta.Infinity?.has(currentState,'B6')===true;
    let penaltySteps=delayed?div(excess,10).floor():excess;
    let penaltyCount=null;
    if(delayed&&whole){
      const origin=thresholdLog10.toNumber();
      const decade=googolDecade(whole,amount,origin);
      penaltyCount=decade.count;
      penaltySteps=decade.steps;
      if(leftBoundary?.resource===key && decade.atBoundary && A.compare(whole,leftBoundary.amount)===0 && gt(penaltySteps,0))
        penaltySteps=decade.count===undefined ? sub(penaltySteps,1) : BN(String(BigInt(decade.count)-1n));
    }else if(delayed && leftBoundary?.resource===key && (A?.isAmount(leftBoundary.amount)?A.compare(amount,leftBoundary.amount)===0:amount.eq(leftBoundary.amount)) &&
       div(excess,10).eq(penaltySteps))penaltySteps=max(ZERO,sub(penaltySteps,1));
    const evaluatedLog=delayed?add(thresholdLog10,mul(penaltySteps,10)):amountLog10;
    // B6 holds both the penalty count and high-scale strength until the next
    // full ten-order boundary. Other players retain the continuous formula.
    const highScaleStrength = aboveThreshold
      ? pow(CONFIG.highScaleBase, log10(div(evaluatedLog, thresholdLog10))) : ONE;
    const active = gt(penaltySteps, ZERO) && gt(strength, ZERO);
    const multiplier = active ? pow(baseQ, mul(mul(penaltySteps, strength), highScaleStrength)) : ONE;
    return Object.freeze({ resource: key, baseQ, excess, penaltySteps, ...(penaltyCount===null?{}:{penaltyCount}), strength, highScaleStrength, multiplier, active });
  }

  function nextGoogolPenaltyBoundary(resource,currentAmount,currentState) {
    if(!CONFIG.resources[resourceKey(resource)] || !WIS.Meta.Infinity?.has(currentState,'B6'))return null;
    const A=WIS.Core.Amount;
    if(A?.isAmount(currentAmount)){
      const amount=A.from(currentAmount);
      const decade=googolDecade(amount,A.project(amount),thresholdLog10.toNumber());
      return decade.next || A.from('1e'+decade.nextExponent);
    }
    const exponent=log10(max(CONFIG.threshold,currentAmount));
    const steps=div(max(ZERO,sub(exponent,thresholdLog10)),10).floor();
    const boundary=pow10(add(thresholdLog10,mul(add(steps,1),10)));
    return gt(boundary,currentAmount)?boundary:null;
  }

  function googolPenaltyMultiplier(resource, currentAmount, currentState) {
    return googolPenaltyDetails(resource, currentAmount, currentState).multiplier;
  }

  function applyGoogolPenalty(resource, currentAmount, automaticRate, currentState) {
    const A=WIS.Core.Amount;if(A?.isAmount(automaticRate)){
      const key=resourceKey(resource),rate=A.from(automaticRate),same=!A.isAmount(currentAmount)&&currentState&&WIS.Core.BigNum.eq(currentAmount,currentState[key]),stock=A.isAmount(currentAmount)?A.from(currentAmount):same?WIS.Simulation.ResourceGroups.readExact(currentState,key):A.from(currentAmount),factor=googolPenaltyMultiplier(resource,stock,currentState);
      return factor.eq(1)?rate:A.from(WIS.Core.AmountFormulas.productQuotient([rate,factor],[]));
    }
    return mul(max(ZERO, BN(automaticRate)), googolPenaltyMultiplier(resource, currentAmount, currentState));
  }

  WIS.Core.Penalties = Object.freeze({
    GOOGOL_PENALTY: "googolPenalty",
    withGoogolPenaltyLeftLimit,prepareImmutableScope,
    getGoogolPenaltyStrength,
    googolPenaltyDetails,
    nextGoogolPenaltyBoundary,
    googolPenaltyMultiplier,
    applyGoogolPenalty
  });
}(window.WIS));
