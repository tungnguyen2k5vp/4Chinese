import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { englishWordChainPools, wordChainPoolMetadata } from '@/data/english-word-chain-pools';
import { expoAdapter } from '@/db/fixtures/legacy_database';
import { pickDictionaryChainWord } from '@/services/english/word-chain';

const sourcePath = 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db';

describe('curated difficulty pools, not fake frequency or word length', () => {
  it('keeps appropriate familiar examples and excludes rare baseline words', () => {
    for (const word of ['apple', 'book', 'cat', 'dog', 'fish', 'green', 'house', 'school']) expect(englishWordChainPools.easy).toContain(word);
    expect(englishWordChainPools.easy).not.toContain('aardwolf');
    expect(wordChainPoolMetadata.cefr).toBeNull(); expect(wordChainPoolMetadata.frequency).toBeNull();
  });
  it.skipIf(!existsSync(sourcePath)).each(['easy', 'normal', 'hard'] as const)('%s resolves exact source entries via a bounded indexed IN query, no write', async difficulty => {
    const raw = new DatabaseSync(sourcePath, { readOnly: true });
    try {
      const db = expoAdapter(raw);
      const word = await pickDictionaryChainWord(db, 'a', new Set(), difficulty);
      expect(word).toBeTruthy(); expect(englishWordChainPools[difficulty]).toContain(word);
      const allUsed = new Set(englishWordChainPools[difficulty]);
      expect(await pickDictionaryChainWord(db, 'a', allUsed, difficulty)).toBeNull();
      expect(await pickDictionaryChainWord(db, '#', new Set(), difficulty)).toBeNull();
    } finally { raw.close(); }
  });
});
