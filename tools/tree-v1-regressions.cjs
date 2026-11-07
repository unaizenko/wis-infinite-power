'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/tree-v1-evidence/regressions');fs.mkdirSync(out,{recursive:true});
const selected=['tree-v1','tree-v1-resource','tree-v1-integration','tree-v1-browser','big-number-second-sampling','graham-xiuzhen-challenge','finite-economy','resource-contract','batch-a-interfaces','batch-b-structure','foreground-live-state','highest-power-evaluation','evaluation-frame-reuse','continuous-clock','online-segments','offline-segment-end','compiled-continuous','compiled-recovery','persistent-predictor','fixed-snapshot-macro','ui-state-boundary','ui-render-performance','unified-large-exponent-display','googol-high-scale','signed-ledger-recovery'];
const results=[];
for(const name of selected){const start=performance.now(),r=cp.spawnSync(process.execPath,['tests/'+name+'.test.cjs'],{cwd:root,encoding:'utf8',timeout:90000,env:{...process.env,AUDIT_GAME_ROOT:root,WIS_BENCH_ROOT:root}});const item={name,code:r.status,error:r.error?.message,wallMs:performance.now()-start};results.push(item);fs.writeFileSync(path.join(out,name+'.log'),(r.stdout||'')+(r.stderr||''));console.log(JSON.stringify(item));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
if(results.some(r=>r.code!==0))process.exitCode=1;
