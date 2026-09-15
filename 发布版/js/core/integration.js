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
    let y=initialLog.slice(),remaining=B.BN(seconds),arc=null,done=seconds===0;
    let midpointAccepted=false;
    let evaluations=0,accepted=0,rejected=0,slices=0,last=null,classification='finite',diagnosis=null;
    let shrinkingTime=0, previousTail=null;
    const tolerance=options.logTolerance??1e-4;
    const gainTolerance=options.gainRelativeTolerance??.002;
    class TrialError extends Error {}
    const stocks=z=>Object.fromEntries(keys.map((k,i)=>[k,B.max(0,expm1(z[i]))]));
    function* sample(z){
      const values=stocks(z),r=rateAt(values);evaluations++;
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
          const next=end.slice();for(let j=0;j<active.length;j++){const i=active[j];next[i]=B.max(z[i],B.min(B.add(z[i],h),B.add(end[i],B.mul(matrix[j].at(-1),factor))));}
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
    function result(){
      const projected=stocks(y);
      const final=Object.fromEntries(keys.map((k,i)=>[k,midpointAccepted?B.add(start[k],smallGains[k]):B.eq(y[i],initialLog[i])?start[k]:B.max(start[k],projected[k])]));
      return {done,status:done?'completed':diagnosis?.code||'pending',
        classification:diagnosis?.code==='singularity-suspected'?'undetermined':classification,remainingSeconds:String(remaining),
        gains:Object.fromEntries(keys.map((k,i)=>[k,midpointAccepted||B.eq(y[i],initialLog[i])?smallGains[k]:B.max(0,B.sub(final[k],start[k]))])),final,
        diagnostics:{evaluations,accepted,rejected,slices,diagnosis,arc:String(arc)}};
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
          if(B.lte(error,1)){
            for(const k of keys)smallGains[k]=B.mul(m.r[k]||0,seconds);
            midpointAccepted=true;
            y=end;remaining=B.ZERO;done=true;accepted++;return result();
          }
          last=a;
        }catch(error){if(!(error instanceof TrialError))throw error;}
      }
      while(!done){
        const a=last||(yield* sample(y));
        if(!a.inverse){remaining=B.ZERO;done=true;break;}
        if(!arc){
          // Initial linear prediction is only a bracket, never the settlement.
          arc=B.max('1e-300',log1p(B.div(remaining,a.inverse)));
        }
        let full,half1,half2;
        try{
          const integrate=keys.length>1 && rejected>=8 && B.gt(arc,.25)?implicitPath:path;
          full=(yield* integrate(y,arc,a));half1=(yield* integrate(y,B.mul(arc,.5),a));half2=(yield* integrate(half1.y,B.mul(arc,.5),half1.end));
        }catch(error){
          if(!(error instanceof TrialError))throw error;
          // A trial overflow is rejected; committed state and logical time stay
          // untouched. It is not evidence that the underlying ODE diverges.
          arc=B.mul(arc,.25);rejected++;last=a;
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
        if(!B.isFiniteBN(error)||B.gt(error,1)){
          arc=B.mul(arc,.5);rejected++;last=a;continue;
        }
        const ratio=B.div(time,remaining);
        // A tiny relative clock error may still imply an observable stock error
        // near an extremely steep endpoint. Check both before closing the tick.
        const endpointTimeError=B.abs(B.sub(time,remaining));
        const endpointError=half2.y.reduce((largest,v,i)=>{
          const budget=B.max(B.min(tolerance,B.mul(gainTolerance,B.abs(B.sub(v,y[i])))),
            B.mul(Number.EPSILON*64,B.max(1,B.abs(v))));
          return B.max(largest,B.div(B.mul(B.div(endpointTimeError,half2.end.inverse),half2.end.direction[i]),budget));
        },B.ZERO);
        const endpointAccepted=B.lte(B.abs(B.sub(ratio,1)),1e-7)&&B.lte(endpointError,1);
        if(B.gt(ratio,1)&&!endpointAccepted){
          // Invert the exponential time density to locate this tick's endpoint.
          const slope=B.div(B.log10(B.div(half2.end.inverse,a.inverse)),arc);
          const term=B.mul(B.div(remaining,a.inverse),B.mul(slope,LN10));
          let next=B.eq(slope,0)?B.div(remaining,a.inverse):B.gt(B.add(1,term),0)?B.div(log1p(term),slope):B.mul(arc,.5);
          if(!B.gt(next,0)||!B.lt(next,arc))next=B.mul(arc,.5);
          arc=next;last=a;continue;
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
        if(diagnosis?.code==='singularity-suspected' && shrinkingTime===0)diagnosis=null;
        // Quadrature error is resource approximation, not lost host time: the
        // caller commits the full requested tick once its endpoint is located.
        if(endpointAccepted){remaining=B.ZERO;done=true;break;}
        remaining=B.max(0,B.sub(remaining,time));
        if(B.lt(time,B.mul(seconds,'1e-12')))classification='steep-finite';
        arc=B.mul(arc,B.lt(error,.05)?2:1.25);
      }
      return result();
    }
    const iterator=solve();let finished=false;
    return {advance({maximumEvaluations=48,deadline=Infinity}={}){
      const begin=evaluations;slices++;
      while(!finished && evaluations-begin<maximumEvaluations && performance.now()<deadline){
        const step=iterator.next();finished=step.done;
      }
      return result();
    },snapshot:result};
  }

  WIS.Core.Integration = Object.freeze({
    MAX_GOOGOL_SUBDIVISION_DEPTH,
    GOOGOL_PENALTY_RATIO_FLOOR,
    integrateGoogolPenalizedRate, createAdaptiveWork
  });
}(window.WIS));
