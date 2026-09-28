import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { deleteReadingDocument, listReadingDocuments, saveReadingDocument, updateReadingPosition } from './reading';

import type { Vocabulary } from '@/types/models';

describe('reader history', () => {
  it('stores document, token position and word links, then restores them from ZIP data', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const id = await saveReadingDocument(db, '你你', [{ text: '你', vocabulary: { id: 'hsk-1-ni' } as Vocabulary },
        { text: '你', vocabulary: { id: 'hsk-1-ni' } as Vocabulary }], 50, 'Bài thử');
      await updateReadingPosition(db, id, 1);
      expect((await listReadingDocuments(db))[0]).toMatchObject({ id, last_token_index: 1, coverage_percent: 50 });
      expect(sqlite.prepare('SELECT occurrences FROM reading_vocabulary WHERE document_id=?').get(id))
        .toEqual({ occurrences: 2 });
      const backup = await exportLocalBackup(db, 'test');
      await deleteReadingDocument(db, id);
      expect(await listReadingDocuments(db)).toHaveLength(0);
      await importLocalBackup(db, backup);
      expect((await listReadingDocuments(db))[0]?.id).toBe(id);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
});
