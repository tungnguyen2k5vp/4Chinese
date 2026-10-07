export type RecordingRetention = 'SESSION' | '7_DAYS' | '30_DAYS' | 'MANUAL';
export type SavedRecording = {
  id: string; filename: string; createdAt: string; durationMs: number; bytes: number;
  retention: Exclude<RecordingRetention, 'SESSION'>; expiresAt: string | null;
};
export const RECORDING_LIBRARY_LIMIT = 50;
export const RECORDING_FILE_LIMIT = 8 * 1024 * 1024;
export const RECORDING_TOTAL_LIMIT = 64 * 1024 * 1024;
export const RECORDING_MANIFEST_LIMIT = 32 * 1024;
export type RecordingLibraryAdapter = {
  root: string; cacheRoot: string;
  ensureRoot(): Promise<void>; readManifest(): Promise<string | null>; writeManifestAtomic(text: string): Promise<void>;
  copy(source: string, target: string): Promise<void>; size(uri: string): Promise<number | null>;
  remove(uri: string): Promise<void>; files(): Promise<string[]>;
};
const keys = ['id', 'filename', 'createdAt', 'durationMs', 'bytes', 'retention', 'expiresAt'];
const filenamePattern = /^rp_[a-zA-Z0-9_-]{1,80}\.m4a$/;
function safeUri(uri: string): string {
  let decoded: string;
  try { decoded = decodeURIComponent(uri); } catch { throw new Error('UNSAFE_RECORDING_PATH'); }
  if (!decoded.startsWith('file:///') || /[\\?#%\u0000-\u001f]/u.test(decoded) ||
    decoded.split('/').some((part) => part === '.' || part === '..')) throw new Error('UNSAFE_RECORDING_PATH');
  return decoded;
}
/** Validate before every copy/delete/play operation. Never delete the source cache file here. */
export function assertRecordingPath(uri: string, root: string): void {
  const base = safeUri(root);
  if (!base.endsWith('/') || base.length < 12 || !safeUri(uri).startsWith(base) || safeUri(uri) === base) throw new Error('UNSAFE_RECORDING_PATH');
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.length === 24 && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function parseRecordingManifest(text: string | null): SavedRecording[] {
  if (text === null) return [];
  if (text.length > RECORDING_MANIFEST_LIMIT) throw new Error('INVALID_RECORDING_MANIFEST');
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_RECORDING_MANIFEST');
  const manifest = parsed as Record<string, unknown>;
  if (Object.keys(manifest).length !== 2 || manifest.version !== 1 || !Array.isArray(manifest.recordings) || manifest.recordings.length > RECORDING_LIBRARY_LIMIT) throw new Error('INVALID_RECORDING_MANIFEST');
  const ids = new Set<string>(); let total = 0;
  for (const item of manifest.recordings) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('INVALID_RECORDING_MANIFEST');
    const row = item as SavedRecording;
    if (Object.keys(row).length !== keys.length || !keys.every((key) => Object.hasOwn(row, key)) ||
      typeof row.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || ids.has(row.id) ||
      row.filename !== `rp_${row.id}.m4a` || !validDate(row.createdAt) ||
      !Number.isInteger(row.durationMs) || row.durationMs < 1 || row.durationMs > 120000 ||
      !Number.isInteger(row.bytes) || row.bytes < 1 || row.bytes > RECORDING_FILE_LIMIT ||
      !['7_DAYS', '30_DAYS', 'MANUAL'].includes(row.retention)) throw new Error('INVALID_RECORDING_MANIFEST');
    const days = row.retention === '7_DAYS' ? 7 : 30;
    if (row.retention === 'MANUAL' ? row.expiresAt !== null :
      !validDate(row.expiresAt) || Date.parse(row.expiresAt) !== Date.parse(row.createdAt) + days * 86400000) throw new Error('INVALID_RECORDING_MANIFEST');
    ids.add(row.id); total += row.bytes;
  }
  if (total > RECORDING_TOTAL_LIMIT) throw new Error('INVALID_RECORDING_MANIFEST');
  return manifest.recordings as SavedRecording[];
}

/** Metadata manifest only. Serialized copy/manifest/delete; active playback leases protect files. */
export class RecordingLibrary {
  private operations: Promise<unknown> = Promise.resolve();
  private active = new Set<string>();
  constructor(private adapter: RecordingLibraryAdapter, private now: () => Date = () => new Date(),
    private id: () => string = () => `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`) {
    if (!safeUri(adapter.root).endsWith('/recording-library-v1/')) throw new Error('UNSAFE_RECORDING_ROOT');
    assertRecordingPath(`${adapter.root}manifest.json`, adapter.root);
    assertRecordingPath(`${adapter.cacheRoot}source.m4a`, adapter.cacheRoot);
  }
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.operations.then(task, task); this.operations = result.catch(() => undefined); return result;
  }
  private uri(filename: string): string {
    if (!filenamePattern.test(filename)) throw new Error('UNSAFE_RECORDING_PATH');
    const uri = this.adapter.root + filename; assertRecordingPath(uri, this.adapter.root); return uri;
  }
  private async read() {
    await this.adapter.ensureRoot();
    const text = await this.adapter.readManifest();
    if (text === null && (await this.adapter.files()).some((name) => filenamePattern.test(name))) throw new Error('RECORDING_MANIFEST_MISSING');
    return parseRecordingManifest(text);
  }
  private async write(rows: SavedRecording[]) {
    const text = JSON.stringify({ version: 1, recordings: rows }); parseRecordingManifest(text);
    await this.adapter.writeManifestAtomic(text);
  }
  async list(): Promise<SavedRecording[]> {
    return this.enqueue(async () => {
      const rows = await this.read();
      const keep: SavedRecording[] = []; const remove: string[] = [];
      const now = this.now().getTime(); if (!Number.isFinite(now)) throw new Error('INVALID_RECORDING_CLOCK');
      for (const row of rows) {
        if (this.active.has(row.id)) { keep.push(row); continue; }
        const uri = this.uri(row.filename);
        const size = await this.adapter.size(uri);
        if (row.expiresAt && Date.parse(row.expiresAt) <= now) remove.push(uri);
        else if (size !== null) {
          if (size !== row.bytes) throw new Error('RECORDING_FILE_CHANGED');
          keep.push(row);
        }
      }
      // Commit metadata first. If file deletion fails, next access retries the orphan.
      if (keep.length !== rows.length) await this.write(keep);
      for (const uri of remove) await this.adapter.remove(uri);
      const referenced = new Set(keep.map((row) => row.filename));
      for (const filename of await this.adapter.files()) {
        if (filenamePattern.test(filename) && !referenced.has(filename)) await this.adapter.remove(this.uri(filename));
      }
      return keep.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    });
  }
  async save(input: { source: string; durationMs: number; retention: RecordingRetention; confirmed: boolean; signal?: AbortSignal }): Promise<SavedRecording> {
    return this.enqueue(async () => {
      if (input.confirmed !== true || input.retention === 'SESSION' || !['7_DAYS', '30_DAYS', 'MANUAL'].includes(input.retention) ||
        !Number.isInteger(input.durationMs) || input.durationMs < 1 || input.durationMs > 120000) throw new Error('RECORDING_SAVE_OPT_IN_REQUIRED');
      const cancelled = () => { if (input.signal?.aborted) throw new Error('RECORDING_SAVE_CANCELLED'); };
      cancelled(); assertRecordingPath(input.source, this.adapter.cacheRoot);
      if (!/\.m4a$/i.test(input.source)) throw new Error('INVALID_RECORDING_FORMAT');
      const rows = await this.read(); cancelled();
      const size = await this.adapter.size(input.source);
      if (size === null || !Number.isInteger(size) || size < 1 || size > RECORDING_FILE_LIMIT) throw new Error('INVALID_RECORDING_SIZE');
      if (rows.length >= RECORDING_LIBRARY_LIMIT || rows.reduce((sum, row) => sum + row.bytes, 0) + size > RECORDING_TOTAL_LIMIT) throw new Error('RECORDING_LIBRARY_FULL');
      const id = this.id(); const filename = `rp_${id}.m4a`; const target = this.uri(filename);
      if (rows.some((row) => row.id === id) || await this.adapter.size(target) !== null) throw new Error('RECORDING_ID_CONFLICT');
      const now = this.now(); const days = input.retention === '7_DAYS' ? 7 : 30;
      const row: SavedRecording = { id, filename, createdAt: now.toISOString(), durationMs: input.durationMs, bytes: size,
        retention: input.retention, expiresAt: input.retention === 'MANUAL' ? null : new Date(now.getTime() + days * 86400000).toISOString() };
      parseRecordingManifest(JSON.stringify({ version: 1, recordings: [...rows, row] }));
      cancelled();
      try {
        await this.adapter.copy(input.source, target); cancelled();
        if (await this.adapter.size(target) !== size) throw new Error('RECORDING_COPY_FAILED');
        cancelled(); await this.write([...rows, row]);
      } catch (error) { await this.adapter.remove(target).catch(() => undefined); throw error; }
      return row;
    });
  }
  async acquire(id: string): Promise<{ uri: string; release(): void }> {
    return this.enqueue(async () => {
      const row = (await this.read()).find((row) => row.id === id);
      if (!row || this.active.has(id) || row.expiresAt && Date.parse(row.expiresAt) <= this.now().getTime()) throw new Error('RECORDING_UNAVAILABLE');
      const uri = this.uri(row.filename);
      if (await this.adapter.size(uri) !== row.bytes) throw new Error('RECORDING_UNAVAILABLE');
      this.active.add(id);
      return { uri, release: () => { this.active.delete(id); } };
    });
  }
  async delete(id: string, confirmed: boolean): Promise<void> {
    return this.enqueue(async () => {
      if (confirmed !== true) throw new Error('RECORDING_DELETE_CONFIRMATION_REQUIRED');
      if (this.active.has(id)) throw new Error('RECORDING_ACTIVE');
      const rows = await this.read(); const row = rows.find((row) => row.id === id);
      if (!row) throw new Error('RECORDING_UNAVAILABLE');
      await this.write(rows.filter((row) => row.id !== id));
      await this.adapter.remove(this.uri(row.filename));
    });
  }
}

