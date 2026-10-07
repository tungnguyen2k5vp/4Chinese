export type FeatureFlagName = 'newHome' | 'newLearningPath' | 'mascot' | 'uiSounds' | 'aiTutor' | 'pitchAnalysis' | 'newStats' | 'quickSessions' | 'comebackPrompt';
export type FeatureFlags = Record<FeatureFlagName, boolean>;

export const defaultFeatureFlags: FeatureFlags = { newHome: true, newLearningPath: true, mascot: true, uiSounds: false, aiTutor: false, pitchAnalysis: false, newStats: true, quickSessions: true, comebackPrompt: true };

export interface FeatureFlagProvider {
  getBoolean(name: FeatureFlagName, fallback?: boolean): boolean;
  getString(name: string, fallback?: string): string | undefined;
  getNumber(name: string, fallback?: number): number | undefined;
  refresh(): Promise<void>;
}

class LocalFeatureFlagProvider implements FeatureFlagProvider {
  constructor(private values: Partial<FeatureFlags> = {}) {}
  getBoolean(name: FeatureFlagName, fallback = defaultFeatureFlags[name]) { return this.values[name] ?? fallback; }
  getString(_name: string, fallback?: string) { return fallback; }
  getNumber(_name: string, fallback?: number) { return fallback; }
  async refresh() { /* Offline-safe default provider. */ }
}

let provider: FeatureFlagProvider = new LocalFeatureFlagProvider();
export function configureFeatureFlags(next: FeatureFlagProvider | null | undefined) { provider = next ?? new LocalFeatureFlagProvider(); }
export const featureFlags = {
  enabled(name: FeatureFlagName) {
    try { return provider.getBoolean(name, defaultFeatureFlags[name]); }
    catch { return defaultFeatureFlags[name]; }
  },
  async refresh() {
    try { await provider.refresh(); } catch { /* Remote flag outages must not block offline learning. */ }
  },
};
export { LocalFeatureFlagProvider };
