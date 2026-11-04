import type { SQLiteDatabase } from 'expo-sqlite';

export const nativePracticeSchemaSql = `
CREATE TABLE IF NOT EXISTS native_handwriting_practice (
  id TEXT PRIMARY KEY NOT NULL,
  target TEXT NOT NULL CHECK(length(target) BETWEEN 1 AND 4),
  candidate TEXT NOT NULL CHECK(length(candidate) BETWEEN 1 AND 16),
  stroke_count INTEGER NOT NULL CHECK(stroke_count BETWEEN 1 AND 64),
  completed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_handwriting_target ON native_handwriting_practice(target, completed_at DESC);
`;

export type NativePracticeResult = {
  id: string;
  target: string;
  candidate: string;
  strokeCount: number;
  completedAtMs: number;
};
export type NativePracticeHistory = {
  id: string;
  target: string;
  candidate: string;
  stroke_count: number;
  completed_at: string;
};

export function parseNativePracticeResult(value: unknown): NativePracticeResult {
  const item = value as Partial<NativePracticeResult> | null;
  if (!item || typeof item.id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.id)
    || typeof item.target !== 'string' || Array.from(item.target).length < 1 || Array.from(item.target).length > 4
    || typeof item.candidate !== 'string' || Array.from(item.candidate).length < 1 || Array.from(item.candidate).length > 16
    || /[\s\p{Cc}]/u.test(item.target + item.candidate)
    || !Number.isInteger(item.strokeCount) || item.strokeCount! < 1 || item.strokeCount! > 64
    || !Number.isSafeInteger(item.completedAtMs) || item.completedAtMs! <= 0 || !Number.isFinite(new Date(item.completedAtMs!).getTime())) {
    throw new Error('INVALID_NATIVE_PRACTICE_RESULT');
  }
  return item as NativePracticeResult;
}

export function validateNativePracticeBackupRecord(value: unknown): void {
  const row = value as Partial<NativePracticeHistory> | null;
  if (!row || typeof row.completed_at !== 'string') throw new Error('INVALID_NATIVE_PRACTICE_BACKUP');
  const parsed = parseNativePracticeResult({ id: row.id, target: row.target, candidate: row.candidate,
    strokeCount: row.stroke_count, completedAtMs: Date.parse(row.completed_at) });
  if (new Date(parsed.completedAtMs).toISOString() !== row.completed_at) throw new Error('INVALID_NATIVE_PRACTICE_BACKUP_TIME');
}

/** Suggestions are metadata only: no review, XP or SRS tables are written. */
export async function recordNativePractice(db: SQLiteDatabase, value: unknown): Promise<void> {
  const item = parseNativePracticeResult(value);
  const date = new Date(item.completedAtMs).toISOString();
  const result = await db.runAsync(`INSERT INTO native_handwriting_practice(id,target,candidate,stroke_count,completed_at)
    VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING`, item.id, item.target, item.candidate, item.strokeCount, date);
  if (result.changes === 0) {
    const previous = await db.getFirstAsync<NativePracticeHistory>('SELECT * FROM native_handwriting_practice WHERE id=?', item.id);
    if (!previous || previous.target !== item.target || previous.candidate !== item.candidate || previous.stroke_count !== item.strokeCount || previous.completed_at !== date) {
      throw new Error('NATIVE_PRACTICE_ID_CONFLICT');
    }
  }
}

export async function listNativePractice(db: SQLiteDatabase, target: string): Promise<NativePracticeHistory[]> {
  return db.getAllAsync<NativePracticeHistory>(`SELECT * FROM native_handwriting_practice WHERE target=?
    ORDER BY completed_at DESC,id DESC LIMIT 5`, target);
}
