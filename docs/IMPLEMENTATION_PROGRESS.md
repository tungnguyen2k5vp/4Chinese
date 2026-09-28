# Phase 9 - Optional cloud backup design

## Completed

- Documented an opt-in Supabase snapshot backup design after local backup, without enabling login, uploads, or hidden background synchronization.
- Defined snapshot restore as an explicit user choice; no automatic multi-device merge is permitted.

## Files changed

- `docs/CLOUD_BACKUP_DESIGN.md`

## Database changes

None.

## Dependencies added

None.

## Risks

- Cloud backup remains intentionally unimplemented until privacy, RLS, retention, and conflict handling have dedicated implementation and device tests.

# Phase 8 - Local backup and restore

## Completed

- Added export of learner-owned SQLite data: settings, personal decks, custom vocabulary, custom examples, progress, review logs, and daily statistics.
- Added device file export/share and file-picker import in Account & Settings.
- Validates JSON, backup format, schema version, row shapes, and custom-vocabulary ownership before the database is touched.
- Restores inside one SQLite transaction. An import error rolls back all deletes and inserts, while bundled HSK vocabulary remains untouched.

## Files changed

- `src/services/backup/format.ts`
- `src/services/backup/file.ts`
- `src/services/backup/format.test.ts`
- `src/db/backup-repository.ts`
- `src/app/(tabs)/profile.tsx`

## Dependencies added

- `expo-sharing` for the native Android/iOS save/share sheet.

## Known limitations

- Device-selected illustration files are represented by their URI; the image itself is not copied into the JSON backup.
- Browser sharing of local files depends on browser support; Android release builds support the native share sheet.

## Rollback notes

- Removing the backup UI does not change existing learning data. Import is only performed after explicit confirmation and is transactional.

# Phase 4 - Multi-skill mastery

## Completed

- Derived independent recent accuracy for meaning, Hanzi recall, pinyin, listening, writing, and tone from review history.
- Added the skill card in Statistics without changing the existing memory-level chart or SRS schedule.
- Weighted recent attempts more than older attempts and marks a skill as weak only after three attempts.

## Files changed

- `src/services/review/skill-mastery.ts`
- `src/services/review/skill-mastery.test.ts`
- `src/db/repository.ts`
- `src/app/(tabs)/stats.tsx`
- `src/types/models.ts`

## Database changes

None in this phase. It reuses the review history contract added in Phase 3.

## Dependencies added

None.

## Tests added

- Weighted recent-window calculation.
- Isolation of skill metrics and safe handling of old rows without an exercise type.

## Existing tests

`npm test`: 37 files, 140 tests passed.

## Build result

`npm run lint`, `npm run typecheck`, and `npx expo export --platform android` passed.

## Known limitations

- Tone has no dedicated exercise yet, so it correctly reports no data until a future tone exercise exists.
- Device installation remains pending while the local ADB server is unresponsive.

## Risks

- Older review history has no skill attribution by design; the UI says `Chưa đủ dữ liệu` rather than guessing.

## Rollback notes

- This phase is read-only over review history. Removing the Statistics card does not alter user data or SRS state.

# Phase 3 - Exercise Engine Normalization

## Completed

- Defined stable exercise types independent of the SRS scheduler.
- Kept all existing review modes compatible and added the standard `audio-hanzi` flow.
- Corrected `pinyin-hanzi` so it assesses Hanzi recall only; it no longer incorrectly requires a second meaning answer.
- Added a normalized exercise-attempt contract before the final SRS transition.
- Persisted a nullable `exercise_type` alongside the legacy `mode` in review history.

## Files changed

- `src/services/review/exercise.ts`
- `src/services/review/exercise-attempt.ts`
- `src/app/review/index.tsx`
- `src/app/review/session.tsx`
- `src/db/schema.ts`, `src/db/database.ts`, `src/db/repository.ts`
- `src/types/models.ts`

## Database changes

- Database version 10 adds nullable `review_log.exercise_type` and an index.
- The startup repair checks the actual column list before adding it, so interrupted/partial upgrades remain recoverable.
- Existing review rows remain unchanged and have `exercise_type = NULL`.

## Dependencies added

None.

## Tests added

- Exercise mode-to-skill mapping and standard exercise set.
- Normalized attempt construction and malformed telemetry clamping.
- Additive schema migration assertion for `exercise_type`.

