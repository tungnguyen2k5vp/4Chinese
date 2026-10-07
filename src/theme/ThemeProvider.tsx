import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type ThemeMode, type ThemeTokens } from './tokens';

import { useAppStore } from '@/stores/app-store';

const ThemeContext = createContext<ThemeTokens>(lightTheme);

export function resolveThemeMode(preference: ThemeMode, system: 'light' | 'dark' | 'unspecified' | null | undefined): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemMode = useColorScheme();
  const preference = useAppStore((state) => state.settings?.themeMode ?? 'system');
  const theme = useMemo(() => resolveThemeMode(preference, systemMode) === 'dark' ? darkTheme : lightTheme, [preference, systemMode]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

/** Create cached, theme-aware styles from semantic tokens. */
export function useThemeStyles<T>(createStyles: (theme: ThemeTokens) => T): T {
  const theme = useTheme();
  return useMemo(() => createStyles(theme), [createStyles, theme]);
}
