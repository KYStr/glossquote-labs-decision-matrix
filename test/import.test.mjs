import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImportBytes, serializeDocument, serializeWithEncoder, scanJSONStructure } from '../public/js/core/json-import.mjs';
import { createDefaultDocument } from '../public/js/core/matrix.mjs';
const bytes = s => new TextEncoder().encode(s);
test('M13 literal and escape-decoded duplicate title; frame isolation', () => {
  const tail = '"options":[{"id":"o1","label":"A"},{"id":"o2","label":"B"}],"criteria":[{"id":"c1","label":"C","direction":"benefit","weight":1}],"scores":[{"optionId":"o1","values":[5]},{"optionId":"o2","values":[3]}]}';
  for (const source of ['{"schemaVersion":1,"title":"A","title":"B",'+tail, String.raw`{"schemaVersion":1,"title":"A","\u0074itle":"B",`+tail]) assert.equal(parseImportBytes(bytes(source)).code, 'DUPLICATE_KEY');
  const valid = String.raw`{"title":"brace } [ , : \\ \" title","child":{"same":1},"array":[{"same":2},"str"],"same":3}`;
  assert.doesNotThrow(() => JSON.parse(valid)); assert.equal(scanJSONStructure(valid).ok, true);
  assert.equal(scanJSONStructure('{"a":[{"key":1,"key":2}]}').code, 'DUPLICATE_KEY');
  assert.equal(scanJSONStructure('{"a":[1,2],"a":3}').code, 'DUPLICATE_KEY');
});
test('M14 bytes, fatal UTF-8, syntax and depth gates in specified order', () => {
  assert.equal(parseImportBytes(new Uint8Array(65537)).code, 'FILE_TOO_LARGE');
  assert.equal(parseImportBytes(new Uint8Array([0xc3,0x28])).code, 'INVALID_UTF8');
  assert.equal(parseImportBytes(bytes('{"x":')).code, 'INVALID_JSON');
  assert.equal(parseImportBytes(bytes('['.repeat(9)+'0'+']'.repeat(9))).code, 'TOO_DEEP');
  assert.equal(scanJSONStructure('['.repeat(8)+'0'+']'.repeat(8)).ok, true);
  assert.equal(parseImportBytes('string').code, 'INVALID_SCHEMA');
  const source = JSON.stringify(createDefaultDocument());
  const boundary = bytes(source + ' '.repeat(65536 - bytes(source).byteLength));
  assert.equal(boundary.byteLength, 65536); assert.equal(parseImportBytes(boundary).ok, true);
  assert.equal(parseImportBytes(bytes('\ufeff'+source)).ok, true);
  assert.equal(parseImportBytes(bytes('\ufeff\ufeff'+source)).code, 'INVALID_JSON');
  const infinite = source.replace('"weight":1', '"weight":1e999'); assert.equal(parseImportBytes(bytes(infinite)).code, 'INVALID_WEIGHT');
});
test('M16 UTF-8 roundtrip of incomplete draft and benchmark; no metadata', () => {
  const benchmark = createDefaultDocument(); benchmark.criteria[0].weight = 2; benchmark.criteria[1].direction = 'cost'; benchmark.scores[0].values = [5,5]; benchmark.scores[1].values = [3,1];
  for (const doc of [createDefaultDocument(), benchmark]) {
    const result = serializeDocument(doc); assert.equal(result.ok, true); assert.ok(result.value instanceof Uint8Array);
    const source = new TextDecoder().decode(result.value); assert.equal(source.at(-1), '\n'); assert.notEqual(source.at(-2), '\n'); assert.notEqual(result.value[0], 0xef);
    assert.deepEqual(parseImportBytes(result.value), {ok:true,value:doc}); assert.deepEqual(Object.keys(JSON.parse(source)), ['schemaVersion','title','options','criteria','scores']);
  }
  const bad = createDefaultDocument(); bad.title = ''; assert.equal(serializeDocument(bad).code, 'INVALID_LABEL');
  assert.equal(serializeWithEncoder(createDefaultDocument(), {encode(){throw new Error('FAKE_ENCODER');}}).code, 'EXPORT_FAILED');
  assert.equal(serializeWithEncoder(createDefaultDocument(), {encode(){return new Uint8Array(65537);}}).code, 'EXPORT_FAILED');
});
