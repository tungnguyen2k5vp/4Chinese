import { describe, expect, it } from 'vitest';

import { exportLocalBackup, importLocalBackup } from './backup-repository';
import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { contextCloze, deleteVocabularyContext, listVocabularyContexts, savePersonalContextMemory,
  saveVocabularyContext, validateContextRecord } from './vocabulary-context';

describe('V5 additive content and personal contexts', () => {
  it('upgrades V4 without changing learner rows; reruns safely', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.exec('PRAGMA user_version=35');
      const before = sqlite.prepare('SELECT * FROM user_vocabulary_progress').all();
      await migrateDatabaseSchema(db); await migrateDatabaseSchema(db);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress').all()).toEqual(before);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM word_senses').get()).toEqual({n:0});
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });

  it('allows distinct sense pronunciations and rejects broken sense/example links', async () => {
    const sqlite = createLegacyDatabase();
    try {
      await migrateDatabaseSchema(expoAdapter(sqlite));
      const insert = sqlite.prepare(`INSERT INTO word_senses(vocabulary_id,sense_id,part_of_speech,definition_vi,pinyin_numeric,source_ref)
        VALUES('custom-1',?,'động từ',?,?,'internal:draft')`);
      insert.run('a','nghĩa thứ nhất','xing2'); insert.run('b','nghĩa thứ hai','hang2');
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM word_senses').get()).toEqual({n:2});
      expect(() => sqlite.exec(`INSERT INTO word_sense_examples VALUES('custom-1','missing','missing')`)).toThrow();
      expect(() => sqlite.exec(`UPDATE word_senses SET review_status='VERIFIED'`)).toThrow();
    } finally { sqlite.close(); }
  });

  it('round trips contexts, keeps them with older backups, and rolls back invalid restore', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const input = { vocabularyId:'custom-1', sourceType:'READER' as const,sourceId:'doc-1',location:'0:2',sentence:'我说您好。',userConfirmed:true as const };
      await saveVocabularyContext(db,input,'2026-10-01T08:00:00Z');
      await saveVocabularyContext(db,input,'2026-10-01T09:00:00Z');
      const rows = await listVocabularyContexts(db,'custom-1');
      expect(rows).toHaveLength(1); expect(rows[0]?.created_at).toBe('2026-10-01T08:00:00Z');
      const backup = await exportLocalBackup(db,'test');
      sqlite.exec('DELETE FROM personal_vocabulary_context');
      await importLocalBackup(db,backup);
      expect(await listVocabularyContexts(db,'custom-1')).toEqual(rows);
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM personal_context_memory').get()).toEqual({n:1});
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM word_contexts').get()).toEqual({n:1});
      const older = {...backup,data:{...backup.data}}; delete older.data.personalVocabularyContexts;
      await importLocalBackup(db,older);
      expect(await listVocabularyContexts(db,'custom-1')).toEqual(rows);
      backup.data.personalVocabularyContexts![0]!.sentence = '';
      await expect(importLocalBackup(db,backup)).rejects.toThrow('INVALID_PERSONAL_CONTEXT');
      expect(await listVocabularyContexts(db,'custom-1')).toEqual(rows);
    } finally { sqlite.close(); }
  });

  it('requires explicit consent for every context source and deletes all linked copies atomically', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      await expect(savePersonalContextMemory(db,{ vocabularyId:'hsk-1-ni',sourceType:'AI_SELECTED',sourceId:'roleplay-1',
        sentence:'你想喝什么？',contextLocator:'turn:2',userConfirmed:false })).rejects.toThrow('PERSONAL_CONTEXT_CONSENT_REQUIRED');
      expect(sqlite.prepare('SELECT COUNT(*) AS n FROM personal_context_memory').get()).toEqual({n:0});
      await savePersonalContextMemory(db,{ vocabularyId:'hsk-1-ni',sourceType:'AI_SELECTED',sourceId:'roleplay-1',
        sourceTitle:'Luyện hội thoại',sentence:'你想喝什么？',contextLocator:'turn:2',userConfirmed:true },'2026-10-02T08:00:00Z');
      const aiContext = (await listVocabularyContexts(db,'hsk-1-ni'))[0]!;
      expect(aiContext).toMatchObject({source_type:'AI_SELECTED',user_selected:1,sentence:'你想喝什么？'});
      await saveVocabularyContext(db,{...{vocabularyId:'hsk-1-ni',sourceType:'READER' as const,sourceId:'doc-1',
        location:'0:2',sentence:'我说您好。',userConfirmed:true as const}},'2026-10-02T09:00:00Z');
      const readerContext = (await listVocabularyContexts(db,'hsk-1-ni')).find(row=>row.source_type==='READER')!;
      await deleteVocabularyContext(db,readerContext);
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM personal_vocabulary_context WHERE source_type='READER'").get()).toEqual({n:0});
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM word_contexts WHERE source_type='READER'").get()).toEqual({n:0});
      expect((await listVocabularyContexts(db,'hsk-1-ni')).map(row=>row.source_type)).toEqual(['AI_SELECTED']);
      await saveVocabularyContext(db,{vocabularyId:'hsk-1-ni',sourceType:'READER',sourceId:'doc-2',
        location:'0:8',sentence:'我喜欢中文。',userConfirmed:true},'2026-10-02T10:00:00Z');
      const rollbackContext = (await listVocabularyContexts(db,'hsk-1-ni')).find(row=>row.source_id==='doc-2')!;
      sqlite.exec("CREATE TRIGGER reject_context_copy BEFORE DELETE ON word_contexts BEGIN SELECT RAISE(ABORT,'delete blocked'); END");
      await expect(deleteVocabularyContext(db,rollbackContext)).rejects.toThrow('delete blocked');
      expect((await listVocabularyContexts(db,'hsk-1-ni')).map(row=>row.source_id).sort()).toEqual(['doc-2','roleplay-1']);
      expect(sqlite.prepare("SELECT COUNT(*) AS n FROM personal_vocabulary_context WHERE source_id='doc-2'").get()).toEqual({n:1});
    } finally { sqlite.close(); }
  });

  it('never leaks repeated or traditional answers in cloze', () => {
    expect(contextCloze('学习，也要學習；学习。',['学习','學習'])).toBe('＿＿，也要＿＿；＿＿。');
    expect(contextCloze('没有目标字。',['学习'])).toBeNull();
    expect(() => validateContextRecord({sentence:'x'})).toThrow();
  });
});
