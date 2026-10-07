import type { SQLiteDatabase } from 'expo-sqlite';

import { lexicalV5Drafts, type LexicalDraft } from '@/data/lexical-v5-drafts';
import { lexicalReadingMatchesForWord } from '@/services/vocabulary/lexical-reading';

export function validateLexicalDraft(value: LexicalDraft): void {
  if (!/^sense-v5-[a-z0-9-]+$/u.test(value.id) || !value.hanzi || !value.definitionVi.trim() || !value.usageVi.trim() || !value.pos.trim() || value.reviewStatus !== 'DRAFT' || value.origin !== 'AI_ASSISTED' || value.sourceRef !== '4Chinese:original-lexical-v5' || !/^[a-züv:]+[1-5](?: [a-züv:]+[1-5])*$/iu.test(value.numeric)) throw new Error('INVALID_LEXICAL_DRAFT');
  if (!value.example.chinese.includes(value.hanzi) || /正在学习.*这个词|这是.*例句/u.test(value.example.chinese) || !value.example.pinyin.trim() || !value.example.vietnamese.trim() || value.collocations.length < 2 || value.collocations.length > 4) throw new Error('INVALID_LEXICAL_CONTEXT');
  const expressions = new Set<string>();
  for (const phrase of value.collocations) {
    if (!phrase.chinese.includes(value.hanzi) || !phrase.pinyin.trim() || !phrase.vietnamese.trim() || expressions.has(phrase.chinese)) throw new Error('INVALID_LEXICAL_COLLOCATION');
    expressions.add(phrase.chinese);
  }
}
/** Editorial staging only: no definition overwrite and no automatic review promotion. */
export async function stageLexicalV5Drafts(db: SQLiteDatabase) {
  const unresolved: string[] = [];
  let staged = 0;
  await db.withTransactionAsync(async () => {
    for (const draft of lexicalV5Drafts) {
      validateLexicalDraft(draft);
      const candidates = await db.getAllAsync<{ id: string; pinyin_numeric: string | null }>('SELECT id,pinyin_numeric FROM vocabulary WHERE simplified=? AND is_custom=0 ORDER BY frequency_rank,id LIMIT 12', draft.hanzi);
      const word = candidates.find(candidate => lexicalReadingMatchesForWord(draft.hanzi, candidate.pinyin_numeric, draft.numeric));
      if (!word) { unresolved.push(draft.id); continue; }
      await db.runAsync(`INSERT OR IGNORE INTO word_senses(vocabulary_id,sense_id,part_of_speech,definition_vi,pinyin_numeric,usage_note,source_ref,review_status)
        VALUES(?,?,?,?,?,?,?,'DRAFT')`, word.id, draft.id, draft.pos, draft.definitionVi, draft.numeric, draft.usageVi, draft.sourceRef);
      for (const phrase of draft.collocations) await db.runAsync(`INSERT OR IGNORE INTO word_collocations(vocabulary_id,sense_id,expression,pinyin,translation_vi,source_ref,review_status)
        VALUES(?,?,?,?,?,?,'DRAFT')`, word.id, draft.id, phrase.chinese, phrase.pinyin, phrase.vietnamese, draft.sourceRef);
      const sentenceId = `sentence-${draft.id}`;
      await db.runAsync(`INSERT OR IGNORE INTO sentences(id,hanzi,pinyin,translation_vi,hsk_level,source,created_at,provenance,review_status)
        VALUES(?,?,?,?,NULL,?,'2026-10-01T00:00:00Z','AI_DRAFT','PENDING')`, sentenceId, draft.example.chinese, draft.example.pinyin, draft.example.vietnamese, draft.sourceRef);
      await db.runAsync('INSERT OR IGNORE INTO word_sense_examples(vocabulary_id,sense_id,sentence_id) VALUES(?,?,?)', word.id, draft.id, sentenceId);
      staged++;
    }
  });
  return { staged, unresolved };
}
export type PublishedSense = { sense_id: string; part_of_speech: string; definition_vi: string; pinyin_numeric: string; usage_note: string; vocabulary_id: string };
export type PublishedCollocation = { sense_id: string; expression: string; pinyin: string; translation_vi: string };
export async function listPublishedLexicalKnowledge(db: SQLiteDatabase, vocabularyId: string) {
  const senses = await db.getAllAsync<PublishedSense>(`SELECT s.vocabulary_id,s.sense_id,s.part_of_speech,s.definition_vi,s.pinyin_numeric,s.usage_note
    FROM word_senses s WHERE s.vocabulary_id=? AND s.review_status='PUBLISHED'
    AND length(trim(s.reviewed_by))>0 AND length(trim(s.reviewed_at))>0 AND length(trim(s.source_ref))>0
    ORDER BY s.sense_id LIMIT 12`, vocabularyId);
  const collocations = await db.getAllAsync<PublishedCollocation>(`SELECT c.sense_id,c.expression,c.pinyin,c.translation_vi FROM word_collocations c
    JOIN word_senses s ON s.vocabulary_id=c.vocabulary_id AND s.sense_id=c.sense_id
    WHERE c.vocabulary_id=? AND c.review_status='PUBLISHED' AND s.review_status='PUBLISHED'
    AND length(trim(s.reviewed_by))>0 AND length(trim(s.reviewed_at))>0
    ORDER BY c.sense_id,c.expression LIMIT 36`, vocabularyId);
  return { senses, collocations };
}
