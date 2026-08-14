(function defineResourceAPI(WIS) {
  "use strict";

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
    return Math.max(0, Number(state().core.resources[resolveCommon(resource)]) || 0);
  }

  function set(resource, amount) {
    state().core.resources[resolveCommon(resource)] = Math.max(0, Number(amount) || 0);
    return get(resource);
  }

  function add(resource, amount) {
    return set(resource, get(resource) + (Number(amount) || 0));
  }

  function canAfford(resource, cost) {
    return get(resource) >= Math.max(0, Number(cost) || 0);
  }

  function spend(resource, cost) {
    const safeCost = Math.max(0, Number(cost) || 0);
    if (!canAfford(resource, safeCost)) return false;
    set(resource, get(resource) - safeCost);
    return true;
  }

  function getSystem(system, resource) {
    return Math.max(0, Number(systemResources(system)[resolveSystem(system, resource)]) || 0);
  }

  function setSystem(system, resource, amount) {
    systemResources(system)[resolveSystem(system, resource)] = Math.max(0, Number(amount) || 0);
    return getSystem(system, resource);
  }

  function addSystem(system, resource, amount) {
    return setSystem(system, resource, getSystem(system, resource) + (Number(amount) || 0));
  }

  function canAffordSystem(system, resource, cost) {
    return getSystem(system, resource) >= Math.max(0, Number(cost) || 0);
  }

  function spendSystem(system, resource, cost) {
    const safeCost = Math.max(0, Number(cost) || 0);
    if (!canAffordSystem(system, resource, safeCost)) return false;
    setSystem(system, resource, getSystem(system, resource) - safeCost);
    return true;
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
