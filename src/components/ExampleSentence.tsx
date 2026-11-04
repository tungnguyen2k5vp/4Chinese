import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { PinyinText } from '@/components/PinyinText';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { themedCard } from '@/constants/design';
import { useTheme } from '@/theme/ThemeProvider';
import type { Vocabulary } from '@/types/models';

export function ExampleSentence({ item }: { item: Pick<Vocabulary['examples'][number], 'chinese' | 'pinyin' | 'vietnamese'> }) {
  const theme = useTheme();
  const focused = useIsFocused();
  const [pinyin, setPinyin] = useState(true);
  const [meaning, setMeaning] = useState(true);
  return <View style={[themedCard(theme), { padding: 16, gap: 12 }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ flex: 1, fontSize: 22, lineHeight: 32, color: theme.textPrimary }}>{item.chinese}</Text>
      <AudioButton text={item.chinese} />
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {([['Pinyin', pinyin, () => setPinyin(value => !value)], ['Nghĩa', meaning, () => setMeaning(value => !value)]] as const).map(([label, shown, toggle]) =>
        <MotionPressable key={label} accessibilityLabel={`${shown ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()} câu ví dụ`}
          accessibilityState={{ expanded: shown }} onPress={toggle}
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, backgroundColor: shown ? theme.primarySoft : theme.background }}>
          <Text style={{ color: theme.primaryText, fontWeight: '700' }}>{shown ? 'Ẩn' : 'Hiện'} {label.toLowerCase()}</Text>
        </MotionPressable>)}
    </View>
    {pinyin || meaning ? <StudyTransition active={focused} turnKey={`${pinyin}-${meaning}`} effect="reveal" durationMs={180} style={{ gap: 8 }}>
      {pinyin ? <PinyinText value={item.pinyin} /> : null}
      {meaning ? <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>{item.vietnamese}</Text> : null}
    </StudyTransition> : <Text style={{ color: theme.textMuted, fontSize: 13 }}>Tự đọc hoặc nghe câu, rồi mở gợi ý để đối chiếu.</Text>}
  </View>;
}
