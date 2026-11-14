(function(g){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),bytes=x=>new TextEncoder().encode(typeof x==='string'?x:JSON.stringify(x)).length,bad=k=>['__proto__','constructor','prototype'].includes(k);
function diff(a,b,path=[],out=[]){if(Object.is(a,b))return out;const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);if(obj(a)&&obj(b)){const ak=Object.keys(a),bk=Object.keys(b);if(JSON.stringify(ak)===JSON.stringify(bk)&&!bk.some(bad)){for(const k of bk)diff(a[k],b[k],[...path,k],out);return out;}}if(JSON.stringify(a)!==JSON.stringify(b))out.push({path,value:clone(b)});return out;}
function apply(base,ops){let value=clone(base);if(!Array.isArray(ops))throw Error('invalid redo');for(const op of ops){if(!op||!Array.isArray(op.path)||!Object.hasOwn(op,'value')||op.path.some(k=>typeof k!=='string'||bad(k)))throw Error('invalid redo path');if(!op.path.length){value=clone(op.value);continue;}let p=value;for(const k of op.path.slice(0,-1)){if(!p||typeof p!=='object'||!Object.hasOwn(p,k))throw Error('missing redo parent');p=p[k];}if(!p||typeof p!=='object')throw Error('invalid redo parent');Object.defineProperty(p,op.path.at(-1),{value:clone(op.value),enumerable:true,writable:true,configurable:true});}return value;}
// Packed JSON values only. Copy changed ancestors; never mutate an acknowledged base.
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function compactDiff(a,b,path=[],out=[]){
 if(Object.is(a,b))return out;
 if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){for(let i=0;i<b.length;i++)compactDiff(a[i],b[i],[...path,String(i)],out);return out;}
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(object(a)&&object(b)){const keys=Object.keys(b);if(JSON.stringify(Object.keys(a))===JSON.stringify(keys)&&!keys.some(bad)){for(const k of keys)compactDiff(a[k],b[k],[...path,k],out);return out;}}
 const full={path,value:clone(b)};
 if(typeof a==='string'&&typeof b==='string'&&b.length>=256){
  let prefix=0,suffix=0;while(prefix<Math.min(a.length,b.length)&&a[prefix]===b[prefix])prefix++;
  while(suffix<Math.min(a.length,b.length)-prefix&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
  const patch={path,text:{prefix,suffix,value:b.slice(prefix,b.length-suffix)}};
  if(JSON.stringify(patch).length<JSON.stringify(full).length){out.push(patch);return out;}
 }
 if(Array.isArray(a)&&Array.isArray(b)){
  const equal=(x,y)=>JSON.stringify(x)===JSON.stringify(y);let index=0,suffix=0;
  while(index<Math.min(a.length,b.length)&&equal(a[index],b[index]))index++;
  while(suffix<Math.min(a.length,b.length)-index&&equal(a[a.length-1-suffix],b[b.length-1-suffix]))suffix++;
  const patch={path,splice:{index,deleteCount:a.length-index-suffix,items:clone(b.slice(index,b.length-suffix))}};
  if(JSON.stringify(patch).length<JSON.stringify(full).length){out.push(patch);return out;}
 }
 if(JSON.stringify(a)!==JSON.stringify(b))out.push(full);return out;
}
function applyShared(base,ops){
 if(!Array.isArray(ops))throw Error('invalid redo');let value=base;const owned=new WeakSet(),copies=[];
 const copy=node=>{if(!node||typeof node!=='object')throw Error('invalid redo parent');if(owned.has(node))return node;const out=Array.isArray(node)?node.slice():{...node};owned.add(out);copies.push(out);return out;};
 const key=(parent,k)=>{if(Array.isArray(parent)&&(!/^(0|[1-9][0-9]*)$/.test(k)||!Number.isSafeInteger(Number(k))||Number(k)>=parent.length))throw Error('invalid redo array index');};
 const replacement=(prior,op)=>{
  if(['value','text','splice'].filter(k=>Object.hasOwn(op,k)).length!==1)throw Error('invalid redo operation');
  if(Object.hasOwn(op,'value'))return freeze(clone(op.value));
  if(Object.hasOwn(op,'text')){const t=op.text;if(typeof prior!=='string'||!t||!Number.isSafeInteger(t.prefix)||!Number.isSafeInteger(t.suffix)||t.prefix<0||t.suffix<0||t.prefix+t.suffix>prior.length||typeof t.value!=='string')throw Error('invalid text patch');return prior.slice(0,t.prefix)+t.value+prior.slice(prior.length-t.suffix);}
  const a=op.splice;if(!Array.isArray(prior)||!a||!Number.isSafeInteger(a.index)||!Number.isSafeInteger(a.deleteCount)||a.index<0||a.deleteCount<0||a.index+a.deleteCount>prior.length||!Array.isArray(a.items))throw Error('invalid array splice');return freeze(prior.slice(0,a.index).concat(clone(a.items),prior.slice(a.index+a.deleteCount)));
 };
 for(const op of ops){
  if(!op||!Array.isArray(op.path)||op.path.some(k=>typeof k!=='string'||bad(k)))throw Error('invalid redo path');
  if(!op.path.length){value=replacement(value,op);continue;}
  value=copy(value);let parent=value;
  for(const k of op.path.slice(0,-1)){key(parent,k);if(!Object.hasOwn(parent,k))throw Error('missing redo parent');parent[k]=copy(parent[k]);parent=parent[k];}
  const k=op.path.at(-1);key(parent,k);Object.defineProperty(parent,k,{value:replacement(parent[k],op),enumerable:true,writable:true,configurable:true});
 }
 for(const node of copies)Object.freeze(node);return value;
}
function normalize(s){return {initial:s.checkpoint?null:s.initial,checkpoint:s.checkpoint?JSON.parse(s.checkpoint):null,revision:s.revision,nextSeq:s.nextSeq,journal:clone(s.journal)};}
function expand(s){return {...clone(s),checkpoint:s.checkpoint?JSON.stringify(s.checkpoint):null,receipts:clone(s.checkpoint?.receipts||{}),saveText:s.checkpoint?.engine?.saveText||null};}
const api={clone,bytes,diff,compactDiff,apply,applyShared,freeze,normalize,expand};if(typeof module==='object'&&module.exports)module.exports=api;else g.SessionDelta=api;
}(typeof window==='object'?window:globalThis));
