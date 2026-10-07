import type { TextStyle, ViewStyle } from 'react-native';

import type { ThemeTokens } from '@/theme/tokens';

export const colors = {
  primary: '#2457D6',
  primaryDark: '#173B9A',
  primarySoft: '#E9EFFF',
  accent: '#F4A62A',
  background: '#F6F7FB',
  surface: '#FFFFFF',
  text: '#172033',
  textMuted: '#626B7B',
  border: '#E5E8F0',
  success: '#218A67',
  warning: '#C87513',
  danger: '#D14343',
  hsk: ['#2457D6', '#08776F', '#9A6B16', '#9B4E8C', '#C24E3A', '#5F4EB2', '#273A67'],
  tones: ['#626B7B', '#B6472B', '#16754F', '#2457D6', '#7D3B94'],
} as const;

/** Compatibility palette for legacy screens while they migrate to semantic tokens. */
export function designColors(theme: ThemeTokens) {
  return {
    primary: theme.primary, primaryText: theme.primaryText, primaryDark: theme.primaryPressed, primarySoft: theme.primarySoft,
    accent: theme.accent, background: theme.background, surface: theme.surface,
    text: theme.textPrimary, textMuted: theme.textMuted, border: theme.border,
    success: theme.success, warning: theme.warning, danger: theme.error, hsk: theme.hsk, tones: theme.tones,
  } as const;
}


export function themedCard(theme: ThemeTokens): ViewStyle {
  return { ...card, backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow };
}

/** Compatibility palette for legacy screens while they migrate to semantic tokens. */
export const motion = { quick: 140, standard: 220, progress: 360, pressScale: 0.98 } as const;

export const feedbackColors = { successSoft: "#E7F7F0", warningSoft: "#FFF4DD", dangerSoft: "#FDECEC", infoSoft: "#E9EFFF" } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
// Applied only by web layouts; native screens keep their existing width.
export const webLayout = { maxContentWidth: 1120 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const typography = {
  // Legacy aliases remain stable while screens migrate to the named V2 roles.
  caption: 12, body: 15, subtitle: 18, title: 24, hero: 36, hanzi: 48,
  display: 36, titleLarge: 28, heading: 20, bodyDefault: 16, bodyStrong: 16, secondary: 14,
  hanziHero: 52, hanziLarge: 40, hanziCard: 30, pinyinLarge: 22, pinyin: 16, chineseBody: 20,
} as const;

export const shadow: ViewStyle = {
  shadowColor: '#172033',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export const card: ViewStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderCurve: 'continuous',
  padding: spacing.lg,
  ...shadow,
};

export const sectionTitle: TextStyle = {
  color: colors.text,
  fontSize: typography.subtitle,
  fontWeight: '700',
};
