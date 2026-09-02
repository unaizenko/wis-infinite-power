(function defineResourceAPI(WIS) {
  "use strict";

  const { BN, ZERO, add: addBN, sub, max, gt, gte, isFiniteBN, isNaNBN } = WIS.Core.BigNum;
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

  function residualKeyFor(container, resourceKey) {
    const residualKey = `${resourceKey}GainResidual`;
    return Object.prototype.hasOwnProperty.call(container, residualKey) ? residualKey : null;
  }

  function accumulate(container, resourceKey, amount) {
    const gain = sanitizeSigned(amount);
    const current = sanitize(container[resourceKey]);
    const residualKey = residualKeyFor(container, resourceKey);
    if (!residualKey || !gt(gain, ZERO)) {
      container[resourceKey] = sanitize(addBN(current, gain));
      return container[resourceKey];
    }
    const pending = addBN(sanitize(container[residualKey]), gain);
    const next = sanitize(addBN(current, pending));
    const applied = max(ZERO, sub(next, current));
    container[resourceKey] = next;
    container[residualKey] = max(ZERO, sub(pending, applied));
    return next;
  }

  function set(resource, amount) {
    const resources = state().core.resources;
    const key = resolveCommon(resource);
    resources[key] = sanitize(amount);
    const residualKey = residualKeyFor(resources, key);
    if (residualKey) resources[residualKey] = ZERO;
    return get(resource);
  }

  function add(resource, amount) {
    const resources = state().core.resources;
    return accumulate(resources, resolveCommon(resource), amount);
  }

  function canAfford(resource, cost) {
    return gte(get(resource), sanitize(cost));
  }

  function spend(resource, cost) {
    const safeCost = sanitize(cost);
    if (!canAfford(resource, safeCost)) return false;
    const resources = state().core.resources;
    resources[resolveCommon(resource)] = sanitize(sub(get(resource), safeCost));
    WIS.Core.Effects?.invalidate?.();
    return true;
  }

  function getSystem(system, resource) {
    return sanitize(systemResources(system)[resolveSystem(system, resource)]);
  }

  function setSystem(system, resource, amount) {
    const resources = systemResources(system);
    const key = resolveSystem(system, resource);
    resources[key] = sanitize(amount);
    const residualKey = residualKeyFor(resources, key);
    if (residualKey) resources[residualKey] = ZERO;
    return getSystem(system, resource);
  }

  function addSystem(system, resource, amount) {
    const resources = systemResources(system);
    return accumulate(resources, resolveSystem(system, resource), amount);
  }

  function canAffordSystem(system, resource, cost) {
    return gte(getSystem(system, resource), sanitize(cost));
  }

  function spendSystem(system, resource, cost) {
    const safeCost = sanitize(cost);
    if (!canAffordSystem(system, resource, safeCost)) return false;
    const resources = systemResources(system);
    resources[resolveSystem(system, resource)] = sanitize(sub(getSystem(system, resource), safeCost));
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
    accumulateResourceGain: add,
    accumulateSystemResourceGain: addSystem,
    snapshot
  });
}(window.WIS));
