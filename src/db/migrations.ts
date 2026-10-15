import type { SQLiteDatabase } from 'expo-sqlite';

import { migrationV35Sql } from './confusable-words';
import { migrationV33Sql } from './exam-schema';
import { migrationV32Sql } from './hsk-standard-schema';
import { migrationV45Sql } from './hsk30-schema';
import { roleplaySchemaSQL } from './roleplay-history';
import {
  DATABASE_VERSION,
  latestIndexSql,
  migrationSql,
  migrationV2Sql,
  migrationV3Sql,
  migrationV4Sql,
  migrationV5Sql,
  migrationV10Sql,
  migrationV11Sql,
  migrationV12Sql,
  migrationV13Sql,
  migrationV14Sql,
  migrationV15Sql,
  migrationV16Sql,
  migrationV17Sql,
  migrationV18Sql,
  migrationV19Sql,
  migrationV20Sql,
  migrationV21Sql,
  migrationV22Sql,
  migrationV23Sql,
  migrationV24Sql,
  migrationV25ColumnsSql,
  migrationV25TablesSql,
  migrationV26Sql,
  migrationV27Sql,
  migrationV28Sql,
  migrationV29Sql,
} from './schema';
import { migrationV37Sql } from './speaking-attempt-schema';
import { migrationV36Sql } from './v5-content-schema';
import { migrationV41Sql } from './v5-context-schema';
import { migrationV42Sql } from './v5-sense-schema';
import { migrationV44Sql } from './v6-learning-schema';
import { migrationV34Sql } from './written-practice-schema';

// CREATE TABLE IF NOT EXISTS does not upgrade an existing table. In particular,
// indexes on newly added columns must never be run before the ALTER statements.
const tableSql = migrationSql.slice(
  migrationSql.indexOf('CREATE TABLE IF NOT EXISTS'),
  migrationSql.indexOf('CREATE INDEX IF NOT EXISTS'),
);

type SqlClient = Pick<SQLiteDatabase, 'execAsync' | 'getAllAsync' | 'getFirstAsync'>;

async function ensureColumns(db: SqlClient, sql: string): Promise<string[]> {
  const added: string[] = [];
  const declarations = [...sql.matchAll(/ALTER TABLE (\w+) ADD COLUMN (\w+)[^;]*;/g)];
  const byTable = new Map<string, Set<string>>();
  for (const declaration of declarations) {
    const [, table, column] = declaration;
    if (!table || !column) throw new Error('INVALID_MIGRATION_DECLARATION');
    let columns = byTable.get(table);
    if (!columns) {
      const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      if (info.length === 0) throw new Error(`MIGRATION_MISSING_TABLE:${table}`);
      columns = new Set(info.map((item) => item.name));
      byTable.set(table, columns);
    }
    if (columns.has(column)) continue;
    await db.execAsync(declaration[0]);
    columns.add(column);
    added.push(column);
  }
  return added;
}

async function assertDatabaseIntegrity(db: SqlClient): Promise<void> {
  const result = await db.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
  if (result?.quick_check !== 'ok') throw new Error('DATABASE_INTEGRITY_CHECK_FAILED');
}

const legacyProgressBackfill: Record<string, string> = {
  memory_level: `CASE
    WHEN state = 0 THEN 0
    WHEN state IN (1, 3) THEN CASE WHEN reps <= 1 THEN 1 ELSE 2 END
    WHEN stability < 3 THEN 3
    WHEN stability < 14 THEN 4
    WHEN stability < 45 THEN 5
    ELSE 6 END`,
  deep_memory_stage: 'CASE WHEN stability >= 180 THEN 4 WHEN stability >= 120 THEN 3 WHEN stability >= 60 THEN 2 WHEN stability >= 30 THEN 1 ELSE 0 END',
  learned_at: 'CASE WHEN state > 0 THEN COALESCE(last_review, created_at) ELSE NULL END',
  next_review_at: 'due',
  review_count: 'reps',
  correct_count: 'MAX(0, reps - lapses)',
  wrong_count: 'lapses',
  lapse_count: 'lapses',
};

