import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

export type EmptyScene =
  | 'search'
  | 'review'
  | 'mistakes'
  | 'deck'
  | 'recordings'
  | 'stories'
  | 'history'
  | 'offline-ai'
  | 'achievement';

/** Small original, offline SVG vignettes; state meaning is also stated in text. */
export function EmptyIllustration({ scene = 'search', size = 120 }: { scene?: EmptyScene; size?: number }) {
  const theme = useTheme();
  const accent = scene === 'recordings' ? theme.skillColors.speaking
    : scene === 'stories' || scene === 'history' ? theme.skillColors.reading
      : scene === 'review' || scene === 'mistakes' ? theme.skillColors.review
        : scene === 'achievement' ? theme.accent : theme.primary;
  const soft = scene === 'recordings' ? theme.surfaceSelected : scene === 'stories' || scene === 'history' ? theme.successSoft : theme.primarySoft;

  return (
    <Svg width={size} height={size * 0.76} viewBox="0 0 144 110" accessibilityElementsHidden>
      <Rect x="8" y="7" width="128" height="96" rx="30" fill={soft} />
      {scene === 'search' && <>
        <Circle cx="64" cy="49" r="24" fill={theme.surface} stroke={accent} strokeWidth="5" />
        <Path d="m82 68 18 18" stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <Circle cx="64" cy="49" r="11" fill={soft} />
      </>}
      {scene === 'review' && <>
        <Rect x="37" y="27" width="57" height="67" rx="11" fill={theme.surface} stroke={theme.border} strokeWidth="2" />
        <Rect x="48" y="19" width="57" height="67" rx="11" fill={theme.surface} stroke={accent} strokeWidth="3" />
        <Path d="m61 53 9 9 20-23" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </>}
      {scene === 'mistakes' && <>
        <Path d="M34 30h63a12 12 0 0 1 12 12v31a12 12 0 0 1-12 12H61L43 96V85h-9a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12Z" fill={theme.surface} stroke={accent} strokeWidth="3" strokeLinejoin="round" />
        <Path d="M44 50h36M44 63h21" stroke={theme.border} strokeWidth="5" strokeLinecap="round" />
        <Path d="m85 53 14 14m0-14L85 67" stroke={theme.error} strokeWidth="4" strokeLinecap="round" />
      </>}
      {scene === 'deck' && <>
        <Path d="M35 29h53a9 9 0 0 1 9 9v47a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8V36a7 7 0 0 1 7-7Z" fill={theme.surface} stroke={accent} strokeWidth="3" />
        <Path d="M46 45h38M46 58h30M46 71h34" stroke={theme.border} strokeWidth="5" strokeLinecap="round" />
        <Path d="M92 39h9v48a7 7 0 0 1-7 7h-6" fill="none" stroke={accent} strokeWidth="3" />
      </>}
      {scene === 'recordings' && <>
        <Circle cx="72" cy="55" r="31" fill={theme.surface} />
        <Path d="M43 56h8l6-16 10 33 9-44 10 52 7-25h8" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M56 82a24 24 0 0 0 32 0" fill="none" stroke={theme.border} strokeWidth="3" strokeLinecap="round" />
      </>}
      {scene === 'stories' && <>
        <Path d="M72 39c-14-12-28-13-42-8v52c15-5 29-4 42 8 13-12 27-13 42-8V31c-14-5-28-4-42 8Z" fill={theme.surface} stroke={accent} strokeWidth="3" strokeLinejoin="round" />
        <Path d="M72 40v50M43 44c8-2 15-1 22 3M101 44c-8-2-15-1-22 3" fill="none" stroke={theme.border} strokeWidth="3" strokeLinecap="round" />
      </>}
      {scene === 'history' && <>
        <Circle cx="72" cy="55" r="34" fill={theme.surface} stroke={accent} strokeWidth="4" />
        <Path d="M72 34v23l17 10" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M41 27 33 36m70-9 8 9" stroke={theme.border} strokeWidth="4" strokeLinecap="round" />
      </>}
      {scene === 'offline-ai' && <>
        <Rect x="48" y="18" width="49" height="76" rx="11" fill={theme.surface} stroke={accent} strokeWidth="3" />
        <Rect x="56" y="29" width="33" height="43" rx="6" fill={soft} />
        <Path d="m69 41-6 10h8l-2 9 11-14h-8l3-5Z" fill={accent} />
        <Circle cx="72" cy="82" r="3" fill={theme.border} />
      </>}
      {scene === 'achievement' && <>
        <Path d="M48 24h48v21c0 17-10 27-24 27S48 62 48 45V24Z" fill={theme.surface} stroke={accent} strokeWidth="4" />
        <Path d="M48 34H34v9c0 12 8 18 18 18M96 34h14v9c0 12-8 18-18 18M72 72v16m-16 0h32" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="m72 33 4 9 10 1-8 6 3 10-9-6-9 6 3-10-8-6 10-1Z" fill={theme.accent} />
      </>}
    </Svg>
  );
}
