/**
 * English Learning Experience Design Tokens (V7.1 Redesign)
 * Dedicated tokens for English mode (learningLanguage === 'en').
 * Preserves the existing Chinese theme tokens completely.
 */

export interface EnglishColorPalette {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  primaryGradient: [string, string];

  secondary: string;
  secondaryLight: string;

  // Skill-specific accents
  vocabulary: string;
  vocabularyLight: string;
  review: string;
  reviewLight: string;
  reading: string;
  readingLight: string;
  spelling: string;
  spellingLight: string;
  cefr: string;
  cefrLight: string;

  // Feedback & states
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;

  // Background & surfaces
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHighlight: string;
  border: string;
  borderSubtle: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
}

export const englishLightPalette: EnglishColorPalette = {
  primary: "#2563EB", // Royal Blue
  primaryHover: "#1D4ED8",
  primaryLight: "#EFF6FF",
  primaryDark: "#1E40AF",
  primaryGradient: ["#2563EB", "#4F46E5"], // Blue to Indigo

  secondary: "#7C3AED", // Violet
  secondaryLight: "#F5F3FF",

  // Skill colors
  vocabulary: "#2563EB", // Royal Blue
  vocabularyLight: "#EFF6FF",
  review: "#D97706", // Amber
  reviewLight: "#FFFBEB",
  reading: "#0D9488", // Teal
  readingLight: "#F0FDFA",
  spelling: "#EA580C", // Coral
  spellingLight: "#FFF7ED",
  cefr: "#4338CA", // Deep Indigo
  cefrLight: "#EEF2FF",

  // Feedback
  success: "#16A34A",
  successLight: "#F0FDF4",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  error: "#E11D48",
  errorLight: "#FFF1F2",
  info: "#0284C7",
  infoLight: "#F0F9FF",

  // Surfaces
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSubtle: "#F1F5F9",
  surfaceHighlight: "#E2E8F0",
  border: "#E2E8F0",
  borderSubtle: "#CBD5E1",

  // Typography
  textPrimary: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#64748B",
  textOnPrimary: "#FFFFFF",
};

export const englishDarkPalette: EnglishColorPalette = {
  primary: "#3B82F6",
  primaryHover: "#60A5FA",
  primaryLight: "#1E293B",
  primaryDark: "#1D4ED8",
  primaryGradient: ["#3B82F6", "#6366F1"],

  secondary: "#8B5CF6",
  secondaryLight: "#2E1065",

  // Skill colors
  vocabulary: "#60A5FA",
  vocabularyLight: "#1E293B",
  review: "#FBBF24",
  reviewLight: "#451A03",
  reading: "#2DD4BF",
  readingLight: "#042F2E",
  spelling: "#FB923C",
  spellingLight: "#431407",
  cefr: "#818CF8",
  cefrLight: "#1E1B4B",

  // Feedback
  success: "#22C55E",
  successLight: "#052E16",
  warning: "#F59E0B",
  warningLight: "#451A03",
  error: "#F43F5E",
  errorLight: "#4C0519",
  info: "#38BDF8",
  infoLight: "#082F49",

  // Surfaces
  background: "#0B0F19",
  surface: "#161F30",
  surfaceSubtle: "#1E293B",
  surfaceHighlight: "#334155",
  border: "#25334D",
  borderSubtle: "#334155",

  // Typography
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textOnPrimary: "#FFFFFF",
};

export const englishTokens = {
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    section: 32,
  },
  typography: {
    hero: { fontSize: 26, fontWeight: "800" as const, lineHeight: 32 },
    title: { fontSize: 20, fontWeight: "700" as const, lineHeight: 26 },
    subtitle: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
    body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
    badge: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.5 },
    wordBig: { fontSize: 32, fontWeight: "800" as const, lineHeight: 38 },
    ipa: { fontSize: 16, fontWeight: "500" as const, fontStyle: "italic" as const },
    meaning: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
  },
  shadow: {
    sm: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

export function getEnglishPalette(isDark: boolean): EnglishColorPalette {
  return isDark ? englishDarkPalette : englishLightPalette;
}

export function useEnglishTokens(theme: { mode: 'light' | 'dark' }) {
  const isDark = theme.mode === 'dark';
  return {
    isDark,
    palette: getEnglishPalette(isDark),
    tokens: englishTokens,
  };
}
