"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const W={UI:{}};vm.runInNewContext(fs.readFileSync('js/ui/app.js','utf8'),{window:{WIS:W}});
const text=W.UI.App.globalRateText;
test('pending is not zero, paused and failed are not stale production',()=>{assert.equal(text(null,{},String),'（收益更新中…）');assert.equal(text(0,{},String),'（+0/秒）');assert.equal(text(9,{rateStale:true},String),'（上次 +9/秒）');assert.equal(text(9,{rateStopped:true},String),'（自动结算暂停）');assert.equal(text(9,{phase:'paused',clockSuspended:true},String),'（结算暂停）');assert.equal(text(9,{clockSuspended:true},String),'（离线结算中）');});
