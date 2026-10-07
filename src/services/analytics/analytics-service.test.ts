import { afterEach, describe, expect, it } from 'vitest';

import { AnalyticsEvent, configureAnalytics, sanitizeAnalyticsProperties, track } from './analytics-service';

afterEach(() => configureAnalytics(null));

describe('analytics privacy boundary', () => {
  it('retains only bounded, allowlisted activity metadata', () => {
    expect(sanitizeAnalyticsProperties({
      activity: 'review', minutes: 5, elapsed_seconds: 60, activities: 2,
      simplified: '你好', note: 'personal note', lesson_id: 'lesson-private-id', account: 'user@example.com',
      unknownActivity: 'free-form text',
    })).toEqual({ activity: 'review', minutes: 5, elapsed_seconds: 60, activities: 2 });
  });

  it('rejects arbitrary text in the activity field and bounds numeric input', () => {
    expect(sanitizeAnalyticsProperties({ activity: '你好', minutes: 99_999, elapsed_seconds: -4, activities: 3.8 }))
      .toEqual({ minutes: 1_440, activities: 3 });
  });

  it('sends sanitized properties and does not let a provider failure reach the learner', async () => {
    const received: unknown[] = [];
    configureAnalytics({ track: (_event, properties) => { received.push(properties); }, screen: () => undefined });
    track(AnalyticsEvent.QUICK_SESSION_STARTED, { activity: 'review', minutes: 3, hanzi: '你好' });
    await Promise.resolve();
    expect(received).toEqual([{ activity: 'review', minutes: 3 }]);

    configureAnalytics({ track: () => { throw new Error('offline'); }, screen: () => undefined });
    expect(() => track(AnalyticsEvent.LESSON_STARTED, { activity: 'learning' })).not.toThrow();
    await Promise.resolve();
  });
});
