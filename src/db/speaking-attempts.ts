import type { SQLiteDatabase } from 'expo-sqlite';

import type { TimedSpeakingPrompt } from '@/data/speaking-practice';

export const SPEAKING_HISTORY_LIMIT = 100;
/** Only implemented audio policy. Longer retention must not appear as selectable UI. */
export const SPEAKING_AUDIO_RETENTION = 'SESSION_ONLY' as const;
export type SpeakingAttempt = {
  id: string;
  prompt: TimedSpeakingPrompt;
  recordedAt: string;
  durationMs: number;
  selfReview: string;
  checklist: string[];
  transcriptOptIn: boolean;
  transcript: string | null;
  audioRetention: typeof SPEAKING_AUDIO_RETENTION;
};
export type SpeakingAttemptBackupRecord = {
  id: string; prompt_id: string; snapshot_json: string; recorded_at: string;
  duration_ms: number; self_review: string; checklist_json: string;
  transcript_opt_in: number; transcript: string | null; audio_retention: 'SESSION_ONLY';
};
const columns = ['id', 'prompt_id', 'snapshot_json', 'recorded_at', 'duration_ms',
  'self_review', 'checklist_json', 'transcript_opt_in', 'transcript', 'audio_retention'];
const promptKeys = ['id', 'level', 'title', 'prompt', 'preparationSeconds', 'recordingSeconds',
  'checklist', 'sourceType', 'reviewStatus'];
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
const text = (value: unknown, limit: number): value is string => typeof value === 'string' && value.length <= limit;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const stringList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 20 &&
  value.every((item) => text(item, 500) && !!item.trim()) && new Set(value).size === value.length;
function validatePrompt(value: unknown): asserts value is TimedSpeakingPrompt {
  if (!object(value) || !exactKeys(value, promptKeys) || !validId(value.id) ||
    typeof value.level !== 'string' || !['1', '2', '3', '4', '5', '6', '7-9'].includes(value.level) ||
    !text(value.title, 300) || !value.title.trim() || !text(value.prompt, 8000) || !value.prompt.trim() ||
    !Number.isInteger(value.preparationSeconds) || (value.preparationSeconds as number) < 0 || (value.preparationSeconds as number) > 120 ||
    !Number.isInteger(value.recordingSeconds) || (value.recordingSeconds as number) < 1 || (value.recordingSeconds as number) > 120 ||
    !stringList(value.checklist) || !value.checklist.length || value.sourceType !== 'CURATED' || value.reviewStatus !== 'UNREVIEWED') {
    throw new Error('INVALID_SPEAKING_SNAPSHOT');
  }
}

/** Strict allowlist: metadata backups cannot smuggle audio URIs, blobs or grading fields. */
export function validateSpeakingAttemptBackupRecord(row: Record<string, unknown>): void {
  if (!object(row) || !exactKeys(row, columns) || !validId(row.id) || !validId(row.prompt_id) ||
    !text(row.snapshot_json, 24000) || !text(row.checklist_json, 12000) ||
    !text(row.recorded_at, 24) || !Number.isFinite(Date.parse(row.recorded_at)) ||
    new Date(row.recorded_at).toISOString() !== row.recorded_at ||
    !Number.isInteger(row.duration_ms) || (row.duration_ms as number) < 1 || (row.duration_ms as number) > 120000 ||
    !text(row.self_review, 2000) || ![0, 1].includes(row.transcript_opt_in as number) ||
    (row.transcript !== null && !text(row.transcript, 4000)) ||
    (row.transcript_opt_in === 0 && row.transcript !== null) || row.audio_retention !== SPEAKING_AUDIO_RETENTION) {
    throw new Error('INVALID_SPEAKING_BACKUP');
  }
  const snapshot: unknown = JSON.parse(row.snapshot_json);
  const checklist: unknown = JSON.parse(row.checklist_json);
  validatePrompt(snapshot);
  if (snapshot.id !== row.prompt_id || (row.duration_ms as number) > snapshot.recordingSeconds * 1000 ||
    !stringList(checklist) || checklist.some((item) => !snapshot.checklist.includes(item))) {
    throw new Error('INVALID_SPEAKING_BACKUP');
  }
}

