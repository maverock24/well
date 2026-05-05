import { ensureDbReady, openDatabaseSync, type SQLiteDatabase } from './driver';
import { SEED_QUESTIONS } from '@/data/questions';
import { SEED_PRESETS } from '@/data/presets';
import type { Answer, Preset, Question, Report, Session } from '@/types';

/**
 * Opaque DB handle. Open once, share across the app.
 */
let _db: SQLiteDatabase | null = null;

/** Bump when the schema changes; the loader will re-seed bundled rows. */
const SCHEMA_VERSION = 3;

export function getDb(): SQLiteDatabase {
  if (_db) return _db;
  _db = openDatabaseSync('well.db');
  return _db;
}

/**
 * Idempotent. Safe to call on every app launch. Creates tables, then seeds
 * bundled questions / presets if (a) the rows are missing or (b) the
 * stored schema version is older than this build.
 */
export async function initDb(): Promise<void> {
  await ensureDbReady();
  const db = getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      themes TEXT NOT NULL,           -- JSON string[]
      intensity INTEGER NOT NULL,
      evaluation TEXT NOT NULL,
      scale TEXT,                     -- JSON Scale | null
      follow_up TEXT,
      bank TEXT,                      -- BankId | null (legacy rows)
      group_name TEXT,                -- Frisch-style sub-cluster within a bank | null
      source TEXT NOT NULL,           -- 'seed' | 'user'
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      theme_weights TEXT NOT NULL,    -- JSON Partial<Record<ThemeId,number>>
      banks TEXT,                     -- JSON BankId[] | null
      default_length INTEGER NOT NULL,
      intensity_min INTEGER NOT NULL,
      intensity_max INTEGER NOT NULL,
      question_ids TEXT,              -- JSON string[] | null
      source TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      preset_id TEXT NOT NULL,
      question_ids TEXT NOT NULL,     -- JSON string[]
      participants TEXT NOT NULL,     -- JSON string[]
      title TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS answers (
      session_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      text TEXT,
      audio_uri TEXT,
      score INTEGER,
      note TEXT,
      skipped INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      answered_at TEXT NOT NULL,
      PRIMARY KEY (session_id, question_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      body TEXT NOT NULL,
      axis_scores TEXT NOT NULL,      -- JSON
      headline TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
    CREATE INDEX IF NOT EXISTS idx_reports_session ON reports(session_id);
  `);

  // Best-effort migrations for older installs (v1 → v2 added bank/banks).
  // SQLite has no `ADD COLUMN IF NOT EXISTS`; ignore errors when columns
  // are already present.
  for (const stmt of [
    'ALTER TABLE questions ADD COLUMN bank TEXT',
    'ALTER TABLE questions ADD COLUMN group_name TEXT',
    'ALTER TABLE presets ADD COLUMN banks TEXT',
  ]) {
    try {
      await db.execAsync(stmt);
    } catch {
      /* column already exists */
    }
  }

  const versionRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    ['schema_version'],
  );
  const currentVersion = versionRow ? Number.parseInt(versionRow.value, 10) : 0;

  if (currentVersion < SCHEMA_VERSION) {
    await seedQuestions();
    await seedPresets();
    await db.runAsync(
      'INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)',
      ['schema_version', String(SCHEMA_VERSION)],
    );
  }
}

async function seedQuestions(): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (const q of SEED_QUESTIONS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO questions
          (id, text, themes, intensity, evaluation, scale, follow_up, bank, group_name, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.id,
          q.text,
          JSON.stringify(q.themes),
          q.intensity,
          q.evaluation,
          q.scale ? JSON.stringify(q.scale) : null,
          q.followUp ?? null,
          q.bank ?? null,
          q.group ?? null,
          q.source,
          q.createdAt ?? null,
        ],
      );
    }
  });
}

async function seedPresets(): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (const p of SEED_PRESETS) {
      await db.runAsync(
        `INSERT OR REPLACE INTO presets
          (id, name, description, theme_weights, banks, default_length,
           intensity_min, intensity_max, question_ids, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.name,
          p.description,
          JSON.stringify(p.themeWeights),
          p.banks ? JSON.stringify(p.banks) : null,
          p.defaultLength,
          p.intensityRange[0],
          p.intensityRange[1],
          p.questionIds ? JSON.stringify(p.questionIds) : null,
          p.source,
          p.createdAt ?? null,
          p.updatedAt ?? null,
        ],
      );
    }
  });
}

