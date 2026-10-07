import type { SQLiteDatabase } from 'expo-sqlite';

import { encodeReaderCharacterPosition, MAX_READER_CHARACTERS, READER_CHUNK_CHARACTERS,
  sentenceAtCharacter, splitReaderChunks, type ReaderChunk } from '@/services/reader/pages';
import type { ReaderToken } from '@/services/reader/segment';
import { normalizeSearch } from '@/services/search/normalize';
import type { Vocabulary } from '@/types/models';

/** Text is always split on Unicode code points so surrogate pairs are never broken. */
export const READING_CHUNK_CHARACTERS = READER_CHUNK_CHARACTERS;
export const MAX_READING_DOCUMENT_CHARACTERS = MAX_READER_CHARACTERS;

export type ReadingDocument = { id: string; title: string; content: string; created_at: string;
  updated_at: string; last_token_index: number; coverage_percent: number; last_read_at: string | null };

type ReadingChunk = { content: string };
/** Mirrors the existing deck-copy deduplication key without changing repository contracts/IDs. */
export async function getReadingDeckCopyId(db: SQLiteDatabase, deckId: string,
  word: Pick<Vocabulary, 'simplified' | 'pinyinNumeric' | 'pinyin'>): Promise<string | null> {
  const rows = await db.getAllAsync<{ id: string; pinyin_numeric: string }>(`SELECT v.id,v.pinyin_numeric
    FROM vocabulary v JOIN personal_deck d ON d.id=v.deck_id
    WHERE v.deck_id=? AND v.simplified=? AND d.deleted_at IS NULL ORDER BY v.id LIMIT 100`, deckId, word.simplified);
  const key = normalizeSearch(word.pinyinNumeric || word.pinyin);
  return rows.find((row) => normalizeSearch(row.pinyin_numeric) === key)?.id ?? null;
}
export type ReadingDocumentLayout = { chunk_count: number; character_count: number; last_token_index: number };

/** Metadata only: opening a saved novel never reconstructs it in JavaScript. */
export async function getReadingDocumentLayout(db: SQLiteDatabase, documentId: string): Promise<ReadingDocumentLayout | null> {
  const row = await db.getFirstAsync<ReadingDocumentLayout>(`SELECT
    COALESCE((SELECT COUNT(*) FROM reading_document_chunks WHERE document_id=d.id),0) AS chunk_count,
    COALESCE((SELECT MAX(char_end) FROM reading_document_chunks WHERE document_id=d.id),length(d.content)) AS character_count,
    COALESCE(p.last_token_index,0) AS last_token_index
    FROM reading_documents d LEFT JOIN reading_progress p ON p.document_id=d.id
    WHERE d.id=? AND d.deleted_at IS NULL`, documentId);
  return row ? { ...row, chunk_count: row.chunk_count || Math.ceil(row.character_count / READING_CHUNK_CHARACTERS) } : null;
}

export async function getReadingDocumentChunk(db: SQLiteDatabase, documentId: string, chunkIndex: number): Promise<ReaderChunk | null> {
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) return null;
  const chunk = await db.getFirstAsync<ReaderChunk>(`SELECT c.chunk_index,c.content,c.char_start,c.char_end
    FROM reading_document_chunks c JOIN reading_documents d ON d.id=c.document_id
    WHERE c.document_id=? AND c.chunk_index=? AND d.deleted_at IS NULL`, documentId, chunkIndex);
  if (chunk) return chunk;
  // Bounded fallback for older documents; do not mistake a missing modern chunk for a legacy preview.
  const start = chunkIndex * READING_CHUNK_CHARACTERS;
  const legacy = await db.getFirstAsync<{ content: string }>(`SELECT substr(d.content,?,?) AS content
    FROM reading_documents d WHERE d.id=? AND d.deleted_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM reading_document_chunks WHERE document_id=d.id)`, start + 1, READING_CHUNK_CHARACTERS, documentId);
  return legacy?.content ? { chunk_index: chunkIndex, content: legacy.content, char_start: start,
    char_end: start + Array.from(legacy.content).length } : null;
}

/** Only called on explicit context save; neighboring raw chunks recover sentences crossing a page boundary. */
export async function getReadingSentence(db: SQLiteDatabase, documentId: string, chunk: ReaderChunk,
  localOffset: number): Promise<string> {
  let text = chunk.content;
  let offset = localOffset;
  let first = chunk.chunk_index;
  let last = first;
  let sentence = sentenceAtCharacter(text, offset);
  while (sentence.start === 0 && first > 0) {
    const previous = await getReadingDocumentChunk(db, documentId, --first);
    if (!previous) break;
    text = previous.content + text; offset += Array.from(previous.content).length;
    sentence = sentenceAtCharacter(text, offset);
  }
  while (sentence.end === Array.from(text).length && !/[。！？!?\n]$/u.test(sentence.sentence)
    && Array.from(text).length < MAX_READING_DOCUMENT_CHARACTERS) {
    const next = await getReadingDocumentChunk(db, documentId, ++last);
    if (!next) break;
    text += next.content; sentence = sentenceAtCharacter(text, offset);
  }
  return sentence.sentence;
}

