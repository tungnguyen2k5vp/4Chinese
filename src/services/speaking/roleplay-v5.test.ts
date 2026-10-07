import { afterEach, describe, expect, it, vi } from 'vitest';

import { beginRoleplayTurn, buildRoleplayRequest, cancelRoleplayTurn, createRoleplaySession, currentRoleplayGoal,
  finishRoleplayTurn, requestRoleplayReply, resetRoleplaySession, ROLEPLAY_MAX_HISTORY, ROLEPLAY_MAX_INPUT,
  ROLEPLAY_SCENES, ROLEPLAY_TIMEOUT_MS, ROLEPLAY_TURN_LIMITS, roleplayFailureHint, roleplaySummary,
  setRoleplayConsent, setRoleplayMode, toggleRoleplayGoal, type RoleplaySession, type RoleplayTransport } from './roleplay-v5';

const reply = { replyChinese: '你好！', pinyin: 'Nǐ hǎo!', translationVi: 'Xin chào!', correctionVi: 'Gợi ý về chữ.', suggestedChinese: '你呢？' };
const aiSession = () => setRoleplayMode(setRoleplayConsent(createRoleplaySession('restaurant'), true), 'AI');
const finish = (state: RoleplaySession, text = '你好') => {
  const pending = beginRoleplayTurn(state, text);
  return finishRoleplayTurn(pending, pending.pending!.id, reply);
};
afterEach(() => vi.useRealTimers());

