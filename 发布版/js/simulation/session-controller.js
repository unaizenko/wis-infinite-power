(function(g){'use strict';
const D=g.SessionDelta||(typeof require==='function'?require('./session-delta.js'):null);
const copySlot=s=>Object.defineProperties({},Object.getOwnPropertyDescriptors(s));
const clone=x=>JSON.parse(JSON.stringify(x)),bytes=x=>new TextEncoder().encode(JSON.stringify(x)).length;
function create({factory,store,build,onView=()=>{},onError=()=>{},filter=()=>true}){
 let data=null,owner=null,display=null,error=null,presentationError=null,chain=Promise.resolve();const waiters=new Map(),highWatermarks=new Map(),packedBySlot=new Map();
 const loaded=store.load().then(x=>{data=x;});
 const queue=fn=>{const result=chain.then(()=>loaded).then(fn);chain=result.catch(()=>{});return result;};
 // Only root/slot fields are replaced by write callbacks; nested payloads, receipts
 // and journals are immutable here. Copy these ownership boundaries before awaiting
 // storage so an aborted transaction cannot change the published record.
 async function write(change,exported){const next={...data,slots:Object.fromEntries(Object.entries(data.slots).map(([slot,value])=>[slot,copySlot(value)]))};change(next);await store.write(next,exported);data=next;}
 const packet=(o,m)=>({protocol:'wis-session-v2',build,slot:o.slot,epoch:o.epoch,...m});
 function send(o,m){if(o.worker&&filter('out',packet(o,m)))o.worker.postMessage(packet(o,m));}
 function finish(slot,id,r){const k=slot+':'+id,group=waiters.get(k);if(!group)return;waiters.delete(k);for(const w of group)r.status==='failed'?w.reject(Error(r.message)):w.resolve(clone(r));}
 function high(slot,s){if(!s.revision)return 0;const cached=highWatermarks.get(slot);if(cached?.revision===s.revision)return cached.high;const value=JSON.parse(s.checkpoint).high;highWatermarks.set(slot,{revision:s.revision,high:value});return value;}
 function waitFor(slot,seq){const s=data.slots[slot],r=s?.receipts[seq];if(r&&r.status!=='pending')return r.status==='failed'?Promise.reject(Error(r.message)):Promise.resolve(clone(r));if(s&&seq<=high(slot,s)&&!r)return Promise.reject(Error('receipt expired; command retired, not retried'));return new Promise((resolve,reject)=>{const k=slot+':'+seq,a=waiters.get(k)||[];a.push({resolve,reject});waiters.set(k,a);});}
 function accept(o,m){if(owner!==o||m.protocol!=='wis-session-v2'||m.build!==build||m.slot!==o.slot||m.epoch!==o.epoch||!filter('in',m))return;
  if(m.type==='fatal'){o.fatal=true;error=m.message;onError(Error(error));o.reject?.(Error(error));return;}
  if(m.type!=='checkpoint')return;
  void queue(async()=>{if(owner!==o)return;const s=data.slots[o.slot];try{
   if(m.revision<s.revision)return;if(m.revision===s.revision){
    if(o.lastWire?(m.payload!==o.lastWire.payload||(m.encoding||'full')!==o.lastWire.encoding||m.baseRevision!==o.lastWire.baseRevision):m.payload!==s.checkpoint)throw Error('revision payload changed');
    if(JSON.stringify(m.receipts)!==JSON.stringify(s.receipts))throw Error('duplicate receipts changed');
    const ref=s.saveRef||null,newExport=ref===o.epoch+':'+m.revision;
    if(newExport){if(!m.saveBlob||m.saveBlob.id!==ref||typeof m.saveBlob.text!=='string')throw Error('duplicate save blob missing or changed');const saved=await store.readSave(o.slot,ref);if(owner!==o)return;if(saved.text!==m.saveBlob.text)throw Error('duplicate save text changed');}
    else if(m.saveBlob)throw Error('unexpected duplicate save blob');
    if(owner!==o)return;error=null;send(o,{type:'ack',revision:m.revision});return;
   }
   if(m.revision!==s.revision+1||typeof m.payload!=='string'||!m.receipts)throw Error('checkpoint sequence');
   const encoding=m.encoding||'full';if(!['full','delta'].includes(encoding))throw Error('checkpoint encoding');
   let x=JSON.parse(m.payload);
   if(encoding==='delta'){const base=packedBySlot.get(o.slot);if(!D||!store.commit||m.baseRevision!==s.revision||base?.revision!==s.revision)throw Error('checkpoint base mismatch');x=D.applyShared(base.value,x);}
   else if(D)x=D.freeze(x);
   if(!x.engine?.snapshot?.domain||JSON.stringify(x.receipts)!==JSON.stringify(m.receipts)||!Number.isSafeInteger(x.high))throw Error('checkpoint framing');
   if(x.engine.saveText!==null)throw Error('inline save text in v2 checkpoint');const ref=x.engine.saveRef||null;if(m.saveBlob){if(typeof m.saveBlob.text!=='string'||!ref||m.saveBlob.id!==ref)throw Error('save blob framing');}else if(ref!==(s.saveRef||null))throw Error('missing new save blob');
   let fullText=encoding==='full'?m.payload:null;const text=()=>fullText??(fullText=JSON.stringify(x));
   if(store.commit&&D){
    await store.commit(m);
    const z=copySlot(s);Object.assign(z,{revision:m.revision,receipts:clone(m.receipts),journal:s.journal.filter(c=>c.seq>x.high),saveRef:ref,saveText:null});
    Object.defineProperty(z,'checkpoint',{enumerable:true,configurable:true,get:text});
    data={...data,active:o.slot,slots:{...data.slots,[o.slot]:z}};
   }else await write(d=>{const z=d.slots[o.slot];z.revision=m.revision;z.checkpoint=text();z.receipts=m.receipts;z.journal=z.journal.filter(c=>c.seq>x.high);z.saveRef=ref;z.saveText=null;d.active=o.slot;},m.saveBlob?{slot:o.slot,blob:m.saveBlob}:undefined);
   // A completed old transaction may be durable, but may not publish into a replacement session.
   if(owner!==o)return;
   packedBySlot.set(o.slot,{revision:m.revision,value:x});
   o.lastWire={payload:m.payload,encoding,baseRevision:m.baseRevision};
   highWatermarks.set(o.slot,{revision:m.revision,high:x.high});
   display=Object.freeze({slot:o.slot,epoch:o.epoch,revision:m.revision,get payload(){return text();}});error=null;
   try{onView(display,x);presentationError=null;}catch(e){presentationError=String(e.message||e);}
   for(const [id,r]of Object.entries(m.receipts))if(r.status!=='pending')finish(o.slot,id,r);
   send(o,{type:'ack',revision:m.revision});o.resolve?.(display);o.resolve=o.reject=null;
   if(!o.replayed){o.replayed=true;for(const c of data.slots[o.slot].journal)send(o,{type:'input',...c});}
  }catch(e){if(owner===o){error=String(e.message||e);onError(e);if(o.reject){o.fatal=true;o.reject(e);o.resolve=o.reject=null;}}}});
 }
 function start(slot,initial,options={}){if(!/^[a-zA-Z0-9_.-]{1,64}$/.test(slot)||['__proto__','constructor','prototype'].includes(slot))return Promise.reject(Error('slot identity'));
  const old=owner;old?.worker?.terminate();old?.reject?.(Error('session replaced'));for(const [key,group]of waiters){for(const w of group)w.reject(Error('session replaced'));waiters.delete(key);}
  const o={slot,epoch:0,worker:null,replayed:false,reserved:0};owner=o;
  const ready=new Promise((resolve,reject)=>{o.resolve=resolve;o.reject=reject;});
  void queue(async()=>{if(owner!==o)throw Error('session replaced');if(options.replace&&Object.hasOwn(data.slots,slot)){if(data.active===slot)throw Error('cannot replace active slot');await write(d=>{delete d.slots[slot];});}if(!Object.hasOwn(data.slots,slot)&&typeof initial!=='string')throw Error('initial snapshot required');await write(d=>{if(!Object.hasOwn(d.slots,slot))d.slots[slot]={initial,checkpoint:null,revision:0,receipts:{},journal:[],nextSeq:1,saveText:null};d.epoch++;});if(owner!==o)throw Error('session replaced');o.epoch=data.epoch;o.worker=factory();o.worker.onmessage=({data:m})=>accept(o,m);o.worker.onerror=e=>{if(owner===o){o.fatal=true;error=e.message;onError(Error(error));o.reject?.(Error(error));}};const s=data.slots[slot];const saveBlob=s.saveRef?await store.readSave(slot,s.saveRef):undefined;if(owner!==o)throw Error('session replaced');send(o,{type:'load',incremental:!!(D&&store.commit),revision:s.revision,payload:s.checkpoint||s.initial,restore:!!s.checkpoint,...(saveBlob?{saveBlob}:{})});}).catch(e=>o.reject?.(e));return ready;
 }
 function submit(body){const o=owner;if(!o)return Promise.reject(Error('no owner'));if(bytes(body)>2048)return Promise.reject(Error('command too large'));if(o.reserved>=32)return Promise.reject(Error('command queue full'));const saved=clone(body);o.reserved++;
  return queue(async()=>{if(owner!==o)throw Error('session replaced before admission');const s=data.slots[o.slot],seq=s.nextSeq;if(s.journal.length>=32)throw Error('command journal full');let admitted;try{admitted=await store.append({slot:o.slot,epoch:o.epoch,seq,body:saved});}catch(e){e.sessionPhase='admission';throw e;}data={...data,slots:{...data.slots,[o.slot]:Object.assign(copySlot(s),admitted)}};if(owner===o&&o.replayed)send(o,{type:'input',seq,body:saved});return seq;}).finally(()=>{o.reserved--;});
 }
 async function command(body){const o=owner,seq=await submit(body);if(owner!==o)throw Error('session replaced after admission');return waitFor(o.slot,seq);}
 return {ready:()=>loaded,start,submit,command,wait:seq=>loaded.then(()=>waitFor(owner?.slot,seq)),query(){if(owner)send(owner,{type:'query'});},hold(kind,value){if(owner)send(owner,{type:'hold',kind,value});},
  async switchTo(slot,initial,at){const old=owner?.slot;if(old)await command({type:'freeze',at});try{return await start(slot,initial);}catch(e){if(old)await start(old);throw e;}},restart(){if(!owner)return Promise.reject(Error('no owner'));return start(owner.slot);},
  replay(seq,body){if(!owner?.replayed)throw Error('session not ready');send(owner,{type:'input',seq,body});},
  exportSave(){const o=owner;return queue(async()=>{if(!o||owner!==o)throw Error('session replaced');const ref=data.slots[o.slot].saveRef;if(!ref)return null;const blob=await store.readSave(o.slot,ref);if(owner!==o)throw Error('session replaced');return blob.text;});},failed:()=>owner?.fatal===true,view:()=>display,error:()=>error,presentationError:()=>presentationError,record:()=>data&&clone(data),idle:()=>chain,
  close(){owner?.worker?.terminate();owner=null;for(const group of waiters.values())for(const w of group)w.reject(Error('session closed'));waiters.clear();}
 };
}
const api={create};if(typeof module==='object'&&module.exports)module.exports=api;else g.AsyncSessionController=api;
}(typeof window==='object'?window:globalThis));


