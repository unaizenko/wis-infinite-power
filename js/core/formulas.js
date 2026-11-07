(function defineFormulaEngine(WIS) {
  "use strict";

  const {
    BN, ZERO, ONE, isDecimal, add, sub, mul, div, pow, sqrt, log10,
    max, gt, lt, lte, isFiniteBN, isNaNBN, sum, product
  } = WIS.Core.BigNum;

  const operationTypes=Object.freeze(['additive','multiplicative','exponent','softcap','threshold','branch','denominator']);
  function descriptor(row,{kind='effect',refresh=null,provider=null}={}) {
    const dynamicResources=[...(row.dynamicResources||[])];
    const operationType=row.operationType||(kind==='source'||/additive/i.test(row.layer)?'additive':/exponent/i.test(row.layer)?'exponent':/softcap/i.test(row.layer)?'softcap':/cap|limit|threshold/i.test(row.layer)?'threshold':'multiplicative');
    if(!row.id||!row.target||!operationTypes.includes(operationType))throw Error('公式 metadata 无效');
    const requiresProviderRefresh=dynamicResources.length>0&&typeof row.valueAt!=='function'&&typeof row.value!=='function';
    const valueAt=row.valueAt||(typeof row.value==='function'?row.value:requiresProviderRefresh&&refresh?refresh:()=>row.value);
    // Effects can prefix provider metadata in this one fresh descriptor. The
    // row retains its original override/key-order semantics; values stay per-snapshot.
    return provider===null ? {...row,dynamicResources,operationType,valueAt,requiresProviderRefresh}
      : {provider,...row,dynamicResources,operationType,valueAt,requiresProviderRefresh};
  }

  function effectValue(effect) {
    const rawValue = !isDecimal(effect) && typeof effect === "object" && effect !== null
      ? effect.value
      : effect;
    const supportedType = isDecimal(rawValue) || typeof rawValue === "number" ||
      (typeof rawValue === "string" && rawValue.trim() !== "");
    if (!supportedType || !isFiniteBN(rawValue) || isNaNBN(rawValue)) return ONE;
    const value = BN(rawValue);
    return lt(value, ZERO) ? ONE : value;
  }

  function multiply(effects = []) {
    return product(effects.map(effectValue), ONE);
  }

  function applyExponent(value, exponent) {
    if (lte(value, ZERO)) return ZERO;
    const supportedType = isDecimal(exponent) || typeof exponent === "number" ||
      (typeof exponent === "string" && exponent.trim() !== "");
    if (!supportedType || !isFiniteBN(exponent) || isNaNBN(exponent)) return BN(value);
    const decimalExponent = BN(exponent);
    return lt(decimalExponent, ZERO) ? BN(value) : pow(value, decimalExponent);
  }

  function applySoftcaps(value, softcaps = []) {
    return softcaps.reduce((current, softcap) => softcap(current), value);
  }

  function smoothPowerSoftcap(value, scale, earlyExponent, lateExponent, sharpness) {
    if(WIS.Core.Amount?.isAmount(value))return quantitySmoothPowerSoftcap(value,scale,earlyExponent,lateExponent,sharpness);
    const decimalValue = BN(value);
    const decimalScale = BN(scale);
    const numericEarlyExponent = Number(earlyExponent);
    const numericLateExponent = Number(lateExponent);
    const numericSharpness = Number(sharpness);
    if (isNaNBN(decimalValue) || lte(decimalValue, ZERO)) return ZERO;
    if (!isFiniteBN(decimalScale) || lte(decimalScale, ZERO) ||
        !Number.isFinite(numericEarlyExponent) || numericEarlyExponent < 0 ||
        !Number.isFinite(numericLateExponent) || numericLateExponent < 0 ||
        !Number.isFinite(numericSharpness) || numericSharpness <= 0) return ZERO;

    // At huge exponents the two powers can round to the same layer/magnitude;
    // dividing them then returns 1. Factor (x/scale)^k out of the denominator:
    // x^early / (1+(x/scale)^k)^((early-late)/k)
    // = x^late * scale^(early-late) * (1+(scale/x)^k)^(-(early-late)/k).
    // The reciprocal correction is <= 1 for x >= scale. No exponent or
    // precision policy changes; ordinary values retain their exact old path.
    if ((decimalValue.layer >= 2 || (decimalValue.layer === 1 && decimalValue.mag >= 1e12)) &&
        gt(decimalValue, decimalScale)) {
      const difference = numericEarlyExponent - numericLateExponent;
      const correction = pow(add(ONE, pow(div(decimalScale, decimalValue), numericSharpness)), -difference / numericSharpness);
      return mul(mul(pow(decimalValue, numericLateExponent), pow(decimalScale, difference)), correction);
    }
    const transition = add(ONE, pow(div(decimalValue, decimalScale), numericSharpness));
    return div(
      pow(decimalValue, numericEarlyExponent),
      pow(transition, (numericEarlyExponent - numericLateExponent) / numericSharpness)
    );
  }

  function diminishingMultiplierExponent(multiplier, coefficient) {
    if(WIS.Core.Amount?.isAmount(multiplier)){
      const A=WIS.Core.Amount,value=A.from(multiplier);if(A.compare(value,1)<=0||!isFiniteBN(coefficient)||lte(coefficient,0))return ONE;
      return div(1,sqrt(add(1,mul(coefficient,WIS.Core.AmountFormulas.logOnePlusRatio(value)))));
    }
    const decimalMultiplier = BN(multiplier);
    const decimalCoefficient = BN(coefficient);
    if (isNaNBN(decimalMultiplier) || lte(decimalMultiplier, ONE)) return ONE;
    if (!isFiniteBN(coefficient) || isNaNBN(decimalCoefficient) || lte(decimalCoefficient, ZERO)) return ONE;
    return div(ONE, sqrt(add(ONE, mul(decimalCoefficient, log10(add(ONE, decimalMultiplier))))));
  }

  function applyDiminishingMultiplier(multiplier, coefficient) {
    if(WIS.Core.Amount?.isAmount(multiplier)){
      const A=WIS.Core.Amount,value=A.from(multiplier);if(A.compare(value,1)<=0)return ONE;
      return add(1,WIS.Core.AmountFormulas.power(A.subtract(value,1),diminishingMultiplierExponent(value,coefficient)));
    }
    const decimalMultiplier = BN(multiplier);
    if (isNaNBN(decimalMultiplier) || lte(decimalMultiplier, ONE)) return ONE;
    return add(ONE, pow(
      sub(decimalMultiplier, ONE),
      diminishingMultiplierExponent(decimalMultiplier, coefficient)
    ));
  }

  function source({ base = 0, additive = 0, multipliers = [], exponents = [], softcaps = [] } = {}) {
    const multiplied = mul(max(ZERO, add(base, additive)), multiply(multipliers));
    return applySoftcaps(applyExponent(multiplied, multiply(exponents)), softcaps);
  }

  function region(sourceGains, { multipliers = [], exponents = [], softcaps = [] } = {}) {
    const sourceSum = sum(sourceGains.map((value) => max(ZERO, value)), ZERO);
    const multiplied = mul(sourceSum, multiply(multipliers));
    return applySoftcaps(applyExponent(multiplied, multiply(exponents)), softcaps);
  }

  function quantityModel(){if(!WIS.Core.Amount?.enabled())throw Object.assign(Error('Exact formula model disabled'),{code:'amount-model-disabled'});return WIS.Core.Amount;}
  function quantityFactor(raw){const A=quantityModel();if(A.isAmount(raw))return A.from(raw);const value=raw&&typeof raw==='object'&&!isDecimal(raw)?raw.value:raw,n=WIS.Core.BigNum.parseFinite(value);if(!n||n.lt(0))throw Object.assign(Error('Quantity formula factor invalid'),{code:'formula-representation'});return A.from(value);}
  function quantitySum(values,clampEach){const A=quantityModel(),L=WIS.Core.AmountLedger,words=[];for(const raw of values){if(A.isAmount(raw)){words.push(...A.words(raw));continue;}const n=WIS.Core.BigNum.parseFinite(raw);if(!n)throw Object.assign(Error('Quantity formula addend invalid'),{code:'formula-representation'});if(clampEach&&n.lt(0))continue;L.validate(String(raw));words.push(String(raw));}return L.sign(words)<=0?A.from(0):A.fromParts(0,words);}
  function* quantityStageSteps(value,{multipliers=[],exponents=[],softcaps=[]}={}){
    const A=quantityModel(),factors=[];let exponent=ONE;
    for(const raw of multipliers)factors.push(yield ()=>quantityFactor(raw));
    for(const raw of exponents){const q=yield ()=>quantityFactor(raw);
      if(q.tail.length)throw Object.assign(Error('Quantity exponent requires an explicit rational adapter'),{code:'amount-formula-unresolved'});
      exponent=yield ()=>mul(exponent,A.project(q));
    }
    const separated=yield ()=>!exponent.eq(1)&&factors.length&&WIS.Core.AmountProducts.separatedPositiveProduct([value,...factors].map(A.words));
    if(separated)value=yield ()=>A.from(WIS.Core.AmountFormulas.productPower([value,...factors],exponent));
    else{
      for(const factor of factors)value=yield ()=>A.multiply(value,factor);
      const powered=yield ()=>!exponent.eq(1)&&A.compare(value,0)>0;
      if(powered)value=yield ()=>A.from(WIS.Core.AmountFormulas.power(value,exponent));
    }
    for(const cap of softcaps){
      if(typeof cap!=='function')throw Object.assign(Error('Quantity softcap must accept the complete value'),{code:'formula-representation'});
      const capped=yield ()=>cap(value);value=yield ()=>A.from(capped);
    }
    return value;
  }
  function* sourceQuantitySteps({base=0,additive=0,...stages}={}){
    const value=yield ()=>quantitySum([base,additive],false);return yield* quantityStageSteps(value,stages);
  }
  function* regionQuantitySteps(values,stages={}){
    const value=yield ()=>quantitySum(values,true);return yield* quantityStageSteps(value,stages);
  }
  function drainQuantitySteps(iterator){let next=iterator.next();while(!next.done)next=iterator.next(next.value());return next.value;}
  function sourceQuantity(options={}){return drainQuantitySteps(sourceQuantitySteps(options));}
  function regionQuantity(values,stages={}){return drainQuantitySteps(regionQuantitySteps(values,stages));}
  function quantitySmoothPowerSoftcap(value,scale,early,late,sharpness){const A=quantityModel(),F=WIS.Core.AmountFormulas;value=A.from(value);
    if(A.words(value).length<=1&&!value.tail.length)return smoothPowerSoftcap(A.project(value),scale,early,late,sharpness);
    early=Number(early);late=Number(late);sharpness=Number(sharpness);if(!isFiniteBN(scale)||lte(scale,0)||![early,late,sharpness].every(Number.isFinite)||early<0||late<0||sharpness<=0)throw Object.assign(Error('Smooth quantity curve input invalid'),{code:'formula-representation'});
    if(A.compare(value,0)===0)return ZERO;const difference=early-late,above=A.compare(value,scale)>=0,ratio=above?F.powerRatio(scale,value,sharpness):F.powerRatio(value,scale,sharpness),transition=A.add(1,ratio),p=difference/sharpness;
    const correction=p>=0?F.powerRatio(1,transition,p):F.power(transition,-p),first=F.power(value,above?late:early);
    return F.productQuotient(above?[first,pow(scale,difference),correction]:[first,correction]);
  }
  function quantityPowerSoftcap(value,threshold,exponent){const A=quantityModel(),t=quantityFactor(threshold);value=A.from(value);if(A.compare(t,0)<=0)throw Object.assign(Error('Quantity softcap threshold invalid'),{code:'formula-representation'});if(A.compare(value,t)<=0)return value;return A.multiply(t,A.from(WIS.Core.AmountFormulas.powerRatio(value,t,exponent)));}

  WIS.Core.Formulas = Object.freeze({ sourceQuantity,regionQuantity,sourceQuantitySteps,regionQuantitySteps,quantityPowerSoftcap,quantitySmoothPowerSoftcap,
    descriptor, operationTypes, effectValue, multiply, applyExponent, applySoftcaps,
    smoothPowerSoftcap, diminishingMultiplierExponent, applyDiminishingMultiplier,
    source, region
  });
}(window.WIS));
