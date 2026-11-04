# English learner backup — current scope

Implemented: a separate `4CHINESE_ENGLISH_LEARNER` version-1 backup, containing decks, cards, notes/SRS snapshots and review logs. It excludes the original dictionary and Chinese records. Arrays are bounded and ID uniqueness, deck/card references, timestamps, state and numeric SRS consistency are validated before writes. Replacement requires the explicit `REPLACE_ENGLISH_ONLY` scope and runs transactionally; insertion failure restores the original English state. The source backup is cloned before asynchronous replacement to avoid caller mutation during restore.

The workspace has an English-only export action. Device sharing and file-picker behavior are not native-tested; the import repository is tested but a restore UI is not exposed yet. Drafts remain in a separate local table and survive learner replacement; they are not currently included in exported backup.

Chinese backup format 3 and its restore code are unchanged by this checkpoint. Old Chinese-only restore never targets the separate English database. This separation does NOT mean a new single-file bilingual backup or atomic cross-database restore has been implemented. Combining the two databases without an atomic restore design is a remaining release blocker; do not add two sequential replacements and label that atomic.

Tests: English round trip, invalid/duplicate/missing references rejected before deletion, failed insertion rollback, draft preservation. Existing Chinese backup/regression suite passes. Selected learning language, English mistakes/context/reader data and a bilingual envelope remain pending.
