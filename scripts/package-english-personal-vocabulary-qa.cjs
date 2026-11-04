const fs = require('node:fs');
const path = require('node:path');
const { zipSync } = require('fflate');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'artifacts/english-personal-vocabulary-2026-10-11');
const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
const native = fs.readdirSync(path.join(base, 'native')).filter(f => /^final-.*\.png$/.test(f)).sort();
const text = name => JSON.parse(fs.readFileSync(path.join(base, 'native', name + '.json'), 'utf8')).map(n => n.text).join('\n');
for (const [name, expected] of [
  ['final-01-upgrade-lv1-chart', '1/2 từ'],
  ['final-03-suspended', 'hello'],
  ['final-04-restored', 'Chưa có từ nào'],
  ['final-08-cold-offline-recognized', 'Quả táo'],
  ['final-09-offline-save-success', 'Đã thêm 1 từ'],
  ['final-10-offline-chart', '1/3 từ'],
  ['final-12-dark-chart', 'LV1'],
  ['final-14-android-font-130', '1/3 từ'],
]) if (!text(name).includes(expected)) throw Error('Missing native evidence: ' + name);
if (manifest.screenshots.length !== 54 || native.length !== 14 || manifest.errors.length) throw Error('Unexpected capture count/errors');
const result = {
  generatedAt: new Date().toISOString(), platform: 'Android release APK — independent emulator, not Expo Go',
  device: 'PersonalEnglishQA / Android 16 API36 / x86_64 / 1080x1920 / density420',
  version: '0.1.41 / build43 / candidate',
  apkSha256: 'b98aadcfe9ed6ff559d89f2fb27f61afcd8fbc31e06a9c533c0e541a4cc7be68',
  apkBytes: 100419682, physicalPhoneInstalled: false,
  checks: ['native multiline keyboard input', 'original Skypedia download and lookup', 'select shorts noun sense', 'exclude unknown word and save entire kept list', 'NEW to LV1', 'APK upgrade retains cards and LV1', 'suspend and restore', 'force-stop then cold offline lookup and save apple with both networks disabled', 'dark chart and cards', 'Android font scale 1.3 chart'],
  notVerified: ['iOS', 'TalkBack/VoiceOver', 'physical-device TTS voices', 'full app regression on physical phone'],
  screenshots: native.map(file => ({ file, platform: 'Android release emulator', state: file.slice(0, -4) })),
};
fs.writeFileSync(path.join(base, 'native-result.json'), JSON.stringify(result, null, 2));
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const cards = (items, folder) => items.map(f => `<figure><a href="${folder}/${f}"><img loading="lazy" src="${folder}/${f}" alt="${escape(f)}"></a><figcaption>${escape(f)}</figcaption></figure>`).join('');
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Từ vựng cá nhân — 68 ảnh kiểm thử</title><style>body{font:16px system-ui;background:#f1f5f9;color:#172033;margin:24px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}figure{margin:0;background:white;padding:12px;border-radius:12px}img{width:100%;height:auto}figcaption{overflow-wrap:anywhere;margin-top:8px}h1,h2{line-height:1.3}</style><h1>Từ vựng tiếng Anh cá nhân — 11/10/2026</h1><p>68 ảnh mới: 14 Android release trên máy ảo + 54 Web. Chưa cài lên điện thoại thật. Nhấn ảnh để mở kích thước gốc.</p><p><a href="native-result.json">Kết quả Android</a> · <a href="manifest.json">Manifest Web</a></p><h2>Android release — máy ảo API36, không Expo Go</h2><section>${cards(native, 'native')}</section><h2>Web — toàn bộ trạng thái và phần cuộn</h2><section>${cards(manifest.screenshots.map(s => s.file), 'screenshots')}</section></html>`;
fs.writeFileSync(path.join(base, 'index.html'), html);
const entries = {};
const add = f => { entries[f] = new Uint8Array(fs.readFileSync(path.join(base, f))); };
for (const f of ['index.html', 'manifest.json', 'native-result.json']) add(f);
for (const s of manifest.screenshots) add('screenshots/' + s.file);
for (let i = 1; i <= 7; i++) add(`contact-sheet-${i}.png`);
for (const f of native) { add('native/' + f); add('native/' + f.replace('.png', '.json')); }
entries['BAO_CAO_KIEM_THU.md'] = new Uint8Array(fs.readFileSync(path.join(root, 'docs/ENGLISH_PERSONAL_VOCABULARY_QA_2026-10-11.md')));
const output = base + '-review.zip';
fs.writeFileSync(output, zipSync(entries, { level: 1 }));
console.log(JSON.stringify({ screenshots: 68, output, bytes: fs.statSync(output).size, excluded: ['temporary AVD', 'old/failed screenshots', 'APK'] }, null, 2));
