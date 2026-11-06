(function defineIntegration(WIS) {
  "use strict";

  const { ZERO, ONE, add, mul, div, sqrt, max, gt, lt, lte } = WIS.Core.BigNum;
  const MAX_GOOGOL_SUBDIVISION_DEPTH = 3;
  const GOOGOL_PENALTY_RATIO_FLOOR = 0.9;

  function integrateGoogolPenalizedRate(
    resource,
    currentAmount,
    baseRate,
    elapsedSeconds,
    currentState,
    options = {}
  ) {
    const seconds = Math.max(0, Number(elapsedSeconds) || 0);
    const rate = max(ZERO, baseRate);
    const start = max(ZERO, currentAmount);
    if (!(seconds > 0) || !gt(rate, ZERO)) {
      return { gain: ZERO, averagePenalty: ONE, segments: 0 };
    }
    const maximumDepth = Math.max(0, Math.min(
      MAX_GOOGOL_SUBDIVISION_DEPTH,
      Math.floor(Number(options.maxDepth ?? MAX_GOOGOL_SUBDIVISION_DEPTH) || 0)
    ));
    const ratioFloor = Math.max(0, Math.min(1,
      Number(options.penaltyRatioFloor ?? GOOGOL_PENALTY_RATIO_FLOOR) || GOOGOL_PENALTY_RATIO_FLOOR
    ));
    const threshold = WIS.Core.Config.googolPenalty.threshold;

    const integrateSegment = (segmentStart, segmentSeconds, depth) => {
      const unpenalizedGain = mul(rate, segmentSeconds);
      if (lte(add(segmentStart, unpenalizedGain), threshold)) {
        return { gain: unpenalizedGain, segments: 1 };
      }
      const startPenalty = WIS.Core.Penalties.googolPenaltyMultiplier(
        resource, segmentStart, currentState
      );
      const predictedEnd = add(segmentStart, mul(unpenalizedGain, startPenalty));
      const endPenalty = WIS.Core.Penalties.googolPenaltyMultiplier(
        resource, predictedEnd, currentState
      );
      const penaltyRatio = gt(startPenalty, ZERO) ? div(endPenalty, startPenalty) : ONE;
      if (depth < maximumDepth && lt(penaltyRatio, ratioFloor)) {
        const firstSeconds = segmentSeconds * 0.5;
        const first = integrateSegment(segmentStart, firstSeconds, depth + 1);
        const second = integrateSegment(
          add(segmentStart, first.gain),
          segmentSeconds - firstSeconds,
          depth + 1
        );
        return { gain: add(first.gain, second.gain), segments: first.segments + second.segments };
      }
      const averagePenalty = sqrt(mul(startPenalty, endPenalty));
      return { gain: mul(unpenalizedGain, averagePenalty), segments: 1 };
    };

    const result = integrateSegment(start, seconds, 0);
    return {
      gain: result.gain,
      averagePenalty: div(result.gain, mul(rate, seconds)),
      segments: result.segments
    };
  }

  // Autonomous positive ODEs in logarithmic arc coordinates. Advancing arc
  // length rather than a Number time step lets a finite e-100000 transition
  // coexist with a normal 0.1-second logic tick. All columns share acceptance.
  const amountWorkContext=Symbol('private-amount-integration');
  function createAdaptiveWork(initial, seconds, rateAt, options = {}) {
    const B=WIS.Core.BigNum, keys=Object.keys(initial), LN10=Math.LN10;
    if(!Number.isFinite(seconds)||seconds<0)throw Error("连续积分时长无效");
    const log1p=x=>{
      const n=B.toNumber(x,NaN);
      return Number.isFinite(n)&&Math.abs(n)<.01 ? n!==0?B.BN(Math.log1p(n)/LN10):B.div(x,LN10) : B.log10(B.add(1,x));
    };
    const expm1=y=>{
      const n=B.toNumber(y,NaN);
      return Number.isFinite(n)&&n<.01 ? n>0?B.BN(Math.expm1(n*LN10)):B.mul(y,LN10) : B.sub(B.pow10(y),1);
    };
    const start=Object.fromEntries(keys.map(k=>[k,B.BN(initial[k])]));
    for(const x of Object.values(start))if(!B.isFiniteBN(x)||B.lt(x,0))throw Error("连续积分库存无效");
    const initialLog=keys.map(k=>log1p(start[k]));
    const smallGains=Object.fromEntries(keys.map(k=>[k,B.ZERO]));
    const amountContext=options[amountWorkContext]||null,A=amountContext?WIS.Core.Amount:null;
    amountContext?.setCoordinates(initialLog);
    let amountRemaining=amountContext?A.from(seconds):null;
    let y=initialLog.slice(),remaining=B.BN(seconds),arc=null,done=seconds===0;
    const closeBudget=()=>{remaining=B.ZERO;if(amountContext)amountRemaining=A.from(0);};
    const divideBudget=denominator=>amountContext?WIS.Core.AmountFormulas.productQuotient([amountRemaining],[denominator]):B.div(remaining,denominator);
    const budgetDifference=value=>{if(!amountContext)return B.abs(B.sub(value,remaining));const other=A.from(value);return A.project(A.compare(amountRemaining,other)>=0?A.subtract(amountRemaining,other):A.subtract(other,amountRemaining));};
    const consumeBudget=value=>{if(!amountContext){remaining=B.max(0,B.sub(remaining,value));return;}const change=A.from(value);if(A.compare(change,amountRemaining)>0)throw Object.assign(Error('Internal action budget overrun'),{code:'amount-budget-unresolved'});amountRemaining=A.subtract(amountRemaining,change);remaining=A.project(amountRemaining);};
    const budgetKey=()=>amountContext?JSON.stringify(A.serialize(amountRemaining)):exact(remaining);
    const exactSkipped={evaluations:0n,accepted:0n,rejected:0n,cycles:0n};
    const logicalCount=(ordinary,extra)=>{const value=BigInt(ordinary)+extra;return value<=BigInt(Number.MAX_SAFE_INTEGER)?Number(value):String(value);};
    let midpointAccepted=false;
    let boundaryAmount=null,boundaryLog=null;
    let evaluations=0,accepted=0,rejected=0,slices=0,last=null,classification='finite',diagnosis=null;
    let shrinkingTime=0, previousTail=null;
    const tolerance=options.logTolerance??1e-4;
    const gainTolerance=options.gainRelativeTolerance??.002;
    // Restricted to an explicitly autonomous scalar callback in an immutable
    // work context. Unknown callbacks retain the original solver unchanged.
    const cycleEnabled=options.autonomous===true && keys.length===1 &&
      typeof options.cycleContextCurrent==='function' && !options.singularityCertificate;
    const exact=x=>{const n=B.BN(x);return [n.sign,n.layer,n.mag].map(v=>Object.is(v,-0)?'-0':String(v)).join(':');};
    const vector=z=>z.map(exact).join('|');
    const sampleKey=a=>JSON.stringify([a.direction.map(exact),a.inverse===null?null:exact(a.inverse),
      keys.map(k=>exact(a.values[k])),keys.map(k=>exact(a.r[k]??0))]);
    let trialSamples=null,failedTrial=null,previousCycle=null;
    let skippedEvaluations=0,skippedAccepted=0,skippedRejected=0;
    let cycleFastForwardCount=0,cycleFastForwardLogicalCycles=0;
    let workOperations=0,cycleBookkeepingOperations=0;
    // Only audited immutable scalar work can prove a deterministic precision
    // cycle. Include the remaining clock: a slow but advancing solve is valid.
    const stalledStates=new Set();
    const clearCycle=()=>{failedTrial=null;previousCycle=null;};
    class TrialError extends Error {}
    const stocks=z=>Object.fromEntries(keys.map((k,i)=>[k,B.max(0,expm1(z[i]))]));
    function* sample(z){
      const values=stocks(z),leftLimit=boundaryLog!==null && B.gte(z[0],boundaryLog);
      if(leftLimit)values[keys[0]]=boundaryAmount;
      const r=amountContext?yield ()=>amountContext.sample(values,z,{leftLimit}):rateAt(values,{leftLimit});evaluations++;
      if(trialSamples)trialSamples.push([vector(z),keys.map(k=>exact(values[k])),keys.map(k=>exact(r[k]??0))]);
      const speed=keys.map(k=>B.div(r[k]??0,B.mul(B.add(values[k],1),LN10)));
      if(speed.some(x=>!B.isFiniteBN(x)||B.lt(x,0)))throw new TrialError("连续积分速率无法表示");
      const fastest=speed.reduce((a,b)=>B.max(a,b),B.ZERO);
      yield;
      return {direction:speed.map(v=>B.gt(fastest,0)?B.div(v,fastest):B.ZERO),
        inverse:B.gt(fastest,0)?B.div(1,fastest):null,values,r};
    }
    const shifted=(z,d,h)=>z.map((v,i)=>B.add(v,B.mul(d[i],h)));
    function logarithmicMean(a,b){
      if(B.eq(a,b))return a;
      const q=B.log10(B.div(b,a));
      return B.lt(B.abs(q),1e-8)?B.mul(B.add(a,b),.5):B.div(B.sub(b,a),B.mul(q,LN10));
    }
    function* path(z,h,first){
      const a=first||(yield* sample(z));
      if(!a.inverse)return {y:z,time:B.ZERO,start:a,end:a};
      const b=(yield* sample(shifted(z,a.direction,B.mul(h,.5))));
      const c=(yield* sample(shifted(z,b.direction,B.mul(h,.5))));
      const d=(yield* sample(shifted(z,c.direction,h)));
      const end=z.map((v,i)=>B.add(v,B.mul(h,B.div(B.add(B.add(a.direction[i],B.mul(b.direction[i],2)),B.add(B.mul(c.direction[i],2),d.direction[i])),6))));
      const e=(yield* sample(end));
      if(!e.inverse||!b.inverse||!c.inverse)throw new TrialError("连续积分遇到零速率边界");
      const midpoint=logarithmicMean(b.inverse,c.inverse);
      const time=B.mul(B.mul(h,.5),B.add(logarithmicMean(a.inverse,midpoint),logarithmicMean(midpoint,e.inverse)));
      return {y:end,time,start:a,end:e};
    }
    function* implicitPath(z,h,first) {
      const a=first||(yield* sample(z));
      if(!a.inverse)return {y:z,time:B.ZERO,start:a,end:a};
      let end=shifted(z,a.direction,h), e=(yield* sample(end)), converged=false;
      const active=a.direction.map((v,i)=>B.gt(v,0)||B.gt(e.direction[i],0)?i:-1).filter(i=>i>=0);
      for(let iteration=0;iteration<12;iteration++){
        const residual=active.map(i=>B.sub(B.sub(end[i],z[i]),B.mul(B.mul(h,.5),B.add(a.direction[i],e.direction[i]))));
        const norm=residual.reduce((m,v,j)=>B.max(m,B.div(B.abs(v),B.max(B.min(tolerance*.05,B.mul(gainTolerance*.05,B.abs(B.sub(end[active[j]],z[active[j]])))),B.mul(Number.EPSILON*64,B.max(1,B.abs(end[active[j]])))))),B.ZERO);
        if(B.lte(norm,1)){converged=true;break;}
        const jac=active.map(()=>active.map(()=>0));
        for(let j=0;j<active.length;j++){
          const i=active[j],eps=B.max('1e-4',B.mul(Number.EPSILON*256,B.abs(end[i])));
          const trial=end.slice();trial[i]=B.add(trial[i],eps);
          const b=(yield* sample(trial));
          for(let k=0;k<active.length;k++)jac[k][j]=B.div(B.sub(b.direction[active[k]],e.direction[active[k]]),eps);
        }
        const matrix=active.map((_,i)=>active.map((_,j)=>B.sub(i===j?1:0,B.mul(B.mul(h,.5),jac[i][j]))).concat(residual[i].neg()));
        // Tiny dense solve; Decimal coefficients preserve huge arc lengths.
        for(let j=0;j<active.length;j++){
          let pivot=j;for(let i=j+1;i<active.length;i++)if(B.gt(B.abs(matrix[i][j]),B.abs(matrix[pivot][j])))pivot=i;
          [matrix[j],matrix[pivot]]=[matrix[pivot],matrix[j]];
          if(B.eq(matrix[j][j],0))throw new TrialError('连续积分牛顿矩阵奇异');
          const d=matrix[j][j];for(let k=j;k<=active.length;k++)matrix[j][k]=B.div(matrix[j][k],d);
          for(let i=0;i<active.length;i++)if(i!==j){const factor=matrix[i][j];for(let k=j;k<=active.length;k++)matrix[i][k]=B.sub(matrix[i][k],B.mul(factor,matrix[j][k]));}
        }
        let factor=1, improved=false;
        for(let search=0;search<8;search++){
          const next=end.slice();for(let j=0;j<active.length;j++){const i=active[j];next[i]=B.max(z[i],B.min(B.add(z[i],h),B.add(end[i],B.mul(matrix[j][matrix[j].length-1],factor))));}
          const ne=(yield* sample(next));
          const nn=active.reduce((m,i)=>B.max(m,B.abs(B.sub(B.sub(next[i],z[i]),B.mul(B.mul(h,.5),B.add(a.direction[i],ne.direction[i]))))),B.ZERO);
          const old=residual.reduce((m,v)=>B.max(m,B.abs(v)),B.ZERO);
          if(B.lt(nn,old)){end=next;e=ne;improved=true;break;}factor*=.5;
        }
        if(!improved)break;
      }
      if(!converged)throw new TrialError('连续积分牛顿步未收敛');
      // Along a locally straight logarithmic path the time density is often
      // exponential. Integrate that density rather than averaging huge rates.
      const mid=(yield* sample(z.map((v,i)=>B.mul(B.add(v,end[i]),.5))));
      const time=B.mul(B.mul(h,.5),B.add(logarithmicMean(a.inverse,mid.inverse),logarithmicMean(mid.inverse,e.inverse)));
      return {y:end,time,start:a,end:e};
    }
    function diagnostics(){return {evaluations,accepted,rejected,slices,diagnosis,arc:String(arc),
          actualEvaluations:evaluations,logicalEvaluations:amountContext?logicalCount(evaluations,exactSkipped.evaluations):evaluations+skippedEvaluations,
          logicalAccepted:amountContext?logicalCount(accepted,exactSkipped.accepted):accepted+skippedAccepted,logicalRejected:amountContext?logicalCount(rejected,exactSkipped.rejected):rejected+skippedRejected,
          cycleFastForwardCount,cycleFastForwardLogicalCycles:amountContext?logicalCount(0,exactSkipped.cycles):cycleFastForwardLogicalCycles,workOperations,cycleBookkeepingOperations};}
    function result(){
      const projected=stocks(y);
      const final=Object.fromEntries(keys.map((k,i)=>[k,midpointAccepted?B.add(start[k],smallGains[k]):B.eq(y[i],initialLog[i])?start[k]:B.max(start[k],projected[k])]));
      return {done,status:done?'completed':diagnosis?.code||'pending',
        classification:diagnosis?.code==='singularity-suspected'?'undetermined':classification,remainingSeconds:String(remaining),...(amountContext?{remainingQuantity:A.serialize(amountRemaining)}:{}),
        gains:Object.fromEntries(keys.map((k,i)=>[k,midpointAccepted||B.eq(y[i],initialLog[i])?smallGains[k]:B.max(0,B.sub(final[k],start[k]))])),final,
        diagnostics:diagnostics()};
    }
    function* solve(){
      // Embedded midpoint/Euler predictor is cheap when this whole logical
      // interval already meets the stock error budget. Steep intervals switch
      // to adaptive log-arc integration rather than increasing an evaluation cap.
      if(!done){
        try {
          const a=yield* sample(y);
          const mid=keys.map(k=>log1p(B.add(start[k],B.mul(a.r[k]||0,seconds*.5))));
          const m=yield* sample(mid);
          const prediction=keys.map(k=>log1p(B.add(start[k],B.mul(a.r[k]||0,seconds))));
          const end=keys.map(k=>log1p(B.add(start[k],B.mul(m.r[k]||0,seconds))));
          const error=end.reduce((n,v,i)=>B.max(n,B.div(B.abs(B.sub(v,prediction[i])),
            B.max(B.min(tolerance*.1,B.mul(gainTolerance,B.abs(B.sub(v,y[i])))),B.mul(Number.EPSILON*64,B.max(1,B.abs(v)))))),B.ZERO);
          const firstBoundary=amountContext?yield ()=>amountContext.nextBoundary(a.values):options.nextBoundary?.(a.values);
          const crossesBoundary=firstBoundary!=null && (B.gte(expm1(prediction[0]),firstBoundary)||B.gte(expm1(end[0]),firstBoundary));
          if(B.lte(error,1) && !crossesBoundary){
            for(const k of keys)smallGains[k]=B.mul(m.r[k]||0,seconds);
            midpointAccepted=true;
            y=end;closeBudget();done=true;accepted++;return result();
          }
          last=a;
        }catch(error){if(!(error instanceof TrialError))throw error;}
      }
      while(!done){
        const a=last||(yield* sample(y));
        if(options.detectPrecisionStall && cycleEnabled && options.cycleContextCurrent()){
          const checkpoint=JSON.stringify([vector(y),budgetKey(),arc===null?null:exact(arc),sampleKey(a),
            last!==null,boundaryLog===null?null:exact(boundaryLog),boundaryAmount===null?null:exact(boundaryAmount),
            keys.map(k=>exact(smallGains[k])),midpointAccepted,shrinkingTime,
            previousTail===null?null:exact(previousTail),diagnosis,classification,rejected>=8,
            failedTrial,previousCycle]);
          if(stalledStates.has(checkpoint)){
            diagnosis={code:'precision-stalled',certified:true,message:'当前数值精度下积分重复相同状态，未提交本次收益'};
            return result();
          }
          if(stalledStates.size>=32)stalledStates.delete(stalledStates.values().next().value);
          stalledStates.add(checkpoint);
        }
        if(!a.inverse){closeBudget();done=true;break;}
        if(!arc){
          // Initial linear prediction is only a bracket, never the settlement.
          const estimate=amountContext?yield ()=>divideBudget(a.inverse):B.div(remaining,a.inverse);arc=B.max('1e-300',log1p(estimate));
        }
        if(options.nextBoundary && keys.length===1){
          boundaryAmount=amountContext?yield ()=>amountContext.nextBoundary(a.values):options.nextBoundary(a.values);
          boundaryLog=boundaryAmount!==null && B.gt(boundaryAmount,a.values[keys[0]])?log1p(boundaryAmount):null;
          if(boundaryLog!==null)arc=B.min(arc,B.sub(boundaryLog,y[0]));
        }
        const cycleCurrent=cycleEnabled && options.cycleContextCurrent();
        if(!cycleCurrent)clearCycle();
        trialSamples=cycleCurrent?[]:null;
        const trialEvaluations=evaluations,trialY=cycleCurrent?vector(y):null,trialArc=cycleCurrent?exact(arc):null;
        let full,half1,half2;
        try{
          const integrate=keys.length>1 && rejected>=8 && B.gt(arc,.25)?implicitPath:path;
          full=(yield* integrate(y,arc,a));half1=(yield* integrate(y,B.mul(arc,.5),a));half2=(yield* integrate(half1.y,B.mul(arc,.5),half1.end));
        }catch(error){
          if(!(error instanceof TrialError))throw error;
          // A trial overflow is rejected; committed state and logical time stay
          // untouched. It is not evidence that the underlying ODE diverges.
          clearCycle();arc=B.mul(arc,.25);rejected++;last=a;
          if(!B.gt(arc,0))throw error;
          continue;
        }
        const time=B.add(half1.time,half2.time);
        let error=B.ZERO;
        for(let i=0;i<keys.length;i++){
          const floor=B.max(B.min(tolerance,B.mul(gainTolerance,B.abs(B.sub(half2.y[i],y[i])))),B.mul(Number.EPSILON*64,B.max(1,B.max(B.abs(y[i]),B.abs(half2.y[i])))));
          error=B.max(error,B.div(B.abs(B.sub(full.y[i],half2.y[i])),floor));
        }
        const timeError=B.abs(B.log10(B.div(time,full.time)));
        error=B.max(error,B.div(timeError,B.max(tolerance,B.mul(Number.EPSILON*64,B.abs(B.log10(time))))));
        const trialKey=cycleCurrent?JSON.stringify([trialY,trialArc,sampleKey(a),trialSamples,
          vector(full.y),vector(half1.y),vector(half2.y),exact(full.time),exact(half1.time),exact(half2.time),
          exact(time),exact(error),exact(timeError),sampleKey(half2.end)]):null;
        if(!B.isFiniteBN(error)||B.gt(error,1)){
          if(failedTrial)previousCycle=null;
          failedTrial=cycleCurrent && B.isFiniteBN(error)?{key:trialKey,y:trialY,arc:trialArc,count:evaluations-trialEvaluations}:null;
          arc=B.mul(arc,.5);rejected++;last=a;continue;
        }
        const ratio=amountContext?yield ()=>WIS.Core.AmountFormulas.productQuotient([time],[amountRemaining]):B.div(time,remaining);
        // A tiny relative clock error may still imply an observable stock error
        // near an extremely steep endpoint. Check both before closing the tick.
        const endpointTimeError=budgetDifference(time);
        const endpointError=half2.y.reduce((largest,v,i)=>{
          const budget=B.max(B.min(tolerance,B.mul(gainTolerance,B.abs(B.sub(v,y[i])))),
            B.mul(Number.EPSILON*64,B.max(1,B.abs(v))));
          return B.max(largest,B.div(B.mul(B.div(endpointTimeError,half2.end.inverse),half2.end.direction[i]),budget));
        },B.ZERO);
        const endpointAccepted=B.lte(B.abs(B.sub(ratio,1)),1e-7)&&B.lte(endpointError,1);
        if(B.gt(ratio,1)&&!endpointAccepted){
          // Invert the exponential time density to locate this tick's endpoint.
          const slope=B.div(B.log10(B.div(half2.end.inverse,a.inverse)),arc);
          const coordinateBudget=amountContext?yield ()=>divideBudget(a.inverse):B.div(remaining,a.inverse),term=B.mul(coordinateBudget,B.mul(slope,LN10));
          let next=B.eq(slope,0)?coordinateBudget:B.gt(B.add(1,term),0)?B.div(log1p(term),slope):B.mul(arc,.5);
          if(!B.gt(next,0)||!B.lt(next,arc))next=B.mul(arc,.5);
          clearCycle();arc=next;last=a;continue;
        }
        // A local power-law fit cannot prove the global behavior of an arbitrary
        // callback. Keep numerical suspicion separate from an analytic contract;
        // suspected finite models continue from this checkpoint on later calls.
        const densitySlope=B.div(B.log10(B.div(half2.end.inverse,a.inverse)),arc);
        const tailEstimate=B.lt(densitySlope,0)?B.div(half2.end.inverse,B.mul(densitySlope.neg(),LN10)):null;
        if(tailEstimate && B.lt(tailEstimate,B.mul(remaining,.01)) && previousTail && B.lt(tailEstimate,previousTail))shrinkingTime++;
        else shrinkingTime=0;
        previousTail=tailEstimate;
        if(shrinkingTime>=6)diagnosis={code:'singularity-suspected',remainingTailEstimate:String(tailEstimate),
          certified:false,message:'连续速率显示收敛的剩余时间；局部采样不是全局发散证明，保留数值检查点继续验证'};
        const tail=options.singularityCertificate?.({values:half2.end.values,rates:half2.end.r,
          arc,remaining,time,start:a,end:half2.end});
        if(tail){diagnosis={code:'finite-time-singularity',...tail};classification='singular';return result();}
        for(let i=0;i<keys.length;i++)if(B.eq(half2.y[i],initialLog[i])){
          const k=keys[i];smallGains[k]=B.add(smallGains[k],B.mul(time,B.mul(.5,B.add(a.r[k]||0,half2.end.r[k]||0))));
        }
        y=half2.y;last=half2.end;accepted++;
        if(boundaryLog!==null && B.gte(y[0],boundaryLog)){
          y[0]=boundaryLog;
          if(amountContext)yield ()=>amountContext.crossBoundary(boundaryAmount,y);
          last=null;boundaryLog=null;boundaryAmount=null;clearCycle();
        }
        if(diagnosis?.code==='singularity-suspected' && shrinkingTime===0)diagnosis=null;
        // Quadrature error is resource approximation, not lost host time: the
        // caller commits the full requested tick once its endpoint is located.
        if(endpointAccepted){closeBudget();done=true;break;}
        consumeBudget(time);
        if(B.lt(time,B.mul(seconds,'1e-12')))classification='steep-finite';
        arc=B.mul(arc,B.lt(error,.05)?2:1.25);
        // A reject/accept pair can return to exactly the same representable
        // solver state. Observe two identical pairs, including every sample,
        // before omitting further quadrature. Never batch initial smallGains.
        const repeatable=cycleCurrent && options.cycleContextCurrent() && failedTrial &&
          trialY===vector(y) && failedTrial.y===trialY && failedTrial.arc===exact(arc) &&
          sampleKey(a)===sampleKey(last) && !B.eq(y[0],initialLog[0]) &&
          !diagnosis && shrinkingTime===0 && previousTail===null && B.gt(time,0);
        const cycleKey=repeatable?JSON.stringify([failedTrial.key,trialKey,classification]):null;
        if(cycleKey && cycleKey===previousCycle){
          // Keep two complete cycles plus the endpoint with the original solver.
          // Repeated Decimal subtraction is intentional: N*time can round
          // differently and must not change the final endpoint arc or stock.
          const reserve=B.mul(time,4);
          if(amountContext){
            const skipped=yield ()=>{
              const Q=WIS.Core.RankBudget.Q,L=WIS.Core.AmountLedger,R=WIS.Core.Rank,rank=A.floor(A.divide(amountRemaining,time)),pair=Q.fractionPair(L.toQ(R.difference(rank,0))),count=BigInt(pair.n)/BigInt(pair.d)-4n;
              if(count<=0n)return 0n;const spent=A.fromParts(0,L.fromQ(Q.multiply(Q.decimal(String(time)),Q.decimal(String(count))))),next=A.subtract(amountRemaining,spent);
              amountRemaining=next;remaining=A.project(next);return count;
            };
            if(skipped){cycleFastForwardCount++;cycleBookkeepingOperations++;exactSkipped.cycles+=skipped;exactSkipped.evaluations+=skipped*BigInt(failedTrial.count+evaluations-trialEvaluations);exactSkipped.accepted+=skipped;exactSkipped.rejected+=skipped;}
          }else {
          let count=0;
          const limit=Math.floor(B.toNumber(B.div(remaining,time),NaN));
          if(Number.isSafeInteger(limit) && Number.isSafeInteger(limit*(failedTrial.count+evaluations-trialEvaluations)))for(let i=0;i<limit && B.gt(remaining,reserve);i++){
            const nextRemaining=B.max(0,B.sub(remaining,time));
            if(!B.lt(nextRemaining,remaining))break;
            remaining=nextRemaining;count++;cycleBookkeepingOperations++;
            // Preserve EACH represented subtraction; never replace it by N*time.
            // Yield inside the loop so a no-sample cycle cannot evade the caller's
            // independent work/deadline budget for one iterator.next().
            yield;
          }
          if(count){cycleFastForwardCount++;cycleFastForwardLogicalCycles+=count;
            skippedEvaluations+=count*(failedTrial.count+evaluations-trialEvaluations);
            skippedAccepted+=count;skippedRejected+=count;}
          }
        }
        previousCycle=cycleKey;failedTrial=null;trialSamples=null;
      }
      return result();
    }
    const iterator=solve();let finished=false,proofWork=null,resumeInput;
    return {advance({maximumEvaluations=48,maximumOperations=256,deadline=Infinity}={}){
      const begin=evaluations;slices++;
      const operationsAtStart=workOperations;
      if(!(maximumOperations>0)||(!Number.isFinite(maximumOperations)&&maximumOperations!==Infinity))throw Error('积分工作预算无效');
      while(!finished && evaluations-begin<maximumEvaluations && workOperations-operationsAtStart<maximumOperations && performance.now()<deadline){
        if(proofWork){const capacity=Math.min(65536,Math.max(1,maximumOperations-(workOperations-operationsAtStart))),beforeProof=proofWork.diagnostics().totalOperations;let next;
          try{next=proofWork.advance({maximumOperations:capacity,deadline});}catch(error){workOperations+=proofWork.diagnostics().totalOperations-beforeProof;throw error;}
          workOperations+=next.operations;if(!next.done)break;resumeInput=proofWork.result();proofWork=null;if(workOperations-operationsAtStart>=maximumOperations)break;}
        workOperations++;
        const step=iterator.next(resumeInput);resumeInput=undefined;finished=step.done;
        if(amountContext&&!step.done&&typeof step.value==='function')proofWork=WIS.Core.CertifiedRankMath.createWork(step.value,{isCurrent:amountContext.isCurrent});
      }
      return result();
    },snapshot:result,diagnostics,...(amountContext?{cancel(){proofWork?.cancel();proofWork=null;finished=true;iterator.return();}}:{})};
  }


  // A completion certificate for an audited CONSTANT raw scalar source with the
  // existing Googol law. It is a fallback, never a replacement for an already
  // completed formal solve. No gameplay equation is changed.
  //
  // z=log10(M), alpha=log10(highScaleBase), c=-strength*log10(q)/d.
  // The positive action primitive is integral dM/(raw*P(M)). At high z its
  // endpoint is enclosed by the root z+c*z*(z/thresholdLog)^alpha=log10(raw*t).
  // For z>=1e20, thresholdLog<=1000, d<=10 and alpha<=.1, the floor/threshold,
  // initial inventory (M/10>M0), last-decade primitive bounds and log(t) move
  // log10(z) by < 1e4/z. This follows from
  // T(M)<=M/(raw*P(M)) and T(M)>=.9*M/(raw*P(M/10)).
  // We enclose that correction, not drop it. Success requires BOTH enclosure
  // endpoints to round to one identical Decimal component, for stock AND gain.
  // Fixed-point arithmetic is PRIVATE normalized log math; saved resources and
  // every public result continue to use the existing Decimal representation.
  const amountInverseEnvelope=Symbol('complete-googol-input-envelope');
  function createGoogolScalarEndpointWork(initial, seconds, rawRate, options = {}) {
    if(WIS.Core.Amount?.isAmount(initial)||WIS.Core.Amount?.isAmount(rawRate))return createAmountGoogolEndpointWork(initial,seconds,rawRate,options);
    const B=WIS.Core.BigNum, start=B.BN(initial), raw=B.mul(rawRate,seconds);
    const {q,strength,highScaleBase,threshold,delayed=false,contextCurrent}=options;
    const native=x=>{const v=B.BN(x);return v.layer===0?v.sign*v.mag:NaN;};
    const qn=native(q),sn=native(strength),alpha=native(B.log10(highScaleBase));
    const thresholdValue=B.BN(threshold),thresholdLog=thresholdValue.layer===1?thresholdValue.mag:NaN;
    if(typeof contextCurrent!=='function'||!contextCurrent()||!Number.isFinite(seconds)||!(seconds>0)||
       !B.isFiniteBN(start)||B.lt(start,0)||!B.isFiniteBN(raw)||raw.layer<2||!(raw.mag>=20)||
       !B.gt(raw,start)||!(qn>0&&qn<1)||!(sn>0)||!Number.isFinite(sn)||
       !(alpha>=0&&alpha<=.1)||!(thresholdLog>0&&thresholdLog<=1000))return null;
    // 60 fractional decimal places plus exact BigInt integer columns. Conversion
    // from a Number reads its binary significand, avoiding decimal-string input
    // rounding inside the certificate. Work-local only, never a result cache.
    const digits=60,unit=10n**60n,abs=x=>x<0n?-x:x;
    const mulF=(a,b)=>a*b/unit,divF=(a,b)=>a*unit/b;
    const textF=n=>{const sign=n<0n?'-':'';let t=abs(n).toString().padStart(digits+1,'0');return sign+t.slice(0,-digits)+'.'+t.slice(-digits);};
    const numberF=(value,shift=0)=>{
      if(value===0)return 0n;
      const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,Math.abs(value));
      const hi=view.getUint32(0),lo=view.getUint32(4),e=(hi>>>20)&2047;
      let a=(BigInt(hi&1048575)<<32n)|BigInt(lo);if(e)a|=1n<<52n;
      let n=a*unit,d=1n;const binary=(e?e-1023:1-1023)-52;
      if(binary>=0)n<<=BigInt(binary);else d<<=BigInt(-binary);
      if(shift>=0)n*=10n**BigInt(shift);else d*=10n**BigInt(-shift);
      return (value<0?-1n:1n)*(n/d);
    };
    const ln10=2302585092994045684017991454684364207601101488628772976033327n;
    const lnF=value=>{
      if(value<=0n)throw Error('端点对数输入无效');
      let v=value,e=0n;while(v<unit){v*=10n;e--;}while(v>=10n*unit){v/=10n;e++;}
      const a=divF(v-unit,v+unit),aa=mulF(a,a);let term=a,total=a;
      for(let n=3;n<=1025;n+=2){term=mulF(term,aa);const part=term/BigInt(n);total+=part;if(abs(part)<=1n)break;}
      return 2n*total+e*ln10;
    };
    const logF=v=>divF(lnF(v),ln10);
    const logNumber=value=>{
      const exponent=Math.floor(Math.log10(value));
      return logF(numberF(value,-exponent))+BigInt(exponent)*unit;
    };
    const expF=value=>{
      let x=value,halves=0;while(abs(x)>unit/4n){x/=2n;halves++;}
      let sum=unit,term=unit;
      for(let n=1;n<300;n++){term=mulF(term,x)/BigInt(n);sum+=term;if(abs(term)<=1n)break;}
      for(let n=0;n<halves;n++)sum=mulF(sum,sum);
      return sum;
    };
    const tenF=x=>expF(mulF(x,ln10));
    const softplus=x=>{
      if(x>50n*unit)return {value:x,derivative:unit};
      if(x< -50n*unit)return {value:0n,derivative:0n};
      const v=tenF(-abs(x)),tail=logF(unit+v);
      return {value:(x>0n?x:0n)+tail,derivative:x>=0n?divF(unit,unit+v):divF(v,unit+v)};
    };
    const af=logNumber(native(highScaleBase)),aRaw=numberF(raw.mag);
    if(af<0n||af>unit/10n)return null;
    const cLog=logF(-logNumber(qn))+logNumber(sn)-
      logNumber(delayed?10:1)-mulF(af,logNumber(thresholdLog));
    let operations=0,slices=0,done=false,rejected=false,certificate=null,final=null;
    function* solve(){
      let root=aRaw,residual=0n;
      if(raw.layer===2){
        root=divF(aRaw-cLog,unit+af);if(root>aRaw)root=aRaw;
        for(let n=0;n<16;n++){
          const p=softplus(cLog+mulF(af,root));
          residual=root+p.value-aRaw;
          if(abs(residual)<(unit+abs(root))/(10n**50n))break;
          root-=divF(residual,unit+mulF(af,p.derivative));yield;
        }
      }else if(raw.layer===3){root=aRaw-logF(unit+af);}
      yield;
      // A failed round-to-one proof stays an explicit failure. Never pick an
      // arbitrary adjacent endpoint or consume the unfinished action budget.
      if(root<20n*unit){rejected=true;return;}
      const model=root<64n*unit?tenF(4n*unit-root):1n;
      const rounding=(unit+abs(root))/(10n**38n)+abs(residual);
      // Complete rate is proved between half and twice the central raw budget.
      // Its log10 perturbation is <1 order. The root in log10(log10 M)
      // moves by <1/z (the positive primitive derivative is >=1).
      // Charge 100/z separately; it must still round to ONE identical component.
      const inputEnvelope=options[amountInverseEnvelope]?(root<64n*unit?tenF(2n*unit-root):1n):0n;
      const radius=model+rounding+inputEnvelope;
      const lower=Number(textF(root-radius)),upper=Number(textF(root+radius));
      if(!Number.isFinite(lower)||lower!==upper){rejected=true;return;}
      const candidate=B.Decimal.fromComponents(1,raw.layer,lower);
      // For layer >=3, c enters one or more logs below the stored component.
      // Bound its correction before certifying the same representable endpoint.
      if(raw.layer>=3){
        const extra=mulF(unit+abs(cLog),model),lo=Number(textF(root-radius-extra)),hi=Number(textF(root+radius+extra));
        if(lo!==lower||hi!==lower){rejected=true;return;}
      }
      if(!B.gt(B.div(candidate,10),start)||!B.eq(B.sub(candidate,start),candidate)){rejected=true;return;}
      final=candidate;done=true;
      certificate={method:'monotone-googol-action-inverse',roundingCertified:true,
        rawRateConstant:true,wholeBudget:true,delayed,componentLower:lower,componentUpper:upper,
        normalizedRadius:textF(radius),representation:'existing-Decimal',
        model:'positive-action-primitive-enclosure'};
    }
    const iterator=solve();
    const snapshot=()=>({done,status:done?'completed':rejected?'precision-stalled':'pending',
      classification:'finite',remainingSeconds:done?'0':String(seconds),
      gains:{amount:done?final:B.ZERO},final:{amount:done?final:start},
      diagnostics:{evaluations:0,actualEvaluations:0,logicalEvaluations:0,accepted:done?1:0,rejected:rejected?1:0,
        slices,workOperations:operations,completionCertificate:certificate,
        diagnosis:rejected?{code:'precision-stalled',certified:true,message:'端点舍入区间尚不能证明唯一结果，未提交收益'}:null}});
    return Object.freeze({
      advance({maximumOperations=256,deadline=Infinity}={}){
        if(!contextCurrent())throw Error('端点候选失效');
        if(!(maximumOperations>0))throw Error('积分工作预算无效');
        slices++;let count=0;
        while(!done&&!rejected&&count<maximumOperations&&performance.now()<deadline){
          count++;operations++;const step=iterator.next();if(step.done&&!done)rejected=true;
        }
        return snapshot();
      },snapshot
    });
  }

  // Public unlimited requests still use bounded certified proof packets.
  function certifiedSliceBudget(options={},remainingOperations=options.maximumOperations??256){
    const requested=options.maximumOperations??256,deadline=options.deadline??Infinity;
    if(requested!==Infinity&&(!Number.isSafeInteger(requested)||requested<1)||remainingOperations!==Infinity&&(!Number.isSafeInteger(remainingOperations)||remainingOperations<1)||typeof deadline!=='number'||Number.isNaN(deadline))
      throw Object.assign(Error('proof slice budget'),{code:'rank-cost-unresolved'});
    return {maximumOperations:Math.min(65536,remainingOperations),deadline};
  }

  // A recoverable exception still consumes its native/proof operation delta.
  function advanceMeasured(work,budget,readOperations,charge){
    const before=readOperations();try{return work.advance(budget);}finally{charge(readOperations()-before);}
  }

  function createAmountGoogolEndpointWork(initial,seconds,rawRate,options){
    const A=WIS.Core.Amount,B=WIS.Core.BigNum,C=WIS.Core.CertifiedRankMath;
    if(!A.enabled()||!Number.isFinite(seconds)||seconds<=0||typeof options.contextCurrent!=='function')return null;
    const start=A.from(initial),rate=A.from(rawRate);let native=null,post=null,completed=null,cancelled=false,refused=false,proofOperations=0,proofSlices=0,budgetOperations=0;
    const current=()=>!cancelled&&options.contextCurrent();
    const preparation=C.createWork(()=>{
      const head=A.project(rate),raw=B.mul(head,seconds),whole=A.scale(rate,seconds),center=A.from(raw);
      if(!B.isFiniteBN(raw)||raw.layer<2||raw.mag<20||A.compare(whole,A.scale(center,.5))<0||A.compare(whole,A.scale(center,2))>0)return false;
      native=createGoogolScalarEndpointWork(A.project(start),seconds,head,{...options,[amountInverseEnvelope]:true});return !!native;
    },{isCurrent:current});
    let prepared=false;
    const snapshot=()=>{
      if(completed)return {...completed,diagnostics:{...completed.diagnostics,budgetOperations}};
      const value=native?.snapshot(),d=value?.diagnostics||{evaluations:0,accepted:0,rejected:0,slices:0,workOperations:0,actualEvaluations:0,logicalEvaluations:0};
      return {done:false,status:refused?'precision-stalled':'pending',classification:'finite',remainingSeconds:String(seconds),remainingQuantity:{kind:'wis-amount',version:1,main:String(seconds),tail:[]},gains:{amount:B.ZERO},final:{amount:A.project(start)},diagnostics:{...d,budgetOperations,workOperations:d.workOperations+proofOperations,slices:d.slices+proofSlices,...(refused?{diagnosis:{code:'precision-stalled',certified:true,message:'完整输入端点区间尚未获得唯一舍入证明'}}:{})}};
    };
    return Object.freeze({advance(budget={}){
      if(!current())throw Object.assign(Error('Complete endpoint context changed'),{code:'amount-work-stale'});
      if(completed||refused)return snapshot();
      const slice=certifiedSliceBudget(budget);proofSlices++;
      if(!prepared){const next=advanceMeasured(preparation,slice,()=>preparation.diagnostics().totalOperations,used=>{proofOperations+=used;budgetOperations+=used;});if(!next.done)return snapshot();prepared=true;if(!preparation.result())refused=true;return snapshot();}
      if(!post){const next=advanceMeasured(native,{...budget,...slice},()=>native.snapshot().diagnostics.workOperations,used=>{budgetOperations+=used;});if(!next.done){if(next.status==='precision-stalled')refused=true;return snapshot();}
        post=C.createWork(()=>{
          const gain=A.from(next.gains.amount);
          // The primitive's initial-inventory enclosure is required for the
          // complete input, not merely its central Decimal projection.
          if(A.compare(A.divide(gain,10),start)<=0)return null;
          const final=A.add(start,gain),d=next.diagnostics;
          return {...next,remainingQuantity:A.serialize(A.from(0)),quantities:{gains:{amount:gain},final:{amount:final}},final:{amount:A.project(final)},diagnostics:{...d,workOperations:d.workOperations+proofOperations,slices:d.slices+proofSlices,completionCertificate:{...d.completionCertificate,completeInputEnclosed:true,rawEnvelope:'[central/2,central*2]',inputCorrection:'100/z'}}};
        },{isCurrent:current});return snapshot();
      }
      const next=advanceMeasured(post,slice,()=>post.diagnostics().totalOperations,used=>{proofOperations+=used;budgetOperations+=used;});if(next.done){completed=post.result();if(!completed)refused=true;}return snapshot();
    },snapshot,cancel(){cancelled=true;preparation.cancel();post?.cancel();completed=null;}});
  }

  function createAmountWork(initial,seconds,rateAt,options={}){
    const A=WIS.Core.Amount,B=WIS.Core.BigNum,C=WIS.Core.CertifiedRankMath,L=WIS.Core.AmountLedger,F=WIS.Core.AmountFormulas;
    if(!A?.enabled()||typeof rateAt!=='function')throw Object.assign(Error('Amount integration model or callback unavailable'),{code:'amount-model-disabled'});
    if(!Number.isFinite(seconds)||seconds<0)throw Error('连续积分时长无效');
    const keys=Object.keys(initial),start=Object.fromEntries(keys.map(k=>[k,A.from(initial[k])])),heads=Object.fromEntries(keys.map(k=>[k,A.project(start[k])]));
    let cancelled=false,failure=null,coordinates=null,offsets=null,initialOffsets=null,pinned=null,boundary=null,gainCoordinates=false;
    let underlying=null,constantWork=null,constantResult=null,initialWork=null,publication=null,lastPublished=null;
    // Offsets are work-private immutable word arrays, replaced at a boundary.
    // Keep only the last complete numeric input per offset; never rate results.
    let coordinateInputs=new WeakMap(),budgetOperations=0;
    const current=()=>!cancelled&&(options.isCurrent?.()??true),invalid=(message,code)=>Object.assign(Error(message),{code});
    const check=()=>{if(cancelled)throw invalid('Amount integration cancelled','amount-work-cancelled');if(failure)throw failure;if(!current())throw invalid('Amount integration owner changed','amount-work-stale');};
    const withBudget=result=>({...result,diagnostics:{...result.diagnostics,budgetOperations}});
    const pending=()=>withBudget(lastPublished||{done:false,status:'pending',remainingSeconds:String(seconds),remainingQuantity:{kind:'wis-amount',version:1,main:String(seconds),tail:[]},diagnostics:{accepted:0,workOperations:0,slices:0,evaluations:0,actualEvaluations:0,logicalEvaluations:0}});
    const readRates=(input,context)=>{
      const result=rateAt(input,context);
      if(!result||typeof result!=='object')throw invalid('Amount integration rate invalid','formula-representation');
      return Object.fromEntries(keys.map(k=>{if(!(k in result))throw invalid('Amount integration rate missing '+k,'formula-representation');return [k,A.from(result[k])];}));
    };
    const projectRates=rates=>Object.fromEntries(keys.map(k=>[k,rates[k].tail.length?F.power(rates[k],1):A.project(rates[k])]));
    const inputAt=(values,z,context={})=>Object.fromEntries(keys.map((k,i)=>{
      if(z&&pinned&&B.eq(z[i],pinned.z[i]))return [k,pinned.values[k]];
      if(context.leftLimit&&i===0&&boundary&&B.eq(values[k],boundary.coordinate))return [k,boundary.value];
      const text=String(values[k]),words=offsets[k],previous=coordinateInputs.get(words);
      if(previous?.text===text)return [k,previous.value];
      const value=A.fromParts(0,[text,...words]);coordinateInputs.set(words,{text,value});return [k,value];
    }));
    const decorate=result=>{
      const gains=Object.fromEntries(keys.map(k=>[k,A.fromParts(0,[String(result.gains[k]),...offsets[k],...L.negate(initialOffsets[k])])])),final=Object.fromEntries(keys.map(k=>[k,A.add(start[k],gains[k])]));
      return {...result,quantities:{gains,final},diagnostics:{...result.diagnostics,coordinates:gainCoordinates?'gain':'stock'}};
    };
    if(options.constantRates){
      const rates=Object.fromEntries(keys.map(k=>{if(!(k in options.constantRates))throw invalid('Constant amount rate missing '+k,'formula-representation');return [k,A.from(options.constantRates[k])];}));
      constantWork=C.createWork(()=>{
        const gains=Object.fromEntries(keys.map(k=>[k,A.scale(rates[k],seconds)])),final=Object.fromEntries(keys.map(k=>[k,A.add(start[k],gains[k])]));
        return {done:true,status:'completed',classification:'finite',remainingSeconds:'0',remainingQuantity:A.serialize(A.from(0)),gains:Object.fromEntries(keys.map(k=>[k,A.project(gains[k])])),final:Object.fromEntries(keys.map(k=>[k,A.project(final[k])])),quantities:{gains,final},diagnostics:{accepted:1,evaluations:0,workOperations:0,method:'exact-constant-quantity'}};
      },{isCurrent:current});
    }else initialWork=C.createWork(()=>{
      // Preserve the established coordinates whenever they can express the
      // interval. Otherwise integrate a separate gain: a huge stock must not
      // freeze its own feedback while confirmed small gains accumulate.
      const rates=readRates(start,{leftLimit:false}),projectedRates=projectRates(rates);
      const firstBoundary=keys.length===1?options.nextBoundary?.(start):null;
      gainCoordinates=keys.some(k=>A.compare(rates[k],0)>0&&seconds>0&&B.eq(B.add(heads[k],B.mul(projectedRates[k],seconds)),heads[k])) ||
        firstBoundary!=null&&A.compare(firstBoundary,start[keys[0]])>0&&B.lte(A.project(firstBoundary),heads[keys[0]]);
      const nativeStart=Object.fromEntries(keys.map(k=>[k,gainCoordinates?B.ZERO:heads[k]]));
      offsets=Object.fromEntries(keys.map(k=>[k,L.safeNormalize([...A.words(start[k]),...L.negate([String(nativeStart[k])])])]));
      initialOffsets=Object.fromEntries(keys.map(k=>[k,offsets[k].slice()]));
      let firstRates=projectedRates;
      const context={isCurrent:current,setCoordinates(value){coordinates=value;pinned={z:value.slice(),values:start,native:nativeStart};},
        sample(values,z,limit){
          for(let i=0;i<keys.length;i++)if(pinned&&B.eq(z[i],pinned.z[i]))values[keys[i]]=pinned.native[keys[i]];
          if(firstRates&&z.every((v,i)=>B.eq(v,coordinates[i]))&&!limit.leftLimit){const result=firstRates;firstRates=null;return result;}
          return projectRates(readRates(inputAt(values,z,limit),limit));
        },
        nextBoundary(values){
          if(typeof options.nextBoundary!=='function')return null;
          const input=inputAt(values),target=options.nextBoundary(input);boundary=null;
          if(target==null)return null;
          const value=A.from(target),k=keys[0];if(A.compare(value,input[k])<=0)return null;
          const coordinate=A.project(A.fromParts(0,[...A.words(value),...L.negate(offsets[k])]));
          if(!B.gt(coordinate,values[k]))throw Object.assign(invalid('Exact integration boundary requires a new coordinate origin','amount-boundary-unresolved'),{reason:'coordinate-origin',coordinate:String(coordinate),native:String(values[k]),stock:A.serialize(input[k]),target:A.serialize(value),offsets:offsets[k]});
          boundary={coordinate,value};return coordinate;
        },
        crossBoundary(coordinate,z){
          if(!boundary||!B.eq(coordinate,boundary.coordinate))throw invalid('Integration boundary ownership changed','amount-boundary-unresolved');
          const k=keys[0],value=boundary.value;
          offsets[k]=L.safeNormalize([...A.words(value),...L.negate([String(coordinate)])]);
          pinned={z:z.slice(),values:{[k]:value},native:{[k]:coordinate}};boundary=null;
        }};
      underlying=createAdaptiveWork(nativeStart,seconds,null,{...options,[amountWorkContext]:context});return true;
    },{isCurrent:current});
    const work={advance(budget={}){
      check();try{
        const slice=certifiedSliceBudget(budget);let remaining=budget.maximumOperations??256;
        if(constantWork){if(constantResult)return withBudget(constantResult);const next=advanceMeasured(constantWork,slice,()=>constantWork.diagnostics().totalOperations,used=>{budgetOperations+=used;});if(next.done){constantResult=constantWork.result();return withBudget(constantResult);}return pending();}
        if(initialWork){const next=advanceMeasured(initialWork,slice,()=>initialWork.diagnostics().totalOperations,used=>{budgetOperations+=used;});if(!next.done)return pending();initialWork=null;return pending();}
        if(!publication){const result=advanceMeasured(underlying,{...budget,...slice},()=>underlying.diagnostics().workOperations,used=>{budgetOperations+=used;remaining-=used;});publication=C.createWork(()=>decorate(result),{isCurrent:current});if(!(remaining>0)||performance.now()>=slice.deadline)return pending();}
        const next=advanceMeasured(publication,certifiedSliceBudget(budget,remaining),()=>publication.diagnostics().totalOperations,used=>{budgetOperations+=used;});if(!next.done)return pending();lastPublished=publication.result();publication=null;return withBudget(lastPublished);
      }catch(error){if(!C.isSuspension(error))failure=error;throw error;}
    },snapshot(){check();return constantResult?withBudget(constantResult):pending();},diagnostics(){return {...(underlying?.diagnostics()||pending().diagnostics),budgetOperations};},cancel(){cancelled=true;constantWork?.cancel();initialWork?.cancel();publication?.cancel();underlying?.cancel();coordinateInputs=new WeakMap();constantResult=null;lastPublished=null;}};
    return Object.freeze(work);
  }

  WIS.Core.Integration = Object.freeze({
    MAX_GOOGOL_SUBDIVISION_DEPTH,
    GOOGOL_PENALTY_RATIO_FLOOR,
    integrateGoogolPenalizedRate, createAdaptiveWork,createAmountWork, createGoogolScalarEndpointWork
  });
}(window.WIS));
