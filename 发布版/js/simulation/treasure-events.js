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
      const { ZERO, ONE, sub, div, log10, gt, gte, lt } = WIS.Core.BigNum;
      const epsilon = context.epsilon;
      const simulationStepSeconds = context.simulationStepSeconds;
      const boundaryBisections = context.boundaryBisections;
      const maxDiscreteEventsPerStep = context.maxDiscreteEventsPerStep;
      const relativeBucketLog10 = Math.log10(1.0025);
      const monotonicNow = typeof context.clockNow === "function"
        ? context.clockNow
        : () => typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();

      function predictionBudgetExpired(options = {}) {
        const deadlineMs = Number(options.deadlineMs);
        return Number.isFinite(deadlineMs) && monotonicNow() >= deadlineMs;
      }

      function beginPredictionUnit(options) {
        const budget = options.workBudget;
        if (budget && budget.operations >= budget.maximumOperations) return false;
        if (predictionBudgetExpired(options) && !(budget?.ensureProgress && budget.operations === 0)) {
          return false;
        }
        if (budget) budget.operations += 1;
        return true;
      }

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
        const probability = WIS.Core.Probability.clamp(value);
        if (!gt(probability, ZERO)) return "zero";
        if (gte(probability, sub(ONE, epsilon))) return "cap";
        return relativeTreasureRateBucket(probability);
      }

      function treasureChanceDriver(available, chance) {
        return available ? `1:${relativeTreasureChanceBucket(chance())}` : "0";
      }

      function relativeTreasureRateBucket(value) {
        if (!gt(value, ZERO)) return "zero";
        return div(log10(value), relativeBucketLog10).floor().toString();
      }

      function treasureDriverSnapshot(source = getState()) {
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
          lt(source.naturalTreasureLevel, naturalTreasureLevelCap());
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
          : activeImmortalChanceDrivers.every(([, chance]) =>
            gte(WIS.Core.Probability.clamp(chance()), sub(ONE, epsilon)))
            ? "cap"
            : relativeTreasureRateBucket(immortalTreasureChanceMultiplier());
        const activeChanceDrivers = [
          [fitnessTreasureAvailable, fitnessMembershipCardChance],
          [superLollipopActive, superLollipopChance],
          [skyCrystalAvailable, skyCrystalChance],
          [fiveSpiritStoneAvailable, fiveSpiritStoneChance],
          [cosmicFiberActive, cosmicFiberChance],
          [cosmicWillActive, cosmicWillChance],
          ...activeImmortalChanceDrivers
        ];
        const active = activeChanceDrivers.some(([driverActive, chance]) =>
          driverActive && gt(WIS.Core.Probability.clamp(chance()), ZERO)) ||
          (immortalSystemActive && explorationActive && !hasAchievement("seizeFoundation"));
        const signature = [
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
        return { active, signature };
      }

      function treasureDriverSignature(source = getState()) {
        return treasureDriverSnapshot(source).signature;
      }

      function treasureEventSignature(source = getState()) {
        return [
          recordSignature(source.treasureImprints, WIS.Meta.Treasures.keys),
          JSON.stringify(source.meta?.treasureStockResidual || {}),
          Number(source.naturalTreasureLevel) || 0,
          source.unlockedAchievements?.seizeFoundation === true
        ].join("|");
      }

      function runTreasurePrediction(serializedState, elapsedSeconds, randomState, options = {}) {
        if (!WIS.Core.Runtime.isOfflineExecution()) {
          return WIS.Core.Runtime.withOfflineExecution(() =>
            runTreasurePrediction(serializedState, elapsedSeconds, randomState, options));
        }
        const liveState = getState();
        const livePowerSystem = WIS.Core.Registries.getActivePower(liveState);
        const liveCultivationSystem = WIS.Core.Registries.getActiveCultivation(liveState);
        const powerTransient = livePowerSystem?.snapshotTreasureTransient?.();
        const cultivationTransient = liveCultivationSystem?.snapshotTreasureTransient?.();
        const inputKey = JSON.stringify(serializedState);
        const seconds = Math.max(0, Number(elapsedSeconds) || 0);
        const integrationMethod = options.integrationMethod || "end";
        const resumable = options.continuation;
        const work = resumable?.kind === "treasure-prediction-v2" &&
          resumable.inputKey === inputKey && resumable.seconds === seconds &&
          resumable.initialRandomState === randomState && resumable.integrationMethod === integrationMethod
          ? resumable
          : {
            kind: "treasure-prediction-v2", inputKey, seconds, initialRandomState: randomState, integrationMethod,
            state: WIS.Core.State.normalizeDomain(serializedState),
            remaining: seconds, eventPasses: 0, randomState,
            powerTransient, cultivationTransient
          };
        const predictionState = work.state;
        const predictionRandom = createOfflineTaskRandom(0);
        predictionRandom.restore(work.randomState);
        let completed = true;
        let budgetExhausted = false;
        setStateDirect(predictionState);
        try {
          livePowerSystem?.restoreTreasureTransient?.(work.powerTransient);
          liveCultivationSystem?.restoreTreasureTransient?.(work.cultivationTransient);
          return WIS.Core.Runtime.withTreasurePrediction(
            () => predictionRandom.next(),
            () => WIS.Core.Effects.withIsolatedState(predictionState, () => {
              while (work.remaining > epsilon && work.eventPasses < maxDiscreteEventsPerStep * 4) {
                if (!beginPredictionUnit(options)) {
                  completed = false;
                  budgetExhausted = true;
                  break;
                }
                const result = advanceGameStep(work.remaining, true, {
                  skipTreasureRolls: false, projection: true, offline: true, integrationMethod
                });
                const processed = Math.max(0, Math.min(work.remaining, Number(result.processedSeconds) || 0));
                work.remaining = Math.max(0, work.remaining - processed);
                work.eventPasses += 1;
                if (!(processed > 0) && !result.eventCommitted) break;
              }
              if (work.remaining > epsilon) completed = false;
              work.state = getState();
              work.randomState = predictionRandom.snapshot();
              work.powerTransient = livePowerSystem?.snapshotTreasureTransient?.();
              work.cultivationTransient = liveCultivationSystem?.snapshotTreasureTransient?.();
              return {
                completed, budgetExhausted, signature: treasureEventSignature(getState()),
                continuation: budgetExhausted ? work : null
              };
            })
          );
        } finally {
          setStateDirect(liveState);
          livePowerSystem?.restoreTreasureTransient?.(powerTransient);
          liveCultivationSystem?.restoreTreasureTransient?.(cultivationTransient);
          WIS.Core.Effects.invalidate();
        }
      }

      function nextEffectiveTreasureEventSeconds(task, maximumSeconds, denseEventThreshold = 0, options = {}) {
        const state = getState();
        const safeMaximum = Math.max(0, Number(maximumSeconds) || 0);
        if (safeMaximum <= simulationStepSeconds + epsilon) return null;
        const safeDenseThreshold = Math.min(safeMaximum, Math.max(0, Number(denseEventThreshold) || 0));
        // Short catch-up jobs used to probe only one 0.1 s tick. Any treasure
        // detected after that then paid for a full 16-pass boundary search on
        // nearly every outer step. Probe up to one real second once instead:
        // dense streams can be handed to the probability engine's batch path,
        // while sparse streams still retain exact event-boundary searching.
        const shortDenseProbeSeconds = safeMaximum <= 60 + epsilon
          ? Math.min(safeMaximum, Math.max(simulationStepSeconds * 4, 1))
          : 0;
        const denseProbeSeconds = Math.min(
          safeMaximum,
          Math.max(safeDenseThreshold, shortDenseProbeSeconds)
        );
        const resumable = options.continuation;
        const sourceKey = options.sourceKey ?? JSON.stringify([
          WIS.Core.State.toSerializable(state),
          WIS.Core.Registries.getActivePower(state)?.snapshotTreasureTransient?.(),
          WIS.Core.Registries.getActiveCultivation(state)?.snapshotTreasureTransient?.()
        ], (key, value) => key === "lastUpdateAt" ? undefined : value);
        const randomState = task.random?.snapshot?.();
        const integrationMethod = options.integrationMethod || "end";
        const continuationMatches = resumable?.kind === "treasure-event-search-v2" &&
          resumable.sourceKey === sourceKey && resumable.randomState === randomState &&
          resumable.integrationMethod === integrationMethod &&
          Math.abs(resumable.maximum - safeMaximum) <= epsilon &&
          Math.abs(resumable.denseProbeSeconds - denseProbeSeconds) <= epsilon;
        if (!continuationMatches && !treasureDriverSnapshot(state).active) return null;
        const work = continuationMatches ? resumable : {
          kind: "treasure-event-search-v2",
          sourceKey,
          maximum: safeMaximum,
          denseProbeSeconds,
          serializedState: WIS.Core.State.toSerializable(state),
          initialSignature: treasureEventSignature(state),
          randomState,
          integrationMethod,
          phase: denseProbeSeconds > simulationStepSeconds + epsilon ? "dense" : "full",
          densePrediction: null,
          fullPrediction: null,
          lowerSeconds: denseProbeSeconds,
          upperSeconds: safeMaximum,
          iteration: 0,
          partialPrediction: null
        };
        const pause = () => ({
          budgetExhausted: true,
          reason: "treasure-event-budget",
          seconds: simulationStepSeconds,
          continuation: work
        });
        if (work.phase === "dense") {
          work.densePrediction = runTreasurePrediction(
            work.serializedState,
            work.denseProbeSeconds,
            work.randomState,
            { ...options, continuation: work.partialPrediction }
          );
          work.partialPrediction = work.densePrediction.continuation;
          if (work.densePrediction.budgetExhausted) return pause();
          if (work.densePrediction.completed && work.densePrediction.signature !== work.initialSignature) {
            return {
              seconds: denseProbeSeconds,
              randomState: work.randomState,
              resultingSignature: work.densePrediction.signature,
              dense: true,
              batchSeconds: denseProbeSeconds
            };
          }
          work.phase = Math.abs(work.denseProbeSeconds - work.maximum) <= epsilon
            ? "evaluate-full"
            : "full";
        }

        if (work.phase === "full") {
          work.fullPrediction = runTreasurePrediction(
            work.serializedState,
            work.maximum,
            work.randomState,
            { ...options, continuation: work.partialPrediction }
          );
          work.partialPrediction = work.fullPrediction.continuation;
          if (work.fullPrediction.budgetExhausted) return pause();
          work.phase = "evaluate-full";
        }

        if (work.phase === "evaluate-full") {
          if (!work.fullPrediction) work.fullPrediction = work.densePrediction;
          if (!work.fullPrediction?.completed ||
              work.fullPrediction.signature === work.initialSignature) return null;
          work.phase = "bisect";
        }

        while (work.iteration < boundaryBisections) {
          const middleSeconds = (work.lowerSeconds + work.upperSeconds) / 2;
          const prediction = runTreasurePrediction(
            work.serializedState,
            middleSeconds,
            work.randomState,
            { ...options, continuation: work.partialPrediction }
          );
          work.partialPrediction = prediction.continuation;
          if (prediction.budgetExhausted) {
            return pause();
          }
          if (prediction.completed && prediction.signature !== work.initialSignature) {
            work.upperSeconds = middleSeconds;
          } else {
            work.lowerSeconds = middleSeconds;
          }
          work.iteration += 1;
        }
        return {
          seconds: Math.min(work.maximum, Math.max(simulationStepSeconds, work.upperSeconds)),
          randomState: work.randomState,
          resultingSignature: work.fullPrediction.signature
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
