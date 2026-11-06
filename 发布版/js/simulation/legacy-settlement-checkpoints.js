(function(W){
'use strict';
const B=W.Core.BigNum,S=W.Core.State,G=()=>W.Simulation.ResourceGroups,copy=x=>JSON.parse(JSON.stringify(x));
const predictor=(()=>{const config=()=>W.Core.Config.legacySettlementLimits.predictor;
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
return Object.freeze({copy,checkpoint});})();
const localDiscrete=(()=>{const limits=Object.freeze({version:2});
function validateCheckpoint(value){
    if(value?.operatorUnit!=null&&![1,2].includes(value.operatorUnit))throw Error('局部离散宏步算子版本无效');
    if(value==null)return null;if(value.version!==limits.version||value.calibrated!==true||typeof value.signature!=='string'||value.signature.length>32768||value.classification!=='empirical-discrete-map'||!Number.isSafeInteger(value.maps)||value.maps<0||!value.estimates||Object.keys(value.estimates).length>G().keys.length||!Array.isArray(value.active)||new Set(value.active).size!==value.active.length||value.active.some(k=>!G().keys.includes(k)||!value.estimates[k]))throw Error('局部离散宏步checkpoint无效');
    for(const [k,v]of Object.entries(value.estimates))if(!G().keys.includes(k)||!Number.isSafeInteger(v.layer)||v.layer<0||v.layer>2||!Number.isFinite(v.error)||v.error<0||!Number.isFinite(v.reference)||v.reference<=0)throw Error('局部离散宏步误差台账无效');
    if(!value.outputSampling||Object.keys(value.outputSampling).length>64)throw Error('局部离散宏步输出采样台账无效');
    for(const row of Object.values(value.outputSampling)){if(!row||['lower','upper','reference'].some(k=>typeof row[k]!=='string'||!B.parseFinite(row[k])||B.lt(B.parseFinite(row[k]),0))||B.gt(row.lower,row.reference)||B.gt(row.reference,row.upper))throw Error('局部离散宏步输出采样台账无效');}
    return {...copy(value),operatorUnit:value.operatorUnit||1};
  }
return Object.freeze({validateCheckpoint});})();
const martial=(()=>{const limits=Object.freeze({maximumSeconds:300,maximumFields:128});
const clockPaths=new Set(['core.runtime.totalElapsedSeconds','core.runtime.reincarnationElapsedSeconds','core.runtime.currentScaleElapsedSeconds','meta.infinity.runElapsed','meta.challenges.activeChallengeElapsedSeconds','meta.bigNumbers.elapsedSeconds']);
const logPath=path=>/^core\.resources\.(joules|power)$/.test(path)||path==='powerSystem.systems.scale.progress.highestPower'||/^meta\.statistics\.(lifetime|currentRebirth)Highest(J|Power)$/.test(path);
const yStockPath=path=>/^meta\.bigNumbers\.resources\.0\.(amount|total|peak)$/.test(path);
const signedPath=path=>/^meta\.treasureProgressFinite\.[^.]+\.carry$/.test(path);
function dynamic(path){return clockPaths.has(path)||/^meta\.bigNumbers\.(resources\.0\.(amount|total|peak)|ySample\.(rate|baseRate))$/.test(path)||/^core\.resources\.(joules|power)$/.test(path)||/^powerSystem\.systems\.scale\.progress\.(highestPower|totalPower)$/.test(path)||/^cultivation\.systems\.martial\.(resources\.(qi|body|heart|soul)\.(amount|total|spent|peak)|longxiangProgress|heartPotential|heartInvestment)$/.test(path)||/^meta\.statistics\.(lifetime|currentRebirth)(Highest|Total)(J|Power)$/.test(path)||/^meta\.treasureProgress\.[^.]+$/.test(path)||/^meta\.treasureProgressFinite\.[^.]+\.(carry|remaining)$/.test(path);}
function logCoordinate(value){const v=B.parseFinite(value);if(!v||v.sign<0||v.layer>1)return null;return v.layer===0||B.lt(v,1)?Math.log1p(B.toNumber(v))/Math.LN10:v.mag;}
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
return Object.freeze({validateCheckpoint});})();
const capabilityCodes=new Set(['unsupported-execution-signature','coupled-advance-unverified',
    'compiled-micro-settlement-required','direct-work-budget','scale-external-feedback-unvalidated','specialized-scale-required','compiled-plan-stale']);
const fallbacks=Object.create(null);
function retired(){throw Object.assign(Error('旧结算求解器已退役；输入与未结算时间保留'),{code:'legacy-settlement-retired'});}
W.Simulation.LegacySettlementCheckpoints=Object.freeze({predictor,localDiscrete,martial,copy,retired,isCapabilityError:error=>capabilityCodes.has(error?.code),recordFallback(code){fallbacks[code]=(fallbacks[code]||0)+1;},fallbacks:()=>({...fallbacks})});
})(window.WIS);
