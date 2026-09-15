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

  function createResourceRegistry() {
    const registry = createRegistry("资源"), owners = new Map();
    return Object.freeze({
      ...registry,
      register(definition) {
        const { id, owner, shortName, kind, get, set, add, snapshot } = definition || {};
        if (typeof id !== "string" || !id || typeof owner !== "string" || !owner ||
            typeof shortName !== "string" || !shortName || !["core", "cultivation"].includes(kind) ||
            [get, set, add].some(fn => typeof fn !== "function") || typeof snapshot !== "boolean")
          throw Error("资源定义无效");
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(owner) || !/^[A-Za-z][A-Za-z0-9]*$/.test(shortName) ||
            kind === "core" && owner !== "core" || id !== `${kind === "core" ? "core" : `cultivation.${owner}`}.${shortName}`)
          throw Error("资源逻辑 ID 与所有者不一致");
        let byKind = owners.get(kind), byOwner = byKind?.get(owner);
        if (byOwner?.has(shortName)) throw Error(`资源短名重复：${kind}.${owner}.${shortName}`);
        for (const hook of ["specialCanAfford", "specialSpend"])
          if (definition[hook] !== undefined && typeof definition[hook] !== "function") throw Error("资源支付适配无效");
        if (!!definition.specialCanAfford !== !!definition.specialSpend) throw Error("资源支付适配必须成对提供");
        const entry = registry.register(definition);
        if (!byKind) owners.set(kind, byKind = new Map());
        if (!byOwner) byKind.set(owner, byOwner = new Map());
        byOwner.set(shortName, entry);
        return entry;
      },
      // Pre-indexed at registration: no ID splitting or registry scan on access.
      getOwned(kind, owner, shortName) { return owners.get(kind)?.get(owner)?.get(shortName) || null; }
    });
  }

  WIS.Core.Registries = Object.freeze({
    resources: createResourceRegistry(),
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
