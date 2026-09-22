(function defineSimulationAutomation(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.Automation = Object.freeze({
    create({ autoBreakthroughImmortalRealms, autoUpgradeImmortalAbilities, autoUpgradeEnhancements }) {
      function runAchievementAutomations() {
        const s = WIS.Core.Runtime.getState(), achievements = s.unlockedAchievements || {};
        const realm = s.cultivation.active === "immortal" && s.immortalRealmAutomationEnabled && achievements.bodyIntegration;
        const ability = s.cultivation.active === "immortal" && s.immortalAbilityAutomationEnabled && achievements.infantSpirit;
        const scale = s.powerSystem.active === "scale" &&
          ((s.scaleUpgradeAutomationEnabled && achievements.scale6) || ((s.scaleFitnessAutomationEnabled || s.scaleRockAutomationEnabled) && achievements.trueScale7));
        return (realm ? autoBreakthroughImmortalRealms() + (WIS.Cultivation.Xiuzhen?.automation(s, "realm") || 0) : 0) +
          (ability ? autoUpgradeImmortalAbilities() + (WIS.Cultivation.Xiuzhen?.automation(s, "ability") || 0) : 0) +
          (scale ? autoUpgradeEnhancements() : 0);
      }
      return Object.freeze({ runAchievementAutomations });
    }
  });
}(window.WIS));
