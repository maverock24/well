import { create } from 'zustand';
import * as db from '@/db';
import type { Preset, Question } from '@/types';

type LibraryState = {
  questions: Question[];
  presets: Preset[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upsertQuestion: (q: Question) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  upsertPreset: (p: Preset) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  questions: [],
  presets: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [questions, presets] = await Promise.all([
        db.listQuestions(),
        db.listPresets(),
      ]);
      set({ questions, presets, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  upsertQuestion: async (q) => {
    await db.upsertQuestion(q);
    await get().refresh();
  },
  deleteQuestion: async (id) => {
    await db.deleteQuestion(id);
    await get().refresh();
  },
  upsertPreset: async (p) => {
    await db.upsertPreset(p);
    await get().refresh();
  },
  deletePreset: async (id) => {
    await db.deletePreset(id);
    await get().refresh();
  },
}));
