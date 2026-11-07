'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{setupFuture,root}=require('./rank-schema-fixture.cjs');
function setupAmount({model=74}={}){const result=setupFuture();for(const name of ['amount-products','amount-ledger','amount','amount-formulas','../cultivation/martial-amount','amount-migration']){const file='js/core/'+name+'.js';if(fs.existsSync(path.join(root,file))&&!result.W.Core[{'amount-products':'AmountProducts','amount-ledger':'AmountLedger','amount':'Amount','amount-formulas':'AmountFormulas','amount-migration':'AmountMigration','../cultivation/martial-amount':'unused'}[name]]&&(name!=='../cultivation/martial-amount'||!result.W.Cultivation.MartialAmount))vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),result.context,{filename:file});}if(model!==74)result.W.Core.Config=Object.freeze({...result.W.Core.Config,saveVersion:model});return result;}
function setup75(options={}){
 const worker={window:{WIS:{Simulation:{}}}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/simulation/offline-worker-bundle.js'),'utf8'),worker);
 const scripts=worker.window.WIS.Simulation.OfflineWorkerBundle.scripts.slice(),insert=(before,files)=>{scripts.splice(scripts.indexOf(before),0,...files.filter(f=>!scripts.includes(f)));};
 insert('js/meta/treasure-rules.js',['amount-products','amount-ledger','amount','amount-formulas'].map(n=>'js/core/'+n+'.js'));
 insert('js/cultivation/martial.js',['js/cultivation/martial-amount.js']);
 if(fs.existsSync(path.join(root,'js/core/amount-migration.js')))insert('js/core/state.js',['js/core/amount-migration.js']);
 return setupFuture({scripts,targetSchema:75,...options});
}
module.exports={setupAmount,setup75,root};
