'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),manifest=require('../tests/current-regression.json');
const {verifyFixtures}=require('../tests/helpers/current-fixtures.cjs');
const args=process.argv.slice(2),phaseIndex=args.indexOf('--phase'),phase=phaseIndex<0?'all':args[phaseIndex+1];
if(!['all','core','browser','performance','native'].includes(phase))throw Error('Use --phase core|browser|performance|native, or omit for all');
const files=[...manifest.assembly,...manifest.node,...manifest.scripts,...manifest.browserNode,...manifest.browser,...manifest.performance,...manifest.native];
for(const file of files){if(!fs.statSync(path.join(root,file)).isFile())throw Error('Missing required regression: '+file);}
const fixtures=verifyFixtures();
if(args.includes('--list')){console.log(JSON.stringify({phase,fixtures,manifest},null,2));process.exit(0);}
const out=path.resolve(process.env.WIS_REGRESSION_RESULTS||path.join(root,'../WIS-项目资源/current-regression-results'));
fs.mkdirSync(out,{recursive:true});const temp=path.join(out,'tmp');fs.mkdirSync(temp,{recursive:true});
const env={...process.env,WIS_GAME_ROOT:root,AUDIT_GAME_ROOT:root,TEMP:temp,TMP:temp,FIXED_RESULTS:out,WIS_TEST_RESULTS:out,WIS_FROZEN_TREASURE_RESULTS:out,WIS_CLOSED_RESULTS:out,WIS_STABILITY_RESULTS:out,WIS_NATIVE_TEST_OUT:path.join(out,'native'),WIS_PREVIEW_REPORT:path.join(out,'live-preview.json')};
delete env.WIS_PREVIEW_CASE;delete env.WIS_PREVIEW_SAVE;delete env.WIS_PREVIEW_SCREENSHOT;
const results=[];let failed=false;
function run(label,argv,timeout=180000,strictNode=false){
 const started=performance.now(),child=cp.spawnSync(process.execPath,argv,{cwd:root,env,windowsHide:true,encoding:'utf8',timeout,maxBuffer:32*1024*1024});
 const output=(child.stdout||'')+(child.stderr||''),log=label.replace(/[^a-zA-Z0-9_-]/g,'_')+'.log';fs.writeFileSync(path.join(out,log),output);
 const total=Number(output.match(/^# tests (\d+)$/m)?.[1]||0),passed=Number(output.match(/^# pass (\d+)$/m)?.[1]||0),skipped=Number(output.match(/^# skipped (\d+)$/m)?.[1]||0);
 const ok=child.status===0&&!child.error&&(!strictNode||(total>0&&passed===total&&skipped===0));
 const row={label,ok,exitCode:child.status,error:child.error?.message,ms:Math.round(performance.now()-started),log,...(strictNode?{total,passed,skipped}:{} )};
 results.push(row);if(!ok)failed=true;console.log(JSON.stringify(row));
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({phase,complete:false,fixtures:fixtures.map(({path,...row})=>row),results},null,2));
}
for(const file of manifest.assembly)run(path.basename(file),[file,'--check']);
if(phase==='all'||phase==='core'){
 run('node-current',['--test','--test-concurrency=2','--test-timeout=60000','--test-reporter=tap',...manifest.node],300000,true);
 for(const file of manifest.scripts)run(path.basename(file),[file]);
}
if(phase==='all'||phase==='browser')for(const file of manifest.browserNode)run(path.basename(file),['--test','--test-reporter=tap',file],240000,true);
for(const group of ['browser','performance','native'])if(phase==='all'||phase===group)for(const file of manifest[group])run(path.basename(file),[file],file.endsWith('refactor-performance-browser.test.cjs')?900000:(group==='performance'?180000:240000));
const summary={phase,complete:true,passed:!failed,fixtures:fixtures.map(({path,...row})=>row),results};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({passed:!failed,groups:results.length,summary:path.join(out,'summary.json')}));process.exitCode=failed?1:0;
