import { describe, expect, it } from 'vitest';
import type { Preset, Question } from '@/types';
import { selectQuestions } from '../select';

const Q = (
  id: string,
  intensity: 1 | 2 | 3,
  themes: Question['themes'],
  group?: string,
): Question => ({
  id,
  text: `q ${id}`,
  themes,
  intensity,
  evaluation: '',
  source: 'seed',
  group,
});

const seed = (n: number) => {
  let s = n;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const basePreset: Preset = {
  id: 't',
  name: 't',
  description: '',
  themeWeights: { love: 2, work: 1 },
  defaultLength: 5,
  intensityRange: [1, 3],
  source: 'seed',
};

describe('selectQuestions', () => {
  it('returns explicit questionIds in order when present', () => {
    const pool: Question[] = [
      Q('a', 1, ['love']),
      Q('b', 2, ['love']),
      Q('c', 3, ['work']),
    ];
    const preset: Preset = { ...basePreset, questionIds: ['c', 'a'] };
    const out = selectQuestions(pool, preset, 5);
    expect(out.map((q) => q.id)).toEqual(['c', 'a']);
  });

  it('returns at most `count` questions', () => {
    const pool = Array.from({ length: 30 }, (_, i) =>
      Q(`q${i}`, ((i % 3) + 1) as 1 | 2 | 3, ['love']),
    );
    const out = selectQuestions(pool, basePreset, 5, seed(1));
    expect(out).toHaveLength(5);
  });

  it('respects intensity range', () => {
    const pool = Array.from({ length: 30 }, (_, i) =>
      Q(`q${i}`, ((i % 3) + 1) as 1 | 2 | 3, ['love']),
    );
    const out = selectQuestions(
      pool,
      { ...basePreset, intensityRange: [1, 2] },
      5,
      seed(2),
    );
    expect(out.every((q) => q.intensity <= 2)).toBe(true);
  });

  it('does not repeat questions in a session', () => {
    const pool = Array.from({ length: 30 }, (_, i) =>
      Q(`q${i}`, ((i % 3) + 1) as 1 | 2 | 3, ['love']),
    );
    const out = selectQuestions(pool, basePreset, 10, seed(3));
    expect(new Set(out.map((q) => q.id)).size).toBe(out.length);
  });

  it('only picks questions matching at least one weighted theme', () => {
    const pool: Question[] = [
      Q('a', 1, ['love']),
      Q('b', 2, ['humor']),
      Q('c', 3, ['work']),
    ];
    const out = selectQuestions(pool, basePreset, 5, seed(4));
    expect(out.every((q) => q.themes.includes('love') || q.themes.includes('work'))).toBe(true);
  });

  it('strongly avoids recently-asked questions when the pool is large enough', () => {
    const pool = Array.from({ length: 30 }, (_, i) =>
      Q(`q${i}`, ((i % 3) + 1) as 1 | 2 | 3, ['love']),
    );
    const recent = new Set(['q0', 'q1', 'q2', 'q3', 'q4']);
    let recentSelections = 0;
    for (let trial = 0; trial < 50; trial++) {
      const out = selectQuestions(pool, basePreset, 5, seed(100 + trial), recent);
      recentSelections += out.filter((q) => recent.has(q.id)).length;
    }
    // 50 trials × 5 picks = 250. Random would average ~42 (5/30). With
    // a 0.92 penalty we expect <8% — i.e. <20 across all trials.
    expect(recentSelections).toBeLessThan(20);
  });

  it('falls back to recent questions if the eligible pool is otherwise exhausted', () => {
    const pool: Question[] = [
      Q('a', 1, ['love']),
      Q('b', 2, ['love']),
      Q('c', 3, ['love']),
    ];
    const recent = new Set(['a', 'b', 'c']);
    const out = selectQuestions(pool, basePreset, 3, seed(5), recent);
    expect(out).toHaveLength(3);
  });

  it('clusters consecutive questions Frisch-style by group', () => {
    const pool: Question[] = [
      Q('a1', 1, ['love'], 'intimacy'),
      Q('a2', 2, ['love'], 'intimacy'),
      Q('a3', 3, ['love'], 'intimacy'),
      Q('b1', 1, ['work'], 'money'),
      Q('b2', 2, ['work'], 'money'),
      Q('b3', 3, ['work'], 'money'),
    ];
    const out = selectQuestions(pool, basePreset, 6, seed(11));
    // Same-group questions should be adjacent, never alternating.
    const groups = out.map((q) => q.group);
    const transitions = groups.filter(
      (g, i) => i > 0 && g !== groups[i - 1],
    ).length;
    // At most one transition for two distinct groups.
    expect(transitions).toBeLessThanOrEqual(1);
  });

  it('falls back to primary theme when no group is set', () => {
    const pool: Question[] = [
      Q('a1', 1, ['love']),
      Q('b1', 2, ['work']),
      Q('a2', 3, ['love']),
      Q('b2', 1, ['work']),
    ];
    const out = selectQuestions(pool, basePreset, 4, seed(12));
    const themes = out.map((q) => q.themes[0]);
    const transitions = themes.filter(
      (t, i) => i > 0 && t !== themes[i - 1],
    ).length;
    expect(transitions).toBeLessThanOrEqual(1);
  });
});
