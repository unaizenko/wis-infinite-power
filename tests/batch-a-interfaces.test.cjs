'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
process.env.AUDIT_GAME_ROOT=path.resolve(__dirname,'..');
process.env.FIXED_RESULTS=path.join(require('node:os').tmpdir(),'wis-batch-a');
const {h,WIS:W}=require('./offline-fixed-20260912-r9/load.cjs');
const B=W.Core.BigNum,S=W.Core.State,R=W.Core.Runtime,E=W.Core.Effects,Res=W.Core.Resources;
const Scale=W.Power.ScaleLogic,I=W.Cultivation.ImmortalLogic,Src=W.Core.Sources;
const eq=(a,b,label='')=>assert(B.eq(a,b),`${label}: ${a} != ${b}`);
const serial=s=>JSON.stringify(S.toSerializable(s));
const reset=()=>{h.createSimulation(S.toSerializable(S.fresh()),{treasures:true});return R.getState();};
let s=reset();
const invalid=[-1,-Infinity,NaN,Infinity,'NaN','Infinity','bad','12oops','1e','', ' ',null,undefined,true,false,{},[],()=>0,new B.Decimal(NaN),new B.Decimal(Infinity)];
for(const special of [false,true]) {
  s=reset();Res.set('power',100);Res.setSystem('immortal','mana',100);
  s.powerGainResidual=B.BN(.25);s.core.resources.powerGainResidualTail=['0.125'];
  if(special)s.cultivation.systems.immortal.xiuzhen.manaDebitResidual=['0.25'];
  const before=serial(s),revision=E.getRevision();
  for(const cost of [...invalid,101]) {
    for(const fn of [()=>Res.canAfford('power',cost),()=>Res.spend('power',cost),
      ()=>Res.canAffordSystem('immortal','mana',cost),()=>Res.spendSystem('immortal','mana',cost)]) {
      assert.equal(fn(),false,String(cost));assert.equal(serial(s),before,'failed payment mutated state');
    }
  }
  for(const cost of [0,'0',B.ZERO])for(const fn of [()=>Res.canAfford('power',cost),()=>Res.spend('power',cost),
    ()=>Res.canAffordSystem('immortal','mana',cost),()=>Res.spendSystem('immortal','mana',cost)]) {
    assert.equal(fn(),true);assert.equal(serial(s),before,'zero changed state');
  }
  for(const key of ['missing','toString','__proto__']) {
    assert.equal(Res.canAfford(key,0),false);assert.equal(Res.spend(key,0),false);
    assert.equal(Res.canAffordSystem('immortal',key,0),false);assert.equal(Res.spendSystem('immortal',key,0),false);
    assert.equal(Res.canAffordSystem(key,'mana',0),false);assert.equal(Res.spendSystem(key,'mana',0),false);
  }
  assert.equal(E.getRevision(),revision);assert.equal(serial(s),before);
  assert(Res.spend('power',25));eq(s.power,75);
  assert(Res.spendSystem('immortal','mana',25));eq(s.mana,75);
}
s=reset();
for(const [set,can,spend,get] of [
  [v=>Res.set('power',v),v=>Res.canAfford('power',v),v=>Res.spend('power',v),()=>s.power],
  [v=>Res.setSystem('immortal','mana',v),v=>Res.canAffordSystem('immortal','mana',v),v=>Res.spendSystem('immortal','mana',v),()=>s.mana]]) {
  set('2e10000');assert(can('1e10000'));assert(spend('1e10000'));eq(get(),'1e10000');
}
Res.set('power',100);
for(const terms of [[20,-5],['20','-5*2'],['@sum:2:202:-5']]) {
  assert(Res.canAffordTerms('power',terms));const cost=W.Meta.TreasureLedger.value(terms),before=s.power;
  assert(Res.spendTerms('power',terms));eq(s.power,B.sub(before,cost));
}
const beforeTerms=serial(s);
for(const terms of [[10,-10],[],['@sum:1:12:-1']]) {assert(Res.spendTerms('power',terms));assert.equal(serial(s),beforeTerms);}
for(const terms of [...invalid.map(v=>[v]),null,{},'5',[1,-2],[1000],['bad','-bad'],['@sum:3:bad'],['@sum:99:2'],['1*0']]) {
  assert.equal(Res.canAffordTerms('power',terms),false);assert.equal(Res.spendTerms('power',terms),false);assert.equal(serial(s),beforeTerms);
}
assert.equal(Res.spendTerms('missing',[]),false);
// Batch C requires explicit registration; retain the Batch A isolation assertions.
W.Core.Registries.resources.register(Res.storedDefinition({id:'cultivation.martial.mana',owner:'martial',shortName:'mana',kind:'cultivation',container:state=>state.cultivation.systems.martial?.resources}));
s.cultivation.systems.martial={resources:{mana:B.BN(3),manaGainResidual:B.BN(.1),manaGainResidualTail:['.01']}};
const im=s.cultivation.systems.immortal;
im.resources.manaGainResidual=B.BN(.5);im.xiuzhen.manaDebitResidual=['.25'];
const immortalBefore=JSON.stringify(im);Res.setSystem('martial','mana',20);Res.addSystem('martial','mana',2);
assert(Res.spendSystem('martial','mana',3));eq(Res.getSystem('martial','mana'),19);assert.equal(JSON.stringify(im),immortalBefore);
const martialBefore=JSON.stringify(s.cultivation.systems.martial);Res.setSystem('immortal','mana',10);
assert.deepEqual(im.xiuzhen.manaDebitResidual,[]);assert.equal(JSON.stringify(s.cultivation.systems.martial),martialBefore);
console.log('PASS costs: invalid/zero/insufficient/huge/signed terms/unknown IDs; state, residuals, statistics, RNG unchanged; mana isolation');

