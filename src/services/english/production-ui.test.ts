import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('production UI and isolated debug tooling', () => {
  it.skipIf(!existsSync('android/app/src/debug/AndroidManifest.xml') || !existsSync('android/app/src/main/AndroidManifest.xml'))('configures the Expo-owned Tools FAB only in the debug manifest when native manifests are generated', () => {
    expect(readFileSync('android/app/src/debug/AndroidManifest.xml', 'utf8')).toContain('android:name="EXDevMenuShowFloatingActionButton" android:value="false"');
    expect(readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')).not.toContain('EXDevMenuShowFloatingActionButton');
  });
  it('gates QA navigation and previews behind DEV', () => {
    expect(readFileSync('src/app/_layout.tsx', 'utf8')).toContain('{__DEV__ ? <Stack.Screen name="__qa"');
    for (const file of ['src/app/english/activity.tsx', 'src/app/english/reader.tsx', 'src/app/english/review.tsx']) {
      expect(readFileSync(file, 'utf8')).toContain('__DEV__');
    }
  });
});
