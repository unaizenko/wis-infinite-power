(function defineGameRuntime(WIS) {
  "use strict";

  let getState = null;
  let replaceState = null;
  let projectedState = null;
  let evaluationScope = null;
  const evaluationStatistics = { evaluationStateCalls: 0, evaluationStateEntries: 0, evaluationStateReuses: 0, highestPowerEvaluationEntries: 0 };
  let projectionDepth = 0;
  let treasurePredictionDepth = 0;
  let offlineExecutionDepth = 0;
  const MathPolicy = Object.freeze({ ONLINE_EXACT: "ONLINE_EXACT", OFFLINE_APPROX: "OFFLINE_APPROX" });
  let mathPolicy = MathPolicy.ONLINE_EXACT;
  let randomSource = null;
  let hooks = {};
  let atomicScope = null;
  const randomReplay = [];
  function atomic(work) {
    if (atomicScope) return work();
    const scope = { effects: [], random: [] };
    atomicScope = scope;
    let result;
    try { result = work(); }
    catch (error) { randomReplay.unshift(...scope.random); throw error; }
    finally { atomicScope = null; }
    // Rendering/notifications see only the completed candidate. A failed frame
    // never publishes its queued resource, treasure or achievement notices.
    for (const effect of scope.effects) effect();
    return result;
  }
  const PROJECTION_SIDE_EFFECT_HOOK = /^(save|render|show|mark|notify|play|request|flush)/;

  function currentState() {
    return projectedState || getState?.();
  }

  const state = new Proxy({}, {
    get(_target, key) {
      const current = currentState();
      if (key === "highestPower" && evaluationScope?.state === current && evaluationScope.highestPowerOverride !== undefined)
        return evaluationScope.highestPowerOverride;
      if (current?.meta?.challenges?.activeChallenge === "mortalTransformation" && key !== "naturalTreasureLevel" &&
          Object.prototype.hasOwnProperty.call(current.cultivation?.systems?.immortal?.abilities || {}, key)) {
        const value = current[key];
        return typeof value === "boolean" ? false : 0;
      }
      return current?.[key];
    },
    set(_target, key, value) {
      assertMutable();
      const current = currentState();
      if (!current) throw new Error("游戏状态尚未绑定");
      current[key] = value;
      return true;
    },
    has(_target, key) {
      return key in (currentState() || {});
    },
    ownKeys() {
      return Reflect.ownKeys(currentState() || {});
    },
    getOwnPropertyDescriptor(_target, key) {
      const descriptor = Object.getOwnPropertyDescriptor(currentState() || {}, key);
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    }
  });

  function bind({ state: stateGetter, setState, ...nextHooks }) {
    if (typeof stateGetter !== "function") throw new Error("Runtime.state 必须是函数");
    if (setState !== undefined && typeof setState !== "function") throw new Error("Runtime.setState 必须是函数");
    getState = stateGetter;
    replaceState = setState || null;
    hooks = { ...hooks, ...nextHooks };
  }

  function setState(nextState) {
    assertMutable();
    if (!replaceState) throw new Error("游戏状态替换器尚未绑定");
    replaceState(nextState);
    return currentState();
  }

  function withState(nextState, callback) {
    if (!nextState || typeof callback !== "function") return undefined;
    const previous = projectedState;
    projectedState = nextState;
    try {
      return callback();
    } finally {
      projectedState = previous;
    }
  }

  function assertMutable() {
    if (evaluationScope) throw Error("同步公式求值期间禁止修改状态或消费 RNG");
  }
  function synchronous(callback) {
    if (callback.constructor?.name === "AsyncFunction") throw Error("公式求值作用域不能跨 await");
    const result = callback();
    if (result && typeof result.then === "function") throw Error("公式求值作用域不能返回 Promise");
    return result;
  }
  // One lexical scope per collection/group/preview, shared by every formula.
  // Domain closures use the Runtime view to preserve challenge masking.
  function withEvaluationState(nextState, callback, { memo = null, effects = null } = {}) {
    if (nextState === state || nextState == null) nextState = currentState();
    if (!nextState || typeof callback !== "function") throw Error("公式求值需要状态和同步函数");
    evaluationStatistics.evaluationStateCalls++;
    const previous = evaluationScope, E = WIS.Core.Effects;
    const scale = WIS.Power.ScaleLogic, immortal = WIS.Cultivation.ImmortalLogic;
    // Identity alone is insufficient: a nested domain/projection/effect scope
    // can still be bound elsewhere while the outer evaluation frame survives.
    if (previous && previous.state === nextState && previous.effectContext?.state === nextState && currentState() === nextState &&
        previous.projectionDepth === projectionDepth && previous.offlineExecutionDepth === offlineExecutionDepth && previous.mathPolicy === mathPolicy &&
        previous.treasurePredictionDepth === treasurePredictionDepth && previous.randomSource === randomSource &&
        (!memo || memo === previous.effectContext.memo) && (!effects || effects === previous.effects) &&
        (!scale || scale.isScaleState(state)) && (!immortal || immortal.isImmortalState(state)) &&
        E.matchesEvaluationContext(previous.effectContext)) {
      evaluationStatistics.evaluationStateReuses++;
      return synchronous(callback);
    }
    evaluationStatistics.evaluationStateEntries++;
    const frame = { state: nextState, projectionDepth, offlineExecutionDepth, mathPolicy, treasurePredictionDepth, randomSource, effects, effectContext: null };
    if (previous?.state === nextState) frame.highestPowerOverride = previous.highestPowerOverride;
    evaluationScope = frame;
    const run = () => {
      frame.effectContext = E.captureEvaluationContext();
      return synchronous(callback);
    };
    const effectScope = () => effects ? effects(run) : WIS.Core.Effects.withFrozenState(nextState, run, memo);
    const immortalScope = () => WIS.Cultivation.ImmortalLogic
      ? WIS.Cultivation.ImmortalLogic.withImmortalState(state, effectScope) : effectScope();
    try {
      return withState(nextState, () => WIS.Power.ScaleLogic
        ? WIS.Power.ScaleLogic.withScaleState(state, immortalScope) : immortalScope());
    } finally { evaluationScope = previous; }
  }

  function evaluationResource(key, source = state) {
    const current = source === state ? currentState() : source;
    return key === "highestPower" && evaluationScope?.state === current && evaluationScope.highestPowerOverride !== undefined
      ? evaluationScope.highestPowerOverride : current?.[key];
  }
  // A field-only formula probe: the formal state and every write guard remain
  // installed. Effects owns a private cache overlay for the audited dependency.
  function withHighestPowerEvaluation(value, callback) {
    if (!evaluationScope || evaluationScope.state !== currentState()) throw Error("最高战力探测需要只读求值作用域");
    evaluationStatistics.highestPowerEvaluationEntries++;
    const previous = evaluationScope;
    const frame = { ...previous, highestPowerOverride: value };
    evaluationScope = frame;
    try {
      return WIS.Core.Effects.withHighestPowerEvaluation(currentState(), () => {
        frame.effectContext = WIS.Core.Effects.captureEvaluationContext();
        return synchronous(callback);
      });
    } finally { evaluationScope = previous; }
  }

  function withProjection(callback) {
    if (typeof callback !== "function") return undefined;
    projectionDepth += 1;
    try {
      return callback();
    } finally {
      projectionDepth = Math.max(0, projectionDepth - 1);
    }
  }

  function isProjection() {
    return projectionDepth > 0;
  }

  function isTreasurePrediction() {
    return treasurePredictionDepth > 0;
  }

  // Execution policy only: never rewrite the player's saved automation flags.
  // Enter separately for each synchronous planning/commit unit so yielding to
  // the browser cannot leak this context into subsequent online actions.
  function withOfflineExecution(callback) {
    offlineExecutionDepth += 1;
    try {
      return callback();
    } finally {
      offlineExecutionDepth -= 1;
    }
  }

  function isOfflineExecution() {
    return offlineExecutionDepth > 0;
  }

  // Execution location does not authorize approximate mathematics. Select this
  // policy at an explicit source boundary, never across a host yield/await.
  function withMathPolicy(policy, callback) {
    if ((policy !== MathPolicy.ONLINE_EXACT && policy !== MathPolicy.OFFLINE_APPROX) || typeof callback !== "function")
      throw Error("数学策略或同步回调无效");
    if (callback.constructor?.name === "AsyncFunction") throw Error("数学策略作用域不能跨 await");
    const previous = mathPolicy;
    mathPolicy = policy;
    try {
      const result = callback();
      if (result && typeof result.then === "function") throw Error("数学策略作用域不能返回 Promise");
      return result;
    } finally { mathPolicy = previous; }
  }

  function withRandomSource(source, callback) {
    if (typeof callback !== "function") return undefined;
    const previous = randomSource;
    randomSource = typeof source === "function" ? source : null;
    try {
      return callback();
    } finally {
      randomSource = previous;
    }
  }

  function withTreasurePrediction(source, callback) {
    projectionDepth += 1;
    treasurePredictionDepth += 1;
    try {
      return withRandomSource(source, callback);
    } finally {
      treasurePredictionDepth = Math.max(0, treasurePredictionDepth - 1);
      projectionDepth = Math.max(0, projectionDepth - 1);
    }
  }

  function random() {
    assertMutable();
    if (randomSource) return randomSource();
    if (isProjection()) return 1 - Number.EPSILON;
    const current = currentState();
    if (current?.core?.runtime) {
      let value = (current.core.runtime.randomState >>> 0) || 0x6d2b79f5;
      value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
      current.core.runtime.randomState = value >>> 0;
      return (value >>> 0) / 0x100000000;
    }
    const value = randomReplay.length ? randomReplay.shift() : Math.random();
    atomicScope?.random.push(value);
    return value;
  }

  function call(name, ...args) {
    if ((isProjection() || WIS.Simulation?.FastForward?.isComputing()) && PROJECTION_SIDE_EFFECT_HOOK.test(name)) return undefined;
    const hook = hooks[name];
    if (typeof hook !== "function") throw new Error(`Runtime hook 未绑定：${name}`);
    if (atomicScope && PROJECTION_SIDE_EFFECT_HOOK.test(name)) {
      atomicScope.effects.push(() => hook(...args)); return undefined;
    }
    return hook(...args);
  }

  function has(name) {
    return typeof hooks[name] === "function";
  }

  WIS.Core.Runtime = Object.freeze({
    evaluationResource, withHighestPowerEvaluation,
    getEvaluationStatistics: () => ({ ...evaluationStatistics }),
    resetEvaluationStatistics: () => { for (const key of Object.keys(evaluationStatistics)) evaluationStatistics[key] = 0; },
    withEvaluationState, isEvaluating: () => evaluationScope !== null, assertMutable, atomic, state, bind, setState, withState, withProjection, withRandomSource, withTreasurePrediction,
    withOfflineExecution, isOfflineExecution,
    MathPolicy, withMathPolicy, getMathPolicy: () => mathPolicy,
    // UI publication is allowed only from the installed state at a render boundary.
    canPresentState: () => !atomicScope && !projectedState && !isProjection() &&
      !WIS.Simulation?.FastForward?.isComputing(),
    isProjection, isTreasurePrediction, random,
    call, has, getState: currentState
  });
}(window.WIS));
