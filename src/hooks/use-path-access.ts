import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create, useStore } from 'zustand';

const key = '4chinese.path.open-access.v1';
// UI preference only: never change lesson status, XP or the learner database.
const storage = {
  read: async () => Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key),
  write: (value: string) => Platform.OS === 'web'
    ? Promise.resolve().then(() => { globalThis.localStorage.setItem(key, value); })
    : SecureStore.setItemAsync(key, value),
};
let loading: Promise<void> | null = null;
export const pathAccessStore = create<{
  allOpen: boolean; ready: boolean; saving: boolean; error: string | null;
  load: () => Promise<void>; change: (allOpen: boolean) => Promise<void>;
}>((set, get) => ({
  allOpen: false, ready: false, saving: false, error: null,
  load: () => loading ??= storage.read().then(value => { set({ allOpen: value === 'open', ready: true, error: null }); })
    .catch(() => { set({ ready: true, error: 'Chưa đọc được chế độ lộ trình. Hãy thử lại trong Cài đặt.' }); })
    .finally(() => { loading = null; }),
  change: async allOpen => {
    if (get().saving) return;
    set({ saving: true, error: null });
    try { await storage.write(allOpen ? 'open' : 'sequential'); set({ allOpen, ready: true }); }
    catch { set({ error: 'Chưa lưu được chế độ lộ trình. Hãy thử lại.' }); }
    finally { set({ saving: false }); }
  },
}));

export function usePathAccess() {
  const state = useStore(pathAccessStore);
  useEffect(() => { if (!pathAccessStore.getState().ready) void pathAccessStore.getState().load(); }, []);
  return state;
}
