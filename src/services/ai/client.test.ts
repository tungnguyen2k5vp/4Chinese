import type { SQLiteDatabase } from 'expo-sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { learnerAIContext } from './adaptive';
import { reviewedAIContent } from './content';
import { characterAILaunch, wordAILaunch } from './context';
import { checkChineseAIBackend, sendChineseAI, type AIRequest } from './gateway';
import { aiQuestionText, practiceAIContext, summarizeAIPractice, writingQuestion } from './learning';
import { DEFAULT_AI_PREFERENCES, parseAIPreferences, useAISettings } from './preferences';

import type { MemoryCandidate } from '@/db/hanzi-memory';
import type { Mistake } from '@/db/mistakes';
import type { Vocabulary } from '@/types/models';

const mocks = vi.hoisted(() => ({ session: vi.fn(), client: vi.fn(), guest: vi.fn(), guestSession: vi.fn(), guestSignIn: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock('@/services/cloud/client', () => ({ getCloudClient: mocks.client, getAIGuestClient: mocks.guest }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.read, setItemAsync: mocks.write }));

const request: AIRequest = { mode: 'GEMINI_FREE', question: 'Giải thích 学.', task: 'word', context: null,
  consent: { providers: ['gemini'], scope: 'question', allowFailover: false, adult: true }, history: [], session: 'qa-session-only', dailyLimit: 5 };
const answer = { summary: 'Gợi ý thử.', explanation: '', examples: [], corrections: [], quiz: [], mnemonic: '' };
beforeEach(() => {
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://qa-supabase.invalid'); vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'qa-public-anon');
  mocks.client.mockReturnValue({ auth: { getSession: mocks.session } });
  mocks.session.mockResolvedValue({ data: { session: { access_token: 'qa-jwt-never-to-model' } }, error: null });
  mocks.guest.mockReturnValue({ auth: { getSession: mocks.guestSession, signInAnonymously: mocks.guestSignIn } });
  mocks.guestSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.guestSignIn.mockResolvedValue({ data: { session: { access_token: 'qa-guest-jwt' } }, error: null });
  mocks.read.mockResolvedValue(null); mocks.write.mockResolvedValue(undefined);
  useAISettings.setState({ preferences: DEFAULT_AI_PREFERENCES, ready: false, saving: false, error: '' });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.useRealTimers(); });
describe('client transport is not a direct model client', () => {
  it('only sends JWT to Supabase and validates output', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ answer, provider: 'gemini', model: 'gemini-3.8-flash', requestId: 'qa-one' })));
    vi.stubGlobal('fetch', fetcher);
    await expect(sendChineseAI(request)).resolves.toMatchObject({ answer });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://qa-supabase.invalid/functions/v1/chinese-ai');
    expect(JSON.parse(String(init?.body))).toEqual(request);
    expect(String(init?.body)).not.toMatch(/qa-jwt|qa-public-anon|notes|deck|userId/u);
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer qa-jwt-never-to-model' });
  });
  it.each(['DISABLED', 'LOCAL_ONLY'] as const)('does not even ask Cloud auth in %s', async mode => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(sendChineseAI({ ...request, mode })).rejects.toBeInstanceOf(Error);
    await expect(checkChineseAIBackend(mode)).rejects.toBeInstanceOf(Error);
    expect(mocks.session).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('handles missing backend, auth and cancellation before any send', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    mocks.client.mockReturnValueOnce(null);
    await expect(sendChineseAI(request)).rejects.toMatchObject({ code: 'AI_BACKEND_NOT_CONFIGURED' });
    mocks.session.mockResolvedValueOnce({ data: { session: null }, error: null });
    mocks.guestSignIn.mockResolvedValueOnce({ data: { session: null }, error: { code: 'qa-auth-failed' } });
    await expect(sendChineseAI(request)).rejects.toMatchObject({ code: 'AI_LOGIN_REQUIRED' });
    const controller = new AbortController(); controller.abort();
    await expect(sendChineseAI(request, controller.signal)).rejects.toMatchObject({ code: 'AI_CANCELLED' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('creates a guest AI session without email or password when Cloud is unused', async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ answer, provider: 'gemini', model: 'gemini-3.8-flash', requestId: 'qa-guest' })));
    vi.stubGlobal('fetch', fetcher);
    await expect(sendChineseAI(request)).resolves.toMatchObject({ answer });
    expect(mocks.guestSignIn).toHaveBeenCalledExactlyOnceWith();
    expect(fetcher.mock.calls[0]![1]?.headers).toMatchObject({ Authorization: 'Bearer qa-guest-jwt' });
    expect(String(fetcher.mock.calls[0]![1]?.body)).not.toMatch(/email|password|qa-guest-jwt/);
  });
  it('reuses a stored guest session and retains the existing Cloud session when available', async () => {
    mocks.session.mockResolvedValueOnce({ data: { session: null }, error: null });
    mocks.guestSession.mockResolvedValue({ data: { session: { access_token: 'qa-stored-guest' } }, error: null });
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ answer, provider: 'gemini', model: 'gemini-3.8-flash', requestId: 'qa-reuse' })));
    vi.stubGlobal('fetch', fetcher);
    await sendChineseAI(request); await sendChineseAI(request);
    expect(fetcher.mock.calls[0]![1]?.headers).toMatchObject({ Authorization: 'Bearer qa-stored-guest' });
    expect(fetcher.mock.calls[1]![1]?.headers).toMatchObject({ Authorization: 'Bearer qa-jwt-never-to-model' });
    expect(mocks.guestSignIn).not.toHaveBeenCalled(); expect(mocks.guest).toHaveBeenCalledOnce();
  });
  it('deduplicates concurrent guest creation and ignores late signup after cancellation', async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    let finish: (value: unknown) => void = () => {};
    mocks.guestSignIn.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ answer, provider: 'gemini', model: 'gemini-3.8-flash', requestId: 'qa-concurrent' })));
    vi.stubGlobal('fetch', fetcher);
    const controller = new AbortController();
    const cancelled = sendChineseAI(request, controller.signal), active = sendChineseAI(request);
    const expectedCancel = expect(cancelled).rejects.toMatchObject({ code: 'AI_CANCELLED' });
    await vi.waitFor(() => expect(mocks.guestSignIn).toHaveBeenCalledOnce());
    controller.abort(); await expectedCancel;
    finish({ data: { session: { access_token: 'qa-shared-guest' } }, error: null });
    await expect(active).resolves.toMatchObject({ answer });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]![1]?.headers).toMatchObject({ Authorization: 'Bearer qa-shared-guest' });
  });
  it.each([['anonymous_provider_disabled', undefined, 'AI_BACKEND_NOT_CONFIGURED'], ['over_request_rate_limit', 429, 'AI_RATE_LIMITED']] as const)('maps guest signup failure %s without leaking provider errors', async (code, status, expected) => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    mocks.guestSignIn.mockResolvedValueOnce({ data: { session: null }, error: { code, status, message: 'private-diagnostic' } });
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(sendChineseAI(request)).rejects.toMatchObject({ code: expected });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('cancels a stalled session lookup without a late request', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    let resolveAuth: (value: unknown) => void = () => {};
    mocks.session.mockImplementationOnce(() => new Promise(resolve => { resolveAuth = resolve; }));
    const controller = new AbortController(), pending = sendChineseAI(request, controller.signal);
    await Promise.resolve(); controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'AI_CANCELLED' });
    resolveAuth({ data: { session: { access_token: 'late-private-token' } }, error: null });
    await Promise.resolve(); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([[404, 'AI_BACKEND_NOT_CONFIGURED'], [401, 'AI_LOGIN_REQUIRED'], [429, 'AI_RATE_LIMITED'], [503, 'AI_BUSY']] as const)('maps HTTP%s without exposing raw backend errors', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('private-provider-stack-and-key', { status })));
    await expect(sendChineseAI(request)).rejects.toMatchObject({ code });
  });
  it('does not call model inference to check configuration and rejects invented quota', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ source: 'configuration', runtime: 'DISABLED', developmentOnly: true,
      models: [{ provider: 'gemini', model: 'gemini-3.8-flash', reason: 'AI_BACKEND_NOT_CONFIGURED', quotaRemaining: null, liveHealth: 'not-checked' }] })));
    vi.stubGlobal('fetch', fetcher);
    await expect(checkChineseAIBackend('GEMINI_FREE')).resolves.toMatchObject({ runtime: 'DISABLED' });
    expect(JSON.parse(String(fetcher.mock.calls[0]![1].body))).toEqual({ action: 'status' });
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ source: 'configuration', runtime: 'DEVELOPMENT', developmentOnly: true,
      models: [{ provider: 'gemini', model: 'gemini-3.8-flash', reason: null, quotaRemaining: 1000000, liveHealth: 'healthy' }] })));
    await expect(checkChineseAIBackend('GEMINI_FREE')).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });
  });
  it('checks the response against the task, not only the generic output schema', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ answer, provider: 'gemini', model: 'gemini-3.8-flash', requestId: 'qa-practice' })));
    vi.stubGlobal('fetch', fetcher);
    await expect(sendChineseAI({ ...request, task: 'practice', exerciseKind: 'cloze' })).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
