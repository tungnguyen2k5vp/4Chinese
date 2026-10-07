import type { Mistake } from '@/db/mistakes';

const actions = {
  MEANING: ['Nhớ nghĩa trong câu', 'Đọc lại một câu có từ này, che nghĩa rồi tự giải thích bằng tiếng Việt.'],
  PINYIN: ['Nhớ âm và thanh điệu', 'Nghe từ, đọc lại từng âm tiết rồi đối chiếu pinyin.'],
  LISTENING: ['Nghe và nhận từ', 'Nghe chậm một lần, chọn từ; sau đó nghe ở tốc độ bình thường.'],
  HANZI: ['Nhận mặt chữ', 'So sánh chữ đã chọn với đáp án và chỉ ra thành phần khác nhau.'],
  WRITING: ['Viết lại có chủ đích', 'Viết từ một lần không gợi ý, sau đó kiểm tra từng chữ.'],
  SPEAKING: ['Tự nghe lại giọng nói', 'Ghi một câu ngắn và nghe lại. App không suy ra điểm phát âm từ STT.'],
  GRAMMAR: ['Dùng cấu trúc trong câu', 'Đọc giải thích, sửa câu sai và tự đặt một câu cùng cấu trúc.'],
  CONFUSABLE: ['Phân biệt từ dễ nhầm', 'Đối chiếu hai từ trong cùng ngữ cảnh; chú ý cách dùng, không chỉ nghĩa dịch.'],
} as const;
export type ErrorCluster = {
  key: keyof typeof actions;
  title: string;
  suggestion: string;
  openItems: number;
  wrongAttempts: number;
  recurring: boolean;
  examples: Mistake[];
};
/** Observed skill/exercise families only; never infer a phonetic/semantic diagnosis. */
export function clusterObservedMistakes(items: readonly Mistake[]): ErrorCluster[] {
  const grouped = new Map<ErrorCluster['key'], ErrorCluster>();
  const seen = new Set<string>();
  for (const item of items) {
    if (item.resolved !== 0 || seen.has(item.id) || !Number.isSafeInteger(item.wrong_count) || item.wrong_count < 1) continue;
    seen.add(item.id);
    const key = item.exercise_type.startsWith('confusable_') ? 'CONFUSABLE' : item.skill_type;
    const action = actions[key];
    if (!action) continue;
    const group = grouped.get(key) ?? {key,title:action[0],suggestion:action[1],openItems:0,wrongAttempts:0,recurring:false,examples:[]};
    group.openItems++;group.wrongAttempts+=item.wrong_count;
    group.recurring ||= item.wrong_count>=3;
    if (group.examples.length<3) group.examples.push(item);
    grouped.set(key,group);
  }
  return [...grouped.values()].sort((a,b)=>b.wrongAttempts-a.wrongAttempts || b.openItems-a.openItems || a.key.localeCompare(b.key));
}
