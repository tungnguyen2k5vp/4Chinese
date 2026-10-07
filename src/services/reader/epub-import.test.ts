import { strFromU8, strToU8, unzipSync, Zip, ZipPassThrough, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { extractEpub, EPUB_LIMITS, MAX_EPUB_FILE_BYTES } from './epub-import';
import { decodeReaderPosition, splitReaderChunks } from './pages';

const container = '<container><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
const opf = '<package version="3.0"><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="b" href="b.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>';
const html = (text: string) => `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Ignored</title></head><body>${text}</body></html>`;
function epubFixture(overrides: Record<string, string | Uint8Array> = {}, level: 0 | 6 = 0): Uint8Array {
  const files = { mimetype: 'application/epub+zip', 'META-INF/container.xml': container, 'OPS/book.opf': opf, 'OPS/a.xhtml': html('<p>第一章</p>'), 'OPS/b.xhtml': html('<p>第二章</p>'), ...overrides };
  return zipSync(Object.fromEntries(Object.entries(files).map(([name, value]) => [name, typeof value === 'string' ? strToU8(value) : value])), { level });
}
function mutate(zip: Uint8Array, change: (view: DataView, position: number, central: boolean) => void): Uint8Array {
  const copy = zip.slice(), view = new DataView(copy.buffer);
  for (let i = 0; i < copy.length - 30; i++) {
    const signature = view.getUint32(i, true);
    if (signature === 0x04034b50 || signature === 0x02014b50) change(view, i, signature === 0x02014b50);
  }
  return copy;
}

describe('bounded read-only EPUB', () => {
  it('uses OPF spine order, not ZIP/manifest order (stored and deflated)', () => {
    for (const level of [0, 6] as const) expect(extractEpub(epubFixture({}, level), 'book.epub')).toEqual({ source: 'EPUB', text: '第二章\n\n第一章', truncated: false });
  });
  it('extracts only body text; never loads assets, CSS, scripts or external resources', () => {
    const zip = epubFixture({ 'OPS/b.xhtml': html('<p>你<strong>好</strong>&amp;&#x4E2D;&#22269;</p><script>evil()</script><style>@import "https://evil";</style><img src="https://evil/x"/><iframe src="https://evil"/><p>结束</p>') });
    expect(extractEpub(zip, 'book.epub').text).toBe('你好&中国\n\n结束\n\n第一章');
  });
  it('supports namespace prefixes, comments, CDATA and EPUB 2', () => {
    const zip = epubFixture({ 'OPS/book.opf': opf.replace(/package/g, 'opf:package').replace('3.0', '2.0'), 'OPS/b.xhtml': html('<!--ok--><p><![CDATA[中国 & 学习]]></p>') });
    expect(extractEpub(zip, 'book.epub').text).toContain('中国 & 学习');
  });
  it('rejects archive paths before extraction including unused entries', () => {
    for (const name of ['../evil', '/absolute', 'C:/evil', 'OPS/../evil', 'OPS\\evil', '%2e%2e/evil', 'OPS//evil', 'OPS/./evil']) {
      expect(() => extractEpub(epubFixture({ [name]: 'bad' }), 'book.epub')).toThrow('Đường dẫn');
    }
  });
  it('rejects DRM, encrypted ZIP and unsupported compression', () => {
    for (const name of ['META-INF/encryption.xml', 'META-INF/rights.xml']) expect(() => extractEpub(epubFixture({ [name]: '<x/>' }), 'book.epub')).toThrow('DRM');
    expect(() => extractEpub(mutate(epubFixture(), (v, p, c) => v.setUint16(p + (c ? 8 : 6), 1, true)), 'b.epub')).toThrow('DRM');
    expect(() => extractEpub(mutate(epubFixture(), (v, p, c) => v.setUint16(p + (c ? 10 : 8), 99, true)), 'b.epub')).toThrow('ZIP/XML');
  });
  it('rejects XML external entities, expansion declarations, malformed nesting and unknown entities', () => {
    for (const chapter of ['<!DOCTYPE html SYSTEM "file:///secret">' + html('x'), '<!DOCTYPE html [<!ENTITY a "lol">]>' + html('&a;'), html('&unknown;'), html('<p>x</div>'), html('<p x="1" x="2">x</p>'), html('<'.repeat(50)), html('<div>'.repeat(70) + 'x' + '</div>'.repeat(70))]) {
      expect(() => extractEpub(epubFixture({ 'OPS/b.xhtml': chapter }), 'b.epub')).toThrow();
    }
    expect(() => extractEpub(epubFixture({ 'OPS/b.xhtml': html('<i/>'.repeat(EPUB_LIMITS.xmlNodes + 1)) }), 'b.epub')).toThrow('ZIP/XML');
    expect(() => extractEpub(epubFixture({ 'OPS/b.xhtml': html(`<p ${Array.from({ length: 257 }, (_, i) => `a${i}="x"`).join(' ')}>x</p>`) }), 'b.epub')).toThrow('thuộc tính');
  });
  it('rejects missing spine files/idrefs, remote OPF references, unsupported media and empty books', () => {
    for (const replacement of [opf.replace('idref="b"', 'idref="missing"'), opf.replace('b.xhtml', 'missing.xhtml'), opf.replace('b.xhtml', 'https://evil/b.xhtml'), opf.replace('b.xhtml', '../b.xhtml'), opf.replaceAll('application/xhtml+xml', 'image/svg+xml'), opf.replace('id="b"', 'id="a"'), opf.replace('<manifest>', '<metadata><meta property="rendition:layout">pre-paginated</meta></metadata><manifest>')]) {
      expect(() => extractEpub(epubFixture({ 'OPS/book.opf': replacement }), 'b.epub')).toThrow();
    }
    expect(() => extractEpub(epubFixture({ 'OPS/a.xhtml': html(''), 'OPS/b.xhtml': html('') }), 'b.epub')).toThrow('nội dung');
  });
  it('enforces archive, entry-count, inflated-size, total and compression-ratio bounds', () => {
    expect(() => extractEpub(new Uint8Array(MAX_EPUB_FILE_BYTES + 1), 'b.epub')).toThrow('8 MiB');
    expect(() => extractEpub(epubFixture(Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`extra${i}`, '']))), 'b.epub')).toThrow('256');
    expect(() => extractEpub(epubFixture({ asset: new Uint8Array(EPUB_LIMITS.entryBytes + 1) }), 'b.epub')).toThrow('giải nén');
    expect(() => extractEpub(epubFixture(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`extra${i}`, new Uint8Array(EPUB_LIMITS.entryBytes)]))), 'b.epub')).toThrow('8 MiB');
    expect(() => extractEpub(epubFixture({ asset: 'a'.repeat(100000) }, 6), 'b.epub')).toThrow('giải nén');
  });
  it('rejects forged output sizes during streaming inflation (not just metadata)', () => {
    const zip = epubFixture({ 'OPS/b.xhtml': html('<p>' + '你'.repeat(20000) + '</p>') }, 6);
    const forged = mutate(zip, (v, p, c) => {
      const start = p + (c ? 46 : 30), length = v.getUint16(p + (c ? 28 : 26), true);
      if (strFromU8(new Uint8Array(v.buffer, start, length)) === 'OPS/b.xhtml') v.setUint32(p + (c ? 24 : 22), 1, true);
    });
    expect(() => extractEpub(forged, 'b.epub')).toThrow('kích thước');
  });
  it('bounds total advertised inflation across moderately compressed unused assets', () => {
    const block = new Uint8Array(16384); let seed = 1;
    for (let i = 0; i < block.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; block[i] = seed >>> 24; }
    const asset = new Uint8Array(EPUB_LIMITS.entryBytes);
    for (let i = 0; i < asset.length; i += block.length) asset.set(block, i);
    const zip = epubFixture(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`asset${i}`, asset])), 6);
    expect(zip.length).toBeLessThan(MAX_EPUB_FILE_BYTES);
    expect(() => extractEpub(zip, 'b.epub')).toThrow('giải nén');
  });
  it('supports ZIP data descriptors, and rejects corrupted descriptors and symlinks', () => {
    const output: Uint8Array[] = [];
    const writer = new Zip((error, part) => { if (error) throw error; output.push(part); });
    for (const [name, bytes] of Object.entries(unzipSync(epubFixture()))) {
      const entry = new ZipPassThrough(name); writer.add(entry); entry.push(bytes, true);
    }
    writer.end();
    const bytes = new Uint8Array(output.reduce((sum, part) => sum + part.length, 0));
    let cursor = 0; for (const part of output) { bytes.set(part, cursor); cursor += part.length; }
    expect(extractEpub(bytes, 'book.epub').text).toBe('第二章\n\n第一章');
    const broken = bytes.slice(), view = new DataView(broken.buffer);
    for (let i = 0; i < broken.length - 4; i++) if (view.getUint32(i, true) === 0x08074b50) { broken[i + 4] = broken[i + 4]! ^ 1; break; }
    expect(() => extractEpub(broken, 'book.epub')).toThrow('ZIP/XML');
    expect(() => extractEpub(mutate(epubFixture(), (v, p, c) => { if (c) v.setUint32(p + 38, 0xa0000000, true); }), 'book.epub')).toThrow('ZIP/XML');
  });
  it('rejects malformed ZIP, conflicting headers, duplicates, CRC corruption and truncated data', () => {
    const zip = epubFixture();
    for (const broken of [zip.slice(0, -1), new Uint8Array(40), mutate(zip, (v, p, c) => { if (!c) v.setUint32(p + 22, 9, true); }), mutate(zip, (v, p, c) => v.setUint32(p + (c ? 16 : 14), 0, true))]) expect(() => extractEpub(broken, 'b.epub')).toThrow();
    const duplicate = zip.slice();
    // Equal-length names: replace both local and central a.xhtml with b.xhtml.
    const needle = strToU8('OPS/a.xhtml');
    for (let i = 0; i < duplicate.length - needle.length; i++) if (needle.every((b, j) => duplicate[i + j] === b)) duplicate[i + 4] = 98;
    expect(() => extractEpub(duplicate, 'b.epub')).toThrow('trùng');
  });
  it('preserves full 100k Unicode content in existing 2k chunks and rejects overflow', () => {
    const text = '你😀'.repeat(50000);
    const one = opf.replace('<itemref idref="a"/>', '');
    const result = extractEpub(epubFixture({ 'OPS/book.opf': one, 'OPS/b.xhtml': html(text) }), 'b.epub');
    expect(result.text).toBe(text); expect(result.truncated).toBe(false);
    const chunks = splitReaderChunks(result.text);
    expect(chunks).toHaveLength(50); expect(chunks.map((chunk) => chunk.content).join('') === text).toBe(true);
    expect(decodeReaderPosition(1000099999)).toMatchObject({ characterOffset: 99999 });
    expect(() => extractEpub(epubFixture({ 'OPS/book.opf': one, 'OPS/b.xhtml': html(text + '字') }), 'b.epub')).toThrow('100.000');
  });
});
