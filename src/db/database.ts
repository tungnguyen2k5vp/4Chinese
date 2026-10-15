import type { SQLiteDatabase } from 'expo-sqlite';

import generatedVocabulary from '@/data/hsk-vocabulary.json';
import hsk30Bundle from '@/data/hsk30-2025-11.json';
import { starterVocabulary } from '@/data/starter-vocabulary';
import { supplementalVocabulary } from '@/data/supplemental-vocabulary';
import { seedGrammarContent } from '@/db/grammar';
import { importHsk30Bundle } from '@/db/hsk30';
import { seedLearningPath } from '@/db/learning-path';
import { stageLexicalV5Drafts } from '@/db/lexical-knowledge';
import { migrateDatabaseSchema } from '@/db/migrations';
import { DATABASE_VERSION } from '@/db/schema';
import { seedStories } from '@/db/stories';
import { installBundledContentMetadata } from '@/services/content/content-version';
import type { Hsk30Bundle } from '@/services/hsk/hsk30-source';
import { illustrationForVocabulary, isDeviceSelectedImage } from '@/services/media/illustration';
import { normalizeSearch } from '@/services/search/normalize';
import {
  applyVocabularyQualityOverride,
  cleanLearnerMeanings,
  vocabularySearchAliases,
} from '@/services/vocabulary/quality';
import type { HskBand, Vocabulary } from '@/types/models';

