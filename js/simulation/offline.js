(function defineSimulationOffline(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  WIS.Simulation.Offline = Object.freeze({
    create(context) {
      const {
        getState, advanceGameStep, nextKnownSimulationBoundarySeconds,
        adaptiveOfflineStepSeconds, nextEffectiveTreasureEventSeconds, createOfflineTaskRandom,
        beginTransaction, endTransaction, achievementStates, recordCurrentAchievements,
        notifyNewAchievements, markAchievementsDirty, showNotice, requestRender,
        formatElapsedTime, format, setLastTickAt, resetOnlineAccumulators,
        tianNiPearlCount, fitnessMembershipCardCount, superLollipopCount, skyCrystalCount,
        fiveSpiritStoneCount, cosmicFiberCount, cosmicWillCount, baLingChiCount, phantomHeavenMirrorCount,
        mysticHeavenSacredTreeCount, mysticHeavenSpiritSlayingSwordCount
      } = context;
      const CONFIG = WIS.Core.Config;
      const { ZERO, sub, gt } = WIS.Core.BigNum;
      const epsilon = context.epsilon;
      const simulationStepSeconds = context.simulationStepSeconds;
      const offlineMaxSteps = CONFIG.offlineMaxSteps;
      const frameBudgetMs = 9;
      const catchUpTasks = [];
      let pendingCatchUpSeconds = 0;
      let pendingCatchUpClockSeconds = 0;
      let catchUpInProgress = false;
      let catchUpGeneration = 0;
      let catchUpPromise = null;
      let catchUpResolver = null;
      let catchUpNoticePromise = null;

      function offlineProgressSnapshot() {
        const state = getState();
        return {
          joules: state.joules,
          power: state.power,
          mana: state.mana,
          immortalPower: state.immortalPower,
          pearls: tianNiPearlCount(),
          fitnessCards: fitnessMembershipCardCount(),
          superLollipops: superLollipopCount(),
          skyCrystals: skyCrystalCount(),
          fiveSpiritStones: fiveSpiritStoneCount(),
          cosmicFibers: cosmicFiberCount(),
          cosmicWills: cosmicWillCount(),
          baLingChi: baLingChiCount(),
          phantomHeavenMirror: phantomHeavenMirrorCount(),
          mysticHeavenSacredTree: mysticHeavenSacredTreeCount(),
          mysticHeavenSpiritSlayingSword: mysticHeavenSpiritSlayingSwordCount()
        };
      }

      function formatOfflineProgressReport(safeElapsed, before) {
        if (safeElapsed < CONFIG.offlineNoticeMinSeconds) return "";
        const state = getState();
        const gains = [
          [sub(state.joules, before.joules), "J"],
          [sub(state.power, before.power), "战力"],
          [sub(state.mana, before.mana), "法力"],
          [sub(state.immortalPower, before.immortalPower), "仙灵力"]
        ].filter(([gain]) => gt(gain, ZERO)).map(([gain, name]) => `${format(gain)} ${name}`);
        const treasureGains = [
          [tianNiPearlCount() - before.pearls, "枚仙道·天逆珠"],
          [fitnessMembershipCardCount() - before.fitnessCards, "张健身房会员卡"],
          [superLollipopCount() - before.superLollipops, "个超级棒棒糖"],
          [skyCrystalCount() - before.skyCrystals, "枚天晶"],
          [fiveSpiritStoneCount() - before.fiveSpiritStones, "枚五灵石"],
          [cosmicFiberCount() - before.cosmicFibers, "缕宇宙纤维"],
          [cosmicWillCount() - before.cosmicWills, "份宇宙意志"],
          [baLingChiCount() - before.baLingChi, "柄仙道·八灵尺"],
          [phantomHeavenMirrorCount() - before.phantomHeavenMirror, "面仙道·幻天镜"],
          [mysticHeavenSacredTreeCount() - before.mysticHeavenSacredTree, "株仙道·玄天圣树"],
          [mysticHeavenSpiritSlayingSwordCount() - before.mysticHeavenSpiritSlayingSword, "柄仙道·玄天斩灵剑"]
        ];
        treasureGains.forEach(([gain, name]) => {
          if (gain > 0) gains.push(`${format(gain, 0)}${name}`);
        });
        return gains.length > 0
          ? `离线 ${formatElapsedTime(safeElapsed)}，获得 ${gains.join("、")}`
          : `离线 ${formatElapsedTime(safeElapsed)}，当前没有可自动获取的资源`;
      }

      function yieldForFirstPaint() {
        return new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      function catchUpClockNow() {
        return typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      }

      function cancelCatchUp() {
        catchUpGeneration += 1;
        pendingCatchUpSeconds = 0;
        pendingCatchUpClockSeconds = 0;
        catchUpTasks.length = 0;
        catchUpInProgress = false;
        resetOnlineAccumulators();
        const resolver = catchUpResolver;
        catchUpResolver = null;
        catchUpPromise = null;
        catchUpNoticePromise = null;
        if (resolver) resolver("");
      }

      function appendCatchUpTask(elapsedSeconds, clockSeconds = elapsedSeconds, { alreadyPending = false } = {}) {
        const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
        if (!(safeElapsed > 0)) return null;
        const safeClock = Math.max(0, Number(clockSeconds) || 0);
        const legacyReferenceStep = safeElapsed > 60 + epsilon
          ? safeElapsed / offlineMaxSteps
          : simulationStepSeconds;
        const task = {
          gameSeconds: safeElapsed,
          clockSeconds: safeClock,
          remainingGameSeconds: safeElapsed,
          remainingClockSeconds: safeClock,
          remainingSteps: offlineMaxSteps,
          legacyReferenceStep,
          suggestedStepSeconds: Math.min(safeElapsed,
            Math.max(simulationStepSeconds, safeElapsed / offlineMaxSteps)),
          random: createOfflineTaskRandom(WIS.Core.Runtime.random()),
          treasureFallbackMode: false,
          optimizationDisabled: false,
          pendingTreasureEvent: null,
          currentStepRemaining: 0,
          currentClockRemaining: 0,
          currentOuterStepGameSeconds: 0,
          currentOuterStepClockSeconds: 0,
          currentStepDiscreteEvents: 0
        };
        catchUpTasks.push(task);
        if (!alreadyPending) {
          pendingCatchUpSeconds += safeElapsed;
          pendingCatchUpClockSeconds += safeClock;
        }
        return task;
      }

      function assignCatchUpStep(task, stepGameSeconds) {
        const clockPerGameSecond = task.remainingGameSeconds > 0
          ? task.remainingClockSeconds / task.remainingGameSeconds
          : 0;
        task.currentStepRemaining = stepGameSeconds;
        task.currentClockRemaining = stepGameSeconds * clockPerGameSecond;
        task.currentOuterStepGameSeconds = stepGameSeconds;
        task.currentOuterStepClockSeconds = task.currentClockRemaining;
        task.currentStepDiscreteEvents = 0;
        return stepGameSeconds > 0;
      }

      function legacyFallbackStepSeconds(task, minimumRequiredStep) {
        return Math.min(task.remainingGameSeconds, Math.max(
          minimumRequiredStep,
          Math.min(task.legacyReferenceStep, task.remainingGameSeconds)
        ));
      }

      function prepareCatchUpStep(task) {
        if (!(task.remainingGameSeconds > epsilon)) return false;
        const slots = Math.max(1, task.remainingSteps);
        const minimumRequiredStep = task.remainingGameSeconds / slots;
        task.pendingTreasureEvent = null;
        if (task.optimizationDisabled || task.treasureFallbackMode) {
          return assignCatchUpStep(task, legacyFallbackStepSeconds(task, minimumRequiredStep));
        }
        try {
          let proposedStep = Math.min(task.remainingGameSeconds, Math.max(
            simulationStepSeconds, task.suggestedStepSeconds, minimumRequiredStep
          ));
          if (proposedStep <= minimumRequiredStep + epsilon) return assignCatchUpStep(task, proposedStep);
          proposedStep = Math.max(
            Math.min(simulationStepSeconds, proposedStep),
            nextKnownSimulationBoundarySeconds(proposedStep)
          );
          if (proposedStep <= minimumRequiredStep + epsilon) return assignCatchUpStep(task, proposedStep);
          const treasureEvent = nextEffectiveTreasureEventSeconds(task, proposedStep, task.legacyReferenceStep);
          if (treasureEvent) {
            if (!treasureEvent.dense && treasureEvent.seconds + epsilon >= minimumRequiredStep) {
              proposedStep = Math.min(proposedStep, treasureEvent.seconds);
              task.pendingTreasureEvent = { ...treasureEvent, bucketed: false };
            } else {
              task.treasureFallbackMode = true;
              return assignCatchUpStep(task, legacyFallbackStepSeconds(task, minimumRequiredStep));
            }
          }
          const treasureDriverMinimumStep = Math.max(
            minimumRequiredStep,
            Math.min(task.legacyReferenceStep, proposedStep)
          );
          const stepGameSeconds = adaptiveOfflineStepSeconds(
            proposedStep, minimumRequiredStep, treasureDriverMinimumStep
          );
          if (task.pendingTreasureEvent && !task.pendingTreasureEvent.bucketed &&
              stepGameSeconds + epsilon < task.pendingTreasureEvent.seconds) {
            task.pendingTreasureEvent = null;
          }
          return assignCatchUpStep(task, stepGameSeconds);
        } catch (error) {
          console.error("WIS offline optimization failed; switching this task to legacy simulation.", error);
          task.optimizationDisabled = true;
          task.pendingTreasureEvent = null;
          return assignCatchUpStep(task, legacyFallbackStepSeconds(task, minimumRequiredStep));
        }
      }

      function completeCatchUpStep(task, processedSeconds = 0, countSegment = false) {
        if (countSegment) task.remainingSteps -= 1;
        if (task.remainingGameSeconds <= epsilon) {
          catchUpTasks.shift();
          if (catchUpTasks.length === 0) {
            pendingCatchUpSeconds = 0;
            pendingCatchUpClockSeconds = 0;
          }
          return;
        }
        if (task.remainingSteps <= 0) task.remainingSteps = 1;
        task.suggestedStepSeconds = Math.max(
          simulationStepSeconds,
          (processedSeconds > 0 ? processedSeconds : task.legacyReferenceStep) * 2
        );
        task.currentStepRemaining = 0;
        task.currentClockRemaining = 0;
        task.currentOuterStepGameSeconds = 0;
        task.currentOuterStepClockSeconds = 0;
        task.currentStepDiscreteEvents = 0;
        task.pendingTreasureEvent = null;
      }

      function simulateOfflineProgress(elapsedSeconds, clockSeconds = elapsedSeconds) {
        appendCatchUpTask(elapsedSeconds, clockSeconds);
        if (!(pendingCatchUpSeconds > 0)) return Promise.resolve("");
        if (catchUpPromise) return catchUpPromise;
        const generation = ++catchUpGeneration;
        const before = offlineProgressSnapshot();
        const previousAchievements = achievementStates();
        let processedClockSeconds = 0;
        catchUpInProgress = true;
        catchUpPromise = new Promise((resolve) => { catchUpResolver = resolve; });
        const activePromise = catchUpPromise;
        void (async () => {
          while (generation === catchUpGeneration) {
            if (catchUpTasks.length === 0) break;
            const frameStartedAt = catchUpClockNow();
            let madeProgress = false;
            do {
              const task = catchUpTasks[0];
              if (!task) break;
              if (task.currentStepRemaining <= epsilon && !prepareCatchUpStep(task)) {
                catchUpTasks.shift();
                continue;
              }
              const requestedSeconds = task.currentStepRemaining;
              let result;
              let acceptedSeconds = 0;
              beginTransaction();
              try {
                result = WIS.Core.Runtime.withRandomSource(
                  () => task.random.next(),
                  () => advanceGameStep(requestedSeconds, true, { offline: true })
                );
                acceptedSeconds = Math.max(0, Math.min(requestedSeconds, result.processedSeconds));
                if (acceptedSeconds > 0) {
                  const clockRatio = task.currentOuterStepGameSeconds > 0
                    ? task.currentOuterStepClockSeconds / task.currentOuterStepGameSeconds
                    : 0;
                  const acceptedClockSeconds = Math.min(task.currentClockRemaining, acceptedSeconds * clockRatio);
                  getState().totalElapsedSeconds += acceptedClockSeconds;
                  task.currentStepRemaining = Math.max(0, task.currentStepRemaining - acceptedSeconds);
                  task.currentClockRemaining = Math.max(0, task.currentClockRemaining - acceptedClockSeconds);
                  task.remainingGameSeconds = Math.max(0, task.remainingGameSeconds - acceptedSeconds);
                  task.remainingClockSeconds = Math.max(0, task.remainingClockSeconds - acceptedClockSeconds);
                  pendingCatchUpSeconds = Math.max(0, pendingCatchUpSeconds - acceptedSeconds);
                  pendingCatchUpClockSeconds = Math.max(0, pendingCatchUpClockSeconds - acceptedClockSeconds);
                  processedClockSeconds += acceptedClockSeconds;
                  madeProgress = true;
                }
              } finally {
                endTransaction();
              }
              if (result?.eventCommitted) {
                task.currentStepDiscreteEvents += 1;
                madeProgress = true;
              }
              if (!(acceptedSeconds > 0) && !result?.eventCommitted) {
                console.warn("WIS catch-up step produced no deterministic progress", { requestedStepSeconds: requestedSeconds });
                break;
              }
              completeCatchUpStep(task, acceptedSeconds, true);
            } while (catchUpTasks.length > 0 && catchUpClockNow() - frameStartedAt < frameBudgetMs);
            if (catchUpTasks.length > 0 || !madeProgress) await yieldForFirstPaint();
          }
          if (generation !== catchUpGeneration) return;
          if (recordCurrentAchievements()) markAchievementsDirty();
          notifyNewAchievements(previousAchievements);
          const report = formatOfflineProgressReport(processedClockSeconds, before);
          const resolver = catchUpResolver;
          catchUpInProgress = false;
          catchUpPromise = null;
          catchUpResolver = null;
          setLastTickAt(Date.now());
          if (resolver) resolver(report);
        })().catch((error) => {
          if (generation !== catchUpGeneration) return;
          console.error("WIS offline legacy fallback failed; abandoning pending catch-up.", error);
          catchUpTasks.length = 0;
          pendingCatchUpSeconds = 0;
          pendingCatchUpClockSeconds = 0;
          const resolver = catchUpResolver;
          catchUpInProgress = false;
          catchUpPromise = null;
          catchUpResolver = null;
          setLastTickAt(Date.now());
          if (resolver) resolver("");
        });
        return activePromise;
      }

      function queueCatchUpNotice(elapsedSeconds, clockSeconds = elapsedSeconds) {
        const promise = simulateOfflineProgress(elapsedSeconds, clockSeconds);
        if (promise === catchUpNoticePromise) return;
        catchUpNoticePromise = promise;
        void promise.then((report) => {
          if (catchUpNoticePromise === promise) catchUpNoticePromise = null;
          if (report) showNotice(report, 6000);
          requestRender();
        });
      }

      return Object.freeze({
        simulateOfflineProgress,
        queueCatchUpNotice,
        cancelCatchUp,
        appendCatchUpTask,
        isCatchUpInProgress: () => catchUpInProgress,
        getPendingCatchUpSeconds: () => pendingCatchUpSeconds,
        getPendingCatchUpClockSeconds: () => pendingCatchUpClockSeconds
      });
    }
  });
}(window.WIS));
