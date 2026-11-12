import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u, '');
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | null = null;
let aiGuestClient: SupabaseClient | null = null;
let communityClient: SupabaseClient | null = null;
const accountSourceKey = '4chinese.cloud.account-source';
let usePrimaryAccount = false;
const deviceIdKey = '4chinese.sync.device-id';
let deviceIdPromise: Promise<string> | null = null;

function createDeviceId(): string {
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export function getCloudDeviceId(): Promise<string> {
  if (!deviceIdPromise) deviceIdPromise = (async () => {
    const existing = Platform.OS === 'web'
      ? typeof localStorage === 'undefined' ? null : localStorage.getItem(deviceIdKey)
      : await SecureStore.getItemAsync(deviceIdKey);
    if (existing && /^[A-Za-z0-9:_-]{8,160}$/u.test(existing)) return existing;
    const next = createDeviceId();
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(deviceIdKey, next);
    } else await SecureStore.setItemAsync(deviceIdKey, next);
    return next;
  })();
  return deviceIdPromise;
}

const sessionStorage = {
  getItem: (key: string): Promise<string | null> => Platform.OS === 'web'
    ? Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(key))
    : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => Platform.OS === 'web'
    ? Promise.resolve().then(() => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); })
    : SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => Platform.OS === 'web'
    ? Promise.resolve().then(() => { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); })
    : SecureStore.deleteItemAsync(key),
};

function createCloudClient(storageKey?: string): SupabaseClient | null {
  if (!url || !publishableKey) return null;
  const current = createClient(url, publishableKey, {
    auth: { storage: sessionStorage, ...(storageKey ? { storageKey } : {}), autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (current === client && usePrimaryAccount) return;
      if (state === 'active') current.auth.startAutoRefresh();
      else current.auth.stopAutoRefresh();
    });
  }
  return current;
}

export function getCloudClient(): SupabaseClient | null {
  // Selection is explicit. Share the client itself, not two independently refreshed token copies.
  try { usePrimaryAccount ||= (Platform.OS === 'web' ? globalThis.localStorage?.getItem(accountSourceKey) : SecureStore.getItem?.(accountSourceKey)) === 'community'; } catch { /* Keep the existing Cloud identity if storage is unavailable. */ }
  if (usePrimaryAccount) return getCommunityClient();
  if (!client) client = createCloudClient();
  return client;
}

/** Called only by the account button; never restores/syncs learner data. */
export async function connectPrimaryAccountForCloud(): Promise<SupabaseClient> {
  const primary = getCommunityClient(), current = getCloudClient();
  if (!primary || !current) throw new Error('Chưa cấu hình tài khoản Cloud.');
  const verified = await primary.auth.getUser();
  if (verified.error || !verified.data.user?.email_confirmed_at) throw new Error('Liên kết và xác nhận email trước khi dùng Cloud.');
  const previous = await current.auth.getSession();
  if (previous.error) throw previous.error;
  if (previous.data.session && previous.data.session.user.id !== verified.data.user.id) throw new Error('Cloud đang đăng nhập tài khoản khác. Mở Cloud để kiểm tra; hai tài khoản chưa được gộp. Tiến độ trên máy vẫn giữ nguyên.');
  if (Platform.OS === 'web') localStorage.setItem(accountSourceKey, 'community');
  else await SecureStore.setItemAsync(accountSourceKey, 'community');
  if (current !== primary) current.auth.stopAutoRefresh();
  usePrimaryAccount = true;
  return primary;
}

/** Disconnect backup access without signing out the shared learner/community account. */
export async function disconnectPrimaryAccountFromCloud(): Promise<SupabaseClient | null> {
  await sessionStorage.removeItem(accountSourceKey);
  usePrimaryAccount = false;
  const legacy = getCloudClient();
  if (Platform.OS === 'web' || AppState.currentState === 'active') legacy?.auth.startAutoRefresh();
  return legacy;
}

/** Separate session: using AI must never sign the learner into backup or sync. */
export function getAIGuestClient(): SupabaseClient | null {
  if (!aiGuestClient) aiGuestClient = createCloudClient('4chinese.ai.guest-session');
  return aiGuestClient;
}

/** Community identity is independent of AI and learning backup/sync. */
export function getCommunityClient(): SupabaseClient | null {
  if (!communityClient) communityClient = createCloudClient('4chinese.community.session');
  return communityClient;
}
