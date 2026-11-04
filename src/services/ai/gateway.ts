import type { AuthError, Session } from '@supabase/supabase-js';

import { AI_ERROR_MESSAGES, AI_PROVIDERS, ChineseAIError, isRecord, parseAIRequest, parseAIResult, type AIErrorCode, type AIMode, type AIProvider, type AIRequest, type AIResult } from '../../../supabase/functions/_shared/chinese-ai-contract';

import { getAIGuestClient, getCloudClient } from '@/services/cloud/client';

export * from '../../../supabase/functions/_shared/chinese-ai-contract';
export { AI_MODELS, AI_PROVIDER_NOTICES } from '../../../supabase/functions/_shared/chinese-ai-registry';
export type AIBackendStatus = { source: 'configuration'; runtime: 'DISABLED' | 'DEVELOPMENT'; developmentOnly: true; canEditContent?: boolean; accessId?: string;
  models: { provider: AIProvider; model: string; reason: AIErrorCode | null; quotaRemaining: null; liveHealth: 'not-checked' }[] };

let guestAuth: Promise<{ data: { session: Session | null }; error: AuthError | null }> | null = null;
async function aiSession(cloud: NonNullable<ReturnType<typeof getCloudClient>>) {
  const current = await cloud.auth.getSession();
  if (current.error || current.data.session) return current;
  const guest = getAIGuestClient();
  if (!guest) throw new ChineseAIError('AI_BACKEND_NOT_CONFIGURED');
  if (!guestAuth) guestAuth = (async () => {
    const stored = await guest.auth.getSession();
    if (stored.error || stored.data.session) return stored;
    // ponytail: SDK signup has no AbortSignal; discard late auth results in backendRequest before sending AI content.
    const result = await guest.auth.signInAnonymously();
    if (result.error?.code === 'anonymous_provider_disabled') throw new ChineseAIError('AI_BACKEND_NOT_CONFIGURED');
    if (result.error?.status === 429) throw new ChineseAIError('AI_RATE_LIMITED');
    return result;
  })().finally(() => { guestAuth = null; });
  return guestAuth;
}

async function backendRequest(body: unknown, signal?: AbortSignal): Promise<unknown> {
  if (signal?.aborted) throw new ChineseAIError('AI_CANCELLED');
  const cloud = getCloudClient(), url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u, ''), anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!cloud || !url || !anon) throw new ChineseAIError('AI_BACKEND_NOT_CONFIGURED');
  const controller = new AbortController(), cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 40000);
  try {
    const { data, error } = await Promise.race([aiSession(cloud), new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () => reject(new ChineseAIError(signal?.aborted ? 'AI_CANCELLED' : 'AI_TIMEOUT')), { once: true });
    })]);
    if (controller.signal.aborted) throw new ChineseAIError(signal?.aborted ? 'AI_CANCELLED' : 'AI_TIMEOUT');
    if (error || !data.session?.access_token) throw new ChineseAIError('AI_LOGIN_REQUIRED');
    const response = await fetch(`${url}/functions/v1/chinese-ai`, { method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const raw = await response.text();
    if (raw.length > 65536) throw new ChineseAIError('AI_INVALID_RESPONSE');
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { payload = null; }
    if (!response.ok) {
      if (response.status === 401) throw new ChineseAIError('AI_LOGIN_REQUIRED');
      if (response.status === 404) throw new ChineseAIError('AI_BACKEND_NOT_CONFIGURED');
      const code = isRecord(payload) && typeof payload.code === 'string' && Object.hasOwn(AI_ERROR_MESSAGES, payload.code) ? payload.code as AIErrorCode
        : response.status === 429 ? 'AI_RATE_LIMITED' : response.status === 403 ? 'AI_UNAUTHORIZED' : response.status === 503 ? 'AI_BUSY' : 'AI_NETWORK';
      const delay = isRecord(payload) && typeof payload.retryAfter === 'number' && Number.isFinite(payload.retryAfter) ? Math.max(0, Math.min(86400, payload.retryAfter)) : undefined;
      throw new ChineseAIError(code, delay);
    }
    if (controller.signal.aborted) throw new ChineseAIError(signal?.aborted ? 'AI_CANCELLED' : 'AI_TIMEOUT');
    return payload;
  } catch (error) {
    if (error instanceof ChineseAIError) throw error;
    if (controller.signal.aborted) throw new ChineseAIError(signal?.aborted ? 'AI_CANCELLED' : 'AI_TIMEOUT');
    throw new ChineseAIError('AI_NETWORK');
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
}
/** Text and selected, minimized context only. JWT stops at Supabase. No DB writes or local chat persistence. */
export async function sendChineseAI(input: AIRequest, signal?: AbortSignal): Promise<AIResult> {
  const request = parseAIRequest(input);
  if (request.mode === 'DISABLED') throw new ChineseAIError('AI_DISABLED');
  if (request.mode === 'LOCAL_ONLY') throw new ChineseAIError('AI_LOCAL_ONLY');
  if (!request.consent.adult || !request.consent.providers.length) throw new ChineseAIError('AI_CONSENT_REQUIRED');
  return parseAIResult(await backendRequest(request, signal), request);
}
/** Configuration check only; never runs provider inference or claims live health/quota. */
export async function checkChineseAIBackend(mode: AIMode, signal?: AbortSignal): Promise<AIBackendStatus> {
  if (mode === 'DISABLED') throw new ChineseAIError('AI_DISABLED');
  if (mode === 'LOCAL_ONLY') throw new ChineseAIError('AI_LOCAL_ONLY');
  const result = await backendRequest({ action: 'status' }, signal);
  if (!isRecord(result) || result.source !== 'configuration' || result.developmentOnly !== true || (result.canEditContent !== undefined && typeof result.canEditContent !== 'boolean') || !['DISABLED', 'DEVELOPMENT'].includes(String(result.runtime)) ||
    (result.accessId !== undefined && (typeof result.accessId !== 'string' || !/^[A-Za-z0-9-]{1,100}$/u.test(result.accessId))) ||
    !Array.isArray(result.models) || result.models.length > 4 || result.models.some(model => !isRecord(model) || !AI_PROVIDERS.includes(model.provider as AIProvider) ||
      typeof model.model !== 'string' || model.model.length > 120 || model.quotaRemaining !== null || model.liveHealth !== 'not-checked' ||
      (model.reason !== null && (typeof model.reason !== 'string' || !Object.hasOwn(AI_ERROR_MESSAGES, model.reason))))) throw new ChineseAIError('AI_INVALID_RESPONSE');
  return result as AIBackendStatus;
}
