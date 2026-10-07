import type { SQLiteDatabase } from 'expo-sqlite';

export type PracticeSkill = 'MEANING' | 'PINYIN' | 'LISTENING' | 'HANZI' | 'WRITING' | 'SPEAKING' | 'GRAMMAR';
type SkillColumn = 'meaning_score' | 'recognition_score' | 'pinyin_score' | 'listening_score' | 'writing_score' | 'speaking_score';
const columns: Partial<Record<PracticeSkill, SkillColumn>> = {
  MEANING: 'meaning_score', HANZI: 'recognition_score', PINYIN: 'pinyin_score',
  LISTENING: 'listening_score', WRITING: 'writing_score', SPEAKING: 'speaking_score',
};

export type Mistake = { id: string; vocabulary_id: string | null; grammar_id: string | null;
  skill_type: PracticeSkill; exercise_type: string; wrong_count: number; correct_streak: number;
  last_wrong_at: string | null; resolved: number; title: string; pinyin: string | null };

export type MistakeFocus = {
  skill: PracticeSkill;
  openCount: number;
  totalWrong: number;
  topTitle: string;
};

/** Call inside the caller's transaction when paired with an SRS/grammar write. */
export async function recordPracticeResult(db: SQLiteDatabase, input: {
  vocabularyId?: string; grammarId?: string; skill: PracticeSkill; exerciseType: string;
  correct: boolean; hintUsed?: boolean; responseTimeMs?: number;
}): Promise<void> {
  const entityId = input.vocabularyId ?? input.grammarId;
  if (!entityId) throw new Error('MISSING_PRACTICE_ENTITY');
  const id = `${input.vocabularyId ? 'word' : 'grammar'}:${entityId}:${input.skill}:${input.exerciseType}`;
  const now = new Date().toISOString();
  const metadata = JSON.stringify({ hintUsed: !!input.hintUsed, responseTimeMs: input.responseTimeMs ?? null });
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

export async function listMistakes(db: SQLiteDatabase, skill?: PracticeSkill): Promise<Mistake[]> {
  return db.getAllAsync<Mistake>(`SELECT m.id,m.vocabulary_id,m.grammar_id,m.skill_type,m.exercise_type,
    m.wrong_count,m.correct_streak,m.last_wrong_at,m.resolved,
    COALESCE(v.simplified,g.title,'Nội dung luyện tập') AS title,v.pinyin
    FROM mistake_records m LEFT JOIN vocabulary v ON v.id=m.vocabulary_id
    LEFT JOIN grammar_points g ON g.id=m.grammar_id
    WHERE m.resolved=0 ${skill ? 'AND m.skill_type=?' : ''}
    ORDER BY m.wrong_count DESC,m.last_wrong_at DESC LIMIT 200`, ...(skill ? [skill] : []));
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
