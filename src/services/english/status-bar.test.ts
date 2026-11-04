import { describe, expect, it } from 'vitest';

import { appStatusBarStyle } from './status-bar';
describe('English status bar contrast without Chinese UI changes', () => {
  it.each(['/', '/vocabulary', '/english-speaking', '/explore', '/entertainment', '/english/reader', '/english/profile', '/english/onboarding'])('uses readable icons on %s', path => {
    expect(appStatusBarStyle('en', 'light', path)).toBe('dark');
    expect(appStatusBarStyle('en', 'dark', path)).toBe('light');
  });
  it('preserves Chinese legacy vocabulary exception', () => {
    expect(appStatusBarStyle('zh', 'light', '/vocabulary')).toBe('light');
    expect(appStatusBarStyle('zh', 'light', '/')).toBe('dark');
  });
});
