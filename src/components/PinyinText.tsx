import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { getToneNumber, toneColor } from '@/services/pinyin/pinyin';
import { useAppStore } from '@/stores/app-store';

export function PinyinText({ value, toneColors = true, visible, style, numberOfLines }: { value: string; toneColors?: boolean; /** Use for an exercise that explicitly needs to reveal pinyin. */ visible?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const settings = useAppStore((state) => state.settings);
  const shouldShow = visible ?? settings?.pinyinVisibility ?? true;
  const shouldColorTones = toneColors && (settings?.toneColorEnabled ?? true);
  if (!shouldShow) return null;
  const chunks = value.split(/(\s+|-)/);
  return <Text accessibilityLabel={`Pinyin ${value}`} numberOfLines={numberOfLines} style={[styles.base, style]}>
    {chunks.map((chunk, index) => <Text key={`${chunk}-${index}`} style={shouldColorTones && chunk.trim() ? { color: toneColor(getToneNumber(chunk)) } : undefined}>{chunk}</Text>)}
  </Text>;
}

const styles = StyleSheet.create({ base: { fontSize: 17, fontWeight: '600' } });
