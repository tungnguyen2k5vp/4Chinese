import type { SQLiteDatabase } from 'expo-sqlite';

import { saveWordContext, wordContextId } from './word-contexts';

export type ContextSource = 'READER' | 'STORY' | 'OCR' | 'LESSON';
export type PersonalContextSource = ContextSource | 'LISTENING' | 'AI_SELECTED' | 'CUSTOM';
export type VocabularyContextInput = {
  vocabularyId: string; sentence: string; sourceType: ContextSource;
  sourceId: string; location: string; senseId?: string | null;
  /** Required: saving a word must not silently save private reader/OCR text. */
  userConfirmed: true;
};
export type PersonalContextMemoryInput = {
  vocabularyId: string; sentence: string; sourceType: PersonalContextSource;
  sourceId: string; sourceTitle?: string; pinyin?: string | null;
  translationVi?: string | null; senseId?: string | null; contextLocator: string; userConfirmed: boolean;
};
export type VocabularyContextRow = {
  id: string; vocabulary_id: string; sentence: string; source_type: PersonalContextSource;
  source_id: string; source_title: string; location: string; pinyin: string | null;
  translation_vi: string | null; sense_id: string | null; user_selected: 1;
  created_at: string; updated_at: string;
};

export function validateContextRecord(value: unknown): asserts value is {
  vocabulary_id: string; sentence: string; source_type: ContextSource;
  source_id: string; location: string; sense_id: string | null;
  created_at: string; updated_at: string;
} {
  if (!value || typeof value !== 'object') throw new Error('INVALID_PERSONAL_CONTEXT');
  const row = value as Record<string, unknown>;
  if (!['READER','STORY','OCR','LESSON'].includes(String(row.source_type)) ||
    ![row.vocabulary_id,row.source_id,row.location].every(text => typeof text === 'string' && text.trim().length > 0 && text.length <= 300) ||
    typeof row.sentence !== 'string' || !row.sentence.trim() || row.sentence.length > 2000 ||
    (row.sense_id !== null && (typeof row.sense_id !== 'string' || !row.sense_id.trim() || row.sense_id.length > 300)) ||
    ![row.created_at,row.updated_at].every(date => typeof date === 'string' && Number.isFinite(Date.parse(date)))) {
    throw new Error('INVALID_PERSONAL_CONTEXT');
  }
}

export function validatePersonalContextMemoryRecord(value: unknown): asserts value is VocabularyContextRow {
  if (!value || typeof value !== 'object') throw new Error('INVALID_PERSONAL_CONTEXT_MEMORY');
  const row = value as Partial<VocabularyContextRow>;
  const locator = row.location ?? (value as { context_locator?: unknown }).context_locator;
  const sentence = row.sentence ?? (value as { sentence_text?: unknown }).sentence_text;
  if (typeof row.id !== 'string' || !row.id.trim() || row.id.length > 200 ||
      !['READER','STORY','OCR','LESSON','LISTENING','AI_SELECTED','CUSTOM'].includes(String(row.source_type)) ||
      ![row.vocabulary_id,row.source_id,locator].every(text => typeof text === 'string' && text.trim().length > 0 && text.length <= 2000) ||
      typeof sentence !== 'string' || !sentence.trim() || sentence.length > 2000 ||
      typeof row.source_title !== 'string' || row.source_title.length > 300 ||
      (row.pinyin !== null && (typeof row.pinyin !== 'string' || row.pinyin.length > 500)) ||
      (row.translation_vi !== null && (typeof row.translation_vi !== 'string' || row.translation_vi.length > 2000)) ||
      (row.sense_id !== null && (typeof row.sense_id !== 'string' || !row.sense_id.trim() || row.sense_id.length > 300)) ||
      row.user_selected !== 1 ||
      ![row.created_at,row.updated_at].every(date => typeof date === 'string' && Number.isFinite(Date.parse(date)))) {
    throw new Error('INVALID_PERSONAL_CONTEXT_MEMORY');
  }
}

