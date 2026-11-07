(function defineLegacyStrongFeedbackCheckpoint(W) {
  'use strict';
  // Read-only historical format compatibility. No planner, rate query or
  // executor is retained; validating old data never grants execution authority.
  const B=W.Core.BigNum;
  const keys=Object.freeze(['nieForce','universeCoefficient']);
  const observableKeys=Object.freeze(['joules','lifetimeTotalJ','currentRebirthTotalJ','nieForce.total','universeCoefficient.total']);
  function validateRows(rows,expected){
    if(!rows||Object.keys(rows).length!==expected.length)throw Error('强反馈证书 enclosure 无效');
    const out={};for(const key of expected){const row=rows[key];
      if(!row||Object.keys(row).length!==3||Object.keys(row).some(v=>!['lower','upper','reference'].includes(v)))throw Error('强反馈证书 bounds 无效');
      const parsed={};for(const field of ['lower','upper','reference']){
        if(typeof row[field]!=='string'||row[field].length>256)throw Error('强反馈证书资源格式无效');
        const n=B.parseFinite(row[field]);if(!n||B.lt(n,0)||n.layer!==0)throw Error('强反馈证书资源范围无效');parsed[field]=n;
      }
      if(B.gt(parsed.lower,parsed.reference)||B.gt(parsed.reference,parsed.upper))throw Error('强反馈证书顺序无效');out[key]={...row};
    }return out;
  }
  function validateCheckpoint(value){if(value==null)return null;if(value.version!==1)throw Error('强反馈证书版本无效');return {version:1,bounds:validateRows(value.bounds,keys),observables:validateRows(value.observables,observableKeys)};}
  W.Simulation.LegacyStrongFeedback=Object.freeze({validateCheckpoint});
})(window.WIS);
