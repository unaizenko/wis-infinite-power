const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),p=require('path');
const root=p.resolve(process.argv[2]||p.resolve(__dirname,'..'));
const source=fs.readFileSync(root+'/js/ui/app.js','utf8');
const fn=source.slice(source.indexOf('  function bindHoldButton('),source.indexOf('  function bindManualScaleUpgrade('));
function fixture(){
 const timers=new Map(),frames=new Map(),events=new Map();let id=0,actions=0,previews=0,renders=0,requests=0,allowed=true,fail=false;
 const target=name=>({disabled:false,addEventListener(k,f){const key=name+':'+k;events.set(key,[...(events.get(key)||[]),f]);},setPointerCapture(){},hasPointerCapture(){return false;}});
 const button=target('button'),window=target('window'),document=target('document');
 Object.assign(window,{setTimeout(f){timers.set(++id,f);return id;},clearTimeout(i){timers.delete(i);},requestAnimationFrame(f){frames.set(++id,f);return id;},cancelAnimationFrame(i){frames.delete(i);}});
 const c={window,document,beforePlayerAction:()=>true,byId:()=>button,offlineCatchUpStatus:{locked:false},activePage:'actions',context:{completePlayerAction(){}},runtime:{call(k){if(k==='renderImmediately'){renders++;if(!c.explorationHoldActive)previews++;}else requests++;}},explorationHoldActive:false};vm.createContext(c);
 vm.runInContext(fn+'\nthis.bind=bindHoldButton;',c);
 const cancel=c.bind('exploration-button',()=>{if(fail)throw Error('injected');actions++;},{cooperative:true,canRepeat:()=>allowed});
 const fire=(name,k)=>{for(const f of events.get(name+':'+k)||[])f({pointerId:1,pointerType:'mouse',button:0,preventDefault(){}});};
 const next=()=>{const queue=timers.size?timers:frames;const e=queue.entries().next().value;if(e){queue.delete(e[0]);e[1]();}return !!e;};
 return {fire,next,cancel,button,c,timers,frames,setAllowed(v){allowed=v;},setFail(v){fail=v;},stats:()=>({actions,previews,renders,requests})};
}
let f=fixture();f.fire('button','pointerdown');assert.equal(f.stats().actions,1);assert.equal(f.stats().previews,0,'pointer hold must defer preview');
for(let i=0;i<12;i++){f.next();assert.ok(f.timers.size+f.frames.size<=1,'only one continuation');}assert.ok(f.stats().actions>1);assert.equal(f.stats().previews,0);
f.fire('button','pointerup');assert.equal(f.stats().previews,1);assert.equal(f.timers.size+f.frames.size,0);const n=f.stats().actions;f.fire('button','click');assert.equal(f.stats().actions,n);
for(const [name,event] of [['button','pointercancel'],['window','blur'],['document','visibilitychange'],['window','pointerup']]){f=fixture();f.fire('button','pointerdown');f.fire(name,event);assert.equal(f.timers.size+f.frames.size,0);assert.equal(f.c.explorationHoldActive,false);assert.equal(f.stats().previews,1);}
for(const kind of ['disabled','unavailable','route','exception']){f=fixture();f.fire('button','pointerdown');if(kind==='disabled')f.button.disabled=true;if(kind==='unavailable')f.setAllowed(false);if(kind==='route')f.cancel();if(kind==='exception')f.setFail(true);for(let i=0;i<5;i++){try{f.next();}catch(e){assert.equal(e.message,'injected');}}assert.equal(f.timers.size+f.frames.size,0,kind);assert.equal(f.c.explorationHoldActive,false,kind);}
f=fixture();f.fire('button','click');assert.equal(f.stats().actions,1);assert.equal(f.stats().previews,1,'single click synchronous');
f=fixture();f.fire('button','pointerdown');f.setFail(true);assert.throws(()=>f.next(),/injected/);f.setFail(false);f.fire('button','pointerup');f.fire('button','click');assert.equal(f.stats().actions,1,'failed gesture must not retry via synthetic click');
f=fixture();f.fire('button','pointerdown');f.fire('button','click');assert.equal(f.stats().actions,1,'no alternate click during hold');
console.log('PASS hold cancellation, one continuation, deferred/final preview, single click');
