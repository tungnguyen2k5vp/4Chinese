import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { expoAdapter } from '../src/db/fixtures/legacy_database';
import { englishWordChainPools } from '../src/data/english-word-chain-pools';
import { lookupEnglishForms, searchEnglishDictionary } from '../src/services/english/dictionary-intelligence';
import { pickDictionaryChainWord } from '../src/services/english/word-chain';
import { englishReadingWindow } from '../src/services/reader/english-tokenizer';

async function run() {
  const source = 'artifacts/v7-2026-10-10/sources/skypedia-388adc0/dictionary_en_vi.db';
  const before = createHash('sha256').update(readFileSync(source)).digest('hex');
  const raw = new DatabaseSync(source, { readOnly: true });
  const db = expoAdapter(raw);
  const timings: { flow: string; milliseconds: number; resultCount?: number; heapDeltaBytes?: number }[] = [];
  for (const input of ['learning', 'went', 'children', 'better', 'meeting', 'look up', 'cam on']) {
    const start = performance.now();
    const result = await searchEnglishDictionary(db, input);
    timings.push({ flow: `dictionary:${input}`, milliseconds: +(performance.now() - start).toFixed(2), resultCount: result.length });
  }
  for (const input of ['learning', 'went', 'children', 'better']) {
    const start = performance.now();
    const result = await lookupEnglishForms(db, input);
    timings.push({ flow: `forms:${input}`, milliseconds: +(performance.now() - start).toFixed(2), resultCount: result.length });
  }
  for (const length of [100, 1000, 10000, 100000]) {
    const text = 'I am learning English. Don’t give up.\n\n'.repeat(Math.ceil(length / 35)).slice(0, length);
    const heap = process.memoryUsage().heapUsed;
    const start = performance.now(); const window = englishReadingWindow(text, 0);
    timings.push({ flow: `reader-first-window:${length}characters`, milliseconds: +(performance.now() - start).toFixed(2), resultCount: window.tokens.length, heapDeltaBytes: process.memoryUsage().heapUsed - heap });
    if (window.tokens.length > 1500) throw new Error('Unbounded Reader render');
  }
  for (const level of ['easy', 'normal', 'hard'] as const) {
    const start = performance.now(); const word = await pickDictionaryChainWord(db, 'a', new Set(), level);
    timings.push({ flow: `chain:${level}`, milliseconds: +(performance.now() - start).toFixed(2), resultCount: word ? 1 : 0 });
  }
  const pool = englishWordChainPools.easy.filter(word => word.startsWith('a')).slice(0, 100);
  const queryPlan = raw.prepare(`EXPLAIN QUERY PLAN SELECT word FROM words WHERE lang_code='en' AND word IN (${pool.map(() => '?').join(',')})`).all(...pool);
  raw.close();
  const after = createHash('sha256').update(readFileSync(source)).digest('hex');
  if (before !== after) throw new Error('Corpus changed');
  const result = { environment: 'Windows host Node24, read-only actual SQLite corpus. NOT Android/release profiling. Timings are single-run observations, not a device SLA; heap deltas include GC noise.', timestamp: new Date().toISOString(), timings, queryPlan, corpusSha256: after };
  writeFileSync('artifacts/v8-1-english-2026-10-13/performance.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
void run();
