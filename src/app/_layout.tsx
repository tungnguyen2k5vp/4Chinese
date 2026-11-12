import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter, type Href } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { DatabaseOwnershipGate } from '@/components/DatabaseOwnershipGate';
import { NavigationBackButton } from '@/components/NavigationBackButton';
import { StartupLoading } from '@/components/StartupRecovery';
import { CommunityPresence } from '@/components/community/Presence';
import { initializeWithHsk30Backup } from '@/db/hsk30-startup';
import { getSettings } from '@/db/repository';
import { SystemReducedMotionProvider } from '@/hooks/use-reduced-motion';
import { appStatusBarStyle } from '@/services/english/status-bar';
import { useLearningLanguage } from '@/services/languages/LanguageProvider';
import { LanguageRuntime } from '@/services/languages/LanguageRuntime';
import { DAILY_STUDY_REMINDER_KIND, syncDailyStudyReminder } from '@/services/notifications/daily-study-reminder';
import { useAppStore } from '@/stores/app-store';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

export { StartupErrorBoundary as ErrorBoundary, StartupLoading as SuspenseFallback } from '@/components/StartupRecovery';

function SettingsHydrator() {
  const db = useSQLiteContext();
  const setSettings = useAppStore((state) => state.setSettings);
  useEffect(() => {
    let live = true;
    void getSettings(db).then((settings) => {
      if (!live) return;
      setSettings(settings);
      void syncDailyStudyReminder(settings);
    });
    return () => { live = false; };
  }, [db, setSettings]);
  return null;
}

