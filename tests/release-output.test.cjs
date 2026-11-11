'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),vm=require('node:vm');
test('external output equals default release transform in isolated fixture; dry-run writes nothing',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wis-release-')),fixture=path.join(temp,'source'),out=path.join(temp,'out');fs.mkdirSync(fixture);
 for(const p of ['js','tools'])fs.cpSync(path.join(root,p),path.join(fixture,p),{recursive:true});
 for(const p of ['index.html','styles.css','game.js'])fs.copyFileSync(path.join(root,p),path.join(fixture,p));
 const run=args=>{const r=spawnSync(process.execPath,[path.join(fixture,'tools/sync-release.cjs'),...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr+'\n'+r.stdout);};
 run(['--out',out,'--dry-run']);assert(!fs.existsSync(out));
 fs.writeFileSync(path.join(fixture,'latest.json'),'DEVELOPMENT SAMPLE MUST NOT SHIP');
 fs.mkdirSync(out);fs.mkdirSync(path.join(fixture,'发布版'));
 const manifest='{"schema":1,"operatorManaged":"keep these exact bytes"}\n';
 for(const dir of [out,path.join(fixture,'发布版')])fs.writeFileSync(path.join(dir,'latest.json'),manifest);
 run(['--out',out,'--build','release-test-0200']);run(['--write','--build','release-test-0200']);
 for(const dir of [out,path.join(fixture,'发布版')])assert.equal(fs.readFileSync(path.join(dir,'latest.json'),'utf8'),manifest,'release synchronization overwrote latest.json');
 // The pure-math payload is derived from the rebuilt offline engine. Loading
 // both generated scripts catches a stale development bundle in an APK build.
 for(const dir of [out,path.join(fixture,'发布版')]){
  const scope={window:{WIS:{Simulation:{}}}};
  for(const name of ['offline-worker-bundle.js','math-worker-bundle.js'])vm.runInNewContext(fs.readFileSync(path.join(dir,'js/simulation',name),'utf8'),scope);
  assert.equal(scope.window.WIS.Simulation.MathWorkerBundle.build,'release-test-0200');
 }
 run(['--build','release-test-0200']); // generated cache labels must also pass read-only verification
 const relative=fs.readdirSync(out,{recursive:true}).filter(p=>fs.statSync(path.join(out,p)).isFile());
 for(const p of relative)assert(fs.readFileSync(path.join(out,p)).equals(fs.readFileSync(path.join(fixture,'发布版',p))),p);
 const empty=path.join(temp,'without-manifest');run(['--out',empty,'--build','release-test-0200']);assert(!fs.existsSync(path.join(empty,'latest.json')),'sync must not generate latest.json');
 assert.match(fs.readFileSync(path.join(out,'README.md'),'utf8'),/Schema：76；结算规则版本：4/);
 console.log('Compared '+relative.length+' files; real 发布版 untouched. Fixture: '+temp);
});

test('case variants and source subdirectories cannot bypass output protection',()=>{
 for(const dest of [root,root.toUpperCase(),path.join(root,'js')]){
 const r=spawnSync(process.execPath,[path.join(root,'tools/sync-release.cjs'),'--out',dest,'--dry-run'],{encoding:'utf8'});
 assert.notEqual(r.status,0,dest);assert.match(r.stderr,/Output cannot|outside the source/);
 }
});
