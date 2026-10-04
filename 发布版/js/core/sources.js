(function defineSourceCollector(WIS) {
  "use strict";

  const { parseFinite } = WIS.Core.BigNum;

  const providers = new Map();
  const highestPowerIndependentProviders = new Set();
  const descriptorContextIndependentProviders = new Set();
  const descriptorMemoKey = Symbol('Source descriptors');
  const statistics = { collections:0, providerCalls:0, descriptorReuses:0, valueEvaluations:0 };

  function register(id, provider, { highestPowerIndependent = false, descriptorContextIndependent = false } = {}) {
    if (!id || typeof provider !== "function" || providers.has(id)) {
      throw new Error(`来源提供器无效或重复：${id}`);
    }
    providers.set(id, provider);
    if (highestPowerIndependent) highestPowerIndependentProviders.add(id);
    // This is an explicit provider contract, not an inference from function
    // arity or repeated outputs. valueAt may STILL depend on its real context.
    if (descriptorContextIndependent) descriptorContextIndependentProviders.add(id);
  }

  function sourceValue(source, state, context) {
    statistics.valueEvaluations++;
    const entry = typeof source.valueAt === "function" ? source.valueAt : source.value;
    if (typeof entry === "function" && entry.constructor?.name === "AsyncFunction") throw Error("Source 求值不能跨 await");
    const raw = typeof entry === "function" ? entry(state, context) : entry;
    const value = parseFinite(raw);
    if (value === null || value.lt(0)) {
      const error = Error(`Source 非法产出：${source.id}`);
      error.code = "formula-representation";
      throw error;
    }
    return value;
  }
  function collect(target, state = WIS.Core.Runtime.getState(), context = {}) {
    statistics.collections++;
    const R = WIS.Core.Runtime;
    if (state === R.state) state = R.getState();
    return R.withEvaluationState(state, () => [...providers.entries()].flatMap(([providerId, provider]) => {
      if (provider.constructor?.name === "AsyncFunction") throw Error("Source provider 不能跨 await");
      const memo=descriptorContextIndependentProviders.has(providerId)?WIS.Core.Effects.scopeMemo(state):null;
      let descriptors=memo?.get(descriptorMemoKey);
      let sources;
      if(descriptors?.has(provider)) {
        statistics.descriptorReuses++;sources=descriptors.get(provider);
      } else {
        statistics.providerCalls++;sources=provider(state, context) || [];
        if (!Array.isArray(sources)) throw Error(`来源提供器必须返回数组：${providerId}`);
        if(memo){if(!descriptors){descriptors=new Map();memo.set(descriptorMemoKey,descriptors);}descriptors.set(provider,sources);}
      }
      if (!Array.isArray(sources)) throw Error(`来源提供器必须返回数组：${providerId}`);
      return sources.filter(source => source.target === target).map(source => {
        const descriptor = WIS.Core.Formulas.descriptor({ provider: providerId, ...source }, {
          kind: "source", refresh: (current, ctx) => {
            const row = provider(current, ctx)?.find(v => v.id === source.id);
            if (!row) throw Error(`来源已不存在：${source.id}`);
            return sourceValue(row, current, ctx);
          }
        });
        const value = sourceValue(source, state, context), evaluate = descriptor.valueAt;
        return { ...descriptor, value, valueAt: (current, ctx = {}) => R.withEvaluationState(current,
          () => sourceValue({ id: source.id, valueAt: evaluate }, current, ctx)) };
      });
    }));
  }
  function values(target, state, context = {}) {
    return collect(target, state, context).map(source => source.value);
  }

  WIS.Core.Sources = Object.freeze({ supportsHighestPowerEvaluation: () => highestPowerIndependentProviders.size === providers.size, register, collect, values, providerIds:()=>Object.freeze([...providers.keys()]),
    getStatistics:()=>({...statistics}),resetStatistics(){for(const key of Object.keys(statistics))statistics[key]=0;} });
}(window.WIS));
