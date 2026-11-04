import type { SQLiteDatabase } from "expo-sqlite";

import { englishLearnerTransaction } from "./learner";

export const ENGLISH_CUSTOM_BULK_MAX_TEXT = 230000;
export interface CustomBulkRow {
  line: number;
  headword: string;
  meaning: string;
}
export interface CustomBulkIssue {
  line: number;
  message: string;
}

/** Explicit pairs, never dictionary auto-selection. Same word with a different meaning is valid. */
export function parseEnglishCustomBulk(text: string): {
  rows: CustomBulkRow[];
  issues: CustomBulkIssue[];
} {
  const rows: CustomBulkRow[] = [];
  const issues: CustomBulkIssue[] = [];
  if (text.length > ENGLISH_CUSTOM_BULK_MAX_TEXT)
    return {
      rows,
      issues: [{ line: 0, message: "Nội dung vượt giới hạn nhập." }],
    };
  const seen = new Set<string>();
  let count = 0;
  for (const [index, raw] of text.split(/\r\n|\n|\r/).entries()) {
    if (!raw.trim()) continue;
    count++;
    if (count > 100) {
      issues.push({
        line: index + 1,
        message: "Chỉ được thêm tối đa 100 dòng mỗi lần.",
      });
      break;
    }
    const fields = raw.split("\t");
    const headword = fields[0]?.trim() ?? "";
    const meaning = fields[1]?.trim() ?? "";
    if (fields.length !== 2 || !headword || !meaning) {
      issues.push({
        line: index + 1,
        message:
          "Cần đúng hai cột: từ/cụm tiếng Anh, TAB, một nghĩa tiếng Việt.",
      });
      continue;
    }
    if (headword.length > 300 || meaning.length > 2000) {
      issues.push({
        line: index + 1,
        message: "Từ tối đa 300 ký tự, nghĩa tối đa 2.000 ký tự.",
      });
      continue;
    }
    const key = JSON.stringify([
      headword.normalize("NFC").toLocaleLowerCase("en"),
      meaning.normalize("NFC").toLocaleLowerCase("vi"),
    ]);
    if (seen.has(key)) {
      issues.push({
        line: index + 1,
        message:
          "Trùng cặp từ và nghĩa trong lần nhập này. Hãy bỏ dòng lặp hoặc sửa nghĩa.",
      });
      continue;
    }
    seen.add(key);
    rows.push({ line: index + 1, headword, meaning });
  }
  return { rows, issues };
}

export async function saveEnglishBulkDraft(db: SQLiteDatabase, text: string) {
  if (text.length > ENGLISH_CUSTOM_BULK_MAX_TEXT)
    throw new Error("ENGLISH_BULK_DRAFT_LIMIT");
  await englishLearnerTransaction(db, async () => {
    await db.runAsync(
      "INSERT INTO en_drafts VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json",
      "bulk-cards",
      JSON.stringify({ text }),
    );
  });
}
export async function readEnglishBulkDraft(
  db: SQLiteDatabase,
): Promise<string> {
  const row = await db.getFirstAsync<{ payload_json: string }>(
    "SELECT payload_json FROM en_drafts WHERE id=?",
    "bulk-cards",
  );
  if (!row) return "";
  const value = JSON.parse(row.payload_json);
  if (
    typeof value.text !== "string" ||
    value.text.length > ENGLISH_CUSTOM_BULK_MAX_TEXT
  )
    throw new Error("INVALID_ENGLISH_BULK_DRAFT");
  return value.text;
}
