import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import { useRef } from 'react';

import { MotionPressable } from '@/components/ui/MotionPressable';
import { backFallback } from '@/services/app/back-navigation';
import { useTheme } from '@/theme/ThemeProvider';

export function NavigationBackButton() {
  const theme = useTheme();
  const pathname = usePathname();
  const lastPress = useRef(0);
  return <MotionPressable haptic accessibilityLabel="Quay lại" onPress={() => {
    const now = Date.now();
    if (now - lastPress.current < 350) return;
    lastPress.current = now;
    if (router.canGoBack()) router.back();
    else router.replace(backFallback(pathname) as Href);
  }} style={{ width: 44, height: 44, marginRight: 8, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primarySoft }}>
    <Ionicons name="arrow-back" size={24} color={theme.primaryText} />
  </MotionPressable>;
}
