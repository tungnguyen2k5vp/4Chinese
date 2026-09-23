import type { SQLiteDatabase } from 'expo-sqlite';

import generatedVocabulary from '@/data/hsk-vocabulary.json';
import { starterVocabulary } from '@/data/starter-vocabulary';
import { supplementalVocabulary } from '@/data/supplemental-vocabulary';
import {
  migrationSql,
  migrationV2Sql,
  migrationV3Sql,
  migrationV4Sql,
  migrationV5Sql,
  latestIndexSql,
  DATABASE_VERSION,
} from '@/db/schema';
import { illustrationForVocabulary, isDeviceSelectedImage } from '@/services/media/illustration';
import { normalizeSearch } from '@/services/search/normalize';
import {
  applyVocabularyQualityOverride,
  cleanLearnerMeanings,
  vocabularySearchAliases,
} from '@/services/vocabulary/quality';
import type { Vocabulary } from '@/types/models';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  const current = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = current?.user_version ?? 0;
  await db.execAsync(migrationSql);
  const progressColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(user_vocabulary_progress)');
  if (currentVersion < 2 && !progressColumns.some((column) => column.name === 'memory_level')) {
    await db.execAsync(migrationV2Sql);
  }
  const deckColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(personal_deck)');
  if (currentVersion < 3 && !deckColumns.some((column) => column.name === 'deleted_at')) {
    await db.execAsync(migrationV3Sql);
  }
  const refreshedProgressColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(user_vocabulary_progress)');
  const hasStatus = refreshedProgressColumns.some((column) => column.name === 'status');
  const hasStudied = refreshedProgressColumns.some((column) => column.name === 'studied');
  if (currentVersion < 4 || !hasStatus || !hasStudied) {
    // Run the two ALTER statements independently so a partially migrated
    // database can be repaired without failing on a duplicate column.
    if (!hasStatus) await db.execAsync("ALTER TABLE user_vocabulary_progress ADD COLUMN status TEXT NOT NULL DEFAULT 'NEW';");
    if (!hasStudied) await db.execAsync("ALTER TABLE user_vocabulary_progress ADD COLUMN studied INTEGER NOT NULL DEFAULT 0;");
    const backfillSql = migrationV4Sql.slice(migrationV4Sql.indexOf('UPDATE'));
    await db.execAsync(backfillSql);
  }
  const reviewColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(review_log)');
  const reviewColumnNames = new Set(reviewColumns.map((column) => column.name));
  const missingReviewColumns = ['typed_pinyin', 'selected_hanzi', 'candidate_rank']
    .filter((column) => !reviewColumnNames.has(column));
  if (missingReviewColumns.length > 0) {
    // Keep each ALTER independent so a partially upgraded database can be
    // repaired safely when the app is opened again.
    if (currentVersion < 5 && missingReviewColumns.length === 3) {
      await db.execAsync(migrationV5Sql);
    } else {
      if (!reviewColumnNames.has('typed_pinyin')) await db.execAsync('ALTER TABLE review_log ADD COLUMN typed_pinyin TEXT;');
      if (!reviewColumnNames.has('selected_hanzi')) await db.execAsync('ALTER TABLE review_log ADD COLUMN selected_hanzi TEXT;');
      if (!reviewColumnNames.has('candidate_rank')) await db.execAsync('ALTER TABLE review_log ADD COLUMN candidate_rank INTEGER;');
    }
  }
  await db.execAsync(latestIndexSql);
  const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM vocabulary');
  const seededNow = (count?.count ?? 0) === 0;
  if (seededNow) await seedDatabase(db);
  if (currentVersion < 6 && !seededNow) await refreshGeneratedTranslations(db);
  await seedSupplementalVocabulary(db);
  if (currentVersion < 7) await repairAutomaticIllustrations(db);
  // A freshly seeded database already uses the canonical data above; the
  // migration is only needed for an existing install with an older index.
  if (currentVersion < DATABASE_VERSION && !seededNow) await refreshVocabularyQuality(db);
  if (currentVersion < DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
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
export function getOfflineVocabulary(): Vocabulary[] {
  const words = [...getSeedVocabulary(), ...supplementalVocabulary];
  return Array.from(new Map(words.map((word) => [word.id, word])).values());
}

function getSeedVocabulary(): Vocabulary[] {
  const curated = new Map(starterVocabulary.map((word) => [word.simplified, word]));
  const generated = generatedVocabulary as typeof starterVocabulary;
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
