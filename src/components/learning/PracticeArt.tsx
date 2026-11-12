import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, AppState, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { StudyTransition } from '@/components/ui/StudyTransition';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { SceneId } from '@/services/learning/interactive-content';
import { useTheme } from '@/theme/ThemeProvider';

/** Original vector artwork shared by exploration, sentence practice and results. */
export function PracticeArt({ scene, celebration = false, reaction = 'idle' }: { scene: SceneId; celebration?: boolean; reaction?: string }) {
  const t = useTheme(), dark = t.mode === 'dark';
  const mint = dark ? '#2F5D53' : '#C9E6D7', peach = dark ? '#69483C' : '#F7CBB0';
  const lavender = dark ? '#47395D' : '#DED2F1', cream = dark ? '#353830' : '#FBF0DA';
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 360 260" preserveAspectRatio="none">
      <Rect width="360" height="260" rx="24" fill={cream} />
      <Circle cx="302" cy="48" r="42" fill={peach} opacity="0.6" />
      <Path d="M0 206Q100 180 180 207T360 205V260H0Z" fill={mint} />
      {scene === 'cafe' ? <>
        <Rect x="102" y="20" width="132" height="104" rx="35" fill={lavender} />
        <Path d="M168 21V123M103 73H233" stroke={cream} strokeWidth="7" />
        <Rect x="18" y="165" width="224" height="15" rx="7" fill="#B78162" />
        <Path d="M40 180V240M222 180V240" stroke="#B78162" strokeWidth="12" strokeLinecap="round" />
        <Path d="M258 146H347V229H258Z" fill={peach} /><Rect x="251" y="137" width="103" height="14" rx="6" fill="#B78162" />
        <Path d="M15 0H345L334 26Q312 39 290 26Q269 39 247 26Q225 39 203 26Q181 39 159 26Q137 39 115 26Q93 39 71 26Q49 39 27 26Z" fill={mint} />
      </> : scene === 'station' ? <>
        <Rect x="22" y="80" width="232" height="120" rx="25" fill={lavender} />
        {[40, 99, 158].map(x => <Rect key={x} x={x} y="96" width="44" height="43" rx="12" fill={cream} />)}
        <Path d="M22 161H253" stroke={peach} strokeWidth="13" />
        <Circle cx="68" cy="201" r="15" fill="#647078" /><Circle cx="209" cy="201" r="15" fill="#647078" />
        <Path d="M0 225H360M0 236H360" stroke="#8A958F" strokeWidth="4" />
        <Rect x="271" y="35" width="68" height="42" rx="10" fill={mint} />
      </> : scene === 'market' ? <>
        <Path d="M22 49H331V175H22Z" fill={peach} opacity="0.45" />
        <Path d="M15 28H338L327 68Q307 83 286 68Q265 83 244 68Q223 83 202 68Q181 83 160 68Q139 83 118 68Q97 83 76 68Q55 83 34 68Z" fill={mint} />
        <Path d="M30 62V228M322 62V228" stroke="#B78162" strokeWidth="7" />
        <Rect x="20" y="158" width="277" height="70" rx="10" fill="#B78162" />
        {[33, 120, 207].map((x, i) => <G key={x}><Rect x={x} y="161" width="75" height="47" rx="7" fill={i === 1 ? lavender : cream} /><Path d={`M${x + 10} 179h55M${x + 10} 191h55`} stroke="#B78162" strokeWidth="3" opacity="0.4" /></G>)}
      </> : <>
        <Rect x="28" y="27" width="218" height="96" rx="14" fill={mint} stroke="#9EB7A3" strokeWidth="5" />
        <Path d="M110 50H219M110 68H203M47 104H226" stroke={cream} strokeWidth="5" strokeLinecap="round" />
        <Rect x="25" y="177" width="278" height="17" rx="7" fill="#B78162" />
        <Path d="M45 194V240M282 194V240" stroke="#B78162" strokeWidth="12" strokeLinecap="round" />
        <Rect x="277" y="89" width="55" height="43" rx="20" fill={peach} />
      </>}
      <G opacity="0.85"><Path d="M331 238V183" stroke="#74927B" strokeWidth="4" /><Ellipse cx="322" cy="199" rx="8" ry="16" fill="#82AD8C" transform="rotate(-35 322 199)" /><Ellipse cx="339" cy="184" rx="8" ry="16" fill="#82AD8C" transform="rotate(30 339 184)" /><Path d="M315 228H348L342 252H321Z" fill={peach} /></G>
      {celebration ? [0, 1, 2, 3, 4, 5].map(i => <G key={i}><Circle cx={35 + i * 55} cy={25 + (i % 3) * 17} r="4" fill={i % 2 ? '#BD91D4' : '#DB9C50'} /><Line x1={38 + i * 49} x2={43 + i * 49} y1="70" y2="78" stroke={i % 2 ? '#60A689' : '#DB9C50'} strokeWidth="3" strokeLinecap="round" /></G>) : null}
    </Svg>
    <StudyTransition turnKey={reaction} animateOnMount={celebration} effect={celebration ? 'bounce' : 'success'} style={{ position: 'absolute', left: '49%', top: '18%', width: '25%', height: '38%' }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 110">
        <Path d="M15 110V90Q20 62 50 64Q80 62 85 90V110Z" fill={scene === 'station' ? '#6A74A7' : '#448F7B'} />
        <Path d="M24 43Q16 4 52 6Q87 8 77 51Z" fill="#2D4747" />
        <Ellipse cx="51" cy="43" rx="24" ry="28" fill="#F4C3A6" />
        <Path d="M28 29Q55 36 65 15Q75 23 75 34L78 23Q70 3 49 6Q21 8 25 33Z" fill="#2D4747" />
        <Circle cx="43" cy="43" r="2" fill="#2D4747" /><Circle cx="62" cy="43" r="2" fill="#2D4747" />
        <Path d={celebration ? 'M44 52Q52 65 61 52Z' : 'M46 53Q53 59 59 52'} fill={celebration ? '#BA6F68' : 'none'} stroke="#BA6F68" strokeWidth="2" strokeLinecap="round" />
        <Ellipse cx="35" cy="51" rx="4" ry="2" fill="#EAA392" /><Ellipse cx="68" cy="51" rx="4" ry="2" fill="#EAA392" />
        <Path d={celebration ? 'M22 80Q10 64 7 45M80 80Q91 63 94 45' : 'M23 83Q15 100 8 101M79 82Q87 96 92 96'} fill="none" stroke="#F4C3A6" strokeWidth="10" strokeLinecap="round" />
        <Path d="M38 78H64V108H38Z" fill={cream} opacity="0.75" />
      </Svg>
    </StudyTransition>
    {celebration ? <CelebrationBurst /> : null}
  </View>;
}

function CelebrationBurst() {
  const reduced = useReducedMotion(), focused = useIsFocused();
  const [value] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const settle = () => { value.stopAnimation(); value.setValue(1); };
    settle();
    if (!reduced && focused && (!AppState.currentState || AppState.currentState === 'active')) {
      value.setValue(0);
      Animated.timing(value, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start();
    }
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') settle(); });
    return () => { sub.remove(); settle(); };
  }, [focused, reduced, value]);
  if (reduced) return null;
  return <View style={StyleSheet.absoluteFill}>{Array.from({ length: 14 }, (_, i) => <Animated.View key={i} style={{ position: 'absolute', left: `${15 + (i % 2) * 70}%`, top: '30%', width: 5, height: i % 3 ? 9 : 5, borderRadius: 2, backgroundColor: ['#DB9C50', '#60A689', '#BD91D4', '#DC8E84'][i % 4], opacity: value.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(i * 1.7) * 85] }) }, { translateY: value.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, -30 - (i % 4) * 12, 90] }) }, { rotate: value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${i % 2 ? 280 : -240}deg`] }) }] }} />)}</View>;
}

export function PracticeObject({ id }: { id: string }) {
  const t = useTheme(), ink = t.mode === 'dark' ? '#B6D4C9' : '#3D655B', peach = '#EBAE8B', lavender = '#AA97CB', mint = '#93BCA2';
  return <Svg width={36} height={36} viewBox="0 0 48 48">
    {['coffee', 'tea'].includes(id) ? <><Path d="M10 18H33V32Q32 41 22 41Q12 41 10 32Z" fill={id === 'tea' ? mint : peach} stroke={ink} strokeWidth="2" /><Path d="M34 21H38Q45 27 37 32H33M17 13Q13 9 18 5M26 13Q22 9 27 5" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" /><Ellipse cx="22" cy="18" rx="11" ry="3" fill={id === 'tea' ? '#D2C598' : '#976F55'} /></> :
    ['menu', 'book', 'chinese'].includes(id) ? <><Path d="M7 10Q15 7 24 13Q33 7 41 10V38Q33 35 24 41Q15 35 7 38Z" fill={id === 'menu' ? peach : lavender} stroke={ink} strokeWidth="2" strokeLinejoin="round" /><Path d="M24 13V40M12 18L19 19M12 24L19 25M29 19L36 18M29 25L36 24" stroke="#FFF7EC" strokeWidth="2" strokeLinecap="round" /></> :
    id === 'bread' ? <><Path d="M7 30Q5 21 14 15Q24 6 34 15Q45 21 41 31L37 37H12Z" fill="#DCAA64" stroke={ink} strokeWidth="2" /><Path d="M16 17L21 25M25 13L29 22M33 18L36 24" stroke="#FFF0CF" strokeWidth="3" strokeLinecap="round" /></> :
    id === 'apple' ? <><Path d="M24 15C9 4 2 25 14 39Q20 45 24 40Q29 45 35 39C47 25 40 4 24 15Z" fill="#D87D71" stroke={ink} strokeWidth="2" /><Path d="M24 14V5Q32 3 35 7Q30 14 24 11" fill={mint} stroke={ink} strokeWidth="2" /></> :
    id === 'banana' ? <Path d="M9 11Q13 34 34 24L40 18Q38 39 21 40Q3 36 5 17Z" fill="#E6C765" stroke={ink} strokeWidth="2" /> :
    id === 'watermelon' ? <><Path d="M5 16H43Q39 42 24 43Q9 42 5 16Z" fill={mint} stroke={ink} strokeWidth="2" /><Path d="M9 18H39Q34 37 24 38Q14 36 9 18Z" fill="#D67F77" /><Path d="M16 24L17 28M24 29V33M32 24L31 28" stroke={ink} strokeWidth="2" strokeLinecap="round" /></> :
    id === 'pen' ? <><Path d="M10 39L13 30L34 6Q39 4 42 10L21 35Z" fill={lavender} stroke={ink} strokeWidth="2" /><Path d="M13 30L21 35M32 9L39 15M10 39L16 37" stroke={ink} strokeWidth="2" /></> :
    ['bag', 'luggage'].includes(id) ? <><Rect x="10" y="15" width="28" height="27" rx="5" fill={lavender} stroke={ink} strokeWidth="2" /><Path d="M18 16V8H30V16M17 24V35M31 24V35" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" /></> :
    ['money', 'price', 'ticket'].includes(id) ? <><Rect x="5" y="13" width="38" height="23" rx="5" fill={id === 'ticket' ? peach : mint} stroke={ink} strokeWidth="2" /><Circle cx="22" cy="24" r="6" fill="#FFF0D9" /><Path d="M35 18V31M10 18V31" stroke={ink} strokeWidth="2" strokeDasharray="2 2" /></> :
    id === 'clock' ? <><Circle cx="24" cy="24" r="18" fill="#FFF0D9" stroke={ink} strokeWidth="3" /><Path d="M24 12V24L32 29" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" /></> :
    id === 'train' ? <><Rect x="9" y="5" width="30" height="34" rx="8" fill={lavender} stroke={ink} strokeWidth="2" /><Rect x="14" y="11" width="20" height="12" rx="3" fill="#FFF0D9" /><Circle cx="16" cy="31" r="3" fill={peach} /><Circle cx="32" cy="31" r="3" fill={peach} /><Path d="M15 40L11 46M33 40L37 46" stroke={ink} strokeWidth="3" /></> :
    id === 'exit' ? <><Rect x="9" y="5" width="26" height="37" rx="3" fill={mint} stroke={ink} strokeWidth="2" /><Path d="M21 23H43L36 17M43 23L36 30" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" /></> :
    id === 'desk' ? <><Rect x="4" y="16" width="40" height="8" rx="3" fill={peach} stroke={ink} strokeWidth="2" /><Path d="M10 25V41M38 25V41" stroke={ink} strokeWidth="4" strokeLinecap="round" /></> : <><Circle cx="24" cy="15" r="10" fill={peach} stroke={ink} strokeWidth="2" /><Path d="M8 43V35Q9 23 24 26Q39 23 40 35V43Z" fill={mint} stroke={ink} strokeWidth="2" /><Path d="M19 15H20M28 15H29M21 20Q24 23 27 20" stroke={ink} strokeWidth="2" strokeLinecap="round" fill="none" /></>}
  </Svg>;
}
