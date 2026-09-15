(function(W){
  'use strict';
  // Development-only graph query. No SCC work occurs in production ticks.
  const G=()=>W.Simulation.ResourceGroups;
  const targets=Object.freeze({fitness:['joules','power'],fitnessLevelCap:['joules','power'],rock:['power'],rockLevelCap:['power'],training:['power'],focus:['power'],ghostBrain:['power'],killingIntent:['joules'],elementalization:['joules'],ultimateIntent:['power'],magicTreasure:['power'],brahmaDemonArt:['power'],manaJ:['joules'],spiritDomain:['joules'],breathing:['mana'],breathingJCurve:['mana'],circulation:['mana'],exploration:['mana'],explorationAmount:['mana'],googolPenalty:['joules','power','mana','immortalPower']});
  function scc(nodes,edges){
    const neighbors=new Map(nodes.map(n=>[n,edges.filter(e=>e.from===n).map(e=>e.to)])),indices=new Map(),low=new Map(),stack=[],on=new Set(),out=[];let next=0;
    function visit(v){indices.set(v,next);low.set(v,next++);stack.push(v);on.add(v);
      for(const w of neighbors.get(v)||[]){if(!indices.has(w)){visit(w);low.set(v,Math.min(low.get(v),low.get(w)));}else if(on.has(w))low.set(v,Math.min(low.get(v),indices.get(w)));}
      if(low.get(v)===indices.get(v)){const component=[];let w;do{w=stack.pop();on.delete(w);component.push(w);}while(w!==v);out.push(component.sort());}
    }for(const n of nodes)if(!indices.has(n))visit(n);return out;
  }
  function build(snapshot,previous=null){
    const groups=G().groups,nodes=[...G().keys],owners=Object.fromEntries(groups.flatMap(g=>g.outputs.map(k=>[k,g.id]))),found=new Map(),unmapped=[];
    const edge=(from,to,via)=>{if(!nodes.includes(from)||!nodes.includes(to))throw Error('未注册依赖 '+from+' -> '+to);const key=from+'->'+to;if(!found.has(key))found.set(key,{from,to,via:[]});found.get(key).via.push(via);};
    for(const g of groups)for(const output of g.outputs)for(const input of g.outputDependencies?.[output]||g.dynamicResources)edge(input,output,'group:'+g.id);
    const descriptors=W.Core.Runtime.withState(snapshot,()=>W.Core.Effects.withFrozenState(snapshot,()=>[
      ...W.Core.Effects.describe(snapshot).map(v=>({...v,kind:'effect'})),
      ...nodes.flatMap(k=>W.Core.Sources.collect(k,snapshot).map(v=>({...v,kind:'source'}))),
      ...W.Power.ScaleLogic.continuousSourceDescriptors().concat(W.Cultivation.ImmortalLogic.continuousSourceDescriptors()).map(v=>({...v,kind:'source'}))
    ]));
    for(const row of descriptors){const outputs=nodes.includes(row.target)?[row.target]:targets[row.target];
      if(!outputs){if(row.dynamicResources.length)unmapped.push({kind:row.kind,id:row.id,target:row.target,dynamicResources:row.dynamicResources});continue;}
      for(const input of row.dynamicResources)for(const output of outputs)edge(input,output,row.kind+':'+row.id);
    }
    const resourceEdges=[...found.values()].sort((a,b)=>(a.from+a.to).localeCompare(b.from+b.to)),groupMap=new Map();
    for(const e of resourceEdges){const from=owners[e.from],to=owners[e.to];groupMap.set(from+'->'+to,{from,to});}
    const groupEdges=[...groupMap.values()],old=new Set((previous?.resourceEdges||[]).map(e=>e.from+'->'+e.to)),now=new Set(resourceEdges.map(e=>e.from+'->'+e.to));
    return {version:1,kind:'conservative-potential-dependencies',note:'SCC declares possible branches, not mandatory runtime coupling; use synchronized/frozen experiments to select active sets.',resources:nodes,resourceEdges,groupEdges,resourceSCC:scc(nodes,resourceEdges),groupSCC:scc(groups.map(g=>g.id),groupEdges),added:[...now].filter(k=>!old.has(k)),removed:[...old].filter(k=>!now.has(k)),unmappedProgressTargets:unmapped,descriptors:descriptors.map(({provider,id,target,dynamicResources,kind,operationType,valueAt})=>({provider,id,target,dynamicResources,kind,operationType,valueAtType:typeof valueAt}))};
  }
  W.Simulation.ResourceDependencies=Object.freeze({build,scc,targets});
})(window.WIS);
