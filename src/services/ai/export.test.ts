import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { shareAIContent } from './export';

const mocks = vi.hoisted(() => ({ platform: { OS: 'android' }, create: vi.fn(), write: vi.fn(), remove: vi.fn(),
  available: vi.fn(), share: vi.fn(), file: vi.fn(), click: vi.fn(), append: vi.fn(), revoke: vi.fn() }));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('expo-file-system', () => ({ Paths: { cache: 'file://cache/' }, File: class {
  uri: string;
  constructor(root: string, name: string) { mocks.file(root, name); this.uri = `${root}${name}`; }
  create = mocks.create; write = mocks.write; delete = mocks.remove;
} }));
vi.mock('expo-sharing', () => ({ isAvailableAsync: mocks.available, shareAsync: mocks.share }));
const text = JSON.stringify({ format: '4chinese.ai-content-draft.v1', status: 'human-reviewed-draft', officialExam: false });
beforeEach(() => { vi.clearAllMocks(); mocks.platform.OS = 'android'; mocks.available.mockResolvedValue(true); mocks.share.mockResolvedValue(undefined); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('reviewed AI file export', () => {
  it('shares a generated JSON cache file, preserves it for the recipient and never writes document/learner storage', async () => {
    await shareAIContent(text);
    expect(mocks.file).toHaveBeenCalledWith('file://cache/', expect.stringMatching(/^4chinese-ai-draft-[0-9]+-[a-z0-9]+\.json$/));
    expect(mocks.create).toHaveBeenCalledWith({ overwrite: false }); expect(mocks.write).toHaveBeenCalledWith(text, { encoding: 'utf8' });
    expect(mocks.share).toHaveBeenCalledWith(expect.stringMatching(/^file:\/\/cache\/4chinese-ai-draft-/), expect.objectContaining({ mimeType: 'application/json' }));
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('rejects invalid/unreviewed/oversized exports and handles unavailable sharing before writing a file', async () => {
    for (const invalid of ['{broken', 'null', JSON.stringify({ format: 'other' }), text.replace('human-reviewed-draft', 'unreviewed'), 'x'.repeat(65537)]) await expect(shareAIContent(invalid)).rejects.toThrow();
    expect(mocks.share).not.toHaveBeenCalled(); expect(mocks.file).not.toHaveBeenCalled();
    mocks.available.mockResolvedValueOnce(false);
    await expect(shareAIContent(text)).rejects.toThrow('JSON vẫn còn'); expect(mocks.file).not.toHaveBeenCalled();
  });
  it('downloads UTF-8 JSON on web with a temporary blob URL and no backend request', async () => {
    mocks.platform.OS = 'web'; vi.useFakeTimers();
    const link = { href: '', download: '', click: mocks.click, remove: mocks.remove };
    vi.stubGlobal('document', { createElement: () => link, body: { appendChild: mocks.append } });
    const blob = vi.fn(); vi.stubGlobal('Blob', blob);
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:qa-file', revokeObjectURL: mocks.revoke });
    await shareAIContent(text);
    expect(blob).toHaveBeenCalledWith([text], { type: 'application/json;charset=utf-8' });
    expect(link.download).toMatch(/\.json$/); expect(mocks.click).toHaveBeenCalledOnce(); expect(mocks.remove).toHaveBeenCalledOnce();
    await vi.runAllTimersAsync(); expect(mocks.revoke).toHaveBeenCalledWith('blob:qa-file'); expect(mocks.share).not.toHaveBeenCalled();
  });
});
