import { describe, expect, it, vi } from 'vitest';

import { assertRecordingPath, parseRecordingManifest, RecordingLibrary, RECORDING_FILE_LIMIT, RECORDING_LIBRARY_LIMIT,
  RECORDING_MANIFEST_LIMIT, type RecordingLibraryAdapter } from './recording-library';

const root = 'file:///app/documents/recording-library-v1/';
const cacheRoot = 'file:///app/cache/'; const source = cacheRoot + 'Audio/source.m4a';
function fixture() {
  const files = new Map<string, number>([[source, 1000]]);
  let manifest: string | null = null;
  let now = new Date('2026-10-01T00:00:00.000Z'); let nextId = 0;
  const adapter: RecordingLibraryAdapter = {
    root, cacheRoot, ensureRoot: vi.fn(async () => {}),
    readManifest: vi.fn(async () => manifest), writeManifestAtomic: vi.fn(async (text) => { manifest = text; }),
    copy: vi.fn(async (from, to) => { if (!files.has(from)) throw new Error('missing'); files.set(to, files.get(from)!); }),
    size: vi.fn(async (uri) => files.get(uri) ?? null), remove: vi.fn(async (uri) => { files.delete(uri); }),
    files: vi.fn(async () => [...files.keys()].filter((uri) => uri.startsWith(root)).map((uri) => uri.slice(root.length))),
  };
  const library = new RecordingLibrary(adapter, () => now, () => `test-${++nextId}`);
  return { files, adapter, library, setManifest: (text: string | null) => { manifest = text; },
    manifest: () => manifest, clock: (value: string) => { now = new Date(value); } };
}
const input = { source, durationMs: 2300, retention: '7_DAYS' as const, confirmed: true };