## Existing tests

`npm test`: 36 files, 138 tests passed.

## Build result

`npm run lint`, `npm run typecheck`, and `npx expo export --platform android` passed.

## Known limitations

- USB installation/device smoke test remains blocked because the local ADB server does not return from `adb devices` even after a restart.
- `audio-hanzi` uses the existing device TTS and Hanzi input components; it does not introduce a second listening engine.

## Risks

- Review logs from older app versions intentionally do not have an exercise type. Future mastery aggregation must tolerate NULL values.

## Rollback notes

- The migration is additive only. Reverting the UI still leaves an unused nullable column and preserves every existing review row.
# Phase 5 - Smart Daily Session

## Completed

- Added a local-only `Học hôm nay` coordinator which prepares one daily plan from the existing SRS queue, weak-word signals, remaining new-word target, and derived skill mastery.
- Due cards are first and are the only cards placed in the review queue. Weak cards not yet due remain a read-only reinforcement suggestion and cannot be used to write an early SRS review.
- Added direct, bounded actions for the due-review queue and the new-word queue. The suggested due-review exercise is selected from the weakest supported skill when data exists.
- Connected the Home focus card to the new daily-plan screen without removing the existing independent learning, review, weak-word, or SRS flows.

## Files changed

- `src/services/learning/daily-session.ts`
- `src/services/learning/daily-session.test.ts`
- `src/app/daily/index.tsx`
- `src/app/(tabs)/index.tsx`
- `src/app/_layout.tsx`

## Database changes

None. This phase only reads existing local progress and review history.

## Dependencies added

None.

## Tests added

- Due-card priority and review-session cap.
- Daily new-word cap and isolation from review cards.
- Weakest supported skill selects the appropriate review exercise.

## Known limitations

- Tone has no dedicated exercise, so it is not selected as an automatic review mode.
- USB installation/device smoke testing remains pending while the local ADB server is unresponsive.

## Rollback notes

- Removing the route and Home link is safe: no data, SRS state, or migrations were changed.
# Phase 7 - Reader MVP

## Completed

- Added a separate Reader route: paste up to 2,000 Chinese characters, generate bounded exact-Hanzi terms, look them up with one SQLite query, then segment by longest known word.
- Tapping a known word shows its existing pinyin, Vietnamese meaning, and lifecycle status; opening details uses the normal vocabulary route.
- Reader saves a selected existing word to a selected personal deck through the existing deduplicated deck-copy pipeline. It does not create a second vocabulary store.

## Files changed

- `src/services/reader/segment.ts`
- `src/services/reader/segment.test.ts`
- `src/app/reader/index.tsx`
- `src/db/repository.ts`
- `src/app/_layout.tsx`, `src/app/(tabs)/index.tsx`

## Database changes

None. Reader reuses the vocabulary, progress, and personal-deck tables.

## Dependencies added

None.

## Tests added

- Bounded Hanzi-term generation and longest-match segmentation with unknown characters retained.

## Known limitations

- The MVP deliberately uses dictionary longest-match segmentation rather than a large NLP dependency; unknown compounds remain visible but cannot be saved until they exist in the offline vocabulary.

## Rollback notes

- Removing the route and service leaves no new persisted data model behind.

# Phase 6 - Related words

## Completed

- Added a bounded, on-open related-word query to word detail. It finds entries sharing Hanzi and ranks by shared characters, HSK proximity, learner status, and frequency.
- The feature is read-only and local-first; it neither touches SRS nor runs a lookup during render.

## Files changed

- `src/services/vocabulary/related-words.ts`
- `src/services/vocabulary/related-words.test.ts`
- `src/db/repository.ts`
- `src/app/word/[id].tsx`

## Database changes

- Database version 11 adds `vocabulary_character_index(character, vocabulary_id)`. It is rebuilt from existing Hanzi on upgrade and maintained for future custom/deck copies; no vocabulary, progress, or review row is changed.

## Dependencies added

None.

## Tests added

- Related-word ranking prioritizes shared Hanzi, matching HSK level, learner status, and frequency.

## Known limitations

- Relatedness is lexical (shared Hanzi), not a semantic synonym graph; this intentionally avoids an online or AI dependency.

## Rollback notes

- Removing the related section does not alter vocabulary, progress, or review history.
