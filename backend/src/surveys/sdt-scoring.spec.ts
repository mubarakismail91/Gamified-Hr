import { scoreGroups, type GroupInput } from './sdt-scoring';
import type { SdtScale } from './dto/survey.dto';

const scaleById = new Map<string, SdtScale>([
  ['a', 'autonomy'],
  ['c', 'competence'],
  ['r', 'relatedness'],
]);
const reply = (v: number) => ({ answers: { a: v, c: v, r: v } });
const group = (key: string, ...values: number[]): GroupInput => ({
  key,
  label: { en: key, ar: key },
  responses: values.map(reply),
});
const byKey = (rows: ReturnType<typeof scoreGroups>) => Object.fromEntries(rows.map((r) => [r.key, r]));

describe('scoreGroups (k = 5)', () => {
  it('shows every group that has at least 5 respondents', () => {
    const rows = byKey(scoreGroups([group('x', 1, 2, 3, 4, 5), group('y', 4, 4, 4, 4, 4)], scaleById, 5));
    expect(rows.x).toMatchObject({ respondents: 5, suppressed: false });
    expect(rows.x.scores.map((s) => s.score)).toEqual([3, 3, 3]);
    expect(rows.y.scores.map((s) => s.score)).toEqual([4, 4, 4]);
  });

  it('hides a small group, including its exact size', () => {
    const rows = byKey(scoreGroups([group('x', 1, 2, 3, 4, 5), group('y', 3, 3, 3, 3, 3), group('z', 5, 5), group('w', 1)], scaleById, 5));
    expect(rows.z).toEqual({ key: 'z', label: { en: 'z', ar: 'z' }, respondents: null, suppressed: true, scores: [] });
    expect(rows.w.suppressed).toBe(true);
  });

  it('when only ONE group is small, also hides the smallest visible group (no working it out by subtraction)', () => {
    const rows = byKey(
      scoreGroups([group('big', ...Array(9).fill(3)), group('medium', 4, 4, 4, 4, 4, 4), group('small', 1, 1)], scaleById, 5),
    );
    expect(rows.small.suppressed).toBe(true);
    expect(rows.medium.suppressed).toBe(true); // 6 < 9, so 'medium' is hidden to protect 'small'
    expect(rows.medium.respondents).toBeNull();
    expect(rows.big.suppressed).toBe(false);
  });

  it('does not add extra suppression when two or more groups are already hidden', () => {
    const rows = byKey(scoreGroups([group('big', ...Array(9).fill(3)), group('s1', 1), group('s2', 2, 2)], scaleById, 5));
    expect(rows.big.suppressed).toBe(false);
    expect(rows.s1.suppressed && rows.s2.suppressed).toBe(true);
  });

  it('shows an empty group as 0 respondents; an empty group does not count as hidden', () => {
    const rows = byKey(scoreGroups([group('x', 1, 2, 3, 4, 5), group('y', 2, 2, 2, 2, 2), group('empty')], scaleById, 5));
    expect(rows.empty).toMatchObject({ respondents: 0, suppressed: false, scores: [] });
    expect(rows.x.suppressed).toBe(false);
    expect(rows.y.suppressed).toBe(false);
  });
});
