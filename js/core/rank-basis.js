(function (WIS) {
  "use strict";
  // Schema74 precision context. Migration uses the represented schema73
  // unit, never a reconstructed
  // exact huge exponential. A current target is distinct from that fixed unit.
  const B = WIS.Core.BigNum, R = WIS.Core.Rank;
  const fail = message => { throw Object.assign(new Error(message), { code: "rank-basis-invalid" }); };
  const own = (v, k) => Object.prototype.hasOwnProperty.call(v, k);
  function shape(value, fields, optional=[]) {
    if (!value || typeof value !== "object" || Array.isArray(value) || B.isDecimal(value) ||
        fields.some(k => !own(value, k)) || Object.keys(value).some(k => !fields.includes(k)&&!optional.includes(k))) fail("阶位精度上下文字段无效");
  }
  const target = rank => R.compare(rank, 3) < 0 ? 3 : R.add(rank, 1);
  function projectedRequirement(origin) {
    return WIS.Meta.BigNumbers.treeSuperRequirement({}, WIS.Meta.BigNumbers.legacyTargetRank(origin));
  }
  function legacyOrigin(value){
    const rank=R.read(value);
    if(typeof rank==="object")fail("旧规则起点不能携带未保存的阶位精度");
    let previous;
    try{previous=WIS.Meta.BigNumbers.legacyRankInput(rank);}catch(error){
      if(typeof rank!=="string"||B.parseFinite(rank))throw error;
      previous=String(R.project(rank));
    }
    if(R.compare(rank,R.read(previous))!==0)fail("旧规则起点不能携带未保存的阶位精度");
    return rank;
  }
  function create(n) {
    const g = legacyOrigin(n.gIndex), tree = legacyOrigin(n.tree.rank);
    // This factory creates a legacy projection basis only. An exact residual
    // rank cannot silently acquire a new anchor through missing metadata.
    if (typeof g === "object" || typeof tree === "object") fail("精确阶位缺少原精度上下文");
    return { version: 1,
      g: { version: 1, rule: "schema73", originRank: R.serialize(g) },
      tree: { version: 1, rule: "schema73", originRank: R.serialize(tree),
        targetRank: R.serialize(target(tree)), projectedTargetRequirement: String(projectedRequirement(tree)), projection:WIS.Core.RankProjection.read(tree,String(projectedRequirement(tree))) } };
  }
  function read(raw, n) {
    shape(raw, ["version", "g", "tree"]);
    shape(raw.g, ["version", "rule", "originRank"]);
    shape(raw.tree, ["version", "rule", "originRank", "targetRank", "projectedTargetRequirement"],["projection"]);
    if (raw.version !== 1 || raw.g.version !== 1 || raw.tree.version !== 1 ||
        raw.g.rule !== "schema73" || raw.tree.rule !== "schema73") fail("阶位精度上下文版本无效");
    const g = R.read(n.gIndex ?? 0), tree = R.read(n.tree?.rank ?? 0),
      originG = legacyOrigin(raw.g.originRank), originTree = legacyOrigin(raw.tree.originRank), next = R.read(raw.tree.targetRank);
    if(typeof originG==="object"||typeof originTree==="object")fail("旧规则起点不能携带新阶位残余项");
    if (R.compare(originG, g) > 0 || R.compare(originTree, tree) > 0 ||
        R.compare(originTree, 0) > 0 && R.compare(originTree, 3) < 0 || R.compare(next, target(tree)) !== 0) fail("阶位精度上下文目标或起点错配");
    const projection=WIS.Core.RankProjection.read(originTree,raw.tree.projectedTargetRequirement,raw.tree.projection);
    return { version: 1,
      g: { version: 1, rule: "schema73", originRank: R.serialize(originG) },
      tree: { version: 1, rule: "schema73", originRank: R.serialize(originTree), targetRank: R.serialize(next),
        projectedTargetRequirement: raw.tree.projectedTargetRequirement, projection } };
  }
  function assertSerialized(data,schema,expanded=false){const S=WIS.Core.State,steps=()=>serializedSteps(data,schema,expanded);
    if(S?.isSealedLoadInput(data))return S.normalizationTask('rank-basis-validation',[data,schema,expanded],steps);
    const iterator=steps();let next=iterator.next();while(!next.done)next=iterator.next(typeof next.value==='function'?next.value():undefined);return next.value;
  }
  function* serializedSteps(data, schema, expanded) {
    const n = data?.meta?.bigNumbers ?? data?.bigNumbers;
    if (schema < 74) {
      if (n && (own(n, "rankBasis") || n.gIndex?.kind === "wis-rank" || n.tree?.rank?.kind === "wis-rank" || own(n,"gBudget") || own(n.tree||{},"rankBudget") || own(n.tree||{},"elapsedBudget"))) fail("旧版本存档不能携带新阶位上下文");
      return;
    }
    if (!n || !own(n, "rankBasis")) fail("新阶位存档缺少精度上下文");
    if((expanded||own(n,"gCapacityModel"))&&n.gCapacityModel!==1)fail("新阶位存档不能再次迁移旧G容量");
    if(own(n,"gIndex"))R.read(n.gIndex);
    if(own(n,"tree")&&(!n.tree||typeof n.tree!=="object"||Array.isArray(n.tree)||B.isDecimal(n.tree)))fail("新阶位TREE容器无效");
    if(n.tree&&own(n.tree,"rank"))R.read(n.tree.rank);
    yield ()=>read(n.rankBasis, n);
    if(own(n,'gBudget')||own(n.tree||{},'rankBudget')||own(n.tree||{},'elapsedBudget')){
      const logical={...n,gIndex:n.gIndex??0,superProgress:n.superProgress??0,superResidual:n.superResidual??[],tree:{...n.tree,rank:n.tree?.rank??0,phase:n.tree?.phase??'explicit',superProgress:n.tree?.superProgress??0,superElapsedSeconds:own(n.tree||{},'superElapsedSeconds')?n.tree.superElapsedSeconds:0}};
      yield ()=>WIS.Meta.RankSettlement.validate(logical);
    }
  }
  function upgradeLegacy(state,data) {
    const M=WIS.Meta.BigNumbers,n=state.meta.bigNumbers,raw=data?.meta?.bigNumbers??data?.bigNumbers??{};
    // All old normalization/capacity arithmetic finishes with its original
    // Number/Decimal types first. Exact rank formatting is a separate final step.
    const unit=M.withLegacyRanks(()=>String(M.treeSuperRequirement(state,M.targetTreeRank(state))));
    const g=n.fractalLevel===5?R.read(M.legacyRankInput(raw.gIndex??1)):0;
    n.gIndex=n.fractalLevel===5&&R.compare(g,1)<0?1:g;
    n.tree.rank=R.read(M.legacyRankInput(raw.tree?.rank??0));
    const basis=create(n);
    if(!B.eq(basis.tree.projectedTargetRequirement,unit))fail("旧档原工作单位不能被新表示改写");
    basis.tree.projectedTargetRequirement=unit;n.rankBasis=basis;
    return state;
  }
  WIS.Core.RankBasis = Object.freeze({ create, read, assertSerialized, upgradeLegacy, target });
}(window.WIS));
