import type { SQLiteDatabase } from 'expo-sqlite';

export type PracticeSkill = 'MEANING' | 'PINYIN' | 'LISTENING' | 'HANZI' | 'WRITING' | 'SPEAKING' | 'GRAMMAR';
type SkillColumn = 'meaning_score' | 'recognition_score' | 'pinyin_score' | 'listening_score' | 'writing_score' | 'speaking_score';
const columns: Partial<Record<PracticeSkill, SkillColumn>> = {
  MEANING: 'meaning_score', HANZI: 'recognition_score', PINYIN: 'pinyin_score',
  LISTENING: 'listening_score', WRITING: 'writing_score', SPEAKING: 'speaking_score',
};

export type Mistake = { id: string; vocabulary_id: string | null; grammar_id: string | null;
  skill_type: PracticeSkill; exercise_type: string; wrong_count: number; correct_streak: number;
  last_wrong_at: string | null; resolved: number; title: string; pinyin: string | null;
  attempts_30d: number; errors_30d: number };

export type MistakeFocus = {
  skill: PracticeSkill;
  openCount: number;
  totalWrong: number;
  topTitle: string;
};

/** Call inside the caller's transaction when paired with an SRS/grammar write. */
export async function recordPracticeResult(db: SQLiteDatabase, input: {
  vocabularyId?: string; grammarId?: string; skill: PracticeSkill; exerciseType: string;
  correct: boolean; hintUsed?: boolean; responseTimeMs?: number; occurredAt?: string;
}): Promise<void> {
  const entityId = input.vocabularyId ?? input.grammarId;
  if (!entityId) throw new Error('MISSING_PRACTICE_ENTITY');
  const id = `${input.vocabularyId ? 'word' : 'grammar'}:${entityId}:${input.skill}:${input.exerciseType}`;
  const now = input.occurredAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(now))) throw new Error('INVALID_PRACTICE_TIMESTAMP');
  const metadata = JSON.stringify({ hintUsed: !!input.hintUsed, responseTimeMs: input.responseTimeMs ?? null });
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM mistake_records WHERE id=?',id);
  if (!input.correct) {
    await db.runAsync(`INSERT INTO mistake_records(id,vocabulary_id,grammar_id,skill_type,exercise_type,
      wrong_count,correct_streak,last_wrong_at,resolved,metadata,updated_at)
      VALUES(?,?,?,?,?,1,0,?,0,?,?) ON CONFLICT(id) DO UPDATE SET
      wrong_count=mistake_records.wrong_count+1,correct_streak=0,last_wrong_at=excluded.last_wrong_at,
      resolved=0,metadata=excluded.metadata,updated_at=excluded.updated_at`, id, input.vocabularyId ?? null,
    input.grammarId ?? null, input.skill, input.exerciseType, now, metadata, now);
  } else {
    // Three consecutive unassisted successes resolve a tracked mistake.
    await db.runAsync(`UPDATE mistake_records SET
      correct_streak=CASE WHEN ?=1 THEN 0 ELSE correct_streak+1 END,
      resolved=CASE WHEN ?=0 AND correct_streak>=2 THEN 1 ELSE resolved END,
      last_correct_at=?,metadata=?,updated_at=? WHERE id=?`,
    input.hintUsed ? 1 : 0, input.hintUsed ? 1 : 0, now, metadata, now, id);
  }
  // Aggregate only attempts on a word/grammar item after it has produced a
  // mistake. No answer text is stored and no SRS table is touched here.
  if (!input.correct || existing) {
    await db.runAsync(`INSERT INTO practice_attempt_daily
      (mistake_id,skill_type,exercise_type,utc_day,attempt_count,error_count)
      VALUES(?,?,?,?,1,?) ON CONFLICT(mistake_id,utc_day) DO UPDATE SET
        attempt_count=practice_attempt_daily.attempt_count+1,
        error_count=practice_attempt_daily.error_count+excluded.error_count,
        skill_type=excluded.skill_type,exercise_type=excluded.exercise_type`,
    id,input.skill,input.exerciseType,now.slice(0,10),input.correct ? 0 : 1);
  }
  const column = columns[input.skill];
  if (input.vocabularyId && column) {
    await db.runAsync(`INSERT OR IGNORE INTO vocabulary_skill_mastery(vocabulary_id,updated_at) VALUES(?,?)`,
      input.vocabularyId, now);
    // Bounded deterministic score; a hinted success gains less, failure decreases it.
    const delta = input.correct ? input.hintUsed ? 2 : 10 : -12;
    await db.runAsync(`UPDATE vocabulary_skill_mastery SET ${column}=MAX(0,MIN(100,${column}+?)),updated_at=?
      WHERE vocabulary_id=?`, delta, now, input.vocabularyId);
  }
}

