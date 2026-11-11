(function definePureMathWork(WIS){
  'use strict';
  // Shared exact evaluators. These functions never install state, save, or award.
  function create(kind,snapshot,request={},options={}){
    const C=WIS.Core.CertifiedRankMath,R=WIS.Core.Runtime,S=WIS.Power.ScaleLogic,I=WIS.Cultivation.ImmortalLogic;
    const effects=WIS.Core.Effects.createFrozenScope(snapshot);
    const manaScope=kind==='breathing-preview'?I.createManaPreviewScope?.(snapshot):null;
    const evaluate=()=>{
      if(kind==='training-gain')return {gain:S.conversionGainQuantity()};
      if(kind==='source-preview'){
        const records=C.task('source-preview-records',function*(){
          // Preserve completed rows across worker slices. An unlock preview is
          // one joint candidate: keep its original all-unlocks-at-once semantics.
          if(request.options?.assumeUnlocked)return yield ()=>WIS.UI.SourcePreview.query(request.ids,snapshot,request.options);
          const rows=[];
          for(const id of request.ids)rows.push(...(yield ()=>WIS.UI.SourcePreview.query([id],snapshot,request.options)));
          return rows;
        });
        const nextPowerJ=request.ids.includes('training')?C.task('training-next-power-cost',function*(){return yield ()=>S.joulesForNextBasePower();}):undefined;
        return {records,nextPowerJ};
      }
      if(kind==='breathing-preview'){
        const nextManaJ=C.task('breathing-next-cost',function*(){return yield ()=>I.joulesForNextBaseMana();});
        const query=()=>({mana:I.breathingManaGainProgressive(),nextManaJ});
        const value=C.task('action-preview-value',function*(){return yield ()=>manaScope?manaScope.run(query):query();});
        const records=C.task('action-preview-records',function*(){return yield ()=>WIS.UI.SourcePreview.query(['breathing'],snapshot,{actionFinals:{breathing:value.mana}});});
        return {value,records};
      }
      throw Error('Unknown pure math request');
    };
    const work=C.createWork(()=>kind==='breathing-preview'?effects.run(()=>R.withEvaluationState(snapshot,evaluate)):R.withState(snapshot,()=>effects.run(evaluate)),options);
    return Object.freeze({advance:o=>work.advance(o),result:()=>work.result(),cancel(){work.cancel();effects.cancel();manaScope?.cancel();}});
  }
  WIS.Simulation.PureMathWork=Object.freeze({create});
}(window.WIS));