describe('bounded goal-based role-play state', () => {
  it('starts offline, preserves original scene IDs and expands to thirteen internal scenarios', () => {
    expect(createRoleplaySession()).toMatchObject({ mode: 'OFFLINE', consent: false, level: 1, turnLimit: 8, exchanges: [], checkedGoals: [] });
    expect(ROLEPLAY_SCENES.slice(0, 3).map((scene) => scene.id)).toEqual(['daily', 'restaurant', 'directions']);
    expect(ROLEPLAY_SCENES).toHaveLength(13);
    expect(new Set(ROLEPLAY_SCENES.map((scene) => scene.id)).size).toBe(13);
    for (const level of [0, 7, 1.1, NaN]) expect(() => createRoleplaySession('daily', level)).toThrow();
    for (const limit of [0, 1, 13, Infinity]) expect(() => createRoleplaySession('daily', 1, limit)).toThrow();
  });
  it('defines stable scene goals, target words/grammar and bilingual scripted responses', () => {
    for (const scene of ROLEPLAY_SCENES) {
      expect(scene.setting).not.toBe('');
      expect(scene.targetWords.length).toBeGreaterThan(0);
      expect(scene.targetGrammar.length).toBeGreaterThan(0);
      expect(scene.successCriteria).toEqual(scene.goals.map((goal) => goal.label));
      expect(scene.recommendedLevel).toBeGreaterThanOrEqual(1);
      expect(new Set(scene.goals.map((goal) => goal.id)).size).toBe(scene.goals.length);
      for (const goal of scene.goals) expect(Object.values(goal).every((field) => field.trim())).toBe(true);
    }
    expect(ROLEPLAY_SCENES.find((scene) => scene.id === 'restaurant')!.goals.map((goal) => goal.id)).toEqual(['greet', 'menu', 'order', 'price', 'bill']);
  });
  it('rejects empty/oversized input and double submit without changing state', () => {
    const state = createRoleplaySession();
    for (const input of ['', ' \n ', 'x'.repeat(ROLEPLAY_MAX_INPUT + 1)]) expect(() => beginRoleplayTurn(state, input)).toThrow();
    const started = beginRoleplayTurn(state, 'x'.repeat(ROLEPLAY_MAX_INPUT));
    expect(() => beginRoleplayTurn(started, 'again')).toThrow('đợi');
    expect(state).toMatchObject({ attemptsUsed: 0, pending: null });
  });
  it('enforces each configured session cap and bounded exchange memory', () => {
    for (const limit of ROLEPLAY_TURN_LIMITS) {
      let state = createRoleplaySession('daily', 1, limit);
      for (let index = 0; index < limit; index++) state = finish(state);
      expect(state.exchanges).toHaveLength(limit);
      expect(state.attemptsUsed).toBe(limit);
      expect(() => beginRoleplayTurn(state, 'again')).toThrow('hết lượt');
    }
  });
  it('counts failures/cancellations, ignores stale completion and allows a bounded new turn', () => {
    const first = beginRoleplayTurn(createRoleplaySession(), 'first');
    const canceled = cancelRoleplayTurn(first);
    expect(canceled).toMatchObject({ pending: null, attemptsUsed: 1, exchanges: [] });
    expect(finishRoleplayTurn(canceled, first.pending!.id, reply)).toBe(canceled);
    const second = beginRoleplayTurn(canceled, 'second');
    expect(finishRoleplayTurn(second, first.pending!.id, reply)).toBe(second);
    expect(cancelRoleplayTurn(second, first.pending!.id)).toBe(second);
    expect(finishRoleplayTurn(second, second.pending!.id, reply).exchanges[0]!.text).toBe('second');
  });
  it('goals are self-assessed only, never completed by text matching or a provider response', () => {
    const state = finish(createRoleplaySession('restaurant'), '你好，菜单，米饭，面条，多少钱，买单');
    expect(roleplaySummary(state)).toEqual({ completedGoals: 0, totalGoals: 5, usedWords: ['菜单', '米饭', '面条', '多少钱', '买单'] });
    const checked = toggleRoleplayGoal(state, 'greet');
    expect(currentRoleplayGoal(checked).id).toBe('menu');
    expect(roleplaySummary(checked).completedGoals).toBe(1);
    expect(toggleRoleplayGoal(checked, 'greet').checkedGoals).toEqual([]);
    expect(() => toggleRoleplayGoal(state, 'invented-goal')).toThrow();
    expect(Object.keys(roleplaySummary(state))).not.toContain('pronunciationScore');
  });
  it('requires consent for AI and withdrawing consent invalidates a pending turn', () => {
    expect(() => setRoleplayMode(createRoleplaySession(), 'AI')).toThrow('đồng ý');
    expect(() => buildRoleplayRequest(beginRoleplayTurn(createRoleplaySession(), 'offline'))).toThrow();
    const started = beginRoleplayTurn(aiSession(), '你好');
    const withdrawn = setRoleplayConsent(started, false);
    expect(withdrawn).toMatchObject({ consent: false, mode: 'OFFLINE', pending: null, attemptsUsed: 1 });
    expect(finishRoleplayTurn(withdrawn, started.pending!.id, reply)).toBe(withdrawn);
  });
  it('reset/scene change deletes only session memory, resets consent and rejects old completion IDs', () => {
    const pending = beginRoleplayTurn(aiSession(), 'old private text');
    const reset = resetRoleplaySession(pending, 'directions', 6, 4);
    expect(reset).toMatchObject({ scene: 'directions', level: 6, turnLimit: 4, mode: 'OFFLINE', consent: false, attemptsUsed: 0, exchanges: [] });
    const next = beginRoleplayTurn(reset, 'new');
    expect(finishRoleplayTurn(next, pending.pending!.id, reply)).toBe(next);
  });
});