export async function listReadingDocuments(db: SQLiteDatabase): Promise<ReadingDocument[]> {
  return db.getAllAsync<ReadingDocument>(`SELECT d.id,d.title,substr(d.content,1,2000) AS content,d.created_at,d.updated_at,
    COALESCE(p.last_token_index,0) AS last_token_index,
    COALESCE(p.coverage_percent,0) AS coverage_percent,p.last_read_at
    FROM reading_documents d LEFT JOIN reading_progress p ON p.document_id=d.id
    WHERE d.deleted_at IS NULL ORDER BY COALESCE(p.last_read_at,d.updated_at) DESC LIMIT 100`);
}

/** Reads the complete document from chunks, with a safe fallback for pre-v28 documents. */
export async function getReadingDocumentContent(db: SQLiteDatabase, documentId: string): Promise<string | null> {
  const document = await db.getFirstAsync<{ content: string }>(`SELECT content FROM reading_documents
    WHERE id=? AND deleted_at IS NULL`, documentId);
  if (!document) return null;
  const chunks = await db.getAllAsync<ReadingChunk>(`SELECT content FROM reading_document_chunks
    WHERE document_id=? ORDER BY chunk_index ASC`, documentId);
  return chunks.length ? chunks.map((chunk) => chunk.content).join('') : document.content;
}

export async function saveReadingDocument(db: SQLiteDatabase, content: string, tokens: ReaderToken[],
  coveragePercent: number, title?: string, options?: { signal?: AbortSignal; characterOffset?: number }): Promise<string> {
  const clean = content.trim();
  const characters = Array.from(clean);
  if (!clean || characters.length > MAX_READING_DOCUMENT_CHARACTERS) throw new Error('INVALID_READING_DOCUMENT_LENGTH');
  const id = `reading-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const caption = title?.trim().slice(0, 80) || characters.slice(0, 30).join('');
  const wordCounts = new Map<string, number>();
  for (const token of tokens) if (token.vocabulary) {
    const wordId = token.vocabulary.id;
    wordCounts.set(wordId, (wordCounts.get(wordId) ?? 0) + 1);
  }
  await db.withTransactionAsync(async () => {
    const checkCanceled = () => { if (options?.signal?.aborted) throw new Error('READING_SAVE_CANCELED'); };
    checkCanceled();
    // `content` retains a bounded legacy preview. Reader pages use chunks, not this preview.
    await db.runAsync(`INSERT INTO reading_documents(id,title,content,created_at,updated_at)
      VALUES(?,?,?,?,?)`, id, caption, characters.slice(0, READING_CHUNK_CHARACTERS).join(''), now, now);
    await db.runAsync(`INSERT INTO reading_progress(document_id,last_token_index,coverage_percent,last_read_at)
      VALUES(?,?,?,?)`, id, options?.characterOffset === undefined ? 0 : encodeReaderCharacterPosition(options.characterOffset),
      Number.isFinite(coveragePercent) ? Math.max(0, Math.min(100, coveragePercent)) : 0, now);
    for (const chunk of splitReaderChunks(clean)) {
      checkCanceled();
      await db.runAsync(`INSERT INTO reading_document_chunks(document_id,chunk_index,content,char_start,char_end)
        VALUES(?,?,?,?,?)`, id, chunk.chunk_index, chunk.content, chunk.char_start, chunk.char_end);
    }
    for (const [wordId, occurrences] of wordCounts) await db.runAsync(`INSERT INTO reading_vocabulary
      (document_id,vocabulary_id,occurrences) VALUES(?,?,?)`, id, wordId, occurrences);
    checkCanceled();
  });
  return id;
}

export async function updateReadingCharacterPosition(db: SQLiteDatabase, documentId: string, offset: number): Promise<void> {
  const layout = await getReadingDocumentLayout(db, documentId);
  if (!layout) return;
  await db.runAsync(`INSERT INTO reading_progress(document_id,last_token_index,coverage_percent,last_read_at)
    VALUES(?,?,0,?) ON CONFLICT(document_id) DO UPDATE SET last_token_index=excluded.last_token_index,last_read_at=excluded.last_read_at`,
    documentId, encodeReaderCharacterPosition(Math.min(Math.max(0, Math.floor(offset)), Math.max(0, layout.character_count - 1))), new Date().toISOString());
}

export async function updateReadingPosition(db: SQLiteDatabase, documentId: string, tokenIndex: number): Promise<void> {
  await db.runAsync(`UPDATE reading_progress SET last_token_index=?,last_read_at=? WHERE document_id=?`,
    Math.max(0, Math.floor(tokenIndex)), new Date().toISOString(), documentId);
}

export async function deleteReadingDocument(db: SQLiteDatabase, documentId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE reading_documents SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL`,
    now, now, documentId);
}
