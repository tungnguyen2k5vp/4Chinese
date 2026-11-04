import type { SQLiteDatabase } from 'expo-sqlite';

const bands = ['1', '2', '3', '4', '5', '6', '7-9'] as const;
const vocabularyChunkSize = 50;
const advancedVocabularyChunkSize = 100;
const lessonsPerVocabularyUnit = 5;

export type LearningVocabularyBatch = { band: string; offset: number; limit: number };

export function parseLearningVocabularyTarget(target: string | null | undefined): LearningVocabularyBatch | null {
  if (!target) return null;
  const match = /^(1|2|3|4|5|6|7-9):(\d+):(\d+)$/u.exec(target);
  if (!match) return null;
  const [, band, rawOffset, rawLimit] = match;
  const offset = Number(rawOffset);
  const limit = Number(rawLimit);
  if (!band || !Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > advancedVocabularyChunkSize) return null;
  return { band, offset, limit };
}

export type LearningCourse = { id: string; title: string; description: string; hsk_band: string;
  total_lessons: number; completed_lessons: number; earned_xp: number };
export type LearningLesson = { id: string; course_id: string; unit_title: string; title: string;
  estimated_minutes: number; xp_reward: number; status: 'IN_PROGRESS' | 'COMPLETED' | null;
  sort_order: number };
export type LearningActivity = { id: string; activity_type: 'VOCABULARY' | 'GRAMMAR' | 'LISTENING' |
  'SPEAKING' | 'READING' | 'HANZI' | 'QUIZ'; title: string; target: string | null };
type CurriculumSkill = { key: string; title: string; type: LearningActivity['activity_type'];
  activityTitle: string; target: string | null };
export type LessonActivityEvidenceType = 'VOCABULARY_DETAIL_VIEWED' | 'READING_TOKENS_ANALYZED' |
  'GRAMMAR_CORRECT_ANSWER' | 'HANZI_STROKE_DRAWN' | 'REVIEW_ATTEMPT_RECORDED';

const evidenceByActivity: Record<LearningActivity['activity_type'], LessonActivityEvidenceType> = {
  VOCABULARY: 'VOCABULARY_DETAIL_VIEWED', GRAMMAR: 'GRAMMAR_CORRECT_ANSWER',
  LISTENING: 'REVIEW_ATTEMPT_RECORDED', SPEAKING: 'REVIEW_ATTEMPT_RECORDED',
  READING: 'READING_TOKENS_ANALYZED', HANZI: 'HANZI_STROKE_DRAWN', QUIZ: 'REVIEW_ATTEMPT_RECORDED',
};

/** Stable IDs and INSERT OR IGNORE keep local curriculum additions/progress intact. */
export async function seedLearningPath(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const course = await db.prepareAsync(`INSERT OR IGNORE INTO courses
      (id,title,description,hsk_band,sort_order,created_at) VALUES(?,?,?,?,?,?)`);
    const unit = await db.prepareAsync(`INSERT OR IGNORE INTO units(id,course_id,title,sort_order) VALUES(?,?,?,?)`);
    const lesson = await db.prepareAsync(`INSERT OR IGNORE INTO lessons
      (id,unit_id,title,estimated_minutes,xp_reward,sort_order) VALUES(?,?,?,?,?,?)`);
    const activity = await db.prepareAsync(`INSERT OR IGNORE INTO lesson_activities
      (id,lesson_id,activity_type,title,target,sort_order) VALUES(?,?,?,?,?,?)`);
    try {
      for (const [index, band] of bands.entries()) {
        const courseId = `hsk-${band}-path`;
        const unitId = `hsk-${band}-unit-1`;
        const firstId = `hsk-${band}-lesson-1`;
        const secondId = `hsk-${band}-lesson-2`;
        await course.executeAsync([courseId, `HSK ${band}`, 'Từ vựng, đọc và ôn luyện từng chặng.', band, index, '2026-09-27T00:00:00.000Z']);
        await unit.executeAsync([unitId, courseId, 'Nền tảng', 0]);
        await lesson.executeAsync([firstId, unitId, 'Khám phá từ và ngữ cảnh', 15, 20, 0]);
        await lesson.executeAsync([secondId, unitId, 'Viết và ôn tập', 15, 20, 1]);
        await activity.executeAsync([`${firstId}-vocab`, firstId, 'VOCABULARY', 'Xem từ HSK', band, 0]);
        await activity.executeAsync([`${firstId}-reader`, firstId, 'READING', 'Đọc và tra từ', null, 1]);
        await activity.executeAsync([`${firstId}-grammar`, firstId, 'GRAMMAR', 'Xem ngữ pháp', null, 2]);
        await activity.executeAsync([`${secondId}-hanzi`, secondId, 'HANZI', 'Luyện viết Hán tự', null, 0]);
        await activity.executeAsync([`${secondId}-quiz`, secondId, 'QUIZ', 'Ôn tập từ đã học', null, 1]);
      }
    } finally {
      await Promise.all([course.finalizeAsync(), unit.finalizeAsync(), lesson.finalizeAsync(), activity.finalizeAsync()]);
    }
  });
  await seedExpandedLearningPath(db);
}

