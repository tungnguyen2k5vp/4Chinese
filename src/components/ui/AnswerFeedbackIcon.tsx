import { useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Decorative feedback follows the existing answer state; it never scores or advances. */
export function AnswerFeedbackIcon({ correct, turnKey, active = true, size = 32 }: { correct: boolean; turnKey: string; active?: boolean; size?: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [draw] = useState(() => new Animated.Value(1));
  const previous = useRef<string | null>(null);
  useLayoutEffect(() => {
    const trigger = `${turnKey}:${correct}`;
    const changed = previous.current !== trigger;
    previous.current = trigger;
    let live = true;
    const settle = () => { live = false; draw.stopAnimation(); draw.setValue(1); };
    draw.stopAnimation(); draw.setValue(1);
    if (changed && active && !reduced && (AppState.currentState == null || AppState.currentState === 'active')) {
      void AccessibilityInfo.isReduceMotionEnabled().then(osReduced => {
        if (!live) return;
        if (osReduced) { settle(); return; }
        draw.setValue(0);
        // ponytail: one small SVG stroke uses the JS driver; use a UI-thread SVG animator if profiling shows contention.
        Animated.timing(draw, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: false, isInteraction: false }).start();
      }).catch(settle);
    }
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') settle(); });
    return () => { subscription.remove(); settle(); };
  }, [active, correct, draw, reduced, turnKey]);
  const ink = correct ? theme.success : theme.error;
  return <Animated.View testID={correct ? 'answer-correct-mark' : 'answer-retry-mark'}
    pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, transform: [{ scale: draw.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.85, 1.06, 1] }) }] }}>
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx="16" cy="16" r="14" fill={correct ? theme.successSoft : theme.errorSoft} />
      <AnimatedCircle testID="answer-ring-stroke" cx="16" cy="16" r="14" fill="none" stroke={ink} strokeWidth="1.5" rotation="-90" origin="16,16"
        strokeDasharray="88 88" strokeDashoffset={draw.interpolate({ inputRange: [0, 0.45, 1], outputRange: [88, 0, 0], extrapolate: 'clamp' })} />
      <AnimatedPath testID="answer-symbol-stroke" d={correct ? 'm9 16 5 5 9-10' : 'm11 11 10 10'} fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="22 22" strokeDashoffset={draw.interpolate({ inputRange: [0, 0.25, 0.85, 1], outputRange: [22, 22, 0, 0], extrapolate: 'clamp' })} />
      {!correct ? <AnimatedPath d="m21 11-10 10" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round"
        strokeDasharray="15 15" strokeDashoffset={draw.interpolate({ inputRange: [0, 0.5, 1], outputRange: [15, 15, 0], extrapolate: 'clamp' })} /> : null}
    </Svg>
  </Animated.View>;
}
