# V5 exam and listening scoped completion

This is an implementation handoff for the assigned exam/listening files, not a release approval or an assertion that all V5 work is complete. Existing dirty changes, schemas, migrations, package files, audit artifacts, other content areas and versioning were left untouched. No phone installation, sync, deployment, commit or reset was performed. No parallel-agent execution API was exposed in this session; independent verification commands ran in parallel, with the declared file ownership respected.

## Actual content inventory

| Inventory | Actual count | Status |
| --- | ---: | --- |
| Existing playable questions | 28 across seven profiles | Legacy original practice, unverified |
| Draft question candidates | 84 across estimated bands 1–6 | ORIGINAL / AI_DRAFT / DRAFT, not playable |
| Vocabulary draft candidates | 18 | Three per band |
| Grammar/cloze draft candidates | 18 | Three per band |
| Reading draft candidates | 24 | Four per band |
| Listening draft candidates | 24 | Four per band, SYSTEM_TTS transcripts only |
| Source-bound listening companion definitions | 12 | AI_AUTHORED_SELF_PRACTICE / DRAFT |
| Verified full mocks | 0 | Remain unavailable |

The original eighteen draft IDs and question contents remain in place as the first six candidates in each of bands 1–3. Sixty-six candidates were added. Existing playable profile/question IDs and attempt persistence were not rewritten. There is no new draft group for band 7–9; its four legacy playable questions remain unchanged. Companion definitions are not a claim that twelve unique matching sentences are present in every installed database: exercises appear only for an exact matching, reviewed, source-labelled sentence returned by the current library query.

## Editorial preview and import quality gate

`src/services/exam/original-questions-v5.ts` holds new original candidate text. `draft-bank.ts` assembles it separately from `originalPracticeBank` and validates it with `validateDraftBank`. The exam center exposes an explicitly labelled read-only practitioner preview, including proposed answers and explanations. This preview is editorial, not an attempt or learner score.

`previewDraftBankImport(json, inventory?)` is a pure developer/practitioner API: it parses and validates JSON into isolated memory. It does not write to SQLite, import into the playable bank, create an attempt or change review status. The expected JSON is an array of `{ profile, questions }` entries with existing exam engine shapes. The default reference inventory is empty; any nonempty vocabulary/grammar/audio references must resolve against an inventory supplied from actual known records, not merely the imported profile's own declarations.

The gate checks bounded input size and entry/question counts, profile validity, original/unverified/draft provenance, duplicate IDs, normalized duplicate prompt/transcript pairs, distinct choices, answer bounds, nonblank explanations, level/skill/type consistency, section counts, declared type coverage, optional timed section order, reference resolution and audio metadata. Draft listening imports accept SYSTEM_TTS transcripts without fabricated audio assets. Reviewed/verified/official promotion, review evidence attached to AI drafts and recording claims are rejected by this pathway. Existing playable-bank and snapshot validators continue to reject all draft candidates.

Structural validity is not academic validation. Vocabulary/grammar target IDs remain empty where mapping has not been established. No syllabus alignment, expert review, copyright clearance of third-party material, empirical difficulty calibration, distractor discrimination, reliability or full-mock equivalence is claimed. Estimated level/difficulty metadata must be reviewed before publication. A human-controlled publication workflow is still required; passing the preview gate cannot publish anything.

## Learner evidence and next practice

`getPracticeEvidence` in `practice-bank.ts` derives descriptive per-skill counts from the immutable attempt questions and saved answers. Unmeasured reading/listening/writing/speaking/translation groups use `percent: null` and `MISSING`, not zero. Observed groups include unanswered counts and remain `LIMITED_PRACTICE`. Overall confidence is always `LIMITED_PRACTICE_ONLY`, not a statistical interval or exam readiness prediction.

The result screen shows this five-skill evidence and recommends an available legacy reading/language focus based on the weakest question-type group, or mixed practice after a perfect sample. It offers separate TTS listening and written/spoken self-practice routes for gaps. The center exposes evidence from the most recent submitted attempt and a focus-selection action; it does not aggregate repeated questions into falsely independent evidence. Time budgets still select the existing two/four-question subsets and do not expand playable content. Full mocks still need independently verified structure, a sufficiently deep reviewed bank and suitable verified audio.

## Listening comprehension boundaries

`getListeningComprehension` in `src/db/listening-library.ts` attaches only twelve authored definitions tied to exact sentences already present in `src/data/starter-vocabulary.ts`. It checks the caller's sentence review label/source and never fuzzily matches or generates an exercise for arbitrary imported text. The existing sentence ID/source/review label remains unchanged. Companion provenance/review status is separate: the source sentence's legacy REVIEWED label is not transferred to a new AI-authored question.

`src/app/listening/index.tsx` presents choices without a correct-choice marker or explanation until the user explicitly selects “Đối chiếu câu trả lời”. The transcript and translation remain behind the existing reveal action. Transcript-assisted checks and retries are disclosed as self-checks; no attempt record, exam score or verified learning evidence is stored. Unsupported sentences continue with transcript-based self-study. All speech remains system TTS, not native-speaker recordings. Offline playback requires an installed Mandarin voice; actual device voice availability is not verified here.

## Verification actually run

- `npx vitest run src/services/exam src/db/listening-library.test.ts src/db/exam.test.ts`: **9 test files, 76 tests passed**, 3.30 seconds on the final run. This includes real SQLite repository regressions, candidate shape/reference/audio/promotion rejection, draft snapshot rejection, isolated preview parsing, stable legacy IDs, per-skill missing evidence and exact-source companion behavior. Node emitted its experimental SQLite warning.
- Owned-file `npx eslint --max-warnings 0`: **passed with zero warnings/errors** for all eleven implementation/test files below.
- `npx tsc --noEmit`: **failed only at out-of-scope `src/app/stories/index.tsx:37` and `:45`**, where an existing pressable component type does not accept `accessibilityRole`. No diagnostics remained in the assigned exam/listening files. These failures were left for the owning integration/content worker.
- Required repository guidance and mobile testing/UI/offline/audio skills were read directly; the exact Expo SDK 57 documentation index was checked before implementation. No dependency was added.
- No device installation, native build/export, rendered component test, TalkBack/VoiceOver test or interactive web smoke was performed. Pure logic and repository tests do not certify touch layout, navigation, lifecycle or speech behavior on a real device. Those remain integration/device QA responsibilities.

## Paths changed in this scoped pass

- `src/services/exam/original-questions-v5.ts` (new)
- `src/services/exam/draft-bank.ts`
- `src/services/exam/draft-bank.test.ts` (new)
- `src/services/exam/practice-bank.ts`
- `src/services/exam/practice-bank.test.ts`
- `src/services/exam/v5-validation.test.ts`
- `src/app/exam/index.tsx`
- `src/app/exam/result.tsx`
- `src/db/listening-library.ts`
- `src/db/listening-library.test.ts`
- `src/app/listening/index.tsx`
- `docs/EXAM_V5_COMPLETION.md` (this handoff)

These directories/files were already untracked in the shared dirty worktree, so ordinary `git diff --stat` does not describe the complete scoped changes. Nothing was staged or committed. Skills informed the isolated draft/read-only import boundary, separate TTS/self-practice provenance, missing-state UX, and focused deterministic verification. Integration-owned audit/count/report artifacts must be regenerated by their owner when the combined work is ready.
