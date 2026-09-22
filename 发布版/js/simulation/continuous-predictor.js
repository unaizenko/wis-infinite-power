(function(W){
  'use strict';
  const B=W.Core.BigNum,R=W.Core.Runtime,E=W.Core.Effects;
  const G=()=>W.Simulation.ResourceGroups,config=()=>W.Core.Config.offlinePredictor,P=()=>W.Simulation.Profiler;
  const copy=x=>JSON.parse(JSON.stringify(x));
  function coordinate(value){if(!B.isFiniteBN(value)||B.lt(value,0))throw Error('连续资源坐标无效');const n=B.BN(value);return {layer:n.layer,value:n.layer===0?n.toNumber():n.mag};}
  const amount=c=>c.layer===0?B.BN(c.value):B.Decimal.fromComponents(1,c.layer,c.value);
  const coordinates=s=>Object.fromEntries(G().keys.map(k=>[k,coordinate(G().read(s,k))]));
  function branch(value){if(typeof value==='number')return value>0;if(Array.isArray(value))return value.map(branch);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,branch(v)]));return value;}
  function signature(s){const i=s.cultivation.systems.immortal,x=W.Cultivation.Xiuzhen.get(s),n=s.meta.bigNumbers;
    return JSON.stringify([s.powerSystem.active,s.cultivation.active,s.highestScaleIndex,s.advancedRealmLevel,x.realm,x.entered,
      branch(s.powerSystem.systems.scale.upgrades),branch(s.powerSystem.systems.scale.actions),branch(Object.fromEntries(Object.entries(i.abilities).filter(([k])=>k!=='naturalTreasureLevel'))),branch(x.abilities),
      W.Meta.BigNumbers.treeSignature(s),s.meta.infinity.upgrades,s.activeChallenge,s.challengeCompletions,s.unlockedAchievements,n.unlocked,n.fractalLevel,n.beyondFractal,W.Meta.BigNumbers.MILESTONES.filter(v=>v<=n.gIndex),
      G().keys.map(k=>[coordinate(G().read(s,k)).layer,B.gte(G().read(s,k),'1e100')]),G().groups.map(g=>g.mapSignature(s))]);
  }
  function query(s,groupIds=null){return P().withScope('offline',()=>P().measure('resourceGroupWallMs',()=>R.withState(s,()=>R.withProjection(()=>R.withOfflineExecution(()=>E.withIsolatedState(s,()=>G().evaluate(s,{groupIds})))))));}
  function observation(s,profile,position=0){const c=coordinates(s),d={},dt=W.Core.Config.offlineHierarchy.microSeconds;
    for(const k of G().keys){const end=coordinate(B.add(G().read(s,k),B.mul(profile.rates[k],dt)));if(end.layer!==c[k].layer)return {position,coordinates:c,delta:null};d[k]=end.value-c[k].value;}
    return {position,coordinates:c,delta:d,rates:Object.fromEntries(G().keys.map(k=>[k,coordinate(profile.rates[k])]))};
  }
  const I=[[1,0],[0,1]],Z=[[0,0],[0,0]],zero=[0,0];
  const add=(a,b)=>a.map((r,i)=>r.map((v,j)=>v+b[i][j]));
  const mul=(a,b)=>a.map(r=>b[0].map((_,j)=>r[0]*b[0][j]+r[1]*b[1][j]));
  const mv=(a,b)=>a.map(r=>r[0]*b[0]+r[1]*b[1]);
  const va=(a,b)=>a.map((v,i)=>v+b[i]);
  function compose(a,b){return {A:mul(b.A,a.A),b:va(mv(b.A,a.b),b.b),sum:add(a.sum,mul(b.sum,a.A)),offset:va(va(a.offset,mv(b.sum,a.b)),b.offset)};}
  function evolve(A,b,delta,n){let out={A:I,b:zero,sum:Z,offset:zero},power={A,b,sum:I,offset:zero};
    while(n>0){if(n%2)out=compose(out,power);n=Math.floor(n/2);if(n)power=compose(power,power);}
    return {gain:va(mv(out.sum,delta),out.offset),next:va(mv(out.A,delta),out.b)};
  }
  function pairFit(rows,outputs){
    const scales=outputs.map(k=>Math.max(config().coordinateFloor,...rows.map(p=>Math.abs(p.delta[k]))));
    const samples=rows.slice(1).map((p,j)=>({a:rows[j],b:p})).filter(p=>p.b.position-p.a.position===1).map(p=>({x:outputs.map((k,i)=>p.a.delta[k]/scales[i]),y:outputs.map((k,i)=>p.b.delta[k]/scales[i])}));
    if(samples.length<config().learnSteps-1)return null;
    const mean=key=>[0,1].map(i=>samples.reduce((s,p)=>s+p[key][i],0)/samples.length),mx=mean('x'),my=mean('y');let xx=0,xy=0,yy=0;const cross=[[0,0],[0,0]];
    for(const p of samples){const x=p.x.map((v,i)=>v-mx[i]),y=p.y.map((v,i)=>v-my[i]);xx+=x[0]*x[0];xy+=x[0]*x[1];yy+=x[1]*x[1];for(let i=0;i<2;i++)for(let j=0;j<2;j++)cross[i][j]+=y[i]*x[j];}
    const discriminant=Math.hypot(xx-yy,2*xy),large=(xx+yy+discriminant)/2,small=(xx+yy-discriminant)/2,condition=large/small;
    if(!(small>0)||!Number.isFinite(condition)||condition>config().conditionLimit)return null;
    const det=xx*yy-xy*xy,A=mul(cross,[[yy/det,-xy/det],[-xy/det,xx/det]]),b=va(my,mv(A,mx).map(v=>-v));
    const residual=Math.max(...samples.flatMap(p=>va(mv(A,p.x),b).map((v,i)=>Math.abs(v-p.y[i])/Math.max(config().coordinateFloor,Math.abs(p.y[i])))));
    if(![...A.flat(),...b,residual].every(Number.isFinite)||residual>config().fitTolerance)return null;
    return {type:'pair',outputs,scales,A,b,condition,residual};
  }
  function scalarFit(rows,outputs){const parameters={};
    for(const k of outputs){const ds=rows.map(p=>p.delta[k]);let ratio=1,floor=0;
      if(ds.some(d=>d<-config().coordinateFloor))return null;
      if(ds.every(d=>Math.abs(d)<=config().coordinateFloor)){parameters[k]={ratio:1,floor:0};continue;}
      const logs=ds.slice(1).map((d,i)=>({n:rows[i+1].position-rows[i].position,value:d>0&&ds[i]>0?Math.log(d/ds[i]):NaN})).filter(v=>v.n>0).map(v=>v.value/v.n),mean=logs.reduce((a,b)=>a+b,0)/logs.length;
      let stable=Number.isFinite(mean)&&logs.every(v=>Math.abs(v-mean)<=config().fitTolerance);ratio=Math.exp(mean);
      const changes=ds.slice(1).map((d,i)=>d-ds[i]),rs=changes.slice(1).map((d,i)=>d/changes[i]);
      if(rows.slice(1).every((p,i)=>p.position-rows[i].position===1)&&rs.every(v=>v>0&&v<.98)&&Math.max(...rs)-Math.min(...rs)<config().fitTolerance){const r=rs.reduce((a,b)=>a+b,0)/rs.length,f=(ds.at(-1)-r*ds.at(-2))/(1-r);if(f>=0&&Number.isFinite(f)){ratio=r;floor=f;stable=true;}}
      if(!stable)return null;
      parameters[k]={ratio,floor};
    }
    return {type:'scalar',outputs,parameters};
  }
  function fit(rows){return P().measure('mapFitWallMs',()=>{
    if(rows.length<config().learnSteps||rows.some(p=>!p.delta))return null;
    const models=[];for(const group of W.Simulation.PredictorGroups.all()){
      const pair=group.outputs.length===2?pairFit(rows,group.outputs):null,model=pair||fallbackFit(rows,group.outputs);if(!model)return null;
      models.push({...model,id:group.id});P().record('modelType.'+model.type);
    }return {models};
  });}
  function geometric(a,r,n){return Math.abs(r-1)<1e-10?a*n:a*Math.expm1(n*Math.log(r))/(r-1);}
  function forecast(point,model,steps){if(!point.delta)return null;const result=copy(point.coordinates),expected={},rates={};
    for(const m of model.models){if(m.type==='rate'){
      if(!point.rates)return null;
      for(const k of m.outputs){const start=point.rates[k],p=m.parameters[k],at=i=>{const c={layer:start.layer,value:start.value+(p.shape==='power'?p.amplitude*Math.log1p(i/p.age):geometric(p.delta,p.ratio,i))};if(!Number.isFinite(c.value))return null;const v=amount(c);return B.isFiniteBN(v)&&B.gte(v,0)&&v.layer===c.layer?v:null;};
        let sum=B.ZERO;for(let lo=0;lo<steps;){const count=Math.min(steps-lo,Math.ceil(steps/config().rateSumBins)),a=at(lo),b=at(lo+count-1);if(!a||!b)return null;let total;
          if(count===1||B.eq(a,b))total=B.mul(a,count);
          else if(B.lte(a,0)||B.lte(b,0))return null;
          else {const r=B.pow(B.div(b,a),1/(count-1));total=B.eq(r,1)?B.mul(a,count):B.mul(a,B.div(B.sub(B.pow(r,count),1),B.sub(r,1)));}
          sum=B.add(sum,total);lo+=count;}
        const stock=amount(point.coordinates[k]),target=B.add(stock,B.mul(sum,W.Core.Config.offlineHierarchy.microSeconds)),endRate=at(steps);if(!B.isFiniteBN(target)||!endRate||target.layer!==point.coordinates[k].layer)return null;
        rates[k]=coordinate(endRate);result[k]=coordinate(target);expected[k]=coordinate(B.add(target,B.mul(endRate,W.Core.Config.offlineHierarchy.microSeconds))).value-result[k].value;
      }
    }else if(m.type==='pair'){
      const d=m.outputs.map((k,i)=>point.delta[k]/m.scales[i]),p=evolve(m.A,m.b,d,steps);
      for(let i=0;i<2;i++){const k=m.outputs[i];result[k].value+=p.gain[i]*m.scales[i];expected[k]=p.next[i]*m.scales[i];}
    }else for(const k of m.outputs){const {ratio,floor}=m.parameters[k],delta=point.delta[k];result[k].value+=floor*steps+geometric(delta-floor,ratio,steps);expected[k]=floor+(delta-floor)*Math.pow(ratio,steps);}}
    for(const k of G().keys){const c=result[k];if(!Number.isFinite(c.value)||!Number.isFinite(expected[k])||expected[k]<0||c.value<point.coordinates[k].value)return null;const n=amount(c);if(!B.isFiniteBN(n)||n.layer!==c.layer)return null;}
    return {coordinates:result,expected,rates,steps};
  }
  function travel(origin,target){let maximum=0;for(const k of G().keys){if(origin[k].layer!==target[k].layer)return Infinity;const a=origin[k].layer===0?Math.log10(1+origin[k].value):origin[k].value,b=target[k].layer===0?Math.log10(1+target[k].value):target[k].value;maximum=Math.max(maximum,Math.abs(b-a)/Math.max(1,Math.abs(a)));}return maximum;}
  function install(s,c){for(const k of G().keys)G().write(s,k,amount(c[k]));}
  function error(point,predicted){if(!point.delta)return Infinity;return Math.max(...G().keys.map(k=>Math.abs(point.delta[k]-predicted.expected[k])/Math.max(config().coordinateFloor,Math.abs(point.delta[k]),Math.abs(predicted.expected[k]))));}
  function rebase(model,old,actual,steps,{validated=null}={}){if(!model||!actual.delta)return null;const next=copy(model),prediction=steps>0?forecast(old,model,steps):{expected:old.delta};
    // A settlement changes the current rate/coordinate anchor. Translating
    // its jump into an increment equilibrium creates a fictitious permanent
    // source. Keep the learned dynamics and validate from the new true rate.
    if(steps===0)return next;
    for(const m of next.models){
      if(validated&&!m.outputs.some(k=>validated.includes(k))){
        if(m.type==='rate')for(const p of Object.values(m.parameters)){if(p.shape==='power')p.age+=steps;else p.delta*=Math.pow(p.ratio,steps);}
        continue;
      }
      if(m.type==='rate'){for(const k of m.outputs){const a=old.rates?.[k],b=actual.rates?.[k],p=m.parameters[k];if(a&&b&&a.layer===b.layer){if(p.shape==='power'){const travel=Math.log1p(steps/p.age);p.amplitude=(b.value-a.value)/travel;p.age+=steps;continue;}const travel=b.value-a.value,predictedTravel=geometric(p.delta,p.ratio,steps);if(travel*predictedTravel>0&&steps>1){const r=p.ratio*Math.exp(Math.log(travel/predictedTravel)*2/(steps+1));if(Number.isFinite(r)&&r>0)p.ratio=r;}const divisor=geometric(1,p.ratio,steps);if(divisor)p.delta=(b.value-a.value)/divisor*Math.pow(p.ratio,steps);}}}
      else if(m.type==='pair')continue;
      else for(const k of m.outputs){const p=m.parameters[k],a=actual.delta[k],b=old.delta?.[k];if(p.floor>0)p.floor=Math.max(0,p.floor+a-(prediction?.expected[k]??a));else if(steps>0&&a>0&&b>0)p.ratio=Math.exp(Math.log(a/b)/steps);}
    }return next;
  }
  function checkpoint(value){
    if(!value)return null;
    const serialized=JSON.stringify(value);if(serialized.length>65536)throw Error('预测 checkpoint 超过固定容量');
    const p=JSON.parse(serialized),q=config(),keys=G().keys;
    const number=n=>typeof n==='number'&&Number.isFinite(n);
    const coord=c=>c&&Number.isSafeInteger(c.layer)&&c.layer>=0&&number(c.value)&&(c.layer!==0||c.value>=0);
    const vector=v=>v&&keys.every(k=>number(v[k]));
    const coords=v=>v&&keys.every(k=>coord(v[k]));
    const point=o=>o&&number(o.position)&&o.position>=0&&coords(o.coordinates)&&(o.delta===null||vector(o.delta))&&(!o.rates||coords(o.rates))&&(!o.origin||["micro","fixed","endpoint","settlement"].includes(o.origin));
    if(p.version!==1||typeof p.mapSignature!=='string'||p.mapSignature.length>32768||!Array.isArray(p.observations)||p.observations.length>q.observationLimit||!p.observations.every(point)||
      !number(p.position)||p.position<0||!coords(p.trustRegionOrigin)||!number(p.confidence)||p.confidence<0||p.confidence>1||!Number.isSafeInteger(p.blockSize)||p.blockSize<1||p.blockSize>q.maxMapSteps||
      !Number.isSafeInteger(p.largestAccepted)||p.largestAccepted<0||p.largestAccepted>q.maxMapSteps)throw Error('预测 checkpoint 参数无效');
    if(p.model){
      const models=p.model.models,owned=[];
      if(!Array.isArray(models)||models.length>keys.length)throw Error('预测 checkpoint 组无效');
      for(const m of models){
        if(!Array.isArray(m.outputs)||!m.outputs.length||typeof m.id!=='string'||m.id.length>128||m.outputs.some(k=>!keys.includes(k)||owned.includes(k)))throw Error('预测 checkpoint 输出无效');
        owned.push(...m.outputs);
        if(m.type==='pair'){
          if(m.outputs.length!==2||!Array.isArray(m.scales)||m.scales.length!==2||!m.scales.every(n=>number(n)&&n>0)||!Array.isArray(m.A)||m.A.length!==2||m.A.some(row=>!Array.isArray(row)||row.length!==2||!row.every(number))||!Array.isArray(m.b)||m.b.length!==2||!m.b.every(number)||!number(m.condition)||m.condition>q.conditionLimit||!number(m.residual)||m.residual>q.fitTolerance)throw Error('预测 checkpoint 二维模型无效');
        }else if(['scalar','rate'].includes(m.type)){
          if(!m.parameters||!m.outputs.every(k=>{const a=m.parameters[k];return a&&number(a.ratio)&&a.ratio>0&&(m.type==='scalar'?number(a.floor)&&a.floor>=0:number(a.delta))&&(!a.shape||(a.shape==='power'&&number(a.age)&&a.age>0&&number(a.amplitude)));}))throw Error('预测 checkpoint 标量模型无效');
        }else throw Error('预测 checkpoint 模型类型无效');
      }
      if(owned.length!==keys.length)throw Error('预测 checkpoint 输出不完整');
    }
    if(p.validation){
      const ids=G().groups.map(g=>g.id);
      if(typeof p.validation!=='object'||Array.isArray(p.validation)||Object.keys(p.validation).some(id=>!ids.includes(id))||Object.values(p.validation).some(v=>!v||![1,2,4,8].includes(v.interval)||!Number.isSafeInteger(v.count)||v.count<0||!Number.isSafeInteger(v.stable)||v.stable<0||v.stable>3))throw Error('验证 cadence checkpoint 无效');
    }
    if(p.policy){
      const ids=W.Simulation.PredictorGroups.all().map(g=>g.id),v=p.policy;
      if(v.version!==1||!Number.isInteger(v.tier)||v.tier<0||v.tier>=q.mapStepTiers.length||!Number.isInteger(v.failures)||v.failures<0||v.failures>q.consecutiveRejects||!v.groups||Array.isArray(v.groups)||Object.keys(v.groups).some(id=>!ids.includes(id)))throw Error('Map policy 无效');
      for(const row of Object.values(v.groups))if(!row||!number(row.cooldown)||row.cooldown<0||row.cooldown>q.cooldownSeconds||!Number.isInteger(row.anchors)||row.anchors<0||row.anchors>3||row.shocks!=null&&(!Number.isInteger(row.shocks)||row.shocks<0||row.shocks>2)||!Array.isArray(row.window)||row.window.length>q.profitWindow||row.window.some(x=>!Array.isArray(x)||x.length!==2||x.some(n=>!number(n)||n<0)))throw Error('Map cooldown/window 超出固定容量');
    }
    return {version:1,mapSignature:p.mapSignature,model:p.model,observations:p.observations,position:p.position,blockSize:p.blockSize,confidence:p.confidence,trustRegionOrigin:p.trustRegionOrigin,largestAccepted:p.largestAccepted,...(p.validation?{validation:p.validation}:{}),...(p.policy?{policy:p.policy}:{}),needsCalibration:p.needsCalibration===true};
  }
  function rateFit(rows,outputs){if(rows.length<2||rows.some(p=>!p.rates))return null;const parameters={};
    for(const k of outputs){const values=rows.map(p=>p.rates[k]);if(values.some(v=>v.layer!==values[0].layer))return null;
      const slopes=rows.slice(1).map((p,i)=>({d:(values[i+1].value-values[i].value)/(p.position-rows[i].position),at:(p.position+rows[i].position)/2,gap:p.position-rows[i].position})).filter(p=>p.gap>0);
      if(!slopes.length)return null;let ratio=1,delta=slopes.at(-1).d;
      if(slopes.every(p=>Math.abs(p.d)<=config().coordinateFloor))delta=0;
      else if(slopes.length>1){const logs=slopes.slice(1).map((p,i)=>Math.log(p.d/slopes[i].d)/(p.at-slopes[i].at));if(logs.every(Number.isFinite)){const mean=logs.reduce((a,b)=>a+b,0)/logs.length;if(logs.every(v=>Math.abs(v-mean)<config().fitTolerance)){ratio=Math.exp(mean);delta*=Math.pow(ratio,slopes.at(-1).gap/2+.5);}}}
      if(!Number.isFinite(delta)||!Number.isFinite(ratio))return null;parameters[k]={ratio,delta};
      // A decaying rate-coordinate slope often follows a power sequence in
      // ordinary stock space. Fit reciprocal slopes, still a discrete sampled
      // rate model; no resource ODE or numerical integration is invoked.
      if(slopes.length>=2&&slopes.every(p=>p.d>config().coordinateFloor)){
        const first=slopes[0],last=slopes.at(-1),gradient=(1/last.d-1/first.d)/(last.at-first.at);
        if(Number.isFinite(gradient)&&gradient>0){const amplitude=1/gradient,age=amplitude/last.d+rows.at(-1).position-last.at;
          const residual=Math.max(...slopes.map(p=>Math.abs(amplitude/(age+p.at-rows.at(-1).position)-p.d)/Math.max(config().coordinateFloor,p.d)));
          if(Number.isFinite(age)&&age>0&&residual<=config().fitTolerance)parameters[k]={shape:'power',amplitude,age,ratio:1,delta:last.d};
        }
      }
    }return {type:'rate',outputs,parameters};
  }
  function fallbackFit(rows,outputs){
    const layered=outputs.every(k=>rows.at(-1).coordinates[k].layer>=2||rows.every(p=>Math.abs(p.delta[k])<=config().coordinateFloor));
    return layered?(scalarFit(rows,outputs)||rateFit(rows,outputs)):(rateFit(rows,outputs)||scalarFit(rows,outputs));
  }
  function fitGroup(rows,id){
    const group=W.Simulation.PredictorGroups.all().find(g=>g.id===id);
    if(!group||rows.length<2||rows.some(p=>!p.delta))return null;
    const model=(group.outputs.length===2?pairFit(rows,group.outputs):null)||fallbackFit(rows,group.outputs);
    return model&&{...model,id};
  }
  function scalarModel(rows){if(rows.length<2||rows.some(p=>!p.delta))return null;const models=W.Simulation.PredictorGroups.all().map(g=>{const m=fallbackFit(rows,g.outputs);return m&&{...m,id:g.id};});return models.every(Boolean)?{models}:null;}
  function mapEligible(rows,point,model,steps){
    if(!point.delta||rows.length<2)return {eligible:false,reason:'observations'};
    if(rows.slice(-3).some(p=>!p.delta||G().keys.some(k=>p.coordinates[k].layer!==point.coordinates[k].layer||p.delta[k]<0)))return {eligible:false,reason:'coordinateStructure'};
    const recent=rows.slice(-3);
    for(const k of recent.every((p,i)=>p.origin==='micro'&&(i===0||p.position-recent[i-1].position===1))?G().keys:[]){
      const ds=recent.map(p=>p.delta[k]);if(ds.every(d=>d<=config().coordinateFloor))continue;
      if(ds.some(d=>d<=config().coordinateFloor))return {eligible:false,reason:'incrementActivation'};
      const slopes=recent.slice(1).map((p,i)=>Math.log(ds[i+1]/ds[i])/(p.position-recent[i].position));
      if(slopes.some(v=>!Number.isFinite(v))||Math.max(...slopes)-Math.min(...slopes)>config().fitTolerance)return {eligible:false,reason:'incrementShock'};
    }
    // Thin eligibility screen. Do not turn a rough secondary model into
    // repeated tiny forecast searches; validation and profitability own that.
    return {eligible:true,maxSteps:steps};
  }
  W.Simulation.ContinuousPredictor=Object.freeze({coordinate,coordinates,signature,query,observation,fit,forecast,travel,install,error,rebase,checkpoint,evolve,copy,scalarModel,fitGroup,mapEligible});
})(window.WIS);
