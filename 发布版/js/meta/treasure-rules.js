(function defineTreasureRules(WIS) {
  "use strict";
  const { BN } = WIS.Core.BigNum;
  // Shared acquisition parameters only. Reward multipliers and settlement stay
  // in their existing owners. Keep the represented 1000 / 3 requirement.
  const exponential = (base, q, coefficient = 1, immortal = false) =>
    Object.freeze({ base, q, coefficient, immortal, type: "exponential",
      baseChance: base === 1 ? coefficient : Number(coefficient) / base });
  const power = (numerator, scale, exponent, immortal = false, denominator = 1) =>
    Object.freeze({ base: denominator === 1 ? numerator : BN(numerator).div(denominator),
      scale, exponent, coefficient: 1, immortal, type: "power", baseChance: denominator / numerator });
  const rules = Object.freeze({
    fitnessMembershipCard: exponential(200, .97), superLollipop: exponential(2000, .98),
    skyCrystal: power(200, 10, .5), fiveSpiritStone: exponential(2000, .99),
    baLingChi: exponential(500, .9, 1, true), fiveElementsTreasure: exponential(50, .99, 1, true),
    immortalCrystal: power(20, 100, .5, true), cosmicFiber: power(1000, 20, .65, false, 3),
    cosmicWill: power(1000, 10, .85),
    tianNiPearl: exponential(1, .99, .01, true), mysteriousGreenBottle: exponential(1, .85, .02, true),
    fuBao: exponential(1, .7, .02, true), xuTianDing: exponential(1, .75, .0002, true),
    wanYaoFan: exponential(1, .75, .0001, true), phantomHeavenMirror: exponential(1, .5, "5e-12", true),
    mysticHeavenSacredTree: exponential(1, .5, "5e-14", true),
    mysticHeavenSpiritSlayingSword: exponential(1, .6, "1e-12", true)
  });
  WIS.Meta.TreasureRules = rules;
}(window.WIS));
