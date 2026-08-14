(function defineSaveStorage(WIS) {
  "use strict";

  function read() {
    try {
      const value = localStorage.getItem(WIS.Core.Config.saveKey);
      if (!value) return null;
      const parsed = JSON.parse(value);
      return {
        schemaVersion: Number(parsed?.schemaVersion ?? parsed?.version) || 36,
        data: unwrap(parsed)
      };
    } catch {
      return null;
    }
  }

  function readRaw() {
    return read()?.data ?? null;
  }

  function write(state) {
    localStorage.setItem(WIS.Core.Config.saveKey, JSON.stringify(envelope(state, false)));
  }

  function remove() {
    localStorage.removeItem(WIS.Core.Config.saveKey);
  }

  function envelope(state, includeExportMetadata = true) {
    return {
      game: "WIS-无限战力系统",
      schemaVersion: WIS.Core.Config.saveVersion,
      version: WIS.Core.Config.saveVersion,
      ...(includeExportMetadata ? { exportedAt: new Date().toISOString() } : {}),
      data: WIS.Core.State.toSerializable(state)
    };
  }

  function unwrap(parsed) {
    return parsed?.data ?? parsed;
  }

  WIS.Core.Save = Object.freeze({ read, readRaw, write, remove, envelope, unwrap });
}(window.WIS));
