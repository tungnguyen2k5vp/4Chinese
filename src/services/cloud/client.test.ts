import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), read: vi.fn(), syncRead: vi.fn(), write: vi.fn(), remove: vi.fn(), listen: vi.fn(), platform: { OS: 'android' } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }));
vi.mock('react-native-url-polyfill/auto', () => ({}));
vi.mock('expo-secure-store', () => ({ getItem: mocks.syncRead, getItemAsync: mocks.read, setItemAsync: mocks.write, deleteItemAsync: mocks.remove }));
vi.mock('react-native', () => ({ Platform: mocks.platform, AppState: { addEventListener: mocks.listen } }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); mocks.platform.OS = 'android';
  mocks.syncRead.mockReturnValue(null); mocks.write.mockResolvedValue(undefined);
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://qa.invalid'); vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'qa-public-key');
  mocks.create.mockImplementation(() => ({ auth: { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() } }));
});

describe('explicit primary account connection without changing learner data', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  it('shares the verified account client, not independently refreshed token copies', async () => {
    const { getCloudClient, getCommunityClient, connectPrimaryAccountForCloud } = await import('./client');
    const cloud = getCloudClient()!, primary = getCommunityClient()!;
    Object.assign(primary.auth, { getUser: vi.fn().mockResolvedValue({ data: { user: { id, email_confirmed_at: 'confirmed' } } }) });
    Object.assign(cloud.auth, { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) });
    expect(await connectPrimaryAccountForCloud()).toBe(primary);
    expect(getCloudClient()).toBe(primary);
    expect(mocks.write).toHaveBeenCalledWith('4chinese.cloud.account-source', 'community');
    expect(cloud.auth.stopAutoRefresh).toHaveBeenCalledOnce();
    mocks.listen.mock.calls[0]![1]('active');
    expect(cloud.auth.startAutoRefresh).not.toHaveBeenCalled();
  });
  it('never replaces a different Cloud subject even if emails match', async () => {
    const { getCloudClient, getCommunityClient, connectPrimaryAccountForCloud } = await import('./client');
    const cloud = getCloudClient()!, primary = getCommunityClient()!;
    Object.assign(primary.auth, { getUser: vi.fn().mockResolvedValue({ data: { user: { id, email: 'qa@example.test', email_confirmed_at: 'confirmed' } } }) });
    Object.assign(cloud.auth, { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'another-id', email: 'qa@example.test' } } } }) });
    await expect(connectPrimaryAccountForCloud()).rejects.toThrow('tài khoản khác');
    expect(getCloudClient()).toBe(cloud); expect(mocks.write).not.toHaveBeenCalled();
  });
  it('requires verified email and keeps the old selection when persistence fails', async () => {
    const { getCloudClient, getCommunityClient, connectPrimaryAccountForCloud } = await import('./client');
    const cloud = getCloudClient()!, primary = getCommunityClient()!;
    const user = vi.fn().mockResolvedValue({ data: { user: { id } } });
    Object.assign(primary.auth, { getUser: user });
    Object.assign(cloud.auth, { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) });
    await expect(connectPrimaryAccountForCloud()).rejects.toThrow('xác nhận email'); expect(mocks.write).not.toHaveBeenCalled();
    user.mockResolvedValue({ data: { user: { id, email_confirmed_at: 'confirmed' } } });
    mocks.write.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(connectPrimaryAccountForCloud()).rejects.toThrow('storage unavailable');
    expect(getCloudClient()).toBe(cloud); expect(cloud.auth.stopAutoRefresh).not.toHaveBeenCalled();
  });
  it('reuses the selected identity after restart while AI remains separate', async () => {
    mocks.syncRead.mockReturnValue('community');
    const { getCloudClient, getCommunityClient, getAIGuestClient } = await import('./client');
    expect(getCloudClient()).toBe(getCommunityClient()); expect(getAIGuestClient()).not.toBe(getCloudClient());
    expect(mocks.create.mock.calls[0]![2].auth.storageKey).toBe('4chinese.community.session');
  });
  it('disconnects Cloud without signing out or removing the community session', async () => {
    const { getCloudClient, getCommunityClient, connectPrimaryAccountForCloud, disconnectPrimaryAccountFromCloud } = await import('./client');
    const cloud = getCloudClient()!, primary = getCommunityClient()!;
    Object.assign(primary.auth, { getUser: vi.fn().mockResolvedValue({ data: { user: { id, email_confirmed_at: 'confirmed' } } }), signOut: vi.fn() });
    Object.assign(cloud.auth, { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) });
    await connectPrimaryAccountForCloud();
    expect(await disconnectPrimaryAccountFromCloud()).toBe(cloud);
    expect(getCloudClient()).toBe(cloud);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith('4chinese.cloud.account-source');
    expect(primary.auth.signOut).not.toHaveBeenCalled();
    expect(primary.auth.stopAutoRefresh).not.toHaveBeenCalled();
    mocks.listen.mock.calls[0]![1]('active');
    expect(cloud.auth.startAutoRefresh).toHaveBeenCalledOnce();
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Cloud and AI guest auth separation', () => {
  it('stores community identity in a third independent namespace', async () => {
    const { getCloudClient, getAIGuestClient, getCommunityClient } = await import('./client');
    const cloud = getCloudClient(), ai = getAIGuestClient(), social = getCommunityClient();
    expect(new Set([cloud, ai, social]).size).toBe(3); expect(getCommunityClient()).toBe(social);
    const auth = mocks.create.mock.calls[2]![2].auth;
    expect(auth.storageKey).toBe('4chinese.community.session');
    await auth.storage.setItem('4chinese.community.session', 'qa-community');
    expect(mocks.write).toHaveBeenCalledWith('4chinese.community.session', 'qa-community');
  });
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
