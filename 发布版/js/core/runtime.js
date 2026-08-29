(function defineGameRuntime(WIS) {
  "use strict";

  let getState = null;
  let replaceState = null;
  let projectedState = null;
  let hooks = {};

  function currentState() {
    return projectedState || getState?.();
  }

  const state = new Proxy({}, {
    get(_target, key) {
      const current = currentState();
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

  function call(name, ...args) {
    const hook = hooks[name];
    if (typeof hook !== "function") throw new Error(`Runtime hook 未绑定：${name}`);
    return hook(...args);
  }

  function has(name) {
    return typeof hooks[name] === "function";
  }

  WIS.Core.Runtime = Object.freeze({ state, bind, setState, withState, call, has, getState: currentState });
}(window.WIS));
