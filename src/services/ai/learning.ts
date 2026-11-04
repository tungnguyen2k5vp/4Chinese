import { ChineseAIError, parseAIContext, type AIContext, type AIQuiz, type AIRequest } from '../../../supabase/functions/_shared/chinese-ai-contract';

/** Only submitted choices from this draft; no IDs, progress records or implicit history. */
export function practiceAIContext(quiz: AIQuiz[], selected: (number | null)[]): Extract<AIContext, { kind: 'practice' }> {
  if (selected.length !== quiz.length) throw new ChineseAIError('AI_INVALID_INPUT');
  return parseAIContext({ kind: 'practice', attempts: quiz.map((q, i) => ({ question: q.question, choices: [...q.choices],
    answerIndex: q.answerIndex, explanation: q.explanation, selectedIndex: selected[i] })) }) as Extract<AIContext, { kind: 'practice' }>;
}

export function writingQuestion(text: string, intendedMeaning: string, language: 'zh' | 'en' = 'zh'): string {
  if (!text.trim() || text.length > 1000 || intendedMeaning.length > 300) throw new ChineseAIError('AI_INVALID_INPUT');
  return `Sửa câu tiếng ${language === 'en' ? 'Anh' : 'Trung'}, giữ đúng ý và giải thích bằng tiếng Việt:\n${text.trim()}${intendedMeaning.trim() ? `\nÝ tôi muốn nói: ${intendedMeaning.trim()}` : ''}`;
}

/** Human-readable preview/history of the CURRENT question; never copy a learner record. */
export function aiQuestionText(request: Pick<AIRequest, 'question' | 'hskLevel' | 'translation'>): string {
  const item = request.translation;
  return [request.hskLevel ? `Mục tiêu HSK ${request.hskLevel}` : '', request.question,
    item ? `${item.direction === 'vi-zh' ? 'Việt → Trung' : 'Trung → Việt'}\nCâu gốc: ${item.source}${item.attempt ? `\nTôi dịch thử: ${item.attempt}` : ''}` : '',
  ].filter(Boolean).join('\n');
}

/** Local draft feedback only. No repository, scheduler, XP or official exam score. */
export function summarizeAIPractice(quiz: AIQuiz[], selected: (number | null)[]) {
  const valid = (i: number) => Number.isInteger(selected[i]) && selected[i]! >= 0 && selected[i]! < quiz[i]!.choices.length;
  return { answered: quiz.filter((_, i) => valid(i)).length,
    matched: quiz.filter((q, i) => valid(i) && selected[i] === q.answerIndex).length, total: quiz.length };
}
