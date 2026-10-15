import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

import { seedAchievements } from './gamification';
import { validateSpeakingAttemptBackupRecord } from './speaking-attempts';
import { validateContextRecord, validatePersonalContextMemoryRecord } from './vocabulary-context';
import { validateWordContextRecord } from './word-contexts';

import { validateConfusableAttempt } from '@/data/confusable-words';
import { getOfflineVocabulary } from "@/db/database";
import { DATABASE_VERSION } from "@/db/schema";
import {
  type BackupRecord,
  type LocalBackup,
  type LocalBackupData,
  createLocalBackup,
  validateRoleplayBackupData,
} from "@/services/backup/format";
import { validateExamBackupRecord } from '@/services/exam/session';
import { validateWrittenBackupRecord } from '@/services/exam/written-practice';

const vocabularyColumns = [
  "id", "simplified", "traditional", "pinyin", "pinyin_numeric", "primary_meaning_vi",
  "meanings_vi", "meanings_en", "pos", "hsk_band", "frequency_rank", "classifiers",
  "radical", "stroke_count", "visual_type", "image_uri", "image_source", "image_license",
  "image_attribution", "audio_uri", "source", "source_version", "source_url",
  "translation_status", "search_text", "is_custom", "deck_id", "created_at", "updated_at",
] as const;
const exampleColumns = ["id", "vocabulary_id", "chinese", "pinyin", "vietnamese", "english", "difficulty"] as const;
const progressColumns = [
  "vocabulary_id", "state", "status", "studied", "due", "stability", "difficulty",
  "elapsed_days", "scheduled_days", "learning_steps", "reps", "lapses", "last_review",
  "mastery_level", "is_known", "is_favorite", "is_suspended", "notes", "memory_level",
  "deep_memory_stage", "learned_at", "next_review_at", "review_count", "correct_count",
  "wrong_count", "lapse_count", "consecutive_correct", "consecutive_wrong", "hint_used_count",
  "average_response_time_ms", "last_response_time_ms", "created_at", "updated_at",
] as const;
const reviewColumns = [
  "id", "vocabulary_id", "reviewed_at", "rating", "previous_state", "new_state",
  "response_time_ms", "mode", "level_before", "level_after", "deep_stage_before",
  "deep_stage_after", "correct", "hint_used", "next_review_at", "typed_pinyin",
  "selected_hanzi", "candidate_rank", "exercise_type",
] as const;
const deckColumns = ["id", "name", "color", "created_at", "updated_at", "deleted_at"] as const;
const settingColumns = ["id", "value", "updated_at"] as const;
const examAttemptColumns = ['id','profile_id','level','status','snapshot_json','started_at_ms','submitted_at_ms','revision','updated_at'] as const;
const dailyColumns = ["date", "reviewed", "correct", "new_words", "study_seconds"] as const;
const overrideColumns = ["id", "pinyin", "pinyin_numeric", "primary_meaning_vi", "meanings_vi", "meanings_en",
  "pos", "image_uri", "visual_type", "translation_status", "updated_at", "search_text"] as const;
const imageAssetColumns = ["id", "vocabulary_id", "local_uri", "cloud_url", "mime_type", "file_name", "file_size",
  "checksum", "created_at", "updated_at"] as const;
const lessonProgressColumns = ["lesson_id", "status", "started_at", "completed_at", "updated_at"] as const;
const lessonActivityProgressColumns = ["activity_id", "completed_at"] as const;
const grammarProgressColumns = ["grammar_id", "attempts", "correct", "last_practiced_at", "updated_at"] as const;
const readingDocumentColumns = ["id", "title", "content", "created_at", "updated_at", "deleted_at"] as const;
const readingProgressColumns = ["document_id", "last_token_index", "coverage_percent", "last_read_at"] as const;
const readingVocabularyColumns = ["document_id", "vocabulary_id", "occurrences"] as const;
const readingDocumentChunkColumns = ["document_id", "chunk_index", "content", "char_start", "char_end"] as const;
const storyProgressColumns = ["story_id", "completed_at", "best_score", "attempts", "updated_at"] as const;
const mistakeColumns = ['id', 'vocabulary_id', 'sentence_id', 'grammar_id', 'skill_type', 'exercise_type',
  'wrong_count', 'correct_streak', 'last_wrong_at', 'last_correct_at', 'resolved', 'metadata', 'updated_at'] as const;
