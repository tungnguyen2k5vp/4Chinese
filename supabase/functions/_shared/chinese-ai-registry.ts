// @ts-ignore Deno requires explicit .ts imports; keep the existing app tsconfig unchanged.
import { ChineseAIError, type AIMode, type AIProvider, type AIRequest } from './chinese-ai-contract.ts';

export type AIModel = {
  provider: AIProvider; id: string; name: string; pricing: 'free-tier' | 'free-only' | 'unknown';
  enabled: boolean; privacyReviewed: boolean; verifiedAt: string; documentation: string; privacy: string;
  capabilities: { text: boolean; structured: 'native' | 'validated-json'; streaming: boolean; structuredStreaming: boolean };
  input: readonly ['text']; contextTokens: number; maxOutputTokens: number; rateLimit: 'account-dependent';
};
export const AI_MODELS: readonly AIModel[] = [
  { provider: 'gemini', id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', pricing: 'free-tier', enabled: true,
    privacyReviewed: true, verifiedAt: '2026-11-03', documentation: 'https://aistudio.google.com/docs/pricing#gemini-3.8-flash',
    privacy: 'https://aistudio.google.com/docs/terms', capabilities: { text: true, structured: 'native', streaming: true, structuredStreaming: true },
    input: ['text'], contextTokens: 1048576, maxOutputTokens: 65536, rateLimit: 'account-dependent' },
  { provider: 'groq', id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B trên Groq', pricing: 'free-tier', enabled: true,
    privacyReviewed: true, verifiedAt: '2026-11-03', documentation: 'https://console.groq.com/docs/model/openai/gpt-oss-120b',
    privacy: 'https://console.groq.com/docs/your-data', capabilities: { text: true, structured: 'native', streaming: true, structuredStreaming: false },
    input: ['text'], contextTokens: 131072, maxOutputTokens: 65536, rateLimit: 'account-dependent' },
  { provider: 'openrouter', id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS 120B Free qua OpenRouter', pricing: 'free-only',
    enabled: false, privacyReviewed: false, verifiedAt: '2026-11-03', documentation: 'https://openrouter.ai/openai/gpt-oss-120b:free',
    privacy: 'https://openrouter.ai/docs/guides/privacy/data-collection', capabilities: { text: true, structured: 'validated-json', streaming: true, structuredStreaming: false },
    input: ['text'], contextTokens: 131072, maxOutputTokens: 4096, rateLimit: 'account-dependent' },
];
export const AI_PROVIDER_NOTICES: Record<AIProvider, string> = {
  gemini: 'Google Gemini Free có thể dùng câu hỏi và câu trả lời để cải thiện sản phẩm; không gửi thông tin nhạy cảm. Chỉ dùng ở vùng và độ tuổi được phép.',
  groq: 'Groq mặc định không giữ nội dung inference, nhưng có thể lưu tới 30 ngày để xử lý lỗi/lạm dụng tùy Data Controls. Free Plan và hạn mức phụ thuộc tài khoản.',
  openrouter: 'OpenRouter chuyển nội dung tới nhà cung cấp bên dưới. Hiện bị khóa vì chưa xác minh endpoint, nơi xử lý và lưu giữ dữ liệu.',
  openai: 'OpenAI trực tiếp đang tắt: chưa có quyền sử dụng zero-cost được xác minh. Không thuộc Auto Free.',
};
export type ServerAIConfig = {
  runtime: 'DISABLED' | 'DEVELOPMENT'; developerIds: string[]; policyValid: boolean;
  verifications: { provider: AIProvider; model: string; checkedAt: string; expiresAt: string;
    freePlan: boolean; billingDisabled: boolean; regionAllowed: boolean; termsAccepted: boolean; dataPolicyReviewed: boolean; adultAudience: boolean }[];
};
export function readServerAIConfig(env: (name: string) => string | undefined): ServerAIConfig {
  let verifications: ServerAIConfig['verifications'] = [];
  try {
    const parsed: unknown = JSON.parse(env('AI_FREE_VERIFICATIONS') ?? '[]');
    if (Array.isArray(parsed) && parsed.length <= 4) verifications = parsed;
  } catch { /* Invalid/missing evidence is never eligible. */ }
  return { runtime: env('AI_RUNTIME_MODE') === 'DEVELOPMENT' ? 'DEVELOPMENT' : 'DISABLED',
    developerIds: (env('AI_DEV_USER_IDS') ?? '').split(',').map(id => id.trim()).filter(Boolean).slice(0, 10), verifications,
    policyValid: env('AI_BUDGET_MODE') === 'FREE_ONLY' && env('AI_ALLOW_PAID') === 'false' && env('AI_ALLOW_AUTO_BILLING') === 'false' };
}
export const providerKeyName = (provider: AIProvider) => ({ gemini: 'GEMINI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY', openai: 'OPENAI_API_KEY' })[provider];
export function modelBlockReason(model: AIModel, config: ServerAIConfig, hasKey: boolean, now = Date.now()): 'AI_BACKEND_NOT_CONFIGURED' | 'AI_FREE_NOT_VERIFIED' | null {
  if (config.runtime !== 'DEVELOPMENT' || !config.policyValid || !hasKey) return 'AI_BACKEND_NOT_CONFIGURED';
  if (!model.enabled || !model.privacyReviewed || !model.capabilities.text || model.pricing === 'unknown' || model.provider === 'openai') return 'AI_FREE_NOT_VERIFIED';
  const proof = config.verifications.find(item => item && item.provider === model.provider && item.model === model.id);
  if (!proof || proof.freePlan !== true || proof.billingDisabled !== true || proof.regionAllowed !== true || proof.termsAccepted !== true ||
    proof.dataPolicyReviewed !== true || proof.adultAudience !== true) return 'AI_FREE_NOT_VERIFIED';
  const checked = Date.parse(proof.checkedAt), expires = Date.parse(proof.expiresAt), docs = Date.parse(model.verifiedAt);
  if (!Number.isFinite(checked) || !Number.isFinite(expires) || checked > now || now - checked > 7 * 86400000 ||
    expires <= now || expires - checked > 7 * 86400000 || !Number.isFinite(docs) || now - docs > 30 * 86400000 || docs > now) return 'AI_FREE_NOT_VERIFIED';
  return null;
}
const modeProvider: Partial<Record<AIMode, AIProvider>> = { GEMINI_FREE: 'gemini', GROQ_FREE: 'groq', OPENROUTER_FREE: 'openrouter' };
export function selectFreeModels(request: AIRequest, config: ServerAIConfig, hasKey: (provider: AIProvider) => boolean, now = Date.now()): AIModel[] {
  if (request.mode === 'DISABLED') throw new ChineseAIError('AI_DISABLED');
  if (request.mode === 'LOCAL_ONLY') throw new ChineseAIError('AI_LOCAL_ONLY');
  if (!request.consent.adult || !request.consent.providers.length) throw new ChineseAIError('AI_CONSENT_REQUIRED');
  const desired = modeProvider[request.mode];
  if (desired && !request.consent.providers.includes(desired)) throw new ChineseAIError('AI_CONSENT_REQUIRED');
  const candidates = AI_MODELS.filter(model => (!desired || model.provider === desired) && request.consent.providers.includes(model.provider));
  const eligible = candidates.filter(model => !modelBlockReason(model, config, hasKey(model.provider), now));
  if (!eligible.length) throw new ChineseAIError(config.runtime !== 'DEVELOPMENT' || !config.policyValid || (candidates.length > 0 && candidates.every(model => !hasKey(model.provider))) ? 'AI_BACKEND_NOT_CONFIGURED' : 'AI_FREE_NOT_VERIFIED');
  // ponytail: at most one sequential failover; no fan-out or same-provider retry.
  return eligible.slice(0, request.mode === 'AUTO_FREE' && request.consent.allowFailover ? 2 : 1);
}
