(function(W){
  'use strict';
  const B=W.Core.BigNum,R=W.Core.Runtime,E=W.Core.Effects,S=W.Core.State;
  const C=()=>W.Simulation.ContinuousPredictor,G=()=>W.Simulation.ResourceGroups,P=()=>W.Simulation.Profiler,cfg=()=>W.Core.Config.offlinePredictor;
  function source(s,resourceProfile=null){return R.withState(s,()=>R.withProjection(()=>R.withOfflineExecution(()=>E.withIsolatedState(s,()=>W.Simulation.FixedSources.query(s,{resourceProfile})))));}
  function flux(profile){return Object.fromEntries([['$exploration',profile.cultivation.explorationAmount],...profile.rewards.map(r=>[r.key,r.eligible?B.mul(r.units,r.gain):B.ZERO])]);}
  function fluxSum(a,b,seconds,micro){const n=seconds/micro,result={};
    for(const k of Object.keys(a)){const x=a[k],y=b[k];let value;
      if(B.eq(x,y)||n<=1+1e-9)value=B.mul(x,seconds);
      else if(B.lte(x,0)||B.lte(y,0))value=B.mul(B.add(x,y),seconds/2);
      else {const ratio=B.pow(B.div(y,x),1/n);value=B.eq(ratio,1)?B.mul(x,seconds):B.mul(B.mul(x,micro),B.div(B.sub(B.pow(ratio,n),1),B.sub(ratio,1)));}
      if(!B.isFiniteBN(value)||B.lt(value,0))throw Error('确定性进度汇总不可表示');result[k]=value;
    }return result;
  }
  // Deterministic query-equivalent cost keeps scheduling independent of host
  // speed. Wall time is measured separately by the profiler, never persisted
  // as an input to prefix-sensitive game decisions.
  function profitability(window){
    if(window.length<cfg().profitWindow)return null;
    const accepted=window.filter(x=>x[0]>0),steps=accepted.reduce((n,x)=>n+x[0],0),queries=window.reduce((n,x)=>n+x[1],0);
    if(1-accepted.length/window.length>cfg().maxRejectRatio)return 'reject-rate';
    if(steps/Math.max(1,accepted.length)<cfg().minProfitableSteps)return 'short-span';
    return queries>=steps-accepted.length?'validation-cost':null;
  }
  function create(initial,seconds,options){
    const s=S.createDraft(initial).state,dt=W.Core.Config.offlineHierarchy.microSeconds;
    const initialProfile=options.sourceProfile||source(s),startSignature=C().signature(s),saved=options.predictor?C().checkpoint(options.predictor):null;
    let model=saved?.mapSignature===startSignature?saved.model:null,history=saved?.mapSignature===startSignature?saved.observations:[],position=saved?.position||0,blockSize=saved?.blockSize||cfg().initialMapSteps;
    let confidence=saved?.confidence??1,origin=saved?.trustRegionOrigin||C().coordinates(s),elapsed=0,profile=initialProfile,point={...C().observation(s,profile,position),origin:"settlement"},signature=startSignature;
    let calibrate=saved?.needsCalibration?cfg().rebaseObservations:0,calibrationRows=[];
    let recentRebase=true,largestAccepted=saved?.largestAccepted||0,consecutiveFailures=0,done=false,useFixedFallback=false;
    const savedPolicy=saved?.mapSignature===startSignature?saved.policy:null;
    const policy=savedPolicy?C().copy(savedPolicy):{version:1,tier:0,failures:0,groups:{}};
    for(const group of W.Simulation.PredictorGroups.all())policy.groups[group.id]||={cooldown:0,anchors:0,shocks:0,window:[]};
    const anchoring=()=>Object.values(policy.groups).some(g=>g.anchors>0);
    const cooling=()=>Object.values(policy.groups).some(g=>g.cooldown>0&&!g.anchors);
    const stats={realMicroSteps:0,mapAccepted:0,mapRejected:0,coldModelBuilds:0,hardInvalidations:0,hardReasons:{},softRebases:0,endpointValidations:0,sentinelValidations:0,blockHistogram:{},virtualSteps:0,maximumBlockSteps:0,mapEligible:0,mapConsidered:0,shockRebases:0,dualDisagreements:0,fixedFallbacks:0,validationSkipped:0,cadenceMicroSteps:0,frozenDirectSteps:0,mapCooldowns:0,shockAnchors:0,progressQueries:0};
    const gains=Object.fromEntries(G().keys.map(k=>[k,B.ZERO])),progress=Object.fromEntries(Object.keys(flux(initialProfile)).map(k=>[k,B.ZERO]));
    const bins=options.strong?Math.min(cfg().progressSamples-1,Math.max(1,Math.floor(seconds/dt+1e-8))):1;
    const nodes=Array.from({length:bins+1},(_,i)=>i===bins?seconds:Math.floor(seconds/dt*i/bins+1e-8)*dt);
    const cadence=Object.fromEntries(G().groups.map(g=>[g.id,{interval:1,stable:0,count:0,...saved?.validation?.[g.id]}]));
    let sample=0,lastFlux=flux(initialProfile),sampleAt=0,queryCosts=[],special=null;
    stats.scaleKernelSteps=0;stats.scaleIntervals=0;stats.coupledKernelSteps=0;stats.coupledIntervals=0;
    function advanceScale(){
      const K=W.Power.ScaleKernel,part=Math.min(dt,special.seconds-special.elapsed);
      if(!special.coupled&&special.elapsed>=special.nextSample-1e-9){
        const span=Math.min(special.sampleSeconds,special.seconds-special.elapsed),view=Object.create(s);
        Object.defineProperties(view,Object.fromEntries(Object.entries(special.dynamic).map(([k,value])=>[k,{value,writable:true,configurable:true}])));
        const bc=C().query(view,['immortal','xiuzhen']);
        for(const k of special.externalKeys)special.externalGains[k]=B.add(special.externalGains[k],B.mul(bc.rates[k],span));
        special.nextSample+=span;P().record('scaleTrajectoryQueries');
      }
      const t=performance.now();
      if(special.coupled){special.dynamic=special.coupled.step(special.profile,part).state;stats.coupledKernelSteps++;P().record('coupledKernelSteps');P().record('coupledKernelWallMs',performance.now()-t);}
      else {special.dynamic=K.scaleKernelStep(special.dynamic,special.profile,part).state;P().record('scaleKernelWallMs',performance.now()-t);P().record('scaleKernelSteps');stats.scaleKernelSteps++;}
      special.elapsed+=part;
      if(special.elapsed<special.seconds-1e-9)return;
      const duration=special.seconds,currentFlux=special.flux;
      const prior=fluxSum(lastFlux,currentFlux,elapsed-sampleAt,dt);
      for(const k of Object.keys(progress))progress[k]=B.add(progress[k],B.add(prior[k],B.mul(currentFlux[k],duration)));
      for(const k of G().keys){const accelerated=special.coupled?special.coupled.outputs.includes(k):['joules','power'].includes(k);const gain=accelerated?B.max(0,B.sub(special.coupled?G().read(special.dynamic,k):special.dynamic[k],G().read(s,k))):special.externalGains[k]??B.mul(profile.rates[k],duration);G().write(s,k,B.add(G().read(s,k),gain));gains[k]=B.add(gains[k],gain);}
      if(special.coupled)for(const key of W.Simulation.CoupledResourceKernel.statisticKeys)s[key]=special.dynamic[key];
      else s.highestPower=B.max(s.highestPower,special.dynamic.highestPower);
      elapsed=Math.min(seconds,elapsed+duration);position+=duration/dt;sampleAt=elapsed;lastFlux=null;
      while(sample+1<nodes.length-1&&nodes[sample+1]<elapsed-1e-8)sample++;
      for(const row of Object.values(policy.groups))row.cooldown=Math.max(0,row.cooldown-duration);
      stats.realMicroSteps++;stats.frozenDirectSteps++;if(special.coupled){stats.coupledIntervals++;P().record('coupledIntervals');}else {stats.scaleIntervals++;P().record('scaleIntervals');}
      profile=C().query(s);point={...C().observation(s,profile,position),origin:'fixed'};remember(point);special=null;
    }
    if(!options.strong)return {advance(){return P().withScope('offline',()=>{
      if(done)throw Error('资源检查点候选已完成');
      if((options.directWork||0)>=W.Core.Config.offlineHierarchy.maxDirectWork){const error=Error('真实固定段预算耗尽；离线债务保留');error.code='direct-work-budget';throw error;}
      for(const k of G().keys){gains[k]=B.mul(initialProfile.rates[k],seconds);const value=B.add(G().read(s,k),gains[k]);if(!B.isFiniteBN(value)||B.lt(value,0))throw Error('固定收益不可表示');G().write(s,k,value);}
      for(const [k,value] of Object.entries(lastFlux))progress[k]=B.mul(value,seconds);
      stats.realMicroSteps=1;stats[seconds<=dt+1e-8?'cadenceMicroSteps':'frozenDirectSteps']=1;P().record('realMicroSteps');
      for(const row of Object.values(policy.groups)){row.cooldown=Math.max(0,row.cooldown-seconds);row.anchors=0;}
      const endpoint=C().observation(s,initialProfile,position+seconds/dt);
      done=true;return {done:true,result:{gains,progressTotals:progress,stats,endpoint,
        predictor:saved?{...saved,model:null,observations:[],mapSignature:C().signature(s),position:position+seconds/dt,trustRegionOrigin:C().coordinates(s),policy}:null}};
    });}};
    function cooldown(reason,ids=Object.keys(policy.groups),shock=false){
      for(const id of ids){const row=policy.groups[id];if(!row)continue;row.cooldown=cfg().cooldownSeconds;row.anchors=shock?3:0;row.shocks=shock?Math.min(2,(row.shocks||0)+1):0;row.window=[];
        const group=model?.models.find(g=>g.id===id);
        for(const g of G().groups)if(group?.outputs.some(k=>g.outputs.includes(k)))Object.assign(cadence[g.id],{interval:1,stable:0,count:0});
      }
      stats.mapCooldowns++;P().record('mapCooldown.'+reason);P().record('mapCooldowns');
      if(shock){stats.shockRebases++;P().record('shockRebases');}
      policy.failures=0;policy.tier=0;recentRebase=true;
    }
    function outcome(steps,checked){
      for(const [id,row] of Object.entries(policy.groups)){
        const group=model?.models.find(g=>g.id===id),queries=(checked.queried||[]).filter(gid=>G().groups.find(g=>g.id===gid)?.outputs.some(k=>group?.outputs.includes(k))).length;
        if(steps>0)row.shocks=0;row.window.push([steps,queries]);row.window=row.window.slice(-cfg().profitWindow);
        const reason=profitability(row.window);if(reason)cooldown(reason,[id]);
      }
    }
    function hard(reason,shock=false){
      for(const c of Object.values(cadence))Object.assign(c,{interval:1,stable:0,count:0});
      for(const row of Object.values(policy.groups))Object.assign(row,{cooldown:0,anchors:0,shocks:0,window:[]});policy.tier=0;policy.failures=0;
      model=null;history=[];confidence=1;blockSize=cfg().initialMapSteps;origin=C().coordinates(s);
      if(reason==='endpointMismatch'){
        // A rate shock is not a formula-branch change. The protected region
        // still uses the validated cold-start fallback until its local model
        // is reliable; this cost is reported separately from hard invalidation.
        stats[shock?'shockRebases':'softRebases']++;P().record(shock?'shockRebases':'modelMismatchRebase');return;
      }
      stats.hardInvalidations++;stats.hardReasons[reason]=(stats.hardReasons[reason]||0)+1;P().record('hardInvalidation.'+reason);
    }
    function remember(p){history.push(C().copy(p));history=history.slice(-cfg().observationLimit);}
    function sampleProgress(){
      const needed=(profile.unvalidated||[]).filter(id=>W.Simulation.FixedSources.progressDependencies.includes(id));
      if(needed.length){
        stats.progressQueries++;P().record("progressQueries");for(const id of needed)P().record("progressQuery."+id);
        const missing=C().query(s,needed);
        profile={...profile,rates:{...profile.rates,...missing.rates},cultivation:missing.cultivation||profile.cultivation,unvalidated:profile.unvalidated.filter(id=>!needed.includes(id))};
        const actual={...C().observation(s,profile,position),origin:point.origin};model=C().rebase(model,point,actual,0);point=actual;
      }
      const f=source(s,profile),next=flux(f),part=fluxSum(lastFlux,next,elapsed-sampleAt,dt);
      for(const k of Object.keys(progress))progress[k]=B.add(progress[k],part[k]);lastFlux=next;sampleAt=elapsed;sample++;
    }
    function verify(prediction,name){
      const rates={};for(const k of G().keys){const c=prediction.coordinates[k],n=c.layer===0?B.BN(c.value):B.Decimal.fromComponents(1,c.layer,c.value),end=c.layer===0?B.BN(c.value+prediction.expected[k]):B.Decimal.fromComponents(1,c.layer,c.value+prediction.expected[k]);const forecastRate=prediction.rates?.[k];rates[k]=forecastRate?(forecastRate.layer===0?B.BN(forecastRate.value):B.Decimal.fromComponents(1,forecastRate.layer,forecastRate.value)):prediction.expected[k]===0?profile.rates[k]:B.div(B.max(0,B.sub(end,n)),dt);}
      const ids=G().groups.filter(g=>{
        // A dependency is an input STOCK, never an instruction to recursively
        // evaluate the owning resource's rate. All selected groups see s.
        const available=[...g.outputs,...g.mapDependencies].every(k=>prediction.coordinates[k]);
        const scalar=g.outputs.every(k=>model.models.some(m=>['scalar','rate'].includes(m.type)&&m.outputs.includes(k)));
        return name==='sentinelValidation'||recentRebase||!available||!scalar||C().travel(origin,prediction.coordinates)>cfg().sentinelTravel||cadence[g.id].count++%cadence[g.id].interval===0;
      }).map(g=>g.id);
      queryCosts.push(...ids);for(const id of ids)P().record('validationGroup.'+id);
      if(ids.length){P().record(name);stats[name==='sentinelValidation'?'sentinelValidations':'endpointValidations']++;}
      else {stats.validationSkipped++;P().record('validationSkipped');}

      C().install(s,prediction.coordinates);if(C().signature(s)!==signature)return {error:Infinity,structural:true};const began=performance.now(),queried=ids.length?C().query(s,ids):null;
      const merged={...profile,rates:{...rates,...queried?.rates},cultivation:queried?.cultivation||profile.cultivation,unvalidated:G().groups.filter(g=>!ids.includes(g.id)).map(g=>g.id)};
      const p={...C().observation(s,merged,position+prediction.steps),origin:"endpoint"};P().record('validationWallMs',performance.now()-began);
      if(name==='endpointValidation')for(const g of G().groups)if(ids.includes(g.id)){
        const item=cadence[g.id],err=p.delta?Math.max(...g.outputs.map(k=>Math.abs(p.delta[k]-prediction.expected[k])/Math.max(cfg().coordinateFloor,Math.abs(p.delta[k]),Math.abs(prediction.expected[k])))):Infinity;
        if(err<cfg().validationTolerance/10){item.stable++;if(item.stable>=3){item.interval=Math.min(cfg().validationMaxInterval,item.interval*2);item.stable=0;}}
        else {item.interval=1;item.stable=0;}
      }
      return {point:p,profile:merged,error:C().error(p,prediction),expected:prediction.expected,queried:[...queryCosts]};
    }
    function advanceOne(){
      if(options.executorKind==='coupled-kernel'&&!special&&elapsed<seconds-1e-8){
        if((options.directWork||0)+stats.realMicroSteps>=W.Core.Config.offlineHierarchy.maxDirectWork){const error=Error('真实固定段预算耗尽；保留离线债务');error.code='direct-work-budget';error.evolutionStats=stats;throw error;}
        const coupled=options.kernelBackend==='formal'?W.Simulation.CoupledResourceKernel.create(['scale','immortal']):W.Simulation.CoordinateCoupledKernel.create();
        const compiled=coupled.compileCoupledFastProfile(s);
        special={coupled,profile:compiled,seconds:seconds-elapsed,elapsed:0,flux:lastFlux,externalGains:{}};
      }
      if(special){advanceScale();return;}
      if(lastFlux===null)lastFlux=flux(source(s,profile));
      const newSignature=C().signature(s);if(newSignature!==signature){hard('mapSignature');signature=newSignature;}
      if(!history.length)remember(point);
      if(options.strong&&!model&&!calibrate&&!cooling()&&!anchoring()&&history.length>=cfg().learnSteps){model=C().fit(history);if(model){stats.coldModelBuilds++;P().record('coldModelBuilds');origin=C().coordinates(s);}}
      const remaining=Math.max(0,nodes[sample+1]-elapsed),whole=Math.floor(remaining/dt+1e-8);
      const layered=Object.values(point.coordinates).some(c=>c.layer>=2)||W.Simulation.CheckpointStrategy.movement(s,profile,dt,true)>cfg().fallbackCoordinateTravel;
      // Finish the pending real observations before reconsidering eligibility.
      // Re-fitting the old history here would restart calibration indefinitely.
      const eligible=options.strong&&model&&!calibrate&&!cooling()&&!anchoring()&&point.delta?C().mapEligible(history,point,model,Math.min(whole,blockSize)):null;
      if(eligible){stats.mapConsidered++;if(eligible.eligible)stats.mapEligible++;else stats.dualDisagreements++;}
      if(eligible&&!eligible.eligible)cooldown('ineligible');
      if(W.Core.Config.offlineHierarchy.mapEnabled&&options.strong&&model&&!calibrate&&point.delta&&whole>=1&&!cooling()&&!anchoring()&&!useFixedFallback){
        blockSize=cfg().mapStepTiers[policy.tier];
        let n=Math.min(whole,blockSize,eligible?.maxSteps||whole),predicted;
        while(n>=1){predicted=C().forecast(point,model,n);if(predicted&&C().travel(origin,predicted.coordinates)<=cfg().maxCoordinateTravelSinceFit)break;if(policy.tier===0){n=0;break;}policy.tier--;n=Math.min(whole,cfg().mapStepTiers[policy.tier],eligible?.maxSteps||whole);}
        if(n>=1&&predicted){
          queryCosts=[];let checked={error:0};const risk=recentRebase||n>largestAccepted||confidence<.8||C().travel(origin,predicted.coordinates)>cfg().sentinelTravel;
          if(risk&&n>=cfg().sentinelMinimumSteps){const middle=C().forecast(point,model,Math.floor(n/2));checked=middle?verify(middle,'sentinelValidation'):{error:Infinity};}
          if(checked.error<=cfg().validationTolerance)checked=verify(predicted,'endpointValidation');
          C().install(s,point.coordinates);
          const shocked=checked.point?.delta?model.models.filter(g=>g.outputs.some(k=>Math.max(checked.point.delta[k],checked.expected[k])>cfg().shockRatio*Math.max(cfg().coordinateFloor,Math.min(checked.point.delta[k],checked.expected[k])))).map(g=>g.id):[];
          if(checked.structural){hard('mapSignature');return;}
          if(shocked.length){stats.mapRejected++;P().record('mapRejected');cooldown('shock',shocked,true);return;}
          if(checked.error<=cfg().validationTolerance){
            const before=point;for(const k of G().keys){const value=C().coordinate(G().read(s,k));const target=predicted.coordinates[k];const increment=target.value===value.value?B.mul(profile.rates[k],n*dt):B.max(0,B.sub(target.layer===0?B.BN(target.value):B.Decimal.fromComponents(1,target.layer,target.value),G().read(s,k)));gains[k]=B.add(gains[k],increment);}
            C().install(s,predicted.coordinates);profile=checked.profile;position+=n;elapsed=Math.min(seconds,elapsed+n*dt);point={...checked.point,position};model=C().rebase(model,before,point,n,{validated:G().groups.filter(g=>!profile.unvalidated.includes(g.id)).flatMap(g=>g.outputs)});remember(point);
            origin=C().coordinates(s);stats.mapAccepted++;stats.softRebases++;const bucket=Math.floor(Math.log2(n));stats.blockHistogram[bucket]=(stats.blockHistogram[bucket]||0)+1;stats.virtualSteps+=n;stats.maximumBlockSteps=Math.max(stats.maximumBlockSteps,n);P().record('mapAccepted');P().record('softRebases');
            outcome(n,checked);policy.tier=Math.min(cfg().mapStepTiers.length-1,policy.tier+1);policy.failures=0;blockSize=cfg().mapStepTiers[policy.tier];largestAccepted=Math.max(largestAccepted,n);confidence=Math.min(1,confidence*.95+.05*(1-checked.error/cfg().validationTolerance));recentRebase=false;consecutiveFailures=0;return;
          }
          stats.mapRejected++;P().record('mapRejected');outcome(0,checked);
          policy.tier=Math.max(0,policy.tier-1);policy.failures++;confidence*=.7;
          if(policy.failures>=cfg().consecutiveRejects)cooldown('consecutive-rejects');
          return;
        }
        hard('coordinateStructure');
      }
      if((options.directWork||0)+stats.realMicroSteps>=W.Core.Config.offlineHierarchy.maxDirectWork){const error=Error('真实资源微步预算耗尽；未提交检查点与剩余离线时间保留');error.code='direct-work-budget';error.evolutionStats=stats;throw error;}
      const calibrationStart=calibrate?point:null;
      const fixed=point.delta!==null&&(cooling()||useFixedFallback||(!W.Core.Config.offlineHierarchy.mapEnabled&&options.strong)||options.strong&&!model&&history.length>=cfg().learnSteps&&!anchoring());
      // Coarse fixed steps are not a safe substitute for a proven layer-scale
      // map. Stop before committing that region; do not restart a .1s replay.
      if(fixed&&(W.Simulation.CheckpointStrategy.movement(s,profile,dt,true)>cfg().fallbackMaxMicroCoordinateTravel||G().keys.some(k=>{
        const current=G().read(s,k),next=B.add(current,B.mul(profile.rates[k],cfg().fallbackSeconds));
        return B.gt(next,current)&&(point.coordinates[k].layer>=2||next.layer>=2);
      }))){
        let coupled=W.Simulation.CoupledResourceKernel?.select(s,profile);
        if(coupled&&W.Simulation.CoordinateCoupledKernel?.supported(s))coupled=W.Simulation.CoordinateCoupledKernel.create();
        if(coupled){
          special={coupled,profile:coupled.compileCoupledFastProfile(s),seconds:seconds-elapsed,elapsed:0,flux:elapsed===sampleAt?lastFlux:flux(source(s,profile)),externalGains:{}};
          advanceScale();return;
        }
        const K=W.Power.ScaleKernel,policy=W.Core.Config.scaleKernel;
        const compiled=policy?.enabled&&(policy.diagnosticCoupledIntervals||K?.supportsOffline(s,source(s,profile)))?K.compileScaleFastProfile(s):null;
        if(compiled){
          const duration=seconds-elapsed,externalKeys=G().keys.filter(k=>['mana','immortalPower','xianForce','yuanForce'].includes(k));
          special={profile:compiled,dynamic:K.read(s),seconds:duration,elapsed:0,flux:elapsed===sampleAt?lastFlux:flux(source(s,profile)),externalKeys,externalGains:Object.fromEntries(externalKeys.map(k=>[k,B.ZERO])),nextSample:0,sampleSeconds:Math.max(dt,Math.ceil(duration/dt/policy.trajectorySamples)*dt)};
          advanceScale();return;
        }
        const external=K?.supported(s);
        const error=Error(external?'ScaleKernel 单步已验证，但当前跨组/进度反馈的外段冻结误差尚未通过；保留离线债务':'固定 fallback 存在层级风险，当前公式分支尚不支持 ScaleKernel');
        error.code=external?'scale-external-feedback-unvalidated':'specialized-scale-required';error.evolutionStats=stats;throw error;
      }
      const step=fixed?Math.min(cfg().fallbackSeconds,seconds-elapsed):options.strong?Math.min(dt,remaining):remaining;
      if(fixed){
        const current=elapsed===sampleAt?lastFlux:flux(source(s,profile));
        const prior=fluxSum(lastFlux,current,elapsed-sampleAt,dt);
        for(const k of Object.keys(progress))progress[k]=B.add(progress[k],B.add(prior[k],B.mul(current[k],step)));
        sampleAt=elapsed+step;lastFlux=null;stats.fixedFallbacks++;P().record('fixedFallbacks');
      }
      const values=Object.fromEntries(G().keys.map(k=>[k,B.mul(profile.rates[k],step)]));
      for(const k of G().keys){G().write(s,k,B.add(G().read(s,k),values[k]));gains[k]=B.add(gains[k],values[k]);}
      elapsed=Math.min(seconds,elapsed+step);if(fixed)while(sample+1<nodes.length-1&&nodes[sample+1]<elapsed-1e-8)sample++;position+=step/dt;stats.realMicroSteps++;stats[step<=dt+1e-8?"cadenceMicroSteps":"frozenDirectSteps"]++;P().record('realMicroSteps');
      for(const row of Object.values(policy.groups)){const prior=row.cooldown;row.cooldown=Math.max(0,row.cooldown-step);if(prior>0&&!row.cooldown&&!row.anchors)row.anchors=3;}
      profile=C().query(s);point={...C().observation(s,profile,position),origin:step<=dt+1e-8?"micro":"fixed"};remember(point);
      for(const [id,row] of Object.entries(policy.groups))if(row.anchors){
        row.anchors--;stats.shockAnchors++;P().record('shockAnchors');
        if(!row.anchors){const part=C().fitGroup(history.slice(-4),id);
          if(part&&model){model={models:model.models.map(g=>g.id===id?part:g)};if(row.shocks<2)row.cooldown=0;row.window=[];}
        }
      }
      if(calibrate){if(!calibrationRows.length)calibrationRows.push(calibrationStart);calibrationRows.push(point);calibrate--;if(!calibrate){model=C().scalarModel(calibrationRows);history=calibrationRows;stats.softRebases++;blockSize=cfg().initialMapSteps;origin=C().coordinates(s);}}
    }
    return {advance(deadline){return P().withScope('offline',()=>{
      if(done)throw Error('资源检查点候选已完成');
      if(special&&options.executorKind!=='coupled-kernel'&&!(special.coupled?special.coupled.matches(s,special.profile):W.Power.ScaleKernel.matches(s,special.profile)))throw Error('ScaleFastProfile 外部输入已改变；丢弃未提交区间');
      do{
        if(elapsed>=nodes[sample+1]-1e-8){if(elapsed>sampleAt+1e-10)sampleProgress();else sample++;
          if(elapsed>=seconds-1e-8){done=true;return {done:true,result:{gains,progressTotals:progress,stats,predictor:{version:1,mapSignature:C().signature(s),model,observations:history,position,blockSize,confidence,trustRegionOrigin:origin,largestAccepted,validation:cadence,policy},endpoint:point}};}}
        advanceOne();
      }while(performance.now()<deadline);
      return {done:false};
    });}};
  }
  W.Simulation.ResourceEvolution=Object.freeze({create,fluxSum,profitability});
})(window.WIS);
