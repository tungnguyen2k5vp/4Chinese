export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemeTokens = {
  mode: 'light' | 'dark';
  background: string;
  backgroundSecondary: string;
  surface: string;
  /** Backwards-compatible alias for the raised surface role. */
  surfaceElevated: string;
  surfaceRaised: string;
  surfacePressed: string;
  surfaceSelected: string;
  surfaceDisabled: string;
  readingBackground: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  divider: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryText: string;
  accent: string;
  success: string;
  onSuccess: string;
  successSoft: string;
  warning: string;
  onWarning: string;
  warningSoft: string;
  error: string;
  onError: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  onPrimary: string;
  onDark: string;
  shadow: string;
  hsk: readonly string[];
  hskByLevel: Readonly<Record<'1' | '2' | '3' | '4' | '5' | '6' | '7-9', string>>;
  tones: readonly string[];
  skillColors: {
    vocabulary: string;
    listening: string;
    speaking: string;
    reading: string;
    grammar: string;
    hanzi: string;
    review: string;
    exam: string;
  };
  skill: { vocabulary: string; listening: string; speaking: string; reading: string; grammar: string; hanzi: string; review: string };
};

const hskColors = ['#2457D6', '#08776F', '#9A6B16', '#9B4E8C', '#C24E3A', '#5F4EB2', '#273A67'] as const;
const hskByLevel = {
  '1': hskColors[0], '2': hskColors[1], '3': hskColors[2], '4': hskColors[3],
  '5': hskColors[4], '6': hskColors[5], '7-9': hskColors[6],
} as const;

const shared = {
  primary: '#2457D6', primaryPressed: '#173B9A', accent: '#E89A19',
  success: '#16754F', warning: '#96520A', error: '#B42318', info: '#2457D6',
  onPrimary: '#FFFFFF', onSuccess: '#FFFFFF', onWarning: '#FFFFFF', onError: '#FFFFFF', onDark: '#FFFFFF',
  hsk: hskColors,
  hskByLevel,
} as const;

const lightSkillColors = {
  vocabulary: '#2457D6', listening: '#5B3F9F', speaking: '#92500A', reading: '#16754F',
  grammar: '#5142A2', hanzi: '#A63B32', review: '#795000', exam: '#273A67',
} as const;
const darkSkillColors = {
  vocabulary: '#87AAFF', listening: '#C1A2FF', speaking: '#FFC088', reading: '#70D4A4',
  grammar: '#B4A3FF', hanzi: '#FF9A8F', review: '#FFD275', exam: '#91A8E6',
} as const;

function legacySkillColors(colors: ThemeTokens['skillColors']): ThemeTokens['skill'] {
  return {
    vocabulary: colors.vocabulary, listening: colors.listening, speaking: colors.speaking,
    reading: colors.reading, grammar: colors.grammar, hanzi: colors.hanzi, review: colors.review,
  };
}

export const lightTheme: ThemeTokens = {
  mode: 'light', ...shared, skillColors: lightSkillColors, skill: legacySkillColors(lightSkillColors),
  background: '#F6F7FB', backgroundSecondary: '#EEF1F7', surface: '#FFFFFF', surfaceElevated: '#FFFFFF', surfaceRaised: '#FFFFFF', surfacePressed: '#F0F3FA', surfaceSelected: '#E9EFFF', surfaceDisabled: '#EEF1F7', readingBackground: '#FBF8EF',
  textPrimary: '#172033', textSecondary: '#4D596E', textMuted: '#626B7B', textInverse: '#FFFFFF', border: '#E1E6F0', divider: '#E9ECF3', primarySoft: '#E9EFFF',
  primaryText: '#2457D6',
  successSoft: '#E7F7F0', warningSoft: '#FFF4DD', errorSoft: '#FDECEC', infoSoft: '#E9EFFF', overlay: 'rgba(12, 23, 48, 0.56)', shadow: '#172033',
  tones: ['#697386', '#C95437', '#16815E', '#2457D6', '#8245A4'],
};

export const darkTheme: ThemeTokens = {
  mode: 'dark', ...shared, skillColors: darkSkillColors, skill: legacySkillColors(darkSkillColors),
  accent: '#FFC45D', success: '#5AD3A3', onSuccess: '#10231D', warning: '#FFC65A', onWarning: '#261B07', error: '#FF9292', onError: '#351416', info: '#78A9FF', primaryText: '#78A9FF',
  background: '#101624', backgroundSecondary: '#182033', surface: '#1D2738', surfaceElevated: '#263248', surfaceRaised: '#263248', surfacePressed: '#303E56', surfaceSelected: '#1C3266', surfaceDisabled: '#182033', readingBackground: '#182033',
  textPrimary: '#F5F7FC', textSecondary: '#CBD3E2', textMuted: '#9BA8BE', textInverse: '#101624', border: '#36435A', divider: '#2B374C', primarySoft: '#1C3266',
  successSoft: '#153D32', warningSoft: '#473615', errorSoft: '#482429', infoSoft: '#1C3266', overlay: 'rgba(0, 0, 0, 0.68)', shadow: '#000000',
  tones: ['#B7C0D0', '#FF977C', '#62D5A9', '#78A9FF', '#D0A5FF'],
};
