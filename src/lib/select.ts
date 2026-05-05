import type { Intensity, Preset, Question, ThemeId } from '@/types';

/**
 * How aggressively to avoid recently-asked questions when an
 * `recentlyAskedIds` set is supplied. The penalised weight is
 * `(1 - REPETITION_PENALTY)` of the original weight — not zero,
 * so a small pool can still surface a recent question if everything
 * fresh is exhausted, but a large pool will essentially never repeat.
 */
const REPETITION_PENALTY = 0.92;

/**
 * Pick `count` questions from `pool` honouring the preset's theme weights
 * and intensity range. Builds a smooth intensity curve (light → heavier
 * → light close), no repeats, deterministic with `rng` injected for tests.
 *
 * If the preset declares `questionIds`, those are returned verbatim and
 * truncated/padded to `count`.
 *
 * `recentlyAskedIds` (optional) — question IDs the user has answered in
 * recent sessions. Selection will strongly prefer fresh questions but
 * fall back to recent ones if the eligible pool is too small.
 */
export function selectQuestions(
  pool: Question[],
  preset: Preset,
  count: number,
  rng: () => number = Math.random,
  recentlyAskedIds: ReadonlySet<string> = new Set(),
): Question[] {
  if (preset.questionIds && preset.questionIds.length > 0) {
    const byId = new Map(pool.map((q) => [q.id, q]));
    const ordered = preset.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => Boolean(q));
    return ordered.slice(0, count);
  }

  const [minI, maxI] = preset.intensityRange;
  const banks = preset.banks;
  const eligible = pool.filter(
    (q) =>
      q.intensity >= minI &&
      q.intensity <= maxI &&
      hasAnyTheme(q, preset.themeWeights) &&
      (!banks || banks.length === 0 || (q.bank ? banks.includes(q.bank) : false)),
  );
  if (eligible.length === 0) return [];

  // Group by intensity for curve shaping.
  const buckets = new Map<Intensity, Question[]>();
  for (const q of eligible) {
    const arr = buckets.get(q.intensity) ?? [];
    arr.push(q);
    buckets.set(q.intensity, arr);
  }

  const curve = buildIntensityCurve(count, minI, maxI);
  const used = new Set<string>();
  const out: Question[] = [];

  for (const targetIntensity of curve) {
    const candidates =
      pickAvailable(buckets.get(targetIntensity) ?? [], used) ??
      // Fall back to nearest available intensity if exhausted.
      pickAvailable(eligible, used);
    if (!candidates || candidates.length === 0) break;

    const chosen = weightedPick(candidates, preset.themeWeights, rng, recentlyAskedIds);
    used.add(chosen.id);
    out.push(chosen);
  }

  return clusterByGroup(out);
}

/**
 * Frisch-style topical clustering. After the intensity curve has driven
 * what gets picked, reorder the deck so consecutive questions sit in the
 * same `group` (falling back to the question's primary theme). Each
 * cluster keeps the asker on one topic before opening the next, the way
 * Max Frisch's Questionnaires move through one subject at a time.
 *
 * Cluster order is the order each group first appeared in the original
 * intensity-driven pick — so the gentle openers still tend to land first
 * and heavier groups tend to land in the middle. Within a cluster the
 * original relative order is preserved, which gives each topical block
 * its own small arc rather than being shuffled.
 */
function clusterByGroup(picks: Question[]): Question[] {
  if (picks.length <= 2) return picks;
  const clusters = new Map<string, Question[]>();
  for (const q of picks) {
    const key = q.group ?? q.themes[0] ?? 'misc';
    const arr = clusters.get(key);
    if (arr) arr.push(q);
    else clusters.set(key, [q]);
  }
  const out: Question[] = [];
  for (const arr of clusters.values()) out.push(...arr);
  return out;
}

function hasAnyTheme(q: Question, weights: Preset['themeWeights']): boolean {
  return q.themes.some((t) => (weights[t] ?? 0) > 0);
}

function pickAvailable(arr: Question[], used: Set<string>): Question[] | null {
  const avail = arr.filter((q) => !used.has(q.id));
  return avail.length === 0 ? null : avail;
}

/**
 * Build a length-`count` array of intensities ramping up from `minI` to
 * `maxI` and softening back at the end. Always integer intensities.
 */
function buildIntensityCurve(count: number, minI: Intensity, maxI: Intensity): Intensity[] {
  if (count <= 0) return [];
  if (minI === maxI) return Array(count).fill(minI) as Intensity[];

  const out: Intensity[] = [];
  const peak = Math.max(1, Math.floor(count * 0.7));
  for (let i = 0; i < count; i++) {
    if (i < peak) {
      // Ramp up.
      const t = peak === 1 ? 1 : i / (peak - 1);
      out.push(roundIntensity(minI + (maxI - minI) * t, minI, maxI));
    } else {
      // Soften toward the close, but not below mid.
      const tail = count - peak - 1;
      const j = i - peak;
      const t = tail <= 0 ? 0 : j / tail;
      const mid = (minI + maxI) / 2;
      out.push(roundIntensity(maxI - (maxI - mid) * t, minI, maxI));
    }
  }
  return out;
}

function roundIntensity(v: number, minI: Intensity, maxI: Intensity): Intensity {
  const r = Math.max(minI, Math.min(maxI, Math.round(v)));
  return r as Intensity;
}

function weightedPick(
  candidates: Question[],
  weights: Preset['themeWeights'],
  rng: () => number,
  recentlyAskedIds: ReadonlySet<string> = new Set(),
): Question {
  const scored = candidates.map((q) => {
    const themeWeight =
      q.themes.reduce<number>((acc, t) => acc + (weights[t as ThemeId] ?? 0), 0) || 1;
    const w = recentlyAskedIds.has(q.id)
      ? themeWeight * (1 - REPETITION_PENALTY)
      : themeWeight;
    return { q, w };
  });
  const total = scored.reduce((acc, s) => acc + s.w, 0);
  let r = rng() * total;
  for (const s of scored) {
    r -= s.w;
    // biome-ignore lint/style/noNonNullAssertion: candidates non-empty
    if (r <= 0) return s.q;
  }
  return scored[scored.length - 1]!.q;
}
