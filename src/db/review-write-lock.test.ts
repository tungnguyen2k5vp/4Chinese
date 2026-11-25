import { describe, expect, it, vi } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { reviewWord } from './repository';

describe('review write lock recovery', () => {
  it('allows the same word to retry after its progress read fails', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const read = vi.spyOn(db, 'getFirstAsync').mockRejectedValueOnce(new Error('SQLITE_BUSY'));
      const input = { correct: true, responseTimeMs: 1000 };
      await expect(reviewWord(db, 'custom-1', input)).rejects.toThrow('SQLITE_BUSY');
      read.mockRestore();

      expect(await reviewWord(db, 'custom-1', input)).not.toBeNull();
      expect(sqlite.prepare('SELECT COUNT(*) n FROM review_log').get()).toEqual({ n: 2 });
      // The successful retry moves the due date; repeating it cannot apply another transition.
      expect(await reviewWord(db, 'custom-1', input)).toBeNull();
      expect(sqlite.prepare('SELECT COUNT(*) n FROM review_log').get()).toEqual({ n: 2 });
    } finally { sqlite.close(); }
  });
});
