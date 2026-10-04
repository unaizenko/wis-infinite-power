(function(W){
  'use strict';
  const B=W.Core.BigNum,S=W.Core.State,R=W.Core.Runtime,E=W.Core.Effects;
  const keys=Object.freeze(['nieForce','universeCoefficient']);
  const observableKeys=Object.freeze(['joules','lifetimeTotalJ','currentRebirthTotalJ','nieForce.total','universeCoefficient.total']);
  const X=()=>W.Cultivation.Xiuzhen,G=()=>W.Simulation.ResourceGroups;
  const coordinate=n=>{n=B.BN(n);return n.layer===0?Math.log10(1+n.toNumber()):n.mag;};
  const widen=n=>B.mul(n,1+1e-11),shrink=n=>B.max(0,B.mul(n,1-1e-11));
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
  function validateCheckpoint(value){if(value==null)return null;if(value.version!==1)throw Error('强反馈证书版本无效');return {version:1,bounds:validateRows(value.bounds,keys),observables:validateRows(value.observables,observableKeys)};}  // Layer-zero ledger projection parses a normalized decimal significand and
  // rescales it; allow 16 binary roundings per formal addition/projection,
  // plus four aggregate endpoint operations. The allowance uses the largest
  // nonnegative stock in the complete tube, never a sampled endpoint error.
  function rounding(cap,n){return B.BN((n+4)*16*Number.EPSILON*Math.max(1,B.BN(cap).toNumber()));}
  function addFrames(start,increment,n,upper,cap){const value=B.add(start,B.mul(increment,n)),margin=rounding(cap,n);return upper?B.add(value,margin):B.max(start,B.sub(value,margin));}
  function reject(reason){return {supported:false,reason};}
  function support(state,profile){
    if(!X().thirdStepActive(state)||state.activeChallenge||W.Meta.Infinity.dynamicTempo(state))return 'formula-region';
    if(G().groups.some(g=>!['scale','immortal','xiuzhen'].includes(g.id)&&!(g.id==='martial'&&state.cultivation.active!=='martial')))return 'unknown-resource-group';
    if(X().has(state,'virtualOrigin'))return 'origin-progress-not-certified';
    if(X().has(state,'xianForce')||X().has(state,'yuanForce'))return 'upstream-xiuzhen-not-certified';
    // Third-step abilities add multipliers/exponents, never an additive source.
    // With X/Y fixed, zero core income is an invariant of the formal map. This
    // certificate deliberately does not assume small nonzero income is zero.
    if(G().keys.some(k=>!keys.includes(k)&&k!=='joules'&&B.gt(profile.rates[k]||0,0)))return 'active-core-feedback-not-certified';
    if(B.gt(profile.rates.joules||0,0)){
      const scale=state.powerSystem.systems.scale,imm=state.cultivation.systems.immortal;
      if(!B.eq(profile.rates.joules,1)||['spokenLaw','followLaw'].some(k=>X().has(state,k))||Object.values(scale.upgrades).some(v=>v===true||typeof v==='number'&&v>0)||Object.values(scale.actions).some(v=>v===true||typeof v==='number'&&v>0)||Object.values(imm.abilities).some(v=>v===true||typeof v==='number'&&v>0)||Object.keys(state.meta.infinity.upgrades).length)return 'active-core-feedback-not-certified';
    }
    if(keys.some(k=>G().read(state,k).layer!==0))return 'third-step-high-layer-not-certified';
    if(keys.some(k=>['residual','totalResidual','spentResidual'].some(field=>X().get(state).resources[k][field]?.length)))return 'third-step-ledger-tail-not-certified';
    if(observableKeys.some(k=>readObservable(state,k).layer!==0))return 'observable-high-layer-not-certified';
    return null;
  }
  function initialBounds(state,saved){const result={};
    for(const k of keys){const current=G().read(state,k),row=saved?.bounds?.[k];
      if(row&&(!B.eq(current,row.reference)||B.gt(row.lower,current)||B.lt(row.upper,current)))return null;
      result[k]={lower:B.BN(row?.lower??current),upper:B.BN(row?.upper??current)};
    }return result;
  }
  function readObservable(state,key){return key.endsWith('.total')?B.BN(X().get(state).resources[key.split('.')[0]].total):B.BN(state[key]);}
  function observables(state,start,end,gains,seconds,saved,gainBounds){
    const result={},n=Math.round(seconds/.1),L=W.Meta.TreasureLedger;
    for(const key of observableKeys){
      const current=readObservable(state,key),old=saved?.observables?.[key];
      if(old&&!B.eq(current,old.reference))return null;
      const lo=B.BN(old?.lower??current),hi=B.BN(old?.upper??current);let minGain,maxGain,reference;
      if(key.endsWith('.total')){const resource=key.split('.')[0];minGain=gainBounds[resource].lower;maxGain=gainBounds[resource].upper;reference=L.value(L.add([String(current)],[gains[resource]]));}
      else {minGain=maxGain=gains.joules;reference=B.add(current,gains.joules);}
      const cap=B.add(hi,maxGain);if(cap.layer!==0)return null;
      const margin=rounding(cap,n),lower=B.max(lo,B.sub(B.add(lo,minGain),margin)),upper=B.add(cap,margin);
      if(encodedError(B.min(lower,reference),B.max(upper,reference))>.001)return null;
      result[key]={lower:String(B.min(lower,reference)),upper:String(B.max(upper,reference)),reference:String(reference)};
    }return result;
  }
  function view(state,values){const next=S.createDraft(state).state;for(const k of keys)G().write(next,k,values[k]);return next;}
  function rates(state,values,factor){return R.withState(view(state,values),()=>E.withIsolatedState(R.getState(),()=>{
    const rates=X().thirdStepRates(R.getState());return Object.fromEntries(keys.map(k=>[k,B.mul(rates[k],factor)]));
  }));}
  function encodedError(lower,upper){
    if(!B.isFiniteBN(lower)||!B.isFiniteBN(upper)||lower.layer!==0||upper.layer!==0)return Infinity;
    return Math.max(0,coordinate(upper)-coordinate(lower));
  }
  function originSafe(state,bounds){
    if(!X().has(state,'virtualOrigin'))return true;
    const T=W.Meta.TreasureProgress,L=W.Meta.TreasureLedger,key='originImprint';
    const progress=L.value(L.progress(state,key)),remaining=B.max(0,B.sub(T.requirement(key,W.Meta.Treasures.count(state,key)),progress));
    const units=B.mul(B.max(0,B.sub(bounds.nieForce.upper,G().read(state,'nieForce'))),X().originProgressGain(state));
    return B.lt(units,remaining);
  }
  // For a nonnegative isotone recurrence z[k+1]=z[k]+dt*r(z[k]),
  // U >= z0+T*r(U) is a supersolution for EVERY frame in the block;
  // z0+T*r(z0) is a lower endpoint. These are discrete induction bounds,
  // not endpoint sampling or an ODE. ThirdStepRates is isotone in P and N,
  // with fixed Y/abilities/origin inventory and no stock penalty on P or N.
  function rectangle(state,bounds,seconds,factor){
    const lo=Object.fromEntries(keys.map(k=>[k,bounds[k].lower])),hi=Object.fromEntries(keys.map(k=>[k,bounds[k].upper]));
    const frames=Math.round(seconds/.1);let queries=0;const lowRate=rates(state,lo,factor);queries++;
    let upper=Object.fromEntries(keys.map(k=>[k,widen(B.add(hi[k],B.mul(lowRate[k],seconds*2)))]));
    let proved=false;
    for(let i=0;i<8;i++){
      const rr=rates(state,upper,factor);queries++;
      if(keys.some(k=>upper[k].layer!==0))return {queries,reason:'rounding-region'};
      const required=Object.fromEntries(keys.map(k=>[k,addFrames(hi[k],B.mul(rr[k],.1),frames,true,upper[k])]));
      if(keys.every(k=>B.gte(upper[k],required[k]))){proved=true;break;}
      upper=Object.fromEntries(keys.map(k=>[k,widen(B.add(hi[k],B.mul(B.max(B.sub(required[k],hi[k]),B.sub(upper[k],hi[k])),2)))]));
    }
    if(!proved)return {queries,reason:'no-discrete-supersolution'};
    // Once certified, one further evaluation gives a tighter upper endpoint;
    // all frame-start stocks remain inside the original supersolution tube.
    const rr=rates(state,upper,factor);queries++;
    const output=Object.fromEntries(keys.map(k=>[k,{lower:addFrames(lo[k],B.mul(lowRate[k],.1),frames,false,upper[k]),upper:addFrames(hi[k],B.mul(rr[k],.1),frames,true,upper[k])}]));
    const gainBounds=Object.fromEntries(keys.map(k=>{const cap=B.mul(rr[k],seconds),margin=rounding(cap,frames);return [k,{lower:B.max(0,B.sub(B.mul(lowRate[k],seconds),margin)),upper:B.add(cap,margin)}];}));
    return {bounds:output,gainBounds,queries};
  }
  // Constant P drives the monotone, N-independent empty-gate source. Every
  // discrete summand in a bin lies between its first/last formal source value;
  // weighted rectangles bound the SUM, with no ODE/integral/power approximation.
  // A fixed 512-bin ceiling bounds query work independently of frame count.
  function zeroChain(state,bounds,seconds,factor){
    if(!X().has(state,'emptyGate')||['mergeHeaven','innerWorld','zunYang'].some(k=>X().has(state,k))||!B.eq(bounds.nieForce.lower,0)||!B.eq(bounds.nieForce.upper,0))return null;
    const n=Math.round(seconds/.1);if(n<2||n>100000000||Math.abs(seconds-n*.1)>1e-9)return null;
    const rr=rates(state,{nieForce:B.ZERO,universeCoefficient:bounds.universeCoefficient.upper},factor),delta=B.mul(rr.nieForce,.1);
    if(!B.gt(delta,0))return null;
    const pCap=widen(B.mul(delta,n)),pMargin=rounding(pCap,n);if(pCap.layer!==0)return null;
    let lower=B.ZERO,upper=B.ZERO,queries=1;const bins=Math.min(512,n);
    for(let i=0;i<bins;i++){
      const first=Math.floor(n*i/bins),last=Math.floor(n*(i+1)/bins)-1,count=last-first+1;
      const pLow=B.max(0,B.sub(B.mul(delta,first),pMargin)),pHigh=B.add(B.mul(delta,last),pMargin);
      const a=rates(state,{nieForce:pLow,universeCoefficient:bounds.universeCoefficient.lower},factor),b=rates(state,{nieForce:pHigh,universeCoefficient:bounds.universeCoefficient.upper},factor);queries+=2;
      lower=B.add(lower,B.mul(B.mul(a.universeCoefficient,.1),count));upper=B.add(upper,B.mul(B.mul(b.universeCoefficient,.1),count));
    }
    const nCap=B.add(bounds.universeCoefficient.upper,upper);if(nCap.layer!==0)return null;
    const pGain=B.mul(delta,n),pGainMargin=rounding(pGain,n),nGainMargin=rounding(upper,n+bins);
    return {queries,gainBounds:{nieForce:{lower:B.max(0,B.sub(pGain,pGainMargin)),upper:B.add(pGain,pGainMargin)},universeCoefficient:{lower:B.max(0,B.sub(lower,nGainMargin)),upper:B.add(upper,nGainMargin)}},bounds:{nieForce:{lower:B.max(0,B.sub(B.mul(delta,n),pMargin)),upper:B.add(B.mul(delta,n),pMargin)},universeCoefficient:{lower:B.max(bounds.universeCoefficient.lower,B.sub(B.add(bounds.universeCoefficient.lower,lower),rounding(nCap,n+bins))),upper:B.add(B.add(bounds.universeCoefficient.upper,upper),rounding(nCap,n+bins))}},method:'isotone-discrete-source-sum'};
  }
  function plan(state,requested,{profile,budget}={}){
    if(!Number.isFinite(requested)||requested<=.1||requested/.1>100000000)return reject('duration-region');
    profile ||= W.Simulation.FixedSources.query(state);
    const reason=support(state,profile);if(reason)return reject(reason);
    const start=initialBounds(state,budget?.strongFeedback);if(!start)return reject('stale-error-enclosure');
    const factor=W.Simulation.Compensation.factor();let seconds=Math.floor(requested/.1+1e-8)*.1,queries=0;
    if(!(seconds>.1))return reject('event-neighbourhood');
    for(let refine=0;refine<8&&seconds>.1;refine++){
      const candidate=zeroChain(state,start,seconds,factor)||rectangle(state,start,seconds,factor);queries+=candidate.queries;
      if(candidate.bounds&&keys.every(k=>encodedError(candidate.bounds[k].lower,candidate.bounds[k].upper)<=.001)&&originSafe(state,candidate.bounds)){
        const gains=Object.fromEntries(G().keys.map(k=>[k,B.ZERO])),saved={};
        gains.joules=B.mul(profile.rates.joules||0,seconds);
        if(B.gt(gains.joules,0)){const end=B.add(state.joules,gains.joules),stages=R.withState(state,()=>W.Power.ScaleLogic.activeSoftcapStages(end));if(stages!=='未触发'||B.gte(end,W.Core.Config.googolPenalty.threshold))return reject('core-joule-boundary');}
        for(const k of keys){const row=candidate.bounds[k],value=B.pow(10,(coordinate(row.lower)+coordinate(row.upper))/2);const center=row.upper.layer===0?B.max(0,B.sub(value,1)):value;
          const target=B.max(G().read(state,k),B.min(row.upper,B.max(row.lower,center)));gains[k]=B.max(0,B.sub(target,G().read(state,k)));saved[k]={lower:String(row.lower),upper:String(row.upper),reference:String(W.Meta.TreasureLedger.value(W.Meta.TreasureLedger.add([String(G().read(state,k))],[gains[k]])))};}
        const observableBounds=observables(state,start,candidate.bounds,gains,seconds,budget?.strongFeedback,candidate.gainBounds);if(!observableBounds){seconds=Math.floor(seconds/.2+1e-8)*.1;continue;}
        return {supported:true,seconds,gains,certificate:{version:1,method:candidate.method||'isotone-discrete-supersolution',keys,bounds:saved,observables:observableBounds,coordinateAbsoluteLimit:.001,rateEvaluations:queries,refinements:refine,virtualFrames:Math.round(seconds/.1)}};
      }
      seconds=Math.floor(seconds/.2+1e-8)*.1;
    }return {...reject('residual-or-event-bound'),rateEvaluations:queries};
  }
  W.Simulation.StrongFeedbackKernel=Object.freeze({plan,coordinate,support,validateCheckpoint});
})(window.WIS);







