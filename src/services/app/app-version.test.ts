import { describe, expect, it } from 'vitest';

import { resolveAppVersion } from './app-version-core';

describe('app version service', () => {
  it('prefers the installed native version over Expo configuration', () => {
    expect(resolveAppVersion({ nativeApplicationVersion: '0.1.16', expoVersion: '0.1.15' })).toBe('0.1.16');
  });

  it('uses Expo configuration in development and avoids a stale hard-coded fallback', () => {
    expect(resolveAppVersion({ expoVersion: '0.1.16' })).toBe('0.1.16');
    expect(resolveAppVersion({})).toBe('unknown');
  });
});
