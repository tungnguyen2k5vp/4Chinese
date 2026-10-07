import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

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
    if (!active || reduced || disabled) { value.stopAnimation(); value.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([Animated.timing(value, { toValue: 1, duration: 1200, useNativeDriver: true }), Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true })]));
    animation.start(); return () => animation.stop();
  }, [active, disabled, reduced, value]);
  if (!active) return null;
  return <Animated.View pointerEvents="none" style={[styles.ring, { ...frame, borderColor: theme.primary, opacity: reduced || disabled ? 0.35 : value.interpolate({ inputRange: [0, 1], outputRange: [0.38, 0] }), transform: [{ scale: reduced || disabled ? maxScale : value.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale] }) }] }]} />;
}
const styles = StyleSheet.create({ ring: { position: 'absolute', borderWidth: 2 } });
