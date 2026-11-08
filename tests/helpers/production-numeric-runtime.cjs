'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
function loadProductionNumericRuntime({performanceObject=performance}={}){
 const metadata={window:{WIS:{Simulation:{}}}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/simulation/offline-worker-bundle.js'),'utf8'),metadata);const bundle=metadata.window.WIS.Simulation.OfflineWorkerBundle,storage=new Map(),context={console,performance:performanceObject,setTimeout,clearTimeout,setInterval:(...a)=>setInterval(...a).unref(),clearInterval,postMessage(){},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)}};context.self=context;vm.createContext(context);vm.runInContext('self.window=self;self.document={hidden:false}',context);vm.runInContext(bundle.source,context,{filename:'production-worker.js'});const W=context.WIS;assert.equal(W.Core.Config.saveVersion,76,'actual production schema');assert.equal(W.Core.Amount?.enabled(),true,'actual production Amount assembly');assert(W.Core.AmountMigration);return {W,context,bundle,root};
}
module.exports={loadProductionNumericRuntime,root};
