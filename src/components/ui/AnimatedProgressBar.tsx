import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useMotionDisabled, useReducedMotion } from "@/hooks/use-reduced-motion";

export function AnimatedProgressBar({ progress, color, trackColor, height = 8, style, accessibilityLabel }: {
  progress: number;
  color: string;
  trackColor: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const reducedMotion = useReducedMotion();
  const motionDisabled = useMotionDisabled();
  const [value] = useState(() => new Animated.Value(0));
  const clamped = Math.max(0, Math.min(1, progress));
  useEffect(() => {
    value.stopAnimation();
    if (reducedMotion || motionDisabled) {
      value.setValue(clamped);
      return;
    }
    const animation = Animated.timing(value, { toValue: clamped, duration: 360, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [clamped, motionDisabled, reducedMotion, value]);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
    accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    style={[styles.track, { height, backgroundColor: trackColor }, style]}>
    <Animated.View style={[styles.fill, { backgroundColor: color, width: value.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
  </View>;
}

const styles = StyleSheet.create({ track: { borderRadius: 999, overflow: "hidden" }, fill: { height: "100%", borderRadius: 999 } });

