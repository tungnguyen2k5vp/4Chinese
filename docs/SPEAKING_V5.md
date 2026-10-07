# Timed speaking V5: local metadata, not audio history

Implemented on 2026-10-01. Worker4 owns the speaking-attempt repository/schema constant, timed-speaking screen, recorder callback/tests, and this document. Main owns schema-version integration, migrations, backup format/repository, packages, and root routes. Prompt-bank expansion is a separate task; no corpus changes were made here.

## Delivered behavior

- A completed native recording reports `onRecordingComplete(durationMs)` exactly once. No audio URI leaves `LocalVoiceRecorder`. Duration comes from native recorder status before/after a successful stop, rounded to milliseconds and bounded by the prompt limit. Unknown/zero duration does not qualify.
- Save is available only after a real recording and a replay that actually started and finished. Permission denial, stop failure, partial replay, cancellation, navigation, and background interruption do not qualify. Web remains rehearsal-only; it cannot save an unrecorded attempt.
- The learner explicitly saves the prompt snapshot, stable attempt ID, recording date, duration, self-review note, and selected checklist items. There is no acoustic/AI grading, speech recognition, XP award, SRS mutation, or inferred exam score.
- Optional transcript is **manual entry only**, disabled by default and reset for each new attempt. Switching it off clears the input. The repository discards a supplied transcript when consent is off. The form explains that opted-in text can be included in metadata backups.
- Repeated identical saves are idempotent. Reusing an ID with changed data fails without overwriting the stored attempt. The form is frozen after save; start a new round to record again.
- Each successful new save prunes stored metadata to the most recent 100 records. Reads are capped at 100 and UI rendering starts at 20, with explicit “show more.” Ordering is date descending, then ID descending. Main's exact backup restore is independent of this save-time pruning; a larger restored set is read with the same bounded limit and pruned on the next new save.
- History shows the stored prompt/checklist snapshot, date, duration, self-review, and explicitly opted-in transcript. It has loading, empty, read-error/retry states. Deletion requires an inline confirmation and explicit repository confirmation. Deletion cannot be undone in-app; existing backup copies remain unaffected.

## Frozen migration and backup contract

`src/db/speaking-attempt-schema.ts` exports additive, repeatable `migrationV37Sql`. Main integrates it into schema 37 fresh/upgrade paths.

Table: `timed_speaking_attempts`.

| Column | Contract |
| --- | --- |
| `id` | Stable TEXT primary key; ASCII letters/digits/underscore/hyphen, at most 160 characters |
| `prompt_id` | Snapshot's prompt ID |
| `snapshot_json` | Exact `TimedSpeakingPrompt` snapshot; no extra audio/grading fields |
| `recorded_at` | Canonical ISO UTC timestamp, captured when recording completes |
| `duration_ms` | Positive integer, at most 120000 and no more than snapshot recording limit |
| `self_review` | Learner-authored text, at most 2000 characters |
| `checklist_json` | Unique selected snapshot checklist labels; empty selection allowed |
| `transcript_opt_in` | Integer 0 or 1; defaults to 0 |
| `transcript` | Nullable learner-entered text, at most 4000 characters; must be NULL when opt-in is 0 |
| `audio_retention` | Literal `SESSION_ONLY`; no other value is implemented |

Index: `idx_timed_speaking_recent(recorded_at DESC,id DESC)`.

`validateSpeakingAttemptBackupRecord(row: Record<string, unknown>): void` is exported from `src/db/speaking-attempts.ts`. It validates the exact ten-column shape, snapshot/checklist consistency, bounded text/duration, consent, and session-only policy. Unexpected URI/blob/acoustic-score fields are rejected. Main's optional `timedSpeakingAttempts` backup property contains only these rows; no sound files are read, exported, imported, or reconstructed. Legacy backups without this property preserve current attempts; an explicitly supplied new array follows main's exact-restore semantics.

## Audio privacy and retention architecture

Only `SPEAKING_AUDIO_RETENTION = 'SESSION_ONLY'` is supported, and the SQL constraint enforces it. The screen explains this fixed default. It does not offer nonfunctional 7-day, 30-day, or manual-retention controls and does not claim that historical audio is replayable.

The existing `LocalRecording` lifecycle and native cache remain the sole owners of temporary audio. Cleanup on navigation, background, and re-recording is preserved; recorder/player operations remain serialized and generation-guarded. Metadata reset on interruption is intentional: the previous recording cannot be resumed or saved as a new attempt. Saved metadata survives reopening the app/database independently of those temporary files.

Longer audio retention is **pending**, not implemented. Before enabling it, use a separate audio-asset repository (never part of metadata backup) and a validated retention-policy resolver. It must own cache-to-private-storage transfer, expiry timestamps, startup/foreground sweeps, orphan/corrupt-file recovery, cancellation races, low-storage behavior, and confirmed manual deletion on Android/iOS. No settings/schema placeholders advertise those choices now. Abrupt process termination and deletion failure remain best-effort limitations of the existing temporary-cache cleanup; no crash-safe erasure guarantee is made.

## Validation checkpoint

Versioned sources read before implementation:

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [SDK 57 Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/): recorder status/duration, stop, cache defaults, and player lifecycle.
- [SDK 57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/): existing database context, bound parameters, and transaction behavior.

