# Vietnamese vocabulary quality audit V6

Audit date: 2026-10-07. Source is the read-only deterministic local content audit. Counts are **heuristic review flags**, not adjudicated errors.

| Internal band | Gloss/meaning flags | Tone/pinyin flags | Traditional-form flags | Seed-declared verified glosses | Independent reviewer evidence |
|---|---:|---:|---:|---:|---|
| HSK 1 | 453 | 1 | 20 | 66 | unknown |
| HSK 2 | 730 | 25 | 30 | 46 | unknown |
| HSK 3 | 955 | 3 | 52 | 8 | unknown |
| HSK 4 | 983 | 4 | 29 | 32 | unknown |
| HSK 5 | 1,458 | 361 | 42 | 3 | unknown |
| HSK 6 | 1,240 | 82 | 47 | 3 | unknown |
| HSK 7–9 combined | 5,915 | 23 | 145 | 2 | unknown |
| **Total** | **11,734** | **499** | **365** | **160** | **unknown** |

Flags include broad/long or duplicate glosses, placeholders/reading notes, unchanged English primary glosses, missing or suspicious translation metadata, NFC/tone comparison anomalies, umlaut/neutral-tone/erhua cases, and conservative traditional-character review candidates. They do not prove a wrong translation, wrong POS, incorrect pronunciation, or invalid traditional form. Declared `verified` data is a source flag, not proof of independent bilingual review. No independent reviewer evidence was supplied.

## Review order and constraints

1. Start with HSK 1–3, then high-impact HSK 4–6, then review 7–9 by its individual official level once a versioned reference exists.
2. For each flagged word, record stable vocabulary ID, intended sense/POS, source text, reason, reviewer, date, and disposition. Human review must compare Chinese usage, natural Vietnamese, context and target learner level.
3. Keep multiple readings as separate lexical senses. Do not strip tone marks, convert simplified/traditional automatically, overwrite the seed, or mass-generate Vietnamese definitions/examples with AI.
4. Publish only after a human-reviewed source and evidence are recorded. A validator can reject malformed data; it cannot certify naturalness.

No corpus edits were made solely from heuristic flags in this pass. This avoids turning a likely issue into an unverified “fix.” See [HSK coverage](HSK_COVERAGE_V6.md) and [example coverage](EXAMPLE_COVERAGE_V6.md).
