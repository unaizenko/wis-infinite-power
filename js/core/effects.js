(function defineEffectCollector(WIS) {
  "use strict";

  const providers = new Map();

  function register(id, provider) {
    if (!id || typeof provider !== "function" || providers.has(id)) throw new Error(`效果提供器无效或重复：${id}`);
    providers.set(id, provider);
  }

  function resolvedEffect(effect, state) {
    const rawValue = typeof effect.value === "function" ? effect.value(state) : effect.value;
    const adjust = WIS.Cultivation?.ImmortalLogic?.applyCelestialFiveDeclineToMultiplier;
    const value = effect.celestialFiveDecline === true && typeof adjust === "function"
      ? adjust(rawValue)
      : rawValue;
    return { ...effect, rawValue, value };
  }

  function collect(target, layer, state) {
    return [...providers.entries()].flatMap(([providerId, provider]) => {
      const effects = provider(state) || [];
      return effects
        .filter((effect) => effect.target === target && effect.layer === layer)
        .map((effect) => ({ provider: providerId, ...resolvedEffect(effect, state) }));
    });
  }

  function values(target, layer, state) {
    const neutral = layer.endsWith("Additive") ? 0 : 1;
    return collect(target, layer, state).map((effect) => {
      const value = Number(effect.value);
      return Number.isFinite(value) ? value : neutral;
    });
  }

  function groups(target, layer, state) {
    return collect(target, layer, state).reduce((result, effect) => {
      const group = effect.group || effect.provider;
      (result[group] ||= []).push({ name: effect.name || effect.id, value: effect.value, rawValue: effect.rawValue });
      return result;
    }, {});
  }

  function product(target, layer, state) {
    return values(target, layer, state).reduce((total, value) => total * value, 1);
  }

  function value(id, state, neutral = 1) {
    for (const [providerId, provider] of providers.entries()) {
      const effect = (provider(state) || []).find((candidate) => candidate.id === id);
      if (!effect) continue;
      const result = Number(resolvedEffect(effect, state).value);
      return Number.isFinite(result) ? result : neutral;
    }
    return neutral;
  }

  WIS.Core.Effects = Object.freeze({ register, collect, values, groups, product, value });
}(window.WIS));
