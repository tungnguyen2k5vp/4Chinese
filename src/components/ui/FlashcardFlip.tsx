import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, View, type ViewProps } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** A single mounted face: animation callbacks can only change presentation. */
export function FlashcardFlip({ revealed, turnKey, active = true, children, style, ...props }: Omit<ViewProps, 'children'> & {
  revealed: boolean; turnKey: string; active?: boolean; children: (back: boolean) => ReactNode;
}) {
  const reduced = useReducedMotion();
  const [rotation] = useState(() => new Animated.Value(revealed ? 1 : 0));
  const [back, setBack] = useState(revealed);
  const previousTurn = useRef(turnKey);
  const face = useRef(revealed);
  useLayoutEffect(() => {
    const show = (next: boolean) => {
      if (face.current !== next) { face.current = next; setBack(next); }
    };
    const listener = rotation.addListener(({ value }) => show(value >= 0.5));
    const settle = () => { rotation.stopAnimation(); rotation.setValue(revealed ? 1 : 0); show(revealed); };
    rotation.stopAnimation();
    if (!active || previousTurn.current !== turnKey || reduced || (AppState.currentState && AppState.currentState !== 'active')) settle();
    else Animated.timing(rotation, { toValue: revealed ? 1 : 0, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: true, isInteraction: false }).start();
    previousTurn.current = turnKey;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') settle(); });
    return () => { subscription.remove(); rotation.stopAnimation(); rotation.removeListener(listener); };
  }, [active, reduced, revealed, rotation, turnKey]);
  return <Animated.View {...props} style={[style, { transform: [{ perspective: 900 }, { rotateY: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]}>
    <View style={{ transform: [{ rotateY: back ? '180deg' : '0deg' }] }}>{children(back)}</View>
  </Animated.View>;
}
