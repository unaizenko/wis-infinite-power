(() => {
  "use strict";

  const SAVE_KEY = "wis-infinite-power-save-v2";
  const GYM_COST = 20;
  const EXERCISE_COST = 50;
  const TRANSCENDENT_COST = 500;
  const FOCUS_COST = 150;
  const EXTREME_EXERCISE_COST = 1000;
  const WATER_COST = 20000;
  const GHOST_BRAIN_COST = 50000;
  const NATURAL_STRENGTH_COST = 10000;
  const MENTAL_POWER_COST = 100000;
  const LIFE_POWER_COST = 200000;
  const MY_STYLE_COST = 2e7;
  const INTUITION_COST = 5e7;
  const SONIC_MOVEMENT_COST = 1e8;
  const ROCK_BASE_COST = 5000;
  const ROCK_BASE_LEVEL_CAP = 10;
  const QI_REFINING_COST = 10000;
  const FOUNDATION_BASE_COST = 200;
  const GOLDEN_CORE_BASE_COST = 8000;
  const ADVANCED_REALMS = [
    { key: "nascentSoul", slug: "nascent-soul", name: "元婴", baseCost: 4e7 },
    { key: "spiritTransformation", slug: "spirit-transformation", name: "化神", baseCost: 3e12 },
    { key: "voidRefinement", slug: "void-refinement", name: "炼虚", baseCost: 4e15 },
    { key: "bodyIntegration", slug: "body-integration", name: "合体", baseCost: 2e18 },
    { key: "mahayana", slug: "mahayana", name: "大乘", baseCost: 2e20 },
    { key: "trueImmortal", slug: "true-immortal", name: "真仙", baseCost: 3e23 },
    { key: "goldenImmortal", slug: "golden-immortal", name: "金仙", baseCost: 3e25 },
    { key: "taiyi", slug: "taiyi", name: "太乙", baseCost: 4e27 },
    { key: "daluo", slug: "daluo", name: "大罗", baseCost: 2e30 },
    { key: "daoAncestor", slug: "dao-ancestor", name: "道祖", baseCost: 2e39 }
  ];
  const IMMORTAL_LIFE_COST = 80;
  const CIRCULATION_COST = 400;
  const MANA_LIQUEFACTION_COST = 800;
  const LONGEVITY_COSTS = [200, 600];
  const GOLDEN_CORE_LONGEVITY_COSTS = [10000, 40000];
  const MANA_SOLIDIFICATION_COST = 16000;
  const TECHNIQUE_COST = 1200;
  const MAGIC_TREASURE_COST = 30000;
  const EXPLORATION_POWER_COST = 10000000;
  const EXPLORATION_BASE_MANA = 5000;
  const OFFLINE_NOTICE_MIN_SECONDS = 10;
  const OFFLINE_MAX_STEPS = 20000;
  const SCATTER_RETAINED_UPGRADE_TIERS = ["", "普通人", "爆砖及之前", "爆墙及之前"];
  const RESOURCE_SOFTCAP_STAGES = [
    { name: "爆墙", threshold: 4184, strength: 0.02, removedAtRealm: 1, removedBy: "炼气" },
    { name: "爆屋", threshold: 8368000, strength: 0.02, removedAtRealm: 2, removedBy: "筑基" },
    { name: "爆楼", threshold: 418400000, strength: 0.02, removedAtRealm: 3, removedBy: "结丹" },
    { name: "爆街", threshold: 4.184e10, strength: 0.1, removedAtRealm: 4, removedBy: "元婴" },
    { name: "爆城", threshold: 3.033e15, strength: 0.1, removedAtRealm: 5, removedBy: "化神" },
    { name: "爆国", threshold: 2.092e20, strength: 0.1, removedAtRealm: 7, removedBy: "合体" },
    { name: "爆大陆", threshold: 8.368e22, strength: 0.1, removedAtRealm: 8, removedBy: "大乘" },
    { name: "地表", threshold: 3.2e25, strength: 0.1, removedAtRealm: 9, removedBy: "真仙" },
    { name: "爆星", threshold: 2.24e31, strength: 0.1, removedAtRealm: 12, removedBy: "大罗" },
    { name: "恒星", threshold: 2.28e40, strength: 0.1, removedAtRealm: 13, removedBy: "道祖" },
    { name: "星系", threshold: 3e52, strength: 0.1, removedAtRealm: null, removedBy: null },
    { name: "超星系团", threshold: 2.565e57, strength: 0.1, removedAtRealm: null, removedBy: null },
    { name: "宇宙结构", threshold: 3e68, strength: 0.1, removedAtRealm: null, removedBy: null }
  ];
  const BREATHING_REALM_CONFIGS = [
    null,
    { base: 1.25, manaScale: 200 },
    { base: 2, manaScale: 8000 },
    { base: 3, manaScale: ADVANCED_REALMS[0].baseCost },
    ...ADVANCED_REALMS.map((realm, index) => ({
      base: 3 * Math.pow(1.5, index + 1),
      manaScale: ADVANCED_REALMS[index + 1]?.baseCost ?? realm.baseCost
    }))
  ];
  const SCALE_THRESHOLDS = [
    { name: "普通人", power: 0 },
    { name: "爆砖", power: 200 },
    { name: "爆墙", power: 4184 },
    { name: "爆屋", power: 8368000 },
    { name: "爆楼", power: 418400000 },
    { name: "爆街", power: 4.184e10 },
    { name: "爆城", power: 3.033e15 },
    { name: "爆国", power: 2.092e20 },
    { name: "爆大陆", power: 8.368e22 },
    { name: "地表", power: 3.2e25 },
    { name: "爆星", power: 2.24e31 },
    { name: "恒星", power: 2.28e40 },
    { name: "星系", power: 3e52 },
    { name: "超星系团", power: 2.565e57 },
    { name: "宇宙结构", power: 3e68 }
  ];

  const defaultState = {
    joules: 0,
    power: 0,
    highestPower: 0,
    totalPower: 0,
    maxSinglePowerGain: 0,
    brickUnlocked: false,
    wallUnlocked: false,
    highestScaleIndex: 0,
    runningLevel: 0,
    gymPurchased: false,
    exercisePurchased: false,
    transcendentPurchased: false,
    focusPurchased: false,
    extremeExercisePurchased: false,
    rockLevel: 0,
    waterPurchased: false,
    ghostBrainPurchased: false,
    naturalStrengthPurchased: false,
    mentalPowerPurchased: false,
    lifePowerPurchased: false,
    myStylePurchased: false,
    intuitionPurchased: false,
    sonicMovementPurchased: false,
    ghostBackActive: false,
    cultivationSystem: null,
    mana: 0,
    qiRefiningUnlocked: false,
    immortalLifeUnlocked: false,
    foundationUnlocked: false,
    goldenCoreUnlocked: false,
    advancedRealmLevel: 0,
    circulationUnlocked: false,
    manaLiquefactionUnlocked: false,
    longevityLevel: 0,
    goldenCoreLongevityLevel: 0,
    manaSolidificationUnlocked: false,
    techniqueUnlocked: false,
    magicTreasureUnlocked: false,
    scatterRebuildLevel: 0,
    naturalTreasureLevel: 0,
    unlockedAchievements: {},
    treasureImprints: { tianNiPearl: 0, mysteriousGreenBottle: 0, fuBao: 0 },
    hideUnlockedAchievements: false,
    theme: "light",
    lastUpdateAt: Date.now()
  };

  let passiveManaRollAccumulator = 0;
  let state = loadState();
  let activePage = "actions";
  let activeCultivationPage = "realms";
  let noticeTimer;
  let achievementNoticeTimer;
  let scaleNoticeTimer;
  let lastTickAt = Date.now();

  const byId = (id) => document.getElementById(id);

  function cultivationRealmLevel() {
    if (state.goldenCoreUnlocked) return 3 + state.advancedRealmLevel;
    if (state.foundationUnlocked) return 2;
    if (state.qiRefiningUnlocked) return 1;
    return 0;
  }

  function resourceSoftcapMultiplier(currentAmount) {
    const amount = Math.max(0, currentAmount);
    const realmLevel = cultivationRealmLevel();
    return RESOURCE_SOFTCAP_STAGES.reduce((multiplier, stage) => {
      if (stage.removedAtRealm !== null && realmLevel >= stage.removedAtRealm) return multiplier;
      if (amount <= stage.threshold) return multiplier;
      return multiplier * Math.pow(amount / stage.threshold, -stage.strength);
    }, 1);
  }

  function applyResourceSoftcap(rawGain, currentAmount) {
    return rawGain * resourceSoftcapMultiplier(currentAmount);
  }

  function formatSoftcapMultiplier(multiplier) {
    return multiplier >= 0.001 ? multiplier.toFixed(3) : multiplier.toExponential(2);
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
    return {
      ...defaultState,
      unlockedAchievements: {},
      treasureImprints: { tianNiPearl: 0, mysteriousGreenBottle: 0, fuBao: 0 },
      lastUpdateAt: Date.now()
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      return saved ? normalizeState(saved) : freshDefaultState();
    } catch {
      return freshDefaultState();
    }
  }

  function normalizeState(input) {
    const source = input && typeof input === "object" ? input : {};
    const migratedRunningLevel = Number.isFinite(Number(source.runningLevel))
      ? Number(source.runningLevel)
      : source.runningPurchased ? 1 : 0;
    const power = Math.max(0, Number(source.power) || 0);
    const savedScaleIndex = Number.isFinite(Number(source.highestScaleIndex))
      ? Math.floor(Number(source.highestScaleIndex))
      : source.wallUnlocked ? 2 : source.brickUnlocked ? 1 : 0;
    const highestScaleIndex = Math.max(0, Math.min(
      SCALE_THRESHOLDS.length - 1,
      Math.max(savedScaleIndex, scaleIndexForPower(power))
    ));
    const cultivationSystem = source.cultivationSystem === "仙道" ? "仙道" : null;
    const qiRefiningUnlocked = cultivationSystem === "仙道" && source.qiRefiningUnlocked === true;
    const foundationUnlocked = qiRefiningUnlocked && source.foundationUnlocked === true;
    const goldenCoreUnlocked = foundationUnlocked && source.goldenCoreUnlocked === true;
    const advancedRealmLevel = goldenCoreUnlocked
      ? Math.max(0, Math.min(ADVANCED_REALMS.length, Math.floor(Number(source.advancedRealmLevel) || 0)))
      : 0;
    const maxSinglePowerGain = Math.max(0, Math.floor(Number(source.maxSinglePowerGain) || 0));
    const totalPower = Math.max(power, Number(source.totalPower) || 0);
    const unlockedAchievements = {};
    if (source.unlockedAchievements && typeof source.unlockedAchievements === "object") {
      Object.entries(source.unlockedAchievements).forEach(([key, unlocked]) => {
        if (unlocked === true) unlockedAchievements[key] = true;
      });
    }
    if (totalPower >= 1) unlockedAchievements.powerOne = true;
    if (totalPower >= 5) unlockedAchievements.five = true;
    if (highestScaleIndex >= 1) unlockedAchievements.brick = true;
    if (maxSinglePowerGain >= 200) unlockedAchievements.trueBrick = true;
    if (qiRefiningUnlocked) unlockedAchievements.aspireImmortality = true;
    if (foundationUnlocked) unlockedAchievements.daoFoundation = true;
    if (goldenCoreUnlocked) unlockedAchievements.goldenCore = true;
    SCALE_THRESHOLDS.slice(2).forEach((scale, offset) => {
      const scaleIndex = offset + 2;
      if (highestScaleIndex >= scaleIndex) unlockedAchievements[`scale${scaleIndex}`] = true;
      if (maxSinglePowerGain >= scale.power) unlockedAchievements[`trueScale${scaleIndex}`] = true;
    });
    const savedRockLevelCap = ROCK_BASE_LEVEL_CAP + (unlockedAchievements.trueScale2 ? 20 : 0);
    return {
      joules: Math.max(0, Number(source.joules) || 0),
      power,
      highestPower: Math.max(power, Number(source.highestPower) || 0),
      totalPower,
      maxSinglePowerGain,
      brickUnlocked: highestScaleIndex >= 1,
      wallUnlocked: highestScaleIndex >= 2,
      highestScaleIndex,
      runningLevel: Math.max(0, Math.floor(migratedRunningLevel)),
      gymPurchased: source.gymPurchased === true,
      exercisePurchased: source.exercisePurchased === true,
      transcendentPurchased: source.transcendentPurchased === true,
      focusPurchased: source.focusPurchased === true,
      extremeExercisePurchased: source.extremeExercisePurchased === true,
      rockLevel: Math.max(0, Math.min(savedRockLevelCap, Math.floor(Number(source.rockLevel) || 0))),
      waterPurchased: source.waterPurchased === true,
      ghostBrainPurchased: source.ghostBrainPurchased === true,
      naturalStrengthPurchased: source.naturalStrengthPurchased === true,
      mentalPowerPurchased: source.mentalPowerPurchased === true,
      lifePowerPurchased: source.lifePowerPurchased === true,
      myStylePurchased: source.myStylePurchased === true,
      intuitionPurchased: source.intuitionPurchased === true,
      sonicMovementPurchased: source.sonicMovementPurchased === true,
      ghostBackActive: highestScaleIndex >= 3 && source.ghostBackActive === true,
      cultivationSystem,
      mana: qiRefiningUnlocked ? Math.max(0, Number(source.mana) || 0) : 0,
      qiRefiningUnlocked,
      immortalLifeUnlocked: source.immortalLifeUnlocked === true,
      foundationUnlocked,
      goldenCoreUnlocked,
      advancedRealmLevel,
      circulationUnlocked: source.circulationUnlocked === true,
      manaLiquefactionUnlocked: source.manaLiquefactionUnlocked === true,
      longevityLevel: Math.max(0, Math.min(2, Math.floor(Number(source.longevityLevel) || 0))),
      goldenCoreLongevityLevel: Math.max(0, Math.min(2, Math.floor(Number(source.goldenCoreLongevityLevel) || 0))),
      manaSolidificationUnlocked: source.manaSolidificationUnlocked === true,
      techniqueUnlocked: source.techniqueUnlocked === true,
      magicTreasureUnlocked: source.magicTreasureUnlocked === true,
      scatterRebuildLevel: Math.max(0, Math.min(3, Math.floor(Number(source.scatterRebuildLevel) || 0))),
      naturalTreasureLevel: Math.max(0, Math.min(10, Math.floor(Number(source.naturalTreasureLevel) || 0))),
      unlockedAchievements,
      treasureImprints: {
        tianNiPearl: Math.max(0, Math.floor(Number(source.treasureImprints?.tianNiPearl) || 0)),
        mysteriousGreenBottle: Math.max(0, Math.floor(Number(source.treasureImprints?.mysteriousGreenBottle) || 0)),
        fuBao: Math.max(0, Math.floor(Number(source.treasureImprints?.fuBao) || 0))
      },
      hideUnlockedAchievements: source.hideUnlockedAchievements === true,
      theme: source.theme === "dark" ? "dark" : "light",
      lastUpdateAt: Number.isFinite(Number(source.lastUpdateAt)) && Number(source.lastUpdateAt) > 0
        ? Number(source.lastUpdateAt)
        : Date.now()
    };
  }

  function saveState() {
    recordCurrentAchievements();
    state.lastUpdateAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.checked = input.value === state.theme;
    });
  }

  function exportSave() {
    saveState();
    const payload = {
      game: "WIS-无限战力系统",
      version: 20,
      exportedAt: new Date().toISOString(),
      data: state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    anchor.href = url;
    anchor.download = `WIS-存档-${timestamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showNotice("存档已导出");
  }

  async function importSave(file) {
    try {
      const parsed = JSON.parse(await file.text());
      state = normalizeState(parsed?.data ?? parsed);
      passiveManaRollAccumulator = 0;
      const previousAchievements = achievementStates();
      const offlineReport = simulateOfflineProgress((Date.now() - state.lastUpdateAt) / 1000);
      lastTickAt = Date.now();
      saveState();
      applyTheme();
      if ((activePage === "upgrades" && !upgradesUnlocked()) ||
          (activePage === "achievements" && !achievementsUnlocked()) ||
          (activePage === "cultivation" && !cultivationUnlocked()) ||
          (activePage === "treasures" && !treasuresUnlocked())) {
        switchPage("actions");
      }
      render();
      byId("settings-dialog").close();
      showNotice("存档已导入");
      notifyNewAchievements(previousAchievements);
      if (offlineReport) window.setTimeout(() => showNotice(offlineReport, 6000), 1500);
    } catch {
      showNotice("导入失败：文件内容无效");
    }
  }

  function resetGame() {
    if (!window.confirm("确定要清空全部游戏进度和个性化设置吗？")) return;
    state = freshDefaultState();
    passiveManaRollAccumulator = 0;
    lastTickAt = Date.now();
    activePage = "actions";
    activeCultivationPage = "realms";
    localStorage.removeItem(SAVE_KEY);
    applyTheme();
    switchPage("actions");
    render();
    saveState();
    byId("settings-dialog").close();
    showNotice("游戏已重置");
  }

  function formatCompact(value, divisor, suffix) {
    const scaled = value / divisor;
    const rounded = Math.abs(scaled) >= 999.995
      ? Math.sign(scaled) * 999.99
      : Number(scaled.toFixed(2));
    return `${rounded}${suffix}`;
  }

  function format(value, maximumFractionDigits = 2) {
    if (Math.abs(value) >= 1e9) return value.toExponential(2).replace("e+", "e");
    if (Math.abs(value) >= 1e6) return formatCompact(value, 1e6, "M");
    if (Math.abs(value) >= 1e3) return formatCompact(value, 1e3, "k");
    if (maximumFractionDigits === 0 || Number.isInteger(value)) {
      return Math.round(value).toLocaleString("zh-CN");
    }
    return value.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function gymPotentialMultiplier() {
    return 1.25 + Math.log10(1 + Math.max(0, state.power)) * 0.5;
  }

  function gymMultiplier() {
    return state.gymPurchased ? gymPotentialMultiplier() * sonicMovementMultiplier() : 1;
  }

  function sonicMovementMultiplier() {
    return state.sonicMovementPurchased ? 1.5 : 1;
  }

  function scaleIndexForPower(power) {
    let index = 0;
    for (let i = 1; i < SCALE_THRESHOLDS.length; i += 1) {
      if (power < SCALE_THRESHOLDS[i].power) break;
      index = i;
    }
    return index;
  }

  function updateScaleProgress(notify = true) {
    const previousScaleIndex = state.highestScaleIndex;
    state.highestPower = Math.max(state.highestPower, state.power);
    state.highestScaleIndex = Math.max(state.highestScaleIndex, scaleIndexForPower(state.power));
    state.brickUnlocked = state.highestScaleIndex >= 1;
    state.wallUnlocked = state.highestScaleIndex >= 2;
    if (notify && state.highestScaleIndex > previousScaleIndex) {
      const enteredScales = SCALE_THRESHOLDS
        .slice(previousScaleIndex + 1, state.highestScaleIndex + 1)
        .map((scale) => scale.name);
      showScaleNotice(enteredScales);
    }
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

  function rollTianNiPearlAttempts(attempts, silent = false) {
    let remainingAttempts = Math.max(0, Math.floor(attempts));
    if (remainingAttempts <= 0 || !treasuresUnlocked() || !hasAchievement("daoFoundation")) return 0;

    if (!silent && remainingAttempts <= 120) {
      let gained = 0;
      while (remainingAttempts > 0) {
        remainingAttempts -= 1;
        if (tryTianNiPearl()) gained += 1;
      }
      return gained;
    }

    let gained = 0;
    while (remainingAttempts > 0) {
      const probability = tianNiPearlChance();
      if (probability <= 0) break;
      const attemptsUntilSuccess = probability >= 1
        ? 1
        : Math.floor(Math.log(1 - Math.random()) / Math.log(1 - probability)) + 1;
      if (attemptsUntilSuccess > remainingAttempts) break;
      remainingAttempts -= attemptsUntilSuccess;
      state.treasureImprints.tianNiPearl += 1;
      gained += 1;
    }

    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得宝物烙印：天逆珠 +${gained}`);
    }
    return gained;
  }

  function advanceGameStep(elapsedSeconds, silentTreasureRolls) {
    state.joules += automaticJPerSecond() * elapsedSeconds;
    const passivePower = automaticPowerPerSecond() * elapsedSeconds;
    state.power += passivePower;
    state.totalPower += passivePower;
    const passiveManaRate = automaticManaPerSecond();
    state.mana += passiveManaRate * elapsedSeconds;

    let gainedPearls = 0;
    if (passiveManaRate > 0) {
      passiveManaRollAccumulator += elapsedSeconds;
      const rollAttempts = Math.floor(passiveManaRollAccumulator);
      passiveManaRollAccumulator -= rollAttempts;
      gainedPearls = rollTianNiPearlAttempts(rollAttempts, silentTreasureRolls);
    } else {
      passiveManaRollAccumulator = 0;
    }
    updateScaleProgress(false);
    recordCurrentAchievements();
    return gainedPearls;
  }

  function advanceGame(elapsedSeconds, { offline = false } = {}) {
    const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
    if (safeElapsed <= 0) return 0;
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
      pearls: tianNiPearlCount()
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
    if (pearlGain > 0) gains.push(`${format(pearlGain, 0)}枚天逆珠`);
    return gains.length > 0
      ? `离线 ${formatElapsedTime(safeElapsed)}，获得 ${gains.join("、")}`
      : `离线 ${formatElapsedTime(safeElapsed)}，当前没有可自动获取的资源`;
  }

  function exercisePotentialMultiplier() {
    return 1.1 + Math.log10(1 + Math.max(0, state.joules)) * 0.1;
  }

  function exerciseMultiplier() {
    return state.exercisePurchased ? exercisePotentialMultiplier() * extremeExerciseEffectMultiplier() : 1;
  }

  function transcendentPotentialMultiplier() {
    return 1 + Math.log10(1 + Math.max(0, state.power)) * 0.15;
  }

  function transcendentMultiplier() {
    return state.transcendentPurchased ? transcendentPotentialMultiplier() : 1;
  }

  function extremeExerciseEffectMultiplier() {
    return state.extremeExercisePurchased ? 1.5 : 1;
  }

  function naturalStrengthPotentialMultiplier() {
    return 1 + Math.log10(1 + Math.max(0, state.joules)) * 0.15;
  }

  function naturalStrengthMultiplier() {
    return state.naturalStrengthPurchased ? naturalStrengthPotentialMultiplier() : 1;
  }

  function powerMultiplier() {
    const achievementMultiplier = hasAchievement("five") ? 1.05 : 1;
    return achievementMultiplier * transcendentMultiplier() * naturalStrengthMultiplier() * immortalLifePowerMultiplier() * manaSolidificationPowerMultiplier() * ghostBackPowerMultiplier();
  }

  function ghostBackPowerMultiplier() {
    return state.ghostBackActive ? 1.75 : 1;
  }

  function ghostBackJMultiplier() {
    return state.ghostBackActive ? 0.75 : 1;
  }

  function immortalLifePowerMultiplier() {
    return state.immortalLifeUnlocked ? 0.95 : 1;
  }

  function manaSolidificationPowerMultiplier() {
    return state.manaSolidificationUnlocked ? 1.15 : 1;
  }

  function automaticJPerSecond() {
    const baseGain = 1 + fitnessJBonus() + achievementJBonus() + manaJBonus();
    const rawGain = (baseGain + waterJBonus()) * gymMultiplier() * exerciseMultiplier() * manaLiquefactionJMultiplier() * ghostBackJMultiplier();
    return applyResourceSoftcap(rawGain, state.joules);
  }

  function longevityFitnessMultiplier() {
    return Math.pow(1.5, state.longevityLevel) *
      Math.pow(2, state.goldenCoreLongevityLevel) *
      lifePowerFitnessMultiplier() *
      myStyleFitnessMultiplier();
  }

  function lifePowerFitnessMultiplier() {
    return state.lifePowerPurchased ? 1.5 : 1;
  }

  function myStylePotentialFitnessMultiplier() {
    return 1 + Math.log10(1 + Math.max(0, state.joules)) * 0.05;
  }

  function myStyleFitnessMultiplier() {
    return state.myStylePurchased ? myStylePotentialFitnessMultiplier() : 1;
  }

  function fitnessJBonus() {
    return state.runningLevel * longevityFitnessMultiplier();
  }

  function manaLiquefactionJMultiplier() {
    return state.manaLiquefactionUnlocked ? 1.15 : 1;
  }

  function manaJBonus() {
    if (!state.qiRefiningUnlocked) return 0;
    return manaJRawBonus();
  }

  function manaJRawBonus() {
    return state.qiRefiningUnlocked ? 10 * Math.pow(Math.max(0, state.mana), 0.8) : 0;
  }

  function waterPotentialJBonus() {
    return Math.sqrt(Math.max(0, state.highestPower)) / 10;
  }

  function waterJBonus() {
    return state.waterPurchased ? waterPotentialJBonus() : 0;
  }

  function runningCost() {
    const nextLevel = state.runningLevel + 1;
    if (nextLevel <= 10) {
      return Math.ceil(10 + (nextLevel - 1) * (20 / 9));
    }
    return Math.ceil(30 * Math.pow(1.15, nextLevel - 10));
  }

  function fitnessLevelCap() {
    const trueBrickBonus = hasAchievement("trueBrick") ? 20 : 0;
    return 10 + trueBrickBonus + state.longevityLevel * 10 + state.goldenCoreLongevityLevel * 10;
  }

  function rockLevelCap() {
    return ROCK_BASE_LEVEL_CAP + (hasAchievement("trueScale2") ? 20 : 0);
  }

  function baseConversionGain() {
    if (state.joules < 10) return 0;
    return Math.floor(Math.pow(state.joules / 10, 0.75));
  }

  function rawConversionGain() {
    const baseGain = baseConversionGain();
    if (baseGain < 1) return 0;
    return (baseGain + powerAdditiveBonus()) * powerMultiplier();
  }

  function conversionGain() {
    return applyResourceSoftcap(rawConversionGain(), state.power);
  }

  function ghostBrainPotentialPowerBonus() {
    return Math.pow(Math.max(0, state.highestPower), 0.6) / 250;
  }

  function ghostBrainPowerBonus() {
    return state.ghostBrainPurchased ? ghostBrainPotentialPowerBonus() : 0;
  }

  function magicTreasurePotentialPowerBonus() {
    return 10 * Math.pow(Math.max(0, state.mana), 0.65);
  }

  function magicTreasurePowerBonus() {
    return state.magicTreasureUnlocked ? magicTreasurePotentialPowerBonus() : 0;
  }

  function powerAdditiveBonus() {
    return ghostBrainPowerBonus() + magicTreasurePowerBonus();
  }

  function joulesForNextBasePower() {
    const nextBasePower = baseConversionGain() + 1;
    return Math.ceil(10 * Math.pow(nextBasePower, 1 / 0.75));
  }

  function focusPowerPerSecond() {
    return state.focusPurchased ? rawConversionGain() * focusPercent() * intuitionFocusMultiplier() : 0;
  }

  function focusPercent() {
    return 0.05 + (state.mentalPowerPurchased ? 0.05 : 0);
  }

  function intuitionPotentialFocusMultiplier() {
    return 1 + Math.log10(1 + Math.max(0, state.power)) * 0.1;
  }

  function intuitionFocusMultiplier() {
    return state.intuitionPurchased ? intuitionPotentialFocusMultiplier() : 1;
  }

  function rockCost() {
    return Math.ceil(
      ROCK_BASE_COST +
      2500 * state.rockLevel +
      500 * Math.pow(state.rockLevel, 2)
    );
  }

  function rockPowerPerSecond() {
    if (state.rockLevel <= 0) return 0;
    return (40 * Math.pow(state.rockLevel, 1.4) + powerAdditiveBonus()) * powerMultiplier();
  }

  function automaticPowerPerSecond() {
    return applyResourceSoftcap(focusPowerPerSecond() + rockPowerPerSecond(), state.power);
  }

  function realmRequirementMultiplier() {
    return state.qiRefiningUnlocked ? 1.1 : 1;
  }

  function foundationCost() {
    return Math.round(FOUNDATION_BASE_COST * realmRequirementMultiplier());
  }

  function goldenCoreCost() {
    return Math.round(goldenCoreBaseCost() * realmRequirementMultiplier());
  }

  function goldenCoreBaseCost() {
    return GOLDEN_CORE_BASE_COST * Math.pow(2, state.scatterRebuildLevel);
  }

  function advancedRealmCost(index) {
    return Math.round(advancedRealmBaseCost(index) * realmRequirementMultiplier());
  }

  function advancedRealmBaseCost(index) {
    const scatterDiscount = index === 0 ? Math.pow(0.8, state.scatterRebuildLevel) : 1;
    return ADVANCED_REALMS[index].baseCost * scatterDiscount;
  }

  function nextRealmBaseCost() {
    if (!state.qiRefiningUnlocked) return 0;
    if (!state.foundationUnlocked) return FOUNDATION_BASE_COST;
    if (!state.goldenCoreUnlocked) return goldenCoreBaseCost();
    return ADVANCED_REALMS[state.advancedRealmLevel]
      ? advancedRealmBaseCost(state.advancedRealmLevel)
      : 0;
  }

  function breathingRealmConfig() {
    return BREATHING_REALM_CONFIGS[cultivationRealmLevel()] ?? BREATHING_REALM_CONFIGS[1];
  }

  function breathingManaDecayMultiplier() {
    const { manaScale } = breathingRealmConfig();
    return Math.pow(1 + Math.max(0, state.mana) / manaScale, -0.25);
  }

  function baseBreathingManaGain() {
    if (state.joules < 3000) return 0;
    const { base } = breathingRealmConfig();
    const jCurve = Math.pow(1 + Math.log10(state.joules / 3000), 2.5);
    return Math.floor(base * jCurve * breathingManaDecayMultiplier());
  }

  function breathingManaGain() {
    if (!state.qiRefiningUnlocked) return 0;
    const baseGain = baseBreathingManaGain();
    if (baseGain < 1) return 0;
    return baseGain * manaGainMultiplier();
  }

  function manaGainMultiplier() {
    return immortalRealmManaMultiplier() *
      lowGradeRootManaMultiplier() *
      cultivationBottleneckManaMultiplier() *
      immortalLifeManaMultiplier() *
      manaLiquefactionManaMultiplier() *
      manaSolidificationManaMultiplier() *
      techniqueManaMultiplier() *
      scatterRebuildManaMultiplier() *
      naturalTreasureManaMultiplier() *
      tianNiPearlManaMultiplier();
  }

  function lowGradeRootManaMultiplier() {
    return state.qiRefiningUnlocked ? 1.1 : 1;
  }

  function bottleneckManaMultiplier(requirement, active) {
    if (!active || requirement <= 0) return 1;
    const ratio = Math.max(0, state.mana) / requirement;
    return 1 / (1 + 1.5 * Math.pow(ratio, 4));
  }

  function cultivationBottleneckManaMultiplier() {
    const requirement = nextRealmBaseCost();
    return requirement > 0 ? bottleneckManaMultiplier(requirement, true) : 1;
  }

  function immortalLifeManaMultiplier() {
    return state.immortalLifeUnlocked ? 1.1 : 1;
  }

  function manaLiquefactionManaMultiplier() {
    return state.manaLiquefactionUnlocked ? 0.9 : 1;
  }

  function manaSolidificationManaMultiplier() {
    return state.manaSolidificationUnlocked ? 0.9 : 1;
  }

  function techniqueManaMultiplier() {
    return state.techniqueUnlocked ? 1.25 : 1;
  }

  function scatterRebuildManaMultiplier() {
    return Math.pow(1.5, state.scatterRebuildLevel);
  }

  function naturalTreasureManaMultiplier() {
    return 1 + state.naturalTreasureLevel * 0.1;
  }

  function naturalTreasureUpgradeChance() {
    if (state.naturalTreasureLevel >= 10) return 0;
    return 0.1 * Math.pow(0.75, state.naturalTreasureLevel);
  }

  function tryUpgradeNaturalTreasure() {
    if (!state.goldenCoreUnlocked || state.naturalTreasureLevel >= 10 || Math.random() >= naturalTreasureUpgradeChance()) return false;
    state.naturalTreasureLevel += 1;
    saveState();
    showNotice(`天材地宝提升至 ${state.naturalTreasureLevel} 级`);
    return true;
  }

  function tianNiPearlCount() {
    return state.treasureImprints?.tianNiPearl || 0;
  }

  function tianNiPearlManaMultiplier() {
    return 1 + tianNiPearlCount() * 0.01;
  }

  function tianNiPearlChance() {
    return 0.01 * Math.pow(0.99, tianNiPearlCount());
  }

  function mysteriousGreenBottleCount() {
    return state.treasureImprints?.mysteriousGreenBottle || 0;
  }

  function mysteriousGreenBottleMultiplier() {
    return 1 + mysteriousGreenBottleCount() * 0.05;
  }

  function mysteriousGreenBottleChance() {
    return 0.05 * Math.pow(0.9, mysteriousGreenBottleCount());
  }

  function fuBaoCount() {
    return state.treasureImprints?.fuBao || 0;
  }

  function fuBaoChance() {
    return 0.1 * Math.pow(0.8, fuBaoCount());
  }

  function fuBaoPowerRatio() {
    return fuBaoCount() * 0.005;
  }

  function explorationPowerGain(manaGained) {
    if (fuBaoCount() <= 0 || manaGained <= 0) return 0;
    const rawGain = (manaGained * fuBaoPowerRatio() + powerAdditiveBonus()) * powerMultiplier();
    return applyResourceSoftcap(rawGain, state.power);
  }

  function formatProbability(probability) {
    const percent = probability * 100;
    if (percent >= 0.01) return `${percent.toFixed(2)}%`;
    if (percent >= 0.0001) return `${percent.toFixed(4)}%`;
    return `${percent.toExponential(2)}%`;
  }

  function unlockedImmortalRealmCount() {
    return cultivationRealmLevel();
  }

  function immortalRealmManaMultiplier() {
    return state.qiRefiningUnlocked ? Math.pow(1.2, unlockedImmortalRealmCount()) : 1;
  }

  function joulesForNextBaseMana() {
    const nextBaseMana = baseBreathingManaGain() + 1;
    const { base } = breathingRealmConfig();
    const curveTarget = Math.pow(nextBaseMana / (base * breathingManaDecayMultiplier()), 1 / 2.5);
    return Math.ceil(Math.max(3000, 3000 * Math.pow(10, curveTarget - 1)));
  }

  function automaticManaPerSecond() {
    return state.circulationUnlocked ? breathingManaGain() * 0.08 : 0;
  }

  function explorationManaGain() {
    if (!state.goldenCoreUnlocked || state.power < EXPLORATION_POWER_COST) return 0;
    return explorationPotentialManaGain();
  }

  function explorationPotentialManaGain() {
    if (!state.goldenCoreUnlocked) return 0;
    return EXPLORATION_BASE_MANA * manaGainMultiplier() * mysteriousGreenBottleMultiplier();
  }

  function tryTianNiPearl() {
    if (!treasuresUnlocked() || !hasAchievement("daoFoundation") || Math.random() >= tianNiPearlChance()) return false;
    state.treasureImprints.tianNiPearl += 1;
    saveState();
    showNotice(`获得宝物烙印：天逆珠 ×${tianNiPearlCount()}`);
    return true;
  }

  function tryMysteriousGreenBottle() {
    if (!treasuresUnlocked() || !hasAchievement("goldenCore") || Math.random() >= mysteriousGreenBottleChance()) return false;
    state.treasureImprints.mysteriousGreenBottle += 1;
    saveState();
    showNotice(`获得宝物烙印：神秘绿瓶 ×${mysteriousGreenBottleCount()}`);
    return true;
  }

  function tryFuBao() {
    if (!hasAchievement("trueScale3") || Math.random() >= fuBaoChance()) return false;
    state.treasureImprints.fuBao += 1;
    saveState();
    showNotice(`获得宝物烙印：符宝 ×${fuBaoCount()}`);
    return true;
  }

  function longevityCost() {
    return LONGEVITY_COSTS[state.longevityLevel] ?? 0;
  }

  function goldenCoreLongevityCost() {
    return GOLDEN_CORE_LONGEVITY_COSTS[state.goldenCoreLongevityLevel] ?? 0;
  }

  function achievementsUnlocked() {
    return Object.keys(state.unlockedAchievements).length > 0;
  }

  function upgradesUnlocked() {
    return hasAchievement("powerOne");
  }

  function cultivationUnlocked() {
    return hasAchievement("scale2");
  }

  function treasuresUnlocked() {
    return hasAchievement("scale3");
  }

  function hasAchievement(key) {
    return state.unlockedAchievements?.[key] === true;
  }

  function completedAchievement(key, condition) {
    return hasAchievement(key) || condition;
  }

  function achievementDefinitions() {
    const definitions = [
      { key: "powerOne", name: "战力 1", description: "获得至少 1 战力。", reward: "解锁升级界面", completed: completedAchievement("powerOne", state.totalPower >= 1) },
      { key: "five", name: "战五渣", description: "累计获得 5 战力。", reward: "战力倍率 ×1.05", completed: completedAchievement("five", state.totalPower >= 5) },
      { key: "brick", name: "爆砖", description: "拥有 200 战力。", reward: "每个成就 +0.1 J", completed: completedAchievement("brick", state.brickUnlocked) },
      { key: "trueBrick", name: "真爆砖", description: "一次锻炼获得 200 战力。", reward: "健身等级上限 +20", completed: completedAchievement("trueBrick", state.maxSinglePowerGain >= 200) },
      { key: "aspireImmortality", name: "我欲成仙", description: "解锁炼气。", reward: "每个境界提供 ×1.2 法力倍率", completed: completedAchievement("aspireImmortality", state.qiRefiningUnlocked) },
      { key: "daoFoundation", name: "道基", description: "解锁筑基。", reward: "解锁宝物烙印·天逆珠", completed: completedAchievement("daoFoundation", state.foundationUnlocked) },
      { key: "goldenCore", name: "一颗金丹吞入腹", description: "解锁结丹。", reward: "解锁宝物烙印·神秘绿瓶", completed: completedAchievement("goldenCore", state.goldenCoreUnlocked) }
    ];

    SCALE_THRESHOLDS.slice(2).forEach((scale, offset) => {
      const scaleIndex = offset + 2;
      definitions.push(
        {
          key: `scale${scaleIndex}`,
          name: scale.name,
          description: `拥有 ${format(scale.power, 0)} 战力。`,
          reward: scaleIndex === 2
            ? "解锁体系界面"
            : scaleIndex === 3
              ? "解锁宝物界面"
              : "奖励：后续加入",
          completed: completedAchievement(`scale${scaleIndex}`, state.highestScaleIndex >= scaleIndex)
        },
        {
          key: `trueScale${scaleIndex}`,
          name: `真${scale.name}`,
          description: `一次锻炼获得 ${format(scale.power, 0)} 战力。`,
          reward: scaleIndex === 2
            ? "打岩等级上限 +20"
            : scaleIndex === 3
              ? "解锁宝物烙印·符宝"
              : "奖励：后续加入",
          completed: completedAchievement(`trueScale${scaleIndex}`, state.maxSinglePowerGain >= scale.power)
        }
      );
    });

    return definitions;
  }

  function achievementStates() {
    return Object.fromEntries(achievementDefinitions().map((achievement) => [achievement.key, achievement.completed]));
  }

  function recordCurrentAchievements() {
    achievementDefinitions().forEach((achievement) => {
      if (achievement.completed) state.unlockedAchievements[achievement.key] = true;
    });
  }

  function achievementJBonus() {
    const achievements = achievementStates();
    if (!achievements.brick) return 0;
    return Object.values(achievements).filter(Boolean).length * 0.1;
  }

  function showNotice(message, duration = 1400) {
    const notice = byId("notice");
    notice.textContent = message;
    notice.classList.add("show");
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => notice.classList.remove("show"), duration);
  }

  function showAchievementNotice(names) {
    const notice = byId("achievement-notice");
    byId("achievement-notice-name").textContent = names.join("、");
    notice.classList.add("show");
    window.clearTimeout(achievementNoticeTimer);
    achievementNoticeTimer = window.setTimeout(() => notice.classList.remove("show"), 2800);
  }

  function showScaleNotice(names) {
    const notice = byId("scale-notice");
    byId("scale-notice-name").textContent = names.join(" → ");
    notice.classList.add("show");
    window.clearTimeout(scaleNoticeTimer);
    scaleNoticeTimer = window.setTimeout(() => notice.classList.remove("show"), 2800);
  }

  function notifyNewAchievements(previousAchievements) {
    recordCurrentAchievements();
    const currentAchievements = achievementStates();
    const namesByKey = Object.fromEntries(achievementDefinitions().map((achievement) => [achievement.key, achievement.name]));
    const unlocked = Object.keys(currentAchievements)
      .filter((key) => !previousAchievements[key] && currentAchievements[key])
      .map((key) => namesByKey[key]);
    if (unlocked.length > 0) showAchievementNotice(unlocked);
  }

  function train() {
    const gained = conversionGain();
    if (gained < 1) return;

    const previousAchievements = achievementStates();
    state.joules = 0;
    state.power += gained;
    state.totalPower += gained;
    state.maxSinglePowerGain = Math.max(state.maxSinglePowerGain, gained);
    updateScaleProgress();
    saveState();
    render();

    notifyNewAchievements(previousAchievements);
  }

  function buyRunning() {
    const cost = runningCost();
    if (!upgradesUnlocked() || state.runningLevel >= fitnessLevelCap() || state.power < cost) return;
    state.power -= cost;
    state.runningLevel += 1;
    saveState();
    render();
  }

  function buyGym() {
    if (!upgradesUnlocked() || state.gymPurchased || state.power < GYM_COST) return;
    state.power -= GYM_COST;
    state.gymPurchased = true;
    saveState();
    render();
  }

  function buyExercise() {
    if (!upgradesUnlocked() || state.exercisePurchased || state.power < EXERCISE_COST) return;
    state.power -= EXERCISE_COST;
    state.exercisePurchased = true;
    saveState();
    render();
  }

  function buyTranscendent() {
    if (!state.brickUnlocked || state.transcendentPurchased || state.power < TRANSCENDENT_COST) return;
    state.power -= TRANSCENDENT_COST;
    state.transcendentPurchased = true;
    saveState();
    render();
  }

  function buyFocus() {
    if (!state.brickUnlocked || state.focusPurchased || state.power < FOCUS_COST) return;
    state.power -= FOCUS_COST;
    state.focusPurchased = true;
    saveState();
    render();
  }

  function buyExtremeExercise() {
    if (!state.brickUnlocked || state.extremeExercisePurchased || state.power < EXTREME_EXERCISE_COST) return;
    state.power -= EXTREME_EXERCISE_COST;
    state.extremeExercisePurchased = true;
    saveState();
    render();
  }

  function buyRock() {
    const cost = rockCost();
    if (!state.wallUnlocked || state.rockLevel >= rockLevelCap() || state.joules < cost) return;
    state.joules -= cost;
    state.rockLevel += 1;
    saveState();
    render();
  }

  function buyWater() {
    if (!state.wallUnlocked || state.waterPurchased || state.power < WATER_COST) return;
    state.power -= WATER_COST;
    state.waterPurchased = true;
    saveState();
    render();
  }

  function buyGhostBrain() {
    if (!state.wallUnlocked || state.ghostBrainPurchased || state.power < GHOST_BRAIN_COST) return;
    state.power -= GHOST_BRAIN_COST;
    state.ghostBrainPurchased = true;
    saveState();
    render();
  }

  function buyNaturalStrength() {
    if (!state.wallUnlocked || state.naturalStrengthPurchased || state.power < NATURAL_STRENGTH_COST) return;
    state.power -= NATURAL_STRENGTH_COST;
    state.naturalStrengthPurchased = true;
    saveState();
    render();
  }

  function buyMentalPower() {
    if (!state.wallUnlocked || state.mentalPowerPurchased || state.power < MENTAL_POWER_COST) return;
    state.power -= MENTAL_POWER_COST;
    state.mentalPowerPurchased = true;
    saveState();
    render();
  }

  function buyLifePower() {
    if (!state.wallUnlocked || state.lifePowerPurchased || state.power < LIFE_POWER_COST) return;
    state.power -= LIFE_POWER_COST;
    state.lifePowerPurchased = true;
    saveState();
    render();
  }

  function buyMyStyle() {
    if (state.highestScaleIndex < 3 || state.myStylePurchased || state.power < MY_STYLE_COST) return;
    state.power -= MY_STYLE_COST;
    state.myStylePurchased = true;
    saveState();
    render();
  }

  function buyIntuition() {
    if (state.highestScaleIndex < 3 || state.intuitionPurchased || state.power < INTUITION_COST) return;
    state.power -= INTUITION_COST;
    state.intuitionPurchased = true;
    saveState();
    render();
  }

  function buySonicMovement() {
    if (state.highestScaleIndex < 3 || state.sonicMovementPurchased || state.power < SONIC_MOVEMENT_COST) return;
    state.power -= SONIC_MOVEMENT_COST;
    state.sonicMovementPurchased = true;
    saveState();
    render();
  }

  function toggleGhostBack() {
    if (state.highestScaleIndex < 3) return;
    state.ghostBackActive = !state.ghostBackActive;
    saveState();
    render();
  }

  function chooseCultivation(systemName) {
    if (!cultivationUnlocked() || state.cultivationSystem || systemName !== "仙道") return;
    state.cultivationSystem = systemName;
    activeCultivationPage = "realms";
    saveState();
    render();
    showNotice("已选择仙道体系");
  }

  function switchCultivationPage(pageName) {
    if (state.cultivationSystem !== "仙道" || !["realms", "abilities"].includes(pageName)) return;
    activeCultivationPage = pageName;
    renderCultivationPage();
  }

  function renderCultivationPage() {
    document.querySelectorAll("[data-cultivation-page]").forEach((button) => {
      const active = button.dataset.cultivationPage === activeCultivationPage;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    byId("immortal-realms-panel").classList.toggle("active", activeCultivationPage === "realms");
    byId("immortal-abilities-panel").classList.toggle("active", activeCultivationPage === "abilities");
  }

  function unlockQiRefining() {
    if (state.cultivationSystem !== "仙道" || state.qiRefiningUnlocked || state.power < QI_REFINING_COST) return;
    const previousAchievements = achievementStates();
    state.power -= QI_REFINING_COST;
    state.qiRefiningUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function breathe() {
    if (!state.qiRefiningUnlocked) return;
    const gained = breathingManaGain();
    if (gained < 1) return;
    state.joules = 0;
    state.mana += gained;
    tryTianNiPearl();
    saveState();
    render();
  }

  function unlockFoundation() {
    const cost = foundationCost();
    if (!state.qiRefiningUnlocked || state.foundationUnlocked || state.mana < cost) return;
    const previousAchievements = achievementStates();
    state.mana -= cost;
    state.foundationUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function unlockGoldenCore() {
    const cost = goldenCoreCost();
    if (!state.foundationUnlocked || state.goldenCoreUnlocked || state.mana < cost) return;
    const previousAchievements = achievementStates();
    state.mana -= cost;
    state.goldenCoreUnlocked = true;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function unlockAdvancedRealm(index) {
    const cost = advancedRealmCost(index);
    if (!state.goldenCoreUnlocked || state.advancedRealmLevel !== index || state.mana < cost) return;
    state.mana -= cost;
    state.advancedRealmLevel = index + 1;
    saveState();
    render();
  }

  function unlockImmortalLife() {
    if (!state.qiRefiningUnlocked || state.immortalLifeUnlocked || state.mana < IMMORTAL_LIFE_COST) return;
    state.mana -= IMMORTAL_LIFE_COST;
    state.immortalLifeUnlocked = true;
    saveState();
    render();
  }

  function unlockCirculation() {
    if (!state.foundationUnlocked || state.circulationUnlocked || state.mana < CIRCULATION_COST) return;
    state.mana -= CIRCULATION_COST;
    state.circulationUnlocked = true;
    saveState();
    render();
  }

  function unlockManaLiquefaction() {
    if (!state.foundationUnlocked || state.manaLiquefactionUnlocked || state.mana < MANA_LIQUEFACTION_COST) return;
    state.mana -= MANA_LIQUEFACTION_COST;
    state.manaLiquefactionUnlocked = true;
    saveState();
    render();
  }

  function unlockTechnique() {
    if (!state.foundationUnlocked || state.techniqueUnlocked || state.mana < TECHNIQUE_COST) return;
    state.mana -= TECHNIQUE_COST;
    state.techniqueUnlocked = true;
    saveState();
    render();
  }

  function buyLongevity() {
    const cost = longevityCost();
    if (!state.foundationUnlocked || state.longevityLevel >= 2 || state.mana < cost) return;
    state.mana -= cost;
    state.longevityLevel += 1;
    saveState();
    render();
  }

  function buyGoldenCoreLongevity() {
    const cost = goldenCoreLongevityCost();
    if (!state.goldenCoreUnlocked || state.goldenCoreLongevityLevel >= 2 || state.mana < cost) return;
    state.mana -= cost;
    state.goldenCoreLongevityLevel += 1;
    saveState();
    render();
  }

  function unlockManaSolidification() {
    if (!state.goldenCoreUnlocked || state.manaSolidificationUnlocked || state.mana < MANA_SOLIDIFICATION_COST) return;
    state.mana -= MANA_SOLIDIFICATION_COST;
    state.manaSolidificationUnlocked = true;
    saveState();
    render();
  }

  function unlockMagicTreasure() {
    if (!state.goldenCoreUnlocked || state.magicTreasureUnlocked || state.mana < MAGIC_TREASURE_COST) return;
    state.mana -= MAGIC_TREASURE_COST;
    state.magicTreasureUnlocked = true;
    saveState();
    render();
  }

  function scatterAndRebuild() {
    if (!state.goldenCoreUnlocked || state.scatterRebuildLevel >= 3) return;
    const nextScatterLevel = state.scatterRebuildLevel + 1;
    const retainedTier = SCATTER_RETAINED_UPGRADE_TIERS[nextScatterLevel];
    if (!window.confirm(`第${nextScatterLevel}次散功重修将保留${retainedTier}升级；更高量级升级、J、战力、法力、量级和境界会重置，仙道能力、成就与宝物烙印继续保留。确定继续吗？`)) return;
    state.scatterRebuildLevel = nextScatterLevel;
    state.joules = 0;
    state.power = 0;
    state.highestPower = 0;
    state.totalPower = 0;
    state.maxSinglePowerGain = 0;
    state.brickUnlocked = false;
    state.wallUnlocked = false;
    state.highestScaleIndex = 0;
    state.runningLevel = 0;
    if (nextScatterLevel < 2) {
      state.transcendentPurchased = false;
      state.focusPurchased = false;
      state.extremeExercisePurchased = false;
    }
    state.rockLevel = 0;
    if (nextScatterLevel < 3) {
      state.waterPurchased = false;
      state.ghostBrainPurchased = false;
      state.naturalStrengthPurchased = false;
      state.mentalPowerPurchased = false;
      state.lifePowerPurchased = false;
    }
    state.myStylePurchased = false;
    state.intuitionPurchased = false;
    state.sonicMovementPurchased = false;
    state.ghostBackActive = false;
    state.mana = 0;
    state.qiRefiningUnlocked = false;
    state.foundationUnlocked = false;
    state.goldenCoreUnlocked = false;
    state.advancedRealmLevel = 0;
    passiveManaRollAccumulator = 0;
    activeCultivationPage = "realms";
    saveState();
    render();
    showNotice(`散功重修完成：${state.scatterRebuildLevel} / 3`);
  }

  function explore() {
    const gained = explorationManaGain();
    if (!state.goldenCoreUnlocked || gained < 1) return;
    const previousAchievements = achievementStates();
    state.power -= EXPLORATION_POWER_COST;
    state.mana += gained;
    const powerGained = explorationPowerGain(gained);
    state.power += powerGained;
    state.totalPower += powerGained;
    updateScaleProgress();
    tryTianNiPearl();
    tryMysteriousGreenBottle();
    tryFuBao();
    tryUpgradeNaturalTreasure();
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
  }

  function switchPage(pageName) {
    if (pageName === "upgrades" && !upgradesUnlocked()) {
      showNotice("达成「战力 1」后解锁升级");
      return;
    }
    if (pageName === "achievements" && !achievementsUnlocked()) {
      showNotice("获得战力后解锁成就");
      return;
    }
    if (pageName === "cultivation" && !cultivationUnlocked()) {
      showNotice("达成「爆墙」后解锁体系");
      return;
    }
    if (pageName === "treasures" && !treasuresUnlocked()) {
      showNotice("达成「爆屋」后解锁宝物");
      return;
    }

    activePage = pageName;
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === pageName);
    });
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.toggle("active", page.id === `${pageName}-page`);
    });
  }

  function updateNavigation() {
    const entries = [
      [document.querySelector('[data-page="upgrades"]'), upgradesUnlocked()],
      [document.querySelector('[data-page="cultivation"]'), cultivationUnlocked()],
      [document.querySelector('[data-page="treasures"]'), treasuresUnlocked()],
      [document.querySelector('[data-page="achievements"]'), achievementsUnlocked()]
    ];

    entries.forEach(([button, unlocked]) => {
      button.hidden = !unlocked;
    });
  }

  function updateOneTimeUpgrade(rowId, buttonId, purchased, affordable) {
    const row = byId(rowId);
    const button = byId(buttonId);
    row.classList.toggle("purchased", purchased);
    button.textContent = purchased ? "已升级" : "升级";
    button.disabled = purchased || !affordable;
  }

  function updateOneTimeUnlock(rowId, buttonId, unlocked, affordable) {
    const row = byId(rowId);
    const button = byId(buttonId);
    row.classList.toggle("purchased", unlocked);
    button.textContent = unlocked ? "已解锁" : "解锁";
    button.disabled = unlocked || !affordable;
  }

  function ensureAchievementCards() {
    byId("achievement-list").innerHTML = achievementDefinitions().map((achievement) => `
      <article class="item-row achievement" id="achievement-${achievement.key}">
        <div class="achievement-state">未达成</div>
        <div class="item-content">
          <h2>${achievement.name}</h2>
          <p>${achievement.description}</p>
        </div>
        <strong>${achievement.reward}</strong>
      </article>
    `).join("");
  }

  function renderAchievements() {
    const achievements = achievementDefinitions();
    const unlockedCount = achievements.filter((achievement) => achievement.completed).length;
    achievements.forEach((achievement) => {
      const card = byId(`achievement-${achievement.key}`);
      card.classList.toggle("completed", achievement.completed);
      card.querySelector(".achievement-state").textContent = achievement.completed ? "已达成" : "未达成";
      card.hidden = state.hideUnlockedAchievements && achievement.completed;
    });
    byId("achievement-unlocked-count").textContent = String(unlockedCount);
    byId("achievement-total-count").textContent = String(achievements.length);
    const filterButton = byId("toggle-achievement-filter");
    filterButton.textContent = state.hideUnlockedAchievements ? "显示全部成就" : "隐藏已解锁成就";
    filterButton.setAttribute("aria-pressed", String(state.hideUnlockedAchievements));
  }

  // DEBUG RESOURCE BREAKDOWN: START（删除本区块即可移除资源来源计算）
  window.renderResourceDebug = () => {
    const jBase = 1;
    const jFitness = fitnessJBonus();
    const jAchievement = achievementJBonus();
    const jMana = manaJBonus();
    const jWater = waterJBonus();
    const jGymMultiplier = gymMultiplier();
    const jExerciseMultiplier = exerciseMultiplier();
    const jLiquefactionMultiplier = manaLiquefactionJMultiplier();
    const jGhostBackMultiplier = ghostBackJMultiplier();
    const jRaw = (jBase + jFitness + jAchievement + jMana + jWater) * jGymMultiplier * jExerciseMultiplier * jLiquefactionMultiplier * jGhostBackMultiplier;
    const jActual = applyResourceSoftcap(jRaw, state.joules);

    const jDebug = byId("debug-j-sources");
    if (jDebug) {
      jDebug.textContent = `加法：基础 ${format(jBase)}、健身 +${format(jFitness)}、成就 +${format(jAchievement)}、法力 +${format(jMana)}、击水 +${format(jWater)}；健身专属：延年益寿 ×${longevityFitnessMultiplier().toFixed(2)}（含生命力量、我流）；乘区：跑步 ×${jGymMultiplier.toFixed(2)}、运动 ×${jExerciseMultiplier.toFixed(2)}、法力液化 ×${jLiquefactionMultiplier.toFixed(2)}、鬼背 ×${jGhostBackMultiplier.toFixed(2)}；当前J软上限倍率 ×${formatSoftcapMultiplier(resourceSoftcapMultiplier(state.joules))}（触发：${activeSoftcapStages(state.joules)}；境界解除：${removedSoftcapStages()}）：${format(jRaw)}/秒 → ${format(jActual)}/秒`;
    }

    const focusSource = focusPowerPerSecond();
    const rockSource = rockPowerPerSecond();
    const powerRaw = focusSource + rockSource;
    const powerActual = applyResourceSoftcap(powerRaw, state.power);
    const achievementPowerMultiplier = hasAchievement("five") ? 1.05 : 1;
    const powerDebug = byId("debug-power-sources");
    if (powerDebug) {
      powerDebug.textContent = `加法：鬼脑 +${format(ghostBrainPowerBonus())}、法宝 +${format(magicTreasurePowerBonus())}；自动来源：集中 +${format(focusSource)}/秒（比例 ${(focusPercent() * 100).toFixed(0)}%、直感 ×${intuitionFocusMultiplier().toFixed(2)}）、打岩 +${format(rockSource)}/秒；乘区：战五渣 ×${achievementPowerMultiplier.toFixed(2)}、超凡之力 ×${transcendentMultiplier().toFixed(2)}、天生神力 ×${naturalStrengthMultiplier().toFixed(2)}、仙道贵生 ×${immortalLifePowerMultiplier().toFixed(2)}、法力固化 ×${manaSolidificationPowerMultiplier().toFixed(2)}、鬼背 ×${ghostBackPowerMultiplier().toFixed(2)}；当前战力软上限倍率 ×${formatSoftcapMultiplier(resourceSoftcapMultiplier(state.power))}（触发：${activeSoftcapStages(state.power)}；境界解除：${removedSoftcapStages()}）：${format(powerRaw)}/秒 → ${format(powerActual)}/秒；当前锻炼 ${format(conversionGain())}/次`;
    }

    const manaMultiplier = manaGainMultiplier();
    const breathingBase = baseBreathingManaGain();
    const breathingRaw = breathingBase * manaMultiplier;
    const breathingActual = breathingBase >= 1 ? breathingRaw : 0;
    const explorationRaw = state.goldenCoreUnlocked ? EXPLORATION_BASE_MANA * manaMultiplier * mysteriousGreenBottleMultiplier() : 0;
    const explorationActual = state.goldenCoreUnlocked ? explorationRaw : 0;
    const manaDebug = byId("debug-mana-sources");
    const manaDebugRow = byId("debug-mana-source-row");
    if (manaDebugRow) manaDebugRow.hidden = !state.qiRefiningUnlocked;
    if (manaDebug) {
      manaDebug.textContent = `来源：周天 +${format(automaticManaPerSecond())}/秒、吐纳 ${format(breathingActual)}/次、探寻 ${format(explorationActual)}/次；乘区：境界 ×${immortalRealmManaMultiplier().toFixed(2)}、吐纳法力衰减 ×${breathingManaDecayMultiplier().toFixed(2)}、下品灵根 ×${lowGradeRootManaMultiplier().toFixed(2)}、当前瓶颈 ×${cultivationBottleneckManaMultiplier().toFixed(2)}、仙道贵生 ×${immortalLifeManaMultiplier().toFixed(2)}、功法 ×${techniqueManaMultiplier().toFixed(2)}、散功重修 ×${scatterRebuildManaMultiplier().toFixed(2)}、法力液化 ×${manaLiquefactionManaMultiplier().toFixed(2)}、法力固化 ×${manaSolidificationManaMultiplier().toFixed(2)}、天材地宝 ×${naturalTreasureManaMultiplier().toFixed(2)}、天逆珠 ×${tianNiPearlManaMultiplier().toFixed(2)}、神秘绿瓶（仅探寻）×${mysteriousGreenBottleMultiplier().toFixed(2)}`;
    }
  };
  // DEBUG RESOURCE BREAKDOWN: END

  function render() {
    recordCurrentAchievements();
    const gain = automaticJPerSecond();
    const conversion = conversionGain();
    const gym = gymMultiplier();
    const exercise = exerciseMultiplier();
    const transcendent = transcendentMultiplier();
    const gymPotential = gymPotentialMultiplier() * sonicMovementMultiplier();
    const exercisePotential = exercisePotentialMultiplier() * extremeExerciseEffectMultiplier();
    const transcendentPotential = transcendentPotentialMultiplier();
    const naturalStrengthPotential = naturalStrengthPotentialMultiplier();
    const myStylePotential = myStylePotentialFitnessMultiplier();
    const intuitionPotential = intuitionPotentialFocusMultiplier();
    const passivePowerGain = automaticPowerPerSecond();
    const waterPotential = waterPotentialJBonus();
    const ghostBrainPotential = ghostBrainPotentialPowerBonus();
    const currentJBase = 1 + fitnessJBonus() + achievementJBonus() + manaJBonus();
    const currentJMultipliers = gym * exercise * manaLiquefactionJMultiplier() * ghostBackJMultiplier();
    const jWithoutWater = applyResourceSoftcap(currentJBase * currentJMultipliers, state.joules);
    const jWithWater = applyResourceSoftcap((currentJBase + waterPotential) * currentJMultipliers, state.joules);
    const waterEffectivePotential = jWithWater - jWithoutWater;
    const basePower = baseConversionGain();
    const currentPowerMultiplier = powerMultiplier();
    const otherPowerAddition = magicTreasurePowerBonus();
    const powerWithoutGhost = basePower >= 1 ? applyResourceSoftcap((basePower + otherPowerAddition) * currentPowerMultiplier, state.power) : 0;
    const powerWithGhost = basePower >= 1 ? applyResourceSoftcap((basePower + otherPowerAddition + ghostBrainPotential) * currentPowerMultiplier, state.power) : 0;
    const ghostBrainEffectivePotential = powerWithGhost - powerWithoutGhost;
    const focusRawPotential = rawConversionGain() * focusPercent() * intuitionFocusMultiplier();
    const rockRawPotential = rockPowerPerSecond();
    const focusEffectivePotential = applyResourceSoftcap(focusRawPotential, state.power);
    const rockEffectivePotential = applyResourceSoftcap(rockRawPotential, state.power);
    const nextRunningCost = runningCost();
    const nextRockCost = rockCost();
    const rockCap = rockLevelCap();
    const fitnessCap = fitnessLevelCap();
    const nextPowerJ = joulesForNextBasePower();
    const manaGain = breathingManaGain();
    const passiveManaGain = automaticManaPerSecond();
    const circulationPotential = manaGain * 0.08;
    const nextManaJ = joulesForNextBaseMana();
    const nextLongevityCost = longevityCost();
    const nextFoundationCost = foundationCost();
    const nextGoldenCoreCost = goldenCoreCost();
    const nextGoldenCoreLongevityCost = goldenCoreLongevityCost();
    const explorationPotential = explorationPotentialManaGain();
    const pearlCount = tianNiPearlCount();
    const greenBottleCount = mysteriousGreenBottleCount();
    const currentFuBaoCount = fuBaoCount();

    byId("joules").textContent = format(state.joules);
    byId("power").textContent = format(state.power);
    byId("current-scale").textContent = SCALE_THRESHOLDS[state.highestScaleIndex].name;
    byId("joules-rate").textContent = `（+${format(gain)}/秒）`;
    byId("power-rate").textContent = `（+${format(passivePowerGain)}/秒）`;
    byId("power-rate").hidden = passivePowerGain <= 0;
    byId("mana-resource").hidden = !state.qiRefiningUnlocked;
    byId("mana").textContent = format(state.mana);
    byId("mana-rate").textContent = `（+${format(passiveManaGain)}/秒）`;
    byId("mana-rate").hidden = passiveManaGain <= 0;
    byId("conversion-preview").textContent = conversion >= 1
      ? `${format(state.joules)} J → ${format(conversion)} 战力`
      : "至少需要 10 J";
    byId("next-power-j").textContent = `下一战力所需：${format(nextPowerJ, 0)} J`;
    byId("train-button").disabled = conversion < 1;
    byId("gym-preview").textContent = `${state.gymPurchased ? "当前" : "可提供"} ×${(state.gymPurchased ? gym : gymPotential).toFixed(2)}`;
    byId("exercise-preview").textContent = `${state.exercisePurchased ? "当前" : "可提供"} ×${(state.exercisePurchased ? exercise : exercisePotential).toFixed(2)}`;
    byId("transcendent-preview").textContent = `${state.transcendentPurchased ? "当前" : "可提供"} ×${(state.transcendentPurchased ? transcendent : transcendentPotential).toFixed(2)}`;
    byId("focus-preview").textContent = `${state.focusPurchased ? "当前实际" : "可实际增加"} +${format(focusEffectivePotential)} 战力/秒`;
    byId("extreme-exercise-preview").textContent = `${state.extremeExercisePurchased ? "当前" : "可提供"} ×1.50`;
    byId("running-level").textContent = `当前 ${state.runningLevel} / ${fitnessCap} 级`;
    byId("running-cost").textContent = `消耗 ${format(nextRunningCost, 0)} 战力`;
    byId("buy-running").textContent = state.runningLevel >= fitnessCap ? "已达上限" : "升级";
    byId("buy-running").disabled = state.runningLevel >= fitnessCap || state.power < nextRunningCost;
    byId("running-action").hidden = state.totalPower < 1;
    byId("brick-upgrades").hidden = !state.brickUnlocked;
    byId("wall-upgrades").hidden = !state.wallUnlocked;
    byId("house-upgrades").hidden = state.highestScaleIndex < 3;
    byId("rock-action").hidden = !state.wallUnlocked;
    byId("ghost-back-action").hidden = state.highestScaleIndex < 3;
    byId("ghost-back-action").classList.toggle("purchased", state.ghostBackActive);
    byId("ghost-back-state").textContent = state.ghostBackActive ? "当前已激活" : "当前未激活";
    byId("toggle-ghost-back").textContent = state.ghostBackActive ? "关闭" : "激活";
    byId("rock-level").textContent = `当前 ${state.rockLevel} / ${rockCap} 级`;
    byId("rock-rate").textContent = `当前实际 +${format(rockEffectivePotential)} 战力/秒`;
    byId("rock-cost").textContent = state.rockLevel >= rockCap ? "已达到等级上限" : `消耗 ${format(nextRockCost, 0)} J`;
    byId("buy-rock").textContent = state.rockLevel >= rockCap ? "已达上限" : "升级";
    byId("buy-rock").disabled = state.rockLevel >= rockCap || state.joules < nextRockCost;
    byId("water-preview").textContent = `${state.waterPurchased ? "当前实际增加" : "可实际增加"} +${format(waterEffectivePotential)} J/秒`;
    byId("ghost-brain-preview").textContent = `${state.ghostBrainPurchased ? "当前实际增加" : "可实际增加"} +${format(ghostBrainEffectivePotential)} 战力`;
    byId("natural-strength-preview").textContent = `${state.naturalStrengthPurchased ? "当前" : "可提供"} ×${naturalStrengthPotential.toFixed(2)}`;
    byId("mental-power-preview").textContent = `${state.mentalPowerPurchased ? "当前集中比例" : "可使集中比例"} ${state.mentalPowerPurchased ? `${(focusPercent() * 100).toFixed(0)}%` : "+5%"}`;
    byId("life-power-preview").textContent = `${state.lifePowerPurchased ? "当前" : "可提供"}健身倍率 ×1.50`;
    byId("my-style-preview").textContent = `${state.myStylePurchased ? "当前" : "可提供"}健身倍率 ×${myStylePotential.toFixed(2)}`;
    byId("intuition-preview").textContent = `${state.intuitionPurchased ? "当前" : "可提供"}集中倍率 ×${intuitionPotential.toFixed(2)}`;
    byId("sonic-movement-preview").textContent = `${state.sonicMovementPurchased ? "当前" : "可提供"}跑步倍率 ×1.50`;
    byId("breathing-action").hidden = !state.qiRefiningUnlocked;
    byId("breathing-preview").textContent = manaGain >= 1
      ? `${format(state.joules)} J → ${format(manaGain)} 法力`
      : "至少需要 3,000 J";
    byId("next-mana-j").textContent = `下一法力所需：${format(nextManaJ, 0)} J`;
    byId("breathing-button").disabled = manaGain < 1;
    byId("exploration-action").hidden = !state.goldenCoreUnlocked;
    const explorationPowerPotential = explorationPowerGain(explorationPotential);
    byId("exploration-preview").textContent = `${format(EXPLORATION_POWER_COST, 0)} 战力 → ${format(explorationPotential)} 法力${explorationPowerPotential > 0 ? `、${format(explorationPowerPotential)} 战力` : ""}`;
    byId("exploration-button").disabled = !state.goldenCoreUnlocked || state.power < EXPLORATION_POWER_COST;

    const cultivationSelected = state.cultivationSystem === "仙道";
    const cultivationCard = document.querySelector('[data-cultivation-card="仙道"]');
    const cultivationButton = document.querySelector('[data-cultivation="仙道"]');
    cultivationCard.classList.toggle("selected", cultivationSelected);
    cultivationButton.textContent = cultivationSelected ? "已选择" : "选择仙道";
    cultivationButton.disabled = cultivationSelected;
    byId("cultivation-choices").hidden = cultivationSelected;
    byId("cultivation-status").textContent = cultivationSelected
      ? "已选择：仙道（转生后可重置）"
      : "尚未选择体系";
    byId("immortal-progress").hidden = !cultivationSelected;
    byId("foundation-stage").hidden = !state.qiRefiningUnlocked;
    byId("foundation-cost").textContent = `消耗 ${format(nextFoundationCost, 0)} 法力`;
    byId("golden-core-stage").hidden = !state.foundationUnlocked;
    byId("golden-core-cost").textContent = `消耗 ${format(nextGoldenCoreCost, 0)} 法力`;
    ADVANCED_REALMS.forEach((realm, index) => {
      const unlocked = state.advancedRealmLevel > index;
      const isNextRealm = state.goldenCoreUnlocked && state.advancedRealmLevel === index;
      byId(`${realm.slug}-stage`).hidden = !state.goldenCoreUnlocked || index > state.advancedRealmLevel;
      byId(`${realm.slug}-cost`).textContent = `消耗 ${format(advancedRealmCost(index), 0)} 法力`;
      updateOneTimeUnlock(`${realm.slug}-stage`, `unlock-${realm.slug}`, unlocked, isNextRealm && state.mana >= advancedRealmCost(index));
    });
    const retainedAbilitiesVisible = state.scatterRebuildLevel > 0;
    byId("qi-abilities").hidden = !state.qiRefiningUnlocked && !retainedAbilitiesVisible;
    byId("low-grade-root-preview").textContent = state.qiRefiningUnlocked ? "法力倍率 ×1.10" : "重新炼气后生效";
    byId("low-grade-root-requirement").textContent = state.qiRefiningUnlocked ? "境界突破要求 ×1.10" : "能力已保留";
    byId("low-grade-root-state").textContent = state.qiRefiningUnlocked ? "已生效" : "等待炼气";
    byId("qi-bottleneck-preview").textContent = !state.qiRefiningUnlocked
      ? "等待重新炼气，当前不生效"
      : state.foundationUnlocked
        ? "已失效，法力倍率 ×1.00"
        : `当前法力倍率 ×${bottleneckManaMultiplier(FOUNDATION_BASE_COST, true).toFixed(2)}`;
    byId("qi-bottleneck-state").textContent = !state.qiRefiningUnlocked ? "等待炼气" : state.foundationUnlocked ? "已失效" : "已生效";
    byId("immortal-life-preview").textContent = state.immortalLifeUnlocked
      ? "当前 战力 ×0.95；法力 ×1.10"
      : "可提供 战力 ×0.95；法力 ×1.10";
    byId("immortal-life-cost").textContent = `消耗 ${format(IMMORTAL_LIFE_COST, 0)} 法力`;
    byId("foundation-abilities").hidden = !state.foundationUnlocked && !retainedAbilitiesVisible;
    byId("foundation-bottleneck-preview").textContent = !state.foundationUnlocked
      ? "等待重新筑基，当前不生效"
      : state.goldenCoreUnlocked
        ? "已失效，法力倍率 ×1.00"
        : `当前法力倍率 ×${bottleneckManaMultiplier(goldenCoreBaseCost(), true).toFixed(2)}`;
    byId("foundation-bottleneck-state").textContent = !state.foundationUnlocked ? "等待筑基" : state.goldenCoreUnlocked ? "已失效" : "已生效";
    byId("golden-core-bottleneck-point").textContent = `拐点：${format(goldenCoreBaseCost(), 0)} 法力`;
    byId("technique-preview").textContent = `${state.techniqueUnlocked ? "当前" : "可提供"}法力倍率 ×1.25`;
    byId("circulation-preview").textContent = `${state.circulationUnlocked ? "当前" : "可提供"} +${format(circulationPotential)} 法力/秒`;
    byId("mana-liquefaction-preview").textContent = state.manaLiquefactionUnlocked
      ? "当前 法力 ×0.90；J ×1.15"
      : "可提供 法力 ×0.90；J ×1.15";
    byId("mana-liquefaction-cost").textContent = `消耗 ${format(MANA_LIQUEFACTION_COST, 0)} 法力`;
    byId("longevity-ability").hidden = !state.foundationUnlocked && !retainedAbilitiesVisible;
    byId("longevity-ability").classList.toggle("purchased", state.longevityLevel >= 2);
    byId("longevity-level").textContent = `当前 ${state.longevityLevel} / 2 级（健身上限 +${state.longevityLevel * 10}，本能力健身倍率 ×${Math.pow(1.5, state.longevityLevel).toFixed(2)}）`;
    byId("longevity-cost").textContent = state.longevityLevel >= 2 ? "已达到等级上限" : `消耗 ${format(nextLongevityCost, 0)} 法力`;
    byId("buy-longevity").textContent = state.longevityLevel >= 2 ? "已达上限" : "升级";
    byId("buy-longevity").disabled = !state.foundationUnlocked || state.longevityLevel >= 2 || state.mana < nextLongevityCost;
    byId("golden-core-abilities").hidden = !state.goldenCoreUnlocked && !retainedAbilitiesVisible;
    byId("natural-treasure-ability").classList.toggle("purchased", state.naturalTreasureLevel >= 10);
    byId("natural-treasure-level").textContent = `当前 ${state.naturalTreasureLevel} / 10 级（法力倍率 ×${naturalTreasureManaMultiplier().toFixed(2)}）`;
    byId("natural-treasure-chance").textContent = state.naturalTreasureLevel >= 10
      ? "已达到等级上限"
      : `下次探寻升级概率 ${formatProbability(naturalTreasureUpgradeChance())}`;
    byId("natural-treasure-state").textContent = !state.goldenCoreUnlocked
      ? "等待重新结丹"
      : state.naturalTreasureLevel >= 10 ? "已达上限" : "仅可通过探寻升级";
    byId("golden-core-longevity-ability").classList.toggle("purchased", state.goldenCoreLongevityLevel >= 2);
    byId("golden-core-longevity-level").textContent = `当前 ${state.goldenCoreLongevityLevel} / 2 级（健身上限 +${state.goldenCoreLongevityLevel * 10}，本能力健身倍率 ×${Math.pow(2, state.goldenCoreLongevityLevel).toFixed(2)}）`;
    byId("golden-core-longevity-cost").textContent = state.goldenCoreLongevityLevel >= 2 ? "已达到等级上限" : `消耗 ${format(nextGoldenCoreLongevityCost, 0)} 法力`;
    byId("buy-golden-core-longevity").textContent = state.goldenCoreLongevityLevel >= 2 ? "已达上限" : "升级";
    byId("buy-golden-core-longevity").disabled = !state.goldenCoreUnlocked || state.goldenCoreLongevityLevel >= 2 || state.mana < nextGoldenCoreLongevityCost;
    byId("mana-solidification-preview").textContent = state.manaSolidificationUnlocked
      ? "当前 法力 ×0.90；战力 ×1.15"
      : "可提供 法力 ×0.90；战力 ×1.15";
    byId("mana-solidification-cost").textContent = `消耗 ${format(MANA_SOLIDIFICATION_COST, 0)} 法力`;
    byId("magic-treasure-preview").textContent = `${state.magicTreasureUnlocked ? "当前" : "可提供"}战力获取 +${format(magicTreasurePotentialPowerBonus())}`;
    byId("scatter-rebuild-ability").classList.toggle("purchased", state.scatterRebuildLevel >= 3);
    byId("scatter-rebuild-level").textContent = `当前 ${state.scatterRebuildLevel} / 3 次`;
    const nextScatterLevel = state.scatterRebuildLevel + 1;
    byId("scatter-rebuild-description").textContent = state.scatterRebuildLevel >= 3
      ? "三次散功重修已完成；爆墙及之前升级已永久保留，仙道能力、成就与宝物烙印不受影响。"
      : `第${nextScatterLevel}次将保留${SCATTER_RETAINED_UPGRADE_TIERS[nextScatterLevel]}升级；更高量级升级、资源、量级与境界重置，仙道能力继续保留。`;
    byId("scatter-rebuild-preview").textContent = `结丹需求 ×${format(Math.pow(2, state.scatterRebuildLevel), 0)}；元婴需求 ×${Math.pow(0.8, state.scatterRebuildLevel).toFixed(3)}；法力获取 ×${Math.pow(1.5, state.scatterRebuildLevel).toFixed(2)}`;
    byId("scatter-rebuild").textContent = state.scatterRebuildLevel >= 3 ? "已达上限" : "散功重修";
    byId("scatter-rebuild").disabled = !state.goldenCoreUnlocked || state.scatterRebuildLevel >= 3;
    byId("tian-ni-pearl-treasure").hidden = !hasAchievement("daoFoundation");
    byId("tian-ni-pearl-count").textContent = `已获得 ${format(pearlCount, 0)} 次`;
    byId("tian-ni-pearl-chance").textContent = `当前概率 ${formatProbability(tianNiPearlChance())}`;
    byId("tian-ni-pearl-effect").textContent = `法力倍率 ×${tianNiPearlManaMultiplier().toFixed(2)}`;
    byId("mysterious-green-bottle-treasure").hidden = !hasAchievement("goldenCore");
    byId("mysterious-green-bottle-count").textContent = `已获得 ${format(greenBottleCount, 0)} 次`;
    byId("mysterious-green-bottle-chance").textContent = `当前概率 ${formatProbability(mysteriousGreenBottleChance())}`;
    byId("mysterious-green-bottle-effect").textContent = `探寻法力倍率 ×${mysteriousGreenBottleMultiplier().toFixed(2)}`;
    byId("fu-bao-treasure").hidden = !hasAchievement("trueScale3");
    byId("fu-bao-count").textContent = `已获得 ${format(currentFuBaoCount, 0)} 次`;
    byId("fu-bao-chance").textContent = `当前概率 ${formatProbability(fuBaoChance())}`;
    byId("fu-bao-effect").textContent = `探寻法力转化战力 ${(fuBaoPowerRatio() * 100).toFixed(2)}%`;
    // DEBUG RESOURCE BREAKDOWN: 删除HTML区块或本函数区块后均会安全回退。
    window.renderResourceDebug?.();
    renderCultivationPage();

    updateNavigation();
    updateOneTimeUpgrade("exercise-upgrade", "buy-exercise", state.exercisePurchased, state.power >= EXERCISE_COST);
    updateOneTimeUpgrade("gym-upgrade", "buy-gym", state.gymPurchased, state.power >= GYM_COST);
    updateOneTimeUpgrade("transcendent-upgrade", "buy-transcendent", state.transcendentPurchased, state.power >= TRANSCENDENT_COST);
    updateOneTimeUpgrade("focus-upgrade", "buy-focus", state.focusPurchased, state.power >= FOCUS_COST);
    updateOneTimeUpgrade("extreme-exercise-upgrade", "buy-extreme-exercise", state.extremeExercisePurchased, state.power >= EXTREME_EXERCISE_COST);
    updateOneTimeUpgrade("water-upgrade", "buy-water", state.waterPurchased, state.power >= WATER_COST);
    updateOneTimeUpgrade("ghost-brain-upgrade", "buy-ghost-brain", state.ghostBrainPurchased, state.power >= GHOST_BRAIN_COST);
    updateOneTimeUpgrade("natural-strength-upgrade", "buy-natural-strength", state.naturalStrengthPurchased, state.power >= NATURAL_STRENGTH_COST);
    updateOneTimeUpgrade("mental-power-upgrade", "buy-mental-power", state.mentalPowerPurchased, state.power >= MENTAL_POWER_COST);
    updateOneTimeUpgrade("life-power-upgrade", "buy-life-power", state.lifePowerPurchased, state.power >= LIFE_POWER_COST);
    updateOneTimeUpgrade("my-style-upgrade", "buy-my-style", state.myStylePurchased, state.power >= MY_STYLE_COST);
    updateOneTimeUpgrade("intuition-upgrade", "buy-intuition", state.intuitionPurchased, state.power >= INTUITION_COST);
    updateOneTimeUpgrade("sonic-movement-upgrade", "buy-sonic-movement", state.sonicMovementPurchased, state.power >= SONIC_MOVEMENT_COST);
    updateOneTimeUnlock("qi-refining-stage", "unlock-qi-refining", state.qiRefiningUnlocked, cultivationSelected && state.power >= QI_REFINING_COST);
    updateOneTimeUnlock("immortal-life-ability", "unlock-immortal-life", state.immortalLifeUnlocked, state.qiRefiningUnlocked && state.mana >= IMMORTAL_LIFE_COST);
    updateOneTimeUnlock("foundation-stage", "unlock-foundation", state.foundationUnlocked, state.qiRefiningUnlocked && state.mana >= nextFoundationCost);
    updateOneTimeUnlock("golden-core-stage", "unlock-golden-core", state.goldenCoreUnlocked, state.foundationUnlocked && state.mana >= nextGoldenCoreCost);
    updateOneTimeUnlock("circulation-stage", "unlock-circulation", state.circulationUnlocked, state.foundationUnlocked && state.mana >= CIRCULATION_COST);
    updateOneTimeUnlock("mana-liquefaction-ability", "unlock-mana-liquefaction", state.manaLiquefactionUnlocked, state.foundationUnlocked && state.mana >= MANA_LIQUEFACTION_COST);
    updateOneTimeUnlock("technique-ability", "unlock-technique", state.techniqueUnlocked, state.foundationUnlocked && state.mana >= TECHNIQUE_COST);
    updateOneTimeUnlock("mana-solidification-ability", "unlock-mana-solidification", state.manaSolidificationUnlocked, state.goldenCoreUnlocked && state.mana >= MANA_SOLIDIFICATION_COST);
    updateOneTimeUnlock("magic-treasure-ability", "unlock-magic-treasure", state.magicTreasureUnlocked, state.goldenCoreUnlocked && state.mana >= MAGIC_TREASURE_COST);
    renderAchievements();
  }

  function bindHoldButton(id, action) {
    const button = byId(id);
    let delayTimer;
    let repeatTimer;
    let repeated = false;

    const stop = () => {
      window.clearTimeout(delayTimer);
      window.clearInterval(repeatTimer);
    };

    button.addEventListener("pointerdown", (event) => {
      if (button.disabled || event.button !== 0) return;
      repeated = false;
      delayTimer = window.setTimeout(() => {
        repeated = true;
        action();
        repeatTimer = window.setInterval(action, 110);
      }, 420);
    });
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("pointerleave", stop);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      if (repeated) {
        event.preventDefault();
        repeated = false;
        return;
      }
      action();
    });
  }

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  });
  bindHoldButton("train-button", train);
  bindHoldButton("buy-running", buyRunning);
  bindHoldButton("buy-exercise", buyExercise);
  bindHoldButton("buy-gym", buyGym);
  bindHoldButton("buy-transcendent", buyTranscendent);
  bindHoldButton("buy-focus", buyFocus);
  bindHoldButton("buy-extreme-exercise", buyExtremeExercise);
  bindHoldButton("buy-rock", buyRock);
  bindHoldButton("buy-water", buyWater);
  bindHoldButton("buy-ghost-brain", buyGhostBrain);
  bindHoldButton("buy-natural-strength", buyNaturalStrength);
  bindHoldButton("buy-mental-power", buyMentalPower);
  bindHoldButton("buy-life-power", buyLifePower);
  bindHoldButton("buy-my-style", buyMyStyle);
  bindHoldButton("buy-intuition", buyIntuition);
  bindHoldButton("buy-sonic-movement", buySonicMovement);
  byId("toggle-ghost-back").addEventListener("click", toggleGhostBack);
  bindHoldButton("unlock-qi-refining", unlockQiRefining);
  bindHoldButton("breathing-button", breathe);
  bindHoldButton("exploration-button", explore);
  bindHoldButton("unlock-immortal-life", unlockImmortalLife);
  bindHoldButton("unlock-foundation", unlockFoundation);
  bindHoldButton("unlock-golden-core", unlockGoldenCore);
  ADVANCED_REALMS.forEach((realm, index) => {
    bindHoldButton(`unlock-${realm.slug}`, () => unlockAdvancedRealm(index));
  });
  bindHoldButton("unlock-circulation", unlockCirculation);
  bindHoldButton("unlock-mana-liquefaction", unlockManaLiquefaction);
  bindHoldButton("unlock-technique", unlockTechnique);
  bindHoldButton("buy-longevity", buyLongevity);
  bindHoldButton("buy-golden-core-longevity", buyGoldenCoreLongevity);
  bindHoldButton("unlock-mana-solidification", unlockManaSolidification);
  bindHoldButton("unlock-magic-treasure", unlockMagicTreasure);
  byId("scatter-rebuild").addEventListener("click", scatterAndRebuild);
  document.querySelectorAll("[data-cultivation]").forEach((button) => {
    button.addEventListener("click", () => chooseCultivation(button.dataset.cultivation));
  });
  document.querySelectorAll("[data-cultivation-page]").forEach((button) => {
    button.addEventListener("click", () => switchCultivationPage(button.dataset.cultivationPage));
  });
  byId("toggle-achievement-filter").addEventListener("click", () => {
    state.hideUnlockedAchievements = !state.hideUnlockedAchievements;
    saveState();
    renderAchievements();
  });
  window.addEventListener("beforeunload", saveState);

  const settingsDialog = byId("settings-dialog");
  const importInput = byId("import-file");
  byId("open-settings").addEventListener("click", () => settingsDialog.showModal());
  byId("close-settings").addEventListener("click", () => settingsDialog.close());
  settingsDialog.addEventListener("click", (event) => {
    if (event.target === settingsDialog) settingsDialog.close();
  });
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.theme = input.value === "dark" ? "dark" : "light";
      applyTheme();
      saveState();
    });
  });
  byId("save-game").addEventListener("click", () => {
    saveState();
    showNotice("进度已保存");
  });
  byId("export-save").addEventListener("click", exportSave);
  byId("import-save").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", () => {
    const [file] = importInput.files;
    if (file) importSave(file);
    importInput.value = "";
  });
  byId("reset-game").addEventListener("click", resetGame);

  // DEBUG SPEED CONTROL: START（HTML按钮缺失时本区块不会影响游戏）
  const debugSpeedButton = byId("debug-speed-button");
  const debugSpeedOptions = [1, 5, 20, 100];
  debugSpeedButton?.addEventListener("click", () => {
    const currentSpeed = Number(debugSpeedButton.dataset.multiplier) || 1;
    const currentIndex = debugSpeedOptions.indexOf(currentSpeed);
    const nextSpeed = debugSpeedOptions[(currentIndex + 1) % debugSpeedOptions.length];
    debugSpeedButton.dataset.multiplier = String(nextSpeed);
    debugSpeedButton.textContent = `速度 ×${nextSpeed}`;
  });
  // DEBUG SPEED CONTROL: END

  const initialAchievementStates = achievementStates();
  const initialOfflineReport = simulateOfflineProgress((Date.now() - state.lastUpdateAt) / 1000);
  lastTickAt = Date.now();

  window.setInterval(() => {
    const now = Date.now();
    // 调速按钮被删除后会自动回退为正常速度，因此无需修改存档或其他逻辑。
    const debugSpeedMultiplier = Number(byId("debug-speed-button")?.dataset.multiplier) || 1;
    const elapsedSeconds = Math.max(0, now - lastTickAt) / 1000 * debugSpeedMultiplier;
    lastTickAt = now;
    const previousAchievements = achievementStates();
    advanceGame(elapsedSeconds);
    notifyNewAchievements(previousAchievements);
    render();
  }, 100);
  window.setInterval(saveState, 5000);

  ensureAchievementCards();
  applyTheme();
  switchPage(activePage);
  render();
  saveState();
  notifyNewAchievements(initialAchievementStates);
  if (initialOfflineReport) showNotice(initialOfflineReport, 6000);
})();
