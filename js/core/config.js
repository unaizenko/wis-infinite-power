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
      biologicalQuantification: 3e20, destroyCountry: 8e20, killingIntentSubstance: 1.2e21,
      energyCycle: 1.5e21, mountainShatter: 2.5e21, bioenergy: 3e21,
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
      perfectedTechnique: 2e16, heavenEarthAura: 5e16, divineAbilityMastery: 2e17,
      auraIntoBody: 5e17, externalIncarnation: 1e18, demonRealmJourney: 1.5e18,
      returnToOrigin: 2e18
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
    innateDeficiency: Object.freeze({ name: "福", maxCompletions: 3, limitExponents: [0.85, 0.7, 0.55], rewardExponents: [1.05, 1.1, 1.2], requiredScaleIndex: 2, resourceName: "J", rewardSourceName: "健身" }),
    powerless: Object.freeze({ name: "禄", maxCompletions: 3, limitExponents: [0.85, 0.72, 0.6], rewardExponents: [1.05, 1.1, 1.15], requiredScaleIndex: 3, resourceName: "战力", rewardSourceName: "锻炼" }),
    longevity: Object.freeze({ name: "寿", maxCompletions: 3, limitExponents: [0.8, 0.75, 0.69], rewardMultipliers: [10, 100, 1000], requiredScaleIndex: 4, resourceName: "J与战力", timeToLimitSeconds: 2700, unlockAchievementKey: "trueScale4" }),
    fiveMisfortunes: Object.freeze({ name: "五弊", maxCompletions: 3, rewardExponents: [1.1, 1.2, 1.5], requiredScaleIndices: [3, 4, 5], resourceName: "选择体系前的J与战力", unlockAchievementKey: "trueScale5" })
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
    saveKey: "wis-infinite-power-save-v2", gameVersion: "0.1.3.10", saveVersion: 39,
    costs, realms, scales, softcaps, challenges, scatterRetainedUpgradeTiers, reincarnationRoots, breathingRealms,
    rockBaseLevelCap: 10, minorTribulationBaseTriggerLoad: 150,
    minorTribulationRecoverySeconds: 120, offlineNoticeMinSeconds: 10, offlineMaxSteps: 600,
    exploration: Object.freeze({ baseMana: 50, minimumPowerCost: 1e6, standardPowerCost: 1e7, costExponentScale: 0.08 }),
    training: Object.freeze({ decayScale: 1e6, decayLogDivisor: 9, decayPower: 3 })
  });
}(window.WIS));
