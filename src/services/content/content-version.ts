import type { SQLiteDatabase } from 'expo-sqlite';

export const CONTENT_VERSION = 1;

export type ContentType = 'VOCABULARY' | 'GRAMMAR' | 'SENTENCE' | 'COURSE' | 'STORY' | 'AUDIO' | 'RADICAL';
export type ContentStatus = 'INSTALLED' | 'PARTIAL' | 'PENDING' | 'FAILED';

export type ContentManifestEntry = {
  contentType: ContentType;
  version: number;
  checksum: string | null;
  source: string;
  status: ContentStatus;
};

export type ContentMetadata = ContentManifestEntry & { installedAt: string };

/**
 * This is a manifest, not a claim that every content category is complete.
 * PARTIAL and PENDING make incomplete bundled learning content explicit to UI,
 * migrations and future download packs.
 */
export const bundledContentManifest: readonly ContentManifestEntry[] = [
  { contentType: 'VOCABULARY', version: 1, checksum: 'bundle:hsk-11330', source: 'bundled:hsk-vocabulary.json', status: 'INSTALLED' },
  { contentType: 'GRAMMAR', version: 2, checksum: 'seed:grammar-v2-40', source: 'bundled:grammar-seed+vietnamese-contrasts', status: 'PARTIAL' },
  { contentType: 'SENTENCE', version: 2, checksum: 'seed:sentences-v2-contrasts', source: 'bundled:shared-sentence-seed+vietnamese-contrasts', status: 'PARTIAL' },
  { contentType: 'COURSE', version: 1, checksum: 'seed:learning-path-v1', source: 'bundled:learning-path-seed', status: 'PARTIAL' },
  { contentType: 'STORY', version: 1, checksum: 'seed:stories-v1', source: 'bundled:story-seed', status: 'PARTIAL' },
  { contentType: 'AUDIO', version: 0, checksum: null, source: 'device:tts', status: 'PENDING' },
  { contentType: 'RADICAL', version: 1, checksum: 'bundle:radicals-and-strokes-v1', source: 'bundled:radicals-and-strokes', status: 'INSTALLED' },
];

export async function installBundledContentMetadata(db: SQLiteDatabase, now = new Date().toISOString()): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const entry of bundledContentManifest) {
      await db.runAsync(`INSERT INTO content_metadata
        (content_type,version,installed_at,checksum,source,status)
        VALUES(?,?,?,?,?,?)
        ON CONFLICT(content_type) DO UPDATE SET
          version=excluded.version,
          checksum=excluded.checksum,
          source=excluded.source,
          status=excluded.status,
          installed_at=CASE
            WHEN content_metadata.version<>excluded.version
              OR content_metadata.checksum IS NOT excluded.checksum
              OR content_metadata.source<>excluded.source
              OR content_metadata.status<>excluded.status
            THEN excluded.installed_at
            ELSE content_metadata.installed_at
          END`, entry.contentType, entry.version, now, entry.checksum, entry.source, entry.status);
    }
  });
}

export async function listContentMetadata(db: SQLiteDatabase): Promise<ContentMetadata[]> {
  const rows = await db.getAllAsync<{
    content_type: ContentType;
    version: number;
    installed_at: string;
    checksum: string | null;
    source: string;
    status: ContentStatus;
  }>('SELECT content_type,version,installed_at,checksum,source,status FROM content_metadata ORDER BY content_type');
  return rows.map((row) => ({
    contentType: row.content_type,
    version: row.version,
    installedAt: row.installed_at,
    checksum: row.checksum,
    source: row.source,
    status: row.status,
  }));
}
