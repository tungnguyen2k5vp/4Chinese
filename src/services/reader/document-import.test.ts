import { strToU8, zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pickReaderDocument, pickTextDocument } from './document-import';
import { MAX_EPUB_FILE_BYTES } from './epub-import';
import { MAX_TEXT_FILE_BYTES } from './text-import';

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
  const book = () => zipSync(Object.fromEntries(Object.entries({
    mimetype: 'application/epub+zip',
    'META-INF/container.xml': '<container><rootfiles><rootfile full-path="book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    'book.opf': '<package version="3.0"><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>',
    'a.xhtml': '<html><body><p>中国</p></body></html>',
  }).map(([key, value]) => [key, strToU8(value)])), { level: 0 });
  it('imports EPUB cache copy as preview, includes EPUB MIME and leaves TXT-only API compatible', async () => {
    mock.read.mockResolvedValue(book());
    mock.pick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://cache/book.epub', name: 'book.epub' }] });
    expect(await pickReaderDocument(new AbortController().signal)).toEqual({ source: 'EPUB', text: '中国', truncated: false });
    expect(mock.pick.mock.calls[0]![0].type).toContain('application/epub+zip');
    await expect(pickTextDocument(new AbortController().signal)).rejects.toThrow('.txt');
    expect(mock.remove).toHaveBeenCalledTimes(2);
  });
  it('imports browser EPUB without native filesystem, enforces actual bytes and metadata', async () => {
    mock.platform = 'web'; const bytes = book();
    mock.pick.mockResolvedValue({ canceled: false, assets: [{ name: 'web.epub', file: { size: bytes.length, arrayBuffer: async () => bytes.buffer } }] });
    expect((await pickReaderDocument(new AbortController().signal))?.source).toBe('EPUB');
    mock.pick.mockResolvedValue({ canceled: false, assets: [{ name: 'web.epub', file: { size: 10, arrayBuffer: async () => new ArrayBuffer(MAX_EPUB_FILE_BYTES + 1) } }] });
    await expect(pickReaderDocument(new AbortController().signal)).rejects.toThrow('8 MiB');
    mock.platform = 'android'; mock.size = MAX_EPUB_FILE_BYTES + 1;
    mock.pick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://cache/book.epub', name: 'book.epub' }] });
    await expect(pickReaderDocument(new AbortController().signal)).rejects.toThrow('8 MiB');
    expect(mock.read).not.toHaveBeenCalled();
  });
  it('cleans malformed EPUB and rejects PDF without a read', async () => {
    mock.pick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://cache/book.epub', name: 'book.epub' }] });
    await expect(pickReaderDocument(new AbortController().signal)).rejects.toThrow('EPUB');
    expect(mock.remove).toHaveBeenCalledOnce(); mock.read.mockClear();
    mock.pick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://cache/book.pdf', name: 'book.pdf' }] });
    await expect(pickReaderDocument(new AbortController().signal)).rejects.toThrow('PDF/URL');
    expect(mock.read).not.toHaveBeenCalled();
  });
  it('reads a bounded cache copy, cleans it up and returns preview without database writes', async () => {
    expect(await pickTextDocument(new AbortController().signal)).toEqual({ source: 'TXT', text: '你好，中国！', truncated: false });
    expect(mock.remove).toHaveBeenCalledOnce();
  });
  it('announces reading only after the native picker resolves, so picker backgrounding is not mistaken for cancellation', async () => {
    let finishPick!: (result: unknown) => void;
    mock.pick.mockImplementation(() => new Promise((resolve) => { finishPick = resolve; }));
    const onRead = vi.fn();
    const task = pickTextDocument(new AbortController().signal, onRead);
    expect(onRead).not.toHaveBeenCalled();
    finishPick({ canceled: false, assets: [{ uri: 'file://cache/document.txt', name: 'document.txt', size: 20 }] });
    expect((await task)?.text).toBe('你好，中国！');
    expect(onRead).toHaveBeenCalledOnce();
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
    mock.size = MAX_TEXT_FILE_BYTES + 1;
    await expect(pickTextDocument(new AbortController().signal)).rejects.toThrow('400.003');
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.remove).toHaveBeenCalledOnce();
  });
  it('ignores late content after cancellation', async () => {
    let resolve!: (bytes: Uint8Array) => void;
    mock.read.mockImplementation(() => new Promise<Uint8Array>((done) => { resolve = done; }));
    const controller = new AbortController();
    const task = pickTextDocument(controller.signal);
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    controller.abort();
    expect(await task).toBeNull(); expect(mock.remove).toHaveBeenCalledOnce();
    resolve(strToU8('late'));
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
  it('accepts an entire 100k Chinese TXT and checks returned bytes even when picker size is inaccurate', async () => {
    const bytes = strToU8('你'.repeat(100000)); mock.size = bytes.length; mock.read.mockResolvedValue(bytes);
    expect((await pickTextDocument(new AbortController().signal))?.text).toBe('你'.repeat(100000));
    mock.read.mockResolvedValue(new Uint8Array(MAX_TEXT_FILE_BYTES + 1));
    await expect(pickTextDocument(new AbortController().signal)).rejects.toThrow('400.003');
  });
  it('rejects nonfinite/unknown metadata and unsupported extensions before reading', async () => {
    mock.size = NaN;
    await expect(pickTextDocument(new AbortController().signal)).rejects.toThrow('400.003');
    mock.size = 20; mock.pick.mockResolvedValue({ canceled: false, assets: [{ uri: 'file://cache/book.pdf', name: 'book.pdf' }] });
    await expect(pickTextDocument(new AbortController().signal)).rejects.toThrow('.txt');
    expect(mock.read).not.toHaveBeenCalled(); expect(mock.remove).toHaveBeenCalledTimes(2);
  });
});
