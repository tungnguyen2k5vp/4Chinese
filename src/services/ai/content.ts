import { ChineseAIError, parseAIAnswer, type AIAnswer, type AIExerciseKind } from './gateway';

/** ponytail: review/export a draft in RAM; add publishing only with an approved admin repository and content review process. */
export function reviewedAIContent(answer: AIAnswer, kind: AIExerciseKind, reviewed: boolean, topic: string, source: string, hskLevel = 1) {
  if (!reviewed || !topic.trim() || topic.length > 1000 || source.length > 1200 || !Number.isInteger(hskLevel) || hskLevel < 1 || hskLevel > 9) throw new ChineseAIError('AI_INVALID_INPUT');
  return { format: '4chinese.ai-content-draft.v1', status: 'human-reviewed-draft', officialExam: false,
    reviewedAt: new Date().toISOString(), topic: topic.trim(), source: source.trim(), exerciseKind: kind, hskLevel,
    answer: parseAIAnswer({ ...answer, summary: 'Bản nháp luyện tập đã tự đối chiếu', explanation: '', examples: [], corrections: [], mnemonic: '' }, { task: 'content', exerciseKind: kind }) };
}
