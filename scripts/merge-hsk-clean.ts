import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type HskBand = 1 | 2 | 3 | 4 | 5 | 6 | '7-9';

export type CsvVocabularyRow = {
  hsk_level: string;
  hanzi: string;
  pinyin: string;
  meaning_vi: string;
  meaning_en: string;
};

export type VocabularyRecord = {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyinNumeric: string;
  primaryMeaningVi: string;
  meaningsVi: string[];
  meaningsEn: string[];
  pos: string[];
  hskBand: HskBand;
  frequencyRank: number | null;
  classifiers: string[];
  radical: string | null;
  strokeCount: number | null;
  visualType: 'image' | 'illustration' | 'icon' | 'none';
  imageUri: string | null;
  imageSource: string | null;
  imageLicense: string | null;
  imageAttribution: string | null;
  audioUri: string | null;
  source: string;
  sourceVersion: string;
  sourceUrl: string;
  translationStatus: 'verified' | 'machine' | 'missing';
  examples: unknown[];
};

export type MergeReport = {
  sourceRows: number;
  sourceDistribution: Record<string, number>;
  resultingRows: number;
  resultingDistribution: Record<string, number>;
  matchedExisting: number;
  added: number;
  unchanged: number;
  updated: {
    pinyin: number;
    meaningVi: number;
    meaningEn: number;
    hskBand: number;
    records: number;
  };
  addedByBand: Record<string, number>;
  preservedExistingNotInSource: number;
  preservedExistingAmbiguousReadings: Array<{ id: string; simplified: string; pinyinNumeric: string }>;
  sourceDuplicateReadings: Array<{ simplified: string; readings: string[] }>;
};

const requiredHeaders = ['hsk_level', 'hanzi', 'pinyin', 'meaning_vi', 'meaning_en'] as const;
const userSuppliedSourceUrl = 'https://source.local/all_hsk_clean.csv';
const accentTone: Record<string, [string, string]> = {
  ā: ['a', '1'], á: ['a', '2'], ǎ: ['a', '3'], à: ['a', '4'],
  ē: ['e', '1'], é: ['e', '2'], ě: ['e', '3'], è: ['e', '4'],
  ī: ['i', '1'], í: ['i', '2'], ǐ: ['i', '3'], ì: ['i', '4'],
  ō: ['o', '1'], ó: ['o', '2'], ǒ: ['o', '3'], ò: ['o', '4'],
  ū: ['u', '1'], ú: ['u', '2'], ǔ: ['u', '3'], ù: ['u', '4'],
  ǖ: ['v', '1'], ǘ: ['v', '2'], ǚ: ['v', '3'], ǜ: ['v', '4'], ü: ['v', ''],
  Ā: ['a', '1'], Á: ['a', '2'], Ǎ: ['a', '3'], À: ['a', '4'],
  Ē: ['e', '1'], É: ['e', '2'], Ě: ['e', '3'], È: ['e', '4'],
  Ī: ['i', '1'], Í: ['i', '2'], Ǐ: ['i', '3'], Ì: ['i', '4'],
  Ō: ['o', '1'], Ó: ['o', '2'], Ǒ: ['o', '3'], Ò: ['o', '4'],
  Ū: ['u', '1'], Ú: ['u', '2'], Ǔ: ['u', '3'], Ù: ['u', '4'],
  Ǖ: ['v', '1'], Ǘ: ['v', '2'], Ǚ: ['v', '3'], Ǜ: ['v', '4'], Ü: ['v', ''],
};

function toBand(value: string): HskBand {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, ' ');
  if (normalized === 'HSK 7-9') return '7-9';
  const match = normalized.match(/^HSK ([1-6])$/);
  if (!match?.[1]) throw new Error(`INVALID_HSK_LEVEL:${value}`);
  return Number(match[1]) as Exclude<HskBand, '7-9'>;
}

function distribution<T>(items: T[], getBand: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((result, item) => {
    const band = getBand(item);
    result[band] = (result[band] ?? 0) + 1;
    return result;
  }, {});
}

/** Parses RFC4180-style CSV, including escaped quotes and line breaks in cells. */
export function parseCleanHskCsv(input: string): CsvVocabularyRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index] ?? '';
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += character;
  }
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  const [header = [], ...data] = rows;
  const headers = header.map((value, index) => index === 0 ? value.replace(/^\uFEFF/, '').trim() : value.trim());
  if (requiredHeaders.some((name) => !headers.includes(name))) {
    throw new Error(`CSV_HEADERS_INVALID:${headers.join(',')}`);
  }
  return data.map((values, index) => {
    const record = Object.fromEntries(headers.map((name, column) => [name, (values[column] ?? '').trim()]));
    const rowNumber = index + 2;
    for (const key of requiredHeaders) {
      if (!record[key]) throw new Error(`CSV_REQUIRED_VALUE_MISSING:${key}:row-${rowNumber}`);
    }
    toBand(record.hsk_level ?? '');
    return record as CsvVocabularyRow;
  });
}

