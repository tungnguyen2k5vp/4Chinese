import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import type { AIContext, AITask } from './gateway';

import { listPublishedLexicalKnowledge } from '@/db/lexical-knowledge';
import { characterStructure } from '@/services/memory/character-content';
import { numericPinyinToMarks } from '@/services/pinyin/pinyin';
import type { Vocabulary } from '@/types/models';

export type AILaunch = { label: string; task: AITask; context: AIContext | null;
  language?: 'zh' | 'en'; question?: string; hskLevel?: number | null;
  senses?: Extract<AIContext, { kind: 'word' }>[]; noteTarget?: { wordId: string; character: string } };
export const useAILaunch = create<{ value: AILaunch | null; set: (value: AILaunch | null) => void }>(set => ({ value: null, set: value => set({ value }) }));

/** Copy only allowlisted dictionary fields, never the Vocabulary/progress object. Select one sense in UI before sending. */
export async function wordAILaunch(db: SQLiteDatabase, word: Vocabulary): Promise<AILaunch> {
  const { senses: published } = await listPublishedLexicalKnowledge(db, word.id);
  const reviewed: Extract<AIContext, { kind: 'word' }>[] = published.map(s => ({ kind: 'word', hanzi: word.simplified,
    pinyin: numericPinyinToMarks(s.pinyin_numeric), meaning: s.definition_vi, pos: s.part_of_speech, usage: s.usage_note, hsk: String(word.hskBand) }));
  // Some dictionary records pack explicit sense lines into one array item. Keep the source intact; do not split commas/synonyms by guesswork.
  const meanings = [...new Set((word.meaningsVi.length ? word.meaningsVi : [word.primaryMeaningVi]).flatMap(text => text.split(/\r?\n+/u)).map(s => s.trim()).filter(Boolean))];
  const senses: Extract<AIContext, { kind: 'word' }>[] = [...reviewed, ...meanings.filter(meaning => !reviewed.some(s => s.meaning === meaning)).map(meaning => ({
    kind: 'word' as const, hanzi: word.simplified, pinyin: word.pinyin, meaning, pos: word.pos.length === 1 ? word.pos[0]! : '',
    usage: 'Pinyin lấy ở cấp mục từ; chưa xác minh riêng cho nghĩa đã chọn. Nếu cách đọc chưa rõ, cần hỏi lại.', hsk: String(word.hskBand) }))];
  return { label: word.simplified, task: 'word', context: senses.length === 1 ? senses[0]! : null, senses };
}
export function characterAILaunch(character: string, wordId?: string): AILaunch {
  const info = characterStructure(character);
  return { label: `Mẹo nhớ ${character}`, task: 'mnemonic', context: { kind: 'character', hanzi: character,
    pinyin: info?.pinyin ?? '', meaning: info?.meaning ?? 'Chưa có nghĩa chữ đã kiểm tra trong dữ liệu local.',
    structure: info ? `${info.layout}; bộ: ${info.radical ?? 'chưa xác minh'}; phần: ${info.parts.join(' + ')}` : 'Chưa có cấu tạo được xác minh. Không tự suy diễn.', source: info?.sourceUrl ?? '' },
    ...(wordId ? { noteTarget: { wordId, character } } : {}) };
}
export function aiQuickActions(context: AIContext | null): { label: string; task: AITask; question: string }[] {
  if (context?.kind === 'practice') return [
    { label: 'Phân tích lựa chọn', task: 'practice_review', question: 'Đối chiếu lựa chọn thực tế của tôi và kiểm tra lại đáp án tham khảo; giải thích điểm cần luyện, không mặc định đáp án AI luôn đúng.' },
    { label: 'Luyện tiếp', task: 'practice', question: 'Tạo 3 câu mới để tôi luyện tiếp theo lựa chọn trong bài vừa làm. Đối chiếu đáp án tham khảo trước khi suy luận lỗi.' },
  ];
  if (context?.kind === 'word') return [
    { label: 'Giải thích', task: 'word', question: 'Giải thích cách dùng của từ theo đúng nghĩa đã chọn.' },
    { label: 'Ví dụ', task: 'word', question: 'Tạo 2 ví dụ tự nhiên với từ này theo đúng nghĩa đã chọn, kèm pinyin và dịch Việt.' },
    { label: 'Phân biệt từ', task: 'compare', question: 'Gợi ý một từ dễ nhầm với nghĩa đang chọn, so sánh cách dùng và ví dụ. Nếu thiếu dữ liệu từ điển của từ thứ hai, nói rõ đây là gợi ý AI cần đối chiếu.' },
    { label: 'Tự kiểm tra', task: 'practice', question: 'Tạo 3 câu trắc nghiệm ngắn để luyện nghĩa đã chọn.' },
  ];
  if (context?.kind === 'character') return [{ label: 'Mẹo nhớ', task: 'mnemonic', question: 'Tạo mẹo liên tưởng ngắn dựa đúng cấu tạo đã kiểm tra; ghi rõ đây không phải từ nguyên.' }];
  if (context?.kind === 'grammar') return [
    { label: 'Giải thích', task: 'grammar', question: 'Giải thích khi dùng, trật tự từ và lỗi dễ mắc với cấu trúc này.' },
    { label: 'Thêm ví dụ', task: 'grammar', question: 'Tạo 3 ví dụ dễ hiểu với cấu trúc đã chọn, kèm pinyin và dịch Việt.' },
    { label: 'Quiz ngắn', task: 'practice', question: 'Tạo 3 câu trắc nghiệm với cấu trúc đang chọn.' },
  ];
  if (context?.kind === 'reader') return [
    { label: 'Dịch đoạn', task: 'reader', question: 'Dịch đoạn đang chọn sang tiếng Việt, giữ đúng ý.' },
    { label: 'Phân tích', task: 'reader', question: 'Phân tích cấu trúc và từ khó trong đoạn đang chọn.' },
    { label: 'Tóm tắt', task: 'reader', question: 'Tóm tắt ý chính của đúng đoạn đang chọn bằng tiếng Việt, không thêm thông tin ngoài đoạn.' },
    { label: 'Sửa đoạn viết', task: 'writing', question: '' },
    { label: 'Tự luyện dịch', task: 'translation', question: '' },
    { label: 'Đọc hiểu', task: 'practice', question: 'Tạo 3 câu hỏi trắc nghiệm đọc hiểu từ đoạn đang chọn.' },
  ];
  if (context?.kind === 'comparison') return [{ label: 'Phân biệt', task: 'compare', question: 'So sánh cách dùng, ví dụ đúng/sai và mẹo tránh nhầm cho những từ đang chọn.' },
    { label: 'Quiz phân biệt', task: 'practice', question: 'Tạo 3 câu trắc nghiệm phân biệt các từ đang chọn.' }];
  if (context?.kind === 'weakness') return [{ label: 'Gợi ý cách học', task: 'memory', question: 'Từ số liệu gộp đã chọn, gợi ý cách luyện ngắn. Nói rõ giới hạn dữ liệu; không tạo lịch ôn mới.' },
    { label: 'Luyện nhóm lỗi', task: 'practice', question: 'Tạo bài luyện ngắn theo kỹ năng trong số liệu gộp. Đây không phải bản sao các câu từng làm sai; không suy đoán từ vựng hoặc lỗi cá nhân chưa được cung cấp.' }];
  if (context?.kind === 'learner') return [
    { label: 'Phân tích & kế hoạch', task: 'coach', question: 'Đề xuất kế hoạch theo mục tiêu, thời gian và các mục tôi đã chọn; giải thích bằng chứng và giới hạn dữ liệu.' },
    { label: 'Quiz riêng', task: 'practice', question: 'Tạo 3 câu luyện theo đúng các từ và kỹ năng tôi đã chọn. Từ có nhiều nghĩa: dùng ngữ cảnh rõ để chỉ có một đáp án hợp lý.' },
    { label: 'Bài bổ trợ', task: 'memory', question: 'Gợi ý 2 bài bổ trợ ngắn cho nhóm từ/kỹ năng có nhiều lần sai hoặc quên trong dữ liệu đang chọn. Không khẳng định biết đáp án cá nhân đã làm sai.' },
  ];
  return [{ label: 'Giải thích ngữ pháp', task: 'tutor', question: 'Giải thích điểm khác giữa 不 và 没 bằng ví dụ dễ hiểu.' },
    { label: 'Soạn câu cần sửa', task: 'writing', question: '' }];
}
