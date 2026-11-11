"use strict";
const assert=require('node:assert/strict');
const {load}=require('./ui-state-boundary.test.cjs');
const {launch,root}=require('./startup-browser-helpers.cjs');
(async()=>{const browser=await launch();try{
 const h=await load(browser,root,null,(file,source)=>file==='game.js'?`(()=>{window.martialPreviewCalls=0;const M=WIS.Cultivation.Martial;WIS.Cultivation.Martial={...M,preview(...a){window.martialPreviewCalls++;return M.preview(...a);}};const original=WIS.UI.Martial.create;WIS.UI.Martial={create(c){return window.martialView=original({...c,getCatchUpStatus:()=>({locked:window.martialLocked===true})});}};})();`+source:source);
 const actual=await h.page.evaluate(()=>{
  const W=WIS,R=W.Core.Runtime,S=W.Core.State,B=W.Core.BigNum,s=S.fresh();s.cultivation.active='martial';s.joules=B.BN(1e6);R.setState(s);
  const before=JSON.stringify(S.toSerializable(s));
  martialLocked=true;martialPreviewCalls=0;martialView.renderActions();
  const lockedCalls=martialPreviewCalls,disabled=[...document.querySelectorAll('[id^="martial-convert-"]')].every(b=>b.disabled);
  martialLocked=false;martialPreviewCalls=0;martialView.renderActions();
  const resumedCalls=martialPreviewCalls,enabled=!document.getElementById('martial-convert-qi').disabled;
  const unchanged=before===JSON.stringify(S.toSerializable(s));
  s.cultivation.active=null;martialPreviewCalls=0;martialView.renderActions();
  return {lockedCalls,disabled,resumedCalls,enabled,unchanged,inactiveCalls:martialPreviewCalls};
 });
 assert.equal(actual.lockedCalls,0,'locked offline UI must not execute conversion previews');
 assert.equal(actual.inactiveCalls,0,'hidden martial UI must not execute previews');
 assert.equal(actual.resumedCalls,4);assert(actual.disabled&&actual.enabled&&actual.unchanged);assert.deepEqual(h.errors,[]);
 console.log(JSON.stringify(actual));await h.page.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
