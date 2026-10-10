import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultDocument,addOption,addCriterion,removeOption,removeCriterion } from '../public/js/core/matrix.mjs';
test('M17 options 2..8, criteria 1..8, failure preserves draft', () => {
  let d=createDefaultDocument(); assert.equal(removeOption(d,'o1').code,'MINIMUM_REQUIRED');
  while(d.options.length<8)d=addOption(d).value; const before=structuredClone(d);
  assert.equal(addOption(d).code,'LIMIT_REACHED'); assert.deepEqual(d,before);
  while(d.criteria.length<8)d=addCriterion(d).value;
  assert.equal(addCriterion(d).code,'LIMIT_REACHED'); assert.ok(d.scores.every(r=>r.values.length===8));
  while(d.criteria.length>1)d=removeCriterion(d,d.criteria.at(-1).id).value;
  assert.equal(removeCriterion(d,d.criteria[0].id).code,'MINIMUM_REQUIRED');assert.equal(removeCriterion(d,'c999').code,'INVALID_REFERENCE');
});
test('M17 middle-column deletion keeps references, values and immutability', () => {
  const d=addCriterion(createDefaultDocument()).value;d.scores[0].values=[1,2,3]; d.scores[1].values=[4,5,1];const before=structuredClone(d);
  const next=removeCriterion(d,'c2').value;assert.deepEqual(next.scores.map(r=>r.values),[[1,3],[4,1]]);assert.deepEqual(next.criteria.map(c=>c.id),['c1','c3']);assert.deepEqual(d,before);
  const reused=addCriterion(next).value;assert.equal(reused.criteria.at(-1).id,'c2');assert.equal(reused.criteria.at(-1).label,'考量 4');
});
test('M17 unique generated names, rows and reusable ids', () => {
  let d=createDefaultDocument();d.options[0].label='方案 3';d=addOption(d).value;assert.equal(d.options.at(-1).label,'方案 4');
  d=addOption(d).value;d.scores[2].values=[5,1];const next=removeOption(d,'o3').value;assert.deepEqual(next.scores.map(r=>r.optionId),['o1','o2','o4']);
  assert.equal(addOption(next).value.options.at(-1).id,'o3');assert.deepEqual(addCriterion(d).value.scores.at(-1).values,[null,null,null]);
});