/** Adds stable, bounded word lessons and actionable skill practice without touching old progress. */
async function seedExpandedLearningPath(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const unit = await db.prepareAsync('INSERT OR IGNORE INTO units(id,course_id,title,sort_order) VALUES(?,?,?,?)');
    const lesson = await db.prepareAsync(`INSERT OR IGNORE INTO lessons
      (id,unit_id,title,estimated_minutes,xp_reward,sort_order) VALUES(?,?,?,?,?,?)`);
    const activity = await db.prepareAsync(`INSERT OR IGNORE INTO lesson_activities
      (id,lesson_id,activity_type,title,target,sort_order) VALUES(?,?,?,?,?,?)`);
    try {
      for (const band of bands) {
        const courseId = 'hsk-' + band + '-path';
        const wordCount = await db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM (
          SELECT v.simplified,LOWER(REPLACE(v.pinyin,' ','')) AS pinyin_key,
            ROW_NUMBER() OVER (PARTITION BY v.simplified,LOWER(REPLACE(v.pinyin,' ',''))
              ORDER BY CASE WHEN COALESCE(p.studied,0)=1 OR p.status='KNOWN' THEN 0 ELSE 1 END,
                COALESCE(p.memory_level,0) DESC,COALESCE(p.review_count,0) DESC,
                COALESCE(p.updated_at,v.updated_at,v.created_at,'') DESC,v.id) AS identity_rank
          FROM vocabulary v LEFT JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
          WHERE v.hsk_band=? AND (v.deck_id IS NULL OR EXISTS (
            SELECT 1 FROM personal_deck_vocabulary m JOIN personal_deck d ON d.id=m.deck_id
            WHERE m.vocabulary_id=v.id AND d.deleted_at IS NULL))) unique_hsk_words
          WHERE identity_rank=1`, band);
        const totalWords = Math.max(0, Number(wordCount?.total ?? 0));
        const chunkSize = band === '7-9' ? advancedVocabularyChunkSize : vocabularyChunkSize;
        const pageCount = Math.ceil(totalWords / chunkSize);
        const unitCount = Math.ceil(pageCount / lessonsPerVocabularyUnit);
        const grammarRows = band === '7-9'
          ? await db.getAllAsync<{ id: string; title: string }>(`SELECT id,title FROM grammar_points
            WHERE is_active=1 AND id NOT GLOB 'v5-*' AND hsk_level IN ('7','8','9','7-9') ORDER BY CAST(hsk_level AS INTEGER),difficulty,id`)
          : await db.getAllAsync<{ id: string; title: string }>(`SELECT id,title FROM grammar_points
            WHERE is_active=1 AND id NOT GLOB 'v5-*' AND hsk_level=? ORDER BY difficulty,id`, band);

        for (let page = 0; page < pageCount; page++) {
          const group = Math.floor(page / lessonsPerVocabularyUnit) + 1;
          const unitId = 'hsk-' + band + '-unit-words-' + group;
          const lessonId = 'hsk-' + band + '-words-' + (page + 1);
          const offset = page * chunkSize;
          const limit = Math.min(chunkSize, totalWords - offset);
          const firstWord = offset + 1;
          const lastWord = offset + limit;
          await unit.executeAsync([unitId, courseId, 'Từ vựng HSK ' + band + ' · chặng ' + group, group]);
          await lesson.executeAsync([lessonId, unitId,
            'Từ vựng ' + firstWord + '–' + lastWord + ' · HSK ' + band, 12, 15, page % lessonsPerVocabularyUnit]);
          await activity.executeAsync([lessonId + '-vocab', lessonId, 'VOCABULARY', 'Học nhóm từ này',
            band + ':' + offset + ':' + limit, 0]);
        }

        if (grammarRows.length) {
          const grammarUnitId = 'hsk-' + band + '-unit-grammar';
          await unit.executeAsync([grammarUnitId, courseId, 'Ngữ pháp trọng điểm HSK ' + band, unitCount + 1]);
          for (const [index, grammar] of grammarRows.entries()) {
            const lessonId = 'hsk-' + band + '-grammar-' + grammar.id;
            await lesson.executeAsync([lessonId, grammarUnitId, 'Ngữ pháp · ' + grammar.title, 12, 15, index]);
            await activity.executeAsync([lessonId + '-practice', lessonId, 'GRAMMAR', 'Học và luyện cấu trúc', grammar.id, 0]);
          }
        }

        const skills: CurriculumSkill[] = [];
        skills.push(
          { key: 'listening', title: 'Nghe hiểu và nhận diện thanh điệu', type: 'LISTENING', activityTitle: 'Nghe rồi chọn thanh điệu', target: null },
          { key: 'speaking', title: 'Nói theo câu mẫu', type: 'SPEAKING', activityTitle: 'Nghe mẫu và tự ghi âm', target: null },
          { key: 'reading', title: 'Đọc hiểu từ trong ngữ cảnh', type: 'READING', activityTitle: 'Đọc câu và tra từ mới', target: null },
          { key: 'writing', title: 'Nhận biết và viết Hán tự', type: 'HANZI', activityTitle: 'Luyện viết chữ Hán', target: null },
        );
        const skillsUnitId = 'hsk-' + band + '-unit-skills';
        await unit.executeAsync([skillsUnitId, courseId, 'Kỹ năng và tổng ôn', unitCount + (grammarRows.length ? 2 : 1)]);
        for (const [index, skill] of skills.entries()) {
          const lessonId = 'hsk-' + band + '-skill-' + skill.key;
          await lesson.executeAsync([lessonId, skillsUnitId, skill.title, 15, 20, index]);
          await activity.executeAsync([lessonId + '-activity', lessonId, skill.type, skill.activityTitle, skill.target, 0]);
        }
      }
    } finally {
      await Promise.all([unit.finalizeAsync(), lesson.finalizeAsync(), activity.finalizeAsync()]);
    }
  });
}

export async function listLearningCourses(db: SQLiteDatabase): Promise<LearningCourse[]> {
  return db.getAllAsync<LearningCourse>(`SELECT c.id,c.title,c.description,c.hsk_band,
    COUNT(l.id) AS total_lessons,
    SUM(CASE WHEN lp.status='COMPLETED' THEN 1 ELSE 0 END) AS completed_lessons,
    SUM(CASE WHEN lp.status='COMPLETED' THEN l.xp_reward ELSE 0 END) AS earned_xp
    FROM courses c LEFT JOIN units u ON u.course_id=c.id
    LEFT JOIN lessons l ON l.unit_id=u.id LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id
    GROUP BY c.id ORDER BY c.sort_order,c.id`);
}

export async function listLearningLessons(db: SQLiteDatabase, courseId: string): Promise<LearningLesson[]> {
  return db.getAllAsync<LearningLesson>(`SELECT l.id,u.course_id,u.title AS unit_title,l.title,
    l.estimated_minutes,l.xp_reward,lp.status,l.sort_order
    FROM lessons l JOIN units u ON u.id=l.unit_id
    LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id
    WHERE u.course_id=? ORDER BY u.sort_order,l.sort_order,l.id`, courseId);
}

export async function listLessonActivities(db: SQLiteDatabase, lessonId: string): Promise<LearningActivity[]> {
  return db.getAllAsync<LearningActivity>(`SELECT id,activity_type,title,target FROM lesson_activities
    WHERE lesson_id=? ORDER BY sort_order,id`, lessonId);
}

export async function listCompletedLessonActivityIds(
  db: SQLiteDatabase,
  lessonId: string,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ activity_id: string }>(`SELECT ap.activity_id
    FROM lesson_activity_progress ap
    JOIN lesson_activities a ON a.id=ap.activity_id
    WHERE a.lesson_id=? ORDER BY a.sort_order,a.id`, lessonId);
  return rows.map((row) => row.activity_id);
}

export async function recordLessonActivityEvidence(
  db: SQLiteDatabase, activityId: string, evidenceType: LessonActivityEvidenceType, sourceId: string,
): Promise<void> {
  const activity = await db.getFirstAsync<Pick<LearningActivity, 'id' | 'activity_type'>>(
    'SELECT id,activity_type FROM lesson_activities WHERE id=?', activityId,
  );
  if (!activity) throw new Error('LESSON_ACTIVITY_NOT_FOUND');
  if (evidenceByActivity[activity.activity_type] !== evidenceType) throw new Error('LESSON_ACTIVITY_EVIDENCE_MISMATCH');
  if (!sourceId.trim()) throw new Error('LESSON_ACTIVITY_EVIDENCE_SOURCE_REQUIRED');
  await db.runAsync(`INSERT INTO lesson_activity_progress(activity_id,completed_at)
    VALUES(?,?) ON CONFLICT(activity_id) DO NOTHING`, activityId, new Date().toISOString());
}

export async function getLessonCourseId(db: SQLiteDatabase, lessonId: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ course_id: string }>(`SELECT u.course_id FROM lessons l
    JOIN units u ON u.id=l.unit_id WHERE l.id=?`, lessonId);
  return row?.course_id ?? null;
}

export function isLessonUnlocked(lessons: LearningLesson[], index: number): boolean {
  return index === 0 || lessons[index - 1]?.status === 'COMPLETED';
}

export async function startLesson(db: SQLiteDatabase, lessonId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(`INSERT OR IGNORE INTO lesson_progress(lesson_id,status,started_at,updated_at)
    VALUES(?,'IN_PROGRESS',?,?)`, lessonId, now, now);
}

export async function completeLesson(db: SQLiteDatabase, lessonId: string): Promise<void> {
  const activityState = await db.getFirstAsync<{ total: number; completed: number }>(`SELECT
    COUNT(a.id) total,COUNT(ap.activity_id) completed
    FROM lesson_activities a
    LEFT JOIN lesson_activity_progress ap ON ap.activity_id=a.id
    WHERE a.lesson_id=?`, lessonId);
  if (!activityState?.total || activityState.completed < activityState.total) {
    throw new Error("LESSON_ACTIVITIES_INCOMPLETE");
  }
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO lesson_progress(lesson_id,status,started_at,completed_at,updated_at)
    VALUES(?,'COMPLETED',?,?,?) ON CONFLICT(lesson_id) DO UPDATE SET
    status='COMPLETED',completed_at=COALESCE(lesson_progress.completed_at,excluded.completed_at),updated_at=excluded.updated_at`,
  lessonId, now, now, now);
}
