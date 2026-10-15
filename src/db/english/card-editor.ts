import type { SQLiteDatabase } from "expo-sqlite";

import { englishLearnerTransaction, type EnglishCard } from "./learner";

export type EnglishCardEdit = Pick<
  EnglishCard,
  "headword" | "meaning_vi" | "pos" | "ipa" | "notes"
>;
export type EnglishEditDraft = EnglishCardEdit & { revision: number };
function cardId(value: string) {
  if (
    typeof value !== "string" ||
    !value.startsWith("en:") ||
    value.length > 200
  )
    throw new Error("ENGLISH_ID_REQUIRED");
}
function validate(value: EnglishEditDraft) {
  if (!Number.isSafeInteger(value.revision) || value.revision < 0)
    throw new Error("INVALID_ENGLISH_REVISION");
  for (const [field, max] of Object.entries({
    headword: 300,
    meaning_vi: 2000,
    pos: 200,
    ipa: 300,
    notes: 10000,
  })) {
    const text = value[field as keyof EnglishCardEdit];
    if (typeof text !== "string" || text.length > max)
      throw new Error("INVALID_ENGLISH_EDIT");
  }
}
export async function readEnglishCard(db: SQLiteDatabase, id: string) {
  cardId(id);
  const card = await db.getFirstAsync<EnglishCard>(
    "SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE c.id=? AND d.deleted=0",
    id,
  );
  if (!card) throw new Error("ENGLISH_CARD_UNAVAILABLE");
  return card;
}
export async function readEnglishEditDraft(db: SQLiteDatabase, id: string) {
  cardId(id);
  const row = await db.getFirstAsync<{ payload_json: string }>(
    "SELECT payload_json FROM en_drafts WHERE id=?",
    `edit:${id}`,
  );
  if (!row) return null;
  const value = JSON.parse(row.payload_json) as EnglishEditDraft;
  validate(value);
  return value;
}
export async function saveEnglishEditDraft(
  db: SQLiteDatabase,
  id: string,
  value: EnglishEditDraft,
) {
  cardId(id);
  validate(value); // Empty in-progress fields are allowed; committed fields are not.
  await englishLearnerTransaction(db, async () => {
    await readEnglishCard(db, id);
    await db.runAsync(
      "INSERT INTO en_drafts VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json",
      `edit:${id}`,
      JSON.stringify(value),
    );
  });
}
/** User-confirmed discard only; never changes the committed card or SRS. */
export async function discardEnglishEditDraft(db: SQLiteDatabase, id: string) {
  cardId(id);
  await englishLearnerTransaction(db, async () => {
    await db.runAsync("DELETE FROM en_drafts WHERE id=?", `edit:${id}`);
  });
}
/** Preserve identity, provenance, SRS and history. Revision invalidates captured review prompts. */
export async function updateEnglishCard(
  db: SQLiteDatabase,
  id: string,
  value: EnglishEditDraft,
) {
  cardId(id);
  validate(value);
  if (!value.headword.trim() || !value.meaning_vi.trim())
    throw new Error("INVALID_ENGLISH_EDIT");
  await englishLearnerTransaction(db, async () => {
    const card = await readEnglishCard(db, id);
    if (card.revision !== value.revision) throw new Error("ENGLISH_EDIT_STALE");
    const userOwnedCopy = card.source_id === "USER" || card.source_id === "SHARED";
    if (
      !userOwnedCopy &&
      ["headword", "meaning_vi", "pos", "ipa"].some(
        (key) =>
          card[key as keyof EnglishCardEdit] !==
          value[key as keyof EnglishCardEdit],
      )
    )
      throw new Error("ENGLISH_SOURCE_CONTENT_READ_ONLY");
    const result = await db.runAsync(
      "UPDATE en_cards SET headword=?,meaning_vi=?,pos=?,ipa=?,notes=?,revision=revision+1 WHERE id=? AND revision=?",
      userOwnedCopy ? value.headword.trim() : card.headword,
      userOwnedCopy ? value.meaning_vi.trim() : card.meaning_vi,
      userOwnedCopy ? value.pos.trim() : card.pos,
      userOwnedCopy ? value.ipa.trim() : card.ipa,
      value.notes,
      id,
      value.revision,
    );
    if (result.changes !== 1) throw new Error("ENGLISH_EDIT_STALE");
    await db.runAsync("DELETE FROM en_drafts WHERE id=?", `edit:${id}`);
  });
}

/** Keyset pagination avoids silently hiding cards after the first 100. */
export async function englishCardPage(
  db: SQLiteDatabase,
  deck: string,
  after: string | null = null,
  size = 25,
  search = "",
  filter: "all" | "NEW" | "LEARNING" | "SUSPENDED" = "all",
) {
  cardId(deck);
  if (after !== null) cardId(after);
  if (!Number.isSafeInteger(size) || size < 1 || size > 100)
    throw new Error("INVALID_ENGLISH_PAGE_SIZE");
  if (typeof search !== "string" || search.length > 200)
    throw new Error("INVALID_ENGLISH_SEARCH");
  const rows = await db.getAllAsync<EnglishCard>(
    `SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id
     WHERE c.deck_id=? AND d.deleted=0 AND c.id>?
       AND (?='' OR INSTR(lower(c.headword),lower(?))>0 OR INSTR(lower(c.meaning_vi),lower(?))>0)
       AND (?='all' OR ?='SUSPENDED' OR c.status=?)
       AND (?='SUSPENDED' OR c.suspended=0)
       AND (?<>'SUSPENDED' OR c.suspended=1)
     ORDER BY c.id LIMIT ?`,
    deck,
    after ?? "",
    search.trim(),
    search.trim(),
    search.trim(),
    filter,
    filter,
    filter,
    filter,
    filter,
    size + 1,
  );
  const cards = rows.slice(0, size);
  return {
    cards,
    next: rows.length > size ? (cards[cards.length - 1]?.id ?? null) : null,
  };
}
