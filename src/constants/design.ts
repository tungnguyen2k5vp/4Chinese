import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#2457D6',
  primaryDark: '#173B9A',
  primarySoft: '#E9EFFF',
  accent: '#F4A62A',
  background: '#F6F7FB',
  surface: '#FFFFFF',
  text: '#172033',
  textMuted: '#697386',
  border: '#E5E8F0',
  success: '#218A67',
  warning: '#C87513',
  danger: '#D14343',
  hsk: ['#2457D6', '#0C8B84', '#9A6B16', '#9B4E8C', '#C24E3A', '#5F4EB2', '#273A67'],
  tones: ['#697386', '#D05D39', '#218A67', '#2A67D4', '#9251A6'],
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const typography = { caption: 12, body: 15, subtitle: 18, title: 24, hero: 36, hanzi: 48 } as const;

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