s=reset();s.cultivation.active='immortal';s.qiRefiningUnlocked=true;s.magicTreasureUnlocked=true;s.mana=B.BN('1e12');s.runningLevel=3;
const A=S.cloneForSimulation(s),C=S.cloneForSimulation(s);A.mana=B.BN('1e30');A.runningLevel=12;C.mana=B.BN('1e50');C.runningLevel=35;
let providerCalls=0,functionCalls=0,atCalls=0;
Src.register('batchA',(current,context)=>{
  if(context.throwProvider)throw Error('provider failed');
  providerCalls++;
  return [
    {id:'static',target:'batchA',value:'7'},
    {id:'function',target:'batchA',value:(state,ctx)=>{functionCalls++;return B.add(state.mana,ctx.add||0);}},
    {id:'at',target:'batchA',value:()=>{throw Error('valueAt takes precedence');},valueAt:(state)=>{atCalls++;return state.mana;}},
    {id:'runtime',target:'batchA',value:()=>R.state.mana},
    {id:'domain',target:'batchA',value:()=>I.manaJBonus()},
    {id:'scale',target:'batchA',value:()=>Scale.fitnessJBonus()},
    {id:'testFailure',target:'batchFailure',value:()=>{if(context.rng)return R.random();if(context.pay)return Res.spend('power',0);if(context.fail)throw Error('formula failed');return context.bad;}}
  ];
});
const liveBefore=serial(s),aBefore=serial(A),cBefore=serial(C);
function rows(state,context={}) {return Object.fromEntries(Src.collect('batchA',state,context).map(r=>[r.id,r]));}
const live=rows(s),a=rows(A),c=rows(C);eq(a.function.value,A.mana);eq(c.runtime.value,C.mana);
assert(!B.eq(a.domain.value,live.domain.value));assert(!B.eq(c.scale.value,a.scale.value));
providerCalls=functionCalls=atCalls=0;const values=Src.values('batchA',A,{add:10});
assert.equal(providerCalls,1);assert.equal(functionCalls,1);assert.equal(atCalls,1);eq(values[0],7);
eq(a.function.valueAt(C),C.mana);eq(a.domain.valueAt(C),c.domain.value);
const outer=()=>{
  const first=rows(A);eq(first.scale.value,a.scale.value);eq(R.state.mana,A.mana);
  Scale.withScaleState(C,()=>I.withImmortalState(C,()=>{
    const again=rows(A);eq(again.scale.value,a.scale.value);eq(again.domain.value,a.domain.value);
    eq(I.manaJBonus(),c.domain.value);
  }));
  R.withEvaluationState(C,()=>{eq(rows(C).domain.value,c.domain.value);eq(Scale.fitnessJBonus(),c.scale.value);});
  eq(R.state.mana,A.mana);eq(rows(A).scale.value,a.scale.value);
  assert.throws(()=>Src.collect('batchA',C,{throwProvider:true}),/provider failed/);
  eq(R.state.mana,A.mana);eq(I.manaJBonus(),a.domain.value);
  assert.throws(()=>Src.collect('batchFailure',C,{fail:true}),/formula failed/);
  eq(R.state.mana,A.mana);eq(Scale.fitnessJBonus(),a.scale.value);
};
Scale.withScaleState(A,()=>I.withImmortalState(A,()=>R.withEvaluationState(A,outer)));
eq(Scale.fitnessJBonus(),live.scale.value);eq(I.manaJBonus(),live.domain.value);assert.equal(R.getState(),s);
for(const bad of invalid)assert.throws(()=>Src.collect('batchFailure',C,{bad}),{code:'formula-representation'});
assert.throws(()=>Src.collect('batchFailure',C,{rng:true}),/禁止/);
assert.throws(()=>Src.collect('batchFailure',C,{pay:true}),/禁止/);
for(const mutation of [()=>{R.state.mana=B.ZERO;},()=>Scale.buyUpgrade('focus'),()=>I.buyAbility('magicTreasure'),
  ()=>W.Meta.Treasures.add(C,'cosmicFiber'),()=>W.Cultivation.Xiuzhen.spendMana(C,0)])
  assert.throws(()=>R.withEvaluationState(C,mutation),/禁止/);
