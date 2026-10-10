import { validateDocument, fail } from './schema.mjs';
export function createDefaultDocument() {
  return { schemaVersion: 1, title: '我的比較', options: [{ id: 'o1', label: '方案 A' }, { id: 'o2', label: '方案 B' }], criteria: [{ id: 'c1', label: '考量 1', direction: 'benefit', weight: 1 }, { id: 'c2', label: '考量 2', direction: 'benefit', weight: 1 }], scores: [{ optionId: 'o1', values: [null, null] }, { optionId: 'o2', values: [null, null] }] };
}
function nextId(items, prefix) { let n = 1; while (items.some(item => item.id === prefix + n)) n++; return prefix + n; }
function nextLabel(items, prefix) { let n = items.length + 1; while (items.some(item => item.label === `${prefix} ${n}`)) n++; return `${prefix} ${n}`; }
function edit(input, kind, id, prefix) {
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const doc = checked.value;
  const options = kind.endsWith('Option');
  const items = options ? doc.options : doc.criteria;
  if (kind.startsWith('add')) {
    if (items.length >= 8) return fail('LIMIT_REACHED');
    const newId = nextId(items, options ? 'o' : 'c');
    const label = nextLabel(items, prefix || (options ? '方案' : '考量'));
    if (options) { items.push({ id: newId, label }); doc.scores.push({ optionId: newId, values: doc.criteria.map(() => null) }); }
    else { items.push({ id: newId, label, direction: 'benefit', weight: 1 }); for (const row of doc.scores) row.values.push(null); }
  } else {
    const index = items.findIndex(item => item.id === id);
    if (index < 0) return fail('INVALID_REFERENCE');
    if (items.length <= (options ? 2 : 1)) return fail('MINIMUM_REQUIRED');
    items.splice(index, 1);
    if (options) doc.scores.splice(index, 1); else for (const row of doc.scores) row.values.splice(index, 1);
  }
  return validateDocument(doc);
}
export const addOption = (doc, prefix) => edit(doc, 'addOption', null, prefix);
export const addCriterion = (doc, prefix) => edit(doc, 'addCriterion', null, prefix);
export const removeOption = (doc, id) => edit(doc, 'removeOption', id);
export const removeCriterion = (doc, id) => edit(doc, 'removeCriterion', id);
