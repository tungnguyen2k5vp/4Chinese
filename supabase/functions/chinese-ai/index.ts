// Deno runtime only; pure policy/adapters are typechecked and tested separately.
// @ts-nocheck
import { AI_ERROR_MESSAGES, ChineseAIError } from '../_shared/chinese-ai-contract.ts';
import { boundedAIText, chineseAIStatus, DevAIRateLimiter, runChineseAIGateway } from '../_shared/chinese-ai-gateway.ts';

const env = (key: string) => Deno.env.get(key) || (key === 'GEMINI_API_KEY' ? Deno.env.get('4Chinese_Key_Gemini') : undefined);
const boundedLimit = (key: string, fallback: number, max: number) => {
  const value = Number(env(key));
  return Number.isInteger(value) && value >= 1 && value <= max ? value : fallback;
};
const limiter = new DevAIRateLimiter(boundedLimit('AI_DEV_RPM', 4, 10), boundedLimit('AI_DEV_DAILY_CAP', 20, 40), boundedLimit('AI_DEV_SESSION_CAP', 8, 12));
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
const statuses = { AI_UNAUTHORIZED: 403, AI_ADMIN_REQUIRED: 403, AI_LOGIN_REQUIRED: 401, AI_INVALID_INPUT: 400, AI_CONSENT_REQUIRED: 400,
  AI_RATE_LIMITED: 429, AI_BUSY: 503, AI_TIMEOUT: 504, AI_BACKEND_NOT_CONFIGURED: 503, AI_FREE_NOT_VERIFIED: 503, AI_PROVIDER_KEY: 503 };
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ code: 'AI_INVALID_INPUT' }, 405);
  try {
    const token = request.headers.get('authorization') ?? '';
    if (!token.startsWith('Bearer ') || token.length > 8192) throw new ChineseAIError('AI_LOGIN_REQUIRED');
    const url = env('SUPABASE_URL'), anonKey = env('SUPABASE_ANON_KEY');
    if (!url || !anonKey) throw new ChineseAIError('AI_BACKEND_NOT_CONFIGURED');
    const auth = await fetch(`${url.replace(/\/$/u, '')}/auth/v1/user`, { headers: { Authorization: token, apikey: anonKey }, signal: AbortSignal.timeout(5000) });
    if (!auth.ok) throw new ChineseAIError('AI_LOGIN_REQUIRED');
    const user = await auth.json();
    if (typeof user.id !== 'string') throw new ChineseAIError('AI_LOGIN_REQUIRED');
    const raw = await boundedAIText(request, 65536, 'AI_INVALID_INPUT');
    let data;
    try { data = JSON.parse(raw); } catch { throw new ChineseAIError('AI_INVALID_INPUT'); }
    if (data?.action === 'status' && Object.keys(data).length === 1) return reply(chineseAIStatus(env, user.id));
    const result = await runChineseAIGateway(data, user.id, env, limiter, request.signal);
    return reply(result);
  } catch (error) {
    const safe = error instanceof ChineseAIError ? error : new ChineseAIError('AI_NETWORK');
    // No prompt, response, user/token/secret or raw provider error in logs.
    return reply({ code: safe.code, message: AI_ERROR_MESSAGES[safe.code], retryAfter: safe.retryAfter }, statuses[safe.code] ?? 502,
      safe.retryAfter ? { 'Retry-After': String(safe.retryAfter) } : {});
  }
});
