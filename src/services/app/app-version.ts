import Constants from 'expo-constants';

import { resolveAppVersion } from './app-version-core';

export { resolveAppVersion } from './app-version-core';

/** The single app-version source for UI labels and backup metadata. */
export function getAppVersion(): string {
  return resolveAppVersion({
    nativeApplicationVersion: Constants.nativeApplicationVersion,
    expoVersion: Constants.expoConfig?.version,
  });
}

export function getAppVersionLabel(): string {
  const version = getAppVersion();
  return version === 'unknown' ? '4Chinese' : `4Chinese · v${version}`;
}