describe('learning drafts stay local until an explicit send', () => {
  it('projects only actual submitted choices and carries them through explicit consent', async () => {
    const q = { question: '我____茶。', choices: ['喝', '听'], answerIndex: 0, explanation: 'Đáp án tham khảo.', privateId: 'secret-id', progress: 'secret-progress' };
    const snapshot = JSON.stringify(q), context = practiceAIContext([q], [1]);
    expect(context).toEqual({ kind: 'practice', attempts: [{ question: q.question, choices: ['喝', '听'], answerIndex: 0, explanation: q.explanation, selectedIndex: 1 }] });
    expect(JSON.stringify(context)).not.toMatch(/secret|privateId|progress/);
    for (const selected of [[], [null], [-1], [2], [0.5]]) expect(() => practiceAIContext([q], selected)).toThrow();
    expect(() => practiceAIContext([], [])).toThrow();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ answer, provider: 'gemini', model: 'gemini-3.8-flash', requestId: 'qa-review' })));
    vi.stubGlobal('fetch', fetcher);
    await expect(sendChineseAI({ ...request, task: 'practice_review', context })).rejects.toMatchObject({ code: 'AI_CONSENT_REQUIRED' });
    expect(fetcher).not.toHaveBeenCalled();
    await sendChineseAI({ ...request, task: 'practice_review', context, hskLevel: 3, consent: { ...request.consent, scope: 'selected' } });
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toMatchObject({ task: 'practice_review', context, history: [], hskLevel: 3 });
    expect(JSON.stringify(q)).toBe(snapshot);
  });
  it('isolates English writing from Chinese data and uses the requested language', async () => {
    expect(writingQuestion('I goes home.', 'Tôi về nhà.', 'en')).toContain('Sửa câu tiếng Anh');
    const en = { ...request, task: 'writing' as const, language: 'en' as const, question: writingQuestion('I goes home.', '', 'en') };
    const correction = { original: 'I goes home.', corrected: 'I go home.', reason: 'Chủ ngữ I dùng go.' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ answer: { ...answer, corrections: [correction] }, provider: 'gemini', model: 'gemini-3.8-flash', requestId: 'en-qa' }))));
    await expect(sendChineseAI(en)).resolves.toMatchObject({ answer: { corrections: [correction] } });
    await expect(sendChineseAI({ ...en, consent: { ...en.consent, scope: 'selected' }, context: { kind: 'reader', text: '秘密' } })).rejects.toMatchObject({ code: 'AI_INVALID_INPUT' });
  });
  it('projects selected adaptive evidence without copying IDs, notes, personal sentences or dates', () => {
    const candidate = { word: { id: 'secret-id', simplified: '打', pinyin: 'dǎ', meaningsVi: ['đánh\ngọi điện'], primaryMeaningVi: 'đánh', notes: 'secret-note', deckId: 'secret-deck' },
      wrongCount: 4, lapseCount: 2, personalSentence: 'secret-sentence', learnedAt: '2040-01-01' } as unknown as MemoryCandidate;
    const mistake = { id: 'secret-mistake', vocabulary_id: 'secret-id', title: '打', skill_type: 'PINYIN', exercise_type: 'hanzi_to_pinyin', wrong_count: 3, last_wrong_at: '2040-01-01' } as Mistake;
    const before = JSON.stringify(candidate), context = learnerAIContext('Dùng từ đúng.', 10, Array(8).fill(candidate), Array(10).fill(mistake));
    expect(context.words).toHaveLength(6); expect(context.mistakes).toHaveLength(8);
    expect(context.words[0]).toEqual({ hanzi: '打', pinyin: 'dǎ', meanings: ['đánh', 'gọi điện'], wrongAttempts: 4, lapses: 2 });
    expect(JSON.stringify(context)).not.toMatch(/secret-|2040|vocabulary_id|learnedAt|notes|deckId/u);
    expect(JSON.stringify(candidate)).toBe(before);
  });
  it('exports only a validated, explicitly reviewed content draft with provenance', () => {
    const draft = { ...answer, quiz: [{ question: '我____茶。', choices: ['喝', '听'], answerIndex: 0, explanation: '喝 dùng với đồ uống.' }] };
    expect(() => reviewedAIContent(draft, 'cloze', false, 'Đồ uống', '我喝茶。')).toThrow();
    const out = reviewedAIContent(draft, 'cloze', true, 'Đồ uống', '我喝茶。', 2);
    expect(out).toMatchObject({ status: 'human-reviewed-draft', officialExam: false, hskLevel: 2, source: '我喝茶。', answer: { quiz: draft.quiz, examples: [], corrections: [], mnemonic: '' } });
    expect(() => reviewedAIContent({ ...draft, quiz: [{ ...draft.quiz[0]!, choices: ['喝', '喝'] }] }, 'cloze', true, 'Đồ uống', '')).toThrow();
    expect(() => reviewedAIContent(draft, 'choice', true, 'Đồ uống', '')).toThrow();
    expect(() => reviewedAIContent(draft, 'cloze', true, 'Đồ uống', '', 10)).toThrow();
    expect(draft.quiz[0]!.choices).toEqual(['喝', '听']);
  });
  it('keeps the intended meaning in writing requests and validates limits without truncating', () => {
    const text = '  我昨天去学校。  ', meaning = '  Tôi muốn nói về ngày mai.  ';
    expect(writingQuestion(text, meaning)).toContain('我昨天去学校。\nÝ tôi muốn nói: Tôi muốn nói về ngày mai.');
    expect(writingQuestion('中'.repeat(1000), 'ý'.repeat(150))).toContain('中'.repeat(1000));
    for (const [sentence, intent] of [[' ', ''], ['中'.repeat(1001), ''], ['你好。', 'x'.repeat(301)]]) {
      expect(() => writingQuestion(sentence!, intent!)).toThrow();
    }
    expect(text).toBe('  我昨天去学校。  ');
  });
  it('previews the current translation and chosen HSK without copying context or learner state', () => {
    const current = { ...request, context: { kind: 'reader' as const, text: 'private-unselected-text' }, hskLevel: 9,
      translation: { direction: 'vi-zh' as const, feedback: 'review' as const, source: 'Tôi học tiếng Trung.', attempt: '我学习中文。' } };
    const preview = aiQuestionText(current);
    expect(preview).toContain('HSK 9'); expect(preview).toContain('Việt → Trung');
    expect(preview).toContain('Câu gốc: Tôi học tiếng Trung.'); expect(preview).toContain('Tôi dịch thử: 我学习中文。');
    expect(preview).not.toMatch(/private-unselected|qa-session|consent/u);
    expect(aiQuestionText({ question: 'Gợi ý.', hskLevel: null })).toBe('Gợi ý.');
  });
  it('counts only valid draft choices and leaves questions and answers intact', () => {
    const quiz = [0, 1, 0].map(answerIndex => ({ question: '我____茶。', choices: ['喝', '看'], answerIndex, explanation: 'Gợi ý AI.' }));
    const before = JSON.stringify(quiz), choices = [0, null, 9];
    expect(summarizeAIPractice(quiz, choices)).toEqual({ answered: 1, matched: 1, total: 3 });
    expect(summarizeAIPractice(quiz, [-1, 1.5, Number.NaN])).toEqual({ answered: 0, matched: 0, total: 3 });
    expect(summarizeAIPractice(quiz, [1, 1, 0])).toEqual({ answered: 3, matched: 2, total: 3 });
    expect(summarizeAIPractice(quiz, [])).toEqual({ answered: 0, matched: 0, total: 3 });
    expect(JSON.stringify(quiz)).toBe(before); expect(choices).toEqual([0, null, 9]);
  });
});
describe('preferences do not touch the learning database', () => {
  it('defaults to disabled and fails closed for corrupt storage', async () => {
    expect(parseAIPreferences({ ...DEFAULT_AI_PREFERENCES, mode: 'UNLIMITED_PAID' }).mode).toBe('DISABLED');
    mocks.read.mockResolvedValueOnce('{broken');
    await useAISettings.getState().load();
    expect(useAISettings.getState().preferences.mode).toBe('DISABLED'); expect(useAISettings.getState().error).not.toBe('');
  });
  it('does not enable AI on failed preference save and persists explicit revoke', async () => {
    mocks.write.mockRejectedValueOnce(new Error('storage unavailable'));
    await useAISettings.getState().change({ ...DEFAULT_AI_PREFERENCES, mode: 'GEMINI_FREE', consent: request.consent });
    expect(useAISettings.getState().preferences.mode).toBe('DISABLED');
    await useAISettings.getState().change({ ...DEFAULT_AI_PREFERENCES, mode: 'GEMINI_FREE', consent: request.consent });
    expect(useAISettings.getState().preferences.consent.providers).toEqual(['gemini']);
    await useAISettings.getState().change(DEFAULT_AI_PREFERENCES);
    const saved = JSON.parse(mocks.write.mock.calls.at(-1)![1]);
    expect(saved.mode).toBe('DISABLED'); expect(saved.consent.providers).toEqual([]);
  });
});
describe('context uses local data without copying learner state', () => {
  const word = { id: 'private-word-id', simplified: '打', pinyin: 'dǎ', meaningsVi: ['đánh', 'gọi điện'], primaryMeaningVi: 'đánh', pos: ['động từ'], hskBand: 1,
    notes: 'private note', reviewCount: 9, deckId: 'private-deck', nextReviewAt: '2040-01-01' } as unknown as Vocabulary;
  it('requires a choice for multiple local meanings, without selecting or blending', async () => {
    const getAllAsync = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const launch = await wordAILaunch({ getAllAsync } as unknown as SQLiteDatabase, word);
    expect(launch.context).toBeNull(); expect(launch.senses?.map(s => s.meaning)).toEqual(['đánh', 'gọi điện']);
    expect(JSON.stringify(launch)).not.toMatch(/private-note|private note|private-word-id|private-deck|2040|reviewCount/u);
    expect(getAllAsync.mock.calls.every(call => String(call[0]).includes('SELECT'))).toBe(true);
  });
  it('keeps reviewed sense readings without hiding other local meanings or auto-selecting one', async () => {
    const db = { getAllAsync: vi.fn().mockResolvedValueOnce([{ sense_id: 'local-only-id', part_of_speech: 'động từ', definition_vi: 'gọi điện', pinyin_numeric: 'da3', usage_note: '打电话' }]).mockResolvedValueOnce([]) };
    const launch = await wordAILaunch(db as unknown as SQLiteDatabase, word);
    expect(launch.context).toBeNull();
    expect(launch.senses?.find(s => s.meaning === 'gọi điện')).toMatchObject({ pinyin: 'dǎ', usage: '打电话' });
    expect(launch.senses?.some(s => s.meaning === 'đánh')).toBe(true); expect(JSON.stringify(launch)).not.toContain('local-only-id');
  });
  it('separates explicit newline sense blocks without editing or guessing comma-separated synonyms', async () => {
    const getAllAsync = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const meanings = ['(động từ) dự định, tính toán\n(danh từ) dự định, kế hoạch'];
    const launch = await wordAILaunch({ getAllAsync } as unknown as SQLiteDatabase, { ...word, simplified: '打算', meaningsVi: meanings });
    expect(launch.context).toBeNull();
    expect(launch.senses?.map(s => s.meaning)).toEqual(['(động từ) dự định, tính toán', '(danh từ) dự định, kế hoạch']);
    expect(meanings).toEqual(['(động từ) dự định, tính toán\n(danh từ) dự định, kế hoạch']);
  });
  it('does not fabricate structure for unknown characters or send local note targets', () => {
    const unknown = characterAILaunch('龘', 'private-word-id');
    expect(unknown.context).toMatchObject({ structure: expect.stringContaining('Chưa có cấu tạo') });
    const known = characterAILaunch('晴', 'private-word-id');
    expect(known.context).toMatchObject({ structure: expect.stringContaining('日 + 青') });
    expect(JSON.stringify(known.context)).not.toContain('private-word-id');
    expect(known.noteTarget?.wordId).toBe('private-word-id');
  });
});
