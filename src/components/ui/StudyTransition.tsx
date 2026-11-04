import { useLayoutEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, type ViewProps } from "react-native";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Presentation only: changing a turn never waits for this animation. */
export function StudyTransition({ turnKey, active = true, animateOnMount = false, effect = 'slide', delayMs = 0, durationMs, style, ...props }: ViewProps & { turnKey: string; active?: boolean; animateOnMount?: boolean; effect?: 'slide' | 'reveal' | 'success' | 'error' | 'bounce' | 'stamp'; delayMs?: number; durationMs?: number }) {
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(1));
  const previous = useRef<string | null>(animateOnMount ? null : turnKey);

  useLayoutEffect(() => {
    const changed = previous.current !== turnKey;
    previous.current = turnKey;
    const reset = () => { value.stopAnimation(); value.setValue(1); };
    reset();
    if (changed && active && !reduced && (AppState.currentState == null || AppState.currentState === "active")) {
      value.setValue(0);
      // ponytail: stagger only short hub groups, capped at 120 ms; use viewport-driven entry for long lists.
      Animated.timing(value, { toValue: 1, duration: durationMs ?? (effect === 'error' ? 320 : 280), delay: Math.max(0, Math.min(120, delayMs)), easing: effect === 'success' || effect === 'error' ? Easing.linear : Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }).start();
    }
    const subscription = AppState.addEventListener("change", (state) => { if (state !== "active") reset(); });
    return () => { subscription.remove(); value.stopAnimation(); };
  }, [active, delayMs, durationMs, effect, reduced, turnKey, value]);

  const transform = effect === 'stamp'
    ? [{ scale: value.interpolate({ inputRange: [0, 0.55, 0.8, 1], outputRange: [0.45, 1.18, 0.96, 1] }) }, { rotate: value.interpolate({ inputRange: [0, 0.65, 1], outputRange: ['-18deg', '4deg', '0deg'] }) }]
    : effect === 'bounce'
    ? [{ translateY: value.interpolate({ inputRange: [0, 0.45, 0.75, 1], outputRange: [0, -6, 1, 0] }) }, { scale: value.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1.16, 1] }) }]
    : effect === 'success'
    ? [{ scale: value.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.94, 1.035, 1] }) }]
    : effect === 'error'
      ? [{ translateX: value.interpolate({ inputRange: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1], outputRange: [0, -5, 5, -4, 3, -2, 0] }) }]
      : effect === 'reveal'
        ? [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
        : [{ translateX: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }];
  return <Animated.View {...props} style={[style, { opacity: effect === 'error' ? 1 : value.interpolate({ inputRange: [0, 1], outputRange: [effect === 'reveal' ? 0 : 0.7, 1] }), transform }]} />;
}