export async function listMistakes(db: SQLiteDatabase, skill?: PracticeSkill, asOf = new Date().toISOString()): Promise<Mistake[]> {
  if (!Number.isFinite(Date.parse(asOf))) throw new Error('INVALID_PRACTICE_TIMESTAMP');
  const cutoff = new Date(Date.parse(asOf) - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
  return db.getAllAsync<Mistake>(`SELECT m.id,m.vocabulary_id,m.grammar_id,m.skill_type,m.exercise_type,
    m.wrong_count,m.correct_streak,m.last_wrong_at,m.resolved,
    COALESCE(v.simplified,g.title,'Nội dung luyện tập') AS title,v.pinyin,
    COALESCE((SELECT SUM(a.attempt_count) FROM practice_attempt_daily a WHERE a.mistake_id=m.id AND a.utc_day>=?),0) AS attempts_30d,
    COALESCE((SELECT SUM(a.error_count) FROM practice_attempt_daily a WHERE a.mistake_id=m.id AND a.utc_day>=?),0) AS errors_30d
    FROM mistake_records m LEFT JOIN vocabulary v ON v.id=m.vocabulary_id
    LEFT JOIN grammar_points g ON g.id=m.grammar_id
    WHERE m.resolved=0 ${skill ? 'AND m.skill_type=?' : ''}
    ORDER BY m.wrong_count DESC,m.last_wrong_at DESC LIMIT 200`, cutoff,cutoff,...(skill ? [skill] : []));
}

/** Keeps the next practice recommendation actionable without touching SRS dates. */
export async function getMistakeFocus(db: SQLiteDatabase): Promise<MistakeFocus | null> {
  const items = await listMistakes(db);
  if (!items.length) return null;
  const bySkill = new Map<PracticeSkill, { openCount: number; totalWrong: number; topTitle: string }>();
  for (const item of items) {
    const current = bySkill.get(item.skill_type) ?? { openCount: 0, totalWrong: 0, topTitle: item.title };
    current.openCount += 1;
    current.totalWrong += item.wrong_count;
    bySkill.set(item.skill_type, current);
  }
  const [skill, focus] = [...bySkill.entries()].sort(([, left], [, right]) => right.totalWrong - left.totalWrong || right.openCount - left.openCount || left.topTitle.localeCompare(right.topTitle))[0]!;
  return { skill, ...focus };
}

/** Practice is independent of due reviews: it must never write SRS/progress/review_log. */
export async function practiceMistake(db: SQLiteDatabase, id: string, result: {
  correct: boolean; hintUsed?: boolean; responseTimeMs?: number;
}): Promise<void> {
  await db.withTransactionAsync(async () => {
    const mistake = await db.getFirstAsync<{ vocabulary_id: string | null; grammar_id: string | null;
      skill_type: PracticeSkill; exercise_type: string }>(
      'SELECT vocabulary_id,grammar_id,skill_type,exercise_type FROM mistake_records WHERE id=? AND resolved=0', id);
    if (!mistake) throw new Error('MISTAKE_NOT_OPEN');
    await recordPracticeResult(db, { vocabularyId: mistake.vocabulary_id ?? undefined,
      grammarId: mistake.grammar_id ?? undefined, skill: mistake.skill_type,
      exerciseType: mistake.exercise_type, ...result });
  });
}

export function practiceSkillForExercise(exercise: string): PracticeSkill {
  if (exercise === 'hanzi_to_pinyin') return 'PINYIN';
  if (exercise.startsWith('audio_')) return 'LISTENING';
  if (exercise === 'writing' || exercise === 'cloze') return 'WRITING';
  if (exercise === 'meaning_to_hanzi' || exercise === 'pinyin_to_hanzi') return 'HANZI';
  return 'MEANING';
}
