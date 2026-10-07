import type { ExpoSpeechRecognitionErrorEvent } from 'expo-speech-recognition';

/** Turns platform recognizer errors into a short, actionable Vietnamese hint. */
export function speechRecognitionFailureMessage(
  error: Pick<ExpoSpeechRecognitionErrorEvent, 'error'>,
): string | null {
  switch (error.error) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'Hãy cho phép Micro cho 4Chinese trong Cài đặt rồi thử lại.';
    case 'language-not-supported':
    case 'service-not-allowed':
      return 'Thiết bị chưa bật nhận diện tiếng Trung. Hãy bật Nhập bằng giọng nói của Google và tải tiếng Trung (Giản thể).';
    case 'network':
      return 'Không kết nối được dịch vụ nhận diện. Kiểm tra mạng rồi thử lại.';
    case 'audio-capture':
      return 'Không thu được âm thanh. Kiểm tra Micro không bị ứng dụng khác sử dụng.';
    case 'busy':
      return 'Dịch vụ nhận diện đang bận. Đợi một chút rồi chạm Nói lại.';
    case 'interrupted':
      return 'Nhận diện bị gián đoạn. Hãy thử lại.';
    case 'no-speech':
    case 'speech-timeout':
      return 'Chưa nghe rõ. Hãy chạm Nói rồi đọc chậm một lần nữa.';
    default:
      return 'Chưa thể nhận diện giọng nói. Hãy thử lại.';
  }
}
