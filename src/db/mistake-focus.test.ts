import { describe, expect, it } from 'vitest';

import { createLegacyDatabase, expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { getMistakeFocus, recordPracticeResult } from './mistakes';

describe('mistake focus', () => {
  it('selects the most repeated unresolved skill deterministically', async () => {
    const sqlite = createLegacyDatabase();
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      await recordPracticeResult(db, { vocabularyId: 'hsk-1-ni', skill: 'PINYIN', exerciseType: 'hanzi_to_pinyin', correct: false });
      await recordPracticeResult(db, { vocabularyId: 'hsk-1-ni', skill: 'PINYIN', exerciseType: 'hanzi_to_pinyin', correct: false });
      await recordPracticeResult(db, { vocabularyId: 'hsk-1-ni', skill: 'MEANING', exerciseType: 'hanzi_to_meaning', correct: false });

      await expect(getMistakeFocus(db)).resolves.toMatchObject({ skill: 'PINYIN', openCount: 1, totalWrong: 2 });
    } finally {
      sqlite.close();
    }
  });
});

