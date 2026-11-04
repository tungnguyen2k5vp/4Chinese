import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** A teaching diagram of a tone contour, not a measured acoustic waveform. */
export function ToneContour({ tone, color, width = 54, height = 24, revealKey }: { tone: number; color: string; width?: number; height?: number; revealKey?: string }) {
  const clipId = `tone-${useId().replace(/:/g, '')}`;
  const reduced = useReducedMotion();
  const [reveal] = useState(() => new Animated.Value(54));
  const previous = useRef<string | null>(null);
  useLayoutEffect(() => {
    const settle = () => { reveal.stopAnimation(); reveal.setValue(54); };
    settle();
    if (revealKey === undefined) return;
    const token = `${tone}:${revealKey}`;
    const changed = previous.current !== token;
    previous.current = token;
    if (changed && !reduced && (AppState.currentState == null || AppState.currentState === 'active')) {
      reveal.setValue(0);
      Animated.timing(reveal, { toValue: 54, duration: 320, easing: Easing.linear, useNativeDriver: false, isInteraction: false }).start();
    }
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') settle(); });
    return () => { subscription.remove(); reveal.stopAnimation(); };
  }, [reduced, reveal, revealKey, tone]);
  const paths: Record<number, string> = {
    1: 'M4 15 C18 14 34 14 50 15',
    2: 'M4 19 C20 18 33 12 50 5',
    3: 'M4 8 C15 17 35 20 50 6',
    4: 'M4 5 C20 8 36 15 50 20',
    5: 'M4 13 C18 13 34 13 50 13',
  };
  return <Svg width={width} height={height} viewBox="0 0 54 24" accessibilityElementsHidden>
    <Defs><ClipPath id={clipId}><AnimatedRect testID="tone-reveal-mask" x={0} y={0} width={reveal} height={24} /></ClipPath></Defs>
    <Path d="M3 21H51" stroke={color} strokeOpacity={0.2} strokeWidth={1} />
    <Path d={paths[tone] ?? paths[5]} clipPath={`url(#${clipId})`} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeDasharray={tone === 5 ? '2 4' : undefined} />
  </Svg>;
}