/* ------------------------- Questions ------------------------- */

type QuestionRow = {
  id: string;
  text: string;
  themes: string;
  intensity: number;
  evaluation: string;
  scale: string | null;
  follow_up: string | null;
  bank: string | null;
  group_name: string | null;
  source: 'seed' | 'user';
  created_at: string | null;
};

function rowToQuestion(r: QuestionRow): Question {
  return {
    id: r.id,
    text: r.text,
    themes: JSON.parse(r.themes),
    intensity: r.intensity as Question['intensity'],
    evaluation: r.evaluation,
    scale: r.scale ? JSON.parse(r.scale) : undefined,
    followUp: r.follow_up ?? undefined,
    bank: (r.bank ?? undefined) as Question['bank'],
    group: r.group_name ?? undefined,
    source: r.source,
    createdAt: r.created_at ?? undefined,
  };
}

export async function listQuestions(): Promise<Question[]> {
  const rows = await getDb().getAllAsync<QuestionRow>('SELECT * FROM questions');
  return rows.map(rowToQuestion);
}

export async function getQuestion(id: string): Promise<Question | null> {
  const row = await getDb().getFirstAsync<QuestionRow>(
    'SELECT * FROM questions WHERE id = ?',
    [id],
  );
  return row ? rowToQuestion(row) : null;
}

export async function upsertQuestion(q: Question): Promise<void> {
  await getDb().runAsync(
    `INSERT OR REPLACE INTO questions
      (id, text, themes, intensity, evaluation, scale, follow_up, bank, group_name, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      q.id,
      q.text,
      JSON.stringify(q.themes),
      q.intensity,
      q.evaluation,
      q.scale ? JSON.stringify(q.scale) : null,
      q.followUp ?? null,
      q.bank ?? null,
      q.group ?? null,
      q.source,
      q.createdAt ?? new Date().toISOString(),
    ],
  );
}

export async function deleteQuestion(id: string): Promise<void> {
  await getDb().runAsync(
    "DELETE FROM questions WHERE id = ? AND source = 'user'",
    [id],
  );
}

/* --------------------------- Presets ------------------------- */

type PresetRow = {
  id: string;
  name: string;
  description: string;
  theme_weights: string;
  banks: string | null;
  default_length: number;
  intensity_min: number;
  intensity_max: number;
  question_ids: string | null;
  source: 'seed' | 'user';
  created_at: string | null;
  updated_at: string | null;
};

function rowToPreset(r: PresetRow): Preset {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    themeWeights: JSON.parse(r.theme_weights),
    banks: r.banks ? JSON.parse(r.banks) : undefined,
    defaultLength: r.default_length,
    intensityRange: [
      r.intensity_min as Preset['intensityRange'][0],
      r.intensity_max as Preset['intensityRange'][1],
    ],
    questionIds: r.question_ids ? JSON.parse(r.question_ids) : undefined,
    source: r.source,
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
  };
}

export async function listPresets(): Promise<Preset[]> {
  const rows = await getDb().getAllAsync<PresetRow>('SELECT * FROM presets');
  return rows.map(rowToPreset);
}

export async function getPreset(id: string): Promise<Preset | null> {
  const row = await getDb().getFirstAsync<PresetRow>(
    'SELECT * FROM presets WHERE id = ?',
    [id],
  );
  return row ? rowToPreset(row) : null;
}

export async function upsertPreset(p: Preset): Promise<void> {
  const now = new Date().toISOString();
  await getDb().runAsync(
    `INSERT OR REPLACE INTO presets
      (id, name, description, theme_weights, banks, default_length,
       intensity_min, intensity_max, question_ids, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id,
      p.name,
      p.description,
      JSON.stringify(p.themeWeights),
      p.banks ? JSON.stringify(p.banks) : null,
      p.defaultLength,
      p.intensityRange[0],
      p.intensityRange[1],
      p.questionIds ? JSON.stringify(p.questionIds) : null,
      p.source,
      p.createdAt ?? now,
      now,
    ],
  );
}

