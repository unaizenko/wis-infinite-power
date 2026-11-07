(function(W){
 "use strict";
 const R=W.Core.Rank,B=W.Core.BigNum,{Budget,Q}=W.Core.RankBudget;
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
 const fail=message=>{throw Object.assign(Error(message),{code:'rank-cost-unresolved'});};
 const enabled=()=>W.Core.Config.saveVersion>=74&&W.Meta.BigNumbers.exactRanksEnabled();
 const M=()=>W.Meta.BigNumbers,I=()=>W.Meta.Infinity;
 const partial=record=>Budget.view(record).progress;
 const current=record=>Budget.currentRank(record);
 function detach(n){if(n.rankBasis)n.rankBasis=W.Core.RankBasis.read(n.rankBasis,n);if(n.gBudget)n.gBudget=Budget.prepare(n.gBudget);return validate(n);}
 function* detachSteps(n){
  if(n.rankBasis)n.rankBasis=yield ()=>W.Core.RankBasis.read(n.rankBasis,n);
  if(n.gBudget)n.gBudget=yield* Budget.prepareSteps(n.gBudget);
  if(n.tree.rankBudget)n.tree.rankBudget=yield* Budget.prepareSteps(n.tree.rankBudget);
  return yield ()=>validate(n);
 }
 function limit(rank,maximum,one=false){if(maximum!==null&&R.compare(rank,maximum)>=0)return '0';if(one)return '1';if(maximum===null)return null;return R.compare(rank,3)<0?'1':W.Core.RankMath.integerDifference(rank,maximum);}
 function gLimit(rank,maximum){return maximum===null?null:R.compare(rank,maximum)>=0?'0':W.Core.RankMath.integerDifference(rank,maximum);}
 function rules(state,pricing){return {mode:'g-polynomial',pricing,d6:I().has(state,'D6'),treeDelta:I().has(state,'D4')?M().rankOffsetValue(M().get(state).tree.rank,3):'0',challenge:state.activeChallenge==='trueGraham'?'trueGraham':null,reward:I().rewardUnlocked(state,'trueGraham')};}
 function gRaw(record){let value=Budget.available(record);if(record.gRules.pricing==='base')value=Q.multiply(value,Q.decimal(M().milestoneMultiplier(current(record))));return value;}
 // High-rank G contract (2^53 < G < 1e300, not trueGraham): adjacent integers are no longer
 // certified. The debit is the represented Decimal demand, as treasure
 // rounded-bulk; funding is debited exactly, never below zero, and every
 // successful approximate batch re-anchors at cursor 0 to avoid rebuilding an old prefix.
 // From 1e300 Decimal costs lose relative precision; the exact solver stays.
 const G_APPROX_RANK=String(Number.MAX_SAFE_INTEGER),G_EXACT_AGAIN='1e300';
 const highG=record=>!record.gRules.challenge&&R.compare(current(record),G_APPROX_RANK)>0&&R.compare(current(record),G_EXACT_AGAIN)<0;
 function gScale(rules){const alpha=rules.reward?W.Meta.InfinityConfig.gRewardExponent:1;return B.mul(B.pow10(B.mul(R.project(rules.treeDelta),alpha)),rules.pricing==='base'?32:1);}
 const EULER_MACLAURIN=[[1,1/12],[3,-1/720],[5,1/30240],[7,-1/1209600],[9,1/47900160],[11,-691/1307674368000],[13,1/74724249600],[15,-3617/10670622842880000]];
 // Sum_{j<n}(x+j)^q / x^q, the normalized form of BigNumbers' largePowerSum.
 function powerSumRatio(x,n,q){
  if(n===0)return 0;if(n===1)return 1;const log=Math.log1p((n-1)/x),difference=e=>Math.expm1(e*log);
  let sum=x*difference(q+1)/(q+1)+(1+Math.exp(q*log))/2;
  for(const [order,coefficient] of EULER_MACLAURIN){let derivative=coefficient;for(let j=0;j<order;j++)derivative*=q-j;sum+=derivative*Math.pow(x,-order)*difference(q-order);}
  return sum;
 }
 // Derivative of the same normalized Euler–Maclaurin cost, used only
 // to choose a batch; the eventual represented debit still needs Q.compare.
 function powerSumRatioSlope(x,n,q){
  const log=Math.log1p((n-1)/x);let slope=Math.exp(q*log)+q/(2*x)*Math.exp((q-1)*log);
  for(const [order,coefficient] of EULER_MACLAURIN){let derivative=coefficient;for(let j=0;j<=order;j++)derivative*=q-j;slope+=derivative*Math.pow(x,-order-1)*Math.exp((q-order-1)*log);}
  return slope;
 }
 // Cost(n) = scale * cost(n): the Decimal scale is the first rank's leading
 // price (capacity, D6, D4, reward power as RankGCost single); below 1e300 the
 // remaining ratios are ordinary doubles. The floor of 42 is far below 2^53.
 function gModel(rules,g){
  const a=25/16,h=56,p=rules.reward?W.Meta.InfinityConfig.gRewardExponent:1,shift=h+(rules.reward&&rules.d6?1/(2*a):0);
  const xd=B.sub(g,shift),x=B.toNumber(xd),gx=B.toNumber(g)/x,scale=B.div(B.mul(Math.pow(a,p),B.pow(xd,2*p)),gScale(rules));
  // The integral seed also covers batches much larger than the starting rank.
  const seed=target=>x*Math.expm1(Math.log1p((target/x)*(2*p+1))/(2*p+1));
  if(rules.reward){
   const o=rules.d6?(h/a+1/(4*a*a))/(x*x):0,terms=rules.d6?12:1;
   return {scale,seed,fee:n=>{let sum=0,c=1;for(let j=0;j<terms;j++){sum+=c*powerSumRatioSlope(x,n,2*p-2*j);c*=((p-j)/(j+1))*(-o);}return sum;},cost:n=>{let sum=0,c=1;for(let j=0;j<terms;j++){sum+=c*powerSumRatio(x,n,2*p-2*j);c*=((p-j)/(j+1))*(-o);}return sum;}};
  }
  const d6=rules.d6?1:0;
  return {scale,seed,fee:n=>1+(2*n-1)/x+((n/x)*((n-1)/x)+1/(6*x*x))-d6*(gx+(2*n-1)/(2*x))/(a*x),cost:n=>n*(1+(n-1)/x+((n-1)/x)*((2*n-1)/x)/6)-d6*n*(gx+(n-1)/(2*x))/(a*x)};
 }
 // Re-anchoring is optional: an unresolved comparison keeps the exact path.
 // Only certification failure is caught; cooperative suspension must propagate.
 function canRoundDown(value,exact){try{return Q.compare(value,exact)<=0;}catch(error){if(error.code==='rank-cost-unresolved')return false;throw error;}}
 function settleGApprox(record,limitText){
  const rules=record.gRules,origin=current(record),g=R.project(origin),exact=Budget.available(record),money=Q.project(exact),zero=Q.decimal(0);
  // A certified symbolic balance (left by the exact solver) is entered once,
  // rounded down below its projection error; later balances stay rational.
  const available=W.Core.RankExact.is(exact)?Q.multiply(Q.decimal(String(money)),Q.fraction(99999999999999n,100000000000000n)):exact;
  const result=(rank,remainder,count)=>({record:Budget.create({rank,funding:remainder,mode:'g-polynomial',d6:rules.d6,pricing:rules.pricing,treeDelta:rules.treeDelta,challenge:rules.challenge??null,reward:rules.reward===true}),count:String(count),rank,remainder});
  const cap=limitText==null?null:BigInt(limitText),model=gModel(rules,g),target=B.div(money,model.scale).toNumber();
  if(cap===0n||!Number.isFinite(target)||!(target>=model.cost(1)))return Budget.settle(record,{limit:limitText});
  // A safety multiplier alone cannot certify a projected symbolic value.
  if(available!==exact&&!canRoundDown(available,exact))return Budget.settle(record,{limit:limitText});
  // Floating Newton only chooses the batch; the debit below is checked exactly.
  let n=Math.max(1,model.seed(target));
  for(let i=0;i<16;i++){const step=(model.cost(n)-target)/model.fee(n);n=Math.max(1,n-step);if(Math.abs(step)<=Math.max(1,n*1e-15))break;}
  if(!Number.isFinite(n)||n<1)return Budget.settle(record,{limit:limitText});
  let levels=BigInt(Math.floor(n));if(cap!==null&&levels>cap)levels=cap;
  for(let i=0;levels>0n&&i<64;i++){
   const price=B.mul(model.scale,model.cost(Number(levels)));
   if(!B.isFiniteBN(price)||!B.gt(price,0))return Budget.settle(record,{limit:limitText});
   const debit=Q.decimal(String(price)),remainder=Q.subtract(available,debit);
   if(Q.compare(remainder,zero)>=0)return result(R.add(origin,String(levels)),remainder,levels);
   const back=levels/10n**15n*2n**BigInt(i);levels-=back>0n?back:1n;
  }
  return result(origin,exact,0n);
 }
 function settleG(record,limit){return highG(record)?settleGApprox(record,limit):Budget.settle(record,{limit});}
 function advanceElapsed(t,seconds,precise=own(t,'elapsedBudget')){
  if(t.batch){t.superElapsedSeconds=B.add(t.superElapsedSeconds,seconds);delete t.elapsedBudget;return;}
  if(precise||W.Core.Amount?.enabled()){const duration=typeof seconds==='object'&&!B.isDecimal(seconds)?Q.read(seconds):Q.decimal(String(seconds)),next=Q.add(t.elapsedBudget||Q.decimal(String(t.superElapsedSeconds)),duration),projected=Q.project(next);t.elapsedBudget=next;t.superElapsedSeconds=projected;}
  else t.superElapsedSeconds=B.add(t.superElapsedSeconds,seconds);
 }
 function validateBody(n){
  if(own(n.tree,'elapsedBudget')){const value=Q.read(n.tree.elapsedBudget);if(W.Core.RankExact.is(value)||Q.compare(value,Q.decimal(0))<0||!B.parseFinite(n.tree.superElapsedSeconds)||!B.eq(n.tree.superElapsedSeconds,Q.project(value)))fail('TREE elapsed/view mismatch');n.tree.elapsedBudget=value;}
  if(own(n,'gBudget')){const record=Budget.prepare(n.gBudget),view=Q.project(gRaw(record));
   // Decimal's scientific text parser can move a layer-0 value by one ULP.
   // Accept exactly the derived view or its own serialized/parsed form, then
   // restore the authoritative projection. No tolerance and no budget change.
   if(!B.parseFinite(n.superProgress)||!Array.isArray(n.superResidual)||record.mode!=='g-polynomial'||R.compare(current(record),n.gIndex)!==0||!(B.eq(n.superProgress,view)||B.eq(n.superProgress,String(view)))||n.superResidual.length)fail('G budget/rank/view mismatch');n.gBudget=record;n.superProgress=view;
  }
  if(own(n.tree,'rankBudget')){const record=Budget.prepare(n.tree.rankBudget);if(!B.parseFinite(n.tree.superProgress)||!['raw','boosted'].includes(record.mode)||R.compare(current(record),n.tree.rank)!==0||!B.eq(n.tree.superProgress,n.tree.phase==='complete'?1:Q.project(partial(record))))fail('TREE budget/rank/view mismatch');n.tree.rankBudget=record;}
  return n;
 }
 function validate(n){if(n.gBatch||n.tree.batch)return W.Meta.ClosedRankSettlement.validate(n);return W.Core.RankExact.withWork(()=>validateBody(n));}
 function rawTree(t){if(!t.rankBudget)return Budget.create({rank:t.rank,funding:String(t.superProgress)});const record=Budget.prepare(t.rankBudget);if(record.mode!=='raw')fail('raw work needs its own unit');return record;}
 // Re-anchor legacy symbolic progress in the current target unit once. This
 // changes the numeric contract; elapsedBudget remains an exact rational sum.
 function rationalTree(record){
  const E=W.Core.RankExact;if(!E.is(record.funding)&&!E.is(record.initialFraction))return record;
  const progress=partial(record),p=Q.decimal(String(B.max(0,B.mul(Q.project(progress),1-1e-15))));
  // Extremely coarse Decimal coordinates may absorb the safety multiplier.
  // Retain the certified path if downward conversion cannot be established.
  if(!canRoundDown(p,progress))return record;
  const rank=current(record);
  if(record.mode==='raw')return Budget.create({rank,funding:p});
  // Offline banking can leave more than a full target in a boosted record.
  // Such funds belong in funding, never in the strictly-subunit fraction.
  return Q.compare(p,Q.decimal(1))<0?Budget.create({rank,mode:'boosted',initialFraction:p,funding:0}):Budget.create({rank,mode:'boosted',funding:p});
 }
 function syncTree(n,result,maximum,stopAtTarget,oldRank){
  const t=n.tree;t.rank=result.rank;t.rankBudget=result.record;t.superProgress=Q.project(result.progress);n.rankBasis.tree.targetRank=W.Core.RankBasis.target(t.rank);
  if(maximum!==null&&R.compare(t.rank,maximum)>=0){t.phase='complete';t.superProgress=B.ONE;return;}
  if(stopAtTarget&&result.count!=='0'){
   if(result.record.mode==='boosted'){
    const jump=W.Core.RankMath.integerDifference(oldRank,t.rank),bank=Q.divide(result.progress,Q.power(Q.fraction(6,5),jump));
    t.rankBudget=Budget.create({rank:t.rank,funding:bank});t.superProgress=Q.project(bank);
   }
   t.phase='explicit';t.superEntryMultiplier=1;t.superElapsedSeconds=B.ZERO;delete t.elapsedBudget;
  }
 }
 function finishSingle(state,n,result,maximum,oldRank){
  syncTree(n,result,maximum,true,oldRank);
  if(result.count!=='0'&&n.tree.phase==='explicit'){
   if(W.Core.Amount?.enabled()){M().setTreeQuantity(n.tree,'sequenceWork',W.Core.Amount.from(0));if(!I().has(state,'D8'))M().setTreeQuantity(n.tree,'construction',W.Core.Amount.from(0));}
   else {n.tree.sequenceWork=B.ZERO;if(!I().has(state,'D8'))n.tree.construction=B.ZERO;}
  }
 }
 function income(state,record,seconds){
  if(seconds===0)return Q.decimal(0);const t=M().get(state).tree;
  const factors=[t.superEntryMultiplier,I().has(state,'D11-2')?M().treeEffect(state,'amplify'):B.ONE];
  if(record.mode==='boosted')factors.push(M().treeRankFactor(state,record.originRank));
  const target=W.Core.RankBasis.target(record.originRank),ratio=W.Core.RankMath.evaluatePowerRatio(factors,[M().treeRequirementFactor(state,target)]);
  if(!I().has(state,'D11-1'))return Q.multiply(Q.decimal(String(ratio)),Q.decimal(String(seconds)));
  const elapsed=Q.project(t.elapsedBudget||Q.decimal(String(t.superElapsedSeconds))),exposure=M().treeTimeExposure(elapsed,seconds,true);
  return Q.decimal(String(B.mul(ratio,exposure)));
 }
 function fundedTree(state,record,seconds){const t=M().get(state).tree,key=JSON.stringify([record,seconds,t.superEntryMultiplier,t.superElapsedSeconds,t.elapsedBudget,t.upgrades.amplify,I().has(state,'D11-1'),I().has(state,'D11-2')]);
  return W.Core.CertifiedRankMath.task('tree-funding|'+key,function*(){const earned=yield ()=>income(state,record,seconds);return yield ()=>Budget.credit(record,earned);});
 }
 function advanceTreeRaw(state,seconds,maximum,stopAtTarget=false){
  if(W.Meta.ClosedRankSettlement?.enabled(state))return W.Meta.ClosedRankSettlement.advanceTree(state,seconds,maximum,stopAtTarget,false);
  const n=M().get(state),t=n.tree,record=rationalTree(rawTree(t)),rank=t.rank;
  const funded=seconds?fundedTree(state,record,seconds):record;
  const result=Budget.settle(funded,{limit:limit(t.rank,maximum,stopAtTarget)});
  if(seconds)advanceElapsed(t,seconds,I().has(state,'D11-1')||own(t,'elapsedBudget'));
  syncTree(n,result,maximum,stopAtTarget,rank);return result;
 }
 function advanceTreeBoosted(state,seconds,maximum,stopAtTarget=false){
  if(W.Meta.ClosedRankSettlement?.enabled(state))return W.Meta.ClosedRankSettlement.advanceTree(state,seconds,maximum,stopAtTarget,I().has(state,'D11-3'));
  const n=M().get(state),t=n.tree;
  if(!t.rankBudget||t.rankBudget.mode==='raw')advanceTreeRaw(state,0,maximum,stopAtTarget);
  if(t.phase!=='super')return;
  let record=rationalTree(t.rankBudget);
  if(I().has(state,'D11-3')){
   if(record.mode==='raw'&&seconds>0)record=Budget.create({rank:t.rank,mode:'boosted',initialFraction:partial(record),funding:0});
  }else if(record.mode==='boosted')fail('boosted rule changed without a domain reset');
  const rank=t.rank,funded=seconds?fundedTree(state,record,seconds):record;
  const result=Budget.settle(funded,{limit:limit(t.rank,maximum,stopAtTarget)});
  if(seconds)advanceElapsed(t,seconds,I().has(state,'D11-1')||own(t,'elapsedBudget'));
  syncTree(n,result,maximum,stopAtTarget,rank);return result;
 }
 function advanceTreeSingle(state,seconds,maximum){
  if(W.Meta.ClosedRankSettlement?.enabled(state))return W.Meta.ClosedRankSettlement.advanceTreeSingle(state,seconds,maximum);
  const n=M().get(state),t=n.tree,record=rationalTree(rawTree(t)),rank=t.rank;
  if(['D11-1','D11-2','D11-3'].some(id=>I().has(state,id)))fail('noncontinuous boost ownership is not certified');
  const initial=Budget.settle(record,{limit:limit(rank,maximum,true)});
  let result=initial,used=Q.decimal(0);
  if(initial.count==='0'){
   const full=income(state,record,seconds),funded=Budget.credit(record,full),probe=Budget.settle(funded,{limit:limit(rank,maximum,true)});
   if(probe.count==='0'){
    if(I().has(state,'D8')){const gain=W.Core.Amount?.enabled()?M().treeConstructionQuantityGain(state,seconds):M().treeConstructionGain(state,seconds);M().addTreeQuantity(t,'construction',gain);M().addTreeQuantity(t,'totalConstruction',gain);}
    if(seconds)advanceElapsed(t,seconds,I().has(state,'D11-1')||own(t,'elapsedBudget'));
    syncTree(n,probe,maximum,false,rank);return probe;
   }
   const required=Q.subtract(Budget.cost(record,String(BigInt(record.cursor)+1n)),record.funding);
   used=Q.divide(Q.multiply(required,Q.decimal(String(seconds))),full);
   result=Budget.settle(Budget.credit(record,required),{limit:limit(rank,maximum,true)});
  }
  if(I().has(state,'D8')){const gain=W.Core.Amount?.enabled()?M().treeConstructionQuantityGain(state,used):M().treeConstructionGain(state,Q.project(used));M().addTreeQuantity(t,'construction',gain);M().addTreeQuantity(t,'totalConstruction',gain);}
  if(W.Core.Amount?.enabled())advanceElapsed(t,used,true);else t.superElapsedSeconds=B.add(t.superElapsedSeconds,Q.project(used));finishSingle(state,n,result,maximum,rank);
  if(t.phase==='explicit'){
   const remainder=Q.subtract(Q.decimal(String(seconds)),used),gain=W.Core.Amount?.enabled()?M().treeConstructionQuantityGain(state,remainder):M().treeConstructionGain(state,Q.project(remainder));
   M().addTreeQuantity(t,'construction',gain);M().addTreeQuantity(t,'totalConstruction',gain);M().addTreeQuantity(t,'sequenceWork',W.Core.Amount?.enabled()?M().treeSequenceQuantityGain(state,gain):M().treeSequenceGain(state,gain));
  }
  return result;
 }
 function bankTree(n,amount){
  if(n.gBatch||n.tree.batch)return W.Meta.ClosedRankSettlement.bankTree(n,amount);
  const t=n.tree;let record=t.rankBudget&&rationalTree(t.rankBudget);
  if(record?.mode==='boosted')record=Budget.create({rank:t.rank,funding:partial(record)});
  record=record||rawTree(t);
  // Frozen rates are published in the current target unit; the stored raw
  // budget retains its original target unit across every paid rank.
  const input=W.Core.Amount?.isAmount(amount)?W.Core.AmountLedger.toQ(W.Core.Amount.words(amount)):Q.decimal(String(amount));
  const earned=Q.multiply(input,Budget.requirementScale(record,record.cursor));
  t.rankBudget=Budget.credit(record,earned);t.superProgress=Q.project(partial(t.rankBudget));
 }
 function resetTree(t,discard=false){if(t.batch)return W.Meta.ClosedRankSettlement.resetTree(t,discard);delete t.elapsedBudget;if(discard){delete t.rankBudget;return;}if(t.rankBudget){let p=partial(t.rankBudget);if(t.rankBudget.mode==='boosted')t.rankBudget=Budget.create({rank:t.rank,funding:p});t.superProgress=Q.project(p);}}
 function sameRules(record,spec){return record.mode==='g-polynomial'&&record.gRules.d6===spec.d6&&R.compare(record.gRules.treeDelta,spec.treeDelta)===0&&(record.gRules.challenge??null)===spec.challenge&&(record.gRules.reward??false)===spec.reward;}
 function writeG(n,result){n.gIndex=result.rank;n.gBudget=result.record;const raw=result.record.gRules.pricing==='base'?Q.multiply(result.remainder,Q.decimal(M().milestoneMultiplier(result.rank))):result.remainder;n.superProgress=Q.project(raw);n.superResidual=[];}
 function prepareGInput(n,seconds,q,state,options,maximum){
  if(R.compare(n.gIndex,0)===0)return null;
  const old=n.gIndex,stored=n.gBudget;
  if(seconds===0&&(stored?Q.compare(Budget.available(stored),Q.decimal(0))===0:B.eq(n.superProgress,0)&&!n.superResidual.length))return null;
  const desired=options.fixedSources&&!M().gModifiersActive(state)?'raw':'base',spec=rules(state,desired);
  
  let record=stored&&Budget.prepare(stored);
  if(!record)record=Budget.create({rank:n.gIndex,funding:Q.read({terms:[String(n.superProgress),...n.superResidual],denominator:'1'}),...spec,pricing:'raw'});
  else if(!sameRules(record,spec))record=Budget.create({rank:n.gIndex,funding:gRaw(record),...spec,pricing:'raw'});
  // Online money is measured in base-speed units before paying any target.
  // Crossing a milestone then changes its displayed raw-point multiplier.
  if(record.gRules.pricing!==desired){
   const raw=gRaw(record),funding=desired==='base'?Q.divide(raw,Q.decimal(M().milestoneMultiplier(current(record)))):raw;
   record=Budget.create({rank:current(record),funding,...spec});
  }
  if(seconds>0){
   const qRate=I().fractalGainMultiplier(state,4),speed=I().gSpeedMultiplier(state);
   if(W.Core.Amount?.enabled()){
    const A=W.Core.Amount,time=A.from(seconds),exposure=options.fixedSources?A.multiply(A.scale(time,M().BASE_SUPER_SPEED),M().fractalMultiplier(q,n.beyondFractal)):B.eq(qRate,1)?M().exposureQuantity(q,time,n.beyondFractal):A.divide(M().exposureQuantity(q,A.multiply(time,qRate),n.beyondFractal),qRate);
    let earned=A.multiply(exposure,speed);if(record.gRules.pricing==='raw')earned=A.multiply(earned,M().milestoneMultiplier(current(record)));
    record=Budget.credit(record,W.Core.AmountLedger.toQ(A.words(earned)));
   }else {
    const exposure=options.fixedSources?B.mul(seconds,B.mul(M().BASE_SUPER_SPEED,M().fractalMultiplier(q,n.beyondFractal))):B.eq(qRate,1)?M().exposure(q,seconds,n.beyondFractal):B.div(M().exposure(q,B.mul(seconds,qRate),n.beyondFractal),qRate);
    let earned=B.mul(exposure,speed);if(record.gRules.pricing==='raw')earned=B.mul(earned,M().milestoneMultiplier(current(record)));
    record=Budget.credit(record,Q.decimal(String(earned)));
   }
  }
  return {record,limit:gLimit(current(record),maximum),old};
 }
 function advanceG(n,seconds,q,state,options={},maximum=M().maximumG(state)){
  if(W.Meta.ClosedRankSettlement?.enabled(state))return W.Meta.ClosedRankSettlement.advanceG(n,seconds,q,state,options,maximum);
  const desired=options.fixedSources&&!M().gModifiersActive(state)?'raw':'base',key=JSON.stringify([n.gIndex,n.gBudget,n.superProgress,n.superResidual,n.beyondFractal,seconds,W.Core.Amount?.isAmount(q)?W.Core.Amount.serialize(q):String(q),options.fixedSources===true,maximum,rules(state,desired),String(I().fractalGainMultiplier(state,4)),String(I().gSpeedMultiplier(state))]);
  const value=W.Core.CertifiedRankMath.task('advance-g|'+key,function*(){
    const input=yield ()=>prepareGInput(n,seconds,q,state,options,maximum);if(!input)return null;
    const result=yield ()=>settleG(input.record,input.limit);
    return yield ()=>{const copy={...n};writeG(copy,result);return {gIndex:copy.gIndex,gBudget:copy.gBudget,superProgress:copy.superProgress,superResidual:copy.superResidual,crossings:M().MILESTONES.filter(g=>R.compare(g,input.old)>0&&R.compare(g,copy.gIndex)<=0).length};};
  });
  if(!value)return 0;const {crossings,...fields}=value;Object.assign(n,fields);return crossings;
 }
 function prepareFrozenGInput(n,seconds,profile){
  if(!profile.active)return null;const A=W.Core.Amount,whole=A?.enabled(),amount=whole?A.scale(profile.quantityRate,seconds):B.mul(profile.rate,seconds);
  if((whole?A.compare(amount,0)===0:B.eq(amount,0))&&!n.gBudget&&B.eq(n.superProgress,0)&&!n.superResidual.length)return null;
  const spec=rules(profile.requirementState,'raw');
  let record=n.gBudget&&Budget.prepare(n.gBudget);
  if(!record)record=Budget.create({rank:n.gIndex,funding:Q.read({terms:[String(n.superProgress),...n.superResidual],denominator:'1'}),...spec});
  else if(record.gRules.pricing!=='raw'||!sameRules(record,spec))record=Budget.create({rank:n.gIndex,funding:gRaw(record),...spec});
  record=Budget.credit(record,whole?W.Core.AmountLedger.toQ(A.words(amount)):Q.decimal(String(amount)));return {record,limit:gLimit(n.gIndex,profile.maximum)};
 }
 function frozenG(n,seconds,profile){
  if(n.gBatch||W.Meta.ClosedRankSettlement?.enabled(profile.requirementState))return W.Meta.ClosedRankSettlement.frozenG(n,seconds,profile);
  if(!profile.active)return;
  const key=JSON.stringify([n.gIndex,n.gBudget,n.superProgress,n.superResidual,seconds,profile.quantityRate??String(profile.rate),profile.maximum,rules(profile.requirementState,'raw')]);
  const value=W.Core.CertifiedRankMath.task('frozen-g|'+key,function*(){const input=yield ()=>prepareFrozenGInput(n,seconds,profile);if(!input)return null;
   const result=yield ()=>settleG(input.record,input.limit);return yield ()=>{const copy={...n};writeG(copy,result);return {gIndex:copy.gIndex,gBudget:copy.gBudget,superProgress:copy.superProgress,superResidual:copy.superResidual};};
  });if(value)Object.assign(n,value);
 }
 function prepared(state,kind,result){const copy=W.Core.State.cloneForSimulation(state),n=copy.meta.bigNumbers;detach(n);
  if(kind==='tree-raw'){if(!I().has(copy,'D10'))finishSingle(copy,n,result,M().maximumTree(copy),n.tree.rank);else syncTree(n,result,M().maximumTree(copy),!copy.treeSuperAutomationEnabled,n.tree.rank);}
  else {n.gIndex=result.rank;n.gBudget=result.record;n.superProgress=Q.project(gRaw(result.record));n.superResidual=[];}
  return {state:copy,result};
 }
 function workRecord(state,{kind,funding,limit:requested=null}={}){
  const n=state.meta.bigNumbers;validate({...n,tree:{...n.tree}});let record,playLimit;
  if(!M().isUnlocked(state))fail('rank domain is locked');
  if(kind==='tree-raw'){
   if(n.tree.phase!=='super'||!M().treeUnlocked(state))fail('TREE work is not active');
   record=n.tree.rankBudget?.mode==='boosted'?Budget.create({rank:n.tree.rank,funding:partial(n.tree.rankBudget)}):rawTree(n.tree);
   playLimit=limit(n.tree.rank,M().maximumTree(state),!I().has(state,'D10')||!state.treeSuperAutomationEnabled);
  }else if(kind==='g-raw'){
   if(n.fractalLevel!==5||R.compare(n.gIndex,0)<=0)fail('G work is not active');
   record=n.gBudget?Budget.create({rank:n.gIndex,funding:gRaw(n.gBudget),...rules(state,'raw')}):Budget.create({rank:n.gIndex,funding:Q.read({terms:[String(n.superProgress),...n.superResidual],denominator:'1'}),...rules(state,'raw')});
   playLimit=gLimit(n.gIndex,M().maximumG(state));
  }else fail('unknown rank settlement operation');
  const bounded=requested===null?playLimit:playLimit===null?requested:R.compare(requested,playLimit)<0?requested:playLimit;
  return {kind,record:funding===undefined?record:Budget.credit(record,funding),limit:bounded};
 }
 function prepare(state,operation){if(W.Meta.ClosedRankSettlement?.enabled(state))return W.Meta.ClosedRankSettlement.prepare(state,operation);const a=workRecord(state,operation);return prepared(state,a.kind,Budget.settle(a.record,{limit:a.limit}));}
 function prepareWork(state,operation,{isCurrent=()=>true}={}){
  if(W.Meta.ClosedRankSettlement?.enabled(state))return W.Meta.ClosedRankSettlement.prepareWork(state,operation,{isCurrent});
  const key=JSON.stringify(W.Core.State.toSerializable(state)),work=W.Core.RankExact.createWork(()=>W.Core.CertifiedRankMath.task('meta-operation|'+key+'|'+JSON.stringify(operation),function*(){const a=yield ()=>workRecord(state,operation),result=yield ()=>Budget.settle(a.record,{limit:a.limit});return yield ()=>prepared(state,a.kind,result);}),{isCurrent:()=>isCurrent()&&JSON.stringify(W.Core.State.toSerializable(state))===key});
  return Object.freeze({advance({maximumQueries=8,maximumOperations=maximumQueries*128,deadline=Infinity}={}){return work.advance({maximumOperations,deadline});},cancel:()=>work.cancel(),result:()=>work.result()});
 }
 W.Meta.RankSettlement=Object.freeze({normalizedGModel:gModel,powerSumRatio,powerSumRatioSlope,enabled,detach,detachSteps,validate,advanceElapsed,prepare,prepareWork,rules,advanceG,frozenG,advanceTreeRaw,advanceTreeBoosted,advanceTreeSingle,bankTree,resetTree});
}(window.WIS));
