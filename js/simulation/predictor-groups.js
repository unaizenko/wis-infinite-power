(function(W){
  'use strict';
  const groups=[];
  function register(group,{replace=false}={}){
    if(!group.id||!Array.isArray(group.outputs)||!group.outputs.length||new Set(group.outputs).size!==group.outputs.length)throw Error('PredictorGroup 定义无效');
    if(group.outputs.some(k=>!W.Simulation.ResourceGroups.keys.includes(k)))throw Error('预测输出尚未注册为连续资源');
    if(groups.some(g=>g.id===group.id))throw Error('预测组 id 重复');
    const overlap=groups.filter(g=>g.outputs.some(k=>group.outputs.includes(k)));
    if(overlap.length&&!replace)throw Error('预测输出重复');
    if(replace)for(const g of overlap){g.outputs=g.outputs.filter(k=>!group.outputs.includes(k));if(!g.outputs.length)groups.splice(groups.indexOf(g),1);}
    groups.push({...group,outputs:[...group.outputs]});
  }
  function all(){
    for(const resource of W.Simulation.ResourceGroups.groups){const outputs=resource.outputs.filter(k=>!groups.some(g=>g.outputs.includes(k)));
      if(outputs.length)register({id:'default:'+resource.id,outputs});}
    return groups.map(g=>Object.freeze({...g,outputs:Object.freeze([...g.outputs])}));
  }
  W.Simulation.PredictorGroups=Object.freeze({register,all});
})(window.WIS);
