import type { SQLiteDatabase } from 'expo-sqlite';

import { ROLEPLAY_SCENES, roleplayScene, roleplaySummary, RoleplayStateError, type RoleplaySession, type RoleplayTransport } from '../services/speaking/roleplay-v5';

/** Main integrates into migration 38/fresh schema. This repository never runs DDL. */
export const roleplaySchemaSQL = `
CREATE TABLE IF NOT EXISTS roleplay_history (
  id TEXT PRIMARY KEY NOT NULL, scene_id TEXT NOT NULL, level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 6),
  saved_at TEXT NOT NULL, attempts INTEGER NOT NULL CHECK(attempts BETWEEN 0 AND 12),
  completed_goals INTEGER NOT NULL CHECK(completed_goals >= 0), total_goals INTEGER NOT NULL CHECK(total_goals > 0),
  used_words_json TEXT NOT NULL, transcript_opt_in INTEGER NOT NULL CHECK(transcript_opt_in IN (0,1)),
  transcript_summary TEXT CHECK(length(transcript_summary) <= 600),
  CHECK(transcript_opt_in = 1 OR transcript_summary IS NULL)
);
CREATE INDEX IF NOT EXISTS roleplay_history_date ON roleplay_history(saved_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS roleplay_ai_limits (
  id INTEGER PRIMARY KEY CHECK(id=1), daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 1 AND 100),
  session_limit INTEGER NOT NULL CHECK(session_limit IN (4,8,12))
);
INSERT OR IGNORE INTO roleplay_ai_limits(id,daily_limit,session_limit) VALUES(1,20,8);
CREATE TABLE IF NOT EXISTS roleplay_ai_usage (
  day TEXT NOT NULL, session_id TEXT NOT NULL, attempts INTEGER NOT NULL CHECK(attempts BETWEEN 1 AND 100),
  PRIMARY KEY(day,session_id)
);
`;
export const ROLEPLAY_HISTORY_LIMIT = 100;
export type RoleplayHistoryRecord = {
  id: string; scene_id: string; level: number; saved_at: string; attempts: number;
  completed_goals: number; total_goals: number; used_words_json: string;
  transcript_opt_in: number; transcript_summary: string | null;
};
const columns = ['id', 'scene_id', 'level', 'saved_at', 'attempts', 'completed_goals', 'total_goals',
  'used_words_json', 'transcript_opt_in', 'transcript_summary'];
const validId = (id: string) => /^[a-zA-Z0-9_-]{1,160}$/.test(id);

/** Strict backup allowlist: never accepts conversations, audio URIs or inferred scores. */
export function validateRoleplayHistoryRecord(row: Record<string, unknown>): void {
  if (Object.keys(row).length !== columns.length || !columns.every((key) => Object.hasOwn(row, key)) ||
    typeof row.id !== 'string' || !validId(row.id) || typeof row.scene_id !== 'string' ||
    !ROLEPLAY_SCENES.some((scene) => scene.id === row.scene_id) ||
    !Number.isInteger(row.level) || Number(row.level) < 1 || Number(row.level) > 6 ||
    typeof row.saved_at !== 'string' || !Number.isFinite(Date.parse(row.saved_at)) || new Date(row.saved_at).toISOString() !== row.saved_at ||
    !Number.isInteger(row.attempts) || Number(row.attempts) < 0 || Number(row.attempts) > 12 ||
    !Number.isInteger(row.completed_goals) || Number(row.completed_goals) < 0 ||
    !Number.isInteger(row.total_goals) || Number(row.total_goals) < 1 || Number(row.completed_goals) > Number(row.total_goals) ||
    ![0, 1].includes(Number(row.transcript_opt_in)) || typeof row.transcript_opt_in !== 'number' ||
    (row.transcript_summary !== null && (typeof row.transcript_summary !== 'string' || row.transcript_summary.length > 600)) ||
    (row.transcript_opt_in === 0 && row.transcript_summary !== null) || typeof row.used_words_json !== 'string' || row.used_words_json.length > 1000) {
    throw new Error('INVALID_ROLEPLAY_HISTORY');
  }
  const scene = ROLEPLAY_SCENES.find((scene) => scene.id === row.scene_id)!;
  const words: unknown = JSON.parse(row.used_words_json as string);
  if (row.total_goals !== scene.goals.length || !Array.isArray(words) || new Set(words).size !== words.length ||
    words.some((word) => typeof word !== 'string' || !scene.targetWords.includes(word))) throw new Error('INVALID_ROLEPLAY_HISTORY');
}

/** Explicit save only. Optional summary is learner-authored; no transcript extraction/network. */
export function minimizeRoleplayHistory(id: string, state: RoleplaySession, optIn = false, summary = '', now = new Date()): RoleplayHistoryRecord {
  const result = roleplaySummary(state);
  const row = { id, scene_id: state.scene, level: state.level, saved_at: now.toISOString(), attempts: state.attemptsUsed,
    completed_goals: result.completedGoals, total_goals: result.totalGoals, used_words_json: JSON.stringify(result.usedWords),
    transcript_opt_in: optIn ? 1 : 0, transcript_summary: optIn ? summary.trim() || null : null };
  if (typeof optIn !== 'boolean' || state.pending) throw new Error('INVALID_ROLEPLAY_HISTORY');
  validateRoleplayHistoryRecord(row);
  return row;
}

