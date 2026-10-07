# V5 v40 addendum — 2026-10-02

Candidate: **0.1.31 / Android code 33 / SQLite schema 40**.

## Delivered

- Corrected the canonical offline readings and learner-facing meanings for seven polyphonic base entries: 看, 听, 为, 行, 得, 长, 乐.
- The update is a bounded v40 data migration. It changes only those seven immutable base dictionary IDs. User-created words, private decks, notes, SRS progress, review history, settings and audio remain untouched.
- All 35 lexical V5 sense drafts now have an exact canonical reading binding. They are still `DRAFT` / unpublished and cannot be shown as reviewed learning content without editorial review.
- Added migration tests that prove upgrade from schema 39 preserves custom vocabulary, SRS progress and review history.
- Regenerated the reproducible V5 content audit. It reports 35 lexical draft senses, 71 draft collocations and 35 pending draft example sentences.

## Stroke-order source boundary

The only six missing characters remain 搾、獃、秊、薙、颿、骽. They are absent from both bundled `hanzi-writer-data` and the upstream Make Me a Hanzi graphics dataset checked on 2026-10-02. The app therefore retains the existing safe font-only fallback and free-writing mode; it does not fabricate stroke paths or offer a false tracing hint.

## Gemini boundary

The Edge Function reads the configured Supabase secret `4Chinese_Key_Gemini` and the current default model `gemini-3.8-flash` is documented by Google. Unit/request-contract validation is complete. A real provider call remains intentionally unrun without an authenticated app QA session token and an explicit deployment/production test step.

## Verification

- Focused migration / lexical / stroke / Gemini tests: 103 passed.
- Full test suite after the change: 146 files, 820 tests passed.
- V5 data audit regenerated successfully.
- Final lint, TypeScript and Android build are release gates for this candidate.

This addendum does not claim an official HSK syllabus crosswalk, independent linguistic review, licensed native audio, or exam readiness.