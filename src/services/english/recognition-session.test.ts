import { describe, expect, it, vi } from 'vitest';

import { EnglishRecognitionSession } from './recognition-session';

describe('local microphone lifecycle', () => {
  it('bounds a permission callback that never arrives and rejects a later grant', async () => {
    vi.useFakeTimers();
    try {
      let grant!: (value: boolean) => void;
      const engine = { available: () => true, onDevice: () => true, permission: () => new Promise<boolean>(resolve => { grant = resolve; }), start: vi.fn(), abort: vi.fn() };
      const session = new EnglishRecognitionSession(engine);
      const assertion = expect(session.start()).rejects.toThrow('PERMISSION_TIMEOUT');
      await vi.advanceTimersByTimeAsync(20000); await assertion; grant(true);
      expect(engine.start).not.toHaveBeenCalled(); expect(session.acceptsResults()).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it.each(['blur', 'background', 'cancel', 'timeout'])('invalidates an in-flight permission request on %s', async () => {
    let grant!: (value: boolean) => void;
    const engine = { available: () => true, onDevice: () => true, permission: () => new Promise<boolean>(resolve => { grant = resolve; }), start: vi.fn(), abort: vi.fn() };
    const session = new EnglishRecognitionSession(engine);
    const pending = session.start(); session.cancel(); grant(true);
    expect(await pending).toBe('CANCELLED'); expect(engine.start).not.toHaveBeenCalled(); expect(session.acceptsResults()).toBe(false);
  });
  it('denies permission without starting; handles missing offline/engine', async () => {
    const engine = { available: () => true, onDevice: () => true, permission: async () => false, start: vi.fn(), abort: vi.fn() };
    expect(await new EnglishRecognitionSession(engine).start()).toBe('DENIED');
    expect(await new EnglishRecognitionSession({ ...engine, available: () => false }).start()).toBe('UNAVAILABLE');
    expect(await new EnglishRecognitionSession({ ...engine, onDevice: () => false }).start()).toBe('NO_OFFLINE_ENGINE');
    expect(engine.start).not.toHaveBeenCalled();
  });
  it('aborts active audio, rejects late transcript and prevents double start', async () => {
    const engine = { available: () => true, onDevice: () => true, permission: async () => true, start: vi.fn(), abort: vi.fn() };
    const session = new EnglishRecognitionSession(engine);
    expect(await session.start()).toBe('STARTED'); expect(await session.start()).toBe('BUSY');
    expect(session.acceptsResults()).toBe(true); session.cancel();
    expect(engine.abort).toHaveBeenCalledOnce(); expect(session.acceptsResults()).toBe(false);
  });
});
