(function defineTreasureLedger(WIS) {
  "use strict";
  // State-bound treasure adapters; mathematical exports alias Core functions.
  // Keep the strict TreasureLedger and bounded SignedLedger defaults distinct.
  const { BN, ZERO } = WIS.Core.BigNum;
  const S=WIS.Core.SignedLedger,{LedgerError,Credit,integer,MAX_TERMS}=S;
  const whole=()=>WIS.Core.Amount?.enabled()===true,backend=()=>whole()?WIS.Core.AmountLedger:S;
  const bounded=(...args)=>whole()?WIS.Core.AmountLedger:S.bounded(...args);
  const project=value=>backend().project(value),value=words=>backend().value(words),scale=(words,factor)=>backend().scale(words,factor),safeNormalize=words=>backend().safeNormalize(words),negate=words=>backend().negate(words);
  const normalize=words=>(whole()?backend():S.strict).normalize(words),sign=words=>(whole()?backend():S.strict).sign(words),add=(a,b)=>(whole()?backend():S.strict).add(a,b),subtract=(a,b)=>(whole()?backend():S.strict).subtract(a,b),compare=(a,b)=>(whole()?backend():S.strict).compare(a,b);
  function stock(state,key) { const tail=state.meta.treasureStockResidual?.[key]; return tail?.length ? safeNormalize([state.meta.treasures[key] || ZERO,...tail]) : [String(state.meta.treasures[key] || ZERO)]; }
  function progress(state,key) {
    if(WIS.Meta.ClosedTreasures?.enabled(state)&&state.meta.treasureBatch?.[key])return [String(state.meta.treasureProgress[key]||0)];
    const finite=state.meta.treasureProgressFinite?.[key];
    if(finite!=null) {
      try { WIS.Core.FiniteProgress.validate(finite); }
      catch (error) { throw new LedgerError('宝物有限进度存档无效：'+error.message); }
      const words=safeNormalize([finite.requirement,BN(finite.remaining).neg(),finite.carry,...(whole()?finite.residual||[]:[])]);
      if(sign(words)<0)throw new LedgerError('宝物有限进度余额为负');
      return words;
    }
    const credit=state.meta.treasureCredits?.[key];
    if(credit) return [String(Credit.value(Credit.actual(credit)))]; // UI/legacy projection only, never a settlement input.
    return safeNormalize([state.meta.treasureProgress?.[key] || ZERO,
    state.meta.treasureProgressResidual?.[key] || ZERO, ...(state.meta.treasureProgressResidualTail?.[key] || [])]); }
  function write(state,key,terms,isStock=false) {
    if(WIS.Meta.ClosedTreasures?.enabled(state)&&state.meta.treasureBatch?.[key])return WIS.Meta.ClosedTreasures.write(state,key,terms,isStock);
    terms=safeNormalize(terms);
    if(sign(terms)<0) throw new LedgerError("宝物账本余额不足，操作未提交");
    const main=value(terms), rest=safeNormalize([...terms,...negate([String(main)])]);
    if(isStock) {
      const changed=WIS.Core.Amount?.enabled()?compare(stock(state,key),terms)!==0:!BN(state.meta.treasures[key]||0).eq(main);
      state.meta.treasures[key]=main;
      // The new main already includes the prior tail; clear it before rebasing demand.
      (state.meta.treasureStockResidual ||= {})[key]=WIS.Core.Amount?.enabled()?rest:[];
      if(changed && state.meta.treasureProgressFinite?.[key]) {
        const words=progress(state,key);
        write(state,key,words,false);
      }
    } else {
      if(whole()){
        const A=WIS.Core.Amount,demand=WIS.Meta.TreasureProgress.requirement(key,A.fromParts(0,stock(state,key)),state),point=WIS.Core.FiniteProgress.create(demand,A.fromParts(0,terms));
        (state.meta.treasureProgressFinite||={})[key]=point;
        if(state.meta.treasureCredits)delete state.meta.treasureCredits[key];
        state.meta.treasureProgress[key]=main;state.meta.treasureProgressResidual[key]=ZERO;(state.meta.treasureProgressResidualTail||={})[key]=[];return;
      }
      // Three represented values describe current progress, independent of
      // elapsed play time. Temporary signed words are never persisted as history.
      const demand=WIS.Meta.TreasureProgress.requirement(key,value(stock(state,key)),state);
      const remaining=value(safeNormalize([demand,...negate(terms)]));
      const nonnegativeRemaining=remaining.lt(0)?ZERO:remaining;
      const carry=value(safeNormalize([...terms,...negate([demand]),nonnegativeRemaining]));
      if(!demand.isFinite() || !nonnegativeRemaining.isFinite() || !carry.isFinite())
        throw new LedgerError("宝物有限进度无法表示，输入保留");
      (state.meta.treasureProgressFinite ||= {})[key]={version:1,
        requirement:String(demand),remaining:String(nonnegativeRemaining),carry:String(carry)};
      if(state.meta.treasureCredits)delete state.meta.treasureCredits[key];
      state.meta.treasureProgress[key]=main;
      state.meta.treasureProgressResidual[key]=ZERO;
      (state.meta.treasureProgressResidualTail ||= {})[key]=[];
    }
  }
  function transaction(state,run){return whole()?WIS.Core.CertifiedRankMath.withWork(()=>transactionInWork(state,run)):transactionInWork(state,run);}
  function transactionInWork(state, run) {
    const previous=state.meta, next={...previous};
    for(const key of ["treasureBatch","treasures","treasureStockResidual","treasureProgress","treasureProgressResidual",
      "treasureProgressResidualTail","treasureProgressFinite","treasureProgressPending","treasureProgressStatus","treasureQualifications","treasureCredits"]) next[key]={...(previous[key]||{})};
    state.meta=next;
    try { return run(); } catch(error) { state.meta=previous; WIS.Core.Effects?.invalidate?.(); throw error; }
  }
  WIS.Meta.TreasureLedger=Object.freeze({LedgerError,Credit,bounded,project,normalize,value,sign,add,subtract,compare,scale,stock,progress,write,transaction,integer,MAX_TERMS});
}(window.WIS));
