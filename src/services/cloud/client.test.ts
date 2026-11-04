import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), read: vi.fn(), write: vi.fn(), remove: vi.fn(), listen: vi.fn(), platform: { OS: 'android' } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }));
vi.mock('react-native-url-polyfill/auto', () => ({}));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.read, setItemAsync: mocks.write, deleteItemAsync: mocks.remove }));
vi.mock('react-native', () => ({ Platform: mocks.platform, AppState: { addEventListener: mocks.listen } }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); mocks.platform.OS = 'android';
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://qa.invalid'); vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'qa-public-key');
  mocks.create.mockImplementation(() => ({ auth: { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() } }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Cloud and AI guest auth separation', () => {
  it('keeps the existing Cloud storage namespace and creates exactly one separate guest client', async () => {
    const { getCloudClient, getAIGuestClient } = await import('./client');
    const cloud = getCloudClient(), guest = getAIGuestClient();
    expect(cloud).not.toBe(guest);
    expect(getCloudClient()).toBe(cloud); expect(getAIGuestClient()).toBe(guest);
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.create.mock.calls[0]![2].auth.storageKey).toBeUndefined();
    expect(mocks.create.mock.calls[1]![2].auth.storageKey).toBe('4chinese.ai.guest-session');
    const storage = mocks.create.mock.calls[1]![2].auth.storage;
    await storage.setItem('4chinese.ai.guest-session', 'qa-session');
    expect(mocks.write).toHaveBeenCalledExactlyOnceWith('4chinese.ai.guest-session', 'qa-session');
    const lifecycle = mocks.listen.mock.calls[1]![1];
    lifecycle('background'); lifecycle('active');
    expect(guest!.auth.stopAutoRefresh).toHaveBeenCalledOnce(); expect(guest!.auth.startAutoRefresh).toHaveBeenCalledOnce();
    expect(cloud!.auth.startAutoRefresh).not.toHaveBeenCalled();
  });
  it('uses browser storage on web without touching native SecureStore or AppState', async () => {
    mocks.platform.OS = 'web';
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    const { getAIGuestClient } = await import('./client'); getAIGuestClient();
    const adapter = mocks.create.mock.calls[0]![2].auth.storage;
    await adapter.setItem('4chinese.ai.guest-session', 'qa-web');
    expect(await adapter.getItem('4chinese.ai.guest-session')).toBe('qa-web');
    await adapter.removeItem('4chinese.ai.guest-session');
    expect(await adapter.getItem('4chinese.ai.guest-session')).toBeNull();
    expect(mocks.write).not.toHaveBeenCalled(); expect(mocks.listen).not.toHaveBeenCalled();
  });
  it('does not initialize auth when public backend configuration is missing', async () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', '');
    const { getCloudClient, getAIGuestClient } = await import('./client');
    expect(getCloudClient()).toBeNull(); expect(getAIGuestClient()).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
