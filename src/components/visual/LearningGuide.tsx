import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { MotionPressable } from '@/components/ui/MotionPressable';
import { StudyTransition } from '@/components/ui/StudyTransition';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/theme/ThemeProvider';

export type GuideMood = 'welcome' | 'curious' | 'celebrate' | 'reading' | 'encourage';

/** Original layered artwork. Only a genuine completion can select the celebration mood. */
export function LearningGuide({ mood = 'welcome', size = 64, active = true, interactive = false, autoPlay = true }: { mood?: GuideMood; size?: number; active?: boolean; interactive?: boolean; autoPlay?: boolean }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const [greeting, setGreeting] = useState(0);
  const lastTrigger = useRef('');
  const [motion] = useState(() => new Animated.Value(1));
  const scene = mood === 'celebrate' ? 'celebration' : mood === 'reading' ? 'reading' : 'learning';
  const pose = mood === 'celebrate' || mood === 'reading' ? mood : greeting && greeting % 3 === 0 ? 'highfive' : greeting % 3 === 2 ? 'nod' : mood;
  const celebrating = mood === 'celebrate';
  const skin = '#F6C3A7';
  const hair = '#253F49';
  const shirt = theme.mode === 'dark' ? '#73CDB3' : '#398C79';

  useEffect(() => {
    const trigger = `${mood}:${greeting}`;
    const changed = lastTrigger.current !== trigger;
    let live = true;
    const settle = () => { live = false; motion.stopAnimation(); motion.setValue(1); };
    motion.stopAnimation(); motion.setValue(1);
    if (changed && (autoPlay || greeting > 0) && active && focused && !reduced) {
      void AccessibilityInfo.isReduceMotionEnabled().then(osReduced => {
        if (!live) return;
        lastTrigger.current = trigger;
        if (osReduced || (AppState.currentState && AppState.currentState !== 'active')) return;
        motion.setValue(0);
        // ponytail: one finite gesture with two blinks; use authored rig assets if more poses are needed.
        Animated.timing(motion, { toValue: 1, duration: pose === 'nod' ? 900 : 1600, easing: Easing.linear, useNativeDriver: true, isInteraction: false }).start();
      }).catch(() => undefined);
    } else lastTrigger.current = trigger;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') settle(); });
    return () => { subscription.remove(); settle(); };
  }, [active, autoPlay, focused, greeting, mood, motion, pose, reduced]);

  const palette = [theme.accent, theme.skillColors.hanzi, theme.skillColors.listening, theme.skillColors.reading];
  const illustration = <View testID="learning-guide" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    {celebrating && !reduced && active && focused ? Array.from({ length: 20 }, (_, index) => {
      const angle = (index % 10) * Math.PI / 5;
      const radius = size * 0.3;
      return <Animated.View key={index} testID={`celebration-spark-${index}`} style={{
        position: 'absolute', left: size * (index < 10 ? 0.2 : 0.8), top: size * 0.2,
        width: size * 0.025, height: size * (index % 2 ? 0.055 : 0.025), borderRadius: 3,
        backgroundColor: palette[index % palette.length],
        opacity: motion.interpolate({ inputRange: [0, 0.08, 0.55, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * radius] }) },
          { translateY: motion.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0, Math.sin(angle) * radius, Math.sin(angle) * radius + size * 0.12] }) },
          { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: [`${angle}rad`, `${angle + Math.PI * 2}rad`] }) },
          { scale: motion.interpolate({ inputRange: [0, 0.15, 0.65, 1], outputRange: [0.2, 1, 1, 0.3] }) },
        ],
      }} />;
    }) : null}
    {celebrating && !reduced && active && focused ? [0.12, 0.72].map((left, index) => <Animated.View key={left} testID={`celebration-ring-${index}`} style={{
      position: 'absolute', left: size * left, top: size * 0.13, width: size * 0.18, height: size * 0.18,
      borderRadius: size, borderWidth: 2, borderColor: palette[index],
      opacity: motion.interpolate({ inputRange: [0, 0.08, 0.32, 1], outputRange: [0, 0.8, 0, 0] }),
      transform: [{ scale: motion.interpolate({ inputRange: [0, 0.32, 1], outputRange: [0.1, 2.1, 2.1] }) }],
    }} />) : null}
    <View testID={`guide-artwork-${scene}`}>
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path d="M29 92C21 45 68 21 109 28c53 7 75 43 66 90-7 41-37 68-82 64-48-4-76-44-64-90Z" fill={theme.skillSurfaces.reading} />
      <Circle cx="35" cy="49" r="6" fill="#D5C6F1" /><Circle cx="172" cy="127" r="5" fill="#F2B48B" />
      <Path d="m151 35 3-8 3 8 8 3-8 3-3 8-3-8-8-3Z" fill={theme.accent} />
      <Ellipse cx="99" cy="186" rx="52" ry="6" fill={hair} opacity="0.09" />
    </Svg>
    <Animated.View testID="guide-body" style={[StyleSheet.absoluteFill, { transform: [
      { translateY: motion.interpolate({ inputRange: [0, 0.16, 0.32, 0.5, 1], outputRange: celebrating ? [0, -12, 0, -5, 0] : [0, -2, 0, 0, 0] }) },
    ] }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Path d="M63 123c7-13 21-19 37-19 21 0 36 7 42 24l8 43c-25 17-71 18-102-1Z" fill={shirt} />
        <Path d="M76 107q24 16 46 0l-10 26-12-9-12 9Z" fill="#FFF4E8" />
        <Path d="M88 123v17m24-17v17" fill="none" stroke="#FFF4E8" strokeWidth="3" strokeLinecap="round" />
        <Path d="M81 155q19 6 38 0v17H81Z" fill={hair} opacity="0.12" />
        <Path d="m64 127-12 28 16 8" fill="none" stroke={shirt} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
        <Rect x="90" y="91" width="21" height="24" rx="9" fill={skin} />
        <Path d="M91 97q10 8 19 0v7q-10 9-19-1Z" fill="#E7A287" />
      </Svg>
      <Animated.View testID="guide-head" style={[StyleSheet.absoluteFill, { transformOrigin: [size * 0.5, size * 0.5, 0], transform: [
        { rotate: motion.interpolate({ inputRange: [0, 0.18, 0.4, 0.64, 1], outputRange: pose === 'nod' || pose === 'curious' ? ['0deg', '-9deg', '7deg', '-3deg', '0deg'] : ['0deg', '-3deg', '2deg', '0deg', '0deg'] }) },
        { translateY: motion.interpolate({ inputRange: [0, 0.22, 0.45, 0.7, 1], outputRange: pose === 'nod' ? [0, 5, -2, 2, 0] : [0, 0, 0, 0, 0] }) },
      ] }]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Path d="M75 47C49 35 40 61 47 82c5 15 2 20-4 29 29 0 39-22 32-64Z" fill={hair} />
          <Path d="m66 49 8 8" stroke="#BCA5E6" strokeWidth="6" strokeLinecap="round" />
          <Path d="M65 64c-3-28 15-43 37-42 29 1 39 20 35 48l-5 19H68Z" fill={hair} />
          <Ellipse cx="100" cy="71" rx="31" ry="34" fill={skin} />
          <Ellipse cx="70" cy="76" rx="5" ry="7" fill={skin} /><Ellipse cx="130" cy="76" rx="5" ry="7" fill={skin} />
          <Path d="M67 66c-5-25 14-40 34-38 24 1 37 16 33 40-12-2-23-16-28-25-8 17-20 19-39 23Z" fill={hair} />
          <Path d="M83 69q5-3 10-1m15 0q5-2 10 1" fill="none" stroke={hair} strokeWidth="2.4" strokeLinecap="round" />
          <Ellipse cx="80" cy="84" rx="6" ry="3.5" fill="#E89182" opacity="0.65" /><Ellipse cx="120" cy="84" rx="6" ry="3.5" fill="#E89182" opacity="0.65" />
          {celebrating || pose === 'highfive' ? <Path d="M91 87q10 16 19 0Z" fill="#A44F49" /> : <Path d="M93 88q7 7 14-1" fill="none" stroke="#A44F49" strokeWidth="2.5" strokeLinecap="round" />}
          <Path d="m99 78-2 6h4" fill="none" stroke="#DB957C" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
        <Animated.View testID="guide-eyes" style={[StyleSheet.absoluteFill, { transformOrigin: [size * 0.5, size * 0.39, 0], transform: [
          { scaleY: motion.interpolate({ inputRange: [0, 0.12, 0.15, 0.18, 0.62, 0.65, 0.68, 1], outputRange: [1, 1, 0.08, 1, 1, 0.08, 1, 1] }) },
        ] }]}>
          <Svg width={size} height={size} viewBox="0 0 200 200">
            {celebrating || pose === 'highfive' ? <Path d="M84 78q5-7 10 0m14 0q5-7 10 0" fill="none" stroke={hair} strokeWidth="2.8" strokeLinecap="round" /> : <>
              <Ellipse cx="89" cy="77" rx="2.8" ry="3.6" fill={hair} /><Ellipse cx="113" cy="77" rx="2.8" ry="3.6" fill={hair} />
              <Circle cx="90" cy="76" r="0.8" fill="#FFFFFF" /><Circle cx="114" cy="76" r="0.8" fill="#FFFFFF" />
            </>}
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View testID="guide-book" style={[StyleSheet.absoluteFill, { transformOrigin: [size * 0.45, size * 0.8, 0], transform: [
        { rotate: motion.interpolate({ inputRange: [0, 0.25, 0.55, 1], outputRange: pose === 'reading' ? ['0deg', '-6deg', '3deg', '0deg'] : ['-7deg', '-10deg', '-7deg', '-7deg'] }) },
      ] }]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          {pose === 'reading' ? <>
            <Path d="M100 143q-19-11-39-5v35q21-5 39 5 18-10 39-5v-35q-20-6-39 5Z" fill="#FFF4E8" stroke="#8F79C3" strokeWidth="3" strokeLinejoin="round" />
            <Path d="M100 144v32m-29-28 17 3m-17 7 17 3m24-10 17-3m-17 13 17-3" fill="none" stroke="#BBA9DF" strokeWidth="2.5" strokeLinecap="round" />
            <Ellipse cx="61" cy="162" rx="6" ry="8" fill={skin} /><Ellipse cx="139" cy="162" rx="6" ry="8" fill={skin} />
          </> : <>
            <Rect x="57" y="135" width="37" height="43" rx="6" fill="#B8A4DF" /><Path d="M62 139v35m10-25h14m-14 8h10" stroke="#FFF4E8" strokeWidth="2.5" strokeLinecap="round" />
            <Path d="m83 136 0 12 4-3 4 3v-12Z" fill="#F3C67A" /><Ellipse cx="64" cy="161" rx="10" ry="6" fill={skin} />
          </>}
        </Svg>
      </Animated.View>
      {pose !== 'reading' ? <Animated.View testID="guide-wave" style={[StyleSheet.absoluteFill, { transformOrigin: [size * 0.66, size * 0.63, 0], transform: [
        { rotate: motion.interpolate({ inputRange: [0, 0.12, 0.26, 0.4, 0.54, 0.7, 1], outputRange: pose === 'nod' ? ['0deg', '0deg', '0deg', '0deg', '0deg', '0deg', '0deg'] : pose === 'highfive' ? ['0deg', '-24deg', '-24deg', '-13deg', '-18deg', '-5deg', '0deg'] : ['0deg', '-24deg', '15deg', '-21deg', '13deg', '-6deg', '0deg'] }) },
      ] }]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Path d="m132 127 20-18" stroke={shirt} strokeWidth="22" strokeLinecap="round" />
          <Path d="m152 109 11-27" stroke={skin} strokeWidth="13" strokeLinecap="round" />
          <Path d="m160 82-7-8m9 3-3-15m8 14 1-18m3 19 5-14m-2 18 9-9" fill="none" stroke={skin} strokeWidth="5" strokeLinecap="round" />
          <Ellipse cx="168" cy="82" rx="9" ry="11" fill={skin} />
        </Svg>
      </Animated.View> : null}
    </Animated.View>
    </View>
    {pose === 'highfive' && !reduced && active && focused ? <Animated.View testID="guide-highfive" style={{ position: 'absolute', right: size * 0.06, top: size * 0.2,
      opacity: motion.interpolate({ inputRange: [0, 0.12, 0.38, 0.6, 1], outputRange: [0, 1, 1, 0, 0] }),
      transform: [{ scale: motion.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 1.2] }) }],
    }}><Svg width={size * 0.2} height={size * 0.2} viewBox="0 0 32 32"><Path d="m16 1 3 10 10 5-10 3-3 12-4-12-11-3 11-5Z" fill={theme.accent} /></Svg></Animated.View> : null}
  </View>;
  if (!interactive) return illustration;
  const message = celebrating ? greeting ? 'Bạn làm tốt lắm!' : 'Chạm để ăn mừng' : greeting ? ['加油! Đập tay nào!', '你好! Cùng học nhé.', '慢慢来 · Từng chút một nhé.'][greeting % 3] : 'Chạm để chào';
  return <View style={{ width: Math.max(104, size), alignItems: 'center', gap: 4 }}>
    <MotionPressable accessibilityLabel={mood === 'celebrate' ? 'Chạm để ăn mừng hoàn thành' : 'Chạm chào bạn đồng hành'} disabled={!active || !focused} pressedScale={0.97} onPress={() => setGreeting(value => value + 1)}>{illustration}</MotionPressable>
    <StudyTransition active={active && focused} turnKey={String(greeting)} effect="reveal" durationMs={220} testID="guide-message" accessibilityLiveRegion="polite" style={{ alignSelf: 'stretch', padding: 6 }}>
      <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 17, textAlign: 'center', fontWeight: '600' }}>{message}</Text>
    </StudyTransition>
  </View>;
}
