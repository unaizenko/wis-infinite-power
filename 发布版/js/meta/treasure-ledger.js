(function defineTreasureLedger(WIS) {
  "use strict";
  // State-bound treasure adapters; mathematical exports alias Core functions.
  // Keep the strict TreasureLedger and bounded SignedLedger defaults distinct.
  const { BN, ZERO } = WIS.Core.BigNum;
  const { LedgerError,Credit,bounded,project,value,scale,integer,MAX_TERMS,safeNormalize,negate } = WIS.Core.SignedLedger;
  const { normalize,sign,add,subtract,compare } = WIS.Core.SignedLedger.strict;
  function stock(state,key) { const tail=state.meta.treasureStockResidual?.[key]; return tail?.length ? safeNormalize([state.meta.treasures[key] || ZERO,...tail]) : [String(state.meta.treasures[key] || ZERO)]; }
  function progress(state,key) {
    const finite=state.meta.treasureProgressFinite?.[key];
    if(finite) {
      if(finite.version!==1 || !BN(finite.requirement).isFinite() || !BN(finite.requirement).gt(0) ||
          !BN(finite.remaining).isFinite() || BN(finite.remaining).lt(0) || !BN(finite.carry).isFinite())
        throw new LedgerError('宝物有限进度存档无效');
      const words=safeNormalize([finite.requirement,BN(finite.remaining).neg(),finite.carry]);
      if(sign(words)<0)throw new LedgerError('宝物有限进度余额为负');
      return words;
    }
    const credit=state.meta.treasureCredits?.[key];
    if(credit) return [String(Credit.value(Credit.actual(credit)))]; // UI/legacy projection only, never a settlement input.
    return safeNormalize([state.meta.treasureProgress?.[key] || ZERO,
    state.meta.treasureProgressResidual?.[key] || ZERO, ...(state.meta.treasureProgressResidualTail?.[key] || [])]); }
  function write(state,key,terms,isStock=false) {
    terms=safeNormalize(terms);
    if(sign(terms)<0) throw new LedgerError("宝物账本余额不足，操作未提交");
    const main=value(terms), rest=safeNormalize([...terms,...negate([String(main)])]);
    if(isStock) {
      const changed=!BN(state.meta.treasures[key]||0).eq(main);
      state.meta.treasures[key]=main;
      if(changed && state.meta.treasureProgressFinite?.[key]) {
        const words=progress(state,key);
        write(state,key,words,false);
      }
      (state.meta.treasureStockResidual ||= {})[key]=[];
    } else {
      // Three represented values describe current progress, independent of
      // elapsed play time. Temporary signed words are never persisted as history.
      const demand=WIS.Meta.TreasureProgress.requirement(key,value(stock(state,key)));
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
  function transaction(state, run) {
    const previous=state.meta, next={...previous};
    for(const key of ["treasures","treasureStockResidual","treasureProgress","treasureProgressResidual",
      "treasureProgressResidualTail","treasureProgressFinite","treasureProgressPending","treasureProgressStatus","treasureQualifications","treasureCredits"]) next[key]={...(previous[key]||{})};
    state.meta=next;
    try { return run(); } catch(error) { state.meta=previous; WIS.Core.Effects?.invalidate?.(); throw error; }
  }
  WIS.Meta.TreasureLedger=Object.freeze({LedgerError,Credit,bounded,project,normalize,value,sign,add,subtract,compare,scale,stock,progress,write,transaction,integer,MAX_TERMS});
}(window.WIS));
