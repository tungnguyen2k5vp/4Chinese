import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { webLayout } from '@/constants/design';
import { useTheme } from '@/theme/ThemeProvider';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index: 'home', hsk: 'layers', vocabulary: 'library', stats: 'stats-chart', profile: 'person' };
const tabLabels: Record<string, string> = { index: 'Trang chủ', hsk: 'HSK', vocabulary: 'Kho từ', stats: 'Thống kê', profile: 'Tài khoản' };
const largeTextTabLabels: Record<string, string> = { index: 'Nhà', hsk: 'HSK', vocabulary: 'Kho từ', stats: 'Số liệu', profile: 'Cá nhân' };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const theme = useTheme();
  const bottomInset = Math.max(insets.bottom, 8);
  const largeText = fontScale >= 1.4;
  const tabLabelFontSize = largeText ? Math.max(8.5, Math.min(10, 15 / fontScale)) : 10;
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: theme.primaryText, tabBarInactiveTintColor: theme.textMuted,
    tabBarLabel: largeText ? largeTextTabLabels[route.name] : tabLabels[route.name],
    tabBarAccessibilityLabel: tabLabels[route.name],
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
    <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} /><Tabs.Screen name="hsk" options={{ title: 'HSK' }} />
    <Tabs.Screen name="vocabulary" options={{ title: 'Kho từ' }} /><Tabs.Screen name="stats" options={{ title: 'Thống kê' }} />
    <Tabs.Screen name="profile" options={{ title: 'Tài khoản' }} />
  </Tabs>;
}
