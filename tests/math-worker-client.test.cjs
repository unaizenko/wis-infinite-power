'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(kind='training-gain'){let worker,localCount=0,current=true,ready=0;const timers=new Set(),W={Core:{Build:{buildId:'test'},Amount:{isAmount:v=>typeof v==='number'},BigNum:{isDecimal:v=>typeof v==='number'}},Simulation:{WorkerProtocol:{encode:JSON.stringify,decode:JSON.parse}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/simulation/math-worker.js'),'utf8'),{window:{WIS:W},setTimeout:f=>(timers.add(f),f),clearTimeout:f=>timers.delete(f)});
 const local=()=>{localCount++;return {advance:()=>({done:true}),result:()=>({gain:123}),cancel(){}};};
 const job=W.Simulation.MathWorker.createWork(kind,{}, {ids:['training']},{local,isCurrent:()=>current,factory:()=>worker={postMessage(m){this.request=m;},terminate(){this.dead=true;}}});job.onReady(()=>ready++);
 return {job,timers,get worker(){return worker;},get ready(){return ready;},get local(){return localCount;},invalidate(){current=false;},reply(type='result',fields={}){worker.onmessage({data:{...worker.request,type,payload:JSON.stringify({gain:456}),...fields}});}};
}
test('math worker waits without polling math; exact result delivered only on advance',()=>{const h=setup();assert.equal(h.job.advance({}).done,false);assert(h.job.waiting());assert.equal(h.local,0);h.reply();assert.equal(h.ready,1);assert.throws(()=>h.job.result());assert(h.job.advance({}).done);assert.deepEqual(JSON.parse(JSON.stringify(h.job.result())),{gain:456});assert(h.worker.dead);});
test('cancel, replaced owner and wrong identity cannot publish',()=>{for(const kind of ['cancel','replace','wrong']){const h=setup();h.job.advance({});if(kind==='cancel')h.job.cancel();else if(kind==='replace')h.invalidate();h.reply('result',kind==='wrong'?{requestId:-1}:{});assert.equal(h.ready,0);assert.throws(()=>h.job.result());h.job.cancel();}});
test('crash and malformed transfer fall back once, numeric error does not',()=>{for(const kind of ['crash','malformed','numeric']){const h=setup();h.job.advance({});if(kind==='crash')h.worker.onerror({preventDefault(){}});else h.reply(kind==='numeric'?'error':'result',kind==='numeric'?{code:'capacity',message:'capacity'}:{payload:'{'});if(kind==='numeric'){assert.throws(()=>h.job.advance({}),e=>e.code==='capacity');assert.equal(h.local,0);}else{assert(h.job.advance({}).done);assert.equal(h.local,1);assert.equal(h.job.result().gain,123);}h.job.cancel();}});
test('silent worker is terminated with explicit error; progress alone cannot finish',()=>{const h=setup();h.job.advance({});h.reply('progress',{progress:10});assert(h.job.waiting());for(const fn of [...h.timers])fn();assert.throws(()=>h.job.advance({}),e=>e.code==='math-worker-timeout');assert.equal(h.local,0);assert(h.worker.dead);h.job.cancel();});

test('valid JSON with missing or mismatched result fields is transport failure',()=>{
 for(const [kind,payload] of [['training-gain',{}],['training-gain',{gain:'1e100'}],['breathing-preview',{}],['breathing-preview',{value:{mana:1},records:[]}],['source-preview',{records:[]}],['source-preview',{records:[{id:'wrong',raw:1,final:2}],nextPowerJ:10}]]){
  const h=setup(kind);h.job.advance({});h.reply('result',{payload:JSON.stringify(payload)});assert(h.job.advance({}).done);assert.equal(h.local,1,kind+' accepted malformed result');h.job.cancel();
 }
});
