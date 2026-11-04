import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, StyleSheet } from 'react-native';

import { getPulseRingFrame, getPulseRingMaxScale } from './pulse-ring-layout';

import { useMotionDisabled, useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/theme/ThemeProvider';

export function PulseRing({ active, size = 40, containerWidth }: { active: boolean; size?: number; containerWidth: number }) {
  const reduced = useReducedMotion();
  const disabled = useMotionDisabled();
  const theme = useTheme();
  const [value] = useState(() => new Animated.Value(0));
  const frame = getPulseRingFrame(containerWidth, size);
  const maxScale = getPulseRingMaxScale(containerWidth, size);
  useEffect(() => {
    let live = true;
    const animation = Animated.loop(Animated.sequence([Animated.timing(value, { toValue: 1, duration: 1200, useNativeDriver: true, isInteraction: false }), Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true, isInteraction: false })]));
    const stop = () => { live = false; animation.stop(); value.setValue(0); };
    value.setValue(0);
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    if (active && !reduced && !disabled) void AccessibilityInfo.isReduceMotionEnabled().then(osReduced => {
      if (live && !osReduced && (AppState.currentState == null || AppState.currentState === 'active')) animation.start();
    }).catch(() => undefined);
    return () => { subscription.remove(); stop(); };
  }, [active, disabled, reduced, value]);
  if (!active) return null;
  return <Animated.View testID="audio-pulse-ring" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.ring, { ...frame, borderColor: theme.primaryText, opacity: reduced || disabled ? 0.35 : value.interpolate({ inputRange: [0, 1], outputRange: [0.38, 0] }), transform: [{ scale: reduced || disabled ? maxScale : value.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale] }) }] }]} />;
}
const styles = StyleSheet.create({ ring: { position: 'absolute', borderWidth: 2 } });
