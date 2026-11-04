/** Separate content pack. NOT added to the Chinese runtime migration yet. */
export const englishDictionarySchema = `
PRAGMA foreign_keys=ON;
CREATE TABLE english_sources (
 source_id TEXT PRIMARY KEY, version TEXT NOT NULL, sha256 TEXT NOT NULL,
 license TEXT NOT NULL, distribution_status TEXT NOT NULL CHECK(distribution_status IN ('LICENSE_REVIEW_REQUIRED','APPROVED')),
 attribution TEXT NOT NULL
);
CREATE TABLE english_words (
 word_id TEXT PRIMARY KEY, headword TEXT NOT NULL, normalized_headword TEXT NOT NULL,
 lemma TEXT NOT NULL, entry_type TEXT NOT NULL CHECK(entry_type IN ('SINGLE_WORD','PHRASE','PHRASAL_VERB','IDIOM','COLLOCATION','COMPOUND')),
 frequency_rank INTEGER, source_id TEXT NOT NULL REFERENCES english_sources(source_id), source_entry_id TEXT NOT NULL,
 status TEXT NOT NULL, UNIQUE(source_id,source_entry_id)
);
CREATE INDEX english_headword ON english_words(normalized_headword,word_id);
CREATE INDEX english_lemma ON english_words(lemma,word_id);
CREATE TABLE english_senses (
 sense_id TEXT PRIMARY KEY, word_id TEXT NOT NULL REFERENCES english_words(word_id),
 part_of_speech TEXT NOT NULL, sub_pos TEXT, meaning_vi TEXT NOT NULL, normalized_meaning TEXT NOT NULL,
 definition_en TEXT, usage_note TEXT, register TEXT, region TEXT, sense_order INTEGER NOT NULL,
 source_id TEXT NOT NULL REFERENCES english_sources(source_id), review_status TEXT NOT NULL
);
CREATE INDEX english_sense_word ON english_senses(word_id,sense_order,sense_id);
CREATE INDEX english_pos ON english_senses(part_of_speech,word_id);
CREATE TABLE english_pronunciations (
 pronunciation_id TEXT PRIMARY KEY, word_id TEXT NOT NULL REFERENCES english_words(word_id),
 sense_id TEXT REFERENCES english_senses(sense_id), ipa TEXT NOT NULL, accent TEXT NOT NULL,
 pronunciation_variant TEXT, source_id TEXT NOT NULL REFERENCES english_sources(source_id), review_status TEXT NOT NULL
);
CREATE INDEX english_ipa_word ON english_pronunciations(word_id);
CREATE TABLE english_examples (
 example_id TEXT PRIMARY KEY, sense_id TEXT NOT NULL REFERENCES english_senses(sense_id),
 sentence_en TEXT NOT NULL, translation_vi TEXT, source_id TEXT NOT NULL REFERENCES english_sources(source_id), review_status TEXT NOT NULL
);
CREATE INDEX english_example_sense ON english_examples(sense_id);
CREATE TABLE english_forms (
 form_id TEXT PRIMARY KEY, word_id TEXT NOT NULL REFERENCES english_words(word_id), surface_form TEXT NOT NULL,
 normalized_form TEXT NOT NULL, lemma_id TEXT NOT NULL REFERENCES english_words(word_id), morphology_type TEXT NOT NULL,
 tense TEXT, number TEXT, irregularity_metadata TEXT, source_id TEXT NOT NULL REFERENCES english_sources(source_id)
);
CREATE INDEX english_form_lookup ON english_forms(normalized_form,word_id);
CREATE TABLE english_cefr (
 mapping_id TEXT PRIMARY KEY, word_id TEXT NOT NULL REFERENCES english_words(word_id), sense_id TEXT REFERENCES english_senses(sense_id),
 level TEXT NOT NULL CHECK(level IN ('A1','A2','B1','B2','C1','C2')), level_source TEXT NOT NULL REFERENCES english_sources(source_id), status TEXT NOT NULL,
 evidence_pos TEXT NOT NULL
);
CREATE INDEX english_cefr_level ON english_cefr(level,word_id);
CREATE VIRTUAL TABLE english_search USING fts5(word_id UNINDEXED,headword,meanings, tokenize='unicode61 remove_diacritics 2');
`;
