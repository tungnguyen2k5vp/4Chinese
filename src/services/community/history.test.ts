import { beforeEach, describe, expect, it, vi } from 'vitest';

import { messages, type SocialMessage } from './api';
import { catchUpMessages } from './history';

vi.mock('./api', () => ({ messages: vi.fn() }));
const page = (first: number, count: number) => Array.from({ length: count }, (_, i) => ({ id: first + i }) as SocialMessage);
beforeEach(() => vi.mocked(messages).mockReset());
describe('reconnect history', () => {
  it('replays more than 50 missed messages without a gap, even when a send acknowledgement is newer', async () => {
    const server = page(11, 121), visible = new Map<number, SocialMessage>([[200, { id: 200 } as SocialMessage]]);
    vi.mocked(messages).mockImplementation(async (_peer, cursor) => ({ messages: server.filter(m => m.id > (cursor?.after ?? 0)).slice(0, 50), read: 0 }));
    const result = await catchUpMessages('peer', 10, rows => { for (const row of rows) visible.set(row.id, row); });
    expect(messages).toHaveBeenCalledTimes(3); expect(result.through).toBe(131);
    expect([...visible.keys()].filter(id => id < 200).sort((a, b) => a - b)).toEqual(server.map(m => m.id));
  });
  it('loads the newest page on cold start and leaves older history for pagination', async () => {
    vi.mocked(messages).mockResolvedValue({ messages: page(100, 50), read: 140 });
    const apply = vi.fn(); expect(await catchUpMessages('peer', undefined, apply)).toEqual({ through: 149, initialFull: true });
    expect(messages).toHaveBeenCalledOnce(); expect(apply).toHaveBeenCalledWith(page(100, 50), 140);
  });
  it('stops after a foreground exit and rejects a non-advancing cursor', async () => {
    vi.mocked(messages).mockResolvedValue({ messages: page(11, 50), read: 0 });
    expect((await catchUpMessages('peer', 10, () => {}, () => false)).through).toBe(60);
    vi.mocked(messages).mockResolvedValue({ messages: page(5, 50), read: 0 });
    await expect(catchUpMessages('peer', 10, () => {})).rejects.toThrow('SOCIAL_INVALID_INPUT');
  });
});
