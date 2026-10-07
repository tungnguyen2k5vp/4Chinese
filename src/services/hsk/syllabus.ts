import type { SQLiteDatabase } from 'expo-sqlite';

import syllabus from '@/data/hsk-syllabus-official.json';
import { numericPinyinToMarks } from '@/services/pinyin/pinyin';
import type { HskBand } from '@/types/models';

export { syllabus };
export type SyllabusSection = keyof typeof syllabus.sections;
export type SyllabusLevel = keyof typeof syllabus.sections.grammar;
type Word = { id: string; simplified: string; pinyin: string; band: string };
const reading = (text: string) => text.normalize('NFC').toLowerCase().replace(/[\s’'\-·]/g, '');
export type SyllabusRow = (typeof syllabus.vocabulary)[number] & {
  status: 'matched' | 'missing' | 'levelConflict' | 'readingReview'; vocabularyId: string | null; appLevel: string | null;
};
export async function getSyllabusAlignment(db: SQLiteDatabase) {
  const words = await db.getAllAsync<Word>('SELECT id,simplified,pinyin_numeric AS pinyin,hsk_band AS band FROM vocabulary WHERE is_custom=0 ORDER BY id');
  const byHeadword = new Map<string, Word[]>();
  for (const word of words) byHeadword.set(word.simplified, [...(byHeadword.get(word.simplified) ?? []), word]);
  const rows: SyllabusRow[] = syllabus.vocabulary.map(entry => {
    const candidates = byHeadword.get(entry.simplified) ?? [];
    const exact = candidates.find(word => reading(numericPinyinToMarks(word.pinyin)) === reading(entry.pinyin));
    const candidate = exact ?? candidates[0];
    const status = !candidate ? 'missing' : !exact ? 'readingReview' : String(candidate.band) !== entry.level ? 'levelConflict' : 'matched';
    return { ...entry, status, vocabularyId: candidate?.id ?? null, appLevel: candidate ? String(candidate.band) : null };
  });
  return rows;
}
export const syllabusSectionLabels: Record<SyllabusSection, string> = {
  tasks: 'Giao tiếp', topics: 'Chủ đề', characters: 'Hán tự', grammar: 'Ngữ pháp',
};
export const syllabusGoals: Record<SyllabusLevel, string> = {
  '1': 'Giới thiệu bản thân, hỏi đáp thông tin và giao tiếp sinh hoạt đơn giản.',
  '2': 'Trao đổi nhu cầu quen thuộc, kể hoạt động và sắp xếp công việc thường ngày.',
  '3': 'Giao tiếp về học tập, công việc và xử lý tình huống trong đời sống.',
  '4': 'Đọc và trao đổi thông tin có chi tiết, trình bày nguyên nhân và quan điểm.',
  '5': 'Phân tích thông tin, đọc văn bản dài và trình bày ý kiến có lý giải.',
  '6': 'Hiểu nội dung phức tạp, tổng hợp thông tin và phát triển lập luận.',
  '7-9': 'Giao tiếp chuyên sâu, đọc văn bản học thuật và diễn đạt chính xác, linh hoạt.',
};
export function syllabusLevel(band: HskBand | 'all'): SyllabusLevel { return band === 'all' ? '1' : String(band) as SyllabusLevel; }
