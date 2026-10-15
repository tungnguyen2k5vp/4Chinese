import {
  backupDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";

import { initializeDatabase } from "./database";

import { HSK30_VERSION } from "@/services/hsk/hsk30-source";

/** File-backed snapshot without creating/closing another native Expo database handle. */
export async function snapshotHskDatabaseFile(
  db: SQLiteDatabase,
  name: string,
) {
  if (!/^hanzi30-pre-hsk30-[a-zA-Z0-9.-]+\.db$/.test(name))
    throw new Error("INVALID_HSK_BACKUP_NAME");
  const sourcePath = db.databasePath.replace(/^file:\/\//, "");
  const slash = sourcePath.lastIndexOf("/");
  if (slash < 0) throw new Error("INVALID_HSK_DATABASE_PATH");
  const path = sourcePath.slice(0, slash + 1) + name;
  // VACUUM INTO leaves the source untouched and refuses a nonempty destination.
  await db.runAsync("VACUUM INTO ?", path);
  await db.runAsync("ATTACH DATABASE ? AS hsk_upgrade_backup", path);
  try {
    const integrity = await db.getFirstAsync<{ quick_check: string }>(
      "PRAGMA hsk_upgrade_backup.quick_check",
    );
    if (integrity?.quick_check !== "ok")
      throw new Error("HSK_BACKUP_INTEGRITY_FAILED");
  } finally {
    await db.execAsync("DETACH DATABASE hsk_upgrade_backup");
  }
}

/** Runs before schema/content startup; backup failure prevents the import. */
export async function initializeWithHsk30Backup(
  db: SQLiteDatabase,
): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let backupName: string | null = null;
  if (row && row.user_version > 0 && row.user_version < 45) {
    const name =
      "hanzi30-pre-hsk30-" +
      new Date().toISOString().replace(/[:.]/gu, "-") +
      "-" +
      Math.random().toString(36).slice(2) +
      ".db";
    if (
      db.databasePath?.startsWith("/") ||
      db.databasePath?.startsWith("file:")
    ) {
      await snapshotHskDatabaseFile(db, name);
      backupName = name;
    } else {
      const destination = await openDatabaseAsync(name);
      try {
        const existing = await destination.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM sqlite_master",
        );
        if (existing?.count)
          throw new Error("HSK_BACKUP_DESTINATION_NOT_EMPTY");
        await backupDatabaseAsync({
          sourceDatabase: db,
          sourceDatabaseName: "main",
          destDatabase: destination,
          destDatabaseName: "main",
        });
        const integrity = await destination.getFirstAsync<{
          quick_check: string;
        }>("PRAGMA quick_check");
        if (integrity?.quick_check !== "ok")
          throw new Error("HSK_BACKUP_INTEGRITY_FAILED");
        backupName = name;
      } finally {
        await destination.closeAsync();
      }
    }
  }
  await initializeDatabase(db);
  if (backupName)
    await db.runAsync(
      "UPDATE hsk_syllabus_imports SET backup_name=? WHERE version_id=?",
      backupName,
      HSK30_VERSION,
    );
}
