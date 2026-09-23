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
      let deferredQi = null;
      let qiGeneration = 0;
      function invalidateDeferredQi() {
        qiGeneration++;
        deferredQi?.work.cancel();
        deferredQi = null;
      }


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
        projection.meta.infinity = {...projection.meta.infinity,runElapsed:projection.meta.infinity.runElapsed + elapsedSeconds};
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
        const state = options.sourceState || getState();
        const method = integrationMethod(options);
        const reusable = options.withMeta === true || (elapsedSeconds > simulationStepSeconds && (options.offline === true || options.projection === true));
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
          // The crystal end-source query owns an already isolated disposable
          // domain. Reuse only its single end sample; never borrow live state
          // or a multi-sample/frozen-clock plan.
          const projection = options.disposableSource === true && method === "end" &&
            options.offline !== true && !reusable ? state : cloneStepState(state);
          const startingClocks = {
            reincarnationElapsedSeconds: projection.reincarnationElapsedSeconds,
            currentScaleElapsedSeconds: projection.currentScaleElapsedSeconds,
            activeChallengeElapsedSeconds: projection.activeChallengeElapsedSeconds
          };
          const startingInfinityTime=projection.meta.infinity.runElapsed;
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
              projection.meta.infinity={...projection.meta.infinity,runElapsed:startingInfinityTime};
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
          preparedPlans.set(token, { sourceKey, elapsedSeconds, method, incomeFactor: WIS.Simulation.Compensation.factor(),
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
          const pending = add(WIS.Core.Resources.ledger().value([container[`${key}GainResidual`] ?? ZERO, ...(container[`${key}GainResidualTail`] || [])]), gain);
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
        const limit = Number(challenge?.deadlineSeconds || challenge?.timeToLimitSeconds) || 0;
        const current = Math.max(0, Number(state.activeChallengeElapsedSeconds) || 0);
        if (!(limit > current) || current + maxSeconds <= limit) return maxSeconds;
        return limit - current;
      }

      function automationMayChangeFormula(state) {
        const achievements = state.unlockedAchievements || {};
        return Boolean(
          (state.scaleUpgradeAutomationEnabled && achievements.scale6) ||
          ((state.scaleFitnessAutomationEnabled || state.scaleRockAutomationEnabled) && achievements.trueScale7) ||
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

      

      

      

      // A deliberately narrow certificate, not an endpoint-equality heuristic.
      // Base J before any formula-bearing progression has a constant source.
      // Coupled resources retain their local compatibility kernel until a
      // dependency-specific integrator can prove the same discrete feedback.
      function constantSourceInterval(state) {
        const zero=v=>v===false||v===0||v==='0'||WIS.Core.BigNum.isDecimal(v)&&eq(v,ZERO);
        const immortal=state.cultivation.systems.immortal;
        return state.powerSystem.active==='scale'&&!state.cultivation.active&&eq(state.power,ZERO)&&eq(state.highestPower,ZERO)&&lt(state.joules,1000)&&
          Object.values(state.powerSystem.systems.scale.upgrades).every(zero)&&
          Object.values(state.powerSystem.systems.scale.actions).every(zero)&&
          Object.values(immortal.abilities).every(zero)&&Object.values(immortal.persistent).every(zero)&&
          !immortal.xiuzhen?.entered&&!state.activeChallenge&&
          Object.values(state.challengeCompletions).every(zero)&&
          Object.keys(state.unlockedAchievements).every(k=>k==='trainingUp')&&
          Object.values(state.meta.treasures).every(v=>eq(v,ZERO))&&
          !Object.values(state.meta.treasureProgressPending).some(v=>v.length)&&
          !Object.keys(state.meta.infinity.upgrades).length&&!state.meta.bigNumbers.unlocked;
      }
      function findNextSimulationBoundary(state,maxDt,options={}) {
        const continuous=options.source==='offline'||constantSourceInterval(state);
        let seconds=continuous?maxDt:Math.min(maxDt,options.cadence||simulationStepSeconds);
        let reason=continuous?'none':'discrete-cadence';
        const limit=CHALLENGE_DEFINITIONS[state.activeChallenge]?.deadlineSeconds || CHALLENGE_DEFINITIONS[state.activeChallenge]?.timeToLimitSeconds;
        if(limit>state.activeChallengeElapsedSeconds&&limit-state.activeChallengeElapsedSeconds<seconds){seconds=limit-state.activeChallengeElapsedSeconds;reason='challenge';}
        const clockRatio=options.clockRatio||0;
        if(options.source!=="offline"&&continuous&&!state.unlockedAchievements.trainingUp&&clockRatio>0&&state.totalElapsedSeconds<600&&
          (600-state.totalElapsedSeconds)/clockRatio<seconds){seconds=(600-state.totalElapsedSeconds)/clockRatio;reason='achievement';}
        return {seconds,reason,event:reason==='none'?null:reason,continuous};
      }
      const onlinePrepared=new WeakMap();
      const onlineMetrics={segments:0,gameSeconds:0,compatibilitySubsteps:0,continuousSegments:0,domainClones:0,workMs:0,maxWorkMs:0};
      function createOnlineWork(seconds, timeSegment={}) {
        const R=WIS.Core.Runtime,S=WIS.Core.State,E=WIS.Core.Effects,F=WIS.Simulation.FixedSegment,C=WIS.Simulation.Compensation;
        // The five-second challenge shares discrete ordering across sources;
        // true offline retains its numeric policy, source and clock accounting.
        const offlineSource=timeSegment.source==='offline';
        const original=getState(), roots=['core','powerSystem','cultivation','meta'].map(k=>original[k]);
        let candidate=S.cloneForSimulation(original), closed=false, workMs=0, remaining=seconds;
        onlineMetrics.domainClones++;
        let cadence=timeSegment.logicalTickRemaining>epsilon?timeSegment.logicalTickRemaining:
          candidate.core.runtime.onlineCadenceRemaining>epsilon?candidate.core.runtime.onlineCadenceRemaining:simulationStepSeconds;
        if(!Number.isFinite(cadence)||cadence>simulationStepSeconds+epsilon)throw Error('在线自动化时钟无效，输入保留');
        const result={processedSeconds:0,resourceGains:Object.fromEntries(fixedKeys().map(k=>[k,ZERO])),operations:0,gainedPearls:ZERO,clockCommitted:true,compatibilitySubsteps:0};
        let rates={...WIS.tmp.rates},candidateTick=WIS.tmp.tick;
        const transients=()=>[WIS.Core.Registries.getActivePower(candidate)?.snapshotTreasureTransient?.(),WIS.Core.Registries.getActiveCultivation(candidate)?.snapshotTreasureTransient?.()];
        let transient=transients();
        function restoreTransient(values){WIS.Core.Registries.getActivePower(candidate)?.restoreTreasureTransient?.(values[0]);WIS.Core.Registries.getActiveCultivation(candidate)?.restoreTreasureTransient?.(values[1]);}
        function* run(){
          while(remaining>epsilon){
            const boundary=findNextSimulationBoundary(candidate,remaining,{cadence,clockRatio:timeSegment.clockRatio});
            let dt=boundary.seconds;
            const covered=timeSegment.compensationEligible&&timeSegment.clockRatio>0&&C.get(candidate).balance>0;
            if(covered)dt=Math.min(dt,C.get(candidate).balance/timeSegment.clockRatio);
            const defer=!boundary.continuous&&dt+epsilon<cadence;
            const amounts=Object.fromEntries(fixedKeys().map(k=>[k,WIS.Simulation.ResourceGroups.read(candidate,k)]));
            const unit=C.withFactor(covered?2:1,()=>F.prepare(candidate,dt,{borrowSources:true,
              runAchievementAutomations:defer?undefined:runAchievementAutomations,automationOpportunities:boundary.continuous?Math.max(1,Math.ceil(dt/simulationStepSeconds-1e-9)):1,offline:false}));
            yield;
            // Only automation needs to retain the pre-income domain. With no
            // eligible candidates, all remaining inputs are already captured
            // values, so mutate the private outer branch without proxy overhead.
            const draft=unit.groups.some(group=>group.candidates.length)?S.createDraft(candidate):null;
            if(draft)candidate=draft.state;R.setState(candidate);
            // The start snapshot stays immutable while commits copy only changed containers.
            const powerPeak={};
            const iterator=F.commitParts(candidate,unit,{projection:true,powerPeak});let part;
            do {part=C.withFactor(covered?2:1,()=>iterator.next());if(!part.done)yield;}while(!part.done);
            const value=part.value;
            projectStepTimes(candidate,dt);
            WIS.Core.Registries.getActivePower(candidate)?.afterStep?.(candidate,dt,powerPeak);
            updateLifetimeStatistics();recordCurrentAchievements();WIS.Meta.BigNumbers?.syncUnlock(candidate);checkActiveChallengeCompletion();
            if(covered)C.consume(candidate,dt*timeSegment.clockRatio);
            // Match the old ordering: the play-time achievement is checked after
            // the end-unit effects, before preparing the next source snapshot.
            candidate.core.runtime.lastSettlement={seconds:dt,gains:value.resourceGains,
              mainChanged:Object.fromEntries(fixedKeys().map(k=>[k,!eq(amounts[k],WIS.Simulation.ResourceGroups.read(candidate,k))])),at:candidate.totalElapsedSeconds};
            candidate.totalElapsedSeconds+=dt*(timeSegment.clockRatio||0);
            if(!candidate.unlockedAchievements?.trainingUp&&candidate.totalElapsedSeconds>=600)recordCurrentAchievements();
            if(draft)candidate=draft.finish();R.setState(candidate);E.invalidate();
            remaining=Math.max(0,Number((remaining-dt).toPrecision(14)));
            if(dt+epsilon>=cadence){const tail=(dt-cadence)%simulationStepSeconds;
              cadence=Math.abs(tail)<epsilon||Math.abs(tail-simulationStepSeconds)<epsilon?simulationStepSeconds:simulationStepSeconds-tail;
            }else cadence-=dt;
            candidate.core.runtime.onlineCadenceRemaining=cadence;
            result.processedSeconds+=dt;result.operations+=value.operations;
            result.gainedPearls=add(result.gainedPearls,value.gainedPearls);
            for(const k of fixedKeys())result.resourceGains[k]=add(result.resourceGains[k],value.resourceGains[k]);
            if(boundary.continuous)result.continuousSegments=(result.continuousSegments||0)+1;else result.compatibilitySubsteps++;
            yield;
          }
          result.processedSeconds=seconds;result.remainingSeconds=0;
          result.logicalTickRemaining=cadence===simulationStepSeconds?0:cadence;
          return result;
        }
        const iterator=run();
        return {advance(deadline){
          if(closed)throw Error('在线结算段已失效');
          let next;
          do {
            const before=getState(),liveRates={...WIS.tmp.rates},tick=WIS.tmp.tick,liveTransient=transients(),began=monotonicNow();
            try{R.setState(candidate);restoreTransient(transient);WIS.tmp.tick=candidateTick;
              next=R.withMathPolicy(offlineSource?R.MathPolicy.OFFLINE_APPROX:R.MathPolicy.ONLINE_EXACT,()=>R.withProjection(()=>R.withOfflineExecution(()=>R.withRandomSource(()=>{
                let v=(candidate.core.runtime.randomState>>>0)||0x6d2b79f5;v^=v<<13;v^=v>>>17;v^=v<<5;candidate.core.runtime.randomState=v>>>0;return (v>>>0)/4294967296;
              },()=>E.withIsolatedState(candidate,()=>iterator.next())))));
              transient=transients();candidateTick=WIS.tmp.tick;rates={...WIS.tmp.rates};
            }finally{restoreTransient(liveTransient);R.setState(before);WIS.tmp.tick=tick;E.invalidate();Object.assign(WIS.tmp.rates,liveRates);}
            const cost=monotonicNow()-began;workMs+=cost;onlineMetrics.workMs+=cost;onlineMetrics.maxWorkMs=Math.max(onlineMetrics.maxWorkMs,cost);
            if(next.done){closed=true;const token=Object.freeze({kind:'online-segment-v1',seconds});
              onlinePrepared.set(token,{candidate,roots,result,rates,candidateTick,transient,workMs,offlineSource});return {done:true,token};}
          }while(monotonicNow()<deadline);
          return {done:false};
        },close(){closed=true;}};
      }
      const fixedKeys=()=>WIS.Simulation.ResourceGroups.keys;
      function installOnlineSegment(token) {
        const value=onlinePrepared.get(token),state=getState();
        if(!value||value.roots.some((root,i)=>root!==[state.core,state.powerSystem,state.cultivation,state.meta][i]))throw Error('在线段起始状态已改变');
        onlinePrepared.delete(token);
        // New time registration belongs to the live queue, never to the candidate.
        value.candidate.core.runtime.timeLedger=state.core.runtime.timeLedger;
        Object.assign(state,{core:value.candidate.core,powerSystem:value.candidate.powerSystem,cultivation:value.candidate.cultivation,meta:value.candidate.meta});
        WIS.tmp.tick=value.candidateTick;Object.assign(WIS.tmp.rates,value.rates);
        WIS.Core.Registries.getActivePower(state)?.restoreTreasureTransient?.(value.transient[0]);
        WIS.Core.Registries.getActiveCultivation(state)?.restoreTreasureTransient?.(value.transient[1]);
        if(value.offlineSource)WIS.Simulation.FixedSegment.confirm({seconds:value.result.processedSeconds,options:{offline:true}},value.result,value.workMs);
        else {
          WIS.Simulation.FixedSegment.confirmOnlineSegment(value.result.processedSeconds,value.result,value.workMs);
          onlineMetrics.segments++;onlineMetrics.gameSeconds+=value.result.processedSeconds;
          onlineMetrics.continuousSegments+=value.result.continuousSegments||0;
          onlineMetrics.compatibilitySubsteps+=value.result.compatibilitySubsteps;
        }
        if(value.result.operations)markCostGroupsDirty();markAchievementsDirty();
        return value.result;
      }

      function advanceGameStep(elapsedSeconds, silentTreasureRolls, options = {}) {
        const profiler=WIS.Simulation.Profiler,scope=options.foreground||options.timeSegment?.source==='online'?'online':'offline';
        const R=WIS.Core.Runtime,source=options.timeSegment?.source;
        // A task source takes precedence over the legacy offline option. No
        // source/option means exact, even when called by an Offline runner.
        const policy=source==='offline'||source==null&&options.offline===true ? R.MathPolicy.OFFLINE_APPROX : R.MathPolicy.ONLINE_EXACT;
        const run=()=>R.withMathPolicy(policy,()=>profiler.withScope(scope,()=>profiler.measure('totalStep',()=>advanceProfiledStep(elapsedSeconds,silentTreasureRolls,options))));
        if (!options.foreground || options.preparedOnlineSegment || options.preparedFixedSegment) return run();
        const I=WIS.Cultivation.ImmortalLogic,original=getState();
        const signature=[elapsedSeconds,silentTreasureRolls,source,options.timeSegment?.clockRatio,
          options.timeSegment?.compensationEligible,options.deferAutomation].join('|');
        if(deferredQi && (deferredQi.original!==original || deferredQi.generation!==qiGeneration ||
            deferredQi.signature!==signature || deferredQi.key!==I.qiBatchStateKey(original))) invalidateDeferredQi();
        const qiScope={work:deferredQi?.work};
        if(deferredQi && !qiScope.work.result()) {
          try {
            const progress=qiScope.work.advance();
            if(!progress.done)return {processedSeconds:0,remainingSeconds:elapsedSeconds,qiDeferred:true};
          } catch(error) {
            invalidateDeferredQi();
            return {processedSeconds:0,remainingSeconds:elapsedSeconds,qiWorkFailed:true,error};
          }
        }
        try {
          const result=I.withQiBatchScope(qiScope,run);
          deferredQi=null;
          return result;
        } catch(error) {
          const work=I.qiDeferredWork(error);
          if(!work){
            invalidateDeferredQi();
            if(I.qiWorkFailure(error))return {processedSeconds:0,remainingSeconds:elapsedSeconds,qiWorkFailed:true,error};
            throw error;
          }
          // advanceAtomicStep has already restored all roots, transients,
          // notifications and rates. Only pure math remains between callbacks.
          deferredQi={work,original,generation:qiGeneration,signature,key:I.qiBatchStateKey(original)};
          return {processedSeconds:0,remainingSeconds:elapsedSeconds,qiDeferred:true};
        }
      }
      function advanceProfiledStep(elapsedSeconds, silentTreasureRolls, options = {}) {
        if (options.preparedOnlineSegment) return installOnlineSegment(options.preparedOnlineSegment);
        if (options.preparedFixedSegment?.kind==='online-segment-v1') return installOnlineSegment(options.preparedFixedSegment);
        if (options.preparedFixedSegment) options={...options,
          fixedCandidate:WIS.Simulation.FixedSegment.takePrepared(options.preparedFixedSegment,getState())};
        const C = WIS.Simulation.Compensation, segment = options.timeSegment;
        const clockRatio = segment?.source === 'online' && segment.compensationEligible === true
          ? Number(segment.clockRatio) : 0;
        if (!Number.isFinite(clockRatio) || clockRatio < 0) throw Error('在线补偿时间比例无效');
        const covered = clockRatio > 0 && C.get(getState()).balance > 0;
        const seconds = covered ? Math.min(elapsedSeconds, C.get(getState()).balance / clockRatio) : elapsedSeconds;
        const run = () => advanceAtomicStep(seconds, silentTreasureRolls, {
          ...options, compensationClockRatio: covered ? clockRatio : 0,
          // An exhausted credit can split income within one online tick, but
          // must not create an additional automatic purchase opportunity.
          deferAutomation: options.deferAutomation || covered && seconds + epsilon < Math.min(elapsedSeconds,simulationStepSeconds)
        });
        return C.withFactor(covered ? 2 : 1, () =>
          options.offline && !WIS.Core.Runtime.isOfflineExecution()
            ? WIS.Core.Runtime.withOfflineExecution(run) : run());
      }

      function advanceAtomicStep(elapsedSeconds, silentTreasureRolls, options) {
        const original = getState();
        if(WIS.Meta.TreasureProgress.Recovery.needed(original))
          return {processedSeconds:0,eventCommitted:false,treasureRecoveryRequired:true};
        const roots = ["core", "powerSystem", "cultivation", "meta"];
        const previous = Object.fromEntries(roots.map(key => [key, original[key]]));
        const rates = { ...WIS.tmp.rates }, previousTick = WIS.tmp.tick;
        const amounts = Object.fromEntries(fixedKeys().map(key => [key, WIS.Simulation.ResourceGroups.read(original,key)]));
        const power = WIS.Core.Registries.getActivePower(original);
        const cultivation = WIS.Core.Registries.getActiveCultivation(original);
        const transient = [power?.snapshotTreasureTransient?.(), cultivation?.snapshotTreasureTransient?.()];
        const savedDeferred = deferredSaveRequested;
        const fixedConfirmed = WIS.Simulation.FixedSegment.confirmed();
        // All calculations, ledger checks, treasure rolls and event/automation
        // effects execute on disposable branches. No persistence before success.
        const S = WIS.Core.State;
        let draft = options.foreground ? S.createDraft(original) : null;
        if(draft)Object.assign(original,draft.state);
        else if(!options.fixedCandidate)Object.assign(original,S.toSerializable(original));
        if (draft) options = { ...options, foregroundSource: () => draft.finish(), beginForegroundCommit(unit) {
          // Finish the planning draft before any income is committed. Automation
          // keeps this immutable start domain, while writes use a fresh COW draft.
          const snapshot = draft.finish();
          for (const key of ["sources", "plan", "cultivation", "bigNumbers"])
            unit[key] = draft.finishValue(unit[key]);
          unit.snapshot = snapshot;
          draft = S.createDraft(snapshot);
          Object.assign(original, draft.state);
        } };
        transactionDepth++;
        try {
          const result = WIS.Core.Runtime.atomic(() => {
            const result = advanceFixedStep(elapsedSeconds, silentTreasureRolls, options);
            if (result.processedSeconds > 0 && options.compensationClockRatio > 0) {
              result.compensationClockSeconds = WIS.Simulation.Compensation.consume(
                getState(), result.processedSeconds * options.compensationClockRatio);
            }
            if (!(result.processedSeconds > 0) && !result.eventCommitted) {
              Object.assign(original, previous);
            } else if (!options.projection && !WIS.Core.Runtime.isProjection()) {
              getState().core.runtime.lastSettlement = {
                seconds: result.processedSeconds, gains: result.resourceGains || {},
                mainChanged: Object.fromEntries(Object.entries(amounts).map(([key, value]) => [key, !eq(value, WIS.Simulation.ResourceGroups.read(getState(),key))])),
                at: getState().totalElapsedSeconds
              };
            }
            if (draft && (result.processedSeconds > 0 || result.eventCommitted)) {
              // A hook can replace a root (for example a challenge reset).
              Object.assign(draft.state, Object.fromEntries(roots.map(key => [key, original[key]])));
              Object.assign(original, draft.finish());
            }
            return result;
          });
          // Publish AFTER end-unit hooks and atomic notifications can invalidate
          // effects. These are the gains actually committed, including compensation.
          if (result.processedSeconds > 0 && !options.projection && !WIS.Core.Runtime.isProjection()) {
            for (const key of fixedKeys())
              WIS.tmp.rates[key + "PerSecond"] = div(result.resourceGains?.[key] ?? ZERO, result.processedSeconds);
          }
          return result;
        } catch (error) {
          WIS.Simulation.FixedSegment.restoreConfirmed(fixedConfirmed);
          Object.assign(original, previous);
          if (getState() !== original) WIS.Core.Runtime.setState(original);
          for (const key of Object.keys(WIS.tmp.rates)) delete WIS.tmp.rates[key];
          Object.assign(WIS.tmp.rates, rates);
          power?.restoreTreasureTransient?.(transient[0]);
          cultivation?.restoreTreasureTransient?.(transient[1]);
          WIS.tmp.tick = previousTick;
          deferredSaveRequested = savedDeferred;
          throw error;
        } finally {
          transactionDepth--;
          const committedRates = { ...WIS.tmp.rates };
          WIS.Core.Effects.invalidate();
          Object.assign(WIS.tmp.rates, committedRates);
        }
      }

      function advanceFixedStep(elapsedSeconds, silentTreasureRolls, options) {
        const state = getState(), requested = Math.max(0, Number(elapsedSeconds) || 0);
        const isOffline = options.timeSegment?.source === "offline";
        const seconds = nextChallengeTimeBoundarySeconds(Math.min(requested,
          isOffline ? (options.fixedCandidate?.unit.seconds ?? options.macroSeconds ?? CONFIG.fixedSettlement.offlineSeconds) : simulationStepSeconds));
        if (!(seconds > 0)) return { processedSeconds: 0, remainingSeconds: requested };
        const unit = options.fixedCandidate ? null : WIS.Simulation.FixedSegment.prepare(state, seconds, {
          runAchievementAutomations: options.deferAutomation ? undefined : runAchievementAutomations,
          skipTreasureRolls: options.skipTreasureRolls,
          borrowSources: options.foreground === true,
          dynamicResources: false,
          compiledResources: options.compiledResources,
          foregroundSource: options.foregroundSource,
          offline: isOffline
        });
        if(options.fixedCandidate && options.fixedCandidate.unit.seconds!==seconds) throw Error("固定段时间边界已改变");
        if (unit) options.beginForegroundCommit?.(unit);
        // True offline prepared work already publishes before end events.
        // Online keeps the observation private until its existing afterStep.
        const powerPeak=isOffline ? undefined : {};
        const result = options.fixedCandidate
          ? WIS.Simulation.FixedSegment.installPrepared(state,options.fixedCandidate)
          : WIS.Simulation.FixedSegment.commit(state, unit, {...options,powerPeak});
        if(!options.fixedCandidate?.unit.options.beforeEndEvents)projectStepTimes(state, seconds);
        // All new effects start in the next unit. No ordinary scale bisection,
        // no re-query after income, loot or any of the end-unit purchases.
        if(!options.fixedCandidate?.unit.options.beforeEndEvents)WIS.Core.Registries.getActivePower(state)?.afterStep?.(state, seconds,powerPeak);
        updateLifetimeStatistics();
        if (recordCurrentAchievements() && !options.projection) markAchievementsDirty();
        WIS.Meta.BigNumbers?.syncUnlock(state);
        if (result.operations && !options.projection) markCostGroupsDirty();
        checkActiveChallengeCompletion();
        return { ...result, processedSeconds: seconds, remainingSeconds: Math.max(0, requested-seconds),
          requiresReplan: seconds + epsilon < requested, formulaChanged: result.operations > 0 };
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
        invalidateDeferredQi, hasDeferredQi:()=>deferredQi!==null,
        prepareOnlineWork:createOnlineWork, findNextSimulationBoundary, onlineMetrics:()=>({...onlineMetrics}),
        restoreOnlineMetrics(point){if(point)for(const k of ['segments','gameSeconds','compatibilitySubsteps','continuousSegments'])onlineMetrics[k]=point[k];},
        planOfflineMacro(seconds,options={}) {
          const fast=getState().activeChallenge==='infinityFast';
          const bound=nextChallengeTimeBoundarySeconds(fast?Math.min(seconds,simulationStepSeconds):seconds);
          const R=WIS.Core.Runtime;
          return R.withMathPolicy(R.MathPolicy.OFFLINE_APPROX,()=>WIS.Simulation.FixedSegment.planOffline(getState(),seconds,{...options,hardBoundary:bound}));
        },
        prepareFixedWork(seconds, options={}) {
          if(getState().activeChallenge==='infinityFast')return createOnlineWork(
            nextChallengeTimeBoundarySeconds(Math.min(seconds,simulationStepSeconds)),
            {source:'offline',clockRatio:options.clockRatio});
          return WIS.Simulation.FixedSegment.createWork(getState(),
            findNextSimulationBoundary(getState(),seconds,{source:'offline',clockRatio:options.clockRatio}).seconds,
            {offline:true,runAchievementAutomations,compiledResources:options.compiledMicro?WIS.Simulation.CompiledContinuousPlan.compile().prepareResources:null,clockRatio:options.clockRatio,sourceProfile:options.sourceProfile,mapPlan:options.mapPlan,evolutionPlan:options.evolutionPlan,
                beforeEndEvents(candidate,dt) {
                  projectStepTimes(candidate,dt);
                  WIS.Core.Registries.getActivePower(candidate)?.afterStep?.(candidate,dt);
                  updateLifetimeStatistics();
                  // Include achievements enabled by segment-end resources/loot.
                  recordCurrentAchievements();
                },afterAutomation(candidate) {
                  updateLifetimeStatistics();
                  const changed=recordCurrentAchievements();
                  return checkActiveChallengeCompletion()||changed;
                }});
        },
        requestSave, beginTransaction, endTransaction,
        projectStepTimes, calculateAutomaticStepPlan,
        nextKnownSimulationBoundarySeconds, advanceGameStep, advanceGame
      });
    }
  });
}(window.WIS));
