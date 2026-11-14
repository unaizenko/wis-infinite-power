(function(W){'use strict';
// Shared closed command vocabulary. Queries and internal setters are never RPC entry points.
const definitions={
  "scale": [
    [
      "buyWaveEye",
      "buyElementalAwakening",
      "buyMoonfall",
      "buyFlowState",
      "buySelfhood",
      "buyFreedom",
      "buyChicxulubMeteorite",
      "buyPlanetWill",
      "buyStarSpirit",
      "buyStarShatter",
      "buySpaceQuake",
      "buySelfless",
      "buySupernaturalFire",
      "buyFiveSpiritStone",
      "buySelfSuppression",
      "buyStellarFurnace",
      "buyStellarTreasureSeeking",
      "buyGravitationalCollapse",
      "buyGalacticReturn",
      "buyStellarSeaGift",
      "buyStellarResonance",
      "buyGreatAttractor",
      "buyLargeScaleAdaptation",
      "buySuperclusterCollapse",
      "buyCosmicWeb",
      "buyScaleUnification",
      "buySpacetimeFramework",
      "train",
      "buyRunning",
      "buyGym",
      "buyExercise",
      "buyTranscendent",
      "buyFocus",
      "buyBreathingMethod",
      "buyExtremeExercise",
      "buyRock",
      "buyWater",
      "buyGhostBrain",
      "buyNaturalStrength",
      "buyMentalPower",
      "buyLifePower",
      "buyMyStyle",
      "buyIntuition",
      "buyGhostBack",
      "buySonicMovement",
      "buyCarbonLimit",
      "buyKillingIntent",
      "buyRockStrike",
      "buyHighSpeedMetabolism",
      "buyEnduranceEnhancement",
      "buyBulletTime",
      "buyDynamicFocus",
      "buySuperPerception",
      "buyInvulnerable",
      "buyRegeneration",
      "buySuperpower",
      "buySuperSpeedThinking",
      "buyMountainCollapse",
      "buyMindDivision",
      "buyPowerOneTime",
      "buyHyperRegeneration",
      "buyMentalDomain",
      "buyEarthSplit",
      "buyGodspeed",
      "buySuperpowerEvolution",
      "buySubtle",
      "buySkySplit",
      "buyBiologicalQuantification",
      "buyGhostManTransformation",
      "buyDestroyCountry",
      "buyHumanGhostTransformation",
      "buyKillingIntentSubstance",
      "buyEnergyCycle",
      "buyMountainShatter",
      "buyBioenergy",
      "buyElementalization",
      "buyKillingIntentPerception",
      "buyKillingIntentWave",
      "buyUltimateIntent",
      "buyBrainDomainDevelopment",
      "buyContinentSplit",
      "buyContinentCollapse",
      "toggleGhostBack",
      "buyUpgrade"
    ],
    "Power.ScaleLogic",
    false
  ],
  "scaleSystem": [
    [
      "buyUpgrade"
    ],
    "Power.Scale",
    false
  ],
  "immortal": [
    [
      "unlockTrueImmortalAbility",
      "unlockAdvancedImmortalAbility",
      "unlockSeverThreeCorpses",
      "buyImmortalAperture",
      "chooseCultivation",
      "unlockQiRefining",
      "breathe",
      "unlockFoundation",
      "unlockGoldenCore",
      "unlockAdvancedRealm",
      "unlockImmortalLife",
      "buyQiSpell",
      "unlockCirculation",
      "unlockManaLiquefaction",
      "unlockTechnique",
      "buyFoundationSpell",
      "buyLongevity",
      "buyGoldenCoreLongevity",
      "unlockManaSolidification",
      "unlockMagicTreasure",
      "unlockMinorTechnique",
      "unlockFlyingEscape",
      "unlockMaterialControl",
      "unlockDivineSense",
      "unlockGreatCultivator",
      "unlockSecondNascentSoul",
      "buyLongevity800",
      "unlockManaAbility",
      "unlockVoidRefinementAbility",
      "buyHeavenlyTreasure",
      "buyTrueSpiritTransformation",
      "buyMysticHeavenlyTreasure",
      "explore",
      "unlockBodyIntegrationAbility",
      "unlockMahayanaAbility",
      "scatterAndRebuild",
      "reincarnate",
      "buyAbility"
    ],
    "Cultivation.ImmortalLogic",
    false
  ],
  "martial": [
    [
      "convert",
      "buy",
      "setAutomation"
    ],
    "Cultivation.Martial",
    true
  ],
  "xiuzhen": [
    [
      "breakthrough",
      "buy"
    ],
    "Cultivation.Xiuzhen",
    true
  ],
  "numbers": [
    [
      "purchase",
      "purchaseTreeUpgrade",
      "enterTreeSuper",
      "startNextTree",
      "continueUnlockedTree"
    ],
    "Meta.BigNumbers",
    true
  ],
  "infinity": [
    [
      "changeCultivation",
      "purchase"
    ],
    "Meta.Infinity",
    true
  ],
  "high": [
    [
      "promote"
    ],
    "Meta.HighMultiverse",
    true
  ],
  "challenges": [
    [
      "startChallenge",
      "exitChallenge"
    ],
    "Meta.Challenges",
    false
  ]
};
function accepts(group,method){return Object.hasOwn(definitions,group)&&definitions[group][0].includes(method);}
function target(group){return definitions[group][1].split('.').reduce((x,k)=>x[k],W);}
function invoke(command){const {group,method,args=[],manual}=command;if(!accepts(group,method)||!Array.isArray(args)||args.length>8)throw Error('unsupported resource command');
 const run=()=>target(group)[method](...(definitions[group][2]?[W.Core.Runtime.getState(),...args]:args));
 const I=W.Cultivation.ImmortalLogic;
 if(manual?.kind==='realm')return I.recordManualRealmBreakthrough(run);
 if(manual){if(!['scale','immortal'].includes(manual.kind)||typeof manual.key!=='string'||!Object.hasOwn(W.Core.State.toFlat(W.Core.Runtime.getState()),manual.key))throw Error('invalid manual history');return I.recordManualProgress(manual.kind==='scale'?W.Power.ScaleLogic.manualScaleUpgradeHistory:I.manualImmortalAbilityHistory,manual.key,run);}
 return run();
}
function facade(group,original,dispatch){const out={...original};if(!Object.hasOwn(definitions,group))throw Error('unknown action group');for(const method of definitions[group][0])out[method]=(...args)=>dispatch({type:'action',group,method,args:definitions[group][2]?args.slice(1):args});return Object.freeze(out);}
W.Simulation.SessionActions=Object.freeze({accepts,invoke,facade,definitions:Object.freeze(definitions)});
}(window.WIS));
