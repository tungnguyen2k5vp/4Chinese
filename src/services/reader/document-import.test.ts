import { strToU8 } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pickTextDocument } from './document-import';

const mock = vi.hoisted(() => ({ pick: vi.fn(), read: vi.fn(), remove: vi.fn(), size: 20, platform: 'android' }));
vi.mock('expo-document-picker', () => ({ getDocumentAsync: mock.pick }));
vi.mock('react-native', () => ({ Platform: { get OS() { return mock.platform; } } }));
vi.mock('expo-file-system', () => ({ Paths: { cache: { uri: 'file://cache/' } }, File: class {
  exists = true;
  get size() { return mock.size; }
  bytes = mock.read;
  delete = mock.remove;
} }));

beforeEach(() => {
  vi.clearAllMocks(); mock.size = 20; mock.platform = 'android';
  mock.read.mockResolvedValue(strToU8('你好，中国！'));
  mock.pick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://cache/document.txt', name: 'document.txt', size: 20 }] });
});
afterEach(() => vi.useRealTimers());

describe('document picker import adapter', () => {
  it('reads a bounded cache copy, cleans it up and returns preview without database writes', async () => {
    expect(await pickTextDocument(new AbortController().signal)).toEqual({ source: 'TXT', text: '你好，中国！', truncated: false });
    expect(mock.remove).toHaveBeenCalledOnce();
  });
  it('cancellation changes no content and still cleans a picked cache copy', async () => {
    const controller = new AbortController(); controller.abort();
    expect(await pickTextDocument(controller.signal)).toBeNull();
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.remove).toHaveBeenCalledOnce();
  });
  it('picker cancellation creates no file operations', async () => {
    mock.pick.mockResolvedValue({ canceled: true });
    expect(await pickTextDocument(new AbortController().signal)).toBeNull();
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it('never reads or deletes external files/traversal paths', async () => {
    for (const uri of ['file://documents/original.txt', 'https://server/file.txt', 'file://cache-evil/original.txt', 'file://cache/../original.txt', 'file://cache/%2e%2e/original.txt']) {
      mock.pick.mockResolvedValue({ canceled: false, assets: [{ uri, name: 'document.txt' }] });
      await expect(pickTextDocument(new AbortController().signal)).rejects.toThrow('an toàn');
    }
    expect(mock.remove).not.toHaveBeenCalled(); expect(mock.read).not.toHaveBeenCalled();
  });
  it('rejects oversized content before loading bytes into JavaScript', async () => {
    mock.size = 300_000;
    await expect(pickTextDocument(new AbortController().signal)).rejects.toThrow('256 KB');
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.remove).toHaveBeenCalledOnce();
  });
  it('ignores late content after cancellation', async () => {
    let resolve!: (bytes: Uint8Array) => void;
    mock.read.mockImplementation(() => new Promise<Uint8Array>((done) => { resolve = done; }));
    const controller = new AbortController();
    const task = pickTextDocument(controller.signal);
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    controller.abort(); resolve(strToU8('late'));
    expect(await task).toBeNull(); expect(mock.remove).toHaveBeenCalledOnce();
  });
  it('bounds stalled reads to ten seconds and removes the cache file', async () => {
    vi.useFakeTimers(); mock.read.mockImplementation(() => new Promise(() => {}));
    const task = pickTextDocument(new AbortController().signal);
    const assertion = expect(task).rejects.toThrow('quá lâu');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(mock.remove).toHaveBeenCalledOnce();
  });
  it('supports browser-selected File without invoking native filesystem operations', async () => {
    mock.platform = 'web';
    const bytes = strToU8('中文');
    mock.pick.mockResolvedValue({ canceled: false, assets: [{ name: 'web.txt', file: { size: bytes.length, arrayBuffer: async () => bytes.buffer } }] });
    expect((await pickTextDocument(new AbortController().signal))?.text).toBe('中文');
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.remove).not.toHaveBeenCalled();
  });
});