Required audio/speech, offline-data, testing, and mobile-UI skills were read completely. Their guidance shaped the explicit recording/replay gate, local repository boundary, native-duration checks, transcript consent, visible async states, and non-grading copy.

Focused command:

```text
node node_modules/vitest/vitest.mjs run src/db/speaking-attempts.test.ts src/components/LocalVoiceRecorder.test.ts src/services/speaking/local-recording.test.ts src/db/backup-repository.test.ts
```

Checkpoint: **4 suites / 45 tests passed**, including legacy migration and metadata backup round-trip, real SQLite close/reopen, native-boundary denial/cancel/resume/stop-failure tests, duration-only callback idempotence, consent, snapshot validation, bounded history, and delete confirmation. Two headless initial-screen checks use native-view shims: web cannot save an unrecorded attempt; native initial state requires preparation and exposes no save/transcript form yet. These are not interactive/device tests.

Scoped ESLint passed for the six owned TS/TSX files; the tracked-file whitespace check also passed. Full `node node_modules/typescript/bin/tsc --noEmit` reported no worker4 errors at the final typecheck checkpoint, but was blocked by concurrent unrelated errors in `src/data/written-practice.ts:480` (`contentVersion` widened from literal `1`) and `src/services/learning/v5-contextual-lessons.ts:276` (activity `type` widened to `string`). These are reported to main and left untouched outside ownership.

### Remaining release checks

Browser automation could not initialize because the Windows sandbox helper failed (`apply deny-read ACLs`). No visual checkpoint is claimed. Android/iOS microphone/replay, permission revocation, Bluetooth/headphone interruption, rapid background/foreground, system recorder reset, accessibility readers, keyboard/large-text/dark-mode layout, and release-like builds still require device verification. No dependency install, sync/reset, push, or deployment was performed.

## Addendum: bounded prompt-bank expansion (2026-10-01)

This separately authorized content task follows the earlier implementation checkpoint above: `src/data/speaking-practice.ts` now contains **21 prompts**, exactly **3 per band 1–6 and 7–9**. Fourteen original drafts were added. The original seven IDs, Chinese/Vietnamese content, timings, checklists, and order are preserved unchanged; the additions are appended after them. No UI, recorder, repository, migration, backup, package, or route files were changed for this task.

The fourteen additions are **AI-assisted original practice drafts**, not official HSK/HSKK material or independently reviewed teaching content. Their exact existing provenance fields remain `sourceType: 'CURATED'` and `reviewStatus: 'UNREVIEWED'`; `CURATED` identifies the app's authored-content category, not an expert-review or official-approval claim. Band labels are estimated teaching difficulty, not verified syllabus alignment. Native Chinese/Vietnamese editorial review and learner piloting are still pending. The checklists are learner self-review prompts, never acoustic/AI grading or official exam scoring. All supplied passage details are fictional exercise scenarios, not reports about real businesses or policies.

| Band | Added scenes/tasks | Preparation / recording |
| --- | --- | --- |
| 1 | Buy water; read a message meeting a friend | 10 / 30 seconds |
| 2 | Call about a lost umbrella; restate zoo-trip details | 15 / 30 seconds |
| 3 | Divide dinner-preparation tasks; relay a running-activity notice | 20 / 60 seconds |
| 4 | Explain a lamp-exchange request; negotiate a neighbor's repair time | 20 / 60 seconds |
| 5 | Summarize vegetable preorders; justify an office-space choice | 30 / 90 seconds |
| 6 | Restate a museum night-opening proposal; explain temporary bus connections | 30 / 90 seconds |
| 7–9 | Summarize limited delivery-trial evidence; compare night-exhibition policies | 30 / 120 seconds |

The prompt shape remains **exactly** the same nine fields: `id`, `level`, `title`, `prompt`, `preparationSeconds`, `recordingSeconds`, `checklist`, `sourceType`, `reviewStatus`. No task-type/provenance/version fields were introduced; the strict backup snapshot allowlist is unchanged. Reading, restatement, explanation, opinion and summary instructions are conveyed in the prompt itself. The existing screen consumes the expanded array without a UI change.

The testing skill guided literal regression fixtures for all seven original entries, per-band counts/timings, normalized ID/title/content uniqueness, bounded Chinese content and Vietnamese checklists, fourteen distinct scene anchors, task variety, and production snapshot-validator checks for every entry. Tests verify structure and stated details; they do not certify linguistic quality or difficulty calibration.

Validation at this addendum checkpoint:

```text
node node_modules/vitest/vitest.mjs run src/data/speaking-practice.test.ts src/db/speaking-attempts.test.ts src/components/LocalVoiceRecorder.test.ts src/services/speaking/local-recording.test.ts src/db/backup-repository.test.ts
node node_modules/eslint/bin/eslint.js src/data/speaking-practice.ts src/data/speaking-practice.test.ts
node node_modules/typescript/bin/tsc --noEmit
```

Results: **5 suites / 77 tests passed** (32 prompt-bank tests plus 45 speaking/backup regressions), scoped lint passed, and full typecheck passed. The concurrent type errors recorded at the earlier checkpoint no longer appeared in this run; worker4 did not edit their files. Earlier visual/native release-check limitations remain unchanged. No install, sync/reset, push, deployment, or shared schema/backup changes were performed.
