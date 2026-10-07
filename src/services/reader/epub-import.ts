import { Inflate, strFromU8, strToU8 } from 'fflate';

import { MAX_READER_CHARACTERS } from './pages';
import { normalizeImportedText, TextImportError, type ExtractedReaderText } from './text-import';

export const MAX_EPUB_FILE_BYTES = 8 * 1024 * 1024;
export const EPUB_LIMITS = { entries: 256, entryBytes: 2 * 1024 * 1024, totalBytes: 12 * 1024 * 1024, ratio: 200, xmlNodes: 30000, xmlDepth: 64 } as const;
export class EpubImportError extends TextImportError {}
const fail = (detail: string): never => { throw new EpubImportError(`EPUB: ${detail}`); };
const malformed = (): never => fail('ZIP/XML bị hỏng hoặc cấu trúc không được hỗ trợ.');

function utf8(bytes: Uint8Array): string {
  let text: string;
  try { text = strFromU8(bytes); } catch { return malformed(); }
  const roundtrip = strToU8(text);
  if (roundtrip.length !== bytes.length || roundtrip.some((b, i) => b !== bytes[i])) return malformed();
  return text;
}

/** No extraction to disk. Reject ambiguous names rather than canonicalizing attacker paths. */
function safePath(path: string): string {
  if (!path || path.length > 512 || /[\\%:#?\u0000-\u0020]/u.test(path) || path.startsWith('/') || path.split('/').some((p) => p === '..' || p === '.' || !p)) {
    return fail('Đường dẫn không an toàn hoặc tài nguyên ngoài không được hỗ trợ.');
  }
  return path;
}

function crc32(bytes: Uint8Array): number {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}

type Entry = { name: string; compressed: Uint8Array; size: number; method: number; crc: number };
function archive(bytes: Uint8Array): Map<string, Entry> {
  if (bytes.length > MAX_EPUB_FILE_BYTES) fail('Tệp vượt giới hạn 8 MiB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (p: number) => { if (p < 0 || p + 2 > bytes.length) return malformed(); return view.getUint16(p, true); };
  const u32 = (p: number) => { if (p < 0 || p + 4 > bytes.length) return malformed(); return view.getUint32(p, true); };
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) if (u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === bytes.length) break;
  if (end < 0 || u32(end) !== 0x06054b50) return malformed();
  const count = u16(end + 10), centralSize = u32(end + 12), central = u32(end + 16);
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== count || count === 65535 || central === 0xffffffff || central + centralSize !== end) return malformed();
  if (!count || count > EPUB_LIMITS.entries) fail('Quá nhiều mục ZIP (tối đa 256).');
  const entries = new Map<string, Entry>();
  const ranges: { start: number; end: number }[] = [];
  let pos = central, total = 0;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > end || u32(pos) !== 0x02014b50) return malformed();
    const flags = u16(pos + 8), method = u16(pos + 10), crc = u32(pos + 16), compressedSize = u32(pos + 20), size = u32(pos + 24);
    const nameLength = u16(pos + 28), extraLength = u16(pos + 30), commentLength = u16(pos + 32), local = u32(pos + 42);
    if (flags & 1) fail('DRM/mã hóa không được hỗ trợ.');
    if (flags & ~0x080e || (method !== 0 && method !== 8) || u16(pos + 34) || (u32(pos + 38) >>> 16 & 0xf000) === 0xa000) return malformed();
    if (pos + 46 + nameLength + extraLength + commentLength > end) return malformed();
    const rawName = utf8(bytes.subarray(pos + 46, pos + 46 + nameLength));
    const directory = rawName.endsWith('/');
    const name = safePath(directory ? rawName.slice(0, -1) : rawName);
    if (entries.has(name)) return fail('Tên mục ZIP trùng lặp.');
    total += size;
    if (size > EPUB_LIMITS.entryBytes || total > EPUB_LIMITS.totalBytes || size > Math.max(1, compressedSize) * EPUB_LIMITS.ratio) fail('ZIP vượt giới hạn giải nén an toàn.');
    if (local + 30 > central || u32(local) !== 0x04034b50 || u16(local + 6) !== flags || u16(local + 8) !== method) return malformed();
    const localNameLength = u16(local + 26), dataStart = local + 30 + localNameLength + u16(local + 28);
    if (utf8(bytes.subarray(local + 30, local + 30 + localNameLength)) !== rawName || dataStart + compressedSize > central) return malformed();
    let dataEnd = dataStart + compressedSize;
    if (flags & 8) {
      if (u32(dataEnd) === 0x08074b50) dataEnd += 4;
      if (u32(dataEnd) !== crc || u32(dataEnd + 4) !== compressedSize || u32(dataEnd + 8) !== size) return malformed();
      dataEnd += 12;
    } else if (u32(local + 14) !== crc || u32(local + 18) !== compressedSize || u32(local + 22) !== size) return malformed();
    if (dataEnd > central || (directory && size)) return malformed();
    ranges.push({ start: local, end: dataEnd });
    entries.set(name, { name, compressed: bytes.subarray(dataStart, dataStart + compressedSize), size, method, crc });
    pos += 46 + nameLength + extraLength + commentLength;
  }
  if (pos !== end) return malformed();
  ranges.sort((a, b) => a.start - b.start);
  if (ranges[0]?.start !== 0 || ranges.some((range, i) => range.end !== (ranges[i + 1]?.start ?? central))) return malformed();
  if (entries.has('META-INF/encryption.xml') || entries.has('META-INF/rights.xml')) fail('DRM/mã hóa không được hỗ trợ (kể cả font bị làm rối).');
  return entries;
}