function stableContextId(input: Pick<PersonalContextMemoryInput,'vocabularyId'|'sourceType'|'sourceId'|'contextLocator'>): string {
  let hash = 2166136261;
  for (const character of `${input.vocabularyId}\u0000${input.sourceType}\u0000${input.sourceId}\u0000${input.contextLocator}`) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `personal-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

async function upsertPersonalContextMemory(db: SQLiteDatabase, input: PersonalContextMemoryInput, now: string): Promise<void> {
  if (input.userConfirmed !== true) throw new Error('PERSONAL_CONTEXT_CONSENT_REQUIRED');
  const sentence = input.sentence.trim();
  const sourceTitle = input.sourceTitle?.trim() ?? '';
  const pinyin = input.pinyin?.trim() || null;
  const translationVi = input.translationVi?.trim() || null;
  const senseId = input.senseId?.trim() || null;
  if (!input.vocabularyId.trim() || input.vocabularyId.length > 200 ||
      !['READER','STORY','OCR','LESSON','LISTENING','AI_SELECTED','CUSTOM'].includes(input.sourceType) ||
      !input.sourceId.trim() || input.sourceId.length > 300 || !input.contextLocator.trim() || input.contextLocator.length > 2000 ||
      !sentence || sentence.length > 2000 || sourceTitle.length > 300 ||
      (pinyin && pinyin.length > 500) || (translationVi && translationVi.length > 2000) || (senseId && senseId.length > 300)) {
    throw new Error('INVALID_PERSONAL_CONTEXT_MEMORY');
  }
  await db.runAsync(`INSERT INTO personal_context_memory
    (id,vocabulary_id,source_type,source_id,source_title,sentence_text,pinyin,translation_vi,sense_id,context_locator,user_selected,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?)
    ON CONFLICT(vocabulary_id,source_type,source_id,context_locator) DO UPDATE SET
      source_title=excluded.source_title,sentence_text=excluded.sentence_text,pinyin=excluded.pinyin,
      translation_vi=excluded.translation_vi,sense_id=excluded.sense_id,user_selected=1,updated_at=excluded.updated_at`,
  stableContextId(input),input.vocabularyId,input.sourceType,input.sourceId,sourceTitle,sentence,pinyin,
  translationVi,senseId,input.contextLocator,now,now);
}

/** All sources, including AI_SELECTED and CUSTOM, require a deliberate user action and stay local. */
export async function savePersonalContextMemory(db: SQLiteDatabase, input: PersonalContextMemoryInput,
  now = new Date().toISOString()): Promise<void> {
  await db.withTransactionAsync(async () => upsertPersonalContextMemory(db,input,now));
}

/** Legacy reader graph stays in sync atomically for existing callers/backup compatibility. */
export async function saveVocabularyContext(db: SQLiteDatabase, input: VocabularyContextInput,
  now = new Date().toISOString()): Promise<void> {
  const row = { vocabulary_id: input.vocabularyId, sentence: input.sentence.trim(), source_type: input.sourceType,
    source_id: input.sourceId, location: input.location, sense_id: input.senseId ?? null, created_at: now, updated_at: now };
  validateContextRecord(row);
  if (input.userConfirmed !== true) throw new Error('PERSONAL_CONTEXT_CONSENT_REQUIRED');
  const positionMetadata = JSON.stringify({ location: row.location });
  await db.withTransactionAsync(async () => {
    await db.runAsync(`INSERT INTO personal_vocabulary_context
      (vocabulary_id,source_type,source_id,location,sentence,sense_id,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(vocabulary_id,source_type,source_id,location)
      DO UPDATE SET sentence=excluded.sentence,sense_id=excluded.sense_id,updated_at=excluded.updated_at`,
    row.vocabulary_id,row.source_type,row.source_id,row.location,row.sentence,row.sense_id,now,now);
    await saveWordContext(db, {
      id: wordContextId(row.vocabulary_id, row.source_type, row.source_id, positionMetadata),
      vocabulary_id: row.vocabulary_id, source_type: row.source_type, source_id: row.source_id,
      source_title: '', sentence_text: row.sentence, pinyin: null, translation_vi: null,
      position_metadata: positionMetadata,
    }, now);
    await upsertPersonalContextMemory(db, { vocabularyId: row.vocabulary_id, sentence: row.sentence,
      sourceType: row.source_type, sourceId: row.source_id, contextLocator: row.location,
      senseId: row.sense_id,
      userConfirmed: true }, now);
  });
}

export async function listVocabularyContexts(db: SQLiteDatabase, vocabularyId: string, limit = 3, senseId?: string | null,
  includeUnavailableSources = false): Promise<VocabularyContextRow[]> {
  const bounded = Number.isFinite(limit) ? Math.max(1,Math.min(20,Math.floor(limit))) : 3;
  return db.getAllAsync<VocabularyContextRow>(`SELECT id,vocabulary_id,source_type,source_id,source_title,
    sentence_text AS sentence,context_locator AS location,pinyin,translation_vi,sense_id,
    user_selected,created_at,updated_at FROM personal_context_memory
    WHERE vocabulary_id=? AND (sense_id IS NULL OR (? IS NOT NULL AND sense_id=?))
      AND (?=1 OR NOT EXISTS (SELECT 1 FROM reading_documents d WHERE d.id=personal_context_memory.source_id AND d.deleted_at IS NOT NULL))
    ORDER BY updated_at DESC,source_type,source_id,context_locator LIMIT ?`, vocabularyId,senseId ?? null,senseId ?? null,includeUnavailableSources ? 1 : 0,bounded);
}

export async function deleteVocabularyContext(db: SQLiteDatabase, row: VocabularyContextRow): Promise<void> {
  validatePersonalContextMemoryRecord(row);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM personal_context_memory WHERE id=?',row.id);
    if (['READER','STORY','OCR','LESSON'].includes(row.source_type)) {
      await db.runAsync('DELETE FROM personal_vocabulary_context WHERE vocabulary_id=? AND source_type=? AND source_id=? AND location=?',
        row.vocabulary_id,row.source_type,row.source_id,row.location);
    }
    const positionMetadata = row.source_type === 'LISTENING' || row.source_type === 'AI_SELECTED' || row.source_type === 'CUSTOM'
      ? row.location : JSON.stringify({ location: row.location });
    await db.runAsync(`DELETE FROM word_contexts WHERE vocabulary_id=? AND source_id=? AND
      ((source_type=? AND position_metadata=?) OR (source_type='AI' AND ?='AI_SELECTED' AND position_metadata=?))`,
    row.vocabulary_id,row.source_id,row.source_type,positionMetadata,row.source_type,positionMetadata);
  });
}

/** Mask all occurrences, including the traditional answer, before an SRS answer is revealed. */
export function contextCloze(sentence: string, answers: readonly string[]): string | null {
  let result = sentence;
  const targets = [...new Set(answers.map(value => value.trim()).filter(Boolean))].sort((a,b) => b.length-a.length);
  if (!targets.some(answer => sentence.includes(answer))) return null;
  for (const answer of targets) result = result.split(answer).join('＿＿');
  return result;
}
