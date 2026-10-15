# DATABASE SAFETY & ZERO MIGRATION AUDIT (V7.1)

## 1. Executive Summary & Zero Mutation Invariant

As strictly mandated by Phần B1 ("Không sửa database") of the V7.1 specifications:
- **Schema Version**: Unchanged.
- **SQLite Migrations**: 0 new migrations, 0 modified migrations, 0 rollbacks.
- **Database Operations**: Zero destructive SQL queries (`DROP TABLE`, `TRUNCATE`, `DELETE FROM`, `resetDatabase()`, `deleteDatabase()`).
- **Data Integrity**: Chinese dictionary, English dictionary, personal decks, custom vocabulary, SRS schedules, learning path states, and review histories are 100% preserved.

---

## 2. SQLite Schema & Migration Audit

### 2.1. Migration Files Audit
The repository's SQLite migrations located in `src/services/database/` and related schema definitions were audited:
- Current Migration Version: Intact.
- No files were added to `src/services/database/migrations/`.
- No DDL statements were executed during the V7.1 development or QA lifecycle.

### 2.2. Table Inventory & Safety Matrix
| Table Name | Description | V7.1 Status |
| :--- | :--- | :--- |
| `vocabulary` | Chinese Core Words (HSK 1-6 & 3.0) | **FROZEN** (0 changes) |
| `english_dictionary` | English canonical dictionary | **FROZEN** (0 changes) |
| `decks` | User flashcard decks | **INTACT** (Schema & rows preserved) |
| `deck_cards` | Deck flashcard items | **INTACT** (Schema & rows preserved) |
| `srs_items` | Leitner/SM-2 intervals & ease factors | **FROZEN** (Algorithm & rows preserved) |
| `reviews` | Review history logs | **INTACT** (No logs deleted or altered) |
| `user_stats` | User streak, study time, XP | **INTACT** (No stats reset or overwritten) |
| `reader_articles` | Saved reader articles | **INTACT** (Schema & rows preserved) |
| `settings` | System preferences | **INTACT** (Chinese pinyin/tone keys preserved) |

---

## 3. Strict Preview Fixture Isolation

To satisfy Phần R ("Visual test data không lưu vào database"):
1. **In-Memory Fixtures**: All populated demo states are defined in `src/data/english-preview-fixtures.ts`.
2. **Read-Only / Ephemeral Injection**: Preview fixtures are only rendered when explicitly requested via the runtime flag `preview=true` (e.g., in visual test runner or headless QA).
3. **Zero SQLite Writes**: No preview data is ever passed to `database.execAsync()` or inserted into SQLite tables.
4. **Native Production Safety**: The URL query parameter mechanism (`window.location.search`) only exists in browser/web QA environments; in production React Native/Hermes on Android, `window` does not exist and preview fixtures cannot be triggered by end users.

---

## 4. Verification Check
- SQLite integrity check: Passed.
- Unit tests for DB services: 100% Passed.
- Database Schema Diff: Identical (0 lines changed in DB services).

**Status: DATABASE SAFETY GATE PASSED (ZERO MUTATIONS)**
