import { afterEach, describe, expect, it, vi } from 'vitest';

import { analyzeReaderChunk, ReaderWorkCanceled } from './chunk-analysis';
import { splitReaderChunks } from './pages';

afterEach(() => vi.useRealTimers());

describe('lazy cancellable chunk analysis', () => {
  it('looks up and segments only the requested 2k chunk of a 100k novel', async () => {
    const chunks = splitReaderChunks('你'.repeat(98000) + '好'.repeat(2000));
    const lookup = vi.fn().mockResolvedValue([]);
    const result = await analyzeReaderChunk(chunks[49]!, lookup, new AbortController().signal);
    expect(lookup).toHaveBeenCalledOnce();
    expect(lookup.mock.calls[0]![0]).toEqual(['好', '好好', '好好好', '好好好好', '好好好好好', '好好好好好好']);
    expect(result).toHaveLength(2000);
    expect(result[0]!.text).toBe('好');
  });
  it('does not start lookup if canceled before analysis', async () => {
    const controller = new AbortController(); controller.abort();
    const lookup = vi.fn();
    await expect(analyzeReaderChunk(splitReaderChunks('你')[0]!, lookup, controller.signal)).rejects.toBeInstanceOf(ReaderWorkCanceled);
    expect(lookup).not.toHaveBeenCalled();
  });
  it('rejects promptly on cancellation and never returns a late lookup result', async () => {
    const controller = new AbortController();
    let resolve!: (value: []) => void;
    const lookup = vi.fn(() => new Promise<[]>((done) => { resolve = done; }));
    const task = analyzeReaderChunk(splitReaderChunks('你')[0]!, lookup, controller.signal);
    const assertion = expect(task).rejects.toBeInstanceOf(ReaderWorkCanceled);
    await vi.waitFor(() => expect(lookup).toHaveBeenCalled());
    controller.abort(); await assertion; resolve([]);
  });
  it('times out stalled lookup with a retryable error', async () => {
    vi.useFakeTimers();
    const task = analyzeReaderChunk(splitReaderChunks('你')[0]!, () => new Promise(() => {}), new AbortController().signal);
    const assertion = expect(task).rejects.toThrow('quá lâu');
    await vi.advanceTimersByTimeAsync(10001); await assertion;
  });
});
