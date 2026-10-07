# V5 contextual curriculum foundation

Integration checkpoint: six original **DRAFT / UNVERIFIED / AI_GENERATED** lesson definitions. None is published, official, independently reviewed, seeded into SQLite or connected to learner routes. Main retains the existing learner topics and pathway until content review and an explicit publication workflow are implemented.

Only `src/services/learning/v5-contextual-lessons.ts`, its test file and this document are owned by this task. Existing course/unit/lesson/activity IDs, progress, SRS, database, routes and corpus are unchanged. New owned IDs use `ctx-v5-`; linked vocabulary, grammar and shared sentence IDs retain their existing values.

## Actual inventory

| Internal band | Draft lesson ID | Title | Words | Minutes |
| --- | --- | --- | --- | --- |
| 1 | ctx-v5-hsk1-meet-classmate | Làm quen với bạn học | 10 | 8 |
| 1 | ctx-v5-hsk1-offer-drink | Mời bạn uống trà | 10 | 7 |
| 2 | ctx-v5-hsk2-plan-class | Sắp xếp giờ học ngày mai | 10 | 9 |
| 2 | ctx-v5-hsk2-choose-clothes | So sánh và chọn quần áo | 10 | 8 |
| 3 | ctx-v5-hsk3-travel-experience | Kể chuyến đi và kế hoạch tiếp theo | 10 | 10 |
| 3 | ctx-v5-hsk3-study-habits | Trao đổi cách học khi bận | 10 | 10 |

Totals: 6 topics; 2 lessons per band; 60 target-word placements across 54 existing stable vocabulary IDs; 12 grammar placements across 11 existing grammar IDs; 12 distinct existing shared sentence anchors; 6 new draft dialogues / 24 lines; 12 original draft practice questions; 36 planned activities; 18 authored semantic groups. All 6 lessons are DRAFT, 0 independently reviewed, 0 published. These are internal teaching bands, not proof of official HSK syllabus coverage. Earlier-band vocabulary is deliberately reused in later contextual lessons.

Each lesson has two Vietnamese goals, 10 explicit word bindings with expected numeric reading and intended contextual usage, two existing grammar links, two existing sentence anchors, a four-turn dialogue with pinyin/Vietnamese, two targeted multiple-choice practice items with answers/explanations, and a 7–10 minute activity plan: vocabulary → grammar → context → listening → speaking → practice. Practice metadata names only words/grammar actually targeted, not all words in the lesson. The module has no playback, recording, persistence or network side effects.

Dialogues are original AI-generated drafts, not copied textbooks or official exam questions. `SYSTEM_TTS` describes the intended fallback, not an included audio asset or native-speaker recording. If TTS is unavailable, integration may offer reading but must not record a listening completion. Speaking prompts allow hypothetical roles/trips; no microphone or AI service is required by this foundation.

## Pure API

| Export | Purpose |
| --- | --- |
| `v5ContextualLessons` | Deep-frozen, ordered draft definitions; no import of DB or large vocabulary JSON. |
| `createContextualLessonReferenceIndex({ vocabulary, grammar, sentences })` | Builds reference maps from caller-supplied seed snapshots or active local rows; rejects invalid/duplicate reference IDs. |
| `validateV5ContextualLessons(input, index)` | Strictly parses untrusted definitions; validates requirements, references and links; returns an isolated parsed copy or throws. |
| `resolveContextualLessonAvailability(lesson, index, completedLessonIds?)` | Reports missing/inactive references, spelling/reading/level conflicts, invalid sentence-parent links, pending anchor review and unmet new prerequisites. |
| `resolveContextualSemanticGroups(lesson, index)` | Resolves explicitly authored semantic roles and word bindings in stable order; unavailable/conflicting words remain visible as such, never substituted. |
| `groupContextualLessonsByTopic(lessons?)` | Groups drafts by the existing `VocabularyTopicId` contract without heuristic classification or learner UI changes. |

Local types exported: `V5ContextualLesson`, `ContextualVocabularyReference`, `ContextualGrammarReference`, `ContextualSentenceReference`, `ContextualLessonReferenceIndex`. These do not modify shared models.

Reference shapes:

```ts
// vocabulary: { id, simplified, pinyinNumeric, hskBand, active? }
// grammar: { id, hsk, active? }
// sentences: { id, grammarIds: string[], active?, reviewStatus? }
const index = createContextualLessonReferenceIndex({ vocabulary, grammar, sentences });
const validatedDrafts = validateV5ContextualLessons(v5ContextualLessons, index);
const topics = groupContextualLessonsByTopic(validatedDrafts);
const lesson = validatedDrafts[0]!;
const availability = resolveContextualLessonAvailability(lesson, index, completedContextualIds);
const semanticGroups = resolveContextualSemanticGroups(lesson, index);
```

