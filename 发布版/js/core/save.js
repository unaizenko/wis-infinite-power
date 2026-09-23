(function defineSaveStorage(WIS) {
  "use strict";

  let offlineRecoveryProvider = null;

  function bindOfflineRecovery(provider) {
    offlineRecoveryProvider = typeof provider === "function" ? provider : null;
  }

  let loadError = null;
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
    diagnose("save",error);saveStatus={...saveStatus,unsaved:true,message};publishStatus();
  }
  function subscribeStatus(listener) {statusListeners.add(listener);return ()=>statusListeners.delete(listener);}
  const storageKey = () => WIS.Core.Config.saveKey;
  const backupKey = () => storageKey() + "-before-import";
  const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
  function validateRecovery(recovery) {
    if (recovery == null) return null;
    if (!isRecord(recovery) || ![1,2].includes(recovery.version) || !Array.isArray(recovery.tasks) || !recovery.tasks.length)
      throw Error("离线任务格式无效");
    WIS.Simulation.Offline.validateConfirmedSources(recovery.confirmedSources);
    WIS.Simulation.FixedSegment.validateBudget(recovery.segmentBudget);
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
  function prepare(parsed) {
    if (!isRecord(parsed) || (parsed.game !== undefined && parsed.game !== "WIS-无限战力系统"))
      throw Error("不是WIS存档");
    const schemaVersion = Number(parsed.schemaVersion ?? parsed.version ?? 36);
    let data = unwrap(parsed);
    if(parsed.encoding!=null) {
      if(parsed.encoding!=='sparse-v1'||schemaVersion<61||!data?.core?.resources||!data.powerSystem||!data.cultivation||!data.meta)throw Error('稀疏存档格式无效');
      const defaults=WIS.Core.State.toSerializable(WIS.Core.State.fresh());
      const expand=(value,base)=>{
        if(value===undefined)return base;
        if(!isRecord(value)||WIS.Core.BigNum.isDecimal(value))return value;
        const out={};for(const key of new Set([...Object.keys(base||{}),...Object.keys(value)]))out[key]=expand(value[key],base?.[key]);return out;
      };
      data=expand(data,defaults);
    }
    const domain = data?.core?.resources;
    const resources = domain ? [domain, data.cultivation?.systems?.immortal?.resources] : [data];
    for (const container of resources.filter(Boolean)) for (const key of ["joules", "power", "mana", "immortalPower"])
      for (const suffix of ["", "GainResidual"]) {
        const value = container[key + suffix];
        if (value != null && (!(typeof value === "string" || typeof value === "number" || WIS.Core.BigNum.isDecimal(value)) ||
            (typeof value === "string" && !value.trim()) || !WIS.Core.BigNum.isFiniteBN(value) || (suffix === "" && WIS.Core.BigNum.lt(value, 0))))
          throw Error("存档资源含非法数值");
      }
    const candidate = WIS.Core.State.migrate(schemaVersion, data);
    const validatedRecovery = validateRecovery(parsed.offlineRecovery);
    if (validatedRecovery?.settlementRule != null &&
        (validatedRecovery.settlementRule !== WIS.Core.Config.fixedSettlement.version ||
         validatedRecovery.offlineSegmentSeconds !== WIS.Core.Config.fixedSettlement.offlineSeconds))
      throw Error("不支持的固定分段规则");
    const offlineRecovery = validatedRecovery ? { ...validatedRecovery,
      fastForwardUsed: false, fastForwardMetrics: null,
      tasks: validatedRecovery.tasks.map(({ random, ...task }) => ({ ...task, fastForward: null })) } : null;
    WIS.Core.Runtime.withState(candidate, () => WIS.Core.Effects.withIsolatedState(candidate, () => {
      WIS.Meta.TreasureProgress.ensure(candidate);
      WIS.Cultivation.ExplorationProgress?.validate?.(candidate);
      for (const key of WIS.Meta.Treasures.keys) {
        WIS.Meta.TreasureLedger.progress(candidate,key);
        if (WIS.Meta.TreasureLedger.sign(WIS.Meta.TreasureLedger.stock(candidate, key)) < 0)
          throw Error("宝物库存账本无效");
      }
    }));
    return { schemaVersion, state: candidate, data, offlineRecovery };
  }
  function read() {
    try {
      const value = localStorage.getItem(storageKey());
      if (!value) return null;
      const saved = prepare(JSON.parse(value));
      loadError = null;
      return saved;
    } catch (error) {
      loadError = String(error.message || error);
      noteFailure(error, "原存档读取失败；当前使用临时未保存会话，原存档仍保留且自动保存已停用。请导入有效存档、恢复备份，或确认不需要旧存档后重置游戏。");
      throw error;
    }
  }
  function storageSnapshot() { return { text: localStorage.getItem(storageKey()), loadError, saveStatus:{...saveStatus} }; }
  function restoreStorage(snapshot) {
    if (snapshot.text === null) localStorage.removeItem(storageKey());
    else localStorage.setItem(storageKey(), snapshot.text);
    loadError = snapshot.loadError;
    saveStatus = snapshot.saveStatus ? {...snapshot.saveStatus} : {unsaved:false,message:"",revision:saveStatus.revision};
    publishStatus();
  }
  function backup(state, options = {}) {
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
    localStorage.setItem(WIS.Core.Config.saveKey, JSON.stringify(envelope(state, false, options)));
  }

  function remove() {
    localStorage.removeItem(WIS.Core.Config.saveKey);
    loadError = null;
    resetStatus();
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
    persistenceDefaults ||= S.toSerializable(S.fresh());
    const data=S.toSerializable(state);
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
    WIS.Meta.TreasureProgress?.ensure(state);
    WIS.Cultivation.ExplorationProgress?.ensure?.(state);
    const offlineRecovery = Object.prototype.hasOwnProperty.call(options, 'offlineRecoveryOverride')
      ? options.offlineRecoveryOverride
      : (offlineRecoveryProvider?.(options) ?? null);
    return {
      game: "WIS-无限战力系统",
      encoding: "sparse-v1",
      schemaVersion: WIS.Core.Config.saveVersion,
      version: WIS.Core.Config.saveVersion,
      ...(includeExportMetadata ? { exportedAt: new Date().toISOString() } : {}),
      ...(offlineRecovery ? { offlineRecovery } : {}),
      data: sparseData(state)
    };
  }

  function unwrap(parsed) {
    return parsed?.data ?? parsed;
  }

  WIS.Core.Save = Object.freeze({ status:()=>({...saveStatus}), subscribeStatus, markPending, noteFailure, diagnose, diagnostics:()=>diagnostics.map(d=>({...d})), prepare, validateRecovery, backup, backupKey, storageSnapshot, restoreStorage, persistLive, getLoadError: () => loadError, acceptLoaded: () => { loadError = null; resetStatus(); }, read, readRaw, write, remove, envelope, unwrap, bindOfflineRecovery });
}(window.WIS));
