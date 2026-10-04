(function defineWorkerProtocol(WIS) {
  'use strict';
  // Transfer normalized Decimal components, never its structured-cloned plain
  // object or a rounded display string. Ordinary JSON saves remain compatible.
  function pack(value) {
    if(WIS.Core.BigNum.isDecimal(value)) {
      if(!value.isFinite()||value.isNan())throw Error('Worker Decimal 非有限');
      return {$wisDecimal:[value.sign,value.layer,value.mag]};
    }
    if(Array.isArray(value))return value.map(pack);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pack(v)]));
    if(typeof value==='number'&&!Number.isFinite(value))throw Error('Worker 数值非有限');
    return value;
  }
  function unpack(value) {
    if(Array.isArray(value))return value.map(unpack);
    if(value&&typeof value==='object') {
      if(Object.hasOwn(value,'$wisDecimal')) {
        const c=value.$wisDecimal;
        if(Object.keys(value).length!==1||!Array.isArray(c)||c.length!==3||
          ![-1,0,1].includes(c[0])||!Number.isInteger(c[1])||c[1]<0||!c.every(Number.isFinite))throw Error('Worker Decimal 编码无效');
        const n=Decimal.fromComponents_noNormalize(...c);
        if(!n.isFinite()||n.isNan())throw Error('Worker Decimal 无效');
        return n;
      }
      return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,unpack(v)]));
    }
    return value;
  }
  WIS.Simulation.WorkerProtocol=Object.freeze({version:1,encode:value=>JSON.stringify(pack(value)),decode:text=>unpack(JSON.parse(text))});
}(window.WIS));
