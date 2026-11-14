// Current treasure batching and exact-input caches; old settlement solvers are retired.
(function(WIS){
'use strict';
const modules={"percent/bulk-progress.js":function(require,module,exports,global){
"use strict";
// Node prototype only. The ordinary production settlement is still the fallback.
// Approximate closure is explicit: an unresolvable high batch consumes its source
// once, posts the inverse estimate to stock, and records an UNRESOLVED remainder
// interval, not an exact zero. Exact additive low words are not rounded away.
const assert=require('node:assert/strict');
function create(){
  const B=WIS.Core.BigNum,{BN,ZERO,ONE}=B,L=WIS.Meta.TreasureLedger,T=WIS.Meta.Treasures,P=WIS.Meta.TreasureProgress;
  const constants=new Map(),inverses=new Map();
  const amountModel=()=>WIS.Core.Amount?.enabled()===true;
  const inventory=stock=>amountModel()?WIS.Core.Amount.fromParts(0,stock):L.value(stock).floor();
  const plus=(n,delta)=>amountModel()?WIS.Core.Amount.add(n,delta):n.add(delta);
  const display=n=>String(WIS.Core.Amount?.isAmount(n)?WIS.Core.Amount.project(n):n);
  const inventoryKey=n=>WIS.Core.Amount?.isAmount(n)?JSON.stringify(WIS.Core.Amount.serialize(n)):String(n);
  const logDemand=(c,n)=>WIS.Core.Amount?.isAmount(n)?WIS.Core.AmountFormulas.productQuotient([c.k,n],[]):c.k.mul(n);
  const capBatch=(cap,n,a)=>{if(!amountModel())return B.max(0,cap.sub(n).div(a).floor().add(1));const A=WIS.Core.Amount;if(A.compare(cap,n)<0)return A.from(0);return A.add(A.integerPart(A.divide(A.subtract(cap,n),a)),1);};

  const count=k=>global.__jointRevision?.count(k);
  const timed=(k,f)=>global.__jointRevision?global.__jointRevision.timed(k,f,null,[]):f();
  function context(key,a,state){const r=P.ruleFor(state,key),id=key+'|'+String(a)+'|'+(r===P.rules[key]?0:1);if(constants.has(id))return constants.get(id);
    const k=BN(1).div(r.q).ln(),step=k.mul(a),den=step.exp().sub(1);
    const value={r,k,a:BN(a),step,logDen:den.ln(),logBase:BN(r.base).ln()};constants.set(id,value);return value;}
  function inverse(key,n,p,a,state=null){count('bulk.inverseRequests');if(!(amountModel()?WIS.Core.Amount.compare(p,0)>0:BN(p).gt(0))){count('bulk.zeroProgress');return ZERO;}
    const id=[key,inventoryKey(n),inventoryKey(p),String(a),P.ruleFor(state,key)===P.rules[key]?0:1].join('|');
    if(inverses.has(id)){count('bulk.inverseReused');return inverses.get(id);}
    const result=timed('bulk.inverse',()=>{
      // Use the ordinary power-law inverse; only high-count boundary handling
      // differs. A power demand must never pass through geometric q.
      if(amountModel()||P.rules[key].type==='power')return P.affordableEstimate(key,n,p,a,state);
      const c=context(key,a,state),logD=logDemand(c,n).add(c.logBase),logP=BN(p).ln();
      return WIS.Core.FiniteProgress.geometric.inverse(logD,logP,c.step,c.logDen);});
    if(inverses.size>=4096)inverses.delete(inverses.keys().next().value);inverses.set(id,result);return result;
  }
  function logCost(key,n,m,a,state=null){
    if(P.rules[key].type==='power')return P.cumulative(key,n,m,a,state).ln();
    const c=context(key,a,state),z=c.step.mul(m);
    return c.logBase.add(logDemand(c,n)).add(z.gt(40)?z.add(ONE.sub(z.neg().exp()).ln()):z.exp().sub(1).ln()).sub(c.logDen);}
  function capLevel(key,g,a,state){
    const r=P.ruleFor(state,key);
    if(r.type==='power')return BN(g).div(r.base).pow(1/r.exponent).sub(1).mul(r.scale);
    const c=context(key,a,state);return BN(g).ln().sub(c.logBase).div(c.k);
  }
  const batchCode=key=>P.rules[key].type==='power'?'high-power-batch':'high-geometric-batch';
  function unresolvable(m){return WIS.Core.FiniteProgress.geometric.unresolvable(m);}
  function uncertainBounds(m){const {nextUp,nextDown}=require('../precision-analysis');let lo=m.mag,hi=m.mag;
    // Representation sensitivity, not a rigorous bound on the whole game chain.
    for(let i=0;i<16;i++){lo=nextDown(lo);hi=nextUp(hi);}
    return {lo:m.constructor.fromComponents(1,m.layer,lo).floor(),hi:m.constructor.fromComponents(1,m.layer,hi).ceil()};}
  function record(state,key,receipt){
    const old=state.meta.treasureProgressStatus[key]?.approximation||{},seq=(old.transactions||0)+1;
    const approximation={version:1,transactions:seq,
      closedProgress:String(B.add(old.closedProgress||0,receipt.closedProgress||0)),
      awardedStock:String(B.add(old.awardedStock||0,receipt.reward||0)),
      stockRoundingSensitivity:String(B.add(old.stockRoundingSensitivity||0,receipt.roundingStock||0)),
      unresolvedRemainderUpper:String(B.add(old.unresolvedRemainderUpper||0,receipt.remainderUpper||0)),
      boundScope:'16-coordinate-ulp representation sensitivity only; NOT a certified mathematical reward/remainder bound',
      policy:'close-high-inverse-once; known low words retained; unknown phase projected to lower bound 0, NOT exact zero',last:P.receipt(receipt)};
    state.meta.treasureProgressStatus[key]={state:'approximate',code:batchCode(key),
      message:'高数量近似奖励已入库；不可分辨余量以区间记录，非精确归零；误差预算不是待发奖励',approximation};
  }
  // Coalesce only adjacent sources with identical saved gain/award. Exact
  // normalization stays bounded at MAX_TERMS; distinct contexts keep their order.
  // This avoids thousands of inverse/settlement calls for a blocked old queue.
  
  function* sourcePotential(s,key,units,gain,fixedAward){const a=BN(fixedAward??T.getTreasureAwardMultiplier(s,key)),n=inventory(L.stock(s,key));
    const p=amountModel()?WIS.Core.Amount.fromParts(0,L.progress(s,key)):L.value(L.progress(s,key));
    const entries=[...(s.meta.treasureProgressPending[key]||[])];
    if((amountModel()?WIS.Core.Amount.compare(units,0)>0:BN(units).gt(0))&&BN(gain).gt(0))entries.push({units:amountModel()?WIS.Core.Amount.words(units):[units],gain,award:a});
    if(unresolvable(inverse(key,n,p,L.project(entries[0]?.award??a),s)))return true;
    for(const e of entries){const u=L.value(e.units),g=L.project(e.gain),award=L.project(e.award??a),d=P.requirement(key,n,s);
      if(g.gte(d)){
        const capN=capLevel(key,g,award,s),capM=amountModel()?WIS.Core.Amount.project(capBatch(capN,n,award)):capN.sub(n).div(award).floor().add(1);
        if(unresolvable(B.min(u,capM)))return true;
      }
      if(unresolvable(inverse(key,n,amountModel()?WIS.Core.Amount.add(p,WIS.Core.Amount.multiply(WIS.Core.Amount.fromParts(0,e.units),g)):p.add(u.mul(g)),award,s)))return true;
      yield {phase:'decision'};
    }return false;
  }
  function* steps(s,key,units,gain,original,fixedAward){
    const oldStatus=s.meta.treasureProgressStatus[key];
    if(!(yield* sourcePotential(s,key,units,gain,fixedAward))){
      const value=original(),result=value?.next?yield* value:value;
      if(oldStatus?.approximation&&!s.meta.treasureProgressStatus[key]?.approximation)
        s.meta.treasureProgressStatus[key]={...(s.meta.treasureProgressStatus[key]||oldStatus),approximation:oldStatus.approximation};
      count('bulk.ordinary');return result;
    }
    {
      L.transaction(s,()=>{});
      count('bulk.high');let stock=L.stock(s,key),p=L.progress(s,key),rewards=[];
      const currentAward=BN(fixedAward??T.getTreasureAwardMultiplier(s,key));
      let pending=s.meta.treasureProgressPending[key]||[];
      if((amountModel()?WIS.Core.Amount.compare(units,0)>0:BN(units).gt(0))&&BN(gain).gt(0))pending=P.Pending.append(pending,units,gain,currentAward);
      pending=yield* P.Pending.compactSteps(pending,currentAward);
      let a=L.project(pending[0]?.award??currentAward);
      // A successful replay replaces the old transient blockage, while earlier
      // approximation receipts remain attached to the same ledger.
      if(oldStatus?.state==='blocked')s.meta.treasureProgressStatus[key]=oldStatus.approximation
        ? {...oldStatus,state:'approximate',code:batchCode(key)} : null;
      const grant=m=>{const delta=L.scale([m],a);stock=L.add(stock,delta);rewards=L.add(rewards,delta);};
      function* settle(){
        if(L.sign(p)<=0)return;const n=inventory(stock),pv=amountModel()?WIS.Core.Amount.fromParts(0,p):L.value(p),m=inverse(key,n,pv,a,s);
        if(!m.gt(0))return;yield {phase:'inverse',key};
        if(!unresolvable(m)){
          let batches;
          try {batches=P.affordable(key,n,pv,a,s);}catch(error){
            if(!['batch-cost','batch-resolution'].includes(error.code))throw error;
            // A represented high cap can be posted while its SMALL subsequent
            // reward boundary remains unresolved. Keep all that tail progress;
            // never undo the confirmed cap or claim this tail was spent.
            const old=s.meta.treasureProgressStatus[key]||{};
            s.meta.treasureProgressStatus[key]={...old,tailBoundary:{code:error.code,
              stock:P.ledgerSummary(stock),progress:P.ledgerSummary(p),message:'Unconfirmed post-cap tail remains spendable progress; no reward posted for this tail'}};
            count('bulk.retainedTailBoundary');return;
          }
          const cost=amountModel()?WIS.Core.Amount.words(P.cumulativeQuantity(key,n,batches,a,s)):[P.cumulative(key,n,batches,a,s)];
          if(L.compare(p,cost)<0)return;p=L.subtract(p,cost);grant(batches);return;
        }
        // Close only the dominant positive high-layer component. All other
        // exact words, including tiny progress, remain in the ordinary ledger.
        p=[...WIS.Core.SignedLedger.expand(p)];yield {phase:'expand',key};
        const index=p.findIndex(t=>L.project(t).gt(0)&&L.project(t).eq(WIS.Core.Amount?.isAmount(pv)?WIS.Core.Amount.project(pv):pv));
        assert(index>=0,'HARD: high batch cannot isolate a positive dominant source');
        // A prior cap debit may be a separate negative word. It belongs to the
        // consumed net source, NOT to a negative "remaining balance" and NOT to
        // another pending reward. Keep it in the signed closure receipt.
        // Older blocked queues contain many opaque high-layer source words.
        // Consume that NET high component as one approximate batch; leaving
        // 127 already-accounted opaque words here would re-create the capacity
        // deadlock. Record the complete signed consumed component. Ordinary
        // exact additive words (e.g. 1e-500) remain separately spendable.
        const closed=t=>{const v=L.project(t);return (v.layer>=2&&v.mag>0)||v.lt(0);};
        const chargedWords=p.filter((t,i)=>i===index||closed(t));
        const rest=p.filter((t,i)=>i!==index&&!closed(t));
        yield {phase:'partition',key};
        const charged=L.value(chargedWords),estimate=inverse(key,n,charged,a,s),bounds=uncertainBounds(estimate);
        assert(charged.gt(0)&&L.sign(rest)>=0,'HARD: cannot safely partition net progress');
        const reward=estimate.mul(a),upper=P.requirement(key,plus(n,bounds.hi.mul(a)),s);
        record(s,key,{kind:'uncapped',beforeStock:display(n),award:String(a),batches:String(estimate),
          batchesSensitivity:[String(bounds.lo),String(bounds.hi)],closedProgress:String(charged),closedLedger:chargedWords,
          estimatedLogCost:String(logCost(key,n,estimate,a,s)),reward:String(reward),
          roundingStock:String(bounds.hi.sub(bounds.lo).mul(a)),remainderLower:'0',remainderUpper:String(upper),
          exactRemainder:false,knownLowWords:rest.length,frame:global.__jointFrame??null});
        yield {phase:'receipt',key};
        p=amountModel()?L.normalize(rest):WIS.Core.SignedLedger.normalize(rest);grant(estimate);count('bulk.closedInputs');
      }
      yield* settle();yield {phase:'settle',key};
      for(const input of P.Pending.inputs(pending)){count('bulk.pendingVisited');
        a=L.project(input.award??currentAward);const g=L.project(input.gain),n=inventory(stock),d=P.requirement(key,n,s);
        assert(g.gte(0)&&a.gt(0)&&a.floor().eq(a)&&L.sign(input.units)>=0,'HARD: invalid saved source context');
        if(g.lt(d)){
          const incoming=L.scale(input.units,g);yield {phase:'scale',key};
          let combined;
          try {combined=L.add(p,incoming);}
          catch(error){
            if(!(error instanceof L.LedgerError))throw error;
            if(!unresolvable(inverse(key,n,L.value(incoming),a,s))){
              if(error.code!=='ledger-capacity')throw error;
              // A small unpaid source cannot be granted as a high batch.
              // Archive its exact words in bounded pages until a later source
              // pays the boundary; comparisons can refine those pages.
              combined=WIS.Core.SignedLedger.add(p,incoming);
            }else{
            // Normalize in isolation first: term count is only a signal, since
            // incoming words may merge exactly even with a full ledger. When
            // the actual merge is unsafe, close the eligible high component
            // before any write, then reattach ALL retained low words.
            const low=p;p=incoming;yield* settle();combined=WIS.Core.SignedLedger.add(low,p);count('bulk.capacitySeparated');
            }
          }
          p=combined;yield* settle();yield {phase:"settle",key,block:input._endBlock};
          continue;
        }
        // Source-unit cap: first consume event credits only until the current
        // formula's cap transition. Do NOT apply an uncapped geometric sum to
        // this part. Reward multiplier changes the next inventory by A each time.
        const capN=capLevel(key,g,a,s),capM=amountModel()?WIS.Core.Amount.project(capBatch(capN,n,a)):B.max(0,capN.sub(n).div(a).floor().add(1));
        let credits,retained=[];
        try {credits=L.add(L.scale(p,ONE.div(d)),input.units);}
        catch(error){
          if(!(error instanceof L.LedgerError)||L.compare(input.units,[capM])<0||
              !unresolvable(inverse(key,n,L.value(input.units).mul(g),a,s)))throw error;
          // The incoming units alone pay the entire capped span, so its batch
          // count is independent of prior progress. Carry that exact progress
          // through the same demand conversion, outside the full credit array.
          retained=p;credits=L.normalize(input.units);p=[];
          count('bulk.capacitySeparated');
        }
        const m=B.min(L.value(credits).floor(),capM);
        assert(L.compare(credits,[m])>=0,'HARD: capped credit debit exceeds input');
        credits=L.subtract(credits,[m]);grant(m);count('bulk.capSegments');
        if(unresolvable(m)){const bounds=uncertainBounds(m);record(s,key,{kind:'capped-credits',beforeStock:display(n),
          gain:String(g),award:String(a),batches:String(m),reward:String(m.mul(a)),closedProgress:'0',
          roundingStock:String(bounds.hi.sub(bounds.lo).mul(a)),remainderUpper:'0',exactCreditLedger:true});}
        const nextGain=B.min(g,P.requirement(key,inventory(stock),s));
        p=L.scale(credits,nextGain);yield* settle();
        if(retained.length){p=L.add(p,L.scale(L.scale(retained,ONE.div(d)),nextGain));yield* settle();}
        yield {phase:"settle",key,block:input._endBlock};
      }
      L.write(s,key,stock,true);yield {phase:'stock-write',key};L.write(s,key,p);s.meta.treasureProgressPending[key]=[];
      if(L.sign(rewards)>0){WIS.Core.Effects.invalidate();P.rememberQualifications(s);}
      assert(L.sign(L.stock(s,key))>=0&&L.sign(L.progress(s,key))>=0,'HARD: negative committed balance');
      return L.value(rewards);
    }
  }
  function apply(s,key,units,gain,original,fixedAward){
    const previous=s.meta;
    try{const iterator=steps(s,key,units,gain,original,fixedAward);let item;
      do{item=iterator.next();}while(!item.done);return item.value;
    }catch(error){s.meta=previous;WIS.Core.Effects.invalidate();throw error;}
  }
  return {apply,steps,inverse,logCost,unresolvable};
}
module.exports={create};

},
"percent/ledger-cache.js":function(require,module,exports,global){
"use strict";
// Pure caches keyed by the complete validated inputs, never by game time or by
// a mutable state identity. No approximate merging, tail removal or stale N.
function create(){
  const maps={project:new Map(),normalize:new Map(),decimalWord:new Map()},powers=new Map();
  const orders={project:[],normalize:[],decimalWord:[]},cursors={project:0,normalize:0,decimalWord:0};
  const texts=new WeakMap();
  function word(value){
    if(!WIS.Core.BigNum.isDecimal(value))return String(value);
    const old=texts.get(value);
    if(old&&old.sign===value.sign&&old.layer===value.layer&&Object.is(old.mag,value.mag))return old.text;
    const text=String(value);texts.set(value,{sign:value.sign,layer:value.layer,mag:value.mag,text});return text;
  }
  return {
    pow10(e){if(!powers.has(e))powers.set(e,10n**BigInt(e));return powers.get(e);},
    wordText(w){return w._originalC===w.c&&w._originalE===w.e?w._canonical:`${w.c}e${w.e}`;},
    coefficientLength(w){return w._originalC===w.c?w._coefficientLength:w.c.toString().length;},
    get(kind,input,calculate){
    const prepared=kind==='normalize'?input.map(word):word(input);
    const key=kind==='normalize'?JSON.stringify(prepared):prepared,map=maps[kind];
    if(map.has(key)){global.__jointRevision?.count('ledgerCache.'+kind+'Hit');const v=map.get(key);return kind==='normalize'?v.slice():v;}
    global.__jointRevision?.count('ledgerCache.'+kind+'Miss');const value=calculate(prepared);
    if(kind==='decimalWord'&&value){const coefficient=String(value.c);Object.assign(value,{_originalC:value.c,_originalE:value.e,
      _coefficientLength:coefficient.length,_canonical:coefficient+'e'+value.e});}
    // Same bounded FIFO policy; avoid scanning deleted Map entries per miss.
    const order=orders[kind];
    if(map.size>=8192){const cursor=cursors[kind];map.delete(order[cursor]);order[cursor]=key;cursors[kind]=(cursor+1)%8192;}
    else order.push(key);
    map.set(key,kind==='normalize'?value.slice():value);
    return value;
  }};
}
module.exports={create};

},
"precision-analysis.js":function(require,module,exports,global){
"use strict";

// Prototype diagnostics only. No game state, saved value or arithmetic provider
// is changed. A layer-2 coordinate difference is NOT a relative resource error.
const Decimal = require("./production/js/vendor/break_eternity.min.js");
const bits = new DataView(new ArrayBuffer(8));

function nextUp(value) {
  value = Number(value);
  if (Number.isNaN(value) || value === Infinity) return value;
  if (value === 0) return Number.MIN_VALUE;
  bits.setFloat64(0, value);
  bits.setBigUint64(0, bits.getBigUint64(0) + (value > 0 ? 1n : -1n));
  return bits.getFloat64(0);
}

function nextDown(value) { return -nextUp(-Number(value)); }













module.exports = { nextUp, nextDown };

}},cache=new Map(),global={};
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const assert=(value,message='Fast-forward assertion failed')=>{if(!value)throw Error(message);};
  Object.assign(assert,{equal:(a,b,message)=>assert(Object.is(a,b),message||`${a} !== ${b}`),
    deepEqual:(a,b,message)=>assert(equal(a,b),message||'Fast-forward state mismatch'),ok:assert});
  function normalize(name){const parts=[];for(const p of name.split('/')){if(p==='..')parts.pop();else if(p&&p!=='.')parts.push(p);}return parts.join('/');}
  function load(name,from='entry.js'){
    if(name==='node:assert/strict')return assert;
    if(name==='node:perf_hooks')return {performance};
    let id=normalize(name.startsWith('.')?from.slice(0,from.lastIndexOf('/')+1)+name:name);
    if(!id.endsWith('.js'))id+='.js';
    if(id==='production/js/vendor/break_eternity.min.js')return WIS.Core.BigNum.BN(0).constructor;
    if(cache.has(id))return cache.get(id).exports;
    assert(modules[id],'Missing fast-forward module: '+id);
    const module={exports:{}};cache.set(id,module);
    modules[id](x=>load(x,id),module,module.exports,global);return module.exports;
  }

global.__jointRevision={count(){},timed(_key,fn,receiver,args){return Reflect.apply(fn,receiver,args);}};
const ledgerCache=load('percent/ledger-cache').create();let bulk=null;
WIS.Core.SignedLedger.setCache(ledgerCache);
function applyTreasure(state,key,units,gain,ordinary,fixedAward){
    bulk??=load('percent/bulk-progress').create();
    const run=()=>bulk.apply(state,key,units,gain,ordinary,fixedAward);
    return global.__progressAudit?global.__progressAudit.advance(state,key,units,gain,run):run();
  }
function treasureRecoverySteps(state,key,award){
    bulk??=load('percent/bulk-progress').create();
    const P=WIS.Meta.TreasureProgress;
    function* ordinary(){
      const queue=state.meta.treasureProgressPending[key];state.meta.treasureProgressPending[key]=[];
      for(const input of P.Pending.inputs(queue)){
        const row={...input};delete row._endBlock;state.meta.treasureProgressPending[key]=[row];
        P.advanceFixed(state,key,0,{eligible:true,gain:0,award:input.award??award});
        if(state.meta.treasureProgressPending[key]?.length)throw new WIS.Meta.TreasureLedger.LedgerError('宝物来源未能安全结算；原始输入保留');
        yield {phase:'settle',key,block:input._endBlock};
      }return WIS.Core.BigNum.ZERO;
    }
    return bulk.steps(state,key,0,0,ordinary,award);
  }
const retired=()=>WIS.Simulation.LegacySettlementCheckpoints.retired();
WIS.Simulation.FastForward=Object.freeze({version:1,ledgerCache,applyTreasure,treasureRecoverySteps,createDriver:retired,applicable:retired,audit:retired,pack:retired,unpack:retired,exportPoint:retired,validatePoint:retired,sourceModel:Object.freeze({column:retired,formulaRegime:retired,sourceChange:retired}),recordCost(){},isComputing:()=>false,get intervalFrames(){return 1;},get auditCandidates(){return null;},exploration(){}});
})(window.WIS);
