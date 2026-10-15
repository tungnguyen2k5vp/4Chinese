# Personal Context Memory V6

Date: 2026-10-07. Personal context is learner-owned local data, not curriculum content, telemetry, or a cloud-sync feature.

## Behavior

When a learner saves a word from the Reader, a separate unchecked option asks whether to also keep the sentence as private context on this device. Saving a word to a deck does not silently save the source sentence. Declining still saves the vocabulary selection, but no personal sentence is retained.

The canonical V44 `personal_context_memory` record contains the vocabulary ID, source kind and ID, optional title/pinyin/translation/sense, sentence, locator, timestamps, and `user_selected=1`. Supported source kinds are Reader, Story, OCR, Lesson, Listening, AI-selected, and Custom. The storage API requires explicit confirmation for every source. Only Reader currently has a learner-facing save control; the other kinds are storage/API support, not completed UI flows.

SRS cloze selection prefers a matching, user-selected local context, then an existing bundled example. The target simplified/traditional form must occur in the sentence before it can be used. The answer forms are masked before display. If the local lookup is pending, the review view waits; if no usable context exists, it safely falls back to the existing non-cloze meaning/Hanzi mode. SRS scheduling is unchanged.

## Privacy and lifecycle

- Context remains in local SQLite. This feature adds no analytics event, Supabase upload, or automatic AI request.
- Legacy AI context is not promoted into the new table because the old record did not prove that the learner selected it.
- Soft-deleted Reader documents are hidden from practice selection. Their saved context can be surfaced in the editable vocabulary view for explicit cleanup.
- Deleting a context removes the canonical row and its legacy compatibility copies in one transaction.
- Explicit local backup can include the new context. Old backups without the V44 field preserve existing contexts when restored; invalid imports are transactionally rejected.

## Verification / known limits

SQLite tests cover consent rejection, local save, list and sense filtering, cloze masking, atomic deletion/rollback, migration backfill, and backup round-trip. The feature has not been verified on a physical phone. Story/OCR/AI/Listening/Custom entry points, a dedicated context-management screen, and user research are still **NOT VERIFIED**. Do not represent storage support as completed UI coverage.