export async function initializeDatabase(db: SQLiteDatabase, options: { preserveVocabularyContent?: boolean } = {}): Promise<void> {
  // HSK classification upgrades must not replay historical dictionary rewrites.
  // Existing content is preserved by default, including on older installations.
  const mayRefreshVocabulary = options.preserveVocabularyContent === false;
  const currentVersion = await migrateDatabaseSchema(db);
  const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM vocabulary');
  const seededNow = (count?.count ?? 0) === 0;
  if (seededNow) await seedDatabase(db);
  if (mayRefreshVocabulary && currentVersion < 6 && !seededNow) await refreshGeneratedTranslations(db);
  await seedSupplementalVocabulary(db);
  if (mayRefreshVocabulary && currentVersion < 7) await repairAutomaticIllustrations(db);
  if (currentVersion < 22 && !seededNow && typeof document === 'undefined') await rebuildVocabularySearchFts(db);
  // A freshly seeded database already uses the canonical data above; the
  // migration is only needed for an existing install with an older index.
  // Dictionary rewrite belongs to the v9 data migration, not every later
  // schema release. Repeating it on v10+ adds seconds of startup work and can
  // overwrite learner-visible base-word corrections unnecessarily.
  if (mayRefreshVocabulary && currentVersion < 9 && !seededNow) await refreshVocabularyQuality(db);
  if (mayRefreshVocabulary && currentVersion >= 9 && currentVersion < 30 && !seededNow) await refreshVocabularyQualityPatch(db);
  if (currentVersion < 11 || seededNow) await rebuildVocabularyCharacterIndex(db);
  if (currentVersion < 34) await seedGrammarContent(db, getOfflineVocabulary());
  if (currentVersion < 34) await seedLearningPath(db);
  // Story content is additive and checked by stable IDs, so existing installs
  // receive new bundled stories without rewriting learner progress or content.
  await seedStories(db);
  if (currentVersion < 38) {
    await seedGrammarContent(db, getOfflineVocabulary(), { includePendingDrafts: true });
  }
  // v39 retries only bounded lexical staging after reading corrections; no dictionary/SRS rewrite.
  if (currentVersion < 39) await stageLexicalV5Drafts(db);
  // v40 corrects seven incorrectly selected canonical readings. Only bundled
  // dictionary rows are refreshed; deck copies, notes and SRS progress remain
  // user-owned and are deliberately not touched.
  if (mayRefreshVocabulary && currentVersion < 40 && !seededNow) await refreshVocabularyQualityPatchV40(db);
  if (currentVersion < 40) await stageLexicalV5Drafts(db);
  // v43 aligns bundled vocabulary with the user-supplied all_hsk_clean.csv.
  // It keeps stable IDs and updates only immutable base rows; progress, deck
  // copies, notes, favorites and custom words are never rewritten.
  if (mayRefreshVocabulary && currentVersion < 43 && !seededNow) {
    await refreshBundledHskCleanV43(db);
    await rebuildVocabularyCharacterIndex(db);
    if (typeof document === 'undefined') await rebuildVocabularySearchFts(db);
  }
  await installBundledContentMetadata(db);
  // v45 imports only source records and version-scoped links. All vocabulary
  // columns, examples, media, internal IDs and learner tables stay unchanged.
  if (currentVersion < 45) await importHsk30Bundle(db, hsk30Bundle as unknown as Hsk30Bundle);
  if (currentVersion < DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}

async function rebuildVocabularyCharacterIndex(db: SQLiteDatabase): Promise<void> {
  const words = await db.getAllAsync<{ id: string; simplified: string; traditional: string }>(
    'SELECT id,simplified,traditional FROM vocabulary',
  );
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM vocabulary_character_index');
    const statement = await db.prepareAsync(
      'INSERT OR IGNORE INTO vocabulary_character_index(character,vocabulary_id) VALUES(?,?)',
    );
    try {
      for (const word of words) {
        const characters = new Set([...word.simplified, ...word.traditional]
          .filter((character) => /[\u3400-\u9fff]/u.test(character)));
        for (const character of characters) await statement.executeAsync(character, word.id);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

async function rebuildVocabularySearchFts(db: SQLiteDatabase): Promise<void> {
  // This is a single SQLite-side copy. No 11k-row bridge transfer or JS
  // object preload occurs during an upgrade from v21.
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM vocabulary_search_fts;');
    await db.execAsync(`INSERT INTO vocabulary_search_fts(rowid,vocabulary_id,search_text,pinyin_compact)
      SELECT rowid,id,search_text,
        LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(pinyin_numeric,'1',''),'2',''),'3',''),'4',''),'5',''),' ',''),'ü','v'))
      FROM vocabulary`);
  });
}

/**
 * Version 7 removes legacy automatic photos that had no exact vocabulary
 * match. Device-picked photos are left untouched. This also replaces an old
 * wrong image (for example a glass for 留学生) with the curated one when one
 * exists.
 */
async function repairAutomaticIllustrations(db: SQLiteDatabase): Promise<void> {
  const words = await db.getAllAsync<{
    id: string;
    simplified: string;
    traditional: string;
    image_uri: string | null;
    image_source: string | null;
  }>(`SELECT id,simplified,traditional,image_uri,image_source
      FROM vocabulary WHERE is_custom=1`);
  if (!words.length) return;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(`UPDATE vocabulary SET
      image_uri=$imageUri,image_source=$imageSource,image_license=$imageLicense,
      image_attribution=$imageAttribution,visual_type=$visualType,updated_at=$updatedAt
      WHERE id=$id`);
    try {
      for (const word of words) {
        if (word.image_source === 'Người dùng chọn' || isDeviceSelectedImage(word.image_uri)) continue;
        const illustration = illustrationForVocabulary(word);
        await statement.executeAsync({
          $id: word.id,
          $imageUri: illustration?.uri ?? null,
          $imageSource: illustration?.source ?? null,
          $imageLicense: illustration?.license ?? null,
          $imageAttribution: illustration?.attribution ?? null,
          $visualType: illustration ? 'image' : 'none',
          $updatedAt: now,
        });
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

async function seedSupplementalVocabulary(db: SQLiteDatabase): Promise<void> {
  await insertVocabulary(db, supplementalVocabulary);
}

async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  await insertVocabulary(db, getSeedVocabulary());
}

async function insertVocabulary(
  db: SQLiteDatabase,
  vocabulary: typeof starterVocabulary,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const wordStatement = await db.prepareAsync(`INSERT OR IGNORE INTO vocabulary (
      id, simplified, traditional, pinyin, pinyin_numeric, primary_meaning_vi,
      meanings_vi, meanings_en, pos, hsk_band, frequency_rank, classifiers,
      radical, stroke_count, visual_type, image_uri, image_source, image_license,
      image_attribution, audio_uri, source, source_version, source_url,
      translation_status, search_text
    ) VALUES ($id,$simplified,$traditional,$pinyin,$pinyinNumeric,$meaning,$meaningsVi,
      $meaningsEn,$pos,$hsk,$frequency,$classifiers,$radical,$strokes,$visualType,
      $imageUri,$imageSource,$imageLicense,$imageAttribution,$audioUri,$source,
      $sourceVersion,$sourceUrl,$translationStatus,$searchText)`);
    const exampleStatement = await db.prepareAsync(`INSERT OR IGNORE INTO example_sentence
      (id, vocabulary_id, chinese, pinyin, vietnamese, english, difficulty)
      VALUES ($id,$vocabularyId,$chinese,$pinyin,$vietnamese,$english,$difficulty)`);
    try {
      for (const word of vocabulary) {
        await wordStatement.executeAsync({
          $id: word.id, $simplified: word.simplified, $traditional: word.traditional,
          $pinyin: word.pinyin, $pinyinNumeric: word.pinyinNumeric,
          $meaning: word.primaryMeaningVi, $meaningsVi: JSON.stringify(word.meaningsVi),
          $meaningsEn: JSON.stringify(word.meaningsEn), $pos: JSON.stringify(word.pos),
          $hsk: String(word.hskBand), $frequency: word.frequencyRank,
          $classifiers: JSON.stringify(word.classifiers), $radical: word.radical,
          $strokes: word.strokeCount, $visualType: word.visualType, $imageUri: word.imageUri,
          $imageSource: word.imageSource, $imageLicense: word.imageLicense,
          $imageAttribution: word.imageAttribution, $audioUri: word.audioUri,
          $source: word.source, $sourceVersion: word.sourceVersion, $sourceUrl: word.sourceUrl,
          $translationStatus: word.translationStatus,
        $searchText: vocabularySearchText(word),
        });
        for (const example of word.examples) {
          await exampleStatement.executeAsync({
            $id: example.id, $vocabularyId: word.id, $chinese: example.chinese,
            $pinyin: example.pinyin, $vietnamese: example.vietnamese,
            $english: example.english ?? null, $difficulty: example.difficulty,
          });
        }
      }
    } finally {
      await wordStatement.finalizeAsync();
      await exampleStatement.finalizeAsync();
    }
  });
}

/**
 * Returns the canonical dictionary already bundled inside the application.
 *
 * Bulk import uses this instead of round-tripping every base row through the
 * SQLite bridge. The database remains the source of truth for progress and
 * user-created words; this function is only the immutable offline dictionary.
 */
export function getOfflineVocabulary(bands?: HskBand[]): Vocabulary[] {
  const allowedBands = bands?.length ? new Set(bands) : null;
  const words = [
    ...getSeedVocabulary(bands),
    ...supplementalVocabulary.filter((word) => !allowedBands || allowedBands.has(word.hskBand)),
  ];
  return Array.from(new Map(words.map((word) => [word.id, word])).values());
}

function getSeedVocabulary(bands?: HskBand[]): Vocabulary[] {
  const allowedBands = bands?.length ? new Set(bands) : null;
  const curated = new Map(
    starterVocabulary
      .filter((word) => !allowedBands || allowedBands.has(word.hskBand))
      .map((word) => [word.simplified, word]),
  );
  const generated = (generatedVocabulary as typeof starterVocabulary).filter(
    (word) => !allowedBands || allowedBands.has(word.hskBand),
  );
  const merged = generated.map((rawWord) => {
    const word = applyVocabularyQualityOverride(rawWord);
    const correction = curated.get(word.simplified);
    if (!correction) return word;
    curated.delete(word.simplified);
    return { ...word, primaryMeaningVi: correction.primaryMeaningVi, meaningsVi: correction.meaningsVi,
      translationStatus: correction.translationStatus, strokeCount: correction.strokeCount,
      examples: correction.examples, source: `${word.source}; curated Vietnamese starter correction` };
  });
  return [...merged, ...curated.values()].map(applyVocabularyQualityOverride);
}

function vocabularySearchText(word: Pick<
  typeof starterVocabulary[number],
  'simplified' | 'traditional' | 'pinyin' | 'pinyinNumeric' | 'meaningsVi' | 'meaningsEn'
>): string {
  const meaningsVi = cleanLearnerMeanings(word.meaningsVi);
  return normalizeSearch([
    word.simplified,
    word.traditional,
    word.pinyin,
    word.pinyinNumeric,
    ...meaningsVi,
    ...word.meaningsEn,
    ...vocabularySearchAliases(word.simplified),
  ].join(' '));
}

/**
 * Version 6 fixes dictionary entries where a surname/variant form was chosen
 * instead of the common HSK sense. It also refreshes previously copied deck
 * words while preserving every user-edited Vietnamese meaning and SRS row.
 */
async function refreshGeneratedTranslations(db: SQLiteDatabase): Promise<void> {
  const vocabulary = getSeedVocabulary();
  const canonical = new Map(
    vocabulary.map((word) => [
      `${word.simplified}|${normalizeSearch(word.pinyinNumeric || word.pinyin)}`,
      word,
    ]),
  );
  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(`UPDATE vocabulary SET
      traditional=$traditional,pinyin=$pinyin,pinyin_numeric=$pinyinNumeric,
      meanings_en=$meaningsEn,source_version=$sourceVersion,search_text=$searchText
      WHERE id=$id AND is_custom=0`);
    try {
      for (const word of vocabulary) {
        await statement.executeAsync({
          $id: word.id,
          $traditional: word.traditional,
          $pinyin: word.pinyin,
          $pinyinNumeric: word.pinyinNumeric,
          $meaningsEn: JSON.stringify(word.meaningsEn),
          $sourceVersion: word.sourceVersion,
          $searchText: vocabularySearchText(word),
        });
      }
    } finally {
      await statement.finalizeAsync();
    }

    const copies = await db.getAllAsync<{
      id: string;
      simplified: string;
      traditional: string;
      pinyin: string;
      pinyin_numeric: string;
      meanings_vi: string;
    }>(`SELECT id,simplified,traditional,pinyin,pinyin_numeric,meanings_vi
      FROM vocabulary WHERE is_custom=1`);
    const copyStatement = await db.prepareAsync(
      'UPDATE vocabulary SET meanings_en=$meaningsEn,search_text=$searchText,updated_at=$updatedAt WHERE id=$id',
    );
    try {
      for (const copy of copies) {
        const word = canonical.get(`${copy.simplified}|${normalizeSearch(copy.pinyin_numeric || copy.pinyin)}`);
        if (!word) continue;
        const meaningsVi = JSON.parse(copy.meanings_vi) as string[];
        await copyStatement.executeAsync({
          $id: copy.id,
          $meaningsEn: JSON.stringify(word.meaningsEn),
          $searchText: normalizeSearch([
            copy.simplified,
            copy.traditional,
            copy.pinyin,
            copy.pinyin_numeric,
            ...meaningsVi,
            ...word.meaningsEn,
          ].join(' ')),
          $updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      await copyStatement.finalizeAsync();
    }
  });
}

/**
 * Version 9 refreshes the learner-facing dictionary fields and every search
 * index from the bundled canonical data. Older installs had correct source
 * data added after their SQLite file was first seeded, so new lookups such as
 * "BUỔI SÁNG" could not find 上午 until this migration ran.
 *
 * Base dictionary rows can be refreshed safely. For a user/deck copy we only
 * refresh shared metadata and its search index; the user's Vietnamese meaning
 * remains untouched.
 */
/**
 * Content-only v30 patch. Existing v9+ databases already have the full
 * dictionary; touching every row again makes startup noticeably slower.
 */
async function refreshVocabularyQualityPatch(db: SQLiteDatabase): Promise<void> {
  const words = getSeedVocabulary().filter((word) => word.simplified === '\u4e3a');
  if (!words.length) return;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(`UPDATE vocabulary SET
      traditional=$traditional,pinyin=$pinyin,pinyin_numeric=$pinyinNumeric,
      primary_meaning_vi=$primaryMeaningVi,meanings_vi=$meaningsVi,meanings_en=$meaningsEn,
      pos=$pos,translation_status=$translationStatus,source_version=$sourceVersion,
      search_text=$searchText,updated_at=$updatedAt
      WHERE id=$id AND is_custom=0`);
    try {
      for (const word of words) {
        await statement.executeAsync({
          $id: word.id,
          $traditional: word.traditional,
          $pinyin: word.pinyin,
          $pinyinNumeric: word.pinyinNumeric,
          $primaryMeaningVi: word.primaryMeaningVi,
          $meaningsVi: JSON.stringify(word.meaningsVi),
          $meaningsEn: JSON.stringify(word.meaningsEn),
          $pos: JSON.stringify(word.pos),
          $translationStatus: word.translationStatus,
          $sourceVersion: word.sourceVersion,
          $searchText: vocabularySearchText(word),
          $updatedAt: now,
        });
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}
/**
 * Version 40 fixes a small set of polyphonic entries whose upstream row had
 * selected an archaic or secondary pronunciation. The patch intentionally
 * updates only immutable bundled rows by stable ID, never a deck copy.
 */
async function refreshVocabularyQualityPatchV40(db: SQLiteDatabase): Promise<void> {
  const affectedIds = new Set([
    'hsk-248a6d71cde3', // 看
    'hsk-f5ac916e8404', // 听
    'hsk-fd9fc129006f', // 为
    'hsk-0201e7fce576', // 行
    'hsk-8fb39c44dd88', // 得
    'hsk-61d436b89a09', // 长
    'hsk-ffcac51bafd8', // 乐
  ]);
  const words = getSeedVocabulary().filter((word) => affectedIds.has(word.id));
  if (words.length !== affectedIds.size) throw new Error('VOCABULARY_V40_PATCH_INCOMPLETE');
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(`UPDATE vocabulary SET
      traditional=$traditional,pinyin=$pinyin,pinyin_numeric=$pinyinNumeric,
      primary_meaning_vi=$primaryMeaningVi,meanings_vi=$meaningsVi,meanings_en=$meaningsEn,
      pos=$pos,translation_status=$translationStatus,source_version=$sourceVersion,
      search_text=$searchText,updated_at=$updatedAt
      WHERE id=$id AND is_custom=0`);
    try {
      for (const word of words) {
        await statement.executeAsync({
          $id: word.id,
          $traditional: word.traditional,
          $pinyin: word.pinyin,
          $pinyinNumeric: word.pinyinNumeric,
          $primaryMeaningVi: word.primaryMeaningVi,
          $meaningsVi: JSON.stringify(word.meaningsVi),
          $meaningsEn: JSON.stringify(word.meaningsEn),
          $pos: JSON.stringify(word.pos),
          $translationStatus: word.translationStatus,
          $sourceVersion: word.sourceVersion,
          $searchText: vocabularySearchText(word),
          $updatedAt: now,
        });
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}
/**
 * Content-only v43 upgrade. The CSV merger retains each existing generated
 * ID, so SRS rows keep pointing at the same vocabulary. The INSERT first
 * receives newly added HSK words, then this update synchronizes canonical
 * fields on base rows only. User-created/deck-copy rows (`is_custom=1`) are
 * intentionally excluded.
 */
function sqliteLiteral(value: string): string {
  return "'" + value.replace(/'/gu, "''") + "'";
}

async function refreshBundledHskCleanV43(db: SQLiteDatabase): Promise<void> {
  const vocabulary = getSeedVocabulary();
  const existingIds = new Set(
    (await db.getAllAsync<{ id: string }>('SELECT id FROM vocabulary WHERE is_custom=0')).map((row) => row.id),
  );
  const missingVocabulary = vocabulary.filter((word) => !existingIds.has(word.id));
  if (missingVocabulary.length) await insertVocabulary(db, missingVocabulary);

  const now = new Date().toISOString();
  const patchColumns = [
    'id', 'traditional', 'pinyin', 'pinyin_numeric', 'primary_meaning_vi', 'meanings_vi',
    'meanings_en', 'pos', 'hsk_band', 'source', 'source_version', 'source_url',
    'translation_status', 'search_text', 'updated_at',
  ];
  await db.withTransactionAsync(async () => {
    await db.execAsync('DROP TABLE IF EXISTS hsk_clean_v43_patch;');
    await db.execAsync([
      'CREATE TEMP TABLE hsk_clean_v43_patch (',
      'id TEXT PRIMARY KEY, traditional TEXT NOT NULL, pinyin TEXT NOT NULL,',
      'pinyin_numeric TEXT NOT NULL, primary_meaning_vi TEXT NOT NULL,',
      'meanings_vi TEXT NOT NULL, meanings_en TEXT NOT NULL, pos TEXT NOT NULL,',
      'hsk_band TEXT NOT NULL, source TEXT NOT NULL, source_version TEXT NOT NULL,',
      'source_url TEXT NOT NULL, translation_status TEXT NOT NULL,',
      'search_text TEXT NOT NULL, updated_at TEXT NOT NULL);',
    ].join(' '));
    const columns = patchColumns.join(',');
    for (let start = 0; start < vocabulary.length; start += 200) {
      const batch = vocabulary.slice(start, start + 200);
      const values = batch.map((word) => '(' + [
        word.id, word.traditional, word.pinyin, word.pinyinNumeric, word.primaryMeaningVi,
        JSON.stringify(word.meaningsVi), JSON.stringify(word.meaningsEn), JSON.stringify(word.pos),
        String(word.hskBand), word.source, word.sourceVersion, word.sourceUrl,
        word.translationStatus, vocabularySearchText(word), now,
      ].map(sqliteLiteral).join(',') + ')');
      await db.execAsync('INSERT INTO hsk_clean_v43_patch (' + columns + ') VALUES ' + values.join(',') + ';');
    }
    const updateSql = [
      'UPDATE vocabulary SET',
      'traditional=(SELECT patch.traditional FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'pinyin=(SELECT patch.pinyin FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'pinyin_numeric=(SELECT patch.pinyin_numeric FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'primary_meaning_vi=(SELECT patch.primary_meaning_vi FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'meanings_vi=(SELECT patch.meanings_vi FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'meanings_en=(SELECT patch.meanings_en FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'pos=(SELECT patch.pos FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'hsk_band=(SELECT patch.hsk_band FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'source=(SELECT patch.source FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'source_version=(SELECT patch.source_version FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'source_url=(SELECT patch.source_url FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'translation_status=(SELECT patch.translation_status FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'search_text=(SELECT patch.search_text FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id),',
      'updated_at=(SELECT patch.updated_at FROM hsk_clean_v43_patch patch WHERE patch.id=vocabulary.id)',
      'WHERE vocabulary.is_custom=0 AND vocabulary.id IN (SELECT id FROM hsk_clean_v43_patch);',
    ].join(' ');
    await db.execAsync(updateSql + ' DROP TABLE hsk_clean_v43_patch;');
  });
}
async function refreshVocabularyQuality(db: SQLiteDatabase): Promise<void> {
  const vocabulary = getSeedVocabulary();
  // The generated source can gain new HSK entries between app releases.
  // Insert missing base rows before refreshing their meanings and indexes so
  // an existing install receives the expanded offline dictionary as well.
  await insertVocabulary(db, vocabulary);
  const canonicalByHanzi = new Map(vocabulary.map((word) => [word.simplified, word]));
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    const baseStatement = await db.prepareAsync(`UPDATE vocabulary SET
      traditional=$traditional,pinyin=$pinyin,pinyin_numeric=$pinyinNumeric,
      primary_meaning_vi=$primaryMeaningVi,meanings_vi=$meaningsVi,meanings_en=$meaningsEn,
      pos=$pos,translation_status=$translationStatus,source_version=$sourceVersion,
      search_text=$searchText,updated_at=$updatedAt WHERE id=$id AND is_custom=0`);
    const customStatement = await db.prepareAsync(`UPDATE vocabulary SET
      meanings_en=$meaningsEn,search_text=$searchText,updated_at=$updatedAt
      WHERE id=$id AND is_custom=1`);
    try {
      for (const word of vocabulary) {
        await baseStatement.executeAsync({
          $id: word.id,
          $traditional: word.traditional,
          $pinyin: word.pinyin,
          $pinyinNumeric: word.pinyinNumeric,
          $primaryMeaningVi: word.primaryMeaningVi,
          $meaningsVi: JSON.stringify(word.meaningsVi),
          $meaningsEn: JSON.stringify(word.meaningsEn),
          $pos: JSON.stringify(word.pos),
          $translationStatus: word.translationStatus,
          $sourceVersion: word.sourceVersion,
          $searchText: vocabularySearchText(word),
          $updatedAt: now,
        });
      }
      const copies = await db.getAllAsync<{
        id: string; simplified: string; traditional: string; pinyin: string;
        pinyin_numeric: string; meanings_vi: string; meanings_en: string;
      }>('SELECT id,simplified,traditional,pinyin,pinyin_numeric,meanings_vi,meanings_en FROM vocabulary WHERE is_custom=1');
      for (const copy of copies) {
        const canonical = canonicalByHanzi.get(copy.simplified);
        const meaningsVi = JSON.parse(copy.meanings_vi) as string[];
        const meaningsEn = canonical?.meaningsEn ?? JSON.parse(copy.meanings_en) as string[];
        await customStatement.executeAsync({
          $id: copy.id,
          $meaningsEn: JSON.stringify(meaningsEn),
          $searchText: vocabularySearchText({
            simplified: copy.simplified,
            traditional: copy.traditional,
            pinyin: copy.pinyin,
            pinyinNumeric: copy.pinyin_numeric,
            meaningsVi,
            meaningsEn,
          }),
          $updatedAt: now,
        });
      }
    } finally {
      await baseStatement.finalizeAsync();
      await customStatement.finalizeAsync();
    }
  });
}
