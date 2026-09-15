(function defineBigNumberAdapter(WIS, Decimal) {
  "use strict";

  if (typeof Decimal !== "function") throw new Error("break_eternity.js 未加载");

  const ZERO = Object.freeze(new Decimal(0));
  const ONE = Object.freeze(new Decimal(1));
  const TEN = Object.freeze(new Decimal(10));
  // Whole-expression hashing was slower than Decimal arithmetic in the high
  // layer benchmark. Keep primitive caching opt-in for diagnostics; production
  // shares the higher-level per-step Effects/Group memo instead.
  let microMemo=null,memoEnabled=false,memoMode='identity';
  const memoStatistics={steps:0,powCalls:0,powComputed:0,logCalls:0,logComputed:0,hits:0};
  const coordinateKey=n=>`${n.sign},${n.layer},${n.mag}`;
  function withMicroStepMemo(work){
    if(microMemo||!memoEnabled)return work();
    const memo={pow:new Map(),log:new Map(),powCalls:0,powComputed:0,logCalls:0,logComputed:0,hits:0};microMemo=memo;
    try{return work();}finally{microMemo=null;memoStatistics.steps++;for(const k of ['powCalls','powComputed','logCalls','logComputed','hits'])memoStatistics[k]+=memo[k];}
  }
  const microStepMemo=Object.freeze({create:()=>new Map(),run:withMicroStepMemo,enable(value=true){memoEnabled=value===true;},mode(value){if(!['identity','coordinate'].includes(value))throw Error('未知 memo 模式');memoMode=value;},reset(){for(const key of Object.keys(memoStatistics))memoStatistics[key]=0;},statistics:()=>({...memoStatistics})});

  function BN(value = 0) {
    if (value instanceof Decimal) return value;
    if (value === null || value === undefined || value === "") return new Decimal(0);
    try {
      const result = new Decimal(value);
      return result.isFinite() && !result.isNan() ? result : new Decimal(0);
    } catch {
      return new Decimal(0);
    }
  }

  // Strict opt-in boundary. Keep BN's legacy compatibility behavior unchanged.
  const numericAtom = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
  const numericText = new RegExp(`^[+-]?(?:${numericAtom}(?:e[+-]?${numericAtom})*|e+[+-]?${numericAtom}(?:e[+-]?${numericAtom})*|\\(e\\^[1-9]\\d*\\)[+-]?${numericAtom})$`, 'i');
  function isNumericText(value) {
    return typeof value === "string" && numericText.test(value.trim());
  }
  function parseFinite(value) {
    if (!(value instanceof Decimal) && typeof value !== "number" && !isNumericText(value)) return null;
    try {
      const result = value instanceof Decimal ? value : new Decimal(typeof value === "string" ? value.trim() : value);
      return result.isFinite() && !result.isNan() ? result : null;
    } catch { return null; }
  }

  // Scoped arithmetic backend for the offline coordinate kernel. Game formulas
  // still call this adapter. No cache, extrapolation or growth formula lives here.
  // Decimal boundaries/cancellation retain the vendor implementation.
  let coordinateDepth=0;
  const coordinateCounts={steps:0,conversions:0,pow:0,log:0,add:0,mul:0,div:0,nativeFallback:0};
  // Normalized component envelope of the bundled Decimal implementation.
  const componentLimit=9e15,componentLogLimit=Math.log10(componentLimit);
  const component=(sign,layer,mag)=>(sign===1||sign===-1)&&(
    layer===0?mag>=1/componentLimit&&mag<componentLimit:
    Number.isFinite(layer)&&Math.abs(mag)>=componentLogLimit&&Math.abs(mag)<componentLimit
  )?Decimal.fromComponents_noNormalize(sign,layer,mag):Decimal.fromComponents(sign,layer,mag);
  const finite=n=>Number.isFinite(n.layer)&&Number.isFinite(n.mag);
  function cLog(a){
    if(countOperations)coordinateCounts.log++;
    if(a.sign<=0||!finite(a))return a.log10();
    return a.layer>0?component(Math.sign(a.mag),a.layer-1,Math.abs(a.mag)):component(1,0,Math.log10(a.mag));
  }
  function cAdd(a,b){
    if(countOperations)coordinateCounts.add++;
    if(!finite(a)||!finite(b))return a.add(b);
    if(!a.sign)return b;if(!b.sign)return a;
    if(a.sign===-b.sign&&a.layer===b.layer&&a.mag===b.mag)return ZERO;
    if(a.layer>=2||b.layer>=2)return a.cmpabs(b)>=0?a:b;
    if(a.layer===0&&b.layer===0)return new Decimal(a.sign*a.mag+b.sign*b.mag);
    return a.add(b);
  }
  function cMul(a,b){
    if(countOperations)coordinateCounts.mul++;
    if(!finite(a)||!finite(b))return a.mul(b);
    if(!a.sign||!b.sign)return ZERO;
    const sign=a.sign*b.sign;
    if(a.layer===b.layer&&a.mag===-b.mag)return sign>0?ONE:component(-1,0,1);
    if(a.layer<b.layer||a.layer===b.layer&&Math.abs(a.mag)<Math.abs(b.mag)){const t=a;a=b;b=t;}
    if(a.layer===0)return new Decimal(sign*a.mag*b.mag);
    if(a.layer>=3||a.layer-b.layer>=2)return component(sign,a.layer,a.mag);
    if(a.layer===1)return component(sign,1,a.mag+(b.layer===0?Math.log10(b.mag):b.mag));
    const log=cAdd(component(Math.sign(a.mag),a.layer-1,Math.abs(a.mag)),component(Math.sign(b.mag),b.layer-1,Math.abs(b.mag)));
    return component(sign,log.layer+1,log.sign*log.mag);
  }
  function cExp(a){
    if(!finite(a))return a.pow10();
    if(a.layer===0){
      const v=Math.pow(10,a.sign*a.mag);
      if(Number.isFinite(v)&&Math.abs(v)>=.1)return component(1,0,v);
      if(!a.sign)return ONE;
      a=Decimal.fromComponents_noNormalize(a.sign,1,Math.log10(a.mag));
    }
    if(a.mag<0)return ONE;
    return component(1,a.layer+1,a.sign*a.mag);
  }
  function cPow(a,b){
    if(countOperations)coordinateCounts.pow++;
    if(a.sign<=0||!finite(a)||!finite(b)){if(countOperations)coordinateCounts.nativeFallback++;return a.pow(b);}
    if(a.layer===0&&a.mag===1)return ONE;
    if(!b.sign)return ONE;
    if(b.sign===1&&b.layer===0&&b.mag===1)return a;
    // log10(a) * b followed by 10^x, in component coordinates. These
    // branches elide intermediate Decimals, not an exponent or transform.
    if(a.layer>=2&&a.mag>0&&b.layer===0){
      const mag=a.layer===2?a.mag+Math.log10(b.mag):a.mag;
      if(mag>=componentLogLimit)return component(1,a.layer,b.sign*mag);
    }
    if(a.layer===0&&b.layer>=1&&b.mag>0){
      const logarithm=Math.log10(a.mag),mag=b.layer===1?b.mag+Math.log10(Math.abs(logarithm)):b.mag;
      if(mag>=componentLogLimit)return component(1,b.layer+1,Math.sign(logarithm)*b.sign*mag);
    }
    return cExp(cMul(cLog(a),b));
  }
  function cDiv(a,b){
    if(countOperations)coordinateCounts.div++;
    if(!b.sign||!finite(a)||!finite(b))return a.div(b);
    return cMul(a,b.layer===0?component(b.sign,0,1/b.mag):Decimal.fromComponents_noNormalize(b.sign,b.layer,-b.mag));
  }
  const coordinateArithmetic=Object.freeze({
    run(work){coordinateDepth++;if(countOperations)coordinateCounts.steps++;try{return work();}finally{coordinateDepth--; }},
    active:()=>coordinateDepth>0,
    capture(value){if(countOperations)coordinateCounts.conversions++;const n=BN(value);return {sign:n.sign,layer:n.layer,coordinate:n.mag};},
    reset(){for(const k of Object.keys(coordinateCounts))coordinateCounts[k]=0;},statistics:()=>({...coordinateCounts})
  });

  function isDecimal(value) { return value instanceof Decimal; }
  function add(a, b) { return coordinateDepth?cAdd(BN(a),BN(b)):BN(a).add(b); }
  function sub(a, b) { return coordinateDepth?cAdd(BN(a),BN(b).neg()):BN(a).sub(b); }
  function mul(a, b) { return coordinateDepth?cMul(BN(a),BN(b)):BN(a).mul(b); }
  function div(a, b) { return coordinateDepth?cDiv(BN(a),BN(b)):BN(a).div(b); }
  let countOperations=false;const operationCounts={pow:0,log:0};
  const operationMetrics=Object.freeze({enable(v=true){countOperations=v;},reset(){operationCounts.pow=operationCounts.log=0;},snapshot:()=>({...operationCounts})});
  function pow(a, b) {
    if(countOperations)operationCounts.pow++;
    if(coordinateDepth)return cPow(BN(a),BN(b));
    if(!microMemo)return BN(a).pow(b);
    if(memoMode==='identity'){
      microMemo.powCalls++;let bucket=microMemo.pow.get(a);
      if(bucket?.has(b)){microMemo.hits++;return bucket.get(b);}
      if(!bucket){bucket=new Map();microMemo.pow.set(a,bucket);}
      const result=BN(a).pow(b);microMemo.powComputed++;bucket.set(b,result);return result;
    }
    const base=BN(a),exponent=BN(b),key=coordinateKey(base)+'^'+coordinateKey(exponent);microMemo.powCalls++;
    if(microMemo.pow.has(key)){microMemo.hits++;return microMemo.pow.get(key);}
    const value=base.pow(exponent);microMemo.powComputed++;microMemo.pow.set(key,value);return value;
  }
  function pow10(exponent) { if(countOperations)operationCounts.pow++;return coordinateDepth?cPow(TEN,BN(exponent)):TEN.pow(exponent); }
  function sqrt(value) {
    const decimal = BN(value);
    if (lt(decimal, ZERO)) return new Decimal(Number.NaN);
    if (eq(decimal, ZERO)) return new Decimal(0);

    // break_eternity's native sqrt() returns NaN for sufficiently small,
    // positive layer-1 values (for example 1e-100).  Computing the square
    // root in logarithmic space keeps the full Decimal range intact.
    return pow10(div(log10(decimal), 2));
  }
  function log10(value) {
    if(countOperations)operationCounts.log++;
    if(coordinateDepth)return cLog(BN(value));
    if(!microMemo)return BN(value).log10();
    const n=BN(value),key=memoMode==='identity'?value:coordinateKey(n);microMemo.logCalls++;
    if(microMemo.log.has(key)){microMemo.hits++;return microMemo.log.get(key);}
    const result=n.log10();microMemo.logComputed++;microMemo.log.set(key,result);return result;
  }
  function max(a, b) { return BN(a).max(b); }
  function min(a, b) { return BN(a).min(b); }
  function abs(value) { return BN(value).abs(); }
  function gt(a, b) { return BN(a).gt(b); }
  function gte(a, b) { return BN(a).gte(b); }
  function lt(a, b) { return BN(a).lt(b); }
  function lte(a, b) { return BN(a).lte(b); }
  function eq(a, b) { return BN(a).eq(b); }
  function isFiniteBN(value) {
    try {
      const result = value instanceof Decimal ? value : new Decimal(value);
      return result.isFinite() && !result.isNan();
    } catch {
      return false;
    }
  }
  function isNaNBN(value) {
    if (value instanceof Decimal) return value.isNan();
    try { return new Decimal(value).isNan(); } catch { return true; }
  }
  function clamp(value, lower = ZERO, upper = null) {
    const bounded = max(value, lower);
    return upper === null || upper === undefined ? bounded : min(bounded, upper);
  }
  function clampMin(value, lower = ZERO) { return max(value, lower); }
  function clampMax(value, upper = ONE) { return min(value, upper); }
  function sum(values, initial = ZERO) { return values.reduce((total, value) => add(total, value), BN(initial)); }
  function product(values, initial = ONE) { return values.reduce((total, value) => mul(total, value), BN(initial)); }
  function toNumber(value, fallback = 0) {
    const result = BN(value).toNumber();
    return Number.isFinite(result) ? result : fallback;
  }
  function toString(value) { return BN(value).toString(); }
  function serialize(value) { return BN(value).toString(); }

  WIS.Core.BigNum = Object.freeze({
    Decimal, ZERO, ONE, TEN, microStepMemo, operationMetrics, coordinateArithmetic,
    BN, isDecimal, add, sub, mul, div, pow, pow10, sqrt, log10,
    max, min, abs, gt, gte, lt, lte, eq,
    isFiniteBN, isNaNBN, parseFinite, isNumericText, clamp, clampMin, clampMax, sum, product,
    toNumber, toString, serialize
  });
}(window.WIS, window.Decimal));
