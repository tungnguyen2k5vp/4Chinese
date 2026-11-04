import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, Text, View } from 'react-native';

import { formatSessionClock, type QuickSessionSnapshot } from '@/services/learning/quick-session-clock';
import { useTheme } from '@/theme/ThemeProvider';

export function QuickSessionTimer({ minutes, clock, saving, saveError = false, onFinish }: {
  minutes: 3 | 5 | 10;
  clock: QuickSessionSnapshot;
  saving: boolean;
  saveError?: boolean;
  onFinish: () => void;
}) {
  const theme = useTheme();
  return <View testID="quick-session-timer" style={{ padding: 14, gap: 8, borderRadius: 18, backgroundColor: theme.primarySoft }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <Ionicons name="timer-outline" color={theme.primaryText} size={24} />
      <View style={{ flex: 1, minWidth: 130 }}>
        <Text style={{ color: theme.primaryText, fontSize: 12, fontWeight: '700' }}>Phiên {minutes} phút · còn lại</Text>
        <Text testID="quick-session-remaining" accessibilityLabel={`Còn ${Math.floor(clock.remainingSeconds / 60)} phút ${clock.remainingSeconds % 60} giây`} style={{ color: theme.textPrimary, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{formatSessionClock(clock.remainingSeconds)}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Kết thúc phiên học nhanh" disabled={saving} onPress={() => saveError ? Alert.alert('Câu trả lời chưa được lưu', 'Bạn có thể quay lại thử lưu. Nếu kết thúc, lượt chưa lưu sẽ không được tính.', [{ text: 'Quay lại', style: 'cancel' }, { text: 'Kết thúc', onPress: onFinish }]) : onFinish()} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, opacity: saving ? 0.5 : 1 }}>
        <Text style={{ color: theme.primaryText, fontWeight: '700' }}>Kết thúc</Text>
      </Pressable>
    </View>
    <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>{saveError ? 'Lượt này chưa lưu được. Câu trả lời được giữ để bạn thử lại.' : clock.expired ? 'Hết giờ · đang hoàn tất lượt lưu…' : 'Đồng hồ tự dừng khi rời màn hình hoặc đưa app xuống nền.'}</Text>
  </View>;
}
