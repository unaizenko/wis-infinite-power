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
      const {
        BN, ZERO, add, sub, mul, div, abs, log10, eq, gt, max: maxBN, lt, lte, gte, toNumber
      } = WIS.Core.BigNum;
      const MAX_SAFE_INTEGER_BN = BN(Number.MAX_SAFE_INTEGER);
      const simulationStepSeconds = context.simulationStepSeconds;
      const epsilon = context.epsilon;
      const boundaryBisections = context.boundaryBisections;
      const monotonicNow = typeof context.clockNow === "function"
        ? context.clockNow
        : () => typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const actualScaleRequirement = typeof scaleRequirement === "function"
        ? scaleRequirement
        : (scaleIndex) => SCALE_THRESHOLDS[scaleIndex]?.power ?? ZERO;
      let transactionDepth = 0;
      let deferredSaveRequested = false;
      // Tokens only reuse a deterministic gain plan. Treasure rolls, purchases,
      // achievements and the resource commit still execute on the live state.
      const preparedPlans = new WeakMap();

      function stepStateKey(state) {
        return JSON.stringify(WIS.Core.State.toSerializable(state),
          (key, value) => key === "lastUpdateAt" ? undefined : value);
      }

      function cloneStepState(state) {
        // fromFlat reconstructs manual purchase history from current ownership;
        // that loses retained history after a reset. Preserve the complete
        // domain while retaining its legacy accessors for production formulas.
        return WIS.Core.State.cloneForSimulation(state);
      }

      function integrationMethod(options = {}) {
        return options.integrationMethod === "midpoint" ? "midpoint" : "end";
      }

      function planningBudgetExpired(options = {}) {
        const deadlineMs = Number(options.deadlineMs);
        return Number.isFinite(deadlineMs) && monotonicNow() >= deadlineMs;
      }

      function beginPlanningUnit(options) {
        const budget = options.workBudget;
        if (budget && budget.operations >= budget.maximumOperations) return false;
        if (planningBudgetExpired(options) && !(budget?.ensureProgress && budget.operations === 0)) {
          return false;
        }
        if (budget) budget.operations += 1;
        return true;
      }

      function compatibleRewardCount(value) {
        const count = maxBN(ZERO, BN(value)).floor();
        return lte(count, MAX_SAFE_INTEGER_BN)
          ? Math.max(0, Math.floor(toNumber(count, 0)))
          : count;
      }

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

      function calculateAutomaticStepPlan(elapsedSeconds, activePowerSystem, activeCultivationSystem, options = {}) {
        const state = getState();
        const method = integrationMethod(options);
        const reusable = options.offline === true || options.projection === true || options.withMeta === true;
        const sourceKey = reusable ? stepStateKey(state) : null;
        const mayIntegrateFrozenClock = options.offline === true && method === "midpoint" &&
          options.stableInventoryIntegration !== false && elapsedSeconds > simulationStepSeconds &&
          activePowerSystem?.id === "scale" &&
          (!activeCultivationSystem || activeCultivationSystem.id === "immortal") &&
          !state.activeChallenge && !automationMayChangeFormula(state) &&
          (state.unlockedAchievements?.trainingUp || state.totalElapsedSeconds >= 600 ||
            state.totalElapsedSeconds + elapsedSeconds <= 600) &&
          (!SCALE_THRESHOLDS[state.highestScaleIndex + 1] ||
            lt(state.power, actualScaleRequirement(state.highestScaleIndex + 1, state)));
        const sampleAt = (clockOffset) => {
          const projection = cloneStepState(state);
          const startingClocks = {
            reincarnationElapsedSeconds: projection.reincarnationElapsedSeconds,
            currentScaleElapsedSeconds: projection.currentScaleElapsedSeconds,
            activeChallengeElapsedSeconds: projection.activeChallengeElapsedSeconds
          };
          return WIS.Core.Runtime.withState(projection, () =>
            WIS.Core.Effects.withIsolatedState(projection, () => {
              // Resource-dependent softcap integrators remain unchanged. This
              // samples only explicit clock multipliers at the requested time.
              projectStepTimes(projection, clockOffset);
              const power = activePowerSystem?.calculateAutomaticGains?.(projection, elapsedSeconds)
                ?? { joules: ZERO, power: ZERO, rates: {} };
              projection.joules = add(projection.joules, power.joules);
              projection.power = add(projection.power, power.power);
              const cultivation = activeCultivationSystem?.planAutomaticGain?.(
                projection, elapsedSeconds
              ) ?? { completed: true, elapsedSeconds, processedSeconds: elapsedSeconds, remainingSeconds: 0 };
              const sample = { projection, power, cultivation };
              if (mayIntegrateFrozenClock && frozenInventoryPlan(state, sample, elapsedSeconds)) {
                sample.clockTreasureDrivers = [
                  WIS.Power.ScaleLogic.fitnessJBonus(), WIS.Power.ScaleLogic.rockPowerPerSecond(),
                  WIS.Power.ScaleLogic.ultimateIntentPowerSource(),
                  activeCultivationSystem ? WIS.Cultivation.ImmortalLogic.circulationManaPerSecond() : ZERO,
                  cultivation.immortalPowerActiveSeconds ?? 0
                ].map((value) => gt(value, ZERO)).join("|");
                sample.newClockAchievement = Object.entries(WIS.Meta.Achievements.states()).some(
                  ([key, completed]) => completed && !state.unlockedAchievements?.[key]
                );
              }
              Object.assign(projection, startingClocks);
              projectStepTimes(projection, elapsedSeconds);
              return sample;
            })
          );
        };
        let plan = sampleAt(elapsedSeconds * (method === "midpoint" ? 0.5 : 1));
        if (plan.clockTreasureDrivers !== undefined && !plan.newClockAchievement) {
          const start = sampleAt(0);
          if (start.clockTreasureDrivers === plan.clockTreasureDrivers && !start.newClockAchievement) {
            const end = sampleAt(elapsedSeconds);
            if (end.clockTreasureDrivers === plan.clockTreasureDrivers && !end.newClockAchievement) {
              plan = integrateFrozenClockPlans(state, start, plan, end, elapsedSeconds) || plan;
            }
          }
        }
        if (reusable) {
          const token = Object.freeze({ kind: "automatic-step-plan", elapsedSeconds, integrationMethod: method });
          preparedPlans.set(token, { sourceKey, elapsedSeconds, method,
            offlineExecution: WIS.Core.Runtime.isOfflineExecution(),
            stableInventoryIntegration: options.stableInventoryIntegration !== false,
            activePowerSystem, activeCultivationSystem, plan });
          plan.preparedStepPlan = token;
        }
        return plan;
      }

      function frozenInventoryPlan(source, plan, seconds) {
        if (WIS.Cultivation.Xiuzhen?.get(source).entered || WIS.Cultivation.Xiuzhen?.has(source, "yuanForce")) return false;
        const cultivation = plan.cultivation;
        if (cultivation.completed === false || cultivation.event || cultivation.instantEvent ||
            (cultivation.processedSeconds !== undefined && cultivation.processedSeconds !== seconds) ||
            (cultivation.finalExplorationLoad !== undefined &&
              !eq(cultivation.finalExplorationLoad, source.minorTribulationExplorationLoad))) return false;
        const gains = { joules: plan.power.joules, power: plan.power.power,
          mana: cultivation.mana ?? ZERO, immortalPower: cultivation.immortalPower ?? ZERO };
        return Object.entries(gains).every(([key, gain]) => {
          const container = key === "joules" || key === "power"
            ? source.core.resources : source.cultivation.systems.immortal.resources;
          const pending = add(container[`${key}GainResidual`] ?? ZERO, gain);
          return eq(add(source[key], pending), source[key]);
        });
      }

      function logarithmicGainMean(left, right) {
        if (eq(left, right)) return left;
        if (!gt(left, ZERO) || !gt(right, ZERO)) return null;
        const logRatio = log10(div(right, left));
        if (lte(abs(logRatio), 1e-8)) return mul(add(left, right), 0.5);
        return div(sub(right, left), mul(logRatio, Math.LN10));
      }

      function integrateFrozenClockPlans(source, start, middle, end, seconds) {
        const explorationAmount = middle.cultivation.explorationAmount ?? ZERO;
        if (![start, end].every((sample) =>
          eq(sample.cultivation.explorationAmount ?? ZERO, explorationAmount))) return null;
        const integrate = (read) => {
          const first = logarithmicGainMean(read(start) ?? ZERO, read(middle) ?? ZERO);
          const second = logarithmicGainMean(read(middle) ?? ZERO, read(end) ?? ZERO);
          return first === null || second === null ? null : mul(add(first, second), 0.5);
        };
        const joules = integrate((plan) => plan.power.joules);
        const power = integrate((plan) => plan.power.power);
        const passiveMana = integrate((plan) => plan.cultivation.passiveMana);
        const explorationMana = integrate((plan) => plan.cultivation.explorationMana);
        const immortalPower = integrate((plan) => plan.cultivation.immortalPower);
        if ([joules, power, passiveMana, explorationMana, immortalPower].some((value) => value === null)) return null;
        const mana = add(passiveMana, explorationMana);
        const integrated = {
          ...middle,
          power: { ...middle.power, joules, power,
            rates: { ...middle.power.rates, joulesPerSecond: div(joules, seconds), powerPerSecond: div(power, seconds) } },
          cultivation: { ...middle.cultivation, mana, passiveMana, explorationMana, immortalPower,
            passiveManaGain: passiveMana, explorationManaGain: explorationMana, immortalPowerGain: immortalPower },
          stableInventoryIntegrated: true
        };
        // Including carried residuals is essential: a collection of tiny gains
        // may finally become representable even though each sample was frozen.
        return frozenInventoryPlan(source, integrated, seconds) ? integrated : null;
      }

      function reusableAutomaticStepPlan(token, seconds, activePowerSystem, activeCultivationSystem, options = {}) {
        const prepared = token && preparedPlans.get(token);
        return prepared && prepared.elapsedSeconds === seconds &&
          prepared.method === integrationMethod(options) &&
          prepared.offlineExecution === WIS.Core.Runtime.isOfflineExecution() &&
          prepared.stableInventoryIntegration === (options.stableInventoryIntegration !== false) &&
          prepared.activePowerSystem === activePowerSystem &&
          prepared.activeCultivationSystem === activeCultivationSystem &&
          prepared.sourceKey === stepStateKey(getState())
          ? prepared.plan : null;
      }

      function requirementForState(scaleIndex, source) {
        return WIS.Core.Runtime.withState(source, () =>
          WIS.Core.Effects.withIsolatedState(source, () =>
            actualScaleRequirement(scaleIndex, source)
          )
        );
      }

      function nextScaleBoundarySeconds(
        maxSeconds,
        activePowerSystem,
        finalProjection,
        offline = false,
        options = {}
      ) {
        const finish = (seconds, budgetExhausted = false, continuation = null) => options.withMeta
          ? Object.freeze({
            seconds,
            budgetExhausted,
            reason: budgetExhausted ? "known-boundary-budget" : null,
            continuation
          })
          : seconds;
        const state = getState();
        const nextScaleIndex = state.highestScaleIndex + 1;
        const nextScale = SCALE_THRESHOLDS[nextScaleIndex];
        if (!nextScale) return finish(maxSeconds);
        const sourceKey = options.sourceKey ?? (options.withMeta || options.continuation
          ? JSON.stringify(WIS.Core.State.toSerializable(state),
            (key, value) => key === "lastUpdateAt" ? undefined : value)
          : null);
        const resumable = options.continuation;
        const work = resumable?.kind === "scale-boundary-v2" &&
          resumable.sourceKey === sourceKey && resumable.maximum === maxSeconds &&
          resumable.offline === offline && resumable.integrationMethod === integrationMethod(options)
          ? resumable
          : {
            kind: "scale-boundary-v2", sourceKey, maximum: maxSeconds, offline,
            integrationMethod: integrationMethod(options),
            checked: false, lower: 0, upper: maxSeconds, iteration: 0
          };
        const pause = () => finish(Math.min(maxSeconds, simulationStepSeconds), true, work);
        if (!work.checked) {
          if (!beginPlanningUnit(options)) return pause();
          const currentRequirement = actualScaleRequirement(nextScaleIndex, state);
          const finalRequirement = requirementForState(nextScaleIndex, finalProjection);
          if (!lt(state.power, currentRequirement) || !gte(finalProjection.power, finalRequirement)) {
            return finish(maxSeconds);
          }
          work.checked = true;
        }
        const boundaryPrecision = Math.max(epsilon, simulationStepSeconds * 0.25, Number.EPSILON * maxSeconds * 4);
        const bisections = offline
          ? Math.max(8, Math.ceil(Math.log2(Math.max(1, maxSeconds / boundaryPrecision))))
          : boundaryBisections;
        while (work.iteration < bisections) {
          if (!beginPlanningUnit(options)) return pause();
          const middle = (work.lower + work.upper) * 0.5;
          const projection = cloneStepState(state);
          const projectedResult = WIS.Core.Runtime.withState(projection, () =>
            WIS.Core.Effects.withIsolatedState(projection, () => {
              projectStepTimes(projection, middle * (integrationMethod(options) === "midpoint" ? 0.5 : 1));
              const power = activePowerSystem?.calculateAutomaticGains?.(projection, middle)
                ?? { joules: ZERO, power: ZERO };
              projection.joules = add(projection.joules, power.joules);
              projection.power = add(projection.power, power.power);
              if (integrationMethod(options) === "midpoint") projectStepTimes(projection, middle * 0.5);
              return {
                power: projection.power,
                requirement: actualScaleRequirement(nextScaleIndex, projection)
              };
            })
          );
          if (gte(projectedResult.power, projectedResult.requirement)) work.upper = middle;
          else work.lower = middle;
          work.iteration += 1;
        }
        return finish(work.upper);
      }

      function nextChallengeTimeBoundarySeconds(maxSeconds) {
        const state = getState();
        const challenge = state.activeChallenge ? CHALLENGE_DEFINITIONS[state.activeChallenge] : null;
        const limit = Number(challenge?.timeToLimitSeconds) || 0;
        const current = Math.max(0, Number(state.activeChallengeElapsedSeconds) || 0);
        if (!(limit > current) || current + maxSeconds <= limit) return maxSeconds;
        return limit - current;
      }

      function automationMayChangeFormula(state) {
        const achievements = state.unlockedAchievements || {};
        return Boolean(
          (state.scaleUpgradeAutomationEnabled && achievements.scale6) ||
          (state.scaleActionAutomationEnabled && achievements.trueScale7) ||
          (state.immortalAbilityAutomationEnabled && achievements.infantSpirit) ||
          (state.immortalRealmAutomationEnabled && achievements.bodyIntegration)
        );
      }

      function automaticChangesAtPlan(stepPlan, seconds, activePowerSystem) {
        const liveState = getState();
        const projection = cloneStepState(stepPlan.projection);
        const cultivation = stepPlan.cultivation;
        projection.mana = cultivation.finalMana ?? add(projection.mana, cultivation.mana ?? ZERO);
        projection.immortalPower = cultivation.finalImmortalPower ??
          add(projection.immortalPower, cultivation.immortalPower ?? ZERO);
        const previousRates = { ...WIS.tmp.rates };
        return WIS.Core.Runtime.withProjection(() => WIS.Core.Runtime.withRandomSource(() => {
          throw new Error("Automatic purchase boundary prediction must not draw random numbers");
        }, () => {
          WIS.Core.Runtime.setState(projection);
          try {
            return WIS.Core.Effects.withIsolatedState(projection, () => {
              activePowerSystem?.afterStep?.(projection, seconds);
              recordCurrentAchievements();
              return runAchievementAutomations() > 0;
            });
          } finally {
            WIS.Core.Runtime.setState(liveState);
            WIS.Core.Effects.invalidate();
            Object.assign(WIS.tmp.rates, previousRates);
          }
        }));
      }

      function nextAutomationBoundarySeconds(maxSeconds, activePowerSystem, activeCultivationSystem, plan, options = {}) {
        const finish = (seconds, budgetExhausted = false, continuation = null) => ({ seconds, budgetExhausted, continuation });
        if (!automationMayChangeFormula(getState()) || !(maxSeconds > simulationStepSeconds)) return finish(maxSeconds);
        const resumable = options.continuation;
        const work = resumable?.kind === "automation-boundary-v1" &&
          resumable.sourceKey === options.sourceKey && resumable.maximum === maxSeconds &&
          resumable.integrationMethod === integrationMethod(options)
          ? resumable
          : {
            kind: "automation-boundary-v1", sourceKey: options.sourceKey,
            maximum: maxSeconds, integrationMethod: integrationMethod(options),
            checked: false, lower: 0, upper: maxSeconds
          };
        const pause = () => finish(Math.min(maxSeconds, simulationStepSeconds), true, work);
        if (!work.checked) {
          if (!beginPlanningUnit(options)) return pause();
          const finalPlan = plan?.preparedStepPlan?.elapsedSeconds === maxSeconds
            ? plan : calculateAutomaticStepPlan(maxSeconds, activePowerSystem, activeCultivationSystem, options);
          if (!automaticChangesAtPlan(finalPlan, maxSeconds, activePowerSystem)) return finish(maxSeconds);
          work.checked = true;
        }
        // Buying at an interval's end in both the full and the half trial can
        // hide the same missed multiplier interval. Locate its first reachable
        // time instead of relying only on equal final discrete signatures.
        while (work.upper - work.lower > Math.max(epsilon, simulationStepSeconds * 0.25)) {
          if (!beginPlanningUnit(options)) return pause();
          const middle = (work.lower + work.upper) * 0.5;
          const trial = calculateAutomaticStepPlan(middle, activePowerSystem, activeCultivationSystem, options);
          if (automaticChangesAtPlan(trial, middle, activePowerSystem)) work.upper = middle;
          else work.lower = middle;
        }
        return finish(work.upper);
      }

      function nextKnownSimulationBoundarySeconds(maxSeconds, options = {}) {
        if (options.offline && !WIS.Core.Runtime.isOfflineExecution()) {
          return WIS.Core.Runtime.withOfflineExecution(() =>
            nextKnownSimulationBoundarySeconds(maxSeconds, options));
        }
        const finish = (seconds, budgetExhausted = false, continuation = null, preparedStepPlan = null) => options.withMeta
          ? Object.freeze({
            seconds,
            budgetExhausted,
            reason: budgetExhausted ? "known-boundary-budget" : null,
            continuation,
            preparedStepPlan
          })
          : seconds;
        const state = getState();
        const activePowerSystem = WIS.Core.Registries.getActivePower(state);
        const activeCultivationSystem = WIS.Core.Registries.getActiveCultivation(state);
        const sourceKey = options.sourceKey ?? JSON.stringify(WIS.Core.State.toSerializable(state),
          (key, value) => key === "lastUpdateAt" ? undefined : value);
        const resumable = options.continuation;
        const work = resumable?.kind === "known-boundary-v2" &&
          resumable.sourceKey === sourceKey && resumable.maximum === maxSeconds &&
          resumable.offline === (options.offline === true) &&
          resumable.integrationMethod === integrationMethod(options)
          ? resumable
          : {
            kind: "known-boundary-v2", sourceKey, maximum: maxSeconds,
            offline: options.offline === true,
            integrationMethod: integrationMethod(options),
            boundarySeconds: nextChallengeTimeBoundarySeconds(maxSeconds),
            stepPlan: null, scaleContinuation: null, scaleChecked: false, automationContinuation: null
          };
        const pause = () => finish(Math.min(work.boundarySeconds, simulationStepSeconds), true, work);
        if (!work.stepPlan) {
          if (!beginPlanningUnit(options)) return pause();
          work.stepPlan = calculateAutomaticStepPlan(
            work.boundarySeconds, activePowerSystem, activeCultivationSystem, options
          );
          if (work.stepPlan.cultivation.instantEvent) {
            return finish(Math.min(work.boundarySeconds, simulationStepSeconds));
          }
          const plannedCultivationSeconds = work.stepPlan.cultivation.processedSeconds === undefined
            ? work.boundarySeconds
            : Number(work.stepPlan.cultivation.processedSeconds);
          if (Number.isFinite(plannedCultivationSeconds) && plannedCultivationSeconds > 0) {
            work.boundarySeconds = Math.min(work.boundarySeconds, plannedCultivationSeconds);
          }
        }
        if (!work.scaleChecked) {
          const scaleBoundary = nextScaleBoundarySeconds(
            work.boundarySeconds,
            activePowerSystem,
            work.stepPlan.projection,
            options.offline === true,
            { ...options, sourceKey, continuation: work.scaleContinuation, withMeta: true }
          );
          work.scaleContinuation = scaleBoundary.continuation;
          if (scaleBoundary.budgetExhausted) return pause();
          work.boundarySeconds = Math.min(work.boundarySeconds, scaleBoundary.seconds);
          work.scaleChecked = true;
        }
        if (options.offline === true) {
          const automationBoundary = nextAutomationBoundarySeconds(
            work.boundarySeconds, activePowerSystem, activeCultivationSystem, work.stepPlan,
            { ...options, sourceKey, continuation: work.automationContinuation }
          );
          work.automationContinuation = automationBoundary.continuation;
          if (automationBoundary.budgetExhausted) return pause();
          work.boundarySeconds = Math.min(work.boundarySeconds, automationBoundary.seconds);
        }
        return finish(work.boundarySeconds, false, null,
          work.stepPlan.preparedStepPlan?.elapsedSeconds === work.boundarySeconds
            ? work.stepPlan.preparedStepPlan : null);
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
          resourceGains: {
            joules: ZERO, power: ZERO,
            mana: eventUpdate?.mana ?? ZERO,
            immortalPower: eventUpdate?.immortalPower ?? ZERO
          },
          processedSeconds: 0,
          remainingSeconds: requestedSeconds,
          eventCommitted: postProcess.eventCommitted,
          requiresReplan: postProcess.eventCommitted,
          formulaChanged: postProcess.eventCommitted,
          discreteEvent: instantEvent
        };
      }

      function advanceGameStep(elapsedSeconds, silentTreasureRolls, options = {}) {
        if (options.offline && !WIS.Core.Runtime.isOfflineExecution()) {
          return WIS.Core.Runtime.withOfflineExecution(() =>
            advanceGameStepWithContext(elapsedSeconds, silentTreasureRolls, options));
        }
        return advanceGameStepWithContext(elapsedSeconds, silentTreasureRolls, options);
      }

      function advanceGameStepWithContext(elapsedSeconds, silentTreasureRolls, {
        skipTreasureRolls = false, projection = false, offline = false,
        integrationMethod: requestedIntegrationMethod = "end", preparedStepPlan = null,
        stableInventoryIntegration = true
      } = {}) {
        const state = getState();
        WIS.Meta.TreasureProgress?.ensure(state);
        const requestedSeconds = Math.max(0, Number(elapsedSeconds) || 0);
        if (!(requestedSeconds > 0)) return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: 0 };
        const publishRates = !projection && !WIS.Core.Runtime.isProjection();
        const previousRates = publishRates ? null : { ...WIS.tmp.rates };
        const activePowerSystem = WIS.Core.Registries.getActivePower(state);
        const activeCultivationSystem = WIS.Core.Registries.getActiveCultivation(state);
        const planOptions = { integrationMethod: requestedIntegrationMethod, projection, offline, stableInventoryIntegration };
        const previousScaleIndex = state.highestScaleIndex;
        const bigNumbersActive = WIS.Meta.BigNumbers?.syncUnlock(state) === true;
        const bigNumbersStartPower = state.power;
        const previousProgressFlags = [state.brickUnlocked, state.wallUnlocked, state.activeChallenge];
        const previousProgressRewards = JSON.stringify([state.challengeCompletions, state.symbolicPowerMilestones]);
        // Treasure progress is submitted at the same original logic-frame
        // boundary online and offline. A caller requesting a long interval must
        // continue its remainder, never delay all inventory feedback to its end.
        const treasureFrameLimit = WIS.Simulation.FastForward?.intervalFrames > 1 ? requestedSeconds : (!skipTreasureRolls && WIS.Meta.TreasureProgress ? simulationStepSeconds : requestedSeconds);
        let committedSeconds = nextChallengeTimeBoundarySeconds(Math.min(requestedSeconds, treasureFrameLimit));
        let stepPlan = reusableAutomaticStepPlan(
          preparedStepPlan, committedSeconds, activePowerSystem, activeCultivationSystem, planOptions
        ) || calculateAutomaticStepPlan(committedSeconds, activePowerSystem, activeCultivationSystem, planOptions);
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
            committedSeconds, activePowerSystem, stepPlan.projection, offline, planOptions
          );
          const scaleBoundaryLimited = scaleSeconds + epsilon < committedSeconds &&
            scaleSeconds <= cultivationSeconds + epsilon;
          const nextCommittedSeconds = Math.min(committedSeconds, cultivationSeconds, scaleSeconds);
          if (!(nextCommittedSeconds > 0)) {
            return { gainedPearls: 0, processedSeconds: 0, remainingSeconds: requestedSeconds, eventCommitted: false };
          }
          if (nextCommittedSeconds === committedSeconds && stepPlan.cultivation.completed !== false) break;
          committedSeconds = nextCommittedSeconds;
          stepPlan = calculateAutomaticStepPlan(committedSeconds, activePowerSystem, activeCultivationSystem, planOptions);
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

        const bigNumberPlan = bigNumbersActive ? WIS.Meta.BigNumbers.prepare(state, committedSeconds, {
          startPower: bigNumbersStartPower,
          endPower: add(state.power, add(state.powerGainResidual ?? ZERO, stepPlan.power?.power ?? ZERO)),
          stepSeconds: simulationStepSeconds,
          interval: committedSeconds > simulationStepSeconds + epsilon
        }) : null;
        WIS.Core.Effects.invalidate();
        WIS.Core.Effects.beginTick(state);
        state.reincarnationElapsedSeconds = stepPlan.projection.reincarnationElapsedSeconds;
        state.currentScaleElapsedSeconds = stepPlan.projection.currentScaleElapsedSeconds;
        state.activeChallengeElapsedSeconds = stepPlan.projection.activeChallengeElapsedSeconds;
        activePowerSystem?.commitAutomaticGains?.(state, stepPlan.power, { writeRates: publishRates });
        const cultivationUpdate = activeCultivationSystem?.commitAutomaticGain?.(
          state,
          stepPlan.cultivation,
          { writeRates: publishRates, skipTreasureRolls }
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
          gainedPearls = compatibleRewardCount(activeCultivationSystem
            ?.rollPassiveManaTreasure?.(committedSeconds, passiveManaRate, silentTreasureRolls));
          activePowerSystem?.rollPassiveTreasure?.(state, committedSeconds, silentTreasureRolls);
          activeCultivationSystem?.rollCirculationTreasure?.(state, committedSeconds, silentTreasureRolls);
          activeCultivationSystem?.rollImmortalPowerTreasure?.(
            state, cultivationUpdate?.immortalPowerActiveSeconds, silentTreasureRolls
          );
        }
        activePowerSystem?.afterStep?.(state, committedSeconds);
        // The new domain never feeds back into the old resources. Commit only
        // elapsed, confirmed time; projection/interval rollback includes meta.
        if (bigNumberPlan) state.meta.bigNumbers = bigNumberPlan;
        const realmUpdate = handleCultivationRealmBoundary(discreteEvent, cultivationUpdate);
        updateLifetimeStatistics();
        const achievementsChanged = recordCurrentAchievements();
        WIS.Meta.BigNumbers?.syncUnlock(state);
        if (achievementsChanged && !projection) markAchievementsDirty();
        let automationChanges = 0;
        if (!isCultivationRealmBoundaryEvent(discreteEvent)) {
          automationChanges = runAchievementAutomations();
          if (automationChanges > 0) {
            if (recordCurrentAchievements() && !projection) markAchievementsDirty();
            if (!projection) markCostGroupsDirty();
          }
        }
        Object.assign(WIS.tmp.rates, publishRates ? committedRates : previousRates);
        if (["mortalTransformation", "yinVoidYangReal"].includes(state.activeChallenge)) checkActiveChallengeCompletion();
        return {
          gainedPearls,
          // Report the committed increments directly. Subtracting two enormous
          // inventories can erase a valid small gain and conceal trial error.
          resourceGains: {
            joules: stepPlan.power?.joules ?? ZERO,
            power: stepPlan.power?.power ?? ZERO,
            mana: cultivationUpdate?.mana ?? ZERO,
            immortalPower: cultivationUpdate?.immortalPower ?? ZERO,
            xianForce: cultivationUpdate?.xiuzhen?.xianForce ?? ZERO,
            yuanForce: cultivationUpdate?.xiuzhen?.yuanForce ?? ZERO
          },
          processedSeconds: committedSeconds,
          preparedStepPlan: stepPlan.preparedStepPlan,
          stableInventoryIntegrated: stepPlan.stableInventoryIntegrated === true,
          remainingSeconds: Math.max(0, requestedSeconds - committedSeconds),
          eventCommitted: cultivationUpdate?.eventCommitted === true,
          requiresReplan: Boolean(discreteEvent?.requiresGlobalReplan) ||
            committedSeconds + epsilon < requestedSeconds,
          formulaChanged: automationChanges > 0 || achievementsChanged ||
            state.highestScaleIndex !== previousScaleIndex || realmUpdate.breakthroughs > 0 ||
            previousProgressFlags.some((value, index) =>
              value !== [state.brickUnlocked, state.wallUnlocked, state.activeChallenge][index]) ||
            previousProgressRewards !== JSON.stringify([state.challengeCompletions, state.symbolicPowerMilestones]) ||
            Boolean(discreteEvent?.requiresGlobalReplan),
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
          gainedPearls = compatibleRewardCount(add(gainedPearls, result.gainedPearls));
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
