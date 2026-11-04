import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, Modal, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalVoiceRecorder } from '@/components/LocalVoiceRecorder';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useModalAnimationType } from '@/hooks/use-reduced-motion';
import { speakChinese, stopChineseSpeech } from '@/services/audio/chinese-speech';
import { useTheme } from '@/theme/ThemeProvider';

/** Rehearse the selected AI sentence using existing local audio, without grading or progress writes. */
export function AIOralPractice({ text, onClose }: { text: string; onClose: () => void }) {
  const theme = useTheme(), animationType = useModalAnimationType();
  const [playing, setPlaying] = useState(false), [micBusy, setMicBusy] = useState(false), [message, setMessage] = useState('');
  const generation = useRef(0);
  const stop = useCallback(() => { generation.current++; setPlaying(false); void stopChineseSpeech().catch(() => undefined); }, []);
  useFocusEffect(useCallback(() => {
    stop();
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => { listener.remove(); stop(); };
  }, [stop]));
  const play = async () => {
    if (micBusy) return;
    if (playing) { stop(); return; }
    const token = ++generation.current, finish = () => { if (generation.current === token) setPlaying(false); };
    setPlaying(true); setMessage('');
    try {
      const result = await speakChinese(text, { rate: 0.7, onDone: finish, onStopped: finish, onError: finish });
      if (!result.ok && generation.current === token) { finish(); setMessage('Chưa đọc được câu mẫu. Kiểm tra giọng tiếng Trung trên thiết bị rồi thử lại.'); }
    } catch { if (generation.current === token) { finish(); setMessage('Chưa phát được câu mẫu. Bạn vẫn có thể đọc và tự ghi âm.'); } }
  };
  const body = { color: theme.textSecondary, fontSize: 16, lineHeight: 24 };
  return <Modal visible animationType={animationType} onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <PrimaryButton label="Quay lại câu trả lời AI" variant="ghost" onPress={onClose} />
        <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 23, fontWeight: '800' }}>Nghe → nói lại → tự đối chiếu</Text>
        <Text selectable style={{ ...body, color: theme.textPrimary, fontSize: 24, lineHeight: 36 }}>{text}</Text>
        <Text style={body}>Nghe mẫu chậm, tự nói rồi nghe lại bản ghi để so sánh. Câu do AI gợi ý vẫn cần đối chiếu. Đây là luyện nói, chưa phải đánh giá phát âm hoặc thanh điệu.</Text>
        <PrimaryButton label={playing ? 'Dừng câu mẫu' : 'Nghe chậm câu đang luyện'} disabled={micBusy} variant="secondary" onPress={() => void play()} />
        {message ? <Text accessibilityLiveRegion="polite" style={body}>{message}</Text> : null}
        <LocalVoiceRecorder playbackBlocked={playing} recordingBlocked={playing} onRecordingChange={setMicBusy} />
        <Text style={body}>Không gọi thêm AI, không gửi bản ghi hoặc ghi kết quả vào tiến độ học.</Text>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
