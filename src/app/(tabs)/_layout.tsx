import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/design';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index: 'home', hsk: 'layers', vocabulary: 'library', stats: 'stats-chart', profile: 'person' };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted,
    tabBarHideOnKeyboard: true,
    tabBarStyle: { height: 60 + bottomInset, paddingTop: 7, paddingBottom: bottomInset, borderTopColor: colors.border, backgroundColor: colors.surface },
    tabBarItemStyle: { paddingVertical: 2 },
    tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: '800' }, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse'} color={color} size={size} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} /><Tabs.Screen name="hsk" options={{ title: 'HSK' }} />
    <Tabs.Screen name="vocabulary" options={{ title: 'Kho từ' }} /><Tabs.Screen name="stats" options={{ title: 'Thống kê' }} />
    <Tabs.Screen name="profile" options={{ title: 'Tài khoản' }} />
  </Tabs>;
}
