import type { SQLiteDatabase } from "expo-sqlite";

import { getOfflineVocabulary } from "@/db/database";
import { awardActivityXp } from '@/db/gamification';
import { practiceSkillForExercise, recordPracticeResult } from '@/db/mistakes';
import {
  sharedWordToVocabulary,
  type SharedDeckPayload,
} from "@/services/decks/share-code";
import { illustrationForVocabulary } from "@/services/media/illustration";
import { normalizePinyinInput } from "@/services/pinyin/pinyin";
import { exerciseTypeForReviewMode } from "@/services/review/exercise";
import { normalizeReviewSessionSize } from "@/services/review/session-size";
import {
  assessWeakness,
  isWeakWord,
  type WeakWordSignals,
} from "@/services/review/weak-words";
import { meaningSearchAlternatives } from "@/services/search/meaning-query";
import { normalizeSearch } from "@/services/search/normalize";
import {
  applyReview,
  initialLearningSchedule,
  isReviewDue,
  type ReviewInput,
  type ReviewTransition,
} from "@/services/srs/scheduler";
import { calculateStreak, toLocalDateKey } from "@/services/stats/calendar";
import {
  createContextualExample,
  isGenericContextualExample,
  withContextualExamples,
  withSingleContextualExample,
} from "@/services/vocabulary/contextual-example";
import { dailyWordOffset } from "@/services/vocabulary/daily-word";
import { cleanLearnerMeanings, vocabularySearchAliases } from "@/services/vocabulary/quality";
import { rankRelatedWords } from "@/services/vocabulary/related-words";
import type {
  DashboardStats,
  EditableVocabulary,
  HskBand,
  PersonalDeck,
  ProgressRow,
  ReviewMode,
  ReviewSkillAttempt,
  UserSettings,
  Vocabulary,
  WordStatus,
} from "@/types/models";

type DbWord = {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  pinyin_numeric: string;
  primary_meaning_vi: string;
  meanings_vi: string;
  meanings_en: string;
  pos: string;
  hsk_band: string;
  frequency_rank: number | null;
  classifiers: string;
  radical: string | null;
  stroke_count: number | null;
  visual_type: Vocabulary["visualType"];
  image_uri: string | null;
  image_source: string | null;
  image_license: string | null;
  image_attribution: string | null;
  audio_uri: string | null;
  source: string;
  source_version: string;
  source_url: string;
  translation_status: Vocabulary["translationStatus"];
  mastery_level?: number | null;
  is_favorite?: number | null;
  due?: string | null;
  status?: string | null;
  studied?: number | null;
  is_known?: number | null;
  next_review_at?: string | null;
  review_count?: number | null;
  is_custom: number;
  deck_id: string | null;
};

export type BulkLookupQuery = {
  value: string;
  allowPinyin?: boolean;
};

type BulkLookupIndexRow = {
  id: string;
  simplified: string;
  traditional: string;
  pinyin_numeric: string;
  search_text: string;
  searchTextPadded: string;
  pinyinCompact: string;
  hsk_band: string;
  frequency_rank: number | null;
  deck_id: string | null;
  /** Present for immutable bundled words; absent for user-created DB rows. */
  word?: Vocabulary;
};

type BulkLookupIndexDbRow = Omit<BulkLookupIndexRow, "searchTextPadded" | "pinyinCompact">;

type BulkLookupIndex = {
  rows: BulkLookupIndexRow[];
  tokenRows: Map<string, BulkLookupIndexRow[]>;
  hanziRows: Map<string, BulkLookupIndexRow[]>;
  exactHanziRows: Map<string, BulkLookupIndexRow[]>;
  pinyinRows: Map<string, BulkLookupIndexRow[]>;
};

type BulkLookupQueryContext = BulkLookupQuery & {
  raw: string;
  normalized: string;
  alternatives: string[];
  tokens: string[];
  pinyinQuery: string;
  hasHanzi: boolean;
};

const BULK_INDEX_CANDIDATES_PER_QUERY = 48;
const BULK_INDEX_BUCKET_LIMIT = 256;
const BULK_FETCH_ID_CHUNK_SIZE = 500;
const BULK_CUSTOM_LOOKUP_TIMEOUT_MS = 350;
const BULK_SQL_LOOKUP_MAX_CANDIDATES = 2_400;
const BULK_SQL_LOOKUP_TIMEOUT_MS = 900;
const bulkLookupIndexCache = new WeakMap<SQLiteDatabase, Promise<BulkLookupIndex>>();
let bulkOfflineVocabularyCache: Vocabulary[] | null = null;
let bulkFastOfflineVocabularyCache: Vocabulary[] | null = null;

type DbProgress = {
  vocabulary_id: string;
  status: string | null;
  studied: number | null;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
  mastery_level: number;
  is_known: number;
  is_favorite: number;
  is_suspended: number;
  memory_level: number;
  deep_memory_stage: number;
  learned_at: string | null;
  next_review_at: string;
  review_count: number;
  correct_count: number;
  wrong_count: number;
  lapse_count: number;
  consecutive_correct: number;
  consecutive_wrong: number;
  hint_used_count: number;
  average_response_time_ms: number;
  last_response_time_ms: number;
};

type DbWeakWord = DbWord & {
  correct_count: number;
  wrong_count: number;
  lapse_count: number;
  consecutive_wrong: number;
  hint_used_count: number;
};

export type WeakVocabulary = {
  word: Vocabulary;
  score: number;
  reasons: string[];
  isDue: boolean;
};

const LEGACY_STATE = { New: 0, Learning: 1, Review: 2, Relearning: 3 } as const;

export const defaultSettings: UserSettings = {
  dailyNewWordGoal: 10,
  learnSessionSize: 10,
  dailyStudyMinutes: 30,
  dailyReviewGoal: 100,
  desiredRetention: 0.9,
  selectedHskBands: [1],
  simplifiedOrTraditional: "simplified",
  pinyinVisibility: true,
  toneColorEnabled: true,
  soundEnabled: true,
  autoPlayAudio: false,
  speechRate: 0.82,
  hapticEnabled: true,
  themeMode: "system",
  motionMode: "full",
  dailyReminderEnabled: false,
  dailyReminderHour: 19,
  dailyReminderMinute: 0,
  onboardingCompleted: false,
  reviewStyle: "automatic",
  reviewSessionSize: 10,
  practiceWritingEarly: false,
};

export async function listVocabulary(
  db: SQLiteDatabase,
  options: {
    search?: string;
    band?: HskBand | "all";
    filter?: "all" | "learned" | "unlearned" | "due" | "favorite" | "mastered" | "known" | "skipped";
    memoryLevel?: number;
    deckId?: string;
    limit?: number;
    offset?: number;
    bandSlice?: { offset: number; limit: number };
  } = {},
): Promise<Vocabulary[]> {
  const clauses: string[] = [
    "(v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))",
  ];
  const values: (string | number)[] = [];
  if (options.search?.trim()) {
    clauses.push("v.search_text LIKE ?");
    values.push(`%${normalizeSearch(options.search)}%`);
  }
  if (options.band && options.band !== "all") {
    clauses.push("v.hsk_band = ?");
    values.push(String(options.band));
  }
  if (options.bandSlice && options.band && options.band !== "all") {
    const sliceOffset = Math.max(0, Math.trunc(options.bandSlice.offset));
    const sliceLimit = Math.min(100, Math.max(1, Math.trunc(options.bandSlice.limit)));
    clauses.push(`v.id IN (
      SELECT page_word.id FROM vocabulary page_word
      WHERE page_word.hsk_band=? AND (page_word.deck_id IS NULL OR EXISTS (
        SELECT 1 FROM personal_deck d WHERE d.id=page_word.deck_id AND d.deleted_at IS NULL))
      ORDER BY COALESCE(page_word.frequency_rank,999999),page_word.pinyin_numeric,page_word.id
      LIMIT ? OFFSET ?)`);
    values.push(String(options.band), sliceLimit, sliceOffset);
  }
  if (options.memoryLevel && options.memoryLevel >= 1 && options.memoryLevel <= 6) {
    clauses.push("p.status = 'LEARNING' AND p.studied = 1 AND p.memory_level = ?");
    values.push(Math.trunc(options.memoryLevel));
  }
  if (options.deckId?.trim()) {
    clauses.push("v.deck_id = ?");
    values.push(options.deckId.trim());
  }
  if (options.filter === "learned")
    clauses.push("COALESCE(p.status, 'NEW') = 'LEARNING' AND COALESCE(p.studied, 0) = 1");
  if (options.filter === "unlearned")
    clauses.push("COALESCE(p.status, 'NEW') = 'NEW' AND COALESCE(p.is_suspended, 0) = 0");
  if (options.filter === "due") {
    clauses.push("p.studied = 1 AND p.status = 'LEARNING' AND p.is_suspended = 0");
    clauses.push("p.next_review_at <= ?");
    values.push(new Date().toISOString());
  }
  if (options.filter === "favorite") clauses.push("p.is_favorite = 1");
  if (options.filter === "mastered")
    clauses.push("p.status = 'LEARNING' AND p.studied = 1 AND p.memory_level >= 6");
  if (options.filter === "known") clauses.push("p.status = 'KNOWN'");
  if (options.filter === "skipped") clauses.push("p.status = 'SKIPPED'");
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  values.push(options.limit ?? 50, options.offset ?? 0);
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*, p.mastery_level, p.is_favorite, p.due, p.status, p.studied,
      p.is_known, p.next_review_at, p.review_count
    FROM vocabulary v LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id = v.id
    ${where} ORDER BY CASE v.hsk_band WHEN '7-9' THEN 7 ELSE CAST(v.hsk_band AS INTEGER) END,
    COALESCE(v.frequency_rank, 999999), v.pinyin_numeric LIMIT ? OFFSET ?`,
    values,
  );
  return attachSingleExamples(db, rows.map(mapWord));
}

export type SharedVocabularySentence = {
  id: string;
  hanzi: string;
  pinyin: string;
  translationVi: string;
  translationEn: string | null;
  hskLevel: string | null;
  topic: string | null;
  provenance: string;
  sourceUrl: string | null;
};

export async function getVocabulary(
  db: SQLiteDatabase,
  id: string,
): Promise<Vocabulary | null> {
  const row = await db.getFirstAsync<DbWord>(
    `SELECT v.*, p.mastery_level, p.is_favorite, p.due, p.status, p.studied,
      p.is_known, p.next_review_at, p.review_count
    FROM vocabulary v LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id = v.id
    WHERE v.id = ? AND (v.deck_id IS NULL OR EXISTS (
      SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
    ))`,
    id,
  );
  if (!row) return null;
  const examples = await getExampleSentences(db, id, 5);
  const sharedSentences = await listSharedSentencesForVocabulary(db, id, 5);
  const allExamples = [...examples, ...sharedSentences.map((sentence) => ({
    id: sentence.id, vocabularyId: id, chinese: sentence.hanzi, pinyin: sentence.pinyin,
    vietnamese: sentence.translationVi, english: sentence.translationEn ?? undefined, difficulty: 1,
  }))];
  return withContextualExamples({
    ...mapWord(row),
    examples: Array.from(new Map(allExamples.map((example) => [example.chinese, example])).values()),
  });
}

/** Detailed screens can request several curated examples without changing list APIs. */
export async function getExampleSentences(
  db: SQLiteDatabase,
  vocabularyId: string,
  limit = 5,
): Promise<Vocabulary["examples"]> {
  const rows = await db.getAllAsync<{
    id: string;
    vocabulary_id: string;
    chinese: string;
    pinyin: string;
    vietnamese: string;
    english: string | null;
    difficulty: number;
  }>(
    "SELECT * FROM example_sentence WHERE vocabulary_id = ? AND chinese NOT GLOB ? ORDER BY difficulty, id LIMIT ?",
    vocabularyId,
    "我正在学习“*”这个词。",
    20,
  );
  return rows.map((item) => ({
    id: item.id,
    vocabularyId: item.vocabulary_id,
    chinese: item.chinese,
    pinyin: item.pinyin,
    vietnamese: item.vietnamese,
    english: item.english ?? undefined,
    difficulty: item.difficulty,
  })).filter((example) => !isGenericContextualExample({ simplified: "" }, example))
    .slice(0, Math.max(1, Math.min(20, Math.trunc(limit))));
}

export async function listSharedSentencesForVocabulary(
  db: SQLiteDatabase,
  vocabularyId: string,
  limit = 5,
): Promise<SharedVocabularySentence[]> {
  const rows = await db.getAllAsync<{
    id: string; hanzi: string; pinyin: string; translation_vi: string; translation_en: string | null;
    hsk_level: string | null; topic: string | null; provenance: string; source_url: string | null;
  }>(`SELECT s.id,s.hanzi,s.pinyin,s.translation_vi,s.translation_en,s.hsk_level,s.topic,
      s.provenance,s.source_url
    FROM sentence_vocabulary sv JOIN sentences s ON s.id=sv.sentence_id
    WHERE sv.vocabulary_id=? AND s.is_active=1 AND s.review_status='REVIEWED'
    ORDER BY s.difficulty,s.id LIMIT ?`, vocabularyId, Math.max(1, Math.min(20, Math.trunc(limit))));
  return rows.map((row) => ({
    id: row.id, hanzi: row.hanzi, pinyin: row.pinyin, translationVi: row.translation_vi,
    translationEn: row.translation_en, hskLevel: row.hsk_level, topic: row.topic,
    provenance: row.provenance, sourceUrl: row.source_url,
  }));
}

export async function getProgress(
  db: SQLiteDatabase,
  vocabularyId: string,
): Promise<ProgressRow | null> {
  const row = await db.getFirstAsync<DbProgress>(
    "SELECT * FROM user_vocabulary_progress WHERE vocabulary_id = ?",
    vocabularyId,
  );
  return row ? mapProgress(row) : null;
}

export async function startLearningWord(
  db: SQLiteDatabase,
  vocabularyId: string,
): Promise<void> {
  const exists = await getProgress(db, vocabularyId);
  // This function is called after the learner has completed the one visible
  // copy/encoding step. It must never start a review or promote a level.
  if (exists && exists.status !== "NEW") return;
  const now = new Date();
  const schedule = initialLearningSchedule(now);
  await upsertProgress(
    db,
    vocabularyId,
    {
      status: "LEARNING",
      studied: true,
      memoryLevel: schedule.memoryLevel,
      deepMemoryStage: 0,
      nextReviewAt: schedule.nextReviewAt,
      reviewCount: 0,
      correctCount: 0,
      wrongCount: 0,
      lapseCount: 0,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      hintUsedCount: 0,
      averageResponseTimeMs: 0,
      lastResponseTimeMs: 0,
      isKnown: false,
    },
    exists?.isFavorite ?? false,
    now,
    true,
    { status: "LEARNING", studied: true, learnedAt: now.toISOString() },
  );
}

/** Semantic alias used by the learning screen to make the boundary explicit. */
export const completeInitialLearning = startLearningWord;

/** Records an explicit “Chưa nhớ” immediately, even if the learner leaves the
 * three-pass session before its final SRS transition is written. */
export async function markVocabularyNeedsReinforcement(
  db: SQLiteDatabase,
  vocabularyId: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE user_vocabulary_progress
    SET consecutive_wrong=MAX(1, consecutive_wrong), consecutive_correct=0, updated_at=?
    WHERE vocabulary_id=? AND status='LEARNING' AND studied=1 AND is_known=0 AND is_suspended=0`,
    new Date().toISOString(),
    vocabularyId,
  );
}

