export const AnalyticsEvent = {
  APP_OPEN: 'app_open', LESSON_STARTED: 'lesson_started', LESSON_COMPLETED: 'lesson_completed', LESSON_ABANDONED: 'lesson_abandoned',
  REVIEW_STARTED: 'review_started', REVIEW_COMPLETED: 'review_completed', REVIEW_ABANDONED: 'review_abandoned', DAILY_PLAN_COMPLETED: 'daily_plan_completed',
  DAILY_REMINDER_ENABLED: 'daily_reminder_enabled', DAILY_REMINDER_DISABLED: 'daily_reminder_disabled',
  STORY_STARTED: 'story_started', STORY_COMPLETED: 'story_completed', GRAMMAR_PRACTICED: 'grammar_practiced',
  SPEAKING_STARTED: 'speaking_started', SPEAKING_COMPLETED: 'speaking_completed', ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  STREAK_EXTENDED: 'streak_extended', QUICK_SESSION_STARTED: 'quick_session_started', QUICK_SESSION_COMPLETED: 'quick_session_completed',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
export type AnalyticsScreenName = 'home' | 'hsk' | 'vocabulary' | 'stats' | 'profile' | 'daily' | 'path' | 'lesson' | 'review' | 'grammar' | 'reader' | 'speaking' | 'writing' | 'achievements';
export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsProvider {
  track(event: AnalyticsEventName, properties?: AnalyticsProperties): void | Promise<void>;
  screen(name: string, properties?: AnalyticsProperties): void | Promise<void>;
  identify?(id: string): void | Promise<void>;
  setUserProperty?(name: string, value: string | number | boolean): void | Promise<void>;
}

const noopProvider: AnalyticsProvider = { track: () => undefined, screen: () => undefined };
let provider: AnalyticsProvider = noopProvider;

export function configureAnalytics(next: AnalyticsProvider | null | undefined) { provider = next ?? noopProvider; }

const allowedNumberProperties = new Set(['minutes', 'elapsed_seconds', 'activities']);
const allowedActivityValues = new Set(['learning', 'review', 'new-words']);

/** Drops free-form/user content before it can reach an optional analytics provider. */
export function sanitizeAnalyticsProperties(properties?: AnalyticsProperties): AnalyticsProperties | undefined {
  if (!properties) return undefined;
  const safe: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'activity' && typeof value === 'string' && allowedActivityValues.has(value)) safe.activity = value;
    if (allowedNumberProperties.has(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      safe[key] = Math.min(Math.floor(value), key === 'minutes' ? 1_440 : key === 'elapsed_seconds' ? 43_200 : 1_000);
    }
  }
  return Object.keys(safe).length ? safe : undefined;
}

export function track(event: AnalyticsEventName, properties?: AnalyticsProperties) {
  void Promise.resolve().then(() => provider.track(event, sanitizeAnalyticsProperties(properties))).catch(() => undefined);
}

export function trackScreen(name: AnalyticsScreenName, properties?: AnalyticsProperties) {
  void Promise.resolve().then(() => provider.screen(name, sanitizeAnalyticsProperties(properties))).catch(() => undefined);
}
