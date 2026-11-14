// Isolated v2 store: small command records; exact numerical redo; atomic export reference.
(function(g){'use strict';
const D=g.SessionDelta,empty=()=>({active:null,epoch:0,slots:{}}),validSlot=s=>typeof s==='string'&&/^[a-zA-Z0-9_.-]{1,64}$/.test(s)&&!['__proto__','constructor','prototype'].includes(s),validRef=r=>typeof r==='string'&&/^[1-9]\d*:[1-9]\d*$/.test(r);
const hash=async (v,text=JSON.stringify(v))=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
function commandValue(s){const c={nextSeq:s.nextSeq,journal:D.clone(s.journal)};if(!Number.isSafeInteger(c.nextSeq)||c.nextSeq<1||!Array.isArray(c.journal)||c.journal.length>32||D.bytes(c.journal)>65536)throw Error('command journal full or invalid');for(let i=0;i<c.journal.length;i++){const r=c.journal[i];if(r.seq!==c.nextSeq-c.journal.length+i||!r.body||D.bytes(r.body)>2048)throw Error('command sequence or size');}return c;}
const stateValue=s=>({initial:s.checkpoint?null:s.initial,checkpoint:s.checkpoint?JSON.parse(s.checkpoint):null,revision:s.revision});
async function open({name,mode='delta',maxRecords=16,maxBytes=262144}={}){
 if(!name||!['delta','full'].includes(mode)||!Number.isSafeInteger(maxRecords)||maxRecords<1||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('store options');
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 let version=0,manifest=null,cache=new Map(),loaded=false,fault=null,legacyLoaded=false;
 const metrics={transactions:0,appends:0,checkpoints:0,deltas:0,logicalBytes:0,prepareMs:0,appendPrepareMs:0,transactionMs:0,maxPrepareMs:0,maxSubmitMs:0,aborts:0,exportWrites:0};
 const key=(slot,part)=>'slot/'+slot+'/'+part;
 async function readRows(){return new Promise((resolve,reject)=>{const t=db.transaction('kv','readonly'),s=t.objectStore('kv'),k=s.getAllKeys(),v=s.getAll();t.oncomplete=()=>resolve(new Map(k.result.map((k,i)=>[k,v.result[i]])));t.onabort=()=>reject(t.error||Error('read aborted'));});}
 async function checkBlob(blob,id){if(!validRef(id)||!blob||blob.id!==id||typeof blob.text!=='string'||await hash({id:blob.id,text:blob.text})!==blob.hash)throw Error('saved export missing or corrupt');return {id:blob.id,text:blob.text};}
 async function load(){const rows=await readRows(),root=rows.get('@root');if(!root){if(rows.size)throw Error('orphan records: root manifest missing');version=0;manifest={active:null,epoch:0,slots:[]};cache=new Map();legacyLoaded=false;loaded=true;return empty();}if(root.format!==undefined&&root.format!==2)throw Error('store format');const next={active:root.active,epoch:root.epoch,slots:{}},c=new Map();
  for(const slot of root.slots){if(!validSlot(slot))throw Error('slot identity');const h=rows.get(key(slot,'head')),base=rows.get(key(slot,'base'));if(!h||!base||h.count<0||h.count>maxRecords||h.bytes>maxBytes||h.baseSerial!==base.serial)throw Error('checkpoint/log bounds');let value=base.value,serial=base.serial,size=0,digest=null;
   if(h.integrity!==undefined&&h.integrity!=='chain-v1')throw Error('unknown integrity format');
   if(h.integrity){digest=await hash(value);if(digest!==base.hash)throw Error('base integrity');}
   for(let i=0;i<h.count;i++){const row=rows.get(key(slot,'log/'+i));if(!row||row.previous!==serial||row.serial!==serial+1)throw Error('redo gap');
    if(h.integrity){const {hash:expected,...content}=row;if(row.previousHash!==digest||await hash(content)!==expected)throw Error('redo chain integrity');digest=expected;}
    value=D.applyShared(value,row.ops);serial=row.serial;size+=D.bytes(row);
   }
   if(serial!==h.serial||size!==h.bytes||(h.integrity?digest:await hash(value))!==h.hash)throw Error('redo integrity');
   const row=rows.get(key(slot,'commands'));if(root.format===2&&!row)throw Error('missing command metadata');const commands=commandValue(row?row.value:value);if(row&&await hash(commands)!==row.hash)throw Error('command integrity');const ref=value.checkpoint?.engine?.saveRef||null;if(ref)await checkBlob(rows.get(key(slot,'save')),ref);
   c.set(slot,{head:h,value,text:JSON.stringify(value),commands,commandText:JSON.stringify(commands),saveRef:ref});next.slots[slot]={initial:value.initial,checkpoint:value.checkpoint?JSON.stringify(value.checkpoint):null,revision:value.revision,...D.clone(commands),receipts:D.clone(value.checkpoint?.receipts||{}),saveRef:ref,saveText:null};
  }
  version=root.version;manifest={active:root.active,epoch:root.epoch,slots:[...root.slots]};cache=c;legacyLoaded=root.format!==2;loaded=true;return next;
 }
 async function transaction(expected,root,work,queueWrites=false){let written=0;const t0=performance.now();await new Promise((resolve,reject)=>{const t=db.transaction('kv','readwrite'),s=t.objectStore('kv');let why=null,first=true;const put=(value,k)=>{written+=D.bytes(value);const r=s.put(value,k);if(first&&fault==='after-request')r.onsuccess=()=>{why=Error('injected request-success abort');t.abort();};first=false;};
   const submit=()=>{const begin=performance.now();work(s,put);put(root,'@root');metrics.maxSubmitMs=Math.max(metrics.maxSubmitMs,performance.now()-begin);if(fault==='before-complete'){why=Error('injected atomic abort');t.abort();}};
   t.oncomplete=resolve;t.onabort=()=>{metrics.aborts++;reject(why||t.error||Error('transaction aborted'));};
   // Requests run in order, but all writes remain provisional until completion.
   // A stale root aborts this same transaction, including writes queued below.
   s.get('@root').onsuccess=e=>{try{if((e.target.result?.version||0)!==expected)throw Error('stale durable writer');if(!queueWrites)submit();}catch(e){why=e;t.abort();}};
   if(queueWrites)try{submit();}catch(e){why=e;t.abort();}
  });metrics.transactions++;metrics.transactionMs+=performance.now()-t0;metrics.logicalBytes+=written;version=root.version;legacyLoaded=false;manifest={active:root.active,epoch:root.epoch,slots:root.slots};
 }
 async function append({slot,epoch,seq,body}){if(!loaded)throw Error('load required');if(legacyLoaded)throw Error('legacy layout requires write upgrade');const expected=version,start=performance.now(),old=cache.get(slot);if(!validSlot(slot)||!old||manifest.epoch!==epoch)throw Error('stale command owner');if(!Number.isSafeInteger(seq)||seq!==old.commands.nextSeq)throw Error('command sequence');if(D.bytes(body)>2048)throw Error('command too large');const commands=commandValue({nextSeq:seq+1,journal:[...old.commands.journal,{seq,body}]}),text=JSON.stringify(commands),root={format:2,version:expected+1,...manifest,slots:[...manifest.slots]},row={value:commands,hash:await hash(commands,text)};
  metrics.appendPrepareMs+=performance.now()-start;await transaction(expected,root,(_,put)=>put(row,key(slot,'commands')),true);cache.set(slot,{...old,commands,commandText:text});metrics.appends++;return D.clone(commands);
 }
 async function write(next,exported){if(!loaded)throw Error('load required');const expected=version,start=performance.now(),root={format:2,version:expected+1,active:next.active,epoch:next.epoch,slots:Object.keys(next.slots)};
  // Capture all caller-owned inputs before the first async hash.
  const inputs=Object.entries(next.slots).map(([slot,s])=>{if(!validSlot(slot))throw Error('slot identity');return {slot,value:stateValue(s),commands:commandValue(s)};}),exportInput=exported?{slot:exported.slot,blob:{id:exported.blob?.id,text:exported.blob?.text}}:null,changes=[];
  if(exportInput&&!root.slots.includes(exportInput.slot))throw Error('export slot missing');let exportRow=null;
  for(const input of inputs){const {slot,value,commands}=input,text=JSON.stringify(value),commandText=JSON.stringify(commands),old=cache.get(slot),changed=old?.text!==text,ref=value.checkpoint?.engine?.saveRef||null;let state=null;
   if(ref&&!validRef(ref))throw Error('save reference');if(exportInput?.slot===slot){const b=exportInput.blob;if(ref!==b.id||b.id!==root.epoch+':'+value.revision||typeof b.text!=='string'||ref===old?.saveRef)throw Error('save version mismatch');exportRow={...b,hash:await hash(b)};}else if(ref!==(old?.saveRef||null))throw Error('missing new saved export');
   if(changed){const serial=(old?.head.serial||0)+1,ops=old?D.diff(old.value,value):null,row={previous:serial-1,serial,ops},size=D.bytes(row),full=!old||!!old.head.integrity||mode==='full'||old.head.count>=maxRecords||old.head.bytes+size>maxBytes;const head={serial,baseSerial:full?serial:old.head.baseSerial,count:full?0:old.head.count+1,bytes:full?0:old.head.bytes+size,hash:await hash(value,text)};state={row,full,head};}
   // Legacy layout has no separate command record even if its text is unchanged.
   const commandsChanged=old?.commandText!==commandText||Object.hasOwn(old?.value||{},'journal')||!old;
   const commandRow=commandsChanged?{value:commands,hash:await hash(commands,commandText)}:null;changes.push({slot,value,text,commands,commandText,old,state,commandRow,saveRef:ref});
  }
  const prep=performance.now()-start;metrics.prepareMs+=prep;metrics.maxPrepareMs=Math.max(metrics.maxPrepareMs,prep);
  await transaction(expected,root,(s,put)=>{for(const c of changes){if(c.state){const {head,row,full}=c.state;if(full){put({serial:head.serial,value:c.value},key(c.slot,'base'));for(let i=0;i<(c.old?.head.count||0);i++)s.delete(key(c.slot,'log/'+i));}else put(row,key(c.slot,'log/'+c.old.head.count));put(head,key(c.slot,'head'));}if(c.commandRow)put(c.commandRow,key(c.slot,'commands'));}if(exportRow)put(exportRow,key(exportInput.slot,'save'));for(const [slot,old]of cache)if(!root.slots.includes(slot)){for(const p of ['base','head','commands','save'])s.delete(key(slot,p));for(let i=0;i<old.head.count;i++)s.delete(key(slot,'log/'+i));}});
  for(const c of changes){cache.set(c.slot,{head:c.state?.head||c.old.head,value:c.value,text:c.text,commands:c.commands,commandText:c.commandText,saveRef:c.saveRef});if(c.state)metrics[c.state.full?'checkpoints':'deltas']++;}for(const slot of [...cache.keys()])if(!root.slots.includes(slot))cache.delete(slot);if(exportRow)metrics.exportWrites++;
 }
 // Normal confirmation captures only this immutable wire packet. Other slots
 // and the old cache stay private and untouched until transaction.oncomplete.
 async function commit(packet){
  if(!loaded||legacyLoaded)throw Error('load/upgrade required');
  const {slot,epoch,revision,baseRevision,encoding='full',payload}=packet;
  const expected=version,start=performance.now(),old=cache.get(slot);
  if(!validSlot(slot)||!old||epoch!==manifest.epoch||!Number.isSafeInteger(revision)||revision!==old.value.revision+1)throw Error('stale checkpoint owner/revision');
  if(typeof payload!=='string'||!['full','delta'].includes(encoding))throw Error('checkpoint encoding');
  if(encoding==='delta'&&(!old.value.checkpoint||baseRevision!==old.value.revision))throw Error('checkpoint base mismatch');
  const wire=JSON.parse(payload),checkpoint=encoding==='delta'?D.applyShared(old.value.checkpoint,wire):wire;
  if(!checkpoint?.engine?.snapshot?.domain||checkpoint.engine.saveText!==null||!Number.isSafeInteger(checkpoint.high)||checkpoint.high<(old.value.checkpoint?.high||0)||checkpoint.high>=old.commands.nextSeq||JSON.stringify(checkpoint.receipts)!==JSON.stringify(packet.receipts))throw Error('checkpoint framing');
  const value={initial:null,checkpoint,revision},commands=commandValue({nextSeq:old.commands.nextSeq,journal:old.commands.journal.filter(c=>c.seq>checkpoint.high)}),commandText=JSON.stringify(commands);
  const blob=packet.saveBlob?{id:packet.saveBlob.id,text:packet.saveBlob.text}:null,ref=checkpoint.engine.saveRef||null;
  if(ref&&!validRef(ref))throw Error('save reference');
  if(blob){if(ref!==blob.id||ref!==epoch+':'+revision||typeof blob.text!=='string'||ref===old.saveRef)throw Error('save version mismatch');}
  else if(ref!==old.saveRef)throw Error('missing new saved export');
  const root={format:2,version:expected+1,...manifest,active:slot,slots:[...manifest.slots]},serial=old.head.serial+1;
  let full=encoding==='full'||mode==='full'||old.head.integrity!=='chain-v1'||old.head.count>=maxRecords,row=null;
  if(!full){
   const ops=[...wire.map(op=>({...op,path:['checkpoint',...op.path]})),{path:['revision'],value:revision}];
   const content={previous:serial-1,serial,previousHash:old.head.hash,ops};
   row={...content,hash:await hash(content)};
   if(old.head.bytes+D.bytes(row)>maxBytes)full=true;
  }
  const digest=full?await hash(value):row.hash;
  const head={serial,baseSerial:full?serial:old.head.baseSerial,count:full?0:old.head.count+1,bytes:full?0:old.head.bytes+D.bytes(row),hash:digest,integrity:'chain-v1'};
  const commandRow=commandText!==old.commandText?{value:commands,hash:await hash(commands,commandText)}:null;
  const exportRow=blob?{...blob,hash:await hash(blob)}:null;
  const prep=performance.now()-start;metrics.prepareMs+=prep;metrics.maxPrepareMs=Math.max(metrics.maxPrepareMs,prep);
  await transaction(expected,root,(s,put)=>{
   if(full){put({serial,value,hash:digest},key(slot,'base'));for(let i=0;i<old.head.count;i++)s.delete(key(slot,'log/'+i));}
   else put(row,key(slot,'log/'+old.head.count));
   put(head,key(slot,'head'));if(commandRow)put(commandRow,key(slot,'commands'));if(exportRow)put(exportRow,key(slot,'save'));
  });
  cache.set(slot,{head,value,text:null,commands,commandText,saveRef:ref});metrics[full?'checkpoints':'deltas']++;if(exportRow)metrics.exportWrites++;
 }
 async function readSave(slot,id){if(!validSlot(slot))throw Error('slot identity');if(!id)return null;const row=await new Promise((resolve,reject)=>{const t=db.transaction('kv','readonly'),r=t.objectStore('kv').get(key(slot,'save'));t.oncomplete=()=>resolve(r.result);t.onabort=()=>reject(t.error);});return checkBlob(row,id);}
 return {load,write,append,commit,readSave,metrics,setFault:v=>{fault=v;},inspect:()=>Object.fromEntries([...cache].map(([k,v])=>[k,{...v.head}])),close:()=>db.close()};
}
g.SessionStore={open};
}(typeof window==='object'?window:globalThis));

