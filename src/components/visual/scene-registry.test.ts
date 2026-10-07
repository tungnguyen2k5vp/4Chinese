import { describe, expect, it } from 'vitest';

import { legacySceneByMood, sceneAssets, type SceneName } from './scene-registry';

describe('visual scene registry', () => {
  it('provides a distinct, named composition for every scene family', () => {
    const required: SceneName[] = ['learn', 'practice', 'read', 'listen', 'speak', 'hsk', 'achievement', 'stats', 'welcome'];
    const compositions = required.map((name) => sceneAssets[name].composition);

    expect(Object.keys(sceneAssets).sort()).toEqual([...required].sort());
    expect(new Set(compositions).size).toBe(required.length);
  });

  it('keeps legacy mood callers on an intentional scene family', () => {
    expect(legacySceneByMood).toEqual({ journey: 'learn', reading: 'read', voice: 'speak', progress: 'stats' });
  });
});
