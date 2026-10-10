import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDocument, normalizeLabel, parseUIWeight } from '../public/js/core/schema.mjs';
import { createDefaultDocument } from '../public/js/core/matrix.mjs';
const code = (doc, expected) => assert.deepEqual(validateDocument(doc), { ok: false, code: expected });
test('M09 NFC, trim, duplicate labels and empty title', () => {
  let doc = createDefaultDocument(); doc.options[1].label = doc.options[0].label; code(doc, 'DUPLICATE_LABEL');
  doc = createDefaultDocument(); doc.options[0].label = String.fromCodePoint(0xe9); doc.options[1].label = String.fromCodePoint(0x65, 0x301); code(doc, 'DUPLICATE_LABEL');
  doc = createDefaultDocument(); doc.title = '  '; code(doc, 'INVALID_LABEL');
  doc = createDefaultDocument(); doc.title = '  測試  '; const original = structuredClone(doc);
  const result = validateDocument(doc); assert.equal(result.value.title, '測試'); assert.deepEqual(doc, original); assert.notEqual(result.value.scores[0].values, doc.scores[0].values);
  doc.options[0].label = 'x'; doc.options[1].label = 'X'; assert.equal(validateDocument(doc).ok, true);
});
test('M10 Unicode raw and code-point limits; control characters rejected before trim', () => {
  for (const raw of ['a'.repeat(81), '😀'.repeat(81), '\nname', 'name\r', '\u202ename', 'name\u2066', '\ud800', '\udc00', '\u0085name']) assert.equal(normalizeLabel(raw, true).code, 'INVALID_LABEL');
  assert.equal(normalizeLabel('😀'.repeat(80), true).ok, true);
  assert.equal(normalizeLabel('😀'.repeat(40)).ok, true);
  assert.equal(normalizeLabel('a'.repeat(41)).code, 'INVALID_LABEL');
  assert.equal(normalizeLabel(' '.repeat(81)).code, 'INVALID_LABEL');
  assert.equal(normalizeLabel(' '.repeat(161), true).code, 'INVALID_LABEL');
});
test('M11 weights and scores do not coerce imported numbers', () => {
  for (const weight of [-1, 101, 1.5, '2', Infinity, NaN, null, true]) { const doc = createDefaultDocument(); doc.criteria[0].weight = weight; code(doc, 'INVALID_WEIGHT'); }
  for (const score of [0, 6, 1.5, '5', Infinity, NaN, undefined, true]) { const doc = createDefaultDocument(); doc.scores[0].values[0] = score; code(doc, 'INVALID_SCORE'); }
  for (const raw of ['0', '1', '100', ' 0002 ', '\t03\r']) assert.equal(parseUIWeight(raw).ok, true);
  for (const raw of ['', '1.0', '1e2', '+1', '-1', '１２', '١', '101', '123456789', '\u00a01']) assert.equal(parseUIWeight(raw).code, 'INVALID_WEIGHT');
});
test('M12 exact keys, ordinary objects, fields and unknown version', () => {
  for (const extra of ['extra', '__proto__', 'constructor', 'prototype']) { const doc = createDefaultDocument(); Object.defineProperty(doc, extra, {value:0, enumerable:true}); code(doc, 'INVALID_SCHEMA'); }
  let doc = createDefaultDocument(); delete doc.title; code(doc, 'INVALID_SCHEMA');
  doc = createDefaultDocument(); doc.options[0] = JSON.parse('{"id":"o1","label":"A","__proto__":{}}'); code(doc, 'INVALID_SCHEMA');
  doc = createDefaultDocument(); doc.schemaVersion = 2; code(doc, 'UNKNOWN_VERSION');
  doc = createDefaultDocument(); doc.criteria[0].direction = 'unknown'; code(doc, 'INVALID_SCHEMA');
  code(null, 'INVALID_SCHEMA'); code([], 'INVALID_SCHEMA'); code(Object.create(null), 'INVALID_SCHEMA');
  doc = createDefaultDocument(); Object.defineProperty(doc,'title',{get(){throw new Error('should not run');},enumerable:true}); code(doc, 'INVALID_SCHEMA');
});
test('M15 fixed reference and structural error codes', () => {
  const cases = [
    [d => {d.options[1].id = 'o1';}, 'INVALID_REFERENCE'],
    [d => {d.options[0].id = 'o0';}, 'INVALID_REFERENCE'],
    [d => {d.criteria[1].id = 'c1';}, 'INVALID_REFERENCE'],
    [d => {d.scores.reverse();}, 'INVALID_REFERENCE'],
    [d => {d.scores[0].optionId = 'o999';}, 'INVALID_REFERENCE'],
    [d => {d.scores.pop();}, 'INVALID_SCHEMA'],
    [d => {d.scores[0].values.pop();}, 'INVALID_SCHEMA'],
    [d => {d.options = [d.options[0]];}, 'INVALID_SCHEMA']
  ];
  for (const [change, expected] of cases) { const doc = createDefaultDocument(); change(doc); code(doc, expected); }
});
