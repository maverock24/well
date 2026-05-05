import type { Preset, ThemeId } from '@/types';

/** Highest-weight theme of a preset, used to color its card. */
export function presetDominantTheme(preset: Preset): ThemeId | undefined {
  let best: { theme: ThemeId; weight: number } | null = null;
  for (const [theme, weight] of Object.entries(preset.themeWeights) as Array<[ThemeId, number]>) {
    if (!best || weight > best.weight) best = { theme, weight };
  }
  return best?.theme;
}
