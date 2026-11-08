'use strict';
// Execute the actual bootstrap callbacks with an isolated host. Keeping a
// handwritten copy here previously let the import transaction contract drift.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=function(root,bindings){
 const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
 const names=['restoreOfflineRecovery','prepareImportRecovery','captureImportStateSnapshot',
  'restoreImportStateSnapshot','beginImportTransaction','commitImportTransaction','rollbackImportTransaction'];
 const declarations=names.map(name=>{
  const start=source.indexOf('  function '+name+'(');
  if(start<0)throw Error('Missing production callback: '+name);
  const end=source.indexOf('\n  }',start);
  return source.slice(start,end+4);
 }).join('\n');
 return vm.runInNewContext(declarations+'\n({'+names.join(',')+'})',bindings);
};
