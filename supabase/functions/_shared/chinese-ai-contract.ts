/** Pure wire contract, shared by the app and Edge Function. No database/tool actions. */
export const AI_PROVIDERS = ['gemini', 'groq', 'openrouter', 'openai'] as const;
export type AIProvider = typeof AI_PROVIDERS[number];
export const AI_MODES = ['AUTO_FREE', 'GEMINI_FREE', 'GROQ_FREE', 'OPENROUTER_FREE', 'LOCAL_ONLY', 'DISABLED'] as const;
export type AIMode = typeof AI_MODES[number];
export const AI_TASKS = ['tutor', 'word', 'compare', 'mnemonic', 'grammar', 'writing', 'translation', 'practice', 'memory', 'reader', 'coach', 'conversation', 'speaking_review', 'content', 'practice_review'] as const;
export type AITask = typeof AI_TASKS[number];
export type AIExample = { hanzi: string; pinyin: string; vietnamese: string };
export type AIContext =
  | { kind: 'word'; hanzi: string; pinyin: string; meaning: string; pos: string; usage: string; hsk: string }
  | { kind: 'character'; hanzi: string; pinyin: string; meaning: string; structure: string; source: string }
  | { kind: 'grammar'; title: string; pattern: string; explanation: string; example: string; hsk: string }
  | { kind: 'reader'; text: string }
  | { kind: 'comparison'; words: { hanzi: string; pinyin: string; meaning: string; usage: string }[] }
  | { kind: 'weakness'; summary: { skill: string; openItems: number; wrongAttempts: number }[] }
  | { kind: 'learner'; goal: string; minutes: number;
    words: { hanzi: string; pinyin: string; meanings: string[]; wrongAttempts: number; lapses: number }[];
    mistakes: { title: string; skill: string; exercise: string; wrongAttempts: number }[] }
  | { kind: 'conversation'; scene: string; turns: { role: 'user' | 'assistant'; text: string }[] }
  | { kind: 'practice'; attempts: (AIQuiz & { selectedIndex: number })[] };
export type AIConsent = { providers: AIProvider[]; scope: 'question' | 'selected'; allowFailover: boolean; adult: boolean };
export const AI_EXERCISE_KINDS = ['choice', 'cloze', 'mixed'] as const;
export type AIExerciseKind = typeof AI_EXERCISE_KINDS[number];
export type AITranslation = { direction: 'vi-zh' | 'zh-vi'; feedback: 'hint' | 'review'; source: string; attempt: string };
export type AIRequest = { mode: AIMode; task: AITask; question: string; context: AIContext | null; consent: AIConsent;
  history: { role: 'user' | 'assistant'; text: string }[]; session: string; dailyLimit: number;
  hskLevel?: number | null; exerciseKind?: AIExerciseKind; translation?: AITranslation; language?: 'zh' | 'en' };
export type AIQuiz = { question: string; choices: string[]; answerIndex: number; explanation: string };
export type AIAnswer = { summary: string; explanation: string; examples: AIExample[];
  corrections: { original: string; corrected: string; reason: string }[]; quiz: AIQuiz[]; mnemonic: string };
