'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const source=fs.readFileSync(process.env.WIS_CLIENT_CANDIDATE||path.resolve(__dirname,'../js/simulation/session-client.js'),'utf8');
async function fixture(change=()=>{}){let now=100099,id=0,epoch=1,config,fail=null;const timers=new Map(),intervals=new Map(),listeners={},sent=[];let engine={snapshot:{domain:{powerSystem:{active:'scale'},cultivation:{active:'immortal'},core:{runtime:{onlineCadenceRemaining:.1,timeLedger:{pendingDiscard:null}}}}},loop:{lastTickAt:100099,tickRemaining:0,onlineIntervals:[{source:'online',clock:.099,speed:1}]},reservation:null,pendingAction:null,frozen:false,importHeld:false,settlement:{stopped:false,pendingDiscard:null},status:{phase:'idle',pendingGameSeconds:0},now:100099};change(engine);
 const emit=(patch={},slot='a',ep=epoch)=>{engine={...engine,...patch};config.onView({slot,epoch:ep},{engine});};const controller={ready:async()=>{},record:()=>({active:null}),start:async(slot)=>{epoch++;emit({},slot,epoch);},view:()=>({slot:'a'}),error:()=>fail,failed:()=>!!fail,command:body=>new Promise((resolve,reject)=>sent.push({body,resolve,reject})),exportSave:async()=>'{}',close(){},query(){},restart:async()=>{epoch++;emit({},'a',epoch);}};
 const W={Core:{Config:{saveKey:'test'},Build:{buildId:'test'},State:{toSerializable:x=>x,cloneForSimulation:structuredClone},Save:{noteFailure(){},confirmExternal(){},writePrepared(){},diagnose(){}}},Simulation:{WorkerProtocol:{encode:x=>x,decodeValue:x=>x}}};const document={hidden:false,addEventListener:(k,f)=>listeners[k]=f};const c={window:null,document,navigator:{locks:{request:(_k,_o,fn)=>fn({})}},crypto:{subtle:{}},Date:{now:()=>now},setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimeout:i=>timers.delete(i),setInterval:(fn,delay)=>{intervals.set(++id,{fn,delay});return id;},clearInterval:i=>intervals.delete(i),indexedDB:{},SessionStore:{open:async()=>({close(){}})},AsyncSessionController:{create:o=>{config=o;return controller;}},WIS:W};c.window=c;vm.createContext(c);vm.runInContext(source,c);const client=W.Simulation.SessionClient.create({install(){},render(){}});await client.start({},null);
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};return {client,timers,sent,emit,engine:()=>engine,async advance(ms){now+=ms;const due=[...timers].filter(([,v])=>v.at<=now);for(const [i,t]of due){timers.delete(i);t.fn();}await flush();},pulse(){[...intervals.values()].find(x=>x.delay===100).fn();},async ack(i,patch={}){emit(patch);sent[i].resolve({status:'done'});await flush();},async hidden(){document.hidden=true;listeners.visibilitychange();await flush();},async visible(){document.hidden=false;listeners.visibilitychange();await flush();},fail(){fail=Error('storage failure');config.onError(fail);},flush};}
test('confirmed short prefix schedules real clock boundary; unresolved confirmation remains single flight',async()=>{const h=await fixture();assert.equal(h.timers.size,1);await h.advance(1);assert.equal(h.sent.length,1);assert.equal(h.sent[0].body.type,'clock');assert.equal(h.sent[0].body.at,100100);h.emit({reservation:{seconds:.1}});h.pulse();await h.advance(100);assert.equal(h.sent.length,1,'durable reply still unresolved');await h.ack(0,{loop:{...h.engine().loop,onlineIntervals:[]},reservation:null});assert.equal(h.timers.size,0);h.client.close();});
test('new committed frame or owner retires an already queued old callback',async()=>{const h=await fixture();assert.equal(h.timers.size,1);const old=[...h.timers.values()][0].fn;h.emit({},'b',9);old();await h.flush();assert.equal(h.sent.length,0);await h.advance(1);assert.equal(h.sent.length,1);h.client.close();});
for(const [name,change]of Object.entries({full:e=>e.loop.onlineIntervals[0].clock=.1,empty:e=>e.loop.onlineIntervals=[],reserved:e=>e.reservation={},action:e=>e.pendingAction={},frozen:e=>e.frozen=true,import:e=>e.importHeld=true,discard:e=>e.settlement.pendingDiscard={clock:.1},failed:e=>e.settlement.stopped=true,offline:e=>e.loop.onlineIntervals[0].source='offline',paused:e=>e.status.phase='paused',recovery:e=>e.status.pendingGameSeconds=1,treasure:e=>e.status.treasureRecovery={active:true},legacy:e=>delete e.loop}))test('does not wake across '+name+' boundary',async()=>{const h=await fixture(change);assert.equal(h.timers.size,0);h.client.close();});
test('import hold cancels queued callback and rollback re-arms from confirmed state',async()=>{const h=await fixture();assert.equal(h.timers.size,1);const old=[...h.timers.values()][0].fn,p=h.client.beginImport();old();await h.flush();assert.equal(h.sent.length,1);assert.equal(h.sent[0].body.type,'importHold');await h.ack(0,{importHeld:true});await p;const q=h.client.rollbackImport('cancel');await h.ack(1,{importHeld:false});await q;assert.equal(h.timers.size,1);h.client.close();});
for(const mode of ['close','hidden','native','failure'])test(mode+' invalidates queued callback',async()=>{const h=await fixture();assert.equal(h.timers.size,1);const old=[...h.timers.values()][0].fn;if(mode==='close')h.client.close();if(mode==='hidden')await h.hidden();if(mode==='native'){h.client.nativeActive(false);await h.flush();}if(mode==='failure')h.fail();old();await h.flush();assert.equal(h.sent.filter(x=>x.body.type==='clock').length,0);assert.equal(h.timers.size,0);h.client.close();});
test('late callback records actual wall time and never edits the confirmed prefix',async()=>{const h=await fixture(),before=JSON.stringify(h.engine());await h.advance(30);assert.equal(h.sent[0].body.at,100129);assert.equal(JSON.stringify(h.engine()),before);h.client.close();});
test('native return resumes boundary wakeup only after confirmed return and recovery commands',async()=>{const h=await fixture();h.client.nativeActive(false);await h.flush();assert.equal(h.sent[0].body.type,'freeze');await h.ack(0,{frozen:true});h.client.nativeActive(true);await h.flush();assert.equal(h.sent[1].body.type,'return');h.emit({frozen:false});assert.equal(h.timers.size,0,'unresolved return must not rearm');await h.ack(1,{frozen:false});assert.equal(h.sent[2].body.type,'recovery');assert.equal(h.timers.size,0);await h.ack(2);assert.equal(h.timers.size,1);h.client.close();});

