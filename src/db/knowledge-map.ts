import type { SQLiteDatabase } from 'expo-sqlite';

export type KnowledgeSkill = { skill: string; label: string; score: number | null; wordCount: number };
const definitions = [
  ['MEANING', 'Hiểu nghĩa', 'meaning_score'],
  ['HANZI', 'Nhớ Hán tự', 'recognition_score'],
  ['PINYIN', 'Pinyin', 'pinyin_score'],
  ['LISTENING', 'Nghe', 'listening_score'],
  ['WRITING', 'Viết', 'writing_score'],
  ['SPEAKING', 'Nói', 'speaking_score'],
] as const;

/** Aggregate only skills with evidence; unattempted zero columns are not a weak score. */
export async function getKnowledgeMap(db: SQLiteDatabase): Promise<KnowledgeSkill[]> {
  const rows: KnowledgeSkill[] = await Promise.all(definitions.map(async ([skill, label, column]) => {
    const row = await db.getFirstAsync<{ score: number | null; count: number }>(`SELECT AVG(s.${column}) score,COUNT(*) count
      FROM vocabulary_skill_mastery s WHERE s.${column}>0
      OR s.vocabulary_id IN (SELECT m.vocabulary_id FROM mistake_records m WHERE m.skill_type=? AND m.vocabulary_id IS NOT NULL)`, skill);
    return { skill, label, score: row?.score == null ? null : Math.round(row.score), wordCount: row?.count ?? 0 };
  }));
  const grammar = await db.getFirstAsync<{ correct: number | null; attempts: number | null; count: number }>(
    'SELECT SUM(correct) correct,SUM(attempts) attempts,COUNT(*) count FROM grammar_progress WHERE attempts>0');
  rows.push({ skill: 'GRAMMAR', label: 'Ngữ pháp', score: grammar?.attempts ? Math.round((grammar.correct ?? 0) / grammar.attempts * 100) : null,
    wordCount: grammar?.count ?? 0 });
  return rows;
}
