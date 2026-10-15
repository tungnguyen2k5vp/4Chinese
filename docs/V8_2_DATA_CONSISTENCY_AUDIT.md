# V8.2 data consistency audit

## Streak definitions

The app-home/stats streak counts days with new-word learning or vocabulary review. The achievement streak accepts a broader set of completed activities (skills, reading, and at least one minute). Labels/copy now state this difference; the current streak and best achievement streak must not be forced to equal each other. Source: `src/app/(tabs)/stats.tsx`, `src/app/achievements/index.tsx`.

## Review session size

The saved default is 10, but user-selectable sizes are 5, 10, 15, or 20. The scheduler's current due-item selection is unchanged; `REVIEW_SESSION_SIZES` is a UI selection list, not a new scheduling rule. Evidence in `src/services/review/session-size.ts` and tests. The QA emulator had no due vocabulary progress, so the interactive native chooser was not surfaced in its empty state.

## HSK counts

The app-course/progress count and the separate dated HSK 3.0 reference are distinct datasets. The old 674-vs-300 display is not yet reconciled to a unique-word crosswalk. Current labels explicitly distinguish app progress from the 11/2025 HSK 3.0 catalog; current HSK 1 course count in QA is 509. Academic equivalence/official coverage remains unverified.

## QA DB delta

Private emulator snapshots are `database-qa2-before.json` and `database-qa2-after.json`. `hanzi30.db` remained `user_version=45`; vocabulary stayed 11,877; the only table row-count increase was `exam_attempts` 1→2 (one QA attempt submitted). `user_vocabulary_progress`, `review_log`, XP, daily stats, and English learner DB were unchanged. The semantic hash of the Chinese DB changed because that legitimate test attempt was added. English learner and learning-preferences semantic hashes were identical before/after; both had zero learner rows on this fresh QA installation.
