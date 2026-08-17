(() => {
  "use strict";

  const CONFIG = WIS.Core.Config;
  const GAME_VERSION = CONFIG.gameVersion;
  const OFFLINE_NOTICE_MIN_SECONDS = CONFIG.offlineNoticeMinSeconds, OFFLINE_MAX_STEPS = CONFIG.offlineMaxSteps;
  const CHALLENGE_DEFINITIONS = CONFIG.challenges;
  const RESOURCE_SOFTCAP_STAGES = CONFIG.softcaps;
  const SCALE_THRESHOLDS = CONFIG.scales;
  const { compact: formatCompact, number: format, cost: formatCost } = WIS.UI.Format;

  let state = loadState();
  let lastTickAt = Date.now();
  let lastRenderAt = 0;
  const LOGIC_INTERVAL_MS = 100;
  const RENDER_INTERVAL_MS = 250;

  const Scale = WIS.Power.ScaleLogic;
  const {
    autoUpgradeEnhancements, fitnessMembershipCardCount, train
  } = Scale;
  const Immortal = WIS.Cultivation.ImmortalLogic;
  const {
    autoBreakthroughImmortalRealms, autoUpgradeImmortalAbilities, breathe, chooseCultivation,
    baLingChiCount, cultivationRealmLevel, explore, grantThreeDeficienciesResetReward,
    minorTribulationPowerExponent, tianNiPearlCount, phantomHeavenMirrorCount,
    mysticHeavenSacredTreeCount, mysticHeavenSpiritSlayingSwordCount
  } = Immortal;
  WIS.Core.Runtime.bind({ state: () => state, setState: (nextState) => { state = nextState; } });
  const {
    definitions: achievementDefinitions, states: achievementStates, recordCurrent: recordCurrentAchievements,
    notifyNew: notifyNewAchievements, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked,
    treasuresUnlocked, challengesUnlocked, statisticsUnlocked, hasCurrent: hasAchievement
  } = WIS.Meta.Achievements;
  const { startChallenge, exitChallenge, checkActiveChallengeCompletion } = WIS.Meta.Challenges;
  const UI = WIS.UI.App.create({
    saveState, simulateOfflineProgress, achievementStates, recordCurrentAchievements, updateLifetimeStatistics, notifyNewAchievements, freshDefaultState, formatCompact, format, formatCost, multiplyEffects, multiplierEffectValue, multiplyEffectGroups, calculateSourceGain, calculateRegionGain, formatMultiplierGroups, formatElapsedTime, formatGameCalendar, resourceSoftcapExponent, formatSoftcapExponent, activeSoftcapStages, removedSoftcapStages, achievementDefinitions, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked, treasuresUnlocked, challengesUnlocked, statisticsUnlocked, hasAchievement, startChallenge, exitChallenge,
    setLastTickAt: (value) => { lastTickAt = value; }
  });
  const { render, ensureAchievementCards, applyTheme, switchPage, showNotice,
    showAchievementNotice, showScaleNotice } = UI;
  WIS.Core.Resources.bind(() => state);
  WIS.Core.Runtime.bind({
    state: () => state,
    setState: (nextState) => { state = nextState; },
    save: saveState,
    render,
    showNotice,
    switchPage,
    showAchievementNotice,
    achievementStates,
    notifyNewAchievements,
    cultivationUnlocked,
    treasuresUnlocked,
    applyResourceSoftcap,
    resourceSoftcapExponent,
    updateLifetimeStatistics,
    showScaleNotice,
    checkActiveChallengeCompletion,
    cultivationRealmLevel,
    minorTribulationPowerExponent,
    format,
    freshState: freshDefaultState,
    resetTransientAccumulators: () => {
      WIS.Power.Scale.resetTransient?.();
      WIS.Cultivation.Immortal.resetTransient?.();
    },
    resetCultivationPage: UI.resetCultivationPage,
    grantThreeDeficienciesResetReward
  });

  function softcapStageExponent(amount, stage) {
    if (amount <= stage.threshold) return 1;
    const overflowOrders = Math.log10(amount / stage.threshold);
    const pressure = stage.strength * overflowOrders + stage.growth * Math.pow(overflowOrders, 1.5);
    return 1 / (1 + pressure);
  }

  function resourceSoftcapExponent(currentAmount) {
    const amount = Math.max(0, currentAmount);
    const realmLevel = cultivationRealmLevel();
    return RESOURCE_SOFTCAP_STAGES.reduce((exponent, stage) => {
      if (stage.removedAtRealm !== null && realmLevel >= stage.removedAtRealm) return exponent;
      return exponent * softcapStageExponent(amount, stage);
    }, 1);
  }

  function applyResourceSoftcap(rawGain, currentAmount) {
    const gain = Math.max(0, Number(rawGain) || 0);
    if (gain <= 0) return 0;
    const exponent = resourceSoftcapExponent(currentAmount);
    if (exponent >= 1) return gain;
    if (exponent <= 0) return 0;
    return Math.expm1(exponent * Math.log1p(gain));
  }

  function formatSoftcapExponent(exponent) {
    return exponent >= 0.001 ? exponent.toFixed(3) : exponent.toExponential(2);
  }

  function activeSoftcapStages(currentAmount) {
    const realmLevel = cultivationRealmLevel();
    const names = RESOURCE_SOFTCAP_STAGES
      .filter((stage) => currentAmount > stage.threshold && (stage.removedAtRealm === null || realmLevel < stage.removedAtRealm))
      .map((stage) => stage.name);
    return names.length > 0 ? names.join("、") : "未触发";
  }

  function removedSoftcapStages() {
    const realmLevel = cultivationRealmLevel();
    const names = RESOURCE_SOFTCAP_STAGES
      .filter((stage) => stage.removedAtRealm !== null && realmLevel >= stage.removedAtRealm)
      .map((stage) => stage.name);
    return names.length > 0 ? names.join("、") : "无";
  }

  function freshDefaultState() {
    return WIS.Core.State.fresh();
  }

  function loadState() {
    const saved = WIS.Core.Save.read();
    return saved ? WIS.Core.State.migrate(saved.schemaVersion, saved.data) : freshDefaultState();
  }

  function saveState() {
    recordCurrentAchievements();
    updateLifetimeStatistics();
    // 记录游戏状态已经推进到的时间点，避免页面冻结后保存吞掉尚未结算的离线时间。
    state.lastUpdateAt = lastTickAt;
    WIS.Core.Save.write(state);
  }

  function multiplyEffects(effects) {
    return effects.reduce((product, effect) => product * multiplierEffectValue(effect), 1);
  }

  function multiplierEffectValue(effect) {
    return typeof effect === "object" && effect !== null ? Number(effect.value) || 0 : Number(effect) || 0;
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
        return `${effectName} ×${multiplierEffectValue(effect).toFixed(2)}`;
      }).join("、")}`)
      .join("；");
  }

  function updateLifetimeStatistics() {
    state.lifetimeHighestJ = Math.max(state.lifetimeHighestJ, state.joules);
    state.lifetimeHighestPower = Math.max(state.lifetimeHighestPower, state.power, state.highestPower);
    state.lifetimeHighestScaleIndex = Math.max(state.lifetimeHighestScaleIndex, state.highestScaleIndex);
    state.lifetimeHighestMana = Math.max(state.lifetimeHighestMana, state.mana);
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

  function advanceGameStep(elapsedSeconds, silentTreasureRolls) {
    if (state.activeChallenge === "longevity") {
      state.activeChallengeElapsedSeconds = Math.min(
        CHALLENGE_DEFINITIONS.longevity.timeToLimitSeconds,
        state.activeChallengeElapsedSeconds + elapsedSeconds
      );
    }
    const activePowerSystem = WIS.Core.Registries.getActivePower(state);
    const activeCultivationSystem = WIS.Core.Registries.getActiveCultivation(state);
    activePowerSystem?.update(state, elapsedSeconds);
    const cultivationUpdate = activeCultivationSystem?.update(state, elapsedSeconds);
    const passiveManaRate = Math.max(0, Number(
      cultivationUpdate?.rates?.passiveTreasureManaPerSecond
      ?? cultivationUpdate?.rates?.manaPerSecond
    ) || 0);
    const gainedPearls = Math.max(0, Number(activeCultivationSystem
      ?.rollPassiveManaTreasure?.(elapsedSeconds, passiveManaRate, silentTreasureRolls)) || 0);
    activePowerSystem?.rollPassiveTreasure?.(state, elapsedSeconds, silentTreasureRolls);
    activeCultivationSystem?.rollCirculationTreasure?.(state, elapsedSeconds, silentTreasureRolls);
    activePowerSystem?.afterStep?.(state, elapsedSeconds);
    updateLifetimeStatistics();
    recordCurrentAchievements();
    runAchievementAutomations();
    return gainedPearls;
  }

  function advanceGame(elapsedSeconds, { offline = false, clockSeconds = elapsedSeconds } = {}) {
    const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    if (safeElapsed <= 0) return 0;
    state.totalElapsedSeconds += Math.max(0, Number(clockSeconds) || 0);
    const preferredStep = offline ? 1 : 0.25;
    const maxSteps = offline ? OFFLINE_MAX_STEPS : 5000;
    const steps = Math.min(maxSteps, Math.max(1, Math.ceil(safeElapsed / preferredStep)));
    const stepSeconds = safeElapsed / steps;
    const previousScaleIndex = state.highestScaleIndex;
    let gainedPearls = 0;
    for (let step = 0; step < steps; step += 1) {
      gainedPearls += advanceGameStep(stepSeconds, offline);
    }
    if (!offline && state.highestScaleIndex > previousScaleIndex) {
      showScaleNotice(SCALE_THRESHOLDS
        .slice(previousScaleIndex + 1, state.highestScaleIndex + 1)
        .map((scale) => scale.name));
    }
    return gainedPearls;
  }

  function simulateOfflineProgress(elapsedSeconds) {
    const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    if (safeElapsed <= 0) return "";
    const shouldReport = safeElapsed >= OFFLINE_NOTICE_MIN_SECONDS;
    const before = {
      joules: state.joules,
      power: state.power,
      mana: state.mana,
      pearls: tianNiPearlCount(),
      fitnessCards: fitnessMembershipCardCount(),
      baLingChi: baLingChiCount(),
      phantomHeavenMirror: phantomHeavenMirrorCount(),
      mysticHeavenSacredTree: mysticHeavenSacredTreeCount(),
      mysticHeavenSpiritSlayingSword: mysticHeavenSpiritSlayingSwordCount()
    };
    advanceGame(safeElapsed, { offline: true });
    recordCurrentAchievements();
    if (!shouldReport) return "";
    const gains = [
      [state.joules - before.joules, "J"],
      [state.power - before.power, "战力"],
      [state.mana - before.mana, "法力"]
    ].filter(([gain]) => gain > 0).map(([gain, name]) => `${format(gain)} ${name}`);
    const pearlGain = tianNiPearlCount() - before.pearls;
    if (pearlGain > 0) gains.push(`${format(pearlGain, 0)}枚仙道·天逆珠`);
    const fitnessCardGain = fitnessMembershipCardCount() - before.fitnessCards;
    if (fitnessCardGain > 0) gains.push(`${format(fitnessCardGain, 0)}张健身房会员卡`);
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

  function runAchievementAutomations() {
    return autoBreakthroughImmortalRealms() + autoUpgradeImmortalAbilities() + autoUpgradeEnhancements();
  }

  UI.bindEvents();

  const initialAchievementStates = achievementStates();
  const initialOfflineReport = simulateOfflineProgress((Date.now() - state.lastUpdateAt) / 1000);
  lastTickAt = Date.now();

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

  function runMainTick() {
    if (document.hidden) return;
    const now = Date.now();
    // 调速按钮被删除后会自动回退为正常速度，因此无需修改存档或其他逻辑。
    const debugSpeedMultiplier = UI.getDebugSpeedMultiplier();
    const realElapsedSeconds = Math.max(0, now - lastTickAt) / 1000;
    lastTickAt = now;
    const previousAchievements = achievementStates();
    let offlineReport = "";
    if (realElapsedSeconds > 1) {
      offlineReport = simulateOfflineProgress(realElapsedSeconds);
    } else {
      advanceGame(realElapsedSeconds * debugSpeedMultiplier, { clockSeconds: realElapsedSeconds });
    }
    notifyNewAchievements(previousAchievements);
    if (now - lastRenderAt >= RENDER_INTERVAL_MS) {
      render();
      lastRenderAt = now;
    }
    if (offlineReport) showNotice(offlineReport, 6000);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      saveState();
      return;
    }
    const now = Date.now();
    const elapsedSeconds = Math.max(0, now - lastTickAt) / 1000;
    lastTickAt = now;
    const previousAchievements = achievementStates();
    const offlineReport = simulateOfflineProgress(elapsedSeconds);
    notifyNewAchievements(previousAchievements);
    render();
    lastRenderAt = now;
    if (offlineReport) showNotice(offlineReport, 6000);
  });

  window.setInterval(runMainTick, LOGIC_INTERVAL_MS);
  window.setInterval(() => {
    if (!document.hidden) saveState();
  }, 5000);

  ensureAchievementCards();
  applyTheme();
  switchPage("actions");
  render();
  lastRenderAt = Date.now();
  saveState();
  notifyNewAchievements(initialAchievementStates);
  if (initialOfflineReport) showNotice(initialOfflineReport, 6000);
})();
