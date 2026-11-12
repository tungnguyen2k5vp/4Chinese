import { beforeEach, describe, expect, it, vi } from 'vitest';

import { confirmAccountRecovery, confirmEmailLink, requestAccountRecovery, requestEmailLink } from './account';

const mocks = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), update: vi.fn(), verify: vi.fn(), otp: vi.fn(), stored: vi.fn(), restore: vi.fn() }));
vi.mock('./api', () => ({ communitySession: mocks.session }));
const actor = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ auth: { getUser: mocks.user, updateUser: mocks.update, verifyOtp: mocks.verify, signInWithOtp: mocks.otp, getSession: mocks.stored, setSession: mocks.restore } });
  mocks.user.mockResolvedValue({ data: { user: { id: actor } }, error: null }); mocks.update.mockResolvedValue({ error: null }); mocks.otp.mockResolvedValue({ error: null });
  mocks.stored.mockResolvedValue({ data: { session: { access_token: 'qa-before', refresh_token: 'qa-before-refresh' } }, error: null });
  mocks.restore.mockResolvedValue({ error: null });
  mocks.verify.mockResolvedValue({ data: { user: { id: actor, email: 'qa@example.test', email_confirmed_at: '2026-11-06T00:00:00Z' }, session: {} }, error: null });
});
describe('optional community email identity', () => {
  it('links the current guest, confirms email_change and keeps the same UUID', async () => {
    expect(await requestEmailLink(' qa@example.test ')).toBe(actor);
    expect(mocks.update).toHaveBeenCalledWith({ email: 'qa@example.test' });
    await confirmEmailLink('qa@example.test', '12345678', actor);
    expect(mocks.verify).toHaveBeenCalledWith({ email: 'qa@example.test', token: '12345678', type: 'email_change' });
    mocks.user.mockResolvedValueOnce({ data: { user: { id: 'different' } } });
    await expect(confirmEmailLink('qa@example.test', '12345678', actor)).rejects.toThrow('SOCIAL_AUTH_REQUIRED');
    expect(mocks.verify).toHaveBeenCalledOnce();
  });
  it('recovery only requests existing users and does not verify/replace a session until confirmation', async () => {
    await requestAccountRecovery('qa@example.test');
    expect(mocks.otp).toHaveBeenCalledWith({ email: 'qa@example.test', options: { shouldCreateUser: false } });
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(await confirmAccountRecovery('qa@example.test', '12345678')).toBe(actor);
    expect(mocks.verify).toHaveBeenCalledWith({ email: 'qa@example.test', token: '12345678', type: 'email' });
  });
  it('does not submit invalid input or change an already linked email', async () => {
    await expect(requestEmailLink('invalid')).rejects.toThrow(); expect(mocks.update).not.toHaveBeenCalled();
    mocks.user.mockResolvedValueOnce({ data: { user: { id: actor, email: 'old@example.test', email_confirmed_at: 'confirmed' } } });
    await expect(requestEmailLink('qa@example.test')).rejects.toThrow('SOCIAL_EMAIL_ALREADY_LINKED');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('accepts only the configured Supabase verification URL and restores identity for a mismatched link', async () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://qa.supabase.co');
    try {
      await confirmAccountRecovery('qa@example.test', 'https://qa.supabase.co/auth/v1/verify?type=magiclink&token=aaaaaaaaaaaaaaaaaaaaaaaa');
      expect(mocks.verify).toHaveBeenCalledWith({ token_hash: 'aaaaaaaaaaaaaaaaaaaaaaaa', type: 'magiclink' });
      await expect(confirmAccountRecovery('qa@example.test', 'https://evil.test/auth/v1/verify?type=magiclink&token=aaaaaaaaaaaaaaaaaaaaaaaa')).rejects.toThrow('SOCIAL_INVALID_CONFIRMATION');
      expect(mocks.verify).toHaveBeenCalledOnce();
      mocks.verify.mockResolvedValueOnce({ data: { user: { id: 'unrelated', email: 'other@example.test', email_confirmed_at: 'confirmed' }, session: {} } });
      await expect(confirmAccountRecovery('qa@example.test', '12345678')).rejects.toThrow('SOCIAL_INVALID_CONFIRMATION');
      expect(mocks.restore).toHaveBeenCalledWith({ access_token: 'qa-before', refresh_token: 'qa-before-refresh' });
    } finally { vi.unstubAllEnvs(); }
  });
});
