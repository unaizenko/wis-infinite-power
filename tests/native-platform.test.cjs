'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function load(native=true,overrides={}){const calls=[],listeners={},storage=new Map();let now=10000;
 const plugins={Filesystem:{writeFile:async o=>{calls.push(['write',o]);return {uri:'content://cache/save'};}},Share:{share:async o=>calls.push(['share',o])},App:{addListener:async (k,f)=>{listeners[k]=f;return {remove(){}};},exitApp:async()=>calls.push(['exit']),getState:async()=>({isActive:true})},...overrides};
 const win={Capacitor:{isNativePlatform:()=>native,Plugins:plugins},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},alert:m=>calls.push(['alert',m]),WIS:{UI:{}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/ui/native-platform.js'),'utf8'),{window:win,Date:{now:()=>now},console});
 return {api:win.WIS.UI.NativePlatform,calls,listeners,storage,advance:()=>now+=3000};}
test('web host performs no native work',async()=>{const x=load(false);assert.equal(x.api.isNative(),false);await x.api.install({});assert.deepEqual(x.calls,[]);assert.deepEqual(x.listeners,{});});
test('native export writes exact UTF-8 text before sharing cached URI',async()=>{const x=load(),text='{"大数":"ee20","tail":[]}\n';await x.api.exportText(text,'WIS.json');assert.equal(x.calls[0][0],'write');assert.equal(x.calls[0][1].data,text);assert.equal(x.calls[0][1].encoding,'utf8');assert.equal(x.calls[0][1].directory,'CACHE');assert.equal(x.calls[1][1].files[0],'content://cache/save');});
test('write failure never shares; error reaches caller',async()=>{const x=load(true,{Filesystem:{writeFile:async()=>{throw Error('disk full');}}});await assert.rejects(x.api.exportText('x','WIS.json'),/disk full/);assert.deepEqual(x.calls,[]);});
test('back closes surface first, then arms, saves and exits; save failure prevents exit',async()=>{const x=load();let open=true,saveOK=false;const notices=[];await x.api.install({closeSurface:()=>{const v=open;open=false;return v;},saveBeforeLeaving:()=>{x.calls.push(['save']);return saveOK;},notice:x=>notices.push(x),onAppState:()=>{}});await x.listeners.backButton();assert.equal(notices.length,0);await x.listeners.backButton();assert.match(notices[0],/再按一次退出/);await x.listeners.backButton();assert.equal(x.calls.some(c=>c[0]==='exit'),false);saveOK=true;await x.listeners.backButton();await x.listeners.backButton();assert.equal(x.calls.at(-2)[0],'save');assert.equal(x.calls.at(-1)[0],'exit');});
test('app state bridge preserves both inactive and active transitions; onboarding once',async()=>{const x=load(),states=[];await x.api.install({closeSurface:()=>false,saveBeforeLeaving:()=>true,notice:()=>{},onAppState:v=>states.push(v)});x.listeners.appStateChange({isActive:false});x.listeners.appStateChange({isActive:true});assert.deepEqual(states,[true,false,true]);assert.equal(x.calls.filter(c=>c[0]==='alert').length,1);});

test('native old WebView gets an explicit recovery message before game parsing',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script id="wis-startup-guard">([\s\S]*?)<\/script>/)[1];
 const nodes=new Map(),handlers={};const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',setAttribute(){}});return nodes.get(id);};
 const document={getElementById:node,querySelectorAll:()=>[],addEventListener:(k,f)=>handlers[k]=f,hidden:false};
 const win={Capacitor:{isNativePlatform:()=>true},navigator:{userAgent:'old WebView'},addEventListener(){},setInterval(){},BigInt};
 vm.runInNewContext(source,{window:win,document,Function:function(){throw Error('unsupported private fields');},Date,Error,JSON,String,Math});
 handlers.DOMContentLoaded();assert.equal(win.WIS_BOOT.diagnostics().firstError.stage,'capabilities');assert.match(node('boot-status-message').textContent,/系统 WebView 版本过低/);assert.equal(node('boot-status-panel').hidden,false);
});
