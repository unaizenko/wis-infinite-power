'use strict';
const assert=require('node:assert/strict');
const proxies=new WeakSet(),metadata=new WeakMap();
function once(source,anchor,replacement){assert.equal(source.split(anchor).length-1,1,anchor);return source.replace(anchor,replacement);}
function transformSource(file,s){
 if(file==='js/core/state.js'){
  s=once(s,'const nodes=new WeakMap(),changedNodes=',"const draftTrace=new Error('draft origin').stack;const nodes=new WeakMap(),changedNodes=");
  s=once(s,'nodes.set(proxy,node);return node;',"nodes.set(proxy,node);globalThis.__registerDraftProxy?.(proxy,{key,trace:draftTrace});return node;");
 }
 if(file==='js/simulation/step.js'){
  s=once(s,'if(draft)candidate=draft.finish();R.setState(candidate);',"if(draft)candidate=draft.finish();globalThis.__auditDraftCommit?.(candidate,'online-candidate');R.setState(candidate);");
  const anchor='Object.assign(state,{core:value.candidate.core,powerSystem:value.candidate.powerSystem,cultivation:value.candidate.cultivation,meta:value.candidate.meta});';
  s=once(s,anchor,anchor+"globalThis.__auditDraftCommit?.(state,'online-install');");
  s=once(s,'Object.assign(original, draft.finish());',"Object.assign(original, draft.finish());globalThis.__auditDraftCommit?.(original,'direct-install');");
 }
 if(file==='js/simulation/fixed-segment.js')s=once(s,'confirm(value.unit,value.result,value.workMs);',"globalThis.__auditDraftCommit?.(state,'offline-install');confirm(value.unit,value.result,value.workMs);");
 return s;
}
function findDraftProxies(state){const seen=new WeakSet(),found=[];function visit(v,p){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(proxies.has(v)){found.push({path:p,...metadata.get(v)});return;}for(const k of Object.keys(v))visit(v[k],p+'.'+k);}for(const key of ['core','powerSystem','cultivation','meta'])visit(state[key],'state.'+key);return found;}
function assertNoDraftProxies(state){assert.deepEqual(findDraftProxies(state),[],'Committed state contains draft proxies');}
function bind(context,hook){context.__registerDraftProxy=(proxy,info)=>{proxies.add(proxy);metadata.set(proxy,info);};context.__auditDraftCommit=hook||assertNoDraftProxies;}
module.exports={transformSource,bind,findDraftProxies,assertNoDraftProxies};
