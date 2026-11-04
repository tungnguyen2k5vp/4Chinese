import { useEffect, useState, type ReactNode } from "react";
import { Animated, AppState, Easing, Pressable, type AccessibilityRole, type AccessibilityState, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";

import { useMotionDisabled, useReducedMotion } from "@/hooks/use-reduced-motion";
import { playHaptic } from "@/services/feedback/feedback-service";
import { useAppStore } from "@/stores/app-store";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MotionPressable({ children, onPress, onPressIn, style, disabled, haptic = false, accessibilityLabel, accessibilityRole = 'button', accessibilityState, pressedScale = 0.98 }: {
  children: ReactNode;
  onPress: (event: GestureResponderEvent) => void;
  onPressIn?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  pressedScale?: 0.95 | 0.96 | 0.97 | 0.98;
}) {
  const reducedMotion = useReducedMotion();
  const motionDisabled = useMotionDisabled();
  const hapticEnabled = useAppStore((state) => state.settings?.hapticEnabled ?? false);
  const [scale] = useState(() => new Animated.Value(1));
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const reset = () => {
      scale.stopAnimation();
      scale.setValue(1);
    };
    if (disabled || reducedMotion || motionDisabled) reset();
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active") reset(); });
    return () => { subscription.remove(); scale.stopAnimation(); };
  }, [disabled, motionDisabled, reducedMotion, scale]);
  const animate = (toValue: number) => {
    if (disabled || reducedMotion || motionDisabled || (AppState.currentState != null && AppState.currentState !== "active")) return;
    scale.stopAnimation();
    Animated.timing(scale, { toValue, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start();
  };
  // Compensate for visual scaling so the original hit area stays available.
  const horizontal = Math.max(0, (Math.max(44, size.width) / pressedScale - size.width) / 2);
  const vertical = Math.max(0, (Math.max(44, size.height) / pressedScale - size.height) / 2);

  return <AnimatedPressable style={[style, { transform: [{ scale }] }]}
      accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }} disabled={disabled}
      aria-busy={accessibilityState?.busy}
      aria-checked={accessibilityState?.checked} aria-selected={accessibilityState?.selected}
      onLayout={({ nativeEvent: { layout } }) => setSize((previous) => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}
      hitSlop={{ left: horizontal, right: horizontal, top: vertical, bottom: vertical }}
      onPress={(event) => { if (disabled) return; if (haptic && hapticEnabled) void playHaptic("tap", hapticEnabled); onPress(event); }}
      onPressIn={() => { onPressIn?.(); animate(pressedScale); }} onPressOut={() => animate(1)}>
      {children}
    </AnimatedPressable>;
}


