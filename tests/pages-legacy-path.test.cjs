'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawnSync}=require('node:child_process');
const {chromium}=require(process.env.WIS_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..');
test('Pages artifact keeps old release links and same-origin saves',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wis-pages-')),artifact=path.join(temp,'wis-pages');let browser,server;
 try{
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8').replace(/\r\n/g,'\n'),source=workflow.split("python3 - <<'PY'\n")[1].split('\n          PY')[0].split('\n').map(s=>s.slice(10)).join('\n');
  const run=spawnSync(process.env.WIS_PYTHON||'python',['-c',source],{cwd:root,env:{...process.env,RUNNER_TEMP:temp},encoding:'utf8'});assert.equal(run.status,0,run.stdout+run.stderr);
  assert(fs.existsSync(path.join(artifact,'发布版/index.html')),'Pages artifact must include legacy release URL');
  assert(fs.readFileSync(path.join(artifact,'index.html')).equals(fs.readFileSync(path.join(root,'发布版/index.html'))));assert(!fs.existsSync(path.join(artifact,'tests')));
  assert(workflow.includes('path: ${{ runner.temp }}/wis-pages'),'workflow must upload the compatibility artifact');
  const prefix='/wis-infinite-power/';
  server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),relative=decodeURIComponent(url.pathname).slice(prefix.length);if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
   if(relative==='发布版'){res.writeHead(301,{Location:prefix+encodeURIComponent('发布版')+'/'+url.search});res.end();return;}
   if(relative===''||relative==='index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>Release target</title>');return;}
   const file=path.resolve(artifact,relative.endsWith('/')?relative+'index.html':relative);if(!file.startsWith(artifact+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(file));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),base='http://127.0.0.1:'+server.address().port+prefix,errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);const raw='{"original":"unchanged 存档"}';await page.evaluate(raw=>localStorage.setItem('wis-infinite-power-save-v2',raw),raw);
  for(const suffix of ['发布版/','发布版/index.html','发布版']){await page.goto(base+suffix+'?from=old%20link#achievements');await page.waitForURL(base+'?from=old%20link#achievements');assert.equal(await page.evaluate(()=>localStorage.getItem('wis-infinite-power-save-v2')),raw);}
  const noScript=await browser.newContext({javaScriptEnabled:false}),fallback=await noScript.newPage();await fallback.goto(base+'发布版/');assert.equal(await fallback.locator('a').getAttribute('href'),'../');await noScript.close();assert.deepEqual(errors,[]);
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});}
});
