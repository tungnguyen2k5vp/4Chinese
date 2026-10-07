export type VersionSource = {
  nativeApplicationVersion?: string | null;
  expoVersion?: string | null;
};

/** Resolves the installed binary version first and stays usable in Expo development. */
export function resolveAppVersion(source: VersionSource): string {
  const nativeVersion = source.nativeApplicationVersion?.trim();
  if (nativeVersion) return nativeVersion;
  const expoVersion = source.expoVersion?.trim();
  return expoVersion || 'unknown';
}
