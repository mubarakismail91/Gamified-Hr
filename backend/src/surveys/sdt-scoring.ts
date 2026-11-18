import type { Bi } from '../common/dto/staff-member.dto';
import type { GroupScoresDto, SdtScale, SdtScoreDto } from './dto/survey.dto';

export const SCALE_LABEL: Record<SdtScale, Bi> = {
  autonomy: { en: 'Autonomy', ar: 'الاستقلالية' },
  competence: { en: 'Competence', ar: 'الكفاءة' },
  relatedness: { en: 'Relatedness', ar: 'الانتماء' },
};

const SCALES: SdtScale[] = ['autonomy', 'competence', 'relatedness'];

/** Mean answer per SDT need, rounded to one decimal. Answers to questions not in the round are ignored. */
export function averageByScale(responses: { answers: unknown }[], scaleById: Map<string, SdtScale>): SdtScoreDto[] {
  const sums: Record<SdtScale, { total: number; count: number }> = {
    autonomy: { total: 0, count: 0 },
    competence: { total: 0, count: 0 },
    relatedness: { total: 0, count: 0 },
  };
  for (const r of responses) {
    for (const [questionId, value] of Object.entries(r.answers as Record<string, number>)) {
      const scale = scaleById.get(questionId);
      if (!scale) continue;
      sums[scale].total += value;
      sums[scale].count += 1;
    }
  }
  return SCALES.map((scale) => ({
    scale: SCALE_LABEL[scale],
    score: sums[scale].count > 0 ? Math.round((sums[scale].total / sums[scale].count) * 10) / 10 : 0,
  }));
}

export interface GroupInput {
  key: string;
  label: Bi;
  responses: { answers: unknown }[];
}

/**
 * Per-group SDT averages with two protections:
 *
 * 1. k-anonymity: a group with 1 to k-1 respondents is suppressed, and its exact
 *    count is hidden too (shown as null, "fewer than k").
 * 2. Complementary suppression: if exactly one group is suppressed, the overall
 *    average plus the other groups' averages would let anyone work out the hidden
 *    group's average by subtraction. So the smallest visible group is suppressed
 *    as well, leaving at least two hidden groups that can't be told apart.
 *
 * A group with no respondents is shown as 0 respondents with no scores.
 */
export function scoreGroups(groups: GroupInput[], scaleById: Map<string, SdtScale>, k: number): GroupScoresDto[] {
  const size = (g: GroupInput) => g.responses.length;
  const hidden = new Set(groups.filter((g) => size(g) > 0 && size(g) < k).map((g) => g.key));

  if (hidden.size === 1) {
    const smallestVisible = groups
      .filter((g) => size(g) >= k)
      .sort((a, b) => size(a) - size(b))
      .at(0);
    if (smallestVisible) hidden.add(smallestVisible.key);
  }

  return groups.map((g) => {
    if (hidden.has(g.key)) return { key: g.key, label: g.label, respondents: null, suppressed: true, scores: [] };
    if (size(g) === 0) return { key: g.key, label: g.label, respondents: 0, suppressed: false, scores: [] };
    return { key: g.key, label: g.label, respondents: size(g), suppressed: false, scores: averageByScale(g.responses, scaleById) };
  });
}