const skillMasteryColumns = ['vocabulary_id', 'meaning_score', 'recognition_score', 'pinyin_score',
  'listening_score', 'writing_score', 'speaking_score', 'updated_at'] as const;
const speakingColumns = ['id', 'kind', 'vocabulary_id', 'sentence_id', 'correct', 'created_at'] as const;
const xpColumns = ['id', 'activity', 'entity_id', 'points', 'local_date', 'created_at'] as const;
const achievementColumns = ['achievement_id', 'unlocked_at'] as const;
const goalColumns = ['id', 'weekly_minutes', 'updated_at'] as const;
const grammarAttemptColumns = ['id', 'grammar_id', 'exercise_type', 'correct', 'created_at'] as const;
const personalContextColumns = ['vocabulary_id','source_type','source_id','location','sentence','sense_id','created_at','updated_at'] as const;
const wordContextColumns = ['id','vocabulary_id','source_type','source_id','source_title','sentence_text','pinyin','translation_vi','position_metadata','created_at'] as const;
const personalMemoryColumns = ['id','vocabulary_id','source_type','source_id','source_title','sentence_text','pinyin','translation_vi','sense_id','context_locator','user_selected','created_at','updated_at'] as const;
const practiceAttemptDailyColumns = ['mistake_id','skill_type','exercise_type','utc_day','attempt_count','error_count'] as const;
const timedSpeakingColumns = ['id','prompt_id','snapshot_json','recorded_at','duration_ms','self_review','checklist_json','transcript_opt_in','transcript','audio_retention'] as const;
const roleplayHistoryColumns = ['id','scene_id','level','saved_at','attempts','completed_goals','total_goals','used_words_json','transcript_opt_in','transcript_summary'] as const;
const roleplayLimitColumns = ['id','daily_limit','session_limit'] as const;

function backupValue(value: unknown): SQLiteBindValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  throw new Error("INVALID_BACKUP_VALUE");
}

async function readRows(db: SQLiteDatabase, sql: string): Promise<BackupRecord[]> {
  return db.getAllAsync<BackupRecord>(sql);
}

