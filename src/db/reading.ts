import type { SQLiteDatabase } from 'expo-sqlite';

import type { ReaderToken } from '@/services/reader/segment';

export type ReadingDocument = { id: string; title: string; content: string; created_at: string;
  updated_at: string; last_token_index: number; coverage_percent: number; last_read_at: string | null };

export async function listReadingDocuments(db: SQLiteDatabase): Promise<ReadingDocument[]> {
  return db.getAllAsync<ReadingDocument>(`SELECT d.id,d.title,d.content,d.created_at,d.updated_at,
    COALESCE(p.last_token_index,0) AS last_token_index,
    COALESCE(p.coverage_percent,0) AS coverage_percent,p.last_read_at
    FROM reading_documents d LEFT JOIN reading_progress p ON p.document_id=d.id
    WHERE d.deleted_at IS NULL ORDER BY COALESCE(p.last_read_at,d.updated_at) DESC LIMIT 100`);
}

export async function saveReadingDocument(db: SQLiteDatabase, content: string, tokens: ReaderToken[],
  coveragePercent: number, title?: string): Promise<string> {
  const clean = content.trim();
  if (!clean || Array.from(clean).length > 2000) throw new Error('Bài đọc phải có tối đa 2000 ký tự.');
  const id = `reading-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const caption = title?.trim().slice(0, 80) || Array.from(clean).slice(0, 30).join('');
  const wordCounts = new Map<string, number>();
  for (const token of tokens) if (token.vocabulary) {
    const wordId = token.vocabulary.id;
    wordCounts.set(wordId, (wordCounts.get(wordId) ?? 0) + 1);
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync(`INSERT INTO reading_documents(id,title,content,created_at,updated_at)
      VALUES(?,?,?,?,?)`, id, caption, clean, now, now);
    await db.runAsync(`INSERT INTO reading_progress(document_id,last_token_index,coverage_percent,last_read_at)
      VALUES(?,0,?,?)`, id, Math.max(0, Math.min(100, coveragePercent)), now);
    for (const [wordId, occurrences] of wordCounts) await db.runAsync(`INSERT INTO reading_vocabulary
      (document_id,vocabulary_id,occurrences) VALUES(?,?,?)`, id, wordId, occurrences);
  });
  return id;
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