export async function saveRoleplayHistory(db: SQLiteDatabase, row: RoleplayHistoryRecord): Promise<void> {
  validateRoleplayHistoryRecord(row);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`INSERT INTO roleplay_history (${columns.join(',')}) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      row.id, row.scene_id, row.level, row.saved_at, row.attempts, row.completed_goals, row.total_goals,
      row.used_words_json, row.transcript_opt_in, row.transcript_summary);
    await db.runAsync(`DELETE FROM roleplay_history WHERE id NOT IN
      (SELECT id FROM roleplay_history ORDER BY saved_at DESC,id DESC LIMIT ?)`, ROLEPLAY_HISTORY_LIMIT);
  });
}

export async function listRoleplayHistory(db: SQLiteDatabase): Promise<RoleplayHistoryRecord[]> {
  const rows = await db.getAllAsync<RoleplayHistoryRecord>(`SELECT ${columns.join(',')} FROM roleplay_history ORDER BY saved_at DESC,id DESC LIMIT 100`);
  rows.forEach(validateRoleplayHistoryRecord);
  return rows;
}
export async function deleteRoleplayHistory(db: SQLiteDatabase, id: string, confirmed: boolean): Promise<void> {
  if (!validId(id) || confirmed !== true) throw new Error('ROLEPLAY_DELETE_CONFIRMATION_REQUIRED');
  await db.runAsync('DELETE FROM roleplay_history WHERE id=?', id);
}

export type RoleplayAiLimits = { daily_limit: number; session_limit: number };
export function validateRoleplayAiLimits(limits: RoleplayAiLimits) {
  if (!Number.isInteger(limits.daily_limit) || limits.daily_limit < 1 || limits.daily_limit > 100 ||
    ![4, 8, 12].includes(limits.session_limit)) throw new RoleplayStateError('Giới hạn AI không hợp lệ.', 'quota-unavailable');
}
export async function getRoleplayAiLimits(db: SQLiteDatabase): Promise<RoleplayAiLimits> {
  const limits = await db.getFirstAsync<RoleplayAiLimits>('SELECT daily_limit,session_limit FROM roleplay_ai_limits WHERE id=1');
  if (!limits) throw new RoleplayStateError('Thiếu cấu hình giới hạn AI.', 'quota-unavailable');
  validateRoleplayAiLimits(limits);
  return limits;
}
export async function setRoleplayAiLimits(db: SQLiteDatabase, limits: RoleplayAiLimits): Promise<void> {
  validateRoleplayAiLimits(limits);
  const result = await db.runAsync('UPDATE roleplay_ai_limits SET daily_limit=?,session_limit=? WHERE id=1', limits.daily_limit, limits.session_limit);
  if (result.changes !== 1) throw new RoleplayStateError('Thiếu cấu hình giới hạn AI.', 'quota-unavailable');
}

/** Atomic SQLite statement/implicit transaction, not read-then-write JS. No refunds/retries.
 * UTC day is stable across timezone changes; backwards clock fails closed. Counts survive restart/reset/history deletion.
 * Local budget only, not a substitute for server/account quota enforcement.
 */
export async function reserveRoleplayAiAttempt(db: SQLiteDatabase, sessionId: string, now = new Date()): Promise<void> {
  if (!validId(sessionId) || !Number.isFinite(now.getTime())) throw new RoleplayStateError('Giới hạn AI chưa sẵn sàng.', 'quota-unavailable');
  const day = now.toISOString().slice(0, 10);
  try {
    const result = await db.runAsync(`INSERT INTO roleplay_ai_usage(day,session_id,attempts)
      SELECT ?,?,1 FROM roleplay_ai_limits WHERE id=1 AND daily_limit BETWEEN 1 AND 100 AND session_limit IN (4,8,12)
      AND COALESCE((SELECT MAX(day) FROM roleplay_ai_usage),'') <= ?
      AND COALESCE((SELECT SUM(attempts) FROM roleplay_ai_usage WHERE day=?),0) < daily_limit
      AND COALESCE((SELECT SUM(attempts) FROM roleplay_ai_usage WHERE session_id=?),0) < session_limit
      ON CONFLICT(day,session_id) DO UPDATE SET attempts=attempts+1`, day, sessionId, day, day, sessionId);
    if (result.changes === 1) return;
    const limits = await getRoleplayAiLimits(db);
    const usage = await db.getFirstAsync<{ daily: number; session: number; last_day: string | null }>(
      `SELECT COALESCE(SUM(CASE WHEN day=? THEN attempts ELSE 0 END),0) AS daily,
       COALESCE(SUM(CASE WHEN session_id=? THEN attempts ELSE 0 END),0) AS session,MAX(day) AS last_day FROM roleplay_ai_usage`, day, sessionId);
    if (usage && (!usage.last_day || usage.last_day <= day)) {
      if (usage.daily >= limits.daily_limit) throw new RoleplayStateError('Hết lượt AI hôm nay.', 'daily-limit');
      if (usage.session >= limits.session_limit) throw new RoleplayStateError('Hết lượt AI trong phiên.', 'session-limit');
    }
    throw new RoleplayStateError('Không kiểm tra được giới hạn AI.', 'quota-unavailable');
  } catch (error) {
    if (error instanceof RoleplayStateError) throw error;
    throw new RoleplayStateError('Không kiểm tra được giới hạn AI.', 'quota-unavailable');
  }
}

export function roleplayHistoryLabel(row: RoleplayHistoryRecord): string {
  return roleplayScene(row.scene_id as RoleplaySession['scene']).label;
}

/** The screen and tests share this exact gate. OFFLINE never invokes a transport. */
export function budgetedRoleplayTransport(db: SQLiteDatabase, sessionId: string, transport: RoleplayTransport,
  now: () => Date = () => new Date()): RoleplayTransport {
  return async (request) => {
    if (request.signal.aborted) throw new RoleplayStateError('Đã hủy lượt.', 'cancelled');
    await reserveRoleplayAiAttempt(db, sessionId, now());
    if (request.signal.aborted) throw new RoleplayStateError('Đã hủy lượt.', 'cancelled');
    return transport(request);
  };
}
