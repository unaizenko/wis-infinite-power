(function defineSimulationAutomation(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.Automation = Object.freeze({
    create({ autoBreakthroughImmortalRealms, autoUpgradeImmortalAbilities, autoUpgradeEnhancements }) {
      function runAchievementAutomations() {
        return autoBreakthroughImmortalRealms() +
          (WIS.Cultivation.Xiuzhen?.automation(WIS.Core.Runtime.state, "realm") || 0) +
          autoUpgradeImmortalAbilities() +
          (WIS.Cultivation.Xiuzhen?.automation(WIS.Core.Runtime.state, "ability") || 0) +
          autoUpgradeEnhancements();
      }
      return Object.freeze({ runAchievementAutomations });
    }
  });
}(window.WIS));