const activeReviewWrites = new Set<string>();
export async function reviewWord(
  db: SQLiteDatabase,
  vocabularyId: string,
  input: ReviewInput,
  mode: ReviewMode = "hanzi-meaning",
): Promise<ReviewTransition | null> {
  if (activeReviewWrites.has(vocabularyId)) return null;
  activeReviewWrites.add(vocabularyId);
  const progress = await getProgress(db, vocabularyId);
  const now = new Date();
  // Reviews are only valid for studied learning words that are actually due.
  // This guard prevents a newly learned word (or a known/skipped word) from
  // accidentally entering the spaced-repetition flow.
  if (
    !progress ||
    progress.status !== "LEARNING" ||
    !progress.studied ||
    progress.isKnown ||
    progress.isSuspended ||
    !isReviewDue(progress, now)
  ) {
    activeReviewWrites.delete(vocabularyId);
    return null;
  }
  try {
    const result = applyReview(progress, input, now);
    const answeredCorrect = input.rating === "again" ? false : input.correct;
    await db.withTransactionAsync(async () => {
      await upsertProgress(
        db,
        vocabularyId,
        result,
        progress?.isFavorite ?? false,
        now,
        false,
        { status: "LEARNING", studied: true, learnedAt: progress.learnedAt },
      );
      await db.runAsync(
        `INSERT INTO review_log
        (vocabulary_id,reviewed_at,rating,previous_state,new_state,response_time_ms,mode,
        level_before,level_after,deep_stage_before,deep_stage_after,correct,hint_used,next_review_at,
        typed_pinyin,selected_hanzi,candidate_rank,exercise_type)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        vocabularyId,
        now.toISOString(),
        ratingNumber(input.rating, input.correct),
        progress?.state ?? LEGACY_STATE.New,
        LEGACY_STATE.Review,
        input.responseTimeMs,
        mode,
        result.levelBefore,
        result.memoryLevel,
        result.deepStageBefore,
        result.deepMemoryStage,
        answeredCorrect ? 1 : 0,
        (input.hintUsed ?? input.usedHint) ? 1 : 0,
        result.nextReviewAt,
        input.typedPinyin ?? null,
        input.selectedHanzi ?? null,
        input.candidateRank ?? null,
        exerciseTypeForReviewMode(mode),
      );
      const exercise = exerciseTypeForReviewMode(mode);
      await recordPracticeResult(db, { vocabularyId, skill: practiceSkillForExercise(exercise),
        exerciseType: exercise, correct: answeredCorrect, hintUsed: !!(input.hintUsed ?? input.usedHint),
        responseTimeMs: input.responseTimeMs });
      const today = toLocalDateKey(now);
      if (answeredCorrect) await awardActivityXp(db, 'review', vocabularyId, now);
      await db.runAsync(
        `INSERT INTO daily_stats (date,reviewed,correct,new_words,study_seconds)
        VALUES (?,1,?,0,?) ON CONFLICT(date) DO UPDATE SET reviewed=reviewed+1,
        correct=correct+excluded.correct,study_seconds=study_seconds+excluded.study_seconds`,
        today,
        answeredCorrect ? 1 : 0,
        0,
      );
    });
    return result;
  } finally {
    activeReviewWrites.delete(vocabularyId);
  }
}

export async function toggleFavorite(
  db: SQLiteDatabase,
  vocabularyId: string,
): Promise<boolean> {
  const progress = await getProgress(db, vocabularyId);
  const next = !progress?.isFavorite;
  const now = new Date().toISOString();
  if (progress)
    await db.runAsync(
      "UPDATE user_vocabulary_progress SET is_favorite=?, updated_at=? WHERE vocabulary_id=?",
      next ? 1 : 0,
      now,
      vocabularyId,
    );
  else
    await db.runAsync(
    `INSERT INTO user_vocabulary_progress
    (vocabulary_id,state,status,studied,due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,last_review,mastery_level,is_known,is_favorite,is_suspended,notes,memory_level,deep_memory_stage,learned_at,next_review_at,review_count,correct_count,wrong_count,lapse_count,consecutive_correct,consecutive_wrong,hint_used_count,average_response_time_ms,last_response_time_ms,created_at,updated_at)
    VALUES (?,0,'NEW',0,?,0,0,0,0,0,0,0,NULL,0,0,1,0,'',0,0,NULL,?,0,0,0,0,0,0,0,0,0,?,?,?)`,
      vocabularyId,
      now,
      now,
      now,
      now,
    );
  return next;
}

export async function getDueVocabulary(
  db: SQLiteDatabase,
  limit = 20,
  bands?: HskBand[],
  deckId?: string,
): Promise<Vocabulary[]> {
  const bandClause = bands?.length
    ? `AND v.hsk_band IN (${bands.map(() => "?").join(",")})`
    : "";
  const deckClause = deckId?.trim()
    ? "AND v.deck_id=? AND EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL)"
    : "AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))";
  const values: (string | number)[] = [
    new Date().toISOString(),
    ...(bands?.map(String) ?? []),
    ...(deckId?.trim() ? [deckId.trim()] : []),
    limit,
  ];
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count FROM vocabulary v
    JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE p.studied=1 AND p.status='LEARNING' AND p.is_known=0 AND p.is_suspended=0
      AND p.next_review_at <= ? ${bandClause} ${deckClause}
    ORDER BY p.next_review_at, p.memory_level,
      CASE WHEN p.lapse_count>=3 OR p.consecutive_wrong>=2 OR (p.review_count>0 AND CAST(p.wrong_count AS REAL)/p.review_count>=0.4) THEN 0 ELSE 1 END,
      LENGTH(v.id) % 7 LIMIT ?`,
    values,
  );
  return attachSingleExamples(db, rows.map(mapWord));
}

/** Returns the exact number of cards that the review screen can actually use. */
export async function getDueCount(
  db: SQLiteDatabase,
  bands?: HskBand[],
  deckId?: string,
): Promise<number> {
  const bandClause = bands?.length
    ? `AND v.hsk_band IN (${bands.map(() => "?").join(",")})`
    : "";
  const deckClause = deckId?.trim()
    ? "AND v.deck_id=? AND EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL)"
    : "AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))";
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) count
     FROM vocabulary v
     JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
     WHERE p.studied=1 AND p.status='LEARNING' AND p.is_known=0 AND p.is_suspended=0
       AND p.next_review_at <= ? ${bandClause} ${deckClause}`,
    new Date().toISOString(),
    ...(bands?.map(String) ?? []),
    ...(deckId?.trim() ? [deckId.trim()] : []),
  );
  return row?.count ?? 0;
}

/** Cards learned by the user but scheduled for a future review. */
export async function getUpcomingReviewVocabulary(
  db: SQLiteDatabase,
  limit = 12,
  bands?: HskBand[],
): Promise<Vocabulary[]> {
  const bandClause = bands?.length
    ? `AND v.hsk_band IN (${bands.map(() => "?").join(",")})`
    : "";
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count
     FROM vocabulary v
     JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
     WHERE p.studied=1 AND p.status='LEARNING' AND p.is_known=0 AND p.is_suspended=0
       AND p.next_review_at > ? ${bandClause}
       AND (v.deck_id IS NULL OR EXISTS (
         SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
       ))
     ORDER BY p.next_review_at ASC
     LIMIT ?`,
    new Date().toISOString(),
    ...(bands?.map(String) ?? []),
    Math.max(1, Math.min(50, Math.trunc(limit))),
  );
  return rows.map(mapWord);
}

export const LEARNED_REVIEW_PAGE_SIZE = 50;
export type LearnedReviewWord = Vocabulary & { isKnown: boolean; isSuspended: boolean };
export type LearnedReviewPage = { words: LearnedReviewWord[]; total: number; page: number; totalPages: number };

/** All learned cards across HSK bands and active decks, including due cards.
 * Known/suspended cards remain visible, but the UI must not claim they are due. */
export async function getLearnedReviewPage(db: SQLiteDatabase, requestedPage = 1): Promise<LearnedReviewPage> {
  const scope = `FROM vocabulary v JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE (p.studied=1 OR p.status='KNOWN')
      AND (v.deck_id IS NULL OR EXISTS (
        SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
      ))`;
  const count = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) count ${scope}`);
  const total = count?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LEARNED_REVIEW_PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1));
  const rows = await db.getAllAsync<DbWord & { is_suspended: number }>(
    `SELECT v.*,p.memory_level mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.is_suspended,p.next_review_at,p.review_count ${scope}
     ORDER BY CASE WHEN p.status='LEARNING' AND p.is_known=0 AND p.is_suspended=0 AND p.next_review_at IS NOT NULL THEN 0 ELSE 1 END,
       p.next_review_at ASC,v.id ASC LIMIT ? OFFSET ?`,
    LEARNED_REVIEW_PAGE_SIZE, (page - 1) * LEARNED_REVIEW_PAGE_SIZE,
  );
  return { words: rows.map(row => ({ ...mapWord(row), isKnown: row.is_known === 1 || row.status === 'KNOWN', isSuspended: row.is_suspended === 1 })), total, page, totalPages };
}

/**
 * A read-only “mistake book”. It reuses the same persisted signals that the
 * scheduler already uses to prioritize due reviews, without creating a second
 * SRS source of truth or allowing an off-schedule review write.
 */
export async function getWeakVocabulary(
  db: SQLiteDatabase,
  limit = 30,
): Promise<WeakVocabulary[]> {
  const now = new Date().toISOString();
  const rows = await db.getAllAsync<DbWeakWord>(
    `SELECT v.*, p.mastery_level, p.is_favorite, p.due, p.status, p.studied,
      p.is_known, p.next_review_at, p.review_count, p.correct_count,
      p.wrong_count, p.lapse_count, p.consecutive_wrong, p.hint_used_count
    FROM vocabulary v
    JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE p.status='LEARNING' AND p.studied=1 AND p.is_known=0 AND p.is_suspended=0
      AND (v.deck_id IS NULL OR EXISTS (
        SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
      ))
      AND (
        p.consecutive_wrong>=1 OR p.lapse_count>=1 OR p.wrong_count>=2
        OR p.hint_used_count>=3
      )
    ORDER BY
      p.consecutive_wrong DESC,
      p.lapse_count DESC,
      CASE WHEN p.review_count>0 THEN CAST(p.wrong_count AS REAL)/p.review_count ELSE 0 END DESC,
      p.hint_used_count DESC,
      p.next_review_at ASC
    LIMIT ?`,
    [limit],
  );
  const words = await attachSingleExamples(db, rows.map(mapWord));
  return rows.flatMap((row, index) => {
    const nextReviewAt = row.next_review_at ?? "";
    const signals: WeakWordSignals = {
      reviewCount: row.review_count ?? 0,
      correctCount: row.correct_count ?? 0,
      wrongCount: row.wrong_count ?? 0,
      lapseCount: row.lapse_count ?? 0,
      consecutiveWrong: row.consecutive_wrong ?? 0,
      hintUsedCount: row.hint_used_count ?? 0,
      nextReviewAt,
    };
    if (!isWeakWord(signals)) return [];
    const word = words[index];
    if (!word) return [];
    const assessment = assessWeakness(signals);
    return [{
      word,
      score: assessment.score,
      reasons: assessment.reasons,
      isDue: Boolean(nextReviewAt) && nextReviewAt <= now,
    }];
  });
}

export async function getUnlearnedVocabulary(
  db: SQLiteDatabase,
  bands: HskBand[],
  limit: number,
  deckId?: string,
): Promise<Vocabulary[]> {
  const clauses = [
    "COALESCE(p.status,'NEW')='NEW'",
    "COALESCE(p.studied,0)=0",
    "COALESCE(p.is_suspended,0)=0",
    "(v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))",
  ];
  const values: (string | number)[] = [];
  if (deckId?.trim()) {
    clauses.push("v.deck_id=?");
    values.push(deckId.trim());
  } else if (bands.length) {
    const placeholders = bands.map(() => "?").join(",");
    clauses.push(`v.hsk_band IN (${placeholders})`);
    values.push(...bands.map(String));
  } else {
    return [];
  }
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count FROM vocabulary v
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE ${clauses.join(" AND ")}
    ORDER BY COALESCE(v.frequency_rank,999999) LIMIT ?`,
    [...values, limit],
  );
  return attachSingleExamples(db, rows.map(mapWord));
}

