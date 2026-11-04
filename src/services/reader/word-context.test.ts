import { describe, expect, it } from 'vitest';

import { splitReaderChunks } from './pages';
import { saveReaderWordContext } from './word-context';

import { createLegacyDatabase, expoAdapter } from '@/db/fixtures/legacy_database';
import { migrateDatabaseSchema } from '@/db/migrations';
import { getReadingDocumentChunk, saveReadingDocument } from '@/db/reading';
import { copyVocabularyBatchToDeck, getVocabulary } from '@/db/repository';
import { listVocabularyContexts } from '@/db/vocabulary-context';

describe('reader personal context integration', () => {
  it('attaches repeat encounters to the canonical deck word without duplicating context or progress', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const word = (await getVocabulary(db, 'hsk-1-ni'))!;
      const progressBefore = sqlite.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all();
      const wordsBefore = sqlite.prepare('SELECT COUNT(*) count FROM vocabulary').get();
      expect((await copyVocabularyBatchToDeck(db, 'deck-1', [word])).saved).toBe(1);
      const input = { vocabularyId: word.id, chunk: splitReaderChunks('你好。')[0]!, localCharacterOffset: 0,
        tokenIndex: 0, documentId: null, draftText: '你好。', sourceType: 'READER' as const, sourceId: 'draft-1',
        userConfirmed: true as const,
        deckCopy: { deckId: 'deck-1', word } };
      await saveReaderWordContext(db, input);
      expect((await copyVocabularyBatchToDeck(db, 'deck-1', [word])).saved).toBe(0);
      await saveReaderWordContext(db, input);
      const copy = sqlite.prepare('SELECT vocabulary_id id FROM personal_deck_vocabulary WHERE deck_id=? AND vocabulary_id=?').get('deck-1', word.id) as { id: string };
      expect(copy.id).toBe(word.id);
      expect(await listVocabularyContexts(db, word.id)).toHaveLength(1);
      expect((await listVocabularyContexts(db, copy.id))[0]).toMatchObject({ sentence: '你好。', source_id: 'draft-1' });
      expect(sqlite.prepare('SELECT COUNT(*) count FROM vocabulary').get()).toEqual(wordsBefore);
      expect(sqlite.prepare('SELECT * FROM user_vocabulary_progress ORDER BY vocabulary_id').all()).toEqual(progressBefore);
      expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally { sqlite.close(); }
  });
  it('stores the exact sentence across chunks with stable document/chunk/token/character location', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      const id = await saveReadingDocument(db, '你'.repeat(1996) + '。我学习中文。下一句。', [], 0);
      const chunk = (await getReadingDocumentChunk(db, id, 1))!;
      const input = { vocabularyId: 'hsk-1-ni', chunk, localCharacterOffset: 0, tokenIndex: 0,
        documentId: id, draftText: '', sourceId: id, sourceType: 'READER' as const, userConfirmed: true as const };
      await saveReaderWordContext(db, input); await saveReaderWordContext(db, input);
      const rows = await listVocabularyContexts(db, 'hsk-1-ni');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ sentence: '我学习中文。', source_type: 'READER', source_id: id,
        location: 'chunk:1:token:0:char:2000' });
    } finally { sqlite.close(); }
  });
  it('uses story/OCR/lesson source contracts without truncating or fabricating context', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite); await migrateDatabaseSchema(db);
      for (const sourceType of ['STORY', 'OCR', 'LESSON'] as const) await saveReaderWordContext(db, {
        vocabularyId: 'hsk-1-ni', chunk: splitReaderChunks('你好。再见！')[0]!, localCharacterOffset: 0,
        tokenIndex: 0, documentId: null, draftText: '你好。再见！', sourceType, sourceId: `${sourceType}-source`, userConfirmed: true,
      });
      expect((await listVocabularyContexts(db, 'hsk-1-ni')).map((row) => row.sentence)).toEqual(['你好。', '你好。', '你好。']);
      const text = '你'.repeat(2500);
      await expect(saveReaderWordContext(db, { vocabularyId: 'hsk-1-ni', chunk: splitReaderChunks(text)[0]!,
        localCharacterOffset: 0, tokenIndex: 0, documentId: null, draftText: text, sourceType: 'READER', sourceId: 'too-long', userConfirmed: true }))
        .rejects.toThrow('INVALID_PERSONAL_CONTEXT');
      expect(await listVocabularyContexts(db, 'hsk-1-ni')).toHaveLength(3);
    } finally { sqlite.close(); }
  });
});
