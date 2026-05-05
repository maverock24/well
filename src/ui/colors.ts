import type { ThemeId } from '@/types';

/**
 * Each theme maps to a hex from the Tuscan / library palette in
 * tailwind.config.js. Used as a small accent dot on cards, the
 * underline on the active question, axis bars on the report, etc.
 *
 * Kept as raw hex (not Tailwind class names) so it can drive
 * style props on RN primitives that don't accept arbitrary classes
 * (Reanimated values, SVG fills, status bar tint, etc.).
 */
const COLORS: Record<ThemeId, string> = {
  identity: '#885175',      // plum
  love: '#b05661',          // rose
  sex: '#c2603f',           // terracotta
  family: '#d4a24c',        // ochre
  friendship: '#819772',    // sage
  work: '#556776',          // slate
  ambition: '#c2603f',
  money: '#d4a24c',
  power: '#556776',
  leadership: '#3b7a7a',    // teal
  conflict: '#b05661',
  communication: '#3b7a7a',
  trust: '#819772',
  ethics: '#885175',
  belief: '#885175',
  fear: '#556776',
  regret: '#b05661',
  memory: '#d4a24c',
  time: '#3b7a7a',
  death: '#14110f',
  freedom: '#819772',
  home: '#d4a24c',
  body: '#c2603f',
  humor: '#d4a24c',
  hope: '#819772',
};

export function colorForTheme(theme: ThemeId | undefined): string {
  return theme ? COLORS[theme] : '#9c633b';
}

/** Choose the dominant theme of a list (first wins; presets carry intent). */
export function dominantTheme(themes: readonly ThemeId[]): ThemeId | undefined {
  return themes[0];
}
