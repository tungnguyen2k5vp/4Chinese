import { afterEach, describe, expect, it } from 'vitest';

import { configureFeatureFlags, defaultFeatureFlags, featureFlags, type FeatureFlagProvider } from './feature-flags';

afterEach(() => configureFeatureFlags(null));

describe('feature flag fallback', () => {
  it('falls back to deterministic local defaults when a provider throws', async () => {
    const brokenProvider: FeatureFlagProvider = {
      getBoolean: () => { throw new Error('remote unavailable'); },
      getString: () => undefined,
      getNumber: () => undefined,
      refresh: async () => { throw new Error('remote unavailable'); },
    };
    configureFeatureFlags(brokenProvider);
    expect(featureFlags.enabled('newHome')).toBe(defaultFeatureFlags.newHome);
    await expect(featureFlags.refresh()).resolves.toBeUndefined();
  });
});