function readEntry(entries: Map<string, Entry>, name: string): string {
  const entry = entries.get(name);
  if (!entry) return fail('Thiếu mục bắt buộc hoặc chương trong spine.');
  let output: Uint8Array;
  if (entry.method === 0) output = entry.compressed;
  else {
    // Never trust ZIP's advertised size. Small compressed pushes bound transient inflation
    // even when a forged entry expands far beyond its central-directory size.
    output = new Uint8Array(entry.size);
    let written = 0;
    const inflater = new Inflate((part) => {
      if (written + part.length > entry.size) fail('ZIP vượt kích thước giải nén đã khai báo.');
      output.set(part, written); written += part.length;
    });
    try {
      for (let offset = 0; offset < entry.compressed.length; offset += 128) {
        inflater.push(entry.compressed.subarray(offset, offset + 128), offset + 128 >= entry.compressed.length);
      }
    } catch (error) { if (error instanceof EpubImportError) throw error; return malformed(); }
    if (written !== entry.size) return malformed();
  }
  if (output.length !== entry.size || crc32(output) !== entry.crc) return malformed();
  return utf8(output);
}

type XmlNode = { name: string; attrs: Record<string, string>; children: (XmlNode | string)[] };
function entities(text: string): string {
  return text.replace(/&([^;\s]*);|&/g, (whole, value: string | undefined) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (value && Object.hasOwn(named, value)) return named[value]!;
    if (value && /^#(?:[0-9]+|x[0-9a-f]+)$/i.test(value)) {
      const code = value[1]?.toLowerCase() === 'x' ? parseInt(value.slice(2), 16) : Number(value.slice(1));
      if (code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) return String.fromCodePoint(code);
    }
    return fail('XML entity không được hỗ trợ hoặc bị hỏng.');
  });
}

