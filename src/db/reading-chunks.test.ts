import { describe, expect, it, vi } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { expoAdapter, createLegacyDatabase } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { deleteReadingDocument, getReadingDocumentChunk, getReadingDocumentContent, getReadingDocumentLayout,
  getReadingSentence, listReadingDocuments, saveReadingDocument, updateReadingCharacterPosition, updateReadingPosition } from './reading';

import { decodeReaderPosition, locateReaderTokens, readerTokenPage } from '@/services/reader/pages';

describe('chunked reader documents', () => {
  it('keeps a long document readable and round-trips every chunk through backup', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const content = Array.from({ length: 2_401 }, () => '你').join('');
      const id = await saveReadingDocument(db, content, [], 0, 'Bài dài');

      expect((await listReadingDocuments(db))[0]).toMatchObject({ id, content: content.slice(0, 2_000) });
      expect(await getReadingDocumentContent(db, id)).toBe(content);
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reading_document_chunks WHERE document_id=?').get(id))
        .toEqual({ count: 2 });

      const backup = await exportLocalBackup(db, 'test');
      expect(backup.data.readingDocumentChunks).toHaveLength(2);
      await importLocalBackup(db, backup);
      expect(await getReadingDocumentContent(db, id)).toBe(content);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('continues to read a pre-chunk legacy document', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await db.runAsync(`INSERT INTO reading_documents(id,title,content,created_at,updated_at)
        VALUES(?,?,?,?,?)`, 'legacy-reader', 'Bài cũ', '我学习中文。', '2026-01-01', '2026-01-01');
      expect(await getReadingDocumentContent(db, 'legacy-reader')).toBe('我学习中文。');
      expect(await getReadingDocumentLayout(db, 'legacy-reader')).toMatchObject({ chunk_count: 1, character_count: 6 });
      expect(await getReadingDocumentChunk(db, 'legacy-reader', 0)).toMatchObject({ content: '我学习中文。', char_start: 0, char_end: 6 });
      expect(await getReadingDocumentChunk(db, 'legacy-reader', 1)).toBeNull();
    } finally { sqlite.close(); }
  });

  it('round-trips all 100k characters and exact resume through backup without whole-novel opening', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const content = '你👋\n好'.repeat(25000);
      const id = await saveReadingDocument(db, content, [], 0, '100k');
      const wholeReads = vi.spyOn(db, 'getAllAsync');
      await updateReadingCharacterPosition(db, id, 67123);
      const layout = await getReadingDocumentLayout(db, id);
      const resume = decodeReaderPosition(layout!.last_token_index);
      expect(resume.characterOffset).toBe(67123);
      const chunk = await getReadingDocumentChunk(db, id, Math.floor(resume.characterOffset! / 2000));
      expect(chunk).toMatchObject({ chunk_index: 33, char_start: 66000, char_end: 68000 });
      const tokens = locateReaderTokens(chunk!.content, []);
      expect(readerTokenPage(tokens, 1123)).toBe(3);
      expect(layout).toMatchObject({ chunk_count: 50, character_count: 100000 });
      expect(wholeReads).not.toHaveBeenCalled(); wholeReads.mockRestore();
      const backup = await exportLocalBackup(db, 'test');
      expect(backup.data.readingDocumentChunks).toHaveLength(50);
      await importLocalBackup(db, backup);
      expect(await getReadingDocumentContent(db, id)).toBe(content);
      expect(decodeReaderPosition((await getReadingDocumentLayout(db, id))!.last_token_index).characterOffset).toBe(67123);
      const chunks = sqlite.prepare('SELECT chunk_index,char_start,char_end FROM reading_document_chunks WHERE document_id=? ORDER BY chunk_index').all(id);
      expect(chunks[49]).toEqual({ chunk_index: 49, char_start: 98000, char_end: 100000 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('keeps legacy token positions unmodified until an explicit V5 page/tap save', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const id = await saveReadingDocument(db, '你'.repeat(500), [], 25);
      await updateReadingPosition(db, id, 321);
      const layout = await getReadingDocumentLayout(db, id);
      expect(decodeReaderPosition(layout!.last_token_index)).toEqual({ characterOffset: null, legacyTokenIndex: 321 });
      await updateReadingCharacterPosition(db, id, 90000);
      expect(decodeReaderPosition((await getReadingDocumentLayout(db, id))!.last_token_index).characterOffset).toBe(499);
      await deleteReadingDocument(db, id);
      expect(await getReadingDocumentLayout(db, id)).toBeNull();
      expect(await getReadingDocumentChunk(db, id, 0)).toBeNull();
    } finally { sqlite.close(); }
  });

  it('rejects 100001 characters and rolls back an interrupted multi-chunk save', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await expect(saveReadingDocument(db, '你'.repeat(100001), [], 0)).rejects.toThrow('LENGTH');
      const controller = new AbortController();
      const run = db.runAsync.bind(db);
      vi.spyOn(db, 'runAsync').mockImplementation(async (...args) => {
        const result = await run(...args);
        if (String(args[0]).includes('INSERT INTO reading_document_chunks')) controller.abort();
        return result;
      });
      await expect(saveReadingDocument(db, '你'.repeat(100000), [], 0, 'Canceled', { signal: controller.signal }))
        .rejects.toThrow('CANCELED');
      expect(await listReadingDocuments(db)).toEqual([]);
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reading_document_chunks').get()).toEqual({ count: 0 });
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('recovers the exact current sentence across chunk boundaries on demand', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const id = await saveReadingDocument(db, '你'.repeat(1996) + '。我学习中文。下一句。', [], 0);
      const chunk = await getReadingDocumentChunk(db, id, 1);
      expect(await getReadingSentence(db, id, chunk!, 0)).toBe('我学习中文。');
      expect(await getReadingDocumentChunk(db, id, -1)).toBeNull();
      expect(await getReadingDocumentChunk(db, id, 0.5)).toBeNull();
    } finally { sqlite.close(); }
  });
});
