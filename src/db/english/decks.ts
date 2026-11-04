import type { SQLiteDatabase } from "expo-sqlite";

import { englishLearnerTransaction } from "./learner";

function deckId(id: string) {
  if (!id.startsWith("en:") || id.length > 200)
    throw new Error("ENGLISH_ID_REQUIRED");
}
export async function renameEnglishDeck(
  db: SQLiteDatabase,
  id: string,
  name: string,
) {
  deckId(id);
  if (!name.trim() || name.length > 200)
    throw new Error("INVALID_ENGLISH_DECK_NAME");
  await englishLearnerTransaction(db, async () => {
    const result = await db.runAsync(
      "UPDATE en_decks SET name=? WHERE id=? AND deleted=0",
      name.trim(),
      id,
    );
    if (!result.changes) throw new Error("ENGLISH_DECK_UNAVAILABLE");
  });
}
/** Recoverable trash only; cards, notes, review history and schedules are retained. */
export async function setEnglishDeckTrashed(
  db: SQLiteDatabase,
  id: string,
  trashed: boolean,
) {
  deckId(id);
  await englishLearnerTransaction(db, async () => {
    const result = await db.runAsync(
      "UPDATE en_decks SET deleted=? WHERE id=?",
      trashed ? 1 : 0,
      id,
    );
    if (!result.changes) throw new Error("ENGLISH_DECK_UNAVAILABLE");
  });
}
export async function listTrashedEnglishDecks(db: SQLiteDatabase) {
  return db.getAllAsync<{ id: string; name: string }>(
    "SELECT id,name FROM en_decks WHERE deleted=1 ORDER BY name,id LIMIT 100",
  );
}
export async function setEnglishCardSuspended(
  db: SQLiteDatabase,
  id: string,
  suspended: boolean,
) {
  deckId(id);
  await englishLearnerTransaction(db, async () => {
    const result = await db.runAsync(
      `UPDATE en_cards SET suspended=?,revision=revision+1
      WHERE id=? AND suspended<>? AND deck_id IN (SELECT id FROM en_decks WHERE deleted=0)`,
      suspended ? 1 : 0,
      id,
      suspended ? 1 : 0,
    );
    if (!result.changes) {
      const existing = await db.getFirstAsync(
        "SELECT c.id FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE c.id=? AND d.deleted=0",
        id,
      );
      if (!existing) throw new Error("ENGLISH_CARD_UNAVAILABLE");
    }
  });
}
