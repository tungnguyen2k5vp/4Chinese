import type { SQLiteDatabase } from "expo-sqlite";

import { listMistakes, recordPracticeResult, type Mistake } from "./mistakes";
import {
  findVocabularyByExactHanzi,
  getDashboardStats,
  getDueCount,
  getSettings,
  getVocabulary,
} from "./repository";
import { listVocabularyContexts } from "./vocabulary-context";

import { characterContrastGroups } from "@/services/memory/character-content";
import {
  adaptiveMemoryPlan,
  practiceSkillForMemory,
  type MemoryQuestion,
} from "@/services/memory/hanzi-memory";
import type { Vocabulary } from "@/types/models";

export type MemoryCandidate = {
  word: Vocabulary;
  learnedAt: string | null;
  lastReviewAt: string | null;
  wrongCount: number;
  lapseCount: number;
  mistakes: Mistake[];
  personalSentence: string | null;
};
const activeScope = `FROM (
 SELECT v.id AS word_id,p.*,
   ROW_NUMBER() OVER (PARTITION BY v.simplified,LOWER(REPLACE(v.pinyin,' ',''))
     ORDER BY CASE WHEN p.studied=1 OR p.status='KNOWN' THEN 0 ELSE 1 END,
       COALESCE(p.memory_level,0) DESC,COALESCE(p.review_count,0) DESC,
       COALESCE(p.updated_at,v.updated_at,v.created_at,'') DESC,v.id) AS identity_rank
 FROM vocabulary v JOIN user_vocabulary_progress p ON p.vocabulary_id=v.id
 WHERE (p.studied=1 OR p.status='KNOWN') AND p.status IN ('LEARNING','KNOWN') AND p.is_suspended=0
   AND (v.deck_id IS NULL OR EXISTS(SELECT 1 FROM personal_deck_vocabulary m
     JOIN personal_deck d ON d.id=m.deck_id AND d.deleted_at IS NULL WHERE m.vocabulary_id=v.id))
) p JOIN vocabulary v ON v.id=p.word_id WHERE p.identity_rank=1`;

/** Read only: old cards retain their existing due dates, including not-yet-due cards. */
export async function listMemoryCandidates(
  db: SQLiteDatabase,
  mode: "all" | "weak" | "old" = "all",
  limit = 20,
  now = new Date().toISOString(),
): Promise<MemoryCandidate[]> {
  if (!Number.isFinite(Date.parse(now))) throw new Error("INVALID_MEMORY_TIME");
  const size = Number.isFinite(limit)
    ? Math.max(1, Math.min(50, Math.trunc(limit)))
    : 20;
  const cutoff = new Date(Date.parse(now) - 30 * 86400000).toISOString();
  const extra =
    mode === "old"
      ? ` AND p.learned_at IS NOT NULL AND p.learned_at<=?`
      : mode === "weak"
        ? ` AND (p.wrong_count>=2 OR p.lapse_count>=1 OR EXISTS(SELECT 1 FROM mistake_records m WHERE m.vocabulary_id=v.id AND m.resolved=0 AND m.wrong_count>=2))`
        : "";
  const rows = await db.getAllAsync<{
    id: string;
    learned_at: string | null;
    last_review: string | null;
    wrong_count: number;
    lapse_count: number;
  }>(
    `SELECT v.id,p.learned_at,p.last_review,p.wrong_count,p.lapse_count ${activeScope}${extra}
     ORDER BY CASE WHEN p.lapse_count>0 OR p.wrong_count>=2 THEN 0 ELSE 1 END,
       p.lapse_count DESC,p.wrong_count DESC,COALESCE((SELECT MAX(m.updated_at) FROM mistake_records m WHERE m.vocabulary_id=v.id),p.last_review,p.learned_at,p.created_at) ASC,v.id LIMIT ?`,
    ...(mode === "old" ? [cutoff, size] : [size]),
  );
  const mistakes = await listMistakes(db, undefined, now);
  const loaded = await Promise.all(
    rows.map(async (row) => {
      const [word, contexts] = await Promise.all([
        getVocabulary(db, row.id),
        listVocabularyContexts(db, row.id, 3),
      ]);
      if (!word) return null;
      return {
        word,
        learnedAt: row.learned_at,
        lastReviewAt: row.last_review,
        wrongCount: row.wrong_count,
        lapseCount: row.lapse_count,
        mistakes: mistakes.filter((m) => m.vocabulary_id === row.id),
        personalSentence:
          contexts.find((context) => context.user_selected === 1)?.sentence ??
          null,
      };
    }),
  );
  return loaded.filter((row): row is MemoryCandidate => row !== null);
}

