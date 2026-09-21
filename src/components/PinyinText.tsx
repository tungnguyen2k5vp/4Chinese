import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { getToneNumber, toneColor } from '@/services/pinyin/pinyin';

export function PinyinText({ value, toneColors = true, style, numberOfLines }: { value: string; toneColors?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const chunks = value.split(/(\s+|-)/);
  return <Text accessibilityLabel={`Pinyin ${value}`} numberOfLines={numberOfLines} style={[styles.base, style]}>
    {chunks.map((chunk, index) => <Text key={`${chunk}-${index}`} style={toneColors && chunk.trim() ? { color: toneColor(getToneNumber(chunk)) } : undefined}>{chunk}</Text>)}
  </Text>;
}

const styles = StyleSheet.create({ base: { fontSize: 17, fontWeight: '600' } });