Main should resolve only the referenced IDs via the existing local repository boundary rather than load the entire corpus at startup. Supply `active: false` for inactive local rows. For tests, existing grammar seeds imply sentence IDs `sentence-${grammarId}-${oneBasedIndex}`; actual UI integration must resolve the real local sentence rows/links rather than assume that an upgraded device has all seeds installed.

`referencesAvailable` checks existence/activity; `referencesCompatible` additionally checks spelling, tone-sensitive reading, internal level and parent grammar associations. Pinyin comparison accepts notation variants such as v/u:/ü and neutral 0/5 but never ignores tones. These are structural checks, not word-sense verification. `canPreview` permits reference-compatible draft inspection even with unmet prerequisites; `prerequisitesMet` is separate. `canStartLearnerLesson` is **always false**, and `publicationBlockedReasons` always includes `DRAFT_REQUIRES_INDEPENDENT_REVIEW`.

Sentence anchors are reference material, not the IDs of the new dialogue lines. Pending shared anchors (notably `vn-time-position` / `vn-shi-de`) remain explicitly pending. A legacy `REVIEWED` sentence does not confer review on a new dialogue or its lesson.

## Strict validation and safety

The validator enforces namespace/metadata, nonempty goals/context, 8–15 unique target words, 1–2 grammar links, existing active references, correct spelling/reading/internal levels, sentence-parent associations, globally unique owned content IDs and no duplicated links. Semantic groups must partition all target words once. Dialogue speakers must exist; tagged words must appear in the line; every target word must appear in the context. It rejects malformed activities, missing vocabulary/grammar/context/practice or all communication activities, mismatched/out-of-range duration, invalid/duplicate practice options, missing answers, untargeted practice, unassessed goals and unscheduled questions. It reuses the existing curriculum graph validator for prerequisite cycles.

Completion of `hsk-*-words-*`, grammar or skill lessons never becomes contextual completion. No compatibility mapping is invented. The two new prerequisites reference only other `ctx-v5-` lessons: travel → plan-class; study-habits → meet-classmate. Main must design any additive unlock/progress mapping separately, retain old completion rows, and document it before integration. Validation rejects old pathway IDs as owned contextual IDs.

## Required review before learner integration

Check naturalness, pinyin, Vietnamese translation, support words beyond the ten targets, target senses and level appropriateness. Known risks are documented in each lesson: 是 has a variant-only corpus gloss; 点 needs its clock-hour sense; 坐 needs the travel-by-vehicle sense; neutral 吗 in supporting dialogue must not resolve to the corpus's unrelated reading; 大的/小的 requires explanation of omitted nouns. Reading-incompatible words such as the current 便宜/听/读 entries were not silently rebound or used as targets.

Draft intended-usage labels do not overwrite dictionary meanings or create verified word senses. After independent review, main needs an explicit reviewed-content contract/publication gate; changing the current draft metadata to REVIEWED/VERIFIED is rejected by this validator. Keep existing topics learner-facing until then. No official completeness/readiness claim follows from these counts.

## Focused validation

```sh
npx --no-install eslint src/services/learning/v5-contextual-lessons.ts src/services/learning/v5-contextual-lessons.test.ts
npx --no-install vitest run src/services/learning/v5-contextual-lessons.test.ts src/services/content/curriculum-validator.test.ts src/services/learning/vocabulary-topics.test.ts
npx --no-install tsc --noEmit
```

Tests cover the actual immutable vocabulary/grammar seeds, all draft reference links, publication blocking, semantic partitions, missing/inactive and conflicting references, malformed requirements, duplicate IDs/options, prerequisite cycles and preservation of old completion semantics. No full suite/export/device installation is requested by this bounded checkpoint. Expo SDK 57's exact [versioned documentation](https://docs.expo.dev/versions/v57.0.0/) was checked before code; no native APIs were added.

Checkpoint results (2026-10-01): scoped ESLint passed with no warnings; the focused command passed **26 tests across 3 files**. The activity-plan union inference and owned test clone typing are fixed. Latest project `tsc --noEmit` reported no errors in these owned files, but exited nonzero for unresolved `scenes`, `scene`, `setScene`, `level`, `setLevel`, `messages` and implicit-any parameters in parallel work at `src/app/speaking/ai.tsx:273–301`. That route was not modified by this task; main must recheck types after its owner completes integration.