/**
 * Selects one offline word deterministically for the local day. New and
 * in-progress words are preferred; known/mastered words are only a fallback.
 */
export async function getDailyVocabulary(
  db: SQLiteDatabase,
  bands: HskBand[],
  localDate = toLocalDateKey(new Date()),
): Promise<Vocabulary | null> {
  if (!bands.length) return null;
  const bandClause = `v.hsk_band IN (${bands.map(() => "?").join(",")})`;
  const commonClause = `
    ${bandClause}
    AND COALESCE(p.status, 'NEW') != 'SKIPPED'
    AND (v.deck_id IS NULL OR EXISTS (
      SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
    ))`;
  const preferredClause = `${commonClause}
    AND COALESCE(p.status, 'NEW') != 'KNOWN'
    AND COALESCE(p.memory_level, 0) < 6`;
  const find = async (clause: string) => {
    const count = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) count FROM vocabulary v
       LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
       WHERE ${clause}`,
      ...bands.map(String),
    );
    const candidateCount = count?.count ?? 0;
    if (!candidateCount) return null;
    const row = await db.getFirstAsync<DbWord>(
      `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
        p.is_known,p.next_review_at,p.review_count FROM vocabulary v
       LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
       WHERE ${clause}
       ORDER BY CASE v.hsk_band WHEN '7-9' THEN 7 ELSE CAST(v.hsk_band AS INTEGER) END,
         COALESCE(v.frequency_rank,999999),v.pinyin_numeric,v.id LIMIT 1 OFFSET ?`,
      ...bands.map(String),
      dailyWordOffset(localDate, bands, candidateCount),
    );
    if (!row) return null;
    return (await attachSingleExamples(db, [mapWord(row)]))[0] ?? null;
  };
  return (await find(preferredClause)) ?? find(commonClause);
}

export type DailyActivity = {
  date: string;
  reviewed: number;
  newWords: number;
};

/** Returns a bounded local-date activity range for the Statistics heatmap. */
export async function getDailyActivity(
  db: SQLiteDatabase,
  days = 28,
  now = new Date(),
): Promise<DailyActivity[]> {
  const amount = Math.max(1, Math.min(365, Math.trunc(days)));
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - amount + 1);
  return db.getAllAsync<DailyActivity>(
    `SELECT date,reviewed,new_words AS newWords FROM daily_stats
     WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
    toLocalDateKey(start),
    toLocalDateKey(now),
  );
}

export async function getDashboardStats(
  db: SQLiteDatabase,
  bands?: HskBand[],
): Promise<DashboardStats> {
  const now = new Date();
  const today = toLocalDateKey(now);
  const bandClause = bands?.length
    ? `AND v.hsk_band IN (${bands.map(() => "?").join(",")})`
    : "";
  const progress = await db.getFirstAsync<{
    learned: number;
    known: number;
    skipped: number;
    mastered: number;
    due: number;
  }>(
    `SELECT
    SUM(CASE WHEN p.status='LEARNING' AND p.studied=1 THEN 1 ELSE 0 END) learned,
    SUM(CASE WHEN p.status='KNOWN' THEN 1 ELSE 0 END) known,
    SUM(CASE WHEN p.status='SKIPPED' THEN 1 ELSE 0 END) skipped,
    SUM(CASE WHEN p.status='LEARNING' AND p.studied=1 AND p.memory_level>=6 THEN 1 ELSE 0 END) mastered,
    SUM(CASE WHEN p.status='LEARNING' AND p.studied=1 AND p.is_known=0 AND p.next_review_at<=? AND p.is_suspended=0 THEN 1 ELSE 0 END) due
    FROM user_vocabulary_progress p
    JOIN vocabulary v ON p.vocabulary_id=v.id
    WHERE (v.deck_id IS NULL OR EXISTS (
      SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
    )) ${bandClause}`,
    now.toISOString(),
    ...(bands?.map(String) ?? []),
  );
  const daily = await db.getFirstAsync<{
    reviewed: number;
    correct: number;
    new_words: number;
    study_seconds: number;
  }>("SELECT * FROM daily_stats WHERE date=?", today);
  const masteryRows = await db.getAllAsync<{
    mastery_level: number;
    count: number;
  }>(
    `SELECT p.memory_level mastery_level,COUNT(*) count
    FROM user_vocabulary_progress p JOIN vocabulary v ON p.vocabulary_id=v.id
    WHERE p.status='LEARNING' AND p.studied=1 AND p.memory_level BETWEEN 1 AND 6 AND (v.deck_id IS NULL OR EXISTS (
      SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
    )) ${bandClause} GROUP BY p.memory_level`,
    ...(bands?.map(String) ?? []),
  );
  const mastery = Array.from({ length: 7 }, () => 0);
  masteryRows.forEach((row) => {
    mastery[row.mastery_level] = row.count;
  });
  const streakRows = await db.getAllAsync<{ date: string }>(
    "SELECT date FROM daily_stats WHERE reviewed>0 OR new_words>0 ORDER BY date DESC LIMIT 365",
  );
  return {
    learned: progress?.learned ?? 0,
    known: progress?.known ?? 0,
    skipped: progress?.skipped ?? 0,
    mastered: progress?.mastered ?? 0,
    due: progress?.due ?? 0,
    reviewedToday: daily?.reviewed ?? 0,
    correctToday: daily?.correct ?? 0,
    newToday: daily?.new_words ?? 0,
    studySeconds: daily?.study_seconds ?? 0,
    streak: calculateStreak(
      streakRows.map((row) => row.date),
      now,
    ),
      lastStudyDate: streakRows[0]?.date ?? null,
    mastery,
  };
}

/** Recent answer history for derived per-skill metrics; it never changes SRS state. */
export async function listRecentReviewSkillAttempts(
  db: SQLiteDatabase,
  limit = 120,
): Promise<ReviewSkillAttempt[]> {
  const rows = await db.getAllAsync<{
    reviewed_at: string;
    correct: number;
    exercise_type: ReviewSkillAttempt["exerciseType"];
    mode: ReviewMode;
  }>(
    `SELECT reviewed_at,correct,exercise_type,mode FROM review_log
     WHERE correct IS NOT NULL ORDER BY reviewed_at DESC LIMIT ?`,
    Math.max(1, Math.min(500, limit)),
  );
  return rows.map((row) => ({
    reviewedAt: row.reviewed_at,
    correct: row.correct === 1,
    exerciseType: row.exercise_type,
    mode: row.mode,
  }));
}

