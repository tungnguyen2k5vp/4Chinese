import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scorePronunciationAudio } from './ai-pronunciation';

const mock = vi.hoisted(() => ({ upload: vi.fn(), size: 1024, exists: true }));
vi.mock('expo-file-system', () => ({
  UploadType: { MULTIPART: 1 },
  File: class { get size() { return mock.size; } get exists() { return mock.exists; } upload = mock.upload; },
}));

const word = { simplified: '你好', traditional: '你好', pinyin: 'nǐ hǎo', primaryMeaningVi: 'xin chào' };

describe('optional speech upload boundaries', () => {
  beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key');
    mock.exists = true; mock.size = 1024; mock.upload.mockReset();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
  it('validates and returns a transcript match, not an acoustic assessment', async () => {
    mock.upload.mockResolvedValue({ status: 200, body: JSON.stringify({ score: 100, transcript: '你好', feedback: 'Matched' }) });
    expect(await scorePronunciationAudio('file:///temporary.m4a', word)).toEqual({ score: 100, transcript: '你好', feedback: 'Matched' });
    expect(mock.upload).toHaveBeenCalledTimes(1);
  });
  it.each([0, 5 * 1024 * 1024 + 1])('does not upload invalid file size %s', async (size) => {
    mock.size = size;
    await expect(scorePronunciationAudio('file:///temporary.m4a', word)).rejects.toThrow('5 MB');
    expect(mock.upload).not.toHaveBeenCalled();
  });
  it('does not upload a missing file', async () => {
    mock.exists = false;
    await expect(scorePronunciationAudio('file:///temporary.m4a', word)).rejects.toThrow('5 MB');
    expect(mock.upload).not.toHaveBeenCalled();
  });
  it('does not upload after caller cancellation', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(scorePronunciationAudio('file:///temporary.m4a', word, controller.signal)).rejects.toThrow('Đã hủy');
    expect(mock.upload).not.toHaveBeenCalled();
  });
  it.each([undefined, '100', null])('rejects malformed score %s', async (score) => {
    mock.upload.mockResolvedValue({ status: 200, body: JSON.stringify({ score, transcript: '你好', feedback: 'Matched' }) });
    await expect(scorePronunciationAudio('file:///temporary.m4a', word)).rejects.toThrow('không hợp lệ');
  });
  it('explains provider limits separately', async () => {
    mock.upload.mockResolvedValue({ status: 429, body: '{}' });
    await expect(scorePronunciationAudio('file:///temporary.m4a', word)).rejects.toThrow('hạn mức');
  });
  it('aborts an in-flight native upload when the caller leaves', async () => {
    const controller = new AbortController();
    mock.upload.mockImplementation((_endpoint, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
    }));
    const promise = scorePronunciationAudio('file:///temporary.m4a', word, controller.signal);
    const assertion = expect(promise).rejects.toThrow();
    controller.abort();
    await assertion;
  });
  it('bounds a stalled native upload to 20 seconds', async () => {
    vi.useFakeTimers();
    mock.upload.mockImplementation((_endpoint, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
    }));
    const assertion = expect(scorePronunciationAudio('file:///temporary.m4a', word)).rejects.toThrow('quá lâu');
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
  });
});
