'use strict';
const path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),browser=process.argv.includes('--browser');
const files=['tools/update-script-manifest.cjs','tools/build-offline-worker.cjs',
 'tests/frozen-offline-contract.test.cjs','tests/frozen-offline-treasure.test.cjs','tests/frozen-offline-big-numbers.test.cjs','tests/frozen-offline-recovery.test.cjs','tests/frozen-offline-ordering.test.cjs',
 'tests/online-source-scope.test.cjs','tests/integration-cycle-budget.test.cjs','tests/deferred-action-owner.test.cjs','tests/worker-loop-render.test.cjs',
 'tests/scalar-googol-endpoint.test.cjs','tests/scalar-scale-budget.test.cjs','tests/scalar-manual-completion.test.cjs','tests/scalar-caller-certificates.test.cjs',
 'tests/exploration-cooperative-work.test.cjs','tests/exploration-cooperative-ui.test.cjs','tests/exploration-cooperative-preview.test.cjs',
 'tests/offline-worker.test.cjs','tests/offline-worker-engine.test.cjs','tests/offline-worker-owner.test.cjs',
 'tests/offline-fallback-budget.test.cjs','tests/offline-planner-budget.test.cjs',
 'tests/strong-feedback-checkpoint.test.cjs','tests/retired-strong-feedback.test.cjs','tests/retired-runtime-release.test.cjs'];
files.push('tests/save-shape-guards.test.cjs','tests/finite-progress-invalid-input.test.cjs','tests/stable-resource-ratios.test.cjs','tests/tree-promotion-retention.test.cjs','tests/breathing-small-preview.test.cjs','tests/retired-private-implementations.test.cjs','tests/legacy-settlement-readers.test.cjs','tests/retired-settlement-solvers.test.cjs');
if(browser)files.push('tests/legacy-checkpoint-browser.test.cjs','tests/breathing-startup-browser.test.cjs','tests/big-number-ranks-worker.test.cjs','tests/xiuzhen-fifth-ninth-worker.test.cjs','tests/settlement-safety-worker.test.cjs','tests/ui-state-boundary.test.cjs','tests/startup-guard-browser.test.cjs','tests/offline-worker-lifecycle-browser.test.cjs');
let failed=0;
for(const file of files){
 const args=[path.join(root,file),...(file.startsWith('tools/')?['--check']:[])];
 const result=cp.spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',timeout:file==='tests/offline-worker-browser.cjs'?600000:180000,
   env:{...process.env,AUDIT_GAME_ROOT:root,FIXED_RESULTS:process.env.FIXED_RESULTS||path.join(os.tmpdir(),'wis-settlement-engine-tests')}});
 if(result.error||result.status!==0){failed++;console.error('FAIL '+file+': '+(result.error?.message||'exit '+result.status));}
}
console.log(JSON.stringify({suites:files.length,passed:files.length-failed,failed,browser}));process.exitCode=failed?1:0;
