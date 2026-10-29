(() => {
  "use strict";

  const BOOT = window.WIS_BOOT || {enter(){},fail(stage,error){console.error(stage,error);},ready(){},diagnostics(){return {failed:false};}};
  let abortStartup = () => {};
  function paintOpportunity() {
    return new Promise(resolve => {
      let done=false, fallback;
      const finish=()=>{if(done)return;done=true;window.clearTimeout(fallback);resolve();};
      fallback=window.setTimeout(finish,document.hidden?0:250);
      if(!document.hidden && typeof window.requestAnimationFrame==="function")
        window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>window.setTimeout(finish,0)));
    });
  }
  function assertBootHealthy(){if(BOOT.diagnostics().failed)throw new Error("启动已中止；请先导出原始存档并重新加载");}
  async function bootstrap() {
  if(BOOT.diagnostics().failed)return;
  BOOT.enter("read-save");
  await paintOpportunity();
  assertBootHealthy();
  for(const [name,value] of [["Core.Save",window.WIS?.Core?.Save?.read],["UI.App",window.WIS?.UI?.App?.create],["Simulation.Loop",window.WIS?.Simulation?.Loop?.create]])
    if(typeof value!=="function")throw new Error("关键游戏接口缺失："+name);
  if(typeof window.BigInt!=="function")throw new Error("浏览器缺少精确大整数 BigInt 支持");
  const CONFIG = WIS.Core.Config;
  const BUILD = WIS.Core.Build;
  const GAME_VERSION = CONFIG.gameVersion;
  const LOGIC_INTERVAL_MS = 100;
  const RENDER_INTERVAL_MS = 250;
  const DISCRETE_CADENCE_SECONDS = CONFIG.fixedSettlement.discreteCadenceSeconds;
  const SIMULATION_STEP_SECONDS = DISCRETE_CADENCE_SECONDS; // legacy local-rule adapters
  const MAX_ONLINE_STEPS_PER_FRAME = 8;
  const ONLINE_SLICE_BUDGET_MS = 12;
  const MAX_DISCRETE_EVENTS_PER_STEP = 128;
  const SIMULATION_EPSILON = 1e-10;
  const OFFLINE_BOUNDARY_BISECTIONS = 16;
  const CHALLENGE_DEFINITIONS = CONFIG.challenges;
  const { max: maxBN } = WIS.Core.BigNum;
  const { compact: formatCompact, number: format, cost: formatCost } = WIS.UI.Format;
  const Scale = WIS.Power.ScaleLogic;
  const Immortal = WIS.Cultivation.ImmortalLogic;
  const {
    autoUpgradeEnhancements, fitnessMembershipCardCount, superLollipopCount, skyCrystalCount,
    cosmicFiberCount, cosmicWillCount, fiveSpiritStoneCount, train,
    applyResourceSoftcap, applyResourceSoftcapRate, applyResourceSoftcapEffectiveRate,
    applyResourceSoftcapOverTime, applyResourceSoftcapDynamicRateOverTime,
    applyResourceSoftcapProgressive, resourceSoftcapExponent,
    planetSuppressionSoftcapExponent, formatSoftcapExponent,
    activeSoftcapStages, removedSoftcapStages
  } = Scale;
  const {
    autoBreakthroughImmortalRealms, autoUpgradeImmortalAbilities, breathe, chooseCultivation,
    baLingChiCount, cultivationRealmLevel, explore, grantThreeDeficienciesResetReward,
    reconcileMahayanaReincarnationEffects,
    minorTribulationPowerExponent, celestialDeclineExponent, tianNiPearlCount, phantomHeavenMirrorCount,
    mysticHeavenSacredTreeCount, mysticHeavenSpiritSlayingSwordCount
  } = Immortal;

  let savedOfflineRecovery = null;
  const loadedState = loadState();
  BOOT.enter("initialize");
  await paintOpportunity();
  assertBootHealthy();
  let state = WIS.Core.State.cloneForSimulation(loadedState);
  let initialLoadComplete = false;
  const canPerformSavedAction = () => initialLoadComplete;
  const canPersistConfirmedState = () => initialLoadComplete && WIS.Core.Save.sessionPolicy().persistenceAllowed;
  let automationSimulation;
  let stepSimulation;
  let offlineSimulation;
  let simulationLoop;
  abortStartup = () => {
    const hadConfirmedStartup=initialLoadComplete;
    initialLoadComplete=false;
    simulationLoop?.invalidateOnlineScheduler();
    offlineSimulation?.suspendForAway();
    if(!hadConfirmedStartup)setStateDirect(loadedState);
  };
  let renderPending = false;
  let lastRenderAt = 0;
  let lastUpgradeCostSortSignature = "";
  let lastCultivationCostSortSignature = "";
  let lastUpgradeUnlockSignature = "";
  let lastCultivationUnlockSignature = "";
  let lastTreasureSignature = "";
  let lastChallengeSignature = "";

  let render = () => {};
  let renderResourceDebugPanel = () => {};
  let ensureAdvancedRealmAbilityGroups = () => {};
  let applyTheme = () => {};
  let switchPage = () => {};
  let showNotice = () => {};
  let showAchievementNotice = () => {};
  let showScaleNotice = () => {};
  let markGlobalDirty = () => {};
  let markCurrentPageDirty = () => {};
  let markPagesDirty = () => {};
  let markCostGroupsDirty = () => {};
  let markAchievementsDirty = () => {};

  WIS.Core.Runtime.bind({
    state: () => state,
    setState: setStateDirect
  });
  WIS.Core.Resources.bind(() => state);
  reconcileMahayanaReincarnationEffects();
  WIS.Meta.TreasureProgress.ensure(state);

  const flatStateKeys = Object.keys(WIS.Core.State.toFlat(state));
  const upgradeFlagKeys = flatStateKeys.filter((key) => key.endsWith("Purchased")).sort();
  const cultivationFlagKeys = flatStateKeys
    .filter((key) => key.endsWith("Unlocked") || key.endsWith("Level"))
    .sort();
  const challengeKeys = Object.keys(CHALLENGE_DEFINITIONS);
  const {
    definitions: achievementDefinitions, states: achievementStates, recordCurrent: recordCurrentAchievements,
    notifyNew: notifyNewAchievements, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked,
    treasuresUnlocked, challengesUnlocked, statisticsUnlocked, hasCurrent: hasAchievement
  } = WIS.Meta.Achievements;
  const { startChallenge, exitChallenge, checkActiveChallengeCompletion } = WIS.Meta.Challenges;

  function freshDefaultState() {
    return WIS.Core.State.fresh();
  }

  function loadState() {
    try {
      const saved = WIS.Core.Save.read();
      savedOfflineRecovery = saved?.offlineRecovery ?? null;
      return saved ? saved.state : freshDefaultState();
    } catch (error) {
      console.error("WIS save load failed; original storage is protected. Running a temporary in-memory fallback with autosave disabled.", error);
      return freshDefaultState();
    }
  }

  function setStateDirect(nextState) {
    state = nextState;
    WIS.Core.Effects.invalidate();
  }

  function upgradeCostSortSignature() {
    return String(state.mindDivisionLevel);
  }

  function cultivationCostSortSignature() {
    return [
      state.qiSpellLevel, state.longevityLevel, state.foundationSpellLevel,
      state.goldenCoreLongevityLevel, state.longevity800Level,
      state.heavenlyTreasureLevel, state.trueSpiritTransformationLevel,
      state.mysticHeavenlyTreasureLevel, state.immortalApertureLevel,
      state.advancedRealmLevel
    ].join("|");
  }

  function stateFlagSignature(keys, source = state) {
    let signature = "";
    for (const key of keys) signature += `|${source[key]}`;
    return signature;
  }

  function recordSignature(record, keys) {
    let signature = "";
    for (const key of keys) {
      const value = record?.[key];
      signature += `|${value === null || value === undefined ? 0 : value}`;
    }
    return signature;
  }

  function requestRender(pageName) {
    if (WIS.Core.Runtime.isProjection()) return;
    markGlobalDirty();
    if (pageName === "all") markPagesDirty();
    else if (typeof pageName === "string") markPagesDirty(pageName);
    else markCurrentPageDirty();

    const nextUpgradeUnlockSignature = [state.highestScaleIndex, state.brickUnlocked, state.wallUnlocked,
      stateFlagSignature(upgradeFlagKeys)].join("|");
    if (nextUpgradeUnlockSignature !== lastUpgradeUnlockSignature) {
      lastUpgradeUnlockSignature = nextUpgradeUnlockSignature;
      markPagesDirty("upgrades");
    }
    const nextCultivationUnlockSignature = [state.cultivation?.active, state.advancedRealmLevel,
      stateFlagSignature(cultivationFlagKeys)].join("|");
    if (nextCultivationUnlockSignature !== lastCultivationUnlockSignature) {
      const previousRealmLevel = Number(lastCultivationUnlockSignature.split("|")[1]) || 0;
      lastCultivationUnlockSignature = nextCultivationUnlockSignature;
      markPagesDirty("cultivation");
      if (state.advancedRealmLevel !== previousRealmLevel) ensureAdvancedRealmAbilityGroups();
    }
    const nextTreasureSignature = [
      state.heavenlyTreasureLevel, state.mysticHeavenlyTreasureLevel,
      state.fiveElementsTreasureUnlocked, state.fiveSpiritStonePurchased,
      recordSignature(state.treasureImprints, WIS.Meta.Treasures.keys)
    ].join("|");
    if (nextTreasureSignature !== lastTreasureSignature) {
      lastTreasureSignature = nextTreasureSignature;
      markPagesDirty("treasures");
    }
    const nextChallengeSignature = `${state.activeChallenge}|${state.threeCorpseChallengesUnlocked}|${recordSignature(state.challengeCompletions, challengeKeys)}`;
    if (nextChallengeSignature !== lastChallengeSignature) {
      lastChallengeSignature = nextChallengeSignature;
      markPagesDirty("challenges");
    }
    const nextUpgradeCostSortSignature = upgradeCostSortSignature();
    if (nextUpgradeCostSortSignature !== lastUpgradeCostSortSignature) {
      lastUpgradeCostSortSignature = nextUpgradeCostSortSignature;
      markCostGroupsDirty("upgrades");
    }
    const nextCultivationCostSortSignature = cultivationCostSortSignature();
    if (nextCultivationCostSortSignature !== lastCultivationCostSortSignature) {
      lastCultivationCostSortSignature = nextCultivationCostSortSignature;
      markCostGroupsDirty("cultivation");
    }
    renderPending = true;
  }

  function flushRender(now = Date.now(), { force = false } = {}) {
    if (!renderPending && !force) return false;
    if (!force && now - lastRenderAt < RENDER_INTERVAL_MS) return false;
    render();
    renderPending = false;
    lastRenderAt = now;
    return true;
  }

  function persistStateNow(options = {}) {
    if(!canPersistConfirmedState())return false;
    return WIS.Core.Save.persistLive(state,simulationLoop,offlineSimulation,options);
  }

  function saveState(options = {}) {
    if (WIS.Core.Runtime.isProjection() || !canPerformSavedAction()) return false;
    // Import commit must be synchronous: the transaction cannot release the old
    // session until the newly installed state and its recovery debt are in storage.
    if (options.closing === true || options.importCommit === true) return persistStateNow(options);
    if (stepSimulation) stepSimulation.requestSave();
    else return persistStateNow(options);
  }

  function multiplyEffects(effects) {
    return WIS.Core.Formulas.multiply(effects);
  }

  function multiplierEffectValue(effect) {
    return typeof effect === "object" && effect !== null ? effect.value : effect;
  }

  function multiplyEffectGroups(groups) {
    return multiplyEffects(Object.values(groups).flat());
  }

  function calculateSourceGain({ base = 0, additive = 0, multipliers = [], exponents = [], softcaps = [] } = {}) {
    return WIS.Core.Formulas.source({ base, additive, multipliers, exponents, softcaps });
  }

  function calculateRegionGain(sourceGains, { multipliers = [], exponents = [], softcaps = [] } = {}) {
    return WIS.Core.Formulas.region(sourceGains, { multipliers, exponents, softcaps });
  }

  const formatMultiplierGroups = groups => WIS.UI.Format.multiplierGroups(groups, multiplierEffectValue);

  // Explicit load/player-action boundary. Simulation retains its existing
  // event checks; rendering must never be required to activate rewards.
  function playerAction(work) {
    return (...args) => { if(!canPerformSavedAction()||simulationLoop?.isDeferredActionPending?.()||offlineSimulation?.getCatchUpStatus().locked)return false;
      const result = work(...args); completePlayerAction(); return result; };
  }

  function completePlayerAction() {
    recordCurrentAchievements();
    updateLifetimeStatistics();
    WIS.Meta.BigNumbers.syncUnlock(state);
  }

  function updateLifetimeStatistics() {
    WIS.Core.State.updateLifetimeStatistics(WIS.Core.Runtime.getState(), cultivationRealmLevel());
  }

  const formatElapsedTime = WIS.UI.Format.elapsedTime;

  const formatGameCalendar = WIS.UI.Format.gameCalendar;

  const invalidateOnlineScheduler = () => simulationLoop?.invalidateOnlineScheduler?.();
  const simulateOfflineProgress = (...args) => { invalidateOnlineScheduler(); return offlineSimulation.simulateOfflineProgress(...args); };
  const cancelCatchUp = (...args) => { invalidateOnlineScheduler(); return offlineSimulation.cancelCatchUp(...args); };
  const abandonCatchUp = (...args) => { invalidateOnlineScheduler(); return offlineSimulation.abandonCatchUp(...args); };
  function convertOfflineToCompensation() {
    simulationLoop.prepareSave();
    invalidateOnlineScheduler();
    offlineSimulation.sealOnlineTail();
    return offlineSimulation.convertOfflineToCompensation();
  }
  const retryCatchUp = (...args) => { invalidateOnlineScheduler(); return offlineSimulation.retryCatchUp(...args); };
  const startCatchUp = (...args) => { invalidateOnlineScheduler(); return offlineSimulation.startCatchUp(...args); };
  const pauseCatchUpByPlayer = () => { invalidateOnlineScheduler(); return offlineSimulation.pauseCatchUpByPlayer(); };
  const acknowledgeCatchUp = (...args) => offlineSimulation.acknowledgeCatchUp(...args);
  const getCatchUpStatus = (...args) => offlineSimulation.getCatchUpStatus(...args);
  const subscribeCatchUpStatus = (...args) => offlineSimulation.subscribeCatchUpStatus(...args);
  const claimPauseNotice = (...args) => offlineSimulation.claimPauseNotice(...args);
  const queueCatchUpNotice = (...args) => offlineSimulation.queueCatchUpNotice(...args);
  const setLastTickAt = (value) => simulationLoop?.setLastTickAt(value);
  function restoreOfflineRecovery(snapshot) {
    invalidateOnlineScheduler();
    const restored = offlineSimulation.restorePersistenceSnapshot(snapshot, 0, { checkpoint: false });
    const newlyAway = simulationLoop.restoreClosedTime(snapshot);
    return restored || newlyAway > 0;
  }
  // Import registers the freshly installed save's unsettled time and takes the
  // foreground gate, but does NOT run the settlement worker. Same enqueue call
  // and default task options as bootstrap, so the debt, execution mode and clock
  // ratio are identical. The worker starts only after commit and handoff,
  // when the running UI has had its first paint.
  function prepareImportRecovery(snapshot) {
    const restored = restoreOfflineRecovery(snapshot);
    // A successful save slice does not imply that all parked blocking time
    // has been handed off. Capture without settlement, then transfer metadata
    // under the recovery gate. A failed handoff rolls back the import transaction.
    offlineSimulation.holdCatchUpUntilUserStart("import");
    const prepared = simulationLoop.prepareSave({ importCommit: true, captureOnly: true });
    const handoff = prepared && simulationLoop.handoffImportRecovery();
    if (!handoff?.complete) throw new Error("导入恢复时间尚未完成交接");
    const paused = offlineSimulation.isCatchUpPaused();
    const pending = offlineSimulation.getPendingCatchUpSeconds() > SIMULATION_EPSILON;
    // Only a blocking recovery waits for committed UI paint. A restored pause
    // owns its own wait, and a quiet online backlog settles inline as before.
    const blocking = pending && offlineSimulation.getCatchUpStatus().presentation === "blocking";
    if (handoff.complete && (paused || !blocking)) offlineSimulation.releaseCatchUpUserStart();
    return {
      restored,
      paused,
      pending,
      awaitingStart: offlineSimulation.isCatchUpAwaitingStart()
    };
  }

  function captureImportStateSnapshot() {
    return { state: WIS.Core.State.cloneForSimulation(state),
      recovery: offlineSimulation.getPersistenceSnapshot(), online: simulationLoop.snapshot(),
      power: WIS.Power.Scale.snapshotTreasureTransient(), cultivation: WIS.Cultivation.Immortal.snapshotTreasureTransient(),
      rates: { ...WIS.tmp.rates }, storage: WIS.Core.Save.storageSnapshot({ transaction: true }) };
  }

  function restoreImportStateSnapshot(snapshot) {
    cancelCatchUp(); setStateDirect(snapshot.state);
    offlineSimulation.restorePersistenceSnapshot(snapshot.recovery, 0, { checkpoint: false });
    simulationLoop.restore(snapshot.online);
    WIS.Power.Scale.restoreTreasureTransient(snapshot.power);
    WIS.Cultivation.Immortal.restoreTreasureTransient(snapshot.cultivation);
    for (const key of Object.keys(WIS.tmp.rates)) delete WIS.tmp.rates[key];
    Object.assign(WIS.tmp.rates, snapshot.rates);
    WIS.Core.Save.restoreStorage(snapshot.storage);
  }

  function infinityRebirth(options) {
    if(options?.challengeKey&&(simulationLoop.isDeferredActionPending()||offlineSimulation.getCatchUpStatus().locked))throw Error('当前结算尚未完成');
    let previous;
    const next=WIS.Meta.Infinity.commitRebirth(options,{
      getState:()=>state,capture:()=>previous=captureImportStateSnapshot(),
      cancel:()=>{cancelCatchUp();simulationLoop.resetAccumulators();},
      install:next=>{setStateDirect(next);simulationLoop.resetAccumulators({preservePending:WIS.Core.Reset.preservesContent("infinity",next)&&!WIS.Meta.Infinity.isInfinityChallenge(next.activeChallenge)});WIS.Power.Scale.resetTransient?.();WIS.Cultivation.Immortal.resetTransient?.();},
      save:()=>saveState({importCommit:true,storageTransaction:previous.storage}),restore:restoreImportStateSnapshot
    });
    WIS.Core.Save.finishStorageTransaction(previous.storage);
    UI.dismissOfflineSummary();UI.resetCultivationPage();requestRender();return next;
  }

  function beginImportTransaction() {
    if (simulationLoop.isImportHoldActive?.()) return null;
    const now = Date.now();
    // Register the unsampled prefix before capturing rollback/backup. No settlement.
    simulationLoop.captureForegroundTime(now);
    const previous = captureImportStateSnapshot();
    const hold = simulationLoop.beginImportHold(now);
    if (!hold) return null;
    return Object.freeze({ token: hold.token, startedAt: hold.startedAt, previous });
  }

  function commitImportTransaction(transaction) {
    if (!transaction?.token) return { released: false, elapsedSeconds: 0 };
    const result = simulationLoop.finishImportHold(transaction.token, { accountElapsed: false });
    if (result.released) WIS.Core.Save.finishStorageTransaction(transaction.previous.storage);
    return result;
  }

  function rollbackImportTransaction(transaction, reason = "import-cancel") {
    if (!transaction?.previous || !transaction?.token || !transaction.previous.storage.transaction?.active)
      return { released: false, elapsedSeconds: 0 };
    let result;
    try {
      restoreImportStateSnapshot(transaction.previous);
    } finally {
      // Disk conflicts/quota failures cannot strand the old session in hold.
      WIS.Core.Save.finishStorageTransaction(transaction.previous.storage);
      result = simulationLoop.finishImportHold(transaction.token, { accountElapsed: true, reason });
    }
    return result;
  }

  const UI = WIS.UI.App.create({
    canPerformSavedAction, canPersistConfirmedState,
    saveState, simulateOfflineProgress, cancelCatchUp, abandonCatchUp, convertOfflineToCompensation, retryCatchUp, startCatchUp, pauseCatchUpByPlayer, acknowledgeCatchUp,
    captureImportState: captureImportStateSnapshot,
    restoreImportState: restoreImportStateSnapshot,
    beginImportTransaction, commitImportTransaction, rollbackImportTransaction,
    getCatchUpStatus, subscribeCatchUpStatus, claimPauseNotice, restoreOfflineRecovery, prepareImportRecovery,
    queueCatchUpNotice, achievementStates, recordCurrentAchievements,
    completePlayerAction, notifyNewAchievements, freshDefaultState, formatCompact, format, formatCost,
    multiplyEffects, multiplierEffectValue, multiplyEffectGroups, calculateSourceGain, calculateRegionGain,
    formatMultiplierGroups, formatElapsedTime, formatGameCalendar, resourceSoftcapExponent,
    planetSuppressionSoftcapExponent, formatSoftcapExponent, activeSoftcapStages, removedSoftcapStages,
    achievementDefinitions, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked, treasuresUnlocked,
    challengesUnlocked, statisticsUnlocked, hasAchievement, startChallenge: playerAction(startChallenge), exitChallenge: playerAction(exitChallenge), setLastTickAt,
    captureForegroundTime: (now = Date.now()) => simulationLoop?.captureForegroundTime?.(now) ?? 0,
    requestDeferredAction:job=>simulationLoop?.requestDeferredAction(job),
    isDeferredActionPending:()=>simulationLoop?.isDeferredActionPending?.()===true,
    cancelDeferredAction:()=>simulationLoop?.cancelDeferredAction?.()
  });
  ({
    render, renderResourceDebugPanel, ensureAdvancedRealmAbilityGroups, applyTheme, switchPage, showNotice,
    showAchievementNotice, showScaleNotice, markGlobalDirty, markCurrentPageDirty,
    markPagesDirty, markCostGroupsDirty, markAchievementsDirty
  } = UI);

  automationSimulation = WIS.Simulation.Automation.create({
    autoBreakthroughImmortalRealms,
    autoUpgradeImmortalAbilities,
    autoUpgradeEnhancements
  });
  stepSimulation = WIS.Simulation.Step.create({
    getState: () => state,
    persistStateNow,
    updateLifetimeStatistics,
    recordCurrentAchievements,
    markAchievementsDirty,
    markCostGroupsDirty,
    checkActiveChallengeCompletion,
    autoBreakthroughImmortalRealms,
    runAchievementAutomations: () => automationSimulation.runAchievementAutomations(),
    showScaleNotice,
    scaleRequirement: Scale.scaleRequirement,
    simulationStepSeconds: SIMULATION_STEP_SECONDS,
    epsilon: SIMULATION_EPSILON,
    boundaryBisections: OFFLINE_BOUNDARY_BISECTIONS
  });
  offlineSimulation = WIS.Simulation.Offline.create({
    useWorker: true,
    prepareFixedWork: stepSimulation.prepareFixedWork,
    prepareOnlineWork: stepSimulation.prepareOnlineWork,
    onlineMetrics: stepSimulation.onlineMetrics,
    restoreOnlineMetrics: stepSimulation.restoreOnlineMetrics,
    getState: () => state,
    advanceGameStep: stepSimulation.advanceGameStep,
    beginTransaction: stepSimulation.beginTransaction,
    endTransaction: stepSimulation.endTransaction,
    achievementStates,
    recordCurrentAchievements,
    notifyNewAchievements,
    markAchievementsDirty,
    showNotice: (message, duration) => {
      if (state.autoCloseOfflineDialogEnabled === false) showNotice(message, duration);
    },
    requestRender,
    formatElapsedTime,
    format,
    setLastTickAt,
    checkpoint: persistStateNow,
    snapshotTransient: () => ({
      power: WIS.Core.Registries.getActivePower(state)?.snapshotTreasureTransient?.(),
      cultivation: WIS.Core.Registries.getActiveCultivation(state)?.snapshotTreasureTransient?.()
    }),
    restoreTransient: (snapshot) => {
      WIS.Core.Registries.getActivePower(state)?.restoreTreasureTransient?.(snapshot.power);
      WIS.Core.Registries.getActiveCultivation(state)?.restoreTreasureTransient?.(snapshot.cultivation);
    },
    resetOnlineAccumulators: () => simulationLoop?.resetAccumulators(),
    snapshotState: ({ borrow = false } = {}) => {
      const powerSystem = WIS.Core.Registries.getActivePower(state);
      const cultivationSystem = WIS.Core.Registries.getActiveCultivation(state);
      return {
        domain: borrow ? { core: state.core, powerSystem: state.powerSystem, cultivation: state.cultivation, meta: state.meta } : WIS.Core.State.toSerializable(state),
        powerTransient: powerSystem?.snapshotTreasureTransient?.(),
        cultivationTransient: cultivationSystem?.snapshotTreasureTransient?.()
      };
    },
    restoreState: (snapshot) => {
      setStateDirect(WIS.Core.State.cloneForSimulation(snapshot.domain));
      WIS.Core.Registries.getActivePower(state)?.restoreTreasureTransient?.(snapshot.powerTransient);
      WIS.Core.Registries.getActiveCultivation(state)?.restoreTreasureTransient?.(snapshot.cultivationTransient);
    },
    installWorkerSnapshot: (snapshot) => {
      setStateDirect(snapshot.domain);
      WIS.Core.Registries.getActivePower(state)?.restoreTreasureTransient?.(snapshot.powerTransient);
      WIS.Core.Registries.getActiveCultivation(state)?.restoreTreasureTransient?.(snapshot.cultivationTransient);
    },
    tianNiPearlCount,
    fitnessMembershipCardCount,
    superLollipopCount,
    skyCrystalCount,
    fiveSpiritStoneCount,
    cosmicFiberCount,
    cosmicWillCount,
    baLingChiCount,
    phantomHeavenMirrorCount,
    mysticHeavenSacredTreeCount,
    mysticHeavenSpiritSlayingSwordCount,
    epsilon: SIMULATION_EPSILON,
    simulationStepSeconds: SIMULATION_STEP_SECONDS
  });
  simulationLoop = WIS.Simulation.Loop.create({
    getState: () => state,
    advanceGameStep: stepSimulation.advanceGameStep,
    invalidateDeferredQi: stepSimulation.invalidateDeferredQi,
    hasDeferredQi: stepSimulation.hasDeferredQi,
    beginTransaction: stepSimulation.beginTransaction,
    endTransaction: stepSimulation.endTransaction,
    offline: offlineSimulation,
    achievementStates,
    notifyNewAchievements,
    requestRender,
    flushRender,
    saveState,
    effectiveDevSpeed: () => UI.effectiveDevSpeed(),
    isInitialLoadComplete: () => initialLoadComplete,
    isStateReady: () => initialLoadComplete,
    epsilon: SIMULATION_EPSILON,
    simulationStepSeconds: SIMULATION_STEP_SECONDS,
    maxOnlineStepsPerFrame: MAX_ONLINE_STEPS_PER_FRAME,
    onlineSliceBudgetMs: ONLINE_SLICE_BUDGET_MS,
    maxDiscreteEventsPerStep: MAX_DISCRETE_EVENTS_PER_STEP,
    logicIntervalMs: LOGIC_INTERVAL_MS
  });
  WIS.Core.Save.bindOfflineRecovery((options) => offlineSimulation.getPersistenceSnapshot(options));

  WIS.Core.Runtime.bind({
    state: () => state,
    setState: setStateDirect,
    save: saveState,
    infinityRebirth,
    requestQiBatch:shouldRender=>simulationLoop.requestQiBatch(shouldRender),
    requestDeferredAction:job=>simulationLoop.requestDeferredAction(job),
    isDeferredActionPending:()=>simulationLoop.isDeferredActionPending(),
    cancelDeferredAction:()=>simulationLoop.cancelDeferredAction(),
    render: requestRender,
    renderImmediately: (pageName) => {
      requestRender(pageName);
      flushRender(Date.now(), { force: true });
    },
    showNotice,
    switchPage,
    showAchievementNotice,
    achievementStates,
    notifyNewAchievements,
    cultivationUnlocked,
    treasuresUnlocked,
    applyResourceSoftcap,
    applyResourceSoftcapRate,
    applyResourceSoftcapEffectiveRate,
    applyResourceSoftcapOverTime,
    applyResourceSoftcapDynamicRateOverTime,
    applyResourceSoftcapProgressive,
    resourceSoftcapExponent,
    updateLifetimeStatistics,
    showScaleNotice,
    checkActiveChallengeCompletion,
    cultivationRealmLevel,
    minorTribulationPowerExponent,
    celestialDeclineExponent,
    format,
    freshState: freshDefaultState,
    resetTransientAccumulators: () => {
      simulationLoop?.invalidateOnlineScheduler();
      WIS.Power.Scale.resetTransient?.();
      WIS.Cultivation.Immortal.resetTransient?.();
    },
    resetCultivationPage: UI.resetCultivationPage,
    grantThreeDeficienciesResetReward
  });

  completePlayerAction();
  UI.bindEvents();
  const initialAchievementStates = achievementStates();
  WIS.Game = Object.freeze({
    version: GAME_VERSION,
    canPerformSavedAction, canPersistConfirmedState,
    getState: () => state,
    getDomainState: () => WIS.Core.State.domainView(state),
    getPowerSystem: () => WIS.Core.Registries.getActivePower(state),
    getCultivationSystem: () => WIS.Core.Registries.getActiveCultivation(state),
    actions: Object.freeze({
      train: playerAction(train),
      breathe: playerAction(breathe),
      explore: playerAction(explore),
      chooseCultivation: playerAction(chooseCultivation),
      startChallenge: playerAction(startChallenge),
      exitChallenge: playerAction(exitChallenge),
      save: saveState
    }),
    simulation: Object.freeze({
      advanceGameStep: stepSimulation.advanceGameStep,
      advanceGame: stepSimulation.advanceGame,
      simulateOfflineProgress,
      cancelCatchUp,
      abandonCatchUp,
      convertOfflineToCompensation,
      retryCatchUp,
      startCatchUp,
      acknowledgeCatchUp,
      getCatchUpStatus
    })
  });

  applyTheme();
  BOOT.enter("first-view");
  // Stock-only view avoids source/preview evaluation before a paint opportunity.
  document.getElementById("joules").textContent=format(state.joules);
  document.getElementById("power").textContent=format(state.power);
  document.getElementById("joules-rate").textContent="等待恢复";
  await paintOpportunity(); // first-view
  assertBootHealthy();
  BOOT.enter("register-recovery");
  // No save or action may advance the saved watermark before this succeeds.
  if(WIS.Core.Save.sessionPolicy().durableRecoveryAllowed)restoreOfflineRecovery(savedOfflineRecovery);
  else simulationLoop.restoreClosedTime(null);
  initialLoadComplete=true;
  if(document.hidden)simulationLoop.prepareSave({closing:true});
  ensureAdvancedRealmAbilityGroups();
  switchPage("actions");
  markCostGroupsDirty();
  requestRender();
  flushRender(Date.now(),{force:true});
  BOOT.ready({mode:WIS.Core.Save.sessionPolicy().mode});
  simulationLoop.start();

  // Historical recovery owns its own gate. Base UI readiness never waits for
  // its potentially long promise, and Worker writes retain their durable ACK.
  let initialOfflineReport="";
  try {
    if(WIS.Core.Save.sessionPolicy().durableRecoveryAllowed)
      initialOfflineReport=await simulateOfflineProgress(0);
  } catch(error) {
    WIS.Core.Save.noteFailure(error);
    showNotice("离线恢复已暂停，剩余时间仍保留："+(error.message||error),6000);
  }
  if(!initialLoadComplete)return;
  simulationLoop.setLastTickAt(Date.now());
  markCostGroupsDirty();
  requestRender();
  flushRender(Date.now(),{force:true});
  try {saveState();} catch(error) {WIS.Core.Save.noteFailure(error);}
  if(!offlineSimulation.isCatchUpPaused()&&!WIS.Core.Save.getLoadError())notifyNewAchievements(initialAchievementStates);
  if(initialOfflineReport&&state.autoCloseOfflineDialogEnabled===false)showNotice(initialOfflineReport,6000);
  window.setInterval(()=>{
    if(!document.hidden)try{persistStateNow({preserveSourceModels:true,captureOnly:true});}catch(_){}
  },5000);
  }
  window.setTimeout(()=>{
    bootstrap().catch(error=>{
      try{abortStartup();}catch(cleanupError){console.error("WIS startup cleanup",cleanupError);}
      BOOT.fail(BOOT.diagnostics().stage||"initialize",error,{canRetry:false});
    });
  },0);
})();
