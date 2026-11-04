import { useEffect, useState } from "react";
import { Animated, AppState, Easing, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { useMotionDisabled, useReducedMotion } from "@/hooks/use-reduced-motion";

export function AnimatedProgressBar({ progress, color, trackColor, height = 8, style, accessibilityLabel, accessibilityValue, testID, variant = 'plain', active = true }: {
  progress: number;
  color: string;
  trackColor: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  variant?: 'plain' | 'stream';
  active?: boolean;
} & Pick<ViewProps, 'accessibilityValue' | 'testID'>) {
  const reducedMotion = useReducedMotion();
  const motionDisabled = useMotionDisabled();
  const [value] = useState(() => new Animated.Value(0));
  const clamped = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const semanticValue = accessibilityValue ?? { min: 0, max: 100, now: Math.round(clamped * 100) };
  useEffect(() => {
    value.stopAnimation();
    if (!active || reducedMotion || motionDisabled || (AppState.currentState != null && AppState.currentState !== "active")) {
      value.setValue(clamped);
      return;
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") { value.stopAnimation(); value.setValue(clamped); }
    });
    const animation = Animated.timing(value, { toValue: clamped, duration: 360, useNativeDriver: false, isInteraction: false });
    animation.start();
    return () => { subscription.remove(); animation.stop(); };
  }, [active, clamped, motionDisabled, reducedMotion, value]);
  if (variant === 'stream') return <StreamTrack value={value} active={active && !reducedMotion && !motionDisabled} color={color} trackColor={trackColor} height={height} style={style}
    testID={testID} accessibilityLabel={accessibilityLabel} accessibilityValue={semanticValue} />;
  return <View testID={testID} accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}
    accessibilityValue={semanticValue}
    aria-valuemin={semanticValue.min} aria-valuemax={semanticValue.max} aria-valuenow={semanticValue.now}
    style={[styles.track, { height, backgroundColor: trackColor }, style]}>
    <Animated.View style={[styles.fill, { backgroundColor: color, width: value.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
  </View>;
}

/** Decorative stream and original fish follow the same value as the actual fill. */
function StreamTrack({ value, active, color, trackColor, height, style, ...props }: {
  value: Animated.Value; active: boolean; color: string; trackColor: string; height: number; style?: StyleProp<ViewStyle>;
} & Pick<ViewProps, 'accessibilityLabel' | 'accessibilityValue' | 'testID'>) {
  const [width, setWidth] = useState(0);
  const [flow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(flow, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    const stop = () => { animation.stop(); flow.setValue(0); };
    const start = () => { if (active && (AppState.currentState == null || AppState.currentState === 'active')) animation.start(); };
    stop(); start();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') start(); else stop(); });
    return () => { subscription.remove(); stop(); };
  }, [active, flow]);
  // ponytail: repeat one 56 dp SVG tile with a native transform; no per-frame React state or fluid simulation.
  const tiles = Array.from({ length: Math.ceil((width + 112) / 56) }, (_, i) => i * 56);
  const ripple = tiles.map(x => `M${x} 4 Q${x + 14} -1 ${x + 28} 4 T${x + 56} 4`).join(' ');
  return <View {...props} accessible accessibilityRole="progressbar" aria-valuemin={props.accessibilityValue?.min} aria-valuemax={props.accessibilityValue?.max} aria-valuenow={props.accessibilityValue?.now}
    onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)} style={[style, { height: height + 28, backgroundColor: 'transparent', overflow: 'visible', minWidth: 0 }]}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.track, { position: 'absolute', bottom: 0, left: 0, right: 0, height, backgroundColor: trackColor }]}>
      <Animated.View testID="stream-progress-fill" style={[styles.fill, { backgroundColor: color, width: value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      <Animated.View testID="stream-current" style={{ position: 'absolute', top: 0, left: -56, width: width + 112, height, transform: [{ translateX: flow.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }) }] }}>
        <Svg width={width + 112} height={height}>
          <Path d={ripple} fill="none" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.5} />
          {tiles.map(x => <Path key={x} d={`M${x + 8} ${height - 3}h14m16 0h6`} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.2} strokeLinecap="round" />)}
        </Svg>
      </Animated.View>
    </View>
    <Animated.View testID="stream-fish-position" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 1, left: 0, width: 36, height: 24, transform: [{ translateX: Animated.multiply(value, Math.max(0, width - 36)) }] }}>
      <Animated.View testID="stream-fish-swim" style={{ width: 36, height: 24, transform: [{ translateY: flow.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -1.5, 0, 1.5, 0] }) }] }}>
        <Animated.View testID="stream-fish-tail" style={{ position: 'absolute', left: 0, top: 2, width: 13, height: 20,
          transform: [{ rotate: flow.interpolate({ inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1], outputRange: ['-12deg', '12deg', '-12deg', '12deg', '-12deg', '12deg', '-12deg', '12deg', '-12deg'] }) }] }}>
          <Svg width={13} height={20} viewBox="0 0 13 20"><Path d="M12 10 2 2Q-1 10 2 18Z" fill="#DB7756" /></Svg>
        </Animated.View>
        <Svg width={36} height={24} viewBox="0 0 36 24">
          <Path d="m17 7 4-5q4 0 5 6" fill="#DB7756" />
          <Ellipse cx={22} cy={12} rx={12} ry={8} fill="#F39B6D" />
          <Path d="M12 14q10 7 21-1-2 7-11 7-7 0-10-6" fill="#FFE6BE" />
          <Path d="m19 13 5 1-4 4Z" fill="#E17A56" />
          <Circle cx={29} cy={10} r={2} fill="#203F46" /><Circle cx={29.5} cy={9.5} r={0.6} fill="#FFFFFF" />
          <Path d="M25 8q-2 4 0 8" fill="none" stroke="#CE7256" strokeWidth={0.8} />
        </Svg>
      </Animated.View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({ track: { borderRadius: 999, overflow: "hidden" }, fill: { height: "100%", borderRadius: 999 } });

