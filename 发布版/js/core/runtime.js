(function defineGameRuntime(WIS) {
  "use strict";

  let getState = null;
  let replaceState = null;
  let hooks = {};

  const state = new Proxy({}, {
    get(_target, key) {
      const current = getState?.();
      return current?.[key];
    },
    set(_target, key, value) {
      const current = getState?.();
      if (!current) throw new Error("游戏状态尚未绑定");
      current[key] = value;
      return true;
    },
    has(_target, key) {
      return key in (getState?.() || {});
    },
    ownKeys() {
      return Reflect.ownKeys(getState?.() || {});
    },
    getOwnPropertyDescriptor(_target, key) {
      const descriptor = Object.getOwnPropertyDescriptor(getState?.() || {}, key);
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
    return getState();
  }

  function call(name, ...args) {
    const hook = hooks[name];
    if (typeof hook !== "function") throw new Error(`Runtime hook 未绑定：${name}`);
    return hook(...args);
  }

  function has(name) {
    return typeof hooks[name] === "function";
  }

  WIS.Core.Runtime = Object.freeze({ state, bind, setState, call, has, getState: () => getState?.() });
}(window.WIS));