describe('explicit retained recording adapter boundary', () => {
  it('keeps session/default unpersisted, requires opt-in, and writes only bounded metadata', async () => {
    const f = fixture();
    await expect(f.library.save({ ...input, retention: 'SESSION' })).rejects.toThrow('OPT_IN');
    await expect(f.library.save({ ...input, confirmed: false })).rejects.toThrow('OPT_IN');
    expect(f.adapter.copy).not.toHaveBeenCalled();
    const row = await f.library.save(input);
    expect(row.expiresAt).toBe('2026-10-08T00:00:00.000Z');
    expect(f.manifest()).not.toMatch(/file:|source|audioData|transcript|score|base64/);
    expect(f.files.has(source)).toBe(true);
    expect(await f.library.list()).toEqual([row]);
  });
  it('survives service recreation, honors 7/30-day boundaries and retains manual until confirmed deletion', async () => {
    const f = fixture();
    const seven = await f.library.save(input);
    const thirty = await f.library.save({ ...input, retention: '30_DAYS' });
    const manual = await f.library.save({ ...input, retention: 'MANUAL' });
    expect(thirty.expiresAt).toBe('2026-10-31T00:00:00.000Z'); expect(manual.expiresAt).toBeNull();
    const reopened = new RecordingLibrary(f.adapter, () => new Date('2026-10-08T00:00:00.000Z'));
    expect((await reopened.list()).map((row) => row.id)).not.toContain(seven.id);
    expect(f.files.has(root + seven.filename)).toBe(false);
    f.clock('2026-10-31T00:00:00.000Z');
    expect(await f.library.list()).toEqual([manual]);
    await expect(f.library.delete(manual.id, false)).rejects.toThrow('CONFIRMATION');
    await f.library.delete(manual.id, true);
    expect(await f.library.list()).toEqual([]); expect(f.files.has(source)).toBe(true);
  });
  it('never deletes active playback during expiry/manual deletion, releases before later cleanup', async () => {
    const f = fixture(); const row = await f.library.save(input); const lease = await f.library.acquire(row.id);
    f.clock('2026-10-09T00:00:00.000Z');
    expect(await f.library.list()).toEqual([row]);
    await expect(f.library.delete(row.id, true)).rejects.toThrow('ACTIVE');
    expect(f.files.has(lease.uri)).toBe(true);
    lease.release(); expect(await f.library.list()).toEqual([]);
    await expect(f.library.acquire(row.id)).rejects.toThrow('UNAVAILABLE');
  });
  it('rejects external/traversal/encoded URI sources before file access and never deletes outside root', async () => {
    const f = fixture();
    for (const bad of ['https://site/a.m4a', 'content://file/a.m4a', cacheRoot + '../a.m4a', cacheRoot + '%2e%2e/a.m4a',
      cacheRoot + '%252e%252e/a.m4a', cacheRoot + 'a\\b.m4a', 'file:///app/cache-other/a.m4a', cacheRoot + 'a.m4a?x']) {
      await expect(f.library.save({ ...input, source: bad })).rejects.toThrow();
    }
    expect(f.adapter.copy).not.toHaveBeenCalled(); expect(f.adapter.remove).not.toHaveBeenCalled();
    expect(() => assertRecordingPath(root + '../other', root)).toThrow();
    expect(() => new RecordingLibrary({ ...f.adapter, root: 'file:///app/documents/' })).toThrow('ROOT');
  });
  it('fails closed on corrupt/missing/oversized manifest without cleanup or overwriting', async () => {
    const f = fixture(); const row = await f.library.save(input);
    for (const text of ['broken', 'x'.repeat(RECORDING_MANIFEST_LIMIT + 1), JSON.stringify({ version: 1, recordings: [{ ...row, filename: '../secret.m4a' }] }),
      JSON.stringify({ version: 1, recordings: [{ ...row, transcript: 'secret' }] }), null]) {
      f.setManifest(text);
      await expect(f.library.list()).rejects.toThrow();
      await expect(f.library.save(input)).rejects.toThrow();
    }
    expect(f.adapter.remove).not.toHaveBeenCalled(); expect(f.files.has(root + row.filename)).toBe(true);
  });
  it('bounds file size/duration/count and serializes competing saves', async () => {
    const f = fixture();
    for (const durationMs of [0, NaN, 120001]) await expect(f.library.save({ ...input, durationMs })).rejects.toThrow();
    f.files.set(source, RECORDING_FILE_LIMIT + 1); await expect(f.library.save(input)).rejects.toThrow('SIZE');
    f.files.set(source, 1000);
    const rows = await Promise.all(Array.from({ length: RECORDING_LIBRARY_LIMIT }, () => f.library.save(input)));
    expect(new Set(rows.map((row) => row.id)).size).toBe(RECORDING_LIBRARY_LIMIT);
    await expect(f.library.save(input)).rejects.toThrow('FULL');
    expect(parseRecordingManifest(f.manifest())).toHaveLength(RECORDING_LIBRARY_LIMIT);
  });
  it('rejects total storage above 64MiB without eviction', async () => {
    const f = fixture(); f.files.set(source, RECORDING_FILE_LIMIT);
    for (let index = 0; index < 8; index++) await f.library.save({ ...input, retention: 'MANUAL' });
    await expect(f.library.save(input)).rejects.toThrow('FULL'); expect(f.adapter.remove).not.toHaveBeenCalled();
  });
  it('copies then atomically commits; copy/manifest failure and cancellation clean only the new destination', async () => {
    const f = fixture();
    vi.mocked(f.adapter.writeManifestAtomic).mockRejectedValueOnce(new Error('disk-full'));
    await expect(f.library.save(input)).rejects.toThrow('disk-full');
    expect(f.files.has(source)).toBe(true); expect(f.manifest()).toBeNull();
    const controller = new AbortController();
    vi.mocked(f.adapter.copy).mockImplementationOnce(async (from, to) => { f.files.set(to, f.files.get(from)!); controller.abort(); });
    await expect(f.library.save({ ...input, signal: controller.signal })).rejects.toThrow('CANCELLED');
    expect([...f.files.keys()]).toEqual([source]);
    expect(vi.mocked(f.adapter.remove).mock.calls.every(([uri]) => uri.startsWith(root))).toBe(true);
    const copyCount = vi.mocked(f.adapter.copy).mock.calls.length;
    await expect(f.library.save({ ...input, signal: controller.signal })).rejects.toThrow('CANCELLED');
    expect(vi.mocked(f.adapter.copy).mock.calls).toHaveLength(copyCount);
  });
  it('prunes missing files and safely cleans only recognized orphan filenames', async () => {
    const f = fixture(); const row = await f.library.save(input); f.files.delete(root + row.filename);
    f.files.set(root + 'rp_orphan.m4a', 50); f.files.set(root + 'unrelated.txt', 50); f.files.set(root + '../external.m4a', 50);
    expect(await f.library.list()).toEqual([]);
    expect(f.files.has(root + 'rp_orphan.m4a')).toBe(false);
    expect(f.files.has(root + 'unrelated.txt')).toBe(true); expect(f.files.has(root + '../external.m4a')).toBe(true);
  });
  it('leaves metadata intact if manifest commit fails during deletion', async () => {
    const f = fixture(); const row = await f.library.save(input); const before = f.manifest();
    vi.mocked(f.adapter.writeManifestAtomic).mockRejectedValueOnce(new Error('disk-full'));
    await expect(f.library.delete(row.id, true)).rejects.toThrow();
    expect(f.manifest()).toBe(before); expect(f.files.has(root + row.filename)).toBe(true);
  });
  it('retries owned orphan cleanup after a deletion failure without touching other files', async () => {
    const f = fixture(); const row = await f.library.save(input);
    vi.mocked(f.adapter.remove).mockRejectedValueOnce(new Error('storage-unavailable'));
    await expect(f.library.delete(row.id, true)).rejects.toThrow('storage-unavailable');
    expect(parseRecordingManifest(f.manifest())).toEqual([]);
    expect(f.files.has(root + row.filename)).toBe(true);
    expect(await f.library.list()).toEqual([]);
    expect(f.files.has(root + row.filename)).toBe(false); expect(f.files.has(source)).toBe(true);
  });
  it('rejects changed/missing audio and invalid expiry metadata without unsafe deletion', async () => {
    const f = fixture(); const row = await f.library.save(input);
    f.files.set(root + row.filename, 999);
    await expect(f.library.list()).rejects.toThrow('CHANGED');
    await expect(f.library.acquire(row.id)).rejects.toThrow('UNAVAILABLE');
    expect(f.adapter.remove).not.toHaveBeenCalled();
    expect(() => parseRecordingManifest(JSON.stringify({ version: 1, recordings: [{ ...row, expiresAt: row.createdAt }] }))).toThrow();
    expect(() => parseRecordingManifest(JSON.stringify({ version: 1, recordings: [row, row] }))).toThrow();
  });
});
