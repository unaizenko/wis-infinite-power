'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.AUDIT_GAME_ROOT||(fs.existsSync(path.join(__dirname,'../work/index.html'))?path.join(__dirname,'../work'):path.resolve(__dirname,'../..'));
const resultsDir=process.env.FIXED_RESULTS||(fs.existsSync(path.join(__dirname,'../work/index.html'))?path.join(__dirname,'../results'):path.join(__dirname,'results'));
fs.mkdirSync(resultsDir,{recursive:true});
process.env.WIS_BENCH_ROOT=root;
const evaluate=vm.runInThisContext;let loaded=false,bundled=false;
vm.runInThisContext=function(source,options){
 if(process.env.WIS_TEST_PRODUCTION_ASSEMBLY === "1")return evaluate(source,options);
 const f=options?.filename?.replaceAll('\\','/')||'';
 if(f.endsWith('/core/config.js'))for(const file of ['js/meta/infinity-config.js','js/meta/infinity.js','js/cultivation/martial-config.js'])evaluate(fs.readFileSync(path.join(root,file),'utf8'),{filename:path.join(root,file)});
 if(f.endsWith('/core/config.js')&&fs.existsSync(path.join(root,'js/meta/treasure-rules.js')))evaluate(fs.readFileSync(path.join(root,'js/meta/treasure-rules.js'),'utf8'),{filename:path.join(root,'js/meta/treasure-rules.js')});
 if(!loaded&&f.endsWith('/core/state.js')){loaded=true;for(const file of ['js/core/finite-progress.js','js/core/signed-ledger.js',...require('../rank-schema-fixture.cjs').extras])evaluate(fs.readFileSync(path.join(root,file),'utf8'),{filename:path.join(root,file)});for(const file of ['js/meta/big-numbers.js','js/cultivation/xiuzhen.js','js/cultivation/martial.js',...(fs.existsSync(path.join(root,'js/meta/high-multiverse.js'))?['js/meta/high-multiverse.js']:[])])evaluate(fs.readFileSync(path.join(root,file),'utf8'),{filename:path.join(root,file)});}
 if(f.endsWith('/meta/treasures.js'))for(const file of ['js/core/finite-progress.js','js/core/signed-ledger.js','js/meta/treasure-ledger.js'])if(fs.existsSync(path.join(root,file)))evaluate(fs.readFileSync(path.join(root,file),'utf8'),{filename:path.join(root,file)});
 if(!bundled&&f.endsWith('/meta/treasures.js')){bundled=true;evaluate(fs.readFileSync(path.join(root,'js/simulation/fast-forward.js'),'utf8'));}
 if(f.endsWith('/simulation/step.js'))for(const file of ['js/simulation/profiler.js','js/simulation/resource-groups.js','js/simulation/fixed-sources.js','js/simulation/predictor-groups.js','js/simulation/strong-feedback-checkpoint.js','js/simulation/legacy-settlement-checkpoints.js','js/simulation/checkpoint-strategy.js','js/simulation/fixed-segment.js'])evaluate(fs.readFileSync(path.join(root,file),'utf8'),{filename:path.join(root,file)});
 if(f.endsWith("/meta/achievements.js"))evaluate(fs.readFileSync(path.join(root,"js/cultivation/martial-system.js"),"utf8"),{filename:path.join(root,"js/cultivation/martial-system.js")});
 const result=evaluate(source,options);
 if(f.endsWith('/core/bignum.js'))evaluate(fs.readFileSync(path.join(root,'js/core/stable-product-quotient.js'),'utf8'));

 if(f.endsWith('/core/resources.js')&&fs.existsSync(path.join(root,'js/cultivation/resources.js')))evaluate(fs.readFileSync(path.join(root,'js/cultivation/resources.js'),'utf8'),{filename:path.join(root,'js/cultivation/resources.js')});
 if(f.endsWith('/core/resources.js')&&fs.existsSync(path.join(root,'js/meta/big-number-resources.js')))evaluate(fs.readFileSync(path.join(root,'js/meta/big-number-resources.js'),'utf8'),{filename:path.join(root,'js/meta/big-number-resources.js')});
 return result;
};
const h=require('./harness.cjs');
vm.runInThisContext=evaluate;
for (const file of ["js/core/save.js", "js/simulation/loop.js"]) evaluate(fs.readFileSync(path.join(root,file),"utf8"),{filename:path.join(root,file)});
if(fs.existsSync(path.join(root,'js/ui/format.js')))evaluate(fs.readFileSync(path.join(root,'js/ui/format.js'),'utf8'),{filename:path.join(root,'js/ui/format.js')});
module.exports={h,WIS,fs,vm,root,resultsDir};
