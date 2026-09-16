(function defineResourceGroups(WIS) {
  "use strict";
  const B=WIS.Core.BigNum, R=WIS.Core.Runtime, E=WIS.Core.Effects;
  const groups=[],owners=new Map();let resourceKeys=Object.freeze([]);
  function register(group) {
    group={...group,keys:group.outputs||group.keys};
    if(!group?.id||groups.some(g=>g.id===group.id)||!Array.isArray(group.keys)||!group.keys.length||typeof group.rate!=='function')throw Error('ResourceGroup 定义无效');
    if(group.keys.some(k=>typeof k!=='string'||owners.has(k))||new Set(group.keys).size!==group.keys.length)throw Error('ResourceGroup 输出资源重复');
    const outputs=Object.freeze([...group.keys]);
    if(group.dependencies&&!Array.isArray(group.dependencies)||group.mapDependencies&&!Array.isArray(group.mapDependencies)||group.mapSignature&&typeof group.mapSignature!=='function')throw Error('ResourceGroup 依赖/签名无效');
    const dependencies=Object.freeze([...(group.dependencies||['core','powerSystem','cultivation','meta'])]);
    const declaredMapDependencies=group.mapDependencies?Object.freeze([...group.mapDependencies]):null;
    for(const key of ['dynamicResources','fastForwardDependencies'])if(group[key]!=null&&!Array.isArray(group[key]))throw Error('连续依赖必须为数组');
    const dynamicResources=Object.freeze([...(group.dynamicResources||group.mapDependencies||[])]),fastForwardDependencies=Object.freeze([...(group.fastForwardDependencies||dynamicResources)]);
    if(dynamicResources.some(k=>typeof k!=='string')||fastForwardDependencies.some(k=>typeof k!=='string'))throw Error('连续依赖无效');
    const entry=Object.freeze({...group,outputs,keys:outputs,dependencies,dynamicResources,fastForwardDependencies,get mapDependencies(){return declaredMapDependencies||resourceKeys;},mapSignature:group.mapSignature||group.branchKey||(()=>null)});
    groups.push(entry);for(const key of entry.keys)owners.set(key,entry);
    resourceKeys=Object.freeze(groups.flatMap(g=>g.keys));return entry;
  }
  function read(state,key) {const group=owners.get(key);if(!group)throw Error('未注册资源 '+key);return B.BN(group.read?group.read(state,key):state[key]??state.core.resources[key]??0);}
  function write(state,key,value) {const group=owners.get(key);if(!group)throw Error('未注册资源 '+key);if(group.write)group.write(state,key,value);else if(group.legacyCommit)state[key]=value;else state.core.resources[key]=value;}
  function evaluate(snapshot,{factor=WIS.Simulation.Compensation.factor(),groupIds=null,fastProfile=null}={},compiledGroups=groups) {
    const cache=E.scopeMemo(snapshot)||B.microStepMemo.create(),memoKey=key=>'group:'+factor+':'+key,context=Object.freeze({factor,fastProfile,memo(key,fn){key=memoKey(key);if(!cache.has(key))cache.set(key,WIS.Simulation.Profiler.measure('commonMemo',fn));else WIS.Simulation.Profiler.record('commonMemoHit');return cache.get(key);}});
    const rates={};
    const evaluateRates=()=>{
      for(const group of compiledGroups){if(groupIds&&!groupIds.includes(group.id))continue;const output=WIS.Simulation.Profiler.measure('group.'+group.id,()=>group.rate(snapshot,context));
        if(Object.keys(output).some(key=>!group.keys.includes(key)))throw Error('ResourceGroup 越权输出 '+group.id);
        for(const key of group.keys){const value=output[key];if(value==null||!B.isFiniteBN(value)||B.lt(value,0)){const error=Error('ResourceGroup 非有限产出 '+key);error.code='formula-representation';throw error;}rates[key]=B.BN(value);}
      }
    };
    B.microStepMemo.run(()=>R.withEvaluationState(snapshot,evaluateRates,{memo:cache,effects:fastProfile?run=>fastProfile.effects.run(run,cache):null}));
    return {rates,cultivation:cache.get(memoKey('immortal-sources')),groups:groups.map(g=>({id:g.id,keys:g.keys}))};
  }
  // Bind group membership once, but never cache state-dependent numeric values.
  function compile() {
    const bound=Object.freeze([...groups]),keys=resourceKeys;
    return Object.freeze({groups:bound,keys,valid:()=>keys===resourceKeys,
      evaluate:(state,options)=>evaluate(state,options,bound)});
  }
  function commitAdditional(state,gains) {
    for(const group of groups)if(!group.legacyCommit){if(group.commit)group.commit(state,gains);else for(const key of group.keys)write(state,key,B.add(read(state,key),gains[key]));}
  }
  const softcapSignature=(s,keys)=>R.withState(s,()=>keys.map(k=>WIS.Power.ScaleLogic.activeSoftcapStages(s[k])));
  function compileScaleProfile(snapshot,options={}){
    const sources=['joules','power'].flatMap(k=>WIS.Core.Sources.collect(k,snapshot));
    if(sources.some(s=>s.requiresProviderRefresh||s.dynamicResources?.length&&typeof s.valueAt!=='function'))return null;
    return {joules:WIS.Power.ScaleLogic.createAutomaticJRateProfile({interval:true}),power:WIS.Power.ScaleLogic.createAutomaticPowerRateProfile({interval:true,...options})};
  }
  register({id:'scale',outputs:['joules','power'],compileFastProfile:compileScaleProfile,dynamicResources:['joules','power','mana','immortalPower','xianForce','yuanForce'],outputDependencies:{joules:['joules','power','mana','immortalPower','xianForce'],power:['joules','power','mana','immortalPower','yuanForce']},mapSignature:s=>softcapSignature(s,['joules','power']),legacyCommit:true,rate(s,c){
    if(s.powerSystem.active&&s.powerSystem.active!=='scale')throw Error('未支持的战力 ResourceGroup');
    const S=WIS.Power.ScaleLogic,active=s.powerSystem.active==='scale';
    return active?S.evaluateScaleRates(c.factor,c.fastProfile?.groups.scale):{joules:B.ZERO,power:B.ZERO};
  }});
  register({id:'immortal',outputs:['mana','immortalPower'],dynamicResources:['joules','power','mana','immortalPower','yuanForce'],outputDependencies:{mana:['joules','power','mana','immortalPower'],immortalPower:['joules','mana','immortalPower','yuanForce']},mapSignature:s=>softcapSignature(s,['mana','immortalPower']),legacyCommit:true,rate(s,c){
    if(s.cultivation.active&&s.cultivation.active!=='immortal')throw Error('未支持的修行 ResourceGroup');
    const values=c.memo('immortal-sources',()=>s.cultivation.active==='immortal'?WIS.Cultivation.ImmortalLogic.fixedAutomaticSources(c.factor):{mana:B.ZERO,passiveMana:B.ZERO,explorationMana:B.ZERO,immortalPower:B.ZERO,explorationAmount:B.ZERO,circulation:false});
    return {mana:values.mana,immortalPower:values.immortalPower};
  }});
  register({id:'xiuzhen',kernelWritePaths:['cultivation.systems.immortal.xiuzhen.resources.xianForce','cultivation.systems.immortal.xiuzhen.resources.yuanForce'],outputs:['xianForce','yuanForce'],dynamicResources:['immortalPower','xianForce','yuanForce'],outputDependencies:{xianForce:['immortalPower','xianForce','yuanForce'],yuanForce:['xianForce','yuanForce']},legacyCommit:true,
    read:(s,k)=>WIS.Cultivation.Xiuzhen.amount(s,k),write:(s,k,v)=>{WIS.Cultivation.Xiuzhen.get(s).resources[k].amount=v;},
    rate(s,c){const v=s.cultivation.active==='immortal'?WIS.Cultivation.Xiuzhen.rates(s):{xianForce:B.ZERO,yuanForce:B.ZERO};return {xianForce:B.mul(v.xianForce,c.factor),yuanForce:B.mul(v.yuanForce,c.factor)};}
  });
  WIS.Simulation.ResourceGroups=Object.freeze({register,compile,evaluate,read,write,commitAdditional,get groups(){return Object.freeze([...groups]);},get keys(){return resourceKeys;}});
}(window.WIS));