async function insertRows(
  db: SQLiteDatabase,
  table: string,
  columns: readonly string[],
  rows: BackupRecord[],
): Promise<void> {
  if (rows.length === 0) return;
  const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`;
  const statement = await db.prepareAsync(sql);
  try {
    for (const row of rows) {
      await statement.executeAsync(columns.map((column) => backupValue(row[column])));
    }
  } finally {
    await statement.finalizeAsync();
  }
}

async function rebuildCustomCharacterIndex(db: SQLiteDatabase, words: BackupRecord[]): Promise<void> {
  const statement = await db.prepareAsync(
    "INSERT OR IGNORE INTO vocabulary_character_index(character,vocabulary_id) VALUES(?,?)",
  );
  try {
    for (const word of words) {
      const id = word.id;
      const simplified = word.simplified;
      const traditional = word.traditional;
      if (typeof id !== "string" || typeof simplified !== "string" || typeof traditional !== "string") {
        throw new Error("INVALID_BACKUP_VALUE");
      }
      const characters = new Set([...simplified, ...traditional].filter((character) => /[\u3400-\u9fff]/u.test(character)));
      for (const character of characters) await statement.executeAsync(character, id);
    }
  } finally {
    await statement.finalizeAsync();
  }
}

export async function exportLocalBackup(db: SQLiteDatabase, appVersion: string): Promise<LocalBackup> {
  let snapshot: LocalBackup | undefined;
  await db.withTransactionAsync(async () => { snapshot = await readBackupSnapshot(db, appVersion); });
  if (!snapshot) throw new Error('BACKUP_SNAPSHOT_FAILED');
  return snapshot;
}

async function readBackupSnapshot(db: SQLiteDatabase, appVersion: string): Promise<LocalBackup> {
  const [userSettings, personalDecks, customVocabulary, exampleSentences, vocabularyProgress, reviewLogs, dailyStats, baseRows, imageAssets, lessonProgress, lessonActivityProgress, grammarProgress, readingDocuments, readingProgress, readingVocabulary, readingDocumentChunks] = await Promise.all([
    readRows(db, "SELECT id,value,updated_at FROM user_settings"),
    readRows(db, "SELECT id,name,color,created_at,updated_at,deleted_at FROM personal_deck"),
    readRows(db, `SELECT ${vocabularyColumns.join(",")} FROM vocabulary WHERE is_custom=1`),
    readRows(db, `SELECT e.${exampleColumns.join(",e.")} FROM example_sentence e INNER JOIN vocabulary v ON v.id=e.vocabulary_id WHERE v.is_custom=1`),
    readRows(db, `SELECT ${progressColumns.join(",")} FROM user_vocabulary_progress`),
    readRows(db, `SELECT ${reviewColumns.join(",")} FROM review_log`),
    readRows(db, "SELECT date,reviewed,correct,new_words,study_seconds FROM daily_stats"),
    readRows(db, `SELECT ${overrideColumns.join(",")} FROM vocabulary WHERE is_custom=0`),
    readRows(db, `SELECT ${imageAssetColumns.join(',')} FROM image_assets`),
    readRows(db, `SELECT ${lessonProgressColumns.join(',')} FROM lesson_progress`),
    readRows(db, `SELECT ${lessonActivityProgressColumns.join(',')} FROM lesson_activity_progress`),
    readRows(db, `SELECT ${grammarProgressColumns.join(',')} FROM grammar_progress`),
    readRows(db, `SELECT ${readingDocumentColumns.join(',')} FROM reading_documents`),
    readRows(db, `SELECT ${readingProgressColumns.join(',')} FROM reading_progress`),
    readRows(db, `SELECT ${readingVocabularyColumns.join(',')} FROM reading_vocabulary`),
    readRows(db, `SELECT ${readingDocumentChunkColumns.join(',')} FROM reading_document_chunks ORDER BY document_id,chunk_index`),
  ]);
  const canonical = new Map(getOfflineVocabulary().map((word) => [word.id, word]));
  const baseVocabularyOverrides = baseRows.filter((row) => {
    const standard = canonical.get(String(row.id));
    if (!standard) return false;
    return row.pinyin !== standard.pinyin || row.pinyin_numeric !== standard.pinyinNumeric ||
      row.primary_meaning_vi !== standard.primaryMeaningVi ||
      row.meanings_vi !== JSON.stringify(standard.meaningsVi) || row.meanings_en !== JSON.stringify(standard.meaningsEn) ||
      row.pos !== JSON.stringify(standard.pos) || row.image_uri !== standard.imageUri ||
      row.visual_type !== standard.visualType || row.translation_status !== standard.translationStatus;
  });
  const storyProgress = await readRows(db, `SELECT ${storyProgressColumns.join(',')} FROM story_progress`);
  const mistakes = await readRows(db, `SELECT ${mistakeColumns.join(',')} FROM mistake_records`);
  const skillMastery = await readRows(db, `SELECT ${skillMasteryColumns.join(',')} FROM vocabulary_skill_mastery`);
  const speakingPractice = await readRows(db, `SELECT ${speakingColumns.join(',')} FROM speaking_practice`);
  const xpEvents = await readRows(db, `SELECT ${xpColumns.join(',')} FROM xp_events`);
  const userAchievements = await readRows(db, `SELECT ${achievementColumns.join(',')} FROM user_achievements`);
  const learningGoals = await readRows(db, `SELECT ${goalColumns.join(',')} FROM learning_goals`);
  const grammarAttempts = await readRows(db, `SELECT ${grammarAttemptColumns.join(',')} FROM grammar_attempts`);
  const examAttempts = await readRows(db, `SELECT ${examAttemptColumns.join(',')} FROM exam_attempts`);
  const writtenPractice = await readRows(db, 'SELECT id,exercise_id,snapshot_json,answer,status,revision,updated_at FROM written_practice');
  const confusableAttempts = await readRows(db, 'SELECT * FROM confusable_attempts');
  const personalVocabularyContexts = await readRows(db, `SELECT ${personalContextColumns.join(',')} FROM personal_vocabulary_context`);
  const wordContexts = await readRows(db, `SELECT ${wordContextColumns.join(',')} FROM word_contexts`);
  const personalContextMemory = await readRows(db, `SELECT ${personalMemoryColumns.join(',')} FROM personal_context_memory`);
  const practiceAttemptDaily = await readRows(db, `SELECT ${practiceAttemptDailyColumns.join(',')} FROM practice_attempt_daily ORDER BY utc_day,mistake_id`);
  const timedSpeakingAttempts = await readRows(db, `SELECT ${timedSpeakingColumns.join(',')} FROM timed_speaking_attempts`);
  // Do not even read opted-in notes/audio/usage for backup. Local consent is not cloud/backup consent.
  const roleplayHistory = await readRows(db, `SELECT id,scene_id,level,saved_at,attempts,completed_goals,total_goals,used_words_json,
    0 AS transcript_opt_in,NULL AS transcript_summary FROM roleplay_history ORDER BY saved_at DESC,id DESC LIMIT 100`);
  const roleplayAiLimits = await readRows(db, `SELECT ${roleplayLimitColumns.join(',')} FROM roleplay_ai_limits WHERE id=1`);
  const data: LocalBackupData = { userSettings, personalDecks, customVocabulary, exampleSentences,
    vocabularyProgress, reviewLogs, dailyStats, baseVocabularyOverrides, imageAssets, lessonProgress,
    lessonActivityProgress, grammarProgress,
    readingDocuments, readingProgress, readingVocabulary, readingDocumentChunks, storyProgress, mistakes, skillMastery, speakingPractice,
    xpEvents, userAchievements, learningGoals, grammarAttempts, examAttempts, writtenPractice, confusableAttempts, personalVocabularyContexts, wordContexts, personalContextMemory, practiceAttemptDaily, timedSpeakingAttempts,
    roleplayHistory, roleplayAiLimits };
  return createLocalBackup(data, appVersion);
}

/**
 * Replaces only learner-owned state in one transaction. Bundled HSK vocabulary
 * stays in place, so a bad/cross-version file cannot leave a half-imported DB.
 */
export async function importLocalBackup(db: SQLiteDatabase, backup: LocalBackup): Promise<void> {
  if (backup.schemaVersion > DATABASE_VERSION) throw new Error("UNSUPPORTED_BACKUP_SCHEMA");
  const { data } = backup;
  validateRoleplayBackupData(data);
  data.examAttempts?.forEach(validateExamBackupRecord);
  data.writtenPractice?.forEach(validateWrittenBackupRecord);
  data.confusableAttempts?.forEach(validateConfusableAttempt);
  data.personalVocabularyContexts?.forEach(validateContextRecord);
  data.wordContexts?.forEach(validateWordContextRecord);
  data.personalContextMemory?.forEach(validatePersonalContextMemoryRecord);
  data.timedSpeakingAttempts?.forEach(validateSpeakingAttemptBackupRecord);
  for (const row of data.baseVocabularyOverrides ?? []) {
    if (typeof row.id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(row.id)) throw new Error('INVALID_BASE_WORD_OVERRIDE');
  }
  await db.withTransactionAsync(async () => {
    // Older backups know nothing about contexts. Preserve rows even when custom
    // vocabulary is temporarily removed/recreated by the existing restore path.
    const retainedContexts = data.personalVocabularyContexts === undefined
      ? await readRows(db, `SELECT ${personalContextColumns.join(',')} FROM personal_vocabulary_context`) : [];
    const retainedWordContexts = data.wordContexts === undefined
      ? await readRows(db, `SELECT ${wordContextColumns.join(',')} FROM word_contexts`) : [];
    const retainedPersonalContextMemory = data.personalContextMemory === undefined
      ? await readRows(db, `SELECT ${personalMemoryColumns.join(',')} FROM personal_context_memory`) : [];
    await seedAchievements(db);
    await db.execAsync('DELETE FROM xp_events; DELETE FROM user_achievements; DELETE FROM learning_goals;');
    await db.execAsync('DELETE FROM grammar_attempts;');
    if (backup.backupVersion >= 2) await db.execAsync('DELETE FROM image_assets;');
    await db.execAsync('DELETE FROM lesson_activity_progress; DELETE FROM lesson_progress;');
    await db.execAsync('DELETE FROM grammar_progress;');
    await db.execAsync('DELETE FROM story_progress;');
    await db.execAsync('DELETE FROM speaking_practice;');
    await db.execAsync('DELETE FROM mistake_records; DELETE FROM vocabulary_skill_mastery;');
    await db.execAsync('DELETE FROM reading_document_chunks; DELETE FROM reading_vocabulary; DELETE FROM reading_progress; DELETE FROM reading_documents;');
    await db.execAsync(`
      DELETE FROM review_log;
      DELETE FROM user_vocabulary_progress;
      DELETE FROM daily_stats;
      DELETE FROM example_sentence WHERE vocabulary_id IN (SELECT id FROM vocabulary WHERE is_custom=1);
      DELETE FROM vocabulary WHERE is_custom=1;
      DELETE FROM personal_deck;
      DELETE FROM user_settings;
    `);
    await insertRows(db, "personal_deck", deckColumns, data.personalDecks);
    await insertRows(db, "vocabulary", vocabularyColumns, data.customVocabulary);
    if (data.personalVocabularyContexts !== undefined) {
      await db.execAsync('DELETE FROM personal_vocabulary_context;');
      await insertRows(db, 'personal_vocabulary_context', personalContextColumns, data.personalVocabularyContexts);
    } else {
      for (const row of retainedContexts) {
        if (await db.getFirstAsync('SELECT id FROM vocabulary WHERE id=?',String(row.vocabulary_id))) {
          await db.runAsync(`INSERT OR IGNORE INTO personal_vocabulary_context (${personalContextColumns.join(',')})
            VALUES(${personalContextColumns.map(() => '?').join(',')})`, ...personalContextColumns.map(column => backupValue(row[column])));
        }
      }
    }
    if (data.wordContexts !== undefined) {
      await db.execAsync('DELETE FROM word_contexts;');
      await insertRows(db, 'word_contexts', wordContextColumns, data.wordContexts);
    } else {
      for (const row of retainedWordContexts) {
        if (await db.getFirstAsync('SELECT id FROM vocabulary WHERE id=?', String(row.vocabulary_id))) {
          await db.runAsync(`INSERT OR IGNORE INTO word_contexts (${wordContextColumns.join(',')})
            VALUES(${wordContextColumns.map(() => '?').join(',')})`, ...wordContextColumns.map(column => backupValue(row[column])));
        }
      }
    }
    if (data.personalContextMemory !== undefined) {
      await db.execAsync('DELETE FROM personal_context_memory;');
      await insertRows(db,'personal_context_memory',personalMemoryColumns,data.personalContextMemory);
    } else {
      for (const row of retainedPersonalContextMemory) {
        if (await db.getFirstAsync('SELECT id FROM vocabulary WHERE id=?',String(row.vocabulary_id))) {
          await db.runAsync(`INSERT OR IGNORE INTO personal_context_memory (${personalMemoryColumns.join(',')})
            VALUES(${personalMemoryColumns.map(() => '?').join(',')})`, ...personalMemoryColumns.map(column => backupValue(row[column])));
        }
      }
    }
    await rebuildCustomCharacterIndex(db, data.customVocabulary);
    await insertRows(db, "example_sentence", exampleColumns, data.exampleSentences);
    await insertRows(db, "user_vocabulary_progress", progressColumns, data.vocabularyProgress);
    await insertRows(db, "review_log", reviewColumns, data.reviewLogs);
    await insertRows(db, "daily_stats", dailyColumns, data.dailyStats);
    await insertRows(db, "user_settings", settingColumns, data.userSettings);
    for (const row of data.baseVocabularyOverrides ?? []) {
      const values = overrideColumns.slice(1).map((column) => backupValue(row[column]));
      const result = await db.runAsync(`UPDATE vocabulary SET ${overrideColumns.slice(1).map((column) => `${column}=?`).join(',')}
        WHERE id=? AND is_custom=0`, ...values, String(row.id));
      if (result.changes !== 1) throw new Error(`MISSING_HSK_WORD:${row.id}`);
    }
    if (backup.backupVersion >= 2) await insertRows(db, 'image_assets', imageAssetColumns, data.imageAssets ?? []);
    await insertRows(db, 'lesson_progress', lessonProgressColumns, data.lessonProgress ?? []);
    await insertRows(db, 'lesson_activity_progress', lessonActivityProgressColumns, data.lessonActivityProgress ?? []);
    await insertRows(db, 'grammar_progress', grammarProgressColumns, data.grammarProgress ?? []);
    await insertRows(db, 'story_progress', storyProgressColumns, data.storyProgress ?? []);
    await insertRows(db, 'mistake_records', mistakeColumns, data.mistakes ?? []);
    if (data.practiceAttemptDaily !== undefined) {
      await db.execAsync('DELETE FROM practice_attempt_daily;');
      await insertRows(db,'practice_attempt_daily',practiceAttemptDailyColumns,data.practiceAttemptDaily);
    }
    await insertRows(db, 'vocabulary_skill_mastery', skillMasteryColumns, data.skillMastery ?? []);
    await insertRows(db, 'speaking_practice', speakingColumns, data.speakingPractice ?? []);
    await insertRows(db, 'xp_events', xpColumns, data.xpEvents ?? []);
    await insertRows(db, 'user_achievements', achievementColumns, data.userAchievements ?? []);
    await insertRows(db, 'learning_goals', goalColumns, data.learningGoals ?? []);
    await insertRows(db, 'grammar_attempts', grammarAttemptColumns, data.grammarAttempts ?? []);
    // Older backups do not contain this field: preserve new attempts in that case.
    if (data.examAttempts !== undefined) {
      await db.execAsync('DELETE FROM exam_attempts;');
      await insertRows(db, 'exam_attempts', examAttemptColumns, data.examAttempts);
    }
    if (data.writtenPractice !== undefined) {
      await db.execAsync('DELETE FROM written_practice;');
      await insertRows(db, 'written_practice', ['id','exercise_id','snapshot_json','answer','status','revision','updated_at'], data.writtenPractice);
    }
    if (data.confusableAttempts !== undefined) {
      await db.execAsync('DELETE FROM confusable_attempts;');
      await insertRows(db, 'confusable_attempts', ['id','pair_id','question_id','content_version','selected_word','correct','assisted','created_at'], data.confusableAttempts);
    }
    if (data.timedSpeakingAttempts !== undefined) {
      await db.execAsync('DELETE FROM timed_speaking_attempts;');
      await insertRows(db, 'timed_speaking_attempts', timedSpeakingColumns, data.timedSpeakingAttempts);
    }
    // Absent legacy fields preserve history/configuration; usage is never touched, even on full restore.
    if (data.roleplayHistory !== undefined) {
      await db.execAsync('DELETE FROM roleplay_history;');
      await insertRows(db, 'roleplay_history', roleplayHistoryColumns, data.roleplayHistory);
    }
    if (data.roleplayAiLimits !== undefined) {
      await db.execAsync('DELETE FROM roleplay_ai_limits;');
      await insertRows(db, 'roleplay_ai_limits', roleplayLimitColumns, data.roleplayAiLimits);
    }
    await insertRows(db, 'reading_documents', readingDocumentColumns, data.readingDocuments ?? []);
    await insertRows(db, 'reading_progress', readingProgressColumns, data.readingProgress ?? []);
    await insertRows(db, 'reading_vocabulary', readingVocabularyColumns, data.readingVocabulary ?? []);
    await insertRows(db, 'reading_document_chunks', readingDocumentChunkColumns, data.readingDocumentChunks ?? []);
    await db.execAsync(`INSERT OR IGNORE INTO image_assets(id,vocabulary_id,local_uri,created_at,updated_at)
      SELECT 'image-' || id,id,image_uri,COALESCE(created_at,CURRENT_TIMESTAMP),COALESCE(updated_at,CURRENT_TIMESTAMP)
      FROM vocabulary WHERE image_uri LIKE 'file:%' OR image_uri LIKE 'content:%';`);
    const integrity = await db.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
    const references = await db.getAllAsync('PRAGMA foreign_key_check');
    if (integrity?.quick_check !== 'ok' || references.length) throw new Error('RESTORE_INTEGRITY_CHECK_FAILED');
  });
}
