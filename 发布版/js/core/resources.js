(function defineResourceAPI(WIS) {
  "use strict";

  const { BN, ZERO, add: addBN, sub, max, gte, isFiniteBN, isNaNBN } = WIS.Core.BigNum;
  const commonKeys = Object.freeze({ joules: "joules", power: "power" });
  let readState = null;

  function bind(getState) {
    if (typeof getState !== "function") throw new Error("Resources.bind需要状态读取函数");
    readState = getState;
  }

  function state() {
    if (!readState) throw new Error("Resources尚未绑定状态");
    return readState();
  }

  function resolveCommon(resource) {
    const key = commonKeys[resource];
    if (!key) throw new Error(`未知公共资源：${resource}`);
    return key;
  }

  function systemResources(system) {
    const resources = state().cultivation.systems?.[system]?.resources;
    if (!resources || typeof resources !== "object") throw new Error(`未知修行体系：${system}`);
    return resources;
  }

  function resolveSystem(system, resource) {
    const resources = systemResources(system);
    if (!Object.prototype.hasOwnProperty.call(resources, resource)) throw new Error(`未知体系资源：${system}.${resource}`);
    return resource;
  }

  function get(resource) {
    return sanitize(state().core.resources[resolveCommon(resource)]);
  }

  function set(resource, amount) {
    state().core.resources[resolveCommon(resource)] = sanitize(amount);
    return get(resource);
  }

  function add(resource, amount) {
    return set(resource, addBN(get(resource), sanitizeSigned(amount)));
  }

  function canAfford(resource, cost) {
    return gte(get(resource), sanitize(cost));
  }

  function spend(resource, cost) {
    const safeCost = sanitize(cost);
    if (!canAfford(resource, safeCost)) return false;
    set(resource, sub(get(resource), safeCost));
    WIS.Core.Effects?.invalidate?.();
    return true;
  }

  function getSystem(system, resource) {
    return sanitize(systemResources(system)[resolveSystem(system, resource)]);
  }

  function setSystem(system, resource, amount) {
    systemResources(system)[resolveSystem(system, resource)] = sanitize(amount);
    return getSystem(system, resource);
  }

  function addSystem(system, resource, amount) {
    return setSystem(system, resource, addBN(getSystem(system, resource), sanitizeSigned(amount)));
  }

  function canAffordSystem(system, resource, cost) {
    return gte(getSystem(system, resource), sanitize(cost));
  }

  function spendSystem(system, resource, cost) {
    const safeCost = sanitize(cost);
    if (!canAffordSystem(system, resource, safeCost)) return false;
    setSystem(system, resource, sub(getSystem(system, resource), safeCost));
    WIS.Core.Effects?.invalidate?.();
    return true;
  }

  function sanitizeSigned(value) {
    const result = BN(value);
    return isFiniteBN(result) && !isNaNBN(result) ? result : ZERO;
  }

  function sanitize(value) {
    return max(ZERO, sanitizeSigned(value));
  }

  function snapshot() {
    const cultivationSystems = state().cultivation.systems || {};
    return {
      core: { resources: { joules: get("joules"), power: get("power") } },
      cultivation: {
        systems: Object.fromEntries(Object.entries(cultivationSystems).map(([systemId, system]) => [
          systemId,
          { resources: Object.fromEntries(Object.keys(system.resources || {}).map((resourceId) => [resourceId, getSystem(systemId, resourceId)])) }
        ]))
      }
    };
  }

  WIS.Core.Resources = Object.freeze({
    bind, get, set, add, spend, canAfford,
    getSystem, setSystem, addSystem, spendSystem, canAffordSystem,
    snapshot
  });
}(window.WIS));
