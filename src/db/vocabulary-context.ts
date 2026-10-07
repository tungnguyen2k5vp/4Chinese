import type { SQLiteDatabase } from 'expo-sqlite';

import { saveWordContext, wordContextId } from './word-contexts';

export type ContextSource = 'READER' | 'STORY' | 'OCR' | 'LESSON';
export type VocabularyContextInput = {
  vocabularyId: string; sentence: string; sourceType: ContextSource;
  sourceId: string; location: string; senseId?: string | null;
};
export type VocabularyContextRow = {
  vocabulary_id: string; sentence: string; source_type: ContextSource;
  source_id: string; location: string; sense_id: string | null;
  created_at: string; updated_at: string;
};

export function validateContextRecord(value: unknown): asserts value is VocabularyContextRow {
  if (!value || typeof value !== 'object') throw new Error('INVALID_PERSONAL_CONTEXT');
  const row = value as VocabularyContextRow;
  if (!['READER','STORY','OCR','LESSON'].includes(row.source_type) ||
    ![row.vocabulary_id,row.source_id,row.location].every(text => typeof text === 'string' && text.trim().length > 0 && text.length <= 300) ||
    typeof row.sentence !== 'string' || !row.sentence.trim() || row.sentence.length > 2000 ||
    (row.sense_id !== null && (typeof row.sense_id !== 'string' || !row.sense_id.trim() || row.sense_id.length > 300)) ||
    ![row.created_at,row.updated_at].every(date => typeof date === 'string' && Number.isFinite(Date.parse(date)))) {
    throw new Error('INVALID_PERSONAL_CONTEXT');
  }
}

/** Local only: this repository has no cloud/AI transport. Explicit backup may include context. */
export async function saveVocabularyContext(db: SQLiteDatabase, input: VocabularyContextInput, now = new Date().toISOString()): Promise<void> {
  const row: VocabularyContextRow = {
    vocabulary_id: input.vocabularyId, sentence: input.sentence.trim(), source_type: input.sourceType,
    source_id: input.sourceId, location: input.location, sense_id: input.senseId ?? null,
    created_at: now, updated_at: now,
  };
  validateContextRecord(row);
  await db.runAsync(`INSERT INTO personal_vocabulary_context
    (vocabulary_id,source_type,source_id,location,sentence,sense_id,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(vocabulary_id,source_type,source_id,location)
    DO UPDATE SET sentence=excluded.sentence,sense_id=excluded.sense_id,updated_at=excluded.updated_at`,
  row.vocabulary_id,row.source_type,row.source_id,row.location,row.sentence,row.sense_id,now,now);
  const positionMetadata = JSON.stringify({ location: row.location });
  await saveWordContext(db, {
    id: wordContextId(row.vocabulary_id, row.source_type, row.source_id, positionMetadata),
    vocabulary_id: row.vocabulary_id,
    source_type: row.source_type,
    source_id: row.source_id,
    source_title: '',
    sentence_text: row.sentence,
    pinyin: null,
    translation_vi: null,
    position_metadata: positionMetadata,
  }, now);
}

export async function listVocabularyContexts(db: SQLiteDatabase, vocabularyId: string, limit = 3): Promise<VocabularyContextRow[]> {
  const bounded = Number.isFinite(limit) ? Math.max(1,Math.min(20,Math.floor(limit))) : 3;
  return db.getAllAsync<VocabularyContextRow>(`SELECT * FROM personal_vocabulary_context
    WHERE vocabulary_id=? ORDER BY updated_at DESC,source_type,source_id,location LIMIT ?`, vocabularyId,bounded);
}

export async function deleteVocabularyContext(db: SQLiteDatabase, row: VocabularyContextRow): Promise<void> {
  validateContextRecord(row);
  await db.runAsync('DELETE FROM personal_vocabulary_context WHERE vocabulary_id=? AND source_type=? AND source_id=? AND location=?',
    row.vocabulary_id,row.source_type,row.source_id,row.location);
}

/** Mask all occurrences, including the traditional answer, before an SRS answer is revealed. */
export function contextCloze(sentence: string, answers: readonly string[]): string | null {
  let result = sentence;
  const targets = [...new Set(answers.map(value => value.trim()).filter(Boolean))].sort((a,b) => b.length-a.length);
  if (!targets.some(answer => sentence.includes(answer))) return null;
  for (const answer of targets) result = result.split(answer).join('＿＿');
  return result;
}
