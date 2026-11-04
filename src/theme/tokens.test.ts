import { describe, expect, it } from 'vitest';

import { darkTheme, lightTheme } from './tokens';

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)?.map((channel) => parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Expected an RGB hex color, received ${hex}`);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

describe('theme semantic color contrast', () => {
  it.each([lightTheme, darkTheme])('$mode text and status colors are readable on its surfaces', (theme) => {
    for (const background of [theme.background, theme.surface]) {
      for (const foreground of [theme.textPrimary, theme.textSecondary, theme.textMuted, theme.primaryText, theme.success, theme.warning, theme.error, theme.info]) {
        expect(contrastRatio(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrastRatio(theme.onPrimary, theme.primary), `onPrimary on ${theme.primary}`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.onSuccess, theme.success), `onSuccess on ${theme.success}`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.onWarning, theme.warning), `onWarning on ${theme.warning}`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.onError, theme.error), `onError on ${theme.error}`).toBeGreaterThanOrEqual(4.5);
    expect(theme.surfaceRaised).toBe(theme.surfaceElevated);
    expect(theme.surfaceSelected).toBeTruthy();
    expect(theme.readingBackground).toBeTruthy();
    for (const color of Object.values(theme.skillColors)) {
      expect(contrastRatio(color, theme.surface), `${color} on ${theme.surface}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const skill of Object.keys(theme.skillSurfaces) as (keyof typeof theme.skillColors)[]) {
      for (const ink of [theme.skillColors[skill], theme.textPrimary, theme.textSecondary, theme.textMuted]) {
        expect(contrastRatio(ink, theme.skillSurfaces[skill]), `${skill}: ${ink} on ${theme.skillSurfaces[skill]}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps white labels readable on every HSK solid badge color', () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const color of theme.hsk) expect(contrastRatio('#FFFFFF', color), `white on ${color}`).toBeGreaterThanOrEqual(4.5);
      expect(Object.values(theme.hskByLevel)).toEqual(theme.hsk);
    }
  });
});
