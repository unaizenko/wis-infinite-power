(function defineTreasureMeta(WIS) {
  "use strict";

  WIS.Meta.Treasures = Object.freeze({
    keys: Object.freeze(["tianNiPearl", "mysteriousGreenBottle", "fuBao", "fitnessMembershipCard", "superLollipop", "skyCrystal", "fiveSpiritStone", "xuTianDing", "baLingChi", "wanYaoFan", "phantomHeavenMirror", "mysticHeavenSacredTree", "mysticHeavenSpiritSlayingSword", "fiveElementsTreasure"]),
    count(state, key) {
      return Math.max(0, Math.floor(Number(state.meta.treasures?.[key]) || 0));
    },
    add(state, key, amount = 1) {
      if (!Object.prototype.hasOwnProperty.call(state.meta.treasures, key)) throw new Error(`未知宝物：${key}`);
      state.meta.treasures[key] = this.count(state, key) + Math.max(0, Math.floor(Number(amount) || 0));
      return state.meta.treasures[key];
    }
  });
}(window.WIS));
