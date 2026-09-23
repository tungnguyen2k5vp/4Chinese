import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { colors } from '@/constants/design';
import { initializeDatabase } from '@/db/database';

export default function RootLayout() {
  return <SQLiteProvider databaseName="hanzi30.db" onInit={initializeDatabase} useSuspense>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: colors.text, headerStyle: { backgroundColor: colors.background }, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="word/[id]" options={{ title: 'Chi tiết từ vựng', headerBackTitle: 'Kho từ' }} />
      <Stack.Screen name="learn/setup" options={{ title: 'Học từ mới' }} />
      <Stack.Screen name="learn/session" options={{ title: 'Buổi học', gestureEnabled: false }} />
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
