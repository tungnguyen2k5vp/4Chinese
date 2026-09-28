import { requireOptionalNativeModule } from 'expo-modules-core';

type NativeOcr = { recognizeImageText?: (uri: string) => Promise<string>; cancelImageText?: () => Promise<void> };
const module = requireOptionalNativeModule<NativeOcr>('DigitalInkRecognition');

export function isImageOcrAvailable(): boolean { return typeof module?.recognizeImageText === 'function'; }

export async function recognizeImageText(uri: string, signal?: AbortSignal): Promise<{ text: string; truncated: boolean }> {
  if (!isImageOcrAvailable()) throw new Error('Bản app này chưa hỗ trợ OCR. Bạn có thể dán văn bản thủ công.');
  if (!uri.startsWith('file://')) throw new Error('Hãy chọn một ảnh từ điện thoại.');
  if (signal?.aborted) throw new Error('Đã hủy OCR.');
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); };
    const fail = (message: string) => { if (!settled) { settled = true; cleanup(); reject(new Error(message)); } };
    const stopNative = () => { void module?.cancelImageText?.().catch(() => undefined); };
    const cancel = () => { stopNative(); fail('Đã hủy OCR.'); };
    const timeout = setTimeout(() => { stopNative(); fail('OCR phản hồi quá lâu. Hãy chọn ảnh rõ và nhỏ hơn.'); }, 15_000);
    signal?.addEventListener('abort', cancel, { once: true });
    let nativeRequest: Promise<string>;
    try { nativeRequest = Promise.resolve(module!.recognizeImageText!(uri)); }
    catch { fail('Không mở được OCR trên thiết bị. Hãy thử lại.'); return; }
    void nativeRequest.then((raw) => {
      if (settled) return;
      settled = true; cleanup();
      if (typeof raw !== 'string' || !raw.trim()) { reject(new Error('Không tìm thấy chữ trong ảnh. Hãy thử ảnh rõ hơn.')); return; }
      const characters = Array.from(raw.replace(/\r\n/g, '\n').trim());
      resolve({ text: characters.slice(0, 2000).join(''), truncated: characters.length > 2000 });
    }).catch(() => fail('Không nhận diện được ảnh. Hãy chọn ảnh dưới 15 MB và thử lại.'));
  });
}
