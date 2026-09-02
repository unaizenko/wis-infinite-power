(function defineSimulationProjection(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.Projection = Object.freeze({
    create(context) {
      const {
        getState, setStateDirect, advanceGameStep, treasureDriverSignature,
        stateFlagSignature, recordSignature, offlineDiscreteStateKeys, challengeKeys
      } = context;
      const { ZERO, sub, div, abs, max: maxBN, lte, eq } = WIS.Core.BigNum;
      const epsilon = context.epsilon;
      const simulationStepSeconds = context.simulationStepSeconds;
      const maxDiscreteEventsPerStep = context.maxDiscreteEventsPerStep;
      const errorTolerance = context.errorTolerance;

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

      function runOfflineProjection(serializedState, stepParts) {
        return WIS.Core.Runtime.withProjection(() => {
          const liveState = getState();
          const projectionState = WIS.Core.State.normalizeDomain(serializedState);
          let completed = true;
          let projectionTreasureDriverSignature = "";
          setStateDirect(projectionState);
          try {
            WIS.Core.Effects.withIsolatedState(projectionState, () => {
              for (const stepPart of stepParts) {
                let remaining = stepPart;
                let eventPasses = 0;
                while (remaining > epsilon && eventPasses < maxDiscreteEventsPerStep * 4) {
                  const result = advanceGameStep(remaining, true, {
                    skipTreasureRolls: true,
                    projection: true
                  });
                  const processed = Math.max(0, Math.min(remaining, Number(result.processedSeconds) || 0));
                  remaining = Math.max(0, remaining - processed);
                  eventPasses += 1;
                  if (!(processed > 0) && !result.eventCommitted) break;
                }
                if (remaining > epsilon) {
                  completed = false;
                  break;
                }
              }
              projectionTreasureDriverSignature = treasureDriverSignature(getState());
            });
            const state = getState();
            return {
              completed,
              resources: [state.joules, state.power, state.mana, state.immortalPower],
              discreteSignature: offlineDiscreteSignature(state),
              treasureDriverSignature: projectionTreasureDriverSignature,
              serializedState: WIS.Core.State.toSerializable(state)
            };
          } finally {
            setStateDirect(liveState);
            WIS.Core.Effects.invalidate();
          }
        });
      }

      function offlineResourceClose(left, right) {
        if (eq(left, right)) return true;
        const denominator = maxBN(1, maxBN(abs(left), abs(right)));
        return lte(div(abs(sub(left, right)), denominator), errorTolerance);
      }

      function offlineProjectionAcceptable(fullStep, halfSteps) {
        return fullStep.completed && halfSteps.completed &&
          fullStep.discreteSignature === halfSteps.discreteSignature &&
          fullStep.resources.every((value, index) => offlineResourceClose(value, halfSteps.resources[index]));
      }

      function adaptiveOfflineStepSeconds(
        maximumSeconds,
        minimumRequiredSeconds = simulationStepSeconds,
        treasureDriverMinimumSeconds = minimumRequiredSeconds
      ) {
        let candidateSeconds = Math.max(0, Number(maximumSeconds) || 0);
        const minimumStep = Math.min(candidateSeconds, Math.max(
          simulationStepSeconds, Number(minimumRequiredSeconds) || 0
        ));
        const treasureDriverMinimumStep = Math.min(candidateSeconds, Math.max(
          minimumStep, Number(treasureDriverMinimumSeconds) || 0
        ));
        if (candidateSeconds <= minimumStep + epsilon) return candidateSeconds;
        const serializedState = WIS.Core.State.toSerializable(getState());
        const initialTreasureDriverSignature = treasureDriverSignature(getState());
        let reusableFullStep = null;
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const fullStep = reusableFullStep || runOfflineProjection(serializedState, [candidateSeconds]);
          const halfSeconds = candidateSeconds / 2;
          const firstHalf = runOfflineProjection(serializedState, [halfSeconds]);
          const firstHalfDriverChanged = firstHalf.treasureDriverSignature !== initialTreasureDriverSignature;
          const treasureDriverAtFloor = candidateSeconds <= treasureDriverMinimumStep + epsilon;
          if (firstHalfDriverChanged && !treasureDriverAtFloor) {
            const smallerStep = Math.max(treasureDriverMinimumStep, halfSeconds);
            if (!(smallerStep < candidateSeconds)) return candidateSeconds;
            reusableFullStep = Math.abs(smallerStep - halfSeconds) <= epsilon ? firstHalf : null;
            candidateSeconds = smallerStep;
            continue;
          }
          const halfSteps = runOfflineProjection(firstHalf.serializedState, [candidateSeconds - halfSeconds]);
          const secondHalfDriverChanged = halfSteps.treasureDriverSignature !== firstHalf.treasureDriverSignature;
          const projectionAcceptable = offlineProjectionAcceptable(fullStep, halfSteps);
          if (projectionAcceptable &&
              ((!firstHalfDriverChanged && !secondHalfDriverChanged) || treasureDriverAtFloor)) {
            return candidateSeconds;
          }
          if (projectionAcceptable && (firstHalfDriverChanged || secondHalfDriverChanged)) {
            const smallerStep = Math.max(treasureDriverMinimumStep, halfSeconds);
            if (!(smallerStep < candidateSeconds)) return candidateSeconds;
            reusableFullStep = Math.abs(smallerStep - halfSeconds) <= epsilon ? firstHalf : null;
            candidateSeconds = smallerStep;
            continue;
          }
          const smallerStep = Math.max(minimumStep, candidateSeconds / 2);
          if (!(smallerStep < candidateSeconds)) return candidateSeconds;
          reusableFullStep = Math.abs(smallerStep - halfSeconds) <= epsilon ? firstHalf : null;
          candidateSeconds = smallerStep;
        }
        return candidateSeconds;
      }

      return Object.freeze({
        runOfflineProjection,
        offlineProjectionAcceptable,
        adaptiveOfflineStepSeconds
      });
    }
  });
}(window.WIS));
