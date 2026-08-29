(function defineSourceCollector(WIS) {
  "use strict";

  const { BN, ZERO, isFiniteBN, isNaNBN } = WIS.Core.BigNum;

  const providers = new Map();

  function register(id, provider) {
    if (!id || typeof provider !== "function" || providers.has(id)) {
      throw new Error(`来源提供器无效或重复：${id}`);
    }
    providers.set(id, provider);
  }

  function collect(target, state, context = {}) {
    return [...providers.entries()].flatMap(([providerId, provider]) => {
      const sources = provider(state, context) || [];
      return sources
        .filter((source) => source.target === target)
        .map((source) => ({ provider: providerId, ...source }));
    });
  }

  function values(target, state, context = {}) {
    return collect(target, state, context).map((source) => {
      const value = BN(source.value);
      return isFiniteBN(value) && !isNaNBN(value) ? value : ZERO;
    });
  }

  WIS.Core.Sources = Object.freeze({ register, collect, values });
}(window.WIS));
