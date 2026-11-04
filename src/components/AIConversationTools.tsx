import { requireOptionalNativeModule } from 'expo-modules-core';
import { useFocusEffect } from 'expo-router';
import type { ExpoSpeechRecognitionOptions, ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { stopChineseSpeech } from '@/services/audio/chinese-speech';
import { EnglishRecognitionSession as LocalRecognitionSession } from '@/services/english/recognition-session';
import { useTheme } from '@/theme/ThemeProvider';

type NativeSpeech = { isRecognitionAvailable(): boolean; supportsOnDeviceRecognition(): boolean;
  getPermissionsAsync(): Promise<{ granted: boolean }>; requestPermissionsAsync(): Promise<{ granted: boolean }>;
  start(options: ExpoSpeechRecognitionOptions): void; abort(): void;
  addListener(name: string, listener: (event: unknown) => void): { remove(): void } };
const native = requireOptionalNativeModule<NativeSpeech>('ExpoSpeechRecognition');

/** Offline transcript capture, with a separate explicit action to copy it into the AI draft. */
export function AIConversationTools({ disabled, reflex, onText }: { disabled: boolean; reflex: boolean; onText: (text: string) => void }) {
  const theme = useTheme(), [busy, setBusy] = useState(false), [transcript, setTranscript] = useState(''), [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState(0), [remaining, setRemaining] = useState<number | null>(null);
  const live = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null), engine = useRef<LocalRecognitionSession | null>(null);
  if (engine.current == null) engine.current = new LocalRecognitionSession({
    available: () => Platform.OS !== 'web' && !!native?.isRecognitionAvailable(),
    onDevice: () => !!native?.supportsOnDeviceRecognition(),
    permission: async () => !!((await native?.getPermissionsAsync())?.granted || (await native?.requestPermissionsAsync())?.granted),
    start: () => native?.start({ lang: 'zh-CN', requiresOnDeviceRecognition: true, continuous: false, interimResults: false, maxAlternatives: 1 }),
    abort: () => native?.abort(),
  });
  const stop = useCallback(() => { engine.current?.cancel(); if (timer.current) clearTimeout(timer.current); timer.current = null; setBusy(false); }, []);
  useFocusEffect(useCallback(() => {
    live.current = true;
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') { stop(); setDeadline(0); setRemaining(null); } });
    return () => { live.current = false; stop(); setDeadline(0); listener.remove(); };
  }, [stop]));
  useEffect(() => {
    if (!deadline) return;
    const update = () => { const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); setRemaining(seconds); if (!seconds) setDeadline(0); };
    update(); const tick = setInterval(update, 250); return () => clearInterval(tick);
  }, [deadline]);
  useEffect(() => {
    if (!native || Platform.OS === 'web') return;
    const result = native.addListener('result', raw => {
      const event = raw as ExpoSpeechRecognitionResultEvent;
      if (!live.current || !engine.current?.acceptsResults() || !event.isFinal) return;
      const text = event.results[0]?.transcript?.trim() ?? '';
      stop(); setTranscript(text.slice(0, 500)); setMessage(text.length > 500 ? 'Chỉ giữ 500 ký tự đầu. Kiểm tra trước khi dùng.' : 'Đã nhận chữ; chưa gửi AI. Nhận chữ không phải chấm phát âm.');
    });
    const end = native.addListener('end', () => { if (engine.current?.acceptsResults()) stop(); });
    const error = native.addListener('error', () => { if (live.current && engine.current?.acceptsResults()) { stop(); setMessage('Chưa nhận được tiếng Trung ngoại tuyến. Bạn có thể nhập hoặc dán transcript.'); } });
    return () => { result.remove(); end.remove(); error.remove(); };
  }, [stop]);
  const body = { color: theme.textSecondary, lineHeight: 22 };
  return <View style={{ gap: 10 }}>
    <Text style={body}>Micro chỉ dùng nhận chữ ngoại tuyến nếu thiết bị có model tiếng Trung; bản ghi âm không được gửi đến AI. Nghe mẫu bằng nút loa trên câu trả lời.</Text>
    <PrimaryButton label={busy ? 'Dừng nhận giọng nói' : 'Nhập bằng giọng nói'} variant="secondary" disabled={disabled} onPress={async () => {
      if (busy) { stop(); return; } setBusy(true); setMessage('');
      try {
        await stopChineseSpeech();
        if (!live.current || AppState.currentState !== 'active') { setBusy(false); return; }
        const status = await engine.current!.start();
        if (!live.current) return;
        if (status === 'STARTED') timer.current = setTimeout(() => { stop(); if (live.current) setMessage('Đã dừng micro sau 20 giây; bạn có thể thử lại.'); }, 20000);
        else { setBusy(false); setMessage(status === 'DENIED' ? 'Chưa được cấp quyền micro. Bạn vẫn có thể nhập câu.' : status === 'CANCELLED' ? 'Đã dừng yêu cầu micro khi ứng dụng đổi trạng thái. Bấm lại khi sẵn sàng.' : 'Chưa có nhận dạng tiếng Trung ngoại tuyến trong môi trường này; hãy nhập câu hoặc dán transcript.'); }
      } catch { if (live.current) { stop(); setMessage('Chưa mở được micro. Bạn vẫn có thể nhập câu; không có âm thanh được gửi lên AI.'); } }
    }} />
    {message ? <Text accessibilityLiveRegion="polite" style={body}>{message}</Text> : null}
    {transcript ? <><Text selectable style={{ ...body, color: theme.textPrimary }}>{transcript}</Text><PrimaryButton label="Đưa transcript vào ô soạn" variant="ghost" disabled={disabled || busy} onPress={() => onText(transcript)} /></> : null}
    {reflex ? <><PrimaryButton label="Bắt đầu lượt phản xạ 15 giây" variant="ghost" disabled={disabled || !!deadline} onPress={() => { setRemaining(15); setDeadline(Date.now() + 15000); }} />
      {remaining !== null ? <Text accessibilityLiveRegion="polite" style={body}>{remaining ? `Còn ${remaining} giây để tự nói/soạn câu.` : 'Hết 15 giây. Bạn vẫn có thể sửa câu rồi gửi; không tự nộp hoặc trừ điểm.'}</Text> : null}</> : null}
  </View>;
}
