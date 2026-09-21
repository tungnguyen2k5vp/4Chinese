import { Text as SvgText, Circle, Svg } from 'react-native-svg';

import { colors } from '@/constants/design';

export function ProgressRing({ progress, size = 84, label }: { progress: number; size?: number; label?: string }) {
  const stroke = 8; const radius = (size - stroke) / 2; const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(1, progress));
  return <Svg width={size} height={size} accessibilityLabel={`${Math.round(value * 100)} phần trăm`}>
    <Circle cx={size/2} cy={size/2} r={radius} stroke={colors.border} strokeWidth={stroke} fill="none" />
    <Circle cx={size/2} cy={size/2} r={radius} stroke={colors.primary} strokeWidth={stroke} fill="none" strokeLinecap="round"
      strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1-value)} transform={`rotate(-90 ${size/2} ${size/2})`} />
    <SvgText x="50%" y="48%" textAnchor="middle" alignmentBaseline="middle" fill={colors.text} fontWeight="800" fontSize="16">{Math.round(value*100)}%</SvgText>
    {label ? <SvgText x="50%" y="66%" textAnchor="middle" fill={colors.textMuted} fontSize="9">{label}</SvgText> : null}
  </Svg>;
}
