import { describe, expect, it } from 'vitest';

import { downloadContentPack, fetchContentManifest } from './content-fetcher';

const response = (body: string, status = 200) => new Response(body, { status, headers: { 'content-length': String(new TextEncoder().encode(body).byteLength) } });
const pack = { id: 'grammar-hsk1-core', type: 'GRAMMAR' as const, version: 1, checksum: `sha256:${'a'.repeat(64)}`,
  size: 2, url: 'https://content.example.test/grammar.json' };

describe('content fetcher', () => {
  it('requires HTTPS and validates manifests before returning them', async () => {
    await expect(fetchContentManifest('http://content.example.test/manifest.json')).rejects.toThrow('CONTENT_HTTPS_REQUIRED');
    await expect(fetchContentManifest('https://content.example.test/manifest.json', async () => response(JSON.stringify({ version: 1, packs: [pack] })))).resolves.toMatchObject({ version: 1 });
  });
  it('enforces the declared byte limit for downloaded packs', async () => {
    await expect(downloadContentPack(pack, async () => response('abc'))).rejects.toThrow('CONTENT_DOWNLOAD_TOO_LARGE');
  });
});