const changingCoordinateBefore=serial(A);
for(const method of ['automaticJRawPerSecondAt','automaticJSettledPerSecondAt','automaticPowerRawPerSecondAt','automaticPowerSettledPerSecondAt']) {
  // Private coordinate candidates restore the entire explicit state too.
  if(typeof Scale[method]==='function')R.withEvaluationState(A,()=>Scale[method](B.BN(2)));
}
assert.equal(serial(A),changingCoordinateBefore);
assert.throws(()=>R.withEvaluationState(C,async()=>0),/await/);
assert.throws(()=>R.withEvaluationState(C,()=>Promise.resolve()),/Promise/);
E.withFrozenState(A,()=>{const first=E.product('joules','regionMultiplier',A);
  R.withEvaluationState(C,()=>E.product('joules','regionMultiplier',C));eq(E.product('joules','regionMultiplier',A),first);});
const mortal=S.cloneForSimulation(A);mortal.activeChallenge='mortalTransformation';
const masked=R.withState(mortal,()=>I.withImmortalState(R.state,()=>I.manaJBonus()));
eq(rows(mortal).domain.value,masked);
const groups=W.Simulation.ResourceGroups;
const groupA=groups.evaluate(A).rates,groupC=groups.evaluate(C).rates,groupA2=groups.evaluate(A).rates;
eq(groupA.joules,groupA2.joules);assert(!B.eq(groupA.joules,groupC.joules));
assert.equal(serial(s),liveBefore);assert.equal(serial(A),aBefore);assert.equal(serial(C),cBefore);
// Static dynamic descriptors refresh their provider only on later valueAt calls.
let refreshCalls=0;
Src.register('batchRefresh',current=>{refreshCalls++;return [{id:'refresh',target:'batchRefresh',dynamicResources:['mana'],value:current.mana}];});
const refresh=Src.collect('batchRefresh',A)[0];assert.equal(refreshCalls,1);eq(refresh.value,A.mana);
eq(refresh.valueAt(C),C.mana);assert.equal(refreshCalls,2);eq(Src.values('batchRefresh',s)[0],s.mana);assert.equal(refreshCalls,3);
Src.register('batchAsync',(_s,ctx)=>ctx.asyncTest?[{id:'async',target:'batchAsync',value:async()=>1}]:[]);
assert.throws(()=>Src.collect('batchAsync',A,{asyncTest:true}),/await/);
console.log('PASS Source: static/function/valueAt once, candidate scope, nested restoration and exceptions, challenge masking, caches, group reuse, no RNG/payment');

