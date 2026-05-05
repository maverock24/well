import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

type UiState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

/**
 * UI preferences that aren't tied to a single screen.
 *
 * Intentionally not persisted yet — Expo's MMKV is available but the
 * cost of a wrong default is one tap, so we let the user re-pick after
 * a fresh install. Persistence can be layered on without changing the
 * shape of this store.
 */
export const useUiStore = create<UiState>((set) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => set({ themeMode }),
}));
