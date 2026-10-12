import { scoreDocument } from './scoring.mjs';

// Ranking, validation and utility come exclusively from scoreDocument.
// This derived view never becomes part of the editable/exported document.
export function compareLeadingPair(input) {
  const scored = scoreDocument(input);
  if (!scored.ok) return scored;
  const { ranked, totalWeight } = scored.value;
  const [first, second] = ranked;
  const scoresById = new Map(input.scores.map(row => [row.optionId, row.values]));
  const firstParts = new Map(first.contributions.map(part => [part.criterionId, part]));
  const secondParts = new Map(second.contributions.map(part => [part.criterionId, part]));
  const criteria = input.criteria.map((criterion, index) => {
    const firstPart = firstParts.get(criterion.id), secondPart = secondParts.get(criterion.id);
    const deltaNumerator = firstPart.numerator - secondPart.numerator;
    return {
      criterionId: criterion.id, weight: criterion.weight, direction: criterion.direction,
      firstRawScore: scoresById.get(first.optionId)[index],
      secondRawScore: scoresById.get(second.optionId)[index],
      firstNumerator: firstPart.numerator, secondNumerator: secondPart.numerator,
      deltaNumerator, firstContribution: firstPart.contribution,
      secondContribution: secondPart.contribution,
      deltaContribution: 25 * deltaNumerator / totalWeight,
      active: criterion.weight > 0
    };
  });
  const totalDeltaNumerator = first.numerator - second.numerator;
  return { ok: true, value: {
    ...scored.value,
    firstOptionId: first.optionId, secondOptionId: second.optionId,
    firstRank: first.rank, secondRank: second.rank,
    firstRankOptionIds: ranked.filter(row => row.rank === first.rank).map(row => row.optionId),
    secondRankOptionIds: ranked.filter(row => row.rank === second.rank).map(row => row.optionId),
    totalDeltaNumerator, totalDeltaScore: 25 * totalDeltaNumerator / totalWeight,
    tied: totalDeltaNumerator === 0, criteria
  } };
}