export async function memoryOverview(db: SQLiteDatabase) {
  const [settings, due, stats, mistakes, counts, recent] = await Promise.all([
    getSettings(db),
    getDueCount(db),
    getDashboardStats(db),
    listMistakes(db),
    db.getFirstAsync<{ learned: number; weak: number }>(
      `SELECT COUNT(*) learned,SUM(CASE WHEN p.wrong_count>=2 OR p.lapse_count>=1 OR EXISTS(SELECT 1 FROM mistake_records m WHERE m.vocabulary_id=v.id AND m.resolved=0 AND m.wrong_count>=2) THEN 1 ELSE 0 END) weak ${activeScope}`,
    ),
    db.getFirstAsync<{ attempts: number; errors: number }>(
      `SELECT COUNT(*) attempts,SUM(CASE WHEN correct=0 THEN 1 ELSE 0 END) errors FROM review_log WHERE correct IS NOT NULL AND reviewed_at>=?`,
      new Date(Date.now() - 30 * 86400000).toISOString(),
    ),
  ]);
  return {
    due,
    learned: counts?.learned ?? 0,
    weak: counts?.weak ?? 0,
    mistakes,
    plan: adaptiveMemoryPlan({
      due,
      weakWords: counts?.weak ?? 0,
      attempts: recent?.attempts ?? 0,
      errors: recent?.errors ?? 0,
      newGoal: settings.dailyNewWordGoal,
      minuteGoal: settings.dailyStudyMinutes,
      studySeconds: stats.studySeconds,
    }),
  };
}

/** Only objectively checkable answers enter existing auxiliary mistake/skill tables. */
export async function recordMemoryChoice(
  db: SQLiteDatabase,
  question: MemoryQuestion,
  input: { correct: boolean; hintUsed: boolean; responseTimeMs: number },
): Promise<void> {
  if (question.type === "writing")
    throw new Error("WRITING_REQUIRES_MANUAL_COMPARISON");
  await db.withTransactionAsync(async () =>
    recordPracticeResult(db, {
      vocabularyId: question.word.id,
      skill: practiceSkillForMemory(question.type),
      exerciseType: question.type,
      ...input,
    }),
  );
}

export async function recordMemoryContrast(
  db: SQLiteDatabase,
  groupId: string,
  target: string,
  selected: string,
  hintUsed: boolean,
): Promise<boolean> {
  const group = characterContrastGroups.find((g) => g.id === groupId);
  if (
    !group ||
    !group.characters.some((c) => c.hanzi === target) ||
    !group.characters.some((c) => c.hanzi === selected)
  )
    throw new Error("INVALID_MEMORY_CONTRAST");
  const word = (await findVocabularyByExactHanzi(db, [target])).find(
    (w) => w.simplified === target,
  );
  if (!word) return false; // Editorial-only characters never create dictionary/progress records.
  await db.withTransactionAsync(async () =>
    recordPracticeResult(db, {
      vocabularyId: word.id,
      skill: "HANZI",
      exerciseType: "memory_visual_choice",
      correct: target === selected,
      hintUsed,
    }),
  );
  return true;
}

const marker = (character: string) => `[4Chinese:mnemonic:${character}]`;
export function readMemoryMnemonic(notes: string, character: string): string {
  const start = notes.indexOf(marker(character) + "\n");
  if (start < 0) return "";
  const content = start + marker(character).length + 1;
  const end = notes.indexOf("\n[/4Chinese:mnemonic]", content);
  return end < 0 ? "" : notes.slice(content, end);
}
export async function saveMemoryMnemonic(
  db: SQLiteDatabase,
  vocabularyId: string,
  character: string,
  text: string,
): Promise<void> {
  if (
    Array.from(character).length !== 1 ||
    text.length > 1500 ||
    text.includes("[4Chinese:") ||
    text.includes("[/4Chinese:")
  )
    throw new Error("INVALID_MEMORY_MNEMONIC");
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ notes: string; simplified: string }>(
      `SELECT p.notes,v.simplified FROM user_vocabulary_progress p JOIN vocabulary v ON v.id=p.vocabulary_id WHERE p.vocabulary_id=?`,
      vocabularyId,
    );
    if (!row || !row.simplified.includes(character))
      throw new Error("MEMORY_NOTE_WORD_NOT_FOUND");
    const start = row.notes.indexOf(marker(character) + "\n");
    const end =
      start < 0 ? -1 : row.notes.indexOf("\n[/4Chinese:mnemonic]", start);
    const block = `${marker(character)}\n${text.trim()}\n[/4Chinese:mnemonic]`;
    const notes =
      start >= 0 && end >= 0
        ? row.notes.slice(0, start) +
          block +
          row.notes.slice(end + "\n[/4Chinese:mnemonic]".length)
        : row.notes + (row.notes ? "\n\n" : "") + block;
    await db.runAsync(
      "UPDATE user_vocabulary_progress SET notes=? WHERE vocabulary_id=?",
      notes,
      vocabularyId,
    );
  });
}
