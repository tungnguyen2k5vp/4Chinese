import { parseRemoteContentManifest, type RemoteContentManifest, type RemoteContentPack } from './content-delivery';

export type ContentFetcher = (input: string, init?: RequestInit) => Promise<Response>;

function assertHttps(url: string): void {
  if (!url.startsWith('https://')) throw new Error('CONTENT_HTTPS_REQUIRED');
}

async function responseBytes(response: Response, maximumBytes: number): Promise<Uint8Array> {
  if (!response.ok) throw new Error(`CONTENT_HTTP_${response.status}`);
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > maximumBytes) throw new Error('CONTENT_DOWNLOAD_TOO_LARGE');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maximumBytes) throw new Error('CONTENT_DOWNLOAD_TOO_LARGE');
  return bytes;
}

export async function fetchContentManifest(url: string, fetcher: ContentFetcher = fetch): Promise<RemoteContentManifest> {
  assertHttps(url);
  const response = await fetcher(url, { headers: { Accept: 'application/json' } });
  return parseRemoteContentManifest(JSON.parse(new TextDecoder().decode(await responseBytes(response, 512 * 1024))));
}

/** Download is bounded and leaves no filesystem partial state; callers persist only verified bytes. */
export async function downloadContentPack(pack: RemoteContentPack, fetcher: ContentFetcher = fetch): Promise<Uint8Array> {
  assertHttps(pack.url);
  return responseBytes(await fetcher(pack.url, { headers: { Accept: 'application/json' } }), pack.size);
}

/** Uses platform Web Crypto when available; no secret/signing key is embedded in the app. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('CONTENT_SHA256_UNAVAILABLE');
  const copy = new Uint8Array(bytes);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', copy.buffer));
  return Array.from(digest, (value) => value.toString(16).padStart(2, '0')).join('');
}