async function backfillNewProgressColumns(db: SqlClient, added: string[]): Promise<void> {
  for (const column of added) {
    const expression = legacyProgressBackfill[column];
    if (expression) await db.execAsync(`UPDATE user_vocabulary_progress SET ${column} = ${expression};`);
  }
}

/**
 * Schema-only upgrade. The caller commits `user_version` after bundled-data
 * refresh succeeds; a failed refresh can then safely retry on next launch.
 */
export async function migrateDatabaseSchema(db: SQLiteDatabase): Promise<number> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;
  if (!Number.isInteger(currentVersion) || currentVersion < 0 || currentVersion > DATABASE_VERSION) {
    throw new Error(`UNSUPPORTED_DATABASE_VERSION:${currentVersion}`);
  }
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await assertDatabaseIntegrity(db);
  await db.withTransactionAsync(async () => {
    await db.execAsync(tableSql);
    const v2Added = await ensureColumns(db, migrationV2Sql);
    await backfillNewProgressColumns(db, v2Added);
    await ensureColumns(db, migrationV3Sql);
    const v4Added = await ensureColumns(db, migrationV4Sql);
    if (v4Added.includes('status')) await db.execAsync(`UPDATE user_vocabulary_progress SET status =
      CASE WHEN is_known = 1 THEN 'KNOWN'
      WHEN memory_level > 0 OR state IN (1, 2, 3) THEN 'LEARNING'
      ELSE 'NEW' END;`);
    if (v4Added.includes('studied')) await db.execAsync(`UPDATE user_vocabulary_progress SET studied =
      CASE WHEN is_known = 1 OR memory_level > 0 OR state IN (1, 2, 3) THEN 1 ELSE 0 END;`);
    await ensureColumns(db, migrationV5Sql);
    await ensureColumns(db, migrationV10Sql);
    await db.execAsync(migrationV11Sql);
    // The v12 backfill scans vocabulary; doing it on every launch slows startup.
    // New/edited images are maintained at their write sites after migration.
    if (currentVersion < 12) await db.execAsync(migrationV12Sql);
    await db.execAsync(migrationV13Sql);
    await db.execAsync(migrationV14Sql);
    await db.execAsync(migrationV15Sql);
    await db.execAsync(migrationV16Sql);
    await db.execAsync(migrationV17Sql);
    await db.execAsync(migrationV18Sql);
    await db.execAsync(migrationV19Sql);
    await db.execAsync(migrationV20Sql);
    await db.execAsync(migrationV21Sql);
    if (typeof document === 'undefined') await db.execAsync(migrationV22Sql);
    await ensureColumns(db, migrationV23Sql);
    await db.execAsync(migrationV24Sql);
    await ensureColumns(db, migrationV25ColumnsSql);
    await db.execAsync(migrationV25TablesSql);
    await db.execAsync(migrationV26Sql);
    await ensureColumns(db, migrationV27Sql);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_grammar_points_active ON grammar_points(is_active,hsk_level,difficulty);
      CREATE INDEX IF NOT EXISTS idx_sentences_active ON sentences(is_active,review_status,hsk_level,difficulty);
      CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(is_active,hsk_level,difficulty);`);
    await db.execAsync(migrationV28Sql);
    await db.execAsync(migrationV29Sql);
    await db.execAsync(migrationV32Sql);
    await db.execAsync(migrationV33Sql);
    await db.execAsync(migrationV34Sql);
    await db.execAsync(migrationV35Sql);
    await db.execAsync(migrationV36Sql);
    await db.execAsync(migrationV37Sql);
    await db.execAsync(roleplaySchemaSQL);
    await db.execAsync(migrationV41Sql);
    await ensureColumns(db, migrationV42Sql);
    await db.execAsync(migrationV44Sql);
    await db.execAsync(migrationV45Sql);
    await db.execAsync(latestIndexSql);
    await assertDatabaseIntegrity(db);
  });
  return currentVersion;
}
