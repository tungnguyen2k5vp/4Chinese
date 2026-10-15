import { Ionicons } from '@expo/vector-icons';
import { Tabs, router, useSegments, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { webLayout } from '@/constants/design';
import { useLearningLanguage } from '@/services/languages/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index: 'home', hsk: 'layers', vocabulary: 'library', stats: 'stats-chart', profile: 'person', 'english-speaking': 'mic', explore: 'compass', entertainment: 'game-controller' };
const chineseLabels: Record<string, string> = { index: 'Trang chủ', hsk: 'HSK', vocabulary: 'Kho từ', stats: 'Thống kê', profile: 'Tài khoản' };
const englishLabels: Record<string, string> = { index: 'Trang chủ', vocabulary: 'Từ vựng', 'english-speaking': 'Nói', explore: 'Khám phá', entertainment: 'Giải trí' };
const largeTextChineseLabels: Record<string, string> = { index: 'Nhà', hsk: 'HSK', vocabulary: 'Kho từ', stats: 'Số liệu', profile: 'Cá nhân' };
const largeTextEnglishLabels: Record<string, string> = { index: 'Nhà', vocabulary: 'Từ vựng', 'english-speaking': 'Nói', explore: 'Khám phá', entertainment: 'Chơi' };

export default function TabsLayout() {
  const { preferences } = useLearningLanguage();
  const english = preferences.learningLanguage === 'en';
  const segments = useSegments();
  const activeRoute = segments[segments.length - 1];
  const hiddenEnglishRoute = ['hsk', 'stats', 'profile'].includes(activeRoute ?? '');
  const hiddenChineseRoute = ['english-speaking', 'explore', 'entertainment'].includes(activeRoute ?? '');
  const previousEnglish = useRef(english);
  useEffect(() => {
    if (previousEnglish.current === english) return;
    previousEnglish.current = english;
    if ((english && hiddenEnglishRoute) || (!english && hiddenChineseRoute)) router.replace('/(tabs)' as Href);
  }, [english, hiddenEnglishRoute, hiddenChineseRoute]);
  const labels = english ? englishLabels : chineseLabels;
  const compactLabels = english ? largeTextEnglishLabels : largeTextChineseLabels;
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const theme = useTheme();
  const bottomInset = Math.max(insets.bottom, 8);
  const largeText = fontScale >= 1.4;
  const tabLabelFontSize = largeText ? Math.max(8.5, Math.min(10, 15 / fontScale)) : 10;
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: theme.primaryText, tabBarInactiveTintColor: theme.textMuted,
    tabBarLabel: largeText ? compactLabels[route.name] : labels[route.name],
    tabBarAccessibilityLabel: labels[route.name],
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      height: 60 + bottomInset,
      paddingTop: 7,
      paddingBottom: bottomInset,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
      ...(Platform.OS === 'web' ? {
        width: '100%',
        maxWidth: webLayout.maxContentWidth,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderLeftColor: theme.border,
        borderRightColor: theme.border,
      } : {}),
    },
    tabBarItemStyle: { paddingVertical: 2 },
    tabBarLabelStyle: { fontSize: tabLabelFontSize, lineHeight: Math.round(tabLabelFontSize * 1.3), fontWeight: '800' }, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse'} color={color} size={size} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
    <Tabs.Screen name="hsk" options={{ title: english ? 'CEFR' : 'HSK', href: english ? null : undefined }} />
    <Tabs.Screen name="vocabulary" options={{ title: 'Từ vựng' }} />
    <Tabs.Screen name="stats" options={{ title: 'Thống kê', href: english ? null : undefined }} />
    <Tabs.Screen name="profile" options={{ title: 'Tài khoản', href: english ? null : undefined }} />
    <Tabs.Screen name="english-speaking" options={{ title: 'Nói', href: english ? undefined : null }} />
    <Tabs.Screen name="explore" options={{ title: 'Khám phá', href: english ? undefined : null }} />
    <Tabs.Screen name="entertainment" options={{ title: 'Giải trí', href: english ? undefined : null }} />
  </Tabs>;
}
