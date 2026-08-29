(() => {
  "use strict";

  const CONFIG = WIS.Core.Config;
  const BUILD = WIS.Core.Build;
  const GAME_VERSION = BUILD.mode === "development"
    ? `${CONFIG.gameVersion}-dev`
    : CONFIG.gameVersion;
  const OFFLINE_NOTICE_MIN_SECONDS = CONFIG.offlineNoticeMinSeconds, OFFLINE_MAX_STEPS = CONFIG.offlineMaxSteps;
  const CHALLENGE_DEFINITIONS = CONFIG.challenges;
  const SCALE_THRESHOLDS = CONFIG.scales;
  const { ZERO, add, sub, max: maxBN, gt, gte, lt, toNumber } = WIS.Core.BigNum;
  const { compact: formatCompact, number: format, cost: formatCost } = WIS.UI.Format;

  let state = loadState();
  // 状态字段集合在运行期固定，只排序一次，避免 requestRender 每 tick 扫描并排序整个 state。
  const upgradeFlagKeys = Object.keys(state).filter((key) => key.endsWith("Purchased")).sort();
  const cultivationFlagKeys = Object.keys(state)
    .filter((key) => key.endsWith("Unlocked") || key.endsWith("Level"))
    .sort();
  const challengeKeys = Object.keys(CHALLENGE_DEFINITIONS);
  let lastTickAt = Date.now();
  let lastRenderAt = 0;
  const LOGIC_INTERVAL_MS = 100;
  const RENDER_INTERVAL_MS = 250;
  const SIMULATION_STEP_SECONDS = 0.1;
  const MAX_ONLINE_STEPS_PER_FRAME = 8;
  const SIMULATION_EPSILON = 1e-10;

  const Scale = WIS.Power.ScaleLogic;
  const {
    autoUpgradeEnhancements, fitnessMembershipCardCount, superLollipopCount, skyCrystalCount,
    fiveSpiritStoneCount, train,
    applyResourceSoftcap, applyResourceSoftcapRate, applyResourceSoftcapEffectiveRate,
    applyResourceSoftcapOverTime, applyResourceSoftcapDynamicRateOverTime,
    applyResourceSoftcapProgressive, resourceSoftcapExponent,
    planetSuppressionSoftcapExponent, formatSoftcapExponent,
    activeSoftcapStages, removedSoftcapStages
  } = Scale;
  const Immortal = WIS.Cultivation.ImmortalLogic;
  const {
    autoBreakthroughImmortalRealms, autoUpgradeImmortalAbilities, breathe, chooseCultivation,
    baLingChiCount, cultivationRealmLevel, explore, grantThreeDeficienciesResetReward,
    minorTribulationPowerExponent, celestialDeclineExponent, tianNiPearlCount, phantomHeavenMirrorCount,
    mysticHeavenSacredTreeCount, mysticHeavenSpiritSlayingSwordCount
  } = Immortal;
  WIS.Core.Runtime.bind({
    state: () => state,
    setState: (nextState) => {
      state = nextState;
      WIS.Core.Effects.invalidate();
    }
  });
  const {
    definitions: achievementDefinitions, states: achievementStates, recordCurrent: recordCurrentAchievements,
    notifyNew: notifyNewAchievements, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked,
    treasuresUnlocked, challengesUnlocked, statisticsUnlocked, hasCurrent: hasAchievement
  } = WIS.Meta.Achievements;
  const { startChallenge, exitChallenge, checkActiveChallengeCompletion } = WIS.Meta.Challenges;
  const UI = WIS.UI.App.create({
    saveState, simulateOfflineProgress, cancelCatchUp, achievementStates, recordCurrentAchievements, updateLifetimeStatistics, notifyNewAchievements, freshDefaultState, formatCompact, format, formatCost, multiplyEffects, multiplierEffectValue, multiplyEffectGroups, calculateSourceGain, calculateRegionGain, formatMultiplierGroups, formatElapsedTime, formatGameCalendar, resourceSoftcapExponent, planetSuppressionSoftcapExponent, formatSoftcapExponent, activeSoftcapStages, removedSoftcapStages, achievementDefinitions, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked, treasuresUnlocked, challengesUnlocked, statisticsUnlocked, hasAchievement, startChallenge, exitChallenge,
    setLastTickAt: (value) => { lastTickAt = value; }
  });
  const { render, renderResourceDebugPanel, ensureAdvancedRealmAbilityGroups, applyTheme, switchPage, showNotice,
    showAchievementNotice, showScaleNotice, markGlobalDirty, markCurrentPageDirty,
    markPagesDirty, markCostGroupsDirty, markAchievementsDirty } = UI;
  let renderPending = false;
  let lastUpgradeCostSortSignature = "";
  let lastCultivationCostSortSignature = "";
  let lastUpgradeUnlockSignature = "";
  let lastCultivationUnlockSignature = "";
  let lastTreasureSignature = "";
  let lastChallengeSignature = "";
  let catchUpInProgress = false;
  let pendingCatchUpSeconds = 0;
  let pendingCatchUpClockSeconds = 0;
  let livePendingGameSeconds = 0;
  let livePendingClockSeconds = 0;
  let simulationAccumulator = 0;
  let simulationClockAccumulator = 0;
  let simulationStepRemainder = 0;
  let simulationStepDiscreteEvents = 0;
  const catchUpTasks = [];
  let catchUpGeneration = 0;
  let catchUpPromise = null;
  let catchUpResolver = null;
  let catchUpNoticePromise = null;
  const CATCH_UP_FRAME_BUDGET_MS = 9;
  const MAX_DISCRETE_EVENTS_PER_STEP = 128;
  let automaticStepTransactionDepth = 0;
  let deferredSaveRequested = false;

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

  function stateFlagSignature(keys) {
    let signature = "";
    for (const key of keys) signature += `|${state[key]}`;
    return signature;
  }

  function recordSignature(record, keys) {
    let signature = "";
    for (const key of keys) signature += `|${Number(record?.[key]) || 0}`;
    return signature;
  }

  function requestRender(pageName) {
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
  WIS.Core.Resources.bind(() => state);
  WIS.Core.Runtime.bind({
    state: () => state,
    setState: (nextState) => {
      state = nextState;
      WIS.Core.Effects.invalidate();
    },
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

  function freshDefaultState() {
    return WIS.Core.State.fresh();
  }

  function loadState() {
    const saved = WIS.Core.Save.read();
    return saved ? WIS.Core.State.migrate(saved.schemaVersion, saved.data) : freshDefaultState();
  }

  function persistStateNow() {
    if (recordCurrentAchievements()) markAchievementsDirty();
    updateLifetimeStatistics();
    // 记录游戏状态已经推进到的时间点，避免页面冻结后保存吞掉尚未结算的离线时间。
    state.lastUpdateAt = Math.max(0,
      Date.now() - (pendingCatchUpClockSeconds + simulationClockAccumulator) * 1000);
    WIS.Core.Save.write(state);
  }

  function saveState() {
    if (automaticStepTransactionDepth > 0) {
      deferredSaveRequested = true;
      return;
    }
    persistStateNow();
  }

  function flushDeferredSave() {
    if (automaticStepTransactionDepth > 0 || !deferredSaveRequested) return;
    deferredSaveRequested = false;
    persistStateNow();
  }

  function beginAutomaticStepTransaction() {
    automaticStepTransactionDepth += 1;
  }

  function endAutomaticStepTransaction() {
    automaticStepTransactionDepth = Math.max(0, automaticStepTransactionDepth - 1);
    flushDeferredSave();
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
    return Object.entries(groups)
      .map(([groupName, effects]) => `${groupName}：${effects.map((effect, index) => {
        const effectName = typeof effect === "object" && effect !== null ? effect.name : `乘区${index + 1}`;
        return `${effectName} ×${format(multiplierEffectValue(effect), 2)}`;
      }).join("、")}`)
      .join("；");
  }

  function updateLifetimeStatistics() {
    state.lifetimeHighestJ = maxBN(state.lifetimeHighestJ, state.joules);
    state.lifetimeHighestPower = maxBN(maxBN(state.lifetimeHighestPower, state.power), state.highestPower);
    state.lifetimeHighestScaleIndex = Math.max(state.lifetimeHighestScaleIndex, state.highestScaleIndex);
    state.lifetimeHighestMana = maxBN(state.lifetimeHighestMana, state.mana);
    state.lifetimeHighestCultivationRealmLevel = Math.max(state.lifetimeHighestCultivationRealmLevel, cultivationRealmLevel());
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
    const daysPerMonth = 30;
    const monthsPerYear = 12;
    const hoursPerMonth = hoursPerDay * daysPerMonth;
    const hoursPerYear = hoursPerMonth * monthsPerYear;
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

  function projectStepTimes(projection, elapsedSeconds) {
    projection.reincarnationElapsedSeconds += elapsedSeconds;
    projection.currentScaleElapsedSeconds += elapsedSeconds;
    if (projection.activeChallenge) {
      const timeLimit = CHALLENGE_DEFINITIONS[projection.activeChallenge]?.timeToLimitSeconds;
      const nextElapsed = projection.activeChallengeElapsedSeconds + elapsedSeconds;
      projection.activeChallengeElapsedSeconds = timeLimit
        ? Math.min(timeLimit, nextElapsed)
        : nextElapsed;
    }
  }

  function calculateAutomaticStepPlan(elapsedSeconds, activePowerSystem, activeCultivationSystem) {
    const projection = WIS.Core.State.fromFlat(WIS.Core.State.toFlat(state));
    return WIS.Core.Runtime.withState(projection, () =>
      WIS.Core.Effects.withIsolatedState(projection, () => {
        projectStepTimes(projection, elapsedSeconds);
        const power = activePowerSystem?.calculateAutomaticGains?.(projection, elapsedSeconds)
          ?? { joules: ZERO, power: ZERO, rates: {} };
        projection.joules = add(projection.joules, power.joules);
        projection.power = add(projection.power, power.power);
        const cultivation = activeCultivationSystem?.planAutomaticGain?.(
          projection,
          elapsedSeconds
        ) ?? {
          completed: true,
          elapsedSeconds,
          processedSeconds: elapsedSeconds,
          remainingSeconds: 0
        };
        return { projection, power, cultivation };
      })
    );
  }

  function nextScaleBoundarySeconds(maxSeconds, activePowerSystem, finalPower) {
    const nextScale = SCALE_THRESHOLDS[state.highestScaleIndex + 1];
    if (!nextScale || !lt(state.power, nextScale.power) || !gte(finalPower, nextScale.power)) return maxSeconds;
    let lower = 0;
    let upper = maxSeconds;
    for (let iteration = 0; iteration < 32; iteration += 1) {
      const middle = (lower + upper) * 0.5;
      const projection = WIS.Core.State.fromFlat(WIS.Core.State.toFlat(state));
      const projectedPower = WIS.Core.Runtime.withState(projection, () =>
        WIS.Core.Effects.withIsolatedState(projection, () => {
          projectStepTimes(projection, middle);
          const power = activePowerSystem?.calculateAutomaticGains?.(projection, middle)
            ?? { power: ZERO };
          return add(projection.power, power.power);
        })
      );
      if (gte(projectedPower, nextScale.power)) upper = middle;
      else lower = middle;
    }
    return upper;
  }

  function nextChallengeTimeBoundarySeconds(maxSeconds) {
    const challenge = state.activeChallenge ? CHALLENGE_DEFINITIONS[state.activeChallenge] : null;
    const limit = Number(challenge?.timeToLimitSeconds) || 0;
    const current = Math.max(0, Number(state.activeChallengeElapsedSeconds) || 0);
    if (!(limit > current) || current + maxSeconds <= limit) return maxSeconds;
    return limit - current;
  }

  function isCultivationRealmBoundaryEvent(event) {
    return ["manaRealmRequirement", "immortalRealmRequirement"].includes(event?.type);
  }

  function handleCultivationRealmBoundary(event, eventUpdate) {
    const eventCommitted = eventUpdate?.eventCommitted === true;
    const realmBoundaryHandled = eventCommitted && isCultivationRealmBoundaryEvent(event);
    if (!realmBoundaryHandled) {
      return { eventCommitted, realmBoundaryHandled: false, breakthroughs: 0, challengeCompleted: false };
    }
    const breakthroughs = autoBreakthroughImmortalRealms();
    if (!(breakthroughs > 0)) {
      return { eventCommitted, realmBoundaryHandled: true, breakthroughs: 0, challengeCompleted: false };
    }
    WIS.Core.Effects.invalidate();
    const challengeCompleted = checkActiveChallengeCompletion();
    markCostGroupsDirty();
    markAchievementsDirty();
    return { eventCommitted, realmBoundaryHandled: true, breakthroughs, challengeCompleted };
  }

  function commitInstantCultivationEvent(activeCultivationSystem, instantEvent, cultivationPlan, requestedSeconds) {
    const eventUpdate = activeCultivationSystem?.commitAutomaticGain?.(state, cultivationPlan);
    const postProcess = handleCultivationRealmBoundary(instantEvent, eventUpdate);
    return {
      gainedPearls: 0,
      processedSeconds: 0,
      remainingSeconds: requestedSeconds,
      eventCommitted: postProcess.eventCommitted,
      requiresReplan: postProcess.eventCommitted,
      discreteEvent: instantEvent
    };
  }

  function advanceGameStep(elapsedSeconds, silentTreasureRolls) {
    const requestedSeconds = Math.max(0, Number(elapsedSeconds) || 0);
    if (!(requestedSeconds > 0)) {
      return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: 0 };
    }
    const activePowerSystem = WIS.Core.Registries.getActivePower(state);
    const activeCultivationSystem = WIS.Core.Registries.getActiveCultivation(state);
    let committedSeconds = nextChallengeTimeBoundarySeconds(requestedSeconds);
    let stepPlan = calculateAutomaticStepPlan(committedSeconds, activePowerSystem, activeCultivationSystem);
    if (stepPlan.cultivation.instantEvent) {
      return commitInstantCultivationEvent(
        activeCultivationSystem,
        stepPlan.cultivation.instantEvent,
        stepPlan.cultivation,
        requestedSeconds
      );
    }
    let discreteEvent = stepPlan.cultivation.event ?? null;
    for (let eventPass = 0; eventPass < 3; eventPass += 1) {
      const plannedCultivationSeconds = stepPlan.cultivation.processedSeconds === undefined
        ? committedSeconds
        : Number(stepPlan.cultivation.processedSeconds);
      const cultivationSeconds = Math.max(0, Math.min(
        committedSeconds,
        Number.isFinite(plannedCultivationSeconds) ? plannedCultivationSeconds : 0
      ));
      const finalPower = add(state.power, stepPlan.power.power);
      const scaleSeconds = nextScaleBoundarySeconds(committedSeconds, activePowerSystem, finalPower);
      const nextCommittedSeconds = Math.min(committedSeconds, cultivationSeconds, scaleSeconds);
      if (!(nextCommittedSeconds > 0)) {
        return {
          gainedPearls: 0,
          processedSeconds: 0,
          remainingSeconds: requestedSeconds,
          eventCommitted: false
        };
      }
      if (nextCommittedSeconds === committedSeconds && stepPlan.cultivation.completed !== false) break;
      committedSeconds = nextCommittedSeconds;
      stepPlan = calculateAutomaticStepPlan(committedSeconds, activePowerSystem, activeCultivationSystem);
      if (stepPlan.cultivation.instantEvent) {
        return commitInstantCultivationEvent(
          activeCultivationSystem,
          stepPlan.cultivation.instantEvent,
          stepPlan.cultivation,
          requestedSeconds
        );
      }
      discreteEvent = stepPlan.cultivation.event ?? null;
    }
    if (stepPlan.cultivation.completed === false) {
      return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: requestedSeconds };
    }

    WIS.Core.Effects.invalidate();
    WIS.Core.Effects.beginTick(state);
    state.reincarnationElapsedSeconds = stepPlan.projection.reincarnationElapsedSeconds;
    state.currentScaleElapsedSeconds = stepPlan.projection.currentScaleElapsedSeconds;
    state.activeChallengeElapsedSeconds = stepPlan.projection.activeChallengeElapsedSeconds;
    activePowerSystem?.commitAutomaticGains?.(state, stepPlan.power);
    const cultivationUpdate = activeCultivationSystem?.commitAutomaticGain?.(
      state,
      stepPlan.cultivation
    );
    if (discreteEvent?.requiresGlobalReplan) WIS.Core.Effects.invalidate();
    const passiveManaRate = Math.max(0, toNumber(
      cultivationUpdate?.rates?.passiveTreasureManaPerSecond
      ?? cultivationUpdate?.rates?.manaPerSecond
    , 0));
    const gainedPearls = Math.max(0, Number(activeCultivationSystem
      ?.rollPassiveManaTreasure?.(committedSeconds, passiveManaRate, silentTreasureRolls)) || 0);
    activePowerSystem?.rollPassiveTreasure?.(state, committedSeconds, silentTreasureRolls);
    activeCultivationSystem?.rollCirculationTreasure?.(state, committedSeconds, silentTreasureRolls);
    activeCultivationSystem?.rollImmortalPowerTreasure?.(
      state,
      cultivationUpdate?.immortalPowerActiveSeconds,
      silentTreasureRolls
    );
    activePowerSystem?.afterStep?.(state, committedSeconds);
    handleCultivationRealmBoundary(discreteEvent, cultivationUpdate);
    updateLifetimeStatistics();
    if (recordCurrentAchievements()) markAchievementsDirty();
    if (!isCultivationRealmBoundaryEvent(discreteEvent) && runAchievementAutomations() > 0) {
      markCostGroupsDirty();
    }
    return {
      gainedPearls,
      processedSeconds: committedSeconds,
      remainingSeconds: Math.max(0, requestedSeconds - committedSeconds),
      eventCommitted: cultivationUpdate?.eventCommitted === true,
      requiresReplan: Boolean(discreteEvent?.requiresGlobalReplan) ||
        committedSeconds + SIMULATION_EPSILON < requestedSeconds,
      discreteEvent
    };
  }

  function advanceGame(elapsedSeconds, { offline = false, clockSeconds = elapsedSeconds } = {}) {
    const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    if (safeElapsed <= 0) return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: 0, remainingClockSeconds: 0 };
    const safeClockSeconds = Math.max(0, Number(clockSeconds) || 0);
    const previousScaleIndex = state.highestScaleIndex;
    let gainedPearls = 0;
    let processedSeconds = 0;
    let remaining = safeElapsed;
    const maxSteps = offline ? OFFLINE_MAX_STEPS : 5000;
    for (let step = 0; step < maxSteps && remaining > SIMULATION_EPSILON; step += 1) {
      const stepSeconds = Math.min(SIMULATION_STEP_SECONDS, remaining);
      const result = advanceGameStep(stepSeconds, offline);
      gainedPearls += result.gainedPearls;
      processedSeconds += result.processedSeconds;
      remaining = Math.max(0, remaining - result.processedSeconds);
      if (result.remainingSeconds > 0) break;
    }
    const processedClockSeconds = safeElapsed > 0
      ? safeClockSeconds * Math.min(1, processedSeconds / safeElapsed)
      : 0;
    state.totalElapsedSeconds += processedClockSeconds;
    if (!offline && state.highestScaleIndex > previousScaleIndex) {
      showScaleNotice(SCALE_THRESHOLDS
        .slice(previousScaleIndex + 1, state.highestScaleIndex + 1)
        .map((scale) => scale.name));
    }
    return {
      gainedPearls,
      processedSeconds,
      remainingSeconds: Math.max(0, safeElapsed - processedSeconds),
      remainingClockSeconds: Math.max(0, safeClockSeconds - processedClockSeconds)
    };
  }

  function offlineProgressSnapshot() {
    return {
      joules: state.joules,
      power: state.power,
      mana: state.mana,
      immortalPower: state.immortalPower,
      pearls: tianNiPearlCount(),
      fitnessCards: fitnessMembershipCardCount(),
      superLollipops: superLollipopCount(),
      skyCrystals: skyCrystalCount(),
      fiveSpiritStones: fiveSpiritStoneCount(),
      baLingChi: baLingChiCount(),
      phantomHeavenMirror: phantomHeavenMirrorCount(),
      mysticHeavenSacredTree: mysticHeavenSacredTreeCount(),
      mysticHeavenSpiritSlayingSword: mysticHeavenSpiritSlayingSwordCount()
    };
  }

  function formatOfflineProgressReport(safeElapsed, before) {
    if (safeElapsed < OFFLINE_NOTICE_MIN_SECONDS) return "";
    const gains = [
      [sub(state.joules, before.joules), "J"],
      [sub(state.power, before.power), "战力"],
      [sub(state.mana, before.mana), "法力"],
      [sub(state.immortalPower, before.immortalPower), "仙灵力"]
    ].filter(([gain]) => gt(gain, ZERO)).map(([gain, name]) => `${format(gain)} ${name}`);
    const pearlGain = tianNiPearlCount() - before.pearls;
    if (pearlGain > 0) gains.push(`${format(pearlGain, 0)}枚仙道·天逆珠`);
    const fitnessCardGain = fitnessMembershipCardCount() - before.fitnessCards;
    if (fitnessCardGain > 0) gains.push(`${format(fitnessCardGain, 0)}张健身房会员卡`);
    const superLollipopGain = superLollipopCount() - before.superLollipops;
    if (superLollipopGain > 0) gains.push(`${format(superLollipopGain, 0)}个超级棒棒糖`);
    const skyCrystalGain = skyCrystalCount() - before.skyCrystals;
    if (skyCrystalGain > 0) gains.push(`${format(skyCrystalGain, 0)}枚天晶`);
    const fiveSpiritStoneGain = fiveSpiritStoneCount() - before.fiveSpiritStones;
    if (fiveSpiritStoneGain > 0) gains.push(`${format(fiveSpiritStoneGain, 0)}枚五灵石`);
    const baLingChiGain = baLingChiCount() - before.baLingChi;
    if (baLingChiGain > 0) gains.push(`${format(baLingChiGain, 0)}柄仙道·八灵尺`);
    const phantomHeavenMirrorGain = phantomHeavenMirrorCount() - before.phantomHeavenMirror;
    if (phantomHeavenMirrorGain > 0) gains.push(`${format(phantomHeavenMirrorGain, 0)}面仙道·幻天镜`);
    const mysticHeavenSacredTreeGain = mysticHeavenSacredTreeCount() - before.mysticHeavenSacredTree;
    if (mysticHeavenSacredTreeGain > 0) gains.push(`${format(mysticHeavenSacredTreeGain, 0)}株仙道·玄天圣树`);
    const mysticHeavenSpiritSlayingSwordGain = mysticHeavenSpiritSlayingSwordCount() - before.mysticHeavenSpiritSlayingSword;
    if (mysticHeavenSpiritSlayingSwordGain > 0) gains.push(`${format(mysticHeavenSpiritSlayingSwordGain, 0)}柄仙道·玄天斩灵剑`);
    return gains.length > 0
      ? `离线 ${formatElapsedTime(safeElapsed)}，获得 ${gains.join("、")}`
      : `离线 ${formatElapsedTime(safeElapsed)}，当前没有可自动获取的资源`;
  }

  function yieldForFirstPaint() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  function catchUpClockNow() {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

  function cancelCatchUp() {
    catchUpGeneration += 1;
    pendingCatchUpSeconds = 0;
    pendingCatchUpClockSeconds = 0;
    livePendingGameSeconds = 0;
    livePendingClockSeconds = 0;
    simulationAccumulator = 0;
    simulationClockAccumulator = 0;
    simulationStepRemainder = 0;
    simulationStepDiscreteEvents = 0;
    catchUpTasks.length = 0;
    catchUpInProgress = false;
    const resolver = catchUpResolver;
    catchUpResolver = null;
    catchUpPromise = null;
    catchUpNoticePromise = null;
    if (resolver) resolver("");
  }

  function appendCatchUpTask(elapsedSeconds, clockSeconds = elapsedSeconds, { alreadyPending = false } = {}) {
    const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    if (!(safeElapsed > 0)) return null;
    const safeClock = Math.max(0, Number(clockSeconds) || 0);
    const shortOffline = safeElapsed <= 60 + SIMULATION_EPSILON;
    const fullFixedSteps = shortOffline
      ? Math.floor((safeElapsed + SIMULATION_EPSILON) / SIMULATION_STEP_SECONDS)
      : 0;
    const fixedCoveredSeconds = fullFixedSteps * SIMULATION_STEP_SECONDS;
    const trailingSeconds = shortOffline
      ? Math.max(0, safeElapsed - fixedCoveredSeconds)
      : 0;
    const hasTrailingStep = trailingSeconds > SIMULATION_EPSILON;
    const stepCount = shortOffline
      ? Math.max(1, fullFixedSteps + (hasTrailingStep ? 1 : 0))
      : OFFLINE_MAX_STEPS;
    const stepGameSeconds = shortOffline
      ? Math.min(SIMULATION_STEP_SECONDS, safeElapsed)
      : safeElapsed / stepCount;
    const finalStepGameSeconds = shortOffline && hasTrailingStep
      ? trailingSeconds
      : stepGameSeconds;
    const clockPerGameSecond = safeElapsed > 0 ? safeClock / safeElapsed : 0;
    const stepClockSeconds = stepGameSeconds * clockPerGameSecond;
    const finalStepClockSeconds = finalStepGameSeconds * clockPerGameSecond;
    const task = {
      gameSeconds: safeElapsed,
      clockSeconds: safeClock,
      stepCount,
      stepGameSeconds,
      stepClockSeconds,
      finalStepGameSeconds,
      finalStepClockSeconds,
      remainingSteps: stepCount,
      currentStepRemaining: stepGameSeconds,
      currentClockRemaining: stepClockSeconds,
      currentOuterStepGameSeconds: stepGameSeconds,
      currentOuterStepClockSeconds: stepClockSeconds,
      currentStepDiscreteEvents: 0
    };
    catchUpTasks.push(task);
    if (!alreadyPending) {
      pendingCatchUpSeconds += safeElapsed;
      pendingCatchUpClockSeconds += safeClock;
    }
    return task;
  }

  function accumulateLiveCatchUp(gameSeconds, clockSeconds) {
    const safeGame = Math.max(0, Number(gameSeconds) || 0);
    const safeClock = Math.max(0, Number(clockSeconds) || 0);
    livePendingGameSeconds += safeGame;
    livePendingClockSeconds += safeClock;
    pendingCatchUpSeconds += safeGame;
    pendingCatchUpClockSeconds += safeClock;
  }

  function flushLivePendingCatchUp(force = false) {
    if (!(livePendingClockSeconds > 0) || (!force && livePendingClockSeconds < 1)) return null;
    const gameSeconds = livePendingGameSeconds;
    const clockSeconds = livePendingClockSeconds;
    livePendingGameSeconds = 0;
    livePendingClockSeconds = 0;
    return appendCatchUpTask(gameSeconds, clockSeconds, { alreadyPending: true });
  }

  function completeCatchUpStep(task) {
    task.remainingSteps -= 1;
    if (task.remainingSteps <= 0) {
      catchUpTasks.shift();
      if (catchUpTasks.length === 0 && !(livePendingClockSeconds > 0)) {
        pendingCatchUpSeconds = 0;
        pendingCatchUpClockSeconds = 0;
      }
      return;
    }
    const finalStep = task.remainingSteps === 1;
    task.currentStepRemaining = finalStep ? task.finalStepGameSeconds : task.stepGameSeconds;
    task.currentClockRemaining = finalStep ? task.finalStepClockSeconds : task.stepClockSeconds;
    task.currentOuterStepGameSeconds = task.currentStepRemaining;
    task.currentOuterStepClockSeconds = task.currentClockRemaining;
    task.currentStepDiscreteEvents = 0;
  }

  function simulateOfflineProgress(elapsedSeconds, clockSeconds = elapsedSeconds) {
    appendCatchUpTask(elapsedSeconds, clockSeconds);
    if (!(pendingCatchUpSeconds > 0)) return Promise.resolve("");
    if (catchUpPromise) return catchUpPromise;

    const generation = ++catchUpGeneration;
    const before = offlineProgressSnapshot();
    const previousAchievements = achievementStates();
    let processedSeconds = 0;
    let processedClockSeconds = 0;
    catchUpInProgress = true;
    catchUpPromise = new Promise((resolve) => { catchUpResolver = resolve; });
    const activePromise = catchUpPromise;

    void (async () => {
      while (generation === catchUpGeneration) {
        flushLivePendingCatchUp(false);
        if (catchUpTasks.length === 0) flushLivePendingCatchUp(true);
        if (catchUpTasks.length === 0) break;
        const frameStartedAt = catchUpClockNow();
        let madeProgress = false;
        do {
          const task = catchUpTasks[0];
          if (!task) break;
          const requestedSeconds = task.currentStepRemaining;
          let result;
          let acceptedSeconds = 0;
          beginAutomaticStepTransaction();
          try {
            result = advanceGameStep(requestedSeconds, true);
            acceptedSeconds = Math.max(0, Math.min(requestedSeconds, result.processedSeconds));
            if (acceptedSeconds > 0) {
              const clockRatio = task.currentOuterStepGameSeconds > 0
                ? task.currentOuterStepClockSeconds / task.currentOuterStepGameSeconds
                : 0;
              const acceptedClockSeconds = Math.min(task.currentClockRemaining, acceptedSeconds * clockRatio);
              state.totalElapsedSeconds += acceptedClockSeconds;
              task.currentStepRemaining = Math.max(0, task.currentStepRemaining - acceptedSeconds);
              task.currentClockRemaining = Math.max(0, task.currentClockRemaining - acceptedClockSeconds);
              pendingCatchUpSeconds = Math.max(0, pendingCatchUpSeconds - acceptedSeconds);
              pendingCatchUpClockSeconds = Math.max(0, pendingCatchUpClockSeconds - acceptedClockSeconds);
              processedSeconds += acceptedSeconds;
              processedClockSeconds += acceptedClockSeconds;
              madeProgress = true;
            }
          } finally {
            endAutomaticStepTransaction();
          }

          if (result?.eventCommitted) {
            task.currentStepDiscreteEvents += 1;
            madeProgress = true;
          }
          if (!(acceptedSeconds > 0) && !result?.eventCommitted) {
            console.warn("WIS catch-up step produced no deterministic progress", { requestedStepSeconds: requestedSeconds });
            break;
          }
          if (task.currentStepDiscreteEvents >= MAX_DISCRETE_EVENTS_PER_STEP &&
              task.currentStepRemaining > SIMULATION_EPSILON) {
            task.currentStepDiscreteEvents = 0;
            break;
          }
          if (task.currentStepRemaining <= SIMULATION_EPSILON) completeCatchUpStep(task);
        } while (catchUpTasks.length > 0 &&
                 catchUpClockNow() - frameStartedAt < CATCH_UP_FRAME_BUDGET_MS);
        if (catchUpTasks.length > 0 || !madeProgress) await yieldForFirstPaint();
      }
      if (generation !== catchUpGeneration) return;
      if (recordCurrentAchievements()) markAchievementsDirty();
      notifyNewAchievements(previousAchievements);
      const report = formatOfflineProgressReport(processedClockSeconds, before);
      const resolver = catchUpResolver;
      catchUpInProgress = false;
      catchUpPromise = null;
      catchUpResolver = null;
      if (resolver) resolver(report);
    })().catch(() => {
      if (generation !== catchUpGeneration) return;
      const resolver = catchUpResolver;
      catchUpInProgress = false;
      catchUpPromise = null;
      catchUpResolver = null;
      if (resolver) resolver("");
    });
    return activePromise;
  }

  function queueCatchUpNotice(elapsedSeconds, clockSeconds = elapsedSeconds) {
    const promise = simulateOfflineProgress(elapsedSeconds, clockSeconds);
    if (promise === catchUpNoticePromise) return;
    catchUpNoticePromise = promise;
    void promise.then((report) => {
      if (catchUpNoticePromise === promise) catchUpNoticePromise = null;
      if (report) showNotice(report, 6000);
      requestRender();
    });
  }

  function runAchievementAutomations() {
    return autoBreakthroughImmortalRealms() + autoUpgradeImmortalAbilities() + autoUpgradeEnhancements();
  }

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
    })
  });

  function addToSimulationAccumulator(gameSeconds, clockSeconds) {
    simulationAccumulator += Math.max(0, Number(gameSeconds) || 0);
    simulationClockAccumulator += Math.max(0, Number(clockSeconds) || 0);
  }

  function flushSimulationAccumulatorToCatchUp() {
    if (!(simulationAccumulator > SIMULATION_EPSILON)) return;
    let gameSeconds = simulationAccumulator;
    let clockSeconds = simulationClockAccumulator;
    const clockPerGameSecond = gameSeconds > 0 ? clockSeconds / gameSeconds : 0;
    simulationAccumulator = 0;
    simulationClockAccumulator = 0;
    if (simulationStepRemainder > SIMULATION_EPSILON) {
      const firstGameSeconds = Math.min(gameSeconds, simulationStepRemainder);
      const firstClockSeconds = firstGameSeconds * clockPerGameSecond;
      appendCatchUpTask(firstGameSeconds, firstClockSeconds);
      gameSeconds = Math.max(0, gameSeconds - firstGameSeconds);
      clockSeconds = Math.max(0, clockSeconds - firstClockSeconds);
      simulationStepRemainder = Math.max(0, simulationStepRemainder - firstGameSeconds);
    }
    if (gameSeconds > SIMULATION_EPSILON) appendCatchUpTask(gameSeconds, clockSeconds);
    queueCatchUpNotice(0, 0);
  }

  function processOnlineSimulationAccumulator() {
    let processedSteps = 0;
    let yieldedForDiscreteEventLimit = false;
    while (processedSteps < MAX_ONLINE_STEPS_PER_FRAME) {
      const requestedStepSeconds = simulationStepRemainder > SIMULATION_EPSILON
        ? simulationStepRemainder
        : SIMULATION_STEP_SECONDS;
      if (simulationAccumulator + SIMULATION_EPSILON < requestedStepSeconds) break;
      const stepClockSeconds = simulationAccumulator > 0
        ? simulationClockAccumulator * (requestedStepSeconds / simulationAccumulator)
        : 0;
      let result;
      let acceptedSeconds = 0;
      beginAutomaticStepTransaction();
      try {
        result = advanceGameStep(requestedStepSeconds, false);
        acceptedSeconds = Math.max(0,
          Math.min(requestedStepSeconds, Number(result.processedSeconds) || 0));
        if (acceptedSeconds > 0) {
          const acceptedClockSeconds = stepClockSeconds * (acceptedSeconds / requestedStepSeconds);
          simulationAccumulator = Math.max(0, simulationAccumulator - acceptedSeconds);
          simulationClockAccumulator = Math.max(0, simulationClockAccumulator - acceptedClockSeconds);
          state.totalElapsedSeconds += acceptedClockSeconds;
        }
      } finally {
        endAutomaticStepTransaction();
      }
      if (result?.eventCommitted) simulationStepDiscreteEvents += 1;
      if (!(acceptedSeconds > 0) && !result?.eventCommitted) break;
      simulationStepRemainder = result.remainingSeconds > SIMULATION_EPSILON
        ? result.remainingSeconds
        : 0;
      if (simulationStepDiscreteEvents >= MAX_DISCRETE_EVENTS_PER_STEP &&
          simulationStepRemainder > 0) {
        simulationStepDiscreteEvents = 0;
        yieldedForDiscreteEventLimit = true;
        break;
      }
      if (simulationStepRemainder <= 0) {
        simulationStepDiscreteEvents = 0;
        processedSteps += 1;
      }
    }
    const nextSimulationStepSeconds = simulationStepRemainder > SIMULATION_EPSILON
      ? simulationStepRemainder
      : SIMULATION_STEP_SECONDS;
    if (!yieldedForDiscreteEventLimit &&
        simulationAccumulator + SIMULATION_EPSILON >= nextSimulationStepSeconds) {
      flushSimulationAccumulatorToCatchUp();
    }
  }

  function runMainTick() {
    const now = Date.now();
    if (!initialLoadComplete) {
      const realElapsedSeconds = Math.max(0, now - lastTickAt) / 1000;
      lastTickAt = now;
      if (catchUpInProgress || pendingCatchUpSeconds > 0) {
        const debugSpeedMultiplier = UI.effectiveDevSpeed();
        accumulateLiveCatchUp(realElapsedSeconds * debugSpeedMultiplier, realElapsedSeconds);
        flushLivePendingCatchUp(false);
      }
      return;
    }
    if (document.hidden) return;
    // 调速按钮被删除后会自动回退为正常速度，因此无需修改存档或其他逻辑。
    const debugSpeedMultiplier = UI.effectiveDevSpeed();
    const realElapsedSeconds = Math.max(0, now - lastTickAt) / 1000;
    lastTickAt = now;
    const previousAchievements = achievementStates();
    if (catchUpInProgress || pendingCatchUpSeconds > 0) {
      accumulateLiveCatchUp(realElapsedSeconds * debugSpeedMultiplier, realElapsedSeconds);
      flushLivePendingCatchUp(false);
      queueCatchUpNotice(0, 0);
    } else {
      addToSimulationAccumulator(realElapsedSeconds * debugSpeedMultiplier, realElapsedSeconds);
      processOnlineSimulationAccumulator();
    }
    notifyNewAchievements(previousAchievements);
    requestRender();
    flushRender(now);
  }

  document.addEventListener("visibilitychange", () => {
    if (!initialLoadComplete) return;
    if (document.hidden) {
      saveState();
      return;
    }
    const now = Date.now();
    const elapsedSeconds = Math.max(0, now - lastTickAt) / 1000;
    lastTickAt = now;
    const debugSpeedMultiplier = UI.effectiveDevSpeed();
    const catchUpGameSeconds = simulationAccumulator + elapsedSeconds * debugSpeedMultiplier;
    const catchUpClockSeconds = simulationClockAccumulator + elapsedSeconds;
    simulationAccumulator = 0;
    simulationClockAccumulator = 0;
    if (simulationStepRemainder > SIMULATION_EPSILON) {
      const clockPerGameSecond = catchUpGameSeconds > 0 ? catchUpClockSeconds / catchUpGameSeconds : 0;
      const firstGameSeconds = Math.min(catchUpGameSeconds, simulationStepRemainder);
      const firstClockSeconds = firstGameSeconds * clockPerGameSecond;
      appendCatchUpTask(firstGameSeconds, firstClockSeconds);
      simulationStepRemainder = Math.max(0, simulationStepRemainder - firstGameSeconds);
      appendCatchUpTask(
        Math.max(0, catchUpGameSeconds - firstGameSeconds),
        Math.max(0, catchUpClockSeconds - firstClockSeconds)
      );
      queueCatchUpNotice(0, 0);
    } else {
      queueCatchUpNotice(catchUpGameSeconds, catchUpClockSeconds);
    }
    requestRender();
    flushRender(now, { force: true });
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

  let initialLoadComplete = false;
  async function finishInitialLoad() {
    const initialOfflineReport = await simulateOfflineProgress(initialOfflineElapsedSeconds);
    lastTickAt = Date.now();
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

  // 先把首屏交给浏览器绘制，再分块结算最多600个离线步骤。
  window.setInterval(runMainTick, LOGIC_INTERVAL_MS);
  const queueInitialOfflineProgress = () => window.setTimeout(() => { void finishInitialLoad(); }, 0);
  if (document.hidden) queueInitialOfflineProgress();
  else window.requestAnimationFrame(queueInitialOfflineProgress);
})();
