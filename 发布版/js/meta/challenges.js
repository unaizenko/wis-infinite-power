(function defineChallengeMeta(WIS) {
  "use strict";

  const definitions = WIS.Core.Config.challenges;
  const immortalPowerRealmCosts = WIS.Core.Config.immortalPower.realmCosts;
  function completionCount(state, key) { return Math.max(0, Number(state.meta.challenges.challengeCompletions?.[key]) || 0); }
  function totalCompletionCount(state) {
    return Object.keys(definitions).reduce((total, key) => total + completionCount(state, key), 0);
  }
  function systemRequirementSatisfied(state, challenge) {
    const requiredSystem = challenge?.system;
    return !requiredSystem || state.cultivation.active === requiredSystem;
  }
  function systemActive(state, key) {
    return systemRequirementSatisfied(state, definitions[key]);
  }
  function reward(state, key, property) {
    if (!systemActive(state, key)) return 1;
    const values = definitions[key]?.[property];
    const count = completionCount(state, key);
    return count > 0 && values ? values[count - 1] : 1;
  }
  function activeLimit(state, key) {
    if (state.meta.challenges.activeChallenge !== key) return 1;
    const challenge = definitions[key];
    const limit = challenge.limitExponents?.[completionCount(state, key)] ?? 1;
    if (!challenge.timeToLimitSeconds) return limit;
    const progress = Math.max(0, Math.min(1, state.meta.challenges.activeChallengeElapsedSeconds / challenge.timeToLimitSeconds));
    return 1 - (1 - limit) * progress;
  }
  function evilCorpseRewardMultiplier(state) {
    if (!systemActive(state, "severEvilCorpse") || completionCount(state, "severEvilCorpse") < 1) return 1;
    const terms = [
      [state.joules, 1e29],
      [state.power, 2.24e31],
      [state.mana, 1e29],
      [state.immortalPower, immortalPowerRealmCosts.daluo]
    ];
    return 1 + 0.25 * terms.reduce((sum, [value, scale]) =>
      sum + Math.sqrt(Math.log10(1 + Math.max(0, Number(value) || 0) / scale)), 0
    );
  }
  function planetSuppressionRewardExponent(state, resource) {
    if (completionCount(state, "planetSuppression") < 1) return 1;
    const amount = resource === "joules" ? state.joules : state.power;
    return WIS.Power.ScaleLogic.planetSuppressionRewardExponent(amount);
  }
  function effects(state) {
    const longevityReward = reward(state, "longevity", "rewardMultipliers");
    const fiveReward = state.cultivation.active ? 1 : reward(state, "fiveMisfortunes", "rewardExponents");
    return [
      { id: "longevityJReward", name: "寿奖励", group: "挑战", target: "joules", layer: "regionMultiplier", celestialFiveDecline: true, value: longevityReward },
      { id: "longevityPowerReward", name: "寿奖励", group: "量级论", target: "power", layer: "regionMultiplier", celestialFiveDecline: true, value: longevityReward },
      { id: "fortuneJLimit", name: "福", group: "挑战", target: "joules", layer: "regionExponent", value: activeLimit(state, "innateDeficiency") },
      { id: "longevityJLimit", name: "寿", group: "挑战", target: "joules", layer: "regionExponent", value: activeLimit(state, "longevity") },
      { id: "fiveJReward", name: "五弊奖励", group: "挑战", target: "joules", layer: "regionExponent", celestialFiveDecline: true, value: fiveReward },
      { id: "powerlessLimit", name: "禄", group: "挑战", target: "power", layer: "regionExponent", value: activeLimit(state, "powerless") },
      { id: "longevityPowerLimit", name: "寿", group: "挑战", target: "power", layer: "regionExponent", value: activeLimit(state, "longevity") },
      { id: "fivePowerReward", name: "五弊奖励", group: "挑战", target: "power", layer: "regionExponent", celestialFiveDecline: true, value: fiveReward },
      { id: "severEvilJLimit", name: "斩恶尸", group: "斩三尸", target: "joules", layer: "regionExponent", value: activeLimit(state, "severEvilCorpse") },
      { id: "severEvilPowerLimit", name: "斩恶尸", group: "斩三尸", target: "power", layer: "regionExponent", value: activeLimit(state, "severEvilCorpse") },
      { id: "severEvilManaLimit", name: "斩恶尸", group: "斩三尸", target: "mana", layer: "regionExponent", value: activeLimit(state, "severEvilCorpse") },
      { id: "severEvilImmortalPowerLimit", name: "斩恶尸", group: "斩三尸", target: "immortalPower", layer: "regionExponent", value: activeLimit(state, "severEvilCorpse") },
      { id: "severGoodJLimit", name: "斩善尸", group: "斩三尸", target: "joules", layer: "regionExponent", value: activeLimit(state, "severGoodCorpse") },
      { id: "severGoodPowerLimit", name: "斩善尸", group: "斩三尸", target: "power", layer: "regionExponent", value: activeLimit(state, "severGoodCorpse") },
      { id: "severGoodManaLimit", name: "斩善尸", group: "斩三尸", target: "mana", layer: "regionExponent", value: activeLimit(state, "severGoodCorpse") },
      { id: "severGoodImmortalPowerLimit", name: "斩善尸", group: "斩三尸", target: "immortalPower", layer: "regionExponent", value: activeLimit(state, "severGoodCorpse") },
      { id: "severEvilReward", name: "斩恶尸奖励", group: "斩三尸", target: "immortalPower", layer: "regionMultiplier", celestialFiveDecline: true, value: evilCorpseRewardMultiplier(state) },
      { id: "severGoodReward", name: "斩善尸奖励", group: "斩三尸", target: "immortalPower", layer: "regionExponent", celestialFiveDecline: true, value: reward(state, "severGoodCorpse", "rewardExponents") },
      { id: "fortuneFitnessReward", name: "福奖励", group: "挑战", target: "fitness", layer: "sourceExponent", celestialFiveDecline: true, value: reward(state, "innateDeficiency", "rewardExponents") },
      { id: "powerlessTrainingReward", name: "禄奖励", group: "挑战", target: "training", layer: "sourceExponent", celestialFiveDecline: true, value: reward(state, "powerless", "rewardExponents") },
      { id: "completeRealmUltimateReward", name: "完全境界奖励", group: "挑战", target: "ultimateIntent", layer: "sourceExponent", celestialFiveDecline: true, value: reward(state, "completeRealm", "rewardExponents") },
      { id: "moonlessRockReward", name: "无月奖励", group: "挑战", target: "rock", layer: "sourceExponent", celestialFiveDecline: true, value: reward(state, "moonless", "rewardExponents") }
      ,{ id: "planetSuppressionJReward", name: "星球压制奖励", group: "挑战", target: "joules", layer: "regionExponent", celestialFiveDecline: true, value: planetSuppressionRewardExponent(state, "joules") }
      ,{ id: "planetSuppressionPowerReward", name: "星球压制奖励", group: "挑战", target: "power", layer: "regionExponent", celestialFiveDecline: true, value: planetSuppressionRewardExponent(state, "power") }
    ];
  }
  WIS.Core.Effects.register("challenges", effects);

  const runtime = WIS.Core.Runtime;
  const state = runtime.state;
  const CHALLENGE_DEFINITIONS = definitions;
  const freshDefaultState = () => runtime.call("freshState");
  const updateLifetimeStatistics = (...args) => runtime.call("updateLifetimeStatistics", ...args);
  const saveState = (...args) => runtime.call("save", ...args);
  const render = (...args) => runtime.call("render", ...args);
  const showNotice = (...args) => runtime.call("showNotice", ...args);
  const switchPage = (...args) => runtime.call("switchPage", ...args);
  const challengeCompletionCount = (key) => completionCount(state, key);
  function threeCorpsePrerequisiteSatisfied(challengeKey) {
    const order = definitions[challengeKey]?.threeCorpseOrder;
    if (!order) return true;
    if (!state.threeCorpseChallengesUnlocked) return false;
    if (order >= 2 && challengeCompletionCount("severEvilCorpse") < 1) return false;
    if (order >= 3 && challengeCompletionCount("severGoodCorpse") < 1) return false;
    return true;
  }
  function challengeUnlocked(challengeKey) {
    const challenge = definitions[challengeKey];
    const challengesAvailable = WIS.Meta.Achievements.has(state, "scale4");
    return Boolean(challenge && challengesAvailable && (
      !challenge.unlockAchievementKey || WIS.Meta.Achievements.has(state, challenge.unlockAchievementKey)
    ) && threeCorpsePrerequisiteSatisfied(challengeKey) &&
      (systemActive(state, challengeKey) || state.activeChallenge === challengeKey));
  }
  function challengeRequiredScaleIndex(challengeKey) {
    const challenge = definitions[challengeKey];
    if (!challenge) return Infinity;
    if (challenge.requiredScaleIndices) {
      return challenge.requiredScaleIndices[Math.min(
        challengeCompletionCount(challengeKey),
        challenge.requiredScaleIndices.length - 1
      )];
    }
    return challenge.requiredScaleIndex ?? Infinity;
  }

  function resetForChallenge(challengeKey) {
    updateLifetimeStatistics();
    runtime.setState(WIS.Core.Reset.apply("challenge", state, freshDefaultState, { overrides: {
      activeChallenge: challengeKey,
      activeChallengeElapsedSeconds: 0,
      lastUpdateAt: Date.now()
    } }));
    runtime.call("resetTransientAccumulators");
    runtime.call("resetCultivationPage");
  }

  function startChallenge(challengeKey) {
    const challenge = CHALLENGE_DEFINITIONS[challengeKey];
    if (!challenge || !challengeUnlocked(challengeKey) || !systemActive(state, challengeKey) || state.activeChallenge || challengeCompletionCount(challengeKey) >= challenge.maxCompletions) return;
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
    state.activeChallengeElapsedSeconds = 0;
    saveState();
    render();
    showNotice(`已退出挑战：${challengeName}`);
  }

  function checkActiveChallengeCompletion() {
    if (!state.activeChallenge) return false;
    const challengeKey = state.activeChallenge;
    const challenge = CHALLENGE_DEFINITIONS[challengeKey];
    if (!challenge || !systemActive(state, challengeKey)) return false;
    const targetReached = Number.isFinite(challenge.targetAdvancedRealmLevel)
      ? state.advancedRealmLevel >= challenge.targetAdvancedRealmLevel
      : state.highestScaleIndex >= challengeRequiredScaleIndex(challengeKey);
    if (!targetReached) return false;
    state.challengeCompletions[challengeKey] = Math.min(challenge.maxCompletions, challengeCompletionCount(challengeKey) + 1);
    state.activeChallenge = null;
    state.activeChallengeElapsedSeconds = 0;
    saveState();
    showNotice(`挑战成功：${challenge.name} ${state.challengeCompletions[challengeKey]} / ${challenge.maxCompletions}`);
    return true;
  }

  WIS.Meta.Challenges = Object.freeze({
    definitions,
    get(key) { return definitions[key] || null; },
    completionCount, totalCompletionCount, systemRequirementSatisfied, systemActive,
    isActive(state, key) { return state.meta.challenges.activeChallenge === key; },
    getEffects: effects,
    evilCorpseRewardMultiplier, planetSuppressionRewardExponent,
    challengeUnlocked, challengeRequiredScaleIndex,
    resetForChallenge, startChallenge, exitChallenge, checkActiveChallengeCompletion
  });
}(window.WIS));
