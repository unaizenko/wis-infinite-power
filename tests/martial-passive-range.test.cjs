'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {setup75} = require('./amount-fixture.cjs');

function onlineTick(host) {
  const segment = {source:'online',clockRatio:1};
  const work = host.step.prepareOnlineWork(.1,segment);
  let prepared;
  do { prepared = work.advance(Infinity); } while (!prepared.done);
  return host.step.advanceGameStep(.1,true,{preparedOnlineSegment:prepared.token,timeSegment:segment});
}

for (const ability of ['mindPlanet','innerWorld']) for (const combined of [false,true]) {
  for (const input of ['ee2048','ee2050','eee20']) {
    test(ability+(combined?' with both passives':'')+' settles consecutive online ticks at '+input, () => {
      const {W} = setup75({targetSchema:76});
      const {State,Save,Amount:A,Resources:Q} = W.Core;
      const M = W.Cultivation.Martial, start = State.fresh();
      start.cultivation.active = 'martial';
      M.get(start).abilities[ability] = 1;
      if(combined)Object.assign(M.get(start).abilities,{mindPlanet:3,innerWorld:1});
      const mind = ability === 'mindPlanet';
      const sources = mind ? ['heart'] : ['qi','body'];
      const keys = mind ? ['qi','body'] : ['heart','soul'];
      for (const key of sources) Q.replaceExact('cultivation.martial.'+key,input,start);
      const create = domain => W.Simulation.OfflineHeadless.create({domain},{checkpoint(){},yield:()=>Promise.resolve()});
      let host = create(start);
      for (let i=0;i<5;i++) {
        const before = host.getState(), clock = before.totalElapsedSeconds;
        const stocks = keys.map(key=>M.quantity(before,key)), rng = before.core.runtime.randomState;
        const profile = M.capturePassive(before), frozen = M.passiveGains(profile,.1,{frozen:true});
        for (const key of keys) assert.equal(A.compare(frozen[key],A.multiply(profile[key].rate,.1)),0);
        const result = onlineTick(host);
        assert.equal(result.processedSeconds,.1);
        const after = host.getState(), saved = Save.prepare(Save.envelope(after)).state;
        assert.equal(after.totalElapsedSeconds,clock+.1);
        assert.equal(after.core.runtime.randomState,rng);
        for (const key of sources) {
          const change = A.compare(M.quantity(after,key),input);
          assert(combined ? change>=0 : change===0);
        }
        keys.forEach((key,j)=>{
          assert(A.compare(M.quantity(after,key),stocks[j])>0,'missing '+key+' gain at tick '+i);
          assert.equal(A.compare(M.quantity(saved,key),M.quantity(after,key)),0);
        });
        if(i===2)host=create(saved);
      }
    });
  }
}

for (const input of ['ee2050','eee20']) {
  test('certified qi quote commits its full payment at '+input, () => {
    const {W} = setup75({targetSchema:76});
    const {State,Amount:A,Resources:Q} = W.Core;
    const M = W.Cultivation.Martial, s = State.fresh();
    s.cultivation.active = 'martial';
    Q.replaceExact('core.joules',input,s);
    const quote = M.preview(s,'qi');
    assert(quote.allowed);
    assert(A.compare(quote.gainQuantity,1000)>0);
    assert.equal(A.compare(quote.costQuantities.joules,input),0);
    assert(M.convert(s,'qi'));
    assert.equal(A.compare(Q.readExact('core.joules',s),0),0);
    assert.equal(A.compare(M.quantity(s,'qi'),quote.gainQuantity),0);
  });
}

test('save compares a compound tower balance to its projected statistic without spending it', () => {
  const {W} = setup75({targetSchema:76});
  const {State,Save,Amount:A,Resources:Q} = W.Core, M = W.Cultivation.Martial;
  const cases = [A.multiply('eee20','eee20'), A.multiply('eee20','eee19'), A.divide('eee20','eee19')];
  for (const [i,input] of cases.entries()) {
    assert.equal(A.compare(input,A.project(input)),i===2?-1:1);
    const s = State.fresh();
    s.cultivation.active = 'martial';
    Q.replaceExact('core.joules',input,s);
    const reloaded = Save.prepare(JSON.parse(JSON.stringify(Save.envelope(s)))).state;
    assert.equal(A.compare(Q.readExact('core.joules',reloaded),input),0);
    assert.match(M.preview(reloaded,'qi').reason,/精度/);
    assert.equal(M.convert(reloaded,'qi'),false);
    assert.equal(A.compare(Q.readExact('core.joules',reloaded),input),0);
  }
});

test('common-factor comparison preserves literal decimal exponents beyond binary64 precision', () => {
  const {W} = setup75({targetSchema:76}), P = W.Core.AmountProducts;
  const product = (e,f) => '@product:1:'+JSON.stringify({n:'1',d:'1',e,f:[['eee20','1'],...f]});
  const larger = product('0',[['1e100000000000000019','1']]);
  const smaller = product('100000000000000013',[]);
  assert.equal(P.sign([larger,'-'+smaller]),1);
  assert.equal(P.sign([smaller,'-'+larger]),-1);
});

test('Mind Planet settles qi and body after War God and Steal Heaven at late martial stocks', () => {
  const {W}=setup75({targetSchema:76});
  const {State,Resources,Amount,Save}=W.Core, M=W.Cultivation.Martial;
  const s=State.fresh();
  s.cultivation.active='martial';
  s.challengeCompletions.martialStealHeaven=1;
  Object.assign(M.get(s).abilities,{mindPlanet:1,warGod:1});
  for(const [key,value] of Object.entries({qi:'ee50.86',body:'ee51.74',heart:'ee50.61',soul:'ee50.53'}))
    Resources.replaceExact('cultivation.martial.'+key,value,s);
  const host=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});
  const before=Object.fromEntries(['qi','body'].map(k=>[k,M.quantity(host.getState(),k)]));
  assert.equal(onlineTick(host).processedSeconds,.1);
  const after=host.getState(), loaded=Save.prepare(Save.envelope(after)).state;
  for(const key of ['qi','body']){
    assert(Amount.compare(M.quantity(after,key),before[key])>0);
    assert.equal(Amount.compare(M.quantity(loaded,key),M.quantity(after,key)),0);
  }
});