/** Deliberately small strict XML subset; no DOM, DTD, entity expansion or resource loader. */
function xml(input: string): XmlNode {
  if (/<!DOCTYPE|<!ENTITY/i.test(input)) fail('DTD/XML entity không được hỗ trợ.');
  const text = input.replace(/^\uFEFF/, '');
  const root: XmlNode = { name: '#document', attrs: {}, children: [] }, stack = [root];
  const tokens = /<!--[\s\S]*?-->|<\?xml\s[^?]*\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>|[^<]+/g;
  let position = 0, nodes = 0;
  for (const match of text.matchAll(tokens)) {
    if (match.index !== position || ++nodes > EPUB_LIMITS.xmlNodes) return malformed();
    const token = match[0]; position += token.length;
    const parent = stack[stack.length - 1]!;
    if (token.startsWith('<!--')) { if (token.slice(4, -3).includes('--')) return malformed(); continue; }
    if (token.startsWith('<?xml')) { if (match.index !== 0 || /encoding\s*=\s*['"](?!utf-8['"])/i.test(token)) return malformed(); continue; }
    if (token.startsWith('<![CDATA[')) { if (stack.length === 1) return malformed(); parent.children.push(token.slice(9, -3)); continue; }
    if (!token.startsWith('<')) { if (stack.length === 1 && token.trim()) return malformed(); parent.children.push(entities(token)); continue; }
    const close = /^<\/([\w:.-]+)\s*>$/.exec(token);
    if (close) { if (stack.length === 1 || parent.name !== close[1]) return malformed(); stack.pop(); continue; }
    const open = /^<([A-Za-z_][\w:.-]*)([\s\S]*?)(\/?)>$/.exec(token);
    if (!open) return malformed();
    const attrs: Record<string, string> = Object.create(null);
    let rest = open[2]!, attributeCount = 0;
    while (rest.trim()) {
      if (++attributeCount > 256) fail('Quá nhiều thuộc tính XML.');
      const attr = /^\s+([A-Za-z_][\w:.-]*)\s*=\s*("[^"<]*"|'[^'<]*')/.exec(rest);
      if (!attr || Object.hasOwn(attrs, attr[1]!)) return malformed();
      attrs[attr[1]!] = entities(attr[2]!.slice(1, -1)); rest = rest.slice(attr[0].length);
    }
    const node: XmlNode = { name: open[1]!, attrs, children: [] }; parent.children.push(node);
    if (!open[3]) stack.push(node);
    if (stack.length > EPUB_LIMITS.xmlDepth) fail('XML lồng quá sâu.');
  }
  const roots = root.children.filter((node): node is XmlNode => typeof node !== 'string');
  if (position !== text.length || stack.length !== 1 || roots.length !== 1) return malformed();
  return roots[0]!;
}
const localName = (node: XmlNode) => node.name.split(':').pop()!;
const children = (node: XmlNode, name: string) => node.children.filter((child): child is XmlNode => typeof child !== 'string' && localName(child) === name);
function requiredChild(node: XmlNode, name: string): XmlNode {
  const found = children(node, name); if (found.length !== 1) return malformed(); return found[0]!;
}
function chapterText(root: XmlNode): string {
  if (localName(root) !== 'html') return malformed();
  const body = requiredChild(root, 'body');
  const skip = new Set(['script', 'style', 'svg', 'math', 'iframe', 'object', 'embed', 'audio', 'video']);
  const blocks = new Set(['p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'br', 'hr', 'tr']);
  const walk = (node: XmlNode): string => {
    const name = localName(node);
    if (skip.has(name)) return '';
    const content = node.children.map((child) => typeof child === 'string' ? child.replace(/[\t\r\n ]+/g, ' ') : walk(child)).join('');
    return blocks.has(name) ? `\n${content}\n` : content;
  };
  return walk(body).replace(/ +/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Read-only EPUB 2/3 reflowable XHTML text import. Assets/CSS/scripts are never loaded. */
export function extractEpub(bytes: Uint8Array, filename: string): ExtractedReaderText {
  if (!/\.epub$/i.test(filename.trim())) fail('Hãy chọn tệp .epub.');
  const entries = archive(bytes);
  if (readEntry(entries, 'mimetype') !== 'application/epub+zip') return malformed();
  const container = xml(readEntry(entries, 'META-INF/container.xml'));
  if (localName(container) !== 'container') return malformed();
  const rootfiles = children(requiredChild(container, 'rootfiles'), 'rootfile');
  if (rootfiles.length !== 1 || rootfiles[0]!.attrs['media-type'] !== 'application/oebps-package+xml') fail('Chỉ hỗ trợ một OPF reflowable.');
  const opfPath = safePath(rootfiles[0]!.attrs['full-path'] ?? '');
  const opf = xml(readEntry(entries, opfPath));
  if (localName(opf) !== 'package' || !['2.0', '3.0'].includes(opf.attrs.version ?? '')) return malformed();
  for (const metadata of children(opf, 'metadata')) {
    if (children(metadata, 'meta').some((meta) => meta.attrs.property === 'rendition:layout' && meta.children.filter((child) => typeof child === 'string').join('').trim() === 'pre-paginated')) fail('EPUB fixed-layout không được hỗ trợ.');
  }
  const manifest = requiredChild(opf, 'manifest'), spine = requiredChild(opf, 'spine');
  const base = opfPath.slice(0, opfPath.lastIndexOf('/') + 1);
  const items = new Map<string, XmlNode>();
  for (const item of children(manifest, 'item')) {
    const id = item.attrs.id;
    if (!id || items.has(id)) return malformed();
    safePath(item.attrs.href ?? ''); items.set(id, item);
  }
  const refs = children(spine, 'itemref');
  if (!refs.length) return malformed();
  const parts: string[] = [];
  let characters = 0;
  for (const ref of refs) {
    const item = items.get(ref.attrs.idref ?? '');
    if (!item) return malformed();
    if (ref.attrs.linear === 'no') continue;
    if (item.attrs['media-type'] !== 'application/xhtml+xml' || /\b(scripted|remote-resources)\b/.test(item.attrs.properties ?? '')) fail('Spine không phải XHTML tĩnh được hỗ trợ.');
    const part = chapterText(xml(readEntry(entries, safePath(base + item.attrs.href))));
    if (part) { characters += Array.from(part).length + (parts.length ? 2 : 0); parts.push(part); }
    if (characters > MAX_READER_CHARACTERS) fail('Giới hạn 100.000 ký tự; hãy chia sách thành phần nhỏ hơn.');
  }
  return normalizeImportedText(parts.join('\n\n'), 'EPUB');
}
