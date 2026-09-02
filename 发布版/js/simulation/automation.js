(function defineSimulationAutomation(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.Automation = Object.freeze({
    create({ autoBreakthroughImmortalRealms, autoUpgradeImmortalAbilities, autoUpgradeEnhancements }) {
      function runAchievementAutomations() {
        return autoBreakthroughImmortalRealms() +
          autoUpgradeImmortalAbilities() +
          autoUpgradeEnhancements();
      }
      return Object.freeze({ runAchievementAutomations });
    }
  });
}(window.WIS));
