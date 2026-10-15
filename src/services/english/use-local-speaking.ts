import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { EnglishRecognitionSession } from '@/services/english/recognition-session';

export function useLocalSpeaking() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');
  const [preparing, setPreparing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session = useRef<EnglishRecognitionSession | null>(null);
  if (session.current == null) session.current = new EnglishRecognitionSession({
    available: () => Platform.OS !== 'web' && ExpoSpeechRecognitionModule.isRecognitionAvailable(),
    onDevice: () => ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
    permission: async () => {
      const existing = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      return existing.granted || (await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted;
    },
    start: () => ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false, maxAlternatives: 1, requiresOnDeviceRecognition: true }),
    abort: () => ExpoSpeechRecognitionModule.abort(),
  });
  const cancel = useCallback(() => {
    session.current?.cancel();
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setListening(false);
    setPreparing(false);
    void Speech.stop();
  }, []);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); });
    return () => { focused.current = false; listener.remove(); cancel(); };
  }, [cancel]));
  useSpeechRecognitionEvent('result', event => {
    if (!session.current?.acceptsResults()) return;
    const result = event.results.at(-1)?.transcript?.trim();
    if (result) setTranscript(result);
  });
  useSpeechRecognitionEvent('end', () => {
    session.current?.ended(); setListening(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  });
  useSpeechRecognitionEvent('error', event => {
    session.current?.ended(); setListening(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (event.error !== 'aborted') setMessage(event.error === 'no-speech' ? 'Chưa nhận được lời nói. Bạn có thể nghe mẫu và thử lại.' : event.error === 'not-allowed' ? 'Chưa được cấp quyền microphone.' : 'Nhận dạng chưa khả dụng. Không có điểm phát âm được tạo.');
  });
  const start = async () => {
    setTranscript(''); setMessage(''); await Speech.stop();
    if (!focused.current || AppState.currentState !== 'active') return;
    setPreparing(true);
    try {
      const status = await session.current!.start();
      if (status === 'STARTED') {
        setListening(true);
        timer.current = setTimeout(() => { cancel(); setMessage('Đã dừng sau 20 giây. Nghe mẫu hoặc thử lại.'); }, 20000);
      } else if (status === 'CANCELLED' && focused.current && AppState.currentState === 'active') {
        setMessage(session.current!.permissionGranted === false ? 'Bạn chưa cấp quyền microphone. Vẫn có thể nghe và tự luyện.' : session.current!.permissionGranted === true ? 'Quyền microphone đã được cấp. Bấm Thử nói lượt này để bắt đầu; không tự bật microphone sau hộp xin quyền.' : 'Yêu cầu nhận dạng đã hủy khi trạng thái ứng dụng thay đổi. Bạn có thể tự luyện hoặc thử lại.');
      } else if (status !== 'CANCELLED' && status !== 'BUSY') setMessage(status === 'DENIED' ? 'Bạn chưa cấp quyền microphone. Vẫn có thể nghe và tự luyện.' : Platform.OS === 'web' ? 'Web không kiểm thử nhận dạng native. Bạn có thể tự nói rồi tiếp tục.' : 'Thiết bị chưa có mô hình nhận dạng tiếng Anh ngoại tuyến. Không gửi âm thanh lên mạng.');
    } catch { setMessage('Thiết bị chưa trả lời yêu cầu nhận dạng. Đã hủy an toàn; bạn có thể tự luyện hoặc thử lại.'); }
    finally { setPreparing(false); }
  };
  return { listening, preparing, transcript, message, start, cancel, clear: () => { cancel(); setTranscript(''); setMessage(''); } };
}
