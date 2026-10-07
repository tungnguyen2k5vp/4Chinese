import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

const contentTypes = ['GRAMMAR', 'SENTENCES', 'STORIES', 'CURRICULUM', 'COLLOCATIONS', 'RADICALS'] as const;
export type RemoteContentType = typeof contentTypes[number];

const packSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{2,80}$/u),
  type: z.enum(contentTypes),
  version: z.int().nonnegative(),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
  size: z.int().nonnegative().max(20 * 1024 * 1024),
  min_app_version: z.string().regex(/^\d+\.\d+\.\d+$/u).optional(),
  url: z.url().refine((value) => value.startsWith('https://'), 'HTTPS_REQUIRED'),
});

const manifestSchema = z.object({ version: z.int().nonnegative(), packs: z.array(packSchema).max(100) })
  .superRefine((manifest, ctx) => {
    const ids = new Set<string>();
    for (const [index, pack] of manifest.packs.entries()) {
      if (ids.has(pack.id)) ctx.addIssue({ code: 'custom', path: ['packs', index, 'id'], message: 'DUPLICATE_PACK_ID' });
      ids.add(pack.id);
    }
  });

export type RemoteContentPack = z.infer<typeof packSchema>;
export type RemoteContentManifest = z.infer<typeof manifestSchema>;

export function parseRemoteContentManifest(input: unknown): RemoteContentManifest {
  return manifestSchema.parse(input);
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string) => value.split('.').map(Number);
  const [la, lb, lc] = parse(left);
  const [ra, rb, rc] = parse(right);
  return (la! - ra!) || (lb! - rb!) || (lc! - rc!);
}

export type ContentChecksumVerifier = (bytes: Uint8Array) => Promise<string>;
export type ContentPackApplier = {
  readonly type: RemoteContentType;
  validate(payload: unknown): void;
  apply(db: SQLiteDatabase, payload: unknown): Promise<void>;
};

function decodeJson(bytes: Uint8Array): unknown {
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('INVALID_CONTENT_JSON'); }
}

/**
 * Applies only an already downloaded pack. Downloading and hashing are
 * intentionally separate boundaries: a bad payload never enters SQLite.
 */
export async function applyVerifiedContentPack(
  db: SQLiteDatabase,
  pack: RemoteContentPack,
  bytes: Uint8Array,
  installedAppVersion: string,
  verifyChecksum: ContentChecksumVerifier,
  applier: ContentPackApplier,
  now = new Date().toISOString(),
): Promise<void> {
  if (applier.type !== pack.type) throw new Error('CONTENT_PACK_TYPE_MISMATCH');
  if (pack.min_app_version && compareVersions(installedAppVersion, pack.min_app_version) < 0) {
    throw new Error('CONTENT_PACK_REQUIRES_NEWER_APP');
  }
  if (bytes.byteLength !== pack.size) throw new Error('CONTENT_PACK_SIZE_MISMATCH');
  if (`sha256:${await verifyChecksum(bytes)}` !== pack.checksum) throw new Error('CONTENT_PACK_CHECKSUM_MISMATCH');
  const payload = decodeJson(bytes);
  applier.validate(payload);

  await db.withTransactionAsync(async () => {
    // Appliers may UPSERT or DEPRECATE content only. User-progress tables are
    // deliberately not part of this content-write boundary.
    await applier.apply(db, payload);
    await db.runAsync(`INSERT INTO content_packs(id,content_type,version,checksum,source_url,size_bytes,min_app_version,
      status,installed_at,updated_at,last_error) VALUES(?,?,?,?,?,?,?,'INSTALLED',?,?,NULL)
      ON CONFLICT(id) DO UPDATE SET content_type=excluded.content_type,version=excluded.version,
      checksum=excluded.checksum,source_url=excluded.source_url,size_bytes=excluded.size_bytes,
      min_app_version=excluded.min_app_version,status='INSTALLED',installed_at=excluded.installed_at,
      updated_at=excluded.updated_at,last_error=NULL`,
    pack.id, pack.type, pack.version, pack.checksum, pack.url, pack.size, pack.min_app_version ?? null, now, now);
  });
}

export async function recordContentPackFailure(
  db: SQLiteDatabase,
  pack: Pick<RemoteContentPack, 'id' | 'type' | 'version' | 'checksum' | 'url' | 'size' | 'min_app_version'>,
  code: string,
  now = new Date().toISOString(),
): Promise<void> {
  await db.runAsync(`INSERT INTO content_packs(id,content_type,version,checksum,source_url,size_bytes,min_app_version,
    status,installed_at,updated_at,last_error) VALUES(?,?,?,?,?,?,?,'FAILED',NULL,?,?)
    ON CONFLICT(id) DO UPDATE SET status='FAILED',updated_at=excluded.updated_at,last_error=excluded.last_error`,
  pack.id, pack.type, pack.version, pack.checksum, pack.url, pack.size, pack.min_app_version ?? null, now, code.slice(0, 160));
}
