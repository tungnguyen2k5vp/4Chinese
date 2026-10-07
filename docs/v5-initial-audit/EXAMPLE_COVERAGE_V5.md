# Example coverage V5

Counts are word buckets, not total sentences. Reviewed means an explicit reviewed lifecycle plus source evidence, with malformed/generic/link-conflicting examples excluded. Vocabulary examples have no review lifecycle: do not infer it from translationStatus. Grammar shared-sentence seed declarations are reproduced exactly (non-vn points REVIEWED; vn contrasts PENDING), linking tokens to the first bundled vocabulary ID as existing seeding does. Shared token links do not prove target-sense usage. No SQLite database is opened.

| HSK | Words | 0 reviewed | 1 | 2 | 3+ | 0 independent review | Stored examples | Shared links | Generic flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 508 | 436 | 47 | 9 | 16 | 508 | 12 | 191 | 0 |
| 2 | 770 | 747 | 23 | 0 | 0 | 770 | 24 | 25 | 0 |
| 3 | 955 | 948 | 7 | 0 | 0 | 955 | 6 | 10 | 0 |
| 4 | 1006 | 1003 | 3 | 0 | 0 | 1006 | 30 | 3 | 0 |
| 5 | 1078 | 1073 | 4 | 1 | 0 | 1078 | 1 | 6 | 0 |
| 6 | 1154 | 1152 | 2 | 0 | 0 | 1154 | 1 | 2 | 0 |
| 7-9 | 5908 | 5906 | 2 | 0 | 0 | 5908 | 1 | 2 | 0 |

Independent review requires an explicit reviewer in addition to lifecycle/source evidence; none is inferred from curated provenance. AI-generated examples require reviewer evidence even when labelled VERIFIED/PUBLISHED. Identical IDs count at most once; dangling/wrong vocabulary links, incompatible explicit senses, missing fields, suspicious pinyin and metalinguistic templates are flagged. “Tôi đang học từ X” and “Đây là ví dụ của từ X” never earn reviewed coverage.

Raw stored examples: 0; canonical stored examples: 75; shared sentence seed: 47. Shared links may associate one sentence with multiple words. Runtime curated fallbacks are not added to reviewed counts or treated as stored seed examples. The 0/1/2/3+ buckets sum to each level’s internal vocabulary total.

Review naturalness, target sense, translation and level appropriateness before publication; prioritize HSK1 → HSK2 → HSK3. See [V5_DATA_AUDIT.md](V5_DATA_AUDIT.md) for exact reproduction and [V5_DATA_AUDIT.json](V5_DATA_AUDIT.json) for stable-ID diagnostics.
