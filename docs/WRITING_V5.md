# Writing / translation V5

## Pre-edit audit — 2026-10-01

Actual bank: `src/data/written-practice.ts`. Baseline has 14 original CURATED / UNREVIEWED prompts: one WRITING and one TRANSLATION per teaching band 1–6 / 7–9. Existing IDs, prompts, sample answers and immutable attempt snapshots must remain unchanged. Vietnamese checklist/sample quality has not been independently reviewed; no official HSK equivalence or scoring is established.

The existing written_practice repository persists immutable exercise JSON, draft answer, DRAFT/REVIEWED learner status, revision and updated_at; it already resumes drafts, CAS-saves and supports backup. There is no stable creation/deadline column. `updated_at` changes with saves and cannot be used as a start time. Main owns schema 37, DB and backups; this task must not modify them.

Bounded implementation: add two original prompts per skill/band (28 additions, total target 42), strict optional provenance/timing validation, independent timed variants through existing repository APIs, and a 5/10/15-minute practice budget stored once in immutable JSON. Existing snapshots without optional fields stay untimed. Samples/checklists/explanatory notes remain hidden until the learner explicitly submits for self-review; timeout must not disclose the sample automatically. No AI upload, exact-match semantic grade, official score or generic studying-word template.

SDK references reread before code: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SDK 57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), [SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/). No native package or config changes are planned.

## Actual implementation / content status

| Teaching band | Writing prompts | Translation prompts | Newly independently reviewed / verified |
| --- | --- | --- | --- |
| 1 | 3 | 3 | 0 / 0 |
| 2 | 3 | 3 | 0 / 0 |
| 3 | 3 | 3 | 0 / 0 |
| 4 | 3 | 3 | 0 / 0 |
| 5 | 3 | 3 | 0 / 0 |
| 6 | 3 | 3 | 0 / 0 |
| 7–9 | 3 | 3 | 0 / 0 |

**42 prompts: 21 writing + 21 translation; 28 additions, original 14 unchanged and first in the array.** Every teaching band has both Chinese→Vietnamese and Vietnamese→Chinese translation. The existing level-5 summary exercise remains a summary, not falsely relabeled as literal translation. All content remains CURATED / UNREVIEWED. The 28 additions explicitly record `provenance: ORIGINAL_AI_ASSISTED`; neither this label nor learner self-review promotes content to reviewed/verified.

New contexts include breakfast/location, shopping/invitations, lost items/conditional plans, hotel/delivery requests, community/travel narratives, information verification/library hours, and advanced public-space/technology-policy arguments. Each has a specific Vietnamese checklist, non-generic sample and note. Translation samples preserve negation, condition, uncertainty and limits of evidence. All 28 new samples pass length, required-word and punctuation surface checks; these checks do not establish linguistic correctness. Two short translation minima were corrected to 24 and 28 Hanzi so natural 28-/31-Hanzi samples need not be padded with information absent from the source. Tests were not weakened.

## Safe timed-practice boundary

An empty untimed DRAFT can explicitly start a separate 5/10/15-minute attempt in `written.tsx`. Populated old drafts are not retroactively timed or copied. Optional immutable `timing` contains version, original exercise ID, selected minutes, startedAtMs and deadlineAtMs. The variant ID includes the start time; repeated explicit starts create distinct exercises/attempts instead of altering previous IDs or deadlines. Existing history resumes the original attempt ID and deadline. The original empty untimed draft is retained, not deleted.

On expiry the screen stops accepting further edits. Existing in-memory text may still be saved/flushed, and the learner can explicitly submit it for self-review. Timeout leaves status DRAFT and does not display a sample. This is a **local UI-enforced practice budget**, not a repository-enforced exam submission deadline or anti-cheat system. Existing DB save APIs remain unchanged and can still save drafts; no official timed-test guarantee is claimed. An expired empty draft cannot self-submit an empty answer; start a new separate attempt from the retained empty untimed draft when desired.

`getWrittenSelfReview` returns no sample, checklist or explanatory note for DRAFT, including after expiry. The screen reveals those fields only after a successful explicit self-submission (existing learner status REVIEWED). Auto-complete/autocorrect/spell-check requests are disabled in the text input; platform IME behavior is not independently verified. The sample remains in local snapshot JSON for offline review, so this is learner-UI answer hiding, not cryptographic secrecy from developers/file inspection.

Strict validation preserves legacy snapshots without optional fields and rejects malformed provenance, unsupported content status/source, duplicate/blank checklist or required words, invalid lengths/language, missing sample/note, invalid timing version/duration/clock/ID and mismatched deadline arithmetic. Snapshot envelope/contentVersion remain 1. No schema 37, DB repository, backup implementation, shared models, exam skills center, speaking route, package or root route edits.

## Focused validation and integration

```text
npx vitest run src/data/written-practice.test.ts src/services/exam/written-practice.test.ts src/services/exam/written-practice-persistence.test.ts src/db/written-practice.test.ts
```

PASS: **4 files / 43 tests** (39 added tests + 4 existing tests; run at 16:55 local, duration 2.67s). The focused suite is not a whole-repository total. Existing SQLite tests are reused without modifying DB files. New integration tests cover saved timer/draft resume, stable legacy snapshots, expiry without answer disclosure, explicit later starts as separate attempts, caller edits not changing stored content, backup round-trip and corrupt optional deadlines rejected before mutation with user/SRS progress unchanged.

Owned-file `npx eslint ... --max-warnings 0`: PASS, exit 0, no warnings. The map literals are explicitly typed with `map<WrittenExercise>`, fixing the integration type error without casts or weakened tests. Latest `npm run typecheck`: FAIL only in concurrently edited, unowned `src/app/speaking/ai.tsx` (unresolved names including submitRef/messages/requestLock/scenes) and `src/services/learning/v5-contextual-lessons.test.ts:150` (push on readonly array); no written-practice errors remain. Main must resolve those integration errors before shipping; this task did not edit those files.

Owned files for this task:

```text
src/data/written-practice.ts
src/data/written-practice.test.ts (new)
src/services/exam/written-practice.ts
src/services/exam/written-practice.test.ts
src/services/exam/written-practice-persistence.test.ts (new)
src/app/exam/written.tsx
docs/WRITING_V5.md (new)
```

Still DRAFT/UNREVIEWED in quality terms: all new language content, HSK alignment, semantic/grammar/naturalness assessment and official scoring equivalence. Main should run the final combined suite/exports after integration. Device UI checks (start separate timer, background/force-stop, resume, expiry, empty expiry, explicit self-submit, Android Back, large text/TalkBack) remain NOT TESTED without hardware. The current unowned skills history falls back to a generic saved-item title for timed variant IDs; main may use the stored snapshot title/baseExerciseId later, but this does not affect loading/resuming the attempt.

## Final integration checkpoint

The intermediate concurrent type errors recorded above were resolved before final checks. Final combined lint/typecheck/tests/Android export PASS; 130 suites / 631 tests; Web export and nine browser journeys PASS. Saved history titles now use the validated immutable snapshot (`writtenSnapshotTitle`) with safe fallback, with regression tests. Written center browser smoke renders 21 writing and 21 translation tasks. APK 0.1.26/code28 assembled successfully; device timed/lifecycle/accessibility tests remain NOT TESTED. This supersedes the intermediate integration failures, not the academic-review limitation.
