/** Session-local monotonic clock. Never counts background, blur or database-save waits. */
export class ActiveStudyClock {
  private last: number;
  private total = 0;
  private card = 0;
  private focused = false;
  private foreground = false;
  private running = false;
  constructor(private readonly now: () => number = () => performance.now()) {
    this.last = this.sample();
  }
  private sample() {
    const value = this.now();
    if (!Number.isFinite(value)) throw new Error("INVALID_STUDY_CLOCK");
    return value;
  }
  private settle() {
    const next = Math.max(this.last, this.sample());
    if (this.running && this.focused && this.foreground) {
      this.total += next - this.last;
      this.card += next - this.last;
    }
    this.last = next;
  }
  setFocused(value: boolean) {
    this.settle();
    this.focused = value;
  }
  setForeground(value: boolean) {
    this.settle();
    this.foreground = value;
  }
  setRunning(value: boolean) {
    this.settle();
    this.running = value;
  }
  nextCard() {
    this.settle();
    this.card = 0;
  }
  snapshot() {
    this.settle();
    return { activeMs: Math.round(this.total), cardMs: Math.round(this.card) };
  }
}
