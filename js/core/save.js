(function defineSaveStorage(WIS) {
  "use strict";

  let offlineRecoveryProvider = null;

  function bindOfflineRecovery(provider) {
    offlineRecoveryProvider = typeof provider === "function" ? provider : null;
  }

  let loadError = null;
  // Last storage value acknowledged by this page, independent of game progress.
  // A stale/background page must not replace a save written by another page.
  let acknowledgedText;
  function assertStorageUnchanged(expected = acknowledgedText) {
    const current = localStorage.getItem(storageKey());
    if (expected !== undefined && current !== expected) {
      const error = Error("另一游戏页面已更新或移除了本地存档，本页面已停止覆盖保存。请先导出需要保留的进度，再重新打开游戏。");
      error.code = "SAVE_CONFLICT";
      throw error;
    }
    return current;
  }
  function persistText(text, snapshot) {
    const receipt = snapshot?.transaction;
    if (receipt && !receipt.active) throw Error("存储事务已结束");
    const beforeText = assertStorageUnchanged();
    localStorage.setItem(storageKey(), text);
    // A failed setItem owns no disk write. Explicit receipts are scoped to the
    // import/rebirth save and never follow subsequent ordinary saves.
    if (receipt) {
      if (!receipt.written) receipt.beforeText = beforeText;
      receipt.written = true;
      receipt.text = text;
    }
    acknowledgedText = text;
  }
  // Runtime-only persistence status. Only a successful storage write clears it.
  let saveStatus = { unsaved:false, message:"", revision:0 };
  const statusListeners = new Set(), diagnostics = [];
  function diagnose(stage, error) {
    diagnostics.push({stage, message:String(error?.message || error).slice(0,500),at:Date.now()});
    if (diagnostics.length > 12) diagnostics.shift();
  }
  function publishStatus() {
    for (const listener of statusListeners) try {listener({...saveStatus});} catch(error) {diagnose("save-status-ui",error);}
  }
  function resetStatus() { saveStatus={unsaved:false,message:"",revision:saveStatus.revision};publishStatus(); }
  function markPending() {saveStatus={...saveStatus,unsaved:true,message:"进度已生效，等待保存确认。"};publishStatus();}
  function noteFailure(error, message="存在未保存进度。请勿刷新或关闭页面。") {
    diagnose("save",error);saveStatus={...saveStatus,unsaved:true,message:error?.code === "SAVE_CONFLICT" ? error.message : message};publishStatus();
  }
  function subscribeStatus(listener) {statusListeners.add(listener);return ()=>statusListeners.delete(listener);}
  const storageKey = () => WIS.Core.Config.saveKey;
  const backupKey = () => storageKey() + "-before-import";
  const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
  function validateRecovery(recovery) {
    if (recovery == null) return null;
    if (!isRecord(recovery) || ![1,2].includes(recovery.version) || !Array.isArray(recovery.tasks) || !recovery.tasks.length)
      throw Error("离线任务格式无效");
    if(WIS.Core.Amount?.enabled())WIS.Core.AmountMigration.assertEnvelope(recovery,75);
    const rule = WIS.Core.Config.fixedSettlement;
    if (recovery.settlementRule != null &&
        (![1, 3, rule.version].includes(recovery.settlementRule) || recovery.offlineSegmentSeconds !== rule.offlineSeconds))
      throw Error("不支持的固定分段规则");
    WIS.Simulation.Offline.validateConfirmedSources(recovery.confirmedSources);
    WIS.Simulation.FixedSegment.validateBudget(recovery.segmentBudget);
    if(recovery.workerRecovery!=null){const w=recovery.workerRecovery;
      if(!isRecord(w)||w.version!==1||!Number.isSafeInteger(w.retries)||w.retries<0||w.retries>2||!Number.isSafeInteger(w.sequence)||w.sequence<0)
        throw Error('离线线程恢复记录无效');
    }
    const ids = new Set();
    for (const task of recovery.tasks) {
      if (recovery.version === 2) {
        if (typeof task.id !== 'string' || !/^segment-[1-9][0-9]*$/.test(task.id) || ids.has(task.id))
          throw Error("时间片段标识无效或重复");
        ids.add(task.id);
        if (task.source === 'offline' && task.compensationEligible) throw Error("离线片段不能消耗在线补偿");
        if (task.clockSeconds > 0 && Math.abs(task.gameSeconds / task.clockSeconds - task.speed) > 1e-9 * Math.max(1, task.speed))
          throw Error("时间片段倍率不一致");
      }
      if(recovery.version===2&&(!['online','offline'].includes(task.source)||
          !['state','legacy'].includes(task.randomMode)||typeof task.sealed!=='boolean'||
          typeof task.compensationEligible!=='boolean'||!Number.isFinite(task.speed)||task.speed<=0||
          !Number.isFinite(task.clockCursor)||task.clockCursor<0))throw Error("时间片段来源或游标无效");
      if (!Number.isFinite(task?.gameSeconds) || task.gameSeconds <= 0 ||
          !Number.isFinite(task.clockSeconds) || task.clockSeconds < 0 ||
          (task.logicalTickRemaining != null && (!Number.isFinite(task.logicalTickRemaining) || task.logicalTickRemaining < 0 || task.logicalTickRemaining > 0.1)))
        throw Error("离线剩余时间无效");
      // Obsolete task.random is ignored: production rewards use deterministic progress.
      // v59 discards obsolete numerical model caches. They are not the
      // confirmed asset/debt record and must not block recovery of that record.
    }
    return recovery;
  }
  // Rule 2 settles only the remaining true-offline debt from its confirmed
  // start state. Old solver cursors are disposable; assets, RNG, clock cursors,
  // online cadence and cumulative work accounting are never replayed or reset.
  function migrateRecovery(recovery, schemaVersion = WIS.Core.Config.saveVersion) {
    if (recovery == null) return null;
    if(WIS.Core.Config.saveVersion>=75)WIS.Core.ClosedBatchMigration?.recovery(recovery);
    const rule = WIS.Core.Config.fixedSettlement;
    const oldRule = recovery.settlementRule === 1 || recovery.settlementRule == null && schemaVersion < 72;
    const segmentBudget = oldRule && recovery.segmentBudget
      ? { ...recovery.segmentBudget, predictor: null, strongFeedback: null, localDiscrete: null, martialInterval: null }
      // Schema 71 also invalidated older black-hole coordinate predictors,
      // independently of the recovery rule recorded by the source envelope.
      : schemaVersion < 71 && recovery.segmentBudget?.predictor
        ? { ...recovery.segmentBudget, predictor: null } : recovery.segmentBudget;
    if(WIS.Core.Amount?.enabled())WIS.Core.AmountMigration.assertEnvelope(recovery,schemaVersion);
    const validated = validateRecovery({ ...recovery, segmentBudget,...(WIS.Core.Amount?.enabled()?{numericModelVersion:recovery.numericModelVersion||1}:{}) });
    return { ...validated, settlementRule: rule.version, offlineSegmentSeconds: rule.offlineSeconds,
      fastForwardUsed: false, fastForwardMetrics: null,
      tasks: validated.tasks.map(({ random, ...task }) => ({ ...task, fastForward: null })) };
  }
  function prepare(parsed) {return prepareInput(parsed,null);}
  function prepareInput(parsed,preparation) {return WIS.Core.State.normalizationTask('save-input',[parsed,preparation],()=>prepareInputSteps(parsed,preparation));}
  function* prepareInputSteps(parsed,preparation) {
    if (!isRecord(parsed) || (parsed.game !== undefined && parsed.game !== "WIS-无限战力系统"))
      throw Error("不是WIS存档");
    const schemaVersion = Number(parsed.schemaVersion ?? parsed.version ?? 36);
    // User-authorized legacy load policy: abandon old unprocessed time only
    // at a complete, private load boundary; native model2/rule3 debt is retained.
    if (!Number.isInteger(schemaVersion) || schemaVersion < 36 || schemaVersion > WIS.Core.Config.saveVersion)throw Error('不支持的存档版本');
    if(schemaVersion>=76&&parsed.numericModelVersion!==2)throw Object.assign(Error('不支持的数值模型版本；原存档保持不变'),{code:'amount-model-version'});
    if(schemaVersion>=76&&parsed.settlementRule!==4)throw Error('当前存档必须使用结算规则4；原存档保持不变');
    const discardLegacyBacklog=WIS.Core.Config.saveVersion>=75&&(schemaVersion<75||schemaVersion===75&&parsed.numericModelVersion===1);
    const loadedAt=preparation?.loadedAt??Date.now();
    if(!discardLegacyBacklog&&WIS.Core.Config.saveVersion>=75&&WIS.Core.ClosedBatchMigration)WIS.Core.ClosedBatchMigration.recovery(parsed.offlineRecovery);
    if(parsed.numericModelVersion===2&&parsed.settlementRule!==(schemaVersion>=76?4:3))throw Error('数值模型2结算规则与存档版本不匹配');
    if(WIS.Core.Amount?.enabled())WIS.Core.AmountMigration.assertEnvelope(parsed,schemaVersion);
    // Explicit imports from the known martial lab are compatible. Never read
    // its localStorage key or accept unknown test formats as official saves.
    if (parsed.testVariant != null && (parsed.testVariant !== "martial-test-20261002" || schemaVersion !== 70))
      throw Error("不支持的测试版存档");
    let data=preparation?.data;
    if(!data){
    data = unwrap(parsed);
    yield ()=>WIS.Core.State.validateContainerShapes(data);
    yield ()=>WIS.Core.State.validateRankSchema(data,schemaVersion);
    if(parsed.encoding!=null) {
      if(parsed.encoding!=='sparse-v1'||schemaVersion<61||!data?.core?.resources||!data.powerSystem||!data.cultivation||!data.meta)throw Error('稀疏存档格式无效');
      const fresh=()=>{const create=()=>WIS.Core.State.toSerializable(WIS.Core.State.fresh());return WIS.Core.Amount?.enabled()&&schemaVersion<75?WIS.Core.Amount.withLegacy(create):create();};
      const defaults=yield ()=>schemaVersion<74&&WIS.Meta.BigNumbers?.withLegacyRanks?WIS.Meta.BigNumbers.withLegacyRanks(fresh):fresh();
      // The source schema owns whether a precision context existed. Future
      // defaults must not fabricate metadata before legacy validation/migration.
      if(schemaVersion<74&&defaults.meta?.bigNumbers)delete defaults.meta.bigNumbers.rankBasis;
      if(WIS.Core.Config.saveVersion>=75&&parsed.numericModelVersion!==2){defaults.meta.closedBatchModel=1;delete defaults.meta.treasureBatch;}
      const expand=(value,base)=>{
        if(value===undefined)return base;
        if(!isRecord(value)||WIS.Core.BigNum.isDecimal(value))return value;
        const out={};for(const key of new Set([...Object.keys(base||{}),...Object.keys(value)]))out[key]=expand(value[key],base?.[key]);return out;
      };
      data=expand(data,defaults);
    }
    if(preparation){data=preparation.scope?.seal(data)??data;preparation.data=data;}
    }
    const candidate = yield ()=>WIS.Core.State.migrate(schemaVersion, data,preparation?.migrationContext);
    const offlineRecovery = yield ()=>migrateRecovery(discardLegacyBacklog?null:parsed.offlineRecovery, schemaVersion);
    if(WIS.Core.Config.saveVersion>=75&&WIS.Core.ClosedBatchMigration){if(parsed.numericModelVersion===2&&candidate.meta.closedBatchModel!==2)throw Error('数值模型2状态标识不匹配');if(parsed.numericModelVersion!==2)candidate.meta.closedBatchModel=1;yield ()=>WIS.Core.ClosedBatchMigration.upgrade(candidate);}
    yield ()=>WIS.Core.Runtime.withState(candidate, () => WIS.Core.Effects.withIsolatedState(candidate, () => {
      WIS.Meta.TreasureProgress.ensure(candidate);
      WIS.Cultivation.ExplorationProgress?.validate?.(candidate);
      for (const key of WIS.Meta.Treasures.keys) {
        WIS.Meta.TreasureLedger.progress(candidate,key);
        if (WIS.Meta.TreasureLedger.sign(WIS.Meta.TreasureLedger.stock(candidate, key)) < 0)
          throw Error("宝物库存账本无效");
      }
    }));
    let legacyBacklogDiscarded=null;
    if(discardLegacyBacklog){
      const rt=candidate.core.runtime,ledger=rt.timeLedger;
      legacyBacklogDiscarded={schemaVersion,numericModelVersion:parsed.numericModelVersion??null,rule:parsed.offlineRecovery?.settlementRule??null,policy:'discard-on-legacy-load',loadedAt};
      rt.timeLedger={...ledger,pendingContinuousTime:[],awaySince:null,boundaryAt:loadedAt,registeredUntil:loadedAt};
      rt.lastUpdateAt=loadedAt;
      delete rt.onlineCadenceRemaining;
    }
    return { schemaVersion, state: candidate, data, offlineRecovery, ...(legacyBacklogDiscarded?{legacyBacklogDiscarded}:{}) };
  }
  // Candidate migration may restart its pure outer preparation after an inner
  // proof suspends. Completed arithmetic tasks remain private to this work.
  function prepareWork(parsed,{isCurrent=()=>true}={}) {
    const text=JSON.stringify(parsed,(_key,value)=>{if(typeof value==='number'&&!Number.isFinite(value)||['function','symbol','bigint'].includes(typeof value))throw Error('存档必须为有效JSON数据');return value;});
    // One private immutable-input preparation per work. Mathematical retries
    // retain the expanded prefix; they never rebuild defaults or parse JSON.
    // Nothing is published before migration and all post-checks complete.
    const Exact=WIS.Core.RankExact,scope=Exact&&WIS.Core.Amount?.enabled()?WIS.Core.State.createLoadNormalizationScope():null,input=scope?scope.seal(JSON.parse(text)):JSON.parse(text),preparation={data:null,scope,loadedAt:Date.now(),migrationContext:Exact?WIS.Core.State.createMigrationContext():null},evaluate=()=>scope?scope.run(()=>prepareInput(input,preparation)):prepareInput(input,preparation);
    if(Exact){const inner=Exact.createWork(evaluate,{isCurrent}),release=()=>{scope?.close();preparation.data=null;preparation.migrationContext?.close();preparation.migrationContext=null;};return Object.freeze({...inner,
      advance(options){try{const next=inner.advance(options);if(next.done)release();return next;}catch(error){release();throw error;}},
      runSync(){try{return inner.runSync();}finally{release();}},cancel(){release();inner.cancel();}});}
    let value=null,done=false,cancelled=false,error=null;
    const check=()=>{if(cancelled)throw Object.assign(Error('load cancelled'),{code:'rank-work-cancelled'});if(error)throw error;if(!isCurrent()){error=Object.assign(Error('load owner changed'),{code:'rank-work-stale'});throw error;}};
    return {advance({deadline=Infinity}={}){check();if(performance.now()>=deadline&&!done)return {done:false,operations:0};try{if(!done){value=evaluate();done=true;}return {done:true,operations:0};}catch(e){error=e;throw e;}},result(){check();return done?value:null;},cancel(){cancelled=true;preparation.data=null;preparation.migrationContext?.close();preparation.migrationContext=null;value=null;}};
  }
  function readWork() {
    const text=localStorage.getItem(storageKey());let work=null,value=null,done=false,cancelled=false,failure=null;
    const current=()=>!cancelled&&localStorage.getItem(storageKey())===text;
    return {advance(options){if(cancelled)throw Object.assign(Error('load cancelled'),{code:'rank-work-cancelled'});if(failure)throw failure;
      try {if(!current())throw Object.assign(Error('storage changed during load'),{code:'rank-work-stale'});
        if(done)return {done:true,operations:0};
        if(text){if(!work)work=prepareWork(JSON.parse(text),{isCurrent:current});const next=work.advance(options);if(!next.done)return next;value=work.result();}
        acknowledgedText=text;loadError=null;done=true;return {done:true,operations:0};
      }catch(error){if(!failure){failure=error;loadError=String(error.message||error);noteFailure(error,'原存档读取失败，已保留原文并停用自动保存。');}throw error;}
    },result(){if(failure)throw failure;return done?value:null;},cancel(){cancelled=true;work?.cancel();value=null;}};
  }
  function read() {
    try {
      const value = localStorage.getItem(storageKey());
      if (!value) { acknowledgedText = value; return null; }
      const saved = prepare(JSON.parse(value));
      loadError = null;
      acknowledgedText = value;
      return saved;
    } catch (error) {
      loadError = String(error.message || error);
      noteFailure(error, "原存档读取失败；当前使用临时未保存会话，原存档仍保留且自动保存已停用。请导入有效存档、恢复备份，或确认不需要旧存档后重置游戏。");
      throw error;
    }
  }
  function storageSnapshot({ transaction = false } = {}) {
    return { text: localStorage.getItem(storageKey()), acknowledgedText, loadError, saveStatus:{...saveStatus},
      ...(transaction ? { transaction: { active: true, written: false } } : {}) };
  }
  function finishStorageTransaction(snapshot) {
    if (snapshot?.transaction) snapshot.transaction.active = false;
  }
  function restoreStorage(snapshot) {
    const receipt = snapshot.transaction;
    if (receipt && !receipt.active) return false;
    loadError = snapshot.loadError;
    saveStatus = snapshot.saveStatus ? {...snapshot.saveStatus} : {unsaved:false,message:"",revision:saveStatus.revision};
    try {
      if (receipt && !receipt.written) {
        // No successful transaction write: restore page authority only, never
        // write the earlier disk snapshot over another page's newer save.
        acknowledgedText = snapshot.acknowledgedText;
        assertStorageUnchanged();
        assertStorageUnchanged(snapshot.text);
      } else {
        assertStorageUnchanged(receipt ? receipt.text : acknowledgedText);
        const text = receipt ? receipt.beforeText : snapshot.text;
        if (text === null) localStorage.removeItem(storageKey());
        else localStorage.setItem(storageKey(), text);
        acknowledgedText = text;
      }
      publishStatus();
      return true;
    } catch (error) {
      noteFailure(error, "原进度已恢复到内存，但本地存档恢复失败，存在未保存进度。请勿刷新或关闭页面。");
      throw error;
    } finally {
      finishStorageTransaction(snapshot);
    }
  }
  function acceptLoaded(snapshot) {
    if (snapshot?.transaction) {
      assertStorageUnchanged();
      assertStorageUnchanged(snapshot.text);
    }
    acknowledgedText = localStorage.getItem(storageKey());
    loadError = null;
    resetStatus();
  }
  function backup(state, options = {}) {
    const current = assertStorageUnchanged();
    // A restore must not replace its own source before the new main save is
    // durable. Keeping the bytes also survives a second storage-write failure.
    // Protected sessions retain any earlier backup instead of copying bad data
    // over it. Ordinary imports still back up the current valid state.
    if ((options.preserveExisting === true || loadError) && localStorage.getItem(backupKey()) !== null) return backupKey();
    const saved = WIS.Core.State.cloneForSimulation(state);
    const ledger = saved.core.runtime.timeLedger;
    // The caller captured this state and pending together before entering hold.
    // A standalone backup uses the state's existing authority, never wall now.
    const capturedAt = options.capturedAt ?? Math.max(saved.lastUpdateAt, ledger.boundaryAt, ledger.registeredUntil);
    saved.lastUpdateAt = capturedAt;
    const recovery = Object.prototype.hasOwnProperty.call(options, 'offlineRecoveryOverride')
      ? options.offlineRecoveryOverride : offlineRecoveryProvider?.(options);
    const text = loadError ? localStorage.getItem(storageKey()) : JSON.stringify(envelope(saved, false,
      { ...options, offlineRecoveryOverride: recovery ? { ...recovery, closedAt: capturedAt } : null }));
    assertStorageUnchanged(current);
    localStorage.setItem(backupKey(), text);
    return backupKey();
  }

  function readRaw() {
    return read()?.data ?? null;
  }

  function write(state, options) {
    try {
      const diag=WIS.Simulation?.FixedSegment?.diagnostics;
      const result=diag ? diag.measure("save",()=>writeSnapshot(state,options)) : writeSnapshot(state,options);
      saveStatus={unsaved:false,message:"",revision:saveStatus.revision+1};publishStatus();
      return result;
    } catch(error) {noteFailure(error);throw error;}
  }
  function writeSnapshot(state, options) {
    if (loadError) throw Error("原存档读取失败，自动保存已停用：" + loadError);
    persistText(JSON.stringify(envelope(state, false, options)), options?.storageTransaction);
  }

  // Only the version-checked offline Worker coordinator calls this boundary.
  // Serialization is performed in the Worker; storage success is its durable ACK.
  function writePrepared(text) {
    try {
      if(loadError)throw Error('原存档读取失败，自动保存已停用：'+loadError);
      if(typeof text!=='string'||!text.length)throw Error('离线检查点存档为空');
      persistText(text);
      saveStatus={unsaved:false,message:'',revision:saveStatus.revision+1};publishStatus();
    }catch(error){noteFailure(error);throw error;}
  }

  function remove() {
    localStorage.removeItem(WIS.Core.Config.saveKey);
    acknowledgedText = null;
    loadError = null;
    resetStatus();
  }

  function sessionPolicy() {
    const temporary=loadError !== null;
    return {mode:temporary?"temporary":"normal",persistenceAllowed:!temporary,durableRecoveryAllowed:!temporary,backgroundAccrualAllowed:!temporary};
  }

  let persistenceDefaults;
  function persistLive(state,simulationLoop,offlineSimulation,options = {}) {
    if (WIS.Core.Save.getLoadError()) return;
    try {
    const prepared = simulationLoop?.prepareSave(options);
    // While a file-picker/import transaction owns the foreground, ordinary
    // saves are intentionally skipped. Only the import commit path may persist
    // the newly installed state; otherwise a hidden/closing event could serialize
    // a half-frozen old session.
    if (prepared === false && simulationLoop?.isImportHoldActive?.() && options.importCommit !== true) return false;
    // Manual actions save outside the simulation transaction. Their confirmed
    // state must replace any model checkpoint made before the action.
    if (!options.preserveSourceModels && !offlineSimulation?.isInternalWork()) offlineSimulation?.invalidateSourceModels();
    const saved = WIS.Core.State.cloneForSimulation(state);
    // Uncommitted intervals are saved explicitly by prepareSave. Rewinding
    // this watermark as well would settle the same foreground time twice.
    saved.lastUpdateAt = Date.now();
    WIS.Core.Save.write(saved, options);
    } catch(error) { WIS.Core.Save.noteFailure(error); throw error; }
  }

  function sparseData(state) {
    const S=WIS.Core.State;
    persistenceDefaults ||= S.fresh();
    // envelope owns this validated private snapshot; never passed a live domain.
    const data={core:state.core,powerSystem:state.powerSystem,cultivation:state.cultivation,meta:state.meta};
    const meta=data.meta;
    for(const key of ['treasureProgress','treasureProgressResidual','treasureProgressResidualTail','treasureStockResidual','treasureCredits']) {
      if(key==='treasureProgress') {for(const k of Object.keys(meta.treasureProgressFinite||{}))delete meta[key][k];}
      else if(meta[key])for(const [k,v] of Object.entries(meta[key]))if(v==null||Array.isArray(v)&&!v.length||WIS.Core.BigNum.isDecimal(v)&&v.eq(0)||v===0||v==='0')delete meta[key][k];
    }
    if(meta.treasureDiagnostics)meta.treasureDiagnostics={...meta.treasureDiagnostics,recent:[]};
    const strip=value=>{
      if(!value||typeof value!=='object'||WIS.Core.BigNum.isDecimal(value))return value;
      if(Array.isArray(value))return value.map(strip);
      return Object.fromEntries(Object.entries(value).filter(([key])=>!['closedLedger','closedProgress','stockRoundingSensitivity','batchesSensitivity','sensitivity','boundScope','policy','progressBefore','progressAfter','tailBoundary'].includes(key)).map(([k,v])=>[k,strip(v)]));
    };
    meta.treasureProgressStatus=strip(meta.treasureProgressStatus);
    function prune(value,defaults,key='') {
      // Required numerical context must not be reconstructed from fresh defaults.
      if(key==='rankBasis'&&WIS.Core.Config.saveVersion>=74)return value;
      // This version discriminates legacy ledger arrays from finite records.
      // Keep the union intact: shape validation runs before sparse expansion.
      if(key==='explorationRewards')return value;
      if(['lastUpdateAt','randomState','joules','power'].includes(key))return value;
      if(value&&typeof value==='object'&&!Array.isArray(value)&&!WIS.Core.BigNum.isDecimal(value)) {
        const out={};for(const k of Object.keys(value).sort()){const v=value[k],next=prune(v,defaults?.[k],k);if(next!==undefined)out[k]=next;}
        return Object.keys(out).length?out:undefined;
      }
      if(JSON.stringify(value)===JSON.stringify(defaults))return undefined;
      return value;
    }
    // Empty root domains are still explicit WIS save identity markers.
    return Object.fromEntries(['core','powerSystem','cultivation','meta'].map(k=>[k,prune(data[k],persistenceDefaults[k])||{}]));
  }

  function envelope(state, includeExportMetadata = true, options = {}) {
    state = WIS.Core.State.cloneForSimulation(state);
    WIS.Core.State.validateRankSchema(state,WIS.Core.Config.saveVersion,true);
    WIS.Meta.TreasureProgress?.ensure(state);
    WIS.Core.ClosedBatchMigration?.validate(state);
    WIS.Cultivation.ExplorationProgress?.ensure?.(state);
    const offlineRecovery = Object.prototype.hasOwnProperty.call(options, 'offlineRecoveryOverride')
      ? options.offlineRecoveryOverride
      : (offlineRecoveryProvider?.(options) ?? null);
    return {
      game: "WIS-无限战力系统",
      encoding: "sparse-v1",
      schemaVersion: WIS.Core.Config.saveVersion,
      version: WIS.Core.Config.saveVersion,
      ...(WIS.Core.Amount?.enabled()?{numericModelVersion:state.meta.closedBatchModel===2?2:1,numericTailPolicyVersion:WIS.Core.AmountProducts.tailPolicy.version,...(state.meta.closedBatchModel===2?{settlementRule:WIS.Core.Config.fixedSettlement.version}:{})}:{}),
      ...(includeExportMetadata ? { exportedAt: new Date().toISOString() } : {}),
      ...(offlineRecovery ? { offlineRecovery } : {}),
      data: sparseData(state)
    };
  }

  function unwrap(parsed) {
    return parsed?.data ?? parsed;
  }

  WIS.Core.Save = Object.freeze({ status:()=>({...saveStatus}), subscribeStatus, markPending, noteFailure, diagnose, diagnostics:()=>diagnostics.map(d=>({...d})), prepare, prepareWork, readWork, validateRecovery, migrateRecovery, backup, backupKey, storageSnapshot, finishStorageTransaction, restoreStorage, persistLive, sessionPolicy, getLoadError: () => loadError, acceptLoaded, read, readRaw, write, writePrepared, remove, envelope, unwrap, bindOfflineRecovery });
}(window.WIS));
