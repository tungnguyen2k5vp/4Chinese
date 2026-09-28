import { Stack } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { colors } from '@/constants/design';
import { initializeDatabase } from '@/db/database';
import { getSettings } from '@/db/repository';
import { useAppStore } from '@/stores/app-store';

function SettingsHydrator() {
  const db = useSQLiteContext();
  const setSettings = useAppStore((state) => state.setSettings);
  useEffect(() => {
    let live = true;
    void getSettings(db).then((settings) => {
      if (live) setSettings(settings);
    });
    return () => {
      live = false;
    };
  }, [db, setSettings]);
  return null;
}

export default function RootLayout() {
  return <SQLiteProvider databaseName="hanzi30.db" onInit={initializeDatabase} useSuspense>
    <SettingsHydrator />
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: colors.text, headerStyle: { backgroundColor: colors.background }, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="cloud/index" options={{ title: 'Sao lưu đám mây' }} />
      <Stack.Screen name="path/index" options={{ title: 'Lộ trình học' }} />
      <Stack.Screen name="path/[courseId]" options={{ title: 'Khóa học' }} />
      <Stack.Screen name="path/lesson/[lessonId]" options={{ title: 'Bài học' }} />
      <Stack.Screen name="grammar/index" options={{ title: 'Ngữ pháp' }} />
      <Stack.Screen name="grammar/[id]" options={{ title: 'Cấu trúc' }} />
      <Stack.Screen name="stories/index" options={{ title: 'Truyện ngắn' }} />
      <Stack.Screen name="speaking/index" options={{ title: 'Nghe & nói' }} />
      <Stack.Screen name="speaking/tones" options={{ title: 'Thanh điệu' }} />
      <Stack.Screen name="speaking/shadowing" options={{ title: 'Shadowing' }} />
      <Stack.Screen name="mistakes/index" options={{ title: 'Sổ lỗi' }} />
      <Stack.Screen name="achievements/index" options={{ title: 'Thành tích & mục tiêu' }} />
      <Stack.Screen name="mistakes/practice" options={{ title: 'Củng cố lỗi' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="word/[id]" options={{ title: 'Chi tiết từ vựng', headerBackTitle: 'Kho từ' }} />
      <Stack.Screen name="learn/setup" options={{ title: 'Học từ mới' }} />
      <Stack.Screen name="learn/session" options={{ title: 'Buổi học', gestureEnabled: false }} />
      <Stack.Screen name="daily/index" options={{ title: 'Học hôm nay' }} />
      <Stack.Screen name="reader/index" options={{ title: 'Đọc & tra từ' }} />
      <Stack.Screen name="review/index" options={{ title: 'Ôn tập' }} />
      <Stack.Screen name="review/upcoming" options={{ title: 'Lịch ôn sắp tới' }} />
      <Stack.Screen name="review/session" options={{ title: 'Ôn tập', gestureEnabled: false }} />
      <Stack.Screen name="review/result" options={{ title: 'Kết quả', gestureEnabled: false }} />
      <Stack.Screen name="writing/index" options={{ title: 'Luyện viết' }} />
      <Stack.Screen name="writing/[character]" options={{ title: 'Luyện viết' }} />
      <Stack.Screen name="decks/index" options={{ title: 'Bộ từ riêng' }} />
      <Stack.Screen name="decks/[id]" options={{ title: 'Chi tiết bộ từ' }} />
      <Stack.Screen name="decks/word" options={{ title: 'Từ vựng cá nhân' }} />
      <Stack.Screen name="decks/bulk-add" options={{ title: 'Thêm từ hàng loạt' }} />
      <Stack.Screen name="decks/trash" options={{ title: 'Thùng rác bộ từ' }} />
      <Stack.Screen name="decks/listening" options={{ title: 'Luyện nghe' }} />
      <Stack.Screen name="decks/pronunciation" options={{ title: 'Luyện phát âm' }} />
      <Stack.Screen name="decks/quiz" options={{ title: 'Bài kiểm tra' }} />
      <Stack.Screen name="review/weak" options={{ title: 'Từ cần củng cố' }} />
    </Stack>
  </SQLiteProvider>;
}
