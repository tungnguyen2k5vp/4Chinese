# English SRS — V7 checkpoint

> Historical checkpoint. For the current immediate new-word learning flow (18/10/2026), see [ENGLISH_NEW_WORD_LEARNING.md](ENGLISH_NEW_WORD_LEARNING.md). Starting selected new words now includes two ungraded typing rounds and an immediate real review before their initial scheduled interval.

Implemented in `src/db/english/learner.ts` and `src/app/english/review.tsx`.

Learner data belongs to `english-learner.db`, schema 1, never `hanzi30.db`. Deck/card IDs have `en:` prefixes. A dictionary card must contain an explicitly selected sense; a custom card contains the user's own meaning and `source_id=USER`. Two meanings remain two cards. There is no automatic sense selection, guessed IPA or CEFR assignment.

Starting a NEW card uses the existing `initialLearningSchedule`: memory level 1, next review after 30 minutes. Due queries include only LEARNING cards, not suspended, in a non-deleted deck, and due at/before now. They never read Chinese tables. Queues are bounded to 100 records.

Reviews call the existing numeric `applyReview` without changing that scheduler. Card revision, schedule and review log are committed in one serialized transaction. A stale revision or non-due card is refused. Operation ID retries return the original committed result without another log. A log-write failure rolls back the schedule. Session language must be English; pronunciation variant must match that language.

The UI supports self-assessed meaning recall and typed spelling from the user's saved Vietnamese meaning. Spelling compares the exact saved headword, allowing case/whitespace/typographic-apostrophe differences, not guessed inflections or synonyms. Both modes save through the same atomic review operation. LISTENING log mode exists but a listening exercise UI does not yet exist. These are not the complete English exercise matrix.

Daily Plan derives local-calendar-day reviews and available NEW/due counts, suggests up to five new cards, and prioritizes due review. The Mistake Book groups actual wrong English logs, retaining historical errors even after a later correct answer and labeling the latest outcome. Reading it does not change SRS or award XP. It is not an acoustic/grammar error diagnosis. Quick Session, comprehensive study timer and level-aware exercise selection remain unimplemented.

Statistics derive from committed English logs only. Current local policy is 10 English XP per correct review, without changing global/Chinese XP. Reported time is answer-response milliseconds, not a claim of comprehensive study minutes. Archived deck history remains in all-time review statistics while inactive decks are excluded from active card counts.

Evidence: learner repository tests cover batch 10/50/100, explicit sense selection, due timing, duplicate/stale operations, concurrency, rollback and Chinese handle refusal. Web E2E advances Date to 31 minutes to exercise a due review, then verifies one review and 10 English XP. Native lifecycle QA remains blocked by emulator authorization.
