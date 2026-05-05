import { create } from 'zustand';
import * as db from '@/db';
import type { Report, Session } from '@/types';

type HistoryState = {
  sessions: Session[];
  reports: Report[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (sessionId: string) => Promise<void>;
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  sessions: [],
  reports: [],
  loading: false,

  refresh: async () => {
    set({ loading: true });
    const [sessions, reports] = await Promise.all([db.listSessions(), db.listReports()]);
    set({ sessions, reports, loading: false });
  },

  remove: async (sessionId) => {
    await db.deleteSession(sessionId);
    await get().refresh();
  },
}));
