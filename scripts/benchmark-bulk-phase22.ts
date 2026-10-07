import { performance } from 'node:perf_hooks';
import { DatabaseSync } from 'node:sqlite';

import { getOfflineVocabulary } from '../src/db/database';
import { expoAdapter } from '../src/db/fixtures/legacy_database';
import { migrateDatabaseSchema } from '../src/db/migrations';
import { findBulkLookupCandidates } from '../src/db/repository';
import { normalizeSearch } from '../src/services/search/normalize';
import { resolveBulkVocabulary } from '../src/services/vocabulary/bulk-import';

const queries = [
  'làm', 'công', 'phòng', 'phòng làm việc', 'dạy', 'phòng học', 'chỉ',
  'nhân viên', 'sống', 'ở', 'tầng', 'phòng nhà', 'gian phòng', 'số',
  'dãy số', 'điện thoại', 'có', 'và', 'có thể', 'đều', 'cảm ơn',
];

function seedDictionary(sqlite: DatabaseSync): void {
  const statement = sqlite.prepare(`INSERT INTO vocabulary(
    id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,meanings_vi,meanings_en,
    pos,hsk_band,source,source_version,source_url,translation_status,search_text,is_custom,deck_id
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  sqlite.exec('BEGIN TRANSACTION');
  try {
    for (const word of getOfflineVocabulary()) {
      statement.run(
        word.id, word.simplified, word.traditional, word.pinyin, word.pinyinNumeric,
        word.primaryMeaningVi, JSON.stringify(word.meaningsVi), JSON.stringify(word.meaningsEn),
        JSON.stringify(word.pos), String(word.hskBand), word.source, word.sourceVersion,
        word.sourceUrl, word.translationStatus,
        normalizeSearch([
          word.simplified, word.traditional, word.pinyin, word.pinyinNumeric,
          ...word.meaningsVi, ...word.meaningsEn,
        ].join(' ')),
        0, null,
      );
    }
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

function percentile(samples: number[], ratio: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] ?? 0;
}

async function main(): Promise<void> {
  const sqlite = new DatabaseSync(':memory:');
  try {
    const db = expoAdapter(sqlite);
    await migrateDatabaseSchema(db);
    seedDictionary(sqlite);
    const input = queries.join('\n');
    await resolveBulkVocabulary(db, input);

    const samples: number[] = [];
    let found = 0;
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const startedAt = performance.now();
      const resolved = await resolveBulkVocabulary(db, input);
      samples.push(performance.now() - startedAt);
      found = resolved.filter((item) => item.word).length;
    }
    const candidates = await findBulkLookupCandidates(
      db,
      queries.map((value) => ({ value, allowPinyin: true })),
    );
    process.stdout.write(`${JSON.stringify({
      dictionarySize: sqlite.prepare('SELECT COUNT(*) AS count FROM vocabulary').get(),
      inputCount: queries.length,
      resolved: found,
      candidateCount: candidates.length,
      medianMs: Math.round(percentile(samples, 0.5) * 100) / 100,
      p95Ms: Math.round(percentile(samples, 0.95) * 100) / 100,
      maxMs: Math.round(Math.max(...samples) * 100) / 100,
    }, null, 2)}\n`);
  } finally {
    sqlite.close();
  }
}

void main();
