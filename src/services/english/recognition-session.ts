export interface LocalSpeechEngine {
  available(): boolean; onDevice(): boolean; permission(): Promise<boolean>;
  start(): void; abort(): void;
}
/** Cancelled permission requests cannot start the microphone after blur/background. */
export class EnglishRecognitionSession {
  private generation = 0;
  private pending = false;
  active = false;
  permissionGranted: boolean | null = null;
  constructor(private engine: LocalSpeechEngine) {}
  async start(): Promise<'STARTED' | 'UNAVAILABLE' | 'NO_OFFLINE_ENGINE' | 'DENIED' | 'CANCELLED' | 'BUSY'> {
    if (this.pending || this.active) return 'BUSY';
    if (!this.engine.available()) return 'UNAVAILABLE';
    if (!this.engine.onDevice()) return 'NO_OFFLINE_ENGINE';
    const generation = ++this.generation;
    this.permissionGranted = null;
    this.pending = true;
    let permissionTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const granted = await Promise.race([
        this.engine.permission(),
        new Promise<boolean>((_resolve, reject) => { permissionTimer = setTimeout(() => { this.cancel(); reject(new Error('PERMISSION_TIMEOUT')); }, 20000); }),
      ]);
      if (generation >= this.generation - 1) this.permissionGranted = granted;
      if (generation !== this.generation) return 'CANCELLED';
      if (!granted) return 'DENIED';
      this.active = true;
      this.engine.start();
      return 'STARTED';
    } catch (error) { this.active = false; throw error; }
    finally { if (permissionTimer) clearTimeout(permissionTimer); if (generation === this.generation) this.pending = false; }
  }
  cancel() { this.generation++; this.pending = false; if (this.active) this.engine.abort(); this.active = false; }
  ended() { this.active = false; }
  acceptsResults() { return this.active; }
}
