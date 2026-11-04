import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_MODELS } from '../../../supabase/functions/_shared/chinese-ai-registry';

let handler: (request: Request) => Promise<Response>;
let values: Record<string, string>;
const fetcher = vi.fn<typeof fetch>();
const answer = { summary: '学 nghĩa là học.', explanation: 'Dùng để nói về việc học.', examples: [], corrections: [], quiz: [], mnemonic: '' };
const input = { mode: 'GEMINI_FREE', task: 'word', question: 'Giải thích 学.', context: null,
  consent: { providers: ['gemini'], scope: 'question', allowFailover: false, adult: true }, history: [], session: 'qa-edge-session', dailyLimit: 5 };
const post = (body: unknown = input, token = 'qa-user-jwt') => handler(new Request('https://qa.invalid/chinese-ai', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}));

beforeEach(async () => {
  vi.resetModules(); fetcher.mockReset();
  values = { SUPABASE_URL: 'https://qa-supabase.invalid', SUPABASE_ANON_KEY: 'qa-auth-key',
    '4Chinese_Key_Gemini': 'qa-server-legacy-key', AI_RUNTIME_MODE: 'DEVELOPMENT', AI_BUDGET_MODE: 'FREE_ONLY',
    AI_ALLOW_PAID: 'false', AI_ALLOW_AUTO_BILLING: 'false', AI_DEV_USER_IDS: 'qa-user', AI_FREE_VERIFICATIONS: '[]' };
  fetcher.mockImplementation(async url => new Response(JSON.stringify(String(url).endsWith('/auth/v1/user') ? { id: 'qa-user' }
    : { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answer) }] } }] })));
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('Deno', { env: { get: (key: string) => values[key] }, serve: (callback: typeof handler) => { handler = callback; } });
  await import('../../../supabase/functions/chinese-ai/index');
});
afterEach(() => { vi.unstubAllGlobals(); });

function verifyFreeForTest() {
  const checkedAt = new Date().toISOString(), expiresAt = new Date(Date.now() + 3600000).toISOString();
  values.AI_FREE_VERIFICATIONS = JSON.stringify([{ provider: 'gemini', model: AI_MODELS[0]!.id, checkedAt, expiresAt,
    freePlan: true, billingDisabled: true, regionAllowed: true, termsAccepted: true, dataPolicyReviewed: true, adultAudience: true }]);
}

describe('deployed AI handler', () => {
  it('handles preflight and rejects missing tokens and methods before any external request', async () => {
    const preflight = await handler(new Request('https://qa.invalid', { method: 'OPTIONS' }));
    expect(preflight.status).toBe(200);
    expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
    expect((await handler(new Request('https://qa.invalid'))).status).toBe(405);
    const unauthorized = await handler(new Request('https://qa.invalid', { method: 'POST', body: '{}' }));
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toMatchObject({ code: 'AI_LOGIN_REQUIRED' });
    expect((await post({}, 'x'.repeat(8200))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('recognizes the existing server secret without exposing it or calling the model for status', async () => {
    const response = await post({ action: 'status' }), status = await response.json();
    expect(response.status).toBe(200);
    expect(status.models[0]).toMatchObject({ provider: 'gemini', reason: 'AI_FREE_NOT_VERIFIED', liveHealth: 'not-checked', quotaRemaining: null });
    expect(status.accessId).toBe('qa-user');
    expect(JSON.stringify(status)).not.toMatch(/qa-server|qa-auth-key|4Chinese_Key_Gemini/);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]![0]).toBe('https://qa-supabase.invalid/auth/v1/user');
  });
  it('blocks inference until account-specific free eligibility is verified', async () => {
    const response = await post();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'AI_FREE_NOT_VERIFIED' });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([undefined, 'qa-server-standard-key'])('uses the server key with canonical-key precedence (%s)', async canonicalKey => {
    if (canonicalKey) values.GEMINI_API_KEY = canonicalKey;
    verifyFreeForTest();
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ answer, provider: 'gemini' });
    const [url, init] = fetcher.mock.calls[1]!;
    expect(String(url)).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS[0]!.id}:generateContent`);
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': canonicalKey ?? 'qa-server-legacy-key' });
    expect(JSON.stringify(init?.body)).not.toMatch(/qa-user-jwt|qa-auth-key|qa-user/);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid auth, absent backend, disabled runtime and non-allowlisted users', async () => {
    fetcher.mockResolvedValueOnce(new Response('private-auth-diagnostic', { status: 401 }));
    expect((await post()).status).toBe(401);
    delete values.SUPABASE_ANON_KEY;
    expect((await post()).status).toBe(503);
    expect(fetcher).toHaveBeenCalledOnce();
    values.SUPABASE_ANON_KEY = 'qa-auth-key'; values.AI_RUNTIME_MODE = 'DISABLED';
    expect(await (await post()).json()).toMatchObject({ code: 'AI_BACKEND_NOT_CONFIGURED' });
    values.AI_RUNTIME_MODE = 'DEVELOPMENT'; values.AI_DEV_USER_IDS = 'different-user';
    expect((await post()).status).toBe(403);
    expect(fetcher.mock.calls.every(([url]) => String(url).endsWith('/auth/v1/user'))).toBe(true);
  });
  it('rejects malformed and oversized bodies and ungranted editor access before inference', async () => {
    expect((await post({ ...input, task: 'content' })).status).toBe(403);
    expect((await post({ ...input, question: '中'.repeat(66000) })).status).toBe(400);
    const malformed = await handler(new Request('https://qa.invalid', { method: 'POST', headers: { Authorization: 'Bearer qa-jwt' }, body: '{' }));
    expect(malformed.status).toBe(400);
    expect(fetcher.mock.calls.every(([url]) => String(url).endsWith('/auth/v1/user'))).toBe(true);
  });
});
