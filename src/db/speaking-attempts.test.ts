import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { migrationV37Sql } from './speaking-attempt-schema';
import { deleteSpeakingAttempt, listSpeakingAttempts, saveSpeakingAttempt, SpeakingRecordingEvidence,
  SPEAKING_HISTORY_LIMIT, validateSpeakingAttemptBackupRecord } from './speaking-attempts';

import { timedSpeakingPrompts } from '@/data/speaking-practice';
import { parseLocalBackup } from '@/services/backup/format';

function input(id = 'speaking-1') {
  return { id, prompt: structuredClone(timedSpeakingPrompts[0]!), recordedAt: '2026-10-01T01:02:03.000Z',
    durationMs: 2450, selfReview: 'Cần ngắt câu rõ hơn.', checklist: [timedSpeakingPrompts[0]!.checklist[0]!],
    transcriptOptIn: false, transcript: null, recordingCompleted: true, replayCompleted: true };
}
function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migrationV37Sql);
  return { sqlite, db: expoAdapter(sqlite) };
}

describe('persistent timed-speaking metadata', () => {
  it('main migration upgrades legacy data and backup round-trips only validated metadata', async () => {
    const sqlite = createLegacyDatabase();
    const db = expoAdapter(sqlite);
    try {
      const before = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      await migrateDatabaseSchema(db);
      await saveSpeakingAttempt(db, { ...input(), transcriptOptIn: true, transcript: '我叫小明。' });
      const expected = await listSpeakingAttempts(db);
      const backup = parseLocalBackup(JSON.stringify(await exportLocalBackup(db, 'worker4-test')));
      expect(backup.data.timedSpeakingAttempts).toHaveLength(1);
      expect(() => validateSpeakingAttemptBackupRecord(backup.data.timedSpeakingAttempts![0]!)).not.toThrow();
      await deleteSpeakingAttempt(db, expected[0]!.id, true);
      await importLocalBackup(db, backup);
      expect(await listSpeakingAttempts(db)).toEqual(expected);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(before);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
  it('additive SQL is repeatable, preserves unrelated rows and contains no sound columns', () => {
    const { sqlite } = fixture();
    try {
      sqlite.exec("CREATE TABLE unrelated(id TEXT); INSERT INTO unrelated VALUES('keep');");
      sqlite.exec(migrationV37Sql);
      expect(sqlite.prepare('SELECT * FROM unrelated').all()).toEqual([{ id: 'keep' }]);
      expect(sqlite.prepare('PRAGMA table_info(timed_speaking_attempts)').all().map((row) => row.name)).toEqual([
        'id', 'prompt_id', 'snapshot_json', 'recorded_at', 'duration_ms', 'self_review', 'checklist_json',
        'transcript_opt_in', 'transcript', 'audio_retention',
      ]);
    } finally { sqlite.close(); }
  });
  it('saves exactly once, preserves the original snapshot and rejects a conflicting retry', async () => {
    const { sqlite, db } = fixture();
    try {
      const attempt = input();
      await saveSpeakingAttempt(db, attempt);
      await saveSpeakingAttempt(db, attempt);
      expect(await listSpeakingAttempts(db)).toEqual([{ id: attempt.id, prompt: attempt.prompt,
        recordedAt: attempt.recordedAt, durationMs: 2450, selfReview: attempt.selfReview,
        checklist: attempt.checklist, transcriptOptIn: false, transcript: null, audioRetention: 'SESSION_ONLY' }]);
      attempt.prompt.title = 'Later content edit';
      await expect(saveSpeakingAttempt(db, attempt)).rejects.toThrow('SPEAKING_ATTEMPT_ID_CONFLICT');
      expect((await listSpeakingAttempts(db))[0]!.prompt.title).toBe(timedSpeakingPrompts[0]!.title);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM timed_speaking_attempts').get()).toEqual({ n: 1 });
    } finally { sqlite.close(); }
  });
  it('survives a real database close/reopen with no audio file reference', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'speaking-v5-test-'));
    const filename = join(directory, 'metadata.sqlite');
    let sqlite = new DatabaseSync(filename);
    try {
      sqlite.exec(migrationV37Sql);
      await saveSpeakingAttempt(expoAdapter(sqlite), input());
      sqlite.close();
      sqlite = new DatabaseSync(filename);
      const attempts = await listSpeakingAttempts(expoAdapter(sqlite));
      expect(attempts).toHaveLength(1);
      expect(attempts[0]!.durationMs).toBe(2450);
      expect(JSON.stringify(attempts)).not.toMatch(/file:\/\/|audioUri|audio_uri|\.m4a/);
    } finally { sqlite.close(); unlinkSync(filename); rmdirSync(directory); }
  });
  it.each([
    { recordingCompleted: false }, { replayCompleted: false }, { durationMs: 0 }, { durationMs: -1 },
    { durationMs: 1.5 }, { durationMs: 30001 }, { durationMs: Infinity },
    { checklist: ['not in snapshot'] }, { checklist: [timedSpeakingPrompts[0]!.checklist[0]!, timedSpeakingPrompts[0]!.checklist[0]!] },
  ])('rejects incomplete or malformed attempts without partial writes: %j', async (change) => {
    const { sqlite, db } = fixture();
    try {
      await expect(saveSpeakingAttempt(db, { ...input(), ...change })).rejects.toThrow();
      expect(await listSpeakingAttempts(db)).toEqual([]);
    } finally { sqlite.close(); }
  });
  it('accepts durations at one millisecond and the full two-minute bound', async () => {
    const { sqlite, db } = fixture();
    try {
      await saveSpeakingAttempt(db, { ...input('short'), durationMs: 1 });
      await saveSpeakingAttempt(db, { ...input('long'), prompt: structuredClone(timedSpeakingPrompts.at(-1)!), durationMs: 120000, checklist: [] });
      expect((await listSpeakingAttempts(db)).map((attempt) => attempt.durationMs).sort((a, b) => a - b)).toEqual([1, 120000]);
    } finally { sqlite.close(); }
  });
  it('retains a manual transcript only with explicit opt-in', async () => {
    const { sqlite, db } = fixture();
    try {
      await saveSpeakingAttempt(db, { ...input('off'), transcript: 'Must be discarded' });
      await saveSpeakingAttempt(db, { ...input('on'), transcriptOptIn: true, transcript: '我喜欢学习中文。' });
      const attempts = await listSpeakingAttempts(db);
      expect(attempts.find((attempt) => attempt.id === 'off')!.transcript).toBeNull();
      expect(attempts.find((attempt) => attempt.id === 'on')!.transcript).toBe('我喜欢学习中文。');
    } finally { sqlite.close(); }
  });
  it('bounds history in deterministic recent-first order and requires deletion confirmation', async () => {
    const { sqlite, db } = fixture();
    try {
      for (let index = 0; index < SPEAKING_HISTORY_LIMIT + 5; index++) {
        await saveSpeakingAttempt(db, { ...input(`attempt-${index}`), recordedAt: new Date(Date.UTC(2026, 9, 1, 0, 0, index)).toISOString() });
      }
      const history = await listSpeakingAttempts(db, SPEAKING_HISTORY_LIMIT);
      expect(history).toHaveLength(100);
      expect(history[0]!.id).toBe('attempt-104');
      expect(history.at(-1)!.id).toBe('attempt-5');
      expect(await listSpeakingAttempts(db)).toHaveLength(20);
      await expect(listSpeakingAttempts(db, 101)).rejects.toThrow('INVALID_SPEAKING_HISTORY_LIMIT');
      await expect(deleteSpeakingAttempt(db, 'attempt-104', false)).rejects.toThrow('SPEAKING_DELETE_CONFIRMATION_REQUIRED');
      expect((await listSpeakingAttempts(db))[0]!.id).toBe('attempt-104');
      await deleteSpeakingAttempt(db, 'attempt-104', true);
      await deleteSpeakingAttempt(db, 'attempt-104', true);
      expect(await listSpeakingAttempts(db, 100)).toHaveLength(99);
    } finally { sqlite.close(); }
  });
  it('backup validator rejects audio, extra snapshot fields, non-consensual transcripts and false retention claims', async () => {
    const { sqlite, db } = fixture();
    try {
      await saveSpeakingAttempt(db, input());
      const row = sqlite.prepare('SELECT * FROM timed_speaking_attempts').get()!;
      expect(() => validateSpeakingAttemptBackupRecord(row)).not.toThrow();
      for (const change of [
        { audio_uri: 'file://record.m4a' }, { audio_blob: 'base64' }, { acoustic_score: 99 },
        { transcript: 'not consented' }, { audio_retention: '7_DAYS' }, { duration_ms: '2450' },
        { duration_ms: 120001 }, { self_review: 'x'.repeat(2001) }, { recorded_at: '2026-10-01' },
        { checklist_json: '["not in snapshot"]' }, { snapshot_json: '{' },
        { snapshot_json: JSON.stringify({ ...input().prompt, audioUri: 'file://record.m4a' }) },
        { snapshot_json: JSON.stringify({ ...input().prompt, level: 1 }) },
      ]) expect(() => validateSpeakingAttemptBackupRecord({ ...row, ...change })).toThrow();
      expect(() => validateSpeakingAttemptBackupRecord({ ...row, transcript_opt_in: 1, transcript: 'User entered' })).not.toThrow();
      expect(() => sqlite.prepare('UPDATE timed_speaking_attempts SET transcript=?').run('without consent')).toThrow();
      expect(() => sqlite.prepare('UPDATE timed_speaking_attempts SET audio_retention=?').run('MANUAL')).toThrow();
    } finally { sqlite.close(); }
  });
});

