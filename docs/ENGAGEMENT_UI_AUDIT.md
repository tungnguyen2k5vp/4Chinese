# Engagement UI Audit

## Scope
Audit performed for the high-frequency Android flows: Home, Learn setup/session, Review, HSK Path, vocabulary library, word detail, deck learning, grammar, writing, speaking, reader, statistics and profile.

## Priority screens
1. Home — primary daily return surface.
2. Learn session — repeated encoding loop.
3. Review session — repeated recall loop.
4. Learn setup — entry decision.
5. HSK path — long-term progression.
6. Vocabulary library — discovery and search.
7. Word detail — understanding and saving.
8. Deck detail — personal-content hub.
9. Grammar list/detail — structured study.
10. Writing and speaking practice — high-effort practice.

## Findings
- Design primitives existed, but feedback/motion behavior was repeated ad hoc.
- Press targets need a consistent pressed state and optional haptic confirmation.
- Progress indicators should expose a semantic progress value to TalkBack.
- Dense utility grids need hierarchy and progressive disclosure rather than equal visual weight.
- Lesson screens need success/error feedback that changes state clearly without blocking the next action.

## Delivery order
Foundation → Home → Learn/Review → HSK path → vocabulary/decks → remaining study utilities. Business logic, SRS scheduling, and local user data remain unchanged.
