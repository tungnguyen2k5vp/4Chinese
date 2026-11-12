import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { communitySession, createPost, editProfile, feed, findPerson, sendMessage, socialCall, socialError, viewPost, watchSocial } from './api';

const mocks = vi.hoisted(() => ({ get: vi.fn(), session: vi.fn(), guest: vi.fn(), rpc: vi.fn(), remove: vi.fn(), channel: vi.fn(), token: vi.fn() }));
vi.mock('@/services/cloud/client', () => ({ getCommunityClient: mocks.get }));

const actor = '11111111-1111-4111-8111-111111111111', peer = '22222222-2222-4222-8222-222222222222';
beforeEach(() => {
  vi.clearAllMocks(); mocks.get.mockReturnValue({ auth: { getSession: mocks.session, signInAnonymously: mocks.guest }, realtime: { setAuth: mocks.token }, rpc: mocks.rpc, channel: mocks.channel, removeChannel: mocks.remove });
  mocks.session.mockResolvedValue({ data: { session: { user: { id: actor }, access_token: 'qa-session-token' } }, error: null });
  mocks.guest.mockResolvedValue({ error: null });
  mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: true, error: null }) });
});
afterEach(() => vi.useRealTimers());
describe('community transport boundaries', () => {
  it('creates only one guest session for concurrent callers and reuses a saved identity', async () => {
    mocks.session.mockResolvedValueOnce({ data: { session: null }, error: null });
    await Promise.all([communitySession(), communitySession(), communitySession()]);
    expect(mocks.guest).toHaveBeenCalledOnce();
    await communitySession(); expect(mocks.guest).toHaveBeenCalledOnce();
  });
  it('does not overwrite a stored session after a storage/auth failure', async () => {
    mocks.session.mockResolvedValueOnce({ error: new Error('storage unavailable') });
    await expect(communitySession()).rejects.toThrow('storage unavailable');
    expect(mocks.guest).not.toHaveBeenCalled();
    mocks.get.mockReturnValue(null); await expect(communitySession()).rejects.toThrow('SOCIAL_BACKEND_REQUIRED');
  });
  it('validates payload and server response and never submits a client-supplied actor', async () => {
    expect(() => sendMessage('invalid', actor, 'hello')).toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(() => createPost(actor, '  ', 'share')).toThrow();
    const message = { id: 5, client_id: actor, sender_id: actor, recipient_id: peer, body: '你好', created_at: new Date().toISOString() };
    mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: message, error: null }) });
    expect(await sendMessage(peer, actor, ' 你好 ')).toEqual(message);
    expect(mocks.rpc).toHaveBeenCalledWith('social_api', { p_action: 'send', p_data: { peer, id: actor, body: '你好' } });
    mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: { ...message, id: Number.MAX_SAFE_INTEGER + 1 }, error: null }) });
    await expect(sendMessage(peer, actor, '你好')).rejects.toThrow();
  });
  it('normalizes public IDs and hides raw errors', async () => {
    mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: null, error: null }) });
    expect(await findPerson(' fc-abcdef1234 ')).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith('social_api', { p_action: 'search', p_data: { handle: 'ABCDEF1234' } });
    expect(socialError({ message: 'secret connection string' })).not.toContain('secret');
    expect(socialError({ message: 'SOCIAL_FRIEND_REQUIRED' })).toContain('kết bạn');
    await expect(socialCall('profile', {}, z.boolean())).rejects.toThrow();
  });
  it('routes expanded profiles/topics/stickers to the new RPC while preserving legacy fields', async () => {
    const profile = { id: actor, handle: 'ABCDEF1234', display_name: 'QA', bio: '', avatar: 0, icon: 59, created_at: new Date().toISOString() };
    mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: profile, error: null }) });
    expect((await editProfile({ display_name: 'QA', bio: '', avatar: 0, icon: 59 })).icon).toBe(59);
    expect(mocks.rpc).toHaveBeenLastCalledWith('social_community_api', { p_action: 'profile', p_data: { display_name: 'QA', bio: '', avatar: 0, icon: 59 } });
    const post = { id: peer, author_id: actor, author: profile, body: '你好', topic: 'general', community_topic: 'travel', stickers: ['m001'], views: 2, category: 'share', created_at: profile.created_at, deleted_at: null, likes: 0, hearts: 1, comments: 0, reaction: 'heart' };
    mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: post, error: null }) });
    expect((await createPost(peer, '你好', 'share', { topic: 'travel', stickers: ['m001'] })).stickers).toEqual(['m001']);
    expect(mocks.rpc).toHaveBeenLastCalledWith('social_community_api', { p_action: 'post', p_data: { id: peer, body: '你好', category: 'share', title: '', topic: 'general', community_topic: 'travel', stickers: ['m001'] } });
    for (const stickers of [['m073'], ['m001', 'm001'], ['m001', 'm002', 'm003', 'm004', 'm005']]) expect(() => createPost(peer, 'QA', 'share', { stickers })).toThrow();
    mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: [post], error: null }) });
    expect((await feed(undefined, { topic: 'travel' }))[0]!.views).toBe(2);
    expect(mocks.rpc).toHaveBeenLastCalledWith('social_community_api', { p_action: 'feed', p_data: { topic: 'travel', limit: 20 } });
    mocks.rpc.mockReturnValue({ abortSignal: async () => ({ data: 2, error: null }) });
    expect(await viewPost(peer)).toBe(2);
    expect(mocks.rpc).toHaveBeenLastCalledWith('social_community_api', { p_action: 'post_view', p_data: { id: peer } });
  });
  it('debounces event bursts, replays durable state on subscription/reconnect and cleans up', async () => {
    vi.useFakeTimers(); const callbacks: (() => void)[] = [];
    let status: (s: string) => void = () => {};
    const channel = { on: vi.fn((_event, _filter, cb) => { callbacks.push(cb); return channel; }), subscribe: vi.fn(cb => { status = cb; return channel; }) };
    mocks.channel.mockReturnValue(channel);
    const refresh = vi.fn(), connected = vi.fn(), stop = await watchSocial(['social_messages', 'social_reads'], refresh, connected);
    expect(mocks.token).toHaveBeenCalledWith('qa-session-token');
    expect(mocks.token.mock.invocationCallOrder[0]).toBeLessThan(channel.subscribe.mock.invocationCallOrder[0]!);
    status('SUBSCRIBED'); expect(refresh).toHaveBeenCalledOnce();
    callbacks[0]!(); callbacks[1]!(); await vi.advanceTimersByTimeAsync(180); expect(refresh).toHaveBeenCalledTimes(2);
    status('CHANNEL_ERROR'); expect(connected).toHaveBeenLastCalledWith(false);
    status('SUBSCRIBED'); expect(refresh).toHaveBeenCalledTimes(3);
    callbacks[0]!(); stop(); await vi.advanceTimersByTimeAsync(200); expect(refresh).toHaveBeenCalledTimes(3);
    expect(mocks.remove).toHaveBeenCalledWith(channel);
  });
});