// Load complete production UI modules with inert DOM, not copied function bodies.
const oldDocument=global.document;
global.document={querySelectorAll:()=>[],getElementById:()=>null};
for(const file of ['cards.js','treasures.js','app.js'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/ui',file),'utf8'),{filename:file});
global.document=oldDocument;
const F=W.UI.Format.scientificMultiplier,T=W.UI.Treasures,UI=W.UI.App;
for(const [n,text] of [[0,'0'],[1,'1'],['1e8','1e8'],['3.162277e5','3.162e5'],['1.2300e8','1.23e8'],['9.9996e8','1e9'],['1e-8','1e-8'],['ee100','ee100']])assert.equal(F(B.BN(n)),text);
for(const v of invalid)assert.equal(F(v),'—');
const huge=B.BN('ee100');huge.toNumber=()=>{throw Error('whole Decimal converted to Number');};assert.equal(F(huge),'ee100');
assert.equal(W.UI.Format.number('1e8'),'100M');
s=reset();s.joules=B.BN('1e40');s.power=B.BN('1e30');s.rockLevel=5000;s.runningLevel=20;s.focusPurchased=true;
s.challengeCompletions.galaxy=2;s.challengeCompletions.planetSuppression=3;
const flags={planetWill:'planetWillPurchased',starShatter:'starShatterPurchased',stellarTreasureSeeking:'stellarTreasureSeekingPurchased',starSpirit:'starSpiritPurchased',supernaturalFire:'supernaturalFirePurchased'};
const actual={planetWill:()=>Scale.planetWillElementalizationMultiplier(),starShatter:()=>Scale.starShatterRockMultiplier(),
  supernaturalFire:()=>Scale.supernaturalFirePowerMultiplier()};
for(const challenge of [null,'galaxy','mortalTransformation','solarPower'])for(const purchased of [false,true]) {
  s.activeChallenge=challenge;for(const flag of Object.values(flags))s[flag]=purchased;E.invalidate();
  const before=serial(s),rev=E.getRevision();
  for(const [id,flag] of Object.entries(flags)) {
    const result=Scale.upgradePreview(id,s),copy=S.cloneForSimulation(s);copy[flag]=true;
    const expected=R.withEvaluationState(copy,()=>id==='starSpirit'?B.pow(1.06,Scale.completedChallengeLayers()):id==='stellarTreasureSeeking'?B.BN(1.5):actual[id]());
    eq(result.value,expected,id);assert.equal(result.purchased,purchased);
    const text=UI.scaleUpgradePreviewText(id,s,W.UI.Format.number);
    assert(text.startsWith(purchased?'当前：':'解锁后：'));
    if(id==='planetWill')assert.match(text,/元素化来源 ×(?:1e8|1|[\d.]+e\d+)$/);
    if(id==='stellarTreasureSeeking')assert.equal(text,(purchased?'当前：':'解锁后：')+'宝物进度获取 ×1.5');
    if(id==='starSpirit')assert.equal(text,(purchased?'当前：':'解锁后：')+'宝物进度获取 ×'+W.UI.Format.number(expected,3)+'（共 5 层，每层 ×1.06）');
    if(!purchased&&actual[id])eq(R.withEvaluationState(s,actual[id]),1,'locked actual stays neutral');
  }
  assert.equal(serial(s),before,'preview charges resource or writes state');assert.equal(E.getRevision(),rev);
}
s.activeChallenge=null;for(const flag of Object.values(flags))s[flag]=false;E.invalidate();
assert(B.gt(Scale.upgradePreview('planetWill',s).value,1));assert(B.gt(Scale.upgradePreview('starShatter',s).value,1));
assert(B.gt(Scale.upgradePreview('supernaturalFire',s).value,1));
s.activeChallenge='galaxy';eq(Scale.upgradePreview('planetWill',s).value,1,'galaxy suppresses J-dependent multiplier');
s.activeChallenge=null;s.stellarTreasureSeekingPurchased=true;s.starSpiritPurchased=true;
eq(Scale.upgradePreview('stellarTreasureSeeking',s).value,1.5);
eq(Scale.upgradePreview('starSpirit',s).value,B.pow(1.06,5));
const base={remainderCertainty:'exact',pendingInputs:0,progress:B.BN(50),demand:B.BN(100),remainingPositive:true,rate:B.ONE,displayRemainingSeconds:50,displayEtaMode:'exact',award:1};
assert.match(T.acquisition('cosmicFiber',base,String),/下次获得：50\.0%$/);
assert.match(T.acquisition('cosmicFiber',{...base,award:2},String),/下次获得：50\.0%$/);
for(const bad of [undefined,null,'bad',0,1.5])assert.match(T.acquisition('cosmicFiber',{...base,award:bad},String),/下次获得：50\.0%$/);
for(const patch of [{remainderCertainty:'known-lower-bound'},{pendingInputs:1,award:2},{demand:0},{demand:Infinity},{demand:'100oops'},{demand:null},{progress:undefined},{progress:101}]) {
  const info={...base,...patch};assert.equal(T.percentage(info),null);assert(!T.acquisition('cosmicFiber',info,String).includes('下次获得：'));
}
const P=W.Meta.TreasureProgress,L=W.Meta.TreasureLedger;s=reset();s.highestScaleIndex=17;s.unlockedAchievements.scale13=true;P.ensure(s);
L.write(s,'cosmicFiber',[B.div(P.requirement('cosmicFiber',0),2)]);
const view=()=>R.withEvaluationState(s,()=>P.view(s,'cosmicFiber'));
assert.match(T.acquisition('cosmicFiber',view(),String),/下次获得：50\.0%$/);
s.stellarSeaGiftPurchased=true;assert.match(T.acquisition('cosmicFiber',view(),String),/下次获得：50\.0%$/);
s.meta.treasureProgressPending.cosmicFiber=[{units:['1'],gain:'1',award:'1'}];
const pendingBefore=serial(s);assert(!T.acquisition('cosmicFiber',view(),String).includes('下次获得：'));assert.equal(serial(s),pendingBefore);
console.log('PASS UI: five upgrade previews and purchased displays, challenge rules, individual multipliers, no precharge; scientific rounding/ee; treasure single/multiple/uncertain/pending');
