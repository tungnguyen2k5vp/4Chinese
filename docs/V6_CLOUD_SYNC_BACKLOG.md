# V6 cloud-sync backlog (not implemented in V5)

Current limited settings/deck-metadata sync remains unchanged. V5 does not imply full data sync.

Future design must cover vocabulary senses and custom entries, deck membership, notes/bookmarks, SRS/review logs, mistakes, statistics/achievements, curriculum progress, reader positions and personal contexts, written/speaking/exam attempts and opt-in AI summaries. Audio needs a separate consent/storage/retention policy; local reader contexts must not be uploaded automatically.

Define ownership, stable IDs, outbox/cursors, idempotency, conflict policies, deletions, authorization/RLS and backup compatibility before implementation. No remote conflict-resolution or full-sync implementation is included here.
