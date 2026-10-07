# Grammar V5 partial takeover — review and test handoff

## Status and counts

Reviewed Sagan's partial `src/data/grammar-v5-expansion.ts` and `src/db/grammar.ts` implementation and completed structural validation, repository gating and focused regression tests.

- **24 original AI-assisted pending grammar points**, four per internal estimated band 1–6.
- **48 examples**, two per point, each with Chinese, tone-marked pinyin, Vietnamese, English and reconstructable Chinese word tokens.
- **24 contextual common-mistake corrections** and Vietnamese contrasts, with distinct wrong/correct strings and explanatory notes.
- Each point has a single-blank quiz, three distinct options containing the answer once, and source-only previews with choice, fill-blank, reorder, translation and correction exercises.
- **0 newly published or independently verified points**. Metadata remains `AI_ASSISTED`, `PENDING`, `publicationRequiresReview=true`, `INTERNAL_ESTIMATE`. The 7–9 entry is a review/prerequisite plan, not completed content; `requiredPoints=null`, `verifiedPoints=[]`.

This was a code/structure/gating review, **not independent Chinese linguistic, Vietnamese pedagogy, rights or official HSK-level validation**. Option shape and correction metadata do not prove distractor exclusivity or grammatical validity in every possible context. Pinyin shape and word reconstruction do not prove pronunciation/translation alignment. Human editorial review is still required; tests never promote content to VERIFIED or PUBLISHED.

## Corrected gate

The partial seeder previously inserted V5 points and sentences with the database's default `is_active=1`. The grammar list excluded V5 IDs, but active-only global search could expose them.

`seedGrammarContent(db, vocabulary, { includePendingDrafts: true })` now:

- Validates the entire 24-point pack before opening the write transaction.
- Inserts V5 points with **`is_active=0`** and their example sentences with **`is_active=0`, `review_status='PENDING'`**.
- Uses existing INSERT OR IGNORE semantics and stable IDs/links; repeated staging is idempotent.
- Repairs the exact known V5 point/example IDs left active by the partial seeder, even during a default seed run. This changes only active flags, never saved content, learner progress, attempts, XP, vocabulary or review status.
- Does not stage absent V5 rows on a default call. `includePendingDrafts` means staging, never publication or enabling a learner route.

Normal grammar lists require active rows and exclude reserved V5 IDs. Example reads require active grammar and sentences and exclude reserved V5 IDs. Direct grammar-attempt writes reject inactive or reserved V5 points before attempt/progress/mistake/XP writes. Existing active non-V5 IDs remain compatible.

`listGrammarV5ReviewQueue` validates/clones the pack, so mutating an editorial queue result cannot change the source draft. Static `buildGrammarV5ReviewPreview` remains a source-only helper with `learnerVisible=false`, no DB writes and no promotion. No learner-facing draft route was introduced.

## Main-owner integration requirements — do before enabling the stage hook

Integration follow-up: main has now hardened `listShadowingSentences`, direct shadowing attempt writes and curriculum grammar reads; vocabulary shared examples also require active rows. Migration38 stages the pack once. Full suite passed 688 tests, including hidden-draft shadowing regression. Requirements below are historical handoff notes, not current exposed draft routes.

The main owner retains database initialization, schema/migrations and stage-hook integration. None of those files was edited here.

**Remaining cross-feature consumers do not honor inactive drafts at the time of this handoff:**

1. `src/db/speaking.ts:listShadowingSentences` reads sentences without `is_active`/review filters. Add active + approved-review filtering (and defensive reserved-draft exclusion as appropriate) before staging examples in an app DB. Without this, inactive pending examples can enter shadowing despite the grammar gate.
2. `src/db/learning-path.ts` reads grammar points for band curriculum generation without active/V5 exclusions. Add those filters before staging, and check ordering of curriculum generation versus staging. Staging is not an authorization to create draft lesson activities.

These files belong to wider integration and were **not modified** by this takeover. Therefore full app-wide invisibility is not claimed yet. Keep the new stage hook disabled until those reads are hardened. Global search is verified separately: the current shared `searchAllContent` query now has both `is_active=1` and `id NOT GLOB 'v5-*'`, added during parallel main-owner work; tests confirm hidden results even when an old draft flag is temporarily active. This takeover did not edit global search itself.

The reserved V5 draft IDs are deliberately not a publication path. Future reviewed publication needs an explicitly approved import/ID policy and durable provenance/review evidence; do not activate these rows manually or infer publication from quiz performance.

## Owned files changed

- `src/data/grammar-v5-expansion.ts`: reusable structural draft/pack validation and cloned review queue; preserved the 24 original point IDs/content.
- `src/data/grammar-v5-expansion.test.ts`: new metadata, counts, alignment/options/correction/exercise validation and rejection tests.
- `src/db/grammar.ts`: inactive staging/repair, learner reads and direct-attempt gating.
- `src/db/grammar-v5-gating.test.ts`: new real SQLite/search/rollback/progress tests.
- `docs/GRAMMAR_V5_COMPLETION.md`: this handoff.

Existing dirty changes and unrelated agent-owned files were preserved. No schema, `database.ts`, migrations, packages, version or audit artifacts were edited. No phone installation, dependency installation, deploy, sync, reset or commit occurred.

## Validation results

- `npx vitest run src/data/grammar-v5-expansion.test.ts src/db/grammar-v5-gating.test.ts src/db/grammar.test.ts src/db/unified-search.test.ts src/services/learning/vietnamese-contrasts.test.ts`: **13 tests passed across 5 files**. Includes six new tests covering 24 points/48 examples, five preview exercise forms, malformed pack rejection, old-schema SQLite staging, default-hidden behavior, idempotency, actual global search, progress preservation, exact-ID repair, rejected draft XP writes, inactive legacy filtering and transaction rollback on an injected late example failure.
- `npx eslint src/data/grammar-v5-expansion.ts src/data/grammar-v5-expansion.test.ts src/db/grammar.ts src/db/grammar-v5-gating.test.ts`: **passed with no errors or warnings**.
- `npm run typecheck`: **passed** against the current shared dirty repository.
- No phone, component/E2E navigation or native audio test is claimed.

The mobile offline-data skill guided transaction boundaries, stable IDs and learner-state preservation. The mobile testing skill guided actual SQLite/search regressions and rollback tests. Exact [Expo SDK 57 guidance](https://docs.expo.dev/versions/v57.0.0/) was read before changes as required by AGENTS.md.
