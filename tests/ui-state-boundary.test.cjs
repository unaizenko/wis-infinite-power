'use strict';
// Real DOM and production App/game bootstrap; only clocks/storage are test-owned.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.WIS_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..');
async function load(browser,root,initial,transform=(file,source)=>source){
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 await page.setContent(html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/g,(full,attrs)=>attrs.includes('id="wis-startup-guard"')?full:'').replace(/<link\b[^>]*>/g,''));
 await page.evaluate(()=>{
  Date.now=()=>1800000000000;Math.random=()=>0.25;
  window.testNativeTimers={setTimeout:window.setTimeout.bind(window),setInterval:window.setInterval.bind(window),requestAnimationFrame:window.requestAnimationFrame.bind(window)};  window.setInterval=()=>0;
  const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});
 });
 for(const m of html.matchAll(/<script\b[^>]*src="([^"]+)"/g)){
  const file=m[1].split('?')[0];
  if(file==='game.js')await page.evaluate(initial=>{
   const W=window.WIS,original=W.UI.App.create;
   W.UI.App={...W.UI.App,create(context){window.testContext=context;return window.testUI=original(context);}};
   if(initial)W.Core.Save={...W.Core.Save,read(){const state=W.Core.State.normalizeDomain(initial);state.lastUpdateAt=Date.now();return {state};}};
  },initial);
  await page.addScriptTag({content:transform(file,fs.readFileSync(path.join(root,file),'utf8'))});
 }
 await page.waitForFunction(()=>window.WIS?.Game?.canPerformSavedAction?.()===true || window.WIS?.Game && !window.WIS.Game.canPerformSavedAction);
 assert.deepEqual(errors,[],'bootstrap errors');return {page,errors};
}
async function main(){
 const browser=await chromium.launch({channel:process.env.WIS_BROWSER_CHANNEL||'msedge',headless:true});
 try {
  const initial=process.env.WIS_PERFORMANCE_INITIAL?JSON.parse(fs.readFileSync(process.env.WIS_PERFORMANCE_INITIAL,'utf8')):null;
  const {page,errors}=await load(browser,root,initial);
  const results=await page.evaluate(()=>{
   const W=window.WIS,S=W.Core.State,R=W.Core.Runtime,ui=window.testUI;
   const serial=()=>JSON.stringify(S.toSerializable(R.getState()));
   const same=(work,label)=>{const before=serial();work();if(serial()!==before)throw Error(label+' wrote persistent state');};
   same(()=>{for(let i=0;i<3;i++)ui.render({forceGlobal:true,forcePage:true});},'render x3');
   const pages=['actions','upgrades','cultivation','treasures','achievements','challenges','statistics'];
   same(()=>{for(const p of [...pages,...pages.reverse()]){ui.switchPage(p);ui.render({forceGlobal:true,forcePage:true});}},'navigation');
   same(()=>{document.getElementById('big-number-tab').click();ui.render({forceGlobal:true,forcePage:true});},'symbol tab');
   same(()=>{for(const key of W.Meta.Treasures.keys)W.Meta.TreasureProgress.view(R.getState(),key);},'treasure view');
   same(()=>{W.UI.SourcePreview.query(['xianForce','yuanForce','fitness','rock'],R.getState(),{assumeUnlocked:true});
    for(const id of ['planetWill','starShatter','stellarTreasureSeeking','starSpirit','supernaturalFire'])W.Power.ScaleLogic.upgradePreview(id,R.getState());},'preview');
   const fresh=S.fresh();delete fresh.meta.bigNumbers;delete fresh.cultivation.systems.immortal.xiuzhen;R.setState(fresh);
   same(()=>{W.Meta.BigNumbers.get(fresh);W.Meta.BigNumbers.canPurchase(fresh,1);W.Cultivation.Xiuzhen.get(fresh);
    W.UI.SourcePreview.query(['xianForce','yuanForce'],fresh,{assumeUnlocked:true});},'missing legacy query');
   // Acquiring the first gameplay achievement must work without opening its page.
   R.setState(S.fresh());R.getState().joules=W.Core.BigNum.BN(100000);W.Game.actions.train();
   if(!R.getState().unlockedAchievements.powerOne)throw Error('manual action did not unlock powerOne');
   const cosmic=W.Core.Config.scales.findIndex(s=>s.name==='宇宙结构'),s=R.getState();
   s.power=W.Core.BigNum.BN('1e100');s.highestScaleIndex=cosmic;s.lifetimeHighestScaleIndex=cosmic;s.unlockedAchievements['trueScale'+cosmic]=true;
   window.testContext.completePlayerAction();
   if(!s.meta.bigNumbers.unlocked)throw Error('system unlock depends on page');
   same(()=>{for(let i=0;i<3;i++)ui.render({forceGlobal:true,forcePage:true});},'post-action render');
   return {renderPasses:6,navigationPasses:14,preview:true,missingLegacy:true,manualAchievement:true,systemUnlock:true};
  });
  assert.deepEqual(errors,[],'render errors');console.log(JSON.stringify({pass:true,...results}));await page.close();
  if(process.env.WIS_DE_BASELINE){
   const traces=[];
   for(const dir of [path.resolve(process.env.WIS_DE_BASELINE),root]){
    const {page,errors}=await load(browser,dir,initial);
    traces.push(await page.evaluate(()=>{
     const W=window.WIS,R=W.Core.Runtime,S=W.Core.State,B=W.Core.BigNum,ui=window.testUI,rows=[];
     const capture=label=>{ui.render({forceGlobal:true,forcePage:true});const s=S.toSerializable(R.getState());
      // Wall-clock timestamp is set by fresh(), independently of game events.
      delete s.core.runtime.lastUpdateAt;rows.push({label,state:s});};
     const s=S.fresh();R.setState(s);s.joules=B.BN(100000);window.testContext.completePlayerAction?.();capture('before train');
     W.Game.actions.train();capture('train event');
     s.totalElapsedSeconds=599.8;capture('before trainingUp boundary');
     for(let i=0;i<4;i++){W.Game.simulation.advanceGameStep(.1);capture('tick '+i);}
     const cosmic=W.Core.Config.scales.findIndex(s=>s.name==='宇宙结构');
     s.power=W.Core.BigNum.BN('1e100');s.highestScaleIndex=cosmic;s.lifetimeHighestScaleIndex=cosmic;s.unlockedAchievements['trueScale'+cosmic]=true;
     W.Game.simulation.advanceGameStep(.1);capture('cosmic event');
     return rows;
    }));
    assert.deepEqual(errors,[]);await page.close();
   }
   assert.deepEqual(traces[1],traces[0],'tick/event activation boundary differs');
   console.log('PASS old/new train, trainingUp 600s crossing and cosmic unlock event traces');
  }
 }finally{await browser.close();}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={load};