/** Adds foreground learning time to today's local calendar bucket. */
export async function recordStudyTime(
  db: SQLiteDatabase,
  seconds: number,
  date = toLocalDateKey(new Date()),
): Promise<void> {
  if (!Number.isFinite(seconds) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('INVALID_STUDY_TIME');
  const amount = Math.max(0, Math.floor(seconds));
  if (!amount) return;
  await db.runAsync(
    `INSERT INTO daily_stats (date,reviewed,correct,new_words,study_seconds)
     VALUES (?,0,0,0,?)
     ON CONFLICT(date) DO UPDATE SET study_seconds=study_seconds+excluded.study_seconds`,
    date,
    amount,
  );
}

export async function getHskProgress(db: SQLiteDatabase) {
  return db.getAllAsync<{
    band: string;
    total: number;
    learned: number;
    mastered: number;
  }>(`SELECT v.hsk_band band,
    COUNT(*) total,SUM(CASE WHEN p.status='LEARNING' AND p.studied=1 THEN 1 ELSE 0 END) learned,
    SUM(CASE WHEN p.status='LEARNING' AND p.studied=1 AND p.memory_level>=6 THEN 1 ELSE 0 END) mastered FROM vocabulary v
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE (v.deck_id IS NULL OR EXISTS (
      SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
    )) GROUP BY v.hsk_band`);
}

export async function getSettings(db: SQLiteDatabase): Promise<UserSettings> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM user_settings WHERE id=1",
  );
  if (!row) return defaultSettings;
  try {
    const saved = JSON.parse(row.value) as Partial<UserSettings>;
    return {
      ...defaultSettings,
      ...saved,
      reviewSessionSize: normalizeReviewSessionSize(saved.reviewSessionSize),
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(
  db: SQLiteDatabase,
  settings: UserSettings,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO user_settings(id,value,updated_at) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
    JSON.stringify(settings),
    new Date().toISOString(),
  );
}

export async function getNotes(
  db: SQLiteDatabase,
  id: string,
): Promise<string> {
  return (
    (
      await db.getFirstAsync<{ notes: string }>(
        "SELECT notes FROM user_vocabulary_progress WHERE vocabulary_id=?",
        id,
      )
    )?.notes ?? ""
  );
}

export async function saveNotes(
  db: SQLiteDatabase,
  id: string,
  notes: string,
): Promise<void> {
  const progress = await getProgress(db, id);
  const now = new Date().toISOString();
  if (progress)
    await db.runAsync(
      "UPDATE user_vocabulary_progress SET notes=?,updated_at=? WHERE vocabulary_id=?",
      notes,
      now,
      id,
    );
  else
    await db.runAsync(
      `INSERT INTO user_vocabulary_progress
    (vocabulary_id,state,status,studied,due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,last_review,mastery_level,is_known,is_favorite,is_suspended,notes,memory_level,deep_memory_stage,learned_at,next_review_at,review_count,correct_count,wrong_count,lapse_count,consecutive_correct,consecutive_wrong,hint_used_count,average_response_time_ms,last_response_time_ms,created_at,updated_at)
    VALUES (?,0,'NEW',0,?,0,0,0,0,0,0,0,NULL,0,0,0,0,?,0,0,NULL,?,0,0,0,0,0,0,0,0,0,?,?,?)`,
      id,
      now,
      notes,
      now,
      now,
      now,
    );
}

export async function listPersonalDecks(
  db: SQLiteDatabase,
  options: { includeDeleted?: boolean } = {},
): Promise<PersonalDeck[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    word_count: number;
    due_count: number;
  }>(
    `SELECT d.*,
    COUNT(v.id) word_count,
    SUM(CASE WHEN p.status='LEARNING' AND p.studied=1 AND p.is_known=0 AND p.next_review_at<=? AND p.is_suspended=0 THEN 1 ELSE 0 END) due_count
    FROM personal_deck d LEFT JOIN vocabulary v ON v.deck_id=d.id
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    ${options.includeDeleted ? "" : "WHERE d.deleted_at IS NULL"}
    GROUP BY d.id ORDER BY d.updated_at DESC`,
    new Date().toISOString(),
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    wordCount: row.word_count,
    dueCount: row.due_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  }));
}

/** Returns only decks currently in the trash. Words and SRS progress are kept. */
export async function listDeletedPersonalDecks(
  db: SQLiteDatabase,
): Promise<PersonalDeck[]> {
  const decks = await listPersonalDecks(db, { includeDeleted: true });
  return decks.filter((deck) => deck.deletedAt !== null);
}

/** Moves a deck to the trash without deleting its words or review history. */
export async function deletePersonalDeck(
  db: SQLiteDatabase,
  deckId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE personal_deck SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL",
    now,
    now,
    deckId,
  );
}

/** Restores a deck from the trash, preserving all words and SRS progress. */
export async function restorePersonalDeck(
  db: SQLiteDatabase,
  deckId: string,
): Promise<void> {
  await db.runAsync(
    "UPDATE personal_deck SET deleted_at=NULL,updated_at=? WHERE id=? AND deleted_at IS NOT NULL",
    new Date().toISOString(),
    deckId,
  );
}

export async function createPersonalDeck(
  db: SQLiteDatabase,
  name: string,
  color = "#2457D6",
): Promise<string> {
  const now = new Date().toISOString();
  const id = `deck-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db.runAsync(
    "INSERT INTO personal_deck(id,name,color,created_at,updated_at) VALUES(?,?,?,?,?)",
    id,
    name.trim(),
    color,
    now,
    now,
  );
  return id;
}

/** Renames an active personal deck without touching its words or progress. */
export async function renamePersonalDeck(
  db: SQLiteDatabase,
  deckId: string,
  name: string,
): Promise<void> {
  const cleanId = deckId.trim();
  const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!cleanId || !cleanName) throw new Error("INVALID_DECK_NAME");
  const result = await db.runAsync(
    "UPDATE personal_deck SET name=?,updated_at=? WHERE id=? AND deleted_at IS NULL",
    cleanName,
    new Date().toISOString(),
    cleanId,
  );
  if (!result.changes) throw new Error("DECK_NOT_FOUND");
}

/**
 * Removes only the copy owned by a personal deck.  Global dictionary rows
 * always have a null deck_id and therefore cannot be deleted through this
 * function.
 */
export async function removeVocabularyFromDeck(
  db: SQLiteDatabase,
  deckId: string,
  vocabularyId: string,
): Promise<boolean> {
  const result = await db.runAsync(
    "DELETE FROM vocabulary WHERE id=? AND deck_id=?",
    vocabularyId.trim(),
    deckId.trim(),
  );
  if (result.changes) {
    await db.runAsync(
      "UPDATE personal_deck SET updated_at=? WHERE id=?",
      new Date().toISOString(),
      deckId.trim(),
    );
  }
  return result.changes > 0;
}

/**
 * Imports a friend's self-contained share payload as a new personal deck.
 * Progress is intentionally reset so the recipient gets a clean learning
 * session instead of inheriting the sender's SRS history.
 */
export async function importSharedDeck(
  db: SQLiteDatabase,
  payload: SharedDeckPayload,
): Promise<{ deckId: string; saved: number; skipped: number }> {
  const name = `${payload.name.trim() || "Bộ từ của bạn"} (bạn bè)`.slice(0, 80);
  const deckId = await createPersonalDeck(db, name);
  try {
    const words = payload.words.map((word, index) =>
      sharedWordToVocabulary(word, `shared-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`, deckId),
    );
    const outcome = await copyVocabularyBatchToDeck(db, deckId, words);
    return { deckId, ...outcome };
  } catch (error) {
    // Keep the operation recoverable while avoiding a half-filled active deck.
    await deletePersonalDeck(db, deckId);
    throw error;
  }
}

export async function getDeckVocabulary(
  db: SQLiteDatabase,
  deckId: string,
): Promise<Vocabulary[]> {
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count FROM vocabulary v
    JOIN personal_deck d ON d.id=v.deck_id AND d.deleted_at IS NULL
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id WHERE v.deck_id=?
    ORDER BY v.updated_at DESC,v.pinyin_numeric`,
    deckId,
  );
  return attachSingleExamples(db, rows.map(mapWord));
}

export async function findHanziCandidates(
  db: SQLiteDatabase,
  hanzi: string,
  limit = 8,
  includeExamples = true,
): Promise<Vocabulary[]> {
  const value = hanzi.trim();
  if (!value) return [];
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count FROM vocabulary v
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE (v.simplified=? OR v.traditional=? OR v.simplified LIKE ? OR v.traditional LIKE ?)
      AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))
    ORDER BY CASE WHEN v.simplified=? OR v.traditional=? THEN 0 ELSE 1 END,COALESCE(v.frequency_rank,999999) LIMIT ?`,
    value,
    value,
    `%${value}%`,
    `%${value}%`,
    value,
    value,
    limit,
  );
  const words = rows.map(mapWord);
  if (words.length) return includeExamples ? attachSingleExamples(db, words) : words;

  // The bundled dictionary is canonical and may contain an entry that an old
  // installed SQLite file has not received yet. Do not report a false
  // "not found" just because the local migration is behind the APK bundle.
  const offlineWords = (bulkOfflineVocabularyCache ??= getOfflineVocabulary())
    .filter((word) =>
      word.simplified === value ||
      word.traditional === value ||
      word.simplified.includes(value) ||
      word.traditional.includes(value),
    )
    .slice(0, Math.max(1, Math.min(100, Math.trunc(limit))));
  return includeExamples ? attachSingleExamples(db, offlineWords) : offlineWords;
}

/**
 * Bounded detail-page lookup for compounds sharing a character with a word.
 * The lookup runs only when the detail page opens; it does not hydrate the
 * dictionary into React state or run during render.
 */
export async function getRelatedVocabulary(
  db: SQLiteDatabase,
  source: Vocabulary,
  limit = 8,
): Promise<Vocabulary[]> {
  const characters = Array.from(new Set([...source.simplified, ...source.traditional]
    .filter((character) => /[\u3400-\u9fff]/u.test(character))));
  if (!characters.length) return [];
  const placeholders = characters.map(() => "?").join(",");
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count FROM vocabulary v
    JOIN vocabulary_character_index c ON c.vocabulary_id=v.id
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE v.id<>? AND c.character IN (${placeholders})
      AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))
    GROUP BY v.id
    ORDER BY CASE v.hsk_band WHEN ? THEN 0 ELSE 1 END,
      COALESCE(v.frequency_rank,999999), LENGTH(v.simplified)
    LIMIT 80`,
    source.id,
    ...characters,
    String(source.hskBand),
  );
  return rankRelatedWords(source, rows.map(mapWord), limit);
}

async function replaceVocabularyCharacterIndex(
  db: SQLiteDatabase,
  vocabularyId: string,
  simplified: string,
  traditional: string,
): Promise<void> {
  await db.runAsync("DELETE FROM vocabulary_character_index WHERE vocabulary_id=?", vocabularyId);
  const characters = new Set([...simplified, ...traditional]
    .filter((character) => /[\u3400-\u9fff]/u.test(character)));
  for (const character of characters) {
    await db.runAsync(
      "INSERT OR IGNORE INTO vocabulary_character_index(character,vocabulary_id) VALUES(?,?)",
      character,
      vocabularyId,
    );
  }
}

