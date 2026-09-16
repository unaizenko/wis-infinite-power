(function defineCompiledContinuousPlan(W) {
  'use strict';
  const B=W.Core.BigNum, R=W.Core.Runtime, G=W.Simulation.ResourceGroups;
  const counters={compilations:0,cacheHits:0,microPreparations:0,evaluations:0};
  const fallbacks=Object.create(null);
  const capabilityCodes=new Set(['unsupported-execution-signature','coupled-advance-unverified',
    'compiled-micro-settlement-required','direct-work-budget','scale-external-feedback-unvalidated','specialized-scale-required','compiled-plan-stale']);
  let cached=null,cachedSources='';
  // Exact is the conservative policy, including ee: no percentage of mag.
  // Approximate policies must be certified by an accelerator for each observable.
  const exact=Object.freeze({kind:'exact',absolute:0,relative:0,log10Absolute:0,
    coordinateAbsolute:0,layerMismatch:'reject',downstreamValidation:true});
  function compare(a,b,policy=exact) {
    const x=B.parseFinite(a),y=B.parseFinite(b);
    if(!x||!y)return {accepted:false,reason:'non-finite'};
    if(x.sign!==y.sign||x.layer!==y.layer)return {accepted:false,reason:'canonical-region'};
    if(B.eq(x,y))return {accepted:true,error:0};
    if(policy.kind==='exact')return {accepted:false,reason:'exact',error:Math.abs(x.mag-y.mag)};
    if(!['absolute','relative','log10Absolute','coordinateAbsolute'].every(k=>Number.isFinite(policy[k])&&policy[k]>=0))
      return {accepted:false,reason:'invalid-error-policy'};
    if(x.layer===0){const error=Math.abs(x.toNumber()-y.toNumber());return {accepted:error<=policy.absolute+policy.relative*Math.abs(x.toNumber()),error};}
    if(x.layer===1){const error=Math.abs(x.mag-y.mag);return {accepted:error<=policy.log10Absolute,error};}
    const error=Math.abs(x.mag-y.mag);
    return {accepted:false,reason:'downstream-certificate-required',error};
  }
  function compile(state=R.getState()) {
    const sourceIdentity=JSON.stringify(W.Core.Sources.providerIds());
    if(cached?.valid()&&cachedSources===sourceIdentity){counters.cacheHits++;return cached;}
    counters.compilations++;cachedSources=sourceIdentity;
    const binding=G.compile(),index=new Map(binding.keys.map((k,i)=>[k,i]));
    const slots=binding.groups.flatMap(group=>group.keys.map(key=>Object.freeze({
      index:index.get(key),key,owner:group.id,errorPolicy:group.errorPolicies?.[key]||exact,
      read:group.read?s=>B.BN(group.read(s,key)):s=>B.BN(s[key]??s.core.resources[key]??0)
    })));
    const descriptors=R.withEvaluationState(state,()=>[
      ...W.Core.Effects.describe(state).map(v=>({...v,kind:'effect'})),
      ...binding.keys.flatMap(key=>W.Core.Sources.collect(key,state).map(v=>({...v,kind:'source'})))
    ]).map(({id,provider,target,kind,dynamicResources,operationType})=>Object.freeze({
      id,provider,target,kind,dynamicResources:Object.freeze([...(dynamicResources||[])]),operationType
    }));
    const edges=[],unknown=[];
    for(const group of binding.groups)for(const output of group.keys){
      const declared=group.outputDependencies?.[output];
      // A dynamic dependency list is not proof of completeness. Missing output
      // dependencies dirty every slot and make the group micro-only.
      const complete=declared&&group.dependenciesComplete===true;
      if(!complete)unknown.push(group.id+':'+output);
      for(const input of complete?declared:binding.keys)if(index.has(input))edges.push(Object.freeze({from:input,to:output}));else unknown.push(input);
    }
    for(const row of descriptors){
      const targets=index.has(row.target)?[row.target]:W.Simulation.ResourceDependencies.targets[row.target];
      if(!targets){unknown.push(row.kind+':'+row.id);continue;}
      for(const input of row.dynamicResources)for(const output of targets)
        if(index.has(input)&&index.has(output))edges.push(Object.freeze({from:input,to:output}));else unknown.push(input);
    }
    const dirtyMasks=slots.map(s=>Object.freeze(edges.filter(e=>e.from===s.key).map(e=>index.get(e.to))));
    const metadata=Object.freeze({slots:Object.freeze(slots),dependencyGraph:Object.freeze(edges),
      scc:Object.freeze(W.Simulation.ResourceDependencies.scc(binding.keys,edges).map(Object.freeze)),
      dependencyCompleteness:'conservative-until-certified',
      dynamicDependencies:Object.freeze(binding.groups.map(g=>({group:g.id,resources:g.dynamicResources}))),
      formulaDescriptors:Object.freeze(descriptors),
      formulaBreakpoints:Object.freeze(binding.groups.map(g=>({group:g.id,read:g.mapSignature,complete:g.breakpointsComplete===true}))),
      dirtyMasks:Object.freeze(dirtyMasks),unknownDependencies:Object.freeze(unknown),
      // The existing group API does not certify all floor/min/max/event branches.
      microOnly:binding.groups.some(g=>g.breakpointsComplete!==true)||unknown.length>0,
      pathState:Object.freeze({highestPower:'gameplay',peak:'protected',total:'protected',maxSinglePowerGain:'gameplay',commit:'production-settlement'})});
    const signature=JSON.stringify({version:1,groups:binding.groups.map(g=>[g.id,g.keys]),sources:W.Core.Sources.providerIds()});
    const evaluate=s=>{
      if(!binding.valid()){const error=Error('Compiled resource membership changed');error.code='compiled-plan-stale';throw error;}
      counters.evaluations++;return binding.evaluate(s);
    };
    const prepareResources=s=>{counters.microPreparations++;return evaluate(s);};
    cached=Object.freeze({...metadata,signature,valid:binding.valid,evaluate,prepareResources,
      bind(state){return Object.freeze({
        // Prepare a single production unit. No income/events/RNG are committed
        // here; the existing transaction owns all protected/path state writes.
        advance(dt,options={}){
          const cadence=W.Core.Config.fixedSettlement.discreteCadenceSeconds;
          if(!Number.isFinite(dt)||dt<=0||dt>cadence)throw RangeError('Compiled micro duration outside production cadence');
          if(!binding.valid()){const error=Error('Compiled resource membership changed');error.code='compiled-plan-stale';throw error;}
          const scratch=W.Core.State.cloneForSimulation(state);
          return W.Simulation.FixedSegment.prepare(scratch,dt,{...options,borrowSources:true,
            compiledResources:prepareResources});
        }
      });}
    });
    return cached;
  }
  W.Simulation.CompiledContinuousPlan=Object.freeze({compile,compare,exact,
    isCapabilityError:error=>capabilityCodes.has(error?.code),
    recordFallback(code){fallbacks[code]=(fallbacks[code]||0)+1;},
    metrics:()=>({...counters,fallbacks:{...fallbacks}})});
})(window.WIS);
