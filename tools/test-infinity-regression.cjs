'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/infinity-v1-evidence/regression');fs.mkdirSync(out,{recursive:true});
const names=['infinity-state','infinity-reset','infinity-effects','infinity-challenges','infinity-lifecycle','infinity-execution','infinity-time-sampling','infinity-high-value','infinity-browser',
'tree-v1','tree-v1-resource','tree-refinement','tree-v1-integration','tree-v1-browser','big-number-second-sampling','graham-xiuzhen-challenge',
'evaluation-frame-reuse','highest-power-evaluation','foreground-live-state','resource-contract','finite-economy','signed-ledger-recovery',
'compiled-recovery','compiled-continuous','offline-segment-end','persistent-predictor','fixed-snapshot-macro','scale-kernel','coupled-resource-kernel','exported-recovery-resume','budget-continuation',
'source-display','source-process','resource-group-map','ui-state-boundary','offline-step-policy','import-recovery-lifecycle'];
const results=[];let index=0;
async function run(name){const file=path.join(root,'tests',name+'.test.cjs');if(!fs.existsSync(file)){results.push({name,status:'missing'});return;}
 await new Promise(resolve=>{const start=Date.now(),child=spawn(process.execPath,[file],{cwd:root,windowsHide:true,env:{...process.env,FIXED_RESULTS:path.join(out,name),WIS_PLAYWRIGHT:'C:/Users/a9745/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'}});let text='',timedOut=false;
 child.stdout.on('data',d=>text+=d);child.stderr.on('data',d=>text+=d);const timer=setTimeout(()=>{timedOut=true;child.kill();},45000);
 child.on('exit',code=>{clearTimeout(timer);fs.writeFileSync(path.join(out,name+'.log'),text);const r={name,status:timedOut?'timeout':code===0?'pass':'fail',code,ms:Date.now()-start};results.push(r);console.log(JSON.stringify(r));resolve();});});}
Promise.all(Array.from({length:3},async()=>{while(index<names.length)await run(names[index++]);})).then(()=>{fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(results,null,2));console.log('SUMMARY',JSON.stringify(results.reduce((n,r)=>(n[r.status]=(n[r.status]||0)+1,n),{})));if(results.some(r=>r.status!=='pass'))process.exitCode=1;});
