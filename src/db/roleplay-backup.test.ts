import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { getRoleplayAiLimits, listRoleplayHistory, minimizeRoleplayHistory, reserveRoleplayAiAttempt,
  saveRoleplayHistory, setRoleplayAiLimits } from './roleplay-history';

import { parseLocalBackup } from '@/services/backup/format';
import { beginRoleplayTurn, createRoleplaySession, finishRoleplayTurn } from '@/services/speaking/roleplay-v5';

const date = new Date('2026-10-01T10:00:00.000Z');
function historyRow(id = 'rp-backup') {
  const pending = beginRoleplayTurn(createRoleplaySession('hotel'), 'PRIVATE_FULL_CONVERSATION 房间');
  const state = finishRoleplayTurn(pending, pending.pending!.id, {
    replyChinese: '你好', pinyin: 'Nǐ hǎo', translationVi: 'Chào', correctionVi: 'PRIVATE_AI_FEEDBACK', suggestedChinese: '',
  });
  return minimizeRoleplayHistory(id, state, true, 'PRIVATE_TRANSCRIPT_SUMMARY', date);
}

describe('roleplay backup against migrated real SQLite', () => {
  it('round trips stable metadata/settings without exporting notes/usage or refunding attempts', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await saveRoleplayHistory(db, historyRow());
      await setRoleplayAiLimits(db, { daily_limit: 10, session_limit: 4 });
      await reserveRoleplayAiAttempt(db, 'rp-backup', date);
      const backup = await exportLocalBackup(db, 'test');
      expect(backup.data.roleplayHistory).toEqual([{ ...historyRow(), transcript_opt_in: 0, transcript_summary: null }]);
      expect(backup.data.roleplayAiLimits).toEqual([{ id: 1, daily_limit: 10, session_limit: 4 }]);
      expect(JSON.stringify(backup)).not.toMatch(/PRIVATE_|roleplayAiUsage|roleplay_ai_usage/);
      expect((await listRoleplayHistory(db))[0]!.transcript_summary).toBe('PRIVATE_TRANSCRIPT_SUMMARY');
      sqlite.exec('DELETE FROM roleplay_history');
      await setRoleplayAiLimits(db, { daily_limit: 20, session_limit: 8 });
      await reserveRoleplayAiAttempt(db, 'rp-later', date);
      const usage = sqlite.prepare('SELECT * FROM roleplay_ai_usage ORDER BY day,session_id').all();
      await importLocalBackup(db, parseLocalBackup(JSON.stringify(backup)));
      expect(await listRoleplayHistory(db)).toEqual(backup.data.roleplayHistory);
      expect(await getRoleplayAiLimits(db)).toEqual({ daily_limit: 10, session_limit: 4 });
      expect(sqlite.prepare('SELECT * FROM roleplay_ai_usage ORDER BY day,session_id').all()).toEqual(usage);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
  it.each([1, 2, 3])('preserves local notes, singleton limits and usage when legacy v%s fields are absent', async (backupVersion) => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await saveRoleplayHistory(db, historyRow());
      await setRoleplayAiLimits(db, { daily_limit: 7, session_limit: 12 });
      await reserveRoleplayAiAttempt(db, 'rp-backup', date);
      const before = await listRoleplayHistory(db);
      const backup = await exportLocalBackup(db, 'test');
      backup.backupVersion = backupVersion; backup.schemaVersion = 37;
      delete backup.data.roleplayHistory; delete backup.data.roleplayAiLimits;
      const parsed = parseLocalBackup(JSON.stringify(backup));
      expect(parsed.data.roleplayHistory).toBeUndefined(); expect(parsed.data.roleplayAiLimits).toBeUndefined();
      await importLocalBackup(db, parsed);
      expect(await listRoleplayHistory(db)).toEqual(before);
      expect(await getRoleplayAiLimits(db)).toEqual({ daily_limit: 7, session_limit: 12 });
      expect(sqlite.prepare('SELECT attempts FROM roleplay_ai_usage').get()?.attempts).toBe(1);
    } finally { sqlite.close(); }
  });
  it('rejects malformed/extra metadata and usage at parser and direct import boundaries before deletes', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await saveRoleplayHistory(db, historyRow());
      const valid = await exportLocalBackup(db, 'test');
      const before = await listRoleplayHistory(db);
      const malformed = structuredClone(valid);
      malformed.data.roleplayHistory![0]!.audio_uri = 'file:///private/audio';
      expect(() => parseLocalBackup(JSON.stringify(malformed))).toThrow();
      await expect(importLocalBackup(db, malformed)).rejects.toThrow();
      const usageSmuggling = { ...valid, data: { ...valid.data, roleplayAiUsage: [] } };
      expect(() => parseLocalBackup(JSON.stringify(usageSmuggling))).toThrow();
      await expect(importLocalBackup(db, usageSmuggling)).rejects.toThrow();
      expect(await listRoleplayHistory(db)).toEqual(before);
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM user_vocabulary_progress').get()?.count).toBe(1);
    } finally { sqlite.close(); }
  });
  it('rolls roleplay history/limits back if a later restore write fails; usage stays unchanged', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await saveRoleplayHistory(db, historyRow());
      await reserveRoleplayAiAttempt(db, 'rp-backup', date);
      const before = await listRoleplayHistory(db); const beforeLimits = await getRoleplayAiLimits(db);
      const backup = await exportLocalBackup(db, 'test');
      backup.data.roleplayHistory = [];
      backup.data.roleplayAiLimits = [{ id: 1, daily_limit: 1, session_limit: 4 }];
      // Invalid FK is encountered after the roleplay restore statements.
      backup.data.readingProgress = [{ document_id: 'missing', last_token_index: 0, coverage_percent: 0, last_read_at: date.toISOString() }];
      await expect(importLocalBackup(db, backup)).rejects.toThrow();
      expect(await listRoleplayHistory(db)).toEqual(before);
      expect(await getRoleplayAiLimits(db)).toEqual(beforeLimits);
      expect(sqlite.prepare('SELECT attempts FROM roleplay_ai_usage').get()?.attempts).toBe(1);
    } finally { sqlite.close(); }
  });
});
