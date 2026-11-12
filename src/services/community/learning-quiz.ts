import { z } from 'zod';

const marker = '\n\n[4CHINESE_QUIZ_V1]\n';
export const learningQuizSchema = z.object({
  version: z.literal(1), kind: z.enum(['meaning', 'sentence', 'listen']),
  question: z.string().trim().min(3, 'Câu hỏi cần ít nhất 3 ký tự.').max(240, 'Câu hỏi tối đa 240 ký tự.'), chinese: z.string().trim().max(100, 'Nội dung tiếng Trung tối đa 100 ký tự.'),
  choices: z.array(z.string().trim().min(1, 'Điền đầy đủ các lựa chọn.').max(100, 'Mỗi lựa chọn tối đa 100 ký tự.')).min(2).max(4),
  answer: z.number().int().min(0), explanation: z.string().trim().min(3, 'Thêm lời giải ít nhất 3 ký tự.').max(500, 'Lời giải tối đa 500 ký tự.'),
}).superRefine((quiz, ctx) => {
  if (quiz.answer >= quiz.choices.length) ctx.addIssue({ code: 'custom', message: 'Chọn một đáp án đúng trong danh sách.' });
  if (new Set(quiz.choices.map(value => value.toLocaleLowerCase('vi'))).size !== quiz.choices.length) ctx.addIssue({ code: 'custom', message: 'Các đáp án cần khác nhau.' });
  if (quiz.kind === 'listen' && !/[\u3400-\u9fff]/u.test(quiz.chinese)) ctx.addIssue({ code: 'custom', message: 'Bài nghe cần có nội dung tiếng Trung để phát âm.' });
});
export type LearningQuiz = z.infer<typeof learningQuizSchema>;

/** Versioned text uses the existing post body; no database migration or progress writes. */
export function encodeLearningQuiz(quiz: LearningQuiz, introduction = ''): string {
  const checked = learningQuizSchema.parse(quiz), intro = introduction.trim();
  if (intro.length > 600 || intro.includes(marker.trim())) throw new Error('Phần giới thiệu tối đa 600 ký tự và không được chứa mã định dạng bài đố.');
  const preview = [intro, '🎯 Đố vui 4Chinese', checked.question, checked.kind === 'listen' ? '🔊 Mở bài viết để nghe và chọn đáp án.' : checked.chinese, ...checked.choices.map((value, i) => `${String.fromCharCode(65 + i)}. ${value}`)].filter(Boolean).join('\n');
  const body = preview + marker + JSON.stringify({ quiz: checked, introduction: intro });
  if (body.length > 3000) throw new Error('Bài đố quá dài. Hãy rút gọn giới thiệu hoặc đáp án.');
  return body;
}

export function decodeLearningQuiz(body: string): { quiz: LearningQuiz; introduction: string } | null {
  const position = body.indexOf(marker);
  if (position < 0 || body.length > 3000) return null;
  try {
    return z.object({ quiz: learningQuizSchema, introduction: z.string().max(600) }).parse(JSON.parse(body.slice(position + marker.length)));
  } catch { return null; }
}

export const quizTemplates: { title: string; quiz: LearningQuiz }[] = [
  { title: 'Đố từ', quiz: { version: 1, kind: 'meaning', question: 'Từ này có nghĩa là gì?', chinese: '咖啡', choices: ['Cà phê', 'Trà', 'Bánh mì'], answer: 0, explanation: '咖啡 (kāfēi) là cà phê. Ví dụ: 我想喝一杯咖啡。 — Tôi muốn uống một cốc cà phê.' } },
  { title: 'Chọn câu đúng', quiz: { version: 1, kind: 'sentence', question: 'Câu nào diễn đạt “Tôi đang đọc sách”?', chinese: '', choices: ['我是看书。', '我在看书。', '我看是书。'], answer: 1, explanation: '我在看书。 在 + động từ diễn tả hành động đang diễn ra.' } },
  { title: 'Nghe và đoán', quiz: { version: 1, kind: 'listen', question: 'Bạn vừa nghe từ nào?', chinese: '车票', choices: ['Hành lý', 'Lối ra', 'Vé tàu'], answer: 2, explanation: '车票 (chēpiào) là vé xe hoặc vé tàu. 一张车票：một vé tàu.' } },
];
