import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { applyVerifiedContentPack, parseRemoteContentManifest, recordContentPackFailure } from './content-delivery';

import { expoAdapter } from '@/db/fixtures/legacy_database';
import { migrateDatabaseSchema } from '@/db/migrations';

const bytes = new TextEncoder().encode('{"items":[{"id":"grammar_hsk1_001"}]}');
const checksum = 'a'.repeat(64);
const pack = { id: 'grammar-hsk1-core', type: 'GRAMMAR' as const, version: 2, checksum: `sha256:${checksum}`,
  size: bytes.byteLength, url: 'https://content.example.test/grammar-hsk1-core.json', min_app_version: '0.1.17' };

describe('safe content delivery', () => {
  it('validates manifest IDs and applies verified content plus metadata in one transaction', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      expect(parseRemoteContentManifest({ version: 1, packs: [pack] }).packs).toHaveLength(1);
      await applyVerifiedContentPack(db, pack, bytes, '0.1.17', async () => checksum, {
        type: 'GRAMMAR',
        validate: (payload) => { if (!payload || typeof payload !== 'object') throw new Error('INVALID_GRAMMAR_PACK'); },
        apply: async (database) => { await database.runAsync(`INSERT INTO grammar_points
          (id,title,pattern,explanation_vi,hsk_level,difficulty,created_at) VALUES(?,?,?,?,?,?,?)`,
        'grammar_hsk1_001', 'Mẫu câu', 'A + B', 'Nội dung đã kiểm duyệt', '1', 1, '2026-09-29'); },
      }, '2026-09-29T00:00:00.000Z');
      expect(sqlite.prepare("SELECT status,version FROM content_packs WHERE id='grammar-hsk1-core'").get())
        .toEqual({ status: 'INSTALLED', version: 2 });
      expect(sqlite.prepare("SELECT COUNT(*) AS count FROM grammar_points WHERE id='grammar_hsk1_001'").get())
        .toEqual({ count: 1 });
    } finally { sqlite.close(); }
  });

  it('rejects a bad checksum before an applier can mutate SQLite', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await expect(applyVerifiedContentPack(db, pack, bytes, '0.1.17', async () => 'b'.repeat(64), {
        type: 'GRAMMAR', validate: () => undefined,
        apply: async () => { throw new Error('APPLIER_MUST_NOT_RUN'); },
      })).rejects.toThrow('CONTENT_PACK_CHECKSUM_MISMATCH');
      await recordContentPackFailure(db, pack, 'CONTENT_PACK_CHECKSUM_MISMATCH');
      expect(sqlite.prepare("SELECT status FROM content_packs WHERE id='grammar-hsk1-core'").get()).toEqual({ status: 'FAILED' });
    } finally { sqlite.close(); }
  });
});
