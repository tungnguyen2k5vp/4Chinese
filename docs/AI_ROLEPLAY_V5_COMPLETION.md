# Roleplay V2 / V5 completion handoff

## Owned implementation

- `src/services/speaking/roleplay-v5.ts`: 13 scenarios / 42 offline stages. Original `daily`, `restaurant`, `directions` and their goal IDs remain unchanged. Added shopping, hotel, transport, airport, doctor, school, work, travel, phone and friends. Each has a setting, internal recommended practice level, target vocabulary/grammar and explicit self-assessed success criteria.
- `src/app/speaking/ai.tsx`: scenario picker, offline/optional-AI flows, configurable local AI budgets, explicit minimized-summary save, opt-in learner-authored summary note, history listing and confirmed deletion.
- `src/db/roleplay-history.ts`: schema SQL handoff, minimized records, strict history validator, bounded history retention, settings and atomic quota reservation shared by the screen and tests.
- Focused tests: `src/services/speaking/roleplay-v5.test.ts`, `src/db/roleplay-history.test.ts`.

No schema/migration/package/audit/version artifacts edited by this role. The separately authorized backup follow-up edits only the repository/format, related tests and exported limits validator. Existing dirty files outside this ownership were preserved. No phone installation, deployment, sync, commit, Gemini call, account creation or secret access.

## Schema integration and backup follow-up

Main integrated **`roleplaySchemaSQL` from `src/db/roleplay-history.ts`** into migration 38. The roleplay repository never runs DDL itself. Three tables:

| Table | Contents | Backup guidance |
| --- | --- | --- |
| `roleplay_history` | id, scene_id, level, saved_at, attempts, completed_goals, total_goals, used_words_json, transcript_opt_in, transcript_summary | Optional new history collection, absent in old backups = empty. Validate each row with exported `validateRoleplayHistoryRecord`. No conversation/audio/AI feedback or score fields. |
| `roleplay_ai_limits` | singleton id=1, daily_limit, session_limit | Local configuration; default 20 daily / 8 session. Do not delete the singleton when importing an older backup. |
| `roleplay_ai_usage` | UTC day, session_id, attempts | Device-local guard counters. Do not reset/import older counters when restoring learning/history data; otherwise backup restoration can refund quota. |

Backup follow-up is implemented in `src/db/backup-repository.ts` and `src/services/backup/format.ts`: optional `roleplayHistory` and `roleplayAiLimits` fields retain format version 3 compatibility. Exports never read roleplay transcript notes or usage, and always emit `transcript_opt_in=0`, `transcript_summary=null`. Even direct `createLocalBackup` calls strip opted-in notes without mutating local rows. Parser/direct import share strict validation (existing history validator plus exported `validateRoleplayAiLimits`); duplicate/oversized history, extra record fields, transcript text, invalid singleton limits and usage payloads are rejected before writes. Explicitly present history replaces history atomically; absent legacy history/limits preserve existing rows. Usage counters are never exported/imported/cleared. Restoring configuration can change the configured cap, but does not refund counted attempts.

Focused migrated-SQLite roundtrip/legacy/rollback coverage is in `src/db/roleplay-backup.test.ts`; strict format cases are in `src/services/backup/format.test.ts`. Migration/fresh-install/device release gates remain main-owned.

## Privacy, limits and cancellation

Nothing is saved automatically. Explicit save retains only scene/level/date/attempt count, self-marked goal counts and target words found by literal substring matching. At most 100 summaries. One save per session ID; duplicate save cannot overwrite earlier data. Optional `transcript_summary` is a separately opted-in learner-authored note capped at 600 UTF-16 units, not an extracted full conversation. Opt-out discards even an accidentally supplied note. Toggling off clears the unsaved note; previously saved notes require explicit history deletion.

Local configuration accepts daily limits 1–100 and session limits 4/8/12; UI offers daily 10/20/40 and session 4/8/12. Offline/session UI turn caps remain 4/8/12. Actual AI allowance is the lower of UI session cap, persisted AI session cap and remaining daily budget. Counters are reserved using one conditional SQLite UPSERT, an atomic implicit transaction with no JS read-then-write race. Failed/no-auth/timed-out/cancelled reserved attempts count; no refunds or hidden retries. Daily usage spans every session. Resetting the screen, reopening a new session or deleting history does not refund daily usage. Session counters remain durable by session ID, including across midnight. Settings persist through database reopen. UTC midnight starts a new daily allowance; backwards dates fail closed. Missing schema/config/storage also fails closed before auth/provider invocation.

Consent is required for AI. Offline never invokes the quota/auth/provider transport. Revoke, cancel, navigation/background cleanup abort requests and discard late responses. Cancellation during quota reservation is checked again before auth/provider invocation. Reservation may remain counted when cancellation happens during its write. Already-sent text cannot be recalled. No microphone audio is stored or sent to Gemini; existing speech-to-text still fills an editable draft and requires explicit Send.

`roleplayApiScene()` preserves the existing provider `daily | restaurant | directions` allowlist. Expanded scenarios map to `daily`; meaningful setting, current goal, vocabulary and grammar travel in the existing bounded message. All 42 goals accept the maximum 300-unit learner input while keeping the full request message at most 500 units. Only six recent AI text history items are sent; offline exchanges/local summaries/database contents are excluded.

## Academic and operational limitations

All scripts are original internal practice, not official exam content, licensed native dialogues or automatically VERIFIED material. Recommended levels are internal hints, not audited HSK vocabulary/grammar alignment. Goals are self-marked only; keyword presence is not semantic correctness. Offline replies are fixed staged scripts, not analysis of arbitrary learner input. AI text suggestions require review; there are no pronunciation/HSK scores. The simulated medical scenario is language practice only, not medical advice.

Local budgets are a convenience safeguard, not tamper-proof server/account billing quotas; clearing app data, deliberate clock manipulation forward or modifying the DB can bypass them. Authenticated live Gemini, native microphone/TTS behavior, device accessibility and lifecycle/UI interaction remain NOT TESTED here. No phone installed as requested. Parallel-agent APIs were unavailable in this session; ownership was kept disjoint and schema needs communicated to main.

## Validation

2026-10-01 focused command:

`npx vitest run src/services/speaking/roleplay-v5.test.ts src/db/roleplay-history.test.ts src/services/speaking/gemini-conversation.test.ts`

**3 files / 35 tests PASS** (286 ms Vitest duration). Includes real SQLite CRUD/100-record retention, close/reopen of a file-backed DB, quota competition, day rollover/session caps, backwards clock, missing schema/config, privacy minimization and cancellation during reservation. Adjacent transport tests use mocks, not live Gemini.

Original roleplay-pass owned-file ESLint: **PASS, zero warnings**. That pass's typecheck failed outside ownership while other agents worked; no unrelated files were changed to suppress diagnostics. This report does not claim a device release gate passed.

### Authorized backup follow-up validation (2026-10-01)

`npx vitest run src/db/roleplay-backup.test.ts src/services/backup/format.test.ts src/db/backup-repository.test.ts src/db/v5-speaking-backup.test.ts src/db/roleplay-history.test.ts`: **5 files / 28 tests PASS** (3.71 seconds). Covers roleplay roundtrip, note exclusion without local mutation, quota preservation, legacy versions 1/2/3, malformed direct/parsed restore and rollback after a later foreign-key failure. Adjacent existing backup/speaking/history regressions pass.

ESLint for changed backup code, limits validator and related tests: **PASS, zero warnings**. Latest `npm run typecheck`: **PASS**. No schema or migration changes in this follow-up; no phone installation or live-provider/device validation.
