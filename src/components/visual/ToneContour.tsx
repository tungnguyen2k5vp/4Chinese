import Svg, { Path } from 'react-native-svg';

/** A teaching diagram of a tone contour, not a measured acoustic waveform. */
export function ToneContour({ tone, color, width = 54, height = 24 }: { tone: number; color: string; width?: number; height?: number }) {
  const paths: Record<number, string> = {
    1: 'M4 15 C18 14 34 14 50 15',
    2: 'M4 19 C20 18 33 12 50 5',
    3: 'M4 8 C15 17 35 20 50 6',
    4: 'M4 5 C20 8 36 15 50 20',
    5: 'M4 13 C18 13 34 13 50 13',
  };
  return <Svg width={width} height={height} viewBox="0 0 54 24" accessibilityElementsHidden>
    <Path d="M3 21H51" stroke={color} strokeOpacity={0.2} strokeWidth={1} />
    <Path d={paths[tone] ?? paths[5]} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeDasharray={tone === 5 ? '2 4' : undefined} />
  </Svg>;
}
