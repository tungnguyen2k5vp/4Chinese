import { describe, expect, it } from 'vitest';

import { audioSourceLabel, systemTtsSource, validateAudioPack, type AudioPackManifest } from './source';

const manifest: AudioPackManifest = { id: 'fixture-only', version: 1, sourceType: 'LICENSED_RECORDING', license: { name: 'Fixture license', url: 'https://fixture.invalid/license', permitsRedistribution: true, attribution: 'Fixture owner' }, clips: [{ id: 'clip', textReference: 'sentence-fixture', filename: 'clip.mp3', url: 'https://fixture.invalid/clip.mp3', sha256: 'a'.repeat(64), bytes: 1024, durationSeconds: 3 }] };
const origins = new Set(['https://fixture.invalid']);
describe('honest audio sources and safe pack contracts', () => {
  it('never labels a system voice as a native recording', () => { expect(audioSourceLabel(systemTtsSource('你好'))).toBe('TTS hệ thống'); });
  it('validates a fixture manifest, not a claim that a real licensed pack is installed', () => { expect(() => validateAudioPack(manifest, origins)).not.toThrow(); });
  it('rejects unknown rights, path traversal, unknown origins, hashes and duplicate files', () => {
    expect(() => validateAudioPack({ ...manifest, license: { ...manifest.license, permitsRedistribution: false } }, origins)).toThrow();
    for (const patch of [{ filename: '../clip.mp3' }, { url: 'http://127.0.0.1/clip.mp3' }, { url: 'https://unknown.invalid/clip.mp3' }, { sha256: 'unknown' }]) {
      expect(() => validateAudioPack({ ...manifest, clips: [{ ...manifest.clips[0]!, ...patch }] }, origins)).toThrow();
    }
    expect(() => validateAudioPack({ ...manifest, clips: [manifest.clips[0]!, { ...manifest.clips[0]!, id: 'other' }] }, origins)).toThrow();
  });
});
