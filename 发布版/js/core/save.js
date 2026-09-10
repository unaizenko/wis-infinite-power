(function defineSaveStorage(WIS) {
  "use strict";

  let offlineRecoveryProvider = null;

  function bindOfflineRecovery(provider) {
    offlineRecoveryProvider = typeof provider === "function" ? provider : null;
  }

  function read() {
    try {
      const value = localStorage.getItem(WIS.Core.Config.saveKey);
      if (!value) return null;
      const parsed = JSON.parse(value);
      return {
        schemaVersion: Number(parsed?.schemaVersion ?? parsed?.version) || 36,
        data: unwrap(parsed),
        offlineRecovery: parsed?.offlineRecovery ?? null
      };
    } catch {
      return null;
    }
  }

  function readRaw() {
    return read()?.data ?? null;
  }

  function write(state, options) {
    localStorage.setItem(WIS.Core.Config.saveKey, JSON.stringify(envelope(state, false, options)));
  }

  function remove() {
    localStorage.removeItem(WIS.Core.Config.saveKey);
  }

  function envelope(state, includeExportMetadata = true, options = {}) {
    WIS.Meta.TreasureProgress?.ensure(state);
    const offlineRecovery = offlineRecoveryProvider?.(options) ?? null;
    return {
      game: "WIS-无限战力系统",
      schemaVersion: WIS.Core.Config.saveVersion,
      version: WIS.Core.Config.saveVersion,
      ...(includeExportMetadata ? { exportedAt: new Date().toISOString() } : {}),
      ...(offlineRecovery ? { offlineRecovery } : {}),
      data: WIS.Core.State.toSerializable(state)
    };
  }

  function unwrap(parsed) {
    return parsed?.data ?? parsed;
  }

  WIS.Core.Save = Object.freeze({ read, readRaw, write, remove, envelope, unwrap, bindOfflineRecovery });
}(window.WIS));
