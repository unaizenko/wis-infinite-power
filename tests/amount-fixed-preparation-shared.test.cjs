'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{setup75}=require('./amount-fixture.cjs');
const wire=(W,s)=>JSON.stringify(W.Core.State.toSerializable(s));
function setup(model=76,options={}) {
 const {W,context}=setup75({targetSchema:model,...options}),host=W.Simulation.OfflineHeadless.create({domain:W.Core.State.fresh()},{checkpoint(){},yield:()=>Promise.resolve()});
 return {W,context,host,s:host.getState()};
}
function finish(work,deadline=Infinity) {let slices=0;while(!work.advance(deadline).done)assert(++slices<20000,'preparation did not finish');return work.result();}
for(const model of [74,75])for(const flag of ['evolutionPlan','mapPlan','compiledResources'])test(`model ${model} rejects ${flag} before either preparation path touches state`,()=>{
 const {W,s}=setup(model),F=W.Simulation.FixedSegment,before=wire(W,s),phases=[],options={[flag]:{},onPhase:p=>phases.push(p)};
 let rejected;try{F.prepare(s,.1,options);}catch(error){rejected=error;}
 assert(rejected,'synchronous preparation accepted a retired plan');assert.deepEqual(phases,[]);assert.equal(wire(W,s),before);
 const work=F.prepareWork(s,.1,options);try{assert.throws(()=>finish(work),e=>e.code===rejected.code&&e.message===rejected.message);}finally{work.cancel();}
 assert.deepEqual(phases,[],'cooperative rejection ran preparation phases');assert.equal(wire(W,s),before);
});
for(const model of [75,76])for(const frozen of [false,true])test(`model ${model} ${frozen?'frozen':'online'} preparation preserves phases, full committed state and runtime scope`,()=>{
 const {W,s}=setup(model),S=W.Core.State,F=W.Simulation.FixedSegment,R=W.Core.Runtime,B=W.Core.BigNum;
 s.unlockedAchievements.googol=true;s.meta.bigNumbers.unlocked=true;s.power=B.BN(2);s.meta.bigNumbers.elapsedSeconds=.95;
 W.Meta.TreasureProgress.ensure(s);if(!frozen)W.Cultivation.ExplorationProgress.settleRetained(s);
 const a=S.cloneForSimulation(s),b=S.cloneForSimulation(s),before=wire(W,s),left=[],right=[],options={offline:frozen,frozenOffline:frozen};
 const expected=F.prepare(a,.2,{...options,onPhase:p=>left.push(p)}),work=F.prepareWork(b,.2,{...options,onPhase:p=>right.push(p)}),actual=finish(work);
 assert.deepEqual(left,['retained-progress','snapshot','rates','gains']);assert.deepEqual(right,left);
 assert.equal(JSON.stringify(actual.plan),JSON.stringify(expected.plan));assert.equal(JSON.stringify(actual.cultivation),JSON.stringify(expected.cultivation));assert.equal(JSON.stringify(actual.bigNumbers),JSON.stringify(expected.bigNumbers));
 R.withState(a,()=>F.commit(a,expected));R.withState(b,()=>F.commit(b,actual));assert.equal(wire(W,b),wire(W,a));assert.equal(wire(W,s),before);assert.equal(R.getState(),s);
 work.cancel();assert.equal(work.result(),null);assert.throws(()=>work.advance(),/closed/);
});

test('a suspended source child retains earlier preparation stages and restores the outside runtime',()=>{
 const {W,s}=setup(),F=W.Simulation.FixedSegment,C=W.Core.CertifiedRankMath,R=W.Core.Runtime,S=W.Core.State,original=W.Simulation.FixedSources;
 W.Meta.TreasureProgress.ensure(s);W.Cultivation.ExplorationProgress.settleRetained(s);
 const expected=F.prepare(S.cloneForSimulation(s),.1),before=wire(W,s),phases=[];let completed=0;
 W.Simulation.FixedSources={...original,query(...args){C.task('preparation-source-pause',function*(){for(let i=0;i<8;i++)yield;return null;});const result=original.query(...args);completed++;return result;}};
 const work=F.prepareWork(S.cloneForSimulation(s),.1,{onPhase:p=>phases.push(p)});let slices=0;
 while(!work.advance(-Infinity).done){assert.equal(R.getState(),s);assert.equal(wire(W,s),before);assert(++slices<20000);}
 const actual=work.result();assert(slices>8);assert.equal(completed,1);assert.equal(phases.filter(p=>p==='retained-progress').length,1);assert.equal(phases.filter(p=>p==='snapshot').length,1);
 assert.equal(JSON.stringify(actual.plan),JSON.stringify(expected.plan));assert.equal(JSON.stringify(actual.cultivation),JSON.stringify(expected.cultivation));work.cancel();
});

test('failed preparation releases frozen source owners and a fresh work can retry',()=>{
 const scopes=[];const {W,context,s}=setup(75,{transformSource(file,source){return file==='js/simulation/fixed-segment.js'?`(()=>{const E=WIS.Core.Effects;WIS.Core.Effects={...E,createFrozenScope(...args){const scope=E.createFrozenScope(...args);self.preparationScopes.push(scope);return scope;}};})();`+source:source;}});context.preparationScopes=scopes;
 const F=W.Simulation.FixedSegment,S=W.Core.State,R=W.Core.Runtime,original=W.Simulation.FixedSources,before=wire(W,s);let fail=true;
 W.Simulation.FixedSources={...original,query(...args){if(fail)throw Error('preparation source failure');return original.query(...args);}};
 for(const cooperative of [false,true]){const candidate=S.cloneForSimulation(s);let work;assert.throws(()=>{if(cooperative){work=F.prepareWork(candidate,.1);finish(work);}else F.prepare(candidate,.1);},/preparation source failure/);assert.equal(R.getState(),s);assert.equal(wire(W,s),before);if(work){assert.equal(work.result(),null);assert.throws(()=>work.advance(),/closed/);}}
 assert(scopes.length>0);for(const scope of scopes)assert.throws(()=>scope.run(()=>0),e=>e.code==='effect-scope-stale');
 fail=false;const work=F.prepareWork(S.cloneForSimulation(s),.1);assert(finish(work));work.cancel();assert.equal(R.getState(),s);assert.equal(wire(W,s),before);
});

