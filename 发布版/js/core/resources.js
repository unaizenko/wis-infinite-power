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
    // Transactions and fixed-segment candidates use Runtime.withState. Reading
    // only the live getter here bypasses that isolation and mutates live assets
    // while planning, so every common asset operation must share Runtime scope.
    return WIS.Core.Runtime.getState() || readState();
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

  let resourceLedger;
  const ledger = () => resourceLedger ||= WIS.Meta.TreasureLedger.bounded(8192);
  function balance(container, key) {
    return ledger().normalize([container[key] ?? ZERO, container[`${key}GainResidual`] ?? ZERO,
      ...(container[`${key}GainResidualTail`] || [])]);
  }
  function prepare(container, key, delta) {
    return prepareTerms(container, key, [delta]);
  }
  function prepareTerms(container, key, income) {
    const terms = ledger().add(balance(container, key), income);
    if (ledger().sign(terms) < 0) throw Error("资源余额不足，未提交");
    const main = ledger().value(terms);
    if (!isFiniteBN(main)) throw Error("资源账本无法投影，未提交");
    const rest = ledger().subtract(terms, [main]);
    const residual = rest.length ? ledger().project(rest[0]) : ZERO;
    const tail = ledger().subtract(rest, [residual]);
    return { [key]: main, [`${key}GainResidual`]: residual, [`${key}GainResidualTail`]: tail };
  }
  function accumulate(container, resourceKey, amount) {
    if (!isFiniteBN(amount) || isNaNBN(amount)) throw Error("新增资源无效，未提交");
    if (BN(amount).eq(0)) return container[resourceKey];
    const next = prepare(container, resourceKey, amount);
    Object.assign(container, next);
    return next[resourceKey];
  }
  function validateState(candidate) {
    for (const [container, keys] of [[candidate.core.resources, ["joules", "power"]],
      [candidate.cultivation.systems.immortal.resources, ["mana", "immortalPower"]]]) {
      for (const key of keys) Object.assign(container, prepare(container, key, ZERO));
    }
    return candidate;
  }

  function set(resource, amount) {
    const resources = state().core.resources;
    const key = resolveCommon(resource);
    resources[key] = sanitize(amount);
    const residualKey = residualKeyFor(resources, key);
    if (residualKey) resources[residualKey] = ZERO;
    resources[`${key}GainResidualTail`] = [];
    if (key === "mana" && state().cultivation.systems.immortal.xiuzhen)
      state().cultivation.systems.immortal.xiuzhen.manaDebitResidual = [];
    return get(resource);
  }

  function add(resource, amount) {
    const resources = state().core.resources;
    return accumulate(resources, resolveCommon(resource), amount);
  }

  function canAfford(resource, cost) {
    return affordableBalance(state().core.resources, resolveCommon(resource), cost);
  }

  function affordableBalance(container, key, cost) {
    try { return ledger().compare(balance(container, key), [sanitize(cost)]) >= 0; }
    catch (error) {
      if (error instanceof WIS.Meta.TreasureLedger.LedgerError) return false;
      throw error;
    }
  }

  function spend(resource, cost) {
    const safeCost = sanitize(cost);
    if (!canAfford(resource, safeCost)) return false;
    const resources = state().core.resources;
    accumulate(resources, resolveCommon(resource), safeCost.neg());
    WIS.Core.Effects?.invalidate?.();
    return true;
  }

  function canAffordTerms(resource, costs) {
    const normalized = ledger().normalize(costs);
    if (ledger().sign(normalized) < 0) throw Error("批量成本不能为负");
    return ledger().compare(balance(state().core.resources,resolveCommon(resource)),normalized)>=0;
  }
  function spendTerms(resource,costs) {
    if(!canAffordTerms(resource,costs)) return false;
    const box=state().core.resources, key=resolveCommon(resource);
    Object.assign(box,prepareTerms(box,key,ledger().subtract([],costs)));
    WIS.Core.Effects?.invalidate?.();return true;
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
    resources[`${key}GainResidualTail`] = [];
    if (key === "mana" && state().cultivation.systems.immortal.xiuzhen)
      state().cultivation.systems.immortal.xiuzhen.manaDebitResidual = [];
    return getSystem(system, resource);
  }

  // Change only the displayed projection at a formula/event boundary. The
  // signed compensation keeps the represented balance exactly unchanged.
  function rebaseSystem(system, resource, amount) {
    const container = systemResources(system), key = resolveSystem(system, resource), main = BN(amount);
    if (!isFiniteBN(main) || main.lt(0)) throw Error("资源边界投影无效");
    const rest = ledger().subtract(balance(container, key), [main]);
    const residual = rest.length ? ledger().project(rest[0]) : ZERO;
    const tail = ledger().subtract(rest, [residual]);
    Object.assign(container, { [key]: main, [`${key}GainResidual`]: residual, [`${key}GainResidualTail`]: tail });
  }

  function addSystem(system, resource, amount) {
    const resources = systemResources(system);
    return accumulate(resources, resolveSystem(system, resource), amount);
  }

  function canAffordSystem(system, resource, cost) {
    if (system === "immortal" && resource === "mana" && state().cultivation.systems.immortal.xiuzhen?.manaDebitResidual?.length)
      return WIS.Cultivation.Xiuzhen.canSpend(state(), "mana", cost);
    return affordableBalance(systemResources(system), resource, cost);
  }

  function spendSystem(system, resource, cost) {
    if (system === "immortal" && resource === "mana" && state().cultivation.systems.immortal.xiuzhen?.manaDebitResidual?.length)
      return WIS.Cultivation.Xiuzhen.spendMana(state(), cost);
    const safeCost = sanitize(cost);
    if (!canAffordSystem(system, resource, safeCost)) return false;
    const resources = systemResources(system);
    accumulate(resources, resolveSystem(system, resource), safeCost.neg());
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
    bind, get, set, add, spend, canAfford, spendTerms, canAffordTerms, balance, prepare, prepareTerms, validateState, ledger,
    getSystem, setSystem, rebaseSystem, addSystem, spendSystem, canAffordSystem,
    accumulateResourceGain: add,
    accumulateSystemResourceGain: addSystem,
    snapshot
  });
}(window.WIS));
