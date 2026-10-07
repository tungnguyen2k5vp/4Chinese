import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { findBulkLookupCandidates } from './repository';

import { normalizeSearch } from '@/services/search/normalize';

describe('vocabulary search FTS', () => {
  it('finds HSK 5+ Vietnamese and compact-pinyin input without loading that band into memory', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      const searchText = normalizeSearch('测试词 測試詞 ce4 shi4 ci2 mốc hsk năm hsk five marker');
      sqlite.prepare(`INSERT INTO vocabulary(
        id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,
        pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom,deck_id
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        'fts-hsk5-target', '测试词', '測試詞', 'cè shì cí', 'ce4 shi4 ci2',
        'mốc hsk năm', '["mốc hsk năm"]', '["hsk five marker"]', '["danh từ"]',
        '5', 'HSK', 'v2', '', 'verified', searchText, 0, null,
      );

      const vietnamese = await findBulkLookupCandidates(db, [{ value: 'mốc hsk năm' }]);
      const pinyin = await findBulkLookupCandidates(db, [{ value: 'ceshici', allowPinyin: true }]);

      expect(vietnamese.map((word) => word.id)).toContain('fts-hsk5-target');
      expect(pinyin.map((word) => word.id)).toContain('fts-hsk5-target');
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM vocabulary_search_fts').get())
        .toEqual({ count: 1 });
    } finally {
      sqlite.close();
    }
  });
});
