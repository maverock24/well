/**
 * Core domain types for `well`.
 *
 * The model is intentionally small. A `Question` is the unit of meaning;
 * a `Preset` is a reusable recipe for building a `Session`; a `Session`
 * captures one conversation; an `Answer` belongs to a session; a `Report`
 * is a derived, persisted summary computed from answers + scoring rubrics.
 */

export type ThemeId =
  | 'identity'
  | 'love'
  | 'sex'
  | 'family'
  | 'friendship'
  | 'work'
  | 'ambition'
  | 'money'
  | 'power'
  | 'leadership'
  | 'conflict'
  | 'communication'
  | 'trust'
  | 'ethics'
  | 'belief'
  | 'fear'
  | 'regret'
  | 'memory'
  | 'time'
  | 'death'
  | 'freedom'
  | 'home'
  | 'body'
  | 'humor'
  | 'hope';

export type Intensity = 1 | 2 | 3;

/**
 * A `bank` is the topical *file* a question was authored in. It is the
 * appropriateness gate: a question's `themes` describe *what aspect of
 * the human* it touches (identity, regret, ethics…), while its `bank`
 * describes *what conversational context it belongs in*. A preset
 * declares which banks it draws from so e.g. an intimate "what is the
 * lie you tell yourself most often?" tagged `identity`+`regret` does
 * not surface in a Job Interview.
 */
export type BankId =
  | 'getting-to-know'
  | 'deep-relationship'
  | 'friendship-trust'
  | 'self-inquiry'
  | 'work-career'
  | 'negotiation-money'
  | 'leadership-conflict'
  | 'ethics-meaning';

/**
 * A scoring rubric attached to a question. Lets the asker rank how the
 * answer landed — used by the report generator. Optional: questions can
 * be purely reflective with no rating.
 */
export type Scale = {
  /** Inclusive integer min, usually 1. */
  min: number;
  /** Inclusive integer max, usually 5. */
  max: number;
  /** Label for the bottom of the scale, e.g. "evasive". */
  low: string;
  /** Label for the top of the scale, e.g. "candid". */
  high: string;
  /** What this scale is actually measuring, e.g. "Self-awareness". */
  axis: string;
};

export type Question = {
  id: string;
  /** Question text. Short. Open-ended. */
  text: string;
  themes: ThemeId[];
  intensity: Intensity;
  /** Topical bank the question lives in. Stamped by the loader from the
   * source JSON file; gates which presets may surface this question. */
  bank?: BankId;
  /**
   * Optional sub-grouping inside a bank — a short tag like "intimacy",
   * "the unsaid", "endings", "money". The selector uses this to cluster
   * a session's picks Frisch-style: questions from the same group land
   * adjacent, so a deck moves through one topic before opening the next.
   * Pure self-inquiry banks may leave this off.
   */
  group?: string;
  /**
   * 1–3 sentences telling the asker what to listen for. Concrete cues:
   * what specificity looks like, what evasion looks like, common tells.
   */
  evaluation: string;
  /** Optional rubric. Omit for purely reflective questions. */
  scale?: Scale;
  /** Optional probing follow-up the app may surface after the answer. */
  followUp?: string;
  /** 'seed' = bundled with the app; 'user' = authored locally. */
  source: 'seed' | 'user';
  /** ISO timestamp; only meaningful for user-authored questions. */
  createdAt?: string;
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  /** Higher weight = themes more likely to be drawn. */
  themeWeights: Partial<Record<ThemeId, number>>;
  /** Topical banks this preset may draw questions from. If omitted, all
   * banks are eligible (legacy behaviour). Newer presets should always
   * declare this — it is the appropriateness gate. */
  banks?: BankId[];
  /** Question count when starting from this preset. */
  defaultLength: number;
  /** Allowed intensity range — inclusive. */
  intensityRange: [Intensity, Intensity];
  /**
   * Optional explicit ordering. If present, the session uses exactly these
   * question IDs in this order, ignoring weighted random selection. Used
   * for user-customised presets and for handcrafted scripts.
   */
  questionIds?: string[];
  source: 'seed' | 'user';
  createdAt?: string;
  updatedAt?: string;
};

export type Answer = {
  questionId: string;
  /** Free-form written answer. */
  text?: string;
  /** Local file URI to a recorded voice memo. */
  audioUri?: string;
  /** Score on the question's scale, if any. */
  score?: number;
  /** Asker's private note about the answer (does not appear in the report unless requested). */
  note?: string;
  skipped: boolean;
  durationMs: number;
  answeredAt: string;
};

export type Session = {
  id: string;
  presetId: string;
  /** Snapshotted question IDs in the order they were asked. */
  questionIds: string[];
  /** Free-text labels: e.g. ["Maria"], or ["Me", "Sam"] for a pair session. */
  participants: string[];
  answers: Answer[];
  /** Optional title the user gives the session. */
  title?: string;
  createdAt: string;
  completedAt?: string;
};

/**
 * A `Report` is a *derived* artefact saved alongside the raw session.
 * It composes the answers + scores + rubric into a single readable
 * document. Stored separately so the user can regenerate a report
 * (e.g. after editing notes) without losing the original answers.
 */
export type Report = {
  id: string;
  sessionId: string;
  /** Markdown body of the composed report. */
  body: string;
  /** Per-axis aggregate (avg of all scored questions tagged with that axis). */
  axisScores: Array<{ axis: string; average: number; count: number }>;
  /** Headline summary line, e.g. "12 answered, 3 skipped, mean candor 3.8/5". */
  headline: string;
  createdAt: string;
};