// Lifecycle regressions: periodic clock/cancel must not enter a frozen session;
// a stale return must not resume recovery after a later departure.
test('native inactivity stops periodic clock before and after freeze confirmation',async()=>{
 const h=await fixture();h.client.nativeActive(false);await h.flush();h.pulse();await h.flush();
 assert.deepEqual(h.sent.map(x=>x.body.type),['freeze']);
 await h.ack(0,{frozen:true});h.pulse();await h.advance(300);
 assert.deepEqual(h.sent.map(x=>x.body.type),['freeze']);h.client.close();
});
test('repeat cancellation after departure is retired without a rejected session command',async()=>{
 const h=await fixture();await h.hidden();await h.ack(0,{frozen:true});
 const cancelled=h.client.cancel('hidden');await h.flush();
 assert.deepEqual(h.sent.map(x=>x.body.type),['freeze']);assert.equal(await cancelled,false);h.client.close();
});
test('return followed immediately by another hide cannot resume old recovery or clock',async()=>{
 const h=await fixture();await h.hidden();await h.ack(0,{frozen:true});await h.visible();await h.hidden();
 assert.deepEqual(h.sent.map(x=>x.body.type),['freeze','return','freeze']);
 await h.ack(1,{frozen:false});await h.ack(2,{frozen:true});h.pulse();await h.flush();
 assert.deepEqual(h.sent.map(x=>x.body.type),['freeze','return','freeze']);
 await h.visible();await h.ack(3,{frozen:false});assert.equal(h.sent[4].body.type,'recovery');
 await h.ack(4);h.pulse();await h.flush();assert.equal(h.sent[5].body.type,'clock');h.client.close();
});
test('web visibility cannot resume while native app still inactive',async()=>{
 const h=await fixture();h.client.nativeActive(false);await h.flush();await h.ack(0,{frozen:true});
 await h.hidden();await h.ack(1,{frozen:true});await h.visible();h.pulse();await h.flush();
 assert.deepEqual(h.sent.map(x=>x.body.type),['freeze','freeze']);
 h.client.nativeActive(true);await h.flush();assert.equal(h.sent[2].body.type,'return');
 await h.ack(2,{frozen:false});await h.ack(3);h.pulse();await h.flush();assert.equal(h.sent[4].body.type,'clock');h.client.close();
});

test('successful explicit save retry resumes clock after closing admission failed',async()=>{
 const h=await fixture();const closing=h.client.save({closing:true});const rejected=assert.rejects(closing,/storage admission/);
 h.sent[0].reject(Object.assign(Error('storage admission'),{sessionPhase:'admission'}));await rejected;
 const retry=h.client.save();assert.equal(h.sent[1].body.type,'save');await h.ack(1,{frozen:false});await retry;
 h.pulse();await h.flush();assert.equal(h.sent[2]?.body.type,'clock');h.client.close();
});
