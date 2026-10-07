import type { PropsWithChildren, ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, typography, webLayout } from '@/constants/design';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme/ThemeProvider';

const ENTRANCE_DURATION_MS = 180;
const ENTRANCE_OFFSET = 7;

export function Screen({ children, scroll = true, title, subtitle, right, refreshControl, scrollRef, onScroll, onViewportLayout, avoidKeyboard = false, hideHeader = false, hideTitle = false }: PropsWithChildren<{
  scroll?: boolean; title?: string; subtitle?: string; right?: ReactNode; refreshControl?: ScrollViewProps['refreshControl'];
  scrollRef?: RefObject<ScrollView | null>; onScroll?: ScrollViewProps['onScroll']; onViewportLayout?: ScrollViewProps['onLayout']; avoidKeyboard?: boolean;
  hideHeader?: boolean; hideTitle?: boolean;
}>) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const motionMode = useAppStore((state) => state.settings?.motionMode ?? null);
  const shouldAnimateOnMount = useRef(motionMode !== null);
  const hasResolvedEntrance = useRef(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean | null>(null);
  const [opacity] = useState(() => new Animated.Value(1));
  const [translateY] = useState(() => new Animated.Value(0));
  const safeRef = useRef<View>(null);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);

  useEffect(() => {
    if (!avoidKeyboard || Platform.OS !== 'android') return;
    let active = true;
    const show = Keyboard.addListener('keyboardDidShow', event => {
      // Edge-to-edge Android may overlay the IME despite adjustResize. Reserve only
      // the overlap actually measured against the root, so resized windows do not double-pad.
      safeRef.current?.measureInWindow((_x, y, _width, height) => {
        if (active) setKeyboardOverlap(Math.max(0, Math.min(height, y + height - event.endCoordinates.screenY)));
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOverlap(0));
    return () => { active = false; show.remove(); hide.remove(); };
  }, [avoidKeyboard]);

  useEffect(() => {
    let active = true;
    let receivedChangeEvent = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      receivedChangeEvent = true;
      if (active) setSystemReducedMotion(enabled);
    });

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active && !receivedChangeEvent) setSystemReducedMotion(enabled);
    }).catch(() => {
      // If the OS preference cannot be read, favor showing content without motion.
      if (active && !receivedChangeEvent) setSystemReducedMotion(true);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (systemReducedMotion === null) return;

    const skipEntrance = !shouldAnimateOnMount.current || systemReducedMotion || motionMode !== 'full';
    if (skipEntrance) {
      opacity.stopAnimation();
      translateY.stopAnimation();
      opacity.setValue(1);
      translateY.setValue(0);
      hasResolvedEntrance.current = true;
      return;
    }

    if (hasResolvedEntrance.current) return;
    hasResolvedEntrance.current = true;
    opacity.setValue(0.9);
    translateY.setValue(ENTRANCE_OFFSET);
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ENTRANCE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ENTRANCE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [motionMode, opacity, systemReducedMotion, translateY]);

  const content = <Animated.View style={[styles.content, !scroll && { flex: 1, paddingBottom: spacing.md }, { opacity, transform: [{ translateY }] }]}>
    {!hideHeader && ((title && !hideTitle) || subtitle || right) && <View style={styles.header}><View style={styles.headerCopy}>
      {title && !hideTitle ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>{right}</View>}
    {children}
  </Animated.View>;
  const body = scroll ? <ScrollView style={{ flex: 1 }} ref={scrollRef} onScroll={onScroll} onLayout={onViewportLayout} scrollEventThrottle={16}
    keyboardShouldPersistTaps={avoidKeyboard ? 'handled' : 'never'}
    keyboardDismissMode={avoidKeyboard ? 'on-drag' : 'none'}
    contentInsetAdjustmentBehavior="automatic" refreshControl={refreshControl} showsVerticalScrollIndicator={false}>{content}</ScrollView> : content;
  return <SafeAreaView ref={safeRef} edges={['top']} style={[styles.safe, avoidKeyboard && Platform.OS === 'android' ? { paddingBottom: keyboardOverlap } : null]}>
    {avoidKeyboard && Platform.OS === 'ios' ? <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">{body}</KeyboardAvoidingView> : body}
  </SafeAreaView>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  content: {
    flexGrow: 1,
    width: '100%',
    minWidth: 0,
    paddingHorizontal: Platform.OS === 'web' ? spacing.xl : spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
    ...(Platform.OS === 'web' ? {
      width: '100%',
      maxWidth: webLayout.maxContentWidth,
      alignSelf: 'center',
    } : {}),
  },
  header: { width: '100%', minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 }, title: { color: theme.textPrimary, fontSize: typography.title, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: theme.textMuted, fontSize: typography.body, lineHeight: 21 },
}); }