/** One set-based query used by Reader after its bounded term generation. */
export async function findVocabularyByExactHanzi(
  db: SQLiteDatabase,
  terms: string[],
): Promise<Vocabulary[]> {
  const unique = Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean)));
  if (!unique.length) return [];
  const matches = new Map<string, DbWord>();
  for (let start = 0; start < unique.length; start += 280) {
    const batch = unique.slice(start, start + 280);
    const placeholders = batch.map(() => "?").join(",");
    const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count FROM vocabulary v
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE (v.simplified IN (${placeholders}) OR v.traditional IN (${placeholders}))
      AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))
    ORDER BY COALESCE(v.frequency_rank,999999), LENGTH(v.simplified)`,
      ...batch,
      ...batch,
    );
    for (const row of rows) matches.set(row.id, row);
  }
  return Array.from(matches.values()).map(mapWord);
}

function firstRecognizedHanzi(value: string): string {
  return Array.from(value.trim()).find((character) => /[\u3400-\u9fff]/u.test(character)) ?? "";
}

/**
 * Finds real dictionary words that can be formed from the recognizer's
 * per-page candidates. ML Kit can return a plausible character that is not a
 * word when the pages are combined blindly (for example 别白勺). Filtering at
 * this boundary keeps whole-word suggestions in sync with the offline store.
 */
export async function findHanziWordCandidates(
  db: SQLiteDatabase,
  characterCandidates: string[][],
  limit = 12,
): Promise<string[]> {
  const groups = characterCandidates.map((group) => {
    const ranks = new Map<string, number>();
    group.forEach((candidate, index) => {
      const character = firstRecognizedHanzi(candidate);
      if (character && !ranks.has(character)) ranks.set(character, index);
    });
    return ranks;
  });
  if (!groups.length || groups.some((group) => group.size === 0)) return [];

  const ranked = new Map<string, { score: number; value: string }>();
  const addWord = (word: Pick<Vocabulary, "simplified" | "traditional" | "hskBand" | "frequencyRank">) => {
    for (const value of new Set([word.simplified, word.traditional])) {
      const characters = Array.from(value);
      if (characters.length !== groups.length) continue;
      let score = 0;
      let matches = true;
      characters.forEach((character, index) => {
        const group = groups[index];
        const rank = group?.get(character);
        if (rank === undefined) {
          matches = false;
          return;
        }
        score += 12_000 - rank * 700;
      });
      if (!matches) continue;
      score += bulkIndexHskPriority(String(word.hskBand)) + bulkIndexFrequencyBonus(word.frequencyRank);
      const previous = ranked.get(value);
      if (!previous || score > previous.score) ranked.set(value, { score, value });
    }
  };

  for (const word of (bulkOfflineVocabularyCache ??= getOfflineVocabulary())) addWord(word);

  // Include user-created/deck words without transferring their large JSON
  // fields. The common HSK path above remains entirely in memory.
  const customRows = await db.getAllAsync<{
    simplified: string;
    traditional: string;
  }>(`SELECT simplified,traditional FROM vocabulary WHERE is_custom=1
      AND (deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=vocabulary.deck_id AND d.deleted_at IS NULL))`);
  for (const word of customRows) {
    addWord({ simplified: word.simplified, traditional: word.traditional, hskBand: 1, frequencyRank: null });
  }

  return Array.from(ranked.values())
    .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
    .slice(0, Math.max(1, Math.min(32, Math.trunc(limit))))
    .map((item) => item.value);
}

/**
 * Searches the local dictionary by a compact, tone-insensitive pinyin prefix.
 * The filtering happens inside SQLite, so typing never hydrates the full
 * 10k+ vocabulary dataset into JavaScript.  The expression removes numeric
 * tones and spaces from the indexed pinyin_numeric value; the dedicated
 * service applies the richer target/HSK/frequency ranking afterwards.
 */
export async function findPinyinCandidates(
  db: SQLiteDatabase,
  query: string,
  limit = 40,
  includeExamples = true,
): Promise<Vocabulary[]> {
  const normalized = normalizePinyinInput(query);
  if (!normalized) return [];
  const compactPinyin = `LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(v.pinyin_numeric,'1',''),'2',''),'3',''),'4',''),'5',''),' ',''),'ü','v'))`;
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count FROM vocabulary v
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE ${compactPinyin} LIKE ?
      AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))
    ORDER BY CASE WHEN ${compactPinyin} = ? THEN 0 ELSE 1 END,
      CASE WHEN CAST(v.hsk_band AS TEXT) IN ('1','2') THEN 0 ELSE 1 END,
      COALESCE(v.frequency_rank,999999), LENGTH(v.simplified), v.pinyin_numeric
    LIMIT ?`,
    `${normalized}%`,
    normalized,
    Math.max(1, Math.min(100, Math.trunc(limit))),
  );
  const words = rows.map(mapWord);
  return includeExamples ? attachSingleExamples(db, words) : words;
}

/**
 * Finds dictionary entries by a Vietnamese/English meaning query.
 *
 * The dictionary stores a normalized search index, so this works with or
 * without Vietnamese tone marks (for example, "giao vien" also finds
 * "giáo viên"). Keeping the lookup in SQLite makes the add-word flow
 * available offline and avoids a network request on every keystroke.
 */
export async function findMeaningCandidates(
  db: SQLiteDatabase,
  meaning: string,
  limit = 8,
  includeExamples = true,
): Promise<Vocabulary[]> {
  const value = normalizeSearch(meaning.trim());
  if (!value) return [];
  const alternatives = meaningSearchAlternatives(value);
  const exactMeaning = meaning.trim().normalize("NFC");
  const exactMeaningPattern = `%${exactMeaning}%`;
  const exactNormalizedPattern = `% ${value} %`;
  const matchClause = alternatives
    .map(() => "(' ' || v.search_text || ' ') LIKE ?")
    .join(" OR ");
  const tokenTerms = value.split(" ").filter((item) => item.length >= 2);
  const tokenClause = tokenTerms
    .map(() => "(' ' || v.search_text || ' ') LIKE ?")
    .join(" AND ");
  const ranking = alternatives
    .map((_, index) => `WHEN (' ' || v.search_text || ' ') LIKE ? THEN ${index}`)
    .join(" ");
  const rows = await db.getAllAsync<DbWord>(
    `SELECT v.*,p.mastery_level,p.is_favorite,p.due,p.status,p.studied,
      p.is_known,p.next_review_at,p.review_count FROM vocabulary v
    LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
    WHERE (${matchClause}${tokenClause ? ` OR (${tokenClause})` : ""})
      AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))
    ORDER BY CASE
        WHEN v.primary_meaning_vi = ? THEN 0
        WHEN v.primary_meaning_vi LIKE ? THEN 1
        WHEN v.meanings_vi LIKE ? THEN 2
        WHEN (' ' || v.search_text || ' ') LIKE ? THEN 3
        ELSE 4
      END,
      CASE ${ranking} ELSE 99 END,
      CASE WHEN CAST(v.hsk_band AS TEXT) IN ('1','2') THEN 0 ELSE 1 END,
      COALESCE(v.frequency_rank,999999),v.pinyin_numeric LIMIT ?`,
    ...alternatives.map((item) => `% ${item} %`),
    ...tokenTerms.map((item) => `% ${item} %`),
    exactMeaning,
    exactMeaningPattern,
    exactMeaningPattern,
    exactNormalizedPattern,
    ...alternatives.map((item) => `% ${item} %`),
    Math.max(1, Math.min(256, Math.trunc(limit))),
  );
  const words = rows.map(mapWord);
  return includeExamples ? attachSingleExamples(db, words) : words;
}

function bulkIndexHskPriority(hskBand: string): number {
  const band = Number(hskBand);
  if (band === 1) return 500;
  if (band === 2) return 420;
  if (band === 3) return 330;
  if (band === 4) return 280;
  if (band === 5) return 60;
  if (band === 6) return 30;
  return 0;
}

function bulkIndexFrequencyBonus(frequencyRank: number | null): number {
  return Math.max(0, 160 - (frequencyRank ?? 80_000) / 500);
}

function compareBulkIndexRows(left: BulkLookupIndexRow, right: BulkLookupIndexRow): number {
  const level = bulkIndexHskPriority(right.hsk_band) - bulkIndexHskPriority(left.hsk_band);
  if (level !== 0) return level;
  return (left.frequency_rank ?? 999_999) - (right.frequency_rank ?? 999_999);
}

function withFallbackTimeout<T>(
  operation: () => Promise<T>,
  fallback: T,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    timer = setTimeout(() => finish(fallback), timeoutMs);
    Promise.resolve()
      .then(operation)
      .then(finish)
      .catch(() => finish(fallback));
  });
}

function addBulkIndexRow(
  index: Map<string, BulkLookupIndexRow[]>,
  key: string,
  row: BulkLookupIndexRow,
): void {
  if (!key) return;
  const bucket = index.get(key);
  if (bucket) bucket.push(row);
  else index.set(key, [row]);
}

function buildBulkLookupIndex(rows: BulkLookupIndexRow[]): BulkLookupIndex {
  const index: BulkLookupIndex = {
    rows,
    tokenRows: new Map(),
    hanziRows: new Map(),
    exactHanziRows: new Map(),
    pinyinRows: new Map(),
  };
  rows.forEach((row) => {
    for (const token of row.search_text.split(/\s+/u)) {
      if (token.length >= 2) addBulkIndexRow(index.tokenRows, token, row);
    }
    for (const value of [row.simplified, row.traditional]) {
      if (!value) continue;
      addBulkIndexRow(index.exactHanziRows, value, row);
      for (const character of Array.from(value)) {
        if (/^[\u3400-\u9fff]$/u.test(character)) {
          addBulkIndexRow(index.hanziRows, character, row);
        }
      }
    }
    if (row.pinyinCompact.length >= 2) {
      for (let length = 2; length <= Math.min(4, row.pinyinCompact.length); length += 1) {
        addBulkIndexRow(index.pinyinRows, row.pinyinCompact.slice(0, length), row);
      }
    }
  });
  return index;
}

function getBulkCandidateRows(
  query: BulkLookupQueryContext,
  index: BulkLookupIndex,
): BulkLookupIndexRow[] {
  const rows = new Map<string, BulkLookupIndexRow>();
  const addRows = (bucket: BulkLookupIndexRow[] | undefined) => {
    if (!bucket) return;
    const preferred = bucket.length > BULK_INDEX_BUCKET_LIMIT
      ? [...bucket].sort(compareBulkIndexRows).slice(0, BULK_INDEX_BUCKET_LIMIT)
      : bucket;
    preferred.forEach((row) => rows.set(row.id, row));
  };

  if (query.hasHanzi) {
    addRows(index.exactHanziRows.get(query.raw));
    for (const character of Array.from(query.raw)) {
      if (/^[\u3400-\u9fff]$/u.test(character)) addRows(index.hanziRows.get(character));
    }
  } else {
    for (const alternative of query.alternatives) {
      const buckets = alternative
        .split(/\s+/u)
        .filter((token) => token.length >= 2)
        .map((token) => index.tokenRows.get(token))
        .filter((bucket): bucket is BulkLookupIndexRow[] => Boolean(bucket));
      if (buckets.length > 1) {
        const bucketSets = buckets.map((bucket) => new Set(bucket.map((row) => row.id)));
        const smallest = [...buckets].sort((left, right) => left.length - right.length)[0] ?? [];
        const intersection = smallest.filter((row) => bucketSets.every((set) => set.has(row.id)));
        if (intersection.length) intersection.forEach((row) => rows.set(row.id, row));
        else buckets.forEach((bucket) => addRows(bucket));
      } else {
        addRows(buckets[0]);
      }
    }
    if (query.allowPinyin && query.pinyinQuery.length >= 2) {
      addRows(index.pinyinRows.get(query.pinyinQuery.slice(0, 4)));
    }
  }
  return Array.from(rows.values());
}

function createBulkLookupQueryContext(query: BulkLookupQuery): BulkLookupQueryContext {
  const raw = query.value.trim();
  const normalized = normalizeSearch(raw);
  return {
    ...query,
    raw,
    normalized,
    alternatives: meaningSearchAlternatives(normalized),
    tokens: normalized.split(" ").filter((token) => token.length >= 2),
    pinyinQuery: normalizePinyinInput(raw),
    hasHanzi: /[\u3400-\u9fff]/u.test(raw),
  };
}

function bulkIndexMatchScore(query: BulkLookupQueryContext, row: BulkLookupIndexRow): number {
  if (!query.normalized) return 0;
  const levelAndFrequency = bulkIndexHskPriority(row.hsk_band) + bulkIndexFrequencyBonus(row.frequency_rank);

  if (query.hasHanzi) {
    if (query.raw === row.simplified || query.raw === row.traditional) return 16_000 + levelAndFrequency;
    return row.simplified.includes(query.raw) || row.traditional.includes(query.raw)
      ? 10_000 + levelAndFrequency
      : 0;
  }

  const searchText = row.searchTextPadded;
  let score = 0;
  query.alternatives.forEach((alternative, index) => {
    if (searchText.includes(` ${alternative} `)) {
      score = Math.max(score, 8_000 - index * 120);
    }
  });

  const tokens = query.tokens;
  if (tokens.length) {
    const matchedTokens = tokens.filter((token) => searchText.includes(` ${token} `)).length;
    const coverage = matchedTokens / tokens.length;
    if (coverage === 1) score = Math.max(score, 7_400 + tokens.length * 80);
    else if (coverage >= 0.67) score = Math.max(score, 5_000 + matchedTokens * 80);
    else if (matchedTokens === 1) score = Math.max(score, 3_200);
  }

  if (query.allowPinyin) {
    if (query.pinyinQuery && row.pinyinCompact === query.pinyinQuery) score = Math.max(score, 7_000);
    else if (query.pinyinQuery.length >= 2 && row.pinyinCompact.startsWith(query.pinyinQuery)) score = Math.max(score, 4_200);
  }

  return score ? score + levelAndFrequency : 0;
}

