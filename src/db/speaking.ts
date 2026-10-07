import type { SQLiteDatabase } from 'expo-sqlite';

import { awardActivityXp } from './gamification';
import { recordPracticeResult } from './mistakes';

import type { ToneWord } from '@/services/speaking/tones';

export type ShadowingSentence = { id: string; hanzi: string; pinyin: string; translation_vi: string };
export type SpeakingSummary = { toneAttempts: number; toneCorrect: number; shadowingAttempts: number };

export async function listToneWords(db: SQLiteDatabase): Promise<ToneWord[]> {
  // Small columns only; no meanings arrays, images or examples hydrated into RAM.
  return db.getAllAsync<ToneWord>(`SELECT id,simplified AS hanzi,pinyin,pinyin_numeric AS numeric,
    primary_meaning_vi AS meaning FROM vocabulary
    WHERE length(simplified) IN (1,2) AND is_custom=0
    ORDER BY CAST(hsk_band AS INTEGER),id LIMIT 6000`);
}

export async function listShadowingSentences(db: SQLiteDatabase): Promise<ShadowingSentence[]> {
  return db.getAllAsync<ShadowingSentence>(`SELECT id,hanzi,pinyin,translation_vi FROM sentences
    WHERE is_active=1 AND review_status='REVIEWED' AND id NOT GLOB 'sentence-v5-*'
    AND length(hanzi)<=120 ORDER BY CAST(hsk_level AS INTEGER),difficulty,id LIMIT 100`);
}

export async function getSpeakingSummary(db: SQLiteDatabase): Promise<SpeakingSummary> {
  return (await db.getFirstAsync<SpeakingSummary>(`SELECT
    COALESCE(SUM(kind='tone'),0) AS toneAttempts,
    COALESCE(SUM(kind='tone' AND correct=1),0) AS toneCorrect,
    COALESCE(SUM(kind='shadowing'),0) AS shadowingAttempts FROM speaking_practice`))!;
}

/** One id per user attempt, retryable without duplicate awards. Does not alter SRS. */
export async function saveSpeakingPractice(db: SQLiteDatabase, input: {
  id: string; kind: 'tone' | 'shadowing'; targetId: string; correct?: boolean; listening?: boolean;
}): Promise<void> {
  if (!input.id || !input.targetId || (input.kind === 'tone' && typeof input.correct !== 'boolean')) {
    throw new Error('INVALID_SPEAKING_PRACTICE');
  }
  await db.withTransactionAsync(async () => {
    if (input.kind === 'shadowing') {
      const allowed = await db.getFirstAsync<{ id: string }>(`SELECT id FROM sentences WHERE id=?
        AND is_active=1 AND review_status='REVIEWED' AND id NOT GLOB 'sentence-v5-*'`, input.targetId);
      if (!allowed) throw new Error('SHADOWING_SENTENCE_NOT_PUBLISHED');
    }
    const result = await db.runAsync(`INSERT OR IGNORE INTO speaking_practice
      (id,kind,vocabulary_id,sentence_id,correct,created_at) VALUES(?,?,?,?,?,?)`, input.id, input.kind,
    input.kind === 'tone' ? input.targetId : null, input.kind === 'shadowing' ? input.targetId : null,
    input.kind === 'tone' ? input.correct ? 1 : 0 : null, new Date().toISOString());
    if (result.changes && input.kind === 'tone') await recordPracticeResult(db, {
      vocabularyId: input.targetId, skill: input.listening ? 'LISTENING' : 'PINYIN',
      exerciseType: input.listening ? 'tone_listen' : 'tone_dictionary', correct: !!input.correct,
    });
    if (result.changes && (input.kind === 'shadowing' || input.correct)) await awardActivityXp(db, input.kind,
      `${input.kind === 'tone' ? input.listening ? 'listen:' : 'read:' : ''}${input.targetId}`);
  });
}
