import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u, '');
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | null = null;
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

export function getCloudClient(): SupabaseClient | null {
  if (!url || !publishableKey) return null;
  if (!client) {
    client = createClient(url, publishableKey, {
      auth: { storage: sessionStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    if (Platform.OS !== 'web') {
      const current = client;
      AppState.addEventListener('change', (state) => {
        if (state === 'active') current.auth.startAutoRefresh();
        else current.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}
