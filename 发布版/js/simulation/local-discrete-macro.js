(function(W){
  'use strict';
  const B=W.Core.BigNum,S=W.Core.State,R=W.Core.Runtime,E=W.Core.Effects;
  const G=()=>W.Simulation.ResourceGroups,C=()=>W.Simulation.ContinuousPredictor;
  const dt=.1, clocks=['reincarnationElapsedSeconds','currentScaleElapsedSeconds','totalElapsedSeconds'];
  const limits=Object.freeze({version:2,refinements:8,calibrationFrames:4,maximumSeconds:300,safety:8,
    stockLogRelative:.005,stockHighAbsolute:.001,rateLogRelative:.005,rateHighAbsolute:.001,fluxLogRelative:.01,fluxHighAbsolute:.002});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const reject=reason=>({supported:false,reason});
  const coord=C().coordinate,amount=c=>c.layer===0?B.BN(c.value):B.Decimal.fromComponents(1,c.layer,c.value);
  function query(s){return R.withState(s,()=>R.withProjection(()=>R.withOfflineExecution(()=>E.withIsolatedState(s,()=>W.Simulation.FixedSources.query(s)))));}
  function read(s){return C().coordinates(s);}
  function flux(p){return Object.fromEntries([['$exploration',p.cultivation.explorationAmount],...(p.rewards||[]).map(r=>[r.key,r.eligible?B.mul(r.units,r.gain):B.ZERO])]);}
  function write(s,c,seconds=0,base=s,commit=false){
    if(commit){const gains=Object.fromEntries(G().keys.map(k=>[k,B.max(0,B.sub(amount(c[k]),G().read(base,k)))]));
      R.withState(s,()=>{W.Power.Scale.commitAutomaticGains(s,{joules:gains.joules,power:gains.power,rates:{}},{writeRates:false});for(const k of ['mana','immortalPower'])W.Core.Resources.accumulateSystemResourceGain('immortal',k,gains[k]);s.cultivation.systems.immortal.xiuzhen=W.Cultivation.Xiuzhen.prepare(s,gains);});
    }else for(const k of G().keys)G().write(s,k,amount(c[k]));
    s.highestPower=B.max(base.highestPower,G().read(s,'power'));
    for(const k of clocks)s[k]=base[k]+seconds;
    s.meta.infinity={...s.meta.infinity,runElapsed:base.meta.infinity.runElapsed+seconds};
    for(const [field,key]of [['lifetimeHighestPower','power'],['currentRebirthHighestPower','power'],['lifetimeHighestJ','joules'],['currentRebirthHighestJ','joules'],['lifetimeHighestMana','mana'],['currentRebirthHighestMana','mana'],['lifetimeHighestImmortalPower','immortalPower'],['currentRebirthHighestImmortalPower','immortalPower']])s[field]=B.max(base[field]||0,G().read(s,key));
  }
  function profileBranch(p){return JSON.stringify([G().keys.map(k=>B.gt(p.rates[k],0)),p.rewards.map(r=>[r.key,r.eligible]),p.cultivation.circulation]);}
  const identity=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
  const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*b[k][j],0)));
  const mv=(a,b)=>a.map(row=>row.reduce((sum,v,k)=>sum+v*b[k],0));
  const va=(a,b)=>a.map((v,i)=>v+b[i]);
  function lift(A,b,n){let out={A:identity(A.length),b:Array(A.length).fill(0)},power={A,b};
    while(n>0){if(n%2)out={A:mm(power.A,out.A),b:va(mv(power.A,out.b),power.b)};n=Math.floor(n/2);if(n)power={A:mm(power.A,power.A),b:va(mv(power.A,power.b),power.b)};}
    return out;
  }
  function next(c,p){return Object.fromEntries(G().keys.map(k=>[k,coord(B.add(amount(c[k]),B.mul(p.rates[k],dt)))]));}
  function distance(a,b){if(a.layer!==b.layer)return Infinity;return a.layer===0?Math.abs(a.value-b.value)/Math.max(1,Math.abs(a.value),Math.abs(b.value)):a.layer===1?Math.abs(a.value-b.value)/Math.max(1,Math.abs(a.value),Math.abs(b.value)):Math.abs(a.value-b.value);}
  function testCoordinates(a,b,logLimit,highLimit){return Object.keys(a).every(k=>{const x=coord(a[k]),y=coord(b[k]);return distance(x,y)<=(x.layer>=2?highLimit:logLimit);});}
  function signature(s){return C().signature(s);}
  function formalCommit(state,rates){const gains=Object.fromEntries(G().keys.map(k=>[k,B.mul(rates[k],dt)]));
    R.withState(state,()=>{W.Power.Scale.commitAutomaticGains(state,{joules:gains.joules,power:gains.power,rates:{}},{writeRates:false});for(const k of ['mana','immortalPower'])W.Core.Resources.accumulateSystemResourceGain('immortal',k,gains[k]);state.cultivation.systems.immortal.xiuzhen=W.Cultivation.Xiuzhen.prepare(state,gains);});return gains;
  }
  function visibility(c,y){return G().keys.map(k=>c[k].layer===y[k].layer&&c[k].value===y[k].value).join(',');}
  function operator(s,c,p,unit,stats){
    const first=next(c,p);stats.formulaFramesEvaluated=(stats.formulaFramesEvaluated||0)+unit;
    if(unit===1)return {end:first,branch:visibility(c,first)};
    // The late M/IP SCC alternates its swallowed source every formal frame.
    // Compose precisely two formal resource maps, then lift this fixed-size
    // operator. This construction has constant cost, independent of n.
    const draft=S.createDraft(s).state;formalCommit(draft,p.rates);write(draft,read(draft),dt,s);
    const intermediate=query(draft);stats.rateQueries++;if(profileBranch(intermediate)!==profileBranch(p))return null;
    const actual=read(draft),end=next(actual,intermediate);
    return {end,branch:visibility(c,actual)+'/'+visibility(actual,end)};
  }
  function qualify(s,p){
    if(s.activeChallenge||W.Meta.Infinity.dynamicTempo(s))return 'event-dependent-region';
    if(W.Cultivation.Xiuzhen.has(s,'virtualOrigin'))return 'origin-feedback-region';
    if(G().groups.some(g=>!['scale','immortal','xiuzhen'].includes(g.id)&&!(g.id==='martial'&&s.cultivation.active!=='martial')))return 'resource-group-region';
    if(clocks.some(k=>!Number.isFinite(s[k])||s[k]<0))return 'clock-region';
    let high=false;
    for(const k of G().keys){const value=G().read(s,k),income=B.BN(p.rates[k]||0),a=coord(value),b=coord(B.add(value,B.mul(income,dt)));
      if(!B.parseFinite(p.rates[k])||B.lt(p.rates[k],0))return 'rate-representation';
      if(a.layer>=1&&a.layer<=2&&a.value<=0)return 'inactive-coordinate-region';
      if(B.eq(income,0))continue;
      if(a.layer!==b.layer||a.layer<1||a.layer>2||a.value<=0)return 'active-coordinate-region';
      if(a.layer===2||a.value>=1e6)high=true;
    }
    return high?null:'normal-coordinate-region';
  }
  function build(s,p,stats){
    const start=read(s),single=next(start,p),unit=G().keys.some(k=>B.gt(p.rates[k],0)&&single[k].value===start[k].value)?2:1;
    const base=operator(s,start,p,unit,stats);if(!base)return null;const end=base.end,active=G().keys.filter(k=>start[k].layer>=1&&start[k].layer<=2),branch=base.branch;
    const scales=active.map(k=>Math.max(Math.abs(end[k].value-start[k].value),Math.max(1,Math.abs(start[k].value))*1e-10));
    const size=active.length+1,A=identity(size),b=Array(size).fill(0);
    for(let i=0;i<active.length;i++)b[i]=(end[active[i]].value-start[active[i]].value)/scales[i];b[size-1]=unit*dt;
    for(let j=0;j<size;j++){
      let step=j<active.length?.1:1,accepted=false;
      // A derivative probe must remain on the same formal rounding branch.
      // Crossing a swallowed-source threshold creates a spurious huge slope.
      for(let attempt=0;attempt<6;attempt++,step/=10){
        const draft=S.createDraft(s).state,c=copy(start);if(j<active.length)c[active[j]].value+=step*scales[j];
        write(draft,c,j===size-1?step:0,s,true);if(signature(draft)!==signature(s))return null;
        const pp=query(draft);stats.rateQueries++;if(profileBranch(pp)!==profileBranch(p))return null;const mapped=operator(draft,c,pp,unit,stats);if(!mapped)return null;const yy=mapped.end;
        if(mapped.branch!==branch)continue;
        for(let i=0;i<active.length;i++){const key=active[i];if(yy[key].layer!==start[key].layer)return null;A[i][j]=(yy[key].value-end[key].value)/(scales[i]*step);}
        accepted=true;break;
      }if(!accepted)return null;
    }
    if([...A.flat(),...b].some(v=>!Number.isFinite(v)))return null;
    return {start,active,scales,A,b,unit};
  }
  function forecast(s,p,n,stats,model=null){
    const m=model||build(s,p,stats);if(!m||n%m.unit)return null;const v=lift(m.A,m.b,n/m.unit),c=copy(m.start);
    for(let i=0;i<m.active.length;i++){const key=m.active[i];c[key].value+=v.b[i]*m.scales[i];if(!Number.isFinite(c[key].value)||c[key].value<m.start[key].value)return null;const a=amount(c[key]);if(!B.isFiniteBN(a)||a.layer!==c[key].layer)return null;}
    const draft=S.createDraft(s).state;write(draft,c,n*dt,s,true);if(signature(draft)!==signature(s))return null;
    let endpoint=query(draft);stats.rateQueries++;if(profileBranch(endpoint)!==profileBranch(p))return null;
    const gains=Object.fromEntries(G().keys.map(k=>[k,B.max(0,B.sub(amount(c[k]),G().read(s,k)))]));
    // Stock rounding can hide a real source. Integrate that source separately;
    // never interpret zero stock displacement as zero gain or progress.
    const hidden={joules:B.ZERO,power:B.ZERO};let hasHidden=false;
    for(const k of G().keys)if(B.gt(p.rates[k],0)&&B.eq(gains[k],0)){
      const before=coord(B.add(G().read(s,k),B.mul(p.rates[k],dt))),after=coord(B.add(amount(c[k]),B.mul(endpoint.rates[k],dt)));
      if(before.layer!==m.start[k].layer||before.value!==m.start[k].value||after.layer!==c[k].layer||after.value!==c[k].value)return null;
      gains[k]=leftIntegral(p.rates[k],endpoint.rates[k],n);if(gains[k]==null)return null;
      if(!B.eq(B.add(amount(c[k]),gains[k]),amount(c[k])))return null;
      hasHidden=true;
      // These two resource totals are read through the normal accounting API.
      if(['mana','immortalPower'].includes(k))R.withState(draft,()=>W.Core.Resources.accumulateSystemResourceGain('immortal',k,gains[k]));
      else if(k==='power'||k==='joules')hidden[k]=gains[k];
      else if(k!=='power'&&k!=='joules')return null;
    }
    if(hasHidden){R.withState(draft,()=>W.Power.Scale.commitAutomaticGains(draft,hidden,{writeRates:false}));
      const actual=read(draft);if(G().keys.some(k=>actual[k].layer!==c[k].layer||actual[k].value!==c[k].value))return null;
      const updated=query(draft);stats.rateQueries++;if(profileBranch(updated)!==profileBranch(p)||!testCoordinates(endpoint.rates,updated.rates,limits.rateLogRelative/limits.safety,limits.rateHighAbsolute/limits.safety))return null;endpoint=updated;
    }
    const a=flux(p),z=flux(endpoint),progressTotals={};
    for(const k of Object.keys(a)){if(!B.isFiniteBN(a[k])||!B.isFiniteBN(z[k])||B.lt(a[k],0)||B.lt(z[k],0))return null;
      // Formal opportunities use left endpoints. A geometric interpolation is
      // an approximation; coarse/fine totals below independently test it.
      progressTotals[k]=leftIntegral(a[k],z[k],n);if(progressTotals[k]==null)return null;
    }
    return {state:draft,profile:endpoint,coordinates:c,gains,progressTotals,model:m,transition:v.A};
  }
  function leftIntegral(start,end,n){
    if(B.eq(start,end)||n===1)return B.mul(start,n*dt);
    if(B.eq(start,0)||B.eq(end,0))return null;
    const ratio=B.pow(B.div(end,start),1/n);return B.eq(ratio,1)?B.mul(start,n*dt):B.mul(B.mul(start,dt),B.div(B.sub(B.pow(ratio,n),1),B.sub(ratio,1)));
  }
  function add(a,b){return Object.fromEntries(Object.keys(a).map(k=>[k,B.add(a[k],b[k])]));}
  function compare(coarse,fine){
    const coordinates=Object.fromEntries(G().keys.map(k=>[k,amount(coarse.coordinates[k])])),other=Object.fromEntries(G().keys.map(k=>[k,amount(fine.coordinates[k])]));
    return testCoordinates(coordinates,other,limits.stockLogRelative/limits.safety,limits.stockHighAbsolute/limits.safety)&&
      testCoordinates(coarse.gains,fine.gains,limits.stockLogRelative/limits.safety,limits.stockHighAbsolute/limits.safety)&&
      testCoordinates(coarse.profile.rates,fine.profile.rates,limits.rateLogRelative/limits.safety,limits.rateHighAbsolute/limits.safety)&&
      testCoordinates(coarse.progressTotals,fine.progressTotals,limits.fluxLogRelative/limits.safety,limits.fluxHighAbsolute/limits.safety);
  }
  function validateCheckpoint(value){
    if(value?.operatorUnit!=null&&![1,2].includes(value.operatorUnit))throw Error('局部离散宏步算子版本无效');
    if(value==null)return null;if(value.version!==limits.version||value.calibrated!==true||typeof value.signature!=='string'||value.signature.length>32768||value.classification!=='empirical-discrete-map'||!Number.isSafeInteger(value.maps)||value.maps<0||!value.estimates||Object.keys(value.estimates).length>G().keys.length||!Array.isArray(value.active)||new Set(value.active).size!==value.active.length||value.active.some(k=>!G().keys.includes(k)||!value.estimates[k]))throw Error('局部离散宏步checkpoint无效');
    for(const [k,v]of Object.entries(value.estimates))if(!G().keys.includes(k)||!Number.isSafeInteger(v.layer)||v.layer<0||v.layer>2||!Number.isFinite(v.error)||v.error<0||!Number.isFinite(v.reference)||v.reference<=0)throw Error('局部离散宏步误差台账无效');
    if(!value.outputSampling||Object.keys(value.outputSampling).length>64)throw Error('局部离散宏步输出采样台账无效');
    for(const row of Object.values(value.outputSampling)){if(!row||['lower','upper','reference'].some(k=>typeof row[k]!=='string'||!B.parseFinite(row[k])||B.lt(B.parseFinite(row[k]),0))||B.gt(row.lower,row.reference)||B.gt(row.reference,row.upper))throw Error('局部离散宏步输出采样台账无效');}
    return {...copy(value),operatorUnit:value.operatorUnit||1};
  }
  function estimate(previous,coarse,fine,left,right,signatureValue){
    const prior=previous?.estimates||{},errors={};
    for(const k of left.model.active){const row=prior[k],c=left.model.start[k];let error=row?.error||0;
      if(row&&row.layer!==c.layer){if(row.layer===1&&c.layer===2&&error<row.reference)error=-Math.log10(1-error/row.reference);else if(row.layer===2&&c.layer===1)error=c.value*Math.expm1(error*Math.LN10);else return null;}
      if(!Number.isFinite(error))return null;errors[k]=error;
    }
    // Compose BOTH half maps in physical coordinate units. Each Jacobian is
    // normalized by its own local scales, so those scales must be converted.
    for(const part of [left,right]){const m=part.model,input=m.active.map((k,i)=>(errors[k]||0)/m.scales[i]);input.push(0);const output=mv(part.transition.map(row=>row.map(Math.abs)),input);for(let i=0;i<m.active.length;i++)errors[m.active[i]]=output[i]*m.scales[i];}
    const estimates={};for(const k of left.model.active){const c=fine.coordinates[k];estimates[k]={layer:c.layer,reference:c.value,error:errors[k]+limits.safety*Math.abs(c.value-coarse.coordinates[k].value)};
      const limit=c.layer===1?limits.stockLogRelative*Math.max(1,Math.abs(c.value)):limits.stockHighAbsolute;if(!Number.isFinite(estimates[k].error)||estimates[k].error>limit)return null;}
    // Accumulate outputs in Decimal units before measuring native coordinate
    // width. Later dominant contributions can dilute small earlier errors.
    // These observed envelopes are empirical indicators, not global bounds.
    const outputSampling={...(previous?.outputSampling||{})};
    for(const [kind,a,z]of [['gain',coarse.gains,fine.gains],['progress',coarse.progressTotals,fine.progressTotals]])for(const k of Object.keys(a)){
      const key=kind+':'+k,x=coord(a[k]),y=coord(z[k]);if(x.layer!==y.layer)return null;const error=limits.safety*Math.abs(x.value-y.value),old=outputSampling[key];
      const lower=amount({...y,value:y.layer===0?Math.max(0,y.value-error):y.value-error}),upper=amount({...y,value:y.value+error});
      if(!B.isFiniteBN(lower)||!B.isFiniteBN(upper))return null;
      const row={lower:String(B.add(old?.lower||0,lower)),upper:String(B.add(old?.upper||0,upper)),reference:String(B.add(old?.reference||0,z[k]))};
      const lo=coord(row.lower),hi=coord(row.upper);if(distance(lo,hi)>(lo.layer>=2?(kind==='gain'?limits.stockHighAbsolute:limits.fluxHighAbsolute):(kind==='gain'?limits.stockLogRelative:limits.fluxLogRelative)))return null;
      outputSampling[key]=row;
    }
    return {version:limits.version,operatorUnit:left.model.unit,signature:signatureValue,classification:'empirical-discrete-map',maps:(previous?.maps||0)+1,calibrated:true,active:left.model.active,estimates,outputSampling};
  }
  function checkInfluence(fine,checkpoint,stats){
    const nominal=fine.profile,branch=profileBranch(nominal);
    // Probe inherited/model-transported coordinate uncertainty against actual
    // endpoint rates and flux. These finite axis probes are empirical checks;
    // they do not certify the unobserved interior of an error box.
    for(const [k,row]of Object.entries(checkpoint.estimates))if(row.error>0)for(const sign of [-1,1]){
      const draft=S.createDraft(fine.state).state,c={...fine.coordinates[k],value:fine.coordinates[k].value+sign*row.error};
      if(c.value<=0)return false;const value=amount(c);if(!B.isFiniteBN(value)||value.layer!==c.layer)return false;
      G().write(draft,k,value);if(k==='power')draft.highestPower=B.max(draft.highestPower,value);
      if(signature(draft)!==signature(fine.state))return false;
      const perturbed=query(draft);stats.rateQueries++;stats.influenceQueries++;
      if(profileBranch(perturbed)!==branch||!testCoordinates(nominal.rates,perturbed.rates,limits.rateLogRelative,limits.rateHighAbsolute)||!testCoordinates(flux(nominal),flux(perturbed),limits.fluxLogRelative,limits.fluxHighAbsolute))return false;
    }return true;
  }
  function plan(state,requested,{profile,budget}={}){
    if(!Number.isFinite(requested)||requested<.8)return reject('short-event-neighbourhood');profile||=query(state);const reason=qualify(state,profile);if(reason)return reject(reason);
    const sig=signature(state),previous=validateCheckpoint(budget?.localDiscrete),stats={rateQueries:0,influenceQueries:0,refinements:0,fallbackMicroSteps:0,calibrationMicroSteps:0,realMicroSteps:0};
    let frames=Math.floor(Math.min(requested,limits.maximumSeconds)/dt+1e-8);frames-=frames%4;
    for(let refine=0;refine<limits.refinements&&frames>=8;refine++,frames=Math.floor(frames/2/4)*4){
      stats.refinements=refine;const model=build(state,profile,stats);if(!model)continue;const coarse=forecast(state,profile,frames,stats,model);if(!coarse)continue;
      const first=Math.floor(frames/2),left=forecast(state,profile,first,stats,model),right=left&&forecast(left.state,left.profile,frames-first,stats);if(!right)continue;
      const fine={...right,gains:add(left.gains,right.gains),progressTotals:add(left.progressTotals,right.progressTotals)};
      // Error transport is model based, with explicit observed coarse/fine
      // disagreement. It is saved across continuation, never a strict bound.
      const checkpoint=compare(coarse,fine)&&estimate(previous,coarse,fine,left,right,sig);if(!checkpoint||!checkInfluence(fine,checkpoint,stats))continue;
      if(!previous?.calibrated||previous.signature!==sig||previous.operatorUnit!==model.unit){
        const checkFrames=limits.calibrationFrames;W.Simulation.FallbackWorkBudget.requireCalibration(budget?.fallbackBudget,checkFrames);
        try{
        const reference=S.cloneForSimulation(state),total=Object.fromEntries(G().keys.map(k=>[k,B.ZERO])),progress={};let rp=profile;
        for(let i=0;i<checkFrames;i++){
          stats.calibrationMicroSteps++;stats.realMicroSteps++;const gains=Object.fromEntries(G().keys.map(k=>[k,B.mul(rp.rates[k],dt)]));
          R.withState(reference,()=>W.Power.Scale.commitAutomaticGains(reference,{joules:gains.joules,power:gains.power,rates:{}},{writeRates:false}));
          R.withState(reference,()=>{for(const k of ['mana','immortalPower'])W.Core.Resources.accumulateSystemResourceGain('immortal',k,gains[k]);});reference.cultivation.systems.immortal.xiuzhen=W.Cultivation.Xiuzhen.prepare(reference,gains);
          for(const k of G().keys)total[k]=B.add(total[k],gains[k]);for(const [k,v]of Object.entries(flux(rp)))progress[k]=B.add(progress[k]||0,B.mul(v,dt));
          write(reference,read(reference),(i+1)*dt,state);rp=query(reference);stats.rateQueries++;
        }
        const candidate=forecast(state,profile,checkFrames,stats),actual={coordinates:read(reference),gains:total,progressTotals:progress,profile:rp};
        if(!candidate||!compare(candidate,actual)){const error=Error('局部离散宏步冷启动校准未通过；债务保留');error.code='local-discrete-calibration';error.evolutionStats=stats;throw error;}
        }catch(error){error.evolutionStats=stats;throw error;}
      }
      return {supported:true,seconds:frames*dt,gains:fine.gains,progressTotals:fine.progressTotals,endpoint:{coordinates:fine.coordinates},approximation:checkpoint,stats:{...stats,virtualSteps:frames,maximumBlockSteps:frames}};
    }return {...reject('local-discrete-refinement-limit'),stats};
  }
  W.Simulation.LocalDiscreteMacro=Object.freeze({plan,validateCheckpoint,limits,lift,qualify});
})(window.WIS);
