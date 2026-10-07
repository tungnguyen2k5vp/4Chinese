import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

export type GuideMood = 'welcome' | 'curious' | 'celebrate' | 'reading';

/** Original 4Chinese companion mark: a little ink-stamp/book guide, not a learning-state indicator. */
export function LearningGuide({ mood = 'welcome', size = 64 }: { mood?: GuideMood; size?: number }) {
  const theme = useTheme();
  const ink = mood === 'reading' ? theme.skillColors.reading : theme.primaryText;
  const seal = theme.mode === 'dark' ? '#E6A58F' : '#A94D45';
  return <Svg width={size} height={size} viewBox="0 0 72 72" accessibilityElementsHidden>
    {mood === 'celebrate' ? <>
      <Path d="M12 19 15 11M59 20l4-7M12 50l-7 3M62 49l5 4" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" />
      <Path d="m36 7 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z" fill={theme.accent} />
    </> : null}
    <Ellipse cx="36" cy="62" rx="20" ry="4" fill={theme.shadow} opacity="0.12" />
    <Rect x="16" y="17" width="40" height="43" rx="16" fill={theme.surface} stroke={seal} strokeWidth="2.5" />
    <Path d="M25 17v-4c0-4 5-7 11-7s11 3 11 7v4" fill={seal} />
    {mood === 'reading' ? <>
      <Circle cx="29" cy="37" r="7" fill="none" stroke={ink} strokeWidth="2.5" />
      <Circle cx="44" cy="37" r="7" fill="none" stroke={ink} strokeWidth="2.5" />
      <Path d="M36 37h1M30 52q6 5 12 0" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M24 61 18 68M49 61l6 7" stroke={seal} strokeWidth="3" strokeLinecap="round" />
    </> : <>
      <Circle cx="28" cy="37" r="2.6" fill={ink} />
      {mood === 'curious' ? <Ellipse cx="44" cy="37" rx="2.7" ry="3.7" fill={ink} /> : <Circle cx="44" cy="37" r="2.6" fill={ink} />}
      <Path d={mood === 'curious' ? 'M31 49q5-7 10 0' : 'M30 47q6 7 12 0'} fill="none" stroke={seal} strokeWidth="2.6" strokeLinecap="round" />
      <Path d="M22 60 17 67M50 60l5 7" stroke={seal} strokeWidth="3" strokeLinecap="round" />
      <Path d="M18 28 11 24M54 28l7-4" stroke={seal} strokeWidth="2.4" strokeLinecap="round" />
    </>}
  </Svg>;
}
