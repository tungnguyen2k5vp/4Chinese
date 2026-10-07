import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { expoAdapter } from './fixtures/legacy_database';
import { migrateDatabaseSchema } from './migrations';
import { getVocabulary, listSharedSentencesForVocabulary } from './repository';

describe('shared sentence provenance', () => {
  it('shows reviewed linked sentences in vocabulary detail and excludes pending drafts', async () => {
    const sqlite = new DatabaseSync(':memory:');
    try {
      const db = expoAdapter(sqlite);
      await migrateDatabaseSchema(db);
      sqlite.prepare(`INSERT INTO vocabulary(
        id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,
        pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom,deck_id
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        'sentence-word', '图书馆', '圖書館', 'túshūguǎn', 'tu2 shu1 guan3', 'thư viện',
        '["thư viện"]', '["library"]', '["danh từ"]', '3', 'HSK', 'v2', '',
        'verified', '图书馆 thu vien library', 0, null,
      );
      const sentence = sqlite.prepare(`INSERT INTO sentences(
        id,hanzi,pinyin,translation_vi,translation_en,hsk_level,difficulty,topic,audio_uri,source,
        created_at,source_url,provenance,review_status,reviewed_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      sentence.run(
        'sentence-reviewed', '我在图书馆看书。', 'Wǒ zài túshūguǎn kàn shū.',
        'Tôi đọc sách ở thư viện.', 'I read in the library.', '3', 1, 'study', null,
        '4Chinese editorial', '2026-09-28T00:00:00.000Z', 'local://editorial',
        'EDITORIAL', 'REVIEWED', '2026-09-28T00:00:00.000Z',
      );
      sentence.run(
        'sentence-pending', '图书馆很大。', 'Túshūguǎn hěn dà.',
        'Thư viện rất lớn.', 'The library is large.', '3', 1, 'study', null,
        'AI draft', '2026-09-28T00:00:00.000Z', null,
        'AI_DRAFT', 'PENDING', null,
      );
      sqlite.prepare('INSERT INTO sentence_vocabulary(sentence_id,vocabulary_id,position) VALUES(?,?,?)')
        .run('sentence-reviewed', 'sentence-word', 0);
      sqlite.prepare('INSERT INTO sentence_vocabulary(sentence_id,vocabulary_id,position) VALUES(?,?,?)')
        .run('sentence-pending', 'sentence-word', 0);

      expect((await listSharedSentencesForVocabulary(db, 'sentence-word')).map((item) => item.id))
        .toEqual(['sentence-reviewed']);
      expect((await getVocabulary(db, 'sentence-word'))?.examples.map((item) => item.chinese))
        .toContain('我在图书馆看书。');
    } finally {
      sqlite.close();
    }
  });
});
