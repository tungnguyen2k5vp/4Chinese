export type QuickSessionSnapshot = {
  elapsedSeconds: number;
  remainingSeconds: number;
  expired: boolean;
};

/** Foreground time only; independent of grading and persistent study statistics. */
export class QuickSessionClock {
  private elapsed = 0;
  private since: number | null = null;

  constructor(private readonly seconds: number, private readonly now: () => number = () => performance.now()) {
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid session duration');
  }

  private collect() {
    if (this.since === null) return;
    const current = this.now();
    this.elapsed = Math.min(this.seconds * 1000, this.elapsed + Math.max(0, current - this.since));
    this.since = current;
  }

  setActive(active: boolean) {
    this.collect();
    this.since = active && this.elapsed < this.seconds * 1000 ? this.now() : null;
  }

  snapshot(): QuickSessionSnapshot {
    this.collect();
    return {
      elapsedSeconds: Math.floor(this.elapsed / 1000),
      remainingSeconds: Math.ceil(this.seconds - this.elapsed / 1000),
      expired: this.elapsed >= this.seconds * 1000,
    };
  }
}

export function formatSessionClock(seconds: number): string {
  const bounded = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  return `${Math.floor(bounded / 60)}:${String(bounded % 60).padStart(2, '0')}`;
}
