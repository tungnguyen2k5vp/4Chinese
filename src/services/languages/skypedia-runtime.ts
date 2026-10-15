import {
  backupDatabaseAsync,
  deserializeDatabaseAsync,
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from "expo-sqlite";

import { SKYPEDIA_URL, skypediaDeserializeBytes } from "@/db/english/skypedia";

let pending: Promise<SQLiteDatabase> | undefined;
async function validate(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA trusted_schema=OFF");
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('words','definitions','word_definitions','pronunciations')",
  );
  if (tables.length !== 4)
    throw new Error("Tệp không đúng cấu trúc từ điển Anh–Việt.");
  const check = await db.getFirstAsync<{ quick_check: string }>(
    "PRAGMA quick_check",
  );
  if (check?.quick_check !== "ok")
    throw new Error("Tệp từ điển bị lỗi. Hãy tải lại.");
  const word = await db.getFirstAsync(
    "SELECT id FROM words WHERE word='hello' AND lang_code='en'",
  );
  if (!word) throw new Error("Tệp không đúng nguồn từ điển Anh–Việt.");
  await db.execAsync("PRAGMA query_only=ON");
}
/** Download directly from the pinned upstream once, then use the private offline cache.
 * The corpus is not embedded in APK/Web exports or marked approved for redistribution. */
export function getSkypediaDictionary(): Promise<SQLiteDatabase> {
  if (!pending)
    pending = (async () => {
      const cacheName = "english-skypedia-388adc0.db";
      let cached = await openDatabaseAsync(cacheName);
      const table = await cached.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='words'",
      );
      if (table) {
        try {
          await validate(cached);
          return cached;
        } catch {
          // Only the replaceable dictionary cache; never learner/Chinese data.
          await cached.closeAsync();
          await deleteDatabaseAsync(cacheName);
          cached = await openDatabaseAsync(cacheName);
        }
      }
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 120000);
      try {
        const response = await fetch(SKYPEDIA_URL, { signal: abort.signal });
        if (!response.ok)
          throw new Error(
            "Không tải được từ điển. Kiểm tra kết nối và thử lại.",
          );
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (
          bytes.length < 1000000 ||
          bytes.length > 80000000 ||
          String.fromCharCode(...bytes.slice(0, 15)) !== "SQLite format 3"
        )
          throw new Error("Dữ liệu tải về không phải từ điển SQLite hợp lệ.");
        const source = await deserializeDatabaseAsync(
          skypediaDeserializeBytes(bytes),
        );
        try {
          await validate(source);
          await backupDatabaseAsync({
            sourceDatabase: source,
            destDatabase: cached,
          });
        } finally {
          await source.closeAsync();
        }
        await validate(cached);
        return cached;
      } finally {
        clearTimeout(timer);
      }
    })().catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