/** Converts tone-mark pinyin to the app's numeric pinyin representation. */
export function pinyinToNumeric(value: string): string {
  const normalized = value.normalize('NFC');
  let result = '';
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index] ?? '';
    const accented = accentTone[character];
    if (!accented) {
      result += character === 'ü' || character === 'Ü' ? 'v' : character.toLocaleLowerCase();
      continue;
    }

    // A tone mark is placed on the vowel, while numeric pinyin puts its digit
    // at the end of the syllable: e.g. é r -> er2, shēng -> sheng1, āi -> ai1.
    result += accented[0];
    let cursor = index + 1;
    while (cursor < normalized.length) {
      const following = normalized[cursor] ?? '';
      if (accentTone[following] || !/[aeiouüAEIOUÜ]/u.test(following)) break;
      result += following === 'ü' || following === 'Ü' ? 'v' : following.toLocaleLowerCase();
      cursor += 1;
    }
    const coda = normalized[cursor] ?? '';
    if (coda.toLocaleLowerCase() === 'n') {
      result += 'n';
      cursor += 1;
      if ((normalized[cursor] ?? '').toLocaleLowerCase() === 'g') {
        result += 'g';
        cursor += 1;
      }
    } else if (coda.toLocaleLowerCase() === 'r') {
      result += 'r';
      cursor += 1;
    }
    result += accented[1];
    index = cursor - 1;
  }
  const numeric = result
    .replace(/u:/g, 'v')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /[1-5]/u.test(numeric) ? numeric : `${numeric}5`;
}

/** Tone 5 and separators are not semantically meaningful for reading matching. */
export function pinyinMatchKey(value: string): string {
  const base: string[] = [];
  const tones: string[] = [];
  for (const character of value.normalize('NFC')) {
    const accented = accentTone[character];
    if (accented) {
      base.push(accented[0]);
      if (accented[1] && accented[1] !== '5') tones.push(accented[1]);
    } else if (/\d/u.test(character)) {
      if (character !== '5') tones.push(character);
    } else if (/[a-zA-ZüÜ]/u.test(character)) {
      base.push(character === 'ü' || character === 'Ü' ? 'v' : character.toLocaleLowerCase());
    }
  }
  return `${base.join('')}#${tones.join('')}`;
}

export function stableVocabularyId(simplified: string, pinyinNumeric: string): string {
  return `hsk-${createHash('sha1').update(`${simplified}|${pinyinNumeric}`).digest('hex').slice(0, 12)}`;
}

function equivalent(values: string[], expected: string[]): boolean {
  return values.length === expected.length && values.every((value, index) => value === expected[index]);
}

function alignedSource(source: string): string {
  const canonical = source.replace(/(?:; all_hsk_clean\.csv alignment)+$/u, '');
  return `${canonical}; all_hsk_clean.csv alignment`;
}

function sourceDuplicateReadings(rows: CsvVocabularyRow[]): Array<{ simplified: string; readings: string[] }> {
  const byHanzi = new Map<string, CsvVocabularyRow[]>();
  for (const row of rows) byHanzi.set(row.hanzi, [...(byHanzi.get(row.hanzi) ?? []), row]);
  return [...byHanzi.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([simplified, entries]) => ({ simplified, readings: entries.map((entry) => entry.pinyin) }))
    .sort((left, right) => left.simplified.localeCompare(right.simplified, 'zh-Hans-CN'));
}

function newVocabulary(row: CsvVocabularyRow, sourceVersion: string): VocabularyRecord {
  const pinyinNumeric = pinyinToNumeric(row.pinyin);
  return {
    id: stableVocabularyId(row.hanzi, pinyinNumeric),
    simplified: row.hanzi,
    traditional: row.hanzi,
    pinyin: row.pinyin,
    pinyinNumeric,
    primaryMeaningVi: row.meaning_vi,
    meaningsVi: [row.meaning_vi],
    meaningsEn: [row.meaning_en],
    pos: [],
    hskBand: toBand(row.hsk_level),
    frequencyRank: null,
    classifiers: [],
    radical: null,
    strokeCount: null,
    visualType: 'illustration',
    imageUri: null,
    imageSource: null,
    imageLicense: null,
    imageAttribution: null,
    audioUri: null,
    source: 'all_hsk_clean.csv (user-provided)',
    sourceVersion,
    sourceUrl: userSuppliedSourceUrl,
    translationStatus: 'machine',
    examples: [],
  };
}

