import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { AI_MODES, AI_PROVIDERS, isRecord, type AIConsent, type AIMode } from '../../../supabase/functions/_shared/chinese-ai-contract';

const storageKey = '4chinese.ai-v1.preferences';
export type AIPreferences = { version: 1; mode: AIMode; consent: AIConsent; dailyLimit: number };
export const DEFAULT_AI_PREFERENCES: AIPreferences = { version: 1, mode: 'DISABLED', dailyLimit: 10,
  consent: { providers: [], scope: 'question', allowFailover: false, adult: false } };
export function parseAIPreferences(value: unknown): AIPreferences {
  if (!isRecord(value) || value.version !== 1 || !AI_MODES.includes(value.mode as AIMode) || !isRecord(value.consent) ||
    !Array.isArray(value.consent.providers) || value.consent.providers.length > 4 || value.consent.providers.some(p => !AI_PROVIDERS.includes(p)) ||
    typeof value.consent.adult !== 'boolean' || typeof value.consent.allowFailover !== 'boolean' || !['question', 'selected'].includes(String(value.consent.scope)) ||
    !Number.isInteger(value.dailyLimit) || Number(value.dailyLimit) < 1 || Number(value.dailyLimit) > 40) return { ...DEFAULT_AI_PREFERENCES, consent: { ...DEFAULT_AI_PREFERENCES.consent, providers: [] } };
  return { version: 1, mode: value.mode as AIMode, dailyLimit: Number(value.dailyLimit), consent: { providers: [...new Set(value.consent.providers)],
    adult: value.consent.adult, scope: value.consent.scope as 'question' | 'selected', allowFailover: value.consent.allowFailover } };
}
let loading: Promise<void> | null = null;
type AISettingsState = { preferences: AIPreferences; ready: boolean; saving: boolean; error: string; load: () => Promise<void>; change: (value: AIPreferences) => Promise<void> };
export const useAISettings = create<AISettingsState>((set, get) => ({
  preferences: DEFAULT_AI_PREFERENCES, ready: false, saving: false, error: '',
  load: () => {
    if (!loading) loading = (async () => {
      try {
        const raw = await (Platform.OS === 'web' ? Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey)) : SecureStore.getItemAsync(storageKey));
        set({ preferences: raw ? parseAIPreferences(JSON.parse(raw)) : parseAIPreferences(null), ready: true, error: '' });
      } catch { set({ preferences: parseAIPreferences(null), ready: true, error: 'Chưa đọc được cài đặt AI. AI được giữ ở trạng thái tắt.' }); }
      finally { loading = null; }
    })();
    return loading;
  },
  change: async value => {
    if (get().saving) return;
    const next = parseAIPreferences(value);
    set({ saving: true, error: '' });
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage === 'undefined') throw new Error('storage-unavailable');
        localStorage.setItem(storageKey, JSON.stringify(next));
      } else await SecureStore.setItemAsync(storageKey, JSON.stringify(next));
      set({ preferences: next, ready: true });
    } catch { set({ error: 'Chưa lưu được cài đặt AI. Lựa chọn trước đó vẫn giữ nguyên.' }); }
    finally { set({ saving: false }); }
  },
}));
