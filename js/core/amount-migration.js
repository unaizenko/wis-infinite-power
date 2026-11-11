(function defineAmountMigration(W){
 'use strict';
 const A=W.Core.Amount;
 const fail=()=>{throw Object.assign(Error('不支持的数值模型版本；原存档保持不变'),{code:'amount-model-version'});};
 function assertEnvelope(envelope,schema){if(schema>=75){if(schema>=76?envelope.numericModelVersion!==2:![1,2].includes(envelope.numericModelVersion))fail();if(envelope.numericTailPolicyVersion!=null&&![1,2].includes(envelope.numericTailPolicyVersion))throw Object.assign(Error('不支持的尾项精度策略；原存档保持不变'),{code:'amount-tail-policy-version'});}else if(envelope.numericModelVersion!=null)fail();}
 // Only an already interpreted private legacy candidate reaches this boundary.
 // Old clients never assigned authority to these optional future fields.
 function upgradeLegacy(interpreted){return W.Core.State.normalizationTask('amount-upgrade',[interpreted],()=>upgradeLegacySteps(interpreted));}
 function* upgradeLegacySteps(interpreted){
  const S=W.Core.State,data=S.toSerializable(interpreted),meta=data.meta;
  delete meta.statistics.amountTails;
  const clearPoint=p=>{if(p&&typeof p==='object')delete p.residual;};
  for(const p of Object.values(meta.treasureProgressFinite||{}))clearPoint(p);
  const immortal=data.cultivation.systems.immortal,progress=immortal.progress.explorationRewards;
  if(progress){delete progress.seizeResidual;clearPoint(progress.natural);}
  for(const p of Object.values(immortal.xiuzhen?.shengProgress||{}))clearPoint(p);
  return yield ()=>S.normalizeDomain(data);
 }
 function validate(state){
  const S=W.Core.State,meta=state.meta;
  for(const key of S.statisticKeys)S.readStatistic(state,key);
  A.field(meta.statistics,'explorationTotal');
  W.Cultivation.ExplorationProgress.validate(state);
  // Normalizers validate every domain-owned pair, including spent/peak and
  // actually-paid refund ledgers. No neutral fallback may replace a failed pair.
  W.Cultivation.Martial.normalize(state.cultivation.systems.martial);
  W.Meta.Infinity.normalize(meta.infinity,meta.achievements.tree3===true);
  W.Meta.HighMultiverse.normalize(meta.highMultiverse);
  W.Meta.BigNumbers.normalize(meta.bigNumbers);
  W.Cultivation.Xiuzhen.validate(state);
  for(const key of W.Meta.Treasures.keys){W.Meta.Treasures.quantity(state,key);W.Meta.TreasureLedger.progress(state,key);}
  return state;
 }
 W.Core.AmountMigration=Object.freeze({version:1,assertEnvelope,upgradeLegacy,validate});
}(window.WIS));