export type AIResult = { answer: AIAnswer; provider: AIProvider; model: string; requestId: string };
export const AI_ERROR_MESSAGES = {
  AI_DISABLED: 'AI đang tắt. Bạn vẫn có thể dùng các bài học trên thiết bị.',
  AI_LOCAL_ONLY: 'Chế độ chỉ trên thiết bị không gọi dịch vụ AI. Mở từ điển, ngữ pháp hoặc cấu tạo chữ để học tiếp.',
  AI_CONSENT_REQUIRED: 'Chọn nhà cung cấp và đồng ý phạm vi dữ liệu trong Cài đặt AI trước khi gửi.',
  AI_BACKEND_NOT_CONFIGURED: 'Máy chủ AI chưa được cấu hình. Các chức năng học trên thiết bị vẫn dùng được.',
  AI_LOGIN_REQUIRED: 'Phiên AI chưa sẵn sàng hoặc đã hết hạn. Hãy thử lại; không cần nhập email hay mật khẩu.',
  AI_UNAUTHORIZED: 'Phiên AI này chưa được mở quyền dùng thử. Kiểm tra máy chủ trong Cài đặt AI để lấy mã kích hoạt.',
  AI_ADMIN_REQUIRED: 'Tài khoản chưa được cấp quyền biên tập AI trên máy chủ. Nội dung học và tiến độ vẫn giữ nguyên.',
  AI_FREE_NOT_VERIFIED: 'Chưa xác minh được quyền dùng miễn phí cho model này. Đã dừng, không chuyển sang model trả phí.',
  AI_RATE_LIMITED: 'Đã chạm giới hạn lượt miễn phí hoặc gửi quá nhanh. Hãy đợi rồi thử lại; không có chuyển sang trả phí.',
  AI_BUSY: 'Nhà cung cấp đang bận. Bạn có thể thử lại sau hoặc tiếp tục học offline.',
  AI_MODEL_UNAVAILABLE: 'Model hiện không khả dụng. Kiểm tra lựa chọn trong Cài đặt AI.',
  AI_PROVIDER_KEY: 'Khóa hoặc quyền nhà cung cấp trên máy chủ chưa hợp lệ. Cần người quản trị kiểm tra.',
  AI_NETWORK: 'Không kết nối được AI. Kiểm tra mạng hoặc tiếp tục học trên thiết bị.',
  AI_TIMEOUT: 'AI phản hồi quá lâu. Hãy thử lại với câu hỏi ngắn hơn.',
  AI_CANCELLED: 'Đã dừng yêu cầu. Nội dung đã gửi trước đó không thể thu hồi.',
  AI_INVALID_INPUT: 'Nội dung chưa hợp lệ. Câu hỏi tối đa 1.500 ký tự; đoạn đọc 1.200 ký tự; câu gốc và bản dịch thử mỗi phần 600 ký tự.',
  AI_INVALID_RESPONSE: 'AI trả nội dung không đúng định dạng. Chưa áp dụng nội dung này; bạn có thể thử lại.',
} as const;
export type AIErrorCode = keyof typeof AI_ERROR_MESSAGES;
export class ChineseAIError extends Error {
  constructor(public readonly code: AIErrorCode, public readonly retryAfter?: number) { super(AI_ERROR_MESSAGES[code]); }
}
export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).some(key => !keys.includes(key))) throw new ChineseAIError('AI_INVALID_INPUT');
  return value;
}
function string(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new ChineseAIError('AI_INVALID_INPUT');
  return value.trim();
}
function number(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) throw new ChineseAIError('AI_INVALID_INPUT');
  return value;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new ChineseAIError('AI_INVALID_INPUT');
  return value;
}
function quizItem(value: unknown): AIQuiz {
  const q = record(value, ['question', 'choices', 'answerIndex', 'explanation']);
  const choices = list(q.choices, 4).map(choice => string(choice, 160, true));
  if (choices.length < 2 || new Set(choices).size !== choices.length) throw new ChineseAIError('AI_INVALID_INPUT');
  return { question: string(q.question, 500, true), choices, answerIndex: number(q.answerIndex, choices.length - 1), explanation: string(q.explanation, 800, true) };
}
export function parseAIContext(value: unknown): AIContext | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new ChineseAIError('AI_INVALID_INPUT');
  const textFields: Record<string, Record<string, number>> = {
    word: { hanzi: 40, pinyin: 180, meaning: 500, pos: 100, usage: 500, hsk: 8 },
    character: { hanzi: 2, pinyin: 180, meaning: 300, structure: 500, source: 300 },
    grammar: { title: 150, pattern: 300, explanation: 1000, example: 300, hsk: 8 },
    reader: { text: 1200 },
  };
  const fields = Object.hasOwn(textFields, String(value.kind)) ? textFields[String(value.kind)] : undefined;
  if (fields) {
    const row = record(value, ['kind', ...Object.keys(fields)]);
    const result: Record<string, string> = { kind: String(row.kind) };
    for (const [key, max] of Object.entries(fields)) result[key] = string(row[key], max, key === 'hanzi' || key === 'text' || key === 'title' || key === 'meaning');
    if (row.kind === 'character' && !/^\p{Script=Han}$/u.test(result.hanzi!)) throw new ChineseAIError('AI_INVALID_INPUT');
    return result as AIContext;
  }
  if (value.kind === 'comparison') {
    const row = record(value, ['kind', 'words']);
    const words = list(row.words, 4).map(item => {
      const word = record(item, ['hanzi', 'pinyin', 'meaning', 'usage']);
      return { hanzi: string(word.hanzi, 40, true), pinyin: string(word.pinyin, 180), meaning: string(word.meaning, 500, true), usage: string(word.usage, 500) };
    });
    if (words.length < 2) throw new ChineseAIError('AI_INVALID_INPUT');
    return { kind: 'comparison', words };
  }
  if (value.kind === 'weakness') {
    const row = record(value, ['kind', 'summary']);
    const summary = list(row.summary, 8).map(item => {
      const part = record(item, ['skill', 'openItems', 'wrongAttempts']);
      return { skill: string(part.skill, 60, true), openItems: number(part.openItems, 10000), wrongAttempts: number(part.wrongAttempts, 1000000) };
    });
    if (!summary.length) throw new ChineseAIError('AI_INVALID_INPUT');
    return { kind: 'weakness', summary };
  }
  if (value.kind === 'learner') {
    const row = record(value, ['kind', 'goal', 'minutes', 'words', 'mistakes']);
    const minutes = number(row.minutes, 60);
    if (minutes < 1) throw new ChineseAIError('AI_INVALID_INPUT');
    return { kind: 'learner', goal: string(row.goal, 300, true), minutes,
      words: list(row.words, 6).map(item => {
        const w = record(item, ['hanzi', 'pinyin', 'meanings', 'wrongAttempts', 'lapses']);
        return { hanzi: string(w.hanzi, 40, true), pinyin: string(w.pinyin, 180), meanings: list(w.meanings, 3).map(m => string(m, 160, true)),
          wrongAttempts: number(w.wrongAttempts, 1000000), lapses: number(w.lapses, 1000000) };
      }), mistakes: list(row.mistakes, 8).map(item => {
        const m = record(item, ['title', 'skill', 'exercise', 'wrongAttempts']);
        return { title: string(m.title, 150, true), skill: string(m.skill, 60, true), exercise: string(m.exercise, 100, true), wrongAttempts: number(m.wrongAttempts, 1000000) };
      }) };
  }
  if (value.kind === 'practice') {
    const row = record(value, ['kind', 'attempts']);
    const attempts = list(row.attempts, 3).map(item => {
      const { selectedIndex, ...quiz } = record(item, ['question', 'choices', 'answerIndex', 'explanation', 'selectedIndex']);
      const parsed = quizItem(quiz);
      return { ...parsed, selectedIndex: number(selectedIndex, parsed.choices.length - 1) };
    });
    if (!attempts.length) throw new ChineseAIError('AI_INVALID_INPUT');
    return { kind: 'practice', attempts };
  }
  if (value.kind === 'conversation') {
    const row = record(value, ['kind', 'scene', 'turns']);
    return { kind: 'conversation', scene: string(row.scene, 150, true), turns: list(row.turns, 12).map(item => {
      const t = record(item, ['role', 'text']);
      if (t.role !== 'user' && t.role !== 'assistant') throw new ChineseAIError('AI_INVALID_INPUT');
      return { role: t.role, text: string(t.text, 500, true) };
    }) };
  }
  throw new ChineseAIError('AI_INVALID_INPUT');
}
export function parseAIRequest(value: unknown): AIRequest {
  const row = record(value, ['mode', 'task', 'question', 'context', 'consent', 'history', 'session', 'dailyLimit', 'hskLevel', 'exerciseKind', 'translation', 'language']);
  if (!AI_MODES.includes(row.mode as AIMode) || !AI_TASKS.includes(row.task as AITask)) throw new ChineseAIError('AI_INVALID_INPUT');
  const consent = record(row.consent, ['providers', 'scope', 'allowFailover', 'adult']);
  const providers = list(consent.providers, 4);
  if (providers.some(p => !AI_PROVIDERS.includes(p as AIProvider)) || new Set(providers).size !== providers.length ||
    !['question', 'selected'].includes(String(consent.scope)) || typeof consent.allowFailover !== 'boolean' || typeof consent.adult !== 'boolean') throw new ChineseAIError('AI_INVALID_INPUT');
  const context = parseAIContext(row.context);
  if (context && consent.scope !== 'selected') throw new ChineseAIError('AI_CONSENT_REQUIRED');
  const history = list(row.history, 8);
  if (history.length && consent.scope !== 'selected') throw new ChineseAIError('AI_CONSENT_REQUIRED');
  const session = string(row.session, 80, true);
  if (!/^[a-zA-Z0-9-]{8,80}$/u.test(session)) throw new ChineseAIError('AI_INVALID_INPUT');
  const dailyLimit = number(row.dailyLimit, 40);
  if (dailyLimit < 1) throw new ChineseAIError('AI_INVALID_INPUT');
  const study: Pick<AIRequest, 'hskLevel' | 'exerciseKind' | 'translation' | 'language'> = {};
  if (Object.hasOwn(row, 'language')) {
    if (row.language !== 'zh' && row.language !== 'en') throw new ChineseAIError('AI_INVALID_INPUT');
    study.language = row.language;
    if (row.language === 'en' && (row.task !== 'writing' || context || row.hskLevel != null)) throw new ChineseAIError('AI_INVALID_INPUT');
  }
  if (Object.hasOwn(row, 'hskLevel')) {
    study.hskLevel = row.hskLevel === null ? null : number(row.hskLevel, 9);
    if (study.hskLevel === 0) throw new ChineseAIError('AI_INVALID_INPUT');
  }
  if (Object.hasOwn(row, 'exerciseKind')) {
    if (!['practice', 'content'].includes(String(row.task)) || !AI_EXERCISE_KINDS.includes(row.exerciseKind as AIExerciseKind)) throw new ChineseAIError('AI_INVALID_INPUT');
    study.exerciseKind = row.exerciseKind as AIExerciseKind;
  }
  if (row.task === 'translation') {
    const item = record(row.translation, ['direction', 'feedback', 'source', 'attempt']);
    if (!['vi-zh', 'zh-vi'].includes(String(item.direction)) || !['hint', 'review'].includes(String(item.feedback))) throw new ChineseAIError('AI_INVALID_INPUT');
    study.translation = { direction: item.direction as AITranslation['direction'], feedback: item.feedback as AITranslation['feedback'],
      source: string(item.source, 600, true), attempt: string(item.attempt, 600, item.feedback === 'review') };
  } else if (Object.hasOwn(row, 'translation')) throw new ChineseAIError('AI_INVALID_INPUT');
  if ((row.task === 'coach' && context?.kind !== 'learner') ||
    (row.task === 'practice_review' && context?.kind !== 'practice') ||
    (['conversation', 'speaking_review'].includes(String(row.task)) && context?.kind !== 'conversation') ||
    (row.task === 'speaking_review' && context?.kind === 'conversation' && !context.turns.some(t => t.role === 'user'))) throw new ChineseAIError('AI_INVALID_INPUT');
  return { mode: row.mode as AIMode, task: row.task as AITask, question: string(row.question, 1500, true), context,
    consent: { providers: providers as AIProvider[], scope: consent.scope as 'question' | 'selected', allowFailover: consent.allowFailover, adult: consent.adult },
    history: history.map(item => { const turn = record(item, ['role', 'text']);
      if (turn.role !== 'user' && turn.role !== 'assistant') throw new ChineseAIError('AI_INVALID_INPUT');
      return { role: turn.role, text: string(turn.text, 1500, true) }; }), session, dailyLimit, ...study };
}
export function parseAIAnswer(value: unknown, request?: Pick<AIRequest, 'task' | 'exerciseKind' | 'translation' | 'language'>): AIAnswer {
  try {
    const row = record(value, ['summary', 'explanation', 'examples', 'corrections', 'quiz', 'mnemonic']);
    const result = { summary: string(row.summary, 800, true), explanation: string(row.explanation, 3500), mnemonic: string(row.mnemonic, 1200),
      examples: list(row.examples, 3).map(item => { const e = record(item, ['hanzi', 'pinyin', 'vietnamese']);
        return { hanzi: string(e.hanzi, 300, true), pinyin: string(e.pinyin, 600, true), vietnamese: string(e.vietnamese, 600, true) }; }),
      corrections: list(row.corrections, 4).map(item => { const c = record(item, ['original', 'corrected', 'reason']);
        return { original: string(c.original, 600, true), corrected: string(c.corrected, 600, true), reason: string(c.reason, 800, true) }; }),
      quiz: list(row.quiz, 3).map(quizItem),
    };
    if (result.mnemonic.includes('[4Chinese:') || result.mnemonic.includes('[/4Chinese:')) throw new Error('note-marker');
    if (request?.task === 'practice' || request?.task === 'content') {
      const blanks = result.quiz.filter(q => /_{2,}/u.test(q.question)).length;
      if (!result.quiz.length || result.quiz.some(q => /_{2,}/u.test(q.question) && !/\p{Script=Han}/u.test(q.question)) ||
        (request.exerciseKind === 'choice' && blanks > 0) || (request.exerciseKind === 'cloze' && blanks !== result.quiz.length) ||
        (request.exerciseKind === 'mixed' && (blanks === 0 || blanks === result.quiz.length))) throw new Error('exercise-kind');
    }
    if (request?.language === 'en' && (result.examples.length || result.quiz.length || result.mnemonic)) throw new Error('english-writing-only');
    if (request?.task === 'conversation' && (result.examples.length !== 1 || !/\p{Script=Han}/u.test(result.examples[0]!.hanzi) || result.quiz.length || result.mnemonic)) throw new Error('conversation-reply');
    if (request?.task === 'translation' && request.translation?.feedback === 'hint' &&
      (result.examples.length || result.corrections.length || result.quiz.length || result.mnemonic)) throw new Error('hint-must-not-include-solution-fields');
    return result;
  } catch { throw new ChineseAIError('AI_INVALID_RESPONSE'); }
}
export function parseAIResult(value: unknown, request?: AIRequest): AIResult {
  if (!isRecord(value) || !AI_PROVIDERS.includes(value.provider as AIProvider) || typeof value.model !== 'string' || value.model.length > 120 ||
    typeof value.requestId !== 'string' || value.requestId.length > 80) throw new ChineseAIError('AI_INVALID_RESPONSE');
  return { answer: parseAIAnswer(value.answer, request), provider: value.provider as AIProvider, model: value.model, requestId: value.requestId };
}
/** No tools, arbitrary objects, URLs, HTML, SQL or executable fields are accepted. */
export const AI_ANSWER_SCHEMA = { type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' }, explanation: { type: 'string' }, mnemonic: { type: 'string' },
    examples: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { hanzi: { type: 'string' }, pinyin: { type: 'string' }, vietnamese: { type: 'string' } }, required: ['hanzi', 'pinyin', 'vietnamese'] } },
    corrections: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { original: { type: 'string' }, corrected: { type: 'string' }, reason: { type: 'string' } }, required: ['original', 'corrected', 'reason'] } },
    quiz: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { question: { type: 'string' }, choices: { type: 'array', items: { type: 'string' } }, answerIndex: { type: 'integer' }, explanation: { type: 'string' } }, required: ['question', 'choices', 'answerIndex', 'explanation'] } },
  }, required: ['summary', 'explanation', 'examples', 'corrections', 'quiz', 'mnemonic'],
} as const;
