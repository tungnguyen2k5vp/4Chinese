# Exam readiness V5

## Pre-edit exam audit — 2026-10-01

The existing timer/snapshot/idempotency engine is reusable. All seven bundled profiles are ORIGINAL_PRACTICE, `verified: false`, without a verified standard or source. Each contains four MCQs; none is a full HSK mock. Unknown external alignment is not zero coverage and internal accuracy is not an HSK score or pass prediction.

V5 is bounded to stricter validation, honest practice selection, additive immutable metadata, optional persisted no-back navigation, result breakdown and focused tests. The database schema, migrations, root routes, shared models, backup and package/config are owned by main and will not be edited here. Written/speaking routes and written-practice services will not be edited.

## Evidence gate

Exam Ready requires a versioned verified profile/source, all required question types/counts, reviewed bank, actual usable audio when required, validated scoring, full mock availability and device-tested lifecycle/resume. None currently passes this full gate. New candidate content is DRAFT; existing CURATED practice is UNVERIFIED, not externally reviewed.

Source/SDK implementation references inspected before code: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SDK 57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), [SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/). Preserve existing platform-safe SQL/CAS operations; no native dependency/config changes.

## Delivered behavior

- Explicit 5/10/15-minute choices and reading/language-in-context filters reuse 2 or 4 existing questions. UNVERIFIED labels and a DRAFT-unavailable notice are visible; no Full Mock or official score is enabled.
- Optional `profile.backNavigation: NO_BACK` and repository-owned `snapshot.furthestIndex` persist in the existing JSON. Moving forward locks previous answers/flags even after restart/backup restore. The UI asks before moving; question-grid jumps are disabled in no-back mode. Flags remain available in result review.
- Existing SECTION_TIMED windows continue advancing by wall clock, including background time. `getExamCurrentIndex` resolves the active section on resume and the route persists the resumed position through existing CAS. Expired/future sections still cannot be edited. Sections open at fixed boundaries, not via an early-finish button; this is intentional reuse of the existing timer policy.
- Concurrent submissions return the already-submitted row rather than reporting a false stale-write error. Deadline clamping, stale answer-write rejection and unchanged immutable snapshots remain tested.
- Results include per-section practice accuracy, total elapsed time, question-type breakdown, flags and Vietnamese explanations. Small samples cannot certify readiness or predict passing.

## Validation evidence

Latest focused command:

```text
npx vitest run src/services/exam/engine.test.ts src/services/exam/practice-bank.test.ts src/services/exam/v5-validation.test.ts src/db/exam.test.ts src/db/backup-repository.test.ts src/services/backup/format.test.ts
```

PASS: **6 files / 52 tests**, 3.15 seconds (2026-10-01, local run at 16:33). This includes 31 added exam tests (26 new validation/selection tests, 5 additional repository tests), not a new full-repository total. Checks include invalid banks/durations/audio/review/references, draft rejection, exact section boundaries/resume, no-back forged edits, immutable content after later caller edits, legacy IDs/snapshots, concurrent submissions and actual backup round-trip with unchanged SRS/user progress.

`npx eslint` on all 10 owned TS/TSX files: PASS, zero warnings. `npm run typecheck`: PASS, exit 0. No full test suite, Android/Web export, APK install, commit, push or deploy was run for this extension while other workers are active. Main's earlier baseline exports are not evidence for these changed screens.

## Integration handoff

Changed files only:

```text
src/services/exam/engine.ts
src/services/exam/session.ts
src/services/exam/practice-bank.ts
src/services/exam/draft-bank.ts (new)
src/services/exam/v5-validation.test.ts (new)
src/db/exam.ts
src/db/exam.test.ts
src/app/exam/index.tsx
src/app/exam/session.tsx
src/app/exam/result.tsx
docs/QUESTION_BANK_V5.md
docs/EXAM_READINESS_V5.md
```

No changes to exam-schema, migrations, shared models/contracts, database initialization, backup implementation, package/app config/root layout, sync/SRS or written/speaking routes/services. Snapshot envelope stays version 1 with optional additive fields; old profiles/snapshots omit metadata/no-back and remain supported. No old attempt is rewritten or rekeyed. An older V4 binary will not enforce the new optional navigation policy; no downgrade enforcement is claimed.

Main should run the complete integration quality pipeline after workers finish, then smoke-test selection, submit/cancel, flags, resume, no-back confirmation, timed-section transitions and result breakdown. Hardware QA remains NOT TESTED: force-stop/background/resume, Android Back, TalkBack, large font and update retention. These TS/JSON changes require no added native capability and retain existing SQLite/Router boundaries; Android/iOS/Web/Expo Go runtime verification is still pending.

Independent reviewer/source licensing and real reference/audio inventory validation are prerequisites for publishing candidates or any verified mock. Actual achievable scope is a stronger practice framework plus a review queue, not new reviewed bank depth, full-mock content, exam certification or anti-cheat clock enforcement. Unknown vocabulary/grammar/listening/writing/speaking readiness remains unknown; this task did not change the separate readiness screen or infer absent dimensions as zero.
