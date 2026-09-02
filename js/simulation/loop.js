(function defineSimulationLoop(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.Loop = Object.freeze({
    create(context) {
      const {
        getState, advanceGameStep, beginTransaction, endTransaction,
        offline, achievementStates, notifyNewAchievements,
        requestRender, flushRender, saveState, effectiveDevSpeed,
        isInitialLoadComplete
      } = context;
      const epsilon = context.epsilon;
      const simulationStepSeconds = context.simulationStepSeconds;
      const maxOnlineStepsPerFrame = context.maxOnlineStepsPerFrame;
      const maxDiscreteEventsPerStep = context.maxDiscreteEventsPerStep;
      let lastTickAt = Date.now();
      let simulationAccumulator = 0;
      let simulationClockAccumulator = 0;
      let simulationStepRemainder = 0;
      let simulationStepDiscreteEvents = 0;
      let started = false;

      function setLastTickAt(value) {
        lastTickAt = Math.max(0, Number(value) || Date.now());
      }

      function resetAccumulators() {
        simulationAccumulator = 0;
        simulationClockAccumulator = 0;
        simulationStepRemainder = 0;
        simulationStepDiscreteEvents = 0;
      }

      function addToSimulationAccumulator(gameSeconds, clockSeconds) {
        simulationAccumulator += Math.max(0, Number(gameSeconds) || 0);
        simulationClockAccumulator += Math.max(0, Number(clockSeconds) || 0);
      }

      function flushSimulationAccumulatorToCatchUp() {
        if (!(simulationAccumulator > epsilon)) return;
        let gameSeconds = simulationAccumulator;
        let clockSeconds = simulationClockAccumulator;
        const clockPerGameSecond = gameSeconds > 0 ? clockSeconds / gameSeconds : 0;
        simulationAccumulator = 0;
        simulationClockAccumulator = 0;
        if (simulationStepRemainder > epsilon) {
          const firstGameSeconds = Math.min(gameSeconds, simulationStepRemainder);
          const firstClockSeconds = firstGameSeconds * clockPerGameSecond;
          offline.appendCatchUpTask(firstGameSeconds, firstClockSeconds);
          gameSeconds = Math.max(0, gameSeconds - firstGameSeconds);
          clockSeconds = Math.max(0, clockSeconds - firstClockSeconds);
          simulationStepRemainder = Math.max(0, simulationStepRemainder - firstGameSeconds);
        }
        if (gameSeconds > epsilon) offline.appendCatchUpTask(gameSeconds, clockSeconds);
        offline.queueCatchUpNotice(0, 0);
      }

      function processOnlineSimulationAccumulator() {
        let processedSteps = 0;
        let yieldedForDiscreteEventLimit = false;
        while (processedSteps < maxOnlineStepsPerFrame) {
          const requestedStepSeconds = simulationStepRemainder > epsilon
            ? simulationStepRemainder
            : simulationStepSeconds;
          if (simulationAccumulator + epsilon < requestedStepSeconds) break;
          const stepClockSeconds = simulationAccumulator > 0
            ? simulationClockAccumulator * (requestedStepSeconds / simulationAccumulator)
            : 0;
          let result;
          let acceptedSeconds = 0;
          beginTransaction();
          try {
            result = advanceGameStep(requestedStepSeconds, false);
            acceptedSeconds = Math.max(0,
              Math.min(requestedStepSeconds, Number(result.processedSeconds) || 0));
            if (acceptedSeconds > 0) {
              const acceptedClockSeconds = stepClockSeconds * (acceptedSeconds / requestedStepSeconds);
              simulationAccumulator = Math.max(0, simulationAccumulator - acceptedSeconds);
              simulationClockAccumulator = Math.max(0, simulationClockAccumulator - acceptedClockSeconds);
              getState().totalElapsedSeconds += acceptedClockSeconds;
            }
          } finally {
            endTransaction();
          }
          if (result?.eventCommitted) simulationStepDiscreteEvents += 1;
          if (!(acceptedSeconds > 0) && !result?.eventCommitted) break;
          simulationStepRemainder = result.remainingSeconds > epsilon ? result.remainingSeconds : 0;
          if (simulationStepDiscreteEvents >= maxDiscreteEventsPerStep && simulationStepRemainder > 0) {
            simulationStepDiscreteEvents = 0;
            yieldedForDiscreteEventLimit = true;
            break;
          }
          if (simulationStepRemainder <= 0) {
            simulationStepDiscreteEvents = 0;
            processedSteps += 1;
          }
        }
        const nextSimulationStepSeconds = simulationStepRemainder > epsilon
          ? simulationStepRemainder
          : simulationStepSeconds;
        if (!yieldedForDiscreteEventLimit &&
            simulationAccumulator + epsilon >= nextSimulationStepSeconds) {
          flushSimulationAccumulatorToCatchUp();
        }
      }

      function runMainTick() {
        const now = Date.now();
        if (!isInitialLoadComplete()) {
          lastTickAt = now;
          return;
        }
        if (document.hidden) return;
        const debugSpeedMultiplier = effectiveDevSpeed();
        const realElapsedSeconds = Math.max(0, now - lastTickAt) / 1000;
        lastTickAt = now;
        const previousAchievements = achievementStates();
        if (offline.isCatchUpInProgress() || offline.getPendingCatchUpSeconds() > 0) {
          offline.queueCatchUpNotice(0, 0);
        } else {
          addToSimulationAccumulator(realElapsedSeconds * debugSpeedMultiplier, realElapsedSeconds);
          processOnlineSimulationAccumulator();
        }
        notifyNewAchievements(previousAchievements);
        requestRender();
        flushRender(now);
      }

      function handleVisibilityChange() {
        if (!isInitialLoadComplete()) return;
        if (document.hidden) {
          saveState();
          return;
        }
        const now = Date.now();
        const elapsedSeconds = Math.max(0, now - lastTickAt) / 1000;
        lastTickAt = now;
        const debugSpeedMultiplier = effectiveDevSpeed();
        const catchUpGameSeconds = simulationAccumulator + elapsedSeconds * debugSpeedMultiplier;
        const catchUpClockSeconds = simulationClockAccumulator + elapsedSeconds;
        simulationAccumulator = 0;
        simulationClockAccumulator = 0;
        if (simulationStepRemainder > epsilon) {
          const clockPerGameSecond = catchUpGameSeconds > 0 ? catchUpClockSeconds / catchUpGameSeconds : 0;
          const firstGameSeconds = Math.min(catchUpGameSeconds, simulationStepRemainder);
          const firstClockSeconds = firstGameSeconds * clockPerGameSecond;
          offline.appendCatchUpTask(firstGameSeconds, firstClockSeconds);
          simulationStepRemainder = Math.max(0, simulationStepRemainder - firstGameSeconds);
          offline.appendCatchUpTask(
            Math.max(0, catchUpGameSeconds - firstGameSeconds),
            Math.max(0, catchUpClockSeconds - firstClockSeconds)
          );
          offline.queueCatchUpNotice(0, 0);
        } else {
          offline.queueCatchUpNotice(catchUpGameSeconds, catchUpClockSeconds);
        }
        requestRender();
        flushRender(now, { force: true });
      }

      function start() {
        if (started) return;
        started = true;
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.setInterval(runMainTick, context.logicIntervalMs);
      }

      return Object.freeze({
        start,
        runMainTick,
        setLastTickAt,
        resetAccumulators,
        getSimulationClockAccumulator: () => simulationClockAccumulator
      });
    }
  });
}(window.WIS));
