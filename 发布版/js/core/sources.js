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

  function quantityResult(quantity,initial=null){
    const B=WIS.Core.BigNum;let parts=initial?Object.freeze({sign:initial.sign,layer:initial.layer,mag:initial.mag}):null;
    return Object.freeze({quantity,get value(){if(!parts){const value=WIS.Core.Amount.project(quantity);parts=Object.freeze({sign:value.sign,layer:value.layer,mag:value.mag});}return B.Decimal.fromComponents_noNormalize(parts.sign,parts.layer,parts.mag);}});
  }
  function sourceResult(source, state, context) {
    statistics.valueEvaluations++;
    const entry = typeof source.valueAt === "function" ? source.valueAt : source.value;
    if (typeof entry === "function" && entry.constructor?.name === "AsyncFunction") throw Error("Source 求值不能跨 await");
    const raw = typeof entry === "function" ? entry(state, context) : entry;
    const A=WIS.Core.Amount,exact=A?.enabled()===true;
    // Complete immutable quantities are already validated. Their legacy scalar
    // shadow is optional until an actual scalar consumer requests that view.
    if(exact&&A.isAmount(raw))return quantityResult(A.from(raw));
    const value=parseFinite(raw);
    if (value === null || value.lt(0)) {
      const error = Error(`Source 非法产出：${source.id}`);error.code = "formula-representation";throw error;
    }
    return exact?quantityResult(A.from(value),value):{value,quantity:null};
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
            const result=sourceResult(row,current,ctx);return result.quantity||result.value;
          }
        });
        const continuation=Object.getPrototypeOf(context)===Object.prototype&&Reflect.ownKeys(context).length===0?WIS.Core.Effects.continuationMemo?.(state):null;
        let completed=continuation?.get('source-completed-values');if(continuation&&!completed){completed=new WeakMap();continuation.set('source-completed-values',completed);}
        let captured;
        if(completed?.has(source))captured=completed.get(source);
        else{captured=sourceResult(source,state,context);completed?.set(source,captured);}
        const evaluate=descriptor.valueAt;
        const resolve=(current,ctx)=>sourceResult({id:source.id,valueAt:evaluate},current,ctx);
        const row={ ...descriptor,
          ...(captured.quantity?{quantity:captured.quantity,quantityAt:(current,ctx={})=>R.withEvaluationState(current,()=>resolve(current,ctx).quantity)}:{}),
          valueAt:(current,ctx={})=>R.withEvaluationState(current,()=>resolve(current,ctx).value) };
        if(captured.quantity)Object.defineProperty(row,'value',{enumerable:true,configurable:true,get:()=>captured.value});else row.value=captured.value;return row;
      });
    }));
  }
  function values(target, state, context = {}) {
    return collect(target, state, context).map(source => source.value);
  }

  function valuesExact(target,state,context={}){if(!WIS.Core.Amount?.enabled())throw Object.assign(Error("Exact source model disabled"),{code:"amount-model-disabled"});return collect(target,state,context).map(source=>source.quantity);}
  WIS.Core.Sources = Object.freeze({ valuesExact, supportsHighestPowerEvaluation: () => highestPowerIndependentProviders.size === providers.size, register, collect, values, providerIds:()=>Object.freeze([...providers.keys()]),
    getStatistics:()=>({...statistics}),resetStatistics(){for(const key of Object.keys(statistics))statistics[key]=0;} });
}(window.WIS));
