import { HeaderShownContext } from 'expo-router/react-navigation';
import type { PropsWithChildren, ReactNode, RefObject } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing, typography, webLayout } from '@/constants/design';
import { useSystemReducedMotion } from '@/hooks/use-reduced-motion';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme/ThemeProvider';

const ENTRANCE_DURATION_MS = 180;
const ENTRANCE_OFFSET = 7;

export function Screen({ children, scroll = true, title, subtitle, right, refreshControl, scrollRef, onScroll, onViewportLayout, avoidKeyboard = false, hideHeader = false, hideTitle = false, safeAreaEdges = ['top'], compact = false, maxWidth }: PropsWithChildren<{
  scroll?: boolean; title?: string; subtitle?: string; right?: ReactNode; refreshControl?: ScrollViewProps['refreshControl'];
  scrollRef?: RefObject<ScrollView | null>; onScroll?: ScrollViewProps['onScroll']; onViewportLayout?: ScrollViewProps['onLayout']; avoidKeyboard?: boolean;
  hideHeader?: boolean; hideTitle?: boolean;
  safeAreaEdges?: Edge[]; compact?: boolean; maxWidth?: number;
}>) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const nativeHeaderShown = useContext(HeaderShownContext);
  const motionMode = useAppStore((state) => state.settings?.motionMode ?? null);
  const shouldAnimateOnMount = useRef(motionMode !== null);
  const hasResolvedEntrance = useRef(false);
  const systemReducedMotion = useSystemReducedMotion();
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

  const content = <Animated.View style={[styles.content, Platform.OS === 'web' && maxWidth ? { maxWidth } : null, compact && { paddingTop: spacing.sm, paddingBottom: 40, gap: spacing.md }, !scroll && { flex: 1, paddingBottom: spacing.md }, { opacity, transform: [{ translateY }] }]}>
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
  // The navigation header already owns the top inset. Apply it once, including on nested screens.
  return <SafeAreaView ref={safeRef} edges={nativeHeaderShown ? safeAreaEdges.filter(edge => edge !== 'top') : safeAreaEdges} style={[styles.safe, avoidKeyboard && Platform.OS === 'android' ? { paddingBottom: keyboardOverlap } : null]}>
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
