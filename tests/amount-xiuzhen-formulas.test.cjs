 'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{setupAmount}=require('./amount-fixture.cjs');
function setup(){const {W}=setupAmount({model:75}),A=W.Core.Amount,host=W.Simulation.OfflineHeadless.create({domain:W.Core.State.fresh()},{checkpoint(){},yield:()=>Promise.resolve()}),s=host.getState(),X=W.Cultivation.Xiuzhen,n=X.get(s);s.cultivation.active='immortal';Object.assign(n,{entered:true,realm:16,highestRealm:16});for(const a of X.abilities)n.abilities[a.key]=true;s.meta.highMultiverse={...W.Meta.HighMultiverse.fresh(),order:'3',owner:'immortal'};s.meta.infinity.upgrades.C6=true;s.meta.infinity.points=W.Core.BigNum.BN('1e100');const values={immortalPower:17,xianForce:23,yuanForce:29,nieForce:31,universeCoefficient:37,multiverseCoefficient:41,highMultiverseCoefficient:43};for(const [key,tail] of Object.entries(values))W.Core.Resources.replaceExact(key==='highMultiverseCoefficient'?'meta.multiverse.'+key:'cultivation.immortal.'+key,A.fromParts('1e100',[tail]),s);return {W,A,s,X,values};}
test('Xiuzhen abilities, production and stock decay receive complete owner quantities',()=>{const {W,A,s,X,values}=setup(),F=W.Core.AmountFormulas,seen=[];W.Core.AmountFormulas={...F,...Object.fromEntries(['power','powerRatio','powerOnePlusRatio','logOnePlusRatio'].map(key=>[key,(v,...args)=>{if(A.isAmount(v)){seen.push(v);if(key==='powerRatio'&&A.compare(v,args[0])>=0)seen.push(A.subtract(v,args[0]));}return F[key](v,...args);}]))};for(const key of ['body','materialSpirit','crystal','worldAura','rules','divineArt','innerWorld','spokenLaw','mergeHeaven','followLaw','zunYang','eternalMultiverse','daoWuYa'])X.abilityMultiplier(s,key);X.rates(s);W.Meta.HighMultiverse.rate(s);for(const [key,tail]of Object.entries(values))assert(seen.some(v=>A.compare(v,A.fromParts('1e100',[tail]))===0),key+' did not enter a full-input formula');});
test('Xiuzhen plans retain exact fractional gains after confirmed nonlinear rates',()=>{const {W,A,s,X}=setup(),rates=X.rates(s),plan=X.plan(s,.1);assert(plan.quantities);for(const key of X.resourceKeys)assert.equal(A.compare(plan.quantities[key],A.scale(rates[key],.1)),0,key);});
test('Xiuzhen retained resource peaks survive lower reset profiles with tails', () => {
  const {W} = setupAmount({model:75});
  const A = W.Core.Amount, X = W.Cultivation.Xiuzhen, s = W.Core.State.fresh();
  const expected = new Map();
  for (const [index, key] of X.resourceKeys.entries()) {
    const id = (W.Meta.UniverseCoefficients.shared(key) ? 'meta.universe.' : 'cultivation.immortal.') + key;
    const peak = A.fromParts('1e101', [index + 1]);
    W.Core.Resources.replaceExact(id, peak, s);
    expected.set(key, peak);
  }
  const next = W.Core.Reset.apply('reincarnation', s, W.Core.State.fresh);
  for (const [key, peak] of expected) {
    assert.equal(A.compare(A.field(X.resourceEntry(s, key), 'peak'), peak), 0, key);
    assert.equal(A.compare(A.field(X.resourceEntry(next, key), 'peak'), peak), 0, key);
  }
});
test('high-multiverse promotion cannot spend a rounded-up coefficient threshold',()=>{const {W,A,s}=setup(),H=W.Meta.HighMultiverse,id='meta.multiverse.highMultiverseCoefficient',threshold=W.Meta.InfinityConfig.highMultiverse.minimumCoefficient;W.Core.Resources.replaceExact(id,A.fromParts(threshold,['-1e-120']),s);const before=JSON.stringify(W.Core.State.toSerializable(s));assert.equal(H.preview(s).enoughCoefficient,false);assert.equal(H.promote(s),false);assert.equal(JSON.stringify(W.Core.State.toSerializable(s)),before);W.Core.Resources.replaceExact(id,A.fromParts(threshold,['1e-120']),s);assert.equal(H.preview(s).enoughCoefficient,true);});
