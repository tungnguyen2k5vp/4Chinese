export const sceneAssets = {
  learn: { composition: 'book-path', accent: 'vocabulary' },
  practice: { composition: 'target-practice', accent: 'exam' },
  read: { composition: 'reading-desk', accent: 'reading' },
  listen: { composition: 'headphone-rhythm', accent: 'listening' },
  speak: { composition: 'microphone-dialogue', accent: 'speaking' },
  hsk: { composition: 'milestone-gate', accent: 'exam' },
  achievement: { composition: 'seal-collection', accent: 'review' },
  stats: { composition: 'rising-chart', accent: 'exam' },
  welcome: { composition: 'open-door', accent: 'vocabulary' },
} as const;

export type SceneName = keyof typeof sceneAssets;
export type SceneComposition = (typeof sceneAssets)[SceneName]['composition'];

export const legacySceneByMood = {
  journey: 'learn',
  reading: 'read',
  voice: 'speak',
  progress: 'stats',
} as const;

export type LegacyLandscapeMood = keyof typeof legacySceneByMood;
