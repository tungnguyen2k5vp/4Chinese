export type AudioSource =
  | { type: 'SYSTEM_TTS'; text: string; locale: 'zh-CN' }
  | { type: 'CLOUD_TTS'; uri: string; provider: string }
  | { type: 'NATIVE_RECORDING' | 'LICENSED_RECORDING'; uri: string; attribution: string; license: string };

export type AudioPackManifest = {
  id: string;
  version: number;
  sourceType: 'NATIVE_RECORDING' | 'LICENSED_RECORDING';
  license: { name: string; url: string; permitsRedistribution: boolean; attribution: string };
  clips: { id: string; textReference: string; filename: string; url: string; sha256: string; bytes: number; durationSeconds: number }[];
};
const labels: Record<AudioSource['type'], string> = {
  SYSTEM_TTS: 'TTS hệ thống', CLOUD_TTS: 'TTS dịch vụ', NATIVE_RECORDING: 'Bản ghi người bản ngữ', LICENSED_RECORDING: 'Bản ghi được cấp phép',
};
export function audioSourceLabel(source: AudioSource): string { return labels[source.type]; }
/** Manifest validation is not a downloader or a license determination. Approved origins are set by the pack curator. */
export function validateAudioPack(manifest: AudioPackManifest, approvedOrigins: ReadonlySet<string>): void {
  const allowedUrl = (value: string) => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && approvedOrigins.has(url.origin); }
    catch { return false; }
  };
  if (!/^[a-z0-9_-]{3,100}$/.test(manifest.id) || !Number.isSafeInteger(manifest.version) || manifest.version < 1 ||
    !['NATIVE_RECORDING','LICENSED_RECORDING'].includes(manifest.sourceType) || !manifest.license?.permitsRedistribution ||
    !manifest.license.name?.trim() || !manifest.license.attribution?.trim() || !allowedUrl(manifest.license.url) ||
    !Array.isArray(manifest.clips) || !manifest.clips.length || manifest.clips.length > 1000) throw new Error('INVALID_AUDIO_PACK');
  const ids = new Set<string>(); const filenames = new Set<string>(); let totalBytes = 0;
  for (const clip of manifest.clips) {
    if (!/^[a-z0-9_-]{1,120}$/.test(clip.id) || ids.has(clip.id) || !clip.textReference?.trim() ||
      !/^[a-z0-9_-]{1,120}\.(mp3|m4a|wav|ogg)$/.test(clip.filename) || filenames.has(clip.filename) ||
      !allowedUrl(clip.url) || !/^[a-f0-9]{64}$/.test(clip.sha256) || !Number.isSafeInteger(clip.bytes) || clip.bytes < 1 || clip.bytes > 20 * 1024 * 1024 ||
      !Number.isFinite(clip.durationSeconds) || clip.durationSeconds <= 0 || clip.durationSeconds > 1800) throw new Error('INVALID_AUDIO_CLIP');
    ids.add(clip.id); filenames.add(clip.filename); totalBytes += clip.bytes;
  }
  if (totalBytes > 200 * 1024 * 1024) throw new Error('AUDIO_PACK_TOO_LARGE');
}
export function systemTtsSource(text: string): AudioSource {
  return { type: 'SYSTEM_TTS', locale: 'zh-CN', text };
}
