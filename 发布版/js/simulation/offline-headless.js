(function defineOfflineHeadless(WIS) {
  'use strict';
  // Host adapter only: all math, events and queue accounting stay in the same
  // production Step/Offline modules used by game.js and deterministic references.
  function create(initial,host) {
    const S=WIS.Core.State,R=WIS.Core.Runtime,I=WIS.Cultivation.ImmortalLogic,A=WIS.Meta.Achievements,Scale=WIS.Power.ScaleLogic;
    let state=S.cloneForSimulation(initial.domain),offline;
    const noop=()=>{},setState=next=>{state=next;WIS.Core.Effects.invalidate();};
    const statistics=()=>S.updateLifetimeStatistics(R.getState(),I.cultivationRealmLevel());
    const resetTransient=()=>{WIS.Power.Scale.resetTransient();WIS.Cultivation.Immortal.resetTransient();};
    R.bind({state:()=>state,setState,save:()=>host.checkpoint(),render:noop,renderImmediately:noop,switchPage:noop,showNotice:noop,
      showScaleNotice:noop,showAchievementNotice:noop,notifyNewAchievements:noop,resetCultivationPage:noop,
      achievementStates:A.states,cultivationUnlocked:A.cultivationUnlocked,treasuresUnlocked:A.treasuresUnlocked,
      upgradesUnlocked:A.upgradesUnlocked,format:WIS.UI.Format.number,freshState:S.fresh,updateLifetimeStatistics:statistics,
      checkActiveChallengeCompletion:WIS.Meta.Challenges.checkActiveChallengeCompletion,resetTransientAccumulators:resetTransient,
      cultivationRealmLevel:I.cultivationRealmLevel,minorTribulationPowerExponent:I.minorTribulationPowerExponent,
      celestialDeclineExponent:I.celestialDeclineExponent,grantThreeDeficienciesResetReward:I.grantThreeDeficienciesResetReward,
      ...Object.fromEntries(['applyResourceSoftcap','applyResourceSoftcapRate','applyResourceSoftcapEffectiveRate','applyResourceSoftcapOverTime',
        'applyResourceSoftcapDynamicRateOverTime','applyResourceSoftcapProgressive','resourceSoftcapExponent'].map(k=>[k,Scale[k]]))});
    WIS.Core.Resources.bind(()=>state);resetTransient();
    function restore(snapshot) {
      setState(S.cloneForSimulation(snapshot.domain));
      WIS.Core.Registries.getActivePower(state)?.restoreTreasureTransient?.(snapshot.powerTransient);
      WIS.Core.Registries.getActiveCultivation(state)?.restoreTreasureTransient?.(snapshot.cultivationTransient);
    }
    function snapshot({borrow=false}={}) {
      return {domain:borrow?{core:state.core,powerSystem:state.powerSystem,cultivation:state.cultivation,meta:state.meta}:S.toSerializable(state),
        powerTransient:WIS.Core.Registries.getActivePower(state)?.snapshotTreasureTransient?.(),
        cultivationTransient:WIS.Core.Registries.getActiveCultivation(state)?.snapshotTreasureTransient?.()};
    }
    restore(initial);
    const automation=WIS.Simulation.Automation.create({autoBreakthroughImmortalRealms:I.autoBreakthroughImmortalRealms,
      autoUpgradeImmortalAbilities:I.autoUpgradeImmortalAbilities,autoUpgradeEnhancements:Scale.autoUpgradeEnhancements});
    const common={getState:()=>state,epsilon:1e-10,simulationStepSeconds:WIS.Core.Config.fixedSettlement.discreteCadenceSeconds,boundaryBisections:16};
    const step=WIS.Simulation.Step.create({...common,persistStateNow:()=>host.checkpoint(),updateLifetimeStatistics:statistics,
      recordCurrentAchievements:A.recordCurrent,markAchievementsDirty:noop,markCostGroupsDirty:noop,
      checkActiveChallengeCompletion:WIS.Meta.Challenges.checkActiveChallengeCompletion,autoBreakthroughImmortalRealms:I.autoBreakthroughImmortalRealms,
      runAchievementAutomations:automation.runAchievementAutomations,showScaleNotice:noop,scaleRequirement:Scale.scaleRequirement});
    offline=WIS.Simulation.Offline.create({...common,...step,useWorker:false,achievementStates:A.states,recordCurrentAchievements:A.recordCurrent,
      notifyNewAchievements:noop,markAchievementsDirty:noop,showNotice:noop,requestRender:noop,
      formatElapsedTime:WIS.UI.Format.elapsedTime,format:WIS.UI.Format.number,resetOnlineAccumulators:noop,
      checkpoint:()=>host.checkpoint(),checkpointIntervalMs:100,yieldToHost:()=>host.yield(),snapshotState:snapshot,restoreState:restore,
      snapshotTransient:()=>({power:WIS.Power.Scale.snapshotTreasureTransient(),cultivation:WIS.Cultivation.Immortal.snapshotTreasureTransient()}),
      restoreTransient:p=>{WIS.Power.Scale.restoreTreasureTransient(p.power);WIS.Cultivation.Immortal.restoreTreasureTransient(p.cultivation);},
      setLastTickAt(now){const ledger=state.core.runtime.timeLedger;if(ledger.awaySince===null)state.core.runtime.timeLedger={...ledger,boundaryAt:Math.max(ledger.boundaryAt,now)};},
      ...Object.fromEntries(['fitnessMembershipCardCount','superLollipopCount','skyCrystalCount','fiveSpiritStoneCount','cosmicFiberCount','cosmicWillCount'].map(k=>[k,Scale[k]])),
      ...Object.fromEntries(['tianNiPearlCount','baLingChiCount','phantomHeavenMirrorCount','mysticHeavenSacredTreeCount','mysticHeavenSpiritSlayingSwordCount'].map(k=>[k,I[k]]))});
    return Object.freeze({getState:()=>state,snapshot,offline,step});
  }
  WIS.Simulation.OfflineHeadless=Object.freeze({create});
}(window.WIS));
