'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {host,launch}=require('./startup-browser-helpers.cjs');
const {loadProductionNumericRuntime}=require('./helpers/production-numeric-runtime.cjs');
function initialize(){const key='wis-infinite-power-save-v2',raw=JSON.parse(sessionStorage.getItem('test-saved')||localStorage.getItem(key)),now=Date.now();raw.data.core.runtime.lastUpdateAt=now;raw.data.core.runtime.timeLedger={...(raw.data.core.runtime.timeLedger||{}),boundaryAt:now,registeredUntil:now,awaySince:null,pendingContinuousTime:[]};localStorage.setItem(key,JSON.stringify(raw));}
async function ready(page){await page.waitForFunction(()=>window.WIS?.Game&&WIS.Game.simulation.getCatchUpStatus().phase==='idle',null,{timeout:60000});}
(async()=>{const browser=await launch();try{
 const raw=fs.readFileSync(path.join(__dirname,'fixtures/breathing-fraction-capacity-20261111.json'),'utf8'),h=await host(browser,{raw,before:initialize,width:390,touch:true});
 try{await h.page.goto(h.url);await ready(h.page);await h.page.waitForFunction(()=>{const s=document.querySelector('#breathing-preview')?.textContent;return s&&!/计算|暂无法/.test(s);},null,{timeout:30000});
  const before=await h.page.evaluate(()=>({mana:String(WIS.Game.getState().mana),j:String(WIS.Game.getState().joules)}));await h.page.getByRole('button',{name:'吐纳',exact:true}).click();
  await h.page.waitForFunction(before=>WIS.Core.BigNum.gt(WIS.Game.getState().mana,before.mana)&&WIS.Core.BigNum.lt(WIS.Game.getState().joules,WIS.Core.BigNum.div(before.j,2)),before,{timeout:30000});
  const saved=await h.page.evaluate(()=>{WIS.Game.actions.save();sessionStorage.setItem('test-saved',localStorage.getItem('wis-infinite-power-save-v2'));return {mana:JSON.stringify(WIS.Core.Amount.serialize(WIS.Core.Resources.readExact('cultivation.immortal.mana',WIS.Game.getState()))),policy:JSON.parse(localStorage.getItem('wis-infinite-power-save-v2')).numericTailPolicyVersion};});assert.equal(saved.policy,3);
  await h.page.reload();await ready(h.page);const after=await h.page.evaluate(()=>JSON.stringify(WIS.Core.Amount.serialize(WIS.Core.Resources.readExact('cultivation.immortal.mana',WIS.Game.getState()))));assert.equal(after,saved.mana);assert.deepEqual(h.errors,[]);console.log(JSON.stringify({case:'breathing-failed-fixture',before,saved,passed:true}));
 }finally{await h.close();}
 for(const config of [{cpu:8,worker:true},{cpu:4,worker:false}]){
  const {W}=loadProductionNumericRuntime(),s=W.Core.State.fresh(),m=W.Cultivation.Martial.get(s);s.cultivation.active='martial';for(const k of ['scale2','scale3','scale4'])s.unlockedAchievements[k]=true;
  Object.assign(m.abilities,{geneEnergy:9,crystalMeditation:1,mindPlanet:3,lifeCore:1,innerWorld:1});for(const k of W.Cultivation.Martial.resourceKeys){m.resources[k].amount=W.Core.BigNum.BN(50000);m.automation[k]=true;}W.Core.Resources.replaceExact('core.joules','1e30',s);W.Core.Resources.replaceExact('core.power','1e30',s);
  const h=await host(browser,{raw:JSON.stringify(W.Core.Save.envelope(s)),before:initialize,width:390,touch:true,transform:(p,s)=>!config.worker&&p==='js/simulation/online-candidate-worker.js'?s.replace('enabled=true','enabled=false'):s});try{
   const cdp=await h.page.context().newCDPSession(h.page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:config.cpu});await h.page.goto(h.url);await ready(h.page);
   const began=performance.now();const first=await h.page.evaluate(()=>({elapsed:WIS.Game.getState().totalElapsedSeconds,qi:String(WIS.Cultivation.Martial.amount(WIS.Game.getState(),'qi')),status:WIS.Game.getSettlementStatus()}));
   try{await h.page.waitForFunction(first=>WIS.Game.getState().totalElapsedSeconds>first.elapsed+.15&&WIS.Core.BigNum.gt(WIS.Cultivation.Martial.amount(WIS.Game.getState(),'qi'),1e6),first,{timeout:45000});}catch(error){console.log(JSON.stringify({config,diagnostic:await h.page.evaluate(()=>({elapsed:WIS.Game.getState().totalElapsedSeconds,status:WIS.Game.getSettlementStatus(),proof:WIS.Core.CertifiedRankMath.progressVersion(),text:document.body.innerText.slice(-2500)}))}));throw error;}
   const slowMs=Math.round(performance.now()-began);const slow=await h.page.evaluate(()=>({elapsed:WIS.Game.getState().totalElapsedSeconds,qi:String(WIS.Cultivation.Martial.amount(WIS.Game.getState(),'qi')),status:WIS.Game.getSettlementStatus()}));assert(!slow.status.stopped);assert.notEqual(first.qi,slow.qi);
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await h.page.waitForFunction(slow=>WIS.Game.getState().totalElapsedSeconds>slow.elapsed+.4,slow,{timeout:15000});
   const recovered=await h.page.evaluate(()=>({elapsed:WIS.Game.getState().totalElapsedSeconds,qi:String(WIS.Cultivation.Martial.amount(WIS.Game.getState(),'qi')),status:WIS.Game.getSettlementStatus()}));assert(!recovered.status.stopped);assert.deepEqual(h.errors,[]);console.log(JSON.stringify({case:'martial-slow-recover',config,slowMs,first,slow,recovered,passed:true}));
  }finally{await h.close();}
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
