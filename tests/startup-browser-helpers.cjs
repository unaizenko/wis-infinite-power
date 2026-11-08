'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.WIS_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.WIS_GAME_ROOT||path.resolve(__dirname,'..'));
const key='wis-infinite-power-save-v2';
async function launch(){return chromium.launch({channel:process.env.WIS_BROWSER_CHANNEL||'msedge',headless:true});}
async function host(browser,{raw,before,transform=(p,s)=>s,block=[],width=390,touch=false}={}){
 const server=http.createServer((req,res)=>{
  const p=decodeURIComponent(req.url.split('?')[0]).replace(/^\//,'')||'index.html';
  if(block.includes(p)){res.writeHead(404);res.end();return;}
  const file=path.resolve(root,p);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{const body=fs.readFileSync(file);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(transform(p,body.toString()));}
  catch(_){res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const page=await browser.newPage({viewport:{width,height:850},hasTouch:touch,isMobile:touch}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({raw,key})=>{
  if(raw!==undefined)localStorage.setItem(key,raw);
  window.testWorkers=0;const WorkerClass=window.Worker;if(WorkerClass)window.Worker=class extends WorkerClass{constructor(...args){super(...args);window.testWorkers++;}};
 },{raw,key});
 if(before)await page.addInitScript(before);
 return {page,errors,url:'http://127.0.0.1:'+server.address().port+'/',close:async()=>{await page.close();await new Promise(resolve=>server.close(resolve));}};
}
module.exports={host,launch,root,key};
