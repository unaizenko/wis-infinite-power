(function defineAchievementMeta(WIS) {
  "use strict";


  const runtime = WIS.Core.Runtime;
  const state = runtime.state;
  const SCALE_THRESHOLDS = WIS.Core.Config.scales;
  const { gte } = WIS.Core.BigNum;
  const { challengeCompletionCount, reachedPowerMilestone } = WIS.Power.ScaleLogic;
  const format = (...args) => runtime.call("format", ...args);
  const showAchievementNotice = (...args) => runtime.call("showAchievementNotice", ...args);
  const RAPID_TRAINING_CLICK_TARGET = 5;
  const RAPID_TRAINING_CLICK_WINDOW_MS = 2000;
  const rapidTrainingClickTimes = [];

  function beyondFractalReward() {
    return `当前超分形速度倍率：×${format(WIS.Meta.BigNumbers.fractalMultiplier(WIS.Meta.BigNumbers.amount(state, 4), state.meta.bigNumbers?.beyondFractal === true), 4)}`;
  }

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
    return hasAchievement("powerOne") || state.meta.infinity.upgradesUnlocked;
  }

  function cultivationUnlocked() {
    return hasAchievement("scale2");
  }

  function treasuresUnlocked() {
    return hasAchievement("scale3");
  }

  function challengesUnlocked() {
    return hasAchievement("scale4") || state.cultivation.active === "martial" &&
      ["stealHeaven", "innerHarmony", "innate"].some(key=>state.meta.martialQualifications?.[key] === true ||
        (WIS.Cultivation.Martial.get(state).abilities[key] || 0)>0);
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

  function greatHeavenlyVenerableMultiplier(current) {
    return WIS.Meta.Achievements.has(current, "greatHeavenlyVenerable")
      ? WIS.Core.BigNum.pow(WIS.Core.BigNum.add(1, WIS.Meta.Treasures.count(current,"originImprint")), .5)
      : WIS.Core.BigNum.ONE;
  }
  function ordinaryTreasureRequirementDivisor(current) {
    const B=WIS.Core.BigNum;
    return WIS.Meta.Achievements.has(current,"universe")
      ? B.pow(B.add(1,B.log10(B.add(1,WIS.Meta.Treasures.count(current,"cosmicWill")))),.5) : B.ONE;
  }
  function achievementDefinitions() {
    const definitions = [
      { key:"martialHarmony", system:"武道", name:"内三合", description:"完成意与气合、心与意合、气与力合三项武道挑战。", reward:"炼心保留相当于炼心前当前心的气、体，不足时按现有数量保留；解锁自动神魂", completed:completedAchievement("martialHarmony",["martialIntentQi","martialHeartIntent","martialQiPower"].every(key=>challengeCompletionCount(key)>0)) },
      { key:"martialInnate", system:"武道", name:"先天", description:"完成任督二脉挑战。", reward:"气获取×2", completed:completedAchievement("martialInnate",challengeCompletionCount("martialMeridians")>0) },
      { key:"yuan", system:"仙道", name:"元", description:"突破仙道境界·第二步·碎涅。", reward:"解锁仙道宝物烙印·元晶", completed:completedAchievement("yuan",(WIS.Cultivation.Xiuzhen.get(state).highestRealm || 0)>=6) },
      { key:"greatHeavenlyVenerable", system:"仙道", name:"大天尊", description:"突破第三步·空劫。", reward:`根据本源数量提升法力、仙灵力、仙力、元力、涅力获取；当前 ×${format(greatHeavenlyVenerableMultiplier(state),4)}`, completed:completedAchievement("greatHeavenlyVenerable",(WIS.Cultivation.Xiuzhen.get(state).highestRealm || 0)>=10) },
      { key:"universe", name:"宇宙", description:"抵达单体宇宙量级。", reward:`根据宇宙意志数量降低普通宝物进度需求；当前 ÷${format(ordinaryTreasureRequirementDivisor(state),4)}`, completed:completedAchievement("universe",(WIS.Cultivation.Xiuzhen.get(state).highestRealm || 0)>=7) },
      // Reserved tier: existing TREE/G progress never stands in for infiniteBox.
      { key:"eternalWitness", name:"一证永证", description:"抵达无限盒子量级（后续开放）。", reward:"无限转生及以下不再重置任何内容；挑战仍重置，强化重选仍清空强化并退款", completed:completedAchievement("eternalWitness",state.meta.milestones.infiniteBox===true) },
      { key: "infantTransformationImmortal", system: "仙道", name: "婴变为仙", description: "解锁仙道·修真道·婴变。", reward: "解锁仙道挑战·阴虚阳实", completed: completedAchievement("infantTransformationImmortal", (WIS.Cultivation.Xiuzhen?.get(state).highestRealm || 0) >= 2) },
      { key: "powerOne", name: "战力 1", description: "获得至少 1 战力。", reward: "解锁强化界面", completed: completedAchievement("powerOne", gte(state.totalPower, 1)) },
      { key: "five", name: "战五渣", description: "累计获得 5 战力。", reward: "战力获取 ×1.05", completed: completedAchievement("five", gte(state.totalPower, 5)) },
      { key: "brick", name: "爆砖", description: "拥有 200 战力。", reward: "每个已达成成就提供 +0.1 J/秒", completed: completedAchievement("brick", state.brickUnlocked) },
      { key: "trueBrick", name: "真爆砖", description: "一次锻炼获得 200 战力。", reward: "健身等级上限 +20", completed: completedAchievement("trueBrick", gte(state.maxSinglePowerGain, 200)) },
      { key: "lightningFiveWhip", name: "闪电五连鞭", description: "2 秒内连续点击 5 次锻炼。", reward: "可以通过长按代替点击", completed: completedAchievement("lightningFiveWhip", false) },
      { key: "trainingUp", name: "练起来", description: "游戏时间达到10 分钟。", reward: "解锁统计界面", completed: completedAchievement("trainingUp", state.totalElapsedSeconds >= 600) },
      { key: "aspireImmortality", system: "仙道", name: "我欲成仙", description: "解锁炼气。", reward: "每个已解锁仙道境界使法力获取 ×1.2", completed: completedAchievement("aspireImmortality", state.qiRefiningUnlocked) },
      { key: "daoFoundation", system: "仙道", name: "道基", description: "解锁筑基。", reward: "解锁宝物烙印·仙道·天逆珠", completed: completedAchievement("daoFoundation", state.foundationUnlocked) },
      { key: "goldenCore", system: "仙道", name: "一颗金丹吞入腹", description: "解锁结丹。", reward: "解锁宝物烙印·仙道·神秘绿瓶", completed: completedAchievement("goldenCore", state.goldenCoreUnlocked) },
      { key: "infantSpirit", system: "仙道", name: "婴灵", description: "突破元婴。", reward: "自动升级曾手动升级过的仙道能力（默认开启，可关闭）", completed: completedAchievement("infantSpirit", state.advancedRealmLevel >= 1) },
      { key: "humanRealmDominance", system: "仙道", name: "人界纵横", description: "达到仙道·化神。", reward: "仙道宝物进度获取 ×2", completed: completedAchievement("humanRealmDominance", state.advancedRealmLevel >= 2) },
      { key: "refineTheVoid", system: "仙道", name: "炼化虚空", description: "达到仙道·炼虚。", reward: "选择仙道并解锁法力后，获得 +1 法力/秒的独立基础来源", completed: completedAchievement("refineTheVoid", state.advancedRealmLevel >= 3) },
      { key: "bodyIntegration", system: "仙道", name: "合体", description: "达到仙道·合体。", reward: "自动突破曾手动突破过的仙道境界（默认开启，可关闭）", completed: completedAchievement("bodyIntegration", state.advancedRealmLevel >= 4 || state.lifetimeHighestCultivationRealmLevel >= 7) },
      { key: "mahayana", system: "仙道", name: "大乘", description: "达到仙道·大乘。", reward: "达到大乘时自动补齐3次转世重修效果；再次选择仙道时恢复该效果", completed: completedAchievement("mahayana", state.advancedRealmLevel >= 5 || state.lifetimeHighestCultivationRealmLevel >= 8) },
      { key: "ascendImmortal", system: "仙道", name: "登仙", description: "抵达仙道·真仙。", reward: "解锁永久宝物烙印·仙晶", completed: completedAchievement("ascendImmortal", state.advancedRealmLevel >= 6 || state.lifetimeHighestCultivationRealmLevel >= 9) },
      { key: "goldenNature", system: "仙道", name: "金性", description: "抵达仙道·金仙。", reward: "本次转生中，随时间提升仙灵力指数", completed: completedAchievement("goldenNature", state.advancedRealmLevel >= 7 || state.lifetimeHighestCultivationRealmLevel >= 10) },
      { key: "utmostPurity", system: "仙道", name: "至净", description: "抵达仙道·太乙。", reward: "按当前量级停留时间渐近弱化下一量级的J、战力软上限，跨量级后重新计时", completed: completedAchievement("utmostPurity", state.advancedRealmLevel >= 8 || state.lifetimeHighestCultivationRealmLevel >= 11) },
      { key: "greatLuo", system: "仙道", name: "大罗", description: "抵达仙道·大罗。", reward: "斩三尸挑战中（斩恶尸、斩善尸、斩自我尸），随时间提升法力、仙灵力指数", completed: completedAchievement("greatLuo", state.advancedRealmLevel >= 9 || state.lifetimeHighestCultivationRealmLevel >= 12) },
      { key: "selfSeveringSlash", system: "仙道", name: "自斩一刀", description: "首次抵达仙道·道祖。", reward: "解锁仙道挑战·炼气十万年", completed: completedAchievement("selfSeveringSlash", state.advancedRealmLevel >= 10 || state.lifetimeHighestCultivationRealmLevel >= 13) },
      { key: "qiPathComplete", system: "仙道", name: "炼气已全", description: "解锁炼气道所有境界。", reward: "开启修真道，解锁仙道挑战·化凡", completed: completedAchievement("qiPathComplete", state.advancedRealmLevel >= 10 || state.lifetimeHighestCultivationRealmLevel >= 13 || hasAchievement("selfSeveringSlash")) },
      { key: "threeDeficiencies", name: "三缺", description: "福、禄、寿三种挑战各完成1次。", reward: "非挑战转生类重置后获得1000 战力", completed: completedAchievement("threeDeficiencies", threeDeficienciesCompleted()) },
      { key: "fiveMisfortunesThreeDeficiencies", name: "五弊三缺", description: "福、禄、寿、五弊挑战全部完成3次。", reward: "纪念性成就", completed: completedAchievement("fiveMisfortunesThreeDeficiencies", allFortuneChallengesCompleted()) },
      { key: "seizeFoundation", system: "仙道", name: "夺基", description: `累计 100 有效探寻量触发一次，保留小数；当前 ${format(WIS.Cultivation.ExplorationProgress.math.project(state.explorationRewards?.seize || []), 4)}/100。`, reward: "下品灵根失效，获得中品灵根", completed: completedAchievement("seizeFoundation", false) }
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
            : scaleIndex === 11
              ? "挑战中战力获取 ×15"
            : scaleIndex === 12
              ? "任意挑战中J获取 ×75"
            : scaleIndex === 13
              ? "解锁宝物·宇宙纤维"
            : scaleIndex === 14
              ? "解锁宝物·宇宙意志"
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
            : scaleIndex === 11
              ? "永久解锁挑战·太阳之力"
            : scaleIndex === 12
              ? "永久解锁挑战·银河"
              : scaleIndex === 13
                ? "永久解锁挑战·黑洞"
                : scaleIndex === 14
                  ? "抵达宇宙结构后解锁行动·大数"
                  : "奖励：后续加入",
          completed: completedAchievement(`trueScale${scaleIndex}`, gte(state.maxSinglePowerGain, scale.power))
        }
      );
    });

    definitions.push(
      { key: "beyondFractal", name: "超越分形", description: "完成分形-5，进入 G1。", reward: beyondFractalReward(), completed: completedAchievement("beyondFractal", state.meta.bigNumbers?.fractalLevel === 5) },
      { key: "googol", name: "古戈尔", description: "战力达到 1e100。", reward: "纪念性成就", completed: completedAchievement("googol", reachedPowerMilestone("googol")) },
      { key: "graham64", name: "葛立恒", description: "战力达到 G64。", reward: "纪念性成就", completed: completedAchievement("graham64", reachedPowerMilestone("graham64")) },
      { key: "tree3", name: "树", description: "完成 TREE(3) 超构造。", reward: "解锁 行动 → 无限", completed: completedAchievement("tree3", state.meta.bigNumbers?.tree?.rank >= 3) },
      { key: "trueG1", name: "真 G1", description: "首次完成大数挑战·真 G1。", reward: "所有分形获取 ×10", completed: hasAchievement("trueG1") },
      { key: "trueGraham", name: "真葛立恒", description: "首次完成大数挑战·真葛立恒。", reward: "G基础提升需求变为原需求^0.95，挑战中及G64后同样生效", completed: hasAchievement("trueGraham") },
      { key: "trueTree3", name: "真 TREE3", description: "首次完成大数挑战·真 TREE3。", reward: "树构造点获取 ×3", completed: hasAchievement("trueTree3") }
    );

    // Keep catalog presentation in progression order, independent of declaration placement.
    const order=[
      "powerOne","five","brick","trueBrick","lightningFiveWhip","trainingUp",
      ...SCALE_THRESHOLDS.slice(2).flatMap((_scale,i)=>[`scale${i+2}`,`trueScale${i+2}`]),
      "threeDeficiencies","fiveMisfortunesThreeDeficiencies","beyondFractal","googol","trueG1","graham64","trueGraham","tree3","trueTree3",
      "universe","eternalWitness",
      "aspireImmortality","daoFoundation","seizeFoundation","goldenCore","infantSpirit","humanRealmDominance","refineTheVoid","bodyIntegration","mahayana",
      "ascendImmortal","goldenNature","utmostPurity","greatLuo","selfSeveringSlash","qiPathComplete","infantTransformationImmortal","yuan","greatHeavenlyVenerable"
    ];
    const positions=new Map(order.map((key,i)=>[key,i]));
    return definitions.sort((a,b)=>(positions.get(a.key)??order.length)-(positions.get(b.key)??order.length));
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

  function notifyNewAchievements() {
    // Compatibility for action/startup/offline callers. Acquisition is explicit;
    // the next actual UI render publishes the final committed set, in one batch.
    // Never capture a candidate's names in a deferred notification closure.
    if (runtime.canPresentState() && runtime.has("render")) runtime.call("render");
    return [];
  }

  function notifyConfirmedAchievements(keys) {
    if (!runtime.canPresentState()) return [];
    const selected = new Set(keys);
    const names = achievementDefinitions()
      .filter(a => selected.has(a.key) && hasAchievement(a.key)).map(a => a.name);
    if (names.length) showAchievementNotice(names);
    return names;
  }

  function createPresentation(invalidate) {
    const keys = () => WIS.Meta.Achievements.unlockedKeys(state).sort();
    // Presentation-only snapshot, never saved and never used for rewards.
    // Loaded flags are history, not newly acquired notifications.
    let observed = keys();
    return Object.freeze({
      reset() { observed = keys(); invalidate(); },
      sync({ notify = true } = {}) {
        if (!runtime.canPresentState()) return false;
        const next = keys();
        if (next.length === observed.length && next.every((key, i) => key === observed[i])) return false;
        const previous = new Set(observed), added = next.filter(key => !previous.has(key));
        observed = next;
        // Invalidation is independent of notifications, including silent batches.
        invalidate();
        if (notify) notifyConfirmedAchievements(added);
        return true;
      }
    });
  }

  WIS.Meta.Achievements = Object.freeze({
    greatHeavenlyVenerableMultiplier, ordinaryTreasureRequirementDivisor,
    has(state, key) {
      return state.meta.achievements?.[key] === true;
    },
    record(state, key) {
      if (key === "tree3") state.meta.infinity = {...state.meta.infinity, unlocked:true};
      if (state.meta.achievements[key] === true) return false;
      state.meta.achievements[key] = true;
      WIS.Core.Effects?.invalidate?.();
      return true;
    },
    unlockedKeys(state) {
      return Object.keys(state.meta.achievements || {}).filter((key) => state.meta.achievements[key]);
    },
    hasCurrent: hasAchievement, definitions: achievementDefinitions, states: achievementStates,
    recordCurrent: recordCurrentAchievements, notifyNew: notifyNewAchievements,
    createPresentation, beyondFractalReward,
    registerTrainingClick,
    achievementsUnlocked, upgradesUnlocked, cultivationUnlocked, treasuresUnlocked,
    challengesUnlocked, statisticsUnlocked
  });
}(window.WIS));

