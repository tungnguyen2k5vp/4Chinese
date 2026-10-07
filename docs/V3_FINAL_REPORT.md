# V3 delivery report (source implementation in progress)

## Implemented in this workspace

- Audited the v24 baseline and retained its local-first SQLite/SRS/FTS foundations.
- Added additive schema upgrades v25-v29: sync diagnostics/cursor state, versioned content-pack state, content deprecation markers, and recoverable Reader text chunks. No learner table was dropped or rebuilt.
- Implemented an idempotent sync-outbox engine, typed entity registry, Supabase RPC contract, retry policy, and tests. The deployed backend is wired to a manual local-first sync action for settings and personal decks; SRS and other aggregates remain withheld by design.
- Implemented manifest/pack validation, HTTPS and byte limits, checksum boundary, transactional metadata state, grammar pack UPSERT/deprecate behavior, sentence quality/coverage services, and curriculum-pack validation.
- Added Reader Unicode chunk persistence, full-content retrieval, and backup format v3 restore compatibility. Pre-v28 Reader documents continue to open via the legacy content fallback.
- Documented the sentence, curriculum, reader, speaking, performance, and release certification gates.

## Validation evidence

- `npm run typecheck` passed after Reader v28 integration.
- Focused Reader/migration/backup test run passed: 4 files, 13 tests.
- Before the later v26/v27/v28 changes, full `npm test` passed: 83 files, 286 tests. A fresh full suite and lint run remain required on the final release commit.

## Not honestly complete without external work

- Executing the final RPC privilege hardening in Supabase and proving two-account/two-device sync on physical devices.
- Curator-reviewed HSK 1 curriculum, production sentence corpus, coverage report, licensed media/audio, and production manifest hosting.
- Long TXT/EPUB/PDF Reader ingestion with chunk-level tokenization/pagination; UI entry intentionally remains capped at 2,000 characters.
- Android/iOS physical-device checks for SQLite migration, audio/microphone, OCR, lifecycle, and performance benchmarks.

See `V3_RELEASE_CHECKLIST.md` for the certification gate. These items are intentionally not represented as completed source work.