let nativeLibrary: Promise<RecordingLibrary> | undefined;
/** Lazy native adapter: importing this pure service never opens audio/files/network on Web/tests. */
export function getRecordingLibrary(): Promise<RecordingLibrary> {
  nativeLibrary ??= (async () => {
    const { Directory, File, Paths } = await import('expo-file-system');
    const root = `${Paths.document.uri.replace(/\/+$/, '')}/recording-library-v1/`;
    const cacheRoot = `${Paths.cache.uri.replace(/\/+$/, '')}/`;
    const directory = new Directory(root);
    const manifest = new File(root + 'manifest.json');
    return new RecordingLibrary({ root, cacheRoot,
      ensureRoot: async () => { directory.create({ intermediates: true, idempotent: true }); },
      readManifest: async () => {
        if (!manifest.exists) return null;
        if (manifest.size > RECORDING_MANIFEST_LIMIT) throw new Error('INVALID_RECORDING_MANIFEST');
        return manifest.text();
      },
      writeManifestAtomic: async (text) => {
        const temp = new File(root + 'manifest.tmp');
        temp.create({ overwrite: true }); temp.write(text); temp.move(manifest, { overwrite: true });
      },
      copy: async (source, target) => { assertRecordingPath(source, cacheRoot); assertRecordingPath(target, root); new File(source).copy(new File(target)); },
      size: async (uri) => { assertRecordingPath(uri, uri.startsWith(root) ? root : cacheRoot); const file = new File(uri); return file.exists ? file.size : null; },
      remove: async (uri) => { assertRecordingPath(uri, root); const file = new File(uri); if (file.exists) file.delete(); },
      files: async () => directory.list().filter((entry) => entry instanceof File).map((entry) => entry.name),
    });
  })().catch((error) => { nativeLibrary = undefined; throw error; });
  return nativeLibrary;
}
