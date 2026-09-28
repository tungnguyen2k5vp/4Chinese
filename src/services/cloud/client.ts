import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/u, '');
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | null = null;

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
