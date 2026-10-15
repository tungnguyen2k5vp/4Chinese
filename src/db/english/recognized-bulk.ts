import type { SQLiteDatabase } from "expo-sqlite";

import { englishLearnerTransaction } from "./learner";
import type { PersonalBulkLine, SkypediaMeaning } from "./skypedia";

export interface EnglishBulkPreview extends PersonalBulkLine {
  meanings: SkypediaMeaning[];
  selected: SkypediaMeaning | null;
  excluded: boolean;
}
export interface EnglishBulkForm {
  text: string;
  deck: string;
  name: string;
  items: EnglishBulkPreview[] | null;
}
export function bulkPreviewIssues(
  items: EnglishBulkPreview[],
): Map<number, string> {
  const seen = new Set<string>();
  const errors = new Map<number, string>();
  for (const item of items) {
    if (item.excluded) continue;
    const key = JSON.stringify([
      item.headword.normalize("NFC").toLowerCase(),
      item.meaning.trim().normalize("NFC").toLocaleLowerCase("vi"),
    ]);
    const issue =
      item.issue ||
      (!item.meaning.trim()
        ? item.meanings.length > 1
          ? "Cần chọn một nghĩa trước khi thêm."
          : "Chưa có nghĩa. Nhập nghĩa của bạn hoặc bỏ từ này."
        : item.meaning.length > 2000
          ? "Nghĩa dài quá 2.000 ký tự."
          : seen.has(key)
            ? "Trùng từ và nghĩa trong danh sách. Hãy bỏ mục lặp."
            : "");
    if (issue) errors.set(item.line, issue);
    seen.add(key);
  }
  return errors;
}

export interface EnglishBulkSavePlan {
  eligible: EnglishBulkPreview[];
  remaining: EnglishBulkPreview[];
  excludedCount: number;
  issues: Map<number, string>;
}

/** Counts only rows that can be committed now; unresolved rows stay in the draft. */
export function buildEnglishBulkSavePlan(
  items: EnglishBulkPreview[],
): EnglishBulkSavePlan {
  const issues = bulkPreviewIssues(items);
  const eligible: EnglishBulkPreview[] = [];
  const remaining: EnglishBulkPreview[] = [];
  let excludedCount = 0;
  for (const item of items) {
    if (item.excluded) {
      excludedCount += 1;
    } else if (issues.has(item.line)) {
      remaining.push(item);
    } else {
      eligible.push(item);
    }
  }
  return { eligible, remaining, excludedCount, issues };
}

export async function saveEnglishBulkForm(
  db: SQLiteDatabase,
  form: EnglishBulkForm,
) {
  if (
    form.text.length > 230000 ||
    form.name.length > 200 ||
    (form.items?.length ?? 0) > 100
  )
    throw new Error("INVALID_ENGLISH_BULK_DRAFT");
  await englishLearnerTransaction(db, async () => {
    await db.runAsync(
      "INSERT INTO en_drafts VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json",
      "bulk-cards",
      JSON.stringify(form),
    );
  });
}
export async function readEnglishBulkForm(
  db: SQLiteDatabase,
): Promise<EnglishBulkForm> {
  const row = await db.getFirstAsync<{ payload_json: string }>(
    "SELECT payload_json FROM en_drafts WHERE id=?",
    "bulk-cards",
  );
  if (!row) return { text: "", deck: "new", name: "", items: null };
  const value = JSON.parse(row.payload_json);
  if (typeof value.text !== "string" || value.text.length > 230000)
    throw new Error("INVALID_ENGLISH_BULK_DRAFT");
  if (
    value.items !== undefined &&
    value.items !== null &&
    (!Array.isArray(value.items) ||
      value.items.length > 100 ||
      value.items.some(
        (item: EnglishBulkPreview) =>
          !item ||
          typeof item.headword !== "string" ||
          typeof item.meaning !== "string" ||
          typeof item.issue !== "string" ||
          !Array.isArray(item.meanings) ||
          typeof item.excluded !== "boolean",
      ))
  )
    throw new Error("INVALID_ENGLISH_BULK_DRAFT");
  return {
    text: value.text,
    deck: typeof value.deck === "string" ? value.deck : "new",
    name: typeof value.name === "string" ? value.name.slice(0, 200) : "",
    items: value.items ?? null,
  };
}
