# Performance Baseline — Phase 22

## Scope

This benchmark measures the offline bulk vocabulary resolver against the
bundled dictionary (11,330 HSK records plus 49 supplemental records) using a
real in-memory SQLite database. It measures the same path used by the bulk
import UI: Vietnamese, Hanzi, and pinyin input are resolved and ranked.

Run npm run benchmark:bulk.

The numbers below are local SQLite/Node measurements. Device performance will
vary, so release testing must repeat the 1/10/50/100-line cases on Android.

## Bottleneck found

The previous path had two compounding costs:

1. It issued a SQLite candidate query per input line. Timers could return to
   the UI while uncancelled queries still occupied Android's SQLite queue.
2. It merged all candidates, then re-ranked that combined list for every
   input line. A 100-line import therefore repeated expensive scoring across
   a large unrelated union.

An exploratory pre-fix suite did not finish inside the 120-second command
limit. After the first batched-query change but before per-query grouping,
the 50- and 100-line cases were still 5,783 ms and 14,618 ms respectively.

## Implemented approach

- Keep the compact HSK 1-4/custom index as the fast path.
- Add schema v22 with a trigger-maintained SQLite FTS5 index for HSK 5-9 and
  custom words. It stores normalized search text and compact pinyin.
- Query FTS once only for inputs without a strong HSK 1-4/custom result.
- Transfer IDs first and fetch complete rows in bounded chunks.
- Group candidates by input before final ranking; an HSK 1-4 input ranks at
  most 48 already-scored candidates instead of the entire batch union.
- Preserve final ranking rules: exact Hanzi/pinyin/meaning outrank prefix,
  alias, and looser matches.

## Latest measurements

| Input lines | Resolved | Median | P95 |
| --- | ---: | ---: | ---: |
| 1 | 1/1 | 0.19 ms | 0.54 ms |
| 10 | 10/10 | 13.97 ms | 16.07 ms |
| 50 | 48/50 | 99.00 ms | 101.15 ms |
| 100 | 97/100 | 144.09 ms | 145.62 ms |

The three unmatched benchmark labels are retained as negative/coverage cases;
they are not silently mapped to a weak unrelated word. The bulk UI continues
to expose manual entry for any unmatched term.

## Regression checks

- src/db/vocabulary-search-fts.test.ts verifies HSK 5+ lookup through
  Vietnamese meaning and compact pinyin.
- src/db/content-migration-v20.test.ts protects user-owned data through a
  v20 upgrade.
- src/services/vocabulary/bulk-import.test.ts verifies ranking and bounded
  candidate retrieval.
