(function defineEffectCollector(WIS) {
  "use strict";

  const { BN, ZERO, ONE, isDecimal, isFiniteBN, isNaNBN, add, mul, div, pow, eq, lt, max: maxBN } = WIS.Core.BigNum;

  const providers = new Map();
  const invalidEffects = new Map();
  const MAX_INVALID_EFFECT_RECORDS = 100;
  let tickSnapshot = null;
  let evaluationState = null;
  let evaluationValues = null;
  const statistics = { providerCalls: 0, dynamicEvaluations: 0 };
  const dynamicResourceKeys = new Set(["joules", "power"]);
  const dynamicReadStates = new WeakMap();

  function printableEffectValue(value) {
    try {
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      if (isDecimal(value)) return value.toString();
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function reportInvalidEffect(effect, rawValue, error = null, phase = "value") {
    const provider = effect?.provider || "unknown-provider";
    const id = effect?.id || "unknown-effect";
    const key = `${provider}\u0000${id}\u0000${phase}`;
    const previous = invalidEffects.get(key);
    const record = {
      provider,
      id,
      name: effect?.name || id,
      target: effect?.target || "unknown",
      layer: effect?.layer || "unknown",
      phase,
      value: printableEffectValue(rawValue),
      error: error ? printableEffectValue(error) : "",
      count: (previous?.count || 0) + 1
    };
    if (!previous && invalidEffects.size >= MAX_INVALID_EFFECT_RECORDS) {
      const oldestKey = invalidEffects.keys().next().value;
      invalidEffects.delete(oldestKey);
    }
    invalidEffects.set(key, record);
    if (!previous && typeof console !== "undefined" && typeof console.error === "function") {
      console.error("[WIS] 已隔离非法效果值", record);
    }
    return record;
  }

  function activeChallenge(state) {
    return state?.meta?.challenges?.activeChallenge ?? state?.activeChallenge ?? null;
  }

  function galaxyCompletionCount(state) {
    const completions = state?.meta?.challenges?.challengeCompletions ?? state?.challengeCompletions;
    return Math.max(0, Number(completions?.galaxy) || 0);
  }

  function treasureCount(source, key) {
    if (source?.meta?.treasures && WIS.Meta.Treasures?.balance)
      return BN(WIS.Meta.Treasures.count(source,key));
    return maxBN(
      ZERO,
      BN(source?.meta?.treasures?.[key] ?? source?.treasureImprints?.[key] ?? ZERO)
    ).floor();
  }

  function galaxyDynamicResourceExponent(source = WIS.Core.Runtime?.getState?.()) {
    const treasureConfig = WIS.Core.Config.scaleTreasures?.cosmicFiber;
    const fallback = Number(WIS.Core.Config.challenges?.galaxy?.dynamicResourceExponent);
    if (!treasureConfig) return Number.isFinite(fallback) && fallback > 0 ? BN(fallback) : ONE;
    const count = treasureCount(source, "cosmicFiber");
    const diminishing = pow(add(ONE, div(count, treasureConfig.galaxyDecayScale)), treasureConfig.galaxyDecayExponent);
    return add(
      treasureConfig.galaxyBaseExponent,
      div(mul(treasureConfig.galaxyPerItemExponent, count), diminishing)
    );
  }

  function dynamicResourceValue(state, resourceKey) {
    const alreadyResolved = state && typeof state === "object"
      ? dynamicReadStates.get(state)
      : null;
    if (alreadyResolved?.has(resourceKey)) return state?.[resourceKey] ?? ZERO;
    const rawValue = state?.[resourceKey] ?? ZERO;
    if (!dynamicResourceKeys.has(resourceKey)) return rawValue;
    if (activeChallenge(state) === "galaxy") return ZERO;
    if (galaxyCompletionCount(state) < 1) return rawValue;
    return pow(maxBN(ZERO, rawValue), galaxyDynamicResourceExponent(state));
  }

  function effectDynamicResources(effect) {
    if (!Array.isArray(effect?.dynamicResources)) return [];
    return [...new Set(effect.dynamicResources.filter((key) => dynamicResourceKeys.has(key)))];
  }

  function dynamicReadState(effect, state) {
    const resources = effectDynamicResources(effect);
    if (resources.length === 0 || !state || typeof state !== "object") return state;
    const resourceSet = new Set(resources);
    const view = new Proxy(state, {
      get(target, property, receiver) {
        return resourceSet.has(property)
          ? dynamicResourceValue(target, property)
          : Reflect.get(target, property, receiver);
      }
    });
    dynamicReadStates.set(view, resourceSet);
    return view;
  }

  function neutralEffectValue(effect) {
    if (effect?.dynamicNeutralValue !== undefined) return effect.dynamicNeutralValue;
    return effect?.layer?.endsWith("Additive") ? 0 : ONE;
  }

  function validEffectValue(effect, value, phase = "value") {
    const supportedType = isDecimal(value) || typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "");
    const decimal = supportedType ? BN(value) : ZERO;
    const multiplicativeLayer = !effect?.layer?.endsWith("Additive");
    if (!supportedType || !isFiniteBN(value) || isNaNBN(value) ||
      (multiplicativeLayer && lt(decimal, ZERO))) {
      reportInvalidEffect(effect, value, null, phase);
      return neutralEffectValue(effect);
    }
    return isDecimal(value) || typeof value === "string" ? decimal : value;
  }

  function evaluateEffectValue(effect, state, provider = effect?.value) {
    if (typeof provider !== "function") return provider;
    const resources = effectDynamicResources(effect);
    if (resources.length > 0 && activeChallenge(state) === "galaxy" &&
      effect.disableWhenDynamicResourcesSuppressed === true) {
      return neutralEffectValue(effect);
    }
    return provider(dynamicReadState(effect, state));
  }

  function register(id, provider) {
    if (!id || typeof provider !== "function" || providers.has(id)) throw new Error(`效果提供器无效或重复：${id}`);
    providers.set(id, provider);
  }

  function resolvedEffect(effect, state) {
    let rawValue;
    try {
      rawValue = evaluateEffectValue(effect, state);
      const safeRawValue = validEffectValue(effect, rawValue, "raw");
      const adjust = WIS.Cultivation?.ImmortalLogic?.applyCelestialFiveDeclineToMultiplier;
      const adjustedValue = effect.celestialFiveDecline === true && typeof adjust === "function"
        ? adjust(safeRawValue, state?.immortalPower)
        : safeRawValue;
      return { ...effect, rawValue, value: validEffectValue(effect, adjustedValue) };
    } catch (error) {
      reportInvalidEffect(effect, rawValue, error, "evaluation");
      return { ...effect, rawValue, value: neutralEffectValue(effect) };
    }
  }

  function sameLiveResources(previous, state) {
    return previous
      && previous.joules === state?.joules
      && previous.power === state?.power
      && previous.highestPower === state?.highestPower
      && previous.mana === state?.mana
      && previous.immortalPower === state?.immortalPower
      && previous.activeChallenge === activeChallenge(state)
      && previous.galaxyCompletions === galaxyCompletionCount(state)
      && eq(previous.cosmicFiberCount, treasureCount(state, "cosmicFiber"));
  }

  function liveResources(state) {
    return {
      joules: state?.joules,
      power: state?.power,
      highestPower: state?.highestPower,
      mana: state?.mana,
      immortalPower: state?.immortalPower,
      activeChallenge: activeChallenge(state),
      galaxyCompletions: galaxyCompletionCount(state),
      cosmicFiberCount: treasureCount(state, "cosmicFiber")
    };
  }

  function createSnapshot(state) {
    return {
      state,
      ready: false,
      all: [],
      byId: new Map(),
      byTargetLayer: new Map(),
      values: new Map(),
      groups: new Map(),
      products: new Map(),
      providerCalls: 0
    };
  }

  function beginTick(state) {
    const canonicalState = state === WIS.Core.Runtime?.state
      ? WIS.Core.Runtime.getState()
      : state;
    const snapshot = createSnapshot(canonicalState);
    tickSnapshot = snapshot;
    WIS.tmp.tick += 1;
    Object.keys(WIS.tmp.rates).forEach((key) => { WIS.tmp.rates[key] = 0; });
    return snapshot;
  }

  let invalidationRevision = 0;
  function invalidate() {
    invalidationRevision += 1;
    tickSnapshot = null;
    evaluationState = null;
    evaluationValues = null;
    Object.keys(WIS.tmp.rates).forEach((key) => { WIS.tmp.rates[key] = 0; });
  }

  function getRevision() {
    return invalidationRevision;
  }

  function snapshotFor(state) {
    // A snapshot created solely to accelerate offline lookups must not change
    // the online no-snapshot fallback after the execution scope has ended.
    if (tickSnapshot?.offlineOnly && !WIS.Core.Runtime?.isOfflineExecution?.()) tickSnapshot = null;
    const canonicalState = state === WIS.Core.Runtime?.state
      ? WIS.Core.Runtime.getState()
      : state;
    return tickSnapshot?.state === canonicalState ? tickSnapshot : null;
  }

  function ensureSnapshot(state) {
    let snapshot = snapshotFor(state);
    if (!snapshot && !tickSnapshot && WIS.Core.Runtime?.isOfflineExecution?.()) {
      const canonicalState = state === WIS.Core.Runtime.state
        ? WIS.Core.Runtime.getState() : state;
      // A loot award invalidates all prior values. Offline lookups can lazily
      // rebuild a fresh list once for this same state; never retain old values
      // across invalidation or attach a foreign preview state. Unlike beginTick
      // this query does not clear published rates or advance the logical tick.
      if (canonicalState === WIS.Core.Runtime.getState()) {
        snapshot = tickSnapshot = createSnapshot(canonicalState);
        snapshot.offlineOnly = true;
      }
    }
    if (!snapshot || snapshot.ready) return snapshot;
    for (const [providerId, provider] of providers.entries()) {
      statistics.providerCalls += 1;
      snapshot.providerCalls += 1;
      let effects;
      try {
        effects = provider(state) || [];
        if (!Array.isArray(effects)) throw new TypeError("效果提供器必须返回数组");
      } catch (error) {
        reportInvalidEffect({ provider: providerId, id: "provider", name: providerId }, undefined, error, "provider");
        continue;
      }
      for (const effect of effects) {
        // Keep descriptor/key order and fresh per-snapshot values. Separating
        // the cache fields from the spread avoids its slow property-definition
        // path when rebuilding these small objects after actual loot awards.
        const resolved = { provider: providerId, ...effect };
        resolved._valueProvider = typeof effect.value === "function" ? effect.value : null;
        resolved._dynamic = effect.dynamic === true || effect.celestialFiveDecline === true ||
          effectDynamicResources(effect).length > 0;
        resolved._dynamicState = null;
        resolved._dynamicResolved = null;
        resolved._resolved = false;
        snapshot.all.push(resolved);
        snapshot.byId.set(effect.id, resolved);
        const key = `${effect.target}\u0000${effect.layer}`;
        const bucket = snapshot.byTargetLayer.get(key) || [];
        bucket.push(resolved);
        snapshot.byTargetLayer.set(key, bucket);
      }
    }
    snapshot.ready = true;
    return snapshot;
  }

  function resolveBase(effect, state) {
    if (effect._resolved) return effect;
    const resolved = resolvedEffect(effect, state);
    effect.rawValue = resolved.rawValue;
    effect.value = resolved.value;
    effect._resolved = true;
    return effect;
  }

  function resolveDynamic(effect, state, cache = true) {
    if (cache && sameLiveResources(effect._dynamicState, state)) return effect._dynamicResolved;
    statistics.dynamicEvaluations += 1;
    const valueProvider = typeof effect._valueProvider === "function" ? effect._valueProvider : effect.value;
    const resolved = resolvedEffect({ ...effect, value: valueProvider }, state);
    const result = { ...effect, rawValue: resolved.rawValue, value: resolved.value };
    if (cache) {
      effect._dynamicState = liveResources(state);
      effect._dynamicResolved = result;
    }
    return result;
  }

  function resolveForEvaluation(effect) {
    if (!evaluationState || !effect._dynamic) {
      return resolveBase(effect, tickSnapshot.state);
    }
    if (evaluationValues.has(effect.id)) return evaluationValues.get(effect.id);
    const result = resolveDynamic(effect, evaluationState, false);
    evaluationValues.set(effect.id, result);
    return result;
  }

  function withState(state, callback) {
    if (typeof callback !== "function") return undefined;
    const previousState = evaluationState;
    const previousValues = evaluationValues;
    evaluationState = state;
    evaluationValues = new Map();
    try {
      return callback();
    } finally {
      evaluationState = previousState;
      evaluationValues = previousValues;
    }
  }

  function withIsolatedState(state, callback) {
    if (!state || typeof callback !== "function") return undefined;
    const previousSnapshot = tickSnapshot;
    const previousState = evaluationState;
    const previousValues = evaluationValues;
    tickSnapshot = createSnapshot(state);
    evaluationState = null;
    evaluationValues = null;
    try {
      return callback();
    } finally {
      tickSnapshot = previousSnapshot;
      evaluationState = previousState;
      evaluationValues = previousValues;
    }
  }

  function collect(target, layer, state, { excludeIds = [] } = {}) {
    const excluded = excludeIds.length > 0 ? new Set(excludeIds) : null;
    const snapshot = ensureSnapshot(state);
    if (snapshot) {
      const effects = (snapshot.byTargetLayer.get(`${target}\u0000${layer}`) || [])
        .filter((effect) => !excluded?.has(effect.id));
      return evaluationState
        ? effects.map(resolveForEvaluation)
        : effects.map((effect) => effect._dynamic
          ? resolveDynamic(effect, state)
          : resolveBase(effect, state));
    }
    return [...providers.entries()].flatMap(([providerId, provider]) => {
      statistics.providerCalls += 1;
      let effects;
      try {
        effects = provider(state) || [];
        if (!Array.isArray(effects)) throw new TypeError("效果提供器必须返回数组");
      } catch (error) {
        reportInvalidEffect({ provider: providerId, id: "provider", name: providerId }, undefined, error, "provider");
        return [];
      }
      return effects
        .filter((effect) => effect.target === target && effect.layer === layer && !excluded?.has(effect.id))
        .map((effect) => resolvedEffect({ provider: providerId, ...effect }, state));
    });
  }

  function values(target, layer, state) {
    const snapshot = snapshotFor(state);
    const key = `${target}\u0000${layer}`;
    const dynamic = snapshot?.byTargetLayer.get(key)?.some((effect) => effect._dynamic) === true;
    if (snapshot && !evaluationState && !dynamic && snapshot.values.has(key)) return snapshot.values.get(key);
    const result = collect(target, layer, state).map((effect) => validEffectValue(effect, effect.value));
    if (snapshot && !evaluationState && !dynamic) snapshot.values.set(key, result);
    return result;
  }

  function groups(target, layer, state) {
    const snapshot = snapshotFor(state);
    const key = `${target}\u0000${layer}`;
    const dynamic = snapshot?.byTargetLayer.get(key)?.some((effect) => effect._dynamic) === true;
    if (snapshot && !evaluationState && !dynamic && snapshot.groups.has(key)) return snapshot.groups.get(key);
    const result = collect(target, layer, state).reduce((result, effect) => {
      const group = effect.group || effect.provider;
      (result[group] ||= []).push({
        provider: effect.provider,
        id: effect.id,
        name: effect.name || effect.id,
        target: effect.target,
        layer: effect.layer,
        value: effect.value,
        rawValue: effect.rawValue
      });
      return result;
    }, {});
    if (snapshot && !evaluationState && !dynamic) snapshot.groups.set(key, result);
    return result;
  }

  function product(target, layer, state) {
    const snapshot = snapshotFor(state);
    const key = `${target}\u0000${layer}`;
    const dynamic = snapshot?.byTargetLayer.get(key)?.some((effect) => effect._dynamic) === true;
    if (snapshot && !evaluationState && !dynamic && snapshot.products.has(key)) return snapshot.products.get(key);
    const result = values(target, layer, state).reduce((total, value) => mul(total, value), ONE);
    if (snapshot && !evaluationState && !dynamic) snapshot.products.set(key, result);
    return result;
  }

  function value(id, state, neutral = 1) {
    const snapshot = ensureSnapshot(state);
    if (snapshot) {
      const effect = snapshot.byId.get(id);
      if (!effect) return neutral;
      const result = (evaluationState
        ? resolveForEvaluation(effect)
        : effect._dynamic ? resolveDynamic(effect, state) : resolveBase(effect, state)).value;
      return validEffectValue(effect, result);
    }
    for (const [providerId, provider] of providers.entries()) {
      statistics.providerCalls += 1;
      let effects;
      try {
        effects = provider(state) || [];
        if (!Array.isArray(effects)) throw new TypeError("效果提供器必须返回数组");
      } catch (error) {
        reportInvalidEffect({ provider: providerId, id: "provider", name: providerId }, undefined, error, "provider");
        continue;
      }
      const effect = effects.find((candidate) => candidate.id === id);
      if (!effect) continue;
      const resolved = resolvedEffect({ provider: providerId, ...effect }, state);
      return validEffectValue(resolved, resolved.value);
    }
    return neutral;
  }

  function getStatistics() {
    return {
      providerCalls: statistics.providerCalls,
      dynamicEvaluations: statistics.dynamicEvaluations,
      tickProviderCalls: tickSnapshot?.providerCalls || 0
    };
  }

  function resetStatistics() {
    statistics.providerCalls = 0;
    statistics.dynamicEvaluations = 0;
    if (tickSnapshot) tickSnapshot.providerCalls = 0;
  }

  function getInvalidEffects() {
    return [...invalidEffects.values()].map((record) => ({ ...record }));
  }

  function resetInvalidEffects() {
    invalidEffects.clear();
  }

  WIS.Core.Effects = Object.freeze({
    register, beginTick, invalidate, getRevision, withState, withIsolatedState,
    dynamicResourceValue, galaxyDynamicResourceExponent,
    collect, values, groups, product, value,
    getStatistics, resetStatistics, getInvalidEffects, resetInvalidEffects
  });
}(window.WIS));
