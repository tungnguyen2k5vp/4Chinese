import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isImageOcrAvailable, recognizeImageText } from './ocr';

const mock = vi.hoisted(() => ({ available: true, recognize: vi.fn(), cancel: vi.fn() }));
vi.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => ({
  get recognizeImageText() { return mock.available ? mock.recognize : undefined; }, cancelImageText: mock.cancel,
}) }));

describe('offline image OCR adapter', () => {
  beforeEach(() => { mock.available = true; mock.recognize.mockReset(); mock.cancel.mockReset().mockResolvedValue(undefined); });
  afterEach(() => vi.useRealTimers());
  it('normalizes recognized line endings for editable Reader input', async () => {
    mock.recognize.mockResolvedValue(' 你好\r\n世界 ');
    expect(await recognizeImageText('file:///cache/image.jpg')).toEqual({ text: '你好\n世界', truncated: false });
  });
  it('keeps a bounded preview without splitting Unicode characters', async () => {
    mock.recognize.mockResolvedValue('中'.repeat(1999) + '𠮷' + '国');
    const result = await recognizeImageText('file:///cache/image.jpg');
    expect(Array.from(result.text)).toHaveLength(2000);
    expect(result.text.endsWith('𠮷')).toBe(true);
    expect(result.truncated).toBe(true);
  });
  it('gives a manual fallback on runtimes without the native method', async () => {
    mock.available = false;
    expect(isImageOcrAvailable()).toBe(false);
    await expect(recognizeImageText('file:///image.jpg')).rejects.toThrow('thủ công');
    expect(mock.recognize).not.toHaveBeenCalled();
  });
  it('does not accept remote image URLs', async () => {
    await expect(recognizeImageText('https://example.invalid/image.jpg')).rejects.toThrow('điện thoại');
    expect(mock.recognize).not.toHaveBeenCalled();
  });
  it.each(['', '   ', 42])('handles no text or invalid native output %s', async (raw) => {
    mock.recognize.mockResolvedValue(raw);
    await expect(recognizeImageText('file:///image.jpg')).rejects.toThrow('Không tìm thấy');
  });
  it('does not start a canceled request', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(recognizeImageText('file:///image.jpg', controller.signal)).rejects.toThrow('Đã hủy');
    expect(mock.recognize).not.toHaveBeenCalled();
  });
  it('cancels native work and ignores its late result', async () => {
    let complete!: (text: string) => void;
    mock.recognize.mockImplementation(() => new Promise<string>((resolve) => { complete = resolve; }));
    const controller = new AbortController();
    const assertion = expect(recognizeImageText('file:///image.jpg', controller.signal)).rejects.toThrow('Đã hủy');
    controller.abort(); await assertion; complete('结果');
    expect(mock.cancel).toHaveBeenCalledTimes(1);
  });
  it('times out stalled OCR and releases the recognizer', async () => {
    vi.useFakeTimers(); mock.recognize.mockImplementation(() => new Promise(() => undefined));
    const assertion = expect(recognizeImageText('file:///image.jpg')).rejects.toThrow('quá lâu');
    await vi.advanceTimersByTimeAsync(15_000); await assertion;
    expect(mock.cancel).toHaveBeenCalledTimes(1);
  });
  it('does not expose native exception details', async () => {
    mock.recognize.mockRejectedValue(new Error('/private/user/path/provider failure'));
    await expect(recognizeImageText('file:///image.jpg')).rejects.toThrow('Không nhận diện được ảnh');
  });
});
