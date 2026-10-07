# Question bank V5

## Pre-edit gap report — 2026-10-01

This audit was written before any V5 bank edits. Source: current dirty V4 worktree, not the older Git baseline. Main's `V5_BASELINE.md` records 111 files / 377 tests and passing Android/Web exports. No device is connected.

| Dimension | Audited baseline | Gap / bounded response |
| --- | --- | --- |
| Original bank | 7 profiles, 28 MCQs, 4 reading/context questions per level 1–6 and 7–9 | Preserve all profile/question IDs and existing attempts. Expand original candidates without inflating playable/reviewed counts. |
| Standard alignment | All original profiles unverified; no standard/source reference | Teaching estimates only; no official mock or scaled HSK score. |
| Metadata | ID, profile, skill, prompt/options/answer, explanation, provenance | Add versioned question type, level, difficulty, target refs, review evidence, audio metadata and profile constraints. Legacy snapshots remain readable. |
| Review | `CURATED` legacy tag, no reviewer evidence; `AI_DRAFT` rejected | Legacy != VERIFIED. New generated material stays DRAFT and is excluded from playable banks. |
| Audio | No exam listening questions or bundled licensed exam audio | Validate required audio and referenced assets; do not fabricate listening/full-mock coverage. |
| Durations | 5 min at levels 1–3; 10 min at higher levels; no choice | Explicit 5/10/15-minute reading practice choices. Time budget is not a claim of question-bank depth. |
| Skill coverage | Reading with grammar/vocabulary in context | Separate reading/comprehension and language-in-context filters using existing items; new vocabulary/grammar candidates need human review. Writing/speaking owned elsewhere. |
| Sections | Fixed sequential windows; blocks expired/future edits; contiguous order validator | Reuse engine; persist optional no-back high-water position in JSON, test resume/boundary behavior. No schema migration. |
| Persistence | V33 exam_attempts, immutable JSON content, answers/flags/index, CAS revision | Keep snapshot version 1 backward-compatible with additive fields; no sync/SRS/backup rewrite. |
| Results | Practice accuracy, total elapsed, per-skill accuracy, explanations | Add question-type breakdown and truthful content/review labels; insufficient data is not exam readiness. |

## Release limits

There is no verified official profile, reviewed full mock, certified score conversion, or independently checked exam audio in this bank. No level can be called Exam Ready on this evidence. New AI-assisted content cannot be promoted to REVIEWED/VERIFIED by this implementation. Device lifecycle, TalkBack, font scaling and upgrade retention remain NOT TESTED until tested on hardware.

## Bounded implementation outcome

| Teaching estimate | Existing playable reading/context MCQs | New DRAFT vocabulary | New DRAFT grammar cloze | New DRAFT reading | Newly reviewed / verified |
| --- | --- | --- | --- | --- | --- |
| 1 | 4 | 2 | 2 | 2 | 0 / 0 |
| 2 | 4 | 2 | 2 | 2 | 0 / 0 |
| 3 | 4 | 2 | 2 | 2 | 0 / 0 |
| 4 | 4 | 0 | 0 | 0 | 0 / 0 |
| 5 | 4 | 0 | 0 | 0 | 0 / 0 |
| 6 | 4 | 0 | 0 | 0 | 0 / 0 |
| 7–9 | 4 | 0 | 0 | 0 | 0 / 0 |

Totals: **28 existing playable items, 18 new DRAFT candidates, 46 unique authored items; not 46 playable/reviewed items.** There are zero exam-bank listening/writing/speaking/translation items in this bounded extension; separate written/speaking exercises are outside this audit. These teaching levels are not verified official coverage.

`originalPracticeBank` retains its seven original profiles and all 28 IDs/prompts/answer keys. `buildOriginalPractice` creates deterministic variant IDs for 5/10/15 minutes, ALL (4 items), READING (first 2 existing items), or LANGUAGE (last 2 existing context items), with optional no-back policy. Groups are a lightweight reuse strategy, not verified skill-specific HSK question formats. Variants do not increase unique-question depth. New metadata labels these reused items LEGACY_CURATED / ORIGINAL; this is expressly not a new human review.

`draftPracticeBank` contains 18 original AI-assisted candidates (6 per estimated level 1–3). It is not imported by learner routes. `assertExamQuestionValid(..., true)` permits structural draft audit only; normal bank validation and `createExamAttempt` reject DRAFT/AI_DRAFT. Review promotion requires an independent language/source/license review and deliberate provenance/status updates; no automatic promotion exists.

Strict checks cover normalized duplicate choices, missing/invalid answer/explanation, unknown provenance, level/difficulty/skill/type/version, target references, review evidence, declared type coverage, section counts/order, durations, and audio manifest IDs/transcripts/source. New profiles explicitly use PRACTICE_ACCURACY; unsupported scoring is rejected. Verified profiles require source/standard metadata, VERIFIED questions with recorded reviewer/date/source/license and matching source reference; TTS is not accepted as verified exam audio. These are integrity gates, not proof that a supplied source or reviewer is academically authoritative.

Reference inventories are immutable profile JSON. This bank currently supplies empty target/audio inventories rather than inventing vocabulary/grammar mappings. Before future publication, integration must build/check those inventories against the actual vocabulary/grammar registry and installed audio assets; an ID in a supplied inventory alone is not a filesystem/license audit. No listening bundle or playback UI was added.
