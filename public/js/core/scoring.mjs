import { validateDocument, fail } from './schema.mjs';
export function scoreDocument(input) {
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const doc = checked.value;
  const totalWeight = doc.criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return fail('ZERO_WEIGHT');
  const missingCount = doc.scores.reduce((sum, row) => sum + row.values.filter((s, i) => s === null && doc.criteria[i].weight > 0).length, 0);
  if (missingCount) return { ...fail('MISSING_SCORES'), missingCount };
  const ranked = doc.options.map((option, index) => {
    let numerator = 0;
    const contributions = doc.criteria.map((criterion, j) => {
      const score = doc.scores[index].values[j];
      const utility = criterion.weight === 0 ? 0 : criterion.direction === 'benefit' ? score - 1 : 5 - score;
      const part = criterion.weight * utility;
      numerator += part;
      return { criterionId: criterion.id, utility, numerator: part, contribution: 25 * part / totalWeight };
    });
    return { optionId: option.id, numerator, score: 25 * numerator / totalWeight, rank: 0, tied: false, contributions };
  }).sort((a, b) => b.numerator - a.numerator);
  for (let i = 0; i < ranked.length; i++) {
    const row = ranked[i];
    row.rank = i > 0 && row.numerator === ranked[i - 1].numerator ? ranked[i - 1].rank : i + 1;
    row.tied = ranked.some(other => other !== row && other.numerator === row.numerator);
  }
  return { ok: true, value: { totalWeight, ranked } };
}
