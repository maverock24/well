import { create } from 'zustand';
import * as db from '@/db';
import { newId } from '@/lib/id';
import { buildReport } from '@/lib/report';
import { selectQuestions } from '@/lib/select';
import type { Answer, Preset, Question, Report, Session } from '@/types';

type SessionState = {
  session: Session | null;
  questions: Question[]; // snapshot of the asked questions
  index: number;
  startedAt: number; // ms; for per-question duration
  start: (preset: Preset, length: number, participants: string[]) => Promise<void>;
  recordAnswer: (a: Omit<Answer, 'questionId' | 'answeredAt' | 'durationMs'>) => Promise<void>;
  next: () => void;
  finish: () => Promise<Report | null>;
  abort: () => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  questions: [],
  index: 0,
  startedAt: Date.now(),

  start: async (preset, length, participants) => {
    const allQuestions = await db.listQuestions();
    const recent = await db.recentlyAskedIds(5);
    const picked = selectQuestions(allQuestions, preset, length, Math.random, recent);
    const session: Session = {
      id: newId('s'),
      presetId: preset.id,
      questionIds: picked.map((q) => q.id),
      participants,
      answers: [],
      createdAt: new Date().toISOString(),
    };
    await db.createSession(session);
    set({ session, questions: picked, index: 0, startedAt: Date.now() });
  },

  recordAnswer: async (partial) => {
    const { session, questions, index, startedAt } = get();
    if (!session) return;
    const q = questions[index];
    if (!q) return;
    const answer: Answer = {
      questionId: q.id,
      answeredAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      ...partial,
    };
    await db.upsertAnswer(session.id, answer);
    set({
      session: { ...session, answers: [...session.answers.filter((a) => a.questionId !== q.id), answer] },
    });
  },

  next: () => {
    set((s) => ({ index: s.index + 1, startedAt: Date.now() }));
  },

  finish: async () => {
    const { session, questions } = get();
    if (!session) return null;
    const completedAt = new Date().toISOString();
    await db.completeSession(session.id, completedAt);
    const finalSession = { ...session, completedAt };
    const draft = buildReport(finalSession, questions);
    const report: Report = { id: newId('r'), ...draft };
    await db.upsertReport(report);
    set({ session: null, questions: [], index: 0 });
    return report;
  },

  abort: () => {
    set({ session: null, questions: [], index: 0 });
  },
}));
