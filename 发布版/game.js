(() => {
  "use strict";

  const SAVE_KEY = "wis-infinite-power-save-v2";
  const GAME_VERSION = "0.1.3.5";
  const GYM_COST = 20;
  const EXERCISE_COST = 50;
  const TRANSCENDENT_COST = 500;
  const FOCUS_COST = 150;
  const BREATHING_METHOD_COST = 750;
  const EXTREME_EXERCISE_COST = 1000;
  const WATER_COST = 20000;
  const GHOST_BRAIN_COST = 50000;
  const NATURAL_STRENGTH_COST = 10000;
  const MENTAL_POWER_COST = 100000;
  const LIFE_POWER_COST = 200000;
  const MY_STYLE_COST = 2e7;
  const INTUITION_COST = 5e7;
  const SONIC_MOVEMENT_COST = 1e8;
  const CARBON_LIMIT_COST = 1.5e8;
  const KILLING_INTENT_COST = 3e8;
  const ROCK_STRIKE_COST = 6e8;
  const HIGH_SPEED_METABOLISM_COST = 1.5e9;
  const ENDURANCE_ENHANCEMENT_COST = 4e9;
  const BULLET_TIME_COST = 1e10;
  const DYNAMIC_FOCUS_COST = 2e10;
  const SUPER_PERCEPTION_COST = 5e10;
  const INVULNERABLE_COST = 8e10;
  const REGENERATION_COST = 1.5e11;
  const SUPERPOWER_COST = 3e11;
  const SUPER_SPEED_THINKING_COST = 5e11;
  const MOUNTAIN_COLLAPSE_COST = 8e11;
  const ROCK_BASE_COST = 2000;
  const ROCK_BASE_LEVEL_CAP = 10;
  const QI_REFINING_COST = 10000;
  const FOUNDATION_BASE_COST = 200;
  const GOLDEN_CORE_BASE_COST = 8000;
  const ADVANCED_REALMS = [
    { key: "nascentSoul", slug: "nascent-soul", name: "元婴", baseCost: 2e7 },
    { key: "spiritTransformation", slug: "spirit-transformation", name: "化神", baseCost: 1.5e12 },
    { key: "voidRefinement", slug: "void-refinement", name: "炼虚", baseCost: 5e14 },
    { key: "bodyIntegration", slug: "body-integration", name: "合体", baseCost: 1e17 },
    { key: "mahayana", slug: "mahayana", name: "大乘", baseCost: 4e19 },
    { key: "trueImmortal", slug: "true-immortal", name: "真仙", baseCost: 1.5e22 },
    { key: "goldenImmortal", slug: "golden-immortal", name: "金仙", baseCost: 1.5e24 },
    { key: "taiyi", slug: "taiyi", name: "太乙", baseCost: 1.5e26 },
    { key: "daluo", slug: "daluo", name: "大罗", baseCost: 1e28 },
    { key: "daoAncestor", slug: "dao-ancestor", name: "道祖", baseCost: 1e37 }
  ];
  const IMMORTAL_LIFE_COST = 80;
  const CIRCULATION_COST = 400;
  const MINOR_TECHNIQUE_COST = 20000;
  const FLYING_ESCAPE_COST = 1e8;
  const MATERIAL_CONTROL_COST = 5e7;
  const DIVINE_SENSE_COST = 2.5e8;
  const GREAT_CULTIVATOR_COST = 5e8;
  const LONGEVITY_800_COSTS = [1e8, 4e8, 1.6e9, 6.4e9];
  const MANA_LIQUEFACTION_COST = 800;
  const QI_SPELL_COSTS = [20, 40, 80];
  const FOUNDATION_SPELL_COSTS = [300, 900, 2700];
  const LONGEVITY_COSTS = [200, 600];
  const GOLDEN_CORE_LONGEVITY_COSTS = [10000, 40000];
  const MANA_SOLIDIFICATION_COST = 16000;
  const TECHNIQUE_COST = 1200;
  const MAGIC_TREASURE_COST = 30000;
  const EXPLORATION_BASE_MANA = 1000;
  const EXPLORATION_MINIMUM_POWER_COST = 1e6;
  const EXPLORATION_STANDARD_POWER_COST = 1e7;
  const EXPLORATION_AMOUNT_DECAY = 0.2;
  const TRAINING_J_DECAY_SCALE = 1e6;
  const TRAINING_J_DECAY_LOG_DIVISOR = 9;
  const TRAINING_J_DECAY_POWER = 3;
  const OFFLINE_NOTICE_MIN_SECONDS = 10;
  const OFFLINE_MAX_STEPS = 20000;
  const SCATTER_RETAINED_UPGRADE_TIERS = ["", "普通人", "爆砖及之前", "爆墙及之前"];
  const REINCARNATION_ROOTS = [
    null,
    { name: "上品灵根", manaMultiplier: 1.5, requirementMultiplier: 1 },
    { name: "地灵根", manaMultiplier: 1.8, requirementMultiplier: 0.9 },
    { name: "天灵根", manaMultiplier: 2.4, requirementMultiplier: 0.75 }
  ];
  const CHALLENGE_DEFINITIONS = {
    innateDeficiency: {
      name: "先天不足",
      maxCompletions: 3,
      limitExponents: [0.85, 0.7, 0.55],
      rewardExponents: [1.05, 1.1, 1.2],
      requiredScaleIndex: 2,
      resourceName: "J",
      rewardSourceName: "健身"
    },
    powerless: {
      name: "无力",
      maxCompletions: 5,
      limitExponents: [0.85, 0.72, 0.6, 0.48, 0.36],
      rewardExponents: [1.05, 1.1, 1.15, 1.2, 1.3],
      requiredScaleIndex: 3,
      resourceName: "战力",
      rewardSourceName: "锻炼"
    }
  };
  const RESOURCE_SOFTCAP_STAGES = [
    { name: "爆墙", threshold: 4184, strength: 0.04, growth: 0.012, removedAtRealm: 1, removedBy: "炼气" },
    { name: "爆屋", threshold: 8368000, strength: 0.055, growth: 0.014, removedAtRealm: 2, removedBy: "筑基" },
    { name: "爆楼", threshold: 418400000, strength: 0.07, growth: 0.016, removedAtRealm: 3, removedBy: "结丹" },
    { name: "爆街", threshold: 4.184e10, strength: 0.1, growth: 0.02, removedAtRealm: 4, removedBy: "元婴" },
    { name: "爆城", threshold: 3.033e15, strength: 0.13, growth: 0.024, removedAtRealm: 5, removedBy: "化神" },
    { name: "爆国", threshold: 2.092e20, strength: 0.16, growth: 0.028, removedAtRealm: 7, removedBy: "合体" },
    { name: "爆大陆", threshold: 8.368e22, strength: 0.18, growth: 0.032, removedAtRealm: 8, removedBy: "大乘" },
    { name: "地表", threshold: 3.2e25, strength: 0.2, growth: 0.036, removedAtRealm: 9, removedBy: "真仙" },
    { name: "爆星", threshold: 2.24e31, strength: 0.22, growth: 0.04, removedAtRealm: 12, removedBy: "大罗" },
    { name: "恒星", threshold: 2.28e40, strength: 0.24, growth: 0.044, removedAtRealm: 13, removedBy: "道祖" },
    { name: "星系", threshold: 3e52, strength: 0.26, growth: 0.048, removedAtRealm: null, removedBy: null },
    { name: "超星系团", threshold: 2.565e57, strength: 0.28, growth: 0.052, removedAtRealm: null, removedBy: null },
    { name: "宇宙结构", threshold: 3e68, strength: 0.3, growth: 0.056, removedAtRealm: null, removedBy: null }
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
    lifetimeHighestJ: 0,
    lifetimeHighestPower: 0,
    lifetimeHighestScaleIndex: 0,
    lifetimeTotalJ: 0,
    lifetimeTotalPower: 0,
    lifetimeHighestMana: 0,
    lifetimeTotalMana: 0,
    lifetimeHighestCultivationRealmLevel: 0,
    immortalSelectionCount: 0,
    totalElapsedSeconds: 0,
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
    breathingMethodPurchased: false,
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
    carbonLimitPurchased: false,
    killingIntentPurchased: false,
    rockStrikePurchased: false,
    highSpeedMetabolismPurchased: false,
    enduranceEnhancementPurchased: false,
    bulletTimePurchased: false,
    dynamicFocusPurchased: false,
    superPerceptionPurchased: false,
    invulnerablePurchased: false,
    regenerationPurchased: false,
    superpowerPurchased: false,
    superSpeedThinkingPurchased: false,
    mountainCollapsePurchased: false,
    ghostBackActive: false,
    cultivationSystem: null,
    mana: 0,
    qiRefiningUnlocked: false,
    immortalLifeUnlocked: false,
    qiSpellLevel: 0,
    foundationUnlocked: false,
    goldenCoreUnlocked: false,
    advancedRealmLevel: 0,
    circulationUnlocked: false,
    minorTechniqueUnlocked: false,
    flyingEscapeUnlocked: false,
    longevity800Level: 0,
    explorationCount: 1,
    explorationProgress: 0,
    manaLiquefactionUnlocked: false,
    longevityLevel: 0,
    goldenCoreLongevityLevel: 0,
    manaSolidificationUnlocked: false,
    techniqueUnlocked: false,
    foundationSpellLevel: 0,
    magicTreasureUnlocked: false,
    scatterRebuildLevel: 0,
    scatterRetentionLevel: 0,
    reincarnationLevel: 0,
    permanentRootLevel: 0,
    reincarnationEffectLevel: 0,
    reincarnationManaJRewardLevel: 0,
    materialControlUnlocked: false,
    divineSenseUnlocked: false,
    greatCultivatorUnlocked: false,
    naturalTreasureLevel: 0,
    activeChallenge: null,
    challengeCompletions: { innateDeficiency: 0, powerless: 0 },
    unlockedAchievements: {},
    treasureImprints: { tianNiPearl: 0, mysteriousGreenBottle: 0, fuBao: 0, fitnessMembershipCard: 0 },
    hideUnlockedAchievements: false,
    theme: "light",
    lastUpdateAt: Date.now()
  };

  let passiveManaRollAccumulator = 0;
  let fitnessCardRollAccumulator = 0;
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

  function cultivationRealmName(level) {
    const safeLevel = Math.max(0, Math.floor(Number(level) || 0));
    if (safeLevel === 0) return "未踏入仙道";
    if (safeLevel === 1) return "炼气";
    if (safeLevel === 2) return "筑基";
    if (safeLevel === 3) return "结丹";
    return ADVANCED_REALMS[Math.min(ADVANCED_REALMS.length - 1, safeLevel - 4)]?.name ?? "未踏入仙道";
  }

  function softcapStageMultiplier(amount, stage) {
    if (amount <= stage.threshold) return 1;
    const overflowOrders = Math.log10(amount / stage.threshold);
    const penaltyOrders = stage.strength * overflowOrders + stage.growth * Math.pow(overflowOrders, 1.5);
    return Math.pow(10, -penaltyOrders);
  }

  function resourceSoftcapMultiplier(currentAmount) {
    const amount = Math.max(0, currentAmount);
    const realmLevel = cultivationRealmLevel();
    return RESOURCE_SOFTCAP_STAGES.reduce((multiplier, stage) => {
      if (stage.removedAtRealm !== null && realmLevel >= stage.removedAtRealm) return multiplier;
      return multiplier * softcapStageMultiplier(amount, stage);
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
      treasureImprints: { tianNiPearl: 0, mysteriousGreenBottle: 0, fuBao: 0, fitnessMembershipCard: 0 },
      challengeCompletions: { innateDeficiency: 0, powerless: 0 },
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
    const mana = qiRefiningUnlocked ? Math.max(0, Number(source.mana) || 0) : 0;
    const currentCultivationRealmLevel = goldenCoreUnlocked
      ? 3 + advancedRealmLevel
      : foundationUnlocked ? 2 : qiRefiningUnlocked ? 1 : 0;
    const maxSinglePowerGain = Math.max(0, Math.floor(Number(source.maxSinglePowerGain) || 0));
    const totalPower = Math.max(power, Number(source.totalPower) || 0);
    const totalElapsedSeconds = Math.max(0, Number(source.totalElapsedSeconds) || 0);
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
    if (totalElapsedSeconds >= 600) unlockedAchievements.trainingUp = true;
    SCALE_THRESHOLDS.slice(2).forEach((scale, offset) => {
      const scaleIndex = offset + 2;
      if (highestScaleIndex >= scaleIndex) unlockedAchievements[`scale${scaleIndex}`] = true;
      if (maxSinglePowerGain >= scale.power) unlockedAchievements[`trueScale${scaleIndex}`] = true;
    });
    const achievementScaleIndex = SCALE_THRESHOLDS.reduce((maximum, _scale, index) => (
      index >= 2 && unlockedAchievements[`scale${index}`] ? index : maximum
    ), unlockedAchievements.brick ? 1 : 0);
    const savedRockLevelCap = ROCK_BASE_LEVEL_CAP +
      (unlockedAchievements.trueScale2 ? 20 : 0) +
      (source.rockStrikePurchased === true ? 20 : 0) +
      (source.mountainCollapsePurchased === true ? 20 : 0);
    const activeChallenge = Object.prototype.hasOwnProperty.call(CHALLENGE_DEFINITIONS, source.activeChallenge)
      ? source.activeChallenge
      : null;
    const migratedPermanentRootLevel = Math.max(0, Math.min(3, Math.floor(Number(
      source.permanentRootLevel ?? source.reincarnationLevel
    ) || 0)));
    const legacyChallengeClearedReincarnation = source.permanentRootLevel == null &&
      source.reincarnationEffectLevel === 0 &&
      (Number(source.reincarnationLevel) || 0) > 0;
    const migratedReincarnationLevel = legacyChallengeClearedReincarnation
      ? 0
      : Math.max(0, Math.min(3, Math.floor(Number(source.reincarnationLevel) || 0)));
    const joules = Math.max(0, Number(source.joules) || 0);
    const lifetimeHighestScaleIndex = Math.max(
      highestScaleIndex,
      Math.min(SCALE_THRESHOLDS.length - 1, Math.floor(Number(source.lifetimeHighestScaleIndex) || 0))
    );
    const lifetimeHighestPower = Math.max(
      power,
      Number(source.highestPower) || 0,
      Number(source.lifetimeHighestPower) || 0,
      SCALE_THRESHOLDS[achievementScaleIndex].power
    );
    return {
      joules,
      power,
      highestPower: Math.max(power, Number(source.highestPower) || 0),
      lifetimeHighestJ: Math.max(joules, Number(source.lifetimeHighestJ) || 0),
      lifetimeHighestPower,
      lifetimeHighestScaleIndex: Math.max(lifetimeHighestScaleIndex, achievementScaleIndex),
      lifetimeTotalJ: Math.max(joules, Number(source.lifetimeHighestJ) || 0, Number(source.lifetimeTotalJ) || 0),
      lifetimeTotalPower: Math.max(totalPower, lifetimeHighestPower, Number(source.lifetimeTotalPower) || 0),
      lifetimeHighestMana: Math.max(mana, Number(source.lifetimeHighestMana) || 0),
      lifetimeTotalMana: Math.max(mana, Number(source.lifetimeHighestMana) || 0, Number(source.lifetimeTotalMana) || 0),
      lifetimeHighestCultivationRealmLevel: Math.min(
        3 + ADVANCED_REALMS.length,
        Math.max(currentCultivationRealmLevel, Math.floor(Number(source.lifetimeHighestCultivationRealmLevel) || 0))
      ),
      immortalSelectionCount: Math.max(cultivationSystem === "仙道" ? 1 : 0, Math.floor(Number(source.immortalSelectionCount) || 0)),
      totalElapsedSeconds,
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
      breathingMethodPurchased: source.breathingMethodPurchased === true,
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
      carbonLimitPurchased: source.carbonLimitPurchased === true,
      killingIntentPurchased: source.killingIntentPurchased === true,
      rockStrikePurchased: source.rockStrikePurchased === true,
      highSpeedMetabolismPurchased: source.highSpeedMetabolismPurchased === true,
      enduranceEnhancementPurchased: source.enduranceEnhancementPurchased === true,
      bulletTimePurchased: source.bulletTimePurchased === true,
      dynamicFocusPurchased: source.dynamicFocusPurchased === true,
      superPerceptionPurchased: source.superPerceptionPurchased === true,
      invulnerablePurchased: source.invulnerablePurchased === true,
      regenerationPurchased: source.regenerationPurchased === true,
      superpowerPurchased: source.superpowerPurchased === true,
      superSpeedThinkingPurchased: source.superSpeedThinkingPurchased === true,
      mountainCollapsePurchased: source.mountainCollapsePurchased === true,
      ghostBackActive: highestScaleIndex >= 3 && source.ghostBackActive === true,
      cultivationSystem,
      mana,
      qiRefiningUnlocked,
      immortalLifeUnlocked: source.immortalLifeUnlocked === true,
      qiSpellLevel: Math.max(0, Math.min(3, Math.floor(Number(source.qiSpellLevel) || 0))),
      foundationUnlocked,
      goldenCoreUnlocked,
      advancedRealmLevel,
      circulationUnlocked: source.circulationUnlocked === true,
      minorTechniqueUnlocked: source.minorTechniqueUnlocked === true,
      flyingEscapeUnlocked: source.flyingEscapeUnlocked === true,
      longevity800Level: Math.max(0, Math.min(4, Math.floor(Number(source.longevity800Level) || 0))),
      explorationCount: Math.max(1, Math.min(10000, Math.floor(Number(source.explorationCount) || 1))),
      explorationProgress: Math.max(0, Number(source.explorationProgress) || 0),
      manaLiquefactionUnlocked: source.manaLiquefactionUnlocked === true,
      longevityLevel: Math.max(0, Math.min(2, Math.floor(Number(source.longevityLevel) || 0))),
      goldenCoreLongevityLevel: Math.max(0, Math.min(2, Math.floor(Number(source.goldenCoreLongevityLevel) || 0))),
      manaSolidificationUnlocked: source.manaSolidificationUnlocked === true,
      techniqueUnlocked: source.techniqueUnlocked === true,
      foundationSpellLevel: Math.max(0, Math.min(3, Math.floor(Number(source.foundationSpellLevel) || 0))),
      magicTreasureUnlocked: source.magicTreasureUnlocked === true,
      scatterRebuildLevel: Math.max(0, Math.min(3, Math.floor(Number(source.scatterRebuildLevel) || 0))),
      scatterRetentionLevel: Math.max(0, Math.min(3, Math.floor(Number(
        source.scatterRetentionLevel ?? source.scatterRebuildLevel
      ) || 0))),
      reincarnationLevel: migratedReincarnationLevel,
      permanentRootLevel: migratedPermanentRootLevel,
      reincarnationEffectLevel: Math.max(0, Math.min(3, Math.floor(Number(
        source.reincarnationEffectLevel ?? migratedReincarnationLevel
      ) || 0))),
      reincarnationManaJRewardLevel: Math.max(0, Math.min(3, Math.floor(Number(
        source.reincarnationManaJRewardLevel
        ?? ((Number(source.advancedRealmLevel) || 0) >= 1 ? migratedReincarnationLevel : 0)
      ) || 0))),
      materialControlUnlocked: source.materialControlUnlocked === true,
      divineSenseUnlocked: source.divineSenseUnlocked === true,
      greatCultivatorUnlocked: source.greatCultivatorUnlocked === true,
      naturalTreasureLevel: Math.max(0, Math.min(10, Math.floor(Number(source.naturalTreasureLevel) || 0))),
      activeChallenge,
      challengeCompletions: Object.fromEntries(Object.entries(CHALLENGE_DEFINITIONS).map(([key, challenge]) => [
        key,
        Math.max(0, Math.min(challenge.maxCompletions, Math.floor(Number(source.challengeCompletions?.[key]) || 0)))
      ])),
      unlockedAchievements,
      treasureImprints: {
        tianNiPearl: Math.max(0, Math.floor(Number(source.treasureImprints?.tianNiPearl) || 0)),
        mysteriousGreenBottle: Math.max(0, Math.floor(Number(source.treasureImprints?.mysteriousGreenBottle) || 0)),
        fuBao: Math.max(0, Math.floor(Number(source.treasureImprints?.fuBao) || 0)),
        fitnessMembershipCard: Math.max(0, Math.floor(Number(source.treasureImprints?.fitnessMembershipCard) || 0))
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
    updateLifetimeStatistics();
    // 记录游戏状态已经推进到的时间点，避免页面冻结后保存吞掉尚未结算的离线时间。
    state.lastUpdateAt = lastTickAt;
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
      version: 29,
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
      fitnessCardRollAccumulator = 0;
      const previousAchievements = achievementStates();
      const offlineReport = simulateOfflineProgress((Date.now() - state.lastUpdateAt) / 1000);
      lastTickAt = Date.now();
      saveState();
      applyTheme();
      if ((activePage === "upgrades" && !upgradesUnlocked()) ||
          (activePage === "achievements" && !achievementsUnlocked()) ||
          (activePage === "cultivation" && !cultivationUnlocked()) ||
          (activePage === "treasures" && !treasuresUnlocked()) ||
          (activePage === "challenges" && !challengesUnlocked()) ||
          (activePage === "statistics" && !statisticsUnlocked())) {
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
    fitnessCardRollAccumulator = 0;
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

  function formatCost(value) {
    if (Math.abs(value) >= 1e9) return value.toExponential(2).replace("e+", "e");
    if (Math.abs(value) >= 1e6) return formatCompact(value, 1e6, "M");
    if (Math.abs(value) >= 1e3) return formatCompact(value, 1e3, "k");
    return Math.round(value).toLocaleString("zh-CN");
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

  function applySoftcapFunctions(value, softcaps = []) {
    return softcaps.reduce((current, softcap) => softcap(current), value);
  }

  function calculateSourceGain({ base = 0, additive = 0, multipliers = [], exponents = [], softcaps = [] } = {}) {
    const multiplied = Math.max(0, base + additive) * multiplyEffects(multipliers);
    const exponentiated = applyGainExponent(multiplied, multiplyEffects(exponents));
    return applySoftcapFunctions(exponentiated, softcaps);
  }

  function calculateRegionGain(sourceGains, { multipliers = [], exponents = [], softcaps = [] } = {}) {
    const sourceSum = sourceGains.reduce((sum, sourceGain) => sum + Math.max(0, Number(sourceGain) || 0), 0);
    const multiplied = sourceSum * multiplyEffects(multipliers);
    const exponentiated = applyGainExponent(multiplied, multiplyEffects(exponents));
    return applySoftcapFunctions(exponentiated, softcaps);
  }

  function formatMultiplierGroups(groups) {
    return Object.entries(groups)
      .map(([groupName, effects]) => `${groupName}：${effects.map((effect, index) => {
        const effectName = typeof effect === "object" && effect !== null ? effect.name : `乘区${index + 1}`;
        return `${effectName} ×${multiplierEffectValue(effect).toFixed(2)}`;
      }).join("、")}`)
      .join("；");
  }

  function gymPotentialMultiplier() {
    return (1.25 + Math.log10(1 + Math.max(0, state.power)) * 0.5) * breathingMethodGymMultiplier();
  }

  function gymMultiplier() {
    return state.gymPurchased ? gymPotentialMultiplier() * sonicMovementMultiplier() : 1;
  }

  function sonicMovementMultiplier() {
    return state.sonicMovementPurchased ? 3.8 : 1;
  }

  function breathingMethodGymMultiplier() {
    return state.breathingMethodPurchased ? 1.5 : 1;
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
    updateLifetimeStatistics();
    if (notify && state.highestScaleIndex > previousScaleIndex) {
      const enteredScales = SCALE_THRESHOLDS
        .slice(previousScaleIndex + 1, state.highestScaleIndex + 1)
        .map((scale) => scale.name);
      showScaleNotice(enteredScales);
    }
    checkActiveChallengeCompletion();
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

  function geometricAttemptsUntilSuccess(probability) {
    if (probability >= 1) return 1;
    if (probability <= 0) return Infinity;
    const denominator = Math.log1p(-probability);
    if (!Number.isFinite(denominator) || denominator === 0) return Infinity;
    return Math.floor(Math.log1p(-Math.random()) / denominator) + 1;
  }

  function rollDynamicAttempts(attempts, available, probability, award) {
    let remainingAttempts = Math.max(0, Math.floor(Number(attempts) || 0));
    if (remainingAttempts <= 0 || !available()) return 0;
    let gained = 0;
    while (remainingAttempts > 0 && available()) {
      const attemptsUntilSuccess = geometricAttemptsUntilSuccess(probability());
      if (!Number.isFinite(attemptsUntilSuccess) || attemptsUntilSuccess > remainingAttempts) break;
      remainingAttempts -= attemptsUntilSuccess;
      award();
      gained += 1;
    }
    return gained;
  }

  function rollTianNiPearlAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => treasuresUnlocked() && hasAchievement("daoFoundation"),
      tianNiPearlChance,
      () => { state.treasureImprints.tianNiPearl += 1; }
    );

    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得宝物烙印：天逆珠 +${gained}`);
    }
    return gained;
  }

  function rollFitnessMembershipCardAttempts(attempts, silent = false) {
    const gained = rollDynamicAttempts(
      attempts,
      () => hasAchievement("scale5") && fitnessJBonus() > 0,
      fitnessMembershipCardChance,
      () => { state.treasureImprints.fitnessMembershipCard += 1; }
    );

    if (!silent && gained > 0) {
      saveState();
      showNotice(`获得宝物烙印：健身房会员卡 +${gained}`);
    }
    return gained;
  }

  function advanceGameStep(elapsedSeconds, silentTreasureRolls) {
    const passiveJ = automaticJPerSecond() * elapsedSeconds;
    state.joules += passiveJ;
    state.lifetimeTotalJ += passiveJ;
    const passivePower = automaticPowerPerSecond() * elapsedSeconds;
    state.power += passivePower;
    state.totalPower += passivePower;
    state.lifetimeTotalPower += passivePower;
    const passiveManaRate = automaticManaPerSecond();
    const passiveMana = passiveManaRate * elapsedSeconds;
    state.mana += passiveMana;
    state.lifetimeTotalMana += passiveMana;

    let gainedPearls = 0;
    if (passiveManaRate > 0) {
      passiveManaRollAccumulator += elapsedSeconds;
      const rollAttempts = Math.floor(passiveManaRollAccumulator);
      passiveManaRollAccumulator -= rollAttempts;
      gainedPearls = rollTianNiPearlAttempts(rollAttempts, silentTreasureRolls);
    } else {
      passiveManaRollAccumulator = 0;
    }
    if (fitnessJBonus() > 0 && hasAchievement("scale5")) {
      fitnessCardRollAccumulator += elapsedSeconds;
      const cardRollAttempts = Math.floor(fitnessCardRollAccumulator);
      fitnessCardRollAccumulator -= cardRollAttempts;
      rollFitnessMembershipCardAttempts(cardRollAttempts, silentTreasureRolls);
    } else {
      fitnessCardRollAccumulator = 0;
    }
    updateScaleProgress(false);
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
      fitnessCards: fitnessMembershipCardCount()
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
    const fitnessCardGain = fitnessMembershipCardCount() - before.fitnessCards;
    if (fitnessCardGain > 0) gains.push(`${format(fitnessCardGain, 0)}张健身房会员卡`);
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

  function powerMultiplierGroups() {
    return {
      "量级论": [
        { name: "战五渣", value: hasAchievement("five") ? 1.05 : 1 },
        { name: "超凡之力", value: transcendentMultiplier() },
        { name: "天生神力", value: naturalStrengthMultiplier() },
        { name: "鬼背", value: ghostBackPowerMultiplier() },
        { name: "子弹时间", value: bulletTimePowerMultiplier() }
      ],
      "仙道": [
        { name: "仙道贵生", value: immortalLifePowerMultiplier() },
        { name: "功法", value: techniquePowerMultiplier() },
        { name: "炼气法术", value: qiSpellPowerMultiplier() },
        { name: "筑基法术", value: foundationSpellPowerMultiplier() },
        { name: "法力固化", value: manaSolidificationPowerMultiplier() },
        { name: "大修士", value: greatCultivatorPowerMultiplier() }
      ]
    };
  }

  function powerMultiplier() {
    return multiplyEffectGroups(powerMultiplierGroups());
  }

  function bulletTimePowerMultiplier() {
    return state.bulletTimePurchased ? 1.5 : 1;
  }

  function challengeCompletionCount(key) {
    return state.challengeCompletions?.[key] || 0;
  }

  function challengeRewardExponent(key) {
    const challenge = CHALLENGE_DEFINITIONS[key];
    const completions = challengeCompletionCount(key);
    return completions > 0 ? challenge.rewardExponents[completions - 1] : 1;
  }

  function activeChallengeLimitExponent(key) {
    if (state.activeChallenge !== key) return 1;
    const challenge = CHALLENGE_DEFINITIONS[key];
    return challenge.limitExponents[challengeCompletionCount(key)] ?? 1;
  }

  function jGainExponent() {
    return activeChallengeLimitExponent("innateDeficiency");
  }

  function powerGainExponent() {
    return (state.superpowerPurchased ? 1.05 : 1) * activeChallengeLimitExponent("powerless");
  }

  function fitnessSourceExponent() {
    return (state.invulnerablePurchased ? 1.15 : 1) * challengeRewardExponent("innateDeficiency");
  }

  function trainingSourceExponent() {
    return challengeRewardExponent("powerless");
  }

  function applyGainExponent(value, exponent) {
    return value > 0 ? Math.pow(value, exponent) : 0;
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

  function techniquePowerMultiplier() {
    return state.techniqueUnlocked ? 1.15 : 1;
  }

  function additiveLevelMultiplier(level, perLevelMultiplier) {
    return level > 0 ? level * perLevelMultiplier : 1;
  }

  function qiSpellPowerMultiplier() {
    return additiveLevelMultiplier(state.qiSpellLevel, 1.08);
  }

  function foundationSpellPowerMultiplier() {
    return additiveLevelMultiplier(state.foundationSpellLevel, 1.5);
  }

  function greatCultivatorPowerMultiplier() {
    return state.greatCultivatorUnlocked
      ? additiveLevelMultiplier(cultivationRealmLevel(), 1.5)
      : 1;
  }

  function jMultiplierGroups() {
    return {
      "强化": [
        { name: "跑步", value: gymMultiplier() },
        { name: "运动", value: exerciseMultiplier() },
        { name: "击水", value: waterJMultiplier() }
      ],
      "行动": [{ name: "鬼背", value: ghostBackJMultiplier() }]
    };
  }

  function jMultiplier() {
    return multiplyEffectGroups(jMultiplierGroups());
  }

  function automaticJPerSecond() {
    return finalJPerSecondFromSources(jSourceGains());
  }

  function jSourceGains({ includeFitness = true } = {}) {
    return [
      1,
      includeFitness ? fitnessJBonus() : 0,
      achievementJBonus(),
      manaJBonus(),
      killingIntentJBonus()
    ];
  }

  function finalJPerSecondFromSources(sourceGains) {
    return calculateRegionGain(sourceGains, {
      multipliers: [jMultiplier()],
      exponents: [jGainExponent()],
      softcaps: [(gain) => applyResourceSoftcap(gain, state.joules)]
    });
  }

  function longevityFitnessMultiplier() {
    return qiRefiningFitnessMultiplier() *
      additiveLevelMultiplier(state.longevityLevel, 2) *
      additiveLevelMultiplier(state.goldenCoreLongevityLevel, 4) *
      additiveLevelMultiplier(state.longevity800Level, 8) *
      lifePowerFitnessMultiplier() *
      myStyleFitnessMultiplier() *
      enduranceEnhancementFitnessMultiplier() *
      regenerationFitnessMultiplier();
  }

  function qiRefiningFitnessMultiplier() {
    return state.qiRefiningUnlocked ? 5 : 1;
  }

  function lifePowerFitnessMultiplier() {
    return state.lifePowerPurchased ? 1.5 : 1;
  }

  function myStylePotentialFitnessMultiplier() {
    const jMagnitude = Math.log10(1 + Math.max(0, state.joules));
    return 1 + 0.18 * Math.pow(jMagnitude, 0.85);
  }

  function myStyleFitnessMultiplier() {
    return state.myStylePurchased ? myStylePotentialFitnessMultiplier() : 1;
  }

  function carbonLimitPotentialFitnessBonus() {
    const jMagnitude = Math.log10(1 + Math.max(0, state.joules));
    return 0.8 * Math.pow(jMagnitude, 1.2);
  }

  function carbonLimitFitnessBonus() {
    return state.carbonLimitPurchased ? carbonLimitPotentialFitnessBonus() : 0;
  }

  function regenerationFitnessMultiplier() {
    return state.regenerationPurchased ? 5 : 1;
  }

  function enduranceEnhancementFitnessMultiplier() {
    return state.enduranceEnhancementPurchased ? 2 : 1;
  }

  function fitnessMembershipCardCount() {
    return state.treasureImprints?.fitnessMembershipCard || 0;
  }

  function fitnessMembershipCardFitnessBonus() {
    return fitnessMembershipCardCount() * 0.002;
  }

  function fitnessMembershipCardChance() {
    return 0.005 * Math.pow(0.97, fitnessMembershipCardCount());
  }

  function fitnessJBonus() {
    return calculateSourceGain({
      base: state.runningLevel * 2,
      multipliers: [longevityFitnessMultiplier() + carbonLimitFitnessBonus() + fitnessMembershipCardFitnessBonus()],
      exponents: [fitnessSourceExponent()]
    });
  }

  function manaLiquefactionManaJMultiplier() {
    return state.manaLiquefactionUnlocked ? 1.5 : 1;
  }

  function manaJBonus() {
    if (!state.qiRefiningUnlocked) return 0;
    return calculateSourceGain({
      base: manaJRawBonus(),
      multipliers: [manaLiquefactionManaJMultiplier()],
      exponents: [reincarnationManaJExponent()]
    });
  }

  function reincarnationManaJExponent() {
    return [1, 1.05, 1.1, 1.15][state.reincarnationManaJRewardLevel] ?? 1;
  }

  function manaJRawBonus() {
    return state.qiRefiningUnlocked
      ? 10 * Math.pow(Math.max(0, state.mana), 0.8)
      : 0;
  }

  function waterPotentialJMultiplier() {
    return 1 + Math.log10(1 + Math.max(0, state.highestPower)) * 0.14;
  }

  function waterJMultiplier() {
    return state.waterPurchased ? waterPotentialJMultiplier() : 1;
  }

  function runningCost() {
    const nextLevel = state.runningLevel + 1;
    if (nextLevel <= 10) {
      return Math.ceil(4 + (nextLevel - 1) * (12 / 9));
    }
    return Math.ceil(16 * Math.pow(1.25, nextLevel - 10));
  }

  function fitnessLevelCap() {
    const trueBrickBonus = hasAchievement("trueBrick") ? 20 : 0;
    return 10 + trueBrickBonus +
      (state.enduranceEnhancementPurchased ? 20 : 0) +
      state.longevityLevel * 10 +
      state.goldenCoreLongevityLevel * 10 +
      state.longevity800Level * 10;
  }

  function rockLevelCap() {
    return ROCK_BASE_LEVEL_CAP +
      (hasAchievement("trueScale2") ? 20 : 0) +
      (state.rockStrikePurchased ? 20 : 0) +
      (state.mountainCollapsePurchased ? 20 : 0);
  }

  function baseConversionGain() {
    if (state.joules < 10) return 0;
    return Math.floor(Math.pow(state.joules / 10, 0.75));
  }

  function trainingPowerDecayMultiplier() {
    const jDecades = Math.log10(1 + Math.max(0, state.joules) / TRAINING_J_DECAY_SCALE);
    return Math.pow(1 + jDecades / TRAINING_J_DECAY_LOG_DIVISOR, -TRAINING_J_DECAY_POWER);
  }

  function trainingPowerSource() {
    const baseGain = baseConversionGain();
    if (baseGain < 1) return 0;
    return calculateSourceGain({
      base: baseGain,
      multipliers: [trainingPowerDecayMultiplier(), highSpeedMetabolismMultiplier()],
      exponents: [trainingSourceExponent()]
    });
  }

  function highSpeedMetabolismMultiplier() {
    return state.highSpeedMetabolismPurchased ? 1.75 : 1;
  }

  function conversionGain() {
    return finalPowerGainFromSources([trainingPowerSource()]);
  }

  function ghostBrainPotentialPowerBonus() {
    return Math.pow(Math.max(0, state.highestPower), 0.6) / 250;
  }

  function ghostBrainPowerBonus() {
    return state.ghostBrainPurchased ? ghostBrainPotentialPowerBonus() : 0;
  }

  function magicTreasurePotentialPowerBonus() {
    return 10 * Math.pow(Math.max(0, state.mana), 0.65) * materialControlMultiplier();
  }

  function materialControlMultiplier() {
    return state.materialControlUnlocked ? 5 : 1;
  }

  function magicTreasurePowerBonus() {
    return state.magicTreasureUnlocked ? magicTreasurePotentialPowerBonus() : 0;
  }

  function ghostBrainPowerSource() {
    return calculateSourceGain({ base: ghostBrainPowerBonus() });
  }

  function magicTreasurePowerSource() {
    return calculateSourceGain({ base: magicTreasurePowerBonus() });
  }

  function ghostBrainActualPowerPerSecond() {
    return finalPowerGainFromSources([ghostBrainPowerSource()]);
  }

  function magicTreasureActualPowerPerSecond() {
    return finalPowerGainFromSources([magicTreasurePowerSource()]);
  }

  function joulesForNextBasePower() {
    const nextBasePower = baseConversionGain() + 1;
    return Math.ceil(10 * Math.pow(nextBasePower, 1 / 0.75));
  }

  function focusPowerPerSecond() {
    return calculateSourceGain({
      base: rawFocusPowerPerSecond(),
      softcaps: [(gain) => applyResourceSoftcap(gain, state.power)]
    });
  }

  function rawFocusPowerPerSecond() {
    if (!state.focusPurchased || baseConversionGain() < 1) return 0;
    return calculateSourceGain({
      base: baseConversionGain(),
      multipliers: [trainingPowerDecayMultiplier(), focusPercent(), intuitionFocusMultiplier(), dynamicFocusMultiplier()]
    });
  }

  function dynamicFocusMultiplier() {
    return state.dynamicFocusPurchased ? 1.5 : 1;
  }

  function focusDecayMultiplier() {
    return resourceSoftcapMultiplier(state.power);
  }

  function actualFocusPowerPerSecond() {
    return finalPowerGainFromSources([focusPowerPerSecond()]);
  }

  function killingIntentJBonus() {
    return state.killingIntentPurchased ? killingIntentPotentialJBonus() : 0;
  }

  function rawKillingIntentPotentialJBonus() {
    return state.focusPurchased
      ? automaticPowerPerSecond() * focusPercent() * 0.01 * superSpeedThinkingMultiplier()
      : 0;
  }

  function superSpeedThinkingMultiplier() {
    return state.superSpeedThinkingPurchased ? 5 : 1;
  }

  function killingIntentSoftcapMultiplier() {
    return resourceSoftcapMultiplier(rawKillingIntentPotentialJBonus());
  }

  function killingIntentPotentialJBonus() {
    return calculateSourceGain({
      base: rawKillingIntentPotentialJBonus(),
      softcaps: [(gain) => applyResourceSoftcap(gain, gain)]
    });
  }

  function focusPercent() {
    return 0.02 + (state.mentalPowerPurchased ? 0.01 : 0);
  }

  function intuitionPotentialFocusMultiplier() {
    const dynamicBonus = Math.log10(1 + Math.max(0, state.power)) * 0.1;
    return 1 + dynamicBonus * (state.superPerceptionPurchased ? 1.5 : 1);
  }

  function intuitionFocusMultiplier() {
    return state.intuitionPurchased ? intuitionPotentialFocusMultiplier() : 1;
  }

  function rockCost() {
    return Math.ceil(
      ROCK_BASE_COST +
      1500 * state.rockLevel +
      500 * Math.pow(state.rockLevel, 2)
    );
  }

  function rockPowerPerSecond() {
    if (state.rockLevel <= 0) return 0;
    return calculateSourceGain({
      base: 16 * Math.pow(state.rockLevel, 1.2),
      multipliers: [rockStrikeMultiplier()],
      exponents: [mountainCollapseExponent()]
    });
  }

  function rockStrikeMultiplier() {
    return state.rockStrikePurchased ? 2 : 1;
  }

  function mountainCollapseExponent() {
    return state.mountainCollapsePurchased ? 1.1 : 1;
  }

  function automaticPowerPerSecond() {
    return finalPowerGainFromSources([
      focusPowerPerSecond(),
      rockPowerPerSecond(),
      ghostBrainPowerSource(),
      magicTreasurePowerSource()
    ]);
  }

  function finalPowerGainFromSources(sourceGains) {
    return calculateRegionGain(sourceGains, {
      multipliers: [powerMultiplier()],
      exponents: [powerGainExponent()],
      softcaps: [(gain) => applyResourceSoftcap(gain, state.power)]
    });
  }

  function activeRootManaMultiplier() {
    if (!state.qiRefiningUnlocked) return 1;
    return permanentRootDefinition().manaMultiplier;
  }

  function activeRootRequirementMultiplier() {
    if (!state.qiRefiningUnlocked) return 1;
    return permanentRootDefinition().requirementMultiplier;
  }

  function realmRequirementMultiplier(stackCount) {
    return Math.pow(activeRootRequirementMultiplier(), Math.min(3, Math.max(0, stackCount)));
  }

  function activeRootName() {
    return permanentRootDefinition().name;
  }

  function permanentRootDefinition() {
    return REINCARNATION_ROOTS[state.permanentRootLevel]
      ?? (hasAchievement("seizeFoundation")
        ? { name: "中品灵根", manaMultiplier: 1.15, requirementMultiplier: 1.05 }
        : { name: "下品灵根", manaMultiplier: 1.1, requirementMultiplier: 1.1 });
  }

  function effectiveScatterRebuildLevel() {
    return Math.max(state.scatterRebuildLevel, state.reincarnationEffectLevel);
  }

  function nextRealmRequirementStackCount() {
    if (!state.qiRefiningUnlocked) return 0;
    if (!state.foundationUnlocked) return 1;
    if (!state.goldenCoreUnlocked) return 2;
    return ADVANCED_REALMS[state.advancedRealmLevel] ? state.advancedRealmLevel + 3 : 0;
  }

  function foundationCost() {
    return Math.round(FOUNDATION_BASE_COST * realmRequirementMultiplier(1));
  }

  function goldenCoreCost() {
    return Math.round(goldenCoreBaseCost() * realmRequirementMultiplier(2));
  }

  function goldenCoreBaseCost() {
    return GOLDEN_CORE_BASE_COST * additiveLevelMultiplier(effectiveScatterRebuildLevel(), 2);
  }

  function advancedRealmCost(index) {
    return Math.round(advancedRealmBaseCost(index) * realmRequirementMultiplier(index + 3));
  }

  function advancedRealmBaseCost(index) {
    const scatterDiscount = index === 0 ? Math.max(0.1, 1 - 0.2 * effectiveScatterRebuildLevel()) : 1;
    return ADVANCED_REALMS[index].baseCost * scatterDiscount;
  }

  function nextRealmCost() {
    if (!state.qiRefiningUnlocked) return 0;
    if (!state.foundationUnlocked) return foundationCost();
    if (!state.goldenCoreUnlocked) return goldenCoreCost();
    return ADVANCED_REALMS[state.advancedRealmLevel]
      ? advancedRealmCost(state.advancedRealmLevel)
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
    return finalManaGainFromSources([baseGain]);
  }

  function manaMultiplierGroups(currentMana = state.mana) {
    return {
      "境界": [
        { name: "境界奖励", value: immortalRealmManaMultiplier() },
        { name: "当前境界瓶颈", value: cultivationBottleneckManaMultiplier(currentMana) }
      ],
      "灵根": [
        { name: activeRootName(), value: activeRootManaMultiplier() }
      ],
      "仙道能力": [
        { name: "仙道贵生", value: immortalLifeManaMultiplier() },
        { name: "法力液化", value: manaLiquefactionManaMultiplier() },
        { name: "法力固化", value: manaSolidificationManaMultiplier() },
        { name: "功法", value: techniqueManaMultiplier() },
        { name: "散功重修", value: scatterRebuildManaMultiplier() }
      ],
      "宝物": [
        { name: "天材地宝", value: naturalTreasureManaMultiplier() },
        { name: "天逆珠", value: tianNiPearlManaMultiplier() }
      ]
    };
  }

  function manaGainMultiplier(currentMana = state.mana) {
    return multiplyEffectGroups(manaMultiplierGroups(currentMana));
  }

  function bottleneckManaMultiplier(requirement, active, currentMana = state.mana) {
    if (!active || requirement <= 0) return 1;
    const ratio = Math.max(0, Number(currentMana) || 0) / requirement;
    return 1 / (1 + 1.5 * Math.pow(ratio, 4));
  }

  function cultivationBottleneckManaMultiplier(currentMana = state.mana) {
    const requirement = nextRealmCost();
    return requirement > 0 ? bottleneckManaMultiplier(requirement, true, currentMana) : 1;
  }

  function immortalLifeManaMultiplier() {
    return state.immortalLifeUnlocked ? 1.1 : 1;
  }

  function manaLiquefactionManaMultiplier() {
    return state.manaLiquefactionUnlocked ? 0.8 : 1;
  }

  function manaSolidificationManaMultiplier() {
    return state.manaSolidificationUnlocked ? 0.9 : 1;
  }

  function techniqueManaMultiplier() {
    return state.techniqueUnlocked ? 1.25 : 1;
  }

  function scatterRebuildManaMultiplier() {
    return additiveLevelMultiplier(effectiveScatterRebuildLevel(), 1.5);
  }

  function naturalTreasureManaMultiplier() {
    return 1 + state.naturalTreasureLevel * 0.1;
  }

  function naturalTreasureUpgradeChance() {
    if (state.naturalTreasureLevel >= 10) return 0;
    return 0.1 * Math.pow(0.65, state.naturalTreasureLevel);
  }

  function tianNiPearlCount() {
    return state.treasureImprints?.tianNiPearl || 0;
  }

  function tianNiPearlManaMultiplier() {
    return 1 + tianNiPearlCount() * 0.005;
  }

  function tianNiPearlChance() {
    return 0.01 * Math.pow(0.99, tianNiPearlCount());
  }

  function mysteriousGreenBottleCount() {
    return state.treasureImprints?.mysteriousGreenBottle || 0;
  }

  function mysteriousGreenBottleMultiplier() {
    return 1 + mysteriousGreenBottleCount() * 0.02;
  }

  function mysteriousGreenBottleChance() {
    return 0.02 * Math.pow(0.85, mysteriousGreenBottleCount());
  }

  function fuBaoCount() {
    return state.treasureImprints?.fuBao || 0;
  }

  function fuBaoChance() {
    return 0.02 * Math.pow(0.7, fuBaoCount());
  }

  function fuBaoManaRatio() {
    return fuBaoCount() * 0.002;
  }

  function fuBaoExplorationManaBonus(powerCost) {
    return explorationBaseMana(powerCost) * fuBaoManaRatio();
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
    if (!state.circulationUnlocked) return 0;
    const circulationSource = calculateSourceGain({
      base: baseBreathingManaGain(),
      multipliers: [circulationPercent()]
    });
    return finalManaGainFromSources([circulationSource]);
  }

  function circulationPercent() {
    return 0.06 + (state.minorTechniqueUnlocked ? 0.02 : 0);
  }

  function explorationManaGain() {
    if (!state.goldenCoreUnlocked || explorationPowerCost() < EXPLORATION_MINIMUM_POWER_COST) return 0;
    const powerCost = explorationPowerCost();
    return explorationPotentialManaGain(powerCost);
  }

  function explorationPotentialManaGain(powerCost = explorationPowerCost(), currentMana = state.mana) {
    if (!state.goldenCoreUnlocked) return 0;
    const explorationSource = calculateSourceGain({
      base: explorationBaseMana(powerCost),
      multipliers: [flyingEscapeMultiplier(), mysteriousGreenBottleMultiplier()]
    });
    const fuBaoSource = calculateSourceGain({ base: fuBaoExplorationManaBonus(powerCost) });
    return finalManaGainFromSources([explorationSource, fuBaoSource], currentMana);
  }

  function finalManaGainFromSources(sourceGains, currentMana = state.mana) {
    return calculateRegionGain(sourceGains, { multipliers: [manaGainMultiplier(currentMana)] });
  }

  function flyingEscapeMultiplier() {
    return state.flyingEscapeUnlocked ? 10 : 1;
  }

  function explorationPowerCost() {
    return Math.max(0, state.power) * 0.1;
  }

  function rawExplorationAmountForCost(powerCost) {
    return Math.max(0, Number(powerCost) || 0) / EXPLORATION_STANDARD_POWER_COST;
  }

  function effectiveExplorationAmount(rawAmount) {
    const amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 1) return amount;
    const exponent = 1 / (1 + EXPLORATION_AMOUNT_DECAY * Math.sqrt(Math.log10(amount)));
    return Math.pow(amount, exponent);
  }

  function explorationAmountForCost(powerCost) {
    return effectiveExplorationAmount(rawExplorationAmountForCost(powerCost)) * divineSenseMultiplier();
  }

  function divineSenseMultiplier() {
    return state.divineSenseUnlocked ? 1.25 : 1;
  }

  function explorationBaseMana(powerCost = explorationPowerCost()) {
    return EXPLORATION_BASE_MANA * explorationAmountForCost(powerCost);
  }

  function explorationBatchPreview(requestedCount) {
    const requested = Math.max(1, Math.min(10000, Math.floor(Number(requestedCount) || 1)));
    if (explorationPowerCost() < EXPLORATION_MINIMUM_POWER_COST) return { attempts: 0, powerCost: 0, explorationAmount: 0 };
    let simulatedPower = Math.max(0, state.power);
    let powerCost = 0;
    let explorationAmount = 0;
    let attempts = 0;
    while (attempts < requested) {
      const currentCost = simulatedPower * 0.1;
      if (currentCost < EXPLORATION_MINIMUM_POWER_COST) break;
      simulatedPower -= currentCost;
      powerCost += currentCost;
      explorationAmount += explorationAmountForCost(currentCost);
      attempts += 1;
    }
    return { attempts, powerCost, explorationAmount };
  }

  function explorationBatchManaPreview(requestedCount) {
    const batch = explorationBatchPreview(requestedCount);
    let simulatedPower = Math.max(0, state.power);
    let simulatedMana = Math.max(0, state.mana);
    let powerCost = 0;
    let manaGain = 0;
    let explorationAmount = 0;
    let attempts = 0;

    while (attempts < batch.attempts) {
      const currentCost = simulatedPower * 0.1;
      if (currentCost < EXPLORATION_MINIMUM_POWER_COST) break;
      const currentGain = explorationPotentialManaGain(currentCost, simulatedMana);
      if (currentGain < 1) break;
      simulatedPower -= currentCost;
      simulatedMana += currentGain;
      powerCost += currentCost;
      manaGain += currentGain;
      explorationAmount += explorationAmountForCost(currentCost);
      attempts += 1;
    }

    return { attempts, powerCost, manaGain, explorationAmount };
  }

  function rollMysteriousGreenBottleAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => treasuresUnlocked() && hasAchievement("goldenCore"),
      mysteriousGreenBottleChance,
      () => { state.treasureImprints.mysteriousGreenBottle += 1; }
    );
  }

  function rollFuBaoAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => hasAchievement("trueScale3"),
      fuBaoChance,
      () => { state.treasureImprints.fuBao += 1; }
    );
  }

  function rollNaturalTreasureAttempts(attempts) {
    return rollDynamicAttempts(
      attempts,
      () => state.goldenCoreUnlocked && state.naturalTreasureLevel < 10,
      naturalTreasureUpgradeChance,
      () => { state.naturalTreasureLevel += 1; }
    );
  }

  function rollSeizeFoundationAttempts(attempts) {
    const count = Math.max(0, Math.floor(Number(attempts) || 0));
    if (count <= 0 || hasAchievement("seizeFoundation")) return false;
    if (Math.random() >= 1 - Math.pow(0.99, count)) return false;
    state.unlockedAchievements.seizeFoundation = true;
    return true;
  }

  function processExplorationJudgements(attempts) {
    const count = Math.max(0, Math.floor(Number(attempts) || 0));
    if (count <= 0) return { attempts: 0, tianNiPearl: 0, greenBottle: 0, fuBao: 0, naturalTreasure: 0, seizeFoundation: false };
    return {
      attempts: count,
      tianNiPearl: rollTianNiPearlAttempts(count, true),
      greenBottle: rollMysteriousGreenBottleAttempts(count),
      fuBao: rollFuBaoAttempts(count),
      naturalTreasure: rollNaturalTreasureAttempts(count),
      seizeFoundation: rollSeizeFoundationAttempts(count)
    };
  }

  function addExplorationProgress(explorationAmount) {
    const total = Math.max(0, state.explorationProgress) + Math.max(0, Number(explorationAmount) || 0);
    const attempts = Math.floor(total);
    state.explorationProgress = Math.max(0, total - attempts);
    return attempts;
  }

  function tryTianNiPearl() {
    if (!treasuresUnlocked() || !hasAchievement("daoFoundation") || Math.random() >= tianNiPearlChance()) return false;
    state.treasureImprints.tianNiPearl += 1;
    saveState();
    showNotice(`获得宝物烙印：天逆珠 ×${tianNiPearlCount()}`);
    return true;
  }

  function longevityCost() {
    return LONGEVITY_COSTS[state.longevityLevel] ?? 0;
  }

  function qiSpellCost() {
    return QI_SPELL_COSTS[state.qiSpellLevel] ?? 0;
  }

  function foundationSpellCost() {
    return FOUNDATION_SPELL_COSTS[state.foundationSpellLevel] ?? 0;
  }

  function goldenCoreLongevityCost() {
    return GOLDEN_CORE_LONGEVITY_COSTS[state.goldenCoreLongevityLevel] ?? 0;
  }

  function longevity800Cost() {
    return LONGEVITY_800_COSTS[state.longevity800Level] ?? 0;
  }

  function purchaseCheapestAvailable(candidates, resourceKey) {
    const affordable = candidates
      .filter((candidate) => candidate.available())
      .map((candidate) => ({ ...candidate, currentCost: candidate.cost() }))
      .filter((candidate) => candidate.currentCost > 0 && state[resourceKey] >= candidate.currentCost)
      .sort((left, right) => left.currentCost - right.currentCost)[0];
    if (!affordable) return false;
    state[resourceKey] -= affordable.currentCost;
    affordable.apply();
    return true;
  }

  function autoUpgradeEnhancements() {
    if (!hasAchievement("scale6")) return 0;
    const candidates = [
      { cost: () => GYM_COST, available: () => upgradesUnlocked() && !state.gymPurchased, apply: () => { state.gymPurchased = true; } },
      { cost: () => EXERCISE_COST, available: () => upgradesUnlocked() && !state.exercisePurchased, apply: () => { state.exercisePurchased = true; } },
      { cost: () => FOCUS_COST, available: () => state.brickUnlocked && !state.focusPurchased, apply: () => { state.focusPurchased = true; } },
      { cost: () => TRANSCENDENT_COST, available: () => state.brickUnlocked && !state.transcendentPurchased, apply: () => { state.transcendentPurchased = true; } },
      { cost: () => BREATHING_METHOD_COST, available: () => state.brickUnlocked && !state.breathingMethodPurchased, apply: () => { state.breathingMethodPurchased = true; } },
      { cost: () => EXTREME_EXERCISE_COST, available: () => state.brickUnlocked && !state.extremeExercisePurchased, apply: () => { state.extremeExercisePurchased = true; } },
      { cost: () => NATURAL_STRENGTH_COST, available: () => state.wallUnlocked && !state.naturalStrengthPurchased, apply: () => { state.naturalStrengthPurchased = true; } },
      { cost: () => WATER_COST, available: () => state.wallUnlocked && !state.waterPurchased, apply: () => { state.waterPurchased = true; } },
      { cost: () => GHOST_BRAIN_COST, available: () => state.wallUnlocked && !state.ghostBrainPurchased, apply: () => { state.ghostBrainPurchased = true; } },
      { cost: () => MENTAL_POWER_COST, available: () => state.wallUnlocked && !state.mentalPowerPurchased, apply: () => { state.mentalPowerPurchased = true; } },
      { cost: () => LIFE_POWER_COST, available: () => state.wallUnlocked && !state.lifePowerPurchased, apply: () => { state.lifePowerPurchased = true; } },
      { cost: () => MY_STYLE_COST, available: () => state.highestScaleIndex >= 3 && !state.myStylePurchased, apply: () => { state.myStylePurchased = true; } },
      { cost: () => INTUITION_COST, available: () => state.highestScaleIndex >= 3 && !state.intuitionPurchased, apply: () => { state.intuitionPurchased = true; } },
      { cost: () => SONIC_MOVEMENT_COST, available: () => state.highestScaleIndex >= 3 && !state.sonicMovementPurchased, apply: () => { state.sonicMovementPurchased = true; } },
      { cost: () => CARBON_LIMIT_COST, available: () => state.highestScaleIndex >= 3 && !state.carbonLimitPurchased, apply: () => { state.carbonLimitPurchased = true; } },
      { cost: () => KILLING_INTENT_COST, available: () => state.highestScaleIndex >= 3 && !state.killingIntentPurchased, apply: () => { state.killingIntentPurchased = true; } },
      { cost: () => ROCK_STRIKE_COST, available: () => state.highestScaleIndex >= 4 && !state.rockStrikePurchased, apply: () => { state.rockStrikePurchased = true; } },
      { cost: () => HIGH_SPEED_METABOLISM_COST, available: () => state.highestScaleIndex >= 4 && !state.highSpeedMetabolismPurchased, apply: () => { state.highSpeedMetabolismPurchased = true; } },
      { cost: () => ENDURANCE_ENHANCEMENT_COST, available: () => state.highestScaleIndex >= 4 && !state.enduranceEnhancementPurchased, apply: () => { state.enduranceEnhancementPurchased = true; } },
      { cost: () => BULLET_TIME_COST, available: () => state.highestScaleIndex >= 4 && !state.bulletTimePurchased, apply: () => { state.bulletTimePurchased = true; } },
      { cost: () => DYNAMIC_FOCUS_COST, available: () => state.highestScaleIndex >= 4 && !state.dynamicFocusPurchased, apply: () => { state.dynamicFocusPurchased = true; } },
      { cost: () => SUPER_PERCEPTION_COST, available: () => state.highestScaleIndex >= 5 && !state.superPerceptionPurchased, apply: () => { state.superPerceptionPurchased = true; } },
      { cost: () => INVULNERABLE_COST, available: () => state.highestScaleIndex >= 5 && !state.invulnerablePurchased, apply: () => { state.invulnerablePurchased = true; } },
      { cost: () => REGENERATION_COST, available: () => state.highestScaleIndex >= 5 && !state.regenerationPurchased, apply: () => { state.regenerationPurchased = true; } },
      { cost: () => SUPERPOWER_COST, available: () => state.highestScaleIndex >= 5 && !state.superpowerPurchased, apply: () => { state.superpowerPurchased = true; } },
      { cost: () => SUPER_SPEED_THINKING_COST, available: () => state.highestScaleIndex >= 5 && !state.superSpeedThinkingPurchased, apply: () => { state.superSpeedThinkingPurchased = true; } },
      { cost: () => MOUNTAIN_COLLAPSE_COST, available: () => state.highestScaleIndex >= 5 && !state.mountainCollapsePurchased, apply: () => { state.mountainCollapsePurchased = true; } }
    ];
    let purchases = 0;
    while (purchases < candidates.length && purchaseCheapestAvailable(candidates, "power")) purchases += 1;
    return purchases;
  }

  function autoUpgradeImmortalAbilities() {
    if (!hasAchievement("infantSpirit")) return 0;
    const candidates = [
      { cost: qiSpellCost, available: () => state.qiRefiningUnlocked && state.qiSpellLevel < 3, apply: () => { state.qiSpellLevel += 1; } },
      { cost: () => IMMORTAL_LIFE_COST, available: () => state.qiRefiningUnlocked && !state.immortalLifeUnlocked, apply: () => { state.immortalLifeUnlocked = true; } },
      { cost: longevityCost, available: () => state.foundationUnlocked && state.longevityLevel < 2, apply: () => { state.longevityLevel += 1; } },
      { cost: foundationSpellCost, available: () => state.foundationUnlocked && state.foundationSpellLevel < 3, apply: () => { state.foundationSpellLevel += 1; } },
      { cost: () => CIRCULATION_COST, available: () => state.foundationUnlocked && !state.circulationUnlocked, apply: () => { state.circulationUnlocked = true; } },
      { cost: () => MANA_LIQUEFACTION_COST, available: () => state.foundationUnlocked && !state.manaLiquefactionUnlocked, apply: () => { state.manaLiquefactionUnlocked = true; } },
      { cost: () => TECHNIQUE_COST, available: () => state.foundationUnlocked && !state.techniqueUnlocked, apply: () => { state.techniqueUnlocked = true; } },
      { cost: goldenCoreLongevityCost, available: () => state.goldenCoreUnlocked && state.goldenCoreLongevityLevel < 2, apply: () => { state.goldenCoreLongevityLevel += 1; } },
      { cost: () => MANA_SOLIDIFICATION_COST, available: () => state.goldenCoreUnlocked && !state.manaSolidificationUnlocked, apply: () => { state.manaSolidificationUnlocked = true; } },
      { cost: () => MINOR_TECHNIQUE_COST, available: () => state.goldenCoreUnlocked && !state.minorTechniqueUnlocked, apply: () => { state.minorTechniqueUnlocked = true; } },
      { cost: () => MAGIC_TREASURE_COST, available: () => state.goldenCoreUnlocked && !state.magicTreasureUnlocked, apply: () => { state.magicTreasureUnlocked = true; } },
      { cost: () => MATERIAL_CONTROL_COST, available: () => state.advancedRealmLevel >= 1 && !state.materialControlUnlocked, apply: () => { state.materialControlUnlocked = true; } },
      { cost: () => FLYING_ESCAPE_COST, available: () => state.advancedRealmLevel >= 1 && !state.flyingEscapeUnlocked, apply: () => { state.flyingEscapeUnlocked = true; } },
      { cost: longevity800Cost, available: () => state.advancedRealmLevel >= 1 && state.longevity800Level < 4, apply: () => { state.longevity800Level += 1; } },
      { cost: () => DIVINE_SENSE_COST, available: () => state.advancedRealmLevel >= 1 && !state.divineSenseUnlocked, apply: () => { state.divineSenseUnlocked = true; } },
      { cost: () => GREAT_CULTIVATOR_COST, available: () => state.advancedRealmLevel >= 1 && !state.greatCultivatorUnlocked, apply: () => { state.greatCultivatorUnlocked = true; } }
    ];
    // 散功重修与转世重修会重置进度并要求确认，永远不进入自动升级候选。
    let purchases = 0;
    const maximumPurchases = candidates.length + QI_SPELL_COSTS.length + FOUNDATION_SPELL_COSTS.length + LONGEVITY_COSTS.length + GOLDEN_CORE_LONGEVITY_COSTS.length + LONGEVITY_800_COSTS.length;
    while (purchases < maximumPurchases && purchaseCheapestAvailable(candidates, "mana")) purchases += 1;
    return purchases;
  }

  function runAchievementAutomations() {
    return autoUpgradeImmortalAbilities() + autoUpgradeEnhancements();
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

  function challengesUnlocked() {
    return hasAchievement("scale4");
  }

  function statisticsUnlocked() {
    return hasAchievement("trainingUp");
  }

  function hasAchievement(key) {
    return state.unlockedAchievements?.[key] === true;
  }

  function completedAchievement(key, condition) {
    return hasAchievement(key) || condition;
  }

  function achievementDefinitions() {
    const definitions = [
      { key: "powerOne", name: "战力 1", description: "获得至少 1 战力。", reward: "解锁强化界面", completed: completedAchievement("powerOne", state.totalPower >= 1) },
      { key: "five", name: "战五渣", description: "累计获得 5 战力。", reward: "战力倍率 ×1.05", completed: completedAchievement("five", state.totalPower >= 5) },
      { key: "brick", name: "爆砖", description: "拥有 200 战力。", reward: "每个成就 +0.1 J", completed: completedAchievement("brick", state.brickUnlocked) },
      { key: "trueBrick", name: "真爆砖", description: "一次锻炼获得 200 战力。", reward: "健身等级上限 +20", completed: completedAchievement("trueBrick", state.maxSinglePowerGain >= 200) },
      { key: "trainingUp", name: "练起来", description: "游戏时间达到10分钟。", reward: "解锁统计界面", completed: completedAchievement("trainingUp", state.totalElapsedSeconds >= 600) },
      { key: "aspireImmortality", name: "我欲成仙", description: "解锁炼气。", reward: "每个境界提供 ×1.2 法力倍率", completed: completedAchievement("aspireImmortality", state.qiRefiningUnlocked) },
      { key: "daoFoundation", name: "道基", description: "解锁筑基。", reward: "解锁宝物烙印·天逆珠", completed: completedAchievement("daoFoundation", state.foundationUnlocked) },
      { key: "goldenCore", name: "一颗金丹吞入腹", description: "解锁结丹。", reward: "解锁宝物烙印·神秘绿瓶", completed: completedAchievement("goldenCore", state.goldenCoreUnlocked) },
      { key: "infantSpirit", name: "婴灵", description: "突破元婴。", reward: "自动升级仙道能力", completed: completedAchievement("infantSpirit", state.advancedRealmLevel >= 1) },
      { key: "seizeFoundation", name: "夺基", description: "探寻时有1%概率达成。", reward: "下品灵根失效，获得中品灵根", completed: completedAchievement("seizeFoundation", false) }
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
            : scaleIndex === 4
              ? "解锁挑战界面"
              : scaleIndex === 5
                ? "解锁宝物烙印·健身房会员卡"
                : scaleIndex === 6
                  ? "自动升级强化"
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
    state.lifetimeTotalPower += gained;
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

  function buyBreathingMethod() {
    if (!state.brickUnlocked || state.breathingMethodPurchased || state.power < BREATHING_METHOD_COST) return;
    state.power -= BREATHING_METHOD_COST;
    state.breathingMethodPurchased = true;
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
    if (!state.wallUnlocked || state.rockLevel >= rockLevelCap() || state.power < cost) return;
    state.power -= cost;
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

  function buyCarbonLimit() {
    if (state.highestScaleIndex < 3 || state.carbonLimitPurchased || state.power < CARBON_LIMIT_COST) return;
    state.power -= CARBON_LIMIT_COST;
    state.carbonLimitPurchased = true;
    saveState();
    render();
  }

  function buyKillingIntent() {
    if (state.highestScaleIndex < 3 || state.killingIntentPurchased || state.power < KILLING_INTENT_COST) return;
    state.power -= KILLING_INTENT_COST;
    state.killingIntentPurchased = true;
    saveState();
    render();
  }

  function buyRockStrike() {
    if (state.highestScaleIndex < 4 || state.rockStrikePurchased || state.power < ROCK_STRIKE_COST) return;
    state.power -= ROCK_STRIKE_COST;
    state.rockStrikePurchased = true;
    saveState();
    render();
  }

  function buyHighSpeedMetabolism() {
    if (state.highestScaleIndex < 4 || state.highSpeedMetabolismPurchased || state.power < HIGH_SPEED_METABOLISM_COST) return;
    state.power -= HIGH_SPEED_METABOLISM_COST;
    state.highSpeedMetabolismPurchased = true;
    saveState();
    render();
  }

  function buyEnduranceEnhancement() {
    if (state.highestScaleIndex < 4 || state.enduranceEnhancementPurchased || state.power < ENDURANCE_ENHANCEMENT_COST) return;
    state.power -= ENDURANCE_ENHANCEMENT_COST;
    state.enduranceEnhancementPurchased = true;
    saveState();
    render();
  }

  function buyBulletTime() {
    if (state.highestScaleIndex < 4 || state.bulletTimePurchased || state.power < BULLET_TIME_COST) return;
    state.power -= BULLET_TIME_COST;
    state.bulletTimePurchased = true;
    saveState();
    render();
  }

  function buyDynamicFocus() {
    if (state.highestScaleIndex < 4 || state.dynamicFocusPurchased || state.power < DYNAMIC_FOCUS_COST) return;
    state.power -= DYNAMIC_FOCUS_COST;
    state.dynamicFocusPurchased = true;
    saveState();
    render();
  }

  function buySuperPerception() {
    if (state.highestScaleIndex < 5 || state.superPerceptionPurchased || state.power < SUPER_PERCEPTION_COST) return;
    state.power -= SUPER_PERCEPTION_COST;
    state.superPerceptionPurchased = true;
    saveState();
    render();
  }

  function buyInvulnerable() {
    if (state.highestScaleIndex < 5 || state.invulnerablePurchased || state.power < INVULNERABLE_COST) return;
    state.power -= INVULNERABLE_COST;
    state.invulnerablePurchased = true;
    saveState();
    render();
  }

  function buyRegeneration() {
    if (state.highestScaleIndex < 5 || state.regenerationPurchased || state.power < REGENERATION_COST) return;
    state.power -= REGENERATION_COST;
    state.regenerationPurchased = true;
    saveState();
    render();
  }

  function buySuperpower() {
    if (state.highestScaleIndex < 5 || state.superpowerPurchased || state.power < SUPERPOWER_COST) return;
    state.power -= SUPERPOWER_COST;
    state.superpowerPurchased = true;
    saveState();
    render();
  }

  function buySuperSpeedThinking() {
    if (state.highestScaleIndex < 5 || state.superSpeedThinkingPurchased || state.power < SUPER_SPEED_THINKING_COST) return;
    state.power -= SUPER_SPEED_THINKING_COST;
    state.superSpeedThinkingPurchased = true;
    saveState();
    render();
  }

  function buyMountainCollapse() {
    if (state.highestScaleIndex < 5 || state.mountainCollapsePurchased || state.power < MOUNTAIN_COLLAPSE_COST) return;
    state.power -= MOUNTAIN_COLLAPSE_COST;
    state.mountainCollapsePurchased = true;
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
    state.immortalSelectionCount += 1;
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
    state.lifetimeTotalMana += gained;
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
    if (index === 0) {
      state.reincarnationManaJRewardLevel = Math.max(
        state.reincarnationManaJRewardLevel,
        state.reincarnationEffectLevel
      );
    }
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

  function buyQiSpell() {
    const cost = qiSpellCost();
    if (!state.qiRefiningUnlocked || state.qiSpellLevel >= 3 || state.mana < cost) return;
    state.mana -= cost;
    state.qiSpellLevel += 1;
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

  function buyFoundationSpell() {
    const cost = foundationSpellCost();
    if (!state.foundationUnlocked || state.foundationSpellLevel >= 3 || state.mana < cost) return;
    state.mana -= cost;
    state.foundationSpellLevel += 1;
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

  function unlockMinorTechnique() {
    if (!state.goldenCoreUnlocked || state.minorTechniqueUnlocked || state.mana < MINOR_TECHNIQUE_COST) return;
    state.mana -= MINOR_TECHNIQUE_COST;
    state.minorTechniqueUnlocked = true;
    saveState();
    render();
  }

  function unlockFlyingEscape() {
    if (state.advancedRealmLevel < 1 || state.flyingEscapeUnlocked || state.mana < FLYING_ESCAPE_COST) return;
    state.mana -= FLYING_ESCAPE_COST;
    state.flyingEscapeUnlocked = true;
    saveState();
    render();
  }

  function unlockMaterialControl() {
    if (state.advancedRealmLevel < 1 || state.materialControlUnlocked || state.mana < MATERIAL_CONTROL_COST) return;
    state.mana -= MATERIAL_CONTROL_COST;
    state.materialControlUnlocked = true;
    saveState();
    render();
  }

  function unlockDivineSense() {
    if (state.advancedRealmLevel < 1 || state.divineSenseUnlocked || state.mana < DIVINE_SENSE_COST) return;
    state.mana -= DIVINE_SENSE_COST;
    state.divineSenseUnlocked = true;
    saveState();
    render();
  }

  function unlockGreatCultivator() {
    if (state.advancedRealmLevel < 1 || state.greatCultivatorUnlocked || state.mana < GREAT_CULTIVATOR_COST) return;
    state.mana -= GREAT_CULTIVATOR_COST;
    state.greatCultivatorUnlocked = true;
    saveState();
    render();
  }

  function buyLongevity800() {
    const cost = longevity800Cost();
    if (state.advancedRealmLevel < 1 || state.longevity800Level >= 4 || state.mana < cost) return;
    state.mana -= cost;
    state.longevity800Level += 1;
    saveState();
    render();
  }

  function scatterAndRebuild() {
    const currentEffectLevel = effectiveScatterRebuildLevel();
    if (!state.goldenCoreUnlocked || currentEffectLevel >= 3) return;
    const nextScatterLevel = currentEffectLevel + 1;
    const retainedTier = SCATTER_RETAINED_UPGRADE_TIERS[nextScatterLevel];
    if (!window.confirm(`第${nextScatterLevel}次散功重修将保留${retainedTier}强化；更高量级强化、J、战力、法力、量级和境界会重置，仙道能力、成就与宝物烙印继续保留。确定继续吗？`)) return;
    state.scatterRebuildLevel = nextScatterLevel;
    state.scatterRetentionLevel = nextScatterLevel;
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
      state.breathingMethodPurchased = false;
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
    state.carbonLimitPurchased = false;
    state.killingIntentPurchased = false;
    state.rockStrikePurchased = false;
    state.highSpeedMetabolismPurchased = false;
    state.enduranceEnhancementPurchased = false;
    state.bulletTimePurchased = false;
    state.dynamicFocusPurchased = false;
    state.superPerceptionPurchased = false;
    state.invulnerablePurchased = false;
    state.regenerationPurchased = false;
    state.superpowerPurchased = false;
    state.superSpeedThinkingPurchased = false;
    state.mountainCollapsePurchased = false;
    state.ghostBackActive = false;
    state.mana = 0;
    state.explorationProgress = 0;
    state.qiRefiningUnlocked = false;
    state.foundationUnlocked = false;
    state.goldenCoreUnlocked = false;
    state.advancedRealmLevel = 0;
    passiveManaRollAccumulator = 0;
    fitnessCardRollAccumulator = 0;
    activeCultivationPage = "realms";
    saveState();
    render();
    showNotice(`散功重修完成：${state.scatterRebuildLevel} / 3`);
  }

  function reincarnate() {
    if (state.advancedRealmLevel < 1 || state.reincarnationLevel >= 3) return;
    const nextLevel = state.reincarnationLevel + 1;
    const nextPermanentRootLevel = Math.max(state.permanentRootLevel, nextLevel);
    const nextRoot = REINCARNATION_ROOTS[nextPermanentRootLevel];
    const rootChangeText = nextPermanentRootLevel > state.permanentRootLevel
      ? `获得${nextRoot.name}`
      : `灵根保持${nextRoot.name}`;
    if (!window.confirm(`本轮第${nextLevel}次转世重修将${rootChangeText}，并重置强化、资源、量级、境界与仙道能力。挑战完成次数、永久成就、宝物烙印、灵根和统计记录保留。确定继续吗？`)) return;

    updateLifetimeStatistics();
    const preserved = {
      lifetimeHighestJ: state.lifetimeHighestJ,
      lifetimeHighestPower: state.lifetimeHighestPower,
      lifetimeHighestScaleIndex: state.lifetimeHighestScaleIndex,
      lifetimeTotalJ: state.lifetimeTotalJ,
      lifetimeTotalPower: state.lifetimeTotalPower,
      lifetimeHighestMana: state.lifetimeHighestMana,
      lifetimeTotalMana: state.lifetimeTotalMana,
      lifetimeHighestCultivationRealmLevel: state.lifetimeHighestCultivationRealmLevel,
      immortalSelectionCount: state.immortalSelectionCount,
      totalElapsedSeconds: state.totalElapsedSeconds,
      unlockedAchievements: { ...state.unlockedAchievements },
      treasureImprints: { ...state.treasureImprints },
      challengeCompletions: { ...state.challengeCompletions },
      activeChallenge: state.activeChallenge,
      reincarnationManaJRewardLevel: state.reincarnationManaJRewardLevel,
      hideUnlockedAchievements: state.hideUnlockedAchievements,
      theme: state.theme
    };
    state = {
      ...freshDefaultState(),
      ...preserved,
      cultivationSystem: "仙道",
      reincarnationLevel: nextLevel,
      permanentRootLevel: nextPermanentRootLevel,
      reincarnationEffectLevel: nextLevel,
      scatterRebuildLevel: 0,
      scatterRetentionLevel: 0,
      lastUpdateAt: Date.now()
    };
    passiveManaRollAccumulator = 0;
    fitnessCardRollAccumulator = 0;
    activeCultivationPage = "realms";
    saveState();
    render();
    showNotice(`转世重修完成：${rootChangeText}，自带${nextLevel}级散功重修效果`, 3200);
  }

  function explore() {
    if (!state.goldenCoreUnlocked || explorationPowerCost() < EXPLORATION_MINIMUM_POWER_COST) return;
    const requestedCount = state.flyingEscapeUnlocked ? state.explorationCount : 1;
    const batch = explorationBatchPreview(requestedCount);
    if (batch.attempts < 1) return;
    const previousAchievements = achievementStates();
    const rewards = { attempts: 0, tianNiPearl: 0, greenBottle: 0, fuBao: 0, naturalTreasure: 0, seizeFoundation: false };
    let completedAttempts = 0;

    while (completedAttempts < batch.attempts) {
      const powerCost = explorationPowerCost();
      if (powerCost < EXPLORATION_MINIMUM_POWER_COST) break;
      const gained = explorationPotentialManaGain(powerCost);
      if (gained < 1) break;

      state.power -= powerCost;
      state.mana += gained;
      state.lifetimeTotalMana += gained;

      const currentRewards = processExplorationJudgements(addExplorationProgress(explorationAmountForCost(powerCost)));
      rewards.attempts += currentRewards.attempts;
      rewards.tianNiPearl += currentRewards.tianNiPearl;
      rewards.greenBottle += currentRewards.greenBottle;
      rewards.fuBao += currentRewards.fuBao;
      rewards.naturalTreasure += currentRewards.naturalTreasure;
      rewards.seizeFoundation = rewards.seizeFoundation || currentRewards.seizeFoundation;
      completedAttempts += 1;
    }

    if (completedAttempts < 1) return;
    saveState();
    render();
    notifyNewAchievements(previousAchievements);
    const rewardParts = [];
    if (rewards.tianNiPearl > 0) rewardParts.push(`天逆珠 +${rewards.tianNiPearl}`);
    if (rewards.greenBottle > 0) rewardParts.push(`神秘绿瓶 +${rewards.greenBottle}`);
    if (rewards.fuBao > 0) rewardParts.push(`符宝 +${rewards.fuBao}`);
    if (rewards.naturalTreasure > 0) rewardParts.push(`天材地宝 +${rewards.naturalTreasure}级`);
    if (rewardParts.length > 0) showNotice(`探寻判定：${rewardParts.join("、")}`, 2800);
  }

  function resetForChallenge(challengeKey) {
    const preserved = {
      lifetimeHighestJ: state.lifetimeHighestJ,
      lifetimeHighestPower: state.lifetimeHighestPower,
      lifetimeHighestScaleIndex: state.lifetimeHighestScaleIndex,
      lifetimeTotalJ: state.lifetimeTotalJ,
      lifetimeTotalPower: state.lifetimeTotalPower,
      lifetimeHighestMana: state.lifetimeHighestMana,
      lifetimeTotalMana: state.lifetimeTotalMana,
      lifetimeHighestCultivationRealmLevel: state.lifetimeHighestCultivationRealmLevel,
      immortalSelectionCount: state.immortalSelectionCount,
      totalElapsedSeconds: state.totalElapsedSeconds,
      unlockedAchievements: { ...state.unlockedAchievements },
      treasureImprints: { ...state.treasureImprints },
      challengeCompletions: { ...state.challengeCompletions },
      permanentRootLevel: state.permanentRootLevel,
      hideUnlockedAchievements: state.hideUnlockedAchievements,
      theme: state.theme
    };
    state = {
      ...freshDefaultState(),
      ...preserved,
      activeChallenge: challengeKey,
      lastUpdateAt: Date.now()
    };
    passiveManaRollAccumulator = 0;
    fitnessCardRollAccumulator = 0;
    activeCultivationPage = "realms";
  }

  function startChallenge(challengeKey) {
    const challenge = CHALLENGE_DEFINITIONS[challengeKey];
    if (!challenge || !challengesUnlocked() || state.activeChallenge || challengeCompletionCount(challengeKey) >= challenge.maxCompletions) return;
    const nextCompletion = challengeCompletionCount(challengeKey) + 1;
    if (!window.confirm(`开启「${challenge.name}」第${nextCompletion}次挑战将重置行动、强化与体系进度，并把本轮散功、转世次数重置为0；永久灵根与挑战完成次数保留，之后可重新散功和转世。挑战成功或退出时不会再次重置。确定开启吗？`)) return;
    resetForChallenge(challengeKey);
    switchPage("challenges");
    saveState();
    render();
    showNotice(`已开启挑战：${challenge.name}`);
  }

  function exitChallenge() {
    if (!state.activeChallenge) return;
    const challengeName = CHALLENGE_DEFINITIONS[state.activeChallenge].name;
    state.activeChallenge = null;
    saveState();
    render();
    showNotice(`已退出挑战：${challengeName}`);
  }

  function checkActiveChallengeCompletion() {
    if (!state.activeChallenge) return false;
    const challengeKey = state.activeChallenge;
    const challenge = CHALLENGE_DEFINITIONS[challengeKey];
    if (!challenge || state.highestScaleIndex < challenge.requiredScaleIndex) return false;
    state.challengeCompletions[challengeKey] = Math.min(challenge.maxCompletions, challengeCompletionCount(challengeKey) + 1);
    state.activeChallenge = null;
    saveState();
    showNotice(`挑战成功：${challenge.name} ${state.challengeCompletions[challengeKey]} / ${challenge.maxCompletions}`);
    return true;
  }

  function switchPage(pageName) {
    if (pageName === "upgrades" && !upgradesUnlocked()) {
      showNotice("达成「战力 1」后解锁强化");
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
    if (pageName === "challenges" && !challengesUnlocked()) {
      showNotice("达成「爆楼」后解锁挑战");
      return;
    }
    if (pageName === "statistics" && !statisticsUnlocked()) {
      showNotice("游戏时间达到10分钟后解锁统计");
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
      [document.querySelector('[data-page="challenges"]'), challengesUnlocked()],
      [document.querySelector('[data-page="statistics"]'), statisticsUnlocked()],
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

  function sortCostGroups() {
    document.querySelectorAll("[data-sort-by-cost]").forEach((list) => {
      const currentRows = [...list.children];
      const sortedRows = [...currentRows]
        .sort((left, right) => Number(left.dataset.sortCost) - Number(right.dataset.sortCost));
      if (sortedRows.some((row, index) => row !== currentRows[index])) {
        sortedRows.forEach((row) => list.appendChild(row));
      }
    });
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

  function ensureAdvancedRealmAbilityGroups() {
    const container = byId("advanced-realm-ability-groups");
    if (!container || container.children.length > 0) return;
    container.innerHTML = ADVANCED_REALMS.slice(1, -1).map((realm, offset) => {
      const index = offset + 1;
      const nextRealm = ADVANCED_REALMS[index + 1];
      return `
        <details class="upgrade-group" id="${realm.slug}-abilities" open hidden>
          <summary>
            <span><b>${realm.name}</b><small>${nextRealm.name}瓶颈</small></span>
          </summary>
          <div class="item-list" data-sort-by-cost>
            <article class="item-row purchased" id="${realm.slug}-bottleneck-ability" data-sort-cost="0">
              <div class="item-content">
                <h2>${nextRealm.name}瓶颈</h2>
                <p>法力越接近当前${nextRealm.name}实际需求，法力获取倍率下降越快；突破${nextRealm.name}后解除。</p>
              </div>
              <div class="purchase-control">
                <span id="${realm.slug}-bottleneck-preview">当前法力倍率 ×1.00</span>
                <small id="${nextRealm.slug}-bottleneck-point">拐点：当前${nextRealm.name}实际需求</small>
                <button id="${realm.slug}-bottleneck-state" class="primary-button" type="button" disabled>已生效</button>
              </div>
            </article>
          </div>
        </details>
      `;
    }).join("");
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

  function renderChallenge(challengeKey, idPrefix) {
    const challenge = CHALLENGE_DEFINITIONS[challengeKey];
    const completed = challengeCompletionCount(challengeKey);
    const finished = completed >= challenge.maxCompletions;
    const active = state.activeChallenge === challengeKey;
    const nextLimit = challenge.limitExponents[Math.min(completed, challenge.limitExponents.length - 1)];
    const rewardExponent = challengeRewardExponent(challengeKey);
    const button = byId(`toggle-${idPrefix}`);

    byId(`${idPrefix}-progress`).textContent = `完成 ${completed} / ${challenge.maxCompletions} 次`;
    byId(`${idPrefix}-limit`).textContent = finished
      ? "全部限制已克服"
      : `${active ? "当前" : "下次"}限制：${challenge.resourceName}获取 ^${nextLimit.toFixed(2)}`;
    byId(`${idPrefix}-reward`).textContent = `当前奖励：${challenge.rewardSourceName}来源 ^${rewardExponent.toFixed(2)}`;
    button.textContent = active ? "退出挑战" : finished ? "已全部完成" : "开启挑战";
    button.disabled = finished || (state.activeChallenge !== null && !active);
  }

  function renderChallenges() {
    byId("challenge-active-state").textContent = state.activeChallenge
      ? `当前挑战：${CHALLENGE_DEFINITIONS[state.activeChallenge].name}`
      : "当前未进行挑战";
    renderChallenge("innateDeficiency", "innate-deficiency");
    renderChallenge("powerless", "powerless");
  }


  function render() {
    recordCurrentAchievements();
    updateLifetimeStatistics();
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
    const carbonLimitPotential = carbonLimitPotentialFitnessBonus();
    const intuitionPotential = intuitionPotentialFocusMultiplier();
    const passivePowerGain = automaticPowerPerSecond();
    const waterPotential = waterPotentialJMultiplier();
    const ghostBrainPotential = ghostBrainPotentialPowerBonus();
    const fitnessEffectivePotential = finalJPerSecondFromSources(jSourceGains()) - finalJPerSecondFromSources(jSourceGains({ includeFitness: false }));
    const ghostBrainEffectivePotential = state.ghostBrainPurchased
      ? ghostBrainActualPowerPerSecond()
      : finalPowerGainFromSources([calculateSourceGain({ base: ghostBrainPotential })]);
    const focusRawPotential = rawFocusPowerPerSecond();
    const rockRawPotential = rockPowerPerSecond();
    const focusEffectivePotential = actualFocusPowerPerSecond();
    const rockEffectivePotential = finalPowerGainFromSources([rockRawPotential]);
    const nextRunningCost = runningCost();
    const nextRockCost = rockCost();
    const rockCap = rockLevelCap();
    const fitnessCap = fitnessLevelCap();
    const nextPowerJ = joulesForNextBasePower();
    const manaGain = breathingManaGain();
    const passiveManaGain = automaticManaPerSecond();
    const circulationPotential = manaGain * circulationPercent();
    const nextManaJ = joulesForNextBaseMana();
    const nextQiSpellCost = qiSpellCost();
    const nextLongevityCost = longevityCost();
    const nextFoundationSpellCost = foundationSpellCost();
    const nextFoundationCost = foundationCost();
    const nextGoldenCoreCost = goldenCoreCost();
    const nextGoldenCoreLongevityCost = goldenCoreLongevityCost();
    const nextLongevity800Cost = longevity800Cost();
    const explorationCount = state.flyingEscapeUnlocked ? state.explorationCount : 1;
    const explorationBatch = explorationBatchManaPreview(explorationCount);
    const explorationBatchMana = explorationBatch.manaGain;
    const pearlCount = tianNiPearlCount();
    const greenBottleCount = mysteriousGreenBottleCount();
    const currentFuBaoCount = fuBaoCount();
    const membershipCardCount = fitnessMembershipCardCount();

    byId("game-version").textContent = `v${GAME_VERSION}`;
    byId("joules").textContent = format(state.joules);
    byId("power").textContent = format(state.power);
    byId("current-scale").textContent = SCALE_THRESHOLDS[state.highestScaleIndex].name;
    const nextScale = SCALE_THRESHOLDS[state.highestScaleIndex + 1];
    byId("next-scale-progress").textContent = nextScale
      ? `下一量级：${nextScale.name}（需要 ${format(nextScale.power, 0)} 战力）`
      : "已达到当前量级系统上限";
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
    byId("focus-preview").textContent = `来源层 +${format(focusPowerPerSecond())}；单独区域结算 ${format(focusEffectivePotential)} 战力/秒（来源软上限 ×${focusDecayMultiplier().toFixed(3)}）`;
    byId("breathing-method-preview").textContent = `${state.breathingMethodPurchased ? "当前" : "可提供"}跑步倍率 ×1.50`;
    byId("extreme-exercise-preview").textContent = `${state.extremeExercisePurchased ? "当前" : "可提供"} ×1.50`;
    byId("running-level").textContent = `当前 ${state.runningLevel} / ${fitnessCap} 级`;
    byId("running-rate").textContent = `当前实际 +${format(fitnessEffectivePotential)} J/秒`;
    byId("running-cost").textContent = `消耗 ${formatCost(nextRunningCost)} 战力`;
    byId("buy-running").textContent = state.runningLevel >= fitnessCap ? "已达上限" : "升级";
    byId("buy-running").disabled = state.runningLevel >= fitnessCap || state.power < nextRunningCost;
    byId("running-action").hidden = state.totalPower < 1;
    byId("brick-upgrades").hidden = !state.brickUnlocked && state.scatterRetentionLevel < 2;
    byId("wall-upgrades").hidden = !state.wallUnlocked && state.scatterRetentionLevel < 3;
    byId("house-upgrades").hidden = state.highestScaleIndex < 3;
    byId("building-upgrades").hidden = state.highestScaleIndex < 4;
    byId("street-upgrades").hidden = state.highestScaleIndex < 5;
    byId("rock-action").hidden = !state.wallUnlocked;
    byId("ghost-back-action").hidden = state.highestScaleIndex < 3;
    byId("ghost-back-action").classList.toggle("purchased", state.ghostBackActive);
    byId("ghost-back-state").textContent = state.ghostBackActive ? "当前已激活" : "当前未激活";
    byId("toggle-ghost-back").textContent = state.ghostBackActive ? "关闭" : "激活";
    byId("rock-level").textContent = `当前 ${state.rockLevel} / ${rockCap} 级`;
    byId("rock-rate").textContent = `来源层 +${format(rockRawPotential)}；单独区域结算 ${format(rockEffectivePotential)} 战力/秒`;
    byId("rock-cost").textContent = state.rockLevel >= rockCap ? "已达到等级上限" : `消耗 ${formatCost(nextRockCost)} 战力`;
    byId("buy-rock").textContent = state.rockLevel >= rockCap ? "已达上限" : "升级";
    byId("buy-rock").disabled = state.rockLevel >= rockCap || state.power < nextRockCost;
    byId("water-preview").textContent = `${state.waterPurchased ? "当前" : "可提供"}J获取倍率 ×${waterPotential.toFixed(2)}`;
    byId("ghost-brain-preview").textContent = `${state.ghostBrainPurchased ? "当前" : "可提供"}独立来源 +${format(ghostBrainPotential)}；单独区域结算 ${format(ghostBrainEffectivePotential)} 战力/秒`;
    byId("natural-strength-preview").textContent = `${state.naturalStrengthPurchased ? "当前" : "可提供"} ×${naturalStrengthPotential.toFixed(2)}`;
    byId("mental-power-preview").textContent = `${state.mentalPowerPurchased ? "当前集中比例" : "可使集中比例"} ${state.mentalPowerPurchased ? `${(focusPercent() * 100).toFixed(0)}%` : "+1%"}`;
    byId("life-power-preview").textContent = `${state.lifePowerPurchased ? "当前" : "可提供"}健身倍率 ×1.50`;
    byId("my-style-preview").textContent = `${state.myStylePurchased ? "当前" : "可提供"}健身倍率 ×${myStylePotential.toFixed(2)}`;
    byId("intuition-preview").textContent = `${state.intuitionPurchased ? "当前" : "可提供"}集中倍率 ×${intuitionPotential.toFixed(2)}`;
    byId("sonic-movement-preview").textContent = `${state.sonicMovementPurchased ? "当前" : "可提供"}跑步倍率 ×3.80`;
    byId("carbon-limit-preview").textContent = `${state.carbonLimitPurchased ? "当前" : "可提供"}健身倍率 +${carbonLimitPotential.toFixed(2)}`;
    byId("killing-intent-preview").textContent = `${state.killingIntentPurchased ? "当前" : "可提供"} +${format(killingIntentPotentialJBonus())} J/秒（战力获取的 ${(state.focusPurchased ? focusPercent() : 0).toFixed(2)}%，已计算来源软上限）`;
    byId("rock-strike-preview").textContent = `${state.rockStrikePurchased ? "当前" : "可使"}打岩来源 ×2；等级上限 +20`;
    byId("high-speed-metabolism-preview").textContent = `${state.highSpeedMetabolismPurchased ? "当前" : "可使"}锻炼来源 ×1.75`;
    byId("endurance-enhancement-preview").textContent = `${state.enduranceEnhancementPurchased ? "当前" : "可使"}健身倍率 ×2；等级上限 +20`;
    byId("bullet-time-preview").textContent = `${state.bulletTimePurchased ? "当前" : "可使"}战力倍率 +0.5（×1.5）`;
    byId("dynamic-focus-preview").textContent = `${state.dynamicFocusPurchased ? "当前" : "可使"}集中倍率 ×1.5`;
    byId("super-perception-preview").textContent = `${state.superPerceptionPurchased ? "当前" : "可提供"}直感动态加成 ×1.50`;
    byId("invulnerable-preview").textContent = `${state.invulnerablePurchased ? "当前" : "可提供"}健身来源 ^1.15`;
    byId("regeneration-preview").textContent = `${state.regenerationPurchased ? "当前" : "可提供"}健身倍率 ×5.00`;
    byId("superpower-preview").textContent = `${state.superpowerPurchased ? "当前" : "可提供"}战力区域 ^1.05`;
    byId("super-speed-thinking-preview").textContent = `${state.superSpeedThinkingPurchased ? "当前" : "可使"}杀气倍率 ×5.00`;
    byId("mountain-collapse-preview").textContent = `${state.mountainCollapsePurchased ? "当前" : "可使"}打岩来源 ^1.10；等级上限 +20`;
    byId("breathing-action").hidden = !state.qiRefiningUnlocked;
    byId("breathing-preview").textContent = manaGain >= 1
      ? `${format(state.joules)} J → ${format(manaGain)} 法力`
      : "至少需要 3,000 J";
    byId("next-mana-j").textContent = `下一法力所需：${format(nextManaJ, 0)} J`;
    byId("breathing-button").disabled = manaGain < 1;
    byId("exploration-action").hidden = !state.goldenCoreUnlocked;
    byId("exploration-preview").textContent = explorationBatch.attempts > 0
      ? `${formatCost(explorationBatch.powerCost)} 战力 → 约 ${format(explorationBatchMana)} 法力（未计批次中新宝物；有效探寻量 ${format(explorationBatch.explorationAmount)}，${explorationBatch.attempts}次）`
      : "单次探寻至少消耗 1M 战力";
    byId("exploration-cost").textContent = `消耗当前10%战力，至少消耗1M；累计有效探寻量 ${format(state.explorationProgress)} / 1`;
    byId("exploration-button").disabled = !state.goldenCoreUnlocked || explorationBatch.attempts < 1;
    byId("exploration-count-control").hidden = !state.flyingEscapeUnlocked;
    const explorationCountInput = byId("exploration-count");
    if (document.activeElement !== explorationCountInput) explorationCountInput.value = String(state.explorationCount);

    const cultivationSelected = state.cultivationSystem === "仙道";
    const cultivationCard = document.querySelector('[data-cultivation-card="仙道"]');
    const cultivationButton = document.querySelector('[data-cultivation="仙道"]');
    cultivationCard.classList.toggle("selected", cultivationSelected);
    cultivationButton.textContent = cultivationSelected ? "已选择" : "选择仙道";
    cultivationButton.disabled = cultivationSelected;
    byId("cultivation-choices").hidden = cultivationSelected;
    byId("cultivation-status").textContent = cultivationSelected
      ? "已选择：仙道（转世重修不会重置体系）"
      : "尚未选择体系";
    byId("immortal-progress").hidden = !cultivationSelected;
    byId("foundation-stage").hidden = !state.qiRefiningUnlocked;
    byId("foundation-cost").textContent = `消耗 ${formatCost(nextFoundationCost)} 法力`;
    byId("golden-core-stage").hidden = !state.foundationUnlocked;
    byId("golden-core-cost").textContent = `消耗 ${formatCost(nextGoldenCoreCost)} 法力`;
    ADVANCED_REALMS.forEach((realm, index) => {
      const unlocked = state.advancedRealmLevel > index;
      const isNextRealm = state.goldenCoreUnlocked && state.advancedRealmLevel === index;
      byId(`${realm.slug}-stage`).hidden = !state.goldenCoreUnlocked || index > state.advancedRealmLevel;
      byId(`${realm.slug}-cost`).textContent = `消耗 ${formatCost(advancedRealmCost(index))} 法力`;
      updateOneTimeUnlock(`${realm.slug}-stage`, `unlock-${realm.slug}`, unlocked, isNextRealm && state.mana >= advancedRealmCost(index));
    });
    const retainedAbilitiesVisible = state.scatterRetentionLevel > 0;
    const rootDefinition = permanentRootDefinition();
    const rootIds = {
      "下品灵根": "low-grade-root",
      "中品灵根": "medium-grade-root",
      "上品灵根": "high-grade-root",
      "地灵根": "earth-root",
      "天灵根": "heaven-root"
    };
    const activeRootId = rootIds[rootDefinition.name];
    const nextRootStackCount = nextRealmRequirementStackCount();
    const rootStackCount = Math.min(3, Math.max(0, nextRootStackCount));
    const nextRootRequirementMultiplier = Math.pow(rootDefinition.requirementMultiplier, rootStackCount);
    byId("root-abilities").hidden = !cultivationSelected;
    Object.values(rootIds).forEach((rootId) => {
      byId(`${rootId}-ability`).hidden = rootId !== activeRootId;
    });
    byId(`${activeRootId}-preview`).textContent = state.qiRefiningUnlocked
      ? `法力倍率 ×${rootDefinition.manaMultiplier.toFixed(2)}`
      : `法力倍率 ×${rootDefinition.manaMultiplier.toFixed(2)}（重新炼气后生效）`;
    byId(`${activeRootId}-requirement`).textContent = state.qiRefiningUnlocked
      ? `下次突破累计 ×${nextRootRequirementMultiplier.toFixed(3)}（最多叠加3层）`
      : `前三层境界要求每层 ×${rootDefinition.requirementMultiplier.toFixed(2)}，灵根永久保留`;
    byId(`${activeRootId}-state`).textContent = state.qiRefiningUnlocked ? "已生效" : "等待炼气";
    byId("qi-abilities").hidden = !state.qiRefiningUnlocked && !retainedAbilitiesVisible;
    byId("qi-bottleneck-preview").textContent = !state.qiRefiningUnlocked
      ? "等待重新炼气，当前不生效"
      : state.foundationUnlocked
        ? "已失效，法力倍率 ×1.00"
        : `当前法力倍率 ×${bottleneckManaMultiplier(nextFoundationCost, true).toFixed(2)}`;
    byId("qi-bottleneck-state").textContent = !state.qiRefiningUnlocked ? "等待炼气" : state.foundationUnlocked ? "已失效" : "已生效";
    byId("foundation-bottleneck-point").textContent = `拐点：${format(nextFoundationCost, 0)} 法力`;
    byId("immortal-life-preview").textContent = state.immortalLifeUnlocked
      ? "当前 战力 ×0.95；法力 ×1.10"
      : "可提供 战力 ×0.95；法力 ×1.10";
    byId("immortal-life-cost").textContent = `消耗 ${formatCost(IMMORTAL_LIFE_COST)} 法力`;
    byId("foundation-abilities").hidden = !state.foundationUnlocked && !retainedAbilitiesVisible;
    byId("foundation-bottleneck-preview").textContent = !state.foundationUnlocked
      ? "等待重新筑基，当前不生效"
      : state.goldenCoreUnlocked
        ? "已失效，法力倍率 ×1.00"
        : `当前法力倍率 ×${bottleneckManaMultiplier(nextGoldenCoreCost, true).toFixed(2)}`;
    byId("foundation-bottleneck-state").textContent = !state.foundationUnlocked ? "等待筑基" : state.goldenCoreUnlocked ? "已失效" : "已生效";
    byId("golden-core-bottleneck-point").textContent = `拐点：${format(nextGoldenCoreCost, 0)} 法力`;
    byId("qi-spell-ability").classList.toggle("purchased", state.qiSpellLevel >= 3);
    byId("qi-spell-level").textContent = `当前 ${state.qiSpellLevel} / 3 级（本能力战力倍率 ×${qiSpellPowerMultiplier().toFixed(2)}）`;
    byId("qi-spell-cost").textContent = state.qiSpellLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextQiSpellCost)} 法力`;
    byId("buy-qi-spell").textContent = state.qiSpellLevel >= 3 ? "已达上限" : "升级";
    byId("buy-qi-spell").disabled = !state.qiRefiningUnlocked || state.qiSpellLevel >= 3 || state.mana < nextQiSpellCost;
    byId("technique-preview").textContent = `${state.techniqueUnlocked ? "当前" : "可提供"} 法力 ×1.25；战力 ×1.15`;
    byId("circulation-preview").textContent = `${state.circulationUnlocked ? "当前" : "可提供"} +${format(circulationPotential)} 法力/秒（${(circulationPercent() * 100).toFixed(0)}%吐纳）`;
    byId("mana-liquefaction-preview").textContent = state.manaLiquefactionUnlocked
      ? "当前 法力 ×0.80；法力增加J ×1.50"
      : "可提供 法力 ×0.80；法力增加J ×1.50";
    byId("mana-liquefaction-cost").textContent = `消耗 ${formatCost(MANA_LIQUEFACTION_COST)} 法力`;
    byId("longevity-ability").hidden = !state.foundationUnlocked && !retainedAbilitiesVisible;
    byId("longevity-ability").classList.toggle("purchased", state.longevityLevel >= 2);
    byId("longevity-level").textContent = `当前 ${state.longevityLevel} / 2 级（健身上限 +${state.longevityLevel * 10}，本能力健身倍率 ×${additiveLevelMultiplier(state.longevityLevel, 2).toFixed(2)}）`;
    byId("longevity-cost").textContent = state.longevityLevel >= 2 ? "已达到等级上限" : `消耗 ${formatCost(nextLongevityCost)} 法力`;
    byId("buy-longevity").textContent = state.longevityLevel >= 2 ? "已达上限" : "升级";
    byId("buy-longevity").disabled = !state.foundationUnlocked || state.longevityLevel >= 2 || state.mana < nextLongevityCost;
    byId("foundation-spell-ability").classList.toggle("purchased", state.foundationSpellLevel >= 3);
    byId("foundation-spell-level").textContent = `当前 ${state.foundationSpellLevel} / 3 级（本能力战力倍率 ×${foundationSpellPowerMultiplier().toFixed(2)}）`;
    byId("foundation-spell-cost").textContent = state.foundationSpellLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextFoundationSpellCost)} 法力`;
    byId("buy-foundation-spell").textContent = state.foundationSpellLevel >= 3 ? "已达上限" : "升级";
    byId("buy-foundation-spell").disabled = !state.foundationUnlocked || state.foundationSpellLevel >= 3 || state.mana < nextFoundationSpellCost;
    byId("golden-core-abilities").hidden = !state.goldenCoreUnlocked && !retainedAbilitiesVisible;
    const nascentSoulRequirement = advancedRealmCost(0);
    const nascentSoulUnlocked = state.advancedRealmLevel >= 1;
    byId("golden-core-bottleneck-preview").textContent = !state.goldenCoreUnlocked
      ? "等待重新结丹，当前不生效"
      : nascentSoulUnlocked
        ? "已失效，法力倍率 ×1.00"
        : `当前法力倍率 ×${bottleneckManaMultiplier(nascentSoulRequirement, true).toFixed(2)}`;
    byId("golden-core-bottleneck-state").textContent = !state.goldenCoreUnlocked ? "等待结丹" : nascentSoulUnlocked ? "已失效" : "已生效";
    byId("nascent-soul-bottleneck-point").textContent = `拐点：${format(nascentSoulRequirement, 0)} 法力`;
    ADVANCED_REALMS.slice(0, -1).forEach((realm, index) => {
      const nextRealm = ADVANCED_REALMS[index + 1];
      const currentRealmUnlocked = state.goldenCoreUnlocked && state.advancedRealmLevel > index;
      const nextRealmUnlocked = state.advancedRealmLevel > index + 1;
      const requirement = advancedRealmCost(index + 1);
      byId(`${realm.slug}-abilities`).hidden = !currentRealmUnlocked;
      byId(`${realm.slug}-bottleneck-preview`).textContent = nextRealmUnlocked
        ? "已失效，法力倍率 ×1.00"
        : `当前法力倍率 ×${bottleneckManaMultiplier(requirement, true).toFixed(2)}`;
      byId(`${realm.slug}-bottleneck-state`).textContent = nextRealmUnlocked ? "已失效" : "已生效";
      byId(`${nextRealm.slug}-bottleneck-point`).textContent = `拐点：${format(requirement, 0)} 法力`;
    });
    byId("flying-escape-preview").textContent = state.flyingEscapeUnlocked
      ? "当前普通探寻来源 ×10，可设置批量次数"
      : "可使普通探寻来源 ×10，并解锁批量设置";
    byId("longevity-800-ability").classList.toggle("purchased", state.longevity800Level >= 4);
    byId("longevity-800-level").textContent = `当前 ${state.longevity800Level} / 4 级（健身上限 +${state.longevity800Level * 10}，本能力健身倍率 ×${additiveLevelMultiplier(state.longevity800Level, 8).toFixed(2)}）`;
    byId("longevity-800-cost").textContent = state.longevity800Level >= 4 ? "已达到等级上限" : `消耗 ${formatCost(nextLongevity800Cost)} 法力`;
    byId("buy-longevity-800").textContent = state.longevity800Level >= 4 ? "已达上限" : "升级";
    byId("buy-longevity-800").disabled = state.advancedRealmLevel < 1 || state.longevity800Level >= 4 || state.mana < nextLongevity800Cost;
    byId("natural-treasure-ability").classList.toggle("purchased", state.naturalTreasureLevel >= 10);
    byId("natural-treasure-level").textContent = `当前 ${state.naturalTreasureLevel} / 10 级（法力倍率 ×${naturalTreasureManaMultiplier().toFixed(2)}）`;
    byId("natural-treasure-chance").textContent = state.naturalTreasureLevel >= 10
      ? "已达到等级上限"
      : `每1有效探寻量升级概率 ${formatProbability(naturalTreasureUpgradeChance())}`;
    byId("natural-treasure-state").textContent = !state.goldenCoreUnlocked
      ? "等待重新结丹"
      : state.naturalTreasureLevel >= 10 ? "已达上限" : "仅可通过探寻升级";
    byId("golden-core-longevity-ability").classList.toggle("purchased", state.goldenCoreLongevityLevel >= 2);
    byId("golden-core-longevity-level").textContent = `当前 ${state.goldenCoreLongevityLevel} / 2 级（健身上限 +${state.goldenCoreLongevityLevel * 10}，本能力健身倍率 ×${additiveLevelMultiplier(state.goldenCoreLongevityLevel, 4).toFixed(2)}）`;
    byId("golden-core-longevity-cost").textContent = state.goldenCoreLongevityLevel >= 2 ? "已达到等级上限" : `消耗 ${formatCost(nextGoldenCoreLongevityCost)} 法力`;
    byId("buy-golden-core-longevity").textContent = state.goldenCoreLongevityLevel >= 2 ? "已达上限" : "升级";
    byId("buy-golden-core-longevity").disabled = !state.goldenCoreUnlocked || state.goldenCoreLongevityLevel >= 2 || state.mana < nextGoldenCoreLongevityCost;
    byId("mana-solidification-preview").textContent = state.manaSolidificationUnlocked
      ? "当前 法力 ×0.90；战力 ×1.15"
      : "可提供 法力 ×0.90；战力 ×1.15";
    byId("mana-solidification-cost").textContent = `消耗 ${formatCost(MANA_SOLIDIFICATION_COST)} 法力`;
    byId("minor-technique-preview").textContent = state.minorTechniqueUnlocked
      ? "当前周天比例 8%"
      : "可使周天比例 6% → 8%";
    byId("magic-treasure-preview").textContent = `${state.magicTreasureUnlocked ? "当前" : "可提供"}独立来源 +${format(magicTreasurePotentialPowerBonus())}（御物 ×${materialControlMultiplier().toFixed(0)}）；单独区域结算 ${format(state.magicTreasureUnlocked ? magicTreasureActualPowerPerSecond() : finalPowerGainFromSources([calculateSourceGain({ base: magicTreasurePotentialPowerBonus() })]))} 战力/秒`;
    byId("material-control-preview").textContent = `${state.materialControlUnlocked ? "当前" : "可使"}法宝倍率 ×5.00`;
    byId("divine-sense-preview").textContent = `${state.divineSenseUnlocked ? "当前" : "可使"}有效探寻量 ×1.25`;
    byId("great-cultivator-preview").textContent = `${state.greatCultivatorUnlocked ? "当前" : "可提供"}战力倍率 ×${greatCultivatorPowerMultiplier().toFixed(2)}（${cultivationRealmLevel()}个境界，内部加算）`;
    const currentScatterEffectLevel = effectiveScatterRebuildLevel();
    byId("scatter-rebuild-ability").classList.toggle("purchased", currentScatterEffectLevel >= 3);
    byId("scatter-rebuild-level").textContent = `当前效果 ${currentScatterEffectLevel} / 3；强化保留 ${state.scatterRetentionLevel} / 3`;
    const nextScatterLevel = currentScatterEffectLevel + 1;
    byId("scatter-rebuild-description").textContent = currentScatterEffectLevel >= 3
      ? `散功效果已达上限；当前强化保留至${SCATTER_RETAINED_UPGRADE_TIERS[state.scatterRetentionLevel] ?? "无"}。转世自带的散功效果不会提供强化保留。`
      : `第${nextScatterLevel}次将保留${SCATTER_RETAINED_UPGRADE_TIERS[nextScatterLevel]}强化；更高量级强化、资源、量级与境界重置，仙道能力继续保留。`;
    byId("scatter-rebuild-preview").textContent = `结丹需求 ×${format(additiveLevelMultiplier(currentScatterEffectLevel, 2), 0)}；元婴需求 ×${Math.max(0.1, 1 - 0.2 * currentScatterEffectLevel).toFixed(2)}；法力获取 ×${scatterRebuildManaMultiplier().toFixed(2)}`;
    byId("scatter-rebuild").textContent = currentScatterEffectLevel >= 3 ? "已达上限" : "散功重修";
    byId("scatter-rebuild").disabled = !state.goldenCoreUnlocked || currentScatterEffectLevel >= 3;
    const nextReincarnationLevel = state.reincarnationLevel + 1;
    const nextReincarnationRoot = REINCARNATION_ROOTS[nextReincarnationLevel];
    byId("reincarnation-ability").classList.toggle("purchased", state.reincarnationLevel >= 3);
    byId("reincarnation-description").textContent = state.reincarnationLevel >= 3
      ? "本轮三次转世均已完成；挑战会把本轮转世与散功次数重置为0，但不会降低永久灵根。"
      : "提升永久灵根并重置本轮进度；挑战完成次数保留。挑战会重置本轮转世与散功次数，但不会降低灵根。";
    byId("reincarnation-level").textContent = `永久灵根 ${state.permanentRootLevel} / 3（${activeRootName()}）；本轮转世 ${state.reincarnationLevel} / 3；法力J ^${reincarnationManaJExponent().toFixed(2)}`;
    const nextPermanentRootLevel = Math.max(state.permanentRootLevel, nextReincarnationLevel);
    const nextPermanentRoot = REINCARNATION_ROOTS[nextPermanentRootLevel];
    byId("reincarnation-preview").textContent = nextReincarnationRoot
      ? `下一次：${nextPermanentRootLevel > state.permanentRootLevel ? `获得${nextPermanentRoot.name}` : `保持${nextPermanentRoot.name}`}；转世效果升至${nextReincarnationLevel}级，重返元婴后法力获取J ^${[1, 1.05, 1.1, 1.15][nextReincarnationLevel].toFixed(2)}`
      : "本轮转世已达上限；开启挑战后可重新进行转世，永久灵根不会降低";
    byId("reincarnate").textContent = state.reincarnationLevel >= 3 ? "已达上限" : "转世重修";
    byId("reincarnate").disabled = state.advancedRealmLevel < 1 || state.reincarnationLevel >= 3;
    byId("tian-ni-pearl-treasure").hidden = !hasAchievement("daoFoundation");
    byId("tian-ni-pearl-count").textContent = `已获得 ${format(pearlCount, 0)} 次`;
    byId("tian-ni-pearl-chance").textContent = `单次判定概率 ${formatProbability(tianNiPearlChance())}`;
    byId("tian-ni-pearl-effect").textContent = `法力倍率 ×${tianNiPearlManaMultiplier().toFixed(2)}`;
    byId("mysterious-green-bottle-treasure").hidden = !hasAchievement("goldenCore");
    byId("mysterious-green-bottle-count").textContent = `已获得 ${format(greenBottleCount, 0)} 次`;
    byId("mysterious-green-bottle-chance").textContent = `每1有效探寻量概率 ${formatProbability(mysteriousGreenBottleChance())}`;
    byId("mysterious-green-bottle-effect").textContent = `探寻法力倍率 ×${mysteriousGreenBottleMultiplier().toFixed(2)}`;
    byId("fu-bao-treasure").hidden = !hasAchievement("trueScale3");
    byId("fu-bao-count").textContent = `已获得 ${format(currentFuBaoCount, 0)} 次`;
    byId("fu-bao-chance").textContent = `每1有效探寻量概率 ${formatProbability(fuBaoChance())}`;
    byId("fu-bao-effect").textContent = `额外法力为探寻基础法力的 ${(fuBaoManaRatio() * 100).toFixed(2)}%`;
    byId("fitness-membership-card-treasure").hidden = !hasAchievement("scale5");
    byId("fitness-membership-card-count").textContent = `已获得 ${format(membershipCardCount, 0)} 次`;
    byId("fitness-membership-card-chance").textContent = `当前每秒概率 ${formatProbability(fitnessMembershipCardChance())}`;
    byId("fitness-membership-card-effect").textContent = `健身倍率 +${fitnessMembershipCardFitnessBonus().toFixed(3)}`;
    byId("statistics-highest-j").textContent = format(state.lifetimeHighestJ);
    byId("statistics-highest-power").textContent = format(state.lifetimeHighestPower);
    byId("statistics-highest-scale").textContent = SCALE_THRESHOLDS[state.lifetimeHighestScaleIndex].name;
    byId("statistics-total-j").textContent = format(state.lifetimeTotalJ);
    byId("statistics-total-power").textContent = format(state.lifetimeTotalPower);
    byId("statistics-highest-realm").textContent = cultivationRealmName(state.lifetimeHighestCultivationRealmLevel);
    byId("statistics-highest-mana").textContent = format(state.lifetimeHighestMana);
    byId("statistics-total-mana").textContent = format(state.lifetimeTotalMana);
    byId("statistics-immortal-selections").textContent = format(state.immortalSelectionCount, 0);
    byId("statistics-real-time").textContent = formatElapsedTime(state.totalElapsedSeconds);
    byId("statistics-game-time").textContent = formatGameCalendar(state.totalElapsedSeconds);
    renderChallenges();
    renderCultivationPage();

    updateNavigation();
    updateOneTimeUpgrade("exercise-upgrade", "buy-exercise", state.exercisePurchased, state.power >= EXERCISE_COST);
    updateOneTimeUpgrade("gym-upgrade", "buy-gym", state.gymPurchased, state.power >= GYM_COST);
    updateOneTimeUpgrade("transcendent-upgrade", "buy-transcendent", state.transcendentPurchased, state.brickUnlocked && state.power >= TRANSCENDENT_COST);
    updateOneTimeUpgrade("focus-upgrade", "buy-focus", state.focusPurchased, state.brickUnlocked && state.power >= FOCUS_COST);
    updateOneTimeUpgrade("breathing-method-upgrade", "buy-breathing-method", state.breathingMethodPurchased, state.brickUnlocked && state.power >= BREATHING_METHOD_COST);
    updateOneTimeUpgrade("extreme-exercise-upgrade", "buy-extreme-exercise", state.extremeExercisePurchased, state.brickUnlocked && state.power >= EXTREME_EXERCISE_COST);
    updateOneTimeUpgrade("water-upgrade", "buy-water", state.waterPurchased, state.wallUnlocked && state.power >= WATER_COST);
    updateOneTimeUpgrade("ghost-brain-upgrade", "buy-ghost-brain", state.ghostBrainPurchased, state.wallUnlocked && state.power >= GHOST_BRAIN_COST);
    updateOneTimeUpgrade("natural-strength-upgrade", "buy-natural-strength", state.naturalStrengthPurchased, state.wallUnlocked && state.power >= NATURAL_STRENGTH_COST);
    updateOneTimeUpgrade("mental-power-upgrade", "buy-mental-power", state.mentalPowerPurchased, state.wallUnlocked && state.power >= MENTAL_POWER_COST);
    updateOneTimeUpgrade("life-power-upgrade", "buy-life-power", state.lifePowerPurchased, state.wallUnlocked && state.power >= LIFE_POWER_COST);
    updateOneTimeUpgrade("my-style-upgrade", "buy-my-style", state.myStylePurchased, state.power >= MY_STYLE_COST);
    updateOneTimeUpgrade("intuition-upgrade", "buy-intuition", state.intuitionPurchased, state.power >= INTUITION_COST);
    updateOneTimeUpgrade("sonic-movement-upgrade", "buy-sonic-movement", state.sonicMovementPurchased, state.power >= SONIC_MOVEMENT_COST);
    updateOneTimeUpgrade("carbon-limit-upgrade", "buy-carbon-limit", state.carbonLimitPurchased, state.highestScaleIndex >= 3 && state.power >= CARBON_LIMIT_COST);
    updateOneTimeUpgrade("killing-intent-upgrade", "buy-killing-intent", state.killingIntentPurchased, state.highestScaleIndex >= 3 && state.power >= KILLING_INTENT_COST);
    updateOneTimeUpgrade("rock-strike-upgrade", "buy-rock-strike", state.rockStrikePurchased, state.highestScaleIndex >= 4 && state.power >= ROCK_STRIKE_COST);
    updateOneTimeUpgrade("high-speed-metabolism-upgrade", "buy-high-speed-metabolism", state.highSpeedMetabolismPurchased, state.highestScaleIndex >= 4 && state.power >= HIGH_SPEED_METABOLISM_COST);
    updateOneTimeUpgrade("endurance-enhancement-upgrade", "buy-endurance-enhancement", state.enduranceEnhancementPurchased, state.highestScaleIndex >= 4 && state.power >= ENDURANCE_ENHANCEMENT_COST);
    updateOneTimeUpgrade("bullet-time-upgrade", "buy-bullet-time", state.bulletTimePurchased, state.highestScaleIndex >= 4 && state.power >= BULLET_TIME_COST);
    updateOneTimeUpgrade("dynamic-focus-upgrade", "buy-dynamic-focus", state.dynamicFocusPurchased, state.highestScaleIndex >= 4 && state.power >= DYNAMIC_FOCUS_COST);
    updateOneTimeUpgrade("super-perception-upgrade", "buy-super-perception", state.superPerceptionPurchased, state.highestScaleIndex >= 5 && state.power >= SUPER_PERCEPTION_COST);
    updateOneTimeUpgrade("invulnerable-upgrade", "buy-invulnerable", state.invulnerablePurchased, state.highestScaleIndex >= 5 && state.power >= INVULNERABLE_COST);
    updateOneTimeUpgrade("regeneration-upgrade", "buy-regeneration", state.regenerationPurchased, state.highestScaleIndex >= 5 && state.power >= REGENERATION_COST);
    updateOneTimeUpgrade("superpower-upgrade", "buy-superpower", state.superpowerPurchased, state.highestScaleIndex >= 5 && state.power >= SUPERPOWER_COST);
    updateOneTimeUpgrade("super-speed-thinking-upgrade", "buy-super-speed-thinking", state.superSpeedThinkingPurchased, state.highestScaleIndex >= 5 && state.power >= SUPER_SPEED_THINKING_COST);
    updateOneTimeUpgrade("mountain-collapse-upgrade", "buy-mountain-collapse", state.mountainCollapsePurchased, state.highestScaleIndex >= 5 && state.power >= MOUNTAIN_COLLAPSE_COST);
    updateOneTimeUnlock("qi-refining-stage", "unlock-qi-refining", state.qiRefiningUnlocked, cultivationSelected && state.power >= QI_REFINING_COST);
    updateOneTimeUnlock("immortal-life-ability", "unlock-immortal-life", state.immortalLifeUnlocked, state.qiRefiningUnlocked && state.mana >= IMMORTAL_LIFE_COST);
    updateOneTimeUnlock("foundation-stage", "unlock-foundation", state.foundationUnlocked, state.qiRefiningUnlocked && state.mana >= nextFoundationCost);
    updateOneTimeUnlock("golden-core-stage", "unlock-golden-core", state.goldenCoreUnlocked, state.foundationUnlocked && state.mana >= nextGoldenCoreCost);
    updateOneTimeUnlock("circulation-stage", "unlock-circulation", state.circulationUnlocked, state.foundationUnlocked && state.mana >= CIRCULATION_COST);
    updateOneTimeUnlock("mana-liquefaction-ability", "unlock-mana-liquefaction", state.manaLiquefactionUnlocked, state.foundationUnlocked && state.mana >= MANA_LIQUEFACTION_COST);
    updateOneTimeUnlock("technique-ability", "unlock-technique", state.techniqueUnlocked, state.foundationUnlocked && state.mana >= TECHNIQUE_COST);
    updateOneTimeUnlock("mana-solidification-ability", "unlock-mana-solidification", state.manaSolidificationUnlocked, state.goldenCoreUnlocked && state.mana >= MANA_SOLIDIFICATION_COST);
    updateOneTimeUnlock("minor-technique-ability", "unlock-minor-technique", state.minorTechniqueUnlocked, state.goldenCoreUnlocked && state.mana >= MINOR_TECHNIQUE_COST);
    updateOneTimeUnlock("magic-treasure-ability", "unlock-magic-treasure", state.magicTreasureUnlocked, state.goldenCoreUnlocked && state.mana >= MAGIC_TREASURE_COST);
    updateOneTimeUnlock("material-control-ability", "unlock-material-control", state.materialControlUnlocked, state.advancedRealmLevel >= 1 && state.mana >= MATERIAL_CONTROL_COST);
    updateOneTimeUnlock("flying-escape-ability", "unlock-flying-escape", state.flyingEscapeUnlocked, state.advancedRealmLevel >= 1 && state.mana >= FLYING_ESCAPE_COST);
    updateOneTimeUnlock("divine-sense-ability", "unlock-divine-sense", state.divineSenseUnlocked, state.advancedRealmLevel >= 1 && state.mana >= DIVINE_SENSE_COST);
    updateOneTimeUnlock("great-cultivator-ability", "unlock-great-cultivator", state.greatCultivatorUnlocked, state.advancedRealmLevel >= 1 && state.mana >= GREAT_CULTIVATOR_COST);
    sortCostGroups();
    renderAchievements();
  }

  function bindHoldButton(id, action) {
    const button = byId(id);
    let delayTimer;
    let repeatTimer;
    let suppressNextClick = false;

    const stopRepeat = () => {
      window.clearTimeout(delayTimer);
      window.clearInterval(repeatTimer);
    };

    button.addEventListener("pointerdown", (event) => {
      if (button.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
      suppressNextClick = true;
      action();
      delayTimer = window.setTimeout(() => {
        if (button.disabled) return;
        repeatTimer = window.setInterval(() => {
          if (button.disabled) {
            stopRepeat();
            return;
          }
          action();
        }, 110);
      }, 420);
    });
    button.addEventListener("pointerup", stopRepeat);
    button.addEventListener("pointercancel", () => {
      stopRepeat();
      suppressNextClick = false;
    });
    button.addEventListener("pointerleave", () => {
      stopRepeat();
      suppressNextClick = false;
    });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      if (suppressNextClick) {
        event.preventDefault();
        suppressNextClick = false;
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
  bindHoldButton("buy-breathing-method", buyBreathingMethod);
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
  bindHoldButton("buy-carbon-limit", buyCarbonLimit);
  bindHoldButton("buy-killing-intent", buyKillingIntent);
  bindHoldButton("buy-rock-strike", buyRockStrike);
  bindHoldButton("buy-high-speed-metabolism", buyHighSpeedMetabolism);
  bindHoldButton("buy-endurance-enhancement", buyEnduranceEnhancement);
  bindHoldButton("buy-bullet-time", buyBulletTime);
  bindHoldButton("buy-dynamic-focus", buyDynamicFocus);
  bindHoldButton("buy-super-perception", buySuperPerception);
  bindHoldButton("buy-invulnerable", buyInvulnerable);
  bindHoldButton("buy-regeneration", buyRegeneration);
  bindHoldButton("buy-superpower", buySuperpower);
  bindHoldButton("buy-super-speed-thinking", buySuperSpeedThinking);
  bindHoldButton("buy-mountain-collapse", buyMountainCollapse);
  byId("toggle-ghost-back").addEventListener("click", toggleGhostBack);
  bindHoldButton("unlock-qi-refining", unlockQiRefining);
  bindHoldButton("breathing-button", breathe);
  bindHoldButton("exploration-button", explore);
  bindHoldButton("unlock-immortal-life", unlockImmortalLife);
  bindHoldButton("buy-qi-spell", buyQiSpell);
  bindHoldButton("unlock-foundation", unlockFoundation);
  bindHoldButton("unlock-golden-core", unlockGoldenCore);
  ADVANCED_REALMS.forEach((realm, index) => {
    bindHoldButton(`unlock-${realm.slug}`, () => unlockAdvancedRealm(index));
  });
  bindHoldButton("unlock-circulation", unlockCirculation);
  bindHoldButton("unlock-mana-liquefaction", unlockManaLiquefaction);
  bindHoldButton("unlock-technique", unlockTechnique);
  bindHoldButton("buy-foundation-spell", buyFoundationSpell);
  bindHoldButton("buy-longevity", buyLongevity);
  bindHoldButton("buy-golden-core-longevity", buyGoldenCoreLongevity);
  bindHoldButton("unlock-mana-solidification", unlockManaSolidification);
  bindHoldButton("unlock-minor-technique", unlockMinorTechnique);
  bindHoldButton("unlock-magic-treasure", unlockMagicTreasure);
  bindHoldButton("unlock-material-control", unlockMaterialControl);
  bindHoldButton("unlock-flying-escape", unlockFlyingEscape);
  bindHoldButton("buy-longevity-800", buyLongevity800);
  bindHoldButton("unlock-divine-sense", unlockDivineSense);
  bindHoldButton("unlock-great-cultivator", unlockGreatCultivator);
  byId("scatter-rebuild").addEventListener("click", scatterAndRebuild);
  byId("reincarnate").addEventListener("click", reincarnate);
  byId("exploration-count").addEventListener("change", (event) => {
    state.explorationCount = Math.max(1, Math.min(10000, Math.floor(Number(event.target.value) || 1)));
    saveState();
    render();
  });
  byId("toggle-innate-deficiency").addEventListener("click", () => {
    if (state.activeChallenge === "innateDeficiency") exitChallenge();
    else startChallenge("innateDeficiency");
  });
  byId("toggle-powerless").addEventListener("click", () => {
    if (state.activeChallenge === "powerless") exitChallenge();
    else startChallenge("powerless");
  });
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


  const initialAchievementStates = achievementStates();
  const initialOfflineReport = simulateOfflineProgress((Date.now() - state.lastUpdateAt) / 1000);
  lastTickAt = Date.now();

  window.setInterval(() => {
    const now = Date.now();
    const elapsedSeconds = Math.max(0, now - lastTickAt) / 1000;
    lastTickAt = now;
    const previousAchievements = achievementStates();
    advanceGame(elapsedSeconds);
    notifyNewAchievements(previousAchievements);
    render();
  }, 100);
  window.setInterval(saveState, 5000);

  ensureAchievementCards();
  ensureAdvancedRealmAbilityGroups();
  applyTheme();
  switchPage(activePage);
  render();
  saveState();
  notifyNewAchievements(initialAchievementStates);
  if (initialOfflineReport) showNotice(initialOfflineReport, 6000);
})();
