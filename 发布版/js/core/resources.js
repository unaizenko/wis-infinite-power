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
  const ledger = () => exactEnabled()?WIS.Core.AmountLedger:(resourceLedger ||= WIS.Core.SignedLedger.bounded(8192));
  const exactEnabled=()=>WIS.Core.Amount?.enabled()===true;
  function balance(container, key) {
    return exactEnabled()?WIS.Core.Amount.words(storedQuantity(container,key)):[String(BN(container[key] ?? ZERO))];
  }
  function exactDefinitionValue(definition,s,id){
    const A=WIS.Core.Amount;if(!A)throw Error('Exact amount module unavailable');
    definition=requireResource(definition,id);
    if(!exactEnabled())return A.from(definition.get(s)??ZERO);
    if(typeof definition.getExact!=='function')throw Object.assign(Error('资源缺少精确余额适配：'+id),{code:'amount-adapter-required'});
    return A.from(definition.getExact(s));
  }
  function exactParts(key,value){const A=WIS.Core.Amount,parts=(['joules','power','mana','immortalPower'].includes(key)?A.boundedFieldParts:A.fieldParts)(value,key,key+'GainResidualTail');return {[key]:parts[key],[key+'GainResidual']:ZERO,[key+'GainResidualTail']:parts[key+'GainResidualTail']};}
  function readExact(id,explicit){return exactDefinitionValue(resolve(id),state(explicit),id);}
  function requireExactModel(){if(!exactEnabled())throw Object.assign(Error('精确余额模型未启用'),{code:'amount-model-disabled'});}
  // Internal synchronous scope: its caller owns the full candidate rollback.
  // It is used only for continuous credits, never purchase attempts/actions.
  let privateCandidate=null;
  function withPrivateCandidate(owner,work){
    if(!exactEnabled()||!WIS.Core.Runtime.isProjection()||!owner||WIS.Core.Runtime.getState()!==owner||typeof work!=='function'||work.constructor?.name==='AsyncFunction')throw Object.assign(Error('私有资源候选作用域无效'),{code:'amount-private-scope'});
    const previous=privateCandidate;privateCandidate=owner;try{const result=WIS.Core.CertifiedRankMath.withWork(work);if(result&&typeof result.then==='function')throw Object.assign(Error('私有资源候选不能跨await'),{code:'amount-private-scope'});return result;}finally{privateCandidate=previous;}
  }
  function mutateExact(s,definition,work){return WIS.Core.CertifiedRankMath.withWork(()=>mutateExactInWork(s,definition,work));}
  function mutateExactInWork(s,definition,work){WIS.Core.Runtime.assertMutable();if(privateCandidate&&s===WIS.Core.Runtime.state&&WIS.Core.Runtime.getState()===privateCandidate)s=privateCandidate;if(s===privateCandidate){const result=work(s);exactDefinitionValue(definition,s,definition.id);WIS.Core.Effects?.invalidate?.();return result;}const draft=WIS.Core.State.createDraft(s),result=work(draft.state);exactDefinitionValue(definition,draft.state,definition.id);const next=draft.finish();for(const key of ['core','powerSystem','cultivation','meta'])if(next[key]!==s[key])s[key]=next[key];WIS.Core.Effects?.invalidate?.();return result;}
  function creditExact(id,value,explicit){requireExactModel();const s=state(explicit),d=requireResource(resolve(id),id),A=WIS.Core.Amount,a=A.from(value);if(A.compare(a,0)===0)return exactDefinitionValue(d,s,id);return mutateExact(s,d,candidate=>{d.add(candidate,A.project(a),A.words(a));return exactDefinitionValue(d,candidate,id);});}
  function replaceExact(id,value,explicit){requireExactModel();const s=state(explicit),d=requireResource(resolve(id),id);if(typeof d.setExact!=='function')throw Object.assign(Error('资源缺少精确写入适配：'+id),{code:'amount-adapter-required'});const a=WIS.Core.Amount.from(value);return mutateExact(s,d,candidate=>{d.setExact(candidate,a);return exactDefinitionValue(d,candidate,id);});}
  function debitExact(id,value,explicit){requireExactModel();const A=WIS.Core.Amount,a=A.from(value);return pay(resolve(id),A.project(a),state(explicit),A.words(a));}
  // Legacy migration validation must retain the historical merged reader.
  function legacyBalance(container,key){return ledger().normalize([container[key]??ZERO,container[`${key}GainResidual`]??ZERO,...(container[`${key}GainResidualTail`]||[])]);}
  function storedQuantity(container,key){return WIS.Core.Amount.field(container,key,key+'GainResidualTail',key+'GainResidual');}
  function prepare(container, key, delta) {
    return prepareTerms(container, key, [delta]);
  }
  function prepareTerms(container, key, income) {
    if(exactEnabled()){
      const A=WIS.Core.Amount,prior=Object.prototype.hasOwnProperty.call(container,key)?storedQuantity(container,key):A.from(0);
      return exactParts(key,A.addWords(prior,income));
    }
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
        if(!exactEnabled())container[key] = ledger().value(legacyBalance(container, key));
        Object.assign(container, prepare(container, key, ZERO));
      }
    }
    return candidate;
  }

  // Generic storage adapter. Physical location is supplied by its owner.
  // The optional third set argument is the existing rebase facade's mode.
  const storageAdapters=new WeakMap();
  function storedDefinition({ id, owner, shortName, kind, container, snapshot = true }) {
    function box(s) {
      const value = container(s);
      if (!value || typeof value !== "object") throw Error(`资源容器不存在：${id}`);
      return value;
    }
    const definition={
      id, owner, shortName, kind, snapshot,
      get: s => container(s)?.[shortName],
      getExact:s=>WIS.Core.Amount.field(box(s),shortName,shortName+'GainResidualTail',shortName+'GainResidual'),
      setExact(s,value){Object.assign(box(s),exactParts(shortName,value));return value;},
      set(s, value, rebase = false) {
        const resources = box(s);
        resources[shortName] = value;
        const residual = residualKeyFor(resources, shortName);
        if (residual || rebase) resources[residual || `${shortName}GainResidual`] = ZERO;
        resources[`${shortName}GainResidualTail`] = [];
        return value;
      },
      add(s,delta,terms){
        const parts=prepareTerms(box(s),shortName,terms||[delta]);
        const M=WIS.Cultivation.Martial,A=WIS.Core.Amount;let meta=null;
        if(kind==='core'&&['joules','power'].includes(shortName)&&M?.hasCoreGainRewards(s)){
          const positive=terms&&A?.enabled()?WIS.Core.AmountLedger.sign(terms)>0:gt(delta,0);
          if(positive)meta=M.prepareCoreGainRewards(s,shortName,terms&&A?.enabled()?A.fromParts(0,terms):delta);
        }
        Object.assign(box(s),parts);if(meta)s.meta=meta;return parts[shortName];
      }
    };
    storageAdapters.set(definition.getExact,{box,key:shortName});return definition;
  }
  // Branded callbacks keep the existing synchronous interface. Only their pure
  // preparation may suspend; the enclosing candidate owns the final writes.
  const privateOperations=new WeakMap();
  function privateOperation(owner,perform,prepare,apply,isCurrent=()=>true){
    if([perform,prepare,apply,isCurrent].some(fn=>typeof fn!=='function'))throw Error('Invalid private numeric operation');
    privateOperations.set(perform,{owner,prepare,apply,isCurrent});return perform;
  }
  function createPrivateOperationWork(operation,owner,{numericScope=null}={}){
    const spec=privateOperations.get(operation);if(!spec)return null;
    const R=WIS.Core.Runtime,C=WIS.Core.CertifiedRankMath,roots=['core','powerSystem','cultivation','meta'],inputs=roots.map(k=>owner[k]),policy=R.getMathPolicy();let closed=false;
    const current=()=>!closed&&exactEnabled()&&R.isProjection()&&R.getState()===owner&&spec.owner===owner&&R.getMathPolicy()===policy&&roots.every((k,i)=>owner[k]===inputs[i])&&spec.isCurrent();
    if(!current())throw Object.assign(Error('Private operation owner changed'),{code:'rank-work-stale'});
    const work=C.createWork(spec.prepare,{isCurrent:current,numericScope});
    return {advance:deadline=>work.advance({deadline,maximumOperations:65536,minimumOperations:1}),
      install(){const result=work.result();if(work.diagnostics().status!=='done')throw Error('Private operation incomplete');closed=true;return spec.apply(result);},
      cancel(){closed=true;work.cancel();}};
  }
  function numericInputCurrent(owner,keys){
    const values=keys.map(key=>owner[key]),components=values.map(v=>WIS.Core.BigNum.isDecimal(v)?[v.sign,v.layer,v.mag]:null),tails=values.map(v=>Array.isArray(v)&&!Object.isFrozen(v)?v.slice():null);
    return ()=>keys.every((key,i)=>{const v=owner[key],c=components[i],tail=tails[i];return Object.is(v,values[i])&&(!c||Object.is(v.sign,c[0])&&Object.is(v.layer,c[1])&&Object.is(v.mag,c[2]))&&(!tail||v.length===tail.length&&tail.every((word,j)=>Object.is(v[j],word)));});
  }
  function quantityInputCurrent(value){
    if(!value||typeof value!=='object'||WIS.Core.Amount.isCanonicalAmount(value))return ()=>true;
    if(WIS.Core.BigNum.isDecimal(value))return numericInputCurrent({value},['value']);
    const keys=Object.keys(value),current=numericInputCurrent(value,keys);
    return ()=>{const next=Object.keys(value);return next.length===keys.length&&next.every((key,i)=>key===keys[i])&&current();};
  }
  function creditExactOperation(id,value,explicit){
    const owner=state(explicit),perform=()=>creditExact(id,value,owner),definition=resolve(id),adapter=storageAdapters.get(definition?.getExact);
    if(!exactEnabled()||!adapter||["core.joules","core.power"].includes(id)&&WIS.Cultivation.Martial?.hasCoreGainRewards(owner))return perform;
    const container=adapter.box(owner),key=adapter.key,current=numericInputCurrent(container,[key,key+'GainResidual',key+'GainResidualTail']),valueCurrent=quantityInputCurrent(value);
    return privateOperation(owner,perform,()=>{
      const A=WIS.Core.Amount,a=A.from(value);if(A.compare(a,0)===0)return {zero:true,value:exactDefinitionValue(definition,owner,id)};
      const parts=prepareTerms(container,key,A.words(a)),next=A.field(parts,key,key+'GainResidualTail',key+'GainResidual');return {parts,value:next};
    },result=>{WIS.Core.Runtime.assertMutable();if(!result.zero){Object.assign(container,result.parts);WIS.Core.Effects?.invalidate?.();}return result.value;},()=>adapter.box(owner)===container&&current()&&valueCurrent());
  }
  function read(definition, s, id) { return sanitize(requireResource(definition, id).get(s)); }
  function get(id, explicit) { return read(resolve(id), state(explicit), id); }
  function write(definition, value, s, id, rebase = false) {
    WIS.Core.Runtime.assertMutable();
    definition=requireResource(definition,id);
    if(exactEnabled()){if(typeof definition.setExact!=='function')throw Object.assign(Error('资源缺少精确写入适配：'+id),{code:'amount-adapter-required'});return mutateExact(s,definition,candidate=>{const quantity=WIS.Core.Amount.from(value);definition.setExact(candidate,quantity);return WIS.Core.Amount.project(exactDefinitionValue(definition,candidate,definition.id));});}
    return definition.set(s,value,rebase);
  }
  function set(id, value, explicit) { return write(resolve(id), exactEnabled()?WIS.Core.Amount.from(value):sanitize(value), state(explicit), id); }
  function increase(definition, delta, s, id) {
    WIS.Core.Runtime.assertMutable();
    definition=requireResource(definition,id);
    if(exactEnabled()){const parsed=WIS.Core.BigNum.parseFinite(delta);if(!parsed)throw Object.assign(Error('新增资源输入非法'),{code:'amount-invalid'});if(parsed.eq(0))return definition.get(s);return mutateExact(s,definition,candidate=>definition.add(candidate,delta));}
    return definition.add(s,delta);
  }
  function add(id, delta, explicit) { return increase(resolve(id), delta, state(explicit), id); }
  function validCost(raw) {
    const cost = WIS.Core.BigNum.parseFinite(raw);
    return cost && !cost.lt(0) ? cost : null;
  }
  // -1: unavailable, 0: ordinary payment, 1: special adapter payment.
  function paymentMode(definition, cost, s, terms=null) {
    if (!definition || cost === null) return -1;
    const value = definition.get(s);
    if (value === undefined) return -1;
    if(exactEnabled()){
      const A=WIS.Core.Amount,price=terms?A.fromParts(0,terms):A.from(cost);
      if(A.compare(price,0)===0)return 0;
      const available=exactDefinitionValue(definition,s,definition.id);
      if(A.compare(available,price)<0)return -1;
      const hasExact=typeof definition.specialCanAffordExact==='function'&&typeof definition.specialSpendExact==='function';
      const anySpecial=['specialCanAfford','specialSpend','specialCanAffordExact','specialSpendExact'].some(k=>typeof definition[k]==='function');
      if(anySpecial&&!hasExact)throw Object.assign(Error('特殊付款缺少成对精确适配'),{code:'amount-special-payment-required'});
      const special=hasExact?definition.specialCanAffordExact(s,price):undefined;
      return special==null?0:special===true?1:-1;
    }
    if (cost.eq(0)) return 0;
    const special = definition.specialCanAfford?.(s, cost);
    return special == null ? (gte(value, cost) ? 0 : -1) : special === true ? 1 : -1;
  }
  const eligibility = (definition, cost, s, terms=null) => paymentMode(definition, cost, s, terms) >= 0;
  function pay(definition, cost, s, terms = null) {
    const mode = paymentMode(definition, cost, s, terms);
    if (mode < 0) return false;
    WIS.Core.Runtime.assertMutable();
    if(exactEnabled()?WIS.Core.Amount.compare(terms?WIS.Core.Amount.fromParts(0,terms):WIS.Core.Amount.from(cost),0)===0:cost.eq(0))return true;
    // Special hooks run against a private COW transaction. A false result or
    // exception cannot commit inventory, residuals or spending statistics.
    if (mode === 1) {
      const draft = WIS.Core.State.createDraft(s);
      const paid=exactEnabled()&&typeof definition.specialSpendExact==='function'
        ?definition.specialSpendExact(draft.state,terms?WIS.Core.Amount.fromParts(0,terms):WIS.Core.Amount.from(cost))
        :definition.specialSpend(draft.state,cost);
      if(paid!==true)return false;
      const next = draft.finish();
      for (const key of ["core", "powerSystem", "cultivation", "meta"]) if (next[key] !== s[key]) s[key] = next[key];
      WIS.Core.Effects?.invalidate?.();
      return true;
    }
    // Keep signed-term debit normalization intact (including negative compensation).
    if(exactEnabled()){mutateExact(s,definition,candidate=>definition.add(candidate,cost.neg(),terms?ledger().subtract([],terms):undefined));return true;}
    definition.add(s, cost.neg(), terms ? ledger().subtract([], terms) : undefined);
    WIS.Core.Effects?.invalidate?.();
    return true;
  }
  function pricePacket(raw){const cost=validCost(raw);if(!exactEnabled()||cost===null)return {cost,terms:null};const A=WIS.Core.Amount,price=A.from(raw);return {cost:A.project(price),terms:A.words(price)};}
  function canAfford(id, cost, explicit) {const p=pricePacket(cost);return eligibility(resolve(id),p.cost,state(explicit),p.terms);}
  function spend(id, cost, explicit) {const p=pricePacket(cost);return pay(resolve(id),p.cost,state(explicit),p.terms);}
  function validTerms(costs) {
    // Signed compensation, counted words and pages are valid ledger inputs.
    // Validate leaves before normalization can cancel or silently drop them.
    if (!Array.isArray(costs) || costs.some(v =>
      !WIS.Core.BigNum.isDecimal(v) && typeof v !== "number" && typeof v !== "string")) return null;
    try {
      for (const word of WIS.Core.SignedLedger.expand(costs)) {
        if(exactEnabled()&&(WIS.Core.AmountLedger.isRatio(word)||WIS.Core.AmountLedger.isProduct(word))){WIS.Core.AmountLedger.validate(word);continue;}
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
    return valid !== null && eligibility(resolve(id), valid.cost, state(explicit), valid.terms);
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
    return write(resolveSystem(system, resource), exactEnabled()?WIS.Core.Amount.from(amount):sanitize(amount), state(explicit), `${system}.${resource}`);
  }
  function addSystem(system, resource, amount, explicit) {
    return increase(resolveSystem(system, resource), amount, state(explicit), `${system}.${resource}`);
  }
  function rebaseSystem(system, resource, amount, explicit) {
    const main = exactEnabled()?WIS.Core.Amount.project(WIS.Core.Amount.from(amount)):BN(amount);
    if (!isFiniteBN(main) || main.lt(0)) throw Error("资源边界投影无效");
    write(resolveSystem(system, resource), exactEnabled()?WIS.Core.Amount.from(amount):main, state(explicit), `${system}.${resource}`, true);
  }
  function canAffordSystem(system, resource, cost, explicit) {
    const p=pricePacket(cost);return eligibility(resolveSystem(system,resource),p.cost,state(explicit),p.terms);
  }
  function spendSystem(system, resource, cost, explicit) {
    const p=pricePacket(cost);return pay(resolveSystem(system,resource),p.cost,state(explicit),p.terms);
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
      if (definition.kind === "cultivation" && !Object.prototype.hasOwnProperty.call(result.cultivation.systems, definition.owner))
        result.cultivation.systems[definition.owner] = { resources: {} };
      const resources = definition.kind === "core" ? result.core.resources
        : result.cultivation.systems[definition.owner].resources;
      resources[definition.shortName] = sanitize(raw);
    }
    return result;
  }

  WIS.Core.Resources = Object.freeze({
    bind, get, set, add, spend, canAfford, spendTerms, canAffordTerms, balance, prepare, prepareTerms, validateState, ledger,
    privateOperation,createPrivateOperationWork,numericInputCurrent,quantityInputCurrent,creditExactOperation,withPrivateCandidate,readExact, creditExact, debitExact, replaceExact,
    getSystem, setSystem, rebaseSystem, addSystem, spendSystem, canAffordSystem, storedDefinition,
    accumulateResourceGain: add, accumulateSystemResourceGain: addSystem, snapshot
  });
  for (const shortName of ["joules", "power"]) registry.register(storedDefinition({
    id: `core.${shortName}`, owner: "core", shortName, kind: "core", container: s => s.core?.resources
  }));
}(window.WIS));
