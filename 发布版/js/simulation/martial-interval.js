(function(W){
  'use strict';
  const B=W.Core.BigNum,S=W.Core.State,M=W.Cultivation.Martial;
  // Offline only. Empirical discrete-cycle extrapolation, with independent
  // half-span refinement, formal calibration and downstream uncertainty probes.
  // Unknown fields, unverified Decimal regions and discrete events retain full cadence.
  const limits=Object.freeze({version:1,period:.4,minimumCycles:8,maximumSeconds:300,safety:8,stockRelative:.002,rateRelative:.002,localRelative:.000025,maximumFields:128});
  const clockPaths=new Set(['core.runtime.totalElapsedSeconds','core.runtime.reincarnationElapsedSeconds','core.runtime.currentScaleElapsedSeconds','meta.infinity.runElapsed','meta.challenges.activeChallengeElapsedSeconds','meta.bigNumbers.elapsedSeconds']);
  const accountingPaths={'meta.statistics.lifetimeTotalJ':'joules','meta.statistics.currentRebirthTotalJ':'joules','meta.statistics.lifetimeTotalPower':'power','meta.statistics.currentRebirthTotalPower':'power','powerSystem.systems.scale.progress.totalPower':'power'};
  function dynamic(path){return clockPaths.has(path)||/^meta\.bigNumbers\.(resources\.0\.(amount|total|peak)|ySample\.(rate|baseRate))$/.test(path)||/^core\.resources\.(joules|power)$/.test(path)||/^powerSystem\.systems\.scale\.progress\.(highestPower|totalPower)$/.test(path)||/^cultivation\.systems\.martial\.(resources\.(qi|body|heart|soul)\.(amount|total|spent|peak)|longxiangProgress|heartPotential|heartInvestment)$/.test(path)||/^meta\.statistics\.(lifetime|currentRebirth)(Highest|Total)(J|Power)$/.test(path)||/^meta\.treasureProgress\.[^.]+$/.test(path)||/^meta\.treasureProgressFinite\.[^.]+\.(carry|remaining)$/.test(path);}
  function get(s,path){return path.split('.').reduce((o,k)=>o[k],s);}
  const logPath=path=>/^core\.resources\.(joules|power)$/.test(path)||path==='powerSystem.systems.scale.progress.highestPower'||/^meta\.statistics\.(lifetime|currentRebirth)Highest(J|Power)$/.test(path);
  function logCoordinate(value){const v=B.parseFinite(value);if(!v||v.sign<0||v.layer>1)return null;return v.layer===0||B.lt(v,1)?Math.log1p(B.toNumber(v))/Math.LN10:v.mag;}
  function coordinate(value,path){return logPath(path)?logCoordinate(value):numeric(value,signedPath(path));}
  const yStockPath=path=>/^meta\.bigNumbers\.resources\.0\.(amount|total|peak)$/.test(path);
  function tolerance(path,value,relative,origin=value){if(yStockPath(path))return relative*Math.max(1,Math.abs(value-origin)); if(!logPath(path))return relative*Math.max(1,Math.abs(value));const ratio=value>1?1-Math.pow(10,-value):Math.max(1,Math.expm1(value*Math.LN10))/Math.pow(10,value);return Math.log1p(relative*ratio)/Math.LN10;}
  function set(s,path,value){if(logPath(path))value=value<14?B.BN(Math.expm1(value*Math.LN10)):B.sub(B.pow(10,value),1);const keys=path.split('.'),last=keys.pop(),box=keys.reduce((o,k)=>o[k],s);box[last]=typeof box[last]==='number'?B.toNumber(value):B.BN(value);}
  const signedPath=path=>/^meta\.treasureProgressFinite\.[^.]+\.carry$/.test(path);
  function numeric(value,signed=false){if(typeof value!=='number'&&typeof value!=='string'&&!B.isDecimal(value))return null;const v=B.parseFinite(value);return v&&(signed||v.sign>=0)&&(v.layer===0||v.layer===1&&v.mag<16)?B.toNumber(v):null;}
  // Restore the action cursor and Y phase unless the passive model explicitly
  // calls the official Y sampler. Purchases, G and TREE stay structural guards.
  const passiveSampling=s=>{const n=W.Meta.BigNumbers.get(s),m=M.get(s);return n.unlocked&&n.fractalLevel===0&&n.gIndex===0&&!m.automation.qi&&!m.automation.body&&['joules','power'].every(k=>{const v=B.BN(s[k]);return v.layer===1&&v.mag>300;});};
  const cyclePeriod=s=>W.Meta.BigNumbers.get(s).unlocked&&!passiveSampling(s)?2:limits.period;
  const phasePath=path=>['core.runtime.onlineCadenceRemaining','cultivation.systems.martial.automationTime','meta.bigNumbers.ySample.remaining'].includes(path);
  const phaseValue=(value,path,state)=>path==='meta.bigNumbers.ySample.remaining'&&passiveSampling(state)
    ? (B.gte(value,0)&&B.lte(value,1)?'$official-y-sampling':String(value)) : Number(B.toNumber(value).toFixed(10));
  function view(s){const values={},fixed={};let valid=true;
    function walk(x,path,out){for(const [key,value]of Object.entries(x)){const name=path?path+'.'+key:key;
      if(name==='core.runtime.lastSettlement')continue;
      // Sparse saves omit empty treasure tails; they carry no numeric debt.
      if(/^meta\.(treasureProgressResidualTail|treasureStockResidual)$/.test(path)&&Array.isArray(value)&&value.length===0)continue;
      if(phasePath(name)){out[key]=phaseValue(value,name,s);continue;}
      if(accountingPaths[name]){out[key]='$gross-accounting';continue;}
      if(dynamic(name)){const v=coordinate(value,name);if(v===null||!Number.isFinite(v)){out[key]=String(value);}else{values[name]=v;out[key]='$continuous';}}
      else if(value&&typeof value==='object'&&(!Array.isArray(value)||name==='meta.bigNumbers.resources')&&!B.isDecimal(value)){out[key]={};walk(value,name,out[key]);}
      else out[key]=B.isDecimal(value)?String(value):value;
    }}walk(s,'',fixed);return {values,signature:JSON.stringify(fixed,(key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value),valid};}
  // Compile only path classification and key order, never numeric values.
  // Unknown shape/type changes fall back to the complete canonical scanner.
  function compileView(initial) {
    const object=(x,path='')=>x&&typeof x==='object'&&(!Array.isArray(x)||path==='meta.bigNumbers.resources')&&!B.isDecimal(x);
    const ignore=(path,key,value)=>path==='core.runtime'&&key==='lastSettlement'||/^meta\.(treasureProgressResidualTail|treasureStockResidual)$/.test(path)&&Array.isArray(value)&&value.length===0;
    function shape(x,path){return {path,fields:Object.keys(x).sort().filter(key=>!ignore(path,key,x[key])).map(key=>{
      const name=path?path+'.'+key:key,value=x[key];
      return {key,name,kind:accountingPaths[name]?0:dynamic(name)?1:object(value,name)?2:3,child:object(value,name)&&!dynamic(name)&&!accountingPaths[name]?shape(value,name):null};
    })};}
    const layout=shape(initial,'');
    const canonical=(key,value)=>object(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value;
    return state=>{const values={};let valid=true;
      function walk(x,node){if(!object(x,node.path)){valid=false;return null;}
        const keys=Object.keys(x).filter(key=>!ignore(node.path,key,x[key]));
        if(keys.length!==node.fields.length||node.fields.some(f=>!Object.prototype.hasOwnProperty.call(x,f.key)||ignore(node.path,f.key,x[f.key]))){valid=false;return null;}
        const fixed={};
        for(const f of node.fields){const value=x[f.key];
          if(phasePath(f.name))fixed[f.key]=phaseValue(value,f.name,state);
          else if(f.kind===0)fixed[f.key]='$gross-accounting';
          else if(f.kind===1){const v=coordinate(value,f.name);if(v===null||!Number.isFinite(v))fixed[f.key]=String(value);else{values[f.name]=v;fixed[f.key]='$continuous';}}
          else if(f.kind===2)fixed[f.key]=walk(value,f.child);
          else if(object(value)){valid=false;return null;}
          else fixed[f.key]=B.isDecimal(value)?String(value):Array.isArray(value)?JSON.parse(JSON.stringify(value,canonical)):value;
        }return fixed;
      }
      const fixed=walk(state,layout);return valid?{values,signature:JSON.stringify(fixed),valid:true}:view(state);
    };
  }
  function validateCheckpoint(value){if(value==null)return null;
    if(value.disabled!=null&&typeof value.disabled!=='boolean')throw Error('武道离线区间状态无效');
    if(value.nextSeconds!=null&&(!Number.isFinite(value.nextSeconds)||value.nextSeconds<3.2||value.nextSeconds>limits.maximumSeconds))throw Error('武道离线区间长度无效');
    if(![1,2].includes(value.version)||value.classification!=='empirical-martial-cycle'||!value.errors||Array.isArray(value.errors)||Object.keys(value.errors).length>limits.maximumFields)throw Error('武道离线区间误差记录无效');
    const errors={};for(const [path,row]of Object.entries(value.errors)){if(!dynamic(path)||!row||!Number.isFinite(row.error)||row.error<0||!Number.isFinite(row.reference)||row.reference<0&&!signedPath(path))throw Error('武道离线区间误差记录无效');if(row.origin!=null&&(!yStockPath(path)||!Number.isFinite(row.origin)||row.origin<0))throw Error('武道Y新增进度基准无效');if(value.version===1&&logPath(path)){const reference=logCoordinate(row.reference),low=logCoordinate(Math.max(0,row.reference-row.error)),high=logCoordinate(row.reference+row.error);if(reference===null||low===null||high===null)throw Error('武道离线旧坐标无效');errors[path]={reference,error:Math.max(reference-low,high-reference)};}else errors[path]={...row};}
    if(value.variants!=null&&(!Array.isArray(value.variants)||value.variants.length!==2))throw Error('武道离线分支记录无效');
    const variants=value.variants?.map(state=>S.toSerializable(S.normalizeDomain(state)))||null;
    const outputs={};for(const [key,row]of Object.entries(value.outputs||{})){if(!W.Simulation.ResourceGroups.keys.includes(key)||!row||!B.parseFinite(row.reference)||B.lt(row.reference,0)||!B.parseFinite(row.error)||B.lt(row.error,0))throw Error('武道离线收入误差记录无效');outputs[key]={reference:String(row.reference),error:String(row.error)};}
    return {version:2,classification:value.classification,nextSeconds:value.nextSeconds||20,errors,outputs,variants,disabled:value.disabled===true};
  }
  // Larger Decimal layers stay in the structural signature: unchanged stocks
  // may batch, while any observed movement requires formal replay.
  const validStock=value=>{const v=B.parseFinite(value);return !!v&&v.sign>=0;};
  function eligible(s,seconds,compensationEligible){return M.active(s)&&seconds>=limits.minimumCycles*limits.period&&s.powerSystem.active==='scale'&&validStock(s.joules)&&validStock(s.power)&&(!s.core.runtime.onlineCadenceRemaining||s.core.runtime.onlineCadenceRemaining>0&&s.core.runtime.onlineCadenceRemaining<=.1)&&s.activeChallenge!=='infinityFast'&&(!compensationEligible||s.core.runtime.compensation.balance===0);}
  function heartBranch(s){return W.Core.Config.softcaps.flatMap(stage=>[B.gte(M.amount(s,'heart'),M.heartRequirement(stage)),B.gt(s.joules,stage.threshold),B.gt(s.power,stage.threshold)]);}
  function rebaseHeart(s,base){const m=s.cultivation.systems.martial;m.heartPotential=M.F(B.pow(m.resources.heart.amount,B.div(1,m.heartLedgerExponent)));
    // Keep the published treasure balance and its finite remainder coherent.
    // Saving sparsifies the published balance, so recovery reads this ledger.
    for(const key of Object.keys(s.meta.treasureProgressFinite||{})){const ledger=s.meta.treasureProgressFinite[key],prior=base.meta.treasureProgressFinite?.[key];if(!B.eq(s.meta.treasureProgress[key]||0,base.meta.treasureProgress[key]||0)||!prior||!B.eq(ledger.remaining,prior.remaining)||!B.eq(ledger.carry,prior.carry))W.Meta.TreasureLedger.write(s,key,[String(s.meta.treasureProgress[key]||0)]);}
  }
  function same(a,b){return a.valid&&b.valid&&a.signature===b.signature&&Object.keys(a.values).length===Object.keys(b.values).length;}
  function forecast(s,n,formal,stats,inspect){const period=cyclePeriod(s),start=inspect(s);if(!start.valid)return null;
    const one=formal(s,period);
    const a=inspect(one.candidate);if(!same(start,a)||JSON.stringify(heartBranch(s))!==JSON.stringify(heartBranch(one.candidate)))return null;
    const two=formal(one.candidate,period);
    const b=inspect(two.candidate);if(!same(start,b))return null;
    const three=formal(two.candidate,period),c=inspect(three.candidate);if(!same(start,c))return null;
    const state=S.cloneForSimulation(s),gains={};
    const gainAt=(key,count)=>{const x=one.result.resourceGains[key],y=two.result.resourceGains[key],z=three.result.resourceGains[key];
      if(highPassive&&B.gt(x,0))return B.mul(x,B.add(count,B.mul(B.sub(B.div(y,x),1),count*(count-1)/2)));
      return B.add(B.mul(x,count),B.add(B.mul(B.sub(y,x),count*(count-1)/2),B.mul(B.add(B.sub(z,B.mul(y,2)),x),count*(count-1)*(count-2)/6)));};
    const highPassive=['joules','power'].every(key=>{
      const v=B.BN(s[key]);if(v.layer!==1||v.mag<=300)return false;
      return [[s,one],[one.candidate,two],[two.candidate,three]].every(([before,sample])=>{
        const expected=B.add(before[key],sample.result.resourceGains[key]),actual=B.BN(sample.candidate[key]);
        return expected.layer===actual.layer&&Math.abs(expected.mag-actual.mag)<=16*Number.EPSILON*Math.max(1,Math.abs(actual.mag));
      });
    })&&!M.get(s).automation.qi&&!M.get(s).automation.body;
    if(passiveSampling(s)&&!highPassive)return null;
    for(const key of Object.keys(one.result.resourceGains)){const x=one.result.resourceGains[key],y=two.result.resourceGains[key];gains[key]=B.add(B.mul(x,n),B.add(B.mul(B.sub(y,x),n*(n-1)/2),B.mul(B.add(B.sub(three.result.resourceGains[key],B.mul(y,2)),x),n*(n-1)*(n-2)/6)));if(!B.isFiniteBN(gains[key])||B.lt(gains[key],0))return null;}
    if(highPassive)for(const key of Object.keys(gains)){gains[key]=gainAt(key,n);if(!B.isFiniteBN(gains[key])||B.lt(gains[key],0))return null;}
    for(const [path,key]of Object.entries(accountingPaths))set(state,path,B.add(get(s,path),gains[key]));
    for(const path of Object.keys(start.values)){const x=start.values[path],d=a.values[path]-x,dd=b.values[path]-2*a.values[path]+x;
      const ddd=c.values[path]-3*b.values[path]+3*a.values[path]-x;
      const anchored=logPath(path)&&x>300||/^meta\.bigNumbers\.resources\.0\./.test(path);
      const d2=b.values[path]-a.values[path],d3=c.values[path]-b.values[path];
      const second=anchored?d2-d:dd,third=anchored?(d3-d2)-(d2-d):ddd;
      const y=clockPaths.has(path)?x+n*d:x+n*d+n*(n-1)/2*second+n*(n-1)*(n-2)/6*third;
      if(!Number.isFinite(y)||y<0&&!signedPath(path))return null;set(state,path,y);
    }
    if(highPassive){
      // Integrate measured gross flux when real probes certify no represented
      // spending. This avoids subtracting nearly equal million-digit logs.
      for(const key of ['joules','power'])state[key]=B.add(s[key],gains[key]);
      state.highestPower=B.max(s.highestPower,state.power);
      for(const prefix of ['lifetimeHighest','currentRebirthHighest'])for(const [suffix,key]of [['J','joules'],['Power','power']])state.meta.statistics[prefix+suffix]=B.max(s.meta.statistics[prefix+suffix],state[key]);
      if(W.Meta.BigNumbers.get(s).unlocked){
        // Preserve the official start-of-second Y sampling, including its
        // saved partial second; predict the power input, not the sampling clock.
        const sampleState=S.cloneForSimulation(s);let invalidPower=false;
        state.meta.bigNumbers=W.Meta.BigNumbers.prepare(sampleState,n*period,{fixedSources:false,
          powerAt:offset=>{const gain=gainAt('power',offset/period);if(!B.isFiniteBN(gain)||B.lt(gain,0)){invalidPower=true;return s.power;}return B.add(s.power,gain);}});
        if(invalidPower)return null;
      }
    }
    rebaseHeart(state,s);const end=inspect(state);if(!same(start,end)||JSON.stringify(heartBranch(s))!==JSON.stringify(heartBranch(state)))return null;
    // Reject source/loot/automation branches that would change at the endpoint.
    const tail=formal(state,period);
    if(!same(start,inspect(tail.candidate))||JSON.stringify(heartBranch(s))!==JSON.stringify(heartBranch(tail.candidate)))return null;
    return {candidate:state,start,end,tail,gains,first:a,firstGains:one.result.resourceGains,delta:Object.fromEntries(Object.keys(start.values).map(k=>[k,a.values[k]-start.values[k]]))};
  }
  function transport(s,previous,model,formal,cycles,stats,inspect){const period=cyclePeriod(s);
    const gainErrors=Object.fromEntries(W.Simulation.ResourceGroups.keys.map(k=>[k,B.ZERO]));
    const out=Object.fromEntries(Object.keys(model.start.values).map(path=>[path,previous?.errors[path]?.error||0]));
    if(!previous)return {stocks:out,gains:gainErrors};
    for(const sign of [-1,1]){const draft=S.cloneForSimulation(s);
      for(const [path,row]of Object.entries(previous.errors)){const value=coordinate(get(draft,path),path);if(value===null||value+sign*row.error<0&&!signedPath(path))return null;set(draft,path,value+sign*row.error);}
      rebaseHeart(draft,s);const sample=formal(draft,period);const actual=inspect(sample.candidate);if(!same(model.start,actual))return null;
      for(const key of Object.keys(gainErrors))gainErrors[key]=B.max(gainErrors[key],B.mul(B.abs(B.sub(sample.result.resourceGains[key],model.firstGains[key])),2*cycles));
      for(const path of Object.keys(out)){const old=previous.errors[path]?.error||0,after=Math.abs(actual.values[path]-model.first.values[path]);out[path]=Math.max(out[path],old+2*cycles*Math.max(0,after-old));}
    }return {stocks:out,gains:gainErrors};
  }
  function downstream(s,formal,errors,nominal,stats,inspect){const period=cyclePeriod(s);
    // Simultaneous lower/upper perturbations test actual formal source,
    // conversion, treasure and event effects, not stock percentages alone.
    for(const sign of [-1,1]){const candidate=S.cloneForSimulation(s);for(const [path,row]of Object.entries(errors)){if(clockPaths.has(path))continue;const value=coordinate(get(candidate,path),path);if(value===null||value+sign*row.error<0&&!signedPath(path))return false;set(candidate,path,value+sign*row.error);}
      rebaseHeart(candidate,s);if(JSON.stringify(heartBranch(candidate))!==JSON.stringify(heartBranch(s)))return false;
      const sample=formal(candidate,period);
      if(!same(inspect(sample.candidate),inspect(nominal.candidate)))return false;
      for(const k of Object.keys(nominal.result.resourceGains)){const a=B.parseFinite(nominal.result.resourceGains[k]),b=B.parseFinite(sample.result.resourceGains[k]);if(!a||!b||B.gt(B.abs(B.sub(a,b)),B.mul(B.max(1,a,b),limits.rateRelative)))return false;}
      // A stock perturbation can be harmless to income but amplify conversions.
      const actual=inspect(sample.candidate).values,base=inspect(nominal.candidate).values;
      for(const [path,row]of Object.entries(errors))if(!clockPaths.has(path)&&Math.abs(actual[path]-base[path])>tolerance(path,base[path],limits.stockRelative,row.origin))return false;
    }return true;
  }
  function shadows(s,checkpoint){checkpoint=validateCheckpoint(checkpoint);if(!checkpoint||checkpoint.disabled)return null;
    if(checkpoint.variants)return checkpoint.variants.map(value=>{const state=S.normalizeDomain(value);state.core.runtime.timeLedger=s.core.runtime.timeLedger;state.lastUpdateAt=s.lastUpdateAt;return state;});
    const states=[];
    for(const sign of [-1,1]){const draft=S.cloneForSimulation(s);for(const [path,row]of Object.entries(checkpoint.errors)){const value=coordinate(get(draft,path),path);if(value===null)return null;set(draft,path,signedPath(path)?value+sign*row.error:Math.max(0,value+sign*row.error));}rebaseHeart(draft,s);states.push(draft);}return states;
  }
  function propagate(s,seconds,result,states,{formal,checkpoint}){checkpoint=validateCheckpoint(checkpoint);const errors={},outputs={...checkpoint.outputs};let realMicroSteps=0;const actual=view(s);if(!actual.valid||Object.keys(checkpoint.errors).some(path=>coordinate(get(s,path),path)===null))return {checkpoint:{...checkpoint,disabled:true},states:null,realMicroSteps};
    const samples=states.map(state=>{const sample=formal(state,seconds);realMicroSteps+=sample.result.compatibilitySubsteps+(sample.result.continuousSegments||0);return sample;});
    for(const path of Object.keys(actual.values)){if(clockPaths.has(path))continue;const values=samples.map(sample=>coordinate(get(sample.candidate,path),path));if(values.some(v=>v===null))return {checkpoint:{...checkpoint,disabled:true},states:null,realMicroSteps};errors[path]={reference:actual.values[path],error:Math.max(...values.map(v=>Math.abs(v-actual.values[path]))),...(yStockPath(path)?{origin:checkpoint.errors[path]?.origin??actual.values[path]}:{})};}
    for(const key of Object.keys(result.resourceGains)){const difference=B.max(...samples.map(sample=>B.abs(B.sub(sample.result.resourceGains[key],result.resourceGains[key]))));outputs[key]={reference:String(B.add(outputs[key]?.reference||0,result.resourceGains[key])),error:String(B.add(outputs[key]?.error||0,difference))};}
    const diverged=samples.some(sample=>view(sample.candidate).signature!==actual.signature||JSON.stringify(heartBranch(sample.candidate))!==JSON.stringify(heartBranch(s)));
    // Preserve discrete shadow choices across a checkpoint until the formal
    // branches meet again. Numeric stock errors cannot encode a different level.
    const variants=diverged?samples.map(sample=>S.toSerializable(sample.candidate)):null;
    return {checkpoint:{...checkpoint,errors,outputs,variants},states:samples.map(sample=>sample.candidate),realMicroSteps};
  }
  function advance(s,seconds,{formal,checkpoint=null,compensationEligible=false}={}){const stats={realMicroSteps:0,mapAccepted:0,mapRejected:0,virtualSteps:0,viewQueries:0,viewReuses:0};if(!eligible(s,seconds,compensationEligible))return {supported:false,stats};
    const period=cyclePeriod(s),previous=validateCheckpoint(checkpoint);if(previous?.disabled||previous?.variants)return {supported:false,stats};const evaluate=formal,cache=new WeakMap();
    // A probe cache is private to this attempt and keyed by immutable input
    // identity. Coarse/fine maps share only strictly identical formal inputs.
    formal=(state,dt)=>{let row=cache.get(state);if(row&&row.seconds===dt)return row.value;const value=evaluate(state,dt);stats.realMicroSteps+=value.result.compatibilitySubsteps+(value.result.continuousSegments||0);cache.set(state,{seconds:dt,value});return value;};
    // Only immutable inputs and completed private probe results enter this map.
    // It dies with this attempt; never reuse after a live commit or mutation.
    const views=new WeakMap(),scan=compileView(s),inspect=state=>{
      if(views.has(state)){stats.viewReuses++;return views.get(state);}
      stats.viewQueries++;const value=scan(state);views.set(state,value);return value;
    };
    let cycles=Math.floor(Math.min(seconds,limits.maximumSeconds,previous?.nextSeconds||20)/period+1e-8);cycles-=cycles%2;
    for(let refinement=0;refinement<8&&cycles>=Math.max(2,Math.ceil(limits.minimumCycles*limits.period/period));refinement++,cycles=Math.floor(cycles/4)*2){
      const coarse=forecast(s,cycles,formal,stats,inspect);if(!coarse){stats.mapRejected++;continue;}
      const left=forecast(s,cycles/2,formal,stats,inspect),right=left&&forecast(left.candidate,cycles/2,formal,stats,inspect);if(!right){stats.mapRejected++;continue;}
      const errors={},a=coarse.end.values,b=right.end.values;let accepted=true;
      const inherited=transport(s,previous,coarse,formal,cycles,stats,inspect);if(!inherited){stats.mapRejected++;continue;}
      for(const path of Object.keys(a)){if(clockPaths.has(path))continue;
        const disagreement=Math.abs(a[path]-b[path]);if(disagreement>tolerance(path,b[path],limits.localRelative,coarse.start.values[path])){accepted=false;break;}
        const error=inherited.stocks[path]+limits.safety*disagreement,origin=previous?.errors[path]?.origin??coarse.start.values[path];
        if(!Number.isFinite(error)||error>tolerance(path,b[path],limits.stockRelative,origin)){accepted=false;break;}errors[path]={error,reference:b[path],...(yStockPath(path)?{origin}:{})};
      }
      const fineGains=Object.fromEntries(Object.keys(coarse.gains).map(k=>[k,B.add(left.gains[k],right.gains[k])]));
      for(const key of Object.keys(fineGains))if(B.gt(B.abs(B.sub(coarse.gains[key],fineGains[key])),B.mul(B.max(1,fineGains[key]),.0002)))accepted=false;
      if(!accepted||!downstream(right.candidate,formal,errors,right.tail,stats,inspect)){stats.mapRejected++;continue;}
      // A final real cadence period supplies lastSettlement, peak/event order
      // and published rates. The approximation ends one period before it.
      const beforeTail=forecast(left.candidate,cycles/2-1,formal,stats,inspect);if(!beforeTail){stats.mapRejected++;continue;}
      const final=formal(beforeTail.candidate,period);
      const endpoint=inspect(final.candidate);if(!same(coarse.start,endpoint)){stats.mapRejected++;continue;}
      for(const path of Object.keys(errors)){const extra=limits.safety*Math.abs(endpoint.values[path]-b[path]);errors[path].error+=extra;errors[path].reference=endpoint.values[path];if(errors[path].error>tolerance(path,endpoint.values[path],limits.stockRelative,errors[path].origin))accepted=false;}
      if(!accepted){stats.mapRejected++;continue;}
      // Integrate local formal income separately from historical stock/total.
      // Large totals can swallow small frame gains and cannot define gross flux.
      const gains=Object.fromEntries(Object.keys(fineGains).map(k=>[k,B.add(B.add(left.gains[k],beforeTail.gains[k]),final.result.resourceGains[k])]));
      const outputs={...previous?.outputs};
      for(const key of Object.keys(gains)){const observed=B.mul(B.add(B.abs(B.sub(coarse.gains[key],fineGains[key])),B.abs(B.sub(gains[key],fineGains[key]))),limits.safety);
        const reference=B.add(outputs[key]?.reference||0,gains[key]),error=B.add(outputs[key]?.error||0,B.add(observed,inherited.gains[key]));
        if(B.gt(error,B.mul(B.max(1,reference),limits.stockRelative))){accepted=false;break;}outputs[key]={reference:String(reference),error:String(error)};
      }
      if(!accepted){stats.mapRejected++;continue;}
      stats.mapAccepted++;stats.virtualSteps=Math.round(cycles*period/.1);stats.maximumBlockSteps=Math.round(cycles*period/.1);
      return {supported:true,seconds:cycles*period,candidate:final.candidate,rates:final.rates,transient:final.transient,candidateTick:final.candidateTick,result:{...final.result,processedSeconds:cycles*period,resourceGains:gains},checkpoint:{version:2,classification:'empirical-martial-cycle',nextSeconds:Math.min(limits.maximumSeconds,Math.max(cycles*period*1.5,(cycles+2)*period)),errors,outputs},stats};
    }return {supported:false,stats};
  }
  W.Simulation.MartialInterval=Object.freeze({advance,limits,validateCheckpoint,shadows,propagate});
})(window.WIS);
