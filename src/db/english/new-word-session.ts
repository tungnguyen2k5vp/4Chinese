import type { SQLiteDatabase } from "expo-sqlite";

import { englishLearnerTransaction, type EnglishCard } from "./learner";

export const ENGLISH_NEW_SESSION_LIMIT = 20;

export function englishLearningIds(value: string | undefined, limit = ENGLISH_NEW_SESSION_LIMIT): string[] {
  if (!value) return [];
  if (value.length > limit * 220) throw new Error("Danh sách từ đã chọn không hợp lệ. Hãy chọn lại.");
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.length > limit || parsed.some(id => typeof id !== "string" || !id.startsWith("en:") || id.length > 200)) {
    throw new Error("Danh sách từ đã chọn không hợp lệ. Hãy chọn lại.");
  }
  return [...new Set(parsed as string[])];
}

/** Read only the learner's explicit selection; never substitute a due queue. */
export async function selectedEnglishNewCards(db: SQLiteDatabase, ids: string[], deckId?: string): Promise<EnglishCard[]> {
  const selected = englishLearningIds(JSON.stringify(ids), 100);
  if (!selected.length) throw new Error("Hãy chọn ít nhất một từ để học.");
  const rows = await db.getAllAsync<EnglishCard>(
    `SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id
     WHERE c.id IN (${selected.map(() => "?").join(",")}) AND c.status='NEW'
       AND c.suspended=0 AND d.deleted=0 AND (? IS NULL OR c.deck_id=?)`,
    ...selected, deckId ?? null, deckId ?? null,
  );
  if (rows.length !== selected.length) throw new Error("Một số từ đã được học, bỏ qua hoặc chuyển bộ. Hãy quay lại chọn từ.");
  const byId = new Map(rows.map(card => [card.id, card]));
  return selected.map(id => byId.get(id)!);
}

/** Start SRS only after both ungraded typing rounds. The normal review can run immediately. */
export async function beginEnglishNewWordReview(db: SQLiteDatabase, ids: string[], deckId?: string, now = new Date()): Promise<EnglishCard[]> {
  const selected = englishLearningIds(JSON.stringify(ids));
  return englishLearnerTransaction(db, async () => {
    const cards = await selectedEnglishNewCards(db, selected, deckId);
    const ready: EnglishCard[] = [];
    for (const card of cards) {
      const progress = { ...JSON.parse(card.progress_json), memoryLevel: 1, deepMemoryStage: 0, isKnown: false };
      const result = await db.runAsync(
        "UPDATE en_cards SET status='LEARNING',progress_json=?,next_review_at=?,revision=revision+1 WHERE id=? AND revision=? AND status='NEW'",
        JSON.stringify(progress), now.toISOString(), card.id, card.revision,
      );
      if (result.changes !== 1) throw new Error("Từ vừa được cập nhật. Hãy quay lại chọn từ.");
      ready.push({ ...card, status: "LEARNING", progress_json: JSON.stringify(progress), next_review_at: now.toISOString(), revision: card.revision + 1 });
    }
    return ready;
  });
}
