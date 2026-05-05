import type { Answer, Question, Report, Session } from '@/types';

/**
 * Compose a `Report` from a session and the questions it asked.
 * Pure function — no DB, no side effects. Persistence is the caller's job.
 */
export function buildReport(
  session: Session,
  questions: Question[],
): Omit<Report, 'id'> {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const answered = session.answers.filter((a) => !a.skipped);
  const skipped = session.answers.filter((a) => a.skipped).length;

  const axisAggregates = new Map<string, { sum: number; count: number }>();
  for (const a of answered) {
    const q = byId.get(a.questionId);
    if (!q?.scale || a.score == null) continue;
    const cur = axisAggregates.get(q.scale.axis) ?? { sum: 0, count: 0 };
    cur.sum += a.score;
    cur.count += 1;
    axisAggregates.set(q.scale.axis, cur);
  }

  const axisScores = Array.from(axisAggregates.entries())
    .map(([axis, { sum, count }]) => ({
      axis,
      average: Math.round((sum / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const headlineParts = [
    `${answered.length} answered`,
    skipped > 0 ? `${skipped} skipped` : null,
    axisScores[0]
      ? `mean ${axisScores[0].axis} ${axisScores[0].average}/5`
      : null,
  ].filter(Boolean);
  const headline = headlineParts.join(' · ');

  const body = renderBody(session, byId, axisScores);

  return {
    sessionId: session.id,
    body,
    axisScores,
    headline,
    createdAt: new Date().toISOString(),
  };
}

function renderBody(
  session: Session,
  byId: Map<string, Question>,
  axisScores: Report['axisScores'],
): string {
  const lines: string[] = [];
  lines.push(`# ${session.title ?? 'Session report'}`);
  lines.push('');
  if (session.participants.length > 0) {
    lines.push(`_With: ${session.participants.join(', ')}_`);
    lines.push('');
  }
  lines.push(`_Started: ${session.createdAt}_`);
  if (session.completedAt) lines.push(`_Ended: ${session.completedAt}_`);
  lines.push('');

  if (axisScores.length > 0) {
    lines.push('## Axis scores');
    for (const a of axisScores) {
      lines.push(`- **${a.axis}** — ${a.average}/5 (n=${a.count})`);
    }
    lines.push('');
  }

  lines.push('## Conversation');
  for (const qid of session.questionIds) {
    const q = byId.get(qid);
    if (!q) continue;
    const a = session.answers.find((x) => x.questionId === qid);
    lines.push(`### ${q.text}`);
    if (q.scale) {
      lines.push(`_Rubric: ${q.scale.axis} — ${q.scale.low} ↔ ${q.scale.high}_`);
    }
    if (!a || a.skipped) {
      lines.push('_(skipped)_');
    } else {
      if (a.text) lines.push(a.text);
      if (a.audioUri) lines.push(`_(voice memo recorded)_`);
      if (a.score != null && q.scale) {
        lines.push(`**Score:** ${a.score}/${q.scale.max}`);
      }
      if (a.durationMs > 1500) {
        lines.push(`_Sat with this for ${formatDuration(a.durationMs)}._`);
      }
      if (a.note) lines.push(`> _Asker note:_ ${a.note}`);
    }
    lines.push(`_Evaluation cue:_ ${q.evaluation}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs === 0 ? `${m}m` : `${m}m ${rs}s`;
}

/**
 * The single answer the asker sat with longest — surfaces an
 * insight the user could not get any other way.
 */
export function longestSit(
  session: Session,
  questions: Question[],
): { question: Question; ms: number } | null {
  const byId = new Map(questions.map((q) => [q.id, q]));
  let best: { question: Question; ms: number } | null = null;
  for (const a of session.answers) {
    if (a.skipped) continue;
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (!best || a.durationMs > best.ms) best = { question: q, ms: a.durationMs };
  }
  return best;
}

export function buildHeadlineOnly(
  session: Session,
  questions: Question[],
): string {
  return buildReport(session, questions).headline;
}

export function answeredCount(answers: Answer[]): number {
  return answers.filter((a) => !a.skipped).length;
}
