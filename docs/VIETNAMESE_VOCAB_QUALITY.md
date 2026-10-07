# Vietnamese vocabulary quality V5

Vietnamese-first review queue, HSK1–3 first. No corpus edits. Declared verified is the existing translation flag, not independent evidence of naturalness, sense/POS correctness, licensing or academic approval. Independent verification is unknown, not inferred from absence of heuristic flags.

| HSK | Words | Suspect/review queue | Declared verified | Independent verification | Pinyin flags | Neutral entries | ü notation | Multiple readings | Erhua | Traditional flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 508 | 452 | 65 | unknown | 0 | 90 | 6 | 0 | 14 | 17 |
| 2 | 770 | 727 | 47 | unknown | 23 | 68 | 6 | 0 | 8 | 25 |
| 3 | 955 | 949 | 6 | unknown | 3 | 40 | 5 | 0 | 2 | 44 |
| 4 | 1006 | 975 | 31 | unknown | 4 | 58 | 12 | 0 | 4 | 23 |
| 5 | 1078 | 1075 | 3 | unknown | 3 | 55 | 2 | 0 | 6 | 25 |
| 6 | 1154 | 1152 | 2 | unknown | 4 | 36 | 8 | 0 | 2 | 35 |
| 7-9 | 5908 | 5906 | 2 | unknown | 20 | 248 | 41 | 0 | 19 | 140 |

Detections: missing/duplicate glosses, unchanged English primary glosses, possible encoding damage, dictionary placeholders/reading notes, opaque POS codes, broad/long glosses and machine/missing translation status. Legitimate loanwords, surnames and short accent-free Vietnamese can trigger review; no flag proves a translation wrong. Naturalness, overly broad senses, wrong POS and missing context require bilingual human review. No AI output becomes VERIFIED.

Pinyin compares NFC tone marks against numeric 1–4 and neutral 0/5, accepts v/u:/ü aliases, apostrophes and spaced/joined marked forms, reports multiple readings and erhua. It never strips tones for agreement or overwrites readings. Syllabic nasal tones are flagged when the reused converter cannot safely compare them. Syntax/agreement is not lexical pronunciation verification. Traditional flags cover observed one-to-many forms and a conservative contextual-character watchlist, not an exhaustive conversion validator.

## HSK1–3 sample queue (stable IDs; full queue in JSON)

| HSK | ID | Word | Reasons |
| --- | --- | --- | --- |
| 1 | hsk-0201e7fce576 | 行 | BROAD_OR_LONG_GLOSS_REVIEW, POS_NEEDS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-02463bf744db | 的 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED, VARIANT_OR_READING_NOTE_NEEDS_CONTEXT |
| 1 | hsk-025faf401bc4 | 先生 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-031a13f23efe | 左 | BROAD_OR_LONG_GLOSS_REVIEW, DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED, VARIANT_OR_READING_NOTE_NEEDS_CONTEXT |
| 1 | hsk-03a1c4362163 | 车 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-04729019d272 | 拿 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-047fa96212ad | 见 | POS_NEEDS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-05ba591635c0 | 早饭 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-06aa3ef90012 | 考试 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-08da58b0ae2d | 跟 | BROAD_OR_LONG_GLOSS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-09c405eb8955 | 有 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-0ba85ea946ac | 也 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-0c2c2edbde6c | 们 | POS_NEEDS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-0db6fd0af0d5 | 书 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, POS_NEEDS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-0fec866b3f71 | 球 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-102cc4078d73 | 包 | BROAD_OR_LONG_GLOSS_REVIEW, DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-148d8bf7eb6b | 冷 | POS_NEEDS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-15a614eef586 | 能 | POS_NEEDS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-17247e789f2f | 干 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-172c6e4896b2 | 风 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, POS_NEEDS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-192ef2838b28 | 起 | BROAD_OR_LONG_GLOSS_REVIEW, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-193ea8d9f50d | 图书馆 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-19b580f69479 | 奶 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED, VARIANT_OR_READING_NOTE_NEEDS_CONTEXT |
| 1 | hsk-19c979fa9c68 | 桌子 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |
| 1 | hsk-1bfe03d9c775 | 课文 | DICTIONARY_ARTIFACT_OR_PLACEHOLDER, TRANSLATION_NOT_DECLARED_VERIFIED |

See [V5_DATA_AUDIT.md](V5_DATA_AUDIT.md) for reproduction and evidence limits.
