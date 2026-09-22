(function defineResourceAPI(WIS) {
  "use strict";

  const { BN, ZERO, add: addBN, sub, max, gt, gte, isFiniteBN, isNaNBN } = WIS.Core.BigNum;
  const registry = WIS.Core.Registries.resources;
  let readState = null;
  function bind(getState) {
    if (typeof getState !== "function") throw new Error("Resources.bind需要状态读取函数");
    readState = getState;
  }
  function state(explicit) {
    if (explicit !== undefined) return explicit;
    if (!readState) throw new Error("Resources尚未绑定状态");
    return WIS.Core.Runtime.getState() || readState();
  }
  // Old common short names are aliases of the same definition, never identities.
  const resolve = id => registry.get(id) || registry.getOwned("core", "core", id);
  const resolveSystem = (owner, name) => registry.getOwned("cultivation", owner, name);
  function requireResource(definition, id) {
    if (!definition) throw Error(`未知资源：${id}`);
    return definition;
  }

  function residualKeyFor(container, resourceKey) {
    const residualKey = `${resourceKey}GainResidual`;
    return Object.prototype.hasOwnProperty.call(container, residualKey) ? residualKey : null;
  }

  let resourceLedger;
  const ledger = () => resourceLedger ||= WIS.Core.SignedLedger.bounded(8192);
  function balance(container, key) {
    return [String(BN(container[key] ?? ZERO))];
  }
  function legacyBalance(container,key) {
    return ledger().normalize([container[key] ?? ZERO, container[`${key}GainResidual`] ?? ZERO,
      ...(container[`${key}GainResidualTail`] || [])]);
  }
  function prepare(container, key, delta) {
    return prepareTerms(container, key, [delta]);
  }
  function prepareTerms(container, key, income) {
    // Ordinary economic balances retain only their represented Decimal value.
    // Empty-container construction is the legacy migration boundary: merge all
    // old words once before projection, never carry history into live additions.
    const main = Object.prototype.hasOwnProperty.call(container, key)
      ? addBN(BN(container[key]), ledger().value(ledger().normalize(income)))
      : ledger().value(ledger().normalize(income));
    if (!isFiniteBN(main) || main.lt(0)) throw Error("资源余额无效，未提交");
    return { [key]: main, [`${key}GainResidual`]: ZERO, [`${key}GainResidualTail`]: [] };
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
      for (const key of keys) {
        container[key] = ledger().value(legacyBalance(container, key));
        Object.assign(container, prepare(container, key, ZERO));
      }
    }
    return candidate;
  }

  // Generic storage adapter. Physical location is supplied by its owner.
  // The optional third set argument is the existing rebase facade's mode.
  function storedDefinition({ id, owner, shortName, kind, container, snapshot = true }) {
    function box(s) {
      const value = container(s);
      if (!value || typeof value !== "object") throw Error(`资源容器不存在：${id}`);
      return value;
    }
    return {
      id, owner, shortName, kind, snapshot,
      get: s => container(s)?.[shortName],
      set(s, value, rebase = false) {
        const resources = box(s);
        resources[shortName] = value;
        const residual = residualKeyFor(resources, shortName);
        if (residual || rebase) resources[residual || `${shortName}GainResidual`] = ZERO;
        resources[`${shortName}GainResidualTail`] = [];
        return value;
      },
      add: (s, delta, terms) => terms
        ? (Object.assign(box(s), prepareTerms(box(s), shortName, terms)))[shortName]
        : accumulate(box(s), shortName, delta)
    };
  }
  function read(definition, s, id) { return sanitize(requireResource(definition, id).get(s)); }
  function get(id, explicit) { return read(resolve(id), state(explicit), id); }
  function write(definition, value, s, id, rebase = false) {
    WIS.Core.Runtime.assertMutable();
    return requireResource(definition, id).set(s, value, rebase);
  }
  function set(id, value, explicit) { return write(resolve(id), sanitize(value), state(explicit), id); }
  function increase(definition, delta, s, id) {
    WIS.Core.Runtime.assertMutable();
    return requireResource(definition, id).add(s, delta);
  }
  function add(id, delta, explicit) { return increase(resolve(id), delta, state(explicit), id); }
  function validCost(raw) {
    const cost = WIS.Core.BigNum.parseFinite(raw);
    return cost && !cost.lt(0) ? cost : null;
  }
  // -1: unavailable, 0: ordinary payment, 1: special adapter payment.
  function paymentMode(definition, cost, s) {
    if (!definition || cost === null) return -1;
    const value = definition.get(s);
    if (value === undefined) return -1;
    if (cost.eq(0)) return 0;
    const special = definition.specialCanAfford?.(s, cost);
    return special == null ? (gte(value, cost) ? 0 : -1) : special === true ? 1 : -1;
  }
  const eligibility = (definition, cost, s) => paymentMode(definition, cost, s) >= 0;
  function pay(definition, cost, s, terms = null) {
    const mode = paymentMode(definition, cost, s);
    if (mode < 0) return false;
    WIS.Core.Runtime.assertMutable();
    if (cost.eq(0)) return true;
    // Special hooks run against a private COW transaction. A false result or
    // exception cannot commit inventory, residuals or spending statistics.
    if (mode === 1) {
      const draft = WIS.Core.State.createDraft(s);
      if (definition.specialSpend(draft.state, cost) !== true) return false;
      const next = draft.finish();
      for (const key of ["core", "powerSystem", "cultivation", "meta"]) if (next[key] !== s[key]) s[key] = next[key];
      WIS.Core.Effects?.invalidate?.();
      return true;
    }
    // Keep signed-term debit normalization intact (including negative compensation).
    definition.add(s, cost.neg(), terms ? ledger().subtract([], terms) : undefined);
    WIS.Core.Effects?.invalidate?.();
    return true;
  }
  function canAfford(id, cost, explicit) { return eligibility(resolve(id), validCost(cost), state(explicit)); }
  function spend(id, cost, explicit) { return pay(resolve(id), validCost(cost), state(explicit)); }
  function validTerms(costs) {
    // Signed compensation, counted words and pages are valid ledger inputs.
    // Validate leaves before normalization can cancel or silently drop them.
    if (!Array.isArray(costs) || costs.some(v =>
      !WIS.Core.BigNum.isDecimal(v) && typeof v !== "number" && typeof v !== "string")) return null;
    try {
      for (const word of WIS.Core.SignedLedger.expand(costs)) {
        const atom = word.replace(/\*[1-9]\d*$/, "");
        if (!WIS.Core.BigNum.isNumericText(atom) || !isFiniteBN(WIS.Core.SignedLedger.project(atom))) return null;
      }
      const terms = ledger().normalize(costs), cost = ledger().value(terms);
      return ledger().sign(terms) >= 0 && isFiniteBN(cost) && !cost.lt(0) ? { terms, cost } : null;
    } catch (error) {
      if (error instanceof WIS.Core.SignedLedger.LedgerError) return null;
      throw error;
    }
  }
  function canAffordTerms(id, costs, explicit) {
    const valid = validTerms(costs);
    return valid !== null && eligibility(resolve(id), valid.cost, state(explicit));
  }
  function spendTerms(id, costs, explicit) {
    const valid = validTerms(costs);
    return valid !== null && pay(resolve(id), valid.cost, state(explicit), valid.terms);
  }
  function getSystem(system, resource, explicit) {
    const s = state(explicit), definition = requireResource(resolveSystem(system, resource), `${system}.${resource}`);
    const raw = definition.get(s);
    if (raw === undefined) throw Error(`未知体系资源：${system}.${resource}`);
    return sanitize(raw);
  }
  function setSystem(system, resource, amount, explicit) {
    return write(resolveSystem(system, resource), sanitize(amount), state(explicit), `${system}.${resource}`);
  }
  function addSystem(system, resource, amount, explicit) {
    return increase(resolveSystem(system, resource), amount, state(explicit), `${system}.${resource}`);
  }
  function rebaseSystem(system, resource, amount, explicit) {
    const main = BN(amount);
    if (!isFiniteBN(main) || main.lt(0)) throw Error("资源边界投影无效");
    write(resolveSystem(system, resource), main, state(explicit), `${system}.${resource}`, true);
  }
  function canAffordSystem(system, resource, cost, explicit) {
    return eligibility(resolveSystem(system, resource), validCost(cost), state(explicit));
  }
  function spendSystem(system, resource, cost, explicit) {
    return pay(resolveSystem(system, resource), validCost(cost), state(explicit));
  }

  function sanitizeSigned(value) {
    const result = BN(value);
    return isFiniteBN(result) && !isNaNBN(result) ? result : ZERO;
  }

  function sanitize(value) {
    return max(ZERO, sanitizeSigned(value));
  }

  function snapshot(explicit, filter = null) {
    const s = state(explicit), result = { core: { resources: {} }, cultivation: { systems: {} } };
    const ids = filter && typeof filter !== "function" ? new Set(typeof filter === "string" ? [filter] : filter) : null;
    for (const definition of registry.list()) {
      if (!definition.snapshot || ids && !ids.has(definition.id) || typeof filter === "function" && !filter(definition)) continue;
      const raw = definition.get(s);
      if (raw === undefined) continue;
      if (definition.kind === "meta") {
        result.meta ||= {};
        (result.meta[definition.owner] ||= { resources: {} }).resources[definition.shortName] = sanitize(raw);
        continue;
      }
      if (definition.kind === "cultivation" && !Object.hasOwn(result.cultivation.systems, definition.owner))
        result.cultivation.systems[definition.owner] = { resources: {} };
      const resources = definition.kind === "core" ? result.core.resources
        : result.cultivation.systems[definition.owner].resources;
      resources[definition.shortName] = sanitize(raw);
    }
    return result;
  }

  WIS.Core.Resources = Object.freeze({
    bind, get, set, add, spend, canAfford, spendTerms, canAffordTerms, balance, prepare, prepareTerms, validateState, ledger,
    getSystem, setSystem, rebaseSystem, addSystem, spendSystem, canAffordSystem, storedDefinition,
    accumulateResourceGain: add, accumulateSystemResourceGain: addSystem, snapshot
  });
  for (const shortName of ["joules", "power"]) registry.register(storedDefinition({
    id: `core.${shortName}`, owner: "core", shortName, kind: "core", container: s => s.core?.resources
  }));
}(window.WIS));
