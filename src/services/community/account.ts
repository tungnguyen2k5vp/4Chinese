import type { VerifyOtpParams } from '@supabase/supabase-js';
import { z } from 'zod';

import { communitySession } from './api';

const emailValue = (email: string) => z.email().max(254).parse(email.trim());
const otpValue = (token: string) => z.string().regex(/^\d{6,12}$/).parse(token.trim());

/** Default Supabase templates may contain a verification link instead of a numeric OTP. */
function confirmation(email: string, value: string, type: 'email' | 'email_change'): VerifyOtpParams {
  if (/^\d{6,12}$/.test(value.trim())) return { email: emailValue(email), token: otpValue(value), type };
  try {
    const url = new URL(value.trim()), configured = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');
    const linkType = url.searchParams.get('type'), token = url.searchParams.get('token_hash') ?? url.searchParams.get('token');
    if (url.origin !== configured.origin || url.pathname !== '/auth/v1/verify' || url.username || url.password || !token || !/^[A-Za-z0-9_-]{16,256}$/.test(token) ||
      (type === 'email_change' ? linkType !== 'email_change' : !['email', 'magiclink'].includes(linkType ?? ''))) throw new Error();
    return { token_hash: token, type: linkType as 'email' | 'email_change' | 'magiclink' };
  } catch { throw new Error('SOCIAL_INVALID_CONFIRMATION'); }
}

async function verifyConfirmation(email: string, value: string, type: 'email' | 'email_change', expectedId?: string) {
  const params = confirmation(email, value, type), expectedEmail = emailValue(email), client = await communitySession();
  const before = await client.auth.getSession();
  if (before.error || !before.data.session) throw before.error ?? new Error('SOCIAL_AUTH_REQUIRED');
  const { data, error } = await client.auth.verifyOtp(params);
  if (error) throw error;
  if (!data.user || !data.session || !data.user.email_confirmed_at || data.user.email?.toLowerCase() !== expectedEmail.toLowerCase() || (expectedId && data.user.id !== expectedId)) {
    // A pasted link must never silently replace this guest with an unrelated identity.
    const restored = await client.auth.setSession(before.data.session);
    if (restored.error) throw restored.error;
    throw new Error('SOCIAL_INVALID_CONFIRMATION');
  }
  return data.user.id;
}

export async function communityAccount() {
  const client = await communitySession();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw error ?? new Error('SOCIAL_AUTH_REQUIRED');
  return { id: data.user.id, email: data.user.email_confirmed_at ? data.user.email : undefined, pendingEmail: data.user.new_email };
}

export async function requestEmailLink(email: string) {
  const client = await communitySession();
  const current = await communityAccount();
  if (current.email) throw new Error('SOCIAL_EMAIL_ALREADY_LINKED');
  const { error } = await client.auth.updateUser({ email: emailValue(email) });
  if (error) throw error;
  return current.id;
}

export async function confirmEmailLink(email: string, token: string, expectedId: string) {
  if ((await communityAccount()).id !== expectedId) throw new Error('SOCIAL_AUTH_REQUIRED');
  await verifyConfirmation(email, token, 'email_change', expectedId);
}

export async function requestAccountRecovery(email: string) {
  const client = await communitySession();
  const { error } = await client.auth.signInWithOtp({ email: emailValue(email), options: { shouldCreateUser: false } });
  if (error) throw error;
}

/** Call only after the user confirms replacing the current community session. */
export async function confirmAccountRecovery(email: string, token: string) {
  return verifyConfirmation(email, token, 'email');
}

export function accountError(error: unknown) {
  if (error instanceof z.ZodError || (error as Error)?.message === 'SOCIAL_INVALID_CONFIRMATION') return 'Kiểm tra email và mã 6–12 chữ số, hoặc dán link xác nhận mới nhất được gửi từ 4Chinese.';
  const code = (error as { code?: string })?.code;
  if (['over_email_send_rate_limit', 'over_request_rate_limit'].includes(code ?? '')) return 'Đã gửi quá nhiều yêu cầu. Hãy chờ vài phút rồi thử lại.';
  if (['email_exists', 'user_already_exists'].includes(code ?? '')) return 'Email này đã có tài khoản. Dùng mục khôi phục để đăng nhập.';
  if ((error as Error)?.message === 'SOCIAL_EMAIL_ALREADY_LINKED') return 'Tài khoản đã liên kết email. Hãy làm mới thông tin.';
  return 'Chưa xác nhận được. Kiểm tra mã mới nhất trong email (kể cả thư rác) rồi thử lại. Máy chủ có thể đang giới hạn gửi email.';
}
