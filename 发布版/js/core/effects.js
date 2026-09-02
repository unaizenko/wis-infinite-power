(function defineEffectCollector(WIS) {
  "use strict";

  const { BN, ZERO, ONE, isDecimal, isFiniteBN, isNaNBN, add, mul, div, pow, max: maxBN } = WIS.Core.BigNum;

  const providers = new Map();
  let tickSnapshot = null;
  let evaluationState = null;
  let evaluationValues = null;
  const statistics = { providerCalls: 0, dynamicEvaluations: 0 };
  const dynamicResourceKeys = new Set(["joules", "power"]);
  const dynamicReadStates = new WeakMap();

  function activeChallenge(state) {
    return state?.meta?.challenges?.activeChallenge ?? state?.activeChallenge ?? null;
  }

  function galaxyCompletionCount(state) {
    const completions = state?.meta?.challenges?.challengeCompletions ?? state?.challengeCompletions;
    return Math.max(0, Number(completions?.galaxy) || 0);
  }

  function galaxyDynamicResourceExponent(source = WIS.Core.Runtime?.getState?.()) {
    const treasureConfig = WIS.Core.Config.scaleTreasures?.cosmicFiber;
    const fallback = Number(WIS.Core.Config.challenges?.galaxy?.dynamicResourceExponent);
    if (!treasureConfig) return Number.isFinite(fallback) && fallback > 0 ? BN(fallback) : ONE;
    const rawCount = source?.meta?.treasures?.cosmicFiber ?? source?.treasureImprints?.cosmicFiber;
    const numericCount = Number(rawCount);
    const count = BN(Number.isFinite(numericCount) ? Math.max(0, Math.floor(numericCount)) : Number.MAX_VALUE);
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
    const rawValue = evaluateEffectValue(effect, state);
    const adjust = WIS.Cultivation?.ImmortalLogic?.applyCelestialFiveDeclineToMultiplier;
    const value = effect.celestialFiveDecline === true && typeof adjust === "function"
      ? adjust(rawValue, state?.immortalPower)
      : rawValue;
    return { ...effect, rawValue, value };
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
      && previous.cosmicFiberCount === (state?.meta?.treasures?.cosmicFiber ?? state?.treasureImprints?.cosmicFiber ?? 0);
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
      cosmicFiberCount: state?.meta?.treasures?.cosmicFiber ?? state?.treasureImprints?.cosmicFiber ?? 0
    };
  }

  function beginTick(state) {
    const canonicalState = state === WIS.Core.Runtime?.state
      ? WIS.Core.Runtime.getState()
      : state;
    const snapshot = {
      state: canonicalState,
      ready: false,
      all: [],
      byId: new Map(),
      byTargetLayer: new Map(),
      values: new Map(),
      groups: new Map(),
      products: new Map(),
      providerCalls: 0
    };
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
    const canonicalState = state === WIS.Core.Runtime?.state
      ? WIS.Core.Runtime.getState()
      : state;
    return tickSnapshot?.state === canonicalState ? tickSnapshot : null;
  }

  function ensureSnapshot(state) {
    const snapshot = snapshotFor(state);
    if (!snapshot || snapshot.ready) return snapshot;
    for (const [providerId, provider] of providers.entries()) {
      statistics.providerCalls += 1;
      snapshot.providerCalls += 1;
      const effects = provider(state) || [];
      for (const effect of effects) {
        const resolved = {
          provider: providerId,
          ...effect,
          _valueProvider: typeof effect.value === "function" ? effect.value : null,
          _dynamic: effect.dynamic === true || effect.celestialFiveDecline === true ||
            effectDynamicResources(effect).length > 0,
          _dynamicState: null,
          _dynamicResolved: null,
          _resolved: false
        };
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
    const rawValue = evaluateEffectValue(effect, state,
      typeof effect._valueProvider === "function" ? effect._valueProvider : effect.value);
    const adjust = WIS.Cultivation?.ImmortalLogic?.applyCelestialFiveDeclineToMultiplier;
    const value = effect.celestialFiveDecline === true && typeof adjust === "function"
      ? adjust(rawValue, state?.immortalPower)
      : rawValue;
    const result = { ...effect, rawValue, value };
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
    tickSnapshot = {
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

  function collect(target, layer, state) {
    const snapshot = ensureSnapshot(state);
    if (snapshot) {
      const effects = snapshot.byTargetLayer.get(`${target}\u0000${layer}`) || [];
      return evaluationState
        ? effects.map(resolveForEvaluation)
        : effects.map((effect) => effect._dynamic
          ? resolveDynamic(effect, state)
          : resolveBase(effect, state));
    }
    return [...providers.entries()].flatMap(([providerId, provider]) => {
      statistics.providerCalls += 1;
      return (provider(state) || [])
        .filter((effect) => effect.target === target && effect.layer === layer)
        .map((effect) => ({ provider: providerId, ...resolvedEffect(effect, state) }));
    });
  }

  function values(target, layer, state) {
    const neutral = layer.endsWith("Additive") ? 0 : 1;
    const snapshot = snapshotFor(state);
    const key = `${target}\u0000${layer}`;
    const dynamic = snapshot?.byTargetLayer.get(key)?.some((effect) => effect._dynamic) === true;
    if (snapshot && !evaluationState && !dynamic && snapshot.values.has(key)) return snapshot.values.get(key);
    const result = collect(target, layer, state).map((effect) => {
      if (isDecimal(effect.value) || typeof effect.value === "string") {
        const value = BN(effect.value);
        return isFiniteBN(value) && !isNaNBN(value) ? value : neutral;
      }
      const value = Number(effect.value);
      return Number.isFinite(value) ? value : neutral;
    });
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
      (result[group] ||= []).push({ name: effect.name || effect.id, value: effect.value, rawValue: effect.rawValue });
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
      if (isDecimal(result) || typeof result === "string") {
        const decimal = BN(result);
        return isFiniteBN(decimal) && !isNaNBN(decimal) ? decimal : neutral;
      }
      const numeric = Number(result);
      return Number.isFinite(numeric) ? numeric : neutral;
    }
    for (const [providerId, provider] of providers.entries()) {
      statistics.providerCalls += 1;
      const effect = (provider(state) || []).find((candidate) => candidate.id === id);
      if (!effect) continue;
      const result = resolvedEffect(effect, state).value;
      if (isDecimal(result) || typeof result === "string") {
        const decimal = BN(result);
        return isFiniteBN(decimal) && !isNaNBN(decimal) ? decimal : neutral;
      }
      const numeric = Number(result);
      return Number.isFinite(numeric) ? numeric : neutral;
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

  WIS.Core.Effects = Object.freeze({
    register, beginTick, invalidate, getRevision, withState, withIsolatedState,
    dynamicResourceValue, galaxyDynamicResourceExponent,
    collect, values, groups, product, value,
    getStatistics, resetStatistics
  });
}(window.WIS));
