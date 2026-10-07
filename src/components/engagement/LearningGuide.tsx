import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radius } from '@/constants/design';
import { useTheme } from '@/theme/ThemeProvider';

export type LearningGuideState = 'idle' | 'happy' | 'encourage' | 'correct' | 'incorrectSupportive' | 'celebrate' | 'thinking' | 'emptyState';

const config: Record<LearningGuideState, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  idle: { icon: 'school-outline', label: 'Sẵn sàng học' }, happy: { icon: 'happy-outline', label: 'Tuyệt vời' }, encourage: { icon: 'sparkles-outline', label: 'Cố lên' }, correct: { icon: 'checkmark-circle-outline', label: 'Chính xác' }, incorrectSupportive: { icon: 'heart-outline', label: 'Thử lại nhé' }, celebrate: { icon: 'ribbon-outline', label: 'Chúc mừng' }, thinking: { icon: 'bulb-outline', label: 'Cùng suy nghĩ' }, emptyState: { icon: 'leaf-outline', label: 'Sẵn sàng khi bạn cần' },
};

/** Original neutral vector guide. Artwork can later be injected without changing callers. */
export function LearningGuide({ state = 'idle', size = 48 }: { state?: LearningGuideState; size?: number }) {
  const theme = useTheme();
  const item = config[state];
  return <View accessibilityLabel={item.label} accessible style={[styles.wrap, { width: size, height: size, borderRadius: Math.round(size / 2), backgroundColor: theme.primarySoft }]}><Ionicons name={item.icon} size={Math.round(size * 0.52)} color={theme.primaryText} /><Text style={[styles.mark, { color: theme.primaryText }]} aria-hidden>字</Text></View>;
}

const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderCurve: 'continuous' }, mark: { position: 'absolute', right: 5, bottom: 2, fontSize: 10, fontWeight: '900', opacity: 0.7, borderRadius: radius.pill } });
