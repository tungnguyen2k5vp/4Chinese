import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocalRecording, type LocalRecordingState, type RecordingAdapter } from './local-recording';

function fixture() {
  const adapter: RecordingAdapter = { permission: vi.fn(async () => true), mode: vi.fn(async () => {}),
    prepare: vi.fn(async () => {}), record: vi.fn(), stop: vi.fn(async () => {}),
    uri: vi.fn(() => 'file://record.m4a'), remove: vi.fn() };
  const states: LocalRecordingState[] = [];
  const recording = new LocalRecording(adapter, (state) => states.push(state));
  recording.activate();
  return { adapter, recording, states };
}

afterEach(() => vi.useRealTimers());
describe('local microphone lifecycle', () => {
  it('supports a bounded advanced speaking duration and rejects unsafe limits', async () => {
    vi.useFakeTimers();
    const { adapter } = fixture(); const states: LocalRecordingState[] = [];
    const recording = new LocalRecording(adapter, (state) => states.push(state), 90_000);
    recording.activate(); await recording.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(states.at(-1)?.phase).toBe('recording');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(states.at(-1)?.phase).toBe('ready');
    await recording.cancel();
    expect(() => new LocalRecording(adapter, () => {}, 0)).toThrow('INVALID_RECORDING_DURATION');
    expect(() => new LocalRecording(adapter, () => {}, 120001)).toThrow('INVALID_RECORDING_DURATION');
  });
  it('denial never opens the mic', async () => {
    const { adapter, recording, states } = fixture();
    adapter.permission = vi.fn(async () => false);
    await recording.start();
    expect(adapter.prepare).not.toHaveBeenCalled();
    expect(states.at(-1)?.notice).toContain('quyền micro');
  });
  it('a permission result after navigation cannot restart recording', async () => {
    const { adapter, recording, states } = fixture();
    let resolve!: (value: boolean) => void;
    adapter.permission = () => new Promise<boolean>((done) => { resolve = done; });
    const start = recording.start();
    await Promise.resolve();
    const cancel = recording.cancel();
    resolve(true);
    await Promise.all([start, cancel]);
    expect(adapter.record).not.toHaveBeenCalled();
    expect(states.some((state) => state.phase === 'recording')).toBe(false);
    expect(adapter.mode).toHaveBeenLastCalledWith(false);
  });
  it('cancellation while preparing closes resources and deletes temporary audio', async () => {
    const { adapter, recording } = fixture();
    let resolve!: () => void;
    adapter.prepare = () => new Promise<void>((done) => { resolve = done; });
    const start = recording.start();
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    const cancel = recording.cancel();
    resolve();
    await Promise.all([start, cancel]);
    expect(adapter.record).not.toHaveBeenCalled();
    expect(adapter.stop).toHaveBeenCalled();
    expect(adapter.remove).toHaveBeenCalledWith('file://record.m4a');
  });
  it('keeps a bounded recording for local replay, then removes it on exit', async () => {
    vi.useFakeTimers();
    const { adapter, recording, states } = fixture();
    await recording.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(states.at(-1)?.phase).toBe('ready');
    expect(states.at(-1)?.uri).toBe('file://record.m4a');
    expect(adapter.mode).toHaveBeenLastCalledWith(false);
    await recording.cancel();
    expect(adapter.remove).toHaveBeenCalledWith('file://record.m4a');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('double taps cannot create two native recordings', async () => {
    const { adapter, recording } = fixture();
    await Promise.all([recording.start(), recording.start()]);
    expect(adapter.record).toHaveBeenCalledTimes(1);
    await recording.cancel();
  });
  it('recorder failure restores playback mode instead of leaving the mic open', async () => {
    const { adapter, recording, states } = fixture();
    adapter.record = () => { throw new Error('native failure'); };
    await recording.start();
    expect(adapter.mode).toHaveBeenLastCalledWith(false);
    expect(adapter.stop).toHaveBeenCalled();
    expect(states.at(-1)?.phase).toBe('idle');
  });
});
