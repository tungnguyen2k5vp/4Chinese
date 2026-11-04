# V8.2 database and scheduler safety

- SQLite schema/user_version stayed at 45 during emulator QA; no migration was added in this UI work.
- Chinese vocabulary row count remained 11,877; HSK syllabus row count remained 16,986.
- English learner DB semantic hash was identical before/after; its QA fixture contained 0 cards/decks/reviews/drafts. Learning-preferences DB was also unchanged.
- The only observed row-count change in the Chinese DB was `exam_attempts` 1→2 due to the explicit private-emulator practice attempt (2/4 correct, one unanswered). No learner vocabulary progress, review log, XP, or daily-stat rows changed.
- `node scripts/v8-2-chinese-safety.cjs verify` reports 57 changed source files, no protected English changes, and `dictionaryDatabaseSchedulerScoringPreserved: true`.
- Existing repository and database files were not reset, replaced, or re-imported. The user phone was not targeted in this V8.2 QA pass.

Files: `database-qa2-before.json`, `database-qa2-after.json`, and `chinese-safety.json` under `artifacts/v8-2-chinese-redesign-2026-10-14/`.

Limitation: this establishes preservation in the retained private emulator fixture, not an audit of private handset data. The installed V8.2 behavior on a physical handset was deliberately not checked.
