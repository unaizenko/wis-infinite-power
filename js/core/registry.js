(function defineRegistries(WIS) {
  "use strict";

  function createRegistry(kind) {
    const entries = new Map();
    return Object.freeze({
      register(definition) {
        if (!definition?.id) throw new Error(`${kind}模块必须提供id`);
        if (entries.has(definition.id)) throw new Error(`${kind}模块重复注册：${definition.id}`);
        entries.set(definition.id, Object.freeze({ ...definition }));
        return entries.get(definition.id);
      },
      get(id) {
        return entries.get(id) || null;
      },
      require(id) {
        const entry = entries.get(id);
        if (!entry) throw new Error(`未注册${kind}模块：${id}`);
        return entry;
      },
      list() {
        return [...entries.values()];
      }
    });
  }

  WIS.Core.Registries = Object.freeze({
    powerSystems: createRegistry("战力体系"),
    cultivationSystems: createRegistry("修行体系"),
    getActivePower(state) {
      const id = state.powerSystem?.active;
      return id ? this.powerSystems.require(id) : null;
    },
    getActiveCultivation(state) {
      const id = state.cultivation?.active;
      return id ? this.cultivationSystems.require(id) : null;
    }
  });
}(window.WIS));
