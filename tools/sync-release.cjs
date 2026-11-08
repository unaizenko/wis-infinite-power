'use strict';
// Synchronize runtime assets only; release transforms remove developer UI.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const args=process.argv.slice(2);let out=null,requestedBuild=null,explicitWrite=false,dryRun=false;
for(let i=0;i<args.length;i++){
 const a=args[i];if(a==='--write')explicitWrite=true;else if(a==='--dry-run')dryRun=true;
 else if(a==='--out'||a==='--build'){const value=args[++i];assert(value&&!value.startsWith('--'),'Missing value for '+a);if(a==='--out'){assert(out===null,'Duplicate --out');out=value;}else{assert(requestedBuild===null,'Duplicate --build');requestedBuild=value;}}
 else throw Error('Unknown argument: '+a);
}
const config=read('js/core/config.js');
const gameVersion=config.match(/gameVersion:\s*"([^"\r\n]+)"/)?.[1],saveVersion=Number(config.match(/saveVersion:\s*(\d+)/)?.[1]);
const settlementRule=Number(config.match(/fixedSettlement:\s*Object.freeze\(\{\s*version:\s*(\d+)/)?.[1]);
assert(gameVersion&&Number.isInteger(saveVersion)&&saveVersion>0&&settlementRule>0,'Missing release metadata');
const build=requestedBuild||'release-'+gameVersion+'-'+new Date().toISOString().slice(0,10).replaceAll('-','');
assert(/^[a-zA-Z0-9._-]+$/.test(build),'Invalid build ID');
const dest=out?path.resolve(out):path.join(root,'发布版'),write=explicitWrite||out!==null;
// Resolve existing ancestors and Windows casing before comparing paths. A case
// variant or junction must never turn a release output into the development root.
function canonical(p){
 p=path.resolve(p);
 const resolved=fs.existsSync(p)?fs.realpathSync.native(p):path.join(canonical(path.dirname(p)),path.basename(p));
 return process.platform==='win32'?resolved.toLowerCase():resolved;
}
const sourcePath=canonical(root),outputPath=canonical(dest),releasePath=canonical(path.join(root,'发布版'));
assert(outputPath!==sourcePath&&!sourcePath.startsWith(outputPath+path.sep),'Output cannot contain the source');
assert(!outputPath.startsWith(sourcePath+path.sep)||outputPath===releasePath,'Custom output must be outside the source tree');
function rejectOutputLinks(directory){
 if(!fs.existsSync(directory))return;
 assert(!fs.lstatSync(directory).isSymbolicLink(),'Output cannot contain symbolic links');
 if(fs.statSync(directory).isDirectory())for(const name of fs.readdirSync(directory))rejectOutputLinks(path.join(directory,name));
}
rejectOutputLinks(dest);
function replaceOnce(s,pattern,value,label){const matches=[...s.matchAll(new RegExp(pattern.source,pattern.flags.includes('g')?pattern.flags:pattern.flags+'g'))];assert.equal(matches.length,1,label);return s.replace(pattern,value);}
const blocks=(s,syntax)=>{for(const name of ['SPEED CONTROL','RESOURCE BREAKDOWN']){
 const pattern=syntax==='html'?new RegExp('<!-- DEBUG '+name+': START[\\s\\S]*?<!-- DEBUG '+name+': END -->','g'):
 new RegExp('/\\* DEBUG '+name+': START[\\s\\S]*?/\\* DEBUG '+name+': END \\*/','g');
 s=replaceOnce(s,pattern,'','debug block '+name);}return s;};
function releaseApp(s){
 s=replaceOnce(s,/    const debugSpeedOptions = [^\r\n]+\r?\n/,'','speed options');
 s=replaceOnce(s,/    let formulaDetailsExpanded = false;\r?\n/,'','formula state');
 s=replaceOnce(s,/  function configureBuildControlledUI\(\) \{[\s\S]*?(?=  function renderAutomationManager)/,'  function configureBuildControlledUI() {}\n\n','build UI');
 s=replaceOnce(s,/  function formatDebugEffectValue\([\s\S]*?(?=  function renderAdditionalResources)/,'  function renderResourceDebugPanel() { return false; }\n\n','formula implementation');
 s=replaceOnce(s,/    \/\/ DEBUG SPEED CONTROL: START[\s\S]*?    \/\/ DEBUG SPEED CONTROL: END/,'','speed handlers');
 s=replaceOnce(s,/    function effectiveDevSpeed\(\) \{[\s\S]*?\r?\n    \}/,'    function effectiveDevSpeed() { return 1; }','release speed');
 s=replaceOnce(s,/      __test: Object\.freeze\(\{[\s\S]*?importPhases:\(\)=>lastImportPhases\}\),\r?\n/,'','test facade');
 assert(!/debug-speed|formula-details|formatDebugEffect|renderResourceDebug\s*=|__test\s*:/.test(s));return s;
}
const retiredAssets=["js/simulation/strong-feedback-kernel.js", "js/power/scale-kernel.js", "js/simulation/resource-dependencies.js", "js/simulation/coupled-resource-kernel.js", "js/simulation/coordinate-coupled-kernel.js", "js/simulation/discrete-map.js", "js/simulation/continuous-predictor.js", "js/simulation/local-discrete-macro.js", "js/simulation/continuous-executor.js", "js/simulation/resource-evolution.js", "js/simulation/compiled-continuous-plan.js", "js/simulation/martial-interval.js", "js/simulation/accuracy.js", "js/simulation/crystal-interval.js", "js/simulation/offline-strategy.js", "js/simulation/discrete-batch.js", "js/simulation/projection.js", "js/simulation/treasure-events.js"];
const files=new Map();for(const relative of fs.readdirSync(path.join(root,'js'),{recursive:true})){
 const p='js/'+relative.replaceAll('\\','/');if(fs.statSync(path.join(root,p)).isFile())files.set(p,fs.readFileSync(path.join(root,p)));
}
for(const p of retiredAssets)files.delete(p);
files.delete('js/script-manifest.json');files.delete('js/simulation/offline-worker-bundle.js');files.delete('js/simulation/online-candidate-worker-bundle.js');
files.set('js/core/build-config.js',read('js/core/build-config.js').replace('mode: "development"','mode: "release"').replace(/id: "[^"]+"/,'id: "'+build+'"').replace('enableSpeedControls: true','enableSpeedControls: false').replace('enableFormulaDetails: true','enableFormulaDetails: false'));
files.set('js/ui/app.js',releaseApp(read('js/ui/app.js')));
files.set('game.js',read('game.js'));
let html=blocks(read('index.html'),'html').replace(/(src="[^"?]+)\?v=[^"]+/g,'$1?v='+build).replace(/styles\.css\?v=[^"']+/,'styles.css?v='+build);
assert(html.includes('>v'+gameVersion+'</small>'));files.set('index.html',html);
let css=blocks(read('styles.css'),'css').replace(/^.*"sidebar resource-debug".*\r?\n/gm,'').replace(/^\s*\.(?:debug-speed-button|resource-debug-tools|debug-source-preview)\s*\{[^}]*\}\r?\n/gm,'');
// Removing the debug area also removes its explicit track; otherwise the
// final 1fr track becomes an unnamed blank row below sidebar and content.
css=replaceOnce(css,/grid-template-rows: auto auto minmax\(0, 1fr\);/,'grid-template-rows: auto minmax(0, 1fr);','release grid rows');
assert(!/debug-speed|resource-debug|formula-details|debug-source/.test(css));files.set('styles.css',css);
files.set('js/README.md',read('js/README.md').replace('# WIS 开发版模块说明','# WIS 发布版模块说明').replace('玩家可见开发版本','玩家可见发布版本').replace(/dev-[0-9.]+-[0-9]{8}(?:-[a-z0-9-]+)?/g,build).replace('当前 ZIP 是 development runtime。默认不修改发布版、不发布、不 commit、不 push。','当前目录为 release runtime，由开发真源生成。').replace('开发构建与静态缓存标识','发布构建与静态缓存标识').replace('Build mode 为 development，调速和公式详情入口开启。','Build mode 为 release，调速和公式详情调试入口已移除，正式速度固定为 ×1。'));
files.set('README.md',`# WIS-无限战力系统 · 发布版

当前版本：**${gameVersion}**；构建：${build}；存档 Schema：${saveVersion}；结算规则版本：${settlementRule}。

本版同步当前开发版全部正式内容：

- 吐纳预览和动作采用可续算候选，避免高进度旧存档阻塞首屏；遇到数值精度停滞时明确提示并保留资源，不提交未完成收益。\n- 独立启动故障提示、原始存档备份与诊断；读档失败后的临时会话保持前台运行，禁止正式保存与后台收益；分阶段首屏与弹窗兼容。\n- 三类宇宙使用平滑双重对数获取和库存衰减，配套调整神融天地、法随身动、道无涯及内天地、尊阳、虚本源、六；道无涯与道源费用分别为300、3000多元。
- G、TREE阶位使用大数表示；购买对应无限强化后解除原安全整数阶位上限。
- 顶部按当前有效资格显示高阶多元；付费阶位和历史最高记录跨转生保留。
- 包含当前仙道、武道、成就、描述和界面修正。

正式速度固定×1；已移除调速按钮、Alt+S调速、公式详情调试面板及其计算、UI测试入口，性能诊断默认关闭。保留正常收益预览、自动化、离线控制和异常恢复保护。

直接打开 index.html 或通过静态网页服务运行。沿用正式存档key和迁移流程；更换设备、浏览器或网址前请导出存档。旧版本可能无法识别Schema${saveVersion}及当前数值模型的存档，请使用本版或更新版本。

不包含玩家存档、开发测试、截图或调试报告。历史公式参考见数值公式.md，实际规则以当前运行代码为准。
`);
for(const [p,body] of files)if(p.endsWith('.js'))new vm.Script(String(body),{filename:p});
if(dryRun){console.log('PASS dry-run '+build+': '+files.size+' transformed assets; no files written');process.exit(0);}
// latest.json belongs to the release operator, never to runtime generation.
assert(!files.has('latest.json'),'latest manifest must remain unmanaged');
if(write)for(const [p,body] of files){const target=path.join(dest,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body);}
else for(const [p,body] of files)assert(fs.readFileSync(path.join(dest,p)).equals(Buffer.from(body)),p+' differs from expected release transform');
function runTool(file,args){const module={exports:{}},req=id=>require(id);req.main=module;const proc={argv:['node',file,...args],exitCode:0};
 vm.runInNewContext(read('tools/'+file),{require:req,module,process:proc,console,Buffer,__dirname:path.join(dest,'tools')},{filename:file});assert.equal(proc.exitCode,0,file);}
// The manifest validator requires every referenced asset before it can rebuild.
for(const bundle of ['js/simulation/offline-worker-bundle.js','js/simulation/online-candidate-worker-bundle.js'])
 if(write&&!fs.existsSync(path.join(dest,bundle)))fs.copyFileSync(path.join(root,bundle),path.join(dest,bundle));
runTool('update-script-manifest.cjs',[write?'--write':'--check']);runTool('build-offline-worker.cjs',write?[]:['--check']);runTool('build-online-candidate-worker.cjs',write?[]:['--check']);
// Known retired assets only. Never prune unknown/user files or directories.
// This runs only after all transformed assets and generated payloads validate.
for(const relative of retiredAssets){
 const target=path.resolve(dest,relative);
 assert(target.startsWith(dest+path.sep)&&!files.has(relative),'invalid retired asset target');
 if(write&&fs.existsSync(target)){
  const info=fs.lstatSync(target);assert(info.isFile()&&!info.isSymbolicLink(),'retired runtime asset must be a regular file');
  fs.unlinkSync(target);
 }else if(!write)assert(!fs.existsSync(target),relative+' is a stale retired runtime asset');
}
console.log('PASS release '+build+': '+files.size+' runtime/document assets synchronized; developer UI stripped');