export async function deletePreset(id: string): Promise<void> {
  await getDb().runAsync(
    "DELETE FROM presets WHERE id = ? AND source = 'user'",
    [id],
  );
}

/* --------------------------- Sessions ------------------------ */

type SessionRow = {
  id: string;
  preset_id: string;
  question_ids: string;
  participants: string;
  title: string | null;
  created_at: string;
  completed_at: string | null;
};

type AnswerRow = {
  session_id: string;
  question_id: string;
  text: string | null;
  audio_uri: string | null;
  score: number | null;
  note: string | null;
  skipped: number;
  duration_ms: number;
  answered_at: string;
};

function rowToSession(r: SessionRow, answers: Answer[]): Session {
  return {
    id: r.id,
    presetId: r.preset_id,
    questionIds: JSON.parse(r.question_ids),
    participants: JSON.parse(r.participants),
    answers,
    title: r.title ?? undefined,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
  };
}

function rowToAnswer(r: AnswerRow): Answer {
  return {
    questionId: r.question_id,
    text: r.text ?? undefined,
    audioUri: r.audio_uri ?? undefined,
    score: r.score ?? undefined,
    note: r.note ?? undefined,
    skipped: r.skipped === 1,
    durationMs: r.duration_ms,
    answeredAt: r.answered_at,
  };
}

export async function createSession(s: Session): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO sessions(id, preset_id, question_ids, participants, title, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      s.id,
      s.presetId,
      JSON.stringify(s.questionIds),
      JSON.stringify(s.participants),
      s.title ?? null,
      s.createdAt,
      s.completedAt ?? null,
    ],
  );
}

export async function completeSession(id: string, completedAt: string): Promise<void> {
  await getDb().runAsync('UPDATE sessions SET completed_at = ? WHERE id = ?', [
    completedAt,
    id,
  ]);
}

export async function upsertAnswer(sessionId: string, a: Answer): Promise<void> {
  await getDb().runAsync(
    `INSERT OR REPLACE INTO answers
      (session_id, question_id, text, audio_uri, score, note, skipped, duration_ms, answered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      a.questionId,
      a.text ?? null,
      a.audioUri ?? null,
      a.score ?? null,
      a.note ?? null,
      a.skipped ? 1 : 0,
      a.durationMs,
      a.answeredAt,
    ],
  );
}

export async function getSession(id: string): Promise<Session | null> {
  const row = await getDb().getFirstAsync<SessionRow>(
    'SELECT * FROM sessions WHERE id = ?',
    [id],
  );
  if (!row) return null;
  const ans = await getDb().getAllAsync<AnswerRow>(
    'SELECT * FROM answers WHERE session_id = ?',
    [id],
  );
  return rowToSession(row, ans.map(rowToAnswer));
}

export async function listSessions(): Promise<Session[]> {
  const rows = await getDb().getAllAsync<SessionRow>(
    'SELECT * FROM sessions ORDER BY created_at DESC',
  );
  const out: Session[] = [];
  for (const r of rows) {
    const ans = await getDb().getAllAsync<AnswerRow>(
      'SELECT * FROM answers WHERE session_id = ?',
      [r.id],
    );
    out.push(rowToSession(r, ans.map(rowToAnswer)));
  }
  return out;
}

/**
 * Question IDs answered in the most recent `windowSessions` sessions.
 * Used by the selection algorithm to avoid back-to-back repeats.
 */
export async function recentlyAskedIds(
  windowSessions = 5,
): Promise<Set<string>> {
  const rows = await getDb().getAllAsync<{ question_ids: string }>(
    'SELECT question_ids FROM sessions ORDER BY created_at DESC LIMIT ?',
    [windowSessions],
  );
  const out = new Set<string>();
  for (const r of rows) {
    try {
      for (const id of JSON.parse(r.question_ids) as string[]) out.add(id);
    } catch {
      // Ignore malformed rows.
    }
  }
  return out;
}

export async function deleteSession(id: string): Promise<void> {
  await getDb().runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

/* ---------------------------- Reports ------------------------ */

type ReportRow = {
  id: string;
  session_id: string;
  body: string;
  axis_scores: string;
  headline: string;
  created_at: string;
};

function rowToReport(r: ReportRow): Report {
  return {
    id: r.id,
    sessionId: r.session_id,
    body: r.body,
    axisScores: JSON.parse(r.axis_scores),
    headline: r.headline,
    createdAt: r.created_at,
  };
}

export async function upsertReport(r: Report): Promise<void> {
  await getDb().runAsync(
    `INSERT OR REPLACE INTO reports(id, session_id, body, axis_scores, headline, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      r.id,
      r.sessionId,
      r.body,
      JSON.stringify(r.axisScores),
      r.headline,
      r.createdAt,
    ],
  );
}

