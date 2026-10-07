# Stories V5 — implementation and review handoff

## Actual content status

- Existing library: **18 stories**, original IDs and content preserved; 6 each in legacy bands 1–3. Their historical availability is not proof of independent linguistic review.
- Added: **14 original AI-assisted drafts**, two for each estimated band 1, 2, 3, 4, 5, 6, and 7–9.
- Drafts contain **69 sentence-aligned Chinese / tone-marked pinyin / Vietnamese entries**, **42 comprehension questions**, explicit answer explanations, sentence evidence indices, target words, grammar targets, and recurring characters 小明 / 小雨.
- Newly published stories: **0**. All 14 remain `AI_ASSISTED`, `DRAFT`, revision 0, with no reviewer evidence. User-visible status is `DRAFT / UNREVIEWED`.
- These are micro-stories, not long-form graded readers. Advanced bands are editorial difficulty estimates, **not official HSK alignment or comprehensive coverage**. No independent native-speaker, translation, pinyin, rights, or pedagogical review has occurred.

## Owned files

- `src/data/stories-v5.ts`: draft content, reusable Zod metadata/sentence/question validation, cloned preview lookup, publication validation.
- `src/data/stories-v5.test.ts`: coverage counts, draft isolation, validation rejection tests.
- `src/db/stories.ts`: opt-in publication-gated insert-only import, `STORIES` delivery adapter, active-row reads, sentence segmentation and whole-quiz recording.
- `src/db/stories-v5.test.ts`: actual SQLite legacy-ID/progress/collision/rollback/full-quiz tests.
- `src/app/stories/index.tsx`: library loading/error/retry/empty states and explicit optional draft-preview section.
- `src/app/stories/[id].tsx`: story detail, aligned draft preview, full questionnaire, sentence TTS/replay/speed/stop controls.
- `docs/STORIES_V5_COMPLETION.md`: this handoff.

No schema, migrations, package manifests, audit/version artifacts, reader route, grammar, exam, listening or roleplay files were edited. No commit, reset, deploy, sync, dependency installation or phone installation was performed. Agent-spawning tools were unavailable in this session; read-only checks and validation commands were run concurrently within this assigned ownership boundary.

## Preview and review workflow

1. Open Stories → “Xem trước 14 bản nháp V5 · chưa xuất bản”. The previews are separate from SQLite library rows and do not contribute to library/published counts.
2. `/stories/<id>?preview=1` validates and clones the bundled draft. Pinyin and Vietnamese can be toggled. Questions can be answered for feedback, but no learner progress or XP is written.
3. A qualified human must check every Chinese line, translation, pinyin, target, distractor, answer, evidence index and level estimate. Structural validation only checks shape/ranges/required fields, **not semantic correctness or sentence-to-pinyin equivalence**.
4. Retain the full reviewed payload and use the existing `transitionContentReview` workflow with genuine human evidence through `DRAFT → REVIEWED → VERIFIED → PUBLISHED`. Automated promotion is rejected by that workflow. No bundled draft is promoted here.
5. `validatePublishedStoryPack` requires unique IDs and published records with the existing verification-evidence gate. Merely `REVIEWED`, `VERIFIED`, or `PUBLISHED` without valid evidence cannot import. The gate cannot authenticate reviewer identity, prove a transition history, or establish real redistribution rights; a trusted editorial approval boundary remains essential.

## Progress-safe integration contract

`importPublishedStoryPack(db, payload)` accepts an array of validated story records and returns `{ inserted, skipped }`. Validation of the **entire** payload occurs before writes. The import transaction inserts new stories and all three ordered questions atomically. Every existing story ID is skipped entirely, including its questions and progress. No UPSERT, replacement, deprecation, deletion or rekey occurs. Re-import is idempotent; new content revisions must use a distinct ID or an explicitly approved future update workflow.

`storyPackApplier` is an opt-in `ContentPackApplier` with type `STORIES`. `applyVerifiedContentPack` can supply checksum/size/app-version verification and own the transaction. This adapter is not automatically registered, and this work performs no fetching or synchronization. Do not call the standalone transaction-owning importer from inside the content-delivery transaction.

**Schema-owner integration limitation:** current stories storage has no fields/table for aligned pinyin, Vietnamese, targets, review provenance/evidence or revisions. The importer retains Chinese content and ordered questions, but does not persist the full metadata manifest. Keep the validated payload externally at the trusted editorial boundary until the main owner adds durable additive metadata storage and backup handling. Imported story detail therefore shows Chinese/questions/TTS, not the full aligned metadata. Bundled draft preview shows all aligned fields. Do not advertise durable editorial traceability or publish a pack into production until this retention boundary is resolved.

For published library stories, `recordStoryQuiz` validates the complete answer vector and records **one attempt for the whole quiz**. The legacy `best_score` stays 0/1 for all-correct, preserving backup/progress compatibility; the screen shows the current numeric count separately. Legacy single-question stories retain their old answer API. That API rejects multi-question stories (`STORY_FULL_QUIZ_REQUIRED`) to prevent the old reader from awarding completion/XP for only q1. Reader word lookup remains available; users are directed to finish multi-question comprehension on the story detail page. Shared reader UI modernization is outside this ownership slice.

## Audio implementation and limitations

Story detail uses the existing Mandarin TTS adapter directly so explicit speed selection is not overridden by the global AudioButton speech-rate preference. Controls include per-sentence playback, replay selected sentence, previous/next selection, speeds 0.65 / 0.82 / 1, and stop. Changing speed or sentence stops playback. Focus loss/unmount/background cancels pending speech and stops the queue; request tokens suppress stale callbacks. Global sound-disabled settings are respected. Missing Mandarin voice/playback errors are visible, with no silent success claim.

These are system-TTS controls, not native-speaker recordings, calibrated duration multipliers, speech recognition or pronunciation assessment. The exact Expo 57 documentation was read before implementation: [SDK reference](https://docs.expo.dev/versions/v57.0.0/), [Speech](https://docs.expo.dev/versions/v57.0.0/sdk/speech/), [SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/). Device voice availability, offline voice packs, silent mode, interruptions, Bluetooth routing, TalkBack/VoiceOver and actual audible replay require device QA. No phone was installed or tested.

## Validation

- `npx vitest run src/data/stories-v5.test.ts src/db/stories-v5.test.ts src/db/stories.test.ts src/services/content/review-workflow.test.ts`: **10 tests passed, 4 files**. Includes real old-database migration, idempotency, original 18 IDs, no draft seed/progress, invalid-pack rejection before writes, saved-content/progress preservation, rollback on question collision, inactive-row filtering, full-quiz submission guard, and sentence boundaries. Synthetic review evidence exists only in isolated tests, never in production content.
- `npx eslint src/data/stories-v5.ts src/data/stories-v5.test.ts src/db/stories.ts src/db/stories-v5.test.ts src/app/stories/index.tsx 'src/app/stories/[id].tsx'`: **passed, no errors or warnings**.
- `npm run typecheck`: **passed** against the shared dirty repository at the final check.
- Direct content count check: **14 drafts / 69 sentences / 42 questions / 0 published drafts**.
- No component/device audio behavior, release build, or web navigation smoke test is claimed by these unit/integration checks.

Skills applied: mobile offline-data guidance led to insert-only transactional integration and ID/progress preservation; mobile testing guidance led to real SQLite gate/rollback tests; mobile UI and audio guidance led to explicit preview status, error/retry states, accessible native controls, lifecycle cancellation and honest TTS capability labels.
