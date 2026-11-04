import type { SQLiteDatabase } from 'expo-sqlite';

import { englishLearnerTransaction } from './learner';

import { englishReadingLessons } from '@/data/english-learning-content';
import { englishReadingWindow } from '@/services/reader/english-tokenizer';

export interface EnglishContentProgress { position: number; completed: boolean }
function key(id: string) {
  if (!englishReadingLessons.some(lesson => lesson.id === id)) throw new Error('UNKNOWN_ENGLISH_CONTENT');
  return `reading-progress:v8.1:${id}`;
}
export async function readEnglishContentProgress(db: Pick<SQLiteDatabase, 'getFirstAsync'>, id: string): Promise<EnglishContentProgress> {
  const row = await db.getFirstAsync<{ payload_json: string }>('SELECT payload_json FROM en_drafts WHERE id=?', key(id));
  if (!row) return { position: 0, completed: false };
  const value = JSON.parse(row.payload_json);
  const lesson = englishReadingLessons.find(item => item.id === id)!;
  if (typeof value.completed !== 'boolean') throw new Error('INVALID_ENGLISH_CONTENT_PROGRESS');
  englishReadingWindow(lesson.text, value.position);
  return { position: value.position, completed: value.completed };
}
export async function saveEnglishContentProgress(db: SQLiteDatabase, id: string, value: EnglishContentProgress) {
  const lesson = englishReadingLessons.find(item => item.id === id);
  key(id);
  const page = englishReadingWindow(lesson!.text, value.position);
  if (typeof value.completed !== 'boolean') throw new Error('INVALID_CONTENT_COMPLETION');
  if (value.completed && page.next !== null && !(await readEnglishContentProgress(db, id)).completed) throw new Error('INVALID_CONTENT_COMPLETION');
  await englishLearnerTransaction(db, async () => {
    await db.runAsync('INSERT INTO en_drafts(id,payload_json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json', key(id), JSON.stringify(value));
  });
  return value;
}
