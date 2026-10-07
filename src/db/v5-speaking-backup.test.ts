import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { listSpeakingAttempts, saveSpeakingAttempt } from './speaking-attempts';

import { timedSpeakingPrompts } from '@/data/speaking-practice';
import { parseLocalBackup } from '@/services/backup/format';

describe('V5 speaking metadata upgrade and backup', () => {
  it('round trips metadata, preserves older backups, and rejects audio smuggling before writes', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const prompt = timedSpeakingPrompts[0]!;
      await saveSpeakingAttempt(db, {id:'speaking-test-1',prompt,recordedAt:'2026-10-01T10:00:00.000Z',
        durationMs:1200,selfReview:'Tôi cần đọc chậm hơn.',checklist:[prompt.checklist[0]!],
        transcriptOptIn:false,transcript:null,recordingCompleted:true,replayCompleted:true});
      const before = await listSpeakingAttempts(db);
      const backup = await exportLocalBackup(db,'test');
      expect(JSON.stringify(backup.data.timedSpeakingAttempts)).not.toContain('file:');
      sqlite.exec('DELETE FROM timed_speaking_attempts;');
      await importLocalBackup(db,parseLocalBackup(JSON.stringify(backup)));
      expect(await listSpeakingAttempts(db)).toEqual(before);
      const old = {...backup,data:{...backup.data}};delete old.data.timedSpeakingAttempts;
      await importLocalBackup(db,old);
      expect(await listSpeakingAttempts(db)).toEqual(before);
      backup.data.timedSpeakingAttempts![0]!.audio_uri='file:///private/recording';
      expect(()=>parseLocalBackup(JSON.stringify(backup))).toThrow('luyện nói');
      await expect(importLocalBackup(db,backup)).rejects.toThrow('INVALID_SPEAKING_BACKUP');
      expect(await listSpeakingAttempts(db)).toEqual(before);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {sqlite.close();}
  });
});
