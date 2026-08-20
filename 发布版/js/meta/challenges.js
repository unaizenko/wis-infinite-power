(function defineChallengeMeta(WIS) {
  "use strict";

  const definitions = WIS.Core.Config.challenges;
  function completionCount(state, key) { return Math.max(0, Number(state.meta.challenges.challengeCompletions?.[key]) || 0); }
  function reward(state, key, property) {
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
  function effects(state) {
    const longevityReward = reward(state, "longevity", "rewardMultipliers");
    const fiveReward = state.cultivation.active ? 1 : reward(state, "fiveMisfortunes", "rewardExponents");
    return [
      { id: "longevityJReward", name: "寿奖励", group: "挑战", target: "joules", layer: "regionMultiplier", value: longevityReward },
      { id: "longevityPowerReward", name: "寿奖励", group: "量级论", target: "power", layer: "regionMultiplier", value: longevityReward },
      { id: "fortuneJLimit", name: "福", group: "挑战", target: "joules", layer: "regionExponent", value: activeLimit(state, "innateDeficiency") },
      { id: "longevityJLimit", name: "寿", group: "挑战", target: "joules", layer: "regionExponent", value: activeLimit(state, "longevity") },
      { id: "fiveJReward", name: "五弊奖励", group: "挑战", target: "joules", layer: "regionExponent", value: fiveReward },
      { id: "powerlessLimit", name: "禄", group: "挑战", target: "power", layer: "regionExponent", value: activeLimit(state, "powerless") },
      { id: "longevityPowerLimit", name: "寿", group: "挑战", target: "power", layer: "regionExponent", value: activeLimit(state, "longevity") },
      { id: "fivePowerReward", name: "五弊奖励", group: "挑战", target: "power", layer: "regionExponent", value: fiveReward },
      { id: "fortuneFitnessReward", name: "福奖励", group: "挑战", target: "fitness", layer: "sourceExponent", value: reward(state, "innateDeficiency", "rewardExponents") },
      { id: "powerlessTrainingReward", name: "禄奖励", group: "挑战", target: "training", layer: "sourceExponent", value: reward(state, "powerless", "rewardExponents") },
      { id: "completeRealmUltimateReward", name: "完全境界奖励", group: "挑战", target: "ultimateIntent", layer: "sourceExponent", value: reward(state, "completeRealm", "rewardExponents") },
      { id: "moonlessRockReward", name: "无月奖励", group: "挑战", target: "rock", layer: "sourceExponent", value: reward(state, "moonless", "rewardExponents") }
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
  function challengeUnlocked(challengeKey) {
    const challenge = definitions[challengeKey];
    const challengesAvailable = WIS.Meta.Achievements.has(state, "scale4");
    return Boolean(challenge && challengesAvailable && (
      !challenge.unlockAchievementKey || WIS.Meta.Achievements.has(state, challenge.unlockAchievementKey)
    ));
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
    if (!challenge || !challengeUnlocked(challengeKey) || state.activeChallenge || challengeCompletionCount(challengeKey) >= challenge.maxCompletions) return;
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
    if (!challenge || state.highestScaleIndex < challengeRequiredScaleIndex(challengeKey)) return false;
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
    completionCount,
    isActive(state, key) { return state.meta.challenges.activeChallenge === key; },
    getEffects: effects,
    challengeUnlocked, challengeRequiredScaleIndex,
    resetForChallenge, startChallenge, exitChallenge, checkActiveChallengeCompletion
  });
}(window.WIS));
