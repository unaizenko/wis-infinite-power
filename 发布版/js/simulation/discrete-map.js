(function defineDiscreteMap(WIS){
  'use strict';
  const B=WIS.Core.BigNum,R=WIS.Core.Runtime,E=WIS.Core.Effects;
  const config=()=>WIS.Core.Config.offlineHierarchy;
  const groups=()=>WIS.Simulation.ResourceGroups;
  function coordinate(value){const n=B.BN(value);if(!B.isFiniteBN(n)||n.lt(0))throw Error('映射资源坐标无效');return {layer:n.layer,value:n.layer===0?n.toNumber():n.mag};}
  function amount(c){if(c.layer===0)return B.BN(Math.max(0,c.value));return B.Decimal.fromComponents(1,c.layer,c.value);}
  function coordinates(state){return Object.fromEntries(groups().keys.map(k=>[k,coordinate(groups().read(state,k))]));}
  function signature(state){
    const i=state.cultivation.systems.immortal,x=WIS.Cultivation.Xiuzhen.get(state),n=WIS.Meta.BigNumbers.get(state);
    return JSON.stringify([state.powerSystem.active,state.cultivation.active,state.highestScaleIndex,state.advancedRealmLevel,state.currentQiLayer,
      state.qiRefiningUnlocked,state.foundationUnlocked,state.goldenCoreUnlocked,state.activeChallenge,state.challengeCompletions,state.unlockedAchievements,
      state.powerSystem.systems.scale.upgrades,state.powerSystem.systems.scale.actions,Object.fromEntries(Object.entries(i.abilities).filter(([k])=>k!=='naturalTreasureLevel')),x.entered,x.realm,x.abilities,
      WIS.Meta.BigNumbers.treeSignature(state),state.meta.infinity.upgrades,n.unlocked,n.fractalLevel,n.purchases,n.beyondFractal,WIS.Meta.BigNumbers.MILESTONES.filter(v=>v<=n.gIndex),
      groups().keys.map(k=>[coordinate(groups().read(state,k)).layer,B.gte(groups().read(state,k),'1e100')]),
      groups().groups.map(g=>g.branchKey?.(state)??null)]);
  }
  function progressSignature(state){return JSON.stringify([String(state.naturalTreasureLevel),WIS.Meta.Treasures.keys.map(k=>String(WIS.Meta.Treasures.count(state,k)))]);}
  function nextCoordinates(state,profile,dt){return Object.fromEntries(groups().keys.map(k=>[k,coordinate(B.add(groups().read(state,k),B.mul(profile.rates[k],dt)))]));}
  function progressCoordinates(profile){return Object.fromEntries([
    ['$exploration',coordinate(profile.cultivation?.explorationAmount||0)],
    ['$naturalCap',coordinate(WIS.Meta.TreasureLedger.value(profile.natural?.cap||[]))],
    ...(profile.rewards||[]).map(v=>[v.key,coordinate(v.eligible?B.mul(v.units,v.gain):0)])]);}
  function trend(values,{signed=false}={}) {
    const cfg=config();if(values.some(v=>!v||v.layer!==values[0].layer))return null;
    const deltas=values.slice(1).map((v,i)=>v.value-values[i].value);
    if(deltas.every(d=>Math.abs(d)<=cfg.coordinateFloor))return {ratio:1,delta:0,layer:values[0].layer};
    const sign=Math.sign(deltas.at(-1));if((!signed&&sign<0)||deltas.some(d=>Math.sign(d)!==sign||Math.abs(d)<=cfg.coordinateFloor))return null;
    const logs=deltas.slice(1).map((d,i)=>Math.log(d/deltas[i])),mean=logs.reduce((a,b)=>a+b,0)/logs.length;
    if(!Number.isFinite(mean)||logs.some(v=>Math.abs(v-mean)>cfg.trendTolerance))return null;
    return {ratio:Math.exp(mean),delta:deltas.at(-1),layer:values[0].layer};
  }
  function fit(history,dt){
    const cfg=config();if(history.length<cfg.learnSteps+1)return null;
    const ratios={},floors={},progress={};
    for(const group of groups().groups)for(const k of group.keys){
      const values=history.map(p=>p[k]);if(values.some(v=>!v||v.layer!==values[0].layer))return null;
      let fit=trend(values);
      // A driven resource can relax towards a nonzero coordinate increment.
      // Fit the scalar recurrence d[n+1] = floor + r*(d[n]-floor), using
      // differences of observed increments. This is a discrete trend model,
      // not a coupled matrix or an ODE; endpoint rates must still validate it.
      const increments=values.slice(1).map((v,i)=>v.value-values[i].value);
      const relaxation=trend(increments.map(value=>({layer:0,value})),{signed:true});
      if(increments.every(v=>v>=0)&&relaxation&&relaxation.ratio>0&&relaxation.ratio<cfg.relaxationMaxRatio&&relaxation.delta!==0){
        const r=relaxation.ratio,floor=(increments.at(-1)-r*increments.at(-2))/(1-r);
        if(Number.isFinite(floor)&&floor>=0){fit={...fit,ratio:r};floors[k]=floor;}
      }
      if(!fit)return null;
      ratios[k]=fit.ratio;
    }
    if(history.every(p=>p.$progress))for(const k of Object.keys(history.at(-1).$progress)){
      const fit=trend(history.map(p=>p.$progress[k]),{signed:true});if(!fit)return null;progress[k]=fit;
    }
    return {ratios,floors,progress,dt,groups:groups().groups.map(g=>({id:g.id,keys:g.keys})),trainedSteps:history.length-1};
  }
  // Deterministic sum of modeled progress rates, not RNG opportunities. Fit
  // log-linear rates in a fixed number of bins; exponentially dominant tails
  // are handled by BigNum geometric sums. No per-virtual-tick formula calls.
  function progressTotal(current,model,steps,dt){
    if(!model)return B.mul(amount(current),steps*dt);
    const at=i=>{const c={layer:current.layer,value:current.value+geometric(model.delta*model.ratio,model.ratio,i)};const n=amount(c);return !Number.isFinite(c.value)||!B.isFiniteBN(n)||n.lt(0)||n.layer!==c.layer?null:n;};
    let sum=B.ZERO;
    for(let lo=0;lo<steps;){const count=Math.min(steps-lo,Math.ceil(steps/config().progressBins)),first=at(lo),last=at(lo+count-1);if(!first||!last)return null;
      let part;if(count===1)part=first;
      else if(B.eq(first,last))part=B.mul(first,count);
      else if(B.eq(first,0)||B.eq(last,0))return null;
      else {const q=B.pow(B.div(last,first),1/(count-1));part=B.eq(q,1)?B.mul(B.add(first,last),count/2):B.mul(first,B.div(B.sub(B.pow(q,count),1),B.sub(q,1)));}
      if(!B.isFiniteBN(part)||B.lt(part,0))return null;sum=B.add(sum,part);lo+=count;
    }
    return B.mul(sum,dt);
  }
  function geometric(first,ratio,n){if(Math.abs(ratio-1)<1e-10)return first*n;return first*Math.expm1(n*Math.log(ratio))/(ratio-1);}
  function forecast(state,profile,model,steps){
    const cfg=config(),before=coordinates(state),next=nextCoordinates(state,profile,model.dt),gains={},expected={};
    for(const group of groups().groups)for(const k of group.keys){
      if(before[k].layer!==next[k].layer)return null;
      const delta=next[k].value-before[k].value,ratio=model.ratios[k];if(delta<-cfg.coordinateFloor||!Number.isFinite(ratio))return null;
      const floor=model.floors?.[k]||0;
      const predicted={layer:before[k].layer,value:before[k].value+floor*steps+geometric(Math.max(0,delta)-floor,ratio,steps)};
      if(!Number.isFinite(predicted.value))return null;
      const target=amount(predicted);if(!B.isFiniteBN(target)||target.layer!==predicted.layer)return null;
      // Stock may be unable to represent income while lifetime earnings still
      // can. Preserve the frozen positive source in that finite-precision case.
      gains[k]=delta===0?B.mul(profile.rates[k],model.dt*steps):B.max(0,B.sub(target,groups().read(state,k)));
      expected[k]={layer:predicted.layer,delta:floor+(delta-floor)*Math.pow(ratio,steps)};
    }
    const flux=progressCoordinates(profile),progressTotals={},nextProgress={};let naturalCap=null,expectedCap=null;
    for(const key of Object.keys(flux)){
      if(key==='$naturalCap'){
        const trend=model.progress?.[key],start=flux[key];
        // Last virtual micro-step reads its own start cap, not the cap at
        // the beginning of the whole map block, nor the final committed cap.
        const predicted={layer:start.layer,value:start.value+(trend?geometric(trend.delta*trend.ratio,trend.ratio,steps-1):0)};
        naturalCap=amount(predicted);if(!Number.isFinite(predicted.value)||!B.isFiniteBN(naturalCap)||naturalCap.layer!==predicted.layer)return null;
        expectedCap={layer:start.layer,start:start.value,value:start.value+(trend?geometric(trend.delta*trend.ratio,trend.ratio,steps):0)};
      }else{
      const prediction=progressTotal(flux[key],model.progress?.[key],steps,model.dt);if(prediction===null)return null;progressTotals[key]=prediction;
      }
      if(model.progress?.[key])nextProgress[key]={...model.progress[key],delta:model.progress[key].delta*Math.pow(model.progress[key].ratio,steps)};
    }
    return {gains,expected,progressTotals,naturalCap,expectedCap,steps,microDt:model.dt,seconds:model.dt*steps,model,nextModel:{...model,progress:nextProgress}};
  }
  function validate(candidate,plan){
    const profile=R.withState(candidate,()=>R.withProjection(()=>E.withIsolatedState(candidate,()=>WIS.Simulation.FixedSources.query(candidate))));
    const before=coordinates(candidate),next=nextCoordinates(candidate,profile,plan.microDt),errors={};let valid=true;
    for(const group of groups().groups)for(const key of group.keys){const expected=plan.expected[key],actual=next[key].value-before[key].value;
      const crossing=before[key].layer!==expected.layer||next[key].layer!==before[key].layer;
      const relative=Math.abs(actual-expected.delta)/Math.max(config().coordinateFloor,Math.abs(actual),Math.abs(expected.delta));
      errors[key]={group:group.id,layerChanged:crossing,actual,expected:expected.delta,relative};
      if(crossing||!Number.isFinite(relative)||relative>config().validationTolerance)valid=false;
    }
    if(plan.expectedCap){const actual=progressCoordinates(profile).$naturalCap,expected=plan.expectedCap;
      const crossing=actual.layer!==expected.layer,relative=Math.abs(actual.value-expected.value)/Math.max(config().coordinateFloor,Math.abs(expected.value-expected.start));
      errors.naturalCap={layerChanged:crossing,actual:actual.value,expected:expected.value,relative};
      if(crossing||!Number.isFinite(relative)||relative>config().validationTolerance)valid=false;
    }
    if(!valid){const error=Error('离散映射端点真实 rate 与预测趋势不符；候选未提交');error.code='discrete-map-rejected';error.mapErrors=errors;throw error;}
    return {errors,groups:plan.model.groups,virtualSteps:plan.steps};
  }
  WIS.Simulation.DiscreteMap=Object.freeze({coordinate,coordinates,signature,progressSignature,progressCoordinates,fit,forecast,validate,nextCoordinates});
}(window.WIS));
