import { describe, expect, it } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getSyllabusAlignment, syllabus } from './syllabus';
describe('official syllabus extraction and alignment', () => {
  it('contains every numbered row of the 11000-entry PDF and all seven levels', () => {
    expect(syllabus.vocabulary).toHaveLength(11000);
    expect(syllabus.vocabulary.map(row => Number(row.identifier))).toEqual(Array.from({ length: 11000 }, (_, i) => i + 1));
    expect(['1','2','3','4','5','6','7-9'].map(level => syllabus.vocabulary.filter(row => row.level === level).length)).toEqual([300,200,500,1000,1600,1800,5600]);
    for (const section of Object.values(syllabus.sections)) for (const pages of Object.values(section)) expect(pages.every(page => page.text.trim().length > 0)).toBe(true);
  });
  it('keeps level and pronunciation differences visible instead of counting them as coverage', async () => {
    const db = { getAllAsync: async () => [{ id:'love', simplified:'爱', pinyin:'ai4', band:'1' }, { id:'eight', simplified:'八', pinyin:'ba1', band:'2' }, { id:'dad', simplified:'爸爸', pinyin:'ba1 ba1', band:'1' }] } as unknown as SQLiteDatabase;
    const rows = await getSyllabusAlignment(db);
    expect(rows.slice(0,4).map(row => row.status)).toEqual(['matched','levelConflict','readingReview','missing']);
  });
});
