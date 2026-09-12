(function defineGameRuntime(WIS) {
  "use strict";

  let getState = null;
  let replaceState = null;
  let projectedState = null;
  let projectionDepth = 0;
  let treasurePredictionDepth = 0;
  let offlineExecutionDepth = 0;
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
      if (current?.meta?.challenges?.activeChallenge === "mortalTransformation" && key !== "naturalTreasureLevel" &&
          Object.prototype.hasOwnProperty.call(current.cultivation?.systems?.immortal?.abilities || {}, key)) {
        const value = current[key];
        return typeof value === "boolean" ? false : 0;
      }
      return current?.[key];
    },
    set(_target, key, value) {
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
    atomic, state, bind, setState, withState, withProjection, withRandomSource, withTreasurePrediction,
    withOfflineExecution, isOfflineExecution,
    // UI publication is allowed only from the installed state at a render boundary.
    canPresentState: () => !atomicScope && !projectedState && !isProjection() &&
      !WIS.Simulation?.FastForward?.isComputing(),
    isProjection, isTreasurePrediction, random,
    call, has, getState: currentState
  });
}(window.WIS));
