(function defineResetProfiles(WIS) {
  "use strict";

  const profiles = new Map();
  const clone = (value) => {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
    return value;
  };
  const getPath = (root, path) => path.split(".").reduce((value, key) => value?.[key], root);
  const setPath = (root, path, value) => {
    const keys = path.split(".");
    const finalKey = keys.pop();
    const parent = keys.reduce((target, key) => (target[key] ||= {}), root);
    parent[finalKey] = clone(value);
  };

  function register(id, profile) {
    if (!id || profiles.has(id)) throw new Error(`重置配置重复或无效：${id}`);
    profiles.set(id, Object.freeze({ id, base: "fresh", preserve: [], clear: [], preservePaths: [], clearPaths: [], ...profile }));
  }

  function describe(id) {
    return profiles.get(id) || null;
  }

  function apply(id, currentState, createFreshState, { context = {}, overrides = {} } = {}) {
    const profile = profiles.get(id);
    if (!profile) throw new Error(`未注册重置配置：${id}`);
    const currentDomain = WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(currentState));
    const freshDomain = WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(createFreshState()));
    const current = WIS.Core.State.toFlat(currentDomain);
    const fresh = WIS.Core.State.toFlat(freshDomain);
    const result = profile.base === "current" ? currentDomain : freshDomain;
    const preserve = typeof profile.preserve === "function" ? profile.preserve(current, context) : profile.preserve;
    preserve.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(current, key)) result[key] = clone(current[key]);
    });
    const clear = typeof profile.clear === "function" ? profile.clear(current, context) : profile.clear;
    clear.forEach((key) => { result[key] = clone(fresh[key]); });
    const preservePaths = typeof profile.preservePaths === "function" ? profile.preservePaths(currentDomain, context) : profile.preservePaths;
    preservePaths.forEach((path) => setPath(result, path, getPath(currentDomain, path)));
    const clearPaths = typeof profile.clearPaths === "function" ? profile.clearPaths(currentDomain, context) : profile.clearPaths;
    clearPaths.forEach((path) => setPath(result, path, getPath(freshDomain, path)));
    Object.entries(overrides).forEach(([key, value]) => {
      if (key.includes(".")) setPath(result, key, value);
      else result[key] = clone(value);
    });
    return WIS.Core.State.normalizeDomain(WIS.Core.State.toSerializable(result));
  }

  const metaAndStatistics = Object.freeze([
    "lifetimeHighestJ", "lifetimeHighestPower", "lifetimeHighestScaleIndex", "lifetimeTotalJ",
    "lifetimeTotalPower", "lifetimeHighestMana", "lifetimeTotalMana", "lifetimeHighestCultivationRealmLevel",
    "immortalSelectionCount", "totalElapsedSeconds", "unlockedAchievements", "symbolicPowerMilestones",
    "treasureImprints", "challengeCompletions", "hideUnlockedAchievements", "theme"
  ]);

  register("scatter", {
    base: "current",
    clear: (_state, { nextScatterLevel = 1 }) => [
      "joules", "power", "highestPower", "totalPower", "maxSinglePowerGain", "brickUnlocked", "wallUnlocked",
      "highestScaleIndex", "runningLevel", "rockLevel", "myStylePurchased", "intuitionPurchased",
      "sonicMovementPurchased", "carbonLimitPurchased", "killingIntentPurchased", "rockStrikePurchased",
      "highSpeedMetabolismPurchased", "enduranceEnhancementPurchased", "bulletTimePurchased",
      "dynamicFocusPurchased", "superPerceptionPurchased", "invulnerablePurchased", "regenerationPurchased",
      "superpowerPurchased", "superSpeedThinkingPurchased", "mountainCollapsePurchased", "mindDivisionLevel",
      "hyperRegenerationPurchased", "superpowerEvolutionPurchased", "earthSplitPurchased", "godspeedPurchased",
      "subtlePurchased", "mentalDomainPurchased", "skySplitPurchased", "biologicalQuantificationPurchased",
      "destroyCountryPurchased", "killingIntentSubstancePurchased", "energyCyclePurchased",
      "mountainShatterPurchased", "bioenergyPurchased", "ghostBackActive", "mana",
      "explorationProgress", "qiRefiningUnlocked", "foundationUnlocked", "goldenCoreUnlocked", "advancedRealmLevel",
      "minorTribulationExplorationLoad", "minorTribulationRecoveryRemaining", "minorTribulationTriggered",
      "minorTribulationInitialManaExponent", "minorTribulationLastLoadFactor",
      ...(nextScatterLevel < 2 ? ["transcendentPurchased", "focusPurchased", "breathingMethodPurchased", "extremeExercisePurchased"] : []),
      ...(nextScatterLevel < 3 ? ["waterPurchased", "ghostBrainPurchased", "naturalStrengthPurchased", "mentalPowerPurchased", "lifePowerPurchased"] : [])
    ]
  });
  register("reincarnation", {
    preserve: [...metaAndStatistics, "activeChallenge", "activeChallengeElapsedSeconds", "reincarnationManaJRewardLevel"],
    preservePaths: ["meta", "powerSystem.systems.scale.history", "cultivation.systems.immortal.history"]
  });
  register("challenge", {
    preserve: [...metaAndStatistics, "permanentRootLevel"],
    preservePaths: ["meta", "powerSystem.systems.scale.history", "cultivation.systems.immortal.history"]
  });
  register("infinity", {
    preserve: [...metaAndStatistics],
    preservePaths: ["meta"]
  });

  WIS.Core.Reset = Object.freeze({ register, describe, apply });
}(window.WIS));
