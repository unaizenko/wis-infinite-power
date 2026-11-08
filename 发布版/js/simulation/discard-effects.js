(function(WIS) {
  "use strict";
  const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const add = (a,b) => Math.min(Number.MAX_VALUE,a+b);
  // Only mutate a caller-owned private candidate. Never install, save, reward or evaluate RNG here.
  function apply(state, segments, reason = 'performance') {
    if (!Array.isArray(segments) || typeof reason !== 'string' || !reason.length || reason.length > 120) throw Error('舍弃时间格式无效');
    let clock=0,game=0;
    for(const part of segments) {
      if(!part || !['online','offline'].includes(part.source) || !finite(part.clock) || !finite(part.speed) || part.speed<=0 || typeof part.compensationEligible!=='boolean' || !finite(part.clock*part.speed))throw Error('舍弃时间片段无效');
      clock=add(clock,part.clock);game=add(game,part.clock*part.speed);
    }
    const events=[];
    if(clock===0)return {discardedClock:0,discardedGame:0,events};
    const challenge=state.meta.challenges, infinity=state.meta.infinity, ledger=state.core.runtime.timeLedger;
    const key=challenge.activeChallenge,definition=key?WIS.Core.Config.challenges[key]:null;
    if(key&&!definition)throw Object.assign(Error('未知挑战无法推进舍弃时间'),{code:'DISCARD_CHALLENGE_UNSUPPORTED'});
    infinity.discardedRunElapsed=add(infinity.discardedRunElapsed||0,game);
    if(key) {
      const limit=definition.timeToLimitSeconds||0;
      challenge.discardedElapsedSeconds=limit?Math.min(Math.max(0,limit-challenge.activeChallengeElapsedSeconds),add(challenge.discardedElapsedSeconds||0,game)):add(challenge.discardedElapsedSeconds||0,game);
      if(definition.deadlineSeconds && challenge.activeChallengeElapsedSeconds+challenge.discardedElapsedSeconds>=definition.deadlineSeconds-1e-9) {
        challenge.activeChallenge=null;challenge.activeChallengeElapsedSeconds=0;challenge.discardedElapsedSeconds=0;
        events.push({type:'challenge-failed',challenge:key,reason:'deadline'});
      }
    }
    ledger.discardedClock=add(ledger.discardedClock||0,clock);ledger.discardedGame=add(ledger.discardedGame||0,game);
    ledger.lastDiscard={clock,game,reason};
    return {discardedClock:clock,discardedGame:game,events};
  }
  WIS.Simulation.DiscardEffects=Object.freeze({apply});
})(window.WIS);
