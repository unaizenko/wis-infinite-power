(() => {
  "use strict";

  const CONFIG = WIS.Core.Config;
  const BUILD = WIS.Core.Build;
  const GAME_VERSION = BUILD.mode === "development" ? `${CONFIG.gameVersion}-dev` : CONFIG.gameVersion;
  const LOGIC_INTERVAL_MS = 100;
  const RENDER_INTERVAL_MS = 250;
  const SIMULATION_STEP_SECONDS = 0.1;
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
    minorTribulationPowerExponent, celestialDeclineExponent, tianNiPearlCount, phantomHeavenMirrorCount,
    mysticHeavenSacredTreeCount, mysticHeavenSpiritSlayingSwordCount,
    tianNiPearlChance, mysteriousGreenBottleChance, fuBaoChance, naturalTreasureUpgradeChance,
    naturalTreasureLevelCap, xuTianDingChance, baLingChiChance, wanYaoFanChance,
    phantomHeavenMirrorChance, mysticHeavenSacredTreeChance, mysticHeavenSpiritSlayingSwordChance,
    immortalCrystalChance, fiveElementsTreasureChance, immortalTreasureChanceMultiplier,
    automaticExplorationAmountPerSecond, circulationManaPerSecond, immortalPowerPerSecond
  } = Immortal;

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
      return saved ? WIS.Core.State.migrate(saved.schemaVersion, saved.data) : freshDefaultState();
    } catch (error) {
      console.error("WIS save migration or state normalization failed; using a fresh state.", error);
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
    for (const key of keys) signature += `|${Number(record?.[key]) || 0}`;
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

  function persistStateNow() {
    if (recordCurrentAchievements()) markAchievementsDirty();
    updateLifetimeStatistics();
    const pendingClockSeconds = offlineSimulation?.getPendingCatchUpClockSeconds?.() || 0;
    const onlineClockSeconds = simulationLoop?.getSimulationClockAccumulator?.() || 0;
    state.lastUpdateAt = Math.max(0, Date.now() - (pendingClockSeconds + onlineClockSeconds) * 1000);
    WIS.Core.Save.write(state);
  }

  function saveState() {
    if (WIS.Core.Runtime.isProjection()) return;
    if (stepSimulation) stepSimulation.requestSave();
    else persistStateNow();
  }

  function multiplyEffects(effects) {
    return WIS.Core.Formulas.multiply(effects.map(multiplierEffectValue));
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
    let totalHours = Math.max(0, Math.floor(totalRealSeconds));
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
    parts.push(`${hours}小时`);
    return parts.join("");
  }

  const simulateOfflineProgress = (...args) => offlineSimulation.simulateOfflineProgress(...args);
  const cancelCatchUp = (...args) => offlineSimulation.cancelCatchUp(...args);
  const setLastTickAt = (value) => simulationLoop?.setLastTickAt(value);

  const UI = WIS.UI.App.create({
    saveState, simulateOfflineProgress, cancelCatchUp, achievementStates, recordCurrentAchievements,
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
    getState: () => state,
    advanceGameStep: stepSimulation.advanceGameStep,
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
    resetOnlineAccumulators: () => simulationLoop?.resetAccumulators(),
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
    isInitialLoadComplete: () => initialLoadComplete,
    epsilon: SIMULATION_EPSILON,
    simulationStepSeconds: SIMULATION_STEP_SECONDS,
    maxOnlineStepsPerFrame: MAX_ONLINE_STEPS_PER_FRAME,
    maxDiscreteEventsPerStep: MAX_DISCRETE_EVENTS_PER_STEP,
    logicIntervalMs: LOGIC_INTERVAL_MS
  });

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
  const initialOfflineElapsedSeconds = (Date.now() - state.lastUpdateAt) / 1000;

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
      cancelCatchUp
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
      initialOfflineReport = await simulateOfflineProgress(initialOfflineElapsedSeconds);
    } catch (error) {
      console.error("WIS initial offline settlement failed; continuing online play.", error);
    }
    simulationLoop.setLastTickAt(Date.now());
    initialLoadComplete = true;
    markCostGroupsDirty();
    requestRender();
    flushRender(Date.now(), { force: true });
    saveState();
    notifyNewAchievements(initialAchievementStates);
    if (initialOfflineReport) showNotice(initialOfflineReport, 6000);
    window.setInterval(() => {
      if (!document.hidden) saveState();
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