/**
 * Creates one safe FTS expression for all unresolved inputs. The offline
 * index receives only IDs; candidate ranking remains in the existing
 * learner-facing scorer after full rows are fetched in bounded chunks.
 */
function createBulkFtsMatch(queries: BulkLookupQueryContext[]): string {
  const values = new Set<string>();
  for (const query of queries) {
    if (query.hasHanzi) values.add(normalizeSearch(query.raw));
    query.alternatives.forEach((value) => values.add(value));
    if (query.allowPinyin && query.pinyinQuery.length >= 2) values.add(query.pinyinQuery);
  }
  return Array.from(values)
    .map((value) => normalizeSearch(value))
    .filter((value) => value.length >= 2 || /[\u3400-\u9fff]/u.test(value))
    .slice(0, 800)
    .map((value) => value.includes(' ') ? `"${value.replace(/"/g, '""')}"` : `${value.replace(/"/g, '""')}*`)
    .join(' OR ');
}

async function findBulkFtsCandidateIds(
  db: SQLiteDatabase,
  queries: BulkLookupQueryContext[],
): Promise<string[]> {
  const match = createBulkFtsMatch(queries);
  if (!match) return [];
  if (typeof document !== 'undefined') return [];
  const rows = await withFallbackTimeout(
    () => db.getAllAsync<{ id: string }>(
      `SELECT vocabulary_search_fts.vocabulary_id AS id
       FROM vocabulary_search_fts
       JOIN vocabulary v ON v.id=vocabulary_search_fts.vocabulary_id
       WHERE vocabulary_search_fts MATCH ?
         AND (v.is_custom=1 OR (v.is_custom=0 AND v.hsk_band IN ('5','6','7-9')))
         AND (v.is_custom=0 OR v.deck_id IS NULL OR EXISTS (
           SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL
         ))
       ORDER BY bm25(vocabulary_search_fts), COALESCE(v.frequency_rank,999999)
       LIMIT ?`,
      match,
      BULK_SQL_LOOKUP_MAX_CANDIDATES,
    ),
    [],
    BULK_SQL_LOOKUP_TIMEOUT_MS,
  );
  return Array.from(new Set(rows.map((row) => row.id)));
}

async function getBulkLookupIndex(db: SQLiteDatabase): Promise<BulkLookupIndex> {
  const cached = bulkLookupIndexCache.get(db);
  if (cached) return cached;

  const promise = (async (): Promise<BulkLookupIndex> => {
    // The compact in-memory index is the fast path. It covers HSK 1-4,
    // without building an index for the 7-9 dictionary on the UI thread.
    const bands = typeof document !== 'undefined' ? undefined : ([1, 2, 3, 4] as HskBand[]);
    if (!bulkFastOfflineVocabularyCache) bulkFastOfflineVocabularyCache = getOfflineVocabulary(bands);

    const bundledRows = bulkFastOfflineVocabularyCache.map((word) => {
      const meaningsVi = cleanLearnerMeanings([word.primaryMeaningVi, ...word.meaningsVi]);
      const searchText = normalizeSearch([
        word.simplified,
        word.traditional,
        word.pinyin,
        word.pinyinNumeric,
        ...meaningsVi,
        ...word.meaningsEn,
        ...vocabularySearchAliases(word.simplified),
      ].join(" "));
      return {
        id: word.id,
        simplified: word.simplified,
        traditional: word.traditional,
        pinyin_numeric: word.pinyinNumeric,
        search_text: searchText,
        searchTextPadded: ` ${searchText} `,
        pinyinCompact: normalizePinyinInput(word.pinyinNumeric),
        hsk_band: String(word.hskBand),
        frequency_rank: word.frequencyRank,
        deck_id: null,
        word,
      } satisfies BulkLookupIndexRow;
    });

    // Custom/deck copies are not part of the immutable bundle. They are
    // usually only a handful of rows, so keep this query small and preserve
    // support for meanings edited by the learner.
    // The immutable bundled dictionary is enough to resolve the normal bulk
    // path. User-created rows are optional; never let a locked SQLite bridge
    // hold the whole analysis screen hostage.
    const customRows = await withFallbackTimeout(
      () => db.getAllAsync<BulkLookupIndexDbRow>(`SELECT id,simplified,traditional,pinyin_numeric,
        search_text,hsk_band,frequency_rank,deck_id FROM vocabulary WHERE is_custom=1`),
      [],
      BULK_CUSTOM_LOOKUP_TIMEOUT_MS,
    );
    return buildBulkLookupIndex([
      ...bundledRows,
      ...customRows.map((row) => ({
        ...row,
        searchTextPadded: ` ${row.search_text} `,
        pinyinCompact: normalizePinyinInput(row.pinyin_numeric),
      })),
    ]);
  })();
  bulkLookupIndexCache.set(db, promise);
  promise.catch(() => bulkLookupIndexCache.delete(db));
  return promise;
}

export function invalidateBulkLookupIndex(db: SQLiteDatabase): void {
  bulkLookupIndexCache.delete(db);
}

async function fetchBulkCandidatesById(
  db: SQLiteDatabase,
  ids: string[],
): Promise<Vocabulary[]> {
  const words = new Map<string, Vocabulary>();
  for (let offset = 0; offset < ids.length; offset += BULK_FETCH_ID_CHUNK_SIZE) {
    const chunk = ids.slice(offset, offset + BULK_FETCH_ID_CHUNK_SIZE);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = await withFallbackTimeout(
      () => db.getAllAsync<DbWord>(
        `SELECT v.* FROM vocabulary v
         WHERE v.id IN (${placeholders})
           AND (v.deck_id IS NULL OR EXISTS (SELECT 1 FROM personal_deck d WHERE d.id=v.deck_id AND d.deleted_at IS NULL))`,
        ...chunk,
      ),
      [],
      BULK_CUSTOM_LOOKUP_TIMEOUT_MS,
    );
    for (const row of rows) words.set(row.id, mapWord(row));
  }
  return Array.from(words.values());
}

/**
 * Uses a lightweight in-memory search index and fetches full vocabulary rows
 * only for the best candidates. The old implementation returned every row
 * matching any input line, which made common meanings transfer thousands of
 * full JSON rows across the SQLite bridge before JS ranking even started.
 */
export async function findBulkLookupCandidateGroups(
  db: SQLiteDatabase,
  queries: BulkLookupQuery[],
): Promise<Map<string, Vocabulary[]>> {
  const uniqueQueries = Array.from(
    new Map(
      queries
        .map((query) => ({ value: query.value.trim(), allowPinyin: query.allowPinyin }))
        .filter((query) => query.value)
        .map((query) => [normalizeSearch(query.value), query] as const),
  ).values(),
  );
  if (!uniqueQueries.length) return new Map();

  const contexts = uniqueQueries.map(createBulkLookupQueryContext);
  const index = await getBulkLookupIndex(db);
  const indexedCandidates = contexts.map((query) =>
    getBulkCandidateRows(query, index)
      .map((row) => ({ row, score: bulkIndexMatchScore(query, row) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score),
  );
  // Most everyday imports are HSK 1-4 and never need SQLite. Only unresolved
  // inputs enter the FTS path, avoiding expensive work for a 20-100 line list.
  const unresolvedContexts = contexts.filter(
    (_query, indexPosition) => (indexedCandidates[indexPosition]?.[0]?.score ?? 0) < 7_000,
  );
  const sqlCandidateIds = await findBulkFtsCandidateIds(db, unresolvedContexts);
  const selectedIds = new Set<string>();
  indexedCandidates.forEach((candidates) => {
    candidates
      .slice(0, BULK_INDEX_CANDIDATES_PER_QUERY)
      .forEach((item) => selectedIds.add(item.row.id));
  });
  sqlCandidateIds.forEach((id) => selectedIds.add(id));

  const bundledWords = new Map(
    index.rows
      .filter((row): row is BulkLookupIndexRow & { word: Vocabulary } => Boolean(row.word && selectedIds.has(row.id)))
      .map((row) => [row.id, row.word]),
  );
  const databaseIds = Array.from(selectedIds).filter((id) => !bundledWords.has(id));
  const databaseWords = databaseIds.length ? await fetchBulkCandidatesById(db, databaseIds) : [];
  const candidates = new Map(bundledWords);
  databaseWords.forEach((word) => candidates.set(word.id, word));
  const groups = new Map<string, Vocabulary[]>();
  contexts.forEach((context, indexPosition) => {
    const ids = new Set(
      indexedCandidates[indexPosition]
        ?.slice(0, BULK_INDEX_CANDIDATES_PER_QUERY)
        .map((item) => item.row.id) ?? [],
    );
    // FTS is only used for queries that have no strong HSK 1-4/custom match.
    // Keeping its results off other groups prevents N inputs from each
    // re-ranking a union of every candidate produced by the whole batch.
    if ((indexedCandidates[indexPosition]?.[0]?.score ?? 0) < 7_000) {
      sqlCandidateIds.forEach((id) => ids.add(id));
    }
    groups.set(
      context.normalized,
      Array.from(ids)
        .map((id) => candidates.get(id))
        .filter((word): word is Vocabulary => Boolean(word)),
    );
  });
  return groups;
}

export async function findBulkLookupCandidates(
  db: SQLiteDatabase,
  queries: BulkLookupQuery[],
): Promise<Vocabulary[]> {
  const groups = await findBulkLookupCandidateGroups(db, queries);
  const candidates = new Map<string, Vocabulary>();
  groups.forEach((group) => group.forEach((word) => candidates.set(word.id, word)));
  return Array.from(candidates.values());
}

async function syncImageAssetMetadata(db: SQLiteDatabase, vocabularyId: string, uri: string | null, now: string): Promise<void> {
  if (!uri || !/^(file|content):/i.test(uri)) {
    await db.runAsync('DELETE FROM image_assets WHERE vocabulary_id=?', vocabularyId);
    return;
  }
  const fileName = uri.split('/').pop()?.split('?')[0] ?? `${vocabularyId}.jpg`;
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' :
    ext === 'gif' ? 'image/gif' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
  await db.runAsync(`INSERT INTO image_assets(id,vocabulary_id,local_uri,mime_type,file_name,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?) ON CONFLICT(vocabulary_id) DO UPDATE SET
    local_uri=excluded.local_uri,mime_type=excluded.mime_type,file_name=excluded.file_name,
    file_size=NULL,checksum=NULL,updated_at=excluded.updated_at`,
    `image-${vocabularyId}`, vocabularyId, uri, mimeType, fileName, now, now);
}

export async function saveCustomVocabulary(
  db: SQLiteDatabase,
  input: EditableVocabulary,
): Promise<string> {
  const now = new Date().toISOString();
  const id =
    input.id ??
    `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const meanings = input.meaningsVi.map((item) => item.trim()).filter(Boolean);
  const meaningsEn = input.meaningsEn.map((item) => item.trim()).filter(Boolean);
  const pinyinNumeric =
    input.pinyinNumeric?.trim() || normalizeSearch(input.pinyin);
  const illustration = input.imageUri
    ? null
    : illustrationForVocabulary({
        simplified: input.simplified,
        traditional: input.traditional?.trim() || input.simplified,
      });
  // A photo explicitly selected from the device always wins.  Automatic
  // photos are only used when they are a curated exact Hanzi match.
  const imageUri = input.imageUri ?? illustration?.uri ?? null;
  const imageSource = input.imageUri ? "Người dùng chọn" : illustration?.source ?? null;
  const imageLicense = input.imageUri ? null : illustration?.license ?? null;
  const imageAttribution = input.imageUri ? null : illustration?.attribution ?? null;
  const searchText = normalizeSearch(
    [
      input.simplified,
      input.traditional,
      input.pinyin,
      pinyinNumeric,
      ...meanings,
      ...meaningsEn,
      ...vocabularySearchAliases(input.simplified.trim()),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const providedExample = input.examples.find(
    (example) =>
      example.chinese.trim() &&
      example.pinyin.trim() &&
      example.vietnamese.trim(),
  );
  const generatedExample = createContextualExample({
    id,
    simplified: input.simplified.trim(),
    pinyin: input.pinyin.trim(),
    pinyinNumeric,
    primaryMeaningVi: meanings[0] ?? "từ này",
    pos: input.pos,
    hskBand: input.hskBand,
  });
  const example = providedExample ?? generatedExample;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,
      meanings_vi,meanings_en,pos,hsk_band,frequency_rank,classifiers,radical,stroke_count,visual_type,image_uri,
      image_source,image_license,image_attribution,audio_uri,source,source_version,source_url,translation_status,
      search_text,is_custom,deck_id,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,NULL,'[]',NULL,NULL,?,?,?,?,?,NULL,'Người dùng','1','','verified',?,1,?,?,?)
      ON CONFLICT(id) DO UPDATE SET simplified=excluded.simplified,traditional=excluded.traditional,pinyin=excluded.pinyin,
      pinyin_numeric=excluded.pinyin_numeric,primary_meaning_vi=excluded.primary_meaning_vi,meanings_vi=excluded.meanings_vi,
      meanings_en=excluded.meanings_en,pos=excluded.pos,hsk_band=excluded.hsk_band,visual_type=excluded.visual_type,image_uri=excluded.image_uri,
      image_source=excluded.image_source,image_license=excluded.image_license,image_attribution=excluded.image_attribution,
      search_text=excluded.search_text,deck_id=excluded.deck_id,updated_at=excluded.updated_at`,
      id,
      input.simplified.trim(),
      input.traditional?.trim() || input.simplified.trim(),
      input.pinyin.trim(),
      pinyinNumeric,
      meanings[0] ?? "",
      JSON.stringify(meanings),
      JSON.stringify(meaningsEn),
      JSON.stringify(input.pos),
      String(input.hskBand),
      imageUri ? "image" : "none",
      imageUri,
      imageSource,
      imageLicense,
      imageAttribution,
      searchText,
      input.deckId,
      now,
      now,
    );
    await syncImageAssetMetadata(db, id, imageUri, now);
    await db.runAsync("DELETE FROM example_sentence WHERE vocabulary_id=?", id);
    if (example) await db.runAsync(
      `INSERT INTO example_sentence(id,vocabulary_id,chinese,pinyin,vietnamese,difficulty)
      VALUES(?,?,?,?,?,1)`,
      `${id}-ex-1`,
      id,
      example.chinese.trim(),
      example.pinyin.trim(),
      example.vietnamese.trim(),
    );
    await replaceVocabularyCharacterIndex(
      db,
      id,
      input.simplified.trim(),
      input.traditional?.trim() || input.simplified.trim(),
    );
    await db.runAsync(
      "UPDATE personal_deck SET updated_at=? WHERE id=?",
      now,
      input.deckId,
    );
  });
  invalidateBulkLookupIndex(db);
  return id;
}

