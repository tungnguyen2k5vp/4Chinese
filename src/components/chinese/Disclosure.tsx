import { useIsFocused } from 'expo-router';
import { useLayoutEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { Animated, AppState, Easing, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/theme/ThemeProvider";

export function Disclosure({ title, children, initiallyOpen = false, expanded, onPress, trailing, style, testID }: PropsWithChildren<{
  title: string; initiallyOpen?: boolean; expanded?: boolean; onPress?: () => void; trailing?: ReactNode; style?: StyleProp<ViewStyle>; testID?: string;
}>) {
  const [localOpen, setOpen] = useState(initiallyOpen);
  const open = expanded ?? localOpen;
  const focused = useIsFocused();
  const [mounted, setMounted] = useState(open);
  const [height, setHeight] = useState(0);
  const [angle] = useState(() => new Animated.Value(open ? 1 : 0));
  const [reveal] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  if (open && !mounted) setMounted(true);
  else if (!open && mounted && (reduced || !focused)) setMounted(false);
  useLayoutEffect(() => {
    let live = true;
    const settle = () => {
      angle.stopAnimation(); reveal.stopAnimation();
      angle.setValue(open ? 1 : 0); reveal.setValue(open ? height : 0);
    };
    angle.stopAnimation(); reveal.stopAnimation();
    if (!focused || reduced || (AppState.currentState && AppState.currentState !== 'active')) settle();
    else Animated.parallel([
      Animated.timing(angle, { toValue: open ? 1 : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }),
      // ponytail: measure one open disclosure, never an entire list; height requires the JS driver.
      Animated.timing(reveal, { toValue: open ? height : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false, isInteraction: false }),
    ]).start(({ finished }) => { if (live && finished && !open) setMounted(false); });
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') { settle(); if (!open) setMounted(false); } });
    return () => { live = false; subscription.remove(); angle.stopAnimation(); reveal.stopAnimation(); };
  }, [angle, focused, height, open, reduced, reveal]);
  const theme = useTheme();
  return <View style={style}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open, disabled: expanded !== undefined && !onPress }} aria-expanded={open}
      disabled={expanded !== undefined && !onPress} onPress={onPress ?? (() => setOpen(value => !value))} style={{ flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
      <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 17, fontWeight: "700" }}>{title}</Text>
      <Animated.View testID="disclosure-chevron" accessible={false} style={{ transform: [{ rotate: angle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><Text style={{ color: theme.primaryText }}>⌄</Text></Animated.View>
    </Pressable>
    {trailing}
    </View>
    {mounted ? <Animated.View testID={testID} pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      aria-hidden={!open} style={{ height: reveal, overflow: 'hidden' }}>
      <View onLayout={({ nativeEvent: { layout } }) => setHeight(current => current === layout.height ? current : layout.height)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 8, paddingBottom: 8, gap: 8 }}>{children}</View>
    </Animated.View> : null}
  </View>;
}
