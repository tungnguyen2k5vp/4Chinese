import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { listStories, type Story } from '@/db/stories';

export default function StoriesScreen() {
  const db = useSQLiteContext();
  const [stories, setStories] = useState<Story[]>([]);
  useFocusEffect(useCallback(() => {
    let live = true;
    void listStories(db).then((rows) => { if (live) setStories(rows); })
      .catch(() => { if (live) Alert.alert('Chưa tải được truyện', 'Vui lòng thử lại.'); });
    return () => { live = false; };
  }, [db]));
  return <Screen title="Truyện theo cấp độ" subtitle="Đọc, tra từ và kiểm tra đọc hiểu.">
    {stories.map((story) => <Pressable key={story.id} style={[card, styles.item]}
      accessibilityRole="button" onPress={() => router.push(`/reader?storyId=${story.id}` as Href)}>
      <Text style={styles.title}>{story.title}</Text>
      <Text style={styles.note}>{story.description}</Text>
      <Text style={styles.meta}>HSK {story.hsk_level} · {story.estimated_minutes} phút{story.best_score ? ' · Đã trả lời đúng' : ''}</Text>
    </Pressable>)}
  </Screen>;
}

const styles = StyleSheet.create({ item: { gap: spacing.sm },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  note: { color: colors.textMuted }, meta: { color: colors.primary, fontWeight: '700' } });