/**
 * Copies resolved dictionary entries into one personal deck in a single
 * transaction. Existing copies with the same Hanzi + pinyin are skipped so a
 * repeated bulk import is safe and fast.
 */
export async function copyVocabularyBatchToDeck(
  db: SQLiteDatabase,
  deckId: string,
  words: Vocabulary[],
): Promise<{ saved: number; skipped: number }> {
  const cleanDeckId = deckId.trim();
  if (!cleanDeckId || !words.length) return { saved: 0, skipped: 0 };
  const existing = await db.getAllAsync<{ simplified: string; pinyin_numeric: string }>(
    "SELECT simplified,pinyin_numeric FROM vocabulary WHERE deck_id=?",
    cleanDeckId,
  );
  const keys = new Set(
    existing.map((item) => `${item.simplified}|${normalizeSearch(item.pinyin_numeric)}`),
  );
  const unique = words.filter((word) => {
    const key = `${word.simplified}|${normalizeSearch(word.pinyinNumeric || word.pinyin)}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const [index, word] of unique.entries()) {
      const id = `custom-bulk-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
      const example = withContextualExamples({ ...word, id }).examples[0];
      const meanings = word.meaningsVi.length ? word.meaningsVi : [word.primaryMeaningVi];
      // Bulk dictionaries and shared decks must never bring a generic or
      // unrelated remote image into a new card.  Keep only exact, curated
      // illustrations; users can still attach their own image in word edit.
      const illustration = illustrationForVocabulary(word);
      const imageUri = illustration?.uri ?? null;
      const imageSource = illustration?.source ?? null;
      const imageLicense = illustration?.license ?? null;
      const imageAttribution = illustration?.attribution ?? null;
      const searchText = normalizeSearch(
        [
          word.simplified,
          word.traditional,
          word.pinyin,
          word.pinyinNumeric,
          ...meanings,
          ...word.meaningsEn,
          ...vocabularySearchAliases(word.simplified),
        ].join(" "),
      );
      await db.runAsync(
        `INSERT INTO vocabulary(id,simplified,traditional,pinyin,pinyin_numeric,primary_meaning_vi,
        meanings_vi,meanings_en,pos,hsk_band,frequency_rank,classifiers,radical,stroke_count,visual_type,image_uri,
        image_source,image_license,image_attribution,audio_uri,source,source_version,source_url,translation_status,
        search_text,is_custom,deck_id,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)`,
        id,
        word.simplified,
        word.traditional || word.simplified,
        word.pinyin,
        word.pinyinNumeric,
        meanings[0] ?? "",
        JSON.stringify(meanings),
        JSON.stringify(word.meaningsEn),
        JSON.stringify(word.pos),
        String(word.hskBand),
        word.frequencyRank,
        JSON.stringify(word.classifiers),
        word.radical,
        word.strokeCount,
        imageUri ? "image" : "none",
        imageUri,
        imageSource,
        imageLicense,
        imageAttribution,
        word.audioUri,
        `${word.source}; bản sao bộ từ cá nhân`,
        word.sourceVersion,
        word.sourceUrl,
        word.translationStatus,
        searchText,
        cleanDeckId,
        now,
        now,
      );
      if (example) await db.runAsync(
        `INSERT INTO example_sentence(id,vocabulary_id,chinese,pinyin,vietnamese,english,difficulty)
        VALUES(?,?,?,?,?,?,?)`,
        `${id}-ex-1`,
        id,
        example.chinese,
        example.pinyin,
        example.vietnamese,
        example.english ?? null,
        example.difficulty,
      );
      await replaceVocabularyCharacterIndex(db, id, word.simplified, word.traditional || word.simplified);
    }
    if (unique.length) {
      await db.runAsync(
        "UPDATE personal_deck SET updated_at=? WHERE id=?",
        now,
        cleanDeckId,
      );
    }
  });
  invalidateBulkLookupIndex(db);
  return { saved: unique.length, skipped: words.length - unique.length };
}

export async function updateVocabularyContent(
  db: SQLiteDatabase,
  id: string,
  input: {
    pinyin: string;
    meaningsVi: string[];
    meaningsEn: string[];
    pos: string[];
    imageUri?: string | null;
  },
): Promise<void> {
  const meanings = input.meaningsVi.map((item) => item.trim()).filter(Boolean);
  const meaningsEn = input.meaningsEn.map((item) => item.trim()).filter(Boolean);
  const source = await db.getFirstAsync<{
    simplified: string;
    traditional: string;
    meanings_en: string;
  }>("SELECT simplified,traditional,meanings_en FROM vocabulary WHERE id=?", id);
  const searchText = normalizeSearch(
    [
      source?.simplified,
      source?.traditional,
      input.pinyin,
      ...meanings,
      ...meaningsEn,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
    `UPDATE vocabulary SET pinyin=?,pinyin_numeric=?,primary_meaning_vi=?,meanings_vi=?,meanings_en=?,pos=?,
    image_uri=?,visual_type=?,translation_status='verified',updated_at=?,search_text=? WHERE id=?`,
    input.pinyin.trim(),
    normalizeSearch(input.pinyin),
    meanings[0] ?? "",
    JSON.stringify(meanings),
    JSON.stringify(meaningsEn),
    JSON.stringify(input.pos),
    input.imageUri ?? null,
    input.imageUri ? "image" : "none",
    now,
    searchText,
    id,
    );
    await syncImageAssetMetadata(db, id, input.imageUri ?? null, now);
  });
  invalidateBulkLookupIndex(db);
}

export async function setKnown(
  db: SQLiteDatabase,
  vocabularyId: string,
  known: boolean,
): Promise<void> {
  const now = new Date();
  const progress = await getProgress(db, vocabularyId);
  if (known) {
    const next = new Date(now.getTime() + 14 * 86_400_000).toISOString();
    if (progress) {
      await db.runAsync(
        `UPDATE user_vocabulary_progress SET state=?,status='KNOWN',studied=1,
        is_known=1,is_suspended=0,memory_level=0,mastery_level=0,deep_memory_stage=0,
        learned_at=NULL,next_review_at=?,due=?,updated_at=? WHERE vocabulary_id=?`,
        LEGACY_STATE.New,
        next,
        next,
        now.toISOString(),
        vocabularyId,
      );
    } else {
      await upsertProgress(
        db,
        vocabularyId,
        {
          ...emptySrsProgress(),
          status: "KNOWN",
          studied: true,
          memoryLevel: 0,
          nextReviewAt: next,
          isKnown: true,
        },
        false,
        now,
        false,
        { status: "KNOWN", studied: true, learnedAt: null },
      );
    }
  } else if (progress?.status === "KNOWN" || progress?.isKnown) {
    await db.runAsync(
      `UPDATE user_vocabulary_progress SET state=?,status='NEW',studied=0,
      is_known=0,is_suspended=0,memory_level=0,mastery_level=0,deep_memory_stage=0,
      learned_at=NULL,next_review_at=?,due=?,updated_at=? WHERE vocabulary_id=?`,
      LEGACY_STATE.New,
      now.toISOString(),
      now.toISOString(),
      now.toISOString(),
      vocabularyId,
    );
  }
}

/** Mark a word as skipped without treating it as learned or due for review. */
export async function setSkipped(
  db: SQLiteDatabase,
  vocabularyId: string,
): Promise<void> {
  const progress = await getProgress(db, vocabularyId);
  const now = new Date().toISOString();
  if (progress) {
    await db.runAsync(
      `UPDATE user_vocabulary_progress SET state=?,status='SKIPPED',studied=0,
      is_known=0,is_suspended=1,memory_level=0,mastery_level=0,deep_memory_stage=0,
      learned_at=NULL,next_review_at=?,due=?,updated_at=? WHERE vocabulary_id=?`,
      LEGACY_STATE.New,
      now,
      now,
      now,
      vocabularyId,
    );
  } else {
    await upsertProgress(
      db,
      vocabularyId,
      {
        ...emptySrsProgress(),
        status: "SKIPPED",
        studied: false,
        memoryLevel: 0,
        nextReviewAt: now,
        isKnown: false,
      },
      false,
      new Date(now),
      false,
      { status: "SKIPPED", studied: false, learnedAt: null, suspended: true },
    );
  }
}

