import type { SQLiteDatabase } from 'expo-sqlite';

export const WORD_CONTEXT_SOURCES = ['READER', 'STORY', 'OCR', 'LESSON', 'LISTENING', 'AI'] as const;
export type WordContextSource = (typeof WORD_CONTEXT_SOURCES)[number];

export type WordContextRow = {
  id: string;
  vocabulary_id: string;
  source_type: WordContextSource;
  source_id: string;
  source_title: string;
  sentence_text: string;
  pinyin: string | null;
  translation_vi: string | null;
  position_metadata: string;
  created_at: string;
};

export type WordContextInput = Omit<WordContextRow, 'created_at'> & { createdAt?: string };

const isNonEmptyText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function validatePositionMetadata(value: string): void {
  if (value.length > 4000) throw new Error('INVALID_WORD_CONTEXT');
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID');
  } catch {
    throw new Error('INVALID_WORD_CONTEXT');
  }
}

export function validateWordContextRecord(value: unknown): asserts value is WordContextRow {
  if (!value || typeof value !== 'object') throw new Error('INVALID_WORD_CONTEXT');
  const row = value as WordContextRow;
  if (!isNonEmptyText(row.id, 200) || !isNonEmptyText(row.vocabulary_id, 200) ||
      !WORD_CONTEXT_SOURCES.includes(row.source_type) || !isNonEmptyText(row.source_id, 300) ||
      typeof row.source_title !== 'string' || row.source_title.length > 300 ||
      !isNonEmptyText(row.sentence_text, 2000) ||
      (row.pinyin !== null && (typeof row.pinyin !== 'string' || row.pinyin.length > 500)) ||
      (row.translation_vi !== null && (typeof row.translation_vi !== 'string' || row.translation_vi.length > 2000)) ||
      typeof row.position_metadata !== 'string' ||
      typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))) {
    throw new Error('INVALID_WORD_CONTEXT');
  }
  validatePositionMetadata(row.position_metadata);
}

/** Stable local key prevents duplicate captures of the same source position. */
export function wordContextId(vocabularyId: string, sourceType: WordContextSource, sourceId: string, positionMetadata: string): string {
  const input = `${vocabularyId}\u0000${sourceType}\u0000${sourceId}\u0000${positionMetadata}`;
  let hash = 2166136261;
  for (const character of input) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `ctx-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function saveWordContext(
  db: SQLiteDatabase,
  input: WordContextInput,
  now = new Date().toISOString(),
): Promise<void> {
  const row: WordContextRow = {
    ...input,
    source_title: input.source_title.trim(),
    sentence_text: input.sentence_text.trim(),
    pinyin: input.pinyin?.trim() || null,
    translation_vi: input.translation_vi?.trim() || null,
    position_metadata: input.position_metadata.trim() || '{}',
    created_at: input.createdAt ?? now,
  };
  validateWordContextRecord(row);
  await db.runAsync(`INSERT INTO word_contexts
    (id,vocabulary_id,source_type,source_id,source_title,sentence_text,pinyin,translation_vi,position_metadata,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET source_title=excluded.source_title,
      sentence_text=excluded.sentence_text,pinyin=excluded.pinyin,
      translation_vi=excluded.translation_vi,position_metadata=excluded.position_metadata`,
  row.id, row.vocabulary_id, row.source_type, row.source_id, row.source_title,
  row.sentence_text, row.pinyin, row.translation_vi, row.position_metadata, row.created_at);
}

export async function listWordContexts(db: SQLiteDatabase, vocabularyId: string, limit = 3): Promise<WordContextRow[]> {
  const bounded = Number.isFinite(limit) ? Math.max(1, Math.min(20, Math.floor(limit))) : 3;
  return db.getAllAsync<WordContextRow>(`SELECT id,vocabulary_id,source_type,source_id,source_title,
    sentence_text,pinyin,translation_vi,position_metadata,created_at
    FROM word_contexts WHERE vocabulary_id=? ORDER BY created_at DESC,id LIMIT ?`, vocabularyId, bounded);
}

export async function deleteWordContext(db: SQLiteDatabase, id: string): Promise<void> {
  if (!isNonEmptyText(id, 200)) throw new Error('INVALID_WORD_CONTEXT');
  await db.runAsync('DELETE FROM word_contexts WHERE id=?', id);
}

/** Personal contexts are preferred over generic examples; source ordering is only a tie-breaker. */
export function compareWordContextSources(left: WordContextSource, right: WordContextSource): number {
  const priority: Record<WordContextSource, number> = { READER: 6, STORY: 5, OCR: 4, LESSON: 3, LISTENING: 2, AI: 1 };
  return priority[right] - priority[left];
}
