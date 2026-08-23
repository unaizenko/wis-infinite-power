(function defineConfig(WIS) {
  "use strict";

  const costs = Object.freeze({
    power: Object.freeze({
      gym: 20, exercise: 50, transcendent: 500, focus: 150, breathingMethod: 750,
      extremeExercise: 1000, water: 20000, ghostBrain: 50000, naturalStrength: 10000,
      mentalPower: 100000, lifePower: 200000, myStyle: 2e7, intuition: 5e7,
      sonicMovement: 1e8, carbonLimit: 1.5e8, killingIntent: 3e8, rockStrike: 6e8,
      highSpeedMetabolism: 1.5e9, enduranceEnhancement: 4e9, bulletTime: 1e10,
      dynamicFocus: 2e10, superPerception: 5e10, invulnerable: 8e10,
      regeneration: 1.5e11, superpower: 3e11, superSpeedThinking: 5e11,
      mountainCollapse: 8e11, mindDivision: Object.freeze([5e15, 1.5e16, 5e16]),
      hyperRegeneration: 1e17, mentalDomain: 3e17, earthSplit: 8e17,
      godspeed: 1.2e18, superpowerEvolution: 2e18, subtle: 4e18, skySplit: 8e18,
      biologicalQuantification: 3e20, ghostManTransformation: 6e20, destroyCountry: 8e20,
      humanGhostTransformation: 1e21, killingIntentSubstance: 1.2e21,
      energyCycle: 1.5e21, mountainShatter: 2.5e21, bioenergy: 3e21,
      elementalization: 2e23, killingIntentPerception: 4e23, killingIntentWave: 8e23,
      ultimateIntent: 1.5e24, brainDomainDevelopment: 3e24, continentSplit: 5e24,
      continentCollapse: 8e24,
      waveEye: 5e25, elementalAwakening: 1.5e26, moonfall: 5e26,
      flowState: 2e27, selfhood: 8e27, freedom: 3e28,
      chicxulubMeteorite: 1e29,
      planetWill: 3e29, starSpirit: 1e30, starShatter: 3e30,
      spaceQuake: 1e31, selfless: 3e31, supernaturalFire: 1e32,
      fiveSpiritStone: 3e32, selfSuppression: 1e33,
      rockBase: 2000
    }),
    immortal: Object.freeze({
      qiRefining: 10000, foundation: 200, goldenCore: 8000, immortalLife: 80,
      circulation: 400, minorTechnique: 20000, flyingEscape: 1e8, materialControl: 5e7,
      divineSense: 2.5e8, greatCultivator: 5e8, secondNascentSoul: 1e9,
      spiritWorldAscension: 1e12, auraControl: 3e12, equalHeavenLongevity: 8e12,
      fiveElements: 1e13, abundantAura: 1e13, heavenlyTreasure: Object.freeze([5e12, 1.5e13, 5e13]),
      brahmaDemonArt: 1e14,
      trueSpiritTransformation: Object.freeze([5e13, 1e14, 2e14, 4e14, 8e14]),
      silverTadpoleScript: 5e14, voidRefiningToQi: 8e14,
      immortalRealmDivineAbility: 1.2e15, spiritRefiningArt: 2e15,
      longevity800: Object.freeze([1e8, 4e8, 1.6e9, 6.4e9]), manaLiquefaction: 800,
      qiSpell: Object.freeze([20, 40, 80]), foundationSpell: Object.freeze([300, 900, 2700]),
      longevity: Object.freeze([200, 600]), goldenCoreLongevity: Object.freeze([10000, 40000]),
      manaSolidification: 16000, technique: 1200, magicTreasure: 30000,
      perfectedTechnique: 1e16, heavenEarthAura: 3e16, divineAbilityMastery: 1e17,
      dualInfantUnity: 1.5e17, auraIntoBody: 2.5e17, externalIncarnation: 5e17,
      demonRealmJourney: 7.5e17, returnToOrigin: 1e18,
      natalMagicTreasure: 1e19, perfectedTechniqueCompletion: 2e19,
      roamSpiritWorld: 5e19, descendRealm: 8e19,
      mysticHeavenlyTreasure: Object.freeze([1e20, 2e20, 4e20]),
      nascentSoulCompletion: 1.5e20, spiritTravelVoid: 2.5e20,
      goldenSealScript: 5e20,
      immortalApertureCap: 36
    })
  });

  const realms = Object.freeze([
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
  ].map(Object.freeze));

  const scales = Object.freeze([
    ["普通人", 0], ["爆砖", 200], ["爆墙", 4184], ["爆屋", 8368000],
    ["爆楼", 418400000], ["爆街", 4.184e10], ["爆城", 3.033e15],
    ["爆国", 2.092e20], ["爆大陆", 8.368e22], ["地表", 3.2e25],
    ["爆星", 2.24e31], ["恒星", 2.28e40], ["星系", 3e52],
    ["超星系团", 2.565e57], ["宇宙结构", 3e68]
  ].map(([name, power]) => Object.freeze({ name, power })));

  const softcaps = Object.freeze([
    ["爆墙", 4184, 0.04, 0.012, 1, "炼气"], ["爆屋", 8368000, 0.055, 0.014, 2, "筑基"],
    ["爆楼", 418400000, 0.07, 0.016, 3, "结丹"], ["爆街", 4.184e10, 0.1, 0.02, 4, "元婴"],
    ["爆城", 3.033e15, 0.13, 0.024, 5, "化神"], ["爆国", 2.092e20, 0.16, 0.028, 7, "合体"],
    ["爆大陆", 8.368e22, 0.18, 0.032, 8, "大乘"], ["地表", 3.2e25, 0.2, 0.036, 9, "真仙"],
    ["爆星", 2.24e31, 0.22, 0.04, 12, "大罗"], ["恒星", 2.28e40, 0.24, 0.044, 13, "道祖"],
    ["星系", 3e52, 0.26, 0.048, null, null], ["超星系团", 2.565e57, 0.28, 0.052, null, null],
    ["宇宙结构", 3e68, 0.3, 0.056, null, null]
  ].map(([name, threshold, strength, growth, removedAtRealm, removedBy]) => Object.freeze({ name, threshold, strength, growth, removedAtRealm, removedBy })));

  const challenges = Object.freeze({
    innateDeficiency: Object.freeze({ name: "福", maxCompletions: 3, limitExponents: [0.85, 0.7, 0.55], rewardExponents: [1.05, 1.08, 1.15], requiredScaleIndices: [2, 3, 4], resourceName: "J", rewardSourceName: "健身" }),
    powerless: Object.freeze({ name: "禄", maxCompletions: 3, limitExponents: [0.85, 0.72, 0.6], rewardExponents: [1.05, 1.08, 1.12], requiredScaleIndices: [3, 4, 5], resourceName: "战力", rewardSourceName: "锻炼" }),
    longevity: Object.freeze({ name: "寿", maxCompletions: 3, limitExponents: [0.8, 0.75, 0.69], rewardMultipliers: [10, 25, 100], requiredScaleIndices: [4, 5, 6], resourceName: "J与战力", timeToLimitSeconds: 600, unlockAchievementKey: "trueScale4" }),
    fiveMisfortunes: Object.freeze({ name: "五弊", maxCompletions: 3, rewardExponents: [1.1, 1.2, 1.5], requiredScaleIndices: [3, 4, 5], resourceName: "选择体系前的J与战力", unlockAchievementKey: "trueScale5" }),
    completeRealm: Object.freeze({ name: "完全境界", maxCompletions: 3, sourceExponents: [0.85, 0.75, 0.65], rewardExponents: [1.1, 1.15, 1.2], requiredScaleIndex: 9, resourceName: "非极意战力来源", rewardSourceName: "极意", unlockAchievementKey: "trueScale8" }),
    moonless: Object.freeze({ name: "无月", maxCompletions: 3, sourceExponents: [0.85, 0.75, 0.65], rewardExponents: [1.05, 1.08, 1.15], requiredScaleIndex: 9, resourceName: "非打岩战力来源", rewardSourceName: "打岩", unlockAchievementKey: "trueScale9" }),
    planetSuppression: Object.freeze({ name: "星球压制", maxCompletions: 1, requiredScaleIndex: 10, resourceName: "额外爆星级动态软上限", unlockAchievementKey: "trueScale10" }),
    severEvilCorpse: Object.freeze({ name: "斩恶尸", maxCompletions: 1, limitExponents: [0.85], requiredScaleIndex: 11, resourceName: "J、战力、法力与仙灵力", system: "immortal", catalogSystem: "仙道", threeCorpseOrder: 1 }),
    severGoodCorpse: Object.freeze({ name: "斩善尸", maxCompletions: 1, limitExponents: [0.7], rewardExponents: [1.02], requiredScaleIndex: 11, resourceName: "J、战力、法力与仙灵力", system: "immortal", catalogSystem: "仙道", threeCorpseOrder: 2 }),
    severSelfCorpse: Object.freeze({ name: "斩自我尸", maxCompletions: 1, targetAdvancedRealmLevel: 9, resourceName: "法则失效；仙灵力额外倒数指数", system: "immortal", catalogSystem: "仙道", threeCorpseOrder: 3 })
  });

  const scatterRetainedUpgradeTiers = Object.freeze(["", "普通人", "爆砖及之前", "爆墙及之前"]);
  const reincarnationRoots = Object.freeze([
    null,
    Object.freeze({ name: "上品灵根", manaMultiplier: 1.5, requirementMultiplier: 1 }),
    Object.freeze({ name: "地灵根", manaMultiplier: 1.8, requirementMultiplier: 0.9 }),
    Object.freeze({ name: "天灵根", manaMultiplier: 2.4, requirementMultiplier: 0.75 })
  ]);
  const breathingRealms = Object.freeze([
    null,
    Object.freeze({ base: 1.25, manaScale: 200 }),
    Object.freeze({ base: 2, manaScale: 8000 }),
    Object.freeze({ base: 3, manaScale: realms[0].baseCost }),
    ...realms.map((realm, index) => Object.freeze({
      base: 3 * Math.pow(1.5, index + 1),
      manaScale: realms[index + 1]?.baseCost ?? realm.baseCost
    }))
  ]);

  WIS.Core.Config = Object.freeze({
    saveKey: "wis-infinite-power-save-v2", gameVersion: "0.1.4.3", saveVersion: 44,
    costs, realms, scales, softcaps, challenges, scatterRetainedUpgradeTiers, reincarnationRoots, breathingRealms,
    rockBaseLevelCap: 10, minorTribulationBaseTriggerLoad: 150,
    offlineNoticeMinSeconds: 10, offlineMaxSteps: 600,
    achievementEffects: Object.freeze({
      timeScaleSeconds: 20 * 60,
      stellarChallengePowerMultiplier: 15,
      immortalCrystal: Object.freeze({ baseChance: 0.05, perItemAdditive: 0.001, decayScale: 100, decayExponent: -0.5 }),
      goldenNatureExponentPerDoubling: 0.025,
      utmostPuritySoftcapLossCoefficient: 0.08,
      greatLuoManaExponentPerDoubling: 0.035
    }),
    exploration: Object.freeze({
      baseMana: 50, minimumPowerCost: 1e6, standardPowerCost: 1e7, costExponentScale: 0.08,
      manaCurve: Object.freeze({ scale: 1e14, earlyExponent: 1, lateExponent: 0.15, sharpness: 12 }),
      automaticEfficiency: 0.0002,
      spiritWorldAscensionMultiplier: 8
    }),
    immortalPower: Object.freeze({
      unlockAdvancedRealmLevel: 6,
      manaScale: 1e20,
      manaExponent: 0.5,
      realmProgressStep: 0.01,
      manaSuppressionStrength: 0.3,
      realmCosts: Object.freeze({ goldenImmortal: 1e11, taiyi: 1e16, daluo: 5e20, daoAncestor: 1e26 }),
      abilityCosts: Object.freeze({
        undyingPrimordialSpirit: 4e8,
        xuanImmortalBody: 6.67e8,
        law: 1.2e9,
        immortalApertureII: 2e10,
        spiritDomain: 5e10,
        threadsOfLaw: 2e11,
        immortalApertureIII: 8e11,
        spiritCaptureReturn: 2e12,
        indestructibleDharmaBody: 5e12,
        fiveElementsTreasure: 1e13,
        immortalApertureIV: 5e13,
        immortalApertureV: 5e15,
        lawAffinity: 2e16,
        flawlessJadeBody: 5e16,
        spiritDomainWorldTransformation: 1e17,
        immortalApertureVI: 3e17,
        soulQualitativeChange: 1e18,
        immortalApertureVII: 5e18,
        trinity: 5e19,
        unityWithDao: 1.5e20,
        lawOrigin: 5e20,
        lawCrystalFilament: 1.5e21,
        severThreeCorpses: 5e21,
        ultimateImmortalAperture: 1.5e22
      }),
      immortalAperture: Object.freeze({
        baseCost: 4e6,
        growth: 1.14,
        cap: 1800,
        baseCap: 36,
        perLevelMultiplier: 1.1,
        milestoneInterval: 6,
        milestoneMultiplier: 1.25,
        lateRuleStartLevel: 108,
        lateGrowth: 1.04,
        latePerLevelMultiplier: 1.03,
        lateMilestoneInterval: 12,
        lateMilestoneMultiplier: 1.1,
        ultimateRuleStartLevel: 360,
        ultimateGrowth: 1.008,
        ultimatePerLevelMultiplier: 1.0045,
        ultimateMilestoneInterval: 60,
        ultimateMilestoneMultiplier: 1.12
      }),
      law: Object.freeze({
        manaScale: 1e24,
        logExponent: 2,
        upgradeExponentMultiplier: 1.1,
        limitingExponent: 0.8,
        decayScale: 10,
        decayExponent: 0.75
      }),
      spiritDomain: Object.freeze({ baseJoules: 1e28, immortalPowerScale: 1e11, exponent: 0.6, worldMultiplier: 100 }),
      spiritCaptureReturn: Object.freeze({
        immortalPowerScale: 1e11,
        targetImmortalPower: 1e16,
        exponent: 1.2,
        maximumMultiplier: 3
      }),
      celestialFiveDeclines: Object.freeze({
        goldenImmortalLoss: 0.2,
        taiyiLoss: 0.15,
        daluoLoss: 0.1,
        flawlessJadeBodyReduction: 0.5
      }),
      fiveElementsTreasure: Object.freeze({
        baseChance: 0.02,
        chanceDecay: 0.99,
        perItemAdditive: 0.001,
        minimumInternalExponent: 0.75,
        internalExponentRange: 0.25,
        internalExponentScale: 1000
      }),
      soulQualitativeChange: Object.freeze({ immortalPowerScale: 1e16, exponent: 0.4 }),
      daluo: Object.freeze({
        trinityJoulesScale: 1e29,
        trinityExponent: 0.75,
        unityWithDaoMaximumBonus: 0.025,
        unityWithDaoSaturation: 5,
        lawOriginExponent: 1.2,
        lawCrystalMaximumBonus: 0.02,
        lawCrystalSaturation: 1,
        selfCorpseScale: 1e16,
        selfCorpseCoefficient: 0.03
      })
    }),
    ghostBrain: Object.freeze({
      highestPowerExponent: 0.6,
      divisor: 250,
      attenuationScale: 1e30,
      attenuationExponent: 0.17
    }),
    magicTreasure: Object.freeze({
      manaCurve: Object.freeze({
        scale: 1e24, baseEarlyExponent: 0.65, earlyExponent: 0.8,
        lateExponent: 0.76, sharpness: 4
      })
    }),
    focus: Object.freeze({
      sourceCurve: Object.freeze({ scale: 5e13, earlyExponent: 1, lateExponent: 0.75, sharpness: 6 })
    }),
    treasureManaDiminishing: Object.freeze({
      tianNiPearlCoefficient: 0.25,
      naturalTreasureCoefficient: 0.2
    }),
    training: Object.freeze({ decayScale: 1e6, decayLogDivisor: 9, decayPower: 3 }),
    starEnhancements: Object.freeze({
      planetWill: Object.freeze({ joulesScale: 1e29, exponent: 0.75, maximumMultiplier: 1e8 }),
      starSpirit: Object.freeze({ perChallengeMultiplier: 1.06 }),
      starShatter: Object.freeze({ maximumOrders: 5, levelScale: 5000 }),
      spaceQuake: Object.freeze({ remainingPressureMultiplier: 0.97 }),
      selfless: Object.freeze({ ultimateIntentMultiplier: 1e5 }),
      supernaturalFire: Object.freeze({ numerator: 2, saturation: 20 }),
      selfSuppression: Object.freeze({ softcapLossConversion: 0.15 })
    }),
    starSoftcapAchievement: Object.freeze({
      remainingPressureMultiplier: 0.95,
      challengeRewardLossConversion: 0.1
    }),
    scaleTreasures: Object.freeze({
      superLollipop: Object.freeze({ baseChance: 0.0005, chanceDecay: 0.98, perItemMultiplier: 0.02 }),
      fiveSpiritStone: Object.freeze({ baseChance: 0.0005, chanceDecay: 0.99, joulesBase: 10, joulesExponent: 1.2, powerBase: 5, powerExponent: 1.25 })
    })
  });
}(window.WIS));
