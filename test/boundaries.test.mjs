import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLabel,validateDocument } from '../public/js/core/schema.mjs';
import { parseImportBytes,serializeDocument } from '../public/js/core/json-import.mjs';
import { scoreDocument } from '../public/js/core/scoring.mjs';
import { createDefaultDocument,addOption,addCriterion } from '../public/js/core/matrix.mjs';
import { createImportController } from '../public/js/file-io.mjs';
test('FR02 all C0/C1/bidi controls at either edge; raw limits before normalization',()=>{
  const points=[...Array.from({length:32},(_,i)=>i),...Array.from({length:33},(_,i)=>127+i),...Array.from({length:5},(_,i)=>0x202a+i),...Array.from({length:4},(_,i)=>0x2066+i)];
  for(const p of points)for(const raw of [String.fromCodePoint(p)+'name','name'+String.fromCodePoint(p)])assert.equal(normalizeLabel(raw).code,'INVALID_LABEL');
  assert.equal(normalizeLabel(' '.repeat(80)+'a').code,'INVALID_LABEL');
  assert.equal(normalizeLabel(' '.repeat(160)+'a',true).code,'INVALID_LABEL');
});
test('FR05 property checks: both directions, bounded score/weights, scaling invariance',()=>{
  for(const direction of ['benefit','cost'])for(const weight of [0,1,100])for(let a=1;a<=5;a++)for(let b=1;b<=5;b++){
    const d=createDefaultDocument();d.criteria.pop();d.criteria[0].direction=direction;d.criteria[0].weight=weight;d.scores[0].values=[a];d.scores[1].values=[b];const r=scoreDocument(d);
    if(weight===0){assert.equal(r.code,'ZERO_WEIGHT');continue;}
    for(const row of r.value.ranked){assert.ok(row.score>=0&&row.score<=100);assert.ok(Number.isInteger(row.numerator));}
  }
  const d=createDefaultDocument();d.criteria[0].weight=2;d.criteria[1].weight=1;d.criteria[1].direction='cost';d.scores[0].values=[4,2];d.scores[1].values=[2,4];const before=scoreDocument(d).value;
  for(const factor of [2,10,50]){const copy=structuredClone(d);copy.criteria.forEach(c=>{c.weight*=factor;});const after=scoreDocument(copy).value;assert.deepEqual(after.ranked.map(r=>[r.optionId,r.score,r.rank,r.tied]),before.ranked.map(r=>[r.optionId,r.score,r.rank,r.tied]));}
});
test('FR05 maximum 8x8 exact integer budget and serialized roundtrip',()=>{
  let d=createDefaultDocument();while(d.options.length<8)d=addOption(d).value;while(d.criteria.length<8)d=addCriterion(d).value;
  d.criteria.forEach(c=>{c.weight=100;c.label='名'.repeat(39)+c.id.at(-1);});d.options.forEach(o=>{o.label='😀'.repeat(39)+o.id.at(-1);});d.scores.forEach(r=>{r.values.fill(5);});
  const result=scoreDocument(d).value;assert.equal(result.totalWeight,800);assert.ok(result.ranked.every(r=>r.numerator===3200&&r.score===100&&r.rank===1&&r.tied));
  const exported=serializeDocument(d);assert.ok(exported.value.byteLength<65536);assert.deepEqual(parseImportBytes(exported.value).value,validateDocument(d).value);
});
test('FR10 scanner nested escapes and deterministic malformed input return fixed codes only',()=>{
  const sources=[String.raw`{"a":{"x":1,"\u0078":2}}`,String.raw`{"a":["\\\"{,}:"],"\u0061":0}`];
  for(const source of sources)assert.equal(parseImportBytes(new TextEncoder().encode(source)).code,'DUPLICATE_KEY');
  for(const source of ['','null','[]','{"x":NaN}','{"x":Infinity}','{"x":1,}', '"\\ud800"', '['.repeat(500)+']'.repeat(500)]){const r=parseImportBytes(new TextEncoder().encode(source));assert.equal(r.ok,false);assert.deepEqual(Object.keys(r),['ok','code']);}
});
test('FR11 rapid read/cancel/reset generations cannot present stale reviews',async()=>{
  const pending=[],states=[];const io=createImportController({onState:s=>states.push(s),readFile:()=>new Promise(resolve=>pending.push(resolve))});
  const jobs=[];for(let i=0;i<20;i++){jobs.push(io.start({size:1}));io.cancel();}
  for(const resolve of pending.reverse())resolve(serializeDocument(createDefaultDocument()).value.buffer);await Promise.all(jobs);assert.ok(!states.some(s=>s.state==='review'));assert.equal(io.accept(),null);
});
