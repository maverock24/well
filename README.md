# well

Better questions, kept close. An interpersonal-encounter toolkit: 800 seed questions across 13 presets (dating, friendship, self-inquiry, job interview either side, salary negotiation, cofounder vetting, vetting a boss, conflict resolution, family reconnect, therapy prep, end-of-year review). Each question carries an evaluation cue; many carry an optional 1–5 rubric on a named axis. After a session, `well` composes the answers + scores into a regenerable Markdown report stored locally.

## Stack

- Expo SDK 52 (iOS / Android / Web) + Expo Router v4
- React Native 0.76, React 18.3, react-native-web
- TypeScript strict + `noUncheckedIndexedAccess`
- NativeWind 4 / Tailwind 3
- Zustand 5 + expo-sqlite for state and persistence
- Vitest for the selection algorithm
- Biome for lint/format

Everything is on-device. No accounts. No analytics.

## Develop

```bash
pnpm install
pnpm ios          # or: pnpm android | pnpm web
pnpm typecheck
pnpm test
pnpm lint
pnpm format
```

The seed bank loads on first launch (idempotent re-seed on schema-version bump). User-authored questions and presets persist across reseeds — only `source = 'seed'` rows are replaced.

## Build

```bash
pnpm build:web                       # static export to dist/
eas build -p ios --profile preview   # TestFlight
eas build -p android --profile preview
```

Bundle id `app.well.client`, scheme `well`.

## Layout

```
app/                      # Expo Router screens
  (tabs)/                 # Home, Library, History, Settings
  session/                # New, active, summary
  preset/                 # New, edit (reorder/add/delete)
  question/               # Detail, new
src/
  data/questions/         # 8 JSON files × 100 questions = 800 seed Qs
  data/presets.ts         # 13 seed presets
  db/                     # expo-sqlite layer (idempotent init + CRUD)
  lib/select.ts           # weighted intensity-curve picker
  lib/report.ts           # pure session → markdown report
  store/                  # Zustand stores: library, session, history
  types.ts                # ThemeId, Question, Preset, Answer, Session, Report
```

## Concepts

**Question.** Open-ended text + 1–3-line evaluation guide + optional `Scale { axis, min, max, low, high }`. Tagged with one or more `themes` and a 1/2/3 intensity.

**Preset.** Recipe with `themeWeights` and `intensityRange`, plus a `defaultLength`. Optional `questionIds` to handcraft an explicit ordering — set automatically when you reorder/add/delete inside an editor.

**Session.** Snapshots the question IDs in the order asked. Each `Answer` may carry text, a score on the question's scale, an asker-only note, and a skip flag.

**Report.** Derived but persisted. Headline + per-axis averages + per-question Markdown body. Regenerable from the session at any time without losing the original answers.
