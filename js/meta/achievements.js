(function defineAchievementMeta(WIS) {
  "use strict";


  const runtime = WIS.Core.Runtime;
  const state = runtime.state;
  const SCALE_THRESHOLDS = WIS.Core.Config.scales;
  const { challengeCompletionCount, reachedPowerMilestone } = WIS.Power.ScaleLogic;
  const format = (...args) => runtime.call("format", ...args);
  const showAchievementNotice = (...args) => runtime.call("showAchievementNotice", ...args);
  const RAPID_TRAINING_CLICK_TARGET = 5;
  const RAPID_TRAINING_CLICK_WINDOW_MS = 2000;
  const rapidTrainingClickTimes = [];

  function threeDeficienciesCompleted() {
    return ["innateDeficiency", "powerless", "longevity"].every((key) => challengeCompletionCount(key) >= 1);
  }

  function allFortuneChallengesCompleted() {
    return ["innateDeficiency", "powerless", "longevity", "fiveMisfortunes"].every((key) => challengeCompletionCount(key) >= 3);
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
    return WIS.Meta.Achievements.has(state, key);
  }

  function completedAchievement(key, condition) {
    return hasAchievement(key) || condition;
  }

  function registerTrainingClick(now = Date.now()) {
    if (hasAchievement("lightningFiveWhip")) return false;
    const timestamp = Number(now);
    if (!Number.isFinite(timestamp)) return false;
    if (rapidTrainingClickTimes[rapidTrainingClickTimes.length - 1] > timestamp) {
      rapidTrainingClickTimes.length = 0;
    }
    const cutoff = timestamp - RAPID_TRAINING_CLICK_WINDOW_MS;
    while (rapidTrainingClickTimes[0] < cutoff) rapidTrainingClickTimes.shift();
    rapidTrainingClickTimes.push(timestamp);
    if (rapidTrainingClickTimes.length < RAPID_TRAINING_CLICK_TARGET) return false;
    WIS.Meta.Achievements.record(state, "lightningFiveWhip");
    rapidTrainingClickTimes.length = 0;
    return true;
  }

  function achievementDefinitions() {
    const definitions = [
      { key: "powerOne", name: "战力 1", description: "获得至少 1 战力。", reward: "解锁强化界面", completed: completedAchievement("powerOne", state.totalPower >= 1) },
      { key: "five", name: "战五渣", description: "累计获得 5 战力。", reward: "战力获取倍率 ×1.05", completed: completedAchievement("five", state.totalPower >= 5) },
      { key: "brick", name: "爆砖", description: "拥有 200 战力。", reward: "每个已达成成就提供 +0.1 J/秒", completed: completedAchievement("brick", state.brickUnlocked) },
      { key: "trueBrick", name: "真爆砖", description: "一次锻炼获得 200 战力。", reward: "健身等级上限 +20", completed: completedAchievement("trueBrick", state.maxSinglePowerGain >= 200) },
      { key: "lightningFiveWhip", name: "闪电五连鞭", description: "2 秒内连续点击 5 次锻炼。", reward: "可以通过长按代替点击", completed: completedAchievement("lightningFiveWhip", false) },
      { key: "trainingUp", name: "练起来", description: "游戏时间达到10 分钟。", reward: "解锁统计界面", completed: completedAchievement("trainingUp", state.totalElapsedSeconds >= 600) },
      { key: "aspireImmortality", name: "我欲成仙", description: "解锁炼气。", reward: "每个已解锁仙道境界使法力获取倍率 ×1.2", completed: completedAchievement("aspireImmortality", state.qiRefiningUnlocked) },
      { key: "daoFoundation", system: "仙道", name: "道基", description: "解锁筑基。", reward: "解锁宝物烙印·仙道·天逆珠", completed: completedAchievement("daoFoundation", state.foundationUnlocked) },
      { key: "goldenCore", system: "仙道", name: "一颗金丹吞入腹", description: "解锁结丹。", reward: "解锁宝物烙印·仙道·神秘绿瓶", completed: completedAchievement("goldenCore", state.goldenCoreUnlocked) },
      { key: "infantSpirit", system: "仙道", name: "婴灵", description: "突破元婴。", reward: "自动升级曾手动升级过的仙道能力（默认开启，可关闭）", completed: completedAchievement("infantSpirit", state.advancedRealmLevel >= 1) },
      { key: "humanRealmDominance", system: "仙道", name: "人界纵横", description: "达到仙道·化神。", reward: "仙道宝物获取概率 ×2", completed: completedAchievement("humanRealmDominance", state.advancedRealmLevel >= 2) },
      { key: "refineTheVoid", system: "仙道", name: "炼化虚空", description: "达到仙道·炼虚。", reward: "选择仙道并解锁法力后，获得 +1 法力/秒的独立基础来源", completed: completedAchievement("refineTheVoid", state.advancedRealmLevel >= 3) },
      { key: "bodyIntegration", system: "仙道", name: "合体", description: "达到仙道·合体。", reward: "自动突破曾手动突破过的仙道境界（默认开启，可关闭）", completed: completedAchievement("bodyIntegration", state.advancedRealmLevel >= 4 || state.lifetimeHighestCultivationRealmLevel >= 7) },
      { key: "mahayana", system: "仙道", name: "大乘", description: "达到仙道·大乘。", reward: "选择仙道后自动获得3次转世重修效果", completed: completedAchievement("mahayana", state.advancedRealmLevel >= 5 || state.lifetimeHighestCultivationRealmLevel >= 8) },
      { key: "threeDeficiencies", name: "三缺", description: "福、禄、寿三种挑战各完成1次。", reward: "非挑战转生类重置后获得1000 战力", completed: completedAchievement("threeDeficiencies", threeDeficienciesCompleted()) },
      { key: "fiveMisfortunesThreeDeficiencies", name: "五弊三缺", description: "福、禄、寿、五弊挑战全部完成3次。", reward: "纪念性成就", completed: completedAchievement("fiveMisfortunesThreeDeficiencies", allFortuneChallengesCompleted()) },
      { key: "googol", name: "古戈尔", description: "战力达到 1e100。", reward: "纪念性成就", completed: completedAchievement("googol", reachedPowerMilestone("googol")) },
      { key: "graham64", name: "葛立恒", description: "战力达到 G64。", reward: "纪念性成就", completed: completedAchievement("graham64", reachedPowerMilestone("graham64")) },
      { key: "tree3", name: "树", description: "战力达到 TREE(3)。", reward: "纪念性成就", completed: completedAchievement("tree3", reachedPowerMilestone("tree3")) },
      { key: "seizeFoundation", name: "夺基", description: "每累计 1 有效探寻量进行一次1% 判定。", reward: "下品灵根失效，获得中品灵根", completed: completedAchievement("seizeFoundation", false) }
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
              ? "自动升级曾手动升级过的强化（默认开启，可关闭）"
            : scaleIndex === 7
              ? "打岩生效等级变为实际等级 ×1.2（向下取整）"
            : scaleIndex === 8
              ? "解锁永久宝物·超级棒棒糖"
            : scaleIndex === 9
              ? "解锁永久宝物·天晶"
            : scaleIndex === 10
              ? "J、战力量级软上限损失 ×0.95"
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
              ? "解锁宝物烙印·仙道·符宝"
            : scaleIndex === 4
              ? "解锁挑战·寿"
            : scaleIndex === 5
              ? "解锁挑战·五弊"
            : scaleIndex === 6
              ? "打岩来源 ^1.06"
            : scaleIndex === 7
              ? "自动升级行动（默认开启，可关闭；同消耗强化优先）"
            : scaleIndex === 8
              ? "解锁挑战·完全境界"
            : scaleIndex === 9
              ? "解锁挑战·无月"
            : scaleIndex === 10
              ? "永久解锁挑战·星球压制"
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
    let changed = false;
    achievementDefinitions().forEach((achievement) => {
      if (!achievement.completed || hasAchievement(achievement.key)) return;
      WIS.Meta.Achievements.record(state, achievement.key);
      changed = true;
    });
    return changed;
  }

  function notifyNewAchievements(previousAchievements) {
    const definitions = achievementDefinitions();
    definitions.forEach((achievement) => {
      if (achievement.completed && !hasAchievement(achievement.key)) {
        WIS.Meta.Achievements.record(state, achievement.key);
      }
    });
    const unlocked = definitions
      .filter((achievement) => !previousAchievements[achievement.key] && achievement.completed)
      .map((achievement) => achievement.name);
    if (unlocked.length > 0) showAchievementNotice(unlocked);
    return unlocked;
  }

  WIS.Meta.Achievements = Object.freeze({
    has(state, key) {
      return state.meta.achievements?.[key] === true;
    },
    record(state, key) {
      state.meta.achievements[key] = true;
    },
    unlockedKeys(state) {
      return Object.keys(state.meta.achievements || {}).filter((key) => state.meta.achievements[key]);
    },
    hasCurrent: hasAchievement, definitions: achievementDefinitions, states: achievementStates,
    recordCurrent: recordCurrentAchievements, notifyNew: notifyNewAchievements,
    registerTrainingClick,
    achievementsUnlocked, upgradesUnlocked, cultivationUnlocked, treasuresUnlocked,
    challengesUnlocked, statisticsUnlocked
  });
}(window.WIS));
