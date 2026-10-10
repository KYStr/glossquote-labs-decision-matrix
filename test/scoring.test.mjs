import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreDocument } from '../public/js/core/scoring.mjs';
import { createDefaultDocument } from '../public/js/core/matrix.mjs';
function base() { const d=createDefaultDocument(); d.criteria[0].weight=2; d.criteria[1].direction='cost'; d.scores[0].values=[5,5]; d.scores[1].values=[3,1]; return d; }
const near = (a,b) => assert.ok(Math.abs(a-b)<=1e-12, `${a} != ${b}`);
test('M01 no initial ranking; M08 missing invalidates the entire comparison', () => {
  assert.deepEqual(scoreDocument(createDefaultDocument()), {ok:false,code:'MISSING_SCORES',missingCount:4});
  const d=base(); d.scores[0].values[0]=null; assert.deepEqual(scoreDocument(d), {ok:false,code:'MISSING_SCORES',missingCount:1});
});
test('M02 independent hand-calculated tied benchmark and contributions', () => {
  const result=scoreDocument(base()).value;
  assert.equal(result.totalWeight,3); assert.deepEqual(result.ranked.map(r=>[r.optionId,r.numerator,r.rank,r.tied,r.score.toFixed(2)]), [['o1',8,1,true,'66.67'],['o2',8,1,true,'66.67']]);
  near(result.ranked[0].contributions[0].contribution,200/3); near(result.ranked[0].contributions[1].contribution,0);
  near(result.ranked[1].contributions[0].contribution,100/3); near(result.ranked[1].contributions[1].contribution,100/3);
});
test('M03 independent 100/0 extremes', () => {
  const d=base(); d.scores[0].values=[5,1];d.scores[1].values=[1,5];
  assert.deepEqual(scoreDocument(d).value.ranked.map(r=>[r.numerator,r.score,r.rank]), [[12,100,1],[0,0,2]]);
});
test('M04 competition ranks 1/1/3 with original-order ties', () => {
  const d=createDefaultDocument(); d.criteria.pop(); d.options.push({id:'o3',label:'C'}); d.scores=[{optionId:'o1',values:[5]},{optionId:'o2',values:[5]},{optionId:'o3',values:[1]}];
  assert.deepEqual(scoreDocument(d).value.ranked.map(r=>[r.rank,r.tied]), [[1,true],[1,true],[3,false]]);
});
test('M05 cost inversion keeps input scores; M06 zero, M07 ignored null', () => {
  const d=createDefaultDocument(); d.criteria.pop(); d.criteria[0].direction='cost'; d.scores[0].values=[1]; d.scores[1].values=[5];
  assert.deepEqual(scoreDocument(d).value.ranked.map(r=>[r.optionId,r.score]), [['o1',100],['o2',0]]);
  d.criteria[0].direction='benefit'; assert.equal(scoreDocument(d).value.ranked[0].optionId,'o2');
  const zero=createDefaultDocument(); zero.criteria.forEach(c=>{c.weight=0;});assert.deepEqual(scoreDocument(zero),{ok:false,code:'ZERO_WEIGHT'});
  const ignored=createDefaultDocument();ignored.criteria[1].weight=0;ignored.scores[0].values[0]=5;ignored.scores[1].values[0]=3;
  assert.deepEqual(scoreDocument(ignored).value.ranked.map(r=>r.score),[100,50]);
  const invalid=base();invalid.title='';assert.equal(scoreDocument(invalid).code,'INVALID_LABEL');
});
