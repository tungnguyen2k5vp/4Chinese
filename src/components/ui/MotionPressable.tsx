import { useEffect, useState, type ReactNode } from "react";
import { Animated, Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";

import { useMotionDisabled, useReducedMotion } from "@/hooks/use-reduced-motion";
import { playHaptic } from "@/services/feedback/feedback-service";
import { useAppStore } from "@/stores/app-store";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MotionPressable({ children, onPress, style, disabled, haptic = false, accessibilityLabel }: {
  children: ReactNode;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
  accessibilityLabel?: string;
}) {
  const reducedMotion = useReducedMotion();
  const motionDisabled = useMotionDisabled();
  const hapticEnabled = useAppStore((state) => state.settings?.hapticEnabled ?? false);
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reducedMotion || motionDisabled) {
      scale.stopAnimation();
      scale.setValue(1);
    }
    return () => scale.stopAnimation();
  }, [motionDisabled, reducedMotion, scale]);
  const animate = (toValue: number) => {
    if (reducedMotion || motionDisabled) return;
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 42, bounciness: 0 }).start();
  };

  return <AnimatedPressable style={[style, { transform: [{ scale }] }]}
      accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled}
      onPress={(event) => { if (haptic && hapticEnabled) void playHaptic("tap", hapticEnabled); onPress(event); }}
      onPressIn={() => animate(0.98)} onPressOut={() => animate(1)}>
      {children}
    </AnimatedPressable>;
}


