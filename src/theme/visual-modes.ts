import type { ThemeTokens } from './tokens';

export type VisualMode = 'LEARN' | 'REVIEW' | 'READ' | 'EXAM' | 'UTILITY';
export type VisualModeDensity = 'comfortable' | 'focused' | 'relaxed' | 'compact';

type ModeRecipe = {
  accent: keyof ThemeTokens['skillColors'] | 'primary';
  surface: 'surface' | 'readingBackground';
  density: VisualModeDensity;
  celebratesMilestones: boolean;
};

/** Route mood is presentation-only; it must never affect learning or persistence rules. */
export const visualModeRecipes: Readonly<Record<VisualMode, ModeRecipe>> = {
  LEARN: { accent: 'vocabulary', surface: 'surface', density: 'comfortable', celebratesMilestones: true },
  REVIEW: { accent: 'review', surface: 'surface', density: 'focused', celebratesMilestones: false },
  READ: { accent: 'reading', surface: 'readingBackground', density: 'relaxed', celebratesMilestones: false },
  EXAM: { accent: 'exam', surface: 'surface', density: 'compact', celebratesMilestones: false },
  UTILITY: { accent: 'primary', surface: 'surface', density: 'comfortable', celebratesMilestones: false },
};

/** Resolve a file-system route to its visual treatment. Exact exam subroutes win over broader areas. */
export function visualModeForRoute(pathname: string): VisualMode {
  const path = pathname.split(/[?#]/u, 1)[0]!.replace(/\/+$/u, '').toLowerCase() || '/';
  if (path === '/exam' || path.startsWith('/exam/')) return 'EXAM';
  if (path === '/reader' || path.startsWith('/reader/') || path === '/stories' || path.startsWith('/stories/')) return 'READ';
  if (path === '/review' || path.startsWith('/review/') || path === '/mistakes' || path.startsWith('/mistakes/') ||
    path === '/confusables' || path.startsWith('/confusables/') || path === '/speaking/pairs' ||
    path === '/grammar/focus' || path === '/decks/quiz' || path === '/decks/listening' || path === '/decks/pronunciation') return 'REVIEW';
  if (path === '/(tabs)' || path === '/(tabs)/index' || path === '/(tabs)/hsk' || path === '/tabs' || path === '/tabs/hsk') return 'LEARN';
  if (path.startsWith('/(tabs)/') || path.startsWith('/tabs/')) return 'UTILITY';
  if (path === '/' || path === '/onboarding' || path === '/daily' || path.startsWith('/daily/') ||
    path === '/path' || path.startsWith('/path/') || path === '/learn' || path.startsWith('/learn/') ||
    path === '/grammar' || path.startsWith('/grammar/') || path === '/writing' || path.startsWith('/writing/') ||
    path === '/listening' || path.startsWith('/listening/') || path === '/speaking' ||
    (path.startsWith('/speaking/') && path !== '/speaking/recordings')) return 'LEARN';
  return 'UTILITY';
}

export function visualModePresentation(theme: Pick<ThemeTokens, 'primary' | 'surface' | 'readingBackground' | 'skillColors'>, mode: VisualMode) {
  const recipe = visualModeRecipes[mode];
  const accent = recipe.accent === 'primary' ? theme.primary : theme.skillColors[recipe.accent];
  return { accent, surface: theme[recipe.surface], density: recipe.density, celebratesMilestones: recipe.celebratesMilestones } as const;
}
