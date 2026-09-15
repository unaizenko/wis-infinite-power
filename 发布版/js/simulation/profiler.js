(function(W){
  'use strict';
  let enabled=false,scope='online',rows={},expressions={};
  function record(key,ms=0,count=1){if(!enabled)return;const id=scope+'.'+key;if(!rows[id]&&Object.keys(rows).length>=128)return;const r=rows[id]||(rows[id]={calls:0,wallMs:0,maxMs:0});r.calls+=count;r.wallMs+=ms;r.maxMs=Math.max(r.maxMs,ms);}
  function measure(key,fn){if(!enabled)return fn();const t=performance.now();try{return fn();}finally{record(key,performance.now()-t);}}
  function expression(id,operation,fn){
    if(!enabled)return fn();
    if(id.startsWith('daoTimeLaw:'))id='daoTimeLaw';
    if(id.startsWith('dynamicResource:'))id=id.split(':').slice(0,2).join(':');
    if(!expressions[id]&&Object.keys(expressions).length>=256)id='other';
    const counts=W.Core.BigNum.operationMetrics,start=counts.snapshot(),t=performance.now();
    try{return fn();}finally{const end=counts.snapshot(),row=expressions[id]||(expressions[id]={expressionId:id,operation,calls:0,wallMs:0,pow:0,log:0});row.calls++;row.wallMs+=performance.now()-t;row.pow+=end.pow-start.pow;row.log+=end.log-start.log;}
  }
  W.Simulation.Profiler=Object.freeze({expression,expressions:()=>JSON.parse(JSON.stringify(expressions)),enabled:()=>enabled,enable(v=true){enabled=v;W.Core.BigNum.operationMetrics.enable(v);},setScope(value){scope=value;},record,measure,
    withScope(value,fn){const old=scope;scope=value;try{return fn();}finally{scope=old;}},
    reset(){rows={};expressions={};W.Core.BigNum.operationMetrics.reset();},snapshot:()=>JSON.parse(JSON.stringify(rows))});
})(window.WIS);
