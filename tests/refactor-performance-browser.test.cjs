"use strict";
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {launch,root}=require('./startup-browser-helpers.cjs'),{readFixture}=require('./helpers/current-fixtures.cjs');
const out=path.resolve(process.env.WIS_REFACTOR_RESULTS||path.join(root,'../WIS-项目资源/refactor-implementation-20261111/acceptance'));
fs.mkdirSync(out,{recursive:true});const samples=[],violations=[],errors=[];
const ids=['conversion-preview','next-power-j','breathing-preview','next-mana-j'];
(async()=>{const browser=await launch();const version=browser.version();
try{for(const cpu of [1,4])for(let sample=1;sample<=5;sample++){
 const page=await browser.newPage({viewport:{width:390,height:850},isMobile:true,hasTouch:true}),pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 try{
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  await page.addInitScript(({raw,ids})=>{const now=Date.now();raw.data.core.runtime.lastUpdateAt=now;Object.assign(raw.data.core.runtime.timeLedger,{boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]});localStorage.clear();localStorage.setItem('wis-infinite-power-save-v2',JSON.stringify(raw));window.measured={first:{},long:[],busy:null};document.addEventListener('pointerdown',e=>{if(e.target.closest?.('#train-button'))measured.click=performance.now();},true);
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(measured.ready&&e.startTime>=measured.ready)measured.long.push(e.duration);}).observe({entryTypes:['longtask']});
   new MutationObserver(()=>{if(!window.WIS?.Game)return;measured.ready??=performance.now();for(const id of ids){const text=document.getElementById(id)?.textContent||'';if(text&&!/计算|capacity|不可用|暂无法/.test(text)&&(id.endsWith('-preview')?/最终获取/.test(text):(id==='next-power-j'?text.startsWith('下一点基础战力所需：'):text.startsWith('下一档基础法力所需：'))))measured.first[id]??={ms:performance.now(),text};}
    if(measured.click&&!measured.feedbackScheduled&&document.getElementById('train-button')?.getAttribute('aria-busy')==='true'){measured.feedbackScheduled=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{measured.busy=performance.now()-measured.click;}));}
   }).observe(document,{childList:true,subtree:true,characterData:true,attributes:true});
  },{raw:readFixture('high-training'),ids});
  const began=performance.now();await page.goto(pathToFileURL(path.join(root,'index.html')).href);
  await page.waitForFunction(()=>Object.keys(measured.first).length===4,null,{timeout:60000});
  const previewMs=Math.round(performance.now()-began),before=await page.evaluate(()=>({j:String(WIS.Game.getState().joules),power:String(WIS.Game.getState().power),elapsed:WIS.Game.getState().totalElapsedSeconds}));
  await page.waitForFunction(e=>WIS.Game.getState().totalElapsedSeconds>e+.2,before.elapsed,{timeout:20000});
  const actionStart=performance.now();await page.locator('#train-button').click();
  // CPU throttling remains active during the FORMAL action.
  await page.waitForFunction(b=>WIS.Core.BigNum.lt(WIS.Game.getState().joules,WIS.Core.BigNum.mul(b.j,.25))&&WIS.Core.BigNum.gt(WIS.Game.getState().power,b.power),before,{timeout:45000});
  const actionMs=Math.round(performance.now()-actionStart),result=await page.evaluate(()=>{WIS.Game.actions.save();const raw=JSON.parse(localStorage.getItem('wis-infinite-power-save-v2')),loaded=WIS.Core.Save.prepare(raw).state,s=WIS.Game.getState();return {build:WIS_BUILD.id,first:measured.first,ready:measured.ready,feedbackMs:measured.busy,maxLongTaskMs:Math.max(0,...measured.long),power:String(s.power),savedPower:String(loaded.power),stopped:WIS.Game.getSettlementStatus().stopped,policy:raw.numericTailPolicyVersion};});
  assert.equal(result.savedPower,result.power);assert.equal(result.stopped,false);assert.equal(result.policy,3);assert.deepEqual(pageErrors,[]);
  const row={cpu,sample,previewMs,actionMs,...result};samples.push(row);console.log(JSON.stringify(row));
  const target=cpu===1?3000:5000;
  if(previewMs>target)violations.push({cpu,sample,metric:'preview',actual:previewMs,target});
  if(actionMs>target)violations.push({cpu,sample,metric:'action',actual:actionMs,target});
  if(result.feedbackMs===null||result.feedbackMs>100)violations.push({cpu,sample,metric:'feedback',actual:result.feedbackMs,target:100});
  if(result.maxLongTaskMs>100)violations.push({cpu,sample,metric:'longTask',actual:result.maxLongTaskMs,target:100});
 }catch(e){errors.push({cpu,sample,message:e.message,pageErrors});console.log(JSON.stringify(errors.at(-1)));}
 finally{await page.close();fs.writeFileSync(path.join(out,'five-cold-runs.json'),JSON.stringify({version,mode:'file:// normal live main loop, fresh page/context each sample; CDP throttle remains active for action; worker throttle not claimed',samples,violations,errors},null,2));}
}}finally{await browser.close();}
const summary=[1,4].map(cpu=>{const rows=samples.filter(r=>r.cpu===cpu),stats=key=>{const x=rows.map(r=>r[key]).filter(v=>typeof v==='number').sort((a,b)=>a-b);return {median:x[Math.floor(x.length/2)],p95:x[Math.ceil(x.length*.95)-1],max:x.at(-1)};};return {cpu,count:rows.length,preview:stats('previewMs'),action:stats('actionMs'),feedback:stats('feedbackMs'),maxLongTask:stats('maxLongTaskMs')};});
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({version,summary,violations,errors,passed:!violations.length&&!errors.length&&samples.length===10},null,2));
assert.equal(errors.length,0,'functional errors');assert.equal(samples.length,10);assert.equal(violations.length,0,'strict refactor performance gate not met; see E-drive acceptance/summary.json');
})().catch(e=>{console.error(e);process.exitCode=1;});
