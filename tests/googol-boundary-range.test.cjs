'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup75}=require('./amount-fixture.cjs');
function setup(){
  const {W}=setup75({targetSchema:76}),s=W.Core.State.fresh();
  const host=W.Simulation.OfflineHeadless.create({domain:s},{checkpoint(){},yield:()=>Promise.resolve()});
  return {W,A:W.Core.Amount,s:host.getState()};
}

test('B6 locates the exact decade of a fractional tower with a remote income term',()=>{
  const {W,A,s}=setup(),P=W.Core.Penalties;
  s.meta.infinity.upgrades.B6=true;
  const stock=A.add('ee2050.197528655523',A.divide('ee51',10));
  const details=P.googolPenaltyDetails('joules',stock,s);
  // Independent 2100-digit evaluation of floor((10^2050.197528655523-100)/10).
  const digest=require('node:crypto').createHash('sha256').update(details.penaltyCount).digest('hex');
  assert.equal(digest,'87fc952fd105f467eed21ea5ce7816de05705c71fbacfed33b25445bf7f23816');
  const next=P.nextGoogolPenaltyBoundary('joules',stock,s);
  assert.equal(A.compare(next,A.from('1e'+String(110n+10n*BigInt(details.penaltyCount)))),0);
  assert.equal(A.compare(P.nextGoogolPenaltyBoundary('joules',A.subtract(next,1),s),next),0);
  assert.equal(A.compare(P.nextGoogolPenaltyBoundary('joules',next,s),A.scale(next,'1e10')),0);
});
test('B6 preserves the next symbolic decade for balances at and just below an integral tower',()=>{
  const {W,A,s}=setup(),P=W.Core.Penalties;
  s.meta.infinity.upgrades.B6=true;
  const anchor=A.from('eee20');
  assert.equal(A.compare(P.nextGoogolPenaltyBoundary('mana',A.subtract(anchor,1),s),anchor),0);
  assert.equal(A.compare(P.nextGoogolPenaltyBoundary('mana',anchor,s),A.scale(anchor,'1e10')),0);
});

test('Googol penalty settles an online and an offline interval just above the exact threshold',async()=>{
  const {W}=setup75({targetSchema:76});
  const {State,Resources,Amount:A,Save}=W.Core;
  const state=State.fresh(),initial=A.add('1e100','1e-490');
  Resources.replaceExact('core.joules',initial,state);
  const host=W.Simulation.OfflineHeadless.create({domain:state},{checkpoint(){},yield:()=>Promise.resolve()});
  const segment={source:'online',clockRatio:1},work=host.step.prepareOnlineWork(.1,segment);
  let prepared;do{prepared=work.advance(Infinity);}while(!prepared.done);
  assert.equal(host.step.advanceGameStep(.1,true,{preparedOnlineSegment:prepared.token,timeSegment:segment}).processedSeconds,.1);
  host.offline.appendCatchUpTask(1,1,{source:'offline',speed:1,sealed:true,randomMode:'state'});
  await host.offline.simulateOfflineProgress(0,0);
  assert.equal(host.offline.getCatchUpStatus().phase,'completed');
  const end=host.getState(),loaded=Save.prepare(Save.envelope(end)).state;
  const quantity=s=>Resources.readExact('core.joules',s);
  assert.equal(end.totalElapsedSeconds,1.1);
  assert(A.compare(quantity(end),initial)>0);
  assert.equal(A.compare(quantity(loaded),quantity(end)),0);
});
