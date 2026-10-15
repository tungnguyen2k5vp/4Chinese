# V7 — Language foundation checkpoint, 2026-10-10

Status: controller, dedicated persistence and five-tab runtime wiring implemented. V7 remains partial; native QA and advanced learning modules are not accepted yet.

## Implemented

- `LanguageController` separates Vietnamese UI, learning language and remembered US/UK accent. Chinese sessions use `zh-CN` without erasing the English accent.
- Preferences use a dedicated SQLite handle, schema version 1. Never pass the Chinese database handle to this initializer. `hanzi30.db` remains schema 45; no Chinese migration was added here.
- Preferences are validated and persisted before the visible context changes. Failed writes preserve the previous selection. Concurrent writes and starting a protected session during a pending switch are refused.
- Session/draft/recording guards are independently owned. Switching reports blocked reasons; it never discards drafts. The UI must provide save/cancel confirmation before releasing guards.
- Session contexts and preference snapshots are immutable.
- `LanguageProvider` exposes React context with `useSyncExternalStore`, without resetting navigation or remounting children on selection changes.

## Safety and limitations

Provider and preferences are now wired through `LanguageRuntime` in `_layout.tsx`; Profile exposes learning-language and default English accent choices. Home shows the English daily plan, vocabulary opens personal English cards, stats uses English logs, the HSK tab becomes an honest CEFR-unavailable screen, and Profile remains common with explicit Chinese-only backup/goal scope. Chinese components and database context are kept separate. Switching does not key/remount the root navigator.

Runtime owns one English handle for the process lifetime in its own React context, not a nested SQLite Suspense provider. All English routes share it; Chinese `useSQLiteContext` still points to `hanzi30.db`. Corrupt/future/foreign preference schemas are refused without overwrite.

English initialization failure is isolated: it does not prevent loading Chinese screens. English routes/tabs show a recovery boundary with an explicit switch back to Chinese, without deleting/resetting the English file. A preference-store failure remains explicit rather than silently overwriting the chosen language. The failure boundary is not yet native fault-injection verified.

English review sessions pin language/accent and register SESSION protection. Unsaved deck names/renames and pending or failed English draft writes register DRAFT protection. Saved drafts can survive switching. Complete Chinese form/session/recording guard coverage and native lifecycle verification remain pending; do not infer these from controller unit tests. Bilingual backup is still unimplemented.

This dedicated database boundary follows the offline-data skill's separation and recovery guidance. It is not evidence of completed bilingual backup. Corrupt preferences and future schema versions raise errors rather than silently resetting choices.

No production dictionary was installed or approved. Existing license blockers remain. No app dependency, numeric scheduler change, Git push or phone installation occurred in this continuation. Android builds are QA-only and recorded in the QA document.

## Evidence

- 11 new tests: defaults, persisted EN/GB, ZH → EN → ZH, guard ownership, frozen sessions, disk-write failure, concurrency, corruption, repeated initialization and downgrade refusal.
- Full suite: 163 test files, 910 passed tests, zero failed. Artifact: `artifacts/v7-2026-10-10/language-foundation-tests.json`.
- Existing Chinese migration/SRS tests are included. New isolation test uses separate synthetic databases, not the phone's database.
- TypeScript and content validator passed. Full lint had zero errors; newly introduced import-order warnings were fixed, with existing unrelated warnings left unchanged. React/native lifecycle and backup have not been exercised on an emulator.

## Next dependency order

Update after this checkpoint: English learner/custom bulk/deck recovery/SRS/stats and English-only backup are implemented. Global Settings/five-tab wiring is now present. The list below records the original dependency order, not a claim that all steps are complete; bilingual backup and native QA remain pending.

1. English learner namespace, transactional reviews and bilingual backup validation.
2. Custom cards/decks, sense selection and independent due/statistics repositories.
3. Language-aware screens and session/draft guard registration.
4. Mount hydrated provider and expose Settings once English screens are usable.
5. Native offline/restart, unsaved-state and accessibility QA before release installation.
