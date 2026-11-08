(function(W){
 'use strict';
 const C=W.Core.ClosedFormBatch,B=W.Core.BigNum;
 function upgrade(target){if(target.meta.closedBatchModel===2){validate(target);return target;}const state=W.Core.State.cloneForSimulation(target);state.meta.closedBatchModel=2;W.Meta.ClosedTreasures.ensure(state);W.Meta.ClosedRankSettlement.migrate(state);
  const P=W.Cultivation.ExplorationProgress,p=P.ensure(state),level=W.Meta.ClosedTreasures.down(P.levelWords(state)).floor(),money=W.Meta.ClosedTreasures.down(W.Core.Amount.words(W.Core.FiniteProgress.quantity(p.natural)));
  state.naturalTreasureLevel=level;state.explorationRewards={...p,natural:W.Cultivation.ClosedNatural.point(level,money),levelResidual:[],naturalBatch:C.create({n0:level,context:{region:level.lt(10)?0:1,award:1},funding:money})};
  state.meta.closedBatchMigration={version:1,fromNumericModel:1,fromSettlementRule:2,accInitializedToZero:true};validate(state);target.meta=state.meta;target.naturalTreasureLevel=state.naturalTreasureLevel;target.explorationRewards=state.explorationRewards;return target;
 }
 function validate(state){if(state.meta.closedBatchModel!==2)return state;W.Meta.ClosedTreasures.validate(state);W.Meta.ClosedRankSettlement.validate(state.meta.bigNumbers);const p=state.explorationRewards;if(p?.naturalBatch){C.read(p.naturalBatch);if(p.levelResidual?.length)throw Error('Closed natural reward still has tails');}return state;}
 function recovery(recovery){if(recovery?.tasks?.length&&(recovery.numericModelVersion!==2||![3,4].includes(recovery.settlementRule)))throw Object.assign(Error('旧结算任务尚未到可转换提交边界；原存档与剩余时间保留，请先用旧开发构建完成或暂停导入'),{code:'CLOSED_RECOVERY_PROTECTED'});}
 W.Core.ClosedBatchMigration=Object.freeze({version:2,upgrade,validate,recovery});
}(window.WIS));
