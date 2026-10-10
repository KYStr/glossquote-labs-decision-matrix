export const fail = code => ({ ok: false, code });
const success = value => ({ ok: true, value });

function exactObject(value, keys) {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).length === keys.length && keys.every(key => Object.hasOwn(descriptors, key) && Object.hasOwn(descriptors[key], 'value') && descriptors[key].enumerable);
}
export function normalizeLabel(raw, title = false) {
  if (typeof raw !== 'string' || raw.length > (title ? 160 : 80) || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(raw)) return fail('INVALID_LABEL');
  for (let i = 0; i < raw.length; i++) {
    const unit = raw.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = raw.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return fail('INVALID_LABEL');
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return fail('INVALID_LABEL');
  }
  const value = raw.normalize('NFC').trim();
  const length = [...value].length;
  return length >= 1 && length <= (title ? 80 : 40) ? success(value) : fail('INVALID_LABEL');
}
export function parseUIWeight(raw) {
  if (typeof raw !== 'string' || raw.length > 8 || !/^[\t\n\v\f\r ]*[0-9]+[\t\n\v\f\r ]*$/u.test(raw)) return fail('INVALID_WEIGHT');
  const value = Number(raw.trim());
  return Number.isInteger(value) && value >= 0 && value <= 100 ? success(value) : fail('INVALID_WEIGHT');
}
export function validateDocument(input) {
  try { return validate(input); } catch { return fail('INVALID_SCHEMA'); }
}
function validate(doc) {
  if (!exactObject(doc, ['schemaVersion', 'title', 'options', 'criteria', 'scores'])) return fail('INVALID_SCHEMA');
  if (!Number.isInteger(doc.schemaVersion) || doc.schemaVersion !== 1) return fail('UNKNOWN_VERSION');
  if (!Array.isArray(doc.options) || doc.options.length < 2 || doc.options.length > 8 || !Array.isArray(doc.criteria) || doc.criteria.length < 1 || doc.criteria.length > 8 || !Array.isArray(doc.scores) || doc.scores.length !== doc.options.length) return fail('INVALID_SCHEMA');
  if (!doc.options.every(o => exactObject(o, ['id', 'label'])) || !doc.criteria.every(c => exactObject(c, ['id', 'label', 'direction', 'weight'])) || !doc.scores.every(s => exactObject(s, ['optionId', 'values']) && Array.isArray(s.values) && s.values.length === doc.criteria.length)) return fail('INVALID_SCHEMA');
  const optionIds = new Set(), criterionIds = new Set();
  for (let i = 0; i < doc.options.length; i++) {
    const id = doc.options[i].id;
    if (typeof id !== 'string' || !/^o[1-9][0-9]{0,5}$/u.test(id) || optionIds.has(id) || doc.scores[i].optionId !== id) return fail('INVALID_REFERENCE');
    optionIds.add(id);
  }
  for (const c of doc.criteria) {
    if (typeof c.id !== 'string' || !/^c[1-9][0-9]{0,5}$/u.test(c.id) || criterionIds.has(c.id)) return fail('INVALID_REFERENCE');
    criterionIds.add(c.id);
    if (!['benefit', 'cost'].includes(c.direction)) return fail('INVALID_SCHEMA');
    if (!Number.isInteger(c.weight) || c.weight < 0 || c.weight > 100) return fail('INVALID_WEIGHT');
  }
  for (const row of doc.scores) for (const score of row.values) if (score !== null && (!Number.isInteger(score) || score < 1 || score > 5)) return fail('INVALID_SCORE');
  const title = normalizeLabel(doc.title, true);
  if (!title.ok) return title;
  const options = [], criteria = [];
  for (const [items, out] of [[doc.options, options], [doc.criteria, criteria]]) {
    const labels = new Set();
    for (const item of items) {
      const label = normalizeLabel(item.label);
      if (!label.ok) return label;
      if (labels.has(label.value)) return fail('DUPLICATE_LABEL');
      labels.add(label.value);
      out.push(out === options ? { id: item.id, label: label.value } : { id: item.id, label: label.value, direction: item.direction, weight: item.weight });
    }
  }
  return success({ schemaVersion: 1, title: title.value, options, criteria, scores: doc.scores.map(row => ({ optionId: row.optionId, values: [...row.values] })) });
}
