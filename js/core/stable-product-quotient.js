(function defineStableProductQuotient(WIS) {
  'use strict';
  const B=WIS.Core.BigNum;
  const fail=()=>{throw Object.assign(Error('资源乘除含非法因子，结算未提交'),{code:'RESOURCE_RATIO_INPUT'});};
  const read=(values,denominator)=>values.map(v=>{const n=B.parseFinite(v);if(!n||n.lt(0)||(denominator&&n.eq(0)))fail();return n;});
  function factors(numerators,denominators) {
    if(!Array.isArray(numerators)||!Array.isArray(denominators))fail();
    return {ns:read(numerators,false),ds:read(denominators,true)};
  }
  // This guards log10-coordinate resolution, not an allowed resource error.
  // |mag|*EPSILON bounds the floating spacing scale of a layer1 exponent;
  // when both sides are sensitive, cancel before small factors enter that sum.
  const logCoordinateGuard=1e-12;
  const sensitive=n=>n.layer>1 || n.layer===1&&Math.abs(n.mag)*Number.EPSILON>logCoordinateGuard;
  const needs=(ns,ds)=>ns.some(sensitive)&&ds.some(sensitive);
  function requiresNormalization(numerators,denominators) {const {ns,ds}=factors(numerators,denominators);return needs(ns,ds);}
  function evaluate(numeratorFactors,denominatorFactors) {
    const {ns,ds}=factors(numeratorFactors,denominatorFactors);
    if(ns.some(n=>n.eq(0)))return B.ZERO;
    let result;
    if(!needs(ns,ds)) {
      // Retain the represented ordinary expression and its multiplication order.
      result=B.div(ns.reduce((a,b)=>B.mul(a,b),B.ONE),ds.reduce((a,b)=>B.mul(a,b),B.ONE));
    } else {
      // Cancel the dominant represented factors before applying small boosts or
      // exposure. Multiplying first can erase those factors irreversibly.
      // Exact common factors include tiny values. Cancel them before pairing
      // so a small denominator cannot absorb a finite multiplier into its log.
      for(let i=ns.length-1;i>=0;i--){const j=ds.findIndex(d=>d.eq(ns[i]));if(j>=0){ns.splice(i,1);ds.splice(j,1);}}
      const sort=(a,b)=>B.log10(b).abs().cmp(B.log10(a).abs());ns.sort(sort);ds.sort(sort);
      const ratios=[];
      while(ns.length&&ds.length)ratios.push(B.div(ns.shift(),ds.shift()));
      result=ratios.concat(ns).reduce((a,b)=>B.mul(a,b),B.ONE);
      result=B.div(result,ds.reduce((a,b)=>B.mul(a,b),B.ONE));
    }
    if(!result.isFinite()||result.isNan()||result.lt(0))fail();
    return result;
  }
  WIS.Core.StableProductQuotient=Object.freeze({evaluate,requiresNormalization});
}(window.WIS));
