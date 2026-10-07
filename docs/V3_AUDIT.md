# V3 source audit — 2026-09-29

## Method

This audit is based on the checked-out source, not previous reports. The
working tree already contained uncommitted product work when the audit began;
it has not been reset or discarded. Baseline: `npm test` passed with 75 test
files and 270 tests.

## Database and migration safety

| Area | Status | Evidence / conclusion |
| --- | --- | --- |
| Production schema v24 baseline | DONE | Audit began at v24; the completed v25 migration only adds sync diagnostics/cursor state. |
| Additive v20–v24 upgrades | DONE | Learning activity progress, content metadata, FTS5, sentence provenance and the sync outbox are additive. |
| Legacy regression coverage | PARTIAL | Real SQLite fixtures cover v1, v9, v20 and fresh installs. A dedicated persisted v24 fixture is still required before v25 ships. |
| Transaction and integrity checks | DONE | Schema migration enables WAL/foreign keys, checks integrity before and after the transaction, and does not set `user_version` until seeding succeeds. |
| Reset as migration strategy | DONE | No migration path calls `deleteDatabase`, `resetDatabase` or `clearAllData`. |

## Learning and content

| Area | Status | Evidence / conclusion |
| --- | --- | --- |
| HSK vocabulary / offline search | DONE | HSK corpus has 11,330 stable IDs; HSK5–9 FTS5 fallback is trigger maintained. Do not rewrite without an Android p95/memory regression. |
| Learning-path completion | DONE | Lesson completion requires persisted evidence for every activity; merely opening an activity is insufficient. |
| Mistake Book vs SRS | DONE | Mistake practice updates the mistake record and skill score, not SRS dates or `review_log`. |
| Grammar mastery | DONE | Requires at least 3 attempts, 80% accuracy, and two exercise types. |
| Sentence provenance / review | DONE | v23 supplies provenance and review status; learner-facing shared examples query only `REVIEWED`. |
| Sentence coverage and curated corpus | NEEDS_DATA | There is no generated HSK1–9 coverage report or production content pipeline yet. |
| Production HSK1 curriculum | FOUNDATION_ONLY | The engine and stable seeds exist; the current seed is a small demonstrator, not a 20–40 lesson production curriculum. |

## Reader, speaking and statistics

| Area | Status | Evidence / conclusion |
| --- | --- | --- |
| Reader | PARTIAL | Text/document import, segmentation, OCR and persisted reading position exist. Chunked large EPUB/PDF handling remains unimplemented. |
| Speaking | PARTIAL | Local recording, native recognition and AI provider boundaries exist. A multi-level offline pronunciation plan and pitch analysis are not complete. |
| Statistics | PARTIAL | `daily_stats` supports efficient core totals. Weekly report/retention-specific aggregates still need work. |

## Cloud and sync

| Area | Status | Evidence / conclusion |
| --- | --- | --- |
| Auth and opt-in ZIP backup | DONE | Native sessions use SecureStore; backup storage is account-folder scoped in the supplied SQL. |
| Durable local outbox | FOUNDATION_ONLY | v24 stores account-scoped UPSERT/DELETE operations and has due/retry/completion helpers. No engine sends them yet. |
| Pull cursor / initial sync | BROKEN | No remote sync table, cursor, initial-state decision, or pull implementation exists. |
| Registry and entity merge policy | FOUNDATION_ONLY | A small deterministic timestamp tie-breaker exists, but no per-entity adapter registry. |
| SRS multi-device reconciliation | NEEDS_BACKEND | `review_log` is local but there is no sync event contract/rebuild policy; syncing a final SRS row with last-write-wins would be unsafe. |
| Sync UI | FOUNDATION_ONLY | The current screen correctly presents backup, but not real multi-device sync status. |

## Platform and release gaps

| Area | Status | Evidence / conclusion |
| --- | --- | --- |
| Android physical-device search benchmark | NEEDS_NATIVE_MODULE | The repository has a Node benchmark, but no recorded real-device median/p95/memory measurements. |
| Web SQLite | PARTIAL | Expo SQLite web requires the documented WASM/COEP/COOP setup; this has not been validated for the production host. |
| Supabase deployment | NEEDS_BACKEND | Existing bucket SQL and any new sync SQL must be applied and RLS-tested on the intended Supabase project. |

## V3 implementation order

1. Add a v24 regression fixture, preserve all learner-owned rows, and keep migration tests green.
2. Extend the v24 outbox with an additive v25 sync cursor/diagnostics migration.
3. Ship a contract-first, RLS-protected Supabase sync endpoint and an app sync engine.
4. Add per-entity adapters; start with low-risk settings/decks/reading documents, and add SRS only with merged review-event tests.
5. Add content manifest validation and HSK1 sentence/curriculum data tooling before bulk content expansion.
