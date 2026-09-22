(function registerBigNumberResources(WIS) {
  "use strict";
  const B = WIS.Core.BigNum, R = WIS.Core.Resources;
  const tree = state => state.meta?.bigNumbers?.tree;
  const requireTree = state => {
    const value = tree(state);
    if (!value) throw Error("TREE 资源容器不存在");
    return value;
  };
  WIS.Core.Registries.resources.register({
    id: "meta.bigNumbers.construction", kind: "meta", owner: "bigNumbers", shortName: "construction",
    // Keep the established public core/cultivation snapshot shape. Save owns TREE.
    snapshot: false,
    get: state => tree(state)?.construction,
    set(state, value) { requireTree(state).construction = value; return value; },
    add(state, delta, terms) {
      const current = requireTree(state);
      if (!terms && !B.parseFinite(delta)) throw Error("树构造点新增值无效");
      if (!terms && B.eq(delta, 0)) return current.construction;
      const next = R.prepareTerms(current, "construction", terms || [delta]);
      current.construction = next.construction;
      return next.construction;
    }
  });
}(window.WIS));
