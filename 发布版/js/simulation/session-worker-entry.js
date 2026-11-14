// Production session transport. No next task may execute before durable ACK.
(function(W){
 'use strict';
 const P=W.Simulation.WorkerProtocol,protocol='wis-session-v2',build=W.Core.Build.buildId,nativeTimer=self.setTimeout.bind(self),nativeClear=self.clearTimeout.bind(self);
 let engine=null,stamp=null,revision=0,receipts={},high=0,proposal=null,running=false,dirty=false,now=0,dead=false;
 let saveRef=null,lastSaveText=null,incremental=false,acknowledged=null,proposalValue=null;const queue=[],timers=new Map();let timerId=0;const holds={};
 // Private task source: keep both task boundaries and the original ACK gate.
 // Do not expose MessageChannel to the engine: its timers still enter queue.
 const dispatchTask=(()=>{
  if(typeof self.MessageChannel!=='function')return fn=>nativeTimer(fn,0);
  const channel=new self.MessageChannel(),callbacks=[];
  channel.port1.onmessage=()=>{const fn=callbacks.shift();if(fn)fn();};
  return fn=>{callbacks.push(fn);channel.port2.postMessage(0);};
 })();
 Date.now=()=>now;self.MessageChannel=undefined;
 const emit=m=>self.postMessage({protocol,build,...stamp,...m});
 function kick(){if(!running&&!proposal&&!dead&&queue.length){running=true;dispatchTask(()=>{const task=queue.shift();dirty=false;try{task();}catch(e){dead=true;emit({type:'fatal',message:String(e.message||e)});}dispatchTask(()=>{try{if(dirty&&!dead)publish();}catch(e){dead=true;emit({type:'fatal',message:String(e.message||e)});}finally{running=false;kick();}},0);},0);}}
 self.setTimeout=(fn,delay=0)=>{const id=++timerId;timers.set(id,nativeTimer(()=>{queue.push(()=>{if(timers.has(id)){timers.delete(id);fn();}});kick();},delay));return id;};
 self.clearTimeout=id=>{if(timers.has(id)){nativeClear(timers.get(id));timers.delete(id);}};
 const host={now:()=>now,setNow:v=>{now=v;},changed(){dirty=true;if(engine&&!running&&!proposal){queue.push(()=>{dirty=true;});kick();}},yield(){return new Promise(resolve=>self.setTimeout(resolve,0));},allowed:kind=>!holds[kind],completed(id,status,value){if(receipts[id])receipts[id]={...receipts[id],status,value,...(status==='failed'?{message:String(value)}:{}),completedAt:revision+1};dirty=true;}};
 function publish(){const completed=Object.keys(receipts).filter(id=>receipts[id].status!=='pending').sort((a,b)=>(receipts[a].completedAt||0)-(receipts[b].completedAt||0)||Number(a)-Number(b));for(const id of completed.slice(0,Math.max(0,completed.length-32)))delete receipts[id];const snapshot=engine.checkpoint();let saveBlob;const text=snapshot.saveText;
if(text!==null&&(!saveRef||text!==lastSaveText)){saveRef=stamp.epoch+':'+(revision+1);lastSaveText=text;saveBlob={id:saveRef,text};}
snapshot.saveText=null;snapshot.saveRef=saveRef;let payload=P.encode({engine:snapshot,receipts,high}),encoding='full';
if(incremental){proposalValue=JSON.parse(payload);if(acknowledged){const delta=JSON.stringify(self.SessionDelta.compactDiff(acknowledged,proposalValue));if(delta.length<payload.length*.75){payload=delta;encoding='delta';}}}
proposal={type:'checkpoint',revision:revision+1,payload,...(incremental?{encoding,baseRevision:revision}:{}),receipts:JSON.parse(JSON.stringify(receipts)),...(saveBlob?{saveBlob}:{})};emit(proposal);}
 function processInput(m){
  const sig=JSON.stringify(m.body),old=receipts[m.seq];
  if(old){if(old.signature!==sig)throw Error('command identity changed');dirty=true;return;}
  if(Number.isSafeInteger(m.seq)&&m.seq>0&&m.seq<=high){emit({type:'retired',seq:m.seq,high});return;}
  if(!Number.isSafeInteger(m.seq)||m.seq!==high+1)throw Error('command sequence gap');
  high=m.seq;receipts[m.seq]={signature:sig,status:'pending'};dirty=true;
  try{const result=engine.command(m.body,m.seq);receipts[m.seq]={...receipts[m.seq],...result};if(result.status!=='pending')receipts[m.seq].completedAt=revision+1;}catch(e){receipts[m.seq]={signature:sig,status:'failed',message:String(e.message||e),completedAt:revision+1};}
 }
 self.onmessage=({data:m})=>{
  if(!m||m.protocol!==protocol||m.build!==build)return;
  if(m.type==='load'&&!engine&&!stamp){
   stamp={slot:m.slot,epoch:m.epoch};revision=m.revision;incremental=m.incremental===true&&!!self.SessionDelta;
   try{if(typeof m.slot!=='string'||!Number.isSafeInteger(m.epoch)||m.epoch<1||!Number.isSafeInteger(revision)||revision<0)throw Error('load identity');const data=P.decode(m.payload);receipts=m.restore?data.receipts:{};high=m.restore?data.high:0;
    for(const [id,r]of Object.entries(receipts))if(r.status==='pending')receipts[id]={...r,status:'cancelled',reason:'worker-restarted-before-commit',completedAt:revision+1};
    const initial=m.restore?data.engine:data;saveRef=initial.saveRef||null;
if(saveRef){if(!m.saveBlob||m.saveBlob.id!==saveRef||typeof m.saveBlob.text!=='string')throw Error('missing saved export for restore');initial.saveText=m.saveBlob.text;}
else if(m.saveBlob)throw Error('unexpected saved export');lastSaveText=initial.saveText||null;
engine=W.Simulation.SessionEngine.create(initial,host);publish();
   }catch(e){dead=true;emit({type:'fatal',message:String(e.message||e)});}return;
  }
  if(!stamp||m.slot!==stamp.slot||m.epoch!==stamp.epoch)return;
  if(m.type==='query'){if(proposal)emit(proposal);else emit({type:'status',revision,receipts});return;}
  if(m.type==='ack'){if(proposal&&m.revision===proposal.revision){revision=proposal.revision;acknowledged=proposalValue;proposalValue=null;proposal=null;kick();}return;}
  if(dead)return;
  if(m.type==='input'){queue.push(()=>processInput(m));kick();}
 };
}(self.WIS));
