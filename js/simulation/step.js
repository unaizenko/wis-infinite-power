(function defineSimulationStep(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.Step = Object.freeze({
    create(context) {
      const {
        getState, persistStateNow, updateLifetimeStatistics,
        recordCurrentAchievements, markAchievementsDirty, markCostGroupsDirty,
        checkActiveChallengeCompletion, autoBreakthroughImmortalRealms,
        runAchievementAutomations, showScaleNotice, scaleRequirement
      } = context;
      const CONFIG = WIS.Core.Config;
      const SCALE_THRESHOLDS = CONFIG.scales;
      const CHALLENGE_DEFINITIONS = CONFIG.challenges;
      const { ZERO, add, lt, gte, toNumber } = WIS.Core.BigNum;
      const simulationStepSeconds = context.simulationStepSeconds;
      const epsilon = context.epsilon;
      const boundaryBisections = context.boundaryBisections;
      const actualScaleRequirement = typeof scaleRequirement === "function"
        ? scaleRequirement
        : (scaleIndex) => SCALE_THRESHOLDS[scaleIndex]?.power ?? ZERO;
      let transactionDepth = 0;
      let deferredSaveRequested = false;

      function requestSave() {
        if (WIS.Core.Runtime.isProjection()) return;
        if (transactionDepth > 0) {
          deferredSaveRequested = true;
          return;
        }
        persistStateNow();
      }

      function flushDeferredSave() {
        if (transactionDepth > 0 || !deferredSaveRequested) return;
        deferredSaveRequested = false;
        persistStateNow();
      }

      function beginTransaction() {
        transactionDepth += 1;
      }

      function endTransaction() {
        transactionDepth = Math.max(0, transactionDepth - 1);
        flushDeferredSave();
      }

      function projectStepTimes(projection, elapsedSeconds) {
        projection.reincarnationElapsedSeconds += elapsedSeconds;
        projection.currentScaleElapsedSeconds += elapsedSeconds;
        if (projection.activeChallenge) {
          const timeLimit = CHALLENGE_DEFINITIONS[projection.activeChallenge]?.timeToLimitSeconds;
          const nextElapsed = projection.activeChallengeElapsedSeconds + elapsedSeconds;
          projection.activeChallengeElapsedSeconds = timeLimit
            ? Math.min(timeLimit, nextElapsed)
            : nextElapsed;
        }
      }

      function calculateAutomaticStepPlan(elapsedSeconds, activePowerSystem, activeCultivationSystem) {
        const state = getState();
        const projection = WIS.Core.State.fromFlat(WIS.Core.State.toFlat(state));
        return WIS.Core.Runtime.withState(projection, () =>
          WIS.Core.Effects.withIsolatedState(projection, () => {
            projectStepTimes(projection, elapsedSeconds);
            const power = activePowerSystem?.calculateAutomaticGains?.(projection, elapsedSeconds)
              ?? { joules: ZERO, power: ZERO, rates: {} };
            projection.joules = add(projection.joules, power.joules);
            projection.power = add(projection.power, power.power);
            const cultivation = activeCultivationSystem?.planAutomaticGain?.(
              projection, elapsedSeconds
            ) ?? {
              completed: true,
              elapsedSeconds,
              processedSeconds: elapsedSeconds,
              remainingSeconds: 0
            };
            return { projection, power, cultivation };
          })
        );
      }

      function requirementForState(scaleIndex, source) {
        return WIS.Core.Runtime.withState(source, () =>
          WIS.Core.Effects.withIsolatedState(source, () =>
            actualScaleRequirement(scaleIndex, source)
          )
        );
      }

      function nextScaleBoundarySeconds(maxSeconds, activePowerSystem, finalProjection, offline = false) {
        const state = getState();
        const nextScaleIndex = state.highestScaleIndex + 1;
        const nextScale = SCALE_THRESHOLDS[nextScaleIndex];
        if (!nextScale) return maxSeconds;
        const currentRequirement = actualScaleRequirement(nextScaleIndex, state);
        const finalRequirement = requirementForState(nextScaleIndex, finalProjection);
        if (!lt(state.power, currentRequirement) || !gte(finalProjection.power, finalRequirement)) return maxSeconds;
        let lower = 0;
        let upper = maxSeconds;
        const bisections = offline ? 8 : boundaryBisections;
        for (let iteration = 0; iteration < bisections; iteration += 1) {
          const middle = (lower + upper) * 0.5;
          const projection = WIS.Core.State.fromFlat(WIS.Core.State.toFlat(state));
          const projectedResult = WIS.Core.Runtime.withState(projection, () =>
            WIS.Core.Effects.withIsolatedState(projection, () => {
              projectStepTimes(projection, middle);
              const power = activePowerSystem?.calculateAutomaticGains?.(projection, middle)
                ?? { joules: ZERO, power: ZERO };
              projection.joules = add(projection.joules, power.joules);
              projection.power = add(projection.power, power.power);
              return {
                power: projection.power,
                requirement: actualScaleRequirement(nextScaleIndex, projection)
              };
            })
          );
          if (gte(projectedResult.power, projectedResult.requirement)) upper = middle;
          else lower = middle;
        }
        return upper;
      }

      function nextChallengeTimeBoundarySeconds(maxSeconds) {
        const state = getState();
        const challenge = state.activeChallenge ? CHALLENGE_DEFINITIONS[state.activeChallenge] : null;
        const limit = Number(challenge?.timeToLimitSeconds) || 0;
        const current = Math.max(0, Number(state.activeChallengeElapsedSeconds) || 0);
        if (!(limit > current) || current + maxSeconds <= limit) return maxSeconds;
        return limit - current;
      }

      function nextKnownSimulationBoundarySeconds(maxSeconds) {
        const state = getState();
        const activePowerSystem = WIS.Core.Registries.getActivePower(state);
        const activeCultivationSystem = WIS.Core.Registries.getActiveCultivation(state);
        let boundarySeconds = nextChallengeTimeBoundarySeconds(maxSeconds);
        const stepPlan = calculateAutomaticStepPlan(boundarySeconds, activePowerSystem, activeCultivationSystem);
        if (stepPlan.cultivation.instantEvent) return Math.min(boundarySeconds, simulationStepSeconds);
        const plannedCultivationSeconds = stepPlan.cultivation.processedSeconds === undefined
          ? boundarySeconds
          : Number(stepPlan.cultivation.processedSeconds);
        if (Number.isFinite(plannedCultivationSeconds) && plannedCultivationSeconds > 0) {
          boundarySeconds = Math.min(boundarySeconds, plannedCultivationSeconds);
        }
        return Math.min(
          boundarySeconds,
          nextScaleBoundarySeconds(boundarySeconds, activePowerSystem, stepPlan.projection)
        );
      }

      function isCultivationRealmBoundaryEvent(event) {
        return ["manaRealmRequirement", "immortalRealmRequirement"].includes(event?.type);
      }

      function handleCultivationRealmBoundary(event, eventUpdate) {
        const eventCommitted = eventUpdate?.eventCommitted === true;
        const realmBoundaryHandled = eventCommitted && isCultivationRealmBoundaryEvent(event);
        if (!realmBoundaryHandled) {
          return { eventCommitted, realmBoundaryHandled: false, breakthroughs: 0, challengeCompleted: false };
        }
        const breakthroughs = autoBreakthroughImmortalRealms();
        if (!(breakthroughs > 0)) {
          return { eventCommitted, realmBoundaryHandled: true, breakthroughs: 0, challengeCompleted: false };
        }
        WIS.Core.Effects.invalidate();
        const challengeCompleted = checkActiveChallengeCompletion();
        if (!WIS.Core.Runtime.isProjection()) {
          markCostGroupsDirty();
          markAchievementsDirty();
        }
        return { eventCommitted, realmBoundaryHandled: true, breakthroughs, challengeCompleted };
      }

      function commitInstantCultivationEvent(activeCultivationSystem, instantEvent, cultivationPlan, requestedSeconds) {
        const eventUpdate = activeCultivationSystem?.commitAutomaticGain?.(getState(), cultivationPlan, {
          writeRates: false
        });
        const postProcess = handleCultivationRealmBoundary(instantEvent, eventUpdate);
        return {
          gainedPearls: 0,
          processedSeconds: 0,
          remainingSeconds: requestedSeconds,
          eventCommitted: postProcess.eventCommitted,
          requiresReplan: postProcess.eventCommitted,
          discreteEvent: instantEvent
        };
      }

      function advanceGameStep(elapsedSeconds, silentTreasureRolls, {
        skipTreasureRolls = false, projection = false, offline = false
      } = {}) {
        const state = getState();
        const requestedSeconds = Math.max(0, Number(elapsedSeconds) || 0);
        if (!(requestedSeconds > 0)) return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: 0 };
        const publishRates = !projection && !WIS.Core.Runtime.isProjection();
        const previousRates = publishRates ? null : { ...WIS.tmp.rates };
        const activePowerSystem = WIS.Core.Registries.getActivePower(state);
        const activeCultivationSystem = WIS.Core.Registries.getActiveCultivation(state);
        let committedSeconds = nextChallengeTimeBoundarySeconds(requestedSeconds);
        let stepPlan = calculateAutomaticStepPlan(committedSeconds, activePowerSystem, activeCultivationSystem);
        if (stepPlan.cultivation.instantEvent) {
          const result = commitInstantCultivationEvent(
            activeCultivationSystem, stepPlan.cultivation.instantEvent, stepPlan.cultivation, requestedSeconds
          );
          if (!publishRates) Object.assign(WIS.tmp.rates, previousRates);
          return result;
        }
        let discreteEvent = stepPlan.cultivation.event ?? null;
        for (let eventPass = 0; eventPass < 3; eventPass += 1) {
          const plannedCultivationSeconds = stepPlan.cultivation.processedSeconds === undefined
            ? committedSeconds
            : Number(stepPlan.cultivation.processedSeconds);
          const cultivationSeconds = Math.max(0, Math.min(
            committedSeconds,
            Number.isFinite(plannedCultivationSeconds) ? plannedCultivationSeconds : 0
          ));
          const scaleSeconds = nextScaleBoundarySeconds(
            committedSeconds, activePowerSystem, stepPlan.projection, offline
          );
          const scaleBoundaryLimited = scaleSeconds + epsilon < committedSeconds &&
            scaleSeconds <= cultivationSeconds + epsilon;
          const nextCommittedSeconds = Math.min(committedSeconds, cultivationSeconds, scaleSeconds);
          if (!(nextCommittedSeconds > 0)) {
            return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: requestedSeconds, eventCommitted: false };
          }
          if (nextCommittedSeconds === committedSeconds && stepPlan.cultivation.completed !== false) break;
          committedSeconds = nextCommittedSeconds;
          stepPlan = calculateAutomaticStepPlan(committedSeconds, activePowerSystem, activeCultivationSystem);
          if (stepPlan.cultivation.instantEvent) {
            const result = commitInstantCultivationEvent(
              activeCultivationSystem, stepPlan.cultivation.instantEvent, stepPlan.cultivation, requestedSeconds
            );
            if (!publishRates) Object.assign(WIS.tmp.rates, previousRates);
            return result;
          }
          discreteEvent = stepPlan.cultivation.event ?? null;
          if (offline && scaleBoundaryLimited) break;
        }
        if (stepPlan.cultivation.completed === false) {
          return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: requestedSeconds };
        }

        WIS.Core.Effects.invalidate();
        WIS.Core.Effects.beginTick(state);
        state.reincarnationElapsedSeconds = stepPlan.projection.reincarnationElapsedSeconds;
        state.currentScaleElapsedSeconds = stepPlan.projection.currentScaleElapsedSeconds;
        state.activeChallengeElapsedSeconds = stepPlan.projection.activeChallengeElapsedSeconds;
        activePowerSystem?.commitAutomaticGains?.(state, stepPlan.power, { writeRates: publishRates });
        const cultivationUpdate = activeCultivationSystem?.commitAutomaticGain?.(
          state,
          stepPlan.cultivation,
          { writeRates: publishRates }
        );
        const committedRates = {
          joulesPerSecond: stepPlan.power?.rates?.joulesPerSecond ?? ZERO,
          powerPerSecond: stepPlan.power?.rates?.powerPerSecond ?? ZERO,
          manaPerSecond: cultivationUpdate?.rates?.manaPerSecond ?? ZERO,
          immortalPowerPerSecond: cultivationUpdate?.rates?.immortalPowerPerSecond ?? ZERO,
          ...(stepPlan.power?.rates || {}),
          ...(cultivationUpdate?.rates || {})
        };
        if (discreteEvent?.requiresGlobalReplan) WIS.Core.Effects.invalidate();
        const passiveManaRate = Math.max(0, toNumber(
          cultivationUpdate?.rates?.passiveTreasureManaPerSecond
          ?? cultivationUpdate?.rates?.manaPerSecond,
          0
        ));
        let gainedPearls = 0;
        if (!skipTreasureRolls) {
          gainedPearls = Math.max(0, Number(activeCultivationSystem
            ?.rollPassiveManaTreasure?.(committedSeconds, passiveManaRate, silentTreasureRolls)) || 0);
          activePowerSystem?.rollPassiveTreasure?.(state, committedSeconds, silentTreasureRolls);
          activeCultivationSystem?.rollCirculationTreasure?.(state, committedSeconds, silentTreasureRolls);
          activeCultivationSystem?.rollImmortalPowerTreasure?.(
            state, cultivationUpdate?.immortalPowerActiveSeconds, silentTreasureRolls
          );
        }
        activePowerSystem?.afterStep?.(state, committedSeconds);
        handleCultivationRealmBoundary(discreteEvent, cultivationUpdate);
        updateLifetimeStatistics();
        if (recordCurrentAchievements() && !projection) markAchievementsDirty();
        if (!isCultivationRealmBoundaryEvent(discreteEvent)) {
          const automationChanges = runAchievementAutomations();
          if (automationChanges > 0) {
            if (recordCurrentAchievements() && !projection) markAchievementsDirty();
            if (!projection) markCostGroupsDirty();
          }
        }
        Object.assign(WIS.tmp.rates, publishRates ? committedRates : previousRates);
        return {
          gainedPearls,
          processedSeconds: committedSeconds,
          remainingSeconds: Math.max(0, requestedSeconds - committedSeconds),
          eventCommitted: cultivationUpdate?.eventCommitted === true,
          requiresReplan: Boolean(discreteEvent?.requiresGlobalReplan) ||
            committedSeconds + epsilon < requestedSeconds,
          discreteEvent
        };
      }

      function advanceGame(elapsedSeconds, { offline = false, clockSeconds = elapsedSeconds } = {}) {
        const state = getState();
        const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
        if (safeElapsed <= 0) return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: 0, remainingClockSeconds: 0 };
        const safeClockSeconds = Math.max(0, Number(clockSeconds) || 0);
        const previousScaleIndex = state.highestScaleIndex;
        let gainedPearls = 0;
        let processedSeconds = 0;
        let remaining = safeElapsed;
        const maxSteps = offline ? CONFIG.offlineMaxSteps : 5000;
        for (let step = 0; step < maxSteps && remaining > epsilon; step += 1) {
          const stepSeconds = Math.min(simulationStepSeconds, remaining);
          const result = advanceGameStep(stepSeconds, offline, { offline });
          gainedPearls += result.gainedPearls;
          processedSeconds += result.processedSeconds;
          remaining = Math.max(0, remaining - result.processedSeconds);
          if (result.remainingSeconds > 0) break;
        }
        const processedClockSeconds = safeElapsed > 0
          ? safeClockSeconds * Math.min(1, processedSeconds / safeElapsed)
          : 0;
        state.totalElapsedSeconds += processedClockSeconds;
        if (!offline && state.highestScaleIndex > previousScaleIndex) {
          showScaleNotice(SCALE_THRESHOLDS
            .slice(previousScaleIndex + 1, state.highestScaleIndex + 1)
            .map((scale) => scale.name));
        }
        return {
          gainedPearls,
          processedSeconds,
          remainingSeconds: Math.max(0, safeElapsed - processedSeconds),
          remainingClockSeconds: Math.max(0, safeClockSeconds - processedClockSeconds)
        };
      }

      return Object.freeze({
        requestSave, beginTransaction, endTransaction,
        projectStepTimes, calculateAutomaticStepPlan,
        nextKnownSimulationBoundarySeconds, advanceGameStep, advanceGame
      });
    }
  });
}(window.WIS));
