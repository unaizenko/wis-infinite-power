(function defineSimulationTreasureEvents(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.TreasureEvents = Object.freeze({
    create(context) {
      const {
        getState, setStateDirect, advanceGameStep, recordSignature,
        treasuresUnlocked, hasAchievement,
        fitnessMembershipCardChance, superLollipopChance, skyCrystalChance, fiveSpiritStoneChance,
        cosmicFiberAvailable, cosmicFiberChance, cosmicWillAvailable, cosmicWillChance,
        fitnessJBonus, rockPowerPerSecond, ultimateIntentPowerSource,
        tianNiPearlChance, mysteriousGreenBottleChance, fuBaoChance,
        naturalTreasureUpgradeChance, naturalTreasureLevelCap, xuTianDingChance,
        baLingChiChance, wanYaoFanChance, phantomHeavenMirrorChance,
        mysticHeavenSacredTreeChance, mysticHeavenSpiritSlayingSwordChance,
        immortalCrystalChance, fiveElementsTreasureChance, immortalTreasureChanceMultiplier,
        automaticExplorationAmountPerSecond, circulationManaPerSecond, immortalPowerPerSecond
      } = context;
      const { ZERO, div, log10, gt } = WIS.Core.BigNum;
      const epsilon = context.epsilon;
      const simulationStepSeconds = context.simulationStepSeconds;
      const boundaryBisections = context.boundaryBisections;
      const maxDiscreteEventsPerStep = context.maxDiscreteEventsPerStep;
      const relativeBucketLog = Math.log(1.0025);
      const relativeBucketLog10 = Math.log10(1.0025);

      function createOfflineTaskRandom(seedValue) {
        let value = (Math.floor(Math.max(0, Math.min(1, Number(seedValue) || 0)) * 0x100000000) >>> 0) || 0x6d2b79f5;
        return {
          next() {
            value ^= value << 13;
            value ^= value >>> 17;
            value ^= value << 5;
            value >>>= 0;
            return value / 0x100000000;
          },
          snapshot: () => value >>> 0,
          restore(nextValue) {
            value = (Number(nextValue) >>> 0) || 0x6d2b79f5;
          }
        };
      }

      function relativeTreasureChanceBucket(value) {
        const probability = Number(value);
        if (!(probability > 0)) return "zero";
        if (!Number.isFinite(probability) || probability >= 1 - epsilon) return "cap";
        return Math.floor(Math.log(probability) / relativeBucketLog);
      }

      function treasureChanceDriver(available, chance) {
        return available ? `1:${relativeTreasureChanceBucket(chance())}` : "0";
      }

      function relativeTreasureRateBucket(value) {
        if (!gt(value, ZERO)) return "zero";
        return div(log10(value), relativeBucketLog10).floor().toString();
      }

      function treasureDriverSignature(source = getState()) {
        const treasureSystemAvailable = treasuresUnlocked();
        const fitnessSourceActive = gt(fitnessJBonus(), ZERO);
        const fitnessTreasureAvailable = hasAchievement("scale5") && fitnessSourceActive;
        const superLollipopActive = hasAchievement("scale8") && fitnessSourceActive;
        const skyCrystalAvailable = hasAchievement("scale9") && gt(rockPowerPerSecond(), ZERO);
        const fiveSpiritStoneAvailable = source.fiveSpiritStonePurchased && gt(ultimateIntentPowerSource(), ZERO);
        const cosmicFiberActive = cosmicFiberAvailable(source);
        const cosmicWillActive = cosmicWillAvailable(source);
        const immortalSystemActive = source.cultivation?.active === "immortal";
        const tianNiPearlAvailable = immortalSystemActive && treasureSystemAvailable && hasAchievement("daoFoundation");
        const mysteriousGreenBottleAvailable = immortalSystemActive && treasureSystemAvailable && hasAchievement("goldenCore");
        const fuBaoAvailable = immortalSystemActive && hasAchievement("trueScale3");
        const naturalTreasureAvailable = immortalSystemActive && source.goldenCoreUnlocked &&
          source.naturalTreasureLevel < naturalTreasureLevelCap();
        const xuTianDingAvailable = immortalSystemActive && source.heavenlyTreasureLevel >= 1;
        const baLingChiAvailable = immortalSystemActive && source.heavenlyTreasureLevel >= 2;
        const wanYaoFanAvailable = immortalSystemActive && source.heavenlyTreasureLevel >= 3;
        const phantomHeavenMirrorAvailable = immortalSystemActive && source.mysticHeavenlyTreasureLevel >= 1;
        const mysticHeavenSacredTreeAvailable = immortalSystemActive && source.mysticHeavenlyTreasureLevel >= 2;
        const mysticHeavenSpiritSlayingSwordAvailable = immortalSystemActive && source.mysticHeavenlyTreasureLevel >= 3;
        const immortalCrystalAvailable = immortalSystemActive && hasAchievement("ascendImmortal");
        const fiveElementsTreasureAvailable = immortalSystemActive && source.fiveElementsTreasureUnlocked;
        const explorationAttemptRate = immortalSystemActive ? automaticExplorationAmountPerSecond() : ZERO;
        const explorationActive = gt(explorationAttemptRate, ZERO);
        const circulationSourceActive = immortalSystemActive && gt(circulationManaPerSecond(), ZERO);
        const circulationTreasureActive = circulationSourceActive &&
          (tianNiPearlAvailable || baLingChiAvailable);
        const immortalPowerSourceActive = immortalSystemActive && gt(immortalPowerPerSecond(), ZERO);
        const immortalPowerTreasureActive = immortalPowerSourceActive &&
          (immortalCrystalAvailable || fiveElementsTreasureAvailable);
        const activeImmortalChanceDrivers = [
          [tianNiPearlAvailable && (explorationActive || circulationSourceActive), tianNiPearlChance],
          [mysteriousGreenBottleAvailable && explorationActive, mysteriousGreenBottleChance],
          [fuBaoAvailable && explorationActive, fuBaoChance],
          [naturalTreasureAvailable && explorationActive, naturalTreasureUpgradeChance],
          [xuTianDingAvailable && explorationActive, xuTianDingChance],
          [baLingChiAvailable && circulationSourceActive, baLingChiChance],
          [wanYaoFanAvailable && explorationActive, wanYaoFanChance],
          [phantomHeavenMirrorAvailable && explorationActive, phantomHeavenMirrorChance],
          [mysticHeavenSacredTreeAvailable && explorationActive, mysticHeavenSacredTreeChance],
          [mysticHeavenSpiritSlayingSwordAvailable && explorationActive, mysticHeavenSpiritSlayingSwordChance],
          [immortalCrystalAvailable && immortalPowerSourceActive, immortalCrystalChance],
          [fiveElementsTreasureAvailable && immortalPowerSourceActive, fiveElementsTreasureChance]
        ].filter(([active]) => active);
        const immortalTreasureChanceBucket = activeImmortalChanceDrivers.length === 0
          ? "inactive"
          : activeImmortalChanceDrivers.every(([, chance]) => chance() >= 1 - epsilon)
            ? "cap"
            : relativeTreasureRateBucket(immortalTreasureChanceMultiplier());
        return [
          source.cultivation?.active || "none",
          `system:${Number(treasureSystemAvailable)}`,
          `fitness:${treasureChanceDriver(fitnessTreasureAvailable, fitnessMembershipCardChance)}`,
          `lollipop:${treasureChanceDriver(superLollipopActive, superLollipopChance)}`,
          `sky:${treasureChanceDriver(skyCrystalAvailable, skyCrystalChance)}`,
          `fiveSpirit:${treasureChanceDriver(fiveSpiritStoneAvailable, fiveSpiritStoneChance)}`,
          `cosmicFiber:${treasureChanceDriver(cosmicFiberActive, cosmicFiberChance)}`,
          `cosmicWill:${treasureChanceDriver(cosmicWillActive, cosmicWillChance)}`,
          `exploration:${Number(explorationActive)}:${explorationActive ? relativeTreasureRateBucket(explorationAttemptRate) : "inactive"}`,
          `tianNiSources:${Number(tianNiPearlAvailable && explorationActive)}:${Number(tianNiPearlAvailable && circulationSourceActive)}`,
          `circulationTreasure:${Number(circulationTreasureActive)}`,
          `immortalPowerTreasure:${Number(immortalPowerTreasureActive)}`,
          `immortalChance:${immortalTreasureChanceBucket}`,
          `immortalAvailability:${[
            tianNiPearlAvailable, mysteriousGreenBottleAvailable, fuBaoAvailable,
            naturalTreasureAvailable, xuTianDingAvailable, baLingChiAvailable, wanYaoFanAvailable,
            phantomHeavenMirrorAvailable, mysticHeavenSacredTreeAvailable,
            mysticHeavenSpiritSlayingSwordAvailable, immortalCrystalAvailable,
            fiveElementsTreasureAvailable
          ].map(Number).join("")}`,
          `seizeFoundation:${Number(hasAchievement("seizeFoundation"))}`
        ].join("|");
      }

      function treasureEventSignature(source = getState()) {
        return [
          recordSignature(source.treasureImprints, WIS.Meta.Treasures.keys),
          Number(source.naturalTreasureLevel) || 0,
          source.unlockedAchievements?.seizeFoundation === true
        ].join("|");
      }

      function runTreasurePrediction(serializedState, elapsedSeconds, randomState) {
        const liveState = getState();
        const livePowerSystem = WIS.Core.Registries.getActivePower(liveState);
        const liveCultivationSystem = WIS.Core.Registries.getActiveCultivation(liveState);
        const powerTransient = livePowerSystem?.snapshotTreasureTransient?.();
        const cultivationTransient = liveCultivationSystem?.snapshotTreasureTransient?.();
        const predictionState = WIS.Core.State.normalizeDomain(serializedState);
        const predictionRandom = createOfflineTaskRandom(0);
        predictionRandom.restore(randomState);
        let completed = true;
        setStateDirect(predictionState);
        try {
          return WIS.Core.Runtime.withTreasurePrediction(
            () => predictionRandom.next(),
            () => WIS.Core.Effects.withIsolatedState(predictionState, () => {
              let remaining = Math.max(0, Number(elapsedSeconds) || 0);
              let eventPasses = 0;
              while (remaining > epsilon && eventPasses < maxDiscreteEventsPerStep * 4) {
                const result = advanceGameStep(remaining, true, { skipTreasureRolls: false, projection: true });
                const processed = Math.max(0, Math.min(remaining, Number(result.processedSeconds) || 0));
                remaining = Math.max(0, remaining - processed);
                eventPasses += 1;
                if (!(processed > 0) && !result.eventCommitted) break;
              }
              if (remaining > epsilon) completed = false;
              return { completed, signature: treasureEventSignature(getState()) };
            })
          );
        } finally {
          setStateDirect(liveState);
          livePowerSystem?.restoreTreasureTransient?.(powerTransient);
          liveCultivationSystem?.restoreTreasureTransient?.(cultivationTransient);
          WIS.Core.Effects.invalidate();
        }
      }

      function nextEffectiveTreasureEventSeconds(task, maximumSeconds, denseEventThreshold = 0) {
        const state = getState();
        const safeMaximum = Math.max(0, Number(maximumSeconds) || 0);
        if (safeMaximum <= simulationStepSeconds + epsilon) return null;
        if (!treasuresUnlocked() && state.cultivation?.active !== "immortal") return null;
        const serializedState = WIS.Core.State.toSerializable(state);
        const initialSignature = treasureEventSignature(state);
        const randomState = task.random.snapshot();
        const safeDenseThreshold = Math.min(safeMaximum, Math.max(0, Number(denseEventThreshold) || 0));
        let densePrediction = null;
        if (safeDenseThreshold > simulationStepSeconds + epsilon) {
          densePrediction = runTreasurePrediction(serializedState, safeDenseThreshold, randomState);
          if (densePrediction.completed && densePrediction.signature !== initialSignature) {
            return { seconds: safeDenseThreshold, randomState, resultingSignature: densePrediction.signature, dense: true };
          }
        }
        const fullPrediction = densePrediction && Math.abs(safeDenseThreshold - safeMaximum) <= epsilon
          ? densePrediction
          : runTreasurePrediction(serializedState, safeMaximum, randomState);
        if (!fullPrediction.completed || fullPrediction.signature === initialSignature) return null;
        let lowerSeconds = safeDenseThreshold;
        let upperSeconds = safeMaximum;
        for (let iteration = 0; iteration < boundaryBisections; iteration += 1) {
          const middleSeconds = (lowerSeconds + upperSeconds) / 2;
          const prediction = runTreasurePrediction(serializedState, middleSeconds, randomState);
          if (prediction.completed && prediction.signature !== initialSignature) upperSeconds = middleSeconds;
          else lowerSeconds = middleSeconds;
        }
        return {
          seconds: Math.min(safeMaximum, Math.max(simulationStepSeconds, upperSeconds)),
          randomState,
          resultingSignature: fullPrediction.signature
        };
      }

      return Object.freeze({
        createOfflineTaskRandom,
        treasureDriverSignature,
        treasureEventSignature,
        runTreasurePrediction,
        nextEffectiveTreasureEventSeconds
      });
    }
  });
}(window.WIS));
