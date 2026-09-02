(function defineTreasureMeta(WIS) {
  "use strict";

  const definitions = Object.freeze(Object.fromEntries([
    ["tianNiPearl", "天逆珠"], ["mysteriousGreenBottle", "神秘绿瓶"], ["fuBao", "符宝"],
    ["fitnessMembershipCard", "健身房会员卡"], ["superLollipop", "超级棒棒糖"],
    ["skyCrystal", "天晶"], ["fiveSpiritStone", "五灵石"], ["xuTianDing", "虚天鼎"],
    ["baLingChi", "八灵尺"], ["wanYaoFan", "万妖幡"], ["phantomHeavenMirror", "幻天镜"],
    ["mysticHeavenSacredTree", "玄天圣树"], ["mysticHeavenSpiritSlayingSword", "玄天斩灵剑"],
    ["fiveElementsTreasure", "五行至宝"], ["immortalCrystal", "仙晶"],
    ["cosmicFiber", "宇宙纤维"], ["cosmicWill", "宇宙意志"]
  ].map(([key, name]) => [key, Object.freeze({ key, name, stackable: true })])));

  WIS.Meta.Treasures = Object.freeze({
    definitions,
    keys: Object.freeze(Object.keys(definitions)),
    isTreasure(key) { return Object.prototype.hasOwnProperty.call(definitions, key); },
    isStackable(key) { return definitions[key]?.stackable === true; },
    getTreasureChanceMultiplier(state) {
      return WIS.Power.ScaleLogic?.treasureChanceMultiplier?.(state) ?? 1;
    },
    getTreasureAwardMultiplier(state, key = null) {
      if (key !== null && !this.isStackable(key)) return 1;
      return WIS.Power.ScaleLogic?.treasureAwardMultiplier?.(state) ?? 1;
    },
    count(state, key) {
      return Math.max(0, Math.floor(Number(state.meta.treasures?.[key]) || 0));
    },
    add(state, key, amount = 1) {
      if (!this.isTreasure(key) || !Object.prototype.hasOwnProperty.call(state.meta.treasures, key)) throw new Error(`未知宝物：${key}`);
      const baseAmount = Math.max(0, Math.floor(Number(amount) || 0));
      const awardedAmount = baseAmount * this.getTreasureAwardMultiplier(state, key);
      state.meta.treasures[key] = this.count(state, key) + awardedAmount;
      WIS.Core.Effects?.invalidate?.();
      return awardedAmount;
    }
  });
}(window.WIS));
