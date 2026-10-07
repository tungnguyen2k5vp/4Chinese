import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { CONTENT_VERSION, bundledContentManifest, installBundledContentMetadata, listContentMetadata } from './content-version';

import { expoAdapter } from '@/db/fixtures/legacy_database';
import { migrateDatabaseSchema } from '@/db/migrations';

describe('content version metadata', () => {
  it('records every bundled category once without rewriting its installation timestamp', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await installBundledContentMetadata(db, '2026-09-28T00:00:00.000Z');
      await installBundledContentMetadata(db, '2026-09-29T00:00:00.000Z');
      const metadata = await listContentMetadata(db);
      expect(CONTENT_VERSION).toBe(1);
      expect(metadata).toHaveLength(bundledContentManifest.length);
      expect(metadata.find((item) => item.contentType === 'VOCABULARY')).toMatchObject({
        version: 1,
        status: 'INSTALLED',
        installedAt: '2026-09-28T00:00:00.000Z',
      });
      expect(metadata.find((item) => item.contentType === 'AUDIO')).toMatchObject({ status: 'PENDING', version: 0 });
    } finally {
      sqlite.close();
    }
  });
});
