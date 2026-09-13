// Development bundle; 2026-09-10 settlement fixes are maintained here. Do not overwrite with the older prototype generator.
(function(WIS){
  'use strict';
  const modules={
"percent/engine.js":function(require,module,exports,global){
"use strict";
const assert=require("node:assert/strict"),{performance}=require("node:perf_hooks");
const rt=require("../runtime"),{B,R}=rt,{fit,columnFit,originalProbe}=require("../revision/engine"),{predictedPlan}=require("../joint-engine");
const vector=s=>[s.power.joules,s.power.power,s.cultivation.mana,s.cultivation.immortalPower,
  s.cultivation.explorationAmount,s.cultivation.passiveMana,s.cultivation.explorationMana].map(B.BN);
const coord=v=>{const d=B.BN(v);return {sign:d.sign,layer:d.layer,mag:d.mag};};

// Sum the DISCRETE predicted sources, not stock differences or rate * time.
// This narrow adapter only integrates constant sources or sums whose positive
// upper/lower bounds coincide in the current representation. Decreasing tiny
// sources use their FIRST term, never get silently replaced by zero.
function discreteSum(model,n) {
  assert(Number.isInteger(n)&&n>0);
  const a=model.at(1),b=model.at(Math.min(2,n)),c=model.at(Math.max(1,n-1)),d=model.at(n),mid=model.at(Math.ceil(n/2));
  return a.map((first,i)=>{
    const row=[first,b[i],mid[i],c[i],d[i]];
    if(row.every(x=>B.eq(x,B.ZERO)))return B.ZERO;
    assert(row.every(x=>x.sign===1&&x.layer===first.layer&&x.isFinite()),"sum-layer-transition");
    if(n===1)return first;
    if(row.every(x=>B.eq(x,first)))return B.mul(first,n);
    const rising=B.gte(d[i],first);
    assert(rising?B.gte(b[i],first)&&B.gte(d[i],c[i]):B.lte(b[i],first)&&B.lte(d[i],c[i]),"non-monotone-source-model");
    const largest=rising?d[i]:first,runner=rising?c[i]:b[i];
    assert(B.eq(largest,B.add(largest,B.mul(runner,n-1))),"discrete-sum-not-dominated");
    return largest;
  });
}
function integratedPlan(last,model,n) {
  const plan=predictedPlan(last,discreteSum(model,n)),dt=n/10,end=model.at(n);
  Object.assign(plan.power.rates,{joulesPerSecond:B.div(end[0],.1),powerPerSecond:B.div(end[1],.1)});
  Object.assign(plan.cultivation,{elapsedSeconds:dt,processedSeconds:dt,immortalPowerActiveSeconds:dt});
  return plan;
}
function supported(sample) {
  const s=R.getState(),c=sample?.cultivation;
  if (WIS.Cultivation.Xiuzhen?.get(s).entered || WIS.Cultivation.Xiuzhen?.has(s,'yuanForce')) return false;
  return rt.resources.every(k=>s[k].sign>0&&s[k].layer===2&&s[k].mag>0)&&
    s.powerSystem.active==="scale"&&s.cultivation.active==="immortal"&&
    s.advancedRealmLevel===10&&s.highestScaleIndex===14&&!s.activeChallenge&&
    (!sample||(c?.completed&&!c.event&&!c.instantEvent&&!sample.result.formulaChanged&&
      B.eq(c.finalExplorationLoad,0)&&c.immortalPowerActiveSeconds===.1));
}
function fingerprint() {
  const s=R.getState(),abilities={...s.cultivation.systems.immortal.abilities};delete abilities.naturalTreasureLevel;
  return JSON.stringify([s.powerSystem.systems.scale.upgrades,s.powerSystem.systems.scale.actions,
    s.qiRefiningUnlocked,s.foundationUnlocked,s.goldenCoreUnlocked,s.advancedRealmLevel,s.currentQiLayer,abilities,s.meta.achievements,
    s.highestScaleIndex,s.activeChallenge,s.challengeCompletions,
    [WIS.Simulation.Compensation.factor(),s.core.runtime.compensation?.balance>0,s.core.runtime.compensation?.grantSequence]]);
}
function reviveModel(data){return {data,at:n=>data.map(d=>d.constant!==undefined?B.BN(d.constant):
  B.BN(0).constructor.fromComponents(1,d.layer,d.mag+d.l*n+d.q*n*n))};}
function* runSteps(initial,{seconds=60,seed=.123456789,limitMs=14000,nodes=2,partitions=[],exact=false,targets=100,
  audit,onProgress,failNode=null,stopAfterFrames=null,verifyRollback=false,diagnostics=null,resume=null,
  traceEvery=1,transitionGuard=true}={}) {
  assert(Number.isInteger(seconds*10)&&seconds>0);assert([2,4].includes(nodes));
  const session=rt.createSession(initial,seed),total=Math.round(seconds*10),started=performance.now(),deadline=started+limitMs;
  diagnostics?.start(session);
  // Diagnostic prefix of a fixed longer task. Stopping preserves/report its
  // original remaining debt; it is NOT treated as completion or discarded time.
  const stop=stopAfterFrames===null?total:Math.min(total,stopAfterFrames);
  assert(Number.isInteger(stop)&&stop>0);
  const parts=[0,...partitions.map(t=>Math.round(t*10)),total];
  assert(parts.every((v,i)=>i===0||v>parts[i-1]));
  const stats={sections:0,acceptedNodes:0,representedFrames:0,trueSamples:0,trialFrames:0,originalFallbackFrames:0,
    originalSubsteps:0,intervalSubsteps:0,rejectedNodes:0,checkpoints:0,restores:0,correctionCuts:0,feedbackProbes:0,feedbackModelResets:0,
    rareEventCuts:0,weakModels:0,diagnosticErrors:0,transitionFrames:0,transitionNodes:0,reasonCounts:{}};
  const trace=[],nodeLog=[],rejectLog=[];let samples=[],carry=null,part=0,sectionEnd=0,sectionBase=0,failure=null,retryN=null,retries=0,transitionSamples=0,blockedKey=null,blockedUntil=0;
  function capture(kind) {const s=R.getState();diagnostics?.validate();if(session.ticks%traceEvery===0||kind!=="sample")trace.push({frame:session.ticks,time:session.ticks/10,kind,
    resources:rt.resources.map(k=>coord(s[k])),gains:session.sim.gains.map(coord),
    exploration:coord(diagnostics?.result().effective||0),
    treasures:Object.fromEntries(WIS.Meta.Treasures.keys.map(k=>[k,coord(WIS.Meta.Treasures.count(s,k))])),
    progress:Object.fromEntries(WIS.Meta.Treasures.keys.map(k=>[k,String(s.meta.treasureProgress[k]||0)]))});diagnostics?.capture(kind,session);}
  function point() {stats.checkpoints++;return {game:session.checkpoint(),events:global.__jointRevisionEvents?.length??0,diagnostics:diagnostics?.checkpoint()};}
  function restore(p) {stats.restores++;session.restore(p.game);if(global.__jointRevisionEvents)global.__jointRevisionEvents.length=p.events;
    diagnostics?.restore(p.diagnostics);
    if(verifyRollback)assert.deepEqual(session.checkpoint(),p.game,"trial polluted state/RNG/ledger");}
  function real(trial=false,fallback=false) {
    global.__jointFrame=session.ticks+1;const s=session.tick();
    stats.originalSubsteps+=s.substeps;
    if(trial)stats.trialFrames++;else {stats.trueSamples++;if(fallback)stats.originalFallbackFrames++;capture(fallback?"original-local":"sample");}
    return s;
  }
  function reason(text) {stats.reasonCounts[text]=(stats.reasonCounts[text]??0)+1;}
  function originalLocal() {
    const sample=real(false,true);
    if(supported(sample)){samples.push(sample);if(samples.length>8)samples.shift();}else{samples=[];carry=null;}
  }
  // These six time sources have constant unit gains while the audited terminal
  // configuration is unchanged. Use the original ledger ETA, stop one frame
  // before the reward, then execute that original frame in its original order.
  // Immortal/exploration-dependent multipliers are NOT treated as constant.
  const timedKeys=["cosmicFiber","cosmicWill","fitnessMembershipCard","superLollipop","skyCrystal","fiveSpiritStone","fiveElementsTreasure"];
  function nextTimedReward(maxFrames) {
    const state=R.getState();let frames=maxFrames+1,key=null;
    for(const k of timedKeys){const info=WIS.Meta.TreasureProgress.view(state,k);
      if(info.precision?.state==="blocked"||info.remainingSeconds===null||info.pausedReason)continue;
      const eta=B.BN(info.remainingSeconds).toNumber();
      if(!Number.isFinite(eta)||eta<0)continue;
      const f=Math.max(1,Math.ceil(eta*10-1e-9));
      if(f<frames){frames=f;key=k;}}
    // Only reuse an ETA within this candidate, never across a reward or a new
    // source state. A changing unit gain invalidates the candidate below.
    const p=WIS.Meta.TreasureProgress;
    return {frames,key,fiveElementsGain:String(p.unitGain(state,"fiveElementsTreasure"))};
  }
  function statePoint() {return {version:1,originalSeconds:seconds,targets,nodes,partitions,
    game:session.checkpoint(),stats:{...stats,reasonCounts:{...stats.reasonCounts}},samples:samples.slice(),
    carry:carry?{data:carry.data,frames:carry.frames,treasures:carry.treasures}:null,
    part,sectionEnd,sectionBase,retryN,retries,transitionSamples,blockedKey,blockedUntil,diagnostics:diagnostics?.checkpoint(),trace:trace.slice(-32),nodeLog:nodeLog.slice(-32),rejectLog:rejectLog.slice(-32)};}
  if(resume){assert.equal(resume.originalSeconds,seconds);assert.equal(resume.targets,targets);session.restore(resume.game);
    Object.assign(stats,resume.stats);samples=resume.samples;carry=resume.carry?{...resume.carry,...reviveModel(resume.carry.data)}:null;
    ({part,sectionEnd,sectionBase,retryN,retries}=resume);diagnostics?.restore(resume.diagnostics);
    transitionSamples=resume.transitionSamples||0;blockedKey=resume.blockedKey||null;blockedUntil=resume.blockedUntil||0;
    trace.push(...resume.trace);nodeLog.push(...resume.nodeLog);rejectLog.push(...resume.rejectLog);
  } else capture("initial");
  while(session.ticks<stop&&performance.now()<deadline) {
    // Host scheduling boundary only: no rule, model, feedback node or RNG change.
    // A browser may yield to a macrotask here; synchronous Node run drains it.
    for(const history of [trace,nodeLog,rejectLog])if(history.length>32)history.splice(0,history.length-32);
    yield {session,point:statePoint,processed:session.ticks/10,supported:supported(),stats};
    onProgress?.(session,statePoint);
    if(session.ticks===parts[part+1]&&session.ticks<total) {
      // In-memory checkpoint roundtrip only. No wall time is added to debt.
      const p=point();restore(p);samples=[];carry=null;part++;sectionEnd=session.ticks;retryN=null;
    }
    if(session.ticks>=sectionEnd) {
      // 60s uses 5/10/20 targets; 600s and longer use 50/100/200.
      // This avoids paying eight true samples for six-frame intervals.
      const effectiveTargets=Math.max(1,Math.round(targets*Math.min(1,(parts[part+1]-parts[part])/6000)));
      sectionBase=Math.max(1,Math.ceil((parts[part+1]-parts[part])/effectiveTargets));
      sectionEnd=Math.min(parts[part+1],session.ticks+sectionBase);stats.sections++;retryN=null;retries=0;
    }
    const left=Math.min(sectionEnd,stop)-session.ticks;
    if(exact||sectionBase<20||left<4) {reason(exact?"exact-reference":"short-interval-cheaper");originalLocal();continue;}
    if(!supported()) {reason("event-or-layer-needs-original-frame");originalLocal();continue;}
    const modelKey=()=>fingerprint()+JSON.stringify(samples.length ? vector(samples.at(-1)).map(v=>[v.sign,v.layer,
      Math.floor(v.mag / Math.pow(10, Math.floor(Math.log10(Math.max(1,Math.abs(v.mag))))-2))]) : []);
    if(blockedKey && blockedKey===modelKey() && session.ticks<blockedUntil){reason("model-backoff");originalLocal();continue;}
    if(blockedKey){blockedKey=null;samples=[];carry=null;retries=0;}
    if(samples.length<8) {
      const counterfactual=!samples.length&&carry?.treasures?originalProbe(R.getState(),carry.treasures):null;
      if(counterfactual)stats.feedbackProbes++;
      const rareBefore={...diagnostics?.result().awardCounts},sample=real();
      if(counterfactual&&vector(sample).some((v,i)=>!B.eq(v,vector(counterfactual)[i]))) {
        // A real represented loot effect is NOT a forecast-correction transient.
        carry=null;stats.feedbackModelResets++;
      }
      if(timedKeys.some(k=>(diagnostics?.result().awardCounts[k]||0)>(rareBefore[k]||0))){samples=[];carry=null;stats.feedbackModelResets++;}
      if(supported(sample))samples.push(sample);else{samples=[];carry=null;}continue;
    }
    // All candidate availability closures are evaluated from original code.
    // Batch only the terminal, no-challenge state with NO eligible operation,
    // not merely an unaffordable one. These original availability gates depend
    // on capped levels/owned flags/realm (not continuously growing resources).
    // Any eligible purchase/realm uses the original local .1 event handler.
    if(audit().some(c=>c.available)) {reason("eligible-automation-needs-original-frame");samples=[];carry=null;originalLocal();continue;}
    // A small error in a high-layer coordinate can mean an enormous error in
    // the original resource. Also, a Decimal product cannot encode the count
    // of sub-ULP repeated terms. Retain their original counted-ledger frames.
    if(samples.some(sample=>vector(sample).some(v=>
        !WIS.Simulation.Accuracy.precision(v,{relativeTolerance:.001}).resolvable))) {
      reason("original-resource-precision");blockedKey=modelKey();blockedUntil=session.ticks+256;originalLocal();continue;
    }
    let model;
    try {model=fit(samples,carry,true,false);}catch(e){model={defer:true};reason(e.message);}
    if(model.defer) {
      if(transitionGuard&&!carry&&model.unsettled?.length&&transitionSamples<8){
        // Real cold/event transient identified by the existing held-out check.
        // Slide that SAME window, up to eight extra recurrences; do not promote
        // a rejected post-event curvature straight to a 1000-frame forecast.
        originalLocal();transitionSamples++;stats.transitionFrames++;continue;
      }
      reason("unverified-model");blockedKey=modelKey();blockedUntil=session.ticks+256;originalLocal();continue;
    }

    stats.correctionCuts+=model.decisions?.length??0;
    let n=Math.min(left,retryN??Math.ceil(sectionBase/nodes));
    if(transitionGuard&&transitionSamples>=8){n=Math.min(n,32);stats.transitionNodes++;}
    const rare=nextTimedReward(n);
    if(rare.key&&rare.frames<=n){stats.rareEventCuts++;n=rare.frames-1;
      if(n<4){originalLocal();samples=[];carry=null;continue;}}
    if(n<4||retries>=4) {reason("local-retry-limit");if(retries>0)blockedKey=modelKey();blockedUntil=session.ticks+256;originalLocal();retryN=null;retries=0;continue;}
    const before=point(),start=session.ticks,eventBefore=fingerprint(),sampleTreasures={main:{...R.getState().meta.treasures},tails:{...R.getState().meta.treasureStockResidual}};
    const naturalBefore=JSON.stringify(WIS.Cultivation.ExplorationProgress.levelWords(R.getState()));
    try {
      const plan=integratedPlan(samples.at(-1),model,n);
      global.__jointFrame=start+n;global.__percentFrames=n;
      let committed;
      try {committed=session.tick(plan,false,n);}finally{global.__percentFrames=null;}
      stats.intervalSubsteps+=committed.substeps;
      assert(String(WIS.Meta.TreasureProgress.unitGain(R.getState(),"fiveElementsTreasure"))===rare.fiveElementsGain,
        "five-elements-source-rate-changed");
      assert(!timedKeys.some(k=>(diagnostics?.result().awardCounts[k]||0)>(before.diagnostics?.awardCounts[k]||0)),"unexpected-time-reward-in-prefix");
      assert(!committed.result.formulaChanged&&!committed.result.discreteEvent&&fingerprint()===eventBefore,"interval-formula-event");
      // Independent true original recurrences at the forecast end. All their
      // state, treasures, accounting and RNG are restored before accepting.
      const end=point(),errors=[];
      for(let k=1;k<=2;k++) {
        const actual=real(true);assert(supported(actual),"endpoint-formula-event");
        const values=vector(actual),predicted=model.at(n+k),origin=model.at(0);
        errors.push(values.map((v,i)=>{
          assert(v.layer===predicted[i].layer&&v.sign===predicted[i].sign,"endpoint-layer-transition");
          if(B.eq(v,predicted[i]))return 0;
          const sourceError=WIS.Simulation.Accuracy.compare(v,predicted[i],{relativeTolerance:.001});
          assert(sourceError.pass&&sourceError.verified,"endpoint-original-resource-error");
          const growth=Math.abs(predicted[i].mag-origin[i].mag);
          // Constant/decreasing sources have no positive growth denominator.
          if(growth<=1e-10 || B.lte(predicted[i],origin[i])) {
            const comparison=WIS.Simulation.Accuracy.compare(v,predicted[i],{relativeTolerance:.001});
            assert(comparison.pass,"endpoint-unresolved-source");
            return comparison.relativeError||0;
          }
          return (predicted[i].mag-v.mag)/growth;
        }));
      }
      restore(end);
      // EXPLORATION model check only; not a raw-resource accuracy certificate.
      assert(errors.flat().every(x=>Number.isFinite(x)),"invalid-endpoint-coordinate");
      if(errors.flat().some(x=>Math.abs(x)>.001)){stats.diagnosticErrors++;throw Error("endpoint-coordinate-error");}
      if(failNode===stats.acceptedNodes+1){failNode=null;throw Error("injected-interval-rollback");}
      stats.acceptedNodes++;stats.representedFrames+=n;
      nodeLog.push({start,frames:n,endpointSourceProgressErrors:errors});capture("interval");
      carry={at:model.at,data:model.data,frames:n,treasures:sampleTreasures};
      if(JSON.stringify(WIS.Cultivation.ExplorationProgress.levelWords(R.getState()))!==naturalBefore) {carry=null;stats.feedbackModelResets++;}
      samples=[];retryN=null;retries=0;transitionSamples=0;
    } catch(e) {
      global.__percentFrames=null;restore(before);stats.rejectedNodes++;reason(e.message);
      if(e.message.startsWith("HARD:")){failure=e.stack;break;}
      rejectLog.push({start,frames:n,reason:e.message});retryN=e.message==="injected-interval-rollback"?n:Math.floor(n/2);retries++;
    }
  }
  yield {session,point:statePoint,processed:session.ticks/10,supported:supported(),stats};
  const wallMs=performance.now()-started,checkpoint=statePoint(),final=session.snapshot();
  return {...final,completed:session.ticks===total,remainingSeconds:(total-session.ticks)/10,wallMs,checkpoint,
    originalSeconds:seconds,recoveryTimeAdded:0,stopReason:session.ticks===total?"completed":session.ticks>=stop?"diagnostic-prefix":"wall-time-limit",
    stats,trace,nodeLog,rejectLog,failure,diagnostics:diagnostics?.result(),
    caveat:"Independent approximate discrete-source sums with sparse real treasure-feedback nodes; coordinate checks are not raw-resource 5% acceptance."};
}
function run(initial,options) {
  const iterator=runSteps(initial,options);let next;
  do {next=iterator.next();} while(!next.done);
  return next.value;
}
module.exports={run,runSteps,supported,discreteSum,integratedPlan};

},
"percent/observe.js":function(require,module,exports,global){
"use strict";
const assert=require("node:assert/strict"),rt=require("../runtime"),{B,R}=rt;
function create() {
  const L=WIS.Meta.TreasureLedger,T=WIS.Meta.Treasures;
  let data={effective:B.ZERO,attempts:B.ZERO,explorationCalls:0,progressCalls:0,progressUnits:{},
    awards:[],awardCounts:{},spends:[],cosmicFiber:[],natural:[],captures:[]};
  function advance(state,key,units,gain,run) {
    const before=[state.meta.treasures[key]||B.ZERO,...(state.meta.treasureStockResidual[key]||[])];
    const result=run();
    global.__jointRevision?.timed("diagnostic.progressAudit",()=>{
      data.progressCalls++;
      data.progressUnits[key]=B.add(data.progressUnits[key]||0,units);
      assert(B.BN(result).isFinite()&&B.gte(result,0),"HARD: invalid award");
      const after=[state.meta.treasures[key]||B.ZERO,...(state.meta.treasureStockResidual[key]||[])];
      if(B.eq(result,0)) assert.equal(L.sign(L.subtract(after,before)),0,"HARD: zero award changed stock");
      else {
        const delta=L.subtract(after,before);
        assert(L.sign(delta)>=0&&B.eq(L.value(delta),result),"HARD: award/stock ledger mismatch");
        const row={frame:global.__jointFrame,time:global.__jointFrame/10,key,award:String(result),
          inventory:String(T.count(state,key)),progress:String(L.value(L.progress(state,key))),gain:String(gain)};
        data.awardCounts[key]=(data.awardCounts[key]||0)+1;
        data.awards.push(row);if(data.awards.length>32)data.awards.shift();
        if(key==="cosmicFiber"){data.cosmicFiber.push(row);if(data.cosmicFiber.length>2)data.cosmicFiber.shift();}
      }
    },null,[]);
    return result;
  }
  function exploration(attempts,effective){data.effective=B.add(data.effective,effective);data.attempts=B.add(data.attempts,attempts);data.explorationCalls++;}
  function validate() {
    global.__jointRevision?.timed("diagnostic.stateAudit",()=>{
      const state=R.getState();
      for(const key of rt.resources) assert(B.BN(state[key]).isFinite()&&B.gte(state[key],0),`HARD: invalid resource ${key}`);
      for(const key of T.keys){assert(L.sign(L.stock(state,key))>=0,`HARD: negative stock ${key}`);
        assert(L.sign(L.progress(state,key))>=0,`HARD: negative progress ${key}`);}
    },null,[]);
  }
  function checkpoint(){return {...data,awardCounts:{...data.awardCounts},progressUnits:{...data.progressUnits},awards:data.awards.slice(),spends:data.spends.slice(),
    cosmicFiber:data.cosmicFiber.slice(),natural:data.natural.slice(),captures:data.captures.slice()};}
  function restore(p){data={...p,awardCounts:{...p.awardCounts},progressUnits:{...p.progressUnits},awards:p.awards.slice(),spends:p.spends.slice(),
    cosmicFiber:p.cosmicFiber.slice(),natural:p.natural.slice(),captures:p.captures.slice()};}
  function capture(kind,session){
    const state=R.getState();
    const natural={frame:session.ticks,time:session.ticks/10,level:String(state.naturalTreasureLevel),seized:!!state.unlockedAchievements.seizeFoundation};
    if(!data.natural.length||data.natural.at(-1).level!==natural.level||data.natural.at(-1).seized!==natural.seized)data.natural.push(natural);
    if(data.natural.length>2)data.natural.shift();
  }
  return {advance,exploration,validate,checkpoint,restore,capture,start(){},result:()=>data};
}
module.exports={create};

},
"percent/bulk-progress.js":function(require,module,exports,global){
"use strict";
// Node prototype only. The ordinary production settlement is still the fallback.
// Approximate closure is explicit: an unresolvable high batch consumes its source
// once, posts the inverse estimate to stock, and records an UNRESOLVED remainder
// interval, not an exact zero. Exact additive low words are not rounded away.
const assert=require('node:assert/strict');
function create(){
  const B=WIS.Core.BigNum,{BN,ZERO,ONE}=B,L=WIS.Meta.TreasureLedger,T=WIS.Meta.Treasures,P=WIS.Meta.TreasureProgress;
  const constants=new Map(),inverses=new Map();
  const count=k=>global.__jointRevision?.count(k);
  const timed=(k,f)=>global.__jointRevision?global.__jointRevision.timed(k,f,null,[]):f();
  function context(key,a){const id=key+'|'+String(a);if(constants.has(id))return constants.get(id);
    const r=P.rules[key],k=BN(1).div(r.q).ln(),step=k.mul(a),den=step.exp().sub(1);
    const value={r,k,a:BN(a),step,logDen:den.ln(),logBase:BN(r.base).ln()};constants.set(id,value);return value;}
  function logAddOneExp(x){if(x.gt(40))return x.add(x.neg().exp().add(1).ln());return x.exp().add(1).ln();}
  function inverse(key,n,p,a){count('bulk.inverseRequests');if(!BN(p).gt(0)){count('bulk.zeroProgress');return ZERO;}
    const id=[key,String(n),String(p),String(a)].join('|');
    if(inverses.has(id)){count('bulk.inverseReused');return inverses.get(id);}
    const result=timed('bulk.inverse',()=>{const c=context(key,a),logD=c.k.mul(n).add(c.logBase),logP=BN(p).ln();
      return logP.lt(logD)?ZERO:logAddOneExp(logP.sub(logD).add(c.logDen)).div(c.step).floor();});
    if(inverses.size>=4096)inverses.delete(inverses.keys().next().value);inverses.set(id,result);return result;
  }
  function logCost(key,n,m,a){const c=context(key,a),z=c.step.mul(m);
    return c.logBase.add(c.k.mul(n)).add(z.gt(40)?z.add(ONE.sub(z.neg().exp()).ln()):z.exp().sub(1).ln()).sub(c.logDen);}
  function unresolvable(m){return m.gt(0)&&(m.add(1).eq(m)||m.sub(1).eq(m));}
  function uncertainBounds(m){const {nextUp,nextDown}=require('../precision-analysis');let lo=m.mag,hi=m.mag;
    // Representation sensitivity, not a rigorous bound on the whole game chain.
    for(let i=0;i<16;i++){lo=nextDown(lo);hi=nextUp(hi);}
    return {lo:m.constructor.fromComponents(1,m.layer,lo).floor(),hi:m.constructor.fromComponents(1,m.layer,hi).ceil()};}
  function record(state,key,receipt){
    const old=state.meta.treasureProgressStatus[key]?.approximation||{},seq=(old.transactions||0)+1;
    const approximation={version:1,transactions:seq,
      closedProgress:String(B.add(old.closedProgress||0,receipt.closedProgress||0)),
      awardedStock:String(B.add(old.awardedStock||0,receipt.reward||0)),
      stockRoundingSensitivity:String(B.add(old.stockRoundingSensitivity||0,receipt.roundingStock||0)),
      unresolvedRemainderUpper:String(B.add(old.unresolvedRemainderUpper||0,receipt.remainderUpper||0)),
      boundScope:'16-coordinate-ulp representation sensitivity only; NOT a certified mathematical reward/remainder bound',
      policy:'close-high-inverse-once; known low words retained; unknown phase projected to lower bound 0, NOT exact zero',last:P.receipt(receipt)};
    state.meta.treasureProgressStatus[key]={state:'approximate',code:'high-geometric-batch',
      message:'高数量近似奖励已入库；不可分辨余量以区间记录，非精确归零；误差预算不是待发奖励',approximation};
  }
  // Coalesce only adjacent sources with identical saved gain/award. Exact
  // normalization stays bounded at MAX_TERMS; distinct contexts keep their order.
  // This avoids thousands of inverse/settlement calls for a blocked old queue.
  function compactPending(entries,currentAward){
    return P.Pending.compact(entries,currentAward);
  }
  function* sourcePotential(s,key,units,gain,fixedAward){const a=BN(fixedAward??T.getTreasureAwardMultiplier(s,key)),n=BN(T.count(s,key));
    const p=L.value(L.progress(s,key));
    const entries=[...(s.meta.treasureProgressPending[key]||[])];
    if(BN(units).gt(0)&&BN(gain).gt(0))entries.push({units:[units],gain,award:a});
    if(unresolvable(inverse(key,n,p,L.project(entries[0]?.award??a))))return true;
    for(const e of entries){const u=L.value(e.units),g=L.project(e.gain),award=L.project(e.award??a),d=P.requirement(key,n);
      if(g.gte(d)){
        const cap=context(key,award),capM=g.ln().sub(cap.logBase).div(cap.k).sub(n).div(award).floor().add(1);
        if(unresolvable(B.min(u,capM)))return true;
      }
      if(unresolvable(inverse(key,n,p.add(u.mul(g)),award)))return true;
      yield {phase:'decision'};
    }return false;
  }
  function* steps(s,key,units,gain,original,fixedAward){
    const oldStatus=s.meta.treasureProgressStatus[key];
    if(P.rules[key].type!=='exponential'||!(yield* sourcePotential(s,key,units,gain,fixedAward))){
      const value=original(),result=value?.next?yield* value:value;
      if(oldStatus?.approximation&&!s.meta.treasureProgressStatus[key]?.approximation)
        s.meta.treasureProgressStatus[key]={...(s.meta.treasureProgressStatus[key]||oldStatus),approximation:oldStatus.approximation};
      count('bulk.ordinary');return result;
    }
    {
      L.transaction(s,()=>{});
      count('bulk.high');let stock=L.stock(s,key),p=L.progress(s,key),rewards=[];
      const currentAward=BN(fixedAward??T.getTreasureAwardMultiplier(s,key));
      let pending=s.meta.treasureProgressPending[key]||[];
      if(BN(units).gt(0)&&BN(gain).gt(0))pending=P.Pending.append(pending,units,gain,currentAward);
      pending=yield* P.Pending.compactSteps(pending,currentAward);
      let a=L.project(pending[0]?.award??currentAward);
      // A successful replay replaces the old transient blockage, while earlier
      // approximation receipts remain attached to the same ledger.
      if(oldStatus?.state==='blocked')s.meta.treasureProgressStatus[key]=oldStatus.approximation
        ? {...oldStatus,state:'approximate',code:'high-geometric-batch'} : null;
      const grant=m=>{const delta=L.scale([m],a);stock=L.add(stock,delta);rewards=L.add(rewards,delta);};
      function* settle(){
        if(L.sign(p)<=0)return;const n=L.value(stock).floor(),pv=L.value(p),m=inverse(key,n,pv,a);
        if(!m.gt(0))return;yield {phase:'inverse',key};
        if(!unresolvable(m)){
          let batches;
          try {batches=P.affordable(key,n,pv,a);}catch(error){
            if(!['batch-cost','batch-resolution'].includes(error.code))throw error;
            // A represented high cap can be posted while its SMALL subsequent
            // reward boundary remains unresolved. Keep all that tail progress;
            // never undo the confirmed cap or claim this tail was spent.
            const old=s.meta.treasureProgressStatus[key]||{};
            s.meta.treasureProgressStatus[key]={...old,tailBoundary:{code:error.code,
              stock:P.ledgerSummary(stock),progress:P.ledgerSummary(p),message:'Unconfirmed post-cap tail remains spendable progress; no reward posted for this tail'}};
            count('bulk.retainedTailBoundary');return;
          }
          const cost=P.cumulative(key,n,batches,a);
          if(L.compare(p,[cost])<0)return; p=L.subtract(p,[cost]);grant(batches);return;
        }
        // Close only the dominant positive high-layer component. All other
        // exact words, including tiny progress, remain in the ordinary ledger.
        p=[...WIS.Core.SignedLedger.expand(p)];yield {phase:'expand',key};
        const index=p.findIndex(t=>L.project(t).gt(0)&&L.project(t).eq(pv));
        assert(index>=0,'HARD: high batch cannot isolate a positive dominant source');
        // A prior cap debit may be a separate negative word. It belongs to the
        // consumed net source, NOT to a negative "remaining balance" and NOT to
        // another pending reward. Keep it in the signed closure receipt.
        // Older blocked queues contain many opaque high-layer source words.
        // Consume that NET high component as one approximate batch; leaving
        // 127 already-accounted opaque words here would re-create the capacity
        // deadlock. Record the complete signed consumed component. Ordinary
        // exact additive words (e.g. 1e-500) remain separately spendable.
        const closed=t=>{const v=L.project(t);return (v.layer>=2&&v.mag>0)||v.lt(0);};
        const chargedWords=p.filter((t,i)=>i===index||closed(t));
        const rest=p.filter((t,i)=>i!==index&&!closed(t));
        yield {phase:'partition',key};
        const charged=L.value(chargedWords),estimate=inverse(key,n,charged,a),bounds=uncertainBounds(estimate);
        assert(charged.gt(0)&&L.sign(rest)>=0,'HARD: cannot safely partition net progress');
        const reward=estimate.mul(a),upper=P.requirement(key,n.add(bounds.hi.mul(a)));
        record(s,key,{kind:'uncapped',beforeStock:String(n),award:String(a),batches:String(estimate),
          batchesSensitivity:[String(bounds.lo),String(bounds.hi)],closedProgress:String(charged),closedLedger:chargedWords,
          estimatedLogCost:String(logCost(key,n,estimate,a)),reward:String(reward),
          roundingStock:String(bounds.hi.sub(bounds.lo).mul(a)),remainderLower:'0',remainderUpper:String(upper),
          exactRemainder:false,knownLowWords:rest.length,frame:global.__jointFrame??null});
        yield {phase:'receipt',key};
        p=WIS.Core.SignedLedger.normalize(rest);grant(estimate);count('bulk.closedInputs');
      }
      yield* settle();yield {phase:'settle',key};
      for(const input of P.Pending.inputs(pending)){count('bulk.pendingVisited');
        a=L.project(input.award??currentAward);const g=L.project(input.gain),n=L.value(stock).floor(),d=P.requirement(key,n);
        assert(g.gte(0)&&a.gt(0)&&a.floor().eq(a)&&L.sign(input.units)>=0,'HARD: invalid saved source context');
        if(g.lt(d)){
          const incoming=L.scale(input.units,g);yield {phase:'scale',key};
          let combined;
          try {combined=L.add(p,incoming);}
          catch(error){
            if(!(error instanceof L.LedgerError))throw error;
            if(!unresolvable(inverse(key,n,L.value(incoming),a))){
              if(error.code!=='ledger-capacity')throw error;
              // A small unpaid source cannot be granted as a high batch.
              // Archive its exact words in bounded pages until a later source
              // pays the boundary; comparisons can refine those pages.
              combined=WIS.Core.SignedLedger.add(p,incoming);
            }else{
            // Normalize in isolation first: term count is only a signal, since
            // incoming words may merge exactly even with a full ledger. When
            // the actual merge is unsafe, close the eligible high component
            // before any write, then reattach ALL retained low words.
            const low=p;p=incoming;yield* settle();combined=WIS.Core.SignedLedger.add(low,p);count('bulk.capacitySeparated');
            }
          }
          p=combined;yield* settle();yield {phase:"settle",key,block:input._endBlock};
          continue;
        }
        // Source-unit cap: first consume event credits only until the current
        // formula's cap transition. Do NOT apply an uncapped geometric sum to
        // this part. Reward multiplier changes the next inventory by A each time.
        const c=context(key,a),capN=g.ln().sub(c.logBase).div(c.k),capM=B.max(0,capN.sub(n).div(a).floor().add(1));
        let credits,retained=[];
        try {credits=L.add(L.scale(p,ONE.div(d)),input.units);}
        catch(error){
          if(!(error instanceof L.LedgerError)||L.compare(input.units,[capM])<0||
              !unresolvable(inverse(key,n,L.value(input.units).mul(g),a)))throw error;
          // The incoming units alone pay the entire capped span, so its batch
          // count is independent of prior progress. Carry that exact progress
          // through the same demand conversion, outside the full credit array.
          retained=p;credits=L.normalize(input.units);p=[];
          count('bulk.capacitySeparated');
        }
        const m=B.min(L.value(credits).floor(),capM);
        assert(L.compare(credits,[m])>=0,'HARD: capped credit debit exceeds input');
        credits=L.subtract(credits,[m]);grant(m);count('bulk.capSegments');
        if(unresolvable(m)){const bounds=uncertainBounds(m);record(s,key,{kind:'capped-credits',beforeStock:String(n),
          gain:String(g),award:String(a),batches:String(m),reward:String(m.mul(a)),closedProgress:'0',
          roundingStock:String(bounds.hi.sub(bounds.lo).mul(a)),remainderUpper:'0',exactCreditLedger:true});}
        const nextGain=B.min(g,P.requirement(key,L.value(stock).floor()));
        p=L.scale(credits,nextGain);yield* settle();
        if(retained.length){p=L.add(p,L.scale(L.scale(retained,ONE.div(d)),nextGain));yield* settle();}
        yield {phase:"settle",key,block:input._endBlock};
      }
      L.write(s,key,stock,true);yield {phase:'stock-write',key};L.write(s,key,p);s.meta.treasureProgressPending[key]=[];
      if(L.sign(rewards)>0){WIS.Core.Effects.invalidate();P.rememberQualifications(s);}
      assert(L.sign(L.stock(s,key))>=0&&L.sign(L.progress(s,key))>=0,'HARD: negative committed balance');
      return L.value(rewards);
    }
  }
  function apply(s,key,units,gain,original,fixedAward){
    const previous=s.meta;
    try{const iterator=steps(s,key,units,gain,original,fixedAward);let item;
      do{item=iterator.next();}while(!item.done);return item.value;
    }catch(error){s.meta=previous;WIS.Core.Effects.invalidate();throw error;}
  }
  return {apply,steps,inverse,logCost,unresolvable};
}
module.exports={create};

},
"percent/ledger-cache.js":function(require,module,exports,global){
"use strict";
// Pure caches keyed by the complete validated inputs, never by game time or by
// a mutable state identity. No approximate merging, tail removal or stale N.
function create(){
  const maps={project:new Map(),normalize:new Map(),decimalWord:new Map()},powers=new Map();
  const texts=new WeakMap();
  function word(value){
    if(!WIS.Core.BigNum.isDecimal(value))return String(value);
    const old=texts.get(value);
    if(old&&old.sign===value.sign&&old.layer===value.layer&&Object.is(old.mag,value.mag))return old.text;
    const text=String(value);texts.set(value,{sign:value.sign,layer:value.layer,mag:value.mag,text});return text;
  }
  return {
    pow10(e){if(!powers.has(e))powers.set(e,10n**BigInt(e));return powers.get(e);},
    wordText(w){return w._originalC===w.c&&w._originalE===w.e?w._canonical:`${w.c}e${w.e}`;},
    coefficientLength(w){return w._originalC===w.c?w._coefficientLength:w.c.toString().length;},
    get(kind,input,calculate){
    const prepared=kind==='normalize'?input.map(word):word(input);
    const key=kind==='normalize'?JSON.stringify(prepared):prepared,map=maps[kind];
    if(map.has(key)){global.__jointRevision?.count('ledgerCache.'+kind+'Hit');const v=map.get(key);return kind==='normalize'?v.slice():v;}
    global.__jointRevision?.count('ledgerCache.'+kind+'Miss');const value=calculate(prepared);
    if(kind==='decimalWord'&&value){const coefficient=String(value.c);Object.assign(value,{_originalC:value.c,_originalE:value.e,
      _coefficientLength:coefficient.length,_canonical:coefficient+'e'+value.e});}
    if(map.size>=8192)map.delete(map.keys().next().value);map.set(key,kind==='normalize'?value.slice():value);
    return value;
  }};
}
module.exports={create};

},
"revision/engine.js":function(require,module,exports,global){
"use strict";
const {performance}=require("node:perf_hooks"), assert=require("node:assert/strict");
const rt=require("../runtime"), {B,R}=rt;
const {makeTrajectory:oldFit,predictedPlan}=require("../joint-engine");
const {nextUp}=require("../precision-analysis");
const keys=["joules","power","mana","immortalPower"];
const vectors=s=>[s.power.joules,s.power.power,s.cultivation.mana,s.cultivation.immortalPower,
  s.cultivation.explorationAmount,s.cultivation.passiveMana,s.cultivation.explorationMana].map(B.BN);
function columnFit(values) {
  const last=values.at(-1); if(values.every(v=>B.eq(v,B.ZERO))) return {at:()=>B.ZERO,q:0,data:{constant:"0"}};
  assert(values.every(v=>v.sign===1 && v.layer===last.layer &&
    (v.layer>0 || global.__jointDerivedLayerZero === true)),"Unsupported fit layer");
  let s2=0,s3=0,s4=0,sy=0,s2y=0;
  for(let i=0;i<values.length-1;i++) {const x=i-values.length+1,y=values[i].mag-last.mag;
    s2+=x*x;s3+=x*x*x;s4+=x*x*x*x;sy+=x*y;s2y+=x*x*y;}
  const det=s2*s4-s3*s3,l=(sy*s4-s2y*s3)/det,q=(s2y*s2-sy*s3)/det;
  assert(Number.isFinite(l)&&Number.isFinite(q));
  return {q,data:{layer:last.layer,mag:last.mag,l,q},at:n=>last.constructor.fromComponents(1,last.layer,last.mag+l*n+q*n*n)};
}
function fit(samples, carry, correction, validateWithheldSources=false) {
  if(!correction) return {at:oldFit(samples,2), decisions:[]};
  const rows=samples.map(vectors),decisions=[];
  const rawSourceWindow=validateWithheldSources && rows.some(row=>row.some(v=>v.sign>0&&v.layer<=1));
  if(!carry || rawSourceWindow) {
    const unsettled=[];
    for(let column=0;column<rows[0].length;column++) {
      const values=rows.map(row=>row[column]),last=values.at(-1);
      if(values.every(v=>B.eq(v,B.ZERO)))continue;
      const training=columnFit(values.slice(0,-2));
      const score=Math.max(...[1,2].map(n=>Math.abs(training.at(n).mag-values[values.length-3+n].mag)));
      const ulp=Math.max(nextUp(last.mag)-last.mag,Number.MIN_VALUE);
      const tail=columnFit(values.slice(2,-2));
      const tailScore=Math.max(...[1,2].map(n=>Math.abs(tail.at(n).mag-values[values.length-3+n].mag)));
      // A relative comparison between two bad fits is not model validation.
      // In representable raw/log coordinates check BOTH withheld real sources.
      // 1% is a prototype source-model rejection gate, NOT cumulative-resource
      // acceptance. Layer-2 raw ratios cannot be certified by this check.
      if(validateWithheldSources && last.layer<=1) {
        const sourceErrors=[1,2].map(n=>{
          const actual=values[values.length-3+n],forecast=training.at(n);
          if(forecast.sign<0)return Infinity;
          if(actual.lte("1e-12") && forecast.lte("1e-12"))return 0;
          const a=actual.log10().toNumber(),p=forecast.log10().toNumber();
          if(!Number.isFinite(a)||!Number.isFinite(p))return Infinity;
          if(4*Math.max(nextUp(a)-a,nextUp(p)-p)>Math.log10(1.01))return Infinity;
          return Math.abs(Math.expm1((p-a)*Math.LN10));
        });
        if(sourceErrors.some(error=>!Number.isFinite(error)||error>0.01))
          unsettled.push({column,reason:"withheld-source-model-error",sourceErrors,score,tailScore});
      }
      // Compare against locally measured tail error, not only binary64 noise:
      // a smooth tiny auxiliary source may have genuine non-quadratic drift.
      if(!carry && score>8*ulp && score>4*Math.max(tailScore,ulp)) unsettled.push({column,score,tailScore,ulp});
    }
    // Real post-event/cold-start transients are NOT deleted as "correction".
    // Keep executing original frames until the rolling window predicts its
    // withheld samples. This is a model-validity check, not raw-resource 5%.
    if(unsettled.length)return {defer:true,unsettled};
  }
  const models=rows[0].map((_,column)=>{
    const values=rows.map(row=>row[column]),original=columnFit(values),last=values.at(-1);
    if(!carry || last.sign===0) return original;
    const predictedHead=carry.at(carry.frames+1)[column];
    if(predictedHead.layer!==values[0].layer) return original;
    const ulp=Math.max(nextUp(last.mag)-last.mag,Number.MIN_VALUE);
    const innovation=values[0].mag-predictedHead.mag;
    if(Math.abs(innovation)<=8*ulp) return original;
    // Two withheld TRUE samples test settling vs genuine continuing curvature.
    // No prefix removal on cold start, after an event, or without a preceding
    // forecast innovation. A persistent change fails this settling test.
    const scores=[0,1,2].map(cut=>{
      const training=columnFit(values.slice(cut,-2));
      const score=Math.max(...[1,2].map(n=>Math.abs(training.at(n).mag-values[values.length-3+n].mag)));
      return {cut,score};
    });
    const best=scores.slice(1).sort((a,b)=>a.score-b.score || a.cut-b.cut)[0];
    if(scores[0].score>8*ulp && best.score<0.4*scores[0].score) {
      const selected=columnFit(values.slice(best.cut));
      decisions.push({column,innovation,cut:best.cut,scores,oldQuadratic:original.q,newQuadratic:selected.q,
        reason:"previous forecast innovation + tail holdout improvement; no discrete formula event"});
      return selected;
    }
    return original;
  });
  // Two withheld points validate a two-frame horizon, not a 64-frame one.
  // This is limited to raw-representable transitional sources; no fabricated
  // error certificate or horizon change for the supplied layer-2 save.
  return {at:n=>models.map(model=>model.at(n)),data:models.map(m=>m.data),decisions,predictionHorizon:rawSourceWindow?2:null};
}
function supported(sample) {
  const s=R.getState(),p=sample.cultivation;
  return s.powerSystem.active==="scale" && s.cultivation.active==="immortal" &&
    (s.advancedRealmLevel===10 || (global.__jointDerivedLayerZero===true && s.advancedRealmLevel===9)) &&
    s.highestScaleIndex===14 && !s.activeChallenge &&
    p?.completed && !p.event && !p.instantEvent && !sample.result.formulaChanged &&
    B.eq(p.finalExplorationLoad,B.ZERO) && p.immortalPowerActiveSeconds===0.1;
}
function originalProbe(source, replacementTreasures=null) {
  return R.withProjection(()=>R.withOfflineExecution(()=>R.withRandomSource(()=>{
    throw Error("Pure feedback probe consumed randomness");
  },()=>{
    const state=WIS.Core.State.cloneForSimulation(source);
    if(replacementTreasures) {
      state.meta.treasures={...(replacementTreasures.main||replacementTreasures)};
      if(replacementTreasures.tails)state.meta.treasureStockResidual={...replacementTreasures.tails};
    }
    return R.withState(state,()=>WIS.Core.Effects.withIsolatedState(state,()=>{
      state.reincarnationElapsedSeconds+=0.1;state.currentScaleElapsedSeconds+=0.1;
      const power=WIS.Power.Scale.calculateAutomaticGains(state,0.1);
      state.joules=B.add(state.joules,power.joules);state.power=B.add(state.power,power.power);
      return {power,cultivation:WIS.Cultivation.Immortal.planAutomaticGain(state,0.1)};
    }));
  })));
}
function run(initial,{seconds=60,span=16,seed=0.123456789,correction=true,partitions=[],
  limitMs=14000,traceEvery=1,failFrame=null,retryOnce=false,forceReplanFrame=null,onTick=null,probeEvery=0,batchGuard=null,
  initialCheckpoint=null,diagnosticExactAfterFrame=null,validateWithheldSources=false}={}) {
  assert([0,16,64].includes(span)); assert(Number.isInteger(seconds*10));
  const session=rt.createSession(initial,seed),total=Math.round(seconds*10),boundary=new Set(partitions.map(t=>Math.round(t*10)));
  if(initialCheckpoint)session.restore(initialCheckpoint);
  const trace=[],fits=[],batches=[],replays=[],feedbackProbes=[],rolledBackFailures=[],headProvenance=[],coldDeferrals=[];
  let exact=0,predicted=0,carry=null,samples=[],failure=null,checkpoints=0;
  const coord=v=>{const d=B.BN(v);return {sign:d.sign,layer:d.layer,mag:d.mag};};
  function capture(kind,sample) {
    if(session.ticks%traceEvery && !sample?.result.formulaChanged) return;
    const s=R.getState();
    trace.push({frame:session.ticks,time:session.ticks/10,kind,resources:keys.map(k=>coord(s[k])),
      treasures:Object.fromEntries(WIS.Meta.Treasures.keys.map(k=>[k,coord(s.meta.treasures[k])])),
      plan:sample?.power&&sample?.cultivation?vectors(sample).map(coord):null,
      event:sample?.result.formulaChanged?rt.hash(JSON.stringify({progress:s.cultivation.systems.immortal.progress,
        abilities:s.cultivation.systems.immortal.abilities,upgrades:s.powerSystem.systems.scale.upgrades,actions:s.powerSystem.systems.scale.actions})):null});
  }
  function tick(plan=null) {
    global.__jointFrame=session.ticks+1;
    const sample=session.tick(plan,false); // treasure updates on EVERY original frame, before automation
    if(plan) predicted++; else exact++;
    if(failFrame===session.ticks && plan) throw Error("injected predicted-commit failure");
    capture(plan?"predicted":"exact",sample); onTick?.(session,sample,plan);
    return sample;
  }
  function restorePartition() {
    // Prototype-only typed checkpoint roundtrip: retain original logical debt,
    // current random cursor, all residuals and committed gains. No game save IO.
    const before=session.checkpoint();
    const bytes=JSON.stringify(before,function(k,v){const x=this[k];return B.isDecimal(x)?
      {__jointDecimal:[x.sign,x.layer,x.mag]}:v;});
    const restored=JSON.parse(bytes,(_k,v)=>v?.__jointDecimal?
      (B.BN(0).constructor).fromComponents_noNormalize(...v.__jointDecimal):v);
    session.restore(restored);assert.deepEqual(session.checkpoint(),before);
    samples=[];carry=null;
  }
  capture("initial");
  const started=performance.now(),deadline=started+limitMs;
  while(session.ticks<total && performance.now()<deadline) {
    if(span===0 || samples.length<8 || (diagnosticExactAfterFrame!==null && session.ticks>=diagnosticExactAfterFrame)) {
      // Causal check BEFORE the first real sample: same resources/clocks, but
      // previous batch's treasure inventory on an isolated counterfactual.
      // If loot actually changes represented source values, do not label its
      // transient as forecast correction or trim its samples.
      const head=correction && !samples.length && carry?.treasures;
      const counterfactual=head?originalProbe(R.getState(),carry.treasures):null;
      const sample=tick();
      if(counterfactual && sample.power && sample.cultivation) {
        const real=vectors(sample),other=vectors(counterfactual);
        const changed=real.some((value,i)=>!B.eq(value,other[i]));
        headProvenance.push({frame:session.ticks,treasureChangedRepresentedSources:changed,
          sourceCoordinateDelta:real.map((v,i)=>v.layer===other[i].layer?v.mag-other[i].mag:null)});
        if(changed) carry=null;
      }
      if(!supported(sample)) { samples=[];carry=null; }
      else { samples.push(sample);if(samples.length>8) samples.shift(); }
      if(boundary.has(session.ticks)) restorePartition();
      continue;
    }
    let trajectory;
    try {trajectory=fit(samples,carry,correction,validateWithheldSources);} catch(error) {
      if(error.message!=="Unsupported fit layer") {failure=error.message;break;}
      // A mixed-layer window is not a valid coordinate fit. Slide it with a
      // true frame; do not extrapolate across the representation boundary.
      trajectory={defer:true,unsettled:[{reason:"mixed-or-unsupported-layer"}]};carry=null;
    }
    if(trajectory.defer) {
      coldDeferrals.push({frame:session.ticks,unsettled:trajectory.unsettled});
      const sample=tick();
      if(!supported(sample)){samples=[];carry=null;}else{samples.shift();samples.push(sample);}
      if(boundary.has(session.ticks))restorePartition();
      continue;
    }
    fits.push({frame:session.ticks,decisions:trajectory.decisions,predictionHorizon:trajectory.predictionHorizon??span});
    const predictionLimit=Math.min(span,trajectory.predictionHorizon??span);
    let guardLimit=Math.min(predictionLimit,total-session.ticks);
    for(const frame of boundary)if(frame>session.ticks)guardLimit=Math.min(guardLimit,frame-session.ticks);
    const guardedFrames=batchGuard?.(session,guardLimit,deadline)??0;
    if(guardedFrames>0) {
      for(let i=0;i<guardedFrames;i++)tick();
      samples=[];carry=null;
      if(boundary.has(session.ticks))restorePartition();
      continue;
    }
    const start=session.ticks,checkpoint=session.checkpoint(),traceLength=trace.length;
    const sampleTreasures={...R.getState().meta.treasures};
    const ledger=global.__jointRevisionEvents;
    const eventLength=ledger?.length || 0;
    checkpoints++;
    let event=false;
    try {
      for(let n=1;n<=predictionLimit && session.ticks<total && performance.now()<deadline;n++) {
        const plan=predictedPlan(samples.at(-1),trajectory.at(n));
        if(probeEvery && n%probeEvery===0) {
          // Original next-frame formula at CURRENT predicted state, isolated
          // from real commit/RNG; diagnoses intrabatch feedback, not just loot endpoints.
          const beforeRandom=session.snapshot().random;
          const pre=session.sim.snapshotState();
          const evaluate=replacement=>originalProbe(R.getState(),replacement);
          const pure=evaluate(),frozenCounterfactual=evaluate(sampleTreasures);
          assert.deepEqual(session.sim.snapshotState(),pre);assert.equal(session.snapshot().random,beforeRandom);
          feedbackProbes.push({frame:session.ticks+1,delta:vectors(plan).map((v,i)=>v.mag-vectors(pure)[i].mag),
            actualTreasureVsBatchStartAtSameResources:vectors(pure).map((v,i)=>v.mag-vectors(frozenCounterfactual)[i].mag),
            currentTreasure:Object.fromEntries(Object.entries(R.getState().meta.treasures).map(([k,v])=>[k,String(v)])),
            interpretation:"Current-input original formula vs clone-only frozen-treasure counterfactual, not a gameplay freeze"});
        }
        const sample=tick(plan);
        if(sample.result.formulaChanged || sample.result.discreteEvent || forceReplanFrame===session.ticks) {
          event=true;forceReplanFrame=null;break;
        }
        if(boundary.has(session.ticks)) break;
      }
    } catch(error) {
      session.restore(checkpoint);trace.length=traceLength;if(ledger) ledger.length=eventLength;
      if(retryOnce) {rolledBackFailures.push({frame:failFrame,restoredFrame:session.ticks,error:error.message});
        failFrame=null;retryOnce=false;continue;}
      failure=error.message;break;
    }
    const frames=session.ticks-start;
    if(event) {
      session.restore(checkpoint);trace.length=traceLength;if(ledger) ledger.length=eventLength;
      replays.push({start,discardedPredictedFrames:frames,reason:"formula event; replay original frames from pre-batch state/RNG"});
      for(let i=0;i<frames;i++) tick();
      carry=null;
    } else carry={at:trajectory.at,frames,treasures:sampleTreasures};
    batches.push({start,frames,replayed:event});samples=[];
    if(boundary.has(session.ticks)) restorePartition();
  }
  const wallMs=performance.now()-started, result=session.snapshot();
  return {...result,seconds,span,correction,partitions,wallMs,completed:session.ticks===total,
    remainingSeconds:(total-session.ticks)/10,originalDebt:seconds,recoveryTimeAdded:0,
    exactFormulaFrames:exact,predictedExecutions:predicted,checkpoints,failure,trace,fits,batches,replays,feedbackProbes,rolledBackFailures,headProvenance,coldDeferrals,
    approximation:"Original .1 resource commits, per-frame correct treasure probability and automation; local source forecasts only",
    limits:["No production integration; progress is not an authorized resource-error acceptance standard",
      "Event replay starts from the prior approximate batch boundary, not the full original reference state"]};
}
module.exports={run,fit,columnFit,originalProbe};

},
"joint-engine.js":function(require,module,exports,global){
"use strict";

// Experimental, actual-save-only local trajectory model. No browser/game entry
// point imports this file. Approximation is exposed in every output record.
const { performance } = require("node:perf_hooks");
const assert = require("node:assert/strict");
const { B, R, createSession } = require("./runtime");
const gainKeys = ["joules", "power", "mana", "immortalPower", "explorationAmount", "passiveMana", "explorationMana"];

function values(sample) {
  return [sample.power.joules, sample.power.power, sample.cultivation.mana,
    sample.cultivation.immortalPower, sample.cultivation.explorationAmount,
    sample.cultivation.passiveMana, sample.cultivation.explorationMana].map(value => B.BN(value));
}

function makeTrajectory(samples, degree) {
  const vectors = samples.map(values);
  const models = gainKeys.map((key, column) => {
    const vals = vectors.map(row => row[column]), last = vals.at(-1);
    if (vals.every(value => B.eq(value, B.ZERO))) return { constant: B.ZERO };
    assert(vals.every(value => value.sign > 0 && value.layer === last.layer && value.layer > 0),
      `Unsupported layer transition in ${key}: stop prototype, never force a bad candidate`);
    const y = vals.map(value => value.mag - last.mag);
    let x2 = 0, x3 = 0, x4 = 0, xy = 0, x2y = 0;
    for (let i = 0; i < y.length - 1; i++) {
      const x = i - (y.length - 1);
      x2 += x*x; x3 += x*x*x; x4 += x*x*x*x;
      xy += x*y[i]; x2y += x*x*y[i];
    }
    const determinant = x2*x4 - x3*x3;
    const linear = degree === 1 ? xy/x2 : (xy*x4 - x2y*x3)/determinant;
    const quadratic = degree === 1 ? 0 : (x2y*x2 - xy*x3)/determinant;
    assert(Number.isFinite(linear) && Number.isFinite(quadratic));
    return { layer: last.layer, mag: last.mag, linear, quadratic };
  });
  return n => models.map(model => model.constant || (B.BN(0).constructor).fromComponents(
    1, model.layer, model.mag + model.linear*n + model.quadratic*n*n
  ));
}

function predictedPlan(last, vector) {
  const s = R.getState();
  const [joules, power, mana, immortalPower, explorationAmount, passiveMana, explorationMana] = vector;
  // Original production commit APIs still own accumulation, statistics and
  // residuals. Never assign a fitted final stock or fitted treasure inventory.
  const cultivation = { ...last.cultivation,
    completed: true, elapsedSeconds: 0.1, processedSeconds: 0.1, remainingSeconds: 0,
    mana, immortalPower, passiveMana, passiveManaGain: passiveMana,
    explorationMana, explorationManaGain: explorationMana, immortalPowerGain: immortalPower,
    explorationAmount, finalMana: B.add(s.mana, mana), finalImmortalPower: B.add(s.immortalPower, immortalPower),
    finalExplorationLoad: B.ZERO, immortalPowerActiveSeconds: 0.1,
    event: null, instantEvent: null, segments: 1, rateEvaluations: 0 };
  return { power: { joules, power, rates: {
    joulesPerSecond: B.div(joules, 0.1), powerPerSecond: B.div(power, 0.1)
  }}, cultivation };
}

function supportsActualStableInterval(sample) {
  const s = R.getState(), plan = sample.cultivation;
  return s.powerSystem.active === "scale" && s.cultivation.active === "immortal" &&
    s.advancedRealmLevel === 10 && s.highestScaleIndex === 14 && !s.activeChallenge &&
    plan?.completed && !plan.event && !plan.instantEvent && !sample.result.formulaChanged &&
    B.eq(plan.finalExplorationLoad, B.ZERO) &&
    plan.immortalPowerActiveSeconds === 0.1;
}

function run(initial, { seconds = 60, seed = 0.123456789, span = 0, sampleFrames = 8,
  degree = 2, treasureMode = "joint", limitMs = 15000, partitions = [] } = {}) {
  assert(Number.isInteger(seconds*10) && seconds > 0, "Keep original .1 frame grid");
  assert(Number.isInteger(span) && span >= 0 && span <= 512);
  const session = createSession(initial, seed), totalFrames = Math.round(seconds*10);
  const started = performance.now(), deadline = started + limitMs - 750;
  const rows = [], batches = [], diagnostics = [];
  let exactFrames = 0, modelFrames = 0, lastSamples = [], unsupported = null;
  const boundaries = new Set(partitions.map(seconds => Math.round(seconds*10)));
  const measuredTick = (plan, skip) => {
    const result = session.tick(plan, skip);
    if (!plan) exactFrames++; else modelFrames++;
    return result;
  };
  while (session.ticks < totalFrames && performance.now() < deadline) {
    const shouldSample = span === 0 || lastSamples.length < sampleFrames;
    if (shouldSample) {
      const sample = measuredTick(null, false);
      if (span && !supportsActualStableInterval(sample)) { unsupported = "actual state left prototype stable interval"; break; }
      lastSamples.push(sample);
      if (lastSamples.length > sampleFrames) lastSamples.shift();
      if (boundaries.has(session.ticks)) lastSamples = [];
      continue;
    }
    const trajectory = makeTrajectory(lastSamples, degree);
    const max = Math.min(totalFrames - session.ticks, span);
    const startFrame = session.ticks;
    let attempts = B.ZERO, skippedLootFrames = 0;
    for (let n = 1; n <= max && performance.now() < deadline; n++) {
      const plan = predictedPlan(lastSamples.at(-1), trajectory(n));
      const preProgress = B.BN(R.getState().explorationProgress);
      const result = measuredTick(plan, treasureMode === "joint");
      if (treasureMode === "joint") {
        // Match the original per-frame exploration progress floor exactly.
        attempts = B.add(attempts, B.add(preProgress, plan.cultivation.explorationAmount).floor());
        skippedLootFrames++;
      }
      if (result.result.formulaChanged || result.result.discreteEvent) {
        diagnostics.push({ frame: session.ticks, reason: "real event invalidated local trajectory" }); break;
      }
      if (boundaries.has(session.ticks)) break;
    }
    if (skippedLootFrames) session.flushTreasure(attempts, skippedLootFrames);
    batches.push({ startFrame, frames: session.ticks-startFrame, explorationAttempts: String(attempts) });
    lastSamples = [];
  }
  const wallMs = performance.now() - started;
  const result = session.snapshot();
  return { seconds, span, sampleFrames, degree, treasureMode, seed, partitions, wallMs,
    completed: session.ticks === totalFrames, remainingSeconds: (totalFrames-session.ticks)/10,
    exactFrames, modelFrames, batches, diagnostics, unsupported,
    ...result, approximation: span > 0 ?
      "local multichannel magnitude trajectory estimated from original resource-and-loot frames; original per-frame commits and automation; exploration loot may be delayed and aggregated" : "original logical frame reference",
    safeguards: { originalTickSeconds: 0.1, productionProbabilityFunctions: true,
      fittedTreasureCountsAssigned: false, productionFilesModified: false, savePersistenceIntegrated: false } };
}
module.exports = { run, makeTrajectory, predictedPlan };

},
"precision-analysis.js":function(require,module,exports,global){
"use strict";

// Prototype diagnostics only. No game state, saved value or arithmetic provider
// is changed. A layer-2 coordinate difference is NOT a relative resource error.
const Decimal = require("./production/js/vendor/break_eternity.min.js");
const bits = new DataView(new ArrayBuffer(8));

function nextUp(value) {
  value = Number(value);
  if (Number.isNaN(value) || value === Infinity) return value;
  if (value === 0) return Number.MIN_VALUE;
  bits.setFloat64(0, value);
  bits.setBigUint64(0, bits.getBigUint64(0) + (value > 0 ? 1n : -1n));
  return bits.getFloat64(0);
}

function nextDown(value) { return -nextUp(-Number(value)); }

function decimal(value) {
  if (value && typeof value === "object" && [value.sign, value.layer, value.mag].every(Number.isFinite))
    return Decimal.fromComponents_noNormalize(value.sign, value.layer, value.mag);
  return new Decimal(value);
}

function coordinates(value) {
  const number = decimal(value);
  return { sign: number.sign, layer: number.layer, mag: number.mag, text: number.toString() };
}

function finiteOrString(value) {
  return Number.isFinite(value) ? value : Number.isNaN(value) ? "NaN" : value > 0 ? "Infinity" : "-Infinity";
}

function analyzePrecision(value, options = {}) {
  const number = decimal(value), coordinate = coordinates(number);
  const tolerance = Number(options.relativeTolerance ?? 0.05);
  if (!number.isFinite() || number.isNan() || !(tolerance > 0 && Number.isFinite(tolerance)))
    return { coordinate, resolvable: false, reason: "invalid-value-or-tolerance" };
  const mag = number.mag;
  const upperUlp = nextUp(mag) - mag, lowerUlp = mag - nextDown(mag);
  const ulp = Math.max(upperUlp, lowerUlp);
  const targetLog10Ratio = Math.log1p(tolerance) / Math.LN10;
  let log10OneUlpLogRatio = -Infinity;
  let targetLog10CoordinateDisplacement = null;
  let decimalPlaces = 0;
  if (number.sign === 0) {
    return { coordinate, resolvable: true, upperUlp, lowerUlp, ulp,
      requiredDecimalPlaces: 0, requiredSignificantDigits: 1,
      reason: "exact-zero-requires-absolute-error-comparison" };
  }
  if (number.layer === 0) {
    log10OneUlpLogRatio = Math.log10(ulp) - Math.log10(Math.abs(mag)) - Math.log10(Math.LN10);
    targetLog10CoordinateDisplacement = Math.log10(Math.abs(mag)) + Math.log10(tolerance);
    decimalPlaces = Math.max(0, Math.ceil(-targetLog10CoordinateDisplacement));
  } else if (number.layer === 1) {
    log10OneUlpLogRatio = Math.log10(ulp);
    targetLog10CoordinateDisplacement = Math.log10(targetLog10Ratio);
    decimalPlaces = Math.max(0, Math.ceil(-targetLog10CoordinateDisplacement));
  } else if (number.layer === 2) {
    // R = 10^(sign(m) * 10^abs(m)); |d log10(R)/dm| = ln(10)*10^abs(m).
    log10OneUlpLogRatio = Math.abs(mag) + Math.log10(Math.LN10) + Math.log10(ulp);
    targetLog10CoordinateDisplacement = Math.log10(targetLog10Ratio) - Math.log10(Math.LN10) - Math.abs(mag);
    decimalPlaces = Math.ceil(-targetLog10CoordinateDisplacement);
  } else {
    return { coordinate, resolvable: false, upperUlp, lowerUlp, ulp,
      requiredDecimalPlaces: "beyond-this-layer-2-analysis", requiredSignificantDigits: null,
      reason: "layer-above-two" };
  }
  const integerDigits = Math.max(1, Math.floor(Math.log10(Math.max(1, Math.abs(mag)))) + 1);
  const significantDigits = integerDigits + decimalPlaces;
  // Eight coordinate spacings reserve room for the comparison itself. This is
  // a resolution diagnostic, NOT a bound on accumulated arithmetic/formula error.
  const resolvable = log10OneUlpLogRatio + Math.log10(8) < Math.log10(targetLog10Ratio);
  const oneUlpLog10Ratio = log10OneUlpLogRatio > 308 ? null : 10 ** log10OneUlpLogRatio;
  return {
    coordinate, relativeTolerance: tolerance, upperUlp, lowerUlp, ulp, resolvable,
    targetLog10Ratio, targetLog10CoordinateDisplacement,
    coordinateDisplacementForTolerance: `approximately 10^(${targetLog10CoordinateDisplacement})`,
    log10OfOneUlpLog10ResourceRatio: finiteOrString(log10OneUlpLogRatio),
    oneUlpLog10ResourceRatio: oneUlpLog10Ratio,
    oneUlpResourceRatioDescription: oneUlpLog10Ratio === null
      ? `approximately 10^(10^(${log10OneUlpLogRatio}))` : `approximately 10^(${oneUlpLog10Ratio})`,
    requiredDecimalPlaces: decimalPlaces, requiredSignificantDigits: significantDigits,
    recommendedSignificantDigitsWithGuard: significantDigits + 10,
    minimumBinarySignificandBytes: Math.ceil(significantDigits * Math.log2(10) / 8),
    reason: resolvable ? "coordinate-resolution-finer-than-requested-error" : "original-resource-ratio-not-resolved",
    limitations: [
      "Derivative-based local precision estimate; not a computational-error bound",
      "A saved binary64 coordinate cannot reveal digits already lost before saving",
      "A local high-precision rerun could take the saved coordinate as exact input, but must carry extra precision throughout affected formulas",
      "Storing the original resource as an integer is infeasible; the estimate concerns its layered/log coordinate only",
      "An anchored high-precision residual may avoid dense digits for selected operations, but is not a drop-in verification of the full feedback chain"
    ]
  };
}

function analyzeSave(savePath, options = {}) {
  if (!savePath) throw new Error("An explicit read-only player-save path is required");
  const fs = require("node:fs"), crypto = require("node:crypto"), path = require("node:path");
  const source = fs.readFileSync(savePath), envelope = JSON.parse(source.toString("utf8"));
  const data = envelope.data;
  if (!data?.core?.resources || !data?.cultivation?.systems?.immortal?.resources)
    throw new Error("Expected the original domain-format WIS save; no mutation or migration is performed");
  const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
  const resources = { joules: data.core.resources.joules, power: data.core.resources.power,
    mana: data.cultivation.systems.immortal.resources.mana,
    immortalPower: data.cultivation.systems.immortal.resources.immortalPower };
  const rows = entries => Object.entries(entries).map(([key, value]) => ({ key, ...analyzePrecision(value, options) }));
  const result = { sourcePath: path.resolve(savePath), sourceSha256: sha256(source),
    originalSaveOnly: true, relativeTolerance: options.relativeTolerance ?? 0.05,
    resources: rows(resources), treasures: rows(data.meta?.treasures || {}),
    feasibility: {
      conclusion: "Local high precision is not ruled out by memory alone, but has not been benchmarked or proved for this full coupled calculation chain",
      requiredCoverage: "All operations carrying the small log-resource difference, including powers, sums, feedback, inventory effects and cumulative gains",
      inputSemantics: "A high-precision rerun can treat saved binary64 coordinates as exact initial inputs; it cannot recover digits discarded before the save",
      referenceSemantics: "The required reference remains the production 0.1-second frame sequence, not a finer continuous-time integration",
      compressedAlternative: "An anchored log-value plus high-precision residual can encode selected small corrections compactly; validating nonlinear transformations and feedback would still require new local arithmetic work",
      notClaimed: ["No high-precision production library replacement", "No claim that coordinate closeness establishes 5% raw-resource error",
        "No claim that the prototype's approximation error equals historical floating-point rounding error"]
    } };
  if (sha256(fs.readFileSync(savePath)) !== result.sourceSha256) throw new Error("Original save changed during read-only analysis");
  return result;
}

if (require.main === module) {
  if (!process.argv[2]) console.log("SKIP precision analysis: supply an explicit read-only original-save path");
  else console.log(JSON.stringify(analyzeSave(process.argv[2]), null, 2));
}

module.exports = { Decimal, decimal, coordinates, nextUp, nextDown, analyzePrecision, analyzeSave, finiteOrString };

},
"runtime.js":function(require,module,exports,global){
'use strict';
// Host adapter only. Step, resource commits, automation and statistics remain
// the development game's own functions; no second simulation or save importer.
const B=WIS.Core.BigNum,R=WIS.Core.Runtime,assert=require('node:assert/strict');
const resources=['joules','power','mana','immortalPower'];
let context=null,observer=null,override=null,registered=false;
function bind(next){context=next;
  if(registered)return;registered=true;
  const registry=WIS.Core.Registries,p=WIS.Power.Scale,c=WIS.Cultivation.Immortal;
  const power=Object.freeze({...p,calculateAutomaticGains(state,dt){
    if(override)return override.power;
    const result=p.calculateAutomaticGains(state,dt);if(observer){observer.power=result;observer.formulaEvaluations=(observer.formulaEvaluations||0)+1;}return result;
  }});
  const immortal=Object.freeze({...c,planAutomaticGain(state,dt,options){
    if(override)return override.cultivation;
    // This is the actual cultivation projection: J/power and clocks have
    // already advanced, mana/immortal power have not. Label that source here,
    // not at the earlier start-of-frame snapshot.
    const normalization=observer?require('./general-engine').manaNormalization():null;
    const result=c.planAutomaticGain(state,dt,options);
    if(observer){observer.cultivation=result;observer.formulaEvaluations=(observer.formulaEvaluations||0)+1;
      if(normalization&&B.eq(result.explorationMana??0,0)&&B.eq(result.explorationAmount??0,0)&&
        B.lt(B.add(state.mana,result.mana??0),WIS.Core.Config.googolPenalty.threshold))observer.manaNormalization=normalization;
      else delete observer.manaNormalization;}
    return result;
  },commitAutomaticGain(state,plan,options){const result=c.commitAutomaticGain(state,plan,options);
    if(observer)observer.committedExploration=plan.explorationAmount;return result;}});
  WIS.Core.Registries=Object.freeze({...registry,
    getActivePower(state){const active=registry.getActivePower(state);return active?.id==='scale'?power:active;},
    getActiveCultivation(state){const active=registry.getActiveCultivation(state);return active?.id==='immortal'?immortal:active;}});
}
function flags(){const s=R.getState();return ['scaleUpgradeAutomationEnabled','scaleActionAutomationEnabled',
  'immortalAbilityAutomationEnabled','immortalRealmAutomationEnabled'].map(k=>s[k]);}
function createSession(){
  assert(context,'Fast-forward host not bound');
  const host=context,random=host.random;let ticks=0,elapsed=0,approximateTicks=0,randomCalls=0;
  const gains=host.gains.slice(),originFlags=flags(),metrics={},automaticEvents=[],discreteEvents=[];
  const scope=fn=>R.withOfflineExecution(()=>R.withRandomSource(()=>{randomCalls++;return random.next();},fn));
  function preview({disposableSource=false}={}){
    assert(typeof host.calculateAutomaticStepPlan==='function','missing source preview');
    return scope(()=>R.withProjection(()=>{
      const s=R.getState();
      return host.calculateAutomaticStepPlan(.1,WIS.Core.Registries.getActivePower(s),
        WIS.Core.Registries.getActiveCultivation(s),{sourceState:s,disposableSource,integrationMethod:'end',projection:true});
    }));
  }
  function project(plan,n,query){
    const s=WIS.Core.State.cloneForSimulation(R.getState()),A=WIS.Core.Resources;
    // Disposable source projection only; no global resource writer, treasure,
    // automation, random call or journal commit is invoked here.
    for(const key of resources){const box=resources.indexOf(key)<2?s.core.resources:s.cultivation.systems.immortal.resources;
      const gain=resources.indexOf(key)<2?plan.power[key]:plan.cultivation[key];
      Object.assign(box,A.prepare(box,key,gain));}
    s.cultivation.systems.immortal.xiuzhen=WIS.Cultivation.Xiuzhen.prepare(s,plan.cultivation.xiuzhen);
    const totals={joules:['lifetimeTotalJ','currentRebirthTotalJ'],power:['totalPower','lifetimeTotalPower','currentRebirthTotalPower'],
      mana:['lifetimeTotalMana','currentRebirthTotalMana'],immortalPower:['lifetimeTotalImmortalPower','currentRebirthTotalImmortalPower']};
    for(const key of resources)for(const field of totals[key])s[field]=B.add(s[field],(resources.indexOf(key)<2?plan.power:plan.cultivation)[key]);
    s.highestPower=B.max(s.highestPower,s.power);
    host.projectStepTimes(s,n/10);s.totalElapsedSeconds+=n/10;
    return scope(()=>R.withProjection(()=>R.withState(s,()=>WIS.Core.Effects.withIsolatedState(s,()=>query({disposableSource:true})))));
  }
  function tick(plan=null,skipTreasureRolls=false,intervalFrames=1){
    assert(Number.isInteger(intervalFrames)&&intervalFrames>0);assert(intervalFrames===1||plan);
    const sample={};observer=sample;override=plan;global.__jointPredictedFrame=!!plan;
    const dt=intervalFrames/10,frameGains=resources.map(()=>B.ZERO);let remaining=dt,substeps=0,last,formulaChanged=false,discreteEvent=null;
    const repeated=plan?.exactBaseRepeat ? Object.fromEntries(['totalElapsedSeconds','reincarnationElapsedSeconds','currentScaleElapsedSeconds',
      'lifetimeTotalJ','currentRebirthTotalJ'].map(k=>[k,Number(R.getState()[k])])) : null;
    const repeatedGains=repeated?gains[0].toNumber():0;
    try{while(remaining>1e-10){
      last=scope(()=>host.advanceGameStep(remaining,true,{offline:false,integrationMethod:'end',skipTreasureRolls}));
      assert(last.processedSeconds>0||last.eventCommitted,'Original frame must advance');
      if(plan)assert.equal(last.processedSeconds,dt,'Forecast cannot commit partial event frame');
      remaining-=last.processedSeconds;elapsed+=last.processedSeconds;substeps++;
      assert(substeps<=128,'HARD: original frame event loop stalled');
      resources.forEach((key,i)=>{const value=last.resourceGains?.[key]??0;
        gains[i]=B.add(gains[i],value);frameGains[i]=B.add(frameGains[i],value);});
      formulaChanged||=last.formulaChanged===true;discreteEvent||=last.discreteEvent??null;
      R.getState().totalElapsedSeconds+=last.processedSeconds;
      host.recordCurrentAchievements();
      if(last.formulaChanged||last.discreteEvent)discreteEvents.push({frame:ticks+1,time:elapsed,
        event:last.discreteEvent||null,formulaChanged:last.formulaChanged});
      if(discreteEvents.length>32)discreteEvents.shift();
    }}finally{observer=null;override=null;global.__jointPredictedFrame=false;}
    if(repeated){
      // Keep the original IEEE additions of clocks and old statistic fields.
      // These cheap loops do not invoke formulas, transactions or RNG.
      const sum=value=>{for(let i=0;i<intervalFrames;i++)value+=.1;return value;};
      for(const [key,value] of Object.entries(repeated))R.getState()[key]=key.endsWith('Seconds')?sum(value):B.BN(sum(value));
      gains[0]=B.BN(sum(repeatedGains));
      const lastGain={joules:B.BN(.1),power:B.ZERO,mana:B.ZERO,immortalPower:B.ZERO,xianForce:B.ZERO,yuanForce:B.ZERO};
      const recent=R.getState().core.runtime.lastSettlement;
      if(recent){recent.seconds=.1;recent.gains=lastGain;let at=repeated.totalElapsedSeconds;for(let i=1;i<intervalFrames;i++)at+=.1;recent.at=at;}
    }
    ticks+=intervalFrames;if(plan)approximateTicks+=intervalFrames;
    assert.deepEqual(flags(),originFlags,'HARD: player automation settings changed');
    return {...sample,result:{...last,resourceGains:Object.fromEntries(resources.map((k,i)=>[k,frameGains[i]])),
      formulaChanged,discreteEvent:discreteEvent??last.discreteEvent},substeps};
  }
  function checkpoint(){const started=performance.now(),state=host.snapshotState();WIS.Simulation.FastForward.recordCost("snapshotMs",performance.now()-started);return {state,random:random.snapshot(),randomCalls,ticks,elapsed,
    approximateTicks,gains:gains.slice(),metrics,automaticEvents:automaticEvents.slice(),discreteEvents:discreteEvents.slice()};}
  function restore(point){host.restoreState(point.state);random.restore(point.random);randomCalls=point.randomCalls;
    ticks=point.ticks;elapsed=point.elapsed;approximateTicks=point.approximateTicks;
    gains.splice(0,gains.length,...point.gains.map(B.BN));automaticEvents.splice(0,automaticEvents.length,...point.automaticEvents);
    discreteEvents.splice(0,discreteEvents.length,...point.discreteEvents);observer=null;override=null;global.__jointPredictedFrame=false;}
  return {tick,preview,project,scope,checkpoint,restore,snapshot:()=>({ticks,elapsed,gains:gains.slice()}),
    sim:{snapshotState:host.snapshotState,restoreState:host.restoreState,gains,metrics},get ticks(){return ticks;},get elapsed(){return elapsed;}};
}
module.exports={B,R,resources,bind,createSession,hash:value=>String(value)};

},
"general-engine.js":function(require,module,exports,global){
'use strict';
// Unified normal-state adapter. It approximates sums of the original .1 s
// recurrences, never assigns an extrapolated stock or executes a predicted buy.
const assert=require('node:assert/strict'),rt=require('./runtime'),{B,R}=rt;
const {predictedPlan}=require('./joint-engine');
const keys=[...rt.resources,'xianForce','yuanForce'];
const vector=s=>[s.power?.joules,s.power?.power,s.cultivation?.mana,s.cultivation?.immortalPower,
  s.cultivation?.xiuzhen?.xianForce,s.cultivation?.xiuzhen?.yuanForce,
  s.cultivation?.explorationAmount,s.cultivation?.passiveMana,s.cultivation?.explorationMana].map(v=>B.BN(v??0));
function relative(a,b){
  if(B.eq(a,b))return 0;
  if(![a,b].every(v=>WIS.Simulation.Accuracy.precision(v,{relativeTolerance:.001}).resolvable))return Infinity;
  const scale=B.max(B.abs(a),B.abs(b));
  return B.eq(scale,0)?0:B.toNumber(B.div(B.abs(B.sub(a,b)),scale),Infinity);
}
function sourceChange(a,b){
  // Control tolerance only: keep both original words in samples and ledgers.
  if(![a,b].every(v=>v.isFinite()&&v.sign>=0))return true;
  if(B.eq(a,b))return false;
  if(a.sign===0||b.sign===0)return true;
  const precision=[a,b].map(v=>WIS.Simulation.Accuracy.precision(v,{relativeTolerance:.001}));
  if(precision.some(p=>!p.resolvable))return true;
  const spacing=Math.max(...precision.map(p=>Math.expm1((p.oneUlpLog10ResourceRatio??Infinity)*Math.LN10)));
  const tolerance=Math.min(1e-7,Math.max(1e-8,spacing*8));
  // The absolute allowance is evaluated in Decimal against the source's own
  // scale, even below Number.MIN_VALUE. There is no fixed epsilon that could
  // conceal a large relative jump of an extremely small, but real, income.
  const absoluteAllowance=B.mul(B.max(B.abs(a),B.abs(b)),tolerance);
  return B.gt(B.abs(B.sub(a,b)),absoluteAllowance);
}
function column(values){
  const last=values.at(-1);
  assert(values.every(v=>v.isFinite()&&v.sign>=0),'invalid-source');
  assert(values.every(v=>WIS.Simulation.Accuracy.precision(v,{relativeTolerance:.001}).resolvable),
    'original-resource-precision');
  if(values.every(v=>B.eq(v,last)))return {kind:'constant',at:()=>last,sum:n=>B.mul(last,n)};
  assert(values.every(v=>v.layer<=1),'mixed-high-source-needs-local');
  // A drifting source followed by a single step must not become an exponential
  // trend. Provenance below is the primary guard; adjacent differences also
  // reject an unannounced jump without rejecting a consistent geometric curve.
  const differences=values.slice(1).map((v,i)=>B.abs(B.sub(v,values[i])));
  const projectedDifference=B.gt(differences[0],0)?B.div(B.mul(differences[1],differences[1]),differences[0]):B.ZERO;
  assert(!(relative(last,values[2])>1e-8&&B.gt(differences[2],
    B.mul(B.max(differences[0],B.max(differences[1],projectedDifference)),8))),'sample-source-jump');
  const delta=B.sub(values[2],values[1]),linearError=relative(B.add(values[2],delta),last);
  let kind='linear',logRatio=0,bestError=linearError;
  if(values.every(v=>B.gt(v,0))){
    logRatio=B.toNumber(B.sub(B.log10(last),B.log10(values[2])),NaN);
    const predicted=B.mul(values[2],B.div(values[2],values[1]));
    const e=relative(predicted,last);
    if(Number.isFinite(logRatio)&&e<bestError){kind='geometric';bestError=e;}
  }
  const slope=B.sub(last,values[2]);
  function at(n){return kind==='geometric'?B.mul(last,B.pow(10,logRatio*n)):B.add(last,B.mul(slope,n));}
  function sum(n,offset=0){
    if(n===0)return B.ZERO;
    const anchor=at(offset);
    if(kind!=='geometric')return B.add(B.mul(anchor,n),B.mul(slope,n*(n+1)/2));
    // Exact q=1 limit of this fitted model, before either division.
    if(logRatio===0)return B.mul(anchor,n);
    const x=logRatio*Math.LN10;
    // expm1 avoids losing a slowly varying geometric series to cancellation.
    const factor=Math.abs(x*n)<650?Math.exp(x)*Math.expm1(x*n)/Math.expm1(x):NaN;
    if(Number.isFinite(factor)&&factor>=0)return B.mul(anchor,factor);
    const q=B.pow(10,logRatio);
    return B.mul(anchor,B.div(B.mul(q,B.sub(B.pow(q,n),1)),B.sub(q,1)));
  }
  assert(bestError<.002,'sample-curvature');
  return {kind,at,sum};
}
function manaNormalization(){
  const s=R.getState(),I=WIS.Cultivation.ImmortalLogic;
  if(!I.immortalCultivationActive()||!s.qiRefiningUnlocked||!I.circulationEffective()||
    s.unlockedAchievements?.refineTheVoid||s.roamSpiritWorldUnlocked||
    !B.lt(s.mana,WIS.Core.Config.googolPenalty.threshold))return null;
  const p=I.offlineManaRounding();if(p.mode!=='integer')return null;
  const scale=B.pow(p.floor,p.elasticity);
  return scale.isFinite()&&B.gt(scale,0)?scale:null;
}
function sameStructure(a,b){return JSON.stringify(JSON.parse(a).slice(1))===JSON.stringify(JSON.parse(b).slice(1));}
function model(samples,cache=null,offset=0){
  const rule=fingerprint(),scale=manaNormalization();
  const normalized=scale&&samples.every(s=>s.manaNormalization&&sameStructure(s.sourceRule,rule));
  assert(samples.every(s=>s.sourceRule===rule)||normalized,'mixed-source-rules');
  const rows=samples.map(vector),support=WIS.Cultivation.Xiuzhen.intervalSupport(R.getState());
  const yuan=support.discreteYuan?WIS.Cultivation.Xiuzhen.discreteYuanModel(R.getState(),rows.at(-1)[4]):null;
  if(support.stableXian)assert(rows.every(r=>B.eq(r[4],rows[0][4])),'stable-xian-proof-invalid');
  const cols=rows[0].map((_,i)=>{
    if(i===5&&yuan)return yuan;
    if(i===4&&support.stableXian&&rows.every(r=>B.eq(r[i],rows[0][i]))) {
      const term=rows[0][i];return {kind:'constant',at:()=>term,sum:n=>B.mul(term,n)};
    }
    // Pure homogeneous passive mana factor: preserve the other seven source
    // histories, divide each actual sample by ITS pre-frame floor factor, then
    // restore the CURRENT plateau factor. Low floors remain event boundaries.
    const manaColumn=normalized&&(i===2||i===7);
    const values=rows.map((r,j)=>manaColumn?B.div(r[i],samples[j].manaNormalization):r[i]);
    const key=values.map(v=>[v.sign,v.layer,v.mag].join(',')).join(';');
    let value;
    if(cache?.[i]?.key===key)value=cache[i].value;
    else {value=column(values);if(cache)cache[i]={key,value};}
    return manaColumn?{kind:value.kind,at:n=>B.mul(value.at(n),scale),sum:(n,start=0)=>B.mul(value.sum(n,start),scale)}:value;
  });
  // This closure owns the model identity and origin. Yuan is freshly anchored
  // to current state; all other columns retain the original sample offset.
  const sumColumn=(i,n)=>cols[i].sum(n,i===5&&yuan?0:offset);
  return {kind:cols.every(c=>c.kind==='constant')?'constant':'varying',yuanDiagnostics:yuan?.diagnostics,maxFrames:support.maxFrames??65536,
    at:n=>cols.map((c,i)=>c.at(n+(i===5&&yuan?0:offset))),sumColumn,sum:n=>cols.map((_,i)=>sumColumn(i,n))};}
function formulaRegime(s=R.getState()){
  const query=()=>{
    const I=WIS.Cultivation.ImmortalLogic;
    const enabled=I.immortalCultivationActive()&&s.qiRefiningUnlocked&&I.circulationEffective();
    let mana=['disabled'];
    if(enabled){const rounding=I.offlineManaRounding();
      mana=rounding.mode==='integer'?['integer',String(rounding.floor)]:[rounding.mode];}
    return JSON.stringify([mana,
  s.powerSystem.active,s.powerSystem.systems.scale.actions,s.powerSystem.systems.scale.upgrades,
  s.cultivation.active,s.cultivation.systems.immortal.abilities,s.cultivation.systems.immortal.persistent,
  s.highestScaleIndex,s.brickUnlocked,s.wallUnlocked,s.activeChallenge,s.meta.achievements,
  s.challengeCompletions,s.symbolicPowerMilestones,s.qiRefiningUnlocked,s.foundationUnlocked,s.goldenCoreUnlocked,
  s.advancedRealmLevel,s.currentQiLayer,s.cultivation.systems.immortal.xiuzhen?.realm,
  s.cultivation.systems.immortal.xiuzhen?.abilities,
  [s.scaleUpgradeAutomationEnabled,s.scaleActionAutomationEnabled,s.immortalAbilityAutomationEnabled,s.immortalRealmAutomationEnabled],
  // Inventory and ownership are inputs to treasure multipliers. Progress,
  // timers and Effects cache revisions are deliberately absent.
  [WIS.Simulation.Compensation.factor(),s.core.runtime.compensation?.balance>0,s.core.runtime.compensation?.grantSequence],
  s.meta.treasures,s.meta.treasureStockResidual,[s.naturalTreasureLevel,s.explorationRewards?.levelResidual],s.unlockedAchievements?.seizeFoundation]);
  };
  // Query the supplied state; never cache a speculative state's result.
  return s===R.getState()?query():R.withState(s,()=>WIS.Core.Effects.withIsolatedState(s,query));
}
function fingerprint(){return formulaRegime();}
function treasureKey(){const s=R.getState();return JSON.stringify([s.meta.treasures,s.meta.treasureStockResidual,
  [s.naturalTreasureLevel,s.explorationRewards?.levelResidual],s.unlockedAchievements?.seizeFoundation]);}
function exactBaseFrames(left,last,audit) {
  const s=R.getState(),zero=v=>B.eq(v??0,0);
  // Proof scope: only the built-in +1 J/s source. No cultivation, actions,
  // purchased effects, treasure sources, challenge rewards or automation can
  // change a multiplier. The only time event is trainingUp at 600 seconds.
  if(!last||s.powerSystem.active!=='scale'||s.cultivation.active!==null||s.activeChallenge||s.highestScaleIndex!==0||
    !zero(s.power)||!zero(s.totalPower)||!zero(s.maxSinglePowerGain)||s.brickUnlocked||s.wallUnlocked||
    Object.values(s.powerSystem.systems.scale.actions).some(v=>!zero(v))||
    Object.values(s.powerSystem.systems.scale.upgrades).some(v=>!zero(v))||
    Object.values(s.cultivation.systems.immortal.persistent).some(v=>!zero(v))||
    Object.values(s.challengeCompletions).some(v=>!zero(v))||
    Object.entries(s.unlockedAchievements).some(([k,v])=>v&&k!=='trainingUp')||
    Object.values(s.meta.treasures).some(v=>!zero(v))||
    Object.values(s.meta.treasureStockResidual||{}).some(v=>v.length)||
    Object.values(s.meta.treasureProgressPending||{}).some(v=>v.length)||
    audit().some(c=>c.available)||!B.eq(vector(last)[0],.1)||vector(last).slice(1).some(v=>!zero(v)))return 0;
  if(['joules','lifetimeTotalJ','currentRebirthTotalJ'].some(k=>!Number.isFinite(Number(s[k]))||Number(s[k])>1e9))return 0;
  let n=Math.min(left,65536,Math.floor((1e9-Number(s.joules))*10));
  if(!s.unlockedAchievements.trainingUp)n=Math.min(n,Math.max(0,Math.floor((600-s.totalElapsedSeconds)*10)-2));
  return Math.max(0,n);
}
function supported(sample){const s=R.getState(),c=sample?.cultivation;
  const challengeAllowed=!s.activeChallenge || ["mortalTransformation","yinVoidYangReal"].includes(s.activeChallenge);
  return WIS.Cultivation.Xiuzhen.intervalSupport(s).supported&&challengeAllowed&&s.powerSystem.active==='scale'&&
    (s.cultivation.active===null||s.cultivation.active==='immortal')&&
    B.eq(s.minorTribulationExplorationLoad??0,0)&&
    (!sample||(!sample.result.formulaChanged&&!sample.result.discreteEvent&&
      (!c||(c.completed!==false&&!c.event&&!c.instantEvent&&B.eq(c.finalExplorationLoad??0,0)))));
}
function plan(last,m,n){const v=m.sum(n),end=m.at(n);
  assert([...v,...end].every(v=>v.isFinite()),'nonfinite-model');
  assert([...v,...end].every(v=>v.sign>=0),'negative-model');
  const p=predictedPlan(last,[...v.slice(0,4),...v.slice(6)]),dt=n/10;
  p.cultivation.xiuzhen={xianForce:v[4],yuanForce:v[5]};
  if(WIS.Cultivation.Xiuzhen.intervalSupport(R.getState()).stableXian) {
    const term=vector(last)[4];
    assert(B.eq(v[4],B.mul(term,n)),'stable-xian-proof-invalid');
    p.cultivation.xiuzhen.repeat={xianForce:{term,count:n}};
  }
  Object.assign(p.power.rates,{joulesPerSecond:B.div(end[0],.1),powerPerSecond:B.div(end[1],.1)});
  Object.assign(p.cultivation,{elapsedSeconds:dt,processedSeconds:dt,
    immortalPowerActiveSeconds:(last.cultivation?.immortalPowerActiveSeconds??0)*n});
  return p;
}
function* runSteps(_initial,{seconds,audit,resume=null,diagnostics=null}={}){
  const session=rt.createSession(),total=Math.round(seconds*10),columnCache=[];
  let samples=[],span=16,cooldown=0,lastFailure='',failureCount=0,signature='',retry=null,planning=null,blockedSignature=null;
  let failedSpan=null,successSpan=0,ceilingUntil=0,blockedUntil=0,shortReprobeAt=0;
  let modelOffset=0,carryCount=0,carryDisabledUntil=0;
  let nextProbeTick=0,shortEventStreak=0;
  let crystalWidth=32,crystalProbeAt=0;
  const minimumPredictionFrames=12,shortResampleFrames=64;
  const stats={algorithm:'normal-discrete',sections:0,acceptedNodes:0,representedFrames:0,trueSamples:0,
    trialFrames:0,originalFallbackFrames:0,originalSubsteps:0,intervalSubsteps:0,rejectedNodes:0,
    formulaCalls:0,predictionCalls:0,boundaryQueries:0,eventCuts:0,reasonCounts:{},constantFrames:0,varyingFrames:0,
    maxSourceError:0,formulaMs:0,predictionMs:0,trialMs:0,recentAcceptedSpans:[],events:[],eventTypes:{},boundaryStatus:{}};
  if(resume){session.restore(resume.game);Object.assign(stats,resume.stats);
    ({samples,span,cooldown,lastFailure,failureCount,signature,retry}=resume);planning=resume.planning||null;blockedSignature=resume.blockedSignature||null;
    failedSpan=resume.failedSpan??null;successSpan=resume.successSpan||0;ceilingUntil=resume.ceilingUntil||0;blockedUntil=resume.blockedUntil||0;shortReprobeAt=resume.shortReprobeAt||0;
    modelOffset=resume.modelOffset??0;carryCount=resume.carryCount??0;carryDisabledUntil=resume.carryDisabledUntil??0;
    nextProbeTick=resume.nextProbeTick??0;shortEventStreak=resume.shortEventStreak??0;
    crystalWidth=resume.crystalWidth??32;crystalProbeAt=resume.crystalProbeAt??0;
    assert(Number.isInteger(crystalWidth)&&crystalWidth>=2&&crystalWidth<=8192,'invalid-crystal-width');
    assert(Number.isSafeInteger(crystalProbeAt)&&crystalProbeAt>=0,'invalid-crystal-probe');
    assert(Number.isSafeInteger(nextProbeTick)&&nextProbeTick>=0&&nextProbeTick<=session.ticks+64,'invalid-probe-tick');
    assert(Number.isInteger(shortEventStreak)&&shortEventStreak>=0&&shortEventStreak<=4,'invalid-probe-streak');
    assert(Number.isSafeInteger(modelOffset)&&modelOffset>=0&&modelOffset<=65536,'invalid-model-offset');
    assert(Number.isSafeInteger(carryCount)&&carryCount>=0&&carryCount<=3,'invalid-model-carry');}
  function point(){return {version:1,engine:'normal-discrete',originalSeconds:seconds,game:session.checkpoint(),
    stats:{...stats,reasonCounts:{...stats.reasonCounts},events:stats.events.slice()},samples,span,cooldown,
    lastFailure,failureCount,signature,retry,planning,blockedSignature,failedSpan,successSpan,ceilingUntil,blockedUntil,shortReprobeAt,modelOffset,carryCount,carryDisabledUntil,nextProbeTick,shortEventStreak,crystalWidth,crystalProbeAt};}
  function reason(name){stats.reasonCounts[name]=(stats.reasonCounts[name]||0)+1;}
  function buildModel(rows,offset=0){stats.modelBuildCalls=(stats.modelBuildCalls||0)+1;return model(rows,columnCache,offset);}
  function recordAdapter(m){const d=m?.yuanDiagnostics;if(!d)return;
    stats.discreteYuanEvaluations=(stats.discreteYuanEvaluations||0)+d.evaluations-(d.recordedEvaluations||0);
    stats.discreteYuanBlocks=(stats.discreteYuanBlocks||0)+d.blocks-(d.recordedBlocks||0);
    stats.maxDiscreteYuanBound=Math.max(stats.maxDiscreteYuanBound||0,d.maxRelativeBound);
    d.recordedEvaluations=d.evaluations;d.recordedBlocks=d.blocks;
  }
  function noteSpan(n){
    const bucket=n<12?'1-11-exact':n<16?'12-15':n<64?'16-63':n<256?'64-255':n<1024?'256-1023':n<4096?'1024-4095':'4096+';
    stats.acceptedSpanCounts??={};stats.acceptedSpanCounts[bucket]=(stats.acceptedSpanCounts[bucket]||0)+1;
    stats.recentAcceptedSpans.push({frame:session.ticks,span:n});
    if(stats.recentAcceptedSpans.length>64)stats.recentAcceptedSpans.shift();
  }
  function real(trial=false,sourceRule=fingerprint()){
    const t=performance.now(),sample=session.tick();stats.formulaMs+=performance.now()-t;
    sample.sourceRule=sourceRule;
    assert(keys.every(k=>B.BN(R.getState()[k]).isFinite()&&B.gte(R.getState()[k],0)),
      'HARD: invalid original resource');
    stats.formulaCalls+=sample.substeps;stats.formulaEvaluations=(stats.formulaEvaluations||0)+(sample.formulaEvaluations||0);
    stats.originalSubsteps+=sample.substeps;if(trial)stats.trialFrames++;else stats.trueSamples++;
    return sample;}
  function resetModel(next,why){
    // A floor step already handled by the original frame is not new evidence
    // that the repeatedly short window can now amortize a complete forecast.
    if(why!=='confirmed-mana-tier'){nextProbeTick=0;shortEventStreak=0;}
    samples=[];planning=null;retry=null;lastFailure='';failureCount=0;cooldown=0;
    failedSpan=null;successSpan=0;ceilingUntil=0;blockedSignature=null;blockedUntil=0;
    span=16;shortReprobeAt=0;modelOffset=0;carryCount=0;if(why.startsWith('confirmed-'))carryDisabledUntil=0;signature=next;stats.successSpan=0;stats.errorFailureSpan=null;reason(why);
  }
  function local(why){planning=null;
    // A carried model stores four ORIGINAL samples at an earlier origin. A
    // new local sample must never be appended as if that time gap were .1s.
    if(modelOffset){samples=[];modelOffset=0;carryCount=0;}
const before=fingerprint(),lootBefore=treasureKey(),balances=keys.map(k=>R.getState()[k]),sample=real(false,before);reason(why);stats.originalFallbackFrames++;
    const next=fingerprint(),lootChanged=lootBefore!==treasureKey();
    if(next!==before||!supported(sample)){
      const oldParts=JSON.parse(before),newParts=JSON.parse(next);
      const manaOnly=next!==before&&JSON.stringify(oldParts.slice(1))===JSON.stringify(newParts.slice(1))&&supported(sample);
      // A clean treasure event invalidates every old sample and numerical
      // ceiling, but not the usefulness of a conservative trial length. Only
      // retain that proposal when all non-treasure rules (including mana tier)
      // are unchanged. Four NEW samples and full midpoint/endpoint validation
      // are still required; no old treasure model is carried across the award.
      const treasureOnly=lootChanged&&JSON.stringify(oldParts.slice(0,-4))===JSON.stringify(newParts.slice(0,-4))&&supported(sample);
      const reuseSpan=(manaOnly||treasureOnly)&&failedSpan===null&&!blockedSignature&&!lastFailure?
        Math.min(span,treasureOnly?4096:65536):16;
      const reuseRows=manaOnly&&reuseSpan===span&&sample.manaNormalization&&manaNormalization()&&
        samples.every(s=>s.manaNormalization&&sameStructure(s.sourceRule,next))?[...samples,sample].slice(-4):null;
      resetModel(next,lootChanged?'confirmed-treasure-source':manaOnly?'confirmed-mana-tier':next!==before?'confirmed-formula-regime':'confirmed-special-state');
      if(reuseSpan>16){span=reuseSpan;const key=manaOnly?'manaSpanReuses':'treasureSpanReuses';stats[key]=(stats[key]||0)+1;}
      if(reuseRows){samples=reuseRows;stats.manaHistoryReuses=(stats.manaHistoryReuses||0)+1;}

      if(next!==before){stats.events.push({time:session.elapsed,reason:'original-event',
        realm:R.getState().advancedRealmLevel,foundation:R.getState().foundationUnlocked,
        gym:R.getState().gymPurchased,running:R.getState().runningLevel,rock:R.getState().rockLevel,
        balancesBefore:balances,balancesAfter:keys.map(k=>R.getState()[k]),gains:sample.result.resourceGains});}}
    else {
      if(samples.length>=2){const control=s=>vector(s).map((v,i)=>s.manaNormalization&&(i===2||i===7)?B.div(v,s.manaNormalization):v);
        const prev=control(samples.at(-1)),older=control(samples.at(-2)),now=control(sample);
        if(now.some((v,i)=>B.eq(prev[i],older[i])&&sourceChange(v,prev[i]))){
          cooldown=0;failureCount=0;retry=null;samples=[];nextProbeTick=0;shortEventStreak=0;reason('source-step-resample');}}
      samples.push(sample);if(samples.length>4)samples.shift();}
    if(stats.events.length>32)stats.events.splice(0,stats.events.length-32);
    signature=next;
  }
  function boundary(m,n){
    const deadline=performance.now()+3;
    let operations=0;
    const exhausted=()=>++operations>1&&performance.now()>=deadline;
    if(!planning){
    const s=R.getState(),candidates=audit().filter(c=>c.available&&c.cost!==undefined&&keys.includes(c.resourceKey));
    const nextScale=WIS.Core.Config.scales[s.highestScaleIndex+1];
    if(nextScale)candidates.push({resourceKey:'power',cost:WIS.Power.ScaleLogic.scaleRequirement(s.highestScaleIndex+1)});
    if(s.cultivation.active==='immortal'&&s.qiRefiningUnlocked&&s.circulationUnlocked) {
      const event=WIS.Cultivation.ImmortalLogic.nextBaseManaBoundary();
      const status=event.reason||event.status;stats.boundaryStatus[status]=(stats.boundaryStatus[status]||0)+1;
      if(event.status==='future'&&WIS.Cultivation.ImmortalLogic.offlineManaRounding().mode!=='bounded-rounding')
        candidates.push({resourceKey:'joules',cost:event.cost});
    }
    // Nonnegative model increments -> monotone accumulated resource. This is
    // an algebraic search, not repeated full formula / state simulation.
    const costs=new Map();for(const c of candidates){const i=keys.indexOf(c.resourceKey),cost=B.BN(c.cost);
      if(B.gt(cost,0)&&(!costs.has(i)||B.lt(cost,costs.get(i))))costs.set(i,cost);}
    planning={n,costs:[...costs],index:0,lo:0,hi:null,treasureIndex:0,treasures:null};
    }
    const work=planning,s=R.getState();
    // At most four resource thresholds, selected from original candidates.
    // The cursor survives macro-task yields and persistence; no full formula
    // or real RNG is used by these monotone prefix queries.
    while(work.index<work.costs.length){
      if(exhausted()){reason('prediction-budget-yield');return null;}
      const [i,cost]=work.costs[work.index];
      const reaches=k=>{stats.boundaryQueries++;return B.gte(B.add(s[keys[i]],m.sumColumn(i,k)),cost);};
      if(work.hi===null){if(!reaches(work.n)){work.index++;continue;}work.lo=0;work.hi=work.n;}
      if(work.hi-work.lo>1){const mid=Math.floor((work.lo+work.hi)/2);if(reaches(mid))work.hi=mid;else work.lo=mid;continue;}
      work.n=Math.min(work.n,Math.max(0,work.hi-2));stats.eventCuts++;stats.eventTypes[keys[i]]=(stats.eventTypes[keys[i]]||0)+1;work.index++;work.hi=null;
    }
    if(!s.unlockedAchievements?.trainingUp&&s.totalElapsedSeconds<600)
      work.n=Math.min(work.n,Math.max(0,Math.ceil((600-s.totalElapsedSeconds)*10-1e-8)-1));
    // No aggregate will be attempted at this size. Original frames perform
    // every event, so computing other ETAs cannot improve this decision.
    if(work.n<12){const result=work.n;planning=null;return result;}
    work.treasures ||= WIS.Meta.TreasureProgress.boundarySnapshot(s);
    // Ordinary progress awards are sparse: cut near their current completion.
    // Dense high-layer exploration remains handled by the existing late path.
    while(work.treasureIndex<work.treasures.length){
      if(exhausted()){reason('prediction-budget-yield');return null;}
      const info=work.treasures[work.treasureIndex++];
      if(info.pausedReason||info.remainingSeconds===null)continue;
      const eta=B.toNumber(B.BN(info.remainingSeconds),Infinity);
      if(Number.isFinite(eta)&&eta>=0)work.n=Math.min(work.n,Math.max(0,Math.ceil(eta*10-1e-8)-2));}
    const result=work.n;planning=null;return result;
  }
  while(session.ticks<total){
    yield {session,point,stats,processed:session.ticks/10};
    const left=total-session.ticks;
    const crystal=WIS.Simulation.CrystalInterval;
    const crystalEligible=crystal&&left>=12&&session.ticks>=crystalProbeAt&&crystal.eligible();
    if(!supported()&&!crystalEligible){const support=WIS.Cultivation.Xiuzhen.intervalSupport(R.getState());local(support.supported?'special-state':'unsupported-'+support.code);continue;}
    stats.support=WIS.Cultivation.Xiuzhen.intervalSupport(R.getState()).code;
    const repeat=exactBaseFrames(left,samples.at(-1),audit);
    if(repeat>=4){
      const before=session.checkpoint(),oldFingerprint=fingerprint();
      try{
        const term=B.BN(.1),p=predictedPlan(samples.at(-1),[B.mul(term,repeat),...Array(6).fill(B.ZERO)]);
        p.exactBaseRepeat=true;p.power.repeatJoules={term,count:repeat};p.power.rates.joulesPerSecond=B.ONE;
        global.__percentFrames=repeat;
        const result=session.tick(p,false,repeat);
        assert(!result.result.formulaChanged&&!result.result.discreteEvent&&oldFingerprint===fingerprint(),'HARD: base-repeat proof invalid');
        stats.exactRepeatedFrames=(stats.exactRepeatedFrames||0)+repeat;stats.representedFrames+=repeat;stats.intervalSubsteps+=result.substeps;
        stats.acceptedNodes++;noteSpan(repeat);stats.support='exact-base-j';continue;
      }catch(e){session.restore(before);throw e;}finally{global.__percentFrames=null;}
    }
    const confirmedRegime=fingerprint();
    if(confirmedRegime!==signature)resetModel(confirmedRegime,'confirmed-formula-regime');
    if(crystalEligible){
      const began=performance.now();
      const result=crystal.attempt({session,preview:session.preview,project:session.project,vector,fingerprint,relative,
        aggregate:(sample,sum,end,n)=>plan(sample,{sum:()=>sum,at:()=>end},n),
        intervalTick:(value,n)=>{global.__percentFrames=n;try{return session.tick(value,false,n);}finally{global.__percentFrames=null;}}},
        Math.min(left,crystalWidth*4,65536),crystalWidth);
      stats.crystalTrialMs=(stats.crystalTrialMs||0)+performance.now()-began;
      stats.crystalSourceQueries=(stats.crystalSourceQueries||0)+result.stats.queries;
      stats.crystalTrialPieces=(stats.crystalTrialPieces||0)+result.stats.pieces;
      stats.crystalTrialEvents=(stats.crystalTrialEvents||0)+result.stats.events;
      if(result.accepted){
        stats.crystalIntervals=(stats.crystalIntervals||0)+1;
        stats.crystalCommittedEvents=(stats.crystalCommittedEvents||0)+result.events.length;
        stats.crystalCommittedPieces=(stats.crystalCommittedPieces||0)+result.pieces;
        stats.crystalFrames=(stats.crystalFrames||0)+result.frames;
        stats.maxCrystalIncomeEstimate=Math.max(stats.maxCrystalIncomeEstimate||0,...result.errors);
        stats.acceptedNodes++;stats.representedFrames+=result.frames;noteSpan(result.frames);
        crystalWidth=Math.min(8192,Math.ceil(crystalWidth*1.5));
        resetModel(fingerprint(),'crystal-interval-committed');continue;
      }
      reason(result.reason);stats.crystalRejected=(stats.crystalRejected||0)+1;
      if(result.reason==='crystal-whole-income-error')crystalWidth=Math.max(2,Math.floor(crystalWidth/2));
      crystalProbeAt=session.ticks+(result.retryFrames??(result.reason==='crystal-whole-income-error'?16:64));
    }
    // IP -> X -> body is supported only by the independently refined crystal
    // adapter. Its rejected/reprobe frames must not use the older X-constant
    // general model outside that model's declared domain.
    if(!supported()){local('crystal-feedback-exact-reprobe');continue;}
    if(session.ticks<nextProbeTick){local('short-event-backoff');continue;}
    if(samples.length<4){local('sampling');continue;}
    const modelSignature=fingerprint()+JSON.stringify(vector(samples.at(-1)).map(v=>[v.sign,v.layer,
      Math.floor(v.mag / Math.pow(10,Math.floor(Math.log10(Math.max(1,Math.abs(v.mag))))-2))]));
    if(blockedSignature&&session.ticks<blockedUntil){local('model-backoff');continue;}
    if(blockedSignature){resetModel(fingerprint(),'scheduled-resample');continue;}
    if(failedSpan!==null&&session.ticks>=ceilingUntil){resetModel(fingerprint(),'span-reprobe');continue;}
    if(cooldown>0){cooldown--;local('retry-backoff');continue;}
    if(left<minimumPredictionFrames){local('short-tail');continue;}
    // Below twelve, the former trial executed at least n original validation
    // frames in addition to the forecast and endpoint. Commit only real frames.
    // A fixed confirmed-frame deadline prevents a small span from trapping us.
    if((retry??span)<minimumPredictionFrames){
      if(failedSpan!==null){local('short-error-ceiling');continue;}
      if(!shortReprobeAt)shortReprobeAt=session.ticks+shortResampleFrames;
      if(session.ticks>=shortReprobeAt){
        planning=null;retry=null;span=Math.max(16,span);shortReprobeAt=0;
        samples=[];lastFailure='';failureCount=0;cooldown=0;reason('short-span-reprobe');continue;
      }
      local('short-retry-window');continue;
    }
    shortReprobeAt=0;
    let m,n;
    const start=performance.now();
    try{m=buildModel(samples,modelOffset);
      n=boundary(m,Math.min(left,retry??span,m.maxFrames));stats.predictionCalls++;}
    catch(e){reason(e.message);samples=[];modelOffset=0;carryCount=0;planning=null;cooldown=Math.min(16,++failureCount*2);if(failureCount>=4){blockedSignature=modelSignature;blockedUntil=session.ticks+256;}continue;}
    finally{stats.predictionMs+=performance.now()-start;recordAdapter(m);}
    if(n===null)continue;
    if(n<minimumPredictionFrames){
      shortEventStreak=Math.min(4,shortEventStreak+1);
      nextProbeTick=session.ticks+Math.min(64,4*2**shortEventStreak);
      stats.shortEventReprobes=(stats.shortEventReprobes||0)+1;
      local(n<4?'event-neighborhood':'short-event-interval');continue;
    }
    nextProbeTick=0;shortEventStreak=0;
    const before=session.checkpoint(),f=fingerprint(),treasures=treasureKey(),last=samples.at(-1);
    let accepted=false;const trialStarted=performance.now();
    try{
      const predicted=plan(last,m,n);global.__percentFrames=n;
      let committed;try{committed=session.tick(predicted,false,n);}finally{global.__percentFrames=null;}
      stats.intervalSubsteps+=committed.substeps;
      assert(!committed.result.formulaChanged&&!committed.result.discreteEvent&&f===fingerprint(),'interval-event');
      assert(treasures===treasureKey(),'treasure-feedback-boundary');
      assert(supported(),'interval-special-state');
      const end=session.checkpoint(),actual=real(true),actualVector=vector(actual),predictedVector=m.at(n+1);
      assert(supported(actual)&&f===fingerprint()&&treasures===treasureKey(),'endpoint-formula-event');
      const reuseEndpoint=n<left;
      const afterEndpoint=reuseEndpoint?session.checkpoint():null;
      const error=Math.max(...actualVector.map((v,i)=>relative(v,predictedVector[i])));
      if(error>=.0015)stats.lastEndpointError={frames:n,columns:actualVector.map((v,i)=>({i,actual:String(v),
        predicted:String(predictedVector[i]),error:relative(v,predictedVector[i])}))};
      stats.maxSourceError=Math.max(stats.maxSourceError,Number.isFinite(error)?error:1);
      assert(error<.0015,'endpoint-source-error');
      // Keep the next real event for the original frame, never accept a
      // counterfactual award/consumption generated by this endpoint probe.
      session.restore(before);
      // Independently re-fit after advancing to the middle. Compare whole
      // interval income, including the four real middle recurrences. This is
      // an error estimator, not a proof derived from endpoint source error.
      const checkGains=vector(last).map(()=>B.ZERO);
      const addSample=sample=>vector(sample).forEach((v,i)=>checkGains[i]=B.add(checkGains[i],v));
      const checkedTick=p=>{let value;global.__percentFrames=p.frames;
        try{value=session.tick(p.value,false,p.frames);}finally{global.__percentFrames=null;}
        stats.validationSubsteps=(stats.validationSubsteps||0)+value.substeps;
        assert(!value.result.formulaChanged&&!value.result.discreteEvent&&f===fingerprint()&&treasures===treasureKey(),'validation-event');
        return value;};
      {
        const half=Math.floor(n/2),first=plan(last,m,half);
        checkedTick({value:first,frames:half});addSample(first);
        const middle=[];
        for(let i=0;i<4;i++){const sample=real(true);middle.push(sample);addSample(sample);
          assert(supported(sample)&&f===fingerprint()&&treasures===treasureKey(),'validation-event');}
        const right=buildModel(middle),rest=n-half-4;
        try {
          const second=plan(middle.at(-1),right,rest);
          checkedTick({value:second,frames:rest});addSample(second);
          const check=real(true);
          assert(supported(check)&&f===fingerprint()&&treasures===treasureKey(),'validation-event');
          const rightEndpoint=right.at(rest+1);
          assert(Math.max(...vector(check).map((v,i)=>relative(v,rightEndpoint[i])))<.0015,'validation-endpoint-error');
        } finally {recordAdapter(right);}
      }
      const predictedGains=m.sum(n);
      const gainError=Math.max(...checkGains.map((v,i)=>relative(v,predictedGains[i])));
      stats.maxTrialGainError=Math.max(stats.maxTrialGainError||0,Number.isFinite(gainError)?gainError:1);
      assert(gainError<.001,'whole-interval-gain-error');
      stats.maxAcceptedGainError=Math.max(stats.maxAcceptedGainError||0,gainError);
      session.restore(afterEndpoint||end);
      if(reuseEndpoint){stats.trialFrames--;stats.trueSamples++;stats.originalFallbackFrames++;reason('verified-endpoint-reused');}
      assert(keys.every(k=>R.getState()[k].isFinite()&&B.gte(R.getState()[k],0)),'HARD: invalid resource');
      stats.acceptedNodes++;stats.sections++;stats.representedFrames+=n;noteSpan(n);
      stats.maxAcceptedSourceError=Math.max(stats.maxAcceptedSourceError||0,error);
      stats[m.kind==='constant'?'constantFrames':'varyingFrames']+=n;
      accepted=true;
      // Advance a validated model's origin, not fabricated new samples. Keep
      // the original four observations and explicit frame offset in the saved
      // cursor. The next segment still runs the full independent middle fit
      // and both endpoint checks. Carry at most three times with tenfold
      // tighter observed error and no active numerical failure ceiling.
      const carry=reuseEndpoint&&n>=64&&failedSpan===null&&session.ticks>=carryDisabledUntil&&
        carryCount<3&&modelOffset+n+1<=65536&&Math.max(error,gainError)<1e-4;
      if(carry){modelOffset+=n+1;carryCount++;stats.carriedModelNodes=(stats.carriedModelNodes||0)+1;}
      else {samples=reuseEndpoint?[actual]:[];modelOffset=0;carryCount=0;}
      retry=null;successSpan=n;
      // Event truncation does not reduce the learned model span. An error
      // ceiling survives successful smaller intervals until a bounded reprobe.
      if(n>=span||failedSpan!==null)span=Math.min(65536,Math.max(4,Math.floor(n*1.25)),failedSpan===null?65536:failedSpan-1);
      stats.successSpan=successSpan;stats.errorFailureSpan=failedSpan;failureCount=0;cooldown=0;
      signature=fingerprint();
    }catch(e){session.restore(before);stats.rejectedNodes++;reason(e.message);
      if(e.message.startsWith('HARD:'))throw e;
      const event=['interval-event','treasure-feedback-boundary','interval-special-state','endpoint-formula-event','validation-event'].includes(e.message);
      if(modelOffset&&!event){
        // A stale carried fit is not evidence that a new four-sample model at
        // this boundary also fails. Restore the confirmed state and re-fit;
        // prevent repeated carry probes for a deterministic confirmed interval.
        modelOffset=0;carryCount=0;samples=[];retry=null;planning=null;
        carryDisabledUntil=session.ticks+4096;reason('carried-model-refresh');
      }else if(event){
        // A speculative formula/event boundary is rolled back, never learned
        // as a permanent numerical ceiling. Confirm it with original frames.
        stats.eventRejections=(stats.eventRejections||0)+1;retry=Math.floor(n/2);cooldown=0;
      }else{
        failureCount=e.message===lastFailure?failureCount+1:1;lastFailure=e.message;
        failedSpan=Math.min(failedSpan??Infinity,n);ceilingUntil=session.ticks+4096;
        stats.errorFailureSpan=failedSpan;
        retry=Math.floor(n/2);span=Math.max(4,retry);
        if(retry<4||failureCount>=4){blockedSignature=modelSignature;blockedUntil=session.ticks+256;retry=null;cooldown=0;}
      }
    }finally{global.__percentFrames=null;stats.trialMs+=performance.now()-trialStarted;recordAdapter(m);}
    // A rejected attempt yields with only the last confirmed state restored;
    // samples/retry cursor survive pause or refresh. No speculative RNG escapes.
    if(!accepted)continue;
  }
  yield {session,point,stats,processed:session.ticks/10};
}
module.exports={runSteps,supported,column,relative,formulaRegime,sourceChange,manaNormalization};

}
},cache=new Map(),global={};
  const CHECKPOINT_BUILD='offline-repair-20260911-r8';
  let computing=false,activeContext=null,activeCosts=null;
  function recordCost(name,amount){if(activeCosts)activeCosts[name]=(activeCosts[name]||0)+amount;}
  function cloneMemory(value) {
    if(WIS.Core.BigNum.isDecimal(value))return value.constructor.fromComponents_noNormalize(value.sign,value.layer,value.mag);
    if(Array.isArray(value))return value.map(cloneMemory);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cloneMemory(v)]));
    return value;
  }
  function memoryPoint(raw) {
    // Domain and transients are already independent host snapshots. The
    // mutable model/diagnostic cursors also need their own independent copy.
    const {game,...cursor}=raw;
    return {...cloneMemory(cursor),game:{...game,metrics:{...game.metrics}},build:CHECKPOINT_BUILD};
  }
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const assert=(value,message='Fast-forward assertion failed')=>{if(!value)throw Error(message);};
  Object.assign(assert,{equal:(a,b,message)=>assert(Object.is(a,b),message||`${a} !== ${b}`),
    deepEqual:(a,b,message)=>assert(equal(a,b),message||'Fast-forward state mismatch'),ok:assert});
  function normalize(name){const parts=[];for(const p of name.split('/')){if(p==='..')parts.pop();else if(p&&p!=='.')parts.push(p);}return parts.join('/');}
  function load(name,from='entry.js'){
    if(name==='node:assert/strict')return assert;
    if(name==='node:perf_hooks')return {performance};
    let id=normalize(name.startsWith('.')?from.slice(0,from.lastIndexOf('/')+1)+name:name);
    if(!id.endsWith('.js'))id+='.js';
    if(id==='production/js/vendor/break_eternity.min.js')return WIS.Core.BigNum.BN(0).constructor;
    if(cache.has(id))return cache.get(id).exports;
    assert(modules[id],'Missing fast-forward module: '+id);
    const module={exports:{}};cache.set(id,module);
    modules[id](x=>load(x,id),module,module.exports,global);return module.exports;
  }
  // Diagnostics remain outside formulas. This no-op profiler still executes all
  // required audit callbacks; measured profiling belongs in the E:\...\测试 tools.
  global.__jointRevision={count(){},timed(_key,fn,receiver,args){return Reflect.apply(fn,receiver,args);}};
  const ledgerCache=load('percent/ledger-cache').create();let bulk=null;
  function applyTreasure(state,key,units,gain,ordinary,fixedAward){
    bulk??=load('percent/bulk-progress').create();
    const run=()=>bulk.apply(state,key,units,gain,ordinary,fixedAward);
    return global.__progressAudit?global.__progressAudit.advance(state,key,units,gain,run):run();
  }
  function treasureRecoverySteps(state,key,award){
    bulk??=load('percent/bulk-progress').create();
    const P=WIS.Meta.TreasureProgress;
    function* ordinary(){
      const queue=state.meta.treasureProgressPending[key];state.meta.treasureProgressPending[key]=[];
      for(const input of P.Pending.inputs(queue)){
        const row={...input};delete row._endBlock;state.meta.treasureProgressPending[key]=[row];
        P.advanceFixed(state,key,0,{eligible:true,gain:0,award:input.award??award});
        if(state.meta.treasureProgressPending[key]?.length)throw new WIS.Meta.TreasureLedger.LedgerError('宝物来源未能安全结算；原始输入保留');
        yield {phase:'settle',key,block:input._endBlock};
      }return WIS.Core.BigNum.ZERO;
    }
    return bulk.steps(state,key,0,0,ordinary,award);
  }
  function audit(){global.__percentAudit=[];
    try{WIS.Cultivation.ImmortalLogic.autoBreakthroughImmortalRealms();
      WIS.Cultivation.Xiuzhen?.automation(WIS.Core.Runtime.state,'realm');
      WIS.Cultivation.ImmortalLogic.autoUpgradeImmortalAbilities();
      WIS.Cultivation.Xiuzhen?.automation(WIS.Core.Runtime.state,'ability');
      WIS.Power.ScaleLogic.autoUpgradeEnhancements();return global.__percentAudit;}
    finally{global.__percentAudit=null;}}
  function pack(value){return JSON.parse(JSON.stringify(value,function(key,v){const raw=this[key];
    return WIS.Core.BigNum.isDecimal(raw)?{__wisFastDecimal:[raw.sign,raw.layer,raw.mag]}:v;}));}
  function unpack(value){return JSON.parse(JSON.stringify(value),(_key,v)=>{
    if(!v?.__wisFastDecimal)return v;
    const d=v.__wisFastDecimal;
    assert(Array.isArray(d)&&d.length===3&&d.every(Number.isFinite)&&[-1,0,1].includes(d[0])&&Number.isInteger(d[1])&&d[1]>=0,
      'Invalid typed Decimal checkpoint');
    return WIS.Core.BigNum.BN(0).constructor.fromComponents_noNormalize(...d);
  });}
  function validatePoint(point,remaining){
    assert(point.version===1&&point.game?.state?.domain,'Unsupported fast-forward checkpoint');
    assert(point.engine===undefined||point.engine==='normal-discrete','Unknown fast-forward checkpoint engine');
    assert(Number.isSafeInteger(point.game.ticks)&&point.game.ticks>=0&&Number.isFinite(point.originalSeconds)&&
      Math.abs(point.originalSeconds+(point.hostTailSeconds||0)-(point.game.ticks/10+remaining))<1e-7,'HARD: fast checkpoint debt mismatch');
    const state=WIS.Core.State.cloneForSimulation(point.game.state.domain),B=WIS.Core.BigNum,L=WIS.Meta.TreasureLedger;
    for(const key of ['joules','power','mana','immortalPower'])assert(B.BN(state[key]).isFinite()&&B.gte(state[key],0),'HARD: invalid saved resource');
    for(const key of WIS.Meta.Treasures.keys)assert(L.sign(L.stock(state,key))>=0&&L.sign(L.progress(state,key))>=0,'HARD: invalid saved treasure balance');
    assert(point.game.gains.length===4&&point.game.gains.every(v=>B.BN(v).isFinite()&&B.gte(v,0)),'HARD: invalid cumulative gains');
  }
  function compact(point){
    // These histories are diagnostic output only, not samples/model/feedback.
    // Keep a typed domain checkpoint too: Decimal's ordinary JSON string parser
    // can move tiny balances by one ULP on import and corrupt additive tails.
    // Both representations are written atomically in the same save envelope.
    const diagnostic=point.diagnostics?{...point.diagnostics,awards:point.diagnostics.awards.slice(-32),
      cosmicFiber:point.diagnostics.cosmicFiber.slice(-2),natural:point.diagnostics.natural.slice(-2),captures:[]}:null;
    return pack({...point,game:{...point.game,
      automaticEvents:[],discreteEvents:[]},trace:[],nodeLog:[],rejectLog:[],diagnostics:diagnostic});
  }
  function applicable(){try{return load('percent/engine').supported()||load('general-engine').supported()||WIS.Simulation.CrystalInterval?.eligible();}catch{return false;}}
  function createDriver(context,{seconds,random,gains,resume=null}){
    assert(!activeContext,'Concurrent fast-forward jobs are unsupported');
    const runtime=load('runtime'),late=load('percent/engine'),diagnostics=load('percent/observe').create();
    const costs={snapshotMs:0,encodingMs:0,encodingCount:0,integrationEvaluations:0,advanceMs:0};
    let saved=resume?(resume.memory?cloneMemory(resume.point):unpack(resume)):null;
    if(saved)validatePoint(saved,seconds);
    const engine=saved ? load(saved.engine==='normal-discrete'?'general-engine':'percent/engine')
      : late.supported()&&!audit().some(c=>c.available)?late:load('general-engine');
    runtime.bind({...context,random,gains});
    const original=saved?.originalSeconds??Math.floor((seconds+1e-9)*10)/10;
    const hostTailSeconds=saved?.hostTailSeconds??Math.max(0,seconds-original);
    assert(original>0&&Number.isSafeInteger(original*10),'Unsupported offline duration');
    const iterator=engine.runSteps(null,{seconds:original,targets:50,nodes:2,limitMs:Infinity,audit,
      diagnostics,resume:saved,traceEvery:1000000000});
    let current=null,point=saved,closed=false;
    function invoke(){activeContext=context;computing=true;activeCosts=costs;global.__progressAudit=diagnostics;
      try{return iterator.next();}finally{computing=false;activeContext=null;activeCosts=null;global.__progressAudit=null;global.__percentFrames=null;}}
    function confirmedPoint(){const t=performance.now();try{const p=memoryPoint(current.value.point());p.hostTailSeconds=hostTailSeconds;return p;}
      finally{costs.snapshotMs+=performance.now()-t;}}
    current=invoke();point=confirmedPoint();
    function advance(){assert(!closed,'Fast-forward driver closed');const before=point,started=performance.now();
      try{current=invoke();if(current.done)throw Error(current.value.failure||'Fast-forward stopped before its fixed debt completed');point=confirmedPoint();
        return {seconds:(point.game.ticks-before.game.ticks)/10,gains:point.game.gains,stats:{...point.stats,costs:{...costs,advanceMs:costs.advanceMs+performance.now()-started}},
          replan:point.engine==='normal-discrete'&&late.supported()&&!audit().some(c=>c.available),
          completed:point.game.ticks===original*10};
      }catch(error){current.value?.session?.restore(before.game);point=before;closed=true;throw error;}finally{costs.advanceMs+=performance.now()-started;}}
    return {advance,export:()=>{const t=performance.now();try{return {...compact(point),hostTailSeconds};}finally{costs.encodingMs+=performance.now()-t;costs.encodingCount++;}},point:()=>point,close(){closed=true;},
      get processed(){return point.game.ticks/10;},get original(){return original;}};
  }
  WIS.Simulation=WIS.Simulation||{};
  WIS.Simulation.FastForward=Object.freeze({version:1,checkpointBuild:CHECKPOINT_BUILD,targets:50,ledgerCache,applyTreasure,treasureRecoverySteps,audit,applicable,createDriver,
    sourceModel:Object.freeze({column:load('general-engine').column,formulaRegime:load('general-engine').formulaRegime,sourceChange:load('general-engine').sourceChange}),
    pack,unpack,cloneMemory,recordCost,exportPoint:compact,validatePoint,get intervalFrames(){return global.__percentFrames||1;},isComputing:()=>computing,
    get auditCandidates(){return global.__percentAudit;},
    exploration:(attempts,effective)=>global.__progressAudit?.exploration(attempts,effective)});
}(window.WIS));
