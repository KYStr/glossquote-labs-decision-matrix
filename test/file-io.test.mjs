import test from 'node:test';
import assert from 'node:assert/strict';
import { createImportController,createDownloader,supportsFileIO } from '../public/js/file-io.mjs';
import { createDefaultDocument } from '../public/js/core/matrix.mjs';
import { serializeDocument } from '../public/js/core/json-import.mjs';
const buffer=()=>serializeDocument(createDefaultDocument()).value.buffer;
test('M19 latest read wins; cancellation, stale rejection, exact size before and after read',async()=>{
  const pending=[],states=[];let calls=0;
  const io=createImportController({onState:s=>states.push(s),readFile:()=>{calls++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));}});
  const a=io.start({size:500}),b=io.start({size:500});pending[1].resolve(buffer());await b;assert.equal(states.at(-1).state,'review');
  pending[0].resolve(buffer());await a;assert.equal(states.filter(s=>s.state==='review').length,1);
  const accepted=io.accept();assert.equal(accepted.title,'我的比較');assert.equal(io.accept(),null);
  const c=io.start({size:500});io.cancel();pending[2].reject(new Error('FAKE'));await c;assert.equal(states.at(-1).state,'idle');
  await io.start({size:65537});assert.equal(calls,3);assert.equal(states.at(-1).code,'FILE_TOO_LARGE');
  const d=io.start({size:1});pending[3].resolve(new Uint8Array(65537).buffer);await d;assert.equal(states.at(-1).code,'FILE_TOO_LARGE');assert.equal(io.accept(),null);
});
test('M19 invalid/rejected files and cancelled review never become a draft',async()=>{
  const states=[];
  const io=createImportController({onState:s=>states.push(s),readFile:async f=>{if(f.bad)throw new Error('FAKE_PATH');return f.bytes;}});
  await io.start({size:1,bytes:new Uint8Array([0x7b]).buffer});assert.equal(states.at(-1).code,'INVALID_JSON');assert.equal(io.accept(),null);
  await io.start({size:1,bad:true});assert.equal(states.at(-1).code,'READ_FAILED');
  await io.start({size:500,bytes:buffer()});io.cancel();assert.equal(io.accept(),null);
  assert.ok(!JSON.stringify(states).includes('FAKE_PATH'));
});
test('M22 ten downloads keep at most one URL, fixed name, UTF8 Blob and delayed revoke',()=>{
  const live=new Set(),timers=new Map(),names=[];let counter=0,timerId=0;
  const download=createDownloader({URLApi:{createObjectURL(blob){assert.equal(blob.type,'application/json');const url='blob:'+ ++counter;live.add(url);return url;},revokeObjectURL(url){live.delete(url);}},setTimer:(fn,ms)=>{assert.equal(ms,60000);const id=++timerId;timers.set(id,fn);return id;},clearTimer:id=>timers.delete(id),trigger:(url,name)=>names.push([url,name])});
  for(let i=0;i<10;i++){assert.equal(download.download(createDefaultDocument()).ok,true);assert.equal(live.size,1);assert.equal(timers.size,1);}
  assert.ok(names.every(([,name])=>name==='glossquote-decision-matrix.json'));[...timers.values()][0]();assert.equal(live.size,0);assert.equal(timers.size,0);
  download.download(createDefaultDocument());download.clear();download.clear();assert.equal(live.size,0);assert.equal(timers.size,0);
});
test('M22 download failures return fixed code and release URL',()=>{
  const revoked=[];const doc=createDefaultDocument(),before=structuredClone(doc);
  const download=createDownloader({URLApi:{createObjectURL:()=> 'blob:fake',revokeObjectURL:u=>revoked.push(u)},trigger(){throw new Error('FAKE_SECRET');}});
  assert.deepEqual(download.download(doc),{ok:false,code:'EXPORT_FAILED'});assert.deepEqual(revoked,['blob:fake']);assert.deepEqual(doc,before);
  doc.title='';assert.equal(download.download(doc).code,'INVALID_LABEL');
});
test('M26 absent File/Blob/TextDecoder disables IO without loading a service',()=>{
  const cap={File,Blob,TextDecoder,TextEncoder,URL,document:{createElement:()=>({download:''})}};assert.equal(supportsFileIO(cap),true);
  for(const key of ['File','Blob','TextDecoder','TextEncoder','URL','document'])assert.equal(supportsFileIO({...cap,[key]:undefined}),false);
});