/** A cancelled/denied recording or partial replay never provides save evidence. */
export class SpeakingRecordingEvidence {
  private durationMs: number | null = null;
  private replayStarted = false;
  private replayCompleted = false;
  constructor(private maxDurationMs: number) {}
  reset() { this.durationMs = null; this.replayStarted = false; this.replayCompleted = false; }
  recordingCompleted(durationMs: number) {
    this.reset();
    if (Number.isInteger(durationMs) && durationMs > 0 && durationMs <= this.maxDurationMs) this.durationMs = durationMs;
  }
  replayStart() { this.replayStarted = this.durationMs !== null; }
  replayComplete() { if (this.replayStarted && this.durationMs !== null) this.replayCompleted = true; }
  completedDuration(): number | null { return this.replayCompleted ? this.durationMs : null; }
}

export async function saveSpeakingAttempt(db: SQLiteDatabase, input: Omit<SpeakingAttempt, 'audioRetention'> & {
  recordingCompleted: boolean; replayCompleted: boolean;
}): Promise<void> {
  if (input.recordingCompleted !== true || input.replayCompleted !== true || typeof input.transcriptOptIn !== 'boolean') {
    throw new Error('SPEAKING_RECORDING_REPLAY_REQUIRED');
  }
  const row: SpeakingAttemptBackupRecord = {
    id: input.id, prompt_id: input.prompt.id, snapshot_json: JSON.stringify(input.prompt), recorded_at: input.recordedAt,
    duration_ms: input.durationMs, self_review: input.selfReview, checklist_json: JSON.stringify(input.checklist),
    transcript_opt_in: input.transcriptOptIn ? 1 : 0,
    // Opt-out discards even an accidentally supplied transcript; no automatic transcription.
    transcript: input.transcriptOptIn ? input.transcript : null, audio_retention: SPEAKING_AUDIO_RETENTION,
  };
  validateSpeakingAttemptBackupRecord(row);
  await db.withTransactionAsync(async () => {
    const previous = await db.getFirstAsync<SpeakingAttemptBackupRecord>(
      `SELECT ${columns.join(',')} FROM timed_speaking_attempts WHERE id=?`, row.id);
    if (previous) {
      // Retrying a save is harmless; a reused id cannot replace someone else's snapshot.
      if (columns.some((key) => previous[key as keyof SpeakingAttemptBackupRecord] !== row[key as keyof SpeakingAttemptBackupRecord])) {
        throw new Error('SPEAKING_ATTEMPT_ID_CONFLICT');
      }
      return;
    }
    await db.runAsync(`INSERT INTO timed_speaking_attempts (${columns.join(',')}) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      row.id, row.prompt_id, row.snapshot_json, row.recorded_at, row.duration_ms, row.self_review,
      row.checklist_json, row.transcript_opt_in, row.transcript, row.audio_retention);
    await db.runAsync(`DELETE FROM timed_speaking_attempts WHERE id NOT IN
      (SELECT id FROM timed_speaking_attempts ORDER BY recorded_at DESC,id DESC LIMIT ?)`, SPEAKING_HISTORY_LIMIT);
  });
}

export async function listSpeakingAttempts(db: SQLiteDatabase, limit = 20): Promise<SpeakingAttempt[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > SPEAKING_HISTORY_LIMIT) throw new Error('INVALID_SPEAKING_HISTORY_LIMIT');
  const rows = await db.getAllAsync<SpeakingAttemptBackupRecord>(
    `SELECT ${columns.join(',')} FROM timed_speaking_attempts ORDER BY recorded_at DESC,id DESC LIMIT ?`, limit);
  return rows.map((row) => {
    validateSpeakingAttemptBackupRecord(row);
    return { id: row.id, prompt: JSON.parse(row.snapshot_json) as TimedSpeakingPrompt, recordedAt: row.recorded_at,
      durationMs: row.duration_ms, selfReview: row.self_review, checklist: JSON.parse(row.checklist_json) as string[],
      transcriptOptIn: row.transcript_opt_in === 1, transcript: row.transcript, audioRetention: row.audio_retention };
  });
}

/** Explicit confirmation required at the repository boundary as well as the UI. */
export async function deleteSpeakingAttempt(db: SQLiteDatabase, id: string, confirmed: boolean): Promise<void> {
  if (!validId(id) || confirmed !== true) throw new Error('SPEAKING_DELETE_CONFIRMATION_REQUIRED');
  await db.runAsync('DELETE FROM timed_speaking_attempts WHERE id=?', id);
}
