(function registerMartialSystem(WIS) {
  "use strict";
  const M=WIS.Cultivation.Martial, B=WIS.Core.BigNum;
  const dependencies=["martialQi","martialBody","martialHeart","joules","power"];
  const sourceMemoKey=Symbol("martial sources");
  function sourceValues(state) {
    const memo=WIS.Core.Effects.scopeMemo(state);
    if(memo?.has(sourceMemoKey))return memo.get(sourceMemoKey);
    const values=M.sources(state);memo?.set(sourceMemoKey,values);return values;
  }
  function sources(state) {
    if (!M.active(state)) return [];
    const values=sourceValues(state);
    const rows=[
      {id:"martialQiJ",name:"气",target:"joules",key:"joules",dynamicResources:["martialQi","joules"]},
      {id:"martialBodyPower",name:"体",target:"power",key:"power",dynamicResources:["martialBody"]},
      {id:"martialQiPower",name:"乾坤",target:"power",key:"qiPower",dynamicResources:["martialQi","joules"]}
    ];
    return rows.map(({key,...row})=>({...row,group:"武道",value:values[key],valueAt:current=>sourceValues(current)[key],dynamicResources:dependencies,sourceKind:"normal",dynamic:true}));
  }
  function effects(state) {
    if (!M.active(state)) return [];
    return M.effects(state).map(row=>({...row,value:typeof row.valueAt === "function" ? row.valueAt : row.value,dynamic:true,dynamicResources:dependencies}));
  }
  // Martial raw sources depend on current balances and purchased levels only;
  // they never read highestPower or a collection-specific context.
  WIS.Core.Sources.register("martial",sources,{highestPowerIndependent:true,descriptorContextIndependent:true});
  WIS.Core.Effects.register("martial",effects,{highestPowerEffects:[]});
  function install(state,martial) {
    WIS.Core.Runtime.assertMutable();
    state.cultivation={...state.cultivation,systems:{...state.cultivation.systems,martial}};
    WIS.Core.Effects.invalidate();
  }
  for (const shortName of ["qi","body","heart","soul"]) {
    const entry=s=>M.get(s).resources[shortName];
    WIS.Core.Registries.resources.register({id:`cultivation.martial.${shortName}`,kind:"cultivation",owner:"martial",shortName,snapshot:false,
      get:s=>entry(s).amount,
      set(s,value) { WIS.Core.Runtime.assertMutable();const v=B.parseFinite(value);if(!v||B.lt(v,0))throw Error("武道资源非法"); const m=M.normalize(M.get(s)),e=m.resources[shortName];e.amount=v;e.peak=B.max(e.peak,v);install(s,m);return v; },
      add(s,delta,terms) {
        WIS.Core.Runtime.assertMutable();
        if (!terms && !B.parseFinite(delta)) throw Error("武道新增资源非法");
        if (!terms && B.eq(delta,0)) return entry(s).amount;
        const m=M.normalize(M.get(s)),e=m.resources[shortName];
        const next=WIS.Core.Resources.prepareTerms({amount:e.amount},"amount",terms||[delta]).amount;
        const total=B.sub(next,e.amount);
        e.amount=next;e.total=B.add(e.total,B.max(0,total));e.spent=B.add(e.spent,B.max(0,B.mul(total,-1)));e.peak=B.max(e.peak,next);install(s,m);return next;
      }
    });
  }
  WIS.Cultivation.MartialSystem=WIS.Core.Registries.cultivationSystems.register({
    id:"martial",name:"武道",resource:"qi",realms:[],realmLevel:()=>0,realmName:()=>"武道",
    getState:M.get,getResources:state=>Object.fromEntries(["qi","body","heart","soul"].map(key=>[key,M.amount(state,key)])),
    getActions:()=>["qi","body","heart","soul"],getAbilities:()=>WIS.Cultivation.MartialConfig.abilities.map(a=>a.key),getEffects:effects,
    planAutomaticGain:()=>({}),commitAutomaticGain:()=>({mana:B.ZERO,immortalPower:B.ZERO}),
    getManaPerSecond:()=>B.ZERO,performAction:(id,...args)=>M.convert(WIS.Core.Runtime.getState(),id,...args),
    buyAbility:id=>M.buy(WIS.Core.Runtime.getState(),id),autoUpgrade:()=>0,autoBreakthrough:()=>0,
    update:()=>false,reset:type=>WIS.Core.Reset.describe(type),resetTransient:()=>{},
    snapshotTreasureTransient:()=>({}),restoreTreasureTransient:()=>{}
  });
}(window.WIS));