test('interleaved preparation owners remain isolated and cancellation invalidates a suspended child',()=>{
 const {W,s}=setup(),F=W.Simulation.FixedSegment,C=W.Core.CertifiedRankMath,S=W.Core.State,R=W.Core.Runtime,original=W.Simulation.FixedSources;
 const a=S.cloneForSimulation(s),b=S.cloneForSimulation(s);a.power=W.Core.BigNum.BN(2);b.power=W.Core.BigNum.BN(7);
 const expected=F.prepare(S.cloneForSimulation(b),.1),before=wire(W,s);let started=0;
 W.Simulation.FixedSources={...original,query(...args){C.task('interleaved-source-pause',function*(){started++;for(let i=0;i<8;i++)yield;return null;});return original.query(...args);}};
 const x=F.prepareWork(a,.1),y=F.prepareWork(b,.1);for(let i=0;i<5;i++){assert.equal(x.advance(-Infinity).done,false);assert.equal(y.advance(-Infinity).done,false);assert.equal(R.getState(),s);}
 x.cancel();assert.equal(x.result(),null);assert.throws(()=>x.advance(),/closed/);const result=finish(y,-Infinity);assert.equal(JSON.stringify(result.plan),JSON.stringify(expected.plan));assert.equal(String(result.snapshot.power),'7');assert.equal(started,2);assert.equal(wire(W,s),before);y.cancel();
});

test('Step still rejects an invalidated candidate after preparation yields and never commits its income',()=>{
 const {W,s,host}=setup(),before=wire(W,s),work=host.step.prepareOnlineWork(.1,{source:'online',clockRatio:1});
 assert.equal(work.advance(-Infinity).done,false);assert.equal(wire(W,s),before);s.core.resources.power=W.Core.BigNum.BN(123);const changed=wire(W,s);
 assert.throws(()=>work.advance(Infinity),e=>e.code==='rank-work-stale');assert.equal(wire(W,s),changed);work.close();
 const cancelled=host.step.prepareOnlineWork(.1,{source:'online',clockRatio:1});assert.equal(cancelled.advance(-Infinity).done,false);cancelled.close();assert.throws(()=>cancelled.advance(Infinity));assert.equal(wire(W,s),changed);
});


for(const model of [74,75])test(`model ${model} keeps each driver's Runtime and frozen evaluation boundaries`,()=>{
 const {W,s}=setup(model),S=W.Core.State,F=W.Simulation.FixedSegment,R=W.Core.Runtime,E=W.Core.Effects;
 for(const cooperative of [false,true]){
  const input=S.cloneForSimulation(s),seen=[],outer=E.captureEvaluationContext();let automationState,foregroundState;
  input.unlockedAchievements.googol=true;input.meta.bigNumbers.unlocked=true;
  const options={onPhase:phase=>seen.push({phase,state:R.getState(),memo:E.continuationMemo(R.getState())}),runAchievementAutomations(){automationState=R.getState();},foregroundSource(){foregroundState=R.getState();return S.cloneForSimulation(input);}};
  let unit;if(cooperative){const work=F.prepareWork(input,.1,options);let slices=0;while(!work.advance(-Infinity).done){assert.equal(R.getState(),s);assert(E.matchesEvaluationContext(outer),'frozen evaluation leaked between slices');assert(++slices<20000);}unit=work.result();work.cancel();}else unit=F.prepare(input,.1,options);
  const retained=seen.find(row=>row.phase==='retained-progress'),snapshot=seen.find(row=>row.phase==='snapshot'),rates=seen.find(row=>row.phase==='rates'),gains=seen.find(row=>row.phase==='gains'),quantity=cooperative&&model===75;
  assert.equal(retained.state,input);assert.equal(snapshot.state,quantity?s:input);assert.equal(rates.state,quantity?unit.snapshot:input);assert.equal(gains.state,quantity?unit.snapshot:input);
  assert.equal(automationState,unit.snapshot);assert.equal(foregroundState,quantity?s:input);assert.equal(!!rates.memo,quantity);assert.equal(!!gains.memo,quantity);
  assert.equal(R.getState(),s);assert(E.matchesEvaluationContext(outer),'preparation changed its caller evaluation context');
 }
});

test('a throwing automation collector restores collection and the synchronous caller scope',()=>{
 const {W,s}=setup(),F=W.Simulation.FixedSegment,R=W.Core.Runtime,E=W.Core.Effects,S=W.Core.State,outer=E.captureEvaluationContext(),before=wire(W,s);
 assert.throws(()=>F.prepare(S.cloneForSimulation(s),.1,{runAchievementAutomations(){throw Error('collector failure');}}),/collector failure/);
 assert.equal(F.collectCandidates('test',[],null,1),false);assert.equal(R.getState(),s);assert(E.matchesEvaluationContext(outer));assert.equal(wire(W,s),before);
 assert(F.prepare(S.cloneForSimulation(s),.1));assert(E.matchesEvaluationContext(outer));
});
