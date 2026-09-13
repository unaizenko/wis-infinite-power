(function defineSimulationOffline(WIS) {
  "use strict";

  WIS.Simulation = WIS.Simulation || {};
  function validateConfirmedSources(value) {
    if(value==null)return null;
    if(typeof value!=="object"||Array.isArray(value)||value.version!==1||
        ["online","offline","unknown"].some(key=>typeof value[key]!=="boolean"))
      throw Error("结算来源展示元数据无效");
    return {version:1,online:value.online,offline:value.offline,unknown:value.unknown};
  }
  // A controller-owned identity survives repeated status publications and UI
  // teardown. Retrying the same queue cursor/error does not create a new alert.
  function createPauseNotices() {
    let shown = null;
    const identity = status => JSON.stringify([status.pauseReason?.reason,
      status.pauseReason?.error?.name, status.pauseReason?.error?.message,
      status.pauseReason?.task?.clockCursor ?? null]);
    return Object.freeze({claim(status) {
      if (status?.phase !== 'paused') return false;
      const id = identity(status); if (shown === id) return false;
      shown = id; return true;
    }, reset() { shown = null; }});
  }
  WIS.Simulation.Offline = Object.freeze({
    validateConfirmedSources, createPauseNotices,
    create(context) {
      const {
        getState, advanceGameStep, nextKnownSimulationBoundarySeconds,
        adaptiveOfflineStepSeconds, nextEffectiveTreasureEventSeconds, createOfflineTaskRandom,
        beginTransaction, endTransaction, achievementStates, recordCurrentAchievements,
        notifyNewAchievements, markAchievementsDirty, showNotice, requestRender,
        formatElapsedTime, format, resetOnlineAccumulators,
        snapshotState, restoreState,
        tianNiPearlCount, fitnessMembershipCardCount, superLollipopCount, skyCrystalCount,
        fiveSpiritStoneCount, cosmicFiberCount, cosmicWillCount, baLingChiCount, phantomHeavenMirrorCount,
        mysticHeavenSacredTreeCount, mysticHeavenSpiritSlayingSwordCount
      } = context;
      const CONFIG = WIS.Core.Config;
      const { BN, ZERO, add, sub, mul, max: maxBN, gt } = WIS.Core.BigNum;
      const resourceKeys = ["joules", "power", "mana", "immortalPower"];
      // This is an estimated error ledger for the WHOLE recovery, not a 5%
      // per-step allowance. Leave headroom for propagated/nonlinear error.
      const recoveryRelativeTarget = 0.001;
      const estimatedRelativeBudget = 0.015;
      const recoveryAbsoluteBudget = BN("1e-8");
      const epsilon = context.epsilon;
      const simulationStepSeconds = context.simulationStepSeconds;
      const usesExactTicks = typeof snapshotState === "function" && typeof restoreState === "function";
      const offlineMaxSteps = CONFIG.offlineMaxSteps;
      const frameBudgetMs = CONFIG.fixedSettlement.workBudgetMs;
      const planningBudgetMs = 3;
      const denseTreasureBatchSeconds = 1;
      const ORIGINAL_TASK = "original";
      const catchUpTasks = [];
      let pendingCatchUpSeconds = 0;
      let pendingCatchUpClockSeconds = 0;
      let catchUpInProgress = false;
      let presentation = null, awaySuspended = false, internalWork = false;
      let catchUpGeneration = 0;
      let catchUpPromise = null;
      let catchUpResolver = null;
      let catchUpNoticePromise = null;
      let catchUpPaused = false;
      let catchUpPauseReason = null;
      const pauseNotices = createPauseNotices();
      let pauseRestored = false;
      let catchUpSessionBefore = null;
      let catchUpSessionStartedAt = 0;
      let catchUpSessionProcessedClockSeconds = 0;
      let catchUpOriginalClockSeconds = 0;
      let catchUpOriginalProcessedClockSeconds = 0;
      let catchUpOriginalClockLocked = false;
      let catchUpPlanningBudgetExhaustions = 0;
      let catchUpCompletedReport = "";
      let catchUpCompleted = false;
      const freshConfirmedSources=()=>({version:1,online:false,offline:false,unknown:false});
      let confirmedSources=freshConfirmedSources();
      // Provenance only. Amounts/cursors stay in the existing time/resource ledger.
      function sessionSourceView() {
        let online=confirmedSources.online,offline=confirmedSources.offline;
        let onlineSeconds=0,offlineSeconds=0;
        for(const task of catchUpTasks)if(task.remainingGameSeconds>epsilon){
          if(task.source==='online'){online=true;onlineSeconds+=task.remainingGameSeconds;}
          else {offline=true;offlineSeconds+=task.remainingGameSeconds;}
        }
        return {sessionSource:confirmedSources.unknown?'unknown':online&&offline?'mixed':online?'online':offline?'offline':'unknown',
          onlinePendingGameSeconds:onlineSeconds,offlinePendingGameSeconds:offlineSeconds};
      }
      let lastCheckpointAt = 0;
      let sessionGains = resourceKeys.map(() => ZERO);
      let sessionErrorEstimates = resourceKeys.map(() => ZERO);
      let sessionErrorTerms = resourceKeys.map(() => []);
      let discreteMetrics = { logicalTicks: 0, exactTicks: 0, batches: 0, largestBatch: 0,
        probes: 0, rejectedBatches: 0, verification: "not-evaluated" };
      let sessionProcessedGameSeconds = 0;
      let fastForwardUsed = false;
      let fastForwardMetrics = null;
      let throughputSample = null, recentThroughput = null, estimateStable = false;
      let recentCounterPoint=null,recentFastForward=null;
      const settlementCosts={checkpointMs:0,checkpointCount:0,maxSyncWorkMs:0,slices:0};
      function sampleThroughput() {
        const now=catchUpClockNow(),processed=sessionProcessedGameSeconds;
        if(catchUpPhase()==="running"){
          const m=WIS.Simulation.FixedSegment.metrics();
          // Use confirmed fixed-rule work, including real tail durations. The
          // retained legacy predictor counters do not describe this executor.
          const merged=(m.offlineGameSeconds||0)/simulationStepSeconds;
          const raw=(m.onlineGameSeconds||0)/simulationStepSeconds;
          const point={now,processed,merged,raw,trial:0,predictions:0,models:0,
            frame:merged+raw,reasons:{},spans:{}};
          if(!recentCounterPoint){recentCounterPoint=point;recentFastForward=null;}
          else if(now-recentCounterPoint.now>=2000){
            const old=recentCounterPoint,changed=point.frame<old.frame,delta=k=>Math.max(0,point[k]-(changed?0:old[k]));
            const histogram={};for(const [bucket,value] of Object.entries(point.spans)){const n=value-(changed?0:old.spans[bucket]||0);if(n>0)histogram[bucket]=n;}
            const reasons={};for(const [key,value] of Object.entries(point.reasons)){const n=value-(changed?0:old.reasons[key]||0);if(n>0)reasons[key]=n;}
            const merged=delta('merged'),advanced=point.processed-old.processed;
            recentFastForward={windowSeconds:(now-old.now)/1000,processedGameSeconds:advanced,
              originalFrames:delta('raw'),mergedFrames:merged,
              trialFrames:delta('trial'),predictionCalls:delta('predictions'),modelBuildCalls:delta('models'),spanHistogram:histogram,reasonCounts:reasons,
              noEffectiveMerge:false,executionReference:"fixed-start-sources-v1"};
            recentCounterPoint=point;
          }
        }
        if(catchUpPhase()!=="running"){throughputSample=null;recentThroughput=null;estimateStable=false;recentCounterPoint=null;return;}
        if(!throughputSample){throughputSample={now,processed};return;}
        const elapsed=(now-throughputSample.now)/1000;
        if(elapsed<.1)return;
        const speed=(processed-throughputSample.processed)/elapsed;
        estimateStable=recentThroughput>0&&speed>0&&speed/recentThroughput>.4&&speed/recentThroughput<2.5;
        recentThroughput=speed>0&&Number.isFinite(speed)?speed:null;
        throughputSample={now,processed};
      }
      const catchUpStatusListeners = new Set();
      let yieldChannel = null;
      let treasureRecoveryJob=null,treasureRecoveryResult=null;
      const hostYieldQueue = [];

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

      function formatOfflineProgressReport(safeElapsed, before, { force = false } = {}) {
        const source=sessionSourceView().sessionSource;
        if(source==='online')return force ? "在线进度追赶完成" : "";
        const label=source==='offline'?"离线":source==='mixed'?"混合恢复（含在线追赶与离线结算）":"游戏进度恢复（部分历史来源未知）";
        if (!force && safeElapsed < CONFIG.offlineNoticeMinSeconds) return "";
        const state = getState();
        const gains = [
          [sessionGains[0], "J"],
          [sessionGains[1], "战力"],
          [sessionGains[2], "法力"],
          [sessionGains[3], "仙灵力"]
        ].filter(([gain]) => gt(gain, ZERO)).map(([gain, name]) => `${format(gain)} ${name}`);
        const treasureGains = [
          [sub(tianNiPearlCount(), before.pearls), "枚仙道·天逆珠"],
          [sub(fitnessMembershipCardCount(), before.fitnessCards), "张健身房会员卡"],
          [sub(superLollipopCount(), before.superLollipops), "个超级棒棒糖"],
          [sub(skyCrystalCount(), before.skyCrystals), "枚天晶"],
          [sub(fiveSpiritStoneCount(), before.fiveSpiritStones), "枚五灵石"],
          [sub(cosmicFiberCount(), before.cosmicFibers), "缕宇宙纤维"],
          [sub(cosmicWillCount(), before.cosmicWills), "份宇宙意志"],
          [sub(baLingChiCount(), before.baLingChi), "柄仙道·八灵尺"],
          [sub(phantomHeavenMirrorCount(), before.phantomHeavenMirror), "面仙道·幻天镜"],
          [sub(mysticHeavenSacredTreeCount(), before.mysticHeavenSacredTree), "株仙道·玄天圣树"],
          [sub(mysticHeavenSpiritSlayingSwordCount(), before.mysticHeavenSpiritSlayingSword), "柄仙道·玄天斩灵剑"]
        ];
        treasureGains.forEach(([gain, name]) => {
          if (gt(gain, ZERO)) gains.push(`${format(gain, 0)}${name}`);
        });
        return gains.length > 0
          ? `${label} ${formatElapsedTime(safeElapsed)}，获得 ${gains.join("、")}`
          : `${label} ${formatElapsedTime(safeElapsed)}，当前没有可自动获取的资源`;
      }

      function yieldForFirstPaint() {
        if (typeof context.yieldToHost === "function") return context.yieldToHost();
        // A real host task, not a Promise/microtask loop. Repeated zero-delay
        // timers are clamped (and can cost ~16ms on desktop), dominating short
        // 3ms planning slices. MessageChannel still lets input/painting run
        // between slices without adding an artificial timer delay to each one.
        if (typeof window.MessageChannel !== "function") {
          return new Promise((resolve) => window.setTimeout(resolve, 0));
        }
        if (!yieldChannel) {
          yieldChannel = new window.MessageChannel();
          yieldChannel.port1.onmessage = () => {
            const resolve = hostYieldQueue.shift();
            if (hostYieldQueue.length === 0) {
              // Optional Node methods keep command-line validation alive only
              // while a recovery actually has a scheduled continuation.
              yieldChannel.port1.unref?.();
              yieldChannel.port2.unref?.();
            }
            resolve?.();
          };
          yieldChannel.port1.unref?.();
          yieldChannel.port2.unref?.();
        }
        return new Promise((resolve) => {
          hostYieldQueue.push(resolve);
          yieldChannel.port1.ref?.();
          yieldChannel.port2.ref?.();
          yieldChannel.port2.postMessage(null);
        });
      }

      function catchUpClockNow() {
        if (typeof context.clockNow === "function") return context.clockNow();
        return typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      }

      function catchUpTreasureKey() {
        const state = getState();
        return JSON.stringify([state.meta?.treasures ?? state.treasureImprints ?? {},
          state.meta?.treasureStockResidual ?? {},
          [state.naturalTreasureLevel,state.explorationRewards?.levelResidual], state.unlockedAchievements?.seizeFoundation]);
      }

      function catchUpPhase() {
        if (catchUpPaused) return "paused";
        if (catchUpInProgress) return "running";
        if (catchUpCompleted) return "completed";
        return "idle";
      }

      function getCatchUpStatus() {
        const phase = catchUpPhase();
        const sourceView=sessionSourceView();
        // Automatic online work is a background task, even if clock pressure
        // temporarily stops new foreground input. Presentation must not turn
        // that ordinary pressure-control cycle into a recurring modal.
        const inlineOnline=sourceView.sessionSource==='online'&&phase!=='paused'&&!treasureRecoveryJob;
        const processedClockSeconds = Math.max(0, catchUpSessionProcessedClockSeconds);
        const remainingClockSeconds = Math.max(0, pendingCatchUpClockSeconds);
        const totalClockSeconds = Math.max(0, catchUpOriginalClockSeconds);
        const originalClockSeconds = Math.max(0, catchUpOriginalClockSeconds);
        const originalProcessedClockSeconds = Math.min(
          originalClockSeconds,
          Math.max(0, catchUpOriginalProcessedClockSeconds)
        );
        return Object.freeze({
          phase,
          treasureRecovery:treasureRecoveryJob?.status()||treasureRecoveryResult,
          locked: !!treasureRecoveryJob || phase === "paused" || (phase === "running"&&presentation==='blocking'&&!inlineOnline),
          clockSuspended:!!treasureRecoveryJob||phase==='paused'||((phase==='running'||pendingCatchUpSeconds>epsilon)&&presentation==='blocking'),
          presentation: treasureRecoveryJob?'blocking':inlineOnline?'notice':presentation||'blocking',
          awaySuspended,
          waitingForFrame: catchUpTasks[0]?.source==='online'&&!catchUpTasks[0]?.sealed&&catchUpTasks[0]?.remainingGameSeconds<simulationStepSeconds-epsilon,
          // Display metadata from the actual queue head; never infer old eligibility from current credit.
          currentSource: catchUpTasks[0] ? Object.freeze({
            source:catchUpTasks[0].source,
            compensationEligible:catchUpTasks[0].compensationEligible === true,
            clockRatio:catchUpTasks[0].remainingGameSeconds>epsilon
              ? catchUpTasks[0].remainingClockSeconds/catchUpTasks[0].remainingGameSeconds : 0
          }) : null,
          pendingGameSeconds: Math.max(0, pendingCatchUpSeconds),
          pendingClockSeconds: remainingClockSeconds,
          ...sourceView,
          convertibleClockSeconds: catchUpTasks.filter(t=>t.source==='offline').reduce((sum,t)=>sum+t.remainingClockSeconds,0),
          compensation: {...getState().core.runtime.compensation},
          processedClockSeconds,
          totalClockSeconds,
          originalClockSeconds,
          originalProcessedClockSeconds,
          originalPendingClockSeconds: Math.max(0, originalClockSeconds - originalProcessedClockSeconds),
          progress: originalClockSeconds > epsilon
            ? Math.max(0, Math.min(1, originalProcessedClockSeconds / originalClockSeconds))
            : phase === "completed" ? 1 : 0,
          overallProgress: totalClockSeconds > epsilon
            ? Math.max(0, Math.min(1, processedClockSeconds / totalClockSeconds))
            : phase === "completed" ? 1 : 0,
          startedAt: catchUpSessionStartedAt,
          pauseReason: catchUpPauseReason,
          pauseOrigin: catchUpPauseReason?.reason==="player-paused" ? "player" : catchUpPauseReason ? (pauseRestored?"history":"current") : null,
          report: catchUpCompletedReport,
          showAfterMs: 300,
          queuedTaskCount: catchUpTasks.length,
          planningBudgetExhaustions: catchUpPlanningBudgetExhaustions,
          cumulativeResourceGains: Object.freeze([...sessionGains]),
          estimatedResourceErrors: usesExactTicks ? null : Object.freeze([...sessionErrorEstimates]),
          estimatedResourceErrorTerms: Object.freeze(sessionErrorTerms.map(terms =>
            Object.freeze(terms.map(term => Object.freeze({ ...term }))))),
          resourceErrorTarget: recoveryRelativeTarget,
          executionReference: "fixed-start-sources-v1",
          fixedSettlementMetrics: WIS.Simulation.FixedSegment.metrics(),
          fastForwardEnabled: getState().offlineFastForwardEnabled !== false,
          fastForwardMetrics,
          fastForwardApplicable: false,
          sourceSupport: { supported: true, kind: "fixed-start-sources-v1", offlineSeconds: CONFIG.fixedSettlement.offlineSeconds },
          actualThroughput: recentThroughput,
          recentFastForward: recentFastForward ? {...recentFastForward,spanHistogram:{...recentFastForward.spanHistogram},reasonCounts:{...recentFastForward.reasonCounts}} : null,
          estimatedWaitSeconds: estimateStable&&recentThroughput>0 ? pendingCatchUpSeconds/recentThroughput : null,
          estimateStatus: phase!=="running" ? "inactive" : estimateStable ? "available" : "sampling",
          settlementCosts: {...settlementCosts},
          onlineSegments: context.onlineMetrics?.()||null,
          recoveryElapsedSeconds: catchUpSessionStartedAt ? (Date.now() - catchUpSessionStartedAt) / 1000 : 0,
          logicalStepSeconds: simulationStepSeconds,
          discreteMetrics: Object.freeze({ ...discreteMetrics }),
          planningYieldReason: catchUpTasks[0]?.planningYieldReason || null
        });
      }

      function publishCatchUpStatus() {
        const diag=WIS.Simulation.FixedSegment.diagnostics;
        if(diag.enabled())diag.debt(catchUpTasks.filter(t=>t.source==='online').reduce((sum,t)=>sum+t.remainingGameSeconds,0));
        sampleThroughput();
        const status = getCatchUpStatus();
        catchUpStatusListeners.forEach((listener) => {
          try { listener(status); } catch (error) { console.error("WIS catch-up status listener failed.", error); }
        });
      }

      function subscribeCatchUpStatus(listener) {
        if (typeof listener !== "function") return () => {};
        catchUpStatusListeners.add(listener);
        listener(getCatchUpStatus());
        return () => catchUpStatusListeners.delete(listener);
      }

      function resetCatchUpSession() {
        pauseNotices.reset();
        confirmedSources=freshConfirmedSources();
        presentation=null;
        fastForwardUsed = false; fastForwardMetrics = null;
        sessionGains = resourceKeys.map(() => ZERO);
        sessionErrorEstimates = resourceKeys.map(() => ZERO);
        sessionProcessedGameSeconds = 0;
        sessionErrorTerms = resourceKeys.map(() => []);
        discreteMetrics = { logicalTicks: 0, exactTicks: 0, batches: 0, largestBatch: 0,
          probes: 0, rejectedBatches: 0, verification: "not-evaluated" };
        catchUpSessionBefore = null;
        catchUpSessionStartedAt = 0;
        catchUpSessionProcessedClockSeconds = 0;
        catchUpOriginalClockSeconds = 0;
        catchUpOriginalProcessedClockSeconds = 0;
        catchUpOriginalClockLocked = false;
        catchUpPlanningBudgetExhaustions = 0;
        catchUpCompletedReport = "";
        catchUpCompleted = false;
      }

      function ensureCatchUpSession() {
        if (catchUpSessionBefore) return;
        sessionGains = resourceKeys.map(() => ZERO);
        sessionErrorEstimates = resourceKeys.map(() => ZERO);
        sessionProcessedGameSeconds = 0;
        catchUpSessionBefore = offlineProgressSnapshot();
        catchUpSessionStartedAt = Date.now();
        catchUpSessionProcessedClockSeconds = 0;
        catchUpOriginalClockSeconds = 0;
        catchUpOriginalProcessedClockSeconds = 0;
        catchUpOriginalClockLocked = false;
        catchUpPlanningBudgetExhaustions = 0;
        catchUpCompletedReport = "";
      }

      function cancelCatchUp() {
        catchUpGeneration += 1;
        awaySuspended=false;
        pendingCatchUpSeconds = 0;
        pendingCatchUpClockSeconds = 0;
        catchUpTasks.length = 0;
        catchUpInProgress = false;
        catchUpPaused = false;
        catchUpPauseReason = null;
        resetCatchUpSession();
        resetOnlineAccumulators();
        const resolver = catchUpResolver;
        catchUpResolver = null;
        catchUpPromise = null;
        catchUpNoticePromise = null;
        if (resolver) resolver("");
        publishCatchUpStatus();
      }

      function abandonCatchUp() {
        // Only an explicit player action may discard debt. Do not use this as
        // a timeout/error fallback. Host events run between atomic commits, so
        // everything already earned remains in the live resource/save state.
        const discardedGameSeconds = pendingCatchUpSeconds;
        const discardedClockSeconds = pendingCatchUpClockSeconds;
        if (!(discardedGameSeconds > epsilon)) return { abandoned: false };
        const previousUpdateAt = getState().lastUpdateAt;
        pendingCatchUpSeconds = 0;
        pendingCatchUpClockSeconds = 0;
        resetOnlineAccumulators();
        getState().lastUpdateAt = Date.now();
        try {
          // Persist resources and zero remaining debt in the SAME save. A
          // refresh must not resurrect the time the player chose to abandon.
          context.checkpoint?.();
        } catch (error) {
          pendingCatchUpSeconds = discardedGameSeconds;
          pendingCatchUpClockSeconds = discardedClockSeconds;
          getState().lastUpdateAt = previousUpdateAt;
          pauseCatchUp(catchUpDiagnostic("abandon-checkpoint-failed", catchUpTasks[0], 0, null, error));
          return { abandoned: false, error: String(error?.message || error) };
        }
        cancelCatchUp();
        context.setLastTickAt?.(Date.now());
        requestRender();
        return { abandoned: true, discardedGameSeconds, discardedClockSeconds };
      }

      function convertOfflineToCompensation() {
        if (internalWork) throw Error('必须在确认提交边界转换离线时间');
        const removed = catchUpTasks.filter(task => task.source === 'offline');
        const clockSeconds = removed.reduce((sum, task) => sum + task.remainingClockSeconds, 0);
        if (!(clockSeconds > 0)) return { converted: false, clockSeconds: 0 };
        const world = snapshotState(), oldTasks = [...catchUpTasks];
        const old = { pendingCatchUpSeconds, pendingCatchUpClockSeconds, catchUpOriginalClockSeconds,
          catchUpPaused, catchUpPauseReason, catchUpCompleted, presentation };
        // A UI action runs between synchronous slices. Retire the old async
        // worker before changing either side of the resource/time transaction.
        ++catchUpGeneration;
        const resolver = catchUpResolver;
        catchUpInProgress = false; catchUpPromise = null; catchUpResolver = null; catchUpNoticePromise = null;
        invalidateSourceModels();
        const remaining = oldTasks.filter(task => task.source !== 'offline');
        catchUpTasks.splice(0, catchUpTasks.length, ...remaining);
        pendingCatchUpSeconds = remaining.reduce((sum, task) => sum + task.remainingGameSeconds, 0);
        pendingCatchUpClockSeconds = remaining.reduce((sum, task) => sum + task.remainingClockSeconds, 0);
        catchUpOriginalClockSeconds = catchUpSessionProcessedClockSeconds + pendingCatchUpClockSeconds;
        presentation = 'quiet';
        if (!remaining.length) { catchUpPaused = false; catchUpPauseReason = null; catchUpCompleted = false; }
        let credit;
        try {
          credit = WIS.Simulation.Compensation.grant(getState(), clockSeconds);
          internalWork = true;
          context.checkpoint?.();
          if(!remaining.length)confirmedSources=freshConfirmedSources();
        } catch (error) {
          restoreState(world);
          catchUpTasks.splice(0, catchUpTasks.length, ...oldTasks);
          pendingCatchUpSeconds = old.pendingCatchUpSeconds;
          pendingCatchUpClockSeconds = old.pendingCatchUpClockSeconds;
          catchUpOriginalClockSeconds = old.catchUpOriginalClockSeconds;
          catchUpPaused = old.catchUpPaused; catchUpPauseReason = old.catchUpPauseReason;
          catchUpCompleted = old.catchUpCompleted; presentation = old.presentation;
          // Keep an existing player/error pause. A running task stops visibly
          // on failed persistence, retaining every unprocessed second.
          if (!catchUpPaused) {
            catchUpPaused = true;
            catchUpPauseReason = catchUpDiagnostic('conversion-checkpoint-failed', catchUpTasks[0], 0, null, error);
          }
          return { converted: false, clockSeconds: 0, error: String(error?.message || error) };
        } finally {
          internalWork = false;
          publishCatchUpStatus();
          if (resolver) resolver('');
        }
        if (!remaining.length) resetCatchUpSession();
        context.setLastTickAt?.(Date.now());
        publishCatchUpStatus(); requestRender();
        if (remaining.length && !catchUpPaused && !awaySuspended) void simulateOfflineProgress(0, 0);
        return { converted: true, clockSeconds, balance: credit.balance, conversionId: credit.lastConversion };
      }

      function newTimeSegmentId() {
        const old=getState().core.runtime.timeLedger;
        if(!old||old.version!==1||!Number.isSafeInteger(old.nextId+1))throw Error("时间片段序号不可用");
        getState().core.runtime.timeLedger={...old,nextId:old.nextId+1};
        return 'segment-'+old.nextId;
      }

      function makeCatchUpTask(safeElapsed,safeClock,options={}) {
        const legacyReferenceStep = safeElapsed > 60 + epsilon
          ? safeElapsed / offlineMaxSteps
          : simulationStepSeconds;
        const task = {
          category: ORIGINAL_TASK,
          id: options.id??newTimeSegmentId(),
          source: options.source==='online'?'online':'offline',
          compensationEligible: options.source==='online'&&options.compensationEligible===true,
          randomMode: options.randomMode==='state'?'state':'legacy',
          speed: options.speed??(safeClock>0?safeElapsed/safeClock:1),
          sealed: options.sealed!==false,
          clockCursor: Math.max(0,Number(options.clockCursor)||0),
          started: false,
          gameSeconds: safeElapsed,
          clockSeconds: safeClock,
          remainingGameSeconds: safeElapsed,
          remainingClockSeconds: safeClock,
          remainingSteps: offlineMaxSteps,
          legacyReferenceStep,
          suggestedStepSeconds: Math.min(safeElapsed,
            Math.max(simulationStepSeconds, Math.min(1, safeElapsed / offlineMaxSteps))),
          random: options.randomMode==='state'?{
            next:()=>WIS.Core.Runtime.withRandomSource(null,()=>WIS.Core.Runtime.random()),
            snapshot:()=>getState().core.runtime.randomState>>>0,
            restore:value=>{getState().core.runtime.randomState=value>>>0;}
          }:createOfflineTaskRandom(options.randomSeed ?? WIS.Core.Runtime.random()),
          treasureFallbackMode: false,
          treasureBatchMode: false,
          optimizationDisabled: false,
          legacyRetryUsed: false,
          pendingTreasureEvent: null,
          planningYieldReason: null,
          currentStepUsesBudgetFallback: false,
          treasurePlanningContinuation: null,
          adaptivePlanningContinuation: null,
          planningWork: null,
          cooperativePlanning: false,
          consecutivePlanningYields: 0,
          currentStepRemaining: 0,
          currentClockRemaining: 0,
          currentOuterStepGameSeconds: 0,
          currentOuterStepClockSeconds: 0,
          currentStepDiscreteEvents: 0,
          currentPartRemaining: 0,
          remainingParts: [],
          currentErrorEstimate: resourceKeys.map(() => ZERO),
          preparedStepPlan: null,
          nextValidatedSuggestion: null
        };
        return task;
      }

      function invalidateSourceModels() {
        for(const task of catchUpTasks){task.onlineWork?.close?.();task.onlineWork=null;task.onlineToken=null;task.fixedWork?.close?.();task.fixedWork=null;task.fixedToken=null;
          task.fastDriver?.close?.();task.fastDriver=null;
          task.fastForward=null;task.fastFinished=false;clearAssignedCatchUpStep(task);}
      }

      function appendCatchUpTask(elapsedSeconds,clockSeconds=elapsedSeconds,options={}) {
        const safeElapsed=Number(elapsedSeconds),safeClock=Number(clockSeconds);
        if(!(safeElapsed>0))return null;
        if(!Number.isFinite(safeElapsed)||!Number.isFinite(safeClock)||safeClock<0)throw Error("入队时间无效");
        // Append at a confirmed host boundary; never rewrite a running model's
        // horizon. An external time watermark invalidates its old world clone.
        if(catchUpTasks.some(task=>task.fastDriver||task.fastForward))invalidateSourceModels();
        if(!catchUpInProgress&&!catchUpPaused&&!catchUpTasks.length&&catchUpCompleted)resetCatchUpSession();
        ensureCatchUpSession();
        const tail=options.mergeWithTail?catchUpTasks.at(-1):null;
        const source=options.source==='online'?'online':'offline';
        const eligible=source==='online'&&options.compensationEligible===true;
        const speed=options.speed??(safeClock>0?safeElapsed/safeClock:1);
        const canMerge=tail&&!tail.started&&!tail.fastDriver&&!tail.fastForward&&
          tail.source===source&&tail.compensationEligible===eligible&&tail.speed===speed&&
          tail.randomMode===(options.randomMode==='state'?'state':'legacy')&&tail.sealed===(options.sealed!==false);
        const previousTail=catchUpTasks.at(-1);
        if(previousTail&&!canMerge&&previousTail.source==='online')previousTail.sealed=true;
        let task;
        if(canMerge){task=tail;task.gameSeconds+=safeElapsed;task.clockSeconds+=safeClock;
          task.remainingGameSeconds+=safeElapsed;task.remainingClockSeconds+=safeClock;}
        else {task=makeCatchUpTask(safeElapsed,safeClock,options);catchUpTasks.push(task);}
        if(!options.alreadyPending){pendingCatchUpSeconds+=safeElapsed;pendingCatchUpClockSeconds+=safeClock;catchUpOriginalClockSeconds+=safeClock;}
        if(options.presentation==='quiet'&&presentation===null)presentation='quiet';
        else if(presentation===null||options.presentation==='blocking')presentation='blocking';
        if(pendingCatchUpClockSeconds>5+epsilon)presentation='blocking';
        publishCatchUpStatus();return task;
      }

      function prepareQueueHead() {
        const task=catchUpTasks[0];if(!task)return false;
        if(task.source==='online'&&!task.sealed&&!task.started){
          const minimum=CONFIG.fixedSettlement.onlineCollectionSeconds;
          if(task.remainingGameSeconds+epsilon<minimum)return false;
          const first=task.logicalTickRemaining>epsilon?task.logicalTickRemaining:
            getState().core.runtime.onlineCadenceRemaining||simulationStepSeconds;
          const frames=1+Math.floor((task.remainingGameSeconds-first+epsilon)/simulationStepSeconds);
          if(frames===0)return false;
          const whole=Math.min(task.remainingGameSeconds,first+(frames-1)*simulationStepSeconds),ratio=task.remainingClockSeconds/task.remainingGameSeconds;
          const rest=task.remainingGameSeconds-whole;
          if(rest>epsilon){
            const tail=makeCatchUpTask(rest,rest*ratio,{...task,id:undefined,clockCursor:task.clockCursor+whole*ratio});
            catchUpTasks.splice(1,0,tail);
            task.gameSeconds=task.remainingGameSeconds=whole;
            task.clockSeconds=task.remainingClockSeconds=whole*ratio;
          }
          task.sealed=true;
        }
        task.started=true;return true;
      }

      function sealOnlineTail() {
        invalidateSourceModels();
        for(const task of catchUpTasks)if(task.source==='online')task.sealed=true;
      }

      function suspendForAway() {
        awaySuspended=true;
        catchUpGeneration++;
        for(const task of catchUpTasks)if(task.fastDriver){
          task.fastForward={memory:true,point:task.fastDriver.point()};
          task.fastDriver.close();task.fastDriver=null;
        }
        catchUpInProgress=false;
        const resolve=catchUpResolver;
        catchUpPromise=null;catchUpResolver=null;catchUpNoticePromise=null;
        resolve?.("");publishCatchUpStatus();
      }

      function returnFromAway(start=true) {
        awaySuspended=false;publishCatchUpStatus();
        if(start&&!catchUpPaused&&pendingCatchUpSeconds>epsilon)return simulateOfflineProgress(0,0);
        return Promise.resolve("");
      }

      function clearAssignedCatchUpStep(task) {
        task.currentPartRemaining = 0;
        task.remainingParts = [];
        task.preparedStepPlan = null;
        task.currentErrorEstimate = resourceKeys.map(() => ZERO);
        task.nextValidatedSuggestion = null;
        task.currentStepRemaining = 0;
        task.currentClockRemaining = 0;
        task.currentOuterStepGameSeconds = 0;
        task.currentOuterStepClockSeconds = 0;
        task.currentStepDiscreteEvents = 0;
        task.pendingTreasureEvent = null;
        task.planningYieldReason = null;
        task.currentStepUsesBudgetFallback = false;
        task.treasurePlanningContinuation = null;
        task.adaptivePlanningContinuation = null;
        task.planningWork = null;
        task.cooperativePlanning = false;
        task.consecutivePlanningYields = 0;
      }

      function catchUpStateSummary() {
        const state = getState();
        const printable = (value) => {
          try { return String(value ?? 0); } catch (_error) { return "<unprintable>"; }
        };
        return {
          cultivation: state.cultivation?.active ?? null,
          activeChallenge: state.activeChallenge ?? null,
          highestScaleIndex: Number(state.highestScaleIndex) || 0,
          advancedRealmLevel: Number(state.advancedRealmLevel) || 0,
          currentQiLayer: Number(state.currentQiLayer) || 0,
          joules: printable(state.joules),
          power: printable(state.power),
          mana: printable(state.mana),
          immortalPower: printable(state.immortalPower)
        };
      }

      function catchUpDiagnostic(reason, task, requestedSeconds, result = null, error = null) {
        return {
          type: "offline-catch-up-paused",
          occurredBuild: window.WIS_BUILD?.id ?? null,
          occurredRule: CONFIG.fixedSettlement.version,
          occurredAt: Date.now(),
          reason,
          requestedStepSeconds: Math.max(0, Number(requestedSeconds) || 0),
          reportedProcessedSeconds: Math.max(0, Number(result?.processedSeconds) || 0),
          eventCommitted: result?.eventCommitted === true,
          pendingGameSeconds: pendingCatchUpSeconds,
          pendingClockSeconds: pendingCatchUpClockSeconds,
          planningBudgetExhaustions: catchUpPlanningBudgetExhaustions,
          task: task ? {
            id: task.id,
            clockCursor: task.clockCursor,
            remainingGameSeconds: task.remainingGameSeconds,
            remainingClockSeconds: task.remainingClockSeconds,
            optimizationDisabled: task.optimizationDisabled,
            treasureFallbackMode: task.treasureFallbackMode,
            treasureBatchMode: task.treasureBatchMode,
            planningYieldReason: task.planningYieldReason,
            legacyRetryUsed: task.legacyRetryUsed
          } : null,
          state: catchUpStateSummary(),
          error: error ? {
            name: String(error.name || "Error"),
            code: error.code ?? null,
            message: String(error.message || error),
            stack: typeof error.stack === 'string' ? error.stack.slice(0, 4000) : null,
            ...(error.treasureContext ? { treasureContext: error.treasureContext } : {})
          } : null
        };
      }

      function retryCatchUpTaskWithLegacy(task, diagnostic) {
        if (!task || task.legacyRetryUsed) return false;
        task.legacyRetryUsed = true;
        task.optimizationDisabled = true;
        clearAssignedCatchUpStep(task);
        console.warn("WIS catch-up made no progress; retrying once with legacy stepping.", diagnostic);
        return true;
      }

      function pauseCatchUp(diagnostic) {
        if (catchUpPaused) return;
        catchUpPaused = true;
        catchUpPauseReason = diagnostic;
        pauseRestored = false;
        if (diagnostic?.reason !== "player-paused") console.error("WIS offline catch-up paused; pending time was retained.", diagnostic);
        publishCatchUpStatus();
      }

      function assignCatchUpStep(task, stepGameSeconds, metadata = {}) {
        const clockPerGameSecond = task.remainingGameSeconds > 0
          ? task.remainingClockSeconds / task.remainingGameSeconds
          : 0;
        task.currentStepRemaining = stepGameSeconds;
        task.currentClockRemaining = stepGameSeconds * clockPerGameSecond;
        task.currentOuterStepGameSeconds = stepGameSeconds;
        task.currentOuterStepClockSeconds = task.currentClockRemaining;
        task.currentStepDiscreteEvents = 0;
        task.currentStepUsesBudgetFallback = false;
        const parts = Array.isArray(metadata.stepParts) && metadata.stepParts.length > 0
          ? metadata.stepParts.filter((part) => Number.isFinite(part) && part > epsilon)
          : [stepGameSeconds];
        task.currentPartRemaining = parts[0] || stepGameSeconds;
        task.remainingParts = parts.slice(1);
        task.currentErrorEstimate = resourceKeys.map((_, i) => maxBN(ZERO, metadata.errorEstimate?.[i] ?? ZERO));
        task.preparedStepPlan = metadata.firstPreparedStepPlan || null;
        task.nextValidatedSuggestion = Number(metadata.suggestedNextSeconds) > 0
          ? Number(metadata.suggestedNextSeconds) : null;
        return stepGameSeconds > 0;
      }

      function legacyFallbackStepSeconds(task, minimumRequiredStep) {
        return Math.min(task.remainingGameSeconds, Math.max(
          minimumRequiredStep,
          Math.min(task.legacyReferenceStep, task.remainingGameSeconds)
        ));
      }

      function planningResult(value, fallbackSeconds) {
        if (value && typeof value === "object") {
          return {
            ...value,
            seconds: Math.max(0, Number(value.seconds) || fallbackSeconds),
            budgetExhausted: value.budgetExhausted === true,
            reason: value.reason || null,
            accuracyLimited: value.accuracyLimited === true,
            continuation: value.continuation || null
          };
        }
        return {
          seconds: Math.max(0, Number(value) || fallbackSeconds),
          budgetExhausted: false,
          reason: null,
          accuracyLimited: false,
          continuation: null
        };
      }

      function assignBudgetYieldStep(task, minimumRequiredStep, reason) {
        catchUpPlanningBudgetExhaustions += 1;
        task.planningYieldReason = reason || "offline-planning-budget";
        task.planningWork = null;
        assignCatchUpStep(task, Math.min(task.remainingGameSeconds, simulationStepSeconds));
        task.currentStepUsesBudgetFallback = true;
        return "yield";
      }

      function requestResumablePlanningYield(task, reason) {
        catchUpPlanningBudgetExhaustions += 1;
        task.consecutivePlanningYields += 1;
        task.planningYieldReason = reason || "offline-planning-budget";
        // Slow formulas are indivisible, but a completed formula/event trial is
        // reusable. After repeated overruns, schedule one such unit per frame;
        // never discard its cursor and restart the same expensive prediction.
        if (task.consecutivePlanningYields >= 2) task.cooperativePlanning = true;
        return "yield";
      }

      function denseTreasureStepLimit(task) {
        return Math.max(
          denseTreasureBatchSeconds,
          task.gameSeconds > 60 + epsilon ? task.legacyReferenceStep : simulationStepSeconds
        );
      }

      function prepareDiscreteCatchUpStep(task) {
        task.discreteMode = true;
        task.planningYieldReason = null;
        // This describes replay of the online algorithm, not a claim about
        // the numerical precision of its underlying resource representation.
        discreteMetrics.verification = "exact-online-ticks";
        // An event may consume only part of a logic frame. Finish its original
        // remainder before starting the next endpoint frame.
        const tail = task.logicalTickRemaining > epsilon
          ? task.logicalTickRemaining : simulationStepSeconds;
        return assignCatchUpStep(task, tail <= task.remainingGameSeconds + epsilon
          ? tail : task.remainingGameSeconds);
      }

      function prepareCatchUpStep(task, planningDeadlineMs = Infinity) {
        if (!WIS.Core.Runtime.isOfflineExecution()) {
          return WIS.Core.Runtime.withOfflineExecution(() => prepareCatchUpStep(task, planningDeadlineMs));
        }
        if (!(task.remainingGameSeconds > epsilon)) return false;
        if (usesExactTicks) return prepareDiscreteCatchUpStep(task);
        const slots = Math.max(1, task.remainingSteps);
        const minimumRequiredStep = task.remainingGameSeconds / slots;
        task.planningYieldReason = null;
        if (task.optimizationDisabled || task.treasureFallbackMode) {
          return assignCatchUpStep(task, legacyFallbackStepSeconds(task, minimumRequiredStep));
        }
        try {
          const state = getState();
          const sourceKey = JSON.stringify([
            typeof WIS.Core.State?.toSerializable === "function"
              ? WIS.Core.State.toSerializable(state) : state,
            WIS.Core.Registries?.getActivePower(state)?.snapshotTreasureTransient?.(),
            WIS.Core.Registries?.getActiveCultivation(state)?.snapshotTreasureTransient?.(),
            task.random.snapshot?.()
          ], (key, value) => key === "lastUpdateAt" ? undefined : value);
          let work = task.planningWork;
          if (!work || work.sourceKey !== sourceKey ||
              work.remainingGameSeconds !== task.remainingGameSeconds ||
              work.minimumRequiredStep !== minimumRequiredStep) {
            const clockRatio = task.remainingGameSeconds > 0
              ? task.remainingClockSeconds / task.remainingGameSeconds : 0;
            // The statistics achievement is the current clock-only unlock.
            // Slice in wall-clock units, including development speed scaling.
            const untilClockUnlock = !state.unlockedAchievements?.trainingUp &&
              state.totalElapsedSeconds < 600 && clockRatio > 0
              ? (600 - state.totalElapsedSeconds) / clockRatio : Infinity;
            work = task.planningWork = {
              sourceKey,
              remainingGameSeconds: task.remainingGameSeconds,
              minimumRequiredStep,
              proposedStep: Math.min(task.remainingGameSeconds, untilClockUnlock, Math.max(
                simulationStepSeconds, task.suggestedStepSeconds
              )),
              phase: "boundary",
              continuation: null,
              pendingTreasureEvent: null
            };
            task.pendingTreasureEvent = null;
            task.consecutivePlanningYields = 0;
          }
          const options = {
            deadlineMs: planningDeadlineMs,
            sourceKey,
            offline: true,
            integrationMethod: "midpoint",
            withMeta: true,
            workBudget: {
              operations: 0,
              maximumOperations: task.cooperativePlanning ? 1 : Infinity,
              ensureProgress: true
            }
          };
          const pause = (result, reason) => {
            work.continuation = result.continuation || null;
            if (task.cooperativePlanning && catchUpClockNow() < planningDeadlineMs) {
              task.cooperativePlanning = false;
              task.consecutivePlanningYields = 0;
            }
            return work.continuation
              ? requestResumablePlanningYield(task, result.reason || reason)
              : assignBudgetYieldStep(task, minimumRequiredStep, result.reason || reason);
          };
          if (work.phase === "boundary") {
            const boundaryResult = planningResult(nextKnownSimulationBoundarySeconds(work.proposedStep, {
              ...options, continuation: work.continuation
            }), Math.min(work.proposedStep, simulationStepSeconds));
            if (boundaryResult.budgetExhausted) return pause(boundaryResult, "known-boundary-budget");
            work.proposedStep = Math.max(
              Math.min(simulationStepSeconds, work.proposedStep), boundaryResult.seconds
            );
            work.preparedStepPlan = boundaryResult.preparedStepPlan || null;
            work.continuation = null;
            work.phase = "treasure";
          }
          if (work.phase === "treasure" && task.treasureBatchMode) {
            work.phase = "adaptive";
          }
          if (work.phase === "treasure") {
            const treasureEvent = nextEffectiveTreasureEventSeconds(
              task,
              work.proposedStep,
              task.legacyReferenceStep,
              { ...options, continuation: work.continuation }
            );
            if (treasureEvent?.budgetExhausted) {
              return pause(treasureEvent, "treasure-event-budget");
            }
            if (treasureEvent) {
              if (!treasureEvent.dense && treasureEvent.seconds + epsilon >= simulationStepSeconds) {
                work.proposedStep = Math.min(work.proposedStep, treasureEvent.seconds);
                work.pendingTreasureEvent = { ...treasureEvent, bucketed: false };
              } else if (treasureEvent.dense) {
                task.treasureBatchMode = true;
                work.pendingTreasureEvent = { ...treasureEvent, bucketed: true };
                // Establish the first inventory feedback over a short interval;
                // later intervals are controlled by measured gain error, not a
                // permanent 1s ceiling on an arbitrarily long recovery.
                work.proposedStep = Math.min(work.proposedStep, denseTreasureBatchSeconds);
              } else {
                task.treasureFallbackMode = true;
                task.planningWork = null;
                return assignCatchUpStep(task, legacyFallbackStepSeconds(task, minimumRequiredStep));
              }
            }
            work.continuation = null;
            work.phase = "adaptive";
          }
          const proposedStep = work.proposedStep;
          const treasureDriverMinimumStep = task.treasureBatchMode
            ? Math.max(minimumRequiredStep, Math.min(denseTreasureStepLimit(task), proposedStep))
            : Math.max(minimumRequiredStep, Math.min(task.legacyReferenceStep, proposedStep));
          const adaptiveResult = planningResult(adaptiveOfflineStepSeconds(
            proposedStep,
            Math.min(simulationStepSeconds, task.remainingGameSeconds),
            treasureDriverMinimumStep,
            {
              ...options,
              preparedStepPlan: work.preparedStepPlan,
              errorBudget: {
                gains: sessionGains,
                errors: sessionErrorEstimates,
                processedSeconds: sessionProcessedGameSeconds,
                totalSeconds: sessionProcessedGameSeconds + pendingCatchUpSeconds,
                relativeTolerance: estimatedRelativeBudget,
                absoluteTolerance: resourceKeys.map(() => recoveryAbsoluteBudget)
              },
              continuation: work.continuation
            }
          ), minimumRequiredStep);
          if (adaptiveResult.budgetExhausted) {
            return pause(adaptiveResult, "adaptive-projection-budget");
          }
          task.planningWork = null;
          task.consecutivePlanningYields = 0;
          task.cooperativePlanning = false;
          task.pendingTreasureEvent = work.pendingTreasureEvent;
          const stepGameSeconds = adaptiveResult.seconds;
          if (task.pendingTreasureEvent && !task.pendingTreasureEvent.bucketed &&
              stepGameSeconds + epsilon < task.pendingTreasureEvent.seconds) {
            task.pendingTreasureEvent = null;
          }
          return assignCatchUpStep(task, stepGameSeconds, adaptiveResult);
        } catch (error) {
          console.error("WIS offline optimization failed; switching this task to legacy simulation.", error);
          task.optimizationDisabled = true;
          task.pendingTreasureEvent = null;
          return assignCatchUpStep(task, legacyFallbackStepSeconds(task, minimumRequiredStep));
        }
      }

      function completeCatchUpStep(task, processedSeconds = 0, countSegment = false) {
        if (countSegment && !task.currentStepUsesBudgetFallback) task.remainingSteps -= 1;
        if (task.remainingGameSeconds <= epsilon) {
          catchUpTasks.shift();
          if (catchUpTasks.length === 0) {
            pendingCatchUpSeconds = 0;
            pendingCatchUpClockSeconds = 0;
          }
          return;
        }
        if (task.remainingSteps <= 0) task.remainingSteps = 1;
        task.suggestedStepSeconds = Math.max(simulationStepSeconds,
          task.nextValidatedSuggestion || (processedSeconds > 0 ? processedSeconds : task.legacyReferenceStep) * 2);
        task.currentStepRemaining = 0;
        task.currentClockRemaining = 0;
        task.currentOuterStepGameSeconds = 0;
        task.currentOuterStepClockSeconds = 0;
        task.currentStepDiscreteEvents = 0;
        task.currentPartRemaining = 0;
        task.remainingParts = [];
        task.preparedStepPlan = null;
        task.pendingTreasureEvent = null;
        task.planningYieldReason = null;
        task.currentStepUsesBudgetFallback = false;
        task.treasurePlanningContinuation = null;
        task.adaptivePlanningContinuation = null;
        task.planningWork = null;
        task.consecutivePlanningYields = 0;
      }

      function subtractFixedTime(remaining, processed) {
        // Whole .1s frame debt is integer arithmetic. Repeated Number
        // subtraction otherwise turns the last frame into a shorter frame.
        const a=Math.round(remaining*10), b=Math.round(processed*10);
        if (Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&
            Math.abs(remaining-a/10)<1e-9&&Math.abs(processed-b/10)<1e-9)
          return Math.max(0,a-b)/10;
        return Math.max(0,remaining-processed);
      }

      function advanceFastForwardTask(task) {
        // Historical models advance explicit time effects in game seconds.
        // A non-unit developer clock ratio needs a separately validated model;
        // retain the correct original-frame path for those source segments.
        if(task.speed!==1)return null;
        // Credit uses original-frame production with exact quota boundaries.
        // The existing historical models have no verified quota recurrence.
        if(task.source==='online'&&task.compensationEligible)return null;
        if(task.source==='online'&&task.remainingGameSeconds<1.2)return null;
        const fast = WIS.Simulation.FastForward;
        if (!task.fastForward && getState().offlineFastForwardEnabled === false) return null;
        if (!task.fastDriver && !task.fastForward && ((getState().activeChallenge && !["mortalTransformation", "yinVoidYangReal"].includes(getState().activeChallenge)) ||
            !WIS.Core.BigNum.eq(getState().minorTribulationExplorationLoad ?? 0, 0))) return null;
        // Only an unfinished original tick or a sub-tick tail may use the
        // exact commit below. Never resume the old whole-task scheduler.
        if (task.remainingGameSeconds < simulationStepSeconds - epsilon ||
            task.logicalTickRemaining > epsilon) return null;
        let unavailable = null;
        if (fast && !task.fastDriver && !task.fastForward && !fast.applicable()) return null;
        if (!fast) unavailable = "离线快进模块未加载，请刷新后重试。";
        else if (simulationStepSeconds !== 0.1 ||
            Math.abs(task.remainingGameSeconds - task.remainingClockSeconds) > 1e-7) return null;
        else if (task.fastFinished) unavailable = "快进已结束但仍有整帧欠账，已停止以保护存档。";
        if (unavailable) {
          pauseCatchUp(catchUpDiagnostic("fast-forward-unavailable", task, 0, null, new Error(unavailable)));
          return { paused: true };
        }
        const previousPoint = task.fastForward || null;
        const before = captureCatchUpStep(task, false, task.fastDriver?.point().game.state);
        let result = null, error = null;
        beginTransaction();
        try {
          if (!task.fastDriver) task.fastDriver = fast.createDriver(context, {
            seconds: task.remainingGameSeconds, random: task.random, gains: sessionGains, resume: task.fastForward
          });
          result = task.fastDriver.advance();
          task.fastForward = { memory: true, point: task.fastDriver.point() };
          const seconds = Math.min(task.remainingGameSeconds, result.seconds);
          sessionGains = result.gains.map(BN);
          // The original runtime adapter has already advanced game/statistics
          // clocks. Only fixed debt is posted here, once, after the safe yield.
          task.remainingGameSeconds = subtractFixedTime(task.remainingGameSeconds, seconds);
          task.remainingClockSeconds = subtractFixedTime(task.remainingClockSeconds, seconds);
          pendingCatchUpSeconds = subtractFixedTime(pendingCatchUpSeconds, seconds);
          pendingCatchUpClockSeconds = subtractFixedTime(pendingCatchUpClockSeconds, seconds);
          task.clockCursor+=seconds;
          catchUpSessionProcessedClockSeconds += seconds;
          catchUpOriginalProcessedClockSeconds += seconds;
          sessionProcessedGameSeconds += seconds;
          const previousMetrics = fastForwardMetrics;
          const previousEngine = previousMetrics?.algorithm || "late-50";
          const nextEngine = result.stats?.algorithm || "late-50";
          const priorEngines = previousMetrics?.priorEngines || [];
          fastForwardMetrics = { ...result.stats, priorEngines: previousMetrics && previousEngine !== nextEngine
            ? [...priorEngines.slice(-7), { ...previousMetrics, priorEngines: undefined }] : priorEngines };
          fastForwardUsed = true;
          if (result.replan && !result.completed && task.remainingGameSeconds >= simulationStepSeconds) {
            task.fastDriver.close();
            task.fastDriver = fast.createDriver(context, {
              seconds: task.remainingGameSeconds, random: task.random, gains: sessionGains
            });
            task.fastForward = { memory: true, point: task.fastDriver.point() };
          }
          if (result.completed) {
            task.fastDriver.close(); task.fastDriver = null;
            task.fastForward = null; task.fastFinished = true;
          }
        } catch (caught) { error = caught; }
        // A failed trial must not flush its deferred save before rollback.
        if (error) {
          restoreCatchUpStep(task, before);
          task.fastForward = previousPoint;
          task.fastDriver = null;
        }
        try { endTransaction(); } catch (caught) { error ||= caught; }
        if (error) {
          restoreCatchUpStep(task, before);
          task.fastForward = previousPoint;
          task.fastDriver = null; task.fastFinished = false;
          pauseCatchUp(catchUpDiagnostic("fast-forward-exception", task, 0, null, error));
          return { paused: true };
        }
        if (task.remainingGameSeconds <= epsilon) completeCatchUpStep(task);
        return result;
      }

      function pauseAfterOnlineError(error) {
        pauseCatchUp(catchUpDiagnostic("online-frame-exception", catchUpTasks[0], 0, null, error));
        checkpointCatchUp();
      }

      function pauseCatchUpByPlayer() {
        if (!catchUpInProgress || catchUpPaused || !(pendingCatchUpSeconds > epsilon)) return false;
        pauseCatchUp({ reason: "player-paused", pendingGameSeconds: pendingCatchUpSeconds });
        checkpointCatchUp();
        return true;
      }

      function captureCatchUpStep(task, borrow = false, confirmedState = null) {
        return {
          confirmedSources:{...confirmedSources},
          fixedConfirmed: WIS.Simulation.FixedSegment.confirmed(),
          onlineConfirmed:context.onlineMetrics?.(),
          state: confirmedState ?? (typeof snapshotState === "function" ? snapshotState({ borrow }) : null),
          random: typeof task?.random?.snapshot === "function" ? task.random.snapshot() : null,
          task: task ? {
            clockCursor: task.clockCursor,
            remainingGameSeconds: task.remainingGameSeconds,
            remainingClockSeconds: task.remainingClockSeconds,
            remainingSteps: task.remainingSteps,
            currentPartRemaining: task.currentPartRemaining,
            remainingParts: [...task.remainingParts],
            currentErrorEstimate: [...task.currentErrorEstimate],
            preparedStepPlan: task.preparedStepPlan,
            currentStepRemaining: task.currentStepRemaining,
            currentClockRemaining: task.currentClockRemaining,
            currentOuterStepGameSeconds: task.currentOuterStepGameSeconds,
            currentOuterStepClockSeconds: task.currentOuterStepClockSeconds,
            currentStepDiscreteEvents: task.currentStepDiscreteEvents,
            pendingTreasureEvent: task.pendingTreasureEvent,
            treasureBatchMode: task.treasureBatchMode,
            treasureFallbackMode: task.treasureFallbackMode,
            optimizationDisabled: task.optimizationDisabled,
            planningYieldReason: task.planningYieldReason,
            currentStepUsesBudgetFallback: task.currentStepUsesBudgetFallback,
            treasurePlanningContinuation: task.treasurePlanningContinuation,
            adaptivePlanningContinuation: task.adaptivePlanningContinuation,
            consecutivePlanningYields: task.consecutivePlanningYields,
            logicalTickRemaining: task.logicalTickRemaining || 0
          } : null,
          pendingGameSeconds: pendingCatchUpSeconds,
          pendingClockSeconds: pendingCatchUpClockSeconds,
          processedClockSeconds: catchUpSessionProcessedClockSeconds,
          originalProcessedClockSeconds: catchUpOriginalProcessedClockSeconds,
          planningBudgetExhaustions: catchUpPlanningBudgetExhaustions,
          sessionGains: [...sessionGains],
          sessionErrorEstimates: [...sessionErrorEstimates],
          sessionErrorTerms: sessionErrorTerms.map(terms => terms.map(term => ({ ...term }))),
          discreteMetrics: { ...discreteMetrics },
          fastForwardUsed, fastForwardMetrics,
          sessionProcessedGameSeconds
        };
      }

      function restoreCatchUpStep(task, snapshot) {
        confirmedSources={...snapshot.confirmedSources};
        WIS.Simulation.FixedSegment.restoreConfirmed(snapshot.fixedConfirmed);
        context.restoreOnlineMetrics?.(snapshot.onlineConfirmed);
        let restoreError = null;
        if (snapshot?.state !== null && typeof restoreState === "function") {
          try { restoreState(snapshot.state); } catch (error) { restoreError = error; }
        }
        if (snapshot?.random !== null && typeof task?.random?.restore === "function") {
          try { task.random.restore(snapshot.random); } catch (error) { restoreError ||= error; }
        }
        if (task && snapshot?.task) Object.assign(task, snapshot.task);
        sessionGains = snapshot.sessionGains;
        sessionErrorEstimates = snapshot.sessionErrorEstimates;
        sessionErrorTerms = snapshot.sessionErrorTerms || resourceKeys.map(() => []);
        discreteMetrics = snapshot.discreteMetrics || discreteMetrics;
        fastForwardUsed = snapshot.fastForwardUsed ?? fastForwardUsed;
        fastForwardMetrics = snapshot.fastForwardMetrics ?? fastForwardMetrics;
        sessionProcessedGameSeconds = snapshot.sessionProcessedGameSeconds;
        pendingCatchUpSeconds = snapshot?.pendingGameSeconds ?? pendingCatchUpSeconds;
        pendingCatchUpClockSeconds = snapshot?.pendingClockSeconds ?? pendingCatchUpClockSeconds;
        catchUpSessionProcessedClockSeconds = snapshot?.processedClockSeconds ?? catchUpSessionProcessedClockSeconds;
        catchUpOriginalProcessedClockSeconds = snapshot?.originalProcessedClockSeconds
          ?? catchUpOriginalProcessedClockSeconds;
        catchUpPlanningBudgetExhaustions = snapshot?.planningBudgetExhaustions
          ?? catchUpPlanningBudgetExhaustions;
        if (restoreError) throw restoreError;
      }

      function acknowledgeCatchUp() {
        if (catchUpInProgress || catchUpPaused) return false;
        if (!catchUpCompleted) return true;
        resetCatchUpSession();
        publishCatchUpStatus();
        return true;
      }

      // Resource state and this debt are serialized in ONE localStorage write. Only
      // committed time is removed; discarded projections are never persisted.
      function getPersistenceSnapshot({ closing = false } = {}) {
        if (!(pendingCatchUpSeconds > epsilon)) return null;
        return {
          version: 2,
          settlementRule: CONFIG.fixedSettlement.version,
          offlineSegmentSeconds: CONFIG.fixedSettlement.offlineSeconds,
          confirmedSources:{...confirmedSources},
          presentation: presentation||'blocking',
          awaySuspended,
          closedAt: closing ? Date.now() : null,
          totalClockSeconds: catchUpOriginalClockSeconds,
          processedClockSeconds: catchUpSessionProcessedClockSeconds,
          before: catchUpSessionBefore,
          gains: sessionGains,
          errors: sessionErrorEstimates,
          errorTerms: sessionErrorTerms,
          executionReference: "fixed-start-sources-v1",
          discreteMetrics,
          processedGameSeconds: sessionProcessedGameSeconds,
          transient: context.snapshotTransient?.() ?? null,
          treasureProgressVersion: 1,
          fastForwardUsed, fastForwardMetrics,
          paused: catchUpPaused,
          pauseReason: catchUpPauseReason,
          tasks: catchUpTasks.filter((task) => task.remainingGameSeconds > epsilon).map((task) => ({
            id: task.id, source: task.source, compensationEligible: task.compensationEligible,
            randomMode: task.randomMode, speed: task.speed, sealed: task.sealed,
            clockCursor: task.clockCursor,
            gameSeconds: task.remainingGameSeconds,
            clockSeconds: task.remainingClockSeconds,
            random: task.random?.snapshot?.() ?? null,
            logicalTickRemaining: task.logicalTickRemaining || 0,
            unverifiableBatchPrecision: task.unverifiableBatchPrecision === true,
            fastForward: task.fastDriver ? task.fastDriver.export() : task.fastForward?.memory ? WIS.Simulation.FastForward.exportPoint(task.fastForward.point) : task.fastForward || null
          }))
        };
      }

      function restorePersistenceSnapshot(snapshot, newlyOfflineSeconds = 0, { checkpoint = true } = {}) {
        if (snapshot?.settlementRule != null && (snapshot.settlementRule !== CONFIG.fixedSettlement.version ||
            snapshot.offlineSegmentSeconds !== CONFIG.fixedSettlement.offlineSeconds)) throw Error("不支持的固定分段规则");
        if (![1,2].includes(snapshot?.version) || !Array.isArray(snapshot.tasks) ||
            !snapshot.tasks.length || catchUpTasks.length || catchUpInProgress) return false;
        if (snapshot.tasks.some((task) => !Number.isFinite(task?.gameSeconds) ||
            task.gameSeconds <= 0 || !Number.isFinite(task.clockSeconds) || task.clockSeconds < 0)) return false;
        const savedSources=validateConfirmedSources(snapshot.confirmedSources);
        resetCatchUpSession();
        confirmedSources=savedSources||freshConfirmedSources();
        const remainingClock=snapshot.tasks.reduce((sum,task)=>sum+task.clockSeconds,0);
        const processedEvidence=Number(snapshot.processedClockSeconds)>epsilon||Number(snapshot.processedGameSeconds)>epsilon||
          Number(snapshot.totalClockSeconds)>remainingClock+epsilon||snapshot.tasks.some(task=>Number(task.clockCursor)>epsilon);
        if((processedEvidence&&!savedSources)||snapshot.tasks.some(task=>!['online','offline'].includes(task.source)))confirmedSources.unknown=true;
        if(processedEvidence&&!confirmedSources.online&&!confirmedSources.offline)confirmedSources.unknown=true;
        for (const savedTask of snapshot.tasks) {
          // Restoring an existing task must not consume the online RNG again.
          const task = appendCatchUpTask(savedTask.gameSeconds, savedTask.clockSeconds,
            { ...savedTask, randomSeed: (savedTask.random ?? getState().core.runtime.randomState) / 0x100000000 });
          if (savedTask.random !== null) task.random?.restore?.(savedTask.random);
          task.logicalTickRemaining = Math.max(0, Math.min(simulationStepSeconds,
            Number(savedTask.logicalTickRemaining) || 0));
          task.unverifiableBatchPrecision = savedTask.unverifiableBatchPrecision === true;
          task.fastForward = null; // obsolete prediction cursor; confirmed assets/debt already restored
        }
        fastForwardUsed = false;
        fastForwardMetrics = null;
        const processed = Math.max(0, Number(snapshot.processedClockSeconds) || 0);
        catchUpSessionProcessedClockSeconds = processed;
        catchUpOriginalProcessedClockSeconds = processed;
        catchUpOriginalClockSeconds = processed + pendingCatchUpClockSeconds;
        if (snapshot.before && typeof snapshot.before === "object") catchUpSessionBefore = snapshot.before;
        sessionGains = resourceKeys.map((key, i) => maxBN(ZERO,
          snapshot.gains?.[i] ?? sub(getState()[key], catchUpSessionBefore?.[key] ?? ZERO)));
        sessionErrorEstimates = resourceKeys.map((_, i) => maxBN(ZERO, snapshot.errors?.[i] ?? ZERO));
        sessionErrorTerms = resourceKeys.map((_, i) => Array.isArray(snapshot.errorTerms?.[i])
          ? snapshot.errorTerms[i].filter(term => term && Number.isFinite(Number(term.weight)) && term.weight >= 0)
            .map(term => ({ scale: BN(term.scale), weight: Number(term.weight) }))
          : [{ scale: sessionErrorEstimates[i], weight: 1 }]);
        if (snapshot.discreteMetrics) discreteMetrics = { ...discreteMetrics, ...snapshot.discreteMetrics };
        sessionProcessedGameSeconds = Math.max(0, Number(snapshot.processedGameSeconds) || 0);
        if (snapshot.transient) {
          if (snapshot.treasureProgressVersion !== 1)
            WIS.Meta.TreasureProgress?.importLegacyTransient(getState(), snapshot.transient);
          else context.restoreTransient?.(snapshot.transient);
        }
        let fastRestoreError = null;
        const fastTask = catchUpTasks.find(task => task.fastForward);
        if (fastTask) {
          try {
            if (catchUpTasks[0] !== fastTask || !WIS.Simulation.FastForward) throw new Error("快进检查点的执行模块或队列位置无效");
            const point = WIS.Simulation.FastForward.unpack(fastTask.fastForward);
            WIS.Simulation.FastForward.validatePoint(point, fastTask.remainingGameSeconds);
            restoreState(point.game.state);
            sessionGains = point.game.gains.map(BN);
          } catch (error) { fastRestoreError = error; }
        }
        // Time AFTER a normal close is genuine new offline time. A crash checkpoint
        // has no close timestamp, so interrupted recovery waiting cannot be awarded.
        appendCatchUpTask(newlyOfflineSeconds, newlyOfflineSeconds);
        presentation=snapshot.presentation==='quiet'?'quiet':snapshot.presentation==='notice'?'notice':'blocking';
        if(pendingCatchUpClockSeconds>5+epsilon)presentation='blocking';
        awaySuspended=snapshot.awaySuspended===true;
        catchUpOriginalClockLocked = true;
        catchUpPaused = snapshot.paused === true || fastRestoreError !== null;
        catchUpPauseReason = fastRestoreError
          ? catchUpDiagnostic("fast-checkpoint-invalid", fastTask, 0, null, fastRestoreError)
          : catchUpPaused ? snapshot.pauseReason : null;
        pauseRestored = catchUpPaused && !fastRestoreError && catchUpPauseReason?.reason!=="player-paused";
        publishCatchUpStatus();
        if (checkpoint) checkpointCatchUp();
        return true;
      }

      function checkpointCatchUp(force = true) {
        if (!force && Date.now() - lastCheckpointAt < 1000) return;
        const started=catchUpClockNow();
        const previousInternalWork=internalWork;internalWork=true;
        try {
          context.checkpoint?.();
        } catch (error) {
          if (pendingCatchUpSeconds > epsilon) {
            pauseCatchUp(catchUpDiagnostic("checkpoint-failed", catchUpTasks[0], 0, null, error));
          } else {
            console.error("WIS completed recovery checkpoint could not be saved.", error);
          }
        }
        finally {internalWork=previousInternalWork;}
        settlementCosts.checkpointMs+=catchUpClockNow()-started;
        settlementCosts.checkpointCount++;
        lastCheckpointAt = Date.now();
      }

      function finishCatchUpClock() {
        // Completion (not dismissal of the summary) starts the next online interval.
        if(presentation==='blocking')context.setLastTickAt?.(Date.now());
        checkpointCatchUp(presentation==='blocking');
      }

      function retryCatchUp() {
        if (!catchUpPaused || !(pendingCatchUpSeconds > 0)) return catchUpPromise || Promise.resolve("");
        if (catchUpInProgress) {
          const activePromise = catchUpPromise || Promise.resolve("");
          return activePromise.then(() => retryCatchUp());
        }
        if(catchUpPauseReason?.error?.code==='signed-interval')WIS.Core.SignedLedger?.retryPrecision?.();
        catchUpPaused = false;
        catchUpPauseReason = null;
        pauseRestored = false;
        // Explicit retry accepts the complete preserved queue, including its
        // sub-frame tail. Normal foreground accumulation still waits for 0.1s.
        sealOnlineTail();
        const task = catchUpTasks[0];
        if (task) {
          task.legacyRetryUsed = false;
          clearAssignedCatchUpStep(task);
        }
        return simulateOfflineProgress(0, 0);
      }

      function simulateOfflineProgress(elapsedSeconds, clockSeconds = elapsedSeconds) {
        appendCatchUpTask(elapsedSeconds, clockSeconds);
        if (!(pendingCatchUpSeconds > 0)) return Promise.resolve("");
        if (catchUpPaused||awaySuspended) return Promise.resolve("");
        if (catchUpPromise) return catchUpPromise;
        // Ordinary sub-frame time is real debt, but has no runnable frame yet.
        // Do not create a worker, save or notification for every 16ms tail.
        if (!prepareQueueHead()) return Promise.resolve("");
        const generation = ++catchUpGeneration;
        ensureCatchUpSession();
        const previousAchievements = achievementStates();
        catchUpOriginalClockLocked = true;
        catchUpInProgress = true;
        catchUpCompleted = false;
        catchUpPromise = new Promise((resolve) => { catchUpResolver = resolve; });
        const activePromise = catchUpPromise;
        checkpointCatchUp(presentation==='blocking');
        publishCatchUpStatus();
        void (async () => {
          while (generation === catchUpGeneration && !catchUpPaused && !awaySuspended) {
            if (catchUpTasks.length === 0||!prepareQueueHead()) break;
            // Historical treasure work never runs inside the simulation's
            // 0.1-second domain transaction. No clock or RNG advances here.
            const recovery=WIS.Meta.TreasureProgress.Recovery;
            if(recovery.needed(getState())){
              treasureRecoveryJob=recovery.create(getState());publishCatchUpStatus();
              const paint=()=>typeof context.yieldToHost==='function'?context.yieldToHost():
                typeof window.requestAnimationFrame==='function'&&!document.hidden
                  ?new Promise(resolve=>window.requestAnimationFrame(()=>window.setTimeout(resolve,0)))
                  :yieldForFirstPaint();
              try{
                await paint();
                while(generation===catchUpGeneration&&!catchUpPaused&&!awaySuspended){
                  const result=treasureRecoveryJob.advance(performance.now()+6);
                  publishCatchUpStatus();
                  if(result.done){treasureRecoveryResult={...result.stats,stocks:undefined};break;}
                  await paint();
                }
              }finally{
                treasureRecoveryJob?.cancel();treasureRecoveryJob=null;
                context.setLastTickAt?.(Date.now());publishCatchUpStatus();
              }
              if(generation!==catchUpGeneration||catchUpPaused||awaySuspended)break;
              checkpointCatchUp(true);
              await yieldForFirstPaint();
            }
            const frameStartedAt = catchUpClockNow();
            const planningDeadlineMs = Math.min(
              frameStartedAt + frameBudgetMs,
              catchUpClockNow() + planningBudgetMs
            );
            let madeProgress = false;
            let planningYieldRequested = false;
            internalWork=true;
            try {do {
              const task = catchUpTasks[0];
              if (!task||!prepareQueueHead()) break;
              // Rule v1: actual offline sources use independent fixed segments;
              // pre-existing online debt retains standard logical ticks.
              task.fastForward = null; task.fastDriver = null;
              // Exact local bridge only: discard obsolete scheduler plans,
              // but preserve its already committed partial-tick position.
              const bridgeSeconds = Math.min(task.remainingGameSeconds, task.source === "offline"
                ? CONFIG.fixedSettlement.offlineSeconds
                : context.prepareOnlineWork&&task.randomMode==="state" ? (pendingCatchUpSeconds>2?CONFIG.fixedSettlement.onlineBacklogSeconds:CONFIG.fixedSettlement.onlineSeconds)
                : task.logicalTickRemaining > epsilon ? task.logicalTickRemaining : simulationStepSeconds);
              if (!(bridgeSeconds > epsilon)) { catchUpTasks.shift(); continue; }
              if(task.source==='online'&&context.prepareOnlineWork&&task.randomMode==='state'){
                try{
                  task.onlineWork ||= context.prepareOnlineWork(bridgeSeconds,{source:'online',compensationEligible:task.compensationEligible,
                    clockRatio:task.remainingClockSeconds/task.remainingGameSeconds,logicalTickRemaining:task.logicalTickRemaining});
                  const work=task.onlineWork.advance(frameStartedAt+frameBudgetMs);
                  if(!work.done){planningYieldRequested=true;break;}
                  task.onlineToken=work.token;task.onlineWork=null;
                }catch(error){task.onlineWork?.close?.();task.onlineWork=null;task.onlineToken=null;pauseCatchUp(catchUpDiagnostic('online-plan-failed',task,bridgeSeconds,null,error));break;}
              }
              if (task.source === "offline" && context.prepareFixedWork) {
                try {
                  task.fixedWork ||= context.prepareFixedWork(bridgeSeconds);
                  const work=task.fixedWork.advance(frameStartedAt+frameBudgetMs);
                  if(!work.done) {planningYieldRequested=true;break;}
                  task.fixedToken=work.token;task.fixedWork=null;
                } catch(error) {
                  task.fixedWork?.close?.();task.fixedWork=null;task.fixedToken=null;
                  pauseCatchUp(catchUpDiagnostic("fixed-plan-failed",task,bridgeSeconds,null,error));break;
                }
              }
              clearAssignedCatchUpStep(task);
              assignCatchUpStep(task, bridgeSeconds);
              const requestedSeconds = Math.min(task.currentStepRemaining,
                task.currentPartRemaining || task.currentStepRemaining);
              const resourcesBefore = resourceKeys.map((key) => getState()[key] ?? ZERO);
              const treasuresBefore = catchUpTreasureKey();
              let result;
              let acceptedSeconds = 0;
              let stepError = null;
              let transactionStarted = false;
              let transactionEndFailed = false;
              let stepSnapshot = null;
              let stepRolledBack = false;
              try {
                stepSnapshot = captureCatchUpStep(task, true);
                beginTransaction();
                transactionStarted = true;
                const preparedFixedSegment=task.fixedToken;task.fixedToken=null;
                const preparedOnlineSegment=task.onlineToken;task.onlineToken=null;
                result = WIS.Core.Runtime.withRandomSource(
                  () => task.random.next(),
                  () => WIS.Core.Runtime.withOfflineExecution(() =>
                    advanceGameStep(requestedSeconds, true, {
                      offline: false,
                      preparedFixedSegment, preparedOnlineSegment,
                      timeSegment: {source:task.source, compensationEligible:task.compensationEligible,
                        clockRatio:task.remainingGameSeconds>0?task.remainingClockSeconds/task.remainingGameSeconds:0},
                      integrationMethod: "end", preparedStepPlan: task.preparedStepPlan
                    }))
                );
                acceptedSeconds = Math.max(0, Math.min(
                  requestedSeconds,
                  Number(result?.processedSeconds) || 0
                ));
                if (acceptedSeconds > 0 || result?.eventCommitted) {
                  sessionGains = resourceKeys.map((key, i) => add(sessionGains[i],
                    maxBN(ZERO, result.resourceGains?.[key] ?? sub(getState()[key] ?? ZERO, resourcesBefore[i]))));
                }
                if (acceptedSeconds > 0) {
                  // Every local bridge belongs to one original .1s frame,
                  // including when the fast driver was ineligible at entry.
                  // An event-shortened prefix must not start a fresh frame.
                  {
                    const originalTick = result?.clockCommitted ? acceptedSeconds : task.source === "offline" ? acceptedSeconds
                      : task.logicalTickRemaining > epsilon ? task.logicalTickRemaining : simulationStepSeconds;
                    task.logicalTickRemaining = Math.max(0, originalTick - acceptedSeconds);
                    if (task.logicalTickRemaining <= epsilon) {
                      discreteMetrics.logicalTicks += 1;
                      if (task.source === "online") discreteMetrics.exactTicks += result.compatibilitySubsteps||1;
                      else { discreteMetrics.batches++; discreteMetrics.largestBatch = Math.max(discreteMetrics.largestBatch, acceptedSeconds); }
                      discreteMetrics.verification = "fixed-start-sources-v1";
                    }
                  }
                  sessionProcessedGameSeconds += acceptedSeconds;
                  const errorFraction = acceptedSeconds / task.currentOuterStepGameSeconds;
                  sessionErrorEstimates = sessionErrorEstimates.map((error, i) =>
                    add(error, mul(task.currentErrorEstimate[i], errorFraction)));
                  task.currentPartRemaining = Math.max(0, task.currentPartRemaining - acceptedSeconds);
                  const clockRatio = task.currentOuterStepGameSeconds > 0
                    ? task.currentOuterStepClockSeconds / task.currentOuterStepGameSeconds
                    : 0;
                  const acceptedClockSeconds = Math.min(task.currentClockRemaining, acceptedSeconds * clockRatio);
                  if(!result.clockCommitted)getState().totalElapsedSeconds += acceptedClockSeconds;
                  if (!getState().unlockedAchievements?.trainingUp &&
                      getState().totalElapsedSeconds >= 600 && recordCurrentAchievements()) {
                    markAchievementsDirty();
                    result = { ...result, formulaChanged: true };
                  }
                  task.currentStepRemaining = Math.max(0, task.currentStepRemaining - acceptedSeconds);
                  task.currentClockRemaining = Math.max(0, task.currentClockRemaining - acceptedClockSeconds);
                  task.remainingGameSeconds = subtractFixedTime(task.remainingGameSeconds, acceptedSeconds);
                  task.remainingClockSeconds = subtractFixedTime(task.remainingClockSeconds, acceptedClockSeconds);
                  pendingCatchUpSeconds = subtractFixedTime(pendingCatchUpSeconds, acceptedSeconds);
                  pendingCatchUpClockSeconds = subtractFixedTime(pendingCatchUpClockSeconds, acceptedClockSeconds);
                  task.clockCursor+=acceptedClockSeconds;
                  catchUpSessionProcessedClockSeconds += acceptedClockSeconds;
                  confirmedSources[task.source]=true;
                  catchUpOriginalProcessedClockSeconds += acceptedClockSeconds;
                  madeProgress = true;
                  // Persist assets, source cursor, remaining debt and bonus debit
                  // at this same unit boundary. A failed write is handled by the
                  // surrounding unit rollback, before the task can be removed.
                  if (typeof context.checkpoint === "function" &&
                      (pendingCatchUpSeconds <= epsilon || Date.now()-lastCheckpointAt >= 1000)) {
                    const saveStarted=catchUpClockNow();
                    context.checkpoint();
                    settlementCosts.checkpointMs+=catchUpClockNow()-saveStarted;
                    settlementCosts.checkpointCount++;
                    lastCheckpointAt=Date.now();
                  }
                }
                if (!(acceptedSeconds > 0) && !result?.eventCommitted) {
                  restoreCatchUpStep(task, stepSnapshot);
                  stepRolledBack = true;
                }
              } catch (error) {
                stepError = error;
                if (stepSnapshot) {
                  try {
                    restoreCatchUpStep(task, stepSnapshot);
                    stepRolledBack = true;
                  } catch (restoreError) {
                    stepError = new AggregateError(
                      [error, restoreError],
                      `Offline step failed and rollback also failed: ${restoreError.message || restoreError}`
                    );
                  }
                }
              } finally {
                if (transactionStarted) {
                  try {
                    endTransaction();
                  } catch (error) {
                    transactionEndFailed = true;
                    stepError = stepError
                      ? new AggregateError([stepError, error], `Offline step and transaction finalization failed: ${error.message || error}`)
                      : error;
                  }
                }
              }
              if (stepError && stepSnapshot && (!stepRolledBack || transactionEndFailed)) {
                try {
                  restoreCatchUpStep(task, stepSnapshot);
                  stepRolledBack = true;
                } catch (restoreError) {
                  stepError = new AggregateError(
                    [stepError, restoreError],
                    `Offline transaction failed and rollback also failed: ${restoreError.message || restoreError}`
                  );
                }
              }
              if (stepError) {
                pauseCatchUp(catchUpDiagnostic("exception", task, requestedSeconds, result, stepError));
                break;
              }
              if (acceptedSeconds > 0) pauseNotices.reset();
              if (result?.eventCommitted) {
                task.currentStepDiscreteEvents += 1;
                madeProgress = true;
              }
              if (!(acceptedSeconds > 0) && !result?.eventCommitted) {
                const diagnostic = catchUpDiagnostic("zero-progress", task, requestedSeconds, result);
                // Fixed rules never retry with the obsolete frame/integration engine.
                pauseCatchUp(diagnostic);
                break;
              }
              task.preparedStepPlan = null;
              const inventoryChanged = treasuresBefore !== catchUpTreasureKey();
              if (task.currentStepRemaining <= epsilon || result?.requiresReplan ||
                  result?.formulaChanged || inventoryChanged) {
                if (result?.formulaChanged || result?.requiresReplan) {
                  task.nextValidatedSuggestion = Math.max(simulationStepSeconds, acceptedSeconds * 2);
                } else if (inventoryChanged) {
                  task.nextValidatedSuggestion = Math.min(task.nextValidatedSuggestion || acceptedSeconds * 4,
                    Math.max(simulationStepSeconds, acceptedSeconds * 4));
                }
                completeCatchUpStep(task, task.currentOuterStepGameSeconds, true);
              } else if (task.currentPartRemaining <= epsilon) {
                task.currentPartRemaining = task.remainingParts.shift() || task.currentStepRemaining;
              }
            } while (!planningYieldRequested && !catchUpPaused && catchUpTasks.length > 0 &&
              catchUpClockNow() - frameStartedAt < frameBudgetMs);
            } finally {
              internalWork=false;
              settlementCosts.maxSyncWorkMs=Math.max(settlementCosts.maxSyncWorkMs,catchUpClockNow()-frameStartedAt);
              settlementCosts.slices++;
            }
            publishCatchUpStatus();
            checkpointCatchUp(catchUpPaused);
            if (catchUpPaused) break;
            if (planningYieldRequested || catchUpTasks.length > 0 || !madeProgress) await yieldForFirstPaint();
          }
          if (generation !== catchUpGeneration) return;
          if (!catchUpPaused && catchUpTasks.length===1 && catchUpTasks[0]?.source==='online' &&
              !catchUpTasks[0].sealed && catchUpTasks[0].remainingGameSeconds<simulationStepSeconds-epsilon) {
            // Caught up to the normal fractional online tail. A later actual
            // backlog starts a new delay measurement, without erasing debt.
            // Blocking must release this tail too; otherwise no new online
            // time could arrive to complete its next original frame.
            if(presentation==='blocking')context.setLastTickAt?.(Date.now());
            presentation='quiet';
            catchUpSessionStartedAt=Date.now();
          }
          if (!catchUpPaused && recordCurrentAchievements()) markAchievementsDirty();
          if (!catchUpPaused) notifyNewAchievements(previousAchievements);
          const completed = !catchUpPaused && catchUpTasks.length === 0 && !(pendingCatchUpSeconds > epsilon);
          const report = completed
            ? formatOfflineProgressReport(catchUpSessionProcessedClockSeconds, catchUpSessionBefore)
            : "";
          catchUpInProgress = false;
          if (completed) {
            catchUpOriginalProcessedClockSeconds = catchUpOriginalClockSeconds;
            catchUpSessionProcessedClockSeconds = catchUpOriginalClockSeconds;
            catchUpCompleted = true;
            catchUpCompletedReport = formatOfflineProgressReport(
              catchUpSessionProcessedClockSeconds,
              catchUpSessionBefore,
              { force: true }
            );
            finishCatchUpClock();
          }
          const resolver = catchUpResolver;
          catchUpPromise = null;
          catchUpResolver = null;
          publishCatchUpStatus();
          if (resolver) resolver(report);
        })().catch((error) => {
          if (generation !== catchUpGeneration) return;
          if (catchUpTasks.length > 0 || pendingCatchUpSeconds > epsilon) {
            pauseCatchUp(catchUpDiagnostic(
              "worker-exception",
              catchUpTasks[0] || null,
              catchUpTasks[0]?.currentStepRemaining || 0,
              null,
              error
            ));
          } else {
            catchUpPaused = false;
            catchUpPauseReason = null;
            catchUpOriginalProcessedClockSeconds = catchUpOriginalClockSeconds;
            catchUpSessionProcessedClockSeconds = catchUpOriginalClockSeconds;
            catchUpCompleted = true;
            try {
              catchUpCompletedReport = formatOfflineProgressReport(
                catchUpSessionProcessedClockSeconds,
                catchUpSessionBefore,
                { force: true }
              );
            } catch (_reportError) {
              catchUpCompletedReport = "游戏进度已恢复";
            }
            console.error("WIS offline catch-up post-processing failed after settlement completed.", error);
          }
          const resolver = catchUpResolver;
          catchUpInProgress = false;
          catchUpPromise = null;
          catchUpResolver = null;
          if (catchUpCompleted) finishCatchUpClock();
          else checkpointCatchUp();
          publishCatchUpStatus();
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
        abandonCatchUp,
        convertOfflineToCompensation,
        retryCatchUp,
        pauseCatchUpByPlayer, pauseAfterOnlineError,
        acknowledgeCatchUp,
        appendCatchUpTask,
        sealOnlineTail, suspendForAway, returnFromAway,
        invalidateSourceModels,
        availableCompensationClockSeconds:()=>Math.max(0,getState().core.runtime.compensation.balance-
          catchUpTasks.filter(t=>t.source==='online'&&t.compensationEligible).reduce((sum,t)=>sum+t.remainingClockSeconds,0)),
        isInternalWork:()=>internalWork,
        getPersistenceSnapshot,
        claimPauseNotice: status => pauseNotices.claim(status),
        restorePersistenceSnapshot,
        getCatchUpStatus,
        subscribeCatchUpStatus,
        isCatchUpInProgress: () => catchUpInProgress,
        getPendingCatchUpSeconds: () => pendingCatchUpSeconds,
        getPendingCatchUpClockSeconds: () => pendingCatchUpClockSeconds,
        isCatchUpPaused: () => catchUpPaused,
        getCatchUpPauseReason: () => catchUpPauseReason
      });
    }
  });
}(window.WIS));
