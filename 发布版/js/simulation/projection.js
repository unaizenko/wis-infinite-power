(function defineSimulationProjection(WIS) {
  "use strict";
  // COMPATIBILITY: legacy projection API is still assembled by game.js. The current offline
  // executor does not call adaptiveOfflineStepSeconds; keep the reference API without
  // changing settlement.

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.Projection = Object.freeze({
    create(context) {
      const {
        getState, setStateDirect, advanceGameStep, treasureDriverSignature,
        stateFlagSignature, recordSignature, offlineDiscreteStateKeys, challengeKeys
      } = context;
      const { ZERO, add, sub, mul, abs, max: maxBN, eq, isFiniteBN } = WIS.Core.BigNum;
      const resourceKeys = ["joules", "power", "mana", "immortalPower"];
      const epsilon = context.epsilon;
      const simulationStepSeconds = context.simulationStepSeconds;
      const maxDiscreteEventsPerStep = context.maxDiscreteEventsPerStep;
      const errorTolerance = context.errorTolerance;
      const monotonicNow = typeof context.clockNow === "function"
        ? context.clockNow
        : () => typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();

      function projectionBudgetExpired(options = {}) {
        const deadlineMs = Number(options.deadlineMs);
        return Number.isFinite(deadlineMs) && monotonicNow() >= deadlineMs;
      }

      function beginProjectionUnit(options) {
        const budget = options.workBudget;
        if (budget && budget.operations >= budget.maximumOperations) return false;
        if (projectionBudgetExpired(options) && !(budget?.ensureProgress && budget.operations === 0)) {
          return false;
        }
        if (budget) budget.operations += 1;
        return true;
      }

      function offlineDiscreteSignature(source) {
        const achievements = Object.keys(source.unlockedAchievements || {})
          .filter((key) => source.unlockedAchievements[key]).sort().join(",");
        const milestones = Object.keys(source.symbolicPowerMilestones || {})
          .filter((key) => source.symbolicPowerMilestones[key]).sort().join(",");
        return [
          source.highestScaleIndex,
          source.activeChallenge,
          source.cultivation?.active,
          stateFlagSignature(offlineDiscreteStateKeys, source),
          recordSignature(source.challengeCompletions, challengeKeys),
          achievements,
          milestones
        ].join("|");
      }

      function runOfflineProjection(serializedState, stepParts, options = {}) {
        if (!WIS.Core.Runtime.isOfflineExecution()) {
          return WIS.Core.Runtime.withOfflineExecution(() => runOfflineProjection(serializedState, stepParts, options));
        }
        return WIS.Core.Runtime.withProjection(() => {
          const liveState = getState();
          const resumable = options.continuation;
          const inputKey = JSON.stringify(serializedState);
          const partsKey = JSON.stringify(stepParts);
          const integrationMethod = options.integrationMethod || "midpoint";
          const work = resumable?.kind === "offline-projection-v2" &&
            resumable.inputKey === inputKey && resumable.partsKey === partsKey &&
            resumable.integrationMethod === integrationMethod
            ? resumable
            : {
              kind: "offline-projection-v2", inputKey, partsKey, integrationMethod,
              state: WIS.Core.State.normalizeDomain(serializedState),
              partIndex: 0, remaining: Math.max(0, Number(stepParts[0]) || 0), eventPasses: 0,
              gains: resourceKeys.map(() => ZERO), gainsReported: true, processedSeconds: 0,
              advanceCount: 0, preparedStepPlan: null
            };
          const projectionState = work.state;
          let completed = true;
          let budgetExhausted = false;
          let projectionTreasureDriverSignature = "";
          setStateDirect(projectionState);
          try {
            WIS.Core.Effects.withIsolatedState(projectionState, () => {
              while (work.partIndex < stepParts.length) {
                while (work.remaining > epsilon && work.eventPasses < maxDiscreteEventsPerStep * 4) {
                  if (!beginProjectionUnit(options)) {
                    completed = false;
                    budgetExhausted = true;
                    break;
                  }
                  const result = advanceGameStep(work.remaining, true, {
                    skipTreasureRolls: true,
                    projection: true,
                    offline: true,
                    preparedStepPlan: work.advanceCount === 0 ? options.preparedStepPlan : null,
                    integrationMethod
                  });
                  work.advanceCount += 1;
                  if (work.advanceCount === 1) work.preparedStepPlan = result.preparedStepPlan || null;
                  if (result.resourceGains) {
                    work.gains = work.gains.map((gain, index) =>
                      add(gain, result.resourceGains[resourceKeys[index]] ?? ZERO));
                  } else {
                    work.gainsReported = false;
                  }
                  const processed = Math.max(0, Math.min(work.remaining, Number(result.processedSeconds) || 0));
                  work.processedSeconds += processed;
                  work.remaining = Math.max(0, work.remaining - processed);
                  work.eventPasses += 1;
                  if (!(processed > 0) && !result.eventCommitted) break;
                }
                if (work.remaining > epsilon) {
                  completed = false;
                  break;
                }
                work.partIndex += 1;
                work.remaining = Math.max(0, Number(stepParts[work.partIndex]) || 0);
                work.eventPasses = 0;
              }
              if (!budgetExhausted) projectionTreasureDriverSignature = treasureDriverSignature(getState());
            });
            const state = getState();
            work.state = state;
            return {
              completed,
              budgetExhausted,
              continuation: budgetExhausted ? work : null,
              gains: work.gainsReported ? work.gains : null,
              processedSeconds: work.processedSeconds,
              preparedStepPlan: completed && work.advanceCount === 1 && stepParts.length === 1
                ? work.preparedStepPlan : null,
              resources: [state.joules, state.power, state.mana, state.immortalPower],
              discreteSignature: offlineDiscreteSignature(state),
              treasureDriverSignature: projectionTreasureDriverSignature,
              serializedState: budgetExhausted ? null : WIS.Core.State.toSerializable(state)
            };
          } finally {
            setStateDirect(liveState);
            WIS.Core.Effects.invalidate();
          }
        });
      }

      function offlineResourceClose(left, right) {
        if (eq(left, right)) return true;
        return WIS.Simulation.Accuracy.compare(left, right,
          { relativeTolerance: errorTolerance, absoluteTolerance: errorTolerance }).pass;
      }

      function offlineGainClose(left, right) {
        return WIS.Simulation.Accuracy.compare(left, right,
          { relativeTolerance: errorTolerance, absoluteTolerance: 0 }).pass;
      }

      // Availability is discrete; the 0.25% rate/probability buckets are not.
      // Requiring their strings to remain identical used to pin otherwise
      // smooth resource curves to the online replay interval indefinitely.
      function treasureAvailabilitySignature(signature = "") {
        return signature.split("|").map((part) => {
          if (part.startsWith("immortalChance:")) {
            return part.endsWith(":inactive") ? part : "immortalChance:active";
          }
          return part.replace(/^([^:]+:1:)(?:-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|cap|zero)$/i, "$1value");
        }).join("|");
      }

      function evaluateProjectionError(fullStep, halfSteps, seconds, errorBudget) {
        const expectedGains = halfSteps.gains || halfSteps.resources.map(() => ZERO);
        const errorEstimate = expectedGains.map((gain, index) => maxBN(
          abs(sub(fullStep.gains?.[index] ?? gain, gain)),
          abs(sub(fullStep.resources[index], halfSteps.resources[index]))
        ));
        const errorTerms = errorEstimate.map((error) => [{ scale: error, weight: 1 }]);
        const phaseMatches = fullStep.completed && halfSteps.completed &&
          fullStep.discreteSignature === halfSteps.discreteSignature &&
          treasureAvailabilitySignature(fullStep.treasureDriverSignature) ===
            treasureAvailabilitySignature(halfSteps.treasureDriverSignature);
        if (!errorBudget) {
          return {
            acceptable: phaseMatches &&
              fullStep.resources.every((value, index) => offlineResourceClose(value, halfSteps.resources[index])) &&
              (!fullStep.gains || !halfSteps.gains ||
                fullStep.gains.every((value, index) => offlineGainClose(value, halfSteps.gains[index]))),
            errorEstimate, errorTerms, expectedGains, qualityRatio: 1
          };
        }

        const duration = Math.max(epsilon, Number(errorBudget.totalSeconds) || seconds);
        const processed = Math.max(0, Number(errorBudget.processedSeconds) || 0);
        const accumulatedFraction = Math.min(1, (processed + seconds) / duration);
        const localFraction = Math.min(1, seconds / duration);
        const relativeTolerance = Math.max(0, Number(errorBudget.relativeTolerance) || 0);
        let qualityRatio = 0;
        let budgetExceeded = false;
        let acceptable = phaseMatches && Boolean(fullStep.gains && halfSteps.gains);
        const verification = [];
        if (fullStep.processedSeconds !== undefined && halfSteps.processedSeconds !== undefined) {
          acceptable = acceptable && Math.abs(fullStep.processedSeconds - seconds) <= epsilon * 8 &&
            Math.abs(halfSteps.processedSeconds - seconds) <= epsilon * 8;
        }
        for (let index = 0; index < expectedGains.length; index += 1) {
          const gain = abs(expectedGains[index]);
          const priorGain = abs(errorBudget.gains?.[index] ?? ZERO);
          const priorError = abs(errorBudget.errors?.[index] ?? ZERO);
          const absoluteTolerance = abs(Array.isArray(errorBudget.absoluteTolerance)
            ? errorBudget.absoluteTolerance[index] ?? ZERO
            : errorBudget.absoluteTolerance ?? "1e-8");
          // Keep weights outside the resource representation. In particular,
          // multiplying a layer-2 resource by the tolerance erases the factor.
          const priorErrorTerms = errorBudget.errorTerms?.[index] ?? [{ scale: priorError, weight: 1 }];
          const priorGainTerms = errorBudget.gainTerms?.[index] ?? [{ scale: priorGain, weight: 1 }];
          const ledger = WIS.Simulation.Accuracy.scaledBudget({
            errorTerms: [...priorErrorTerms, ...errorTerms[index]],
            gainTerms: [...priorGainTerms, { scale: gain, weight: 1 }], relativeTolerance,
            absoluteTolerance, absoluteWeight: accumulatedFraction
          });
          const local = WIS.Simulation.Accuracy.scaledBudget({
            errorTerms: errorTerms[index], gainTerms: [{ scale: gain, weight: 1 }], relativeTolerance,
            absoluteTolerance, absoluteWeight: localFraction
          });
          const error = errorEstimate[index];
          const gainCheck = WIS.Simulation.Accuracy.compare(fullStep.gains?.[index] ?? gain, gain,
            { relativeTolerance, absoluteTolerance: mul(absoluteTolerance, localFraction) });
          const stockCheck = eq(fullStep.resources[index], halfSteps.resources[index]) ? { verified: true } :
            WIS.Simulation.Accuracy.compare(fullStep.resources[index], halfSteps.resources[index],
              { relativeTolerance, absoluteTolerance: mul(absoluteTolerance, localFraction) });
          const verified = ledger.verified && gainCheck.verified && stockCheck.verified;
          verification.push({ verified, status: verified ? "verified" : "unverified", gain: gainCheck, ledger });
          budgetExceeded = budgetExceeded || !ledger.pass;
          acceptable = acceptable && isFiniteBN(gain) && isFiniteBN(error) &&
            isFiniteBN(fullStep.gains[index]) && isFiniteBN(halfSteps.gains[index]) &&
            isFiniteBN(fullStep.resources[index]) && isFiniteBN(halfSteps.resources[index]) &&
            verified && (ledger.pass || eq(error, ZERO));
          const ratio = eq(error, ZERO) ? 0 : Number.isFinite(local.ratio) ? Math.min(1e12, local.ratio) : 1e12;
          qualityRatio = Math.max(qualityRatio, ratio);
        }
        // If an unavoidable minimum-sized event already exceeded the ledger,
        // an exactly matching interval cannot repair it by being replayed in
        // tiny pieces. Let zero-new-error intervals advance, retaining and
        // exposing the outstanding error instead of silently forgiving it.
        const verified = verification.every((entry) => entry.verified);
        return { acceptable, errorEstimate, errorTerms, expectedGains, qualityRatio, budgetExceeded,
          verified, status: verified ? "verified" : "unverified", verification };
      }

      function offlineProjectionAcceptable(fullStep, halfSteps, options = {}) {
        return evaluateProjectionError(fullStep, halfSteps,
          Math.max(epsilon, Number(options.seconds) || 1), options.errorBudget).acceptable;
      }

      function adaptiveOfflineStepSeconds(
        maximumSeconds,
        minimumRequiredSeconds = simulationStepSeconds,
        treasureDriverMinimumSeconds = minimumRequiredSeconds,
        options = {}
      ) {
        const finish = (seconds, budgetExhausted = false, reason = null, continuation = null, evaluation = null) => options.withMeta
          ? Object.freeze({ seconds, budgetExhausted, reason, continuation,
            stepParts: !budgetExhausted && evaluation ? [seconds / 2, seconds - seconds / 2] : [seconds],
            errorEstimate: evaluation?.errorEstimate || resourceKeys.map(() => ZERO),
            errorTerms: evaluation?.errorTerms || resourceKeys.map(() => []),
            verified: evaluation?.verified ?? false,
            status: evaluation?.status || "unverified",
            verification: evaluation?.verification || null,
            expectedGains: evaluation?.expectedGains || null,
            firstPreparedStepPlan: evaluation?.firstPreparedStepPlan || null,
            qualityRatio: evaluation?.qualityRatio ?? null,
            budgetExceeded: evaluation?.budgetExceeded || false,
            suggestedNextSeconds: seconds * (evaluation ? Math.max(0.5, Math.min(4,
              evaluation.qualityRatio > 0 ? 0.85 / Math.cbrt(evaluation.qualityRatio) : 4)) : 2),
            accuracyLimited: !budgetExhausted && !evaluation?.acceptable &&
              seconds <= minimumStep + epsilon })
          : seconds;
        const maximum = Math.max(0, Number(maximumSeconds) || 0);
        const minimumStep = Math.min(maximum, Math.max(
          simulationStepSeconds, Number(minimumRequiredSeconds) || 0
        ));
        const treasureDriverMinimumStep = Math.min(maximum, Math.max(
          minimumStep, Number(treasureDriverMinimumSeconds) || 0
        ));
        if (maximum <= epsilon || (!options.errorBudget && maximum <= minimumStep + epsilon)) return finish(maximum);

        const resumable = options.continuation;
        const sourceKey = options.sourceKey ?? JSON.stringify(WIS.Core.State.toSerializable(getState()),
          (key, value) => key === "lastUpdateAt" ? undefined : value);
        const errorBudgetKey = JSON.stringify(options.errorBudget || null);
        const integrationMethod = options.integrationMethod || "midpoint";
        const continuationMatches = resumable?.kind === "adaptive-offline-step-v2" &&
          resumable.sourceKey === sourceKey &&
          resumable.errorBudgetKey === errorBudgetKey &&
          resumable.integrationMethod === integrationMethod &&
          Math.abs(resumable.maximum - maximum) <= epsilon &&
          Math.abs(resumable.minimumStep - minimumStep) <= epsilon &&
          Math.abs(resumable.treasureDriverMinimumStep - treasureDriverMinimumStep) <= epsilon;
        const work = continuationMatches ? resumable : {
          kind: "adaptive-offline-step-v2",
          sourceKey,
          errorBudgetKey,
          integrationMethod,
          maximum,
          minimumStep,
          treasureDriverMinimumStep,
          serializedState: WIS.Core.State.toSerializable(getState()),
          candidateSeconds: maximum,
          attempt: 0,
          phase: "full",
          reusableFullStep: null,
          fullStep: null,
          halfSeconds: 0,
          firstHalf: null,
          partialProjection: null
        };
        const pause = () => finish(
          minimumStep,
          true,
          "adaptive-projection-budget",
          work
        );

        let attemptsThisCall = 0;
        while (attemptsThisCall < 12) {
          if (!options.errorBudget && work.candidateSeconds <= work.minimumStep + epsilon) return finish(work.minimumStep);
          if (work.phase === "full") {
            work.fullStep = work.reusableFullStep || runOfflineProjection(
              work.serializedState,
              [work.candidateSeconds],
              { ...options, continuation: work.partialProjection }
            );
            work.reusableFullStep = null;
            work.partialProjection = work.fullStep.continuation;
            if (work.fullStep.budgetExhausted) return pause();
            work.halfSeconds = work.candidateSeconds / 2;
            work.phase = "first-half";
          }

          if (work.phase === "first-half") {
            work.firstHalf = runOfflineProjection(
              work.serializedState,
              [work.halfSeconds],
              { ...options, continuation: work.partialProjection }
            );
            work.partialProjection = work.firstHalf.continuation;
            if (work.firstHalf.budgetExhausted) return pause();
            work.phase = "second-half";
          }

          if (work.phase === "second-half") {
            const halfSteps = runOfflineProjection(
              work.firstHalf.serializedState,
              [work.candidateSeconds - work.halfSeconds],
              { ...options, continuation: work.partialProjection }
            );
            work.partialProjection = halfSteps.continuation;
            if (halfSteps.budgetExhausted) return pause();
            const combinedHalfSteps = work.firstHalf.gains && halfSteps.gains
              ? { ...halfSteps,
                processedSeconds: work.firstHalf.processedSeconds + halfSteps.processedSeconds,
                gains: halfSteps.gains.map((gain, index) => add(gain, work.firstHalf.gains[index])) }
              : { ...halfSteps, processedSeconds: work.firstHalf.processedSeconds + halfSteps.processedSeconds };
            const evaluation = evaluateProjectionError(work.fullStep, combinedHalfSteps,
              work.candidateSeconds, options.errorBudget);
            evaluation.firstPreparedStepPlan = work.firstHalf.preparedStepPlan;
            if (evaluation.acceptable || work.candidateSeconds <= work.minimumStep + epsilon) {
              return finish(work.candidateSeconds, false, null, null, evaluation);
            }
            const smallerStep = Math.max(work.minimumStep, work.candidateSeconds / 2);
            if (!(smallerStep < work.candidateSeconds)) return finish(work.minimumStep, false, null, null, evaluation);
            work.reusableFullStep = Math.abs(smallerStep - work.halfSeconds) <= epsilon
              ? work.firstHalf
              : null;
            work.candidateSeconds = smallerStep;
            work.attempt += 1;
            attemptsThisCall += 1;
            work.phase = "full";
            work.fullStep = null;
            work.firstHalf = null;
          }
        }
        // Long searches retain their validated bracket; the next browser frame
        // continues refinement instead of committing an untested 0.1s fallback.
        return options.errorBudget ? pause() : finish(work.minimumStep);
      }

      return Object.freeze({
        runOfflineProjection,
        evaluateProjectionError,
        offlineProjectionAcceptable,
        adaptiveOfflineStepSeconds
      });
    }
  });
}(window.WIS));
