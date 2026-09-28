import type { SQLiteDatabase } from 'expo-sqlite';

const bands = ['1', '2', '3', '4', '5', '6', '7-9'] as const;

export type LearningCourse = { id: string; title: string; description: string; hsk_band: string;
  total_lessons: number; completed_lessons: number; earned_xp: number };
export type LearningLesson = { id: string; course_id: string; unit_title: string; title: string;
  estimated_minutes: number; xp_reward: number; status: 'IN_PROGRESS' | 'COMPLETED' | null;
  sort_order: number };
export type LearningActivity = { id: string; activity_type: 'VOCABULARY' | 'GRAMMAR' | 'LISTENING' |
  'SPEAKING' | 'READING' | 'HANZI' | 'QUIZ'; title: string; target: string | null };

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

export async function completeLessonActivity(
  db: SQLiteDatabase,
  activityId: string,
): Promise<void> {
  const exists = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM lesson_activities WHERE id=?",
    activityId,
  );
  if (!exists) throw new Error("LESSON_ACTIVITY_NOT_FOUND");
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
