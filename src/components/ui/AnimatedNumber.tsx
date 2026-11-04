import { useLayoutEffect, useState } from 'react';
import { Animated, AppState, Easing, Text, type TextProps } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Displays committed values only; mounting never counts up from zero. */
export function AnimatedNumber({ value, suffix = '', ...props }: TextProps & { value: number; suffix?: string }) {
  const target = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const reduced = useReducedMotion();
  const [number] = useState(() => new Animated.Value(target));
  const [display, setDisplay] = useState(target);
  useLayoutEffect(() => {
    const listener = number.addListener(({ value }) => setDisplay(Math.round(value)));
    const settle = () => { number.stopAnimation(); number.setValue(target); };
    number.stopAnimation();
    if (reduced || (AppState.currentState && AppState.currentState !== 'active')) settle();
    else Animated.timing(number, { toValue: target, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false, isInteraction: false }).start();
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') settle(); });
    return () => { subscription.remove(); number.stopAnimation(); number.removeListener(listener); };
  }, [number, reduced, target]);
  return <Text {...props} accessible accessibilityLabel={`${target.toLocaleString('vi-VN')}${suffix}`}>{display.toLocaleString('vi-VN')}{suffix}</Text>;
}
