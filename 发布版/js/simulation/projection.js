(function defineSimulationProjection(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  // Error budgets carry a scale and a small dimensionless weight separately.
  // At layer 2, gain * 0.05 can round straight back to gain; it is NOT a
  // five-percent allowance. Nor does equality of two rounded fits prove that
  // their original-resource gains agree. Keep these two concerns explicit.
  WIS.Simulation.Accuracy = (() => {
    const B = WIS.Core.BigNum;
    const ulp = (value) => value === 0 ? Number.MIN_VALUE :
      Math.max(Number.MIN_VALUE, Math.pow(2, Math.floor(Math.log2(Math.abs(value))) - 52));

    function precision(value, options = {}) {
      const tolerance = Math.max(Number.EPSILON, Number(options.relativeTolerance) || 0.05);
      if (!B.isFiniteBN(value)) return { resolvable: false, reason: "invalid-value" };
      const number = B.abs(value);
      const layer = number.layer;
      const magnitude = number.mag;
      const targetLog10 = Math.log1p(tolerance) / Math.LN10;
      let log10Resolution = 0;
      let requiredDecimalPlaces = 0;
      let requiredSignificantDigits = 16;
      if (layer === 0 && magnitude > 0) {
        log10Resolution = ulp(magnitude) / magnitude / Math.LN10;
      } else if (layer === 1) {
        log10Resolution = ulp(magnitude);
        requiredDecimalPlaces = Math.max(0, Math.ceil(-Math.log10(targetLog10)));
        requiredSignificantDigits = Math.max(1, Math.floor(Math.log10(Math.max(1, Math.abs(magnitude)))) + 1) +
          requiredDecimalPlaces;
      } else if (layer === 2) {
        // d log10(resource) / d mag = ln(10) * 10^abs(mag).
        const logarithmicResolution = Math.log10(Math.LN10 * ulp(magnitude)) + Math.abs(magnitude);
        log10Resolution = logarithmicResolution > 308 ? Infinity : Math.pow(10, logarithmicResolution);
        requiredDecimalPlaces = Math.ceil(Math.abs(magnitude) + Math.log10(Math.LN10 / targetLog10));
        requiredSignificantDigits = Math.max(1, Math.floor(Math.log10(Math.max(1, Math.abs(magnitude)))) + 1) +
          requiredDecimalPlaces;
      } else if (layer > 2) {
        log10Resolution = Infinity;
        requiredDecimalPlaces = Infinity;
        requiredSignificantDigits = Infinity;
      }
      return { resolvable: log10Resolution * 8 < targetLog10, layer, magnitude,
        log10Resolution, requiredDecimalPlaces, requiredSignificantDigits };
    }

    function normalizeTerms(terms) {
      const normalized = [];
      for (const term of terms || []) {
        const weight = Number(term?.weight ?? 1);
        if (term?.scale === null || term?.scale === undefined || !B.isFiniteBN(term.scale) ||
            !Number.isFinite(weight) || weight < 0 || B.lt(term.scale, B.ZERO)) {
          return null;
        }
        if (weight > 0 && !B.eq(term.scale, B.ZERO)) normalized.push({ scale: B.BN(term.scale), weight });
      }
      return normalized;
    }

    function scaledBudget(options = {}) {
      const errors = normalizeTerms(options.errorTerms);
      const gains = normalizeTerms(options.gainTerms);
      const tolerance = Number(options.relativeTolerance ?? 0.05);
      const absoluteWeight = Number(options.absoluteWeight ?? 1);
      const absoluteTolerance = options.absoluteTolerance ?? "1e-8";
      const invalid = !errors || !gains || !Number.isFinite(tolerance) || tolerance < 0 ||
        !Number.isFinite(absoluteWeight) || absoluteWeight < 0 ||
        !B.isFiniteBN(absoluteTolerance) || B.lt(absoluteTolerance, B.ZERO);
      if (invalid) return { pass: false, verified: false, status: "unverified", reason: "invalid-budget", ratio: Infinity };
      const allowances = gains.map((term) => ({ scale: term.scale, weight: term.weight * tolerance }));
      if (absoluteWeight > 0 && !B.eq(absoluteTolerance, B.ZERO)) {
        allowances.push({ scale: B.BN(absoluteTolerance), weight: absoluteWeight });
      }
      const all = [...errors, ...allowances];
      const scale = all.reduce((current, term) => B.max(current, term.scale), B.ZERO);
      let uncertain = false;
      function sumTerms(terms) {
        let sum = 0;
        let compensation = 0;
        let uncertainty = 0;
        for (const term of terms) {
          const sameScale = B.eq(term.scale, scale);
          const decimalRatio = sameScale ? B.ONE : B.div(term.scale, scale);
          let ratio = B.toNumber(decimalRatio, NaN);
          if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) { uncertain = true; ratio = 0; }
          // Unequal layer-2 scales can falsely divide to one. Their relative
          // ordering is known, but a close original-resource ratio is not.
          if (ratio > 0 && !sameScale) {
            const leftPrecision = precision(term.scale, { relativeTolerance: tolerance });
            const rightPrecision = precision(scale, { relativeTolerance: tolerance });
            if (!leftPrecision.resolvable || !rightPrecision.resolvable) uncertain = true;
            else uncertainty += ratio * term.weight * Math.expm1(Math.LN10 *
              (leftPrecision.log10Resolution + rightPrecision.log10Resolution));
          }
          // Normalize first, then apply the dimensionless weight while the
          // tiny ratio is still a Decimal. Number(ratio) * weight could lose a
          // subnormal ratio before a large finite weight brings it into range.
          const contribution = sameScale ? term.weight : B.toNumber(B.mul(decimalRatio, term.weight), NaN);
          if (!Number.isFinite(contribution)) uncertain = true;
          const adjusted = contribution - compensation;
          const next = sum + adjusted;
          compensation = (next - sum) - adjusted;
          sum = next;
        }
        return { sum, uncertainty };
      }
      const errorTotal = sumTerms(errors);
      const allowanceTotal = sumTerms(allowances);
      const normalizedError = errorTotal.sum;
      const normalizedAllowance = allowanceTotal.sum;
      const ratio = normalizedAllowance > 0 ? normalizedError / normalizedAllowance : normalizedError === 0 ? 0 : Infinity;
      if (Math.abs(normalizedError - normalizedAllowance) < errorTotal.uncertainty + allowanceTotal.uncertainty) uncertain = true;
      const pass = !uncertain && normalizedError <= normalizedAllowance;
      return { pass, verified: !uncertain, status: uncertain ? "unverified" : pass ? "verified" : "failed",
        ratio, normalizedError, normalizedAllowance, scale,
        normalizedUncertainty: errorTotal.uncertainty + allowanceTotal.uncertainty,
        reason: uncertain ? "unresolved-scale-ratio" : null };
    }

    function compare(actual, expected, options = {}) {
      const tolerance = Math.max(0, Number(options.relativeTolerance ?? 0.05));
      const absoluteTolerance = options.absoluteTolerance ?? "1e-8";
      if (!B.isFiniteBN(actual) || !B.isFiniteBN(expected) || !B.isFiniteBN(absoluteTolerance) ||
          !Number.isFinite(tolerance) || B.lt(absoluteTolerance, B.ZERO)) {
        return { pass: false, verified: false, status: "unverified", relativeError: null, reason: "invalid-comparison" };
      }
      const equal = B.eq(actual, expected);
      const exactReplay = options.exactReplay === true && equal;
      const measuredPrecision = [precision(actual, { relativeTolerance: tolerance }),
        precision(expected, { relativeTolerance: tolerance })];
      // A small absolute bound is safe even when a relative ratio is not.
      const absolutelySmall = B.lte(B.add(B.abs(actual), B.abs(expected)), absoluteTolerance);
      if (exactReplay || absolutelySmall) {
        return { pass: true, verified: true, status: "verified", relativeError: equal ? 0 :
          B.eq(expected, B.ZERO) ? null : B.toNumber(B.div(B.abs(B.sub(actual, expected)), B.abs(expected)), null),
        reason: exactReplay ? "identical-discrete-replay" : "absolute-bound", precision: measuredPrecision };
      }
      if (!measuredPrecision.every((entry) => entry.resolvable)) {
        return { pass: false, verified: false, status: "unverified", relativeError: null,
          reason: "original-resource-precision", precision: measuredPrecision };
      }
      const error = B.abs(B.sub(actual, expected));
      const relativeError = B.eq(expected, B.ZERO) ? equal ? 0 : Infinity :
        B.toNumber(B.div(error, B.abs(expected)), Infinity);
      const budget = scaledBudget({ errorTerms: [{ scale: error, weight: 1 }],
        gainTerms: [{ scale: B.abs(expected), weight: 1 }], relativeTolerance: tolerance, absoluteTolerance });
      // Reject a boundary whose rounding uncertainty is material. This is a
      // measurement check, not a claim that the sampled fit bounds all frames.
      const uncertainty = Math.expm1(Math.LN10 * measuredPrecision.reduce((sum, entry) => sum + entry.log10Resolution, 0));
      const nearBoundary = !equal && Number.isFinite(relativeError) &&
        Math.abs(relativeError - tolerance) <= uncertainty * 4 && B.gt(error, absoluteTolerance);
      if (nearBoundary) return { ...budget, pass: false, verified: false, status: "unverified", relativeError,
        reason: "comparison-at-resolution-limit", precision: measuredPrecision };
      return { ...budget, relativeError, precision: measuredPrecision };
    }

    return Object.freeze({ compare, precision, scaledBudget });
  })();
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
