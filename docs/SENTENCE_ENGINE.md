# Sentence Engine — Phase 23

## Source of truth

The sentences table is the shared sentence store. Grammar, speaking and
vocabulary detail connect to the same sentence through sentence_vocabulary,
sentence_grammar and grammar_examples. A vocabulary detail view now includes
reviewed linked sentences in addition to its direct examples.

## Provenance and review

Schema v23 adds:

- provenance: CURRICULUM, EDITORIAL, USER, AI_DRAFT or IMPORTED;
- review_status: REVIEWED, PENDING or REJECTED;
- source_url and reviewed_at.

Only REVIEWED linked sentences are learner-visible through the shared sentence
reader. Existing bundled curriculum records retain the safe REVIEWED default.
AI_DRAFT is explicitly non-visible until reviewed; this update does not mass
generate sentences from AI.

## Generic example protection

Legacy sentence templates such as “我正在学习‘…’这个词。” are filtered at read time.
They are not copied into personal decks and never replace a user-authored or
curated example. Where no reviewed/correct context exists, the UI keeps the
example empty rather than presenting a fabricated usage sentence.