export function mergeCleanHskVocabulary(
  current: VocabularyRecord[],
  sourceRows: CsvVocabularyRow[],
  sourceVersion: string,
): { words: VocabularyRecord[]; report: MergeReport } {
  const currentByReading = new Map<string, VocabularyRecord>();
  const currentByHanzi = new Map<string, VocabularyRecord[]>();
  const currentIds = new Set<string>();
  for (const word of current) {
    const readingKey = `${word.simplified}|${pinyinMatchKey(word.pinyinNumeric || word.pinyin)}`;
    if (currentByReading.has(readingKey)) throw new Error(`CURRENT_READING_DUPLICATE:${readingKey}`);
    currentByReading.set(readingKey, word);
    currentByHanzi.set(word.simplified, [...(currentByHanzi.get(word.simplified) ?? []), word]);
    currentIds.add(word.id);
  }
  const sourceReadingKeys = new Set<string>();
  for (const row of sourceRows) {
    const key = `${row.hanzi}|${pinyinMatchKey(row.pinyin)}`;
    if (sourceReadingKeys.has(key)) throw new Error(`SOURCE_READING_DUPLICATE:${key}`);
    sourceReadingKeys.add(key);
  }

  const replacements = new Map<string, VocabularyRecord>();
  const additions: VocabularyRecord[] = [];
  const touchedIds = new Set<string>();
  const updated = { pinyin: 0, meaningVi: 0, meaningEn: 0, hskBand: 0, records: 0 };
  const addedByBand: Record<string, number> = {};
  let unchanged = 0;

  for (const row of sourceRows) {
    const numeric = pinyinToNumeric(row.pinyin);
    const key = `${row.hanzi}|${pinyinMatchKey(numeric)}`;
    const matchingCurrent = currentByReading.get(key);
    if (matchingCurrent) {
      touchedIds.add(matchingCurrent.id);
      const targetBand = toBand(row.hsk_level);
      // Existing IDs retain their canonical pinyin so lesson, SRS and audio references stay stable.
      const pinyinChanged = false;
      const meaningsVi = [row.meaning_vi];
      const meaningsEn = [row.meaning_en];
      const viChanged = matchingCurrent.primaryMeaningVi !== row.meaning_vi || !equivalent(matchingCurrent.meaningsVi, meaningsVi);
      const enChanged = !equivalent(matchingCurrent.meaningsEn, meaningsEn);
      const bandChanged = matchingCurrent.hskBand !== targetBand;
      const expectedSourceUrl = matchingCurrent.source.startsWith('all_hsk_clean.csv')
        ? userSuppliedSourceUrl
        : matchingCurrent.source.includes('complete-hsk-vocabulary + CVDICT')
          ? 'https://github.com/drkameleon/complete-hsk-vocabulary'
          : matchingCurrent.sourceUrl;
      const sourceUrlChanged = matchingCurrent.sourceUrl !== expectedSourceUrl;
      if (!pinyinChanged && !viChanged && !enChanged && !bandChanged && !sourceUrlChanged) {
        unchanged += 1;
        continue;
      }
      replacements.set(matchingCurrent.id, {
        ...matchingCurrent,
        ...(pinyinChanged ? { pinyin: row.pinyin, pinyinNumeric: numeric } : {}),
        ...(viChanged ? { primaryMeaningVi: row.meaning_vi, meaningsVi } : {}),
        ...(enChanged ? { meaningsEn } : {}),
        ...(bandChanged ? { hskBand: targetBand } : {}),
        ...(sourceUrlChanged ? { sourceUrl: expectedSourceUrl } : {}),
        source: alignedSource(matchingCurrent.source),
        sourceVersion,
      });
      if (pinyinChanged) updated.pinyin += 1;
      if (viChanged) updated.meaningVi += 1;
      if (enChanged) updated.meaningEn += 1;
      if (bandChanged) updated.hskBand += 1;
      updated.records += 1;
      continue;
    }

    const candidates = currentByHanzi.get(row.hanzi) ?? [];
    if (candidates.length === 1) {
      // A source with exactly one reading may safely correct an outdated pinyin
      // spelling while preserving the existing stable ID and learner progress.
      const sourceReadingsForHanzi = sourceRows.filter((item) => item.hanzi === row.hanzi);
      if (sourceReadingsForHanzi.length === 1) {
        const currentWord = candidates[0];
        if (!currentWord) throw new Error(`CURRENT_READING_MISSING:${row.hanzi}`);
        touchedIds.add(currentWord.id);
        const targetBand = toBand(row.hsk_level);
        const meaningsVi = [row.meaning_vi];
        const meaningsEn = [row.meaning_en];
        const pinyinChanged = false;
        const viChanged = currentWord.primaryMeaningVi !== row.meaning_vi || !equivalent(currentWord.meaningsVi, meaningsVi);
        const enChanged = !equivalent(currentWord.meaningsEn, meaningsEn);
        const bandChanged = currentWord.hskBand !== targetBand;
        replacements.set(currentWord.id, {
          ...currentWord,
          ...(pinyinChanged ? { pinyin: row.pinyin, pinyinNumeric: numeric } : {}),
          ...(viChanged ? { primaryMeaningVi: row.meaning_vi, meaningsVi } : {}),
          ...(enChanged ? { meaningsEn } : {}),
          ...(bandChanged ? { hskBand: targetBand } : {}),
          source: alignedSource(currentWord.source),
          sourceVersion,
        });
        if (pinyinChanged) updated.pinyin += 1;
        if (viChanged) updated.meaningVi += 1;
        if (enChanged) updated.meaningEn += 1;
        if (bandChanged) updated.hskBand += 1;
        updated.records += 1;
        continue;
      }
    }

    const added = newVocabulary(row, sourceVersion);
    if (currentIds.has(added.id) || additions.some((word) => word.id === added.id)) {
      throw new Error(`ADDED_ID_COLLISION:${added.id}`);
    }
    additions.push(added);
    addedByBand[String(added.hskBand)] = (addedByBand[String(added.hskBand)] ?? 0) + 1;
  }

  const words = [...current.map((word) => replacements.get(word.id) ?? word), ...additions];
  const sourceKnownHanzi = new Set(sourceRows.map((row) => row.hanzi));
  const preservedExistingAmbiguousReadings = current
    .filter((word) => sourceKnownHanzi.has(word.simplified) && !touchedIds.has(word.id))
    .map((word) => ({ id: word.id, simplified: word.simplified, pinyinNumeric: word.pinyinNumeric }));
  const preservedExistingNotInSource = current.filter((word) => !sourceKnownHanzi.has(word.simplified)).length;

  return {
    words,
    report: {
      sourceRows: sourceRows.length,
      sourceDistribution: distribution(sourceRows, (row) => String(toBand(row.hsk_level))),
      resultingRows: words.length,
      resultingDistribution: distribution(words, (word) => String(word.hskBand)),
      matchedExisting: touchedIds.size,
      added: additions.length,
      unchanged,
      updated,
      addedByBand,
      preservedExistingNotInSource,
      preservedExistingAmbiguousReadings,
      sourceDuplicateReadings: sourceDuplicateReadings(sourceRows),
    },
  };
}

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const source = readArgument('--source');
  if (!source) throw new Error('USAGE: tsx scripts/merge-hsk-clean.ts --source <all_hsk_clean.csv> [--base <existing-vocabulary.json>] [--dry-run]');
  const output = resolve(readArgument('--output') ?? 'src/data/hsk-vocabulary.json');
  const base = resolve(readArgument('--base') ?? output);
  const reportPath = resolve(readArgument('--report') ?? 'docs/HSK_CSV_MERGE_REPORT.json');
  const dryRun = process.argv.includes('--dry-run');
  const [csvText, currentText] = await Promise.all([readFile(resolve(source), 'utf8'), readFile(base, 'utf8')]);
  const sourceHash = createHash('sha256').update(csvText).digest('hex');
  const sourceVersion = `all_hsk_clean.csv sha256:${sourceHash.slice(0, 16)}`;
  const { words, report } = mergeCleanHskVocabulary(
    JSON.parse(currentText) as VocabularyRecord[],
    parseCleanHskCsv(csvText),
    sourceVersion,
  );
  const outputPayload = `${JSON.stringify(words)}\n`;
  const fullReport = { source: { sha256: sourceHash, version: sourceVersion }, ...report };
  if (!dryRun) {
    await writeFile(output, outputPayload, 'utf8');
    await writeFile(reportPath, `${JSON.stringify(fullReport, null, 2)}\n`, 'utf8');
  }
  process.stdout.write(`${JSON.stringify(fullReport, null, 2)}\n`);
}

if (process.argv[1]?.endsWith('merge-hsk-clean.ts')) void main();