function AppNavigator() {
  const { preferences } = useLearningLanguage();
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const statusBarStyle = appStatusBarStyle(preferences.learningLanguage, theme.mode, pathname);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.kind === DAILY_STUDY_REMINDER_KIND) {
        router.push((preferences.learningLanguage === 'en' ? '/english/activity' : '/daily') as Href);
      }
    });
    return () => subscription.remove();
  }, [router, preferences.learningLanguage]);
  return <>
    <CommunityPresence />
    <StatusBar style={statusBarStyle} />
    <Stack screenOptions={{ statusBarStyle, headerBackVisible: false, headerLeft: () => <NavigationBackButton />, headerShadowVisible: false, headerTintColor: theme.textPrimary, headerStyle: { backgroundColor: theme.background }, headerTitleStyle: { color: theme.textPrimary }, contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {__DEV__ ? <Stack.Screen name="__qa" options={{ title: 'Visual QA', headerShown: false }} /> : null}
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="cloud/index" options={{ title: 'Sao lưu đám mây' }} />
      <Stack.Screen name="community/index" options={{ title: 'Cộng đồng' }} />
      <Stack.Screen name="community/account" options={{ title: 'Tài khoản 4Chinese' }} />
      <Stack.Screen name="community/post/[id]" options={{ title: 'Bài viết' }} />
      <Stack.Screen name="community/chat/[id]" options={{ title: 'Tin nhắn' }} />
      <Stack.Screen name="ai/index" options={{ title: '4Chinese AI' }} />
      <Stack.Screen name="ai/settings" options={{ title: 'Cài đặt AI' }} />
      <Stack.Screen name="ai/coach" options={{ title: 'Study Coach' }} />
      <Stack.Screen name="ai/editor" options={{ title: 'Biên tập nội dung nháp' }} />
      <Stack.Screen name="practice/index" options={{ title: 'Luyện tập' }} />
      <Stack.Screen name="practice/scenes" options={{ title: 'Tiếng Trung quanh mình' }} />
      <Stack.Screen name="practice/sentences" options={{ title: 'Ghép câu' }} />
      <Stack.Screen name="practice/challenges" options={{ title: 'Thử thách ngắn' }} />
      <Stack.Screen name="practice/missions" options={{ title: 'Nhiệm vụ trong cảnh' }} />
      <Stack.Screen name="practice/choice-stories" options={{ title: 'Truyện có lựa chọn' }} />
      <Stack.Screen name="practice/characters" options={{ title: 'Ghép thành phần Hán tự' }} />
      <Stack.Screen name="practice/reading-missions" options={{ title: 'Tìm thông tin thực tế' }} />
      <Stack.Screen name="memory/index" options={{ title: 'Củng cố trí nhớ', animation: 'none' }} />
      <Stack.Screen name="memory/words" options={{ title: 'Từ cần củng cố', animation: 'none' }} />
      <Stack.Screen name="memory/session" options={{ title: 'Luyện nhớ chủ động', animation: 'none' }} />
      <Stack.Screen name="memory/confusables" options={{ title: 'Phân biệt chữ', animation: 'none' }} />
      <Stack.Screen name="memory/structure" options={{ title: 'Cấu tạo chữ', animation: 'none' }} />
      <Stack.Screen name="library/index" options={{ title: 'Thư viện' }} />
      <Stack.Screen name="listening/index" options={{ title: 'Luyện nghe' }} />
      <Stack.Screen name="exam/index" options={{ title: 'Trung tâm luyện thi' }} />
      <Stack.Screen name="exam/setup" options={{ title: 'Thiết lập bài luyện' }} />
      <Stack.Screen name="exam/history" options={{ title: 'Lịch sử bài luyện' }} />
      <Stack.Screen name="hsk/syllabus" options={{ title: 'Danh mục HSK 3.0' }} />
      <Stack.Screen name="exam/readiness" options={{ title: 'Mức độ chuẩn bị' }} />
      <Stack.Screen name="exam/session" options={{ title: 'Bài luyện', gestureEnabled: false, animation: 'none' }} />
      <Stack.Screen name="exam/result" options={{ title: 'Kết quả bài luyện', animation: 'none' }} />
      <Stack.Screen name="exam/skills" options={{ title: 'Luyện viết và dịch' }} />
      <Stack.Screen name="exam/written" options={{ title: 'Bài viết' }} />
      <Stack.Screen name="exam/speaking" options={{ title: 'Luyện nói có thời gian' }} />
      <Stack.Screen name="path/index" options={{ title: 'Lộ trình học' }} />
      <Stack.Screen name="path/[courseId]" options={{ title: 'Khóa học' }} />
      <Stack.Screen name="path/lesson/[lessonId]" options={{ title: 'Bài học' }} />
      <Stack.Screen name="grammar/index" options={{ title: 'Ngữ pháp' }} />
      <Stack.Screen name="grammar/focus" options={{ title: 'Ôn ngắn theo lỗi' }} />
      <Stack.Screen name="confusables/index" options={{ title: 'Từ dễ nhầm' }} />
      <Stack.Screen name="confusables/[id]" options={{ title: 'Phân biệt theo ngữ cảnh' }} />
      <Stack.Screen name="grammar/[id]" options={{ title: 'Cấu trúc' }} />
      <Stack.Screen name="stories/index" options={{ title: 'Truyện ngắn' }} />
      <Stack.Screen name="stories/[id]" options={{ title: 'Đọc truyện' }} />
      <Stack.Screen name="speaking/index" options={{ title: 'Nghe & nói' }} />
      <Stack.Screen name="speaking/ai" options={{ title: 'Luyện nói với AI' }} />
      <Stack.Screen name="speaking/tones" options={{ title: 'Thanh điệu' }} />
      <Stack.Screen name="speaking/pairs" options={{ title: 'Phân biệt âm dễ nhầm' }} />
      <Stack.Screen name="speaking/shadowing" options={{ title: 'Shadowing' }} />
      <Stack.Screen name="speaking/recordings" options={{ title: 'Bản ghi tại máy' }} />
      <Stack.Screen name="mistakes/index" options={{ title: 'Sổ lỗi' }} />
      <Stack.Screen name="achievements/index" options={{ title: 'Thành tích & mục tiêu' }} />
      <Stack.Screen name="mistakes/practice" options={{ title: 'Củng cố lỗi' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="english" options={{ headerShown: false }} />
      <Stack.Screen name="word/[id]" options={{ title: 'Chi tiết từ vựng', headerBackTitle: 'Kho từ' }} />
      <Stack.Screen name="stats/words" options={{ title: 'Chi tiết thống kê' }} />
      <Stack.Screen name="search" options={{ title: 'Tìm trong ứng dụng' }} />
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
  </>;
}

export default function RootLayout() {
  return <SystemReducedMotionProvider><DatabaseOwnershipGate><Suspense fallback={<StartupLoading />}><SQLiteProvider databaseName="hanzi30.db" onInit={initializeWithHsk30Backup} useSuspense>
    <ThemeProvider><LanguageRuntime><SettingsHydrator /><AppNavigator /></LanguageRuntime></ThemeProvider>
  </SQLiteProvider></Suspense></DatabaseOwnershipGate></SystemReducedMotionProvider>;
}