describe('real recording and replay evidence', () => {
  it('denial, completion without playback start, cancellation and resume cannot reuse an old attempt', () => {
    const evidence = new SpeakingRecordingEvidence(30000);
    evidence.replayStart(); evidence.replayComplete();
    expect(evidence.completedDuration()).toBeNull();
    evidence.recordingCompleted(2450); evidence.replayComplete();
    expect(evidence.completedDuration()).toBeNull();
    evidence.replayStart();
    expect(evidence.completedDuration()).toBeNull();
    evidence.reset(); evidence.replayComplete();
    expect(evidence.completedDuration()).toBeNull();
    evidence.recordingCompleted(3600); evidence.replayStart(); evidence.replayComplete();
    expect(evidence.completedDuration()).toBe(3600);
    evidence.replayComplete();
    expect(evidence.completedDuration()).toBe(3600);
    evidence.recordingCompleted(1200);
    expect(evidence.completedDuration()).toBeNull();
  });
  it.each([0, -1, 1.1, NaN, Infinity, 30001])('rejects invalid callback duration %s', (durationMs) => {
    const evidence = new SpeakingRecordingEvidence(30000);
    evidence.recordingCompleted(durationMs); evidence.replayStart(); evidence.replayComplete();
    expect(evidence.completedDuration()).toBeNull();
  });
});
