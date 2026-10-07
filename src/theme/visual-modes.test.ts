import { describe, expect, it } from 'vitest';

import { darkTheme, lightTheme } from './tokens';
import { visualModeForRoute, visualModePresentation } from './visual-modes';

describe('visual mode route mapping', () => {
  it.each([
    ['/path/hsk-1-path', 'LEARN'],
    ['/speaking/ai', 'LEARN'],
    ['/review/session', 'REVIEW'],
    ['/grammar/focus', 'REVIEW'],
    ['/decks/quiz?deckId=qa', 'REVIEW'],
    ['/decks/listening', 'REVIEW'],
    ['/reader?storyId=one', 'READ'],
    ['/stories/one', 'READ'],
    ['/exam/speaking', 'EXAM'],
    ['/listening', 'LEARN'],
    ['/(tabs)/hsk', 'LEARN'],
    ['/(tabs)/profile', 'UTILITY'],
    ['/speaking/recordings', 'UTILITY'],
    ['/cloud', 'UTILITY'],
  ] as const)('%s maps to %s', (route, expected) => {
    expect(visualModeForRoute(route)).toBe(expected);
  });
});

describe('visual mode presentation', () => {
  it('uses a warm reading surface and a reading-skill accent without enabling celebrations', () => {
    expect(visualModePresentation(lightTheme, 'READ')).toEqual({
      accent: lightTheme.skillColors.reading,
      surface: lightTheme.readingBackground,
      density: 'relaxed',
      celebratesMilestones: false,
    });
  });

  it.each([lightTheme, darkTheme])('$mode keeps exam mode quiet and mode colors theme-aware', (theme) => {
    const exam = visualModePresentation(theme, 'EXAM');
    expect(exam.accent).toBe(theme.skillColors.exam);
    expect(exam.surface).toBe(theme.surface);
    expect(exam.celebratesMilestones).toBe(false);
  });
});
