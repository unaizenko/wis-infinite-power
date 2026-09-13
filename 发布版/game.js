(() => {
  "use strict";

  const CONFIG = WIS.Core.Config;
  const BUILD = WIS.Core.Build;
  const GAME_VERSION = CONFIG.gameVersion;
  const LOGIC_INTERVAL_MS = 100;
  const RENDER_INTERVAL_MS = 250;
  const DISCRETE_CADENCE_SECONDS = CONFIG.fixedSettlement.discreteCadenceSeconds;
  const SIMULATION_STEP_SECONDS = DISCRETE_CADENCE_SECONDS; // legacy local-rule adapters
  const MAX_ONLINE_STEPS_PER_FRAME = 8;
  const MAX_DISCRETE_EVENTS_PER_STEP = 128;
  const SIMULATION_EPSILON = 1e-10;
  const OFFLINE_ERROR_TOLERANCE = 1e-4;
  const OFFLINE_BOUNDARY_BISECTIONS = 16;
  const CHALLENGE_DEFINITIONS = CONFIG.challenges;
  const { max: maxBN } = WIS.Core.BigNum;
  const { compact: formatCompact, number: format, cost: formatCost } = WIS.UI.Format;
  const Scale = WIS.Power.ScaleLogic;
  const Immortal = WIS.Cultivation.ImmortalLogic;
  const {
    autoUpgradeEnhancements, fitnessMembershipCardCount, superLollipopCount, skyCrystalCount,
    cosmicFiberCount, cosmicFiberAvailable, cosmicFiberChance,
    cosmicWillCount, cosmicWillAvailable, cosmicWillChance,
    fiveSpiritStoneCount, fitnessMembershipCardChance, superLollipopChance, skyCrystalChance,
    fiveSpiritStoneChance, fitnessJBonus, rockPowerPerSecond, ultimateIntentPowerSource, train,
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
    mysticHeavenSacredTreeCount, mysticHeavenSpiritSlayingSwordCount,
    tianNiPearlChance, mysteriousGreenBottleChance, fuBaoChance, naturalTreasureUpgradeChance,
    naturalTreasureLevelCap, xuTianDingChance, baLingChiChance, wanYaoFanChance,
    phantomHeavenMirrorChance, mysticHeavenSacredTreeChance, mysticHeavenSpiritSlayingSwordChance,
    immortalCrystalChance, fiveElementsTreasureChance, immortalTreasureChanceMultiplier,
    automaticExplorationAmountPerSecond, circulationManaPerSecond, immortalPowerPerSecond
  } = Immortal;

  let savedOfflineRecovery = null;
  let state = loadState();
  let initialLoadComplete = false;
  let automationSimulation;
  let stepSimulation;
  let treasureEventSimulation;
  let projectionSimulation;
  let offlineSimulation;
  let simulationLoop;
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
  const offlineDiscreteStateKeys = flatStateKeys.filter((key) => {
    const value = state[key];
    return key === "currentQiLayer" || typeof value === "boolean" || typeof value === "string" ||
      /(Purchased|Unlocked|Level|Enabled|Active|Exponent|Multiplier|Cap|Tier)$/.test(key);
  }).sort();
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
      console.error("WIS save load failed; original storage is protected and simulation is paused.", error);
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
    if (WIS.Core.Save.getLoadError()) return;
    try {
    simulationLoop?.prepareSave(options);
    // Manual actions save outside the simulation transaction. Their confirmed
    // state must replace any model checkpoint made before the action.
    if (!options.preserveSourceModels && !offlineSimulation?.isInternalWork()) offlineSimulation?.invalidateSourceModels();
    const saved = WIS.Core.State.cloneForSimulation(state);
    saved.lastUpdateAt = Date.now();
    WIS.Core.Save.write(saved, options);
    } catch(error) { WIS.Core.Save.noteFailure(error); throw error; }
  }

  function saveState(options = {}) {
    if (WIS.Core.Runtime.isProjection()) return;
    if (options.closing === true) return persistStateNow(options);
    if (stepSimulation) stepSimulation.requestSave();
    else persistStateNow();
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

  function formatMultiplierGroups(groups) {
    return Object.entries(groups).map(([groupName, effects]) => `${groupName}：${effects.map((effect, index) => {
      const effectName = typeof effect === "object" && effect !== null ? effect.name : `乘区${index + 1}`;
      return `${effectName} ×${format(multiplierEffectValue(effect), 2)}`;
    }).join("、")}`).join("；");
  }

  function updateLifetimeStatistics() {
    state.lifetimeHighestJ = maxBN(state.lifetimeHighestJ, state.joules);
    state.lifetimeHighestPower = maxBN(maxBN(state.lifetimeHighestPower, state.power), state.highestPower);
    state.lifetimeHighestScaleIndex = Math.max(state.lifetimeHighestScaleIndex, state.highestScaleIndex);
    state.lifetimeHighestMana = maxBN(state.lifetimeHighestMana, state.mana);
    state.lifetimeHighestImmortalPower = maxBN(state.lifetimeHighestImmortalPower, state.immortalPower);
    state.lifetimeHighestCultivationRealmLevel = Math.max(state.lifetimeHighestCultivationRealmLevel, cultivationRealmLevel());
    state.currentRebirthHighestJ = maxBN(state.currentRebirthHighestJ, state.joules);
    state.currentRebirthHighestPower = maxBN(state.currentRebirthHighestPower, state.power);
    state.currentRebirthHighestScaleIndex = Math.max(state.currentRebirthHighestScaleIndex, state.highestScaleIndex);
    state.currentRebirthHighestMana = maxBN(state.currentRebirthHighestMana, state.mana);
    state.currentRebirthHighestImmortalPower = maxBN(state.currentRebirthHighestImmortalPower, state.immortalPower);
    state.currentRebirthHighestCultivationRealmLevel = Math.max(
      state.currentRebirthHighestCultivationRealmLevel,
      cultivationRealmLevel()
    );
  }

  function formatElapsedTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = seconds % 60;
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    if (minutes > 0) return `${minutes}分钟${remainingSeconds}秒`;
    return `${remainingSeconds}秒`;
  }

  function formatGameCalendar(totalRealSeconds) {
    // Statistics display only: one elapsed real second represents one game minute.
    const totalMinutes = Math.max(0, Math.floor(totalRealSeconds));
    let totalHours = Math.floor(totalMinutes / 60);
    const hoursPerDay = 24;
    const hoursPerMonth = hoursPerDay * 30;
    const hoursPerYear = hoursPerMonth * 12;
    const years = Math.floor(totalHours / hoursPerYear);
    totalHours %= hoursPerYear;
    const months = Math.floor(totalHours / hoursPerMonth);
    totalHours %= hoursPerMonth;
    const days = Math.floor(totalHours / hoursPerDay);
    const hours = totalHours % hoursPerDay;
    const parts = [];
    if (years > 0) parts.push(`${format(years, 0)}年`);
    if (months > 0 || years > 0) parts.push(`${months}月`);
    if (days > 0 || months > 0 || years > 0) parts.push(`${days}日`);
    if (hours > 0 || parts.length > 0) parts.push(`${hours}小时`);
    parts.push(`${totalMinutes % 60}分钟`);
    return parts.join("");
  }

  const simulateOfflineProgress = (...args) => offlineSimulation.simulateOfflineProgress(...args);
  const cancelCatchUp = (...args) => offlineSimulation.cancelCatchUp(...args);
  const abandonCatchUp = (...args) => offlineSimulation.abandonCatchUp(...args);
  function convertOfflineToCompensation() {
    simulationLoop.prepareSave();
    offlineSimulation.sealOnlineTail();
    return offlineSimulation.convertOfflineToCompensation();
  }
  const retryCatchUp = (...args) => offlineSimulation.retryCatchUp(...args);
  const pauseCatchUpByPlayer = () => offlineSimulation.pauseCatchUpByPlayer();
  const acknowledgeCatchUp = (...args) => offlineSimulation.acknowledgeCatchUp(...args);
  const getCatchUpStatus = (...args) => offlineSimulation.getCatchUpStatus(...args);
  const subscribeCatchUpStatus = (...args) => offlineSimulation.subscribeCatchUpStatus(...args);
  const claimPauseNotice = (...args) => offlineSimulation.claimPauseNotice(...args);
  const setLastTickAt = (value) => simulationLoop?.setLastTickAt(value);
  function restoreOfflineRecovery(snapshot) {
    const restored = offlineSimulation.restorePersistenceSnapshot(snapshot, 0, { checkpoint: false });
    const newlyAway = simulationLoop.restoreClosedTime(snapshot);
    return restored || newlyAway > 0;
  }

  const UI = WIS.UI.App.create({
    saveState, simulateOfflineProgress, cancelCatchUp, abandonCatchUp, convertOfflineToCompensation, retryCatchUp, pauseCatchUpByPlayer, acknowledgeCatchUp,
    captureImportState: () => ({ state: WIS.Core.State.cloneForSimulation(state),
      recovery: offlineSimulation.getPersistenceSnapshot(), online: simulationLoop.snapshot(),
      power: WIS.Power.Scale.snapshotTreasureTransient(), cultivation: WIS.Cultivation.Immortal.snapshotTreasureTransient(),
      rates: { ...WIS.tmp.rates }, storage: WIS.Core.Save.storageSnapshot() }),
    restoreImportState: snapshot => {
      cancelCatchUp(); setStateDirect(snapshot.state);
      offlineSimulation.restorePersistenceSnapshot(snapshot.recovery, 0, { checkpoint: false });
      simulationLoop.restore(snapshot.online);
      WIS.Power.Scale.restoreTreasureTransient(snapshot.power);
      WIS.Cultivation.Immortal.restoreTreasureTransient(snapshot.cultivation);
      for (const key of Object.keys(WIS.tmp.rates)) delete WIS.tmp.rates[key];
      Object.assign(WIS.tmp.rates, snapshot.rates);
      WIS.Core.Save.restoreStorage(snapshot.storage);
    },
    getCatchUpStatus, subscribeCatchUpStatus, claimPauseNotice, restoreOfflineRecovery, achievementStates, recordCurrentAchievements,
    updateLifetimeStatistics, notifyNewAchievements, freshDefaultState, formatCompact, format, formatCost,
    multiplyEffects, multiplierEffectValue, multiplyEffectGroups, calculateSourceGain, calculateRegionGain,
    formatMultiplierGroups, formatElapsedTime, formatGameCalendar, resourceSoftcapExponent,
    planetSuppressionSoftcapExponent, formatSoftcapExponent, activeSoftcapStages, removedSoftcapStages,
    achievementDefinitions, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked, treasuresUnlocked,
    challengesUnlocked, statisticsUnlocked, hasAchievement, startChallenge, exitChallenge, setLastTickAt
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
  treasureEventSimulation = WIS.Simulation.TreasureEvents.create({
    getState: () => state,
    setStateDirect,
    advanceGameStep: stepSimulation.advanceGameStep,
    recordSignature,
    treasuresUnlocked,
    hasAchievement,
    fitnessMembershipCardChance,
    superLollipopChance,
    skyCrystalChance,
    fiveSpiritStoneChance,
    cosmicFiberAvailable,
    cosmicFiberChance,
    cosmicWillAvailable,
    cosmicWillChance,
    fitnessJBonus,
    rockPowerPerSecond,
    ultimateIntentPowerSource,
    tianNiPearlChance,
    mysteriousGreenBottleChance,
    fuBaoChance,
    naturalTreasureUpgradeChance,
    naturalTreasureLevelCap,
    xuTianDingChance,
    baLingChiChance,
    wanYaoFanChance,
    phantomHeavenMirrorChance,
    mysticHeavenSacredTreeChance,
    mysticHeavenSpiritSlayingSwordChance,
    immortalCrystalChance,
    fiveElementsTreasureChance,
    immortalTreasureChanceMultiplier,
    automaticExplorationAmountPerSecond,
    circulationManaPerSecond,
    immortalPowerPerSecond,
    epsilon: SIMULATION_EPSILON,
    simulationStepSeconds: SIMULATION_STEP_SECONDS,
    boundaryBisections: OFFLINE_BOUNDARY_BISECTIONS,
    maxDiscreteEventsPerStep: MAX_DISCRETE_EVENTS_PER_STEP
  });
  projectionSimulation = WIS.Simulation.Projection.create({
    getState: () => state,
    setStateDirect,
    advanceGameStep: stepSimulation.advanceGameStep,
    treasureDriverSignature: treasureEventSimulation.treasureDriverSignature,
    stateFlagSignature,
    recordSignature,
    offlineDiscreteStateKeys,
    challengeKeys,
    epsilon: SIMULATION_EPSILON,
    simulationStepSeconds: SIMULATION_STEP_SECONDS,
    maxDiscreteEventsPerStep: MAX_DISCRETE_EVENTS_PER_STEP,
    errorTolerance: OFFLINE_ERROR_TOLERANCE
  });
  offlineSimulation = WIS.Simulation.Offline.create({
    prepareFixedWork: stepSimulation.prepareFixedWork,
    prepareOnlineWork: stepSimulation.prepareOnlineWork,
    onlineMetrics: stepSimulation.onlineMetrics,
    restoreOnlineMetrics: stepSimulation.restoreOnlineMetrics,
    getState: () => state,
    advanceGameStep: stepSimulation.advanceGameStep,
    calculateAutomaticStepPlan: stepSimulation.calculateAutomaticStepPlan,
    projectStepTimes: stepSimulation.projectStepTimes,
    nextKnownSimulationBoundarySeconds: stepSimulation.nextKnownSimulationBoundarySeconds,
    adaptiveOfflineStepSeconds: projectionSimulation.adaptiveOfflineStepSeconds,
    nextEffectiveTreasureEventSeconds: treasureEventSimulation.nextEffectiveTreasureEventSeconds,
    createOfflineTaskRandom: treasureEventSimulation.createOfflineTaskRandom,
    beginTransaction: stepSimulation.beginTransaction,
    endTransaction: stepSimulation.endTransaction,
    achievementStates,
    recordCurrentAchievements,
    notifyNewAchievements,
    markAchievementsDirty,
    showNotice,
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
    beginTransaction: stepSimulation.beginTransaction,
    endTransaction: stepSimulation.endTransaction,
    offline: offlineSimulation,
    achievementStates,
    notifyNewAchievements,
    requestRender,
    flushRender,
    saveState,
    effectiveDevSpeed: () => UI.effectiveDevSpeed(),
    isInitialLoadComplete: () => initialLoadComplete && !WIS.Core.Save.getLoadError(),
    isStateReady: () => !WIS.Core.Save.getLoadError(),
    epsilon: SIMULATION_EPSILON,
    simulationStepSeconds: SIMULATION_STEP_SECONDS,
    maxOnlineStepsPerFrame: MAX_ONLINE_STEPS_PER_FRAME,
    maxDiscreteEventsPerStep: MAX_DISCRETE_EVENTS_PER_STEP,
    logicIntervalMs: LOGIC_INTERVAL_MS
  });
  WIS.Core.Save.bindOfflineRecovery((options) => offlineSimulation.getPersistenceSnapshot(options));

  WIS.Core.Runtime.bind({
    state: () => state,
    setState: setStateDirect,
    save: saveState,
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
      WIS.Power.Scale.resetTransient?.();
      WIS.Cultivation.Immortal.resetTransient?.();
    },
    resetCultivationPage: UI.resetCultivationPage,
    grantThreeDeficienciesResetReward
  });

  UI.bindEvents();
  const initialAchievementStates = achievementStates();
  const restoredOfflineRecovery = restoreOfflineRecovery(savedOfflineRecovery);
  const initialOfflineElapsedSeconds = restoredOfflineRecovery
    ? 0 : Math.max(0, Date.now() - state.lastUpdateAt) / 1000;
  // A tab may be created hidden, without receiving a visibilitychange event.
  // Register its new absence separately from the older saved offline debt.
  if (document.hidden) simulationLoop.prepareSave({ closing: true });

  WIS.Game = Object.freeze({
    version: GAME_VERSION,
    getState: () => state,
    getDomainState: () => WIS.Core.State.domainView(state),
    getPowerSystem: () => WIS.Core.Registries.getActivePower(state),
    getCultivationSystem: () => WIS.Core.Registries.getActiveCultivation(state),
    actions: Object.freeze({
      train,
      breathe,
      explore,
      chooseCultivation,
      startChallenge,
      exitChallenge,
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
      acknowledgeCatchUp,
      getCatchUpStatus
    })
  });

  applyTheme();
  ensureAdvancedRealmAbilityGroups();
  switchPage("actions");
  lastUpgradeCostSortSignature = upgradeCostSortSignature();
  lastCultivationCostSortSignature = cultivationCostSortSignature();
  lastUpgradeUnlockSignature = [state.highestScaleIndex, state.brickUnlocked, state.wallUnlocked,
    stateFlagSignature(upgradeFlagKeys)].join("|");
  lastCultivationUnlockSignature = [state.cultivation?.active, state.advancedRealmLevel,
    stateFlagSignature(cultivationFlagKeys)].join("|");
  lastTreasureSignature = [state.heavenlyTreasureLevel, state.mysticHeavenlyTreasureLevel,
    state.fiveElementsTreasureUnlocked, state.fiveSpiritStonePurchased,
    recordSignature(state.treasureImprints, WIS.Meta.Treasures.keys)].join("|");
  lastChallengeSignature = `${state.activeChallenge}|${state.threeCorpseChallengesUnlocked}|${recordSignature(state.challengeCompletions, challengeKeys)}`;
  requestRender();
  flushRender(Date.now(), { force: true });
  simulationLoop.start();

  async function finishInitialLoad() {
    let initialOfflineReport = "";
    try {
      if (!WIS.Core.Save.getLoadError()) initialOfflineReport = await simulateOfflineProgress(initialOfflineElapsedSeconds);
    } catch (error) {
      console.error("WIS initial offline settlement failed; continuing online play.", error);
    }
    simulationLoop.setLastTickAt(Date.now());
    initialLoadComplete = true;
    markCostGroupsDirty();
    requestRender();
    flushRender(Date.now(), { force: true });
    saveState();
    if (!offlineSimulation.isCatchUpPaused() && !WIS.Core.Save.getLoadError())
      notifyNewAchievements(initialAchievementStates);
    if (WIS.Core.Save.getLoadError()) showNotice("原存档读取失败，已暂停结算和自动保存。原文件仍保留，请导入有效存档或恢复备份。" + WIS.Core.Save.getLoadError(), 60000);
    else if (initialOfflineReport) showNotice(initialOfflineReport, 6000);
    window.setInterval(() => {
      // A periodic save does not change production rules. Keeping its confirmed
      // model avoids resampling at wall-clock-dependent save times. Real player
      // actions still invalidate through saveState; newly queued online time
      // invalidates through prepareSave/appendCatchUpTask when necessary.
      if (!document.hidden) try { persistStateNow({ preserveSourceModels: true }); }
      catch(error) { /* Save status retains the failure; keep the existing 5s cadence. */ }
    }, 5000);
    if (BUILD.enableFormulaDetails) {
      window.setInterval(() => {
        if (!document.hidden) renderResourceDebugPanel();
      }, 1000);
    }
  }

  const queueInitialOfflineProgress = () => window.setTimeout(() => { void finishInitialLoad(); }, 0);
  if (document.hidden) queueInitialOfflineProgress();
  else window.requestAnimationFrame(queueInitialOfflineProgress);
})();
