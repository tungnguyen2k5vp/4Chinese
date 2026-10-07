
import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import {
  compareWordContextSources,
  deleteWordContext,
  listWordContexts,
  saveWordContext,
  validateWordContextRecord,
  wordContextId,
} from './word-contexts';

describe('V5.1 word contexts', () => {
  it('creates the additive table and round-trips an idempotent context', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const metadata = JSON.stringify({ documentId: 'reader-1', chunk: 2, offset: 18 });
      const id = wordContextId('hsk-1-ni', 'READER', 'reader-1', metadata);
      const input = {
        id, vocabulary_id: 'hsk-1-ni', source_type: 'READER' as const, source_id: 'reader-1',
        source_title: 'Một ngày ở trường', sentence_text: '我今天去学校。', pinyin: 'wǒ jīntiān qù xuéxiào',
        translation_vi: 'Hôm nay tôi đi học.', position_metadata: metadata,
      };
      await saveWordContext(db, input, '2026-10-02T08:00:00Z');
      await saveWordContext(db, { ...input, translation_vi: 'Hôm nay mình đi học.' }, '2026-10-02T09:00:00Z');
      const rows = await listWordContexts(db, 'hsk-1-ni');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id, translation_vi: 'Hôm nay mình đi học.', created_at: '2026-10-02T08:00:00Z' });
      await deleteWordContext(db, id);
      expect(await listWordContexts(db, 'hsk-1-ni')).toEqual([]);
    } finally {
      sqlite.close();
    }
  });

  it('rejects unsafe context payloads and keeps source priority deterministic', () => {
    expect(() => validateWordContextRecord({ id: 'x', source_type: 'UNKNOWN' })).toThrow('INVALID_WORD_CONTEXT');
    expect(compareWordContextSources('READER', 'LESSON')).toBeLessThan(0);
    expect(compareWordContextSources('AI', 'LISTENING')).toBeGreaterThan(0);
  });
});
