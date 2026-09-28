export type LocalRecordingState = { phase: 'idle' | 'busy' | 'recording' | 'ready'; uri: string | null; notice: string | null };
export type RecordingAdapter = {
  permission(): Promise<boolean>; mode(recording: boolean): Promise<void>;
  prepare(): Promise<void>; record(): void; stop(): Promise<void>;
  uri(): string | null; remove(uri: string): void;
};
let audioOperations: Promise<void> = Promise.resolve();

/** Serialized native operations: a late permission/prepare cannot restart a cancelled mic. */
export class LocalRecording {
  private generation = 0;
  private active = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private state: LocalRecordingState = { phase: 'idle', uri: null, notice: null };
  constructor(private adapter: RecordingAdapter, private changed: (state: LocalRecordingState) => void) {}
  activate() { this.active = true; }
  private emit(next: LocalRecordingState) { this.state = next; if (this.active) this.changed(next); }
  private enqueue(task: () => Promise<void>) {
    audioOperations = audioOperations.then(task, task);
    return audioOperations;
  }
  private currentUri() { try { return this.adapter.uri(); } catch { return null; } }
  private async closeMic() { try { await this.adapter.stop(); } catch { /* Native object may already be released. */ } }
  private async playbackMode() { try { await this.adapter.mode(false); } catch { /* Best effort after interruption. */ } }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
  private deleteFile(uri: string | null) { if (uri) { try { this.adapter.remove(uri); } catch { /* Temporary cache cleanup. */ } } }
  async start(): Promise<void> {
    if (!this.active || this.state.phase === 'busy' || this.state.phase === 'recording') return;
    const generation = ++this.generation;
    this.emit({ ...this.state, phase: 'busy', notice: null });
    await this.enqueue(async () => {
      const valid = () => this.active && generation === this.generation;
      let prepared = false;
      try {
        if (!valid()) return;
        if (!(await this.adapter.permission())) {
          if (valid()) this.emit({ ...this.state, phase: this.state.uri ? 'ready' : 'idle', notice: 'Chưa được cấp quyền micro.' });
          return;
        }
        if (!valid()) return;
        await this.adapter.mode(true);
        if (!valid()) return;
        await this.adapter.prepare();
        prepared = true;
        if (!valid()) return;
        this.deleteFile(this.state.uri);
        this.adapter.record();
        this.emit({ phase: 'recording', uri: null, notice: null });
        this.timer = setTimeout(() => { void this.stop(); }, 30_000);
      } catch {
        if (valid()) this.emit({ phase: 'idle', uri: null, notice: 'Không mở được micro. Hãy thử lại.' });
      } finally {
        if (!valid() || this.state.phase !== 'recording') {
          if (prepared) { await this.closeMic(); this.deleteFile(this.currentUri()); }
          await this.playbackMode();
        }
      }
    });
  }
  async stop(): Promise<void> {
    if (!this.active || this.state.phase !== 'recording') return;
    const generation = this.generation;
    this.clearTimer();
    this.emit({ ...this.state, phase: 'busy' });
    await this.enqueue(async () => {
      try {
        await this.adapter.stop();
        const uri = this.currentUri();
        await this.playbackMode();
        if (!this.active || generation !== this.generation) { this.deleteFile(uri); return; }
        this.emit({ phase: uri ? 'ready' : 'idle', uri, notice: uri ? null : 'Không tạo được bản ghi.' });
      } catch {
        this.deleteFile(this.currentUri());
        await this.playbackMode();
        if (this.active && generation === this.generation) this.emit({ phase: 'idle', uri: null, notice: 'Bản ghi bị gián đoạn. Hãy ghi lại.' });
      }
    });
  }
  cancel(): Promise<void> {
    this.active = false;
    this.generation++;
    this.clearTimer();
    return this.enqueue(async () => {
      await this.closeMic();
      this.deleteFile(this.state.uri);
      this.deleteFile(this.currentUri());
      await this.playbackMode();
      this.emit({ phase: 'idle', uri: null, notice: null });
    });
  }
}