export async function getReportForSession(sessionId: string): Promise<Report | null> {
  const row = await getDb().getFirstAsync<ReportRow>(
    'SELECT * FROM reports WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
    [sessionId],
  );
  return row ? rowToReport(row) : null;
}

export async function listReports(): Promise<Report[]> {
  const rows = await getDb().getAllAsync<ReportRow>(
    'SELECT * FROM reports ORDER BY created_at DESC',
  );
  return rows.map(rowToReport);
}

/* ---------------------- Backup / Restore --------------------- */

/**
 * Snapshot version. Bump if `BackupPayload` changes shape so older
 * backups can be detected and (eventually) migrated rather than crashing.
 */
export const BACKUP_VERSION = 1;

export type BackupPayload = {
  version: number;
  exportedAt: string;
  questions: Question[];
  presets: Preset[];
  sessions: Session[];
  reports: Report[];
};

/** All app state, ready to JSON-stringify. */
export async function exportAll(): Promise<BackupPayload> {
  const [questions, presets, sessions, reports] = await Promise.all([
    listQuestions(),
    listPresets(),
    listSessions(),
    listReports(),
  ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    questions,
    presets,
    sessions,
    reports,
  };
}

/**
 * Restore a backup. With `mode: 'merge'` (default) rows are upserted on
 * top of whatever's already there. With `mode: 'replace'` user-authored
 * questions/presets and ALL sessions/reports are wiped first; bundled
 * seed rows are kept.
 */
export async function importAll(
  payload: BackupPayload,
  opts: { mode?: 'merge' | 'replace' } = {},
): Promise<{ counts: { questions: number; presets: number; sessions: number; reports: number } }> {
  if (!payload || typeof payload !== 'object' || payload.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${payload?.version}`);
  }
  const db = getDb();
  const mode = opts.mode ?? 'merge';

  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      await db.runAsync("DELETE FROM questions WHERE source = 'user'");
      await db.runAsync("DELETE FROM presets WHERE source = 'user'");
      await db.runAsync('DELETE FROM reports');
      await db.runAsync('DELETE FROM answers');
      await db.runAsync('DELETE FROM sessions');
    }
    for (const q of payload.questions) await upsertQuestion(q);
    for (const p of payload.presets) await upsertPreset(p);
    for (const s of payload.sessions) {
      await db.runAsync(
        `INSERT OR REPLACE INTO sessions(id, preset_id, question_ids, participants, title, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.presetId,
          JSON.stringify(s.questionIds),
          JSON.stringify(s.participants),
          s.title ?? null,
          s.createdAt,
          s.completedAt ?? null,
        ],
      );
      for (const a of s.answers) await upsertAnswer(s.id, a);
    }
    for (const r of payload.reports) await upsertReport(r);
  });

  return {
    counts: {
      questions: payload.questions.length,
      presets: payload.presets.length,
      sessions: payload.sessions.length,
      reports: payload.reports.length,
    },
  };
}

/**
 * Wipe user-authored content and history, then re-seed bundled questions
 * and presets. Schema-version row is bumped so the seed loader stays in sync.
 */
export async function resetSeed(): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM reports');
    await db.runAsync('DELETE FROM answers');
    await db.runAsync('DELETE FROM sessions');
    await db.runAsync("DELETE FROM questions WHERE source = 'user'");
    await db.runAsync("DELETE FROM presets WHERE source = 'user'");
  });
  await seedQuestions();
  await seedPresets();
  await db.runAsync(
    'INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)',
    ['schema_version', String(SCHEMA_VERSION)],
  );
}
