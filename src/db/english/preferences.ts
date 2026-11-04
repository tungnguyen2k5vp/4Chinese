import type { SQLiteDatabase } from "expo-sqlite";

import {
  defaultLanguagePreferences,
  validateLanguagePreferences,
  type LanguagePreferences,
  type LanguagePreferenceStore,
} from "@/services/languages/controller";

export const LANGUAGE_PREFERENCES_DATABASE = "learning-preferences.db";
/** Dedicated preferences database, never the legacy hanzi30.db handle. */
export async function initializeLanguagePreferences(
  db: SQLiteDatabase,
): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  if (row && row.user_version > 1)
    throw new Error("LANGUAGE_PREFERENCES_DOWNGRADE_REFUSED");
  const foreign = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'learning_preferences' LIMIT 1",
  );
  if (foreign) throw new Error("WRONG_LANGUAGE_PREFERENCES_DATABASE");
  await db.withTransactionAsync(async () => {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS learning_preferences (
      id INTEGER PRIMARY KEY CHECK(id=1),
      ui_locale TEXT NOT NULL CHECK(ui_locale='vi'),
      learning_language TEXT NOT NULL CHECK(learning_language IN ('zh','en')),
      english_variant TEXT NOT NULL CHECK(english_variant IN ('en-US','en-GB'))
    ); PRAGMA user_version=1;`);
  });
}

export function languagePreferenceStore(
  db: SQLiteDatabase,
): LanguagePreferenceStore {
  return {
    async read() {
      const row = await db.getFirstAsync<{
        uiLocale: string;
        learningLanguage: string;
        englishVariant: string;
      }>(
        "SELECT ui_locale AS uiLocale, learning_language AS learningLanguage, english_variant AS englishVariant FROM learning_preferences WHERE id=1",
      );
      return row
        ? validateLanguagePreferences(row)
        : { ...defaultLanguagePreferences };
    },
    async write(value: LanguagePreferences) {
      const checked = validateLanguagePreferences(value);
      await db.runAsync(
        `INSERT INTO learning_preferences(id,ui_locale,learning_language,english_variant)
        VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET ui_locale=excluded.ui_locale,
        learning_language=excluded.learning_language,english_variant=excluded.english_variant`,
        checked.uiLocale,
        checked.learningLanguage,
        checked.englishVariant,
      );
    },
  };
}