describe('text minimization and offline alternatives', () => {
  it('never calls auth/provider in offline mode, and does not pretend to analyze arbitrary input', async () => {
    const transport = vi.fn();
    for (const scene of ROLEPLAY_SCENES) {
      let state = createRoleplaySession(scene.id);
      for (const goal of scene.goals) {
        const started = beginRoleplayTurn(state, 'arbitrary text not matching the goal');
        const result = await requestRoleplayReply(started, new AbortController().signal, transport);
        expect(result).toMatchObject({ replyChinese: goal.partnerChinese, pinyin: goal.pinyin, translationVi: goal.translationVi });
        expect(result.correctionVi).toContain('không phân tích');
        state = toggleRoleplayGoal(finishRoleplayTurn(started, started.pending!.id, result), goal.id);
      }
    }
    expect(transport).not.toHaveBeenCalled();
  });
  it('builds only the unchanged provider fields with bounded context, even for maximum-length input in every goal', () => {
    for (const scene of ROLEPLAY_SCENES) {
      let state = setRoleplayMode(setRoleplayConsent(createRoleplaySession(scene.id), true), 'AI');
      for (const goal of scene.goals) {
        const request = buildRoleplayRequest(beginRoleplayTurn(state, '你'.repeat(ROLEPLAY_MAX_INPUT)));
        expect(Object.keys(request).sort()).toEqual(['history', 'level', 'message', 'scene']);
        expect(request.message.length).toBeLessThanOrEqual(500);
        expect(request.message).toContain(goal.label);
        expect(request.message).toContain('không chấm âm');
        expect(request.message).toContain(scene.setting);
        expect(request.scene).toBe(scene.id === 'restaurant' || scene.id === 'directions' ? scene.id : 'daily');
        state = toggleRoleplayGoal(state, goal.id);
      }
    }
  });
  it('excludes private offline exchanges and sends only the six recent AI text items', () => {
    let state = finish(createRoleplaySession(), 'PRIVATE_OFFLINE_TEXT');
    state = setRoleplayMode(setRoleplayConsent(state, true), 'AI');
    for (let index = 0; index < 4; index++) state = finish(state, `AI turn ${index}`);
    const request = buildRoleplayRequest(beginRoleplayTurn(state, 'current'));
    expect(request.history).toHaveLength(ROLEPLAY_MAX_HISTORY);
    expect(request.history[0]).toEqual({ role: 'user', text: 'AI turn 1' });
    expect(JSON.stringify(request)).not.toContain('PRIVATE_OFFLINE_TEXT');
    expect(request.history.every((item) => Object.keys(item).length === 2 && item.text.length <= 500)).toBe(true);
  });
  it.each(['login-required', 'unauthorized', 'network', 'timeout', 'rate-limited', 'not-configured', 'not-deployed', 'provider-error'])
    ('allows explicit offline continuation after %s without retrying the provider', async (code) => {
      const transport = vi.fn().mockRejectedValue({ code });
      const started = beginRoleplayTurn(aiSession(), '你好');
      await expect(requestRoleplayReply(started, new AbortController().signal, transport)).rejects.toMatchObject({ code });
      expect(roleplayFailureHint(code)).toContain('offline');
      const local = beginRoleplayTurn(setRoleplayMode(cancelRoleplayTurn(started), 'OFFLINE'), '你好');
      expect((await requestRoleplayReply(local, new AbortController().signal, transport)).correctionVi).toContain('Kịch bản');
      expect(transport).toHaveBeenCalledOnce();
    });
});

describe('cancellation and bounded wait', () => {
  it('does not invoke the provider when canceled before send, including offline mode', async () => {
    const controller = new AbortController(); controller.abort();
    const transport = vi.fn();
    for (const state of [aiSession(), createRoleplaySession()]) await expect(requestRoleplayReply(beginRoleplayTurn(state, '你好'), controller.signal, transport))
      .rejects.toMatchObject({ code: 'cancelled' });
    expect(transport).not.toHaveBeenCalled();
  });
  it('cancels promptly while auth/provider stalls, aborts its signal, and rejects a late result', async () => {
    let resolve!: (result: typeof reply) => void;
    const transport = vi.fn<RoleplayTransport>(() => new Promise<typeof reply>((done) => { resolve = done; }));
    const controller = new AbortController();
    const task = requestRoleplayReply(beginRoleplayTurn(aiSession(), '你好'), controller.signal, transport);
    const assertion = expect(task).rejects.toMatchObject({ code: 'cancelled' });
    await vi.waitFor(() => expect(transport).toHaveBeenCalledOnce());
    controller.abort(); await assertion;
    expect(transport.mock.calls[0]![0].signal.aborted).toBe(true);
    resolve(reply);
  });
  it('times out once with no hidden retry and releases the timer', async () => {
    vi.useFakeTimers();
    const transport = vi.fn(() => new Promise<typeof reply>(() => {}));
    const task = requestRoleplayReply(beginRoleplayTurn(aiSession(), '你好'), new AbortController().signal, transport);
    const assertion = expect(task).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(ROLEPLAY_TIMEOUT_MS); await assertion;
    expect(transport).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('validates a provider reply and never mutates the pending session when a response is invalid', async () => {
    const started = beginRoleplayTurn(aiSession(), '你好');
    const result = await requestRoleplayReply(started, new AbortController().signal, vi.fn().mockResolvedValue(reply));
    expect(result).toEqual(reply);
    expect(started.exchanges).toEqual([]);
    await expect(requestRoleplayReply(started, new AbortController().signal, vi.fn().mockResolvedValue({ replyChinese: 'bad' })))
      .rejects.toMatchObject({ code: 'invalid-response' });
  });
});
