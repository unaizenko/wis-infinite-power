#!/usr/bin/env node
'use strict';
// index.html owns script membership/order; build-config.js owns build identity.
// script-manifest.json is generated output, never a second editable input.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),htmlPath=path.join(root,'index.html'),manifestPath=path.join(root,'js/script-manifest.json');
const dependencies={
 "js/core/namespace.js": [
  "js/core/build-config.js",
  "js/vendor/break_eternity.min.js"
 ],
 "js/core/bignum.js": [
  "js/core/namespace.js"
 ],
 "js/core/stable-product-quotient.js": [
  "js/core/bignum.js"
 ],
 "js/core/finite-progress.js": [
  "js/core/bignum.js"
 ],
 "js/core/signed-ledger.js": [
  "js/core/bignum.js"
 ],
 "js/meta/treasure-rules.js": [
  "js/core/bignum.js"
 ],
 "js/core/config.js": [
  "js/meta/treasure-rules.js"
 ],
 "js/meta/big-numbers.js": [
  "js/core/config.js",
  "js/core/stable-product-quotient.js"
 ],
 "js/core/registry.js": [
  "js/core/config.js"
 ],
 "js/core/formulas.js": [
  "js/core/bignum.js"
 ],
 "js/core/runtime.js": [
  "js/core/namespace.js"
 ],
 "js/meta/high-multiverse.js": [
  "js/cultivation/xiuzhen.js",
  "js/core/registry.js"
 ],
 "js/core/state.js": [
  "js/meta/high-multiverse.js",
  "js/core/runtime.js",
  "js/meta/big-numbers.js",
  "js/cultivation/xiuzhen.js",
  "js/simulation/compensation.js"
 ],
 "js/core/save.js": [
  "js/core/state.js"
 ],
 "js/core/resources.js": [
  "js/core/state.js",
  "js/core/signed-ledger.js",
  "js/core/registry.js"
 ],
 "js/cultivation/resources.js": [
  "js/core/resources.js",
  "js/cultivation/xiuzhen.js"
 ],
 "js/meta/big-number-resources.js": [
  "js/core/resources.js",
  "js/meta/big-numbers.js"
 ],
 "js/core/effects.js": [
  "js/core/formulas.js",
  "js/core/runtime.js"
 ],
 "js/core/sources.js": [
  "js/core/effects.js"
 ],
 "js/core/reset.js": [
  "js/core/state.js"
 ],
 "js/power/scale-logic.js": [
  "js/core/resources.js",
  "js/core/effects.js",
  "js/core/sources.js",
  "js/core/penalties.js",
  "js/core/integration.js"
 ],
 "js/power/scale.js": [
  "js/power/scale-logic.js",
  "js/core/registry.js"
 ],
 "js/cultivation/immortal-logic.js": [
  "js/power/scale.js",
  "js/core/probability.js"
 ],
 "js/cultivation/immortal.js": [
  "js/cultivation/immortal-logic.js"
 ],
 "js/meta/achievements.js": [
  "js/cultivation/immortal.js"
 ],
 "js/simulation/fast-forward.js": [],
 "js/meta/treasure-ledger.js": [
  "js/core/signed-ledger.js"
 ],
 "js/meta/treasures.js": [
  "js/core/finite-progress.js",
  "js/meta/treasure-ledger.js",
  "js/simulation/fast-forward.js"
 ],
 "js/cultivation/exploration-progress.js": [
  "js/meta/treasures.js"
 ],
 "js/meta/challenges.js": [
  "js/cultivation/exploration-progress.js"
 ],
 "js/simulation/automation.js": [
  "js/meta/challenges.js"
 ],
 "js/simulation/resource-groups.js": [],
 "js/simulation/fixed-sources.js": [],
 "js/simulation/predictor-groups.js": [
  "js/simulation/resource-groups.js"
 ],
 "js/simulation/legacy-settlement-checkpoints.js": [
  "js/core/state.js",
  "js/simulation/resource-groups.js",
  "js/simulation/predictor-groups.js"
 ],
 "js/simulation/checkpoint-strategy.js": [
  "js/simulation/legacy-settlement-checkpoints.js",
  "js/simulation/strong-feedback-checkpoint.js"
 ],
 "js/simulation/fixed-segment.js": [
  "js/simulation/checkpoint-strategy.js"
 ],
 "js/simulation/step.js": [
  "js/simulation/automation.js"
 ],
 "js/simulation/offline.js": [
  "js/simulation/step.js"
 ],
 "js/simulation/strong-feedback-checkpoint.js": [
  "js/core/bignum.js"
 ],
 "js/simulation/worker-protocol.js": [
  "js/simulation/offline.js"
 ],
 "js/simulation/worker-client.js": [
  "js/simulation/worker-protocol.js"
 ],
 "js/simulation/offline-worker-bundle.js": [
  "js/simulation/worker-client.js"
 ],
 "js/simulation/offline-worker.js": [
  "js/simulation/offline-worker-bundle.js"
 ],
 "js/simulation/loop.js": [
  "js/simulation/offline.js"
 ],
 "js/ui/source-preview.js": [
  "js/simulation/loop.js"
 ],
 "js/ui/format.js": [
  "js/core/bignum.js"
 ],
 "js/ui/cards.js": [
  "js/ui/format.js",
  "js/ui/source-preview.js"
 ],
 "js/ui/treasures.js": [
  "js/ui/format.js"
 ],
 "js/ui/dialog.js": [
  "js/core/namespace.js"
 ],
 "js/ui/app-distribution.js": ["js/core/namespace.js", "js/ui/dialog.js", "js/vendor/qrcode-generator.js"],
 "js/ui/native-platform.js": ["js/core/namespace.js"],
 "js/ui/app.js": [
  "js/ui/native-platform.js",
  "js/ui/app-distribution.js",
  "js/ui/dialog.js",
  "js/ui/cards.js",
  "js/ui/big-numbers.js",
  "js/ui/xiuzhen.js",
  "js/ui/treasures.js"
 ],
 "game.js": [
  "js/ui/app.js",
  "js/cultivation/resources.js"
 ]
};
function inspect(html){
 const matches=[...html.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>\s*<\/script>/g)];
 const guard=[...html.matchAll(/<script id="wis-startup-guard">([\s\S]*?)<\/script>/g)];
 if(guard.length!==1||matches.length+1!==[...html.matchAll(/<script\b/g)].length)throw Error('Unexpected inline or malformed script tag');
 new vm.Script(guard[0][1],{filename:'wis-startup-guard'});
 const scripts=matches.map(m=>m[2].split('?')[0]);
 if(new Set(scripts).size!==scripts.length)throw Error('Duplicate script reference');
 for(const p of scripts)if(!/^(?:js\/[a-z0-9_./-]+\.js|game\.js)$/.test(p)||p.split('/').includes('..')||!fs.statSync(path.join(root,p)).isFile())throw Error('Missing or invalid script: '+p);
 const indexes=new Map(scripts.map((p,i)=>[p,i]));
 for(const [p,required] of Object.entries(dependencies)){
  if(!indexes.has(p))throw Error('Required script missing: '+p);
  for(const dep of required)if(!indexes.has(dep)||indexes.get(dep)>=indexes.get(p))throw Error(`Loading order: ${dep} must precede ${p}`);
 }
 if(scripts.at(-1)!=='game.js')throw Error('game.js must be last');
 return {matches,scripts};
}
function main(){
 const flags=new Set(process.argv.slice(2));for(const f of flags)if(!['--check','--write','--list'].includes(f))throw Error('Usage: node tools/update-script-manifest.cjs [--check|--write] [--list]');
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/core/build-config.js'),'utf8'),sandbox,{timeout:1000});
 const buildId=sandbox.window.WIS_BUILD?.id;
 if(typeof buildId!=='string'||!/^[a-zA-Z0-9._-]+$/.test(buildId))throw Error('Invalid WIS_BUILD.id');
 let html=fs.readFileSync(htmlPath,'utf8');const {matches,scripts}=inspect(html);
 const generated={generated:true,authority:{scripts:'index.html',buildId:'js/core/build-config.js:WIS_BUILD.id'},buildId,scripts};
 const text=JSON.stringify(generated,null,2)+'\n';
 if(flags.has('--write')){
  for(const m of matches)html=html.replace(m[0],m[0].replace(m[2],m[2].split('?')[0]+'?v='+buildId));
  html=html.replace(/styles\.css\?v=[^"']+/, 'styles.css?v='+buildId);
  fs.writeFileSync(htmlPath,html);fs.writeFileSync(manifestPath,text);
 }else{
  if(!html.includes('styles.css?v='+buildId+'"'))throw Error('Stale CSS cache ID: run --write');
  if(matches.some(m=>m[2]!==m[2].split('?')[0]+'?v='+buildId))throw Error('Stale script cache IDs: run --write');
  if(!fs.existsSync(manifestPath)||fs.readFileSync(manifestPath,'utf8')!==text)throw Error('Stale generated manifest: run --write');
 }
 console.log(flags.has('--list')?text:`PASS: ${scripts.length} scripts; buildId=${buildId}; paths, duplicates, order, cache and manifest checked`);
}
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
module.exports={inspect};
