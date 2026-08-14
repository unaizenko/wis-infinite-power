(function defineUIApp(WIS) {
  "use strict";

  function create(context) {
    const runtime = WIS.Core.Runtime;
    const state = runtime.state;
    const applyResourceSoftcap = (...args) => runtime.call("applyResourceSoftcap", ...args);
    const { saveState, simulateOfflineProgress, achievementStates, recordCurrentAchievements, updateLifetimeStatistics, notifyNewAchievements, freshDefaultState, formatCompact, format, formatCost, multiplyEffects, multiplierEffectValue, multiplyEffectGroups, calculateSourceGain, calculateRegionGain, formatMultiplierGroups, formatElapsedTime, formatGameCalendar, resourceSoftcapExponent, formatSoftcapExponent, activeSoftcapStages, removedSoftcapStages, achievementDefinitions, achievementsUnlocked, upgradesUnlocked, cultivationUnlocked, treasuresUnlocked, challengesUnlocked, statisticsUnlocked, hasAchievement, startChallenge, exitChallenge, setLastTickAt } = context;
  const CONFIG = WIS.Core.Config;
  const POWER_COSTS = CONFIG.costs.power;
  const IMMORTAL_COSTS = CONFIG.costs.immortal;
  const GAME_VERSION = CONFIG.gameVersion;
  const GYM_COST = POWER_COSTS.gym, EXERCISE_COST = POWER_COSTS.exercise, TRANSCENDENT_COST = POWER_COSTS.transcendent;
  const FOCUS_COST = POWER_COSTS.focus, BREATHING_METHOD_COST = POWER_COSTS.breathingMethod, EXTREME_EXERCISE_COST = POWER_COSTS.extremeExercise;
  const WATER_COST = POWER_COSTS.water, GHOST_BRAIN_COST = POWER_COSTS.ghostBrain, NATURAL_STRENGTH_COST = POWER_COSTS.naturalStrength;
  const MENTAL_POWER_COST = POWER_COSTS.mentalPower, LIFE_POWER_COST = POWER_COSTS.lifePower, MY_STYLE_COST = POWER_COSTS.myStyle;
  const INTUITION_COST = POWER_COSTS.intuition, SONIC_MOVEMENT_COST = POWER_COSTS.sonicMovement, CARBON_LIMIT_COST = POWER_COSTS.carbonLimit;
  const KILLING_INTENT_COST = POWER_COSTS.killingIntent, ROCK_STRIKE_COST = POWER_COSTS.rockStrike, HIGH_SPEED_METABOLISM_COST = POWER_COSTS.highSpeedMetabolism;
  const ENDURANCE_ENHANCEMENT_COST = POWER_COSTS.enduranceEnhancement, BULLET_TIME_COST = POWER_COSTS.bulletTime, DYNAMIC_FOCUS_COST = POWER_COSTS.dynamicFocus;
  const SUPER_PERCEPTION_COST = POWER_COSTS.superPerception, INVULNERABLE_COST = POWER_COSTS.invulnerable, REGENERATION_COST = POWER_COSTS.regeneration;
  const SUPERPOWER_COST = POWER_COSTS.superpower, SUPER_SPEED_THINKING_COST = POWER_COSTS.superSpeedThinking, MOUNTAIN_COLLAPSE_COST = POWER_COSTS.mountainCollapse;
  const MIND_DIVISION_COSTS = POWER_COSTS.mindDivision, HYPER_REGENERATION_COST = POWER_COSTS.hyperRegeneration, MENTAL_DOMAIN_COST = POWER_COSTS.mentalDomain;
  const EARTH_SPLIT_COST = POWER_COSTS.earthSplit, GODSPEED_COST = POWER_COSTS.godspeed, SUPERPOWER_EVOLUTION_COST = POWER_COSTS.superpowerEvolution;
  const SUBTLE_COST = POWER_COSTS.subtle, SKY_SPLIT_COST = POWER_COSTS.skySplit, ROCK_BASE_COST = POWER_COSTS.rockBase;
  const BIOLOGICAL_QUANTIFICATION_COST = POWER_COSTS.biologicalQuantification, DESTROY_COUNTRY_COST = POWER_COSTS.destroyCountry;
  const KILLING_INTENT_SUBSTANCE_COST = POWER_COSTS.killingIntentSubstance, ENERGY_CYCLE_COST = POWER_COSTS.energyCycle;
  const MOUNTAIN_SHATTER_COST = POWER_COSTS.mountainShatter, BIOENERGY_COST = POWER_COSTS.bioenergy;
  const ROCK_BASE_LEVEL_CAP = CONFIG.rockBaseLevelCap;
  const QI_REFINING_COST = IMMORTAL_COSTS.qiRefining, FOUNDATION_BASE_COST = IMMORTAL_COSTS.foundation, GOLDEN_CORE_BASE_COST = IMMORTAL_COSTS.goldenCore;
  const ADVANCED_REALMS = CONFIG.realms;
  const IMMORTAL_LIFE_COST = IMMORTAL_COSTS.immortalLife, CIRCULATION_COST = IMMORTAL_COSTS.circulation, MINOR_TECHNIQUE_COST = IMMORTAL_COSTS.minorTechnique;
  const FLYING_ESCAPE_COST = IMMORTAL_COSTS.flyingEscape, MATERIAL_CONTROL_COST = IMMORTAL_COSTS.materialControl, DIVINE_SENSE_COST = IMMORTAL_COSTS.divineSense;
  const GREAT_CULTIVATOR_COST = IMMORTAL_COSTS.greatCultivator, SPIRIT_WORLD_ASCENSION_COST = IMMORTAL_COSTS.spiritWorldAscension, AURA_CONTROL_COST = IMMORTAL_COSTS.auraControl;
  const EQUAL_HEAVEN_LONGEVITY_COST = IMMORTAL_COSTS.equalHeavenLongevity, FIVE_ELEMENTS_COST = IMMORTAL_COSTS.fiveElements, HEAVENLY_TREASURE_COSTS = IMMORTAL_COSTS.heavenlyTreasure;
  const BRAHMA_DEMON_ART_COST = IMMORTAL_COSTS.brahmaDemonArt;
  const VOID_REFINING_TO_QI_COST = IMMORTAL_COSTS.voidRefiningToQi, SPIRIT_REFINING_ART_COST = IMMORTAL_COSTS.spiritRefiningArt;
  const SECOND_NASCENT_SOUL_COST = IMMORTAL_COSTS.secondNascentSoul, ABUNDANT_AURA_COST = IMMORTAL_COSTS.abundantAura;
  const SILVER_TADPOLE_SCRIPT_COST = IMMORTAL_COSTS.silverTadpoleScript, IMMORTAL_REALM_DIVINE_ABILITY_COST = IMMORTAL_COSTS.immortalRealmDivineAbility;
  const PERFECTED_TECHNIQUE_COST = IMMORTAL_COSTS.perfectedTechnique, HEAVEN_EARTH_AURA_COST = IMMORTAL_COSTS.heavenEarthAura;
  const DIVINE_ABILITY_MASTERY_COST = IMMORTAL_COSTS.divineAbilityMastery, AURA_INTO_BODY_COST = IMMORTAL_COSTS.auraIntoBody;
  const EXTERNAL_INCARNATION_COST = IMMORTAL_COSTS.externalIncarnation, DEMON_REALM_JOURNEY_COST = IMMORTAL_COSTS.demonRealmJourney;
  const RETURN_TO_ORIGIN_COST = IMMORTAL_COSTS.returnToOrigin;
  const MINOR_TRIBULATION_BASE_TRIGGER_LOAD = CONFIG.minorTribulationBaseTriggerLoad;
  const LONGEVITY_800_COSTS = IMMORTAL_COSTS.longevity800, MANA_LIQUEFACTION_COST = IMMORTAL_COSTS.manaLiquefaction;
  const QI_SPELL_COSTS = IMMORTAL_COSTS.qiSpell, FOUNDATION_SPELL_COSTS = IMMORTAL_COSTS.foundationSpell, LONGEVITY_COSTS = IMMORTAL_COSTS.longevity;
  const GOLDEN_CORE_LONGEVITY_COSTS = IMMORTAL_COSTS.goldenCoreLongevity, MANA_SOLIDIFICATION_COST = IMMORTAL_COSTS.manaSolidification;
  const TECHNIQUE_COST = IMMORTAL_COSTS.technique, MAGIC_TREASURE_COST = IMMORTAL_COSTS.magicTreasure;
  const EXPLORATION_BASE_MANA = CONFIG.exploration.baseMana, EXPLORATION_MINIMUM_POWER_COST = CONFIG.exploration.minimumPowerCost;
  const EXPLORATION_STANDARD_POWER_COST = CONFIG.exploration.standardPowerCost, EXPLORATION_COST_EXPONENT_SCALE = CONFIG.exploration.costExponentScale;
  const TRAINING_J_DECAY_SCALE = CONFIG.training.decayScale, TRAINING_J_DECAY_LOG_DIVISOR = CONFIG.training.decayLogDivisor, TRAINING_J_DECAY_POWER = CONFIG.training.decayPower;
  const SCATTER_RETAINED_UPGRADE_TIERS = CONFIG.scatterRetainedUpgradeTiers;
  const REINCARNATION_ROOTS = CONFIG.reincarnationRoots;
  const CHALLENGE_DEFINITIONS = CONFIG.challenges;
  const SCALE_THRESHOLDS = CONFIG.scales;
  const byId = WIS.UI.byId;
  const Scale = WIS.Power.ScaleLogic;
  const {
    gymPotentialMultiplier, gymMultiplier, sonicMovementMultiplier, godspeedExponent,
    godspeedPotentialExponent, breathingMethodGymMultiplier, scaleIndexForPower, updateScaleProgress,
    rollFitnessMembershipCardAttempts, exercisePotentialMultiplier, exerciseMultiplier,
    transcendentPotentialMultiplier, transcendentMultiplier, extremeExerciseEffectMultiplier,
    naturalStrengthPotentialMultiplier, powerMultiplierGroups, powerMultiplier, challengeCompletionCount,
    challengeRewardExponent, challengeRewardMultiplier, longevityChallengeRewardMultiplier,
    fiveMisfortunesRewardExponent, activeChallengeLimitExponent, jGainExponent, powerGainExponent,
    currentPowerMilestone, reachedPowerMilestone, superpowerExponent, fitnessSourceExponent,
    trainingSourceExponent, applyGainExponent, additiveLevelMultiplier, jMultiplierGroups, jMultiplier,
    automaticJPerSecond, jSourceGains, finalJPerSecondFromSources, longevityFitnessMultiplier,
    lifePowerFitnessMultiplier, myStylePotentialFitnessMultiplier,
    myStyleFitnessMultiplier, carbonLimitPotentialFitnessBonus, carbonLimitFitnessBonus,
    regenerationFitnessMultiplier, enduranceEnhancementFitnessMultiplier, fitnessMembershipCardCount,
    fitnessMembershipCardFitnessBonus, fitnessMembershipCardChance, fitnessJBonus,
    waterPotentialJMultiplier, runningCost, fitnessLevelCap, rockLevelCap,
    baseConversionGain, trainingPowerDecayMultiplier, trainingPowerSource, highSpeedMetabolismMultiplier,
    conversionGain, ghostBrainPotentialPowerBonus, ghostBrainPowerBonus, mentalDomainMultiplier,
    skySplitPotentialMultiplier, skySplitMultiplier, ghostBrainPowerSource,
    ghostBrainActualPowerPerSecond, joulesForNextBasePower,
    focusPowerPerSecond, subtleFocusExponent, rawFocusPowerPerSecond, dynamicFocusMultiplier,
    focusSoftcapExponent, actualFocusPowerPerSecond, killingIntentJBonus,
    rawKillingIntentPotentialJBonus, superSpeedThinkingMultiplier, killingIntentPotentialJBonus,
    focusPercent, intuitionPotentialFocusMultiplier, intuitionFocusMultiplier, rockCost,
    rockPowerPerSecond, effectiveRockLevel, rockStrikeMultiplier, mountainCollapseExponent,
    automaticPowerPerSecond, finalPowerGainFromSources, mindDivisionCost,
    manualScaleUpgradeHistory, hasManuallyUpgradedScale, autoUpgradeEnhancements, achievementJBonus,
    train, buyRunning, buyGym, buyExercise, buyTranscendent, buyFocus, buyBreathingMethod,
    buyExtremeExercise, buyRock, buyWater, buyGhostBrain, buyNaturalStrength, buyMentalPower,
    buyLifePower, buyMyStyle, buyIntuition, buySonicMovement, buyCarbonLimit, buyKillingIntent,
    buyRockStrike, buyHighSpeedMetabolism, buyEnduranceEnhancement, buyBulletTime, buyDynamicFocus,
    buySuperPerception, buyInvulnerable, buyRegeneration, buySuperpower, buySuperSpeedThinking,
    buyMountainCollapse, buyMindDivision, toggleGhostBack
  } = Scale;
  const Immortal = WIS.Cultivation.ImmortalLogic;
  const {
    immortalCultivationActive, cultivationRealmLevel, cultivationRealmName, qiSpellPowerMultiplier, foundationSpellPowerMultiplier, greatCultivatorJMultiplier, immortalFitnessBaseMultiplier, equalHeavenLongevityFitnessMultiplier, baLingChiCount, baLingChiFitnessMultiplier, manaLiquefactionManaJMultiplier, manaJBonus, spiritRefiningArtExponent, reincarnationManaJExponent, manaJRawBonus, magicTreasurePotentialPowerBonus, materialControlMultiplier, magicTreasurePowerBonus, magicTreasurePowerSource, brahmaDemonArtPowerSource, trueSpiritTransformationMultiplier, rollTianNiPearlAttempts, minorTribulationPowerExponent, minorTribulationExplorationBaseExponent, minorTribulationExplorationMinimumExponent, minorTribulationExplorationDecayCoefficient, minorTribulationExplorationManaExponent, baLingChiChance, immortalTreasureChanceMultiplier, activeRootRequirementMultiplier, realmRequirementMultiplier, activeRootName, permanentRootDefinition, effectiveScatterRebuildLevel, nextRealmRequirementStackCount, foundationCost, goldenCoreCost, goldenCoreBaseCost, advancedRealmCost, advancedRealmBaseCost, nextRealmCost, breathingRealmConfig, breathingManaDecayMultiplier, baseBreathingManaGain, breathingJCurveExponent, breathingManaGain, breathingManaSource, voidRefiningToQiExponent, auraControlPotentialMultiplier, auraControlMultiplier, immortalRealmDivineAbilityPotentialMultiplier, immortalRealmDivineAbilityMultiplier, manaMultiplierGroups, manaGainMultiplier, bottleneckManaMultiplier, cultivationBottleneckManaMultiplier, scatterRebuildManaMultiplier, naturalTreasureManaMultiplier, naturalTreasureUpgradeChance, naturalTreasureLevelCap, xuTianDingCount, xuTianDingMultiplier, xuTianDingChance, wanYaoFanCount, wanYaoFanMultiplier, wanYaoFanChance, tianNiPearlCount, tianNiPearlManaMultiplier, tianNiPearlChance, mysteriousGreenBottleCount, mysteriousGreenBottleMultiplier, mysteriousGreenBottleChance, fuBaoCount, fuBaoChance, fuBaoManaRatio, fuBaoExplorationManaBonus, formatProbability, joulesForNextBaseMana, automaticManaPerSecond, circulationManaSource, circulationManaPerSecond, circulationPercent, explorationManaGain, explorationPotentialManaGain, silverTadpoleScriptExplorationExponent, minorTribulationTriggerLoad, spiritWorldAscensionExplorationMultiplier, finalManaGainFromSources, flyingEscapeMultiplier, explorationPowerCost, rawExplorationAmountForCost, explorationAmountForCost, divineSenseMultiplier, explorationBaseMana, rollMysteriousGreenBottleAttempts, rollFuBaoAttempts, rollNaturalTreasureAttempts, rollXuTianDingAttempts, rollWanYaoFanAttempts, rollBaLingChiAttempts, rollSeizeFoundationAttempts, processExplorationJudgements, addExplorationProgress, tryTianNiPearl, longevityCost, qiSpellCost, foundationSpellCost, goldenCoreLongevityCost, longevity800Cost, heavenlyTreasureCost, trueSpiritTransformationCost, manualImmortalAbilityHistory, hasManuallyUpgradedImmortalAbility, recordManualProgress, recordManualRealmBreakthrough, autoUpgradeImmortalAbilities, autoBreakthroughImmortalRealms, chooseCultivation, grantMahayanaReincarnationEffects, unlockQiRefining, breathe, minorTribulationPreviewForExploration, registerSuccessfulExploration, unlockFoundation, unlockGoldenCore, unlockAdvancedRealm, unlockImmortalLife, buyQiSpell, unlockCirculation, unlockManaLiquefaction, unlockTechnique, buyFoundationSpell, buyLongevity, buyGoldenCoreLongevity, unlockManaSolidification, unlockMagicTreasure, unlockMinorTechnique, unlockFlyingEscape, unlockMaterialControl, unlockDivineSense, unlockGreatCultivator, unlockSecondNascentSoul, buyLongevity800, unlockManaAbility, unlockVoidRefinementAbility, buyHeavenlyTreasure, buyTrueSpiritTransformation, grantThreeDeficienciesResetReward, explore, scatterAndRebuild, reincarnate
  } = Immortal;

    let activePage = "actions";
    let activeCultivationPage = "realms";
    let noticeTimer;
    let achievementNoticeTimer;
    let scaleNoticeTimer;

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.checked = input.value === state.theme;
    });
  }

  function exportSave() {
    saveState();
    const payload = WIS.Core.Save.envelope(state);
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
      const schemaVersion = Number(parsed?.schemaVersion ?? parsed?.version) || 36;
      runtime.setState(WIS.Core.State.migrate(schemaVersion, WIS.Core.Save.unwrap(parsed)));
      runtime.call("resetTransientAccumulators");
      const previousAchievements = achievementStates();
      const offlineReport = simulateOfflineProgress((Date.now() - state.lastUpdateAt) / 1000);
      setLastTickAt(Date.now());
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
    runtime.setState(freshDefaultState());
    runtime.call("resetTransientAccumulators");
    setLastTickAt(Date.now());
    activePage = "actions";
    activeCultivationPage = "realms";
    WIS.Core.Save.remove();
    applyTheme();
    switchPage("actions");
    render();
    saveState();
    byId("settings-dialog").close();
    showNotice("游戏已重置");
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

  function switchCultivationPage(pageName) {
    if (state.cultivation.active !== "immortal" || !["realms", "abilities"].includes(pageName)) return;
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
      showNotice("游戏时间达到10 分钟后解锁统计");
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
    WIS.UI.Cards.sortByCost();
  }

  function ensureAchievementCards() {
    WIS.UI.Cards.renderAchievementCards(byId("achievement-list"), achievementDefinitions());
  }

  function ensureAdvancedRealmAbilityGroups() {
    const container = byId("advanced-realm-ability-groups");
    if (!container || container.children.length > 0) return;
    container.innerHTML = ADVANCED_REALMS.slice(2, -1).map((realm, offset) => {
      const index = offset + 2;
      const nextRealm = ADVANCED_REALMS[index + 1];
      const voidRefinementAbilities = realm.key === "voidRefinement" ? `
            <article class="item-row purchased" id="enhanced-minor-tribulation-ability" data-sort-cost="0">
              <div class="item-content"><h2>强化小天劫</h2><p>炼虚自带。沿用当前小天劫负荷门槛；探寻法力常驻指数降至0.92，战力区域常驻指数降至0.99，触发后的最低探寻指数为0.75。</p></div>
              <div class="purchase-control"><span id="enhanced-minor-tribulation-preview">等待炼虚</span><button class="primary-button" type="button" disabled>炼虚自带</button></div>
            </article>
            <article class="item-row" id="brahma-demon-art-ability" data-sort-cost="100000000000000">
              <div class="item-content"><h2>梵圣真魔功</h2><p>每秒获得健身最终来源300%的独立战力来源。</p></div>
              <div class="purchase-control"><span id="brahma-demon-art-preview">解锁后：基础来源 +0 战力/秒；当前实际：+0 战力/秒</span><small>消耗 1e14 法力</small><button id="unlock-brahma-demon-art" class="primary-button" type="button">解锁</button></div>
            </article>
            <article class="item-row" id="true-spirit-transformation-ability" data-sort-cost="50000000000000">
              <div class="item-content"><h2>真灵变</h2><p>可升5级，每级使全部法力获取倍率增加0.6，本能力内部加算。</p></div>
              <div class="purchase-control"><span id="true-spirit-transformation-preview">当前：0/5级；法力获取倍率 ×1.00</span><small id="true-spirit-transformation-cost">消耗 5e13 法力</small><button id="unlock-true-spirit-transformation" class="primary-button" type="button">升级</button></div>
            </article>
            <article class="item-row" id="silver-tadpole-script-ability" data-sort-cost="500000000000000">
              <div class="item-content"><h2>银蝌文</h2><p>使小天劫负荷门槛由150提高至1500，并使探寻法力在小天劫结算前 ^1.06。</p></div>
              <div class="purchase-control"><span id="silver-tadpole-script-preview">解锁后：小天劫门槛 150 → 1500；探寻法力 ^1.06</span><small>消耗 5e14 法力</small><button id="unlock-silver-tadpole-script" class="primary-button" type="button">解锁</button></div>
            </article>
            <article class="item-row" id="void-refining-to-qi-ability" data-sort-cost="800000000000000">
              <div class="item-content"><h2>炼虚为气</h2><p>使完整吐纳来源^1.06，周天通过吐纳来源间接受益。</p></div>
              <div class="purchase-control"><span id="void-refining-to-qi-preview">解锁后：吐纳来源 ^1.06</span><small>消耗 8e14 法力</small><button id="unlock-void-refining-to-qi" class="primary-button" type="button">解锁</button></div>
            </article>
            <article class="item-row" id="immortal-realm-divine-ability" data-sort-cost="1200000000000000">
              <div class="item-content"><h2>仙界神通</h2><p>根据当前 J提供独立吐纳来源倍率，周天通过吐纳来源间接受益。</p></div>
              <div class="purchase-control"><span id="immortal-realm-divine-preview">解锁后：吐纳法力获取倍率 ×1</span><small>消耗 1.2e15 法力</small><button id="unlock-immortal-realm-divine" class="primary-button" type="button">解锁</button></div>
            </article>
            <article class="item-row" id="spirit-refining-art-ability" data-sort-cost="2000000000000000">
              <div class="item-content"><h2>炼神术</h2><p>使当前法力提供的 J 来源额外 ^1.06。</p></div>
              <div class="purchase-control"><span id="spirit-refining-art-preview">解锁后：法力 J 来源 ^1.06</span><small>消耗 2e15 法力</small><button id="unlock-spirit-refining-art" class="primary-button" type="button">解锁</button></div>
            </article>` : "";
      const bodyIntegrationAbilities = realm.key === "bodyIntegration" ? `
            <article class="item-row" id="perfected-technique-ability" data-sort-cost="${PERFECTED_TECHNIQUE_COST}"><div class="item-content"><h2>功法大成</h2><p>使周天最终比例 ×1.5。</p></div><div class="purchase-control"><span id="perfected-technique-preview">解锁后：周天比例 ×1.5</span><small>消耗 ${formatCost(PERFECTED_TECHNIQUE_COST)} 法力</small><button id="unlock-perfected-technique" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="heaven-earth-aura-ability" data-sort-cost="${HEAVEN_EARTH_AURA_COST}"><div class="item-content"><h2>天地元气</h2><p>使吐纳 J 曲线指数 +0.25，周天间接受益。</p></div><div class="purchase-control"><span id="heaven-earth-aura-preview">解锁后：吐纳 J 曲线指数 +0.25</span><small>消耗 ${formatCost(HEAVEN_EARTH_AURA_COST)} 法力</small><button id="unlock-heaven-earth-aura" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="divine-ability-mastery-ability" data-sort-cost="${DIVINE_ABILITY_MASTERY_COST}"><div class="item-content"><h2>神通通神</h2><p>使全部法力获取倍率 ×2.5。</p></div><div class="purchase-control"><span id="divine-ability-mastery-preview">解锁后：全部法力 ×2.5</span><small>消耗 ${formatCost(DIVINE_ABILITY_MASTERY_COST)} 法力</small><button id="unlock-divine-ability-mastery" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="aura-into-body-ability" data-sort-cost="${AURA_INTO_BODY_COST}"><div class="item-content"><h2>元气入体</h2><p>使健身 J 来源 ×20，并提高40级健身上限。</p></div><div class="purchase-control"><span id="aura-into-body-preview">解锁后：健身 J ×20；健身上限 +40</span><small>消耗 ${formatCost(AURA_INTO_BODY_COST)} 法力</small><button id="unlock-aura-into-body" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="external-incarnation-ability" data-sort-cost="${EXTERNAL_INCARNATION_COST}"><div class="item-content"><h2>身外化身</h2><p>使梵圣真魔功的独立战力来源 ×5。</p></div><div class="purchase-control"><span id="external-incarnation-preview">解锁后：梵圣真魔功 ×5</span><small>消耗 ${formatCost(EXTERNAL_INCARNATION_COST)} 法力</small><button id="unlock-external-incarnation" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="demon-realm-journey-ability" data-sort-cost="${DEMON_REALM_JOURNEY_COST}"><div class="item-content"><h2>魔界之游</h2><p>使普通探寻法力来源 ×5，并使仙道宝物基础获得概率 ×3。</p></div><div class="purchase-control"><span id="demon-realm-journey-preview">解锁后：普通探寻 ×5；仙道宝物概率 ×3</span><small>消耗 ${formatCost(DEMON_REALM_JOURNEY_COST)} 法力</small><button id="unlock-demon-realm-journey" class="primary-button" type="button">解锁</button></div></article>
            <article class="item-row" id="return-to-origin-ability" data-sort-cost="${RETURN_TO_ORIGIN_COST}"><div class="item-content"><h2>返本归元</h2><p>使 J 区域结果 ^1.02。</p></div><div class="purchase-control"><span id="return-to-origin-preview">解锁后：J 区域 ^1.02</span><small>消耗 ${formatCost(RETURN_TO_ORIGIN_COST)} 法力</small><button id="unlock-return-to-origin" class="primary-button" type="button">解锁</button></div></article>` : "";
      return `
        <details class="upgrade-group" id="${realm.slug}-abilities" open hidden>
          <summary>
            <span><b>${realm.name}</b><small>${realm.key === "voidRefinement" ? `${nextRealm.name}瓶颈、强化小天劫、梵圣真魔功、真灵变、银蝌文、炼虚为气、仙界神通、炼神术` : realm.key === "bodyIntegration" ? `${nextRealm.name}瓶颈、功法大成、天地元气、神通通神、元气入体、身外化身、魔界之游、返本归元` : `${nextRealm.name}瓶颈`}</small></span>
          </summary>
          <div class="item-list" data-sort-by-cost>
            <article class="item-row purchased" id="${realm.slug}-bottleneck-ability" data-sort-cost="0">
              <div class="item-content">
                <h2>${nextRealm.name}瓶颈</h2>
                <p>法力越接近当前${nextRealm.name}实际需求，法力获取倍率下降越快；突破${nextRealm.name}后解除。</p>
              </div>
              <div class="purchase-control">
                <span id="${realm.slug}-bottleneck-preview">当前法力获取倍率 ×1.00</span>
                <small id="${nextRealm.slug}-bottleneck-point">拐点：当前${nextRealm.name}实际需求</small>
                <button id="${realm.slug}-bottleneck-state" class="primary-button" type="button" disabled>已生效</button>
              </div>
            </article>
            ${voidRefinementAbilities}
            ${bodyIntegrationAbilities}
          </div>
        </details>
      `;
    }).join("");
    container.parentElement.insertBefore(byId("spirit-transformation-abilities"), container);
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
    const nextLimit = challenge.limitExponents?.[Math.min(completed, challenge.limitExponents.length - 1)];
    const rewardExponent = challengeRewardExponent(challengeKey);
    const button = byId(`toggle-${idPrefix}`);
    const card = byId(`${idPrefix}-challenge`);

    card.hidden = !challengeUnlocked(challengeKey);
    if (card.hidden) return;

    byId(`${idPrefix}-progress`).textContent = `完成：${completed}/${challenge.maxCompletions}次`;
    if (challengeKey === "fiveMisfortunes") {
      const targetScale = SCALE_THRESHOLDS[challengeRequiredScaleIndex(challengeKey)].name;
      byId(`${idPrefix}-limit`).textContent = finished
        ? "全部挑战已完成"
        : `本次无法选择体系；要求达到${targetScale}`;
    } else if (challenge.timeToLimitSeconds) {
      const currentExponent = activeChallengeLimitExponent(challengeKey);
      byId(`${idPrefix}-limit`).textContent = finished
        ? "全部挑战已完成"
        : active
          ? `当前限制：${challenge.resourceName}获取 ^${currentExponent.toFixed(3)}（${formatElapsedTime(state.activeChallengeElapsedSeconds)} / 45分钟）`
          : `下次限制：${challenge.resourceName}获取指数在45分钟内降至 ^${nextLimit.toFixed(2)}`;
    } else {
      byId(`${idPrefix}-limit`).textContent = finished
        ? "全部限制已克服"
        : `${active ? "当前" : "下次"}限制：${challenge.resourceName}获取 ^${nextLimit.toFixed(2)}`;
    }
    const reward = byId(`${idPrefix}-reward`);
    if (reward) {
      reward.textContent = challengeKey === "longevity"
        ? `当前奖励：J与战力获取 ×${format(longevityChallengeRewardMultiplier(), 0)}`
        : challengeKey === "fiveMisfortunes"
          ? `当前奖励：选择体系前J与战力获取 ^${rewardExponent.toFixed(2)}`
          : `当前奖励：${challenge.rewardSourceName}来源 ^${rewardExponent.toFixed(2)}`;
    }
    button.textContent = active ? "退出挑战" : finished ? "已全部完成" : "开启挑战";
    button.disabled = finished || (state.activeChallenge !== null && !active);
  }

  function challengeUnlocked(challengeKey) {
    return WIS.Meta.Challenges.challengeUnlocked(challengeKey);
  }

  function challengeRequiredScaleIndex(challengeKey) {
    return WIS.Meta.Challenges.challengeRequiredScaleIndex(challengeKey);
  }

  function advancedRealmAbilityGroupVisible(index) {
    const currentlyReached = state.goldenCoreUnlocked && state.advancedRealmLevel > index;
    const retainedAfterScatter = state.scatterRetentionLevel > 0 &&
      state.lifetimeHighestCultivationRealmLevel >= index + 4;
    return currentlyReached || retainedAfterScatter;
  }

  function renderChallenges() {
    byId("challenge-active-state").textContent = state.activeChallenge
      ? `当前挑战：${CHALLENGE_DEFINITIONS[state.activeChallenge].name}`
      : "当前未进行挑战";
    renderChallenge("innateDeficiency", "innate-deficiency");
    renderChallenge("powerless", "powerless");
    renderChallenge("longevity", "longevity");
    renderChallenge("fiveMisfortunes", "five-misfortunes");
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
    const circulationPotential = circulationManaPerSecond();
    const nextManaJ = joulesForNextBaseMana();
    const nextQiSpellCost = qiSpellCost();
    const nextLongevityCost = longevityCost();
    const nextFoundationSpellCost = foundationSpellCost();
    const nextFoundationCost = foundationCost();
    const nextGoldenCoreCost = goldenCoreCost();
    const nextGoldenCoreLongevityCost = goldenCoreLongevityCost();
    const nextLongevity800Cost = longevity800Cost();
    const nextMindDivisionCost = mindDivisionCost();
    const nextHeavenlyTreasureCost = heavenlyTreasureCost();
    const currentExplorationPowerCost = explorationPowerCost();
    const currentRawExplorationAmount = rawExplorationAmountForCost(currentExplorationPowerCost);
    const currentExplorationAmount = explorationAmountForCost(currentExplorationPowerCost);
    const currentExplorationMana = explorationManaGain();
    const canExplore = state.goldenCoreUnlocked
      && currentExplorationPowerCost >= EXPLORATION_MINIMUM_POWER_COST
      && currentExplorationMana >= 1;
    const pearlCount = tianNiPearlCount();
    const greenBottleCount = mysteriousGreenBottleCount();
    const currentFuBaoCount = fuBaoCount();
    const membershipCardCount = fitnessMembershipCardCount();
    const currentXuTianDingCount = xuTianDingCount();
    const currentBaLingChiCount = baLingChiCount();
    const currentWanYaoFanCount = wanYaoFanCount();

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
    byId("mana-resource").hidden = !immortalCultivationActive() || !state.qiRefiningUnlocked;
    byId("mana").textContent = format(state.mana);
    byId("mana-rate").textContent = `（+${format(passiveManaGain)}/秒）`;
    byId("mana-rate").hidden = passiveManaGain <= 0;
    byId("conversion-preview").textContent = conversion >= 1
      ? `${format(state.joules)} J → ${format(conversion)} 战力`
      : "至少需要 10 J";
    byId("next-power-j").textContent = `下一战力所需：${format(nextPowerJ, 0)} J`;
    byId("train-button").disabled = conversion < 1;
    byId("gym-preview").textContent = `${state.gymPurchased ? "当前：" : "解锁后："}J 获取倍率 ×${(state.gymPurchased ? gym : gymPotential).toFixed(2)}`;
    byId("exercise-preview").textContent = `${state.exercisePurchased ? "当前：" : "解锁后："}J 获取倍率 ×${(state.exercisePurchased ? exercise : exercisePotential).toFixed(2)}`;
    byId("transcendent-preview").textContent = `${state.transcendentPurchased ? "当前：" : "解锁后："}战力获取倍率 ×${(state.transcendentPurchased ? transcendent : transcendentPotential).toFixed(2)}`;
    byId("focus-preview").textContent = `基础来源：+${format(focusPowerPerSecond())} 战力/秒；当前实际：+${format(focusEffectivePotential)} 战力/秒（来源动态幂软上限 ^${focusSoftcapExponent().toFixed(3)}）`;
    byId("breathing-method-preview").textContent = `${state.breathingMethodPurchased ? "当前：" : "解锁后："}跑步倍率 ×1.5`;
    byId("extreme-exercise-preview").textContent = `${state.extremeExercisePurchased ? "当前：" : "解锁后："}运动倍率 ×1.5`;
    byId("running-level").textContent = `当前：${state.runningLevel}/${fitnessCap}级`;
    byId("running-rate").textContent = `当前实际：+${format(fitnessEffectivePotential)} J/秒`;
    byId("running-cost").textContent = `消耗 ${formatCost(nextRunningCost)} 战力`;
    byId("buy-running").textContent = state.runningLevel >= fitnessCap ? "已达上限" : "升级";
    byId("buy-running").disabled = state.runningLevel >= fitnessCap || state.power < nextRunningCost;
    byId("running-action").hidden = state.totalPower < 1;
    byId("brick-upgrades").hidden = !state.brickUnlocked && state.scatterRetentionLevel < 2;
    byId("wall-upgrades").hidden = !state.wallUnlocked && state.scatterRetentionLevel < 3;
    byId("house-upgrades").hidden = state.highestScaleIndex < 3;
    byId("building-upgrades").hidden = state.highestScaleIndex < 4;
    byId("street-upgrades").hidden = state.highestScaleIndex < 5;
    byId("city-upgrades").hidden = state.highestScaleIndex < 6;
    byId("country-upgrades").hidden = state.highestScaleIndex < 7;
    byId("rock-action").hidden = !state.wallUnlocked;
    byId("ghost-back-action").hidden = state.highestScaleIndex < 3;
    byId("ghost-back-action").classList.toggle("purchased", state.ghostBackActive);
    byId("ghost-back-state").textContent = state.ghostBackActive ? "当前已激活" : "当前未激活";
    byId("toggle-ghost-back").textContent = state.ghostBackActive ? "关闭" : "激活";
    byId("rock-level").textContent = hasAchievement("scale7")
      ? `当前：实际 ${state.rockLevel}/${rockCap}级；生效 ${effectiveRockLevel()}级`
      : `当前：${state.rockLevel}/${rockCap}级`;
    byId("rock-rate").textContent = `基础来源：+${format(rockRawPotential)} 战力/秒；当前实际：+${format(rockEffectivePotential)} 战力/秒`;
    byId("rock-cost").textContent = state.rockLevel >= rockCap ? "已达到等级上限" : `消耗 ${formatCost(nextRockCost)} 战力`;
    byId("buy-rock").textContent = state.rockLevel >= rockCap ? "已达上限" : "升级";
    byId("buy-rock").disabled = state.rockLevel >= rockCap || state.power < nextRockCost;
    byId("water-preview").textContent = `${state.waterPurchased ? "当前：" : "解锁后："}J 获取倍率 ×${waterPotential.toFixed(2)}`;
    byId("ghost-brain-preview").textContent = `${state.ghostBrainPurchased ? "当前：" : "解锁后："}基础来源 +${format(ghostBrainPotential)} 战力/秒；当前实际：+${format(ghostBrainEffectivePotential)} 战力/秒`;
    byId("natural-strength-preview").textContent = `${state.naturalStrengthPurchased ? "当前：" : "解锁后："}战力获取倍率 ×${naturalStrengthPotential.toFixed(2)}`;
    byId("mental-power-preview").textContent = `${state.mentalPowerPurchased ? "当前：集中比例" : "解锁后：集中比例"} ${state.mentalPowerPurchased ? `${(focusPercent() * 100).toFixed(1)}%` : "+1个百分点"}`;
    byId("life-power-preview").textContent = `${state.lifePowerPurchased ? "当前：" : "解锁后："}健身倍率 ×1.50`;
    byId("my-style-preview").textContent = `${state.myStylePurchased ? "当前：" : "解锁后："}健身倍率 ×${myStylePotential.toFixed(2)}`;
    byId("intuition-preview").textContent = `${state.intuitionPurchased ? "当前：" : "解锁后："}集中倍率 ×${intuitionPotential.toFixed(2)}`;
    byId("sonic-movement-preview").textContent = `${state.sonicMovementPurchased ? "当前：" : "解锁后："}跑步倍率 ×${(state.sonicMovementPurchased ? sonicMovementMultiplier() : 3.8).toFixed(2)}`;
    byId("carbon-limit-preview").textContent = `${state.carbonLimitPurchased ? "当前：" : "解锁后："}健身倍率加法 +${carbonLimitPotential.toFixed(2)}`;
    byId("killing-intent-preview").textContent = `${state.killingIntentPurchased ? "当前：" : "解锁后："} +${format(killingIntentPotentialJBonus())} J/秒（集中实际获取战力的0.00005%，已计超速思维倍率）`;
    byId("biological-quantification-preview").textContent = `${state.biologicalQuantificationPurchased ? "当前：" : "解锁后："}健身 J ×12；健身上限 +30`;
    byId("destroy-country-preview").textContent = `${state.destroyCountryPurchased ? "当前：" : "解锁后："}打岩 ×1e4；打岩上限 +50`;
    byId("killing-intent-substance-preview").textContent = `${state.killingIntentSubstancePurchased ? "当前：" : "解锁后："}杀气提取比例 ×5`;
    byId("energy-cycle-preview").textContent = `${state.energyCyclePurchased ? "当前：" : "解锁后："}鬼脑来源 ×12`;
    byId("mountain-shatter-preview").textContent = `${state.mountainShatterPurchased ? "当前：" : "解锁后："}战力区域 ^1.015`;
    byId("bioenergy-preview").textContent = `${state.bioenergyPurchased ? "当前：" : "解锁后："}J 区域 ×3`;
    byId("rock-strike-preview").textContent = `${state.rockStrikePurchased ? "当前：" : "解锁后："}打岩来源 ×2；等级上限 +20`;
    byId("high-speed-metabolism-preview").textContent = `${state.highSpeedMetabolismPurchased ? "当前：" : "解锁后："}锻炼来源 ×1.75`;
    byId("endurance-enhancement-preview").textContent = `${state.enduranceEnhancementPurchased ? "当前：" : "解锁后："}健身倍率 ×2；等级上限 +20`;
    byId("bullet-time-preview").textContent = `${state.bulletTimePurchased ? "当前：" : "解锁后："}战力获取倍率 ×1.5`;
    byId("dynamic-focus-preview").textContent = `${state.dynamicFocusPurchased ? "当前：" : "解锁后："}集中倍率 ×1.5`;
    byId("super-perception-preview").textContent = `${state.superPerceptionPurchased ? "当前：" : "解锁后："}直感动态加成 ×1.50`;
    byId("invulnerable-preview").textContent = `${state.invulnerablePurchased ? "当前：" : "解锁后："}健身来源 ^1.15`;
    byId("regeneration-preview").textContent = `${state.regenerationPurchased ? "当前：" : "解锁后："}健身倍率 ×${regenerationFitnessMultiplier().toFixed(2)}`;
    byId("superpower-preview").textContent = `${state.superpowerPurchased ? "当前：" : "解锁后："}战力区域 ^${superpowerExponent().toFixed(2)}`;
    byId("super-speed-thinking-preview").textContent = `${state.superSpeedThinkingPurchased ? "当前：" : "解锁后："}杀气倍率 ×5.00`;
    byId("mountain-collapse-preview").textContent = `${state.mountainCollapsePurchased ? "当前：" : "解锁后："}打岩来源 ^${mountainCollapseExponent().toFixed(3)}；等级上限 +20`;
    byId("mind-division-preview").textContent = `当前：${state.mindDivisionLevel}/3级；集中比例 ${(focusPercent() * 100).toFixed(1)}%`;
    byId("mind-division-cost").textContent = state.mindDivisionLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextMindDivisionCost)} 战力`;
    byId("buy-mind-division").textContent = state.mindDivisionLevel >= 3 ? "已达上限" : "升级";
    byId("buy-mind-division").disabled = !state.focusPurchased || state.mindDivisionLevel >= 3 || state.power < nextMindDivisionCost;
    byId("mind-division-upgrade").classList.toggle("purchased", state.mindDivisionLevel >= 3);
    byId("hyper-regeneration-preview").textContent = `${state.hyperRegenerationPurchased ? "当前：" : "解锁后："}再生 ×15；健身上限 +20`;
    byId("superpower-evolution-preview").textContent = `${state.superpowerEvolutionPurchased ? "当前：" : "解锁后："}异能指数 1.06`;
    byId("earth-split-preview").textContent = `${state.earthSplitPurchased ? "当前：" : "解锁后："}崩山指数 ${(1.1 + 0.02 * Math.log10(1 + state.rockLevel / 10)).toFixed(3)}；打岩上限 +20`;
    byId("mental-domain-preview").textContent = `${state.mentalDomainPurchased ? "当前：" : "解锁后："}鬼脑来源倍率 ×5`;
    byId("godspeed-preview").textContent = `${state.godspeedPurchased ? "当前：" : "解锁后："}音速移动指数 ${godspeedPotentialExponent().toFixed(3)}；音速移动倍率 ×${Math.pow(3.8, godspeedPotentialExponent()).toFixed(2)}`;
    byId("subtle-preview").textContent = `${state.subtlePurchased ? "当前：" : "解锁后："}集中来源 ^1.05`;
    byId("sky-split-preview").textContent = `${state.skySplitPurchased ? "当前：" : "解锁后："}鬼脑来源倍率 ×${skySplitPotentialMultiplier().toFixed(2)}`;
    byId("breathing-action").hidden = !immortalCultivationActive() || !state.qiRefiningUnlocked;
    byId("breathing-preview").textContent = manaGain >= 1
      ? `${format(state.joules)} J → ${format(manaGain)} 法力`
      : "至少需要 3,000 J";
    byId("next-mana-j").textContent = `下一法力所需：${format(nextManaJ, 0)} J`;
    byId("breathing-button").disabled = manaGain < 1;
    byId("exploration-action").hidden = !immortalCultivationActive() || !state.goldenCoreUnlocked;
    byId("exploration-preview").textContent = canExplore
      ? `${formatCost(currentExplorationPowerCost)} 战力 → 约 ${format(currentExplorationMana)} 法力（原始探寻量 ${format(currentRawExplorationAmount)}；有效探寻量 ${format(currentExplorationAmount)}）`
      : "单次探寻至少消耗 1M 战力";
    byId("exploration-cost").textContent = `消耗当前 10% 战力，至少消耗 1M；累计有效探寻量 ${format(state.explorationProgress)} / 1`;
    byId("exploration-button").disabled = !canExplore;

    const cultivationSelected = Boolean(state.cultivation.active);
    const immortalSelected = immortalCultivationActive();
    const cultivationCard = document.querySelector('[data-cultivation-card="仙道"]');
    const cultivationButton = document.querySelector('[data-cultivation="仙道"]');
    cultivationCard.classList.toggle("selected", immortalSelected);
    const cultivationBlocked = state.activeChallenge === "fiveMisfortunes";
    cultivationButton.textContent = immortalSelected ? "已选择" : cultivationSelected ? "已选择其他体系" : cultivationBlocked ? "五弊挑战中不可选择" : "选择仙道";
    cultivationButton.disabled = cultivationSelected || cultivationBlocked;
    byId("cultivation-choices").hidden = cultivationSelected;
    byId("cultivation-status").textContent = immortalSelected
      ? "已选择：仙道（转世重修不会重置体系）"
      : cultivationSelected ? `已选择：${state.cultivation.active}`
        : cultivationBlocked ? "五弊挑战中无法选择体系" : "尚未选择体系";
    byId("immortal-progress").hidden = !immortalSelected;
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
    byId("root-abilities").hidden = !immortalSelected;
    Object.values(rootIds).forEach((rootId) => {
      byId(`${rootId}-ability`).hidden = rootId !== activeRootId;
    });
    byId(`${activeRootId}-preview`).textContent = state.qiRefiningUnlocked
      ? `法力获取倍率 ×${rootDefinition.manaMultiplier.toFixed(2)}`
      : `法力获取倍率 ×${rootDefinition.manaMultiplier.toFixed(2)}（重新炼气后生效）`;
    byId(`${activeRootId}-requirement`).textContent = state.qiRefiningUnlocked
      ? `下次突破累计 ×${nextRootRequirementMultiplier.toFixed(3)}（最多叠加3层）`
      : `前三层境界要求每层 ×${rootDefinition.requirementMultiplier.toFixed(2)}，灵根永久保留`;
    byId(`${activeRootId}-state`).textContent = state.qiRefiningUnlocked ? "已生效" : "等待炼气";
    byId("qi-abilities").hidden = !state.qiRefiningUnlocked && !retainedAbilitiesVisible;
    byId("qi-bottleneck-preview").textContent = !state.qiRefiningUnlocked
      ? "等待重新炼气，当前不生效"
      : state.foundationUnlocked
        ? "已失效，法力获取倍率 ×1.00"
        : `当前法力获取倍率 ×${bottleneckManaMultiplier(nextFoundationCost, true).toFixed(2)}`;
    byId("qi-bottleneck-state").textContent = !state.qiRefiningUnlocked ? "等待炼气" : state.foundationUnlocked ? "已失效" : "已生效";
    byId("foundation-bottleneck-point").textContent = `拐点：${format(nextFoundationCost, 0)} 法力`;
    byId("immortal-life-preview").textContent = state.immortalLifeUnlocked
      ? "当前：战力 ×0.95；法力 ×1.10"
      : "解锁后：战力 ×0.95；法力 ×1.10";
    byId("immortal-life-cost").textContent = `消耗 ${formatCost(IMMORTAL_LIFE_COST)} 法力`;
    byId("foundation-abilities").hidden = !state.foundationUnlocked && !retainedAbilitiesVisible;
    byId("foundation-bottleneck-preview").textContent = !state.foundationUnlocked
      ? "等待重新筑基，当前不生效"
      : state.goldenCoreUnlocked
        ? "已失效，法力获取倍率 ×1.00"
        : `当前法力获取倍率 ×${bottleneckManaMultiplier(nextGoldenCoreCost, true).toFixed(2)}`;
    byId("foundation-bottleneck-state").textContent = !state.foundationUnlocked ? "等待筑基" : state.goldenCoreUnlocked ? "已失效" : "已生效";
    byId("golden-core-bottleneck-point").textContent = `拐点：${format(nextGoldenCoreCost, 0)} 法力`;
    byId("qi-spell-ability").classList.toggle("purchased", state.qiSpellLevel >= 3);
    byId("qi-spell-level").textContent = `当前：${state.qiSpellLevel}/3级；本能力战力获取倍率 ×${qiSpellPowerMultiplier().toFixed(2)}`;
    byId("qi-spell-cost").textContent = state.qiSpellLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextQiSpellCost)} 法力`;
    byId("buy-qi-spell").textContent = state.qiSpellLevel >= 3 ? "已达上限" : "升级";
    byId("buy-qi-spell").disabled = !state.qiRefiningUnlocked || state.qiSpellLevel >= 3 || state.mana < nextQiSpellCost;
    byId("technique-preview").textContent = `${state.techniqueUnlocked ? "当前：" : "解锁后："}法力 ×1.50；J ×1.50`;
    byId("circulation-preview").textContent = `${state.circulationUnlocked ? "当前：" : "解锁后："} +${format(circulationPotential)} 法力/秒（${(circulationPercent() * 100).toFixed(0)}%吐纳）${hasAchievement("refineTheVoid") ? "；炼化虚空另提供 +1 基础来源" : ""}`;
    byId("mana-liquefaction-preview").textContent = state.manaLiquefactionUnlocked
      ? "当前：法力 ×0.80；法力 J 来源 ×1.50；吐纳 J 曲线指数 +0.3（灵气充沛时再 +0.4）"
      : "解锁后：法力 ×0.80；法力 J 来源 ×1.50；吐纳 J 曲线指数 +0.3（灵气充沛时再 +0.4）";
    byId("mana-liquefaction-cost").textContent = `消耗 ${formatCost(MANA_LIQUEFACTION_COST)} 法力`;
    byId("longevity-ability").hidden = !state.foundationUnlocked && !retainedAbilitiesVisible;
    byId("longevity-ability").classList.toggle("purchased", state.longevityLevel >= 2);
    byId("longevity-level").textContent = `当前：${state.longevityLevel}/2级；健身上限 +${state.longevityLevel * 10}；本能力健身倍率 ×${additiveLevelMultiplier(state.longevityLevel, 2).toFixed(2)}`;
    byId("longevity-cost").textContent = state.longevityLevel >= 2 ? "已达到等级上限" : `消耗 ${formatCost(nextLongevityCost)} 法力`;
    byId("buy-longevity").textContent = state.longevityLevel >= 2 ? "已达上限" : "升级";
    byId("buy-longevity").disabled = !state.foundationUnlocked || state.longevityLevel >= 2 || state.mana < nextLongevityCost;
    byId("foundation-spell-ability").classList.toggle("purchased", state.foundationSpellLevel >= 3);
    byId("foundation-spell-level").textContent = `当前：${state.foundationSpellLevel}/3级；本能力战力获取倍率 ×${foundationSpellPowerMultiplier().toFixed(2)}`;
    byId("foundation-spell-cost").textContent = state.foundationSpellLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextFoundationSpellCost)} 法力`;
    byId("buy-foundation-spell").textContent = state.foundationSpellLevel >= 3 ? "已达上限" : "升级";
    byId("buy-foundation-spell").disabled = !state.foundationUnlocked || state.foundationSpellLevel >= 3 || state.mana < nextFoundationSpellCost;
    byId("golden-core-abilities").hidden = !state.goldenCoreUnlocked && !retainedAbilitiesVisible;
    const nascentSoulRequirement = advancedRealmCost(0);
    const nascentSoulUnlocked = state.advancedRealmLevel >= 1;
    byId("golden-core-bottleneck-preview").textContent = !state.goldenCoreUnlocked
      ? "等待重新结丹，当前不生效"
      : nascentSoulUnlocked
        ? "已失效，法力获取倍率 ×1.00"
        : `当前法力获取倍率 ×${bottleneckManaMultiplier(nascentSoulRequirement, true).toFixed(2)}`;
    byId("golden-core-bottleneck-state").textContent = !state.goldenCoreUnlocked ? "等待结丹" : nascentSoulUnlocked ? "已失效" : "已生效";
    byId("nascent-soul-bottleneck-point").textContent = `拐点：${format(nascentSoulRequirement, 0)} 法力`;
    ADVANCED_REALMS.slice(0, -1).forEach((realm, index) => {
      const nextRealm = ADVANCED_REALMS[index + 1];
      const currentRealmUnlocked = state.goldenCoreUnlocked && state.advancedRealmLevel > index;
      const nextRealmUnlocked = state.advancedRealmLevel > index + 1;
      const requirement = advancedRealmCost(index + 1);
      byId(`${realm.slug}-abilities`).hidden = !advancedRealmAbilityGroupVisible(index);
      byId(`${realm.slug}-bottleneck-preview`).textContent = !currentRealmUnlocked
        ? `等待重新${realm.name}，当前不生效`
        : nextRealmUnlocked
          ? "已失效，法力获取倍率 ×1.00"
          : `当前法力获取倍率 ×${bottleneckManaMultiplier(requirement, true).toFixed(2)}`;
      byId(`${realm.slug}-bottleneck-state`).textContent = !currentRealmUnlocked
        ? `等待${realm.name}`
        : nextRealmUnlocked ? "已失效" : "已生效";
      byId(`${nextRealm.slug}-bottleneck-point`).textContent = `拐点：${format(requirement, 0)} 法力`;
    });
    byId("flying-escape-preview").textContent = state.flyingEscapeUnlocked
      ? "当前普通探寻来源 ×10"
      : "解锁后：普通探寻来源 ×10";
    byId("longevity-800-ability").classList.toggle("purchased", state.longevity800Level >= 4);
    byId("longevity-800-level").textContent = `当前：${state.longevity800Level}/4级；健身上限 +${state.longevity800Level * 10}；本能力健身倍率 ×${additiveLevelMultiplier(state.longevity800Level, 8).toFixed(2)}`;
    byId("longevity-800-cost").textContent = state.longevity800Level >= 4 ? "已达到等级上限" : `消耗 ${formatCost(nextLongevity800Cost)} 法力`;
    byId("buy-longevity-800").textContent = state.longevity800Level >= 4 ? "已达上限" : "升级";
    byId("buy-longevity-800").disabled = state.advancedRealmLevel < 1 || state.longevity800Level >= 4 || state.mana < nextLongevity800Cost;
    const naturalTreasureCap = naturalTreasureLevelCap();
    byId("natural-treasure-ability").classList.toggle("purchased", state.naturalTreasureLevel >= naturalTreasureCap);
    byId("natural-treasure-level").textContent = `当前：${state.naturalTreasureLevel}/${naturalTreasureCap}级；法力获取倍率 ×${naturalTreasureManaMultiplier().toFixed(3)}`;
    byId("natural-treasure-chance").textContent = state.naturalTreasureLevel >= naturalTreasureCap
      ? "已达到等级上限"
      : `每 1 有效探寻量升级概率 ${formatProbability(naturalTreasureUpgradeChance())}`;
    byId("natural-treasure-state").textContent = !state.goldenCoreUnlocked
      ? "等待重新结丹"
      : state.naturalTreasureLevel >= naturalTreasureCap ? "已达上限" : "仅可通过探寻升级";
    byId("golden-core-longevity-ability").classList.toggle("purchased", state.goldenCoreLongevityLevel >= 2);
    byId("golden-core-longevity-level").textContent = `当前：${state.goldenCoreLongevityLevel}/2级；健身上限 +${state.goldenCoreLongevityLevel * 10}；本能力健身倍率 ×${additiveLevelMultiplier(state.goldenCoreLongevityLevel, 4).toFixed(2)}`;
    byId("golden-core-longevity-cost").textContent = state.goldenCoreLongevityLevel >= 2 ? "已达到等级上限" : `消耗 ${formatCost(nextGoldenCoreLongevityCost)} 法力`;
    byId("buy-golden-core-longevity").textContent = state.goldenCoreLongevityLevel >= 2 ? "已达上限" : "升级";
    byId("buy-golden-core-longevity").disabled = !state.goldenCoreUnlocked || state.goldenCoreLongevityLevel >= 2 || state.mana < nextGoldenCoreLongevityCost;
    byId("mana-solidification-preview").textContent = state.manaSolidificationUnlocked
      ? "当前：法力 ×0.90；战力 ×1.15；吐纳 J 曲线指数 +0.4（灵气充沛时再 +0.6）"
      : "解锁后：法力 ×0.90；战力 ×1.15；吐纳 J 曲线指数 +0.4（灵气充沛时再 +0.6）";
    byId("mana-solidification-cost").textContent = `消耗 ${formatCost(MANA_SOLIDIFICATION_COST)} 法力`;
    byId("minor-technique-preview").textContent = state.minorTechniqueUnlocked
      ? `已提供 +2个百分点；当前周天比例 ${(circulationPercent() * 100).toFixed(1)}%`
      : "解锁后：周天比例 6% → 8%";
    byId("magic-treasure-preview").textContent = `${state.magicTreasureUnlocked ? "当前：" : "解锁后："}基础来源 +${format(magicTreasurePotentialPowerBonus())} 战力/秒（御物 ×${materialControlMultiplier().toFixed(0)}）；当前实际：+${format(state.magicTreasureUnlocked ? finalPowerGainFromSources([magicTreasurePowerSource()]) : finalPowerGainFromSources([calculateSourceGain({ base: magicTreasurePotentialPowerBonus() })]))} 战力/秒`;
    byId("material-control-preview").textContent = `${state.materialControlUnlocked ? "当前：" : "解锁后："}法宝来源倍率 ×5.00`;
    byId("divine-sense-preview").textContent = `${state.divineSenseUnlocked ? "当前：" : "解锁后："}有效探寻量 ×1.25`;
    const greatCultivatorPreviewMultiplier = state.greatCultivatorUnlocked
      ? greatCultivatorJMultiplier()
      : additiveLevelMultiplier(cultivationRealmLevel(), 1.5);
    byId("great-cultivator-preview").textContent = `${state.greatCultivatorUnlocked ? "当前：" : "解锁后："}J 获取倍率 ×${greatCultivatorPreviewMultiplier.toFixed(2)}（${cultivationRealmLevel()}个境界，内部加算）`;
    byId("second-nascent-soul-preview").textContent = state.secondNascentSoulUnlocked
      ? `当前周天最终比例 ${(circulationPercent() * 100).toFixed(1)}%（基础合计 ×1.8）`
      : "解锁后：周天最终比例 ×1.8";
    byId("spirit-transformation-abilities").hidden = !advancedRealmAbilityGroupVisible(1);
    byId("spirit-world-ascension-preview").textContent = `${state.spiritWorldAscensionUnlocked ? "当前：" : "解锁后："}探寻法力 ×10；天材地宝上限 ${naturalTreasureCap}`;
    byId("aura-control-preview").textContent = `${state.auraControlUnlocked ? "当前：" : "解锁后："}吐纳法力获取倍率 ×${auraControlPotentialMultiplier().toFixed(2)}`;
    byId("equal-heaven-longevity-preview").textContent = `${state.equalHeavenLongevityUnlocked ? "当前：" : "解锁后："}健身 ×8；等级上限 +10`;
    byId("five-elements-preview").textContent = state.fiveElementsUnlocked
      ? `当前周天比例 ${(circulationPercent() * 100).toFixed(1)}%`
      : "解锁后：周天比例 +5个百分点";
    const abundantAuraPotentialExponent = breathingJCurveExponent() + (state.abundantAuraUnlocked
      ? 0
      : 0.8 + (state.manaLiquefactionUnlocked ? 0.4 : 0) + (state.manaSolidificationUnlocked ? 0.6 : 0));
    byId("abundant-aura-preview").textContent = `${state.abundantAuraUnlocked ? "当前：" : "解锁后："}吐纳 J 曲线指数 ${abundantAuraPotentialExponent.toFixed(1)}`;
    const currentTribulationManaExponent = minorTribulationExplorationManaExponent();
    byId("minor-tribulation-preview").textContent = `小天劫负荷 ${format(state.minorTribulationExplorationLoad)}/${format(minorTribulationTriggerLoad())}；下次探寻约 +${format(currentExplorationAmount)}`;
    byId("minor-tribulation-recovery").textContent = state.minorTribulationRecoveryRemaining > 0
      ? `战力 ^${minorTribulationPowerExponent().toFixed(3)}；探寻法力 ^${currentTribulationManaExponent.toFixed(3)}（初始 ^${state.minorTribulationInitialManaExponent.toFixed(3)}，负荷强度 ${format(state.minorTribulationLastLoadFactor)}；剩余 ${state.minorTribulationRecoveryRemaining.toFixed(1)} 秒）`
      : state.minorTribulationTriggered
        ? `战力 ^${minorTribulationPowerExponent().toFixed(3)}；探寻法力 ^${currentTribulationManaExponent.toFixed(3)}（已恢复；上次负荷强度 ${format(state.minorTribulationLastLoadFactor)}）`
        : `战力 ^${minorTribulationPowerExponent().toFixed(3)}；探寻法力 ^${currentTribulationManaExponent.toFixed(3)}（常驻基础指数，尚未触发）`;
    byId("enhanced-minor-tribulation-preview").textContent = state.advancedRealmLevel >= 3
      ? `当前：战力区域 ^${minorTribulationPowerExponent().toFixed(3)}；探寻法力指数 ${currentTribulationManaExponent.toFixed(3)}，区间 0.750～0.920`
      : "等待炼虚";
    const brahmaDemonArtSource = state.brahmaDemonArtUnlocked ? brahmaDemonArtPowerSource(fitnessJBonus()) : fitnessJBonus() * 3;
    byId("brahma-demon-art-preview").textContent = `${state.brahmaDemonArtUnlocked ? "当前：" : "解锁后："}基础来源 +${format(brahmaDemonArtSource)} 战力/秒；当前实际：+${format(finalPowerGainFromSources([brahmaDemonArtSource]))} 战力/秒`;
    const nextTrueSpiritTransformationCost = trueSpiritTransformationCost();
    byId("true-spirit-transformation-preview").textContent = `当前：${state.trueSpiritTransformationLevel}/5级；法力获取倍率 ×${trueSpiritTransformationMultiplier().toFixed(2)}`;
    byId("true-spirit-transformation-cost").textContent = state.trueSpiritTransformationLevel >= 5
      ? "已达到等级上限"
      : `消耗 ${formatCost(nextTrueSpiritTransformationCost)} 法力`;
    byId("silver-tadpole-script-preview").textContent = state.silverTadpoleScriptUnlocked
      ? `当前小天劫门槛 ${format(minorTribulationTriggerLoad())}；探寻法力 ^${silverTadpoleScriptExplorationExponent().toFixed(2)}`
      : "解锁后：小天劫门槛 150 → 1500；探寻法力 ^1.06";
    byId("void-refining-to-qi-preview").textContent = `${state.voidRefiningToQiUnlocked ? "当前：" : "解锁后："}吐纳来源 ^1.06`;
    byId("immortal-realm-divine-preview").textContent = `${state.immortalRealmDivineAbilityUnlocked ? "当前：" : "解锁后："}吐纳法力获取倍率 ×${immortalRealmDivineAbilityPotentialMultiplier().toFixed(2)}`;
    byId("spirit-refining-art-preview").textContent = `${state.spiritRefiningArtUnlocked ? "当前：" : "解锁后："}法力 J 来源 ^1.06`;
    byId("perfected-technique-preview").textContent = `${state.perfectedTechniqueUnlocked ? "当前：" : "解锁后："}周天比例 ×1.5`;
    byId("heaven-earth-aura-preview").textContent = `${state.heavenEarthAuraUnlocked ? "当前：" : "解锁后："}吐纳 J 曲线指数 ${breathingJCurveExponent().toFixed(2)}`;
    byId("divine-ability-mastery-preview").textContent = `${state.divineAbilityMasteryUnlocked ? "当前：" : "解锁后："}全部法力 ×2.5`;
    byId("aura-into-body-preview").textContent = `${state.auraIntoBodyUnlocked ? "当前：" : "解锁后："}健身 J ×20；健身上限 +40`;
    byId("external-incarnation-preview").textContent = `${state.externalIncarnationUnlocked ? "当前：" : "解锁后："}梵圣真魔功 ×5`;
    byId("demon-realm-journey-preview").textContent = `${state.demonRealmJourneyUnlocked ? "当前：" : "解锁后："}普通探寻 ×5；仙道宝物概率 ×3`;
    byId("return-to-origin-preview").textContent = `${state.returnToOriginUnlocked ? "当前：" : "解锁后："}J 区域 ^1.02`;
    byId("heavenly-treasure-ability").classList.toggle("purchased", state.heavenlyTreasureLevel >= 3);
    byId("heavenly-treasure-level").textContent = `当前：${state.heavenlyTreasureLevel}/3级；已解锁：${["无", "仙道·虚天鼎", "仙道·虚天鼎、仙道·八灵尺", "仙道·虚天鼎、仙道·八灵尺、仙道·万妖幡"][state.heavenlyTreasureLevel]}`;
    byId("heavenly-treasure-cost").textContent = state.heavenlyTreasureLevel >= 3 ? "已达到等级上限" : `消耗 ${formatCost(nextHeavenlyTreasureCost)} 法力`;
    byId("buy-heavenly-treasure").textContent = state.heavenlyTreasureLevel >= 3 ? "已达上限" : "升级";
    byId("buy-heavenly-treasure").disabled = state.heavenlyTreasureLevel >= 3 || state.mana < nextHeavenlyTreasureCost;
    const currentScatterEffectLevel = effectiveScatterRebuildLevel();
    byId("scatter-rebuild-ability").classList.toggle("purchased", currentScatterEffectLevel >= 3);
    byId("scatter-rebuild-level").textContent = `当前：散功效果 ${currentScatterEffectLevel}/3级；强化保留 ${state.scatterRetentionLevel}/3级`;
    const nextScatterLevel = currentScatterEffectLevel + 1;
    byId("scatter-rebuild-description").textContent = currentScatterEffectLevel >= 3
      ? `散功效果已达上限；当前强化保留至${SCATTER_RETAINED_UPGRADE_TIERS[state.scatterRetentionLevel] ?? "无"}。转世自带的散功效果不会提供强化保留。`
      : `第${nextScatterLevel}次将保留${SCATTER_RETAINED_UPGRADE_TIERS[nextScatterLevel]}强化；更高量级强化、资源、量级与境界重置，仙道能力继续保留。`;
    byId("scatter-rebuild-preview").textContent = `结丹需求 ×${format(additiveLevelMultiplier(currentScatterEffectLevel, 2), 0)}；元婴需求 ×${Math.max(0.1, 1 - 0.2 * currentScatterEffectLevel).toFixed(2)}；吐纳法力 ×${scatterRebuildManaMultiplier().toFixed(2)}`;
    byId("scatter-rebuild").textContent = currentScatterEffectLevel >= 3 ? "已达上限" : "散功重修";
    byId("scatter-rebuild").disabled = !state.goldenCoreUnlocked || currentScatterEffectLevel >= 3;
    const nextReincarnationLevel = state.reincarnationLevel + 1;
    const nextReincarnationRoot = REINCARNATION_ROOTS[nextReincarnationLevel];
    byId("reincarnation-ability").classList.toggle("purchased", state.reincarnationLevel >= 3);
    byId("reincarnation-description").textContent = state.reincarnationLevel >= 3
      ? "本轮三次转世均已完成；挑战会把本轮转世与散功次数重置为0，但不会降低永久灵根。"
      : "提升永久灵根并重置本轮进度；挑战完成次数保留。挑战会重置本轮转世与散功次数，但不会降低灵根。";
    byId("reincarnation-level").textContent = `当前：永久灵根 ${state.permanentRootLevel}/3级（${activeRootName()}）；本轮转世 ${state.reincarnationLevel}/3次；法力 J 来源 ^${reincarnationManaJExponent().toFixed(2)}`;
    const nextPermanentRootLevel = Math.max(state.permanentRootLevel, nextReincarnationLevel);
    const nextPermanentRoot = REINCARNATION_ROOTS[nextPermanentRootLevel];
    byId("reincarnation-preview").textContent = nextReincarnationRoot
      ? `下一次：${nextPermanentRootLevel > state.permanentRootLevel ? `获得${nextPermanentRoot.name}` : `保持${nextPermanentRoot.name}`}；转世效果升至${nextReincarnationLevel}级，重返元婴后法力 J 来源 ^${[1, 1.05, 1.1, 1.15][nextReincarnationLevel].toFixed(2)}`
      : "本轮转世已达上限；开启挑战后可重新进行转世，永久灵根不会降低";
    byId("reincarnate").textContent = state.reincarnationLevel >= 3 ? "已达上限" : "转世重修";
    byId("reincarnate").disabled = state.advancedRealmLevel < 1 || state.reincarnationLevel >= 3;
    byId("tian-ni-pearl-treasure").hidden = !hasAchievement("daoFoundation");
    byId("tian-ni-pearl-count").textContent = `数量：${format(pearlCount, 0)}`;
    byId("tian-ni-pearl-chance").textContent = `单次判定概率 ${formatProbability(tianNiPearlChance())}`;
    byId("tian-ni-pearl-effect").textContent = `法力获取倍率 ×${tianNiPearlManaMultiplier().toFixed(2)}`;
    byId("mysterious-green-bottle-treasure").hidden = !hasAchievement("goldenCore");
    byId("mysterious-green-bottle-count").textContent = `数量：${format(greenBottleCount, 0)}`;
    byId("mysterious-green-bottle-chance").textContent = `每 1 有效探寻量概率 ${formatProbability(mysteriousGreenBottleChance())}`;
    byId("mysterious-green-bottle-effect").textContent = `探寻法力获取倍率 ×${mysteriousGreenBottleMultiplier().toFixed(2)}`;
    byId("fu-bao-treasure").hidden = !hasAchievement("trueScale3");
    byId("fu-bao-count").textContent = `数量：${format(currentFuBaoCount, 0)}`;
    byId("fu-bao-chance").textContent = `每 1 有效探寻量概率 ${formatProbability(fuBaoChance())}`;
    byId("fu-bao-effect").textContent = `额外法力为探寻基础法力的 ${(fuBaoManaRatio() * 100).toFixed(2)}%`;
    byId("fitness-membership-card-treasure").hidden = !hasAchievement("scale5");
    byId("fitness-membership-card-count").textContent = `数量：${format(membershipCardCount, 0)}`;
    byId("fitness-membership-card-chance").textContent = `当前每秒概率 ${formatProbability(fitnessMembershipCardChance())}`;
    byId("fitness-membership-card-effect").textContent = `健身倍率加法 +${fitnessMembershipCardFitnessBonus().toFixed(3)}`;
    byId("xu-tian-ding-treasure").hidden = state.heavenlyTreasureLevel < 1 && currentXuTianDingCount <= 0;
    byId("xu-tian-ding-count").textContent = `数量：${format(currentXuTianDingCount, 0)}`;
    byId("xu-tian-ding-chance").textContent = `每 1 有效探寻量概率 ${formatProbability(xuTianDingChance())}`;
    byId("xu-tian-ding-effect").textContent = `天材地宝倍率 ×${xuTianDingMultiplier().toFixed(3)}`;
    byId("ba-ling-chi-treasure").hidden = state.heavenlyTreasureLevel < 2 && currentBaLingChiCount <= 0;
    byId("ba-ling-chi-count").textContent = `数量：${format(currentBaLingChiCount, 0)}`;
    byId("ba-ling-chi-chance").textContent = `吐纳/周天判定概率 ${formatProbability(baLingChiChance())}`;
    byId("ba-ling-chi-effect").textContent = `健身倍率 ×${baLingChiFitnessMultiplier().toFixed(3)}`;
    byId("wan-yao-fan-treasure").hidden = state.heavenlyTreasureLevel < 3 && currentWanYaoFanCount <= 0;
    byId("wan-yao-fan-count").textContent = `数量：${format(currentWanYaoFanCount, 0)}`;
    byId("wan-yao-fan-chance").textContent = `每 1 有效探寻量概率 ${formatProbability(wanYaoFanChance())}`;
    byId("wan-yao-fan-effect").textContent = `法宝来源倍率 ×${wanYaoFanMultiplier().toFixed(3)}`;
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
    updateOneTimeUpgrade("hyper-regeneration-upgrade", "buy-hyper-regeneration", state.hyperRegenerationPurchased, state.highestScaleIndex >= 6 && state.regenerationPurchased && state.power >= HYPER_REGENERATION_COST);
    updateOneTimeUpgrade("superpower-evolution-upgrade", "buy-superpower-evolution", state.superpowerEvolutionPurchased, state.highestScaleIndex >= 6 && state.superpowerPurchased && state.power >= SUPERPOWER_EVOLUTION_COST);
    updateOneTimeUpgrade("earth-split-upgrade", "buy-earth-split", state.earthSplitPurchased, state.highestScaleIndex >= 6 && state.mountainCollapsePurchased && state.power >= EARTH_SPLIT_COST);
    updateOneTimeUpgrade("mental-domain-upgrade", "buy-mental-domain", state.mentalDomainPurchased, state.highestScaleIndex >= 6 && state.ghostBrainPurchased && state.power >= MENTAL_DOMAIN_COST);
    updateOneTimeUpgrade("godspeed-upgrade", "buy-godspeed", state.godspeedPurchased, state.highestScaleIndex >= 6 && state.sonicMovementPurchased && state.power >= GODSPEED_COST);
    updateOneTimeUpgrade("subtle-upgrade", "buy-subtle", state.subtlePurchased, state.highestScaleIndex >= 6 && state.focusPurchased && state.power >= SUBTLE_COST);
    updateOneTimeUpgrade("sky-split-upgrade", "buy-sky-split", state.skySplitPurchased, state.highestScaleIndex >= 6 && state.mentalDomainPurchased && state.power >= SKY_SPLIT_COST);
    updateOneTimeUpgrade("biological-quantification-upgrade", "buy-biological-quantification", state.biologicalQuantificationPurchased, state.highestScaleIndex >= 7 && state.power >= BIOLOGICAL_QUANTIFICATION_COST);
    updateOneTimeUpgrade("destroy-country-upgrade", "buy-destroy-country", state.destroyCountryPurchased, state.highestScaleIndex >= 7 && state.power >= DESTROY_COUNTRY_COST);
    updateOneTimeUpgrade("killing-intent-substance-upgrade", "buy-killing-intent-substance", state.killingIntentSubstancePurchased, state.highestScaleIndex >= 7 && state.power >= KILLING_INTENT_SUBSTANCE_COST);
    updateOneTimeUpgrade("energy-cycle-upgrade", "buy-energy-cycle", state.energyCyclePurchased, state.highestScaleIndex >= 7 && state.power >= ENERGY_CYCLE_COST);
    updateOneTimeUpgrade("mountain-shatter-upgrade", "buy-mountain-shatter", state.mountainShatterPurchased, state.highestScaleIndex >= 7 && state.power >= MOUNTAIN_SHATTER_COST);
    updateOneTimeUpgrade("bioenergy-upgrade", "buy-bioenergy", state.bioenergyPurchased, state.highestScaleIndex >= 7 && state.power >= BIOENERGY_COST);
    updateOneTimeUnlock("qi-refining-stage", "unlock-qi-refining", state.qiRefiningUnlocked, immortalSelected && state.power >= QI_REFINING_COST);
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
    updateOneTimeUnlock("second-nascent-soul-ability", "unlock-second-nascent-soul", state.secondNascentSoulUnlocked, state.advancedRealmLevel >= 1 && state.mana >= SECOND_NASCENT_SOUL_COST);
    updateOneTimeUnlock("spirit-world-ascension-ability", "unlock-spirit-world-ascension", state.spiritWorldAscensionUnlocked, state.advancedRealmLevel >= 2 && state.mana >= SPIRIT_WORLD_ASCENSION_COST);
    updateOneTimeUnlock("aura-control-ability", "unlock-aura-control", state.auraControlUnlocked, state.advancedRealmLevel >= 2 && state.mana >= AURA_CONTROL_COST);
    updateOneTimeUnlock("equal-heaven-longevity-ability", "unlock-equal-heaven-longevity", state.equalHeavenLongevityUnlocked, state.advancedRealmLevel >= 2 && state.mana >= EQUAL_HEAVEN_LONGEVITY_COST);
    updateOneTimeUnlock("five-elements-ability", "unlock-five-elements", state.fiveElementsUnlocked, state.advancedRealmLevel >= 2 && state.mana >= FIVE_ELEMENTS_COST);
    updateOneTimeUnlock("abundant-aura-ability", "unlock-abundant-aura", state.abundantAuraUnlocked, state.advancedRealmLevel >= 2 && state.mana >= ABUNDANT_AURA_COST);
    updateOneTimeUnlock("brahma-demon-art-ability", "unlock-brahma-demon-art", state.brahmaDemonArtUnlocked, state.advancedRealmLevel >= 3 && state.mana >= BRAHMA_DEMON_ART_COST);
    const trueSpiritTransformationMaxed = state.trueSpiritTransformationLevel >= 5;
    const trueSpiritTransformationRow = byId("true-spirit-transformation-ability");
    const trueSpiritTransformationButton = byId("unlock-true-spirit-transformation");
    trueSpiritTransformationRow.classList.toggle("purchased", trueSpiritTransformationMaxed);
    trueSpiritTransformationRow.dataset.sortCost = String(trueSpiritTransformationMaxed
      ? Number.MAX_SAFE_INTEGER
      : nextTrueSpiritTransformationCost);
    trueSpiritTransformationButton.textContent = trueSpiritTransformationMaxed ? "已达上限" : "升级";
    trueSpiritTransformationButton.disabled = trueSpiritTransformationMaxed ||
      state.advancedRealmLevel < 3 || state.mana < nextTrueSpiritTransformationCost;
    updateOneTimeUnlock("silver-tadpole-script-ability", "unlock-silver-tadpole-script", state.silverTadpoleScriptUnlocked, state.advancedRealmLevel >= 3 && state.mana >= SILVER_TADPOLE_SCRIPT_COST);
    updateOneTimeUnlock("void-refining-to-qi-ability", "unlock-void-refining-to-qi", state.voidRefiningToQiUnlocked, state.advancedRealmLevel >= 3 && state.mana >= VOID_REFINING_TO_QI_COST);
    updateOneTimeUnlock("immortal-realm-divine-ability", "unlock-immortal-realm-divine", state.immortalRealmDivineAbilityUnlocked, state.advancedRealmLevel >= 3 && state.mana >= IMMORTAL_REALM_DIVINE_ABILITY_COST);
    updateOneTimeUnlock("spirit-refining-art-ability", "unlock-spirit-refining-art", state.spiritRefiningArtUnlocked, state.advancedRealmLevel >= 3 && state.mana >= SPIRIT_REFINING_ART_COST);
    updateOneTimeUnlock("perfected-technique-ability", "unlock-perfected-technique", state.perfectedTechniqueUnlocked, state.advancedRealmLevel >= 4 && state.mana >= PERFECTED_TECHNIQUE_COST);
    updateOneTimeUnlock("heaven-earth-aura-ability", "unlock-heaven-earth-aura", state.heavenEarthAuraUnlocked, state.advancedRealmLevel >= 4 && state.mana >= HEAVEN_EARTH_AURA_COST);
    updateOneTimeUnlock("divine-ability-mastery-ability", "unlock-divine-ability-mastery", state.divineAbilityMasteryUnlocked, state.advancedRealmLevel >= 4 && state.mana >= DIVINE_ABILITY_MASTERY_COST);
    updateOneTimeUnlock("aura-into-body-ability", "unlock-aura-into-body", state.auraIntoBodyUnlocked, state.advancedRealmLevel >= 4 && state.mana >= AURA_INTO_BODY_COST);
    updateOneTimeUnlock("external-incarnation-ability", "unlock-external-incarnation", state.externalIncarnationUnlocked, state.advancedRealmLevel >= 4 && state.mana >= EXTERNAL_INCARNATION_COST);
    updateOneTimeUnlock("demon-realm-journey-ability", "unlock-demon-realm-journey", state.demonRealmJourneyUnlocked, state.advancedRealmLevel >= 4 && state.mana >= DEMON_REALM_JOURNEY_COST);
    updateOneTimeUnlock("return-to-origin-ability", "unlock-return-to-origin", state.returnToOriginUnlocked, state.advancedRealmLevel >= 4 && state.mana >= RETURN_TO_ORIGIN_COST);
    sortCostGroups();
    renderAchievements();
  }

  function bindHoldButton(id, action, { repeatAction = action, canRepeat = () => true } = {}) {
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
        if (button.disabled || !canRepeat()) return;
        repeatTimer = window.setInterval(() => {
          if (button.disabled || !canRepeat()) {
            stopRepeat();
            return;
          }
          repeatAction();
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

  function bindManualScaleUpgrade(id, key, action) {
    bindHoldButton(id, () => recordManualProgress(manualScaleUpgradeHistory, key, action));
  }

  function bindManualImmortalAbility(id, key, action) {
    bindHoldButton(id, () => recordManualProgress(manualImmortalAbilityHistory, key, action));
  }

  function bindManualRealmBreakthrough(id, action) {
    bindHoldButton(id, () => recordManualRealmBreakthrough(action));
  }

  // 炼虚及后续境界能力由 JS 动态生成，必须先创建节点再绑定按钮事件。

    function bindEvents() {
    ensureAdvancedRealmAbilityGroups();

    document.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", () => switchPage(button.dataset.page));
    });
    bindHoldButton("train-button", () => train(true), {
      repeatAction: () => train(false),
      canRepeat: () => hasAchievement("lightningFiveWhip")
    });
    bindHoldButton("buy-running", buyRunning);
    bindManualScaleUpgrade("buy-exercise", "exercisePurchased", buyExercise);
    bindManualScaleUpgrade("buy-gym", "gymPurchased", buyGym);
    bindManualScaleUpgrade("buy-transcendent", "transcendentPurchased", buyTranscendent);
    bindManualScaleUpgrade("buy-focus", "focusPurchased", buyFocus);
    bindManualScaleUpgrade("buy-breathing-method", "breathingMethodPurchased", buyBreathingMethod);
    bindManualScaleUpgrade("buy-extreme-exercise", "extremeExercisePurchased", buyExtremeExercise);
    bindHoldButton("buy-rock", buyRock);
    bindManualScaleUpgrade("buy-water", "waterPurchased", buyWater);
    bindManualScaleUpgrade("buy-ghost-brain", "ghostBrainPurchased", buyGhostBrain);
    bindManualScaleUpgrade("buy-natural-strength", "naturalStrengthPurchased", buyNaturalStrength);
    bindManualScaleUpgrade("buy-mental-power", "mentalPowerPurchased", buyMentalPower);
    bindManualScaleUpgrade("buy-life-power", "lifePowerPurchased", buyLifePower);
    bindManualScaleUpgrade("buy-my-style", "myStylePurchased", buyMyStyle);
    bindManualScaleUpgrade("buy-intuition", "intuitionPurchased", buyIntuition);
    bindManualScaleUpgrade("buy-sonic-movement", "sonicMovementPurchased", buySonicMovement);
    bindManualScaleUpgrade("buy-carbon-limit", "carbonLimitPurchased", buyCarbonLimit);
    bindManualScaleUpgrade("buy-killing-intent", "killingIntentPurchased", buyKillingIntent);
    bindManualScaleUpgrade("buy-rock-strike", "rockStrikePurchased", buyRockStrike);
    bindManualScaleUpgrade("buy-high-speed-metabolism", "highSpeedMetabolismPurchased", buyHighSpeedMetabolism);
    bindManualScaleUpgrade("buy-endurance-enhancement", "enduranceEnhancementPurchased", buyEnduranceEnhancement);
    bindManualScaleUpgrade("buy-bullet-time", "bulletTimePurchased", buyBulletTime);
    bindManualScaleUpgrade("buy-dynamic-focus", "dynamicFocusPurchased", buyDynamicFocus);
    bindManualScaleUpgrade("buy-super-perception", "superPerceptionPurchased", buySuperPerception);
    bindManualScaleUpgrade("buy-invulnerable", "invulnerablePurchased", buyInvulnerable);
    bindManualScaleUpgrade("buy-regeneration", "regenerationPurchased", buyRegeneration);
    bindManualScaleUpgrade("buy-superpower", "superpowerPurchased", buySuperpower);
    bindManualScaleUpgrade("buy-super-speed-thinking", "superSpeedThinkingPurchased", buySuperSpeedThinking);
    bindManualScaleUpgrade("buy-mountain-collapse", "mountainCollapsePurchased", buyMountainCollapse);
    bindManualScaleUpgrade("buy-mind-division", "mindDivisionLevel", buyMindDivision);
    bindManualScaleUpgrade("buy-hyper-regeneration", "hyperRegenerationPurchased", () => WIS.Power.Scale.buyUpgrade("hyperRegeneration"));
    bindManualScaleUpgrade("buy-superpower-evolution", "superpowerEvolutionPurchased", () => WIS.Power.Scale.buyUpgrade("superpowerEvolution"));
    bindManualScaleUpgrade("buy-earth-split", "earthSplitPurchased", () => WIS.Power.Scale.buyUpgrade("earthSplit"));
    bindManualScaleUpgrade("buy-mental-domain", "mentalDomainPurchased", () => WIS.Power.Scale.buyUpgrade("mentalDomain"));
    bindManualScaleUpgrade("buy-godspeed", "godspeedPurchased", () => WIS.Power.Scale.buyUpgrade("godspeed"));
    bindManualScaleUpgrade("buy-subtle", "subtlePurchased", () => WIS.Power.Scale.buyUpgrade("subtle"));
    bindManualScaleUpgrade("buy-sky-split", "skySplitPurchased", () => WIS.Power.Scale.buyUpgrade("skySplit"));
    bindManualScaleUpgrade("buy-biological-quantification", "biologicalQuantificationPurchased", () => WIS.Power.Scale.buyUpgrade("biologicalQuantification"));
    bindManualScaleUpgrade("buy-destroy-country", "destroyCountryPurchased", () => WIS.Power.Scale.buyUpgrade("destroyCountry"));
    bindManualScaleUpgrade("buy-killing-intent-substance", "killingIntentSubstancePurchased", () => WIS.Power.Scale.buyUpgrade("killingIntentSubstance"));
    bindManualScaleUpgrade("buy-energy-cycle", "energyCyclePurchased", () => WIS.Power.Scale.buyUpgrade("energyCycle"));
    bindManualScaleUpgrade("buy-mountain-shatter", "mountainShatterPurchased", () => WIS.Power.Scale.buyUpgrade("mountainShatter"));
    bindManualScaleUpgrade("buy-bioenergy", "bioenergyPurchased", () => WIS.Power.Scale.buyUpgrade("bioenergy"));
    byId("toggle-ghost-back").addEventListener("click", toggleGhostBack);
    bindManualRealmBreakthrough("unlock-qi-refining", unlockQiRefining);
    bindHoldButton("breathing-button", breathe);
    bindHoldButton("exploration-button", explore);
    bindManualImmortalAbility("unlock-immortal-life", "immortalLifeUnlocked", unlockImmortalLife);
    bindManualImmortalAbility("buy-qi-spell", "qiSpellLevel", buyQiSpell);
    bindManualRealmBreakthrough("unlock-foundation", unlockFoundation);
    bindManualRealmBreakthrough("unlock-golden-core", unlockGoldenCore);
    ADVANCED_REALMS.forEach((realm, index) => {
      bindManualRealmBreakthrough(`unlock-${realm.slug}`, () => unlockAdvancedRealm(index));
    });
    bindManualImmortalAbility("unlock-circulation", "circulationUnlocked", unlockCirculation);
    bindManualImmortalAbility("unlock-mana-liquefaction", "manaLiquefactionUnlocked", unlockManaLiquefaction);
    bindManualImmortalAbility("unlock-technique", "techniqueUnlocked", unlockTechnique);
    bindManualImmortalAbility("buy-foundation-spell", "foundationSpellLevel", buyFoundationSpell);
    bindManualImmortalAbility("buy-longevity", "longevityLevel", buyLongevity);
    bindManualImmortalAbility("buy-golden-core-longevity", "goldenCoreLongevityLevel", buyGoldenCoreLongevity);
    bindManualImmortalAbility("unlock-mana-solidification", "manaSolidificationUnlocked", unlockManaSolidification);
    bindManualImmortalAbility("unlock-minor-technique", "minorTechniqueUnlocked", unlockMinorTechnique);
    bindManualImmortalAbility("unlock-magic-treasure", "magicTreasureUnlocked", unlockMagicTreasure);
    bindManualImmortalAbility("unlock-material-control", "materialControlUnlocked", unlockMaterialControl);
    bindManualImmortalAbility("unlock-flying-escape", "flyingEscapeUnlocked", unlockFlyingEscape);
    bindManualImmortalAbility("buy-longevity-800", "longevity800Level", buyLongevity800);
    bindManualImmortalAbility("unlock-divine-sense", "divineSenseUnlocked", unlockDivineSense);
    bindManualImmortalAbility("unlock-great-cultivator", "greatCultivatorUnlocked", unlockGreatCultivator);
    bindManualImmortalAbility("unlock-second-nascent-soul", "secondNascentSoulUnlocked", unlockSecondNascentSoul);
    bindManualImmortalAbility("unlock-spirit-world-ascension", "spiritWorldAscensionUnlocked", () => unlockManaAbility("spiritWorldAscensionUnlocked", SPIRIT_WORLD_ASCENSION_COST));
    bindManualImmortalAbility("unlock-aura-control", "auraControlUnlocked", () => unlockManaAbility("auraControlUnlocked", AURA_CONTROL_COST));
    bindManualImmortalAbility("unlock-equal-heaven-longevity", "equalHeavenLongevityUnlocked", () => unlockManaAbility("equalHeavenLongevityUnlocked", EQUAL_HEAVEN_LONGEVITY_COST));
    bindManualImmortalAbility("unlock-five-elements", "fiveElementsUnlocked", () => unlockManaAbility("fiveElementsUnlocked", FIVE_ELEMENTS_COST));
    bindManualImmortalAbility("unlock-abundant-aura", "abundantAuraUnlocked", () => unlockManaAbility("abundantAuraUnlocked", ABUNDANT_AURA_COST));
    bindManualImmortalAbility("buy-heavenly-treasure", "heavenlyTreasureLevel", buyHeavenlyTreasure);
    bindManualImmortalAbility("unlock-brahma-demon-art", "brahmaDemonArtUnlocked", () => unlockVoidRefinementAbility("brahmaDemonArtUnlocked", BRAHMA_DEMON_ART_COST));
    bindManualImmortalAbility("unlock-true-spirit-transformation", "trueSpiritTransformationLevel", buyTrueSpiritTransformation);
    bindManualImmortalAbility("unlock-silver-tadpole-script", "silverTadpoleScriptUnlocked", () => unlockVoidRefinementAbility("silverTadpoleScriptUnlocked", SILVER_TADPOLE_SCRIPT_COST));
    bindManualImmortalAbility("unlock-void-refining-to-qi", "voidRefiningToQiUnlocked", () => unlockVoidRefinementAbility("voidRefiningToQiUnlocked", VOID_REFINING_TO_QI_COST));
    bindManualImmortalAbility("unlock-immortal-realm-divine", "immortalRealmDivineAbilityUnlocked", () => unlockVoidRefinementAbility("immortalRealmDivineAbilityUnlocked", IMMORTAL_REALM_DIVINE_ABILITY_COST));
    bindManualImmortalAbility("unlock-spirit-refining-art", "spiritRefiningArtUnlocked", () => unlockVoidRefinementAbility("spiritRefiningArtUnlocked", SPIRIT_REFINING_ART_COST));
    bindManualImmortalAbility("unlock-perfected-technique", "perfectedTechniqueUnlocked", () => WIS.Cultivation.Immortal.buyAbility("perfectedTechnique"));
    bindManualImmortalAbility("unlock-heaven-earth-aura", "heavenEarthAuraUnlocked", () => WIS.Cultivation.Immortal.buyAbility("heavenEarthAura"));
    bindManualImmortalAbility("unlock-divine-ability-mastery", "divineAbilityMasteryUnlocked", () => WIS.Cultivation.Immortal.buyAbility("divineAbilityMastery"));
    bindManualImmortalAbility("unlock-aura-into-body", "auraIntoBodyUnlocked", () => WIS.Cultivation.Immortal.buyAbility("auraIntoBody"));
    bindManualImmortalAbility("unlock-external-incarnation", "externalIncarnationUnlocked", () => WIS.Cultivation.Immortal.buyAbility("externalIncarnation"));
    bindManualImmortalAbility("unlock-demon-realm-journey", "demonRealmJourneyUnlocked", () => WIS.Cultivation.Immortal.buyAbility("demonRealmJourney"));
    bindManualImmortalAbility("unlock-return-to-origin", "returnToOriginUnlocked", () => WIS.Cultivation.Immortal.buyAbility("returnToOrigin"));
    byId("scatter-rebuild").addEventListener("click", scatterAndRebuild);
    byId("reincarnate").addEventListener("click", reincarnate);
    byId("toggle-innate-deficiency").addEventListener("click", () => {
      if (state.activeChallenge === "innateDeficiency") exitChallenge();
      else startChallenge("innateDeficiency");
    });
    byId("toggle-powerless").addEventListener("click", () => {
      if (state.activeChallenge === "powerless") exitChallenge();
      else startChallenge("powerless");
    });
    byId("toggle-longevity").addEventListener("click", () => {
      if (state.activeChallenge === "longevity") exitChallenge();
      else startChallenge("longevity");
    });
    byId("toggle-five-misfortunes").addEventListener("click", () => {
      if (state.activeChallenge === "fiveMisfortunes") exitChallenge();
      else startChallenge("fiveMisfortunes");
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

    }

    function resetCultivationPage() { activeCultivationPage = "realms"; }
    return Object.freeze({
      render, renderAchievements, renderChallenges, renderCultivationPage,
      ensureAchievementCards, applyTheme, switchPage, switchCultivationPage,
      showNotice, showAchievementNotice, showScaleNotice, bindEvents,
      resetCultivationPage
    });
  }

  WIS.UI.App = Object.freeze({ create });
}(window.WIS));
