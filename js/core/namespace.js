(function bootstrapWISNamespace(global) {
  "use strict";

  const WIS = global.WIS = global.WIS || {};
  WIS.Core = WIS.Core || {};
  WIS.Power = WIS.Power || {};
  WIS.Cultivation = WIS.Cultivation || {};
  WIS.Meta = WIS.Meta || {};
  WIS.UI = WIS.UI || {};
  // 仅存在于运行时的单 tick 快照；不进入 state，因此不会改变存档格式。
  WIS.tmp = WIS.tmp || {
    tick: 0,
    rates: {
      joulesPerSecond: 0,
      powerPerSecond: 0,
      manaPerSecond: 0,
      immortalPowerPerSecond: 0,
      passiveTreasureManaPerSecond: 0,
      automaticExplorationManaPerSecond: 0
    }
  };
}(window));