/** Restore a skipped word to the untouched NEW queue. */
export async function restoreSkipped(
  db: SQLiteDatabase,
  vocabularyId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE user_vocabulary_progress SET state=?,status='NEW',studied=0,
    is_known=0,is_suspended=0,memory_level=0,mastery_level=0,deep_memory_stage=0,
    learned_at=NULL,next_review_at=?,due=?,updated_at=?
    WHERE vocabulary_id=? AND status='SKIPPED'`,
    LEGACY_STATE.New,
    now,
    now,
    now,
    vocabularyId,
  );
}

export async function setSuspended(
  db: SQLiteDatabase,
  vocabularyId: string,
  suspended: boolean,
): Promise<void> {
  const progress = await getProgress(db, vocabularyId);
  const now = new Date();
  if (progress)
    await db.runAsync(
      "UPDATE user_vocabulary_progress SET is_suspended=?,updated_at=? WHERE vocabulary_id=?",
      suspended ? 1 : 0,
      now.toISOString(),
      vocabularyId,
    );
  else
    await upsertProgress(
      db,
      vocabularyId,
      emptySrsProgress(),
      false,
      now,
      true,
      { suspended },
    );
}

type ProgressUpdate = Pick<
  ReviewTransition,
  | "memoryLevel"
  | "deepMemoryStage"
  | "nextReviewAt"
  | "reviewCount"
  | "correctCount"
  | "wrongCount"
  | "lapseCount"
  | "consecutiveCorrect"
  | "consecutiveWrong"
  | "hintUsedCount"
  | "averageResponseTimeMs"
  | "lastResponseTimeMs"
  | "isKnown"
> & {
  status?: WordStatus;
  studied?: boolean;
  learnedAt?: string | null;
};

async function upsertProgress(
  db: SQLiteDatabase,
  id: string,
  progress: ProgressUpdate,
  favorite: boolean,
  now: Date,
  isNew: boolean,
  options: {
    status?: WordStatus;
    studied?: boolean;
    learnedAt?: string | null;
    suspended?: boolean;
  } = {},
) {
  const iso = now.toISOString();
  const status: WordStatus =
    options.status ?? progress.status ?? (progress.isKnown ? "KNOWN" : progress.memoryLevel > 0 ? "LEARNING" : "NEW");
  const studied = options.studied ?? progress.studied ?? status === "LEARNING";
  const suspended = options.suspended ?? status === "SKIPPED";
  const memoryLevel = status === "LEARNING" ? progress.memoryLevel : 0;
  const learnedAt =
    status === "LEARNING"
      ? options.learnedAt ?? progress.learnedAt ?? iso
      : null;
  const state =
    status === "LEARNING"
      ? progress.reviewCount > 0
        ? LEGACY_STATE.Review
        : LEGACY_STATE.Learning
      : LEGACY_STATE.New;
  await db.runAsync(
    `INSERT INTO user_vocabulary_progress
    (vocabulary_id,state,status,studied,due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,last_review,
    mastery_level,is_known,is_favorite,is_suspended,notes,memory_level,deep_memory_stage,learned_at,next_review_at,
    review_count,correct_count,wrong_count,lapse_count,consecutive_correct,consecutive_wrong,hint_used_count,
    average_response_time_ms,last_response_time_ms,created_at,updated_at)
    VALUES($id,$state,$status,$studied,$due,0,0,0,0,0,$reps,$lapses,$lastReview,$level,$known,$favorite,$suspended,'',
      $level,$stage,$learnedAt,$next,$reviews,$correct,$wrong,$lapses,$consecutiveCorrect,$consecutiveWrong,$hints,$average,$last,$created,$updated)
    ON CONFLICT(vocabulary_id) DO UPDATE SET state=excluded.state,status=excluded.status,studied=excluded.studied,
      due=excluded.due,reps=excluded.reps,lapses=excluded.lapses,last_review=excluded.last_review,
      mastery_level=excluded.mastery_level,is_known=excluded.is_known,is_suspended=excluded.is_suspended,
      memory_level=excluded.memory_level,deep_memory_stage=excluded.deep_memory_stage,
      learned_at=CASE WHEN excluded.status='LEARNING' THEN COALESCE(user_vocabulary_progress.learned_at,excluded.learned_at) ELSE excluded.learned_at END,
      next_review_at=excluded.next_review_at,review_count=excluded.review_count,correct_count=excluded.correct_count,
      wrong_count=excluded.wrong_count,lapse_count=excluded.lapse_count,consecutive_correct=excluded.consecutive_correct,
      consecutive_wrong=excluded.consecutive_wrong,hint_used_count=excluded.hint_used_count,
      average_response_time_ms=excluded.average_response_time_ms,last_response_time_ms=excluded.last_response_time_ms,
      updated_at=excluded.updated_at`,
    {
      $id: id,
      $state: state,
      $status: status,
      $studied: studied ? 1 : 0,
      $due: progress.nextReviewAt,
      $reps: progress.reviewCount,
      $lapses: progress.lapseCount,
      $lastReview: progress.reviewCount > 0 ? iso : null,
      $level: memoryLevel,
      $known: status === "KNOWN" ? 1 : 0,
      $favorite: favorite ? 1 : 0,
      $suspended: suspended ? 1 : 0,
      $stage: status === "LEARNING" ? progress.deepMemoryStage : 0,
      $learnedAt: learnedAt,
      $next: progress.nextReviewAt,
      $reviews: progress.reviewCount,
      $correct: progress.correctCount,
      $wrong: progress.wrongCount,
      $consecutiveCorrect: progress.consecutiveCorrect,
      $consecutiveWrong: progress.consecutiveWrong,
      $hints: progress.hintUsedCount,
      $average: progress.averageResponseTimeMs,
      $last: progress.lastResponseTimeMs,
      $created: iso,
      $updated: iso,
    },
  );
  if (isNew && status === "LEARNING") {
    await db.runAsync(
      `INSERT INTO daily_stats(date,reviewed,correct,new_words,study_seconds) VALUES(?,0,0,1,0)
    ON CONFLICT(date) DO UPDATE SET new_words=new_words+1`,
      toLocalDateKey(now),
    );
    await awardActivityXp(db, 'learn', id, now);
  }
}

function mapWord(row: DbWord): Vocabulary {
  const status = normalizeStatus(row.status, row.mastery_level ?? 0, row.studied, row.is_known);
  return {
    id: row.id,
    simplified: row.simplified,
    traditional: row.traditional,
    pinyin: row.pinyin,
    pinyinNumeric: row.pinyin_numeric,
    primaryMeaningVi: row.primary_meaning_vi,
    meaningsVi: parseArray(row.meanings_vi),
    meaningsEn: parseArray(row.meanings_en),
    pos: parseArray(row.pos),
    hskBand: row.hsk_band === "7-9" ? "7-9" : (Number(row.hsk_band) as HskBand),
    frequencyRank: row.frequency_rank,
    classifiers: parseArray(row.classifiers),
    radical: row.radical,
    strokeCount: row.stroke_count,
    visualType: row.visual_type,
    imageUri: row.image_uri,
    imageSource: row.image_source,
    imageLicense: row.image_license,
    imageAttribution: row.image_attribution,
    audioUri: row.audio_uri,
    source: row.source,
    sourceVersion: row.source_version,
    sourceUrl: row.source_url,
    translationStatus: row.translation_status,
    examples: [],
    masteryLevel: status === "LEARNING" ? row.mastery_level ?? 0 : 0,
    status,
    studied: row.studied === 1 || status === "LEARNING" || status === "KNOWN",
    nextReviewAt: row.next_review_at ?? row.due ?? null,
    reviewCount: row.review_count ?? 0,
    isFavorite: row.is_favorite === 1,
    due: row.due ?? null,
    isCustom: row.is_custom === 1,
    deckId: row.deck_id,
  };
}

async function attachSingleExamples(
  db: SQLiteDatabase,
  words: Vocabulary[],
): Promise<Vocabulary[]> {
  if (!words.length) return words;
  const ids = words.map((word) => word.id);
  const rows = await db.getAllAsync<{
    id: string;
    vocabulary_id: string;
    chinese: string;
    pinyin: string;
    vietnamese: string;
    english: string | null;
    difficulty: number;
  }>(
    `SELECT id,vocabulary_id,chinese,pinyin,vietnamese,english,difficulty
    FROM example_sentence WHERE vocabulary_id IN (${ids.map(() => "?").join(",")})
    ORDER BY vocabulary_id,difficulty,id`,
    ...ids,
  );
  const examples = new Map<string, Vocabulary["examples"][number]>();
  const simplifiedById = new Map(words.map((word) => [word.id, word.simplified]));
  for (const row of rows) {
    if (examples.has(row.vocabulary_id)) continue;
    const example = {
      id: row.id,
      vocabularyId: row.vocabulary_id,
      chinese: row.chinese,
      pinyin: row.pinyin,
      vietnamese: row.vietnamese,
      english: row.english ?? undefined,
      difficulty: row.difficulty,
    };
    if (isGenericContextualExample({ simplified: simplifiedById.get(row.vocabulary_id) ?? "" }, example)) continue;
    examples.set(row.vocabulary_id, example);
  }
  return words.map((word) =>
    withSingleContextualExample({
      ...word,
      examples: examples.has(word.id) ? [examples.get(word.id)!] : [],
    }),
  );
}

function mapProgress(row: DbProgress): ProgressRow {
  const status = normalizeStatus(row.status, row.memory_level, row.studied, row.is_known);
  return {
    vocabularyId: row.vocabulary_id,
    status,
    studied: row.studied === 1 || status === "LEARNING" || status === "KNOWN",
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.last_review,
    lastReviewAt: row.last_review,
    masteryLevel: status === "LEARNING" ? row.memory_level : 0,
    isKnown: status === "KNOWN" || row.is_known === 1,
    isFavorite: row.is_favorite === 1,
    isSuspended: row.is_suspended === 1,
    memoryLevel: status === "LEARNING" ? row.memory_level : 0,
    deepMemoryStage: row.deep_memory_stage,
    learnedAt: row.learned_at,
    nextReviewAt: row.next_review_at,
    reviewCount: row.review_count,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    lapseCount: row.lapse_count,
    consecutiveCorrect: row.consecutive_correct,
    consecutiveWrong: row.consecutive_wrong,
    hintUsedCount: row.hint_used_count,
    averageResponseTimeMs: row.average_response_time_ms,
    lastResponseTimeMs: row.last_response_time_ms,
  };
}

function normalizeStatus(
  value: string | null | undefined,
  memoryLevel: number,
  studied: number | null | undefined,
  known: number | null | undefined,
): WordStatus {
  if (value === "NEW" || value === "LEARNING" || value === "KNOWN" || value === "SKIPPED") {
    return value;
  }
  if (known === 1) return "KNOWN";
  if (studied === 1 || memoryLevel > 0) return "LEARNING";
  return "NEW";
}

function emptySrsProgress() {
  const now = new Date().toISOString();
  return {
    status: "NEW" as WordStatus,
    studied: false,
    memoryLevel: 0,
    deepMemoryStage: 0,
    nextReviewAt: now,
    reviewCount: 0,
    correctCount: 0,
    wrongCount: 0,
    lapseCount: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    hintUsedCount: 0,
    averageResponseTimeMs: 0,
    lastResponseTimeMs: 0,
    isKnown: false,
  };
}
function ratingNumber(rating: ReviewInput["rating"], correct: boolean) {
  return rating === "again"
    ? 1
    : rating === "hard"
      ? 2
      : rating === "easy"
        ? 4
        : correct
          ? 3
          : 1;
}

function parseArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
