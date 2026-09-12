(function defineCrystalInterval(WIS) {
  'use strict';
  const B=WIS.Core.BigNum,R=WIS.Core.Runtime;
  const check=(condition,reason)=>{if(!condition)throw Error('crystal-'+reason);};
  function eligible() {
    const s=R.getState(),I=WIS.Cultivation.ImmortalLogic;
    const X=WIS.Cultivation.Xiuzhen;
    if(!(s.highestScaleIndex>=10&&s.cultivation.active==='immortal'&&
      WIS.Meta.TreasureProgress.qualification(s,'immortalCrystal')===null&&
      !s.descendRealmUnlocked&&B.eq(I.automaticExplorationAmountPerSecond(),0)&&
      B.eq(s.minorTribulationExplorationLoad??0,0)&&
      !['materialSpirit','crystal','worldAura','rules','divineArt'].some(key=>X.has(s,key))&&
      X.resourceKeys.every(key=>X.amount(s,key).isFinite())&&
      (!s.activeChallenge||s.activeChallenge==='yinVoidYangReal')))return false;
    const rate=I.immortalPowerPerSecond();if(!rate.gt(0))return false;
    // Let the original partial-frame bridge consume genuinely dense realm
    // progress boundaries (e.g. first IP from a very large mana inventory).
    const boundary=I.nextImmortalPowerProgressBoundary();
    return !boundary||B.gte(B.div(B.sub(boundary,s.immortalPower),rate),.1);
  }
  function structural(fingerprint) {
    const fields=JSON.parse(fingerprint());
    // Exempt only the adapted crystal stock. Every other treasure, ability,
    // automation flag, achievement, mana tier and challenge remains a boundary.
    for(const index of [fields.length-4,fields.length-3]) {
      fields[index]={...fields[index]};delete fields[index].immortalCrystal;
    }
    return JSON.stringify(fields);
  }
  function attempt(api,target,width) {
    const {session,preview,project,aggregate,vector,fingerprint,relative,intervalTick}=api;
    const P=WIS.Meta.TreasureProgress,T=WIS.Meta.Treasures,L=WIS.Meta.TreasureLedger;
    for(const event of P.boundarySnapshot(R.getState()))if(event.key!=='immortalCrystal'&&!event.pausedReason&&event.remainingSeconds!==null){
      const eta=B.toNumber(event.remainingSeconds,Infinity);
      if(Number.isFinite(eta)&&eta>=0)target=Math.min(target,Math.max(0,Math.ceil(eta*10-1e-10)-2));
    }
    if(target<12)return {accepted:false,reason:'crystal-short-external-event',retryFrames:Math.max(1,target+3),stats:{queries:0,pieces:0,events:0}};
    const start=session.checkpoint(),rule=structural(fingerprint),stats={queries:0,pieces:0,events:0};
    const inputSignature=()=>JSON.stringify([String(P.unitGain(R.getState(),'immortalCrystal')),
      String(T.getTreasureAwardMultiplier(R.getState(),'immortalCrystal'))]);
    const fixedInput=inputSignature();
    const sample=(options={})=>{
      stats.queries++;
      const p=preview(options);
      check(p.cultivation?.completed!==false&&!p.cultivation?.event&&!p.cultivation?.instantEvent,'source-event');
      check(Math.abs((p.cultivation?.processedSeconds??.1)-.1)<1e-12,'source-partial');
      const v=vector(p);check(v.every(x=>x.isFinite()&&x.sign>=0),'source-domain');
      check(v[3].gt(0)&&B.eq(v[6],0)&&B.eq(v[8],0),'source-eligibility');
      return p;
    };
    function run(frames,block,limit,cuts=[],allowPrefix=false) {
      const sums=Array(9).fill(B.ZERO),events=[],ends=[],origin=session.ticks;let pieces=0;
      while(session.ticks-origin<frames) {
        if(pieces===limit&&allowPrefix)break;
        check(++pieces<=limit,'piece-limit');stats.pieces++;
        check(rule===structural(fingerprint)&&fixedInput===inputSignature(),'dependency-change');
        const remaining=frames-(session.ticks-origin),boundaries=P.boundarySnapshot(R.getState());
        let n=Math.min(block,remaining);
        const nextCut=cuts.find(frame=>frame>session.ticks-origin);
        if(nextCut!==undefined)n=Math.min(n,nextCut-(session.ticks-origin));
        for(const e of boundaries)if(!e.pausedReason&&e.remainingSeconds!==null){
          const eta=B.toNumber(e.remainingSeconds,Infinity);
          if(Number.isFinite(eta)&&eta>=0){
            // The adapted reward is committed at its original frame END; it
            // changes the next piece's source. Other events stop the interval.
            const eventFrame=Math.max(1,Math.ceil(eta*10-1e-10));
            n=Math.min(n,e.key==='immortalCrystal'?eventFrame:Math.max(0,eventFrame-2));
          }
        }
        check(n>0,'external-event');
        const first=sample(),a=vector(first);
        let end=a;
        if(n>1){
          // Project n-1 original-frame gains, then evaluate the actual final
          // frame formula. These are temporary quadrature evaluations, never
          // stored as real equally-spaced model history.
          const projected=project(aggregate(first,a.map(v=>B.mul(v,n-1)),a,n-1),n-1,sample);
          end=vector(projected);
        }
        const income=a.map((v,i)=>B.eq(v,end[i])?B.mul(v,n):B.mul(B.div(B.add(v,end[i]),2),n));
        const plan=aggregate(first,income,end,n),beforeStock=T.count(R.getState(),'immortalCrystal');
        const result=intervalTick(plan,n);
        ends.push(session.ticks-origin);
        check(!result.result.formulaChanged&&!result.result.discreteEvent,'commit-event');
        check(rule===structural(fingerprint)&&fixedInput===inputSignature(),'post-dependency-change');
        check(eligible(),'post-eligibility');
        income.forEach((v,i)=>sums[i]=B.add(sums[i],v));
        const award=B.sub(T.count(R.getState(),'immortalCrystal'),beforeStock);
        if(award.gt(0)){events.push({frame:session.ticks-origin,amount:String(award)});stats.events++;}
      }
      return {sums,events,point:session.checkpoint(),pieces,ends,frames:session.ticks-origin};
    }
    try {
      // The work cap limits this interval's confirmed prefix. Discarding a
      // valid prefix here made dense crystal windows fail at every reprobe.
      // Fine must independently cover EXACTLY the chosen prefix in full.
      // Bound synchronous trial work by a deterministic piece count. This
      // changes only interval partitioning, never the income-error threshold.
      const coarse=run(target,width,8,[],true);
      check(coarse.frames>=12,'short-prefix');
      session.restore(start);
      // Halve EACH coarse piece, including pieces already shortened by an
      // internal award. Merely halving a global width can produce identical
      // coarse/fine paths at dense events and a meaningless zero estimate.
      let previous=0;
      const cuts=coarse.ends.flatMap(end=>{const middle=previous+Math.floor((end-previous)/2);
        const points=middle>previous?[middle,end]:[end];previous=end;return points;});
      const fine=run(coarse.frames,width,16,cuts);
      const errors=coarse.sums.map((v,i)=>relative(v,fine.sums[i]));
      check(errors.every(v=>v<=1e-5),'whole-income-error');
      check(JSON.stringify(coarse.events)===JSON.stringify(fine.events),'event-frame-error');
      const ca=coarse.point.state.domain,fa=fine.point.state.domain;
      for(const key of T.keys){
        check(L.compare(L.stock(ca,key),L.stock(fa,key))===0,'stock-error');
        const difference=L.subtract(L.progress(ca,key),L.progress(fa,key));
        check(B.lte(B.abs(L.value(difference)),B.mul(P.requirement(key,T.count(fa,key)),'1e-12')),'progress-error');
      }
      check(JSON.stringify(ca.meta.treasureProgressPending)===JSON.stringify(fa.meta.treasureProgressPending),'pending-input-error');
      check(coarse.point.random===fine.point.random,'rng-error');
      // Fine is the accepted state. The independent coarse result is solely
      // an error estimate, not a rigorous global bound. Final offline-income
      // acceptance still requires the original-frame regression references.
      return {accepted:true,frames:coarse.frames,stats,errors,events:fine.events,pieces:fine.pieces};
    } catch(error) {
      session.restore(start);
      return {accepted:false,reason:String(error.message||error),stats};
    }
  }
  WIS.Simulation.CrystalInterval=Object.freeze({eligible,attempt});
}(window.WIS));
